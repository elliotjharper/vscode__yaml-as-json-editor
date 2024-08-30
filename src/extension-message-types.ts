export type BuiltInHostToEditorMessage = 'init' | 'update';
export type HostToEditorMessage =
    | BuiltInHostToEditorMessage
    | 'response__convert-yaml-to-json'
    | 'response__convert-json-to-yaml'
    | 'mark-yaml-invalid';
export function messageToEditor(
    type: HostToEditorMessage
): HostToEditorMessage {
    return type;
}

export type EditorToHostMessage =
    | 'convert-yaml-to-json'
    | 'convert-json-to-yaml'
    | 'submit-new-user-preferences';
export function messageToHost(type: EditorToHostMessage): EditorToHostMessage {
    return type;
}

export type ExtensionMessage = EditorToHostMessage | HostToEditorMessage;
