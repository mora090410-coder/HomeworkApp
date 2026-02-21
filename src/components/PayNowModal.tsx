import React from 'react';
import { Task } from '@/types';
import { Zap } from 'lucide-react';
import { centsToDollars, formatCurrency } from '@/utils';

interface PayNowModalProps {
    task: Task;
    onClose: () => void;
    onRecordCash: () => void;
}

export const PayNowModal: React.FC<PayNowModalProps> = ({ task, onClose, onRecordCash }) => {
    const amount = centsToDollars(task.valueCents || 0);

    const handleComingSoon = () => {
        alert("Coming soon! Use cash payment for now.");
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-sm bg-cream border border-gold/20 rounded-2xl p-6 shadow-xl animate-in zoom-in-95 duration-200">
                <p className="text-xs tracking-widest text-charcoal/40 uppercase font-sans mb-1">Pay Now</p>
                <p className="font-serif text-gold text-3xl mb-1">{formatCurrency(amount)}</p>
                <p className="text-charcoal/50 text-sm mb-6">{task.name}</p>

                {/* Payment options */}
                <div className="space-y-3">
                    <button
                        onClick={handleComingSoon}
                        className="w-full bg-black text-white rounded-full py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                    >
                        Apple Pay
                    </button>

                    <button
                        onClick={handleComingSoon}
                        className="w-full border border-gold/20 text-charcoal bg-cream rounded-full py-3 text-sm font-semibold hover:bg-gold/5 transition-colors"
                    >
                        Venmo / Zelle
                    </button>

                    <button
                        onClick={onRecordCash}
                        className="w-full border border-charcoal/20 text-charcoal/60 bg-transparent rounded-full py-3 text-sm hover:bg-charcoal/5 transition-colors"
                    >
                        Record Cash Payment
                    </button>
                </div>

                {/* Coming soon note on Apple Pay / Venmo */}
                <p className="text-xs text-charcoal/30 text-center mt-4 italic font-sans">
                    Digital payments coming soon. Use cash for now.
                </p>

                <button
                    onClick={onClose}
                    className="w-full text-center text-charcoal/40 text-sm mt-3 hover:text-charcoal transition-colors font-sans"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
