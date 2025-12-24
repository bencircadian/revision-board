import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import CreateDna from './CreateDna'
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
        } catch (e) {
          return match;
        }
      });
      containerRef.current.innerHTML = html;
    }
  }, [text]);

  return <div ref={containerRef} style={{ fontSize: `${fontSize}rem` }} className="math-content" />;
};

function App() {
  // --- STATE ---
  // Views: 'home' | 'dashboard' | 'create'
  const [view, setView] = useState('home'); 
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateStr, setDateStr] = useState("");
  const [ratings, setRatings] = useState({});
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setDateStr(new Date().toLocaleDateString('en-GB', options));
  }, []);

  // --- ACTIONS ---

  const goToDashboard = () => {
    setView('dashboard');
    fetchAndInitCards(); // Only fetch when entering dashboard
  };

  const goToCreate = () => {
    setView('create');
    setCards([]); // Clear any previous cards
  };

  const goHome = () => {
    setView('home');
    setCards([]);
    setRatings({});
  };

  // --- DATA FETCHING (Spaced Repetition) ---

  async function fetchAndInitCards() {
    setLoading(true);
    const CLASS_ID = "Year 10 - Set 2"; 

    // 1. Check Spaced Repetition (The "Brain")
    const { data: dueCards } = await supabase.rpc('get_due_cards', { p_class_id: CLASS_ID });
    
    const reviewQuestions = dueCards || [];
    console.log(`Found ${reviewQuestions.length} cards due for review.`);

    // 2. Need to fill the rest of the 6 slots
    const slotsRemaining = 6 - reviewQuestions.length;
    let newQuestions = [];

    if (slotsRemaining > 0) {
      const { data: dbData } = await supabase.from('questions').select('*');
      if (dbData) {
        const shuffled = dbData.sort(() => 0.5 - Math.random());
        newQuestions = shuffled.slice(0, slotsRemaining);
      }
      
      // Fallback if DB empty
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

    // 3. Format cards for the board
    const finalBoard = [
      ...reviewQuestions.map(q => ({
        ...q,
        id: `review-${Math.random()}`, 
        currentQ: q.question_text,     
        currentA: q.answer_text,
        revealed: false,
        fontSize: 1.4,
        isReview: true                 
      })),
      ...newQuestions.map(q => {
        const generated = runGenerator(q.generator_code);
        return {
          ...q,
          currentQ: generated.q,
          currentA: generated.a,
          revealed: false,
          fontSize: 1.4,
          isReview: false
        };
      })
    ];

    setCards(finalBoard.sort(() => 0.5 - Math.random()));
    setLoading(false);
  }

  // --- HANDLE CUSTOM DNA ---
  const handleCustomGeneration = (newCards) => {
    setCards(newCards);
    setRatings({}); 
    setView('dashboard'); 
  };

  function runGenerator(code) {
    if (!code) return { q: "Error", a: "..." };
    try {
      const generator = new Function(code);
      return generator();
    } catch (err) {
      return { q: "Error", a: "Error" };
    }
  }

  // --- INTERACTION HANDLERS ---

  const toggleReveal = (index) => {
    const newCards = [...cards];
    newCards[index].revealed = !newCards[index].revealed;
    setCards(newCards);
  };

  const handleRating = (index, score) => {
    const newRatings = { ...ratings, [index]: score };
    setRatings(newRatings);

    if (Object.keys(newRatings).length === cards.length) {
      setTimeout(() => setShowSaveModal(true), 500); 
    }
  };

  const saveSession = async () => {
    const getLessonInterval = (score) => {
      switch (score) {
        case 0:   return 1;   
        case 25:  return 3;   
        case 75:  return 6;   
        case 100: return 12;  
        default:  return 1;
      }
    };

    const sessionData = {
      date: new Date().toISOString(),
      class_id: "Year 10 - Set 2", 
      results: cards.map((card, index) => {
        const score = ratings[index] || 0;
        return {
          question_id: card.id,
          topic: card.topic,
          question_text: card.currentQ, 
          answer_text: card.currentA,
          score: score,
          review_interval: getLessonInterval(score) 
        };
      })
    };

    const { error } = await supabase.from('dna_sessions').insert([sessionData]);
    if (error) alert("Error saving: " + error.message);
    else alert("Session Saved!");
    
    setShowSaveModal(false);
    goHome(); // Return to home after saving
  };

  const renderPerformanceButtons = (index) => {
    if (!cards[index].revealed) return <div style={{color: '#ccc', fontSize: '0.9rem'}}>Reveal to grade</div>;
    const currentScore = ratings[index];
    return (
      <div className="perf-buttons">
        <button className={`perf-btn ${currentScore === 100 ? 'active green' : ''}`} onClick={() => handleRating(index, 100)}>🌟</button>
        <button className={`perf-btn ${currentScore === 75 ? 'active yellow' : ''}`} onClick={() => handleRating(index, 75)}>👍</button>
        <button className={`perf-btn ${currentScore === 25 ? 'active orange' : ''}`} onClick={() => handleRating(index, 25)}>⚠️</button>
        <button className={`perf-btn ${currentScore === 0 ? 'active red' : ''}`} onClick={() => handleRating(index, 0)}>❌</button>
      </div>
    );
  };

  // --- RENDER VIEWS ---

  // 1. HOME SCREEN VIEW
  if (view === 'home') {
    return (
      <div className="home-container">
        <div className="home-header">
          <div className="logo-large">R</div>
          <h1>Revision Board</h1>
          <p>{dateStr}</p>
        </div>

        <div className="home-actions">
          <button className="big-btn primary" onClick={goToDashboard}>
            <span className="icon">🧠</span>
            <div className="text">
              <h3>My Class DNAs</h3>
              <p>Continue spaced repetition for Year 10</p>
            </div>
          </button>

          <button className="big-btn secondary" onClick={goToCreate}>
            <span className="icon">🧬</span>
            <div className="text">
              <h3>Create Custom DNA</h3>
              <p>Build a starter from specific topics</p>
            </div>
          </button>
        </div>

        <style>{`
          .home-container { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; background: #faf9f7; }
          .home-header { text-align: center; margin-bottom: 50px; }
          .logo-large { font-size: 3rem; font-weight: 800; color: white; background: #2c3e50; width: 80px; height: 80px; border-radius: 20px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
          .home-header h1 { color: #2c3e50; margin: 0; font-size: 2.5rem; }
          .home-header p { color: #7f8c8d; margin-top: 10px; font-size: 1.2rem; }
          
          .home-actions { display: flex; gap: 30px; }
          .big-btn { display: flex; align-items: center; gap: 20px; padding: 30px; width: 320px; border: none; border-radius: 16px; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s; text-align: left; }
          .big-btn:hover { transform: translateY(-5px); box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
          
          .big-btn.primary { background: white; border: 2px solid #e0e0e0; }
          .big-btn.primary .icon { font-size: 3rem; }
          .big-btn.primary h3 { margin: 0; color: #2c3e50; font-size: 1.4rem; }
          
          .big-btn.secondary { background: #2c3e50; color: white; }
          .big-btn.secondary .icon { font-size: 3rem; }
          .big-btn.secondary h3 { margin: 0; color: white; font-size: 1.4rem; }
          .big-btn.secondary p { color: #bdc3c7; }
          
          .text p { margin: 5px 0 0; font-size: 0.9rem; color: #7f8c8d; }
        `}</style>
      </div>
    );
  }

  // 2. CREATE VIEW
  if (view === 'create') {
    return <CreateDna onGenerate={handleCustomGeneration} onCancel={goHome} />;
  }

  // 3. DASHBOARD VIEW (Grid)
  if (loading) return <div style={{padding: 40}}>Loading Board...</div>;

  return (
    <div>
      <header>
        <div className="logo" onClick={goHome} style={{cursor: 'pointer'}}>
          <div className="logo-mark">R</div>
          <span className="logo-text">Revision Board</span>
        </div>
        <div className="header-controls">
          <button className="btn btn-secondary" onClick={() => setRatings({})}>Reset</button>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
          <button className="btn btn-primary" onClick={goHome}>Exit</button>
        </div>
      </header>

      <main>
        <div className="title-bar">
          <input type="text" className="title-input" placeholder="Enter Class Name / Title" />
          <span className="date-display">{dateStr}</span>
        </div>

        <div className="questions-grid">
          {cards.map((card, index) => (
            <div key={card.id || index} className="question-card">
              <div className="card-header">
                <div className="card-number">{index + 1}</div>
                <span className="card-topic">
                  {card.isReview ? "↺ " : ""}{card.topic}
                </span>
                <div className="card-actions">
                  {ratings[index] !== undefined && <span className="rated-badge">✓</span>}
                </div>
              </div>

              <div className="card-content">
                <div className="question-text">
                   <MathDisplay text={card.currentQ} fontSize={card.fontSize} />
                </div>
                
                <div className={`answer-overlay ${card.revealed ? 'visible' : ''}`}>
                   <div className="answer-overlay-text">
                      <MathDisplay text={card.currentA} fontSize={2} />
                   </div>
                </div>
              </div>

              <div className="card-footer" style={{ justifyContent: 'space-between' }}>
                {renderPerformanceButtons(index)}
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
            <p>Save performance data for <strong>Year 10 - Set 2</strong>?</p>
            <div className="modal-stats">
              <div className="stat"><strong>Correct</strong><span style={{color: '#27ae60'}}>{Object.values(ratings).filter(r => r === 100).length}</span></div>
              <div className="stat"><strong>Struggling</strong><span style={{color: '#e67e22'}}>{Object.values(ratings).filter(r => r <= 25).length}</span></div>
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSaveModal(false)}>No, Don't Save</button>
              <button className="btn-confirm" onClick={saveSession}>Yes, Save Data</button>
            </div>
          </div>
        </div>
      )}

      {/* RE-USING STYLES FROM BEFORE */}
      <style>{`
        .perf-buttons { display: flex; gap: 5px; }
        .perf-btn { width: 32px; height: 32px; border: 1px solid #ddd; border-radius: 6px; background: #f9f9f9; cursor: pointer; font-size: 1.1rem; padding: 0; display: flex; align-items: center; justify-content: center; opacity: 0.5; transition: all 0.2s; }
        .perf-btn:hover { opacity: 1; transform: scale(1.1); }
        .perf-btn.active { opacity: 1; border-width: 2px; background: white; transform: scale(1.15); box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
        .perf-btn.active.green { border-color: #27ae60; }
        .perf-btn.active.yellow { border-color: #f1c40f; }
        .perf-btn.active.orange { border-color: #e67e22; }
        .perf-btn.active.red { border-color: #c0392b; }
        .rated-badge { color: #27ae60; font-weight: bold; font-size: 1.2rem; }
        .modal-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
        .modal-box { background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 450px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .modal-stats { display: flex; justify-content: center; gap: 30px; margin: 20px 0; background: #f4f7f6; padding: 15px; border-radius: 8px; }
        .stat { display: flex; flex-direction: column; }
        .stat strong { font-size: 0.8rem; color: #7f8c8d; text-transform: uppercase; }
        .stat span { font-size: 1.5rem; font-weight: bold; }
        .modal-actions { display: flex; justify-content: center; gap: 15px; }
        .btn-cancel { padding: 10px 20px; border: none; background: #e0e0e0; border-radius: 6px; cursor: pointer; color: #555; }
        .btn-confirm { padding: 10px 20px; border: none; background: #2c3e50; border-radius: 6px; cursor: pointer; color: white; font-weight: bold; }
        .btn-confirm:hover { background: #34495e; }
      `}</style>
    </div>
  )
}

export default App
