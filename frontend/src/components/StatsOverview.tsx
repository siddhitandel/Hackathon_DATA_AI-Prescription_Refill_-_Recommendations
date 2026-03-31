import { useMemo } from 'react';
import { Activity, Users, Clock, TrendingUp } from 'lucide-react';
import type { PatientRecord } from '@/lib/patient-types';

interface StatsOverviewProps {
  data: PatientRecord[];
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="glass-card stat-glow rounded-xl p-6 flex items-start gap-4">
      <div className={`rounded-lg p-3 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground font-medium">{label}</p>
        <p className="text-2xl font-heading font-bold mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </div>
    </div>
  );
}

export default function StatsOverview({ data }: StatsOverviewProps) {
  const stats = useMemo(() => {
    const totalPatients = new Set(data.map(d => d.DESYNPUF_ID)).size;
    const avgRisk = data.reduce((s, d) => s + d.Risk_Score, 0) / data.length;
    const lateRate = data.filter(d => d.Is_Late_General === 1).length / data.length * 100;
    
    // Refill gap stats
    const validGaps = data.filter(d => typeof d.Avg_Past_Gap === 'number' && !isNaN(d.Avg_Past_Gap));
    const avgGap = validGaps.length > 0 ? validGaps.reduce((s, d) => s + d.Avg_Past_Gap, 0) / validGaps.length : 0;

    return { totalPatients, avgRisk, lateRate, avgGap };
  }, [data]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={Users} label="Unique Patients" value={stats.totalPatients.toLocaleString()} sub="In dataset" color="bg-primary/10 text-primary" />
      <StatCard icon={Activity} label="Avg Risk Score" value={stats.avgRisk.toFixed(2)} sub="XGBoost v2 prediction" color="bg-accent/10 text-accent" />
      <StatCard icon={TrendingUp} label="Late Refill Rate" value={`${stats.lateRate.toFixed(1)}%`} sub="Patients missing refill window" color="bg-warning/10 text-warning" />
      <StatCard icon={Clock} label="Avg Refill Gap" value={`${stats.avgGap.toFixed(1)} days`} sub="Mean days between visits" color="bg-secondary/10 text-secondary" />
    </div>
  );
}
