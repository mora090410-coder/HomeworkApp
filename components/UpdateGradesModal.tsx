
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, ChevronDown, Check } from 'lucide-react';
import { Child, Grade, Subject } from '../types';
import { DEFAULT_RATES } from '../constants';
import { calculateHourlyRate, formatCurrency } from '../utils';

interface UpdateGradesModalProps {
  isOpen: boolean;
  onClose: () => void;
  child: Child | null;
  onSave: (childId: string, updatedSubjects: Subject[]) => void;
}

const GRADE_OPTIONS: Grade[] = [
  Grade.A_PLUS, Grade.A, Grade.A_MINUS,
  Grade.B_PLUS, Grade.B, Grade.B_MINUS,
  Grade.C_PLUS, Grade.C, Grade.C_MINUS,
  Grade.D, Grade.F
];

const UpdateGradesModal: React.FC<UpdateGradesModalProps> = ({ isOpen, onClose, child, onSave }) => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Initialize state when child changes or modal opens
  useEffect(() => {
    if (child) {
      setSubjects(JSON.parse(JSON.stringify(child.subjects))); // Deep copy
    }
  }, [child, isOpen]);

  // Handle outside click to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdownId(null);
      }
    };

    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  const currentHourlyRate = useMemo(() => {
    if (!child) return 0;
    return calculateHourlyRate(subjects, child.rates || DEFAULT_RATES);
  }, [subjects, child]);

  const handleGradeChange = (subjectId: string, newGrade: Grade) => {
    setSubjects(prev => prev.map(s => 
      s.id === subjectId ? { ...s, grade: newGrade } : s
    ));
    setOpenDropdownId(null);
  };

  const handleSave = () => {
    if (child) {
      onSave(child.id, subjects);
      onClose();
    }
  };

  if (!isOpen || !child) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300" 
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] bg-[#1a1a1a] rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/[0.06]">
        
        {/* Noise Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
             style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}>
        </div>

        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-20"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Scrollable Content */}
        <div className="relative z-10 overflow-y-auto px-8 md:px-12 py-10 scrollbar-hide">
          
          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-[1.75rem] font-[590] text-white mb-2">Update Grades</h2>
            <p className="text-[0.9375rem] text-[#888]">Current grades determine hourly earning rate</p>
          </div>

          {/* Live Rate Display */}
          <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-[#990000]/10 to-[#FFCC00]/10 border border-[#FFCC00]/30 text-center relative overflow-hidden group transition-all duration-300">
             <div className="relative z-10">
               <p className="text-xs font-bold text-[#999] uppercase tracking-widest mb-2">Current Hourly Rate</p>
               <div className="text-[2.5rem] leading-none font-[590] bg-gradient-to-r from-[#990000] via-[#FFCC00] to-[#FFCC00] text-transparent bg-clip-text drop-shadow-sm transition-all duration-300">
                  {formatCurrency(currentHourlyRate)}
               </div>
             </div>
             <div className="absolute inset-0 bg-[#FFCC00]/5 blur-xl opacity-50"></div>
          </div>

          {/* Subject List */}
          <div className="space-y-4 pb-24">
            {subjects.map((subject) => (
              <div 
                key={subject.id} 
                className="flex items-center justify-between bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.12] rounded-xl p-4 transition-colors group"
              >
                <span className="text-base font-[480] text-white">{subject.name}</span>
                
                <div className="relative" ref={openDropdownId === subject.id ? dropdownRef : null}>
                  <button
                    onClick={() => setOpenDropdownId(openDropdownId === subject.id ? null : subject.id)}
                    className={`
                      min-w-[80px] px-5 py-2.5 rounded-lg border flex items-center justify-between gap-3 transition-all duration-200
                      ${openDropdownId === subject.id 
                        ? 'bg-[#FFCC00]/20 border-[#FFCC00]/40 text-[#FFCC00]' 
                        : 'bg-white/[0.06] border-white/10 text-white hover:bg-white/10 hover:border-[#FFCC00]/30'
                      }
                    `}
                  >
                    <span className="text-lg font-[590]">{subject.grade}</span>
                    <ChevronDown className={`w-3.5 h-3.5 opacity-60 transition-transform ${openDropdownId === subject.id ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown */}
                  {openDropdownId === subject.id && (
                    <div className="absolute top-full right-0 mt-2 w-32 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                      <div className="max-h-[240px] overflow-y-auto py-1 scrollbar-hide">
                        {GRADE_OPTIONS.map((grade) => (
                          <button
                            key={grade}
                            onClick={() => handleGradeChange(subject.id, grade)}
                            className={`
                              w-full px-4 py-2.5 text-center text-sm font-bold transition-colors
                              ${subject.grade === grade 
                                ? 'bg-[#FFCC00]/15 text-[#FFCC00]' 
                                : 'text-[#888] hover:bg-white/5 hover:text-white'
                              }
                            `}
                          >
                            {grade}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

        </div>

        {/* Footer Actions */}
        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-[#1a1a1a] via-[#1a1a1a] to-transparent pt-12">
           <button 
             onClick={handleSave}
             className="w-full py-4 rounded-xl font-[510] text-[1.0625rem] text-white bg-gradient-to-r from-[#990000] to-[#FFCC00] shadow-lg hover:shadow-[0_8px_24px_rgba(153,0,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200"
           >
             Save Changes
           </button>
        </div>

      </div>
    </div>
  );
};

export default UpdateGradesModal;
