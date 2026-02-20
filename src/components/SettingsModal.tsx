
import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { Child } from '../types';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

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
  const [activeTab, setActiveTab] = useState<'profile' | 'data'>('profile');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [resetPinValue, setResetPinValue] = useState('');
  const [confirmResetPinValue, setConfirmResetPinValue] = useState('');
  const [credentialMessage, setCredentialMessage] = useState<string | null>(null);
  const [isResettingPin, setIsResettingPin] = useState(false);

  useEffect(() => {
    if (child && isOpen) {
      setName(child.name);
      setUsername(child.loginUsername || '');
      setGradeLevel(child.gradeLevel);

      setActiveTab('profile');
      setShowDeleteConfirm(false);
      setResetPinValue('');
      setConfirmResetPinValue('');
      setCredentialMessage(null);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [child, isOpen]);



  const handleSave = () => {
    if (!child) return;
    const updates: Partial<Child> = {
      name: name.trim() || child.name,
      loginUsername: username.trim() || undefined,
      gradeLevel: gradeLevel || child.gradeLevel,
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 font-sans text-content-primary">
      <div className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[580px] bg-cream rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-stroke-base">

        <button onClick={onClose} aria-label="Close" className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-app text-content-subtle transition-colors z-50 cursor-pointer">
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-20 border-b border-stroke-base pt-10 px-10 pb-0 shrink-0 bg-cream">
          <h2 className="text-3xl font-bold font-heading text-content-primary mb-6">Child Settings</h2>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {['profile'].map(t => (
              <button
                key={t}
                onClick={() => setActiveTab(t as any)}
                className={`
                  px-5 py-3 text-sm font-bold border-b-2 transition-all shrink-0 cursor-pointer uppercase tracking-wider
                  ${activeTab === t
                    ? 'border-crimson text-crimson'
                    : 'border-transparent text-charcoal/40 hover:text-content-primary hover:border-stroke-base'
                  }
                `}
              >
                {t === 'data' ? 'Family Data' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto p-10 scrollbar-hide pb-32 bg-cream">
          {activeTab === 'profile' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
              <div>
                <label className="block text-sm font-bold text-content-subtle uppercase mb-2 ml-1">Name</label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} className="px-4 py-3.5 text-base placeholder-neutral-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-content-subtle uppercase mb-2 ml-1">Grade Level</label>
                  <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full [&>option]:bg-white">
                    {SCHOOL_GRADES.map(g => (<option key={g} value={g}>{g}</option>))}
                  </Select>
                </div>
                <div>
                  <Input
                    type="text"
                    value={username}
                    className="p-1 text-content-subtle hover:text-blue-500 hover:bg-surface-2/50 rounded"
                    aria-label="Username"
                  />
                </div>
              </div>
              <div className="rounded-none border border-stroke-base bg-surface-app p-6 space-y-4">
                <h4 className="text-sm font-bold text-content-primary font-heading">Reset PIN</h4>
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

        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 bg-cream border-t border-stroke-base px-10 py-8 flex gap-4">
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
          <div className="absolute inset-0 z-[110] bg-cream flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-200">
            <div className="w-20 h-20 rounded-full bg-semantic-destructive/10 flex items-center justify-center mb-6 text-semantic-destructive"><AlertTriangle className="w-10 h-10" /></div>
            <h3 className="text-2xl font-bold font-heading text-content-primary mb-2">Delete Profile?</h3>
            <p className="text-content-subtle mb-8">This action is permanent.</p>
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
