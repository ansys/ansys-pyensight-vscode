// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import fs = require('fs');
import { PyEnSightWebPanel } from "./webpanel";
import process = require('process');
import * as vscode from 'vscode';
import { workspace } from 'vscode';
// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "pyensight" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	//let disposable = vscode.commands.registerCommand('pyensight.helloWorld', () => {
//		// The code you place here will be executed every time your command is executed
		//// Display a message box to the user
		//vscode.window.showInformationMessage('Hello World from PyEnSight!');
	//});
	let helpCmd = vscode.commands.registerCommand('pyensight.Help', () => {
        vscode.window.showInformationMessage("This extension gives you the ability of creating EnSight script and debugging them using PyEnSight");
    });
	context.subscriptions.push(helpCmd);

	let disposable = vscode.languages.registerHoverProvider("python", {
        provideHover(document, position, token) {
			const range = document.getWordRangeAtPosition(position);
			const word = document.getText(range);
			
            return new vscode.Hover("For all Python");

        }
    });

	context.subscriptions.push(disposable);

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
			if (vscode.window.activeTextEditor){
				const session = vscode.debug.activeDebugSession;
				if (session){
					const responseFrameId = await session.customRequest('stackTrace', { threadId: 1 });
					const frameId = await responseFrameId.stackFrames[0].id;
					const scope = await responseFrameId.stackFrames[0].scope;
					const variables = await responseFrameId.stackFrames[0].variables;
					for (let variable of variables){
						if (variable.class.name === "Session"){
							var sessionVariable = variable.class.name;
							const response = await session?.customRequest('evaluate', {expression: `${sessionVariable}.show("remote")._url`, frameId: frameId});
							let result = response.result.substring(1, response.result.length-1);
							PyEnSightWebPanel.createOrShow(context.extensionUri, result);
						};
					};
				}
		}}
		)
	);

}

// This method is called when your extension is deactivated
export function deactivate() {}

module.exports = {
    activate,
    deactivate,
};