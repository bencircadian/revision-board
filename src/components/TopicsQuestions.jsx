import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';
import { getDifficultyInfo, DIFFICULTY_OPTIONS } from '../utils/difficulty';

const runGenerator = (code) => {
  try { 
    if (!code) return { q: "No code provided", a: "..." };
    return new Function(code)() 
  } catch (e) { 
    return { q: "Preview Error", a: "Check code syntax" } 
  }
};

const QuestionDisplay = ({ content }) => {
  const containerRef = useRef(null);
  useEffect(() => {
    if (containerRef.current) containerRef.current.innerHTML = content;
  }, [content]);
  return <span ref={containerRef} className="question-content-display" />;
};

// --- COMPONENT ---

export default function TopicsQuestions({ onNavigate }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Grouping State (Open/Closed)
  const [expandedDomains, setExpandedDomains] = useState({});
  const [expandedTopics, setExpandedTopics] = useState({});
  const [expandedSkills, setExpandedSkills] = useState({});

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ 
    domain: '', topic: '', skill_name: '', difficulty: '••', generator_code: '' 
  });

  // Card State
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [showSourceCode, setShowSourceCode] = useState(false);

  // --- DATA FETCHING ---

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    setLoading(true);
    const { data } = await supabase.from('questions').select('*');
    if (data) {
      setQuestions(data);
    }
    setLoading(false);
  }

  // --- GROUPING LOGIC ---

  const groupedData = useMemo(() => {
    const groups = {};
    
    questions.forEach(q => {
      const d = q.domain || 'Uncategorized';
      const t = q.topic || 'General';
      const s = q.skill_name || 'General Skills';

      if (!groups[d]) groups[d] = {};
      if (!groups[d][t]) groups[d][t] = {};
      if (!groups[d][t][s]) groups[d][t][s] = [];

      groups[d][t][s].push(q);
    });

    return groups;
  }, [questions]);

  // Unique lists for Autocomplete
  const uniqueDomains = useMemo(() => Object.keys(groupedData).sort(), [groupedData]);
  const uniqueTopics = useMemo(() => [...new Set(questions.map(q => q.topic).filter(Boolean))].sort(), [questions]);
  const uniqueSkills = useMemo(() => [...new Set(questions.map(q => q.skill_name).filter(Boolean))].sort(), [questions]);

  // --- SEARCH FILTERING ---

  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const lowerQ = searchQuery.toLowerCase();
    return questions.filter(q => 
      (q.topic && q.topic.toLowerCase().includes(lowerQ)) ||
      (q.skill_name && q.skill_name.toLowerCase().includes(lowerQ)) ||
      (q.domain && q.domain.toLowerCase().includes(lowerQ)) ||
      (q.generator_code && q.generator_code.toLowerCase().includes(lowerQ))
    );
  }, [questions, searchQuery]);

  // --- HANDLERS ---

  const toggleDomain = (d) => setExpandedDomains(prev => ({ ...prev, [d]: !prev[d] }));
  const toggleTopic = (tKey) => setExpandedTopics(prev => ({ ...prev, [tKey]: !prev[tKey] }));
  const toggleSkill = (sKey) => setExpandedSkills(prev => ({ ...prev, [sKey]: !prev[sKey] }));

  const handleSaveQuestion = async () => {
    if (!formData.topic || !formData.generator_code) {
      alert('Topic and Code are required.');
      return;
    }

    const payload = {
      domain: formData.domain || null,
      topic: formData.topic,
      skill_name: formData.skill_name || null,
      difficulty: formData.difficulty,
      generator_code: formData.generator_code
    };

    let error;
    if (editingId) {
      const { error: err } = await supabase.from('questions').update(payload).eq('id', editingId);
      error = err;
    } else {
      const { error: err } = await supabase.from('questions').insert([payload]);
      error = err;
    }

    if (error) {
      alert('Error: ' + error.message);
    } else {
      setShowAddModal(false);
      fetchQuestions();
    }
  };

  const openEditModal = (e, q) => {
    e.stopPropagation();
    setEditingId(q.id);
    setFormData({
      domain: q.domain || '',
      topic: q.topic || '',
      skill_name: q.skill_name || '',
      difficulty: q.difficulty || '••',
      generator_code: q.generator_code || ''
    });
    setShowAddModal(true);
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData({ domain: '', topic: '', skill_name: '', difficulty: '••', generator_code: '' });
    setShowAddModal(true);
  };

  // --- RENDERERS ---

  const renderQuestionCard = (q) => {
    const example = runGenerator(q.generator_code);
    const isExpanded = expandedQuestion === q.id;
    const diffInfo = getDifficultyInfo(q.difficulty);

    return (
      <div key={q.id} className={`question-item ${isExpanded ? 'expanded' : ''}`} onClick={() => { setExpandedQuestion(isExpanded ? null : q.id); setShowSourceCode(false); }}>
        <div className="question-header">
          <span className={`difficulty-badge ${diffInfo.className}`}>{diffInfo.label}</span>
          {/* UPDATED: Showing Skill Name instead of Topic */}
          <span className="topic-badge">{q.skill_name || q.topic}</span>
        </div>
        <div className="question-preview"><strong>Q:</strong> <QuestionDisplay content={example.q} /></div>
        <div className="answer-preview"><strong>A:</strong> <QuestionDisplay content={example.a} /></div>
        
        {isExpanded && (
          <div className="question-details">
            <div className="detail-actions">
              <button className="action-btn primary" onClick={(e) => openEditModal(e, q)}><Icon name="edit" size={14} /> Edit</button>
              <button className="action-btn" onClick={(e) => { e.stopPropagation(); setQuestions([...questions]); }}><Icon name="refresh" size={14} /> Test</button>
              <button className="action-btn" onClick={(e) => { e.stopPropagation(); setShowSourceCode(!showSourceCode); }}><Icon name="search" size={14} /> {showSourceCode ? 'Hide Code' : 'View Code'}</button>
            </div>
            {showSourceCode && <div className="code-block"><pre>{q.generator_code}</pre></div>}
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div><p>Loading...</p><style>{`.loading-container{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh;gap:16px}.spinner{width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#0d9488;border-radius:50%;animation:spin 0.8s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>;

  return (
    <div className="topics-page">
      <header className="page-header">
        <div className="header-content">
          <h1><Icon name="books" size={28} style={{marginRight:'10px', color:'var(--primary)'}} /> Question Bank</h1>
          <p>Organize by Domain &gt; Topic &gt; Skill</p>
        </div>
        <button className="btn-add" onClick={openCreateModal}><Icon name="plus" size={16} /> Add Question</button>
      </header>

      {/* Search Bar */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon"><Icon name="search" size={16} /></span>
          <input 
            type="text" 
            placeholder="Search questions by topic, skill or code..." 
            value={searchQuery} 
            onChange={(e) => setSearchQuery(e.target.value)} 
          />
        </div>
      </div>

      {/* --- VIEW 1: SEARCH RESULTS (Flat List) --- */}
      {searchQuery && (
        <div className="search-results">
          <h2>Search Results <span className="count">({searchResults.length})</span></h2>
          {searchResults.length === 0 ? <div className="empty-state">No matches found.</div> : (
            <div className="questions-grid">
              {searchResults.map(q => renderQuestionCard(q))}
            </div>
          )}
        </div>
      )}

      {/* --- VIEW 2: HIERARCHICAL BROWSER (Domain > Topic > Skill) --- */}
      {!searchQuery && (
        <div className="hierarchy-browser">
          {Object.keys(groupedData).sort().map(domain => {
            const isDomainOpen = expandedDomains[domain];
            const topicsInDomain = groupedData[domain];
            const domainCount = Object.values(topicsInDomain).reduce((acc, skills) => 
              acc + Object.values(skills).reduce((a, q) => a + q.length, 0), 0
            );

            return (
              <div key={domain} className="domain-section">
                <div className="domain-header" onClick={() => toggleDomain(domain)}>
                  <span className="toggle-icon">{isDomainOpen ? '▼' : '▶'}</span>
                  <h3>{domain}</h3>
                  <span className="count-badge">{domainCount}</span>
                </div>

                {isDomainOpen && (
                  <div className="domain-content">
                    {Object.keys(topicsInDomain).sort().map(topic => {
                      const topicKey = `${domain}-${topic}`;
                      const isTopicOpen = expandedTopics[topicKey];
                      const skillsInTopic = topicsInDomain[topic];
                      const topicCount = Object.values(skillsInTopic).reduce((a, q) => a + q.length, 0);

                      return (
                        <div key={topicKey} className="topic-section">
                          <div className="topic-header" onClick={() => toggleTopic(topicKey)}>
                            <span className="toggle-icon">{isTopicOpen ? '▼' : '▶'}</span>
                            <h4>{topic}</h4>
                            <span className="count-badge small">{topicCount}</span>
                          </div>

                          {isTopicOpen && (
                            <div className="topic-content">
                              {Object.keys(skillsInTopic).sort().map(skill => {
                                const questionsInSkill = skillsInTopic[skill];
                                
                                // Flatten if truly missing/general
                                if (skill === 'General Skills') {
                                  return (
                                    <div key={skill} className="questions-grid inside-skill" style={{paddingTop:'8px', paddingBottom:'16px'}}>
                                      {questionsInSkill.map(q => renderQuestionCard(q))}
                                    </div>
                                  );
                                }

                                const skillKey = `${topicKey}-${skill}`;
                                const isSkillOpen = expandedSkills[skillKey];

                                return (
                                  <div key={skillKey} className="skill-section">
                                    <div className="skill-header" onClick={() => toggleSkill(skillKey)}>
                                      <span className="toggle-icon">{isSkillOpen ? '▼' : '▶'}</span>
                                      <h5>{skill}</h5>
                                      <span className="count-badge tiny">{questionsInSkill.length}</span>
                                    </div>

                                    {isSkillOpen && (
                                      <div className="questions-grid inside-skill">
                                        {questionsInSkill.map(q => renderQuestionCard(q))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          {Object.keys(groupedData).length === 0 && (
            <div className="empty-state">No questions found. Add one to get started!</div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="modal-backdrop">
          <div className="modal-box large">
            <h3><Icon name={editingId ? "edit" : "plus"} size={20} /> {editingId ? "Edit Question" : "Add New Question"}</h3>
            
            <div className="form-row">
              <div className="form-group half">
                <label>Domain</label>
                <input list="domains" type="text" placeholder="e.g. Maths" value={formData.domain} onChange={e => setFormData({...formData, domain: e.target.value})} />
                <datalist id="domains">{uniqueDomains.map(d => <option key={d} value={d} />)}</datalist>
              </div>
              <div className="form-group half">
                <label>Topic</label>
                <input list="topics" type="text" placeholder="e.g. Algebra" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                <datalist id="topics">{uniqueTopics.map(t => <option key={t} value={t} />)}</datalist>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label>Skill</label>
                <input list="skills" type="text" placeholder="e.g. Factorising" value={formData.skill_name} onChange={e => setFormData({...formData, skill_name: e.target.value})} />
                <datalist id="skills">{uniqueSkills.map(s => <option key={s} value={s} />)}</datalist>
              </div>
              <div className="form-group half">
                <label>Difficulty</label>
                <select value={formData.difficulty} onChange={e => setFormData({...formData, difficulty: e.target.value})}>
  {DIFFICULTY_OPTIONS.map(opt => (
    <option key={opt.value} value={opt.value}>{opt.label}</option>
  ))}
</select>
              </div>
            </div>

            <div className="form-group">
              <label>Generator Code (JS)</label>
              <textarea 
                rows={6} 
                value={formData.generator_code} 
                onChange={e => setFormData({...formData, generator_code: e.target.value})}
                placeholder="return { q: 'Question?', a: 'Answer' };" 
              />
            </div>

            {formData.generator_code && (
              <div className="preview-box">
                <p><strong>Q:</strong> <QuestionDisplay content={runGenerator(formData.generator_code).q} /></p>
                <p><strong>A:</strong> <QuestionDisplay content={runGenerator(formData.generator_code).a} /></p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-confirm" onClick={handleSaveQuestion}>Save</button>
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
  .btn-add { padding: 12px 24px; background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); }
  .btn-add:hover { transform: translateY(-2px); }

  .filters-bar { margin-bottom: 32px; }
  .search-box { position: relative; width: 100%; }
  .search-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: #64748b; }
  .search-box input { width: 100%; padding: 14px 14px 14px 48px; border: 1px solid #e2e8f0; border-radius: 12px; font-size: 1rem; }
  .search-box input:focus { outline: none; border-color: #14b8a6; box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1); }

  /* HIERARCHY STYLES */
  .hierarchy-browser { display: flex; flex-direction: column; gap: 16px; }
  
  .domain-section { background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; }
  .domain-header { background: #f8fafc; padding: 16px 20px; cursor: pointer; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid transparent; transition: background 0.2s; }
  .domain-header:hover { background: #f1f5f9; }
  .domain-section:has(.domain-content) .domain-header { border-bottom-color: #e2e8f0; }
  .domain-header h3 { margin: 0; font-size: 1.1rem; color: #1e293b; font-weight: 700; flex: 1; }
  
  .domain-content { padding: 12px; background: white; display: flex; flex-direction: column; gap: 8px; }
  
  .topic-section { border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; margin-left: 12px; }
  .topic-header { padding: 12px 16px; cursor: pointer; display: flex; align-items: center; gap: 10px; background: #ffffff; transition: background 0.2s; }
  .topic-header:hover { background: #f8fafc; }
  .topic-header h4 { margin: 0; font-size: 1rem; color: #334155; font-weight: 600; flex: 1; }
  
  .topic-content { padding: 8px 0 8px 12px; border-top: 1px solid #f1f5f9; }
  
  .skill-section { margin-bottom: 4px; }
  .skill-header { padding: 8px 12px; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 6px; color: #475569; }
  .skill-header:hover { background: #f1f5f9; color: #0d9488; }
  .skill-header h5 { margin: 0; font-size: 0.9rem; font-weight: 500; flex: 1; }
  
  .toggle-icon { font-size: 0.7rem; color: #94a3b8; width: 16px; text-align: center; }
  .count-badge { background: #e2e8f0; color: #475569; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
  .count-badge.small { background: #f1f5f9; }
  .count-badge.tiny { background: transparent; border: 1px solid #e2e8f0; font-size: 0.7rem; }

  .questions-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .questions-grid.inside-skill { padding: 12px 0 12px 24px; }

  /* Question Card */
  .question-item { background: white; padding: 16px; border-radius: 10px; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
  .question-item:hover { border-color: #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
  .question-item.expanded { border-color: #0d9488; box-shadow: 0 0 0 2px rgba(13, 148, 136, 0.1); }
  .question-header { display: flex; gap: 8px; margin-bottom: 8px; }
  .topic-badge { background: #f0fdfa; color: #0d9488; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; }
  .difficulty-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700; background: #f1f5f9; color: #64748b; letter-spacing: 1px; }
  .question-preview, .answer-preview { font-size: 0.9rem; margin-bottom: 4px; color: #334155; }
  .answer-preview { color: #64748b; }
  .question-content-display { display: inline-block; vertical-align: text-top; }
  .question-content-display svg { max-height: 40px; }

  /* Details & Actions */
  .question-details { margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9; }
  .detail-actions { display: flex; gap: 8px; flex-wrap: wrap; }
  .action-btn { padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 6px; color: #64748b; }
  .action-btn:hover { background: #f8fafc; border-color: #cbd5e1; }
  .action-btn.primary { background: #0d9488; color: white; border-color: #0d9488; }
  .action-btn.primary:hover { background: #0f766e; }
  .code-block { background: #1e293b; color: #f1f5f9; padding: 12px; border-radius: 8px; font-size: 0.75rem; overflow-x: auto; margin-top: 12px; }

  /* Modal */
  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; }
  .modal-box { background: white; padding: 32px; border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.2); }
  .modal-box h3 { margin-top: 0; display: flex; align-items: center; gap: 8px; color: #1e293b; }
  .form-row { display: flex; gap: 16px; margin-bottom: 16px; }
  .form-group { margin-bottom: 16px; }
  .form-group.half { flex: 1; }
  .form-group label { display: block; font-size: 0.85rem; font-weight: 600; color: #475569; margin-bottom: 6px; }
  .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: inherit; font-size: 0.95rem; }
  .form-group textarea { font-family: monospace; font-size: 0.85rem; }
  .preview-box { background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 0.9rem; }
  .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }
  .btn-cancel { padding: 10px 20px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: #64748b; }
  .btn-confirm { padding: 10px 20px; background: #0d9488; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; color: white; }

  @media (max-width: 640px) { .form-row { flex-direction: column; gap: 0; } }
`;
