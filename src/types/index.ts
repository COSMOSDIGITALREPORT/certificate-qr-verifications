/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type CertificateStatus = 'VALID' | 'REVOKED';

export interface Certificate {
  id: string;
  certificateNumber: string; // e.g. "#26832"
  verificationId: string;    // unique alphanumeric identifier for public URL
  recipientName: string;
  recipientEmail?: string | null;
  designation: string;       // e.g. "Jr. Software Developer"
  department?: string | null;// e.g. "Software Engineering", "Full Stack"
  certificateType: string;   // e.g. "Certificate of Completion"
  internshipDuration: string;// e.g. "3 months"
  startDate: string;         // YYYY-MM-DD or DD/MM/YYYY
  endDate: string;           // YYYY-MM-DD or DD/MM/YYYY
  issuingCompany: string;    // "Cosmogeek Software Solutions Pvt. Ltd."
  signatoryName: string;     // "Anirudh Hatwar"
  signatoryRole?: string | null; // "Director / Authorized Signatory"
  initiatorName?: string | null;
  approverName?: string | null;
  approverDesignation?: string | null;
  issueLocation?: string | null;
  additionalNotes?: string | null;
  status: CertificateStatus;
  verificationUrl?: string;  // e.g. "http://192.168.101.73:3000/verify/cg-..."
  verificationPath: string;  // "/verify/cg-26832-..."
  pdfPath: string;           // "storage/certificates/26832.pdf"
  issuedAt: string;          // ISO string
  revokedAt?: string | null; // ISO string
  revocationReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicVerificationResult {
  valid: boolean;
  status: CertificateStatus | 'NOT_FOUND' | 'ERROR';
  certificate?: {
    certificateNumber: string;
    verificationId: string;
    recipientName: string;
    designation: string;
    department?: string;
    certificateType: string;
    internshipDuration: string;
    startDate: string;
    endDate: string;
    issuingCompany: string;
    signatoryName: string;
    signatoryRole?: string;
    initiatorName?: string;
    initiatorDesignation?: string;
    approverName?: string;
    approverDesignation?: string;
    issueLocation?: string;
    issuedAt: string;
    createdAt?: string;
    hasPdf: boolean;
    verificationUrl?: string;
  };
  revocation?: {
    revokedAt: string;
    reason?: string;
  };
  message?: string;
}

export interface CertificateInput {
  recipientName: string;
  recipientEmail?: string;
  designation: string;
  department?: string;
  certificateType: string;
  startDate: string;
  endDate: string;
  internshipDuration: string;
  issuingCompany: string;
  signatoryName: string;
  signatoryRole?: string;
  initiatorName?: string;
  approverName?: string;
  approverDesignation?: string;
  issueLocation?: string;
  additionalNotes?: string;
}

export interface DashboardMetrics {
  totalIssued: number;
  validCertificates: number;
  revokedCertificates: number;
  issuedThisMonth: number;
}

export interface AdminUser {
  id: string;
  username: string;
  createdAt: string;
}

export interface TemplateCoordinates {
  width: number;
  height: number;
  recipientName: { x: number; y: number; fontSize: number; align: 'center' | 'left' | 'right' };
  certificateType: { x: number; y: number; fontSize: number; align: 'center' | 'left' | 'right' };
  certificateNumber: { x: number; y: number; fontSize: number; align: 'center' | 'left' | 'right' };
  bodyText: { x: number; y: number; fontSize: number; maxWidth: number; lineHeight: number };
  datesText: { x: number; y: number; fontSize: number };
  qrCode: { x: number; y: number; size: number };
  signatory: { x: number; y: number; fontSize: number };
  companyLogo: { x: number; y: number; width: number; height: number };
}
