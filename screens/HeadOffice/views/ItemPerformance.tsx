
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const ItemPerformance: React.FC = () => {
  const { shops, products, transactions, formatCurrency } = useAppContext();

  const [selectedShopId, setSelectedShopId] = useState<string>('ALL');
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

  // Calculation Logic
  const reportData = useMemo(() => {
    const targetProducts = selectedItemId === 'ALL' 
        ? filteredProductOptions 
        : products.filter(p => p.id === selectedItemId);

    return targetProducts.map(product => {
        const productTransactions = transactions.filter(t => 
            t.productId === product.id && 
            (selectedShopId === 'ALL' || t.shopId === selectedShopId)
        );

        let qtyReceived = 0;
        let qtySold = 0;
        let totalSalesRevenue = 0;

        productTransactions.forEach(t => {
            const qty = t.quantity || 0;
            
            // Received: Imports (from HO), Transfers In, Sales Returns, Opening Stock
            if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.OPENING_STOCK) {
                qtyReceived += qty;
            }

            // Sold: Cash Sales, Credit Sales
            if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                qtySold += qty;
                totalSalesRevenue += (t.amount * qty);
            }
        });

        // Calculate In Hand
        let inHand = 0;
        let totalInflows = 0;
        let totalOutflows = 0;
            
        productTransactions.forEach(t => {
             const qty = t.quantity || 0;
             if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.OPENING_STOCK) {
                 totalInflows += qty;
             }
             if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
                 totalOutflows += qty;
             }
        });
        inHand = totalInflows - totalOutflows;

        // Financial Metrics
        // Cost of Goods Sold = Qty Sold * HO Cost
        const cogs = qtySold * product.hoCost;
        
        // Sales Profit (Margin) = Revenue - COGS
        const salesProfit = totalSalesRevenue - cogs;
        
        const stockWorth = inHand * product.hoCost;

        return {
            id: product.id,
            name: product.name,
            category: product.category,
            qtyReceived,
            qtySold,
            inHand,
            salesProfit,
            stockWorth
        };
    }).filter(item => item.qtyReceived > 0 || item.inHand > 0); 

  }, [selectedShopId, selectedItemId, filteredProductOptions, transactions, products]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Item Performance Details</h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            {/* Shop Filter */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Shop</label>
                <select 
                    value={selectedShopId} 
                    onChange={(e) => setSelectedShopId(e.target.value)}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                >
                    <option value="ALL">All Shops</option>
                    {shops.filter(s => s.isActive).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
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
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Received</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Sold</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">In Hand</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Profit (Sales - Cost)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Stock in Hand Worth</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.length > 0 ? (
                        reportData.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600 font-medium">{item.qtyReceived}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-medium">{item.qtySold}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-800">{item.inHand}</td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-semibold ${item.salesProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(item.salesProfit)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
                                    {formatCurrency(item.stockWorth)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                                No item data matches the selected filters.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
        <p className="text-xs text-gray-500 mt-4">
            * <strong>Qty Received</strong>: Includes Imports, Transfers In, Sales Returns, and Opening Stock.<br/>
            * <strong>Qty Sold</strong>: Includes Cash and Credit Sales only.<br/>
            * <strong>Sales Profit</strong>: Total Sales Revenue minus Cost of Goods Sold (HO Cost * Qty Sold).<br/>
            * <strong>Stock Worth</strong>: Valued at Head Office Cost Price (Base Currency).
        </p>
      </div>
    </div>
  );
};

export default ItemPerformance;