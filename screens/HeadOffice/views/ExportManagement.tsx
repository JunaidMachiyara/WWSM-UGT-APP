
import React, { useState } from 'react';
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

  const handleItemChange = (index: number, field: keyof ExportItemRow, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (field === 'productId') {
        item.productId = value as string;
    } else {
        item[field] = Number(value) < 0 ? 0 : Number(value);
    }
    setItems(newItems);
  };
  
  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, landedCost: 0 }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || items.some(item => !item.productId || item.quantity <= 0 || item.landedCost <= 0)) {
        alert('Please select a shop and fill all item details correctly (quantity and cost must be greater than zero).');
        return;
    }

    addExport({
        shopId,
        items,
        freightForwarder: { id: ffId, amount: ffAmount },
        clearingAgent: { id: caId, amount: caAmount },
        customExpense: { typeId: ceTypeId, amount: ceAmount },
        expectedDuty
    });
    
    setSuccessMessage('Export recorded successfully!');
    resetForm();
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const sortedShipments = [...shipments].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Record New Export</h2>
        {successMessage && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
            <p>{successMessage}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-8">
            {/* Form content remains the same */}
            <div>
            <label htmlFor="shop" className="block text-sm font-medium text-gray-700">Destination Shop</label>
            <select id="shop" value={shopId} onChange={e => setShopId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                <option value="">Select a shop</option>
                {shops.filter(s => s.isActive).map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
                ))}
            </select>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Items to Export</h3>
            
            <div className="hidden md:grid md:grid-cols-7 gap-4 items-center mb-2">
                <label className="font-medium text-sm text-gray-700 md:col-span-3">Product</label>
                <label className="font-medium text-sm text-gray-700 md:col-span-1">Quantity</label>
                <label className="font-medium text-sm text-gray-700 md:col-span-2">Landed Cost/Unit ($)</label>
            </div>

            <div className="space-y-4">
                {items.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-7 gap-4 items-end border-t border-gray-200 pt-4 md:border-none md:pt-0">
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
                    <label className="block text-sm font-medium text-gray-700 md:hidden">Landed Cost/Unit ($)</label>
                    <input type="number" placeholder="Landed Cost" value={item.landedCost} onChange={e => handleItemChange(index, 'landedCost', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0.01" step="0.01" required />
                    </div>
                    <button type="button" onClick={() => removeItemRow(index)} className="md:col-span-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg disabled:opacity-50" disabled={items.length <= 1}>X</button>
                </div>
                ))}
            </div>
            <button type="button" onClick={addItemRow} className="mt-4 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">+ Add Item</button>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Shipping &amp; Customs Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <select value={ffId} onChange={e => setFfId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                <option value="">Select Freight Forwarder (Optional)</option>
                {freightForwarders.map(ff => <option key={ff.id} value={ff.id}>{ff.name}</option>)}
                </select>
                <input type="number" placeholder="Freight Amount ($)" value={ffAmount} onChange={e => setFfAmount(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />
                
                <select value={caId} onChange={e => setCaId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                <option value="">Select Clearing Agent (Optional)</option>
                {clearingAgents.map(ca => <option key={ca.id} value={ca.id}>{ca.name}</option>)}
                </select>
                <input type="number" placeholder="Clearing Amount ($)" value={caAmount} onChange={e => setCaAmount(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />

                <select value={ceTypeId} onChange={e => setCeTypeId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                <option value="">Select Custom Expense (Optional)</option>
                {customExpenseTypes.map(cet => <option key={cet.id} value={cet.id}>{cet.name}</option>)}
                </select>
                <input type="number" placeholder="Custom Expense Amount ($)" value={ceAmount} onChange={e => setCeAmount(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />

                <div className="md:col-span-2">
                    <label htmlFor="duty" className="block text-sm font-medium text-gray-700">Expected Duty ($)</label>
                    <input type="number" id="duty" value={expectedDuty} onChange={e => setExpectedDuty(Number(e.target.value))} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" />
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
                    <button onClick={() => setSelectedShipment(shipment)} className="text-primary hover:text-primary-dark font-medium">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
                    <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                        <div><span className="font-semibold text-gray-600">Date:</span> {new Date(selectedShipment.date).toLocaleString()}</div>
                        <div><span className="font-semibold text-gray-600">Status:</span> 
                            <span className={`ml-2 px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${selectedShipment.status === ShipmentStatus.RECEIVED ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {selectedShipment.status}
                            </span>
                        </div>
                        <div><span className="font-semibold text-gray-600">Freight Cost:</span> ${selectedShipment.freightCost.toFixed(2)}</div>
                        <div><span className="font-semibold text-gray-600">Clearing Cost:</span> ${selectedShipment.clearingCost.toFixed(2)}</div>
                        <div><span className="font-semibold text-gray-600">Customs Cost:</span> ${selectedShipment.customExpenseCost.toFixed(2)}</div>
                        <div><span className="font-semibold text-gray-600">Duty:</span> ${selectedShipment.expectedDuty.toFixed(2)}</div>
                    </div>
                    
                    <h4 className="text-md font-semibold text-gray-700 mb-2">Items</h4>
                    <div className="border rounded-lg overflow-hidden border-gray-200">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                                <tr>
                                    <th className="px-4 py-2 text-left">Product</th>
                                    <th className="px-4 py-2 text-center">Expected</th>
                                    <th className="px-4 py-2 text-center">Received</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-sm">
                                {selectedShipment.items.map(item => {
                                    const isReceived = selectedShipment.status === ShipmentStatus.RECEIVED;
                                    const hasDiscrepancy = isReceived && item.expectedQuantity !== item.receivedQuantity;
                                    return (
                                        <tr key={item.productId} className={hasDiscrepancy ? 'bg-red-50' : ''}>
                                            <td className="px-4 py-3 font-medium text-gray-800">{products.find(p => p.id === item.productId)?.name}</td>
                                            <td className="px-4 py-3 text-center">{item.expectedQuantity}</td>
                                            <td className="px-4 py-3 text-center font-semibold">
                                                {isReceived ? item.receivedQuantity : <span className="text-gray-400">N/A</span>}
                                            </td>
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