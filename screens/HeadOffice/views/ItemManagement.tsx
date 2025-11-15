
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const ItemManagement: React.FC = () => {
  const { products, addProduct } = useAppContext();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [hoCost, setHoCost] = useState(0);
  const [minSalePrice, setMinSalePrice] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || hoCost <= 0 || minSalePrice <= 0) {
      alert('Please fill all fields correctly. Costs and prices must be greater than zero.');
      return;
    }
    if (minSalePrice < hoCost) {
        alert('Minimum Sale Price cannot be less than the Head Office Cost.');
        return;
    }
    addProduct({ name, category, hoCost: Number(hoCost), minSalePrice: Number(minSalePrice) });
    setName('');
    setCategory('');
    setHoCost(0);
    setMinSalePrice(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Item</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Item Name</label>
            <input type="text" id="itemName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700">Category</label>
            <input type="text" id="itemCategory" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
           <div>
            <label htmlFor="hoCost" className="block text-sm font-medium text-gray-700">Head Office Cost ($)</label>
            <input type="number" id="hoCost" value={hoCost} onChange={e => setHoCost(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
          </div>
          <div>
            <label htmlFor="minSalePrice" className="block text-sm font-medium text-gray-700">Minimum Sale Price ($)</label>
            <input type="number" id="minSalePrice" value={minSalePrice} onChange={e => setMinSalePrice(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Item</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Items</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HO Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Sale Price</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {products.map(product => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.hoCost.toFixed(2)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.minSalePrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ItemManagement;