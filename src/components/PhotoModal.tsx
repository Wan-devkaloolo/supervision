import React from 'react';
import { X, ExternalLink, Calendar, User } from 'lucide-react';
import { fmtTime } from '../lib/utils';

interface Props {
  photoUrl: string | null;
  caption?: string | null;
  timestamp?: string;
  uploaderName?: string;
  onClose: () => void;
}

export const PhotoModal: React.FC<Props> = ({
  photoUrl,
  caption,
  timestamp,
  uploaderName,
  onClose,
}) => {
  if (!photoUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full bg-gray-900 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-950/80 text-white border-b border-gray-800">
          <div className="flex items-center gap-3 text-xs text-gray-300">
            {uploaderName && (
              <span className="flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-[#C9A24B]" />
                {uploaderName}
              </span>
            )}
            {timestamp && (
              <span className="flex items-center gap-1 text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                {fmtTime(timestamp)}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Photo view */}
        <div className="flex-1 flex items-center justify-center p-2 bg-black min-h-[300px] max-h-[70vh]">
          <img
            src={photoUrl}
            alt="Site Log"
            className="max-h-[68vh] max-w-full object-contain rounded-lg"
          />
        </div>

        {/* Caption */}
        {caption && (
          <div className="px-5 py-3.5 bg-gray-950 text-gray-200 text-sm border-t border-gray-800">
            <p className="leading-snug">{caption}</p>
          </div>
        )}
      </div>
    </div>
  );
};
