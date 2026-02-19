
import React, { useState, useEffect, useRef } from 'react';
import { Child, Grade, StandardTask, Task } from '@/types';
import { db } from '@/services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
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
} from '@/utils';
import { DEFAULT_RATES } from '@/constants';
import {
  Check,
  ArrowRight,
  Target,
  Hourglass,
  AlertCircle,
  Lightbulb,
  Coins
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface ChildDetailProps {
  child: Child;
  isParent: boolean;
  standardTasks?: StandardTask[];
  availableTasks?: Task[];
  onUpdateGrades: (child: Child) => void;
  onSubmitTask: (childId: string, task: Task) => void;
  onApproveTask: (childId: string, task: Task) => void;
  onRejectTask: (childId: string, task: Task) => void;
  onPayTask: (childId: string, task: Task) => void;
  onClaimTask: (childId: string, taskId: string) => void;
  onDeleteTask?: (childId: string, taskId: string) => void;
}

const ChildDetail: React.FC<ChildDetailProps> = ({
  child,
  isParent,
  standardTasks = [],
  availableTasks = [],
  onUpdateGrades,
  onSubmitTask,
  onApproveTask,
  onRejectTask,
  onPayTask,
  onClaimTask,
  onDeleteTask,
}) => {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [subCollectionTasks, setSubCollectionTasks] = useState<Task[]>([]);
  const prevBalance = useRef(child.balance);

  useEffect(() => {
    prevBalance.current = child.balance;
  }, [child.balance]);

  useEffect(() => {
    if (!child.householdId || !child.id) return;

    const q = query(collection(db, `households/${child.householdId}/profiles/${child.id}/tasks`));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map(doc => mapTask(doc.id, child.householdId, doc.data()));
      setSubCollectionTasks(mapped);
    });

    return () => unsubscribe();
  }, [child.householdId, child.id]);

  const hourlyRate = calculateHourlyRate(child.subjects, child.rates || DEFAULT_RATES);
  const hourlyRateCents = dollarsToCents(hourlyRate);
  const balanceCents = typeof child.balanceCents === 'number' ? child.balanceCents : Math.round(child.balance * 100);
  const balance = centsToDollars(balanceCents);
  const hasDebt = balanceCents < 0;
  const recentTransactions = [...child.history]
    .sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime())
    .slice(0, 12);

  const getTaskValueCents = (task: Task) => {
    if (task.valueCents !== undefined) return task.valueCents;
    return calculateTaskValueCents(task.baselineMinutes, hourlyRateCents);
  };

  const getTaskDisplayValue = (task: Task) => {
    if (task.valueCents !== undefined) return formatCurrency(centsToDollars(task.valueCents));
    return formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate));
  };

  // Merge tasks
  const allCustomTasks = [...(child.customTasks || []), ...subCollectionTasks].reduce((acc, task) => {
    if (!acc.some(t => t.id === task.id)) {
      acc.push(task);
    }
    return acc;
  }, [] as Task[]);

  // Earnings Calculations
  const readyToCollectCents = allCustomTasks
    .filter(t => t.status === 'PENDING_PAYMENT')
    .reduce((sum, t) => sum + getTaskValueCents(t), 0);
  const readyToCollect = centsToDollars(readyToCollectCents);

  const inReviewCents = allCustomTasks
    .filter(t => t.status === 'PENDING_APPROVAL')
    .reduce((sum, t) => sum + getTaskValueCents(t), 0);
  const inReview = centsToDollars(inReviewCents);

  const canEarnTodayCents = availableTasks
    .reduce((sum, t) => sum + getTaskValueCents(t), 0);
  const canEarnToday = centsToDollars(canEarnTodayCents);

  // Weekly total calculation
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start

  const paidThisWeekCents = child.history
    .filter(tx => tx.type === 'EARNING' && new Date(tx.date) >= startOfWeek)
    .reduce((sum, tx) => sum + getTransactionAmountCents(tx), 0);
  const paidThisWeek = centsToDollars(paidThisWeekCents);

  const totalEarnedThisWeek = paidThisWeek + readyToCollect;

  // Task Grouping
  const grabTasks = availableTasks;
  const inProgress = allCustomTasks.filter(t => t.status === 'ASSIGNED' && !t.rejectionComment);
  const waitingApproval = allCustomTasks.filter(t => t.status === 'PENDING_APPROVAL');
  const rejectedTasks = allCustomTasks.filter(t => t.status === 'ASSIGNED' && t.rejectionComment);
  const readyCollectTasks = allCustomTasks.filter(t => t.status === 'PENDING_PAYMENT');

  const formatLedgerDate = (value: string): string => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return 'Unknown date';
    }

    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(parsed);
  };

  const handleConfirmCompletion = () => {
    if (taskToComplete) {
      onSubmitTask(child.id, taskToComplete);
      setTaskToComplete(null);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-700';
    if (grade.startsWith('B')) return 'text-blue-700';
    return 'text-neutral-darkGray';
  };

  const EmptyState = () => (
    <div className="bg-white border border-neutral-200 rounded-none p-12 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-neutral-50 rounded-full flex items-center justify-center mb-6">
        <Target className="w-10 h-10 text-primary-cardinal" />
      </div>
      <h3 className="text-xl font-bold font-heading text-neutral-black mb-2">Ready to Earn?</h3>
      <p className="text-neutral-darkGray mb-8 max-w-sm font-sans">No tasks available right now. Ask your parents if there's anything you can help with!</p>
      <div className="bg-primary-cardinal/5 border border-primary-cardinal/10 rounded-none p-4 flex items-center gap-3 max-w-md mx-auto">
        <Lightbulb className="w-5 h-5 text-primary-cardinal" />
        <p className="text-sm text-neutral-black font-medium text-left font-sans">
          TIP: Keeping your grades up means earning more per hour. <br />
          <span className="text-neutral-darkGray">Your current rate: {formatCurrency(hourlyRate)}/hr</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 font-sans">
      {/* Top Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Your Earnings Card */}
        <div className="relative bg-white border border-neutral-200 rounded-none p-8 overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-gold/10 rounded-bl-full pointer-events-none" />

          <p className="text-[0.875rem] font-bold text-neutral-darkGray uppercase tracking-widest mb-6 font-sans">Your Earnings</p>

          <div className="space-y-6 mb-8 relative z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-xl">💰</div>
                <span className="text-neutral-black font-medium">Ready to Collect</span>
              </div>
              <span className="text-xl font-bold text-emerald-700">{formatCurrency(readyToCollect)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-cardinal/5 flex items-center justify-center text-xl">⏳</div>
                <span className="text-neutral-black font-medium">In Review</span>
              </div>
              <span className="text-xl font-bold text-primary-cardinal">{formatCurrency(inReview)}</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-xl">🎯</div>
                <span className="text-neutral-black font-medium">Can Earn Today</span>
              </div>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(canEarnToday)}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-neutral-200 flex items-end justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-neutral-darkGray uppercase tracking-widest mb-1 font-sans">Total Earned This Week</p>
              <div className="text-4xl font-bold font-heading text-neutral-black">
                {formatCurrency(totalEarnedThisWeek)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[0.625rem] font-bold text-neutral-darkGray uppercase tracking-widest font-sans">Resets Sunday</p>
            </div>
          </div>
        </div>

        {/* Your Rate Card */}
        <div className="bg-white border border-neutral-200 rounded-none p-8 flex flex-col justify-between group relative overflow-hidden">
          <div>
            <p className="text-[0.875rem] font-bold text-neutral-darkGray uppercase tracking-widest mb-4 font-sans">Your Rate</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-neutral-black tracking-tighter font-heading">{formatCurrency(hourlyRate)}</span>
              <span className="text-xl text-neutral-darkGray font-medium font-sans">/hr</span>
            </div>
            <div className="mt-6 border border-neutral-200 bg-neutral-50 p-4 rounded-none">
              <p className="text-xs font-bold uppercase tracking-widest text-neutral-darkGray mb-1 font-sans">Current Balance</p>
              <div className="flex items-center gap-2">
                <span
                  className="text-2xl font-bold font-heading text-neutral-black"
                  style={{ color: hasDebt ? '#dc2626' : undefined }}
                >
                  {formatCurrency(balance)}
                </span>
                {hasDebt && (
                  <span className="px-2 py-0.5 rounded-none text-[0.625rem] font-bold uppercase tracking-wider bg-red-50 text-red-700">
                    Debt
                  </span>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-4 text-xs font-bold border-neutral-200 hover:bg-neutral-50"
                onClick={() => {
                  const amountStr = prompt("How much do you need? (e.g. 5.00)");
                  if (!amountStr) return;
                  const amount = parseFloat(amountStr);
                  if (!amount || isNaN(amount) || amount <= 0) return;

                  const withdrawalTask: Task = {
                    id: '',
                    householdId: child.householdId,
                    name: 'Withdrawal Request',
                    baselineMinutes: 0,
                    status: 'PENDING_WITHDRAWAL',
                    assigneeId: child.id,
                    valueCents: -Math.round(amount * 100),
                    createdAt: new Date().toISOString()
                  };
                  onSubmitTask(child.id, withdrawalTask);
                }}
              >
                Request Funds
              </Button>
            </div>
          </div>

          <div className="mt-8 bg-primary-gold/10 border border-primary-gold/20 rounded-none p-5 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <Lightbulb className="w-5 h-5 text-neutral-black shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-neutral-black mb-1 font-heading">Earn more per hour!</p>
                <p className="text-xs text-neutral-darkGray leading-relaxed font-sans">Improve your grades in subjects with B's or lower to increase your base earning power.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold font-heading text-neutral-black mb-1">Transaction History</h3>
            <p className="text-sm text-neutral-darkGray font-sans">Professional ledger of earnings, advances, and adjustments</p>
          </div>
        </div>

        <div className="border border-neutral-200 bg-white overflow-hidden rounded-none">
          {recentTransactions.length === 0 && (
            <div className="p-8 text-sm text-neutral-darkGray text-center font-sans">No transactions recorded yet.</div>
          )}

          {recentTransactions.length > 0 && (
            <div className="divide-y divide-neutral-200">
              {recentTransactions.map((transaction) => {
                const amountCents = getTransactionAmountCents(transaction);
                const amount = centsToDollars(Math.abs(amountCents));
                const isNegative = amountCents < 0;
                return (
                  <div key={transaction.id} className="p-4 md:p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm md:text-base text-neutral-black font-semibold truncate font-sans">
                        {transaction.memo || (transaction.type === 'ADVANCE' ? 'Advance' : 'Task Payment')}
                      </p>
                      <p className="text-xs text-neutral-darkGray mt-1 font-sans">{formatLedgerDate(transaction.date)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-[0.625rem] font-bold uppercase tracking-wider text-neutral-darkGray mb-1 font-sans">
                        {transaction.type}
                      </p>
                      <p
                        className="text-base font-bold font-sans"
                        style={{ color: isNegative ? '#dc2626' : '#059669' }}
                      >
                        {isNegative ? '-' : '+'}
                        {formatCurrency(amount)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Academics Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold font-heading text-neutral-black mb-1">Academics</h3>
          <p className="text-sm text-neutral-darkGray font-sans">Your grades determine your hourly rate</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {child.subjects.map(subject => (
            <div
              key={subject.id}
              className="bg-white border border-neutral-200 rounded-none p-6 text-center hover:shadow-md transition-all group cursor-pointer"
              onClick={() => onUpdateGrades(child)}
            >
              <p className="text-xs font-bold text-neutral-darkGray uppercase tracking-widest mb-3 truncate font-sans">{subject.name}</p>
              <div className={`text-4xl font-bold ${getGradeColor(subject.grade)} font-heading`}>
                {subject.grade}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Tasks Section */}
      <div className="space-y-12">
        {/* GRAB A TASK */}
        {grabTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold font-heading text-neutral-black tracking-tight uppercase">🎯 Grab a Task</h4>
              <span className="text-sm text-neutral-darkGray font-bold font-sans">({grabTasks.length} available)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grabTasks.map(task => (
                <div key={task.id} className="bg-white border border-neutral-200 rounded-none p-6 hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold font-heading text-neutral-black">{task.name}</h5>
                    </div>
                    <span className="text-2xl font-bold text-primary-cardinal font-heading flex flex-col items-end">
                      {getTaskDisplayValue(task)}
                      {(task.multiplier || 1) > 1 && (
                        <span className="text-[10px] bg-primary-gold text-white px-1.5 py-0.5 rounded-none uppercase tracking-widest font-black animate-pulse">
                          {(task.multiplier || 1)}x Boost
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-darkGray mb-6 font-medium font-sans">
                    {task.baselineMinutes} min × {formatCurrency(hourlyRate)}/hr
                  </p>
                  <Button
                    onClick={() => onClaimTask(child.id, task.id)}
                    className="w-full gap-2 shadow-sm"
                    variant="primary"
                  >
                    Claim Task <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* IN PROGRESS */}
        {inProgress.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold font-heading text-neutral-black tracking-tight uppercase">⚡ Working On</h4>
              <span className="text-sm text-neutral-darkGray font-bold font-sans">({inProgress.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgress.map(task => (
                <div key={task.id} className="bg-white border border-neutral-200 rounded-none p-6 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold font-heading text-neutral-black">{task.name}</h5>
                    </div>
                    <span className="text-2xl font-bold text-primary-cardinal font-heading flex flex-col items-end">
                      {getTaskDisplayValue(task)}
                      {(task.multiplier || 1) > 1 && (
                        <span className="text-[10px] bg-primary-gold text-white px-1.5 py-0.5 rounded-none uppercase tracking-widest font-black animate-pulse">
                          {(task.multiplier || 1)}x Boost
                        </span>
                      )}
                    </span>
                  </div>
                  <p className="text-sm text-neutral-darkGray mb-6 font-sans">Baseline: {task.baselineMinutes} mins</p>
                  <Button
                    onClick={() => setTaskToComplete(task)}
                    variant="outline"
                    className="w-full gap-2"
                  >
                    Mark Complete <Check className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WAITING FOR APPROVAL */}
        {(waitingApproval.length > 0 || rejectedTasks.length > 0) && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold font-heading text-neutral-black tracking-tight uppercase">⏳ Waiting for Approval</h4>
              <span className="text-sm text-neutral-darkGray font-bold font-sans">({waitingApproval.length + rejectedTasks.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waitingApproval.map(task => (
                <div key={task.id} className="bg-neutral-50 border border-neutral-200 rounded-none p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold font-heading text-neutral-black">{task.name}</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-neutral-darkGray uppercase tracking-wider mb-1 font-sans">Will earn</p>
                      <span className="text-xl font-bold text-neutral-black font-heading">
                        {getTaskDisplayValue(task)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-darkGray font-medium font-sans">
                    <Hourglass className="w-4 h-4" />
                    Waiting for parent review...
                  </div>
                </div>
              ))}

              {rejectedTasks.map(task => (
                <div key={task.id} className="bg-red-50 border border-red-100 rounded-none p-6 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold font-heading text-neutral-black">{task.name}</h5>
                    </div>
                    <span className="text-xl font-bold text-red-700 font-heading">
                      {getTaskDisplayValue(task)}
                    </span>
                  </div>

                  <div className="bg-white border border-red-100 rounded-none p-4 mb-6">
                    <p className="text-[0.6875rem] font-bold text-red-700 uppercase tracking-widest mb-1 flex items-center gap-1.5 font-sans">
                      <AlertCircle className="w-3 h-3" /> Sent back with feedback:
                    </p>
                    <p className="text-sm text-neutral-black leading-relaxed italic font-sans">"{task.rejectionComment}"</p>
                  </div>

                  <Button
                    onClick={() => {
                      const updatedTask = { ...task, rejectionComment: undefined };
                      onSubmitTask(child.id, updatedTask);
                    }}
                    className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white border-none shadow-sm"
                  >
                    Redo Task <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* READY TO COLLECT */}
        {readyCollectTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold font-heading text-neutral-black tracking-tight uppercase">✅ Ready to Collect</h4>
              <span className="text-sm text-neutral-darkGray font-bold font-sans">({readyCollectTasks.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyCollectTasks.map(task => (
                <div key={task.id} className="bg-emerald-50 border border-emerald-100 rounded-none p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold font-heading text-neutral-black">{task.name}</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1 font-sans">Earned</p>
                      <span className="text-2xl font-bold text-emerald-700 font-heading">
                        {getTaskDisplayValue(task)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-darkGray font-medium font-sans">
                    <Coins className="w-4 h-4 text-emerald-600" />
                    Approved! Ask parent for payment.
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Overall Empty State */}
        {grabTasks.length === 0 &&
          inProgress.length === 0 &&
          waitingApproval.length === 0 &&
          rejectedTasks.length === 0 &&
          readyCollectTasks.length === 0 && (
            <EmptyState />
          )}
      </div>

      {/* Completion Confirmation Modal */}
      {
        taskToComplete && (
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
                  onClick={handleConfirmCompletion}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border-none"
                >
                  Complete
                </Button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
};

export default ChildDetail;
