import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Eye, EyeOff, TriangleAlert, ArrowRight } from 'lucide-react';
import voxCoat from '../assets/vox-coat.png';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';

const RegisterPage: React.FC = () => {
  const reduceMotion = useReducedMotion();
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
    } catch (err) {
      const msg = (err as Error).message || 'Registration failed';
      setError(msg);
      addToast(msg, 'error');
    }
  };

  const ready = email.trim().length > 0 && username.trim().length > 0 && password.length > 0;

  // Emblem nod: the coat dips once the card settles, and again on field focus.
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

  return (
    <main className="vox-min-login" aria-label="Create a VOX account">
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

        <p className="vox-min-sub">Create an account. It takes less than a minute.</p>

        <form onSubmit={handleRegister} autoComplete="off" className="vox-min-form" onFocus={tipHat}>
          <div className="vox-min-field">
            <input
              id="vox-min-reg-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="off"
              placeholder="Email"
              aria-label="Email"
            />
          </div>

          <div className="vox-min-field">
            <input
              id="vox-min-reg-username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="off"
              placeholder="Username"
              aria-label="Username"
            />
          </div>

          <div className="vox-min-field">
            <input
              id="vox-min-reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="off"
              placeholder="Password · min 8 characters"
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
            className={`vox-min-submit ${ready ? 'armed' : ''}`}
            disabled={isLoading}
            whileHover={ready && !isLoading ? { y: -1 } : {}}
            whileTap={ready && !isLoading ? { y: 0, scale: 0.99 } : {}}
          >
            {isLoading ? (
              <>
                <span className="vox-min-spinner" aria-hidden="true" />
                <span>Creating account…</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <ArrowRight size={15} className="vox-min-arrow" aria-hidden="true" />
              </>
            )}
          </motion.button>
        </form>

        <div className="vox-min-alt">
          Already have an account?{' '}
          <button type="button" onClick={() => navigate('/login')}>
            Sign in
          </button>
        </div>
      </motion.div>

      <p className="vox-min-foot">End-to-end encrypted · No logs · Yours alone</p>
    </main>
  );
};

export default RegisterPage;
