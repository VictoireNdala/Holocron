import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faIdCard, faEnvelope, faLock, faEye, faEyeSlash, faArrowRight, faArrowLeft,
  faCheckCircle, faUserGraduate, faUserTie, faShieldHalved, faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import { register, verifyMatricule } from '../services/api';
import { getTokens } from '../theme/tokens';

const ROLE_CONFIG = {
  etudiant:   { label: 'Étudiant',   icon: faUserGraduate },
  professeur: { label: 'Professeur', icon: faUserTie },
  assistant:  { label: 'Assistant',  icon: faShieldHalved },
};

const getStrength = (p) => {
  if (!p) return { score: 0, label: '' };
  let s = 0;
  if (p.length >= 6)          s++;
  if (p.length >= 10)         s++;
  if (/[A-Z]/.test(p))        s++;
  if (/[0-9]/.test(p))        s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  if (s <= 1) return { score: s, label: 'Trop court' };
  if (s <= 2) return { score: s, label: 'Faible' };
  if (s <= 3) return { score: s, label: 'Moyen' };
  if (s <= 4) return { score: s, label: 'Fort' };
  return       { score: 5, label: 'Très fort' };
};

// Inscription — pas de maquette Slate & Citrus dédiée dans le canvas "Core
// Modules" (seule "Connexion" y figure) ; reprend le même système visuel et
// la même mécanique 2 étapes (vérification matricule → compte) déjà en place.
export default function Register() {
  const navigate = useNavigate();
  const dark = (() => { try { return localStorage.getItem('holocron_theme') !== 'light'; } catch { return true; } })();
  const T = getTokens(dark);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ matricule:'', email:'', password:'', confirmPassword:'' });
  const [matriculeInfo, setMatriculeInfo] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const pwStrength = getStrength(formData.password);
  const pwMatch = formData.confirmPassword ? formData.password === formData.confirmPassword : null;
  const roleConf = matriculeInfo ? ROLE_CONFIG[matriculeInfo.role] : null;

  const inputStyle = {
    width:'100%', boxSizing:'border-box', padding:'11px 14px', borderRadius:'8px',
    background:T.surfaceAlt, border:'none', color:T.text, fontSize:'14px',
    fontFamily:'Inter,sans-serif', outline:'none',
  };
  const buttonStyle = {
    padding:'13px', borderRadius:'8px', background:T.accent, color:T.accentText,
    border:'none', fontSize:'14px', fontWeight:'600', fontFamily:'Inter,sans-serif',
    cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
    display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await verifyMatricule(formData.matricule.trim().toUpperCase());
      setMatriculeInfo(res.data);
      setStep(2);
    } catch {
      setError('Matricule invalide ou non reconnu');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) return setError('Les mots de passe ne correspondent pas');
    if (formData.password.length < 6) return setError('Le mot de passe doit contenir au moins 6 caractères');
    setLoading(true);
    try {
      await register({ matricule: formData.matricule.trim().toUpperCase(), email: formData.email, password: formData.password, role: matriculeInfo.role });
      navigate('/', { state: { message: 'Compte créé avec succès ! Connectez-vous.' } });
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la création du compte');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:'Inter,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding: isMobile ? '24px' : '24px' }}>
      <div style={{ width:'100%', maxWidth:'420px', display:'flex', flexDirection:'column', gap:'24px' }}>

        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'10px' }}>
          <div style={{ width: isMobile?'32px':'34px', height: isMobile?'32px':'34px', borderRadius:'8px', background:T.accent }} />
          <div style={{ fontSize: isMobile?'20px':'19px', fontWeight:'700', color:T.text }}>Créer un compte</div>
          <div style={{ fontSize:'12.5px', color:T.textMuted }}>Holocron — Portail académique</div>
        </div>

        <div style={{ display:'flex', gap:'6px', justifyContent:'center' }}>
          {[1,2].map(n => (
            <div key={n} style={{ width:'22px', height:'4px', borderRadius:'2px', background: step >= n ? T.accent : T.surfaceAlt }} />
          ))}
        </div>

        {error && (
          <div style={{ background:T.dangerDim, borderRadius:'8px', padding:'12px 14px', color:T.danger, fontSize:'13px' }}>{error}</div>
        )}

        {step === 1 && (
          <form onSubmit={handleVerify} style={{ display:'flex', flexDirection:'column', gap:'20px' }}>
            <div style={{ background:T.surface, borderRadius:'6px', padding:'20px', display:'flex', gap:'10px' }}>
              <FontAwesomeIcon icon={faCircleInfo} style={{ color:T.accent, fontSize:'14px', marginTop:'2px', flexShrink:0 }} />
              <p style={{ color:T.textMuted, fontSize:'12.5px', lineHeight:'1.6', margin:0 }}>Seuls les membres enregistrés de l'université peuvent créer un compte. Votre matricule est fourni par l'établissement.</p>
            </div>
            <div style={{ background:T.surface, borderRadius:'6px', padding:'24px' }}>
              <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Matricule universitaire</label>
              <div style={{ position:'relative' }}>
                <FontAwesomeIcon icon={faIdCard} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'13px' }} />
                <input type="text" placeholder="ETU-2024XXXX" value={formData.matricule}
                  onChange={e => setFormData(f => ({ ...f, matricule:e.target.value.toUpperCase() }))} required autoFocus
                  style={{ ...inputStyle, paddingLeft:'40px', letterSpacing:'0.5px' }} />
              </div>
            </div>
            <button type="submit" disabled={loading || !formData.matricule.trim()} style={buttonStyle}>
              {loading ? 'Vérification...' : (<>Vérifier mon matricule <FontAwesomeIcon icon={faArrowRight} style={{ fontSize:'12px' }} /></>)}
            </button>
          </form>
        )}

        {step === 2 && matriculeInfo && (
          <form onSubmit={handleRegister} style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', background:T.accentDim, borderRadius:'6px', padding:'14px' }}>
              <FontAwesomeIcon icon={roleConf?.icon || faUserGraduate} style={{ color:T.accent, fontSize:'18px' }} />
              <div>
                <div style={{ color:T.text, fontSize:'14px', fontWeight:'700' }}>{matriculeInfo.prenom} {matriculeInfo.nom}</div>
                <div style={{ color:T.accent, fontSize:'12px', fontWeight:'600', display:'flex', alignItems:'center', gap:'6px', marginTop:'2px' }}>
                  {roleConf?.label}{matriculeInfo.filiere ? ` · ${matriculeInfo.filiere}` : ''}
                  <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize:'10px' }} />
                </div>
              </div>
            </div>

            <div style={{ background:T.surface, borderRadius:'6px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px' }}>
              <div>
                <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Adresse e-mail</label>
                <div style={{ position:'relative' }}>
                  <FontAwesomeIcon icon={faEnvelope} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'13px' }} />
                  <input type="email" placeholder="votre@email.edu" value={formData.email}
                    onChange={e => setFormData(f => ({ ...f, email:e.target.value }))} required
                    style={{ ...inputStyle, paddingLeft:'40px' }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Mot de passe</label>
                <PwField T={T} value={formData.password} onChange={e => setFormData(f => ({ ...f, password:e.target.value }))} />
                {formData.password && (
                  <div style={{ marginTop:'8px' }}>
                    <div style={{ display:'flex', gap:'4px', marginBottom:'4px' }}>
                      {[1,2,3,4,5].map(i => (
                        <div key={i} style={{ flex:1, height:'3px', borderRadius:'99px', background: i <= pwStrength.score ? T.accent : T.surfaceAlt }} />
                      ))}
                    </div>
                    <span style={{ color:T.textMuted, fontSize:'11px' }}>{pwStrength.label}</span>
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Confirmer le mot de passe</label>
                <PwField T={T} value={formData.confirmPassword} onChange={e => setFormData(f => ({ ...f, confirmPassword:e.target.value }))} />
                {pwMatch === true && <p style={{ color:T.success, fontSize:'11px', marginTop:'4px' }}>Les mots de passe correspondent</p>}
                {pwMatch === false && <p style={{ color:T.danger, fontSize:'11px', marginTop:'4px' }}>Les mots de passe ne correspondent pas</p>}
              </div>
            </div>

            <div style={{ display:'flex', gap:'10px' }}>
              <button type="button" onClick={() => { setStep(1); setError(''); }} style={{ padding:'13px 16px', background:'none', border:'none', borderRadius:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontFamily:'Inter,sans-serif' }}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize:'11px' }} /> Retour
              </button>
              <button type="submit" disabled={loading} style={{ ...buttonStyle, flex:1 }}>
                {loading ? 'Création...' : 'Créer mon compte'}
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign:'center', color:T.textMuted, fontSize:'13px', margin:0 }}>
          Déjà un compte ? <Link to="/" style={{ color:T.accent, fontWeight:'600', textDecoration:'none' }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

function PwField({ T, value, onChange }) {
  const [vis, setVis] = useState(false);
  return (
    <div style={{ position:'relative' }}>
      <FontAwesomeIcon icon={faLock} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'13px' }} />
      <input type={vis ? 'text' : 'password'} placeholder="••••••••" value={value} onChange={onChange} required
        style={{ width:'100%', boxSizing:'border-box', padding:'11px 40px', borderRadius:'8px', background:T.surfaceAlt, border:'none', color:T.text, fontSize:'14px', fontFamily:'Inter,sans-serif', outline:'none' }} />
      <button type="button" onClick={() => setVis(v => !v)} style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.textMuted, cursor:'pointer' }}>
        <FontAwesomeIcon icon={vis ? faEyeSlash : faEye} style={{ fontSize:'13px' }} />
      </button>
    </div>
  );
}
