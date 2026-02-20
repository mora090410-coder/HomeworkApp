
import React, { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { AdvanceCategory, Child } from '@/types';
import { parseCurrencyInputToCents } from '@/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

interface AddAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  childrenData: Child[];
  initialChildId?: string;
  onAdd: (childId: string, amountCents: number, category: AdvanceCategory, memo: string) => void;
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

  const handleSubmit = (): void => {
    if (childId && amount && memo) {
      const amountCents = parseCurrencyInputToCents(amount);
      if (amountCents > 0) {
        onAdd(childId, amountCents, category, memo);
        onClose();
      }
    }
  };

  const isValid = childId && parseCurrencyInputToCents(amount) > 0 && memo.trim().length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[520px] bg-surface-base rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-stroke-base">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-app text-content-subtle transition-colors z-20"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="relative z-10 p-8 md:px-12 md:py-10">

          {/* Header */}
          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold font-heading text-content-primary mb-2 leading-tight">
              Record Advance
            </h2>
            <p className="text-base text-content-subtle">
              Track upfront spending or debts
            </p>
          </div>

          <div className="space-y-6">

            {/* Child Selection */}
            <div>
              <label className="block text-sm font-bold text-content-muted uppercase tracking-wider mb-3 ml-1">Child Account</label>
              <Select
                value={childId}
                onChange={(e) => setChildId(e.target.value)}
                className="w-full rounded-none bg-surface-app border border-gold/30"
              >
                {childrenData.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </Select>
            </div>

            {/* Amount & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-content-muted uppercase tracking-wider mb-3 ml-1">Amount</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-content-subtle font-bold text-lg">$</span>
                  <Input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-9 pr-4 py-3.5 text-lg font-bold placeholder-neutral-400 rounded-none bg-surface-app border border-gold/30"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-content-muted uppercase tracking-wider mb-3 ml-1">Category</label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AdvanceCategory)}
                  className="w-full rounded-none bg-surface-app border border-gold/30"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Select>
              </div>
            </div>

            {/* Memo */}
            <div>
              <label className="block text-sm font-bold text-content-muted uppercase tracking-wider mb-3 ml-1">Memo</label>
              <Input
                type="text"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Starbucks, Robux, Uber"
                className="px-4 py-3.5 text-base placeholder-neutral-400 rounded-none bg-surface-app border border-gold/30"
              />
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={handleSubmit}
                disabled={!isValid}
                className={`w-full h-14 text-lg font-bold rounded-full transition-all duration-200 ${isValid ? 'bg-ascendant-gradient text-white shadow-md hover:shadow-lg hover:-translate-y-0.5' : ''
                  }`}
                variant="primary"
              >
                Record Advance
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAdvanceModal;
