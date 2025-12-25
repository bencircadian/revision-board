import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function SharedDNAs({ onNavigate }) {
  const [sharedBoards, setSharedBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTopic, setFilterTopic] = useState('all');
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    fetchSharedBoards();
  }, []);

  async function fetchSharedBoards() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('shared_boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (data) {
        setSharedBoards(data);
        const allTopics = data.flatMap(board => 
          (board.config?.questions || []).map(q => q.topic)
        );
        setTopics([...new Set(allTopics)].filter(Boolean).sort());
      }
    } catch (err) {
      console.error('Error fetching shared boards:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredBoards = sharedBoards.filter(board => {
    const config = board.config || {};
    const matchesSearch = !searchQuery || 
      config.class_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (config.questions || []).some(q => q.topic?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesTopic = filterTopic === 'all' || 
      (config.questions || []).some(q => q.topic === filterTopic);
    
    return matchesSearch && matchesTopic;
  });

  const loadBoard = (board) => {
    const config = board.config || {};
    const cards = (config.questions || []).map((q, idx) => ({
      id: `shared-${board.id}-${idx}`,
      topic: q.topic,
      currentQ: q.question_text,
      currentA: q.answer_text,
      generator_code: q.generator_code,
      revealed: false,
      fontSize: 1.4,
      isReview: false
    }));

    onNavigate('dna-board', {
      name: config.class_name || 'Shared DNA',
      cards
    });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading shared boards...</p>
        <style>{`
          .loading-container { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; gap: 16px; }
          .spinner { width: 40px; height: 40px; border: 3px solid #e2e8f0; border-top-color: #0d9488; border-radius: 50%; animation: spin 0.8s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  return (
    <div className="shared-page">
      <header className="page-header">
        <div className="header-content">
          <h1><Icon name="globe" size={28} style={{marginRight:'10px'}} /> Shared DNAs</h1>
          <p>Browse boards shared by the community</p>
        </div>
      </header>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon"><Icon name="search" size={16} /></span>
          <input
            type="text"
            placeholder="Search shared boards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          value={filterTopic}
          onChange={(e) => setFilterTopic(e.target.value)}
          className="topic-filter"
        >
          <option value="all">All Topics</option>
          {topics.map(topic => (
            <option key={topic} value={topic}>{topic}</option>
          ))}
        </select>
      </div>

      {/* Board Cards */}
      {filteredBoards.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon"><Icon name="globe" size={64} /></div>
          <h3>No shared boards yet</h3>
          <p>Share a DNA board to see it appear here. Shared boards help teachers collaborate!</p>
        </div>
      ) : (
        <div className="boards-grid">
          {filteredBoards.map(board => {
            const config = board.config || {};
            const questions = config.questions || [];
            const topicsInBoard = [...new Set(questions.map(q => q.topic))].filter(Boolean);

            return (
              <div key={board.id} className="board-card" onClick={() => loadBoard(board)}>
                <div className="board-header">
                  <h3>{config.class_name || 'Untitled DNA'}</h3>
                  <span className="date">{formatDate(board.created_at)}</span>
                </div>
                
                <div className="board-stats">
                  <div className="stat">
                    <span className="value">{questions.length}</span>
                    <span className="label">Questions</span>
                  </div>
                  <div className="stat">
                    <span className="value">{topicsInBoard.length}</span>
                    <span className="label">Topics</span>
                  </div>
                </div>

                <div className="topics-preview">
                  {topicsInBoard.slice(0, 3).map(topic => (
                    <span key={topic} className="topic-tag">{topic}</span>
                  ))}
                  {topicsInBoard.length > 3 && (
                    <span className="topic-more">+{topicsInBoard.length - 3} more</span>
                  )}
                </div>

                <div className="board-action">
                  <span>Use This Board</span>
                  <span className="arrow">→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Section */}
      <section className="info-section">
        <h2><Icon name="bulb" size={22} /> How Sharing Works</h2>
        <div className="info-cards">
          <div className="info-card">
            <span className="info-icon"><Icon name="link" size={24} /></span>
            <h4>Share Your Board</h4>
            <p>Click "Share Board" during any DNA session to create a link</p>
          </div>
          <div className="info-card">
            <span className="info-icon"><Icon name="link" size={24} /></span>
            <h4>Use Shared Boards</h4>
            <p>Browse and load boards created by other teachers</p>
          </div>
          <div className="info-card">
            <><Icon name="refresh" size={14} /> Test</>
            <h4>Regenerate Questions</h4>
            <p>Shared boards use generators, so each use creates new instances</p>
          </div>
        </div>
      </section>

      <style>{sharedStyles}</style>
    </div>
  );
}

const sharedStyles = `
  .shared-page {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  }

  .page-header {
    margin-bottom: 32px;
  }

  .header-content h1 {
    font-size: 1.75rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .header-content p {
    color: #64748b;
    margin: 0;
  }

  /* Filters */
  .filters-bar {
    display: flex;
    gap: 16px;
    margin-bottom: 32px;
  }

  .search-box {
    flex: 1;
    position: relative;
  }

  .search-icon {
    position: absolute;
    left: 16px;
    top: 50%;
    transform: translateY(-50%);
  }

  .search-box input {
    width: 100%;
    padding: 14px 14px 14px 48px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: #14b8a6;
    box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
  }

  .topic-filter {
    padding: 14px 20px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    font-size: 1rem;
    background: white;
    min-width: 180px;
  }

  /* Empty State */
  .empty-state {
    text-align: center;
    padding: 80px 40px;
    background: linear-gradient(135deg, #f0fdfa 0%, #f0f9ff 100%);
    border-radius: 24px;
    border: 2px dashed #99f6e4;
  }

  .empty-icon {
    font-size: 4rem;
    margin-bottom: 20px;
  }

  .empty-state h3 {
    font-size: 1.3rem;
    color: #1e293b;
    margin: 0 0 12px 0;
  }

  .empty-state p {
    color: #64748b;
    max-width: 400px;
    margin: 0 auto;
  }

  /* Boards Grid */
  .boards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 48px;
  }

  .board-card {
    background: white;
    padding: 24px;
    border-radius: 16px;
    border: 1px solid #f1f5f9;
    cursor: pointer;
    transition: all 0.25s ease;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }

  .board-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0,0,0,0.12);
    border-color: #99f6e4;
  }

  .board-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 16px;
  }

  .board-header h3 {
    font-size: 1.1rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
  }

  .board-header .date {
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .board-stats {
    display: flex;
    gap: 24px;
    margin-bottom: 16px;
  }

  .board-stats .stat {
    display: flex;
    flex-direction: column;
  }

  .board-stats .value {
    font-size: 1.4rem;
    font-weight: 700;
    color: #0d9488;
  }

  .board-stats .label {
    font-size: 0.72rem;
    color: #94a3b8;
    text-transform: uppercase;
    font-weight: 600;
  }

  .topics-preview {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }

  .topic-tag {
    padding: 4px 10px;
    background: #f0fdfa;
    color: #0d9488;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .topic-more {
    padding: 4px 10px;
    background: #f1f5f9;
    color: #64748b;
    border-radius: 20px;
    font-size: 0.72rem;
    font-weight: 600;
  }

  .board-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 16px;
    border-top: 1px solid #f1f5f9;
    color: #0d9488;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .board-action .arrow {
    transition: transform 0.2s;
  }

  .board-card:hover .board-action .arrow {
    transform: translateX(4px);
  }

  /* Info Section */
  .info-section {
    background: #f8fafc;
    padding: 32px;
    border-radius: 20px;
  }

  .info-section h2 {
    font-size: 1.2rem;
    color: #1e293b;
    margin: 0 0 24px 0;
    text-align: center;
  }

  .info-cards {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
  }

  .info-card {
    text-align: center;
    padding: 24px;
    background: white;
    border-radius: 14px;
    border: 1px solid #e2e8f0;
  }

  .info-icon {
    font-size: 2rem;
    display: block;
    margin-bottom: 12px;
  }

  .info-card h4 {
    font-size: 0.95rem;
    color: #1e293b;
    margin: 0 0 8px 0;
  }

  .info-card p {
    font-size: 0.8rem;
    color: #64748b;
    margin: 0;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .shared-page {
      padding: 20px 16px;
    }

    .filters-bar {
      flex-direction: column;
    }

    .topic-filter {
      width: 100%;
    }

    .boards-grid {
      grid-template-columns: 1fr;
    }
  }
`;
