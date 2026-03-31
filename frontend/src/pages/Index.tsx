import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { usePatientData } from '@/hooks/use-patient-data';
import StatsOverview from '@/components/StatsOverview';
import PatientTable from '@/components/PatientTable';
import AnalyticsCharts from '@/components/AnalyticsCharts';
import ModelInsights from '@/components/ModelInsights';
import PatientDetail from '@/components/PatientDetail';
import type { PatientRecord } from '@/lib/patient-types';

const Index = () => {
  const { data, loading } = usePatientData();
  const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium">Loading patient data…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary rounded-lg p-2">
              <span className="text-primary-foreground font-heading font-bold text-lg">P2U</span>
            </div>
            <div>
              <h1 className="font-heading font-bold text-xl">Pharmacy2U</h1>
              <p className="text-xs text-muted-foreground">Prescription Adherence Intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="bg-success/20 text-success px-2 py-0.5 rounded-full text-xs font-medium">● Live</span>
            <span>{data.length.toLocaleString()} records</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        <StatsOverview data={data} />
        <AnalyticsCharts data={data} />
        <ModelInsights />
        <PatientTable data={data} onSelectPatient={setSelectedPatient} />
      </main>

      {selectedPatient && (
        <PatientDetail patient={selectedPatient} allRecords={data} onClose={() => setSelectedPatient(null)} />
      )}
    </div>
  );
};

export default Index;
