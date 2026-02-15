import React, { useEffect, useMemo, useState } from 'react';
import { Delete, Loader2, Lock, X } from 'lucide-react';
import { setProfilePin, verifyProfilePin } from '../services/householdService';

type PinMode = 'VERIFY' | 'SETUP';

interface PinModalProps {
  isOpen: boolean;
  profileId: string | null;
  mode: PinMode;
  profileName: string;
  onClose: () => void;
  onAuthorized: () => void;
}

export default function PinModal({
  isOpen,
  profileId,
  mode,
  profileName,
  onClose,
  onAuthorized,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [initialPin, setInitialPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setupStep: 'ENTER' | 'CONFIRM' = initialPin ? 'CONFIRM' : 'ENTER';
  const title = useMemo(() => {
    if (mode === 'VERIFY') {
      return `Enter PIN for ${profileName}`;
    }

    return setupStep === 'ENTER' ? `Create PIN for ${profileName}` : 'Confirm PIN';
  }, [mode, profileName, setupStep]);

  const subtitle = useMemo(() => {
    if (mode === 'VERIFY') {
      return 'Secure profile verification';
    }

    return setupStep === 'ENTER' ? 'Set a 4-digit PIN to protect this profile.' : 'Re-enter your PIN to confirm setup.';
  }, [mode, setupStep]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setPin('');
    setInitialPin(null);
    setIsLoading(false);
    setErrorMessage(null);
  }, [isOpen, mode]);

  const handleDigit = (digit: string): void => {
    if (isLoading || pin.length >= 4) {
      return;
    }

    setPin((previous) => `${previous}${digit}`);
    setErrorMessage(null);
  };

  const handleDelete = (): void => {
    if (isLoading) {
      return;
    }

    setPin((previous) => previous.slice(0, -1));
    setErrorMessage(null);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key >= '0' && event.key <= '9') {
        handleDigit(event.key);
      }

      if (event.key === 'Backspace') {
        handleDelete();
      }

      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isLoading, onClose]);

  useEffect(() => {
    if (pin.length !== 4 || isLoading) {
      return;
    }

    const processPin = async (): Promise<void> => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        if (mode === 'VERIFY') {
          if (!profileId) {
            throw new Error('PIN verification is not configured.');
          }

          const isValid = await verifyProfilePin(profileId, pin);
          if (!isValid) {
            throw new Error('Incorrect PIN.');
          }

          onAuthorized();
          return;
        }

        if (setupStep === 'ENTER') {
          setInitialPin(pin);
          setPin('');
          return;
        }

        if (!initialPin || pin !== initialPin) {
          setInitialPin(null);
          setPin('');
          throw new Error('PINs did not match. Please start again.');
        }

        if (!profileId) {
          throw new Error('PIN setup is not configured.');
        }

        await setProfilePin(profileId, pin);
        onAuthorized();
      } catch (error) {
        if (error instanceof Error) {
          setErrorMessage(error.message);
        } else {
          setErrorMessage('PIN verification failed.');
        }

        if (mode === 'VERIFY') {
          setPin('');
        }
      } finally {
        setIsLoading(false);
      }
    };

    void processPin();
  }, [pin, mode, onAuthorized, setupStep, initialPin, isLoading, profileId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-[#1a1a1a] rounded-[28px] border border-white/[0.06] overflow-hidden shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-6 right-6 w-8 h-8 rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white flex items-center justify-center"
          aria-label="Close PIN dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-8 pb-8 pt-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-[590] text-white mb-2">{title}</h3>
            <p className="text-sm text-gray-400">{subtitle}</p>
            {errorMessage && <p className="mt-3 text-xs text-red-400">{errorMessage}</p>}
          </div>

          <div className="flex items-center justify-center gap-4 mb-8 h-4">
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`rounded-full transition-all ${pin.length > index ? 'w-4 h-4 bg-[#b30000]' : 'w-4 h-4 bg-[#333333]'}`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 w-full mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(String(digit))}
                disabled={isLoading}
                className="aspect-square rounded-2xl bg-[#222222] border border-white/[0.06] text-white text-[1.75rem] font-[480] hover:bg-[#2a2a2a] hover:border-[#b30000]/40 disabled:opacity-60"
                aria-label={`Enter digit ${digit}`}
              >
                {digit}
              </button>
            ))}

            <div className="aspect-square flex items-center justify-center">
              {isLoading && <Loader2 className="w-6 h-6 animate-spin text-[#b30000]" />}
            </div>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isLoading}
              className="aspect-square rounded-2xl bg-[#222222] border border-white/[0.06] text-white text-[1.75rem] font-[480] hover:bg-[#2a2a2a] hover:border-[#b30000]/40 disabled:opacity-60"
              aria-label="Enter digit 0"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="aspect-square rounded-2xl text-[#666666] hover:text-white hover:bg-white/5 disabled:opacity-60 flex items-center justify-center"
              aria-label="Delete last digit"
            >
              <Delete className="w-6 h-6" strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex items-center justify-center gap-2 text-[#555555]">
            <Lock className="w-3 h-3" />
            <span className="text-xs font-medium tracking-wide">SECURE VERIFICATION</span>
          </div>
        </div>
      </div>
    </div>
  );
}
