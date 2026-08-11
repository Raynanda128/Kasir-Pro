import React, { useState, useEffect, useRef } from 'react';
import { X, Upload, Tag, Image as ImageIcon, Sparkles, AlertCircle, Plus, Trash2, Layers } from 'lucide-react';
import { Category, Product, ProductAddon } from '../types';
import { presetProductImages } from '../data/mockSeed';
import { formatRupiah } from '../lib/utils';

interface ProductFormModalProps {
  product: Product | null; // Null for new product, object for edit
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => Promise<void>;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  product,
  categories,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [capitalPrice, setCapitalPrice] = useState<number | ''>('');
  const [sellingPrice, setSellingPrice] = useState<number | ''>('');
  const [stock, setStock] = useState<number | ''>('');
  const [minStockAlert, setMinStockAlert] = useState<number | ''>(5);
  const [barcode, setBarcode] = useState('');
  const [status, setStatus] = useState<'Tersedia' | 'Habis'>('Tersedia');
  const [addons, setAddons] = useState<ProductAddon[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const prevOpenRef = useRef(false);
  const prevProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      prevOpenRef.current = false;
      prevProductIdRef.current = null;
      return;
    }

    const isNewlyOpened = !prevOpenRef.current;
    const currentProdId = product?.id || 'new';
    const isDifferentProduct = currentProdId !== prevProductIdRef.current;

    // Only populate/reset form inputs when modal newly opens or switching to a different product to edit
    if (isNewlyOpened || isDifferentProduct) {
      prevOpenRef.current = true;
      prevProductIdRef.current = currentProdId;

      if (product) {
        setName(product.name);
        setCategoryId(product.categoryId || categories[0]?.id || '');
        setImage(product.image);
        setDescription(product.description || '');
        setCapitalPrice(product.capitalPrice);
        setSellingPrice(product.sellingPrice);
        setStock(product.stock);
        setMinStockAlert(product.minStockAlert || 5);
        setBarcode(product.barcode || '');
        setStatus(product.status);
        setAddons(product.addons || []);
      } else {
        setName('');
        setCategoryId(categories[0]?.id || '');
        setImage(presetProductImages[0].url);
        setDescription('');
        setCapitalPrice('');
        setSellingPrice('');
        setStock('');
        setMinStockAlert(5);
        setBarcode(`899${Math.floor(100000 + Math.random() * 900000)}`);
        setStatus('Tersedia');
        setAddons([]);
      }
      setErrorMsg('');
    }
  }, [product, categories, isOpen]);

  if (!isOpen) return null;

  const handleAddAddon = (presetName = '', presetPrice = 0) => {
    setAddons((prev) => [
      ...prev,
      { id: `addon-${Date.now()}-${Math.floor(Math.random() * 1000)}`, name: presetName, price: presetPrice }
    ]);
  };

  const handleUpdateAddon = (id: string, field: 'name' | 'price', value: string | number) => {
    setAddons((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const handleRemoveAddon = (id: string) => {
    setAddons((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Nama produk wajib diisi.');
      return;
    }
    if (!categoryId) {
      setErrorMsg('Pilih kategori produk.');
      return;
    }
    if (sellingPrice === '' || Number(sellingPrice) <= 0) {
      setErrorMsg('Harga jual harus lebih dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSubmit({
        name,
        categoryId,
        image: image || presetProductImages[0].url,
        description,
        capitalPrice: Number(capitalPrice) || 0,
        sellingPrice: Number(sellingPrice) || 0,
        stock: Number(stock) || 0,
        minStockAlert: Number(minStockAlert) || 5,
        status: Number(stock) > 0 ? status : 'Habis',
        barcode: barcode || `899${Math.floor(100000 + Math.random() * 900000)}`,
        addons: addons.filter((a) => a.name.trim().length > 0)
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan produk.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimatedProfit = (Number(sellingPrice) || 0) - (Number(capitalPrice) || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 my-8 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            {product ? 'Edit Produk / Menu' : 'Tambah Produk / Menu Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Produk *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Nasi Goreng Spesial"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kategori *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Image URL & Preset / File Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
              Foto Produk (URL Gambar / Upload File)
            </label>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Image Preview Thumbnail */}
              <div className="relative w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center">
                {image ? (
                  <img
                    key={image}
                    src={image}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = presetProductImages[0].url;
                    }}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-400" />
                )}
              </div>

              {/* Text / URL Input */}
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="Tempel link URL gambar (https://...) atau upload file"
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />

              {/* File Upload Button */}
              <label className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-all border border-slate-200 dark:border-slate-700">
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Upload Foto</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 3 * 1024 * 1024) {
                      setErrorMsg('Ukuran file foto maksimal 3MB.');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        setImage(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
            </div>

            {/* Quick Image Presets */}
            <div className="mt-2.5">
              <span className="text-[11px] font-semibold text-slate-400 block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" /> Pilih Gambar Galeri Preset:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {presetProductImages.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all ${
                      image === preset.url ? 'border-emerald-500 ring-2 ring-emerald-500/30 scale-105' : 'border-slate-200 dark:border-slate-700 opacity-70 hover:opacity-100'
                    }`}
                    title={preset.label}
                  >
                    <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Prices & Profit Calculation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Modal (HPP - Rp)
              </label>
              <input
                type="number"
                value={capitalPrice}
                onChange={(e) => setCapitalPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="15000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Harga Jual (Rp) *
              </label>
              <input
                type="number"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="28000"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>

            <div className="md:col-span-2 flex items-center justify-between text-xs font-bold pt-2 border-t border-slate-200/80 dark:border-slate-700">
              <span className="text-slate-500">Estimasi Keuntungan / Profit per item:</span>
              <span className={estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold text-sm' : 'text-rose-600 font-extrabold text-sm'}>
                {formatRupiah(estimatedProfit)}
              </span>
            </div>
          </div>

          {/* Stock & Alert */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Jumlah Stok
              </label>
              <input
                type="number"
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="50"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Batas Minimum Stok (Alert)
              </label>
              <input
                type="number"
                value={minStockAlert}
                onChange={(e) => setMinStockAlert(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="5"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status Produk
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'Tersedia' | 'Habis')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Tersedia">Tersedia</option>
                <option value="Habis">Habis</option>
              </select>
            </div>
          </div>

          {/* Opsi / Add-on Tambahan Section */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Opsi / Add-on Tambahan (Topping, Ukuran, Rasa)
                </h4>
              </div>

              <button
                type="button"
                onClick={() => handleAddAddon()}
                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Add-on</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
              <span className="text-slate-400 font-medium">Preset Cepat:</span>
              {[
                { name: 'Extra Keju', price: 5000 },
                { name: 'Telur Ceplok', price: 4000 },
                { name: 'Topping Boba', price: 5000 },
                { name: 'Extra Shot Espresso', price: 8000 },
                { name: 'Pedas / Level 1-5', price: 0 },
                { name: 'Less Sugar / Ice', price: 0 }
              ].map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddAddon(preset.name, preset.price)}
                  className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 text-slate-700 dark:text-slate-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[10px] font-medium"
                >
                  + {preset.name} {preset.price > 0 ? `(${formatRupiah(preset.price)})` : ''}
                </button>
              ))}
            </div>

            {/* List of Add-ons */}
            {addons.length === 0 ? (
              <p className="text-[11px] text-slate-400 italic">
                Belum ada opsi add-on untuk produk ini. Klik tombol di atas jika produk ini memiliki topping/tambahan.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {addons.map((addon) => (
                  <div key={addon.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={addon.name}
                      onChange={(e) => handleUpdateAddon(addon.id, 'name', e.target.value)}
                      placeholder="Nama Add-on (misal: Extra Keju, Level 3)"
                      className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-amber-500"
                    />

                    <div className="w-32 relative">
                      <span className="absolute left-2.5 top-1.5 text-[11px] text-slate-400 font-bold">Rp</span>
                      <input
                        type="number"
                        value={addon.price || ''}
                        onChange={(e) => handleUpdateAddon(addon.id, 'price', e.target.value === '' ? 0 : Number(e.target.value))}
                        placeholder="Harga"
                        className="w-full pl-8 pr-2 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveAddon(addon.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      title="Hapus Add-on"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Barcode & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kode Barcode / SKU
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="899123456"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Deskripsi Singkat
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Deskripsi bahan/porsi..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
            >
              {isSubmitting ? 'Menyimpan...' : product ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
