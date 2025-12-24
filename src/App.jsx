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
    const { data, error } = await supabase
      .from('questions')
      .select('*')
    
    if (error) {
      console.error('Error fetching questions:', error)
    } else {
      // We found the questions! Now let's try to RUN the generators
      const processedQuestions = data.map(q => {
        // If there is no code, just return the placeholder
        if (!q.generator_code) return { ...q, generated: null };

        try {
          // This creates a function from the string in your database and runs it
          const generator = new Function(q.generator_code);
          const result = generator();
          return { ...q, generated: result }; // Attach the real question/answer
        } catch (err) {
          console.error("Generator failed for:", q.skill_name, err);
          return { ...q, generated: { q: "Error generating", a: "Error" } };
        }
      });
      setQuestions(processedQuestions)
    }
    setLoading(false)
  }

  if (loading) return <h1>Loading your Revision Board...</h1>

  return (
    <div className="board-container">
      <h1>Revision Board Live Test</h1>
      
      <div className="card-grid">
        {questions.map((q) => (
          <div key={q.id} className="question-card">
            <span className="badge">{q.difficulty}</span>
            <h3>{q.topic}</h3>
            
            {/* If we have a generated question, show it! Otherwise show the skill name */}
            {q.generated ? (
              <div className="generated-content">
                <p className="math-question">{q.generated.q}</p>
                <p className="math-answer">Answer: {q.generated.a}</p>
              </div>
            ) : (
              <p className="placeholder-text">{q.skill_name} (No generator yet)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
