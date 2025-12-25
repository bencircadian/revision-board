import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import DNABoard from './components/DNABoard'
import CreateDNA from './components/CreateDNA'
import ClassSelector from './components/ClassSelector'
import CreateClass from './components/CreateClass'
import TopicsQuestions from './components/TopicsQuestions'
import SharedDNAs from './components/SharedDNAs'
import Feedback from './components/Feedback'
import Sidebar from './components/Sidebar'
import { Icon } from './components/Icons'
import './App.css'

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentClass, setCurrentClass] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
      />

      {isMobile && mobileMenuOpen && (
        <div className="mobile-overlay" onClick={() => setMobileMenuOpen(false)} />
      )}

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App
