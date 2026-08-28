import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, MessageCircle, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { ChatPanel } from "./ChatPanel";

interface ThreadRow {
  thread: { id: string; listingId: string; vendorId: string; buyerUid: string };
  listingTitle: string;
  listingImage: string | null;
  vendorName: string;
}

interface ChatInboxViewProps {
  onBack: () => void;
}

/** Every conversation this account is part of — as a buyer, or as the
 * vendor being messaged — so a chat started from a product page can be
 * picked back up later instead of only existing while that page is open. */
export function ChatInboxView({ onBack }: ChatInboxViewProps) {
  const { getToken } = useAuth();
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openThread, setOpenThread] = useState<ThreadRow | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/v1/chat/threads", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) setThreads(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center md:bg-black/50 md:p-6">
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="bg-white flex flex-col w-full h-full md:h-[80vh] md:max-w-lg md:rounded-3xl overflow-hidden md:shadow-2xl"
      >
      <div className="px-4 pt-12 md:pt-4 pb-4 border-b border-gray-100 flex items-center space-x-3">
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-lg">Mes messages</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : threads.length === 0 ? (
          <div className="text-center text-gray-400 font-medium py-12 px-6">
            Aucune conversation pour le moment. Discutez avec un vendeur depuis une annonce.
          </div>
        ) : (
          threads.map((t) => (
            <button
              key={t.thread.id}
              onClick={() => setOpenThread(t)}
              className="w-full flex items-center space-x-3 p-4 border-b border-gray-50 text-left active:bg-gray-50"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center">
                {t.listingImage ? (
                  <img src={t.listingImage} className="w-full h-full object-cover" />
                ) : (
                  <MessageCircle className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900">{t.vendorName}</h3>
                <p className="text-xs text-gray-500 line-clamp-1">{t.listingTitle}</p>
              </div>
            </button>
          ))
        )}
      </div>

      <AnimatePresence>
        {openThread && (
          <ChatPanel
            threadId={openThread.thread.id}
            vendorName={openThread.vendorName}
            onClose={() => setOpenThread(null)}
          />
        )}
      </AnimatePresence>
      </motion.div>
    </div>
  );
}
