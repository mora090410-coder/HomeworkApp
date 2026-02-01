
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
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 font-sans">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl transition-opacity duration-300" onClick={onClose} />
      <div className="relative w-full max-w-[480px] bg-[#121212] rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/[0.08]">
        <button onClick={onClose} className="absolute top-6 right-6 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white transition-all z-20">
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-10 pb-12 flex flex-col items-center">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-white mb-2">Sync Devices</h3>
            <p className="text-[#888] text-sm">Transfer your family setup to another phone</p>
          </div>

          <div className="bg-white p-4 rounded-2xl mb-8 shadow-[0_0_30px_rgba(255,255,255,0.1)]">
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
            <div className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-[#FFCC00]/10 flex items-center justify-center shrink-0">
                <Smartphone className="w-4 h-4 text-[#FFCC00]" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-0.5">Step 1</p>
                <p className="text-sm text-[#888]">Open this URL on the new phone</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-2xl">
              <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4 text-blue-400" />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-white uppercase tracking-wider mb-0.5">Step 2</p>
                <p className="text-sm text-[#888]">Tap "Join Family" and paste the code</p>
              </div>
            </div>
          </div>

          <div className="mt-10 w-full">
            <button 
              onClick={handleCopy}
              className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                copySuccess 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : 'bg-gradient-to-r from-[#990000] to-[#FFCC00] text-white'
              }`}
            >
              {copySuccess ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              {copySuccess ? 'Code Copied!' : 'Copy Sync Code'}
            </button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-[#555]">
            <Info className="w-3 h-3" />
            <span className="text-[0.75rem] font-medium italic">QR Code contains your family configuration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
