import { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function CreateDna({ onGenerate, onCancel }) {
  const [availableTopics, setAvailableTopics] = useState([]);
  const [selections, setSelections] = useState([
    { id: 1, topic: '', difficulty: 'Medium' }
  ]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch all available topics from the DB so the dropdown is real
  useEffect(() => {
    async function fetchTopics() {
      // We fetch all questions just to get the unique topics
      // (In a larger app, you'd have a separate 'topics' table)
      const { data } = await supabase.from('questions').select('topic');
      
      if (data) {
        // Filter for unique topics only
        const uniqueTopics = [...new Set(data.map(d => d.topic))].sort();
        setAvailableTopics(uniqueTopics);
        
        // Set default topic for the first dropdown
        if (uniqueTopics.length > 0) {
          setSelections([{ id: 1, topic: uniqueTopics[0], difficulty: 'Medium' }]);
        }
      }
      setLoading(false);
    }
    fetchTopics();
  }, []);

  // --- Handlers ---

  const addRow = () => {
    if (selections.length < 6) {
      setSelections([
        ...selections, 
        { id: Date.now(), topic: availableTopics[0], difficulty: 'Medium' }
      ]);
    }
  };

  const removeRow = (id) => {
    setSelections(selections.filter(s => s.id !== id));
  };

  const updateRow = (id, field, value) => {
    setSelections(selections.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    ));
  };

  const handleGenerate = async () => {
    setLoading(true);
    let generatedCards = [];

    // 2. For each row, fetch a random question matching the criteria
    for (const selection of selections) {
      const { data } = await supabase
        .from('questions')
        .select('*')
        .eq('topic', selection.topic)
        // If your DB has a difficulty column, uncomment this:
        // .eq('difficulty', selection.difficulty); 
      
      if (data && data.length > 0) {
        // Pick one random question from the matching set
        const randomQ = data[Math.floor(Math.random() * data.length)];
        generatedCards.push({
          ...randomQ,
          currentQ: runGenerator(randomQ.generator_code).q,
          currentA: runGenerator(randomQ.generator_code).a,
          revealed: false,
          fontSize: 1.4,
          isReview: false
        });
      } else {
        // Fallback if no question exists for that topic
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

  // Helper to run the generator code immediately
  function runGenerator(code) {
    if (!code) return { q: "Error", a: "..." };
    try {
      const generator = new Function(code);
      return generator();
    } catch (err) {
      return { q: "Generator Error", a: "Error" };
    }
  }

  if (loading && availableTopics.length === 0) return <div className="p-10">Loading Topics...</div>;

  return (
    <div className="create-dna-container">
      <div className="create-card">
        <h2>🧬 Design your DNA</h2>
        <p>Select up to 6 topics for today's starter.</p>

        <div className="selection-list">
          {selections.map((row, index) => (
            <div key={row.id} className="selection-row">
              <span className="row-num">{index + 1}</span>
              
              <select 
                value={row.topic} 
                onChange={(e) => updateRow(row.id, 'topic', e.target.value)}
              >
                {availableTopics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              <select 
                value={row.difficulty}
                onChange={(e) => updateRow(row.id, 'difficulty', e.target.value)}
              >
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>

              <button className="btn-remove" onClick={() => removeRow(row.id)}>×</button>
            </div>
          ))}
        </div>

        {selections.length < 6 && (
          <button className="btn-add-row" onClick={addRow}>+ Add Question Slot</button>
        )}

        <div className="create-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-generate" onClick={handleGenerate}>
            {loading ? 'Fetching...' : '🚀 Generate Board'}
          </button>
        </div>
      </div>

      <style>{`
        .create-dna-container {
          padding: 40px; display: flex; justify-content: center;
        }
        .create-card {
          background: white; padding: 40px; border-radius: 16px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.1); width: 100%; max-width: 600px;
        }
        h2 { margin-top: 0; color: #2c3e50; }
        .selection-list { margin: 30px 0; display: flex; flex-direction: column; gap: 10px; }
        .selection-row { display: flex; gap: 10px; align-items: center; }
        .row-num { font-weight: bold; color: #ccc; width: 20px; }
        select { 
          flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 1rem; 
        }
        .btn-remove { 
          background: #ffecec; color: #c0392b; border: none; width: 40px; height: 40px; 
          border-radius: 8px; cursor: pointer; font-size: 1.2rem;
        }
        .btn-add-row {
          width: 100%; padding: 12px; background: #f4f7f6; border: 2px dashed #bdc3c7;
          color: #7f8c8d; border-radius: 8px; font-weight: bold; cursor: pointer;
        }
        .btn-add-row:hover { background: #ecf0f1; border-color: #95a5a6; }
        
        .create-actions { margin-top: 30px; display: flex; justify-content: space-between; }
        .btn-cancel { background: transparent; border: none; color: #7f8c8d; cursor: pointer; font-size: 1rem; }
        .btn-generate { 
          background: #2c3e50; color: white; padding: 12px 30px; border-radius: 8px; 
          border: none; font-weight: bold; font-size: 1.1rem; cursor: pointer; 
        }
        .btn-generate:hover { background: #34495e; }
      `}</style>
    </div>
  );
}
