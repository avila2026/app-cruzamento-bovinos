import React, { useState } from 'react';
import { Animal, SexoAnimal } from '../../types';
import { Save, ArrowLeft, ImagePlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AnimalForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Animal>>({
    sexo: 'M',
    status: 'ativo',
    genotipado: false,
    raca: 'Nelore',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // To be implemented: API call to Supabase to insert/update the animal
    console.log('Submitting:', formData);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-neutral-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <h1 className="text-3xl font-bold text-gray-100">
          Novo Cadastro
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl p-8 shadow-xl space-y-8">
        
        {/* Basic Info */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Nome de Exibição *</label>
              <input required name="nome_exibicao" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Sexo *</label>
              <select name="sexo" value={formData.sexo} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50">
                <option value="M">Macho (Touro)</option>
                <option value="F">Fêmea (Matriz/Novilha)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Data de Nascimento *</label>
              <input required type="date" name="data_nascimento" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Status</label>
              <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50">
                <option value="ativo">Ativo</option>
                <option value="vendido">Vendido</option>
                <option value="morto">Morto</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>
        </section>

        {/* Registry */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Registro Genealógico</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Raça *</label>
              <input required name="raca" value={formData.raca} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Categoria Registral *</label>
              <input required name="categoria_registral" placeholder="Ex: PO, LA..." onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Registro Único / Composto *</label>
              <input required name="registro_composto" placeholder="Ex: GRIB9435" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Série</label>
              <input name="serie_registro" placeholder="Ex: GRI" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">RGN</label>
              <input name="rgn" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">RGD</label>
              <input name="rgd" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>
        </section>

        {/* Origin */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Origem e Genética</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Criador</label>
              <input name="criador" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Proprietário / Fazenda</label>
              <input name="fazenda" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            {formData.sexo === 'M' ? (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Central de Sêmen</label>
                <input name="central_semen" placeholder="Ex: Alta Genetics" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-neutral-400 mb-1">Categoria Reprodutiva</label>
                <input name="categoria_reprodutiva" placeholder="Ex: Doadora" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            )}
            <div className="flex items-center space-x-3 pt-6">
              <input type="checkbox" name="genotipado" id="genotipado" checked={formData.genotipado} onChange={handleChange} className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/50" />
              <label htmlFor="genotipado" className="text-sm font-medium text-gray-300">Animal Genotipado?</label>
            </div>
          </div>
        </section>

        {/* Pedigree Simple text for MVP */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Genealogia Básica</h2>
          <p className="text-sm text-neutral-500 mb-4">No MVP, adicione o nome/registro do pai e da mãe. Relacionamentos complexos virão no roadmap.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Pai</label>
              <input name="pedigree_pai" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Mãe</label>
              <input name="pedigree_mae" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-400 mb-1">Avô Materno</label>
              <input name="pedigree_avo_mat" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit" 
            disabled={loading}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
          >
            <Save size={20} />
            <span>{loading ? 'Salvando...' : 'Salvar Cadastro'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default AnimalForm;
