import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

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
    { id: 'dashboard', icon: '📊', label: 'Dashboard', description: 'Overview & stats' },
    { id: 'classes', icon: '🎓', label: 'My Classes', description: 'Manage your classes' },
    { id: 'create-dna', icon: '🧬', label: 'Custom DNA', description: 'Build manually' },
    { id: 'topics', icon: '📚', label: 'Topics & Questions', description: 'Question bank' },
    { id: 'shared', icon: '🌐', label: 'Shared DNAs', description: 'Community boards' },
    { id: 'feedback', icon: '💬', label: 'Feedback', description: 'Suggestions & help' },
  ];

  const sidebarClasses = [
    'sidebar',
    collapsed ? 'collapsed' : '',
    isMobile ? 'mobile' : '',
    isMobile && mobileMenuOpen ? 'open' : ''
  ].filter(Boolean).join(' ');

  return (
    <aside className={sidebarClasses}>
      {/* Logo Section */}
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

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(item => (
          <button
            key={item.id}
            className={`nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => onNavigate(item.id)}
            title={collapsed ? item.label : ''}
          >
            <span className="nav-icon">{item.icon}</span>
            {!collapsed && (
              <div className="nav-text">
                <span className="nav-label">{item.label}</span>
                <span className="nav-desc">{item.description}</span>
              </div>
            )}
          </button>
        ))}
      </nav>

      {/* User Section */}
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
          background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);
          display: flex;
          flex-direction: column;
          position: fixed;
          left: 0;
          top: 0;
          z-index: 1000;
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        .sidebar.collapsed {
          width: 80px;
        }

        .sidebar.mobile {
          transform: translateX(-100%);
          width: 280px;
        }

        .sidebar.mobile.open {
          transform: translateX(0);
        }

        /* Header */
        .sidebar-header {
          padding: 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .logo-mark {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.3rem;
          box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);
        }

        .logo-text {
          font-family: 'Space Grotesk', sans-serif;
          font-weight: 700;
          font-size: 1.4rem;
          color: white;
          letter-spacing: -0.5px;
        }

        .collapse-btn, .close-btn {
          background: rgba(255,255,255,0.1);
          border: none;
          color: rgba(255,255,255,0.6);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .collapse-btn:hover, .close-btn:hover {
          background: rgba(255,255,255,0.15);
          color: white;
        }

        /* Navigation */
        .sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          overflow-y: auto;
        }

        .nav-item {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 14px 16px;
          background: transparent;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
          color: rgba(255,255,255,0.7);
        }

        .sidebar.collapsed .nav-item {
          justify-content: center;
          padding: 14px;
        }

        .nav-item:hover {
          background: rgba(255,255,255,0.08);
          color: white;
        }

        .nav-item.active {
          background: linear-gradient(135deg, rgba(13, 148, 136, 0.2) 0%, rgba(20, 184, 166, 0.15) 100%);
          color: #5eead4;
          border-left: 3px solid #14b8a6;
          margin-left: -3px;
        }

        .nav-icon {
          font-size: 1.3rem;
          flex-shrink: 0;
        }

        .nav-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .nav-label {
          font-weight: 600;
          font-size: 0.9rem;
          white-space: nowrap;
        }

        .nav-desc {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.4);
          white-space: nowrap;
        }

        .nav-item.active .nav-desc {
          color: rgba(94, 234, 212, 0.6);
        }

        /* Footer */
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid rgba(255,255,255,0.08);
        }

        .user-section {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px;
          background: rgba(255,255,255,0.05);
          border-radius: 10px;
        }

        .sidebar.collapsed .user-section {
          justify-content: center;
          padding: 10px 0;
        }

        .user-avatar {
          width: 38px;
          height: 38px;
          background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
          color: white;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .user-info {
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .user-name {
          font-weight: 600;
          font-size: 0.85rem;
          color: white;
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }

        .user-role {
          font-size: 0.72rem;
          color: rgba(255,255,255,0.5);
        }
      `}</style>
    </aside>
  );
}
