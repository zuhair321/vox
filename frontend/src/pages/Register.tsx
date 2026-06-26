import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, Zap, User, Mail } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { API_BASE } from '../api/client';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Frontend validation
    if (username.length < 3) {
      addToast('Username must be at least 3 characters', 'error');
      setIsSubmitting(false);
      return;
    }
    if (password.length < 5) {
      addToast('Password must be at least 5 characters', 'error');
      setIsSubmitting(false);
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      addToast('Username: letters, numbers, underscores only', 'error');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');

      localStorage.setItem('vox_token', data.tokens.access);
      localStorage.setItem('vox_refresh_token', data.tokens.refresh);
      localStorage.setItem('vox_user', JSON.stringify(data.user));
      addToast('Account created. Welcome to the void.', 'success');
      navigate('/friends');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="vox-login" aria-label="VOX register">
      <div className="vox-login-scanlines" aria-hidden="true" />
      <div className="vox-login-fog" aria-hidden="true" />

      <div className="vox-login-embers" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="ember" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      <div className="vox-login-watermark" aria-hidden="true">VOX</div>

      <div className="vox-login-orb" aria-hidden="true">
        <div className="vox-login-ring ring-outer" />
        <div className="vox-login-ring ring-inner" />
        <div className="vox-login-ring ring-sigil" />
      </div>

      <section className="vox-login-stage">
        <form onSubmit={handleRegister} className="vox-login-card">
          <span className="vox-login-border-glow" aria-hidden="true" />

          <span className="vox-login-corner corner-tl" aria-hidden="true" />
          <span className="vox-login-corner corner-tr" aria-hidden="true" />
          <span className="vox-login-corner corner-bl" aria-hidden="true" />
          <span className="vox-login-corner corner-br" aria-hidden="true" />

          <header className="vox-login-header">
            <p className="vox-login-subtitle">† INITIATE PROTOCOL †</p>
            <h1 className="glitch-text" data-text="VOX">VOX</h1>
            <strong>CREATE YOUR IDENTITY</strong>
            <div className="vox-login-ornament" aria-hidden="true">
              <span />
              <span className="cross">✦</span>
              <span />
            </div>
          </header>

          <div className="vox-login-divider" aria-hidden="true">
            <span className="divider-diamond" />
          </div>

          <div className="vox-login-field">
            <label htmlFor="vox-reg-email">EMAIL</label>
            <div className="vox-login-input-wrap">
              <Mail size={16} aria-hidden="true" />
              <input
                id="vox-reg-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="operative@vox"
              />
            </div>
          </div>

          <div className="vox-login-field">
            <label htmlFor="vox-reg-username">IDENTITY</label>
            <div className="vox-login-input-wrap">
              <User size={16} aria-hidden="true" />
              <input
                id="vox-reg-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoComplete="username"
                placeholder="operative_name"
              />
            </div>
          </div>

          <div className="vox-login-field">
            <label htmlFor="vox-reg-password">PASSKEY</label>
            <div className="vox-login-input-wrap">
              <Zap size={16} aria-hidden="true" />
              <input
                id="vox-reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="min 8 characters"
              />
            </div>
          </div>

          <button type="submit" className="vox-login-submit" disabled={isSubmitting}>
            <LogIn size={16} aria-hidden="true" />
            <span>{isSubmitting ? 'CREATING...' : 'JOIN THE VOID'}</span>
          </button>

          <footer className="vox-login-footer">
            <span>END-TO-END</span>
            <span>† VOXLINK †</span>
            <span>SECURE</span>
          </footer>
        </form>

        <p className="vox-login-register">
          Already an operative?{' '}
          <button type="button" onClick={() => navigate('/login')} style={{ background: 'none', border: 'none', color: 'var(--chaos)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>
            <strong>ENTER</strong>
          </button>
        </p>
      </section>
    </main>
  );
};

export default RegisterPage;
