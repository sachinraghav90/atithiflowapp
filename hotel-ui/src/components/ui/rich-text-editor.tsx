import { useEffect, useRef, useState } from "react";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertToRaw, Modifier } from "draft-js";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  maxLength?: number;
};

export default function RichTextEditor({ value, onChange, className, maxLength }: RichTextEditorProps) {
  const extendedDarkColors = [
    "#000000", // Black
    "#1F2937", // Dark Gray
    "#0B1F5B", // Navy Blue
    "#1E3A8A", // Dark Blue
    "#14532D", // Dark Green
    "#7F1D1D", // Dark Red
    "#5B0F2F", // Maroon
    "#4C1D95", // Purple
    "#5C4033", // Brown
  ];

  const createStateFromHtml = (html: string) => {
    if (!value?.trim()) return EditorState.createEmpty();
    const blocksFromHtml = htmlToDraft(html);
    const { contentBlocks, entityMap } = blocksFromHtml;
    const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
    return EditorState.createWithContent(contentState);
  };

  const normalizeEditorHtml = (raw: string) => {
    if (!raw) return "";
    return raw
      .replace(/<li>\s*(<br\s*\/?>|&nbsp;|\s)*<\/li>/gi, "")
      .replace(/<p>\s*(<br\s*\/?>|&nbsp;|\s)*<\/p>/gi, "")
      .replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br /><br />")
      .replace(/(<\/(ul|ol)>)\s*(<(ul|ol)>)/gi, "$1")
      .replace(/\s+<\/(p|li)>/gi, "</$1>")
      .trim();
  };

  const [editorState, setEditorState] = useState<EditorState>(createStateFromHtml(value || ""));
  const lastHtmlRef = useRef<string>(value || "");

  useEffect(() => {
    if ((value || "") === lastHtmlRef.current) return;
    setEditorState(createStateFromHtml(value || ""));
    lastHtmlRef.current = value || "";
  }, [value]);

  return (
    <div className={className}>
      <Editor
        editorState={editorState}
        toolbar={{
          colorPicker: {
            colors: extendedDarkColors,
          },
        }}
        onEditorStateChange={(nextState) => {
          const currentContent = nextState.getCurrentContent();
          const plainText = currentContent.getPlainText('');
          
          let finalState = nextState;
          
          if (plainText.trim() === '') {
             const blockMap = currentContent.getBlockMap();
             if (blockMap.size === 1) {
                 const firstBlock = blockMap.first();
                 if (firstBlock.getType() !== 'unstyled') {
                     finalState = EditorState.push(
                         nextState,
                         ContentState.createFromText(''),
                         'remove-range'
                     );
                 }
             }
          }

          setEditorState(finalState);
          
          const rawText = finalState.getCurrentContent().getPlainText('').trim();
          if (!rawText) {
             lastHtmlRef.current = "";
             onChange("");
             return;
          }

          const html = normalizeEditorHtml(draftToHtml(convertToRaw(finalState.getCurrentContent())));
          lastHtmlRef.current = html || "";
          onChange(html || "");
        }}
        handleBeforeInput={(chars, state) => {
          if (!maxLength) return 'not-handled';
          const currentLength = state.getCurrentContent().getPlainText('').length;
          if (currentLength + chars.length > maxLength) {
            return 'handled';
          }
          return 'not-handled';
        }}
        handlePastedText={(text, html, state) => {
          if (!maxLength) return 'not-handled';
          const currentLength = state.getCurrentContent().getPlainText('').length;
          if (currentLength + text.length > maxLength) {
            const allowedLength = maxLength - currentLength;
            if (allowedLength <= 0) return 'handled';
            
            const trimmedText = text.slice(0, allowedLength);
            const selection = state.getSelection();
            const content = state.getCurrentContent();
            const newContent = Modifier.replaceText(content, selection, trimmedText);
            const newState = EditorState.push(state, newContent, 'insert-characters');
            
            setEditorState(newState);
            const newHtml = normalizeEditorHtml(draftToHtml(convertToRaw(newState.getCurrentContent())));
            lastHtmlRef.current = newHtml || "";
            onChange(newHtml || "");
            
            return 'handled';
          }
          return 'not-handled';
        }}
        toolbarClassName="sticky top-0 z-10 rounded-t-md border border-border bg-background px-1 overflow-x-auto overflow-y-hidden whitespace-nowrap"
        editorClassName="min-h-[220px] rounded-b-md border border-t-0 border-border bg-background px-3 py-2 text-sm"
        wrapperClassName="w-full"
      />
    </div>
  );
}
