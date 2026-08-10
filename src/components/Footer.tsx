import React from 'react';
import { Instagram, Facebook } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950 py-5 text-center text-xs text-slate-500 mt-auto">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
          <span>Zero-Knowledge AES-256-GCM Password Manager • Client-side WebCrypto Security</span>
          <a
            href="https://instagram.com/tes.tpassword/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-pink-400 border border-slate-800 hover:border-pink-500/30 transition-all text-xs font-medium group"
            title="Instagram page"
          >
            <Instagram className="h-3.5 w-3.5 text-pink-500 group-hover:scale-110 transition-transform" />
            <span>@tes.tpassword</span>
          </a>
          <a
            href="https://www.facebook.com/profile.php?id=61593027095999/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-blue-400 border border-slate-800 hover:border-blue-500/30 transition-all text-xs font-medium group"
            title="Facebook page"
          >
            <Facebook className="h-3.5 w-3.5 text-blue-500 group-hover:scale-110 transition-transform" />
            <span>Facebook</span>
          </a>
        </div>
        <p className="font-mono text-[11px] text-slate-600">PBKDF2-SHA256 • 600,000 Key Iterations</p>
      </div>
    </footer>
  );
};
