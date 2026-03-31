import { useState, useMemo } from 'react';
import { Search, ChevronUp, ChevronDown, Eye } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { PatientRecord } from '@/lib/patient-types';
import { getRiskLevel, getRiskBg, getActionIcon } from '@/lib/patient-types';

interface PatientTableProps {
  data: PatientRecord[];
  onSelectPatient: (patient: PatientRecord) => void;
}

type SortKey = 'Risk_Score' | 'Age' | 'Drug_Load' | 'Condition_Count';

export default function PatientTable({ data, onSelectPatient }: PatientTableProps) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('Risk_Score');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 12;

  const filtered = useMemo(() => {
    let items = data.filter(d =>
      String(d.DESYNPUF_ID || '').toLowerCase().includes(search.toLowerCase()) ||
      String(d.Next_Best_Action || '').toLowerCase().includes(search.toLowerCase())
    );
    items.sort((a, b) => sortAsc ? (a[sortKey] as number) - (b[sortKey] as number) : (b[sortKey] as number) - (a[sortKey] as number));
    return items;
  }, [data, search, sortKey, sortAsc]);

  const paged = filtered.slice(page * perPage, (page + 1) * perPage);
  const totalPages = Math.ceil(filtered.length / perPage);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
    setPage(0);
  }

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortAsc ? <ChevronUp className="h-3 w-3 inline ml-1" /> : <ChevronDown className="h-3 w-3 inline ml-1" />;
  };

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <h2 className="font-heading font-semibold text-lg">Patient Risk Registry</h2>
        <div className="flex-1" />
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search patient ID..." className="pl-9 h-9" value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-muted/30">
              <th className="text-left p-3 font-medium text-muted-foreground">Patient ID</th>
              <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('Risk_Score')}>
                Risk Score <SortIcon col="Risk_Score" />
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('Age')}>
                Age <SortIcon col="Age" />
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('Drug_Load')}>
                Drug Load <SortIcon col="Drug_Load" />
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground cursor-pointer select-none" onClick={() => toggleSort('Condition_Count')}>
                Conditions <SortIcon col="Condition_Count" />
              </th>
              <th className="text-left p-3 font-medium text-muted-foreground">Next Action</th>
              <th className="text-left p-3 font-medium text-muted-foreground"></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((p, i) => {
              const level = getRiskLevel(p.Risk_Score);
              return (
                <tr key={i} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-mono text-xs">{p.DESYNPUF_ID.slice(0, 8)}…</td>
                  <td className="p-3">
                    <Badge className={`${getRiskBg(level)} border-0 font-semibold`}>
                      {(p.Risk_Score * 100).toFixed(0)}%
                    </Badge>
                  </td>
                  <td className="p-3">{p.Age}</td>
                  <td className="p-3">{p.Drug_Load}</td>
                  <td className="p-3">{p.Condition_Count}</td>
                  <td className="p-3 max-w-[220px]">
                    <span className="text-xs">{getActionIcon(p.Next_Best_Action || '')} {p.Next_Best_Action?.slice(0, 50)}…</span>
                  </td>
                  <td className="p-3">
                    <Button variant="ghost" size="sm" onClick={() => onSelectPatient(p)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-3 flex items-center justify-between text-sm text-muted-foreground border-t border-border/50">
        <span>{filtered.length} records</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
          <span className="flex items-center px-2">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
