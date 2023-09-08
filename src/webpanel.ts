
/**
 * webpanel.ts
 * 
 * Based on the webview sample provided on https://github.com/microsoft/vscode-extension-samples/blob/main/webview-sample/src/extension.ts
 * 
 * The module provides the class PyEnSight WebView, which generates and manages a WebView to display
 * a Renderable for a selected PyEnSight Session.
 */

import * as vscode from 'vscode';

function getWebviewOptions(): vscode.WebviewOptions {
	/** 
	 * Return the WebView options.
	 */
	return {
		// Enable javascript in the webview
		enableScripts: true,
	};
}

export class PyEnSightWebPanel {
	/**
	 * The class launches and manages a WebView to display a Renderable of the current
	 * PyEnSight session.
	 * 
     * 
	 * @param panel The panel to set as current panel
	 * @param extensionUri The URI of the extension asking to set the panel
	 * @param url the URL to use in the panel HTML
	 * 
	 */

	//Track the current panel. Only allow a single panel to exist at a time.
	public static currentPanel: PyEnSightWebPanel | undefined;

	public static readonly viewType = 'PyEnSightDebug';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _url: string;
	private _disposables: vscode.Disposable[] = [];

	public updateUrl(url: string)
	/**
	 * Set the input URL as the new URL to be used in the iframe
	 */
	{
		this._url = url;
	}

	public static createOrShow(extensionUri: vscode.Uri, url: string) {
		/**
		 * Create a new webview panel or show the already available one
		 */
		const column = vscode.window.activeTextEditor
			? vscode.ViewColumn.Two
			: undefined;

		// Dispose of current Panel to reload iframe
		if (PyEnSightWebPanel.currentPanel) {
			PyEnSightWebPanel.currentPanel._panel.dispose();
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			PyEnSightWebPanel.viewType,
			'PyEnSight Debugging View',
			vscode.ViewColumn.Two,
			getWebviewOptions(),
		);

		PyEnSightWebPanel.currentPanel = new PyEnSightWebPanel(panel, extensionUri, url);
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, url: string) {
		/**
		 * Update the current panel with a new one and a new URL
		 * 
		 * @param panel The panel to set as current panel
		 * @param extensionUri The URI of the extension asking to set the panel
		 * @param url the URL to use in the panel HTML
		 * 
		 */
		PyEnSightWebPanel.currentPanel = new PyEnSightWebPanel(panel, extensionUri, url);
	}

	public constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, url: string) {
		this._panel = panel;
		this._extensionUri = extensionUri;
		this._url = url;

		// Set the webview's initial html content
		this._update(this._url);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update(this._url);
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		/**
		 * Send a message to the webview webview.
		 * You can send any JSON serializable data.
		 */ 
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		/**
		 * Dispose the current panel
		 */

		PyEnSightWebPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update(url: string | undefined) {
		/**
		 * Update the current panel with a new URL and produce the new HTML
		 * code to be displaued
		 * 
		 * @param url the URL to set
		 * 
		 */
		const webview = this._panel.webview;
		if (url){
			this.updateUrl(url);
		}
		// Vary the webview's content based on where it is located in the editor.
		this._updateHTML(webview);
		return;
	}

	private async _updateHTML(webview: vscode.Webview) {
		/**
		 * Update the HTML to be displayed in the webView
		 * 
		 * @param webview The current webView instance
		 */
		webview.asWebviewUri;
		this._panel.webview.html = await this._getHtmlForWebview() as string;
	}

	private async _getHtmlForWebview() {
		/**
		 * Create the HTML code for the current webView
		 * 
		 */
		var _html: string;
		_html = `<!DOCTYPE html>
		<html lang="en">
		<head>
				<style>
				.container {
					position: relative;
					overflow: hidden;
					width: 100%;
					padding-top: 100%;
					max-width: 800px;
					max-height: 800px;
				  }
				  
				  .responsive-iframe {
					position: absolute;
					top: 0;
					left: 0;
					bottom: 0;
					right: 0;
					width: 100%;
					height: 100%;
				  }

 			</style>
			<meta charset="UTF-8">
			<title>PyEnSight Renderable IFrame</title>
		</head>
		<body>
		<div class="container">
				<iframe class="responsive-iframe" id="renderable_iframe" src="${this._url}" name="Renderable" height="100%" width="100%">
					You need a Frames Capable browser to view this content.
					<script type="text/javascript">
						document.getElementById('my_iframe').onload = function() {
							document.getElementById('renderable_iframe').src = '';
							document.getElementById('renderable_iframe').src = "${this._url}";
						}
					</script>
				</iframe>
			</div>
		</body>
		</html>`;
		return _html;
	}
}

