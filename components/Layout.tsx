
import React, { ReactNode, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, title }) => {
  const { role, shops, shopId, logout, currentUser, switchShop } = useAppContext();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
  };
  
  const currentShopName = shops.find(s => s.id === shopId)?.name;
  const allowedShops = currentUser?.allowedShopIds?.length || 0;

  // Logic for Admin "Return to HO" button
  const isAdminViewingShop = role === UserRole.HEAD_OFFICE && shopId !== null;

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800 overflow-hidden">
      
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden transition-opacity duration-300" 
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      {/* Mobile: Fixed drawer. Desktop: Relative column. */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 md:shadow-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {sidebar}
      </div>

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        
        {/* Admin Impersonation Banner */}
        {isAdminViewingShop && (
            <div className="bg-orange-600 text-white px-4 py-2 text-sm font-bold flex justify-between items-center shadow-inner">
                <span>Viewing Shop Dashboard as Administrator</span>
                <button 
                    onClick={() => switchShop(null)} 
                    className="bg-white text-orange-600 px-3 py-1 rounded hover:bg-gray-100 transition-colors text-xs uppercase tracking-wide"
                >
                    Return to Head Office
                </button>
            </div>
        )}

        <header className="flex justify-between items-center p-4 bg-white shadow-md z-10 relative">
          <div className="flex items-center overflow-hidden">
            {/* Hamburger Menu Button (Mobile Only) */}
            <button 
              className="mr-3 md:hidden text-gray-600 hover:text-gray-900 focus:outline-none p-1 rounded-md hover:bg-gray-100"
              onClick={() => setSidebarOpen(!isSidebarOpen)}
              aria-label="Toggle Menu"
            >
               <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
               </svg>
            </button>

            <div className="truncate">
              <h1 className="text-lg md:text-2xl font-bold text-gray-800 truncate leading-tight">{title}</h1>
              <p className="text-xs md:text-sm text-gray-500 truncate">
                {role === UserRole.HEAD_OFFICE && !shopId ? 'Head Office View' : `Shop View: ${currentShopName || '...'}`}
                {currentUser && <span className="ml-2 font-semibold text-primary">({currentUser.name})</span>}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
              {/* Switch Shop Button for Multi-Shop Operators */}
              {role === UserRole.SHOP_OPERATOR && allowedShops > 1 && (
                  <button 
                    onClick={() => switchShop(null)} // Setting shopId to null triggers the selection screen
                    className="text-gray-600 hover:text-primary font-medium text-sm flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Switch Shop
                  </button>
              )}

              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 rounded-lg transition duration-300 text-sm md:text-base whitespace-nowrap flex-shrink-0 flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 md:h-5 md:w-5 mr-1 md:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
          </div>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
