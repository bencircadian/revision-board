import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

// Difficulty mapping
const DIFFICULTIES = {
  '•': { label: '•', level: 1, className: 'level-1' },
  '••': { label: '••', level: 2, className: 'level-2' },
  '•••': { label: '•••', level: 3, className: 'level-3' },
  'Easy': { label: '•', level: 1, className: 'level-1' },
  'Medium': { label: '••', level: 2, className: 'level-2' },
  'Hard': { label: '•••', level: 3, className: 'level-3' },
  '1': { label: '•', level: 1, className: 'level-1' },
  '2': { label: '••', level: 2, className: 'level-2' },
  '3': { label: '•••', level: 3, className: 'level-3' },
};

const getDifficultyInfo = (diff) => {
  return DIFFICULTIES[diff] || DIFFICULTIES['••'];
};

export default function TopicsQuestions({ onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal & Editing State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ topic: '', difficulty: '••', generator_code: '' });
  
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [showSourceCode, setShowSourceCode] = useState(false); // Toggle for raw code

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data } = await supabase.from('questions').select('*').order('topic');
    if (data) {
      setQuestions(data);
      const uniqueTopics = [...new Set(data.map(q => q.topic))].sort();
      setTopics(uniqueTopics);
    }
    setLoading(false);
  }

  // 1. Current Questions: Filtered ONLY by the dropdown topic
  const viewQuestions = questions.filter(q => 
    selectedTopic === 'all' || q.topic === selectedTopic
  );

  // 2. Search Results: Filtered by the search bar
  const searchResults = searchQuery 
    ? questions.filter(q => 
        q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (q.generator_code && q.generator_code.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  const runGenerator = (code) => {
    try { 
      if (!code) return { q: "No code provided", a: "..." };
      return new Function(code)() 
    } catch (e) { 
      return { q: "Preview not available (Error)", a: "Check code syntax" } 
    }
  };

  // Open Modal for Create
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ topic: '', difficulty: '••', generator_code: '' });
    setShowAddModal(true);
  };

  // Open Modal for Edit
  const openEditModal = (e, q) => {
    e.stopPropagation();
    setEditingId(q.id);
    setFormData({ 
      topic: q.topic, 
      difficulty: q.difficulty, 
      generator_code: q.generator_code 
    });
    setShowAddModal(true);
  };

  const handleSaveQuestion = async () => {
    if (!formData.topic || !formData.generator_code) {
      alert('Please fill in all required fields');
      return;
    }

    let error;
    if (editingId) {
      // Update existing
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          topic: formData.topic,
          difficulty: formData.difficulty,
          generator_code: formData.generator_code
        })
        .eq('id', editingId);
      error = updateError;
    } else {
      // Insert new
      const { error: insertError } = await supabase
        .from('questions')
        .insert([{
          topic: formData.topic,
          difficulty: formData.difficulty,
          generator_code: formData.generator_code
        }]);
      error = insertError;
    }

    if (error) {
      alert('Error saving question: ' + error.message);
    } else {
      setShowAddModal(false);
      setFormData({ topic: '', difficulty: '••', generator_code: '' });
      setEditingId(null);
      fetchQuestions();
    }
  };

  const getTopicStats = (topic) => {
    const topicQuestions = questions.filter(q => q.topic === topic);
    return {
      count: topicQuestions.length,
      difficulties: {
        level1: topicQuestions.filter(q => getDifficultyInfo(q.difficulty).level === 1).length,
        level2: topicQuestions.filter(q => getDifficultyInfo(q.difficulty).level === 2).length,
        level3: topicQuestions.filter(q => getDifficultyInfo(q.difficulty).level === 3).length,
      }
    };
  };

  const renderQuestionCard = (q) => {
    const example = runGenerator(q.generator_code);
    const isExpanded = expandedQuestion === q.id;
    const diffInfo = getDifficultyInfo(q.difficulty);

    return (
      <div
        key={q.id}
        className={`question-item ${isExpanded ? 'expanded' : ''}`}
        onClick={() => {
          setExpandedQuestion(isExpanded ? null : q.id);
          setShowSourceCode(false); // Reset code view on toggle
        }}
      >
        <div className="question-header">
          <span className={`difficulty-badge ${diffInfo.className}`}>
            {diffInfo.label}
          </span>
          <span className="topic-badge">{q.topic}</span>
        </div>
        
        {/* Always show the EXECUTED preview, never the code by default */}
        <div className="question-preview">
          <strong>Q:</strong> {example.q}
        </div>
        <div className="answer-preview">
          <strong>A:</strong> {example.a}
        </div>

        {isExpanded && (
          <div className="question-details">
            <div className="detail-actions">
              <button className="action-btn primary" onClick={(e) => openEditModal(e, q)}>
                <Icon name="edit" size={14} /> Edit Question
              </button>
              
              <button className="action-btn" onClick={(e) => {
                e.stopPropagation();
                // Force a re-render to test generator (simple way)
                setQuestions([...questions]); 
              }}>
                <Icon name="refresh" size={14} /> Test New Version
              </button>

              <button className="action-btn" onClick={(e) => {
                e.stopPropagation();
                setShowSourceCode(!showSourceCode);
              }}>
                <Icon name="search" size={14} /> {showSourceCode ? 'Hide Source' : 'View Source'}
              </button>
            </div>

            {/* Only show code if explicitly requested */}
            {showSourceCode && (
              <div className="code-block">
                <pre>{q.generator_code}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading question bank...</p>
        <style>{`.loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; } .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="topics-page">
      <header className="page-header">
        <div className="header-content">
          <h1><Icon name="bank" size={28} style={{marginRight:'10px'}} /> Topics & Questions</h1>
          <p>Browse and manage your question bank</p>
        </div>
        <button className="btn-add" onClick={openCreateModal}>
          <><Icon name="plus" size={16} /> Add Question</>
        </button>
      </header>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon"><Icon name="search" size={16} /></span>
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={selectedTopic}
          onChange={(e) => setSelectedTopic(e.target.value)}
          className="topic-filter"
        >
          <option value="all">All Topics ({questions.length})</option>
          {topics.map(topic => (
            <option key={topic} value={topic}>
              {topic} ({getTopicStats(topic).count})
            </option>
          ))}
        </select>
      </div>

      {searchQuery && (
        <div className="search-results-section">
          <h2>
            <Icon name="search" size={20} style={{marginRight:'8px'}} />
            Search Results <span className="count">({searchResults.length})</span>
            <button className="btn-clear" onClick={() => setSearchQuery('')}>Clear</button>
          </h2>
          {searchResults.length === 0 ? <div className="empty-state"><p>No matches.</p></div> : 
            <div className="questions-grid">{searchResults.map(q => renderQuestionCard(q))}</div>
          }
          <hr className="section-divider" />
        </div>
      )}

      {selectedTopic === 'all' && (
        <div className="topics-overview">
          <h2>Topics Overview</h2>
          <div className="topics-grid">
            {topics.map(topic => {
              const stats = getTopicStats(topic);
              return (
                <div key={topic} className="topic-card" onClick={() => setSelectedTopic(topic)}>
                  <h3>{topic}</h3>
                  <div className="topic-stats">
                    <span className="total">{stats.count} questions</span>
                    <div className="difficulty-breakdown">
                      {stats.difficulties.level1 > 0 && <span className="diff level-1">{stats.difficulties.level1} •</span>}
                      {stats.difficulties.level2 > 0 && <span className="diff level-2">{stats.difficulties.level2} ••</span>}
                      {stats.difficulties.level3 > 0 && <span className="diff level-3">{stats.difficulties.level3} •••</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="questions-list">
        <h2>
          {selectedTopic === 'all' ? 'All Questions' : selectedTopic}
          <span className="count">({viewQuestions.length})</span>
          {selectedTopic !== 'all' && (
            <button className="btn-clear" onClick={() => setSelectedTopic('all')}>Show All</button>
          )}
        </h2>

        {viewQuestions.length === 0 ? (
          <div className="empty-state"><p>No questions found.</p></div>
        ) : (
          <div className="questions-grid">
            {viewQuestions.map(q => renderQuestionCard(q))}
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-box large">
            <h3><Icon name={editingId ? "edit" : "plus"} size={20} /> {editingId ? "Edit Question" : "Add New Question"}</h3>
            <div className="form-group">
              <label>Topic</label>
              <input
                type="text"
                placeholder="e.g. Fractions"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                list="topic-suggestions"
              />
              <datalist id="topic-suggestions">{topics.map(t => <option key={t} value={t} />)}</datalist>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <div className="difficulty-selector">
                <button type="button" className={`diff-btn ${formData.difficulty === '•' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, difficulty: '•' })}>•</button>
                <button type="button" className={`diff-btn ${formData.difficulty === '••' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, difficulty: '••' })}>••</button>
                <button type="button" className={`diff-btn ${formData.difficulty === '•••' ? 'active' : ''}`} onClick={() => setFormData({ ...formData, difficulty: '•••' })}>•••</button>
              </div>
            </div>
            <div className="form-group">
              <label>Generator Code (JavaScript)</label>
              <textarea
                placeholder={`// Example:\nconst a = Math.floor(Math.random() * 10) + 1;\nreturn { q: \`\${a} + 1?\`, a: \`\${a + 1}\` };`}
                value={formData.generator_code}
                onChange={(e) => setFormData({ ...formData, generator_code: e.target.value })}
                rows={8}
              />
            </div>
            {formData.generator_code && (
              <div className="preview-box">
                <h4>Preview Output:</h4>
                <p><strong>Q:</strong> {runGenerator(formData.generator_code).q}</p>
                <p><strong>A:</strong> {runGenerator(formData.generator_code).a}</p>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleSaveQuestion}>{editingId ? "Save Changes" : "Add Question"}</button>
            </div>
          </div>
        </div>
      )}

      <style>{topicsStyles}</style>
    </div>
  );
}

const topicsStyles = `
  .topics-page { padding: 32px; max-width: 1200px; margin: 0 auto; font-family: 'Inter', sans-serif; }
  .page-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .header-content h1 { font-size: 1.75rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; display: flex; align-items: center; }
  .header-content p { color: #64748b; margin: 0; }
  .btn-add { padding: 12px 24px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); display: flex; align-items: center; gap: 8px; }
  .btn-add:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35); }
  .filters-bar { display: flex; gap: 16px; margin-bottom: 32px; }
  .search-box { flex: 1; position: relative; }
  .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 1rem; color: #64748b; }
  .search-box input { width: 100%; padding: 14px 14px 14px 48px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; transition: all 0.2s; }
  .search-box input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1); }
  .topic-filter { padding: 14px 20px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; background: white; min-width: 200px; cursor: pointer; }
  .search-results-section { margin-bottom: 40px; }
  .search-results-section h2 { font-size: 1.2rem; color: #0d9488; margin: 0 0 20px 0; display: flex; align-items: center; }
  .search-results-section h2 .count { color: #64748b; font-weight: 400; margin-left: 8px; }
  .section-divider { border: 0; height: 1px; background: #e2e8f0; margin: 32px 0; }
  .topics-overview { margin-bottom: 40px; }
  .topics-overview h2 { font-size: 1.1rem; color: #64748b; margin: 0 0 16px 0; font-weight: 600; }
  .topics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; }
  .topic-card { background: white; padding: 20px; border-radius: 14px; border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s; }
  .topic-card:hover { border-color: #99f6e4; box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }
  .topic-card h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 0 0 12px 0; }
  .topic-stats .total { font-size: 0.85rem; color: #64748b; display: block; margin-bottom: 8px; }
  .difficulty-breakdown { display: flex; gap: 6px; flex-wrap: wrap; }
  .diff { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .diff.level-1 { background: #dcfce7; color: #16a34a; }
  .diff.level-2 { background: #fef9c3; color: #ca8a04; }
  .diff.level-3 { background: #fee2e2; color: #dc2626; }
  .questions-list h2 { font-size: 1.1rem; color: #1e293b; margin: 0 0 20px 0; display: flex; align-items: center; gap: 10px; }
  .questions-list h2 .count { color: #94a3b8; font-weight: 400; }
  .btn-clear { background: #fef2f2; color: #dc2626; border: none; padding: 4px 12px; border-radius: 20px; font-size: 0.75rem; font-weight: 600; cursor: pointer; margin-left: auto; }
  .questions-grid { display: grid; gap: 12px; }
  .question-item { background: white; padding: 20px; border-radius: 14px; border: 1px solid #f1f5f9; cursor: pointer; transition: all 0.2s; }
  .question-item:hover { border-color: #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
  .question-item.expanded { border-color: #99f6e4; box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
  .question-header { display: flex; gap: 8px; margin-bottom: 12px; }
  .difficulty-badge { padding: 4px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 700; letter-spacing: 1px; }
  .difficulty-badge.level-1 { background: #dcfce7; color: #16a34a; }
  .difficulty-badge.level-2 { background: #fef9c3; color: #ca8a04; }
  .difficulty-badge.level-3 { background: #fee2e2; color: #dc2626; }
  .topic-badge { padding: 4px 10px; border-radius: 20px; font-size: 0.7rem; font-weight: 600; background: #f0fdfa; color: #0d9488; }
  .question-preview, .answer-preview { font-size: 0.9rem; color: #334155; margin-bottom: 6px; }
  .answer-preview { color: #64748b; }
  .question-details { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f1f5f9; }
  .code-block { background: #f8fafc; padding: 12px; border-radius: 8px; font-size: 0.75rem; overflow-x: auto; margin-top: 12px; border: 1px solid #e2e8f0; }
  .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .action-btn { padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; color: #64748b; }
  .action-btn:hover { background: #f0fdfa; border-color: #99f6e4; color: #0d9488; }
  .action-btn.primary { background: #0d9488; color: white; border-color: #0d9488; }
  .action-btn.primary:hover { background: #0f766e; }
  .empty-state { text-align: center; padding: 60px; color: #64748b; background: #f8fafc; border-radius: 16px; border: 2px dashed #e2e8f0; }
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; }
  .modal-box { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); max-width: 600px; width: 100%; max-height: 90vh; overflow-y: auto; }
  .modal-box h3 { margin: 0 0 24px 0; font-size: 1.4rem; color: #1e293b; display: flex; align-items: center; gap: 8px; }
  .form-group { margin-bottom: 20px; }
  .form-group label { display: block; font-weight: 600; font-size: 0.85rem; color: #334155; margin-bottom: 8px; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; font-size: 1rem; font-family: inherit; }
  .form-group textarea { font-family: monospace; font-size: 0.85rem; resize: vertical; }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1); }
  .difficulty-selector { display: flex; gap: 8px; }
  .diff-btn { flex: 1; padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 10px; background: white; font-size: 1.2rem; font-weight: 700; cursor: pointer; transition: all 0.2s; letter-spacing: 2px; }
  .diff-btn:hover { border-color: #99f6e4; background: #f0fdfa; }
  .diff-btn.active { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border-color: transparent; }
  .preview-box { background: #f0fdfa; padding: 16px; border-radius: 10px; margin-bottom: 20px; border: 1px solid #99f6e4; }
  .preview-box h4 { margin: 0 0 8px 0; font-size: 0.8rem; color: #0d9488; }
  .preview-box p { margin: 4px 0; font-size: 0.9rem; color: #334155; }
  .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px; }
  .btn-cancel, .btn-confirm { padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; }
  .btn-cancel { background: #f1f5f9; color: #64748b; }
  .btn-confirm { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; }
  @media (max-width: 768px) { .topics-page { padding: 20px 16px; } .page-header { flex-direction: column; gap: 16px; } .btn-add { width: 100%; } .filters-bar { flex-direction: column; } .topic-filter { width: 100%; } .topics-grid { grid-template-columns: repeat(2, 1fr); } }
`;
