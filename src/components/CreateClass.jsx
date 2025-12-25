import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function CreateClass({ onSave, onCancel }) {
  const [className, setClassName] = useState('');
  const [allTopics, setAllTopics] = useState([]);
  const [recentTopics, setRecentTopics] = useState([]);
  const [pastTopics, setPastTopics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredTopics = allTopics.filter(t =>
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleTopic = (topic, listType) => {
    if (listType === 'recent') {
      setRecentTopics(prev =>
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      );
      setPastTopics(prev => prev.filter(t => t !== topic));
    } else {
      setPastTopics(prev =>
        prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
      );
      setRecentTopics(prev => prev.filter(t => t !== topic));
    }
  };

  const handleSave = async () => {
    if (!className.trim()) return alert("Please enter a class name");

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user ? user.id : '00000000-0000-0000-0000-000000000000';

    const { error } = await supabase.from('classes').insert([{
      name: className.trim(),
      teacher_id: userId,
      recent_topics: recentTopics,
      past_topics: pastTopics
    }]);

    setSaving(false);
    if (error) {
      alert("Error creating class: " + error.message);
    } else {
      onSave();
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading topics...</p>
        <style>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="create-class-page">
      <div className="form-card">
        <header className="card-header">
          <h1><Icon name="hat" size={28} style={{marginRight:'10px'}} /> Create New Class</h1>
          <button className="btn-back" onClick={onCancel}>← Back</button>
        </header>

        {/* Class Name */}
        <div className="form-section">
          <label>Class Name *</label>
          <input
            type="text"
            placeholder="e.g. Year 10 - Set 2"
            value={className}
            onChange={e => setClassName(e.target.value)}
            className="name-input"
          />
        </div>

        {/* Topic Search */}
        <div className="form-section">
          <label>Search Topics</label>
          <div className="search-box">
            <span className="search-icon"><Icon name="search" size={16} /></span>
            <input
              type="text"
              placeholder="Filter topics..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Recent Topics */}
        <div className="form-section">
          <div className="section-header">
            <label>Recent Topics (Last 2 Weeks)</label>
            <span className="count">{recentTopics.length} selected</span>
          </div>
          <p className="hint">Topics fresh in students' minds - will appear more frequently</p>
          <div className="tags-grid">
            {filteredTopics.map(topic => (
              <button
                key={`recent-${topic}`}
                className={`tag recent ${recentTopics.includes(topic) ? 'selected' : ''}`}
                onClick={() => toggleTopic(topic, 'recent')}
              >
                {topic}
                {recentTopics.includes(topic) && <span className="check"><Icon name="check" size={14} /></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Past Topics */}
        <div className="form-section">
          <div className="section-header">
            <label>Past Topics (Need Refreshing)</label>
            <span className="count">{pastTopics.length} selected</span>
          </div>
          <p className="hint">Topics from earlier - will use spaced repetition</p>
          <div className="tags-grid">
            {filteredTopics.map(topic => (
              <button
                key={`past-${topic}`}
                className={`tag past ${pastTopics.includes(topic) ? 'selected' : ''}`}
                onClick={() => toggleTopic(topic, 'past')}
                disabled={recentTopics.includes(topic)}
              >
                {topic}
                {pastTopics.includes(topic) && <span className="check"><Icon name="check" size={14} /></span>}
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="summary-bar">
          <div className="summary-item">
            <span className="label">Class:</span>
            <span className="value">{className || '(no name)'}</span>
          </div>
          <div className="summary-item">
            <span className="label">Total Topics:</span>
            <span className="value">{recentTopics.length + pastTopics.length}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button
            className="btn-save"
            onClick={handleSave}
            disabled={saving || !className.trim()}
          >
            {saving ? 'Creating...' : 'Create Class'}
          </button>
        </div>
      </div>

      <style>{createClassStyles}</style>
    </div>
  );
}

const createClassStyles = `
  .create-class-page {
    padding: 32px;
    max-width: 700px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .form-card {
    background: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 32px;
  }

  .card-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .btn-back {
    background: #f1f5f9;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
  }

  .btn-back:hover {
    background: #e2e8f0;
  }

  .form-section {
    margin-bottom: 28px;
  }

  .form-section > label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: #334155;
    margin-bottom: 10px;
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }

  .section-header label {
    font-weight: 600;
    font-size: 0.9rem;
    color: #334155;
  }

  .section-header .count {
    font-size: 0.8rem;
    color: #0d9488;
    font-weight: 600;
  }

  .hint {
    font-size: 0.8rem;
    color: #94a3b8;
    margin: 0 0 12px 0;
  }

  .name-input {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1.1rem;
  }

  .name-input:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
  }

  .search-box {
    position: relative;
  }

  .search-box .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
  }

  .search-box input {
    width: 100%;
    padding: 12px 12px 12px 44px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 0.95rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: #14b8a6;
  }

  .tags-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    max-height: 200px;
    overflow-y: auto;
    padding: 4px;
  }

  .tag {
    padding: 8px 14px;
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    background: white;
    cursor: pointer;
    font-size: 0.85rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .tag:hover:not(:disabled) {
    border-color: #99f6e4;
    background: #f0fdfa;
  }

  .tag.recent.selected {
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border-color: transparent;
  }

  .tag.past.selected {
    background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
    color: white;
    border-color: transparent;
  }

  .tag:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .check {
    font-size: 0.75rem;
  }

  .summary-bar {
    display: flex;
    gap: 24px;
    padding: 16px 20px;
    background: #f8fafc;
    border-radius: 12px;
    margin-bottom: 24px;
  }

  .summary-item {
    display: flex;
    gap: 8px;
  }

  .summary-item .label {
    color: #64748b;
    font-size: 0.85rem;
  }

  .summary-item .value {
    color: #1e293b;
    font-weight: 600;
    font-size: 0.85rem;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 20px;
    border-top: 1px solid #f1f5f9;
  }

  .btn-cancel {
    padding: 12px 24px;
    background: transparent;
    border: none;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-save {
    padding: 12px 28px;
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
  }

  .btn-save:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
  }

  .btn-save:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .create-class-page {
      padding: 16px;
    }

    .form-card {
      padding: 24px;
    }

    .summary-bar {
      flex-direction: column;
      gap: 12px;
    }
  }
`;
