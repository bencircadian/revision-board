import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function Dashboard({ onNavigate }) {
  const [classes, setClasses] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [stats, setStats] = useState({ totalQuestions: 0, avgScore: 0, streakDays: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      // Get user first
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '00000000-0000-0000-0000-000000000000';

      // Fetch classes and sessions in PARALLEL for faster loading
      const [classResult, sessionResult] = await Promise.all([
        supabase
          .from('classes')
          .select('*')
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false }),
        supabase
          .from('dna_sessions')
          .select('*')
          .order('date', { ascending: false })
          .limit(10)
      ]);

      const classData = classResult.data || [];
      const sessionData = sessionResult.data || [];

      // Calculate stats from sessions
      let totalQ = 0;
      let totalScore = 0;
      let scoreCount = 0;

      sessionData.forEach(session => {
        if (session.results) {
          session.results.forEach(r => {
            totalQ++;
            if (typeof r.score === 'number') {
              totalScore += r.score;
              scoreCount++;
            }
          });
        }
      });

      // Map sessions to classes to get "days since last DNA"
      const classesWithMeta = classData.map(cls => {
        const lastSession = sessionData.find(s => s.class_id === cls.name);
        const daysSince = lastSession 
          ? Math.floor((Date.now() - new Date(lastSession.date).getTime()) / (1000 * 60 * 60 * 24))
          : null;
        
        // Get performance data for this class
        const classSessions = sessionData.filter(s => s.class_id === cls.name);
        let correct = 0, total = 0;
        classSessions.forEach(s => {
          (s.results || []).forEach(r => {
            total++;
            if (r.score >= 75) correct++;
          });
        });

        return {
          ...cls,
          daysSinceLastDNA: daysSince,
          successRate: total > 0 ? Math.round((correct / total) * 100) : null,
          totalAnswered: total
        };
      });

      setClasses(classesWithMeta);
      setRecentSessions(sessionData);
      setStats({
        totalQuestions: totalQ,
        avgScore: scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0,
        streakDays: calculateStreak(sessionData)
      });
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function calculateStreak(sessions) {
    if (!sessions.length) return 0;
    // Simple streak: count consecutive days with sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let streak = 0;
    let checkDate = new Date(today);
    
    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      const hasSession = sessions.some(s => s.date?.startsWith(dateStr));
      if (hasSession) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today doesn't have a session yet, check if yesterday does
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  const getDaysColor = (days) => {
    if (days === null) return '#94a3b8';
    if (days <= 1) return '#22c55e';
    if (days <= 3) return '#eab308';
    if (days <= 7) return '#f97316';
    return '#ef4444';
  };

  const getDaysLabel = (days) => {
    if (days === null) return 'No sessions yet';
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  const dateStr = new Date().toLocaleDateString('en-GB', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  });

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
        <style>{loadingStyles}</style>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1>Welcome back!</h1>
          <p className="date">{dateStr}</p>
        </div>
        <div className="header-actions">
          <button className="btn-quick-dna" onClick={() => onNavigate('create-dna')}>
            <Icon name="dna" size={18} /> Quick DNA
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Icon name="chart" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalQuestions}</span>
            <span className="stat-label">Questions Practiced</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Icon name="target" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgScore}%</span>
            <span className="stat-label">Avg. Score</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Icon name="flame" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{stats.streakDays}</span>
            <span className="stat-label">Day Streak</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Icon name="hat" size={24} /></div>
          <div className="stat-content">
            <span className="stat-value">{classes.length}</span>
            <span className="stat-label">Active Classes</span>
          </div>
        </div>
      </section>

      {/* Classes Section */}
      <section className="classes-section">
        <div className="section-header">
          <h2>Your Classes</h2>
          <button className="btn-add" onClick={() => onNavigate('create-class')}>
            <Icon name="plus" size={14} style={{marginRight: '6px'}} /> New Class
          </button>
        </div>

        {classes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="hat" size={48} /></div>
            <h3>No classes yet</h3>
            <p>Create your first class to start tracking student progress</p>
            <button className="btn-primary" onClick={() => onNavigate('create-class')}>
              Create Class
            </button>
          </div>
        ) : (
          <div className="classes-grid">
            {classes.map(cls => (
              <div key={cls.id} className="class-card" onClick={() => onNavigate('dna-board', cls)}>
                <div className="class-header">
                  <h3>{cls.name}</h3>
                  <div 
                    className="days-badge"
                    style={{ background: getDaysColor(cls.daysSinceLastDNA) + '22', color: getDaysColor(cls.daysSinceLastDNA) }}
                  >
                    {getDaysLabel(cls.daysSinceLastDNA)}
                  </div>
                </div>
                
                <div className="class-stats">
                  <div className="class-stat">
                    <span className="label">Topics</span>
                    <span className="value">{(cls.recent_topics?.length || 0) + (cls.past_topics?.length || 0)}</span>
                  </div>
                  <div className="class-stat">
                    <span className="label">Questions</span>
                    <span className="value">{cls.totalAnswered || 0}</span>
                  </div>
                  <div className="class-stat">
                    <span className="label">Success</span>
                    <span className="value">{cls.successRate !== null ? `${cls.successRate}%` : '—'}</span>
                  </div>
                </div>

                {/* Mini performance bar */}
                {cls.successRate !== null && (
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${cls.successRate}%`,
                        background: cls.successRate >= 75 ? '#22c55e' : cls.successRate >= 50 ? '#eab308' : '#ef4444'
                      }}
                    />
                  </div>
                )}

                <div className="class-action">
                  <span>Start Session</span>
                  <span className="arrow">→</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Activity */}
      <section className="activity-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <button className="btn-link" onClick={() => onNavigate('topics')}>
            View All Topics →
          </button>
        </div>

        {recentSessions.length === 0 ? (
          <div className="empty-state small">
            <p>No recent sessions. Start a DNA to see activity here!</p>
          </div>
        ) : (
          <div className="activity-list">
            {recentSessions.slice(0, 5).map((session, idx) => {
              const sessionDate = new Date(session.date);
              const results = session.results || [];
              const correct = results.filter(r => r.score >= 75).length;
              
              return (
                <div key={idx} className="activity-item">
                  <div className="activity-date">
                    <span className="day">{sessionDate.getDate()}</span>
                    <span className="month">{sessionDate.toLocaleString('en', { month: 'short' })}</span>
                  </div>
                  <div className="activity-content">
                    <span className="activity-title">{session.class_id}</span>
                    <span className="activity-meta">{results.length} questions</span>
                  </div>
                  <div className="activity-score">
                    <span className={`score ${correct / results.length >= 0.75 ? 'good' : correct / results.length >= 0.5 ? 'ok' : 'low'}`}>
                      {correct}/{results.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <style>{dashboardStyles}</style>
    </div>
  );
}

const loadingStyles = `
  .dashboard-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
    gap: 16px;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid #e2e8f0;
    border-top-color: #0d9488;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const dashboardStyles = `
  .dashboard { padding: 32px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }
  .dashboard-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .header-left h1 { font-family: 'Space Grotesk', sans-serif; font-size: 2rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; }
  .date { color: #64748b; font-size: 0.95rem; }
  .btn-quick-dna { display: flex; align-items: center; gap: 8px; padding: 12px 20px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); }
  .btn-quick-dna:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35); }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 40px; }
  .stat-card { background: white; padding: 24px; border-radius: 16px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; transition: transform 0.2s, box-shadow 0.2s; }
  .stat-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .stat-icon { font-size: 2rem; width: 56px; height: 56px; background: #f0fdfa; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: var(--primary); }
  .stat-content { display: flex; flex-direction: column; }
  .stat-value { font-size: 1.75rem; font-weight: 700; color: #1e293b; font-family: 'Space Grotesk', sans-serif; }
  .stat-label { font-size: 0.8rem; color: #64748b; font-weight: 500; }
  .section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
  .section-header h2 { font-size: 1.25rem; font-weight: 700; color: #1e293b; margin: 0; }
  .btn-add { padding: 8px 16px; background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4; border-radius: 8px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; }
  .btn-add:hover { background: #ccfbf1; }
  .btn-link { background: none; border: none; color: #0d9488; font-weight: 600; font-size: 0.85rem; cursor: pointer; }
  .classes-section { margin-bottom: 40px; }
  .classes-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; }
  .class-card { background: white; padding: 24px; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s; }
  .class-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(0,0,0,0.1); border-color: #99f6e4; }
  .class-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
  .class-header h3 { font-size: 1.1rem; font-weight: 700; color: #1e293b; margin: 0; }
  .days-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.72rem; font-weight: 700; }
  .class-stats { display: flex; gap: 20px; margin-bottom: 16px; }
  .class-stat { display: flex; flex-direction: column; gap: 2px; }
  .class-stat .label { font-size: 0.7rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; }
  .class-stat .value { font-size: 1rem; font-weight: 700; color: #334155; }
  .progress-bar { height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden; margin-bottom: 16px; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
  .class-action { display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #f1f5f9; color: #0d9488; font-weight: 600; font-size: 0.9rem; }
  .class-action .arrow { transition: transform 0.2s; }
  .class-card:hover .class-action .arrow { transform: translateX(4px); }
  .empty-state { text-align: center; padding: 60px 40px; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0; }
  .empty-state.small { padding: 30px; }
  .empty-icon { color: #cbd5e1; margin-bottom: 16px; }
  .empty-state h3 { font-size: 1.2rem; color: #334155; margin: 0 0 8px 0; }
  .empty-state p { color: #64748b; margin: 0 0 20px 0; }
  .btn-primary { padding: 12px 24px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; }
  .activity-section { margin-bottom: 40px; }
  .activity-list { background: white; border-radius: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; overflow: hidden; }
  .activity-item { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; transition: background 0.2s; }
  .activity-item:last-child { border-bottom: none; }
  .activity-item:hover { background: #f8fafc; }
  .activity-date { display: flex; flex-direction: column; align-items: center; width: 50px; padding: 8px; background: #f0fdfa; border-radius: 8px; }
  .activity-date .day { font-size: 1.2rem; font-weight: 700; color: #0d9488; }
  .activity-date .month { font-size: 0.65rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
  .activity-content { flex: 1; display: flex; flex-direction: column; gap: 2px; }
  .activity-title { font-weight: 600; color: #1e293b; }
  .activity-meta { font-size: 0.8rem; color: #94a3b8; }
  .activity-score .score { padding: 6px 12px; border-radius: 20px; font-weight: 700; font-size: 0.85rem; }
  .score.good { background: #dcfce7; color: #16a34a; }
  .score.ok { background: #fef9c3; color: #ca8a04; }
  .score.low { background: #fee2e2; color: #dc2626; }
  @media (max-width: 768px) {
    .dashboard { padding: 20px 16px; }
    .dashboard-header { flex-direction: column; gap: 16px; }
    .header-left h1 { font-size: 1.5rem; }
    .btn-quick-dna { width: 100%; justify-content: center; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
    .stat-card { padding: 16px; }
    .stat-icon { width: 44px; height: 44px; font-size: 1.5rem; }
    .stat-value { font-size: 1.4rem; }
    .classes-grid { grid-template-columns: 1fr; }
  }
`;
