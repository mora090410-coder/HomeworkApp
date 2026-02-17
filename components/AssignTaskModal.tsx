
import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ChoreCatalogItem } from '@/types';

export interface AssignTaskPayload {
  taskName: string;
  minutes: number;
  catalogItemId?: string;
  saveToCatalog?: boolean;
}

interface AssignTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  childName?: string;
  isOpenTask?: boolean;
  catalogItems?: ChoreCatalogItem[];
  initialTask?: { name: string; minutes: number };
  onAssign: (payload: AssignTaskPayload) => void;
}

const QUICK_TIMES = [15, 30, 45, 60];

const AssignTaskModal: React.FC<AssignTaskModalProps> = ({
  isOpen,
  onClose,
  childName,
  isOpenTask,
  catalogItems = [],
  initialTask,
  onAssign,
}) => {
  const [taskName, setTaskName] = useState('');
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState('');
  const [saveToCatalog, setSaveToCatalog] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialTask) {
        setTaskName(initialTask.name);
        setSelectedMinutes(initialTask.minutes);
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
      setSelectedCatalogItemId('');
      setSaveToCatalog(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, initialTask]);

  const handleQuickTimeClick = (mins: number): void => {
    setSelectedMinutes(mins);
    setIsCustomTime(false);
  };

  const handleCustomTimeToggle = (): void => {
    const shouldShowCustom = !isCustomTime;
    setIsCustomTime(shouldShowCustom);
    setSelectedMinutes(shouldShowCustom ? customMinutes : null);
  };

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const minutes = Number.parseInt(event.target.value, 10);
    setCustomMinutes(minutes);
    setSelectedMinutes(minutes);
  };

  const handleCatalogSelection = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    const catalogItemId = event.target.value;
    setSelectedCatalogItemId(catalogItemId);

    if (!catalogItemId) {
      return;
    }

    const item = catalogItems.find((catalogEntry) => catalogEntry.id === catalogItemId);
    if (!item) {
      return;
    }

    setTaskName(item.name);
    setSelectedMinutes(item.baselineMinutes);
    if (!QUICK_TIMES.includes(item.baselineMinutes)) {
      setIsCustomTime(true);
      setCustomMinutes(item.baselineMinutes);
    } else {
      setIsCustomTime(false);
    }
  };

  const handleSubmit = (): void => {
    if (!taskName.trim() || !selectedMinutes || selectedMinutes <= 0) {
      return;
    }

    onAssign({
      taskName: taskName.trim(),
      minutes: selectedMinutes,
      catalogItemId: selectedCatalogItemId || undefined,
      saveToCatalog: Boolean(saveToCatalog && !selectedCatalogItemId),
    });
    onClose();
  };

  const isValid = taskName.trim().length > 0 && selectedMinutes !== null && selectedMinutes > 0;
  const isEditing = Boolean(initialTask);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans text-white">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] glass-dark rounded-[28px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' /%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' /%3E%3C/svg%3E")',
          }}
        />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-20 cursor-pointer"
          aria-label="Close assign task modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative z-10 p-8 md:px-12 md:py-10 overflow-y-auto scrollbar-hide">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-[1.75rem] font-[590] text-white mb-2 leading-tight">
              {isEditing ? 'Edit Task' : isOpenTask ? 'Create Open Task' : `Assign Task to ${childName}`}
            </h2>
            <p className="text-[0.9375rem] text-gray-400">
              {isEditing
                ? 'Update task details'
                : isOpenTask
                  ? 'Available for any child to claim'
                  : 'Create a new chore with baseline completion time'}
            </p>
          </div>

          {catalogItems.length > 0 && (
            <div className="mb-8">
              <label
                htmlFor="catalogItem"
                className="block text-[0.9375rem] font-[510] text-gray-400 mb-3 ml-1"
              >
                Household Chore Catalog
              </label>
              <select
                id="catalogItem"
                value={selectedCatalogItemId}
                onChange={handleCatalogSelection}
                className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-base outline-none focus:bg-white/10 focus:border-primary-400/50 [&>option]:bg-gray-950"
                aria-label="Choose a chore template"
              >
                <option value="">
                  One-off task (not from catalog)
                </option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.baselineMinutes} min)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-8">
            <label htmlFor="taskName" className="block text-[0.9375rem] font-[510] text-gray-400 mb-3 ml-1">
              Task Name
            </label>
            <input
              id="taskName"
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder={
                isOpenTask
                  ? 'e.g., Wash Car, Mow Lawn, Water Plants'
                  : 'e.g., Clean Room, Do Homework, Take Out Trash'
              }
              className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-base placeholder-gray-600 outline-none focus:bg-white/10 focus:border-primary-400/50"
              autoFocus
              aria-label="Task name"
            />
          </div>

          <div className="mb-8">
            <label className="block text-[0.9375rem] font-[510] text-gray-400 mb-3 ml-1">Baseline Time</label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {QUICK_TIMES.map((minutes) => {
                const isSelected = !isCustomTime && selectedMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    onClick={() => handleQuickTimeClick(minutes)}
                    className={`py-3.5 rounded-xl text-[0.9375rem] font-[510] transition-all duration-200 border cursor-pointer ${isSelected
                        ? 'bg-gradient-to-r from-primary-700/20 to-primary-500/20 border-primary-500/40 text-primary-400'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                    aria-label={`Set baseline time to ${minutes} minutes`}
                  >
                    {minutes} min
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCustomTimeToggle}
              className={`w-full py-3.5 rounded-xl text-[0.9375rem] font-[510] transition-all duration-200 border mb-4 cursor-pointer ${isCustomTime
                  ? 'bg-gradient-to-r from-primary-700/20 to-primary-500/20 border-primary-500/40 text-primary-400'
                  : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white'
                }`}
              aria-label="Toggle custom baseline time"
            >
              Custom Time
            </button>

            {isCustomTime && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 pt-2 px-1">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Select minutes</span>
                  <span className="text-[1.25rem] font-bold bg-gradient-to-r from-primary-700 to-primary-500 text-transparent bg-clip-text">
                    {customMinutes} min
                  </span>
                </div>

                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={customMinutes}
                  onChange={handleSliderChange}
                  className="w-full h-1.5 bg-gradient-to-r from-primary-700/30 to-primary-500/30 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-r [&::-webkit-slider-thumb]:from-primary-700 [&::-webkit-slider-thumb]:to-primary-500"
                  aria-label="Custom baseline minutes"
                />
              </div>
            )}
          </div>

          {!selectedCatalogItemId && (
            <label className="mb-8 flex items-center gap-3 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={saveToCatalog}
                onChange={(event) => setSaveToCatalog(event.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/5"
                aria-label="Save this one-off task to the household chore catalog"
              />
              Save this one-off task to household catalog
            </label>
          )}

          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={`w-full py-4 rounded-xl font-[510] text-[1.0625rem] transition-all duration-200 cursor-pointer ${isValid
                ? 'bg-gradient-to-r from-primary-700 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-0.5 active:scale-[0.98]'
                : 'bg-white/5 text-white/40 cursor-not-allowed opacity-60'
              }`}
            aria-label="Submit task"
          >
            {isEditing ? 'Save Changes' : isOpenTask ? 'Create Task' : 'Assign Task'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignTaskModal;
