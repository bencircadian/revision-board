import { useState } from 'react';
import { supabase } from '../supabase';

export default function Feedback({ onNavigate }) {
  const [feedbackType, setFeedbackType] = useState('feature');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('feedback').insert([{
        type: feedbackType,
        message: message.trim(),
        email: email.trim() || null,
        created_at: new Date().toISOString()
      }]);

      if (!error) {
        setSubmitted(true);
        setMessage('');
        setEmail('');
      }
    } catch (err) {
      console.error('Error submitting feedback:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="feedback-page">
      <header className="page-header">
        <h1>💬 Feedback & Suggestions</h1>
        <p>Help us improve Engram for teachers everywhere</p>
      </header>

      {/* Feature Roadmap */}
      <section className="roadmap-section">
        <h2>🗺️ Feature Roadmap</h2>
        <p className="section-desc">Here's what we're working on and considering</p>
        
        <div className="roadmap-grid">
          <div className="roadmap-column">
            <h3>🚀 Coming Soon</h3>
            <div className="roadmap-items">
              <div className="roadmap-item done">
                <span className="status">✓</span>
                <span>Dashboard with class summaries</span>
              </div>
              <div className="roadmap-item done">
                <span className="status">✓</span>
                <span>Share board links</span>
              </div>
              <div className="roadmap-item in-progress">
                <span className="status">🔨</span>
                <span>Separate teacher logins</span>
              </div>
              <div className="roadmap-item in-progress">
                <span className="status">🔨</span>
                <span>Topic performance tracking</span>
              </div>
            </div>
          </div>

          <div className="roadmap-column">
            <h3>📋 Planned</h3>
            <div className="roadmap-items">
              <div className="roadmap-item">
                <span className="status">○</span>
                <span>Mobile-responsive design improvements</span>
              </div>
              <div className="roadmap-item">
                <span className="status">○</span>
                <span>Add questions directly in app</span>
              </div>
              <div className="roadmap-item">
                <span className="status">○</span>
                <span>Search in topic dropdown</span>
              </div>
              <div className="roadmap-item">
                <span className="status">○</span>
                <span>Shadow board (student view)</span>
              </div>
            </div>
          </div>

          <div className="roadmap-column">
            <h3>💭 Considering</h3>
            <div className="roadmap-items">
              <div className="roadmap-item">
                <span className="status">?</span>
                <span>Student accounts & tracking</span>
              </div>
              <div className="roadmap-item">
                <span className="status">?</span>
                <span>Collaborative board editing</span>
              </div>
              <div className="roadmap-item">
                <span className="status">?</span>
                <span>Question difficulty AI tagging</span>
              </div>
              <div className="roadmap-item">
                <span className="status">?</span>
                <span>Export to PDF/Print</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feedback Form */}
      <section className="feedback-section">
        <h2>📝 Submit Feedback</h2>
        
        {submitted ? (
          <div className="success-message">
            <span className="success-icon">🎉</span>
            <h3>Thank you!</h3>
            <p>Your feedback has been submitted. We really appreciate it!</p>
            <button onClick={() => setSubmitted(false)}>Submit Another</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="feedback-form">
            <div className="form-group">
              <label>What type of feedback is this?</label>
              <div className="type-buttons">
                <button
                  type="button"
                  className={feedbackType === 'feature' ? 'active' : ''}
                  onClick={() => setFeedbackType('feature')}
                >
                  💡 Feature Request
                </button>
                <button
                  type="button"
                  className={feedbackType === 'bug' ? 'active' : ''}
                  onClick={() => setFeedbackType('bug')}
                >
                  🐛 Bug Report
                </button>
                <button
                  type="button"
                  className={feedbackType === 'question' ? 'active' : ''}
                  onClick={() => setFeedbackType('question')}
                >
                  ❓ Question Idea
                </button>
                <button
                  type="button"
                  className={feedbackType === 'other' ? 'active' : ''}
                  onClick={() => setFeedbackType('other')}
                >
                  💬 Other
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Your message *</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  feedbackType === 'feature' ? "Describe the feature you'd like to see..." :
                  feedbackType === 'bug' ? "What went wrong? Steps to reproduce..." :
                  feedbackType === 'question' ? "What topic/question type would you like added?" :
                  "Tell us what's on your mind..."
                }
                rows={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Email (optional - if you'd like a response)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
              />
            </div>

            <button type="submit" className="submit-btn" disabled={loading || !message.trim()}>
              {loading ? 'Sending...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </section>

      {/* Help Section */}
      <section className="help-section">
        <h2>❓ Quick Help</h2>
        <div className="help-cards">
          <div className="help-card">
            <h4>How do I add new questions?</h4>
            <p>Go to Topics & Questions → Add Question. You can write JavaScript generator code to create infinite variations.</p>
          </div>
          <div className="help-card">
            <h4>What is spaced repetition?</h4>
            <p>Questions students get wrong will reappear sooner. Questions they ace will come back later. This optimizes memory retention.</p>
          </div>
          <div className="help-card">
            <h4>How do I share a board?</h4>
            <p>During any DNA session, click "Share Board" to generate a link. Anyone with the link can load those exact questions.</p>
          </div>
          <div className="help-card">
            <h4>Can students see this?</h4>
            <p>Currently Engram is teacher-focused. A "shadow board" feature for student view is planned!</p>
          </div>
        </div>
      </section>

      <style>{feedbackStyles}</style>
    </div>
  );
}

const feedbackStyles = `
  .feedback-page {
    padding: 32px;
    max-width: 1000px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .page-header {
    margin-bottom: 40px;
    text-align: center;
  }

  .page-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .page-header p {
    color: #64748b;
    margin: 0;
  }

  /* Roadmap Section */
  .roadmap-section {
    margin-bottom: 48px;
  }

  .roadmap-section h2 {
    font-size: 1.3rem;
    color: #1e293b;
    margin: 0 0 8px 0;
    text-align: center;
  }

  .section-desc {
    text-align: center;
    color: #64748b;
    margin: 0 0 24px 0;
  }

  .roadmap-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
  }

  .roadmap-column {
    background: white;
    padding: 24px;
    border-radius: 16px;
    border: 1px solid #f1f5f9;
  }

  .roadmap-column h3 {
    font-size: 1rem;
    color: #1e293b;
    margin: 0 0 16px 0;
    padding-bottom: 12px;
    border-bottom: 1px solid #f1f5f9;
  }

  .roadmap-items {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .roadmap-item {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 0.85rem;
    color: #64748b;
  }

  .roadmap-item .status {
    flex-shrink: 0;
    width: 20px;
    text-align: center;
  }

  .roadmap-item.done {
    color: #16a34a;
  }

  .roadmap-item.in-progress {
    color: #0d9488;
    font-weight: 500;
  }

  /* Feedback Form */
  .feedback-section {
    background: white;
    padding: 32px;
    border-radius: 20px;
    border: 1px solid #f1f5f9;
    margin-bottom: 48px;
  }

  .feedback-section h2 {
    font-size: 1.3rem;
    color: #1e293b;
    margin: 0 0 24px 0;
  }

  .feedback-form {
    max-width: 600px;
  }

  .form-group {
    margin-bottom: 24px;
  }

  .form-group label {
    display: block;
    font-weight: 600;
    font-size: 0.9rem;
    color: #334155;
    margin-bottom: 10px;
  }

  .type-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }

  .type-buttons button {
    padding: 10px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    background: white;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .type-buttons button:hover {
    border-color: #99f6e4;
    background: #f0fdfa;
  }

  .type-buttons button.active {
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border-color: transparent;
  }

  .form-group textarea,
  .form-group input {
    width: 100%;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    font-family: inherit;
    resize: vertical;
  }

  .form-group textarea:focus,
  .form-group input:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
  }

  .submit-btn {
    padding: 14px 28px;
    background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
    color: white;
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 12px rgba(13, 148, 136, 0.25);
  }

  .submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(13, 148, 136, 0.35);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  /* Success Message */
  .success-message {
    text-align: center;
    padding: 48px;
  }

  .success-icon {
    font-size: 3rem;
    display: block;
    margin-bottom: 16px;
  }

  .success-message h3 {
    font-size: 1.4rem;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .success-message p {
    color: #64748b;
    margin: 0 0 24px 0;
  }

  .success-message button {
    padding: 10px 20px;
    background: #f0fdfa;
    color: #0d9488;
    border: 1px solid #99f6e4;
    border-radius: 10px;
    font-weight: 600;
    cursor: pointer;
  }

  /* Help Section */
  .help-section h2 {
    font-size: 1.3rem;
    color: #1e293b;
    margin: 0 0 24px 0;
  }

  .help-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }

  .help-card {
    background: white;
    padding: 20px;
    border-radius: 14px;
    border: 1px solid #f1f5f9;
  }

  .help-card h4 {
    font-size: 0.95rem;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .help-card p {
    font-size: 0.85rem;
    color: #64748b;
    margin: 0;
    line-height: 1.5;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .feedback-page {
      padding: 20px 16px;
    }

    .roadmap-grid {
      grid-template-columns: 1fr;
    }

    .type-buttons {
      flex-direction: column;
    }

    .type-buttons button {
      width: 100%;
    }
  }
`;
