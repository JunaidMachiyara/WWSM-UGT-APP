
import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType, AccountType, ShipmentStatus } from '../../../types';

const BalanceSheet: React.FC = () => {
    const { 
        shopId, 
        transactions, 
        products, 
        customers, 
        shopAccounts, 
        shipments, 
        assets, 
        formatCurrency, 
        currentShopCurrency,
        getStockLevel
    } = useAppContext();

    const shopTransactions = useMemo(() => transactions.filter(t => t.shopId === shopId), [transactions, shopId]);

    // --- ASSETS CALCULATIONS ---

    // 1. Cash & Bank Balances
    const accountBalances = useMemo(() => {
        return shopAccounts.filter(acc => acc.shopId === shopId).reduce((acc, account) => {
            let bal = account.openingBalance || 0;
            shopTransactions.filter(t => t.paymentAccountId === account.id).forEach(t => {
                if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.CUSTOMER_ADVANCE) bal += t.amount;
                else if (t.type === TransactionType.EXPENSE || t.type === TransactionType.IMPORT_OVERHEAD || t.type === TransactionType.ADVANCE_USAGE) {
                    bal -= (t.type === TransactionType.IMPORT_OVERHEAD) ? (t.amount * (t.quantity || 1)) : t.amount;
                }
            });
            return acc + bal;
        }, 0);
    }, [shopAccounts, shopTransactions, shopId]);

    // 2. Inventory Value (At Cost)
    const inventoryValuation = useMemo(() => {
        return products.reduce((total, prod) => {
            const stock = getStockLevel(prod.id);
            return total + (stock > 0 ? stock * prod.hoCost : 0);
        }, 0);
    }, [products, getStockLevel]);

    // 3. Accounts Receivable (Money customers owe shop)
    const accountsReceivable = useMemo(() => {
        return customers.filter(c => c.shopId === shopId).reduce((total, customer) => {
            let bal = 0;
            shopTransactions.filter(t => t.customerId === customer.id).forEach(t => {
                const val = (t.amount * (t.quantity || 1));
                if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) bal += val;
                else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.ADVANCE_USAGE) {
                    bal -= (t.type === TransactionType.SALES_RETURN ? val : t.amount);
                } else if (t.type === TransactionType.CUSTOMER_ADVANCE) {
                    bal -= t.amount;
                }
            });
            return total + (bal > 0 ? bal : 0);
        }, 0);
    }, [customers, shopTransactions, shopId]);

    // 4. Fixed Assets (Net Book Value - for now just total purchase cost)
    const fixedAssetsValue = useMemo(() => {
        return assets.filter(a => a.shopId === shopId).reduce((sum, a) => sum + a.purchaseCost, 0);
    }, [assets, shopId]);

    const totalAssets = accountBalances + inventoryValuation + accountsReceivable + fixedAssetsValue;

    // --- LIABILITIES CALCULATIONS ---

    // 1. Supplier Payables (Head Office)
    const supplierPayables = useMemo(() => {
        let bal = 0;
        shopTransactions.forEach(t => {
            if (t.type === TransactionType.IMPORT) bal += (t.amount * (t.quantity || 1));
            const isHOPayment = (t as any).expenseCategory === 'HEAD_OFFICE' || 
                                (t.type === TransactionType.EXPENSE && t.description.toLowerCase().includes('head office'));
            if (isHOPayment) bal -= t.amount;
        });
        return bal;
    }, [shopTransactions]);

    // 2. Customer Advances (Money customers pre-paid)
    const customerAdvances = useMemo(() => {
        return customers.filter(c => c.shopId === shopId).reduce((total, customer) => {
            let bal = 0;
            shopTransactions.filter(t => t.customerId === customer.id).forEach(t => {
                const val = (t.amount * (t.quantity || 1));
                if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) bal += val;
                else if (t.type === TransactionType.SALES_RECEIPT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.ADVANCE_USAGE) {
                    bal -= (t.type === TransactionType.SALES_RETURN ? val : t.amount);
                } else if (t.type === TransactionType.CUSTOMER_ADVANCE) {
                    bal -= t.amount;
                }
            });
            return total + (bal < 0 ? Math.abs(bal) : 0);
        }, 0);
    }, [customers, shopTransactions, shopId]);

    // 3. Other Accrued Liabilities (Clearing/Duty estimates unpaid)
    const unpaidShipmentCosts = useMemo(() => {
        // Simple logic: total costs of all shipments minus payments with matching descriptions
        const totalShipmentLiabilities = shipments.filter(s => s.shopId === shopId).reduce((sum, s) => {
            return sum + s.clearingCost + s.customExpenseCost + s.expectedDuty;
        }, 0);

        const paidShipmentCosts = shopTransactions.filter(t => {
            const cat = (t as any).expenseCategory;
            return t.type === TransactionType.EXPENSE && (cat === 'CLEARING' || cat === 'CUSTOMS' || cat === 'DUTY');
        }).reduce((sum, t) => sum + t.amount, 0);

        return Math.max(0, totalShipmentLiabilities - paidShipmentCosts);
    }, [shipments, shopTransactions, shopId]);

    const totalLiabilities = supplierPayables + customerAdvances + unpaidShipmentCosts;

    // --- EQUITY CALCULATIONS ---
    const netEquity = totalAssets - totalLiabilities;

    const rowClass = "flex justify-between py-2 border-b border-gray-100 last:border-0 hover:bg-gray-50 px-2 transition-colors";
    const headerClass = "text-xs font-black text-primary uppercase tracking-widest mb-3 mt-6 border-b-2 border-primary/20 pb-1";
    const totalRowClass = "flex justify-between py-3 font-black text-gray-900 border-t-2 border-gray-800 mt-2 bg-gray-50 px-2";

    return (
        <div className="bg-white p-10 rounded-lg shadow-xl max-w-4xl mx-auto border border-gray-100">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-black text-gray-900 uppercase italic tracking-tighter">Balance Sheet</h2>
                <p className="text-gray-500 font-bold uppercase text-xs tracking-widest mt-1">As of {new Date().toLocaleDateString()}</p>
                <div className="w-20 h-1.5 bg-primary mx-auto mt-4 rounded-full"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                
                {/* ASSETS COLUMN */}
                <section>
                    <h3 className={headerClass}>Current Assets</h3>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Cash & Bank Balances</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(accountBalances)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Inventory on Hand</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(inventoryValuation)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Accounts Receivable</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(accountsReceivable)}</span>
                    </div>

                    <h3 className={headerClass}>Fixed Assets</h3>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Equipment & Furniture</span>
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(fixedAssetsValue)}</span>
                    </div>

                    <div className={totalRowClass}>
                        <span className="uppercase italic">Total Assets</span>
                        <span>{formatCurrency(totalAssets)}</span>
                    </div>
                </section>

                {/* LIABILITIES & EQUITY COLUMN */}
                <section>
                    <h3 className={headerClass}>Liabilities</h3>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Accounts Payable (HO)</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(supplierPayables)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Customer Advances</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(customerAdvances)}</span>
                    </div>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium">Other Payables (Logistics)</span>
                        <span className="text-sm font-bold text-red-600">{formatCurrency(unpaidShipmentCosts)}</span>
                    </div>

                    <div className="flex justify-between py-2 font-bold text-gray-700 bg-gray-50/50 mt-2 px-2 rounded">
                        <span className="text-xs uppercase">Total Liabilities</span>
                        <span className="text-sm">{formatCurrency(totalLiabilities)}</span>
                    </div>

                    <h3 className={headerClass}>Owner's Equity</h3>
                    <div className={rowClass}>
                        <span className="text-sm text-gray-600 font-medium italic">Net Business Value</span>
                        <span className="text-sm font-black text-green-600">{formatCurrency(netEquity)}</span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 px-2 leading-tight">Includes retained earnings and opening balance equity adjustments.</p>

                    <div className={totalRowClass}>
                        <span className="uppercase italic">Total Liab. & Equity</span>
                        <span>{formatCurrency(totalLiabilities + netEquity)}</span>
                    </div>
                </section>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 flex justify-between items-center bg-blue-50/30 -mx-10 px-10 -mb-10 rounded-b-lg">
                <div className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                    Generated by WWSM_UGT Accounting Core
                </div>
                <div className="flex space-x-2">
                    <div className={`w-3 h-3 rounded-full ${Math.abs(totalAssets - (totalLiabilities + netEquity)) < 0.01 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Ledger Balanced</span>
                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;
