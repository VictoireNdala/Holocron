import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faIdCard, faLock, faEye, faEyeSlash, faArrowRight, faArrowLeft,
  faUserGraduate, faUserTie, faShieldHalved, faCheckCircle
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import { login, verifyMatricule } from '../services/api';
import { getTokens } from '../theme/tokens';

const ROLE_CONFIG = {
  etudiant:   { label: 'Étudiant',   icon: faUserGraduate },
  professeur: { label: 'Professeur', icon: faUserTie },
  assistant:  { label: 'Assistant',  icon: faShieldHalved },
};

// Connexion — flux 3 étapes par matricule, source exacte "Core Modules.dc.html"
// section 2 (m2a-d) pour l'étape 1 ; étapes 2/3 (confirmation du rôle, mot de
// passe) prolongent ce même système visuel, non détaillées dans le canvas.
export default function Login() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { login: authLogin } = useAuth();

  const dark = (() => { try { return localStorage.getItem('holocron_theme') !== 'light'; } catch { return true; } })();
  const T = getTokens(dark);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [step, setStep] = useState(1);
  const [matricule, setMatricule] = useState('');
  const [matriculeInfo, setMatriculeInfo] = useState(null); // { role, nom, prenom }
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const successMessage = location.state?.message;
  const roleConf = matriculeInfo ? ROLE_CONFIG[matriculeInfo.role] : null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!matricule.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await verifyMatricule(matricule.trim().toUpperCase());
      setMatriculeInfo(res.data);
      setStep(2);
    } catch {
      setError('Matricule invalide ou non reconnu');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true); setError('');
    try {
      const res = await login({ matricule: matricule.trim().toUpperCase(), password });
      authLogin(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Matricule ou mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:'8px',
    background:T.surfaceAlt, border:'none', color:T.text, fontSize:'14px',
    fontFamily:'Inter,sans-serif', outline:'none', marginBottom:'20px',
  };
  const buttonStyle = {
    width:'100%', padding:'13px', borderRadius:'8px', background:T.accent, color:T.accentText,
    border:'none', fontSize:'14px', fontWeight:'600', fontFamily:'Inter,sans-serif',
    cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
  };

  const StepDots = () => (
    <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
      {[1,2,3].map(n => (
        <div key={n} style={{ width:'22px', height:'4px', borderRadius:'2px', background: step >= n ? T.accent : T.surfaceAlt }} />
      ))}
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:'Inter,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '0 24px' : '24px' }}>
      <div style={{ width:'100%', maxWidth:'400px', display:'flex', flexDirection:'column', gap:'28px' }}>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
          <div style={{ width: isMobile?'32px':'34px', height: isMobile?'32px':'34px', borderRadius:'8px', background:T.accent }} />
          <div style={{ fontSize: isMobile?'20px':'19px', fontWeight:'700', color:T.text }}>Holocron</div>
          {isMobile && <div style={{ fontSize:'12.5px', color:T.textMuted }}>Connexion — étape {step} / 3</div>}
        </div>

        {!isMobile && <StepDots />}

        {successMessage && (
          <div style={{ background:T.accentDim, borderRadius:'8px', padding:'12px 14px', color:T.accent, fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize:'13px' }} /> {successMessage}
          </div>
        )}
        {error && (
          <div style={{ background:T.dangerDim, borderRadius:'8px', padding:'12px 14px', color:T.danger, fontSize:'13px' }}>{error}</div>
        )}

        {step === 1 && (
          <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column' }}>
            <div style={ isMobile ? {} : { background:T.surface, borderRadius:'6px', padding:'28px' } }>
              <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Matricule</label>
              <div style={{ position:'relative' }}>
                <FontAwesomeIcon icon={faIdCard} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'13px' }} />
                <input type="text" placeholder="ETU-2024XXXX" value={matricule}
                  onChange={e => setMatricule(e.target.value.toUpperCase())} autoFocus required
                  style={{ ...inputStyle, paddingLeft:'40px', letterSpacing:'0.5px' }} />
              </div>
            </div>
            <button type="submit" disabled={loading || !matricule.trim()} style={buttonStyle}>
              {loading ? 'Vérification...' : (<>Continuer <FontAwesomeIcon icon={faArrowRight} style={{ fontSize:'12px' }} /></>)}
            </button>
          </form>
        )}

        {step === 2 && matriculeInfo && (
          <div style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={ isMobile ? {} : { background:T.surface, borderRadius:'6px', padding:'28px' } }>
              <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Rôle détecté</label>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px', borderRadius:'8px', background:T.accentDim, color:T.accent, fontSize:'13px', fontWeight:'600', width:'fit-content' }}>
                <FontAwesomeIcon icon={roleConf?.icon || faUserGraduate} style={{ fontSize:'12px' }} />
                {roleConf?.label} — {matriculeInfo.prenom} {matriculeInfo.nom}
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button type="button" onClick={() => { setStep(1); setError(''); }} style={{ padding:'13px 16px', background:'none', border:'none', borderRadius:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontFamily:'Inter,sans-serif' }}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize:'11px' }} /> Retour
              </button>
              <button type="button" onClick={() => setStep(3)} style={{ ...buttonStyle, flex:1 }}>
                Continuer <FontAwesomeIcon icon={faArrowRight} style={{ fontSize:'12px' }} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && matriculeInfo && (
          <form onSubmit={handleLogin} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={ isMobile ? {} : { background:T.surface, borderRadius:'6px', padding:'28px' } }>
              <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Mot de passe</label>
              <div style={{ position:'relative' }}>
                <FontAwesomeIcon icon={faLock} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'13px' }} />
                <input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)} autoFocus required
                  style={{ ...inputStyle, paddingLeft:'40px', paddingRight:'40px', marginBottom:0 }} />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.textMuted, cursor:'pointer' }}>
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} style={{ fontSize:'13px' }} />
                </button>
              </div>
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button type="button" onClick={() => { setStep(2); setError(''); }} style={{ padding:'13px 16px', background:'none', border:'none', borderRadius:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontFamily:'Inter,sans-serif' }}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize:'11px' }} /> Retour
              </button>
              <button type="submit" disabled={loading || !password} style={{ ...buttonStyle, flex:1 }}>
                {loading ? 'Connexion...' : 'Se connecter'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign:'center', color:T.textMuted, fontSize:'13px', margin:0 }}>
          Pas encore de compte ? <Link to="/register" style={{ color:T.accent, fontWeight:'600', textDecoration:'none' }}>S'inscrire</Link>
        </p>
      </div>
    </div>
  );
}
