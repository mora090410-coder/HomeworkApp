import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../services/supabase';
import { ArrowDownLeft, ArrowUpRight, Clock, Receipt, Wallet } from 'lucide-react';
import { Transaction } from '../types';

interface FamilyActivityFeedProps {
    familyId: string;
}

export default function FamilyActivityFeed({ familyId }: FamilyActivityFeedProps) {
    // Fetch global ledger history for family
    const { data: history = [], isLoading } = useQuery({
        queryKey: ['familyHistory', familyId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('ledger')
                .select(`
          *,
          profiles (name)
        `)
                .eq('family_id', familyId)
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            return data;
        },
        enabled: !!familyId,
        refetchInterval: 10000 // Poll every 10s or rely on realtime in App.tsx
    });

    if (isLoading) return <div className="h-48 flex items-center justify-center text-gray-500 animate-pulse">Loading activity...</div>;

    if (history.length === 0) {
        return (
            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-8 text-center flex flex-col items-center">
                <Clock className="w-8 h-8 text-white/40 mb-3" />
                <p className="text-[#888] text-sm font-medium">No financial activity yet. Chores completed and advances recorded will appear here.</p>
            </div>
        );
    }

    return (
        <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                <h3 className="font-[590] text-white flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-cardinal" />
                    Recent Activity
                </h3>
                <span className="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Global Ledger</span>
            </div>

            <div className="divide-y divide-white/5">
                {history.map((txn: any) => {
                    const isExpense = txn.amount < 0;
                    return (
                        <div key={txn.id} className="px-6 py-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors group">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border ${isExpense ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-green-500/10 border-green-500/20 text-green-500'}`}>
                                    {isExpense ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="text-sm font-bold text-white">{txn.profiles?.name || 'Unknown'}</span>
                                        <span className="text-xs text-gray-500">• {new Date(txn.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-xs text-[#888] line-clamp-1 group-hover:text-gray-400 transition-colors">{txn.memo || txn.category}</p>
                                </div>
                            </div>
                            <div className={`text-sm font-bold font-mono tracking-tight ${isExpense ? 'text-white' : 'text-[#FFCC00]'}`}>
                                {isExpense ? '-' : '+'}${Math.abs(txn.amount).toFixed(2)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
