
import React, { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { ChoreCatalogItem } from '@/types';
import { Input } from '@/src/components/ui/Input';

export interface AssignTaskPayload {
  taskName: string;
  minutes: number;
  catalogItemId?: string;
  saveToCatalog?: boolean;
  valueCents?: number;
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
  const [taskName, setTaskName] = React.useState(initialTask?.name ?? '');
  const [minutes, setMinutes] = React.useState(initialTask?.minutes ?? 15);
  const [taskValueCents, setTaskValueCents] = React.useState<number | undefined>(undefined);
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = React.useState<string | undefined>(undefined);
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
      valueCents: taskValueCents,
    });
    onClose();
  };

  const isValid = taskName.trim().length > 0 && selectedMinutes !== null && selectedMinutes > 0;
  const isEditing = Boolean(initialTask);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] bg-white rounded-none shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-200">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-50 text-neutral-500 transition-colors z-20"
          aria-label="Close assign task modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 p-8 md:px-12 md:py-10 overflow-y-auto scrollbar-hide">
          <div className="mb-10 text-center md:text-left">
            <h2 className="text-3xl font-bold font-heading text-neutral-black mb-2 leading-tight">
              {isEditing ? 'Edit Task' : isOpenTask ? 'Create Open Task' : `Assign Task to ${childName}`}
            </h2>
            <p className="text-base text-neutral-500">
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
                className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3"
              >
                Household Chore Catalog
              </label>
              <select
                id="catalogItem"
                value={selectedCatalogItemId}
                onChange={handleCatalogSelection}
                className="w-full px-4 py-3.5 rounded-none bg-white border border-neutral-200 text-neutral-black text-base outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent transition-all"
                aria-label="Choose a chore template"
              >
                <option value="">One-off task (not from catalog)</option>
                {catalogItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.baselineMinutes} min)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-8">
            <label htmlFor="taskName" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
              Task Name
            </label>
            <Input
              id="taskName"
              type="text"
              value={taskName}
              onChange={(event) => setTaskName(event.target.value)}
              placeholder={
                isOpenTask
                  ? 'e.g., Wash Car, Mow Lawn, Water Plants'
                  : 'e.g., Clean Room, Do Homework, Take Out Trash'
              }
              className="px-4 py-3.5 text-base placeholder-neutral-400 rounded-none bg-white border border-neutral-200 outline-none focus:ring-2 focus:ring-primary-gold focus:border-transparent transition-all"
              autoFocus
              aria-label="Task name"
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">Baseline Time</label>
            <div className="grid grid-cols-4 gap-3 mb-3">
              {QUICK_TIMES.map((minutes) => {
                const isSelected = !isCustomTime && selectedMinutes === minutes;
                return (
                  <button
                    key={minutes}
                    onClick={() => handleQuickTimeClick(minutes)}
                    className={`py-3.5 rounded-none text-sm font-bold transition-all duration-200 border cursor-pointer ${isSelected
                      ? 'bg-primary-cardinal border-primary-cardinal text-white shadow-sm'
                      : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-black'
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
              className={`w-full py-3.5 rounded-none text-sm font-bold transition-all duration-200 border mb-4 cursor-pointer ${isCustomTime
                ? 'bg-primary-cardinal border-primary-cardinal text-white shadow-sm'
                : 'bg-white border-neutral-200 text-neutral-500 hover:bg-neutral-50 hover:text-neutral-black'
                }`}
              aria-label="Toggle custom baseline time"
            >
              Custom Time
            </button>

            {isCustomTime && (
              <div className="animate-in slide-in-from-top-4 fade-in duration-300 pt-2 px-1">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-neutral-darkGray uppercase tracking-wider">Select minutes</span>
                  <span className="text-xl font-bold text-primary-cardinal">
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
                  aria-label="Custom baseline minutes"
                />
              </div>
            )}
          </div>

          <div className="mb-8">
            <label htmlFor="taskValue" className="block text-sm font-bold text-neutral-500 uppercase tracking-wider mb-3">
              Value ($) <span className="text-neutral-400 font-normal normal-case">(Optional)</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-neutral-500">$</span>
              </div>
              <input
                id="taskValue"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={taskValueCents !== undefined ? (taskValueCents / 100).toString() : ''}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setTaskValueCents(Number.isNaN(val) ? undefined : Math.round(val * 100));
                }}
                className="w-full pl-7 pr-4 py-3.5 rounded-none border border-neutral-200 bg-white text-neutral-black placeholder-neutral-200 focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/10 transition-all font-sans outline-none"
              />
            </div>
          </div>

          {!selectedCatalogItemId && (
            <label className="mb-8 flex items-center gap-3 text-sm text-neutral-500 cursor-pointer group">
              <input
                type="checkbox"
                checked={saveToCatalog}
                onChange={(event) => setSaveToCatalog(event.target.checked)}
                className="h-4 w-4 rounded-sm border-neutral-200 text-primary-cardinal focus:ring-primary-gold"
                aria-label="Save this one-off task to the household chore catalog"
              />
              <span className="group-hover:text-neutral-black transition-colors">Save to household catalog</span>
            </label>
          )}

          <div className="pt-4">
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`w-full py-4 rounded-none font-bold text-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 ${isValid
                ? 'bg-primary-cardinal text-white shadow-md hover:shadow-lg hover:-translate-y-0.5'
                : 'bg-neutral-200 text-neutral-500 cursor-not-allowed opacity-70'
                }`}
              aria-label="Submit task"
            >
              <Check className="w-5 h-5" />
              {isEditing ? 'Save Changes' : isOpenTask ? 'Create Task' : 'Assign Task'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignTaskModal;
