
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Product } from '../../../types';

interface BulkItemPreview extends Omit<Product, 'id'> {
    id?: string;
    action: 'NEW' | 'UPDATE';
}

const ItemManagement: React.FC = () => {
  const { products, addProduct, bulkSyncProducts, standardizeItemIds } = useAppContext();
  
  // Manual Entry State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [hoCost, setHoCost] = useState(0);
  const [minSalePrice, setMinSalePrice] = useState(0);
  const [weight, setWeight] = useState(0);

  // Migration Utility State
  const [showStandardizeModal, setShowStandardizeModal] = useState(false);
  const [pin, setPin] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  // Bulk Sync State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<BulkItemPreview[]>([]);
  const [csvError, setCsvError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

  // Calculate Next ID
  const nextAssignedId = useMemo(() => {
    const itemsWithId = products.filter(p => p.id.startsWith('ITEM-'));
    if (itemsWithId.length === 0) return 'ITEM-1001';
    const maxId = Math.max(...itemsWithId.map(p => {
        const suffix = p.id.split('-')[1];
        return parseInt(suffix) || 0;
    }));
    return `ITEM-${maxId + 1}`;
  }, [products]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || hoCost <= 0 || minSalePrice <= 0) {
      alert('Please fill all fields correctly. Costs and prices must be greater than zero.');
      return;
    }
    if (minSalePrice < hoCost) {
        alert('Minimum Sale Price cannot be less than the Head Office Cost.');
        return;
    }
    addProduct({ 
        name, 
        category, 
        hoCost: Number(hoCost), 
        minSalePrice: Number(minSalePrice),
        weight: Number(weight)
    });
    setName('');
    setCategory('');
    setHoCost(0);
    setMinSalePrice(0);
    setWeight(0);
  };

  const handleStandardize = async () => {
      if (pin !== '7860') {
          alert("Invalid Authorization PIN.");
          return;
      }
      setIsMigrating(true);
      try {
          await standardizeItemIds();
          setShowStandardizeModal(false);
      } catch (err: any) {
          alert(`Migration failed: ${err.message}`);
      } finally {
          setIsMigrating(false);
      }
  };

  // CSV Helper: Download Template
  const downloadTemplate = () => {
      const headers = ['Product ID', 'Name', 'Category', 'HO Cost', 'Min Sale Price', 'Weight (Kg)'];
      const rows = [
          ['ITEM-1001', 'Sample Product A', 'Electronics', '150.00', '200.00', '2.5'],
          ['ITEM-1002', 'Sample Product B', 'Furniture', '85.50', '120.00', '15.0']
      ];
      
      const csvContent = "data:text/csv;charset=utf-8," 
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "items_import_template.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // Export Current List for Updating (Improved Excel Compatibility)
  const exportCurrentList = () => {
      const headers = ['Product ID', 'Name', 'Category', 'HO Cost', 'Min Sale Price', 'Weight (Kg)'];
      const sortedProductsExport = [...products].sort((a,b) => {
          return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
      
      // Escape CSV values (double quotes for strings containing commas)
      const rows = sortedProductsExport.map(p => [
          p.id,
          `"${p.name.replace(/"/g, '""')}"`, 
          `"${p.category.replace(/"/g, '""')}"`,
          p.hoCost.toFixed(2),
          p.minSalePrice.toFixed(2),
          (p.weight || 0).toFixed(2)
      ]);

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" // Add BOM for Excel UTF-8 support
          + headers.join(",") + "\n" 
          + rows.map(e => e.join(",")).join("\n");
          
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `central_item_database_${new Date().toISOString().split('T')[0]}.csv`);
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
              setCsvError('File appears empty or missing data rows.');
              return;
          }

          const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[()]/g, ''));
          
          const idIdx = headers.findIndex(h => h.includes('id'));
          const nameIdx = headers.findIndex(h => h === 'name');
          const catIdx = headers.findIndex(h => h === 'category');
          const costIdx = headers.findIndex(h => h.includes('cost'));
          const priceIdx = headers.findIndex(h => h.includes('price'));
          const weightIdx = headers.findIndex(h => h.includes('weight'));

          if (nameIdx === -1 || catIdx === -1 || costIdx === -1 || priceIdx === -1) {
              setCsvError('Missing required columns. Required: Name, Category, HO Cost, Min Sale Price.');
              return;
          }

          const parsedItems: BulkItemPreview[] = [];
          let errorLines = 0;

          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue;

              // Improved regex for parsing quoted CSV values
              const cols = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
              const cleanCols = (cols || []).map(c => c.trim().replace(/^"|"$/g, ''));

              const idVal = idIdx !== -1 ? cleanCols[idIdx] : '';
              const nameVal = cleanCols[nameIdx];
              const categoryVal = cleanCols[catIdx];
              const costVal = parseFloat(cleanCols[costIdx]);
              const priceVal = parseFloat(cleanCols[priceIdx]);
              const weightVal = weightIdx !== -1 ? parseFloat(cleanCols[weightIdx]) : 0;

              if (nameVal && categoryVal && !isNaN(costVal) && !isNaN(priceVal)) {
                  const existingById = idVal ? products.find(p => p.id === idVal) : null;
                  const existingByName = products.find(p => p.name.toLowerCase() === nameVal.toLowerCase());
                  const existing = existingById || existingByName;

                  parsedItems.push({
                      id: existing?.id || idVal, 
                      name: nameVal,
                      category: categoryVal,
                      hoCost: costVal,
                      minSalePrice: priceVal,
                      weight: isNaN(weightVal) ? 0 : weightVal,
                      action: existing ? 'UPDATE' : 'NEW'
                  });
              } else {
                  errorLines++;
              }
          }

          if (parsedItems.length === 0) {
              setCsvError('No valid items found. Check column headers and data.');
          } else {
              setCsvPreviewData(parsedItems);
              if (errorLines > 0) setCsvError(`${errorLines} rows skipped due to invalid data.`);
          }
      };
      reader.readAsText(file);
  };

  const handleBulkSync = async () => {
      if (csvPreviewData.length === 0) return;
      
      setIsImporting(true);
      try {
          await bulkSyncProducts(csvPreviewData);
          setImportSuccess(`Success! Synced ${csvPreviewData.length} items.`);
          setCsvFile(null);
          setCsvPreviewData([]);
          const fileInput = document.getElementById('itemCsvInput') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
      } catch (e: any) {
          setCsvError(`Sync failed: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
  };

  const sortedProducts = useMemo(() => {
      return [...products].sort((a,b) => {
          // Natural sort for ITEM-XXXX strings
          return a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [products]);

  const needsStandardization = products.some(p => !p.id.startsWith('ITEM-'));

  return (
    <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Single Entry Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 uppercase italic tracking-tighter">Create Single Item</h3>
                    <div className="bg-blue-50 px-2 py-1 rounded text-[10px] font-black text-blue-600 border border-blue-100">
                        {nextAssignedId}
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Assigned System ID</label>
                        <input type="text" value={nextAssignedId} readOnly className="w-full border border-gray-100 rounded-md p-2 bg-gray-50 text-gray-400 font-mono text-xs cursor-not-allowed" />
                    </div>
                    <div>
                        <label htmlFor="itemName" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Item Name</label>
                        <input type="text" id="itemName" value={name} onChange={e => setName(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                    </div>
                    <div>
                        <label htmlFor="itemCategory" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                        <input type="text" id="itemCategory" value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="hoCost" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">HO Cost ($)</label>
                            <input type="number" id="hoCost" value={hoCost} onChange={e => setHoCost(Number(e.target.value))} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
                        </div>
                        <div>
                            <label htmlFor="minSalePrice" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Min Sale Price ($)</label>
                            <input type="number" id="minSalePrice" value={minSalePrice} onChange={e => setMinSalePrice(Number(e.target.value))} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="itemWeight" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Weight (Kg)</label>
                        <input type="number" id="itemWeight" value={weight} onChange={e => setWeight(Number(e.target.value))} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" />
                    </div>
                    <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-black py-3 px-4 rounded-lg transition-all shadow-md uppercase tracking-widest text-sm">Save New Item</button>
                </form>
            </div>

            {/* Bulk Sync Section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 uppercase tracking-tighter italic">Database Utilities</h3>
                        <p className="text-sm text-gray-500 mt-1">Manage bulk updates and ID consistency.</p>
                    </div>
                    <div className="flex space-x-2">
                        {needsStandardization && (
                            <button 
                                onClick={() => setShowStandardizeModal(true)}
                                className="text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-700 font-black py-2 px-3 rounded-lg border border-orange-200 flex items-center uppercase tracking-widest transition-all animate-pulse"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                Standardize IDs
                            </button>
                        )}
                        <button 
                            onClick={exportCurrentList}
                            className="text-[10px] bg-green-50 hover:bg-green-100 text-green-700 font-black py-2 px-3 rounded-lg border border-green-200 flex items-center uppercase tracking-widest transition-all"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Export to Excel (CSV)
                        </button>
                    </div>
                </div>

                <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 mb-6 hover:bg-gray-100/50 transition-colors">
                    <input 
                        type="file" 
                        id="itemCsvInput"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <label htmlFor="itemCsvInput" className="cursor-pointer flex flex-col items-center justify-center group">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform border border-gray-100">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                        </div>
                        <span className="text-primary font-bold hover:underline italic">Import Item Updates via CSV</span>
                        <span className="text-[10px] text-gray-400 mt-2 font-black uppercase tracking-widest italic">Matches record by ID (e.g. ITEM-1001)</span>
                    </label>
                    {csvFile && <p className="mt-4 text-sm font-bold text-gray-800 bg-white inline-block px-4 py-1 rounded-full shadow-sm border border-gray-100">File: {csvFile.name}</p>}
                </div>

                {csvError && <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100 font-medium">{csvError}</div>}
                {importSuccess && <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl text-sm border border-green-100 font-bold animate-pulse">{importSuccess}</div>}

                {csvPreviewData.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <h4 className="font-black text-xs text-gray-500 uppercase tracking-widest italic">Import Preview ({csvPreviewData.length} lines)</h4>
                            <div className="flex space-x-2">
                                <button onClick={() => setCsvPreviewData([])} className="text-xs font-bold text-gray-500 px-3 py-1 hover:text-gray-800 transition-colors">Discard</button>
                                <button 
                                    onClick={handleBulkSync} 
                                    disabled={isImporting}
                                    className="bg-primary hover:bg-primary-dark text-white font-black py-2 px-6 rounded-lg flex items-center disabled:opacity-50 text-xs uppercase tracking-widest shadow-lg transition-all"
                                >
                                    {isImporting ? 'Processing...' : 'Confirm Sync'}
                                </button>
                            </div>
                        </div>
                        <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-xl shadow-inner bg-white">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">System ID</th>
                                        <th className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</th>
                                        <th className="px-4 py-3 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                        <th className="px-4 py-3 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">HO Cost</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {csvPreviewData.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{item.id || 'AUTO'}</td>
                                            <td className="px-4 py-3">
                                                <p className="text-gray-900 font-bold">{item.name}</p>
                                                <p className="text-[9px] text-gray-400 uppercase font-black">{item.category}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.action === 'UPDATE' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>
                                                    {item.action}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right font-black text-gray-900">${item.hoCost.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>

        {/* Existing Items Table */}
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100">
            <h3 className="text-xl font-bold mb-4 text-gray-800 uppercase tracking-tighter italic">Central Item Database ({products.length})</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">System ID</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Name</th>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">HO Cost</th>
                    <th className="px-6 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Min Sale</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                {sortedProducts.map(product => (
                    <tr key={product.id} className={`hover:bg-gray-50 transition-colors ${!product.id.startsWith('ITEM-') ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-[11px] font-black text-primary uppercase">
                        {product.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-medium">
                         <span className="bg-gray-50 px-2 py-1 rounded border border-gray-100 uppercase text-[10px] font-bold">{product.category}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-blue-600">${product.hoCost.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-black text-green-600">${product.minSalePrice.toFixed(2)}</td>
                    </tr>
                ))}
                {products.length === 0 && (
                    <tr>
                        <td colSpan={5} className="text-center py-20 text-gray-400 italic">Central database is empty. Add or sync items to begin.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </div>

        {/* Standardize IDs Modal */}
        {showStandardizeModal && (
            <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4 animate-fade-in">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-scale-up border-4 border-orange-600/20">
                    <div className="bg-orange-600 p-8 text-white text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic">ID Standardization</h3>
                        <p className="text-xs font-bold text-orange-100 uppercase tracking-widest mt-2 opacity-80">Database Refactoring Protocol</p>
                    </div>
                    <div className="p-8">
                        <p className="text-sm text-gray-500 font-bold mb-4 leading-relaxed">
                            This utility will re-map all items with random IDs to the sequential <span className="text-primary">ITEM-1001</span> format.
                        </p>
                        <ul className="text-[10px] text-orange-700 font-black uppercase space-y-1 mb-6">
                            <li>• Updates Products IDs</li>
                            <li>• Re-links all Transaction history</li>
                            <li>• Re-links all Shipment manifests</li>
                        </ul>
                        
                        <div className="space-y-6">
                            <input 
                                type="password" 
                                value={pin}
                                onChange={e => setPin(e.target.value)}
                                placeholder="••••"
                                autoFocus
                                maxLength={4}
                                className="w-full text-center text-5xl font-black tracking-[0.5em] border-b-8 border-gray-100 bg-transparent py-4 focus:border-orange-500 outline-none transition-all"
                            />
                            
                            <div className="flex space-x-3">
                                <button 
                                    onClick={() => setShowStandardizeModal(false)}
                                    className="flex-1 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-gray-100 transition-all"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleStandardize}
                                    disabled={pin.length < 4 || isMigrating}
                                    className={`flex-1 py-4 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg transition-all ${pin.length < 4 || isMigrating ? 'bg-gray-300' : 'bg-orange-600 hover:bg-orange-700'}`}
                                >
                                    {isMigrating ? 'SYNCING...' : 'AUTHORIZE'}
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

export default ItemManagement;
