
import React, { useState, useEffect, useMemo } from 'react';
import { X, Check, Trash2, Plus, AlertTriangle, Download, Upload, RefreshCcw } from 'lucide-react';
import { Child, Grade, Subject } from '../types';
import { formatCurrency } from '../utils';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'payscale' | 'data'>('profile');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
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

  const handleSave = () => {
    if (!child) return;
    const updates: Partial<Child> = {
      name: name.trim() || child.name,
      loginUsername: username.trim() || undefined,
      gradeLevel: gradeLevel || child.gradeLevel,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans text-neutral-black">
      <div className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[580px] bg-white rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-200">

        <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-50 text-neutral-500 transition-colors z-50 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-20 border-b border-neutral-200 pt-10 px-10 pb-0 shrink-0 bg-white">
          <h2 className="text-3xl font-bold font-heading text-neutral-black mb-6">Parent Settings</h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {['profile', 'payscale', 'data'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`
                  px-5 py-3 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer uppercase tracking-wider
                  ${activeTab === t
                    ? 'border-primary-cardinal text-primary-cardinal'
                    : 'border-transparent text-neutral-500 hover:text-neutral-black hover:border-neutral-200'
                  }
                `}
              >
                {t === 'data' ? 'Family Data' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-10 scrollbar-hide pb-32 bg-white">
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div>
                <label className="block text-sm font-bold text-neutral-500 uppercase mb-2 ml-1">Name</label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3.5 text-base placeholder-neutral-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-500 uppercase mb-2 ml-1">Grade Level</label>
                  <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full [&>option]:bg-white">
                    {SCHOOL_GRADES.map(g => (<option key={g} value={g}>{g}</option>))}
                  </Select>
                </div>
                <div>
                  <Input
                    type="text"
                    value={username}
                    className="p-1 text-neutral-400 hover:text-primary-cardinal hover:bg-neutral-200/50 rounded"
                    aria-label="Username"
                  />
                </div>
              </div>
              <div className="rounded-none border border-neutral-200 bg-neutral-50 p-6 space-y-4">
                <h4 className="text-sm font-bold text-neutral-black font-heading">Reset PIN</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    type="password"
                    maxLength={4}
                    value={resetPinValue}
                    onChange={(e) => setResetPinValue(e.target.value.replace(/\D/g, ''))}
                    className="px-4 py-3 text-base placeholder-neutral-400"
                    placeholder="New PIN"
                    aria-label="New PIN"
                  />
                  <Input
                    type="password"
                    maxLength={4}
                    value={confirmResetPinValue}
                    onChange={(e) => setConfirmResetPinValue(e.target.value.replace(/\D/g, ''))}
                    className="px-4 py-3 text-base placeholder-neutral-400"
                    placeholder="Confirm PIN"
                    aria-label="Confirm PIN"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => { void handleResetPin(); }}
                  disabled={isResettingPin}
                  className="w-full"
                  isLoading={isResettingPin}
                >
                  {isResettingPin ? 'Resetting...' : 'Reset PIN'}
                </Button>
                {credentialMessage && (
                  <p className={`text-sm font-medium ${credentialMessage.includes('success') ? 'text-semantic-success' : 'text-semantic-destructive'}`}>
                    {credentialMessage}
                  </p>
                )}
              </div>
            </div>
          )}
          {activeTab === 'payscale' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-500 uppercase mb-2 ml-1">Base Value ($)</label>
                  <Input type="number" step="0.25" value={baseValue} onChange={(e) => setBaseValue(parseFloat(e.target.value) || 0)} className="px-4 py-3.5 text-base placeholder-neutral-400" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-500 uppercase mb-2 ml-1">Decrement</label>
                  <Select value={decrement} onChange={(e) => setDecrement(parseFloat(e.target.value))} className="w-full [&>option]:bg-white">
                    {DECREMENT_OPTIONS.map(opt => (<option key={opt} value={opt}>${opt.toFixed(2)}</option>))}
                  </Select>
                </div>
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-none p-6">
                <div className="grid grid-cols-3 gap-2">
                  {LETTER_GRADES.map(g => (
                    <div key={g} className="flex justify-between items-center px-3 py-3 bg-white rounded-none border border-neutral-200 shadow-sm">
                      <span className="text-xs font-bold text-neutral-black">{g}</span>
                      <span className="text-xs font-bold text-primary-cardinal">{formatCurrency(calculatedRates[g] || 0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'data' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
              <div className="p-5 rounded-none bg-neutral-50 border border-neutral-200">
                <h4 className="text-neutral-black font-bold mb-2 flex items-center gap-2 font-heading">
                  <Download className="w-4 h-4 text-primary-cardinal" /> Export Data
                </h4>
                <p className="text-sm text-neutral-500 mb-4">Copy your entire family setup to move it to another phone or tablet.</p>
                <Button
                  onClick={handleExport}
                  variant={copySuccess ? "secondary" : "secondary"}
                  className={`w-full ${copySuccess ? 'text-semantic-success border-semantic-success' : ''}`}
                  leftIcon={copySuccess ? <Check className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                >
                  {copySuccess ? 'Copied to Clipboard!' : 'Copy Export Code'}
                </Button>
              </div>

              <div className="p-5 rounded-none bg-neutral-50 border border-neutral-200">
                <h4 className="text-neutral-black font-bold mb-2 flex items-center gap-2 font-heading">
                  <Upload className="w-4 h-4 text-primary-cardinal" /> Import Data
                </h4>
                <Button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  variant="secondary"
                  className="w-full"
                >
                  Import Code
                </Button>
              </div>

              <div className="p-5 rounded-none bg-semantic-destructive/5 border border-semantic-destructive/20">
                <h4 className="text-semantic-destructive font-bold mb-2 flex items-center gap-2 font-heading">
                  <RefreshCcw className="w-4 h-4" /> Reset App
                </h4>
                <p className="text-sm text-neutral-500 mb-4">Clear all children, tasks, and history. Use this to start a fresh real-world trial.</p>
                <Button
                  onClick={() => { if (confirm("Are you sure? This deletes everything.")) onResetAll?.(); }}
                  variant="destructive"
                  className="w-full"
                >
                  Clear All Family Data
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-white border-t border-neutral-200 px-10 py-8 flex gap-4">
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="destructive"
            className="flex-1 h-14"
          >
            Delete Profile
          </Button>
          <Button
            onClick={handleSave}
            variant="primary"
            className="flex-1 h-14 shadow-lg"
          >
            Save Changes
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-[110] bg-white flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-semantic-destructive/10 flex items-center justify-center mb-6 text-semantic-destructive"><AlertTriangle className="w-10 h-10" /></div>
            <h3 className="text-2xl font-bold font-heading text-neutral-black mb-2">Delete Profile?</h3>
            <p className="text-neutral-500 mb-8">This action is permanent.</p>
            <div className="flex gap-4 w-full">
              <Button onClick={() => setShowDeleteConfirm(false)} variant="secondary" className="flex-1 h-14">
                Cancel
              </Button>
              <Button onClick={() => { if (child) { onDelete(child.id); onClose(); } }} variant="destructive" className="flex-1 h-14">
                Yes, Delete
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsModal;
