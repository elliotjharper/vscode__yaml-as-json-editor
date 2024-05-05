import * as vscode from 'vscode';
import { getNonce } from './get-nonce';
import { buildWebviewHtml } from './yaml-and-json.webview.html';

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

    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
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
                if (e.document.uri.toString() === document.uri.toString()) {
                    webviewPanel.webview.postMessage({
                        type: 'update',
                        text: document.getText(),
                    });
                }
            });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });

        // Receive messages from the webview.
        webviewPanel.webview.onDidReceiveMessage((e) => {
            switch (e.type) {
                case 'add':
                    console.log('TEST RECEIVED MESSAGE!');
                    //this.addNewScratch(document);
                    return;

                case 'delete':
                    //this.deleteScratch(document, e.id);
                    return;

                case 'init':
                    console.log('TEST RECEIVED MESSAGE!');
                    return;

                case 'asdasdsa':
                    console.log('TEST RECEIVED MESSAGE!');
                    return;
            }
        });

        webviewPanel.webview.postMessage({
            type: 'init',
            text: document.getText(),
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

        return buildWebviewHtml(styleUri, nonce, monacoVsFolderUri, scriptUri);
    }
}
