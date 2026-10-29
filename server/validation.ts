/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

export const DEFAULT_CONTENT_BODY =
  'The professional has demonstrated a satisfactory initiative and a commitment for deepening their skills and advancing their career. Well done!';

export const CertificateInputSchema = z.object({
  recipientName: z.string().trim().min(2, 'Recipient name must have at least 2 characters'),
  recipientEmail: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  designation: z.string().trim().min(2, 'Designation / role is required'),
  department: z.string().trim().optional(),
  certificateType: z.string().trim().min(2, 'Certificate type is required').default('Certificate of Completion'),
  startDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be formatted YYYY-MM-DD'),
  endDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be formatted YYYY-MM-DD'),
  internshipDuration: z.string().trim().min(1, 'Internship duration is required'),
  issuingCompany: z.string().trim().min(2, 'Issuing company name is required').default('Cosmogeek Software Solutions Pvt. Ltd.'),
  signatoryName: z.string().trim().min(2, 'Authorized signatory name is required').default('Anirudh Hatwar'),
  signatoryRole: z.string().trim().optional().default('Director / Authorized Signatory'),
  initiatorName: z.string().trim().optional(),
  approverName: z.string().trim().optional(),
  approverDesignation: z.string().trim().optional(),
  issueLocation: z.string().trim().optional().default('Nagpur, Maharashtra, India'),
  contentBody: z.string().trim().optional(),
  additionalNotes: z.string().trim().optional(),
}).refine((data) => {
  const start = new Date(data.startDate).getTime();
  const end = new Date(data.endDate).getTime();
  return !isNaN(start) && !isNaN(end) && end >= start;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
});

export const LoginInputSchema = z.object({
  username: z.string().trim().min(3, 'Username must be at least 3 characters'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const RevokeInputSchema = z.object({
  reason: z.string().trim().max(500, 'Revocation reason must not exceed 500 characters').optional(),
});

/**
 * Calculates human-readable duration between start and end date
 */
export function calculateInternshipDuration(startDateStr: string, endDateStr: string): string {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return '';
  }

  // Calculate difference in months and days
  let months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
  const dayDiff = end.getDate() - start.getDate();
  
  if (dayDiff >= 20) {
    months += 1;
  } else if (dayDiff < -10 && months > 0) {
    months -= 1;
  }

  if (months <= 0) {
    const diffMs = end.getTime() - start.getTime();
    const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    const weeks = Math.round(diffDays / 7);
    if (weeks >= 1) {
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'}`;
    }
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }

  return `${months} ${months === 1 ? 'month' : 'months'}`;
}

/**
 * Normalizes date to DD/MM/YYYY for Indian corporate certificate standard
 */
export function formatDateToIndianStandard(isoDateString: string): string {
  if (!isoDateString) return '';
  const dateOnly = isoDateString.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  return isoDateString;
}

/**
 * Formats ISO date (e.g. 2026-07-10 or 2026-07-10T...) to readable "10 July 2026"
 */
export function formatDateHumanReadable(isoDateString?: string | null): string {
  if (!isoDateString) return '';
  const dateOnly = isoDateString.split('T')[0];
  const parts = dateOnly.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const monthIndex = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
      return `${day} ${months[monthIndex]} ${year}`;
    }
  }
  return isoDateString;
}

