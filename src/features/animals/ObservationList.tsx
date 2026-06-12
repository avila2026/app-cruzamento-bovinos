import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import type { Animal } from '../../types';
import { Search, Trash2, ArrowUpCircle, FileSpreadsheet, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const ObservationList: React.FC = () => {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchObservedAnimals = useCallback(async (abortController?: AbortController) => {
    try {
      await Promise.resolve();
      if (abortController?.signal.aborted) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('animal')
        .select('*')
        .eq('is_observed', true)
        .order('nome_exibicao');
      if (abortController?.signal.aborted) return;
      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      if (abortController?.signal.aborted) return;
      console.error('Error fetching observed animals:', error);
    } finally {
      if (!abortController?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchObservedAnimals(controller);
    return () => {
      controller.abort();
    };
  }, [fetchObservedAnimals]);

  const handlePromote = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('animal')
        .update({ is_observed: false })
        .eq('id', id);

      if (error) throw error;
      toast.success(`${name} promovido para o rebanho ativo!`);
      // Remover da lista local
      setAnimals(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Erro ao promover animal:', error);
      toast.error('Não foi possível promover o animal.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza de que deseja excluir ${name} da lista de observação?`)) return;

    try {
      const { error } = await supabase
        .from('animal')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success(`${name} removido com sucesso.`);
      setAnimals(prev => prev.filter(a => a.id !== id));
    } catch (error) {
      console.error('Erro ao excluir animal:', error);
      toast.error('Não foi possível excluir o animal.');
    }
  };

  const filteredAnimals = animals.filter(a => 
    a.nome_exibicao.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.registro_composto || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.rgd || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-100">Animais em Observação</h1>
          <p className="text-sm text-neutral-500">
            Gerencie animais importados que você está avaliando para futuros acasalamentos.
          </p>
        </div>
        <Link 
          to="/importar-catalogo" 
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-900/20 text-sm font-medium"
        >
          <FileSpreadsheet size={16} />
          <span>Importar Catálogo</span>
        </Link>
      </div>

      <div className="flex space-x-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome, registro ou RGD..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-neutral-900/50 border border-neutral-800 rounded-lg pl-10 pr-4 py-2 text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all text-sm"
            title="Buscar animais"
          />
        </div>
      </div>

      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden shadow-xl backdrop-blur-sm">
        {loading ? (
          <div className="p-8 text-center text-neutral-500">Carregando dados...</div>
        ) : filteredAnimals.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-neutral-500 space-y-3">
            <p className="text-lg">Nenhum animal em observação encontrado.</p>
            <p className="text-sm text-center max-w-md">
              Você pode importar animais em lote utilizando um arquivo CSV através do botão <strong>Importar Catálogo</strong> acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-neutral-950/50 text-xs uppercase text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-6 py-4 font-medium">Nome</th>
                  <th className="px-6 py-4 font-medium">Sexo</th>
                  <th className="px-6 py-4 font-medium">Registro</th>
                  <th className="px-6 py-4 font-medium">Raça/Categoria</th>
                  <th className="px-6 py-4 font-medium">Nascimento</th>
                  <th className="px-6 py-4 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 bg-neutral-900/10">
                {filteredAnimals.map((animal) => (
                  <tr key={animal.id} className="hover:bg-neutral-800/20 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-200">
                      <div className="flex items-center gap-2">
                        <span>{animal.nome_exibicao}</span>
                        <Link 
                          to={`/animais/${animal.id}`} 
                          className="text-neutral-500 hover:text-emerald-400 transition-colors"
                          title="Ver Ficha do Animal"
                        >
                          <ExternalLink size={14} />
                        </Link>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {animal.sexo === 'M' ? (
                        <span className="text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded text-xs border border-blue-500/10">Macho</span>
                      ) : (
                        <span className="text-pink-400 bg-pink-500/5 px-2 py-0.5 rounded text-xs border border-pink-500/10">Fêmea</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-neutral-400">{animal.registro_composto}</td>
                    <td className="px-6 py-4">{animal.raca} {animal.categoria_registral}</td>
                    <td className="px-6 py-4 text-xs">{new Date(animal.data_nascimento).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right flex justify-end gap-3">
                      <button
                        onClick={() => handlePromote(animal.id, animal.nome_exibicao)}
                        className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium text-xs hover:bg-emerald-500/5 px-2 py-1 rounded border border-emerald-500/10 transition-colors"
                        title="Promover para o Rebanho Ativo"
                      >
                        <ArrowUpCircle size={14} />
                        <span>Promover</span>
                      </button>
                      <button
                        onClick={() => handleDelete(animal.id, animal.nome_exibicao)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/5 p-1 rounded border border-red-500/10 transition-colors"
                        title="Excluir Animal"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ObservationList;
