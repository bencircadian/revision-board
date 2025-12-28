import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Icon } from './Icons';

export default function AccountSettings() {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('Teacher');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    getProfile();
  }, []);

  const getProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email);
      // Supabase stores extra data in user_metadata
      setFullName(user.user_metadata?.full_name || '');
      setRole(user.user_metadata?.role || 'Teacher');
    }
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg({ text: '', type: '' });

    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, role: role }
    });

    if (error) {
      setMsg({ text: error.message, type: 'error' });
    } else {
      setMsg({ text: 'Profile updated successfully!', type: 'success' });
      // Force reload to update sidebar immediately (optional but easiest)
      window.location.reload(); 
    }
    setLoading(false);
  };

  return (
    <div className="account-page">
      <div className="settings-card">
        <div className="settings-header">
          <div className="icon-bg"><Icon name="users" size={24} /></div>
          <h2>My Account</h2>
        </div>

        <form onSubmit={updateProfile}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="text" value={email} disabled className="disabled-input" />
            <small>Email cannot be changed via this form.</small>
          </div>

          <div className="form-group">
            <label>Display Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="e.g. Mr. Thompson" 
            />
          </div>

          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="Teacher">Teacher</option>
              <option value="Student">Student</option>
              <option value="Administrator">Administrator</option>
            </select>
          </div>

          {msg.text && (
            <div className={`msg-box ${msg.type}`}>{msg.text}</div>
          )}

          <button type="submit" className="save-btn" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>
      
      <style>{`
        .account-page { padding: 40px; display: flex; justify-content: center; }
        .settings-card { background: white; padding: 40px; border-radius: 16px; width: 100%; max-width: 500px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
        .settings-header { display: flex; align-items: center; gap: 16px; margin-bottom: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
        .icon-bg { width: 48px; height: 48px; background: #f0fdfa; color: #0d9488; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        h2 { margin: 0; color: #1e293b; }
        .form-group { margin-bottom: 20px; }
        .form-group label { display: block; font-weight: 600; color: #64748b; margin-bottom: 8px; font-size: 0.9rem; }
        .form-group input, .form-group select { width: 100%; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 1rem; box-sizing: border-box; }
        .disabled-input { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }
        .save-btn { background: #0f172a; color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; margin-top: 10px; }
        .save-btn:hover { background: #1e293b; }
        .msg-box { padding: 12px; border-radius: 8px; margin-bottom: 20px; font-size: 0.9rem; }
        .msg-box.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
        .msg-box.error { background: #fef2f2; color: #ef4444; border: 1px solid #fecaca; }
        small { color: #94a3b8; font-size: 0.8rem; margin-top: 4px; display: block; }
      `}</style>
    </div>
  );
}
