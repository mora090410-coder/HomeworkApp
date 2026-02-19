import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Task, Child } from '../types';
import { Clock, MoreVertical, Trash2, Edit2, UserPlus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { getTaskIcon, formatCurrency, centsToDollars } from '../utils';

interface OpenTaskCardProps {
  task: Task;
  children: Child[];
  onAssign: (taskId: string, childId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
}

const OpenTaskCard: React.FC<OpenTaskCardProps> = ({
  task,
  children,
  onAssign,
  onEdit,
  onDelete
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAssignSubmenu, setShowAssignSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
        setShowAssignSubmenu(false);
      }
    };

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleAssignClick = (e: React.MouseEvent, childId: string) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setShowAssignSubmenu(false);
    onAssign(task.id, childId);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    setShowAssignSubmenu(false);
    onEdit(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();

    // Close menus immediately for instant feedback
    setIsMenuOpen(false);
    setShowAssignSubmenu(false);

    // Notify parent to start confirmation flow
    onDelete(task.id);
  };

  const toggleAssignSubmenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowAssignSubmenu(!showAssignSubmenu);
  };

  const isBounty = useMemo(() => {
    if (!task.createdAt) return false;
    const created = new Date(task.createdAt).getTime();
    const now = new Date().getTime();
    return (now - created) > (24 * 60 * 60 * 1000); // 24 hours
  }, [task.createdAt]);

  return (
    <div className={`flex flex-col p-6 bg-white/40 backdrop-blur-xl border-white/50 shadow-sm relative overflow-visible transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 ${isBounty ? 'ring-2 ring-amber-100/50' : ''}`}>
      {isBounty && (
        <div className="absolute top-0 right-0 z-10">
          <div className="bg-amber-100/80 backdrop-blur-md text-amber-900 text-[8px] font-black uppercase tracking-[0.3em] px-4 py-1.5 shadow-sm border-l border-b border-amber-200/50 rounded-bl-xl">
            Priority Bounty
          </div>
        </div>
      )}

      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" role="img" aria-label="task icon">
            {getTaskIcon(task.name)}
          </span>
          <div>
            <h3 className="text-lg font-heading font-bold text-neutral-900 leading-tight">{task.name}</h3>
            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5 font-mono">
              <Clock className="w-3 h-3 opacity-40" />
              {task.baselineMinutes} MIN BASELINE
            </p>
          </div>
        </div>

        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
              setShowAssignSubmenu(false);
            }}
            className="w-8 h-8 p-0 text-neutral-darkGray hover:text-neutral-black border border-neutral-100 rounded-full flex items-center justify-center"
          >
            <MoreVertical className="w-4 h-4" />
          </Button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-neutral-lightGray rounded-none shadow-xl z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleAssignSubmenu}
                    className={`w-full text-left px-3 py-2.5 rounded-none text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${showAssignSubmenu ? 'bg-neutral-lightGray/10 text-neutral-black' : 'text-neutral-darkGray hover:bg-neutral-lightGray/10 hover:text-neutral-black'}`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Assign to Child
                    </div>
                    <ChevronRight className={`w-3 h-3 transition-transform ${showAssignSubmenu ? 'rotate-90' : ''}`} />
                  </button>

                  {showAssignSubmenu && (
                    <div
                      className="absolute left-full top-0 w-44 bg-white border border-neutral-lightGray rounded-none shadow-xl overflow-hidden z-[60] ml-1 animate-in slide-in-from-left-2 duration-200"
                    >
                      {children.length > 0 ? children.map(child => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={(e) => handleAssignClick(e, child.id)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-neutral-darkGray hover:bg-neutral-lightGray/10 hover:text-neutral-black truncate cursor-pointer"
                        >
                          {child.name}
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-xs text-neutral-darkGray italic">No children found</div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEditClick}
                  className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-neutral-darkGray hover:bg-neutral-lightGray/10 hover:text-neutral-black flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Baseline
                </button>

                <div className="h-px bg-neutral-100 my-1" />

                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-full text-left px-3 py-2.5 rounded-none text-sm font-medium text-semantic-destructive hover:bg-neutral-lightGray/10 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mt-auto pt-4">
        <div className="flex items-center gap-1.5 text-neutral-darkGray">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[0.875rem] font-medium font-sans">{task.baselineMinutes} min baseline</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mb-1.5">Value</span>
          <span className={`px-4 py-2 rounded-xl text-sm font-mono font-bold tracking-tighter shadow-sm ${isBounty ? 'bg-amber-100/50 text-amber-900 border border-amber-200/50' : 'bg-neutral-900 text-white'}`}>
            <span className="text-[10px] opacity-40 mr-0.5">$</span>
            {task.valueCents ? (task.valueCents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default OpenTaskCard;
