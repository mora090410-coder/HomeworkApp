import React, { useEffect, useMemo, useState } from 'react';
import { Delete, Loader2, Lock, X } from 'lucide-react';
import { setProfilePin, verifyProfilePin } from '../services/householdService';

type PinMode = 'VERIFY' | 'SETUP';

interface PinModalProps {
  isOpen: boolean;
  householdId: string | null;
  profileId: string | null;
  profileRole?: 'ADMIN' | 'CHILD' | 'MEMBER';
  mode: PinMode;
  profileName: string;
  canAdminBypass?: boolean;
  adminMasterPassword?: string;
  onClose: () => void;
  onAuthorized: () => void;
}

export default function PinModal({
  isOpen,
  householdId,
  profileId,
  profileRole,
  mode,
  profileName,
  canAdminBypass = false,
  adminMasterPassword = '',
  onClose,
  onAuthorized,
}: PinModalProps) {
  const [pin, setPin] = useState('');
  const [initialPin, setInitialPin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [masterPasswordInput, setMasterPasswordInput] = useState('');

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
    setMasterPasswordInput('');
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
          if (!householdId) {
            throw new Error('Household context is missing.');
          }

          const isValid = await verifyProfilePin(householdId, profileId, pin);
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
        if (!householdId) {
          throw new Error('Household context is missing.');
        }

        await setProfilePin(householdId, profileId, pin);
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
  }, [pin, mode, onAuthorized, setupStep, initialPin, isLoading, householdId, profileId]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-[420px] glass-dark rounded-[28px] border border-white/10 overflow-hidden shadow-2xl">
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
                className={`rounded-full transition-all ${pin.length > index ? 'w-4 h-4 bg-primary-600 shadow-[0_0_10px_rgba(var(--primary-600),0.5)]' : 'w-4 h-4 bg-white/10'}`}
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
                className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-white text-[1.75rem] font-[480] hover:bg-white/10 hover:border-primary-500/40 transition-all disabled:opacity-60"
                aria-label={`Enter digit ${digit}`}
              >
                {digit}
              </button>
            ))}

            <div className="aspect-square flex items-center justify-center">
              {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary-500" />}
            </div>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isLoading}
              className="aspect-square rounded-2xl bg-white/5 border border-white/10 text-white text-[1.75rem] font-[480] hover:bg-white/10 hover:border-primary-500/40 transition-all disabled:opacity-60"
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

          {canAdminBypass && profileRole === 'CHILD' && mode === 'VERIFY' && (
            <div className="mt-2 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
              <button
                type="button"
                onClick={onAuthorized}
                className="w-full rounded-xl border border-primary-500/40 bg-primary-500/10 px-4 py-2 text-sm font-semibold text-primary-300 hover:bg-primary-500/20 transition-colors"
                aria-label="Enter child profile as admin without PIN"
              >
                Enter as Admin (No PIN)
              </button>

              {adminMasterPassword.trim().length > 0 && (
                <div className="mt-3 flex gap-2">
                  <input
                    type="password"
                    value={masterPasswordInput}
                    onChange={(event) => setMasterPasswordInput(event.target.value)}
                    placeholder="Admin master password"
                    className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-gray-500 focus:border-primary-500/60 transition-all font-mono"
                    aria-label="Admin master password"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (masterPasswordInput === adminMasterPassword) {
                        setErrorMessage(null);
                        onAuthorized();
                        return;
                      }
                      setErrorMessage('Master password is incorrect.');
                    }}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-200 hover:bg-white/10"
                  >
                    Use Password
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-gray-500">
            <Lock className="w-3 h-3" />
            <span className="text-xs font-medium tracking-wide">SECURE VERIFICATION</span>
          </div>
        </div>
      </div>
    </div>
  );
}
