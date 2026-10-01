import React, { useState, useEffect, useCallback } from 'react';
import { productAPI } from '@/lib/api/roles';
import { filterActivatableProductFees } from '@/lib/utils/feeBreakdown';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { DsaTableSkeleton } from '@/components/admin/dsa/DsaStatSkeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Card, CardContent } from "@/components/ui/card"
import {
  Package,
  Save,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Star,
  Check,
  Edit2,
  Trash2,
  Eye
} from 'lucide-react';

// Modular Components
import ProductParameters from '@/components/admin/products/ProductParameters.jsx';
import FeeStructure from '@/components/admin/products/FeeStructure.jsx';

const AdminLoanProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [togglingId, setTogglingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Sheet State
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // --- Data Layer ---

  const fetchProducts = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true);
    setError('');
    try {
      const res = await productAPI.getProducts({ all: true, slim: true });
      if (res.status === 1) {
        setProducts(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleCreateNew = () => {
    const newProduct = {
      id: "NEW", // temporary identifier
      product_code: `PRD-${Math.floor(Date.now() / 1000)}`,
      product_name: 'New Custom Package',
      description: 'A new loan package with customized terms.',
      min_amount: 5000,
      max_amount: 30000,
      min_tenure_days: 15,
      max_tenure_days: 30,
      min_interest_rate_daily: 0.5,
      max_interest_rate_daily: 2.0,
      default_interest_rate_daily: 1.0,
      repayment_type: 'one_time',
      disbursement_mode: 'imps_upi',
      auto_debit_type: 'upi_autopay',
      is_active: 0,
      fees: [
        { fee_code: 'process_fee', fee_name: 'Platform Fee', fee_type: 'percentage', min_value: 0, max_value: 100, default_value: 10, is_mandatory: 1, is_deducted_upfront: 1 },
      ]
    };
    setEditingProduct(newProduct);
    setIsSheetOpen(true);
  };

  const handleEdit = async (product) => {
    setIsSheetOpen(true);
    setEditingProduct({ ...product, fees: [] });
    try {
      const res = await productAPI.getProduct(product.id);
      if (res.status === 1 && res.data) {
        setEditingProduct({
          ...res.data,
          fees: filterActivatableProductFees(res.data.fees),
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
      setIsSheetOpen(false);
    }
  };

  const closeSheet = () => {
    setIsSheetOpen(false);
    setTimeout(() => setEditingProduct(null), 300); // clear after animation
  };

  const handleSaveProduct = useCallback(async () => {
    if (!editingProduct) return;
    setSaving(true);
    setError('');
    setMessage('');
    const payload = {
      ...editingProduct,
      fees: filterActivatableProductFees(editingProduct.fees),
    };
    try {
      let res;
      if (editingProduct.id === "NEW") {
        res = await productAPI.createProduct(payload);
        if (res.status === 1) {
            setMessage('New Loan Product Created Successfully!');
            closeSheet();
        }
      } else {
        res = await productAPI.updateProduct(editingProduct.id, payload);
        if (res.status === 1) {
            setMessage('Product terms updated globally.');
            closeSheet();
        }
      }
      setTimeout(() => setMessage(''), 5000);
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setSaving(false);
    }
  }, [editingProduct, fetchProducts]);

  const handleActivate = useCallback(async () => {
    if (!editingProduct || editingProduct.id === "NEW") return;
    setActivating(true);
    setError('');
    setMessage('');
    try {
        const res = await productAPI.activateProduct(editingProduct.id);
        if (res.status === 1) {
            setMessage(`"${editingProduct.product_name}" is now active (offerable).`);
            closeSheet();
            fetchProducts();
        }
    } catch (err) {
        setError(err.response?.data?.message || err.message);
    } finally {
        setActivating(false);
    }
  }, [editingProduct, fetchProducts]);

  const handleToggleStatus = async (product) => {
    setTogglingId(product.id);
    setError('');
    setMessage('');
    const nextActive = product.is_active === 1 ? 0 : 1;
    try {
        const res = product.is_active === 1
          ? await productAPI.deactivateProduct(product.id)
          : await productAPI.activateProduct(product.id);
        if (res.status === 1) {
            setProducts((prev) =>
              prev.map((p) =>
                p.id === product.id
                  ? { ...p, is_active: res.data?.is_active ?? nextActive }
                  : p
              )
            );
            setMessage(
              product.is_active === 1
                ? `"${product.product_name}" deactivated.`
                : `"${product.product_name}" is now active. Multiple products can be active.`
            );
            fetchProducts({ silent: true });
        }
    } catch (err) {
        setError(err.response?.data?.message || err.message);
    } finally {
        setTogglingId(null);
    }
  };

  const handleSetDefault = async (product) => {
    setActivating(true);
    setError('');
    setMessage('');
    try {
      const res = await productAPI.setDefaultProduct(product.id);
      if (res.status === 1) {
        setMessage(`"${product.product_name}" is now the default for new applications.`);
        fetchProducts();
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setActivating(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    if (product.is_active === 1) {
        setError('Cannot delete an active product. Deactivate it first.');
        return;
    }
    
    if (!window.confirm(`Are you sure you want to delete "${product.product_name}"? This action cannot be undone.`)) {
        return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
        const res = await productAPI.deleteProduct(product.id);
        if (res.status === 1) {
            setMessage(`"${product.product_name}" deleted permanently.`);
            fetchProducts();
        }
    } catch (err) {
        setError(err.response?.data?.message || err.message);
    } finally {
        setLoading(false);
    }
  };

  // --- Logic Layer ---

  const updateProductField = useCallback((field, value) => {
    setEditingProduct((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const updateFee = useCallback((feeCode, field, value) => {
    setEditingProduct((prev) => ({
      ...prev,
      fees: prev.fees.map((fee) =>
        fee.fee_code === feeCode ? { ...fee, [field]: parseFloat(value) || 0 } : fee
      ),
    }));
  }, []);

  // --- Render Layer ---

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-300">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-300 pb-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight flex items-center gap-2.5">
             <Package className="w-5 h-5 text-slate-900" />
             Loan Products
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Control loan packages, interest rates, and fee structures.</p>
        </div>
        <Button onClick={handleCreateNew} className="h-9 px-4 rounded-md bg-slate-900 text-white hover:bg-slate-800 gap-2 text-xs">
           <PlusCircle className="w-4 h-4" /> Add New Package
        </Button>
      </div>

      {/* Persistence Feedback */}
      {(error || message) && (
        <div className="grid grid-cols-1 gap-2 animate-in slide-in-from-top-2">
          {error && (
            <Alert variant="destructive" className="rounded-md border-red-200 bg-red-50 text-red-900 p-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">{error}</AlertDescription>
            </Alert>
          )}
          {message && (
            <Alert className="rounded-md border-emerald-200 bg-emerald-50 text-emerald-900 p-3">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription className="text-sm font-medium">{message}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Main Table Content */}
      {loading && products.length === 0 ? (
        <DsaTableSkeleton rows={6} cols={5} />
      ) : (
      <div className="rounded-md border border-zinc-800 bg-white overflow-hidden">
        <div className="[&_[data-slot=table-container]]:border-0">
        <Table>
          <TableHeader className="bg-white border-b border-zinc-800">
            <TableRow>
              <TableHead className="py-2.5 pl-4 font-semibold text-slate-700 uppercase tracking-wide text-[10px]">Package Name</TableHead>
              <TableHead className="py-2.5 font-semibold text-slate-700 uppercase tracking-wide text-[10px]">Internal Code</TableHead>
              <TableHead className="py-2.5 font-semibold text-slate-700 uppercase tracking-wide text-[10px] text-center">Amount Limits</TableHead>
              <TableHead className="py-2.5 font-semibold text-slate-700 uppercase tracking-wide text-[10px] text-center">Duration</TableHead>
              <TableHead className="py-2.5 font-semibold text-slate-700 uppercase tracking-wide text-[10px] text-center">Daily Rate</TableHead>
              <TableHead className="py-2.5 pr-4 text-right font-semibold text-slate-700 uppercase tracking-wide text-[10px]">Product Control</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
                <TableRow>
                    <TableCell colSpan="6" className="py-10 text-center">
                        <div className="flex flex-col items-center gap-2">
                            <Package className="w-8 h-8 text-slate-200" />
                            <p className="text-slate-500 text-sm font-medium">No loan packages found.</p>
                        </div>
                    </TableCell>
                </TableRow>
            ) : products.map((p) => (
              <TableRow key={p.id} className="hover:bg-slate-50 transition-colors border-b border-slate-200 last:border-0">
                <TableCell className="py-2.5 pl-4">
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-slate-900">{p.product_name}</span>
                    <span className={`text-[10px] font-medium uppercase tracking-wide ${p.is_active === 1 ? 'text-emerald-600' : 'text-slate-400'}`}>
                      {p.is_active === 1 ? '● Active' : '○ Inactive'}
                      {p.is_default === 1 ? ' · Default for new apps' : ''}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="py-2.5 text-slate-500 font-mono text-xs">{p.product_code}</TableCell>
                <TableCell className="py-2.5 text-slate-800 text-sm font-medium text-center">₹{Number(p.min_amount).toLocaleString()} — ₹{Number(p.max_amount).toLocaleString()}</TableCell>
                <TableCell className="py-2.5 text-slate-800 text-sm font-medium text-center">{p.min_tenure_days} to {p.max_tenure_days} Days</TableCell>
                <TableCell className="py-2.5 text-emerald-700 font-semibold text-center text-sm">{p.default_interest_rate_daily}%</TableCell>
                <TableCell className="py-2.5 pr-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                        onClick={() => togglingId !== p.id && handleToggleStatus(p)}
                        disabled={togglingId === p.id}
                        title={p.is_active === 1 ? "Deactivate product" : "Activate product"}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${p.is_active === 1 ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                        <span className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${p.is_active === 1 ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>

                    {p.is_active === 1 && p.is_default !== 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(p)}
                        disabled={activating}
                        title="Use as default for new applications"
                        className="h-8 px-2 rounded-md text-[10px] font-medium border-amber-300 text-amber-800 hover:bg-amber-50"
                      >
                        <Star className="w-3 h-3 mr-1" /> Default
                      </Button>
                    )}

                    <Button variant="outline" size="sm" onClick={() => handleEdit(p)} className="h-8 w-8 p-0 rounded-md border-slate-300 text-slate-500 hover:text-slate-900">
                       <Eye className="w-3.5 h-3.5" />
                    </Button>

                    <Button variant="outline" size="sm" onClick={() => handleEdit(p)} className="h-8 px-3 rounded-md text-xs font-medium border-slate-300 text-slate-700 hover:text-white hover:bg-slate-900 hover:border-slate-900 flex items-center gap-1.5">
                       <Edit2 className="w-3.5 h-3.5" /> Edit
                    </Button>

                    {p.is_active !== 1 && (
                      <Button variant="outline" size="sm" onClick={() => handleDeleteProduct(p)} className="h-8 w-8 p-0 rounded-md border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>
      )}

      {/* Configuration Sheet / Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0 border-l border-slate-300">
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-slate-300 p-4">
            <SheetHeader className="space-y-1">
              <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-slate-900 rounded-md">
                     <Package className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <SheetTitle className="text-lg font-semibold text-slate-900 tracking-tight">
                        {editingProduct?.id === "NEW" ? 'Setup New Product' : 'Product Configuration'}
                    </SheetTitle>
                    <SheetDescription className="text-slate-500 text-sm">
                        Define parameters and fee structures.
                    </SheetDescription>
                  </div>
              </div>
            </SheetHeader>
          </div>

          {editingProduct && (
              <div className="p-4 space-y-6 animate-in slide-in-from-right-4 duration-300">
                 
                 {/* Internal Profile Section */}
                 <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-slate-900 rounded-md" />
                        <h3 className="text-sm font-semibold text-slate-800">Package Identity</h3>
                    </div>
                    <Card className="border-slate-300 shadow-none rounded-md">
                        <CardContent className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">Display Name</Label>
                                    <Input 
                                        className="h-9 rounded-md border-slate-300 focus:border-slate-900 font-medium text-slate-900"
                                        placeholder="e.g. Salary Advance Plus"
                                        value={editingProduct.product_name}
                                        onChange={(e) => {
                                            const name = e.target.value;
                                            updateProductField('product_name', name);
                                            // Auto-generate Code only for NEW products
                                            if (editingProduct.id === "NEW") {
                                                const slug = name
                                                    .toUpperCase()
                                                    .replace(/\s+/g, '_')           // Spaces to underscores
                                                    .replace(/[^A-Z0-9_]/g, '')     // Remove special chars
                                                    .substring(0, 15);              // Keep it reasonably short
                                                updateProductField('product_code', slug);
                                            }
                                        }}
                                    />
                                    <p className="text-[11px] text-slate-400">Visible to customers in the app.</p>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium text-slate-700">Package Code</Label>
                                    <Input 
                                        disabled={editingProduct.id !== "NEW"}
                                        className="h-9 rounded-md border-slate-300 bg-white font-mono text-sm tracking-widest text-slate-600 disabled:bg-slate-50"
                                        value={editingProduct.product_code}
                                        onChange={(e) => updateProductField('product_code', e.target.value)}
                                    />
                                    <p className="text-[11px] text-slate-400">Unique identifier for database tracking.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                 </div>

                 {/* Configuration Modules */}
                 <ProductParameters 
                    product={editingProduct} 
                    onUpdateField={updateProductField} 
                 />
                 
                 <FeeStructure 
                    product={editingProduct} 
                    onUpdateFee={updateFee} 
                 />

                 {/* Sticky Footer for Actions */}
                 <div className="flex items-center gap-2 pt-4 border-t border-slate-300 pb-4">
                    <Button 
                        onClick={handleSaveProduct} 
                        disabled={saving} 
                        className="flex-1 h-9 bg-slate-900 text-white hover:bg-slate-800 font-medium rounded-md gap-2"
                    >
                        {saving ? <Spinner className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
                        {editingProduct.id === "NEW" ? 'Create & Launch' : 'Apply Changes Globally'}
                    </Button>
                    
                    {editingProduct.id !== "NEW" && editingProduct.is_active !== 1 && (
                        <Button 
                            onClick={handleActivate} 
                            disabled={activating} 
                            variant="outline"
                            className="h-9 border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium rounded-md px-4 gap-2"
                        >
                            {activating ? <Spinner className="w-4 h-4 text-emerald-700" /> : <Star className="w-4 h-4" />}
                            Make This Live
                        </Button>
                    )}
                 </div>
              </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default AdminLoanProducts;
