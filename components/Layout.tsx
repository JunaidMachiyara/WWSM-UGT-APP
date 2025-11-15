
import React, { ReactNode } from 'react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  title: string;
}

const Layout: React.FC<LayoutProps> = ({ sidebar, children, title }) => {
  const { role, setRole, setShopId, shops, shopId } = useAppContext();

  const handleLogout = () => {
    setRole(null);
    setShopId(null);
  };
  
  const currentShopName = role === UserRole.SHOP_OPERATOR ? shops.find(s => s.id === shopId)?.name : 'All Shops';

  return (
    <div className="flex h-screen bg-gray-100 text-gray-800">
      {sidebar}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex justify-between items-center p-4 bg-white shadow-md">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{title}</h1>
            <p className="text-sm text-gray-500">{role === UserRole.HEAD_OFFICE ? 'Head Office View' : `Shop View: ${currentShopName}`}</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
          >
            Logout
          </button>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;