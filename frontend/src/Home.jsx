import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faGraduationCap, faFolder, faUsers, 
  faShieldHalved, faNetworkWired, faArrowRight,
  faServer, faLock
} from '@fortawesome/free-solid-svg-icons';

export default function Home() {
  const navigate = useNavigate();

  const features = [
    { icon: faFolder, title: 'Stockage Centralisé', desc: 'Tous vos fichiers académiques accessibles en un seul endroit sécurisé.', color: '#3b82f6' },
    { icon: faUsers, title: 'Partage par Promotion', desc: 'Les professeurs partagent instantanément avec toute une classe.', color: '#8b5cf6' },
    { icon: faShieldHalved, title: 'Accès Sécurisé', desc: 'Authentification par matricule universitaire unique.', color: '#10b981' },
    { icon: faNetworkWired, title: 'Réseau Local', desc: 'Solution hébergée localement, données sécurisées sur le campus.', color: '#f59e0b' },
  ];

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      fontFamily: 'Inter, sans-serif',
      overflow: 'hidden'
    }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '20px 48px',
        borderBottom: '1px solid var(--border)',
        background: 'rgba(10,15,30,0.8)',
        backdropFilter: 'blur(20px)',
        position: 'sticky', top: 0, zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '38px', height: '38px',
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            borderRadius: '10px', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(59,130,246,0.4)'
          }}>
            <FontAwesomeIcon icon={faGraduationCap} style={{ color: 'white', fontSize: '18px' }} />
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: '700', fontSize: '16px', lineHeight: '1.2' }}>Gougoul Holocron</div>
            <div style={{ color: '#60a5fa', fontSize: '11px', fontWeight: '500' }}>Plateforme Académique</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-secondary" onClick={() => navigate('/login')}
            style={{ padding: '10px 20px', fontSize: '14px' }}>
            Se connecter
          </button>
          <button className="btn-primary" onClick={() => navigate('/register')}
            style={{ padding: '10px 20px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            S'inscrire
            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '12px' }} />
          </button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '100px 48px 80px', textAlign: 'center',
        position: 'relative'
      }}>
        {/* Glow effect */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '600px', height: '400px',
          background: 'radial-gradient(ellipse, rgba(59,130,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(59,130,246,0.1)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: '99px', padding: '6px 16px',
          marginBottom: '32px'
        }}>
          <FontAwesomeIcon icon={faServer} style={{ color: '#60a5fa', fontSize: '12px' }} />
          <span style={{ color: '#60a5fa', fontSize: '13px', fontWeight: '500' }}>
            Hébergé localement sur votre campus
          </span>
        </div>

        <h1 style={{
          fontSize: '56px', fontWeight: '800', lineHeight: '1.1',
          marginBottom: '24px', maxWidth: '700px',
          background: 'linear-gradient(135deg, #ffffff 0%, #94a3b8 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent'
        }}>
          La plateforme académique de votre université
        </h1>

        <p style={{
          fontSize: '18px', color: 'var(--text-secondary)',
          maxWidth: '520px', lineHeight: '1.7', marginBottom: '48px'
        }}>
          Stockez, partagez et gérez vos ressources pédagogiques en toute sécurité sur le réseau local de l'établissement.
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => navigate('/register')}
            style={{
              padding: '14px 32px', fontSize: '16px',
              display: 'flex', alignItems: 'center', gap: '10px'
            }}>
            <FontAwesomeIcon icon={faGraduationCap} />
            Créer un compte
            <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '13px' }} />
          </button>
          <button className="btn-secondary" onClick={() => navigate('/login')}
            style={{ padding: '14px 32px', fontSize: '16px' }}>
            J'ai déjà un compte
          </button>
        </div>
      </div>

      {/* Features */}
      <div style={{
        padding: '0 48px 80px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '20px', maxWidth: '1100px', margin: '0 auto'
      }}>
        {features.map((f, i) => (
          <div key={i} className="card" style={{
            borderTop: `3px solid ${f.color}`,
            transition: 'transform 0.2s, box-shadow 0.2s'
          }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 40px rgba(0,0,0,0.4)`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: '44px', height: '44px',
              background: `rgba(${f.color === '#3b82f6' ? '59,130,246' : f.color === '#8b5cf6' ? '139,92,246' : f.color === '#10b981' ? '16,185,129' : '245,158,11'},0.15)`,
              borderRadius: '12px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              marginBottom: '16px'
            }}>
              <FontAwesomeIcon icon={f.icon} style={{ color: f.color, fontSize: '18px' }} />
            </div>
            <h3 style={{ color: 'white', fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
              {f.title}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6' }}>
              {f.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: '24px 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FontAwesomeIcon icon={faLock} style={{ color: 'var(--text-muted)', fontSize: '12px' }} />
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
            Données hébergées localement — Aucune donnée envoyée sur internet
          </span>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          © 2024 Gougoul Holocron
        </span>
      </div>
    </div>
  );
}