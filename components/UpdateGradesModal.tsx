
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import { Child, Grade, Subject } from '../types';
import { DEFAULT_RATES } from '../constants';
import { calculateHourlyRate, formatCurrency } from '../utils';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';

interface UpdateGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child | null;
  onSave: (childId: string, updatedSubjects: Subject[], currentHourlyRate: number) => void;
}

const GRADE_OPTIONS: Grade[] = [
  Grade.A_PLUS, Grade.A, Grade.A_MINUS,
  Grade.B_PLUS, Grade.B, Grade.B_MINUS,
  Grade.C_PLUS, Grade.C, Grade.C_MINUS,
  Grade.D, Grade.F
];

const UpdateGradesModal: React.FC<UpdateGradesModalProps> = ({ isOpen, onClose, child, onSave }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  // Initialize state when child changes or modal opens
  useEffect(() => {
    if (child) {
      // Ensure we have at least one empty subject if none exist, though unlikely for existing child
      const initialSubjects = child.subjects.length > 0
        ? JSON.parse(JSON.stringify(child.subjects))
        : [{ id: crypto.randomUUID(), name: '', grade: Grade.B }];
      setSubjects(initialSubjects);
    }
  }, [child, isOpen]);

  const currentHourlyRate = useMemo(() => {
    if (!child) return 0;
    // Use the child's specific rates if available, otherwise default
    const ratesToUse = child.rates || DEFAULT_RATES;
    return calculateHourlyRate(subjects, ratesToUse);
  }, [subjects, child]);

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
      grade: Grade.B
    };
    setSubjects(prev => [...prev, newSubject]);
  };

  const handleRemoveSubject = (subjectId: string) => {
    if (subjects.length > 1) {
      setSubjects(prev => prev.filter(s => s.id !== subjectId));
    }
  };

  const handleSave = () => {
    if (child) {
      // Filter out empty subjects before saving
      const validSubjects = subjects.filter(s => s.name.trim() !== '');
      onSave(child.id, validSubjects, currentHourlyRate);
      onClose();
    }
  };

  if (!isOpen || !child) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-neutral-black">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[600px] bg-white rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-200">

        {/* Header */}
        <div className="px-8 py-6 border-b border-neutral-100 flex justify-between items-center bg-white z-20">
          <div>
            <h2 className="text-2xl font-bold font-heading text-neutral-black">Grade Command Center</h2>
            <p className="text-sm text-neutral-500">Update subjects & grades to set the hourly rate.</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-50 text-neutral-500 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="relative z-10 overflow-y-auto px-8 py-8 scrollbar-hide pb-32">

          {/* Live Rate Display */}
          <div className="mb-8 p-6 rounded-none bg-neutral-50 border border-neutral-200 text-center relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calculator className="w-4 h-4 text-neutral-400" />
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Effective Hourly Rate</p>
              </div>
              <div className="text-6xl leading-none font-heading font-bold text-primary-cardinal drop-shadow-sm transition-all duration-300">
                {formatCurrency(currentHourlyRate)}
              </div>
              <p className="text-sm text-neutral-400 mt-2 font-medium">Based on {subjects.length} subjects</p>
            </div>
          </div>

          {/* Subject List */}
          <div className="space-y-3">
            {subjects.map((subject, index) => (
              <div
                key={subject.id}
                className="group flex items-center gap-3 animate-in slide-in-from-bottom-2 duration-300 fill-mode-backwards"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1">
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] mb-1.5 ml-1">
                    Subject Name
                  </label>
                  <Input
                    value={subject.name}
                    onChange={(e) => handleNameChange(subject.id, e.target.value)}
                    placeholder="e.g. Math"
                    className="w-full font-bold text-neutral-black h-12 px-4 bg-white border-neutral-200 focus:border-primary-cardinal transition-colors shadow-sm"
                    autoFocus={index === subjects.length - 1 && subject.name === ''}
                  />
                </div>

                <div className="w-32 shrink-0">
                  <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] mb-1.5 ml-1 text-center">
                    Grade
                  </label>
                  <Select
                    value={subject.grade}
                    onChange={(e) => handleGradeChange(subject.id, e.target.value as Grade)}
                    className="w-full font-black text-xl h-12 text-center bg-white border-neutral-200 focus:border-primary-cardinal transition-colors shadow-sm"
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
                    className="w-12 h-12 flex items-center justify-center rounded-none text-neutral-300 hover:text-semantic-destructive hover:bg-semantic-destructive/5 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-not-allowed"
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
              className="w-full border-dashed py-6 mt-6 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-500"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Another Subject
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-neutral-200 z-20 flex justify-end">
          <div className="flex gap-3 w-full">
            <Button
              onClick={onClose}
              variant="ghost"
              className="flex-1 h-14 text-neutral-500 font-bold"
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
