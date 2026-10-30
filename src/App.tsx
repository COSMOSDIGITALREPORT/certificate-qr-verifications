/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.js';
import { AdminLogin } from './components/AdminLogin.js';
import { DashboardOverview } from './components/DashboardOverview.js';
import { CertificateForm } from './components/CertificateForm.js';
import { CertificateTable } from './components/CertificateTable.js';
import { VerificationPage } from './components/VerificationPage.js';
import { TemplateSettings } from './components/TemplateSettings.js';
import { CertificateDetailModal } from './components/CertificateDetailModal.js';
import { RevokeModal } from './components/RevokeModal.js';
import { DeleteModal } from './components/DeleteModal.js';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { api } from './services/api.js';
import { AdminUser, Certificate } from './types/index.js';

export default function App() {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Modals state
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [certToRevoke, setCertToRevoke] = useState<Certificate | null>(null);
  const [certToDelete, setCertToDelete] = useState<Certificate | null>(null);

  // Global UI notifications and live refresh triggers
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Auto-dismiss notification after 5 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Verification Portal state
  const [activeVerificationId, setActiveVerificationId] = useState<string>('cg-26832-7a8e');

  // Check URL pathname for direct public verification routing (/verify or /verify/:id)
  useEffect(() => {
    const parseRoute = () => {
      const path = window.location.pathname;
      if (path === '/verify' || path === '/verify/') {
        setCurrentTab('verify');
      } else if (path.startsWith('/verify/')) {
        const verId = decodeURIComponent(path.slice('/verify/'.length)).replace(/\/$/, '').trim();
        if (verId) {
          setActiveVerificationId(verId);
        }
        setCurrentTab('verify');
      }
    };

    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, []);

  // Check session authentication on initial mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await api.getMe();
        if (res?.user) {
          setAdminUser(res.user);
        } else {
          setAdminUser(null);
        }
      } catch {
        setAdminUser(null);
      } finally {
        setAuthChecked(true);
      }
    };
    checkAuth();

    const handleUnauthorized = () => {
      setAdminUser(null);
    };
    window.addEventListener('cg:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('cg:unauthorized', handleUnauthorized);
  }, []);

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    }
    setAdminUser(null);
    setCurrentTab('login');
  };

  const handleNavigate = (tab: string, certIdOrVerificationId?: string) => {
    if (tab === 'verify') {
      if (certIdOrVerificationId) {
        setActiveVerificationId(certIdOrVerificationId);
        const targetPath = `/verify/${encodeURIComponent(certIdOrVerificationId)}`;
        if (window.location.pathname !== targetPath) {
          window.history.pushState({}, '', targetPath);
        }
      } else {
        if (!window.location.pathname.startsWith('/verify')) {
          window.history.pushState({}, '', '/verify');
        }
      }
    } else {
      if (window.location.pathname.startsWith('/verify')) {
        window.history.pushState({}, '', '/');
      }
    }
    setCurrentTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If user navigated directly to /verify or selected 'verify' tab, show public verification portal
  if (currentTab === 'verify') {
    return (
      <div className="min-h-screen bg-slate-50">
        <VerificationPage
          initialVerificationId={activeVerificationId}
          onBackToDashboard={() => {
            handleNavigate(adminUser ? 'dashboard' : 'login');
          }}
          isAdminLoggedIn={!!adminUser}
        />
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-emerald-100 selection:text-emerald-900">
      
      {/* Top Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={handleNavigate}
        adminUser={adminUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Global Notification Banner */}
        {notification && (
          <div
            className={`mb-5 p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-xs transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            <div className="flex items-center gap-2">
              {notification.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="p-1 rounded-md hover:bg-black/5 cursor-pointer text-slate-500"
              title="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {!authChecked ? (
          <div className="min-h-[50vh] flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin"></div>
          </div>
        ) : !adminUser ? (
          <AdminLogin
            onLoginSuccess={(user) => {
              setAdminUser(user);
              setCurrentTab('dashboard');
            }}
            onGoToPublicVerification={() => {
              handleNavigate('verify');
            }}
          />
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardOverview
                onNavigate={handleNavigate}
                onOpenDetail={setSelectedCert}
                onOpenRevoke={setCertToRevoke}
                onOpenDelete={setCertToDelete}
                refreshTrigger={refreshTrigger}
              />
            )}

            {currentTab === 'generate' && (
              <CertificateForm
                onSuccess={() => {
                  setRefreshTrigger((prev) => prev + 1);
                }}
                onOpenVerification={(verId) => {
                  setActiveVerificationId(verId);
                  setCurrentTab('verify');
                }}
              />
            )}

            {currentTab === 'certificates' && (
              <CertificateTable
                onOpenDetail={setSelectedCert}
                onOpenRevoke={setCertToRevoke}
                onOpenDelete={setCertToDelete}
                onOpenVerification={(verId) => {
                  setActiveVerificationId(verId);
                  setCurrentTab('verify');
                }}
                refreshTrigger={refreshTrigger}
              />
            )}

            {currentTab === 'template' && <TemplateSettings />}
          </>
        )}
      </main>

      {/* Modals */}
      <CertificateDetailModal
        certificate={selectedCert}
        onClose={() => setSelectedCert(null)}
        onOpenVerification={(verId) => {
          setSelectedCert(null);
          setActiveVerificationId(verId);
          setCurrentTab('verify');
        }}
        onOpenRevoke={(cert) => {
          setSelectedCert(null);
          setCertToRevoke(cert);
        }}
        onOpenDelete={(cert) => {
          setSelectedCert(null);
          setCertToDelete(cert);
        }}
      />

      <RevokeModal
        certificate={certToRevoke}
        onClose={() => setCertToRevoke(null)}
        onRevokedSuccess={(updated) => {
          setSelectedCert(updated);
          setRefreshTrigger((prev) => prev + 1);
          setNotification({
            type: 'success',
            message: `Certificate ${updated.certificateNumber} (${updated.recipientName}) has been marked as REVOKED.`,
          });
        }}
      />

      <DeleteModal
        certificate={certToDelete}
        onClose={() => setCertToDelete(null)}
        onDeletedSuccess={(deleted) => {
          setCertToDelete(null);
          setSelectedCert(null);
          setRefreshTrigger((prev) => prev + 1);
          setNotification({
            type: 'success',
            message: `Certificate ${deleted.certificateNumber} (${deleted.recipientName}) was permanently deleted from the database and storage.`,
          });
        }}
      />

      {/* Corporate Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-medium text-slate-700">
            © {currentYear} Cosmogeek Software Solutions Pvt. Ltd. • All Rights Reserved
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <span>ISO 9001:2015 Certified</span>
            <span>•</span>
            <span>QR Digital Credential Pipeline</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
