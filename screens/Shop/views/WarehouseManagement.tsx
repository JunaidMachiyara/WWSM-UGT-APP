import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';

const WarehouseManagement: React.FC = () => {
    const { shopId, warehouses, addWarehouse, products, getStockLevel, shops, transferStock } = useAppContext();
    
    // Form for adding a new warehouse
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');

    // Form for stock transfer
    const [transferProductId, setTransferProductId] = useState('');
    const [fromLocationId, setFromLocationId] = useState('');
    const [toLocationId, setToLocationId] = useState('');
    const [transferQty, setTransferQty] = useState(1);
    const [maxTransferQty, setMaxTransferQty] = useState(0);

    const [successMessage, setSuccessMessage] = useState('');

    const currentShop = shops.find(s => s.id === shopId);
    const shopWarehouses = warehouses.filter(w => w.shopId === shopId);
    
    const locations = useMemo(() => {
        if (!currentShop) return [];
        return [
          { id: currentShop.id, name: `${currentShop.name} (Shop)` },
          ...shopWarehouses.map(w => ({ id: w.id, name: w.name }))
        ];
    }, [currentShop, shopWarehouses]);

    const handleAddWarehouse = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !address || !shopId) return;
        addWarehouse({ name, address, shopId });
        setSuccessMessage(`Warehouse "${name}" created successfully!`);
        setName('');
        setAddress('');
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    const handleFromLocationChange = (locationId: string) => {
        setFromLocationId(locationId);
        if (transferProductId) {
            setMaxTransferQty(getStockLevel(transferProductId, locationId));
        }
    };
    
    const handleProductChange = (productId: string) => {
        setTransferProductId(productId);
        if (fromLocationId) {
            setMaxTransferQty(getStockLevel(productId, fromLocationId));
        }
    };

    const handleTransferStock = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transferProductId || !fromLocationId || !toLocationId || transferQty <= 0) {
            alert('Please fill all fields for the transfer.');
            return;
        }
        if (fromLocationId === toLocationId) {
            alert('Source and destination locations cannot be the same.');
            return;
        }
        if (transferQty > maxTransferQty) {
            alert(`Transfer quantity cannot exceed the available stock of ${maxTransferQty}.`);
            return;
        }
        if (!shopId) return;

        transferStock({
            shopId,
            productId: transferProductId,
            quantity: transferQty,
            fromLocationId,
            toLocationId,
            date: new Date()
        });

        setSuccessMessage('Stock transferred successfully!');
        setTransferProductId('');
        setFromLocationId('');
        setToLocationId('');
        setTransferQty(1);
        setMaxTransferQty(0);
        setTimeout(() => setSuccessMessage(''), 4000);
    };

    return (
        <div className="space-y-8">
            {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Add Warehouse & Transfer */}
                <div className="lg:col-span-1 space-y-8">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Create New Warehouse</h3>
                        <form onSubmit={handleAddWarehouse} className="space-y-4">
                            <div>
                                <label htmlFor="warehouseName" className="block text-sm font-medium text-gray-700">Warehouse Name</label>
                                <input type="text" id="warehouseName" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                            </div>
                            <div>
                                <label htmlFor="warehouseAddress" className="block text-sm font-medium text-gray-700">Address</label>
                                <input type="text" id="warehouseAddress" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                            </div>
                            <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Add Warehouse</button>
                        </form>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h3 className="text-xl font-semibold mb-4 text-gray-800">Transfer Stock</h3>
                        <form onSubmit={handleTransferStock} className="space-y-4">
                            <div>
                                <label htmlFor="transferProduct" className="block text-sm font-medium text-gray-700">Product</label>
                                <select id="transferProduct" value={transferProductId} onChange={e => handleProductChange(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                    <option value="">Select product</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label htmlFor="fromLocation" className="block text-sm font-medium text-gray-700">From</label>
                                <select id="fromLocation" value={fromLocationId} onChange={e => handleFromLocationChange(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required disabled={!transferProductId}>
                                    <option value="">Select source</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="toLocation" className="block text-sm font-medium text-gray-700">To</label>
                                <select id="toLocation" value={toLocationId} onChange={e => setToLocationId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required disabled={!transferProductId}>
                                    <option value="">Select destination</option>
                                    {locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="transferQty" className="block text-sm font-medium text-gray-700">Quantity</label>
                                <input type="number" id="transferQty" value={transferQty} onChange={e => setTransferQty(parseInt(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required min="1" max={maxTransferQty} />
                                {fromLocationId && <p className="text-xs text-gray-500 mt-1">Available: {maxTransferQty}</p>}
                            </div>
                             <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50" disabled={!fromLocationId || !toLocationId || transferQty <=0}>Transfer</button>
                        </form>
                    </div>
                </div>

                {/* List Warehouses and Stock */}
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Locations & Stock</h3>
                    <div className="space-y-6">
                        {locations.map(location => (
                            <div key={location.id} className="border border-gray-200 rounded-lg p-4">
                                <h4 className="text-lg font-bold text-primary">{location.name}</h4>
                                <table className="min-w-full divide-y divide-gray-200 mt-2">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {products.map(product => {
                                            const stock = getStockLevel(product.id, location.id);
                                            if (stock === 0) return null; // Don't show zero stock items
                                            return (
                                                <tr key={product.id}>
                                                    <td className="px-4 py-2 text-sm text-gray-800">{product.name}</td>
                                                    <td className="px-4 py-2 text-sm text-right font-semibold">{stock}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WarehouseManagement;
