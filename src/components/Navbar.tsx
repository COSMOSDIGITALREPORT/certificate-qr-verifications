/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  FilePlus2,
  TableProperties,
  SlidersHorizontal,
  LogOut,
  Menu,
  X,
  UserCheck,
} from 'lucide-react';
import { AdminUser } from '../types/index.js';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  adminUser: AdminUser | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  adminUser,
  onLogout,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Award },
    { id: 'generate', label: 'Document & Certificate Generator', icon: FilePlus2 },
    { id: 'certificates', label: 'All Certificates', icon: TableProperties },
    { id: 'verify', label: 'Verification Portal', icon: ShieldCheck },
    { id: 'template', label: 'Template & Coordinates', icon: SlidersHorizontal },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-slate-200/90 text-slate-800 sticky top-0 z-40 shadow-xs transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Company Title */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none py-1 group"
            onClick={() => onSelectTab('dashboard')}
            title="Cosmogeek Certificate Management"
          >
            <img
              src="/assets/cosmogeek-emblem.png"
              alt="Cosmogeek Emblem"
              className="h-10 w-auto max-h-10 object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
            />
            <div className="flex flex-col justify-center">
              <img
                src="/assets/cosmogeek-wordmark.png"
                alt="Cosmogeek Software Solutions Pvt. Ltd."
                className="h-4.5 w-auto object-contain hidden sm:block"
              />
              <div className="sm:hidden font-extrabold text-sm tracking-wider text-slate-900 leading-tight">
                COSMOGEEK
                <span className="block text-[10px] font-medium text-slate-500 tracking-normal">
                  Software Solutions
                </span>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-semibold text-sky-800 tracking-wider uppercase mt-0.5">
                Verification &amp; Issuance Registry
              </span>
            </div>
          </div>

          {/* Desktop Nav Items */}
          {adminUser && (
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectTab(item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-50 text-[#003B73] border border-sky-200/90 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0080FF]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          )}

          {/* User actions */}
          <div className="hidden md:flex items-center gap-3">
            {adminUser ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 shadow-xs">
                  <UserCheck className="w-3.5 h-3.5 text-[#0080FF]" />
                  <span className="font-semibold">{adminUser.username}</span>
                </div>
                <button
                  onClick={onLogout}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:bg-rose-100 bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                  title="Logout from Admin"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => onSelectTab('login')}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-[#003B73] hover:bg-[#002b54] text-white transition-colors shadow-xs cursor-pointer"
              >
                Admin Login
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1 shadow-md">
          {adminUser && (
            <>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-sky-50 text-[#003B73] border border-sky-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#0080FF]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
              <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-slate-700 font-medium">
                  <UserCheck className="w-3.5 h-3.5 text-[#0080FF]" />
                  <span>Admin: {adminUser.username}</span>
                </div>
                <button
                  onClick={() => {
                    onLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 py-1.5 px-3 rounded-lg bg-rose-50 border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </>
          )}

          {!adminUser && (
            <button
              onClick={() => {
                onSelectTab('login');
                setMobileMenuOpen(false);
              }}
              className="w-full py-2.5 text-center text-sm font-semibold bg-[#003B73] hover:bg-[#002b54] text-white rounded-lg shadow-sm"
            >
              Admin Login
            </button>
          )}
        </div>
      )}
    </header>
  );
};
