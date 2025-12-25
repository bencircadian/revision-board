import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function ClassSelector({ onSelectClass, onCreateNew }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClasses = useCallback(async () => {
    try {
      // Direct fetch, no artificial delays
      let userId = '00000000-0000-0000-0000-000000000000';
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) userId = user.id;
      } catch (authErr) {
        console.log('Using default user ID');
      }

      const { data, error: fetchError } = await supabase
        .from('classes')
        .select('id, name, recent_topics, past_topics, created_at')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (fetchError) throw fetchError;
      setClasses(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.message);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  if (loading) {
    return (
      <div className="selector-page">
        <header className="page-header">
          <h1><Icon name="hat" size={32} style={{marginRight: '12px', color: 'var(--primary)'}} /> My Classes</h1>
          <p>Choose a class to start a DNA session</p>
        </header>
        <div className="class-grid">
          <button className="class-card create-btn" onClick={onCreateNew}>
            <div className="plus"><Icon name="plus" size={40} /></div>
            <span>Create New Class</span>
          </button>
          {[1, 2, 3].map(i => (
            <div key={i} className="class-card skeleton">
              <div className="skeleton-line title"></div>
              <div className="skeleton-line badge"></div>
              <div className="skeleton-line action"></div>
            </div>
          ))}
        </div>
        <style>{selectorStyles}</style>
      </div>
    );
  }

  return (
    <div className="selector-page">
      <header className="page-header">
        <div>
          <h1><Icon name="hat" size={32} style={{marginRight: '12px', color: 'var(--primary)'}} /> My Classes</h1>
          <p>Choose a class to start a DNA session</p>
        </div>
        <button className="btn-create" onClick={onCreateNew}>
          <Icon name="plus" size={18} style={{marginRight: '6px'}} /> New Class
        </button>
      </header>

      {error && (
        <div className="error-banner">
          <span><Icon name="alert" size={18} /> Could not load classes. </span>
          <button onClick={fetchClasses}>Retry</button>
        </div>
      )}

      <div className="class-grid">
        {/* Create New Button */}
        <button className="class-card create-btn" onClick={onCreateNew}>
          <div className="plus"><Icon name="plus" size={40} /></div>
          <span>Create New Class</span>
        </button>

        {/* Existing Classes */}
        {classes.map(cls => (
          <button key={cls.id} className="class-card existing" onClick={() => onSelectClass(cls)}>
            <div className="card-content">
              <h3>{cls.name}</h3>
              <div className="topic-counts">
                <span className="count recent">{cls.recent_topics?.length || 0} Recent</span>
                <span className="count past">{cls.past_topics?.length || 0} Past</span>
              </div>
              <div className="topics-preview">
                {[...(cls.recent_topics || []), ...(cls.past_topics || [])].slice(0, 3).map(t => (
                  <span key={t} className="topic-tag">{t}</span>
                ))}
              </div>
            </div>
            <div className="card-action">
              <span>Start Session</span>
              <span className="arrow">→</span>
            </div>
          </button>
        ))}

        {/* Empty state */}
        {classes.length === 0 && !error && (
          <div className="empty-state">
            <Icon name="hat" size={48} style={{color: '#cbd5e1', marginBottom: '16px'}} />
            <p>No classes yet. Create your first class to get started!</p>
          </div>
        )}
      </div>

      <style>{selectorStyles}</style>
    </div>
  );
}

const selectorStyles = `
  .selector-page {
    padding: 32px;
    max-width: 1100px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
    display: flex;
    align-items: center;
  }

  .page-header p {
    color: #64748b;
    margin: 0;
  }

  .btn-create {
    padding: 12px 24px;
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
    display: flex;
    align-items: center;
  }

  .btn-create:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
  }

  .error-banner {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 14px 20px;
    border-radius: 12px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .error-banner span {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .error-banner button {
    background: #dc2626;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
  }

  .class-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .class-card {
    border: none;
    border-radius: 16px;
    padding: 24px;
    cursor: pointer;
    transition: all 0.25s ease;
    text-align: left;
    font-family: inherit;
    display: flex;
    flex-direction: column;
  }

  .class-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.12);
  }

  .create-btn {
    background: #f8fafc;
    border: 2px dashed #cbd5e1;
    color: #64748b;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .create-btn:hover {
    border-color: #14b8a6;
    color: #0d9488;
    background: #f0fdfa;
  }

  .plus {
    color: #cbd5e1;
    margin-bottom: 12px;
    transition: color 0.2s;
  }
  
  .create-btn:hover .plus {
    color: #0d9488;
  }

  .existing {
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid #f1f5f9;
    justify-content: space-between;
    min-height: 200px;
  }

  .existing:hover {
    border-color: #99f6e4;
  }

  .card-content h3 {
    font-size: 1.2rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 12px 0;
  }

  .topic-counts {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
  }

  .count {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .count.recent {
    background: #f0fdfa;
    color: #0d9488;
  }

  .count.past {
    background: #fef9c3;
    color: #ca8a04;
  }

  .topics-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .topic-tag {
    padding: 4px 8px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 6px;
    font-size: 0.7rem;
    font-weight: 500;
  }

  .card-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    color: #0d9488;
    font-weight: 600;
    font-size: 0.9rem;
    margin-top: auto;
  }

  .card-action .arrow {
    transition: transform 0.2s;
  }

  .class-card:hover .card-action .arrow {
    transform: translateX(4px);
  }

  /* Skeleton */
  .skeleton {
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    pointer-events: none;
    min-height: 200px;
    justify-content: center;
    gap: 16px;
  }

  .skeleton-line {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 6px;
  }

  .skeleton-line.title { width: 140px; height: 24px; }
  .skeleton-line.badge { width: 100px; height: 20px; }
  .skeleton-line.action { width: 90px; height: 18px; }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .empty-state {
    grid-column: 1 / -1;
    text-align: center;
    padding: 60px;
    color: #64748b;
    background: #f8fafc;
    border-radius: 16px;
    border: 2px dashed #e2e8f0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  @media (max-width: 768px) {
    .selector-page {
      padding: 20px 16px;
    }

    .page-header {
      flex-direction: column;
      gap: 16px;
    }

    .btn-create {
      width: 100%;
      justify-content: center;
    }

    .class-grid {
      grid-template-columns: 1fr;
    }
  }
`;
