
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

interface DayBookEntry {
    date: Date;
    description: string;
    voucherType: string;
    voucherRef?: string;
    inflow: number;  // Debit to cash/bank
    outflow: number; // Credit from cash/bank
}

const DayBook: React.FC = () => {
    const { shopId, transactions, customers, expenseAccounts, formatCurrency } = useAppContext();
    
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const dayBookEntries = useMemo(() => {
        const start = new Date(fromDate + 'T00:00:00');
        const end = new Date(toDate + 'T23:59:59');

        const relevantTransactions = transactions.filter(t => {
            if (t.shopId !== shopId) return false;
            const tDate = new Date(t.date);
            if (tDate < start || tDate > end) return false;
            
            // We only care about transactions that affect cash/bank accounts
            return t.paymentAccountId && (
                t.type === TransactionType.SALES_RECEIPT ||
                t.type === TransactionType.CUSTOMER_ADVANCE ||
                t.type === TransactionType.EXPENSE
            );
        });
        
        const entries: DayBookEntry[] = relevantTransactions.map(t => {
            let inflow = 0;
            let outflow = 0;
            let description = t.description;
            let voucherType = t.type.replace(/_/g, ' ');
            let voucherRef = t.invoiceId || t.receiptNumber || t.id.slice(-6).toUpperCase();

            if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) {
                inflow = t.amount;
                const customer = customers.find(c => c.id === t.customerId);
                description = `${t.type === TransactionType.SALES_RECEIPT ? 'Receipt from' : 'Advance from'} ${customer?.name || 'Unknown'}`;
            } else if (t.type === TransactionType.EXPENSE) {
                outflow = t.amount;
                const expenseAcc = expenseAccounts.find(e => e.id === t.expenseAccountId);
                description = `Paid for ${expenseAcc?.name || t.description}`;
            }

            return { date: t.date, description, voucherType, voucherRef, inflow, outflow };
        });
        
        return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [shopId, fromDate, toDate, transactions, customers, expenseAccounts]);
    
    const cardTotals = useMemo(() => {
        const start = new Date(fromDate + 'T00:00:00');
        const end = new Date(toDate + 'T23:59:59');

        const periodTransactions = transactions.filter(t => {
            if (t.shopId !== shopId) return false;
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        const sales = periodTransactions
            .filter(t => t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE)
            .reduce((sum, t) => sum + (t.amount * (t.quantity || 1)), 0);
        
        const receipts = periodTransactions
            .filter(t => t.paymentAccountId && (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE))
            .reduce((sum, t) => sum + t.amount, 0);

        const payments = periodTransactions
            .filter(t => t.paymentAccountId && t.type === TransactionType.EXPENSE)
            .reduce((sum, t) => sum + t.amount, 0);

        return {
            sales,
            receipts,
            payments,
            netFlow: receipts - payments
        };
    }, [shopId, fromDate, toDate, transactions]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-7xl mx-auto border border-gray-100">
            <h2 className="text-3xl font-black text-gray-800 tracking-tighter mb-2">Day Book</h2>
            <p className="text-gray-500 mb-6">A chronological record of cash & bank transactions.</p>
            
            {/* Filters and Summary */}
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mb-8 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div>
                        <label htmlFor="fromDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">From Date</label>
                        <input 
                            type="date" 
                            id="fromDate"
                            value={fromDate}
                            onChange={e => setFromDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div>
                        <label htmlFor="toDate" className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">To Date</label>
                        <input 
                            type="date" 
                            id="toDate"
                            value={toDate}
                            onChange={e => setToDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-900 font-medium focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Sales</p>
                        <p className="text-2xl font-black text-blue-600">{formatCurrency(cardTotals.sales)}</p>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-green-700 uppercase tracking-wider">Total Receipts</p>
                        <p className="text-2xl font-black text-green-600">{formatCurrency(cardTotals.receipts)}</p>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-red-700 uppercase tracking-wider">Total Payments</p>
                        <p className="text-2xl font-black text-red-600">{formatCurrency(cardTotals.payments)}</p>
                    </div>
                    <div className={`border rounded-xl p-4 text-center ${cardTotals.netFlow >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-orange-50 border-orange-200'}`}>
                        <p className={`text-xs font-bold uppercase tracking-wider ${cardTotals.netFlow >= 0 ? 'text-indigo-700' : 'text-orange-700'}`}>Net Cash Flow</p>
                        <p className={`text-2xl font-black ${cardTotals.netFlow >= 0 ? 'text-indigo-600' : 'text-orange-600'}`}>
                            {formatCurrency(cardTotals.netFlow)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Transaction Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-2xl shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date & Time</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Particulars</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Voucher Type</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Inflow (Debit)</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Outflow (Credit)</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {dayBookEntries.length > 0 ? dayBookEntries.map((entry, index) => (
                            <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(entry.date).toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm font-medium text-gray-800">{entry.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-bold uppercase tracking-tighter">
                                    <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200">{entry.voucherType}</span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                                    {entry.inflow > 0 ? formatCurrency(entry.inflow) : '-'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                                    {entry.outflow > 0 ? formatCurrency(entry.outflow) : '-'}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-20 text-gray-400 italic">
                                    No cash or bank transactions found for the selected date range.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DayBook;
