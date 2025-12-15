
import React, { ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

interface LayoutProps {
  sidebar: ReactNode; // This now represents the Top Navigation Bar
  children: ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, title }) => {
  const { role, shopId, switchShop } = useAppContext();

  // Logic for Admin "Return to HO" button
  const isAdminViewingShop = role === UserRole.HEAD_OFFICE && shopId !== null;
  
  // Logic for Head Office Dashboard styling (not viewing a shop)
  const isHODashboard = role === UserRole.HEAD_OFFICE && !shopId;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col font-sans text-gray-900">
      
      {/* 1. Top Navigation Bar */}
      <div className="z-30 w-full flex-shrink-0 shadow-md bg-blue-50 sticky top-0">
        {sidebar}
      </div>

      {/* 2. Admin Impersonation Banner (If applicable) */}
      {isAdminViewingShop && (
          <div className="bg-orange-600 text-white px-4 py-2 text-sm font-bold flex justify-between items-center shadow-inner flex-shrink-0">
              <span>Viewing Shop Dashboard as Administrator</span>
              <button 
                  onClick={() => switchShop(null)} 
                  className="bg-white text-orange-600 px-3 py-1 rounded hover:bg-gray-100 transition-colors text-xs uppercase tracking-wide"
              >
                  Return to Head Office
              </button>
          </div>
      )}

      {/* 3. Page Title Header */}
      <header className={`${isHODashboard ? 'bg-orange-600 border-orange-600' : 'bg-white border-gray-200'} border-b px-6 py-4 shadow-sm flex-shrink-0 transition-colors duration-300`}>
        <h1 className={`text-2xl font-bold leading-7 ${isHODashboard ? 'text-white' : 'text-gray-800'} sm:truncate`}>
          {title}
        </h1>
      </header>

      {/* 4. Main Content Wrapper */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-4 md:p-8">
        <div className="max-w-[1920px] mx-auto w-full">
          {children}
        </div>
      </main>

    </div>
  );
};

export default Layout;
