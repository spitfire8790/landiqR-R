"use client";

import { cn } from "@/lib/utils";

interface RichTextDisplayProps {
  content: string;
  className?: string;
}

export function RichTextDisplay({ content, className }: RichTextDisplayProps) {
  if (!content) return null;

  // Convert markdown-style formatting to HTML
  const formatContent = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/_(.*?)_/g, "<u>$1</u>")
      .replace(/^- (.+)$/gm, "<li>$1</li>")
      .replace(
        /(\n<li>.*<\/li>)+/g,
        (match) => `<ul>${match.replace(/\n/g, "")}</ul>`
      )
      .replace(/\n/g, "<br>");
  };

  const formattedContent = formatContent(content);

  return (
    <div
      className={cn("rich-text-display", className)}
      dangerouslySetInnerHTML={{ __html: formattedContent }}
      style={{
        lineHeight: "1.4",
      }}
    />
  );
}
