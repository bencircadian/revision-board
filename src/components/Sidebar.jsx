import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// --- GEOMETRIC MONOCHROME ICONS ---
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const ClassesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const DNAIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
    <path d="m8 3 .5.5c2 2 1 4 0 6s-2 4-2 6c0 2 1 4 2 6l.5.5M16 3l-.5.5c-2 2-1 4 0 6s2 4 2 6c0 2-1 4-2 6l-.5.5" />
    <path d="M7 8h10M6 16h12" />
  </svg>
);

const BankIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
    <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
  </svg>
);

const CommunityIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const MessageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nav-svg">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

export default function Sidebar({ 
  currentView, 
  onNavigate, 
  collapsed, 
  onToggleCollapse,
  isMobile,
  mobileMenuOpen,
  onCloseMobile
}) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const navItems = [
    { id: 'dashboard', icon: <DashboardIcon />, label: 'Dashboard', description: 'Overview & stats' },
    { id: 'classes', icon: <ClassesIcon />, label: 'My Classes', description: 'Manage your classes' },
    { id: 'create-dna', icon: <DNAIcon />, label: 'Custom DNA', description: 'Build manually' },
    { id: 'topics', icon: <BankIcon />, label: 'Topics & Questions', description: 'Question bank' },
    { id: 'shared', icon: <CommunityIcon />, label: 'Shared DNAs', description: 'Community boards' },
    { id: 'feedback', icon: <MessageIcon />, label: 'Feedback', description: 'Suggestions & help' },
  ];

  const sidebarClasses = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    isMobile ? 'mobile' : '',
    isMobile && mobileMenuOpen ? 'open' : ''
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      <div className="sidebar-header">
        <div className="logo" onClick={() => onNavigate('dashboard')}>
          <div className="logo-mark">E</div>
          {!collapsed && <span className="logo-text">Engram</span>}
        </div>
        {!isMobile && (
          <button className="collapse-btn" onClick={onToggleCollapse}>
            {collapsed ? '→' : '←'}
          </button>
        )}
        {isMobile && (
          <button className="close-btn" onClick={onCloseMobile}>×</button>
        )}
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon-container">{item.icon}</span>
            {!collapsed && (
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </div>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-section">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || 'T'}
          </div>
          {!collapsed && (
            <div className="user-info">
              <span className="user-name">{user?.email?.split('@')[0] || 'Teacher'}</span>
              <span className="user-role">Educator</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .sidebar {
          width: 260px;
          height: 100vh;
          background: linear-gradient(180deg, #0F172A 0%, #020617 100%);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: var(--font-ui);
        }

        .sidebar.collapsed { width: 80px; }
        .sidebar.mobile { transform: translateX(-100%); width: 280px; }
        .sidebar.mobile.open { transform: translateX(0); }

        .sidebar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .logo-mark {
          width: 36px;
          height: 36px;
          background: var(--primary);
          color: white;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.2rem;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.2);
        }

        .logo-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.3rem;
          color: white;
          margin-left: 10px;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 12px 16px;
          background: transparent;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: rgba(255,255,255,0.6);
          text-align: left;
        }

        .nav-icon-container {
          color: var(--primary); /* Deep Teal Default */
          transition: color 0.2s ease;
          flex-shrink: 0;
          display: flex;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .nav-item:hover .nav-icon-container {
          color: var(--accent); /* DNA Pink on Hover */
        }

        .nav-item.active {
          background: rgba(13, 148, 136, 0.15);
          color: #5eead4;
        }
        
        .nav-item.active .nav-icon-container {
          color: #5eead4;
        }

        .nav-label { font-weight: 600; font-size: 0.9rem; display: block; }
        .nav-desc { font-size: 0.7rem; color: rgba(255,255,255,0.3); display: block; }

        .sidebar-footer { padding: 16px; border-top: 1px solid rgba(255,255,255,0.05); }
        .user-section { display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 12px; }
        .user-avatar { width: 32px; height: 32px; background: var(--accent); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; }
        .user-name { font-weight: 600; font-size: 0.8rem; color: white; display: block; }
        .user-role { font-size: 0.65rem; color: rgba(255,255,255,0.4); display: block; }
      `}</style>
    </aside>
  );
}
