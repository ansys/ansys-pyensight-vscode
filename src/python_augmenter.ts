
/**
 * python_augmenter.ts
 * 
 * The module contains the implementations of the PyEnSightWebView, PythonPyEnSightAugmenter
 * and PyEnSightHover classes used to augment the standard Python debug capabilities.
 * 
 * PyEnSightWebView launches a WebView to display a Renderable for the selected PyEnSight session.
 * PythonPyEnSightAugmenter augments the standard Python Debug capabilities to launch a PyEnSightWebView.
 * PyEnSightHover provides new Hover objects in the VSCode editor, with links to the PyEnSight documentation.
 * 
 * 
 */

/// <reference path="extension.ts" />
import * as vscode from 'vscode';
import { DebugProtocol } from '@vscode/debugprotocol';
import { PyEnSightWebPanel } from "./webpanel";
import * as axios from 'axios';


class MySessionItems implements vscode.QuickPickItem{
    /**
     * MySessionItems is an implementation of QuickPickItem designed to display
     * in a nice layout the PyEnSight Session objects to be selected.
     * 
     * @param name The name of the Session instance
     * @param label The representation of the Session in the quick pick item menu
     */
    label: string;
    name: string;
    constructor(name: string) {
        this.name = name;
        this.label = `Session Object: ${name}`;
    }
}
class RenderItem implements vscode.QuickPickItem{
    /**
     * RenderItem is an implementation of QuickPickItem designed to display
     * in a nice layout the PyEnSight Renderable objects to be selected.
     * 
     * @param label The name of the Renderable
     * @param description The representation of the Renderable in the quick pick item menu
     */
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
    /**
     * PyEnSightWebView is a class that launches a WebView to be display a PyEnSight
     * Renderable instance from a PyEnSight session. It uses the PyEnSightWebPanel class to 
     * launch the WebView, while in the following code it looks for the existing PyEnSight session
     * instances and asks for the kind of Renderable to be displayed.
     * 
     * @param context The vscode Extension context
     * @param session The vscode Debug session
     */
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
        /**
         * The function generates a response using the VSCode DAP API to inspect the input variable
         * for an existing url to be used for displaying the renderable in the webView.
         * 
         * @param variable the variable holding the session instance for which a Renderable will be 
         * displayed in the WebView
         */
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
        /**
         * The function creates the QuickPickItem menu to select the renderable
         * to be displayed in the WebView/
         * 
         * @param condition a condition to be checked before creating the menu
         */

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
        /**
         * The function inspects the current debug stack frame for PyEnSight Session instances.
         * 
         * @param scopes the debug scopes returned by the VSCode DAP API
         */
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
        /**
         * Launch the PyEnSight WebView Instance
         */
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
    /**
     * The class implements a Debug Adapter that augments the existing Python debugger capabilities to 
     * inject a PyEnSight WebView instance.
     * 
     * @param context The vscode Extension context
     * @param session The vscode Debug session
     */
    
    constructor(context: vscode.ExtensionContext, session: vscode.DebugSession){
        super(context, session);
    };
    
    async onWillStartSession(){
        /**
         * This function is triggered when the PyEnSight Debug Session is started.
         * A renderable selection is prompted to the user
         */
        await this.selectRenderable(pyensightDebug.called === true && this._input === undefined);
    }
    

    async onDidSendMessage(message: DebugProtocol.ProtocolMessage) {
        /**
         * The function is triggered on every event happening during the debug session.
         * The only event used here is the "stopped" event, that happens when the debug session
         * has stopped at a breakpoint. When this happens, a WebView instance launch is attempted.
         * 
         * @param message The debug Protol message coming from the VSCode DAP API
         */
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
        /**
         * The function is triggered when a debug session is stopped.
         * The global variables are reset and the WebView is disposed.
         */
       pyensightDebug.called = false;
       augmenter = undefined;
       PyEnSightWebPanel.currentPanel?.dispose();

    }
}


export class PyEnSightHover implements vscode.HoverProvider{
    /**
     * The PyEnSightHover class is an implementation of HoverProvider.
     * The aim is to supply an additional link on the PyEnSight objects hovered that
     * remands to the PyEnSight documentation.
     */

    private baseURL = "https://ensight.docs.pyansys.com/version/stable/_autosummary/";

    private async buildStandard(kind: string, filename: string, uri: vscode.Location){
        /**
         * Create a URL link for objects that have a common link structure.
         * 
         * @param kind the kind of PyEnSight object to be looked for
         * @param filename the filename that provides the object definition
         * @param uri the uri of the filename that provides the object definition
         */
        const doc = vscode.workspace.openTextDocument(filename);
        const word = (await doc).getText(uri.range);
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
        /**
         * Check if the input URL is a valid URL via http request
         * 
         * @param url the url to check
         */
        try{
            const response = await axios.default(url);
            return response.status;
        }catch (error){
            return -1;
        }        
    }

    private async buildURL(
        _uri: vscode.Location, 
        document: vscode.TextDocument, 
        position: vscode.Position,
    ){
        /**
         * The main function that builds the URL to be displayed during the Hovering.
         * 
         * @param _uri the uri of the filename that provides the definition of the object hovered
         * @document the instance of the current document open in the editor
         * @position the hover position in the document
         */
        const uri = _uri.uri.path;
        const ansys = uri.includes("ansys");
        const api = uri.includes("api/pyensight");
        const core = uri.includes("pyensight/core");
        const ens = uri.includes("pyensight/ens_");
        let alternativeVal = undefined;
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
                val = `${base}#${adjusted}.${word}`;
                const alternativeBase = `${this.baseURL}${adjusted}.${word}.html`;
                alternativeVal = `${alternativeBase}#${adjusted}.${word}`;
            }
            if (await this.checkURL(val) === 200){
                return val;
            }
            if (alternativeVal !== undefined){
                if (await this.checkURL(alternativeVal) === 200){
                    return alternativeVal;
                }
            }
            return;
        }
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken): Promise<vscode.Hover | null | undefined >{
        /**
         * The function is triggered when an object is hovered, returning a new hover value.
         */
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