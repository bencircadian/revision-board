import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function ClassSelector({ onSelectClass, onCreateNew }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      // 1. Get current user
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user ? user.id : '00000000-0000-0000-0000-000000000000';

      // 2. Fetch classes for this teacher
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setClasses(data);
      }
      setLoading(false);
    }
    fetchClasses();
  }, []);

  if (loading) return <div style={{padding:40}}>Loading Classes...</div>;

  return (
    <div className="selector-container">
      <h2>Select a Class</h2>
      <p>Choose which class to run a session for.</p>

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
              Start Session &rarr;
            </div>
          </button>
        ))}
      </div>

      <style>{`
        .selector-container { max-width: 1000px; margin: 0 auto; padding: 40px 20px; text-align: center; }
        h2 { color: #2c3e50; font-size: 2rem; margin-bottom: 10px; }
        p { color: #7f8c8d; margin-bottom: 40px; }

        .class-grid { 
          display: grid; 
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); 
          gap: 20px; 
          justify-content: center;
        }

        .class-card {
          border: none; border-radius: 12px; padding: 25px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
          min-height: 200px; text-align: center;
        }
        .class-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(0,0,0,0.1); }

        .create-btn { background: #f8f9fa; border: 2px dashed #bdc3c7; color: #7f8c8d; }
        .create-btn:hover { border-color: #3498db; color: #3498db; background: #ebf5fb; }
        .plus { font-size: 3rem; margin-bottom: 10px; font-weight: 300; }

        .existing { background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.05); color: #2c3e50; justify-content: space-between; }
        .card-top h3 { margin: 0 0 10px 0; font-size: 1.3rem; }
        .badge { background: #e8f6f3; color: #16a085; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; }
        .card-bottom { color: #3498db; font-weight: 600; font-size: 0.9rem; margin-top: 20px; }
      `}</style>
    </div>
  );
}
