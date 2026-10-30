/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ExternalLink,
  Eye,
  XCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';
import { api, getCertificateDownloadUrl } from '../services/api.js';
import { Certificate } from '../types/index.js';
import { formatDateHumanReadable, formatDateToIndianStandard } from '../../server/validation.js';

interface CertificateTableProps {
  onOpenDetail: (cert: Certificate) => void;
  onOpenRevoke: (cert: Certificate) => void;
  onOpenDelete: (cert: Certificate) => void;
  onOpenVerification: (verificationId: string) => void;
  refreshTrigger?: number;
}

export const CertificateTable: React.FC<CertificateTableProps> = ({
  onOpenDetail,
  onOpenRevoke,
  onOpenDelete,
  onOpenVerification,
  refreshTrigger,
}) => {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const loadCertificates = async () => {
    setLoading(true);
    try {
      const res = await api.getCertificates({
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      setCertificates(res.certificates);
      setTotal(res.total);
    } catch (err) {
      console.error('Failed to load certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCertificates();
  }, [search, statusFilter, page, refreshTrigger]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      
      {/* Header & Search Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0080FF]" />
            <span>All Issued Certificates</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search, inspect, download official PDFs, or manage credential revocation
          </p>
        </div>

        <button
          onClick={loadCertificates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 text-xs border border-slate-200 shadow-xs transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh List</span>
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div className="rounded-xl bg-white border border-slate-200 p-3.5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between shadow-xs">
        
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by student name, certificate # (#26832), or designation..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">All Statuses ({total})</option>
            <option value="VALID">Valid Only</option>
            <option value="REVOKED">Revoked Only</option>
          </select>
        </div>

      </div>

      {/* Table Container */}
      <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin mx-auto mb-3"></div>
            Loading certificate registry...
          </div>
        ) : certificates.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs">
            No certificates found matching your search or filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-semibold">Cert #</th>
                  <th className="py-3 px-4 font-semibold">Student Name</th>
                  <th className="py-3 px-4 font-semibold">Designation</th>
                  <th className="py-3 px-4 font-semibold">Timeline (Start - End)</th>
                  <th className="py-3 px-4 font-semibold">Issue Date</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {certificates.map((cert) => {
                  const isValid = cert.status === 'VALID';
                  const cleanNum = cert.certificateNumber.replace(/[^a-zA-Z0-9]/g, '');
                  return (
                    <tr key={cert.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Number */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {cert.certificateNumber}
                      </td>

                      {/* Recipient */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                        <div>{cert.recipientName}</div>
                        {cert.recipientEmail && (
                          <div className="text-[10px] text-slate-400 font-mono">{cert.recipientEmail}</div>
                        )}
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4 text-slate-700 whitespace-nowrap">
                        <div>{cert.designation}</div>
                        <div className="text-[10px] text-slate-500">{cert.internshipDuration}</div>
                      </td>

                      {/* Dates */}
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {formatDateToIndianStandard(cert.startDate)} - {formatDateToIndianStandard(cert.endDate)}
                      </td>

                      {/* Issue Date */}
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {formatDateHumanReadable(cert.issuedAt) || formatDateToIndianStandard(cert.issuedAt.substring(0, 10))}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isValid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            VALID
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            REVOKED
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View details */}
                          <button
                            onClick={() => onOpenDetail(cert)}
                            title="View Full Metadata & QR"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Download PDF */}
                          <a
                            href={getCertificateDownloadUrl(cleanNum)}
                            target="_blank"
                            rel="noreferrer"
                            title="Download PDF"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          {/* Open verification */}
                          <button
                            onClick={() => onOpenVerification(cert.verificationId)}
                            title="Open Public Verification Page"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke */}
                          {isValid ? (
                            <button
                              onClick={() => onOpenRevoke(cert)}
                              title="Revoke Certificate"
                              className="p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 transition-colors cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-rose-600 font-semibold italic px-1">Revoked</span>
                          )}

                          {/* Permanent Delete */}
                          <button
                            onClick={() => onOpenDelete(cert)}
                            title="Permanently Delete Certificate"
                            className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-semibold text-slate-900">{Math.min(total, (page - 1) * pageSize + 1)}</span> to{' '}
            <span className="font-semibold text-slate-900">{Math.min(total, page * pageSize)}</span> of{' '}
            <span className="font-semibold text-slate-900">{total}</span> records
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono text-slate-700">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1 rounded bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-600 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
