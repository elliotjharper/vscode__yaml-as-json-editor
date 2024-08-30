import * as vscode from 'vscode';
import { getNonce } from './get-nonce';
import { buildWebviewHtml } from './yaml-and-json.webview.html';
import * as yaml from 'yaml';
import {
    defaultPropertyStlye,
    defaultQuoteStlye,
    PropertyStyle,
    propertyStyleKey,
    QuoteStyle,
    quoteStyleKey,
} from './preferences';
import {
    EditorToHostMessage,
    messageToEditor,
} from './extension-message-types';

/**
 * Plan for a yaml editor
 *
 * WebView that has side by side panes for json on the left and yaml on the right.
 * Each pane should be an instance of the monaco editor.
 * Consider whether to package a local instance of monaco with the extension or load it on the fly from cdn.
 * When neither have been changed you may click on one to start editing from that side.
 *
 * The editing side should then become a writeable monaco editor.
 * As you make changes in that editor, the updated value should be reflected in the other window converted.
 *
 *
 * This provider demonstrates:
 *
 * - Setting up the initial webview for a custom editor.
 * - Loading scripts and styles in a custom editor.
 * - Synchronizing changes between a text document and a custom editor.
 */
export class YamlAndJsonEditorHost implements vscode.CustomTextEditorProvider {
    public static register(
        context: vscode.ExtensionContext
    ): vscode.Disposable {
        const provider = new YamlAndJsonEditorHost(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            YamlAndJsonEditorHost.viewType,
            provider
        );
        return providerRegistration;
    }

    private static readonly viewType = 'eh.yamlAndJson';

    private quoteStyle: QuoteStyle | undefined;
    private propertyStyle: PropertyStyle | undefined;

    constructor(private readonly context: vscode.ExtensionContext) {
        this.loadYamlPreferences();
    }

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        textDocument: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true,
        };
        webviewPanel.webview.html = this.getHtmlForWebview(
            webviewPanel.webview
        );

        // Hook up event handlers so that we can synchronize the webview with the text document.
        //
        // The text document acts as our model, so we have to sync change in the document to our
        // editor and sync changes in the editor back to the document.
        //
        // Remember that a single text document can also be shared between multiple custom
        // editors (this happens for example when you split a custom editor)

        const changeDocumentSubscription =
            vscode.workspace.onDidChangeTextDocument((e) => {
                // This is invoked:
                // --when an unfocused instance of our editor is refocused (needed here to get the freshly re rendered re populate the editors with what was in the state)
                // --or when we make an edit to the TextDocument (here we don't want to make the editors change as the change from from the user)
                if (e.document.uri.toString() === textDocument.uri.toString()) {
                    webviewPanel.webview.postMessage({
                        type: 'update',
                        text: textDocument.getText(),
                    });
                }
            });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive messages from the webview.
        webviewPanel.webview.onDidReceiveMessage((message) => {
            console.log(`[editorHost] messageReceived, type = ${message.type}`);

            switch (message.type as EditorToHostMessage) {
                case 'convert-yaml-to-json':
                    this.handleRequestToConvertYamlToJson(
                        message.yamlText,
                        webviewPanel
                    );
                    return;

                case 'convert-json-to-yaml':
                    this.handleRequestToConvertJsonToYaml(
                        message.jsonText,
                        webviewPanel,
                        textDocument,
                        message.writeOut
                    );
                    return;

                case 'submit-new-user-preferences':
                    this.handleNewUserPreferences(
                        message.quoteStyle,
                        message.propertyStyle
                    );
                    return;
            }
        });

        const initialYamlText = textDocument.getText();
        webviewPanel.webview.postMessage({
            type: messageToEditor('init'),
            jsonText: this.convertYamlToJson(initialYamlText),
            yamlText: initialYamlText,
            quoteStyle: this.quoteStyle,
            propertyStyle: this.propertyStyle,
        });
    }

    /**
     * Get the static html used for the editor webviews.
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
        // attach a .js file from the extension source code onto the custom editor webview
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this.context.extensionUri,
                'src',
                'yaml-and-json.webview.js'
            )
        );
        const monacoVsFolderUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this.context.extensionUri,
                'node_modules',
                'monaco-editor',
                'min',
                'vs'
            )
        );

        // attach .css files from the extension source code onto the custom editor webview
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(
                this.context.extensionUri,
                'src',
                'yaml-and-json.webview.css'
            )
        );

        // Use a nonce to whitelist which scripts can be run
        const nonce = getNonce();

        return buildWebviewHtml(
            styleUri,
            nonce,
            monacoVsFolderUri,
            scriptUri,
            vscode.window.activeColorTheme.kind
        );
    }

    private convertYamlToJson(yamlText: string): string {
        const parsedYaml = yaml.parse(yamlText);
        const numberOfIndentSpaces = 4;
        const prettyJson = JSON.stringify(
            parsedYaml,
            null,
            numberOfIndentSpaces
        );
        return prettyJson;
    }

    private convertJsonToYaml(jsonText: string): string {
        // todo: if parsing fails,
        // inform the webview so that it reflects that the editor state is not currently valid
        const parsedJson = JSON.parse(jsonText);
        const yamlString = yaml.stringify(parsedJson, {
            defaultKeyType: this.propertyStyle,
            defaultStringType: this.quoteStyle,
        });
        return yamlString;
    }

    private handleRequestToConvertYamlToJson(
        yamlText: string,
        webviewPanel: vscode.WebviewPanel
    ): void {
        const jsonText = this.convertYamlToJson(yamlText);

        webviewPanel.webview.postMessage({
            type: messageToEditor('response__convert-yaml-to-json'),
            jsonText,
        });
    }

    private handleRequestToConvertJsonToYaml(
        jsonText: string,
        webviewPanel: vscode.WebviewPanel,
        document: vscode.TextDocument,
        writeOut: boolean
    ): void {
        try {
            const yamlText = this.convertJsonToYaml(jsonText);

            webviewPanel.webview.postMessage({
                type: messageToEditor('response__convert-json-to-yaml'),
                yamlText,
            });

            if (writeOut) {
                this.updateTextDocument(document, yamlText);
            }
        } catch (err) {
            webviewPanel.webview.postMessage({
                type: messageToEditor('mark-yaml-invalid'),
            });
        }
    }

    /**
     * Write out the json to a given document.
     */
    private updateTextDocument(
        document: vscode.TextDocument,
        newValue: string
    ) {
        const edit = new vscode.WorkspaceEdit();

        // Just replace the entire document every time for this example extension.
        // A more complete extension should compute minimal edits instead.
        edit.replace(
            document.uri,
            new vscode.Range(0, 0, document.lineCount, 0),
            newValue
        );

        return vscode.workspace.applyEdit(edit, { isRefactoring: true });
    }

    private handleNewUserPreferences(
        quoteStyle: QuoteStyle,
        propertyStyle: PropertyStyle
    ): void {
        this.quoteStyle = quoteStyle;
        this.propertyStyle = propertyStyle;
        this.saveYamlPreferences();
    }

    private loadYamlPreferences(): void {
        this.quoteStyle =
            (this.context.globalState.get(quoteStyleKey) as QuoteStyle) ??
            defaultQuoteStlye;

        this.propertyStyle =
            (this.context.globalState.get(propertyStyleKey) as PropertyStyle) ??
            defaultPropertyStlye;
    }

    private saveYamlPreferences(): void {
        this.context.globalState.update(quoteStyleKey, this.quoteStyle);

        this.context.globalState.update(propertyStyleKey, this.propertyStyle);
    }
}
