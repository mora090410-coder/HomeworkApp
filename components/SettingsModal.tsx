
import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Trash2, Plus, AlertTriangle, Download, Upload, RefreshCcw } from 'lucide-react';
import { Child, Grade, Subject } from '../types';
import { formatCurrency } from '../utils';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child | null;
  onSave: (childId: string, updates: Partial<Child>) => void;
  onResetPin?: (childId: string, newPin: string) => Promise<void> | void;
  onDelete: (childId: string) => void;
  onImportAll?: (data: string) => void;
  onResetAll?: () => void;
}

const SCHOOL_GRADES = [
  'Kindergarten',
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
  '11th Grade', '12th Grade'
];

const LETTER_GRADES: Grade[] = [
  Grade.A_PLUS, Grade.A, Grade.A_MINUS,
  Grade.B_PLUS, Grade.B, Grade.B_MINUS,
  Grade.C_PLUS, Grade.C, Grade.C_MINUS,
  Grade.D, Grade.F
];

const DECREMENT_OPTIONS = [0.25, 0.50, 0.75, 1.00];

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  child,
  onSave,
  onResetPin,
  onDelete,
  onImportAll,
  onResetAll
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'subjects' | 'payscale' | 'data'>('profile');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [baseValue, setBaseValue] = useState(5.00);
  const [decrement, setDecrement] = useState(0.25);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importText, setImportText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [resetPinValue, setResetPinValue] = useState('');
  const [confirmResetPinValue, setConfirmResetPinValue] = useState('');
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
  const [isResettingPin, setIsResettingPin] = useState(false);

  useEffect(() => {
    if (child && isOpen) {
      setName(child.name);
      setUsername(child.loginUsername || '');
      setGradeLevel(child.gradeLevel);
      setSubjects(JSON.parse(JSON.stringify(child.subjects)));
      setBaseValue(5.00);
      setDecrement(0.25);
      setActiveTab('profile');
      setShowDeleteConfirm(false);
      setImportText('');
      setCopySuccess(false);
      setResetPinValue('');
      setConfirmResetPinValue('');
      setCredentialMessage(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [child, isOpen]);

  const calculatedRates = useMemo(() => {
    const newRates: Record<string, number> = {};
    const orderedGrades = [
      Grade.A_PLUS, Grade.A, Grade.A_MINUS,
      Grade.B_PLUS, Grade.B, Grade.B_MINUS,
      Grade.C_PLUS, Grade.C, Grade.C_MINUS, Grade.D, Grade.F
    ];
    orderedGrades.forEach((g, index) => {
      if (['C', 'C-', 'D', 'F'].includes(g)) {
        newRates[g] = 0.00;
      } else {
        const val = baseValue - (index * decrement);
        newRates[g] = Math.max(0, val);
      }
    });
    return newRates;
  }, [baseValue, decrement]);

  const handleExport = () => {
    const data = localStorage.getItem('homework-app-v2');
    if (data) {
      navigator.clipboard.writeText(data);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleImport = () => {
    if (importText.trim() && onImportAll) {
      onImportAll(importText.trim());
      onClose();
    }
  };

  const handleAddSubject = () => {
    setSubjects(prev => [...prev, { id: crypto.randomUUID(), name: '', grade: Grade.B }]);
  };

  const handleRemoveSubject = (id: string) => {
    if (subjects.length > 1) setSubjects(prev => prev.filter(s => s.id !== id));
  };

  const handleSubjectNameChange = (id: string, newName: string) => {
    setSubjects(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s));
  };

  const handleSave = () => {
    if (!child) return;
    const updates: Partial<Child> = {
      name: name.trim() || child.name,
      loginUsername: username.trim() || undefined,
      gradeLevel: gradeLevel || child.gradeLevel,
      subjects: subjects.map(s => ({ ...s, name: s.name.trim() || 'Untitled' })),
      rates: calculatedRates as Record<Grade, number>
    };
    onSave(child.id, updates);
    onClose();
  };

  const handleResetPin = async () => {
    if (!child || !onResetPin) {
      return;
    }

    if (!/^\d{4}$/.test(resetPinValue)) {
      setCredentialMessage('PIN must be exactly 4 digits.');
      return;
    }

    if (resetPinValue !== confirmResetPinValue) {
      setCredentialMessage('PINs do not match.');
      return;
    }

    setIsResettingPin(true);
    setCredentialMessage(null);
    try {
      await onResetPin(child.id, resetPinValue);
      setCredentialMessage('PIN reset successfully.');
      setResetPinValue('');
      setConfirmResetPinValue('');
    } catch (error) {
      if (error instanceof Error) {
        setCredentialMessage(error.message);
      } else {
        setCredentialMessage('Failed to reset PIN.');
      }
    } finally {
      setIsResettingPin(false);
    }
  };

  if (!isOpen || !child) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans text-white">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[580px] glass-dark rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}>
        </div>

        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-50 cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-20 border-b border-white/10 pt-10 px-10 pb-0 shrink-0">
          <h2 className="text-[1.75rem] font-[590] text-white mb-6">Parent Settings</h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {['profile', 'subjects', 'payscale', 'data'].map(t => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`px-5 py-3 text-[0.9375rem] font-[510] border-b-2 transition-all shrink-0 cursor-pointer ${activeTab === t ? 'border-primary-400 text-primary-400' : 'border-transparent text-gray-400 hover:text-gray-300'}`}>
                {t === 'data' ? 'Family Data' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-10 scrollbar-hide pb-32">
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div>
                <label className="block text-[0.8125rem] font-bold text-gray-400 uppercase mb-2 ml-1">Name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all placeholder:text-gray-600" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.8125rem] font-bold text-gray-400 uppercase mb-2 ml-1">Grade Level</label>
                  <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all [&>option]:bg-gray-950">
                    {SCHOOL_GRADES.map(g => (<option key={g} value={g}>{g}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-bold text-gray-400 uppercase mb-2 ml-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all placeholder:text-gray-600"
                    aria-label="Username"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
                <h4 className="text-sm font-semibold text-white">Reset PIN</h4>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="password"
                    maxLength={4}
                    value={resetPinValue}
                    onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all placeholder:text-gray-600"
                    placeholder="New PIN"
                    aria-label="New PIN"
                  />
                  <input
                    type="password"
                    maxLength={4}
                    value={confirmResetPinValue}
                    onChange={(e) => setConfirmResetPinValue(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-4 py-3 rounded-xl bg-black/40 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all placeholder:text-gray-600"
                    placeholder="Confirm PIN"
                    aria-label="Confirm PIN"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => { void handleResetPin(); }}
                  disabled={isResettingPin}
                  className="w-full py-3 rounded-xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 disabled:opacity-60 transition-all cursor-pointer"
                  aria-label="Reset PIN"
                >
                  {isResettingPin ? 'Resetting...' : 'Reset PIN'}
                </button>
                {credentialMessage && (
                  <p className={`text-sm ${credentialMessage.includes('success') ? 'text-emerald-400' : 'text-red-400'}`}>
                    {credentialMessage}
                  </p>
                )}
              </div>
            </div>
          )}
          {activeTab === 'subjects' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-3 mb-6">
                {subjects.map(s => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors">
                    <input type="text" value={s.name} onChange={(e) => handleSubjectNameChange(s.id, e.target.value)} className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-gray-600" placeholder="Subject Name" />
                    <button onClick={() => handleRemoveSubject(s.id)} disabled={subjects.length <= 1} className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
              <button onClick={handleAddSubject} className="w-full py-3 rounded-xl border border-dashed border-white/20 text-gray-400 flex items-center justify-center gap-2 hover:border-primary-400 hover:text-primary-400 transition-all cursor-pointer"><Plus className="w-4 h-4" /> Add Subject</button>
            </div>
          )}
          {activeTab === 'payscale' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.8125rem] font-bold text-gray-400 uppercase mb-2 ml-1">Base Value ($)</label>
                  <input type="number" step="0.25" value={baseValue} onChange={(e) => setBaseValue(parseFloat(e.target.value) || 0)} className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400/50" />
                </div>
                <div>
                  <label className="block text-[0.8125rem] font-bold text-gray-400 uppercase mb-2 ml-1">Decrement</label>
                  <select value={decrement} onChange={(e) => setDecrement(parseFloat(e.target.value))} className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none [&>option]:bg-gray-950">
                    {DECREMENT_OPTIONS.map(opt => (<option key={opt} value={opt}>${opt.toFixed(2)}</option>))}
                  </select>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="grid grid-cols-3 gap-2">
                  {LETTER_GRADES.map(g => (
                    <div key={g} className="flex justify-between items-center px-3 py-3 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-[0.75rem] font-bold text-white">{g}</span>
                      <span className="text-[0.75rem] font-bold text-primary-400">{formatCurrency(calculatedRates[g] || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'data' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Download className="w-4 h-4 text-primary-400" /> Export Data
                </h4>
                <p className="text-sm text-gray-400 mb-4">Copy your entire family setup to move it to another phone or tablet.</p>
                <button
                  onClick={handleExport}
                  className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${copySuccess ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white hover:bg-white/10 border border-white/10'}`}
                >
                  {copySuccess ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                  {copySuccess ? 'Copied to Clipboard!' : 'Copy Export Code'}
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-blue-400" /> Import Data
                </h4>
                <p className="text-sm text-gray-400 mb-4">Paste an export code to overwrite this device's data.</p>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Paste code here..."
                  className="w-full h-24 p-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white/60 mb-3 outline-none focus:border-blue-400/40 resize-none"
                />
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="w-full py-3 rounded-xl font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  Import Code
                </button>
              </div>

              <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20">
                <h4 className="text-red-400 font-bold mb-2 flex items-center gap-2">
                  <RefreshCcw className="w-4 h-4" /> Reset App
                </h4>
                <p className="text-sm text-gray-400 mb-4">Clear all children, tasks, and history. Use this to start a fresh real-world trial.</p>
                <button
                  onClick={() => { if (confirm("Are you sure? This deletes everything.")) onResetAll?.(); }}
                  className="w-full py-3 rounded-xl font-bold bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer"
                >
                  Clear All Family Data
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 z-20 glass-dark border-t border-white/10 px-10 py-8 flex gap-4">
          <button onClick={() => setShowDeleteConfirm(true)} className="flex-1 py-4 rounded-xl font-bold text-[#ff4444] bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 transition-all cursor-pointer">Delete Profile</button>
          <button onClick={handleSave} className="flex-1 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-700 to-primary-500 shadow-lg hover:scale-[1.02] shadow-primary-500/20 transition-all cursor-pointer">Save Changes</button>
        </div>
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[110] glass-dark flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6 text-[#ff4444]"><AlertTriangle className="w-10 h-10" /></div>
            <h3 className="text-2xl font-[590] text-white mb-2">Delete Profile?</h3>
            <p className="text-gray-400 mb-8">This action is permanent.</p>
            <div className="flex gap-4 w-full">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-4 rounded-xl font-bold text-white bg-white/[0.06] hover:bg-white/[0.1] transition-all cursor-pointer">Cancel</button>
              <button onClick={() => { if (child) { onDelete(child.id); onClose(); } }} className="flex-1 py-4 rounded-xl font-bold text-white bg-[#ff4444] hover:bg-[#eb0000] transition-all cursor-pointer">Yes, Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
