import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Shield, Zap } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

const LoginDummy: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { login, isLoading } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await login(email.trim(), password);
      if (result.twoFactorRequired) {
        navigate('/2fa');
        return;
      }
      addToast('Welcome back.', 'success');
      navigate('/');
    } catch (err: any) {
      addToast(err.message || 'Login failed', 'error');
    }
  };

  return (
    <main className="vox-login" aria-label="VOX login">
      {/* ── atmospheric layers ── */}
      <div className="vox-login-scanlines" aria-hidden="true" />
      <div className="vox-login-fog" aria-hidden="true" />

      {/* ── floating ember particles ── */}
      <div className="vox-login-embers" aria-hidden="true">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="ember" style={{ '--i': i } as React.CSSProperties} />
        ))}
      </div>

      {/* ── watermark ── */}
      <div className="vox-login-watermark" aria-hidden="true">VOX</div>

      {/* ── pentagram sigil ring ── */}
      <div className="vox-login-orb" aria-hidden="true">
        <div className="vox-login-ring ring-outer" />
        <div className="vox-login-ring ring-inner" />
        <div className="vox-login-ring ring-sigil" />
      </div>

      <section className="vox-login-stage">
        <form onSubmit={handleLogin} className="vox-login-card" autoComplete="off">
          {/* Hidden dummy fields to defeat browser autofill detection */}
          <input type="text" name="fakeuser" autoComplete="username" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} tabIndex={-1} aria-hidden="true" />
          <input type="password" name="fakepass" autoComplete="current-password" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} tabIndex={-1} aria-hidden="true" />
          {/* animated border glow */}
          <span className="vox-login-border-glow" aria-hidden="true" />

          {/* corner ornaments */}
          <span className="vox-login-corner corner-tl" aria-hidden="true" />
          <span className="vox-login-corner corner-tr" aria-hidden="true" />
          <span className="vox-login-corner corner-bl" aria-hidden="true" />
          <span className="vox-login-corner corner-br" aria-hidden="true" />

          <header className="vox-login-header">
            <p className="vox-login-subtitle">† SECURE ACCESS †</p>
            <h1 className="glitch-text" data-text="VOX">VOX</h1>
            <strong>ENCRYPTED COMMS PROTOCOL</strong>
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
            <label htmlFor="vox-login-email">IDENTITY</label>
            <div className="vox-login-input-wrap">
              <Shield size={16} aria-hidden="true" />
              <input
                id="vox-login-email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="off"
                placeholder="founder@vox"
              />
            </div>
          </div>

          <div className="vox-login-field">
            <label htmlFor="vox-login-password">PASSKEY</label>
            <div className="vox-login-input-wrap">
              <Zap size={16} aria-hidden="true" />
              <input
                id="vox-login-password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="off"
                placeholder="enter passcode"
              />
            </div>
          </div>

          <button type="submit" className="vox-login-submit" disabled={isLoading}>
            <LogIn size={16} aria-hidden="true" />
            <span>{isLoading ? 'AUTHENTICATING…' : 'ENTER THE VOID'}</span>
          </button>

          <footer className="vox-login-footer">
            <span>END-TO-END</span>
            <span>† VOXLINK †</span>
            <span>SECURE</span>
          </footer>
        </form>

        <p className="vox-login-register">
          No account?{' '}
          <button type="button" onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: 'var(--chaos)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', textDecoration: 'underline' }}>
            <strong>REGISTER</strong>
          </button>
        </p>
      </section>
    </main>
  );
};

export default LoginDummy;
