/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
} from 'lucide-react';
import { Certificate } from '../types/index.js';
import { generateQrDataUrl } from '../../server/qr.js';
import { formatDateHumanReadable, formatDateToIndianStandard } from '../../server/validation.js';
import { fetchServerConfig, getAppVerificationBaseUrl } from '../services/api.js';

interface CertificateDetailModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onOpenVerification: (verificationId: string) => void;
  onOpenRevoke: (cert: Certificate) => void;
}

export const CertificateDetailModal: React.FC<CertificateDetailModalProps> = ({
  certificate,
  onClose,
  onOpenVerification,
  onOpenRevoke,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [effectiveBaseUrl, setEffectiveBaseUrl] = useState<string>(getAppVerificationBaseUrl());
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenerateSuccess, setRegenerateSuccess] = useState(false);

  useEffect(() => {
    fetchServerConfig().then((cfg) => {
      if (cfg && cfg.appBaseUrl) {
        setEffectiveBaseUrl(cfg.appBaseUrl);
      }
    });
  }, []);

  const getEffectiveUrl = () => {
    if (!certificate) return '';
    return `${effectiveBaseUrl.replace(/\/$/, '')}/verify/${certificate.verificationId}`;
  };

  const isLocalhost = effectiveBaseUrl.includes('localhost') || effectiveBaseUrl.includes('127.0.0.1');

  useEffect(() => {
    if (certificate) {
      const verificationUrl = getEffectiveUrl();
      generateQrDataUrl(verificationUrl, 260)
        .then((url) => setQrDataUrl(url))
        .catch(console.error);
    }
  }, [certificate, effectiveBaseUrl]);

  if (!certificate) return null;

  const isValid = certificate.status === 'VALID';
  const cleanNum = certificate.certificateNumber.replace(/[^a-zA-Z0-9]/g, '');

  const copyVerificationLink = () => {
    const url = getEffectiveUrl();
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegeneratePdf = async () => {
    setIsRegenerating(true);
    setRegenerateSuccess(false);
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(certificate.id)}/regenerate-pdf`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.qrDataUrl) {
        setQrDataUrl(data.qrDataUrl);
      }
      setRegenerateSuccess(true);
      setTimeout(() => setRegenerateSuccess(false), 3000);
    } catch (e) {
      console.error('Failed to regenerate PDF', e);
    } finally {
      setIsRegenerating(false);
    }
  };

  const downloadQrImage = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `QRCode_${cleanNum}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-slate-900 text-base">
                {certificate.certificateNumber}
              </span>
              {isValid ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  VALID CREDENTIAL
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                  REVOKED
                </span>
              )}
            </div>
            <h2 className="text-xl font-bold text-slate-900">{certificate.recipientName}</h2>
            <p className="text-xs text-slate-500">
              {certificate.designation} • {certificate.certificateType} ({certificate.internshipDuration})
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Revocation Banner if Revoked */}
        {!isValid && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 space-y-1 text-xs">
            <div className="font-bold text-rose-800 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>Certificate Revoked</span>
            </div>
            <div className="text-slate-700">
              Revocation Date: <span className="font-mono font-semibold">{formatDateHumanReadable(certificate.revokedAt) || formatDateToIndianStandard(certificate.revokedAt?.substring(0, 10) || '')}</span>
            </div>
            <div className="text-slate-700">
              Reason: <span className="italic font-medium">{certificate.revocationReason || 'Administrative revocation'}</span>
            </div>
          </div>
        )}

        {/* Content Grid: Details & QR */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          
          {/* Metadata */}
          <div className="sm:col-span-2 space-y-3 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Recipient Email:</span>
                <span className="text-slate-900 font-mono font-medium">{certificate.recipientEmail || 'N/A'}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Timeline:</span>
                <span className="text-slate-800 font-medium">
                  {formatDateHumanReadable(certificate.startDate)} - {formatDateHumanReadable(certificate.endDate)}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Issuing Company:</span>
                <span className="text-slate-800 font-medium">{certificate.issuingCompany}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Signatory:</span>
                <span className="text-slate-800 font-medium">{certificate.signatoryName}</span>
              </div>
              {certificate.approverName && (
                <div className="flex justify-between border-b border-slate-200 pb-1.5">
                  <span className="text-slate-500">Approver / Mentor:</span>
                  <span className="text-slate-800 font-medium">{certificate.approverName}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span className="text-slate-500">Issue Date:</span>
                <span className="text-slate-800 font-medium">{formatDateHumanReadable(certificate.issuedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verification ID:</span>
                <span className="font-mono text-emerald-700 font-semibold select-all">{certificate.verificationId}</span>
              </div>
            </div>

            {certificate.additionalNotes && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600">
                <span className="text-slate-800 font-semibold block mb-0.5">Admin Notes:</span>
                {certificate.additionalNotes}
              </div>
            )}
          </div>

          {/* QR Code Card */}
          <div className="flex flex-col items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Verification QR
            </span>
            {qrDataUrl ? (
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-xs">
                <img src={qrDataUrl} alt="QR Code" className="w-32 h-32 object-contain" />
              </div>
            ) : (
              <div className="w-32 h-32 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-400">
                Loading...
              </div>
            )}

            <div className="w-full text-center">
              <span className="text-[10px] text-slate-500 block mb-0.5 font-medium">Encoded URL:</span>
              <p className="text-[10px] font-mono text-slate-700 bg-white p-1.5 rounded border border-slate-200 break-all select-all">
                {getEffectiveUrl()}
              </p>
            </div>

            <div className="w-full space-y-1.5">
              <button
                onClick={downloadQrImage}
                className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors text-center cursor-pointer shadow-2xs"
              >
                Download QR PNG
              </button>
              <button
                onClick={handleRegeneratePdf}
                disabled={isRegenerating}
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold transition-colors text-center cursor-pointer"
              >
                {isRegenerating ? 'Regenerating...' : regenerateSuccess ? '✓ Regenerated with LAN IP!' : 'Regenerate PDF & QR'}
              </button>
            </div>

            {isLocalhost && (
              <div className="w-full text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2 text-center leading-tight">
                <strong>Phone Wi-Fi Scanning:</strong> Set <code className="font-mono">APP_BASE_URL</code> or <code className="font-mono">NEXT_PUBLIC_APP_URL</code> in <code className="font-mono">.env</code> to your local IPv4 address.
              </div>
            )}
          </div>

        </div>

        {/* Modal Actions */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            
            {/* Download PDF */}
            <a
              href={`/api/download/${cleanNum}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </a>

            {/* Public verification */}
            <button
              onClick={() => {
                onClose();
                onOpenVerification(certificate.verificationId);
              }}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-emerald-600" />
              <span>Open Public Portal</span>
            </button>

            {/* Copy link */}
            <button
              onClick={copyVerificationLink}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-400" />}
              <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
            </button>

          </div>

          {/* Revoke option */}
          {isValid && (
            <div className="pt-2 text-right">
              <button
                onClick={() => {
                  onClose();
                  onOpenRevoke(certificate);
                }}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Revoke this certificate...</span>
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
