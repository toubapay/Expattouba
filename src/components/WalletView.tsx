import { useEffect, useState } from "react";
import { ArrowUpRight, ArrowDownLeft, Clock, Loader2 } from "lucide-react";
import { useAuth } from "./AuthContext";

interface Transaction {
  id: string;
  amount: string;
  type: string | null;
  status: string | null;
  gateway: string | null;
  note: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  DEPOSIT: "Dépôt",
  WITHDRAWAL: "Retrait",
  PAYMENT: "Achat",
  TRANSFER: "Transfert",
};

// No payment gateway is wired up yet — a "Recharger" button that looked
// like it worked would be lying about it, same reasoning as the sister
// app's dev-fallback rule for providers. A wallet is credited by an admin
// (Utilisateurs > ajuster le solde) until Wave/Orange Money is integrated.
function notYetAvailable() {
  alert("Bientôt disponible. En attendant, contactez un administrateur pour créditer votre compte.");
}

export function WalletView() {
  const { dbUser, getToken } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/v1/wallet/transactions", {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (res.ok) setTransactions(await res.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-full bg-gray-50">
      <div className="bg-orange-600 px-4 pt-12 pb-8 rounded-b-3xl text-white">
        <h1 className="text-center font-medium mb-6">Mon Portefeuille</h1>

        <div className="text-center mb-8">
          <p className="text-orange-200 text-sm font-medium mb-1">Solde Principal</p>
          <div className="flex justify-center items-end space-x-2">
            <span className="text-4xl font-black">{Number(dbUser?.walletBalance || 0).toLocaleString('fr-FR')}</span>
            <span className="text-xl font-bold mb-1">FCFA</span>
          </div>
        </div>

        <div className="flex space-x-4">
          <button onClick={notYetAvailable} className="flex-1 bg-white text-orange-600 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg">
            <ArrowDownLeft className="w-5 h-5" />
            <span>Recharger</span>
          </button>
          <button onClick={notYetAvailable} className="flex-1 bg-orange-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2">
            <ArrowUpRight className="w-5 h-5" />
            <span>Retirer</span>
          </button>
        </div>
      </div>

      <div className="p-4 mt-4">
        <h2 className="text-lg font-bold mb-4">Méthodes de Paiement</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button onClick={notYetAvailable} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center space-y-2 hover:border-blue-500 hover:ring-1 ring-blue-500 transition-all">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">W</div>
            <span className="font-bold text-sm text-gray-700">Wave</span>
          </button>
          <button onClick={notYetAvailable} className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center space-y-2 hover:border-orange-500 hover:ring-1 ring-orange-500 transition-all">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">OM</div>
            <span className="font-bold text-sm text-gray-700">Orange Money</span>
          </button>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Historique</h2>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400 font-medium text-sm">Aucun mouvement pour le moment.</div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {transactions.map((tx, idx) => {
              const credit = tx.type === "DEPOSIT";
              return (
                <div key={tx.id} className={`p-4 flex items-center justify-between ${idx !== transactions.length - 1 ? 'border-b border-gray-50' : ''}`}>
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${credit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {credit ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        {tx.note || TYPE_LABEL[tx.type || ""] || "Mouvement"}
                      </h4>
                      <p className="text-xs font-medium text-gray-500 flex items-center mt-0.5">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(tx.createdAt).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <span className={`font-bold ${credit ? 'text-green-600' : 'text-gray-900'}`}>
                    {credit ? '+' : '-'}{Number(tx.amount).toLocaleString('fr-FR')} F
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
