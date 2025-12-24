import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function CreateClass({ onSave, onCancel }) {
  const [className, setClassName] = useState('');
  const [allTopics, setAllTopics] = useState([]);
  const [recentTopics, setRecentTopics] = useState([]);
  const [pastTopics, setPastTopics] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch all unique topics from the Question Bank
  useEffect(() => {
    async function fetchTopics() {
      const { data } = await supabase.from('questions').select('topic');
      if (data) {
        const unique = [...new Set(data.map(q => q.topic))].sort();
        setAllTopics(unique);
      }
      setLoading(false);
    }
    fetchTopics();
  }, []);

  const toggleTopic = (topic, listType) => {
    if (listType === 'recent') {
      setRecentTopics(prev => 
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      );
      // Remove from past if selected in recent
      setPastTopics(prev => prev.filter(t => t !== topic));
    } else {
      setPastTopics(prev => 
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      );
      // Remove from recent if selected in past
      setRecentTopics(prev => prev.filter(t => t !== topic));
    }
  };

  const handleSave = async () => {
    if (!className) return alert("Please enter a class name");

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fallback ID for testing if no Auth is set up yet
    const userId = user ? user.id : '00000000-0000-0000-0000-000000000000'; 

    const { error } = await supabase.from('classes').insert([{
      name: className,
      teacher_id: userId,
      recent_topics: recentTopics,
      past_topics: pastTopics
    }]);

    if (error) {
      alert("Error creating class: " + error.message);
    } else {
      onSave(); // Go back to selector
    }
  };

  if (loading) return <div className="p-10 text-center">Loading Question Bank...</div>;

  return (
    <div className="create-class-container">
      <div className="form-card">
        <h2>🎓 Create New Class</h2>
        
        <div className="form-group">
          <label>Class Name</label>
          <input 
            type="text" 
            placeholder="e.g. Year 10 - Set 2" 
            value={className}
            onChange={e => setClassName(e.target.value)}
          />
        </div>

        <div className="topic-section">
          <h3>Recent Topics (Last 2 Weeks)</h3>
          <p className="hint">Select topics fresh in their mind.</p>
          <div className="tags-grid">
            {allTopics.map(topic => (
              <button 
                key={`recent-${topic}`}
                className={`tag ${recentTopics.includes(topic) ? 'selected' : ''}`}
                onClick={() => toggleTopic(topic, 'recent')}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        <div className="topic-section">
          <h3>Past Topics (Last Term)</h3>
          <p className="hint">Select topics that need refreshing.</p>
          <div className="tags-grid">
            {allTopics.map(topic => (
              <button 
                key={`past-${topic}`}
                className={`tag past ${pastTopics.includes(topic) ? 'selected' : ''}`}
                onClick={() => toggleTopic(topic, 'past')}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        <div className="actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>Save Class</button>
        </div>
      </div>

      <style>{`
        .create-class-container { padding: 40px; display: flex; justify-content: center; }
        .form-card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); width: 100%; max-width: 600px; }
        h2 { color: #2c3e50; margin-bottom: 25px; }
        .form-group { margin-bottom: 30px; text-align: left; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 8px; color: #34495e; }
        .form-group input { width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1.1rem; box-sizing: border-box; }
        
        .topic-section { margin-bottom: 30px; text-align: left; }
        .topic-section h3 { font-size: 1rem; margin: 0 0 5px 0; color: #2c3e50; }
        .hint { font-size: 0.85rem; color: #95a5a6; margin-bottom: 12px; }
        
        .tags-grid { display: flex; flex-wrap: wrap; gap: 8px; }
        .tag { padding: 6px 12px; border-radius: 20px; border: 1px solid #ddd; background: white; cursor: pointer; font-size: 0.9rem; transition: all 0.2s; color: #555; }
        .tag:hover { border-color: #3498db; color: #3498db; }
        
        /* Selected States */
        .tag.selected { background: #3498db; color: white; border-color: #3498db; }
        .tag.past.selected { background: #e67e22; color: white; border-color: #e67e22; }

        .actions { display: flex; justify-content: flex-end; gap: 15px; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px; }
        .btn-cancel { background: transparent; border: none; color: #7f8c8d; cursor: pointer; font-weight: 600; }
        .btn-save { background: #2c3e50; color: white; padding: 12px 24px; border-radius: 8px; border: none; font-weight: 700; cursor: pointer; }
        .btn-save:hover { background: #34495e; }
      `}</style>
    </div>
  );
}
