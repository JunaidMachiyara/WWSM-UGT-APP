
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const Inventory: React.FC = () => {
  const { shopId, products, warehouses, getStockLevel, shops, formatCurrency, transactions } = useAppContext();
  
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const currentShop = shops.find(s => s.id === shopId);
  const shopWarehouses = warehouses.filter(w => w.shopId === shopId);
  
  const locations = useMemo(() => {
    if (!currentShop) return [];
    return [
      { id: currentShop.id, name: `${currentShop.name} (Shop)` },
      ...shopWarehouses.map(w => ({ id: w.id, name: w.name }))
    ];
  }, [currentShop, shopWarehouses]);

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return Array.from(cats).sort();
  }, [products]);

  const inventoryLevels = useMemo(() => {
    // Pre-calculate average costs per product-location based on IMPORT transactions
    const importMap: Record<string, { totalCost: number, totalQty: number }> = {};
    const shopImportMap: Record<string, { totalCost: number, totalQty: number }> = {};
    
    // Activity Map for Received and Sold totals
    const activityMap: Record<string, { received: number, sold: number }> = {};

    transactions.forEach(t => {
        if (t.shopId === shopId && t.productId) {
             // Cost Calculation Logic (Import & Opening Stock)
             if(t.type === TransactionType.IMPORT || t.type === TransactionType.OPENING_STOCK) {
                const locKey = `${t.productId}-${t.locationId || shopId}`;
                if (!importMap[locKey]) importMap[locKey] = { totalCost: 0, totalQty: 0 };
                importMap[locKey].totalCost += (t.amount * (t.quantity || 1));
                importMap[locKey].totalQty += (t.quantity || 1);

                if (!shopImportMap[t.productId]) shopImportMap[t.productId] = { totalCost: 0, totalQty: 0 };
                shopImportMap[t.productId].totalCost += (t.amount * (t.quantity || 1));
                shopImportMap[t.productId].totalQty += (t.quantity || 1);
            } else if (t.type === TransactionType.IMPORT_OVERHEAD) {
                // This transaction represents direct costs paid locally (Duty, Clearing).
                // It ADDS to the value (Cost) but does NOT add to the stock quantity.
                const locKey = `${t.productId}-${t.locationId || shopId}`;
                if (!importMap[locKey]) importMap[locKey] = { totalCost: 0, totalQty: 0 };
                importMap[locKey].totalCost += (t.amount * (t.quantity || 1));
                
                if (!shopImportMap[t.productId]) shopImportMap[t.productId] = { totalCost: 0, totalQty: 0 };
                shopImportMap[t.productId].totalCost += (t.amount * (t.quantity || 1));
            }

            // Calculate Totals for Activity Columns
            if (t.locationId) {
                const locKey = `${t.productId}-${t.locationId}`;
                if (!activityMap[locKey]) activityMap[locKey] = { received: 0, sold: 0 };

                // Received: Imports + Stock Transfers In + Opening Stock
                if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.OPENING_STOCK) {
                    activityMap[locKey].received += (t.quantity || 0);
                }

                // Sold: Cash Sales + Credit Sales
                if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                    activityMap[locKey].sold += (t.quantity || 0);
                }
            }
        }
    });

    const levels: { 
        productId: string; 
        productName: string; 
        category: string; 
        locationId: string; 
        locationName: string; 
        stock: number;
        unitCost: number;
        totalValue: number;
        totalRetailValue: number; 
        totalReceived: number; 
        totalSold: number;     
    }[] = [];
    
    products.forEach(product => {
      locations.forEach(location => {
        const stock = getStockLevel(product.id, location.id);
        
        // We only show rows if there is current stock
        if (stock > 0) { 
             const locKey = `${product.id}-${location.id}`;
             let avgCost = 0;

             if (importMap[locKey] && importMap[locKey].totalQty > 0) {
                 avgCost = importMap[locKey].totalCost / importMap[locKey].totalQty;
             } else if (shopImportMap[product.id] && shopImportMap[product.id].totalQty > 0) {
                 avgCost = shopImportMap[product.id].totalCost / shopImportMap[product.id].totalQty;
             } else {
                 avgCost = product.hoCost;
             }

             const activity = activityMap[locKey] || { received: 0, sold: 0 };

             levels.push({
                productId: product.id,
                productName: product.name,
                category: product.category,
                locationId: location.id,
                locationName: location.name,
                stock: stock,
                unitCost: avgCost,
                totalValue: stock * avgCost,
                totalRetailValue: stock * product.minSalePrice,
                totalReceived: activity.received,
                totalSold: activity.sold,
            });
        }
      });
    });
    return levels;

  }, [products, locations, getStockLevel, transactions, shopId]);

  const filteredInventory = useMemo(() => {
    return inventoryLevels.filter(item => {
        const matchesLocation = selectedLocationId === 'all' || item.locationId === selectedLocationId;
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase());

        return matchesLocation && matchesCategory && matchesSearch;
    });
  }, [inventoryLevels, selectedLocationId, selectedCategory, searchQuery]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Current Inventory Status by Location</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Location</label>
              <select 
                value={selectedLocationId} 
                onChange={(e) => setSelectedLocationId(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
              >
                  <option value="all">All Locations</option>
                  {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
              </select>
          </div>
           <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Category</label>
              <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
              >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
          </div>
          <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Product</label>
              <input 
                type="text" 
                placeholder="Product Name..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
              />
          </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Received</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Sold</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock on Hand</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost/Unit (w/ Exp)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Retail Worth</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredInventory.length > 0 ? filteredInventory.map(item => (
              <tr key={`${item.productId}-${item.locationId}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.locationName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600 font-medium">{item.totalReceived}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-medium">{item.totalSold}</td>
                
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.stock} units</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.unitCost)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600 font-medium">{formatCurrency(item.totalRetailValue)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(item.totalValue)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={9} className="text-center py-10 text-gray-500">
                    {inventoryLevels.length === 0 
                        ? "No stock found in the shop or any warehouses." 
                        : "No stock matches your current filters."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">* Avg Cost/Unit includes original invoice price plus Allocated Freight (Paid by HO) plus Allocated Duty/Clearing (Paid by Shop).</p>
      <p className="text-xs text-gray-500">* "Total Retail Worth" is calculated based on the Minimum Sale Price. "Total Cost Value" is based on Avg Cost.</p>
      <p className="text-xs text-gray-500">* "Total Received" includes Imports, Opening Stock, and Stock Transfers In. "Total Sold" includes Cash and Credit Sales.</p>
    </div>
  );
};

export default Inventory;