
import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

interface GroupedLedgerEntry {
    date: Date;
    description: string;
    debit: number;   // Payment (Money Out)
    credit: number;  // Bill (Stock In)
    type: 'BILL' | 'PAYMENT' | 'OPENING';
    balance: number;
}

const SupplierLedger: React.FC = () => {
  const { transactions, shopId, formatCurrency } = useAppContext();

  const ledgerEntries = useMemo(() => {
    const shopTransactions = transactions.filter(t => t.shopId === shopId);
    
    // 1. Identify relevant Head Office transactions
    // - IMPORT: Bills (Credits / Liability Increases)
    // - EXPENSE with category 'HEAD_OFFICE': Payments (Debits / Liability Decreases)
    const rawRelevant = shopTransactions.filter(t => {
        if (t.type === TransactionType.IMPORT) return true;
        
        // Handle recorded payments to HO
        const isHOPayment = (t as any).expenseCategory === 'HEAD_OFFICE' || 
                            (t.type === TransactionType.EXPENSE && t.description.toLowerCase().includes('head office'));
        return isHOPayment;
    }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 2. Map and Group IMPORT transactions
    const ledgerMap: Record<string, any> = {};

    rawRelevant.forEach(t => {
        if (t.type === TransactionType.IMPORT) {
            // Handle Opening Balance specifically
            if (t.invoiceId === 'HO-OPENING-BAL') {
                const key = 'OPENING-BAL';
                ledgerMap[key] = {
                    date: t.date,
                    description: 'Opening Balance Migration',
                    debit: t.amount < 0 ? Math.abs(t.amount) : 0,
                    credit: t.amount > 0 ? t.amount : 0,
                    type: 'OPENING'
                };
                return;
            }

            const key = `SHIP-${t.description}-${new Date(t.date).toISOString().split('T')[0]}`;
            if (!ledgerMap[key]) {
                ledgerMap[key] = {
                    date: t.date,
                    description: t.description,
                    debit: 0,
                    credit: 0,
                    type: 'BILL'
                };
            }
            ledgerMap[key].credit += (t.amount * (t.quantity || 1));
        } else {
            const key = `PMT-${t.id}`;
            ledgerMap[key] = {
                date: t.date,
                description: t.description,
                debit: t.amount,
                credit: 0,
                type: 'PAYMENT'
            };
        }
    });

    // 3. Sort chronologically and calculate running balance
    const sortedEntries = (Object.values(ledgerMap) as any[]).sort((a, b) => {
        if (a.type === 'OPENING') return -1;
        if (b.type === 'OPENING') return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    let runningBalance = 0;
    return sortedEntries.map(entry => {
        runningBalance += (entry.credit - entry.debit);
        return { ...entry, balance: runningBalance } as GroupedLedgerEntry;
    });

  }, [transactions, shopId]);

  const finalBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Supplier Ledger (Head Office)</h2>
        
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between shadow-inner">
            <div>
                <h3 className="text-xl font-bold text-gray-800">
                    Account: <span className="text-primary">Stock & Freight Payables</span>
                </h3>
                <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Comprehensive record of goods received from Head Office and payments remitted back.
                </p>
            </div>
            <div className="mt-4 md:mt-0 text-right">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total Outstanding Balance</p>
                <p className={`text-4xl font-black ${finalBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(finalBalance)}
                </p>
            </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                        <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Description</th>
                        <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Debit (Payment)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Credit (Bill)</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Balance</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {ledgerEntries.length > 0 ? ledgerEntries.map((entry, index) => (
                        <tr key={index} className={`hover:bg-blue-50/30 transition-colors ${entry.type === 'OPENING' ? 'bg-blue-50/50 font-bold' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                                {entry.type === 'OPENING' ? '-' : new Date(entry.date).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                                {entry.description}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-3 py-1 inline-flex text-[10px] leading-4 font-black rounded-full uppercase tracking-tighter shadow-sm border ${
                                    entry.type === 'BILL' 
                                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                                        : entry.type === 'PAYMENT'
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                }`}>
                                    {entry.type}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-black">
                                {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-black">
                                {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900 bg-gray-50/50">
                                {formatCurrency(entry.balance)}
                            </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center py-20 text-gray-400 italic">
                                <div className="flex flex-col items-center">
                                    <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                                    </svg>
                                    No transactions recorded for this supplier account.
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
                {ledgerEntries.length > 0 && (
                    <tfoot className="bg-gray-50/50">
                        <tr>
                            <td colSpan={5} className="px-6 py-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest border-t border-gray-200">Final Outstanding Balance:</td>
                            <td className="px-6 py-4 text-right text-lg font-black text-gray-900 border-t border-gray-200">{formatCurrency(finalBalance)}</td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
        <div className="mt-6 flex items-center p-4 bg-blue-50 border border-blue-100 rounded-lg">
             <svg className="w-5 h-5 text-blue-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
             </svg>
             <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Payments recorded via <strong>Accounting &gt; Payment Voucher &gt; Head Office</strong> will automatically reflect here as Debits to reduce your outstanding payable. Imports from verification are Credits.
             </p>
        </div>
    </div>
  );
};

export default SupplierLedger;
