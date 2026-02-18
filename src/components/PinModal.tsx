import React, { useEffect, useMemo, useState } from 'react';
import { Delete, Loader2, Lock, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-white rounded-none border border-neutral-200 overflow-hidden shadow-2xl">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-100 text-neutral-darkGray transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-12 pb-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-primary-cardinal/10 flex items-center justify-center mb-6">
            <Lock className="w-8 h-8 text-primary-cardinal" />
          </div>

          <h3 className="text-2xl font-bold font-heading text-neutral-black mb-2">
            {title}
          </h3>

          <p className="text-neutral-darkGray text-sm text-center mb-8 max-w-[280px]">
            {subtitle}
          </p>

          {/* PIN Display */}
          <div className="flex gap-4 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`
                  w-4 h-4 rounded-full transition-all duration-300 transform
                  ${i < pin.length
                    ? 'border-primary-cardinal bg-primary-cardinal text-white'
                    : 'border-neutral-200 bg-neutral-50'
                  }
                  ${errorMessage ? 'bg-semantic-error animate-shake' : ''}
                `}
              />
            ))}
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-4 w-full max-w-[280px] mb-6">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(String(digit))}
                disabled={isLoading}
                className="aspect-square rounded-full text-2xl font-medium text-neutral-black hover:bg-neutral-100 active:bg-neutral-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary-cardinal/20 disabled:opacity-50"
                aria-label={`Enter digit ${digit}`}
              >
                {digit}
              </button>
            ))}

            <div className="aspect-square flex items-center justify-center">
              {isLoading && <Loader2 className="w-6 h-6 animate-spin text-primary-cardinal" />}
            </div>

            <button
              type="button"
              onClick={() => handleDigit('0')}
              disabled={isLoading}
              className="aspect-square rounded-full text-2xl font-medium text-neutral-black hover:bg-neutral-100 active:bg-neutral-200 transition-all focus:outline-none focus:ring-2 focus:ring-primary-cardinal/20 disabled:opacity-50"
              aria-label="Enter digit 0"
            >
              0
            </button>

            <button
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="aspect-square rounded-full flex items-center justify-center text-neutral-darkGray hover:text-neutral-black hover:bg-neutral-100 active:bg-neutral-200 transition-all disabled:opacity-50"
              aria-label="Delete last digit"
            >
              <Delete className="w-7 h-7" strokeWidth={1.5} />
            </button>
          </div>

          {errorMessage && (
            <div className="text-semantic-error text-sm font-medium animate-in fade-in slide-in-from-top-1 mb-4">
              {errorMessage}
            </div>
          )}

          {canAdminBypass && (
            <div className="mt-4 w-full">
              {profileRole === 'CHILD' && mode === 'VERIFY' && (
                <div className="w-full">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onAuthorized}
                    className="w-full mb-3"
                  >
                    Enter as Admin (No PIN)
                  </Button>
                  {/* Master password hidden for now or implemented if needed matching original */}
                  {adminMasterPassword.trim().length > 0 && (
                    <div className="flex gap-2">
                      <Input
                        type="password"
                        value={masterPasswordInput}
                        onChange={(e) => setMasterPasswordInput(e.target.value)}
                        placeholder="Master password"
                        className="flex-1 rounded-xl px-3 py-2 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (masterPasswordInput === adminMasterPassword) {
                            setErrorMessage(null);
                            onAuthorized();
                          } else {
                            setErrorMessage('Incorrect master password');
                          }
                        }}
                      >
                        Go
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
