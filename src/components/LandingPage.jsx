import { useState } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function LandingPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // New User Metadata State
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Teacher');
  
  const [message, setMessage] = useState('');

  // 1. Social Login Handler
  const handleSocialLogin = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  // 2. Email/Password Handler
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      // REGISTER: Pass extra metadata (Name/Role) here
      const { error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      });
      
      if (error) setMessage(error.message);
      else setMessage("Check your email for the confirmation link!");
      
    } else {
      // LOGIN
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMessage(error.message);
      else if (onLoginSuccess) onLoginSuccess();
    }
    setLoading(false);
  };

  return (
    <div className="landing-container">
      {/* LEFT SIDE: Marketing / Value Prop */}
      <div className="landing-left">
        <div className="brand-badge">🧬 DNA Learning</div>
        <h1>Master Maths with <br/> <span className="highlight">Infinite Practice</span></h1>
        <p className="subtitle">
          The intelligent question generator that adapts to your students. 
          Never run out of practice material again.
        </p>

        <div className="feature-list">
          <div className="feature-item">
            <div className="f-icon"><Icon name="refresh" size={20}/></div>
            <div>
              <h3>Infinite Questions</h3>
              <p>One click regenerates numbers and diagrams. Zero duplicates.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="f-icon"><Icon name="chart" size={20}/></div>
            <div>
              <h3>Spaced Repetition</h3>
              <p>Smart algorithms bring back past topics right when they're fading.</p>
            </div>
          </div>
          <div className="feature-item">
            <div className="f-icon"><Icon name="check" size={20}/></div>
            <div>
              <h3>Instant Feedback</h3>
              <p>Full worked solutions and step-by-step breakdowns for every problem.</p>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Auth Card */}
      <div className="landing-right">
        <div className="auth-card">
          <h2>{isSignUp ? "Create an Account" : "Welcome Back"}</h2>
          <p className="auth-sub">Sign in to access your classes and boards.</p>

          {/* Social Login Section */}
          <button 
            className="btn-google" 
            onClick={() => handleSocialLogin('google')}
            disabled={loading}
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
            Continue with Google
          </button>

          <div className="divider"><span>Or continue with email</span></div>

          {/* Email Form */}
          <form onSubmit={handleEmailAuth}>
            
            {/* NEW FIELDS: Only show during Sign Up */}
            {isSignUp && (
              <>
                <div className="input-group">
                  <label>Full Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Mr. Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>I am a...</label>
                  <select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    className="role-select"
                  >
                    <option value="Teacher">Teacher</option>
                    <option value="Student">Student</option>
                    <option value="Administrator">Administrator</option>
                  </select>
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input 
                type="email" 
                required 
                placeholder="you@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input 
                type="password" 
                required 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {message && <div className="auth-message">{message}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Log In")}
            </button>
          </form>

          <p className="toggle-auth">
            {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? "Log in" : "Sign up"}
            </button>
          </p>
        </div>
      </div>
      
      <style>{landingStyles}</style>
    </div>
  );
}

const landingStyles = `
  .landing-container {
    display: flex;
    min-height: 100vh;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #f8fafc;
  }

  /* LEFT SIDE */
  .landing-left {
    flex: 1;
    background: white;
    padding: 80px 60px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border-right: 1px solid #e2e8f0;
  }

  .brand-badge {
    display: inline-block;
    background: #f0fdfa;
    color: #0d9488;
    padding: 6px 12px;
    border-radius: 20px;
    font-weight: 700;
    font-size: 0.9rem;
    margin-bottom: 24px;
    align-self: flex-start;
  }

  .landing-left h1 {
    font-size: 3.5rem;
    line-height: 1.1;
    color: #0f172a;
    margin-bottom: 24px;
    font-weight: 800;
  }
  .highlight { color: #0d9488; }
  
  .subtitle {
    font-size: 1.2rem;
    color: #64748b;
    line-height: 1.6;
    max-width: 500px;
    margin-bottom: 48px;
  }

  .feature-list { display: flex; flex-direction: column; gap: 32px; }
  .feature-item { display: flex; gap: 16px; align-items: flex-start; }
  .f-icon {
    width: 40px; height: 40px;
    background: #f0fdfa; color: #0d9488;
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .feature-item h3 { margin: 0 0 4px 0; font-size: 1.1rem; color: #1e293b; }
  .feature-item p { margin: 0; color: #64748b; font-size: 0.95rem; }

  /* RIGHT SIDE */
  .landing-right {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f1f5f9;
    padding: 40px;
  }

  .auth-card {
    background: white;
    padding: 40px;
    border-radius: 16px;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.08);
  }

  .auth-card h2 { margin: 0 0 8px 0; font-size: 1.8rem; color: #1e293b; text-align: center; }
  .auth-sub { color: #64748b; text-align: center; margin-bottom: 32px; font-size: 0.95rem; }

  .btn-google {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: white;
    border: 1px solid #e2e8f0;
    padding: 12px;
    border-radius: 8px;
    font-weight: 600;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
  }
  .btn-google:hover { background: #f8fafc; border-color: #cbd5e1; }

  .divider {
    text-align: center;
    margin: 24px 0;
    border-bottom: 1px solid #e2e8f0;
    line-height: 0.1em;
  }
  .divider span { background: #fff; padding: 0 10px; color: #94a3b8; font-size: 0.85rem; }

  .input-group { margin-bottom: 16px; }
  .input-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9rem; color: #334155; }
  
  .input-group input, 
  .role-select {
    width: 100%;
    padding: 12px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box;
    transition: border 0.2s;
    background: white; /* Ensure select has white background */
  }
  
  .input-group input:focus, 
  .role-select:focus { 
    border-color: #0d9488; 
    outline: none; 
  }

  .btn-primary {
    width: 100%;
    padding: 12px;
    background: #0d9488;
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 600;
    font-size: 1rem;
    cursor: pointer;
    margin-top: 8px;
    transition: background 0.2s;
  }
  .btn-primary:hover { background: #0f766e; }

  .auth-message {
    background: #fef2f2;
    color: #ef4444;
    padding: 10px;
    border-radius: 6px;
    font-size: 0.9rem;
    margin-bottom: 16px;
    text-align: center;
  }

  .toggle-auth { text-align: center; margin-top: 24px; font-size: 0.9rem; color: #64748b; }
  .toggle-auth button { background: none; border: none; color: #0d9488; font-weight: 600; cursor: pointer; text-decoration: underline; }

  @media (max-width: 900px) {
    .landing-container { flex-direction: column; }
    .landing-left { padding: 40px 24px; border-right: none; border-bottom: 1px solid #e2e8f0; }
    .landing-left h1 { font-size: 2.5rem; }
    .landing-right { padding: 40px 24px; }
  }
`;
