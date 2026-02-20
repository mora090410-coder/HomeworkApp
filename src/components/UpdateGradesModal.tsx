
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Calculator, DollarSign } from 'lucide-react';
import { Child, Grade, GradeConfig, Subject } from '../types';
import { DEFAULT_RATES } from '../constants';
import { calculateHourlyRate, centsToDollars, dollarsToCents, formatCurrency } from '../utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface UpdateGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child | null;
  gradeConfigs: GradeConfig[];
  onSave: (childId: string, updatedSubjects: Subject[], currentHourlyRate: number, updatedGlobalConfigs: GradeConfig[]) => void;
}

const GRADE_OPTIONS: Grade[] = [
  Grade.A_PLUS, Grade.A, Grade.A_MINUS,
  Grade.B_PLUS, Grade.B, Grade.B_MINUS,
  Grade.C_PLUS, Grade.C, Grade.C_MINUS,
  Grade.D, Grade.F
];

type TabId = 'subjects' | 'payscale';

const UpdateGradesModal: React.FC<UpdateGradesModalProps> = ({
  isOpen,
  onClose,
  child,
  gradeConfigs,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('subjects');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [localGradeConfigs, setLocalGradeConfigs] = useState<GradeConfig[]>([]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Initialize subjects from child when modal opens
  useEffect(() => {
    if (child) {
      const initialSubjects = child.subjects.length > 0
        ? JSON.parse(JSON.stringify(child.subjects)) as Subject[]
        : [{ id: crypto.randomUUID(), name: '', grade: Grade.B }];
      setSubjects(initialSubjects);
    }
  }, [child, isOpen]);

  // Initialize local grade configs from props when modal opens
  useEffect(() => {
    if (isOpen) {
      if (gradeConfigs.length > 0) {
        // Deep-clone so edits don't mutate the upstream state
        setLocalGradeConfigs(JSON.parse(JSON.stringify(gradeConfigs)) as GradeConfig[]);
      } else {
        // Bootstrap from DEFAULT_RATES so every grade has an editable value
        const bootstrapped: GradeConfig[] = GRADE_OPTIONS.map((grade) => ({
          grade,
          valueCents: dollarsToCents(DEFAULT_RATES[grade] ?? 0),
        }));
        setLocalGradeConfigs(bootstrapped);
      }
      setActiveTab('subjects');
    }
  }, [isOpen, gradeConfigs]);

  // Build a rate map from the local (possibly edited) payscale for the live preview
  const liveRateMap = useMemo<Record<Grade, number>>(() => {
    return localGradeConfigs.reduce((acc, cfg) => {
      acc[cfg.grade] = centsToDollars(cfg.valueCents);
      return acc;
    }, {} as Record<Grade, number>);
  }, [localGradeConfigs]);

  const currentHourlyRate = useMemo(() => {
    if (!child) return 0;
    // Use the live payscale so the preview responds to payscale edits too
    const ratesToUse = Object.keys(liveRateMap).length > 0 ? liveRateMap : (child.rates || DEFAULT_RATES);
    return calculateHourlyRate(subjects, ratesToUse);
  }, [subjects, child, liveRateMap]);

  // Subjects tab handlers
  const handleGradeChange = (subjectId: string, newGrade: Grade) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId ? { ...s, grade: newGrade } : s
    ));
  };

  const handleNameChange = (subjectId: string, newName: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === subjectId ? { ...s, name: newName } : s
    ));
  };

  const handleAddSubject = () => {
    const newSubject: Subject = {
      id: crypto.randomUUID(),
      name: '',
      grade: Grade.B,
    };
    setSubjects(prev => [...prev, newSubject]);
  };

  const handleRemoveSubject = (subjectId: string) => {
    if (subjects.length > 1) {
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
    }
  };

  // Payscale tab handlers
  const handlePayscaleChange = (grade: Grade, dollarValue: string) => {
    const parsed = parseFloat(dollarValue);
    const cents = Number.isFinite(parsed) && parsed >= 0 ? dollarsToCents(parsed) : 0;
    setLocalGradeConfigs(prev =>
      prev.map(cfg => cfg.grade === grade ? { ...cfg, valueCents: cents } : cfg)
    );
  };

  const handleSave = () => {
    if (!child) return;
    const validSubjects = subjects.filter(s => s.name.trim() !== '');
    onSave(child.id, validSubjects, currentHourlyRate, localGradeConfigs);
    onClose();
  };

  if (!isOpen || !child) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-content-primary">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[600px] bg-cream rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-stroke-base">

        {/* Header */}
        <div className="px-8 py-6 border-b border-stroke-base flex justify-between items-center bg-cream z-20">
          <div>
            <h2 className="text-2xl font-bold font-heading text-content-primary">Grade Command Center</h2>
            <p className="text-sm text-content-subtle">Update subjects, grades, and the global payscale.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-app text-content-subtle transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-stroke-base bg-cream z-10 shrink-0">
          <button
            onClick={() => setActiveTab('subjects')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'subjects'
              ? 'text-crimson border-b-2 border-crimson'
              : 'text-charcoal/40'
              }`}
          >
            Subjects
          </button>
          <button
            onClick={() => setActiveTab('payscale')}
            className={`flex-1 py-3 text-sm font-bold uppercase tracking-widest transition-colors ${activeTab === 'payscale'
              ? 'text-crimson border-b-2 border-crimson'
              : 'text-charcoal/40'
              }`}
          >
            Payscale
          </button>
        </div>

        {/* Live Rate Display — always visible */}
        <div className="px-8 pt-6 pb-2 bg-cream shrink-0">
          <div className="p-4 rounded-none bg-surface-app border border-stroke-base text-center relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calculator className="w-4 h-4 text-content-subtle" />
                <p className="text-xs font-bold text-content-subtle uppercase tracking-widest">Effective Hourly Rate</p>
              </div>
              <div className="text-5xl leading-none font-heading font-bold text-gold font-serif drop-shadow-sm transition-all duration-300">
                {formatCurrency(currentHourlyRate)}
              </div>
              <p className="text-sm text-content-subtle mt-1 font-medium">Based on {subjects.filter(s => s.name.trim() !== '').length} subject{subjects.filter(s => s.name.trim() !== '').length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto px-8 py-4 scrollbar-hide pb-32 grow">

          {/* ── Subjects Tab ── */}
          {activeTab === 'subjects' && (
            <div className="space-y-3 pt-2">
              {subjects.map((subject, index) => (
                <div
                  key={subject.id}
                  className="group flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-content-subtle uppercase tracking-[0.15em] mb-1.5 ml-1">
                      Subject Name
                    </label>
                    <Input
                      value={subject.name}
                      onChange={(e) => handleNameChange(subject.id, e.target.value)}
                      placeholder="e.g. Math"
                      className="w-full font-bold text-content-primary h-12 px-4 bg-surface-app border-gold/30 transition-colors shadow-sm"
                      autoFocus={index === subjects.length - 1 && subject.name === ''}
                    />
                  </div>

                  <div className="w-32 shrink-0">
                    <label className="block text-[10px] font-black text-content-subtle uppercase tracking-[0.15em] mb-1.5 ml-1 text-center">
                      Grade
                    </label>
                    <Select
                      value={subject.grade}
                      onChange={(e) => handleGradeChange(subject.id, e.target.value as Grade)}
                      className="w-full font-black text-xl h-12 text-center bg-surface-app border-gold/30 transition-colors shadow-sm"
                    >
                      {GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="pt-6">
                    <button
                      onClick={() => handleRemoveSubject(subject.id)}
                      disabled={subjects.length <= 1}
                      className="w-12 h-12 flex items-center justify-center rounded-none text-content-subtle hover:text-semantic-destructive hover:bg-semantic-destructive/5 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-not-allowed"
                      aria-label="Remove subject"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}

              <Button
                onClick={handleAddSubject}
                variant="secondary"
                className="w-full border-dashed py-6 mt-4 hover:border-stroke-base hover:bg-surface-app text-content-subtle"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Another Subject
              </Button>
            </div>
          )}

          {/* ── Payscale Tab ── */}
          {activeTab === 'payscale' && (
            <div className="pt-2">
              <p className="text-xs text-content-subtle mb-4 font-medium">
                Set the dollar value earned per grade. This is the <span className="font-bold text-content-primary">global payscale</span> applied to all children unless they have custom rates.
              </p>
              <div className="space-y-2">
                {localGradeConfigs.map((cfg) => (
                  <div key={cfg.grade} className="flex items-center gap-4">
                    <div className="w-14 shrink-0 text-center">
                      <span className="text-xl font-black text-content-primary">{cfg.grade}</span>
                    </div>
                    <div className="flex-1 relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle pointer-events-none">
                        <DollarSign className="w-4 h-4" />
                      </div>
                      <Input
                        type="number"
                        min="0"
                        step="0.25"
                        value={centsToDollars(cfg.valueCents).toFixed(2)}
                        onChange={(e) => handlePayscaleChange(cfg.grade, e.target.value)}
                        className="w-full h-11 pl-8 font-bold text-content-primary bg-surface-app border-gold/30 transition-colors shadow-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="w-24 shrink-0 text-right">
                      <span className="text-xs text-content-subtle font-medium">per subject</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-content-subtle mt-4">
                Changes apply globally to all children on next save. Tip: An A+ in one subject at $5.00/hr earns $5.00 added to the hourly rate.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-cream border-t border-stroke-base z-20 flex justify-end">
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 border border-gold/30 text-charcoal rounded-full px-6 py-2 font-bold"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="flex-[2] h-14 text-lg font-bold shadow-lg"
              variant="primary"
            >
              Save & Update Rate
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default UpdateGradesModal;
