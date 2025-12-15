
import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Product } from '../../../types';

const ItemManagement: React.FC = () => {
  const { products, addProduct, bulkAddProducts } = useAppContext();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [hoCost, setHoCost] = useState(0);
  const [minSalePrice, setMinSalePrice] = useState(0);
  const [weight, setWeight] = useState(0);

  // CSV Import State
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreviewData, setCsvPreviewData] = useState<Omit<Product, 'id'>[]>([]);
  const [csvError, setCsvError] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState('');

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

  // CSV Helper: Download Template
  const downloadTemplate = () => {
      const headers = ['Name', 'Category', 'HO Cost', 'Min Sale Price', 'Weight (Kg)'];
      const rows = [
          ['Sample Product A', 'Electronics', '150.00', '200.00', '2.5'],
          ['Sample Product B', 'Furniture', '85.50', '120.00', '15.0']
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

  // CSV Helper: Parse and Preview
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

          // Simple CSV parse
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          
          // Validate Headers
          const required = ['name', 'category', 'ho cost', 'min sale price'];
          const missing = required.filter(req => !headers.includes(req));
          
          if (missing.length > 0) {
              setCsvError(`Missing required columns: ${missing.join(', ')}. Please use the template.`);
              return;
          }

          const nameIdx = headers.indexOf('name');
          const catIdx = headers.indexOf('category');
          const costIdx = headers.indexOf('ho cost');
          const priceIdx = headers.indexOf('min sale price');
          const weightIdx = headers.indexOf('weight (kg)');

          const parsedItems: Omit<Product, 'id'>[] = [];
          let errorLines = 0;

          for (let i = 1; i < lines.length; i++) {
              const line = lines[i].trim();
              if (!line) continue; // Skip empty lines

              const cols = line.split(',').map(c => c.trim());
              if (cols.length < required.length) {
                  errorLines++;
                  continue;
              }

              const name = cols[nameIdx];
              const category = cols[catIdx];
              const cost = parseFloat(cols[costIdx]);
              const price = parseFloat(cols[priceIdx]);
              const weight = weightIdx !== -1 ? parseFloat(cols[weightIdx]) : 0;

              if (name && category && !isNaN(cost) && !isNaN(price) && cost > 0 && price > 0) {
                  parsedItems.push({
                      name,
                      category,
                      hoCost: cost,
                      minSalePrice: price,
                      weight: isNaN(weight) ? 0 : weight
                  });
              } else {
                  errorLines++;
              }
          }

          if (parsedItems.length === 0) {
              setCsvError('No valid items found. Please check your data format.');
          } else {
              setCsvPreviewData(parsedItems);
              if (errorLines > 0) {
                  setCsvError(`${errorLines} rows were skipped due to invalid data.`);
              }
          }
      };
      reader.readAsText(file);
  };

  const handleBulkImport = async () => {
      if (csvPreviewData.length === 0) return;
      
      setIsImporting(true);
      try {
          await bulkAddProducts(csvPreviewData);
          setImportSuccess(`Successfully imported ${csvPreviewData.length} items!`);
          setCsvFile(null);
          setCsvPreviewData([]);
          // Clear file input
          const fileInput = document.getElementById('csvInput') as HTMLInputElement;
          if (fileInput) fileInput.value = '';
      } catch (e: any) {
          setCsvError(`Import failed: ${e.message}`);
      } finally {
          setIsImporting(false);
      }
  };

  return (
    <div className="space-y-8">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Manual Add Form */}
            <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg h-fit">
                <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Item</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label htmlFor="itemName" className="block text-sm font-medium text-gray-700">Item Name</label>
                    <input type="text" id="itemName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                </div>
                <div>
                    <label htmlFor="itemCategory" className="block text-sm font-medium text-gray-700">Category</label>
                    <input type="text" id="itemCategory" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="hoCost" className="block text-sm font-medium text-gray-700">HO Cost ($)</label>
                        <input type="number" id="hoCost" value={hoCost} onChange={e => setHoCost(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
                    </div>
                    <div>
                        <label htmlFor="minSalePrice" className="block text-sm font-medium text-gray-700">Min Sale Price ($)</label>
                        <input type="number" id="minSalePrice" value={minSalePrice} onChange={e => setMinSalePrice(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="0.01" step="0.01" />
                    </div>
                </div>
                <div>
                    <label htmlFor="itemWeight" className="block text-sm font-medium text-gray-700">Weight (Kg)</label>
                    <input type="number" id="itemWeight" value={weight} onChange={e => setWeight(Number(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" />
                </div>
                <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Item</button>
                </form>
            </div>

            {/* Bulk Import Section */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="text-xl font-semibold text-gray-800">Bulk Import Items</h3>
                        <p className="text-sm text-gray-500 mt-1">Upload a CSV file to add multiple products at once.</p>
                    </div>
                    <button 
                        onClick={downloadTemplate}
                        className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2 px-4 rounded border border-gray-300 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download Template
                    </button>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 mb-6">
                    <input 
                        type="file" 
                        id="csvInput"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <label htmlFor="csvInput" className="cursor-pointer flex flex-col items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-primary font-medium hover:underline">Click to upload CSV</span>
                        <span className="text-sm text-gray-500 mt-1">or drag and drop here</span>
                    </label>
                    {csvFile && <p className="mt-2 text-sm font-semibold text-gray-800">Selected: {csvFile.name}</p>}
                </div>

                {csvError && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm border border-red-200">
                        {csvError}
                    </div>
                )}

                {importSuccess && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded text-sm border border-green-200">
                        {importSuccess}
                    </div>
                )}

                {csvPreviewData.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h4 className="font-bold text-gray-700">Preview ({csvPreviewData.length} items found)</h4>
                            <button 
                                onClick={handleBulkImport} 
                                disabled={isImporting}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded-lg flex items-center disabled:opacity-50"
                            >
                                {isImporting ? (
                                    <svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                                {isImporting ? 'Importing...' : 'Confirm Import'}
                            </button>
                        </div>
                        <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Name</th>
                                        <th className="px-4 py-2 text-left font-medium text-gray-500">Category</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-500">HO Cost</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-500">Min Price</th>
                                        <th className="px-4 py-2 text-right font-medium text-gray-500">Weight</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {csvPreviewData.map((item, idx) => (
                                        <tr key={idx}>
                                            <td className="px-4 py-2 text-gray-900">{item.name}</td>
                                            <td className="px-4 py-2 text-gray-500">{item.category}</td>
                                            <td className="px-4 py-2 text-right text-gray-500">${item.hoCost.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right text-gray-500">${item.minSalePrice.toFixed(2)}</td>
                                            <td className="px-4 py-2 text-right text-gray-500">{item.weight || 0}</td>
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
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-xl font-semibold mb-4 text-gray-800">Existing Items</h3>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">HO Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Sale Price</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight (Kg)</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                {products.map(product => (
                    <tr key={product.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.hoCost.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${product.minSalePrice.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.weight || 0}</td>
                    </tr>
                ))}
                </tbody>
            </table>
            </div>
        </div>
    </div>
  );
};

export default ItemManagement;
