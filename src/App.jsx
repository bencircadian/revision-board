import { useEffect, useState, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

// Helper component to render Math/LaTeX safely
const MathDisplay = ({ text, fontSize }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && window.katex) {
      // Basic replace logic for $...$
      let html = text || "";
      // Render the math
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
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateStr, setDateStr] = useState("");

  // Set the date on load
  useEffect(() => {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    setDateStr(new Date().toLocaleDateString('en-GB', options));
    fetchAndInitCards();
  }, []);

  async function fetchAndInitCards() {
    // 1. Fetch questions from Supabase
    const { data, error } = await supabase.from('questions').select('*');
    
    if (error) {
      console.error('Error:', error);
      setLoading(false);
      return;
    }

    // 2. Initialize card state (run generators for the first time)
    const initializedCards = data.map(q => {
      const generated = runGenerator(q.generator_code);
      return {
        ...q,
        currentQ: generated.q,
        currentA: generated.a,
        revealed: false,
        fontSize: 1.4 // Default size
      };
    });
    
    setCards(initializedCards);
    setLoading(false);
  }

  // Safe generator runner
  function runGenerator(code) {
    if (!code) return { q: "No generator code", a: "..." };
    try {
      const generator = new Function(code);
      return generator();
    } catch (err) {
      return { q: "Error in code", a: "Error" };
    }
  }

  // Actions
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
    card.revealed = false; // Hide answer on refresh
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

  // Star generator helper
  const renderStars = (difficulty) => {
    let filled = 2; // easy
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
      <header>
        <div className="logo">
          <div className="logo-mark">R</div>
          <span className="logo-text">Revision Board</span>
        </div>
        <div className="header-controls">
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

      <main>
        <div className="title-bar">
          <input type="text" className="title-input" placeholder="Write your title here" />
          <span className="date-display">{dateStr}</span>
        </div>

        <div className="questions-grid">
          {cards.map((card, index) => (
            <div key={card.id} className="question-card">
              <div className="card-header">
                <div className="card-number">{index + 1}</div>
                <span className="card-topic">{card.topic}</span>
                <div className="card-actions">
                  <div className="zoom-controls">
                   <button className="zoom-btn" onClick={() => changeFontSize(index, -0.2)} title="Smaller text">
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M5 12h14"/>
  </svg>
</button>
<button className="zoom-btn" onClick={() => changeFontSize(index, 0.2)} title="Larger text">
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14"/>
  </svg>
</button>
                  </div>
                  {/* Reuse refresh icon for single card refresh */}
                  <button className="card-btn" onClick={() => refreshCard(index)} title="New Question">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/></svg>
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
    </div>
  )
}

export default App
