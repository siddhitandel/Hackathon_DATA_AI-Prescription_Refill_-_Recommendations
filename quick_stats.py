import pandas as pd

# Quick analysis from prediction results
preds = pd.read_csv('challenge_a_predictions.csv')

total_fills = len(preds)
late_fills = (preds['IS_LATE'] == 1).sum()
on_time_fills = (preds['IS_LATE'] == 0).sum()

late_pct = (late_fills / total_fills) * 100

print("="*70)
print("LATE REFILL ANALYSIS - TEST SET (Challenge A)")
print("="*70)
print(f"\nTotal refill events (test): {total_fills}")
print(f"Late refills (>7 days):     {late_fills} ({late_pct:.1f}%)")
print(f"On-time refills:            {on_time_fills} ({100-late_pct:.1f}%)")

# By patient
patients = preds.groupby('DESYNPUF_ID').agg({
    'IS_LATE': ['sum', 'count']
}).reset_index()
patients.columns = ['DESYNPUF_ID', 'late_count', 'total']
patients['late_rate'] = patients['late_count'] / patients['total']

print(f"\n--- PATIENT-LEVEL BREAKDOWN ---")
print(f"Unique patients:  {len(patients)}")
print(f"Average late rate per patient: {patients['late_rate'].mean():.1%}")

# Risk categories
high_risk = (patients['late_rate'] >= 0.5).sum()
low_risk = (patients['late_rate'] < 0.5).sum()

print(f"\nPatients with >50% late refills: {high_risk} ({high_risk/len(patients)*100:.1f}%)")
print(f"Patients with ≤50% on-time rate: {low_risk} ({low_risk/len(patients)*100:.1f}%)")

print("\n" + "="*70)
