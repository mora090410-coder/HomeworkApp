
import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Share2, Info } from 'lucide-react';

interface SyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  exportData: string;
}

const SyncModal: React.FC<SyncModalProps> = ({ isOpen, onClose, exportData }) => {
  const [copySuccess, setCopySuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(exportData);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(exportData)}`;

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 font-sans text-white">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[480px] glass-dark rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/10">

        {/* Noise Texture */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' /%3E%3C/svg%3E")` }}>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-10 pb-12 flex flex-col items-center relative z-10">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-[590] text-white mb-2">Sync Devices</h3>
            <p className="text-gray-400 text-sm">Transfer your family setup to another phone</p>
          </div>

          <div className="bg-white p-4 rounded-2xl mb-8 shadow-xl">
            <img
              src={qrUrl}
              alt="Sync QR Code"
              className="w-[200px] h-[200px]"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center shrink-0 border border-primary-500/20">
                <Smartphone className="w-5 h-5 text-primary-400" />
              </div>
              <div className="text-left pt-0.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Step 1</p>
                <p className="text-sm text-gray-200">Open this URL on the new phone</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-white/5 border border-white/10 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Share2 className="w-5 h-5 text-blue-400" />
              </div>
              <div className="text-left pt-0.5">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">Step 2</p>
                <p className="text-sm text-gray-200">Tap "Join Family" and paste the code</p>
              </div>
            </div>
          </div>

          <div className="mt-10 w-full">
            <button
              onClick={handleCopy}
              className={`
                w-full py-4 rounded-xl font-[510] text-[1.0625rem] flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer
                ${copySuccess
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-gradient-to-r from-primary-700 to-primary-500 text-white shadow-lg shadow-primary-500/20 hover:shadow-primary-500/30 hover:-translate-y-0.5 active:scale-[0.98]'
                }
              `}
            >
              {copySuccess ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copySuccess ? 'Code Copied!' : 'Copy Sync Code'}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-gray-500">
            <Info className="w-3.5 h-3.5" />
            <span className="text-xs font-medium italic">QR Code contains your family configuration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
