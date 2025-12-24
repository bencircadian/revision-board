import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function CreateDNA({ onGenerate, onCancel }) {
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selections, setSelections] = useState([
    { id: 1, topic: '', difficulty: 'Medium' }
  ]);
  const [loading, setLoading] = useState(true);

  // Fetch Logic
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

  // Handlers
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
        generatedCards.push({
          ...randomQ,
          currentQ: runGenerator(randomQ.generator_code).q,
          currentA: runGenerator(randomQ.generator_code).a,
          revealed: false, fontSize: 1.4, isReview: false
        });
      } else {
        generatedCards.push({
          id: `fallback-${Math.random()}`, topic: selection.topic, difficulty: selection.difficulty,
          currentQ: `No question found for ${selection.topic}`, currentA: "-", revealed: false, fontSize: 1.4
        });
      }
    }
    setLoading(false);
    onGenerate(generatedCards);
  };

  function runGenerator(code) {
    try { return new Function(code)() } catch (e) { return { q: "Error", a: "..." } }
  }

  if (loading && availableTopics.length === 0) return <div style={{padding: 40}}>Loading...</div>;

  return (
    <div className="create-dna-container">
      <div className="create-card">
        <h2>🧬 Design your DNA</h2>
        <p>Select up to 6 topics for today's starter.</p>

        <div className="selection-list">
          {selections.map((row, index) => (
            <div key={row.id} className="selection-row">
              <span className="row-num">{index + 1}</span>
              <select value={row.topic} onChange={(e) => updateRow(row.id, 'topic', e.target.value)}>
                {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <select value={row.difficulty} onChange={(e) => updateRow(row.id, 'difficulty', e.target.value)}>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
              <button className="btn-remove" onClick={() => removeRow(row.id)}>×</button>
            </div>
          ))}
        </div>

        <div className="buttons-stack">
          {selections.length < 6 && (
            <button className="btn-add-row" onClick={addRow}>+ Add Question Slot</button>
          )}
          <div className="create-actions">
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="btn-generate" onClick={handleGenerate}>
              {loading ? '...' : '🚀 Generate Board'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .create-dna-container {
          padding: 20px;
          display: flex; justify-content: center; align-items: center;
          min-height: 85vh; /* Centers vertically on screen */
        }
        .create-card {
          background: white; padding: 40px; border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 100%; max-width: 600px;
          text-align: center; /* Centers title and text */
        }
        h2 { margin: 0 0 10px 0; color: #2c3e50; }
        p { color: #7f8c8d; margin-bottom: 30px; }

        .selection-list { display: flex; flex-direction: column; gap: 12px; margin-bottom: 30px; }
        
        .selection-row { 
          display: flex; gap: 10px; align-items: center; justify-content: center; /* CENTERS THE DROPDOWNS */
        }
        
        .row-num { font-weight: bold; color: #ccc; width: 20px; }
        select { padding: 12px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; width: 150px; }
        
        .btn-remove { background: #fff5f5; color: #c0392b; border: 1px solid #ffcccc; width: 44px; height: 44px; border-radius: 8px; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center;}
        
        .buttons-stack { display: flex; flex-direction: column; gap: 20px; align-items: center; }
        .btn-add-row { width: 100%; padding: 12px; background: #f8f9fa; border: 2px dashed #d1d5db; color: #6b7280; border-radius: 8px; font-weight: 600; cursor: pointer; }
        .btn-add-row:hover { background: #f3f4f6; border-color: #9ca3af; }
        
        .create-actions { display: flex; gap: 20px; justify-content: center; width: 100%; }
        .btn-cancel { padding: 12px 24px; background: transparent; border: none; color: #6b7280; cursor: pointer; font-weight: 600; }
        .btn-generate { padding: 12px 30px; background: #2c3e50; color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .btn-generate:hover { background: #34495e; transform: translateY(-1px); }
      `}</style>
    </div>
  );
}
