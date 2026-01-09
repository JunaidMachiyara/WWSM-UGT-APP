
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shipment, ShipmentStatus, AlertType, ReceivedExtraItem } from '../../../types';

interface ReceivedItem {
    productId: string;
    quantity: number;
}

const ReceiveStock: React.FC = () => {
    const { shopId, shipments, products, receiveShipment, warehouses, shops, logAlert, currentShopCurrency, formatCurrency } = useAppContext();
    const [pendingShipments, setPendingShipments] = useState<Shipment[]>([]);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
    const [locationId, setLocationId] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // State for adding extra items
    const [showAddExtraItemModal, setShowAddExtraItemModal] = useState(false);
    const [newExtraProductId, setNewExtraProductId] = useState('');
    const [newExtraQuantity, setNewExtraQuantity] = useState(1);
    const [newExtraUnitCostLocal, setNewExtraUnitCostLocal] = useState(0); // in local currency
    const [newExtraNotes, setNewExtraNotes] = useState('');
    const [extraReceivedItems, setExtraReceivedItems] = useState<ReceivedExtraItem[]>([]);

    const locations = useMemo(() => {
        const currentShop = shops.find(s => s.id === shopId);
        if (!currentShop) return [];
        const shopWarehouses = warehouses.filter(w => w.shopId === shopId);
        return [
            { id: currentShop.id, name: `${currentShop.name} (Shop)` },
            ...shopWarehouses.map(w => ({ id: w.id, name: w.name }))
        ];
    }, [shops, warehouses, shopId]);

    useEffect(() => {
        if (shopId) {
            setPendingShipments(shipments.filter(s => s.shopId === shopId && s.status === ShipmentStatus.PENDING));
            setLocationId(shopId); // Default to the shop
        }
    }, [shipments, shopId]);

    const handleSelectShipment = (shipment: Shipment) => {
        setSelectedShipment(shipment);
        setReceivedItems(shipment.items.map(item => ({
            productId: item.productId,
            quantity: item.expectedQuantity ?? (item as any).quantity ?? 0, // Fallback to 'quantity' if 'expectedQuantity' is missing
        })));
        setExtraReceivedItems([]); // Clear extra items when selecting a new shipment
        setSuccessMessage('');
        if (shopId) setLocationId(shopId); // Reset location to shop default
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
        setReceivedItems(prev => prev.map(item => 
            item.productId === productId ? { ...item, quantity: quantity < 0 ? 0 : quantity } : item
        ));
    };

    const getTotalLocalOverheads = (shipment: Shipment) => {
        return (Number(shipment.clearingCost) || 0) + (Number(shipment.customExpenseCost) || 0) + (Number(shipment.expectedDuty) || 0);
    }

    const handleSubmit = async () => {
        if (!selectedShipment || !locationId) {
             alert('Please select a location to receive the stock.');
            return;
        }
        
        if (receivedItems.some(item => item.quantity < 0)) {
            alert('Received quantity cannot be negative.');
            return;
        }
        if (extraReceivedItems.some(item => item.quantity <= 0 || item.unitCost < 0 || !item.productId)) {
             alert('All extra received items must have a valid product, positive quantity, and non-negative unit cost.');
             return;
        }

        setIsSaving(true);
        try {
            await receiveShipment({
                shipmentId: selectedShipment.id,
                receivedItems: receivedItems,
                locationId: locationId,
                extraItems: extraReceivedItems,
            });
            
            const shopName = shops.find(s => s.id === shopId)?.name || 'Shop';
            await logAlert({
                shopId: 'HO',
                type: AlertType.STOCK_DISCREPANCY,
                message: `Shop "${shopName}" has received Shipment #${selectedShipment.id}. Stock added to inventory.`,
                context: { shipmentId: selectedShipment.id, shopId: shopId }
            });

            setSuccessMessage(`Shipment #${selectedShipment.id} has been successfully received into inventory.`);
            setSelectedShipment(null);
            setReceivedItems([]);
            setExtraReceivedItems([]);
        } catch (error: any) {
            console.error("Database Write Error:", error);
            // More detailed error reporting for the user
            const errMsg = error.code === 'permission-denied' ? 'Access Denied: You do not have permission to write this data.' : error.message;
            alert(`Critical Error: Could not save to database. Details: ${errMsg}`);
        } finally {
            setIsSaving(false);
        }
    };

    const getTotalOverheads = (shipment: Shipment) => {
        return (Number(shipment.freightCost) || 0) + (Number(shipment.clearingCost) || 0) + (Number(shipment.customExpenseCost) || 0) + (Number(shipment.expectedDuty) || 0);
    }

    const handleNewExtraProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        setNewExtraProductId(pid);
        const product = products.find(p => p.id === pid);
        if (product) {
            setNewExtraUnitCostLocal(parseFloat((product.hoCost * currentShopCurrency.rate).toFixed(2)));
        } else {
            setNewExtraUnitCostLocal(0);
        }
    };

    const handleAddExtraItem = () => {
        if (!newExtraProductId || newExtraQuantity <= 0 || newExtraUnitCostLocal < 0) {
            alert('Please select a product, enter a positive quantity, and a non-negative unit cost.');
            return;
        }

        const product = products.find(p => p.id === newExtraProductId);
        if (!product) return;

        setExtraReceivedItems(prev => [...prev, {
            productId: newExtraProductId,
            quantity: newExtraQuantity,
            unitCost: newExtraUnitCostLocal,
            notes: newExtraNotes,
        }]);

        setNewExtraProductId('');
        setNewExtraQuantity(1);
        setNewExtraUnitCostLocal(0);
        setNewExtraNotes('');
        setShowAddExtraItemModal(false);
    };

    const removeExtraItem = (index: number) => {
        setExtraReceivedItems(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        if (showAddExtraItemModal && products.length > 0) {
            const firstProduct = products[0];
            setNewExtraProductId(firstProduct.id);
            setNewExtraUnitCostLocal(parseFloat((firstProduct.hoCost * currentShopCurrency.rate).toFixed(2)));
        }
    }, [showAddExtraItemModal, products, currentShopCurrency]);

    const isAddExtraItemButtonDisabled = !newExtraProductId || newExtraQuantity <= 0 || newExtraUnitCostLocal < 0;

    if (selectedShipment) {
        const localOverheads = getTotalLocalOverheads(selectedShipment);

        return (
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Receive Shipment #{selectedShipment.id}</h2>
                    <button onClick={() => setSelectedShipment(null)} disabled={isSaving} className="text-gray-500 hover:text-gray-700 font-bold">&larr; Back to List</button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="bg-blue-50 border border-blue-100 rounded p-2">
                        <p className="text-xs text-gray-500 uppercase">Freight Cost (HO)</p>
                        <p className="font-bold text-lg text-blue-700">${(Number(selectedShipment.freightCost) || 0).toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Clearing Cost</p>
                        <p className="font-bold text-lg">${(Number(selectedShipment.clearingCost) || 0).toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Customs Cost</p>
                        <p className="font-bold text-lg">${(Number(selectedShipment.customExpenseCost) || 0).toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Expected Duty</p>
                        <p className="font-bold text-lg">${(Number(selectedShipment.expectedDuty) || 0).toFixed(2)}</p>
                    </div>
                    <div className="col-span-full border-t border-gray-200 pt-2 mt-2 flex justify-between items-center px-4">
                         <div>
                            <p className="text-sm text-gray-500">Total Local Payable (Recorded as Liability)</p>
                            <p className="font-bold text-xl text-orange-600">${localOverheads.toFixed(2)}</p>
                        </div>
                         <div className="text-right">
                            <p className="text-sm text-gray-500">Total Landed Cost Addition</p>
                            <p className="font-bold text-xl text-green-600">${getTotalOverheads(selectedShipment).toFixed(2)}</p>
                        </div>
                    </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice for verification:</h3>
                <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-4 font-black text-[10px] text-gray-400 uppercase tracking-widest px-4">
                        <div className="col-span-3">Product</div>
                        <div className="text-center">Expected Qty</div>
                        <div className="col-span-2 text-center">Received Qty</div>
                    </div>
                    {selectedShipment.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
                        // Access both possible keys for expected qty
                        const expected = Number(item.expectedQuantity) || Number((item as any).quantity) || 0;
                        const isDiscrepancy = receivedItem && receivedItem.quantity !== expected;
                        
                        return (
                            <div key={item.productId} className={`grid grid-cols-6 gap-4 items-center p-4 rounded-lg border ${
                                isDiscrepancy ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
                            }`}>
                                <div className="col-span-3 font-bold text-gray-800">{product?.name || 'Unknown Product'}</div>
                                <div className="text-center font-black text-gray-900 text-lg">{expected}</div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        disabled={isSaving}
                                        value={receivedItem?.quantity || 0}
                                        onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value) || 0)}
                                        className="w-full text-center border border-gray-300 rounded-md shadow-sm p-3 bg-white text-gray-900 font-bold text-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-semibold text-gray-800">Extra Items Received</h3>
                        <button onClick={() => setShowAddExtraItemModal(true)} disabled={isSaving} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors">
                            + Add Extra Item
                        </button>
                    </div>
                    {extraReceivedItems.length > 0 && (
                        <div className="space-y-2">
                            <div className="grid grid-cols-12 gap-4 font-semibold text-gray-600 px-4">
                                <div className="col-span-4">Product</div>
                                <div className="col-span-2 text-center">Qty</div>
                                <div className="col-span-3 text-right">Unit Cost ({currentShopCurrency.symbol})</div>
                                <div className="col-span-2">Notes</div>
                                <div className="col-span-1"></div>
                            </div>
                            {extraReceivedItems.map((item, index) => {
                                const product = products.find(p => p.id === item.productId);
                                return (
                                    <div key={index} className="grid grid-cols-12 gap-4 items-center p-2 rounded-lg border border-green-200 bg-green-50">
                                        <div className="col-span-4 font-medium text-gray-800">{product?.name || 'Unknown Product'}</div>
                                        <div className="col-span-2 text-center text-gray-700">{item.quantity}</div>
                                        <div className="col-span-3 text-right text-gray-700">{formatCurrency(item.unitCost / currentShopCurrency.rate)}</div>
                                        <div className="col-span-2 text-sm text-gray-600">{item.notes || '-'}</div>
                                        <div className="col-span-1 flex justify-end">
                                            <button onClick={() => removeExtraItem(index)} disabled={isSaving} className="text-red-500 hover:text-red-700 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                     {extraReceivedItems.length === 0 && (
                        <p className="text-sm text-gray-500 italic text-center py-4">No extra items added.</p>
                     )}
                </div>

                <div className="mt-8 border-t pt-6 grid grid-cols-1 gap-6">
                    <div>
                        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">Receive Stock To:</label>
                        <select 
                            id="location" 
                            disabled={isSaving}
                            value={locationId} 
                            onChange={e => setLocationId(e.target.value)}
                            className="w-full border border-gray-300 rounded-md shadow-sm p-3 bg-white text-gray-900 font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                            {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                        </select>
                    </div>
                </div>

                <div className="flex justify-end mt-8">
                    <button 
                        onClick={handleSubmit} 
                        disabled={isSaving}
                        className={`text-white font-black py-4 px-10 rounded-xl transition duration-300 shadow-xl active:scale-95 flex items-center ${isSaving ? 'bg-gray-400 cursor-wait' : 'bg-primary hover:bg-primary-dark'}`}
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                SECURELY SAVING TO DATABASE...
                            </>
                        ) : 'Confirm Receipt & Update Inventory'}
                    </button>
                </div>

                {showAddExtraItemModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
                        <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all animate-scale-up">
                            <div className="flex justify-between items-center mb-4 border-b pb-2">
                                <h3 className="text-lg font-bold text-gray-800">Add Extra Item Manually</h3>
                                <button onClick={() => setShowAddExtraItemModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Product</label>
                                    <select 
                                        value={newExtraProductId} 
                                        onChange={handleNewExtraProductChange} 
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                                        required
                                    >
                                        <option value="">Select a product</option>
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                                        <input 
                                            type="number" 
                                            value={newExtraQuantity} 
                                            onChange={e => setNewExtraQuantity(parseInt(e.target.value) || 0)} 
                                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                                            min="1" 
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Unit Cost ({currentShopCurrency.symbol})</label>
                                        <input 
                                            type="number" 
                                            value={newExtraUnitCostLocal} 
                                            onChange={e => setNewExtraUnitCostLocal(parseFloat(e.target.value) || 0)} 
                                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                                            min="0" 
                                            step="0.01" 
                                            required
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={newExtraNotes} 
                                        onChange={e => setNewExtraNotes(e.target.value)} 
                                        className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                                        placeholder="e.g., Damaged on arrival"
                                    />
                                </div>
                                <div className="flex justify-end space-x-3 mt-6">
                                    <button 
                                        onClick={() => setShowAddExtraItemModal(false)} 
                                        className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleAddExtraItem} 
                                        disabled={isAddExtraItemButtonDisabled}
                                        className={`px-4 py-2 text-white bg-primary rounded-lg font-bold shadow-md ${isAddExtraItemButtonDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                                    >
                                        Add Item
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )
    }

    return (
        <div className="space-y-6">
             <h2 className="text-2xl font-bold text-gray-800">Pending Shipments from Head Office</h2>
             {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}
            {pendingShipments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pendingShipments.map(shipment => (
                    <div key={shipment.id} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 hover:border-primary transition-all group">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-lg font-black text-primary group-hover:scale-110 transition-transform origin-left">#{shipment.id.split('-')[0]}</h3>
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                    Sent: {new Date(shipment.date).toLocaleDateString()}
                                </p>
                            </div>
                            <span className="bg-blue-100 text-blue-800 text-[10px] font-black px-2 py-1 rounded-full uppercase">IN TRANSIT</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-6 font-medium">
                            Contains <span className="font-bold text-gray-900">{shipment.items.length}</span> product types.
                        </p>
                        <button onClick={() => handleSelectShipment(shipment)} className="w-full bg-green-500 hover:bg-green-600 text-white font-black py-3 px-4 rounded-lg transition-all shadow-md active:scale-95">
                            START VERIFICATION
                        </button>
                    </div>
                ))}
                </div>
            ) : (
                <div className="bg-white p-20 rounded-xl shadow-lg text-center border-2 border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                    </div>
                    <p className="text-gray-500 font-bold text-xl uppercase tracking-tighter">Everything has been cleared.</p>
                    <p className="text-gray-400 text-sm mt-2 font-medium italic">There are no pending shipments from Head Office.</p>
                </div>
            )}
        </div>
    )
}

export default ReceiveStock;
