import * as vscode from 'vscode';

export function buildWebviewHtml(
    styleUri: vscode.Uri,
    nonce: string,
    monacoVsFolderUri: vscode.Uri,
    scriptUri: vscode.Uri
): string {
    return `
	<!DOCTYPE html>
	<html lang="en">
	<head>
		<meta charset="UTF-8">

		<meta name="viewport" content="width=device-width, initial-scale=1.0">

		<link href="${styleUri}" rel="stylesheet" />

		<title>Yaml And Json</title>
	</head>
	<body>
		<div class="languages__row">
			<div class="language__column">
				<div class="language__header">JSON</div>
				<div class="language__editor" id="json__editor"></div>
				<div class="language__footer">JSON</div>
			</div>

			<div class="language__column">
				<div class="language__header">Yaml</div>
				<div class="language__editor" id="yaml__editor"></div>
				<div class="language__footer">Yaml</div>
			</div>
		</div>
		
		<script nonce="${nonce}" src="${monacoVsFolderUri}/loader.js"></script>
		<script nonce="${nonce}">
			require.config({ paths: { vs: '${monacoVsFolderUri}' } });
			require(['vs/editor/editor.main'], function () {
				console.log('page cp2 - Monaco library loaded, creating editor instances');

				// JSON EDITOR
				//============
				var jsonEditorElement = document.getElementById('json__editor');						
				var jsonMonacoEditor = monaco.editor.create(jsonEditorElement, {
					value: '',
					language: 'json'
				});

				jsonMonacoEditor.onDidChangeModelContent((changeModelEvent) => {
					if(changeModelEvent.isFlush) {
						// Since this threw away what was in the editor this was performed by our extension not the user.
						// As such, just ignore this change as we did it.
						return;
					}

					console.log('User made a change in the editor!');
					window.postMessage({ type: 'user-typed-json' });
				});

				// jsonMonacoEditor.onDidChangeCursorPosition((e) => {
				// 	console.log('cursorPositionChange');
				// });

				// jsonMonacoEditor.onDidChangeCursorSelection((e) => {
				// 	console.log('selectionChange');
				// });
				
				// YAML EDITOR
				//============
				var yamlEditorElement = document.getElementById('yaml__editor');
				var yamlMonacoEditor = monaco.editor.create(yamlEditorElement, {
					value: '',
					language: 'yaml'
				});
				
				window.yamlAndJsonEditorsReady({
					jsonMonacoEditor,
					yamlMonacoEditor
				});
			});
			console.log('page cp1 - Monaco library load/require() started');
		</script>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
	</html>`;
}
