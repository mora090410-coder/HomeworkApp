
import React, { useState, useRef, useEffect } from 'react';
import { Task, Child } from '../types';
import { Clock, MoreVertical, Trash2, Edit2, UserPlus, ChevronRight } from 'lucide-react';
import { getTaskIcon } from '../utils';

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

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-[16px] p-5 hover:bg-white/[0.04] transition-colors group relative overflow-visible">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-2.5">
          <span className="text-[1.25rem] leading-none mt-0.5">
            {getTaskIcon(task.name)}
          </span>
          <span className="text-[1.0625rem] font-[510] text-white leading-tight">
            {task.name}
          </span>
        </div>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
              setShowAssignSubmenu(false);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {isMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 glass-dark border border-white/10 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.5)] z-50 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-1">
                <div className="relative">
                  <button
                    type="button"
                    onClick={toggleAssignSubmenu}
                    onMouseEnter={() => setShowAssignSubmenu(true)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between gap-2 transition-colors cursor-pointer ${showAssignSubmenu ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="w-4 h-4" />
                      Assign to Child
                    </div>
                    <ChevronRight className={`w-3 h-3 transition-transform ${showAssignSubmenu ? 'rotate-90' : ''}`} />
                  </button>

                  {showAssignSubmenu && (
                    <div
                      className="absolute left-full top-0 w-44 glass-dark border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[60] ml-1 animate-in slide-in-from-left-2 duration-200"
                      onMouseLeave={() => setShowAssignSubmenu(false)}
                    >
                      {children.length > 0 ? children.map(child => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={(e) => handleAssignClick(e, child.id)}
                          className="w-full text-left px-4 py-3 text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white truncate cursor-pointer"
                        >
                          {child.name}
                        </button>
                      )) : (
                        <div className="px-4 py-3 text-xs text-gray-500 italic">No children found</div>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleEditClick}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-white/5 hover:text-white flex items-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Baseline
                </button>

                <div className="h-px bg-white/5 my-1" />

                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Task
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span className="text-[0.875rem] font-medium">{task.baselineMinutes} min baseline</span>
        </div>

        <span className="px-2.5 py-1 rounded-full bg-blue-400/10 text-blue-300 text-[0.75rem] font-[510] uppercase tracking-wider border border-blue-400/20">
          Available
        </span>
      </div>
    </div>
  );
};

export default OpenTaskCard;
