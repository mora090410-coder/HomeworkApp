
import React, { useState, useEffect, useCallback } from 'react';
import { X, Delete, Lock } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  storedPin: string | null;
  onSetPin?: (pin: string) => void;
  onVerify?: (pin: string) => Promise<boolean>;
  title?: string;
  subtitle?: string;
}

const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  storedPin,
  onSetPin,
  onVerify, // New prop
  title: customTitle,
  subtitle: customSubtitle
}) => {
  const [pin, setPin] = useState('');
  const [tempPin, setTempPin] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false); // New state

  // If onVerify is present, we are in VERIFY mode implicitly if no setters
  const mode = (!storedPin && !onVerify)
    ? (tempPin ? 'CONFIRM' : 'SETUP')
    : 'VERIFY';

  const getTitle = () => {
    if (error) return mode === 'SETUP' ? 'Try Again' : 'Incorrect PIN';
    if (loading) return 'Verifying...';
    if (customTitle) return customTitle;
    if (mode === 'SETUP') return 'Create Admin PIN';
    if (mode === 'CONFIRM') return 'Confirm PIN';
    return 'Enter Admin PIN';
  };

  const getSubtitle = () => {
    if (error) return mode === 'SETUP' ? 'PINs did not match' : 'Please try again';
    if (loading) return 'Checking security...';
    if (customSubtitle) return customSubtitle;
    if (mode === 'SETUP') return 'Set a 4-digit security code';
    if (mode === 'CONFIRM') return 'Re-enter to verify';
    return 'Security Check';
  };

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setTempPin(null);
      setError(false);
      setLoading(false);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  useEffect(() => {
    if (pin.length === 4 && !loading) {
      const processPin = async () => {
        setLoading(true);
        // Small artificial delay for UX if local, or implicit if async
        if (!onVerify) await new Promise(r => setTimeout(r, 100));

        if (mode === 'VERIFY') {
          let isValid = false;
          if (onVerify) {
            isValid = await onVerify(pin);
          } else if (storedPin) {
            isValid = pin === storedPin;
          }

          if (isValid) {
            onSuccess();
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setError(false);
              setLoading(false);
            }, 500);
            return; // Guard to keep loading true if success, but false if error
          }
        } else if (mode === 'SETUP' && onSetPin) {
          setTempPin(pin);
          setPin('');
        } else if (mode === 'CONFIRM' && onSetPin) {
          if (pin === tempPin) {
            onSetPin(pin);
            onSuccess();
          } else {
            setError(true);
            setTimeout(() => {
              setPin('');
              setTempPin(null);
              setError(false);
            }, 1000);
          }
        }
        setLoading(false);
      };
      processPin();
    }
  }, [pin, mode, storedPin, tempPin, onSuccess, onSetPin, onVerify]);

  const handleNumClick = useCallback((num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  }, [pin]);

  const handleDelete = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleNumClick(e.key);
      else if (e.key === 'Backspace') handleDelete();
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleNumClick, handleDelete, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[420px] bg-[#1a1a1a] rounded-[28px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/[0.06]">
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}>
        </div>
        <button onClick={onClose} className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-20">
          <X className="w-4 h-4" />
        </button>
        <div className="relative z-10 px-8 pb-8 pt-10 flex flex-col items-center">
          <div className="text-center mb-10">
            <h3 className={`text-[1.75rem] font-[590] leading-tight mb-2 transition-colors duration-300 ${error ? 'text-[#990000]' : 'text-white'}`}>
              {getTitle()}
            </h3>
            <p className={`text-[0.9375rem] font-medium transition-colors duration-300 ${error ? 'text-red-400' : 'text-[#666666]'}`}>
              {getSubtitle()}
            </p>
          </div>
          <div className="flex gap-4 mb-12 h-4 items-center">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`rounded-full transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${pin.length > i
                  ? (error ? 'w-4 h-4 bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.5)] scale-110' : 'w-4 h-4 bg-gradient-to-br from-[#990000] to-[#FFCC00] shadow-[0_0_10px_rgba(255,204,0,0.4)] scale-110')
                  : 'w-4 h-4 bg-[#333333]'
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 w-full mb-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button key={num} onClick={() => handleNumClick(num.toString())} className="aspect-square rounded-2xl bg-[#222222] border border-white/[0.06] text-white text-[1.75rem] font-[480] hover:bg-[#2a2a2a] hover:border-[#FFCC00]/20 hover:text-[#FFCC00] active:scale-95 transition-all outline-none select-none flex items-center justify-center shadow-lg">{num}</button>
            ))}
            <div className="aspect-square" />
            <button onClick={() => handleNumClick('0')} className="aspect-square rounded-2xl bg-[#222222] border border-white/[0.06] text-white text-[1.75rem] font-[480] hover:bg-[#2a2a2a] hover:border-[#FFCC00]/20 hover:text-[#FFCC00] active:scale-95 transition-all outline-none select-none flex items-center justify-center shadow-lg">0</button>
            <button onClick={handleDelete} className="aspect-square rounded-2xl bg-transparent border border-transparent text-[#666666] hover:text-white hover:bg-white/5 active:scale-95 transition-all outline-none select-none flex items-center justify-center">
              <Delete className="w-7 h-7" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex items-center gap-2 text-[#555555] select-none">
            <Lock className="w-3 h-3" />
            <span className="text-[0.8125rem] font-medium tracking-wide">SECURE VERIFICATION</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PinModal;
