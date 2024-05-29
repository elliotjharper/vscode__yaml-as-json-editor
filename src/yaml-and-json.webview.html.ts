import * as vscode from 'vscode';

export function buildWebviewHtml(
    styleUri: vscode.Uri,
    nonce: string,
    monacoVsFolderUri: vscode.Uri,
    scriptUri: vscode.Uri,
    colorThemeKind: vscode.ColorThemeKind
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
			<div class="language__column language__column--width-sized" id="json-column">
				<div class="language__header">JSON</div>
				<div class="language__editor" id="json__editor"></div>
			</div>

			<div class="language__divider" id="column-divider"></div>

			<div class="language__column language__column--width-rest" id="yaml-column">
				<div class="language__header">
					<span>YAML</span>
					<span id="yaml-validity-element"></span>
				</div>
				<div class="language__editor" id="yaml__editor"></div>
			</div>
		</div>
		
		<script nonce="${nonce}" src="${monacoVsFolderUri}/loader.js"></script>
		<script nonce="${nonce}">
			require.config({ paths: { vs: '${monacoVsFolderUri}' } });
			require(['vs/editor/editor.main'], function () {
				window.yamlAndJsonOnMonacoLoaded(${colorThemeKind});
			});
			console.log('[webview inline script][cp1] Monaco library load/require() started');
		</script>
		<script nonce="${nonce}" src="${scriptUri}"></script>
	</body>
	</html>`;
}
