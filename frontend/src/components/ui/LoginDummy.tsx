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
