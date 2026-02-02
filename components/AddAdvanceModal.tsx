
import React, { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { Child, AdvanceCategory } from '../types';

interface AddAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  childrenData: Child[];
  initialChildId?: string;
  onAdd: (childId: string, amount: number, category: AdvanceCategory, memo: string) => void;
}

const CATEGORIES: AdvanceCategory[] = [
  'Food/Drinks',
  'Entertainment',
  'Clothes',
  'School Supplies',
  'Toys/Games',
  'Other'
];

const AddAdvanceModal: React.FC<AddAdvanceModalProps> = ({
  isOpen,
  onClose,
  childrenData,
  initialChildId,
  onAdd
}) => {
  const [childId, setChildId] = useState(initialChildId || (childrenData[0]?.id || ''));
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<AdvanceCategory>('Food/Drinks');
  const [memo, setMemo] = useState('');

  // Reset/Init state
  useEffect(() => {
    if (isOpen) {
      if (initialChildId) setChildId(initialChildId);
      else if (childrenData.length > 0) setChildId(childrenData[0].id);

      setAmount('');
      setCategory('Food/Drinks');
      setMemo('');
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen, initialChildId, childrenData]);

  const handleSubmit = () => {
    if (childId && amount && memo) {
      const numAmount = parseFloat(amount);
      // STRICT VALIDATION: Amount must be strictly positive
      if (!isNaN(numAmount) && numAmount > 0) {
        onAdd(childId, numAmount, category, memo);
        onClose();
      }
    }
  };

  // STRICT VALIDATION: Disable button if amount is 0 or negative
  const isValid = childId && amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && memo.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] bg-[#1a1a1a] rounded-[28px] shadow-[0_24px_80px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-white/[0.06]">

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

        <div className="relative z-10 p-8 md:px-12 md:py-10">

          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-[1.75rem] font-[590] text-white mb-2 leading-tight">
              Record Advance
            </h2>
            <p className="text-[0.9375rem] text-[#888]">
              Track upfront spending or debts
            </p>
          </div>

          <div className="space-y-6">

            {/* Child Selection */}
            <div>
              <label className="block text-[0.9375rem] font-[510] text-[#999] mb-3 ml-1">Child Account</label>
              <div className="relative">
                <select
                  value={childId}
                  onChange={(e) => setChildId(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-base outline-none appearance-none focus:bg-white/[0.06] focus:border-[#FFCC00]/40 focus:shadow-[0_0_12px_rgba(255,204,0,0.15)] transition-all cursor-pointer"
                >
                  {childrenData.map(child => (
                    <option key={child.id} value={child.id} className="bg-[#1a1a1a]">{child.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666] pointer-events-none" />
              </div>
            </div>

            {/* Amount & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.9375rem] font-[510] text-[#999] mb-3 ml-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#666] font-bold text-lg">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-lg font-bold outline-none focus:bg-white/[0.06] focus:border-[#FFCC00]/40 focus:shadow-[0_0_12px_rgba(255,204,0,0.15)] transition-all placeholder-[#444]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.9375rem] font-[510] text-[#999] mb-3 ml-1">Category</label>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as AdvanceCategory)}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-base outline-none appearance-none focus:bg-white/[0.06] focus:border-[#FFCC00]/40 focus:shadow-[0_0_12px_rgba(255,204,0,0.15)] transition-all cursor-pointer"
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat} className="bg-[#1a1a1a]">{cat}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666] pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Memo */}
            <div>
              <label className="block text-[0.9375rem] font-[510] text-[#999] mb-3 ml-1">Memo</label>
              <input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Starbucks, Robux, Uber"
                className="w-full px-4 py-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-base outline-none focus:bg-white/[0.06] focus:border-[#FFCC00]/40 focus:shadow-[0_0_12px_rgba(255,204,0,0.15)] transition-all placeholder-[#444]"
              />
            </div>

            {/* Action Button */}
            <button
              onClick={handleSubmit}
              disabled={!isValid}
              className={`
                w-full py-4 rounded-xl font-[510] text-[1.0625rem] transition-all duration-200 mt-2
                ${isValid
                  ? 'bg-gradient-to-r from-[#990000] to-[#FFCC00] text-white shadow-lg hover:shadow-[0_8px_24px_rgba(153,0,0,0.3)] hover:-translate-y-0.5 active:scale-[0.98]'
                  : 'bg-[#333] text-white/40 cursor-not-allowed opacity-60'
                }
              `}
            >
              Record Advance
            </button>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAdvanceModal;
