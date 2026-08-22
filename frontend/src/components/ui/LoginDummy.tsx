import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, TriangleAlert, KeyRound, ArrowRight } from 'lucide-react';
import voxCoat from '../../assets/vox-coat.png';
import { useUiStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';

const LoginDummy: React.FC = () => {
  const reduceMotion = useReducedMotion();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const { login, isLoading } = useAuthStore();

  const identitySet = emailOrUsername.trim().length > 0;
  const passwordSet = password.length > 0;
  const formReady = identitySet && passwordSet;

  // Emblem nod: the coat dips once the card settles, and again on field focus.
  // The mark is remounted via `key`, which replays the tip keyframes.
  const [hatTip, setHatTip] = useState(0);
  const lastTipAt = useRef(0);

  const tipHat = () => {
    const now = Date.now();
    if (now - lastTipAt.current > 1200) {
      lastTipAt.current = now;
      setHatTip(k => k + 1);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      lastTipAt.current = Date.now();
      setHatTip(k => k + 1);
    }, 420);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await login(emailOrUsername.trim(), password, rememberMe);
      if (result.twoFactorRequired) {
        sessionStorage.setItem('vox_remember_me_2fa', rememberMe ? '1' : '0');
        navigate('/2fa');
        return;
      }
      addToast('Welcome back.', 'success');
      navigate('/');
    } catch (err) {
      setError(humanizeLoginError(err));
    }
  };
  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google');
      const data = await res.json();
      if (data.url) { window.location.href = data.url; }
      else if (data.error) { setError(data.error); }
    } catch { setError('Could not connect to Google OAuth.'); }
  };


  // Translate raw backend error strings ("Invalid input.", "Please enter a
  // valid email address", etc.) and network failures ("Failed to fetch",
  // "Network error: ...") into a short, friendly message the user can act on.
  function humanizeLoginError(err: unknown): string {
    const raw = (err instanceof Error ? err.message : String(err)) || '';
    const lower = raw.toLowerCase();
    if (lower.includes('failed to fetch') || lower.startsWith('network error')) {
      return 'Can\u2019t reach the VOX service. Check your connection or restart the app.';
    }
    if (lower.includes('invalid email') || lower.includes('please enter a valid email')) {
      return 'That doesn\u2019t look like a valid email address.';
    }
    if (lower.includes('invalid username') || lower.includes('username must be')) {
      return 'Username must be 3\u201332 characters: letters, numbers, or underscore.';
    }
    if (lower.includes('password must be') || lower.includes('password is too')) {
      return 'Password must be at least 8 characters.';
    }
    if (lower.includes('invalid credentials') || lower.includes('incorrect') || lower.includes('invalid password') || lower.includes('user not found')) {
      return 'Username or password is incorrect.';
    }
    if (lower.includes('locked')) {
      return 'Too many failed attempts. Try again in a few minutes.';
    }
    if (lower.includes('already taken') || lower.includes('already registered')) {
      return 'That account already exists. Try signing in instead.';
    }
    if (raw.length === 0) return 'Login failed. Please try again.';
    // Surface unknown errors verbatim — the backend usually sends something
    // sensible and we'd rather show it than hide a real auth failure.
    return raw;
  }

  return (
    <main className="vox-min-login" aria-label="Sign in to VOX">
      <div className="vox-min-glow" aria-hidden="true" />

      <motion.div
        className="vox-min-card"
        initial={reduceMotion ? false : { opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="vox-min-brand">
          <motion.span
            key={hatTip}
            className="vox-min-mark"
            aria-hidden="true"
            style={{ transformOrigin: '50% 95%' }}
            initial={reduceMotion ? undefined : { rotate: 0 }}
            animate={reduceMotion ? { rotate: 0 } : { rotate: [0, -14, -14, 0] }}
            transition={{ duration: 0.85, times: [0, 0.22, 0.78, 1], ease: 'easeInOut' }}
          >
            <img src={voxCoat} alt="" aria-hidden="true" className="vox-min-emblem" draggable={false} />
          </motion.span>
          <h1>VOX</h1>
        </div>

        <p className="vox-min-sub">Private messaging for people who keep their own counsel.</p>

        <form onSubmit={handleLogin} autoComplete="off" className="vox-min-form" onFocus={tipHat}>
          {/* Hidden dummy fields to defeat browser autofill detection */}
          <input type="text" name="fakeuser" autoComplete="username" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} tabIndex={-1} aria-hidden="true" />
          <input type="password" name="fakepass" autoComplete="current-password" style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', height: 0, width: 0 }} tabIndex={-1} aria-hidden="true" />

          <div className="vox-min-field">
            <input
              id="vox-min-identity"
              value={emailOrUsername}
              onChange={e => { setEmailOrUsername(e.target.value); if (error) setError(''); }}
              required
              autoComplete="off"
              placeholder="Email or username"
              aria-label="Email or username"
            />
          </div>

          <div className="vox-min-field">
            <input
              id="vox-min-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
              onKeyUp={e => setCapsLock(e.getModifierState('CapsLock'))}
              onBlur={() => setCapsLock(false)}
              required
              autoComplete="off"
              placeholder="Password"
              aria-label="Password"
            />
            <button
              type="button"
              className="vox-min-eye"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
            >
              {showPassword ? <Eye size={16} aria-hidden="true" /> : <EyeOff size={16} aria-hidden="true" />}
            </button>
          </div>

          <AnimatePresence>
            {capsLock && (
              <motion.div
                className="vox-min-hint"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <KeyRound size={12} aria-hidden="true" /> Caps Lock is on
              </motion.div>
            )}
          </AnimatePresence>

          <div className="vox-min-row">
            <label className="vox-min-remember">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={e => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>
            <button
              type="button"
              className="vox-min-forgot"
              onClick={() => addToast('Contact your administrator to reset your passcode.', 'info')}
            >
              Forgot passcode
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                className="vox-min-error"
                role="alert"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
              >
                <TriangleAlert size={14} aria-hidden="true" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            type="submit"
            className={`vox-min-submit ${formReady ? 'armed' : ''}`}
            disabled={isLoading}
            whileHover={formReady && !isLoading ? { y: -1 } : {}}
            whileTap={formReady && !isLoading ? { y: 0, scale: 0.99 } : {}}
          >
            {isLoading ? (
              <>
                <span className="vox-min-spinner" aria-hidden="true" />
                <span>Signing in…</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight size={15} className="vox-min-arrow" aria-hidden="true" />
              </>
            )}
          </motion.button>
          <div style={{ display:'flex',alignItems:'center',gap:'12px',margin:'16px 0 8px',opacity:0.5 }}>
            <div style={{ flex:1,height:'1px',background:'var(--border-hairline,#2a2730)' }} />
            <span style={{ fontSize:'11px',fontFamily:'var(--font-mono,monospace)',color:'var(--text-faint,#5a5660)',textTransform:'uppercase',letterSpacing:'0.1em' }}>or</span>
            <div style={{ flex:1,height:'1px',background:'var(--border-hairline,#2a2730)' }} />
          </div>
          <button type="button" onClick={handleGoogleLogin} className="vox-min-submit" style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:'10px',background:'var(--bg-elevated,#1c1a20)',border:'1px solid var(--border-hairline,#2a2730)',color:'var(--text-primary,#e9e4d8)',marginTop:'4px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

        </form>

        <div className="vox-min-alt">
          New to VOX?{' '}
          <button type="button" onClick={() => navigate('/register')}>
            Create an account
          </button>
        </div>
      </motion.div>

      <p className="vox-min-foot">End-to-end encrypted · No logs · Yours alone</p>
    </main>
  );
};

export default LoginDummy;
