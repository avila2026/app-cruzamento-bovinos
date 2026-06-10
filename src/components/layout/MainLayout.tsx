import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, Dna } from 'lucide-react';
import Sidebar from './Sidebar';

const MainLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-neutral-900 text-gray-100 overflow-hidden font-sans">
      {/* Backdrop no mobile quando o menu está aberto */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra superior — apenas no mobile */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-300 hover:text-white p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-800 transition-colors"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center">
              <Dna className="text-neutral-950" size={16} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-gray-100">CattleGen</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-neutral-900/50 backdrop-blur-sm relative">
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-emerald-900/20 to-transparent pointer-events-none -z-10" />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
