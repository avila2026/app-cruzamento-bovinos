import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Animal } from '../../types';
import { Plus, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

const AnimalList: React.FC<{ defaultFilter?: 'M' | 'F' }> = ({ defaultFilter }) => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnimals();
  }, [defaultFilter]);

  const fetchAnimals = async () => {
    try {
      setLoading(true);
      let query = supabase.from('animal').select('*').neq('is_observed', true).order('nome_exibicao');
      
      if (defaultFilter) {
        query = query.eq('sexo', defaultFilter);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error('Error fetching animals:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-100">
          {defaultFilter === 'M' ? 'Touros' : defaultFilter === 'F' ? 'Fêmeas' : 'Animais'}
        </h1>
        <Link to="/animais/novo" className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20">
          <Plus size={20} />
          <span>Novo Cadastro</span>
        </Link>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, registro ou brinco..." 
            className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
          />
        </div>
        <button className="flex items-center space-x-2 bg-neutral-900/50 border border-neutral-800 hover:bg-neutral-800 text-gray-300 px-4 py-2 rounded-lg transition-colors">
          <Filter size={20} />
          <span>Filtros</span>
        </button>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Carregando dados...</div>
        ) : animals.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-neutral-500">
            <p className="text-lg mb-2">Nenhum animal cadastrado ainda.</p>
            <p className="text-sm">Clique em "Novo Cadastro" para adicionar.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-400 border-b border-neutral-800">
              <tr>
                <th className="px-6 py-4 font-medium">Nome</th>
                <th className="px-6 py-4 font-medium">Registro</th>
                <th className="px-6 py-4 font-medium">Raça/Categoria</th>
                <th className="px-6 py-4 font-medium">Idade/Nasc.</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {animals.map((animal) => (
                <tr key={animal.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-200">{animal.nome_exibicao}</td>
                  <td className="px-6 py-4">{animal.registro_composto}</td>
                  <td className="px-6 py-4">{animal.raca} {animal.categoria_registral}</td>
                  <td className="px-6 py-4">{new Date(animal.data_nascimento).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <Link to={`/animais/${animal.id}`} className="text-emerald-400 hover:text-emerald-300 font-medium">Ver Ficha</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AnimalList;
