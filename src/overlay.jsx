import React, { useState } from 'react';

const DnaTrackerOverlay = ({ isOpen, onClose }) => {
  // Dummy Data for the session
  const [questions, setQuestions] = useState([
    { id: 1, text: "Solve: 2x + 4 = 12", answer: "x = 4", score: null },
    { id: 2, text: "Expand: 3(x + 5)", answer: "3x + 15", score: null },
    { id: 3, text: "Simplify: 2a - a + b", answer: "a + b", score: null },
    { id: 4, text: "Calculate: 15% of 40", answer: "6", score: null },
  ]);

  // Handle Score Selection
  const handleScore = (id, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, score: value } : q
    ));
    console.log(`Saved score ${value} for Question ${id}`);
  };

  if (!isOpen) return null;

  return (
    <div className="dna-overlay-backdrop">
      <div className="dna-modal">
        
        {/* Header */}
        <div className="dna-header">
          <div>
            <h2>🧬 DNA Session</h2>
            <p>Class 10A - Algebra</p>
          </div>
          <button onClick={onClose} className="close-btn">Close & Save</button>
        </div>

        {/* Scrollable List */}
        <div className="dna-list">
          {questions.map((q, index) => (
            <div key={q.id} className="dna-row">
              <div className="q-number">{index + 1}</div>
              
              <div className="q-content">
                <div className="q-text">{q.text}</div>
                {/* Click or Hover to reveal answer */}
                <div className="q-answer">
                  Answer: <span>{q.answer}</span>
                </div>
              </div>

              {/* Traffic Light Buttons */}
              <div className="ranking-buttons">
                <RankButton 
                  emoji="🌟" color="#27ae60" active={q.score === 100} 
                  onClick={() => handleScore(q.id, 100)} 
                />
                <RankButton 
                  emoji="👍" color="#f1c40f" active={q.score === 75} 
                  onClick={() => handleScore(q.id, 75)} 
                />
                <RankButton 
                  emoji="⚠️" color="#e67e22" active={q.score === 25} 
                  onClick={() => handleScore(q.id, 25)} 
                />
                <RankButton 
                  emoji="❌" color="#c0392b" active={q.score === 0} 
                  onClick={() => handleScore(q.id, 0)} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Embedded Styles for simplicity */}
      <style>{`
        .dna-overlay-backdrop {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.7); z-index: 9999;
          display: flex; justify-content: center; align-items: center;
          backdrop-filter: blur(5px);
        }
        .dna-modal {
          background: #f4f7f6; width: 90%; max-width: 900px; height: 85vh;
          border-radius: 16px; overflow: hidden; display: flex; flex-direction: column;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }
        .dna-header {
          background: white; padding: 20px 30px; border-bottom: 1px solid #ddd;
          display: flex; justify-content: space-between; align-items: center;
        }
        .dna-header h2 { margin: 0; color: #2c3e50; font-size: 1.5rem; }
        .dna-header p { margin: 5px 0 0; color: #7f8c8d; font-size: 0.9rem; }
        
        .close-btn {
          padding: 8px 16px; background: #e74c3c; color: white; border: none;
          border-radius: 6px; cursor: pointer; font-weight: bold;
        }

        .dna-list { padding: 30px; overflow-y: auto; }
        
        .dna-row {
          background: white; padding: 20px; border-radius: 10px; margin-bottom: 15px;
          display: flex; align-items: center; box-shadow: 0 2px 5px rgba(0,0,0,0.05);
        }
        .q-number { font-size: 1.5rem; font-weight: bold; color: #bdc3c7; width: 60px; text-align: center; }
        
        .q-content { flex: 1; padding: 0 20px; }
        .q-text { font-size: 1.2rem; font-weight: 600; color: #2c3e50; margin-bottom: 8px; }
        
        .q-answer { font-size: 1rem; color: #7f8c8d; user-select: none; }
        .q-answer span { 
          background: #bdc3c7; color: transparent; padding: 2px 6px; border-radius: 4px; 
          transition: all 0.2s; cursor: pointer;
        }
        .q-answer:hover span { background: #dff9fb; color: #2980b9; }

        .ranking-buttons { display: flex; gap: 10px; }
      `}</style>
    </div>
  );
};

// Helper Sub-component for the buttons
const RankButton = ({ emoji, color, active, onClick }) => (
  <button 
    onClick={onClick}
    style={{
      width: '50px', height: '50px', fontSize: '1.5rem',
      border: active ? `3px solid ${color}` : '2px solid transparent',
      borderRadius: '10px',
      background: active ? 'white' : 'rgba(0,0,0,0.05)',
      cursor: 'pointer', opacity: active ? 1 : 0.5,
      transition: 'all 0.2s'
    }}
  >
    {emoji}
  </button>
);

export default DnaTrackerOverlay;
