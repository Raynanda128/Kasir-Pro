import React, { useState, useEffect, useRef } from 'react';
import { X, Boxes, PlusCircle, MinusCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { Product } from '../types';

interface StockModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    productId: string;
    type: 'in' | 'out' | 'adjustment';
    quantity: number;
    description: string;
  }) => Promise<void>;
}

export const StockModal: React.FC<StockModalProps> = ({
  product,
  isOpen,
  onClose,
  onSubmit
}) => {
  const [type, setType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [description, setDescription] = useState('Restok pasokan harian');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const prevOpenRef = useRef(false);
  const prevProductIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product) {
      prevOpenRef.current = false;
      prevProductIdRef.current = null;
      return;
    }

    const isNewlyOpened = !prevOpenRef.current;
    const isDifferentProduct = product.id !== prevProductIdRef.current;

    if (isNewlyOpened || isDifferentProduct) {
      prevOpenRef.current = true;
      prevProductIdRef.current = product.id;
      setType('in');
      setQuantity(10);
      setDescription('Restok pasokan harian');
      setErrorMsg('');
    }
  }, [isOpen, product]);

  if (!isOpen || !product) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || Number(quantity) <= 0) {
      setErrorMsg('Jumlah stok harus lebih dari 0.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSubmit({
        productId: product.id,
        type,
        quantity: Number(quantity),
        description: description || 'Penyesuaian stok'
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal mengubah stok.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-slate-900 dark:text-white">Kelola Stok Inventory</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Product Summary */}
          <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60">
            <img 
              src={product.image} 
              alt={product.name} 
              className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
            />
            <div>
              <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{product.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Stok saat ini: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{product.stock}</strong> unit
              </p>
            </div>
          </div>

          {/* Adjustment Type selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Jenis Aksi Stok
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => { setType('in'); setDescription('Restok pasokan harian'); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'in'
                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <PlusCircle className="w-5 h-5 text-emerald-500" />
                <span>Tambah (+Stok)</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('out'); setDescription('Pengurangan bahan / barang expired'); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'out'
                    ? 'bg-rose-500/10 border-rose-500 text-rose-600 dark:text-rose-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <MinusCircle className="w-5 h-5 text-rose-500" />
                <span>Kurangi (-Stok)</span>
              </button>

              <button
                type="button"
                onClick={() => { setType('adjustment'); setDescription('Audit Opname stok fisik'); }}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                  type === 'adjustment'
                    ? 'bg-blue-500/10 border-blue-500 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                <RefreshCw className="w-5 h-5 text-blue-500" />
                <span>Setel Ulang</span>
              </button>
            </div>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {type === 'adjustment' ? 'Jumlah Stok Baru Fix' : 'Jumlah Perubahan'}
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="10"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Keterangan / Alasan
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Contoh: Restok dari suplier..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          {/* Buttons */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 transition-all"
            >
              {isSubmitting ? 'Memproses...' : 'Update Stok'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
