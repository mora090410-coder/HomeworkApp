import React, { useState, useMemo } from 'react';
import { Child, Task } from '@/types';
import {
    centsToDollars,
    formatCurrency,
    getTaskIcon,
    calculateTaskValue,
    calculateHourlyRate
} from '@/utils';
import {
    LogOut,
    Check,
    Zap,
    ArrowRight,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Briefcase,
    AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ChildDashboardProps {
    child: Child;
    availableTasks: Task[];
    onSubmitTask: (childId: string, task: Task) => void;
    onClaimTask: (childId: string, taskId: string) => void;
    onSignOut: () => void;
}

const ChildDashboard: React.FC<ChildDashboardProps> = ({
    child,
    availableTasks,
    onSubmitTask,
    onClaimTask,
    onSignOut,
}) => {
    const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
    const [justClaimed, setJustClaimed] = useState<string | null>(null);

    // Derived Values
    const hourlyRate = useMemo(() => calculateHourlyRate(child.subjects, child.rates), [child.subjects, child.rates]);
    const balance = useMemo(() => centsToDollars(child.balanceCents || 0), [child.balanceCents]);

    // Filter Tasks
    const openBounties = useMemo(() => availableTasks.filter((t: Task) => t.status === 'OPEN'), [availableTasks]);
    const myHustle = useMemo(() => (child.customTasks || []).filter((t: Task) => t.status === 'ASSIGNED' || t.status === 'PENDING_APPROVAL'), [child.customTasks]);

    const handleClaim = (taskId: string) => {
        setClaimingTaskId(taskId);

        // Optimistic UI interaction
        setTimeout(() => {
            setClaimingTaskId(null);
            setJustClaimed(taskId);
            onClaimTask(child.id, taskId);

            // Reset success state after a moment
            setTimeout(() => setJustClaimed(null), 2000);
        }, 600); // Brief delay to feel the "Transaction"
    };

    const getTaskDisplayValue = (task: Task) => {
        if (task.valueCents !== undefined && task.valueCents > 0) return formatCurrency(centsToDollars(task.valueCents));
        return formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate, task.multiplier, task.bonusCents));
    };

    const avatarColor = child.avatarColor || '#3b82f6';

    return (
        <div className="min-h-screen bg-white text-neutral-900 font-sans selection:bg-primary-100">
            {/* 1. The Personal Vault (Atmospheric Header) */}
            <section
                className="relative pt-12 pb-24 px-6 overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${avatarColor}1a 0%, #ffffff 50%, #ffffff 100%)`
                }}
            >
                {/* Abstract decorative elements for "Ive" atmosphere */}
                <div
                    className="absolute top-[-10%] right-[-5%] w-64 h-64 rounded-full blur-3xl opacity-20 animate-pulse"
                    style={{ backgroundColor: avatarColor }}
                />
                <div
                    className="absolute bottom-[-20%] left-[-10%] w-96 h-96 rounded-full blur-3xl opacity-10"
                    style={{ backgroundColor: avatarColor }}
                />

                <div className="max-w-4xl mx-auto relative z-10">
                    <header className="flex justify-between items-center mb-16">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white shadow-lg"
                                style={{ backgroundColor: avatarColor }}
                            >
                                <ShieldCheck className="w-5 h-5 shadow-inner" />
                            </div>
                            <span className="text-xl font-bold tracking-tight font-heading">Vault</span>
                        </div>
                        <button
                            onClick={onSignOut}
                            className="p-2 text-neutral-400 hover:text-neutral-900 transition-colors"
                            title="Sign Out"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </header>

                    <div className="text-center">
                        <div className="inline-block relative group">
                            {/* Glassmorphism Container */}
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-md rounded-3xl -m-6 border border-white/50 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" />

                            <div className="relative">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-2">Total Capital</p>
                                <h1 className="text-7xl md:text-8xl font-mono font-bold tracking-tighter text-neutral-900 flex items-center justify-center gap-1">
                                    <span className="text-4xl md:text-5xl opacity-30 -mt-4">$</span>
                                    {balance.toFixed(2)}
                                </h1>
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col items-center">
                            <h2 className="text-2xl font-bold font-heading text-neutral-900">{child.name}</h2>
                            <p className="text-sm font-medium text-neutral-500 mt-1 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" style={{ color: avatarColor }} />
                                Level: {child.gradeLevel}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <main className="max-w-4xl mx-auto px-6 -mt-12 pb-24 space-y-16">
                {/* 2. Available Bounties (Market) */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold font-heading flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Available Bounties
                        </h3>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded">
                            {openBounties.length} Markets
                        </span>
                    </div>

                    {openBounties.length === 0 ? (
                        <div className="bg-neutral-50 border border-neutral-200 border-dashed rounded-2xl p-12 text-center">
                            <p className="text-lg font-medium text-neutral-600">The Market is currently quiet.</p>
                            <p className="text-sm text-neutral-400 mt-1">Check back soon for new opportunities.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {openBounties.map((task: Task) => (
                                <div
                                    key={task.id}
                                    className="group bg-white border border-neutral-100 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:border-neutral-200 transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{getTaskIcon(task.name)}</div>
                                            <h4 className="text-sm font-bold text-neutral-500 uppercase tracking-wide mb-1 line-clamp-1">{task.name}</h4>
                                            <p className="text-xs text-neutral-400 font-medium">{task.baselineMinutes}m investment</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-3xl font-mono font-bold text-neutral-900">
                                                {getTaskDisplayValue(task).replace('$', '')}
                                            </p>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter">Value</p>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <Button
                                            onClick={() => handleClaim(task.id)}
                                            disabled={claimingTaskId === task.id || justClaimed === task.id}
                                            className={`w-full py-6 rounded-xl font-bold transition-all duration-300 transform border-none shadow-none ${justClaimed === task.id
                                                    ? 'bg-emerald-500 text-white translate-y-0 scale-100'
                                                    : 'bg-neutral-900 text-white hover:bg-neutral-800 hover:scale-[1.02] active:scale-[0.98]'
                                                }`}
                                        >
                                            {claimingTaskId === task.id ? (
                                                <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                                            ) : justClaimed === task.id ? (
                                                <Check className="w-6 h-6 animate-bounce mx-auto" />
                                            ) : (
                                                <span className="flex items-center justify-center gap-2">Claim Bounty <ArrowRight className="w-4 h-4" /></span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 3. My Hustle (Work in Progress) */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold font-heading flex items-center gap-2 text-primary-600">
                            <Briefcase className="w-5 h-5" />
                            Current Hustle
                        </h3>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest bg-neutral-100 px-2 py-1 rounded">
                            {myHustle.length} Working
                        </span>
                    </div>

                    {myHustle.length === 0 ? (
                        <div className="bg-neutral-50/50 border border-neutral-100 rounded-2xl p-8 text-center">
                            <p className="text-sm text-neutral-400 italic">No tasks currently being worked on. Explore the marketplace!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {myHustle.map((task: Task) => {
                                const isPending = task.status === 'PENDING_APPROVAL';
                                return (
                                    <div
                                        key={task.id}
                                        className="bg-neutral-50 border border-neutral-100 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{getTaskIcon(task.name)}</div>
                                            <div>
                                                <h4 className="text-base font-bold text-neutral-900">{task.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-medium text-neutral-500">{task.baselineMinutes}m</span>
                                                    <span className="w-1 h-1 bg-neutral-300 rounded-full" />
                                                    <span className="text-sm font-mono font-bold text-emerald-600">{getTaskDisplayValue(task)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isPending ? (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-white border border-neutral-200 rounded-full text-xs font-bold text-neutral-400 uppercase tracking-wider shadow-sm">
                                                    <TrendingUp className="w-3.5 h-3.5 animate-pulse" /> Sent for Review
                                                </div>
                                            ) : (
                                                <>
                                                    {task.rejectionComment && (
                                                        <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-medium border border-red-100">
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                            <span className="max-w-[150px] truncate">{task.rejectionComment}</span>
                                                        </div>
                                                    )}
                                                    <Button
                                                        onClick={() => onSubmitTask(child.id, task)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm"
                                                    >
                                                        Submit for Approval
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
};

export default ChildDashboard;
