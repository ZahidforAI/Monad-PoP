"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import {
  MessageSquare,
  Send,
  Trash2,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  User,
  RefreshCw,
  Compass,
  AlertTriangle,
  Lock
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const QUICK_PROMPTS = [
  "Do I have any warranties expiring soon?",
  "Check if I can return my Monad Premium Black Tee",
  "Summarize my purchase credentials history",
  "Is my Supercharged Developer Laptop verified on-chain?"
];

export default function AssistantPage() {
  const { isConnected, sessionAddress, loading, login, switchNetwork, isCorrectNetwork } = useAuth();
  const { connect } = useConnect();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [apiError, setApiError] = useState("");
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from local session storage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = sessionStorage.getItem("monad-pop-chat");
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setMessages(parsed.map((m: any) => ({ ...m, role: m.role as "user" | "assistant", timestamp: new Date(m.timestamp) })));
        } catch {
          // ignore
        }
      } else {
        // Initial welcome message
        setMessages([
          {
            id: "welcome",
            role: "assistant",
            content: "Hi! I am your Monad PoP AI Assistant. I can help you search your purchase credentials, check warranty expirations, verify on-chain statuses, and check return deadlines. Ask a question or choose a suggested query below to get started!",
            timestamp: new Date()
          }
        ]);
      }
    }
  }, []);

  // Save chat history
  const saveChat = (msgs: Message[]) => {
    sessionStorage.setItem("monad-pop-chat", JSON.stringify(msgs));
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    setApiError("");

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: text,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    saveChat(newMessages);
    setInputMsg("");
    setSending(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();

      if (res.status === 429) {
        setApiError("Rate limit exceeded. Please wait a moment before sending another message.");
        return;
      }

      if (data.error) {
        setApiError(data.error);
        return;
      }

      const assistantMsg: Message = {
        id: Math.random().toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date()
      };

      const updatedMessages = [...newMessages, assistantMsg];
      setMessages(updatedMessages);
      saveChat(updatedMessages);

    } catch (err) {
      console.error(err);
      setApiError("Network connection error. Failed to reach AI services.");
    } finally {
      setSending(false);
    }
  };

  const handleClearChat = () => {
    const welcome: Message[] = [
      {
        id: "welcome",
        role: "assistant",
        content: "Hi! Chat history cleared. Connect your wallet to ask about your purchase credentials, return eligibility, or warranties.",
        timestamp: new Date()
      }
    ];
    setMessages(welcome);
    sessionStorage.removeItem("monad-pop-chat");
    setApiError("");
  };

  if (loading) {
    return (
      <div className="w-full flex-1 flex flex-col items-center justify-center bg-background px-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full border-t-2 border-primary animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/50 text-xs font-mono">INITIALIZING_ASSISTANT_SESSION...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex-1 bg-background py-12 px-6 max-w-7xl mx-auto flex flex-col gap-10">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant pb-6">
        <div className="relative inline-block">
          <div className="registration-mark mark-tl"></div>
          <div className="registration-mark mark-tr"></div>
          <div className="px-6 py-2">
            <h1 className="font-display text-3xl font-bold mb-1">Ecosystem Assistant</h1>
            <p className="font-mono text-xs text-foreground/50 tracking-wider">AI_LEDGER_PARSER_V1.1</p>
          </div>
          <div className="registration-mark mark-bl"></div>
          <div className="registration-mark mark-br"></div>
        </div>

        <button
          onClick={handleClearChat}
          className="px-4 py-2 border border-outline-variant hover:bg-accent-rose/10 hover:text-accent-rose hover:border-accent-rose/25 text-xs font-mono font-semibold uppercase tracking-wider rounded-lg transition-all flex items-center gap-2 self-start md:self-auto"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Clear Chat
        </button>
      </header>

      {/* Main Grid: Chat & Sidebar Info */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
        
        {/* Chat Window */}
        <div className="lg:col-span-3 flex flex-col bg-card border border-outline-variant rounded-lg overflow-hidden h-[620px] relative">
          
          {/* Privacy Note */}
          <div className="bg-primary-container/20 border-b border-outline-variant px-6 py-3 flex items-center gap-2 text-xs text-foreground/75 font-mono select-none">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Assistant utilizes secure authenticated buyer sessions. Data does not leave your wallet.</span>
          </div>

          {/* Scrollable Message Box */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`w-full ${m.role === "user" ? "flex justify-end" : "flex justify-start"}`}
              >
                {m.role === "user" ? (
                  // User bubble styling
                  <div className="max-w-[80%] flex gap-3 flex-row-reverse items-start">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary/10 text-primary border border-primary/20">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="rounded-lg px-4 py-3 bg-primary-container/10 border border-outline-variant font-mono text-xs text-foreground">
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ) : (
                  // Assistant ticket styling (tactile ticket mockup)
                  <div className="max-w-[90%] w-full bg-card border border-outline-variant rounded-lg relative overflow-hidden shadow-sm p-6 relative">
                    {/* Corner Registration Marks */}
                    <div className="registration-mark mark-tl"></div>
                    <div className="registration-mark mark-tr"></div>
                    <div className="registration-mark mark-bl"></div>
                    <div className="registration-mark mark-br"></div>

                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="space-y-4 flex-1">
                        <span className="font-mono text-[9px] text-foreground/40 font-bold uppercase tracking-wider block">ASSISTANT RESPONSE</span>
                        <div className="text-sm text-foreground/80 leading-relaxed font-sans whitespace-pre-wrap">
                          {m.content}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* AI typing loader */}
            {sending && (
              <div className="w-full flex justify-start">
                <div className="max-w-[90%] w-full bg-card border border-outline-variant border-dashed rounded-lg p-6 relative flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 animate-pulse">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs text-foreground/50">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>PARSING_ONCHAIN_LEDGERS...</span>
                  </div>
                </div>
              </div>
            )}

            {/* Error alerts */}
            {apiError && (
              <div className="p-4 bg-accent-rose/10 border border-accent-rose/30 rounded-lg text-accent-rose text-xs font-mono flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <span className="font-bold block mb-1">ASSISTANT_EXCEPTION</span>
                  {apiError}
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompts Suggestions */}
          {messages.length <= 1 && isConnected && sessionAddress && (
            <div className="px-6 pb-6 flex flex-col gap-2 bg-background/30 pt-4 border-t border-outline-variant/35">
              <span className="font-mono text-[9px] text-foreground/40 font-bold uppercase tracking-wider flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                Suggested Queries
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInputMsg(prompt);
                      handleSendMessage(prompt);
                    }}
                    className="text-left px-4 py-2.5 border border-outline-variant hover:border-primary hover:bg-primary-container/10 rounded-lg font-sans text-xs text-foreground/70 hover:text-foreground transition-all"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input text form */}
          <div className="border-t border-outline-variant p-4 bg-primary-container/5">
            {(!isConnected || !sessionAddress) ? (
              <div className="text-center py-2">
                <p className="text-xs text-foreground/50 mb-2 font-mono">CONNECT_WALLET_TO_INITIALIZE_SESSION</p>
                <button
                  onClick={login}
                  className="px-4 py-2 bg-primary text-white text-xs font-mono font-semibold uppercase tracking-wider rounded-lg transition"
                >
                  Verify Session
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage(inputMsg);
                }}
                className="flex items-center gap-3"
              >
                <input
                  type="text"
                  placeholder="Ask about warranty durations or specific items..."
                  value={inputMsg}
                  disabled={sending}
                  onChange={(e) => setInputMsg(e.target.value)}
                  className="flex-1 bg-transparent border-b border-outline-variant focus:border-primary outline-none py-2 text-sm text-foreground placeholder-foreground/35 disabled:opacity-50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={sending || !inputMsg.trim()}
                  className="p-3 bg-primary text-white rounded-lg hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>

        </div>

        {/* Sidebar Info Panels */}
        <div className="flex flex-col gap-6">
          <div className="bg-card border border-outline-variant p-6 rounded-lg relative">
            <div className="registration-mark mark-tl"></div>
            <div className="registration-mark mark-tr"></div>
            <div className="registration-mark mark-bl"></div>
            <div className="registration-mark mark-br"></div>

            <h3 className="font-display text-base font-bold mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-primary" />
              Guidelines
            </h3>
            <ul className="text-xs text-foreground/60 space-y-3 list-disc list-inside leading-relaxed font-sans">
              <li>Queries only credentials bound to your active wallet address.</li>
              <li>Reports on-chain state verified by Monad contracts.</li>
              <li>Checks database hash validity against Monad contract proofs.</li>
              <li>Cannot certify product condition or physical delivery state.</li>
            </ul>
          </div>
        </div>

      </div>

    </div>
  );
}
