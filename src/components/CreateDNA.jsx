import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';
import 'katex/dist/katex.min.css'; // Import Katex CSS
import { InlineMath } from 'react-katex'; // Import Math Component

// Helper Component to parse text with $math$
const RenderTex = ({ text }) => {
  if (!text) return null;
  // Split by $ to find math segments
  const parts = text.split('$');
  return (
    <span>
      {parts.map((part, index) => {
        // Even index = regular text, Odd index = math
        if (index % 2 === 0) return <span key={index}>{part}</span>;
        return <span key={index} className="math-text"><InlineMath math={part} /></span>;
      })}
    </span>
  );
};

export default function CreateDNA({ onGenerate, onCancel }) {
  const [availableSkills, setAvailableSkills] = useState([]);
  const [selections, setSelections] = useState([{ id: 1, skill: '', difficulty: '••' }]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillQuestions, setSkillQuestions] = useState({}); 
  const [previews, setPreviews] = useState({}); 

  useEffect(() => {
    async function fetchSkills() {
      const { data } = await supabase.from('questions').select('*').order('skill_name');
      if (data) {
        const uniqueSkills = [...new Set(data.map(d => d.skill_name))].sort();
        setAvailableSkills(uniqueSkills);
        
        const bySkill = {};
        data.forEach(q => {
          if (!bySkill[q.skill_name]) bySkill[q.skill_name] = [];
          bySkill[q.skill_name].push(q);
        });
        setSkillQuestions(bySkill);
        
        if (uniqueSkills.length > 0) {
          const firstSkill = uniqueSkills[0];
          setSelections([{ id: 1, skill: firstSkill, difficulty: '••' }]);
          generatePreview(1, firstSkill, '••', bySkill);
        }
      }
      setLoading(false);
    }
    fetchSkills();
  }, []);

  // Helper to normalize difficulty values from database
  const normalizeDifficulty = (diff) => {
    if (!diff) return '••';
    if (diff === '•' || diff === '1' || diff.toLowerCase() === 'easy') return '•';
    if (diff === '••' || diff === '2' || diff.toLowerCase() === 'medium') return '••';
    if (diff === '•••' || diff === '3' || diff.toLowerCase() === 'hard') return '•••';
    return '••';
  };

  const generatePreview = (rowId, skill, difficulty, questionsCache = skillQuestions) => {
    const allQuestions = questionsCache[skill] || [];
    
    // Filter by difficulty
    const matchingQuestions = allQuestions.filter(q => 
      normalizeDifficulty(q.difficulty) === difficulty
    );
    
    // Fall back to all questions if none match the difficulty
    const questions = matchingQuestions.length > 0 ? matchingQuestions : allQuestions;
    
    if (questions.length > 0) {
      const randomQ = questions[Math.floor(Math.random() * questions.length)];
      const generated = runGenerator(randomQ.generator_code);
      setPreviews(prev => ({ 
        ...prev, 
        [rowId]: { 
          q: generated.q, 
          a: generated.a, 
          image: generated.image, 
          questionData: randomQ,
          hasMatchingDifficulty: matchingQuestions.length > 0
        } 
      }));
    } else {
      setPreviews(prev => ({ 
        ...prev, 
        [rowId]: { 
          q: 'No questions available', 
          a: '-', 
          image: null,
          questionData: null,
          hasMatchingDifficulty: false
        } 
      }));
    }
  };

  const refreshPreview = (rowId, skill, difficulty) => {
    generatePreview(rowId, skill, difficulty);
  };

  const filteredSkills = availableSkills.filter(s => 
    s.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addRow = () => {
    if (selections.length < 6) {
      const newId = Date.now();
      const newSkill = availableSkills[0];
      const newDifficulty = '••';
      setSelections([...selections, { id: newId, skill: newSkill, difficulty: newDifficulty }]);
      generatePreview(newId, newSkill, newDifficulty);
    }
  };

  const duplicateRow = (row) => {
    if (selections.length < 6) {
      const newId = Date.now();
      setSelections([...selections, { id: newId, skill: row.skill, difficulty: row.difficulty }]);
      generatePreview(newId, row.skill, row.difficulty);
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
    
    // Get the current row to access both skill and difficulty
    const currentRow = selections.find(s => s.id === id);
    
    if (field === 'skill') {
      generatePreview(id, value, currentRow?.difficulty || '••');
    } else if (field === 'difficulty') {
      generatePreview(id, currentRow?.skill, value);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    let generatedCards = [];
    
    for (const selection of selections) {
      const preview = previews[selection.id];
      
      if (preview?.questionData) {
        const generated = runGenerator(preview.questionData.generator_code);
        generatedCards.push({
          ...preview.questionData,
          currentQ: generated.q,
          currentA: generated.a,
          currentImage: generated.image, 
          revealed: false,
          fontSize: 1.4,
          isReview: false
        });
      } else {
        // Fallback logic
        const allQuestions = skillQuestions[selection.skill] || [];
        const matchingQuestions = allQuestions.filter(q => 
          normalizeDifficulty(q.difficulty) === selection.difficulty
        );
        const questions = matchingQuestions.length > 0 ? matchingQuestions : allQuestions;
        
        if (questions.length > 0) {
          const randomQ = questions[Math.floor(Math.random() * questions.length)];
          const generated = runGenerator(randomQ.generator_code);
          generatedCards.push({
            ...randomQ,
            currentQ: generated.q,
            currentA: generated.a,
            currentImage: generated.image, 
            revealed: false,
            fontSize: 1.4,
            isReview: false
          });
        } else {
          generatedCards.push({
            id: `fallback-${Math.random()}`,
            skill_name: selection.skill,
            difficulty: selection.difficulty,
            currentQ: `No question found for ${selection.skill}`,
            currentA: "-",
            revealed: false,
            fontSize: 1.4
          });
        }
      }
    }
    
    setLoading(false);
    onGenerate(generatedCards);
  };

  function runGenerator(code) {
    try {
      if (!code) return { q: "No question available", a: "-" };
      const result = new Function(code)();
      if (!result || typeof result !== 'object') return { q: "Error generating question", a: "-" };
      return { 
        q: result.q ?? "Missing question", 
        a: result.a ?? "-",
        image: result.image 
      };
    } catch (e) { 
      return { q: "Error in question", a: "-" }; 
    }
  }

  if (loading && availableSkills.length === 0) {
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
            <h1><Icon name="dna" size={28} style={{marginRight:'10px', verticalAlign:'middle', color:'var(--primary)'}} /> Create Custom DNA</h1>
            <p>Select up to 6 skills for your starter board</p>
          </div>
          <button className="btn-back" onClick={onCancel}>← Back</button>
        </header>

        {/* 1. Search Box */}
        <div className="topic-search">
          <span className="search-icon"><Icon name="search" size={16} /></span>
          <input
            type="text"
            placeholder="Search to add skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* 2. Search Results / Quick Add */}
        <div className="quick-topics">
          <span className="label">
            {searchTerm ? `Found ${filteredSkills.length} skills:` : 'Quick add:'}
          </span>
          <div className="topic-chips">
            {(searchTerm ? filteredSkills : availableSkills.slice(0, 8)).map(skill => (
              <button
                key={skill}
                className={`topic-chip ${selections.some(s => s.skill === skill) ? 'selected' : ''}`}
                onClick={() => {
                  if (selections.length < 6) {
                    const newId = Date.now();
                    const newDifficulty = '••';
                    setSelections([...selections, { id: newId, skill, difficulty: newDifficulty }]);
                    generatePreview(newId, skill, newDifficulty);
                  }
                }}
                disabled={selections.length >= 6}
              >
                {skill}
              </button>
            ))}
            {searchTerm && filteredSkills.length === 0 && (
              <span style={{color: '#94a3b8', fontSize: '0.9rem', fontStyle: 'italic'}}>No matching skills found.</span>
            )}
          </div>
        </div>

        {/* 3. Current Questions List */}
        <div className="selection-container">
          <div className="selection-list">
            {selections.map((row, index) => {
              const preview = previews[row.id];
              const noMatchWarning = preview && !preview.hasMatchingDifficulty && preview.questionData;
              
              return (
                <div key={row.id} className="selection-row">
                  <div className="row-controls">
                    <span className="row-num">{index + 1}</span>
                    <select 
                      value={row.skill} 
                      onChange={(e) => updateRow(row.id, 'skill', e.target.value)}
                      className="topic-select"
                    >
                      {availableSkills.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    
                    {/* DIFFICULTY SECTION */}
                    <div className="diff-container">
                      <span className="diff-label">DIFFICULTY</span>
                      <div className="diff-buttons">
                        <button
                          type="button"
                          className={`diff-btn ${row.difficulty === '•' ? 'active' : ''}`}
                          onClick={() => updateRow(row.id, 'difficulty', '•')}
                          title="Level 1"
                        >
                          <Icon name="level1" size={20} />
                        </button>
                        <button
                          type="button"
                          className={`diff-btn ${row.difficulty === '••' ? 'active' : ''}`}
                          onClick={() => updateRow(row.id, 'difficulty', '••')}
                          title="Level 2"
                        >
                          <Icon name="level2" size={20} />
                        </button>
                        <button
                          type="button"
                          className={`diff-btn ${row.difficulty === '•••' ? 'active' : ''}`}
                          onClick={() => updateRow(row.id, 'difficulty', '•••')}
                          title="Level 3"
                        >
                          <Icon name="level3" size={20} />
                        </button>
                      </div>
                    </div>

                    <button 
                      className="btn-duplicate" 
                      onClick={() => duplicateRow(row)}
                      disabled={selections.length >= 6}
                      title="Duplicate this skill"
                    >
                      <Icon name="copy" size={16} />
                    </button>
                    {selections.length > 1 && (
                      <button className="btn-remove" onClick={() => removeRow(row.id)}>×</button>
                    )}
                  </div>
                  
                  <div className={`preview-panel ${noMatchWarning ? 'no-match' : ''}`}>
                    <div className="preview-content">
                      {/* FIXED: Image Container */}
                      {preview?.image && (
                        <div 
                          className="preview-image-wrapper"
                          dangerouslySetInnerHTML={{ __html: preview.image }} 
                        />
                      )}
                      
                      {(preview?.q?.trim().startsWith('<') || preview?.a?.trim().startsWith('<')) ? (
                        <div className="preview-unavailable">Preview not available</div>
                      ) : (
                        <>
                          {/* FIXED: Use RenderTex for Math */}
                          <div className="preview-question"><strong>Q:</strong> <RenderTex text={preview?.q || 'Loading...'} /></div>
                          <div className="preview-answer"><strong>A:</strong> <RenderTex text={preview?.a || '...'} /></div>
                        </>
                      )}
                      {noMatchWarning && (
                        <div className="no-match-warning">⚠ No questions at this difficulty - showing any</div>
                      )}
                    </div>
                    <button 
                      className="btn-refresh" 
                      onClick={() => refreshPreview(row.id, row.skill, row.difficulty)}
                      title="Show different example"
                    >
                      <Icon name="refresh" size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="add-row-container">
            <button 
              className="btn-add-row" 
              onClick={addRow}
              disabled={selections.length >= 6}
            >
              {selections.length >= 6 ? '6/6 skills selected' : '+ Add Another Skill'}
            </button>
          </div>
        </div>

        <div className="actions">
          <div className="main-actions">
            <button className="btn-cancel" onClick={onCancel}>Cancel</button>
            <button className="btn-generate" onClick={handleGenerate} disabled={loading}>
              {loading ? 'Generating...' : <><Icon name="rocket" size={18} style={{marginRight: '8px'}} /> Generate Board</>}
            </button>
          </div>
        </div>

        <div className="preview-info">
          <span className="count">{selections.length}/6 questions</span>
          <span className="skills">
            Skills: {selections.map(s => s.skill).filter(Boolean).join(', ') || 'None selected'}
          </span>
        </div>
      </div>

      <style>{createDNAStyles}</style>
    </div>
  );
}

const createDNAStyles = `
  .create-dna-page { padding: 32px; max-width: 900px; margin: 0 auto; font-family: 'Inter', sans-serif; }
  .create-card { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
  .card-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .card-header h1 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin: 0 0 8px 0; display: flex; align-items: center; }
  .card-header p { color: #64748b; margin: 0; }
  .btn-back { background: #f1f5f9; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; color: #64748b; cursor: pointer; }
  .btn-back:hover { background: #e2e8f0; }
  .topic-search { position: relative; margin-bottom: 16px; }
  .topic-search .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; }
  .topic-search input { width: 100%; padding: 14px 14px 14px 48px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; }
  .topic-search input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1); }
  
  .quick-topics { margin-bottom: 32px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9; }
  .quick-topics .label { font-size: 0.85rem; color: #64748b; font-weight: 600; display: block; margin-bottom: 10px; }
  .topic-chips { display: flex; flex-wrap: wrap; gap: 8px; max-height: 120px; overflow-y: auto; }
  .topic-chip { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 20px; background: white; font-size: 0.85rem; cursor: pointer; transition: all 0.2s; }
  .topic-chip:hover:not(:disabled) { border-color: #99f6e4; background: #f0fdfa; color: #0d9488; }
  .topic-chip.selected { background: #ccfbf1; border-color: #14b8a6; color: #0d9488; }
  .topic-chip:disabled { opacity: 0.5; cursor: not-allowed; }

  .selection-container { margin-bottom: 24px; }
  .selection-list { display: flex; flex-direction: column; gap: 12px; min-height: 420px; margin-bottom: 12px; }
  .selection-row { display: flex; gap: 12px; align-items: stretch; background: #fff; border-radius: 12px; padding: 12px; border: 1px solid #e2e8f0; }
  .row-controls { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
  .row-num { width: 28px; height: 28px; background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 0.85rem; flex-shrink: 0; }
  .topic-select { width: 260px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.9rem; background: white; }
  
  /* Difficulty Label Styling */
  .diff-container { display: flex; flex-direction: column; align-items: center; margin: 0 2px; }
  .diff-label { font-size: 0.55rem; font-weight: 800; color: #cbd5e1; letter-spacing: 1px; margin-bottom: 3px; text-transform: uppercase; line-height: 1; }
  .diff-buttons { display: flex; gap: 4px; }
  
  .diff-btn { width: 32px; height: 32px; border: 2px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; padding: 0; color: #94a3b8; }
  .diff-btn:hover { border-color: #99f6e4; background: #f0fdfa; color: #0d9488; }
  .diff-btn.active { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border-color: transparent; }
  
  .btn-duplicate { width: 32px; height: 32px; background: #f0fdfa; color: #0d9488; border: 1px solid #99f6e4; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; padding: 0; }
  .btn-duplicate:hover:not(:disabled) { background: #ccfbf1; }
  .btn-duplicate:disabled { opacity: 0.4; cursor: not-allowed; }
  .btn-remove { width: 32px; height: 32px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; font-size: 1.1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .btn-remove:hover { background: #fee2e2; }
  
  .preview-panel { flex: 1; display: flex; gap: 8px; align-items: center; background: #f8fafc; border-radius: 8px; padding: 10px 14px; border: 1px solid #f1f5f9; min-width: 0; }
  .preview-panel.no-match { background: #fffbeb; border-color: #fde68a; }
  .preview-content { flex: 1; min-width: 0; }
  
  /* UPDATED IMAGE STYLES - Fixes the clipping */
  .preview-image-wrapper { 
    height: 80px; 
    display: flex; 
    align-items: center; 
    justify-content: flex-start;
    margin-bottom: 8px; 
    overflow: hidden; 
  }
  .preview-image-wrapper svg, .preview-image-wrapper img { 
    max-height: 100%; 
    width: auto; 
    max-width: 100%; 
  }
  
  .preview-question { font-size: 0.85rem; color: #334155; margin-bottom: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .preview-answer { font-size: 0.8rem; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .preview-unavailable { font-size: 0.85rem; color: #94a3b8; font-style: italic; }
  .no-match-warning { font-size: 0.7rem; color: #d97706; margin-top: 4px; }
  
  /* MATH STYLES */
  .math-text { font-family: 'KaTeX_Main', serif; color: #0d9488; }
  
  .btn-refresh { width: 28px; height: 28px; background: white; border: 1px solid #e2e8f0; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; flex-shrink: 0; color: #64748b; }
  .btn-refresh:hover { background: #f0fdfa; border-color: #99f6e4; color: #0d9488; }
  .add-row-container { height: 52px; }
  .btn-add-row { width: 100%; padding: 14px; background: #f8fafc; border: 2px dashed #d1d5db; border-radius: 12px; color: #64748b; font-weight: 600; cursor: pointer; transition: all 0.2s; }
  .btn-add-row:hover:not(:disabled) { background: #f0fdfa; border-color: #99f6e4; color: #0d9488; }
  .btn-add-row:disabled { background: #f1f5f9; border-color: #e2e8f0; color: #94a3b8; cursor: default; }
  .actions { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
  .main-actions { display: flex; gap: 12px; justify-content: flex-end; }
  .btn-cancel { padding: 14px 24px; background: transparent; border: none; color: #64748b; font-weight: 600; cursor: pointer; }
  .btn-generate { padding: 14px 28px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border: none; border-radius: 12px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); transition: all 0.2s; display: flex; align-items: center; }
  .btn-generate:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35); }
  .btn-generate:disabled { opacity: 0.6; cursor: not-allowed; }
  .preview-info { display: flex; justify-content: space-between; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 0.85rem; color: #64748b; }
  .preview-info .count { font-weight: 600; color: #0d9488; }
  .preview-info .skills { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 400px; }
  @media (max-width: 768px) { .create-dna-page { padding: 16px; } .create-card { padding: 20px; } .selection-row { flex-direction: column; gap: 10px; } .row-controls { flex-wrap: wrap; } .topic-select { flex: 1; width: auto; } .preview-panel { width: 100%; } .selection-list { min-height: auto; } }
`;
