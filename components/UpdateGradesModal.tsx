
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronDown, Check, Plus } from 'lucide-react';
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
        <div className="relative z-10 overflow-y-auto px-8 md:px-12 py-10 scrollbar-hide">

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
          <div className="space-y-4 pb-12">
            {subjects.map((subject) => (
              <div
                key={subject.id}
                className="flex flex-col gap-3 bg-white border border-neutral-200 p-4 rounded-none transition-colors group hover:border-primary-gold/50"
              >
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={subject.name}
                    onChange={(e) => handleNameChange(subject.id, e.target.value)}
                    placeholder="Subject Name"
                    className="flex-1 font-medium text-neutral-black h-10"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSubject(subject.id)}
                    className="text-semantic-destructive hover:bg-semantic-destructive/10 p-2"
                    aria-label="Remove subject"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Grade</span>
                  <div className="w-32">
                    <Select
                      value={subject.grade}
                      onChange={(e) => handleGradeChange(subject.id, e.target.value as Grade)}
                      className="font-bold text-lg h-auto py-2"
                    >
                      {GRADE_OPTIONS.map((grade) => (
                        <option key={grade} value={grade}>
                          {grade}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            <Button
              onClick={handleAddSubject}
              variant="secondary"
              className="w-full border-dashed py-6"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-8 pt-6 bg-white border-t border-neutral-200">
          <Button
            onClick={handleSave}
            className="w-full h-14 text-lg font-bold"
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
