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
  onDeleteTask?: (childId: string, taskId: string) => void;
}

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
}) => {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
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
  const recentTransactions = transactions.length > 0 ? transactions : (child.history || []);
  const sortedTransactions = [...recentTransactions]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 15);

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
  const inProgressTasks = allCustomTasks.filter(t => t.status === 'ASSIGNED'); // Working on (Hustle)

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

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans pb-20">

      {/* 1. The Header: Financial Status */}
      <section className="bg-white border border-neutral-200 rounded-none p-8 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-bl-full pointer-events-none opacity-50" />

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-sm font-bold text-neutral-darkGray uppercase tracking-widest font-sans">Bank Balance</h2>
              {hasDebt && <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-none font-bold uppercase tracking-wider">Overdraft</span>}
            </div>
            <div className={`text-6xl font-bold font-heading tracking-tight ${hasDebt ? 'text-red-700' : 'text-neutral-black'}`}>
              {formatCurrency(balance)}
            </div>
            <p className="text-neutral-darkGray mt-2 font-medium font-sans flex items-center gap-2">
              Rate: <span className="text-neutral-black font-bold">{formatCurrency(hourlyRate)}/hr</span>
              {isParent && (
                <Settings className="w-4 h-4 cursor-pointer hover:text-primary-cardinal transition-colors" onClick={() => onEditSettings(child)} />
              )}
            </p>
          </div>

          {isParent && (
            <Button
              onClick={() => openTransactionModal('ADVANCE')}
              variant="outline"
              className="gap-2 border-dashed border-neutral-300 hover:border-primary-cardinal hover:text-primary-cardinal hover:bg-white"
            >
              <CreditCard className="w-4 h-4" />
              Advance Funds
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
            <h3 className="text-xl font-bold font-heading text-neutral-black">Pending Cash Requests</h3>
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 text-xs font-bold rounded-full">{pendingWithdrawalRequests.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingWithdrawalRequests.map(tx => (
              <div key={tx.id} className="bg-white border border-l-4 border-l-amber-500 border-y-neutral-200 border-r-neutral-200 p-6 flex flex-col justify-between shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-lg font-bold font-heading text-neutral-black">{tx.memo || 'Cash Withdrawal'}</h4>
                    <p className="text-sm text-neutral-400 font-sans flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {new Date(tx.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-2xl font-bold text-neutral-black font-heading">
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
            <h3 className="text-xl font-bold font-heading text-neutral-black">Audit Queue</h3>
            <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 text-xs font-bold rounded-full">{pendingApprovalTasks.length}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingApprovalTasks.map(task => (
              <div key={task.id} className="bg-white border border-neutral-200 p-6 shadow-sm flex flex-col justify-between hover:border-amber-400 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-lg font-bold font-heading text-neutral-black">{task.name}</h4>
                    <span className="text-xl font-bold text-emerald-700 font-heading">{getTaskDisplayValue(task)}</span>
                  </div>
                  <p className="text-sm text-neutral-500 mb-6 font-sans flex items-center gap-2">
                    <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
                    Awaiting Review
                  </p>
                </div>

                {isParent && (
                  <div className="flex gap-3 mt-auto">
                    <Popover className="relative flex-1">
                      <Popover.Button as={Button} variant="destructive" className="w-full text-xs gap-2">
                        <ThumbsDown className="w-3 h-3" /> Reject
                      </Popover.Button>
                      <Popover.Panel className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-neutral-200 shadow-xl p-2 z-50 flex flex-col gap-1 rounded-none">
                        <div className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1 px-2">Quick Reason</div>
                        {['Incomplete', 'Poor Quality', 'Wrong Task'].map(reason => (
                          <button
                            key={reason}
                            className="text-left px-3 py-2 text-sm text-neutral-700 hover:bg-red-50 hover:text-red-700 transition-colors rounded-none"
                            onClick={() => handleQuickReject(task, reason)}
                          >
                            {reason}
                          </button>
                        ))}
                      </Popover.Panel>
                    </Popover>

                    <Button
                      onClick={() => handleApproveAndDeposit(task)}
                      variant="primary"
                      className="flex-[2] !bg-emerald-600 border-emerald-600 hover:!bg-emerald-700 text-white text-xs gap-2"
                    >
                      <ThumbsUp className="w-3 h-3" /> Approve & Deposit
                    </Button>
                  </div>
                )}
                {!isParent && <p className="text-sm text-neutral-400 italic">Parent will review this soon.</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. The 'Payable' Section (Ready for Payout) */}
      {isParent && (
        <section className="bg-neutral-900 text-white p-8 rounded-none border border-neutral-900 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-32 bg-white/5 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="text-center sm:text-left">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest mb-2 font-sans">Ready for Payout</h3>
              <div className="text-5xl font-bold font-heading mb-1">{formatCurrency(balance > 0 ? balance : 0)}</div>
              <p className="text-neutral-500 text-sm">Total payable balance available for cash withdrawal.</p>
            </div>
            <div>
              <Button
                size="lg"
                onClick={() => openTransactionModal('PAYOUT')}
                className="bg-primary-gold text-neutral-900 hover:bg-yellow-400 border-none font-bold px-8 shadow-lg shadow-primary-gold/20"
              >
                <Banknote className="w-5 h-5 mr-2" />
                Record Cash Payment
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 5. The 'Hustle' View (In-Progress Tasks) */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-blue-100 flex items-center justify-center rounded-none">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="text-xl font-bold font-heading text-neutral-black">The Hustle</h3>
          <span className="bg-neutral-100 text-neutral-600 px-2 py-0.5 text-xs font-bold rounded-full">{inProgressTasks.length}</span>
        </div>

        {inProgressTasks.length === 0 ? (
          <div className="bg-neutral-50 border border-dashed border-neutral-300 p-8 text-center">
            <p className="text-neutral-500 font-sans">No tasks currently in progress. Grab one!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inProgressTasks.map(task => {
              const isBoosted = (task.bonusCents || 0) > 0 || (task.multiplier || 1) > 1;

              return (
                <div key={task.id} className="bg-white border border-neutral-200 p-6 flex flex-col justify-between group relative overflow-hidden active:scale-[0.98] transition-all">
                  {isBoosted && <div className="absolute top-0 right-0 w-16 h-16 bg-primary-gold/10 rounded-bl-full" />}

                  <div>
                    <div className="flex justify-between items-start mb-2 relative z-10">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{getTaskIcon(task.name)}</span>
                        <h4 className="text-lg font-bold font-heading text-neutral-black">{task.name}</h4>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xl font-bold text-primary-cardinal font-heading flex items-center gap-1">
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
                      <span className="text-sm text-neutral-darkGray font-sans">{task.baselineMinutes} mins estimated</span>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-auto relative z-10">
                    <Button
                      onClick={() => setTaskToComplete(task)}
                      variant="outline"
                      className="flex-1 border-neutral-300 hover:border-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 gap-2"
                    >
                      <Check className="w-4 h-4" /> Mark Complete
                    </Button>

                    {isParent && (
                      <Button
                        onClick={() => handleBoost(task, 100)}
                        variant="ghost"
                        className="px-2 text-primary-gold hover:bg-orange-50 hover:text-orange-600"
                        title="Boost +$1.00"
                      >
                        <Flame className="w-4 h-4" /> +$1
                      </Button>
                    )}
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
          <div className="w-8 h-8 bg-neutral-100 flex items-center justify-center rounded-none">
            <History className="w-4 h-4 text-neutral-600" />
          </div>
          <h3 className="text-xl font-bold font-heading text-neutral-black">Transaction History</h3>
        </div>

        <div className="border border-neutral-200 bg-white rounded-none overflow-hidden">
          {sortedTransactions.length === 0 && (
            <div className="p-8 text-center text-neutral-darkGray text-sm">No recent transactions.</div>
          )}
          <div className="divide-y divide-neutral-100">
            {sortedTransactions.map(tx => {
              const amountCents = getTransactionAmountCents(tx);
              const amount = centsToDollars(Math.abs(amountCents));

              let isPositive = amountCents > 0;
              let statusLabel = '';
              let Icon = isPositive ? ArrowUpRight : ArrowDownLeft;
              let iconColor = isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700';

              if (tx.type === 'WITHDRAWAL_REQUEST') {
                isPositive = false;
                Icon = Banknote;
                iconColor = tx.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-neutral-100 text-neutral-400';
                statusLabel = tx.status === 'PENDING' ? '(Pending Payout)' : '(Paid)';
              } else if (tx.type === 'GOAL_ALLOCATION') {
                isPositive = false;
                Icon = Target;
                iconColor = 'bg-blue-100 text-blue-700';
                statusLabel = '(Savings Goal)';
              }

              return (
                <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColor}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-neutral-black font-sans">
                        {tx.memo || (isPositive ? 'Deposit' : 'Withdrawal')}
                        {statusLabel && <span className="ml-2 text-[10px] font-normal opacity-70 uppercase tracking-tighter">{statusLabel}</span>}
                      </p>
                      <p className="text-xs text-neutral-400">{new Date(tx.date).toLocaleDateString()} • {new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className={`text-base font-bold font-heading ${isPositive ? 'text-emerald-700' : 'text-red-700'}`}>
                    {isPositive ? '+' : '-'}{formatCurrency(amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
          <div className="relative w-full max-w-sm bg-white rounded-none border border-neutral-200 p-8 text-center animate-in zoom-in-95 duration-200 shadow-xl">
            <div className="mx-auto w-12 h-12 bg-neutral-100 rounded-full flex items-center justify-center text-neutral-400 mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-heading text-neutral-black mb-2">{taskToComplete.name}</h3>
            <p className="text-neutral-darkGray mb-6 text-sm font-sans">
              Submit for parent approval to earn <span className="text-emerald-700 font-bold">{getTaskDisplayValue(taskToComplete)}</span>.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setTaskToComplete(null)}
                variant="ghost"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onSubmitTask(child.id, taskToComplete);
                  setTaskToComplete(null);
                }}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none"
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
