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
  // --- STATE ---
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

  // --- NAVIGATION ---
  const goHome = () => { setView('home'); setCards([]); setRatings({}); setCurrentClass(null); };
  const startClassSelection = () => setView('selector');
  const handleClassSelected = (cls) => { setCurrentClass(cls); setView('dashboard'); fetchAndInitCards(cls); };
  const handleCreateNewClass = () => setView('create-class');
  const handleClassCreated = () => setView('selector');

  // --- DATA & GENERATORS ---
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
      if (newQuestions.length < slotsRemaining) {
        const placeholders = [
           { topic: 'Algebra', generator_code: `return { q: "Solve $2x=10$", a: "$x=5$" }` },
           { topic: 'Geometry', generator_code: `return { q: "Area of sq side 4", a: "$16$" }` },
           { topic: 'Number', generator_code: `return { q: "Calc $10-3$", a: "$7$" }` }
        ];
        const needed = slotsRemaining - newQuestions.length;
        for(let i=0; i<needed; i++) newQuestions.push(placeholders[i % placeholders.length]);
      }
    }

    const finalBoard = [
      ...reviewQuestions.map(q => ({
        ...q, id: `review-${Math.random()}`, currentQ: q.question_text, currentA: q.answer_text,
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

    // SAFETY LOCK: Force exact limit of 6 cards
    setCards(finalBoard.slice(0, 6).sort(() => 0.5 - Math.random()));
    setLoading(false);
  }

  const handleCustomGeneration = (newCards) => {
    setCards(newCards);
    setRatings({}); 
    setView('dashboard'); 
  };

  function runGenerator(code) {
    try { return new Function(code)() } catch (e) { return { q: "Error", a: "..." } }
  }

  // --- CARD ACTIONS ---
  const changeFontSize = (e, index, delta) => {
    e.stopPropagation(); 
    const newCards = [...cards];
    newCards[index].fontSize = Math.max(0.5, Math.min(5.0, newCards[index].fontSize + delta));
    setCards(newCards);
  };

  const refreshCard = (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const newCards = [...cards];
    const card = newCards[index];
    if (card.generator_code) {
      const generated = runGenerator(card.generator_code);
      card.currentQ = generated.q; card.currentA = generated.a; card.revealed = false;
      const newRatings = { ...ratings }; delete newRatings[index]; setRatings(newRatings);
      setCards(newCards);
    } else { alert("This is a fixed review card, it cannot be refreshed."); }
  };

  const swapTopic = async (e, index) => {
    e.preventDefault(); e.stopPropagation();
    const { data } = await supabase.from('questions').select('*');
    if (data && data.length > 0) {
      const randomQ = data[Math.floor(Math.random() * data.length)];
      const generated = runGenerator(randomQ.generator_code);
      
      const newCards = [...cards];
      // STRICT REPLACE: Does not add, only updates
      newCards[index] = { 
        ...randomQ, 
        id: `swap-${Math.random()}`, 
        currentQ: generated.q, currentA: generated.a, 
        revealed: false, fontSize: 1.4, isReview: false 
      };
      const newRatings = { ...ratings }; delete newRatings[index]; setRatings(newRatings);
      setCards(newCards);
    }
  };

  const toggleReveal = (index) => {
    const newCards = [...cards];
    newCards[index].revealed = !newCards[index].revealed;
    setCards(newCards);
  };

  const handleRating = (index, score) => {
    const newRatings = { ...ratings, [index]: score };
    setRatings(newRatings);
    if (Object.keys(newRatings).length === cards.length) setTimeout(() => setShowSaveModal(true), 500); 
  };

  const saveSession = async () => {
    const getLessonInterval = (score) => {
      switch (score) { case 0: return 1; case 25: return 3; case 75: return 6; case 100: return 12; default: return 1; }
    };
    const sessionData = {
      date: new Date().toISOString(),
      class_id: currentClass ? currentClass.name : "Custom Session",
      results: cards.map((card, index) => ({
        question_id: card.id, topic: card.topic, question_text: card.currentQ, 
        answer_text: card.currentA, score: ratings[index] || 0, 
        review_interval: getLessonInterval(ratings[index] || 0) 
      }))
    };
    const { error } = await supabase.from('dna_sessions').insert([sessionData]);
    if (error) alert("Error: " + error.message); else alert("Session Saved!");
    setShowSaveModal(false); goHome(); 
  };

  const renderPerformanceButtons = (index) => {
    if (!cards[index].revealed) return <div style={{color: '#ccc', fontSize: '0.9rem'}}>Reveal to grade</div>;
    const currentScore = ratings[index];
    return (
      <div className="perf-buttons">
        <button className={`perf-btn btn-100 ${currentScore === 100 ? 'active' : ''}`} onClick={() => handleRating(index, 100)} title="All Correct">100%</button>
        <button className={`perf-btn btn-most ${currentScore === 75 ? 'active' : ''}`} onClick={() => handleRating(index, 75)} title="Most Correct">MOST</button>
        <button className={`perf-btn btn-some ${currentScore === 25 ? 'active' : ''}`} onClick={() => handleRating(index, 25)} title="Some Correct">SOME</button>
        <button className={`perf-btn btn-nope ${currentScore === 0 ? 'active' : ''}`} onClick={() => handleRating(index, 0)} title="None Correct">NOPE!</button>
      </div>
    );
  };

  if (view === 'selector') return <ClassSelector onSelectClass={handleClassSelected} onCreateNew={handleCreateNewClass} />;
  if (view === 'create-class') return <CreateClass onSave={handleClassCreated} onCancel={() => setView('selector')} />;
  if (view === 'create-dna') return <CreateDNA onGenerate={handleCustomGeneration} onCancel={goHome} />;
  if (view === 'home') return (
    <div className="home-container">
      <div className="home-header"><div className="logo-large">R</div><h1>Revision Board</h1><p>{dateStr}</p></div>
      <div className="home-actions">
        <button className="big-btn primary" onClick={startClassSelection}><span className="icon">🧠</span><div className="text"><h3>My Class DNAs</h3><p>Continue spaced repetition</p></div></button>
        <button className="big-btn secondary" onClick={() => setView('create-dna')}><span className="icon">🧬</span><div className="text"><h3>Create Custom DNA</h3><p>Build a starter manually</p></div></button>
      </div>
    </div>
  );

  if (loading) return <div style={{padding: 40}}>Loading Board...</div>;

  return (
    <div>
      <header>
        <div className="logo" onClick={goHome}><div className="logo-mark">R</div><span className="logo-text">Revision Board</span></div>
        <div className="header-controls">
          {currentClass && <span style={{marginRight:10, fontWeight:'bold', color:'#2c3e50'}}>{currentClass.name}</span>}
          <button className="btn btn-secondary" onClick={() => setRatings({})}>Reset</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn btn-primary" onClick={goHome}>Exit</button>
        </div>
      </header>
      <main>
        <div className="title-bar">
          <input type="text" className="title-input" placeholder="Session Title" defaultValue={currentClass ? currentClass.name + " Starter" : ""} />
          <span className="date-display">{dateStr}</span>
        </div>
        <div className="questions-grid">
          {cards.map((card, index) => (
            <div key={card.id || index} className="question-card">
              <div className="card-header">
                <div className="card-number">{index + 1}</div>
                <div className="card-topic" title={card.topic}>{card.isReview ? "↺ " : ""}{card.topic}</div>
                <div className="card-actions">
                  <div className="zoom-controls">
                    <button className="zoom-btn" type="button" onClick={(e) => changeFontSize(e, index, -0.2)}>-</button>
                    <button className="zoom-btn" type="button" onClick={(e) => changeFontSize(e, index, 0.2)}>+</button>
                  </div>
                  {!card.isReview && (
                    <>
                      <button className="card-btn" type="button" onClick={(e) => refreshCard(e, index)}>REFRESH</button>
                      <button className="card-btn" type="button" onClick={(e) => swapTopic(e, index)}>CHANGE TOPIC</button>
                    </>
                  )}
                  {ratings[index] !== undefined && <span className="rated-badge">✓</span>}
                </div>
              </div>
              <div className={`card-content ${card.revealed ? 'revealed-mode' : ''}`}>
                <div className="question-text"><MathDisplay text={card.currentQ} fontSize={card.fontSize} /></div>
                <div className={`answer-overlay ${card.revealed ? 'visible' : ''}`}>
                   <div className="answer-overlay-text"><MathDisplay text={card.currentA} fontSize={2} /></div>
                </div>
              </div>
              <div className="card-footer" style={{ justifyContent: 'space-between' }}>
                {renderPerformanceButtons(index)}
                <button className="reveal-btn" type="button" onClick={() => toggleReveal(index)}>{card.revealed ? 'Hide' : 'Reveal'}</button>
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
            <div className="modal-stats">
              <div className="stat"><strong>Correct</strong><span style={{color: '#27ae60'}}>{Object.values(ratings).filter(r => r === 100).length}</span></div>
              <div className="stat"><strong>Struggling</strong><span style={{color: '#e67e22'}}>{Object.values(ratings).filter(r => r <= 25).length}</span></div>
            </div>
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
