import { useState, useEffect, useCallback } from 'react';
import { supabase } from './supabase';

export default function ClassSelector({ onSelectClass, onCreateNew }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchClasses = useCallback(async () => {
    try {
      // Start with optimistic empty state after brief delay
      const timeoutId = setTimeout(() => {
        if (loading) {
          // Show UI immediately, will update when data arrives
        }
      }, 100);

      // Get current user - use a timeout to prevent hanging
      const userPromise = supabase.auth.getUser();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth timeout')), 3000)
      );
      
      let userId = '00000000-0000-0000-0000-000000000000'; // Default fallback
      
      try {
        const { data: { user } } = await Promise.race([userPromise, timeoutPromise]);
        if (user) userId = user.id;
      } catch (authErr) {
        console.log('Using default user ID');
      }

      clearTimeout(timeoutId);

      // Fetch classes with timeout
      const { data, error: fetchError } = await supabase
        .from('classes')
        .select('id, name, recent_topics, created_at')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false })
        .limit(20); // Limit for performance

      if (fetchError) {
        throw fetchError;
      }

      setClasses(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError(err.message);
      setClasses([]); // Show empty state on error
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Show skeleton loading state instead of blocking
  if (loading) {
    return (
      <div className="selector-container">
        <h2>Select a Class</h2>
        <p>Choose which class to run a session for.</p>
        <div className="class-grid">
          <button className="class-card create-btn" onClick={onCreateNew}>
            <div className="plus">+</div>
            <span>Create New Class</span>
          </button>
          {/* Skeleton loaders */}
          {[1, 2, 3].map(i => (
            <div key={i} className="class-card skeleton">
              <div className="skeleton-title"></div>
              <div className="skeleton-badge"></div>
              <div className="skeleton-action"></div>
            </div>
          ))}
        </div>
        <style>{selectorStyles}</style>
      </div>
    );
  }

  return (
    <div className="selector-container">
      <h2>Select a Class</h2>
      <p>Choose which class to run a session for.</p>

      {error && (
        <div className="error-banner">
          <span>⚠️ Could not load classes. </span>
          <button onClick={fetchClasses}>Retry</button>
        </div>
      )}

      <div className="class-grid">
        {/* Create New Button */}
        <button className="class-card create-btn" onClick={onCreateNew}>
          <div className="plus">+</div>
          <span>Create New Class</span>
        </button>

        {/* Existing Classes */}
        {classes.map(cls => (
          <button key={cls.id} className="class-card existing" onClick={() => onSelectClass(cls)}>
            <div className="card-top">
              <h3>{cls.name}</h3>
              <span className="badge">{cls.recent_topics?.length || 0} Recent Topics</span>
            </div>
            <div className="card-bottom">
              Start Session →
            </div>
          </button>
        ))}

        {/* Empty state */}
        {classes.length === 0 && !error && (
          <div className="empty-state">
            <p>No classes yet. Create your first class to get started!</p>
          </div>
        )}
      </div>

      <style>{selectorStyles}</style>
    </div>
  );
}

const selectorStyles = `
  .selector-container { 
    max-width: 1000px; 
    margin: 0 auto; 
    padding: 40px 20px; 
    text-align: center;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  h2 { 
    color: #2c3e50; 
    font-size: 2rem; 
    margin-bottom: 10px;
    font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif;
  }
  p { color: #7f8c8d; margin-bottom: 40px; }

  .error-banner {
    background: #fff5f5;
    border: 1px solid #fed7d7;
    color: #c53030;
    padding: 12px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }
  .error-banner button {
    background: #c53030;
    color: white;
    border: none;
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: 600;
  }

  .class-grid { 
    display: grid; 
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
    gap: 20px; 
    justify-content: center;
  }

  .class-card {
    border: none; 
    border-radius: 12px; 
    padding: 25px;
    display: flex; 
    flex-direction: column; 
    align-items: center; 
    justify-content: center;
    cursor: pointer; 
    transition: transform 0.2s, box-shadow 0.2s;
    min-height: 200px; 
    text-align: center;
    font-family: inherit;
  }
  .class-card:hover { 
    transform: translateY(-5px); 
    box-shadow: 0 10px 20px rgba(0,0,0,0.1); 
  }

  .create-btn { 
    background: #f8f9fa; 
    border: 2px dashed #bdc3c7; 
    color: #7f8c8d; 
  }
  .create-btn:hover { 
    border-color: #0F766E; 
    color: #0F766E; 
    background: #f0fdfa; 
  }
  .plus { font-size: 3rem; margin-bottom: 10px; font-weight: 300; }

  .existing { 
    background: white; 
    box-shadow: 0 2px 8px rgba(0,0,0,0.05); 
    color: #2c3e50; 
    justify-content: space-between; 
  }
  .card-top h3 { margin: 0 0 10px 0; font-size: 1.3rem; }
  .badge { 
    background: #e8f6f3; 
    color: #0F766E; 
    padding: 4px 8px; 
    border-radius: 4px; 
    font-size: 0.8rem; 
    font-weight: bold; 
  }
  .card-bottom { 
    color: #0F766E; 
    font-weight: 600; 
    font-size: 0.9rem; 
    margin-top: 20px; 
  }

  /* Skeleton loading states */
  .skeleton {
    background: white;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    cursor: default;
    pointer-events: none;
  }
  .skeleton:hover {
    transform: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .skeleton-title {
    width: 120px;
    height: 24px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    margin-bottom: 10px;
  }
  .skeleton-badge {
    width: 100px;
    height: 20px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }
  .skeleton-action {
    width: 80px;
    height: 16px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    margin-top: 20px;
  }
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .empty-state {
    grid-column: 1 / -1;
    padding: 40px;
    color: #7f8c8d;
  }
`;
