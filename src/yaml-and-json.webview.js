// @ts-check

// Script run within the webview itself.
(function () {
    const vscode = acquireVsCodeApi();

    let jsonMonacoEditor;
    let yamlMonacoEditor;
    let editorsHaveInitialContent = false;

    function getJsonEditorElement() {
        return document.getElementById("json__editor");
    }

    function getYamlEditorElement() {
        return document.getElementById("yaml__editor");
    }

    function getYamlValidityElement() {
        return document.getElementById("yaml-validity-element");
    }

    function getJsonColumnElement() {
        return document.getElementById("json-column");
    }

    function getColumnDividerElement() {
        return document.getElementById("column-divider");
    }

    function getYamlColumnElement() {
        return document.getElementById("yaml-column");
    }

    function persistExtensionsState(jsonText, yamlText) {
        vscode.setState({
            jsonText,
            yamlText,
        });
    }

    function updateStateJson(jsonText, updateEditor = true) {
        const state = vscode.getState();

        vscode.setState({
            ...state,
            jsonText,
        });

        if (updateEditor) {
            jsonMonacoEditor?.setValue?.(jsonText);
        }
    }

    function updateStateYaml(yamlText) {
        const state = vscode.getState();

        vscode.setState({
            ...state,
            yamlText,
            yamlInvalid: false,
        });

        yamlMonacoEditor?.setValue?.(yamlText);
        updateValidityElement();
    }

    function updateStateYamlValidity(invalid) {
        const state = vscode.getState();

        vscode.setState({
            ...state,
            yamlInvalid: invalid,
        });

        updateValidityElement();
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

    function updateEditorsFromState() {
        const state = vscode.getState();
        if (!state?.jsonText || !state?.yamlText) {
            console.log("cp uec 3 - update editors invoked, no state!");
            return;
        }

        if (jsonMonacoEditor && yamlMonacoEditor) {
            console.log("cp uec 2 - update editors invoked, editors ready");
            jsonMonacoEditor.setValue(state.jsonText);
            yamlMonacoEditor.setValue(state.yamlText);

            editorsHaveInitialContent = true;
        } else {
            console.log(
                "cp uec 1 - update editors invoked, editors not ready!"
            );
        }

        updateValidityElement();
    }

    function pickColorTheme(colorThemeKind) {
        switch (colorThemeKind) {
            // light
            case 1:
                return "vs";

            // dark
            case 2:
                return "vs-dark";

            // high contrast dark
            case 3:
                return "hc-black";

            // high contrast light
            case 4:
                return "hc-light";
        }
        return "vs";
    }

    function onMonacoLoaded(hostColorThemeKind) {
        console.log(
            "page cp2 - Monaco library loaded, creating editor instances"
        );

        const theme = pickColorTheme(hostColorThemeKind);

        // JSON EDITOR
        //============
        var jsonEditorElement = getJsonEditorElement();
        // IStandaloneEditorConstructionOptions
        var jsonEditorOptions = {
            value: "",
            language: "json",
            theme,
        };
        jsonMonacoEditor = monaco.editor.create(
            jsonEditorElement,
            jsonEditorOptions
        );

        const debouncedProcessJsonFromUser = debounce(processJsonFromUser, 200);
        jsonMonacoEditor.onDidChangeModelContent((changeModelEvent) => {
            if (changeModelEvent.isFlush) {
                // Since this threw away what was in the editor this was performed by our extension not the user.
                // As such, just ignore this change as we did it.
                return;
            }

            debouncedProcessJsonFromUser();
        });

        // jsonMonacoEditor.onDidChangeCursorPosition((e) => {
        // 	console.log('cursorPositionChange');
        // });

        // jsonMonacoEditor.onDidChangeCursorSelection((e) => {
        // 	console.log('selectionChange');
        // });

        // YAML EDITOR
        //============
        var yamlEditorElement = getYamlEditorElement();
        // IStandaloneEditorConstructionOptions
        var yamlEditorOptions = {
            value: "",
            language: "yaml",
            theme,
            readOnly: true,
        };
        yamlMonacoEditor = monaco.editor.create(
            yamlEditorElement,
            yamlEditorOptions
        );

        updateEditorsFromState();
    }

    /**
     * Invoked when an instance of the editor is created 'init' is used to send the data in
     */
    function processInitFromEditorHost(message) {
        persistExtensionsState(message.jsonText, message.yamlText);
        updateEditorsFromState();
    }

    /**
     * Invoked when an instance of the edtor is refocused after being hidden
     */
    function processUpdateFromEditorHost(message) {
        if (editorsHaveInitialContent) {
            // Only want this to happen once.
            // This is how we are ignoring TextDocument edits that we started after user input
            return;
        }
        updateEditorsFromState();
    }

    function processJsonFromEditorHost(message) {
        updateStateJson(message.jsonText);
    }

    function processYamlFromEditorHost(message) {
        updateStateYaml(message.yamlText);
    }

    function processJsonFromUser() {
        console.log("User made a change in the editor!");
        const jsonText = jsonMonacoEditor.getValue();
        updateStateJson(jsonText, false);
        vscode.postMessage({
            type: "convert-json-to-yaml",
            jsonText,
            writeOut: true,
        });
    }

    function updateValidityElement() {
        const state = vscode.getState();

        const yamlInvalid = state.yamlInvalid === true;

        const validityElement = getYamlValidityElement();
        if (validityElement) {
            validityElement.innerText = yamlInvalid
                ? "Invalid (check json)"
                : "Valid";
        }

        const yamlColumn = getYamlColumnElement();
        if (yamlColumn) {
            if (yamlInvalid) {
                yamlColumn.classList.add("langauge__column--invalid");
            } else {
                yamlColumn.classList.remove("langauge__column--invalid");
            }
        }
    }

    function reflowEditors() {
        jsonMonacoEditor?.layout();
        yamlMonacoEditor?.layout();
    }

    function setupHostResizeListener() {
        const debouncedReflowEditors = debounce(reflowEditors, 200);
        window.onresize = () => {
            debouncedReflowEditors();
        };
    }

    function setupColumnResizeListener() {
        const jsonColumn = getJsonColumnElement();
        const columnDivider = getColumnDividerElement();

        if (!jsonColumn || !columnDivider) {
            throw new Error("Missing an element.");
        }

        const debouncedReflowEditors = debounce(reflowEditors, 100);

        // this should be the width of the divider column divided by 2
        const dividerColumnAdjustment = 6 / 2;

        function columnResize(mouseMoveEvent) {
            if (!jsonColumn || !columnDivider?.parentElement) {
                return;
            }
            const containerRect =
                columnDivider.parentElement.getBoundingClientRect();
            jsonColumn.style.flex = `0 0 ${
                mouseMoveEvent.clientX -
                containerRect.left -
                dividerColumnAdjustment
            }px`;
            debouncedReflowEditors();
        }

        function stopColumnResize() {
            document.removeEventListener("mousemove", columnResize);
            document.removeEventListener("mouseup", stopColumnResize);
        }

        columnDivider.addEventListener("mousedown", function (mouseMoveEvent) {
            document.addEventListener("mousemove", columnResize);
            document.addEventListener("mouseup", stopColumnResize);
        });
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

                case "response__convert-yaml-to-json":
                    processJsonFromEditorHost(message);
                    return;

                case "response__convert-json-to-yaml":
                    processYamlFromEditorHost(message);
                    return;

                case "mark-yaml-invalid":
                    updateStateYamlValidity(true);
                    return;
            }
        });
    }

    function setupOnMonacoLoaded() {
        window.yamlAndJsonOnMonacoLoaded = onMonacoLoaded;
    }

    setupMessageListener();
    setupHostResizeListener();
    setupColumnResizeListener();
    setupOnMonacoLoaded();
})();
