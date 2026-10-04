'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import { toast, ToastItem } from '../../lib/toast';
import { useTranslations } from 'next-intl';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
  warning: AlertTriangle,
};

const STYLES: Record<ToastItem['type'], string> = {
  success: 'bg-emerald-600 shadow-emerald-200/50',
  error: 'bg-red-600 shadow-red-200/50',
  info: 'bg-indigo-600 shadow-indigo-200/50',
  warning: 'bg-amber-500 shadow-amber-200/50',
};

export function Toaster() {
  const tCommon = useTranslations('Common');
  const [items, setItems] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast._subscribe((item) => {
      setItems(prev => [...prev, item]);
      setTimeout(() => {
        setItems(prev => prev.filter(t => t.id !== item.id));
      }, item.duration);
    });
  }, []);

  const dismiss = (id: string) =>
    setItems(prev => prev.filter(t => t.id !== id));

  if (items.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-label={tCommon('notifications')}
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 pointer-events-none"
    >
      {items.map(item => {
        const Icon = ICONS[item.type];
        return (
          <div
            key={item.id}
            role="alert"
            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl shadow-lg text-white max-w-sm w-full pointer-events-auto animate-[slide-up_0.25s_ease-out] ${STYLES[item.type]}`}
          >
            <Icon className="w-5 h-5 shrink-0" />
            <span className="text-sm font-semibold flex-1 leading-snug">{item.message}</span>
            <button
              onClick={() => dismiss(item.id)}
              aria-label={tCommon('dismiss')}
              className="ml-1 p-0.5 opacity-70 hover:opacity-100 transition-opacity shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
