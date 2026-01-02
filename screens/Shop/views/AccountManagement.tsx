
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AccountType, TransactionType, ShopAccount } from '../../../types';

const AccountManagement: React.FC = () => {
  const { shopId, shopAccounts, addShopAccount, updateShopAccount, currentShopCurrency, transactions, formatCurrency } = useAppContext();
  
  // Create / Edit State
  const [editingAccount, setEditingAccount] = useState<ShopAccount | null>(null);
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<AccountType>(AccountType.CASH);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number | ''>(0);
  
  // Authorization State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [authError, setAuthError] = useState('');

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
        
        // Add all incoming transactions (Receipts, Advances)
        shopTransactions
            .filter(t => t.paymentAccountId === account.id && (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE))
            .forEach(t => balance += (t.amount || 0));

        // Subtract all outgoing transactions (Expenses, Returns, Overhead)
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

  const handleEditClick = (account: ShopAccount) => {
      setEditingAccount(account);
      setAccountName(account.accountName);
      setAccountType(account.accountType);
      setBankName(account.bankName || '');
      setAccountNumber(account.accountNumber || '');
      
      // Convert opening balance from BASE (USD) to LOCAL for editing
      const rate = currentShopCurrency?.rate || 1;
      setOpeningBalance(parseFloat((account.openingBalance * rate).toFixed(2)));
      
      setSuccessMessage('');
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
      setEditingAccount(null);
      setAccountName('');
      setAccountType(AccountType.CASH);
      setBankName('');
      setAccountNumber('');
      setOpeningBalance(0);
      setShowAuthModal(false);
      setSecurityPin('');
      setAuthError('');
  };

  const preSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId) return;
    if (!accountName.trim()) return alert('Account name required.');

    if (editingAccount) {
        setAuthError('');
        setSecurityPin('');
        setShowAuthModal(true);
    } else {
        executeSubmit();
    }
  };

  const handleAuthSubmit = () => {
      if (securityPin === '7860') {
          executeSubmit();
      } else {
          setAuthError('INVALID MASTER PIN');
      }
  };

  const executeSubmit = async () => {
    setLoading(true);
    try {
        const rate = currentShopCurrency?.rate || 1;
        const balanceInBase = (Number(openingBalance) || 0) / rate;

        const payload: Partial<ShopAccount> = {
            shopId: String(shopId),
            accountName: accountName.trim(),
            accountType: accountType,
            openingBalance: balanceInBase,
            bankName: accountType === AccountType.BANK ? bankName.trim() : null as any,
            accountNumber: accountType === AccountType.BANK ? accountNumber.trim() : null as any,
        };

        if (editingAccount) {
            await updateShopAccount(editingAccount.id, payload);
            setSuccessMessage(`Utility: Account "${accountName}" has been recalibrated.`);
        } else {
            await addShopAccount(payload as Omit<ShopAccount, 'id'>);
            setSuccessMessage(`Account "${accountName}" created successfully.`);
        }
        
        cancelEdit();
        setTimeout(() => setSuccessMessage(''), 5000);
    } catch (error: any) {
        alert(`Error: ${error.message}`);
    } finally {
        setLoading(false);
        setShowAuthModal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className={`lg:col-span-1 bg-white p-6 rounded-lg shadow-lg border transition-all ${editingAccount ? 'border-primary ring-2 ring-primary/10' : 'border-gray-100'}`}>
          <h3 className="text-xl font-black mb-4 text-gray-800 uppercase italic tracking-tighter border-b pb-2">
              {editingAccount ? 'Recalibrate Account' : 'New Account Entry'}
          </h3>
          
          {successMessage && (
              <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded text-xs font-black uppercase tracking-widest animate-pulse">
                  {successMessage}
              </div>
          )}

          <form onSubmit={preSubmitCheck} className="space-y-4">
            <div>
              <label htmlFor="accountName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Display Label</label>
              <input 
                  type="text" 
                  id="accountName" 
                  value={accountName} 
                  onChange={e => setAccountName(e.target.value)} 
                  className="w-full border border-gray-300 rounded-md shadow-sm p-3 bg-white text-gray-900 focus:outline-none focus:ring-primary font-bold" 
                  placeholder="e.g. Abidjan Petty Cash"
                  required 
                  disabled={loading}
              />
            </div>
            <div>
              <label htmlFor="accountType" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Financial Category</label>
              <select 
                  id="accountType" 
                  value={accountType} 
                  onChange={e => setAccountType(e.target.value as AccountType)} 
                  className="w-full border border-gray-300 rounded-md shadow-sm p-3 bg-white text-gray-900 font-bold focus:outline-none" 
                  required
                  disabled={loading}
              >
                  <option value={AccountType.CASH}>PHYSICAL CASH</option>
                  <option value={AccountType.BANK}>BANK ACCOUNT</option>
              </select>
            </div>
            {accountType === AccountType.BANK && (
                <div className="space-y-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div>
                      <label htmlFor="bankName" className="block text-[10px] font-black text-blue-700 uppercase mb-1">Bank Institution</label>
                      <input 
                          type="text" 
                          id="bankName" 
                          value={bankName} 
                          onChange={e => setBankName(e.target.value)} 
                          className="w-full border border-blue-200 rounded-md p-2 bg-white text-gray-900 font-bold" 
                          required 
                          disabled={loading}
                      />
                  </div>
                  <div>
                      <label htmlFor="accountNumber" className="block text-[10px] font-black text-blue-700 uppercase mb-1">Official Account #</label>
                      <input 
                          type="text" 
                          id="accountNumber" 
                          value={accountNumber} 
                          onChange={e => setAccountNumber(e.target.value)} 
                          className="w-full border border-blue-200 rounded-md p-2 bg-white text-gray-900 font-bold" 
                          required 
                          disabled={loading}
                      />
                  </div>
                </div>
            )}
            <div>
              <label htmlFor="openingBalance" className="block text-[10px] font-black text-primary uppercase tracking-widest mb-1 italic">Starting Balance ({currentShopCurrency?.symbol})</label>
              <input 
                  type="number" 
                  id="openingBalance" 
                  value={openingBalance} 
                  onChange={e => setOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                  className="w-full border border-gray-300 rounded-md shadow-sm p-3 bg-gray-50 text-gray-900 focus:outline-none focus:bg-white transition-all font-black text-xl" 
                  required 
                  min="0" 
                  step="0.01"
                  disabled={loading}
              />
              <p className="text-[9px] text-gray-400 mt-2 font-bold leading-tight uppercase">Changes here will bypass the general ledger and set the account's point-of-origin.</p>
            </div>
            
            <div className="flex flex-col space-y-2 pt-2">
              <button 
                  type="submit" 
                  disabled={loading}
                  className={`w-full text-white font-black py-4 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center uppercase tracking-widest text-xs ${loading ? 'bg-gray-400' : (editingAccount ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary-dark')} active:scale-95`}
              >
                  {loading ? 'Processing...' : editingAccount ? 'Authorize Calibrate' : 'Commit Account'}
              </button>
              
              {editingAccount && (
                  <button 
                      type="button" 
                      onClick={cancelEdit}
                      disabled={loading}
                      className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-black py-2.5 px-4 rounded-xl transition-all uppercase tracking-widest text-[10px]"
                  >
                      Cancel Edit
                  </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-6 border-b-4 border-primary/10 pb-2">
              <h3 className="text-xl font-black text-gray-800 uppercase italic tracking-tighter">Verified Shop Accounts</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base: {currentShopCurrency.id}</p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Identity</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                  <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Opening Point</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Net Position</th>
                  <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Mgmt</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {currentShopAccounts.map(account => (
                  <tr key={account.id} className={`hover:bg-gray-50 transition-colors group ${editingAccount?.id === account.id ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight">{account.accountName}</p>
                        {account.accountType === AccountType.BANK && <p className="text-[10px] text-gray-400 font-mono">{account.bankName} • {account.accountNumber}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 inline-flex text-[9px] leading-5 font-black rounded-full uppercase tracking-widest ${
                          account.accountType === AccountType.CASH ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {account.accountType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-bold">
                        {formatCurrency(account.openingBalance)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900 bg-gray-50/50">
                      {formatCurrency(accountBalances[account.id] || 0)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button 
                          onClick={() => handleEditClick(account)}
                          className="bg-primary/5 text-primary hover:bg-primary hover:text-white px-4 py-1.5 rounded-lg font-black uppercase tracking-widest text-[10px] transition-all shadow-sm"
                        >
                            Utility Edit
                        </button>
                    </td>
                  </tr>
                ))}
                {currentShopAccounts.length === 0 && (
                  <tr>
                      <td colSpan={5} className="text-center py-24 text-gray-300 italic font-bold">
                          <svg className="w-12 h-12 mx-auto mb-2 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M3 10h18M7 15h1m4 0h1m-7 4h12a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          No shop accounts found in database.
                      </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Auth Modal for Account Utility */}
      {showAuthModal && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4 animate-fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-scale-up border-4 border-orange-600/20">
                  <div className="bg-orange-600 p-8 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter italic">Ledger Utility Access</h3>
                      <p className="text-xs font-bold text-orange-100 uppercase tracking-[0.2em] mt-2 opacity-80">Security Protocol 7860</p>
                  </div>
                  <div className="p-8">
                      <p className="text-sm text-gray-500 font-bold mb-6 text-center leading-relaxed">Enter your master key to authorize this balance recalibration.</p>
                      
                      <div className="space-y-6">
                          <input 
                              type="password" 
                              value={securityPin}
                              onChange={e => {
                                  setSecurityPin(e.target.value);
                                  setAuthError('');
                              }}
                              placeholder="••••"
                              autoFocus
                              maxLength={4}
                              className="w-full text-center text-5xl font-black tracking-[0.5em] border-b-8 border-gray-100 bg-transparent py-4 focus:border-orange-500 outline-none transition-all placeholder-gray-200"
                          />
                          {authError && <p className="text-[10px] text-red-600 font-black text-center uppercase animate-bounce">{authError}</p>}
                          
                          <div className="flex space-x-3">
                              <button 
                                  onClick={() => setShowAuthModal(false)}
                                  className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={handleAuthSubmit}
                                  disabled={securityPin.length < 4}
                                  className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${securityPin.length < 4 ? 'bg-gray-300 shadow-none' : 'bg-orange-600 hover:bg-orange-700 active:scale-95 hover:shadow-orange-600/30'}`}
                              >
                                  SYNC LEDGER
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default AccountManagement;
