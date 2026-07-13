import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBars, faHouse, faFolderOpen, faCloudArrowUp, faGear,
  faRobot, faMagnifyingGlass, faBell, faFileLines,
  faFolder, faFolderPlus, faDownload, faTrash, faTable,
  faBolt, faUsers, faHardDrive, faShieldHalved,
  faUserGraduate, faUserTie, faArrowRight, faClockRotateLeft,
  faRightFromBracket, faPlus, faCheckCircle, faBrain,
  faNetworkWired, faLock, faUpload, faIdCard, faEnvelope,
  faEye, faEyeSlash, faFile, faEllipsisVertical, faFileZipper,
  faPaperPlane, faChevronDown, faChevronRight, faBookOpen,
  faCircleCheck, faFloppyDisk, faSpinner, faXmark, faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import {
  getProfile, logout,
  listFiles, uploadFile, downloadFile, createFolder, deleteFile,
  getQuota, getStats,
  listAssignments, createAssignment, submitAssignment,
  getMySubmissions, getReceivedSubmissions, downloadSubmission
} from '../services/api';

// ── Palette Nebula Dark ─────────────────────────────────────────────────────
const N = {
  bg:'#11131a', surface:'#1d1f26', surfaceLow:'#191b22', surfaceHigh:'#282a31',
  surfaceTop:'#33343c', primary:'#bdc2ff', primaryDim:'rgba(189,194,255,0.12)',
  secondary:'#4de082', secondaryDim:'rgba(77,224,130,0.12)',
  tertiary:'#f7bd3e', tertiaryDim:'rgba(247,189,62,0.12)',
  onSurface:'#e2e2ec', onVariant:'#c6c5d5', outline:'#454653', error:'#ffb4ab',
};

const glass = (extra = {}) => ({
  background:'rgba(29,31,38,0.8)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)',
  border:`1px solid ${N.outline}40`, borderRadius:'12px', ...extra,
});

const ROLE = {
  etudiant:   { label:'Étudiant',   icon:faUserGraduate, color:N.primary,   quota:'2 GB'  },
  professeur: { label:'Professeur', icon:faUserTie,      color:N.tertiary,  quota:'10 GB' },
  assistant:  { label:'Assistant',  icon:faShieldHalved, color:N.secondary, quota:'5 GB'  },
};

// Filières réelles (options du formulaire "Nouveau devoir")
const FILIERES = ['Genie Logiciel', 'Intelligence Artificielle', 'Systemes Informatiques'];

// ── Données encore statiques (aperçu — non branchées au 12 juillet) ──────────
const RECENT_FILES = [
  { icon:faFileLines,  name:'Architecture_Systèmes_TP4.pdf',   meta:'2h • 4.2 MB',  color:N.primary   },
  { icon:faFileZipper, name:'Projet_Base_Données.zip',         meta:'Hier • 128 MB',color:N.secondary },
  { icon:faTable,      name:'Planning_Révision_Examens.xlsx',  meta:'3j • 850 KB',  color:N.primary   },
  { icon:faFile,       name:'Notes_IA.txt',                    meta:'1h • 12 KB',   color:N.secondary },
];
const SHARED_FOLDERS = [
  { name:'Architecture OS',           files:45,  size:'12.4 GB', color:N.primary   },
  { name:'Réseaux Avancés',           files:22,  size:'5.1 GB',  color:N.secondary },
  { name:'Intelligence Artificielle', files:120, size:'28.9 GB', color:N.tertiary  },
  { name:'Cybersécurité',             files:38,  size:'8.7 GB',  color:N.primary   },
];
const COURSE_FOLDERS = [
  { name:'Architecture OS',           files:45,  size:'12.4 GB', color:N.primary,   fill:75  },
  { name:'Réseaux Avancés',           files:22,  size:'5.1 GB',  color:N.secondary, fill:25  },
  { name:'Intelligence Artificielle', files:120, size:'28.9 GB', color:N.tertiary,  fill:85  },
  { name:'Archives 2023',             files:240, size:'145 GB',  color:N.onVariant, fill:100 },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024)      return `${bytes} B`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} KB`;
  return `${(bytes/(1024*1024)).toFixed(1)} MB`;
};
const fmtGB = (b) => {
  if (b == null) return '—';
  const kb=b/1024, mb=kb/1024, gb=mb/1024;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  if (kb >= 1) return `${kb.toFixed(0)} KB`;
  return `${b} o`;
};
const getFileIcon = (file) => {
  if (file.isDirectory) return { icon:faFolder, color:N.primary };
  const m = file.mimeType || '';
  if (m.includes('pdf'))   return { icon:faFileLines, color:N.error };
  if (m.includes('zip') || m.includes('archive')) return { icon:faFileZipper, color:N.tertiary };
  if (m.includes('sheet') || m.includes('excel')) return { icon:faTable, color:N.secondary };
  if (m.includes('text'))  return { icon:faFile, color:N.onVariant };
  return { icon:faFile, color:N.primary };
};
const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' }); }
  catch { return d; }
};

// ── Sous-composants ──────────────────────────────────────────────────────────
function RecentFileCard({ item }) {
  return (
    <div style={{ ...glass({ padding:'14px' }), display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', transition:'all 0.2s' }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${N.primary}50`; e.currentTarget.style.background=N.surfaceHigh; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=`${N.outline}40`; e.currentTarget.style.background='rgba(29,31,38,0.8)'; }}
    >
      <div style={{ width:'44px', height:'44px', borderRadius:'10px', flexShrink:0, background:`${item.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
        <FontAwesomeIcon icon={item.icon} style={{ color:item.color, fontSize:'18px' }} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <p style={{ color:N.onSurface, fontSize:'13px', fontWeight:'600', marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
        <p style={{ color:N.onVariant, fontSize:'11px' }}>{item.meta}</p>
      </div>
    </div>
  );
}

function FolderCard({ folder, showBar=false }) {
  return (
    <div style={{ ...glass({ padding:'16px' }), cursor:'pointer', transition:'all 0.2s' }}
      onMouseEnter={e => e.currentTarget.style.borderColor=`${folder.color}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor=`${N.outline}40`}
    >
      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:showBar?'10px':0 }}>
        <FontAwesomeIcon icon={faFolder} style={{ color:folder.color, fontSize:'28px' }} />
        <div style={{ flex:1, minWidth:0 }}>
          <p style={{ color:N.onSurface, fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{folder.name}</p>
          <p style={{ color:N.onVariant, fontSize:'11px', marginTop:'2px' }}>{folder.size} • {folder.files} fichiers</p>
        </div>
      </div>
      {showBar && (
        <div style={{ width:'100%', background:N.surfaceTop, borderRadius:'99px', height:'3px', overflow:'hidden' }}>
          <div style={{ width:`${folder.fill}%`, height:'100%', background:folder.color, borderRadius:'99px' }} />
        </div>
      )}
    </div>
  );
}

function ExplorerCard({ file, onNavigate, onDownload, onDelete, isProf }) {
  const { icon, color } = getFileIcon(file);
  return (
    <div style={{ ...glass({ padding:'16px' }), cursor:'pointer', transition:'all 0.2s', display:'flex', flexDirection:'column', gap:'10px' }}
      onMouseEnter={e => e.currentTarget.style.borderColor=`${N.primary}50`}
      onMouseLeave={e => e.currentTarget.style.borderColor=`${N.outline}40`}
    >
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
        {file.isDirectory ? (
          <FontAwesomeIcon icon={faFolder} onClick={() => onNavigate(file.path)} style={{ fontSize:'36px', color }} />
        ) : (
          <div style={{ width:'44px', height:'44px', borderRadius:'10px', background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FontAwesomeIcon icon={icon} style={{ fontSize:'20px', color }} />
          </div>
        )}
      </div>
      <div onClick={() => file.isDirectory ? onNavigate(file.path) : null}>
        <p style={{ color:N.onSurface, fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{file.name}</p>
        <p style={{ color:N.onVariant, fontSize:'11px', marginTop:'2px' }}>{file.isDirectory ? 'Dossier' : formatSize(file.size)}</p>
      </div>
      {!file.isDirectory && (
        <div style={{ display:'flex', gap:'6px' }}>
          <button onClick={() => onDownload(file.path)} style={{ flex:1, padding:'6px', background:N.primaryDim, border:'none', borderRadius:'6px', color:N.primary, fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', fontFamily:'Inter,sans-serif' }}>
            <FontAwesomeIcon icon={faDownload} style={{ fontSize:'11px' }} /> Télécharger
          </button>
          {isProf && (
            <button onClick={() => onDelete(file.path)} style={{ padding:'6px 8px', background:'rgba(255,180,171,0.1)', border:'none', borderRadius:'6px', color:N.error, fontSize:'11px', cursor:'pointer' }}>
              <FontAwesomeIcon icon={faTrash} style={{ fontSize:'11px' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Assistant IA — message HONNÊTE (la recherche intelligente n'est pas encore branchée)
function AIWidget({ aiQuery, setAiQuery, aiAsked, onAsk }) {
  return (
    <div style={{ ...glass({ padding:'20px', border:`1px solid ${N.primary}30` }), marginBottom:'24px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'14px' }}>
        <FontAwesomeIcon icon={faRobot} style={{ color:N.primary, fontSize:'18px' }} />
        <h3 style={{ color:N.onSurface, fontSize:'16px', fontWeight:'600', margin:0 }}>Assistant IA</h3>
        <span style={{ marginLeft:'auto', fontSize:'11px', color:N.onVariant, background:N.surfaceTop, padding:'2px 8px', borderRadius:'99px' }}>À venir</span>
      </div>
      <div style={{ position:'relative', marginBottom:aiAsked?'12px':0 }}>
        <input type="text" placeholder="Rechercher un fichier (bientôt disponible)…" value={aiQuery}
          onChange={e => setAiQuery(e.target.value)} onKeyDown={e => e.key==='Enter' && onAsk()}
          style={{ width:'100%', padding:'14px 120px 14px 18px', background:N.surfaceTop, border:`1px solid ${N.outline}`, borderRadius:'99px', color:N.onSurface, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }}
        />
        <button onClick={onAsk} style={{ position:'absolute', right:'6px', top:'6px', bottom:'6px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'99px', padding:'0 18px', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
          <FontAwesomeIcon icon={faPaperPlane} style={{ fontSize:'12px' }} /> Demander
        </button>
      </div>
      {aiAsked && (
        <div style={{ display:'flex', alignItems:'flex-start', gap:'12px', padding:'12px 14px', background:N.primaryDim, borderRadius:'8px', border:`1px solid ${N.primary}20` }}>
          <FontAwesomeIcon icon={faCircleInfo} style={{ color:N.primary, fontSize:'15px', marginTop:'2px' }} />
          <p style={{ color:N.onVariant, fontSize:'13px', margin:0, lineHeight:'1.5' }}>
            La recherche intelligente arrivera avec l'assistant IA local (Ollama, hors-ligne). En attendant, utilisez l'<span style={{ color:N.primary, fontWeight:'600' }}>Explorateur</span> pour parcourir vos fichiers.
          </p>
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();

  // ── State général ──────────────────────────────────────────────────────────
  const [tab, setTab]           = useState('dashboard');
  const [profile, setProfile]   = useState(null);
  const [quota, setQuota]       = useState(null);   // { used, total, relative }
  const [stats, setStats]       = useState(null);   // { students, total }
  const [aiQuery, setAiQuery]   = useState('');
  const [aiAsked, setAiAsked]   = useState(false);
  const [openFolders, setOpenFolders] = useState({});
  const [pwForm, setPwForm]     = useState({ current:'', next:'', confirm:'' });
  const [showPw, setShowPw]     = useState({});

  // ── State Explorer ─────────────────────────────────────────────────────────
  const [files, setFiles]             = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [uploading, setUploading]     = useState(false);
  const [uploadPct, setUploadPct]     = useState(0);
  const [newFolder, setNewFolder]     = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const fileInputRef                  = useRef(null);

  // ── State Submissions ──────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);   // devoirs (étudiant)
  const [mySubs, setMySubs]           = useState([]);   // mes rendus (étudiant)
  const [received, setReceived]       = useState([]);   // rendus reçus (prof), groupés
  const [subLoading, setSubLoading]   = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const submitInputRef                = useRef(null);
  const [showNewAssign, setShowNewAssign] = useState(false);
  const [newAssign, setNewAssign] = useState({ titre:'', description:'', filiere:FILIERES[0], date_limite:'' });

  const isProf = user?.role === 'professeur' || user?.role === 'assistant';

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Chargement initial tolérant aux pannes (une erreur n'annule pas le reste)
    (async () => {
      const calls = [getProfile(), getQuota()];
      if (isProf) { calls.push(getStats()); calls.push(getReceivedSubmissions()); }
      const r = await Promise.allSettled(calls);
      if (r[0].status === 'fulfilled') setProfile(r[0].value.data.user);
      if (r[1].status === 'fulfilled') setQuota(r[1].value.data.quota);
      if (isProf && r[2]?.status === 'fulfilled') setStats(r[2].value.data.stats);
      if (isProf && r[3]?.status === 'fulfilled') setReceived(r[3].value.data.assignments || []);
    })();
  }, [isProf]);

  useEffect(() => {
    if (tab === 'explorer') loadFiles(currentPath);
    if (tab === 'submissions') loadSubmissions();
  }, [tab, currentPath]);

  // ── Handlers Explorer ───────────────────────────────────────────────────────
  const loadFiles = async (path) => {
    setFilesLoading(true);
    try { const res = await listFiles(path); setFiles(res.data.files || []); }
    catch { setFiles([]); }
    finally { setFilesLoading(false); }
  };
  const handleNavigate = (path) => setCurrentPath(path);
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    setUploading(true);
    try { await uploadFile(currentPath, file, p => setUploadPct(Math.round(p.loaded*100/p.total))); await loadFiles(currentPath); }
    catch (err) { console.error('Upload:', err); }
    finally { setUploading(false); setUploadPct(0); e.target.value=''; }
  };
  const handleDownload = async (filePath) => {
    try {
      const res = await downloadFile(filePath);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href=url; a.download=filePath.split('/').pop(); a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Download:', err); }
  };
  const handleDelete = async (path) => {
    if (!window.confirm('Supprimer ce fichier ?')) return;
    try { await deleteFile(path); await loadFiles(currentPath); }
    catch (err) { console.error('Delete:', err); }
  };
  const handleCreateFolder = async () => {
    if (!newFolder.trim()) return;
    const p = `${currentPath === '/' ? '' : currentPath}/${newFolder.trim()}`;
    try { await createFolder(p); setNewFolder(''); setShowNewFolder(false); await loadFiles(currentPath); }
    catch (err) { console.error('CreateFolder:', err); }
  };

  // ── Handlers Submissions ──────────────────────────────────────────────────────
  const loadSubmissions = async () => {
    setSubLoading(true);
    try {
      if (isProf) {
        const r = await getReceivedSubmissions();
        setReceived(r.data.assignments || []);
      } else {
        const r = await Promise.allSettled([listAssignments(), getMySubmissions()]);
        if (r[0].status === 'fulfilled') setAssignments(r[0].value.data.assignments || []);
        if (r[1].status === 'fulfilled') setMySubs(r[1].value.data.submissions || []);
      }
    } catch (err) { console.error('loadSubmissions:', err); }
    finally { setSubLoading(false); }
  };
  const triggerSubmit = (assignmentId) => { setSubmittingId(assignmentId); submitInputRef.current?.click(); };
  const handleSubmitFile = async (e) => {
    const file = e.target.files[0];
    if (!file || !submittingId) { e.target.value=''; return; }
    try { await submitAssignment(submittingId, file); await loadSubmissions(); }
    catch (err) { console.error('Submit:', err); alert('Échec de la soumission.'); }
    finally { setSubmittingId(null); e.target.value=''; }
  };
  const handleCreateAssign = async () => {
    if (!newAssign.titre.trim() || !newAssign.filiere) return;
    try {
      await createAssignment(newAssign);
      setNewAssign({ titre:'', description:'', filiere:FILIERES[0], date_limite:'' });
      setShowNewAssign(false);
      await loadSubmissions();
    } catch (err) { console.error('CreateAssign:', err); alert('Échec de la création du devoir.'); }
  };
  const handleDownloadSub = async (id, nom) => {
    try {
      const res = await downloadSubmission(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href=url; a.download=nom || `rendu_${id}`; a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('DownloadSub:', err); }
  };

  // ── Handlers généraux ─────────────────────────────────────────────────────────
  const handleLogout = async () => { await logout(); authLogout(); navigate('/'); };
  const handleAsk = () => setAiAsked(true);
  const toggleFolder = (key) => setOpenFolders(p => ({ ...p, [key]: !p[key] }));

  // ── Dérivés ─────────────────────────────────────────────────────────────────
  const rc       = ROLE[user?.role] || ROLE.etudiant;
  const info     = profile || user || {};
  const initials = user ? `${user.prenom?.[0]||''}${user.nom?.[0]||''}`.toUpperCase() : '?';
  const submittedIds = new Set(mySubs.map(s => s.assignment_id));
  const qpct = quota && quota.total ? Math.min(100, Math.round(quota.relative || 0)) : 0;
  const quotaLabel = quota ? `${fmtGB(quota.used)} / ${fmtGB(quota.total)}` : `— / ${rc.quota}`;

  const TAB_LABELS = { dashboard:'Tableau de bord', explorer:'Explorateur', submissions:'Soumissions', settings:'Paramètres' };

  const Breadcrumb = () => {
    const parts = currentPath.split('/').filter(Boolean);
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
        <span onClick={() => handleNavigate('/')} style={{ color:N.primary, fontSize:'12px', cursor:'pointer', fontWeight:'500' }}>Accueil</span>
        {parts.map((part, i) => {
          const path = '/' + parts.slice(0, i+1).join('/');
          return (
            <React.Fragment key={path}>
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize:'9px', color:N.onVariant }} />
              <span onClick={() => handleNavigate(path)} style={{ color: i===parts.length-1 ? N.onSurface : N.primary, fontSize:'12px', cursor:'pointer' }}>{part}</span>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:'100vh', background:N.bg, fontFamily:'Inter,sans-serif', color:N.onSurface, paddingBottom:'80px' }}>

      {/* ─── TOP BAR ─── */}
      <header style={{ position:'sticky', top:0, zIndex:40, background:N.surface, borderBottom:`1px solid ${N.outline}20`, boxShadow:'0 1px 12px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 24px', height:'64px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
            <button style={{ background:'none', border:'none', color:N.onSurface, cursor:'pointer', padding:'6px' }}>
              <FontAwesomeIcon icon={faBars} style={{ fontSize:'18px' }} />
            </button>
            <h1 style={{ color:N.onSurface, fontSize:'18px', fontWeight:'700', margin:0 }}>Gougoul Holocron</h1>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'99px', fontSize:'12px' }}>
              <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:N.secondary, boxShadow:`0 0 8px ${N.secondary}60` }} />
              <span style={{ color:N.onVariant }}>Serveur Opérationnel</span>
            </div>
            <button style={{ width:'38px', height:'38px', background:N.surfaceHigh, border:`1px solid ${N.outline}`, borderRadius:'10px', color:N.onVariant, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <FontAwesomeIcon icon={faBell} style={{ fontSize:'15px' }} />
            </button>
            <div style={{ width:'38px', height:'38px', borderRadius:'50%', cursor:'pointer', background:`linear-gradient(135deg, ${rc.color}, ${rc.color}80)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'800', color:N.bg, border:`2px solid ${rc.color}40` }}>{initials}</div>
          </div>
        </div>
      </header>

      {/* ─── MAIN ─── */}
      <main style={{ maxWidth:'1280px', margin:'0 auto', padding:'28px 24px' }}>

        <div style={{ marginBottom:'24px' }}>
          <h2 style={{ color:N.onSurface, fontSize:'28px', fontWeight:'700', margin:0 }}>
            {tab === 'dashboard' ? `Bonjour, ${user?.prenom} 👋` : TAB_LABELS[tab]}
          </h2>
          {tab === 'dashboard' && (
            <p style={{ color:N.onVariant, fontSize:'15px', marginTop:'6px' }}>Bienvenue dans votre espace de stockage et de ressources universitaires.</p>
          )}
        </div>

        {/* ══ DASHBOARD ══ */}
        {tab === 'dashboard' && (
          <div>
            <AIWidget aiQuery={aiQuery} setAiQuery={setAiQuery} aiAsked={aiAsked} onAsk={handleAsk} />
            <div style={{ display:'grid', gridTemplateColumns:'repeat(12, 1fr)', gap:'20px' }}>

              <div style={{ gridColumn:'span 8' }}>
                <div style={{ ...glass({ padding:'20px' }) }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                    <h3 style={{ color:N.primary, fontSize:'16px', fontWeight:'600', display:'flex', alignItems:'center', gap:'8px', margin:0 }}>
                      <FontAwesomeIcon icon={faClockRotateLeft} /> Ressources Récentes
                    </h3>
                    <button onClick={() => setTab('explorer')} style={{ background:'none', border:'none', color:N.primary, fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Tout voir</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                    {RECENT_FILES.map((f,i) => <RecentFileCard key={i} item={f} />)}
                  </div>
                </div>
              </div>

              <div style={{ gridColumn:'span 4', display:'flex', flexDirection:'column', gap:'16px' }}>
                <div style={{ ...glass({ padding:'20px' }) }}>
                  <h3 style={{ color:N.onVariant, fontSize:'11px', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:'14px' }}>État du Système</h3>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'18px' }}>
                    <div style={{ position:'relative', width:'12px', height:'12px' }}>
                      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:N.secondary, opacity:0.6 }} />
                      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:N.secondary }} />
                    </div>
                    <span style={{ color:N.onSurface, fontSize:'16px', fontWeight:'700' }}>Connecté</span>
                  </div>
                  <div style={{ marginBottom:'8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', marginBottom:'6px' }}>
                      <span style={{ color:N.onVariant }}>Mon stockage</span>
                      <span style={{ color:N.onSurface }}>{quotaLabel}</span>
                    </div>
                    <div style={{ width:'100%', background:N.surfaceTop, borderRadius:'99px', height:'6px', overflow:'hidden' }}>
                      <div style={{ width:`${qpct}%`, height:'100%', background:N.primary, borderRadius:'99px', transition:'width 0.4s' }} />
                    </div>
                  </div>
                  <button onClick={() => setTab('settings')} style={{ marginTop:'16px', width:'100%', padding:'10px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Gérer le stockage</button>
                </div>
                {isProf && (
                  <div style={{ ...glass({ padding:'20px', cursor:'pointer' }) }}>
                    <FontAwesomeIcon icon={faUsers} style={{ color:N.tertiary, fontSize:'26px', marginBottom:'10px' }} />
                    <div style={{ fontSize:'28px', fontWeight:'800', color:N.onSurface, marginBottom:'4px' }}>{stats ? stats.students : '—'}</div>
                    <div style={{ fontSize:'13px', color:N.onVariant }}>Étudiants Actifs</div>
                  </div>
                )}
              </div>

              <div style={{ gridColumn:'span 12' }}>
                <h3 style={{ fontSize:'18px', fontWeight:'600', color:N.onSurface, marginBottom:'14px', display:'flex', alignItems:'center', gap:'8px' }}>
                  <FontAwesomeIcon icon={faFolder} />
                  {isProf ? 'Gestion des Cours' : 'Vos dossiers partagés'}
                  {isProf && (
                    <button onClick={() => setTab('explorer')} style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:'6px', padding:'8px 14px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                      <FontAwesomeIcon icon={faFolderPlus} style={{ fontSize:'12px' }} /> Nouveau Cours
                    </button>
                  )}
                </h3>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))', gap:'14px' }}>
                  {(isProf ? COURSE_FOLDERS : SHARED_FOLDERS).map((f,i) => <FolderCard key={i} folder={f} showBar={isProf} />)}
                </div>
              </div>

              {/* Soumissions récentes (prof) — DONNÉES RÉELLES */}
              {isProf && (
                <div style={{ gridColumn:'span 12' }}>
                  <div style={{ ...glass({ padding:0, overflow:'hidden' }) }}>
                    <div style={{ padding:'18px 20px', borderBottom:`1px solid ${N.outline}30`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <h3 style={{ color:N.onSurface, fontSize:'16px', fontWeight:'600', margin:0 }}>Soumissions Récentes</h3>
                      <button onClick={() => setTab('submissions')} style={{ background:'none', border:'none', color:N.primary, fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Voir tout</button>
                    </div>
                    <div style={{ padding:'12px 8px' }}>
                      {received.filter(g => g.submissions && g.submissions.length).length === 0 ? (
                        <p style={{ color:N.onVariant, fontSize:'13px', padding:'16px 12px', margin:0 }}>Aucune soumission pour le moment.</p>
                      ) : received.filter(g => g.submissions && g.submissions.length).map((group) => (
                        <div key={group.id}>
                          <button onClick={() => toggleFolder(`sub_${group.id}`)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'none', border:'none', cursor:'pointer', borderRadius:'8px', textAlign:'left', fontFamily:'Inter,sans-serif' }}
                            onMouseEnter={e => e.currentTarget.style.background=N.surfaceHigh}
                            onMouseLeave={e => e.currentTarget.style.background='none'}
                          >
                            <FontAwesomeIcon icon={openFolders[`sub_${group.id}`] ? faChevronDown : faChevronRight} style={{ color:N.onVariant, fontSize:'11px', width:'12px' }} />
                            <FontAwesomeIcon icon={faBookOpen} style={{ color:N.primary, fontSize:'16px' }} />
                            <span style={{ color:N.onSurface, fontSize:'14px', fontWeight:'600' }}>{group.titre}</span>
                            <span style={{ marginLeft:'auto', background:`${N.primary}20`, color:N.primary, fontSize:'10px', fontWeight:'700', padding:'2px 8px', borderRadius:'99px' }}>{group.submissions.length} rendu{group.submissions.length>1?'s':''}</span>
                          </button>
                          {openFolders[`sub_${group.id}`] && (
                            <div style={{ marginLeft:'32px', marginBottom:'4px' }}>
                              {group.submissions.map((item) => (
                                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 12px', borderRadius:'8px' }}>
                                  <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:N.primaryDim, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', color:N.primary }}>{(item.etudiant_nom||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <span style={{ color:N.onSurface, fontSize:'13px', fontWeight:'500' }}>{item.etudiant_nom}</span>
                                    <span style={{ color:N.onVariant, fontSize:'12px', marginLeft:'6px' }}>— {item.fichier_nom}</span>
                                  </div>
                                  <span style={{ color:N.onVariant, fontSize:'11px', flexShrink:0 }}>{fmtDate(item.submitted_at)}</span>
                                  <button onClick={() => handleDownloadSub(item.id, item.fichier_nom)} style={{ background:N.primaryDim, border:'none', borderRadius:'6px', padding:'6px 10px', color:N.primary, cursor:'pointer' }}>
                                    <FontAwesomeIcon icon={faDownload} style={{ fontSize:'12px' }} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ EXPLORER (WebDAV réel) ══ */}
        {tab === 'explorer' && (
          <div>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
              <div>
                <p style={{ color:N.onVariant, fontSize:'13px', margin:'0 0 6px' }}>Quota : {quotaLabel}</p>
                <Breadcrumb />
              </div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <button onClick={() => setShowNewFolder(!showNewFolder)} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'10px 16px', background:N.surfaceHigh, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={faFolderPlus} style={{ fontSize:'13px' }} /> Nouveau dossier
                </button>
                <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={handleUpload} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'10px 16px', background:N.primary, border:'none', borderRadius:'8px', color:'#131e8c', fontSize:'13px', fontWeight:'700', cursor: uploading?'not-allowed':'pointer', fontFamily:'Inter,sans-serif', opacity:uploading?0.7:1 }}>
                  <FontAwesomeIcon icon={uploading ? faSpinner : faUpload} style={{ fontSize:'13px' }} />
                  {uploading ? `${uploadPct}%` : 'Uploader'}
                </button>
              </div>
            </div>

            {uploading && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ width:'100%', background:N.surfaceTop, borderRadius:'99px', height:'4px', overflow:'hidden', marginBottom:'4px' }}>
                  <div style={{ width:`${uploadPct}%`, height:'100%', background:N.primary, borderRadius:'99px', transition:'width 0.3s' }} />
                </div>
                <p style={{ color:N.onVariant, fontSize:'12px', margin:0 }}>Upload en cours... {uploadPct}%</p>
              </div>
            )}

            {showNewFolder && (
              <div style={{ ...glass({ padding:'14px' }), marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                <FontAwesomeIcon icon={faFolderPlus} style={{ color:N.primary, fontSize:'16px' }} />
                <input value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Nom du dossier" onKeyDown={e => e.key==='Enter' && handleCreateFolder()}
                  style={{ flex:1, minWidth:'160px', padding:'9px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif' }}
                />
                <button onClick={handleCreateFolder} style={{ padding:'9px 16px', background:N.primary, border:'none', borderRadius:'8px', color:'#131e8c', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Créer</button>
                <button onClick={() => { setShowNewFolder(false); setNewFolder(''); }} style={{ padding:'9px 12px', background:'none', border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onVariant, fontSize:'13px', cursor:'pointer' }}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            )}

            {filesLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:N.onVariant }}>
                <FontAwesomeIcon icon={faSpinner} style={{ fontSize:'28px', marginBottom:'12px', display:'block' }} /> Chargement...
              </div>
            ) : files.length === 0 ? (
              <div style={{ ...glass({ padding:'64px 32px', textAlign:'center' }) }}>
                <div style={{ width:'80px', height:'80px', background:'rgba(189,194,255,0.1)', borderRadius:'20px', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                  <FontAwesomeIcon icon={faFolder} style={{ color:N.primary, fontSize:'36px' }} />
                </div>
                <h3 style={{ color:N.onSurface, fontSize:'18px', fontWeight:'600', marginBottom:'8px' }}>Votre espace est vide</h3>
                <p style={{ color:N.onVariant, fontSize:'14px', marginBottom:'24px', lineHeight:'1.6' }}>Uploadez vos premiers fichiers pour organiser vos ressources académiques.</p>
                <button onClick={() => fileInputRef.current?.click()} style={{ padding:'12px 28px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'10px', fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={faUpload} style={{ fontSize:'13px' }} /> Uploader un fichier
                  <FontAwesomeIcon icon={faArrowRight} style={{ fontSize:'12px' }} />
                </button>
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'12px' }}>
                {currentPath !== '/' && (
                  <div onClick={() => handleNavigate(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/')}
                    style={{ ...glass({ padding:'16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px' }), transition:'all 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor=`${N.primary}50`}
                    onMouseLeave={e => e.currentTarget.style.borderColor=`${N.outline}40`}
                  >
                    <FontAwesomeIcon icon={faFolder} style={{ color:N.onVariant, fontSize:'24px' }} />
                    <span style={{ color:N.onVariant, fontSize:'13px' }}>.. Dossier parent</span>
                  </div>
                )}
                {files.map((file, i) => (
                  <ExplorerCard key={i} file={file} onNavigate={handleNavigate} onDownload={handleDownload} onDelete={handleDelete} isProf={isProf} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SUBMISSIONS (DONNÉES RÉELLES) ══ */}
        {tab === 'submissions' && (
          <div>
            {/* Input caché commun aux dépôts étudiants */}
            <input ref={submitInputRef} type="file" style={{ display:'none' }} onChange={handleSubmitFile} />

            {subLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:N.onVariant }}>
                <FontAwesomeIcon icon={faSpinner} style={{ fontSize:'28px', marginBottom:'12px', display:'block' }} /> Chargement...
              </div>
            ) : !isProf ? (
              /* ── VUE ÉTUDIANT ── */
              <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                <p style={{ color:N.onVariant, fontSize:'14px', marginBottom:'8px' }}>Déposez vos travaux et suivez le statut de vos soumissions.</p>
                {assignments.length === 0 ? (
                  <div style={{ ...glass({ padding:'48px 24px', textAlign:'center' }) }}>
                    <FontAwesomeIcon icon={faBookOpen} style={{ color:N.primary, fontSize:'32px', marginBottom:'12px' }} />
                    <p style={{ color:N.onSurface, fontSize:'15px', fontWeight:'600', margin:'0 0 4px' }}>Aucun devoir pour l'instant</p>
                    <p style={{ color:N.onVariant, fontSize:'13px', margin:0 }}>Les devoirs de votre filière apparaîtront ici.</p>
                  </div>
                ) : assignments.map((a) => {
                  const done = submittedIds.has(a.id);
                  return (
                    <div key={a.id} style={{ ...glass({ padding:'18px' }), display:'flex', alignItems:'center', gap:'16px' }}>
                      <div style={{ width:'44px', height:'44px', flexShrink:0, borderRadius:'10px', background:done?N.secondaryDim:N.primaryDim, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <FontAwesomeIcon icon={done?faCircleCheck:faCloudArrowUp} style={{ fontSize:'20px', color:done?N.secondary:N.primary }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:N.onSurface, fontSize:'14px', fontWeight:'600', marginBottom:'4px' }}>{a.titre}</p>
                        <p style={{ color:N.onVariant, fontSize:'12px', margin:0 }}>
                          {a.filiere}{a.date_limite ? ` — Pour le ${fmtDate(a.date_limite)}` : ''}{a.prof_nom ? ` • ${a.prof_nom}` : ''}
                        </p>
                      </div>
                      {done ? (
                        <span style={{ color:N.secondary, fontSize:'12px', fontWeight:'700', display:'flex', alignItems:'center', gap:'5px' }}>
                          <FontAwesomeIcon icon={faCheckCircle} style={{ fontSize:'13px' }} /> Soumis
                        </span>
                      ) : (
                        <button onClick={() => triggerSubmit(a.id)} style={{ padding:'8px 16px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontFamily:'Inter,sans-serif' }}>
                          <FontAwesomeIcon icon={faUpload} style={{ fontSize:'12px' }} /> Soumettre
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── VUE PROF / ASSISTANT ── */
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
                  <p style={{ color:N.onVariant, fontSize:'14px', margin:0 }}>Travaux rendus par vos étudiants, organisés par devoir.</p>
                  <button onClick={() => setShowNewAssign(!showNewAssign)} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'10px 16px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize:'12px' }} /> Nouveau devoir
                  </button>
                </div>

                {/* Formulaire nouveau devoir */}
                {showNewAssign && (
                  <div style={{ ...glass({ padding:'20px' }), marginBottom:'20px' }}>
                    <h3 style={{ color:N.onSurface, fontSize:'15px', fontWeight:'700', margin:'0 0 16px', display:'flex', alignItems:'center', gap:'8px' }}>
                      <FontAwesomeIcon icon={faBookOpen} style={{ color:N.primary, fontSize:'14px' }} /> Créer un devoir
                    </h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      <input value={newAssign.titre} onChange={e => setNewAssign(p => ({ ...p, titre:e.target.value }))} placeholder="Titre du devoir"
                        style={{ padding:'11px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif' }} />
                      <textarea value={newAssign.description} onChange={e => setNewAssign(p => ({ ...p, description:e.target.value }))} placeholder="Description (optionnelle)" rows={3}
                        style={{ padding:'11px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif', resize:'vertical' }} />
                      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                        <select value={newAssign.filiere} onChange={e => setNewAssign(p => ({ ...p, filiere:e.target.value }))}
                          style={{ flex:1, minWidth:'180px', padding:'11px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif' }}>
                          {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <input type="date" value={newAssign.date_limite} onChange={e => setNewAssign(p => ({ ...p, date_limite:e.target.value }))}
                          style={{ flex:1, minWidth:'160px', padding:'11px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif' }} />
                      </div>
                      <div style={{ display:'flex', gap:'10px' }}>
                        <button onClick={handleCreateAssign} style={{ padding:'11px 20px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Créer le devoir</button>
                        <button onClick={() => setShowNewAssign(false)} style={{ padding:'11px 16px', background:'none', border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onVariant, fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Annuler</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Liste des devoirs + rendus */}
                {received.length === 0 ? (
                  <div style={{ ...glass({ padding:'48px 24px', textAlign:'center' }) }}>
                    <FontAwesomeIcon icon={faBookOpen} style={{ color:N.primary, fontSize:'32px', marginBottom:'12px' }} />
                    <p style={{ color:N.onSurface, fontSize:'15px', fontWeight:'600', margin:'0 0 4px' }}>Aucun devoir créé</p>
                    <p style={{ color:N.onVariant, fontSize:'13px', margin:0 }}>Créez un devoir pour recevoir les rendus des étudiants.</p>
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {received.map((group) => (
                      <div key={group.id} style={{ ...glass({ padding:0, overflow:'hidden' }) }}>
                        <button onClick={() => toggleFolder(`sview_${group.id}`)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif', borderBottom:openFolders[`sview_${group.id}`]!==false?`1px solid ${N.outline}30`:'none' }}>
                          <FontAwesomeIcon icon={openFolders[`sview_${group.id}`]!==false?faChevronDown:faChevronRight} style={{ color:N.onVariant, fontSize:'11px' }} />
                          <FontAwesomeIcon icon={faBookOpen} style={{ color:N.primary, fontSize:'20px' }} />
                          <div style={{ textAlign:'left', flex:1, minWidth:0 }}>
                            <span style={{ color:N.onSurface, fontSize:'15px', fontWeight:'700', display:'block' }}>{group.titre}</span>
                            <span style={{ color:N.onVariant, fontSize:'12px' }}>{group.filiere}{group.date_limite ? ` — ${fmtDate(group.date_limite)}` : ''}</span>
                          </div>
                          <span style={{ marginLeft:'auto', color:N.primary, fontSize:'12px', fontWeight:'600' }}>{group.submissions.length} rendu{group.submissions.length>1?'s':''}</span>
                        </button>
                        {openFolders[`sview_${group.id}`]!==false && (
                          <div>
                            {group.submissions.length === 0 ? (
                              <p style={{ color:N.onVariant, fontSize:'13px', padding:'14px 18px', margin:0 }}>Aucun rendu pour ce devoir.</p>
                            ) : group.submissions.map((item, ii) => (
                              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 18px', borderBottom:ii<group.submissions.length-1?`1px solid ${N.outline}20`:'none' }}>
                                <div style={{ width:'32px', height:'32px', borderRadius:'50%', flexShrink:0, background:N.primaryDim, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', color:N.primary }}>{(item.etudiant_nom||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <span style={{ color:N.onSurface, fontSize:'13px', fontWeight:'600' }}>{item.etudiant_nom}</span>
                                  <span style={{ color:N.onVariant, fontSize:'12px', marginLeft:'8px' }}>— {item.fichier_nom}</span>
                                </div>
                                <span style={{ color:N.onVariant, fontSize:'12px' }}>{fmtDate(item.submitted_at)}</span>
                                <button onClick={() => handleDownloadSub(item.id, item.fichier_nom)} style={{ background:N.primaryDim, border:'none', borderRadius:'6px', padding:'6px 10px', color:N.primary, cursor:'pointer' }}>
                                  <FontAwesomeIcon icon={faDownload} style={{ fontSize:'13px' }} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ SETTINGS ══ */}
        {tab === 'settings' && (
          <div style={{ maxWidth:'600px' }}>
            <div style={{ ...glass({ padding:'24px', marginBottom:'16px' }) }}>
              <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
                <div style={{ width:'64px', height:'64px', borderRadius:'50%', flexShrink:0, background:`linear-gradient(135deg, ${rc.color}, ${rc.color}60)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'800', color:N.bg, boxShadow:`0 0 20px ${rc.color}40` }}>{initials}</div>
                <div>
                  <h3 style={{ color:N.onSurface, fontSize:'18px', fontWeight:'700', marginBottom:'6px' }}>{info.prenom} {info.nom}</h3>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                    <FontAwesomeIcon icon={rc.icon} style={{ color:rc.color, fontSize:'13px' }} />
                    <span style={{ color:rc.color, fontSize:'13px', fontWeight:'600' }}>{rc.label}</span>
                    {info.filiere && <span style={{ background:N.surfaceTop, color:N.onVariant, fontSize:'11px', padding:'2px 8px', borderRadius:'99px' }}>{info.filiere}</span>}
                  </div>
                </div>
              </div>
              {[
                { icon:faIdCard,       label:'Matricule',         value:info.matricule           },
                { icon:faEnvelope,     label:'Email',             value:info.email               },
                { icon:faHardDrive,    label:'Quota de stockage', value:quota ? quotaLabel : rc.quota },
                { icon:faShieldHalved, label:'Compte Nextcloud',  value:info.nextcloud_username   },
              ].map((item,i,arr) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom:i<arr.length-1?`1px solid ${N.outline}30`:'none' }}>
                  <div style={{ width:'34px', height:'34px', flexShrink:0, background:N.surfaceTop, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <FontAwesomeIcon icon={item.icon} style={{ color:N.onVariant, fontSize:'13px' }} />
                  </div>
                  <div>
                    <p style={{ color:N.onVariant, fontSize:'11px', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'600' }}>{item.label}</p>
                    <p style={{ color:N.onSurface, fontSize:'14px', fontWeight:'500', margin:0 }}>{item.value||'—'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...glass({ padding:'24px', marginBottom:'16px' }) }}>
              <h3 style={{ color:N.onSurface, fontSize:'15px', fontWeight:'700', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
                <FontAwesomeIcon icon={faLock} style={{ color:N.primary, fontSize:'14px' }} /> Changer le mot de passe
              </h3>
              {['current','next','confirm'].map((field,i) => {
                const labels = ['Mot de passe actuel','Nouveau mot de passe','Confirmer le nouveau'];
                return (
                  <div key={field} style={{ marginBottom:'12px' }}>
                    <label style={{ display:'block', color:N.onVariant, fontSize:'11px', fontWeight:'600', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:'6px' }}>{labels[i]}</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPw[field]?'text':'password'} placeholder="••••••••" value={pwForm[field]}
                        onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                        style={{ width:'100%', padding:'11px 44px 11px 14px', background:N.surfaceLow, border:`1px solid ${N.outline}`, borderRadius:'8px', color:N.onSurface, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }}
                      />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                        style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:N.onVariant, cursor:'pointer' }}>
                        <FontAwesomeIcon icon={showPw[field]?faEyeSlash:faEye} style={{ fontSize:'14px' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
              <p style={{ color:N.onVariant, fontSize:'11px', margin:'0 0 10px' }}>Le changement de mot de passe côté serveur arrive prochainement.</p>
              <button style={{ marginTop:'4px', padding:'11px 20px', background:N.primary, color:'#131e8c', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontFamily:'Inter,sans-serif' }}>
                <FontAwesomeIcon icon={faFloppyDisk} style={{ fontSize:'13px' }} /> Sauvegarder
              </button>
            </div>

            <button onClick={handleLogout} style={{ width:'100%', padding:'13px', background:'rgba(255,180,171,0.08)', border:'1px solid rgba(255,180,171,0.25)', borderRadius:'10px', color:N.error, fontSize:'14px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', fontFamily:'Inter,sans-serif', transition:'all 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.background='rgba(255,180,171,0.14)'}
              onMouseLeave={e => e.currentTarget.style.background='rgba(255,180,171,0.08)'}
            >
              <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize:'14px' }} /> Se déconnecter
            </button>
          </div>
        )}
      </main>

      {/* ─── BOTTOM NAV ─── */}
      <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, background:`${N.surfaceLow}cc`, backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderTop:`1px solid ${N.outline}20`, boxShadow:'0 -4px 20px rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth:'1280px', margin:'0 auto', display:'flex', justifyContent:'space-around', padding:'10px 16px' }}>
          {[
            { id:'dashboard',   icon:faHouse,        label:'Dashboard'   },
            { id:'explorer',    icon:faFolderOpen,   label:'Explorer'    },
            { id:'submissions', icon:faCloudArrowUp, label:'Submissions' },
            { id:'settings',    icon:faGear,         label:'Settings'    },
          ].map(item => {
            const active = tab === item.id;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', padding:'6px 16px', borderRadius:'99px', border:'none', background:active?`${N.secondary}25`:'none', color:active?N.secondary:N.onVariant, cursor:'pointer', transition:'all 0.2s', fontFamily:'Inter,sans-serif', minWidth:'64px' }}>
                <FontAwesomeIcon icon={item.icon} style={{ fontSize:'20px', transition:'transform 0.2s', transform:active?'scale(1.1)':'scale(1)' }} />
                <span style={{ fontSize:'11px', fontWeight:active?'700':'400' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ─── BOUTON IA FLOTTANT ─── */}
      {tab !== 'dashboard' && (
        <button onClick={() => setTab('dashboard')} title="Assistant IA" style={{ position:'fixed', bottom:'88px', right:'20px', zIndex:50, width:'52px', height:'52px', borderRadius:'50%', background:N.primary, border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 4px 20px ${N.primary}50`, transition:'all 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.transform='scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}
        >
          <FontAwesomeIcon icon={faRobot} style={{ fontSize:'22px', color:'#131e8c' }} />
        </button>
      )}
    </div>
  );
}
