import React, { useState, useMemo } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { AdvanceItem, ShipmentStatus, TransactionType } from '../../../types';

const CustomerAdvances: React.FC = () => {
    const { shopId, customers, products, recordAdvance, shopAccounts, getAdvanceBalance, formatCurrency, currentShopCurrency, shipments, transactions } = useAppContext();
    const [customerId, setCustomerId] = useState('');
    const [amount, setAmount] = useState(0);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentAccountId, setPaymentAccountId] = useState('');
    const [items, setItems] = useState<AdvanceItem[]>([{ productId: '', quantity: 1 }]);
    const [successMessage, setSuccessMessage] = useState('');
    
    const shopCustomers = useMemo(() => customers.filter(c => c.shopId === shopId), [customers, shopId]);
    const currentShopAccounts = useMemo(() => shopAccounts.filter(acc => acc.shopId === shopId), [shopAccounts, shopId]);

    const inTransitProducts = useMemo(() => {
        const pendingShipmentItems = shipments
            .filter(s => s.shopId === shopId && s.status === ShipmentStatus.PENDING)
            .flatMap(s => s.items);

        const uniqueProductIds = [...new Set(pendingShipmentItems.map(item => item.productId))];

        return products.filter(p => uniqueProductIds.includes(p.id));
    }, [shipments, products, shopId]);

    const customersWithAdvance = useMemo(() => {
        return shopCustomers.map(customer => {
            const advanceBalance = getAdvanceBalance(customer.id);
            const advanceTransactions = transactions.filter(t => 
                t.customerId === customer.id && 
                t.shopId === shopId &&
                t.type === TransactionType.CUSTOMER_ADVANCE &&
                t.advanceForItems && t.advanceForItems.length > 0
            );

            const preOrderedItems = advanceTransactions.flatMap(t => t.advanceForItems!);
            
            const itemSummary = preOrderedItems.reduce((acc, item) => {
                acc[item.productId] = (acc[item.productId] || 0) + item.quantity;
                return acc;
            }, {} as Record<string, number>);

            const summaryString = Object.entries(itemSummary).map(([productId, quantity]) => {
                const productName = products.find(p => p.id === productId)?.name || 'Unknown';
                return `${quantity}x ${productName}`;
            }).join(', ');

            return {
                ...customer,
                advanceBalance,
                preOrderSummary: summaryString,
            };
        }).filter(c => c.advanceBalance > 0)
         .sort((a,b) => b.advanceBalance - a.advanceBalance);

    }, [shopCustomers, getAdvanceBalance, transactions, products, shopId]);


    const handleItemChange = (index: number, field: keyof AdvanceItem, value: string | number) => {
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
        setItems([...items, { productId: '', quantity: 1 }]);
    };

    const removeItemRow = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const resetForm = () => {
        setCustomerId('');
        setAmount(0);
        setPaymentAccountId('');
        setPaymentDate(new Date().toISOString().split('T')[0]);
        setItems([{ productId: '', quantity: 1 }]);
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!shopId || !customerId || amount <= 0 || !paymentDate || !paymentAccountId) {
            alert('Please select a customer, payment account, date, and enter an amount greater than zero.');
            return;
        }

        const dateForTransaction = new Date(paymentDate + 'T00:00:00');
        const validItems = items.filter(i => i.productId && i.quantity > 0);
        
        recordAdvance({
            shopId,
            customerId,
            amount,
            date: dateForTransaction,
            paymentAccountId,
            advanceForItems: validItems,
        });

        const customerName = customers.find(c => c.id === customerId)?.name || '';
        setSuccessMessage(`Advance of ${currentShopCurrency.symbol}${amount} from "${customerName}" recorded successfully.`);
        resetForm();
        setTimeout(() => setSuccessMessage(''), 5000);
    };

    return (
        <div className="space-y-8">
             {successMessage && (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
                    <p>{successMessage}</p>
                </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Record Customer Advance</h3>
                     <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Customer</label>
                            <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                <option value="">Select customer</option>
                                {shopCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label htmlFor="paymentDate" className="block text-sm font-medium text-gray-700">Payment Date</label>
                            <input type="date" id="paymentDate" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
                        </div>
                        <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">Advance Amount ({currentShopCurrency.symbol})</label>
                            <input type="number" id="amount" value={amount} onChange={e => setAmount(parseFloat(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0.01" step="0.01" required />
                        </div>
                        <div>
                            <label htmlFor="paymentAccount" className="block text-sm font-medium text-gray-700">Deposit To</label>
                            <select id="paymentAccount" value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                                <option value="">Select account</option>
                                {currentShopAccounts.map(acc => <option key={acc.id} value={acc.id}>{acc.accountName}</option>)}
                            </select>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-gray-800 mb-2">Advance Against Items (Optional)</h4>
                            <p className="text-xs text-gray-500 mb-4">Link this advance to specific items from upcoming shipments.</p>
                            
                            {inTransitProducts.length > 0 ? (
                                <div className="space-y-4">
                                    {items.map((item, index) => (
                                        <div key={index} className="grid grid-cols-6 gap-2 items-end border-t pt-2 first:border-none first:pt-0">
                                            <div className="col-span-3">
                                                <label className="block text-xs font-medium text-gray-700">Product</label>
                                                <select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-primary">
                                                    <option value="">Select product</option>
                                                    {inTransitProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-xs font-medium text-gray-700">Quantity</label>
                                                <input type="number" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-primary" min="1"/>
                                            </div>
                                            <button type="button" onClick={() => removeItemRow(index)} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-2 rounded-lg text-xs disabled:opacity-50" disabled={items.length <= 1}>X</button>
                                        </div>
                                    ))}
                                     <button type="button" onClick={addItemRow} className="mt-2 text-xs bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded-lg">+ Add Item</button>
                                </div>
                            ) : (
                                 <p className="text-sm text-center text-gray-500 bg-gray-50 p-4 rounded-md">No items currently in transit for this shop.</p>
                            )}
                        </div>

                        <button type="submit" className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">Record Advance</button>
                    </form>
                </div>
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-lg">
                    <h3 className="text-xl font-semibold mb-4 text-gray-800">Customers with Advance Balance</h3>
                     <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pre-ordered Items</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Available Advance</th>
                            </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {customersWithAdvance.length > 0 ? customersWithAdvance.map(customer => (
                                    <tr key={customer.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.preOrderSummary || 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">{formatCurrency(customer.advanceBalance)}</td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="text-center py-10 text-gray-500">
                                            No customers have an advance balance.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CustomerAdvances;