import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { Profile } from '../types';
import { verifyAndUnlock } from '../lib/store';

interface Props {
  profiles: Profile[];
}

export const StartupRoleGateway: React.FC<Props> = ({ profiles }) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [pin, setPin] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [showSupervisorPicker, setShowSupervisorPicker] = useState(false);
  const [showPinHint, setShowPinHint] = useState(false);

  const ceoProfile = profiles.find((p) => p.role === 'ceo') || profiles[0];
  const supervisors = profiles.filter((p) => p.role === 'supervisor');

  const handleSelectRole = (profile: Profile) => {
    setSelectedProfile(profile);
    setPin('');
    setErrorMessage('');
    setShowSupervisorPicker(false);
  };

  const handleKeypadPress = (val: string) => {
    if (pin.length < 8) {
      const nextPin = pin + val;
      setPin(nextPin);
      setErrorMessage('');
      // Auto verify when 4 digits entered for default 4-digit PINs
      if (nextPin.length === 4 && selectedProfile) {
        attemptLogin(selectedProfile.id, nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setErrorMessage('');
  };

  const handleClear = () => {
    setPin('');
    setErrorMessage('');
  };

  const attemptLogin = (profileId: string, inputPin: string) => {
    const res = verifyAndUnlock(profileId, inputPin);
    if (!res.success) {
      setIsShaking(true);
      setErrorMessage(res.message || 'Incorrect passcode');
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !pin) return;
    attemptLogin(selectedProfile.id, pin);
  };

  const quickFillPasscode = () => {
    if (!selectedProfile) return;
    const expected = selectedProfile.passcode || (selectedProfile.role === 'ceo' ? '9999' : '1001');
    setPin(expected);
    attemptLogin(selectedProfile.id, expected);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B1F3A] via-[#08172c] to-[#040b15] text-white flex flex-col items-center justify-center p-4 selection:bg-[#C9A24B] selection:text-[#0B1F3A]">
      <div className="w-full max-w-md my-auto">
        {/* Brand Card Header */}
        <div className="text-center mb-6 space-y-2">
          {/* Official Logo Container */}
          <div className="inline-block p-1 bg-gradient-to-br from-[#C9A24B] via-[#E2C37B] to-[#9C7723] rounded-3xl shadow-2xl">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[22px] overflow-hidden bg-[#0B1F3A] flex items-center justify-center p-1">
              <img
                src="/assets/aistudio/WhatsApp_Image_2026-10-22_at_08.53.21_7bd50307.jpeg"
                alt="Sovereign Touch Home Care Logo"
                className="w-full h-full object-cover rounded-xl"
              />
            </div>
          </div>

          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wider text-white">
              SOVEREIGN TOUCH
            </h1>
            <p className="text-xs font-bold tracking-widest text-[#C9A24B] uppercase">
              HOME CARE · SITE OPS
            </p>
            <p className="text-[11px] text-gray-400 italic mt-0.5">
              Come Home to Clean™
            </p>
          </div>
        </div>

        {/* STEP 1: CHOOSE ROLE */}
        {!selectedProfile && !showSupervisorPicker && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center border-b border-white/10 pb-3">
              <h2 className="text-base font-bold text-white">Choose Your Portal</h2>
              <p className="text-xs text-gray-300">
                Select your operational role to unlock dashboard
              </p>
            </div>

            {/* CEO / Admin Option */}
            <div
              onClick={() => handleSelectRole(ceoProfile)}
              className="group p-4 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 hover:from-[#C9A24B]/20 hover:to-white/10 border border-[#C9A24B]/30 hover:border-[#C9A24B] transition-all cursor-pointer shadow-md active:scale-[0.99] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-[#C9A24B] text-[#0B1F3A] flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-white group-hover:text-[#C9A24B] transition-colors">
                      CEO & Admin
                    </h3>
                    <span className="px-2 py-0.5 bg-[#C9A24B] text-[#0B1F3A] text-[10px] font-black rounded-full uppercase tracking-wider">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                    Live Board, Activity Feed, Site Management & Reports
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#C9A24B] group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            {/* Site Supervisors Option */}
            <div
              onClick={() => setShowSupervisorPicker(true)}
              className="group p-4 rounded-2xl bg-gradient-to-r from-white/10 to-white/5 hover:from-blue-600/20 hover:to-white/10 border border-blue-400/30 hover:border-blue-400 transition-all cursor-pointer shadow-md active:scale-[0.99] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-white group-hover:text-blue-300 transition-colors">
                      Site Supervisors
                    </h3>
                    <span className="px-2 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/30 text-[10px] font-bold rounded-full uppercase tracking-wider">
                      FIELD
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 mt-0.5 leading-snug">
                    My Sites, Attendance Check In/Out, Checklist & Photo Logs
                  </p>
                </div>
              </div>

              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-blue-300 group-hover:translate-x-1 transition-transform">
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>

            <div className="text-center pt-2">
              <span className="text-[11px] text-gray-400 flex items-center justify-center gap-1">
                <Lock className="w-3 h-3 text-[#C9A24B]" />
                Passcode required for role verification
              </span>
            </div>
          </div>
        )}

        {/* STEP 1.5: SELECT SUPERVISOR */}
        {showSupervisorPicker && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                onClick={() => setShowSupervisorPicker(false)}
                className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <h2 className="text-sm font-bold text-white">Select Supervisor</h2>
              <div className="w-8" />
            </div>

            <div className="space-y-2">
              {supervisors.map((sup) => (
                <div
                  key={sup.id}
                  onClick={() => handleSelectRole(sup)}
                  className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-[#C9A24B] transition-all cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0B1F3A] border border-[#C9A24B]/40 text-[#C9A24B] font-bold text-sm flex items-center justify-center">
                      {sup.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-sm text-white group-hover:text-[#C9A24B] transition-colors">
                        {sup.full_name}
                      </p>
                      <p className="text-[11px] text-gray-400">{sup.email || 'Site Supervisor'}</p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#C9A24B] group-hover:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: ENTER PASSCODE KEYPAD */}
        {selectedProfile && (
          <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/15 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            {/* Header with Back button */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                onClick={() => {
                  setSelectedProfile(null);
                  setPin('');
                  setErrorMessage('');
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Change Role
              </button>
              <span className="text-[11px] font-mono text-[#C9A24B] uppercase tracking-wider">
                Passcode Verification
              </span>
            </div>

            {/* Selected Profile Badge */}
            <div className="text-center space-y-1">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#0B1F3A] border-2 border-[#C9A24B] flex items-center justify-center shadow-lg text-[#C9A24B] font-bold text-lg">
                {selectedProfile.full_name.slice(0, 2).toUpperCase()}
              </div>
              <h3 className="font-extrabold text-base text-white">
                {selectedProfile.full_name}
              </h3>
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                selectedProfile.role === 'ceo'
                  ? 'bg-[#C9A24B] text-[#0B1F3A]'
                  : 'bg-blue-500 text-white'
              }`}>
                {selectedProfile.role === 'ceo' ? 'CEO / ADMIN' : 'SITE SUPERVISOR'}
              </span>
            </div>

            {/* PIN Input Dots */}
            <div className={`py-2 text-center ${isShaking ? 'animate-shake' : ''}`}>
              <div className="flex items-center justify-center gap-3">
                {[0, 1, 2, 3].map((idx) => {
                  const filled = pin.length > idx;
                  return (
                    <div
                      key={idx}
                      className={`w-4 h-4 rounded-full transition-all duration-200 ${
                        filled
                          ? 'bg-[#C9A24B] scale-110 shadow-[0_0_8px_#C9A24B]'
                          : 'border-2 border-white/30 bg-transparent'
                      }`}
                    />
                  );
                })}
              </div>

              {errorMessage && (
                <p className="text-xs text-red-400 font-semibold mt-2.5 flex items-center justify-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errorMessage}
                </p>
              )}
            </div>

            {/* On-Screen Numeric Keypad */}
            <div className="grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto pt-1">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeypadPress(digit)}
                  className="w-16 h-12 mx-auto rounded-2xl bg-white/10 hover:bg-white/25 active:bg-[#C9A24B] active:text-[#0B1F3A] text-lg font-bold text-white transition-all shadow-sm flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="w-16 h-12 mx-auto rounded-2xl bg-white/5 hover:bg-white/15 text-xs font-semibold text-gray-300 transition-all flex items-center justify-center"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleKeypadPress('0')}
                className="w-16 h-12 mx-auto rounded-2xl bg-white/10 hover:bg-white/25 active:bg-[#C9A24B] active:text-[#0B1F3A] text-lg font-bold text-white transition-all shadow-sm flex items-center justify-center"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="w-16 h-12 mx-auto rounded-2xl bg-white/5 hover:bg-white/15 text-sm font-semibold text-gray-300 transition-all flex items-center justify-center"
              >
                ⌫
              </button>
            </div>

            {/* Unlock Button */}
            <button
              onClick={handleFormSubmit}
              disabled={pin.length === 0}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-[#C9A24B] to-[#dfbd60] hover:brightness-105 text-[#0B1F3A] font-extrabold text-sm shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-4 h-4" />
              Unlock Dashboard
            </button>

            {/* Quick Demo Autofill & Hint */}
            <div className="pt-2 border-t border-white/10 text-center space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-gray-400">
                <span>
                  Default PIN:{' '}
                  <strong className="text-[#C9A24B]">
                    {selectedProfile.passcode || (selectedProfile.role === 'ceo' ? '9999' : '1001')}
                  </strong>
                </span>

                <button
                  type="button"
                  onClick={quickFillPasscode}
                  className="text-[11px] text-white hover:text-[#C9A24B] underline font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#C9A24B]" />
                  Auto-Fill PIN
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer info */}
        <p className="text-center text-[11px] text-gray-500 mt-6">
          Sovereign Touch Home Care Limited · All Rights Reserved
        </p>
      </div>
    </div>
  );
};
