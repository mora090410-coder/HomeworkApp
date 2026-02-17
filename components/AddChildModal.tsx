
import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, Check, Plus, Trash2 } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-white">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[560px] glass-dark rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}>
        </div>
        <div className="relative z-10 px-8 pt-8 pb-4 flex items-center gap-5">
          <div className="flex flex-1 gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-1.5 flex-1 rounded-full bg-white/10 overflow-hidden">
                <div className={`h-full w-full bg-gradient-to-r from-primary-700 to-primary-500 transition-transform duration-500 ease-out origin-left ${step >= i ? 'scale-x-100' : 'scale-x-0'}`} />
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all shrink-0 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="relative z-10 flex-1 overflow-y-auto px-8 md:px-12 py-4 scrollbar-hide">
          {step === 1 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="text-center mb-10">
                <h2 className="text-[1.75rem] font-[590] text-white mb-2">Add New Child</h2>
                <p className="text-gray-400">Let's start with the basics</p>
              </div>
              <div className="flex flex-col items-center mb-8">
                <div className={`w-[80px] h-[80px] rounded-full flex items-center justify-center text-3xl font-bold transition-all duration-300 ${name.trim() ? 'bg-gradient-to-br from-primary-700/20 to-primary-500/20 text-primary-400 border border-primary-500/30 shadow-lg' : 'bg-white/5 text-gray-500 border border-white/10'
                  }`}>
                  {name.trim() ? name.trim().charAt(0).toUpperCase() : '?'}
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[0.9375rem] font-[510] text-gray-400 ml-1">Name</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emily" className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all placeholder:text-gray-600" autoFocus />
                </div>
                <div className="space-y-2">
                  <label className="text-[0.9375rem] font-[510] text-gray-400 ml-1">Grade Level</label>
                  <div className="relative">
                    <select value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white appearance-none outline-none focus:border-primary-400/50 transition-all cursor-pointer [&>option]:bg-gray-950">
                      <option value="" disabled>Select grade</option>
                      {SCHOOL_GRADES.map(g => (<option key={g} value={g}>{g}</option>))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="animate-in slide-in-from-right-8 fade-in duration-300">
              <div className="text-center mb-8">
                <h2 className="text-[1.75rem] font-[590] text-white mb-2">Enter Current Grades</h2>
                <p className="text-gray-400">Grades determine the hourly earning rate</p>
              </div>
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary-700/10 to-primary-500/10 border border-primary-500/30 text-center relative overflow-hidden group">
                <div className="relative z-10">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Current Hourly Rate</p>
                  <div className="text-[2.5rem] leading-none font-bold bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 text-transparent bg-clip-text drop-shadow-sm">
                    {formatCurrency(totalHourlyRate)}
                  </div>
                </div>
                <div className="absolute inset-0 bg-primary-500/5 blur-xl group-hover:bg-primary-500/10 transition-all duration-500"></div>
              </div>
              <div className="space-y-4 mb-4">
                {subjects.map((sub, idx) => (
                  <div key={sub.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    <input type="text" value={sub.name} onChange={(e) => handleUpdateSubject(sub.id, 'name', e.target.value)} placeholder="Subject Name" className="flex-[2] w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white outline-none focus:border-primary-400/50 transition-all placeholder:text-gray-600" />
                    <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
                      <div className="relative flex-1">
                        <select value={sub.grade} onChange={(e) => handleUpdateSubject(sub.id, 'grade', e.target.value)} className="w-full pl-4 pr-8 py-3 rounded-xl bg-white/5 border border-white/10 text-white appearance-none outline-none focus:border-primary-400/50 cursor-pointer font-bold [&>option]:bg-gray-950">
                          {LETTER_GRADES.map(g => (<option key={g} value={g}>{g} ({formatCurrency(DEFAULT_RATES[g as Grade])})</option>))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                      </div>
                      {subjects.length > 1 && (
                        <button onClick={() => handleRemoveSubject(sub.id)} className="w-11 h-11 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer">
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={handleAddSubject} className="w-full py-3 border border-dashed border-white/20 rounded-xl text-gray-400 hover:text-primary-400 hover:border-primary-400/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2 mb-6 text-sm font-medium cursor-pointer">
                <Plus className="w-4 h-4" /> Add Subject
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="animate-in zoom-in-95 fade-in duration-500 text-center">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-700 to-primary-500 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary-500/20">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-[1.75rem] font-[590] text-white mb-2">{name}'s Profile Ready!</h2>
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-primary-700/10 to-primary-500/10 border border-primary-500/30">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Hourly Rate</p>
                <div className="text-[2.5rem] leading-none font-bold bg-gradient-to-r from-primary-700 via-primary-500 to-primary-400 text-transparent bg-clip-text">
                  {formatCurrency(totalHourlyRate)}
                </div>
              </div>
              <div className="bg-white/[0.02] rounded-xl border border-white/[0.06] overflow-hidden text-sm">
                <div className="flex justify-between px-4 py-3 border-b border-white/[0.04]"><span className="text-gray-400">Profile Security</span><span className="text-white font-medium">Child sets PIN via invite</span></div>
                <div className="flex justify-between px-4 py-3 border-b border-white/[0.04]"><span className="text-gray-400">Grade Level</span><span className="text-white font-medium">{gradeLevel}</span></div>
              </div>
            </div>
          )}
        </div>
        <div className="relative z-10 px-8 py-6 border-t border-white/10 bg-black/20">
          <div className="flex gap-4">
            {step > 1 && (<button onClick={handleBack} className="flex-1 py-4 rounded-xl font-bold text-gray-400 bg-white/5 hover:bg-white/10 transition-all cursor-pointer">Back</button>)}
            {step < 3 ? (
              <button onClick={handleNext} disabled={step === 1 && !isValidStep1} className={`flex-1 py-4 rounded-xl font-bold text-white transition-all cursor-pointer ${(step === 1 && !isValidStep1) ? 'bg-white/5 text-white/40 cursor-not-allowed' : 'bg-gradient-to-r from-primary-700 to-primary-500 hover:scale-[1.02] shadow-lg shadow-primary-500/20'}`}>Next</button>
            ) : (
              <button onClick={handleFinish} className="flex-1 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-primary-700 to-primary-500 shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-all cursor-pointer">Go to Dashboard</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddChildModal;
