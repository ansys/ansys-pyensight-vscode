/// <reference path="extension.ts" />
import * as vscode from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { PyEnSightWebPanel } from "./webpanel";
import * as fetch from "node-fetch";


const utilsNames = ["views", "export", "parts", "support", "query"];
class MySessionItems implements vscode.QuickPickItem{
    label: string;
    name: string;
    constructor(name: string) {
        this.name = name;
        this.label = `Session Object: ${name}`;
    }
}
class RenderItem implements vscode.QuickPickItem{
    label: string;
    description: string;
    constructor(label: string, description: string){
        this.label = label;
        this.description = description;
    }
}

let renderItems: RenderItem[] = [];
const remoteText = "A VNC stream of the current EnSight rendering window with a simple webUI";
renderItems.push(new RenderItem("image", "A picture of the current EnSight status"));
renderItems.push(new RenderItem("deep_pixel", "A deep pixel picture of the current EnSigth status"));
renderItems.push(new RenderItem("animation", "A transient animation of the current dataset and status in EnSight."));
renderItems.push(new RenderItem("webgl", "An embedded AVZ viewer showing the current status of EnSight exported in AVZ"));
renderItems.push(new RenderItem("remote", "A VNC stream of the current EnSight rendering window with a simple webUI"));
renderItems.push(new RenderItem("remote_scene", "A VNC stream to an EnVision instance showing the curren status of EnSight exported as a scenario."));
renderItems.push(new RenderItem("webensight", "A VNC stream of the current EnSight rendering window with a full webUI"));



export class PyEnSightWebView {
    private _sessionSelected: any;
    protected _context: vscode.ExtensionContext;
    protected _uri: vscode.Uri;
    protected _debugSession: vscode.DebugSession;
    protected _input: RenderItem | undefined;
    protected _webpanel!: PyEnSightWebPanel;
    constructor(context: vscode.ExtensionContext, session: vscode.DebugSession){
        this._context = context;
        this._sessionSelected = undefined;
        this._debugSession = session;
        this._uri = context.extensionUri;
    };

    async createResponse(variable: any){
        const expression = `${variable.name}.show("${this._input!.label}")._url`;
        const responseFrameId = await this._debugSession.customRequest('stackTrace', { threadId: 1 });
        const frameId = await responseFrameId.stackFrames[0].id;
        if (this._input!.label === "webensight"){

            const rest = await this._debugSession?.customRequest('evaluate', {expression: `${variable.name}._rest_api_enabled`, frameId: frameId});
            if (rest.result === "False"){
                vscode.window.showErrorMessage(`The webensight renderable couldn't be started. The rest api needs to be enabled in the launcher.`);
            }
        }
        const response = await this._debugSession?.customRequest('evaluate', {expression: expression, frameId: frameId});

        if (response.result.toLowerCase().includes("error")){
            vscode.window.showErrorMessage(`The renderable couldn't be started. Expression: ${expression}, result: ${response.result}`);
        }
        let result = response.result.substring(1, response.result.length-1);
        PyEnSightWebPanel.createOrShow(this._uri, result);
    }

    protected async selectRenderable(condition: boolean){

        if (condition){
            const options: vscode.QuickPickOptions = {
                canPickMany: false,
                title: "Select Renderable Kind",
                placeHolder: 'Select Renderable Kind',
                ignoreFocusOut: true,

            };
            this._input = await vscode.window.showQuickPick(
                renderItems, 
                options
            );
            if (this._input === undefined){
                this._input = new RenderItem("remote", remoteText);
            }
            vscode.window.showInformationMessage(`Selected Renderable: ${this._input.label}`);
        }
    }

    protected async findSession(scopes: any){
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
                        if (sessionVariables.length > 0)
                        {
                            this._sessionSelected = sessionVariables[0];
                        }
                    }
                }
            }
        }
    }

    public async launchWebView(){
        if (this._input === undefined){
            await this.selectRenderable(true);
        }
        if (!this._sessionSelected){
            
            const responseFrameId = await this._debugSession.customRequest('stackTrace', { threadId: 1 });
            const frameId = await responseFrameId.stackFrames[0].id;
            const scopeReply = await this._debugSession.customRequest('scopes', {frameId: frameId});
            const scopes = scopeReply.scopes;
            await this.findSession(scopes);
        }
        if (this._sessionSelected)
            {
                await this.createResponse(this._sessionSelected);
            }
        }  
    } 

export class PythonPyEnSightAugmenter extends PyEnSightWebView implements vscode.DebugAdapterTracker {
    
    constructor(context: vscode.ExtensionContext, session: vscode.DebugSession){
        super(context, session);
    };
    
    async onWillStartSession(){
        await this.selectRenderable(pyensightDebug.called === true && this._input === undefined);
    }
    

    async onDidSendMessage(message: DebugProtocol.ProtocolMessage) {
        if (pyensightDebug.called === true){
            if (message.type === 'event') {
		        const event = message as DebugProtocol.Event;
		        if (event.event === 'stopped') {	
                    if (this._debugSession){
                        await this.launchWebView();
                    }
                } 
            }
        }
    }

    onWillStopSession() {
       pyensightDebug.called = false;
       augmenter = undefined;
       PyEnSightWebPanel.currentPanel?.dispose();

    }
}


export class PyEnSightHover implements vscode.HoverProvider{
    private baseURL = "https://ensight.docs.pyansys.com/version/stable/_autosummary/";

    private async buildStandard(kind: string, uri: string, _uri: vscode.Location){
        const doc = vscode.workspace.openTextDocument(uri);
        const word = (await doc).getText(_uri.range);
        let base: string;
        base = `https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.${kind}.${word}.html`;
        let val: string;
        val = `${base}#ansys.pyensight.core.${kind}.${word}`;
        if (kind === "EnsContext")
        {
            val = `https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.enscontext.EnsContext.html`;
        }
        else if (kind.toLowerCase().includes("launcher") && word.toLowerCase().includes("launcher")){
            val = `https://ensight.docs.pyansys.com/version/stable/_autosummary/ansys.pyensight.core.${kind}.html`;
        }
        if (await this.checkURL(val) === 200){
            return val;
        }
        return;
    }

    private async checkURL(url: string){
        const response = fetch.default(new URL(url));
        return (await response).status;
    }

    private async buildURL(
        _uri: vscode.Location, 
        document: vscode.TextDocument, 
        position: vscode.Position,
    ){
        const uri = _uri.uri.path;
        const ansys = uri.includes("ansys");
        const api = uri.includes("api/pyensight");
        const core = uri.includes("pyensight/core");
        const ens = uri.includes("pyensight/ens_");
        if (ansys === false){
            return;
        }
        if (api === false && core === false && ens === false){
            return;
        }
        if (uri){
            let val = "https://ensight.docs.pyansys.com/version/stable/index.html";
            const index = uri.lastIndexOf("ansys");
            let subPath = uri.substring(index);
            if (subPath.includes("utils")){
                const lastVal = subPath.substring(subPath.lastIndexOf("/")+1).replace(".py", "");
                subPath = subPath.replace(".py", "").replace(/\//g, ".");
                return `${this.baseURL}${subPath}.${lastVal[0].toUpperCase()}${lastVal.substring(1)}.html`;
            }
            if (subPath.includes("ensight_api")){
                if (document.lineAt(position.line).text.includes("ensight.utils.")){
                    let word = document.getText(document.getWordRangeAtPosition(position));
                    const adjusted = `${word[0].toUpperCase()}${word.substring(1)}`;
                    val = `${this.baseURL}ansys.pyensight.core.utils.${word}.${adjusted}.html`;
                }
                else{
                    const native = val = "https://ensight.docs.pyansys.com/version/stable/native_documentation.html";
                    subPath = subPath.replace(".py", "").replace(/\//g, ".");
                    const doc = await vscode.workspace.openTextDocument(uri);
                    let word = doc.getText(_uri.range);
                    const base = `${this.baseURL}${subPath}.${word}.html`;
                    val = `${base}#${subPath}.${word}`;
                    if (await this.checkURL(val) !== 200){
                        //val = native;
                        const newPosition = new vscode.Position(
                            position.line,
                            document.lineAt(position.line).text.indexOf(word)-2
                        );
                        word = document.getText(document.getWordRangeAtPosition(newPosition));
                        const base = `${this.baseURL}${subPath}.${word}.html`;
                        val = `${base}#${subPath}.${word}`;
                        if (await this.checkURL(val) !== 200){
                            val = native;
                        }
                    }
                }
            }
            if (subPath.includes("session")){
                return await this.buildStandard("Session", uri, _uri);
            }
            if (subPath.includes("renderable")){
                return await this.buildStandard("Renderable", uri, _uri);
            }
            if (subPath.includes("locallauncher")){
                return await this.buildStandard("LocalLauncher", uri, _uri);
            }
            if (subPath.includes("dockerlauncher")){
                return await this.buildStandard("DockerLauncher", uri, _uri);
            }
            if (subPath.includes("enscontext")){
               return await this.buildStandard("EnsContext", uri, _uri);
            }
            if (ens === true){
                const lastVal = subPath.substring(subPath.lastIndexOf("/")+1).replace(".py", "");
                subPath = subPath.replace(".py", "").replace(/\//g, ".");
                const adjusted = `${subPath}.${lastVal.toUpperCase()}`;
                const doc = vscode.workspace.openTextDocument(uri);
                const word = (await doc).getText(_uri.range);
                const base = `${this.baseURL}${adjusted}.${word.toUpperCase()}.html`;
                return `${base}#${adjusted}.${word}`;
            }
            if (await this.checkURL(val) === 200){
                return val;
            }
            return;
        }
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | null | undefined >{

        let value: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider", 
            document.uri, 
            position
        );
        if (value.length > 0){
            if (value[0].uri.path === document.uri.path){
                const newPosition = new vscode.Position(value[0].range.start.line, value[0].range.start.character);
                let character = document.lineAt(newPosition.line).text.indexOf("(") - 1;
                if (character < 0){
                    character = document.lineAt(newPosition.line).range.end.character;
                }
                const word = document.getText(document.getWordRangeAtPosition(
                    new vscode.Position(newPosition.line, character)
                ));
                value =  await vscode.commands.executeCommand(
                    "vscode.executeDefinitionProvider", 
                    document.uri, 
                    new vscode.Position(newPosition.line, character)
                );
            }
            const url = await this.buildURL(value[0], document, position);
            if (url){
                return new vscode.Hover((new vscode.MarkdownString(url)));
            }
            return;    
        }
        return;
    }
}