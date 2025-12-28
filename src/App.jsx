import { useEffect, useState, Suspense, lazy } from 'react'
import { supabase } from './supabase' // <--- Added Supabase import
import Sidebar from './components/Sidebar'
import { Icon } from './components/Icons'
import './App.css'
import LandingPage from './components/LandingPage';

// Lazy load components to improve initial load time
const Dashboard = lazy(() => import('./components/Dashboard'));
const DNABoard = lazy(() => import('./components/DNABoard'));
const CreateDNA = lazy(() => import('./components/CreateDNA'));
const ClassSelector = lazy(() => import('./components/ClassSelector'));
const CreateClass = lazy(() => import('./components/CreateClass'));
const TopicsQuestions = lazy(() => import('./components/TopicsQuestions'));
const SharedDNAs = lazy(() => import('./components/SharedDNAs'));
const Feedback = lazy(() => import('./components/Feedback'));

function App() {
  // --- Auth State ---
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- Layout/Routing State ---
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentClass, setCurrentClass] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // 1. Check Auth Session on Load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // 2. Handle Window Resize (Existing logic)
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const navigate = (view, classData = null) => {
    setCurrentView(view);
    if (classData) setCurrentClass(classData);
    if (isMobile) setMobileMenuOpen(false);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard onNavigate={navigate} />;
      case 'dna-board': return <DNABoard currentClass={currentClass} onNavigate={navigate} />;
      case 'create-dna': return <CreateDNA onGenerate={(cards) => { navigate('dna-board', { name: 'Custom Session', cards }); }} onCancel={() => navigate('dashboard')} />;
      case 'classes': return <ClassSelector onSelectClass={(cls) => navigate('dna-board', cls)} onCreateNew={() => navigate('create-class')} />;
      case 'create-class': return <CreateClass onSave={() => navigate('classes')} onCancel={() => navigate('classes')} />;
      case 'topics': return <TopicsQuestions onNavigate={navigate} />;
      case 'shared': return <SharedDNAs onNavigate={navigate} />;
      case 'feedback': return <Feedback onNavigate={navigate} />;
      default: return <Dashboard onNavigate={navigate} />;
    }
  };

  // --- Render Conditionals ---

  // A. Loading Screen (while checking Supabase)
  if (authLoading) {
    return (
      <div className="loading-container" style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  // B. Not Logged In -> Show Landing Page
  if (!session) {
    return <LandingPage />;
  }

  // C. Logged In -> Show Main App Layout
  return (
    <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'mobile' : ''}`}>
      {isMobile && (
        <header className="mobile-header">
          <button className="menu-toggle" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            <span></span><span></span><span></span>
          </button>
          <div className="mobile-logo">
            <Icon name="logo" size={32} />
            <span className="logo-text">Engram</span>
          </div>
          <div className="mobile-spacer"></div>
        </header>
      )}

      <Sidebar 
        currentView={currentView}
        onNavigate={navigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        isMobile={isMobile}
        mobileMenuOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onLogout={() => supabase.auth.signOut()} // <--- Connected Logout
      />

      {isMobile && mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <main className="main-content">
        <Suspense fallback={
          <div className="loading-container">
            <div className="spinner"></div>
          </div>
        }>
          {renderContent()}
        </Suspense>
      </main>
    </div>
  );
}

export default App;
