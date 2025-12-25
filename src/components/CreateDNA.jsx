import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

// Difficulty mapping
const DIFFICULTIES = {
  '•': { label: '•', level: 1 },
  '••': { label: '••', level: 2 },
  '•••': { label: '•••', level: 3 },
};

export default function CreateDNA({ onGenerate, onCancel }) {
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selections, setSelections] = useState([{ id: 1, topic: '', difficulty: '••' }]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [topicQuestions, setTopicQuestions] = useState({}); // Cache of questions by topic
  const [previews, setPreviews] = useState({}); // Preview for each row

  useEffect(() => {
    async function fetchTopics() {
      const { data } = await supabase.from('questions').select('*').order('topic');
      if (data) {
        const uniqueTopics = [...new Set(data.map(d => d.topic))].sort();
        setAvailableTopics(uniqueTopics);
        
        // Cache questions by topic
        const byTopic = {};
        data.forEach(q => {
          if (!byTopic[q.topic]) byTopic[q.topic] = [];
          byTopic[q.topic].push(q);
        });
        setTopicQuestions(byTopic);
        
        if (uniqueTopics.length > 0) {
          const firstTopic = uniqueTopics[0];
          setSelections([{ id: 1, topic: firstTopic, difficulty: '••' }]);
          // Generate initial preview
          generatePreview(1, firstTopic, byTopic);
        }
      }
      setLoading(false);
    }
    fetchTopics();
  }, []);

  const generatePreview = (rowId, topic, questionsCache = topicQuestions) => {
    const questions = questionsCache[topic];
    if (questions && questions.length > 0) {
      const randomQ = questions[Math.floor(Math.random() * questions.length)];
      const generated = runGenerator(randomQ.generator_code);
      setPreviews(prev => ({
        ...prev,
        [rowId]: { q: generated.q, a: generated.a }
      }));
    } else {
      setPreviews(prev => ({
        ...prev,
        [rowId]: { q: 'No questions available', a: '-' }
      }));
    }
  };

  const refreshPreview = (rowId, topic) => {
    generatePreview(rowId, topic);
  };

  const filteredTopics = availableTopics.filter(t => 
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addRow = () => {
    if (selections.length < 6) {
      const newId = Date.now();
      const newTopic = availableTopics[0];
      setSelections([...selections, { id: newId, topic: newTopic, difficulty: '••' }]);
      generatePreview(newId, newTopic);
    }
  };

  const duplicateRow = (row) => {
    if (selections.length < 6) {
      const newId = Date.now();
      setSelections([...selections, { id: newId, topic: row.topic, difficulty: row.difficulty }]);
      generatePreview(newId, row.topic);
    }
  };

  const removeRow = (id) => {
    setSelections(selections.filter(s => s.id !== id));
    setPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[id];
      return newPreviews;
    });
  };

  const updateRow = (id, field, value) => {
    setSelections(selections.map(s => s.id === id ? { ...s, [field]: value } : s));
    if (field === 'topic') {
      generatePreview(id, value);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    let generatedCards = [];
    
    for (const selection of selections) {
      const questions = topicQuestions[selection.topic];
      if (questions && questions.length > 0) {
        const randomQ = questions[Math.floor(Math.random() * questions.length)];
        const generated = runGenerator(randomQ.generator_code);
        generatedCards.push({
          ...randomQ,
          currentQ: generated.q,
          currentA: generated.a,
          revealed: false,
          fontSize: 1.4,
          isReview: false
        });
      } else {
        generatedCards.push({
          id: `fallback-${Math.random()}`,
          topic: selection.topic,
          difficulty: selection.difficulty,
          currentQ: `No question found for ${selection.topic}`,
          currentA: "-",
          revealed: false,
          fontSize: 1.4
        });
      }
    }
    
    setLoading(false);
    onGenerate(generatedCards);
  };

  function runGenerator(code) {
    try { return new Function(code)() } catch (e) { return { q: "Error", a: "..." } }
  }

  if (loading && availableTopics.length === 0) {
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
    <div className="create-dna-page">
      <div className="create-card">
        <header className="card-header">
          <div>
            <h1>🧬 Create Custom DNA</h1>
            <p>Select up to 6 topics for your starter board</p>
          </div>
          <button className="btn-back" onClick={onCancel}>← Back</button>
        </header>

        {/* Topic Search */}
        <div className="topic-search">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search topics..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Selections - Fixed height container */}
        <div className="selection-container">
          <div className="selection-list">
            {selections.map((row, index) => (
              <div key={row.id} className="selection-row">
                <div className="row-controls">
                  <span className="row-num">{index + 1}</span>
                  <select 
                    value={row.topic} 
                    onChange={(e) => updateRow(row.id, 'topic', e.target.value)}
                    className="topic-select"
                  >
                    {(searchTerm ? filteredTopics : availableTopics).map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                  <div className="diff-buttons">
                    <button
                      type="button"
                      className={`diff-btn ${row.difficulty === '•' ? 'active' : ''}`}
                      onClick={() => updateRow(row.id, 'difficulty', '•')}
                      title="Level 1"
                    >
                      •
                    </button>
                    <button
                      type="button"
                      className={`diff-btn ${row.difficulty === '••' ? 'active' : ''}`}
                      onClick={() => updateRow(row.id, 'difficulty', '••')}
                      title="Level 2"
                    >
                      ••
                    </button>
                    <button
                      type="button"
                      className={`diff-btn ${row.difficulty === '•••' ? 'active' : ''}`}
                      onClick={() => updateRow(row.id, 'difficulty', '•••')}
                      title="Level 3"
                    >
                      •••
                    </button>
                  </div>
                  <button 
                    className="btn-duplicate" 
                    onClick={() => duplicateRow(row)}
                    disabled={selections.length >= 6}
                    title="Duplicate this topic"
                  >
                    ⧉
                  </button>
                  {selections.length > 1 && (
                    <button className="btn-remove" onClick={() => removeRow(row.id)}>×</button>
                  )}
                </div>
                
                {/* Preview Panel */}
                <div className="preview-panel">
                  <div className="preview-content">
                    <div className="preview-question">
                      <strong>Q:</strong> {previews[row.id]?.q || 'Loading...'}
                    </div>
                    <div className="preview-answer">
                      <strong>A:</strong> {previews[row.id]?.a || '...'}
                    </div>
                  </div>
                  <button 
                    className="btn-refresh" 
                    onClick={() => refreshPreview(row.id, row.topic)}
                    title="Show different example"
                  >
                    🔄
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Fixed position Add button */}
          <div className="add-row-container">
            <button 
              className="btn-add-row" 
              onClick={addRow}
              disabled={selections.length >= 6}
            >
              {selections.length >= 6 ? '6/6 topics selected' : '+ Add Another Topic'}
            </button>
          </div>
        </div>

        {/* Quick Add Topics */}
        <div className="quick-topics">
          <span className="label">Quick add:</span>
          <div className="topic-chips">
            {availableTopics.slice(0, 8).map(topic => (
              <button
                key={topic}
                className={`topic-chip ${selections.some(s => s.topic === topic) ? 'selected' : ''}`}
                onClick={() => {
                  if (selections.length < 6) {
                    const newId = Date.now();
                    setSelections([...selections, { id: newId, topic, difficulty: '••' }]);
                    generatePreview(newId, topic);
                  }
                }}
                disabled={selections.length >= 6}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          <div className="main-actions">
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : '🚀 Generate Board'}
            </button>
          </div>
        </div>

        {/* Preview Info */}
        <div className="preview-info">
          <span className="count">{selections.length}/6 questions</span>
          <span className="topics">
            Topics: {selections.map(s => s.topic).filter(Boolean).join(', ') || 'None selected'}
          </span>
        </div>
      </div>

      <style>{createDNAStyles}</style>
    </div>
  );
}

const createDNAStyles = `
  .create-dna-page {
    padding: 32px;
    max-width: 900px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .create-card {
    background: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .card-header h1 {
    font-size: 1.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .card-header p {
    color: #64748b;
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

  .topic-search {
    position: relative;
    margin-bottom: 24px;
  }

  .topic-search .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
  }

  .topic-search input {
    width: 100%;
    padding: 14px 14px 14px 48px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
  }

  .topic-search input:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
  }

  /* Fixed height container for selections */
  .selection-container {
    margin-bottom: 24px;
  }

  .selection-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 420px; /* Fixed height for 6 rows */
    margin-bottom: 12px;
  }

  .selection-row {
    display: flex;
    gap: 12px;
    align-items: stretch;
    background: #f8fafc;
    border-radius: 12px;
    padding: 12px;
    border: 1px solid #e2e8f0;
  }

  .row-controls {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-shrink: 0;
  }

  .row-num {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.85rem;
    flex-shrink: 0;
  }

  .topic-select {
    width: 180px;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.9rem;
    background: white;
  }

  .diff-buttons {
    display: flex;
    gap: 4px;
  }

  .diff-btn {
    width: 32px;
    height: 32px;
    border: 2px solid #e2e8f0;
    border-radius: 6px;
    background: white;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    letter-spacing: -1px;
  }

  .diff-btn:hover {
    border-color: #99f6e4;
    background: #f0fdfa;
  }

  .diff-btn.active {
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border-color: transparent;
  }

  .btn-duplicate {
    width: 32px;
    height: 32px;
    background: #f0fdfa;
    color: #0d9488;
    border: 1px solid #99f6e4;
    border-radius: 6px;
    font-size: 1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-duplicate:hover:not(:disabled) {
    background: #ccfbf1;
  }

  .btn-duplicate:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn-remove {
    width: 32px;
    height: 32px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 6px;
    font-size: 1.1rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-remove:hover {
    background: #fee2e2;
  }

  /* Preview Panel */
  .preview-panel {
    flex: 1;
    display: flex;
    gap: 8px;
    align-items: center;
    background: white;
    border-radius: 8px;
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    min-width: 0;
  }

  .preview-content {
    flex: 1;
    min-width: 0;
  }

  .preview-question {
    font-size: 0.85rem;
    color: #334155;
    margin-bottom: 4px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .preview-answer {
    font-size: 0.8rem;
    color: #64748b;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-refresh {
    width: 28px;
    height: 28px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .btn-refresh:hover {
    background: #f0fdfa;
    border-color: #99f6e4;
  }

  /* Fixed Add Button Container */
  .add-row-container {
    height: 52px;
  }

  .btn-add-row {
    width: 100%;
    padding: 14px;
    background: #f8fafc;
    border: 2px dashed #d1d5db;
    border-radius: 12px;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-add-row:hover:not(:disabled) {
    background: #f0fdfa;
    border-color: #99f6e4;
    color: #0d9488;
  }

  .btn-add-row:disabled {
    background: #f1f5f9;
    border-color: #e2e8f0;
    color: #94a3b8;
    cursor: default;
  }

  .quick-topics {
    margin-bottom: 32px;
  }

  .quick-topics .label {
    font-size: 0.85rem;
    color: #64748b;
    font-weight: 600;
    display: block;
    margin-bottom: 10px;
  }

  .topic-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .topic-chip {
    padding: 6px 14px;
    border: 1px solid #e2e8f0;
    border-radius: 20px;
    background: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .topic-chip:hover:not(:disabled) {
    border-color: #99f6e4;
    background: #f0fdfa;
    color: #0d9488;
  }

  .topic-chip.selected {
    background: #ccfbf1;
    border-color: #14b8a6;
    color: #0d9488;
  }

  .topic-chip:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .actions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
  }

  .main-actions {
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn-cancel {
    padding: 14px 24px;
    background: transparent;
    border: none;
    color: #64748b;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-generate {
    padding: 14px 28px;
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
    transition: all 0.2s;
  }

  .btn-generate:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
  }

  .btn-generate:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .preview-info {
    display: flex;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    font-size: 0.85rem;
    color: #64748b;
  }

  .preview-info .count {
    font-weight: 600;
    color: #0d9488;
  }

  .preview-info .topics {
    text-overflow: ellipsis;
    overflow: hidden;
    white-space: nowrap;
    max-width: 400px;
  }

  @media (max-width: 768px) {
    .create-dna-page {
      padding: 16px;
    }

    .create-card {
      padding: 20px;
    }

    .selection-row {
      flex-direction: column;
      gap: 10px;
    }

    .row-controls {
      flex-wrap: wrap;
    }

    .topic-select {
      flex: 1;
      width: auto;
    }

    .preview-panel {
      width: 100%;
    }

    .selection-list {
      min-height: auto;
    }
  }
`;
