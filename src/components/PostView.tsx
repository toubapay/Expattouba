import React, { useEffect, useState, useRef } from "react";
import { Camera, Image as ImageIcon, Sparkles, Loader2, X, CheckCircle2 } from "lucide-react";
import { useAuth } from "./AuthContext";
import { motion, AnimatePresence } from "motion/react";

interface Category {
  id: string;
  name: string;
  icon: string;
}

export function PostView() {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, getToken } = useAuth();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/v1/categories")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCategories)
      .catch(() => {});
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerateAI = async () => {
    if (!title) {
      alert("Veuillez entrer un titre d'abord.");
      return;
    }

    setIsGenerating(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", title);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: formData,
      });

      if (!res.ok) throw new Error("Erreur génération");
      
      const data = await res.json();
      if (data.description) {
        setDescription(data.description);
      }
    } catch (err) {
      console.error(err);
      alert("Erreur lors de la génération avec l'IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmListing = () => {
    if (!title || !price) {
      alert("Titre et prix requis.");
      return;
    }
    setShowConfirm(true);
  };

  const handleSubmitListing = async () => {
    setIsSubmitting(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("title", title);
      formData.append("price", price);
      formData.append("description", description);
      if (category) formData.append("category", category);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      const res = await fetch("/api/v1/listings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setShowConfirm(false);
        alert("Annonce publiée avec succès !");
        setTitle("");
        setPrice("");
        setDescription("");
        setCategory("");
        setImageFile(null);
        setImagePreview(null);
      } else {
        alert(data.error || "Erreur lors de la publication.");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur réseau");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="min-h-full bg-gray-50 relative">
        <div className="bg-white px-4 pt-12 pb-4 sticky top-0 z-40 border-b border-gray-100">
          <h1 className="text-xl font-bold text-center">Nouvelle Annonce</h1>
        </div>

        <div className="p-4 space-y-6">
          {/* Photo Upload Area - Instagram Style */}
          <div 
            className="aspect-square bg-white rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center relative overflow-hidden"
            onClick={() => !imagePreview && fileInputRef.current?.click()}
          >
            {imagePreview ? (
              <>
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setImagePreview(null);
                    setImageFile(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 rounded-full text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </>
            ) : (
              <div className="text-center space-y-3 cursor-pointer">
                <div className="flex justify-center space-x-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-orange-600">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                </div>
                <p className="font-medium text-gray-500">Ajouter une photo</p>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageSelect}
            />
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Titre</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: IPhone 14 Pro Max 256Go"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Catégorie</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Choisir une catégorie...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.icon} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase ml-1 mb-1 block">Prix (FCFA)</label>
              <input 
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Ex: 550000"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                <button 
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !title}
                  className="flex items-center space-x-1 text-xs font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded-md disabled:opacity-50 active:bg-purple-100"
                >
                  {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                  <span>Générer avec l'IA</span>
                </button>
              </div>
              <textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre article..."
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
            </div>
          </div>

          {/* Publish Button */}
          <button 
            onClick={confirmListing}
            className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-transform"
          >
            Publier l'annonce
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 flex flex-col justify-end md:items-center md:justify-center p-0 md:p-4"
          >
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white w-full md:max-w-sm rounded-t-3xl md:rounded-3xl p-6 pb-safe"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Confirmer l'annonce</h2>
                <button onClick={() => setShowConfirm(false)} className="p-2 bg-gray-100 rounded-full">
                  <X className="w-5 h-5 text-gray-700" />
                </button>
              </div>

              <div className="flex space-x-4 mb-6">
                <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 line-clamp-2">{title}</h3>
                  <p className="text-orange-600 font-black mt-1">
                    {Number(price).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-6 line-clamp-3">
                {description}
              </p>

              <button 
                onClick={handleSubmitListing}
                disabled={isSubmitting}
                className="w-full bg-orange-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-transform flex items-center justify-center space-x-2 disabled:opacity-70"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Confirmer la publication</span>
                  </>
                )}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
