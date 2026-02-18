
import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/src/components/ui/Input';
import { Select } from '@/src/components/ui/Select';
import { Grade } from '../types';
import { DEFAULT_RATES } from '../constants';
import { formatCurrency } from '../utils';

interface SubjectInput {
  id: string;
  name: string;
  grade: Grade;
}

export interface NewChildData {
  name: string;
  gradeLevel: string;
  subjects: { name: string; grade: Grade }[];
}

interface AddChildModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: NewChildData) => void;
}

const SCHOOL_GRADES = [
  'Kindergarten',
  '1st Grade', '2nd Grade', '3rd Grade', '4th Grade', '5th Grade',
  '6th Grade', '7th Grade', '8th Grade', '9th Grade', '10th Grade',
  '11th Grade', '12th Grade'
];

const LETTER_GRADES = Object.keys(DEFAULT_RATES) as Grade[];

const AddChildModal: React.FC<AddChildModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subjects, setSubjects] = useState<SubjectInput[]>([
    { id: '1', name: 'Math', grade: Grade.B },
    { id: '2', name: 'English', grade: Grade.B },
    { id: '3', name: 'Science', grade: Grade.B },
    { id: '4', name: 'History', grade: Grade.B },
    { id: '5', name: 'PE', grade: Grade.A },
  ]);

  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName('');
      setGradeLevel('');
      setSubjects([
        { id: '1', name: 'Math', grade: Grade.B },
        { id: '2', name: 'English', grade: Grade.B },
        { id: '3', name: 'Science', grade: Grade.B },
        { id: '4', name: 'History', grade: Grade.B },
        { id: '5', name: 'PE', grade: Grade.A },
      ]);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  const totalHourlyRate = useMemo(() => {
    return subjects.reduce((total, sub) => total + (DEFAULT_RATES[sub.grade] || 0), 0);
  }, [subjects]);

  const isValidStep1 = name.trim().length > 0 && gradeLevel.length > 0;

  const handleAddSubject = () => {
    setSubjects(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', grade: Grade.B }
    ]);
  };

  const handleRemoveSubject = (id: string) => {
    if (subjects.length > 1) {
      setSubjects(prev => prev.filter(s => s.id !== id));
    }
  };

  const handleUpdateSubject = (id: string, field: 'name' | 'grade', value: string) => {
    setSubjects(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleNext = () => {
    if (step === 1 && isValidStep1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    onAdd({
      name: name.trim(),
      gradeLevel,
      subjects: subjects.map(({ name, grade }) => ({ name: name || 'Untitled Subject', grade }))
    });
    onClose();
  };

  if (!isOpen) return null;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[560px] bg-white rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-200">

        <div className="relative z-10 px-8 pt-8 pb-6 flex items-center gap-5 border-b border-neutral-200">
          <div className="flex flex-1 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-neutral-200 overflow-hidden">
                <div className={`h-full w-full bg-primary-cardinal transition-transform duration-500 ease-out origin-left ${step >= i ? 'scale-x-100' : 'scale-x-0'}`} />
              </div>
            ))}
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-mutedBg text-neutral-500 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 flex-1 overflow-y-auto px-8 md:px-12 py-8 scrollbar-hide">
          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="text-center mb-10">
                <h2 className="text-3xl font-bold font-heading text-neutral-black mb-2">Add New Child</h2>
                <p className="text-neutral-500">Let's start with the basics</p>
              </div>
              <div className="flex flex-col items-center mb-8">
                <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center text-3xl font-bold font-heading transition-all duration-300 ${name.trim() ? 'bg-primary-cardinal text-white shadow-md' : 'bg-neutral-mutedBg text-neutral-400 border border-neutral-200'
                  }`}>
                  {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider ml-1">Name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emily" className="px-4 py-3.5 text-base placeholder-neutral-400" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-neutral-500 uppercase tracking-wider ml-1">Grade Level</label>
                  <Select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full">
                    <option value="" disabled>Select grade</option>
                    {SCHOOL_GRADES.map(g => (<option key={g} value={g}>{g}</option>))}
                  </Select>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-heading text-neutral-black mb-2">Enter Current Grades</h2>
                <p className="text-neutral-500">Grades determine the hourly earning rate</p>
              </div>
              <div className="mb-8 p-6 rounded-none bg-neutral-mutedBg border border-neutral-200 text-center relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Current Hourly Rate</p>
                  <div className="text-5xl leading-none font-bold font-heading text-primary-cardinal drop-shadow-sm">
                    {formatCurrency(totalHourlyRate)}
                  </div>
                </div>
              </div>
              <div className="space-y-4 mb-4">
                {subjects.map((sub, idx) => (
                  <div key={sub.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <Input value={sub.name} onChange={(e) => handleUpdateSubject(sub.id, 'name', e.target.value)} placeholder="Subject Name" className="flex-[2] px-4 py-3 text-base placeholder-neutral-400" />
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                      <div className="relative flex-1">
                        <Select value={sub.grade} onChange={(e) => handleUpdateSubject(sub.id, 'grade', e.target.value)} className="font-bold">
                          {LETTER_GRADES.map(g => (<option key={g} value={g}>{g} ({formatCurrency(DEFAULT_RATES[g as Grade])})</option>))}
                        </Select>
                      </div>
                      {subjects.length > 1 && (
                        <button onClick={() => handleRemoveSubject(sub.id)} className="w-11 h-11 flex items-center justify-center rounded-none border border-neutral-200 text-neutral-500 hover:bg-semantic-destructive/10 hover:text-semantic-destructive hover:border-semantic-destructive transition-colors cursor-pointer">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleAddSubject} className="w-full py-3 border border-dashed border-neutral-200 rounded-none text-neutral-500 hover:text-primary-cardinal hover:border-primary-cardinal hover:bg-primary-cardinal/5 transition-all flex items-center justify-center gap-2 mb-6 text-sm font-bold cursor-pointer uppercase tracking-wider">
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="animate-in zoom-in-95 fade-in duration-500 text-center">
              <div className="w-20 h-20 rounded-full bg-primary-success flex items-center justify-center mx-auto mb-6 shadow-md">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-3xl font-bold font-heading text-neutral-black mb-2">{name}'s Profile Ready!</h2>
              <div className="mb-8 p-6 rounded-none bg-neutral-mutedBg border border-neutral-200">
                <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest mb-2">Hourly Rate</p>
                <div className="text-5xl leading-none font-bold font-heading text-primary-cardinal">
                  {formatCurrency(totalHourlyRate)}
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 border border-neutral-200 bg-neutral-50/50 rounded-sm">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-full bg-primary-cardinal/10 text-primary-cardinal"><span className="text-neutral-500">Profile Security</span><span className="text-neutral-black font-bold">Child sets PIN via invite</span></div>
                <div className="flex justify-between px-4 py-3 border-b border-neutral-200"><span className="text-neutral-500">Grade Level</span><span className="text-neutral-black font-bold">{gradeLevel}</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 px-8 py-6 border-t border-neutral-200 bg-neutral-mutedBg">
          <div className="flex gap-4">
            {step > 1 && (<button onClick={handleBack} className="flex-1 py-4 rounded-none font-bold text-neutral-500 bg-white border border-neutral-200 hover:bg-neutral-100 transition-all cursor-pointer uppercase tracking-wider text-sm">Back</button>)}
            {step < 3 ? (
              <button onClick={handleNext} disabled={step === 1 && !isValidStep1} className={`flex-1 py-4 rounded-none font-bold text-white transition-all cursor-pointer uppercase tracking-wider text-sm ${(step === 1 && !isValidStep1) ? 'bg-neutral-200 text-neutral-500 cursor-not-allowed' : 'bg-primary-cardinal hover:bg-primary-cardinal/90 shadow-md'}`}>Next</button>
            ) : (
              <button onClick={handleFinish} className="flex-1 py-4 rounded-none font-bold text-white bg-primary-cardinal hover:bg-primary-cardinal/90 shadow-md transition-all cursor-pointer uppercase tracking-wider text-sm">Go to Dashboard</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddChildModal;
