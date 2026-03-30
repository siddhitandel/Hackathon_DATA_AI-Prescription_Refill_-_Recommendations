"""
Hackathon Track 1: Challenges A & B - Simplified Production Version

CHALLENGE A: Late Refill Risk Prediction
- Simple logistic regression on refill history features
- Labels: late if next fill occurs after (expected_runout + 7 days)
- Metrics: PR-AUC, ROC-AUC

CHALLENGE B: Next-Best  Product Recommendations  
- Markov transition matrix from patient fill sequences
- Recommend top-K next products using learned transitions
- Eval: Recall@K onheld-out test data

Run: python challenges_simple.py
"""

from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score
import warnings
warnings.filterwarnings('ignore')

DATA_PATH = Path(__file__).with_name('DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv')


def load_data():
    """Load and prepare prescription data."""
    print("Loading prescription data...")
    df = pd.read_csv(DATA_PATH, dtype={'DESYNPUF_ID': str, 'PROD_SRVC_ID': str})
    
    # Sample for demo (use 20% for reasonable runtime)
    df = df.sample(frac=0.2, random_state=42).reset_index(drop=True)
    
    df['SRVC_DT'] = pd.to_datetime(df['SRVC_DT'], format='%Y%m%d')
    df = df.sort_values(['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT']).reset_index(drop=True)
    
    print(f"✓ Loaded {len(df):,} events, {df['DESYNPUF_ID'].nunique():,} patients")
    print(f"  Date range: {df['SRVC_DT'].min().date()} to {df['SRVC_DT'].max().date()}")
    
    return df


def prepare_features(df):
    """Compute refill gaps and label late refills."""
    print("\nPreparing features...")
    
    # Compute next fill info per patient-product
    df['EXPECTED_RUNOUT'] = df['SRVC_DT'] + pd.to_timedelta(df['DAYS_SUPLY_NUM'], unit='D')
    df['NEXT_FILL_DT'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['SRVC_DT'].shift(-1)
    df['DAYS_LATE'] = (df['NEXT_FILL_DT'] - df['EXPECTED_RUNOUT']).dt.days
    
    # Label late refills (late if > 7 days after expected)
    df['IS_LATE'] = ((df['DAYS_LATE'] > 7) & df['DAYS_LATE'].notna()).astype(int)
    
    # Historical features from prior fills
    df['PRIOR_GAPS'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['DAYS_LATE'].shift(1)
    df['FILL_NUMBER'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID']).cumcount()
    
    return df


def challenge_a(df):
    """Predict late refill risk."""
    print("\n" + "="*70)
    print("CHALLENGE A: Late Refill Risk Prediction")
    print("="*70)
    
    # Get labeled data with next fills (non-censored)
    X = df[df['NEXT_FILL_DT'].notna()].copy()
    keep_cols = ['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT', 'DAYS_SUPLY_NUM', 
                 'QTY_DSPNSD_NUM', 'TOT_RX_CST_AMT', 'FILL_NUMBER', 'PRIOR_GAPS', 'IS_LATE']
    X = X[keep_cols].copy()
    X = X.dropna(subset=['IS_LATE'])
    
    if len(X) == 0:
        print("No training data available")
        return
    
    # Temporal train/test split
    split_date = X['SRVC_DT'].quantile(0.66)
    X_train = X[X['SRVC_DT'] < split_date]
    X_test = X[X['SRVC_DT'] >= split_date]
    
    print(f"Train: {len(X_train):,} fills, Test: {len(X_test):,} fills")
    print(f"Late rate - Train: {X_train['IS_LATE'].mean():.1%}, Test: {X_test['IS_LATE'].mean():.1%}")
    
    if len(X_train) < 10 or len(X_test) < 5:
        print("Insufficient data for modeling")
        return
    
    # Build model
    feature_cols = ['DAYS_SUPLY_NUM', 'QTY_DSPNSD_NUM', 'FILL_NUMBER']
    id_cols = ['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT']
    
    # Remove rows with any NaN in feature or target columns
    X_model_train = X_train[id_cols + feature_cols + ['IS_LATE']].dropna()
    X_model_test = X_test[id_cols + feature_cols + ['IS_LATE']].dropna()
    
    if len(X_model_train) < 10 or len(X_model_test) < 5:
        print(f"Insufficient data after NaN removal (train: {len(X_model_train)}, test: {len(X_model_test)})")
        return
    
    X_train_feat = X_model_train[feature_cols]
    X_test_feat = X_model_test[feature_cols]
    y_train = X_model_train['IS_LATE']
    y_test = X_model_test['IS_LATE']
    
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_feat)
    X_test_scaled = scaler.transform(X_test_feat)
    
    model = LogisticRegression(max_iter=500, random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # Evaluate
    y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]
    
    precision, recall, _ = precision_recall_curve(y_test, y_pred_proba)
    pr_auc = auc(recall, precision)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    print(f"\nMetrics:")
    print(f"  PR-AUC: {pr_auc:.3f}")
    print(f"  ROC-AUC: {roc_auc:.3f}")
    
    # Feature importance
    coefs = pd.DataFrame({'Feature': feature_cols, 'Coef': model.coef_[0]})
    coefs['AbsCoef'] = coefs['Coef'].abs()
    coefs = coefs.sort_values('AbsCoef', ascending=False)
    print(f"\nTop drivers:")
    for _, row in coefs.head(3).iterrows():
        print(f"  {row['Feature']}: {row['Coef']:.3f}")
    
    # Save predictions
    X_pred = X_model_test.copy()
    X_pred['RISK_SCORE'] = y_pred_proba
    X_pred[id_cols + ['IS_LATE', 'RISK_SCORE']].to_csv(
        'challenge_a_predictions.csv', index=False)
    print(f"\n✓ Saved challenge_a_predictions.csv")


def challenge_b(df):
    """Recommend next-best medications."""
    print("\n" + "="*70)
    print("CHALLENGE B: Pathway-Aware Next-Best Recommendations")
    print("="*70)
    
    # Temporal split
    split_date = df['SRVC_DT'].quantile(0.66)
    df_train = df[df['SRVC_DT'] < split_date]
    df_test = df[df['SRVC_DT'] >= split_date]
    
    # Build transition matrix from training data
    print("Building transition matrix...")
    transitions = {}
    
    for patient_id, patient_fills in df_train.groupby('DESYNPUF_ID'):
        products = patient_fills.sort_values('SRVC_DT')['PROD_SRVC_ID'].values
        for i in range(len(products) - 1):
            key = (products[i], products[i+1])
            transitions[key] = transitions.get(key, 0) + 1
    
    # Build efficient lookup: product -> list of (next_product, count)
    trans_lookup = {}
    for (from_prod, to_prod), count in transitions.items():
        if from_prod not in trans_lookup:
            trans_lookup[from_prod] = []
        trans_lookup[from_prod].append((to_prod, count))
    
    # Sort by count for each product
    for prod in trans_lookup:
        trans_lookup[prod].sort(key=lambda x: x[1], reverse=True)
    
    print(f"Learned {len(transitions):,} transitions from {len(df_train):,} fills")
    
    # Evaluate Recall@K
    def recommend(prod_id, k=5):
        if prod_id in trans_lookup:
            recs = [t[0] for t in trans_lookup[prod_id][:k]]
            return set(recs)
        return set()
    
    # Sample test set for speed
    test_candidates = []
    for patient_id, patient_fills in df_test.groupby('DESYNPUF_ID'):
        products = patient_fills.sort_values('SRVC_DT')['PROD_SRVC_ID'].values
        if len(products) >= 2:
            for i in range(len(products) - 1):
                test_candidates.append((products[i], products[i+1]))
    
    test_sample = test_candidates[::max(1, len(test_candidates)//2000)]  # ~2000 records
    
    print(f"Evaluating on {len(test_sample):,} test transitions...")
    
    recalls = {3: [], 5: [], 10: []}
    for curr_prod, next_prod in test_sample:
        for k in [3, 5, 10]:
            recs = recommend(curr_prod, k=k)
            if next_prod in recs:
                recalls[k].append(1)
            else:
                recalls[k].append(0)
    
    print(f"\nRecall@K:")
    for k in [3, 5, 10]:
        recall = np.mean(recalls[k]) if len(recalls[k]) > 0 else 0
        print(f"  Recall@{k}: {recall:.1%}")
    
    # Demo
    demo_fills = df_test[df_test['DESYNPUF_ID'] == df_test['DESYNPUF_ID'].iloc[0]].sort_values('SRVC_DT')
    if len(demo_fills) > 1:
        print(f"\nDemo patient medication timeline:")
        for i, (_, row) in enumerate(demo_fills.head(5).iterrows()):
            recs = recommend(row['PROD_SRVC_ID'], k=3)
            recs_str = ', '.join(list(recs)[:3]) if recs else 'None'
            print(f"  {row['SRVC_DT'].date()} | Prod {row['PROD_SRVC_ID'][-5:]} → Top recs: {recs_str}")
    
    trans_df = pd.DataFrame([
        {'FROM_PROD': k[0], 'TO_PROD': k[1], 'COUNT': v}
        for k, v in transitions.items()
    ]).sort_values(['FROM_PROD', 'COUNT'], ascending=[True, False])
    trans_df.to_csv('challenge_b_transitions.csv', index=False)
    print(f"\n✓ Saved challenge_b_transitions.csv")


def main():
    print("="*70)
    print("HACKATHON TRACK 1: CHALLENGES A & B")
    print("="*70)
    
    df = load_data()
    df = prepare_features(df)
    
    challenge_a(df)
    challenge_b(df)
    
    print("\n" + "="*70)
    print("COMPLETE")
    print("="*70)


if __name__ == '__main__':
    main()
