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
        ? 'Active'
        : 'Setup Pending';

  // 3. Task Merging for Stats
  const taskMap = new Map<string, Task>();
  (child.customTasks || []).forEach(t => taskMap.set(t.id, t));
  subCollectionTasks.forEach(t => taskMap.set(t.id, t));
  const allTasks = Array.from(taskMap.values()).filter(t => t.status !== 'DELETED');
  const awaitingApproval = allTasks.filter(t => t.status === 'PENDING_APPROVAL');

  // Bank Balance Logic (Green if positive, Red if negative)
  // Use balanceCents if reliable, or derived balance
  const currentBalance = child.balance;
  const isNegativeBalance = currentBalance < 0;
  const balanceColorClass = isNegativeBalance ? 'text-primary-cardinal' : 'text-emerald-700';

  return (
    <div className="flex flex-col gap-3 font-sans w-full">
      <Card
        className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:bg-neutral-50 cursor-pointer bg-white border-neutral-200"
        noPadding
        style={{
          borderTop: `6px solid ${child.avatarColor || '#E2E8F0'}`,
        }}
        onClick={() => onClick?.(child)}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              {/* AVATAR */}
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-inner"
                style={{ backgroundColor: child.avatarColor || '#94A3B8' }}
              >
                {child.name.charAt(0)}
              </div>

              {/* NAME & META */}
              <div>
                <h2 className="text-xl font-heading font-black text-neutral-900 tracking-tight leading-none mb-1.5">{child.name}</h2>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
                    <span>{child.gradeLevel}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-neutral-300" />
                    <span className={setupStatus === 'SETUP_COMPLETE' ? 'text-emerald-600' : 'text-primary-cardinal'}>
                      {setupLabel}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-neutral-500">
                    Rate: {formatCurrency(hourlyRate)}/hr
                  </div>
                </div>
              </div>
            </div>

            {/* BANK BALANCE */}
            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-0.5">Bank Balance</span>
              <span className={`text-2xl font-heading font-black tracking-tight ${balanceColorClass}`}>
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* REVIEW BADGE (Conditional) */}
          {awaitingApproval.length > 0 && (
            <div className="mb-6 flex items-center gap-3 px-4 py-3 bg-primary-cardinal/5 border border-primary-cardinal/10 rounded-sm animate-in fade-in slide-in-from-top-1">
              <div className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-cardinal opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary-cardinal"></span>
              </div>
              <span className="text-sm font-bold text-primary-cardinal">
                {awaitingApproval.length} {awaitingApproval.length === 1 ? 'Task' : 'Tasks'} to Review
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
              className="h-10 w-10 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-50 border-neutral-200 rounded-sm p-0 flex items-center justify-center"
              title="Profile Settings"
            >
              <Settings className="w-5 h-5" />
            </Button>

            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                onAssignTask(child);
              }}
              className="flex-1 h-10 shadow-sm text-xs uppercase tracking-wider font-bold rounded-sm bg-neutral-900 text-white hover:bg-neutral-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Assign Task
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ChildCard;
