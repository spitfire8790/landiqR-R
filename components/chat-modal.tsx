"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/auth-context";
import type { Message } from "@/lib/types";
import { Smile } from "lucide-react";

interface ChatModalProps {
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

export default function ChatModal({ open, onOpenChange }: ChatModalProps) {
  const { isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [userEmail, setUserEmail] = useState("");

  // Load current user id once
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setUserEmail(data.user?.email || "");
    });
  }, []);

  // Fetch messages and subscribe when modal opens
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
  }, [open, isAuthenticated]);

  // Auto scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!isAuthenticated) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!userId) return;
    await supabase
      .from("messages")
      .insert({ content: input, user_id: userId, author_email: userEmail });
    setInput("");
  };

  const handleInputChange = (value: string) => {
    setInput(value);
    // broadcast typing
    if (userId) {
      supabase.channel("chat-room").send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId },
      });
    }
  };

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
    if (userId) {
      supabase.channel("chat-room").send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col h-[70vh] p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Team Chat</DialogTitle>
        </DialogHeader>
        <div className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.user_id === userId ? "justify-end" : "justify-start"
                  } flex-col`}
                >
                  <span className="text-xs text-gray-500 mb-0.5">
                    {deriveName(msg.author_email || "Unknown")}
                  </span>
                  <div className="max-w-xs bg-gray-200 dark:bg-gray-700 p-2 rounded-lg">
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
          <div className="p-4 border-t flex gap-2">
            <Input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="relative">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowEmoji((s) => !s)}
              >
                <Smile className="h-5 w-5" />
              </Button>
              {showEmoji && (
                <div className="absolute bottom-10 right-0 bg-white dark:bg-gray-800 border p-2 rounded shadow-md grid grid-cols-8 gap-1 z-50">
                  {[
                    "😀",
                    "😂",
                    "👍",
                    "🙏",
                    "🎉",
                    "❤️",
                    "😎",
                    "😢",
                    "🤔",
                    "🚀",
                    "👏",
                    "🙌",
                    "🔥",
                    "🥳",
                    "💡",
                    "✅",
                  ].map((e) => (
                    <button
                      key={e}
                      className="text-xl"
                      onClick={() => addEmoji(e)}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button onClick={handleSend} disabled={!input.trim()}>
              Send
            </Button>
          </div>
          {typingUsers.length > 0 && (
            <div className="px-4 pb-2 text-xs text-gray-500">
              Someone is typing...
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
