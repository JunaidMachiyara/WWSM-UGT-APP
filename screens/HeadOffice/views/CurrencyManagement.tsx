import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Currency } from '../../../types';

const CurrencyManagement: React.FC = () => {
  const { currencies, updateCurrency, addCurrency } = useAppContext();
  
  // State for updating existing rates
  const [rates, setRates] = useState<Record<string, number>>({});
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState('');

  // State for adding a new currency
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newRate, setNewRate] = useState<number | ''>('');
  const [formMessage, setFormMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);


  useEffect(() => {
    const initialRates = currencies.reduce((acc, curr) => {
        acc[curr.id] = curr.rate;
        return acc;
    }, {} as Record<string, number>);
    setRates(initialRates);
  }, [currencies]);

  const handleRateChange = (id: string, value: string) => {
    setRates(prev => ({ ...prev, [id]: parseFloat(value) || 0 }));
  };

  const handleUpdate = (currency: Currency) => {
    const rate = rates[currency.id];
    if (rate !== undefined && rate > 0) {
      updateCurrency({ id: currency.id, rate });
      setUpdateSuccessMessage(`Rate for ${currency.name} updated successfully!`);
      setTimeout(() => setUpdateSuccessMessage(''), 3000);
    } else {
        alert('Please enter a valid, positive rate.');
    }
  };

  const handleAddCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    if (!newId || !newName || !newSymbol || newRate === '' || newRate <= 0) {
        setFormMessage({ type: 'error', text: 'Please fill all fields. Rate must be positive.' });
        return;
    }

    try {
        await addCurrency({
            id: newId,
            name: newName,
            symbol: newSymbol,
            rate: newRate,
        });
        setFormMessage({ type: 'success', text: `Currency ${newId.toUpperCase()} added successfully!` });
        // Reset form
        setNewId('');
        setNewName('');
        setNewSymbol('');
        setNewRate('');
    } catch (error: any) {
        setFormMessage({ type: 'error', text: error.message || 'Failed to add currency.' });
    }
  };
  
  const sortedCurrencies = [...currencies].sort((a, b) => a.id.localeCompare(b.id));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Add New Currency</h3>
        {formMessage && (
            <div className={`p-4 mb-4 text-sm rounded-lg ${formMessage.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`} role="alert">
                {formMessage.text}
            </div>
        )}
        <form onSubmit={handleAddCurrency} className="space-y-4">
          <div>
            <label htmlFor="newId" className="block text-sm font-medium text-gray-700">Currency Code (e.g., EUR)</label>
            <input type="text" id="newId" value={newId} onChange={e => setNewId(e.target.value.toUpperCase())} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required maxLength={3} placeholder="3-letter code" />
          </div>
          <div>
            <label htmlFor="newName" className="block text-sm font-medium text-gray-700">Currency Name (e.g., Euro)</label>
            <input type="text" id="newName" value={newName} onChange={e => setNewName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required placeholder="Full currency name" />
          </div>
          <div>
            <label htmlFor="newSymbol" className="block text-sm font-medium text-gray-700">Symbol (e.g., €)</label>
            <input type="text" id="newSymbol" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required placeholder="e.g. $" />
          </div>
          <div>
            <label htmlFor="newRate" className="block text-sm font-medium text-gray-700">Conversion Rate (to 1 USD)</label>
            <input type="number" id="newRate" value={newRate} onChange={e => setNewRate(e.target.value === '' ? '' : Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.000001" step="any" placeholder="e.g. 1.12" />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Currency</button>
        </form>
      </div>

      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Manage Existing Currencies</h3>
        <p className="text-sm text-gray-600 mb-6">Manage conversion rates against the base currency (USD). The rate signifies how many units of the local currency are equivalent to 1 USD.</p>
        {updateSuccessMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
              <p>{updateSuccessMessage}</p>
            </div>
          )}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Currency</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">1 USD = ?</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCurrencies.map(currency => (
                <tr key={currency.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{currency.name} ({currency.id})</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{currency.symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {currency.id === 'USD' ? (
                      <span className="font-semibold px-2 py-2">1.00 (Base)</span>
                    ) : (
                      <input
                        type="number"
                        value={rates[currency.id] || ''}
                        onChange={e => handleRateChange(currency.id, e.target.value)}
                        className="w-32 border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                        step="any"
                      />
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {currency.id !== 'USD' && (
                      <button
                        onClick={() => handleUpdate(currency)}
                        className="text-white bg-primary hover:bg-primary-dark font-medium rounded-lg text-sm px-4 py-2"
                      >
                        Update
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CurrencyManagement;
