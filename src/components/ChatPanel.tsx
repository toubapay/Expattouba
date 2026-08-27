import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Send, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";

interface ChatMessage {
  id: string;
  threadId: string;
  senderUid: string;
  body: string;
  createdAt: string;
}

interface ChatPanelProps {
  // The caller resolves which thread this is (get-or-create for a fresh
  // "Discuter" from a listing, or straight from a row in the inbox) —
  // ChatPanel only ever renders one already-known thread. Folding
  // "resolve the thread" into this component made it default to acting as
  // the buyer, which silently created a bogus second thread with the
  // *vendor* as buyer when they reopened a conversation from their inbox.
  threadId: string;
  vendorName: string;
  onClose: () => void;
}

const POLL_MS = 4000;

/**
 * A lightweight polling chat rather than a websocket — the rest of this
 * app already treats "live" as a short poll (see LiveState-style patterns
 * in the sister app), and a prototype at this scale doesn't need a
 * persistent-connection server to feel responsive.
 */
export function ChatPanel({ threadId, vendorName, onClose }: ChatPanelProps) {
  const { getToken, dbUser } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<number | null>(null);

  const authedFetch = async (path: string, init?: RequestInit) => {
    const token = await getToken();
    return fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers || {}),
      },
    });
  };

  const fetchMessages = async (id: string, isFirstLoad = false) => {
    try {
      const res = await authedFetch(`/api/v1/chat/threads/${id}/messages`);
      if (!res.ok) throw new Error("Conversation introuvable");
      setMessages(await res.json());
    } catch (e: any) {
      if (isFirstLoad) setError(e.message || "Impossible de charger la conversation");
      // A missed poll tick after the first successful load just tries
      // again next interval instead of surfacing an error.
    } finally {
      if (isFirstLoad) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(threadId, true);
    pollRef.current = window.setInterval(() => fetchMessages(threadId), POLL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // dbUser.uid is the same value the server stamps on every message as
  // senderUid, for both auth paths (Firebase uid or "phone:<number>") —
  // unlike the raw Firebase `user` object, which has no uid at all for a
  // phone-auth session (see AuthContext).
  const myUid = dbUser?.uid ?? null;

  const send = async () => {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setDraft("");
    try {
      const res = await authedFetch(`/api/v1/chat/threads/${threadId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body }),
      });
      const message = await res.json();
      if (res.ok) {
        setMessages((prev) => [...prev, message]);
      }
    } catch {
      setError("Message non envoyé, réessayez.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex md:items-center md:justify-center md:bg-black/50 md:p-6">
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="bg-white flex flex-col w-full h-full md:h-[80vh] md:max-w-lg md:rounded-3xl overflow-hidden md:shadow-2xl"
      >
      <div className="px-4 pt-12 md:pt-4 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 font-medium">Discussion avec</p>
          <h2 className="font-bold text-gray-900">{vendorName}</h2>
        </div>
        <button onClick={onClose} className="p-2 bg-gray-50 rounded-full">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 font-medium text-sm py-8">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 font-medium text-sm py-8">
            Envoyez un message pour démarrer la conversation.
          </div>
        ) : (
          messages.map((m) => {
            const mine = myUid !== null && m.senderUid === myUid;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium ${
                    mine ? "bg-orange-600 text-white rounded-br-sm" : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t border-gray-100 flex items-center space-x-2 pb-safe">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          placeholder="Écrire un message..."
          className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-100"
        />
        <button
          onClick={send}
          disabled={sending || !draft.trim()}
          className="w-11 h-11 bg-orange-600 text-white rounded-full flex items-center justify-center disabled:opacity-40 flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
      </motion.div>
    </div>
  );
}
