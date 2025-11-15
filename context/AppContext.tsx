import React, { createContext, useState, useContext, ReactNode, useEffect, useMemo } from 'react';
import { db, storage } from '../firebase';
import {
  collection,
  query,
  onSnapshot,
  addDoc,
  doc,
  updateDoc,
  writeBatch,
  Timestamp,
  setDoc,
  deleteDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { 
  UserRole, Shop, Product, User, Transaction, Customer, TransactionType,
  ClearingAgent, FreightForwarder, CustomExpenseType, ExpenseAccount,
  Shipment, ShipmentStatus, Currency, ShopAccount, AccountType, Alert, AlertType, Warehouse, Asset, AssetStatus, AdvanceItem
} from '../types';

export interface ExportItem {
  productId: string;
  quantity: number;
  landedCost: number;
}

export interface AddExportPayload {
  shopId: string;
  items: ExportItem[];
  freightForwarder: { id: string; amount: number };
  clearingAgent: { id: string; amount: number };
  customExpense: { typeId: string; amount: number };
  expectedDuty: number;
}

export interface SaleItem {
    productId: string;
    quantity: number;
    salePrice: number;
}

export interface RecordSalePayload {
    shopId: string;
    customerId: string;
    items: (SaleItem & { locationId: string })[];
    cashPaid: number;
    paymentAccountId: string;
    advanceApplied?: number;
}

export interface RecordSalesReturnPayload {
  shopId: string;
  customerId: string;
  invoiceId: string;
  returnedItems: { productId: string; quantity: number; salePrice: number }[];
  reason: string;
  date: Date;
  refundMethod: 'credit' | 'cash';
  paymentAccountId?: string; // Required if refundMethod is 'cash'
  locationId: string;
}

export interface TransferStockPayload {
  shopId: string;
  productId: string;
  quantity: number;
  fromLocationId: string;
  toLocationId: string;
  date: Date;
}

export interface AddAssetPayload {
  shopId: string;
  name: string;
  category: string;
  purchaseDate: Date;
  purchaseCost: number; // in local currency
  paymentAccountId: string;
  expenseAccountId: string;
}

export interface RecordAdvancePayload {
  shopId: string;
  customerId: string;
  amount: number;
  date: Date;
  paymentAccountId: string;
  advanceForItems?: AdvanceItem[];
}

export interface AddShopPayload extends Omit<Shop, 'id' | 'shopImageUrls' | 'surroundingsImageUrls'> {
    shopImages: File[];
    surroundingsImages: File[];
}


interface AppContextType {
  role: UserRole | null;
  setRole: (role: UserRole | null) => void;
  shopId: string | null;
  setShopId: (id: string | null) => void;
  shops: Shop[];
  addShop: (shop: AddShopPayload) => Promise<void>;
  updateShop: (shopId: string, data: Partial<Omit<Shop, 'id'>>) => Promise<void>;
  deleteShop: (shopId: string) => Promise<void>;
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => void;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => void;
  transactions: Transaction[];
  recordSale: (payload: RecordSalePayload & { date: Date }) => void;
  recordPayment: (payload: { shopId: string; customerId: string; amount: number; date: Date; notes?: string; paymentAccountId: string }) => void;
  recordSalesReturn: (payload: RecordSalesReturnPayload) => void;
  addExpense: (expense: { shopId: string, expenseAccountId: string, description: string, amount: number, date: Date, paymentAccountId: string }) => void;
  addExport: (data: AddExportPayload) => void;
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id'>) => void;
  clearingAgents: ClearingAgent[];
  addClearingAgent: (agent: Omit<ClearingAgent, 'id'>) => void;
  freightForwarders: FreightForwarder[];
  addFreightForwarder: (forwarder: Omit<FreightForwarder, 'id'>) => void;
  customExpenseTypes: CustomExpenseType[];
  addCustomExpenseType: (expenseType: Omit<CustomExpenseType, 'id'>) => void;
  expenseAccounts: ExpenseAccount[];
  addExpenseAccount: (account: Omit<ExpenseAccount, 'id'>) => void;
  shipments: Shipment[];
  receiveShipment: (payload: { shipmentId: string; receivedItems: { productId: string; quantity: number }[], locationId: string }) => void;
  currencies: Currency[];
  updateCurrency: (currency: Pick<Currency, 'id' | 'rate'>) => void;
  currentShopCurrency: Currency;
  formatCurrency: (amountInBase: number) => string;
  shopAccounts: ShopAccount[];
  addShopAccount: (account: Omit<ShopAccount, 'id' | 'openingBalance'> & {openingBalance: number}) => void;
  getStockLevel: (productId: string, locationId: string) => number;
  alerts: Alert[];
  logAlert: (alert: Omit<Alert, 'id' | 'date' | 'isRead'>) => void;
  warehouses: Warehouse[];
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => void;
  transferStock: (payload: TransferStockPayload) => void;
  assets: Asset[];
  addAsset: (payload: AddAssetPayload) => void;
  recordAdvance: (payload: RecordAdvancePayload) => void;
  getAdvanceBalance: (customerId: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [role, setRole] = useState<UserRole | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [clearingAgents, setClearingAgents] = useState<ClearingAgent[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<FreightForwarder[]>([]);
  const [customExpenseTypes, setCustomExpenseTypes] = useState<CustomExpenseType[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [shopAccounts, setShopAccounts] = useState<ShopAccount[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const cleanupTShops = async () => {
      try {
        const shopsRef = collection(db, 'shops');
        const q = query(shopsRef, where("name", "==", "T"));
        const querySnapshot = await getDocs(q);
  
        if (querySnapshot.empty) {
          // No shops named "T" found, so the work is done.
          return;
        }
        
        const shopsToDelete = querySnapshot.docs;
        const numberOfShops = shopsToDelete.length;
        
        if (numberOfShops > 0) {
            const batch = writeBatch(db);
    
            const deleteFolderContents = async (path: string) => {
              const folderRef = ref(storage, path);
              try {
                  const res = await listAll(folderRef);
                  const deleteFilePromises = res.items.map(itemRef => deleteObject(itemRef));
                  await Promise.all(deleteFilePromises);
                  const deleteFolderPromises = res.prefixes.map(prefixRef => deleteFolderContents(prefixRef.fullPath));
                  await Promise.all(deleteFolderPromises);
              } catch(e: any) {
                  if (e.code !== 'storage/object-not-found') {
                      console.error(`Error deleting storage folder ${path}:`, e);
                      // Don't re-throw, allow Firestore deletion to proceed if possible
                  }
              }
            };
    
            for (const docSnapshot of shopsToDelete) {
              const shopId = docSnapshot.id;
              await deleteFolderContents(`shops/${shopId}`);
              batch.delete(docSnapshot.ref);
            }
    
            await batch.commit();
    
            alert(`Cleanup complete: ${numberOfShops} shop(s) with the name "T" have been permanently deleted.`);
        }
  
      } catch (error) {
        console.error("Error during cleanup of 'T' shops:", error);
        alert("An error occurred during the data cleanup process. Please check the console for details.");
      }
    };
  
    cleanupTShops();
  }, []);

  useEffect(() => {
    const collections: { name: string; setter: Function }[] = [
      { name: 'shops', setter: setShops },
      { name: 'products', setter: setProducts },
      { name: 'users', setter: setUsers },
      { name: 'customers', setter: setCustomers },
      { name: 'clearingAgents', setter: setClearingAgents },
      { name: 'freightForwarders', setter: setFreightForwarders },
      { name: 'customExpenseTypes', setter: setCustomExpenseTypes },
      { name: 'expenseAccounts', setter: setExpenseAccounts },
      { name: 'shopAccounts', setter: setShopAccounts },
      { name: 'warehouses', setter: setWarehouses },
    ];
  
    const unsubscribes = collections.map(({ name, setter }) => {
      const q = query(collection(db, name));
      return onSnapshot(q, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data);
      });
    });

    // Special handlers for collections with Timestamps
    const qTransactions = query(collection(db, "transactions"));
    const unsubTransactions = onSnapshot(qTransactions, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            return { 
                id: doc.id, 
                ...docData,
                date: (docData.date as Timestamp)?.toDate() || new Date()
            };
        });
        setTransactions(data as Transaction[]);
    });

    const qShipments = query(collection(db, "shipments"));
    const unsubShipments = onSnapshot(qShipments, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            return { 
                id: doc.id, 
                ...docData,
                date: (docData.date as Timestamp)?.toDate() || new Date()
            };
        });
        setShipments(data as Shipment[]);
    });
    
    const qAlerts = query(collection(db, "alerts"));
    const unsubAlerts = onSnapshot(qAlerts, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            return { 
                id: doc.id, 
                ...docData,
                date: (docData.date as Timestamp)?.toDate() || new Date()
            };
        });
        setAlerts(data as Alert[]);
    });
    
    const qAssets = query(collection(db, "assets"));
    const unsubAssets = onSnapshot(qAssets, (querySnapshot) => {
        const data = querySnapshot.docs.map(doc => {
            const docData = doc.data();
            return { 
                id: doc.id, 
                ...docData,
                purchaseDate: (docData.purchaseDate as Timestamp)?.toDate() || new Date()
            };
        });
        setAssets(data as Asset[]);
    });

    const qCurrencies = query(collection(db, 'currencies'));
    const unsubCurrencies = onSnapshot(qCurrencies, (snapshot) => {
        if (snapshot.empty) {
            // Seed data for demo purposes if collection is empty
            const initialCurrencies: Currency[] = [
                { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 },
                { id: 'UGX', name: 'Ugandan Shilling', symbol: 'UGX ', rate: 3850 },
                { id: 'KES', name: 'Kenyan Shilling', symbol: 'KSh ', rate: 132 },
                { id: 'EUR', name: 'Euro', symbol: '€', rate: 0.93 },
            ];
            const batch = writeBatch(db);
            initialCurrencies.forEach(currency => {
                const docRef = doc(db, "currencies", currency.id);
                batch.set(docRef, currency);
            });
            batch.commit();
            setCurrencies(initialCurrencies);
        } else {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Currency));
            setCurrencies(data);
        }
    });
  
    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubTransactions();
      unsubShipments();
      unsubAlerts();
      unsubAssets();
      unsubCurrencies();
    };
  }, []);

    const currentShopCurrency = useMemo(() => {
        const defaultCurrency = { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };
        if (role === UserRole.SHOP_OPERATOR && shopId) {
            const currentShop = shops.find(s => s.id === shopId);
            if (currentShop && currentShop.currencyCode) {
                return currencies.find(c => c.id === currentShop.currencyCode) || defaultCurrency;
            }
        }
        // For HO or if shop has no currency set, default to USD
        return currencies.find(c => c.id === 'USD') || defaultCurrency;
  }, [role, shopId, shops, currencies]);

  const convertToUSD = (localAmount: number) => {
    if (!currentShopCurrency || currentShopCurrency.rate === 0 || currentShopCurrency.id === 'USD') {
        return localAmount;
    }
    return localAmount / currentShopCurrency.rate;
  };
  
  const formatCurrency = (amountInBase: number): string => {
    const localAmount = amountInBase * (currentShopCurrency?.rate || 1);
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currentShopCurrency?.id || 'USD',
        }).format(localAmount);
    } catch (e) {
        return `${currentShopCurrency?.symbol || '$'}${localAmount.toFixed(2)}`;
    }
  };


  const uploadImages = async (files: File[], path: string): Promise<string[]> => {
    const uploadPromises = files.map(async file => {
      const imageRef = ref(storage, `${path}/${Date.now()}_${file.name}`);
      await uploadBytes(imageRef, file);
      const url = await getDownloadURL(imageRef);
      return url;
    });
    return Promise.all(uploadPromises);
  };
  
  const addShop = async (shop: AddShopPayload) => {
    const { shopImages, surroundingsImages, ...shopData } = shop;
  
    // 1. Create shop doc first to get an ID
    const newShopData = {
      ...shopData,
      shopImageUrls: [],
      surroundingsImageUrls: [],
    };
    const docRef = await addDoc(collection(db, 'shops'), newShopData);
    const shopId = docRef.id;
  
    // 2. Upload images to paths using the new shop ID
    const shopImageUrls = await uploadImages(shopImages, `shops/${shopId}/shopImages`);
    const surroundingsImageUrls = await uploadImages(surroundingsImages, `shops/${shopId}/surroundingsImages`);
  
    // 3. Update the shop doc with the image URLs
    await updateDoc(docRef, { shopImageUrls, surroundingsImageUrls });
  };

  const updateShop = async (shopId: string, data: Partial<Omit<Shop, 'id'>>) => {
    const shopRef = doc(db, 'shops', shopId);
    await updateDoc(shopRef, data);
  };

  const deleteShop = async (shopId: string) => {
    if (!shopId) return;

    try {
        // Recursively delete all files in the shop's storage folder
        const deleteFolderContents = async (path: string) => {
            const folderRef = ref(storage, path);
            const res = await listAll(folderRef);
            
            const deleteFilePromises = res.items.map(itemRef => deleteObject(itemRef));
            await Promise.all(deleteFilePromises);
            
            const deleteFolderPromises = res.prefixes.map(prefixRef => deleteFolderContents(prefixRef.fullPath));
            await Promise.all(deleteFolderPromises);
        };
        
        await deleteFolderContents(`shops/${shopId}`);

        // If storage deletion is successful, delete the Firestore doc
        await deleteDoc(doc(db, 'shops', shopId));
    } catch (error) {
        console.error("Failed to delete shop and its assets:", error);
        // Re-throw the error so the UI can catch it and show a message
        throw error;
    }
  };

  const addProduct = async (product: Omit<Product, 'id'>) => {
    await addDoc(collection(db, 'products'), product);
  };

  const addUser = async (user: Omit<User, 'id'>) => {
    await addDoc(collection(db, 'users'), user);
  };

  const addCustomer = async (customer: Omit<Customer, 'id'>) => {
    await addDoc(collection(db, 'customers'), customer);
  };
  
  const getStockLevel = (productId: string, locationId: string): number => {
    if (!productId || !locationId) return 0;
    
    const productTransactions = transactions.filter(t => t.productId === productId);

    const inflows = productTransactions
      .filter(t => t.locationId === locationId && (t.type === TransactionType.IMPORT || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.STOCK_TRANSFER_IN))
      .reduce((sum, t) => sum + (t.quantity || 0), 0);
    
    const outflows = productTransactions
      .filter(t => t.locationId === locationId && (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT))
      .reduce((sum, t) => sum + (t.quantity || 0), 0);

    return inflows - outflows;
  };

  const logAlert = async (alert: Omit<Alert, 'id' | 'date' | 'isRead'>) => {
    await addDoc(collection(db, 'alerts'), {
      ...alert,
      date: Timestamp.now(),
      isRead: false,
    });
  };

  const getAdvanceBalance = (customerId: string): number => {
    if (!customerId) return 0;
    const customerTransactions = transactions.filter(t => t.customerId === customerId && t.shopId === shopId);
    
    const advances = customerTransactions
      .filter(t => t.type === TransactionType.CUSTOMER_ADVANCE)
      .reduce((sum, t) => sum + t.amount, 0);

    const used = customerTransactions
      .filter(t => t.type === TransactionType.ADVANCE_USAGE)
      .reduce((sum, t) => sum + t.amount, 0);
      
    return advances - used;
  };

  const recordAdvance = async (payload: RecordAdvancePayload) => {
    const convertedAmount = convertToUSD(payload.amount);
    const customer = customers.find(c => c.id === payload.customerId);
    await addDoc(collection(db, 'transactions'), {
        shopId: payload.shopId,
        customerId: payload.customerId,
        type: TransactionType.CUSTOMER_ADVANCE,
        description: `Advance payment from ${customer?.name || 'customer'}`,
        amount: convertedAmount,
        paymentAccountId: payload.paymentAccountId,
        date: Timestamp.fromDate(payload.date),
        advanceForItems: payload.advanceForItems || [],
    });
  };


  const recordSale = async (sale: RecordSalePayload & { date: Date }) => {
    const batch = writeBatch(db);
    const saleDate = sale.date;
    const invoiceId = `inv-${Date.now()}`;

    sale.items.forEach(item => {
        const stockLevel = getStockLevel(item.productId, item.locationId);
        if (item.quantity > stockLevel) {
            const product = products.find(p => p.id === item.productId);
            logAlert({
                shopId: sale.shopId,
                type: AlertType.STOCK_DISCREPANCY,
                message: `Sale of ${item.quantity} units of "${product?.name || 'Unknown'}" exceeded stock of ${stockLevel} on invoice #${invoiceId}.`,
                context: { invoiceId, productId: item.productId, productName: product?.name || 'Unknown', soldQty: item.quantity, stockQty: stockLevel }
            });
        }
    });
    
    const convertedItems = sale.items.map(item => ({ ...item, salePrice: convertToUSD(item.salePrice) }));
    const convertedCashPaid = convertToUSD(sale.cashPaid);
    const convertedAdvanceApplied = convertToUSD(sale.advanceApplied || 0);
    
    const totalAmount = convertedItems.reduce((sum, item) => sum + (item.salePrice * item.quantity), 0);
    
    const totalPayment = convertedCashPaid + convertedAdvanceApplied;
    const isFullCashSale = totalPayment >= totalAmount;
    const saleType = isFullCashSale ? TransactionType.CASH_SALE : TransactionType.CREDIT_SALE;
    const description = isFullCashSale ? 'Cash Sale' : 'Credit Sale';

    convertedItems.forEach(item => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
            const transRef = doc(collection(db, 'transactions'));
            batch.set(transRef, {
                shopId: sale.shopId,
                invoiceId,
                productId: item.productId,
                type: saleType,
                description: `${description}: ${product.name}`,
                amount: item.salePrice,
                quantity: item.quantity,
                customerId: sale.customerId,
                date: Timestamp.fromDate(saleDate),
                locationId: item.locationId,
            });
        }
    });

    if (convertedCashPaid > 0) {
        const receiptRef = doc(collection(db, 'transactions'));
        batch.set(receiptRef, {
            shopId: sale.shopId,
            invoiceId,
            type: TransactionType.SALES_RECEIPT,
            description: `Payment for invoice ${invoiceId}`,
            amount: convertedCashPaid,
            customerId: sale.customerId,
            paymentAccountId: sale.paymentAccountId,
            date: Timestamp.fromDate(saleDate),
        });
    }

    if (convertedAdvanceApplied > 0) {
        const advanceUsageRef = doc(collection(db, 'transactions'));
        batch.set(advanceUsageRef, {
            shopId: sale.shopId,
            invoiceId,
            type: TransactionType.ADVANCE_USAGE,
            description: `Advance applied to invoice ${invoiceId}`,
            amount: convertedAdvanceApplied,
            customerId: sale.customerId,
            date: Timestamp.fromDate(saleDate),
        });
    }

    await batch.commit();
  };

  const recordPayment = async (payload: { shopId: string; customerId: string; amount: number; date: Date; notes?: string; paymentAccountId: string; }) => {
    const convertedAmount = convertToUSD(payload.amount);
    await addDoc(collection(db, 'transactions'), {
      shopId: payload.shopId,
      customerId: payload.customerId,
      type: TransactionType.SALES_RECEIPT,
      description: payload.notes || `Payment received from customer`,
      amount: convertedAmount,
      paymentAccountId: payload.paymentAccountId,
      date: Timestamp.fromDate(payload.date),
    });
  };

  const recordSalesReturn = async (payload: RecordSalesReturnPayload) => {
    const batch = writeBatch(db);
    const returnDate = Timestamp.fromDate(payload.date);
    let totalReturnValue = 0;

    // 1. Create SALES_RETURN transactions for each item
    payload.returnedItems.forEach(item => {
      if (item.quantity > 0) {
        const convertedSalePrice = convertToUSD(item.salePrice);
        totalReturnValue += convertedSalePrice * item.quantity;
        const product = products.find(p => p.id === item.productId);
        
        const returnRef = doc(collection(db, 'transactions'));
        batch.set(returnRef, {
          shopId: payload.shopId,
          customerId: payload.customerId,
          invoiceId: payload.invoiceId,
          productId: item.productId,
          type: TransactionType.SALES_RETURN,
          description: `Return: ${product?.name || 'N/A'}. Reason: ${payload.reason}`,
          amount: convertedSalePrice,
          quantity: item.quantity,
          date: returnDate,
          locationId: payload.locationId,
        });
      }
    });

    // 2. If it's a cash refund, create an EXPENSE transaction
    if (payload.refundMethod === 'cash' && payload.paymentAccountId && totalReturnValue > 0) {
        const expenseRef = doc(collection(db, 'transactions'));
        batch.set(expenseRef, {
            shopId: payload.shopId,
            type: TransactionType.EXPENSE,
            // We don't have a specific expense account for this, so description is key.
            expenseAccountId: 'CASH_REFUND', 
            description: `Cash refund for return on invoice #${payload.invoiceId}`,
            amount: totalReturnValue,
            paymentAccountId: payload.paymentAccountId,
            date: returnDate,
        });
    }

    await batch.commit();
  };

  const addExpense = async (expense: { shopId: string, expenseAccountId: string, description: string, amount: number, date: Date, paymentAccountId: string }) => {
    const convertedAmount = convertToUSD(expense.amount);
    await addDoc(collection(db, 'transactions'), {
      shopId: expense.shopId,
      type: TransactionType.EXPENSE,
      expenseAccountId: expense.expenseAccountId,
      description: expense.description,
      amount: convertedAmount,
      paymentAccountId: expense.paymentAccountId,
      date: Timestamp.fromDate(expense.date),
    });
  };
  
  const addExport = async (data: AddExportPayload) => {
    const batch = writeBatch(db);
    const now = Timestamp.now();
    
    // 1. Create Shipment
    const shipmentRef = doc(collection(db, 'shipments'));
    const newShipment: Omit<Shipment, 'id' | 'date'> = {
      shopId: data.shopId,
      status: ShipmentStatus.PENDING,
      items: data.items.map(item => ({
        productId: item.productId,
        expectedQuantity: item.quantity,
        landedCost: item.landedCost,
      })),
      freightCost: data.freightForwarder.amount,
      clearingCost: data.clearingAgent.amount,
      customExpenseCost: data.customExpense.amount,
      expectedDuty: data.expectedDuty,
    };
    batch.set(shipmentRef, {
        ...newShipment,
        date: now,
    });

    // 2. Record HO expenses
    const HEAD_OFFICE_ACCOUNT_ID = 'HO'; 

    if (data.freightForwarder.amount > 0 && data.freightForwarder.id) {
      const ff = freightForwarders.find(f => f.id === data.freightForwarder.id);
      const expenseRef = doc(collection(db, 'transactions'));
      batch.set(expenseRef, {
        shopId: HEAD_OFFICE_ACCOUNT_ID,
        type: TransactionType.EXPENSE,
        description: `Freight Forwarder: ${ff?.name || 'N/A'} for Shipment #${shipmentRef.id}`,
        amount: data.freightForwarder.amount,
        date: now,
      });
    }
    
    if (data.clearingAgent.amount > 0 && data.clearingAgent.id) {
      const ca = clearingAgents.find(c => c.id === data.clearingAgent.id);
      const expenseRef = doc(collection(db, 'transactions'));
      batch.set(expenseRef, {
        shopId: HEAD_OFFICE_ACCOUNT_ID,
        type: TransactionType.EXPENSE,
        description: `Clearing Agent: ${ca?.name || 'N/A'} for Shipment #${shipmentRef.id}`,
        amount: data.clearingAgent.amount,
        date: now,
      });
    }

    if (data.customExpense.amount > 0 && data.customExpense.typeId) {
      const cet = customExpenseTypes.find(c => c.id === data.customExpense.typeId);
      const expenseRef = doc(collection(db, 'transactions'));
      batch.set(expenseRef, {
        shopId: HEAD_OFFICE_ACCOUNT_ID,
        type: TransactionType.EXPENSE,
        description: `Custom Expense: ${cet?.name || 'N/A'} for Shipment #${shipmentRef.id}`,
        amount: data.customExpense.amount,
        date: now,
      });
    }

    await batch.commit();
  };

  const receiveShipment = async (payload: { shipmentId: string; receivedItems: { productId: string; quantity: number }[]; locationId: string }) => {
    const shipment = shipments.find(s => s.id === payload.shipmentId);
    if (!shipment) return;

    const batch = writeBatch(db);
    const now = Timestamp.now();

    // 1. Create IMPORT transactions for the shop
    const totalOverheads = shipment.freightCost + shipment.clearingCost + shipment.customExpenseCost + shipment.expectedDuty;
    const totalReceivedQuantity = payload.receivedItems.reduce((sum, item) => sum + item.quantity, 0);
    const averageOverheadPerItem = totalReceivedQuantity > 0 ? totalOverheads / totalReceivedQuantity : 0;

    payload.receivedItems.forEach(receivedItem => {
        if (receivedItem.quantity > 0) {
            const originalItem = shipment.items.find(i => i.productId === receivedItem.productId);
            const product = products.find(p => p.id === receivedItem.productId);
            if (originalItem && product) {
                const finalUnitCost = originalItem.landedCost + averageOverheadPerItem;
                const importRef = doc(collection(db, 'transactions'));
                batch.set(importRef, {
                    shopId: shipment.shopId,
                    productId: receivedItem.productId,
                    type: TransactionType.IMPORT,
                    description: `Stock from HO - Shipment #${shipment.id}`,
                    amount: finalUnitCost,
                    quantity: receivedItem.quantity,
                    date: now,
                    locationId: payload.locationId,
                });
            }
        }
    });

    // 2. Update the shipment status and received quantities
    const shipmentRef = doc(db, 'shipments', payload.shipmentId);
    const updatedItems = shipment.items.map(item => ({
        ...item,
        receivedQuantity: payload.receivedItems.find(ri => ri.productId === item.productId)?.quantity || 0,
    }));
    batch.update(shipmentRef, { 
        status: ShipmentStatus.RECEIVED, 
        items: updatedItems
    });

    await batch.commit();
  };

  const addClearingAgent = async (agent: Omit<ClearingAgent, 'id'>) => {
    await addDoc(collection(db, 'clearingAgents'), agent);
  };

  const addFreightForwarder = async (forwarder: Omit<FreightForwarder, 'id'>) => {
    await addDoc(collection(db, 'freightForwarders'), forwarder);
  };

  const addCustomExpenseType = async (expenseType: Omit<CustomExpenseType, 'id'>) => {
    await addDoc(collection(db, 'customExpenseTypes'), expenseType);
  };

  const addExpenseAccount = async (account: Omit<ExpenseAccount, 'id'>) => {
    await addDoc(collection(db, 'expenseAccounts'), account);
  };

  const updateCurrency = async (currency: Pick<Currency, 'id' | 'rate'>) => {
    const currencyRef = doc(db, 'currencies', currency.id);
    await updateDoc(currencyRef, { rate: currency.rate });
  };
  
  const addShopAccount = async (account: Omit<ShopAccount, 'id' | 'openingBalance'> & { openingBalance: number }) => {
    const convertedBalance = convertToUSD(account.openingBalance);
    
    const accountData: any = {
      shopId: account.shopId,
      accountName: account.accountName,
      accountType: account.accountType,
      openingBalance: convertedBalance,
    };

    if (account.accountType === AccountType.BANK) {
      accountData.bankName = account.bankName;
      accountData.accountNumber = account.accountNumber;
    }

    await addDoc(collection(db, 'shopAccounts'), accountData);
  };

  const addWarehouse = async (warehouse: Omit<Warehouse, 'id'>) => {
    await addDoc(collection(db, 'warehouses'), warehouse);
  };

  const transferStock = async (payload: TransferStockPayload) => {
    const batch = writeBatch(db);
    const transferDate = Timestamp.fromDate(payload.date);
    const product = products.find(p => p.id === payload.productId);
    
    const fromLocationName = warehouses.find(w => w.id === payload.fromLocationId)?.name || shops.find(s => s.id === payload.fromLocationId)?.name || 'Unknown';
    const toLocationName = warehouses.find(w => w.id === payload.toLocationId)?.name || shops.find(s => s.id === payload.toLocationId)?.name || 'Unknown';

    // Out transaction
    const outRef = doc(collection(db, 'transactions'));
    batch.set(outRef, {
        shopId: payload.shopId,
        productId: payload.productId,
        type: TransactionType.STOCK_TRANSFER_OUT,
        description: `Transfer to ${toLocationName}: ${payload.quantity} x ${product?.name || ''}`,
        amount: 0, // No financial impact
        quantity: payload.quantity,
        date: transferDate,
        locationId: payload.fromLocationId,
    });

    // In transaction
    const inRef = doc(collection(db, 'transactions'));
    batch.set(inRef, {
        shopId: payload.shopId,
        productId: payload.productId,
        type: TransactionType.STOCK_TRANSFER_IN,
        description: `Transfer from ${fromLocationName}: ${payload.quantity} x ${product?.name || ''}`,
        amount: 0, // No financial impact
        quantity: payload.quantity,
        date: transferDate,
        locationId: payload.toLocationId,
    });

    await batch.commit();
  };

  const addAsset = async (payload: AddAssetPayload) => {
    const batch = writeBatch(db);
    
    const convertedCost = convertToUSD(payload.purchaseCost);

    // 1. Create the Asset document
    const assetRef = doc(collection(db, 'assets'));
    batch.set(assetRef, {
        shopId: payload.shopId,
        name: payload.name,
        category: payload.category,
        purchaseDate: Timestamp.fromDate(payload.purchaseDate),
        purchaseCost: convertedCost,
        paymentAccountId: payload.paymentAccountId,
        expenseAccountId: payload.expenseAccountId,
        status: AssetStatus.ACTIVE,
    });

    // 2. Create the corresponding Expense transaction
    const expenseRef = doc(collection(db, 'transactions'));
    const expenseAccount = expenseAccounts.find(ea => ea.id === payload.expenseAccountId);
    batch.set(expenseRef, {
        shopId: payload.shopId,
        type: TransactionType.EXPENSE,
        expenseAccountId: payload.expenseAccountId,
        description: `Asset Purchase: ${payload.name} (${expenseAccount?.name || 'Asset'})`,
        amount: convertedCost,
        paymentAccountId: payload.paymentAccountId,
        date: Timestamp.fromDate(payload.purchaseDate),
    });

    await batch.commit();
  };


  const value = {
    role, setRole, shopId, setShopId, shops, addShop, updateShop, deleteShop, products, addProduct,
    users, addUser, transactions, recordSale, recordPayment, recordSalesReturn, addExpense, addExport, customers, addCustomer,
    clearingAgents, addClearingAgent, freightForwarders, addFreightForwarder,
    customExpenseTypes, addCustomExpenseType, expenseAccounts, addExpenseAccount,
    shipments, receiveShipment, currencies, updateCurrency, currentShopCurrency, formatCurrency,
    shopAccounts, addShopAccount, getStockLevel, alerts, logAlert,
    warehouses, addWarehouse, transferStock, assets, addAsset,
    recordAdvance, getAdvanceBalance,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};