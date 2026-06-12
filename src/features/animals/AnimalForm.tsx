import React, { useEffect, useState } from 'react';
import type { Animal } from '../../types';
import { supabase } from '../../lib/supabase';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import ImageUpload from '../../components/common/ImageUpload';
import { toast } from 'sonner';

function AnimalForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEdit);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [pedigree, setPedigree] = useState({ pai: '', mae: '', avo_mat: '' });
  const [formData, setFormData] = useState<Partial<Animal>>({
    nome_exibicao: '',
    sexo: 'M',
    raca: 'Nelore',
    rgd: '',
    rgn: '',
    registro_composto: '',
    data_nascimento: '',
    status: 'ativo',
    genotipado: false,
    consanguinidade_pct: undefined,
    central_semen: '',
    criador: '',
    fazenda: '',
  });


  useEffect(() => {
    const loadAnimal = async (animalId: string) => {
      try {
        setLoadingData(true);
        const [animalRes, relRes, photoRes] = await Promise.all([
          supabase.from('animal').select('*').eq('id', animalId).single(),
          supabase.from('animal_relation').select('*').eq('animal_id', animalId),
          supabase
            .from('file_asset')
            .select('*')
            .eq('animal_id', animalId)
            .eq('tipo', 'FOTO')
            .order('created_at', { ascending: false })
            .limit(1),
        ]);

        if (animalRes.error) throw animalRes.error;
        const a = animalRes.data as Animal;
        setFormData({
          ...a,
          // input[type=date] espera YYYY-MM-DD
          data_nascimento: a.data_nascimento ? a.data_nascimento.split('T')[0] : '',
        });

        const rel = relRes.data || [];
        setPedigree({
          pai: rel.find((r) => r.relation_type === 'PAI')?.related_name || '',
          mae: rel.find((r) => r.relation_type === 'MAE')?.related_name || '',
          avo_mat: rel.find((r) => r.relation_type === 'AVO_MATERNO')?.related_name || '',
        });

        setPhotoUrl(photoRes.data?.[0]?.arquivo_url || null);
      } catch (err) {
        const error = err as Error;
        console.error(error);
        toast.error('Erro ao carregar animal: ' + error.message);
      } finally {
        setLoadingData(false);
      }
    };

    if (isEdit && id) loadAnimal(id);
  }, [id, isEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: val }));
  };

  /** Substitui as relações de genealogia do animal pelos valores atuais do formulário. */
  const syncRelations = async (animalId: string) => {
    await supabase.from('animal_relation').delete().eq('animal_id', animalId);
    const relations = [
      { relation_type: 'PAI', related_name: pedigree.pai },
      { relation_type: 'MAE', related_name: pedigree.mae },
      { relation_type: 'AVO_MATERNO', related_name: pedigree.avo_mat },
    ]
      .filter((r) => r.related_name.trim())
      .map((r) => ({ animal_id: animalId, ...r }));
    if (relations.length) {
      const { error } = await supabase.from('animal_relation').insert(relations);
      if (error) throw error;
    }
  };

  /** Garante que a foto atual seja a única foto registrada do animal. */
  const syncPhoto = async (animalId: string) => {
    if (isEdit) {
      await supabase.from('file_asset').delete().eq('animal_id', animalId).eq('tipo', 'FOTO');
    }
    if (photoUrl) {
      const { error } = await supabase.from('file_asset').insert([
        { animal_id: animalId, tipo: 'FOTO', arquivo_url: photoUrl, origem: 'upload' },
      ]);
      if (error) throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);

      const payload = {
        ...formData,
        data_nascimento: formData.data_nascimento || new Date().toISOString().split('T')[0],
        raca: formData.raca || 'Nelore',
        categoria_registral: formData.categoria_registral || 'PO',
        registro_composto: formData.registro_composto || '',
        consanguinidade_pct:
          formData.consanguinidade_pct === undefined ||
          (formData.consanguinidade_pct as unknown as string) === ''
            ? null
            : Number(formData.consanguinidade_pct),
      };

      let animalId: string;

      if (isEdit && id) {
        const { error } = await supabase.from('animal').update(payload).eq('id', id);
        if (error) throw error;
        animalId = id;
      } else {
        // Pega a primeira fazenda cadastrada (A Fazenda Modelo que criamos no SQL)
        const { data: farms } = await supabase.from('farm').select('id').limit(1);
        const farmId = farms?.[0]?.id;
        if (!farmId) {
          toast.error('Nenhuma fazenda encontrada. Execute o init_db.sql no banco de dados.');
          return;
        }
        const { data: inserted, error } = await supabase
          .from('animal')
          .insert([{ ...payload, farm_id: farmId }])
          .select('id')
          .single();
        if (error) throw error;
        animalId = inserted.id;
      }

      await syncRelations(animalId);
      await syncPhoto(animalId);

      toast.success(isEdit ? 'Animal atualizado com sucesso!' : 'Animal salvo com sucesso!');
      navigate(`/animais/${animalId}`);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error('Erro ao salvar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return <div className="p-8 text-center text-neutral-500">Carregando dados do animal...</div>;
  }

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
          {isEdit ? 'Editar Animal' : 'Novo Cadastro'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl p-8 shadow-xl space-y-8">
        
        {/* Foto */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Foto do Animal</h2>
          <ImageUpload
            value={photoUrl}
            onUploaded={setPhotoUrl}
            onRemoved={() => setPhotoUrl(null)}
          />
        </section>

        {/* Basic Info */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Informações Básicas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="nome_exibicao" className="block text-sm font-medium text-neutral-400 mb-1">Nome de Exibição *</label>
              <input id="nome_exibicao" required name="nome_exibicao" value={formData.nome_exibicao || ''} placeholder="Ex: Touro de Ouro" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="sexo" className="block text-sm font-medium text-neutral-400 mb-1">Sexo *</label>
              <select id="sexo" title="Sexo do Animal" name="sexo" value={formData.sexo} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50">
                <option value="M">Macho (Touro)</option>
                <option value="F">Fêmea (Matriz/Novilha)</option>
              </select>
            </div>
            <div>
              <label htmlFor="data_nascimento" className="block text-sm font-medium text-neutral-400 mb-1">Data de Nascimento *</label>
              <input id="data_nascimento" required type="date" name="data_nascimento" value={formData.data_nascimento || ''} title="Data de Nascimento" placeholder="Selecione a data" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-neutral-400 mb-1">Status</label>
              <select id="status" title="Status do Animal" name="status" value={formData.status} onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50">
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
              <label htmlFor="raca" className="block text-sm font-medium text-neutral-400 mb-1">Raça *</label>
              <input id="raca" required name="raca" value={formData.raca} placeholder="Ex: Nelore" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="categoria_registral" className="block text-sm font-medium text-neutral-400 mb-1">Categoria Registral *</label>
              <input id="categoria_registral" required name="categoria_registral" value={formData.categoria_registral || ''} placeholder="Ex: PO, LA..." onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="registro_composto" className="block text-sm font-medium text-neutral-400 mb-1">Registro Único / Composto *</label>
              <input id="registro_composto" required name="registro_composto" value={formData.registro_composto || ''} placeholder="Ex: GRIB9435" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="serie_registro" className="block text-sm font-medium text-neutral-400 mb-1">Série</label>
              <input id="serie_registro" name="serie_registro" value={formData.serie_registro || ''} placeholder="Ex: GRI" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="rgn" className="block text-sm font-medium text-neutral-400 mb-1">RGN</label>
              <input id="rgn" name="rgn" value={formData.rgn || ''} placeholder="RGN" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="rgd" className="block text-sm font-medium text-neutral-400 mb-1">RGD</label>
              <input id="rgd" name="rgd" value={formData.rgd || ''} placeholder="RGD" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
          </div>
        </section>

        {/* Origin */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Origem e Genética</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="criador" className="block text-sm font-medium text-neutral-400 mb-1">Criador</label>
              <input id="criador" name="criador" value={formData.criador || ''} placeholder="Criador" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="fazenda" className="block text-sm font-medium text-neutral-400 mb-1">Proprietário / Fazenda</label>
              <input id="fazenda" name="fazenda" value={formData.fazenda || ''} placeholder="Fazenda" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            {formData.sexo === 'M' ? (
              <div>
                <label htmlFor="central_semen" className="block text-sm font-medium text-neutral-400 mb-1">Central de Sêmen</label>
                <input id="central_semen" name="central_semen" value={formData.central_semen || ''} placeholder="Ex: Alta Genetics" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            ) : (
              <div>
                <label htmlFor="categoria_reprodutiva" className="block text-sm font-medium text-neutral-400 mb-1">Categoria Reprodutiva</label>
                <input id="categoria_reprodutiva" name="categoria_reprodutiva" value={formData.categoria_reprodutiva || ''} placeholder="Ex: Doadora" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
              </div>
            )}
            <div>
              <label htmlFor="proprietario" className="block text-sm font-medium text-neutral-400 mb-1">Proprietário</label>
              <input id="proprietario" name="proprietario" value={formData.proprietario || ''} placeholder="Proprietário" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="municipio_uf" className="block text-sm font-medium text-neutral-400 mb-1">Município / UF</label>
              <input id="municipio_uf" name="municipio_uf" value={formData.municipio_uf || ''} placeholder="Ex: Uberaba/MG" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="consanguinidade_pct" className="block text-sm font-medium text-neutral-400 mb-1">Consanguinidade (%)</label>
              <input id="consanguinidade_pct" type="number" step="any" min="0" max="100" name="consanguinidade_pct" value={formData.consanguinidade_pct ?? ''} placeholder="Consanguinidade (%)" onChange={handleChange} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div className="flex items-center space-x-3 pt-6">
              <input type="checkbox" name="genotipado" id="genotipado" checked={!!formData.genotipado} onChange={handleChange} className="w-5 h-5 rounded border-neutral-700 bg-neutral-900 text-emerald-500 focus:ring-emerald-500/50" />
              <label htmlFor="genotipado" className="text-sm font-medium text-gray-300">Animal Genotipado?</label>
            </div>
          </div>
        </section>

        {/* Observações */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Observações</h2>
          <textarea name="observacoes" value={formData.observacoes || ''} onChange={handleChange} rows={3} placeholder="Anotações livres sobre o animal..." className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
        </section>

        {/* Pedigree Simple text for MVP */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">Genealogia Básica</h2>
          <p className="text-sm text-neutral-500 mb-4">No MVP, adicione o nome/registro do pai e da mãe. Relacionamentos complexos virão no roadmap.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="pedigree_pai" className="block text-sm font-medium text-neutral-400 mb-1">Pai</label>
              <input id="pedigree_pai" name="pedigree_pai" value={pedigree.pai} placeholder="Nome/registro do pai" onChange={(e) => setPedigree((p) => ({ ...p, pai: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="pedigree_mae" className="block text-sm font-medium text-neutral-400 mb-1">Mãe</label>
              <input id="pedigree_mae" name="pedigree_mae" value={pedigree.mae} placeholder="Nome/registro da mãe" onChange={(e) => setPedigree((p) => ({ ...p, mae: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
            </div>
            <div>
              <label htmlFor="pedigree_avo_mat" className="block text-sm font-medium text-neutral-400 mb-1">Avô Materno</label>
              <input id="pedigree_avo_mat" name="pedigree_avo_mat" value={pedigree.avo_mat} placeholder="Nome/registro do avô materno" onChange={(e) => setPedigree((p) => ({ ...p, avo_mat: e.target.value }))} className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50" />
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
            <span>{loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Salvar Cadastro'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

export default AnimalForm;
