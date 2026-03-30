import pandas as pd
import numpy as np

# Load prescription data
df = pd.read_csv('DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv', dtype={'DESYNPUF_ID': str})

# Prepare features
df['SRVC_DT'] = pd.to_datetime(df['SRVC_DT'], format='%Y%m%d')
df = df.sort_values(['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT']).reset_index(drop=True)

# Compute next fill timing
df['EXPECTED_RUNOUT'] = df['SRVC_DT'] + pd.to_timedelta(df['DAYS_SUPLY_NUM'], unit='D')
df['NEXT_FILL_DT'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['SRVC_DT'].shift(-1)
df['DAYS_LATE'] = (df['NEXT_FILL_DT'] - df['EXPECTED_RUNOUT']).dt.days
df['IS_LATE'] = ((df['DAYS_LATE'] > 7) & df['DAYS_LATE'].notna()).astype(int)

# Aggregate by patient
patient_stats = df[df['NEXT_FILL_DT'].notna()].groupby('DESYNPUF_ID').agg({
    'IS_LATE': ['sum', 'count'],
    'DAYS_LATE': 'mean'
}).reset_index()

patient_stats.columns = ['DESYNPUF_ID', 'late_count', 'total_fills', 'avg_days_late']
patient_stats['late_rate'] = patient_stats['late_count'] / patient_stats['total_fills']
patient_stats['is_late_prone'] = (patient_stats['late_rate'] > 0.5).astype(int)

print("="*70)
print("LATE REFILL STATISTICS - ALL PATIENTS")
print("="*70)
print(f"\nTotal patients in dataset: {len(patient_stats):,}")
print(f"Total refill events analyzed: {patient_stats['total_fills'].sum():,}")
print(f"Total late refills: {patient_stats['late_count'].sum():,}")

overall_late_pct = (patient_stats['late_count'].sum() / patient_stats['total_fills'].sum()) * 100
print(f"\n📊 OVERALL: {overall_late_pct:.1f}% of all refills are LATE")

# By patient type
print(f"\n--- PATIENT SEGMENTS ---")
on_time_patients = (patient_stats['late_rate'] == 0).sum()
mostly_on_time = ((patient_stats['late_rate'] > 0) & (patient_stats['late_rate'] <= 0.25)).sum()
mixed = ((patient_stats['late_rate'] > 0.25) & (patient_stats['late_rate'] <= 0.75)).sum()
late_prone = (patient_stats['late_rate'] > 0.75).sum()

print(f"Always on-time (0% late):        {on_time_patients:,} patients ({on_time_patients/len(patient_stats)*100:.1f}%)")
print(f"Mostly on-time (1-25% late):     {mostly_on_time:,} patients ({mostly_on_time/len(patient_stats)*100:.1f}%)")
print(f"Mixed behavior (25-75% late):    {mixed:,} patients ({mixed/len(patient_stats)*100:.1f}%)")
print(f"Late-prone (>75% late):          {late_prone:,} patients ({late_prone/len(patient_stats)*100:.1f}%)")

print(f"\n--- RISK TIERS ---")
high_risk = (patient_stats['late_rate'] > 0.5).sum()
low_risk = (patient_stats['late_rate'] <= 0.5).sum()

print(f"HIGH RISK (>50% late):  {high_risk:,} patients ({high_risk/len(patient_stats)*100:.1f}%)")
print(f"LOW RISK (≤50% late):   {low_risk:,} patients ({low_risk/len(patient_stats)*100:.1f}%)")

print(f"\n--- STATISTICS ---")
print(f"Average days late (when late):   {patient_stats[patient_stats['DAYS_LATE'] > 0]['avg_days_late'].mean():.1f} days")
print(f"Median patient late rate:        {patient_stats['late_rate'].median():.1%}")
print(f"Max patient late rate:           {patient_stats['late_rate'].max():.1%}")

print("\n" + "="*70)
