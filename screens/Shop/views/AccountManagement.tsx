
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AccountType, TransactionType } from '../../../types';

const AccountManagement: React.FC = () => {
  const { shopId, shopAccounts, addShopAccount, currentShopCurrency, transactions, formatCurrency } = useAppContext();
  
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(AccountType.CASH);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const currentShopAccounts = useMemo(() => {
    if (!shopId) return [];
    return shopAccounts.filter(acc => acc.shopId === shopId);
  }, [shopAccounts, shopId]);

  const accountBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    if (!shopId) return balances;

    const shopTransactions = transactions.filter(t => t.shopId === shopId);

    currentShopAccounts.forEach(account => {
        let balance = account.openingBalance || 0; // Start with opening balance in USD
        
        // Add all incoming transactions
        shopTransactions
            .filter(t => t.paymentAccountId === account.id && (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE))
            .forEach(t => balance += (t.amount || 0));

        // Subtract all outgoing transactions (Expenses & Import Local Costs)
        shopTransactions
            .filter(t => t.paymentAccountId === account.id && (t.type === TransactionType.EXPENSE || t.type === TransactionType.IMPORT_OVERHEAD || t.type === TransactionType.ADVANCE_USAGE))
            .forEach(t => {
                 if (t.type === TransactionType.IMPORT_OVERHEAD) {
                     balance -= ((t.amount || 0) * (t.quantity || 1));
                 } else {
                     balance -= (t.amount || 0);
                 }
            });
            
        balances[account.id] = balance;
    });
    return balances;

  }, [currentShopAccounts, transactions, shopId]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    console.log('Account Creation Started...', { accountName, accountType, shopId });

    if (!shopId) {
        alert('Critical Error: No Shop ID detected. Please re-select your shop.');
        return;
    }

    if (!accountName.trim()) {
        alert('Please provide a valid account name.');
        return;
    }

    if (accountType === AccountType.BANK && (!bankName.trim() || !accountNumber.trim())) {
        alert('Bank Name and Account Number are required for bank accounts.');
        return;
    }

    setLoading(true);
    try {
        // IMPORTANT: Convert opening balance from Local Shop Currency to Base Currency (USD)
        const rate = currentShopCurrency?.rate || 1;
        const balanceInBase = (Number(openingBalance) || 0) / rate;

        const payload = {
            shopId: String(shopId),
            accountName: accountName.trim(),
            accountType: accountType,
            openingBalance: balanceInBase,
            // Only add bank details if type is BANK
            ...(accountType === AccountType.BANK ? {
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim()
            } : {})
        };

        console.log('Sending Account Payload to Firestore:', payload);
        await addShopAccount(payload);
        
        setSuccessMessage(`Account "${accountName}" created successfully.`);
        console.log('Account successfully created in database.');
        
        // Reset form
        setAccountName('');
        setAccountType(AccountType.CASH);
        setBankName('');
        setAccountNumber('');
        setOpeningBalance(0);

        setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
        console.error("FATAL: Failed to create account:", error);
        alert(`Database Error: ${error.message || 'The system could not save the account. Please check your internet connection.'}`);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Create New Account</h3>
        
        {successMessage && (
            <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4 rounded text-sm font-bold animate-pulse">
                {successMessage}
            </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="accountName" className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Name</label>
            <input 
                type="text" 
                id="accountName" 
                value={accountName} 
                onChange={e => setAccountName(e.target.value)} 
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                placeholder="e.g. Daily Cash Drawer"
                required 
                disabled={loading}
            />
          </div>
          <div>
            <label htmlFor="accountType" className="block text-xs font-bold text-gray-500 uppercase mb-1">Account Type</label>
            <select 
                id="accountType" 
                value={accountType} 
                onChange={e => setAccountType(e.target.value as AccountType)} 
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                required
                disabled={loading}
            >
                <option value={AccountType.CASH}>Physical Cash</option>
                <option value={AccountType.BANK}>Bank Account</option>
            </select>
          </div>
          {accountType === AccountType.BANK && (
              <div className="space-y-4 p-3 bg-blue-50 rounded-lg border border-blue-100 animate-fade-in-down">
                <div>
                    <label htmlFor="bankName" className="block text-xs font-bold text-blue-700 uppercase mb-1">Bank Name</label>
                    <input 
                        type="text" 
                        id="bankName" 
                        value={bankName} 
                        onChange={e => setBankName(e.target.value)} 
                        className="w-full border border-blue-200 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        placeholder="e.g. Standard Chartered"
                        required 
                        disabled={loading}
                    />
                </div>
                <div>
                    <label htmlFor="accountNumber" className="block text-xs font-bold text-blue-700 uppercase mb-1">Account Number</label>
                    <input 
                        type="text" 
                        id="accountNumber" 
                        value={accountNumber} 
                        onChange={e => setAccountNumber(e.target.value)} 
                        className="w-full border border-blue-200 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20" 
                        placeholder="123456789..."
                        required 
                        disabled={loading}
                    />
                </div>
              </div>
          )}
          <div>
            <label htmlFor="openingBalance" className="block text-xs font-bold text-gray-500 uppercase mb-1">Opening Balance ({currentShopCurrency?.symbol})</label>
            <input 
                type="number" 
                id="openingBalance" 
                value={openingBalance} 
                onChange={e => setOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all" 
                required 
                min="0" 
                step="0.01"
                disabled={loading}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full text-white font-black py-3 px-4 rounded-lg transition-all shadow-md flex items-center justify-center ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark active:scale-[0.98]'}`}
          >
            {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    SECURELY CREATING...
                </>
            ) : 'Add Account'}
          </button>
        </form>
      </div>
      <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <h3 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Existing Accounts</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Account Name</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</th>
                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Balance</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {currentShopAccounts.map(account => (
                <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{account.accountName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`px-2 py-0.5 inline-flex text-[10px] leading-5 font-black rounded-full uppercase tracking-tighter ${
                        account.accountType === AccountType.CASH ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {account.accountType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {account.accountType === AccountType.BANK ? (
                          <div className="flex flex-col">
                              <span className="font-bold">{account.bankName}</span>
                              <span className="text-gray-400 font-mono">{account.accountNumber}</span>
                          </div>
                      ) : <span className="italic text-gray-300">Local Currency Vault</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900 bg-gray-50/50">
                    {formatCurrency(accountBalances[account.id] || 0)}
                  </td>
                </tr>
              ))}
              {currentShopAccounts.length === 0 && (
                <tr>
                    <td colSpan={4} className="text-center py-20 text-gray-400 italic">No cash or bank accounts created for this shop yet.</td>
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
