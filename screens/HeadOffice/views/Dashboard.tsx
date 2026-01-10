
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shop, TransactionType, Product, ShopAccount, Customer } from '../../../types';
import ShopPerformanceChart from '../../../components/charts/ShopPerformanceChart';
import SalesTrendChart from '../../../components/charts/SalesTrendChart';

export type DrillDownType = 'CASH' | 'INVENTORY' | 'RECEIVABLES' | 'PAYABLES' | 'MONTH_EXP' | 'SALES_7D' | 'RECEIPTS_7D' | 'EXP_7D';

interface ShopStats {
    id: string;
    name: string;
    location: string;
    cashInHand: number;
    inventoryUnits: number;
    inventoryWorth: number;
    receivables: number;
    payables: number;
    monthExpenses: number;
    sales7d: number;
    receipts7d: number;
    expenses7d: number;
    currencySymbol: string;
    currencyRate: number;
    currencyId: string;
}

interface ShopSummaryCardProps {
  stats: ShopStats;
  onClick: () => void;
  onDetailClick: (type: DrillDownType) => void;
}

const ShopSummaryCard: React.FC<ShopSummaryCardProps> = ({ stats, onClick, onDetailClick }) => {
    const { formatCurrency } = useAppContext();
    const [viewMode, setViewMode] = useState<'LOCAL' | 'USD'>(stats.currencyId === 'USD' ? 'USD' : 'LOCAL');

    const formatDisplay = (amountInBase: number) => {
        if (viewMode === 'USD') {
            return `$${amountInBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        }
        const amount = amountInBase * (stats.currencyRate || 1);
        return `${stats.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const StatItem = ({ label, value, className = '', clickable = false, onClickAction }: { label: string, value: string, className?: string, clickable?: boolean, onClickAction?: () => void }) => (
        <div 
            onClick={clickable ? onClickAction : undefined}
            className={`flex justify-between items-baseline py-2 border-b border-gray-100 last:border-0 px-2 rounded-lg transition-all ${clickable ? 'cursor-pointer hover:bg-blue-50 group/item' : ''}`}
        >
            <div className="flex items-center">
                <span className={`text-[10px] font-bold text-gray-400 uppercase tracking-wider ${clickable ? 'group-hover/item:text-primary transition-colors' : ''}`}>{label}</span>
                {clickable && (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-2.5 w-2.5 ml-1.5 text-blue-300 opacity-0 group-hover/item:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                )}
            </div>
            <span className={`text-sm font-black ${className}`}>{value}</span>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col hover:shadow-xl hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-4 border-b-2 border-gray-100 flex justify-between items-start">
                <div>
                    <h3 className="text-lg font-black text-primary uppercase tracking-tighter italic">{stats.name}</h3>
                    <p className="text-xs font-medium text-gray-400">{stats.location}</p>
                </div>
                {stats.currencyId !== 'USD' && (
                    <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                        <button 
                            onClick={() => setViewMode('LOCAL')}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded-md transition-all ${viewMode === 'LOCAL' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            {stats.currencyId}
                        </button>
                        <button 
                            onClick={() => setViewMode('USD')}
                            className={`px-1.5 py-0.5 text-[9px] font-black rounded-md transition-all ${viewMode === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            USD
                        </button>
                    </div>
                )}
            </div>
            <div className="p-4 space-y-0.5 flex-1">
                <StatItem 
                    label="Cash in Hand" 
                    value={formatDisplay(stats.cashInHand)} 
                    className="text-green-600" 
                    clickable 
                    onClickAction={() => onDetailClick('CASH')}
                />
                <StatItem 
                    label="Inventory (Units)" 
                    value={stats.inventoryUnits.toLocaleString()} 
                    className="text-gray-900" 
                    clickable 
                    onClickAction={() => onDetailClick('INVENTORY')}
                />
                <StatItem 
                    label="Inventory Worth" 
                    value={formatDisplay(stats.inventoryWorth)} 
                    className="text-gray-900" 
                    clickable 
                    onClickAction={() => onDetailClick('INVENTORY')}
                />
                <StatItem 
                    label="Receivables" 
                    value={formatDisplay(stats.receivables)} 
                    className="text-orange-600" 
                    clickable
                    onClickAction={() => onDetailClick('RECEIVABLES')}
                />
                <StatItem 
                    label="Payables (to HO)" 
                    value={formatDisplay(stats.payables)} 
                    className="text-red-600" 
                    clickable
                    onClickAction={() => onDetailClick('PAYABLES')}
                />
                <StatItem 
                    label="Expenses (Month)" 
                    value={formatDisplay(stats.monthExpenses)} 
                    className="text-red-500" 
                    clickable
                    onClickAction={() => onDetailClick('MONTH_EXP')}
                />
                
                <div className="pt-3 pb-1">
                    <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-widest border-b border-gray-50">Last 7 Days Activity</p>
                </div>
                
                <StatItem 
                    label="Sales" 
                    value={formatDisplay(stats.sales7d)} 
                    className="text-blue-600" 
                    clickable
                    onClickAction={() => onDetailClick('SALES_7D')}
                />
                <StatItem 
                    label="Receipts" 
                    value={formatDisplay(stats.receipts7d)} 
                    className="text-green-500" 
                    clickable
                    onClickAction={() => onDetailClick('RECEIPTS_7D')}
                />
                <StatItem 
                    label="Expenses" 
                    value={formatDisplay(stats.expenses7d)} 
                    className="text-red-500" 
                    clickable
                    onClickAction={() => onDetailClick('EXP_7D')}
                />
            </div>
            <div className="p-3 bg-gray-50/70 rounded-b-2xl mt-auto">
                <button
                    onClick={onClick}
                    className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white font-black py-2 rounded-lg transition-all text-xs uppercase tracking-widest"
                >
                    Manage Shop Portal
                </button>
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
  const { shops, transactions, products, shopAccounts, switchShop, currencies, formatCurrency, customers, expenseAccounts } = useAppContext();

  // State for detail modals
  const [detailModal, setDetailModal] = useState<{ type: DrillDownType, shopId: string } | null>(null);

  const shopStats = useMemo(() => {
    const activeShops = shops.filter(s => s.isActive);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    return activeShops.map(shop => {
        const shopTrans = transactions.filter(t => t.shopId === shop.id);
        const shopAccs = shopAccounts.filter(a => a.shopId === shop.id);
        const currency = currencies.find(c => c.id === shop.currencyCode) || { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };

        // Cash in Hand
        let cashInHand = shopAccs.reduce((sum, acc) => sum + acc.openingBalance, 0);
        shopTrans.forEach(t => {
            if (t.paymentAccountId) {
                if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) {
                    cashInHand += t.amount;
                } else if (t.type === TransactionType.EXPENSE || t.type === TransactionType.ADVANCE_USAGE) {
                    cashInHand -= t.amount;
                }
            }
        });

        // Inventory
        const inventoryMap: Record<string, number> = {};
        shopTrans.forEach(t => {
            if (t.productId) {
                const qty = t.quantity || 0;
                inventoryMap[t.productId] = inventoryMap[t.productId] || 0;
                if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.OPENING_STOCK) {
                    inventoryMap[t.productId] += qty;
                } else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                    inventoryMap[t.productId] -= qty;
                }
            }
        });
        let inventoryUnits = 0;
        let inventoryWorth = 0;
        Object.entries(inventoryMap).forEach(([productId, quantity]) => {
            if (quantity > 0) {
                inventoryUnits += quantity;
                const product = products.find(p => p.id === productId);
                if (product) {
                    inventoryWorth += quantity * product.hoCost;
                }
            }
        });

        // Receivables
        let receivables = 0;
        shopTrans.forEach(t => {
            if (t.invoiceId === 'OPENING-BAL' && t.type === TransactionType.CREDIT_SALE) {
                receivables += t.amount;
            } else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                receivables += t.amount * (t.quantity || 1);
            } else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.ADVANCE_USAGE) {
                receivables -= t.amount;
            } else if (t.type === TransactionType.SALES_RETURN) {
                receivables -= t.amount * (t.quantity || 1);
            }
        });

        // Payables (to HO)
        let payables = 0;
        shopTrans.forEach(t => {
            if (t.invoiceId === 'HO-OPENING-BAL') {
                payables += t.amount;
            } else if (t.type === TransactionType.IMPORT) {
                payables += t.amount * (t.quantity || 1);
            } else if ((t as any).expenseCategory === 'HEAD_OFFICE' && t.type === TransactionType.EXPENSE) {
                payables -= t.amount;
            }
        });
        
        // Period-based metrics
        let monthExpenses = 0;
        let sales7d = 0;
        let receipts7d = 0;
        let expenses7d = 0;

        shopTrans.forEach(t => {
            const tDate = new Date(t.date);
            if (t.type === TransactionType.EXPENSE) {
                if (tDate >= currentMonthStart) {
                    monthExpenses += t.amount;
                }
                if (tDate >= sevenDaysAgo) {
                    expenses7d += t.amount;
                }
            } else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                if (tDate >= sevenDaysAgo) {
                    sales7d += t.amount * (t.quantity || 1);
                }
            } else if (t.type === TransactionType.SALES_RECEIPT) {
                if (tDate >= sevenDaysAgo) {
                    receipts7d += t.amount;
                }
            }
        });

        return {
            id: shop.id,
            name: shop.name,
            location: `${shop.district}, ${shop.country}`,
            cashInHand,
            inventoryUnits,
            inventoryWorth,
            receivables: Math.max(0, receivables),
            payables: Math.max(0, payables),
            monthExpenses,
            sales7d,
            receipts7d,
            expenses7d,
            currencySymbol: currency.symbol,
            currencyRate: currency.rate,
            currencyId: currency.id,
        };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [shops, transactions, products, shopAccounts, currencies]);

  // Modal Render Helpers
  const renderBreakdownModal = () => {
    if (!detailModal) return null;

    const shop = shops.find(s => s.id === detailModal.shopId);
    if (!shop) return null;

    const currency = currencies.find(c => c.id === shop.currencyCode) || { id: 'USD', symbol: '$', rate: 1 };
    const formatLocal = (val: number) => {
        return `${currency.symbol}${(val * currency.rate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    let title = "";
    let content = null;

    switch (detailModal.type) {
        case 'CASH':
            title = `Cash Breakdown: ${shop.name}`;
            const accounts = shopAccounts.filter(a => a.shopId === shop.id);
            const accountBalances = accounts.map(acc => {
                let bal = acc.openingBalance;
                transactions.filter(t => t.paymentAccountId === acc.id).forEach(t => {
                    if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) bal += t.amount;
                    else if (t.type === TransactionType.EXPENSE || t.type === TransactionType.ADVANCE_USAGE) bal -= t.amount;
                });
                return { name: acc.accountName, type: acc.accountType, balance: bal };
            });
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Account</th><th className="px-6 py-3 text-left">Type</th><th className="px-6 py-3 text-right">Balance ({currency.id})</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {accountBalances.map((b, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{b.name}</td>
                                <td className="px-6 py-4 text-xs font-black uppercase text-gray-500">{b.type}</td>
                                <td className={`px-6 py-4 text-sm text-right font-black ${b.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatLocal(b.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            break;

        case 'INVENTORY':
            title = `Inventory Manifest: ${shop.name}`;
            const stockMap: Record<string, number> = {};
            transactions.filter(t => t.shopId === shop.id).forEach(t => {
                if (t.productId) {
                    const qty = t.quantity || 0;
                    stockMap[t.productId] = stockMap[t.productId] || 0;
                    if ([TransactionType.IMPORT, TransactionType.STOCK_TRANSFER_IN, TransactionType.SALES_RETURN, TransactionType.OPENING_STOCK].includes(t.type)) stockMap[t.productId] += qty;
                    else if ([TransactionType.CASH_SALE, TransactionType.CREDIT_SALE, TransactionType.STOCK_TRANSFER_OUT].includes(t.type)) stockMap[t.productId] -= qty;
                }
            });
            const inventory = Object.entries(stockMap).map(([pid, qty]) => ({ product: products.find(p => p.id === pid), qty }))
                .filter(i => i.qty > 0 && i.product).sort((a,b) => (a.product?.name || '').localeCompare(b.product?.name || ''));
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Product</th><th className="px-6 py-3 text-center">Stock</th><th className="px-6 py-3 text-right">HO Cost</th><th className="px-6 py-3 text-right">Worth ({currency.id})</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {inventory.map((item, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4"><p className="text-sm font-bold text-gray-800">{item.product?.name}</p><p className="text-[9px] font-black text-gray-400 uppercase">{item.product?.category}</p></td>
                                <td className="px-6 py-4 text-center font-black text-blue-600">{item.qty}</td>
                                <td className="px-6 py-4 text-right text-xs text-gray-500">${item.product?.hoCost.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right font-black text-gray-900">{formatLocal(item.qty * (item.product?.hoCost || 0))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            break;

        case 'RECEIVABLES':
            title = `Accounts Receivable: ${shop.name}`;
            const shopCustomers = customers.filter(c => c.shopId === shop.id);
            const customerBalances = shopCustomers.map(cust => {
                let bal = 0;
                transactions.filter(t => t.customerId === cust.id).forEach(t => {
                    if (t.invoiceId === 'OPENING-BAL' && t.type === TransactionType.CREDIT_SALE) bal += t.amount;
                    else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) bal += t.amount * (t.quantity || 1);
                    else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.ADVANCE_USAGE) bal -= t.amount;
                    else if (t.type === TransactionType.SALES_RETURN) bal -= t.amount * (t.quantity || 1);
                });
                return { name: cust.name, phone: cust.phone, balance: bal };
            }).filter(c => c.balance > 0.01).sort((a,b) => b.balance - a.balance);
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Customer Identity</th><th className="px-6 py-3 text-right">Owed Balance ({currency.id})</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {customerBalances.map((c, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4"><p className="text-sm font-bold text-gray-800">{c.name}</p><p className="text-[10px] text-gray-400 font-mono">{c.phone || 'No Phone'}</p></td>
                                <td className="px-6 py-4 text-right font-black text-red-600">{formatLocal(c.balance)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            break;

        case 'PAYABLES':
            title = `Head Office Ledger: ${shop.name}`;
            const payEntries = transactions.filter(t => t.shopId === shop.id && (t.type === TransactionType.IMPORT || ((t as any).expenseCategory === 'HEAD_OFFICE' && t.type === TransactionType.EXPENSE)))
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Date</th><th className="px-6 py-3 text-left">Reference</th><th className="px-6 py-3 text-right">Amount (USD)</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {payEntries.map((e, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">{e.type === TransactionType.IMPORT ? 'Stock Received' : 'Remittance to HO'}</td>
                                <td className={`px-6 py-4 text-right font-black ${e.type === TransactionType.IMPORT ? 'text-red-600' : 'text-green-600'}`}>
                                    ${(e.amount * (e.quantity || 1)).toFixed(2)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            break;

        case 'MONTH_EXP':
        case 'EXP_7D':
            const is7Day = detailModal.type === 'EXP_7D';
            title = `${is7Day ? 'Weekly' : 'Monthly'} Expenses: ${shop.name}`;
            const filterDate = is7Day ? sevenDaysAgo : currentMonthStart;
            const shopExps = transactions.filter(t => t.shopId === shop.id && t.type === TransactionType.EXPENSE && new Date(t.date) >= filterDate)
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Date</th><th className="px-6 py-3 text-left">Category / Note</th><th className="px-6 py-3 text-right">Amount ({currency.id})</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {shopExps.map((e, i) => {
                            const expAcc = expenseAccounts.find(ea => ea.id === e.expenseAccountId);
                            return (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4"><p className="text-sm font-bold text-gray-800">{expAcc?.name || 'General'}</p><p className="text-[10px] text-gray-400 italic truncate w-40">{e.description}</p></td>
                                    <td className="px-6 py-4 text-right font-black text-red-500">{formatLocal(e.amount)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            );
            break;

        case 'SALES_7D':
            title = `Last 7 Days Sales: ${shop.name}`;
            const weekSales = transactions.filter(t => t.shopId === shop.id && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) && new Date(t.date) >= sevenDaysAgo)
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Date</th><th className="px-6 py-3 text-left">Invoice</th><th className="px-6 py-3 text-right">Value ({currency.id})</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {weekSales.map((e, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-800">#{e.invoiceId}</td>
                                <td className="px-6 py-4 text-right font-black text-blue-600">{formatLocal(e.amount * (e.quantity || 1))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            );
            break;

        case 'RECEIPTS_7D':
            title = `Last 7 Days Receipts: ${shop.name}`;
            const weekReceipts = transactions.filter(t => t.shopId === shop.id && t.type === TransactionType.SALES_RECEIPT && new Date(t.date) >= sevenDaysAgo)
                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            content = (
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-[10px] font-black uppercase text-gray-400">
                        <tr><th className="px-6 py-3 text-left">Date</th><th className="px-6 py-3 text-left">Customer</th><th className="px-6 py-3 text-right">Received ({currency.id})</th></tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                        {weekReceipts.map((e, i) => {
                            const cust = customers.find(c => c.id === e.customerId);
                            return (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-xs font-medium text-gray-500">{new Date(e.date).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-800">{cust?.name || 'Walk-in'}</td>
                                    <td className="px-6 py-4 text-right font-black text-green-600">{formatLocal(e.amount)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            );
            break;
    }

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col transform transition-all animate-scale-up">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-3xl shadow-sm">
                    <h3 className="text-xl font-black text-gray-800 tracking-tighter uppercase italic">{title}</h3>
                    <button onClick={() => setDetailModal(null)} className="text-gray-400 hover:text-gray-600 text-3xl font-light h-10 w-10 flex items-center justify-center">&times;</button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {content ? content : <div className="p-10 text-center text-gray-400 italic">No detailed records found for this period.</div>}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end rounded-b-3xl">
                    <button 
                        onClick={() => setDetailModal(null)}
                        className="px-8 py-2.5 bg-white border border-gray-200 text-gray-500 font-black rounded-xl hover:bg-gray-100 transition-all uppercase text-[10px] tracking-widest shadow-sm"
                    >
                        Close Breakdown
                    </button>
                </div>
            </div>
        </div>
    );
  };

  return (
    <div className="space-y-8">
        {/* Section 1: Shop Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shopStats.map(stats => (
                <ShopSummaryCard 
                    key={stats.id} 
                    stats={stats} 
                    onClick={() => switchShop(stats.id)} 
                    onDetailClick={(type) => setDetailModal({ type, shopId: stats.id })}
                />
            ))}
            {shopStats.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                    <p className="text-lg font-medium">No active shops found.</p>
                    <p className="text-sm">Add a shop in the 'Setup' section to get started.</p>
                </div>
            )}
        </div>

        {renderBreakdownModal()}

        {/* Section 2: Restored Charts */}
        <div className="mt-8 pt-8 border-t-4 border-dashed border-gray-200">
             <h2 className="text-2xl font-black text-gray-800 tracking-tighter mb-6">Regional Performance Analytics</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <ShopPerformanceChart shops={shops} transactions={transactions} />
                <SalesTrendChart transactions={transactions} />
             </div>
        </div>
    </div>
  );
};

export default Dashboard;
