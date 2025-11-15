
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Currency } from '../../../types';

const CurrencyManagement: React.FC = () => {
  const { currencies, updateCurrency } = useAppContext();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Initialize local rates state when currencies data is loaded
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
      setSuccessMessage(`Rate for ${currency.name} updated successfully!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } else {
        alert('Please enter a valid, positive rate.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Currency Conversion Rates</h3>
      <p className="text-sm text-gray-600 mb-6">Manage conversion rates against the base currency (USD). The rate signifies how many units of the local currency are equivalent to 1 USD.</p>
       {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
            <p>{successMessage}</p>
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
            {currencies.map(currency => (
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
  );
};

export default CurrencyManagement;
