import React, { useState } from 'react';
import { X, Award, ShieldCheck, Download, Printer, Search, CheckCircle2 } from 'lucide-react';
import { Certificate } from '../types.ts';
import { api } from '../services/api.ts';

interface CertificateModalProps {
  certificate?: Certificate;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  const [verifyCode, setVerifyCode] = useState('');
  const [verifiedCert, setVerifiedCert] = useState<Certificate | null>(certificate || null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyCode.trim()) return;

    try {
      setSearching(true);
      setSearchError(null);
      const res = await api.verifyCertificate(verifyCode.trim());
      if (res.valid) {
        setVerifiedCert(res.certificate || null);
      } else {
        setSearchError('Invalid certificate verification code.');
      }
    } catch (err: any) {
      setSearchError(err.message || 'Certificate not found.');
    } finally {
      setSearching(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 overflow-y-auto">
      <div className="relative bg-white rounded-3xl shadow-2xl border border-neutral-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50/70">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-neutral-900">Official Certificate of Participation</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-neutral-200 text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Certificate Design Container */}
          {verifiedCert ? (
            <div className="border-8 border-double border-neutral-800 bg-[#fdfbf7] p-6 sm:p-8 rounded-2xl text-center relative overflow-hidden shadow-inner font-serif">
              {/* Corner Ornaments */}
              <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-600" />
              <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-600" />
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-600" />
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-600" />

              <div className="space-y-3">
                <div className="flex items-center justify-center gap-2 text-neutral-600">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <span className="text-xs font-sans tracking-widest uppercase font-bold text-neutral-700">
                    {verifiedCert.collegeName || 'APEX UNIVERSITY'}
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-neutral-900 tracking-wide pt-2">
                  Certificate of Participation
                </h2>

                <p className="text-xs font-sans text-neutral-500 italic">This is proudly presented to</p>

                <h3 className="text-xl sm:text-2xl font-black text-red-900 border-b-2 border-amber-500/60 pb-1 max-w-sm mx-auto">
                  {verifiedCert.studentName}
                </h3>

                <p className="text-xs sm:text-sm font-sans text-neutral-700 max-w-md mx-auto leading-relaxed pt-1">
                  for successfully attending and actively participating in the campus event{' '}
                  <strong className="text-neutral-900 font-bold block mt-1 font-serif text-base">"{verifiedCert.eventName}"</strong>
                </p>

                <div className="pt-6 grid grid-cols-2 gap-4 text-xs font-sans border-t border-neutral-300 max-w-md mx-auto">
                  <div className="text-left">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Date & Venue</p>
                    <p className="font-semibold text-neutral-800">{verifiedCert.date}</p>
                    <p className="text-[11px] text-neutral-500 mt-0.5">{verifiedCert.organizerName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider">Verification ID</p>
                    <p className="font-mono font-bold text-red-800">{verifiedCert.certificateId}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-bold mt-0.5">
                      <CheckCircle2 className="w-3 h-3" /> Digitally Verified
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-neutral-500">
              <p className="text-sm">Enter a verification ID below to authenticate an official college certificate.</p>
            </div>
          )}

          {/* Verification Code Lookup Bar */}
          <form onSubmit={handleVerify} className="p-3 bg-neutral-50 rounded-2xl border border-neutral-200 text-xs">
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Enter Certificate Code (e.g. CP-CERT-2026-10492)"
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl bg-white border border-neutral-300 text-xs font-mono outline-none uppercase"
              />
              <button
                type="submit"
                disabled={searching || !verifyCode.trim()}
                className="px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-bold text-xs disabled:opacity-50 flex items-center gap-1"
              >
                <Search className="w-3.5 h-3.5" />
                {searching ? 'Checking...' : 'Verify'}
              </button>
            </div>
            {searchError && <p className="text-rose-600 text-xs font-medium mt-1.5">{searchError}</p>}
          </form>

          {/* Action Buttons */}
          {verifiedCert && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Print / Save PDF
              </button>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/?verify=${verifiedCert.certificateId}`
                  );
                  alert('Verification link copied to clipboard!');
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                Copy Credential Link
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
