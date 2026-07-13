import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLandmark, faIdCard, faLock, faEye, faEyeSlash,
  faArrowRight, faShieldHalved, faServer, faUsers
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { login } from '../services/api';

export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login: authLogin } = useAuth();

  const [formData, setFormData]           = useState({ matricule: '', password: '' });
  const [showPassword, setShowPassword]   = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const successMessage = location.state?.message;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await login(formData);
      authLogin(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Matricule ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const C = {
    bg:        '#f7fafc',
    primary:   '#002045',
    secondary: '#1960a3',
    border:    '#c4c6cf',
    surface:   '#ffffff',
    textMain:  '#181c1e',
    textSub:   '#43474e',
    textMuted: '#74777f',
    error:     '#ba1a1a',
    errorBg:   '#ffdad6',
  };

  const inputStyle = {
    width: '100%', padding: '13px 16px 13px 44px',
    background: '#fff', border: `1px solid ${C.border}`,
    borderRadius: '4px', color: C.textMain,
    fontSize: '15px', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const stats = [
    { icon: faUsers,        value: '3',    label: 'Rôles académiques'  },
    { icon: faServer,       value: '100%', label: 'Hébergé localement' },
    { icon: faShieldHalved, value: 'TLS',  label: 'Connexion sécurisée'},
  ];

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column'
    }}>

      <main style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '32px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: '440px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '72px', height: '72px',
              background: '#fff', border: `1px solid ${C.border}`,
              borderRadius: '12px', marginBottom: '16px',
              boxShadow: '0 4px 16px rgba(0,32,69,0.08)'
            }}>
              <FontAwesomeIcon icon={faLandmark} style={{ fontSize: '34px', color: C.primary }} />
            </div>
            <h1 style={{ color: C.primary, fontSize: '28px', fontWeight: '700', marginBottom: '6px' }}>
              Gougoul Holocron
            </h1>
            <p style={{ color: C.textSub, fontSize: '15px' }}>
              Bienvenue sur votre espace académique
            </p>
          </div>

          {/* Carte formulaire */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '8px', padding: '32px',
            boxShadow: '0 8px 32px rgba(0,32,69,0.06)'
          }}>

            {successMessage && (
              <div style={{
                background: '#d4edda', border: '1px solid #c3e6cb',
                borderRadius: '4px', padding: '12px 16px',
                color: '#155724', fontSize: '14px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                ✅ {successMessage}
              </div>
            )}

            {error && (
              <div style={{
                background: C.errorBg, border: `1px solid ${C.error}`,
                borderRadius: '4px', padding: '12px 16px',
                color: C.error, fontSize: '14px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                ⚠️ {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

              {/* Matricule */}
              <div>
                <label style={{ display: 'block', color: C.textMuted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Matricule universitaire
                </label>
                <div style={{ position: 'relative' }}>
                  <FontAwesomeIcon icon={faIdCard} style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: C.textMuted, fontSize: '15px',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type="text"
                    placeholder="ex: ETU-2024-001"
                    value={formData.matricule}
                    onChange={e => setFormData({ ...formData, matricule: e.target.value.toUpperCase() })}
                    required
                    style={{ ...inputStyle, letterSpacing: '1px' }}
                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `inset 0 0 0 1px ${C.primary}`; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Mot de passe */}
              <div>
                <label style={{ display: 'block', color: C.textMuted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Mot de passe
                </label>
                <div style={{ position: 'relative' }}>
                  <FontAwesomeIcon icon={faLock} style={{
                    position: 'absolute', left: '14px', top: '50%',
                    transform: 'translateY(-50%)', color: C.textMuted, fontSize: '15px',
                    pointerEvents: 'none'
                  }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    style={{ ...inputStyle, paddingRight: '44px' }}
                    onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `inset 0 0 0 1px ${C.primary}`; }}
                    onBlur={e => { e.target.style.borderColor = C.border; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)} style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', padding: '4px'
                  }}>
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} style={{ fontSize: '14px' }} />
                  </button>
                </div>
              </div>

              {/* Bouton */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%', padding: '13px',
                  background: loading ? '#6b7280' : C.primary,
                  color: 'white', border: 'none', borderRadius: '4px',
                  fontSize: '15px', fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  transition: 'all 0.2s', fontFamily: 'Inter, sans-serif'
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
              >
                {loading ? 'Authentification...' : (
                  <>Se connecter <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '13px' }} /></>
                )}
              </button>

              {/* Badge sécurité */}
              <div style={{
                paddingTop: '16px', borderTop: `1px solid ${C.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '6px', color: C.textMuted
              }}>
                <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: '13px' }} />
                <span style={{ fontSize: '12px' }}>Accès sécurisé via TLS 1.3</span>
              </div>
            </form>
          </div>

          {/* Lien inscription */}
          <p style={{ textAlign: 'center', marginTop: '20px', color: C.textSub, fontSize: '14px' }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: C.secondary, fontWeight: '600' }}>
              S'inscrire
            </Link>
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '32px' }}>
            {stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ color: C.primary, fontSize: '16px', fontWeight: '700' }}>{s.value}</div>
                <div style={{ color: C.textMuted, fontSize: '11px', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer simplifié */}
      <footer style={{
        borderTop: `1px solid ${C.border}`, padding: '16px 24px',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}>
        <span style={{ color: C.textMuted, fontSize: '12px' }}>
          © 2026 C.Coruscant
        </span>
      </footer>

    </div>
  );
}
