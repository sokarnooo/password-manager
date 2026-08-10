import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Delete Permanently',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <p className="text-xs text-slate-400 mt-1">{description}</p>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-red-500/20 flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
