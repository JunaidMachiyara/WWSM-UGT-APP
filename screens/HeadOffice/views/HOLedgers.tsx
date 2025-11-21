
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType, AccountType } from '../../../types';

type LedgerType = 'CUSTOMER' | 'ACCOUNT' | 'EXPENSE';

interface LedgerEntry {
  date: Date;
  description: string;
  ref?: string;
  debit: number;
  credit: number;
  balance: number;
}

const HOLedgers: React.FC = () => {
  const { 
    shops, 
    customers, 
    shopAccounts, 
    expenseAccounts, 
    transactions, 
    currencies 
  } = useAppContext();

  const [selectedShopId, setSelectedShopId] = useState<string>('');
  const [ledgerType, setLedgerType] = useState<LedgerType>('CUSTOMER');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  // Filtered Data based on Shop Selection
  // If 'ALL' is selected, we show entities from all shops.
  const filteredCustomers = useMemo(() => 
      selectedShopId === 'ALL' 
          ? customers 
          : customers.filter(c => c.shopId === selectedShopId)
  , [customers, selectedShopId]);

  const filteredAccounts = useMemo(() => 
      selectedShopId === 'ALL' 
          ? shopAccounts 
          : shopAccounts.filter(a => a.shopId === selectedShopId)
  , [shopAccounts, selectedShopId]);

  // Determine display currency. If ALL shops, default to USD (Base), else Shop's currency.
  const selectedShop = shops.find(s => s.id === selectedShopId);
  const displayCurrency = useMemo(() => {
      if (selectedShopId === 'ALL' || !selectedShop) return { id: 'USD', symbol: '$', rate: 1 };
      return currencies.find(c => c.id === selectedShop.currencyCode) || { id: 'USD', symbol: '$', rate: 1 };
  }, [selectedShopId, selectedShop, currencies]);

  const ledgerData = useMemo(() => {
    if (!selectedShopId || !selectedEntityId) return [];

    const shopTrans = transactions
        .filter(t => selectedShopId === 'ALL' ? true : t.shopId === selectedShopId)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const entries: LedgerEntry[] = [];

    if (ledgerType === 'CUSTOMER') {
        // Filter by Customer ID (unique even across shops usually, but definately per entity)
        shopTrans.forEach(t => {
            if (t.customerId === selectedEntityId) {
                let debit = 0;
                let credit = 0;

                if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                    debit = t.amount * (t.quantity || 1);
                } else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.CUSTOMER_ADVANCE) {
                    if(t.type === TransactionType.SALES_RETURN) {
                         credit = t.amount * (t.quantity || 1);
                    } else {
                         credit = t.amount;
                    }
                }

                if (debit > 0 || credit > 0) {
                    runningBalance += (debit - credit);
                    entries.push({
                        date: t.date,
                        description: t.description,
                        ref: t.invoiceId || t.receiptNumber || '-',
                        debit,
                        credit,
                        balance: runningBalance
                    });
                }
            }
        });
    } else if (ledgerType === 'ACCOUNT') {
        const account = filteredAccounts.find(a => a.id === selectedEntityId);
        if (account) {
            runningBalance = account.openingBalance;
            entries.push({
                date: new Date(0),
                description: 'Opening Balance',
                ref: '-',
                debit: runningBalance > 0 ? runningBalance : 0,
                credit: runningBalance < 0 ? Math.abs(runningBalance) : 0,
                balance: runningBalance
            });
        }

        shopTrans.forEach(t => {
            if (t.paymentAccountId === selectedEntityId) {
                let debit = 0;
                let credit = 0;

                if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) {
                    debit = t.amount;
                } else if (t.type === TransactionType.EXPENSE || t.type === TransactionType.IMPORT_OVERHEAD) {
                    if(t.type === TransactionType.IMPORT_OVERHEAD) {
                        credit = t.amount * (t.quantity || 1);
                    } else {
                        credit = t.amount;
                    }
                }

                if (debit > 0 || credit > 0) {
                    runningBalance += (debit - credit);
                    entries.push({
                        date: t.date,
                        description: t.description,
                        ref: '-',
                        debit,
                        credit,
                        balance: runningBalance
                    });
                }
            }
        });

    } else if (ledgerType === 'EXPENSE') {
        shopTrans.forEach(t => {
            if (t.type === TransactionType.EXPENSE && t.expenseAccountId === selectedEntityId) {
                const debit = t.amount;
                const credit = 0;
                
                runningBalance += debit;

                entries.push({
                    date: t.date,
                    description: t.description,
                    ref: '-',
                    debit,
                    credit,
                    balance: runningBalance
                });
            }
        });
    }

    return entries;

  }, [selectedShopId, ledgerType, selectedEntityId, transactions, filteredAccounts]);

  const formatDisplayCurrency = (amount: number) => {
      const rate = displayCurrency.rate || 1;
      const value = amount * rate;
      return `${displayCurrency.symbol}${value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
  };

  // Ensure dropdowns have solid white background and black text for readability
  const selectClass = "w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-primary focus:border-primary bg-white text-gray-900";

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Shop Ledgers & Financials</h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">1. Select Shop</label>
                <select 
                    value={selectedShopId} 
                    onChange={(e) => {
                        setSelectedShopId(e.target.value);
                        setSelectedEntityId('');
                    }}
                    className={selectClass}
                >
                    <option value="">-- Choose Shop --</option>
                    <option value="ALL">All Shops</option>
                    {shops.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.currencyCode})</option>
                    ))}
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">2. Ledger Type</label>
                <select 
                    value={ledgerType} 
                    onChange={(e) => {
                        setLedgerType(e.target.value as LedgerType);
                        setSelectedEntityId('');
                    }}
                    className={selectClass}
                    disabled={!selectedShopId}
                >
                    <option value="CUSTOMER">Customer Ledgers</option>
                    <option value="ACCOUNT">Cash & Bank Ledgers</option>
                    <option value="EXPENSE">Expense Head Ledgers</option>
                </select>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">3. Select Entity</label>
                <select 
                    value={selectedEntityId} 
                    onChange={(e) => setSelectedEntityId(e.target.value)}
                    className={selectClass}
                    disabled={!selectedShopId}
                >
                    <option value="">-- Select --</option>
                    
                    {ledgerType === 'CUSTOMER' && filteredCustomers.map(c => {
                         const shopName = selectedShopId === 'ALL' ? ` (${shops.find(s => s.id === c.shopId)?.name})` : '';
                         return <option key={c.id} value={c.id}>{c.name}{shopName}</option>
                    })}

                    {ledgerType === 'ACCOUNT' && filteredAccounts.map(a => {
                         const shopName = selectedShopId === 'ALL' ? ` (${shops.find(s => s.id === a.shopId)?.name})` : '';
                         return <option key={a.id} value={a.id}>{a.accountName} ({a.accountType}){shopName}</option>
                    })}

                    {ledgerType === 'EXPENSE' && expenseAccounts.map(e => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                </select>
            </div>
        </div>

        {/* Ledger Content Display (Table) */}
        {selectedShopId && selectedEntityId ? (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">
                            {ledgerType === 'CUSTOMER' && 'Customer Statement'}
                            {ledgerType === 'ACCOUNT' && 'Account Statement'}
                            {ledgerType === 'EXPENSE' && 'Expense Report'}
                        </h3>
                        <p className="text-sm text-gray-500">
                            Shop: <span className="font-semibold">{selectedShopId === 'ALL' ? 'All Consolidated' : selectedShop?.name}</span> | Currency: {displayCurrency.id}
                        </p>
                    </div>
                    <div className="text-right">
                        <span className="block text-xs text-gray-500 uppercase">Current Balance</span>
                        <span className={`text-2xl font-bold ${
                             ledgerData.length > 0 && ledgerData[ledgerData.length - 1].balance < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                            {ledgerData.length > 0 ? formatDisplayCurrency(ledgerData[ledgerData.length - 1].balance) : formatDisplayCurrency(0)}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ref #</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    {ledgerType === 'ACCOUNT' ? 'Receipt (Dr)' : ledgerType === 'CUSTOMER' ? 'Invoice (Dr)' : 'Expense (Dr)'}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    {ledgerType === 'ACCOUNT' ? 'Payment (Cr)' : ledgerType === 'CUSTOMER' ? 'Payment (Cr)' : '-'}
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {ledgerData.length > 0 ? (
                                ledgerData.map((entry, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {entry.description === 'Opening Balance' ? '-' : new Date(entry.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.description}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.ref}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">
                                            {entry.debit > 0 ? formatDisplayCurrency(entry.debit) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                            {entry.credit > 0 ? formatDisplayCurrency(entry.credit) : '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">
                                            {formatDisplayCurrency(entry.balance)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                                        No transactions found for the selected criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        ) : (
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-10 text-center">
                <p className="text-gray-500 text-lg">Please select a Shop and an Entity to view the ledger.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default HOLedgers;
