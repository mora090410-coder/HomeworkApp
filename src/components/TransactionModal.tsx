import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { centsToDollars, dollarsToCents, formatCurrency } from '@/utils';
import { ledgerService } from '@/services/ledgerService';
import { db } from '@/services/firebase';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'ADVANCE' | 'PAYOUT';
    childId: string;
    householdId: string;
    currentBalanceCents: number;
    childName: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen,
    onClose,
    type,
    childId,
    householdId,
    currentBalanceCents,
    childName,
}) => {
    const [amountStr, setAmountStr] = useState('');
    const [memo, setMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isAdvance = type === 'ADVANCE';
    const title = isAdvance ? 'Advance Funds' : 'Record Cash Payment';
    const description = isAdvance
        ? `Advance money to ${childName}. This will be deducted from their balance.`
        : `Record a cash payment to ${childName}. This will be deducted from their balance.`;

    const amount = parseFloat(amountStr);
    const amountCents = isNaN(amount) ? 0 : dollarsToCents(amount);
    const willCauseDebt = currentBalanceCents - amountCents < 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!amount || amount <= 0) {
            setError('Please enter a valid amount.');
            return;
        }

        if (isAdvance && !memo.trim()) {
            setError('A memo is required for advances (e.g., "Movie ticket").');
            return;
        }

        setIsSubmitting(true);

        try {
            if (isAdvance) {
                await ledgerService.recordAdvance({
                    firestore: db,
                    householdId,
                    profileId: childId,
                    amountCents,
                    category: 'Other', // You might want to add a category selector later
                    memo: memo.trim(),
                });
            } else {
                // Payout is essentially an advance/withdrawal but framed as payment
                // Using recordAdvance logic for now as it deducts balance, or recordManualAdjustment?
                // User said: "Record Cash Payment... creates a negative 'Withdrawal' entry"
                // recordAdvance does exactly that (amount * -1).
                await ledgerService.recordAdvance({
                    firestore: db,
                    householdId,
                    profileId: childId,
                    amountCents,
                    category: 'Other',
                    memo: memo.trim() || 'Cash Payout',
                });
            }
            onClose();
            setAmountStr('');
            setMemo('');
        } catch (err) {
            console.error(err);
            setError('Failed to record transaction. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="w-full max-w-md bg-surface-app dark:bg-surface-elev rounded-2xl border border-stroke-base shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-start mb-4">
                        <Dialog.Title className="text-xl font-bold font-heading text-content-primary">
                            {title}
                        </Dialog.Title>
                        <button onClick={onClose} className="text-content-subtle hover:text-content-subtle">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <p className="text-sm text-content-muted mb-6 font-sans">
                        {description}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1">
                                Amount
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-content-subtle">$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    className="w-full pl-7 pr-3 py-2 bg-transparent text-content-primary placeholder-content-subtle border border-stroke-base focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-sans"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-content-muted mb-1">
                                Memo {isAdvance && <span className="text-red-500">*</span>}
                            </label>
                            <input
                                type="text"
                                value={memo}
                                onChange={(e) => setMemo(e.target.value)}
                                className="w-full px-3 py-2 bg-transparent text-content-primary placeholder-content-subtle border border-stroke-base focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all font-sans"
                                placeholder={isAdvance ? "e.g. Movie Ticket" : "Optional note"}
                            />
                        </div>

                        {willCauseDebt && (
                            <div className="bg-red-50 border border-red-100 p-3 flex items-start gap-2 rounded-none">
                                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700 font-medium">
                                    Warning: This will put {childName} into debt (Balance: {formatCurrency(centsToDollars(currentBalanceCents - amountCents))}).
                                </p>
                            </div>
                        )}

                        {error && (
                            <p className="text-sm text-red-600 font-medium animate-in slide-in-from-top-1">
                                {error}
                            </p>
                        )}

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1 border border-gold/30 text-content-primary rounded-full px-6 py-2"
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                variant={isAdvance ? "ghost" : "primary"}
                                className={`flex-1 ${isAdvance ? 'border-2 border-crimson text-crimson bg-transparent rounded-full hover:bg-crimson/5' : ''}`}
                                isLoading={isSubmitting}
                            >
                                Confirm
                            </Button>
                        </div>
                    </form>
                </Dialog.Panel>
            </div>
        </Dialog>
    );
};
