import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

const TwoFactorPage: React.FC = () => {
  const [code, setCode] = useState('');
  const [rememberMe, setRememberMe] = useState(() => sessionStorage.getItem('vox_remember_me_2fa') === '1');
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { completeTwoFactor, isLoading } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await completeTwoFactor(code, rememberMe);
      sessionStorage.removeItem('vox_remember_me_2fa');
      addToast('Welcome back.', 'success');
      navigate('/');
    } catch (err: any) {
      addToast(err.message || '2FA verification failed', 'error');
    }
  };

  return (
    <main className="vox-login" aria-label="VOX two-factor authentication">
      <div className="vox-login-scanlines" aria-hidden="true" />
      <div className="vox-login-fog" aria-hidden="true" />
      <div className="vox-login-watermark" aria-hidden="true">VOX</div>
      <div className="vox-login-orb" aria-hidden="true">
        <div className="vox-login-ring ring-outer" />
        <div className="vox-login-ring ring-inner" />
        <div className="vox-login-ring ring-sigil" />
      </div>

      <section className="vox-login-stage">
        <form onSubmit={handleSubmit} className="vox-login-card" autoComplete="off">
          <span className="vox-login-border-glow" aria-hidden="true" />
          <span className="vox-login-corner corner-tl" aria-hidden="true" />
          <span className="vox-login-corner corner-tr" aria-hidden="true" />
          <span className="vox-login-corner corner-bl" aria-hidden="true" />
          <span className="vox-login-corner corner-br" aria-hidden="true" />

          <header className="vox-login-header">
            <p className="vox-login-subtitle">† TWO-FACTOR AUTH †</p>
            <h1 className="glitch-text" data-text="VOX">VOX</h1>
            <strong>ENTER YOUR CODE</strong>
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
            <label htmlFor="vox-2fa-code">AUTH CODE</label>
            <div className="vox-login-input-wrap">
              <Shield size={16} aria-hidden="true" />
              <input
                id="vox-2fa-code"
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                autoComplete="off"
                placeholder="123456"
                maxLength={8}
              />
            </div>
          </div>

          <div className="vox-login-remember">
            <input
              type="checkbox"
              id="vox-remember-me-2fa"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
            />
            <label htmlFor="vox-remember-me-2fa">Remember me</label>
          </div>

          <button type="submit" className="vox-login-submit" disabled={isLoading}>
            <span>{isLoading ? 'VERIFYING…' : 'VERIFY'}</span>
          </button>
        </form>
      </section>
    </main>
  );
};

export default TwoFactorPage;
