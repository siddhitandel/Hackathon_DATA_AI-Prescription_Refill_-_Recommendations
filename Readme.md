
---

# Pharmacy2U — Late Refill Risk Prediction (Challenge A)

## Overview

Predicts which Medicare patients are at risk of late prescription refills using CMS DE-SynPUF data. Produces a continuous risk score (0–1) per patient, identifies the top drivers of non-adherence, and recommends next-best clinical actions.

## Repository Structure

```
├── hackathon_pipeline.ipynb   # Full ML pipeline (data prep → model → evaluation)
├── backend/
│   ├── app.py                 # Flask API serving risk scores & patient data
│   ├── requirements.txt
│   └── data/
│       └── final_delivery_data.csv   # Model output: risk scores + actions
├── streamlit/
│   ├── dashboard.py           # Interactive analytics dashboard
│   └── requirements.txt
├── frontend/                  # React UI (optional, requires npm)
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Quick Start — Reproduce Our Results

### Prerequisites

- Python 3.10+
- pip

### 1. Run the ML Pipeline

```bash
pip install pandas scikit-learn xgboost matplotlib seaborn
jupyter notebook hackathon_pipeline.ipynb
```

Run all cells in order. This will:
- Load and clean the CMS prescription + beneficiary data
- Engineer features (Age, Condition_Count, Drug_Load, Avg_Past_Gap, etc.)
- Train XGBoost with time-based validation
- Output `final_delivery_data.csv` with risk scores and next-best actions

**Input data**: Place the CMS DE-SynPUF files in a `Data/` folder:
- `DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.csv`
- `DE1_0_2008_Beneficiary_Summary_File_Sample_1.csv`
- `DE1_0_2009_Beneficiary_Summary_File_Sample_1.csv`
- `DE1_0_2010_Beneficiary_Summary_File_Sample_1.csv`
- Inpatient claims file (any `*Inpatient*` CSV in `Data/`)

### 2. Run the Streamlit Dashboard

```bash
cd streamlit
pip install -r requirements.txt
streamlit run dashboard.py
```

Opens at `http://localhost:8501`. Provides interactive filters, risk distribution charts, and patient lookup.

### 3. Run the Flask API + React Frontend (Optional)

**Terminal 1 — API:**
```bash
cd backend
pip install -r requirements.txt
python app.py
# Runs on http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

## Methodology Summary

| Step | Detail |
|------|--------|
| **Label** | Late = next fill > 7 days after expected run-out (`SRVC_DT + DAYS_SUPLY_NUM`) |
| **Censoring** | Last fill per patient dropped (no future fill to evaluate) |
| **Features** | Age, Condition_Count, Out_Of_Pocket_Ratio, Was_Late_Last_Time, Drug_Load, Avg_Past_Gap, Was_Hospitalized |
| **Model** | XGBoost (scale_pos_weight=13) vs Logistic Regression baseline |
| **Validation** | Time-based split (train on pre-cutoff, test on post-cutoff) |
| **Metric** | PR-AUC (primary), ROC-AUC, calibration check |

## Output Files

- `final_delivery_data.csv` — 2,428 records with risk scores, predicted next drug, and recommended clinical actions
- Streamlit dashboard screenshots (referenced in presentation)

## Team
- Umar Khan 
- Siddhi Tandel 
- Abhisri Ravi 
- Atharva Khamkar 