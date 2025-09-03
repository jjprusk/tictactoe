// © 2025 Joe Pruskowski
import React, { useEffect, useState } from 'react';
import { socketService } from '../socket/socketService';

export default function NoticeBanner(): JSX.Element | null {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function onNotice(payload: unknown) {
      const m = (payload as any)?.message;
      if (typeof m === 'string' && m.trim().length > 0) setMessage(m);
    }
    socketService.on('room:notice', onNotice as any);
    return () => {
      socketService.off('room:notice', onNotice as any);
    };
  }, []);

  if (!message) return null;
  return (
    <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 text-amber-900 px-3 py-2 flex items-start justify-between" role="status">
      <span>{message}</span>
      <button
        type="button"
        aria-label="Dismiss notice"
        onClick={() => setMessage(null)}
        className="ml-3 text-amber-900/80 hover:text-amber-900"
      >
        ×
      </button>
    </div>
  );
}


