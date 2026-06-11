import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Beef, Heart, Stethoscope, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

interface DashboardMetrics {
  bulls: number;
  cows: number;
  evaluations: number;
}

interface MetricCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  accent: string;
}

function MetricCard({ title, value, icon, accent }: MetricCardProps) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-400">{title}</p>
          <p className="mt-1 text-3xl font-bold text-gray-100">{value}</p>
        </div>
        <div className={`rounded-lg p-3 ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({ bulls: 0, cows: 0, evaluations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      const [bullsRes, cowsRes, evalsRes] = await Promise.all([
        supabase.from('animal').select('*', { count: 'exact', head: true }).eq('sexo', 'M'),
        supabase.from('animal').select('*', { count: 'exact', head: true }).eq('sexo', 'F'),
        supabase.from('evaluation').select('*', { count: 'exact', head: true }),
      ]);

      if (cancelled) return;

      setMetrics({
        bulls: bullsRes.count ?? 0,
        cows: cowsRes.count ?? 0,
        evaluations: evalsRes.count ?? 0,
      });
      setLoading(false);
    }

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-neutral-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Carregando métricas...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-100">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          title="Touros"
          value={metrics.bulls}
          icon={<Beef className="h-6 w-6 text-emerald-400" />}
          accent="bg-emerald-500/10"
        />
        <MetricCard
          title="Fêmeas"
          value={metrics.cows}
          icon={<Heart className="h-6 w-6 text-rose-400" />}
          accent="bg-rose-500/10"
        />
        <MetricCard
          title="Avaliações"
          value={metrics.evaluations}
          icon={<Stethoscope className="h-6 w-6 text-sky-400" />}
          accent="bg-sky-500/10"
        />
      </div>
    </div>
  );
}
