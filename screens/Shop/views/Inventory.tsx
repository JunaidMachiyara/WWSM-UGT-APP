
import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const Inventory: React.FC = () => {
  const { shopId, products, warehouses, getStockLevel, shops, formatCurrency, transactions } = useAppContext();
  
  const currentShop = shops.find(s => s.id === shopId);
  const shopWarehouses = warehouses.filter(w => w.shopId === shopId);
  
  const locations = useMemo(() => {
    if (!currentShop) return [];
    return [
      { id: currentShop.id, name: `${currentShop.name} (Shop)` },
      ...shopWarehouses.map(w => ({ id: w.id, name: w.name }))
    ];
  }, [currentShop, shopWarehouses]);

  const inventoryLevels = useMemo(() => {
    // Pre-calculate average costs per product-location based on IMPORT transactions
    // which contain the Landed Cost + Allocated Overheads
    const importMap: Record<string, { totalCost: number, totalQty: number }> = {};
    const shopImportMap: Record<string, { totalCost: number, totalQty: number }> = {};

    transactions.forEach(t => {
        if (t.shopId === shopId && t.productId && t.type === TransactionType.IMPORT) {
            // Location specific map
            const locKey = `${t.productId}-${t.locationId || shopId}`;
            if (!importMap[locKey]) importMap[locKey] = { totalCost: 0, totalQty: 0 };
            importMap[locKey].totalCost += (t.amount * (t.quantity || 1));
            importMap[locKey].totalQty += (t.quantity || 1);

            // Shop wide map (fallback)
            if (!shopImportMap[t.productId]) shopImportMap[t.productId] = { totalCost: 0, totalQty: 0 };
            shopImportMap[t.productId].totalCost += (t.amount * (t.quantity || 1));
            shopImportMap[t.productId].totalQty += (t.quantity || 1);
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
    }[] = [];
    
    products.forEach(product => {
      locations.forEach(location => {
        const stock = getStockLevel(product.id, location.id);
        if (stock > 0) { 
             const locKey = `${product.id}-${location.id}`;
             let avgCost = 0;

             if (importMap[locKey] && importMap[locKey].totalQty > 0) {
                 avgCost = importMap[locKey].totalCost / importMap[locKey].totalQty;
             } else if (shopImportMap[product.id] && shopImportMap[product.id].totalQty > 0) {
                 // Fallback to shop average if no imports specifically for this location (e.g. stock transfer)
                 avgCost = shopImportMap[product.id].totalCost / shopImportMap[product.id].totalQty;
             } else {
                 // Fallback to HO Cost if no import history found at all
                 avgCost = product.hoCost;
             }

             levels.push({
                productId: product.id,
                productName: product.name,
                category: product.category,
                locationId: location.id,
                locationName: location.name,
                stock: stock,
                unitCost: avgCost,
                totalValue: stock * avgCost
            });
        }
      });
    });
    return levels;

  }, [products, locations, getStockLevel, transactions, shopId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-800">Current Inventory Status by Location</h3>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock on Hand</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg Cost/Unit (w/ Exp)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Value</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventoryLevels.length > 0 ? inventoryLevels.map(item => (
              <tr key={`${item.productId}-${item.locationId}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.locationName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.stock} units</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">{formatCurrency(item.unitCost)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-gray-900">{formatCurrency(item.totalValue)}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-500">
                    No stock found in the shop or any warehouses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-4">* Avg Cost/Unit includes original invoice price plus allocated freight, clearing, and custom expenses.</p>
    </div>
  );
};

export default Inventory;
    