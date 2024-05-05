// @ts-check

// Script run within the webview itself.
(function () {
    const vscode = acquireVsCodeApi();

    let jsonMonacoEditor;
    let yamlMonacoEditor;

    function persistExtensionsState(jsonText, yamlText) {
        vscode.setState({
            jsonText,
            yamlText,
        });
    }

    function debounce(func, delay) {
        let timeoutId;
        return function () {
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            timeoutId = setTimeout(() => {
                func.apply(this, arguments);
            }, delay);
        };
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

    function onMonacoLoaded() {
        console.log(
            "page cp2 - Monaco library loaded, creating editor instances"
        );

        // JSON EDITOR
        //============
        var jsonEditorElement = document.getElementById("json__editor");
        // IStandaloneEditorConstructionOptions
        var jsonEditorOptions = {
            value: "",
            language: "json",
        };
        jsonMonacoEditor = monaco.editor.create(
            jsonEditorElement,
            jsonEditorOptions
        );

        jsonMonacoEditor.onDidChangeModelContent((changeModelEvent) => {
            if (changeModelEvent.isFlush) {
                // Since this threw away what was in the editor this was performed by our extension not the user.
                // As such, just ignore this change as we did it.
                return;
            }

            console.log("User made a change in the editor!");
            window.postMessage({ type: "user-typed-json" });
        });

        // jsonMonacoEditor.onDidChangeCursorPosition((e) => {
        // 	console.log('cursorPositionChange');
        // });

        // jsonMonacoEditor.onDidChangeCursorSelection((e) => {
        // 	console.log('selectionChange');
        // });

        // YAML EDITOR
        //============
        var yamlEditorElement = document.getElementById("yaml__editor");
        // IStandaloneEditorConstructionOptions
        var yamlEditorOptions = {
            value: "",
            language: "yaml",
            readOnly: true,
        };
        yamlMonacoEditor = monaco.editor.create(
            yamlEditorElement,
            yamlEditorOptions
        );

        updateEditorsContent();
    }

    /**
     * When an instance of the editor is created 'init' is used to send the data in
     */
    function processInitFromEditorHost(message) {
        const yamlFileText = message.text;

        persistExtensionsState(convertYamlToJson(yamlFileText), yamlFileText);
        updateEditorsContent();
    }

    function processUpdateFromEditorHost(message) {
        updateEditorsContent();
    }

    function reflowEditors() {
        jsonMonacoEditor?.layout();
        yamlMonacoEditor?.layout();
    }

    function setupResizeListener() {
        const debouncedReflowEditors = debounce(reflowEditors, 200);
        window.onresize = () => {
            debouncedReflowEditors();
        };
    }

    function setupMessageListener() {
        // Handle messages sent from the extension to the webview
        window.addEventListener("message", (event) => {
            const message = event.data; // The json data that the extension sent

            console.log(`vscode host -> webview js: ${message.type}`);

            switch (message.type) {
                case "init":
                    processInitFromEditorHost(message);
                    return;

                case "update":
                    processUpdateFromEditorHost(message);
                    return;

                case "webview__user-typed-json":
                    console.log(
                        "webview <script> -> webview js: user-typed-json"
                    );
                    vscode.postMessage({
                        type: "webview-js__convert-json-to-yaml__request",
                        value: "Test",
                    });

                    return;
            }
        });
    }

    function setupOnMonacoLoaded() {
        window.yamlAndJsonOnMonacoLoaded = onMonacoLoaded;
    }

    setupMessageListener();
    setupResizeListener();
    setupOnMonacoLoaded();
})();
