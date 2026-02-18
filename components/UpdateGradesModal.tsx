
import React, { useState, useEffect, useMemo } from 'react';
// Final clean build
import { X, Plus } from 'lucide-react';
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
      setSubjects(JSON.parse(JSON.stringify(child.subjects))); // Deep copy
    }
  }, [child, isOpen]);

  const currentHourlyRate = useMemo(() => {
    if (!child) return 0;
    return calculateHourlyRate(subjects, child.rates || DEFAULT_RATES);
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
      name: `Subject ${subjects.length + 1}`,
      grade: Grade.C
    };
    setSubjects(prev => [...prev, newSubject]);
  };

  const handleRemoveSubject = (subjectId: string) => {
    setSubjects(prev => prev.filter(s => s.id !== subjectId));
  };

  const handleSave = () => {
    if (child) {
      onSave(child.id, subjects, currentHourlyRate);
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

      <div className="relative w-full max-w-[520px] bg-white rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-200">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-50 text-neutral-500 transition-colors z-20"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content */}
        <div className="relative z-10 overflow-y-auto px-8 md:px-12 py-10 scrollbar-hide pb-32">

          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold font-heading text-neutral-black mb-2">Update Grades</h2>
            <p className="text-base text-neutral-500">Current grades determine hourly earning rate</p>
          </div>

          {/* Live Rate Display */}
          <div className="mb-8 p-6 rounded-none bg-neutral-50 border border-neutral-200 text-center relative overflow-hidden group transition-all duration-300">
            <div className="relative z-10">
              <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Current Hourly Rate</p>
              <div className="text-5xl leading-none font-heading font-bold text-primary-cardinal drop-shadow-sm transition-all duration-300">
                {formatCurrency(currentHourlyRate)}
              </div>
            </div>
          </div>

          {/* Subject List */}
          <div className="space-y-6">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="group relative animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] mb-2 ml-1">
                      Subject
                    </label>
                    <Input
                      value={subject.name}
                      onChange={(e) => handleNameChange(subject.id, e.target.value)}
                      placeholder="e.g. Math"
                      className="w-full font-bold text-neutral-black h-12 px-4 bg-white border-neutral-200 focus:border-primary-cardinal transition-colors shadow-sm"
                    />
                  </div>

                  <div className="w-28 shrink-0">
                    <label className="block text-[10px] font-black text-neutral-400 uppercase tracking-[0.15em] mb-2 ml-1 text-center">
                      Grade
                    </label>
                    <Select
                      value={subject.grade}
                      onChange={(e) => handleGradeChange(subject.id, e.target.value as Grade)}
                      className="w-full font-black text-xl h-12 text-center bg-white border-neutral-200 focus:border-primary-cardinal transition-colors shadow-sm [&>option]:text-sm [&>option]:font-sans"
                    >
                      {GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="pb-1">
                    <button
                      onClick={() => handleRemoveSubject(subject.id)}
                      disabled={subjects.length <= 1}
                      className="w-11 h-11 flex items-center justify-center rounded-none text-neutral-300 hover:text-semantic-destructive hover:bg-semantic-destructive/5 transition-all cursor-pointer disabled:opacity-0 disabled:cursor-not-allowed"
                      aria-label="Remove subject"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={handleAddSubject}
              variant="secondary"
              className="w-full border-dashed py-8 mt-4"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-white border-t border-neutral-100 z-20">
          <Button
            onClick={handleSave}
            className="w-full h-14 text-lg font-bold shadow-lg"
            variant="primary"
          >
            Save Changes
          </Button>
        </div>

      </div>
    </div>
  );
};

export default UpdateGradesModal;
