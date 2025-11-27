
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

interface InvoiceSummary {
    id: string;
    date: Date;
    customerId: string;
    customerName: string;
    totalAmount: number;
    paidAmount: number;
    balance: number;
    status: 'PAID' | 'PARTIAL' | 'CREDIT';
    items: any[];
    reference?: string;
}

const SalesHistory: React.FC = () => {
    const { shopId, transactions, customers, formatCurrency, products } = useAppContext();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // Start of month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
    
    // Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);

    // Data Processing
    const invoices = useMemo(() => {
        const shopTransactions = transactions.filter(t => t.shopId === shopId);
        const invoiceMap: Record<string, InvoiceSummary> = {};

        shopTransactions.forEach(t => {
            // We only care about transactions linked to an invoice
            if (!t.invoiceId) return;

            if (!invoiceMap[t.invoiceId]) {
                const customer = customers.find(c => c.id === t.customerId);
                invoiceMap[t.invoiceId] = {
                    id: t.invoiceId,
                    date: t.date,
                    customerId: t.customerId || '',
                    customerName: customer?.name || 'Unknown Customer',
                    totalAmount: 0,
                    paidAmount: 0,
                    balance: 0,
                    status: 'CREDIT',
                    items: [],
                    reference: t.externalReference || '',
                };
            }

            // If it's a Sale Item (Product)
            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                invoiceMap[t.invoiceId].totalAmount += (t.amount * (t.quantity || 1));
                invoiceMap[t.invoiceId].items.push(t);
                // Update date to match transaction (incase grouping order issues)
                invoiceMap[t.invoiceId].date = t.date; 
            }

            // If it's a Payment/Receipt linked to this invoice
            if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.ADVANCE_USAGE) {
                invoiceMap[t.invoiceId].paidAmount += t.amount;
            }
            
            // If it's a Return
            if (t.type === TransactionType.SALES_RETURN) {
                // Returns reduce the total invoice value effectively, or we track it separately. 
                // For this view, let's reduce the Total Amount so balance reflects accurately.
                invoiceMap[t.invoiceId].totalAmount -= (t.amount * (t.quantity || 1));
            }
        });

        // Calculate Balances & Status
        return Object.values(invoiceMap).map(inv => {
            // Floating point fix
            inv.totalAmount = parseFloat(inv.totalAmount.toFixed(2));
            inv.paidAmount = parseFloat(inv.paidAmount.toFixed(2));
            inv.balance = inv.totalAmount - inv.paidAmount;

            if (inv.balance <= 0.01) inv.status = 'PAID'; // Tolerance for float errors
            else if (inv.paidAmount > 0) inv.status = 'PARTIAL';
            else inv.status = 'CREDIT';

            return inv;
        }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [transactions, shopId, customers]);

    const filteredInvoices = useMemo(() => {
        return invoices.filter(inv => {
            const matchesSearch = 
                inv.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (inv.reference && inv.reference.toLowerCase().includes(searchTerm.toLowerCase()));
            
            const invDate = new Date(inv.date);
            const start = new Date(startDate + 'T00:00:00');
            const end = new Date(endDate + 'T23:59:59');
            const matchesDate = invDate >= start && invDate <= end;

            return matchesSearch && matchesDate;
        });
    }, [invoices, searchTerm, startDate, endDate]);

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold text-gray-800">Sales History & Invoices</h2>
                    <div className="flex flex-wrap gap-3">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="border border-gray-300 rounded-md p-2 text-sm"
                        />
                        <span className="self-center text-gray-500">to</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="border border-gray-300 rounded-md p-2 text-sm"
                        />
                    </div>
                </div>
                
                <div className="mb-4">
                    <input 
                        type="text" 
                        placeholder="Search by Invoice #, Customer Name or Reference..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full border border-gray-300 rounded-md p-3 pl-4 focus:ring-primary focus:border-primary"
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredInvoices.length > 0 ? filteredInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(inv.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        <button 
                                            onClick={() => setSelectedInvoice(inv)}
                                            className="text-primary hover:text-primary-dark font-medium underline text-left"
                                        >
                                            {inv.id}
                                        </button>
                                        {inv.reference && <span className="block text-xs text-gray-400">Ref: {inv.reference}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{inv.customerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${inv.status === 'PAID' ? 'bg-green-100 text-green-800' : 
                                              inv.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-800' : 
                                              'bg-red-100 text-red-800'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">{formatCurrency(inv.paidAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-bold">{formatCurrency(inv.balance)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">No invoices found for the selected period.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Invoice #{selectedInvoice.id}</h3>
                                <p className="text-sm text-gray-500">{new Date(selectedInvoice.date).toLocaleDateString()} | {selectedInvoice.customerName}</p>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-6">
                            <h4 className="text-sm font-bold text-gray-700 uppercase mb-3">Items Purchased</h4>
                            <table className="min-w-full divide-y divide-gray-200 mb-6">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Product</th>
                                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Qty</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Price</th>
                                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {selectedInvoice.items.map((item: any, idx: number) => {
                                        const product = products.find(p => p.id === item.productId);
                                        return (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-sm text-gray-900">{product?.name || 'Unknown'}</td>
                                                <td className="px-4 py-2 text-sm text-center text-gray-700">{item.quantity}</td>
                                                <td className="px-4 py-2 text-sm text-right text-gray-700">{formatCurrency(item.amount)}</td>
                                                <td className="px-4 py-2 text-sm text-right font-medium text-gray-900">{formatCurrency(item.amount * item.quantity)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-gray-50 border-t border-gray-200">
                                    <tr>
                                        <td colSpan={3} className="px-4 py-3 text-right font-bold text-gray-900">Total Invoice Value</td>
                                        <td className="px-4 py-3 text-right font-bold text-primary">{formatCurrency(selectedInvoice.totalAmount)}</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                <div>
                                    <p className="text-xs text-gray-500">Amount Paid</p>
                                    <p className="text-lg font-bold text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-gray-500">Balance Due</p>
                                    <p className={`text-lg font-bold ${selectedInvoice.balance > 0 ? 'text-red-600' : 'text-gray-800'}`}>
                                        {formatCurrency(selectedInvoice.balance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                            <button onClick={() => setSelectedInvoice(null)} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-6 rounded-lg">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
