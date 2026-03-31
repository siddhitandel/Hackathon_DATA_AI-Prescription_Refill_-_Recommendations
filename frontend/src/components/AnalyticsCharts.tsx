import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, CartesianGrid, Legend, Cell, PieChart, Pie } from 'recharts';
import type { PatientRecord } from '@/lib/patient-types';

interface AnalyticsChartsProps {
  data: PatientRecord[];
}

const COLORS = [
  'hsl(210, 90%, 45%)', 'hsl(170, 60%, 42%)', 'hsl(260, 50%, 55%)',
  'hsl(38, 92%, 50%)', 'hsl(0, 72%, 55%)', 'hsl(190, 70%, 45%)',
];

export default function AnalyticsCharts({ data }: AnalyticsChartsProps) {
  // Refill gap distribution
  const gapDist = useMemo(() => {
    const buckets = [
      { range: '<-10', min: -Infinity, max: -10, count: 0 },
      { range: '-10 to 0', min: -10, max: 0, count: 0 },
      { range: '0 to 10', min: 0, max: 10, count: 0 },
      { range: '10 to 20', min: 10, max: 20, count: 0 },
      { range: '20 to 30', min: 20, max: 30, count: 0 },
      { range: '>30', min: 30, max: Infinity, count: 0 },
    ];
    data.forEach(d => {
      const gap = d.Avg_Past_Gap;
      if (typeof gap === 'number' && !isNaN(gap)) {
        const b = buckets.find(b => gap >= b.min && gap < b.max);
        if (b) b.count++;
      }
    });
    return buckets;
  }, [data]);

  // Early refills (stockpiling) - patients with negative Days_Until_Next_Visit or negative Avg_Past_Gap
  const earlyRefillData = useMemo(() => {
    const early = data.filter(d => d.Days_Until_Next_Visit < 0).length;
    const onTime = data.filter(d => d.Days_Until_Next_Visit >= 0 && d.Is_Late_General === 0).length;
    const late = data.filter(d => d.Is_Late_General === 1).length;
    return [
      { name: 'Early/Stockpiling', value: early },
      { name: 'On-Time', value: onTime },
      { name: 'Late', value: late },
    ];
  }, [data]);

  // Cost vs Quantity scatter (sampled)
  const costQtyData = useMemo(() => {
    const sampled = data.filter((_, i) => i % 3 === 0).slice(0, 200);
    return sampled.map(d => ({
      cost: d.TOT_RX_CST_AMT,
      qty: d.QTY_DSPNSD_NUM,
      risk: d.Risk_Score,
      late: d.Is_Late_General,
    }));
  }, [data]);

  // Polypharmacy distribution
  const polyDist = useMemo(() => {
    const buckets = [
      { range: '1-5', min: 1, max: 6, count: 0, lateCount: 0 },
      { range: '6-15', min: 6, max: 16, count: 0, lateCount: 0 },
      { range: '16-30', min: 16, max: 31, count: 0, lateCount: 0 },
      { range: '31-50', min: 31, max: 51, count: 0, lateCount: 0 },
      { range: '50+', min: 51, max: Infinity, count: 0, lateCount: 0 },
    ];
    data.forEach(d => {
      const b = buckets.find(b => d.Drug_Load >= b.min && d.Drug_Load < b.max);
      if (b) {
        b.count++;
        if (d.Is_Late_General === 1) b.lateCount++;
      }
    });
    return buckets.map(b => ({
      range: b.range,
      count: b.count,
      lateRate: b.count > 0 ? Math.round(b.lateCount / b.count * 100) : 0,
    }));
  }, [data]);

  // Cadence stability (using actual gaps between prescription dates)
  const cadenceData = useMemo(() => {
    const byPatient = new Map<string, { dates: string[]; gaps: number[] }>();
    
    // Collect all prescription dates per patient
    data.forEach(d => {
      const id = String(d.DESYNPUF_ID);
      if (!byPatient.has(id)) byPatient.set(id, { dates: [], gaps: [] });
      byPatient.get(id)!.dates.push(d.SRVC_DT);
    });

    // Calculate actual gaps between consecutive dates
    byPatient.forEach((patient, id) => {
      const sortedDates = patient.dates.sort();
      for (let i = 1; i < sortedDates.length; i++) {
        const date1 = new Date(sortedDates[i - 1]);
        const date2 = new Date(sortedDates[i]);
        const gapDays = Math.round((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
        if (gapDays > 0) patient.gaps.push(gapDays);
      }
    });

    const stable = { label: 'Stable', count: 0 };
    const moderate = { label: 'Moderate', count: 0 };
    const erratic = { label: 'Erratic', count: 0 };

    byPatient.forEach(patient => {
      if (patient.gaps.length < 2) {
        stable.count++;
        return;
      }
      const mean = patient.gaps.reduce((a, b) => a + b, 0) / patient.gaps.length;
      const std = Math.sqrt(patient.gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / patient.gaps.length);
      const cv = mean !== 0 ? Math.abs(std / mean) : 0;
      if (cv < 0.3) stable.count++;
      else if (cv < 0.7) moderate.count++;
      else erratic.count++;
    });
    return [stable, moderate, erratic];
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Refill Gap Distribution */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold mb-1">Refill Gap Distribution</h3>
        <p className="text-xs text-muted-foreground mb-3">Average days between pharmacy visits</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={gapDist}>
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="count" fill="hsl(210, 90%, 45%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Early Refills / Stockpiling */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold mb-1">Refill Timing Breakdown</h3>
        <p className="text-xs text-muted-foreground mb-3">Early (stockpiling) vs on-time vs late</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={earlyRefillData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {earlyRefillData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Polypharmacy & Late Rate */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold mb-1">Polypharmacy vs Late Rate</h3>
        <p className="text-xs text-muted-foreground mb-3">Drug load buckets and % late refills</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={polyDist}>
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip />
            <Legend />
            <Bar yAxisId="left" dataKey="count" name="Patients" fill="hsl(170, 60%, 42%)" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="right" dataKey="lateRate" name="Late %" fill="hsl(0, 72%, 55%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Cost vs Quantity */}
      <div className="glass-card rounded-xl p-5">
        <h3 className="font-heading font-semibold mb-1">Cost vs Quantity Patterns</h3>
        <p className="text-xs text-muted-foreground mb-3">Total Rx cost vs quantity dispensed (sampled)</p>
        <ResponsiveContainer width="100%" height={220}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="qty" name="Quantity" tick={{ fontSize: 11 }} />
            <YAxis dataKey="cost" name="Cost ($)" tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter data={costQtyData} fill="hsl(260, 50%, 55%)" fillOpacity={0.6} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Cadence Stability */}
      <div className="glass-card rounded-xl p-5 lg:col-span-2">
        <h3 className="font-heading font-semibold mb-1">Cadence Stability</h3>
        <p className="text-xs text-muted-foreground mb-3">Patient refill consistency (CV of gaps: Stable &lt;0.3, Moderate 0.3-0.7, Erratic &gt;0.7)</p>
        <div className="flex items-end gap-6 justify-center h-[180px]">
          {cadenceData.map((d, i) => {
            const max = Math.max(...cadenceData.map(c => c.count));
            const pct = max > 0 ? (d.count / max) * 100 : 0;
            const colors = ['bg-success', 'bg-warning', 'bg-destructive'];
            return (
              <div key={d.label} className="flex flex-col items-center gap-2">
                <span className="text-lg font-heading font-bold">{d.count}</span>
                <div className={`w-16 rounded-t-lg ${colors[i]}`} style={{ height: `${Math.max(pct, 8)}%` }} />
                <span className="text-xs text-muted-foreground font-medium">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
