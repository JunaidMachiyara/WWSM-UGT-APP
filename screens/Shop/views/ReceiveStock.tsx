
import React, { useState, useEffect, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { Shipment, ShipmentStatus, AlertType } from '../../../types';

interface ReceivedItem {
    productId: string;
    quantity: number;
}

const ReceiveStock: React.FC = () => {
    const { shopId, shipments, products, receiveShipment, warehouses, shops, logAlert } = useAppContext();
    const [pendingShipments, setPendingShipments] = useState<Shipment[]>([]);
    const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
    const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
    const [locationId, setLocationId] = useState<string>('');
    const [successMessage, setSuccessMessage] = useState('');

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
            quantity: item.expectedQuantity, // Pre-fill with expected quantity
        })));
        setSuccessMessage('');
        if (shopId) setLocationId(shopId); // Reset location to shop default
    };

    const handleQuantityChange = (productId: string, quantity: number) => {
        setReceivedItems(prev => prev.map(item => 
            item.productId === productId ? { ...item, quantity: quantity < 0 ? 0 : quantity } : item
        ));
    };

    const handleSubmit = () => {
        if (!selectedShipment || !locationId) {
             alert('Please select a location to receive the stock.');
            return;
        }

        receiveShipment({
            shipmentId: selectedShipment.id,
            receivedItems: receivedItems,
            locationId: locationId,
        });
        
        // Trigger alert for Head Office
        const shopName = shops.find(s => s.id === shopId)?.name || 'Shop';
        logAlert({
            shopId: 'HO', // Target the alert to Head Office (or filter by it later)
            type: AlertType.STOCK_DISCREPANCY, // Reusing existing type or could use a generic 'NOTIFICATION' type
            message: `Shop "${shopName}" has received Shipment #${selectedShipment.id}. Please review and update actual clearing/customs costs for accurate inventory valuation.`,
            context: { shipmentId: selectedShipment.id, shopId: shopId }
        });

        setSuccessMessage(`Shipment #${selectedShipment.id} has been successfully received into inventory.`);
        setSelectedShipment(null);
        setReceivedItems([]);
    };

    const getTotalOverheads = (shipment: Shipment) => {
        return shipment.freightCost + shipment.clearingCost + shipment.customExpenseCost + shipment.expectedDuty;
    }

    if (selectedShipment) {
        return (
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">Receive Shipment #{selectedShipment.id}</h2>
                    <button onClick={() => setSelectedShipment(null)} className="text-gray-500 hover:text-gray-700">&larr; Back to List</button>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-6 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-gray-500">Freight Cost</p>
                        <p className="font-bold text-lg">${selectedShipment.freightCost.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Clearing Cost</p>
                        <p className="font-bold text-lg">${selectedShipment.clearingCost.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Customs Cost</p>
                        <p className="font-bold text-lg">${selectedShipment.customExpenseCost.toFixed(2)}</p>
                    </div>
                     <div>
                        <p className="text-sm text-gray-500">Expected Duty</p>
                        <p className="font-bold text-lg">${selectedShipment.expectedDuty.toFixed(2)}</p>
                    </div>
                    <div className="col-span-full border-t border-gray-200 pt-2 mt-2">
                        <p className="text-sm text-gray-500">Total Overhead Costs</p>
                        <p className="font-bold text-xl text-primary">${getTotalOverheads(selectedShipment).toFixed(2)}</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="grid grid-cols-6 gap-4 font-semibold text-gray-600 px-4">
                        <div className="col-span-3">Product</div>
                        <div className="text-center">Expected Qty</div>
                        <div className="col-span-2 text-center">Received Qty</div>
                    </div>
                    {selectedShipment.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        const receivedItem = receivedItems.find(ri => ri.productId === item.productId);
                        const isDiscrepancy = receivedItem && receivedItem.quantity !== item.expectedQuantity;
                        return (
                            <div key={item.productId} className={`grid grid-cols-6 gap-4 items-center p-4 rounded-lg border ${
                                isDiscrepancy ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200'
                            }`}>
                                <div className="col-span-3 font-medium text-gray-800">{product?.name || 'Unknown Product'}</div>
                                <div className="text-center text-gray-700">{item.expectedQuantity}</div>
                                <div className="col-span-2">
                                    <input 
                                        type="number" 
                                        value={receivedItem?.quantity || 0}
                                        onChange={e => handleQuantityChange(item.productId, parseInt(e.target.value))}
                                        className="w-full text-center border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
                 <div className="mt-8 border-t pt-6">
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">Receive Stock To:</label>
                    <select 
                        id="location" 
                        value={locationId} 
                        onChange={e => setLocationId(e.target.value)}
                        className="w-full md:w-1/2 border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary"
                    >
                        {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select>
                </div>
                <div className="flex justify-end mt-8">
                    <button onClick={handleSubmit} className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition duration-300">
                        Confirm Receipt & Add to Inventory
                    </button>
                </div>
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
                pendingShipments.map(shipment => (
                    <div key={shipment.id} className="bg-white p-6 rounded-lg shadow-lg flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-primary">Shipment #{shipment.id}</h3>
                            <p className="text-sm text-gray-500">
                                Sent on: {new Date(shipment.date).toLocaleDateString()}
                            </p>
                            <p className="text-sm text-gray-600 mt-1">
                                Contains {shipment.items.length} item types.
                            </p>
                        </div>
                        <button onClick={() => handleSelectShipment(shipment)} className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg">
                            Receive
                        </button>
                    </div>
                ))
            ) : (
                <div className="bg-white p-10 rounded-lg shadow-lg text-center">
                    <p className="text-gray-500">There are no pending shipments from the Head Office.</p>
                </div>
            )}
        </div>
    )
}

export default ReceiveStock;
