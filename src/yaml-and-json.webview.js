// @ts-check

// Script run within the webview itself.
(function () {
    const vscode = acquireVsCodeApi();

    let jsonMonacoEditor;
    let yamlMonacoEditor;

    function updateState(jsonText, yamlText) {
        vscode.setState({
            jsonText,
            yamlText,
        });
    }

    function convertYamlToJson(yamlText) {
        return yamlText;
    }

    function convertJsonToYaml(jsonText) {
        return jsonText;
    }

    function updateEditorsContent() {
        const state = vscode.getState();
        if (!state?.jsonText || !state?.yamlText) {
            console.log("cp uec 3 - update editors invoked, no state!");
            return;
        }

        if (jsonMonacoEditor && yamlMonacoEditor) {
            console.log("cp uec 2 - update editors invoked, editors ready");
            jsonMonacoEditor.setValue(state.jsonText);
            yamlMonacoEditor.setValue(state.yamlText);
        } else {
            console.log(
                "cp uec 1 - update editors invoked, editors not ready!"
            );
        }
    }

    window.yamlAndJsonEditorsReady = (value) => {
        jsonMonacoEditor = value.jsonMonacoEditor;
        yamlMonacoEditor = value.yamlMonacoEditor;
        updateEditorsContent();
    };

    // Handle messages sent from the extension to the webview
    window.addEventListener("message", (event) => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case "init":
                console.log(`vscode host -> webview js: init`);

                const yamlFileText = message.text;

                updateState(convertYamlToJson(yamlFileText), yamlFileText);
                updateEditorsContent();

                return;

            case "update":
                console.log(`vscode host -> webview js: update`);

                //vscode.setState({ text: message.text });
                updateEditorsContent();

                return;

            case "webview__user-typed-json":
                console.log("webview <script> -> webview js: user-typed-json");
                vscode.postMessage({
                    type: "webview-js__convert-json-to-yaml__request",
                    value: "Test",
                });

                return;
        }
    });
})();
