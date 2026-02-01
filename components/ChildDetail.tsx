
import React, { useState, useEffect, useRef } from 'react';
import { Child, Grade, Task, StandardTask } from '../types';
import { calculateHourlyRate, formatCurrency, calculateTaskValue, getTaskIcon } from '../utils';
import { DEFAULT_RATES } from '../constants';
import { 
  Clock, 
  Check, 
  DollarSign, 
  Plus, 
  Coins, 
  RotateCcw, 
  ArrowRight, 
  Target, 
  Hourglass, 
  AlertCircle,
  TrendingUp,
  Lightbulb
} from 'lucide-react';

interface ChildDetailProps {
  child: Child;
  isParent: boolean;
  standardTasks?: StandardTask[];
  availableTasks?: Task[]; 
  onUpdateGrade: (childId: string, subjectId: string, newGrade: Grade) => void;
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
  availableTasks = [],
  onSubmitTask, 
  onClaimTask,
}) => {
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [isAnimatingBalance, setIsAnimatingBalance] = useState(false);
  const prevBalance = useRef(child.balance);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (child.balance > prevBalance.current) {
      setIsAnimatingBalance(true);
      timer = setTimeout(() => setIsAnimatingBalance(false), 600);
    }
    prevBalance.current = child.balance;
    return () => clearTimeout(timer);
  }, [child.balance]);

  const hourlyRate = calculateHourlyRate(child.subjects, child.rates || DEFAULT_RATES);
  
  // Earnings Calculations
  const readyToCollect = child.customTasks
    .filter(t => t.status === 'PENDING_PAYMENT')
    .reduce((sum, t) => sum + calculateTaskValue(t.baselineMinutes, hourlyRate), 0);
  
  const inReview = child.customTasks
    .filter(t => t.status === 'PENDING_APPROVAL')
    .reduce((sum, t) => sum + calculateTaskValue(t.baselineMinutes, hourlyRate), 0);
  
  const canEarnToday = availableTasks
    .reduce((sum, t) => sum + calculateTaskValue(t.baselineMinutes, hourlyRate), 0);

  // Weekly total calculation
  const startOfWeek = new Date();
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Sunday start

  const paidThisWeek = child.history
    .filter(tx => tx.type === 'EARNING' && new Date(tx.date) >= startOfWeek)
    .reduce((sum, tx) => sum + tx.amount, 0);
  
  const totalEarnedThisWeek = paidThisWeek + readyToCollect;

  // Task Grouping
  const grabTasks = availableTasks;
  const inProgress = child.customTasks.filter(t => t.status === 'ASSIGNED' && !t.rejectionComment);
  const waitingApproval = child.customTasks.filter(t => t.status === 'PENDING_APPROVAL');
  const rejectedTasks = child.customTasks.filter(t => t.status === 'ASSIGNED' && t.rejectionComment);
  const readyCollectTasks = child.customTasks.filter(t => t.status === 'PENDING_PAYMENT');

  const handleConfirmCompletion = () => {
    if (taskToComplete) {
      onSubmitTask(child.id, taskToComplete);
      setTaskToComplete(null);
    }
  };

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'text-emerald-400';
    if (grade.startsWith('B')) return 'text-blue-400';
    return 'text-gray-500';
  };

  const EmptyState = () => (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-12 text-center flex flex-col items-center">
      <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
        <Target className="w-10 h-10 text-blue-400" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">Ready to Earn?</h3>
      <p className="text-gray-500 mb-8 max-w-sm">No tasks available right now. Ask your parents if there's anything you can help with!</p>
      <div className="bg-[#FFCC00]/10 border border-[#FFCC00]/20 rounded-xl p-4 flex items-center gap-3">
        <Lightbulb className="w-5 h-5 text-[#FFCC00]" />
        <p className="text-sm text-[#FFCC00] font-medium text-left">
          TIP: Keeping your grades up means earning more per hour. <br/>
          <span className="text-white/60">Your current rate: {formatCurrency(hourlyRate)}/hr</span>
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700">
      <style>{`
        @keyframes pulse-orange {
          0% { opacity: 1; }
          50% { opacity: 0.7; }
          100% { opacity: 1; }
        }
        .animate-pulse-orange {
          animation: pulse-orange 2s ease-in-out infinite;
        }
      `}</style>

      {/* Top Cards Row */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Your Earnings Card */}
        <div className="relative bg-gradient-to-br from-[#990000]/10 to-[#FFCC00]/10 border border-[#FFCC00]/30 rounded-[32px] p-8 overflow-hidden group">
          <p className="text-[0.875rem] font-bold text-gray-500 uppercase tracking-widest mb-6">Your Earnings</p>
          
          <div className="space-y-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-xl">💰</div>
                <span className="text-gray-300 font-medium">Ready to Collect</span>
              </div>
              <span className="text-xl font-bold text-emerald-400">{formatCurrency(readyToCollect)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#FFCC00]/10 flex items-center justify-center text-xl">⏳</div>
                <span className="text-gray-300 font-medium">In Review</span>
              </div>
              <span className="text-xl font-bold text-[#FFCC00]">{formatCurrency(inReview)}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-xl">🎯</div>
                <span className="text-gray-300 font-medium">Can Earn Today</span>
              </div>
              <span className="text-xl font-bold text-blue-400">{formatCurrency(canEarnToday)}</span>
            </div>
          </div>

          <div className="pt-6 border-t border-white/10 flex items-end justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Total Earned This Week</p>
              <div className="text-4xl font-bold bg-gradient-to-r from-[#990000] to-[#FFCC00] text-transparent bg-clip-text">
                {formatCurrency(totalEarnedThisWeek)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[0.625rem] font-bold text-gray-600 uppercase tracking-widest">Resets Sunday</p>
            </div>
          </div>

          {/* Background Glows */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[#FFCC00]/10 blur-[80px] rounded-full group-hover:bg-[#FFCC00]/15 transition-all duration-1000"></div>
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-[#990000]/10 blur-[80px] rounded-full"></div>
        </div>

        {/* Your Rate Card */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-[32px] p-8 flex flex-col justify-between group">
          <div>
            <p className="text-[0.875rem] font-bold text-gray-500 uppercase tracking-widest mb-4">Your Rate</p>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-5xl font-bold text-white">{formatCurrency(hourlyRate)}</span>
              <span className="text-xl text-gray-600 font-medium">/hr</span>
            </div>
            {/* Mocking a rate change for visualization if needed, but per data for now just rate */}
          </div>

          <div className="mt-8 bg-[#FFCC00]/5 border border-[#FFCC00]/10 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex items-start gap-3 relative z-10">
              <Lightbulb className="w-5 h-5 text-[#FFCC00] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[#FFCC00] mb-1">Earn more per hour!</p>
                <p className="text-xs text-white/60 leading-relaxed">Improve your grades in subjects with B's or lower to increase your base earning power.</p>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#FFCC00]/5 blur-2xl rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Academics Section */}
      <section>
        <div className="mb-6">
          <h3 className="text-xl font-bold text-white mb-1">Academics</h3>
          <p className="text-sm text-gray-500">Your grades determine your hourly rate</p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {child.subjects.map(subject => (
            <div key={subject.id} className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-6 text-center hover:border-white/20 transition-all group">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 truncate">{subject.name}</p>
              <div className={`text-4xl font-bold ${getGradeColor(subject.grade)} group-hover:scale-110 transition-transform`}>
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
              <h4 className="text-[1.125rem] font-bold text-blue-400 tracking-tight uppercase">🎯 Grab a Task</h4>
              <span className="text-sm text-gray-600 font-bold">({grabTasks.length} available)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grabTasks.map(task => (
                <div key={task.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 hover:bg-white/[0.04] hover:border-blue-400/30 transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold text-white">{task.name}</h5>
                    </div>
                    <span className="text-2xl font-bold text-[#FFCC00]">
                      {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6 font-medium">
                    {task.baselineMinutes} min × {formatCurrency(hourlyRate)}/hr
                  </p>
                  <button 
                    onClick={() => onClaimTask(child.id, task.id)}
                    className="w-full py-3.5 bg-gradient-to-r from-[#990000] to-[#FFCC00] text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-cardinal/20 active:scale-95 transition-all"
                  >
                    Claim Task <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* IN PROGRESS */}
        {inProgress.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold text-blue-300 tracking-tight uppercase">⚡ Working On</h4>
              <span className="text-sm text-gray-600 font-bold">({inProgress.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {inProgress.map(task => (
                <div key={task.id} className="bg-white/[0.02] border border-white/[0.08] rounded-2xl p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold text-white">{task.name}</h5>
                    </div>
                    <span className="text-2xl font-bold text-[#FFCC00]">
                      {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-6">Baseline: {task.baselineMinutes} mins</p>
                  <button 
                    onClick={() => setTaskToComplete(task)}
                    className="w-full py-3.5 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#FFCC00] active:scale-95 transition-all"
                  >
                    Mark Complete <Check className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* WAITING FOR APPROVAL */}
        {(waitingApproval.length > 0 || rejectedTasks.length > 0) && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold text-orange-400 tracking-tight uppercase">⏳ Waiting for Approval</h4>
              <span className="text-sm text-gray-600 font-bold">({waitingApproval.length + rejectedTasks.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {waitingApproval.map(task => (
                <div key={task.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 opacity-80">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold text-white">{task.name}</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-[#FFCC00] uppercase tracking-wider mb-1">Will earn</p>
                      <span className="text-xl font-bold text-white">
                        {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-orange-400 font-medium animate-pulse-orange">
                    <Hourglass className="w-4 h-4" />
                    Waiting for parent review...
                  </div>
                </div>
              ))}

              {rejectedTasks.map(task => (
                <div key={task.id} className="bg-red-500/5 border border-red-500/40 rounded-2xl p-6 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold text-white">{task.name}</h5>
                    </div>
                    <span className="text-xl font-bold text-red-400">
                      {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}
                    </span>
                  </div>
                  
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                    <p className="text-[0.6875rem] font-bold text-red-400 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> Sent back with feedback:
                    </p>
                    <p className="text-sm text-white/90 leading-relaxed italic">"{task.rejectionComment}"</p>
                  </div>

                  <button 
                    onClick={() => {
                      // Marking "Redo" just clears the comment and keeps it as assigned/in-progress
                      const updatedTask = { ...task, rejectionComment: undefined };
                      onSubmitTask(child.id, updatedTask); // We reuse submit logic to clear and update
                      // Actually we need a clean redo action in App.tsx but for MVP we can simulate
                    }}
                    className="w-full py-3.5 bg-gradient-to-r from-red-600 to-orange-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:-translate-y-0.5 transition-all shadow-lg shadow-red-900/20"
                  >
                    Redo Task <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* READY TO COLLECT */}
        {readyCollectTasks.length > 0 && (
          <section>
            <div className="flex items-center gap-3 mb-6">
              <h4 className="text-[1.125rem] font-bold text-emerald-400 tracking-tight uppercase">✅ Ready to Collect</h4>
              <span className="text-sm text-gray-600 font-bold">({readyCollectTasks.length})</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {readyCollectTasks.map(task => (
                <div key={task.id} className="bg-emerald-500/5 border border-emerald-400/30 rounded-2xl p-6 flex flex-col justify-between">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getTaskIcon(task.name)}</span>
                      <h5 className="text-xl font-bold text-white">{task.name}</h5>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Earned</p>
                      <span className="text-2xl font-bold text-emerald-400">
                        {formatCurrency(calculateTaskValue(task.baselineMinutes, hourlyRate))}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400 font-medium">
                    <Coins className="w-4 h-4 text-emerald-400" />
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
      {taskToComplete && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTaskToComplete(null)} />
          <div className="relative w-full max-w-sm bg-[#1a1a1a] rounded-[28px] border border-white/[0.06] p-8 text-center animate-in zoom-in-95 duration-200 shadow-2xl">
             <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-4">
               <Check className="w-8 h-8" />
             </div>
             <h3 className="text-xl font-bold text-white mb-2">{taskToComplete.name}</h3>
             <p className="text-gray-400 mb-6 text-sm">
               Submit for parent approval to earn <span className="text-emerald-400 font-bold">{formatCurrency(calculateTaskValue(taskToComplete.baselineMinutes, hourlyRate))}</span>.
             </p>
             <div className="flex gap-3">
               <button 
                 onClick={() => setTaskToComplete(null)} 
                 className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-white/5 hover:bg-white/10 transition-all cursor-pointer"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleConfirmCompletion} 
                 className="flex-1 py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
               >
                 Complete
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChildDetail;
