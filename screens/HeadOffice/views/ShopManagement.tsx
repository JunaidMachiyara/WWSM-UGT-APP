
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shop } from '../../../types';

const ShopManagement: React.FC = () => {
  const { shops, addShop, currencies, updateShop, deleteShop, resetSystem, clearTransactions, switchShop } = useAppContext();
  
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

  // Loading state for Danger Zone actions
  const [isResetting, setIsResetting] = useState(false);


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
        // Fix: Safely access shop.name and default to empty string if undefined to avoid "toLowerCase of undefined" error
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
        });
        setFormMessage({ type: 'success', text: `Shop "${trimmedName}" created successfully!` });
        resetForm();
    } catch (error: any) {
        console.error("Error creating shop:", error);
        setFormMessage({ type: 'error', text: `Failed to create shop: ${error.message || 'Unknown error occurred'}.` });
    }
  };

  const handleEditClick = (shop: Shop) => {
    setUpdateMessage(null); // Clear previous update messages
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

  const handleSystemReset = async () => {
      if (isResetting) return;
      
      if (window.confirm("DANGER: This will delete ALL data (shops, users, products, transactions, etc.). This action cannot be undone. Are you sure you want to wipe the system?")) {
          if (window.confirm("Please confirm again: DELETE ALL DATA?")) {
              setIsResetting(true);
              try {
                  await resetSystem();
              } catch (e) {
                  console.error(e);
                  alert('Reset failed. Check console.');
                  setIsResetting(false);
              }
          }
      }
  }

  const handleClearTransactions = async () => {
      console.log('Clear Transactions clicked');
      if (isResetting) return;

      if (window.confirm("WARNING: This will delete ALL Transactions, Shipments, and Alerts. Shops, Products, Users, Customers, and Accounts will be KEPT. Are you sure you want to delete operational history?")) {
          setIsResetting(true);
          try {
              console.log('Calling clearTransactions from context...');
              await clearTransactions();
              console.log('clearTransactions completed');
          } catch (e: any) {
              console.error("Clear transactions failed in UI:", e);
              alert(`Failed to clear transactions: ${e.message}`);
              setIsResetting(false);
          }
      }
  }
  
  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Shop</h3>
        {formMessage && (
            <div className={`p-4 mb-4 text-sm rounded-lg ${formMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                {formMessage.text}
            </div>
        )}
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div>
            <label htmlFor="shopName" className="block text-sm font-medium text-gray-700">Shop Name</label>
            <input type="text" id="shopName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700">Country</label>
            <input type="text" id="country" value={country} onChange={e => setCountry(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="district" className="block text-sm font-medium text-gray-700">District</label>
            <input type="text" id="district" value={district} onChange={e => setDistrict(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="shopAddress" className="block text-sm font-medium text-gray-700">Full Address</label>
            <input type="text" id="shopAddress" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="shopCurrency" className="block text-sm font-medium text-gray-700">Currency</label>
            <select id="shopCurrency" value={currencyCode} onChange={e => setCurrencyCode(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
              {currencies.map(currency => (
                <option key={currency.id} value={currency.id}>{currency.id} - {currency.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Shop</button>
        </form>
        
        <div className="mt-10 pt-6 border-t border-gray-200 space-y-4">
            <h4 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h4>
            <p className="text-xs text-gray-500 mb-2">System Administration Tasks</p>
            
            <button 
                type="button"
                onClick={handleClearTransactions} 
                disabled={isResetting}
                className={`w-full text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center ${isResetting ? 'bg-orange-300 cursor-wait' : 'bg-orange-500 hover:bg-orange-600'}`}
            >
                {isResetting ? (
                    <span>Processing...</span>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear Transactions Only
                    </>
                )}
            </button>

            <button 
                type="button"
                onClick={handleSystemReset} 
                disabled={isResetting}
                className={`w-full text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center ${isResetting ? 'bg-red-400 cursor-wait' : 'bg-red-600 hover:bg-red-700'}`}
            >
                {isResetting ? (
                    <span>Processing...</span>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        Reset Entire Database
                    </>
                )}
            </button>
        </div>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Shops</h3>
        {updateMessage && (
            <div className={`p-4 mb-4 text-sm rounded-lg ${updateMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                {updateMessage.text}
            </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Country</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {shops.map(shop => (
                <tr key={shop.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                     <button onClick={() => handleEditClick(shop)} className="text-primary hover:text-primary-dark font-medium underline">
                        {shop.name}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shop.country}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shop.currencyCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-3">
                            <button 
                                onClick={() => handleAccessShop(shop.id)}
                                className="text-blue-600 hover:text-blue-900 flex items-center"
                                title="Access Shop Dashboard"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleDelete(shop)}
                                className="text-red-600 hover:text-red-900"
                                aria-label={`Delete ${shop.name}`}
                            >
                                Delete
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Edit Shop: {editingShop.name}</h3>
                        <button onClick={() => setEditingShop(null)} className="text-gray-400 hover:text-gray-600 font-bold text-2xl">&times;</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    
                    <form className="space-y-4">
                        <div>
                            <label htmlFor="editShopName" className="block text-sm font-medium text-gray-700">Shop Name</label>
                            <input type="text" id="editShopName" name="name" value={editFormData.name || ''} onChange={handleEditFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                        </div>
                        <div>
                            <label htmlFor="editCountry" className="block text-sm font-medium text-gray-700">Country</label>
                            <input type="text" id="editCountry" name="country" value={editFormData.country || ''} onChange={handleEditFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                        </div>
                        <div>
                            <label htmlFor="editDistrict" className="block text-sm font-medium text-gray-700">District</label>
                            <input type="text" id="editDistrict" name="district" value={editFormData.district || ''} onChange={handleEditFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                        </div>
                        <div>
                            <label htmlFor="editShopAddress" className="block text-sm font-medium text-gray-700">Full Address</label>
                            <input type="text" id="editShopAddress" name="address" value={editFormData.address || ''} onChange={handleEditFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                        </div>
                        <div>
                            <label htmlFor="editShopCurrency" className="block text-sm font-medium text-gray-700">Currency</label>
                            <select id="editShopCurrency" name="currencyCode" value={editFormData.currencyCode || ''} onChange={handleEditFormChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                {currencies.map(currency => (
                                    <option key={currency.id} value={currency.id}>{currency.id} - {currency.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex items-center">
                            <input id="isActive" name="isActive" type="checkbox" checked={editFormData.isActive || false} onChange={handleEditFormChange} className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded" />
                            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Shop is Active</label>
                        </div>
                    </form>
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4">
                    <button onClick={() => setEditingShop(null)} type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleUpdateSubmit} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Update Shop</button>
                </div>
            </div>
        </div>
    )}
    </>
  );
};

export default ShopManagement;
