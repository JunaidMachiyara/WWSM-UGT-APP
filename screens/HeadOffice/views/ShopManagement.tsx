
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shop } from '../../../types';

const ShopManagement: React.FC = () => {
  const { shops, addShop, currencies, updateShop, deleteShop, switchShop } = useAppContext();
  
  // State for creating a new shop
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [formMessage, setFormMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // State for editing an existing shop
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Shop>>({});
  const [updateMessage, setUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const resetForm = () => {
      setName('');
      setAddress('');
      setDistrict('');
      setCountry('');
      setCurrencyCode('USD');
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if(!name || !address || !district || !country || !currencyCode) {
      setFormMessage({ type: 'error', text: 'Please fill out all required fields.' });
      return;
    };

    try {
        const trimmedName = name.trim();
        const isDuplicate = shops.some(shop => (shop.name || '').toLowerCase() === trimmedName.toLowerCase());
        
        if (isDuplicate) {
            setFormMessage({ type: 'error', text: `A shop named "${trimmedName}" already exists.` });
            return;
        }
        
        await addShop({ 
            name: trimmedName, 
            address, 
            district, 
            country,
            isActive: true, 
            currencyCode,
            shopImageUrls: [],
            surroundingsImageUrls: []
        });
        setFormMessage({ type: 'success', text: `Shop "${trimmedName}" created successfully!` });
        resetForm();
    } catch (error: any) {
        console.error("Error creating shop:", error);
        setFormMessage({ type: 'error', text: `Failed to create shop: ${error.message || 'Unknown error occurred'}.` });
    }
  };

  const handleEditClick = (shop: Shop) => {
    setUpdateMessage(null); 
    setEditingShop(shop);
    setEditFormData({
        name: shop.name,
        address: shop.address,
        district: shop.district,
        country: shop.country,
        currencyCode: shop.currencyCode,
        isActive: shop.isActive,
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const checked = (e.target as HTMLInputElement).checked;
        setEditFormData(prev => ({ ...prev, [name]: checked }));
    } else {
        setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShop) return;
    setUpdateMessage(null);

    try {
        await updateShop(editingShop.id, editFormData);
        setEditingShop(null);
        setUpdateMessage({ type: 'success', text: `Shop "${editFormData.name}" updated successfully!` });
        setTimeout(() => setUpdateMessage(null), 5000);
    } catch (error) {
        setUpdateMessage({ type: 'error', text: 'Failed to update shop. Please try again.' });
        console.error(error);
    }
  };

  const handleDelete = async (shop: Shop) => {
    if (window.confirm(`Are you sure you want to permanently delete "${shop.name}"? This will also delete all its data and cannot be undone.`)) {
        try {
            await deleteShop(shop.id);
        } catch (error) {
            console.error("Failed to delete shop:", error);
            alert("There was an error deleting the shop. Please try again.");
        }
    }
  };

  const handleAccessShop = (shopId: string) => {
      switchShop(shopId);
  };
  
  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit border border-gray-100">
        <h3 className="text-xl font-bold mb-4 text-gray-800 uppercase tracking-tighter italic">Create New Shop</h3>
        {formMessage && (
            <div className={`p-4 mb-4 text-sm rounded-lg ${formMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                {formMessage.text}
            </div>
        )}
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label htmlFor="shopName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Shop Name</label>
            <input type="text" id="shopName" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="country" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Country</label>
            <input type="text" id="country" value={country} onChange={e => setCountry(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="district" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">District</label>
            <input type="text" id="district" value={district} onChange={e => setDistrict(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="shopAddress" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Address</label>
            <input type="text" id="shopAddress" value={address} onChange={e => setAddress(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="shopCurrency" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Currency</label>
            <select id="shopCurrency" value={currencyCode} onChange={e => setCurrencyCode(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
              {currencies.map(currency => (
                <option key={currency.id} value={currency.id}>{currency.id} - {currency.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 px-4 rounded-lg transition-all shadow-md uppercase tracking-widest text-sm">Add Shop</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold mb-4 text-gray-800 uppercase tracking-tighter italic">Retail Network Status ({shops.length})</h3>
        {updateMessage && (
            <div className={`p-4 mb-4 text-sm rounded-lg ${updateMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                {updateMessage.text}
            </div>
        )}
        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Currency</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {shops.map(shop => (
                <tr key={shop.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                     <button onClick={() => handleEditClick(shop)} className="text-primary hover:underline">
                        {shop.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-medium">{shop.district}, {shop.country}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">{shop.currencyCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className={`px-2 py-0.5 inline-flex text-[10px] font-black rounded-full uppercase tracking-tighter ${shop.isActive ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => handleAccessShop(shop.id)}
                                className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                                title="Access Shop Dashboard"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleDelete(shop)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title={`Delete ${shop.name}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                        </div>
                    </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    {editingShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col transform transition-all animate-scale-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                    <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">Update Shop Details</h3>
                    <button onClick={() => setEditingShop(null)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Shop Name</label>
                            <input type="text" name="name" value={editFormData.name || ''} onChange={handleEditFormChange} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary focus:border-primary" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Country</label>
                                <input type="text" name="country" value={editFormData.country || ''} onChange={handleEditFormChange} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary focus:border-primary" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">District</label>
                                <input type="text" name="district" value={editFormData.district || ''} onChange={handleEditFormChange} className="w-full border border-gray-300 rounded-lg p-2 focus:ring-primary focus:border-primary" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Currency Code</label>
                            <select name="currencyCode" value={editFormData.currencyCode || ''} onChange={handleEditFormChange} className="w-full border border-gray-300 rounded-lg p-2 bg-white font-bold">
                                {currencies.map(c => <option key={c.id} value={c.id}>{c.id} - {c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                            <input id="isActiveEdit" name="isActive" type="checkbox" checked={editFormData.isActive || false} onChange={handleEditFormChange} className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded transition-all" />
                            <label htmlFor="isActiveEdit" className="ml-3 text-sm font-black text-gray-700 uppercase tracking-tight">Set Shop as Active</label>
                        </div>
                    </form>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-3 rounded-b-2xl">
                    <button onClick={() => setEditingShop(null)} className="px-6 py-2 bg-white border border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors uppercase text-xs tracking-widest">Cancel</button>
                    <button onClick={handleUpdateSubmit} className="px-6 py-2 bg-primary text-white font-black rounded-lg hover:bg-primary-dark transition-all shadow-md uppercase text-xs tracking-widest">Save Changes</button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default ShopManagement;
