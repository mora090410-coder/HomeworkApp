
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownLeft, ArrowUpRight, Clock, Receipt } from 'lucide-react';
import { householdService } from '../services/householdService';

interface FamilyActivityFeedProps {
  familyId: string;
}

export default function FamilyActivityFeed({ familyId }: FamilyActivityFeedProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['familyHistory', familyId],
    queryFn: async () => householdService.getHouseholdActivity(familyId),
    enabled: familyId.length > 0,
    refetchInterval: 10000,
  });

  if (isLoading) {
    return <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse">Loading activity...</div>;
  }

  if (history.length === 0) {
    return (
      <div className="bg-white border border-stroke-base rounded-none p-8 text-center flex flex-col items-center">
        <Clock className="w-8 h-8 text-content-subtle mb-3" />
        <p className="text-content-subtle text-sm font-medium">No financial activity yet. Chores and advances will appear here.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-stroke-base rounded-none overflow-hidden">
      <div className="px-6 py-4 border-b border-stroke-base flex justify-between items-center bg-surface-app">
        <h3 className="font-[590] text-content-primary flex items-center gap-2">
          <Receipt className="w-4 h-4 text-blue-500" />
          Recent Activity
        </h3>
        <span className="text-[10px] uppercase font-bold text-content-subtle tracking-wider">Global Ledger</span>
      </div>

      <div className="divide-y divide-neutral-200">
        {history.map((transaction) => {
          const isExpense = transaction.amount < 0;

          return (
            <div key={transaction.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-app transition-colors group">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isExpense ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}>
                  {isExpense ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-bold text-content-primary">{transaction.profileName ?? 'Unknown'}</span>
                    <span className="text-xs text-content-subtle">• {new Date(transaction.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs text-content-subtle line-clamp-1 group-hover:text-content-primary transition-colors">{transaction.memo || transaction.category}</p>
                </div>
              </div>
              <div className={`text-sm font-bold font-mono tracking-tight ${isExpense ? 'text-content-primary' : 'text-blue-500'}`}>
                {isExpense ? '-' : '+'}${Math.abs(transaction.amount).toFixed(2)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
