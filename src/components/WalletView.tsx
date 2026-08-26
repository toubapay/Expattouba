import { ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { useAuth } from "./AuthContext";

export function WalletView() {
  const { dbUser } = useAuth();
  
  const TRANSACTIONS = [
    { id: 1, type: "deposit", amount: 10000, date: "Aujourd'hui, 14:30", method: "Wave Senegal" },
    { id: 2, type: "payment", amount: 2500, date: "Hier, 10:15", method: "Achat Premium" },
    { id: 3, type: "deposit", amount: 5000, date: "12 Août", method: "Orange Money" },
  ];

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
          <button className="flex-1 bg-white text-orange-600 py-3 rounded-xl font-bold flex items-center justify-center space-x-2 shadow-lg">
            <ArrowDownLeft className="w-5 h-5" />
            <span>Recharger</span>
          </button>
          <button className="flex-1 bg-orange-700 text-white py-3 rounded-xl font-bold flex items-center justify-center space-x-2">
            <ArrowUpRight className="w-5 h-5" />
            <span>Retirer</span>
          </button>
        </div>
      </div>

      <div className="p-4 mt-4">
        <h2 className="text-lg font-bold mb-4">Méthodes de Paiement</h2>
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center space-y-2 cursor-pointer hover:border-blue-500 hover:ring-1 ring-blue-500 transition-all">
            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl">W</div>
            <span className="font-bold text-sm text-gray-700">Wave</span>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-100 flex flex-col items-center justify-center space-y-2 cursor-pointer hover:border-orange-500 hover:ring-1 ring-orange-500 transition-all">
            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-xl">OM</div>
            <span className="font-bold text-sm text-gray-700">Orange Money</span>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Historique</h2>
          <button className="text-sm font-bold text-orange-600">Tout voir</button>
        </div>
        
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {TRANSACTIONS.map((tx, idx) => (
            <div key={tx.id} className={`p-4 flex items-center justify-between ${idx !== TRANSACTIONS.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'deposit' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                  {tx.type === 'deposit' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="font-bold text-sm text-gray-900">{tx.method}</h4>
                  <p className="text-xs font-medium text-gray-500 flex items-center mt-0.5">
                    <Clock className="w-3 h-3 mr-1" /> {tx.date}
                  </p>
                </div>
              </div>
              <span className={`font-bold ${tx.type === 'deposit' ? 'text-green-600' : 'text-gray-900'}`}>
                {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString()} F
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
