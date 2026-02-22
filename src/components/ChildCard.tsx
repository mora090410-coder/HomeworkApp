import React, { useState, useEffect } from 'react';
import { Child, Task } from '@/types';
import { db } from '@/services/firebase';
import { collection, onSnapshot, query } from 'firebase/firestore';
import {
  calculateHourlyRate,
  formatCurrency,
  mapTask,
} from '@/utils';
import {
  Settings,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ChildCardProps {
  child: Child;
  siblings?: Child[];
  onEditSettings: (child: Child) => void;
  onUpdateGrades: (child: Child) => void; // Legacy prop kept for interface compatibility
  onInviteChild: (child: Child) => void; // Legacy prop kept for interface compatibility
  onAssignTask: (child: Child) => void;
  onDeleteTask: (childId: string, taskId: string) => void;
  onEditTask: (task: Task) => void;
  onReassignTask: (task: Task, toChildId: string) => void;
  onApproveTask: (childId: string, task: Task) => void;
  onRejectTask: (childId: string, task: Task) => void;
  onPayTask: (childId: string, task: Task) => void;
  onUndoApproval: (childId: string, taskId: string) => void;
  onClick?: (child: Child) => void; // Added onClick prop
}

const ChildCard: React.FC<ChildCardProps> = ({
  child,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  siblings = [],
  onEditSettings,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUpdateGrades,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onInviteChild,
  onAssignTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onDeleteTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onEditTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onReassignTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onApproveTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onRejectTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onPayTask,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onUndoApproval,
  onClick,
}) => {
  const [subCollectionTasks, setSubCollectionTasks] = useState<Task[]>([]);

  // 1. Robust Task Listener to calculate stats (Review Badge)
  useEffect(() => {
    if (!child.householdId || !child.id) {
      console.warn('ChildCard: Missing householdId or childId', { householdId: child.householdId, childId: child.id });
      return;
    }

    const tasksPath = `households/${child.householdId}/profiles/${child.id}/tasks`;
    const q = query(collection(db, tasksPath));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const mapped = snapshot.docs.map(doc => mapTask(doc.id, child.householdId!, doc.data()));
      setSubCollectionTasks(mapped);
    }, (error) => {
      console.error("ChildCard: Task subscription error:", error);
    });

    return () => unsubscribe();
  }, [child.householdId, child.id]);

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
  const hourlyRate = (child.currentHourlyRate && child.currentHourlyRate > 0)
    ? child.currentHourlyRate
    : calculateHourlyRate(child.subjects, child.rates);

  const setupStatus = child.setupStatus ?? 'PROFILE_CREATED';
  const setupLabel =
    setupStatus === 'INVITE_SENT'
      ? 'Invite Sent'
      : setupStatus === 'SETUP_COMPLETE'
        ? 'ACTIVE'
        : 'Setup Pending';

  // 3. Task Merging for Stats
  const taskMap = new Map<string, Task>();
  (child.customTasks || []).forEach(t => taskMap.set(t.id, t));
  subCollectionTasks.forEach(t => taskMap.set(t.id, t));
  const allTasks = Array.from(taskMap.values()).filter(t => t.status !== 'DELETED');
  const awaitingApproval = allTasks.filter(t => t.status === 'PENDING_APPROVAL');

  // Bank Balance Logic (Crimson if negative, following brand)
  // Use balanceCents if reliable, or derived balance
  const currentBalance = child.balance;
  const isNegativeBalance = currentBalance < 0;
  const balanceColorClass = isNegativeBalance ? 'text-crimson font-serif' : 'text-gold font-serif';

  return (
    <div className="flex flex-col gap-3 font-sans w-full">
      <Card
        className={`group relative overflow-hidden transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 glass-card border border-glass-border ${awaitingApproval.length > 0
          ? 'border-t-4 border-t-crimson'
          : 'hover:border-t-4 hover:border-t-crimson'
          }`}
        noPadding
        onClick={() => onClick?.(child)}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {/* AVATAR */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold bg-ascendant-gradient text-cream shadow-xl ring-4 ring-white/10 dark:ring-white/5 font-serif"
              >
                {child.name.charAt(0)}
              </div>

              {/* NAME & META */}
              <div>
                <h2 className="text-xl font-sans font-extrabold text-content-primary tracking-tight leading-none mb-2 capitalize">{child.name}</h2>
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-content-subtle">
                    <span>{child.gradeLevel}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-neutral-300" />
                    <span className={setupStatus === 'SETUP_COMPLETE' ? 'bg-gold/10 text-gold text-xs px-2 py-0.5 rounded-full font-sans tracking-wide' : 'text-crimson'}>
                      {setupLabel}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono font-bold text-content-subtle flex items-center gap-1">
                    <span className="opacity-40 whitespace-nowrap">RATE:</span>
                    <span>{formatCurrency(hourlyRate)}/hr</span>
                  </div>
                </div>
              </div>
            </div>

            {/* BANK BALANCE */}
            <div className="text-right">
              <span className="text-xs tracking-widest text-charcoal/40 uppercase font-sans block mb-1">Bank Balance</span>
              <span className={`text-2xl font-extrabold tracking-tighter ${balanceColorClass}`}>
                <span className="text-sm opacity-30 mr-0.5">$</span>
                {Math.abs(currentBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                {isNegativeBalance && <span className="ml-1 opacity-50">-</span>}
              </span>
            </div>
          </div>

          {/* REVIEW BADGE (Conditional) */}
          {awaitingApproval.length > 0 && (
            <div className="mb-6 flex items-center bg-crimson/5 border border-crimson/20 text-crimson text-xs font-semibold px-4 py-2 rounded-full animate-in fade-in slide-in-from-top-1 transition-colors">
              <span className="w-2 h-2 rounded-full bg-crimson animate-pulse inline-block mr-2" />
              <span className="tracking-wide">
                {awaitingApproval.length} {awaitingApproval.length === 1 ? 'TASK' : 'TASKS'} TO REVIEW
              </span>
            </div>
          )}

          {/* ACTIONS ROW */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEditSettings(child);
              }}
              className="h-10 w-10 text-content-subtle hover:text-neutral-600 hover:bg-surface-app border-stroke-base rounded-sm p-0 flex items-center justify-center"
              title="Profile Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onAssignTask(child);
              }}
              className="flex-1 w-full bg-ascendant-gradient text-white font-semibold rounded-full px-6 py-3 text-sm hover:opacity-90 transition-opacity flex items-center justify-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign Task
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChildCard;
