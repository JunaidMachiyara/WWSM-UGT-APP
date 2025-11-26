
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { OpeningStockPayload } from '../../../context/AppContext';

const OpeningStock: React.FC = () => {
    const { shopId, products, warehouses, shops, currentShopCurrency, addOpeningStock, bulkAddOpeningStock } = useAppContext();
    
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

    // Bulk Import Handlers
    const downloadTemplate = () => {
        const headers = ['Product ID', 'Product Name', 'Category', 'Quantity', 'Unit Cost', 'Notes'];
        const rows = products.map(p => [
            p.id,
            p.name.replace(/,/g, ''), // Simple escape for commas
            p.category,
            '', // Quantity blank for user to fill
            (p.hoCost * currentShopCurrency.rate).toFixed(2), // Suggested cost
            ''
        ]);
        
        const csvContent = "data:text/csv;charset=utf-8," 
            + headers.join(",") + "\n" 
            + rows.map(e => e.join(",")).join("\n");
            
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `stock_take_template_${new Date().toISOString().split('T')[0]}.csv`);
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
                setCsvError('File appears empty.');
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            // Expect: Product ID, Product Name, Category, Quantity, Unit Cost, Notes
            const pidIdx = headers.indexOf('product id');
            const qtyIdx = headers.indexOf('quantity');
            const costIdx = headers.indexOf('unit cost');
            const notesIdx = headers.indexOf('notes');

            if (pidIdx === -1 || qtyIdx === -1 || costIdx === -1) {
                setCsvError('Missing required columns: Product ID, Quantity, Unit Cost.');
                return;
            }

            const parsed: any[] = [];
            let errorLines = 0;

            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = line.split(',').map(c => c.trim());
                const productId = cols[pidIdx];
                const quantity = parseInt(cols[qtyIdx]);
                const cost = parseFloat(cols[costIdx]);
                const note = notesIdx !== -1 ? cols[notesIdx] : '';

                // Validation: Product must exist, Qty > 0, Cost >= 0
                const productExists = products.some(p => p.id === productId);

                if (productExists && !isNaN(quantity) && quantity > 0 && !isNaN(cost) && cost >= 0) {
                    parsed.push({
                        productId,
                        quantity,
                        unitCost: cost,
                        notes: note
                    });
                } else {
                    errorLines++;
                }
            }

            if (parsed.length === 0) {
                setCsvError('No valid entries found. Check your IDs and numbers.');
            } else {
                setCsvPreviewData(parsed);
                if (errorLines > 0) {
                    setCsvError(`${errorLines} rows skipped due to invalid data.`);
                }
            }
        };
        reader.readAsText(file);
    };

    const handleBulkImport = async () => {
        if (!bulkLocationId) {
            alert('Please select a location for the bulk import.');
            return;
        }
        if (!shopId) return;

        setIsImporting(true);
        try {
            const payload: OpeningStockPayload[] = csvPreviewData.map(item => ({
                shopId: shopId!,
                productId: item.productId,
                locationId: bulkLocationId,
                quantity: item.quantity,
                unitCost: item.unitCost,
                date: new Date(),
                notes: item.notes || 'Bulk Import'
            }));

            await bulkAddOpeningStock(payload);
            setImportSuccess(`Successfully imported ${payload.length} stock entries.`);
            setCsvFile(null);
            setCsvPreviewData([]);
            // Clear input
            const fileInput = document.getElementById('csvInput') as HTMLInputElement;
            if(fileInput) fileInput.value = '';

        } catch (e: any) {
            setCsvError(`Import failed: ${e.message}`);
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">Opening Stock / Adjustments</h2>
            
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
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-semibold text-gray-800">Bulk Import</h3>
                            <p className="text-sm text-gray-500 mt-1">Upload CSV to update stock levels.</p>
                        </div>
                        <button onClick={downloadTemplate} className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded border border-gray-300 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Template
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Target Location for Bulk Import</label>
                        <select 
                            value={bulkLocationId} 
                            onChange={e => setBulkLocationId(e.target.value)} 
                            className="w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                        >
                            <option value="">Select Location</option>
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 mb-6">
                        <input type="file" id="csvInput" accept=".csv" onChange={handleFileChange} className="hidden" />
                        <label htmlFor="csvInput" className="cursor-pointer flex flex-col items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span className="text-primary font-medium hover:underline">Upload Stock CSV</span>
                        </label>
                        {csvFile && <p className="mt-2 text-sm font-semibold text-gray-800">Selected: {csvFile.name}</p>}
                    </div>

                    {csvError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm border border-red-200">{csvError}</div>}
                    {importSuccess && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm border border-green-200">{importSuccess}</div>}

                    {csvPreviewData.length > 0 && (
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h4 className="font-bold text-gray-700">Preview ({csvPreviewData.length} items)</h4>
                                <button onClick={handleBulkImport} disabled={isImporting || !bulkLocationId} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center disabled:opacity-50">
                                    {isImporting ? 'Importing...' : 'Confirm Import'}
                                </button>
                            </div>
                            <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Product ID</th>
                                            <th className="px-4 py-2 text-right font-medium text-gray-500">Qty</th>
                                            <th className="px-4 py-2 text-right font-medium text-gray-500">Cost</th>
                                            <th className="px-4 py-2 text-left font-medium text-gray-500">Notes</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {csvPreviewData.map((item, idx) => (
                                            <tr key={idx}>
                                                <td className="px-4 py-2 text-gray-900">{item.productId}</td>
                                                <td className="px-4 py-2 text-right font-medium">{item.quantity}</td>
                                                <td className="px-4 py-2 text-right text-gray-500">{item.unitCost}</td>
                                                <td className="px-4 py-2 text-gray-500">{item.notes}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OpeningStock;
