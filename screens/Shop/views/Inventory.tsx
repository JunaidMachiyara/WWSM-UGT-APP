
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { useAppContext, OpeningStockPayload } from '../../../context/AppContext';
import { TransactionType, Product } from '../../../types';

interface BulkItemPreview extends Partial<Product> {
    productName: string;
    quantity: number;
    unitCost: number;
    notes?: string;
    action: 'NEW' | 'UPDATE';
}

const Inventory: React.FC = () => {
  const { shopId, products, warehouses, getStockLevel, shops, formatCurrency, transactions, currentShopCurrency, bulkAddOpeningStock, bulkSyncProducts } = useAppContext();
  
  const [selectedLocationId, setSelectedLocationId] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showImportSection, setShowImportSection] = useState(false);

  // Bulk Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<BulkItemPreview[]>([]);
  const [bulkLocationId, setBulkLocationId] = useState('');
  const [csvError, setCsvError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');
  const [operationLog, setOperationLog] = useState<string[]>([]);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [operationLog]);

  const log = (msg: string) => {
    setOperationLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

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
      const headers = ['"Product Name"', '"Category"', '"HO Cost (USD)"', '"Min Sale Price (USD)"', '"Weight (Kg)"', '"Quantity"', '"Unit Cost (Local)"', '"Notes"'];
      const rows = [
          ['"Example New Item"', '"Electronics"', '"150.00"', '"220.00"', '"1.2"', '"10"', `"${(150 * currentShopCurrency.rate * 1.1).toFixed(2)}"`, '"Initial stock count"'],
          ['"Existing Item Name"', '"Gadgets"', '"85.50"', '"120.00"', '"0.5"', '"50"', `"${(85.50 * currentShopCurrency.rate * 1.1).toFixed(2)}"`, '"Restock"']
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `stock_and_product_sync_template.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setCsvError('');
      setImportSuccess('');
      setOperationLog([]);
      setCsvPreviewData([]);
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

          const lines = text.split('\n').filter(line => line.trim() !== '');
          if (lines.length < 2) {
              setCsvError('File appears empty or missing headers.');
              return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[()"]/g, ''));
          const nameIdx = headers.indexOf('product name');
          const catIdx = headers.indexOf('category');
          const hoCostIdx = headers.indexOf('ho cost usd');
          const minPriceIdx = headers.indexOf('min sale price usd');
          const weightIdx = headers.indexOf('weight kg');
          const qtyIdx = headers.indexOf('quantity');
          const unitCostIdx = headers.indexOf('unit cost local');
          const notesIdx = headers.indexOf('notes');

          if (nameIdx === -1 || qtyIdx === -1 || unitCostIdx === -1) {
              setCsvError('Required columns missing: Product Name, Quantity, Unit Cost (Local).');
              return;
          }

          const parsed: BulkItemPreview[] = [];
          let skipped = 0;

          for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
              const name = cols[nameIdx];
              const qty = parseInt(cols[qtyIdx]);
              const unitCost = parseFloat(cols[unitCostIdx]);

              if (name && !isNaN(qty) && qty > 0 && !isNaN(unitCost)) {
                  const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
                  parsed.push({
                      productName: name,
                      category: cols[catIdx] || (existing?.category || 'Uncategorized'),
                      hoCost: parseFloat(cols[hoCostIdx]) || (existing?.hoCost || 0),
                      minSalePrice: parseFloat(cols[minPriceIdx]) || (existing?.minSalePrice || 0),
                      weight: parseFloat(cols[weightIdx]) || (existing?.weight || 0),
                      quantity: qty,
                      unitCost: unitCost,
                      notes: cols[notesIdx] || '',
                      action: existing ? 'UPDATE' : 'NEW'
                  });
              } else {
                  skipped++;
              }
          }

          if (parsed.length === 0) {
              setCsvError('No valid entries found. Check file content.');
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
      log("Initiating bulk operation...");
      try {
          // 1. Prepare product data for sync
          const productsToSync = csvPreviewData.map(item => ({
              name: item.productName,
              category: item.category,
              hoCost: item.hoCost,
              minSalePrice: item.minSalePrice,
              weight: item.weight,
          }));

          // 2. Sync products and get the ID map
          log(`Syncing ${productsToSync.length} products with central database...`);
          const nameToIdMap = await bulkSyncProducts(productsToSync);
          log(`Product sync complete. ${nameToIdMap.size} items processed.`);

          // 3. Prepare opening stock payload using the new IDs
          const stockPayload: OpeningStockPayload[] = csvPreviewData.map(item => {
              const productId = nameToIdMap.get(item.productName.toLowerCase());
              if (!productId) {
                  const errMsg = `CRITICAL: Could not find Product ID for "${item.productName}" after sync. Aborting.`;
                  log(errMsg);
                  throw new Error(errMsg);
              }
              return {
                  shopId: shopId!,
                  productId: productId,
                  locationId: bulkLocationId,
                  quantity: item.quantity,
                  unitCost: item.unitCost, // This is local currency from CSV
                  date: new Date(),
                  notes: item.notes || 'Bulk Inventory Sync'
              };
          });

          // 4. Add opening stock
          log(`Posting ${stockPayload.length} stock entries to the ledger...`);
          await bulkAddOpeningStock(stockPayload);
          log(`SUCCESS: Ledger updated.`);

          setImportSuccess(`Successfully synced ${productsToSync.length} products and imported ${stockPayload.length} stock entries.`);
          setCsvFile(null);
          setCsvPreviewData([]);
          setTimeout(() => {
            setShowImportSection(false);
            setImportSuccess('');
            setOperationLog([]);
          }, 4000);
      } catch (e: any) {
          setCsvError(`Import failed: ${e.message}`);
          log(`FATAL ERROR: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
  };

  const inventoryLevels = useMemo(() => {
    // ... (existing logic, no changes needed here)
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
              {showImportSection ? 'Close Utility' : 'Bulk Stock & Product Sync'}
          </button>
      </div>

      {/* Bulk Import Section (Toggleable) */}
      {showImportSection && (
          <div className="bg-white p-6 rounded-xl shadow-xl border-2 border-primary/10 animate-fade-in-down">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-black text-gray-900 mb-2 uppercase italic">Bulk Sync Utility</h3>
                    <p className="text-sm text-gray-500 mb-6">Create new products and record stock levels from a single CSV file. The system matches by name to update existing items or create new ones.</p>
                    
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">1. Set Target Location</label>
                          <select value={bulkLocationId} onChange={e => setBulkLocationId(e.target.value)} className="w-full border border-gray-300 rounded-lg p-3 bg-white font-bold text-gray-900 focus:ring-primary focus:border-primary">
                              <option value="">-- Choose where stock will be added --</option>
                              {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                          </select>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">2. Upload Manifest</label>
                           <input type="file" id="bulkStockCsv" accept=".csv" onChange={handleFileChange} className="hidden" />
                           <label htmlFor="bulkStockCsv" className="cursor-pointer flex items-center justify-between p-4 rounded-xl bg-white border-2 border-dashed border-gray-200 hover:border-primary transition-colors group">
                                <span className="text-sm font-bold text-gray-500 group-hover:text-primary">{csvFile ? `File: ${csvFile.name}` : 'Click to select CSV...'}</span>
                                <span className="text-xs font-black bg-primary text-white px-3 py-1 rounded-lg">Upload</span>
                           </label>
                        </div>

                        <button onClick={downloadTemplate} className="w-full flex items-center justify-center space-x-2 text-xs font-black text-blue-700 bg-blue-50 py-3 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all uppercase tracking-widest">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            <span>Download CSV Template</span>
                        </button>
                    </div>
                  </div>

                  <div className="bg-gray-900 rounded-xl p-5 border-4 border-gray-800 flex flex-col">
                      <div className="flex justify-between items-center mb-3">
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Console</h4>
                           <div className={`w-3 h-3 rounded-full ${isImporting ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
                      </div>
                      <div className="h-40 bg-black/50 p-3 rounded-lg overflow-y-auto font-mono text-xs text-green-400 space-y-1 custom-scrollbar flex flex-col-reverse">
                          <div ref={logEndRef}></div>
                          {operationLog.length === 0 ? <p className="text-gray-600"># Waiting for instructions...</p> : operationLog.map((l, i) => <p key={i} className={l.includes('ERROR') || l.includes('FATAL') ? 'text-red-500' : ''}>{l}</p>)}
                      </div>
                      
                      {csvError && <div className="mt-2 p-2 bg-red-500/20 text-red-400 rounded text-xs border border-red-500 font-bold">{csvError}</div>}
                      {importSuccess && <div className="mt-2 p-2 bg-green-500/20 text-green-400 rounded text-xs border border-green-500 font-bold">{importSuccess}</div>}
                      
                      {csvPreviewData.length > 0 && (
                          <div className="mt-auto pt-4 space-y-2">
                              <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">Preview: {csvPreviewData.length} records parsed</p>
                              <button onClick={handleBulkImport} disabled={isImporting || !bulkLocationId} className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-3 px-6 rounded-lg flex items-center justify-center disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg">
                                  {isImporting ? 'Processing...' : 'Commit to Ledger'}
                              </button>
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
