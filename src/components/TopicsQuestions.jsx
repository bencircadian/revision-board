import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function TopicsQuestions({ onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState({ topic: '', difficulty: 'Medium', generator_code: '' });
  const [expandedQuestion, setExpandedQuestion] = useState(null);

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

  const filteredQuestions = questions.filter(q => {
    const matchesTopic = selectedTopic === 'all' || q.topic === selectedTopic;
    const matchesSearch = !searchQuery || 
      q.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.generator_code && q.generator_code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTopic && matchesSearch;
  });

  const runGenerator = (code) => {
    try { return new Function(code)() } catch (e) { return { q: "Error in code", a: "..." } }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.topic || !newQuestion.generator_code) {
      alert('Please fill in all required fields');
      return;
    }

    const { error } = await supabase.from('questions').insert([{
      topic: newQuestion.topic,
      difficulty: newQuestion.difficulty,
      generator_code: newQuestion.generator_code
    }]);

    if (error) {
      alert('Error adding question: ' + error.message);
    } else {
      setShowAddModal(false);
      setNewQuestion({ topic: '', difficulty: 'Medium', generator_code: '' });
      fetchQuestions();
    }
  };

  const getTopicStats = (topic) => {
    const topicQuestions = questions.filter(q => q.topic === topic);
    return {
      count: topicQuestions.length,
      difficulties: {
        Easy: topicQuestions.filter(q => q.difficulty === 'Easy').length,
        Medium: topicQuestions.filter(q => q.difficulty === 'Medium').length,
        Hard: topicQuestions.filter(q => q.difficulty === 'Hard').length,
      }
    };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading question bank...</p>
        <style>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="topics-page">
      {/* Header */}
      <header className="page-header">
        <div className="header-content">
          <h1>📚 Topics & Questions</h1>
          <p>Browse and manage your question bank</p>
        </div>
        <button className="btn-add" onClick={() => setShowAddModal(true)}>
          + Add Question
        </button>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
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

      {/* Topic Overview Cards */}
      {selectedTopic === 'all' && (
        <div className="topics-overview">
          <h2>Topics Overview</h2>
          <div className="topics-grid">
            {topics.map(topic => {
              const stats = getTopicStats(topic);
              return (
                <div
                  key={topic}
                  className="topic-card"
                  onClick={() => setSelectedTopic(topic)}
                >
                  <h3>{topic}</h3>
                  <div className="topic-stats">
                    <span className="total">{stats.count} questions</span>
                    <div className="difficulty-breakdown">
                      {stats.difficulties.Easy > 0 && (
                        <span className="diff easy">{stats.difficulties.Easy} Easy</span>
                      )}
                      {stats.difficulties.Medium > 0 && (
                        <span className="diff medium">{stats.difficulties.Medium} Med</span>
                      )}
                      {stats.difficulties.Hard > 0 && (
                        <span className="diff hard">{stats.difficulties.Hard} Hard</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Questions List */}
      <div className="questions-list">
        <h2>
          {selectedTopic === 'all' ? 'All Questions' : selectedTopic}
          <span className="count">({filteredQuestions.length})</span>
          {selectedTopic !== 'all' && (
            <button className="btn-clear" onClick={() => setSelectedTopic('all')}>
              × Clear filter
            </button>
          )}
        </h2>

        {filteredQuestions.length === 0 ? (
          <div className="empty-state">
            <p>No questions found. Try adjusting your filters or add a new question.</p>
          </div>
        ) : (
          <div className="questions-grid">
            {filteredQuestions.map(q => {
              const example = runGenerator(q.generator_code);
              const isExpanded = expandedQuestion === q.id;

              return (
                <div
                  key={q.id}
                  className={`question-item ${isExpanded ? 'expanded' : ''}`}
                  onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                >
                  <div className="question-header">
                    <span className={`difficulty-badge ${q.difficulty?.toLowerCase() || 'medium'}`}>
                      {q.difficulty || 'Medium'}
                    </span>
                    <span className="topic-badge">{q.topic}</span>
                  </div>
                  <div className="question-preview">
                    <strong>Q:</strong> {example.q}
                  </div>
                  <div className="answer-preview">
                    <strong>A:</strong> {example.a}
                  </div>
                  {isExpanded && (
                    <div className="question-details">
                      <h4>Generator Code:</h4>
                      <pre>{q.generator_code}</pre>
                      <div className="detail-actions">
                        <button onClick={(e) => { e.stopPropagation(); /* Edit logic */ }}>
                          ✏️ Edit
                        </button>
                        <button onClick={(e) => {
                          e.stopPropagation();
                          const newExample = runGenerator(q.generator_code);
                          alert(`New instance:\nQ: ${newExample.q}\nA: ${newExample.a}`);
                        }}>
                          🔄 Test
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-box large">
            <h3>➕ Add New Question</h3>
            <div className="form-group">
              <label>Topic</label>
              <input
                type="text"
                placeholder="e.g. Fractions, Algebra, Trigonometry"
                value={newQuestion.topic}
                onChange={(e) => setNewQuestion({ ...newQuestion, topic: e.target.value })}
                list="topic-suggestions"
              />
              <datalist id="topic-suggestions">
                {topics.map(t => <option key={t} value={t} />)}
              </datalist>
            </div>
            <div className="form-group">
              <label>Difficulty</label>
              <select
                value={newQuestion.difficulty}
                onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: e.target.value })}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label>Generator Code (JavaScript)</label>
              <textarea
                placeholder={`// Example:\nconst a = Math.floor(Math.random() * 10) + 1;\nconst b = Math.floor(Math.random() * 10) + 1;\nreturn { q: \`What is \${a} + \${b}?\`, a: \`\${a + b}\` };`}
                value={newQuestion.generator_code}
                onChange={(e) => setNewQuestion({ ...newQuestion, generator_code: e.target.value })}
                rows={8}
              />
            </div>
            {newQuestion.generator_code && (
              <div className="preview-box">
                <h4>Preview:</h4>
                <p><strong>Q:</strong> {runGenerator(newQuestion.generator_code).q}</p>
                <p><strong>A:</strong> {runGenerator(newQuestion.generator_code).a}</p>
              </div>
            )}
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleAddQuestion}>Add Question</button>
            </div>
          </div>
        </div>
      )}

      <style>{topicsStyles}</style>
    </div>
  );
}

const topicsStyles = `
  .topics-page {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Header */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .header-content h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .header-content p {
    color: #64748b;
    margin: 0;
  }

  .btn-add {
    padding: 12px 24px;
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
  }

  .btn-add:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
  }

  /* Filters */
  .filters-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
  }

  .search-box {
    flex: 1;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
    font-size: 1rem;
  }

  .search-box input {
    width: 100%;
    padding: 14px 14px 14px 48px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    transition: all 0.2s;
  }

  .search-box input:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
  }

  .topic-filter {
    padding: 14px 20px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    background: white;
    min-width: 200px;
    cursor: pointer;
  }

  /* Topics Overview */
  .topics-overview {
    margin-bottom: 40px;
  }

  .topics-overview h2 {
    font-size: 1.1rem;
    color: #64748b;
    margin: 0 0 16px 0;
    font-weight: 600;
  }

  .topics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .topic-card {
    background: white;
    padding: 20px;
    border-radius: 14px;
    border: 1px solid #f1f5f9;
    cursor: pointer;
    transition: all 0.2s;
  }

  .topic-card:hover {
    border-color: #99f6e4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
    transform: translateY(-2px);
  }

  .topic-card h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 12px 0;
  }

  .topic-stats .total {
    font-size: 0.85rem;
    color: #64748b;
    display: block;
    margin-bottom: 8px;
  }

  .difficulty-breakdown {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .diff {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 0.7rem;
    font-weight: 600;
  }

  .diff.easy { background: #dcfce7; color: #16a34a; }
  .diff.medium { background: #fef9c3; color: #ca8a04; }
  .diff.hard { background: #fee2e2; color: #dc2626; }

  /* Questions List */
  .questions-list h2 {
    font-size: 1.1rem;
    color: #1e293b;
    margin: 0 0 20px 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .questions-list h2 .count {
    color: #94a3b8;
    font-weight: 400;
  }

  .btn-clear {
    background: #fef2f2;
    color: #dc2626;
    border: none;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;
    margin-left: auto;
  }

  .questions-grid {
    display: grid;
    gap: 12px;
  }

  .question-item {
    background: white;
    padding: 20px;
    border-radius: 14px;
    border: 1px solid #f1f5f9;
    cursor: pointer;
    transition: all 0.2s;
  }

  .question-item:hover {
    border-color: #e2e8f0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }

  .question-item.expanded {
    border-color: #99f6e4;
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .question-header {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .difficulty-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .difficulty-badge.easy { background: #dcfce7; color: #16a34a; }
  .difficulty-badge.medium { background: #fef9c3; color: #ca8a04; }
  .difficulty-badge.hard { background: #fee2e2; color: #dc2626; }

  .topic-badge {
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 0.7rem;
    font-weight: 600;
    background: #f0fdfa;
    color: #0d9488;
  }

  .question-preview, .answer-preview {
    font-size: 0.9rem;
    color: #334155;
    margin-bottom: 6px;
  }

  .answer-preview {
    color: #64748b;
  }

  .question-details {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
  }

  .question-details h4 {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0 0 8px 0;
  }

  .question-details pre {
    background: #f8fafc;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.75rem;
    overflow-x: auto;
    white-space: pre-wrap;
    word-break: break-all;
    margin: 0 0 12px 0;
  }

  .detail-actions {
    display: flex;
    gap: 8px;
  }

  .detail-actions button {
    padding: 6px 12px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: white;
    font-size: 0.8rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .detail-actions button:hover {
    background: #f8fafc;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 60px;
    color: #64748b;
    background: #f8fafc;
    border-radius: 16px;
    border: 2px dashed #e2e8f0;
  }

  /* Modal */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
    padding: 20px;
  }

  .modal-box {
    background: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .modal-box h3 {
    margin: 0 0 24px 0;
    font-size: 1.4rem;
    color: #1e293b;
  }

  .form-group {
    margin-bottom: 20px;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    font-size: 0.85rem;
    color: #334155;
    margin-bottom: 8px;
  }

  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 1rem;
    font-family: inherit;
  }

  .form-group textarea {
    font-family: monospace;
    font-size: 0.85rem;
    resize: vertical;
  }

  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
  }

  .preview-box {
    background: #f0fdfa;
    padding: 16px;
    border-radius: 10px;
    margin-bottom: 20px;
    border: 1px solid #99f6e4;
  }

  .preview-box h4 {
    margin: 0 0 8px 0;
    font-size: 0.8rem;
    color: #0d9488;
  }

  .preview-box p {
    margin: 4px 0;
    font-size: 0.9rem;
    color: #334155;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
    margin-top: 24px;
  }

  .btn-cancel, .btn-confirm {
    padding: 12px 24px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    border: none;
  }

  .btn-cancel {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-confirm {
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .topics-page {
      padding: 20px 16px;
    }

    .page-header {
      flex-direction: column;
      gap: 16px;
    }

    .btn-add {
      width: 100%;
    }

    .filters-bar {
      flex-direction: column;
    }

    .topic-filter {
      width: 100%;
    }

    .topics-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;
