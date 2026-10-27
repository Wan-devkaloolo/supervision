import React, { useState } from 'react';
import { Download, Smartphone, X, Check } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#C9A24B] text-[#0B1F3A] hover:bg-[#dfbd60] transition-colors shadow-xs active:scale-95"
        title="Install Sovereign Touch Site Ops to home screen"
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-white/10 text-white hover:bg-white/20 border border-white/20 transition-colors active:scale-95"
          title="Install on iOS Safari"
        >
          <Smartphone className="w-3.5 h-3.5 text-[#C9A24B]" />
          <span className="hidden sm:inline">Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-[#14213a] relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 rounded-full"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-[#0B1F3A] flex items-center justify-center text-[#C9A24B]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#0B1F3A]">Install on iPhone / iPad</h3>
                  <p className="text-xs text-gray-500">Run full-screen like a native app</p>
                </div>
              </div>

              <div className="space-y-3 text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">1</span>
                  <p>In Safari, tap the <strong>Share</strong> button <span className="inline-block px-1 py-0.5 bg-gray-200 rounded text-xs font-mono">⎋ / [↑]</span> in the toolbar.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">2</span>
                  <p>Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0B1F3A] text-white text-xs flex items-center justify-center font-bold">3</span>
                  <p>Tap <strong>Add</strong> in the top-right corner. The app will appear on your phone!</p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-[#0B1F3A] text-white text-sm font-semibold hover:bg-[#13305a] transition-colors"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
