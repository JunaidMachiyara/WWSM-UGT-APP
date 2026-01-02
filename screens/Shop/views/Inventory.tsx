
import React, { useMemo, useState } from 'react';
import { useAppContext, OpeningStockPayload } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

const Inventory: React.FC = () => {
  const { shopId, products, warehouses, getStockLevel, shops, formatCurrency, transactions, currentShopCurrency, bulkAddOpeningStock } = useAppContext();
  
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showImportSection, setShowImportSection] = useState(false);

  // Bulk Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<any[]>([]);
  const [bulkLocationId, setBulkLocationId] = useState('');
  const [csvError, setCsvError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

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

  // Bulk Import Logic
  const downloadTemplate = () => {
      const headers = ['Product ID', 'Product Name', 'Category', 'Initial Qty', 'Unit Cost (Local)', 'Notes'];
      const rows = products.map(p => [
          p.id,
          p.name.replace(/,/g, ''), 
          p.category,
          '0', 
          (p.hoCost * currentShopCurrency.rate).toFixed(2),
          'Migration Initialization'
      ]);
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `inventory_init_template_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCsvError('');
      setImportSuccess('');
      if (e.target.files && e.target.files[0]) {
          setCsvFile(e.target.files[0]);
          parseCSV(e.target.files[0]);
      }
  };

  const parseCSV = (file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
          const text = event.target?.result as string;
          if (!text) return;

          const lines = text.split('\n');
          if (lines.length < 2) {
              setCsvError('File appears empty or missing headers.');
              return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const pidIdx = headers.indexOf('product id');
          const qtyIdx = headers.findIndex(h => h.includes('qty') || h.includes('quantity'));
          const costIdx = headers.findIndex(h => h.includes('cost') || h.includes('price'));
          const notesIdx = headers.indexOf('notes');

          if (pidIdx === -1 || qtyIdx === -1 || costIdx === -1) {
              setCsvError('Required columns missing: Product ID, Initial Qty, Unit Cost (Local).');
              return;
          }

          const parsed: any[] = [];
          let skipped = 0;

          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              const cols = line.split(',').map(c => c.trim());
              const pid = cols[pidIdx];
              const qty = parseInt(cols[qtyIdx]);
              const cost = parseFloat(cols[costIdx]);
              const note = notesIdx !== -1 ? cols[notesIdx] : '';

              const product = products.find(p => p.id === pid);

              if (product && !isNaN(qty) && qty > 0 && !isNaN(cost)) {
                  parsed.push({
                      productId: pid,
                      productName: product.name,
                      quantity: qty,
                      unitCost: cost,
                      notes: note
                  });
              } else {
                  skipped++;
              }
          }

          if (parsed.length === 0) {
              setCsvError('No valid entries found. Ensure Product IDs match existing items.');
          } else {
              setCsvPreviewData(parsed);
              if (skipped > 0) setCsvError(`${skipped} invalid rows were skipped.`);
          }
      };
      reader.readAsText(file);
  };

  const handleBulkImport = async () => {
      if (!bulkLocationId || !shopId) {
          alert('Please select a target location for the stock.');
          return;
      }
      
      setIsImporting(true);
      try {
          const payload: OpeningStockPayload[] = csvPreviewData.map(item => ({
              shopId: shopId!,
              productId: item.productId,
              locationId: bulkLocationId,
              quantity: item.quantity,
              unitCost: item.unitCost,
              date: new Date(),
              notes: item.notes || 'Bulk Inventory Migration'
          }));

          await bulkAddOpeningStock(payload);
          setImportSuccess(`Successfully initialized ${payload.length} stock lines in Ledger.`);
          setCsvPreviewData([]);
          setCsvFile(null);
          setTimeout(() => setShowImportSection(false), 3000);
      } catch (e: any) {
          setCsvError(`Import failed: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
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

    const levels: any[] = [];
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
                unitCost: avgCost, totalValue: stock * avgCost, totalRetailValue: stock * product.minSalePrice,
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

  return (
    <div className="space-y-8">
      {/* Utility Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 gap-4">
          <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-50 text-primary rounded-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
              </div>
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tighter italic">Inventory Command</h2>
          </div>
          <button 
            onClick={() => setShowImportSection(!showImportSection)}
            className={`flex items-center px-4 py-2 rounded-lg font-black text-xs uppercase tracking-widest transition-all shadow-md ${showImportSection ? 'bg-gray-100 text-gray-500' : 'bg-primary text-white hover:bg-primary-dark'}`}
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {showImportSection ? 'Close Utility' : 'Initialize Starting Stock'}
          </button>
      </div>

      {/* Bulk Import Section (Toggleable) */}
      {showImportSection && (
          <div className="bg-white p-6 rounded-xl shadow-xl border-2 border-primary/10 animate-fade-in-down">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-2 uppercase italic">Bulk Initialization Utility</h3>
                    <p className="text-sm text-gray-500 mb-6">Record starting balances for products. This creates opening ledger entries (JVs) and updates inventory valuation immediately.</p>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Target Storage Location</label>
                            <select 
                                value={bulkLocationId} 
                                onChange={e => setBulkLocationId(e.target.value)} 
                                className="w-full border border-gray-300 rounded-lg p-3 bg-white font-bold text-gray-900 focus:ring-primary focus:border-primary"
                            >
                                <option value="">-- Choose Location --</option>
                                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                        </div>

                        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100/50 transition-colors">
                            <input type="file" id="bulkStockCsv" accept=".csv" onChange={handleFileChange} className="hidden" />
                            <label htmlFor="bulkStockCsv" className="cursor-pointer flex flex-col items-center group">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary mb-2 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                <span className="text-primary font-black text-sm uppercase tracking-widest">Upload Stock Manifest</span>
                            </label>
                            {csvFile && <p className="mt-2 text-xs font-bold text-gray-600 bg-white inline-block px-3 py-1 rounded-full border border-gray-100">File: {csvFile.name}</p>}
                        </div>

                        <button 
                            onClick={downloadTemplate}
                            className="w-full flex items-center justify-center space-x-2 text-xs font-black text-blue-700 bg-blue-50 py-3 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all uppercase tracking-widest"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>Download Current ID Template</span>
                        </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
                      {csvError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-xs font-bold border border-red-100">{csvError}</div>}
                      {importSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100 animate-pulse">{importSuccess}</div>}
                      
                      {csvPreviewData.length > 0 ? (
                          <div className="h-full flex flex-col">
                              <div className="flex justify-between items-center mb-3">
                                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">Parsing Result ({csvPreviewData.length} lines)</h4>
                                  <button 
                                    onClick={handleBulkImport} 
                                    disabled={isImporting || !bulkLocationId}
                                    className="bg-green-600 hover:bg-green-700 text-white font-black py-2 px-6 rounded-lg text-[10px] uppercase tracking-widest shadow-lg disabled:opacity-50"
                                  >
                                      {isImporting ? 'Syncing...' : 'Commit to Ledger'}
                                  </button>
                              </div>
                              <div className="flex-1 overflow-y-auto max-h-[300px] border border-gray-200 rounded-lg bg-white shadow-inner">
                                  <table className="min-w-full divide-y divide-gray-200 text-[11px]">
                                      <thead className="bg-gray-50 sticky top-0">
                                          <tr>
                                              <th className="px-3 py-2 text-left font-black text-gray-400 uppercase">Item</th>
                                              <th className="px-3 py-2 text-center font-black text-gray-400 uppercase">Qty</th>
                                              <th className="px-3 py-2 text-right font-black text-gray-400 uppercase">Cost ({currentShopCurrency.symbol})</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100">
                                          {csvPreviewData.map((item, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="px-3 py-2 font-bold text-gray-900">{item.productName}</td>
                                                  <td className="px-3 py-2 text-center font-black text-blue-600">{item.quantity}</td>
                                                  <td className="px-3 py-2 text-right text-gray-500">{item.unitCost.toLocaleString()}</td>
                                              </tr>
                                          ))}
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      ) : (
                          <div className="h-full flex flex-col items-center justify-center text-center py-10 opacity-30">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                              <p className="text-sm font-black uppercase tracking-widest">Waiting for CSV manifest</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Existing Inventory View */}
      <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
            <h3 className="text-xl font-bold text-gray-800 border-b-4 border-primary/20 pb-1">Real-Time Inventory Status</h3>
            
            <div className="flex flex-wrap gap-4 w-full lg:w-auto">
                <div className="flex-1 min-w-[200px]">
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
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Search Products</label>
                    <input 
                        type="text" 
                        placeholder="Name..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white text-gray-900"
                    />
                </div>
            </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Product / Category</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Stored In</th>
                <th className="px-6 py-4 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Avg Cost/Unit</th>
                <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Inventory Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredInventory.length > 0 ? filteredInventory.map(item => (
                <tr key={`${item.productId}-${item.locationId}`} className="hover:bg-gray-50 transition-colors">
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
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 font-medium">{formatCurrency(item.unitCost)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-gray-900 bg-gray-50/50">{formatCurrency(item.totalValue)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="text-center py-20 text-gray-400 italic">
                      No stock records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest">Total Items Found</p>
                <p className="text-2xl font-black text-blue-900">{filteredInventory.reduce((s, i) => s + i.stock, 0).toLocaleString()} <span className="text-xs">Units</span></p>
            </div>
            <div className="p-4 bg-green-50 border border-green-100 rounded-xl">
                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest">Total Retail Value (Min)</p>
                <p className="text-2xl font-black text-green-900">{formatCurrency(filteredInventory.reduce((s, i) => s + i.totalRetailValue / currentShopCurrency.rate, 0))}</p>
            </div>
            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-xl">
                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">Consolidated Cost Value</p>
                <p className="text-2xl font-black text-indigo-900">{formatCurrency(filteredInventory.reduce((s, i) => s + i.totalValue / currentShopCurrency.rate, 0))}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
