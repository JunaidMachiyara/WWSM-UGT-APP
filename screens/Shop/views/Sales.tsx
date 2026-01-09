
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
// Fix: Removed incorrect import of SaleItem from AppContext as it wasn't exported and was unused
import { TransactionType, AccountType } from '../../../types';
import { ShopView } from '../ShopDashboard';
import SearchableSelect from '../../../components/SearchableSelect';

interface SalesProps {
  onNavigate?: (view: ShopView) => void;
}

interface InvoiceItem {
  productId: string;
  quantity: number | '';
  salePrice: number | '';
  locationId: string;
  stock: number;
  minSalePrice?: number;
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

const Sales: React.FC<SalesProps> = ({ onNavigate }) => {
  const { 
      shopId, products, recordSale, updateSale, customers, addCustomer, addProduct, addShopAccount, 
      currentShopCurrency, shopAccounts, getStockLevel, warehouses, shops, getAdvanceBalance, 
      formatCurrency, transactions, invoiceToEdit, setInvoiceToEdit 
  } = useAppContext();
  
  const [items, setItems] = useState<InvoiceItem[]>([{ productId: '', quantity: 1, salePrice: 0, stock: 0, minSalePrice: 0, locationId: shopId! }]);
  const [customerId, setCustomerId] = useState('');
  const [cashPaid, setCashPaid] = useState<number | ''>(0);
  const [advanceApplied, setAdvanceApplied] = useState<number | ''>(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [manualRef, setManualRef] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [isEditMode, setIsEditMode] = useState(false);

  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductHoCost, setNewProductHoCost] = useState<number | ''>(0);
  const [newProductMinSalePrice, setNewProductMinSalePrice] = useState<number | ''>(0);
  const [newProductWeight, setNewProductWeight] = useState<number | ''>(0);

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>(AccountType.CASH);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState<number | ''>(0);

  const shopCustomers = useMemo(() => customers.filter(c => c.shopId === shopId), [customers, shopId]);
  const currentShopAccounts = shopAccounts.filter(acc => acc.shopId === shopId);

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

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
  
  const resetForm = () => {
    setItems([{ productId: '', quantity: 1, salePrice: 0, stock: 0, minSalePrice: 0, locationId: shopId! }]);
    setCustomerId('');
    setCashPaid(0);
    setAdvanceApplied(0);
    setSaleDate(new Date().toISOString().split('T')[0]);
    setPaymentAccountId('');
    setManualRef('');
  };

  useEffect(() => {
    if (invoiceToEdit && shopId) {
        setIsEditMode(true);

        const cashTx = invoiceToEdit.transactionDocs.find(t => t.type === TransactionType.SALES_RECEIPT);
        const advanceTx = invoiceToEdit.transactionDocs.find(t => t.type === TransactionType.ADVANCE_USAGE);

        setCustomerId(invoiceToEdit.customerId);
        setSaleDate(new Date(invoiceToEdit.date).toISOString().split('T')[0]);
        setInvoiceNumber(invoiceToEdit.id);
        setManualRef(invoiceToEdit.reference || '');
        
        setCashPaid(cashTx ? cashTx.amount * currentShopCurrency.rate : 0);
        setPaymentAccountId(cashTx ? cashTx.paymentAccountId || '' : '');
        setAdvanceApplied(advanceTx ? advanceTx.amount * currentShopCurrency.rate : 0);
        
        const invoiceItems = invoiceToEdit.items.map(t => {
            const product = products.find(p => p.id === t.productId);
            const currentStock = getStockLevel(t.productId!, t.locationId!);
            const stockBeforeThisSale = currentStock + (t.quantity || 0);

            return {
                productId: t.productId!,
                quantity: t.quantity || 0,
                salePrice: t.amount * currentShopCurrency.rate,
                locationId: t.locationId || shopId,
                stock: stockBeforeThisSale,
                minSalePrice: product ? product.minSalePrice * currentShopCurrency.rate : 0,
            };
        });
        setItems(invoiceItems);
    } else {
        setIsEditMode(false);
        resetForm();
    }
  }, [invoiceToEdit, shopId, products, getStockLevel, currentShopCurrency.rate]);

  useEffect(() => {
    setAdvanceApplied(0);
  }, [customerId]);

  useEffect(() => {
    if (!shopId || isEditMode) return;
    const generateInvoiceNumber = () => {
        const today = new Date();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const yy = String(today.getFullYear()).slice(-2);
        const dateSuffix = `${mm}${dd}${yy}`;
        const salesTransactions = transactions.filter(t => t.shopId === shopId && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE));
        let maxSeq = 1000;
        salesTransactions.forEach(t => {
            if (t.invoiceId) {
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
  }, [shopId, transactions, saleDate, isEditMode]); 

  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === 'productId') {
        const newProductId = value as string;
        item.productId = newProductId;
        item.stock = getStockLevel(newProductId, item.locationId);
        const product = products.find(p => p.id === newProductId);
        if(product) {
            item.minSalePrice = product.minSalePrice * (currentShopCurrency.rate || 1);
            if (item.salePrice === 0 || item.salePrice === '') {
                item.salePrice = product.minSalePrice * (currentShopCurrency.rate || 1);
            }
        }
    } else if (field === 'locationId') {
        item.locationId = value as string;
        item.stock = getStockLevel(item.productId, item.locationId);
    } else if (field === 'quantity') {
        item.quantity = value === '' ? '' : (Number(value) < 0 ? 0 : Number(value));
    } else if (field === 'salePrice') {
        item.salePrice = value === '' ? '' : (Number(value) < 0 ? 0 : Number(value));
    }

    newItems[index] = item;
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

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => {
      if (item.productId && Number(item.quantity) > 0 && Number(item.salePrice) > 0) {
          return sum + (Number(item.salePrice) * Number(item.quantity));
      }
      return sum;
    }, 0);
  }, [items]);

  const creditAmount = totalAmount - (Number(cashPaid) || 0) - (Number(advanceApplied) || 0);

  const handleAdvanceChange = (value: string) => {
    if (value === '') {
        setAdvanceApplied('');
        return;
    }
    const val = parseFloat(value);
    const localAdvanceBalance = customerAdvanceBalance * currentShopCurrency.rate;
    const validValue = Math.max(0, Math.min(val, localAdvanceBalance, totalAmount));
    setAdvanceApplied(validValue);
  }
  
  const cancelEdit = () => {
    setInvoiceToEdit(null); // This will trigger the useEffect to reset the form.
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const itemsWithProduct = items.filter(i => i.productId);
    if (itemsWithProduct.length === 0) {
        alert('Please add at least one item to the invoice by selecting a product.');
        return;
    }
    const invalidItems = itemsWithProduct.filter(i => Number(i.quantity) <= 0 || Number(i.salePrice) <= 0 || !i.locationId);
    if (invalidItems.length > 0) {
        alert('Please ensure all added items have a dispatch location, a quantity and sale price greater than zero.');
        return;
    }
    if (!shopId || !customerId || !saleDate) {
      alert('Please select a customer and a date for the invoice.');
      return;
    }
    if (Number(cashPaid) < 0) {
      alert('Cash paid amount cannot be negative.');
      return;
    }
    if (Number(cashPaid) > 0 && !paymentAccountId) {
        alert('Please select an account to deposit the cash payment into.');
        return;
    }
    
    try {
        const dateForTransaction = new Date(saleDate + 'T00:00:00');
        
        if (isEditMode) {
            if (!invoiceToEdit) throw new Error("Editing invoice but no invoice data is loaded.");
            
            const deletedTransactionIds = invoiceToEdit.transactionDocs.map(doc => doc.id);
            const payload = {
                shopId,
                customerId,
                invoiceNumber,
                manualReference: manualRef,
                items: itemsWithProduct.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    salePrice: Number(i.salePrice),
                    locationId: i.locationId
                })),
                cashPaid: Number(cashPaid) || 0,
                advanceApplied: Number(advanceApplied) || 0,
                date: dateForTransaction,
                paymentAccountId,
                deletedTransactionIds,
            };

            await updateSale(payload);
            setInvoiceToEdit(null);
        } else {
             const payload = {
                shopId,
                customerId,
                invoiceNumber,
                manualReference: manualRef,
                items: itemsWithProduct.map(i => ({
                    productId: i.productId,
                    quantity: Number(i.quantity),
                    salePrice: Number(i.salePrice),
                    locationId: i.locationId
                })),
                cashPaid: Number(cashPaid) || 0,
                advanceApplied: Number(advanceApplied) || 0,
                date: dateForTransaction,
                paymentAccountId,
            };
            await recordSale(payload);
        }
        
        setShowSuccessModal(true);
        resetForm();
    } catch (err) {
        console.error(err);
        alert(`Failed to ${isEditMode ? 'update' : 'record'} sale. Please try again.`);
    }
  };

  const handleQuickAddCustomer = async () => {
      if (!newCustomerName.trim()) {
          alert('Customer name is required.');
          return;
      }
      if (!shopId) return;
      try {
          await addCustomer({
              name: newCustomerName,
              phone: newCustomerPhone,
              shopId,
              reference: 'Quick Add'
          });
          setNewCustomerName('');
          setNewCustomerPhone('');
          setShowAddCustomerModal(false);
      } catch (error) {
          console.error(error);
          alert('Failed to add customer.');
      }
  };

  const handleQuickAddProduct = async () => {
      if (!newProductName.trim() || !newProductCategory.trim() || Number(newProductHoCost) <= 0 || Number(newProductMinSalePrice) <= 0) {
          alert('Please fill all product fields correctly. Costs and prices must be greater than zero.');
          return;
      }
      try {
          await addProduct({
              name: newProductName,
              category: newProductCategory,
              hoCost: Number(newProductHoCost),
              minSalePrice: Number(newProductMinSalePrice),
              weight: Number(newProductWeight) || 0
          });
          setNewProductName('');
          setNewProductCategory('');
          setNewProductHoCost(0);
          setNewProductMinSalePrice(0);
          setNewProductWeight(0);
          setShowAddProductModal(false);
      } catch (error) {
          console.error(error);
          alert('Failed to add product.');
      }
  };

  const handleQuickAddAccount = async (e: React.MouseEvent) => {
    e.preventDefault();
    console.log('Sales: handleQuickAddAccount triggered');

    if (!newAccountName.trim() || !shopId) {
        alert('Account name is required.');
        return;
    }
    if (newAccountType === AccountType.BANK && (!newBankName.trim() || !newAccountNumber.trim())) {
        alert('Bank name and account number are required for bank accounts.');
        return;
    }

    setIsSavingAccount(true);
    try {
        console.log('Sales: Attempting to save account via AppContext...', { newAccountName, newAccountType, shopId });
        await addShopAccount({
            shopId,
            accountName: newAccountName,
            accountType: newAccountType,
            bankName: newAccountType === AccountType.BANK ? newBankName : undefined,
            accountNumber: newAccountType === AccountType.BANK ? newAccountNumber : undefined,
            openingBalance: Number(newOpeningBalance) || 0,
        });
        
        console.log('Sales: Account saved successfully.');
        setNewAccountName('');
        setNewAccountType(AccountType.CASH);
        setNewBankName('');
        setNewAccountNumber('');
        setNewOpeningBalance(0);
        setShowAddAccountModal(false);
    } catch (error: any) {
        console.error("Sales: Error saving account:", error);
        alert(`Failed to add account: ${error.message || 'Check connection'}`);
    } finally {
        setIsSavingAccount(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">{isEditMode ? `Editing Invoice #${invoiceNumber}` : 'Record New Invoice'}</h2>
      
      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
                <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700">Customer</label>
                    <button 
                        type="button" 
                        onClick={() => setShowAddCustomerModal(true)} 
                        className="text-xs text-primary hover:text-blue-800 font-bold hover:underline focus:outline-none"
                    >
                        + New Customer
                    </button>
                </div>
                <SearchableSelect 
                    options={shopCustomers} 
                    value={customerId} 
                    onChange={setCustomerId} 
                    placeholder="Search customer..." 
                />
            </div>
            <div>
                <label htmlFor="saleDate" className="block text-sm font-medium text-gray-700 mb-1">Invoice Date</label>
                <input type="date" id="saleDate" value={saleDate} onChange={e => setSaleDate(e.target.value)} className="block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" required />
            </div>
             <div>
                <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input type="text" id="invoiceNumber" value={invoiceNumber} readOnly className="block w-full border border-gray-200 bg-gray-100 rounded-md shadow-sm p-2 text-gray-600 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">{isEditMode ? 'Editing existing invoice' : 'Auto-generated sequence'}</p>
            </div>
            <div>
                <label htmlFor="manualRef" className="block text-sm font-medium text-gray-700 mb-1">Manual Reference (Ref)</label>
                <input type="text" id="manualRef" value={manualRef} onChange={e => setManualRef(e.target.value)} className="block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" placeholder="e.g. Customer PO" />
            </div>
        </div>


        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Invoice Items</h3>
          <div className="space-y-4">
            {items.map((item, index) => {
                const hasStockError = Number(item.quantity) > item.stock && item.stock >= 0 && !!item.productId;
                const hasPriceWarning = Number(item.salePrice) > 0 && item.minSalePrice && Number(item.salePrice) < item.minSalePrice;

                return (
              <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end border-t border-gray-200 pt-4 first:pt-0 first:border-none">
                <div className="md:col-span-3">
                  <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700">Product</label>
                      <button 
                        type="button" 
                        onClick={() => setShowAddProductModal(true)} 
                        className="text-[10px] text-primary hover:text-blue-800 font-bold hover:underline focus:outline-none"
                      >
                        + New Product
                      </button>
                  </div>
                  <SearchableSelect 
                    options={sortedProducts} 
                    value={item.productId} 
                    onChange={(val) => handleItemChange(index, 'productId', val)} 
                    placeholder="Search product..." 
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch From</label>
                  <select value={item.locationId} onChange={e => handleItemChange(index, 'locationId', e.target.value)} className="block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" disabled={!item.productId}>
                    {locations.map(loc => {
                        const stockAtLoc = getStockLevel(item.productId, loc.id);
                        return <option key={loc.id} value={loc.id} disabled={stockAtLoc <= 0}>{loc.name} (Qty: {stockAtLoc})</option>
                    })}
                  </select>
                </div>
                <div className="md:col-span-1 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" placeholder="Qty" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className={`block w-full border rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary ${hasStockError ? 'border-red-500' : 'border-gray-300'}`} min="1" />
                  {hasStockError && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pt-5">
                        <Tooltip text={`Quantity exceeds available stock of ${item.stock}!`}>
                            <ExclamationIcon colorClass="text-red-500" />
                        </Tooltip>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ({currentShopCurrency.symbol})</label>
                  <input type="number" placeholder="Price" value={item.salePrice} onChange={e => handleItemChange(index, 'salePrice', e.target.value)} className={`block w-full border rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary ${hasPriceWarning ? 'border-yellow-500' : 'border-gray-300'}`} min="0" step="0.01" />
                  {hasPriceWarning && (
                     <div className="absolute inset-y-0 right-0 pr-3 flex items-center pt-5">
                        <Tooltip text={`Price is below the minimum of ${currentShopCurrency.symbol}${item.minSalePrice?.toFixed(2)}`}>
                            <ExclamationIcon colorClass="text-yellow-500" />
                        </Tooltip>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2 text-right">
                    <label className="block text-sm font-medium text-gray-700">Total</label>
                    <p className="mt-1 p-2 font-semibold text-lg">{currentShopCurrency.symbol}{((Number(item.quantity) || 0) * (Number(item.salePrice) || 0)).toFixed(2)}</p>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-sm font-medium text-transparent hidden md:block">&nbsp;</label>
                  <button type="button" onClick={() => removeItemRow(index)} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg disabled:opacity-50" disabled={items.length <= 1}>X</button>
                </div>
              </div>
            )})}
          </div>
          <button type="button" onClick={addItemRow} className="mt-4 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors">+ Add Item</button>
        </div>

        <div className="border border-gray-200 rounded-lg p-6 bg-gray-50">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Payment Details</h3>
            <div className="space-y-4">
                <div className="flex justify-between items-center text-2xl font-bold border-b border-gray-200 pb-4">
                    <span className="text-gray-800">Total Invoice Amount:</span>
                    <span className="text-primary">{currentShopCurrency.symbol}{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>

                {customerAdvanceBalance > 0 && (
                     <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <label htmlFor="advanceApplied" className="text-sm font-medium text-blue-800">Available Advance Balance: <span className="font-bold">{formatCurrency(customerAdvanceBalance)}</span></label>
                        <input type="number" id="advanceApplied" value={advanceApplied} onChange={e => handleAdvanceChange(e.target.value)} className="mt-2 w-full border border-blue-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" />
                    </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                        <label htmlFor="cashPaid" className="text-sm font-medium text-gray-700">Amount Paid Now ({currentShopCurrency.symbol})</label>
                        <input type="number" id="cashPaid" value={cashPaid} onChange={e => setCashPaid(e.target.value === '' ? '' : parseFloat(e.target.value))} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" />
                    </div>
                     {Number(cashPaid) > 0 && (
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="paymentAccount" className="text-sm font-medium text-gray-700">Deposit To Account</label>
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddAccountModal(true)} 
                                    className="text-[10px] text-primary hover:text-blue-800 font-bold hover:underline focus:outline-none"
                                >
                                    + New Account
                                </button>
                            </div>
                            <select 
                                id="paymentAccount" 
                                value={paymentAccountId} 
                                onChange={e => setPaymentAccountId(e.target.value)} 
                                className="block w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" 
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
                <div className="flex justify-between items-center text-lg font-semibold pt-4">
                     <span className="text-gray-600">Credit Balance / Change:</span>
                     <span className={`${creditAmount > 0.01 ? "text-red-600" : creditAmount < -0.01 ? "text-green-600" : "text-gray-800"}`}>
                        {creditAmount.toFixed(2)}
                     </span>
                </div>
            </div>
        </div>

        {isEditMode ? (
            <div className="flex justify-end space-x-4">
                <button type="button" onClick={cancelEdit} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-3 px-8 rounded-lg transition-colors">Cancel Edit</button>
                <button type="submit" className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-12 rounded-lg shadow-md transition-colors">Update Invoice</button>
            </div>
        ) : (
            <div className="flex justify-end">
                <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-12 rounded-lg transition duration-300 shadow-md">Record Sale</button>
            </div>
        )}
      </form>

      {/* Success Confirmation Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center transform transition-all animate-scale-up">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                    </svg>
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Success!</h3>
                <p className="text-gray-500 mb-8 font-medium">Invoice {isEditMode ? 'updated' : 'generated'} successfully.</p>
                
                <div className="space-y-3">
                    <button 
                        onClick={() => setShowSuccessModal(false)}
                        className="w-full py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-dark transition-all shadow-lg active:scale-95"
                    >
                        {isEditMode ? 'Go to History' : 'Record Another'}
                    </button>
                    <button 
                        onClick={() => onNavigate?.('dashboard')}
                        className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all active:scale-95"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all animate-scale-up">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Create New Customer</h3>
                    <button onClick={() => setShowAddCustomerModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <input 
                            type="text" 
                            value={newCustomerName} 
                            onChange={e => setNewCustomerName(e.target.value)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                            autoFocus 
                            placeholder="Enter customer name"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Phone Number (Optional)</label>
                        <input 
                            type="text" 
                            value={newCustomerPhone} 
                            onChange={e => setNewCustomerPhone(e.target.value)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                            placeholder="Enter phone number"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            onClick={() => setShowAddCustomerModal(false)} 
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleQuickAddCustomer} 
                            className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark font-bold shadow-md"
                        >
                            Save Customer
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Quick Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg transform transition-all overflow-y-auto max-h-screen animate-scale-up">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Create New Product</h3>
                    <button onClick={() => setShowAddProductModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Product Name</label>
                        <input 
                            type="text" 
                            value={newProductName} 
                            onChange={e => setNewProductName(e.target.value)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                            autoFocus 
                            placeholder="e.g. Laptop Charger"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Category</label>
                        <input 
                            type="text" 
                            value={newProductCategory} 
                            onChange={e => setNewProductCategory(e.target.value)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                            placeholder="e.g. Electronics"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">HO Cost ($ USD)</label>
                            <input 
                                type="number" 
                                value={newProductHoCost} 
                                onChange={e => setNewProductHoCost(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                                min="0" step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Sale Price ($ USD)</label>
                            <input 
                                type="number" 
                                value={newProductMinSalePrice} 
                                onChange={e => setNewProductMinSalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                                className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                                min="0" step="0.01"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Weight (Kg)</label>
                        <input 
                            type="number" 
                            value={newProductWeight} 
                            onChange={e => setNewProductWeight(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                            min="0" step="0.01"
                        />
                    </div>
                    <p className="text-xs text-gray-500 italic">Note: Head Office Cost and Min Sale Price are set in USD Base Currency.</p>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            onClick={() => setShowAddProductModal(false)} 
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleQuickAddProduct} 
                            className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark font-bold shadow-md"
                        >
                            Save Product
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* Quick Add Account Modal */}
      {showAddAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all animate-scale-up">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h3 className="text-lg font-bold text-gray-800">Create New Account</h3>
                    <button onClick={() => !isSavingAccount && setShowAddAccountModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Account Name</label>
                        <input 
                            type="text" 
                            value={newAccountName} 
                            onChange={e => setNewAccountName(e.target.value)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                            autoFocus 
                            disabled={isSavingAccount}
                            placeholder="e.g. Main Cash Drawer"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Account Type</label>
                        <select 
                            value={newAccountType} 
                            onChange={e => setNewAccountType(e.target.value as AccountType)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                            disabled={isSavingAccount}
                        >
                            <option value={AccountType.CASH}>Cash Account</option>
                            <option value={AccountType.BANK}>Bank Account</option>
                        </select>
                    </div>
                    {newAccountType === AccountType.BANK && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Bank Name</label>
                                <input 
                                    type="text" 
                                    value={newBankName} 
                                    onChange={e => setNewBankName(e.target.value)} 
                                    className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                                    disabled={isSavingAccount}
                                    placeholder="e.g. Bank of Africa"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                                <input 
                                    type="text" 
                                    value={newAccountNumber} 
                                    onChange={e => setNewAccountNumber(e.target.value)} 
                                    className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                                    disabled={isSavingAccount}
                                    placeholder="Account Number"
                                />
                            </div>
                        </>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Opening Balance ({currentShopCurrency.symbol})</label>
                        <input 
                            type="number" 
                            value={newOpeningBalance} 
                            onChange={e => setNewOpeningBalance(e.target.value === '' ? '' : parseFloat(e.target.value))} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                            disabled={isSavingAccount}
                            min="0" step="0.01"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            type="button"
                            onClick={() => !isSavingAccount && setShowAddAccountModal(false)} 
                            disabled={isSavingAccount}
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="button"
                            onClick={handleQuickAddAccount} 
                            disabled={isSavingAccount || !newAccountName}
                            className={`px-4 py-2 text-white bg-primary rounded-lg font-bold shadow-md flex items-center ${isSavingAccount || !newAccountName ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
                        >
                            {isSavingAccount ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Saving...
                                </>
                            ) : 'Save Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
