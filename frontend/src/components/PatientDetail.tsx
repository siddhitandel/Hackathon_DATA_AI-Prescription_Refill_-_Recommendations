import { useMemo } from 'react';
import { X, User, Pill, Heart, Brain, Clock, DollarSign, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { PatientRecord } from '@/lib/patient-types';
import { getRiskLevel, getRiskBg, getActionIcon, getConditionName, getSexLabel, getRaceLabel, FEATURE_IMPORTANCE, calculateCadenceStability } from '@/lib/patient-types';

interface PatientDetailProps {
  patient: PatientRecord;
  allRecords: PatientRecord[];
  onClose: () => void;
}

export default function PatientDetail({ patient, allRecords, onClose }: PatientDetailProps) {
  const level = getRiskLevel(patient.Risk_Score);

  // All records for this patient (timeline)
  const patientRecords = useMemo(() =>
    allRecords
      .filter(r => String(r.DESYNPUF_ID) === String(patient.DESYNPUF_ID))
      .sort((a, b) => (a.SRVC_DT > b.SRVC_DT ? 1 : -1)),
    [allRecords, patient.DESYNPUF_ID]
  );

  // Calculate cadence stability for this patient
  const cadenceStability = useMemo(() => 
    calculateCadenceStability(patientRecords),
    [patientRecords]
  );

  const conditions = [
    'SP_ALZHDMTA', 'SP_CHF', 'SP_CHRNKIDN', 'SP_CNCR', 'SP_COPD',
    'SP_DEPRESSN', 'SP_DIABETES', 'SP_ISCHMCHT', 'SP_OSTEOPRS', 'SP_RA_OA', 'SP_STRKETIA'
  ].filter(c => (patient as any)[c] === 1);

  // Top drivers for this patient
  const topDrivers = useMemo(() => {
    return FEATURE_IMPORTANCE
      .filter(f => f.score > 0 && f.feature !== 'Cadence_Stability')
      .map(f => {
        const val = (patient as any)[f.feature];
        return { ...f, value: val !== undefined ? val : 'N/A' };
      })
      .slice(0, 5);
  }, [patient]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-border/50">
          <h2 className="font-heading font-bold text-lg">Patient Profile</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="p-5 space-y-5">
          {/* ID & Risk */}
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 rounded-full p-3">
              <User className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
              <p className="font-mono text-sm text-muted-foreground">{patient.DESYNPUF_ID}</p>
              <p className="text-xs text-muted-foreground">PDE: {patient.PDE_ID}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getRiskBg(level)} border-0 text-base font-bold px-3`}>
                  {(patient.Risk_Score * 100).toFixed(1)}% Risk
                </Badge>
              </div>
            </div>
          </div>

          {/* Demographics */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Age', value: patient.Age },
              { label: 'Sex', value: getSexLabel(patient.BENE_SEX_IDENT_CD) },
              { label: 'Race', value: getRaceLabel(patient.BENE_RACE_CD) },
              { label: 'Year', value: patient.Year },
            ].map(s => (
              <div key={s.label} className="bg-muted/50 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-lg font-heading font-bold">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Prescription Info - ALL fields */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Pill className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold text-sm">Prescription Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Drug ID:</span> <span className="font-mono">{patient.PROD_SRVC_ID}</span></div>
              <div><span className="text-muted-foreground">Service Date:</span> {patient.SRVC_DT}</div>
              <div><span className="text-muted-foreground">Quantity:</span> {patient.QTY_DSPNSD_NUM}</div>
              <div><span className="text-muted-foreground">Days Supply:</span> {patient.DAYS_SUPLY_NUM}</div>
              <div><span className="text-muted-foreground">Total Cost:</span> ${patient.TOT_RX_CST_AMT}</div>
              <div><span className="text-muted-foreground">Patient Pay:</span> ${patient.PTNT_PAY_AMT}</div>
              <div><span className="text-muted-foreground">OOP Ratio:</span> {(patient.Out_Of_Pocket_Ratio * 100).toFixed(1)}%</div>
              <div><span className="text-muted-foreground">Drug Load:</span> {patient.Drug_Load}</div>
            </div>
          </div>

          {/* Refill & Timing */}
          <div className="bg-muted/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-secondary" />
              <h3 className="font-heading font-semibold text-sm">Refill & Timing</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Expected Run Out:</span> {patient.Expected_Run_Out || 'N/A'}</div>
              <div><span className="text-muted-foreground">Next Fill Date:</span> {patient.Next_Fill_Date || 'N/A'}</div>
              <div><span className="text-muted-foreground">Days Late:</span> {patient.Days_Late ?? 'N/A'}</div>
              <div><span className="text-muted-foreground">Is Late:</span> {patient.Is_Late === 1 ? 'Yes' : 'No'}</div>
              <div><span className="text-muted-foreground">Next Any Visit:</span> {patient.Next_Any_Visit || 'N/A'}</div>
              <div><span className="text-muted-foreground">Days Until Next Visit:</span> {patient.Days_Until_Next_Visit}</div>
              <div><span className="text-muted-foreground">Is Late (General):</span> {patient.Is_Late_General === 1 ? 'Yes' : 'No'}</div>
              <div><span className="text-muted-foreground">Was Late Last Time:</span> {patient.Was_Late_Last_Time === 1 ? 'Yes' : 'No'}</div>
              <div><span className="text-muted-foreground">Avg Past Gap:</span> {typeof patient.Avg_Past_Gap === 'number' ? patient.Avg_Past_Gap.toFixed(1) : 'N/A'} days</div>
              <div><span className="text-muted-foreground">Was Hospitalized:</span> {patient.Was_Hospitalized === 1 ? 'Yes' : 'No'}</div>
            </div>
          </div>

          {/* Cadence Stability */}
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-heading font-semibold text-sm">Cadence Stability</h3>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Patient refill consistency (CV of gaps)</p>
              <div className="flex items-end gap-4 justify-center">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-2xl font-heading font-bold">{cadenceStability.value}</span>
                  <span className="text-xs text-muted-foreground">CV</span>
                </div>
                <Badge className={
                  cadenceStability.classification === 'Stable' 
                    ? 'bg-success/10 text-success border-success/50'
                    : cadenceStability.classification === 'Moderate'
                    ? 'bg-warning/10 text-warning border-warning/50'
                    : 'bg-destructive/10 text-destructive border-destructive/50'
                }>
                  {cadenceStability.classification}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Based on {patientRecords.length} prescription records
              </p>
            </div>
          </div>

          {/* Conditions */}
          {conditions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-destructive" />
                <h3 className="font-heading font-semibold text-sm">Active Conditions ({patient.Condition_Count})</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {conditions.map(c => (
                  <Badge key={c} variant="secondary" className="text-xs">{getConditionName(c)}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Top Risk Drivers for this patient */}
          <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-accent" />
              <h3 className="font-heading font-semibold text-sm">Top Risk Drivers</h3>
            </div>
            <div className="space-y-2">
              {topDrivers.map(d => (
                <div key={d.feature} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{d.icon} {d.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">{typeof d.value === 'number' ? d.value.toFixed(2) : d.value}</span>
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-accent rounded-full" style={{ width: `${Math.min(d.score / 0.76 * 100, 100)}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="font-heading font-semibold text-sm">AI Recommendation</h3>
            </div>
            <p className="text-sm">
              {getActionIcon(patient.Next_Best_Action || '')} {patient.Next_Best_Action}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Predicted next drug: <span className="font-mono">{patient.Predicted_Next_Drug}</span>
            </p>
          </div>

          {/* Patient Timeline (all records for this patient) */}
          {patientRecords.length > 1 && (
            <div>
              <h3 className="font-heading font-semibold text-sm mb-3">📅 Prescription Timeline ({patientRecords.length} records)</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {patientRecords.map((r, i) => (
                  <div key={i} className={`flex items-center gap-3 p-2 rounded-lg text-sm ${String(r.PDE_ID) === String(patient.PDE_ID) ? 'bg-primary/10 border border-primary/30' : 'bg-muted/30'}`}>
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: r.Is_Late_General === 1 ? 'hsl(0, 72%, 55%)' : 'hsl(152, 60%, 42%)' }} />
                    <span className="font-mono text-xs">{r.SRVC_DT}</span>
                    <span className="text-muted-foreground">{r.PROD_SRVC_ID}</span>
                    <span className="ml-auto font-medium">{(r.Risk_Score * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
