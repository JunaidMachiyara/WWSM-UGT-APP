
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shop } from '../../../types';

const ShopManagement: React.FC = () => {
  const { shops, addShop, currencies, updateShop, deleteShop } = useAppContext();
  
  // State for creating a new shop
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [district, setDistrict] = useState('');
  const [country, setCountry] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [shopImages, setShopImages] = useState<File[]>([]);
  const [surroundingsImages, setSurroundingsImages] = useState<File[]>([]);
  const [shopImagePreviews, setShopImagePreviews] = useState<string[]>([]);
  const [surroundingsImagePreviews, setSurroundingsImagePreviews] = useState<string[]>([]);
  const [formMessage, setFormMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  
  // State for editing an existing shop
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Shop>>({});
  const [updateMessage, setUpdateMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);


  useEffect(() => {
    const objectUrls = shopImages.map(file => URL.createObjectURL(file));
    setShopImagePreviews(objectUrls);
    return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
  }, [shopImages]);

  useEffect(() => {
    const objectUrls = surroundingsImages.map(file => URL.createObjectURL(file));
    setSurroundingsImagePreviews(objectUrls);
    return () => objectUrls.forEach(url => URL.revokeObjectURL(url));
  }, [surroundingsImages]);

  const handleShopImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setShopImages(Array.from(e.target.files));
      }
  };

  const handleSurroundingsImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
          setSurroundingsImages(Array.from(e.target.files));
      }
  };

  const resetForm = () => {
      setName('');
      setAddress('');
      setDistrict('');
      setCountry('');
      setCurrencyCode('USD');
      setShopImages([]);
      setSurroundingsImages([]);
      setShopImagePreviews([]);
      setSurroundingsImagePreviews([]);
      const shopFileInput = document.getElementById('shopPictures') as HTMLInputElement;
      if (shopFileInput) shopFileInput.value = '';
      const surroundingsFileInput = document.getElementById('surroundingsPictures') as HTMLInputElement;
      if (surroundingsFileInput) surroundingsFileInput.value = '';
  }

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);

    if(!name || !address || !district || !country || !currencyCode) {
      alert('Please fill out all required fields.');
      return;
    };

    const trimmedName = name.trim();
    const isDuplicate = shops.some(shop => shop.name.toLowerCase() === trimmedName.toLowerCase());
    if (isDuplicate) {
        setFormMessage({ type: 'error', text: `A shop named "${trimmedName}" already exists.` });
        return;
    }
    
    try {
        await addShop({ 
            name: trimmedName, 
            address, 
            district, 
            country,
            isActive: true, 
            currencyCode,
            shopImages,
            surroundingsImages,
        });
        setFormMessage({ type: 'success', text: `Shop "${trimmedName}" created successfully!` });
        resetForm();
    } catch (error) {
        setFormMessage({ type: 'error', text: 'Failed to create shop. Please try again.' });
        console.error(error);
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
    if (window.confirm(`Are you sure you want to permanently delete "${shop.name}"? This will also delete all its images and cannot be undone.`)) {
        try {
            await deleteShop(shop.id);
        } catch (error) {
            console.error("Failed to delete shop:", error);
            alert("There was an error deleting the shop. Please try again.");
        }
    }
  };
  
  const fileInputStyle = "block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-primary hover:file:bg-blue-100";
  const imagePreviewContainerStyle = "mt-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4";
  const imagePreviewStyle = "h-24 w-full object-cover rounded-lg shadow-md";


  return (
    <>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
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
          <div>
            <label htmlFor="shopPictures" className="block text-sm font-medium text-gray-700">Shop Pictures</label>
            <input type="file" id="shopPictures" onChange={handleShopImagesChange} className={`mt-1 ${fileInputStyle}`} multiple accept="image/*" />
             {shopImagePreviews.length > 0 && (
              <div className={imagePreviewContainerStyle}>
                {shopImagePreviews.map((preview, index) => <img key={index} src={preview} alt="Shop preview" className={imagePreviewStyle} />)}
              </div>
            )}
          </div>
           <div>
            <label htmlFor="surroundingsPictures" className="block text-sm font-medium text-gray-700">Location Pictures</label>
            <input type="file" id="surroundingsPictures" onChange={handleSurroundingsImagesChange} className={`mt-1 ${fileInputStyle}`} multiple accept="image/*" />
            {surroundingsImagePreviews.length > 0 && (
              <div className={imagePreviewContainerStyle}>
                {surroundingsImagePreviews.map((preview, index) => <img key={index} src={preview} alt="Location preview" className={imagePreviewStyle} />)}
              </div>
            )}
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Shop</button>
        </form>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shop.district}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shop.currencyCode}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${shop.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                            onClick={() => handleDelete(shop)}
                            className="text-red-600 hover:text-red-900"
                            aria-label={`Delete ${shop.name}`}
                        >
                            Delete
                        </button>
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
                    {/* Image Galleries */}
                    {(editingShop.shopImageUrls?.length > 0 || editingShop.surroundingsImageUrls?.length > 0) && (
                      <div className="space-y-4">
                        {editingShop.shopImageUrls?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Shop Pictures</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {editingShop.shopImageUrls.map((url, index) => (
                                <img key={index} src={url} alt={`Shop ${index + 1}`} className="h-24 w-full object-cover rounded-md shadow" />
                              ))}
                            </div>
                          </div>
                        )}
                        {editingShop.surroundingsImageUrls?.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Location Pictures</h4>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                              {editingShop.surroundingsImageUrls.map((url, index) => (
                                <img key={index} src={url} alt={`Location ${index + 1}`} className="h-24 w-full object-cover rounded-md shadow" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
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
