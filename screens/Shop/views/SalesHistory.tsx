
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

type SortField = 'date' | 'id' | 'customerName' | 'status';

interface SortConfig {
    field: SortField;
    direction: 'asc' | 'desc';
}

const SalesHistory: React.FC = () => {
    const { shopId, transactions, customers, formatCurrency, products } = useAppContext();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // Start of month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
    
    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });

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
        });

    }, [transactions, shopId, customers]);

    const handleSort = (field: SortField) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.field === field && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ field, direction });
    };

    const sortedAndFilteredInvoices = useMemo(() => {
        const filtered = invoices.filter(inv => {
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

        return filtered.sort((a, b) => {
            const valA = a[sortConfig.field];
            const valB = b[sortConfig.field];

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [invoices, searchTerm, startDate, endDate, sortConfig]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortConfig.field !== field) return (
            <svg className="w-3 h-3 ml-1 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
        );
        return sortConfig.direction === 'asc' ? (
            <svg className="w-3 h-3 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
            </svg>
        ) : (
            <svg className="w-3 h-3 ml-1 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
        );
    };

    const headerClass = "px-6 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer group hover:bg-gray-100 transition-colors select-none";

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tighter">Sales History & Invoices</h2>
                    <div className="flex flex-wrap gap-3">
                        <input 
                            type="date" 
                            value={startDate} 
                            onChange={e => setStartDate(e.target.value)} 
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary/20"
                        />
                        <span className="self-center text-gray-400 font-bold">to</span>
                        <input 
                            type="date" 
                            value={endDate} 
                            onChange={e => setEndDate(e.target.value)} 
                            className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                </div>
                
                <div className="mb-6">
                    <input 
                        type="text" 
                        placeholder="Search by Invoice #, Customer Name or Reference..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)} 
                        className="w-full border border-gray-300 rounded-xl p-3 pl-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    />
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th onClick={() => handleSort('date')} className={headerClass}>
                                    <div className="flex items-center">Date <SortIcon field="date" /></div>
                                </th>
                                <th onClick={() => handleSort('id')} className={headerClass}>
                                    <div className="flex items-center">Invoice # <SortIcon field="id" /></div>
                                </th>
                                <th onClick={() => handleSort('customerName')} className={headerClass}>
                                    <div className="flex items-center">Customer <SortIcon field="customerName" /></div>
                                </th>
                                <th onClick={() => handleSort('status')} className="px-6 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer group hover:bg-gray-100 transition-colors select-none">
                                    <div className="flex items-center justify-center">Status <SortIcon field="status" /></div>
                                </th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Paid</th>
                                <th className="px-6 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {sortedAndFilteredInvoices.length > 0 ? sortedAndFilteredInvoices.map(inv => (
                                <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">{new Date(inv.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                        <button 
                                            onClick={() => setSelectedInvoice(inv)}
                                            className="text-primary hover:text-primary-dark font-black underline text-left"
                                        >
                                            {inv.id}
                                        </button>
                                        {inv.reference && <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tight">Ref: {inv.reference}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{inv.customerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center">
                                        <span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-full uppercase tracking-tighter shadow-sm border ${
                                            inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : 
                                            inv.status === 'PARTIAL' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 
                                            'bg-red-50 text-red-700 border-red-100'}`}>
                                            {inv.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-black">{formatCurrency(inv.paidAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-black bg-gray-50/50">{formatCurrency(inv.balance)}</td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">No invoices found for the selected criteria.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Details Modal */}
            {selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all animate-scale-up overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Invoice Details</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">ID: #{selectedInvoice.id}</p>
                                <p className="text-sm text-gray-600 font-medium mt-2">{new Date(selectedInvoice.date).toLocaleDateString()} | {selectedInvoice.customerName}</p>
                            </div>
                            <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Items Manifest</h4>
                            <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Product</th>
                                            <th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Qty</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Unit Price</th>
                                            <th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {selectedInvoice.items.map((item: any, idx: number) => {
                                            const product = products.find(p => p.id === item.productId);
                                            return (
                                                <tr key={idx}>
                                                    <td className="px-4 py-3 text-sm text-gray-900 font-bold">{product?.name || 'Unknown'}</td>
                                                    <td className="px-4 py-3 text-sm text-center text-gray-700 font-medium">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-sm text-right text-gray-700 font-medium">{formatCurrency(item.amount)}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-black text-gray-900">{formatCurrency(item.amount * item.quantity)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                    <tfoot className="bg-gray-50 border-t border-gray-200">
                                        <tr>
                                            <td colSpan={3} className="px-4 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Total Invoice Value</td>
                                            <td className="px-4 py-4 text-right text-lg font-black text-primary italic">{formatCurrency(selectedInvoice.totalAmount)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-8">
                                <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Total Amount Paid</p>
                                    <p className="text-2xl font-black text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</p>
                                </div>
                                <div className={`p-6 rounded-2xl border ${selectedInvoice.balance > 0.01 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedInvoice.balance > 0.01 ? 'text-red-700' : 'text-gray-400'}`}>Remaining Balance</p>
                                    <p className={`text-2xl font-black ${selectedInvoice.balance > 0.01 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {formatCurrency(selectedInvoice.balance)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button onClick={() => setSelectedInvoice(null)} className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 font-black py-2.5 px-8 rounded-xl transition-all shadow-sm active:scale-95 text-sm uppercase">Close Window</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
