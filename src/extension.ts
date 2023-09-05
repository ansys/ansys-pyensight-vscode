// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { PythonPyEnSightAugmenter, PyEnSightWebView, PyEnSightHover } from "./python_augmenter";


import process = require('process');
import * as vscode from 'vscode';

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
	return environment;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	(global as any).testExtensionContext = context;
	globalThis.pyensightDebug = {called: false};
	globalThis.augmenter = undefined;
	console.log('Congratulations, your extension "pyensight" is now active!');

	let helpCmd = vscode.commands.registerCommand('pyensight.Help', () => {
        vscode.window.showInformationMessage("This extension gives you the ability of creating EnSight script and debugging them using PyEnSight");
    });
	context.subscriptions.push(helpCmd);

	let installPyEnSight = vscode.commands.registerCommand('pyensight.Install', async () => {
		let t = vscode.window.createTerminal();
		let python = await findPython();
		t.sendText(`${python} -m pip install ansys-pyensight-core`);
	});
	context.subscriptions.push(installPyEnSight);
	let configuration: vscode.WorkspaceConfiguration;
	context.subscriptions.push(
		vscode.commands.registerCommand('pyensight.debug', async () => {
			globalThis.pyensightDebug.called = true;
			if (vscode.window.activeTextEditor){
				let uri = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
				let _config = vscode.workspace.getConfiguration("launch", uri);
				const configurations = _config.get<any[]>("configurations");
				if (!configurations) {
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

		context.subscriptions.push(vscode.commands.registerCommand('pyensight.docs', async () => 
			{
				const docUrl = "https://ensight.docs.pyansys.com/version/stable/";
				vscode.window.showInformationMessage("Opening the PyEnSight documentation in a webBrowser.");
				vscode.env.openExternal(vscode.Uri.parse(docUrl));
			}
		));

		context.subscriptions.push(vscode.commands.registerCommand('pyensight.apidocs', async () => 
		{
			const docUrl = "https://nexusdemo.ensight.com/docs/python/html/Python.html";
			vscode.window.showInformationMessage("Opening the EnSight Python API documentation in a webBrowser.");
			vscode.env.openExternal(vscode.Uri.parse(docUrl));
		}
	));

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

		vscode.languages.registerHoverProvider('python', new PyEnSightHover());
		


}
		// This method is called when your extension is deactivated
export function deactivate() {}

module.exports = {
    activate,
    deactivate,
};