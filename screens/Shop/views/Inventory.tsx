
import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

interface InventoryItem {
    productId: string;
    productName: string;
    category: string;
    locationId: string;
    locationName: string;
    stock: number;
    unitCost: number; // Stored in Base Currency (USD)
    totalValue: number; // Stored in Base Currency (USD)
    totalWeight: number; // Sum of stock * product weight
    totalRetailValue: number; // Stored in Base Currency (USD)
    totalReceived: number;
    totalSold: number;
}

const Inventory: React.FC = () => {
  const { shopId, products, warehouses, getStockLevel, shops, formatCurrency, transactions, currentShopCurrency, deleteStockTransactions } = useAppContext();
  
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Currency Toggle State
  const [displayCurrency, setDisplayCurrency] = useState<'LOCAL' | 'USD'>('LOCAL');

  // Bulk Delete State
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [securityPin, setSecurityPin] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const currentShop = shops.find(s => s.id === shopId);
  const shopWarehouses = warehouses.filter(w => w.shopId === shopId);
  
  const locations = useMemo(() => {
    if (!currentShop) return [];
    return [
      { id: currentShop.id, name: `${currentShop.name} (Shop)` },
      ...shopWarehouses.map(w => ({ id: w.id, name: w.name }))
    ];
  }, [currentShop, shopWarehouses]);

  // Determine if we should show the toggle (only if shop isn't already USD)
  const isMultiCurrency = currentShopCurrency.id !== 'USD';

  const formatValue = (amountInBase: number) => {
      if (displayCurrency === 'USD') {
          return `$${amountInBase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      return formatCurrency(amountInBase);
  };

  const inventoryLevels = useMemo(() => {
    const importMap: Record<string, { totalCost: number, totalQty: number }> = {};
    const shopImportMap: Record<string, { totalCost: number, totalQty: number }> = {};
    const activityMap: Record<string, { received: number, sold: number }> = {};

    transactions.forEach(t => {
        if (t.shopId === shopId && t.productId) {
             if(t.type === TransactionType.IMPORT || t.type === TransactionType.OPENING_STOCK) {
                const locKey = `${t.productId}-${t.locationId || shopId}`;
                if (!importMap[locKey]) importMap[locKey] = { totalCost: 0, totalQty: 0 };
                importMap[locKey].totalCost += (t.amount * (t.quantity || 1));
                importMap[locKey].totalQty += (t.quantity || 1);

                if (!shopImportMap[t.productId]) shopImportMap[t.productId] = { totalCost: 0, totalQty: 0 };
                shopImportMap[t.productId].totalCost += (t.amount * (t.quantity || 1));
                shopImportMap[t.productId].totalQty += (t.quantity || 1);
            } else if (t.type === TransactionType.IMPORT_OVERHEAD) {
                const locKey = `${t.productId}-${t.locationId || shopId}`;
                if (!importMap[locKey]) importMap[locKey] = { totalCost: 0, totalQty: 0 };
                importMap[locKey].totalCost += (t.amount * (t.quantity || 1));
                if (!shopImportMap[t.productId]) shopImportMap[t.productId] = { totalCost: 0, totalQty: 0 };
                shopImportMap[t.productId].totalCost += (t.amount * (t.quantity || 1));
            }

            if (t.locationId) {
                const locKey = `${t.productId}-${t.locationId}`;
                if (!activityMap[locKey]) activityMap[locKey] = { received: 0, sold: 0 };
                if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.OPENING_STOCK) {
                    activityMap[locKey].received += (t.quantity || 0);
                }
                if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE) {
                    activityMap[locKey].sold += (t.quantity || 0);
                }
            }
        }
    });

    const levels: InventoryItem[] = [];
    products.forEach(product => {
      locations.forEach(location => {
        const stock = getStockLevel(product.id, location.id);
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
                productId: product.id, productName: product.name, category: product.category,
                locationId: location.id, locationName: location.name, stock: stock,
                unitCost: avgCost, totalValue: stock * avgCost, 
                totalWeight: stock * (product.weight || 0),
                totalRetailValue: stock * product.minSalePrice,
                totalReceived: activity.received, totalSold: activity.sold,
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

  const toggleSelectItem = (productId: string, locationId: string) => {
    const key = `${productId}|${locationId}`;
    setSelectedItemIds(prev => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
    });
  };

  const toggleSelectAll = () => {
      if (selectedItemIds.size === filteredInventory.length) {
          setSelectedItemIds(new Set());
      } else {
          setSelectedItemIds(new Set(filteredInventory.map(i => `${i.productId}|${i.locationId}`)));
      }
  };

  const handleBulkDelete = async () => {
    if (securityPin !== '7860') {
        setDeleteError('Authorized PIN required.');
        return;
    }

    setIsDeleting(true);
    setDeleteError('');
    try {
        const itemsToPurge = Array.from(selectedItemIds).map(key => {
            const [productId, locationId] = (key as string).split('|');
            return { productId, locationId };
        });

        await deleteStockTransactions(itemsToPurge);
        setSelectedItemIds(new Set());
        setShowDeleteModal(false);
        setSecurityPin('');
        alert('Items successfully removed from ledger.');
    } catch (e: any) {
        setDeleteError(`Error: ${e.message}`);
    } finally {
        setIsDeleting(false);
    }
  };

  // KPI Calculations for Top Cards
  const kpis = useMemo(() => {
      return {
          totalBales: filteredInventory.reduce((s, i) => s + i.stock, 0),
          totalKg: filteredInventory.reduce((s, i) => s + i.totalWeight, 0),
          totalWorth: filteredInventory.reduce((s, i) => s + i.totalValue, 0),
      };
  }, [filteredInventory]);

  return (
    <div className="space-y-8">
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 relative">
        {selectedItemIds.size > 0 && (
            <div className="absolute top-4 right-6 flex items-center space-x-4 animate-fade-in z-20">
                <span className="text-sm font-bold text-primary bg-blue-50 px-3 py-1.5 rounded-full border border-blue-100">
                    {selectedItemIds.size} Items Selected
                </span>
                <button 
                    onClick={() => {
                        setShowDeleteModal(true);
                        setDeleteError('');
                        setSecurityPin('');
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-widest px-6 py-2 rounded-lg shadow-lg transition-all active:scale-95 flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Delete Selection
                </button>
            </div>
        )}

        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-6">
            <div className="w-full lg:w-1/4">
                <h3 className="text-xl font-bold text-gray-800 border-b-4 border-primary/20 pb-1 mb-4">Inventory Manifest</h3>
                
                {/* Filters Stack */}
                <div className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Filter Location</label>
                        <select 
                            value={selectedLocationId} 
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 bg-white text-sm font-bold text-gray-900"
                        >
                            <option value="all">All Locations</option>
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Search Products</label>
                        <input 
                            type="text" 
                            placeholder="Name..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white text-gray-900"
                        />
                    </div>
                    
                    {isMultiCurrency && (
                        <div className="bg-gray-100 p-1 rounded-xl flex items-center shadow-inner border border-gray-200">
                            <button 
                                onClick={() => setDisplayCurrency('LOCAL')}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${displayCurrency === 'LOCAL' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                {currentShopCurrency.id}
                            </button>
                            <button 
                                onClick={() => setDisplayCurrency('USD')}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${displayCurrency === 'USD' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                USD (Base)
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* KPI Cards beside Filters */}
            <div className="w-full lg:w-3/4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-600 to-primary p-5 rounded-2xl text-white shadow-lg border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Sum of Bales</p>
                    <p className="text-3xl font-black">{kpis.totalBales.toLocaleString()} <span className="text-xs uppercase opacity-60">Units</span></p>
                </div>
                <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-5 rounded-2xl text-white shadow-lg border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Sum of Kg</p>
                    <p className="text-3xl font-black">{kpis.totalKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs uppercase opacity-60">kg</span></p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-5 rounded-2xl text-white shadow-lg border border-white/10">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-2">Total Sum of Worth</p>
                    <p className="text-3xl font-black">{formatValue(kpis.totalWorth)}</p>
                </div>
            </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left w-10">
                    <input 
                        type="checkbox" 
                        checked={filteredInventory.length > 0 && selectedItemIds.size === filteredInventory.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                    />
                </th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product / Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stored In</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Weight (Kg)</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Cost/Unit ({displayCurrency === 'USD' ? 'USD' : currentShopCurrency.id})</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Value ({displayCurrency === 'USD' ? 'USD' : currentShopCurrency.id})</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-100">
              {filteredInventory.length > 0 ? filteredInventory.map(item => {
                const isSelected = selectedItemIds.has(`${item.productId}|${item.locationId}`);
                return (
                  <tr key={`${item.productId}-${item.locationId}`} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => toggleSelectItem(item.productId, item.locationId)}
                            className="h-4 w-4 text-primary rounded border-gray-300 focus:ring-primary"
                        />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-bold text-gray-900">{item.productName}</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase">{item.category}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-gray-500">
                         <span className="bg-gray-100 px-2 py-1 rounded">{item.locationName}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                         <span className="text-sm font-black text-primary bg-blue-50 px-3 py-1 rounded-full">{item.stock.toLocaleString()} units</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-xs font-bold text-gray-600">
                        {item.totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 font-medium">{formatValue(item.unitCost)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900 bg-gray-50/50">{formatValue(item.totalValue)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={7} className="text-center py-20 text-gray-400 italic font-medium">
                      No stock records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl shadow-sm">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Total Retail Value ({displayCurrency === 'USD' ? 'USD' : currentShopCurrency.id})</p>
                <p className="text-2xl font-black text-green-900">{formatValue(filteredInventory.reduce((s, i) => s + i.totalRetailValue, 0))}</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl shadow-sm text-right">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Consolidated Ledger Count</p>
                <p className="text-2xl font-black text-indigo-900">{filteredInventory.length} <span className="text-xs uppercase opacity-60">Record Lines</span></p>
            </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-scale-up border-4 border-red-100">
                  <div className="bg-red-600 p-8 text-white text-center">
                      <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </div>
                      <h3 className="text-2xl font-black uppercase tracking-tighter italic">Authorize Deletion</h3>
                      <p className="text-xs font-bold text-red-100 uppercase tracking-widest mt-2 opacity-80">Deleting {selectedItemIds.size} Inventory History Lines</p>
                  </div>
                  <div className="p-8">
                      <p className="text-sm text-gray-500 font-bold mb-6 text-center leading-relaxed">
                          This will erase ALL transaction history for the selected items at these locations. This action is irreversible.
                      </p>
                      
                      <div className="space-y-6">
                          <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest text-center mb-2">Authorized Security Pin</label>
                            <input 
                                type="password" 
                                value={securityPin}
                                onChange={e => {
                                    setSecurityPin(e.target.value);
                                    setDeleteError('');
                                }}
                                placeholder="••••"
                                autoFocus
                                maxLength={4}
                                className="w-full text-center text-5xl font-black tracking-[0.5em] border-b-8 border-gray-100 bg-transparent py-4 focus:border-red-500 outline-none transition-all placeholder-gray-200 text-red-600"
                            />
                          </div>

                          {deleteError && <p className="text-[10px] text-red-600 font-black text-center uppercase animate-bounce">{deleteError}</p>}
                          
                          <div className="flex space-x-3">
                              <button 
                                  onClick={() => setShowDeleteModal(false)}
                                  disabled={isDeleting}
                                  className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
                              >
                                  Cancel
                              </button>
                              <button 
                                  onClick={handleBulkDelete}
                                  disabled={securityPin.length < 4 || isDeleting}
                                  className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${securityPin.length < 4 || isDeleting ? 'bg-gray-300' : 'bg-red-600 hover:bg-red-700 active:scale-95 shadow-red-200'}`}
                              >
                                  {isDeleting ? 'Erasing...' : 'Wipe Data'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Inventory;
