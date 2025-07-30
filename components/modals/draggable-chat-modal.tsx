"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import type { Message } from "@/lib/types";
import { Smile, X, MessageCircle, Minus, Edit, Trash2, Check, XIcon } from "lucide-react";
import { motion } from "framer-motion";

interface DraggableChatModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function deriveName(email: string): string {
  const local = email.split("@")[0] || "";
  return local
    .split(".")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function DraggableChatModal({ open, onOpenChange }: DraggableChatModalProps) {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isMinimized, setIsMinimized] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Load user id/email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setUserEmail(data.user?.email || "");
    });
  }, []);

  // Subscribe to messages when modal opens
  useEffect(() => {
    if (!open || !isAuthenticated) return;

    const load = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data as any);
      }
    };

    load();

    const channel = supabase
      .channel("chat-room", {
        config: {
          presence: {
            key: userId || Math.random().toString(),
          },
        },
      })
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as any]);
        }
      )
      .on("broadcast", { event: "typing" }, ({ payload }) => {
        const { user_id: typingId } = payload as any;
        if (typingId === userId) return;
        setTypingUsers((prev) => {
          if (prev.includes(typingId)) return prev;
          return [...prev, typingId];
        });

        // Remove after 3s
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== typingId));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, isAuthenticated, userId]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    if (!isMinimized) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMinimized]);

  // Handle mouse events for dragging
  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chat-content')) return; // Don't drag if clicking on chat content
    
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      
      // Keep modal within viewport bounds
      const maxX = window.innerWidth - 400; // modal width
      const maxY = window.innerHeight - (isMinimized ? 60 : 500); // modal height
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, isMinimized]);

  if (!isAuthenticated || !open) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!userId) return;
    await supabase
      .from("messages")
      .insert({ content: input, user_id: userId, author_email: userEmail });
    setInput("");
    setShowEmoji(false);
  };

  const handleEditMessage = async (messageId: string) => {
    if (!editingText.trim()) return;
    
    const { error } = await supabase
      .from("messages")
      .update({ content: editingText })
      .eq("id", messageId)
      .eq("user_id", userId); // Ensure user can only edit their own messages

    if (!error) {
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: editingText } : msg
      ));
      setEditingMessageId(null);
      setEditingText("");
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .eq("user_id", userId); // Ensure user can only delete their own messages

    if (!error) {
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    }
  };

  const startEditing = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingText(message.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingText("");
  };

  const broadcastTyping = () => {
    if (userId) {
      supabase.channel("chat-room").send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId },
      });
    }
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    broadcastTyping();
  };

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
    broadcastTyping();
  };

  return (
    <motion.div
      ref={modalRef}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="fixed z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl"
      style={{
        left: position.x,
        top: position.y,
        width: 400,
        height: isMinimized ? 60 : 500,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
    >
      {/* Header - draggable area */}
      <div
        className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 rounded-t-lg cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-blue-500" />
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            Team Chat
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <Minus className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-6 w-6 p-0 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Chat content - only show when not minimized */}
      {!isMinimized && (
        <div className="flex flex-col h-[440px] chat-content">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {messages.map((msg) => {
                const mine = msg.user_id === userId;
                const isEditing = editingMessageId === msg.id;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${
                      mine ? "justify-end" : "justify-start"
                    } flex-col group`}
                  >
                    <span className="text-xs text-gray-500 mb-0.5">
                      {deriveName(msg.author_email || "Unknown")}
                    </span>
                    <div className="flex items-end gap-2">
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`rounded-lg px-3 py-2 text-sm inline-block max-w-[280px] min-w-fit ${
                          mine
                            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                        }`}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="text-sm bg-white/20 border-white/30 text-white placeholder:text-white/70"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleEditMessage(msg.id);
                                } else if (e.key === "Escape") {
                                  cancelEditing();
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditMessage(msg.id)}
                              className="h-6 w-6 p-0 text-white hover:bg-white/20"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                              className="h-6 w-6 p-0 text-white hover:bg-white/20"
                            >
                              <XIcon className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        )}
                      </motion.div>
                      
                      {/* Edit/Delete buttons for own messages */}
                      {mine && !isEditing && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditing(msg)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="h-6 w-6 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 relative">
            <div className="flex gap-2 items-end">
              <Input
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmoji((s) => !s)}
                className="h-8 w-8 p-0"
              >
                <Smile className="h-4 w-4" />
              </Button>
              <Button onClick={handleSend} disabled={!input.trim()} size="sm">
                Send
              </Button>
            </div>

            {/* Emoji picker */}
            {showEmoji && (
              <div className="absolute bottom-14 right-3 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 w-64 grid grid-cols-6 gap-2 z-50">
                {[
                  "😀", "😂", "🙂", "😎", "😍", "😢",
                  "👍", "🙏", "🎉", "❤️", "🔥", "🚀",
                  "👀", "🤔", "🥳", "✅", "⚡", "💡",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-xl hover:scale-110 transition-transform"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Typing indicator */}
          {typingUsers.length > 0 && (
            <div className="px-4 pb-2 text-xs text-gray-500">
              Someone is typing...
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
