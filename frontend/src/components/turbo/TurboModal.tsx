import { useState, useEffect } from 'react';
import { useUiStore } from '../../stores/uiStore';
import { getTurboStatus, getTurboFeatures, enableTurbo, disableTurbo } from '../../api/turbo';
import './TurboModal.css';

export function TurboModal() {
  const { showTurboModal, setShowTurboModal } = useUiStore();
  const [turboStatus, setTurboStatus] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (showTurboModal) {
      loadTurboData();
    }
  }, [showTurboModal]);

  async function loadTurboData() {
    try {
      setLoading(true);
      setError(null);
      
      const [status, featuresData] = await Promise.all([
        getTurboStatus(),
        getTurboFeatures()
      ]);
      
      setTurboStatus(status);
      setFeatures(featuresData.features);
    } catch (err) {
      setError('Failed to load Turbo information');
      console.error('Error loading Turbo data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleTurbo() {
    try {
      if (turboStatus?.hasTurbo) {
        await disableTurbo();
        setTurboStatus({ ...turboStatus, hasTurbo: false, features: [] });
      } else {
        const status = await enableTurbo();
        setTurboStatus(status);
      }
    } catch (err) {
      setError('Failed to update Turbo status');
      console.error('Error toggling Turbo:', err);
    }
  }

  if (!showTurboModal) return null;

  return (
    <div className="modal-overlay" onClick={() => setShowTurboModal(false)}>
      <div className="turbo-modal" onClick={(e) => e.stopPropagation()}>
        <div className="turbo-header">
          <h2 className="turbo-title">
            <span className="turbo-icon">⚡</span> VOX Turbo
          </h2>
          <button 
            className="close-button" 
            onClick={() => setShowTurboModal(false)}
          >
            ×
          </button>
        </div>

        <div className="turbo-content">
          {loading ? (
            <div className="loading-spinner">Loading...</div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <>
              <div className="turbo-status">
                <div className={`status-indicator ${turboStatus?.hasTurbo ? 'active' : 'inactive'}`}>
                  {turboStatus?.hasTurbo ? '⚡ Turbo Enabled' : '⚡ Turbo Disabled'}
                </div>
                {turboStatus?.turboSince && (
                  <p className="turbo-since">
                    Turbo since: {new Date(turboStatus.turboSince).toLocaleDateString()}
                  </p>
                )}
              </div>

              <div className="turbo-description">
                <p>VOX Turbo gives you access to premium features that enhance your experience.</p>
                <p><strong>Everyone has Turbo by default!</strong> Enjoy all the benefits.</p>
              </div>

              <div className="turbo-features">
                <h3>Turbo Features</h3>
                <div className="features-grid">
                  {features.map((feature) => (
                    <div key={feature.id} className="feature-card">
                      <div className="feature-icon">{feature.icon}</div>
                      <div className="feature-info">
                        <h4>{feature.name}</h4>
                        <p>{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="turbo-actions">
                <button 
                  className={`turbo-button ${turboStatus?.hasTurbo ? 'disable' : 'enable'}`}
                  onClick={handleToggleTurbo}
                >
                  {turboStatus?.hasTurbo ? 'Disable Turbo' : 'Enable Turbo'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
