"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  rows?: number;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Enter text...",
  className,
  rows = 4,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const [lastValue, setLastValue] = useState(value); // cache of last editor HTML

  const handleInput = useCallback(() => {
    if (editorRef.current) {
      const content = editorRef.current.innerHTML;
      setLastValue(content);
      onChange(content);
    }
  }, [onChange]);

  // Initialize editor content only when value changes externally
  useEffect(() => {
    // Sync external value into the editor only if it's different from what's
    // currently rendered, so we don't reset the caret on every keystroke.
    if (
      editorRef.current &&
      !isFormatting &&
      editorRef.current.innerHTML !== value
    ) {
      editorRef.current.innerHTML = value;
      setLastValue(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isFormatting]);

  const executeCommand = (command: string, value?: string) => {
    editorRef.current?.focus();
    setIsFormatting(true);

    let success = false;
    try {
      success = document.execCommand(command, false, value);
    } catch (e) {
      console.error("Command failed:", command, e);
    }

    // Fallback for bullet/numbered lists if the original command failed
    if (
      !success &&
      (command === "insertUnorderedList" || command === "insertOrderedList")
    ) {
      const listHtml =
        command === "insertUnorderedList"
          ? "<ul><li><br></li></ul>"
          : "<ol><li><br></li></ol>";
      try {
        document.execCommand("insertHTML", false, listHtml);
      } catch (e) {
        console.error("Fallback list insertion failed:", e);
      }
    }

    // Manually trigger handleInput to sync state, as execCommand does not
    // always dispatch an 'input' event
    if (editorRef.current) {
      handleInput();
    }

    setIsFormatting(false);
  };

  const formatText = (format: string) => {
    executeCommand(format);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "b":
          e.preventDefault();
          formatText("bold");
          break;
        case "i":
          e.preventDefault();
          formatText("italic");
          break;
        case "u":
          e.preventDefault();
          formatText("underline");
          break;
        case "z":
          e.preventDefault();
          executeCommand("undo");
          break;
        case "y":
          e.preventDefault();
          executeCommand("redo");
          break;
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    executeCommand("insertText", text);
  };

  const handleButtonClick = (e: React.MouseEvent, callback: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    callback();
  };

  return (
    <div className={cn("border rounded-md", className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleButtonClick(e, () => formatText("bold"))}
          className="h-8 w-8 p-0"
          title="Bold (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleButtonClick(e, () => formatText("italic"))}
          className="h-8 w-8 p-0"
          title="Italic (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleButtonClick(e, () => formatText("underline"))}
          className="h-8 w-8 p-0"
          title="Underline (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) =>
            handleButtonClick(e, () => executeCommand("insertUnorderedList"))
          }
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) =>
            handleButtonClick(e, () => executeCommand("insertOrderedList"))
          }
          className="h-8 w-8 p-0"
          title="Numbered List"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-gray-300 mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleButtonClick(e, () => executeCommand("undo"))}
          className="h-8 w-8 p-0"
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => e.preventDefault()}
          onClick={(e) => handleButtonClick(e, () => executeCommand("redo"))}
          className="h-8 w-8 p-0"
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        className={cn(
          "p-3 min-h-[100px] outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
          `min-h-[${rows * 24}px]`
        )}
        style={{
          minHeight: `${rows * 24}px`,
          // Ensure lists are displayed properly
          listStylePosition: "inside",
        }}
        suppressContentEditableWarning={true}
        data-placeholder={placeholder}
      />

      <style jsx>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9ca3af;
          pointer-events: none;
        }
        [contenteditable] ul {
          margin: 0.5em 0;
          padding-left: 1.5em;
          list-style-type: disc !important;
          list-style-position: outside !important;
        }
        [contenteditable] ol {
          margin: 0.5em 0;
          padding-left: 1.5em;
          list-style-type: decimal !important;
          list-style-position: outside !important;
        }
        [contenteditable] li {
          margin: 0.2em 0;
          display: list-item !important;
          list-style: inherit !important;
        }
        [contenteditable] ul li::marker {
          content: "•";
          color: inherit;
        }
        [contenteditable] strong {
          font-weight: bold;
        }
        [contenteditable] em {
          font-style: italic;
        }
        [contenteditable] u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
