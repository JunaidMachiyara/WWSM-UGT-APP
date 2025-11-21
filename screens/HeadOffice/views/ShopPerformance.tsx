
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const ShopPerformance: React.FC = () => {
  const { shops, products, transactions, formatCurrency } = useAppContext();

  // Default date range: Current Month
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

  const [fromDate, setFromDate] = useState<string>(firstDay);
  const [toDate, setToDate] = useState<string>(lastDay);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedItemId, setSelectedItemId] = useState<string>('ALL');
  const [itemSearchTerm, setItemSearchTerm] = useState<string>('');

  // Derived lists for filters
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const filteredProductOptions = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) &&
      (selectedCategory === 'ALL' || p.category === selectedCategory)
    );
  }, [products, itemSearchTerm, selectedCategory]);

  const reportData = useMemo(() => {
    // 1. Identify target products based on filters
    const targetProducts = selectedItemId === 'ALL' 
        ? filteredProductOptions 
        : products.filter(p => p.id === selectedItemId);
    
    const targetProductIds = new Set(targetProducts.map(p => p.id));

    // 2. Process each shop
    return shops.filter(s => s.isActive).map(shop => {
        const shopId = shop.id;
        
        // Filter transactions for this shop, date range, and target products
        const shopTransactions = transactions.filter(t => {
            const tDate = new Date(t.date);
            const from = new Date(fromDate + 'T00:00:00');
            const to = new Date(toDate + 'T23:59:59'); // End of day
            
            const isDateMatch = tDate >= from && tDate <= to;
            const isProductMatch = t.productId && targetProductIds.has(t.productId);
            const isShopMatch = t.shopId === shopId;

            return isShopMatch && isDateMatch && isProductMatch;
        });

        let totalImportValue = 0;
        let totalSalesRevenue = 0;
        let totalCOGS = 0; // Cost of Goods Sold during period

        shopTransactions.forEach(t => {
            const qty = t.quantity || 0;
            const product = products.find(p => p.id === t.productId);
            const cost = product?.hoCost || 0;

            // Import Value (Received)
            if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.SALES_RETURN) {
                // For Imports, we use the transaction amount (which includes freight alloc) or just base HO Cost?
                // To be consistent with "Worth", let's use HO Cost * Qty to represent the Value brought in.
                // Using HO Cost is safer for standardization.
                totalImportValue += (qty * cost);
            }

            // Sales Revenue & COGS
            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                totalSalesRevenue += (t.amount * qty); // Amount is Unit Price
                totalCOGS += (qty * cost);
            }
        });

        // 3. Calculate In Hand & Stock Worth (Snapshot - CURRENT state)
        // Note: "In Hand" is strictly current stock, not historical stock at 'toDate'.
        // Calculating historical stock requires replaying all transactions from 0. 
        // Assuming user wants CURRENT stock status alongside Period performance.
        
        let currentInHandQty = 0;
        let currentStockWorth = 0;

        // We need to calculate stock for ALL transactions for this shop/product, not just the date range, to get current stock.
        // Optimization: We can use the getStockLevel helper or manual aggregation. 
        // Since we are iterating products anyway, let's aggregate.
        
        // We must scan ALL transactions for this shop to get accurate current stock
        const allShopTransactions = transactions.filter(t => t.shopId === shopId && t.productId && targetProductIds.has(t.productId));
        
        // Helper map to sum stock per product
        const productStockMap: Record<string, number> = {};
        
        allShopTransactions.forEach(t => {
            const qty = t.quantity || 0;
            if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.SALES_RETURN) {
                productStockMap[t.productId!] = (productStockMap[t.productId!] || 0) + qty;
            }
            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                productStockMap[t.productId!] = (productStockMap[t.productId!] || 0) - qty;
            }
        });

        // Sum up positive stock
        Object.entries(productStockMap).forEach(([pid, qty]) => {
            if (qty > 0) {
                const product = products.find(p => p.id === pid);
                if (product) {
                    currentInHandQty += qty;
                    currentStockWorth += (qty * product.hoCost);
                }
            }
        });

        return {
            shopId: shop.id,
            shopName: shop.name,
            currency: shop.currencyCode,
            totalImportValue,
            totalSalesRevenue,
            salesProfit: totalSalesRevenue - totalCOGS,
            currentInHandQty,
            currentStockWorth
        };
    });

  }, [shops, products, transactions, fromDate, toDate, selectedCategory, selectedItemId, filteredProductOptions]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Shop Performance Details</h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* Date Range */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                <input 
                    type="date" 
                    value={fromDate} 
                    onChange={(e) => setFromDate(e.target.value)} 
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                <input 
                    type="date" 
                    value={toDate} 
                    onChange={(e) => setToDate(e.target.value)} 
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                />
            </div>

            {/* Category Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
                <select 
                    value={selectedCategory} 
                    onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        setSelectedItemId('ALL'); 
                    }}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                >
                    <option value="ALL">All Categories</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>
            </div>

            {/* Searchable Item Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Item</label>
                <div className="space-y-2">
                    <input 
                        type="text" 
                        placeholder="Search item name..." 
                        value={itemSearchTerm}
                        onChange={(e) => setItemSearchTerm(e.target.value)}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-primary"
                    />
                    <select 
                        value={selectedItemId} 
                        onChange={(e) => setSelectedItemId(e.target.value)}
                        className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                    >
                        <option value="ALL">All Items</option>
                        {filteredProductOptions.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shop Name</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Import (Cost)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sold (Revenue)</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">In Hand (Qty)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Profit (Sales - Cost)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock in Hand Worth</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map(row => (
                        <tr key={row.shopId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{row.shopName}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-blue-600 font-medium">{formatCurrency(row.totalImportValue)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">{formatCurrency(row.totalSalesRevenue)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800">{row.currentInHandQty.toLocaleString()}</td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${row.salesProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(row.salesProfit)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                {formatCurrency(row.currentStockWorth)}
                            </td>
                        </tr>
                    ))}
                    {reportData.length === 0 && (
                        <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-gray-500">No active shops found.</td>
                        </tr>
                    )}
                </tbody>
                <tfoot className="bg-gray-100 border-t border-gray-200">
                    <tr>
                        <td className="px-6 py-3 text-sm font-bold text-gray-900">TOTALS</td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(reportData.reduce((sum, row) => sum + row.totalImportValue, 0))}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(reportData.reduce((sum, row) => sum + row.totalSalesRevenue, 0))}
                        </td>
                        <td className="px-6 py-3 text-sm text-center font-bold text-gray-900">
                            {reportData.reduce((sum, row) => sum + row.currentInHandQty, 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(reportData.reduce((sum, row) => sum + row.salesProfit, 0))}
                        </td>
                        <td className="px-6 py-3 text-sm text-right font-bold text-gray-900">
                            {formatCurrency(reportData.reduce((sum, row) => sum + row.currentStockWorth, 0))}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>* <strong>Date Range:</strong> Applies to Import, Sold, and Sales Profit columns.</p>
            <p>* <strong>In Hand & Stock Worth:</strong> Represents current real-time inventory, regardless of date selection.</p>
            <p>* <strong>Total Import:</strong> Based on Head Office Cost of items received (Imports + Returns) in the period.</p>
            <p>* <strong>Sales Profit:</strong> Net Sales Revenue minus Cost of Goods Sold (COGS) for items sold in the period.</p>
        </div>
      </div>
    </div>
  );
};

export default ShopPerformance;
