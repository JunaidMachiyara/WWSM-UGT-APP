
import React, { ReactNode, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, title }) => {
  const { role, setRole, setShopId, shops, shopId } = useAppContext();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    setRole(null);
    setShopId(null);
  };
  
  const currentShopName = role === UserRole.SHOP_OPERATOR ? shops.find(s => s.id === shopId)?.name : 'All Shops';

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
                {role === UserRole.HEAD_OFFICE ? 'Head Office View' : `Shop View: ${currentShopName || '...'}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-3 md:py-2 md:px-4 rounded-lg transition duration-300 text-sm md:text-base whitespace-nowrap ml-2 flex-shrink-0"
          >
            Logout
          </button>
        </header>
        
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
