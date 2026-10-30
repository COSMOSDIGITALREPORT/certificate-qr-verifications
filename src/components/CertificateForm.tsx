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
  FileText,
  Award,
  ScrollText,
  FileSignature,
  Eye,
} from 'lucide-react';
import { api } from '../services/api.js';
import { Certificate, CertificateInput, OfferLetterInput } from '../types/index.js';
import { calculateInternshipDuration, DEFAULT_CONTENT_BODY, formatDateToIndianStandard } from '../../server/validation.js';

interface CertificateFormProps {
  onSuccess: (cert: Certificate) => void;
  onOpenVerification: (verificationId: string) => void;
}

export type TemplateOption = 'OFFER_LETTER' | 'COSMOS_DIGITAL' | 'COSMOGEEK';

export const CertificateForm: React.FC<CertificateFormProps> = ({
  onSuccess,
  onOpenVerification,
}) => {
  // Selected Template Mode (Default: Cosmogeek Certificate)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption>('COSMOGEEK');
  const [showLivePreview, setShowLivePreview] = useState(true);

  // Common numbering
  const [nextNumber, setNextNumber] = useState<string>('#26847');
  const [loadingNumber, setLoadingNumber] = useState(true);

  // -------------------------------------------------------------
  // 1. OPTION 1: OFFER LETTER STATE
  // -------------------------------------------------------------
  const [offerRecipientName, setOfferRecipientName] = useState('');
  const [offerLetterDate, setOfferLetterDate] = useState('30/06/2026');
  const [offerSubject, setOfferSubject] = useState('Employment Offer Letter For N8N Automation');
  const [offerPosition, setOfferPosition] = useState('N8N Automation Intern');
  const [offerCompany, setOfferCompany] = useState('Cosmogeek Software Solutions Pvt. Ltd.');
  const [offerBody, setOfferBody] = useState(
    'We are pleased to offer you the position of N8N Automation Intern at Cosmogeek Software Solutions Pvt. Ltd. We were impressed with your skills and believe that your passion and creativity will be a valuable additional to our team.'
  );
  const [offerStartDate, setOfferStartDate] = useState('01 July, 2026');
  const [offerEndDate, setOfferEndDate] = useState('01 January, 2027');
  const [offerStipend, setOfferStipend] = useState('5,000 - 7,000 (Based on your Performance)');
  const [offerBond, setOfferBond] = useState(
    'Upon confirmation as a full-time employee, you agree to commit to a minimum employment period of 6 months.'
  );
  const [offerTermination, setOfferTermination] = useState(
    'Cosmogeek Software Solutions reserves the right to terminate your internship or full-time employment at any point, based on performance, conduct, or business needs.'
  );
  const [offerAuthSign, setOfferAuthSign] = useState('Authorized Person’s Sign');

  // Offer Letter Success
  const [offerSuccessData, setOfferSuccessData] = useState<{
    documentId: string;
    filename: string;
    downloadUrl: string;
    recipientName: string;
    position: string;
    letterDate: string;
  } | null>(null);

  // -------------------------------------------------------------
  // 2. OPTION 2: COSMOS DIGITAL CERTIFICATE STATE
  // -------------------------------------------------------------
  const [cdRecipientName, setCdRecipientName] = useState('');
  const [cdRecipientEmail, setCdRecipientEmail] = useState('');
  const [cdCertificateType, setCdCertificateType] = useState('Certificate of Completion');
  const [cdCourseName, setCdCourseName] = useState('Python Basics');
  const [cdDuration, setCdDuration] = useState('3 - months');
  const [cdStartDate, setCdStartDate] = useState('2026-06-04');
  const [cdEndDate, setCdEndDate] = useState('2026-09-06');
  const [cdDirectorName, setCdDirectorName] = useState('Anirudh Hatwar');
  const [cdContentBody, setCdContentBody] = useState(
    'The participant has completed the prescribed course curriculum covering relevant concepts, tools, and practical learning activities as applicable to the program. Well done!'
  );

  // -------------------------------------------------------------
  // 3. OPTION 3: COSMOGEEK CERTIFICATE STATE (Existing)
  // -------------------------------------------------------------
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
  const [initiatorName, setInitiatorName] = useState('Anirudh Hatwar');
  const [approverName, setApproverName] = useState('');
  const [approverDesignation, setApproverDesignation] = useState('');
  const [issueLocation, setIssueLocation] = useState('Nagpur, Maharashtra, India');
  const [contentBody, setContentBody] = useState(DEFAULT_CONTENT_BODY);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Certificate Success (Cosmogeek & Cosmos Digital)
  const [certSuccessData, setCertSuccessData] = useState<{
    certificate: Certificate;
    verificationUrl: string;
    downloadUrl: string;
    docxDownloadUrl?: string;
    qrDataUrl: string;
    isLocalhostUrl?: boolean;
    warning?: string;
  } | null>(null);

  // Load next certificate number on mount
  useEffect(() => {
    const fetchNextNum = async () => {
      try {
        const num = await api.getNextCertificateNumber();
        setNextNumber(num);
      } catch (err) {
        console.error('Failed to get next number:', err);
        setNextNumber('#26847');
      } finally {
        setLoadingNumber(false);
      }
    };
    fetchNextNum();
  }, []);

  // Auto-calculate Cosmogeek duration when dates change
  useEffect(() => {
    if (!manualDurationOverride && startDate && endDate) {
      const calculated = calculateInternshipDuration(startDate, endDate);
      if (calculated) {
        setInternshipDuration(calculated);
      }
    }
  }, [startDate, endDate, manualDurationOverride]);

  // Handle Offer Letter Submission
  const handleOfferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input: OfferLetterInput = {
        recipientName: offerRecipientName.trim(),
        letterDate: offerLetterDate.trim(),
        subject: offerSubject.trim(),
        position: offerPosition.trim(),
        companyName: offerCompany.trim(),
        letterBody: offerBody.trim() || undefined,
        startDate: offerStartDate.trim(),
        endDate: offerEndDate.trim(),
        stipend: offerStipend.trim(),
        employmentBond: offerBond.trim() || undefined,
        terminationClause: offerTermination.trim() || undefined,
        authorizedPersonName: offerAuthSign.trim() || undefined,
      };

      const result = await api.generateOfferLetter(input);
      setOfferSuccessData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate Offer Letter document.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cosmos Digital Certificate Submission
  const handleCosmosDigitalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input: CertificateInput = {
        documentType: 'COSMOS_DIGITAL_CERTIFICATE',
        recipientName: cdRecipientName.trim(),
        recipientEmail: cdRecipientEmail.trim() || undefined,
        designation: cdCourseName.trim(),
        department: 'Cosmos Digital Training',
        certificateType: cdCertificateType.trim(),
        startDate: cdStartDate,
        endDate: cdEndDate,
        internshipDuration: cdDuration.trim(),
        issuingCompany: 'Cosmos Digital',
        signatoryName: cdDirectorName.trim() || 'Anirudh Hatwar',
        signatoryRole: 'Director',
        contentBody: cdContentBody.trim() || undefined,
        issueLocation: 'Nagpur, Maharashtra, India',
      };

      const result = await api.generateCertificate(input);
      setCertSuccessData(result);
      onSuccess(result.certificate);
    } catch (err: any) {
      setError(err?.message || 'Failed to issue Cosmos Digital certificate.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Cosmogeek Certificate Submission (Option 3 - existing)
  const handleCosmogeekSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const input: CertificateInput = {
        documentType: 'COSMOGEEK_CERTIFICATE',
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
        contentBody: contentBody.trim() || undefined,
        additionalNotes: additionalNotes.trim() || undefined,
      };

      const result = await api.generateCertificate(input);
      setCertSuccessData(result);
      onSuccess(result.certificate);
    } catch (err: any) {
      setError(err?.message || 'Failed to issue certificate. Please check input fields.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyUrl = () => {
    if (!certSuccessData?.verificationUrl) return;
    navigator.clipboard.writeText(certSuccessData.verificationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const resetAllForms = async () => {
    setCertSuccessData(null);
    setOfferSuccessData(null);
    setRecipientName('');
    setRecipientEmail('');
    setCdRecipientName('');
    setCdRecipientEmail('');
    setOfferRecipientName('');
    try {
      const num = await api.getNextCertificateNumber();
      setNextNumber(num);
    } catch {}
  };

  // -------------------------------------------------------------
  // SUCCESS VIEW: CERTIFICATE (COSMOGEEK OR COSMOS DIGITAL)
  // -------------------------------------------------------------
  if (certSuccessData) {
    const isCD = certSuccessData.certificate.documentType === 'COSMOS_DIGITAL_CERTIFICATE';
    return (
      <div className="max-w-3xl mx-auto rounded-2xl bg-white border border-sky-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-sky-50 border-2 border-[#0080FF] text-[#003B73] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-8 h-8 text-[#0080FF]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            {isCD ? 'Cosmos Digital Certificate Generated!' : 'Cosmogeek Certificate Generated!'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Official certificate compiled with unique cryptographic QR code and registered in MongoDB Atlas database.
          </p>
        </div>

        {/* Certificate preview snippet & QR code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-5 rounded-xl border border-slate-200">
          <div className="sm:col-span-2 space-y-2 text-xs">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Document Type:</span>
              <span className="font-bold text-[#003B73]">
                {isCD ? 'Cosmos Digital Certificate' : 'Cosmogeek Certificate'}
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Certificate Number:</span>
              <span className="font-mono font-bold text-slate-900">{certSuccessData.certificate.certificateNumber}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Student Recipient:</span>
              <span className="font-bold text-slate-900">{certSuccessData.certificate.recipientName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">{isCD ? 'Course / Program:' : 'Designation / Role:'}</span>
              <span className="text-slate-700 font-medium">{certSuccessData.certificate.designation}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="text-slate-500">Duration:</span>
              <span className="text-slate-700 font-medium">{certSuccessData.certificate.internshipDuration}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Verification URL:</span>
              <span className="font-mono text-[#003B73] font-semibold truncate max-w-[200px]" title={certSuccessData.verificationUrl}>
                {certSuccessData.verificationUrl}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-2.5 bg-white rounded-xl border border-slate-200 shadow-xs">
            <img
              src={certSuccessData.qrDataUrl}
              alt="Certificate Verification QR Code"
              className="w-28 h-28 object-contain"
            />
            <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider mt-1">
              Live QR Code
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-wrap gap-2.5">
            <a
              href={certSuccessData.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-xs shadow-sm transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </a>

            {certSuccessData.docxDownloadUrl && (
              <a
                href={certSuccessData.docxDownloadUrl}
                download
                className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-sm transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download DOCX</span>
              </a>
            )}

            <button
              onClick={() => onOpenVerification(certSuccessData.certificate.verificationId)}
              className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#0080FF]" />
              <span>Verify Portal</span>
            </button>

            <button
              onClick={copyUrl}
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs border border-slate-200 transition-all cursor-pointer"
              title="Copy Verification Link"
            >
              {copied ? <Check className="w-4 h-4 text-[#0080FF]" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              onClick={resetAllForms}
              className="text-xs text-[#0080FF] hover:text-[#003B73] font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Issue Another Document or Certificate</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // SUCCESS VIEW: OFFER LETTER
  // -------------------------------------------------------------
  if (offerSuccessData) {
    return (
      <div className="max-w-2xl mx-auto rounded-2xl bg-white border border-sky-200 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-sky-50 border-2 border-[#0080FF] text-[#003B73] flex items-center justify-center mx-auto shadow-sm">
            <FileSignature className="w-8 h-8 text-[#0080FF]" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Employment Offer Letter Generated!</h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Official Word Document (.docx) generated preserving master company branding, corporate border, and signatures.
          </p>
        </div>

        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-2.5 text-xs">
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Candidate Full Name:</span>
            <span className="font-bold text-slate-900">{offerSuccessData.recipientName}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Offered Position / Role:</span>
            <span className="font-semibold text-slate-900">{offerSuccessData.position}</span>
          </div>
          <div className="flex justify-between border-b border-slate-200 pb-2">
            <span className="text-slate-500">Letter Date:</span>
            <span className="text-slate-700 font-mono">{offerSuccessData.letterDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Generated File:</span>
            <span className="font-mono text-[#003B73] font-semibold">{offerSuccessData.filename}</span>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <a
            href={offerSuccessData.downloadUrl}
            download
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-sm shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download Offer Letter (.docx)</span>
          </a>

          <div className="text-center pt-2">
            <button
              onClick={resetAllForms}
              className="text-xs text-[#0080FF] hover:text-[#003B73] font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>Issue Another Document</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN GENERATOR VIEW WITH 3 SELECTABLE OPTIONS
  // -------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* 3 Template Selection Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-[#0080FF]" />
              <span>Select Document Template</span>
            </h2>
            <p className="text-xs text-slate-500">
              Choose an official template to generate dynamically with custom recipient information.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowLivePreview(!showLivePreview)}
            className="hidden sm:flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-[#003B73] px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{showLivePreview ? 'Hide Preview' : 'Show Preview'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          
          {/* Card 1: Offer Letter */}
          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('OFFER_LETTER');
              setError(null);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
              selectedTemplate === 'OFFER_LETTER'
                ? 'border-[#0080FF] bg-sky-50/70 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-blue-100/70 text-[#003B73] flex items-center justify-center">
                <FileSignature className="w-5 h-5 text-[#003B73]" />
              </div>
              {selectedTemplate === 'OFFER_LETTER' && (
                <span className="w-2 h-2 rounded-full bg-[#0080FF]"></span>
              )}
            </div>
            <h3 className="font-bold text-xs text-slate-900 mt-2.5">1. Offer Letter</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Official Cosmogeek Employment Offer Letter (.docx) with custom stipend &amp; bond terms
            </p>
          </button>

          {/* Card 2: Cosmos Digital Certificate */}
          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('COSMOS_DIGITAL');
              setError(null);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
              selectedTemplate === 'COSMOS_DIGITAL'
                ? 'border-[#0080FF] bg-sky-50/70 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-teal-100/70 text-teal-800 flex items-center justify-center">
                <Award className="w-5 h-5 text-teal-700" />
              </div>
              {selectedTemplate === 'COSMOS_DIGITAL' && (
                <span className="w-2 h-2 rounded-full bg-[#0080FF]"></span>
              )}
            </div>
            <h3 className="font-bold text-xs text-slate-900 mt-2.5">2. Cosmos Digital Certificate</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Course &amp; Training Program Certificate (PDF &amp; DOCX) with live QR verification
            </p>
          </button>

          {/* Card 3: Cosmogeek Certificate */}
          <button
            type="button"
            onClick={() => {
              setSelectedTemplate('COSMOGEEK');
              setError(null);
            }}
            className={`p-4 rounded-xl border-2 text-left transition-all cursor-pointer relative ${
              selectedTemplate === 'COSMOGEEK'
                ? 'border-[#0080FF] bg-sky-50/70 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="w-9 h-9 rounded-lg bg-sky-100/70 text-[#003B73] flex items-center justify-center">
                <FilePlus2 className="w-5 h-5 text-[#0080FF]" />
              </div>
              {selectedTemplate === 'COSMOGEEK' && (
                <span className="w-2 h-2 rounded-full bg-[#0080FF]"></span>
              )}
            </div>
            <h3 className="font-bold text-xs text-slate-900 mt-2.5">3. Cosmogeek Certificate</h3>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
              Official Cosmogeek Internship Credential with director signature &amp; embedded QR code
            </p>
          </button>

        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 flex items-start gap-3 text-xs text-rose-700">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FORM 1: OFFER LETTER                                              */}
      {/* ------------------------------------------------------------------ */}
      {selectedTemplate === 'OFFER_LETTER' && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-[#0080FF]" />
                <span>Issue Employment Offer Letter</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates Word Document (.docx) matching official Cosmogeek layout with custom candidate terms
              </p>
            </div>
            <span className="px-2.5 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-[11px] font-semibold self-start sm:self-auto">
              Format: DOCX Letterhead
            </span>
          </div>

          <form onSubmit={handleOfferSubmit} className="space-y-6">
            
            {/* Candidate & Role */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>1. Candidate &amp; Offer Overview</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Candidate Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerRecipientName}
                    onChange={(e) => setOfferRecipientName(e.target.value)}
                    placeholder="e.g. Vedant Charde"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Letter Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerLetterDate}
                    onChange={(e) => setOfferLetterDate(e.target.value)}
                    placeholder="e.g. 30/06/2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Position / Internship Role <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerPosition}
                    onChange={(e) => setOfferPosition(e.target.value)}
                    placeholder="e.g. N8N Automation Intern"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Line <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerSubject}
                    onChange={(e) => setOfferSubject(e.target.value)}
                    placeholder="e.g. Employment Offer Letter For N8N Automation"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>
            </div>

            {/* Letter Body */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>2. Letter Introduction &amp; Commendation Body</span>
              </h3>
              <textarea
                rows={3}
                value={offerBody}
                onChange={(e) => setOfferBody(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
              />
            </div>

            {/* Timeline, Stipend & Terms */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>3. Internship Details, Stipend &amp; Terms</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Starting Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerStartDate}
                    onChange={(e) => setOfferStartDate(e.target.value)}
                    placeholder="01 July, 2026"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ending Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerEndDate}
                    onChange={(e) => setOfferEndDate(e.target.value)}
                    placeholder="01 January, 2027"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stipend <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={offerStipend}
                    onChange={(e) => setOfferStipend(e.target.value)}
                    placeholder="5,000 - 7,000 (Based on your Performance)"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Employment Bond Clause
                  </label>
                  <input
                    type="text"
                    value={offerBond}
                    onChange={(e) => setOfferBond(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Termination Clause
                  </label>
                  <input
                    type="text"
                    value={offerTermination}
                    onChange={(e) => setOfferTermination(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>4. Signatories &amp; Authority</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issuing Company Name
                  </label>
                  <input
                    type="text"
                    value={offerCompany}
                    onChange={(e) => setOfferCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Authorized Signatory Label
                  </label>
                  <input
                    type="text"
                    value={offerAuthSign}
                    onChange={(e) => setOfferAuthSign(e.target.value)}
                    placeholder="Authorized Person’s Sign"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating Official DOCX Document...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Generate &amp; Download Offer Letter (.docx)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FORM 2: COSMOS DIGITAL CERTIFICATE                                */}
      {/* ------------------------------------------------------------------ */}
      {selectedTemplate === 'COSMOS_DIGITAL' && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-5 h-5 text-teal-700" />
                <span>Issue Cosmos Digital Certificate</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Generates high-resolution Cosmos Digital certificate with embedded QR verification code &amp; director signature
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono self-start sm:self-auto">
              <span>Assigned Number:</span>
              <span className="font-bold text-teal-700">{loadingNumber ? '...' : nextNumber}</span>
            </div>
          </div>

          <form onSubmit={handleCosmosDigitalSubmit} className="space-y-6">
            
            {/* Student & Course */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>1. Student &amp; Course Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cdRecipientName}
                    onChange={(e) => setCdRecipientName(e.target.value)}
                    placeholder="e.g. Tejas Sanjayrao Dandare"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Email <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={cdRecipientEmail}
                    onChange={(e) => setCdRecipientEmail(e.target.value)}
                    placeholder="e.g. tejas.dandare@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course / Training Program <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cdCourseName}
                    onChange={(e) => setCdCourseName(e.target.value)}
                    placeholder="e.g. Python Basics"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Certificate Type <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cdCertificateType}
                    onChange={(e) => setCdCertificateType(e.target.value)}
                    placeholder="Certificate of Completion"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>2. Course Timeline &amp; Duration</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={cdStartDate}
                    onChange={(e) => setCdStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={cdEndDate}
                    onChange={(e) => setCdEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration Text <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cdDuration}
                    onChange={(e) => setCdDuration(e.target.value)}
                    placeholder="e.g. 3 - months"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <label className="block text-xs font-semibold text-slate-700">
                Course Description / Content Body
              </label>
              <textarea
                rows={3}
                value={cdContentBody}
                onChange={(e) => setCdContentBody(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
              />
            </div>

            {/* Authority */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>3. Issuing Authority</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Director Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={cdDirectorName}
                    onChange={(e) => setCdDirectorName(e.target.value)}
                    placeholder="Anirudh Hatwar"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Designation
                  </label>
                  <input
                    type="text"
                    disabled
                    value="Director"
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Rendering Certificate &amp; Generating QR Code...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Issue Cosmos Digital Certificate (PDF, DOCX &amp; QR)</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* FORM 3: COSMOGEEK CERTIFICATE (Option 3 - existing)                */}
      {/* ------------------------------------------------------------------ */}
      {selectedTemplate === 'COSMOGEEK' && (
        <div className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <FilePlus2 className="w-5 h-5 text-[#0080FF]" />
                <span>Issue Cosmogeek Certificate</span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatic unique certificate ID, embedded QR code &amp; corporate PDF placement
              </p>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-50 border border-sky-200 text-[#003B73] text-xs font-mono self-start sm:self-auto">
              <span>Assigned Number:</span>
              <span className="font-bold text-[#003B73]">{loadingNumber ? '...' : nextNumber}</span>
            </div>
          </div>

          <form onSubmit={handleCosmogeekSubmit} className="space-y-6">
            
            {/* Recipient Details Section */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>1. Student &amp; Internship Information</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0080FF] focus:ring-2 focus:ring-sky-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Email <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="e.g. yuvraj.dhumale@example.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Department <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Software Engineering"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Certificate Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={certificateType}
                    onChange={(e) => setCertificateType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  >
                    <option value="Certificate of Completion">Certificate of Completion</option>
                    <option value="Certificate of Internship">Certificate of Internship</option>
                    <option value="Certificate of Excellence">Certificate of Excellence</option>
                    <option value="Certificate of Appreciation">Certificate of Appreciation</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Timeline & Duration */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>2. Internship Timeline &amp; Duration</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Start Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    End Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Duration <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setManualDurationOverride(!manualDurationOverride)}
                      className="text-[10px] font-semibold text-[#0080FF] hover:text-[#003B73] hover:underline cursor-pointer"
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
                    className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF] ${
                      !manualDurationOverride ? 'opacity-85 font-semibold text-[#003B73]' : ''
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Editable Content Body */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-[#0080FF]" />
                  <span>3. Certificate Description (Content Body)</span>
                </h3>
                <button
                  type="button"
                  onClick={() => setContentBody(DEFAULT_CONTENT_BODY)}
                  className="text-[10px] font-semibold text-[#0080FF] hover:text-[#003B73] hover:underline cursor-pointer"
                >
                  Reset Default
                </button>
              </div>

              <textarea
                rows={3}
                value={contentBody}
                onChange={(e) => setContentBody(e.target.value)}
                placeholder="Enter custom commendation description..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
              />
            </div>

            {/* Company & Signatory */}
            <div className="space-y-4 pt-2 border-t border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <Building2 className="w-3.5 h-3.5 text-[#0080FF]" />
                <span>4. Issuing Company &amp; Signatory Authorities</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Issuing Company <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={issuingCompany}
                    onChange={(e) => setIssuingCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Authorized Signatory <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-[#0080FF]"
                  />
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-slate-200">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-6 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
      )}

    </div>
  );
};
