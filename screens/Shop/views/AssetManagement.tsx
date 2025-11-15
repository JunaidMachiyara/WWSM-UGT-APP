import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AssetStatus } from '../../../types';

const AssetManagement: React.FC = () => {
  const { shopId, assets, addAsset, expenseAccounts, shopAccounts, currentShopCurrency, formatCurrency } = useAppContext();

  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [purchaseCost, setPurchaseCost] = useState(0);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const shopAssets = useMemo(() => {
    return assets.filter(asset => asset.shopId === shopId)
                 .sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
  }, [assets, shopId]);

  const currentShopAccounts = useMemo(() => shopAccounts.filter(acc => acc.shopId === shopId), [shopAccounts, shopId]);

  const resetForm = () => {
    setName('');
    setCategory('');
    setPurchaseDate(new Date().toISOString().split('T')[0]);
    setPurchaseCost(0);
    setPaymentAccountId('');
    setExpenseAccountId('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !name || !category || !purchaseDate || purchaseCost <= 0 || !paymentAccountId || !expenseAccountId) {
      alert('Please fill out all fields. Purchase cost must be greater than zero.');
      return;
    }

    const dateForTransaction = new Date(purchaseDate + 'T00:00:00');

    addAsset({
      shopId,
      name,
      category,
      purchaseDate: dateForTransaction,
      purchaseCost,
      paymentAccountId,
      expenseAccountId,
    });

    setSuccessMessage(`Asset "${name}" added and expense recorded successfully.`);
    resetForm();
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="space-y-8">
       {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{successMessage}</p>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Add New Asset</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="assetName" className="block text-sm font-medium text-gray-700">Asset Name</label>
              <input type="text" id="assetName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
            </div>
             <div>
              <label htmlFor="assetCategory" className="block text-sm font-medium text-gray-700">Category</label>
              <input type="text" id="assetCategory" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" placeholder="e.g., Electronics, Furniture" required />
            </div>
             <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700">Purchase Date</label>
              <input type="date" id="purchaseDate" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
            </div>
             <div>
              <label htmlFor="purchaseCost" className="block text-sm font-medium text-gray-700">Purchase Cost ({currentShopCurrency.symbol})</label>
              <input type="number" id="purchaseCost" value={purchaseCost} onChange={e => setPurchaseCost(parseFloat(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
            </div>
            <div>
              <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Paid From</label>
              <select id="paymentAccount" value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                <option value="">Select an account</option>
                {currentShopAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="expenseAccount" className="block text-sm font-medium text-gray-700">Expense Category</label>
              <select id="expenseAccount" value={expenseAccountId} onChange={e => setExpenseAccountId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                <option value="">Select expense account</option>
                {expenseAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
              </select>
               <p className="text-xs text-gray-500 mt-1">This will automatically create an expense transaction.</p>
            </div>
            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Asset</button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Asset Register</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Date</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {shopAssets.map(asset => (
                  <tr key={asset.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{asset.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{asset.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(asset.purchaseDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-800">{formatCurrency(asset.purchaseCost)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${asset.status === AssetStatus.ACTIVE ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {asset.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
                 {shopAssets.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-10 text-gray-500">No assets have been recorded for this shop yet.</td>
                    </tr>
                 )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetManagement;
