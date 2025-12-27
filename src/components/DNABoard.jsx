import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

// Math Display Component
const MathDisplay = ({ text, fontSize }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    let content = text || "";
    
    // If it contains SVG, render as HTML directly
    if (content.includes('<svg') || content.includes('<SVG')) {
      containerRef.current.innerHTML = content;
      return;
    }
    
    // Check if content actually needs KaTeX (fractions, exponents, roots, etc.)
    const needsKatex = /\\frac|\\sqrt|\^|_\{|\\times|\\div|\\pm|\\leq|\\geq|\\neq|\$/.test(content);
    
    if (needsKatex) {
      // Has LaTeX commands - use KaTeX
      if (content.includes('$')) {
        // Process $ delimiters
        content = content.replace(/\$([^$]+)\$/g, (match, latex) => {
          try {
            return window.katex.renderToString(latex, { throwOnError: false });
          } catch (e) { return match; }
        });
        containerRef.current.innerHTML = content;
      } else {
        // Render whole thing as KaTeX
        try {
          containerRef.current.innerHTML = window.katex.renderToString(content, { throwOnError: false });
        } catch (e) {
          containerRef.current.textContent = content;
        }
      }
    } else {
      // Simple text + numbers - just use HTML with nice font
      containerRef.current.innerHTML = `<span style="font-family: 'KaTeX_Main', 'Times New Roman', serif;">${content}</span>`;
    }
  }, [text]);

  return <div ref={containerRef} style={{ fontSize: `${fontSize}rem` }} className="math-content" />;
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
      // Custom DNA - cards already provided
      setCards(currentClass.cards.map((card, idx) => ({ ...card, slotKey: `slot-${idx}` })));
      setLoading(false);
    } else if (currentClass) {
      fetchAndInitCards(currentClass);
    }
  }, [currentClass]);

  async function fetchAndInitCards(classObj) {
    setLoading(true);
    const classId = classObj.name || "Default Class";
    
    // Try to get due cards for spaced repetition
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
      // Get questions from topics associated with this class
      const topics = [...(classObj.recent_topics || []), ...(classObj.past_topics || [])];
      
      let query = supabase.from('questions').select('*');
      if (topics.length > 0) {
        query = query.in('topic', topics);
      }
      
      const { data: dbData } = await query;
      if (dbData) {
        const shuffled = dbData.sort(() => 0.5 - Math.random());
        newQuestions = shuffled.slice(0, slotsRemaining);
      }
    }

    const finalBoard = [
      ...reviewQuestions.map(q => ({
        ...q, currentQ: q.question_text, currentA: q.answer_text,
        revealed: false, fontSize: 1.4, isReview: true
      })),
      ...newQuestions.map(q => {
        const generated = runGenerator(q.generator_code);
        return {
          ...q, 
          currentQ: generated.q, 
          currentA: generated.a,
          currentImage: generated.image, // Capture the image
          revealed: false, fontSize: 1.4, isReview: false
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
          currentImage: generated.image, // Update image on refresh
          revealed: false 
        } : c
      ));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
    }
  };

  const swapTopic = async (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const { data } = await supabase.from('questions').select('*');
    if (data?.length > 0) {
      const randomQ = data[Math.floor(Math.random() * data.length)];
      const generated = runGenerator(randomQ.generator_code);
      setCards(prev => prev.map((c, i) => i === index ? {
        ...randomQ, 
        slotKey: c.slotKey, 
        currentQ: generated.q, 
        currentA: generated.a,
        currentImage: generated.image, // Update image on swap
        revealed: false, fontSize: 1.4, isReview: false
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
    // Create a shareable board config
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

    // Save to shared_boards table (or generate a hash)
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
      // Fallback: encode in URL
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
      {/* Board Header */}
      <header className="board-header">
        <div className="header-left">
          <button className="btn-back" onClick={() => onNavigate('dashboard')}>← Back</button>
          <h1>{currentClass?.name || "Custom DNA"}</h1>
        </div>
        <div className="header-center">
          <span className="date">{dateStr}</span>
        </div>
        <div className="header-right">
          <button className="btn-share" onClick={generateShareLink}>
            <><Icon name="link" size={16} /> Share Board</>
          </button>
          <button className="btn-reset" onClick={() => setRatings({})}>Reset</button>
        </div>
      </header>

      {/* Questions Grid */}
      <div className="questions-grid">
        {cards.map((card, index) => (
          <div key={card.slotKey} className="question-card">
            <div className="card-header">
              <div className="card-number">{index + 1}</div>
              <div className="card-topic">{card.isReview ? "↺ " : ""}{card.topic}</div>
              <div className="card-actions">
                <div className="zoom-controls">
                  <button className="zoom-btn" onClick={(e) => changeFontSize(e, index, -0.2)}>−</button>
                  <button className="zoom-btn" onClick={(e) => changeFontSize(e, index, 0.2)}>+</button>
                </div>
                {!card.isReview && (
                  <>
                    <button className="card-btn" onClick={(e) => refreshCard(e, index)}>↻</button>
                    <button className="card-btn" onClick={(e) => swapTopic(e, index)}>⟳</button>
                  </>
                )}
              </div>
            </div>

            <div className={`card-content ${card.revealed ? 'revealed-mode' : ''}`}>
              
              {/* Display Generated Image if available */}
              {card.currentImage && (
                <div 
                  className="question-image" 
                  style={{ marginBottom: '16px', maxWidth: '100%', display: 'flex', justifyContent: 'center' }}
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
              <button className="reveal-btn" onClick={() => toggleReveal(index)}>
                {card.revealed ? 'Hide' : 'Reveal'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Save Modal */}
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

      {/* Share Modal */}
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
    padding: 24px;
    max-width: 1400px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  /* Header */
  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid #e2e8f0;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .btn-back {
    background: #f1f5f9;
    border: none;
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-back:hover {
    background: #e2e8f0;
    color: #334155;
  }

  .board-header h1 {
    font-size: 1.4rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .header-center .date {
    color: #64748b;
    font-size: 0.9rem;
  }

  .header-right {
    display: flex;
    gap: 12px;
  }

  .btn-share, .btn-reset {
    padding: 8px 16px;
    border-radius: 8px;
    font-weight: 600;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-share {
    background: #f0fdfa;
    border: 1px solid #99f6e4;
    color: #0d9488;
  }

  .btn-share:hover {
    background: #ccfbf1;
  }

  .btn-reset {
    background: #f1f5f9;
    border: 1px solid #e2e8f0;
    color: #64748b;
  }

  .btn-reset:hover {
    background: #e2e8f0;
  }

  /* Grid */
  .questions-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 16px;
  }

  @media (max-width: 1024px) {
    .questions-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (max-width: 640px) {
    .questions-grid {
      grid-template-columns: 1fr;
    }
  }

  /* Card */
  .question-card {
    background: white;
    border-radius: 16px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    border: 1px solid #f1f5f9;
    display: flex;
    flex-direction: column;
    min-height: 280px;
    overflow: hidden;
    transition: box-shadow 0.2s;
  }

  .question-card:hover {
    box-shadow: 0 8px 24px rgba(0,0,0,0.08);
  }

  .card-header {
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
    display: flex;
    align-items: center;
    gap: 10px;
    background: #fafafa;
  }

  .card-number {
    width: 28px;
    height: 28px;
    background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
    color: white;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.8rem;
    flex-shrink: 0;
  }

  .card-topic {
    flex: 1;
    font-weight: 600;
    color: #64748b;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .card-actions {
    display: flex;
    gap: 4px;
  }

  .zoom-controls {
    display: flex;
  }

  .zoom-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    font-size: 1rem;
    padding: 4px 8px;
    transition: color 0.2s;
  }

  .zoom-btn:hover {
    color: #334155;
  }

  .card-btn {
    background: #f1f5f9;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.75rem;
    padding: 4px 8px;
    color: #64748b;
    transition: all 0.2s;
  }

  .card-btn:hover {
    background: #e2e8f0;
    color: #334155;
  }

  /* Card Content */
  .card-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 20px;
    text-align: center;
    overflow: auto;
  }

  .question-text {
    font-size: 1.1rem;
    font-weight: 500;
    color: #1e293b;
    transition: opacity 0.3s ease;
    width: 100%;
  }

  .card-content.revealed-mode .question-text {
    opacity: 0.65;
  }

  .answer-section {
    width: 100%;
    margin-top: 16px;
    padding-top: 0;
    border-top: 1px dashed #e2e8f0;
    max-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.3s ease, opacity 0.3s ease, padding-top 0.3s ease;
  }

  .answer-section.visible {
    max-height: 200px;
    opacity: 1;
    padding-top: 16px;
  }

  .answer-text {
    font-size: 1.3rem;
    font-weight: 700;
    color: #16a34a;
    background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
    padding: 12px 20px;
    border-radius: 10px;
    display: inline-block;
    border: 1px solid #bbf7d0;
  }

  /* Card Footer */
  .card-footer {
    padding: 12px 16px;
    border-top: 1px solid #f1f5f9;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fafafa;
  }

  .perf-buttons {
    display: flex;
    gap: 6px;
  }

  .reveal-hint {
    color: #94a3b8;
    font-size: 0.75rem;
    font-style: italic;
  }

  .perf-btn {
    padding: 6px 10px;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    font-weight: 700;
    font-size: 0.65rem;
    cursor: pointer;
    color: #94a3b8;
    background: white;
    transition: all 0.15s ease;
  }

  .perf-btn.btn-100.active { background: #16a34a; color: white; border-color: #16a34a; }
  .perf-btn.btn-most.active { background: #86efac; color: #14532d; border-color: #86efac; }
  .perf-btn.btn-some.active { background: #fde047; color: #713f12; border-color: #fde047; }
  .perf-btn.btn-nope.active { background: #ef4444; color: white; border-color: #ef4444; }

  .reveal-btn {
    padding: 6px 14px;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    background: white;
    color: #0d9488;
    transition: all 0.15s ease;
  }

  .reveal-btn:hover {
    background: #f0fdfa;
    border-color: #99f6e4;
  }

  /* Modals */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2000;
  }

  .modal-box {
    background: white;
    padding: 32px;
    border-radius: 20px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    text-align: center;
    max-width: 420px;
    width: 90%;
  }

  .modal-box h3 {
    margin: 0 0 12px 0;
    font-size: 1.4rem;
    color: #1e293b;
  }

  .modal-box p {
    color: #64748b;
    margin-bottom: 24px;
  }

  .share-link-box {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
  }

  .share-link-box input {
    flex: 1;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 0.85rem;
    background: #f8fafc;
  }

  .share-link-box button {
    padding: 12px 20px;
    background: #0d9488;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
  }

  .modal-actions {
    display: flex;
    gap: 12px;
    justify-content: center;
  }

  .btn-cancel, .btn-confirm {
    padding: 12px 24px;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-cancel {
    background: #f1f5f9;
    color: #64748b;
  }

  .btn-cancel:hover {
    background: #e2e8f0;
  }

  .btn-confirm {
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
  }

  .btn-confirm:hover {
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
  }

  /* Responsive */
  @media (max-width: 768px) {
    .dna-board {
      padding: 16px;
    }

    .board-header {
      flex-wrap: wrap;
      gap: 12px;
    }

    .header-left, .header-center, .header-right {
      flex: 1 1 100%;
      justify-content: center;
    }

    .header-right {
      gap: 8px;
    }

    .board-header h1 {
      font-size: 1.2rem;
    }

    .question-card {
      min-height: 260px;
    }
  }
`;
