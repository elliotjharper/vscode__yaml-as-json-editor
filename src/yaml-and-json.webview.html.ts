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
				window.yamlAndJsonOnMonacoLoaded();
			});
			console.log('[webview inline script][cp1] Monaco library load/require() started');
		</script>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
	</html>`;
}
