import { useEffect, useRef, useState } from "react";
import { Editor } from "react-draft-wysiwyg";
import { EditorState, ContentState, convertToRaw } from "draft-js";
import draftToHtml from "draftjs-to-html";
import htmlToDraft from "html-to-draftjs";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  className?: string;
};

export default function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
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
          setEditorState(nextState);
          const html = draftToHtml(convertToRaw(nextState.getCurrentContent()));
          lastHtmlRef.current = html || "";
          onChange(html || "");
        }}
        toolbarClassName="rounded-t-md border border-border bg-muted/30 px-1"
        editorClassName="min-h-[220px] rounded-b-md border border-t-0 border-border bg-background px-3 py-2 text-sm"
        wrapperClassName="w-full"
      />
    </div>
  );
}
