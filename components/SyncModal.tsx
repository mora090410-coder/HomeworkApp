
import React, { useState } from 'react';
import { X, Copy, Check, Smartphone, Share2, Info } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';

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
    <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 font-sans text-neutral-black">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-neutral-black/60 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
      />

      <div className="relative w-full max-w-[480px] bg-white rounded-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-neutral-lightGray">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-neutral-mutedBg text-neutral-darkGray transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-8 pt-10 pb-12 flex flex-col items-center relative z-10">
          <div className="text-center mb-8">
            <h3 className="text-3xl font-bold font-heading text-neutral-black mb-2">Sync Devices</h3>
            <p className="text-neutral-darkGray text-sm">Transfer your family setup to another phone</p>
          </div>

          <div className="bg-white p-4 rounded-none border border-neutral-lightGray mb-8 shadow-sm">
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
            <div className="flex items-start gap-4 p-4 bg-neutral-mutedBg border border-neutral-lightGray rounded-none">
              <div className="w-10 h-10 rounded-full bg-primary-gold/20 flex items-center justify-center shrink-0 border border-primary-gold/30">
                <Smartphone className="w-5 h-5 text-primary-cardinal" />
              </div>
              <div className="text-left pt-0.5">
                <p className="text-xs font-bold text-neutral-darkGray uppercase tracking-wider mb-0.5">Step 1</p>
                <p className="text-sm text-neutral-black font-medium">Open this URL on the new phone</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-neutral-mutedBg border border-neutral-lightGray rounded-none">
              <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 border border-blue-500/20">
                <Share2 className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-left pt-0.5">
                <p className="text-xs font-bold text-neutral-darkGray uppercase tracking-wider mb-0.5">Step 2</p>
                <p className="text-sm text-neutral-black font-medium">Tap "Join Family" and paste the code</p>
              </div>
            </div>
          </div>

          <div className="mt-10 w-full">
            <Button
              onClick={handleCopy}
              variant={copySuccess ? "secondary" : "primary"}
              className={`w-full py-4 h-14 text-lg font-bold ${copySuccess ? 'text-semantic-success border-semantic-success' : ''}`}
              leftIcon={copySuccess ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            >
              {copySuccess ? 'Code Copied!' : 'Copy Sync Code'}
            </Button>
          </div>

          <div className="mt-6 flex items-center gap-2 text-neutral-darkGray">
            <Info className="w-4 h-4" />
            <span className="text-xs font-medium italic">QR Code contains your family configuration</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;
