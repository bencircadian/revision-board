import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

export default function CreateDNA({ onGenerate, onCancel }) {
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selections, setSelections] = useState([{ id: 1, topic: '', difficulty: 'Medium' }]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchTopics() {
      const { data } = await supabase.from('questions').select('topic');
      if (data) {
        const uniqueTopics = [...new Set(data.map(d => d.topic))].sort();
        setAvailableTopics(uniqueTopics);
        if (uniqueTopics.length > 0) {
          setSelections([{ id: 1, topic: uniqueTopics[0], difficulty: 'Medium' }]);
        }
      }
      setLoading(false);
    }
    fetchTopics();
  }, []);

  const filteredTopics = availableTopics.filter(t => 
    t.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addRow = () => {
    if (selections.length < 6) {
      setSelections([...selections, { id: Date.now(), topic: availableTopics[0], difficulty: 'Medium' }]);
    }
  };

  const removeRow = (id) => setSelections(selections.filter(s => s.id !== id));

  const updateRow = (id, field, value) => {
    setSelections(selections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleGenerate = async () => {
    setLoading(true);
    let generatedCards = [];
    
    for (const selection of selections) {
      const { data } = await supabase.from('questions').select('*').eq('topic', selection.topic);
      if (data && data.length > 0) {
        const randomQ = data[Math.floor(Math.random() * data.length)];
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

        {/* Selections */}
        <div className="selection-list">
          {selections.map((row, index) => (
            <div key={row.id} className="selection-row">
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
              <select 
                value={row.difficulty} 
                onChange={(e) => updateRow(row.id, 'difficulty', e.target.value)}
                className="diff-select"
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              {selections.length > 1 && (
                <button className="btn-remove" onClick={() => removeRow(row.id)}>×</button>
              )}
            </div>
          ))}
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
                  if (selections.length < 6 && !selections.some(s => s.topic === topic)) {
                    setSelections([...selections, { id: Date.now(), topic, difficulty: 'Medium' }]);
                  }
                }}
                disabled={selections.length >= 6 || selections.some(s => s.topic === topic)}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="actions">
          {selections.length < 6 && (
            <button className="btn-add-row" onClick={addRow}>
              + Add Another Topic
            </button>
          )}
          
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
    max-width: 700px;
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

  /* Topic Search */
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

  /* Selection List */
  .selection-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 24px;
  }

  .selection-row {
    display: flex;
    gap: 12px;
    align-items: center;
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
    flex: 1;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 1rem;
    background: white;
  }

  .diff-select {
    width: 120px;
    padding: 12px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    font-size: 1rem;
    background: white;
  }

  .btn-remove {
    width: 40px;
    height: 40px;
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
    border-radius: 10px;
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
  }

  .btn-remove:hover {
    background: #fee2e2;
  }

  /* Quick Topics */
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

  /* Actions */
  .actions {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-bottom: 24px;
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

  .btn-add-row:hover {
    background: #f0fdfa;
    border-color: #99f6e4;
    color: #0d9488;
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

  /* Preview Info */
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
    max-width: 300px;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .create-dna-page {
      padding: 16px;
    }

    .create-card {
      padding: 24px;
    }

    .selection-row {
      flex-wrap: wrap;
    }

    .topic-select {
      flex: 1 1 100%;
      order: 1;
    }

    .diff-select {
      flex: 1;
      order: 2;
    }

    .btn-remove {
      order: 3;
    }

    .row-num {
      order: 0;
    }
  }
`;
