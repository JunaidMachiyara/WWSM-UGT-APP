
import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shipment, ShipmentStatus } from '../../../types';

interface ExportItemRow {
  productId: string;
  quantity: number;
  landedCost: number;
}

const ExportManagement: React.FC = () => {
  const { 
    shops, 
    products, 
    freightForwarders, 
    clearingAgents, 
    customExpenseTypes,
    addExport,
    updateShipmentCosts,
    shipments
  } = useAppContext();

  const [shopId, setShopId] = useState('');
  const [items, setItems] = useState<ExportItemRow[]>([{ productId: '', quantity: 1, landedCost: 0 }]);
  const [ffId, setFfId] = useState('');
  const [ffAmount, setFfAmount] = useState(0);
  const [caId, setCaId] = useState('');
  const [caAmount, setCaAmount] = useState(0);
  const [ceTypeId, setCeTypeId] = useState('');
  const [ceAmount, setCeAmount] = useState(0);
  const [expectedDuty, setExpectedDuty] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [shipmentId, setShipmentId] = useState('');

  // Edit Costs State
  const [editCosts, setEditCosts] = useState({
      freight: 0,
      clearing: 0,
      custom: 0,
      duty: 0
  });
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal State
  const [showInvoice, setShowInvoice] = useState(false);
  const [printDisabled, setPrintDisabled] = useState(false);

  useEffect(() => {
    if (selectedShipment) {
        setEditCosts({
            freight: selectedShipment.freightCost,
            clearing: selectedShipment.clearingCost,
            custom: selectedShipment.customExpenseCost,
            duty: selectedShipment.expectedDuty
        });
    }
  }, [selectedShipment]);

  // Auto-generate Shipment ID
  useEffect(() => {
    if (!shopId) {
        setShipmentId('');
        return;
    }

    const generateShipmentId = () => {
        // Format: 5001 + "-" + MMDDYY + "-" + Shop Name
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        const dateSuffix = `${mm}${dd}${yy}`;

        // Find max sequence starting with 5001
        // Note: We scan ALL shipments to maintain a global sequence for Head Office Exports, 
        // or you could filter by shop if you want shop-specific sequences.
        // Typically HO Exports have a central sequence.
        let maxSeq = 5000;
        
        shipments.forEach(s => {
            // Regex to match pattern starting with digits
            const match = s.id.match(/^(\d+)-/);
            if (match && match[1]) {
                const seq = parseInt(match[1]);
                if (!isNaN(seq) && seq > maxSeq) {
                    maxSeq = seq;
                }
            }
        });

        const nextSeq = maxSeq + 1;
        const shopName = shops.find(s => s.id === shopId)?.name || 'SHOP';
        
        // Clean shop name for ID (remove spaces/special chars)
        const safeShopName = shopName.replace(/[^a-zA-Z0-9]/g, '');

        return `${nextSeq}-${dateSuffix}-${safeShopName}`;
    };

    setShipmentId(generateShipmentId());

  }, [shopId, shipments, shops]);

  const handleItemChange = (index: number, field: keyof ExportItemRow, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'productId') {
        const productId = value as string;
        item.productId = productId;
        
        // Populate Landed Cost with Head Office Cost (Invoice Price)
        const selectedProduct = products.find(p => p.id === productId);
        if (selectedProduct) {
            item.landedCost = selectedProduct.hoCost;
        }
    } else if (field === 'quantity') {
        item.quantity = Number(value) < 0 ? 0 : Number(value);
    } else if (field === 'landedCost') {
        item.landedCost = Number(value);
    } else {
        // @ts-ignore
        item[field] = value;
    }
    setItems(newItems);
  };
  
  const handleOverheadChange = (field: 'ff' | 'ca' | 'ce' | 'duty', value: number) => {
      const val = Number(value) < 0 ? 0 : Number(value);
      if (field === 'ff') setFfAmount(val);
      else if (field === 'ca') setCaAmount(val);
      else if (field === 'ce') setCeAmount(val);
      else if (field === 'duty') setExpectedDuty(val);
  };

  const addItemRow = () => {
    const newItem = { productId: '', quantity: 1, landedCost: 0 };
    setItems([...items, newItem]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      setItems(newItems);
    }
  };

  const resetForm = () => {
    setShopId('');
    setItems([{ productId: '', quantity: 1, landedCost: 0 }]);
    setFfId('');
    setFfAmount(0);
    setCaId('');
    setCaAmount(0);
    setCeTypeId('');
    setCeAmount(0);
    setExpectedDuty(0);
  };

  // Validates form and opens the Invoice Modal
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || items.some(item => !item.productId || item.quantity <= 0 || item.landedCost <= 0)) {
        alert('Please select a shop and fill all item details correctly (quantity and cost must be greater than zero).');
        return;
    }
    setShowInvoice(true);
    setPrintDisabled(false);
  };

  const handlePrint = () => {
      window.print();
      setPrintDisabled(true);
  };

  // Finalizes export after invoice review
  const handleFinalSubmit = () => {
    addExport({
        shipmentId,
        shopId,
        items,
        freightForwarder: { id: ffId, amount: ffAmount },
        clearingAgent: { id: caId, amount: caAmount },
        customExpense: { typeId: ceTypeId, amount: ceAmount },
        expectedDuty
    });
    
    setSuccessMessage(`Export recorded successfully! ID: ${shipmentId}`);
    resetForm();
    setShowInvoice(false);
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleUpdateCosts = async () => {
    if (!selectedShipment) return;
    setIsUpdating(true);
    try {
        await updateShipmentCosts({
            shipmentId: selectedShipment.id,
            freightCost: editCosts.freight,
            clearingCost: editCosts.clearing,
            customExpenseCost: editCosts.custom,
            expectedDuty: editCosts.duty
        });
        setIsUpdating(false);
        alert("Shipment costs updated successfully! Inventory valuation has been adjusted if goods were already received.");
        setSelectedShipment(null); // Close modal
    } catch (e) {
        console.error(e);
        setIsUpdating(false);
        alert("Failed to update costs.");
    }
  };

  const sortedShipments = [...shipments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Invoice Calculation
  const totalInvoiceValue = items.reduce((sum, item) => sum + (item.quantity * item.landedCost), 0);
  
  // Billable by HO: Goods + Freight
  const billableTotal = totalInvoiceValue + ffAmount;
  
  // Local Costs (Estimates) - Not on Invoice: Clearing + Custom + Duty
  const localTotal = caAmount + ceAmount + expectedDuty;

  return (
    <div className="space-y-8">
      <style>{`
        @media print {
          body { visibility: hidden; }
          #invoice-modal-container { visibility: visible; position: fixed; left: 0; top: 0; width: 100%; height: 100%; background: white; z-index: 9999; }
          #invoice-modal-container * { visibility: visible; }
          #invoice-modal-content { box-shadow: none !important; border: none !important; width: 100% !important; max-width: 100% !important; margin: 0 !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Record New Export</h2>
        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
            <p>{successMessage}</p>
          </div>
        )}
        <form onSubmit={handlePreSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label htmlFor="shop" className="block text-sm font-medium text-gray-700">Destination Shop</label>
                    <select id="shop" value={shopId} onChange={e => setShopId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                        <option value="">Select a shop</option>
                        {shops.filter(s => s.isActive).map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="shipmentId" className="block text-sm font-medium text-gray-700">Invoice / Shipment Number</label>
                     <input type="text" id="shipmentId" value={shipmentId} readOnly className="mt-1 block w-full border border-gray-200 bg-gray-100 rounded-md shadow-sm p-2 text-gray-600 cursor-not-allowed" placeholder="Auto-generated" />
                     <p className="text-xs text-gray-500 mt-1">Auto-generated: Seq - Date - Shop</p>
                </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Items to Export</h3>
            
            <div className="hidden md:grid md:grid-cols-9 gap-4 items-center mb-2">
                <label className="font-medium text-sm text-gray-700 md:col-span-3">Product</label>
                <label className="font-medium text-sm text-gray-700 md:col-span-1">Quantity</label>
                <label className="font-medium text-sm text-gray-700 md:col-span-2">Invoice Price/Unit ($)</label>
                <label className="font-medium text-sm text-gray-700 md:col-span-2">Total Worth ($)</label>
                <label className="font-medium text-sm text-gray-700 md:col-span-1 text-right">Action</label>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-9 gap-4 items-end border-t border-gray-200 pt-4 md:border-none md:pt-0">
                    <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 md:hidden">Product</label>
                    <select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                        <option value="">Select a product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    </div>
                    <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 md:hidden">Quantity</label>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="1" required />
                    </div>
                    <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 md:hidden">Invoice Price/Unit ($)</label>
                    <input type="number" placeholder="Invoice Price" value={item.landedCost} onChange={e => handleItemChange(index, 'landedCost', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0.01" step="0.01" required />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 md:hidden">Total Worth ($)</label>
                         <div className="mt-1 block w-full border border-gray-200 bg-gray-50 rounded-md shadow-sm p-2 text-gray-900 text-right font-semibold">
                             ${(item.quantity * item.landedCost).toFixed(2)}
                        </div>
                    </div>
                    <div className="md:col-span-1 flex justify-end">
                         <button type="button" onClick={() => removeItemRow(index)} className="w-full md:w-auto bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg disabled:opacity-50" disabled={items.length <= 1}>X</button>
                    </div>
                </div>
                ))}
            </div>
            <button type="button" onClick={addItemRow} className="mt-4 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">+ Add Item</button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Estimated Shipping &amp; Customs (Overheads)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <select value={ffId} onChange={e => setFfId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                <option value="">Select Freight Forwarder (Optional)</option>
                {freightForwarders.map(ff => <option key={ff.id} value={ff.id}>{ff.name}</option>)}
                </select>
                <input type="number" placeholder="Estimated Freight ($)" value={ffAmount} onChange={e => handleOverheadChange('ff', Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />
                
                <select value={caId} onChange={e => setCaId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                <option value="">Select Clearing Agent (Optional)</option>
                {clearingAgents.map(ca => <option key={ca.id} value={ca.id}>{ca.name}</option>)}
                </select>
                <input type="number" placeholder="Estimated Clearing ($)" value={caAmount} onChange={e => handleOverheadChange('ca', Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />

                <select value={ceTypeId} onChange={e => setCeTypeId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                <option value="">Select Custom Expense (Optional)</option>
                {customExpenseTypes.map(cet => <option key={cet.id} value={cet.id}>{cet.name}</option>)}
                </select>
                <input type="number" placeholder="Estimated Custom Exp ($)" value={ceAmount} onChange={e => handleOverheadChange('ce', Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />

                <div className="md:col-span-2">
                    <label htmlFor="duty" className="block text-sm font-medium text-gray-700">Expected Duty ($)</label>
                    <input type="number" id="duty" value={expectedDuty} onChange={e => handleOverheadChange('duty', Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />
                </div>
            </div>
            </div>

            <div className="flex justify-end">
            <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                Record Export
            </button>
            </div>
        </form>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Shipment History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shipment ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination Shop</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedShipments.map(shipment => (
                <tr key={shipment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{shipment.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{shops.find(s => s.id === shipment.shopId)?.name || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(shipment.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${shipment.status === ShipmentStatus.RECEIVED ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <button onClick={() => setSelectedShipment(shipment)} className="text-primary hover:text-primary-dark font-medium">View/Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Modal */}
      {showInvoice && (
        <div id="invoice-modal-container" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div id="invoice-modal-content" className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto flex flex-col">
                <div className="p-8">
                    <div className="flex justify-between items-start border-b border-gray-300 pb-6 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800 tracking-wide">COMMERCIAL INVOICE</h1>
                            <p className="text-xl text-gray-700 font-mono mt-1">#{shipmentId}</p>
                            <p className="text-sm text-gray-500 mt-1">Date: {new Date().toLocaleDateString()}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-lg font-bold text-gray-700 uppercase">Destination</h3>
                            <p className="text-xl text-gray-800 font-semibold">{shops.find(s => s.id === shopId)?.name}</p>
                            <p className="text-sm text-gray-600">{shops.find(s => s.id === shopId)?.address}</p>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <table className="min-w-full">
                            <thead>
                                <tr className="border-b-2 border-gray-800">
                                    <th className="text-left py-3 font-bold text-gray-700 uppercase text-sm">Product</th>
                                    <th className="text-center py-3 font-bold text-gray-700 uppercase text-sm">Quantity</th>
                                    <th className="text-right py-3 font-bold text-gray-700 uppercase text-sm">Unit Price ($)</th>
                                    <th className="text-right py-3 font-bold text-gray-700 uppercase text-sm">Total ($)</th>
                                </tr>
                            </thead>
                            <tbody className="text-gray-700">
                                {items.map((item, idx) => {
                                    const prodName = products.find(p => p.id === item.productId)?.name || 'Unknown';
                                    return (
                                        <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                                            <td className="py-3">{prodName}</td>
                                            <td className="text-center py-3">{item.quantity}</td>
                                            <td className="text-right py-3">{item.landedCost.toFixed(2)}</td>
                                            <td className="text-right py-3 font-medium">{(item.quantity * item.landedCost).toFixed(2)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t-2 border-gray-800">
                                <tr>
                                    <td colSpan={3} className="text-right font-semibold py-2 text-gray-700">Subtotal (Goods)</td>
                                    <td className="text-right font-semibold py-2 text-gray-800">${totalInvoiceValue.toFixed(2)}</td>
                                </tr>
                                {ffAmount > 0 && (
                                    <tr>
                                        <td colSpan={3} className="text-right py-1 text-sm text-gray-600">Freight ({freightForwarders.find(f => f.id === ffId)?.name || 'Freight'})</td>
                                        <td className="text-right py-1 text-sm text-gray-600">${ffAmount.toFixed(2)}</td>
                                    </tr>
                                )}
                                
                                <tr>
                                    <td colSpan={3} className="text-right font-bold py-4 text-lg border-t border-gray-300">Total Invoice Amount (Due to HO)</td>
                                    <td className="text-right font-bold py-4 text-lg text-primary border-t border-gray-300">${billableTotal.toFixed(2)}</td>
                                </tr>
                            </tfoot>
                        </table>

                        {/* Local Payables Section - Information Only */}
                        {(localTotal > 0) && (
                            <div className="mt-8 border-t-2 border-dashed border-gray-300 pt-4 bg-yellow-50 p-4 rounded">
                                <h4 className="text-sm font-bold text-gray-700 uppercase mb-2">Estimated Local Payables (Not included in Invoice)</h4>
                                <p className="text-xs text-gray-500 mb-2">These costs are estimated and will be paid directly by the shop to local agents/authorities.</p>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    {caAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span>Clearing ({clearingAgents.find(c => c.id === caId)?.name || 'Agent'}):</span>
                                            <span>${caAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {ceAmount > 0 && (
                                        <div className="flex justify-between">
                                            <span>Other Expenses ({customExpenseTypes.find(c => c.id === ceTypeId)?.name || 'Custom'}):</span>
                                            <span>${ceAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {expectedDuty > 0 && (
                                        <div className="flex justify-between">
                                            <span>Expected Duty:</span>
                                            <span>${expectedDuty.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold border-t border-gray-300 pt-1 mt-1">
                                        <span>Total Local Estimates:</span>
                                        <span>${localTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end space-x-4 no-print">
                    <button onClick={() => setShowInvoice(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 shadow-sm transition-colors">
                        Cancel Entry
                    </button>
                    <button 
                        onClick={handlePrint} 
                        disabled={printDisabled} 
                        className={`px-4 py-2 rounded-lg text-white font-bold shadow-sm transition-colors flex items-center ${printDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Invoice
                    </button>
                    <button 
                        onClick={handleFinalSubmit} 
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md transition-colors flex items-center"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Save & Continue
                    </button>
                </div>
            </div>
        </div>
      )}

      {selectedShipment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Shipment Details #{selectedShipment.id}</h3>
                        <button onClick={() => setSelectedShipment(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
                    </div>
                     <p className="text-sm text-gray-500">To: {shops.find(s => s.id === selectedShipment.shopId)?.name}</p>
                </div>
                <div className="p-6">
                    <div className="flex items-center mb-4">
                         <div className="text-sm mr-6"><span className="font-semibold text-gray-600">Date:</span> {new Date(selectedShipment.date).toLocaleString()}</div>
                         <div className="text-sm"><span className="font-semibold text-gray-600">Status:</span> 
                            <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedShipment.status === ShipmentStatus.RECEIVED ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {selectedShipment.status}
                            </span>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
                        <h4 className="text-sm font-bold text-gray-700 mb-3 uppercase border-b pb-2">Actual Cost Updates</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <label className="block text-xs text-gray-500">Freight Cost</label>
                                <input 
                                    type="number" 
                                    value={editCosts.freight} 
                                    onChange={e => setEditCosts({...editCosts, freight: Number(e.target.value)})}
                                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 bg-white text-black"
                                    style={{ backgroundColor: 'white', color: 'black' }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Clearing Cost</label>
                                <input 
                                    type="number" 
                                    value={editCosts.clearing} 
                                    onChange={e => setEditCosts({...editCosts, clearing: Number(e.target.value)})}
                                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 bg-white text-black"
                                    style={{ backgroundColor: 'white', color: 'black' }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Customs Cost</label>
                                <input 
                                    type="number" 
                                    value={editCosts.custom} 
                                    onChange={e => setEditCosts({...editCosts, custom: Number(e.target.value)})}
                                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 bg-white text-black"
                                    style={{ backgroundColor: 'white', color: 'black' }}
                                />
                            </div>
                            <div>
                                <label className="block text-xs text-gray-500">Duty</label>
                                <input 
                                    type="number" 
                                    value={editCosts.duty} 
                                    onChange={e => setEditCosts({...editCosts, duty: Number(e.target.value)})}
                                    className="mt-1 w-full border border-gray-300 rounded px-2 py-1 bg-white text-black"
                                    style={{ backgroundColor: 'white', color: 'black' }}
                                />
                            </div>
                        </div>
                        <div className="mt-4 text-right">
                            <button 
                                onClick={handleUpdateCosts} 
                                disabled={isUpdating}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded shadow-sm"
                            >
                                {isUpdating ? 'Updating...' : 'Update Actual Costs'}
                            </button>
                            <p className="text-xs text-gray-400 mt-1 italic">Updating here recalculates shop inventory values.</p>
                        </div>
                    </div>
                    
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Items</h4>
                    <div className="border rounded-lg overflow-hidden border-gray-200">
                        <table className="min-w-full bg-white text-black" style={{ backgroundColor: 'white', color: 'black' }}>
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 text-left">Product</th>
                                    <th className="px-4 py-2 text-center">Expected</th>
                                    <th className="px-4 py-2 text-center">Received</th>
                                    <th className="px-4 py-2 text-right">Invoice Price</th>
                                    <th className="px-4 py-2 text-right">Total Worth</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                                {selectedShipment.items.map(item => {
                                    const isReceived = selectedShipment.status === ShipmentStatus.RECEIVED;
                                    const hasDiscrepancy = isReceived && item.expectedQuantity !== item.receivedQuantity;
                                    return (
                                        <tr key={item.productId} className={hasDiscrepancy ? 'bg-red-50' : ''}>
                                            <td className="px-4 py-3 font-medium text-black" style={{ color: 'black' }}>{products.find(p => p.id === item.productId)?.name}</td>
                                            <td className="px-4 py-3 text-center text-black" style={{ color: 'black' }}>{item.expectedQuantity}</td>
                                            <td className="px-4 py-3 text-center font-semibold text-black" style={{ color: 'black' }}>
                                                {isReceived ? item.receivedQuantity : <span className="text-gray-400">N/A</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right text-black" style={{ color: 'black' }}>${item.landedCost.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-black" style={{ color: 'black' }}>${(item.landedCost * item.expectedQuantity).toFixed(2)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                 <div className="p-4 bg-gray-50 border-t border-gray-200">
                    <button onClick={() => setSelectedShipment(null)} className="w-full text-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg">Close</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ExportManagement;
