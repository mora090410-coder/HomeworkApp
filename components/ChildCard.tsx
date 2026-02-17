
import React, { useState, useEffect } from 'react';
import { Child, Task } from '@/types';
import {
  calculateHourlyRate,
  calculateTaskValue,
  calculateTaskValueCents,
  centsToDollars,
  dollarsToCents,
  formatCurrency,
  getTaskIcon,
  getTransactionAmountCents,
} from '@/utils';
import {
  Settings,
  ChevronDown,
  Clock,
  MoreHorizontal,
  Plus,
  Edit2,
  Trash2,
  UserPlus,
  Briefcase,
  ChevronRight,
  AlertTriangle,
  DollarSign,
  Check,
  X,
  RotateCcw
} from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

interface ChildCardProps {
  child: Child;
  siblings?: Child[];
  onEditSettings: (child: Child) => void;
  onUpdateGrades: (child: Child) => void;
  onInviteChild: (child: Child) => void;
  onAssignTask: (child: Child) => void;
  onDeleteTask: (childId: string, taskId: string) => void;
  onEditTask: (task: Task) => void;
  onReassignTask: (task: Task, toChildId: string) => void;
  onApproveTask: (childId: string, task: Task) => void;
  onRejectTask: (childId: string, task: Task) => void;
  onPayTask: (childId: string, task: Task) => void;
  onUndoApproval: (childId: string, taskId: string) => void;
}

const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; count: number; colorClass: string }> = ({ icon, title, count, colorClass }) => (
  <div className={`flex items-center justify-between px-3 py-2 mt-4 mb-2 rounded-lg bg-surface-2 border border-stroke-base ${colorClass}`}>
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      <span className="text-[0.75rem] font-bold uppercase tracking-[0.06em]">{title}</span>
    </div>
    <span className="text-[0.75rem] font-bold opacity-60">({count})</span>
  </div>
);

const ChildCard: React.FC<ChildCardProps> = ({
  child,
  siblings = [],
  onEditSettings,
  onUpdateGrades,
  onInviteChild,
  onAssignTask,
  onDeleteTask,
  onEditTask,
  onReassignTask,
  onApproveTask,
  onRejectTask,
  onPayTask,
  onUndoApproval
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [activeSubmenuId, setActiveSubmenuId] = useState<string | null>(null);

  const hourlyRate = calculateHourlyRate(child.subjects, child.rates);
  const hourlyRateCents = dollarsToCents(hourlyRate);
  const setupStatus = child.setupStatus ?? 'PROFILE_CREATED';
  const setupLabel =
    setupStatus === 'INVITE_SENT'
      ? 'Invite Sent'
      : setupStatus === 'SETUP_COMPLETE'
        ? 'Ready'
        : 'Setup Pending';
  const setupBadgeClass =
    setupStatus === 'INVITE_SENT'
      ? 'border-primary-400/30 bg-primary-400/10 text-primary-300'
      : setupStatus === 'SETUP_COMPLETE'
        ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
        : 'border-sky-400/30 bg-sky-400/10 text-sky-300';

  // TASK GROUPING LOGIC
  const awaitingApproval = child.customTasks?.filter(t => t.status === 'PENDING_APPROVAL') || [];
  const readyToPay = child.customTasks?.filter(t => t.status === 'PENDING_PAYMENT') || [];
  const inProgress = child.customTasks?.filter(t => t.status === 'ASSIGNED' || !t.status) || [];

  // STATS CALCULATIONS
  const earnedAmountCents = readyToPay.reduce(
    (sum, task) => sum + calculateTaskValueCents(task.baselineMinutes, hourlyRateCents),
    0,
  );
  const pendingAmountCents = [...inProgress, ...awaitingApproval].reduce(
    (sum, task) => sum + calculateTaskValueCents(task.baselineMinutes, hourlyRateCents),
    0,
  );
  const paidAmount = child.history
    .filter(tx => tx.type === 'EARNING')
    .reduce((sum, tx) => sum + getTransactionAmountCents(tx), 0);
  const earnedAmount = centsToDollars(earnedAmountCents);
  const pendingAmount = centsToDollars(pendingAmountCents);
  const paidAmountDollars = centsToDollars(paidAmount);

  useEffect(() => {
    const handleGlobalClick = () => {
      setActiveMenuId(null);
      setActiveSubmenuId(null);
    };
    if (activeMenuId) window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [activeMenuId]);

  const toggleMenu = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === taskId ? null : taskId);
    setActiveSubmenuId(null);
  };

  const getToggleLabel = () => {
    if (!isExpanded) {
      if (awaitingApproval.length > 0) return `Show Tasks — ${awaitingApproval.length} Need Approval ⚠️`;
      if (readyToPay.length > 0) return `Show Tasks — ${readyToPay.length} Ready to Pay 💰`;
      return `Show Tasks (${child.customTasks?.length || 0})`;
    }
    if (awaitingApproval.length > 0 || readyToPay.length > 0) {
      const urgentCount = awaitingApproval.length + readyToPay.length;
      return `Hide Tasks (${urgentCount} need attention)`;
    }
    return `Hide Tasks (${child.customTasks?.length || 0})`;
  };

  return (
    <div className="flex flex-col gap-3 font-sans w-full">
      <style>{`
        @keyframes pulse-primary {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        .animate-pulse-primary {
          animation: pulse-primary 2s ease-in-out infinite;
        }
      `}</style>

      <div className="group relative glass-card p-8 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary-gradient opacity-60" />

        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-[1.75rem] font-[590] text-content-primary tracking-tight mb-1">{child.name}</h2>
            <p className="text-[0.9375rem] text-content-muted font-medium">{child.gradeLevel}</p>
            <span className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${setupBadgeClass}`}>
              {setupLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 glass-panel px-3 py-1.5 rounded-full">
              <div className="w-4 h-4 rounded-full bg-green-500/20 text-green-600 dark:text-green-500 flex items-center justify-center text-[10px] font-bold">$</div>
              <span className="text-sm font-semibold text-content-primary">{formatCurrency(hourlyRate)}/hr</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => { e.stopPropagation(); onEditSettings(child); }}
              className="rounded-full text-content-muted hover:text-content-primary"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-wider">Earned</span>
            <span className="text-[1.5rem] font-[590] text-emerald-600 dark:text-emerald-400 tracking-tight">{formatCurrency(earnedAmount)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-stroke-base pl-4">
            <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-wider">Pending</span>
            <span className="text-[1.5rem] font-[590] text-primary-600 dark:text-primary-400 tracking-tight">{formatCurrency(pendingAmount)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-stroke-base pl-4">
            <span className="text-[0.6875rem] font-bold text-content-muted uppercase tracking-wider">Paid</span>
            <span className="text-[1.5rem] font-[590] text-blue-600 dark:text-blue-400 tracking-tight">{formatCurrency(paidAmountDollars)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="glass"
            onClick={() => onUpdateGrades(child)}
            className="w-full justify-center group/btn"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Update Grades
          </Button>

          <Button
            variant="primary"
            onClick={() => onAssignTask(child)}
            className="w-full justify-center group/btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Assign Task
          </Button>

          <Button
            variant="glass"
            onClick={() => onInviteChild(child)}
            className="w-full justify-center group/btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {setupStatus === 'SETUP_COMPLETE' ? 'Reinvite' : 'Invite'}
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-stroke-base flex justify-center">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 text-[0.8125rem] font-bold transition-colors group/toggle ${awaitingApproval.length > 0 ? 'text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300' : 'text-content-muted hover:text-primary-600 dark:hover:text-primary-400'}`}
          >
            <span>{getToggleLabel()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-col gap-1 animate-in slide-in-from-top-2 fade-in duration-300 origin-top pb-4">

          {/* AWAITING APPROVAL SECTION */}
          {awaitingApproval.length > 0 && (
            <>
              <SectionHeader
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                title="Awaiting Your Approval"
                count={awaitingApproval.length}
                colorClass="text-primary-400"
              />
              {awaitingApproval.map(task => (
                <div key={task.id} className="bg-primary-50/50 dark:bg-primary-500/5 border-2 border-primary-100 dark:border-primary-500/50 rounded-2xl p-5 mb-2 relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-bold text-content-primary">{task.name}</span>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="icon" onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 text-content-muted hover:text-content-primary"><MoreHorizontal className="w-4 h-4" /></Button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 glass-card border border-stroke-base rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#ff4444] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <div className="flex items-center gap-1 text-content-muted text-xs font-medium"><Clock className="w-3 h-3" /> {task.baselineMinutes} min</div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-500/20 text-primary-700 dark:text-primary-400 text-[0.625rem] font-black uppercase tracking-widest animate-pulse-primary">Awaiting Approval</span>
                    <span className="text-xs font-bold text-primary-600 dark:text-primary-400">Will earn: {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => onApproveTask(child.id, task)} className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-lg shadow-primary-500/20"><Check className="w-4 h-4 mr-2" /> Approve</Button>
                    <Button onClick={() => onRejectTask(child.id, task)} variant="outline" className="w-full border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10"><X className="w-4 h-4 mr-2" /> Reject</Button>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* READY TO PAY SECTION */}
          {readyToPay.length > 0 && (
            <>
              <SectionHeader
                icon={<DollarSign className="w-3.5 h-3.5" />}
                title="Ready to Pay"
                count={readyToPay.length}
                colorClass="text-emerald-400"
              />
              {readyToPay.map(task => (
                <div key={task.id} className="bg-emerald-50/50 dark:bg-emerald-500/5 border-2 border-emerald-100 dark:border-emerald-500/50 rounded-2xl p-5 mb-2 relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-bold text-content-primary">{task.name}</span>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="icon" onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 text-content-muted hover:text-content-primary"><MoreHorizontal className="w-4 h-4" /></Button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 glass-card border border-stroke-base rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={(e) => { e.stopPropagation(); onUndoApproval(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-orange-500 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-500/10 flex items-center gap-2 cursor-pointer"><RotateCcw className="w-4 h-4" />Undo Approval</button>
                          <div className="h-px bg-stroke-base my-1" />
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#ff4444] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <div className="flex items-center gap-1 text-content-muted text-xs font-medium"><Clock className="w-3 h-3" /> {task.baselineMinutes} min</div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[0.625rem] font-black uppercase tracking-widest">Approved</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Earned: {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}</span>
                  </div>
                  <Button onClick={() => onPayTask(child.id, task)} className="w-full bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-lg shadow-emerald-500/20"><DollarSign className="w-4 h-4 mr-2" /> Mark as Paid</Button>
                </div>
              ))}
            </>
          )}

          {/* IN PROGRESS SECTION */}
          {inProgress.length > 0 && (
            <>
              <SectionHeader
                icon={<Clock className="w-3.5 h-3.5" />}
                title="In Progress"
                count={inProgress.length}
                colorClass="text-content-subtle"
              />
              {inProgress.map(task => (
                <div key={task.id} className="bg-surface-2 border border-stroke-base rounded-2xl p-5 mb-2 hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors group/task relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-medium text-content-primary">{task.name}</span>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="icon" onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 text-content-muted hover:text-content-primary"><MoreHorizontal className="w-4 h-4" /></Button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 glass-card border border-stroke-base rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <div className="relative group/reassign">
                            <button onClick={(e) => { e.stopPropagation(); setActiveSubmenuId(activeSubmenuId === 're' ? null : 're'); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-content-primary hover:bg-surface-elev flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500 dark:text-blue-400" />Reassign to...</div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                            </button>
                            {activeSubmenuId === 're' && (
                              <div className="absolute left-full top-0 w-44 glass-card border border-border-base rounded-xl shadow-2xl ml-1 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onReassignTask(task, 'OPEN'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-content-muted hover:bg-surface-elev hover:text-content-primary flex items-center gap-2 cursor-pointer"><Briefcase className="w-3 h-3" /> Open Pool</button>
                                {siblings.map(s => (
                                  <button key={s.id} onClick={(e) => { e.stopPropagation(); onReassignTask(task, s.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-content-muted hover:bg-surface-elev hover:text-content-primary truncate cursor-pointer">{s.name}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onEditTask(task); setActiveMenuId(null); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-content-primary hover:bg-surface-elev flex items-center gap-2 cursor-pointer"><Edit2 className="w-4 h-4 text-orange-500 dark:text-orange-400" />Edit Baseline</button>
                          <div className="h-px bg-stroke-base my-1" />
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); setActiveMenuId(null); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#ff4444] hover:bg-red-50 dark:hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-[2.75rem]">
                    <div className="flex items-center gap-1.5 text-content-muted text-xs font-medium"><Clock className="w-3.5 h-3.5" /> {task.baselineMinutes} min baseline</div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 text-[0.625rem] font-black uppercase tracking-widest">Pending</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {!child.customTasks?.length && (
            <div className="py-8 text-center text-content-muted text-sm bg-surface-2 rounded-2xl border border-stroke-base border-dashed">No tasks assigned</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChildCard;
