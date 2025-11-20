
import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

interface GroupedLedgerEntry {
    date: Date;
    description: string;
    amount: number;
    type: TransactionType;
}

const SupplierLedger: React.FC = () => {
  const { transactions, shopId, formatCurrency } = useAppContext();

  const ledgerEntries = useMemo(() => {
    const shopTransactions = transactions.filter(t => t.shopId === shopId);
    let runningBalance = 0;

    // Only show Head Office Transactions (IMPORT bills)
    const relevantTransactions = shopTransactions.filter(t => t.type === TransactionType.IMPORT)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group transactions by Description (assuming description contains shipment info)
    // This avoids listing every single product line item separately in the ledger
    const grouped = relevantTransactions.reduce((acc, t) => {
        const key = `${t.description}-${new Date(t.date).toISOString().split('T')[0]}`; 
        if (!acc[key]) {
            acc[key] = {
                date: t.date,
                description: t.description,
                amount: 0,
                type: t.type,
            };
        }
        acc[key].amount += (t.amount * (t.quantity || 1));
        return acc;
    }, {} as Record<string, GroupedLedgerEntry>);

    const sortedGroups = (Object.values(grouped) as GroupedLedgerEntry[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return sortedGroups.map(entry => {
        // For Suppliers, incoming bills (IMPORT) are Credits (increase payable)
        runningBalance += entry.amount;
        return { ...entry, balance: runningBalance };
    });

  }, [transactions, shopId]);

  const finalBalance = ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0;

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">Supplier Ledger</h2>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
                Account: <span className="text-primary">Head Office (Stock Payables)</span>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
                Tracks liability for Goods and Freight received from Head Office.
            </p>
             <div className="mt-4 flex justify-between items-end">
                <div>
                    <p className="text-sm font-medium text-gray-600">Total Payable Balance</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(finalBalance)}</p>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction Type</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount (Credit)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Running Balance</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {ledgerEntries.length > 0 ? ledgerEntries.map((entry, index) => (
                        <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(entry.date).toLocaleDateString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    BILL
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-medium">{formatCurrency(entry.amount)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-800">{formatCurrency(entry.balance)}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={5} className="text-center py-10 text-gray-500">No transactions found for this account.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default SupplierLedger;
