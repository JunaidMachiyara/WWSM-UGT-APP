
import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shop, TransactionType } from '../../../types';
import ShopPerformanceChart from '../../../components/charts/ShopPerformanceChart';
import SalesTrendChart from '../../../components/charts/SalesTrendChart';

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
}

interface ShopSummaryCardProps {
  stats: ShopStats;
  onClick: () => void;
}

const ShopSummaryCard: React.FC<ShopSummaryCardProps> = ({ stats, onClick }) => {
    const { formatCurrency } = useAppContext(); // Base currency (USD) formatter for HO Payables

    const formatLocalCurrency = (amountInBase: number) => {
        const amount = amountInBase * (stats.currencyRate || 1);
        return `${stats.currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const StatItem = ({ label, value, className = '' }: { label: string, value: string, className?: string }) => (
        <div className="flex justify-between items-baseline py-2 border-b border-gray-100 last:border-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
            <span className={`text-sm font-black ${className}`}>{value}</span>
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 flex flex-col hover:shadow-xl hover:border-primary/20 transition-all duration-300 transform hover:-translate-y-1">
            <div className="p-4 border-b-2 border-gray-100">
                <h3 className="text-lg font-black text-primary uppercase tracking-tighter italic">{stats.name}</h3>
                <p className="text-xs font-medium text-gray-400">{stats.location}</p>
            </div>
            <div className="p-4 space-y-1 flex-1">
                <StatItem label="Cash in Hand" value={formatLocalCurrency(stats.cashInHand)} className="text-green-600" />
                <StatItem label="Inventory (Units)" value={stats.inventoryUnits.toLocaleString()} className="text-gray-900" />
                <StatItem label="Inventory Worth" value={formatLocalCurrency(stats.inventoryWorth)} className="text-gray-900" />
                <StatItem label="Receivables" value={formatLocalCurrency(stats.receivables)} className="text-orange-600" />
                <StatItem label="Payables (to HO)" value={formatCurrency(stats.payables)} className="text-red-600" />
                <StatItem label="Expenses (Month)" value={formatLocalCurrency(stats.monthExpenses)} className="text-red-500" />
                <div className="pt-2">
                    <p className="text-center text-[9px] font-bold text-gray-300 uppercase tracking-widest">Last 7 Days</p>
                </div>
                <StatItem label="Sales" value={formatLocalCurrency(stats.sales7d)} className="text-blue-600" />
                <StatItem label="Receipts" value={formatLocalCurrency(stats.receipts7d)} className="text-green-500" />
                <StatItem label="Expenses" value={formatLocalCurrency(stats.expenses7d)} className="text-red-500" />
            </div>
            <div className="p-3 bg-gray-50/70 rounded-b-2xl mt-auto">
                <button
                    onClick={onClick}
                    className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white font-black py-2 rounded-lg transition-all text-xs uppercase tracking-widest"
                >
                    Manage Shop
                </button>
            </div>
        </div>
    );
};


const Dashboard: React.FC = () => {
  const { shops, transactions, products, shopAccounts, switchShop, currencies } = useAppContext();

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
                } else if (t.type === TransactionType.EXPENSE) {
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
        };
    }).sort((a,b) => a.name.localeCompare(b.name));
  }, [shops, transactions, products, shopAccounts, currencies]);

  return (
    <div className="space-y-8">
        {/* Section 1: Shop Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {shopStats.map(stats => (
                <ShopSummaryCard key={stats.id} stats={stats} onClick={() => switchShop(stats.id)} />
            ))}
            {shopStats.length === 0 && (
                <div className="col-span-full text-center py-20 text-gray-400">
                    <p className="text-lg font-medium">No active shops found.</p>
                    <p className="text-sm">Add a shop in the 'Setup' section to get started.</p>
                </div>
            )}
        </div>

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
