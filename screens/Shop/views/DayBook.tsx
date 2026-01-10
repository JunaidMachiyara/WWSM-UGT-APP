
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType, Transaction } from '../../../types';

interface DayBookEntry extends Transaction {
    customerName?: string;
    productName?: string;
    expenseName?: string;
}

// Fixed: Moving helper components outside to avoid re-creation on every render 
// and resolve TypeScript property 'children' inference issues.
const Th: React.FC<{ children: React.ReactNode; align?: 'left' | 'right' | 'center' }> = ({ children, align = 'left' }) => (
    <th className={`px-4 py-3 text-${align} text-[10px] font-black text-gray-400 uppercase tracking-widest`}>{children}</th>
);

const TableHeader: React.FC<{ title: string; icon: React.ReactNode; colorClass: string }> = ({ title, icon, colorClass }) => (
    <div className={`flex items-center space-x-2 mb-4 p-3 ${colorClass} rounded-xl`}>
        {icon}
        <h3 className="font-black uppercase tracking-tighter italic">{title}</h3>
    </div>
);

const DayBook: React.FC = () => {
    const { shopId, transactions, customers, expenseAccounts, products, formatCurrency, shops } = useAppContext();
    
    const today = new Date().toISOString().split('T')[0];
    const [fromDate, setFromDate] = useState(today);
    const [toDate, setToDate] = useState(today);

    const currentShopName = useMemo(() => {
        return shops.find(s => s.id === shopId)?.name || '';
    }, [shops, shopId]);

    // Data Processing: Filter and Categorize
    const categorizedData = useMemo(() => {
        const start = new Date(fromDate + 'T00:00:00');
        const end = new Date(toDate + 'T23:59:59');

        const shopTrans = transactions.filter(t => {
            if (t.shopId !== shopId) return false;
            const tDate = new Date(t.date);
            return tDate >= start && tDate <= end;
        });

        const sales: DayBookEntry[] = [];
        const receipts: DayBookEntry[] = [];
        const payments: DayBookEntry[] = [];

        shopTrans.forEach(t => {
            const customer = customers.find(c => c.id === t.customerId);
            const product = products.find(p => p.id === t.productId);
            const expense = expenseAccounts.find(e => e.id === t.expenseAccountId);
            
            const entry: DayBookEntry = { 
                ...t, 
                customerName: customer?.name || 'Walk-in',
                productName: product?.name,
                expenseName: expense?.name
            };

            // 1. Sales Register (Itemized Sales - Includes Credit)
            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                sales.push(entry);
            } 
            // 2. Cash Inflows (Money physically received)
            else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) {
                receipts.push(entry);
            }
            // 3. Expenditures (Money spent)
            else if (t.type === TransactionType.EXPENSE) {
                payments.push(entry);
            }
            // 4. Returns (As payments if cash refund, or noted)
            else if (t.type === TransactionType.SALES_RETURN) {
                if (t.paymentAccountId) {
                    payments.push({ ...entry, description: `Refund: ${entry.description}` });
                }
            }
        });

        const sortByDate = (a: DayBookEntry, b: DayBookEntry) => new Date(a.date).getTime() - new Date(b.date).getTime();

        return {
            sales: sales.sort(sortByDate),
            receipts: receipts.sort(sortByDate),
            payments: payments.sort(sortByDate)
        };
    }, [shopId, fromDate, toDate, transactions, customers, products, expenseAccounts]);

    const totals = useMemo(() => {
        const salesVal = categorizedData.sales.reduce((s, t) => s + (t.amount * (t.quantity || 1)), 0);
        const receiptsVal = categorizedData.receipts.reduce((s, t) => s + t.amount, 0);
        const paymentsVal = categorizedData.payments.reduce((s, t) => s + t.amount, 0);
        
        return {
            sales: salesVal,
            receipts: receiptsVal,
            payments: paymentsVal,
            netCash: receiptsVal - paymentsVal
        };
    }, [categorizedData]);

    return (
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-7xl mx-auto border border-gray-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-800 tracking-tighter">
                        Day Book: <span className="text-primary uppercase">{currentShopName}</span>
                    </h2>
                    <p className="text-gray-400 text-sm font-medium">Daily transaction audit and reconciliation.</p>
                </div>
                <div className="flex bg-gray-100 p-1.5 rounded-xl shadow-inner border border-gray-200">
                    <input 
                        type="date" 
                        value={fromDate}
                        onChange={e => setFromDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                    />
                    <span className="px-2 text-gray-400 font-black self-center">TO</span>
                    <input 
                        type="date" 
                        value={toDate}
                        onChange={e => setToDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm font-bold text-gray-700"
                    />
                </div>
            </div>

            {/* Regional Totals Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
                <div className="bg-blue-600 p-6 rounded-3xl text-white shadow-xl shadow-blue-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Gross Sales (Total Value)</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.sales)}</p>
                </div>
                <div className="bg-green-600 p-6 rounded-3xl text-white shadow-xl shadow-green-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Cash Inflow (Actual Collected)</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.receipts)}</p>
                </div>
                <div className="bg-red-600 p-6 rounded-3xl text-white shadow-xl shadow-red-100">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Total Expenditures</p>
                    <p className="text-3xl font-black">{formatCurrency(totals.payments)}</p>
                </div>
                <div className="bg-gray-900 p-6 rounded-3xl text-white shadow-xl shadow-gray-200">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">Net Flow (Receipts - Exp)</p>
                    <p className={`text-3xl font-black ${totals.netCash >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(totals.netCash)}
                    </p>
                </div>
            </div>

            <div className="space-y-16">
                
                {/* Section 1: Sales Register */}
                <section>
                    <TableHeader 
                        title="Sales Register (Gross Trading)" 
                        colorClass="bg-blue-50 text-blue-800"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>}
                    />
                    <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>Timestamp</Th>
                                    <Th>Particulars</Th>
                                    <Th>Customer</Th>
                                    <Th>Method</Th>
                                    <Th align="right">Qty</Th>
                                    <Th align="right">Unit Price</Th>
                                    <Th align="right">Subtotal</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {categorizedData.sales.length > 0 ? categorizedData.sales.map((t, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{t.productName || 'Sale'} <span className="text-[10px] text-gray-400 ml-1">#{t.invoiceId}</span></td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{t.customerName}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${t.type === TransactionType.CASH_SALE ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {t.type === TransactionType.CASH_SALE ? 'Cash' : 'Credit'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-600 font-bold">{t.quantity}</td>
                                        <td className="px-4 py-3 text-sm text-right text-gray-400">{formatCurrency(t.amount)}</td>
                                        <td className="px-4 py-3 text-sm text-right font-black text-gray-900">{formatCurrency(t.amount * (t.quantity || 1))}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={7} className="py-10 text-center text-gray-400 italic">No sales recorded for this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 2: Cash Receipts */}
                <section>
                    <TableHeader 
                        title="Cash & Bank Inflows (Receipts)" 
                        colorClass="bg-green-50 text-green-800"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
                    />
                    <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>Timestamp</Th>
                                    <Th>Source / Description</Th>
                                    <Th>Customer Identity</Th>
                                    <Th>Voucher Type</Th>
                                    <Th align="right">Amount In</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {categorizedData.receipts.length > 0 ? categorizedData.receipts.map((t, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{t.description || 'Receipt'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500">{t.customerName}</td>
                                        <td className="px-4 py-3 text-[10px] font-black text-gray-400 uppercase tracking-tighter">{t.type.replace(/_/g, ' ')}</td>
                                        <td className="px-4 py-3 text-sm text-right font-black text-green-600">{formatCurrency(t.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={5} className="py-10 text-center text-gray-400 italic">No cash receipts found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 3: Expenditures */}
                <section>
                    <TableHeader 
                        title="Shop Expenditures (Payments)" 
                        colorClass="bg-red-50 text-red-800"
                        icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>}
                    />
                    <div className="overflow-hidden border border-gray-100 rounded-2xl shadow-sm">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <Th>Timestamp</Th>
                                    <Th>Particulars / Expense Head</Th>
                                    <Th>Notes</Th>
                                    <Th align="right">Amount Out</Th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {categorizedData.payments.length > 0 ? categorizedData.payments.map((t, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3 text-xs text-gray-400 font-mono">{new Date(t.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                                        <td className="px-4 py-3 text-sm font-bold text-gray-900">{t.expenseName || 'General Expense'}</td>
                                        <td className="px-4 py-3 text-sm text-gray-500 italic truncate max-w-xs">{t.description}</td>
                                        <td className="px-4 py-3 text-sm text-right font-black text-red-600">{formatCurrency(t.amount)}</td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={4} className="py-10 text-center text-gray-400 italic">No payments recorded today.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <div className="mt-12 pt-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 -mx-8 px-8 -mb-8 rounded-b-lg">
                <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">End of Daily Log</p>
                <div className="flex space-x-6">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Sales: <span className="text-gray-900 ml-1">{formatCurrency(totals.sales)}</span></p>
                    <p className="text-[10px] font-black text-gray-400 uppercase">Net Flow: <span className="text-gray-900 ml-1">{formatCurrency(totals.netCash)}</span></p>
                </div>
            </div>
        </div>
    );
};

export default DayBook;
