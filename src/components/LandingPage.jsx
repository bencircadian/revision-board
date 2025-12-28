import { useState } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function LandingPage({ onLoginSuccess }) {
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState(''); // NEW
  const [role, setRole] = useState('Teacher');  // NEW
  const [message, setMessage] = useState('');

  const handleSocialLogin = async (provider) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) setMessage(error.message);
    setLoading(false);
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (isSignUp) {
      // REGISTER: Pass metadata here!
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
      // App.jsx detects the session change automatically
    }
    setLoading(false);
  };

  return (
    <div className="landing-container">
      <div className="landing-left">
        <div className="brand-badge">🧬 DNA Learning</div>
        <h1>Master Maths with <br/> <span className="highlight">Infinite Practice</span></h1>
        <p className="subtitle">The intelligent question generator...</p>
      </div>

      <div className="landing-right">
        <div className="auth-card">
          <h2>{isSignUp ? "Create Account" : "Welcome Back"}</h2>
          <p className="auth-sub">Sign in to access your classes.</p>

          <button className="btn-google" onClick={() => handleSocialLogin('google')} disabled={loading}>
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" width="20" />
            Continue with Google
          </button>

          <div className="divider"><span>Or continue with email</span></div>

          <form onSubmit={handleEmailAuth}>
            {/* NEW: Extra fields only show on Sign Up */}
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
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="Teacher">Teacher</option>
                    <option value="Student">Student</option>
                  </select>
                </div>
              </>
            )}

            <div className="input-group">
              <label>Email Address</label>
              <input type="email" required placeholder="you@school.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Password</label>
              <input type="password" required placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {message && <div className="auth-message">{message}</div>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Processing..." : (isSignUp ? "Sign Up" : "Log In")}
            </button>
          </form>

          <p className="toggle-auth">
            {isSignUp ? "Already have an account?" : "No account yet?"}{" "}
            <button onClick={() => setIsSignUp(!isSignUp)}>{isSignUp ? "Log in" : "Sign up"}</button>
          </p>
        </div>
      </div>
      <style>{landingStyles}</style>
    </div>
  );
}

const landingStyles = `
  /* Use your existing styles, just add select styling */
  .landing-container { display: flex; min-height: 100vh; background: #f8fafc; font-family: sans-serif; }
  .landing-left { flex: 1; padding: 60px; background: white; border-right: 1px solid #e2e8f0; }
  .landing-right { flex: 1; display: flex; align-items: center; justify-content: center; background: #f1f5f9; }
  .auth-card { background: white; padding: 40px; border-radius: 16px; width: 100%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
  .input-group { margin-bottom: 16px; }
  .input-group label { display: block; margin-bottom: 6px; font-weight: 600; font-size: 0.9rem; color: #334155; }
  .input-group input, .input-group select { width: 100%; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 1rem; background: white; }
  .btn-primary { width: 100%; padding: 12px; background: #0d9488; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 8px; }
  .btn-google { width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; background: white; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer; }
  .divider { text-align: center; margin: 24px 0; border-bottom: 1px solid #e2e8f0; line-height: 0.1em; }
  .divider span { background: #fff; padding: 0 10px; color: #94a3b8; font-size: 0.85rem; }
  .toggle-auth { text-align: center; margin-top: 24px; color: #64748b; }
  .toggle-auth button { background: none; border: none; color: #0d9488; font-weight: 600; cursor: pointer; text-decoration: underline; }
  .brand-badge { display: inline-block; background: #f0fdfa; color: #0d9488; padding: 6px 12px; border-radius: 20px; font-weight: 700; margin-bottom: 24px; }
  h1 { font-size: 3rem; margin-bottom: 20px; }
  .highlight { color: #0d9488; }
`;
