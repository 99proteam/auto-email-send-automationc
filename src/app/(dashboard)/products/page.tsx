'use client';

import { useState, useEffect, useRef } from 'react';
import { Package, Plus, Trash2, Bot, Upload, X, Edit3, FileText, Link as LinkIcon } from 'lucide-react';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Chat Modal State
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatReply, setChatReply] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [correction, setCorrection] = useState('');
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [correctionSuccess, setCorrectionSuccess] = useState('');

  // Edit Modal State
  const [editProduct, setEditProduct] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const text = await file.text();
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileContent: text })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Successfully analyzed and added ${data.count} products!`);
        fetchProducts();
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    try {
      await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
      fetchProducts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestChat = async () => {
    if (!chatMessage.trim()) return;
    setIsChatting(true);
    setChatReply('');
    try {
      const res = await fetch('/api/products/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, message: chatMessage })
      });
      const data = await res.json();
      if (data.success) {
        setChatReply(data.reply);
      } else {
        setChatReply('Error: ' + data.error);
      }
    } catch (err: any) {
      setChatReply('Error: ' + err.message);
    } finally {
      setIsChatting(false);
    }
  };

  const handleCorrection = async () => {
    if (!correction.trim()) return;
    setIsCorrecting(true);
    setCorrectionSuccess('');
    try {
      const res = await fetch('/api/products/correct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct.id, correction })
      });
      const data = await res.json();
      if (data.success) {
        setCorrectionSuccess('Correction saved permanently! AI has learned this rule.');
        setCorrection('');
        fetchProducts();
      } else {
        setCorrectionSuccess('Error: ' + data.error);
      }
    } catch (err: any) {
      setCorrectionSuccess('Error: ' + err.message);
    } finally {
      setIsCorrecting(false);
    }
  };

  const handleSaveEdit = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editProduct.id,
          name: editProduct.name,
          url: editProduct.url || '',
          description: editProduct.description,
          features: typeof editProduct.features === 'string' ? editProduct.features.split(',').map((f: string) => f.trim()) : editProduct.features,
          pricing_info: editProduct.pricing_info,
          target_audience: editProduct.target_audience,
          customFields: editProduct.customFields || []
        })
      });
      const data = await res.json();
      if (data.success) {
        setEditProduct(null);
        fetchProducts();
      } else {
        alert('Error saving product: ' + data.error);
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    try {
      const text = await file.text();
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editProduct.id, fileContent: text })
      });
      const data = await res.json();
      if (data.success) {
        setEditProduct({ ...editProduct, ...data.updatedData });
        alert('Product knowledge updated successfully from file!');
        fetchProducts();
      } else {
        alert('Update failed: ' + data.error);
      }
    } catch (err: any) {
      alert('Upload error: ' + err.message);
    } finally {
      setIsSaving(false);
      if (editFileInputRef.current) editFileInputRef.current.value = '';
    }
  };

  // Custom fields helpers
  const addCustomField = () => {
    const fields = editProduct.customFields || [];
    setEditProduct({
      ...editProduct,
      customFields: [...fields, { title: '', value: '', link: '' }]
    });
  };

  const updateCustomField = (index: number, key: string, value: string) => {
    const fields = [...(editProduct.customFields || [])];
    fields[index] = { ...fields[index], [key]: value };
    setEditProduct({ ...editProduct, customFields: fields });
  };

  const removeCustomField = (index: number) => {
    const fields = [...(editProduct.customFields || [])];
    fields.splice(index, 1);
    setEditProduct({ ...editProduct, customFields: fields });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="text-gray-400 mt-2">Manage your software products and services.</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            accept=".txt,.md" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors disabled:opacity-50"
          >
            <Upload className="w-5 h-5" />
            {uploading ? 'Analyzing...' : 'Upload TXT Details'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading products...</div>
      ) : products.length === 0 ? (
        <div className="p-12 bg-gray-900 border border-gray-800 rounded-2xl text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">No Products Yet</h3>
          <p className="text-gray-400 mb-6">Upload a TXT file with your product details to let the AI analyze and generate your catalog automatically.</p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
          >
            Upload Product Data
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {products.map(p => (
            <div key={p.id} className="p-6 bg-gray-900 border border-gray-800 rounded-2xl flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
                  <p className="text-gray-400 text-sm line-clamp-2">{p.description}</p>
                  {p.url && (
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-blue-400 text-sm hover:underline mt-1 inline-flex items-center gap-1">
                      <LinkIcon className="w-3 h-3" />{p.url}
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setEditProduct({ ...p, customFields: p.customFields || [] })}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 text-gray-300 hover:bg-gray-700 rounded-lg transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" /> Edit Data
                  </button>
                  <button 
                    onClick={() => { setSelectedProduct(p); setChatMessage(''); setChatReply(''); setCorrection(''); setCorrectionSuccess(''); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 border border-purple-500/20 rounded-lg transition-colors text-sm"
                  >
                    <Bot className="w-4 h-4" /> Test AI Knowledge
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap mt-2">
                {p.features?.map((f: string, i: number) => (
                  <span key={i} className="px-2 py-1 bg-gray-800 text-gray-300 text-xs rounded-md">{f}</span>
                ))}
              </div>
              {/* Show custom fields badges */}
              {p.customFields && p.customFields.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {p.customFields.map((cf: any, i: number) => (
                    <span key={i} className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs rounded-md">
                      {cf.title}: {cf.value || cf.link || 'Set'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      {editProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-blue-400" /> Edit Product: {editProduct.name}
              </h2>
              <button onClick={() => setEditProduct(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="flex justify-between items-center bg-blue-900/10 border border-blue-500/20 p-4 rounded-xl">
                <div>
                  <h4 className="text-sm font-semibold text-white">Append Additional Context</h4>
                  <p className="text-xs text-gray-400 mt-1">Upload a TXT file to automatically extract and append new details to this product.</p>
                </div>
                <input type="file" accept=".txt,.md" className="hidden" ref={editFileInputRef} onChange={handleEditFileUpload} />
                <button onClick={() => editFileInputRef.current?.click()} disabled={isSaving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap">
                  <FileText className="w-4 h-4" /> {isSaving ? 'Appending...' : 'Append TXT Data'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Product Name</label>
                <input type="text" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Product URL</label>
                <input type="url" value={editProduct.url || ''} onChange={e => setEditProduct({...editProduct, url: e.target.value})} placeholder="https://your-product.com" className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 placeholder-gray-600" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Description</label>
                <textarea value={editProduct.description} onChange={e => setEditProduct({...editProduct, description: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-24" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Features (comma separated)</label>
                <textarea value={Array.isArray(editProduct.features) ? editProduct.features.join(', ') : editProduct.features} onChange={e => setEditProduct({...editProduct, features: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500 h-20" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Pricing Info</label>
                <input type="text" value={editProduct.pricing_info} onChange={e => setEditProduct({...editProduct, pricing_info: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Target Audience</label>
                <input type="text" value={editProduct.target_audience} onChange={e => setEditProduct({...editProduct, target_audience: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500" />
              </div>

              {/* Custom Fields Section */}
              <div className="border-t border-gray-800 pt-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Custom Fields</h4>
                    <p className="text-xs text-gray-400 mt-0.5">Add coupon codes, payment links, product links, or any extra info the AI should know.</p>
                  </div>
                  <button
                    onClick={addCustomField}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/20 rounded-lg text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Add Field
                  </button>
                </div>

                {(editProduct.customFields || []).length === 0 ? (
                  <div className="text-center py-6 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                    <p className="text-gray-500 text-sm">No custom fields yet. Click &quot;Add Field&quot; to add coupon codes, links, etc.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(editProduct.customFields || []).map((field: any, index: number) => (
                      <div key={index} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-semibold text-gray-400 uppercase">Field #{index + 1}</span>
                          <button
                            onClick={() => removeCustomField(index)}
                            className="text-red-400 hover:text-red-300 p-1 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Title (e.g. Coupon Code, Payment Link, Demo URL)</label>
                          <input
                            type="text"
                            value={field.title}
                            onChange={e => updateCustomField(index, 'title', e.target.value)}
                            placeholder="e.g. Coupon Code"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Value / Description</label>
                          <input
                            type="text"
                            value={field.value}
                            onChange={e => updateCustomField(index, 'value', e.target.value)}
                            placeholder="e.g. WELCOME10 for 10% off"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Link (optional)</label>
                          <input
                            type="url"
                            value={field.link}
                            onChange={e => updateCustomField(index, 'link', e.target.value)}
                            placeholder="https://..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-gray-600"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
              <button onClick={() => setEditProduct(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
              <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl disabled:opacity-50">
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat / Correction Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800/50">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" /> Test AI on {selectedProduct.name}
              </h2>
              <button onClick={() => setSelectedProduct(null)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Ask a customer question:</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="e.g. Does this work with Shopify?"
                    className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    onClick={handleTestChat}
                    disabled={isChatting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50"
                  >
                    {isChatting ? 'Thinking...' : 'Ask AI'}
                  </button>
                </div>
              </div>

              {chatReply && (
                <div className="p-4 bg-gray-800 rounded-xl border border-gray-700">
                  <p className="text-sm font-semibold text-purple-400 mb-1">AI Reply:</p>
                  <p className="text-gray-300 text-sm whitespace-pre-wrap">{chatReply}</p>
                </div>
              )}

              {chatReply && (
                <div className="pt-4 border-t border-gray-800">
                  <label className="block text-sm font-medium text-red-400 mb-2">Did it answer wrong? Correct the AI:</label>
                  <textarea 
                    value={correction}
                    onChange={(e) => setCorrection(e.target.value)}
                    placeholder="e.g. Actually, tell them we don't support Shopify yet but we offer a 10% discount to join the waitlist."
                    className="w-full bg-red-950/20 border border-red-900/50 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-red-500 h-24 resize-none mb-2"
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-emerald-400">{correctionSuccess}</span>
                    <button 
                      onClick={handleCorrection}
                      disabled={isCorrecting || !correction.trim()}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {isCorrecting ? 'Saving...' : 'Save Rule Permanently'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
