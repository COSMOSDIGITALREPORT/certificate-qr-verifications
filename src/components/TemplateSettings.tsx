/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  FileCheck,
  Download,
} from 'lucide-react';
import { api, getCertificateDownloadUrl } from '../services/api.js';

export const TemplateSettings: React.FC = () => {
  const [templateInfo, setTemplateInfo] = useState<{
    pageCount: number;
    width: number;
    height: number;
    orientation: string;
    templatePath: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTemplateInfo()
      .then(setTemplateInfo)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-[#0080FF]" />
          <span>Certificate PDF Template &amp; Coordinate Engine</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Master template specifications, visual dimensions, and dynamic field placement coordinates
        </p>
      </div>

      {/* Template Inspection Card */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 space-y-5 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-[#0080FF]" />
            <span>Master Template Inspection</span>
          </span>
          <span className="text-[10px] font-mono text-[#003B73] bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            PROTECTED VECTOR ASSET
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Inspecting master template...</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">Dimensions</span>
              <span className="font-mono font-bold text-slate-900 text-sm">
                {templateInfo?.width} × {templateInfo?.height} pt
              </span>
              <span className="text-[10px] text-slate-400 block">ISO A4 Landscape</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">Orientation</span>
              <span className="font-bold text-emerald-700 text-sm uppercase">
                {templateInfo?.orientation}
              </span>
              <span className="text-[10px] text-slate-400 block">Single Page Layout</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">Master File Path</span>
              <span className="font-mono text-slate-700 text-xs block truncate" title={templateInfo?.templatePath}>
                templates/certificate-template.pdf
              </span>
              <span className="text-[10px] text-emerald-600 font-medium block">Read-only protection</span>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-slate-500 text-[11px] block">QR Code Module</span>
              <span className="font-bold text-slate-900 text-sm">86 × 86 pt</span>
              <span className="text-[10px] text-emerald-600 font-medium block">ECC High (30% recovery)</span>
            </div>
          </div>
        )}

        {/* Dynamic Zone Coordinates Table */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Configured Dynamic Text &amp; QR Placement Coordinates
          </h3>

          <div className="rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Field Target</th>
                  <th className="py-2.5 px-3">X Anchor</th>
                  <th className="py-2.5 px-3">Y Baseline</th>
                  <th className="py-2.5 px-3">Font / Clear Width</th>
                  <th className="py-2.5 px-3">Clearance Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-[11px]">
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Certificate Number</td>
                  <td className="py-2 px-3 font-mono text-slate-600">PAGE_WIDTH - 210</td>
                  <td className="py-2 px-3 font-mono text-slate-600">PAGE_HEIGHT - 66</td>
                  <td className="py-2 px-3">Helvetica Bold (11pt)</td>
                  <td className="py-2 px-3 text-emerald-700 font-medium">Rect Mask (#FFFFFF)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Certificate Title</td>
                  <td className="py-2 px-3 font-mono text-slate-600">Center (PAGE_WIDTH / 2)</td>
                  <td className="py-2 px-3 font-mono text-slate-600">395 pt</td>
                  <td className="py-2 px-3">Times-Bold (24pt)</td>
                  <td className="py-2 px-3 text-emerald-700 font-medium">Rect Mask (#FFFFFF)</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Student Recipient Name</td>
                  <td className="py-2 px-3 font-mono text-slate-600">Center (PAGE_WIDTH / 2)</td>
                  <td className="py-2 px-3 font-mono text-slate-600">315 pt</td>
                  <td className="py-2 px-3">Times-Bold (20-30pt auto-scale)</td>
                  <td className="py-2 px-3 text-emerald-700 font-medium">Rect Mask + Gold Underline</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Descriptive Internship Body</td>
                  <td className="py-2 px-3 font-mono text-slate-600">Center (PAGE_WIDTH / 2)</td>
                  <td className="py-2 px-3 font-mono text-slate-600">229 - 265 pt</td>
                  <td className="py-2 px-3">Helvetica Regular (13pt)</td>
                  <td className="py-2 px-3 text-emerald-700 font-medium">3-line centered justification</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Verification QR Code</td>
                  <td className="py-2 px-3 font-mono text-slate-600">Center (PAGE_WIDTH / 2 - 43)</td>
                  <td className="py-2 px-3 font-mono text-slate-600">64 pt</td>
                  <td className="py-2 px-3">86 × 86 pt Image</td>
                  <td className="py-2 px-3 text-emerald-700 font-medium">White Quiet Frame + Gold border</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-semibold text-slate-900">Authorized Signatory</td>
                  <td className="py-2 px-3 font-mono text-slate-600">PAGE_WIDTH - 220</td>
                  <td className="py-2 px-3 font-mono text-slate-600">68 - 93 pt</td>
                  <td className="py-2 px-3">Director Signatory line</td>
                  <td className="py-2 px-3 text-emerald-700 font-medium">Clean signature alignment</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Coordinates are fully decoupled and can be updated without modifying core logic.
          </p>

          <a
            href={getCertificateDownloadUrl('26832')}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Download Reference Sample PDF (#26832)</span>
          </a>
        </div>
      </div>

    </div>
  );
};
