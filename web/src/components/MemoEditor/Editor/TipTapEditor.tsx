import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { marked } from "marked";
import { forwardRef, useEffect, useImperativeHandle, useMemo } from "react";
import TurndownService from "turndown";
import { cn } from "@/lib/utils";
import { EDITOR_HEIGHT } from "../constants";
import type { EditorProps } from "../types";
import type { EditorRefActions } from "./index";

export interface TipTapEditorRefActions extends EditorRefActions {
  getTipTapEditor: () => ReturnType<typeof useEditor> | null;
}

// Initialize Turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
  emDelimiter: "*", // Use * for italic
});

// Add strikethrough rule - must be added before other rules to ensure it's applied
// Turndown doesn't have a default strikethrough rule, so we add one for GFM compatibility
turndownService.addRule("strikethrough", {
  filter: (node: Node) => {
    const nodeName = node.nodeName.toUpperCase();
    return nodeName === "S" || nodeName === "DEL" || nodeName === "STRIKE";
  },
  replacement: (content: string) => {
    // Use ~~ for strikethrough (GFM style)
    return `~~${content}~~`;
  },
});

// Override italic rule to ensure it uses * delimiter consistently
// Turndown has a default rule for <em> and <i>, but we override to ensure consistency
turndownService.addRule("italic", {
  filter: (node: Node) => {
    const nodeName = node.nodeName.toUpperCase();
    return nodeName === "I" || nodeName === "EM";
  },
  replacement: (content: string) => {
    // Use * for italic (consistent with emDelimiter setting)
    // Trim content to avoid extra spaces
    const trimmed = content.trim();
    return trimmed ? `*${trimmed}*` : content;
  },
});

// Configure Turndown to handle task lists
turndownService.addRule("taskListItems", {
  filter: (node: Node) => {
    return node.nodeName === "LI" && (node as Element).querySelector('input[type="checkbox"]') !== null;
  },
  replacement: (content: string, node: Node) => {
    const checkbox = (node as Element).querySelector('input[type="checkbox"]') as HTMLInputElement;
    const isChecked = checkbox?.checked ? "x" : " ";
    const text = content.trim();
    return `- [${isChecked}] ${text}\n`;
  },
});

// Convert TipTap content to markdown
function getMarkdownFromEditor(editor: ReturnType<typeof useEditor> | null): string {
  if (!editor) return "";
  try {
    // Get HTML from TipTap editor
    const html = editor.getHTML();
    // Convert HTML to markdown
    let markdown = turndownService.turndown(html);
    // Clean up any extra whitespace that might interfere with formatting
    // This helps ensure italic and strikethrough are properly formatted
    markdown = markdown.replace(/\*\*\s+/g, "**"); // Remove spaces after bold start
    markdown = markdown.replace(/\s+\*\*/g, "**"); // Remove spaces before bold end
    markdown = markdown.replace(/\*\s+/g, "*"); // Remove spaces after italic start
    markdown = markdown.replace(/\s+\*/g, "*"); // Remove spaces before italic end
    markdown = markdown.replace(/~~\s+/g, "~~"); // Remove spaces after strikethrough start
    markdown = markdown.replace(/\s+~~/g, "~~"); // Remove spaces before strikethrough end
    return markdown;
  } catch (error) {
    console.error("Error serializing to markdown:", error);
    // Fallback to plain text
    return editor.state.doc.textContent;
  }
}

// Convert markdown to TipTap content
function setMarkdownToEditor(editor: ReturnType<typeof useEditor> | null, markdown: string) {
  if (!editor) return;
  try {
    // Convert markdown to HTML, then TipTap will parse the HTML
    const html = marked.parse(markdown, { breaks: true, gfm: true }) as string;
    editor.commands.setContent(html);
  } catch (error) {
    console.error("Error parsing markdown:", error);
    // Fallback: set as plain text
    editor.commands.setContent(markdown);
  }
}

const TipTapEditor = forwardRef<EditorRefActions, EditorProps & { onEditorReady?: (editor: ReturnType<typeof useEditor>) => void }>(
  function TipTapEditor(
    {
      className,
      initialContent,
      placeholder,
      onPaste,
      onContentChange: handleContentChangeCallback,
      isFocusMode,
      onCompositionStart,
      onCompositionEnd,
      onEditorReady,
    },
    ref,
  ) {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: placeholder || "",
          emptyEditorClass: "is-editor-empty",
          emptyNodeClass: "is-empty",
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: {
            class: "text-link hover:underline",
          },
        }),
        Image.configure({
          HTMLAttributes: {
            class: "max-w-full rounded",
          },
        }),
        TaskList,
        TaskItem.configure({
          nested: true,
        }),
      ],
      content: initialContent || "",
      onUpdate: ({ editor }) => {
        const markdown = getMarkdownFromEditor(editor);
        handleContentChangeCallback(markdown);
      },
      editorProps: {
        handlePaste: (_view, event) => {
          if (onPaste) {
            // Create a synthetic clipboard event
            const syntheticEvent = {
              ...event,
              clipboardData: event.clipboardData,
              preventDefault: () => event.preventDefault(),
            } as unknown as React.ClipboardEvent;
            onPaste(syntheticEvent);
          }
        },
      },
    });

    // Update editor content when initialContent changes externally
    useEffect(() => {
      if (editor && initialContent !== undefined) {
        const currentMarkdown = getMarkdownFromEditor(editor);
        if (currentMarkdown !== initialContent) {
          setMarkdownToEditor(editor, initialContent);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialContent]);

    // Handle composition events
    useEffect(() => {
      if (!editor) return;

      const handleCompositionStart = () => {
        onCompositionStart?.();
      };

      const handleCompositionEnd = () => {
        onCompositionEnd?.();
      };

      const editorElement = editor.view.dom;
      editorElement.addEventListener("compositionstart", handleCompositionStart);
      editorElement.addEventListener("compositionend", handleCompositionEnd);

      return () => {
        editorElement.removeEventListener("compositionstart", handleCompositionStart);
        editorElement.removeEventListener("compositionend", handleCompositionEnd);
      };
    }, [editor, onCompositionStart, onCompositionEnd]);

    // Notify parent when editor is ready
    useEffect(() => {
      if (editor && onEditorReady) {
        onEditorReady(editor);
      }
    }, [editor, onEditorReady]);

    // Create adapter for EditorRefActions interface
    const editorActions: EditorRefActions = useMemo(
      () => ({
        getEditor: () => {
          // Return the TipTap editor's DOM element as a textarea-like interface
          return editor?.view.dom as unknown as HTMLTextAreaElement | null;
        },
        focus: () => {
          editor?.commands.focus();
        },
        scrollToCursor: () => {
          // TipTap handles scrolling automatically
          editor?.commands.focus();
        },
        insertText: (content = "", prefix = "", suffix = "") => {
          if (!editor) return;
          const markdown = prefix + content + suffix;
          editor.commands.insertContent(markdown);
        },
        removeText: (_start: number, _length: number) => {
          if (!editor) return;
          // TipTap uses positions, not indices
          // This is a simplified implementation
          const { from, to } = editor.state.selection;
          editor.commands.deleteRange({ from, to });
        },
        setContent: (text: string) => {
          setMarkdownToEditor(editor, text);
        },
        getContent: () => {
          return getMarkdownFromEditor(editor);
        },
        getSelectedContent: () => {
          if (!editor) return "";
          const { from, to } = editor.state.selection;
          return editor.state.doc.textBetween(from, to);
        },
        getCursorPosition: () => {
          if (!editor) return 0;
          return editor.state.selection.anchor;
        },
        setCursorPosition: (startPos: number, endPos?: number) => {
          if (!editor) return;
          const endPosition = endPos !== undefined && !Number.isNaN(endPos) ? endPos : startPos;
          editor.commands.setTextSelection({ from: startPos, to: endPosition });
        },
        getCursorLineNumber: () => {
          if (!editor) return 0;
          const { anchor } = editor.state.selection;
          const resolvedPos = editor.state.doc.resolve(anchor);
          return resolvedPos.start(1) - 1;
        },
        getLine: (lineNumber: number) => {
          if (!editor) return "";
          const markdown = getMarkdownFromEditor(editor);
          const lines = markdown.split("\n");
          return lines[lineNumber] ?? "";
        },
        setLine: (lineNumber: number, text: string) => {
          if (!editor) return;
          const markdown = getMarkdownFromEditor(editor);
          const lines = markdown.split("\n");
          lines[lineNumber] = text;
          setMarkdownToEditor(editor, lines.join("\n"));
          editor.commands.focus();
        },
      }),
      [editor],
    );

    useImperativeHandle(ref, () => editorActions, [editorActions]);

    if (!editor) {
      return null;
    }

    return (
      <div
        className={cn(
          "flex flex-col justify-start items-start relative w-full bg-inherit prose prose-sm max-w-none",
          // Focus mode: flex-1 to grow and fill space; Normal: h-auto with max-height
          isFocusMode ? "flex-1" : `h-auto ${EDITOR_HEIGHT.normal}`,
          className,
        )}
      >
        <div
          className={cn(
            "w-full my-1 text-base resize-none overflow-x-hidden overflow-y-auto bg-transparent outline-none",
            // Focus mode: flex-1 h-0 to grow within flex container; Normal: h-full to fill wrapper
            isFocusMode ? "flex-1 h-0" : "h-full",
            "prose-headings:mt-2 prose-headings:mb-1",
            "prose-p:my-1",
            "prose-ul:my-1 prose-ol:my-1",
            "prose-li:my-0",
            "prose-blockquote:my-1 prose-blockquote:border-l-4",
            "prose-code:bg-accent prose-code:px-1 prose-code:rounded",
            "prose-pre:bg-accent prose-pre:p-2 prose-pre:rounded",
            "prose-img:my-2",
            // TipTap specific styles
            "[&_.ProseMirror]:outline-none",
            // Placeholder styles
            "[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:opacity-70 [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none",
            "[&_.ProseMirror_p.is-empty::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-empty::before]:float-left [&_.ProseMirror_p.is-empty::before]:text-muted-foreground [&_.ProseMirror_p.is-empty::before]:opacity-70 [&_.ProseMirror_p.is-empty::before]:h-0 [&_.ProseMirror_p.is-empty::before]:pointer-events-none",
            // Ordered list styles - ensure numbers are visible
            "[&_ol]:list-decimal [&_ol]:list-outside [&_ol]:pl-6 [&_ol]:my-1 [&_ol]:space-y-0",
            "[&_ol_li]:pl-2 [&_ol_li]:my-0",
            // Task list styles - ensure checkbox and text are on same line
            "[&_ul[data-type='taskList']]:list-none [&_ul[data-type='taskList']]:pl-0 [&_ul[data-type='taskList']]:my-1 [&_ul[data-type='taskList']]:space-y-0",
            "[&_li[data-type='taskItem']]:flex [&_li[data-type='taskItem']]:items-start [&_li[data-type='taskItem']]:gap-2 [&_li[data-type='taskItem']]:my-0.5 [&_li[data-type='taskItem']]:not-first:mt-1",
            "[&_li[data-type='taskItem']_label]:flex [&_li[data-type='taskItem']_label]:items-center [&_li[data-type='taskItem']_label]:cursor-pointer [&_li[data-type='taskItem']_label]:shrink-0",
            "[&_li[data-type='taskItem']_input[type='checkbox']]:mt-0.5 [&_li[data-type='taskItem']_input[type='checkbox']]:cursor-pointer [&_li[data-type='taskItem']_input[type='checkbox']]:shrink-0 [&_li[data-type='taskItem']_input[type='checkbox']]:w-4 [&_li[data-type='taskItem']_input[type='checkbox']]:h-4",
            "[&_li[data-type='taskItem']_div]:flex-1 [&_li[data-type='taskItem']_div]:min-w-0 [&_li[data-type='taskItem']_div]:inline",
            "[&_li[data-type='taskItem']_p]:inline [&_li[data-type='taskItem']_p]:m-0",
            // Regular bullet list styles
            "[&_ul:not([data-type='taskList'])]:list-disc [&_ul:not([data-type='taskList'])]:list-outside [&_ul:not([data-type='taskList'])]:pl-6 [&_ul:not([data-type='taskList'])]:my-1 [&_ul:not([data-type='taskList'])]:space-y-0",
            "[&_ul:not([data-type='taskList'])_li]:pl-2 [&_ul:not([data-type='taskList'])_li]:my-0",
          )}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    );
  },
);

export default TipTapEditor;
