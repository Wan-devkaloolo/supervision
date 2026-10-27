import React, { useState } from 'react';
import { Database, UserCheck, ChevronDown, Check, LogOut, Users, Sparkles, Lock, KeyRound } from 'lucide-react';
import { Profile } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  currentUser: Profile;
  profiles: Profile[];
  onSelectUser: (id: string) => void;
  isLive: boolean;
  isSupabaseMode: boolean;
  onOpenSettings: () => void;
  onLock: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  profiles,
  onSelectUser,
  isLive,
  isSupabaseMode,
  onOpenSettings,
  onLock,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#0B1F3A] text-white shadow-md border-b border-white/10 px-3 sm:px-4 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & App Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Official Sovereign Touch Logo */}
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#0B1F3A] border-2 border-[#C9A24B] flex items-center justify-center shadow-md flex-shrink-0">
            <img
              src="/assets/aistudio/WhatsApp_Image_2026-10-22_at_08.53.21_7bd50307.jpeg"
              alt="Sovereign Touch Home Care Logo"
              className="w-full h-full object-cover"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xs sm:text-sm tracking-wider text-white leading-tight">
                SOVEREIGN TOUCH
              </h1>
              <span className="hidden sm:inline-block px-1.5 py-0.2 bg-[#C9A24B] text-[#0B1F3A] text-[10px] font-black rounded uppercase tracking-wider">
                {currentUser.role === 'ceo' ? 'ADMIN' : 'OPS'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#b9c3d9]">
              <span className="font-medium truncate max-w-[120px] sm:max-w-none text-white">
                {currentUser.full_name}
              </span>
              <span className="text-[#4a5f86]">·</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-bold rounded uppercase tracking-wider ${
                currentUser.role === 'ceo'
                  ? 'bg-[#C9A24B]/20 text-[#C9A24B] border border-[#C9A24B]/40'
                  : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
              }`}>
                {currentUser.role === 'ceo' ? 'CEO' : 'SUPERVISOR'}
              </span>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Realtime Live Status Indicator */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/25 border border-white/10 hover:border-white/20 transition-all text-[11px] font-mono text-[#b9c3d9]"
            title="Database status (click to configure)"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSupabaseMode
                  ? isLive
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
            />
            <span className="hidden sm:inline">
              {isSupabaseMode ? (isLive ? 'cloud live' : 'reconnecting') : 'local live'}
            </span>
          </button>

          {/* PWA Install Button */}
          <PWAInstallButton />

          {/* Lock / Switch Role Button */}
          <button
            onClick={onLock}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#C9A24B]/15 hover:bg-[#C9A24B]/25 border border-[#C9A24B]/40 text-xs font-semibold text-[#C9A24B] transition-all active:scale-95 shadow-xs"
            title="Lock dashboard & return to Role Selection Gateway"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lock / Switch</span>
          </button>

          {/* User Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-white transition-all active:scale-95"
              aria-label="User Menu"
              title="Switch user"
            >
              <Users className="w-4 h-4 text-gray-300" />
            </button>

            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white text-[#14213a] shadow-2xl border border-gray-100 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                        Active Profiles
                      </p>
                      <p className="text-xs font-semibold text-[#0B1F3A]">
                        Switch account
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLock();
                      }}
                      className="p-1 text-gray-400 hover:text-[#0B1F3A]"
                      title="Lock"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="py-1 space-y-0.5 max-h-56 overflow-y-auto">
                    {profiles.map((profile) => {
                      const isSelected = profile.id === currentUser.id;
                      return (
                        <button
                          key={profile.id}
                          onClick={() => {
                            onSelectUser(profile.id);
                            setShowUserMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-[#0B1F3A] text-white font-semibold'
                              : 'hover:bg-gray-100 text-gray-800'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-2 h-2 rounded-full ${
                              profile.role === 'ceo' ? 'bg-[#C9A24B]' : 'bg-blue-500'
                            }`} />
                            <div className="truncate">
                              <p className="truncate font-medium">{profile.full_name}</p>
                              <p className={`text-[10px] ${isSelected ? 'text-gray-300' : 'text-gray-400'} uppercase font-mono`}>
                                PIN: {profile.passcode || '****'}
                              </p>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-[#C9A24B] flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="border-t border-gray-100 pt-1 mt-1 space-y-0.5">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onLock();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-red-600 hover:bg-red-50 font-semibold"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Lock & Choose Role
                    </button>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenSettings();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-gray-600 hover:bg-gray-100 font-medium"
                    >
                      <Database className="w-3.5 h-3.5 text-gray-500" />
                      Database & Cloud Sync
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
