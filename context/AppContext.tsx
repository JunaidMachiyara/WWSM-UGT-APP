
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  where, 
  deleteDoc, 
  getDocs,
  writeBatch,
  setDoc,
  orderBy,
  Timestamp,
  serverTimestamp,
  DocumentData,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { 
  User, 
  UserRole, 
  Shop, 
  Product, 
  Transaction, 
  TransactionType, 
  Shipment, 
  ShipmentStatus, 
  Alert, 
  AlertType, 
  Customer, 
  Warehouse, 
  ShopAccount, 
  Currency, 
  ClearingAgent, 
  FreightForwarder, 
  CustomExpenseType, 
  ExpenseAccount, 
  Asset, 
  AssetStatus,
  ReceivedExtraItem
} from '../types';

export interface SaleItem {
    productId: string;
    quantity: number;
    salePrice: number;
    locationId?: string;
}

export interface OpeningStockPayload {
    shopId: string;
    productId: string;
    locationId: string;
    quantity: number;
    unitCost: number;
    date: Date;
    notes: string;
}

export interface BulkCustomerPayload {
    name: string;
    phone: string;
    reference: string;
    openingBalance: number; // in local currency
}

interface AppContextType {
  currentUser: User | null;
  role: UserRole | null;
  shopId: string | null;
  shops: Shop[];
  products: Product[];
  transactions: Transaction[];
  shipments: Shipment[];
  alerts: Alert[];
  customers: Customer[];
  warehouses: Warehouse[];
  shopAccounts: ShopAccount[];
  currencies: Currency[];
  clearingAgents: ClearingAgent[];
  freightForwarders: FreightForwarder[];
  customExpenseTypes: CustomExpenseType[];
  expenseAccounts: ExpenseAccount[];
  assets: Asset[];
  currentShopCurrency: Currency;
  isDemoMode: boolean;
  connectionError: string | null;
  login: (username: string, password?: string) => Promise<boolean>;
  logout: () => void;
  switchShop: (id: string | null) => void;
  addShop: (shop: Omit<Shop, 'id'>) => Promise<void>;
  updateShop: (id: string, data: Partial<Shop>) => Promise<void>;
  deleteShop: (id: string) => Promise<void>;
  addCustomer: (customer: Omit<Customer, 'id'> & { openingBalance?: number }) => Promise<void>;
  updateCustomer: (id: string, data: Partial<Customer> & { openingBalance?: number }) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;
  updateSupplierOpeningBalance: (openingBalance: number) => Promise<void>;
  bulkAddCustomers: (payload: BulkCustomerPayload[]) => Promise<void>;
  addProduct: (product: Omit<Product, 'id'>) => Promise<void>;
  bulkSyncProducts: (products: (Partial<Product> & { name: string })[]) => Promise<void>;
  addShopAccount: (account: Omit<ShopAccount, 'id'>) => Promise<void>;
  updateShopAccount: (id: string, data: Partial<ShopAccount>) => Promise<void>;
  updateCurrency: (data: { id: string, rate: number }) => Promise<void>;
  addCurrency: (currency: Currency) => Promise<void>;
  recordSale: (payload: any) => Promise<void>;
  recordPayment: (payload: any) => Promise<void>;
  addExpense: (payload: any) => Promise<void>;
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => Promise<void>;
  transferStock: (payload: any) => Promise<void>;
  addAsset: (asset: Omit<Asset, 'id' | 'status'>) => Promise<void>;
  recordAdvance: (payload: any) => Promise<void>;
  receiveShipment: (payload: any) => Promise<void>;
  addExport: (payload: any) => Promise<void>;
  updateShipmentCosts: (payload: any) => Promise<void>;
  recordPaymentVoucher: (payload: any) => Promise<void>;
  recordSalesReturn: (payload: any) => Promise<void>;
  addOpeningStock: (payload: OpeningStockPayload) => Promise<void>;
  bulkAddOpeningStock: (payload: OpeningStockPayload[]) => Promise<void>;
  markAlertAsRead: (id: string) => Promise<void>;
  logAlert: (alert: Omit<Alert, 'id' | 'isRead'>) => Promise<void>;
  resetSystem: () => Promise<void>;
  clearTransactions: () => Promise<void>;
  getStockLevel: (productId: string, locationId?: string) => number;
  getAdvanceBalance: (customerId: string) => number;
  formatCurrency: (amountInBase: number) => string;
  users: User[];
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  addClearingAgent: (agent: Omit<ClearingAgent, 'id'>) => Promise<void>;
  addFreightForwarder: (ff: Omit<FreightForwarder, 'id'>) => Promise<void>;
  addCustomExpenseType: (type: Omit<CustomExpenseType, 'id'>) => Promise<void>;
  addExpenseAccount: (account: Omit<ExpenseAccount, 'id'>) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [shopAccounts, setShopAccounts] = useState<ShopAccount[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [clearingAgents, setClearingAgents] = useState<ClearingAgent[]>([]);
  const [freightForwarders, setFreightForwarders] = useState<FreightForwarder[]>([]);
  const [customExpenseTypes, setCustomExpenseTypes] = useState<CustomExpenseType[]>([]);
  const [expenseAccounts, setExpenseAccounts] = useState<ExpenseAccount[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isDemoMode] = useState(false);
  const [connectionError] = useState<string | null>(null);

  useEffect(() => {
    const unsubShops = onSnapshot(collection(db, 'shops'), (s) => setShops(s.docs.map(d => ({ id: d.id, ...d.data() } as Shop))));
    const unsubProds = onSnapshot(collection(db, 'products'), (s) => setProducts(s.docs.map(d => ({ id: d.id, ...d.data() } as Product))));
    const unsubTrans = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (s) => setTransactions(s.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date ? (d.data().date as any).toDate() : new Date() } as Transaction))));
    
    const unsubShip = onSnapshot(collection(db, 'shipments'), (s) => setShipments(s.docs.map(d => {
        const data = d.data();
        return { 
            ...data,
            id: d.id, 
            date: data.date ? (data.date as any).toDate() : new Date() 
        } as Shipment;
    })));

    const unsubAlerts = onSnapshot(collection(db, 'alerts'), (s) => setAlerts(s.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().date ? (d.data().date as any).toDate() : new Date() } as Alert))));
    const unsubCust = onSnapshot(collection(db, 'customers'), (s) => setCustomers(s.docs.map(d => ({ id: d.id, ...d.data() } as Customer))));
    const unsubWH = onSnapshot(collection(db, 'warehouses'), (s) => setWarehouses(s.docs.map(d => ({ id: d.id, ...d.data() } as Warehouse))));
    const unsubAcc = onSnapshot(collection(db, 'accounts'), (s) => setShopAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as ShopAccount))));
    const unsubCurr = onSnapshot(collection(db, 'currencies'), (s) => setCurrencies(s.docs.map(d => ({ id: d.id, ...d.data() } as Currency))));
    const unsubClearing = onSnapshot(collection(db, 'clearingAgents'), (s) => setClearingAgents(s.docs.map(d => ({ id: d.id, ...d.data() } as ClearingAgent))));
    const unsubFreight = onSnapshot(collection(db, 'freightForwarders'), (s) => setFreightForwarders(s.docs.map(d => ({ id: d.id, ...d.data() } as FreightForwarder))));
    const unsubCustomExp = onSnapshot(collection(db, 'customExpenseTypes'), (s) => setCustomExpenseTypes(s.docs.map(d => ({ id: d.id, ...d.data() } as CustomExpenseType))));
    const unsubExpAcc = onSnapshot(collection(db, 'expenseAccounts'), (s) => setExpenseAccounts(s.docs.map(d => ({ id: d.id, ...d.data() } as ExpenseAccount))));
    const unsubAssets = onSnapshot(collection(db, 'assets'), (s) => setAssets(s.docs.map(d => ({ id: d.id, ...d.data(), purchaseDate: d.data().purchaseDate ? (d.data().purchaseDate as any).toDate() : new Date() } as Asset))));
    const unsubUsers = onSnapshot(collection(db, 'users'), (s) => setUsers(s.docs.map(d => ({ id: d.id, ...d.data() } as User))));

    return () => {
      unsubShops(); unsubProds(); unsubTrans(); unsubShip(); unsubAlerts(); unsubCust(); 
      unsubWH(); unsubAcc(); unsubCurr(); unsubClearing(); unsubFreight(); unsubCustomExp();
      unsubExpAcc(); unsubAssets(); unsubUsers();
    };
  }, []);

  const currentShopCurrency = useMemo(() => {
    const shop = shops.find(s => s.id === shopId);
    if (!shop) return { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };
    return currencies.find(c => c.id === shop.currencyCode) || { id: 'USD', name: 'US Dollar', symbol: '$', rate: 1 };
  }, [shopId, shops, currencies]);

  const login = useCallback(async (username: string, password?: string) => {
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      setCurrentUser(user);
      setRole(user.role);
      setShopId(user.shopId || null);
      return true;
    }
    if (username === 'admin' && password === 'admin123') {
        const adminUser: User = { id: 'admin-id', name: 'System Admin', username: 'admin', role: UserRole.HEAD_OFFICE };
        setCurrentUser(adminUser);
        setRole(UserRole.HEAD_OFFICE);
        setShopId(null);
        return true;
    }
    return false;
  }, [users]);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setRole(null);
    setShopId(null);
  }, []);

  const switchShop = useCallback((id: string | null) => {
    setShopId(id);
  }, []);

  const addShop = async (shop: Omit<Shop, 'id'>) => { await addDoc(collection(db, 'shops'), shop); };
  const updateShop = async (id: string, data: Partial<Shop>) => { await updateDoc(doc(db, 'shops', id), data); };
  const deleteShop = async (id: string) => { await deleteDoc(doc(db, 'shops', id)); };
  
  const addCustomer = async (payload: Omit<Customer, 'id'> & { openingBalance?: number }) => { 
      const { openingBalance, ...customerData } = payload;
      const ref = await addDoc(collection(db, 'customers'), customerData); 
      
      if (openingBalance && openingBalance !== 0) {
          const rate = currentShopCurrency.rate || 1;
          const amountBase = Math.abs(openingBalance) / rate;
          const type = openingBalance > 0 ? TransactionType.CREDIT_SALE : TransactionType.CUSTOMER_ADVANCE;
          
          await addDoc(collection(db, 'transactions'), {
              shopId,
              customerId: ref.id,
              invoiceId: 'OPENING-BAL',
              type: type,
              description: 'Opening Balance Setup',
              amount: amountBase,
              quantity: openingBalance > 0 ? 1 : undefined,
              date: serverTimestamp(),
          });
      }
  };

  const updateCustomer = async (id: string, data: Partial<Customer> & { openingBalance?: number }) => {
      const { openingBalance, ...customerData } = data;
      
      // 1. Update Profile
      await updateDoc(doc(db, 'customers', id), customerData);

      // 2. Adjust Ledger if Opening Balance was provided
      if (openingBalance !== undefined) {
          const q = query(
              collection(db, 'transactions'), 
              where('customerId', '==', id), 
              where('invoiceId', '==', 'OPENING-BAL')
          );
          const snap = await getDocs(q);
          const rate = currentShopCurrency.rate || 1;
          const amountBase = Math.abs(openingBalance) / rate;
          const type = openingBalance > 0 ? TransactionType.CREDIT_SALE : TransactionType.CUSTOMER_ADVANCE;

          if (!snap.empty) {
              const transDoc = snap.docs[0];
              if (openingBalance === 0) {
                  await deleteDoc(transDoc.ref);
              } else {
                  await updateDoc(transDoc.ref, {
                      amount: amountBase,
                      type: type,
                      shopId: shopId // ensure it stays assigned correctly
                  });
              }
          } else if (openingBalance !== 0) {
              await addDoc(collection(db, 'transactions'), {
                  shopId,
                  customerId: id,
                  invoiceId: 'OPENING-BAL',
                  type: type,
                  description: 'Opening Balance Correction',
                  amount: amountBase,
                  date: serverTimestamp(),
              });
          }
      }
  };

  const deleteCustomer = async (id: string) => { 
      // 1. Delete the profile
      await deleteDoc(doc(db, 'customers', id)); 
      
      // 2. Clear out the specific migration entries (OPENING-BAL)
      const q = query(
          collection(db, 'transactions'), 
          where('customerId', '==', id), 
          where('invoiceId', '==', 'OPENING-BAL')
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach(d => batch.delete(d.ref));
          await batch.commit();
      }
      // Note: We leave historical sales/receipts intact for audit trailing, 
      // but the customer entity being gone means they won't appear in lists.
  };

  const updateSupplierOpeningBalance = async (openingBalance: number) => {
    if (!shopId) return;

    const q = query(
        collection(db, 'transactions'), 
        where('shopId', '==', shopId), 
        where('invoiceId', '==', 'HO-OPENING-BAL')
    );
    const snap = await getDocs(q);
    const rate = currentShopCurrency.rate || 1;
    const amountBase = openingBalance / rate; // We assume positive is debt to HO (Bill)

    if (!snap.empty) {
        const transDoc = snap.docs[0];
        if (openingBalance === 0) {
            await deleteDoc(transDoc.ref);
        } else {
            await updateDoc(transDoc.ref, {
                amount: amountBase,
                type: TransactionType.IMPORT,
                quantity: 1,
                description: 'Supplier Opening Balance'
            });
        }
    } else if (openingBalance !== 0) {
        await addDoc(collection(db, 'transactions'), {
            shopId,
            invoiceId: 'HO-OPENING-BAL',
            type: TransactionType.IMPORT,
            description: 'Supplier Opening Balance',
            amount: amountBase,
            quantity: 1,
            date: serverTimestamp(),
        });
    }
  };

  const bulkAddCustomers = async (payload: BulkCustomerPayload[]) => {
      const batch = writeBatch(db);
      const rate = Number(currentShopCurrency.rate) || 1;
      
      payload.forEach(item => {
          const customerRef = doc(collection(db, 'customers'));
          const customerId = customerRef.id;
          
          batch.set(customerRef, {
              name: item.name,
              phone: item.phone,
              reference: item.reference,
              shopId: shopId
          });

          if (item.openingBalance !== 0) {
              const transRef = doc(collection(db, 'transactions'));
              const amountBase = Math.abs(item.openingBalance) / rate;
              const type = item.openingBalance > 0 ? TransactionType.CREDIT_SALE : TransactionType.CUSTOMER_ADVANCE;
              
              batch.set(transRef, {
                  shopId,
                  customerId,
                  invoiceId: 'OPENING-BAL',
                  type: type,
                  description: 'Opening Balance Migration (CSV Import)',
                  amount: amountBase,
                  quantity: item.openingBalance > 0 ? 1 : undefined,
                  date: serverTimestamp(),
              });
          }
      });
      await batch.commit();
  };

  const addProduct = async (product: Omit<Product, 'id'>) => { await addDoc(collection(db, 'products'), product); };
  
  const bulkSyncProducts = async (productsData: (Partial<Product> & { name: string })[]) => {
      const batch = writeBatch(db);
      
      productsData.forEach(p => {
          let targetDoc;
          
          if (p.id) {
              targetDoc = doc(db, 'products', p.id);
          } else {
              const existing = products.find(prod => prod.name.toLowerCase() === p.name.toLowerCase());
              if (existing) {
                  targetDoc = doc(db, 'products', existing.id);
              } else {
                  targetDoc = doc(collection(db, 'products'));
              }
          }

          const cleanProduct = { ...p };
          delete cleanProduct.id; 
          
          batch.set(targetDoc, cleanProduct, { merge: true });
      });
      
      await batch.commit();
  };

  const addShopAccount = async (account: Omit<ShopAccount, 'id'>) => { 
    try {
        const safeAccount = {
            ...account,
            openingBalance: Number(account.openingBalance) || 0
        };
        await addDoc(collection(db, 'accounts'), safeAccount); 
    } catch (e) {
        console.error('AppContext: Error in addShopAccount:', e);
        throw e;
    }
  };

  const updateShopAccount = async (id: string, data: Partial<ShopAccount>) => {
      await updateDoc(doc(db, 'accounts', id), data);
  };

  const updateCurrency = async (data: { id: string, rate: number }) => { 
      const curr = currencies.find(c => c.id === data.id);
      if (curr) await updateDoc(doc(db, 'currencies', curr.id), { rate: Number(data.rate) || 1 }); 
  };
  const addCurrency = async (currency: Currency) => { 
      await setDoc(doc(db, 'currencies', currency.id), { ...currency, rate: Number(currency.rate) || 1 }); 
  };

  const getStockLevel = useCallback((productId: string, locationId?: string) => {
    let stock = 0;
    transactions.forEach(t => {
      if (t.productId === productId && (!locationId || t.locationId === locationId || (!t.locationId && locationId === t.shopId))) {
        if (t.type === TransactionType.IMPORT || t.type === TransactionType.STOCK_TRANSFER_IN || t.type === TransactionType.SALES_RETURN || t.type === TransactionType.OPENING_STOCK) {
          stock += (t.quantity || 0);
        } else if (t.type === TransactionType.CASH_SALE || t.type === TransactionType.CREDIT_SALE || t.type === TransactionType.STOCK_TRANSFER_OUT) {
          stock -= (t.quantity || 0);
        }
      }
    });
    return stock;
  }, [transactions]);

  const getAdvanceBalance = useCallback((customerId: string) => {
    let balance = 0;
    transactions.forEach(t => {
        if (t.customerId === customerId) {
            if (t.type === TransactionType.CUSTOMER_ADVANCE) balance += (Number(t.amount) || 0);
            if (t.type === TransactionType.ADVANCE_USAGE) balance -= (Number(t.amount) || 0);
        }
    });
    return balance;
  }, [transactions]);

  const formatCurrency = useCallback((amountInBase: number) => {
    const rate = Number(currentShopCurrency.rate) || 1;
    const amount = amountInBase * rate;
    return `${currentShopCurrency.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }, [currentShopCurrency]);

  const logAlert = async (alert: Omit<Alert, 'id' | 'isRead'>) => {
      await addDoc(collection(db, 'alerts'), { ...alert, isRead: false, date: serverTimestamp() });
  };

  const markAlertAsRead = async (id: string) => {
      await updateDoc(doc(db, 'alerts', id), { isRead: true });
  };

  const recordSale = async (payload: any) => {
      const batch = writeBatch(db);
      const { shopId, customerId, invoiceNumber, items, cashPaid, advanceApplied, date, paymentAccountId, manualReference } = payload;
      const rate = Number(currentShopCurrency.rate) || 1;
      const shop = shops.find(s => s.id === shopId);
      const totalInvoiceValueLocal = items.reduce((s: number, i: SaleItem) => s + (i.salePrice * i.quantity), 0);
      const isCreditSale = (Number(cashPaid) + Number(advanceApplied)) < (totalInvoiceValueLocal - 0.01);
      const saleType = isCreditSale ? TransactionType.CREDIT_SALE : TransactionType.CASH_SALE;

      items.forEach((item: SaleItem) => {
          const product = products.find(p => p.id === item.productId);
          const unitPriceBase = (Number(item.salePrice) || 0) / rate;
          if (product && item.salePrice < product.minSalePrice * rate) {
              const alertRef = doc(collection(db, 'alerts'));
              batch.set(alertRef, {
                  shopId: 'HO',
                  type: AlertType.PRICE_VIOLATION,
                  message: `Price Violation: ${product.name} sold for ${currentShopCurrency.symbol}${item.salePrice} (Min: ${currentShopCurrency.symbol}${(product.minSalePrice * rate).toFixed(2)}) at ${shop?.name}`,
                  context: { invoiceId: invoiceNumber, productId: item.productId, shopId, shopName: shop?.name },
                  date: Timestamp.fromDate(date),
                  isRead: false
              });
          }
          const saleRef = doc(collection(db, 'transactions'));
          batch.set(saleRef, {
              shopId, customerId, invoiceId: invoiceNumber, externalReference: manualReference, productId: item.productId,
              type: saleType, description: `Sale of ${product?.name}`, amount: unitPriceBase, quantity: Number(item.quantity) || 0,
              date: Timestamp.fromDate(date), locationId: item.locationId || shopId
          });
      });

      if (Number(cashPaid) > 0) {
          const receiptRef = doc(collection(db, 'transactions'));
          batch.set(receiptRef, {
              shopId, customerId, invoiceId: invoiceNumber, type: TransactionType.SALES_RECEIPT, description: `Payment for Invoice #${invoiceNumber}`,
              amount: (Number(cashPaid) || 0) / rate, date: Timestamp.fromDate(date), paymentAccountId
          });
      }
      if (Number(advanceApplied) > 0) {
          const advanceRef = doc(collection(db, 'transactions'));
          batch.set(advanceRef, {
              shopId, customerId, invoiceId: invoiceNumber, type: TransactionType.ADVANCE_USAGE, description: `Advance applied to Invoice #${invoiceNumber}`,
              amount: (Number(advanceApplied) || 0) / rate, date: Timestamp.fromDate(date)
          });
      }
      await batch.commit();
  };

  const recordPayment = async (payload: any) => {
      const rate = Number(currentShopCurrency.rate) || 1;
      await addDoc(collection(db, 'transactions'), {
          shopId: payload.shopId, customerId: payload.customerId, type: TransactionType.SALES_RECEIPT,
          description: payload.notes || 'Customer Payment', amount: (Number(payload.amount) || 0) / rate,
          date: Timestamp.fromDate(payload.date), paymentAccountId: payload.paymentAccountId
      });
  };

  const addExpense = async (payload: any) => {
      const rate = Number(currentShopCurrency.rate) || 1;
      await addDoc(collection(db, 'transactions'), {
          shopId: payload.shopId, expenseAccountId: payload.expenseAccountId, type: TransactionType.EXPENSE,
          description: payload.description || 'Shop Expense', amount: (Number(payload.amount) || 0) / rate,
          date: Timestamp.fromDate(payload.date), paymentAccountId: payload.paymentAccountId
      });
  };

  const addWarehouse = async (warehouse: Omit<Warehouse, 'id'>) => { await addDoc(collection(db, 'warehouses'), warehouse); };

  const transferStock = async (payload: any) => {
      const batch = writeBatch(db);
      const outRef = doc(collection(db, 'transactions'));
      batch.set(outRef, {
          shopId: payload.shopId, productId: payload.productId, type: TransactionType.STOCK_TRANSFER_OUT,
          description: `Transfer to ${warehouses.find(w => w.id === payload.toLocationId)?.name || 'Other Location'}`,
          quantity: Number(payload.quantity) || 0, amount: 0, date: Timestamp.fromDate(payload.date), locationId: payload.fromLocationId
      });
      const inRef = doc(collection(db, 'transactions'));
      batch.set(inRef, {
          shopId: payload.shopId, productId: payload.productId, type: TransactionType.STOCK_TRANSFER_IN,
          description: `Transfer from ${warehouses.find(w => w.id === payload.fromLocationId)?.name || 'Other Location'}`,
          quantity: Number(payload.quantity) || 0, amount: 0, date: Timestamp.fromDate(payload.date), locationId: payload.toLocationId
      });
      await batch.commit();
  };

  const addAsset = async (asset: Omit<Asset, 'id' | 'status'>) => {
      const rate = Number(currentShopCurrency.rate) || 1;
      await addDoc(collection(db, 'assets'), { ...asset, status: AssetStatus.ACTIVE });
      await addDoc(collection(db, 'transactions'), {
          shopId: asset.shopId, expenseAccountId: asset.expenseAccountId, type: TransactionType.EXPENSE,
          description: `Asset Purchase: ${asset.name}`, amount: (Number(asset.purchaseCost) || 0) / rate,
          date: Timestamp.fromDate(asset.purchaseDate), paymentAccountId: asset.paymentAccountId
      });
  };

  const recordAdvance = async (payload: any) => {
    const rate = Number(currentShopCurrency.rate) || 1;
    await addDoc(collection(db, 'transactions'), {
        shopId: payload.shopId, customerId: payload.customerId, type: TransactionType.CUSTOMER_ADVANCE,
        description: 'Customer Advance Payment', amount: (Number(payload.amount) || 0) / rate,
        date: Timestamp.fromDate(payload.date), paymentAccountId: payload.paymentAccountId,
        advanceForItems: payload.advanceForItems, receiptNumber: `ADV-${Math.floor(Math.random()*10000)}`
    });
  };

  const receiveShipment = async (payload: { shipmentId: string, receivedItems: any[], locationId: string, extraItems?: ReceivedExtraItem[] }) => {
      const shipment = shipments.find(s => s.id === payload.shipmentId);
      if (!shipment) throw new Error("Shipment ID not found.");
      const batch = writeBatch(db);
      const shipmentRef = doc(db, 'shipments', payload.shipmentId);
      const rate = Number(currentShopCurrency.rate) || 1;
      batch.set(shipmentRef, { 
          status: ShipmentStatus.RECEIVED,
          items: shipment.items.map(item => {
              const received = payload.receivedItems.find((ri: any) => ri.productId === item.productId);
              return { ...item, receivedQuantity: Number(received?.quantity) || 0 };
          }),
          extraItemsReceived: payload.extraItems || []
      }, { merge: true });
      payload.receivedItems.forEach((ri: any) => {
          const item = shipment.items.find(si => si.productId === ri.productId);
          if (item && Number(ri.quantity) > 0) {
              const transRef = doc(collection(db, 'transactions'));
              batch.set(transRef, { shopId: shipment.shopId, productId: ri.productId, type: TransactionType.IMPORT, description: `Import: Shipment #${shipment.id}`, quantity: Number(ri.quantity) || 0, amount: Number(item.landedCost) || 0, date: serverTimestamp(), locationId: payload.locationId });
          }
      });
      if (payload.extraItems) {
        payload.extraItems.forEach((ei) => {
            const transRef = doc(collection(db, 'transactions'));
            batch.set(transRef, { shopId: shipment.shopId, productId: ei.productId, type: TransactionType.IMPORT, description: `Import (Extra) - Shipment #${shipment.id}`, quantity: Number(ei.quantity) || 0, amount: (Number(ei.unitCost) || 0) / rate, date: serverTimestamp(), locationId: payload.locationId });
        });
      }
      await batch.commit();
  };

  const addExport = async (payload: any) => {
      await setDoc(doc(db, 'shipments', payload.shipmentId), {
          shopId: payload.shopId, date: serverTimestamp(), status: ShipmentStatus.PENDING, items: payload.items,
          freightCost: Number(payload.freightCost) || 0, freightForwarderId: payload.freightForwarder?.id || '',
          clearingCost: Number(payload.clearingCost) || 0, clearingAgentId: payload.clearingAgent?.id || '',
          customExpenseCost: Number(payload.customExpenseCost) || 0, customExpenseTypeId: payload.customExpense?.typeId || '',
          expectedDuty: Number(payload.expectedDuty) || 0
      });
  };

  const updateShipmentCosts = async (payload: any) => {
      await updateDoc(doc(db, 'shipments', payload.shipmentId), { freightCost: Number(payload.freightCost) || 0, clearingCost: Number(payload.clearingCost) || 0, customExpenseCost: Number(payload.customExpenseCost) || 0, expectedDuty: Number(payload.expectedDuty) || 0 });
  };

  const recordPaymentVoucher = async (payload: any) => {
      const rate = Number(currentShopCurrency.rate) || 1;
      await addDoc(collection(db, 'transactions'), {
          shopId: payload.shopId, type: TransactionType.EXPENSE, description: payload.notes || `Payment: ${payload.beneficiaryName || payload.category}`,
          amount: (Number(payload.amount) || 0) / (payload.shopId === 'HO' ? 1 : rate), date: Timestamp.fromDate(payload.date),
          paymentAccountId: payload.paymentAccountId, expenseAccountId: payload.referenceId, expenseCategory: payload.category
      });
  };

  const recordSalesReturn = async (payload: any) => {
      const batch = writeBatch(db);
      const rate = Number(currentShopCurrency.rate) || 1;
      payload.returnedItems.forEach((item: any) => {
          const retRef = doc(collection(db, 'transactions'));
          batch.set(retRef, { shopId: payload.shopId, customerId: payload.customerId, invoiceId: payload.invoiceId, productId: item.productId, type: TransactionType.SALES_RETURN, description: `Return: ${payload.reason}`, amount: (Number(item.salePrice) || 0) / rate, quantity: Number(item.quantity) || 0, date: Timestamp.fromDate(payload.date), locationId: payload.locationId });
      });
      if (payload.refundMethod === 'cash') {
          const refundRef = doc(collection(db, 'transactions'));
          const totalRefund = payload.returnedItems.reduce((s: number, i: any) => s + ((Number(i.quantity) || 0) * (Number(i.salePrice) || 0)), 0);
          batch.set(refundRef, { shopId: payload.shopId, type: TransactionType.EXPENSE, description: `Refund: #${payload.invoiceId}`, amount: totalRefund / rate, date: Timestamp.fromDate(payload.date), paymentAccountId: payload.paymentAccountId });
      }
      await batch.commit();
  };

  const addOpeningStock = async (payload: OpeningStockPayload) => {
      await addDoc(collection(db, 'transactions'), { shopId: payload.shopId, productId: payload.productId, type: TransactionType.OPENING_STOCK, description: payload.notes, quantity: Number(payload.quantity) || 0, amount: (Number(payload.unitCost) || 0) / (Number(currentShopCurrency.rate) || 1), date: Timestamp.fromDate(payload.date), locationId: payload.locationId });
  };

  const bulkAddOpeningStock = async (payload: OpeningStockPayload[]) => {
      const batch = writeBatch(db);
      const rate = Number(currentShopCurrency.rate) || 1;
      payload.forEach(item => {
          const ref = doc(collection(db, 'transactions'));
          batch.set(ref, { shopId: item.shopId, productId: item.productId, type: TransactionType.OPENING_STOCK, description: item.notes, quantity: Number(item.quantity) || 0, amount: (Number(item.unitCost) || 0) / rate, date: Timestamp.fromDate(item.date), locationId: item.locationId });
      });
      await batch.commit();
  };

  // Helper for deleting entire collections in chunks (Firestore limit is 500 per batch)
  const chunkedDelete = async (collectionName: string) => {
      console.log(`[CORE] PURGING: Fetching [${collectionName}]...`);
      try {
          const q = await getDocs(collection(db, collectionName));
          const docs = q.docs;
          
          if (docs.length === 0) {
              console.log(`[CORE] PURGING: [${collectionName}] is already empty.`);
              return Promise.resolve();
          }

          console.log(`[CORE] PURGING: Deleting ${docs.length} docs from [${collectionName}]...`);
          for (let i = 0; i < docs.length; i += 500) {
              const batch = writeBatch(db);
              docs.slice(i, i + 500).forEach(d => batch.delete(d.ref));
              await batch.commit();
              console.log(`[CORE] PURGING: Batch ${Math.floor(i/500) + 1} of [${collectionName}] complete.`);
          }
          return Promise.resolve();
      } catch (e) {
          console.error(`[CORE] CHUNKED_DELETE_ERROR: [${collectionName}]`, e);
          throw e;
      }
  };

  const resetSystem = async () => {
      console.log("[CORE] FACTORY_RESET: Initiating...");
      const colls = ['shops', 'products', 'transactions', 'shipments', 'alerts', 'customers', 'warehouses', 'accounts', 'currencies', 'clearingAgents', 'freightForwarders', 'customExpenseTypes', 'expenseAccounts', 'assets', 'users'];
      for (const c of colls) {
          try {
              await chunkedDelete(c);
          } catch (e: any) {
              console.error(`[CORE] FACTORY_RESET_ERR: Failed to clear [${c}]: ${e.message}`);
          }
      }
      console.log("[CORE] FACTORY_RESET: Success. System Clean.");
      window.location.reload();
  };

  const clearTransactions = async () => {
      console.log("[CORE] LEDGER_RESET: Starting...");
      try {
          // Purge all history
          await chunkedDelete('transactions');
          await chunkedDelete('shipments');
          await chunkedDelete('alerts');
          
          // Reset opening balances to zero
          console.log("[CORE] LEDGER_RESET: Zeroing accounts...");
          const q4 = await getDocs(collection(db, 'accounts'));
          const accountDocs = q4.docs;
          if (accountDocs.length > 0) {
              for (let i = 0; i < accountDocs.length; i += 500) {
                  const batch = writeBatch(db);
                  accountDocs.slice(i, i + 500).forEach(d => {
                      batch.update(d.ref, { openingBalance: 0 });
                  });
                  await batch.commit();
              }
          }
          console.log("[CORE] LEDGER_RESET: Done.");
          return Promise.resolve();
      } catch (e) {
          console.error("[CORE] LEDGER_RESET_ERROR:", e);
          throw e;
      }
  };

  const addUser = async (user: Omit<User, 'id'>) => { await addDoc(collection(db, 'users'), user); };
  const updateUser = async (id: string, data: Partial<User>) => { await updateDoc(doc(db, 'users', id), data); };
  const deleteUser = async (id: string) => { await deleteDoc(doc(db, 'users', id)); };
  const addClearingAgent = async (agent: Omit<ClearingAgent, 'id'>) => { await addDoc(collection(db, 'clearingAgents'), agent); };
  const addFreightForwarder = async (ff: Omit<FreightForwarder, 'id'>) => { await addDoc(collection(db, 'freightForwarders'), ff); };
  const addCustomExpenseType = async (type: Omit<CustomExpenseType, 'id'>) => { await addDoc(collection(db, 'customExpenseTypes'), type); };
  const addExpenseAccount = async (account: Omit<ExpenseAccount, 'id'>) => { await addDoc(collection(db, 'expenseAccounts'), account); };

  const value = {
    currentUser, role, shopId, shops, products, transactions, shipments, alerts, customers, warehouses,
    shopAccounts, currencies, clearingAgents, freightForwarders, customExpenseTypes, expenseAccounts, assets,
    currentShopCurrency, isDemoMode, connectionError, login, logout, switchShop, addShop, updateShop, deleteShop,
    addCustomer, updateCustomer, deleteCustomer, updateSupplierOpeningBalance, bulkAddCustomers, addProduct, bulkSyncProducts, addShopAccount, updateShopAccount, updateCurrency, addCurrency, recordSale, recordPayment,
    addExpense, addWarehouse, transferStock, addAsset, recordAdvance, receiveShipment, addExport, updateShipmentCosts,
    recordPaymentVoucher, recordSalesReturn, addOpeningStock, bulkAddOpeningStock, markAlertAsRead, logAlert,
    resetSystem, clearTransactions, getStockLevel, getAdvanceBalance, formatCurrency, users, addUser, updateUser,
    deleteUser, addClearingAgent, addFreightForwarder, addCustomExpenseType, addExpenseAccount
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useAppContext must be used within an AppProvider');
  return context;
};
