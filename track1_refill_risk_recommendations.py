"""Hackathon Track 1: Prescription Refill Risk & Recommendations

Using sample PDE dataset: DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv

Outputs:
- patient-level refill risk scores
- product transition "next-best" recommendations

Instructions:
    python track1_refill_risk_recommendations.py
"""
from pathlib import Path
import pandas as pd

DATA_PATH = Path(__file__).with_name('DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv')


def load_data(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype={'DESYNPUF_ID': str, 'PROD_SRVC_ID': str})
    df['SRVC_DT'] = pd.to_datetime(df['SRVC_DT'], format='%Y%m%d')
    df.sort_values(['DESYNPUF_ID', 'SRVC_DT'], inplace=True)
    return df


def compute_refill_risk(df: pd.DataFrame, late_threshold_days: int = 2) -> pd.DataFrame:
    # For each patient-product journey, derive actual inter-refill gap vs expected
    df = df.copy()
    df['PRIOR_SRVC_DT'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['SRVC_DT'].shift(1)
    df['PRIOR_DAYS_SUPPLY'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['DAYS_SUPLY_NUM'].shift(1)
    df['EXPECTED_REFILL_DT'] = df['PRIOR_SRVC_DT'] + pd.to_timedelta(df['PRIOR_DAYS_SUPPLY'], unit='D')
    df['LATE_DAYS'] = (df['SRVC_DT'] - df['EXPECTED_REFILL_DT']).dt.days
    # first fill of a product has no prior, leave NaN
    df['LATE_DAYS'] = df['LATE_DAYS'].fillna(0).clip(lower=0)
    df['IS_LATE'] = df['LATE_DAYS'] > late_threshold_days

    summary = df.groupby('DESYNPUF_ID').agg(
        total_refills=('SRVC_DT', 'count'),
        late_refills=('IS_LATE', 'sum'),
        avg_late_days=('LATE_DAYS', 'mean'),
    ).reset_index()
    summary['late_rate'] = summary['late_refills'] / summary['total_refills']
    # risk score [0,100]
    summary['refill_risk_score'] = (summary['late_rate'] * 60 + (summary['avg_late_days'] / 30) * 40).clip(0, 100)
    return df, summary


def build_transition_recommendations(df: pd.DataFrame, top_n: int = 5) -> pd.DataFrame:
    # Build product-to-product next-fill transitions for all patients
    df = df.copy()
    df['NEXT_PROD'] = df.groupby('DESYNPUF_ID')['PROD_SRVC_ID'].shift(-1)
    valid = df.dropna(subset=['NEXT_PROD'])

    transitions = (valid
                   .groupby(['PROD_SRVC_ID', 'NEXT_PROD'])
                   .size()
                   .reset_index(name='count')
                   .sort_values(['PROD_SRVC_ID', 'count'], ascending=[True, False]))

    recommendations = (transitions
                       .groupby('PROD_SRVC_ID')
                       .head(top_n)
                       .assign(rank=lambda x: x.groupby('PROD_SRVC_ID')['count'].rank(method='first', ascending=False)))
    return recommendations


def main():
    print('Loading data...')
    df = load_data(DATA_PATH)

    print('Computing refill risk metrics...')
    df_risk_detail, patient_risk = compute_refill_risk(df)
    patient_risk.sort_values('refill_risk_score', ascending=False, inplace=True)
    patient_risk.to_csv('patient_refill_risk_scores.csv', index=False)

    print('Building next-best transition recommendations...')
    recommendations = build_transition_recommendations(df)
    recommendations.to_csv('prod_transitions_recommendations.csv', index=False)

    high_risk = patient_risk[patient_risk['refill_risk_score'] >= 70]
    high_risk.to_csv('high_risk_patients.csv', index=False)

    print('Completed: generated patient_refill_risk_scores.csv, high_risk_patients.csv, prod_transitions_recommendations.csv')


if __name__ == '__main__':
    main()
