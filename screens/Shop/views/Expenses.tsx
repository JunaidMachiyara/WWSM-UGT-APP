import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const Expenses: React.FC = () => {
  const { shopId, addExpense, expenseAccounts, currentShopCurrency, shopAccounts } = useAppContext();
  const [expenseAccountId, setExpenseAccountId] = useState('');
  const [description, setDescription] = useState(''); // For notes
  const [amount, setAmount] = useState(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const currentShopAccounts = shopAccounts.filter(acc => acc.shopId === shopId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !expenseAccountId || amount <= 0 || !expenseDate || !paymentAccountId) {
      alert('Please fill all required fields: expense account, date, payment account and an amount greater than zero.');
      return;
    }

    // To avoid timezone issues where new Date('YYYY-MM-DD') might result in the previous day.
    const dateForTransaction = new Date(expenseDate + 'T00:00:00');

    addExpense({
      shopId,
      expenseAccountId,
      description,
      amount,
      date: dateForTransaction,
      paymentAccountId,
    });
    
    const expenseName = expenseAccounts.find(ea => ea.id === expenseAccountId)?.name || '';
    setSuccessMessage(`Expense of ${currentShopCurrency.symbol}${amount} for "${expenseName}" recorded successfully.`);
    
    setExpenseAccountId('');
    setDescription('');
    setAmount(0);
    setExpenseDate(new Date().toISOString().split('T')[0]);
    setPaymentAccountId('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Record Expense</h2>
       {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{successMessage}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="expenseAccount" className="block text-sm font-medium text-gray-700">Expense Account</label>
          <select 
            id="expenseAccount" 
            value={expenseAccountId} 
            onChange={e => setExpenseAccountId(e.target.value)} 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
            required
          >
            <option value="">Select an expense head</option>
            {expenseAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.name}</option>
            ))}
          </select>
        </div>
         <div>
          <label htmlFor="expenseDate" className="block text-sm font-medium text-gray-700">Expense Date</label>
          <input type="date" id="expenseDate" value={expenseDate} onChange={e => setExpenseDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" required />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
          <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" />
        </div>
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Amount ({currentShopCurrency.symbol})</label>
          <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" min="0.01" step="0.01" required />
        </div>
        <div>
          <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Paid From Account</label>
          <select 
            id="paymentAccount" 
            value={paymentAccountId} 
            onChange={e => setPaymentAccountId(e.target.value)} 
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white text-gray-900 focus:outline-none focus:ring-primary focus:border-primary" 
            required
          >
            <option value="">Select account</option>
            {currentShopAccounts.map(account => (
              <option key={account.id} value={account.id}>{account.accountName}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end">
          <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-6 rounded-lg transition duration-300">
            Record Expense
          </button>
        </div>
      </form>
    </div>
  );
};

export default Expenses;