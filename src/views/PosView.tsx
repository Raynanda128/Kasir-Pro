import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard, 
  QrCode, 
  Banknote, 
  Building2, 
  X, 
  CheckCircle2, 
  Tag, 
  RotateCcw,
  Sparkles,
  Barcode,
  Keyboard,
  Info,
  Layers,
  Edit3,
  Check
} from 'lucide-react';
import { CartItem, Category, PaymentMethod, Product, SelectedAddon, StoreSettings, User } from '../types';
import { formatRupiah } from '../lib/utils';
import { useToast } from '../components/Toast';

interface PosViewProps {
  products: Product[];
  categories: Category[];
  settings: StoreSettings;
  currentUser: User;
  onCompleteTransaction: (payload: {
    items: CartItem[];
    paymentMethod: PaymentMethod;
    paidAmount: number;
    discount: number;
    userName: string;
    userId: string;
    branchName: string;
  }) => Promise<any>;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  categories,
  settings,
  currentUser,
  onCompleteTransaction
}) => {
  const { showToast } = useToast();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // States
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('kasirpro_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [discountRate, setDiscountRate] = useState<number>(settings.defaultDiscountRate || 0);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Add-on selection modal states
  const [selectedProductForAddon, setSelectedProductForAddon] = useState<Product | null>(null);
  const [editingCartIndex, setEditingCartIndex] = useState<number | null>(null);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [modalNotes, setModalNotes] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);

  // Save cart to localstorage auto
  useEffect(() => {
    localStorage.setItem('kasirpro_cart', JSON.stringify(cart));
  }, [cart]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 -> Search Focus
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F4 -> Open Payment Modal
      else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowPaymentModal(true);
        } else {
          showToast('Keranjang masih kosong!', 'error');
        }
      }
      // Esc -> Clear Cart or Close Modal
      else if (e.key === 'Escape') {
        if (showPaymentModal) {
          setShowPaymentModal(false);
        } else if (selectedProductForAddon) {
          setSelectedProductForAddon(null);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, showPaymentModal, selectedProductForAddon]);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // Open Add-on Modal when clicking a product
  const handleProductClick = (product: Product, forceModal = false) => {
    if (product.stock <= 0 || product.status === 'Habis') {
      showToast(`Stok ${product.name} telah habis!`, 'error');
      return;
    }

    if (forceModal || (product.addons && product.addons.length > 0)) {
      setSelectedProductForAddon(product);
      setEditingCartIndex(null);
      setSelectedAddons([]);
      setModalNotes('');
      setModalQty(1);
    } else {
      addToCartDirect(product);
    }
  };

  // Add directly to cart when product has no add-ons
  const addToCartDirect = (product: Product) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) => item.product.id === product.id && (!item.selectedAddons || item.selectedAddons.length === 0)
      );
      if (existingIdx >= 0) {
        if (prev[existingIdx].quantity >= product.stock) {
          showToast(`Jumlah melebihi stok yang ada (${product.stock})`, 'error');
          return prev;
        }
        return prev.map((item, idx) =>
          idx === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1, selectedAddons: [], notes: '' }];
    });
  };

  // Edit existing cart item options
  const openEditCartItem = (index: number) => {
    const item = cart[index];
    if (!item) return;
    setSelectedProductForAddon(item.product);
    setEditingCartIndex(index);
    setSelectedAddons(item.selectedAddons || []);
    setModalNotes(item.notes || '');
    setModalQty(item.quantity);
  };

  const toggleAddonInModal = (addon: { id: string; name: string; price: number }) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.id === addon.id);
      if (exists) {
        return prev.filter((a) => a.id !== addon.id);
      }
      return [...prev, addon];
    });
  };

  const handleConfirmAddonModal = () => {
    if (!selectedProductForAddon) return;

    if (modalQty > selectedProductForAddon.stock) {
      showToast(`Jumlah melebihi stok yang ada (${selectedProductForAddon.stock})`, 'error');
      return;
    }

    if (editingCartIndex !== null && editingCartIndex >= 0) {
      setCart((prev) =>
        prev.map((item, idx) =>
          idx === editingCartIndex
            ? {
                ...item,
                selectedAddons,
                notes: modalNotes,
                quantity: modalQty
              }
            : item
        )
      );
      showToast('Opsi item berhasil diperbarui.', 'success');
    } else {
      setCart((prev) => [
        ...prev,
        {
          product: selectedProductForAddon,
          quantity: modalQty,
          selectedAddons,
          notes: modalNotes
        }
      ]);
      showToast(`${selectedProductForAddon.name} masuk ke keranjang!`, 'success');
    }

    setSelectedProductForAddon(null);
    setEditingCartIndex(null);
  };

  const updateQuantityByIndex = (index: number, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item, idx) => {
          if (idx === index) {
            const newQty = item.quantity + delta;
            if (newQty > item.product.stock) {
              showToast(`Maksimal stok tersisa: ${item.product.stock}`, 'error');
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const updateItemNotesByIndex = (index: number, notes: string) => {
    setCart((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, notes } : item))
    );
  };

  const clearCart = () => {
    setCart([]);
    showToast('Keranjang telah dikosongkan.', 'info');
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => {
    const addonsTotal = (item.selectedAddons || []).reduce((acc, a) => acc + (a.price || 0), 0);
    const unitPrice = item.product.sellingPrice + addonsTotal;
    return sum + unitPrice * item.quantity;
  }, 0);
  const discountAmount = Math.round(subtotal * (discountRate / 100));
  const afterDiscount = subtotal - discountAmount;
  const taxAmount = Math.round(afterDiscount * ((settings.taxRate || 0) / 100));
  const grandTotal = afterDiscount + taxAmount;

  const numericPaid = Number(paidAmountInput) || grandTotal;
  const changeAmount = Math.max(0, numericPaid - grandTotal);

  // Fast cash preset click
  const handleCashPreset = (amount: number) => {
    setPaidAmountInput(amount.toString());
  };

  // Submit payment
  const handleCheckout = async () => {
    if (cart.length === 0) return;

    if (paymentMethod === 'Cash' && numericPaid < grandTotal) {
      showToast(`Uang diterima kurang dari total (${formatRupiah(grandTotal)})`, 'error');
      return;
    }

    try {
      setIsProcessing(true);
      await onCompleteTransaction({
        items: cart,
        paymentMethod,
        paidAmount: numericPaid,
        discount: discountRate,
        userName: currentUser.name,
        userId: currentUser.id,
        branchName: currentUser.branch || settings.activeBranch
      });

      // Clear cart
      setCart([]);
      setShowPaymentModal(false);
      setPaidAmountInput('');
      showToast('Transaksi Berhasil!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Transaksi gagal', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100vh-65px)] flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      
      {/* LEFT COLUMN: Menu Categories, Search, Products Grid */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200 dark:border-slate-800 p-4 space-y-3">
        
        {/* Top Controls: Search & Category Chips */}
        <div className="space-y-3 bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
          
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari menu / scan barcode (Tekan F2)..."
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400 px-2 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700">
              <Keyboard className="w-3.5 h-3.5 text-emerald-500" /> F2: Cari
            </span>
          </div>

          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              Semua Menu ({products.length})
            </button>

            {categories.map((cat) => {
              const count = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    selectedCategory === cat.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center">
              <Tag className="w-12 h-12 mb-2 text-slate-300 dark:text-slate-700" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Produk tidak ditemukan</p>
              <p className="text-xs">Coba cari kata kunci lain atau pilih kategori berbeda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((c) => c.product.id === p.id);
                const isOutOfStock = p.stock <= 0 || p.status === 'Habis';

                return (
                  <div
                    key={p.id}
                    onClick={() => !isOutOfStock && handleProductClick(p)}
                    className={`
                      relative flex flex-col bg-white dark:bg-slate-900 rounded-2xl border p-3 cursor-pointer transition-all hover:shadow-md group overflow-hidden
                      ${isOutOfStock ? 'opacity-60 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800' : 'border-slate-200/80 dark:border-slate-800 hover:border-emerald-500 dark:hover:border-emerald-500'}
                      ${inCart ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}
                    `}
                  >
                    {/* Badge Stock Alert & Addon indicator */}
                    <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                      {isOutOfStock ? (
                        <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white font-black text-[10px] uppercase shadow-xs">
                          Habis
                        </span>
                      ) : p.stock <= (p.minStockAlert || 5) ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white font-black text-[10px] shadow-xs">
                          Stok {p.stock}
                        </span>
                      ) : null}

                      {p.addons && p.addons.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-600 text-white font-bold text-[9px] shadow-xs flex items-center gap-1">
                          <Layers className="w-2.5 h-2.5" /> +{p.addons.length} Add-on
                        </span>
                      )}
                    </div>

                    {/* Quantity Badge if in cart */}
                    {inCart && (
                      <div className="absolute top-2 right-2 z-10 bg-emerald-600 text-white font-extrabold text-xs w-6 h-6 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50">
                        {inCart.quantity}
                      </div>
                    )}

                    {/* Image */}
                    <div className="w-full h-28 sm:h-32 rounded-xl overflow-hidden mb-2 bg-slate-100 dark:bg-slate-800">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-medium truncate">{p.categoryName || 'Menu'}</p>
                      </div>

                      <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800/80">
                        <span className="font-extrabold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                          {formatRupiah(p.sellingPrice)}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400">
                          Stok: {p.stock}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Shortcuts bar */}
        <div className="hidden md:flex text-[11px] font-semibold text-slate-400 items-center justify-between px-2 pt-1 border-t border-slate-200 dark:border-slate-800">
          <span>Keyboard: <strong className="text-slate-600 dark:text-slate-300">F2</strong> Cari • <strong className="text-slate-600 dark:text-slate-300">F4</strong> Bayar • <strong className="text-slate-600 dark:text-slate-300">Esc</strong> Batal</span>
          <span>Sistem POS KasirPro Ready</span>
        </div>

      </div>

      {/* RIGHT COLUMN: Shopping Cart Panel */}
      <div className="w-full lg:w-96 bg-white dark:bg-slate-900 flex flex-col border-t lg:border-t-0 border-slate-200 dark:border-slate-800 h-1/2 lg:h-full">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
              Keranjang ({cart.reduce((a, c) => a + c.quantity, 0)})
            </h3>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          )}
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
              <ShoppingCart className="w-12 h-12 mb-2 text-slate-200 dark:text-slate-800" />
              <p className="font-bold text-sm text-slate-600 dark:text-slate-300">Keranjang Masih Kosong</p>
              <p className="text-xs text-slate-400 mt-1">Klik menu di sebelah kiri untuk memasukkan barang belanjaan.</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const addonsTotal = (item.selectedAddons || []).reduce((acc, a) => acc + (a.price || 0), 0);
              const unitPrice = item.product.sellingPrice + addonsTotal;
              const itemTotal = unitPrice * item.quantity;

              return (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2"
                >
                  <div className="flex items-start gap-3">
                    <img
                      src={item.product.image}
                      alt={item.product.name}
                      className="w-10 h-10 rounded-xl object-cover shrink-0 mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                          {item.product.name}
                        </p>
                        {(item.product.addons && item.product.addons.length > 0) && (
                          <button
                            onClick={() => openEditCartItem(idx)}
                            className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hover:underline flex items-center gap-0.5 shrink-0"
                            title="Ubah Add-on & Catatan"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Opsi</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                        {formatRupiah(unitPrice)}
                        {addonsTotal > 0 && (
                          <span className="text-[10px] text-slate-400 font-normal ml-1">
                            (Dasar: {formatRupiah(item.product.sellingPrice)})
                          </span>
                        )}
                      </p>

                      {/* Add-on badges */}
                      {item.selectedAddons && item.selectedAddons.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.selectedAddons.map((addon) => (
                            <span
                              key={addon.id}
                              className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold text-[9px]"
                            >
                              + {addon.name} {addon.price > 0 ? `(${formatRupiah(addon.price)})` : ''}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Item Subtotal */}
                    <div className="text-right shrink-0">
                      <p className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {formatRupiah(itemTotal)}
                      </p>
                    </div>
                  </div>

                  {/* Qty modifier & Notes input */}
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <input
                      type="text"
                      value={item.notes || ''}
                      onChange={(e) => updateItemNotesByIndex(idx, e.target.value)}
                      placeholder="Catatan (misal: pedas, tanpa es)..."
                      className="flex-1 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-800 dark:text-slate-200 outline-none"
                    />

                    <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
                      <button
                        onClick={() => updateQuantityByIndex(idx, -1)}
                        className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="text-xs font-black px-1.5 min-w-[20px] text-center text-slate-900 dark:text-white">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() => updateQuantityByIndex(idx, 1)}
                        className="w-6 h-6 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Calculation & Checkout Footer */}
        {cart.length > 0 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 space-y-3">
            
            {/* Discount selector */}
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-600 dark:text-slate-400">Diskon (%):</span>
              <div className="flex items-center gap-1">
                {[0, 5, 10, 15].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setDiscountRate(rate)}
                    className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                      discountRate === rate ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {rate}%
                  </button>
                ))}
              </div>
            </div>

            {/* Calculations Breakdown */}
            <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{formatRupiah(subtotal)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Diskon ({discountRate}%):</span>
                  <span>-{formatRupiah(discountAmount)}</span>
                </div>
              )}
              {settings.taxRate > 0 && (
                <div className="flex justify-between">
                  <span>Pajak ({settings.taxRate}%):</span>
                  <span>{formatRupiah(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>TOTAL BELANJA:</span>
                <span className="text-emerald-600 dark:text-emerald-400">{formatRupiah(grandTotal)}</span>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={() => setShowPaymentModal(true)}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <CreditCard className="w-5 h-5" />
              <span>Bayar {formatRupiah(grandTotal)} (F4)</span>
            </button>
          </div>
        )}

      </div>

      {/* PAYMENT SYSTEM MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                Sistem Pembayaran KasirPro
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              
              {/* Grand Total Display */}
              <div className="p-4 rounded-2xl bg-emerald-950 text-white text-center">
                <span className="text-xs text-emerald-300 font-semibold uppercase">Total Tagihan Pembayaran</span>
                <h2 className="text-3xl font-black text-white mt-1">{formatRupiah(grandTotal)}</h2>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Metode Pembayaran *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'Cash', label: 'Cash', icon: Banknote },
                    { id: 'QRIS', label: 'QRIS', icon: QrCode },
                    { id: 'Bank Transfer', label: 'Transfer', icon: Building2 },
                    { id: 'Debit Card', label: 'Debit', icon: CreditCard },
                  ].map((method) => {
                    const Icon = method.icon;
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id as PaymentMethod);
                          if (method.id !== 'Cash') setPaidAmountInput(grandTotal.toString());
                        }}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        <span>{method.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cash Input & Quick Presets */}
              {paymentMethod === 'Cash' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Nominal Uang Diterima (Rp)
                  </label>
                  <input
                    type="number"
                    value={paidAmountInput}
                    onChange={(e) => setPaidAmountInput(e.target.value)}
                    placeholder={grandTotal.toString()}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-lg font-black focus:ring-2 focus:ring-emerald-500 outline-none"
                    autoFocus
                  />

                  {/* Fast Cash Presets */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCashPreset(grandTotal)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold"
                    >
                      Uang Pas
                    </button>
                    {[20000, 50000, 100000, 200000].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleCashPreset(preset)}
                        className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-bold"
                      >
                        {formatRupiah(preset)}
                      </button>
                    ))}
                  </div>

                  {/* Change Calculation */}
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex justify-between items-center text-sm font-bold mt-2">
                    <span className="text-slate-600 dark:text-slate-400">Kembalian:</span>
                    <span className={changeAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400 font-extrabold text-base' : 'text-rose-600 font-extrabold'}>
                      {formatRupiah(changeAmount)}
                    </span>
                  </div>
                </div>
              )}

              {/* QRIS Graphic Preview if QRIS */}
              {paymentMethod === 'QRIS' && (
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-3">
                  <div className="w-56 h-56 mx-auto bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden">
                    <img
                      src={settings.qrisImage || "https://res.cloudinary.com/kfh5lahz/image/upload/v1786451768/Screenshot_2026-08-11_192331.png"}
                      alt="QRIS Pembayaran KasirPro"
                      className="w-full h-full object-contain rounded-xl"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Scan QRIS {settings.storeName || 'KasirPro'}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Mendukung GoPay, OVO, ShopeePay, BCA, Mandiri, BRI & QRIS Semua Bank</p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isProcessing ? 'Memproses Transaksi...' : 'Selesaikan Transaksi'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* ADD-ON SELECTION MODAL */}
      {selectedProductForAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden space-y-4">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                  {editingCartIndex !== null ? 'Edit Opsi & Add-on' : 'Pilih Opsi & Add-on'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedProductForAddon(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Product Info Header */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
                <img
                  src={selectedProductForAddon.image}
                  alt={selectedProductForAddon.name}
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white truncate">
                    {selectedProductForAddon.name}
                  </h4>
                  <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Harga Dasar: {formatRupiah(selectedProductForAddon.sellingPrice)}
                  </p>
                  <p className="text-[10px] text-slate-400">Stok Tersedia: {selectedProductForAddon.stock}</p>
                </div>
              </div>

              {/* Add-ons List */}
              {selectedProductForAddon.addons && selectedProductForAddon.addons.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Pilih Add-on / Topping Tambahan:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {selectedProductForAddon.addons.map((addon) => {
                      const isSelected = selectedAddons.some((a) => a.id === addon.id);
                      return (
                        <div
                          key={addon.id}
                          onClick={() => toggleAddonInModal(addon)}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-100 font-bold'
                              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                isSelected ? 'bg-amber-600 border-amber-600 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="text-xs font-semibold">{addon.name}</span>
                          </div>
                          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                            +{formatRupiah(addon.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800 p-3 rounded-xl">
                  Tidak ada add-on khusus untuk produk ini. Anda tetap bisa menambahkan catatan khusus di bawah.
                </p>
              )}

              {/* Notes Input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Catatan Khusus (Opsional)
                </label>
                <input
                  type="text"
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Misal: Tanpa bawang, Es dikit, Level 3..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Quantity Selector */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Jumlah Porsi:</span>
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shadow-xs"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-8 text-center text-xs font-black text-slate-900 dark:text-white">
                    {modalQty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setModalQty((q) => Math.min(selectedProductForAddon.stock, q + 1))}
                    className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Subtotal preview for this item */}
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-200">Subtotal Item Ini:</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                  {formatRupiah(
                    (selectedProductForAddon.sellingPrice +
                      selectedAddons.reduce((acc, a) => acc + a.price, 0)) *
                      modalQty
                  )}
                </span>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedProductForAddon(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAddonModal}
                  className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-xs shadow-md shadow-amber-600/30 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingCartIndex !== null ? 'Simpan Perubahan' : 'Masukkan ke Keranjang'}</span>
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
};
