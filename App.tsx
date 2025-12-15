
import React, { useState } from 'react';
import { useAppContext } from './context/AppContext';
import HODashboard from './screens/HeadOffice/HODashboard';
import ShopDashboard from './screens/Shop/ShopDashboard';
import { UserRole } from './types';

const App: React.FC = () => {
  const { role, login, shopId, currentUser, shops, switchShop, connectionError, isDemoMode } = useAppContext();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const success = await login(username, password);
      if (!success) {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // -- VIEW ROUTING LOGIC --

  // 1. Not Logged In
  if (!role) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-2xl">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-primary mb-2">WWSM_UGT</h1>
            <h2 className="text-xl font-medium text-gray-600">Retail & Export Management</h2>
            <p className="mt-2 text-sm text-gray-500">Please sign in to access your dashboard</p>
          </div>
          
          {connectionError && (
             <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.22 3.008-1.742 3.008H4.42c-1.522 0-2.492-1.674-1.742-3.008l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-800 font-bold">System Warning</p>
                  <p className="text-sm text-orange-700">{connectionError}</p>
                  <p className="text-xs mt-1 font-semibold">You may proceed to login with default credentials.</p>
                </div>
              </div>
            </div>
          )}

          {error && !connectionError && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  style={{ backgroundColor: '#ffffff', color: '#000000' }} 
                  className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  style={{ backgroundColor: '#ffffff', color: '#000000' }}
                  className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-primary focus:border-primary focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-primary hover:bg-primary-dark'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition duration-150 ease-in-out`}
              >
                {loading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <svg className="h-5 w-5 text-blue-300 group-hover:text-blue-200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
                {loading ? 'Signing in...' : (isDemoMode ? 'Login (Demo Mode)' : 'Sign in')}
              </button>
            </div>
          </form>
          
          <div className="text-center text-xs text-gray-400 mt-4">
             <p>Default Admin: admin / admin123</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Admin Mode - Main Dashboard
  // If role is HO and no specific shopId is selected (Admin is not "impersonating" a shop)
  if (role === UserRole.HEAD_OFFICE && !shopId) {
      return <HODashboard />;
  }

  // 3. Shop Mode - Selection Screen
  // If role is OPERATOR (or Admin acting as user eventually?) and NO shop selected yet.
  if (role === UserRole.SHOP_OPERATOR && !shopId) {
      const allowed = currentUser?.allowedShopIds || [];
      const availableShops = shops.filter(s => allowed.includes(s.id) && s.isActive);

      return (
          <div className="min-h-screen bg-gray-100 p-10">
              <div className="max-w-4xl mx-auto">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                          <h1 className="text-3xl font-bold text-gray-800">Select a Shop</h1>
                          <p className="text-gray-600">Welcome back, {currentUser?.name}. Please choose a location.</p>
                      </div>
                      <button onClick={() => window.location.reload()} className="text-sm text-gray-500 underline">Logout</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {availableShops.map(shop => (
                          <div 
                              key={shop.id} 
                              onClick={() => switchShop(shop.id)}
                              className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer border-2 border-transparent hover:border-primary transform hover:-translate-y-1"
                          >
                              <div className="flex justify-between items-start mb-4">
                                  <div className="bg-blue-100 p-3 rounded-full text-primary">
                                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                      </svg>
                                  </div>
                                  <span className="text-xs font-bold bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                              </div>
                              <h3 className="text-xl font-bold text-gray-800">{shop.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">{shop.district}, {shop.country}</p>
                              <p className="text-xs text-gray-400 mt-4">Currency: {shop.currencyCode}</p>
                          </div>
                      ))}
                      
                      {availableShops.length === 0 && (
                          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow">
                              <p className="text-gray-500">You have not been assigned to any active shops. Please contact Head Office.</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )
  }

  // 4. Shop Dashboard
  // This renders if (HO + shopId) OR (OP + shopId)
  // Admin "impersonating" a shop view triggers this.
  return <ShopDashboard />;
};

export default App;
