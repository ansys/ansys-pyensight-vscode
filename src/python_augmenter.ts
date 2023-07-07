/// <reference path="extension.ts" />
import * as vscode from 'vscode';
import { ProviderResult } from 'vscode';
import { DebugProtocol } from 'vscode-debugprotocol';
import { PyEnSightWebPanel } from "./webpanel";
import { mkdtemp, writeFile, unlinkSync } from "fs";
import { join } from 'path';
import { tmpdir } from 'os';
import { CompletionItem } from 'vscode-debugadapter';


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
                                        if (sessionVariables.length > 0)
                                        {
                                            this._sessionSelected = sessionVariables[0];
                                        }
                                    }
                                }
                                if (this._sessionSelected)
                                {
                                    this.createResponse(this._sessionSelected, frameId);
                                }
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
export class PyEnSightCompletionItemProvider implements vscode.CompletionItemProvider, vscode.TypeDefinitionProvider {
    private tempFile (name = 'temp_file', data = '') {

        return new Promise((resolve, reject) => {
            const tempPath = join(tmpdir(), 'foobar-');
            mkdtemp(tempPath, (err, folder) => {
                if (err) 
                    {return reject(err);}
    
                const fileName = join(folder, name);
                writeFile(fileName, data, errorFile => {
                    if (errorFile) 
                        {return reject(errorFile);}
    
                    resolve(fileName);
                });
            });
        });
    }

    private async buildTypeData(value: string, data: string, line: number, length: number): Promise<vscode.Location[]>
    {
        let fileName = "temp_"+value.toLowerCase()+".py";
        let ms = await this.tempFile(fileName, data);
        let uri = vscode.Uri.file(ms as string);
        let correctValues: vscode.Location[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            uri,
            new vscode.Position(line, length),
        );
        return correctValues;
    }

    private async buildData(correctValue: string, data: string, line: number, length: number,  position: vscode.Position): Promise<vscode.CompletionItem[] | null | undefined>{
        let fileName = "temp_"+correctValue.toLowerCase()+".py";
        let ms = await this.tempFile(fileName, data);
        let uri = vscode.Uri.file(ms as string);
        let correctValues: vscode.CompletionList = await vscode.commands.executeCommand(
            "vscode.executeCompletionItemProvider",
            uri,
            new vscode.Position(line, length),
        );
        unlinkSync(ms as string);
        let _items: vscode.CompletionItem[] = [];
        for (let index in correctValues.items){
            let element = correctValues.items[index];
            let item = new vscode.CompletionItem(element.label, vscode.CompletionItemKind.Field);
            item.range = new vscode.Range(position, position);
            item.documentation = element.documentation;
            item.detail = element.detail;
            item.filterText = element.filterText;
            item.insertText = element.insertText;
            item.kind = element.kind;
            item.command = element.command;
            item.tags = element.tags;
            item.sortText = index.toString().padStart(5, "0");
            _items.push(item);
        }
        return _items;
    }

    private async buildEnSightUtilsCompletion(word: string, document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | null | undefined>{
        if (context.triggerKind !== vscode.CompletionTriggerKind.TriggerCharacter || context.triggerCharacter !== "."){
            return;
        }
        let lineVal = word.toLowerCase()+"."+word[0].toUpperCase()+word.substring(1).toLowerCase();
        let data = "from ansys.pyensight.core.utils import "+ word.toLowerCase()+"\n"+lineVal+".";
        return this.buildData(lineVal, data, 1, lineVal.length+1, position);
    }


    private async findTypeDefinition(typeDefValue: vscode.Location[] | vscode.LocationLink[] | undefined, document: vscode.TextDocument, newPosition: vscode.Position): Promise<vscode.Location[] | vscode.LocationLink[] | null | undefined>
    {

        if (typeDefValue){
            let sourceURI: vscode.Uri = (typeDefValue[0] as vscode.Location).uri;
            let sourceRange: vscode.Range =  (typeDefValue[0] as vscode.Location).range;
            let doc: vscode.TextDocument = await vscode.workspace.openTextDocument(sourceURI);
            let sourceLine = doc.lineAt(sourceRange.start.line);
            if (sourceURI.fsPath === vscode.Uri.file(document.fileName).fsPath){
                let _typeDefValue: vscode.Location[] | vscode.LocationLink[] = await vscode.commands.executeCommand(
                    "vscode.executeTypeDefinitionProvider",
                    vscode.Uri.file(document.fileName),
                    new vscode.Position(sourceLine.lineNumber, sourceLine.text.length-1),
                );
                return _typeDefValue;
            }
            return typeDefValue;
       }
       else{
        let itemNames: string[] = ["views", "export", "parts", "support", "query"];
        let fullLine = document.lineAt(newPosition.line).text;
        let word = document.getText(document.getWordRangeAtPosition(newPosition));
        let foundSubUtils = false;
        if (itemNames.indexOf(word) > -1 && fullLine.includes("ensight.utils."))
        {
            foundSubUtils = true;
        }
        if (foundSubUtils){
            let data = "from ansys.pyensight.core.utils."+word+" import "+word[0].toUpperCase()+word.substring(1).toLowerCase();
            return this.buildTypeData(word, data, 0, data.length-1);
        } 
        let _typeDefValue: vscode.Location[] | vscode.LocationLink[] = await vscode.commands.executeCommand(
            "vscode.executeDefinitionProvider",
            vscode.Uri.file(document.fileName),
            newPosition
        );
        return _typeDefValue;
       }
    }

    private async buildENSCompletion(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext, item: boolean =false, newPosition: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem> | null | undefined>{
        if (context.triggerKind !== vscode.CompletionTriggerKind.TriggerCharacter || context.triggerCharacter !== "."){
            return;
        }
        let typeDefValue: vscode.Location[] | vscode.LocationLink[] = await vscode.commands.executeCommand(
            "vscode.executeTypeDefinitionProvider",
            vscode.Uri.file(document.fileName),
            new vscode.Position(newPosition.line, newPosition.character),
        );
        let sourceURI: vscode.Uri = (typeDefValue[0] as vscode.Location).uri;
        if (sourceURI.fsPath === vscode.Uri.file(document.fileName).fsPath){
            let _temp = await this.findTypeDefinition(typeDefValue, document, newPosition);
            if (_temp){
                typeDefValue = _temp;
            }
        }
        let returnText = "";
        if (typeDefValue){
            sourceURI = (typeDefValue[0] as vscode.Location).uri;
            let sourceRange  =  (typeDefValue[0] as vscode.Location).range;
            let doc = await vscode.workspace.openTextDocument(sourceURI);
            let sourceLine = doc.lineAt(sourceRange.start.line);
            let pattern: RegExp = new RegExp('-> ([^]+)');
            let returnType = pattern.exec(sourceLine.text);
            if (returnType){
                returnText = returnType[1].trim().replace(new RegExp("'", 'g'), "").replace(new RegExp(":", 'g'), "");
            }
        }
        if (returnText){
            if (returnText.includes("ensobjlist"))
            {
                let stringFound = new RegExp('\\[([^]+)\\]').exec(returnText);
                if (stringFound){
                    let correctString = stringFound[1];
                    if (item === false){
                      let data = "from ansys.api.pyensight."+correctString.toLowerCase()+" import "+correctString+"\nfrom ansys.pyensight.core.listobj import ensobjlist\nobj="+correctString+"()\nensobjlist(obj).";
                        let toUse = "ensobjlist(obj).";
                        return this.buildData(correctString, data, 3, toUse.length, position);
                    }
                    else{
                        let data = "from ansys.api.pyensight."+correctString.toLowerCase()+" import "+correctString+"\nobj="+correctString+"().";
                        let toUse = "obj="+correctString+"().";
                        return this.buildData(correctString, data, 1, toUse.length, position);
                    }
                }
            }
            else if (returnText.includes("ENS_"))
            {
                let data = "from ansys.api.pyensight."+returnText.toLowerCase()+" import "+returnText+"\nobj="+returnText+"().";
                let toUse = "obj="+returnText+"().";
                return this.buildData(returnText, data, 1, toUse.length, position);
            }
            else{
                let data = "obj="+returnText+"().";
                return this.buildData(returnText, data, 0, data.length, position);
            }

        }
    }


    private async hardwork(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem> | null | undefined>{
        
        if (
            context.triggerKind === vscode.CompletionTriggerKind.TriggerCharacter && 
            context.triggerCharacter === "."  &&
            !document.fileName.toString().includes("temp_")
        ){
            let values: vscode.CompletionList = await vscode.commands.executeCommand(
                "vscode.executeCompletionItemProvider",
                vscode.Uri.file(document.fileName),
                new vscode.Position(position.line, position.character),
            );
            let foundENS = false;
            let foundEnSight = false;
            let foundUtils = false;
            let foundSubUtils = false;
            let item = false;
            let newPosition = new vscode.Position(position.line, position.character - 1);
            let word = document.getText(document.getWordRangeAtPosition(newPosition));
            let line = document.lineAt(position.line);
            if (line.text.includes("[") || line.text.includes("]")){
                let lastValue = (line.text.split(".").at(-2) as string);
                let pattern: RegExp = new RegExp('([^]+)(\\[[0-9]+\\])');
                let found = lastValue.match(pattern);
                if (found){
                    newPosition = new vscode.Position(position.line, line.text.length - found[2].length-1);
                    word = document.getText(document.getWordRangeAtPosition(newPosition));
                    item = true;
                }
            }
            let hoverValues: vscode.Hover[] = await vscode.commands.executeCommand(
                "vscode.executeHoverProvider",
                vscode.Uri.file(document.fileName),
                new vscode.Position(newPosition.line, newPosition.character),
            );
            let hovervalue = (hoverValues[0].contents[0] as vscode.MarkdownString).value;
            if (hovervalue.includes("property")){
                foundENS = true;
            }
            for (let item of values.items){
                if (word === "ensight" && item.label === "objs" && item.kind === vscode.CompletionItemKind.Variable){
                    foundEnSight = true;
                    break;
                }
            }
            let itemNames: string[] = ["views", "export", "parts", "support", "query"];
            let fullLine = document.lineAt(position.line).text;
            if (word === "utils" && fullLine.includes("ensight.")){
                foundUtils = true;
            }
            if (itemNames.indexOf(word) > -1 && fullLine.includes("ensight.utils."))
            {
                foundSubUtils = true;
            }
            if (foundENS === true && foundEnSight === false){
                return this.buildENSCompletion(document, position, token, context, item, newPosition);
            }
            if (foundEnSight){
                let item = new vscode.CompletionItem("utils", vscode.CompletionItemKind.Variable);
                item.range = new vscode.Range(position, position);
                return [item];
            }
            if (foundUtils){
                let items: vscode.CompletionItem[] = [];
                for (let index in itemNames){
                    let item = new vscode.CompletionItem(itemNames[index], vscode.CompletionItemKind.Variable);
                    item.range = new vscode.Range(position, position);
                    items.push(item);
                }
                return items;
            }
            if (foundSubUtils){
                return this.buildEnSightUtilsCompletion(word, document, position, token, context);
            }
        }
    }

    async provideTypeDefinition(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken):  Promise<vscode.Definition | vscode.LocationLink[] | null | undefined>
    {
        return await this.findTypeDefinition(undefined, document, position);
    }

    async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem> | null | undefined> {
    {   
        return await this.hardwork(document, position, token, context);
    }
}

}