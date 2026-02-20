
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-surface dark:bg-elev-1 border border-border-base rounded-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-5 duration-200 transition-colors">
        <div className="flex items-center justify-between border-b border-border-base px-6 py-4">
          <h2 className="text-xl font-bold font-heading text-primary">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-surface-2 dark:hover:bg-white/5 text-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 md:p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;