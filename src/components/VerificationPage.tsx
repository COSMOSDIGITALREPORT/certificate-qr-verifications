/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Download,
  Calendar,
  Building2,
  User,
  CheckCircle2,
  Clock,
  Printer,
  Copy,
  Check,
  Search,
  ArrowLeft,
  Briefcase,
  FileCheck,
  MapPin,
  CalendarCheck,
  UserCheck,
  FileBadge2,
  Sparkles,
} from 'lucide-react';
import { api, getCertificateDownloadUrl } from '../services/api.js';
import { PublicVerificationResult } from '../types/index.js';
import { formatDateHumanReadable, formatDateToIndianStandard } from '../../server/validation.js';

interface VerificationPageProps {
  initialVerificationId?: string;
  onBackToDashboard?: () => void;
  isAdminLoggedIn?: boolean;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({
  initialVerificationId = 'cg-26832-7a8e',
  onBackToDashboard,
  isAdminLoggedIn = false,
}) => {
  const [searchId, setSearchId] = useState(initialVerificationId);
  const [currentId, setCurrentId] = useState(initialVerificationId);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<PublicVerificationResult | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (initialVerificationId) {
      setSearchId(initialVerificationId);
      setCurrentId(initialVerificationId);
    }
  }, [initialVerificationId]);

  useEffect(() => {
    let isMounted = true;
    const fetchVerification = async () => {
      setLoading(true);
      try {
        const data = await api.verifyCertificate(currentId.trim());
        if (isMounted) {
          setResult(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setResult({
            valid: false,
            status: 'ERROR',
            message: 'An error occurred while contacting the verification registry.',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchVerification();
    return () => {
      isMounted = false;
    };
  }, [currentId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      setCurrentId(searchId.trim());
    }
  };

  const copyVerificationLink = () => {
    const url = window.location.origin + `/verify/${currentId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between py-6 px-3 sm:px-6 lg:px-8 selection:bg-sky-100 selection:text-[#003B73]">
      <div className="max-w-xl mx-auto w-full space-y-6">
        
        {/* Top Header / Company Badge */}
        <div className="flex items-center justify-between">
          {onBackToDashboard ? (
            <button
              onClick={onBackToDashboard}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{isAdminLoggedIn ? 'Back to Admin' : 'Back to Sign In'}</span>
            </button>
          ) : (
            <div className="flex items-center gap-2.5">
              <img
                src="/assets/cosmogeek-emblem.png"
                alt="Cosmogeek Emblem"
                className="w-7 h-7 object-contain drop-shadow-xs"
              />
              <span className="text-xs font-bold tracking-wider text-slate-700 uppercase">
                Official Credential Registry
              </span>
            </div>
          )}

          <div className="text-[11px] text-slate-500 flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>LIVE SYSTEM</span>
          </div>
        </div>

        {/* Verification Lookup Input */}
        <form onSubmit={handleSearchSubmit} className="relative">
          <div className="flex items-center rounded-xl bg-white border border-slate-200 shadow-sm px-3.5 py-1.5 focus-within:border-[#0080FF] focus-within:ring-2 focus-within:ring-sky-100 transition-all">
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              placeholder="Enter Certificate or Verification ID (e.g. cg-26832-7a8e)"
              className="w-full bg-transparent text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="ml-2 px-3.5 py-1.5 rounded-lg bg-[#003B73] hover:bg-[#002b54] text-white font-semibold text-xs transition-colors shrink-0 shadow-sm cursor-pointer"
            >
              Verify
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-10 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full border-3 border-emerald-600 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-sm text-slate-600 font-medium">Validating credential against database registry...</p>
          </div>
        ) : !result || result.status === 'NOT_FOUND' || result.status === 'ERROR' ? (
          /* NOT FOUND / ERROR STATE */
          <div className="rounded-2xl bg-white border border-rose-200 p-6 sm:p-8 space-y-6 shadow-sm text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
              <ShieldX className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-rose-50 text-rose-700 border border-rose-200">
                {result?.status === 'ERROR' ? 'REGISTRY ERROR' : 'CREDENTIAL NOT FOUND'}
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
                {result?.status === 'ERROR' ? 'Verification Service Unavailable' : 'Certificate Not Found'}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                {result?.status === 'ERROR'
                  ? 'An internal error occurred while communicating with the verification database. Please retry shortly.'
                  : `The supplied certificate ID "${currentId}" does not match an available certificate record in the Cosmogeek Registry.`}
              </p>
            </div>

            {/* D. Authorization Status Card (Unknown state) */}
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-left text-xs text-slate-600 space-y-2.5">
              <p className="font-bold text-slate-800 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>Notice to Employers & Verifiers:</span>
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">
                <li>Verify you have typed or scanned the exact verification identifier.</li>
                <li>Unregistered or unissued credentials will not appear in this registry.</li>
                <li>To verify authentic credentials manually, contact Cosmogeek Software Solutions HR department.</li>
              </ul>
            </div>
          </div>
        ) : result.status === 'REVOKED' ? (
          /* REVOKED STATE */
          <div className="rounded-2xl bg-white border border-rose-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-300 text-rose-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldAlert className="w-9 h-9" />
              </div>
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase bg-rose-100 text-rose-800 border border-rose-200">
                  CREDENTIAL REVOKED
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2">Invalid / Revoked Certificate</h2>
                <p className="text-xs sm:text-sm text-rose-700 mt-1">
                  This certificate has been revoked by the issuing organization and must not be presented as currently valid.
                </p>
              </div>
            </div>

            {/* Revocation notice details */}
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500 font-medium">Revocation Date:</span>
                <span className="font-semibold text-rose-800 font-mono">
                  {formatDateHumanReadable(result.revocation?.revokedAt) || formatDateToIndianStandard(result.revocation?.revokedAt || '')}
                </span>
              </div>
              <div className="flex justify-between items-start text-slate-700">
                <span className="text-slate-500 font-medium shrink-0">Official Reason:</span>
                <span className="text-right text-slate-800 font-medium italic">
                  {result.revocation?.reason || 'Revoked by Cosmogeek administration'}
                </span>
              </div>
            </div>

            {/* Former record details */}
            {result.certificate && (
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Former Recipient:</span>
                  <span className="font-bold text-slate-900">{result.certificate.recipientName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Designation:</span>
                  <span className="font-semibold text-slate-700">{result.certificate.designation}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-2">
                  <span className="text-slate-500 font-medium">Certificate Number:</span>
                  <span className="font-mono text-slate-800 font-semibold">{result.certificate.certificateNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Issuing Organization:</span>
                  <span className="text-slate-800 font-medium">{result.certificate.issuingCompany}</span>
                </div>
              </div>
            )}

            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-center text-xs text-amber-800">
              <p className="font-medium">
                Possession of a physical or digital document for this credential does not confer valid certification.
              </p>
            </div>
          </div>
        ) : (
          /* VALID VERIFIED CREDENTIAL STATE (Clean White Theme) */
          <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            
            {/* A. Header / Verification Identity */}
            <div className="text-center space-y-3 pb-2 border-b border-slate-100">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border-2 border-emerald-500 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  VERIFIED CREDENTIAL
                </span>
                
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-2.5 tracking-tight">
                  Certificate Authentication Registry
                </h1>
                
                <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                  This credential has been officially verified against the authorized records maintained by Cosmogeek Software Solutions Pvt. Ltd.
                </p>

                <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                  Record ID: <span className="font-semibold text-slate-700">{result.certificate?.verificationId}</span> • Certificate No: <span className="font-semibold text-slate-700">{result.certificate?.certificateNumber}</span>
                </p>
              </div>
            </div>

            {/* B. Student Information Card */}
            <div className="space-y-4">
              
              {/* Recipient Headline Box */}
              <div className="rounded-xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-4 text-center space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                  Certified Recipient
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                  {result.certificate?.recipientName}
                </h2>
                <div className="inline-flex flex-wrap items-center justify-center gap-1.5 mt-1">
                  <div className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 py-0.5 rounded-md border border-emerald-100">
                    <Briefcase className="w-3.5 h-3.5" />
                    <span>{result.certificate?.designation}</span>
                  </div>
                  {result.certificate?.department && (
                    <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                      <span>Dept: {result.certificate.department}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {result.certificate?.certificateType} • Duration: <span className="font-semibold text-slate-700">{result.certificate?.internshipDuration}</span>
                </p>
              </div>

              {/* Structured Metadata Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                
                {/* Designated Role */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <User className="w-3.5 h-3.5 text-emerald-600" />
                    <span>DESIGNATED ROLE</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {result.certificate?.designation}
                  </p>
                </div>

                {/* Internship Duration */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>INTERNSHIP DURATION</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {result.certificate?.internshipDuration}
                  </p>
                </div>

                {/* Validity Period (Timeline) */}
                <div className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                    <span>VALIDITY PERIOD (START &amp; END DATES)</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-0.5">
                    <div>
                      <span className="text-[11px] text-slate-500 block">Start Date</span>
                      <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                        {formatDateHumanReadable(result.certificate?.startDate)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        ({formatDateToIndianStandard(result.certificate?.startDate || '')})
                      </span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">End Date</span>
                      <span className="text-slate-900 font-semibold text-xs sm:text-sm">
                        {formatDateHumanReadable(result.certificate?.endDate)}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        ({formatDateToIndianStandard(result.certificate?.endDate || '')})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Certificate Number */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <FileBadge2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>CERTIFICATE NUMBER</span>
                  </div>
                  <p className="font-mono font-bold text-slate-900 text-sm">
                    {result.certificate?.certificateNumber}
                  </p>
                </div>

                {/* Issue Date */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <CalendarCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ISSUE DATE</span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm">
                    {formatDateHumanReadable(result.certificate?.issuedAt)}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    ({formatDateToIndianStandard(result.certificate?.issuedAt || '')})
                  </p>
                </div>

                {/* Issuing Organization */}
                <div className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                    <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>ISSUING ORGANIZATION</span>
                  </div>
                  <p className="font-bold text-slate-900 text-sm">
                    {result.certificate?.issuingCompany || 'Cosmogeek Software Solutions Pvt. Ltd.'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Authorized Signatory: <span className="font-semibold text-slate-700">{result.certificate?.signatoryName}</span> ({result.certificate?.signatoryRole || 'Director / Authorized Signatory'})
                  </p>
                </div>

                {/* Commendation / Content Body */}
                {result.certificate?.contentBody && (
                  <div className="sm:col-span-2 rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>COMMENDATION &amp; DESCRIPTION</span>
                    </div>
                    <p className="text-slate-800 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {result.certificate.contentBody}
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* C. Initiator and Approval Information (Rendered genuine data from DB) */}
            {(result.certificate?.approverName || result.certificate?.initiatorName || result.certificate?.issueLocation) && (
              <div className="rounded-xl bg-gradient-to-br from-slate-50 to-emerald-50/20 border border-slate-200 p-4 space-y-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-slate-700 font-bold border-b border-slate-200 pb-2">
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>AUTHORIZATION &amp; APPROVAL AUDIT</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {result.certificate.initiatorName && (
                    <div>
                      <span className="text-[11px] text-slate-500 block">Initiated By</span>
                      <span className="font-semibold text-slate-800">
                        {result.certificate.initiatorName}
                      </span>
                    </div>
                  )}

                  {result.certificate.createdAt && (
                    <div>
                      <span className="text-[11px] text-slate-500 block">Record Created</span>
                      <span className="font-semibold text-slate-800">
                        {formatDateHumanReadable(result.certificate.createdAt)}
                      </span>
                    </div>
                  )}

                  {result.certificate.approverName && (
                    <div>
                      <span className="text-[11px] text-slate-500 block">Approver Name &amp; Role</span>
                      <span className="font-semibold text-slate-800">
                        {result.certificate.approverName}
                        {result.certificate.approverDesignation ? ` (${result.certificate.approverDesignation})` : ''}
                      </span>
                    </div>
                  )}

                  {result.certificate.issueLocation && (
                    <div>
                      <span className="text-[11px] text-slate-500 block flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>Issue Location</span>
                      </span>
                      <span className="font-semibold text-slate-800">
                        {result.certificate.issueLocation}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* D. Authorization Status Card */}
            <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <h3 className="font-bold text-emerald-950 text-sm">
                  Certificate Verified
                </h3>
                <p className="text-xs text-emerald-800">
                  This certificate matches the record maintained by Cosmogeek Software Solutions Pvt. Ltd.
                </p>
                <div className="pt-1 flex items-center gap-2 text-[11px] font-semibold text-emerald-900">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                  <span>Credential Status: Active &amp; Valid</span>
                </div>
              </div>
            </div>

            {/* E. Certificate Download & Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <a
                href={getCertificateDownloadUrl(result.certificate?.certificateNumber)}
                target="_blank"
                rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Certificate</span>
              </a>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={copyVerificationLink}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors shadow-xs cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
                  <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors shadow-xs cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Report</span>
                </button>
              </div>
            </div>

          </div>
        )}

        {/* F. Company Footer — REQUIRED */}
        <footer className="border-t border-slate-200 pt-6 pb-4 text-center space-y-1">
          <p className="font-bold text-slate-800 text-sm tracking-tight">
            Cosmogeek Software Solutions Pvt. Ltd.
          </p>
          <p className="text-xs text-slate-500">
            Certificate Authentication &amp; Verification System
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            © {currentYear} Cosmogeek Software Solutions Pvt. Ltd. All rights reserved.
          </p>
        </footer>

      </div>
    </div>
  );
};
