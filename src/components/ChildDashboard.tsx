import React, { useState, useMemo, useEffect } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { mapTransaction } from '@/utils';
import { Child, Task, Transaction, SavingsGoal } from '@/types';
import {
    centsToDollars,
    formatCurrency,
    getTaskIcon,
    calculateTaskValue,
    calculateHourlyRate,
    dollarsToCents
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
    AlertCircle,
    PiggyBank,
    CreditCard,
    Plus,
    History,
    Edit2,
    Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { householdService } from '@/services/householdService';

interface ChildDashboardProps {
    child: Child;
    availableTasks: Task[];
    householdId: string;
    onSubmitTask: (childId: string, task: Task) => void;
    onClaimTask: (childId: string, taskId: string) => void;
    onSignOut: () => void;
}

const ChildDashboard: React.FC<ChildDashboardProps> = ({
    child,
    availableTasks,
    householdId,
    onSubmitTask,
    onClaimTask,
    onSignOut,
}) => {
    const [claimingTaskId, setClaimingTaskId] = useState<string | null>(null);
    const [justClaimed, setJustClaimed] = useState<string | null>(null);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState<string | null>(null);
    const [showAddGoalModal, setShowAddGoalModal] = useState(false);
    const [showEditGoalModal, setShowEditGoalModal] = useState<SavingsGoal | null>(null);
    const [editGoalName, setEditGoalName] = useState('');
    const [editGoalTarget, setEditGoalTarget] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [transactions, setTransactions] = useState<Transaction[]>([]);

    useEffect(() => {
        if (!householdId || !child.id) return;

        const q = query(
            collection(db, `households/${householdId}/profiles/${child.id}/transactions`),
            orderBy('date', 'desc'),
            limit(50)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const mapped = snapshot.docs.map(doc => mapTransaction(doc.id, householdId, doc.data() as Record<string, unknown>));
            setTransactions(mapped);
        });
        return () => unsubscribe();
    }, [householdId, child.id]);

    // Form states
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [withdrawMemo, setWithdrawMemo] = useState('');
    const [transferAmount, setTransferAmount] = useState('');
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');

    // Derived Values
    const hourlyRate = useMemo(() => calculateHourlyRate(child.subjects, child.rates), [child.subjects, child.rates]);
    const balance = useMemo(() => centsToDollars(child.balanceCents || 0), [child.balanceCents]);

    const pendingWithdrawalCents = useMemo(() => {
        return transactions
            .filter(t => t.type === 'WITHDRAWAL_REQUEST' && t.status === 'PENDING')
            .reduce((sum, t) => sum + (t.amountCents || 0), 0);
    }, [transactions]);

    const spendableBalanceCents = (child.balanceCents || 0) - pendingWithdrawalCents;
    const spendableBalance = centsToDollars(spendableBalanceCents);

    // Filter Tasks
    const openBounties = useMemo(() => availableTasks.filter((t: Task) => t.status === 'OPEN'), [availableTasks]);
    const myHustle = useMemo(() => (child.customTasks || []).filter((t: Task) => t.status === 'ASSIGNED' || t.status === 'PENDING_APPROVAL'), [child.customTasks]);

    const goals = useMemo(() => child.goals || [], [child.goals]);

    const handleClaim = (taskId: string) => {
        setClaimingTaskId(taskId);
        setTimeout(() => {
            setClaimingTaskId(null);
            setJustClaimed(taskId);
            onClaimTask(child.id, taskId);
            setTimeout(() => setJustClaimed(null), 2000);
        }, 600);
    };

    const handleRequestWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        const amountCents = dollarsToCents(parseFloat(withdrawAmount));
        if (amountCents > spendableBalanceCents) return;

        setIsProcessing(true);
        try {
            await householdService.requestWithdrawal(child.id, amountCents, withdrawMemo || 'Cash Withdrawal', householdId);
            setShowWithdrawModal(false);
            setWithdrawAmount('');
            setWithdrawMemo('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleTransferToGoal = async (goalId: string) => {
        const amountCents = dollarsToCents(parseFloat(transferAmount));
        if (amountCents > spendableBalanceCents) return;

        setIsProcessing(true);
        try {
            await householdService.transferToGoal(child.id, goalId, amountCents, householdId);
            setShowTransferModal(null);
            setTransferAmount('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        const targetCents = dollarsToCents(parseFloat(newGoalTarget));

        setIsProcessing(true);
        try {
            await householdService.addSavingsGoal(child.id, newGoalName, targetCents, householdId);
            setShowAddGoalModal(false);
            setNewGoalName('');
            setNewGoalTarget('');
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleEditGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!showEditGoalModal) return;
        const targetCents = dollarsToCents(parseFloat(editGoalTarget));

        setIsProcessing(true);
        try {
            await householdService.updateSavingsGoal(child.id, showEditGoalModal.id, editGoalName, targetCents, householdId);
            setShowEditGoalModal(null);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteGoal = async () => {
        if (!showEditGoalModal) return;

        if (!window.confirm("Are you sure you want to delete this goal? Any saved funds will be returned to your spendable balance.")) {
            return;
        }

        setIsProcessing(true);
        try {
            await householdService.deleteSavingsGoal(child.id, showEditGoalModal.id, householdId);
            setShowEditGoalModal(null);
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const openEditGoalModal = (goal: SavingsGoal) => {
        setEditGoalName(goal.name);
        setEditGoalTarget(centsToDollars(goal.targetAmountCents).toString());
        setShowEditGoalModal(goal);
    };

    const handleClaimGoal = async (goalId: string) => {
        setIsProcessing(true);
        try {
            await householdService.claimGoal(child.id, goalId, householdId);
            // Confetti effect would go here
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : 'An error occurred');
        } finally {
            setIsProcessing(false);
        }
    };

    const getTaskDisplayValue = (task: Task) => {
        if (task.valueCents !== undefined && task.valueCents > 0) return formatCurrency(centsToDollars(task.valueCents));
        return formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate, task.multiplier, task.bonusCents));
    };

    const avatarColor = child.avatarColor || '#3b82f6';

    return (
        <div className="min-h-screen bg-app text-primary font-sans selection:bg-primary/10 transition-colors duration-300">
            {/* 1. The Personal Vault (Atmospheric Header) */}
            <section
                className="relative pt-12 pb-24 px-6 overflow-hidden"
                style={{
                    background: `linear-gradient(135deg, ${avatarColor}1a 0%, transparent 50%, transparent 100%)`
                }}
            >
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
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowWithdrawModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-surface/50 backdrop-blur-sm border border-border-base rounded-full text-sm font-bold text-primary hover:bg-surface transition-all shadow-sm"
                            >
                                <CreditCard className="w-4 h-4" /> Cash Out
                            </button>
                            <button
                                onClick={onSignOut}
                                className="p-2 text-muted hover:text-primary transition-colors"
                                title="Sign Out"
                            >
                                <LogOut className="w-5 h-5" />
                            </button>
                        </div>
                    </header>

                    <div className="text-center">
                        <div className="inline-block relative group">
                            <div className="absolute inset-0 bg-surface/40 backdrop-blur-md rounded-3xl -m-6 border border-white/10 shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]" />

                            <div className="relative">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted mb-2">Total Capital</p>
                                <h1 className="text-7xl md:text-8xl font-sans font-extrabold tracking-tighter text-primary flex items-center justify-center gap-1">
                                    <span className="text-4xl md:text-5xl opacity-30 -mt-4">$</span>
                                    {balance.toFixed(2)}
                                </h1>
                                {pendingWithdrawalCents > 0 && (
                                    <div className="mt-4 flex flex-col items-center animate-in fade-in slide-in-from-top-2 duration-700">
                                        <div className="flex items-center gap-2 text-amber-600 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 shadow-sm">
                                            <TrendingUp className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                                Lien: -{formatCurrency(centsToDollars(pendingWithdrawalCents))}
                                            </span>
                                        </div>
                                        <p className="text-xs font-bold text-muted mt-2 uppercase tracking-wide">
                                            Spendable: <span className="text-primary font-mono">{formatCurrency(spendableBalance)}</span>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="mt-12 flex flex-col items-center">
                            <h2 className="text-2xl font-bold font-heading text-primary">{child.name}</h2>
                            <p className="text-sm font-medium text-muted mt-1 flex items-center gap-2">
                                <Sparkles className="w-3.5 h-3.5" style={{ color: avatarColor }} />
                                Level: {child.gradeLevel}
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <main className="max-w-4xl mx-auto px-6 -mt-12 pb-24 space-y-16">
                {/* Savings Goals Section */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold font-heading flex items-center gap-2 text-primary">
                            <PiggyBank className="w-5 h-5 text-pink-500" />
                            Savings Goals
                        </h3>
                        <Button
                            onClick={() => setShowAddGoalModal(true)}
                            className="bg-surface hover:bg-surface-2 text-muted border border-border-base rounded-full px-4 py-1.5 text-xs font-bold h-auto shadow-none"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> New Goal
                        </Button>
                    </div>

                    {goals.length === 0 ? (
                        <div className="bg-surface border border-border-base border-dashed rounded-3xl p-10 text-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/10 to-purple-50/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative z-10 flex flex-col items-center">
                                <div className="w-16 h-16 bg-surface rounded-2xl shadow-sm border border-border-base flex items-center justify-center mb-4 transform group-hover:-translate-y-1 transition-transform">
                                    <Sparkles className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h4 className="text-xl font-bold text-primary mb-2 font-heading">Start a New Goal</h4>
                                <p className="text-sm text-muted max-w-sm mb-8 leading-relaxed">
                                    What are you working toward? A new game? A softball bat? Start your first goal here.
                                </p>
                                <Button
                                    onClick={() => setShowAddGoalModal(true)}
                                    className="bg-primary hover:bg-primary/90 text-app font-bold py-4 px-8 rounded-2xl shadow-xl shadow-primary/10 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create First Goal
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {goals.filter(g => g.status === 'ACTIVE').map(goal => {
                                const progress = Math.min(100, (goal.currentAmountCents / goal.targetAmountCents) * 100);
                                const isComplete = progress >= 100;

                                return (
                                    <div key={goal.id} className="glass-card mb-4 border border-border-base rounded-2xl p-6 hover:shadow-md transition-all group overflow-hidden relative">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-bold text-primary">{goal.name}</h4>
                                                <button
                                                    onClick={() => openEditGoalModal(goal)}
                                                    className="p-1 text-muted hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Edit Goal"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-mono font-bold text-primary">{Math.floor(progress)}%</span>
                                            </div>
                                        </div>

                                        <div className="w-full h-4 bg-surface-2 rounded-full mb-2 overflow-hidden border border-border-base/10 shadow-inner">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out relative shadow-[0_0_10px_rgba(0,0,0,0.1)]"
                                                style={{
                                                    width: `${progress}%`,
                                                    backgroundColor: avatarColor,
                                                    boxShadow: `0 0 15px ${avatarColor}40`
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                            </div>
                                        </div>
                                        <p className="text-xs font-bold text-muted text-center mb-6">
                                            {formatCurrency(centsToDollars(goal.currentAmountCents))} of {formatCurrency(centsToDollars(goal.targetAmountCents))} saved. Only {formatCurrency(centsToDollars(goal.targetAmountCents - goal.currentAmountCents))} to go!
                                        </p>

                                        <div className="flex gap-2 relative z-10">
                                            {isComplete ? (
                                                <Button
                                                    onClick={() => handleClaimGoal(goal.id)}
                                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-2 rounded-xl border-none shadow-lg shadow-emerald-500/20"
                                                >
                                                    Claim Goal! 🎁
                                                </Button>
                                            ) : (
                                                <Button
                                                    onClick={() => setShowTransferModal(goal.id)}
                                                    className="flex-1 bg-primary hover:bg-primary/90 text-app font-bold py-2 rounded-xl border-none"
                                                >
                                                    Transfer Funds
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* 2. Available Bounties (Market) */}
                <section>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold font-heading flex items-center gap-2 text-primary">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Available Bounties
                        </h3>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest bg-surface-2 px-2 py-1 rounded">
                            {openBounties.length} Markets
                        </span>
                    </div>

                    {openBounties.length === 0 ? (
                        <div className="bg-surface border border-border-base border-dashed rounded-2xl p-12 text-center">
                            <p className="text-lg font-medium text-primary">The Market is currently quiet.</p>
                            <p className="text-sm text-muted mt-1">Check back soon for new opportunities.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {openBounties.map((task: Task) => (
                                <div
                                    key={task.id}
                                    className="group glass-card border border-border-base rounded-2xl p-6 hover:shadow-xl transition-all duration-300 relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300">{getTaskIcon(task.name)}</div>
                                            <h4 className="text-sm font-bold text-muted uppercase tracking-wide mb-1 line-clamp-1">{task.name}</h4>
                                            <p className="text-xs text-muted font-medium">{task.baselineMinutes}m investment</p>
                                        </div>
                                        <div className="text-right">
                                            <div
                                                className="luminary-glow inline-block text-3xl font-mono font-bold text-primary"
                                                data-text={getTaskDisplayValue(task).replace('$', '')}
                                            >
                                                {getTaskDisplayValue(task).replace('$', '')}
                                            </div>
                                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-tighter mt-1">Value</p>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <Button
                                            onClick={() => handleClaim(task.id)}
                                            disabled={claimingTaskId === task.id || justClaimed === task.id}
                                            className={`w-full tactile-button shadow-none ${justClaimed === task.id
                                                ? 'bg-emerald-500 text-white translate-y-0 scale-100'
                                                : ''
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
                        <h3 className="text-lg font-bold font-heading flex items-center gap-2 text-primary">
                            <Briefcase className="w-5 h-5 text-blue-500" />
                            Current Hustle
                        </h3>
                        <span className="text-[10px] font-bold text-muted uppercase tracking-widest bg-surface-2 px-2 py-1 rounded">
                            {myHustle.length} Working
                        </span>
                    </div>

                    {myHustle.length === 0 ? (
                        <div className="bg-surface border border-border-base rounded-2xl p-8 text-center">
                            <p className="text-sm text-muted italic">No tasks currently being worked on. Explore the marketplace!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {myHustle.map((task: Task) => {
                                const isPending = task.status === 'PENDING_APPROVAL';
                                return (
                                    <div
                                        key={task.id}
                                        className="bg-cream border border-gold/10 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="text-3xl">{getTaskIcon(task.name)}</div>
                                            <div>
                                                <h4 className="text-base font-bold text-primary">{task.name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs font-medium text-muted">{task.baselineMinutes}m</span>
                                                    <span className="w-1 h-1 bg-border-base rounded-full" />
                                                    <span className="text-sm font-mono font-bold text-emerald-600">{getTaskDisplayValue(task)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {isPending ? (
                                                <div className="flex items-center gap-2 px-4 py-2 bg-surface border border-border-base rounded-full text-xs font-bold text-muted uppercase tracking-wider shadow-sm">
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
                                                        className="tactile-button shadow-lg shadow-blue-600/20 active:scale-95 transition-all text-sm"
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

            {/* Modals */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/5">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold font-heading text-primary">Request Payout</h3>
                                <button onClick={() => setShowWithdrawModal(false)} className="text-muted hover:text-primary p-2">&times;</button>
                            </div>

                            <form onSubmit={handleRequestWithdrawal} className="space-y-6">
                                <div className="p-4 bg-surface-2 rounded-2xl border border-border-base">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Available to Withdraw</p>
                                    <p className="text-2xl font-mono font-bold text-primary">{formatCurrency(spendableBalance)}</p>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={withdrawAmount}
                                        onChange={(e) => setWithdrawAmount(e.target.value)}
                                        className="w-full bg-surface-2 border border-border-base rounded-xl px-5 py-4 font-mono text-xl text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-muted"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">What is it for?</label>
                                    <input
                                        type="text"
                                        value={withdrawMemo}
                                        onChange={(e) => setWithdrawMemo(e.target.value)}
                                        className="w-full bg-surface-2 border border-border-base rounded-xl px-5 py-4 text-sm text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-muted"
                                        placeholder="Toys, robux, snacks..."
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isProcessing || !withdrawAmount || dollarsToCents(parseFloat(withdrawAmount)) > spendableBalanceCents}
                                    className="w-full bg-primary hover:bg-primary/90 text-app font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                >
                                    {isProcessing ? 'Processing...' : 'Send Request to Parent'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showTransferModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/5">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold font-heading text-primary">Allocate Capital</h3>
                                <button onClick={() => setShowTransferModal(null)} className="text-muted hover:text-primary p-2">&times;</button>
                            </div>

                            <div className="p-4 bg-surface-2 rounded-2xl border border-border-base mb-6">
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-1">Available to Transfer</p>
                                <p className="text-2xl font-mono font-bold text-primary">{formatCurrency(spendableBalance)}</p>
                            </div>

                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={transferAmount}
                                        onChange={(e) => setTransferAmount(e.target.value)}
                                        className={`w-full bg-surface-2 border rounded-xl px-5 py-4 font-mono text-xl text-primary focus:ring-2 focus:outline-none placeholder:text-muted ${parseFloat(transferAmount) > spendableBalance
                                            ? 'border-red-500/50 focus:ring-red-500 text-red-500'
                                            : 'border-border-base focus:ring-amber-500'
                                            }`}
                                        placeholder="0.00"
                                    />
                                    {transferAmount && parseFloat(transferAmount) > spendableBalance && (
                                        <p className="text-sm text-red-500 font-medium mt-2 flex items-center gap-1">
                                            <AlertCircle className="w-4 h-4" />
                                            You only have {formatCurrency(spendableBalance)} available to save right now.
                                        </p>
                                    )}
                                </div>

                                <Button
                                    onClick={() => handleTransferToGoal(showTransferModal)}
                                    disabled={isProcessing || !transferAmount || dollarsToCents(parseFloat(transferAmount)) > spendableBalanceCents}
                                    className="w-full bg-primary hover:bg-primary/90 text-app font-bold py-4 rounded-2xl shadow-xl shadow-primary/20"
                                >
                                    {isProcessing ? 'Processing...' : 'Securely Allocate to Goal'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showAddGoalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/5">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold font-heading text-primary">New Savings Goal</h3>
                                <button onClick={() => setShowAddGoalModal(false)} className="text-muted hover:text-primary p-2">&times;</button>
                            </div>

                            <form onSubmit={handleAddGoal} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Goal Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newGoalName}
                                        onChange={(e) => setNewGoalName(e.target.value)}
                                        className="w-full bg-surface-2 border border-border-base rounded-xl px-5 py-4 text-base text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-muted"
                                        placeholder="e.g., New Bat"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Target Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={newGoalTarget}
                                        onChange={(e) => setNewGoalTarget(e.target.value)}
                                        className="w-full bg-surface-2 border border-border-base rounded-xl px-5 py-4 font-mono text-xl text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-muted"
                                        placeholder="e.g., 150"
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    disabled={isProcessing || !newGoalName || !newGoalTarget}
                                    className="w-full bg-primary hover:bg-primary/90 text-app font-bold py-4 rounded-2xl shadow-xl shadow-primary/20"
                                >
                                    {isProcessing ? 'Creating...' : 'Establish Savings Goal'}
                                </Button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showEditGoalModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-surface rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/5">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-2xl font-bold font-heading text-primary">Edit Savings Goal</h3>
                                <button onClick={() => setShowEditGoalModal(null)} className="text-muted hover:text-primary p-2">&times;</button>
                            </div>

                            <form onSubmit={handleEditGoal} className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Goal Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={editGoalName}
                                        onChange={(e) => setEditGoalName(e.target.value)}
                                        className="w-full bg-surface-2 border border-border-base rounded-xl px-5 py-4 text-base text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-muted"
                                        placeholder="e.g., New Bat"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-muted mb-2">Target Amount ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        value={editGoalTarget}
                                        onChange={(e) => setEditGoalTarget(e.target.value)}
                                        className="w-full bg-surface-2 border border-border-base rounded-xl px-5 py-4 font-mono text-xl text-primary focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-muted"
                                        placeholder="e.g., 150"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <Button
                                        type="button"
                                        onClick={handleDeleteGoal}
                                        disabled={isProcessing}
                                        className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-4 rounded-2xl shadow-none active:scale-[0.98] transition-all flex items-center justify-center px-4"
                                        title="Delete Goal"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        type="submit"
                                        disabled={isProcessing || !editGoalName || !editGoalTarget}
                                        className="flex-1 bg-primary hover:bg-primary/90 text-app font-bold py-4 rounded-2xl shadow-xl shadow-primary/20 active:scale-[0.98] transition-all"
                                    >
                                        {isProcessing ? 'Saving...' : 'Save Changes'}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChildDashboard;
