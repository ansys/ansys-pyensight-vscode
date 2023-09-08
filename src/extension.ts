/**
 * extension.ts
 * 
 * The module manages the activation and deactivation of the PyEnSight VS Code extension.
 * On activation, the specific commands and debug provider are registered.
 * 
 * 
 */


// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { PythonPyEnSightAugmenter, PyEnSightWebView, PyEnSightHover } from "./python_augmenter";


import * as vscode from 'vscode';

/**
 * The aim is to control how the PyEnSight Debug Session is launched. This will spawn
 * a standard Python Debug Session, and then augment its capabilities. To make sure that
 * the PyEnSight Debug Session is not launched after a standard Python Debug Session,
 * the pyEnSightDebug and the augmenter global variables are designed to control this flow.
 * 
 * In case a user starts a standard Python debug session, they still have the possibility of
 * launching the PyEnSight WebView to visualize the current EnSight session during debug.
 */
declare global {
	var pyensightDebug: any; 
	var augmenter: PythonPyEnSightAugmenter | undefined;
};

async function findPython(){
	const pythonExtension = vscode.extensions.getExtension("ms-python.python");
	await pythonExtension?.activate();
	let environmentVal = await pythonExtension?.exports.environment.getActiveEnvironmentPath();
	let environment: string = environmentVal.path;
	if (environment === undefined){
		console.log("Interpreter not set, select an interpreter");
		await vscode.commands.executeCommand("python.setInterpreter");
		environment = (vscode.workspace.getConfiguration("ms-python").get("pythonPath") as string);
	}
	if (environment === "" || environment === undefined){
		vscode.window.showErrorMessage("No Python Interpreter set. Please set one using the command palette Python: Set Interpreter.");
		return undefined;
	}
	return environment;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	globalThis.pyensightDebug = {called: false};
	globalThis.augmenter = undefined;
	console.log('Congratulations, your extension "pyensight" is now active!');

	// pyensight.Help command
	let helpCmd = vscode.commands.registerCommand('pyensight.Help', () => {
        vscode.window.showInformationMessage("This extension empowers the ability of creating and debuggin PyEnSight scripts with WebView designed to visualize the current EnSight session.");
    });
	context.subscriptions.push(helpCmd);


	// pyensight.Install command
	let installPyEnSight = vscode.commands.registerCommand('pyensight.Install', async () => {
		let t = vscode.window.createTerminal();
		let python = await findPython();
		if (python !== undefined){
			t.sendText(`${python} -m pip install ansys-pyensight-core`);
		}
		
	});
	context.subscriptions.push(installPyEnSight);

    // pyensight.debug command.
	let configuration: vscode.WorkspaceConfiguration;
	context.subscriptions.push(
		vscode.commands.registerCommand('pyensight.debug', async () => {
			globalThis.pyensightDebug.called = true;
			if (vscode.window.activeTextEditor){
				let uri = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
				let _config = vscode.workspace.getConfiguration("launch", uri);
				// Try to find the debug launch configuration of Python and launch it
				const configurations = _config.get<any[]>("configurations");
				if (!configurations) {
					vscode.window.showErrorMessage("No Debug Configuration available. Please add one clicking on Run: Add configuration or pressing F5");
					return;
				}
				let selectedConfig: string;
				let started = false;
				for (let config of configurations)
				{
					if (config.name.includes("Python")){
						configuration = config;
						selectedConfig = config.name;
						vscode.debug.startDebugging(uri, selectedConfig);
						started = true;
						break;

					}
				};
				if (started === false){
					vscode.window.showErrorMessage("No Debug Configuration available. Please add one clicking on Run: Add configuration or pressing F5");
				}
			}
		}));

		// Register a new debug provider that sits on top of the existing Python debugger
		context.subscriptions.push(
			vscode.debug.registerDebugAdapterTrackerFactory("python", {
				createDebugAdapterTracker(session: vscode.DebugSession){
					if (globalThis.augmenter === undefined && globalThis.pyensightDebug.called === true)
					{
						globalThis.augmenter = new PythonPyEnSightAugmenter(context, session);
					}
					return globalThis.augmenter;
				}
			})
		);

		// pyensight.docs command. Direct link to the PyEnSight documentation
		context.subscriptions.push(vscode.commands.registerCommand('pyensight.docs', async () => 
			{
				const docUrl = "https://ensight.docs.pyansys.com/version/stable/";
				vscode.window.showInformationMessage("Opening the PyEnSight documentation in a webBrowser.");
				vscode.env.openExternal(vscode.Uri.parse(docUrl));
			}
		));

		// pyensight.apidocs command. Direct link to the EnSight Python API documentation
		context.subscriptions.push(vscode.commands.registerCommand('pyensight.apidocs', async () => 
		{
			const docUrl = "https://nexusdemo.ensight.com/docs/python/html/Python.html";
			vscode.window.showInformationMessage("Opening the EnSight Python API documentation in a webBrowser.");
			vscode.env.openExternal(vscode.Uri.parse(docUrl));
		}
	));

		/**
		 * pyensight.webview command
		 * 
		 * This command is designed to launch a PyEnSight WebView during an existing Python debug session.
		 * The command first checks for an active debug session, and then creates an instance of PyEnSight
		 * WebView.
		 */
		context.subscriptions.push(vscode.commands.registerCommand('pyensight.webview', async () =>
			{	
				const potentialSession = vscode.debug.activeDebugSession;
				
				if (potentialSession){
					const view = new PyEnSightWebView(context, potentialSession);
					await view.launchWebView();
				}
				else{
					vscode.window.showWarningMessage("No active Debug session running");
				}
			}
		));


		// Register a new Hover provider to be added to the existing hover values
		// returned from the Python extension.
		vscode.languages.registerHoverProvider('python', new PyEnSightHover());
		
		return context;

}

// This method is called when your extension is deactivated
export function deactivate() {}

module.exports = {
    activate,
    deactivate,
};