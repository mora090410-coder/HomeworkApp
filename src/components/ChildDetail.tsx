import React, { useState, useEffect, useRef } from 'react';
import { Child, StandardTask, Task, Transaction } from '@/types';
import { db } from '@/services/firebase';
import { collection, onSnapshot, query, doc, orderBy, limit } from 'firebase/firestore';
import {
  calculateHourlyRate,
  calculateTaskValue,
  calculateTaskValueCents,
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  getTaskIcon,
  getTransactionAmountCents,
  mapTask,
  mapTransaction,
} from '@/utils';
import { DEFAULT_RATES } from '@/constants';
import {
  Check,
  ArrowRight,
  Target,
  Hourglass,
  AlertCircle,
  Lightbulb,
  Coins,
  Settings,
  Briefcase,
  UserPlus,
  Flame,
  ThumbsUp,
  ThumbsDown,
  Banknote,
  History,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Pencil,
  Trash2,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Popover } from '@headlessui/react';
import { TransactionModal } from './TransactionModal';
import { householdService } from '@/services/householdService';
import { ledgerService } from '@/services/ledgerService';

interface ChildDetailProps {
  child: Child;
  isParent: boolean;
  standardTasks?: StandardTask[];
  availableTasks?: Task[];
  onUpdateGrades: (child: Child) => void;
  onInviteChild: (child: Child) => void;
  onEditSettings: (child: Child) => void;
  onSubmitTask: (childId: string, task: Task) => void;
  onApproveTask: (childId: string, task: Task) => Promise<void>; // Keeps original prop signature, but we might bypass in some cases
  onApproveAndDeposit: (childId: string, task: Task, amountCents: number) => Promise<void>;
  onRejectTask: (childId: string, task: Task) => void;
  onPayTask: (childId: string, task: Task) => Promise<void>;
  onClaimTask: (childId: string, taskId: string) => void;
  onAddAdvance?: () => void;
}

const REJECT_REASONS = ['Incomplete', 'Poor Quality', 'Wrong Task', 'Try Again'];

const RejectDropdown = ({ task, onReject }: { task: Task, onReject: (taskId: string, reason: string) => void }) => {
  const [showRejectMenu, setShowRejectMenu] = useState(false);

  return (
    <div className="relative flex-1">
      <button
        onClick={() => setShowRejectMenu(!showRejectMenu)}
        className="w-full border border-crimson/40 text-crimson bg-transparent rounded-full px-5 py-2 text-sm hover:bg-crimson/5 transition-colors flex items-center justify-center gap-2"
      >
        <ThumbsDown className="w-3 h-3" /> Reject
      </button>

      {showRejectMenu && (
        <>
          {/* backdrop to close on outside click */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowRejectMenu(false)}
          />

          <div className="absolute bottom-full mb-2 left-0 z-20 bg-cream border border-gold/20 rounded-2xl shadow-md py-2 min-w-[180px]">
            <p className="text-xs tracking-widest text-charcoal/40 uppercase px-4 pt-2 pb-2 font-sans">Quick Reason</p>

            <div className="border-b border-gold/10 mx-4 mb-1" />

            {REJECT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => {
                  onReject(task.id, reason);
                  setShowRejectMenu(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-charcoal hover:bg-crimson/5 hover:text-crimson cursor-pointer transition-colors font-sans"
              >
                {reason}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ChildDetail: React.FC<ChildDetailProps> = ({
  child,
  isParent,
  standardTasks = [],
  availableTasks = [],
  onUpdateGrades,
  onInviteChild,
  onEditSettings,
  onSubmitTask,
  onApproveTask,
  onApproveAndDeposit,
  onRejectTask,
  onPayTask,
  onClaimTask,
  onAddAdvance,
}) => {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [taskStates, setTaskStates] = useState<Record<string, string>>({});
  const [subCollectionTasks, setSubCollectionTasks] = useState<Task[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionModalOpen, setTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'ADVANCE' | 'PAYOUT'>('ADVANCE');
  const [isProcessingPayout, setIsProcessingPayout] = useState<string | null>(null);

  // Real-time listener for tasks in sub-collection
  useEffect(() => {
    if (!child.householdId || !child.id) return;
    const q = query(collection(db, `households/${child.householdId}/profiles/${child.id}/tasks`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map(doc => mapTask(doc.id, child.householdId!, doc.data()));
      setSubCollectionTasks(mapped);
    });
    return () => unsubscribe();
  }, [child.householdId, child.id]);

  // Real-time listener for transactions
  useEffect(() => {
    if (!child.householdId || !child.id) return;
    const q = query(
      collection(db, `households/${child.householdId}/profiles/${child.id}/transactions`),
      orderBy('date', 'desc'),
      limit(50)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map(doc => mapTransaction(doc.id, child.householdId!, doc.data() as Record<string, unknown>));
      setTransactions(mapped);
    });
    return () => unsubscribe();
  }, [child.householdId, child.id]);

  // Derived Values
  const hourlyRate = calculateHourlyRate(child.subjects, child.rates || DEFAULT_RATES);
  const hourlyRateCents = dollarsToCents(hourlyRate);
  const balanceCents = typeof child.balanceCents === 'number' ? child.balanceCents : Math.round(child.balance * 100);
  const balance = centsToDollars(balanceCents);
  const hasDebt = balanceCents < 0;

  // Recent Transactions (History)
  const allHistory = transactions.length > 0 ? transactions : (child.history || []);
  const financialEvents = allHistory.filter((tx: Transaction) =>
    !['ASSIGNED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'].includes(tx.type as string)
  );

  const sortedTransactions = [...financialEvents]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 10);

  // Helper: Calculate Value
  const getTaskValueCents = (task: Task) => {
    if (task.valueCents !== undefined && task.valueCents > 0) return task.valueCents;
    return calculateTaskValueCents(task.baselineMinutes, hourlyRateCents, task.multiplier, task.bonusCents);
  };

  const getTaskDisplayValue = (task: Task) => {
    // If explicitly set val, use it. Otherwise calc.
    if (task.valueCents !== undefined && task.valueCents > 0) return formatCurrency(centsToDollars(task.valueCents));
    return formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate, task.multiplier, task.bonusCents));
  }

  // Task Lists
  const allCustomTasks = [...(child.customTasks || []), ...subCollectionTasks].reduce((acc, task) => {
    if (!acc.some(t => t.id === task.id)) acc.push(task);
    return acc;
  }, [] as Task[]);

  const pendingApprovalTasks = allCustomTasks.filter(t => t.status === 'PENDING_APPROVAL');
  const inProgressTasks = allCustomTasks.filter((t) =>
    ['ASSIGNED', 'PENDING_APPROVAL', 'PENDING_PAYMENT'].includes(t.status)
  ); // Working on (Hustle)

  // Pending Withdrawal Requests (Lien System)
  const pendingWithdrawalRequests = transactions.filter(tx => tx.type === 'WITHDRAWAL_REQUEST' && tx.status === 'PENDING');

  // Actions
  const handleApproveAndDeposit = async (task: Task) => {
    const amountCents = getTaskValueCents(task);

    if (amountCents <= 0) {
      alert(`This task has a value of $0.00. Please set a rate or bonus before approving.`);
      return;
    }

    try {
      await onApproveAndDeposit(child.id, task, amountCents);
    } catch (err: any) {
      console.error("Failed to approve and deposit", err);
      const message = err?.message || "Please check the ledger or try again.";
      alert(`Approve & Deposit failed: ${message}`);
    }
  };

  const handleConfirmPayout = async (tx: Transaction) => {
    if (!child.householdId) return;
    setIsProcessingPayout(tx.id);
    try {
      await householdService.confirmWithdrawalPayout(
        child.id,
        tx.id,
        tx.amountCents || dollarsToCents(tx.amount),
        child.householdId
      );
    } catch (err: any) {
      console.error("Failed to confirm payout", err);
      alert(`Failed to confirm payout: ${err.message}`);
    } finally {
      setIsProcessingPayout(null);
    }
  };

  const handleQuickReject = async (task: Task, reason: string) => {
    try {
      await householdService.rejectTask(child.householdId!, task.id, reason, child.id);
    } catch (err) {
      console.error("Failed to reject task", err);
    }
  };

  const handleBoost = async (task: Task, amountCents: number) => {
    try {
      await householdService.boostTask(child.householdId!, task.id, amountCents, child.id);
    } catch (err) {
      console.error("Failed to boost task", err);
    }
  };

  const openTransactionModal = (type: 'ADVANCE' | 'PAYOUT') => {
    setTransactionType(type);
    setTransactionModalOpen(true);
  };

  // --- Render Sections ---

  if (!isParent) {
    return (
      <div className="animate-in fade-in duration-700 bg-cream min-h-screen font-sans pb-20 pt-6">

        {/* SECTION 1 — VAULT CARD */}
        <div className="flex flex-col items-center mb-10 mt-2">
          <div className="bg-cream border border-gold/20 rounded-2xl shadow-sm px-8 py-6 text-center mx-4 w-full max-w-sm">
            <p className="text-xs tracking-widest text-charcoal/50 uppercase font-sans mb-2">Total Capital</p>
            <p className="font-serif text-charcoal text-6xl font-bold">
              <span className="text-gold text-3xl align-top mt-3 inline-block font-serif">$</span>{balance.toFixed(2)}
            </p>
          </div>
          <p className="font-serif text-charcoal text-xl font-semibold mt-4">{child.name}</p>
          <span className="bg-gold/10 text-gold text-xs px-3 py-1 rounded-full mt-1 inline-block font-sans">
            Level: {child.gradeLevel || '5th Grade'}
          </span>
        </div>

        {/* SECTION 2 — AVAILABLE BOUNTIES */}
        <div className="mb-10 w-full max-w-md mx-auto">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-gold" fill="currentColor" />
              <p className="font-semibold text-charcoal text-base">Available Bounties</p>
            </div>
            <span className="bg-charcoal/5 text-charcoal/50 text-xs rounded-full px-3 py-1 font-bold">
              {availableTasks.length} MARKETS
            </span>
          </div>

          {availableTasks.length === 0 ? (
            <div className="border border-gold/20 rounded-2xl bg-cream/50 px-6 py-10 text-center mx-4">
              <p className="text-charcoal/60 text-sm font-sans">The Market is currently quiet.</p>
              <p className="text-charcoal/40 text-xs mt-1">Check back soon for new opportunities.</p>
            </div>
          ) : (
            <div>
              {availableTasks.map(task => {
                const valueDisplay = `$${centsToDollars(getTaskValueCents(task)).toFixed(2)}`;
                return (
                  <div key={task.id} className="bg-cream border border-gold/10 rounded-2xl px-5 py-4 flex items-center justify-between mx-4 mb-3 shadow-sm active:scale-[0.98] transition-transform">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <div className="flex flex-col items-start">
                        <p className="font-semibold text-charcoal text-base">{task.name}</p>
                        <p className="text-charcoal/50 text-sm">
                          {task.baselineMinutes} mins · <span className="text-gold font-serif text-base">{valueDisplay}</span>
                        </p>
                      </div>
                    </div>
                    <div>
                      <Button
                        onClick={() => onClaimTask(child.id, task.id)}
                        variant="ghost"
                        className="border border-gold/50 text-gold font-bold hover:bg-gold/10 rounded-full px-5 py-2 text-sm"
                      >
                        Claim
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 3 — CURRENT HUSTLE TASK CARDS */}
        <div className="mb-10 w-full max-w-md mx-auto">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="text-gold w-4 h-4" />
              <p className="font-semibold text-charcoal text-base">Current Hustle</p>
            </div>
            <span className="bg-charcoal/5 text-charcoal/50 text-xs rounded-full px-3 py-1 font-bold">
              {inProgressTasks.length} WORKING
            </span>
          </div>

          {inProgressTasks.length === 0 ? (
            <div className="border border-gold/20 rounded-2xl bg-cream/50 px-6 py-10 text-center mx-4 shadow-sm">
              <p className="text-charcoal/60 text-sm font-sans">Your hustle is quiet.</p>
              <p className="text-charcoal/40 text-xs mt-1">Claim a bounty to get started.</p>
            </div>
          ) : (
            <div>
              {inProgressTasks.map(task => {
                const displayStatus = taskStates[task.id] || task.status;
                const valueDisplay = `$${centsToDollars(getTaskValueCents(task)).toFixed(2)}`;

                return (
                  <div
                    key={task.id}
                    className="bg-cream border border-gold/10 rounded-2xl p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all mx-4 mb-3 shadow-sm hover:border-gold/30"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <span className="text-2xl flex-shrink-0">{getTaskIcon(task.name)}</span>
                      <div className="flex flex-col flex-1 items-start w-full">
                        <p className="font-semibold text-charcoal text-base truncate w-full text-left">{task.name}</p>
                        <p className="text-charcoal/50 text-sm text-left">
                          {task.baselineMinutes} mins · <span className="text-gold font-serif text-base">{valueDisplay}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-3">
                      {displayStatus === 'ASSIGNED' && (
                        <button
                          onClick={() => setTaskStates(prev => ({ ...prev, [task.id]: 'IN_PROGRESS' }))}
                          className="border border-crimson/40 text-crimson text-sm rounded-full px-5 py-2 bg-transparent hover:bg-crimson/5 transition-colors"
                        >
                          Mark Started
                        </button>
                      )}
                      {displayStatus === 'IN_PROGRESS' && (
                        <button
                          onClick={() => onSubmitTask(child.id, task)}
                          className="bg-ascendant-gradient text-white rounded-full px-5 py-2 text-sm font-bold border-0 whitespace-nowrap shadow-md active:scale-95 transition-transform"
                        >
                          ✓ I'm Done
                        </button>
                      )}
                      {displayStatus === 'PENDING_APPROVAL' && (
                        <span className="italic text-charcoal/40 text-sm whitespace-nowrap">⏳ Waiting for approval...</span>
                      )}
                      {displayStatus === 'PENDING_PAYMENT' && (
                        <span className="text-gold text-sm font-serif whitespace-nowrap font-bold">✅ Approved! Payout coming.</span>
                      )}
                      {displayStatus === 'REJECTED' && (
                        <div className="flex flex-col items-end gap-2">
                          <span className="bg-crimson/10 text-crimson text-xs font-semibold px-3 py-1 rounded-full">
                            REDO: {task.rejectionComment || 'Needs Revision'}
                          </span>
                          <button
                            onClick={() => setTaskStates(prev => ({ ...prev, [task.id]: 'IN_PROGRESS' }))}
                            className="border border-crimson text-crimson rounded-full px-5 py-2 bg-transparent text-sm font-bold whitespace-nowrap active:scale-95 transition-transform"
                          >
                            Try Again
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans pb-20">

      {/* 1. The Header: Financial Status */}
      <section className="bg-surface-app dark:bg-surface-elev border border-stroke-base rounded-2xl p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gold/10 rounded-bl-full pointer-events-none opacity-50" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-sm font-bold text-content-muted uppercase tracking-widest font-sans">Vault Balance</h2>
              {hasDebt && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Overdraft</span>}
            </div>
            <div className={`text-6xl font-bold font-serif font-heading tracking-tight ${hasDebt ? 'text-crimson' : 'text-content-primary'}`}>
              {formatCurrency(balance)}
            </div>
            <p className="text-content-muted mt-2 font-medium font-sans flex items-center gap-2">
              Rate: <span className="text-content-primary font-bold">{formatCurrency(hourlyRate)}/hr</span>
              {isParent && (
                <Settings className="w-4 h-4 cursor-pointer hover:text-crimson transition-colors" onClick={() => onEditSettings(child)} />
              )}
            </p>
          </div>

          {isParent && (
            <Button
              onClick={onAddAdvance}
              variant="outline"
              className="gap-2 border border-gold/30 hover:border-crimson rounded-full px-6 py-2 text-content-primary hover:text-crimson hover:bg-surface-2 transition-all"
            >
              <CreditCard className="w-4 h-4" />
              Add Advance
            </Button>
          )}
        </div>
      </section>

      {/* 2. Pending Cash Requests (Lien System) */}
      {isParent && pendingWithdrawalRequests.length > 0 && (
        <section className="animate-in slide-in-from-right duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-amber-100 flex items-center justify-center rounded-none font-bold text-amber-600">
              <Banknote className="w-4 h-4" />
            </div>
            <h3 className="text-xl font-bold font-heading text-content-primary">Pending Cash Requests</h3>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold rounded-full">{pendingWithdrawalRequests.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingWithdrawalRequests.map(tx => (
              <div key={tx.id} className="bg-surface-app border border-l-4 border-l-amber-500 border-y-stroke-base border-r-stroke-base p-6 flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold font-heading text-content-primary">{tx.memo || 'Cash Withdrawal'}</h4>
                    <p className="text-sm text-content-subtle font-sans flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-content-primary font-heading">
                    {formatCurrency(centsToDollars(tx.amountCents || dollarsToCents(tx.amount)))}
                  </div>
                </div>

                <Button
                  onClick={() => handleConfirmPayout(tx)}
                  variant="primary"
                  isLoading={isProcessingPayout === tx.id}
                  className="w-full !bg-amber-500 border-amber-500 hover:!bg-amber-600 text-white font-bold gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Payout & Update Ledger
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 3. The 'Audit Queue' (Tasks Awaiting Approval) */}
      {(pendingApprovalTasks.length > 0) && (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-amber-50 flex items-center justify-center rounded-none border border-amber-200">
              <Hourglass className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold font-heading text-content-primary">Audit Queue</h3>
            <span className="bg-surface-2 text-neutral-600 px-2 py-0.5 text-xs font-bold rounded-full">{pendingApprovalTasks.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovalTasks.map(task => (
              <div key={task.id} className="bg-cream border border-crimson/20 rounded-2xl px-5 py-4 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold font-heading text-content-primary">{task.name}</h4>
                    <span className="text-xl font-bold text-gold font-heading">{getTaskDisplayValue(task)}</span>
                  </div>
                  <p className="text-crimson/70 text-xs mb-6 font-sans flex items-center">
                    <span className="w-2 h-2 rounded-full bg-crimson animate-pulse inline-block mr-2" />
                    Awaiting Review
                  </p>
                </div>

                {isParent && (
                  <div className="flex gap-3 mt-auto w-full items-center">
                    <RejectDropdown task={task} onReject={(taskId, reason) => handleQuickReject(task, reason)} />
                    <button
                      onClick={() => handleApproveAndDeposit(task)}
                      className="flex-[2] bg-ascendant-gradient text-white rounded-full px-5 py-2 text-sm font-semibold border-0 flex items-center justify-center gap-2"
                    >
                      <ThumbsUp className="w-4 h-4" /> Approve & Deposit
                    </button>
                  </div>
                )}
                {!isParent && <p className="text-sm text-content-subtle italic">Parent will review this soon.</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. The 'Payable' Section (Ready for Payout) */}
      {isParent && (
        <div className="bg-charcoal border border-gold/20 rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-center justify-between mx-4 shadow-sm">
          <div className="text-center sm:text-left mb-4 sm:mb-0">
            <p className="text-xs tracking-widest text-gold/50 uppercase font-sans mb-1">Ready for Payout</p>
            <p className="font-serif text-gold text-4xl font-bold">{formatCurrency(balance > 0 ? balance : 0)}</p>
            <p className="text-charcoal/40 text-xs mt-1 text-white/40">
              Total payable balance available for cash withdrawal.
            </p>
          </div>
          <button
            onClick={() => openTransactionModal('PAYOUT')}
            className="bg-ascendant-gradient text-white rounded-full px-5 py-3 text-sm font-semibold flex items-center justify-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Record Cash Payment
          </button>
        </div>
      )}

      {/* 5. The 'Hustle' View (In-Progress Tasks) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-crimson/10 flex items-center justify-center rounded-none">
            <TrendingUp className="w-4 h-4 text-crimson" />
          </div>
          <h3 className="text-xl font-bold font-heading text-content-primary">The Hustle</h3>
          <span className="bg-surface-2 text-neutral-600 px-2 py-0.5 text-xs font-bold rounded-full">{inProgressTasks.length}</span>
        </div>

        {inProgressTasks.length === 0 ? (
          <div className="bg-cream border border-gold/20 p-8 text-center rounded-2xl">
            <p className="text-content-subtle font-sans">No tasks currently in progress. Grab one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressTasks.map(task => {
              const isBoosted = (task.bonusCents || 0) > 0 || (task.multiplier || 1) > 1;
              const isPending = task.status === 'PENDING_APPROVAL';
              const isAssigned = task.status === 'ASSIGNED';

              return (
                <div key={task.id} className="bg-surface-app border border-stroke-base p-6 flex flex-col justify-between group relative overflow-hidden active:scale-[0.98] transition-all">
                  {isBoosted && <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 rounded-bl-full" />}

                  <div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTaskIcon(task.name)}</span>
                        <h4 className="text-lg font-bold font-heading text-content-primary">{task.name}</h4>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-crimson font-heading flex items-center gap-1">
                          {getTaskDisplayValue(task)}
                          {isBoosted && <Flame className="w-4 h-4 text-orange-500 animate-pulse" fill="currentColor" />}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-6">
                      {task.rejectionComment && (
                        <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-none uppercase">
                          Redo: {task.rejectionComment}
                        </span>
                      )}
                      <span className="text-sm text-content-muted font-sans">{task.baselineMinutes} mins estimated</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto relative z-10 items-center w-full">
                    {isParent ? (
                      <>
                        <div className="flex items-center gap-3 w-full">
                          {isPending && (
                            <>
                              <RejectDropdown task={task} onReject={(taskId, reason) => handleQuickReject(task, reason)} />
                              <button
                                onClick={() => handleApproveAndDeposit(task)}
                                className="flex-[2] bg-ascendant-gradient text-white rounded-full px-5 py-2 text-sm font-semibold border-0 flex items-center justify-center gap-2"
                              >
                                <ThumbsUp className="w-4 h-4" /> Approve & Deposit
                              </button>
                            </>
                          )}
                          {isAssigned && (
                            <Button
                              onClick={() => onSubmitTask(child.id, { ...task, status: 'OPEN' })}
                              variant="ghost"
                              className="border border-crimson/40 text-crimson bg-transparent rounded-full px-5 py-2 text-sm hover:bg-crimson/5 transition-colors shadow-none flex-1"
                            >
                              Mark Started
                            </Button>
                          )}
                          {!isPending && !isAssigned && (
                            <Button
                              onClick={() => onSubmitTask(child.id, task)}
                              className="bg-ascendant-gradient text-white rounded-full px-5 py-2 text-sm shadow-md hover:shadow-lg transition-all flex-1"
                            >
                              ✓ I'm Done
                            </Button>
                          )}
                        </div>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 6. The Family Bank Statement (History) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-crimson/10 flex items-center justify-center rounded-none">
            <History className="w-4 h-4 text-crimson" />
          </div>
          <h3 className="text-xl font-bold font-heading text-content-primary">Transaction History</h3>
        </div>

        {sortedTransactions.length === 0 ? (
          <div className="text-center py-8 text-charcoal/40">No transactions yet</div>
        ) : (
          <div className="flex flex-col border border-gold/10 rounded-2xl overflow-hidden bg-cream">
            {sortedTransactions.map(tx => {
              const amountCents = getTransactionAmountCents(tx);
              const amount = centsToDollars(Math.abs(amountCents));

              let isPositive = amountCents > 0;
              if (tx.type === 'WITHDRAWAL_REQUEST' || tx.type === 'GOAL_ALLOCATION') {
                isPositive = false;
              }

              let description = tx.memo || (isPositive ? 'Deposit' : 'Withdrawal');
              let optionalMemo = null;

              if (tx.type === 'ADVANCE') {
                description = tx.category || 'Advance';
                if (tx.memo && tx.memo !== tx.category) {
                  optionalMemo = tx.memo;
                }
              } else if (tx.type === 'WITHDRAWAL_REQUEST') {
                description = 'Cash Withdrawal';
                optionalMemo = tx.memo;
              } else if (tx.type === 'GOAL_ALLOCATION') {
                description = 'Savings Goal';
                optionalMemo = tx.memo;
              }

              const dateStr = new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

              return (
                <div key={tx.id} className="bg-cream border-b border-gold/10 px-6 py-4 flex items-center justify-between rounded-none last:border-b-0">
                  <div className="flex flex-col">
                    <p className="text-charcoal font-medium">
                      {description}
                    </p>
                    {optionalMemo && (
                      <p className="text-charcoal/40 text-sm">{optionalMemo}</p>
                    )}
                    <p className="text-charcoal/50 text-sm mt-0.5">{dateStr}</p>
                  </div>
                  <div className={`font-serif text-lg ${isPositive ? 'text-gold' : 'text-crimson'}`}>
                    {isPositive ? '+' : '−'}{formatCurrency(amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Modal Definitions */}
      <TransactionModal
        isOpen={transactionModalOpen}
        onClose={() => setTransactionModalOpen(false)}
        type={transactionType}
        childId={child.id}
        householdId={child.householdId!}
        currentBalanceCents={balanceCents}
        childName={child.name}
      />

      {/* Completion Confirmation Modal */}
      {taskToComplete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-neutral-black/50 backdrop-blur-sm" onClick={() => setTaskToComplete(null)} />
          <div className="relative w-full max-w-sm bg-cream rounded-2xl border border-stroke-base p-8 text-center animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="mx-auto w-12 h-12 bg-cream-mid rounded-full flex items-center justify-center text-content-subtle mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-heading text-content-primary mb-2">{taskToComplete.name}</h3>
            <p className="text-content-muted mb-6 text-sm font-sans">
              Submit for parent approval to earn <span className="text-gold font-bold">{getTaskDisplayValue(taskToComplete)}</span>.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setTaskToComplete(null)}
                variant="ghost"
                className="flex-1 border border-gold/30 text-charcoal rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onSubmitTask(child.id, taskToComplete);
                  setTaskToComplete(null);
                }}
                className="flex-1 bg-ascendant-gradient hover:opacity-90 transition-opacity text-white shadow-sm border-none rounded-full"
              >
                Complete
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChildDetail;
