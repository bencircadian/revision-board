import { Icon } from './Icons';

export default function Sidebar({ 
  currentView, 
  onNavigate, 
  collapsed, 
  onToggleCollapse,
  isMobile,
  mobileMenuOpen,
  onCloseMobile,
  onLogout // <--- accepting the new prop
}) {
  
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'home' },
    { id: 'classes', label: 'My Classes', icon: 'users' },
    { id: 'topics', label: 'Topics', icon: 'book' },
    { id: 'create-dna', label: 'Generator', icon: 'dna' },
    { id: 'shared', label: 'Shared Boards', icon: 'share' },
    { id: 'feedback', label: 'Feedback', icon: 'message' },
  ];

  const handleNav = (view) => {
    onNavigate(view);
    if (isMobile) onCloseMobile();
  };

  return (
    <>
      <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileMenuOpen ? 'mobile-open' : ''}`}>
        
        {/* Toggle Button (Desktop Only) */}
        {!isMobile && (
          <button className="collapse-btn" onClick={onToggleCollapse}>
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={16} />
          </button>
        )}

        {/* Logo Area */}
        <div className="sidebar-header">
          {!collapsed && <div className="logo-text">Engram</div>}
        </div>

        {/* Navigation Items */}
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => handleNav(item.id)}
              title={collapsed ? item.label : ''}
            >
              <div className="nav-icon"><Icon name={item.icon} size={20} /></div>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* LOGOUT BUTTON - Added Here */}
        <div className="sidebar-footer">
          <button className="nav-item logout-btn" onClick={onLogout}>
            <div className="nav-icon"><Icon name="logout" size={20} /></div>
            {!collapsed && <span className="nav-label">Sign Out</span>}
          </button>
        </div>
      </div>

      <style>{sidebarStyles}</style>
    </>
  );
}

const sidebarStyles = `
  .sidebar {
    width: 260px;
    background: white;
    border-right: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    height: 100vh;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    z-index: 50;
    flex-shrink: 0;
  }

  .sidebar.collapsed { width: 72px; }

  .sidebar-header {
    height: 64px;
    display: flex;
    align-items: center;
    padding: 0 24px;
    border-bottom: 1px solid #f1f5f9;
  }
  .logo-text { font-weight: 800; font-size: 1.25rem; color: #0f172a; letter-spacing: -0.5px; }

  .collapse-btn {
    position: absolute;
    top: 24px;
    right: -12px;
    width: 24px;
    height: 24px;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #64748b;
    z-index: 100;
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }
  .collapse-btn:hover { color: #0d9488; border-color: #0d9488; }

  .sidebar-nav { padding: 16px 12px; flex: 1; display: flex; flex-direction: column; gap: 4px; }

  .nav-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
    font-size: 0.95rem;
    font-weight: 500;
    text-align: left;
    height: 44px;
  }
  
  .nav-item:hover { background: #f1f5f9; color: #1e293b; }
  .nav-item.active { background: #f0fdfa; color: #0d9488; font-weight: 600; }
  
  .nav-icon { 
    width: 24px; 
    height: 24px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    flex-shrink: 0;
  }
  
  .sidebar.collapsed .nav-item { justify-content: center; padding: 10px 0; }
  .nav-label { margin-left: 12px; white-space: nowrap; overflow: hidden; opacity: 1; transition: opacity 0.2s; }
  
  .sidebar-footer {
    padding: 16px 12px;
    border-top: 1px solid #f1f5f9;
  }
  
  .logout-btn { color: #94a3b8; }
  .logout-btn:hover { background: #fef2f2; color: #ef4444; }

  /* Mobile Styles */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      transform: translateX(-100%);
      width: 280px;
    }
    .sidebar.mobile-open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.1); }
    .sidebar.collapsed { width: 280px; } /* Disable collapsing on mobile */
  }
`;
