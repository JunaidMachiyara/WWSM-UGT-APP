
import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { SaleItem } from '../../../context/AppContext';
import { TransactionType } from '../../../types';

interface InvoiceItem extends SaleItem {
  stock: number;
  minSalePrice?: number;
  locationId: string;
}

interface TooltipProps {
  children: React.ReactNode;
  text: string;
}

const Tooltip: React.FC<TooltipProps> = ({ children, text }) => {
    const [visible, setVisible] = useState(false);
    return (
        <div 
            className="relative flex items-center"
            onMouseEnter={() => setVisible(true)}
            onMouseLeave={() => setVisible(false)}
        >
            {children}
            {visible && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-gray-800 text-white text-xs rounded py-1 px-2 z-10 shadow-lg" role="tooltip">
                    {text}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-800"></div>
                </div>
            )}
        </div>
    );
};

interface ExclamationIconProps {
  colorClass?: string;
}

const ExclamationIcon: React.FC<ExclamationIconProps> = ({ colorClass = 'text-gray-400' }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${colorClass}`} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.008-1.742 3.008H4.42c-1.522 0-2.492-1.674-1.742-3.008l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);


const Sales: React.FC = () => {
  const { shopId, products, recordSale, customers, currentShopCurrency, shopAccounts, getStockLevel, warehouses, shops, getAdvanceBalance, formatCurrency, transactions } = useAppContext();
  
  const [items, setItems] = useState<InvoiceItem[]>([{ productId: '', quantity: 1, salePrice: 0, stock: 0, minSalePrice: 0, locationId: shopId! }]);
  const [customerId, setCustomerId] = useState('');
  const [cashPaid, setCashPaid] = useState(0);
  const [advanceApplied, setAdvanceApplied] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [manualRef, setManualRef] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const shopCustomers = customers.filter(c => c.shopId === shopId);
  const currentShopAccounts = shopAccounts.filter(acc => acc.shopId === shopId);

  const customerAdvanceBalance = useMemo(() => {
    if(!customerId) return 0;
    return getAdvanceBalance(customerId);
  }, [customerId, getAdvanceBalance]);
  
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
    // Reset advance applied if customer changes
    setAdvanceApplied(0);
  }, [customerId]);

  // Auto-Generate Invoice Number logic
  useEffect(() => {
    if (!shopId) return;

    const generateInvoiceNumber = () => {
        // Format: Sequence + "-" + MMDDYY
        // e.g., 1001-112025
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        const dateSuffix = `${mm}${dd}${yy}`; // MMDDYY

        const salesTransactions = transactions.filter(t => t.shopId === shopId && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE));

        let maxSeq = 1000;
        
        salesTransactions.forEach(t => {
            if (t.invoiceId) {
                // Regex to match pattern: (Digits)-(Any suffix)
                const match = t.invoiceId.match(/^(\d+)-/);
                if (match && match[1]) {
                    const seq = parseInt(match[1]);
                    if (!isNaN(seq) && seq > maxSeq) {
                        maxSeq = seq;
                    }
                }
            }
        });

        const nextSeq = maxSeq + 1;
        return `${nextSeq}-${dateSuffix}`;
    };

    setInvoiceNumber(generateInvoiceNumber());
  }, [shopId, transactions, saleDate]); // Recalculate if transactions change (though slight overkill, ensures uniqueness if multi-tab)


  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'productId') {
        const newProductId = value as string;
        item.productId = newProductId;
        item.stock = getStockLevel(newProductId, item.locationId);
        const product = products.find(p => p.id === newProductId);
        // minSalePrice is in USD, convert it for display check
        if(product) {
            item.minSalePrice = product.minSalePrice * (currentShopCurrency.rate || 1);
        }
    } else if (field === 'locationId') {
        item.locationId = value as string;
        item.stock = getStockLevel(item.productId, item.locationId);
    } else if (field === 'quantity' || field === 'salePrice') {
        (item as any)[field] = Number(value) < 0 ? 0 : Number(value);
    }
    setItems(newItems);
  };

  const addItemRow = () => {
    setItems([...items, { productId: '', quantity: 1, salePrice: 0, stock: 0, minSalePrice: 0, locationId: shopId! }]);
  };

  const removeItemRow = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const resetForm = () => {
    setItems([{ productId: '', quantity: 1, salePrice: 0, stock: 0, minSalePrice: 0, locationId: shopId! }]);
    setCustomerId('');
    setCashPaid(0);
    setAdvanceApplied(0);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setPaymentAccountId('');
    setManualRef('');
  };

  const totalAmount = items.reduce((sum, item) => {
    if (item.productId && item.quantity > 0 && item.salePrice > 0) {
        return sum + ((item.salePrice || 0) * (item.quantity || 1));
    }
    return sum;
  }, 0);

  const creditAmount = totalAmount - (cashPaid || 0) - (advanceApplied || 0);

  const handleAdvanceChange = (value: number) => {
    const localAdvanceBalance = customerAdvanceBalance * currentShopCurrency.rate;
    const validValue = Math.max(0, Math.min(value, localAdvanceBalance, totalAmount));
    setAdvanceApplied(validValue);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsWithProduct = items.filter(i => i.productId);

    if (itemsWithProduct.length === 0) {
        alert('Please add at least one item to the invoice by selecting a product.');
        return;
    }

    const invalidItems = itemsWithProduct.filter(i => i.quantity <= 0 || i.salePrice <= 0 || !i.locationId);
    if (invalidItems.length > 0) {
        alert('Please ensure all added items have a dispatch location, a quantity and sale price greater than zero.');
        return;
    }

    const validItems = itemsWithProduct;

    if (!shopId || !customerId || !saleDate) {
      alert('Please select a customer and a date for the invoice.');
      return;
    }
    if (cashPaid < 0) {
      alert('Cash paid amount cannot be negative.');
      return;
    }
    // Removed validation preventing overpayment as per user request
    
    if (cashPaid > 0 && !paymentAccountId) {
        alert('Please select an account to deposit the cash payment into.');
        return;
    }

    const dateForTransaction = new Date(saleDate + 'T00:00:00');

    recordSale({
      shopId,
      customerId,
      invoiceNumber,
      manualReference: manualRef,
      items: validItems,
      cashPaid: cashPaid || 0,
      advanceApplied: advanceApplied || 0,
      date: dateForTransaction,
      paymentAccountId,
    });

    setSuccessMessage(`Sale recorded successfully! Invoice #${invoiceNumber}`);
    resetForm();
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Record New Invoice</h2>
      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6" role="alert">
          <p>{successMessage}</p>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
                <label htmlFor="customer" className="block text-sm font-medium text-gray-700">Customer</label>
                <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required>
                    <option value="">Select a customer</option>
                    {shopCustomers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="saleDate" className="block text-sm font-medium text-gray-700">Invoice Date</label>
                <input type="date" id="saleDate" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
            </div>
             <div>
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">Invoice Number</label>
                <input type="text" id="invoiceNumber" value={invoiceNumber} readOnly className="mt-1 block w-full border border-gray-200 bg-gray-100 rounded-md shadow-sm p-2 text-gray-600 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Auto-generated sequence</p>
            </div>
            <div>
                <label htmlFor="manualRef" className="block text-sm font-medium text-gray-700">Manual Reference (Ref)</label>
                <input type="text" id="manualRef" value={manualRef} onChange={e => setManualRef(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" placeholder="e.g. Customer PO" />
            </div>
        </div>


        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Items</h3>
          <div className="space-y-4">
            {items.map((item, index) => {
                const hasStockError = item.quantity > item.stock && item.stock >= 0 && !!item.productId;
                const hasPriceWarning = item.salePrice > 0 && item.minSalePrice && item.salePrice < item.minSalePrice;

                return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-t border-gray-200 pt-4 first:pt-0 first:border-none">
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <select value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary">
                    <option value="">Select a product</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700">Dispatch From</label>
                  <select value={item.locationId} onChange={e => handleItemChange(index, 'locationId', e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" disabled={!item.productId}>
                    {locations.map(loc => {
                        const stockAtLoc = getStockLevel(item.productId, loc.id);
                        return <option key={loc.id} value={loc.id} disabled={stockAtLoc <= 0}>{loc.name} (Qty: {stockAtLoc})</option>
                    })}
                  </select>
                </div>
                <div className="md:col-span-1 relative">
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary ${hasStockError ? 'border-red-500' : 'border-gray-300'}`} min="1" />
                  {hasStockError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pt-6">
                        <Tooltip text={`Quantity exceeds available stock of ${item.stock}!`}>
                            <ExclamationIcon colorClass="text-red-500" />
                        </Tooltip>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700">Sale Price/Unit ({currentShopCurrency.symbol})</label>
                  <input type="number" placeholder="Price" value={item.salePrice} onChange={e => handleItemChange(index, 'salePrice', e.target.value)} className={`mt-1 block w-full border rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary ${hasPriceWarning ? 'border-yellow-500' : 'border-gray-300'}`} min="0.01" step="0.01" />
                  {hasPriceWarning && (
                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pt-6">
                        <Tooltip text={`Price is below the minimum of ${currentShopCurrency.symbol}${item.minSalePrice?.toFixed(2)}`}>
                            <ExclamationIcon colorClass="text-yellow-500" />
                        </Tooltip>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 text-right">
                    <label className="block text-sm font-medium text-gray-700">Total</label>
                    <p className="mt-1 p-2 font-semibold">{currentShopCurrency.symbol}{((item.quantity || 1) * (item.salePrice || 0)).toFixed(2)}</p>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-transparent hidden md:block">&nbsp;</label>
                  <button type="button" onClick={() => removeItemRow(index)} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg disabled:opacity-50" disabled={items.length <= 1}>X</button>
                </div>
              </div>
            )})}
          </div>
          <button type="button" onClick={addItemRow} className="mt-4 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">+ Add Item</button>
        </div>

        <div className="border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-xl font-bold">
                    <span className="text-gray-800">Total Invoice Amount:</span>
                    <span className="text-primary">{currentShopCurrency.symbol}{totalAmount.toFixed(2)}</span>
                </div>

                {customerAdvanceBalance > 0 && (
                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label htmlFor="advanceApplied" className="text-sm font-medium text-blue-800">Available Advance Balance: <span className="font-bold">{formatCurrency(customerAdvanceBalance)}</span></label>
                        <input type="number" id="advanceApplied" value={advanceApplied} onChange={e => handleAdvanceChange(parseFloat(e.target.value) || 0)} className="mt-2 w-full border border-blue-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" max={Math.min(customerAdvanceBalance * currentShopCurrency.rate, totalAmount)} />
                    </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                        <label htmlFor="cashPaid" className="text-gray-700 font-medium">Amount Paid ({currentShopCurrency.symbol}):</label>
                        <input type="number" id="cashPaid" value={cashPaid} onChange={e => setCashPaid(parseFloat(e.target.value) || 0)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" />
                    </div>
                     {cashPaid > 0 && (
                        <div>
                            <label htmlFor="paymentAccount" className="text-gray-700 font-medium">Deposit To Account:</label>
                            <select 
                                id="paymentAccount" 
                                value={paymentAccountId} 
                                onChange={e => setPaymentAccountId(e.target.value)} 
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" 
                                required
                            >
                                <option value="">Select account</option>
                                {currentShopAccounts.map(account => (
                                <option key={account.id} value={account.id}>{account.accountName}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
                <div className="flex justify-between items-center text-lg font-semibold mt-4">
                     <span className="text-gray-600">Amount on Credit / Change:</span>
                     <span className={`${creditAmount > 0 ? "text-red-500" : "text-green-600"}`}>
                        {creditAmount.toFixed(2)}
                     </span>
                </div>
            </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-8 rounded-lg transition duration-300">
            Record Sale
          </button>
        </div>
      </form>
    </div>
  );
};

export default Sales;
