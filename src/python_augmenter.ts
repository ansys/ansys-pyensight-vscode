/// <reference path="extension.ts" />
import * as vscode from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { PyEnSightWebPanel } from "./webpanel";

class MySessionItems implements vscode.QuickPickItem{
    label: string;
    name: string;
    constructor(name: string) {
        this.name = name;
        this.label = `Session Object: ${name}`;
    }
}

export class PythonPyEnSightAugmenter implements vscode.DebugAdapterTracker{
    private _uri: vscode.Uri;
    private _input: string | undefined;
    private _sessionSelected: any;
    private _debugSession: vscode.DebugSession;
    constructor(contextUri: vscode.Uri, session: vscode.DebugSession){
        this._uri = contextUri;
        this._input = undefined;
        this._sessionSelected = undefined;
        this._debugSession = session;
    };
    async onWillStartSession(){
        if (pyensightDebug.called === true && this._input === undefined){
            const options: vscode.QuickPickOptions = {
                canPickMany: false,
                title: "Select Renderable Kind",
                placeHolder: 'Select Renderable Kind',
                ignoreFocusOut: true,

            };
            this._input = await vscode.window.showQuickPick(
                ['image', 'deep_pixel', 'webgl', 'animation', 'remote', 'remote_scene'], 
                options
            );
            if (this._input === undefined){
                this._input = "remote";
            }
            vscode.window.showInformationMessage(`Selected Renderable: ${this._input}`);
    }
    }

    async createResponse(variable: any, frameId: number){
        const response = await this._debugSession?.customRequest('evaluate', {expression: `${variable.name}.show("${this._input}")._url`, frameId: frameId});
        let result = response.result.substring(1, response.result.length-1);
        PyEnSightWebPanel.createOrShow(this._uri, result);
    }

    async onDidSendMessage(message: DebugProtocol.ProtocolMessage) {
        if (pyensightDebug.called === true){
            if (message.type === 'event') {
		        const event = message as DebugProtocol.Event;
		        if (event.event === 'stopped') {	
                    if (this._debugSession){
                        const responseFrameId = await this._debugSession.customRequest('stackTrace', { threadId: 1 });
                        const frameId = await responseFrameId.stackFrames[0].id;
                        const scopeReply = await this._debugSession.customRequest('scopes', {frameId: frameId});
                        const scopes = scopeReply.scopes;
                        for (let scope of scopes)
                        {
                            if (scope.name === "Locals")
                            {
                                var reference = scope.variablesReference;
                                const variables = await this._debugSession.customRequest('variables', {variablesReference: reference});
                                let sessionVariables: any[] = [];
                                 for (let variable of variables.variables){
                                    if (variable.type === "Session"){
                                        sessionVariables.push(variable);
                                    };
                                };
                                if (sessionVariables.length > 1 && this._sessionSelected === undefined)
                                {
                                    const items = sessionVariables.map((item) => {
                                        return new MySessionItems(
                                            item.name,
                                        );
                                    });
                                    const options: vscode.QuickPickOptions = {
                                        canPickMany: false,
                                        title: "Select Session Object to display",
                                        placeHolder: 'Select Session Object',
                                        ignoreFocusOut: true,
                                    };

                                    let selectedName = await vscode.window.showQuickPick(
                                        items, 
                                        options
                                    );
                                    for (let sessionVariable of sessionVariables){
                                        if (selectedName?.name === sessionVariable.name)
                                        {
                                            this._sessionSelected = sessionVariable;
                                            break;
                                        }
                                    }
                                }
                                else
                                {
                                    if (this._sessionSelected === undefined)
                                    {
                                        this._sessionSelected = sessionVariables[0];
                                    }
                                }
                                this.createResponse(this._sessionSelected, frameId);
                            }   

                    
		                }
	                }
                }
            }
        }
    }
    onWillStopSession() {
       pyensightDebug.called = false;
       augmenter = undefined;
    }
}
