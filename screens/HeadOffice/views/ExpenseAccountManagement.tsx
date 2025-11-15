
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';

const ExpenseAccountManagement: React.FC = () => {
  const { expenseAccounts, addExpenseAccount } = useAppContext();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description) return;
    addExpenseAccount({ name, description });
    setName('');
    setDescription('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create Expense Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="expenseName" className="block text-sm font-medium text-gray-700">Account Name</label>
            <input type="text" id="expenseName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="expenseDesc" className="block text-sm font-medium text-gray-700">Description</label>
            <input type="text" id="expenseDesc" value={description} onChange={e => setDescription(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Account</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Expense Accounts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenseAccounts.map(account => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{account.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpenseAccountManagement;