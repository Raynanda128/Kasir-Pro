import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Tag, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  LayoutGrid,
  List,
  Sparkles
} from 'lucide-react';
import { Category, Product, User } from '../types';
import { formatRupiah } from '../lib/utils';
import { useToast } from '../components/Toast';

interface ProductsViewProps {
  products: Product[];
  categories: Category[];
  currentUser: User;
  onOpenAddModal: () => void;
  onOpenEditModal: (product: Product) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onOpenStockModal: (product: Product) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  categories,
  currentUser,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteProduct,
  onOpenStockModal
}) => {
  const { showToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  const handleDelete = async (id: string) => {
    try {
      setIsDeleting(true);
      await onDeleteProduct(id);
      showToast('Produk berhasil dihapus', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus produk', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-6 h-6 text-emerald-500" />
            Manajemen Produk & Menu Toko
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Kelola katalog barang, harga jual, HPP modal, dan stok produk</p>
        </div>

        <button
          onClick={onOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Produk Baru</span>
        </button>
      </div>

      {/* Filter & View Switcher Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk, kategori, barcode..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Category Dropdown & View Mode Buttons */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-semibold outline-none"
          >
            <option value="all">Semua Kategori ({products.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-400'}`}
              title="Tampilan Grid Card"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-xs' : 'text-slate-400'}`}
              title="Tampilan Tabel Detail"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Mode */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const isLowStock = p.stock <= (p.minStockAlert || 5);
            return (
              <div
                key={p.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs flex flex-col justify-between group transition-all hover:shadow-md"
              >
                <div>
                  {/* Image & Status Badge */}
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    
                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] shadow-xs ${
                        p.status === 'Tersedia' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                      }`}>
                        {p.status}
                      </span>
                      {isLowStock && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-bold text-[10px] shadow-xs">
                          Stok Menipis
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                      {p.barcode}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400 font-medium">{p.categoryName || 'Menu'}</p>
                    {p.addons && p.addons.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-extrabold text-[10px]">
                        +{p.addons.length} Add-on
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{p.description}</p>
                </div>

                {/* Pricing & Stock Footer */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-semibold">Harga Jual</span>
                      <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">{formatRupiah(p.sellingPrice)}</span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-semibold">Modal (HPP)</span>
                      <span className="font-bold text-slate-600 dark:text-slate-400">{formatRupiah(p.capitalPrice)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <button
                      onClick={() => onOpenStockModal(p)}
                      className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                    >
                      <span>Stok: <strong>{p.stock}</strong> unit</span>
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onOpenEditModal(p)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Edit Produk"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(p.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        /* Table Mode */
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 font-bold text-slate-500 uppercase">
                  <th className="p-3.5">Produk</th>
                  <th className="p-3.5">Kategori</th>
                  <th className="p-3.5">Modal (HPP)</th>
                  <th className="p-3.5">Harga Jual</th>
                  <th className="p-3.5">Keuntungan</th>
                  <th className="p-3.5">Stok</th>
                  <th className="p-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3.5">
                      <div className="flex items-center gap-3">
                        <img src={p.image} alt={p.name} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] font-mono text-slate-400">{p.barcode}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-300">{p.categoryName || 'Menu'}</td>
                    <td className="p-3.5 text-slate-600 dark:text-slate-400">{formatRupiah(p.capitalPrice)}</td>
                    <td className="p-3.5 font-bold text-emerald-600 dark:text-emerald-400">{formatRupiah(p.sellingPrice)}</td>
                    <td className="p-3.5 font-bold text-teal-600">{formatRupiah(p.sellingPrice - p.capitalPrice)}</td>
                    <td className="p-3.5">
                      <button onClick={() => onOpenStockModal(p)} className="font-bold hover:underline">
                        {p.stock} unit
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onOpenEditModal(p)} className="p-1.5 text-slate-400 hover:text-emerald-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteConfirmId(p.id)} className="p-1.5 text-slate-400 hover:text-rose-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Konfirmasi Hapus Produk</h3>
            <p className="text-xs text-slate-500">Apakah Anda yakin ingin menghapus produk ini dari katalog KasirPro?</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs shadow-md shadow-rose-600/30"
              >
                {isDeleting ? 'Hapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
