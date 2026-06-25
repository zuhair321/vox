import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StatusDot from '../void/StatusDot';
import { useUiStore } from '../../stores/uiStore';

interface Props {
  onComplete: () => void;
  username: string;
}

const OnboardingFlow: React.FC<Props> = ({ onComplete, username }) => {
  const [step, setStep] = useState(1);
  const { addToast } = useUiStore();

  const handleNext = () => setStep((s) => Math.min(s + 1, 5));
  const handlePrev = () => setStep((s) => Math.max(s - 1, 1));

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ textAlign: 'center' }}
          >
            <div
              style={{
                fontFamily: "'Cinzel Decorative', cursive",
                fontSize: '24px',
                color: 'var(--ghost-white)',
                marginBottom: '8px',
              }}
            >
              WELCOME TO THE VOID, {username.toUpperCase()}
            </div>
            <div style={{ color: 'var(--ash)', fontSize: '14px', marginBottom: '32px' }}>
              Let's get you set up.
            </div>
            <button className="btn vox-btn-chaos" onClick={handleNext} style={{ width: '100%' }}>
              BEGIN →
            </button>
          </motion.div>
        );
      case 2:
        return (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ textAlign: 'center' }}
          >
            <div
              className="octagon"
              style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 16px',
                border: '2px dashed var(--chaos)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              onClick={() => addToast('Avatar upload available in Profile.', 'info')}
            >
              <span style={{ fontSize: '24px', color: 'var(--chaos)' }}>+</span>
            </div>
            <div style={{ fontSize: '18px', marginBottom: '8px', fontFamily: "'Share Tech Mono', monospace" }}>
              CHOOSE YOUR IDENTITY
            </div>
            <div style={{ color: 'var(--ash)', fontSize: '12px', marginBottom: '32px' }}>
              Upload an image or skip for now.
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn vox-btn-chaos" onClick={handleNext} style={{ flex: 1 }}>
                UPLOAD
              </button>
              <button className="btn vox-btn-outline" onClick={handleNext} style={{ flex: 1 }}>
                SKIP →
              </button>
            </div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: '18px', marginBottom: '24px', fontFamily: "'Share Tech Mono', monospace" }}>
              CHOOSE YOUR STATUS
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '32px' }}>
              {['online', 'idle', 'dnd', 'invisible'].map((s) => (
                <div key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <StatusDot status={s} />
                  <span style={{ fontSize: '11px', color: 'var(--ash)', textTransform: 'capitalize' }}>{s}</span>
                </div>
              ))}
            </div>
            <button className="btn vox-btn-chaos" onClick={handleNext} style={{ width: '100%' }}>
              CONTINUE →
            </button>
          </motion.div>
        );
      case 4:
        return (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              <div style={{ flex: 1, padding: '16px', border: '1px solid var(--rim)', background: 'var(--obsidian)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🏠</div>
                <div style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--ghost-white)' }}>CREATE A REALM</div>
                <button className="btn vox-btn-chaos" onClick={handleNext} style={{ width: '100%' }}>CREATE</button>
              </div>
              <div style={{ flex: 1, padding: '16px', border: '1px solid var(--rim)', background: 'var(--obsidian)' }}>
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔗</div>
                <div style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--ghost-white)' }}>JOIN A REALM</div>
                <button className="btn vox-btn-outline" onClick={handleNext} style={{ width: '100%' }}>JOIN</button>
              </div>
            </div>
            <div
              style={{ fontSize: '12px', color: 'var(--chaos)', cursor: 'pointer' }}
              onClick={handleNext}
            >
              EXPLORE PUBLIC REALMS →
            </div>
          </motion.div>
        );
      case 5:
        return (
          <motion.div
            key="step5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: '24px', marginBottom: '16px', fontFamily: "'Cinzel Decorative', cursive", color: 'var(--chaos)' }}>
              YOU'RE IN THE VOID
            </div>
            <div style={{ color: 'var(--ash)', fontSize: '14px', marginBottom: '32px' }}>
              VOX is ready. The darkness awaits.
            </div>
            <button className="btn vox-btn-chaos" onClick={onComplete} style={{ width: '100%', padding: '12px' }}>
              ENTER →
            </button>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
      }}
    >
      <div
        className="octagon"
        style={{
          width: '440px',
          backgroundColor: 'var(--dark-matter)',
          padding: '40px',
          position: 'relative',
        }}
      >
        <AnimatePresence mode="wait">{renderStep()}</AnimatePresence>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="octagon"
              style={{
                width: '8px',
                height: '8px',
                backgroundColor: i === step ? 'var(--chaos)' : 'var(--rim)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;
