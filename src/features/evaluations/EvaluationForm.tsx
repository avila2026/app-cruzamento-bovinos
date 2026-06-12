import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import type { Animal, ProgramaAvaliacao, TraitDictionary } from '../../types';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

const PROGRAMAS: ProgramaAvaliacao[] = ['GENEPLUS', 'PMGZ', 'ANCP'];

// Coluna de código do dicionário correspondente a cada programa.
const CODE_FIELD: Record<ProgramaAvaliacao, keyof TraitDictionary> = {
  GENEPLUS: 'code_geneplus',
  PMGZ: 'code_pmgz',
  ANCP: 'code_ancp',
};

interface TraitInput {
  value: string;
  accuracy: string;
}

/**
 * Formulário inteligente de lançamento de avaliações históricas.
 * Ao escolher o programa, renderiza apenas os inputs das características
 * cadastradas para aquele programa no `trait_dictionary`.
 */
const EvaluationForm: React.FC = () => {
  const { id: animalId, evalId } = useParams<{ id: string; evalId: string }>();
  const isEdit = !!evalId;
  const navigate = useNavigate();

  const [animal, setAnimal] = useState<Animal | null>(null);
  const [dictionary, setDictionary] = useState<TraitDictionary[]>([]);
  const [loading, setLoading] = useState(false);

  const [programa, setPrograma] = useState<ProgramaAvaliacao>('GENEPLUS');
  const [edicao, setEdicao] = useState('');
  const [dataRef, setDataRef] = useState('');
  const [baseGenetica, setBaseGenetica] = useState('');
  const [indiceNome, setIndiceNome] = useState('');
  const [indiceValor, setIndiceValor] = useState('');
  const [inputs, setInputs] = useState<Record<string, TraitInput>>({});

  useEffect(() => {
    (async () => {
      if (animalId) {
        const { data } = await supabase.from('animal').select('*').eq('id', animalId).single();
        setAnimal(data);
      }
      const { data: dict } = await supabase.from('trait_dictionary').select('*').order('grp');
      setDictionary(dict || []);

      // Modo edição: carrega a avaliação existente e suas DEPs
      if (evalId) {
        const [{ data: ev }, { data: evTraits }] = await Promise.all([
          supabase.from('evaluation').select('*').eq('id', evalId).single(),
          supabase.from('evaluation_trait').select('*').eq('evaluation_id', evalId),
        ]);
        if (ev) {
          setPrograma(ev.programa);
          setEdicao(ev.edicao || '');
          setDataRef(ev.data_ref ? ev.data_ref.split('T')[0] : '');
          setBaseGenetica(ev.base_genetica || '');
          setIndiceNome(ev.indice_resumo_nome || '');
          setIndiceValor(ev.indice_resumo_valor != null ? String(ev.indice_resumo_valor) : '');
        }
        const loaded: Record<string, TraitInput> = {};
        for (const t of evTraits || []) {
          loaded[t.code] = {
            value: t.value != null ? String(t.value) : '',
            accuracy: t.accuracy != null ? String(t.accuracy) : '',
          };
        }
        setInputs(loaded);
      }
    })();
  }, [animalId, evalId]);

  // Características disponíveis para o programa escolhido (têm código mapeado).
  const availableTraits = useMemo(
    () =>
      dictionary
        .map((d) => ({ dict: d, code: d[CODE_FIELD[programa]] as string | undefined }))
        .filter((t): t is { dict: TraitDictionary; code: string } => !!t.code),
    [dictionary, programa]
  );

  const setTrait = (code: string, field: keyof TraitInput, value: string) => {
    setInputs((prev) => {
      const current = prev[code] ?? { value: '', accuracy: '' };
      return { ...prev, [code]: { ...current, [field]: value } };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animalId) return;

    const filled = availableTraits.filter(({ code }) => inputs[code]?.value?.trim());
    if (filled.length === 0) {
      toast.error('Preencha ao menos uma característica (DEP).');
      return;
    }

    try {
      setLoading(true);

      const evPayload = {
        animal_id: animalId,
        programa,
        edicao: edicao || null,
        data_ref: dataRef || null,
        base_genetica: baseGenetica || null,
        indice_resumo_nome: indiceNome || null,
        indice_resumo_valor: indiceValor ? Number(indiceValor) : null,
      };

      let evaluationId: string;

      if (isEdit && evalId) {
        const { error: evError } = await supabase
          .from('evaluation')
          .update(evPayload)
          .eq('id', evalId);
        if (evError) throw evError;
        evaluationId = evalId;
        // Substitui as DEPs existentes pelas atuais
        await supabase.from('evaluation_trait').delete().eq('evaluation_id', evalId);
      } else {
        const { data: ev, error: evError } = await supabase
          .from('evaluation')
          .insert([evPayload])
          .select('id')
          .single();
        if (evError) throw evError;
        evaluationId = ev.id;
      }

      const traitRows = filled.map(({ dict, code }) => ({
        evaluation_id: evaluationId,
        code,
        label: dict.label,
        grp: dict.grp,
        unit: dict.unit,
        value: Number(inputs[code].value),
        accuracy: inputs[code].accuracy ? Number(inputs[code].accuracy) : null,
        direction: dict.direction,
      }));

      const { error: traitError } = await supabase.from('evaluation_trait').insert(traitRows);
      if (traitError) throw traitError;

      toast.success(isEdit ? 'Avaliação atualizada com sucesso!' : 'Avaliação lançada com sucesso!');
      navigate(`/animais/${animalId}`);
    } catch (err) {
      const error = err as Error;
      console.error(error);
      toast.error('Erro ao salvar avaliação: ' + error.message);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold text-gray-100">{isEdit ? 'Editar Avaliação' : 'Nova Avaliação'}</h1>
      </div>

      {animal && (
        <p className="text-neutral-400">
          Lançando avaliação para <span className="text-emerald-400 font-medium">{animal.nome_exibicao}</span>
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-xl p-8 shadow-xl space-y-8"
      >
        {/* Cabeçalho da avaliação */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-4 border-b border-neutral-800 pb-2">
            Dados da Avaliação
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="programa" className="block text-sm font-medium text-neutral-400 mb-1">Programa *</label>
              <select
                id="programa"
                title="Programa de Avaliação"
                value={programa}
                onChange={(e) => setPrograma(e.target.value as ProgramaAvaliacao)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
              >
                {PROGRAMAS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edicao" className="block text-sm font-medium text-neutral-400 mb-1">Edição / Sumário</label>
              <input
                id="edicao"
                value={edicao}
                onChange={(e) => setEdicao(e.target.value)}
                placeholder="Ex: 2023-3, 4ª AG AGO/2023"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label htmlFor="data_ref" className="block text-sm font-medium text-neutral-400 mb-1">Data de Referência</label>
              <input
                id="data_ref"
                type="date"
                title="Data de Referência"
                placeholder="Selecione a data"
                value={dataRef}
                onChange={(e) => setDataRef(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label htmlFor="base_genetica" className="block text-sm font-medium text-neutral-400 mb-1">Base Genética</label>
              <input
                id="base_genetica"
                value={baseGenetica}
                placeholder="Ex: PMGZ 2023-2"
                onChange={(e) => setBaseGenetica(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label htmlFor="indice_nome" className="block text-sm font-medium text-neutral-400 mb-1">Índice Resumo (Nome)</label>
              <input
                id="indice_nome"
                value={indiceNome}
                onChange={(e) => setIndiceNome(e.target.value)}
                placeholder="Ex: IQGg, iABCZg, MGTe"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
            <div>
              <label htmlFor="indice_valor" className="block text-sm font-medium text-neutral-400 mb-1">Índice Resumo (Valor)</label>
              <input
                id="indice_valor"
                type="number"
                step="any"
                placeholder="Ex: 15.4"
                value={indiceValor}
                onChange={(e) => setIndiceValor(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        </section>

        {/* Características dinâmicas */}
        <section>
          <h2 className="text-xl font-semibold text-emerald-400 mb-1 border-b border-neutral-800 pb-2">
            Características ({programa})
          </h2>
          <p className="text-sm text-neutral-500 my-3">
            Exibindo apenas as características mapeadas para {programa} no dicionário de traços.
          </p>
          {availableTraits.length === 0 ? (
            <p className="text-neutral-500 text-sm">Nenhuma característica cadastrada para este programa.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableTraits.map(({ dict, code }) => (
                <div key={code} className="rounded-lg border border-neutral-800 bg-neutral-950/40 p-4">
                  <div className="flex items-baseline justify-between mb-2">
                    <label className="text-sm font-medium text-gray-200">
                      {dict.label}
                      <span className="text-neutral-500 font-normal"> ({dict.unit || '—'})</span>
                    </label>
                    <span className="text-xs font-mono text-neutral-500">{code}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="any"
                      placeholder="DEP"
                      value={inputs[code]?.value || ''}
                      onChange={(e) => setTrait(code, 'value', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
                    />
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      placeholder="Acc %"
                      value={inputs[code]?.accuracy || ''}
                      onChange={(e) => setTrait(code, 'accuracy', e.target.value)}
                      className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-gray-200 focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-lg shadow-emerald-900/20"
          >
            <Save size={20} />
            <span>{loading ? 'Salvando...' : isEdit ? 'Salvar Alterações' : 'Lançar Avaliação'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EvaluationForm;
