import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AccountType, TransactionType } from '../../../types';

const AccountManagement: React.FC = () => {
  const { shopId, shopAccounts, addShopAccount, currentShopCurrency, transactions, formatCurrency } = useAppContext();
  
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(AccountType.CASH);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState(0);
  
  const currentShopAccounts = shopAccounts.filter(acc => acc.shopId === shopId);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    if (!shopId) return balances;

    const shopTransactions = transactions.filter(t => t.shopId === shopId);

    currentShopAccounts.forEach(account => {
        let balance = account.openingBalance; // Start with opening balance in USD
        
        // Add all incoming transactions
        shopTransactions
            .filter(t => t.paymentAccountId === account.id && t.type === TransactionType.SALES_RECEIPT)
            .forEach(t => balance += t.amount);

        // Subtract all outgoing transactions
        shopTransactions
            .filter(t => t.paymentAccountId === account.id && t.type === TransactionType.EXPENSE)
            .forEach(t => balance -= t.amount);
            
        balances[account.id] = balance;
    });
    return balances;

  }, [currentShopAccounts, transactions, shopId]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !shopId) {
        alert('Please provide an account name.');
        return;
    }
    if (accountType === AccountType.BANK && (!bankName || !accountNumber)) {
        alert('Please provide bank name and account number for a bank account.');
        return;
    }

    addShopAccount({
        shopId,
        accountName,
        accountType,
        bankName: accountType === AccountType.BANK ? bankName : undefined,
        accountNumber: accountType === AccountType.BANK ? accountNumber : undefined,
        openingBalance,
    });
    
    // Reset form
    setAccountName('');
    setAccountType(AccountType.CASH);
    setBankName('');
    setAccountNumber('');
    setOpeningBalance(0);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Account</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accountName" className="block text-sm font-medium text-gray-700">Account Name</label>
            <input type="text" id="accountName" value={accountName} onChange={e => setAccountName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
          </div>
          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-gray-700">Account Type</label>
            <select id="accountType" value={accountType} onChange={e => setAccountType(e.target.value as AccountType)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                <option value={AccountType.CASH}>Cash Account</option>
                <option value={AccountType.BANK}>Bank Account</option>
            </select>
          </div>
          {accountType === AccountType.BANK && (
              <>
                <div>
                    <label htmlFor="bankName" className="block text-sm font-medium text-gray-700">Bank Name</label>
                    <input type="text" id="bankName" value={bankName} onChange={e => setBankName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                </div>
                <div>
                    <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700">Account Number</label>
                    <input type="text" id="accountNumber" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                </div>
              </>
          )}
          <div>
            <label htmlFor="openingBalance" className="block text-sm font-medium text-gray-700">Opening Balance ({currentShopCurrency.symbol})</label>
            <input type="number" id="openingBalance" value={openingBalance} onChange={e => setOpeningBalance(parseFloat(e.target.value) || 0)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0" step="0.01"/>
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Account</button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Accounts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Current Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentShopAccounts.map(account => (
                <tr key={account.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account.accountName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        account.accountType === AccountType.CASH ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {account.accountType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {account.accountType === AccountType.BANK ? `${account.bankName} - ${account.accountNumber}` : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                    {formatCurrency(accountBalances[account.id] || 0)}
                  </td>
                </tr>
              ))}
              {currentShopAccounts.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-500">No cash or bank accounts created for this shop yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AccountManagement;