import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { OpeningStockPayload } from '../../../context/AppContext';
import { Product, ImportBatch } from '../../../types';

interface BulkItemPreview extends Partial<Product> {
    productName: string;
    quantity: number;
    unitCost: number;
    notes?: string;
    action: 'NEW' | 'UPDATE';
}


const OpeningStock: React.FC = () => {
    const { shopId, products, warehouses, shops, currentShopCurrency, addOpeningStock, bulkAddOpeningStock, bulkSyncProducts, importBatches, deleteImportBatch } = useAppContext();
    
    // Manual Form State
    const [productId, setProductId] = useState('');
    const [locationId, setLocationId] = useState('');
    const [quantity, setQuantity] = useState<number>(0);
    const [unitCost, setUnitCost] = useState<number>(0);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Bulk Import State
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvPreviewData, setCsvPreviewData] = useState<BulkItemPreview[]>([]);
    const [bulkLocationId, setBulkLocationId] = useState('');
    const [csvError, setCsvError] = useState('');
    const [isImporting, setIsImporting] = useState(false);
    const [importSuccess, setImportSuccess] = useState('');
    const [operationLog, setOperationLog] = useState<string[]>([]);
    const logEndRef = useRef<HTMLDivElement>(null);

    // Deletion State
    const [deletingBatch, setDeletingBatch] = useState<ImportBatch | null>(null);
    const [securityPin, setSecurityPin] = useState('');
    const [deleteError, setDeleteError] = useState('');

    const latestShopImport = useMemo(() => {
        return importBatches.find(b => b.shopId === shopId) || null;
    }, [importBatches, shopId]);

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

    // Manual Entry Handlers
    const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        setProductId(pid);
        const prod = products.find(p => p.id === pid);
        if (prod) {
            setUnitCost(parseFloat((prod.hoCost * currentShopCurrency.rate).toFixed(2)));
        } else {
            setUnitCost(0);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId || !productId || !locationId || quantity <= 0 || unitCost < 0) {
            alert('Please fill all fields correctly.');
            return;
        }

        await addOpeningStock({
            shopId,
            productId,
            locationId,
            quantity,
            unitCost,
            date: new Date(date + 'T00:00:00'),
            notes: notes || 'Opening Stock Entry'
        });

        const prodName = products.find(p => p.id === productId)?.name;
        setSuccessMessage(`Added ${quantity} units of "${prodName}" to inventory.`);
        
        setProductId('');
        setQuantity(0);
        setUnitCost(0);
        setNotes('');
        setTimeout(() => setSuccessMessage(''), 4000);
    };

      const downloadTemplate = () => {
      const headers = ['"Product Name"', '"Category"', '"HO Cost (USD)"', '"Min Sale Price (USD)"', '"Weight (Kg)"', '"Quantity"', '"Total Cost (USD)"', '"Notes"'];
      const rows = [
          ['"Example New Item"', '"Electronics"', '"150.00"', '"220.00"', '"1.2"', '"10"', `"1555.00"`, '"Initial stock. The system will divide Total Cost by Quantity to get unit cost (155.50)."'],
          ['"Existing Item Name"', '"Gadgets"', '"85.50"', '"120.00"', '"0.5"', '"50"', `"4300.00"`, '"Restock. Unit cost will be calculated as 86.00."']
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
    log('[INFO] Starting CSV file parsing...');
    const reader = new FileReader();
    reader.onload = (event) => {
        const text = event.target?.result as string;
        if (!text) {
            log('[FATAL] File is empty or could not be read.');
            setCsvError('File appears to be empty.');
            return;
        }

        const lines = text.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            log('[FATAL] File must contain a header row and at least one data row.');
            setCsvError('File is missing headers or data.');
            return;
        }

        log(`[INFO] Detected ${lines.length - 1} potential data rows.`);
        
        const headerLine = lines[0].trim();
        const isTsv = (headerLine.match(/\t/g) || []).length > (headerLine.match(/,/g) || []).length;
        const delimiter = isTsv ? '\t' : ',';
        log(`[INFO] Using delimiter: ${isTsv ? "'Tab'" : "'Comma'"}`);
        
        const headers = headerLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/[()"]/g, ''));
        const nameIdx = headers.indexOf('product name');
        const catIdx = headers.indexOf('category');
        const hoCostIdx = headers.indexOf('ho cost usd');
        const minPriceIdx = headers.indexOf('min sale price usd');
        const weightIdx = headers.indexOf('weight kg');
        const qtyIdx = headers.indexOf('quantity');
        const totalCostIdx = headers.indexOf('total cost usd'); // Changed from unit cost
        const notesIdx = headers.indexOf('notes');

        if (nameIdx === -1) {
            log('[FATAL] Required column "Product Name" is missing from the file header.');
            setCsvError('Required column missing: Product Name.');
            return;
        }

        const parsed: BulkItemPreview[] = [];
        let skipped = 0;

        for (let i = 1; i < lines.length; i++) {
            const rowNum = i + 1;
            const line = lines[i].trim();
            if (!line) continue;
            
            const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            
            const name = cols[nameIdx];
            if (!name) {
                log(`[ERROR] Row ${rowNum} skipped: "Product Name" is empty.`);
                skipped++;
                continue;
            }

            const qtyStr = qtyIdx !== -1 ? cols[qtyIdx] : '0';
            const quantity = parseInt(qtyStr);

            const totalCostStr = totalCostIdx !== -1 ? cols[totalCostIdx] : '0';
            const totalCost = parseFloat(totalCostStr);
            
            let unitCost = 0;
            if (!isNaN(quantity) && quantity > 0 && !isNaN(totalCost)) {
                unitCost = totalCost / quantity;
            } else if (isNaN(quantity) || quantity <= 0) {
                unitCost = !isNaN(totalCost) ? totalCost : 0;
            }

            if (quantity > 0 && isNaN(totalCost)) {
                 log(`[ERROR] Row ${rowNum} skipped for "${name}": "Total Cost (USD)" is invalid or missing when Quantity is > 0.`);
                 skipped++;
                 continue;
            }
            
            const existing = products.find(p => p.name.toLowerCase() === name.toLowerCase());
            log(`[SUCCESS] Row ${rowNum} parsed: "${name}" ${!isNaN(quantity) && quantity > 0 ? `(Stock: ${quantity})` : '(Product only)'}`);
            parsed.push({
                productName: name,
                category: catIdx !== -1 ? (cols[catIdx] || (existing?.category || 'Uncategorized')) : (existing?.category || 'Uncategorized'),
                hoCost: hoCostIdx !== -1 ? (parseFloat(cols[hoCostIdx]) || (existing?.hoCost || 0)) : (existing?.hoCost || 0),
                minSalePrice: minPriceIdx !== -1 ? (parseFloat(cols[minPriceIdx]) || (existing?.minSalePrice || 0)) : (existing?.minSalePrice || 0),
                weight: weightIdx !== -1 ? (parseFloat(cols[weightIdx]) || (existing?.weight || 0)) : (existing?.weight || 0),
                quantity: isNaN(quantity) || quantity < 0 ? 0 : quantity,
                unitCost: unitCost,
                notes: notesIdx !== -1 ? cols[notesIdx] : '',
                action: existing ? 'UPDATE' : 'NEW'
            });
        }
        
        log(`[SUMMARY] Parsing complete. ${parsed.length} products to sync, ${skipped} rows fully skipped.`);

        if (parsed.length === 0) {
            setCsvError('No valid products found. Check console for details.');
        } else {
            setCsvPreviewData(parsed);
            if (skipped > 0) {
                setCsvError(`${skipped} invalid rows were fully skipped. See console for details.`);
            }
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
          const productsToSync = csvPreviewData.map(item => ({
              name: item.productName,
              category: item.category,
              hoCost: item.hoCost,
              minSalePrice: item.minSalePrice,
              weight: item.weight,
          }));

          log(`Syncing ${productsToSync.length} products with central database...`);
          const nameToIdMap = await bulkSyncProducts(productsToSync);
          log(`Product sync complete. ${nameToIdMap.size} items processed.`);
          
          const stockItems = csvPreviewData.filter(item => item.quantity > 0);

          if (stockItems.length > 0) {
              const stockPayload: OpeningStockPayload[] = stockItems.map(item => {
                  const productId = nameToIdMap.get(item.productName.toLowerCase());
                  if (!productId) {
                      log(`[ERROR] Could not find Product ID for "${item.productName}" after sync. Stock not added.`);
                      return null;
                  }
                  return {
                      shopId: shopId!,
                      productId: productId,
                      locationId: bulkLocationId,
                      quantity: item.quantity,
                      unitCost: item.unitCost, // This is now in USD
                      date: new Date(),
                      notes: item.notes || 'Bulk Inventory Sync'
                  };
              }).filter((item): item is OpeningStockPayload => item !== null);

              if (stockPayload.length > 0) {
                  log(`Posting ${stockPayload.length} stock entries to the ledger...`);
                  await bulkAddOpeningStock(stockPayload, nameToIdMap.size);
                  log(`SUCCESS: Ledger updated with stock entries.`);
              }
              setImportSuccess(`Successfully synced ${productsToSync.length} products and imported ${stockPayload.length} stock entries.`);
          } else {
              log(`INFO: No items with quantity > 0 found. Only product data was synced.`);
              setImportSuccess(`Successfully synced ${productsToSync.length} products. No new stock was added.`);
          }

          setCsvFile(null);
          setCsvPreviewData([]);
          setTimeout(() => {
            setImportSuccess('');
            setOperationLog([]);
          }, 8000);
      } catch (e: any) {
          setCsvError(`Import failed: ${e.message}`);
          log(`FATAL ERROR: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
  };

    const handleDeleteLastImport = async () => {
        if (securityPin !== '7860') {
            setDeleteError('Incorrect Security PIN.');
            return;
        }
        if (!deletingBatch) return;

        setIsImporting(true); // Reuse loading state
        log(`[ROLLBACK] Authorization accepted. Deleting import batch ID: ${deletingBatch.id}`);
        try {
            await deleteImportBatch(deletingBatch.id);
            log(`[SUCCESS] Rollback complete. The previous import has been erased from the ledger.`);
            setDeletingBatch(null);
            setSecurityPin('');
            setDeleteError('');
        } catch (e: any) {
            log(`[FATAL] Rollback failed: ${e.message}`);
            setDeleteError('Rollback failed. Please check console for details.');
        } finally {
            setIsImporting(false);
        }
    };


    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Opening Stock / Adjustments</h2>
            
            {latestShopImport && (
            <div className="p-6 bg-red-50 border-2 border-dashed border-red-200 rounded-2xl shadow-sm">
                <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-red-800">Recent Import Action Required</h3>
                        <p className="text-sm text-red-700 font-medium">
                            The last bulk import on <span className="font-bold">{new Date(latestShopImport.date).toLocaleString()}</span> contained <span className="font-bold">{latestShopImport.itemCount}</span> stock entries.
                        </p>
                         <p className="text-xs text-red-600 font-bold">If you made a mistake (e.g., wrong costs), you can delete this entire import.</p>
                    </div>
                    <button
                        onClick={() => setDeletingBatch(latestShopImport)}
                        className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-6 rounded-lg text-sm uppercase tracking-widest shadow-lg flex items-center space-x-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        <span>Delete Last Import</span>
                    </button>
                </div>
            </div>
            )}
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Manual Entry Column */}
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Single Entry</h3>
                    <p className="text-xs text-gray-500 mb-4">Add stock for one item manually.</p>
                    
                    {successMessage && (
                        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 mb-4 text-sm" role="alert">
                            <p>{successMessage}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Date</label>
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Location</label>
                            <select value={locationId} onChange={e => setLocationId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                <option value="">Select Location</option>
                                {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Product</label>
                            <select value={productId} onChange={handleProductChange} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                <option value="">Select Product</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="1" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Cost ({currentShopCurrency.symbol})</label>
                                <input type="number" value={unitCost} onChange={e => setUnitCost(parseFloat(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0" step="0.01" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Notes</label>
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" />
                        </div>
                        <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg transition duration-300">Add Stock</button>
                    </form>
                </div>

                {/* Bulk Import Column */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-xl border-2 border-primary/10">
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
                            <div className="h-40 bg-black/50 p-3 rounded-lg overflow-y-auto font-mono text-xs text-green-400 space-y-1 custom-scrollbar">
                                {operationLog.length === 0 ? <p className="text-gray-600"># Waiting for instructions...</p> : operationLog.map((l, i) => <p key={i} className={l.includes('ERROR') || l.includes('FATAL') ? 'text-red-500' : (l.includes('SUCCESS') ? 'text-blue-400' : (l.includes('SUMMARY') ? 'text-yellow-400' : ''))}>{l}</p>)}
                                <div ref={logEndRef}></div>
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
            </div>

            {deletingBatch && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all animate-scale-up">
                        <div className="bg-red-600 p-6 text-white text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </div>
                            <h3 className="text-xl font-black uppercase tracking-tighter italic">Confirm Deletion</h3>
                            <p className="text-xs font-bold text-red-100 uppercase tracking-widest mt-1">Permanent Rollback Operation</p>
                        </div>
                        <div className="p-8">
                            <p className="text-sm text-gray-500 font-medium mb-6 text-center">Enter the Master Security PIN to confirm the permanent removal of this entire import batch.</p>
                            
                            <div className="space-y-4">
                                <input 
                                    type="password" 
                                    value={securityPin}
                                    onChange={e => { setSecurityPin(e.target.value); setDeleteError(''); }}
                                    placeholder="Master PIN"
                                    autoFocus
                                    className="w-full text-center text-3xl font-black tracking-[0.5em] border-4 border-gray-100 bg-gray-50 rounded-xl py-3 focus:border-red-500 focus:bg-white outline-none transition-all"
                                />
                                {deleteError && <p className="text-[10px] text-red-600 font-black text-center uppercase animate-bounce">{deleteError}</p>}
                                
                                <div className="flex space-x-3 pt-4">
                                    <button 
                                        onClick={() => setDeletingBatch(null)}
                                        disabled={isImporting}
                                        className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-all uppercase tracking-widest text-[10px]"
                                    >
                                        Abort
                                    </button>
                                    <button 
                                        onClick={handleDeleteLastImport}
                                        disabled={isImporting || securityPin !== '7860'}
                                        className={`flex-1 py-3 text-white font-black rounded-xl transition-all uppercase text-xs tracking-widest shadow-lg ${isImporting || securityPin !== '7860' ? 'bg-gray-300' : 'bg-red-600 hover:bg-red-700 active:scale-95'}`}
                                    >
                                        {isImporting ? 'Erasing...' : 'Erase Batch'}
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

export default OpeningStock;