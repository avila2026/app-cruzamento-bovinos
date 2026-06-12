import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type {
  Animal,
  AnimalRelation,
  Evaluation,
  EvaluationTrait,
  ProgramaAvaliacao,
  TraitDictionary,
} from '../../types';
import {
  ArrowLeft,
  Award,
  Dna,
  Pencil,
  PlusCircle,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

const PROGRAMAS: ProgramaAvaliacao[] = ['GENEPLUS', 'PMGZ', 'ANCP'];

type TraitByProgram = Record<ProgramaAvaliacao, Record<string, EvaluationTrait>>;

const AnimalDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [animal, setAnimal] = useState<Animal | null>(null);
  const [relations, setRelations] = useState<AnimalRelation[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [traits, setTraits] = useState<EvaluationTrait[]>([]);
  const [dictionary, setDictionary] = useState<TraitDictionary[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ProgramaAvaliacao>('GENEPLUS');

  const fetchAll = useCallback(async (animalId: string, abortController?: AbortController) => {
    try {
      await Promise.resolve();
      if (abortController?.signal.aborted) return;
      setLoading(true);
      const [{ data: animalData, error: animalError }, { data: relationsData }, { data: evaluationsData }, { data: dictData }, { data: photoData }] = await Promise.all([
        supabase.from('animal').select('*').eq('id', animalId).single(),
        supabase.from('animal_relation').select('*').eq('animal_id', animalId),
        supabase.from('evaluation').select('*').eq('animal_id', animalId).order('data_avaliacao', { ascending: false }),
        supabase.from('trait_dictionary').select('*'),
        supabase.storage.from('animal-photos').list(animalId, { limit: 1, sortBy: { column: 'created_at', order: 'desc' } })
      ]);

      let traitsData: EvaluationTrait[] | null = null;
      if (evaluationsData && evaluationsData.length > 0) {
        const evaluationIds = evaluationsData.map((e: Evaluation) => e.id);
        const { data: tData } = await supabase.from('evaluation_trait').select('*').in('evaluation_id', evaluationIds);
        traitsData = tData;
      }

      if (abortController?.signal.aborted) return;

      if (animalError) throw animalError;
      setAnimal(animalData);
      setRelations(relationsData ?? []);
      setEvaluations(evaluationsData ?? []);
      setTraits(traitsData ?? []);
      setDictionary(dictData ?? []);
      if (photoData && photoData.length > 0) {
        const { data: urlData } = supabase.storage.from('animal-photos').getPublicUrl(`${animalId}/${photoData[0].name}`);
        setPhotoUrl(urlData.publicUrl);
      }
    } catch (err) {
      if (abortController?.signal.aborted) return;
      console.error('Erro ao carregar ficha:', err);
      toast.error('Erro ao carregar ficha do animal');
    } finally {
      if (!abortController?.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAll(id, controller);
    }
    return () => {
      controller.abort();
    };
  }, [id, fetchAll]);


  const handleDeleteAnimal = async () => {
    if (!animal) return;
    if (!confirm(`Excluir "${animal.nome_exibicao}" e todos os seus dados? Esta ação não pode ser desfeita.`))
      return;
    const { error } = await supabase.from('animal').delete().eq('id', animal.id);
    if (error) {
      toast.error('Erro ao excluir: ' + error.message);
      return;
    }
    navigate('/animais');
  };

  const handleDeleteEvaluation = async (evaluationId: string) => {
    if (!confirm('Excluir esta avaliação e todas as suas DEPs?')) return;
    const { error } = await supabase.from('evaluation').delete().eq('id', evaluationId);
    if (error) {
      toast.error('Erro ao excluir avaliação: ' + error.message);
      return;
    }
    if (id) fetchAll(id);
  };

  // Mapa: programa -> code original -> trait
  const traitByProgram = useMemo<TraitByProgram>(() => {
    const map: TraitByProgram = { GENEPLUS: {}, PMGZ: {}, ANCP: {} };
    const evalProgram = new Map(evaluations.map((e) => [e.id, e.programa]));
    for (const t of traits) {
      const prog = evalProgram.get(t.evaluation_id);
      if (prog) map[prog][t.code] = t;
    }
    return map;
  }, [traits, evaluations]);

  // Linhas comparativas normalizadas via dicionário (apenas conceitos com algum valor)
  const comparativeRows = useMemo(() => {
    return dictionary
      .map((d) => {
        const cells: Record<ProgramaAvaliacao, EvaluationTrait | undefined> = {
          GENEPLUS: d.code_geneplus ? traitByProgram.GENEPLUS[d.code_geneplus] : undefined,
          PMGZ: d.code_pmgz ? traitByProgram.PMGZ[d.code_pmgz] : undefined,
          ANCP: d.code_ancp ? traitByProgram.ANCP[d.code_ancp] : undefined,
        };
        const hasAny = PROGRAMAS.some((p) => cells[p]?.value != null);
        return { dict: d, cells, hasAny };
      })
      .filter((r) => r.hasAny);
  }, [dictionary, traitByProgram]);

  const evaluationsByProgram = useMemo(() => {
    const map: Record<ProgramaAvaliacao, Evaluation[]> = { GENEPLUS: [], PMGZ: [], ANCP: [] };
    for (const e of evaluations) map[e.programa].push(e);
    return map;
  }, [evaluations]);

  const traitsByEvaluation = useMemo(() => {
    const map: Record<string, EvaluationTrait[]> = {};
    for (const t of traits) (map[t.evaluation_id] ||= []).push(t);
    return map;
  }, [traits]);

  if (loading) {
    return <div className="p-8 text-center text-neutral-500">Carregando ficha...</div>;
  }

  if (!animal) {
    return (
      <div className="p-8 text-center text-neutral-500">
        <p className="mb-4">Animal não encontrado.</p>
        <Link to="/animais" className="text-emerald-400 hover:text-emerald-300">
          Voltar para a lista
        </Link>
      </div>
    );
  }

  const getRelation = (type: AnimalRelation['relation_type']) =>
    relations.find((r) => r.relation_type === type);

  const fmt = (v?: number | null) =>
    v == null ? '—' : Number.isInteger(v) ? String(v) : v.toFixed(2);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-neutral-400 hover:text-gray-200 transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Voltar</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDeleteAnimal}
            className="flex items-center space-x-2 bg-red-900/40 hover:bg-red-800/60 text-red-300 px-4 py-2 rounded-lg transition-colors border border-red-900/50"
          >
            <Trash2 size={18} />
            <span>Excluir</span>
          </button>
          <Link
            to={`/animais/${animal.id}/editar`}
            className="flex items-center space-x-2 bg-neutral-800 hover:bg-neutral-700 text-gray-200 px-4 py-2 rounded-lg transition-colors border border-neutral-700"
          >
            <Pencil size={18} />
            <span>Editar</span>
          </Link>
          <Link
            to={`/animais/${animal.id}/avaliacao/nova`}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-900/20"
          >
            <PlusCircle size={20} />
            <span>Nova Avaliação</span>
          </Link>
        </div>
      </div>

      {/* Identidade */}
      <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 shadow-xl backdrop-blur-sm flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-56 h-56 shrink-0 rounded-xl bg-neutral-950 border border-neutral-800 overflow-hidden flex items-center justify-center">
          {photoUrl ? (
            <img src={photoUrl} alt={animal.nome_exibicao} className="w-full h-full object-cover" />
          ) : (
            <Dna size={48} className="text-neutral-700" />
          )}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <h1 className="text-3xl font-bold text-gray-100">{animal.nome_exibicao}</h1>
            <p className="text-neutral-400">
              {animal.registro_composto} · {animal.raca} {animal.categoria_registral}
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <Info label="Sexo" value={animal.sexo === 'M' ? 'Macho' : 'Fêmea'} />
            <Info label="Nascimento" value={new Date(animal.data_nascimento).toLocaleDateString()} />
            <Info label="Status" value={animal.status} />
            {animal.central_semen && <Info label="Central de Sêmen" value={animal.central_semen} />}
            {animal.criador && <Info label="Criador" value={animal.criador} />}
            {animal.fazenda && <Info label="Fazenda" value={animal.fazenda} />}
            <Info label="Genotipado" value={animal.genotipado ? 'Sim' : 'Não'} />
            {animal.consanguinidade_pct != null && (
              <Info label="Consanguinidade" value={`${animal.consanguinidade_pct}%`} />
            )}
          </div>
        </div>
      </div>

      {/* Genealogia */}
      <section className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
          <Dna size={20} /> Genealogia
        </h2>
        <div className="flex flex-col items-center gap-3">
          <PedigreeNode label="Animal" name={animal.nome_exibicao} highlight />
          <div className="h-5 w-px bg-neutral-700" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            <PedigreeNode label="Pai" name={getRelation('PAI')?.related_name} />
            <PedigreeNode label="Mãe" name={getRelation('MAE')?.related_name} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
            <div className="hidden sm:block" />
            <PedigreeNode label="Avô Materno" name={getRelation('AVO_MATERNO')?.related_name} muted />
          </div>
        </div>
      </section>

      {/* Comparativo normalizado de DEPs */}
      <section className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-emerald-400 mb-1 flex items-center gap-2">
          <Award size={20} /> Comparativo de DEPs (Normalizado)
        </h2>
        <p className="text-sm text-neutral-500 mb-4">
          Características cruzadas entre programas via dicionário de traços, evitando duplicidade.
        </p>
        {comparativeRows.length === 0 ? (
          <p className="text-neutral-500 text-sm">Nenhuma DEP lançada para este animal.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="text-xs uppercase text-neutral-400 border-b border-neutral-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Característica</th>
                  <th className="px-4 py-3 font-medium">Un.</th>
                  <th className="px-4 py-3 font-medium text-center">Geneplus</th>
                  <th className="px-4 py-3 font-medium text-center">PMGZ</th>
                  <th className="px-4 py-3 font-medium text-center">ANCP</th>
                </tr>
              </thead>
              <tbody>
                {comparativeRows.map(({ dict, cells }) => (
                  <tr key={dict.id} className="border-b border-neutral-800/50 hover:bg-neutral-800/20">
                    <td className="px-4 py-3 font-medium text-gray-200 flex items-center gap-2">
                      {dict.direction === 'MAIOR_MELHOR' ? (
                        <TrendingUp size={14} className="text-emerald-500" />
                      ) : (
                        <TrendingDown size={14} className="text-sky-400" />
                      )}
                      {dict.label}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{dict.unit || '—'}</td>
                    {PROGRAMAS.map((p) => (
                      <td key={p} className="px-4 py-3 text-center">
                        {cells[p]?.value != null ? (
                          <span className="font-semibold text-gray-100">{fmt(cells[p]!.value)}</span>
                        ) : (
                          <span className="text-neutral-600">—</span>
                        )}
                        {cells[p]?.accuracy != null && (
                          <span className="block text-[11px] text-neutral-500">
                            acc {fmt(cells[p]!.accuracy)}%
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Abas por programa */}
      <section className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 shadow-xl backdrop-blur-sm">
        <h2 className="text-xl font-semibold text-emerald-400 mb-4">Avaliações por Programa</h2>
        <div className="flex gap-2 mb-6 border-b border-neutral-800">
          {PROGRAMAS.map((p) => {
            const count = evaluationsByProgram[p].length;
            return (
              <button
                key={p}
                onClick={() => setActiveTab(p)}
                className={`px-4 py-2 -mb-px text-sm font-medium border-b-2 transition-colors ${
                  activeTab === p
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-neutral-400 hover:text-gray-200'
                }`}
              >
                {p} {count > 0 && <span className="text-xs text-neutral-500">({count})</span>}
              </button>
            );
          })}
        </div>

        {evaluationsByProgram[activeTab].length === 0 ? (
          <p className="text-neutral-500 text-sm">Nenhuma avaliação {activeTab} cadastrada.</p>
        ) : (
          <div className="space-y-6">
            {evaluationsByProgram[activeTab].map((ev) => (
              <div key={ev.id} className="rounded-lg border border-neutral-800 overflow-hidden">
                <div className="bg-neutral-950/50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="font-medium text-gray-200">{ev.edicao || 'Edição —'}</span>
                    {ev.base_genetica && (
                      <span className="text-xs text-neutral-500 ml-2">Base: {ev.base_genetica}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {ev.indice_resumo_nome && (
                      <span className="text-sm text-emerald-400 font-semibold">
                        {ev.indice_resumo_nome}: {fmt(ev.indice_resumo_valor)}
                      </span>
                    )}
                    <Link
                      to={`/animais/${animal.id}/avaliacao/${ev.id}/editar`}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-gray-100 hover:bg-neutral-800 transition-colors"
                      title="Editar avaliação"
                    >
                      <Pencil size={16} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDeleteEvaluation(ev.id)}
                      className="p-1.5 rounded-md text-neutral-400 hover:text-red-300 hover:bg-red-900/30 transition-colors"
                      title="Excluir avaliação"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="text-xs uppercase text-neutral-500 border-b border-neutral-800">
                    <tr>
                      <th className="px-4 py-2 font-medium">Código</th>
                      <th className="px-4 py-2 font-medium">Característica</th>
                      <th className="px-4 py-2 font-medium text-right">Valor</th>
                      <th className="px-4 py-2 font-medium text-right">Acc.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(traitsByEvaluation[ev.id] || []).map((t) => (
                      <tr key={t.id} className="border-b border-neutral-800/30">
                        <td className="px-4 py-2 font-mono text-xs text-neutral-400">{t.code}</td>
                        <td className="px-4 py-2">{t.label || '—'}</td>
                        <td className="px-4 py-2 text-right font-semibold text-gray-100">
                          {fmt(t.value)} <span className="text-neutral-500 font-normal">{t.unit}</span>
                        </td>
                        <td className="px-4 py-2 text-right text-neutral-400">{fmt(t.accuracy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

const Info: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <p className="text-xs uppercase text-neutral-500">{label}</p>
    <p className="text-gray-200 capitalize">{value}</p>
  </div>
);

const PedigreeNode: React.FC<{
  label: string;
  name?: string | null;
  highlight?: boolean;
  muted?: boolean;
}> = ({ label, name, highlight, muted }) => (
  <div
    className={`rounded-lg border px-4 py-3 text-center w-full ${
      highlight
        ? 'border-emerald-500/40 bg-emerald-500/10'
        : muted
        ? 'border-neutral-800 bg-neutral-950/40'
        : 'border-neutral-800 bg-neutral-950'
    }`}
  >
    <p className="text-xs uppercase text-neutral-500">{label}</p>
    <p className={`font-medium ${name ? 'text-gray-100' : 'text-neutral-600 italic'}`}>
      {name || 'Não informado'}
    </p>
  </div>
);

export default AnimalDetails;
