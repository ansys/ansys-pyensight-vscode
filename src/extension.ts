// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { PythonPyEnSightAugmenter } from "./python_augmenter";
import process = require('process');
import * as vscode from 'vscode';
declare global {
	var pyensightDebug: any; 
	var augmenter: PythonPyEnSightAugmenter | undefined;
};
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	globalThis.pyensightDebug = {called: false};
	globalThis.augmenter = undefined;
	console.log('Congratulations, your extension "pyensight" is now active!');

	let helpCmd = vscode.commands.registerCommand('pyensight.Help', () => {
        vscode.window.showInformationMessage("This extension gives you the ability of creating EnSight script and debugging them using PyEnSight");
    });
	context.subscriptions.push(helpCmd);

	var isWin = process.platform === "win32";
	let installPyEnSight = vscode.commands.registerCommand('pyensight.Install', () => {
		vscode.window.showInformationMessage("We are attempting to install PyEnSight in the pre-existing venv virtual environment. If not available, please create one using the Python extension.");
		var currentDir = vscode.workspace.workspaceFolders?.map(folder => folder.uri.fsPath);
		let t = vscode.window.createTerminal();
		var path: string;
		var sourceFlag = false;
	
		if (isWin === true) 
			{	
				path = currentDir + '\\.venv\\Scripts\\activate.ps1';
			}

		else
			{
				path = currentDir + '/.venv/bin/activate';
				sourceFlag = true;
			}
		var command: string;
		if (sourceFlag === true)
		{
			command = "source "+ path;
		}
		else 
		{
			command = path;
		}
		t.sendText(command);
		t.sendText('python -m pip install ansys-ensight --index-url=https://ulxgr4vv5s3yifyzytf2tz2ahghf3ine6twc7cdutnhnvqaurhhq@pkgs.dev.azure.com/pyansys/_packaging/pyansys/pypi/simple/');
	});
	context.subscriptions.push(installPyEnSight);
	
	context.subscriptions.push(
		vscode.commands.registerCommand('pyensight.debug', async () => {
			globalThis.pyensightDebug.called = true;
			if (vscode.window.activeTextEditor){
				let uri = vscode.workspace.getWorkspaceFolder(vscode.window.activeTextEditor.document.uri);
				let config = vscode.workspace.getConfiguration("launch", uri);
				const configurations = config.get<any[]>("configurations");
				if (!configurations) {
					return;
				}
				let selectedConfig: string;
				for (let config of configurations)
				{
					if (config.name.includes("Python")){
						selectedConfig = config.name;
						vscode.debug.startDebugging(uri, selectedConfig);
						break;
					}
				};		
			}
		}));
		context.subscriptions.push(
			vscode.debug.registerDebugAdapterTrackerFactory("python", {
				createDebugAdapterTracker(session: vscode.DebugSession){
					if (globalThis.augmenter === undefined && globalThis.pyensightDebug.called === true)
					{
						globalThis.augmenter = new PythonPyEnSightAugmenter(context.extensionUri, session);
					}
					return globalThis.augmenter;
				}
			})
		);
}

// This method is called when your extension is deactivated
export function deactivate() {}

module.exports = {
    activate,
    deactivate,
};