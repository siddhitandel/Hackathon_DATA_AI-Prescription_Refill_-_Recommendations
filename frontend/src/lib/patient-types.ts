export interface PatientRecord {
  Risk_Score: number;
  DESYNPUF_ID: string;
  PDE_ID: string;
  SRVC_DT: string;
  PROD_SRVC_ID: string;
  QTY_DSPNSD_NUM: number;
  DAYS_SUPLY_NUM: number;
  PTNT_PAY_AMT: number;
  TOT_RX_CST_AMT: number;
  Year: number;
  BENE_BIRTH_DT: string;
  BENE_DEATH_DT: string;
  BENE_SEX_IDENT_CD: number;
  BENE_RACE_CD: number;
  BENE_ESRD_IND: string;
  SP_STATE_CODE: number;
  BENE_COUNTY_CD: number;
  BENE_HI_CVRAGE_TOT_MONS: number;
  BENE_SMI_CVRAGE_TOT_MONS: number;
  BENE_HMO_CVRAGE_TOT_MONS: number;
  PLAN_CVRG_MOS_NUM: number;
  SP_ALZHDMTA: number;
  SP_CHF: number;
  SP_CHRNKIDN: number;
  SP_CNCR: number;
  SP_COPD: number;
  SP_DEPRESSN: number;
  SP_DIABETES: number;
  SP_ISCHMCHT: number;
  SP_OSTEOPRS: number;
  SP_RA_OA: number;
  SP_STRKETIA: number;
  MEDREIMB_IP: number;
  BENRES_IP: number;
  PPPYMT_IP: number;
  MEDREIMB_OP: number;
  BENRES_OP: number;
  PPPYMT_OP: number;
  MEDREIMB_CAR: number;
  BENRES_CAR: number;
  PPPYMT_CAR: number;
  Was_Hospitalized: number;
  Expected_Run_Out: string;
  Next_Fill_Date: string;
  Days_Late: number;
  Is_Late: number;
  Next_Any_Visit: string;
  Days_Until_Next_Visit: number;
  Is_Late_General: number;
  Age: number;
  Condition_Count: number;
  Out_Of_Pocket_Ratio: number;
  Was_Late_Last_Time: number;
  Drug_Load: number;
  Avg_Past_Gap: number;
  Predicted_Next_Drug: string;
  Next_Best_Action: string;
}

// Feature importance from XGBoost model
export const FEATURE_IMPORTANCE: { feature: string; score: number; label: string; icon: string }[] = [
  { feature: 'Drug_Load', score: 0.7587, label: 'Drug Load (Polypharmacy)', icon: '💊' },
  { feature: 'Cadence_Stability', score: 0.0376, label: 'Cadence Stability', icon: '🔄' },
  { feature: 'Was_Late_Last_Time', score: 0.0362, label: 'Was Late Last Time', icon: '⚠️' },
  { feature: 'Avg_Past_Gap', score: 0.0355, label: 'Avg Past Gap', icon: '📅' },
  { feature: 'Condition_Count', score: 0.0341, label: 'Condition Count', icon: '🏥' },
  { feature: 'Age', score: 0.0338, label: 'Age', icon: '👤' },
  { feature: 'PTNT_PAY_AMT', score: 0.0322, label: 'Patient Pay Amount', icon: '💰' },
  { feature: 'Out_Of_Pocket_Ratio', score: 0.0318, label: 'Out-of-Pocket Ratio', icon: '📊' },
  { feature: 'Early_Refill_Ratio', score: 0.0000, label: 'Early Refill Ratio', icon: '⏰' },
];

export const MODEL_METRICS = {
  xgboost: { rocAuc: 0.8276, prAuc: 0.3437, accuracy: 0.7520, features: 7 },
  logistic: { rocAuc: 0.8284, prAuc: 0.3472, accuracy: 0.7423, features: 7 },
};

export function getRiskLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high';
  if (score >= 0.75) return 'medium';
  return 'low';
}

export function getRiskColor(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'text-destructive';
    case 'medium': return 'text-warning';
    case 'low': return 'text-success';
  }
}

export function getRiskBg(level: 'high' | 'medium' | 'low') {
  switch (level) {
    case 'high': return 'bg-destructive/10 text-destructive';
    case 'medium': return 'bg-warning/10 text-warning';
    case 'low': return 'bg-success/10 text-success';
  }
}

export function getActionIcon(action: string) {
  if (action.includes('Post-Discharge')) return '🚨';
  if (action.includes('Complexity')) return '💊';
  if (action.includes('Adherence')) return '📞';
  return '📋';
}

export function getConditionName(key: string): string {
  const map: Record<string, string> = {
    SP_ALZHDMTA: "Alzheimer's",
    SP_CHF: 'Heart Failure',
    SP_CHRNKIDN: 'Kidney Disease',
    SP_CNCR: 'Cancer',
    SP_COPD: 'COPD',
    SP_DEPRESSN: 'Depression',
    SP_DIABETES: 'Diabetes',
    SP_ISCHMCHT: 'Ischemic Heart',
    SP_OSTEOPRS: 'Osteoporosis',
    SP_RA_OA: 'Arthritis',
    SP_STRKETIA: 'Stroke/TIA',
  };
  return map[key] || key;
}

export function getSexLabel(code: number): string {
  return code === 1 ? 'Male' : 'Female';
}

export function getRaceLabel(code: number): string {
  const map: Record<number, string> = { 1: 'White', 2: 'Black', 3: 'Other', 5: 'Hispanic' };
  return map[code] || 'Unknown';
}

export function calculateCadenceStability(patientRecords: PatientRecord[]): {
  cv: number;
  classification: 'Stable' | 'Moderate' | 'Erratic';
  value: string;
} {
  // Extract valid gaps from patient records
  const gaps = patientRecords
    .map(r => r.Avg_Past_Gap)
    .filter(g => typeof g === 'number' && !isNaN(g));

  // Need at least 2 measurements to calculate variability
  if (gaps.length < 2) {
    return { cv: 0, classification: 'Stable', value: 'N/A' };
  }

  // Calculate coefficient of variation
  const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length;
  const std = Math.sqrt(variance);
  const cv = mean !== 0 ? Math.abs(std / mean) : 0;

  let classification: 'Stable' | 'Moderate' | 'Erratic';
  if (cv < 0.3) classification = 'Stable';
  else if (cv < 0.7) classification = 'Moderate';
  else classification = 'Erratic';

  return { cv, classification, value: cv.toFixed(2) };
}
