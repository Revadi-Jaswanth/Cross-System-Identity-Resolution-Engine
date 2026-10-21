import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const DashboardLayout = () => {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setMobileSidebarOpen(!mobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors">
      <Sidebar isOpen={mobileSidebarOpen} toggle={closeMobileSidebar} />
      
      {/* Mobile backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-25 lg:hidden"
          onClick={closeMobileSidebar}
        />
      )}

      <div className="flex flex-col lg:pl-64 min-h-screen">
        <Navbar toggleSidebar={toggleMobileSidebar} />
        
        <main className="grow pt-20 px-6 md:px-8 max-w-7xl w-full mx-auto flex flex-col">
          <div className="grow animate-fade-in">
            <Outlet />
          </div>
          <Footer />
        </main>
      </div>
    </div>
  );
};
export default DashboardLayout;
