/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  initStore,
  subscribeStore,
  setCurrentUser,
  lockSession,
  AppData,
  getCurrentData,
} from './lib/store';
import { Header } from './components/Header';
import { CeoDashboard } from './components/CeoDashboard';
import { SupervisorView } from './components/SupervisorView';
import { SiteDetailView } from './components/SiteDetailView';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { StartupRoleGateway } from './components/StartupRoleGateway';

export default function App() {
  const [store, setStore] = useState<AppData>(getCurrentData());
  const [view, setView] = useState<'home' | 'site'>('home');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    initStore();
    const unsubscribe = subscribeStore((updated) => {
      setStore(updated);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleOpenSite = (siteId: string) => {
    setSelectedSiteId(siteId);
    setView('site');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackHome = () => {
    setView('home');
    setSelectedSiteId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // If locked, show the Start Up Dashboard to choose role with passcode verification
  if (store.isLocked) {
    return <StartupRoleGateway profiles={store.profiles} />;
  }

  const selectedSite = store.sites.find((s) => s.id === selectedSiteId);

  return (
    <div className="min-h-screen bg-[#f4f5f8] text-[#14213a] flex flex-col font-sans">
      {/* Offline Status Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white text-xs font-semibold py-1.5 px-4 text-center flex items-center justify-center gap-2 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span>Device is offline — Local storage and offline operations active</span>
        </div>
      )}

      {/* Main Brand Header */}
      <Header
        currentUser={store.currentUser}
        profiles={store.profiles}
        onSelectUser={setCurrentUser}
        isLive={store.isLive}
        isSupabaseMode={store.isSupabaseMode}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLock={lockSession}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-5">
        {view === 'site' && selectedSite ? (
          <SiteDetailView
            site={selectedSite}
            items={store.items}
            logs={store.logs}
            profiles={store.profiles}
            currentUser={store.currentUser}
            onBack={handleBackHome}
          />
        ) : store.currentUser.role === 'ceo' ? (
          <CeoDashboard
            sites={store.sites}
            items={store.items}
            logs={store.logs}
            profiles={store.profiles}
            currentUser={store.currentUser}
            onOpenSite={handleOpenSite}
          />
        ) : (
          <SupervisorView
            sites={store.sites}
            items={store.items}
            logs={store.logs}
            profiles={store.profiles}
            currentUser={store.currentUser}
            onOpenSite={handleOpenSite}
          />
        )}
      </main>

      {/* Cloud & Supabase Settings Modal */}
      <SupabaseSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        isLive={store.isLive}
        isSupabaseMode={store.isSupabaseMode}
        errorMessage={store.error}
      />
    </div>
  );
}
