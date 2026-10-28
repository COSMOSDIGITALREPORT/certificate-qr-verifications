/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Certificate,
  CertificateInput,
  DashboardMetrics,
  PublicVerificationResult,
  AdminUser,
} from '../types/index.js';

const TOKEN_STORAGE_KEY = 'cg_admin_session_token';

// Configurable backend API base URL (defaults to relative '/' on same host/port)
const API_BASE_URL = (
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_API_URL) ||
  ''
).replace(/\/$/, '');

export function getAppVerificationBaseUrl(): string {
  const envUrl = (
    (typeof import.meta !== 'undefined' && import.meta.env?.APP_BASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.NEXT_PUBLIC_APP_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_BASE_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.APP_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_PUBLIC_APP_URL) ||
    ''
  ).trim().replace(/\/$/, '');

  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl;
  }

  if (typeof window !== 'undefined' && window.location.origin) {
    const origin = window.location.origin;
    if (!origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }

  if (envUrl) return envUrl;
  return typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'http://localhost:3000';
}

export async function fetchServerConfig(): Promise<{ appBaseUrl: string; lanIp: string | null; isLocalhost: boolean; port: number }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/config`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    // ignore
  }
  return { appBaseUrl: getAppVerificationBaseUrl(), lanIp: null, isLocalhost: true, port: 3000 };
}

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // Ignore storage write issues in private/restricted contexts
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers as Record<string, string> || {}),
  };

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    credentials: 'include',
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      setStoredToken(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cg:unauthorized'));
      }
    }
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }

  return data as T;
}

export const api = {
  getToken: getStoredToken,
  setToken: setStoredToken,
  getBaseUrl: getAppVerificationBaseUrl,

  // Auth
  async login(username: string, password: string): Promise<{ success: boolean; token: string; user: AdminUser }> {
    const res = await fetchJson<{ success: boolean; token: string; user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    if (res?.token) {
      setStoredToken(res.token);
    }

    return res;
  },

  async logout(): Promise<void> {
    try {
      await fetchJson('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<{ user: AdminUser | null }> {
    try {
      return await fetchJson<{ user: AdminUser }>('/api/auth/me');
    } catch {
      setStoredToken(null);
      return { user: null };
    }
  },

  // Dashboard
  async getMetrics(): Promise<DashboardMetrics> {
    return fetchJson('/api/dashboard/metrics');
  },

  // Certificates
  async getCertificates(params?: { search?: string; status?: string; limit?: number; offset?: number }): Promise<{ certificates: Certificate[]; total: number }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.status) query.set('status', params.status);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    
    return fetchJson(`/api/certificates?${query.toString()}`);
  },

  async getNextCertificateNumber(): Promise<string> {
    const res = await fetchJson<{ nextNumber: string }>('/api/certificates/next-number');
    return res.nextNumber;
  },

  async getCertificateById(id: string): Promise<Certificate> {
    return fetchJson(`/api/certificates/${id}`);
  },

  async generateCertificate(input: CertificateInput): Promise<{
    success: boolean;
    certificate: Certificate;
    verificationUrl: string;
    downloadUrl: string;
    qrDataUrl: string;
    isLocalhostUrl?: boolean;
    warning?: string;
  }> {
    return fetchJson('/api/certificates/generate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  async revokeCertificate(id: string, reason?: string): Promise<{ success: boolean; certificate: Certificate }> {
    return fetchJson(`/api/certificates/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  },

  // Public Verification
  async verifyCertificate(verificationId: string): Promise<PublicVerificationResult> {
    const fullUrl = `${API_BASE_URL}/api/verify/${encodeURIComponent(verificationId)}`;
    const res = await fetch(fullUrl);
    const data = await res.json().catch(() => ({}));
    return data as PublicVerificationResult;
  },

  // Template inspection
  async getTemplateInfo(): Promise<{
    pageCount: number;
    width: number;
    height: number;
    orientation: string;
    templatePath: string;
  }> {
    return fetchJson('/api/template/info');
  },
};
