"""
Pharmacy2U Hackathon - Challenge A: Late Refill Risk Prediction

OBJECTIVE:
Predict which patient-drug pairs are likely to refill late (>7 days after expected run-out).
Use temporal validation and evaluate with PR-AUC metric.

TYPICAL WORKFLOW:
    python challenge_a.py

OUTPUT FILES:
    - challenge_a_model.pkl          Model checkpoint
    - challenge_a_predictions.csv    Risk scores for test set
    - challenge_a_report.txt         Summary metrics and insights

DATA:
    Input: DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv
    Columns used:
      - DESYNPUF_ID: Patient ID
      - SRVC_DT: Service/fill date (YYYYMMDD)
      - PROD_SRVC_ID: Drug code
      - DAYS_SUPLY_NUM: Expected duration (days)
      - QTY_DSPNSD_NUM: Quantity dispensed
"""

from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import precision_recall_curve, auc, roc_auc_score
import pickle
import warnings
warnings.filterwarnings('ignore')

# ============================================================================
# CONFIGURATION
# ============================================================================

DATA_FILE = Path('DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv')
SAMPLE_FRACTION = 0.2  # Use 20% for faster iteration (set to 1.0 for full data)
GRACE_WINDOW_DAYS = 7  # Days past expected runout to consider "late"
RANDOM_STATE = 42

# ============================================================================
# STEP 1: LOAD AND PREPARE DATA
# ============================================================================

def load_and_prepare_data(fraction=SAMPLE_FRACTION):
    """Load prescription data and compute timing features."""
    print("\n" + "="*70)
    print("STEP 1: LOADING & PREPARING DATA")
    print("="*70)
    
    # Load
    print(f"\n→ Loading data from {DATA_FILE.name}...")
    df = pd.read_csv(
        DATA_FILE,
        dtype={'DESYNPUF_ID': str, 'PROD_SRVC_ID': str}
    )
    print(f"  Total records: {len(df):,}")
    
    # Sample
    if fraction < 1.0:
        df = df.sample(frac=fraction, random_state=RANDOM_STATE).reset_index(drop=True)
        print(f"  After sampling {int(fraction*100)}%: {len(df):,} records")
    
    # Convert dates and sort
    df['SRVC_DT'] = pd.to_datetime(df['SRVC_DT'], format='%Y%m%d')
    df = df.sort_values(['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT']).reset_index(drop=True)
    
    patients = df['DESYNPUF_ID'].nunique()
    print(f"  Unique patients: {patients:,}")
    print(f"  Date range: {df['SRVC_DT'].min().date()} to {df['SRVC_DT'].max().date()}")
    
    return df


# ============================================================================
# STEP 2: COMPUTE LABELS
# ============================================================================

def compute_labels(df, grace_window=GRACE_WINDOW_DAYS):
    """
    Compute whether each fill leads to a LATE next refill.
    
    Late = next fill occurs >grace_window days after expected runout
    Expected runout = fill_date + days_supply
    """
    print("\n" + "="*70)
    print("STEP 2: COMPUTING LABELS")
    print("="*70)
    
    df = df.copy()
    
    # Expected runout date
    df['EXPECTED_RUNOUT'] = df['SRVC_DT'] + pd.to_timedelta(df['DAYS_SUPLY_NUM'], unit='D')
    
    # Next fill per patient-product
    df['NEXT_FILL_DT'] = df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID'])['SRVC_DT'].shift(-1)
    
    # Days from expected runout to actual next fill
    df['DAYS_LATE'] = (df['NEXT_FILL_DT'] - df['EXPECTED_RUNOUT']).dt.days
    
    # Label: late if >grace_window days after expected runout AND next fill exists
    df['IS_LATE'] = ((df['DAYS_LATE'] > grace_window) & df['DAYS_LATE'].notna()).astype(int)
    
    # Non-censored: rows where we have a next fill to evaluate
    labeled = df[df['NEXT_FILL_DT'].notna()].copy()
    
    late_count = labeled['IS_LATE'].sum()
    total_count = len(labeled)
    late_pct = (late_count / total_count) * 100
    
    print(f"\n→ Label computation complete:")
    print(f"  Non-censored fills (have next fill): {total_count:,}")
    print(f"  Late refills (>={grace_window+1} days late): {late_count:,} ({late_pct:.1f}%)")
    print(f"  On-time refills: {total_count - late_count:,} ({100-late_pct:.1f}%)")
    
    return labeled


# ============================================================================
# STEP 3: FEATURE ENGINEERING
# ============================================================================

def build_features(df):
    """Create features for prediction."""
    print("\n" + "="*70)
    print("STEP 3: FEATURE ENGINEERING")
    print("="*70)
    
    features = []
    
    for (patient_id, prod_id), group in df.groupby(['DESYNPUF_ID', 'PROD_SRVC_ID']):
        group = group.sort_values('SRVC_DT').reset_index(drop=True)
        
        for idx in range(len(group)):
            row = group.iloc[idx]
            
            # Only use if we have a label
            if pd.isna(row['IS_LATE']):
                continue
            
            # Historical prior fills
            prior = group.iloc[:idx] if idx > 0 else pd.DataFrame()
            
            feat_dict = {
                'DESYNPUF_ID': patient_id,
                'PROD_SRVC_ID': prod_id,
                'SRVC_DT': row['SRVC_DT'],
                'FILL_NUM': idx,  # Fill position in sequence
                'DAYS_SUPLY': row['DAYS_SUPLY_NUM'],
                'QTY_DSPNSD': row['QTY_DSPNSD_NUM'],
                'IS_LATE': row['IS_LATE'],
            }
            
            # Historical features (if available)
            if len(prior) > 0:
                prior_gaps = prior['DAYS_SUPLY_NUM'].values
                feat_dict['AVG_PRIOR_GAP'] = prior_gaps.mean()
                feat_dict['STD_PRIOR_GAP'] = prior_gaps.std()
                feat_dict['NUM_PRIOR_FILLS'] = len(prior)
            else:
                feat_dict['AVG_PRIOR_GAP'] = row['DAYS_SUPLY_NUM']
                feat_dict['STD_PRIOR_GAP'] = 0
                feat_dict['NUM_PRIOR_FILLS'] = 0
            
            features.append(feat_dict)
    
    X = pd.DataFrame(features)
    print(f"\n→ Features built:")
    print(f"  Total feature rows: {len(X):,}")
    print(f"  Feature columns: {list(X.columns)}")
    
    return X


# ============================================================================
# STEP 4: TRAIN/TEST SPLIT
# ============================================================================

def temporal_split(X, test_fraction=0.33):
    """Split by date to prevent leakage."""
    print("\n" + "="*70)
    print("STEP 4: TEMPORAL TRAIN/TEST SPLIT")
    print("="*70)
    
    split_date = X['SRVC_DT'].quantile(1 - test_fraction)
    
    X_train = X[X['SRVC_DT'] < split_date].copy()
    X_test = X[X['SRVC_DT'] >= split_date].copy()
    
    print(f"\n→ Split at date: {split_date.date()}")
    print(f"  Train set: {len(X_train):,} fills ({len(X_train)/len(X)*100:.0f}%)")
    print(f"  Test set:  {len(X_test):,} fills ({len(X_test)/len(X)*100:.0f}%)")
    
    train_late_pct = X_train['IS_LATE'].mean() * 100
    test_late_pct = X_test['IS_LATE'].mean() * 100
    print(f"  Train late rate: {train_late_pct:.1f}%")
    print(f"  Test late rate:  {test_late_pct:.1f}%")
    
    return X_train, X_test


# ============================================================================
# STEP 5: MODEL TRAINING
# ============================================================================

def train_model(X_train):
    """Train logistic regression on training set."""
    print("\n" + "="*70)
    print("STEP 5: MODEL TRAINING")
    print("="*70)
    
    # Features to use
    feature_cols = ['DAYS_SUPLY', 'QTY_DSPNSD', 'FILL_NUM', 'AVG_PRIOR_GAP', 'STD_PRIOR_GAP', 'NUM_PRIOR_FILLS']
    
    # Clean data
    X_feat = X_train[feature_cols].fillna(0)
    y = X_train['IS_LATE']
    
    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X_feat)
    
    # Train model
    model = LogisticRegression(max_iter=1000, random_state=RANDOM_STATE)
    model.fit(X_scaled, y)
    
    print(f"\n→ Model trained:")
    print(f"  Algorithm: Logistic Regression")
    print(f"  Features used: {len(feature_cols)}")
    print(f"  Train samples: {len(X_train)}")
    
    # Feature importance
    coefs = pd.DataFrame({
        'Feature': feature_cols,
        'Coef': model.coef_[0]
    }).sort_values('Coef', key=abs, ascending=False)
    
    print(f"\n→ Top feature drivers:")
    for i, row in coefs.head(3).iterrows():
        print(f"  {row['Feature']:20s}: {row['Coef']:7.3f}")
    
    return model, scaler, feature_cols


# ============================================================================
# STEP 6: EVALUATION
# ============================================================================

def evaluate_model(model, scaler, X_test, feature_cols):
    """Evaluate on test set."""
    print("\n" + "="*70)
    print("STEP 6: MODEL EVALUATION")
    print("="*70)
    
    # Prepare test data
    X_feat = X_test[feature_cols].fillna(0)
    y_true = X_test['IS_LATE']
    
    X_scaled = scaler.transform(X_feat)
    y_pred_proba = model.predict_proba(X_scaled)[:, 1]
    
    # Metrics
    precision, recall, _ = precision_recall_curve(y_true, y_pred_proba)
    pr_auc = auc(recall, precision)
    roc_auc = roc_auc_score(y_true, y_pred_proba)
    
    print(f"\n→ Test set metrics:")
    print(f"  PR-AUC (primary):  {pr_auc:.3f}")
    print(f"  ROC-AUC:           {roc_auc:.3f}")
    
    # Risk distribution
    high_risk = (y_pred_proba > 0.7).sum()
    medium_risk = ((y_pred_proba >= 0.5) & (y_pred_proba <= 0.7)).sum()
    low_risk = (y_pred_proba < 0.5).sum()
    
    print(f"\n→ Risk distribution (test set):")
    print(f"  High risk (>0.7):    {high_risk:,} ({high_risk/len(y_pred_proba)*100:.1f}%)")
    print(f"  Medium risk (0.5-0.7): {medium_risk:,} ({medium_risk/len(y_pred_proba)*100:.1f}%)")
    print(f"  Low risk (<0.5):     {low_risk:,} ({low_risk/len(y_pred_proba)*100:.1f}%)")
    
    return y_pred_proba, {'pr_auc': pr_auc, 'roc_auc': roc_auc}


# ============================================================================
# STEP 7: SAVE OUTPUTS
# ============================================================================

def save_outputs(model, scaler, X_test, y_pred_proba, metrics, feature_cols):
    """Save model, predictions, and report."""
    print("\n" + "="*70)
    print("STEP 7: SAVING OUTPUTS")
    print("="*70)
    
    # Save model
    with open('challenge_a_model.pkl', 'wb') as f:
        pickle.dump({'model': model, 'scaler': scaler, 'features': feature_cols}, f)
    print(f"\n✓ Saved model to challenge_a_model.pkl")
    
    # Save predictions
    predictions = X_test[['DESYNPUF_ID', 'PROD_SRVC_ID', 'SRVC_DT', 'IS_LATE']].copy()
    predictions['RISK_SCORE'] = y_pred_proba
    predictions = predictions.sort_values('RISK_SCORE', ascending=False)
    predictions.to_csv('challenge_a_predictions.csv', index=False)
    print(f"✓ Saved predictions to challenge_a_predictions.csv")
    
    # Save report
    with open('challenge_a_report.txt', 'w') as f:
        f.write("PHARMACY2U - CHALLENGE A: LATE REFILL RISK PREDICTION\n")
        f.write("="*70 + "\n\n")
        f.write(f"PR-AUC Score: {metrics['pr_auc']:.3f}\n")
        f.write(f"ROC-AUC Score: {metrics['roc_auc']:.3f}\n")
        f.write(f"\nTest set size: {len(X_test)}\n")
        f.write(f"High-risk patients (score >0.7): {(y_pred_proba > 0.7).sum()}\n")
    print(f"✓ Saved report to challenge_a_report.txt")
    
    print("\n✓ All outputs saved successfully!")


# ============================================================================
# MAIN
# ============================================================================

def main():
    print("\n")
    print("█" * 70)
    print("█  PHARMACY2U - CHALLENG A: LATE REFILL RISK PREDICTION")
    print("█" * 70)
    
    # Load
    df = load_and_prepare_data(SAMPLE_FRACTION)
    
    # Label
    df_labeled = compute_labels(df, GRACE_WINDOW_DAYS)
    
    # Features
    X = build_features(df_labeled)
    
    # Split
    X_train, X_test = temporal_split(X)
    
    # Train
    model, scaler, feature_cols = train_model(X_train)
    
    # Evaluate
    y_pred_proba, metrics = evaluate_model(model, scaler, X_test, feature_cols)
    
    # Save
    save_outputs(model, scaler, X_test, y_pred_proba, metrics, feature_cols)
    
    print("\n" + "="*70)
    print("✓ PIPELINE COMPLETE")
    print("="*70)
    print(f"\nNext steps:")
    print(f"  1. Review challenge_a_predictions.csv for risk scores")
    print(f"  2. Check challenge_a_report.txt for metrics")
    print(f"  3. Modify SAMPLE_FRACTION to use full data (set to 1.0)")
    print("\n")


if __name__ == '__main__':
    main()
