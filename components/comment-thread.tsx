"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fetchComments, createComment } from "@/lib/data-service";
import { createMentionNotifications, highlightMentions } from "@/lib/mention-parser";
import type { Comment } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";

interface CommentThreadProps {
  parentType: "task" | "responsibility";
  parentId: string;
  readOnly?: boolean;
}

export default function CommentThread({ parentType, parentId, readOnly }: CommentThreadProps) {
  const { userId, userEmail } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const loadComments = async () => {
    if (!parentId) return;
    setLoading(true);
    const data = await fetchComments(parentType, parentId);
    setComments(data);
    setLoading(false);
    // scroll to bottom
    setTimeout(() => {
      if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
        if (viewport) {
          viewport.scrollTop = viewport.scrollHeight;
        }
      }
    }, 50);
  };

  useEffect(() => {
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userId) return;

    setPosting(true);
    const comment = await createComment({
      parentType,
      parentId,
      authorId: userId,
      body: newComment.trim(),
    });

    if (comment) {
      setComments((prev) => [...prev, comment]);
      setNewComment("");
      
      // Create mention notifications
      await createMentionNotifications(
        comment.body,
        userId,
        parentType,
        parentId
      );
      
      // Scroll to bottom after a short delay to ensure the comment is rendered
      setTimeout(() => {
        if (scrollAreaRef.current) {
          const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        }
      }, 100);
    }
    setPosting(false);
  };

  if (!parentId) return null; // nothing to display for new entity yet

  return (
    <div className="border rounded-md p-3 space-y-3">
      <h4 className="font-semibold text-sm">Comments</h4>
      <ScrollArea className="h-40" ref={scrollAreaRef as any}>
        {loading && <p className="text-xs text-muted-foreground">Loading...</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-muted-foreground">No comments yet.</p>
        )}
        <div className="space-y-3 pr-2">
          {comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarFallback>
                  {c.authorId === userId ? "Me" : c.authorId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{c.authorId === userId ? "Me" : c.authorId}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <div 
                  className="text-sm text-gray-700"
                  dangerouslySetInnerHTML={{ __html: highlightMentions(c.body) }}
                />
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {!readOnly && (
        <div className="space-y-2">
          <Textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            placeholder="Add a comment..."
          />
          <div className="text-right">
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || posting}>
              Post
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
