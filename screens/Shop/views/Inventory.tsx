import React, { useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';

const Inventory: React.FC = () => {
  const { shopId, products, warehouses, getStockLevel, shops } = useAppContext();
  
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
    const levels: { productId: string; productName: string; category: string; locationId: string; locationName: string; stock: number }[] = [];
    
    products.forEach(product => {
      locations.forEach(location => {
        const stock = getStockLevel(product.id, location.id);
        if (stock > 0) { // Optionally, only show items with stock
             levels.push({
                productId: product.id,
                productName: product.name,
                category: product.category,
                locationId: location.id,
                locationName: location.name,
                stock: stock,
            });
        }
      });
    });
    return levels;

  }, [products, locations, getStockLevel]);

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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventoryLevels.length > 0 ? inventoryLevels.map(item => (
              <tr key={`${item.productId}-${item.locationId}`}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.locationName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.stock} units</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-10 text-gray-500">
                    No stock found in the shop or any warehouses.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Inventory;