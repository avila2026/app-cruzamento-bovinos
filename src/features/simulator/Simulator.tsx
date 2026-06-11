import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { EvaluationTrait, ProgramaAvaliacao } from '../../types';
import {
  calcularCruzamento,
  type CruzamentoResult,
  type PerfilObjetivo,
  type PoliticaAusencia,
} from '../../lib/scoring';
import { ArrowRight, ArrowLeft, Dna, AlertTriangle, CheckCircle, BarChart3 } from 'lucide-react';

interface AnimalOption {
  id: string;
  nome_exibicao: string;
  registro_composto: string;
  consanguinidade_pct?: number;
}

const PROGRAMAS: ProgramaAvaliacao[] = ['GENEPLUS', 'PMGZ', 'ANCP'];
const PERFIL_LABELS: Record<PerfilObjetivo, string> = {
  NOVILHAS: 'Novilhas (ênfase em reprodução e funcionalidade)',
  REPOSICAO: 'Reposição (equilíbrio)',
  TERMINAL: 'Terminal (ênfase em carcaça)',
};

export default function Simulator() {
  const [step, setStep] = useState(1);
  const [perfil, setPerfil] = useState<PerfilObjetivo>('NOVILHAS');
  const [programa, setPrograma] = useState<ProgramaAvaliacao>('GENEPLUS');
  const [politica, setPolitica] = useState<PoliticaAusencia>('MEDIA_DISPONIVEL');
  const [sireId, setSireId] = useState('');
  const [damId, setDamId] = useState('');

  const [touros, setTouros] = useState<AnimalOption[]>([]);
  const [femeas, setFemeas] = useState<AnimalOption[]>([]);
  const [loading, setLoading] = useState(false);

  const [sireTraits, setSireTraits] = useState<Map<string, EvaluationTrait>>(new Map());
  const [damTraits, setDamTraits] = useState<Map<string, EvaluationTrait>>(new Map());
  const [result, setResult] = useState<CruzamentoResult | null>(null);

  // Carrega touros e fêmeas
  useEffect(() => {
    async function fetchAnimals() {
      const { data: males, error: mErr } = await supabase
        .from('animal')
        .select('id,nome_exibicao,registro_composto,consanguinidade_pct')
        .eq('sexo', 'M');
      const { data: females, error: fErr } = await supabase
        .from('animal')
        .select('id,nome_exibicao,registro_composto,consanguinidade_pct')
        .eq('sexo', 'F');
      if (!mErr && males) setTouros(males);
      if (!fErr && females) setFemeas(females);
    }
    fetchAnimals();
  }, []);

  // Carrega traits quando seleciona touro ou fêmea
  useEffect(() => {
    async function loadTraits(animalId: string, setter: (m: Map<string, EvaluationTrait>) => void) {
      const { data: evals } = await supabase
        .from('evaluation')
        .select('id')
        .eq('animal_id', animalId)
        .eq('programa', programa)
        .order('created_at', { ascending: false })
        .limit(1);
      if (!evals || evals.length === 0) {
        setter(new Map());
        return;
      }
      const evalId = evals[0].id;
      const { data: traits } = await supabase
        .from('evaluation_trait')
        .select('id,evaluation_id,code,label,value,accuracy,rank_type,rank_value,direction')
        .eq('evaluation_id', evalId);
      const map = new Map<string, EvaluationTrait>();
      for (const t of traits || []) {
        map.set(t.code, t);
      }
      setter(map);
    }
    if (sireId) loadTraits(sireId, setSireTraits);
    if (damId) loadTraits(damId, setDamTraits);
  }, [sireId, damId, programa]);

  const consanguinidade = useMemo(() => {
    const s = touros.find((t) => t.id === sireId)?.consanguinidade_pct;
    const d = femeas.find((f) => f.id === damId)?.consanguinidade_pct;
    return s != null && d != null ? Math.max(s, d) : undefined;
  }, [sireId, damId, touros, femeas]);

  async function calcular() {
    if (!sireId || !damId) return;
    setLoading(true);
    try {
      const res = calcularCruzamento(sireTraits, damTraits, perfil, politica, consanguinidade);
      setResult(res);
      setStep(4);
    } finally {
      setLoading(false);
    }
  }

  // Helpers para render
  const selectedSire = touros.find((t) => t.id === sireId);
  const selectedDam = femeas.find((f) => f.id === damId);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100 flex items-center gap-3">
          <Dna size={28} className="text-emerald-500" />
          Simulador de Cruzamento
        </h1>
        <div className="text-sm text-neutral-400">Passo {step} de 4</div>
      </div>

      {/* Progress */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-2 flex-1 rounded-full transition-colors ${
              n <= step ? 'bg-emerald-600' : 'bg-neutral-800'
            }`}
          />
        ))}
      </div>

      {/* PASSO 1 — Perfil */}
      {step === 1 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-200">1. Escolha o perfil de objetivo</h2>
          <div className="grid gap-3">
            {(Object.keys(PERFIL_LABELS) as PerfilObjetivo[]).map((p) => (
              <button
                key={p}
                onClick={() => setPerfil(p)}
                className={`text-left p-4 rounded-lg border transition-all ${
                  perfil === p
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-neutral-700 bg-neutral-800/50 hover:border-neutral-600'
                }`}
              >
                <div className="font-medium text-gray-200">{p}</div>
                <div className="text-sm text-neutral-400 mt-1">{PERFIL_LABELS[p]}</div>
              </button>
            ))}
          </div>
          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg transition-colors"
            >
              Avançar <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 2 — Programa + Política */}
      {step === 2 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-200">2. Programa base e política</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Programa de avaliação</label>
              <div className="flex flex-wrap gap-3">
                {PROGRAMAS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPrograma(p)}
                    className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      programa === p
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-neutral-700 bg-neutral-800/50 text-gray-300 hover:border-neutral-600'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Política de ausência</label>
              <select
                value={politica}
                onChange={(e) => setPolitica(e.target.value as PoliticaAusencia)}
                className="w-full max-w-md bg-neutral-800 border border-neutral-700 text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="MEDIA_DISPONIVEL">Média disponível (recomendado)</option>
                <option value="ESTRITA">Estrita (não calcular se faltar traço obrigatório)</option>
                <option value="IMPUTACAO_MEDIA_PROGRAMA">Imputação com média do programa</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">
                Define como o sistema lida com traços ausentes na avaliação.
              </p>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2 transition-colors"
            >
              <ArrowLeft size={18} /> Voltar
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-lg transition-colors"
            >
              Avançar <ArrowRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* PASSO 3 — Selecionar touro e fêmea */}
      {step === 3 && (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6 space-y-6">
          <h2 className="text-xl font-semibold text-gray-200">3. Selecione o casal</h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Touro</label>
              <select
                value={sireId}
                onChange={(e) => setSireId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Selecione um touro...</option>
                {touros.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome_exibicao} — {t.registro_composto}
                  </option>
                ))}
              </select>
              {selectedSire?.consanguinidade_pct != null && (
                <p className="text-xs text-neutral-500 mt-1">
                  Consanguinidade: {selectedSire.consanguinidade_pct}%
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Fêmea</label>
              <select
                value={damId}
                onChange={(e) => setDamId(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 text-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Selecione uma fêmea...</option>
                {femeas.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.nome_exibicao} — {f.registro_composto}
                  </option>
                ))}
              </select>
              {selectedDam?.consanguinidade_pct != null && (
                <p className="text-xs text-neutral-500 mt-1">
                  Consanguinidade: {selectedDam.consanguinidade_pct}%
                </p>
              )}
            </div>
          </div>

          {/* Preview de traits disponíveis */}
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="bg-neutral-800/40 rounded-lg p-3">
              <div className="text-neutral-400 mb-1">Traits do touro ({programa})</div>
              <div className="text-gray-200 font-medium">{sireTraits.size} traços carregados</div>
            </div>
            <div className="bg-neutral-800/40 rounded-lg p-3">
              <div className="text-neutral-400 mb-1">Traits da fêmea ({programa})</div>
              <div className="text-gray-200 font-medium">{damTraits.size} traços carregados</div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2 transition-colors"
            >
              <ArrowLeft size={18} /> Voltar
            </button>
            <button
              onClick={calcular}
              disabled={!sireId || !damId || loading}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                sireId && damId && !loading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  : 'bg-neutral-700 text-neutral-500 cursor-not-allowed'
              }`}
            >
              {loading ? 'Calculando...' : (
                <>Calcular Cruzamento <ArrowRight size={18} /></>
              )}
            </button>
          </div>
        </div>
      )}

      {/* PASSO 4 — Resultado */}
      {step === 4 && result && (
        <div className="space-y-6">
          {/* Header do resultado */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 size={24} className="text-emerald-500" />
              <h2 className="text-xl font-semibold text-gray-200">Resultado da Simulação</h2>
            </div>

            {/* Cards de métricas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                <div className="text-sm text-neutral-400">Score Composto</div>
                <div className={`text-3xl font-bold mt-1 ${result.scoreComposto != null ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.scoreComposto != null ? result.scoreComposto.toFixed(1) : 'N/A'}
                </div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                <div className="text-sm text-neutral-400">Confiança Média</div>
                <div className="text-3xl font-bold mt-1 text-blue-400">
                  {result.confiancaMedia != null ? `${result.confiancaMedia.toFixed(1)}%` : 'N/A'}
                </div>
              </div>
              <div className="bg-neutral-800/50 rounded-lg p-4 text-center">
                <div className="text-sm text-neutral-400">Cobertura de Traits</div>
                <div className="text-3xl font-bold mt-1 text-gray-200">
                  {result.coveragePct.toFixed(0)}%
                </div>
              </div>
            </div>

            {/* Alertas */}
            {result.alertas.length > 0 && (
              <div className="space-y-2 mb-6">
                {result.alertas.map((alerta, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-3 rounded-lg px-4 py-3 text-sm ${
                      alerta.includes('alta') || alerta.includes('ALTA') || alerta.includes('não recomendado')
                        ? 'bg-red-500/10 border border-red-500/20 text-red-300'
                        : alerta.includes('moderada') || alerta.includes('atenção')
                        ? 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-300'
                        : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                    }`}
                  >
                    {alerta.includes('alta') || alerta.includes('ALTA') || alerta.includes('não recomendado') ? (
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-400" />
                    ) : (
                      <CheckCircle size={16} className="mt-0.5 shrink-0 text-blue-400" />
                    )}
                    <span>{alerta}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Tabela de traits */}
          <div className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Detalhamento por traço</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-700 text-left text-neutral-400">
                    <th className="pb-3 pr-4">Traço</th>
                    <th className="pb-3 pr-4 text-right">Touro</th>
                    <th className="pb-3 pr-4 text-right">Fêmea</th>
                    <th className="pb-3 pr-4 text-right">Progênie</th>
                    <th className="pb-3 pr-4 text-right">Score</th>
                    <th className="pb-3 pr-4 text-right">Peso</th>
                    <th className="pb-3 pr-4 text-right">Confiança</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                  {result.traits.map((t) => (
                    <tr key={t.concept_key} className="text-gray-200">
                      <td className="py-3 pr-4 font-medium">{t.concept_key}</td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {t.sireValue != null ? t.sireValue.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {t.damValue != null ? t.damValue.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums font-medium text-emerald-400">
                        {t.expectedValue != null ? t.expectedValue.toFixed(2) : '—'}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums">
                        {t.normalizedScore != null ? (
                          <span className={`${t.normalizedScore >= 70 ? 'text-emerald-400' : t.normalizedScore >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {t.normalizedScore.toFixed(1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-neutral-400">
                        {t.weight.toFixed(1)}
                      </td>
                      <td className="py-3 pr-4 text-right tabular-nums text-neutral-400">
                        {t.confidence != null ? `${t.confidence.toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => {
                setStep(3);
                setResult(null);
              }}
              className="flex items-center gap-2 text-gray-400 hover:text-gray-200 px-4 py-2 transition-colors"
            >
              <ArrowLeft size={18} /> Nova simulação
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
