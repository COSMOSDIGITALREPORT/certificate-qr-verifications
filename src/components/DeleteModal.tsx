/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Trash2, X, AlertTriangle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api.js';
import { Certificate } from '../types/index.js';

interface DeleteModalProps {
  certificate: Certificate | null;
  onClose: () => void;
  onDeletedSuccess: (deletedCert: Certificate) => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  certificate,
  onClose,
  onDeletedSuccess,
}) => {
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!certificate) return null;

  const isConfirmed = confirmText.trim() === 'DELETE';

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;

    setError(null);
    setSubmitting(true);

    try {
      const res = await api.deleteCertificate(certificate.id);
      if (res.success) {
        onDeletedSuccess(certificate);
        onClose();
      } else {
        setError(res.message || 'Failed to delete certificate');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to permanently delete certificate');
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
            <Trash2 className="w-5 h-5 text-rose-600" />
            <span>Confirm Permanent Deletion</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
            title="Cancel and close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700">
            {error}
          </div>
        )}

        <div className="space-y-3.5 text-xs text-slate-700">
          
          {/* Main Warning Box */}
          <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-rose-800">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Warning: Irreversible Action</span>
            </div>
            <p className="text-[11px] text-rose-700 leading-relaxed">
              Are you sure you want to permanently delete this certificate? This action will remove its database record, associated PDF, and QR verification details. This action cannot be undone.
            </p>
          </div>

          {/* Target Record Card */}
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2 font-mono text-[11px]">
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans">Certificate Number:</span>
              <span className="font-bold text-slate-900">{certificate.certificateNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans">Student Name:</span>
              <span className="font-bold font-sans text-slate-900">{certificate.recipientName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1.5">
              <span className="text-slate-500 font-sans">Designated Role:</span>
              <span className="font-sans text-slate-700">{certificate.designation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Verification ID:</span>
              <span className="text-slate-700">{certificate.verificationId}</span>
            </div>
          </div>

          <form onSubmit={handleDelete} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                To confirm permanent deletion, type <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">DELETE</span> below:
              </label>
              <input
                type="text"
                required
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-50"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isConfirmed || submitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Deleting Permanently...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete Certificate</span>
                  </>
                )}
              </button>
            </div>
          </form>

        </div>

      </div>
    </div>
  );
};
