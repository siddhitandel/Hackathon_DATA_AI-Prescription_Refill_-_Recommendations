# DATA-AI-Hackathon-Track-1
Pharamcy2U Challenge for the Data&amp;AI Hackathon, 30-31 March 2026, University of Leeds
# Hackathon Track 1: Prescription Refill Risk & Recommendations

**Led by Pharmacy2U**

## Theme

Prescription refill risk & responsible "next-best" recommendations, built only from prescription order events.

This track is inspired by two Pharmacy2U internship themes:
- **(A)** Refill irregularity / adherence risk from dispensing history
- **(B)** Recommendation-style "clinical cross-sell" from medication patterns (with honest limitations)

## Context

Pharmacy2U is the UK's largest online pharmacy, helping patients manage NHS prescriptions digitally and receive medicines at home. At scale, small improvements in understanding prescription event data can have a big impact on patient experience and operational efficiency.

- **Refill regularity**: spotting likely late refills early can support proactive reminders/outreach and reduce avoidable inbound contact.
- **Next-best support**: prescription sequences often reflect a therapy journey; learning common transitions can power more relevant, timely recommendations (e.g., information, support items, or prompts).
- **Responsible framing**: this is **not** clinical advice or prescribing — it's a modelling + product-thinking exercise on synthetic claims-style data.

---

## Dataset

**CMS DE-SynPUF — Prescription Drug Events (PDE), Sample 1 (2008–2010)**

Fully synthetic, Part D-style prescription event data designed for training and software development.

| Resource | Link |
|----------|------|
| CMS Sample 1 page (file list) | https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-claims-synthetic-public-use-files/cms-2008-2010-data-entrepreneurs-synthetic-public-use-file-de-synpuf/de10-sample-1 |
| **Direct PDE ZIP (primary file)** | https://downloads.cms.gov/files/DE1_0_2008_to_2010_Prescription_Drug_Events_Sample_1.zip |
| DE 1.0 Codebook (columns) | https://www.cms.gov/files/document/de-10-codebook.pdf-0 |
| Optional: 2010 Beneficiary Summary | https://www.cms.gov/sites/default/files/2020-09/DE1_0_2010_Beneficiary_Summary_File_Sample_1.zip |
| Backup (if blocked): AWS OMOP mirror | https://registry.opendata.aws/cmsdesynpuf-omop/ |

**Download tip**: if clicking does nothing, paste the "Direct PDE ZIP" URL into your browser address bar (or use `curl -L -O <URL>`).

### Key columns in the PDE file

| Column | Meaning |
|--------|---------|
| `DESYNPUF_ID` | Pseudonymised patient/beneficiary identifier |
| `SRVC_DT` | Prescription fill/service date |
| `PROD_SRVC_ID` | NDC-11 drug product code (the dispensed item) |
| `DAYS_SUPLY_NUM` | Days of supply (expected duration of the fill) |
| `QTY_DSPNSD_NUM` | Quantity dispensed |
| `PTNT_PAY_AMT` | Patient pay amount (cost signal) |
| `TOT_RX_CST_AMT` | Total drug cost (cost signal) |

### Quick glossary

- **NDC-11**: an 11-digit National Drug Code (product identifier for a dispensed medicine)
- **Days of supply**: how long the dispensed quantity is expected to last (e.g., 28/30/90 days)
- **Expected run-out date**: `SRVC_DT + DAYS_SUPLY_NUM`
- **Late refill**: the next fill happens after run-out (often with a grace window like +7 or +14 days)

---

## Choose your challenge

Pick **Challenge A** or **Challenge B**. If you're ambitious you can attempt both, but plan to present one clearly in your final demo.

### Challenge A — Late refill risk

**Goal**: predict which patient-drug pairs are likely to refill late next time, and produce a usable risk score.

**Label guidance (minimum)**: expected run-out = `SRVC_DT + DAYS_SUPLY_NUM`. Link fills using `PROD_SRVC_ID` and label "late" if the next fill occurs after a grace window (e.g., +7 or +14 days). You can use any PDE columns as features, as long as they are available before prediction time.

- **Features**: refill gap stats, early refills/stockpiling, cadence stability, cost/quantity patterns, polypharmacy proxies
- **Validation**: time-based split to avoid leakage; handle censoring (last fill has no next fill)
- **Metric**: PR-AUC + quick calibration check
- **Demo**: patient timeline for 1-2 drugs + risk score + top drivers

### Challenge B — Pathway-aware "next-best" recommendations

**Goal**: recommend the top K next items (or next drug class) in a future window (e.g., next 30-90 days) and explain why.

**Pathway element**: there is no explicit "clinical pathway" column. Treat pathways as common sequences over time (items or drug classes). A simple approach is a Markov transition graph; advanced approaches include sequential pattern mining or sequence models.

- **Baseline**: association rules / co-occurrence within a time window is a strong starting point
- **Evaluation**: Recall@K or nDCG@K on a held-out future window (use a temporal split)
- **Demo**: input a patient ID, show recommendations + short explanation (similar histories, transitions, pathway stage)

**Optional enrichment** (not required): map NDC-11 to names/classes for interpretability.

| API | URL |
|-----|-----|
| RxNorm (NDC to RxCUI) | `https://rxnav.nlm.nih.gov/REST/rxcui.json?idtype=NDC&id=<NDC11>` |
| RxClass (RxCUI to classes) | `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=<RXCUI>` |
| openFDA NDC API | https://open.fda.gov/apis/drug/ndc/ |

---

## What you should deliver by end of Day 2

- A **working pipeline** for your chosen challenge (data -> features -> model/recommender -> metric)
- A **sensible validation approach** (time-based is recommended) and a score you can explain
- A **short demo** (notebook-as-product is fine; Streamlit/Gradio optional) that you can show live in a few minutes
- A **short README or slides** (up to ~5): framing, task/label definition, evaluation method, results, and caveats

---

## Suggested 2-day flow

**Day 1**: load data, basic EDA, agree label/reco framing, build baseline end-to-end, get demo skeleton running.

**Day 2**: iterate (better features/validation), add explanations/pathways, polish demo + 7-minute presentation.

---

## Submission checklist

- Anything runnable you can demo (notebook/script/app — no need for polished code)
- A demo: patient timeline + risk score (A) **OR** recommendations + explanation (B)
- Optional: 1-2 caveats (synthetic data; not clinical advice) — can be on a slide

---

> **Important**: this is a modelling and product-thinking exercise using synthetic claims-style data. Outputs should be presented with appropriate limitations and should not be interpreted as clinical advice.

---

### Before You Arrive

- **Choose your track**:
  - **Track 1**: Healthcare & Digital Pharmacy
  - **Track 2**: Earth, Environment & Climate
- You are welcome to form teams (max 4 people) ahead of the event or on Day 1.
- Bring your laptop and charger (cluster PCs are also available if you prefer).
- Light refreshments and drinks will be provided, but please arrange your own lunch on both days.
- All participants will receive a participation certificate.

---

### Event Timeline

#### Day 1 — Monday 30 March

| Time | Activity |
|------|----------|
| 09:30 | Registration & Welcome |
| 10:00 | Challenge Presentations |
| 10:30 | Group Formation & Start |
| 13:00 | Lunch Break |
| 14:00 | Back to Work |
| 16:30 | Wrap-up & Close for the Day |

#### Day 2 — Tuesday 31 March

| Time | Activity |
|------|----------|
| 10:00 | Start & Updates |
| 13:00 | Submission Deadlione & Lunch |
| 14:00 | Team Presentations to the Panel |
| 16:00 | Panel Adjourns |
| 16:30 | Winner Announcement |

**Awards**: Prize for 1st place, award certificates for finalists, participation certificates for all teams.

---

### Day 2 Submission Instructions

**Submission deadline: 13:00 on Tuesday 31 March** (before lunch).

A submission form will be circulated where each team must provide:

1. **Track entered** (Track 1 or Track 2)
2. **Team members** — names and email addresses for all members
3. **GitHub repository link** — the repo **must be public** by the submission deadline

#### What your repo must contain

At a minimum:

- A **README file** with clear instructions on how to run your code to reproduce the output you are presenting. This includes: dependencies, data setup steps, and the command(s) to run.
- Your **code** (notebooks, scripts, or app).
- Any **output files** referenced in your presentation.

#### What we will check

- The repo is public and accessible.
- The README instructions are sufficient to run the code.
- Minimum reproducibility checks will be run to verify the code executes and the output matches what you describe in your presentation.

#### Presentation (14:00–16:00)

- **~5 minutes per team** — keep it focused.
- Walk us through your steps, show your output, and demonstrate your critical thinking.
- The panel will ask brief follow-up questions.

---

### Working Hours

Rooms are available until 16:30 daily. Students may continue working afterwards in other 24-hour clusters if they wish, but this is optional — make sure you take breaks and rest.

We look forward to an exciting two days of collaborative problem-solving and innovation!
