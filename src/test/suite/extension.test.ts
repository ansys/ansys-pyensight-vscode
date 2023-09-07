import * as assert from 'assert';
import * as mocha from 'mocha';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as path from 'path';
import * as fse from 'fs-extra';
import * as myExtension from '../../extension';
import {setTimeout} from 'timers/promises';


async function prepareData(){
	vscode.window.showInformationMessage('Start all tests.');
	const _path = path.dirname(path.dirname(__filename));
	const mediaPath = path.resolve(_path, "media");
	fse.copySync(path.resolve(path.dirname(path.dirname(_path)), "src", "test", "media"), mediaPath);
	const examplePath = path.resolve(mediaPath, "example.py");
	const exampleDoc = await vscode.workspace.openTextDocument(examplePath);
	await vscode.window.showTextDocument(exampleDoc);
	await vscode.extensions.getExtension("ms-python.python")?.activate();
	await vscode.extensions.getExtension("ms-python.pylance")?.activate();
	await vscode.extensions.getExtension("ansys.pyensight")?.activate();
	await setTimeout(40000);
	await vscode.commands.executeCommand(
		"vscode.executeDefinitionProvider", 
		exampleDoc.uri, 
		new vscode.Position(15, 15)
	);
	return exampleDoc;
}

function checkResult(actual: vscode.MarkdownString, expected: string){
	try{
		assert.equal(actual.value, expected);
	} catch(error){
		console.error(error);
		throw new Error((error as string));
	}
}

async function executeHoverProvider(
	exampleDoc: vscode.TextDocument, 
	line: number, char: number
): Promise<vscode.Hover[]>
{
	return await vscode.commands.executeCommand(
		"vscode.executeHoverProvider", 
		exampleDoc.uri, 
		new vscode.Position(line, char)
	);
}


mocha.describe('Extension Test Suite', () => {
	vscode.extensions.getExtension("ms-python.python")?.activate();
	const extension = vscode.extensions.getExtension("ansys.pyensight");
	
	//mocha.suiteSetup();
	
	mocha.it('Assert commands', () => {
		const expected = [
			{
				"command": "pyensight.Help",
				"title": "PyEnSight: Help"
			},
		    {
				"command": "pyensight.Install",
				"title": "PyEnSight: Install PyEnSight"
			},
			{
				"command": "pyensight.debug",
				"title": "PyEnSight: Launch Debug Session"
			},
			{
				"command": "pyensight.webview",
				"title": "PyEnSight: Launch WebView"
			},
			{
				"command": "pyensight.docs",
				"title": "PyEnSight: Open the PyEnSight documentation"
			},
			{
			    "command": "pyensight.apidocs",
				"title": "PyEnSight: Open the EnSight Python API documentation"
			}
		];
				extension?.activate();
				assert.deepEqual(extension?.packageJSON.contributes.commands, expected);
			});

	mocha.it('Assert hover', async () => {
		await vscode.extensions.getExtension("ms-python.python")?.activate();
		await vscode.extensions.getExtension("ms-python.pylance")?.activate();
		const pythonExtension = vscode.extensions.getExtension("ms-python.python");
		await extension?.activate();
		let settings = vscode.workspace.getConfiguration("");
		const pythonInterp = (process.env.NODEPYTHONINTERP as string);
		await settings.update("python.defaultInterpreterPath", pythonInterp, vscode.ConfigurationTarget.Global);
		const exampleDoc = await prepareData();
		let x = await executeHoverProvider(exampleDoc, 15, 1);
		let val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.LocalLauncher.html");
		x = await executeHoverProvider(exampleDoc, 15, 12);
		val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.LocalLauncher.html");
		x = await executeHoverProvider(exampleDoc, 19, 1);
		val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.LocalLauncher.start.html#ansys.pyensight.core.LocalLauncher.start");
		x = await executeHoverProvider(exampleDoc, 25, 38);
		val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.utils.support.Support.html");
		x = await executeHoverProvider(exampleDoc, 29, 26);
		val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.api.pyensight.ensight_api.objs.html#ansys.api.pyensight.ensight_api.objs");
		x = await executeHoverProvider(exampleDoc, 29, 30);
		val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.api.pyensight.ensight_api.objs.html#ansys.api.pyensight.ensight_api.objs");
		x = await executeHoverProvider(exampleDoc, 54, 36);
		val = x[1].contents[0] as vscode.MarkdownString;
		checkResult(val, "https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.utils.parts.Parts.html");

	});
	

	}
);

