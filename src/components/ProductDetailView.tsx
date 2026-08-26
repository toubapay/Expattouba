import { motion } from "motion/react";
import { ArrowLeft, Share2, MapPin, ShieldCheck, Flag } from "lucide-react";
import { Listing } from "../types";

interface ProductDetailProps {
  listing: any;
  onBack: () => void;
}

export function ProductDetailView({ listing, onBack }: ProductDetailProps) {
  return (
    <motion.div 
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 200 }}
      className="fixed inset-0 z-[60] bg-white flex flex-col md:absolute"
    >
      {/* Top Header Buttons */}
      <div className="absolute top-4 left-4 right-4 flex justify-between z-10">
        <button onClick={onBack} className="p-2 bg-white/80 backdrop-blur rounded-full shadow-sm">
          <ArrowLeft className="w-6 h-6 text-gray-900" />
        </button>
        <button className="p-2 bg-white/80 backdrop-blur rounded-full shadow-sm">
          <Share2 className="w-5 h-5 text-gray-900" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        {/* Image */}
        <div className="w-full aspect-square bg-gray-100 relative">
          <img 
            src={listing.image} 
            alt={listing.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Info */}
        <div className="p-4">
          <h1 className="text-2xl font-bold leading-tight mb-2 text-gray-900">{listing.title}</h1>
          <p className="text-3xl font-black text-orange-600 mb-4">
            {Number(listing.price).toLocaleString('fr-FR')} {listing.currency}
          </p>

          <div className="flex items-center space-x-2 text-sm text-gray-500 mb-6 font-medium">
            <MapPin className="w-4 h-4" />
            <span>Dakar, Sénégal</span>
            <span>•</span>
            <span>Publié il y a 2h</span>
          </div>

          <div className="h-px w-full bg-gray-100 mb-6"></div>

          <h2 className="text-lg font-bold mb-3 text-gray-900">Description</h2>
          <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap mb-6">
            {listing.description}
          </p>

          <div className="h-px w-full bg-gray-100 mb-6"></div>

          {/* Vendor Info */}
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
            <h2 className="text-sm font-bold text-gray-400 uppercase mb-4">Informations du vendeur</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-tr from-orange-400 to-pink-500 rounded-full p-[2px]">
                  <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-2 border-white">
                    <span className="text-lg font-bold">{listing.vendorName?.charAt(0) || "V"}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{listing.vendorName}</h3>
                  <div className="flex items-center text-xs font-bold text-green-600 mt-0.5">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    Membre vérifié
                  </div>
                </div>
              </div>
              {listing.vendorBadge === 'GOLD' && (
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-[10px] font-bold rounded-md">
                  Vendeur GOLD
                </span>
              )}
            </div>
          </div>

          <button className="flex items-center space-x-2 text-red-500 text-sm font-bold mt-8 justify-center w-full">
            <Flag className="w-4 h-4" />
            <span>Signaler cette annonce</span>
          </button>
        </div>
      </div>

      {/* Sticky Bottom Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex space-x-3 pb-safe z-10">
        <button className="flex-1 bg-orange-600 text-white py-4 rounded-xl font-bold text-[15px] shadow-lg shadow-orange-200">
          Acheter (Wallet)
        </button>
        <a 
          href={`https://wa.me/${listing.whatsapp}`}
          target="_blank"
          rel="noreferrer"
          className="flex-1 bg-[#25D366] text-white py-4 rounded-xl font-bold text-[15px] flex items-center justify-center"
        >
          WhatsApp
        </a>
      </div>
    </motion.div>
  );
}
