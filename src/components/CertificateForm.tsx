/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FilePlus2,
  Calendar,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  Download,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Certificate, CertificateInput } from '../types/index.js';
import { calculateInternshipDuration } from '../../server/validation.js';

interface CertificateFormProps {
  onSuccess: (cert: Certificate) => void;
  onOpenVerification: (verificationId: string) => void;
}

export const CertificateForm: React.FC<CertificateFormProps> = ({
  onSuccess,
  onOpenVerification,
}) => {
  const [nextNumber, setNextNumber] = useState<string>('#...');
  const [loadingNumber, setLoadingNumber] = useState(true);

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [designation, setDesignation] = useState('Jr. Software Developer');
  const [department, setDepartment] = useState('Software Engineering');
  const [certificateType, setCertificateType] = useState('Certificate of Completion');
  const [startDate, setStartDate] = useState('2026-07-10');
  const [endDate, setEndDate] = useState('2026-10-16');
  const [internshipDuration, setInternshipDuration] = useState('3 months');
  const [manualDurationOverride, setManualDurationOverride] = useState(false);
  const [issuingCompany, setIssuingCompany] = useState('Cosmogeek Software Solutions Pvt. Ltd.');
  const [signatoryName, setSignatoryName] = useState('Anirudh Hatwar');
  const [signatoryRole, setSignatoryRole] = useState('Director / Authorized Signatory');
  const [initiatorName, setInitiatorName] = useState('admin');
  const [approverName, setApproverName] = useState('');
  const [approverDesignation, setApproverDesignation] = useState('');
  const [issueLocation, setIssueLocation] = useState('Nagpur, Maharashtra, India');
  const [additionalNotes, setAdditionalNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    certificate: Certificate;
    verificationUrl: string;
    downloadUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Load next certificate number on mount
  useEffect(() => {
    const fetchNextNum = async () => {
      try {
        const num = await api.getNextCertificateNumber();
        setNextNumber(num);
      } catch (err) {
        console.error('Failed to get next number:', err);
      } finally {
        setLoadingNumber(false);
      }
    };
    fetchNextNum();
  }, []);

  // Auto-calculate duration when dates change unless manual override is toggled
  useEffect(() => {
    if (!manualDurationOverride && startDate && endDate) {
      const calculated = calculateInternshipDuration(startDate, endDate);
      if (calculated) {
        setInternshipDuration(calculated);
      }
    }
  }, [startDate, endDate, manualDurationOverride]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input: CertificateInput = {
        recipientName: recipientName.trim(),
        recipientEmail: recipientEmail.trim() || undefined,
        designation: designation.trim(),
        department: department.trim() || undefined,
        certificateType: certificateType.trim(),
        startDate,
        endDate,
        internshipDuration: internshipDuration.trim(),
        issuingCompany: issuingCompany.trim(),
        signatoryName: signatoryName.trim(),
        signatoryRole: signatoryRole.trim(),
        initiatorName: initiatorName.trim() || undefined,
        approverName: approverName.trim() || undefined,
        approverDesignation: approverDesignation.trim() || undefined,
        issueLocation: issueLocation.trim(),
        additionalNotes: additionalNotes.trim() || undefined,
      };

      const result = await api.generateCertificate(input);
      setSuccessData(result);
      onSuccess(result.certificate);
    } catch (err: any) {
      setError(err?.message || 'Failed to issue certificate. Please check input fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetFormForNext = async () => {
    setSuccessData(null);
    setRecipientName('');
    setRecipientEmail('');
    setAdditionalNotes('');
    setApproverName('');
    setApproverDesignation('');
    try {
      const num = await api.getNextCertificateNumber();
      setNextNumber(num);
    } catch (err) {
      console.error(err);
    }
  };

  const copyUrl = () => {
    if (!successData?.verificationUrl) return;
    navigator.clipboard.writeText(successData.verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // SUCCESS VIEW
  if (successData) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-emerald-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Certificate Generated Successfully!</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Official PDF has been compiled, cryptographically signed with unique QR code, and saved to database registry.
          </p>
        </div>

        {/* Certificate preview snippet & QR code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="sm:col-span-2 space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Certificate Number:</span>
              <span className="font-mono font-bold text-slate-900">{successData.certificate.certificateNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Student Recipient:</span>
              <span className="font-bold text-slate-900">{successData.certificate.recipientName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Designated Role:</span>
              <span className="text-slate-700 font-medium">{successData.certificate.designation}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Duration:</span>
              <span className="text-slate-700 font-medium">{successData.certificate.internshipDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Verification URL:</span>
              <span className="font-mono text-emerald-700 font-semibold truncate max-w-[200px]" title={successData.verificationUrl}>
                {successData.verificationUrl}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <img
              src={successData.qrDataUrl}
              alt="Certificate Verification QR Code"
              className="w-28 h-28 object-contain"
            />
            <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider mt-1">
              Live QR Code
            </span>
          </div>
        </div>

        {/* Localhost Warning Notice for Mobile Scanning */}
        {(successData.isLocalhostUrl || successData.verificationUrl.includes('localhost') || successData.verificationUrl.includes('127.0.0.1')) && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-1.5 shadow-xs">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Mobile Phone Scanning Notice: Localhost Detected</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              This QR code was generated with <code className="bg-amber-100/90 px-1.5 py-0.5 rounded font-mono font-bold text-amber-950">{successData.verificationUrl}</code>. If scanned with a mobile phone, it will show <strong className="font-bold">ERR_CONNECTION_REFUSED</strong> because phones cannot resolve your computer&apos;s &quot;localhost&quot;.
            </p>
            <p className="text-amber-900 font-semibold pt-0.5">
              To test from a phone on the same Wi-Fi: Set <code className="bg-white px-1.5 py-0.5 rounded border border-amber-300 font-mono text-amber-950">NEXT_PUBLIC_APP_URL=http://&lt;YOUR_PC_IP&gt;:3000</code> in your <code className="font-mono">.env</code> file.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <a
            href={successData.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Download Generated PDF Certificate</span>
          </a>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              onClick={() => onOpenVerification(successData.certificate.verificationId)}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
              <span>Open Public Verification Page</span>
            </button>

            <button
              onClick={copyUrl}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs border border-slate-200 transition-colors cursor-pointer shadow-xs"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Verification Link Copied' : 'Copy Verification URL'}</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-200 text-center">
            <button
              onClick={resetFormForNext}
              className="text-xs text-emerald-700 hover:text-emerald-800 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Issue Another Student Certificate</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // GENERATION FORM
  return (
    <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-emerald-600" />
            <span>Add Student &amp; Generate Certificate</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Automatic unique certificate ID, embedded QR code &amp; corporate PDF placement
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono self-start sm:self-auto">
          <span>Assigned Number:</span>
          <span className="font-bold text-emerald-700">{loadingNumber ? '...' : nextNumber}</span>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Recipient Details Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>1. Student &amp; Internship Information</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. Yuvraj Dhumale"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
              />
            </div>

            {/* Email (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Email <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="e.g. yuvraj.dhumale@example.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
              />
            </div>

            {/* Designation / Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation / Internship Role <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                placeholder="e.g. Jr. Software Developer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Software Engineering / Web Development"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
              />
            </div>

            {/* Certificate Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Certificate Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={certificateType}
                onChange={(e) => setCertificateType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600 font-medium"
              >
                <option value="Certificate of Completion">Certificate of Completion</option>
                <option value="Certificate of Internship">Certificate of Internship</option>
                <option value="Certificate of Excellence">Certificate of Excellence</option>
                <option value="Certificate of Appreciation">Certificate of Appreciation</option>
              </select>
            </div>

          </div>
        </div>

        {/* Timeline & Duration Section */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Internship Timeline &amp; Duration</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Duration */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Duration <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setManualDurationOverride(!manualDurationOverride)}
                  className="text-[10px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                >
                  {manualDurationOverride ? 'Auto Calculate' : 'Custom Override'}
                </button>
              </div>
              <input
                type="text"
                required
                value={internshipDuration}
                disabled={!manualDurationOverride}
                onChange={(e) => setInternshipDuration(e.target.value)}
                placeholder="e.g. 3 months"
                className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600 ${
                  !manualDurationOverride ? 'opacity-85 font-semibold text-emerald-800' : ''
                }`}
              />
            </div>

          </div>
        </div>

        {/* Company & Signatory Section */}
        <div className="space-y-4 pt-2 border-t border-slate-200">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Issuing Company, Audit &amp; Signatory Authorities</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Issuing Company */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issuing Company <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={issuingCompany}
                onChange={(e) => setIssuingCompany(e.target.value)}
                placeholder="Cosmogeek Software Solutions Pvt. Ltd."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Signatory Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Signatory <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={signatoryName}
                onChange={(e) => setSignatoryName(e.target.value)}
                placeholder="Anirudh Hatwar"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Signatory Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Signatory Role
              </label>
              <input
                type="text"
                value={signatoryRole}
                onChange={(e) => setSignatoryRole(e.target.value)}
                placeholder="Director / Authorized Signatory"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Issue Location */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Issue Location
              </label>
              <input
                type="text"
                value={issueLocation}
                onChange={(e) => setIssueLocation(e.target.value)}
                placeholder="Nagpur, Maharashtra, India"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Initiator Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Initiated By <span className="text-slate-400 font-normal">(System Admin)</span>
              </label>
              <input
                type="text"
                value={initiatorName}
                onChange={(e) => setInitiatorName(e.target.value)}
                placeholder="admin"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Approver Name (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approver / Mentor Name <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={approverName}
                onChange={(e) => setApproverName(e.target.value)}
                placeholder="e.g. Tech Lead / Project Manager"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Approver Designation (Optional) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Approver Designation <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={approverDesignation}
                onChange={(e) => setApproverDesignation(e.target.value)}
                placeholder="e.g. Lead Engineer / QA Head"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Internal Audit Notes <span className="text-slate-400 font-normal">(Optional, private)</span>
              </label>
              <input
                type="text"
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="e.g. Performance commended for API architecture"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-emerald-600"
              />
            </div>

          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Compiling PDF &amp; Generating QR Code...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Issue Certificate &amp; Generate QR Verification Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
};
