import type { Editor } from "@tiptap/react";
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Strikethrough,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface MarkdownToolbarProps {
  editor: Editor | null;
  className?: string;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ editor, className }) => {
  if (!editor) return null;

  const ToolbarButton = ({
    onClick,
    isActive,
    icon: Icon,
    title,
    disabled = false,
  }: {
    onClick: () => void;
    isActive?: boolean;
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    disabled?: boolean;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("h-8 w-8 p-0", isActive && "bg-accent", disabled && "opacity-50 cursor-not-allowed")}
      title={title}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );

  return (
    <div
      className={cn(
        "w-full min-w-0 overflow-hidden border-t border-border",
        className,
      )}
    >
      <div
        className="flex flex-row items-center gap-1 px-1 py-2 overflow-x-auto overflow-y-hidden overscroll-x-contain"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        <div className="flex flex-row items-center gap-1 flex-shrink-0">
          {/* Text formatting */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          icon={Bold}
          title="Bold (Ctrl+B)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          icon={Italic}
          title="Italic (Ctrl+I)"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleStrike().run()}
          isActive={editor.isActive("strike")}
          icon={Strikethrough}
          title="Strikethrough"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          isActive={editor.isActive("code")}
          icon={Code}
          title="Inline code"
        />
        </div>

        <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

        <div className="flex flex-row items-center gap-1 flex-shrink-0">
          {/* Headings */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          isActive={editor.isActive("heading", { level: 1 })}
          icon={Heading1}
          title="Heading 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          isActive={editor.isActive("heading", { level: 2 })}
          icon={Heading2}
          title="Heading 2"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          isActive={editor.isActive("heading", { level: 3 })}
          icon={Heading3}
          title="Heading 3"
        />
        </div>

        <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

        <div className="flex flex-row items-center gap-1 flex-shrink-0">
          {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          icon={List}
          title="Bullet list"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          icon={ListOrdered}
          title="Ordered list"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          isActive={editor.isActive("taskList")}
          icon={List}
          title="Task list"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          icon={Quote}
          title="Quote"
        />
        </div>

        <div className="h-6 w-px bg-border mx-1 flex-shrink-0" />

        <div className="flex flex-row items-center gap-1 flex-shrink-0">
          {/* Links and media - disabled */}
        <ToolbarButton
          onClick={() => {
            // Disabled
          }}
          isActive={false}
          icon={Link}
          title="Insert link (disabled)"
          disabled
        />
        <ToolbarButton
          onClick={() => {
            // Disabled
          }}
          icon={Image}
          title="Insert image (disabled)"
          disabled
        />
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} icon={Minus} title="Horizontal rule" />
        </div>
      </div>
    </div>
  );
};
