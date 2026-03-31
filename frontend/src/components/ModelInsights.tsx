import { useMemo } from 'react';
import { Award, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { FEATURE_IMPORTANCE, MODEL_METRICS } from '@/lib/patient-types';

export default function ModelInsights() {
  const featureData = useMemo(() =>
    FEATURE_IMPORTANCE.map(f => ({
      name: f.label,
      score: f.score,
    })).reverse()
  , []);

  const m = MODEL_METRICS;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* PR-AUC + Calibration Card */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg p-2 bg-primary/10 text-primary">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="font-heading font-semibold">Model Metrics</h3>
        </div>
        <div className="space-y-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">XGBoost</p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div><p className="text-lg font-heading font-bold">{m.xgboost.prAuc}</p><p className="text-[10px] text-muted-foreground">PR-AUC</p></div>
              <div><p className="text-lg font-heading font-bold">{m.xgboost.rocAuc}</p><p className="text-[10px] text-muted-foreground">ROC-AUC</p></div>
              <div><p className="text-lg font-heading font-bold">{(m.xgboost.accuracy * 100).toFixed(1)}%</p><p className="text-[10px] text-muted-foreground">Accuracy</p></div>
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-xs text-muted-foreground">Logistic Regression</p>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <div><p className="text-lg font-heading font-bold">{m.logistic.prAuc}</p><p className="text-[10px] text-muted-foreground">PR-AUC</p></div>
              <div><p className="text-lg font-heading font-bold">{m.logistic.rocAuc}</p><p className="text-[10px] text-muted-foreground">ROC-AUC</p></div>
              <div><p className="text-lg font-heading font-bold">{(m.logistic.accuracy * 100).toFixed(1)}%</p><p className="text-[10px] text-muted-foreground">Accuracy</p></div>
            </div>
          </div>
          <div className="border border-border/50 rounded-lg p-3">
            <p className="text-xs font-medium text-primary">Calibration Check</p>
            <p className="text-xs text-muted-foreground mt-1">Both models show reasonable alignment between predicted probabilities and observed outcomes. Recommend quarterly recalibration.</p>
          </div>
        </div>
      </div>

      {/* Feature Importance / Top Drivers */}
      <div className="glass-card rounded-xl p-5 lg:col-span-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-lg p-2 bg-accent/10 text-accent">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading font-semibold">Top Risk Drivers</h3>
            <p className="text-xs text-muted-foreground">XGBoost feature importance scores</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={featureData} layout="vertical">
            <XAxis type="number" tick={{ fontSize: 11 }} />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={140} />
            <Tooltip formatter={(v: number) => v.toFixed(4)} />
            <Bar dataKey="score" fill="hsl(210, 90%, 45%)" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
