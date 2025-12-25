import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import CreateDNA from './CreateDNA'
import ClassSelector from './ClassSelector'
import CreateClass from './CreateClass'
import './App.css'

// --- Helper: Math Display ---
const MathDisplay = ({ text, fontSize }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && window.katex) {
      let html = text || "";
      html = html.replace(/\$([^$]+)\$/g, (match, latex) => {
        try {
          return window.katex.renderToString(latex, { throwOnError: false });
        } catch (e) { return match; }
      });
      containerRef.current.innerHTML = html;
    }
  }, [text]);

  return <div ref={containerRef} style={{ fontSize: `${fontSize}rem` }} className="math-content" />;
};

function App() {
  const [view, setView] = useState('home'); 
  const [currentClass, setCurrentClass] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [ratings, setRatings] = useState({});
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setDateStr(new Date().toLocaleDateString('en-GB', options));
  }, []);

  const goHome = () => { setView('home'); setCards([]); setRatings({}); setCurrentClass(null); };
  const startClassSelection = () => setView('selector');
  const handleClassSelected = (cls) => { setCurrentClass(cls); setView('dashboard'); fetchAndInitCards(cls); };
  const handleCreateNewClass = () => setView('create-class');
  const handleClassCreated = () => setView('selector');

  async function fetchAndInitCards(classObj) {
    setLoading(true);
    const classId = classObj ? classObj.name : "Default Class"; 
    const { data: dueCards } = await supabase.rpc('get_due_cards', { p_class_id: classId });
    const reviewQuestions = dueCards || [];
    const slotsRemaining = 6 - reviewQuestions.length;
    let newQuestions = [];

    if (slotsRemaining > 0) {
      const { data: dbData } = await supabase.from('questions').select('*');
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
          ...q, currentQ: generated.q, currentA: generated.a,
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

  const handleCustomGeneration = (newCards) => {
    setCards(newCards.map((card, idx) => ({ ...card, slotKey: `slot-${idx}` })));
    setRatings({}); 
    setView('dashboard'); 
  };

  function runGenerator(code) {
    try { return new Function(code)() } catch (e) { return { q: "Error", a: "..." } }
  }

  const changeFontSize = (e, index, delta) => {
    e.stopPropagation(); 
    setCards(prev => prev.map((card, i) => i === index ? { ...card, fontSize: Math.max(0.5, Math.min(5.0, card.fontSize + delta)) } : card));
  };

  const refreshCard = (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const card = cards[index]; 
    if (card && card.generator_code) {
      const generated = runGenerator(card.generator_code);
      setCards(prev => prev.map((c, i) => i === index ? { ...c, currentQ: generated.q, currentA: generated.a, revealed: false } : c));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
    }
  };

  const swapTopic = async (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const { data } = await supabase.from('questions').select('*');
    if (data && data.length > 0) {
      const randomQ = data[Math.floor(Math.random() * data.length)];
      const generated = runGenerator(randomQ.generator_code);
      setCards(prev => prev.map((c, i) => i === index ? { 
        ...randomQ, slotKey: c.slotKey, currentQ: generated.q, currentA: generated.a, revealed: false, fontSize: 1.4, isReview: false 
      } : c));
      setRatings(prev => { const n = { ...prev }; delete n[index]; return n; });
    }
  };

  const toggleReveal = (index) => {
    setCards(prev => prev.map((card, i) => i === index ? { ...card, revealed: !card.revealed } : card));
  };

  const handleRating = (index, score) => {
    setRatings(prev => {
        const nr = { ...prev, [index]: score };
        if (Object.keys(nr).length === cards.length) setTimeout(() => setShowSaveModal(true), 500);
        return nr;
    });
  };

  const saveSession = async () => {
    const sessionData = {
      date: new Date().toISOString(),
      class_id: currentClass ? currentClass.name : "Custom Session",
      results: cards.map((card, index) => ({
        question_id: card.id, topic: card.topic, question_text: card.currentQ, 
        answer_text: card.currentA, score: ratings[index] || 0, 
        review_interval: ratings[index] >= 75 ? 12 : 1
      }))
    };
    await supabase.from('dna_sessions').insert([sessionData]);
    setShowSaveModal(false);
    goHome(); 
  };

  if (view === 'selector') return <ClassSelector onSelectClass={handleClassSelected} onCreateNew={handleCreateNewClass} />;
  if (view === 'create-class') return <CreateClass onSave={handleClassCreated} onCancel={() => setView('selector')} />;
  if (view === 'create-dna') return <CreateDNA onGenerate={handleCustomGeneration} onCancel={goHome} />;
  
  if (view === 'home') {
    return (
      <div className="home-container">
        <div className="home-header">
          <div className="logo-large">E</div>
          <h1>Engram</h1>
          <p>{dateStr}</p>
        </div>
        <div className="home-actions">
          <button className="big-btn" onClick={startClassSelection}>
            <span className="icon">🧠</span>
            <div className="text">
              <h3>My Class DNAs</h3>
              <p>Continue spaced repetition</p>
            </div>
          </button>
          <button className="big-btn" onClick={() => setView('create-dna')}>
            <span className="icon">🧬</span>
            <div className="text">
              <h3>Create Custom DNA</h3>
              <p>Build a starter manually</p>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <div className="loading-text">Loading Board...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">
      <header>
        <div className="logo" onClick={goHome}>
          <div className="logo-mark">E</div>
          <span className="logo-text">Engram</span>
        </div>
        <input type="text" className="title-input-header" defaultValue={currentClass ? currentClass.name + " Starter" : "Session Title"} />
        <div className="header-controls">
          <span className="date-display-header">{dateStr}</span>
          <button className="btn btn-secondary" onClick={() => setRatings({})}>Reset</button>
          <button className="btn btn-primary" onClick={goHome}>Exit</button>
        </div>
      </header>
      <main>
        <div className="questions-grid">
          {cards.map((card, index) => (
            <div key={card.slotKey} className="question-card">
              <div className="card-header">
                <div className="card-number">{index + 1}</div>
                <div className="card-topic">{card.isReview ? "↺ " : ""}{card.topic}</div>
                <div className="card-actions">
                  <div className="zoom-controls">
                    <button className="zoom-btn" onClick={(e) => changeFontSize(e, index, -0.2)}>-</button>
                    <button className="zoom-btn" onClick={(e) => changeFontSize(e, index, 0.2)}>+</button>
                  </div>
                  {!card.isReview && (
                    <>
                      <button className="card-btn" onClick={(e) => refreshCard(e, index)}>REFRESH</button>
                      <button className="card-btn" onClick={(e) => swapTopic(e, index)}>CHANGE TOPIC</button>
                    </>
                  )}
                </div>
              </div>
              
              {/* FIXED: Answer now appears BELOW question, not as overlay */}
              <div className={`card-content ${card.revealed ? 'revealed-mode' : ''}`}>
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
                  ) : <div style={{color:'#ccc', fontSize:'0.7rem'}}>REVEAL TO GRADE</div>}
                </div>
                <button className="reveal-btn" onClick={() => toggleReveal(index)}>
                  {card.revealed ? 'Hide' : 'Reveal'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showSaveModal && (
        <div className="modal-backdrop">
          <div className="modal-box">
            <h3>📝 Session Complete</h3>
            <p>Save progress for <strong>{currentClass ? currentClass.name : "Custom Session"}</strong>?</p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>No</button>
              <button className="btn-confirm" onClick={saveSession}>Yes, Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
