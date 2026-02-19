import React, { useState, useEffect } from 'react';
import { X, Lock, GripHorizontal } from 'lucide-react';

interface PinModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    title?: string;
    expectedPinHash?: string; // Optional: if provided, validates against this hash
}

// Simple hash function for client-side PIN validation (matches the one used in householdService)
const hashPin = async (pin: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(pin);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
};

const PinModal: React.FC<PinModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    title = "Enter Parent PIN",
    expectedPinHash
}) => {
    const [pin, setPin] = useState(['', '', '', '']);
    const [error, setError] = useState(false);
    const [shake, setShake] = useState(false);

    // Focus first input on open
    useEffect(() => {
        if (isOpen) {
            setPin(['', '', '', '']);
            setError(false);
            // Small delay to allow modal animation
            setTimeout(() => {
                const firstInput = document.getElementById('pin-input-0');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }, [isOpen]);

    const handlePinChange = (index: number, value: string) => {
        if (value.length > 1) value = value.slice(-1); // Only allow 1 char
        if (!/^\d*$/.test(value)) return; // Only allow numbers

        const newPin = [...pin];
        newPin[index] = value;
        setPin(newPin);
        setError(false);

        // Auto-advance
        if (value && index < 3) {
            const nextInput = document.getElementById(`pin-input-${index + 1}`);
            if (nextInput) nextInput.focus();
        }

        // Check completion
        if (index === 3 && value) {
            const fullPin = newPin.join('');
            validatePin(fullPin);
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !pin[index] && index > 0) {
            const prevInput = document.getElementById(`pin-input-${index - 1}`);
            if (prevInput) prevInput.focus();
        }
    };

    const validatePin = async (inputPin: string) => {
        // If expectedPinHash is provided, validate against it
        if (expectedPinHash) {
            const hashedInput = await hashPin(inputPin);
            if (hashedInput === expectedPinHash) {
                onSuccess();
                onClose();
            } else {
                triggerError();
            }
        } else {
            // Default behavior (if no hash provided, assume success for now OR implement default validation logic)
            // For now, let's assume specific "demo" pin or success if no hash provided (but typically we'd want a hash)
            // If no hash provided, maybe we accept anything? Or a default?
            // Let's assume ONLY valid if hash provided for this secure component.
            // But for backward compatibility if used elsewhere without hash:
            if (inputPin === '0000') { // Fallback dev pin
                onSuccess();
                onClose();
            } else {
                triggerError();
            }
        }
    };

    const triggerError = () => {
        setError(true);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin(['', '', '', '']);
        const firstInput = document.getElementById('pin-input-0');
        if (firstInput) firstInput.focus();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className={`bg-white rounded-none shadow-2xl w-full max-w-sm overflow-hidden ${shake ? 'animate-shake' : ''}`}
                role="dialog"
                aria-modal="true"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50">
                    <div className="flex items-center gap-2 text-neutral-800">
                        <Lock className="w-4 h-4 text-neutral-500" />
                        <h2 className="font-bold text-sm uppercase tracking-wide">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-neutral-100 text-neutral-400 hover:text-neutral-600 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 flex flex-col items-center gap-8">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400 mb-2">
                            <GripHorizontal className="w-6 h-6" />
                        </div>
                        <p className="text-neutral-500 text-sm text-center">
                            Please enter your 4-digit security PIN to continue.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        {pin.map((digit, index) => (
                            <input
                                key={index}
                                id={`pin-input-${index}`}
                                type="password"
                                inputMode="numeric"
                                pattern="\d*"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handlePinChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                aria-label={`Digit ${index + 1}`}
                                className={`w-12 h-16 text-center text-2xl font-bold bg-neutral-50 border-2 rounded-lg transition-all outline-none focus:bg-white
                    ${error
                                        ? 'border-red-300 text-red-600 focus:border-red-500 focus:ring-4 focus:ring-red-500/10'
                                        : 'border-neutral-200 text-neutral-900 focus:border-neutral-900 focus:ring-4 focus:ring-neutral-900/5'
                                    }`}
                            />
                        ))}
                    </div>

                    {error && (
                        <p className="text-red-500 text-xs font-bold uppercase tracking-wide animate-pulse">
                            Incorrect PIN
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-neutral-50 border-t border-neutral-100 text-center">
                    <p className="text-xs text-neutral-400">Forgot PIN? Reset it in Settings.</p>
                </div>
            </div>
        </div>
    );
};

export default PinModal;
