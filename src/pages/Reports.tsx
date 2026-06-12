import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Loader2, AlertCircle } from 'lucide-react';
import type { Mating } from '../types';
import pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';

pdfMake.vfs = pdfFonts;

interface MatingRow extends Mating {
  sire_name?: string;
  dam_name?: string;
}

function generatePdf(matingData: MatingRow[]) {
  const body: (string | number | null)[][] = [
    ['Objetivo', 'Touro', 'Fêmea', 'Score', 'Confiança'],
  ];

  matingData.forEach((m) => {
    body.push([
      m.objetivo,
      m.sire_name || m.sire_id,
      m.dam_name || m.dam_id,
      m.score_composto != null ? String(m.score_composto) : '-',
      m.confianca != null ? String(m.confianca) : '-',
    ]);
  });

  const docDefinition = {
    content: [
      { text: 'Relatório de Cruzamentos CattleGen', style: 'header' as const },
      { text: `Total de registros: ${matingData.length}`, margin: [0, 0, 0, 10] as [number, number, number, number] },
      {
        table: {
          headerRows: 1,
          widths: ['*', '*', '*', 'auto', 'auto'] as [string, string, string, string, string],
          body,
        },
      },
    ],
    styles: {
      header: { fontSize: 18, bold: true, margin: [0, 0, 0, 10] as [number, number, number, number] },
    },
  };

  pdfMake.createPdf(docDefinition).download('relatorio-cruzamentos.pdf');
}

export default function Reports() {
  const [matings, setMatings] = useState<MatingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const { data, error } = await supabase
        .from('mating')
        .select('*, sire:sire_id(nome_exibicao, registro_composto), dam:dam_id(nome_exibicao, registro_composto)')
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error(error);
        setLoading(false);
        return;
      }

      const rows: MatingRow[] = (data || []).map((item: unknown) => {
        const m = item as Record<string, unknown>;
        const sireObj =
          m.sire && typeof m.sire === 'object' && m.sire !== null
            ? (m.sire as Record<string, unknown>)
            : undefined;
        const damObj =
          m.dam && typeof m.dam === 'object' && m.dam !== null
            ? (m.dam as Record<string, unknown>)
            : undefined;
        return {
          id: String(m.id),
          farm_id: String(m.farm_id),
          sire_id: String(m.sire_id),
          dam_id: String(m.dam_id),
          programa_base: String(m.programa_base) as Mating['programa_base'],
          objetivo: String(m.objetivo),
          score_composto: typeof m.score_composto === 'number' ? m.score_composto : undefined,
          confianca: typeof m.confianca === 'number' ? m.confianca : undefined,
          alertas: m.alertas,
          created_at: typeof m.created_at === 'string' ? m.created_at : undefined,
          sire_name: sireObj?.nome_exibicao ? String(sireObj.nome_exibicao) : undefined,
          dam_name: damObj?.nome_exibicao ? String(damObj.nome_exibicao) : undefined,
        };
      });

      setMatings(rows);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando cruzamentos...
      </div>
    );
  }

  if (matings.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-neutral-400">
        <AlertCircle className="mb-2 h-8 w-8" />
        <p>Nenhum cruzamento salvo.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-100">Relatórios</h1>
        <button
          type="button"
          onClick={() => generatePdf(matings)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          <Download className="h-4 w-4" />
          Gerar PDF
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/60">
        <table className="w-full text-left text-sm text-gray-100">
          <thead className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase text-neutral-400">
            <tr>
              <th className="px-4 py-3">Objetivo</th>
              <th className="px-4 py-3">Touro</th>
              <th className="px-4 py-3">Fêmea</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Confiança</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {matings.map((m) => (
              <tr key={m.id} className="hover:bg-neutral-800/50">
                <td className="px-4 py-3">{m.objetivo}</td>
                <td className="px-4 py-3">{m.sire_name || m.sire_id}</td>
                <td className="px-4 py-3">{m.dam_name || m.dam_id}</td>
                <td className="px-4 py-3">{m.score_composto ?? '-'}</td>
                <td className="px-4 py-3">{m.confianca ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
