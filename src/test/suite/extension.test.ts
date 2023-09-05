import * as assert from 'assert';
import 'mocha';
// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
import * as myExtension from '../../extension';

const extension = vscode.extensions.getExtension('ansys.pyensight');

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	suiteSetup(async () => {
		vscode.extensions.getExtension('ms-python.python')?.activate();
		await extension?.activate();
	});

	test('Assert commands', async () => {
		extension!.packageJSON.contributes.commands = [
			"pyensight.Install", "pyensight.Help",
			"pyensight.debug", "pyensight.webview",
			"pyensight.docs", "pyensight.apidocs"
		];

	});
});
