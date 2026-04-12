export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
}

type ToastListener = (item: ToastItem) => void;

const listeners = new Set<ToastListener>();

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function emit(type: ToastType, message: string, duration: number) {
  const item: ToastItem = { id: uid(), type, message, duration };
  listeners.forEach(fn => fn(item));
}

export const toast = {
  success(message: string, duration = 3000) {
    emit('success', message, duration);
  },
  error(message: string, duration = 5000) {
    emit('error', message, duration);
  },
  info(message: string, duration = 3000) {
    emit('info', message, duration);
  },
  warning(message: string, duration = 4000) {
    emit('warning', message, duration);
  },
  /** @internal — used by <Toaster /> only */
  _subscribe(listener: ToastListener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
