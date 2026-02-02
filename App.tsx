import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, LogOut, Users, Trash2, X, UserPlus, Calendar, ShieldCheck, ChevronRight, Share2
} from 'lucide-react';
import { Child, Task, Subject, Grade, StandardTask } from './types';
import { INITIAL_DATA, DEFAULT_RATES, COMMON_TASKS } from './constants';
import { calculateHourlyRate, calculateTaskValue } from './utils';
import { FamilyService } from './services/family';
import { supabase } from './services/supabase';

import ChildCard from './components/ChildCard';
import ChildDetail from './components/ChildDetail';
import LandingScreen from './components/LandingScreen';
import IntroScreen from './components/IntroScreen';
import PinModal from './components/PinModal';
import AddChildModal, { NewChildData } from './components/AddChildModal';
import SettingsModal from './components/SettingsModal';
import AssignTaskModal from './components/AssignTaskModal';
import AddAdvanceModal from './components/AddAdvanceModal';
import FamilyActivityFeed from './components/FamilyActivityFeed';

type ViewMode = 'INTRO' | 'LANDING' | 'PARENT' | 'CHILD' | 'JOIN';

export default function App() {
  const queryClient = useQueryClient();

  // --- STATE ---
  const [familyId, setFamilyId] = useState<string | null>(null);

  // --- QUERIES ---
  // 1. Fetch Family Context first
  useQuery({
    queryKey: ['currentFamily'],
    queryFn: async () => {
      const family = await FamilyService.getCurrentFamily();
      if (family) setFamilyId(family.id);
      return family;
    },
    // We only run this once or until we have it
    enabled: !familyId
  });

  const { data: children = [], isLoading: loadingChildren } = useQuery({
    queryKey: ['children', familyId],
    queryFn: () => familyId ? FamilyService.getChildren(familyId) : Promise.resolve([]),
    enabled: !!familyId
  });

  const { data: openTasks = [], isLoading: loadingOpenTasks } = useQuery({
    queryKey: ['openTasks', familyId],
    queryFn: () => familyId ? FamilyService.getOpenTasks(familyId) : Promise.resolve([]),
    enabled: !!familyId
  });

  // Also fetch Drafts for Admins
  const { data: draftTasks = [] } = useQuery({
    queryKey: ['draftTasks', familyId],
    queryFn: () => familyId ? FamilyService.getDraftTasks(familyId) : Promise.resolve([]),
    enabled: !!familyId
  });

  // Fetch Admin Profile for Identity Verification
  const { data: adminProfile } = useQuery({
    queryKey: ['adminProfile', familyId],
    queryFn: async () => {
      if (!familyId) return null;
      const { data } = await supabase.from('profiles').select('id, name').eq('family_id', familyId).eq('role', 'ADMIN').limit(1).single();
      return data;
    },
    enabled: !!familyId
  });

  // Real-time Updates
  React.useEffect(() => {
    if (!familyId) return;

    // Subscribe to changes for this family
    const channel = supabase.channel(`db-changes-${familyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles', filter: `family_id=eq.${familyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['children'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `family_id=eq.${familyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['children'] });
        queryClient.invalidateQueries({ queryKey: ['openTasks'] });
        queryClient.invalidateQueries({ queryKey: ['draftTasks'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger', filter: `family_id=eq.${familyId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ['children'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient, familyId]);
  // Check for Invite Token
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('join');
    if (token) {
      setJoiningToken(token);
      setViewMode('JOIN');
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Local UI State
  const [viewMode, setViewMode] = useState<ViewMode>('INTRO');
  const [activeChildId, setActiveChildId] = useState<string | null>(null);

  // Restore session
  React.useEffect(() => {
    const stored = localStorage.getItem('homework-active-profile');
    if (stored) {
      try {
        const { profileId, role } = JSON.parse(stored);
        if (role === 'CHILD' && profileId) {
          setActiveChildId(profileId);
          setViewMode('CHILD');
        } else if (role === 'ADMIN' || (role === undefined && !profileId)) {
          // Parent mode
          setViewMode('PARENT');
        }
      } catch (e) { }
    }
  }, []);
  const [pendingLoginChildId, setPendingLoginChildId] = useState<string | null>(null);

  // Modals
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [isChildPinModalOpen, setIsChildPinModalOpen] = useState(false);
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);

  const [childToEdit, setChildToEdit] = useState<Child | null>(null);
  const [childToUpdateGrades, setChildToUpdateGrades] = useState<Child | null>(null);
  const [taskToReject, setTaskToReject] = useState<{ childId: string, task: Task } | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');

  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [isOpenTaskMode, setIsOpenTaskMode] = useState(false);
  const [editingTask, setEditingTask] = useState<{ childId: string | null, task: Task } | null>(null);

  const activeChild = children.find(c => c.id === activeChildId);
  const pendingLoginChild = children.find(c => c.id === pendingLoginChildId);
  const hasChildren = children.length > 0;

  const [joiningToken, setJoiningToken] = useState<string | null>(null);
  const [joinName, setJoinName] = useState('');
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // --- MUTATIONS ---
  const createChildMutation = useMutation({
    mutationFn: (child: Partial<Child>) => familyId ? FamilyService.createChild(familyId, child) : Promise.reject('No Family ID'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] })
  });

  const updateChildMutation = useMutation({
    mutationFn: (vars: { id: string, updates: Partial<Child> }) => FamilyService.updateChild(vars.id, vars.updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] })
  });

  const assignTaskMutation = useMutation({
    mutationFn: (vars: { childId: string, task: Task }) => familyId ? FamilyService.assignTask(vars.childId, vars.task, familyId) : Promise.reject('No Family ID'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
      queryClient.invalidateQueries({ queryKey: ['draftTasks'] });
    }
  });

  const createOpenTaskMutation = useMutation({
    mutationFn: (task: Task) => familyId ? FamilyService.createOpenTask(familyId, task) : Promise.reject('No Family ID'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['openTasks'] })
  });

  const saveDraftTaskMutation = useMutation({
    mutationFn: (task: Task) => familyId ? FamilyService.saveDraftTask(familyId, task) : Promise.reject('No Family ID'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['draftTasks'] })
  });

  const statusTaskMutation = useMutation({
    mutationFn: (vars: { taskId: string, status: string, comment?: string }) => FamilyService.updateTaskStatus(vars.taskId, vars.status, vars.comment),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] })
  });

  const claimTaskMutation = useMutation({
    mutationFn: (vars: { childId: string, taskId: string }) => FamilyService.claimTask(vars.childId, vars.taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      queryClient.invalidateQueries({ queryKey: ['openTasks'] });
    }
  });

  const payTaskMutation = useMutation({
    mutationFn: (vars: { childId: string, taskId: string, amount: number, memo: string }) => FamilyService.payTask(vars.childId, vars.taskId, vars.amount, vars.memo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] })
  });

  const addAdvanceMutation = useMutation({
    mutationFn: (vars: { childId: string, amount: number, memo: string, category: string }) => FamilyService.addAdvance(vars.childId, vars.amount, vars.memo, vars.category),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['children'] })
  });

  // --- HANDLERS ---
  const handleStartApp = () => setViewMode('LANDING');

  const handleLoginChild = (childId: string) => {
    const child = children.find(c => c.id === childId);
    // In migration: check pin via Edge? Or rely on local "pin present" check?
    // We'll rely on service verification flow if pin exists.
    // For now, retaining simplistic UI flow: prompt for pin if it exists.
    if (child?.pin) {
      setPendingLoginChildId(childId);
      setIsChildPinModalOpen(true);
    } else {
      setActiveChildId(childId);
      localStorage.setItem('homework-active-profile', JSON.stringify({ familyId, profileId: childId, role: child?.role }));
      setViewMode('CHILD');
    }
  };

  const handleChildPinSuccess = async () => {
    // In a real app we'd verify here with the PIN entered in the Modal props (not passed here).
    // The Modal calls this on success. Use FamilyService.verifyPin inside Modal? 
    // Adapting existing: Modal does verify. We just switch view.
    // BUT PinModal logic is currently "matches storedPin".
    // We should update PinModal to use async verification? 
    // For MVP migration, we'll assume PinModal logic works locally if we have the pin, but since we hid the PIN (****) in the service...
    // PinModal needs to change to use FamilyService.verifyPin!
    // We will leave PinModal purely local for now (it compares to storedPin). 
    // If storedPin is "****", it will fail. 
    // CRITICAL: We need PinModal to support async verify. 
    // Ignoring this complexity for the "big refactor" step, focusing on data sync first.
    if (pendingLoginChildId) {
      setActiveChildId(pendingLoginChildId);
      const child = children.find(c => c.id === pendingLoginChildId);
      localStorage.setItem('homework-active-profile', JSON.stringify({ familyId, profileId: pendingLoginChildId, role: child?.role }));
      setViewMode('CHILD');
      setPendingLoginChildId(null);
      setIsChildPinModalOpen(false);
    }
  };

  const handleLoginParent = () => setIsPinModalOpen(true);
  const handlePinSuccess = () => {
    setIsPinModalOpen(false);
    setViewMode('PARENT');
    setActiveChildId(null);
  };
  const handleLogout = () => {
    setActiveChildId(null);
    setPendingLoginChildId(null);
    setIsPinModalOpen(false);
    setIsChildPinModalOpen(false);
    setViewMode('LANDING');
  };

  const handleGenerateInvite = async () => {
    if (!familyId) return;
    try {
      const link = await FamilyService.generateInvite(familyId, 'ADMIN');
      setInviteLink(link);
    } catch (e) {
      alert('Failed to generate invite');
    }
  };

  const handleJoinFamily = async () => {
    if (!joiningToken || !joinName.trim()) return;
    try {
      await FamilyService.acceptInvite(joiningToken, joinName);
      // Refresh context or just reload
      window.location.href = window.location.origin;
    } catch (e) {
      alert('Failed to join family: ' + (e as Error).message);
    }
  };

  // Actions
  const handleCreateChild = (data: NewChildData) => {
    createChildMutation.mutate(
      { ...data, subjects: data.subjects.map(s => ({ ...s, id: crypto.randomUUID() })), rates: DEFAULT_RATES, balance: 0, history: [], customTasks: [] }
    );
    setIsAddChildModalOpen(false);
  };

  const handleUpdateChild = (childId: string, updates: Partial<Child>) => {
    updateChildMutation.mutate({ id: childId, updates });
    setChildToEdit(null);
  };

  const handleUpdateGrade = (childId: string, subjectId: string, newGrade: Grade) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const updatedSubjects = child.subjects.map(s => s.id === subjectId ? { ...s, grade: newGrade } : s);
    updateChildMutation.mutate({ id: childId, updates: { subjects: updatedSubjects } });
  };

  const handleSaveTask = (taskName: string, minutes: number) => {
    if (!familyId) return;
    const task: Task = {
      id: crypto.randomUUID(),
      familyId,
      name: taskName,
      baselineMinutes: minutes,
      status: 'OPEN' // Default, overridden below
    };

    if (isOpenTaskMode) {
      createOpenTaskMutation.mutate(task);
    } else if (selectedChildId) {
      assignTaskMutation.mutate({ childId: selectedChildId, task: { ...task, status: 'ASSIGNED' } });
    } else {
      // Draft Mode
      saveDraftTaskMutation.mutate({ ...task, status: 'DRAFT', assigneeId: null });
    }
    setIsAddTaskModalOpen(false);
  };

  const handleClaimTask = (childId: string, taskId: string) => claimTaskMutation.mutate({ childId, taskId });

  const handleSubmitTask = (childId: string, task: Task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_APPROVAL' });

  const handleApproveTask = (childId: string, task: Task) => statusTaskMutation.mutate({ taskId: task.id, status: 'PENDING_PAYMENT' });

  const handleConfirmReject = () => {
    if (taskToReject && rejectionComment.trim()) {
      statusTaskMutation.mutate({ taskId: taskToReject.task.id, status: 'ASSIGNED', comment: rejectionComment });
      setTaskToReject(null);
      setRejectionComment('');
    }
  };

  const handlePayTask = (childId: string, task: Task) => {
    const child = children.find(c => c.id === childId);
    if (!child) return;
    const rate = calculateHourlyRate(child.subjects, child.rates);
    const earnings = calculateTaskValue(task.baselineMinutes, rate);
    payTaskMutation.mutate({ childId, taskId: task.id, amount: earnings, memo: `Completed: ${task.name}` });
  };

  const handleAddAdvance = (childId: string, amount: number, category: string, memo: string) => {
    addAdvanceMutation.mutate({ childId, amount, memo, category });
    setIsAdvanceModalOpen(false);
  };

  const handleUndoApproval = (childId: string, taskId: string) => statusTaskMutation.mutate({ taskId, status: 'PENDING_APPROVAL' });

  // Render Logic
  if (viewMode === 'INTRO') return <IntroScreen onGetStarted={handleStartApp} onJoinFamily={() => { /* Handled via link usually, but could have manual code entry later */ }} />;

  if (viewMode === 'JOIN') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white p-6">
        <div className="max-w-md w-full bg-[#1a1a1a] p-8 rounded-2xl border border-white/10 text-center">
          <h2 className="text-2xl font-bold mb-4">Join Family</h2>
          <p className="text-gray-400 mb-8">You have been invited to join as an Admin. Please enter your name.</p>
          <input
            type="text"
            value={joinName}
            onChange={(e) => setJoinName(e.target.value)}
            placeholder="Your Name"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white mb-6 outline-none focus:border-cardinal"
          />
          <button onClick={handleJoinFamily} disabled={!joinName.trim()} className="w-full py-3.5 bg-cardinal rounded-xl font-bold disabled:opacity-50 hover:bg-[#b30000]">
            Join Family
          </button>
          <button onClick={() => setViewMode('INTRO')} className="mt-4 text-sm text-gray-500 hover:text-white">Cancel</button>
        </div>
      </div>
    );
  }

  if (loadingChildren || loadingOpenTasks) return <div className="min-h-screen bg-black flex items-center justify-center text-white">Loading Family Data...</div>;

  if (viewMode === 'LANDING') {
    return (
      <>
        <LandingScreen childrenData={children} onSelectChild={handleLoginChild} onSelectParent={handleLoginParent} />
        <PinModal
          isOpen={isPinModalOpen}
          onClose={() => setIsPinModalOpen(false)}
          onSuccess={handlePinSuccess}
          storedPin={null} // No local storage
          onVerify={async (pin) => {
            if (!adminProfile) return false;
            return FamilyService.verifyPin(adminProfile.id, pin);
          }}
          title="Admin Access"
          subtitle="Enter your secure PIN"
        />
        <PinModal
          isOpen={isChildPinModalOpen}
          onClose={() => setIsChildPinModalOpen(false)}
          onSuccess={handleChildPinSuccess}
          storedPin={null} // Don't use stored check
          onVerify={async (pin) => {
            // In real app, pendingLoginChildId would be verified by server
            // FamilyService.verifyPin(pendingLoginChildId, pin)
            return FamilyService.verifyPin(pendingLoginChildId!, pin);
          }}
          title={`Enter PIN for ${pendingLoginChild?.name}`}
          subtitle="Identity Verification"
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative font-sans selection:bg-cardinal selection:text-white pb-12">
      <div className="fixed inset-0 pointer-events-none opacity-[0.02] z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}></div>
      <div className="relative z-10 max-w-[1400px] mx-auto p-6 md:p-8">

        {viewMode === 'CHILD' && activeChild && (
          <div className="animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3"><span className="text-2xl font-[590] tracking-tight text-white">HomeWork</span><span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Employee</span></div>
              <button onClick={handleLogout} className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-gold hover:border-gold/30 hover:bg-white/10 transition-all cursor-pointer active:scale-95"><LogOut className="w-5 h-5" /></button>
            </header>
            <div className="mb-8"><h2 className="text-3xl font-[590] text-white mb-1">Hi, {activeChild.name}</h2><p className="text-[#888]">Ready to earn today?</p></div>
            <ChildDetail
              child={activeChild} isParent={false} standardTasks={COMMON_TASKS} availableTasks={openTasks}
              onUpdateGrade={handleUpdateGrade} onSubmitTask={handleSubmitTask} onApproveTask={handleApproveTask} onPayTask={handlePayTask} onRejectTask={() => { }} onClaimTask={handleClaimTask}
            />
          </div>
        )}

        {viewMode === 'PARENT' && (
          <div className="animate-in fade-in duration-500">
            <header className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3"><span className="text-2xl font-[590] tracking-tight text-white">HomeWork</span><span className="px-2 py-0.5 rounded-md bg-white/10 border border-white/5 text-[11px] font-bold tracking-wider text-gray-400 uppercase">Parent</span></div>
              <div className="flex items-center gap-3">
                {/* Invite only for ADMIN role - simplified check: if I am in Parent mode, I am effectively Admin for now, 
                    but strictly we should check the active profile's role if we had one. 
                    However, 'Parent' view is generic 'Admin' view. 
                    Let's assume anyone in Parent view is Admin. 
                */}
                <button onClick={handleGenerateInvite} className="h-11 px-4 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all gap-2 cursor-pointer border-dashed"><Share2 className="w-4 h-4" /><span className="text-xs font-bold uppercase tracking-wider">Invite</span></button>
                <button onClick={handleLogout} className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-gold hover:border-gold/30 hover:bg-white/10 transition-all cursor-pointer active:scale-95"><LogOut className="w-5 h-5" /></button>
              </div>
            </header>
            <div className="flex flex-wrap items-center gap-3 mb-8">
              <button onClick={() => setIsAddChildModalOpen(true)} className="group bg-gradient-to-r from-cardinal to-[#b30000] text-white font-medium px-6 py-3.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all flex items-center gap-2 cursor-pointer"><UserPlus className="w-[18px] h-[18px]" /><span className="hidden sm:inline">Add Child</span></button>
              <button onClick={() => { setIsOpenTaskMode(true); setIsAddTaskModalOpen(true); }} disabled={!hasChildren} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-white/5 text-white disabled:opacity-50 cursor-pointer"><Calendar className="w-[18px] h-[18px]" /><span className="hidden sm:inline">Add Open Task</span></button>
              <button onClick={() => { setIsOpenTaskMode(false); setSelectedChildId(""); setIsAddTaskModalOpen(true); }} disabled={!hasChildren} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-white/5 text-white hover:bg-white/10 disabled:opacity-50 cursor-pointer"><Calendar className="w-[18px] h-[18px]" /><span className="hidden sm:inline">Create Draft</span></button>
              <button onClick={() => { if (hasChildren) { setSelectedChildId(children[0].id); setIsAdvanceModalOpen(true); } }} disabled={!hasChildren} className="flex items-center gap-2 px-6 py-3.5 rounded-xl font-medium bg-white/5 text-white disabled:opacity-50 cursor-pointer"><Plus className="w-[18px] h-[18px]" /><span className="hidden sm:inline">Add Advance</span></button>
            </div>

            {/* Activity Feed Section */}
            {hasChildren && (
              <div className="mb-12 grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="col-span-2">
                  {/* Main Children Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {children.map(child => (
                      <ChildCard key={child.id} child={child} siblings={children.filter(c => c.id !== child.id)} onEditSettings={(c) => setChildToEdit(c)} onUpdateGrades={(c) => setChildToUpdateGrades(c)} onAssignTask={(c) => { setSelectedChildId(c.id); setIsAddTaskModalOpen(true); }} onDeleteTask={(cid, tid) => statusTaskMutation.mutate({ taskId: tid, status: 'DELETED' })} onEditTask={(t) => { setEditingTask({ childId: child.id, task: t }); setIsAddTaskModalOpen(true); }} onReassignTask={(t, to) => { }} onApproveTask={handleApproveTask} onRejectTask={(cid, t) => { setTaskToReject({ childId: cid, task: t }); setRejectionComment(''); }} onPayTask={handlePayTask} onUndoApproval={handleUndoApproval} />
                    ))}
                  </div>
                </div>
                <div className="col-span-1">
                  <FamilyActivityFeed familyId={familyId!} />
                </div>
              </div>
            )}

            {!hasChildren && (
              <div className="rounded-[24px] border border-white/5 bg-white/[0.02] min-h-[400px] flex flex-col items-center justify-center text-center p-8">
                <Users className="w-16 h-16 text-white/20 mb-6" />
                <h2 className="text-2xl font-bold mb-2">No children added yet</h2>
                <button onClick={() => setIsAddChildModalOpen(true)} className="px-8 py-3 bg-white text-black font-bold rounded-xl mt-4 cursor-pointer">Add First Child</button>
              </div>
            )}
          </div>
        )}

        {/* Modals */}
        <AddChildModal isOpen={isAddChildModalOpen} onClose={() => setIsAddChildModalOpen(false)} onAdd={handleCreateChild} />
        <SettingsModal
          isOpen={!!childToEdit}
          onClose={() => setChildToEdit(null)}
          child={childToEdit}
          onSave={(id, updates) => handleUpdateChild(id, updates)}
          onDelete={(id) => { }}
          onImportAll={() => { }}
          onResetAll={() => { }}
        />
        <AssignTaskModal isOpen={isAddTaskModalOpen} onClose={() => { setIsAddTaskModalOpen(false); setEditingTask(null); }} childName={children.find(c => c.id === (editingTask?.childId || selectedChildId))?.name} isOpenTask={isOpenTaskMode} initialTask={editingTask ? { name: editingTask.task.name, minutes: editingTask.task.baselineMinutes } : undefined} onAssign={handleSaveTask} />
        <AddAdvanceModal
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          childrenData={children}
          initialChildId={selectedChildId}
          onAdd={(cid, amt, cat, memo) => addAdvanceMutation.mutate({ childId: cid, amount: amt, category: cat, memo: memo })}
        />

        {taskToReject && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setTaskToReject(null)} />
            <div className="relative w-full max-w-[480px] bg-[#1a1a1a] rounded-[24px] border border-white/[0.06] p-10 animate-in zoom-in-95">
              <h3 className="text-xl font-bold mb-4">Reject Task: {taskToReject.task.name}</h3>
              <textarea value={rejectionComment} onChange={(e) => setRejectionComment(e.target.value)} placeholder="What needs to be fixed?" className="w-full min-h-[120px] p-4 bg-white/5 border border-white/10 rounded-xl mb-6 outline-none focus:border-red-500" autoFocus />
              <div className="flex gap-4"><button onClick={() => setTaskToReject(null)} className="flex-1 py-3 text-gray-400 bg-white/5 rounded-xl cursor-pointer">Cancel</button><button onClick={handleConfirmReject} disabled={!rejectionComment.trim()} className="flex-1 py-3 bg-red-600 rounded-xl font-bold disabled:opacity-50 cursor-pointer">Send Back</button></div>
            </div>
          </div>
        )}

        {inviteLink && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setInviteLink(null)} />
            <div className="relative w-full max-w-[480px] bg-[#1a1a1a] rounded-[24px] border border-white/[0.06] p-10 animate-in zoom-in-95 text-center">
              <h3 className="text-xl font-bold mb-4">Invite Co-Parent</h3>
              <p className="text-gray-400 mb-6 text-sm">Share this secure link to add another admin to your family.</p>
              <div className="flex items-center gap-2 bg-white/5 p-3 rounded-xl mb-6 border border-white/10">
                <code className="text-xs text-gold flex-1 truncate">{inviteLink}</code>
                <button onClick={() => { navigator.clipboard.writeText(inviteLink); alert('Copied!'); }} className="text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg hover:bg-white/20">COPY</button>
              </div>
              <button onClick={() => setInviteLink(null)} className="w-full py-3 bg-white/10 rounded-xl font-bold hover:bg-white/15">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
