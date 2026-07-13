import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faLandmark, faIdCard, faEnvelope, faLock,
  faEye, faEyeSlash, faArrowRight, faArrowLeft,
  faCheckCircle, faShieldHalved, faUserGraduate,
  faUserTie, faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import { register, verifyMatricule } from '../services/api';

/* ── Force mot de passe ── */
const getStrength = (p) => {
  if (!p) return { score: 0, label: '', color: 'transparent' };
  let s = 0;
  if (p.length >= 6)          s++;
  if (p.length >= 10)         s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 1) return { score: s, label: 'Trop court',  color: '#ba1a1a' };
  if (s <= 2) return { score: s, label: 'Faible',      color: '#e65100' };
  if (s <= 3) return { score: s, label: 'Moyen',       color: '#1960a3' };
  if (s <= 4) return { score: s, label: 'Fort',        color: '#2e7d32' };
  return       { score: 5,    label: 'Très fort',      color: '#1b5e20' };
};

const ROLE_CONFIG = {
  etudiant:   { label: 'Étudiant',   icon: faUserGraduate, color: '#002045', bg: '#e8edf5' },
  professeur: { label: 'Professeur', icon: faUserTie,      color: '#1960a3', bg: '#e3ecf7' },
  assistant:  { label: 'Assistant',  icon: faShieldHalved, color: '#2e7d32', bg: '#e8f5e9' },
};

/* ── Palette institutionnelle (identique à Login) ── */
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
  success:   '#1b5e20',
  successBg: '#e8f5e9',
};

function PwField({ placeholder, value, onChange, required, extraStyle = {} }) {
  const [vis, setVis] = useState(false);
  const base = {
    width: '100%', padding: '13px 44px 13px 44px',
    background: '#fff', border: `1px solid ${C.border}`,
    borderRadius: '4px', color: C.textMain,
    fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };
  return (
    <div style={{ position: 'relative' }}>
      <FontAwesomeIcon icon={faLock} style={{
        position: 'absolute', left: '14px', top: '50%',
        transform: 'translateY(-50%)', color: C.textMuted,
        fontSize: '15px', pointerEvents: 'none'
      }} />
      <input
        type={vis ? 'text' : 'password'}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        style={{ ...base, ...extraStyle }}
        onFocus={e => { e.target.style.borderColor = C.primary; e.target.style.boxShadow = `inset 0 0 0 1px ${C.primary}`; }}
        onBlur={e => { e.target.style.borderColor = extraStyle.borderColor || C.border; e.target.style.boxShadow = 'none'; }}
      />
      <button type="button" onClick={() => setVis(v => !v)} style={{
        position: 'absolute', right: '12px', top: '50%',
        transform: 'translateY(-50%)',
        background: 'none', border: 'none',
        color: C.textMuted, cursor: 'pointer', padding: '4px'
      }}>
        <FontAwesomeIcon icon={vis ? faEyeSlash : faEye} style={{ fontSize: '14px' }} />
      </button>
    </div>
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [step, setStep]                   = useState(1);
  const [formData, setFormData]           = useState({
    matricule: '', displayName: '', email: '',
    password: '', confirmPassword: '', role: ''
  });
  const [matriculeInfo, setMatriculeInfo] = useState(null);
  const [rememberMe, setRememberMe]       = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

  const pwStrength = getStrength(formData.password);
  const pwMatch    = formData.confirmPassword
    ? formData.password === formData.confirmPassword : null;

  const roleConf = matriculeInfo ? ROLE_CONFIG[matriculeInfo.role] : null;

  const inputStyle = {
    width: '100%', padding: '13px 16px 13px 44px',
    background: '#fff', border: `1px solid ${C.border}`,
    borderRadius: '4px', color: C.textMain,
    fontSize: '15px', outline: 'none',
    boxSizing: 'border-box', fontFamily: 'Inter, sans-serif',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const onFocus = e => {
    e.target.style.borderColor = C.primary;
    e.target.style.boxShadow = `inset 0 0 0 1px ${C.primary}`;
  };
  const onBlur = e => {
    e.target.style.borderColor = C.border;
    e.target.style.boxShadow = 'none';
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await verifyMatricule(formData.matricule);
      setMatriculeInfo(res.data);
      setFormData(f => ({
        ...f,
        role: res.data.role,
        displayName: `${res.data.prenom} ${res.data.nom}`
      }));
      setStep(2);
    } catch {
      setError('Matricule invalide ou non reconnu dans le système universitaire');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword)
      return setError('Les mots de passe ne correspondent pas');
    if (formData.password.length < 6)
      return setError('Le mot de passe doit contenir au moins 6 caractères');
    setLoading(true);
    try {
      await register({ ...formData, rememberMe });
      navigate('/login', { state: { message: 'Compte créé avec succès ! Connectez-vous.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: C.bg,
      fontFamily: 'Inter, sans-serif',
      display: 'flex', flexDirection: 'column'
    }}>

      <main style={{
        flex: 1, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '32px 16px'
      }}>
        <div style={{ width: '100%', maxWidth: '460px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: '68px', height: '68px',
              background: C.surface, border: `1px solid ${C.border}`,
              borderRadius: '12px', marginBottom: '14px',
              boxShadow: '0 4px 16px rgba(0,32,69,0.08)'
            }}>
              <FontAwesomeIcon icon={faLandmark} style={{ fontSize: '30px', color: C.primary }} />
            </div>
            <h1 style={{ color: C.primary, fontSize: '26px', fontWeight: '700', marginBottom: '4px' }}>
              Créer un compte
            </h1>
            <p style={{ color: C.textSub, fontSize: '14px' }}>
              Gougoul Holocron — Portail Académique
            </p>
          </div>

          {/* Indicateur étapes */}
          <div style={{
            display: 'flex', alignItems: 'center',
            marginBottom: '24px', padding: '0 8px'
          }}>
            {[
              { num: 1, label: 'Vérification' },
              { num: 2, label: 'Compte'       }
            ].map((s, i) => (
              <React.Fragment key={s.num}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '50%',
                    background: step >= s.num ? C.primary : '#e0e3e5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: step >= s.num ? 'white' : C.textMuted,
                    fontSize: '13px', fontWeight: '700',
                    transition: 'all 0.3s'
                  }}>
                    {step > s.num
                      ? <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '16px' }} />
                      : s.num
                    }
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '500',
                    color: step >= s.num ? C.primary : C.textMuted
                  }}>{s.label}</span>
                </div>
                {i === 0 && (
                  <div style={{
                    flex: 1, height: '2px',
                    background: step >= 2 ? C.primary : '#e0e3e5',
                    margin: '0 10px', marginBottom: '18px',
                    transition: 'background 0.4s'
                  }} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* Carte */}
          <div style={{
            background: C.surface, border: `1px solid ${C.border}`,
            borderRadius: '8px', padding: '28px 32px',
            boxShadow: '0 8px 32px rgba(0,32,69,0.06)'
          }}>

            {/* Erreur */}
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

            {/* ════ ÉTAPE 1 ════ */}
            {step === 1 && (
              <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  background: '#e8edf5', border: `1px solid #b8c8de`,
                  borderRadius: '4px', padding: '12px 14px'
                }}>
                  <FontAwesomeIcon icon={faCircleInfo} style={{ color: C.secondary, fontSize: '15px', marginTop: '1px', flexShrink: 0 }} />
                  <p style={{ color: C.textSub, fontSize: '13px', lineHeight: '1.6', margin: 0 }}>
                    Seuls les membres enregistrés de l'université peuvent créer un compte. Votre matricule est fourni par l'établissement.
                  </p>
                </div>

                <div>
                  <label style={{
                    display: 'block', color: C.textMuted,
                    fontSize: '11px', fontWeight: '600',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    marginBottom: '8px'
                  }}>
                    Matricule universitaire
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faIdCard} style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)', color: C.textMuted,
                      fontSize: '15px', pointerEvents: 'none'
                    }} />
                    <input
                      type="text"
                      placeholder="ex: ETU-2024-001"
                      value={formData.matricule}
                      onChange={e => setFormData(f => ({ ...f, matricule: e.target.value.toUpperCase() }))}
                      required
                      style={{ ...inputStyle, letterSpacing: '1px' }}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !formData.matricule}
                  style={{
                    width: '100%', padding: '13px',
                    background: (loading || !formData.matricule) ? '#9ea8b3' : C.primary,
                    color: 'white', border: 'none', borderRadius: '4px',
                    fontSize: '15px', fontWeight: '600',
                    cursor: (loading || !formData.matricule) ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
                  }}
                >
                  {loading ? 'Vérification...' : (
                    <>Vérifier mon matricule <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '13px' }} /></>
                  )}
                </button>
              </form>
            )}

            {/* ════ ÉTAPE 2 ════ */}
            {step === 2 && matriculeInfo && (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* Badge matricule validé */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  background: roleConf?.bg || C.successBg,
                  border: `1px solid ${roleConf?.color || C.secondary}30`,
                  borderRadius: '6px', padding: '12px 14px'
                }}>
                  <div style={{
                    width: '40px', height: '40px', flexShrink: 0,
                    background: `${roleConf?.color || C.secondary}15`,
                    borderRadius: '8px', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <FontAwesomeIcon
                      icon={roleConf?.icon || faUserGraduate}
                      style={{ color: roleConf?.color || C.secondary, fontSize: '17px' }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: C.textMain, fontSize: '14px', fontWeight: '700', marginBottom: '3px' }}>
                      {matriculeInfo.prenom} {matriculeInfo.nom}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span style={{
                        background: roleConf?.color || C.secondary,
                        color: 'white', fontSize: '10px', fontWeight: '700',
                        padding: '2px 8px', borderRadius: '3px'
                      }}>
                        {roleConf?.label}
                      </span>
                      {matriculeInfo.filiere && (
                        <span style={{
                          background: '#e0e3e5', color: C.textSub,
                          fontSize: '10px', padding: '2px 8px', borderRadius: '3px'
                        }}>
                          {matriculeInfo.filiere}
                        </span>
                      )}
                      <span style={{ color: '#2e7d32', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '600' }}>
                        <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '10px' }} /> Vérifié
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nom d'affichage */}
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Nom d'affichage
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faUserGraduate} style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)', color: C.textMuted,
                      fontSize: '14px', pointerEvents: 'none'
                    }} />
                    <input
                      type="text"
                      placeholder="Votre nom d'affichage"
                      value={formData.displayName}
                      onChange={e => setFormData(f => ({ ...f, displayName: e.target.value }))}
                      required
                      style={inputStyle}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                  <p style={{ color: C.textMuted, fontSize: '11px', marginTop: '4px' }}>
                    Vous pouvez choisir librement votre nom d'affichage
                  </p>
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Adresse e-mail
                  </label>
                  <div style={{ position: 'relative' }}>
                    <FontAwesomeIcon icon={faEnvelope} style={{
                      position: 'absolute', left: '14px', top: '50%',
                      transform: 'translateY(-50%)', color: C.textMuted,
                      fontSize: '14px', pointerEvents: 'none'
                    }} />
                    <input
                      type="email"
                      placeholder="votre@email.edu"
                      value={formData.email}
                      onChange={e => setFormData(f => ({ ...f, email: e.target.value }))}
                      required
                      style={inputStyle}
                      onFocus={onFocus} onBlur={onBlur}
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Mot de passe
                  </label>
                  <PwField
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={e => setFormData(f => ({ ...f, password: e.target.value }))}
                    required
                  />
                  {formData.password && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{
                            flex: 1, height: '3px', borderRadius: '99px',
                            background: i <= pwStrength.score ? pwStrength.color : '#e0e3e5',
                            transition: 'background 0.3s'
                          }} />
                        ))}
                      </div>
                      <span style={{ color: pwStrength.color, fontSize: '11px', fontWeight: '500' }}>
                        {pwStrength.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirmation mot de passe */}
                <div>
                  <label style={{ display: 'block', color: C.textMuted, fontSize: '11px', fontWeight: '600', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Confirmer le mot de passe
                  </label>
                  <PwField
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={e => setFormData(f => ({ ...f, confirmPassword: e.target.value }))}
                    required
                    extraStyle={
                      pwMatch === true  ? { borderColor: '#2e7d32' } :
                      pwMatch === false ? { borderColor: C.error   } : {}
                    }
                  />
                  {pwMatch === true && (
                    <p style={{ color: '#2e7d32', fontSize: '11px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '10px' }} /> Les mots de passe correspondent
                    </p>
                  )}
                  {pwMatch === false && (
                    <p style={{ color: C.error, fontSize: '11px', marginTop: '4px' }}>
                      ✗ Les mots de passe ne correspondent pas
                    </p>
                  )}
                </div>

                {/* Se souvenir de moi */}
                <label style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', padding: '4px 0'
                }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    style={{
                      width: '16px', height: '16px',
                      accentColor: C.primary, cursor: 'pointer'
                    }}
                  />
                  <span style={{ color: C.textSub, fontSize: '14px' }}>
                    Se souvenir de moi
                  </span>
                </label>

                {/* Boutons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setError(''); }}
                    style={{
                      padding: '13px 16px',
                      background: 'transparent', border: `1px solid ${C.border}`,
                      borderRadius: '4px', color: C.textSub,
                      fontSize: '14px', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f1f4f6'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: '12px' }} />
                    Retour
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      flex: 1, padding: '13px',
                      background: loading ? '#9ea8b3' : C.primary,
                      color: 'white', border: 'none', borderRadius: '4px',
                      fontSize: '15px', fontWeight: '600',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                      fontFamily: 'Inter, sans-serif', transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  >
                    {loading ? 'Création du compte...' : (
                      <>Créer mon compte <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize: '14px' }} /></>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Lien connexion */}
          <p style={{ textAlign: 'center', marginTop: '20px', color: C.textSub, fontSize: '14px' }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: C.secondary, fontWeight: '600' }}>
              Se connecter
            </Link>
          </p>
        </div>
      </main>

      {/* Footer */}
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