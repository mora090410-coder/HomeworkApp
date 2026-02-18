
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
      <div className="relative w-full max-w-lg bg-white border border-neutral-lightGray rounded-none shadow-2xl overflow-hidden animate-in slide-in-from-bottom-10 md:slide-in-from-bottom-5 duration-200">
        <div className="p-6 md:p-8 border-b border-neutral-lightGray flex items-center justify-between bg-white">
          <h3 className="text-2xl font-bold font-heading text-neutral-black">{title}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-neutral-mutedBg text-neutral-darkGray transition-colors"
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