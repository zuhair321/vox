import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, Zap, User, Mail, Eye, EyeOff } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { register, isLoading } = useAuthStore();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      const msg = 'Please enter a valid email address';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    if (username.length < 3) {
      const msg = 'Username must be at least 3 characters';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    if (password.length < 8) {
      const msg = 'Password must be at least 8 characters';
      setError(msg);
      addToast(msg, 'error');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      const msg = 'Username: letters, numbers, underscores only';
      setError(msg);
      addToast(msg, 'error');
      return;
    }

    try {
      await register(email.trim(), username.trim(), password);
      addToast('Account created. Welcome to the void.', 'success');
      sessionStorage.setItem('vox_just_registered', '1');
      navigate('/');
    } catch (err: any) {
      const msg = err.message || 'Registration failed';
      setError(msg);
      addToast(msg, 'error');
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
        <form onSubmit={handleRegister} className="vox-login-card" autoComplete="off">
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
                autoComplete="off"
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
                autoComplete="off"
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="off"
                placeholder="min 8 characters"
              />
              <button
                type="button"
                className="vox-login-eye"
                onClick={() => setShowPassword(v => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="vox-login-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="vox-login-submit" disabled={isLoading}>
            <LogIn size={16} aria-hidden="true" />
            <span>{isLoading ? 'CREATING...' : 'JOIN THE VOID'}</span>
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
