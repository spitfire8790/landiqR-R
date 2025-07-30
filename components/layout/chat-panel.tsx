"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import type { Message } from "@/lib/types";
import { Smile, ChevronsLeft, ChevronsRight } from "lucide-react";
import { motion } from "framer-motion";

function deriveName(email: string): string {
  const local = email.split("@")[0] || "";
  return local
    .split(".")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

export default function ChatPanel() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");

  // Load user id/email
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setUserEmail(data.user?.email || "");
    });
  }, []);

  // Subscribe to messages
  useEffect(() => {
    if (!isAuthenticated) return;

    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: true });
      setMessages(data as any);
    };

    load();

    const channel = supabase
      .channel("chat-room", {
        config: { presence: { key: userId || Math.random().toString() } },
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
        setTypingUsers((prev) =>
          prev.includes(typingId) ? prev : [...prev, typingId]
        );
        setTimeout(() => {
          setTypingUsers((prev) => prev.filter((id) => id !== typingId));
        }, 3000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, userId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // push padding to main layout when open
  useEffect(() => {
    const root = document.documentElement;
    if (open) root.classList.add("chat-open");
    else root.classList.remove("chat-open");
  }, [open]);

  if (!isAuthenticated) return null;

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!userId) return;
    await supabase
      .from("messages")
      .insert({ content: input, user_id: userId, author_email: userEmail });
    setInput("");
    setShowEmoji(false);
  };

  const broadcastTyping = () => {
    if (userId)
      supabase.channel("chat-room").send({
        type: "broadcast",
        event: "typing",
        payload: { user_id: userId },
      });
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    broadcastTyping();
  };

  const addEmoji = (emoji: string) => {
    setInput((prev) => prev + emoji);
    setShowEmoji(false);
    broadcastTyping();
  };

  const width = open ? 380 : 56;

  return (
    <motion.aside
      animate={{ width }}
      className="fixed top-0 right-0 h-full bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-2xl z-50 flex flex-col"
      transition={{ type: "tween", duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
        {open && (
          <span className="font-semibold text-gray-800 dark:text-gray-100">
            Team Chat
          </span>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setOpen((o) => !o)}
          className="text-gray-600 dark:text-gray-300"
        >
          {open ? <ChevronsRight /> : <ChevronsLeft />}
        </Button>
      </div>

      {open && (
        <>
          {/* Messages */}
          <ScrollArea className="flex-1 p-4 space-y-3">
            {messages.map((msg) => {
              const mine = msg.user_id === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${
                    mine ? "justify-end" : "justify-start"
                  } flex-col`}
                >
                  <span className="text-xs text-gray-500 mb-0.5">
                    {deriveName(msg.author_email)}
                  </span>
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={`rounded-lg px-3 py-2 text-sm max-w-[260px] ${
                      mine
                        ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-50"
                    }`}
                  >
                    {msg.content}
                  </motion.div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700 flex gap-2 items-end relative">
            <Input
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Message..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowEmoji((s) => !s)}
            >
              <Smile className="h-5 w-5" />
            </Button>
            <Button onClick={handleSend} disabled={!input.trim()}>
              Send
            </Button>

            {showEmoji && (
              <div className="absolute bottom-16 right-3 bg-white dark:bg-gray-800 border rounded-lg shadow-lg p-3 w-64 grid grid-cols-6 gap-2 z-50">
                {[
                  "😀",
                  "😂",
                  "🙂",
                  "😎",
                  "😍",
                  "😢",
                  "👍",
                  "🙏",
                  "🎉",
                  "❤️",
                  "🔥",
                  "🚀",
                  "👀",
                  "🤔",
                  "🥳",
                  "✅",
                  "⚡",
                  "💡",
                ].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-2xl hover:scale-110 transition-transform"
                    onClick={() => addEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          {typingUsers.length > 0 && (
            <div className="px-4 py-1 text-xs text-gray-500">
              Someone is typing…
            </div>
          )}
        </>
      )}
    </motion.aside>
  );
}
