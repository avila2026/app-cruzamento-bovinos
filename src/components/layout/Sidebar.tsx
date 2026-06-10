import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Beef, Dna, Settings, FileText } from 'lucide-react';

const Sidebar: React.FC = () => {
  const links = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Animais', path: '/animais', icon: <Beef size={20} /> },
    { name: 'Cruzamentos', path: '/simulador', icon: <Dna size={20} /> },
    { name: 'Relatórios', path: '/relatorios', icon: <FileText size={20} /> },
    { name: 'Configurações', path: '/config', icon: <Settings size={20} /> },
  ];

  return (
    <aside className="w-64 bg-neutral-950/80 backdrop-blur-md border-r border-neutral-800 flex flex-col transition-all duration-300">
      <div className="p-6 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Dna className="text-neutral-950" size={24} strokeWidth={2.5} />
        </div>
        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">
          CattleGen
        </h1>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.name}
            to={link.path}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
                  : 'text-neutral-400 hover:text-gray-100 hover:bg-neutral-800/50 border border-transparent'
              }`
            }
          >
            <span className="group-hover:scale-110 transition-transform duration-200">
              {link.icon}
            </span>
            <span className="font-medium tracking-wide">{link.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-neutral-800">
        <div className="px-4 py-3 rounded-lg bg-neutral-900/50 border border-neutral-800 flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center text-sm font-bold">
            AA
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-gray-200">Agro Ávila</span>
            <span className="text-xs text-neutral-500">Fazenda Modelo</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
