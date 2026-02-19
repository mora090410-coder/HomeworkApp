import React, { useState, useEffect } from 'react';
import { Child, Task } from '@/types';
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
import { Card } from '@/src/components/ui/Card';

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
  <div className={`flex items-center justify-between px-3 py-2 mt-4 mb-2 rounded-none bg-neutral-50 border border-neutral-lightGray ${colorClass}`}>
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 flex items-center justify-center">{icon}</span>
      <span className="text-[0.75rem] font-bold uppercase tracking-[0.06em] font-sans">{title}</span>
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
  const [subCollectionTasks, setSubCollectionTasks] = useState<Task[]>([]);

  // 1. Robust Task Listener
  useEffect(() => {
    if (!child.householdId || !child.id) {
      console.warn('ChildCard: Missing householdId or childId', { householdId: child.householdId, childId: child.id });
      return;
    }

    // Explicitly construct the path for clarity and safety
    const tasksPath = `households/${child.householdId}/profiles/${child.id}/tasks`;
    const q = query(collection(db, tasksPath));

    console.log(`ChildCard: Subscribing to tasks at ${tasksPath}`);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log(`ChildCard: Snapshot received for ${child.name} (${child.id}). Docs: ${snapshot.docs.length}`);
      const mapped = snapshot.docs.map(doc => mapTask(doc.id, child.householdId!, doc.data()));
      setSubCollectionTasks(mapped);
    }, (error) => {
      console.error("ChildCard: Task subscription error:", error);
    });

    return () => unsubscribe();
  }, [child.householdId, child.id, child.name]);

  // CRITICAL: Render visible error if configuration is invalid
  if (!child.householdId) {
    return (
      <Card className="p-8 border-semantic-destructive/50 bg-semantic-destructive/5">
        <div className="flex items-center gap-3 text-semantic-destructive">
          <AlertTriangle className="w-6 h-6" />
          <div>
            <h3 className="font-bold">Profile Configuration Error</h3>
            <p className="text-sm">Missing Household ID for {child.name}. Please check database.</p>
          </div>
        </div>
      </Card>
    );
  }

  // 2. Fix 'Zero Rate' Fallback Logic
  // Use currentHourlyRate if it exists AND is greater than 0. Otherwise recalculate.
  const hourlyRate = (child.currentHourlyRate && child.currentHourlyRate > 0)
    ? child.currentHourlyRate
    : calculateHourlyRate(child.subjects, child.rates);

  const hourlyRateCents = dollarsToCents(hourlyRate);
  const setupStatus = child.setupStatus ?? 'PROFILE_CREATED';
  const setupLabel =
    setupStatus === 'INVITE_SENT'
      ? 'Invite Sent'
      : setupStatus === 'SETUP_COMPLETE'
        ? 'Ready'
        : 'Setup Pending';

  // Updated badge classes to use brand colors
  const setupBadgeClass =
    setupStatus === 'INVITE_SENT'
      ? 'bg-neutral-lightGray/20 text-neutral-darkGray border-neutral-lightGray'
      : setupStatus === 'SETUP_COMPLETE'
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : 'bg-blue-50 text-blue-700 border-blue-200';

  // Helper to determine task value (flat rate vs hourly)
  const getTaskValueCents = (task: Task) => {
    if (task.valueCents !== undefined) return task.valueCents;
    return calculateTaskValueCents(task.baselineMinutes, hourlyRateCents);
  };

  const getTaskDisplayValue = (task: Task) => {
    if (task.valueCents !== undefined) return formatCurrency(centsToDollars(task.valueCents));
    return formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate));
  };

  // 3. Task Merging Safety
  // Use a Map to deduplicate by ID. Sub-collection (live) tasks take precedence over customTasks props.
  const taskMap = new Map<string, Task>();

  // First add potential static/prop tasks
  (child.customTasks || []).forEach(t => taskMap.set(t.id, t));

  // Then overwrite with live sub-collection tasks (the source of truth)
  subCollectionTasks.forEach(t => taskMap.set(t.id, t));

  // Exclude logically-deleted tasks — live snapshot updates count immediately on delete
  const allTasks = Array.from(taskMap.values()).filter(t => t.status !== 'DELETED');

  const awaitingApproval = allTasks.filter(t => t.status === 'PENDING_APPROVAL');
  const readyToPay = allTasks.filter(t => t.status === 'PENDING_PAYMENT');
  const inProgress = allTasks.filter(t => t.status === 'ASSIGNED' || !t.status);

  // STATS CALCULATIONS
  const earnedAmountCents = readyToPay.reduce(
    (sum, task) => sum + getTaskValueCents(task),
    0,
  );
  const pendingAmountCents = [...inProgress, ...awaitingApproval].reduce(
    (sum, task) => sum + getTaskValueCents(task),
    0,
  );
  const paidAmount = (child.history || [])
    .filter(tx => tx.type === 'EARNING')
    .reduce((sum, tx) => sum + getTransactionAmountCents(tx), 0);
  const earnedAmount = centsToDollars(earnedAmountCents);
  const pendingAmount = centsToDollars(pendingAmountCents);
  const paidAmountDollars = centsToDollars(paidAmount);

  // Close menus on outside click
  // eslint-disable-next-line react-hooks/rules-of-hooks
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
      return `Show Tasks (${allTasks.length})`;
    }
    if (awaitingApproval.length > 0 || readyToPay.length > 0) {
      const urgentCount = awaitingApproval.length + readyToPay.length;
      return `Hide Tasks (${urgentCount} need attention)`;
    }
    return `Hide Tasks (${allTasks.length})`;
  };

  return (
    <div className="flex flex-col gap-3 font-sans w-full">
      <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-md p-8" noPadding>

        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-2xl font-heading font-bold text-neutral-black tracking-tight mb-1">{child.name}</h2>
            <p className="text-sm text-neutral-darkGray font-medium">{child.gradeLevel}</p>
            <span className={`mt-3 inline-flex items-center rounded-none border px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-wide ${setupBadgeClass}`}>
              {setupLabel}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-lightGray px-3 py-1.5 rounded-none">
              <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">$</div>
              <span className="text-sm font-semibold text-neutral-black">{formatCurrency(hourlyRate)}/hr</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); onEditSettings(child); }}
              className="rounded-full text-neutral-darkGray hover:text-primary-cardinal"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="flex flex-col gap-1">
            <span className="text-[0.6875rem] font-bold text-neutral-darkGray uppercase tracking-wider">Earned</span>
            <span className="text-[1.5rem] font-bold font-heading text-emerald-700 tracking-tight">{formatCurrency(earnedAmount)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-neutral-lightGray pl-4">
            <span className="text-[0.6875rem] font-bold text-neutral-darkGray uppercase tracking-wider">Pending</span>
            <span className="text-[1.5rem] font-bold font-heading text-primary-cardinal tracking-tight">{formatCurrency(pendingAmount)}</span>
          </div>
          <div className="flex flex-col gap-1 border-l border-neutral-lightGray pl-4">
            <span className="text-[0.6875rem] font-bold text-neutral-darkGray uppercase tracking-wider">Paid</span>
            <span className="text-[1.5rem] font-bold font-heading text-blue-700 tracking-tight">{formatCurrency(paidAmountDollars)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Button
            variant="secondary"
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
            variant="secondary"
            onClick={() => onInviteChild(child)}
            className="w-full justify-center group/btn"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {setupStatus === 'SETUP_COMPLETE' ? 'Reinvite' : 'Invite'}
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-neutral-lightGray flex justify-center items-center">
          <Button
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 text-[0.8125rem] font-bold transition-colors group/toggle ${awaitingApproval.length > 0 ? 'text-primary-cardinal hover:text-primary-cardinalHover' : 'text-neutral-darkGray hover:text-primary-cardinal'}`}
          >
            <span>{getToggleLabel()}</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </Card>

      {isExpanded && (
        <div className="flex flex-col gap-1 animate-in slide-in-from-top-2 fade-in duration-300 origin-top pb-4">

          {/* AWAITING APPROVAL SECTION */}
          {awaitingApproval.length > 0 && (
            <>
              <SectionHeader
                icon={<AlertTriangle className="w-3.5 h-3.5" />}
                title="Awaiting Your Approval"
                count={awaitingApproval.length}
                colorClass="text-primary-cardinal"
              />
              {awaitingApproval.map(task => (
                <div key={task.id} className="bg-white border border-neutral-lightGray rounded-none p-5 mb-2 relative overflow-visible shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl text-neutral-darkGray">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-bold text-neutral-black">{task.name}</span>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="sm" onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 text-neutral-darkGray hover:text-neutral-black"><MoreHorizontal className="w-4 h-4" /></Button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-lightGray rounded-none shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-semantic-destructive hover:bg-neutral-lightGray/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <div className="flex items-center gap-1 text-neutral-darkGray text-xs font-medium"><Clock className="w-3 h-3" /> {task.baselineMinutes} min</div>
                    <span className="px-2 py-0.5 rounded-none bg-primary-cardinal/10 text-primary-cardinal text-[0.625rem] font-black uppercase tracking-widest animate-pulse">Awaiting Approval</span>
                    <span className="text-xs font-bold text-primary-cardinal">Will earn: {getTaskDisplayValue(task)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Button onClick={() => onApproveTask(child.id, task)} variant="primary" className="w-full"><Check className="w-4 h-4 mr-2" /> Approve</Button>
                    <Button onClick={() => onRejectTask(child.id, task)} variant="destructive" className="w-full"><X className="w-4 h-4 mr-2" /> Reject</Button>
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
                colorClass="text-emerald-600"
              />
              {readyToPay.map(task => (
                <div key={task.id} className="bg-white border border-neutral-lightGray rounded-none p-5 mb-2 relative overflow-visible shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl text-neutral-darkGray">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-bold text-neutral-black">{task.name}</span>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="sm" onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 text-neutral-darkGray hover:text-neutral-black"><MoreHorizontal className="w-4 h-4" /></Button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-lightGray rounded-none shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <button onClick={(e) => { e.stopPropagation(); onUndoApproval(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-blue-600 hover:bg-neutral-lightGray/10 flex items-center gap-2 cursor-pointer"><RotateCcw className="w-4 h-4" />Undo Approval</button>
                          <div className="h-px bg-neutral-lightGray my-1" />
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); }} className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-semantic-destructive hover:bg-neutral-lightGray/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-4">
                    <div className="flex items-center gap-1 text-neutral-darkGray text-xs font-medium"><Clock className="w-3 h-3" /> {task.baselineMinutes} min</div>
                    <span className="px-2 py-0.5 rounded-none bg-emerald-50 text-emerald-700 text-[0.625rem] font-black uppercase tracking-widest">Approved</span>
                    <span className="text-xs font-bold text-emerald-600">Earned: {getTaskDisplayValue(task)}</span>
                  </div>
                  <Button onClick={() => onPayTask(child.id, task)} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm border border-transparent"><DollarSign className="w-4 h-4 mr-2" /> Mark as Paid</Button>
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
                colorClass="text-neutral-darkGray"
              />
              {inProgress.map(task => (
                <div key={task.id} className="bg-neutral-50 border border-neutral-lightGray rounded-none p-5 mb-2 hover:bg-neutral-lightGray/10 transition-colors group/task relative overflow-visible">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xl text-neutral-darkGray">{getTaskIcon(task.name)}</span>
                      <span className="text-[1.0625rem] font-medium text-neutral-black">{task.name}</span>
                    </div>
                    <div className="relative">
                      <Button variant="ghost" size="sm" onClick={(e) => toggleMenu(e, task.id)} className="w-7 h-7 text-neutral-darkGray hover:text-neutral-black"><MoreHorizontal className="w-4 h-4" /></Button>
                      {activeMenuId === task.id && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-lightGray rounded-none shadow-lg z-50 p-1 animate-in fade-in zoom-in-95 duration-200">
                          <div className="relative group/reassign">
                            <button onClick={(e) => { e.stopPropagation(); setActiveSubmenuId(activeSubmenuId === 're' ? null : 're'); }} className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-neutral-black hover:bg-neutral-lightGray/10 flex items-center justify-between cursor-pointer">
                              <div className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-blue-500" />Reassign to...</div>
                              <ChevronRight className="w-3.5 h-3.5 opacity-40" />
                            </button>
                            {activeSubmenuId === 're' && (
                              <div className="absolute left-full top-0 w-44 bg-white border border-neutral-lightGray rounded-none shadow-lg ml-1 overflow-hidden">
                                <button onClick={(e) => { e.stopPropagation(); onReassignTask(task, 'OPEN'); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-darkGray hover:bg-neutral-lightGray/10 hover:text-neutral-black flex items-center gap-2 cursor-pointer"><Briefcase className="w-3 h-3" /> Open Pool</button>
                                {siblings.map(s => (
                                  <button key={s.id} onClick={(e) => { e.stopPropagation(); onReassignTask(task, s.id); setActiveMenuId(null); }} className="w-full text-left px-4 py-2.5 text-xs font-bold text-neutral-darkGray hover:bg-neutral-lightGray/10 hover:text-neutral-black truncate cursor-pointer">{s.name}</button>
                                ))}
                              </div>
                            )}
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); onEditTask(task); setActiveMenuId(null); }} className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-neutral-black hover:bg-neutral-lightGray/10 flex items-center gap-2 cursor-pointer"><Edit2 className="w-4 h-4 text-blue-500" />Edit Baseline</button>
                          <div className="h-px bg-neutral-lightGray my-1" />
                          <button onClick={(e) => { e.stopPropagation(); onDeleteTask(child.id, task.id); setActiveMenuId(null); }} className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-semantic-destructive hover:bg-neutral-lightGray/10 flex items-center gap-2 cursor-pointer"><Trash2 className="w-4 h-4" />Delete Task</button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-[2.75rem]">
                    <div className="flex items-center gap-1.5 text-neutral-darkGray text-xs font-medium"><Clock className="w-3.5 h-3.5" /> {task.baselineMinutes} min baseline</div>
                    <span className="px-2 py-0.5 rounded-none bg-neutral-lightGray/20 text-neutral-darkGray text-[0.625rem] font-black uppercase tracking-widest">Pending</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {allTasks.length === 0 && (
            <div className="py-8 text-center text-neutral-darkGray text-sm bg-neutral-50 rounded-none border border-neutral-lightGray border-dashed">No tasks assigned</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChildCard;
