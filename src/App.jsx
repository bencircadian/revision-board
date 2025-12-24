import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

// --- 1. Helper: Math Display (Existing) ---
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

// --- 2. Helper: DNA Tracker Overlay (New) ---
const DnaTrackerOverlay = ({ isOpen, onClose }) => {
  // Dummy Data for the session (You can hook this up to Supabase later)
  const [questions, setQuestions] = useState([
    { id: 1, text: "Solve: 2x + 4 = 12", answer: "x = 4", score: null },
    { id: 2, text: "Expand: 3(x + 5)", answer: "3x + 15", score: null },
    { id: 3, text: "Simplify: 2a - a + b", answer: "a + b", score: null },
    { id: 4, text: "Calculate: 15% of 40", answer: "6", score: null },
  ]);

  const handleScore = (id, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, score: value } : q
    ));
    console.log(`Saved score ${value} for Q${id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="dna-backdrop">
      <div className="dna-modal">
        <div className="dna-header">
          <div>
            <h2 style={{ margin: 0, color: '#2c3e50' }}>🧬 DNA Session</h2>
            <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.9rem' }}>Class 10A - Algebra</p>
          </div>
          <button onClick={onClose} className="close-btn">Close & Save</button>
        </div>

        <div className="dna-list">
          {questions.map((q, index) => (
            <div key={q.id} className="dna-row">
              <div className="dna-q-number">{index + 1}</div>
              <div className="dna-q-content">
                <div className="dna-q-text">{q.text}</div>
                <div className="dna-q-answer">
                  Answer: <span>{q.answer}</span>
                </div>
              </div>
              <div className="ranking-buttons">
                <RankButton emoji="🌟" color="#27ae60" active={q.score === 100} onClick={() => handleScore(q.id, 100)} />
                <RankButton emoji="👍" color="#f1c40f" active={q.score === 75} onClick={() => handleScore(q.id, 75)} />
                <RankButton emoji="⚠️" color="#e67e22" active={q.score === 25} onClick={() => handleScore(q.id, 25)} />
                <RankButton emoji="❌" color="#c0392b" active={q.score === 0} onClick={() => handleScore(q.id, 0)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Styles for the Overlay */}
      <style>{`
        .dna-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.6); z-index: 9999; display: flex; justify-content: center; align-items: center; backdrop-filter: blur(4px); }
        .dna-modal { background: #f4f7f6; width: 90%; max-width: 800px; height: 80vh; border-radius: 12px; display: flex; flex-direction: column; box-shadow: 0 25px 50px rgba(0,0,0,0.25); overflow: hidden; }
        .dna-header { background: white; padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
        .dna-list { padding: 20px; overflow-y: auto; flex: 1; }
        .dna-row { background: white; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; align-items: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .dna-q-number { font-size: 1.2rem; font-weight: bold; color: #bdc3c7; width: 40px; text-align: center; }
        .dna-q-content { flex: 1; padding: 0 15px; }
        .dna-q-text { font-weight: 600; color: #2c3e50; margin-bottom: 4px; font-size: 1.1rem; }
        .dna-q-answer { font-size: 0.9rem; color: #7f8c8d; }
        .dna-q-answer span { background: #bdc3c7; color: transparent; padding: 2px 6px; border-radius: 4px; cursor: pointer; transition: 0.2s; }
        .dna-q-answer:hover span { background: #dff9fb; color: #2980b9; }
        .ranking-buttons { display: flex; gap: 8px; }
        .close-btn { background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: bold; }
      `}</style>
    </div>
  );
};

// --- 3. Helper: Rank Button (New) ---
const RankButton = ({ emoji, color, active, onClick }) => (
  <button 
    onClick={onClick}
    style={{
      width: '40px', height: '40px', fontSize: '1.2rem',
      border: active ? `2px solid ${color}` : '1px solid transparent',
      borderRadius: '8px', background: active ? 'white' : 'rgba(0,0,0,0.05)',
      cursor: 'pointer', opacity: active ? 1 : 0.4, transition: '0.2s'
    }}
  >
    {emoji}
  </button>
);


// --- 4. Main App Component ---
function App() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState("");
  
  // New State for Popup
  const [isDnaOpen, setIsDnaOpen] = useState(false);

  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setDateStr(new Date().toLocaleDateString('en-GB', options));
    fetchAndInitCards();
  }, []);

  async function fetchAndInitCards() {
    // 1. Fetch real questions from Supabase
    const { data, error } = await supabase.from('questions').select('*');
    
    let dbQuestions = [];
    if (!error && data) {
      dbQuestions = data;
    }

    // 2. Create "Stand-in" Placeholders to fill the grid up to 6
    const placeholdersNeeded = 6 - dbQuestions.length;
    const placeholders = [
      { id: 'p-1', topic: 'Geometry', difficulty: 'Medium', generator_code: `return { q: "Find area of circle r=5", a: "$25\\\\pi$" }` },
      { id: 'p-2', topic: 'Algebra', difficulty: 'Hard', generator_code: `return { q: "Solve $2x + 5 = 15$", a: "$x = 5$" }` },
      { id: 'p-3', topic: 'Ratio', difficulty: 'Easy', generator_code: `return { q: "Simplify $15:25$", a: "$3:5$" }` },
      { id: 'p-4', topic: 'Data', difficulty: 'Medium', generator_code: `return { q: "Mean of 2, 4, 6, 8", a: "$5$" }` }
    ];

    const combinedData = [...dbQuestions];
    for (let i = 0; i < placeholdersNeeded; i++) {
      if (placeholders[i]) combinedData.push(placeholders[i]);
    }

    // 3. Initialize the state for all cards
    const initializedCards = combinedData.map(q => {
      const generated = runGenerator(q.generator_code);
      return {
        ...q,
        currentQ: generated.q,
        currentA: generated.a,
        revealed: false,
        fontSize: 1.4
      };
    });
    
    setCards(initializedCards);
    setLoading(false);
  }

  function runGenerator(code) {
    if (!code) return { q: "Error in code", a: "..." };
    try {
      const generator = new Function(code);
      return generator();
    } catch (err) {
      return { q: "Error in code", a: "Error" };
    }
  }

  // --- ACTIONS ---

  const toggleReveal = (index) => {
    const newCards = [...cards];
    newCards[index].revealed = !newCards[index].revealed;
    setCards(newCards);
  };

  const refreshCard = (index) => {
    const newCards = [...cards];
    const card = newCards[index];
    const newData = runGenerator(card.generator_code);
    card.currentQ = newData.q;
    card.currentA = newData.a;
    card.revealed = false;
    setCards(newCards);
  };

  const changeFontSize = (index, delta) => {
    const newCards = [...cards];
    const newSize = newCards[index].fontSize + delta;
    if (newSize > 0.5 && newSize < 4) {
      newCards[index].fontSize = newSize;
      setCards(newCards);
    }
  };

  const refreshAll = () => {
    const newCards = cards.map(c => {
      const gen = runGenerator(c.generator_code);
      return { ...c, currentQ: gen.q, currentA: gen.a, revealed: false };
    });
    setCards(newCards);
  };

  const revealAll = () => {
    const newCards = cards.map(c => ({ ...c, revealed: true }));
    setCards(newCards);
  };

  const renderStars = (difficulty) => {
    let filled = 2; // easy default
    if (difficulty === 'Medium') filled = 4;
    if (difficulty === 'Hard') filled = 6;
    
    return (
      <div className="stars-container" title={`Difficulty: ${difficulty}`}>
        {[...Array(6)].map((_, i) => (
          <svg key={i} className={`star-icon ${i < filled ? 'filled' : ''}`} viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        ))}
      </div>
    );
  };

  if (loading) return <div style={{padding: 40}}>Loading your Revision Board...</div>;

  return (
    <div>
      {/* HEADER SECTION */}
      <header>
        <div className="logo">
          <div className="logo-mark">R</div>
          <span className="logo-text">Revision Board</span>
        </div>
        <div className="header-controls">
          {/* NEW BUTTON: Start DNA Session */}
          <button className="btn btn-primary" style={{ backgroundColor: '#2c3e50' }} onClick={() => setIsDnaOpen(true)}>
             <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{marginRight: 6}}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
             Start Live DNA
          </button>

          <button className="btn btn-secondary" onClick={refreshAll}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
            Refresh All
          </button>
          <button className="btn btn-secondary" onClick={revealAll}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            Show Answers
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main>
        <div className="title-bar">
          <input type="text" className="title-input" placeholder="Write your title here" />
          <span className="date-display">{dateStr}</span>
        </div>

        <div className="questions-grid">
          {cards.map((card, index) => (
            <div key={card.id || index} className="question-card">
              <div className="card-header">
                <div className="card-number">{index + 1}</div>
                <span className="card-topic">{card.topic}</span>
                
                <div className="card-actions">
                  <div className="zoom-controls">
                    <button className="zoom-btn" onClick={() => changeFontSize(index, -0.2)} title="Smaller text">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M5 12h14"/></svg>
                    </button>
                    <button className="zoom-btn" onClick={() => changeFontSize(index, 0.2)} title="Larger text">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>
                    </button>
                  </div>

                  <button className="card-btn" onClick={() => alert("Change topic logic coming soon!")} title="Change Topic">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                    </svg>
                  </button>

                  <button className="card-btn" onClick={() => refreshCard(index)} title="New Question">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                      <path d="M23 4v6h-6"/>
                      <path d="M1 20v-6h6"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                  </button>
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

              <div className="card-footer">
                {renderStars(card.difficulty)}
                <button className="reveal-btn" onClick={() => toggleReveal(index)}>
                  {card.revealed ? 'Hide Answer' : 'Reveal Answer'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* --- THE DNA OVERLAY --- */}
      <DnaTrackerOverlay 
        isOpen={isDnaOpen} 
        onClose={() => setIsDnaOpen(false)} 
      />
    </div>
  )
}

export default App
