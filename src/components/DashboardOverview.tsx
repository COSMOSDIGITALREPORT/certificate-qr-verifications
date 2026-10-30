/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  CalendarDays,
  FilePlus2,
  TableProperties,
  Download,
  ExternalLink,
  RefreshCw,
  QrCode,
  Trash2,
} from 'lucide-react';
import { api, getCertificateDownloadUrl } from '../services/api.js';
import { DashboardMetrics, Certificate } from '../types/index.js';
import { formatDateHumanReadable, formatDateToIndianStandard } from '../../server/validation.js';

interface DashboardOverviewProps {
  onNavigate: (tab: string, certId?: string) => void;
  onOpenDetail: (cert: Certificate) => void;
  onOpenRevoke: (cert: Certificate) => void;
  onOpenDelete?: (cert: Certificate) => void;
  refreshTrigger?: number;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  onNavigate,
  onOpenDetail,
  onOpenRevoke,
  onOpenDelete,
  refreshTrigger,
}) => {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalIssued: 0,
    validCertificates: 0,
    revokedCertificates: 0,
    issuedThisMonth: 0,
  });
  const [recentCertificates, setRecentCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, certs] = await Promise.all([
        api.getMetrics(),
        api.getCertificates({ limit: 5 }),
      ]);
      setMetrics(m);
      setRecentCertificates(certs.certificates);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>Cosmogeek Certificate Command Center</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Official automated issuance, PDF template compilation &amp; QR verification registry
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => onNavigate('generate')}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#003B73] hover:bg-[#002b54] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>Issue Certificate</span>
          </button>
          
          <button
            onClick={loadData}
            title="Refresh metrics"
            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Issued */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Issued</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-slate-900">{metrics.totalIssued}</span>
            <span className="text-xs text-slate-500 ml-2">records</span>
          </div>
          <div className="mt-1.5 text-[11px] text-slate-500">Lifetime verified credentials</div>
        </div>

        {/* Valid Certificates */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Valid Certificates</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-emerald-600">{metrics.validCertificates}</span>
            <span className="text-xs text-slate-500 ml-2">active</span>
          </div>
          <div className="mt-1.5 text-[11px] text-emerald-700 font-medium">Active QR verification status</div>
        </div>

        {/* Revoked Certificates */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Revoked</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-rose-600">{metrics.revokedCertificates}</span>
            <span className="text-xs text-slate-500 ml-2">invalidated</span>
          </div>
          <div className="mt-1.5 text-[11px] text-rose-700 font-medium">Flagged immediately in portal</div>
        </div>

        {/* Issued This Month */}
        <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-amber-600">{metrics.issuedThisMonth}</span>
            <span className="text-xs text-slate-500 ml-2">certificates</span>
          </div>
          <div className="mt-1.5 text-[11px] text-amber-700 font-medium">Current calendar cycle</div>
        </div>

      </div>

      {/* Recent Certificates Section */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recently Issued Certificates</h2>
            <p className="text-xs text-slate-500">Latest students and internship completion records</p>
          </div>
          <button
            onClick={() => onNavigate('certificates')}
            className="text-xs font-semibold text-[#0080FF] hover:text-[#003B73] flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View All</span>
            <TableProperties className="w-3.5 h-3.5" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading certificate registry...</div>
        ) : recentCertificates.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs bg-slate-50 rounded-xl border border-slate-200">
            No certificates issued yet. Click &quot;Issue Certificate&quot; to generate your first credential.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">Cert #</th>
                  <th className="py-2.5 px-3 font-semibold">Student Name</th>
                  <th className="py-2.5 px-3 font-semibold">Designation</th>
                  <th className="py-2.5 px-3 font-semibold">Duration</th>
                  <th className="py-2.5 px-3 font-semibold">Issue Date</th>
                  <th className="py-2.5 px-3 font-semibold">Status</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {recentCertificates.map((cert) => (
                  <tr key={cert.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {cert.certificateNumber}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {cert.recipientName}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {cert.designation}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {cert.internshipDuration}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {formatDateHumanReadable(cert.issuedAt) || formatDateToIndianStandard(cert.issuedAt.substring(0, 10))}
                    </td>
                    <td className="py-3 px-3">
                      {cert.status === 'VALID' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                          VALID
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-2.5 h-2.5 text-rose-600" />
                          REVOKED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenDetail(cert)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          View
                        </button>
                        <a
                          href={getCertificateDownloadUrl(cert.certificateNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                          title="Download PDF"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => onNavigate('verify', cert.verificationId)}
                          className="p-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                          title="Open Public Verification"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                        {onOpenDelete && (
                          <button
                            onClick={() => onOpenDelete(cert)}
                            className="p-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                            title="Permanently Delete Certificate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Verification & Architecture Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>QR Verification Security Pipeline</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Every certificate features an individual high-contrast QR code pointing to its canonical URL:
            <code className="block mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-emerald-700">
              http://localhost:3000/verify/cg-&lt;number&gt;-&lt;hash&gt;
            </code>
            Verification is executed against the persistent SQLite database at query time, guaranteeing accuracy.
          </p>
        </div>

        <div className="rounded-2xl bg-white border border-slate-200 p-5 space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>Official Cosmogeek Reference Template</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Preserves the original Cosmogeek Software Solutions master certificate with ISO 9001:2015 certification branding, authorized signatory <strong className="text-slate-800">Anirudh Hatwar</strong>, and clean dynamic text clearance to prevent overlapping text.
          </p>
        </div>

      </div>

    </div>
  );
};
