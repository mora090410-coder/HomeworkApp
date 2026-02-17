
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
  <div className={`flex items-center justify-between px-3 py-2 mt-4 mb-2 rounded-lg bg-white/[0.02] border border-white/[0.06] ${colorClass}`}>
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

      <div className="group relative glass-dark border border-white/10 rounded-[24px] p-8 transition-colors duration-300 hover:border-primary-500/30 overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-700 to-primary-500 opacity-60" />

        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-[1.75rem] font-[590] text-white tracking-tight mb-1">{child.name}</h2>
            <p className="text-[0.9375rem] text-gray-400 font-medium">{child.gradeLevel}</p>
            <span className={`mt-3 inline-flex items-center rounded-full border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${setupBadgeClass}`}>
              {setupLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 glass-dark border border-white/10 px-3 py-1.5 rounded-full">
              <div className="w-4 h-4 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center text-[10px] font-bold">$</div>
              <span className="text-sm font-semibold text-white">{formatCurrency(hourlyRate)}/hr</span>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onEditSettings(child); }}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-transparent text-gray-400 hover:bg-white/5 hover:text-white transition-all duration-300 hover:rotate-90 cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-wider">Earned</span>
            <span className="text-[1.5rem] font-[590] text-emerald-400 tracking-tight">{formatCurrency(earnedAmount)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-white/[0.06] pl-4">
            <span className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-wider">Pending</span>
            <span className="text-[1.5rem] font-[590] text-primary-400 tracking-tight">{formatCurrency(pendingAmount)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-white/[0.06] pl-4">
            <span className="text-[0.6875rem] font-bold text-gray-400 uppercase tracking-wider">Paid</span>
            <span className="text-[1.5rem] font-[590] text-blue-400 tracking-tight">{formatCurrency(paidAmountDollars)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => onUpdateGrades(child)}
            className="group/btn relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl glass-dark border border-white/[0.08] hover:border-primary-500/40 transition-all active:scale-[0.98] overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
            <Edit2 className="w-4 h-4 text-white group-hover/btn:text-primary-400 transition-colors" />
            <span className="text-sm font-medium text-white group-hover/btn:text-primary-400 transition-colors">Update Grades</span>
          </button>

          <button
            onClick={() => onAssignTask(child)}
            className="group/btn relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl glass-dark border border-white/[0.08] hover:border-primary-500/40 transition-all active:scale-[0.98] overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
            <Plus className="w-4 h-4 text-white group-hover/btn:text-primary-400 transition-colors" />
            <span className="text-sm font-medium text-white group-hover/btn:text-primary-400 transition-colors">Assign Task</span>
          </button>

          <button
            onClick={() => onInviteChild(child)}
            className="group/btn relative flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl glass-dark border border-white/[0.08] hover:border-primary-500/40 transition-all active:scale-[0.98] overflow-hidden cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-primary-700 to-primary-500 opacity-0 group-hover/btn:opacity-10 transition-opacity duration-300" />
            <UserPlus className="w-4 h-4 text-white group-hover/btn:text-primary-400 transition-colors" />
            <span className="text-sm font-medium text-white group-hover/btn:text-primary-400 transition-colors">
              {setupStatus === 'SETUP_COMPLETE' ? 'Reinvite' : 'Invite'}
            </span>
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-white/[0.06] flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 text-[0.8125rem] font-bold transition-colors group/toggle cursor-pointer ${awaitingApproval.length > 0 ? 'text-primary-400 hover:text-primary-300' : 'text-gray-400 hover:text-primary-400'}`}
          >
            <span>{getToggleLabel()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
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
                <div key={task.id} className="bg-primary-500/5 border-2 border-primary-500/50 rounded-2xl p-5 mb-2 relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-bold text-white">{task.name}</span>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 glass-dark border border-white/10 rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#ff4444] hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <div className="flex items-center gap-1 text-[#ccc] text-xs font-medium"><Clock className="w-3 h-3" /> {task.baselineMinutes} min</div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 text-[0.625rem] font-black uppercase tracking-widest animate-pulse-primary">Awaiting Approval</span>
                    <span className="text-xs font-bold text-primary-400">Will earn: {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => onApproveTask(child.id, task)} className="py-2.5 bg-gradient-to-r from-primary-700 to-primary-500 text-white text-[0.875rem] font-bold rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-primary-500/20 cursor-pointer"><Check className="w-4 h-4" /> Approve</button>
                    <button onClick={() => onRejectTask(child.id, task)} className="py-2.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[0.875rem] font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-500/20 transition-all cursor-pointer"><X className="w-4 h-4" /> Reject</button>
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
                <div key={task.id} className="bg-emerald-500/5 border-2 border-emerald-500/50 rounded-2xl p-5 mb-2 relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-bold text-white">{task.name}</span>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 glass-dark border border-white/10 rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={(e) => { e.stopPropagation(); onUndoApproval(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-orange-400 hover:bg-orange-500/10 flex items-center gap-2 cursor-pointer"><RotateCcw className="w-4 h-4" />Undo Approval</button>
                          <div className="h-px bg-white/5 my-1" />
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#ff4444] hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <div className="flex items-center gap-1 text-[#ccc] text-xs font-medium"><Clock className="w-3 h-3" /> {task.baselineMinutes} min</div>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[0.625rem] font-black uppercase tracking-widest">Approved</span>
                    <span className="text-xs font-bold text-emerald-400">Earned: {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}</span>
                  </div>
                  <button onClick={() => onPayTask(child.id, task)} className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-400 text-white text-[0.9375rem] font-bold rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"><DollarSign className="w-4 h-4" /> Mark as Paid</button>
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
                colorClass="text-gray-400"
              />
              {inProgress.map(task => (
                <div key={task.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 mb-2 hover:bg-white/[0.04] transition-colors group/task relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-medium text-white">{task.name}</span>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"><MoreHorizontal className="w-4 h-4" /></button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 glass-dark border border-white/10 rounded-xl shadow-2xl z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <div className="relative group/reassign">
                            <button onClick={(e) => { e.stopPropagation(); setActiveSubmenuId(activeSubmenuId === 're' ? null : 're'); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/5 flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-400" />Reassign to...</div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                            </button>
                            {activeSubmenuId === 're' && (
                              <div className="absolute left-full top-0 w-44 glass-dark border border-white/10 rounded-xl shadow-2xl ml-1 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onReassignTask(task, 'OPEN'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"><Briefcase className="w-3 h-3" /> Open Pool</button>
                                {siblings.map(s => (
                                  <button key={s.id} onClick={(e) => { e.stopPropagation(); onReassignTask(task, s.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-gray-400 hover:bg-white/5 hover:text-white truncate cursor-pointer">{s.name}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onEditTask(task); setActiveMenuId(null); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-white hover:bg-white/5 flex items-center gap-2 cursor-pointer"><Edit2 className="w-4 h-4 text-orange-400" />Edit Baseline</button>
                          <div className="h-px bg-white/5 my-1" />
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); setActiveMenuId(null); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[#ff4444] hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-[2.75rem]">
                    <div className="flex items-center gap-1.5 text-gray-400 text-xs font-medium"><Clock className="w-3.5 h-3.5" /> {task.baselineMinutes} min baseline</div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-400 text-[0.625rem] font-black uppercase tracking-widest">Pending</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {!child.customTasks?.length && (
            <div className="py-8 text-center text-[#666] text-sm bg-white/[0.02] rounded-2xl border border-white/[0.06] border-dashed">No tasks assigned</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChildCard;
