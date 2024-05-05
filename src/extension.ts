import * as vscode from 'vscode';
import { YamlAndJsonEditorHost } from './yaml-and-json.editor-host';

export function activate(context: vscode.ExtensionContext) {
    // Register our custom editor provider
    context.subscriptions.push(YamlAndJsonEditorHost.register(context));
}
