import { Icon } from './Icons';

/**
 * ErrorMessage Component
 * 
 * A reusable component for displaying user-friendly error messages
 * with optional retry functionality.
 * 
 * Usage:
 *   <ErrorMessage 
 *     message="Could not load your classes" 
 *     onRetry={() => fetchClasses()} 
 *   />
 * 
 *   <ErrorMessage 
 *     message="Something went wrong" 
 *     details="Network error: connection refused"
 *   />
 */

export default function ErrorMessage({ 
  message = "Something went wrong", 
  details = null,
  onRetry = null,
  type = "error" // "error" | "warning" | "info"
}) {
  
  const styles = {
    error: {
      bg: '#fef2f2',
      border: '#fecaca',
      text: '#dc2626',
      icon: 'alert'
    },
    warning: {
      bg: '#fffbeb',
      border: '#fde68a',
      text: '#d97706',
      icon: 'alert'
    },
    info: {
      bg: '#eff6ff',
      border: '#bfdbfe',
      text: '#2563eb',
      icon: 'help'
    }
  };

  const style = styles[type] || styles.error;

  return (
    <div className="error-message-container" style={{
      background: style.bg,
      border: `1px solid ${style.border}`,
      borderRadius: '12px',
      padding: '16px 20px',
      marginBottom: '16px',
      display: 'flex',
      alignItems: 'flex-start',
      gap: '12px'
    }}>
      <div style={{ 
        color: style.text, 
        flexShrink: 0,
        marginTop: '2px'
      }}>
        <Icon name={style.icon} size={20} />
      </div>
      
      <div style={{ flex: 1 }}>
        <p style={{ 
          margin: 0, 
          color: style.text, 
          fontWeight: 600,
          fontSize: '0.95rem'
        }}>
          {message}
        </p>
        
        {details && (
          <p style={{ 
            margin: '6px 0 0 0', 
            color: style.text, 
            opacity: 0.8,
            fontSize: '0.85rem'
          }}>
            {details}
          </p>
        )}
      </div>
      
      {onRetry && (
        <button 
          onClick={onRetry}
          style={{
            background: style.text,
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: 'pointer',
            flexShrink: 0
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Inline error for forms (smaller, less prominent)
 */
export function InlineError({ message }) {
  if (!message) return null;
  
  return (
    <p style={{
      color: '#dc2626',
      fontSize: '0.85rem',
      margin: '6px 0 0 0',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <Icon name="alert" size={14} />
      {message}
    </p>
  );
}

/**
 * Toast-style notification (for temporary messages)
 * 
 * Usage:
 *   const [toast, setToast] = useState(null);
 *   
 *   // Show toast
 *   setToast({ message: "Saved!", type: "success" });
 *   
 *   // In render
 *   {toast && <Toast {...toast} onClose={() => setToast(null)} />}
 */
export function Toast({ message, type = "success", onClose, duration = 3000 }) {
  
  // Auto-close after duration
  if (onClose && duration) {
    setTimeout(onClose, duration);
  }

  const colors = {
    success: { bg: '#dcfce7', text: '#16a34a', icon: 'check' },
    error: { bg: '#fef2f2', text: '#dc2626', icon: 'alert' },
    info: { bg: '#eff6ff', text: '#2563eb', icon: 'help' }
  };

  const style = colors[type] || colors.success;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      background: style.bg,
      color: style.text,
      padding: '12px 20px',
      borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 9999,
      animation: 'slideIn 0.3s ease'
    }}>
      <Icon name={style.icon} size={18} />
      <span style={{ fontWeight: 600 }}>{message}</span>
      {onClose && (
        <button 
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: style.text,
            cursor: 'pointer',
            padding: '4px',
            marginLeft: '8px',
            opacity: 0.7
          }}
        >
          ✕
        </button>
      )}
      
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
