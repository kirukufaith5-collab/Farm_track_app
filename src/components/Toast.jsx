import { useEffect } from 'react';

const COLORS = {
  info:    { bg: '#EFF6FF', border: '#60A5FA', text: '#1E3A8A', icon: 'ℹ️' },
  warning: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E', icon: '⚠️' },
  success: { bg: '#ECFDF5', border: '#10B981', text: '#065F46', icon: '✅' },
  error:   { bg: '#FEF2F2', border: '#EF4444', text: '#B91C1C', icon: '🚫' },
};

export default function Toast({ message, type = 'info', onDone }) {
  useEffect(() => {
    const timer = setTimeout(onDone, 4000);
    return () => clearTimeout(timer);
  }, [onDone]);

  const c = COLORS[type] ?? COLORS.info;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        top: '16px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        backgroundColor: c.bg,
        border: `1.5px solid ${c.border}`,
        color: c.text,
        borderRadius: '10px',
        padding: '12px 18px',
        fontSize: '13.5px',
        fontWeight: 600,
        fontFamily: 'system-ui, sans-serif',
        boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        maxWidth: 'min(480px, calc(100vw - 32px))',
        animation: 'ftToastIn 0.2s ease',
      }}
    >
      <span aria-hidden="true">{c.icon}</span>
      <span>{message}</span>
      <style>{`@keyframes ftToastIn{from{opacity:0;transform:translate(-50%,-6px)}to{opacity:1;transform:translate(-50%,0)}}@media (prefers-reduced-motion:reduce){[role=status]{animation:none!important}}`}</style>
    </div>
  );
}