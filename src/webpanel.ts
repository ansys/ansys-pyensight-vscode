import * as vscode from 'vscode';

function getWebviewOptions(): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,
	};
}

export class PyEnSightWebPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: PyEnSightWebPanel | undefined;

	public static readonly viewType = 'PyEnSightDebug';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _url: string;
	private _disposables: vscode.Disposable[] = [];

	public updateUrl(url: string)
	{
		this._url = url;
	}

	public static createOrShow(extensionUri: vscode.Uri, url: string) {
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
		PyEnSightWebPanel.currentPanel = new PyEnSightWebPanel(panel, extensionUri, url);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, url: string) {
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
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
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
		const webview = this._panel.webview;
		if (url){
			this.updateUrl(url);
		}
		// Vary the webview's content based on where it is located in the editor.
		this._updateHTML(webview);
		return;
	}

	private async _updateHTML(webview: vscode.Webview) {
		webview.asWebviewUri;
		this._panel.webview.html = await this._getHtmlForWebview(webview) as string;
	}

	private async _getHtmlForWebview(webview: vscode.Webview) {
		// Use a nonce to only allow specific scripts to be run
		var _html: string;
		_html = `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>PyEnSight Renderable IFrame</title>
			<style>
				h1 {text-align: center;}
				h3 {text-align: center;}
			</style>
		</head>
		<body>
		<iframe id="renderable_iframe" src="${this._url}" name="Renderable" height="600" width="800">
			You need a Frames Capable browser to view this content.
			<script type="text/javascript">
				document.getElementById('my_iframe').onload = function() {
					document.getElementById('renderable_iframe').src = '';
					document.getElementById('renderable_iframe').src = "${this._url}";
				}
			</script>
		</iframe>  
			</body>
		</html>`;
		return _html;
	}
}

