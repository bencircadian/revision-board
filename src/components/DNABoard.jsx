import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';
import Latex from 'react-latex-next';

const MathDisplay = ({ text, fontSize }) => {
  if (!text || text === '-') return <span>-</span>;

  // If it's an SVG image code (from your generator), render it as HTML
  if (text.includes('<svg')) {
    return (
       <div 
         className="question-image" 
         dangerouslySetInnerHTML={{ __html: text }} 
         style={{ display: 'flex', justifyContent: 'center' }}
       />
    );
  }

  // Otherwise, render as Math
  return (
    <div style={{ fontSize: `${fontSize}rem` }} className="math-content">
      <Latex strict>{text}</Latex>
    </div>
  );
};

export default function DNABoard({ currentClass, onNavigate }) {
  const [cards, setCards] = useState([]);
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
    const classId = classObj.name || "Default Class";
    
    let reviewQuestions = [];
    try {
      const { data: dueCards } = await supabase.rpc('get_due_cards', { p_class_id: classId });
      reviewQuestions = dueCards || [];
    } catch (e) {
      console.log('No spaced repetition function available');
    }

    const slotsRemaining = 6 - reviewQuestions.length;
    let newQuestions = [];

    if (slotsRemaining > 0) {
      const topics = [...(classObj.recent_topics || []), ...(classObj.past_topics || [])];
      let query = supabase.from('questions').select('*');
      if (topics.length > 0) query = query.in('topic', topics);
      
      const { data: dbData } = await query;
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
    
    const difficultyVariations = {
      1: ['•', '1', 'Level 1', 'Easy', 'easy'],
      2: ['••', '2', 'Level 2', 'Medium', 'medium'],
      3: ['•••', '3', 'Level 3', 'Hard', 'hard']
    };
    const targets = difficultyVariations[level] || [];

    let query = supabase.from('questions').select('*').in('difficulty', targets);
    if (currentCard.skill_name) query = query.eq('skill_name', currentCard.skill_name);
    else if (currentCard.topic) query = query.eq('topic', currentCard.topic);

    const { data } = await query;

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
      alert(`No questions found for Level ${level} in this topic.`);
    }
  };

  const swapTopic = async (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const { data } = await supabase.from('questions').select('*');
    if (data?.length > 0) {
      const randomQ = data[Math.floor(Math.random() * data.length)];
      const generated = runGenerator(randomQ.generator_code);
      setCards(prev => prev.map((c, i) => i === index ? {
        ...randomQ, slotKey: c.slotKey, currentQ: generated.q, currentA: generated.a,
        currentImage: generated.image,
        revealed: false, fontSize: 0.95, isReview: false
      } : c));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
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
    await supabase.from('dna_sessions').insert([sessionData]);
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

    const { data, error } = await supabase
      .from('shared_boards')
      .insert([{ config: boardConfig }])
      .select('id')
      .single();

    if (data) {
      const link = `${window.location.origin}/shared/${data.id}`;
      setShareLink(link);
      setShowShareModal(true);
    } else {
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

      <div className="questions-grid">
        {cards.map((card, index) => (
          <div key={card.slotKey} className="question-card">
            <div className="card-header">
              <div className="card-number">{index + 1}</div>
              <div className="card-topic">{card.isReview ? "↺ " : ""}{card.topic}</div>
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
              
              {/* Answer Overlay */}
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

  /* Grid Layout - 2 rows, equal height, no scroll */
  .questions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(2, minmax(0, 1fr));
    gap: 12px;
    flex: 1; /* Fill remaining height */
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
  }
  .card-number { width: 22px; height: 22px; background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%); color: white; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 0.75rem; flex-shrink: 0; }
  .card-topic { flex: 1; font-weight: 600; color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-actions { display: flex; gap: 4px; align-items: center; }
  
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
    position: relative; /* Anchor for absolute answer */
  }

  /* Image - Takes Priority with min-height safety */
  .question-image {
    flex: 1; 
    width: 100%;
    /* Add padding to prevent SVG clipping on edges */
    padding: 0 16px; 
    max-width: 95%; /* Ensure it pulls away from the edges */
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

  /* Text - Tight layout */
  .question-text {
    flex-shrink: 0;
    font-size: 1.1rem;
    font-weight: 500;
    color: #1e293b;
    transition: opacity 0.3s ease;
    width: 100%;
    padding-bottom: 8px; /* Extra space at bottom for visual balance */
    line-height: 1.3; 
  }
  /* When revealed, we do NOT hide text, we just overlay the answer */
  
/* Updated Answer Overlay */
  .answer-section { 
    position: absolute;
    bottom: 0;
    left: 0; 
    right: 0;
    
    /* CHANGE 1: 50% Transparency */
    background: rgba(255, 255, 255, 0.5); 
    
    /* OPTIONAL BUT RECOMMENDED: Blurs the text underneath so it looks cleaner */
    backdrop-filter: blur(2px); 
    -webkit-backdrop-filter: blur(2px); /* Safari support */

    border-top: 1px solid rgba(226, 232, 240, 0.6); /* Made border slightly transparent too */
    padding: 12px;
    
    transform: translateY(110%);
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
  }
  
  .answer-section.visible { 
    transform: translateY(0); /* Slide up to sit on top of bottom content */
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

  /* Compact Footer */
  .card-footer { 
    padding: 6px 10px; 
    border-top: 1px solid #f1f5f9; 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    background: #fafafa; 
    flex-shrink: 0; 
    min-height: 45px; /* Slight increase for tap targets */
    z-index: 20; /* Ensure footer stays above the answer overlay if z-index fights happen */
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

  /* Modals - Keep existing style */
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
