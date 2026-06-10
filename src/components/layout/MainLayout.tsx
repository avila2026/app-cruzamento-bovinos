import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen bg-neutral-900 text-gray-100 overflow-hidden font-sans">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 bg-neutral-900/50 backdrop-blur-sm relative">
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none -z-10" />
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;
