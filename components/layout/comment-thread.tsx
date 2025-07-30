"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { fetchComments, createComment, fetchPeople } from "@/lib/data-service";
import { createMentionNotifications } from "@/lib/mention-parser";
import type { Comment, Person } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";

// Function to highlight @mentions in comment text
function highlightMentions(text: string): string {
  return text.replace(/@(\w+)/g, '<span class="text-blue-600 font-medium">@$1</span>');
}

interface CommentThreadProps {
  parentType: 'task' | 'responsibility';
  parentId?: string;
  readOnly?: boolean;
}

export default function CommentThread({ parentType, parentId, readOnly = false }: CommentThreadProps) {
  const { userEmail, isAuthenticated } = useAuth();
  const userId = userEmail || 'anonymous';
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load people for @mention autocomplete
  useEffect(() => {
    const loadPeople = async () => {
      try {
        console.log('Loading people for @mentions...');
        const allPeople = await fetchPeople();
        console.log('Loaded people:', allPeople.length);
        setPeople(allPeople);
      } catch (error) {
        console.error('Error loading people:', error);
      }
    };
    loadPeople();
  }, []);

  // Handle textarea input for @mention detection
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    setNewComment(value);
    setCursorPosition(cursorPos);
    
    // Check for @mention trigger
    const textBeforeCursor = value.substring(0, cursorPos);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const filter = mentionMatch[1];
      console.log('@ detected, filter:', filter);
      setMentionFilter(filter);
      setShowMentions(true);
      
      // Calculate position for dropdown
      const textarea = e.target;
      const rect = textarea.getBoundingClientRect();
      setMentionPosition({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX
      });
    } else {
      setShowMentions(false);
    }
  };

  // Handle mention selection
  const selectMention = (person: Person) => {
    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const textAfterCursor = newComment.substring(cursorPosition);
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
    
    if (mentionMatch) {
      const beforeMention = textBeforeCursor.substring(0, mentionMatch.index);
      const firstName = person.name.split(' ')[0];
      const newText = beforeMention + `@${firstName} ` + textAfterCursor;
      
      setNewComment(newText);
      setShowMentions(false);
      
      // Focus back to textarea
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = beforeMention.length + firstName.length + 2;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    }
  };

  // Filter people for mentions
  const filteredPeople = people.filter(person => {
    const firstName = person.name.split(' ')[0].toLowerCase();
    const fullName = person.name.toLowerCase();
    const filter = mentionFilter.toLowerCase();
    return firstName.includes(filter) || fullName.includes(filter);
  }).slice(0, 5); // Limit to 5 suggestions

  useEffect(() => {
    if (parentId) {
      loadComments();
    }
  }, [parentId, parentType]);

  const loadComments = async () => {
    if (!parentId) return;
    
    setLoading(true);
    try {
      const fetchedComments = await fetchComments(parentType, parentId);
      setComments(fetchedComments);
    } catch (error) {
      console.error("Error loading comments:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!newComment.trim() || !parentId) return;

    console.log('Posting comment:', { parentType, parentId, userId, comment: newComment.trim() });
    setPosting(true);
    try {
      const comment = await createComment({
        parentType,
        parentId,
        authorId: userId,
        body: newComment.trim(),
      });

      console.log('Comment created:', comment);
      if (comment) {
        setComments(prev => [...prev, comment]);
        
        // Create mention notifications
        console.log('Creating mention notifications...');
        await createMentionNotifications(newComment.trim(), userId, parentType, parentId);
        
        setNewComment("");
        
        // Auto-scroll to bottom
        setTimeout(() => {
          const viewport = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
          if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
          }
        }, 100);
      } else {
        console.error('Failed to create comment - no comment returned');
      }
    } catch (error) {
      console.error("Error posting comment:", error);
    } finally {
      setPosting(false);
    }
  };

  // Close mentions dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowMentions(false);
    if (showMentions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMentions]);

  if (!parentId) return null;

  return (
    <div className="border rounded-md p-3 space-y-3 relative">
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
        <div className="space-y-2 relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            rows={2}
            placeholder="Add a comment... (use @name to mention someone)"
          />
          <div className="text-right">
            <Button size="sm" onClick={handleSubmit} disabled={!newComment.trim() || posting}>
              Post
            </Button>
          </div>
        </div>
      )}

      {/* @Mention Dropdown */}
      {showMentions && filteredPeople.length > 0 && (
        <div 
          className="absolute z-[9999] bg-white border border-gray-300 rounded-md shadow-xl max-h-48 overflow-y-auto mt-1"
          style={{
            top: '100%',
            left: '0',
            right: '0',
            minWidth: '250px'
          }}
        >
          <div className="p-1">
            {filteredPeople.map((person) => (
              <div
                key={person.id}
                className="px-3 py-2 hover:bg-blue-50 cursor-pointer flex items-center gap-2 rounded-sm"
                onClick={() => selectMention(person)}
              >
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium text-sm text-gray-900">{person.name}</div>
                  <div className="text-xs text-gray-500">@{person.name.split(' ')[0].toLowerCase()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
