
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { SaleItem } from '../../../context/AppContext';
import { TransactionType, AccountType } from '../../../types';

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

// --- Searchable Select Component ---
interface Option {
    id: string;
    name: string;
    description?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    const selectedOption = useMemo(() => options.find(o => o.id === value), [options, value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(o => o.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm]);

    const handleSelect = (id: string) => {
        onChange(id);
        setIsOpen(false);
        setSearchTerm('');
    };

    return (
        <div className="relative" ref={wrapperRef}>
            <div 
                className={`flex items-center justify-between w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 cursor-pointer focus-within:ring-1 focus-within:ring-primary focus-within:border-primary ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={`block truncate ${!selectedOption ? 'text-gray-500' : 'text-gray-900'}`}>
                    {selectedOption ? selectedOption.name : placeholder}
                </span>
                <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </div>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full rounded-md bg-white shadow-xl ring-1 ring-black ring-opacity-5 flex flex-col max-h-60 overflow-hidden">
                    <div className="p-2 border-b border-gray-100 sticky top-0 bg-white">
                        <input
                            type="text"
                            className="w-full text-sm border border-gray-200 rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    </div>
                    <ul className="overflow-y-auto py-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <li
                                    key={option.id}
                                    className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-primary transition-colors ${option.id === value ? 'bg-blue-100 text-primary font-semibold' : 'text-gray-700'}`}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option.id);
                                    }}
                                >
                                    {option.name}
                                </li>
                            ))
                        ) : (
                            <li className="px-3 py-2 text-sm text-gray-500 italic">No results found</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};


const Sales: React.FC = () => {
  const { shopId, products, recordSale, customers, addCustomer, addProduct, addShopAccount, currentShopCurrency, shopAccounts, getStockLevel, warehouses, shops, getAdvanceBalance, formatCurrency, transactions } = useAppContext();
  
  const [items, setItems] = useState<InvoiceItem[]>([{ productId: '', quantity: 1, salePrice: 0, stock: 0, minSalePrice: 0, locationId: shopId! }]);
  const [customerId, setCustomerId] = useState('');
  const [cashPaid, setCashPaid] = useState(0);
  const [advanceApplied, setAdvanceApplied] = useState(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentAccountId, setPaymentAccountId] = useState('');
  const [manualRef, setManualRef] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  // Quick Add Customer State
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');

  // Quick Add Product State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('');
  const [newProductHoCost, setNewProductHoCost] = useState(0);
  const [newProductMinSalePrice, setNewProductMinSalePrice] = useState(0);
  const [newProductWeight, setNewProductWeight] = useState(0);

  // Quick Add Account State
  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [newAccountType, setNewAccountType] = useState<AccountType>(AccountType.CASH);
  const [newBankName, setNewBankName] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newOpeningBalance, setNewOpeningBalance] = useState(0);

  const shopCustomers = useMemo(() => customers.filter(c => c.shopId === shopId), [customers, shopId]);
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
  }, [shopId, transactions, saleDate]); 


  const handleItemChange = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const newItems = [...items];
    const item = newItems[index];
    
    if (field === 'productId') {
        const newProductId = value as string;
        item.productId = newProductId;
        item.stock = getStockLevel(newProductId, item.locationId);
        const product = products.find(p => p.id === newProductId);
        if(product) {
            item.minSalePrice = product.minSalePrice * (currentShopCurrency.rate || 1);
            // Default to min sale price if price is 0
            if (item.salePrice === 0) {
                item.salePrice = product.minSalePrice * (currentShopCurrency.rate || 1);
            }
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
    if (!shopId || !customerId || !saleDate) {
      alert('Please select a customer and a date for the invoice.');
      return;
    }
    if (cashPaid < 0) {
      alert('Cash paid amount cannot be negative.');
      return;
    }
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
      items: itemsWithProduct,
      cashPaid: cashPaid || 0,
      advanceApplied: advanceApplied || 0,
      date: dateForTransaction,
      paymentAccountId,
    });
    setSuccessMessage(`Sale recorded successfully! Invoice #${invoiceNumber}`);
    resetForm();
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const handleQuickAddCustomer = async () => {
      if (!newCustomerName.trim()) {
          alert('Customer name is required.');
          return;
      }
      if (!shopId) return;
      try {
          addCustomer({
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
      if (!newProductName.trim() || !newProductCategory.trim() || newProductHoCost <= 0 || newProductMinSalePrice <= 0) {
          alert('Please fill all product fields correctly. Costs and prices must be greater than zero.');
          return;
      }
      try {
          addProduct({
              name: newProductName,
              category: newProductCategory,
              hoCost: newProductHoCost,
              minSalePrice: newProductMinSalePrice,
              weight: newProductWeight
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

  const handleQuickAddAccount = async () => {
    if (!newAccountName.trim() || !shopId) {
        alert('Account name is required.');
        return;
    }
    if (newAccountType === AccountType.BANK && (!newBankName.trim() || !newAccountNumber.trim())) {
        alert('Bank name and account number are required for bank accounts.');
        return;
    }

    try {
        addShopAccount({
            shopId,
            accountName: newAccountName,
            accountType: newAccountType,
            bankName: newAccountType === AccountType.BANK ? newBankName : undefined,
            accountNumber: newAccountType === AccountType.BANK ? newAccountNumber : undefined,
            openingBalance: newOpeningBalance,
        });
        setNewAccountName('');
        setNewAccountType(AccountType.CASH);
        setNewBankName('');
        setNewAccountNumber('');
        setNewOpeningBalance(0);
        setShowAddAccountModal(false);
    } catch (error) {
        console.error(error);
        alert('Failed to add account.');
    }
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
                <p className="text-xs text-gray-500 mt-1">Auto-generated sequence</p>
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
                const hasStockError = item.quantity > item.stock && item.stock >= 0 && !!item.productId;
                const hasPriceWarning = item.salePrice > 0 && item.minSalePrice && item.salePrice < item.minSalePrice;

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
                    options={products} 
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
                    <p className="mt-1 p-2 font-semibold text-lg">{currentShopCurrency.symbol}{((item.quantity || 1) * (item.salePrice || 0)).toFixed(2)}</p>
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
                        <input type="number" id="advanceApplied" value={advanceApplied} onChange={e => handleAdvanceChange(parseFloat(e.target.value) || 0)} className="mt-2 w-full border border-blue-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" max={Math.min(customerAdvanceBalance * currentShopCurrency.rate, totalAmount)} />
                    </div>
                )}


                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    <div>
                        <label htmlFor="cashPaid" className="text-sm font-medium text-gray-700">Amount Paid Now ({currentShopCurrency.symbol})</label>
                        <input type="number" id="cashPaid" value={cashPaid} onChange={e => setCashPaid(parseFloat(e.target.value) || 0)} className="mt-1 w-full border border-gray-300 rounded-md shadow-sm p-2 bg-white text-gray-900 focus:outline-none focus:ring-primary" min="0" step="0.01" />
                    </div>
                     {cashPaid > 0 && (
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

        <div className="flex justify-end">
          <button type="submit" className="bg-primary hover:bg-primary-dark text-white font-bold py-3 px-12 rounded-lg transition duration-300 shadow-md">
            Record Sale
          </button>
        </div>
      </form>

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
                                onChange={e => setNewProductHoCost(parseFloat(e.target.value) || 0)} 
                                className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
                                min="0" step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Min Sale Price ($ USD)</label>
                            <input 
                                type="number" 
                                value={newProductMinSalePrice} 
                                onChange={e => setNewProductMinSalePrice(parseFloat(e.target.value) || 0)} 
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
                            onChange={e => setNewProductWeight(parseFloat(e.target.value) || 0)} 
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
                    <button onClick={() => setShowAddAccountModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
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
                            placeholder="e.g. Main Cash Drawer"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Account Type</label>
                        <select 
                            value={newAccountType} 
                            onChange={e => setNewAccountType(e.target.value as AccountType)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary"
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
                            onChange={e => setNewOpeningBalance(parseFloat(e.target.value) || 0)} 
                            className="mt-1 w-full border border-gray-300 p-2 rounded-md shadow-sm bg-white text-gray-900 focus:ring-primary focus:border-primary" 
                            min="0" step="0.01"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 mt-6">
                        <button 
                            onClick={() => setShowAddAccountModal(false)} 
                            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleQuickAddAccount} 
                            className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark font-bold shadow-md"
                        >
                            Save Account
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
