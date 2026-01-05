
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType, InvoiceSummary, Transaction } from '../../../types';
import { ShopView } from '../ShopDashboard';

type SortField = 'date' | 'id' | 'customerName' | 'status';

interface SortConfig {
    field: SortField;
    direction: 'asc' | 'desc';
}

interface SalesHistoryProps {
  onNavigate?: (view: ShopView) => void;
}

const SalesHistory: React.FC<SalesHistoryProps> = ({ onNavigate }) => {
    const { shopId, transactions, customers, formatCurrency, products, setInvoiceToEdit, deleteInvoice } = useAppContext();
    
    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]); // Start of month
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Today
    
    // Sorting State
    const [sortConfig, setSortConfig] = useState<SortConfig>({ field: 'date', direction: 'desc' });

    // Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<InvoiceSummary | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmInput, setDeleteConfirmInput] = useState('');
    const [securityPin, setSecurityPin] = useState('');
    const [deleteError, setDeleteError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);


    // Data Processing
    const invoices = useMemo(() => {
        const shopTransactions = transactions.filter(t => t.shopId === shopId);
        const invoiceMap: Record<string, InvoiceSummary> = {};

        shopTransactions.forEach(t => {
            if (!t.invoiceId) return;
            const invoiceKey = t.invoiceId;

            if (!invoiceMap[invoiceKey]) {
                if (!t.customerId) return; 

                const customer = customers.find(c => c.id === t.customerId);
                invoiceMap[invoiceKey] = {
                    id: t.invoiceId,
                    date: t.date,
                    customerId: t.customerId,
                    customerName: customer?.name || 'Unknown Customer',
                    totalAmount: 0,
                    paidAmount: 0,
                    balance: 0,
                    status: 'CREDIT',
                    items: [],
                    transactionDocs: [],
                    reference: t.externalReference || '',
                };
            }
            
            const inv = invoiceMap[invoiceKey];
            inv.transactionDocs.push(t);

            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                inv.totalAmount += (t.amount * (t.quantity || 1));
                inv.items.push(t);
                if (new Date(t.date) > new Date(inv.date)) inv.date = t.date;
                if (t.externalReference && !inv.reference) inv.reference = t.externalReference;
            }

            if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.ADVANCE_USAGE) {
                inv.paidAmount += t.amount;
            }
            
            if (t.type === TransactionType.SALES_RETURN) {
                inv.totalAmount -= (t.amount * (t.quantity || 1));
            }
        });

        return Object.values(invoiceMap).map(inv => {
            inv.balance = inv.totalAmount - inv.paidAmount;
            inv.status = inv.balance <= 0.01 ? 'PAID' : inv.paidAmount > 0 ? 'PARTIAL' : 'CREDIT';
            return inv;
        });

    }, [transactions, shopId, customers]);

    const handleSort = (field: SortField) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedAndFilteredInvoices = useMemo(() => {
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
        }).sort((a, b) => {
            const valA = a[sortConfig.field];
            const valB = b[sortConfig.field];

            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [invoices, searchTerm, startDate, endDate, sortConfig]);
    
    const closeModal = () => {
        setSelectedInvoice(null);
        setShowDeleteConfirm(false);
        setDeleteConfirmInput('');
        setSecurityPin('');
        setDeleteError('');
    };

    const handleEditInvoice = () => {
        if (!selectedInvoice || !onNavigate) return;
        setInvoiceToEdit(selectedInvoice);
        onNavigate('sales');
        closeModal();
    };

    const handleConfirmDelete = async () => {
        setDeleteError('');
        if (securityPin !== '7860') {
            setDeleteError('Incorrect Supervisor PIN.');
            return;
        }
        if (!selectedInvoice || deleteConfirmInput !== selectedInvoice.id) {
            setDeleteError('Invoice ID does not match.');
            return;
        }

        setIsDeleting(true);
        try {
            const idsToDelete = selectedInvoice.transactionDocs.map(doc => doc.id);
            await deleteInvoice(idsToDelete);
            closeModal();
        } catch (error) {
            console.error("Failed to delete invoice:", error);
            setDeleteError("Deletion failed. Please try again.");
        } finally {
            setIsDeleting(false);
        }
    };

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
            <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-black text-gray-800 tracking-tighter">Sales History & Invoices</h2>
                    <div className="flex flex-wrap gap-3">
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary/20" />
                        <span className="self-center text-gray-400 font-bold">to</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-primary/20" />
                    </div>
                </div>
                
                <div className="mb-6">
                    <input type="text" placeholder="Search by Invoice #, Customer Name or Reference..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full border border-gray-300 rounded-xl p-3 pl-4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm" />
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th onClick={() => handleSort('date')} className={headerClass}><div className="flex items-center">Date <SortIcon field="date" /></div></th>
                                <th onClick={() => handleSort('id')} className={headerClass}><div className="flex items-center">Invoice # <SortIcon field="id" /></div></th>
                                <th onClick={() => handleSort('customerName')} className={headerClass}><div className="flex items-center">Customer <SortIcon field="customerName" /></div></th>
                                <th onClick={() => handleSort('status')} className="px-6 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest cursor-pointer group hover:bg-gray-100 transition-colors select-none"><div className="flex items-center justify-center">Status <SortIcon field="status" /></div></th>
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
                                        <button onClick={() => setSelectedInvoice(inv)} className="text-primary hover:text-primary-dark font-black underline text-left disabled:text-gray-400 disabled:no-underline" disabled={inv.id === 'OPENING-BAL'}>{inv.id}</button>
                                        {inv.reference && <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-tight">Ref: {inv.reference}</span>}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">{inv.customerName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-center"><span className={`px-2 py-0.5 inline-flex text-[10px] leading-4 font-black rounded-full uppercase tracking-tighter shadow-sm border ${inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-100' : inv.status === 'PARTIAL' ? 'bg-yellow-50 text-yellow-700 border-yellow-100' : 'bg-red-50 text-red-700 border-red-100'}`}>{inv.status}</span></td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900">{formatCurrency(inv.totalAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-black">{formatCurrency(inv.paidAmount)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 font-black bg-gray-50/50">{formatCurrency(inv.balance)}</td>
                                </tr>
                            )) : (<tr><td colSpan={7} className="px-6 py-20 text-center text-gray-400 italic">No invoices found for the selected criteria.</td></tr>)}
                        </tbody>
                    </table>
                </div>
            </div>

            {selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col transform transition-all animate-scale-up overflow-hidden">
                        <div className="p-8 border-b border-gray-100 flex justify-between items-start bg-gray-50">
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic">Invoice Details</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">ID: #{selectedInvoice.id} {selectedInvoice.reference && `• REF: ${selectedInvoice.reference}`}</p>
                                <p className="text-sm text-gray-600 font-medium mt-2">{new Date(selectedInvoice.date).toLocaleDateString()} | {selectedInvoice.customerName}</p>
                            </div>
                            <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-2">&times;</button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8">
                            {!showDeleteConfirm ? (
                            <>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Items Manifest</h4>
                                <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-[10px] font-black text-gray-500 uppercase tracking-widest">Product</th><th className="px-4 py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">Qty</th><th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Unit Price</th><th className="px-4 py-3 text-right text-[10px] font-black text-gray-500 uppercase tracking-widest">Subtotal</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {selectedInvoice.items.map((item: Transaction, idx: number) => { const product = products.find(p => p.id === item.productId); return (<tr key={idx}><td className="px-4 py-3 text-sm text-gray-900 font-bold">{product?.name || 'Unknown'}</td><td className="px-4 py-3 text-sm text-center text-gray-700 font-medium">{item.quantity}</td><td className="px-4 py-3 text-sm text-right text-gray-700 font-medium">{formatCurrency(item.amount)}</td><td className="px-4 py-3 text-sm text-right font-black text-gray-900">{formatCurrency(item.amount * (item.quantity || 1))}</td></tr>); })}
                                        </tbody>
                                        <tfoot className="bg-gray-50 border-t border-gray-200"><tr><td colSpan={3} className="px-4 py-4 text-right text-xs font-black text-gray-500 uppercase tracking-widest">Total Invoice Value</td><td className="px-4 py-4 text-right text-lg font-black text-primary italic">{formatCurrency(selectedInvoice.totalAmount)}</td></tr></tfoot>
                                    </table>
                                </div>
                                <div className="grid grid-cols-2 gap-6 mt-8">
                                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100"><p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Total Amount Paid</p><p className="text-2xl font-black text-green-600">{formatCurrency(selectedInvoice.paidAmount)}</p></div>
                                    <div className={`p-6 rounded-2xl border ${selectedInvoice.balance > 0.01 ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'}`}><p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${selectedInvoice.balance > 0.01 ? 'text-red-700' : 'text-gray-400'}`}>Remaining Balance</p><p className={`text-2xl font-black ${selectedInvoice.balance > 0.01 ? 'text-red-600' : 'text-gray-900'}`}>{formatCurrency(selectedInvoice.balance)}</p></div>
                                </div>
                            </>
                            ) : (
                            <div className="p-8 bg-red-50 border-4 border-dashed border-red-200 rounded-2xl animate-fade-in">
                                <div className="text-center"><div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></div><h3 className="text-2xl font-black text-red-800">Confirm Deletion</h3><p className="text-red-700 mt-2 font-medium leading-relaxed">This action is permanent and requires Supervisor authorization. All ledger entries for this invoice will be erased.</p></div>
                                <div className="mt-8 space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 text-center mb-2">To confirm, type the full Invoice ID: <br/><span className="font-mono bg-red-100 text-red-700 p-1 rounded-md text-base">{selectedInvoice.id}</span></label>
                                        <input type="text" value={deleteConfirmInput} onChange={(e) => { setDeleteConfirmInput(e.target.value); setDeleteError(''); }} className="w-full text-center font-mono text-lg border-2 border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 transition-colors" autoFocus />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 text-center mb-2">Enter Supervisor PIN</label>
                                        <input type="password" value={securityPin} onChange={(e) => { setSecurityPin(e.target.value); setDeleteError(''); }} className="w-full text-center font-mono tracking-widest text-lg border-2 border-gray-300 rounded-lg p-2 focus:ring-red-500 focus:border-red-500 transition-colors" placeholder="****" />
                                    </div>
                                    {deleteError && <p className="text-center text-red-600 font-bold text-sm animate-pulse">{deleteError}</p>}
                                </div>
                            </div>
                            )}
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                            {!showDeleteConfirm ? (
                                <>
                                    <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 font-black py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 text-sm uppercase flex items-center space-x-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg><span>Delete Invoice</span></button>
                                    <div className="space-x-3"><button onClick={closeModal} className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-800 font-black py-2.5 px-6 rounded-xl transition-all shadow-sm active:scale-95 text-sm uppercase">Close</button><button onClick={handleEditInvoice} className="bg-blue-600 hover:bg-blue-700 text-white font-black py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95 text-sm uppercase">Edit Invoice</button></div>
                                </>
                            ) : (
                                <div className="w-full flex space-x-3">
                                    <button onClick={() => { setShowDeleteConfirm(false); setDeleteError(''); }} disabled={isDeleting} className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-black py-3 rounded-xl transition-all uppercase text-xs tracking-widest disabled:opacity-50">Cancel</button>
                                    <button onClick={handleConfirmDelete} disabled={deleteConfirmInput !== selectedInvoice.id || securityPin !== '7860' || isDeleting} className={`flex-1 py-3 text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg ${deleteConfirmInput !== selectedInvoice.id || securityPin !== '7860' || isDeleting ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-95'}`}>{isDeleting ? 'Erasing Data...' : 'Confirm Permanent Deletion'}</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesHistory;
