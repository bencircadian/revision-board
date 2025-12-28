import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';
import Latex from 'react-latex-next';
import { getDifficultyVariations } from '../utils/difficulty';
import ErrorMessage from './ErrorMessage';

const MathDisplay = ({ text, fontSize }) => {
  if (!text || text === '-') return <span>-</span>;

  if (text.includes('<svg')) {
    return (
       <div 
         className="question-image" 
         dangerouslySetInnerHTML={{ __html: text }} 
         style={{ display: 'flex', justifyContent: 'center' }}
       />
    );
  }

  return (
    <div style={{ fontSize: `${fontSize}rem` }} className="math-content">
      <Latex strict>{text}</Latex>
    </div>
  );
};

export default function DNABoard({ currentClass, onNavigate }) {
  const [cards, setCards] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ratings, setRatings] = useState({});
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setDateStr(new Date().toLocaleDateString('en-GB', options));
  }, []);

  useEffect(() => {
    if (currentClass?.cards) {
      setCards(currentClass.cards.map((card, idx) => ({ ...card, slotKey: `slot-${idx}` })));
      setLoading(false);
    } else if (currentClass) {
      fetchAndInitCards(currentClass);
    }
  }, [currentClass]);

  async function fetchAndInitCards(classObj) {
    setLoading(true);
    setError(null); // Clear any previous error
    
    const classId = classObj.name || "Default Class";
    
    let reviewQuestions = [];
    try {
      const { data: dueCards } = await supabase.rpc('get_due_cards', { p_class_id: classId });
      reviewQuestions = dueCards || [];
    } catch (e) {
      // This is okay - the function might not exist yet
      console.log('Spaced repetition not configured');
    }

    const slotsRemaining = 6 - reviewQuestions.length;
    let newQuestions = [];

    if (slotsRemaining > 0) {
      const topics = [...(classObj.recent_topics || []), ...(classObj.past_topics || [])];
      let query = supabase.from('questions').select('*');
      if (topics.length > 0) query = query.in('topic', topics);
      
      const { data: dbData, error: fetchError } = await query;
      
      if (fetchError) {
        setError('Could not load questions. Please check your connection and try again.');
        setLoading(false);
        return;
      }
      
      if (dbData) {
        const shuffled = dbData.sort(() => 0.5 - Math.random());
        newQuestions = shuffled.slice(0, slotsRemaining);
      }
    }

    const finalBoard = [
      ...reviewQuestions.map(q => ({
        ...q, currentQ: q.question_text, currentA: q.answer_text,
        revealed: false, fontSize: 0.95, isReview: true 
      })),
      ...newQuestions.map(q => {
        const generated = runGenerator(q.generator_code);
        return {
          ...q, 
          currentQ: generated.q, 
          currentA: generated.a,
          currentImage: generated.image,
          revealed: false, fontSize: 0.95, isReview: false 
        };
      })
    ];

    const cardsWithKeys = finalBoard.slice(0, 6).sort(() => 0.5 - Math.random()).map((card, idx) => ({
      ...card, slotKey: `slot-${idx}`
    }));
    
    // Check if we got any cards
    if (cardsWithKeys.length === 0) {
      setError('No questions found for this class. Try adding some topics first.');
    }
    
    setCards(cardsWithKeys);
    setLoading(false);
  }

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
      console.error('Generator error:', e);
      return { q: "Error in question", a: "-" }; 
    }
  }

  const changeFontSize = (e, index, delta) => {
    e.stopPropagation();
    setCards(prev => prev.map((card, i) => 
      i === index ? { ...card, fontSize: Math.max(0.5, Math.min(5.0, card.fontSize + delta)) } : card
    ));
  };

  const refreshCard = (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const card = cards[index];
    if (card?.generator_code) {
      const generated = runGenerator(card.generator_code);
      setCards(prev => prev.map((c, i) => 
        i === index ? { 
          ...c, 
          currentQ: generated.q, 
          currentA: generated.a, 
          currentImage: generated.image,
          revealed: false 
        } : c
      ));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
    }
  };

  const changeDifficulty = async (e, index, level) => {
    e.preventDefault(); e.stopPropagation();
    const currentCard = cards[index];
    
    const targets = getDifficultyVariations(level);

    let query = supabase.from('questions').select('*').in('difficulty', targets);
    if (currentCard.skill_name) query = query.eq('skill_name', currentCard.skill_name);
    else if (currentCard.topic) query = query.eq('topic', currentCard.topic);

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError('Could not change difficulty. Please try again.');
      setTimeout(() => setError(null), 4000);
      return;
    }

    if (data && data.length > 0) {
      const randomQ = data[Math.floor(Math.random() * data.length)];
      const generated = runGenerator(randomQ.generator_code);
      setCards(prev => prev.map((c, i) => i === index ? {
        ...randomQ,
        slotKey: c.slotKey,
        currentQ: generated.q, 
        currentA: generated.a,
        currentImage: generated.image,
        revealed: false, 
        fontSize: c.fontSize, 
        isReview: false
      } : c));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
    } else {
      setError(`No Level ${level} questions found for "${currentCard.skill_name || currentCard.topic}". Try a different difficulty.`);
      // Auto-clear after 4 seconds
      setTimeout(() => setError(null), 4000);
    }
  };

  const swapTopic = async (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const { data, error: fetchError } = await supabase.from('questions').select('*');
    
    if (fetchError) {
      setError('Could not swap topic. Please try again.');
      setTimeout(() => setError(null), 4000);
      return;
    }
    
    if (data?.length > 0) {
      const randomQ = data[Math.floor(Math.random() * data.length)];
      const generated = runGenerator(randomQ.generator_code);
      setCards(prev => prev.map((c, i) => i === index ? {
        ...randomQ, slotKey: c.slotKey, currentQ: generated.q, currentA: generated.a,
        currentImage: generated.image,
        revealed: false, fontSize: 0.95, isReview: false
      } : c));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
    } else {
      setError('No questions available to swap. Try adding more topics first.');
      setTimeout(() => setError(null), 4000);
    }
  };

  const toggleReveal = (index) => {
    setCards(prev => prev.map((card, i) => 
      i === index ? { ...card, revealed: !card.revealed } : card
    ));
  };

  const handleRating = (index, score) => {
    setRatings(prev => {
      const nr = { ...prev, [index]: score };
      if (Object.keys(nr).length === cards.length) {
        setTimeout(() => setShowSaveModal(true), 500);
      }
      return nr;
    });
  };

  const saveSession = async () => {
    const sessionData = {
      date: new Date().toISOString(),
      class_id: currentClass?.name || "Custom Session",
      results: cards.map((card, index) => ({
        question_id: card.id,
        topic: card.topic,
        question_text: card.currentQ,
        answer_text: card.currentA,
        score: ratings[index] || 0,
        review_interval: ratings[index] >= 75 ? 12 : 1
      }))
    };
    
    const { error: saveError } = await supabase.from('dna_sessions').insert([sessionData]);
    
    if (saveError) {
      setError('Could not save session. Your progress may be lost.');
      setShowSaveModal(false);
      return;
    }
    
    setShowSaveModal(false);
    onNavigate('dashboard');
  };

  const generateShareLink = async () => {
    const boardConfig = {
      created_at: new Date().toISOString(),
      class_name: currentClass?.name || "Shared DNA",
      questions: cards.map(c => ({
        topic: c.topic,
        question_text: c.currentQ,
        answer_text: c.currentA,
        generator_code: c.generator_code
      }))
    };

    const { data, error: shareError } = await supabase
      .from('shared_boards')
      .insert([{ config: boardConfig }])
      .select('id')
      .single();

    if (data) {
      const link = `${window.location.origin}/shared/${data.id}`;
      setShareLink(link);
      setShowShareModal(true);
    } else if (shareError) {
      // Fallback to encoded link if database save fails
      const encoded = btoa(JSON.stringify(boardConfig));
      const link = `${window.location.origin}?board=${encoded.slice(0, 50)}...`;
      setShareLink(link);
      setShowShareModal(true);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
  };

  if (loading) {
    return (
      <div className="board-loading">
        <div className="spinner"></div>
        <p>Loading DNA Board...</p>
        <style>{`
          .board-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="dna-board">
      <header className="board-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => onNavigate('dashboard')}>← Back</button>
          <h1>{currentClass?.name || "Custom DNA"}</h1>
        </div>
        <div className="header-center"><span className="date">{dateStr}</span></div>
        <div className="header-right">
          <button className="btn-share" onClick={generateShareLink}><Icon name="link" size={16} /> Share</button>
          <button className="btn-reset" onClick={() => setRatings({})}>Reset</button>
        </div>
      </header>

      {/* Error message display */}
      {error && (
        <ErrorMessage 
          message={error} 
          type="warning"
          onRetry={() => {
            setError(null);
            if (cards.length === 0) {
              fetchAndInitCards(currentClass);
            }
          }}
        />
      )}

      <div className="questions-grid">
        {cards.map((card, index) => (
          <div key={card.slotKey} className="question-card">
            <div className="card-header">
              <div className="card-number">{index + 1}</div>
              
              {/* UPDATED: Wrapper for hover effect */}
              <div className="card-topic">
                <span className="topic-text">
                  {card.isReview ? "↺ " : ""}{card.skill_name || card.topic}
                </span>
              </div>
              
              <div className="card-actions">
                {!card.isReview && (
                  <div className="diff-controls">
                    <button className="diff-dot" onClick={(e) => changeDifficulty(e, index, 1)} title="Level 1"><Icon name="level1" size={14} /></button>
                    <button className="diff-dot" onClick={(e) => changeDifficulty(e, index, 2)} title="Level 2"><Icon name="level2" size={14} /></button>
                    <button className="diff-dot" onClick={(e) => changeDifficulty(e, index, 3)} title="Level 3"><Icon name="level3" size={14} /></button>
                  </div>
                )}
                <div className="zoom-controls">
                  <button className="zoom-btn" onClick={(e) => changeFontSize(e, index, -0.2)}><Icon name="zoomOut" size={16} /></button>
                  <button className="zoom-btn" onClick={(e) => changeFontSize(e, index, 0.2)}><Icon name="zoomIn" size={16} /></button>
                </div>
                {!card.isReview && (
                  <>
                    <button className="card-btn" onClick={(e) => refreshCard(e, index)} title="Regenerate">↻</button>
                    <button className="card-btn" onClick={(e) => swapTopic(e, index)} title="Swap">⟳</button>
                  </>
                )}
              </div>
            </div>

            <div className={`card-content ${card.revealed ? 'revealed-mode' : ''}`}>
              {card.currentImage && (
                <div 
                  className="question-image" 
                  dangerouslySetInnerHTML={{ __html: card.currentImage }} 
                />
              )}

              <div className="question-text">
                <MathDisplay text={card.currentQ} fontSize={card.fontSize} />
              </div>
              
              <div className={`answer-section ${card.revealed ? 'visible' : ''}`}>
                <div className="answer-text">
                  <MathDisplay text={card.currentA} fontSize={1.3} />
                </div>
              </div>
            </div>

            <div className="card-footer">
              <div className="perf-buttons">
                {card.revealed ? (
                  <>
                    <button className={`perf-btn btn-100 ${ratings[index] === 100 ? 'active' : ''}`} onClick={() => handleRating(index, 100)}>100%</button>
                    <button className={`perf-btn btn-most ${ratings[index] === 75 ? 'active' : ''}`} onClick={() => handleRating(index, 75)}>MOST</button>
                    <button className={`perf-btn btn-some ${ratings[index] === 25 ? 'active' : ''}`} onClick={() => handleRating(index, 25)}>SOME</button>
                    <button className={`perf-btn btn-nope ${ratings[index] === 0 ? 'active' : ''}`} onClick={() => handleRating(index, 0)}>NOPE!</button>
                  </>
                ) : (
                  <div className="reveal-hint">Reveal to grade</div>
                )}
              </div>
              <button className="reveal-btn" onClick={() => toggleReveal(index)}>{card.revealed ? 'Hide' : 'Reveal'}</button>
            </div>
          </div>
        ))}
      </div>

      {showSaveModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3><Icon name="check" size={24} /> Session Complete!</h3>
            <p>Save progress for <strong>{currentClass?.name || "this session"}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>Skip</button>
              <button className="btn-confirm" onClick={saveSession}>Save Session</button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3><Icon name="link" size={24} /> Share This Board</h3>
            <p>Copy this link to share these exact questions:</p>
            <div className="share-link-box">
              <input type="text" value={shareLink} readOnly />
              <button onClick={copyShareLink}>Copy</button>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowShareModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      <style>{boardStyles}</style>
    </div>
  );
}

const boardStyles = `
  .dna-board {
    padding: 12px 20px;
    max-width: 100%;
    height: 100vh;
    display: flex;
    flex-direction: column;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    box-sizing: border-box;
    overflow: hidden;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
    flex-shrink: 0;
  }

  .header-left { display: flex; align-items: center; gap: 16px; }
  .btn-back { background: #f1f5f9; border: none; padding: 6px 12px; border-radius: 8px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.2s; }
  .btn-back:hover { background: #e2e8f0; color: #334155; }
  .board-header h1 { font-size: 1.2rem; font-weight: 700; color: #1e293b; margin: 0; }
  .header-center .date { color: #64748b; font-size: 0.9rem; }
  .header-right { display: flex; gap: 8px; }
  .btn-share, .btn-reset { padding: 6px 12px; border-radius: 8px; font-weight: 600; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 4px; }
  .btn-share { background: #f0fdfa; border: 1px solid #99f6e4; color: #0d9488; }
  .btn-share:hover { background: #ccfbf1; }
  .btn-reset { background: #f1f5f9; border: 1px solid #e2e8f0; color: #64748b; }
  .btn-reset:hover { background: #e2e8f0; }

  /* Grid Layout */
  .questions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 12px;
    flex: 1; 
    min-height: 0;
  }

  .question-card {
    background: white;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
    transition: box-shadow 0.2s;
  }
  .question-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }

  /* Compact Header */
  .card-header {
    padding: 6px 10px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    gap: 8px;
    background: #fafafa;
    min-height: 40px;
    flex-shrink: 0;
    position: relative; /* Context for tooltips if needed */
  }
  .card-number { width: 22px; height: 22px; background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem; flex-shrink: 0; }
  
  /* UPDATED TOPIC STYLES FOR HOVER REVEAL */
  .card-topic { 
    flex: 1; 
    min-width: 0; /* Allows flex item to shrink properly */
    position: relative; /* Anchor for the absolute hover child */
    font-weight: 600; 
    color: #64748b; 
    font-size: 0.7rem; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
    /* Removed overflow:hidden from parent so child can escape */
  }

  /* The actual text container */
  .topic-text {
    display: block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    cursor: default;
  }

  /* HOVER EFFECT: Expands over the buttons */
  .topic-text:hover {
    position: absolute;
    top: -4px; /* Slight adjustment to cover border if needed */
    left: 0;
    width: auto;
    max-width: calc(100% + 120px); /* Limit width but allow overlap */
    background: #fafafa;
    z-index: 50; /* Sits on top of buttons */
    overflow: visible;
    white-space: normal; /* Allow wrap if text is massive */
    padding: 4px 8px;
    border-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    border: 1px solid #e2e8f0;
    line-height: 1.2;
  }

  .card-actions { display: flex; gap: 4px; align-items: center; z-index: 1; }
  
  .diff-controls, .zoom-controls { display: flex; gap: 1px; background: #f1f5f9; padding: 1px 3px; border-radius: 4px; }
  .diff-dot, .zoom-btn { background: transparent; border: none; cursor: pointer; color: #94a3b8; padding: 2px; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
  .diff-dot:hover, .zoom-btn:hover { color: #0d9488; background: white; border-radius: 2px; }
  .card-btn { background: #f1f5f9; border: none; border-radius: 4px; cursor: pointer; font-size: 0.75rem; padding: 3px 6px; color: #64748b; transition: all 0.2s; }
  .card-btn:hover { background: #e2e8f0; color: #334155; }

  /* Flexible Content */
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4px 12px;
    text-align: center;
    overflow: hidden;
    min-height: 0;
    position: relative; 
  }

  .question-image {
    flex: 1; 
    width: 100%;
    padding: 0 16px; 
    max-width: 95%; 
    min-height: 100px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 4px auto;
  }
  .question-image svg {
    width: auto !important;
    height: 100% !important; 
    max-width: 100%;
    display: block;
    vector-effect: non-scaling-stroke;
  }

  .question-text {
    flex-shrink: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: #1e293b;
    transition: opacity 0.3s ease;
    width: 100%;
    padding-bottom: 8px;
    line-height: 1.3; 
  }
  
  /* Answer Overlay */
  .answer-section { 
    position: absolute;
    bottom: 0;
    left: 0; 
    right: 0;
    background: rgba(255, 255, 255, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    border-top: 1px solid rgba(226, 232, 240, 0.6);
    padding: 12px;
    transform: translateY(110%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  
  .answer-section.visible { 
    transform: translateY(0); 
  }

  .answer-text { 
    font-size: 1.1rem; 
    font-weight: 700; 
    color: #16a34a; 
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); 
    padding: 6px 14px; 
    border-radius: 8px; 
    display: inline-block; 
    border: 1px solid #bbf7d0; 
    box-shadow: 0 2px 4px rgba(0,0,0,0.05);
  }

  .card-footer { 
    padding: 6px 10px; 
    border-top: 1px solid #f1f5f9; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: #fafafa; 
    flex-shrink: 0; 
    min-height: 45px; 
    z-index: 20; 
  }
  
  .perf-buttons { display: flex; gap: 4px; }
  .reveal-hint { color: #94a3b8; font-size: 0.7rem; font-style: italic; }
  .perf-btn { padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0; font-weight: 700; font-size: 0.6rem; cursor: pointer; color: #94a3b8; background: white; transition: all 0.15s ease; }
  .perf-btn.btn-100.active { background: #16a34a; color: white; border-color: #16a34a; }
  .perf-btn.btn-most.active { background: #86efac; color: #14532d; border-color: #86efac; }
  .perf-btn.btn-some.active { background: #fde047; color: #713f12; border-color: #fde047; }
  .perf-btn.btn-nope.active { background: #ef4444; color: white; border-color: #ef4444; }
  .reveal-btn { padding: 4px 10px; border-radius: 6px; border: 1px solid #e2e8f0; font-weight: 600; font-size: 0.75rem; cursor: pointer; background: white; color: #0d9488; transition: all 0.15s ease; }
  .reveal-btn:hover { background: #f0fdfa; border-color: #99f6e4; }

  .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000; }
  .modal-box { background: white; padding: 32px; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); text-align: center; max-width: 420px; width: 90%; }
  .modal-box h3 { margin: 0 0 12px 0; font-size: 1.4rem; color: #1e293b; }
  .modal-box p { color: #64748b; margin-bottom: 24px; }
  .share-link-box { display: flex; gap: 8px; margin-bottom: 24px; }
  .share-link-box input { flex: 1; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 0.85rem; background: #f8fafc; }
  .share-link-box button { padding: 12px 20px; background: #0d9488; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; }
  .modal-actions { display: flex; gap: 12px; justify-content: center; }
  .btn-cancel, .btn-confirm { padding: 12px 24px; border-radius: 10px; font-weight: 600; cursor: pointer; border: none; transition: all 0.2s; }
  .btn-cancel { background: #f1f5f9; color: #64748b; }
  .btn-cancel:hover { background: #e2e8f0; }
  .btn-confirm { background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%); color: white; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25); }
  .btn-confirm:hover { box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35); }

  @media (max-width: 768px) {
    .dna-board { padding: 16px; height: auto; overflow: auto; }
    .questions-grid { display: flex; flex-direction: column; height: auto; }
    .question-card { min-height: 300px; }
    .board-header { flex-wrap: wrap; gap: 12px; }
    .header-left, .header-center, .header-right { flex: 1 1 100%; justify-content: center; }
    .header-right { gap: 8px; }
    .board-header h1 { font-size: 1.2rem; }
  }
`;
