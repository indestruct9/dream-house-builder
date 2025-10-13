import React, { createContext, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function useToasts() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = (msg, { type = 'info', timeout = 3000 } = {}) => {
    const id = Math.random().toString(36).slice(2,9);
    setToasts((t) => [...t, { id, msg, type }]);
    if (timeout > 0) setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), timeout);
  };

  const value = { push };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 9999 }}>
        {toasts.map((t) => (
          <div key={t.id} style={{ marginTop: 8, minWidth: 200, padding: '10px 14px', borderRadius: 8, background: t.type === 'error' ? '#ffe6e6' : '#fffaf6', color: '#3b2b20', boxShadow: '0 6px 18px rgba(0,0,0,0.08)', border: '1px solid rgba(84,48,31,0.06)' }}>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
