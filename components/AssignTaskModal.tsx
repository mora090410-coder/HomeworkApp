
import React, { useState, useEffect } from 'react';
import { X, Clock } from 'lucide-react';

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
  isOpenTask?: boolean;
  initialTask?: { name: string, minutes: number };
  onAssign: (taskName: string, minutes: number) => void;
}

const QUICK_TIMES = [15, 30, 45, 60];

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({ isOpen, onClose, childName, isOpenTask, initialTask, onAssign }) => {
  const [taskName, setTaskName] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(30);

  // Reset state when opening or when initialTask changes
  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTaskName(initialTask.name);
        setSelectedMinutes(initialTask.minutes);
        // Check if it matches a quick time
        if (!QUICK_TIMES.includes(initialTask.minutes)) {
           setIsCustomTime(true);
           setCustomMinutes(initialTask.minutes);
        } else {
           setIsCustomTime(false);
        }
      } else {
        setTaskName('');
        setSelectedMinutes(null);
        setIsCustomTime(false);
        setCustomMinutes(30);
      }
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialTask]);

  const handleQuickTimeClick = (mins: number) => {
    setSelectedMinutes(mins);
    setIsCustomTime(false);
  };

  const handleCustomTimeToggle = () => {
    setIsCustomTime(!isCustomTime);
    if (!isCustomTime) {
      setSelectedMinutes(customMinutes);
    } else {
      setSelectedMinutes(null);
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setCustomMinutes(val);
    setSelectedMinutes(val);
  };

  const handleSubmit = () => {
    if (taskName.trim() && selectedMinutes && selectedMinutes > 0) {
      onAssign(taskName.trim(), selectedMinutes);
      onClose();
    }
  };

  const isValid = taskName.trim().length > 0 && selectedMinutes !== null && selectedMinutes > 0;
  const isEditing = !!initialTask;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300" 
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

        <div className="relative z-10 p-8 md:px-12 md:py-10 overflow-y-auto scrollbar-hide">
          
          {/* Header */}
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-[1.75rem] font-[590] text-white mb-2 leading-tight">
              {isEditing ? 'Edit Task' : (isOpenTask ? 'Create Open Task' : `Assign Task to ${childName}`)}
            </h2>
            <p className="text-[0.9375rem] text-[#888]">
              {isEditing ? 'Update task details' : (isOpenTask ? 'Available for any child to claim' : 'Create a new chore with baseline completion time')}
            </p>
          </div>

          {/* Field 1: Task Name */}
          <div className="mb-8">
            <label className="block text-[0.9375rem] font-[510] text-[#999] mb-3 ml-1">Task Name</label>
            <input 
              type="text" 
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder={isOpenTask ? "e.g., Wash Car, Mow Lawn, Water Plants" : "e.g., Clean Room, Do Homework, Take Out Trash"}
              className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-base placeholder-[#555] outline-none focus:bg-white/[0.06] focus:border-[#FFCC00]/40 focus:shadow-[0_0_12px_rgba(255,204,0,0.15)] transition-all duration-200"
              autoFocus
            />
          </div>

          {/* Field 2: Baseline Time */}
          <div className="mb-10">
            <label className="block text-[0.9375rem] font-[510] text-[#999] mb-3 ml-1">Baseline Time</label>
            
            {/* Quick Buttons */}
            <div className="grid grid-cols-4 gap-3 mb-3">
              {QUICK_TIMES.map(mins => {
                const isSelected = !isCustomTime && selectedMinutes === mins;
                return (
                  <button
                    key={mins}
                    onClick={() => handleQuickTimeClick(mins)}
                    className={`
                      py-3.5 rounded-xl text-[0.9375rem] font-[510] transition-all duration-200 border
                      ${isSelected 
                        ? 'bg-gradient-to-r from-[#990000]/20 to-[#FFCC00]/20 border-[#FFCC00]/40 text-[#FFCC00] shadow-[0_0_15px_rgba(255,204,0,0.1)]' 
                        : 'bg-white/[0.04] border-white/[0.08] text-[#888] hover:bg-white/[0.08] hover:text-white'
                      }
                    `}
                  >
                    {mins} min
                  </button>
                );
              })}
            </div>

            {/* Custom Time Button */}
            <button
              onClick={handleCustomTimeToggle}
              className={`
                w-full py-3.5 rounded-xl text-[0.9375rem] font-[510] transition-all duration-200 border mb-4
                ${isCustomTime 
                  ? 'bg-gradient-to-r from-[#990000]/20 to-[#FFCC00]/20 border-[#FFCC00]/40 text-[#FFCC00]' 
                  : 'bg-white/[0.04] border-white/[0.08] text-[#888] hover:bg-white/[0.08] hover:text-white'
                }
              `}
            >
              Custom Time
            </button>

            {/* Custom Slider Section */}
            {isCustomTime && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 pt-2 px-1">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-[#666] uppercase tracking-wider">Select minutes</span>
                  <span className="text-[1.25rem] font-bold bg-gradient-to-r from-[#990000] to-[#FFCC00] text-transparent bg-clip-text">
                    {customMinutes} min
                  </span>
                </div>
                
                <div className="relative h-10 flex items-center">
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5" 
                    value={customMinutes} 
                    onChange={handleSliderChange}
                    className="w-full h-1.5 bg-gradient-to-r from-[#990000]/30 to-[#FFCC00]/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-[#990000] [&::-webkit-slider-thumb]:to-[#FFCC00] [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                  />
                </div>
                
                <div className="flex justify-between text-[0.75rem] text-[#666] font-medium px-1">
                  <span>5 min</span>
                  <span>60 min</span>
                  <span>120 min</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button 
            onClick={handleSubmit}
            disabled={!isValid}
            className={`
              w-full py-4 rounded-xl font-[510] text-[1.0625rem] transition-all duration-200
              ${isValid 
                ? 'bg-gradient-to-r from-[#990000] to-[#FFCC00] text-white shadow-lg hover:shadow-[0_8px_24px_rgba(153,0,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98]' 
                : 'bg-[#333] text-white/40 cursor-not-allowed opacity-60'
              }
            `}
          >
            {isEditing ? 'Save Changes' : (isOpenTask ? 'Create Task' : 'Assign Task')}
          </button>

        </div>
      </div>
    </div>
  );
};

export default AssignTaskModal;
