import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import './App.css'

function App() {
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchQuestions()
  }, [])

  async function fetchQuestions() {
    // This asks Supabase for all rows in the 'questions' table
    const { data, error } = await supabase
      .from('questions')
      .select('*')
    
    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      setQuestions(data)
    }
    setLoading(false)
  }

  if (loading) return <h1>Loading your Revision Board...</h1>

  return (
    <div className="board-container">
      <h1>Revision Board Database Test</h1>
      <p>We found {questions.length} questions in your database.</p>
      
      <div className="card-grid">
        {questions.map((q) => (
          <div key={q.id} className="question-card">
            <h3>{q.domain}</h3>
            <h4>{q.topic}</h4>
            <p>{q.skill_name}</p>
            <span className="badge">{q.difficulty}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
