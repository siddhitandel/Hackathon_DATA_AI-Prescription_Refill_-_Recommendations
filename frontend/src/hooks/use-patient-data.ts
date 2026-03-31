import { useState, useEffect } from 'react';
import type { PatientRecord } from '@/lib/patient-types';

const STRING_FIELDS = new Set([
  'DESYNPUF_ID', 'PDE_ID', 'SRVC_DT', 'PROD_SRVC_ID', 'BENE_BIRTH_DT',
  'BENE_DEATH_DT', 'BENE_ESRD_IND', 'Expected_Run_Out', 'Next_Fill_Date',
  'Next_Any_Visit', 'Predicted_Next_Drug', 'Next_Best_Action',
]);

export function usePatientData() {
  const [data, setData] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data/final_delivery_data.csv')
      .then(res => res.text())
      .then(text => {
        const lines = text.trim().split('\n');
        const headers = lines[0].split(',');
        const records: PatientRecord[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',');
          const row: any = {};
          headers.forEach((h, idx) => {
            const v = values[idx];
            if (STRING_FIELDS.has(h)) {
              row[h] = String(v || '');
            } else {
              row[h] = isNaN(Number(v)) || v === '' ? v : Number(v);
            }
          });
          records.push(row as PatientRecord);
        }
        setData(records);
        setLoading(false);
      });
  }, []);

  return { data, loading };
}
