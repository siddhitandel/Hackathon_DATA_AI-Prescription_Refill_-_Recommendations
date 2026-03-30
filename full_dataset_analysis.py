import pandas as pd
import warnings
warnings.filterwarnings('ignore')

print("\n" + "="*70)
print("LATE REFILL ANALYSIS - FULL DATASET")
print("="*70)

# Load data
df = pd.read_csv('DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv', 
                  dtype={'DESYNPUF_ID': str, 'PROD_SRVC_ID': str})

df['SRVC_DT'] = pd.to_datetime(df['SRVC_DT'], format='%Y%m%d')
df = df.sort_values(['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT']).reset_index(drop=True)

# Compute late refills
df['EXPECTED_RUNOUT'] = df['SRVC_DT'] + pd.to_timedelta(df['DAYS_SUPLY_NUM'], unit='D')
df['NEXT_FILL_DT'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['SRVC_DT'].shift(-1)
df['DAYS_LATE'] = (df['NEXT_FILL_DT'] - df['EXPECTED_RUNOUT']).dt.days
df['IS_LATE'] = ((df['DAYS_LATE'] > 7) & df['DAYS_LATE'].notna()).astype(int)

# Total patients
total_patients = df['DESYNPUF_ID'].nunique()

# Patients with at least one late refill
patients_with_late = df[df['IS_LATE'] == 1]['DESYNPUF_ID'].nunique()
patients_never_late = total_patients - patients_with_late

pct_with_late = (patients_with_late / total_patients) * 100

print(f"\n📊 PATIENT-LEVEL RESULTS (from full dataset)")
print(f"\nTotal unique patients: {total_patients:,}")
print(f"Patients with at least 1 late refill: {patients_with_late:,} ({pct_with_late:.1f}%)")
print(f"Patients with NO late refills: {patients_never_late:,} ({100-pct_with_late:.1f}%)")

# By patient late rate
patient_stats = df[df['NEXT_FILL_DT'].notna()].groupby('DESYNPUF_ID').agg({
    'IS_LATE': ['sum', 'count'],
}).reset_index()
patient_stats.columns = ['DESYNPUF_ID', 'late_count', 'total_fills']
patient_stats['late_rate'] = patient_stats['late_count'] / patient_stats['total_fills']

print(f"\n--- PATIENT SEGMENTS BY LATE RATE ---")
always_on_time = (patient_stats['late_rate'] == 0).sum()
low_late = ((patient_stats['late_rate'] > 0) & (patient_stats['late_rate'] <= 0.25)).sum()
medium_late = ((patient_stats['late_rate'] > 0.25) & (patient_stats['late_rate'] <= 0.75)).sum()
high_late = (patient_stats['late_rate'] > 0.75).sum()

print(f"Always on-time (0% late):           {always_on_time:,} ({always_on_time/len(patient_stats)*100:.1f}%)")
print(f"Low risk (1-25% late):              {low_late:,} ({low_late/len(patient_stats)*100:.1f}%)")
print(f"Medium risk (25-75% late):          {medium_late:,} ({medium_late/len(patient_stats)*100:.1f}%)")
print(f"High risk (>75% late):              {high_late:,} ({high_late/len(patient_stats)*100:.1f}%)")

# Refill-level stats
total_refills = len(df[df['NEXT_FILL_DT'].notna()])
late_refills = df[df['IS_LATE'] == 1].shape[0]
on_time_refills = total_refills - late_refills
late_refill_pct = (late_refills / total_refills) * 100

print(f"\n--- REFILL-LEVEL RESULTS ---")
print(f"Total refill events: {total_refills:,}")
print(f"Late refills: {late_refills:,} ({late_refill_pct:.1f}%)")
print(f"On-time refills: {on_time_refills:,} ({100-late_refill_pct:.1f}%)")

print("\n" + "="*70)
print("KEY INSIGHT:")
print(f"  → {pct_with_late:.0f}% of patients show at least one late refill")
print(f"  → {high_late/len(patient_stats)*100:.0f}% are chronically late (>75% of their refills)")
print("="*70 + "\n")
