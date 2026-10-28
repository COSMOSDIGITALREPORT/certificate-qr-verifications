/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';
import { api } from '../services/api.js';
import { Certificate } from '../types/index.js';

interface RevokeModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onRevokedSuccess: (updatedCert: Certificate) => void;
}

export const RevokeModal: React.FC<RevokeModalProps> = ({
  certificate,
  onClose,
  onRevokedSuccess,
}) => {
  const [reason, setReason] = useState('Internship discontinued by mutual agreement');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!certificate) return null;

  const handleRevoke = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await api.revokeCertificate(certificate.id, reason.trim() || undefined);
      if (res.success && res.certificate) {
        onRevokedSuccess(res.certificate);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to revoke certificate');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white border border-rose-200 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-rose-600 font-bold text-base">
            <AlertTriangle className="w-5 h-5" />
            <span>Confirm Credential Revocation</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3 text-xs text-slate-700">
          <p>
            You are about to revoke certificate <strong className="text-slate-900 font-mono font-bold">{certificate.certificateNumber}</strong> issued to <strong className="text-slate-900">{certificate.recipientName}</strong>.
          </p>

          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 space-y-1">
            <div className="font-bold flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Immediate Consequence:</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              Anyone scanning the QR code or visiting the verification link will immediately see a <strong>REVOKED</strong> notice with the reason provided below.
            </p>
          </div>

          <form onSubmit={handleRevoke} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Revocation Reason <span className="text-slate-400 font-normal">(Publicly displayed on verification record)</span>
              </label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="State the official reason for credential invalidation..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-50"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
              >
                {submitting ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
};
