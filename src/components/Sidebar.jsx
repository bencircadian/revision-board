import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function Sidebar({ 
  currentView, 
  onNavigate, 
  collapsed, 
  onToggleCollapse,
  isMobile,
  mobileMenuOpen,
  onCloseMobile,
  onLogout // <--- Added this prop
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
    { id: 'dashboard', icon: 'dashboard', label: 'Dashboard', description: 'Overview & stats' },
    { id: 'classes', icon: 'classes', label: 'My Classes', description: 'Manage your classes' },
    { id: 'create-dna', icon: 'dna', label: 'Custom DNA', description: 'Build manually' },
    { id: 'topics', icon: 'bank', label: 'Topics & Questions', description: 'Question bank' },
    { id: 'shared', icon: 'shared', label: 'Shared DNAs', description: 'Community boards' },
    { id: 'feedback', icon: 'feedback', label: 'Feedback', description: 'Suggestions & help' },
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
          <Icon name="logo" size={40} />
          {!collapsed && <span className="logo-text">Engram</span>}
        </div>
        {!isMobile && (
          <button className="collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expand" : "Collapse"}>
            <Icon name="sidebarToggle" size={20} />
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
            <span className="nav-icon-container">
              <Icon name={item.icon} size={20} />
            </span>
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
        {/* NEW: Logout Button */}
        <button className="logout-btn" onClick={onLogout} title="Sign Out">
          <span className="nav-icon-container">
            <Icon name="logout" size={20} />
          </span>
          {!collapsed && <span className="nav-label">Sign Out</span>}
        </button>

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
          box-shadow: 4px 0 24px rgba(0,0,0,0.1);
        }

        .sidebar.collapsed { width: 80px; }
        .sidebar.mobile { transform: translateX(-100%); width: 280px; }
        .sidebar.mobile.open { transform: translateX(0); }

        .sidebar-header {
          padding: 20px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          overflow: hidden;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
          flex-shrink: 0;
        }

        .logo-text {
          font-family: var(--font-display);
          font-weight: 700;
          font-size: 1.5rem;
          color: white;
          letter-spacing: -0.5px;
          white-space: nowrap;
        }

        .collapse-btn {
          background: transparent;
          border: none;
          color: rgba(255,255,255,0.4);
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .collapse-btn:hover {
          background: rgba(255,255,255,0.1);
          color: white;
        }

        .close-btn {
          background: transparent;
          border: none;
          color: white;
          font-size: 1.5rem;
          cursor: pointer;
        }

        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-x: hidden;
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
          white-space: nowrap;
        }

        .nav-icon-container {
          color: var(--primary);
          transition: color 0.2s ease;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.05);
          color: white;
        }

        .nav-item:hover .nav-icon-container {
          color: var(--accent);
        }

        .nav-item.active {
          background: rgba(13, 148, 136, 0.15);
          color: #5eead4;
        }
        
        .nav-item.active .nav-icon-container {
          color: #5eead4;
        }

        .nav-text {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .nav-label { font-weight: 600; font-size: 0.9rem; display: block; }
        .nav-desc { font-size: 0.7rem; color: rgba(255,255,255,0.3); display: block; }

        .sidebar-footer { 
          padding: 16px; 
          border-top: 1px solid rgba(255,255,255,0.05); 
          display: flex; 
          flex-direction: column; 
          gap: 12px; 
          overflow: hidden; 
        }

        /* LOGOUT BUTTON STYLES */
        .logout-btn {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 10px 16px;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          cursor: pointer;
          color: rgba(255,255,255,0.6);
          transition: all 0.2s;
          white-space: nowrap;
        }
        
        .logout-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgba(239, 68, 68, 0.3);
          color: #fca5a5;
        }

        .user-section { display: flex; align-items: center; gap: 12px; padding: 8px; background: rgba(255,255,255,0.03); border-radius: 12px; white-space: nowrap; }
        .user-avatar { width: 32px; height: 32px; background: var(--accent); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
        .user-name { font-weight: 600; font-size: 0.8rem; color: white; display: block; }
        .user-role { font-size: 0.65rem; color: rgba(255,255,255,0.4); display: block; }
      `}</style>
    </aside>
  );
}
