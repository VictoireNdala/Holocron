import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHouse, faFolderOpen, faCloudArrowUp, faGear, faBars,
  faFileLines, faFolder, faFolderPlus, faDownload, faTrash, faTable,
  faUsers, faHardDrive, faShieldHalved,
  faUserGraduate, faUserTie, faArrowRight,
  faRightFromBracket, faPlus,
  faLock, faUpload, faIdCard, faEnvelope,
  faEye, faEyeSlash, faFile, faFileZipper,
  faChevronDown, faChevronRight, faBookOpen, faArrowLeft, faCheckSquare, faSquare,
  faCircleCheck, faFloppyDisk, faSpinner, faXmark,
  faTrashCan, faRotateLeft, faMoon, faSun, faPen, faMagnifyingGlass, faBell
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../context/AuthContext';
import {
  getProfile, logout, changePassword,
  listFiles, uploadFile, downloadFile, createFolder, deleteFile, moveFile,
  getQuota, getSharedFolders,
  listAssignments, createAssignment, submitAssignment,
  getMySubmissions, getReceivedSubmissions, downloadSubmission,
  getTrash, restoreTrash, purgeTrashItem, emptyTrash,
  listCommunityResources, getFilePreview,
  listNotifications, markNotificationRead, markAllNotificationsRead
} from '../services/api';
import { getTokens } from '../theme/tokens';
import CommunitySpace from '../components/CommunitySpace';
import AdminPanel from '../components/AdminPanel';

// Filières réelles (options du formulaire "Nouveau devoir")
const FILIERES = ['Genie Logiciel', 'Intelligence Artificielle', 'Systemes Informatiques'];

// ── Helpers ─────────────────────────────────────────────────────────────────
const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return '';
  if (bytes < 1024)      return `${bytes} o`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} Ko`;
  return `${(bytes/(1024*1024)).toFixed(1)} Mo`;
};
const fmtGB = (b) => {
  if (b == null) return '—';
  const kb=b/1024, mb=kb/1024, gb=mb/1024;
  if (gb >= 1) return `${gb.toFixed(2)} Go`;
  if (mb >= 1) return `${mb.toFixed(1)} Mo`;
  if (kb >= 1) return `${kb.toFixed(0)} Ko`;
  return `${b} o`;
};
const getFileIcon = (file) => {
  if (file.isDirectory) return faFolder;
  const m = file.mimeType || '';
  if (m.includes('pdf'))   return faFileLines;
  if (m.includes('zip') || m.includes('archive')) return faFileZipper;
  if (m.includes('sheet') || m.includes('excel')) return faTable;
  if (m.includes('text'))  return faFile;
  return faFile;
};
// F3 — vraie vignette via l'API Preview Nextcloud proxifiée par le backend,
// repli silencieux sur l'icône générique si la prévisualisation échoue
// (provider désactivé côté serveur, type non supporté, fileId absent...).
// La liste couvre aussi les types Office/OpenDocument : Nextcloud ne les
// prévisualise que si le provider correspondant est activé côté serveur
// (imagick + LibreOffice, ou Collabora/OnlyOffice) — pas encore confirmé/
// activé à ce jour (voir CONTEXT.md). Les inclure ici ne coûte rien tant
// que ce n'est pas fait (l'échec retombe silencieusement sur l'icône) et
// évite un futur redéploiement le jour où le provider est activé côté infra.
const PREVIEWABLE_MIME = /^(image|video|text)\//;
const PREVIEWABLE_EXACT = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       // .xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.presentation'
]);
function FilePreview({ T, file, previewSize = 160, iconSize = 16 }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  const canPreview = !!file.fileId && (PREVIEWABLE_MIME.test(file.mimeType || '') || PREVIEWABLE_EXACT.has(file.mimeType));

  useEffect(() => {
    if (!canPreview) return;
    let objectUrl;
    getFilePreview(file.fileId, previewSize)
      .then(res => { objectUrl = URL.createObjectURL(res.data); setUrl(objectUrl); })
      .catch(() => setFailed(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file.fileId, canPreview, previewSize]);

  if (canPreview && url && !failed) {
    return <img src={url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover', borderRadius:'inherit', display:'block' }} />;
  }
  return <FontAwesomeIcon icon={getFileIcon(file)} style={{ fontSize: iconSize, color:T.textMuted }} />;
}
const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'short' }); }
  catch { return d; }
};
const fmtTimestamp = (ts) => {
  if (!ts) return '';
  try { return new Date(ts * 1000).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' }); }
  catch { return ''; }
};

// ── Carte plate (Slate & Citrus : pas de bordure, élévation par luminosité) ──
const card = (T, extra = {}) => ({ background:T.surface, borderRadius:'6px', ...extra });

// ── Sous-composants ──────────────────────────────────────────────────────────
function StatusBadge({ T, label, tone }) {
  // tone: 'accent' | 'neutral' | 'danger' — les statuts restent neutres par
  // défaut (un seul accent dans toute l'interface, voir DECISIONS.md).
  const bg = tone === 'accent' ? T.accentDim : tone === 'danger' ? T.dangerDim : T.surfaceAlt;
  const color = tone === 'accent' ? T.accent : tone === 'danger' ? T.danger : T.textMuted;
  return (
    <span style={{ fontSize:'11.5px', fontWeight:'600', padding:'5px 12px', borderRadius:'12px', background:bg, color, whiteSpace:'nowrap', flexShrink:0 }}>{label}</span>
  );
}

function FileTile({ T, name, meta, icon }) {
  return (
    <div style={{ ...card(T, { padding:'16px' }) }}>
      <div style={{ width:'34px', height:'34px', borderRadius:'8px', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:'12px' }}>
        <FontAwesomeIcon icon={icon} style={{ color:T.textMuted, fontSize:'14px' }} />
      </div>
      <div style={{ fontSize:'13px', fontWeight:'600', color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', marginBottom:'6px' }}>{name}</div>
      <div style={{ fontSize:'12px', color:T.textMuted }}>{meta}</div>
    </div>
  );
}

function CourseCard({ T, name, meta, onClick }) {
  return (
    <div onClick={onClick} style={{ ...card(T, { padding:'18px', cursor: onClick ? 'pointer' : 'default' }) }}>
      <FontAwesomeIcon icon={faFolder} style={{ color:T.textMuted, fontSize:'26px', marginBottom:'12px', display:'block' }} />
      <div style={{ fontSize:'14px', fontWeight:'600', color:T.text, marginBottom:'4px' }}>{name}</div>
      <div style={{ fontSize:'12px', color:T.textMuted }}>{meta}</div>
    </div>
  );
}

// Carte "devoir" — le titre est limité à 1 ligne + ellipsis pour éviter le
// chevauchement avec le sous-titre (bug relevé sur les 6 rendus du Prompt 1
// d'exploration : un titre long passait sur 2 lignes et recouvrait la ligne
// du dessous). Voir ROADMAP.md "Points de vigilance visuels".
function AssignmentRow({ T, title, subtitle, badge }) {
  return (
    <div style={{ ...card(T, { padding:'16px' }), display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px' }}>
      <div style={{ minWidth:0 }}>
        <div style={{ fontSize:'13.5px', fontWeight:'600', color:T.text, marginBottom:'3px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }} title={title}>{title}</div>
        <div style={{ fontSize:'12px', color:T.textMuted, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{subtitle}</div>
      </div>
      {badge}
    </div>
  );
}

function ExplorerCard({ T, file, onNavigate, onDownload, onDelete, onRename, canDelete, selectMode, selected, onToggleSelect }) {
  return (
    <div style={{ ...card(T, { padding:'16px', cursor:'pointer', display:'flex', flexDirection:'column', gap:'10px', position:'relative' }) }}>
      {selectMode && (
        <FontAwesomeIcon icon={selected ? faCheckSquare : faSquare} onClick={() => onToggleSelect(file.path)}
          style={{ position:'absolute', top:'10px', right:'10px', fontSize:'16px', color: selected ? T.accent : T.textMuted, cursor:'pointer' }} />
      )}
      {!selectMode && canDelete && (
        <FontAwesomeIcon icon={faPen} onClick={() => onRename(file)}
          style={{ position:'absolute', top:'12px', right:'12px', fontSize:'12px', color:T.textMuted, cursor:'pointer' }} />
      )}
      {file.isDirectory ? (
        <FontAwesomeIcon icon={faFolder} onClick={() => onNavigate(file.path)} style={{ fontSize:'32px', color:T.textMuted }} />
      ) : (
        <div style={{ width:'56px', height:'56px', borderRadius:'8px', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden' }}>
          <FilePreview T={T} file={file} previewSize={160} iconSize={20} />
        </div>
      )}
      <div onClick={() => file.isDirectory ? onNavigate(file.path) : null}>
        <p style={{ color:T.text, fontSize:'13px', fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{file.name}</p>
        <p style={{ color:T.textMuted, fontSize:'11px', marginTop:'2px', margin:0 }}>{file.isDirectory ? 'Dossier' : formatSize(file.size)}</p>
      </div>
      {!file.isDirectory && (
        <div style={{ display:'flex', gap:'6px' }}>
          <button onClick={() => onDownload(file.path)} style={{ flex:1, padding:'7px', background:T.surfaceAlt, border:'none', borderRadius:'6px', color:T.text, fontSize:'11px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', fontFamily:'Inter,sans-serif' }}>
            <FontAwesomeIcon icon={faDownload} style={{ fontSize:'11px' }} /> Télécharger
          </button>
          {canDelete && (
            <button onClick={() => onDelete(file.path)} style={{ padding:'7px 10px', background:T.dangerDim, border:'none', borderRadius:'6px', color:T.danger, fontSize:'11px', cursor:'pointer' }}>
              <FontAwesomeIcon icon={faTrash} style={{ fontSize:'11px' }} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Vue Liste — reproduit la structure du canvas (icône/nom/taille/date en
// ligne), vue par défaut de l'Explorateur.
function ExplorerRow({ T, file, onNavigate, onDownload, onDelete, onRename, canDelete, isLast, selectMode, selected, onToggleSelect }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'12px 16px', borderBottom: isLast ? 'none' : `1px solid ${T.border}` }}>
      {selectMode && (
        <FontAwesomeIcon icon={selected ? faCheckSquare : faSquare} onClick={() => onToggleSelect(file.path)}
          style={{ fontSize:'15px', color: selected ? T.accent : T.textMuted, cursor:'pointer', flexShrink:0 }} />
      )}
      <div onClick={() => file.isDirectory && onNavigate(file.path)} style={{ width:'30px', height:'30px', borderRadius:'8px', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, cursor: file.isDirectory ? 'pointer' : 'default', overflow:'hidden' }}>
        {file.isDirectory ? <FontAwesomeIcon icon={faFolder} style={{ fontSize:'13px', color:T.textMuted }} /> : <FilePreview T={T} file={file} previewSize={80} iconSize={13} />}
      </div>
      <div onClick={() => file.isDirectory && onNavigate(file.path)} style={{ flex:1, minWidth:0, fontSize:'13.5px', fontWeight:'600', color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', cursor: file.isDirectory ? 'pointer' : 'default' }}>{file.name}</div>
      <div style={{ width:'80px', fontSize:'12.5px', color:T.textMuted, flexShrink:0 }}>{file.isDirectory ? 'Dossier' : formatSize(file.size)}</div>
      <div style={{ width:'80px', fontSize:'12.5px', color:T.textMuted, flexShrink:0 }}>{fmtDate(file.modified)}</div>
      <div style={{ display:'flex', gap:'10px', flexShrink:0 }}>
        {!file.isDirectory && <span onClick={() => onDownload(file.path)} style={{ fontSize:'12px', color:T.accent, fontWeight:'600', cursor:'pointer' }}>Télécharger</span>}
        {canDelete && <span onClick={() => onRename(file)} style={{ fontSize:'12px', color:T.textMuted, fontWeight:'600', cursor:'pointer' }}>Renommer</span>}
        {canDelete && !file.isDirectory && <span onClick={() => onDelete(file.path)} style={{ fontSize:'12px', color:T.danger, fontWeight:'600', cursor:'pointer' }}>Supprimer</span>}
      </div>
    </div>
  );
}

function EmptyState({ T, icon, title, text, action }) {
  return (
    <div style={{ ...card(T, { padding:'48px 24px', textAlign:'center' }) }}>
      <FontAwesomeIcon icon={icon} style={{ color:T.textMuted, fontSize:'30px', marginBottom:'14px' }} />
      <p style={{ color:T.text, fontSize:'15px', fontWeight:'600', margin:'0 0 4px' }}>{title}</p>
      <p style={{ color:T.textMuted, fontSize:'13px', margin:0, maxWidth:'340px', marginLeft:'auto', marginRight:'auto', lineHeight:'1.5' }}>{text}</p>
      {action}
    </div>
  );
}

// Champ de saisie réutilisé partout (Nouveau dossier, devoir, mot de passe...)
function TextInput({ T, ...props }) {
  return (
    <input {...props} style={{ padding:'11px 14px', background:T.surfaceAlt, border:'none', borderRadius:'8px', color:T.text, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif', boxSizing:'border-box', ...(props.style||{}) }} />
  );
}

function PrimaryButton({ T, children, ...props }) {
  return (
    <button {...props} style={{ padding:'10px 18px', background:T.accent, color:T.accentText, border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'700', cursor: props.disabled ? 'default' : 'pointer', opacity: props.disabled ? 0.6 : 1, display:'flex', alignItems:'center', justifyContent:'center', gap:'8px', fontFamily:'Inter,sans-serif', ...(props.style||{}) }}>
      {children}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
export default function Dashboard() {
  const navigate = useNavigate();
  const { user, logout: authLogout } = useAuth();

  // ── Thème (Slate & Citrus, clair/sombre réversible) ───────────────────────
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem('holocron_theme') !== 'light'; } catch { return true; }
  });
  useEffect(() => {
    try { localStorage.setItem('holocron_theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);
  const T = getTokens(dark);

  // ── State général ──────────────────────────────────────────────────────────
  const [tab, setTab]           = useState('dashboard');
  const [profile, setProfile]   = useState(null);
  const [quota, setQuota]       = useState(null);   // { used, total, relative }
  const [sharedFolders, setSharedFolders] = useState([]); // Team Folders Cours-* réels
  const [communityPreview, setCommunityPreview] = useState([]); // 3 dernières ressources communautaires (Accueil)
  const [recentFiles, setRecentFiles] = useState([]); // aperçu dashboard (racine, triés par date)
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 768);
  const [showMore, setShowMore] = useState(false); // feuille "Plus" (mobile)
  const [openFolders, setOpenFolders] = useState({});
  const [pwForm, setPwForm]     = useState({ current:'', next:'', confirm:'' });
  const [showPw, setShowPw]     = useState({});
  const [pwStatus, setPwStatus] = useState({ loading:false, error:'', success:'' });

  // ── State Notifications (D3) ────────────────────────────────────────────────
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);

  // ── State Explorer ─────────────────────────────────────────────────────────
  const [files, setFiles]             = useState([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [uploading, setUploading]     = useState(false);
  const [uploadPct, setUploadPct]     = useState(0);
  const [newFolder, setNewFolder]     = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [explorerView, setExplorerView] = useState('list'); // 'list' | 'grid'
  const [explorerSearch, setExplorerSearch] = useState(''); // recherche locale par nom (dossier courant)
  const [selectMode, setSelectMode] = useState(false); // F4 : sélection multiple
  const [selectedPaths, setSelectedPaths] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const fileInputRef                  = useRef(null);
  const uploadControllerRef           = useRef(null); // AbortController de l'upload en cours

  // ── State Submissions ──────────────────────────────────────────────────────
  const [assignments, setAssignments] = useState([]);   // devoirs (étudiant)
  const [mySubs, setMySubs]           = useState([]);   // mes rendus (étudiant)
  const [received, setReceived]       = useState([]);   // rendus reçus (prof), groupés
  const [subLoading, setSubLoading]   = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const submitInputRef                = useRef(null);
  const [showNewAssign, setShowNewAssign] = useState(false);
  const [newAssign, setNewAssign] = useState({ titre:'', description:'', filiere:FILIERES[0], date_limite:'' });

  // ── State Corbeille ─────────────────────────────────────────────────────────
  const [trashItems, setTrashItems] = useState([]);
  const [trashLoading, setTrashLoading] = useState(false);

  const isProf = user?.role === 'professeur' || user?.role === 'assistant';

  // ── Effects ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    // Chargement initial tolérant aux pannes (une erreur n'annule pas le reste)
    (async () => {
      const calls = [getProfile(), getQuota(), listFiles('/')];
      if (isProf) { calls.push(getReceivedSubmissions()); }
      else        { calls.push(listAssignments()); calls.push(getMySubmissions()); }
      const r = await Promise.allSettled(calls);
      if (r[0].status === 'fulfilled') setProfile(r[0].value.data.user);
      if (r[1].status === 'fulfilled') setQuota(r[1].value.data.quota);
      if (r[2].status === 'fulfilled') {
        const sorted = [...(r[2].value.data.files || [])]
          .filter(f => !f.isDirectory)
          .sort((a, b) => new Date(b.modified) - new Date(a.modified))
          .slice(0, 4);
        setRecentFiles(sorted);
      }
      if (isProf) {
        if (r[3]?.status === 'fulfilled') setReceived(r[3].value.data.assignments || []);
      } else {
        if (r[3]?.status === 'fulfilled') setAssignments(r[3].value.data.assignments || []);
        if (r[4]?.status === 'fulfilled') setMySubs(r[4].value.data.submissions || []);
      }
    })();
  }, [isProf]);

  useEffect(() => {
    if (tab === 'explorer') loadFiles(currentPath);
    if (tab === 'submissions') loadSubmissions();
    if (tab === 'trash') loadTrash();
  }, [tab, currentPath]);

  // Détection responsive (sidebar desktop / barre inférieure mobile)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Vrais dossiers partagés (Team Folders Cours-*)
  useEffect(() => {
    getSharedFolders().then(r => setSharedFolders(r.data.folders || [])).catch(() => {});
  }, []);

  // Aperçu Espace communautaire sur l'Accueil (F1 — remplace le texte
  // "Bientôt disponible" figé, le module est fonctionnel depuis le 2026-09-12)
  useEffect(() => {
    listCommunityResources({ sort: 'recent' }).then(r => setCommunityPreview((r.data.resources || []).slice(0, 3))).catch(() => {});
  }, []);

  // Notifications (D3) — chargement initial puis rafraîchissement périodique
  // (pas de WebSocket dans ce projet, un simple polling suffit à l'échelle
  // d'un campus).
  const loadNotifications = () => {
    listNotifications()
      .then(r => { setNotifications(r.data.notifications || []); setUnreadCount(r.data.unread || 0); })
      .catch(() => {});
  };
  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenNotification = async (n) => {
    setShowNotifs(false);
    if (!n.is_read) {
      try { await markNotificationRead(n.id); } catch (_) {}
      setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      setUnreadCount(c => Math.max(0, c - 1));
    }
    if (n.link) setTab(n.link);
  };
  const handleMarkAllRead = async () => {
    try { await markAllNotificationsRead(); } catch (_) {}
    setNotifications(prev => prev.map(x => ({ ...x, is_read: true })));
    setUnreadCount(0);
  };

  // ── Handlers Explorer ───────────────────────────────────────────────────────
  const loadFiles = async (path) => {
    setFilesLoading(true);
    try { const res = await listFiles(path); setFiles(res.data.files || []); }
    catch { setFiles([]); }
    finally { setFilesLoading(false); }
  };
  const handleNavigate = (path) => { setCurrentPath(path); setTab('explorer'); setExplorerSearch(''); };
  const handleUpload = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const controller = new AbortController();
    uploadControllerRef.current = controller;
    const targetPath = `${currentPath === '/' ? '' : currentPath}/${file.name}`;
    setUploading(true);
    try {
      await uploadFile(currentPath, file, p => setUploadPct(Math.round(p.loaded*100/p.total)), controller.signal);
      await loadFiles(currentPath);
    } catch (err) {
      if (err?.code === 'ERR_CANCELED' || err?.name === 'CanceledError') {
        // Annulation volontaire → on tente de supprimer le fichier partiel
        try { await deleteFile(targetPath); } catch (_) {}
        await loadFiles(currentPath);
      } else {
        console.error('Upload:', err);
      }
    } finally {
      setUploading(false); setUploadPct(0); uploadControllerRef.current = null; e.target.value='';
    }
  };
  const handleCancelUpload = () => uploadControllerRef.current?.abort();
  const handleDownload = async (filePath) => {
    try {
      const res = await downloadFile(filePath);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href=url; a.download=filePath.split('/').pop(); a.click();
      URL.revokeObjectURL(url);
    } catch (err) { console.error('Download:', err); }
  };
  const handleDelete = async (path) => {
    if (!window.confirm('Supprimer ce fichier ? Il restera disponible dans la Corbeille.')) return;
    try { await deleteFile(path); await loadFiles(currentPath); }
    catch (err) { console.error('Delete:', err); }
  };
  const handleRename = async (file) => {
    const newName = window.prompt('Nouveau nom :', file.name);
    if (!newName || !newName.trim() || newName.trim() === file.name) return;
    const parentPath = file.path.substring(0, file.path.lastIndexOf('/')) || '/';
    const newPath = `${parentPath === '/' ? '' : parentPath}/${newName.trim()}`;
    try { await moveFile(file.path, newPath); await loadFiles(currentPath); }
    catch (err) { alert(err.response?.data?.message || 'Erreur lors du renommage'); }
  };
  // F4 — sélection multiple : architecture pensée pour accueillir d'autres
  // actions groupées plus tard (partage, déplacement...), mais seule la
  // suppression est demandée pour l'instant.
  const toggleSelect = (path) => {
    setSelectedPaths(prev => {
      const next = new Set(prev);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };
  const handleExitSelectMode = () => { setSelectMode(false); setSelectedPaths(new Set()); };
  const handleBulkDelete = async () => {
    if (selectedPaths.size === 0) return;
    if (!window.confirm(`Supprimer ${selectedPaths.size} élément(s) ? Ils resteront disponibles dans la Corbeille.`)) return;
    setBulkDeleting(true);
    try {
      for (const path of selectedPaths) {
        try { await deleteFile(path); } catch (err) { console.error('Bulk delete:', path, err); }
      }
      setSelectedPaths(new Set());
      await loadFiles(currentPath);
    } finally {
      setBulkDeleting(false);
    }
  };
  const handleChangePassword = async () => {
    setPwStatus({ loading:false, error:'', success:'' });
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      return setPwStatus({ loading:false, error:'Tous les champs sont requis', success:'' });
    }
    if (pwForm.next !== pwForm.confirm) {
      return setPwStatus({ loading:false, error:'Les nouveaux mots de passe ne correspondent pas', success:'' });
    }
    if (pwForm.next.length < 6) {
      return setPwStatus({ loading:false, error:'Le nouveau mot de passe doit contenir au moins 6 caractères', success:'' });
    }
    setPwStatus({ loading:true, error:'', success:'' });
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current:'', next:'', confirm:'' });
      setPwStatus({ loading:false, error:'', success:'Mot de passe changé avec succès' });
    } catch (err) {
      setPwStatus({ loading:false, error: err.response?.data?.message || 'Erreur lors du changement de mot de passe', success:'' });
    }
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

  // ── Handlers Corbeille ───────────────────────────────────────────────────────
  const loadTrash = async () => {
    setTrashLoading(true);
    try { const r = await getTrash(); setTrashItems(r.data.items || []); }
    catch { setTrashItems([]); }
    finally { setTrashLoading(false); }
  };
  const handleRestore = async (trashPath) => {
    try { await restoreTrash(trashPath); await loadTrash(); }
    catch (err) { console.error('Restore:', err); alert('Échec de la restauration.'); }
  };
  const handlePurgeItem = async (trashPath) => {
    if (!window.confirm('Supprimer définitivement cet élément ? Cette action est irréversible.')) return;
    try { await purgeTrashItem(trashPath); await loadTrash(); }
    catch (err) { console.error('PurgeItem:', err); alert('Échec de la suppression définitive.'); }
  };
  const handleEmptyTrash = async () => {
    if (trashItems.length === 0) return;
    if (!window.confirm('Vider entièrement la corbeille ? Cette action est irréversible.')) return;
    try { await emptyTrash(); await loadTrash(); }
    catch (err) { console.error('EmptyTrash:', err); alert('Échec du vidage de la corbeille.'); }
  };

  // ── Handlers généraux ─────────────────────────────────────────────────────────
  const handleLogout = async () => { await logout(); authLogout(); navigate('/'); };
  const toggleFolder = (key) => setOpenFolders(p => ({ ...p, [key]: !p[key] }));

  // ── Dérivés ─────────────────────────────────────────────────────────────────
  const info     = profile || user || {};
  const initials = user ? `${user.prenom?.[0]||''}${user.nom?.[0]||''}`.toUpperCase() : '?';
  const submittedIds = new Set(mySubs.map(s => s.assignment_id));
  const qpct = quota && quota.total ? Math.min(100, Math.round(quota.relative || 0)) : 0;
  const quotaLabel = quota ? `${fmtGB(quota.used)} / ${fmtGB(quota.total)}` : '—';
  const visibleFiles = explorerSearch.trim()
    ? files.filter(f => f.name.toLowerCase().includes(explorerSearch.trim().toLowerCase()))
    : files;

  const NAV_ITEMS = [
    { id:'dashboard',   label:'Accueil',              icon:faHouse },
    { id:'explorer',    label:'Mes fichiers',         icon:faFolderOpen },
    { id:'submissions', label:'Soumissions',          icon:faCloudArrowUp },
    { id:'courses',     label:'Cours partagés',       icon:faBookOpen },
    { id:'community',   label:'Espace communautaire', icon:faUsers },
    { id:'trash',       label:'Corbeille',            icon:faTrash },
    ...(profile?.is_admin ? [{ id:'admin', label:'Administration', icon:faShieldHalved }] : []),
    { id:'settings',    label:'Paramètres',           icon:faGear },
  ];
  const MOBILE_TABS = [
    { id:'dashboard', label:'Accueil',  icon:faHouse },
    { id:'explorer',  label:'Fichiers', icon:faFolderOpen },
    { id:'__more',    label:'Plus',     icon:faBars },
    { id:'settings',  label:'Profil',   icon:faIdCard },
  ];

  const Breadcrumb = () => {
    const parts = currentPath.split('/').filter(Boolean);
    return (
      <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap' }}>
        <span onClick={() => setCurrentPath('/')} style={{ color:T.accent, fontSize:'12px', cursor:'pointer', fontWeight:'500' }}>Racine</span>
        {parts.map((part, i) => {
          const path = '/' + parts.slice(0, i+1).join('/');
          return (
            <React.Fragment key={path}>
              <FontAwesomeIcon icon={faChevronRight} style={{ fontSize:'9px', color:T.textMuted }} />
              <span onClick={() => setCurrentPath(path)} style={{ color: i===parts.length-1 ? T.text : T.accent, fontSize:'12px', cursor:'pointer' }}>{part}</span>
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  // Cloche + panneau déroulant (D3) — réutilisée par ScreenHeader et l'Accueil
  // (seul écran avec un en-tête custom plutôt que ScreenHeader).
  const NotificationBell = () => (
    <div style={{ position:'relative' }}>
      <div onClick={() => setShowNotifs(s => !s)} style={{ width: isMobile?'32px':'38px', height: isMobile?'32px':'38px', borderRadius:'50%', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
        <FontAwesomeIcon icon={faBell} style={{ fontSize: isMobile?'13px':'14px', color:T.text }} />
        {unreadCount > 0 && (
          <span style={{ position:'absolute', top:'-2px', right:'-2px', minWidth:'16px', height:'16px', borderRadius:'8px', background:T.danger, color:'#fff', fontSize:'9.5px', fontWeight:'700', display:'flex', alignItems:'center', justifyContent:'center', padding:'0 3px', boxSizing:'border-box' }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </div>
      {showNotifs && (
        <>
          <div onClick={() => setShowNotifs(false)} style={{ position:'fixed', inset:0, zIndex:40 }} />
          <div style={{ position:'absolute', top:'46px', right:0, width:'320px', maxHeight:'400px', overflowY:'auto', background:T.surface, borderRadius:'10px', boxShadow:'0 8px 24px rgba(0,0,0,0.25)', zIndex:41 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:`1px solid ${T.border}` }}>
              <span style={{ fontSize:'13.5px', fontWeight:'700', color:T.text }}>Notifications</span>
              {unreadCount > 0 && <span onClick={handleMarkAllRead} style={{ fontSize:'11.5px', color:T.accent, fontWeight:'600', cursor:'pointer' }}>Tout marquer lu</span>}
            </div>
            {notifications.length === 0 ? (
              <p style={{ color:T.textMuted, fontSize:'12.5px', padding:'24px 16px', textAlign:'center', margin:0 }}>Aucune notification</p>
            ) : notifications.map(n => (
              <div key={n.id} onClick={() => handleOpenNotification(n)} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.border}`, cursor:'pointer', background: n.is_read ? 'transparent' : T.accentDim }}>
                <div style={{ display:'flex', alignItems:'flex-start', gap:'8px' }}>
                  {!n.is_read && <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:T.accent, marginTop:'5px', flexShrink:0 }} />}
                  <div style={{ minWidth:0 }}>
                    <p style={{ fontSize:'12.5px', fontWeight:'600', color:T.text, margin:0 }}>{n.title}</p>
                    {n.message && <p style={{ fontSize:'11.5px', color:T.textMuted, margin:'3px 0 0', lineHeight:'1.4' }}>{n.message}</p>}
                    <p style={{ fontSize:'10.5px', color:T.textMuted, margin:'4px 0 0' }}>{fmtDate(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  // Titre + avatar communs à chaque écran (remplace l'ancienne top bar unique)
  const ScreenHeader = ({ title, subtitle }) => (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'28px', gap:'16px' }}>
      <div>
        <h2 style={{ color:T.text, fontSize: isMobile?'19px':'26px', fontWeight:'700', margin:0, letterSpacing:'-0.01em' }}>{title}</h2>
        {subtitle && <p style={{ color:T.textMuted, fontSize: isMobile?'12px':'13px', margin:'6px 0 0' }}>{subtitle}</p>}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
        <NotificationBell />
        <div style={{ width: isMobile?'32px':'40px', height: isMobile?'32px':'40px', borderRadius:'50%', flexShrink:0, background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'600', color:T.text, fontSize: isMobile?'12px':'14px' }}>{initials}</div>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:'Inter,sans-serif', color:T.text, display:'flex' }}>

      {/* ─── SIDEBAR (desktop) ─── */}
      {!isMobile && (
        <aside style={{ width:'240px', flex:'0 0 240px', background:T.bg, display:'flex', flexDirection:'column', padding:'28px 20px', gap:'28px', boxSizing:'border-box', position:'sticky', top:0, height:'100vh' }}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <div style={{ width:'26px', height:'26px', borderRadius:'6px', background:T.accent, flexShrink:0 }} />
            <span style={{ fontWeight:'700', fontSize:'14.5px', color:T.text, letterSpacing:'-0.01em' }}>Holocron</span>
          </div>
          <nav style={{ display:'flex', flexDirection:'column', gap:'3px', flex:1 }}>
            {NAV_ITEMS.map(item => {
              const active = tab === item.id;
              return (
                <div key={item.id} onClick={() => setTab(item.id)} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 12px', borderRadius:'8px', background: active ? T.accentDim : 'transparent', color: active ? T.accent : T.textMuted, fontSize:'13.5px', fontWeight: active?'600':'500', cursor:'pointer' }}>
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize:'13px', width:'14px' }} />
                  {item.label}
                </div>
              );
            })}
          </nav>
          <div onClick={() => setDark(d => !d)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'8px', background:T.surface, cursor:'pointer' }}>
            <span style={{ fontSize:'12px', color:T.textMuted, display:'flex', alignItems:'center', gap:'8px' }}>
              <FontAwesomeIcon icon={dark ? faMoon : faSun} style={{ fontSize:'12px' }} /> {dark ? 'Sombre' : 'Clair'}
            </span>
            <div style={{ width:'38px', height:'21px', borderRadius:'11px', background:T.surfaceAlt, position:'relative', flexShrink:0 }}>
              <div style={{ width:'15px', height:'15px', borderRadius:'50%', background:T.accent, position:'absolute', top:'3px', left: dark ? '21px' : '3px', transition:'left 0.15s' }} />
            </div>
          </div>
        </aside>
      )}

      {/* ─── MAIN ─── */}
      <main style={{ flex:1, minWidth:0, padding: isMobile ? `max(20px, env(safe-area-inset-top)) 16px 100px` : '40px 44px', boxSizing:'border-box' }}>

        {/* ══ DASHBOARD / ACCUEIL ══ */}
        {tab === 'dashboard' && (
          <div style={{ display:'flex', flexDirection:'column', gap: isMobile?'20px':'32px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ fontSize: isMobile?'19px':'26px', fontWeight:'700', color:T.text, letterSpacing:'-0.01em' }}>Bonjour, {user?.prenom}</div>
                {!isMobile && (
                  <div style={{ display:'flex', alignItems:'center', gap:'6px', marginTop:'8px' }}>
                    <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:T.success, flexShrink:0 }} />
                    <span style={{ fontSize:'12.5px', color:T.textMuted }}>Serveur opérationnel</span>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'12px', flexShrink:0 }}>
                <NotificationBell />
                <div style={{ width: isMobile?'32px':'40px', height: isMobile?'32px':'40px', borderRadius:'50%', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'600', color:T.text, fontSize: isMobile?'12px':'14px', flexShrink:0 }}>{initials}</div>
              </div>
            </div>

            {isMobile ? (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                <div style={{ ...card(T, { padding:'14px' }) }}>
                  <div style={{ fontSize:'11px', color:T.textMuted, marginBottom:'6px' }}>Quota utilisé</div>
                  <div style={{ fontSize:'20px', fontWeight:'700', color:T.text }}>{quotaLabel}</div>
                </div>
                <div style={{ ...card(T, { padding:'14px' }) }}>
                  <div style={{ fontSize:'11px', color:T.textMuted, marginBottom:'6px' }}>Fichiers récents</div>
                  <div style={{ fontSize:'20px', fontWeight:'700', color:T.text }}>{recentFiles.length}</div>
                </div>
              </div>
            ) : (
              <div style={{ ...card(T, { padding:'36px' }) }}>
                <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', marginBottom:'14px' }}>
                  <span style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em' }}>Stockage</span>
                  <span style={{ fontSize:'13px', color:T.textMuted }}>{quotaLabel} utilisés</span>
                </div>
                <div style={{ width:'100%', height:'8px', borderRadius:'4px', background:T.surfaceAlt, overflow:'hidden' }}>
                  <div style={{ width:`${qpct}%`, height:'100%', borderRadius:'4px', background:T.accent, transition:'width 0.4s' }} />
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'12px' }}>Fichiers récents</div>
              {recentFiles.length === 0 ? (
                <p style={{ color:T.textMuted, fontSize:'13px', margin:0 }}>Aucun fichier pour l'instant.</p>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: isMobile?'10px':'24px' }}>
                  {recentFiles.map((f, i) => (
                    <FileTile key={i} T={T} name={f.name} meta={`${formatSize(f.size)} · ${fmtDate(f.modified)}`} icon={getFileIcon(f)} />
                  ))}
                </div>
              )}
            </div>

            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.5fr 1fr', gap: isMobile?'20px':'32px', alignItems:'start' }}>
              <div>
                <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'12px' }}>Dossiers partagés</div>
                {sharedFolders.length === 0 ? (
                  <p style={{ color:T.textMuted, fontSize:'13px', margin:0 }}>Aucun dossier partagé pour le moment.</p>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile?'10px':'24px' }}>
                    {sharedFolders.map((f, i) => (
                      <CourseCard key={f.path||i} T={T} name={f.name} meta={`${f.fileCount||0} fichiers`} onClick={() => handleNavigate(f.path)} />
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'12px' }}>{isProf ? 'Soumissions récentes' : 'Devoirs à rendre'}</div>
                {isProf ? (
                  received.filter(g => g.submissions && g.submissions.length).length === 0 ? (
                    <p style={{ color:T.textMuted, fontSize:'13px', margin:0 }}>Aucune soumission pour le moment.</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {received.filter(g => g.submissions && g.submissions.length).slice(0, 4).map(g => (
                        <AssignmentRow key={g.id} T={T} title={g.titre} subtitle={`${g.submissions.length} rendu${g.submissions.length>1?'s':''}`} badge={<StatusBadge T={T} label="Voir" tone="accent" />} />
                      ))}
                    </div>
                  )
                ) : (
                  assignments.length === 0 ? (
                    <p style={{ color:T.textMuted, fontSize:'13px', margin:0 }}>Aucun devoir pour l'instant.</p>
                  ) : (
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                      {assignments.slice(0, 4).map(a => {
                        const done = submittedIds.has(a.id);
                        return (
                          <AssignmentRow key={a.id} T={T}
                            title={a.titre}
                            subtitle={`${a.filiere}${a.date_limite ? ` · Échéance : ${fmtDate(a.date_limite)}` : ''}`}
                            badge={<StatusBadge T={T} label={done ? 'Rendu' : 'À rendre'} tone={done ? 'neutral' : 'accent'} />}
                          />
                        );
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

            <div style={{ ...card(T, { padding:'20px' }) }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'14px' }}>
                <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em' }}>Espace communautaire</div>
                <span onClick={() => setTab('community')} style={{ fontSize:'12.5px', color:T.accent, fontWeight:'600', cursor:'pointer' }}>Voir tout</span>
              </div>
              {communityPreview.length === 0 ? (
                <EmptyState T={T} icon={faUsers} title="Aucun dépôt pour l'instant" text="Soyez le premier à déposer un cours, un logiciel ou un média." />
              ) : (
                <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: isMobile?'10px':'16px' }}>
                  {communityPreview.map(r => (
                    <div key={r.id} onClick={() => setTab('community')} style={{ background:T.surfaceAlt, borderRadius:'6px', padding:'14px', cursor:'pointer' }}>
                      <div style={{ fontSize:'13px', fontWeight:'600', color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titre}</div>
                      <div style={{ fontSize:'11.5px', color:T.textMuted, marginTop:'4px' }}>{r.uploader_prenom} {r.uploader_nom?.[0]}. · {r.categorie === 'Media' ? 'Média' : r.categorie}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ EXPLORER (WebDAV réel) ══ */}
        {tab === 'explorer' && (
          <div>
            <ScreenHeader title="Mes fichiers" subtitle={`Votre espace personnel — upload, téléchargement, dossiers · Quota : ${quotaLabel}`} />
            {currentPath !== '/' && (
              <button onClick={() => setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/')} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 14px', background:T.surface, border:'none', borderRadius:'8px', color:T.text, fontSize:'12.5px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif', marginBottom:'12px' }}>
                <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize:'12px' }} /> Retour
              </button>
            )}
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap', gap:'12px' }}>
              <Breadcrumb />
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                <div style={{ position:'relative' }}>
                  <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position:'absolute', left:'13px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'12px' }} />
                  <input value={explorerSearch} onChange={e => setExplorerSearch(e.target.value)} placeholder="Rechercher dans ce dossier…"
                    style={{ width:'220px', boxSizing:'border-box', padding:'9px 12px 9px 34px', borderRadius:'8px', background:T.surface, border:'none', color:T.text, fontSize:'12.5px', fontFamily:'Inter,sans-serif', outline:'none' }} />
                </div>
                <button onClick={() => setShowNewFolder(!showNewFolder)} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'10px 16px', background:T.surface, border:'none', borderRadius:'8px', color:T.text, fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={faFolderPlus} style={{ fontSize:'13px' }} /> Nouveau dossier
                </button>
                <input ref={fileInputRef} type="file" style={{ display:'none' }} onChange={handleUpload} />
                <PrimaryButton T={T} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <FontAwesomeIcon icon={uploading ? faSpinner : faUpload} style={{ fontSize:'13px' }} />
                  {uploading ? `${uploadPct}%` : 'Uploader'}
                </PrimaryButton>
                <div style={{ display:'flex', gap:'4px', background:T.surface, borderRadius:'8px', padding:'3px' }}>
                  <span onClick={() => setExplorerView('list')} style={{ padding:'5px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer', background: explorerView==='list' ? T.accentDim : 'transparent', color: explorerView==='list' ? T.accent : T.textMuted }}>Liste</span>
                  <span onClick={() => setExplorerView('grid')} style={{ padding:'5px 12px', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer', background: explorerView==='grid' ? T.accentDim : 'transparent', color: explorerView==='grid' ? T.accent : T.textMuted }}>Grille</span>
                </div>
                <button onClick={() => selectMode ? handleExitSelectMode() : setSelectMode(true)} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'10px 16px', background: selectMode ? T.accentDim : T.surface, border:'none', borderRadius:'8px', color: selectMode ? T.accent : T.text, fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={faCheckSquare} style={{ fontSize:'13px' }} /> {selectMode ? 'Annuler' : 'Sélectionner'}
                </button>
              </div>
            </div>

            {selectMode && (
              <div style={{ ...card(T, { padding:'12px 16px' }), marginBottom:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', flexWrap:'wrap' }}>
                <span style={{ color:T.textMuted, fontSize:'13px' }}>{selectedPaths.size} élément(s) sélectionné(s)</span>
                <button onClick={handleBulkDelete} disabled={selectedPaths.size === 0 || bulkDeleting} style={{ display:'flex', alignItems:'center', gap:'7px', padding:'8px 14px', background:T.dangerDim, border:'none', borderRadius:'8px', color:T.danger, fontSize:'12.5px', fontWeight:'600', cursor: selectedPaths.size === 0 ? 'default' : 'pointer', opacity: selectedPaths.size === 0 ? 0.5 : 1, fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={bulkDeleting ? faSpinner : faTrash} style={{ fontSize:'12px' }} /> {bulkDeleting ? 'Suppression...' : 'Supprimer la sélection'}
                </button>
              </div>
            )}

            {uploading && (
              <div style={{ marginBottom:'16px' }}>
                <div style={{ width:'100%', background:T.surfaceAlt, borderRadius:'99px', height:'4px', overflow:'hidden', marginBottom:'6px' }}>
                  <div style={{ width:`${uploadPct}%`, height:'100%', background:T.accent, borderRadius:'99px', transition:'width 0.3s' }} />
                </div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
                  <p style={{ color:T.textMuted, fontSize:'12px', margin:0 }}>Upload en cours... {uploadPct}%</p>
                  <button onClick={handleCancelUpload} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', background:T.dangerDim, border:'none', borderRadius:'8px', color:T.danger, fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                    <FontAwesomeIcon icon={faXmark} style={{ fontSize:'12px' }} /> Annuler
                  </button>
                </div>
              </div>
            )}

            {showNewFolder && (
              <div style={{ ...card(T, { padding:'14px' }), marginBottom:'16px', display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                <FontAwesomeIcon icon={faFolderPlus} style={{ color:T.accent, fontSize:'16px' }} />
                <TextInput T={T} value={newFolder} onChange={e => setNewFolder(e.target.value)} placeholder="Nom du dossier" onKeyDown={e => e.key==='Enter' && handleCreateFolder()} style={{ flex:1, minWidth:'160px' }} />
                <PrimaryButton T={T} onClick={handleCreateFolder}>Créer</PrimaryButton>
                <button onClick={() => { setShowNewFolder(false); setNewFolder(''); }} style={{ padding:'9px 12px', background:'none', border:'none', borderRadius:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer' }}>
                  <FontAwesomeIcon icon={faXmark} />
                </button>
              </div>
            )}

            {filesLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:T.textMuted }}>
                <FontAwesomeIcon icon={faSpinner} style={{ fontSize:'28px', marginBottom:'12px', display:'block' }} /> Chargement...
              </div>
            ) : files.length === 0 ? (
              <EmptyState T={T} icon={faFolderOpen} title="Votre espace est vide" text="Uploadez vos premiers fichiers pour organiser vos ressources académiques."
                action={<button onClick={() => fileInputRef.current?.click()} style={{ marginTop:'20px', padding:'12px 28px', background:T.accent, color:T.accentText, border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'700', cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'10px', fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={faUpload} style={{ fontSize:'13px' }} /> Uploader un fichier <FontAwesomeIcon icon={faArrowRight} style={{ fontSize:'12px' }} />
                </button>} />
            ) : visibleFiles.length === 0 ? (
              <EmptyState T={T} icon={faMagnifyingGlass} title="Aucun résultat" text={`Aucun élément ne correspond à « ${explorerSearch} » dans ce dossier.`} />
            ) : explorerView === 'list' ? (
              <div style={{ ...card(T, { padding:0 }) }}>
                {currentPath !== '/' && (
                  <div onClick={() => setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/')} style={{ display:'flex', alignItems:'center', gap:'16px', padding:'12px 16px', borderBottom:`1px solid ${T.border}`, cursor:'pointer' }}>
                    <div style={{ width:'30px', height:'30px', borderRadius:'8px', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <FontAwesomeIcon icon={faFolder} style={{ color:T.textMuted, fontSize:'13px' }} />
                    </div>
                    <span style={{ color:T.textMuted, fontSize:'13.5px' }}>.. Dossier parent</span>
                  </div>
                )}
                {visibleFiles.map((file, i) => (
                  <ExplorerRow key={i} T={T} file={file} onNavigate={handleNavigate} onDownload={handleDownload} onDelete={handleDelete} onRename={handleRename} canDelete={isProf || !/^\/?cours[-_]/i.test(currentPath)} isLast={i === visibleFiles.length - 1} selectMode={selectMode} selected={selectedPaths.has(file.path)} onToggleSelect={toggleSelect} />
                ))}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:'12px' }}>
                {currentPath !== '/' && (
                  <div onClick={() => setCurrentPath(currentPath.substring(0, currentPath.lastIndexOf('/')) || '/')} style={{ ...card(T, { padding:'16px', cursor:'pointer', display:'flex', alignItems:'center', gap:'10px' }) }}>
                    <FontAwesomeIcon icon={faFolder} style={{ color:T.textMuted, fontSize:'22px' }} />
                    <span style={{ color:T.textMuted, fontSize:'13px' }}>.. Dossier parent</span>
                  </div>
                )}
                {visibleFiles.map((file, i) => (
                  <ExplorerCard key={i} T={T} file={file} onNavigate={handleNavigate} onDownload={handleDownload} onDelete={handleDelete} onRename={handleRename} canDelete={isProf || !/^\/?cours[-_]/i.test(currentPath)} selectMode={selectMode} selected={selectedPaths.has(file.path)} onToggleSelect={toggleSelect} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ COURS PARTAGÉS ══ */}
        {tab === 'courses' && (
          <div>
            <ScreenHeader title="Cours partagés" subtitle="Bibliothèque par filière — lecture seule pour les étudiants, dépôt pour profs et assistants" />
            {sharedFolders.length === 0 ? (
              <EmptyState T={T} icon={faBookOpen} title="Aucun cours partagé" text="Les dossiers de cours (Cours-*) apparaîtront ici une fois disponibles." />
            ) : (
              <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: isMobile?'10px':'20px' }}>
                {sharedFolders.map((f, i) => (
                  <CourseCard key={f.path||i} T={T} name={f.name} meta={`${fmtGB(f.size)} · ${f.fileCount||0} fichiers`} onClick={() => handleNavigate(f.path)} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ ESPACE COMMUNAUTAIRE ══ */}
        {tab === 'community' && <CommunitySpace T={T} isMobile={isMobile} isSuperAdmin={profile?.admin_level === 'super'} permissions={profile?.permissions || []} />}

        {/* ══ ADMINISTRATION (Panel Admin avancé, D2) ══ */}
        {tab === 'admin' && profile?.is_admin && <AdminPanel T={T} isMobile={isMobile} isSuperAdmin={profile.admin_level === 'super'} permissions={profile.permissions || []} />}

        {/* ══ CORBEILLE (API trashbin Nextcloud) ══ */}
        {tab === 'trash' && (
          <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', gap:'16px' }}>
              <div>
                <h2 style={{ color:T.text, fontSize: isMobile?'19px':'24px', fontWeight:'700', margin:0, letterSpacing:'-0.01em' }}>Corbeille</h2>
                <p style={{ color:T.textMuted, fontSize: isMobile?'12px':'13px', margin:'6px 0 0' }}>Fichiers et dossiers supprimés, restaurables tant qu'ils n'ont pas été purgés</p>
              </div>
              {trashItems.length > 0 && (
                <button onClick={handleEmptyTrash} style={{ padding: isMobile?'8px 12px':'10px 16px', background:T.dangerDim, border:'none', borderRadius:'8px', color:T.danger, fontSize:'12.5px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif', flexShrink:0 }}>
                  Vider la corbeille
                </button>
              )}
            </div>

            {trashLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:T.textMuted }}>
                <FontAwesomeIcon icon={faSpinner} style={{ fontSize:'28px', marginBottom:'12px', display:'block' }} /> Chargement...
              </div>
            ) : trashItems.length === 0 ? (
              <EmptyState T={T} icon={faTrashCan} title="Rien à restaurer pour l'instant" text="Les fichiers et dossiers que vous supprimez apparaissent ici." />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {trashItems.map(item => (
                  <div key={item.trashPath} style={{ ...card(T, { padding:'16px' }), display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:'14px', fontWeight:'600', color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</div>
                      <div style={{ fontSize:'12px', color:T.textMuted, marginTop:'4px' }}>Supprimé le {fmtTimestamp(item.deletedAt)}{item.size ? ` · ${formatSize(item.size)}` : ''}</div>
                    </div>
                    <div style={{ display:'flex', gap:'16px', flexShrink:0 }}>
                      <span onClick={() => handleRestore(item.trashPath)} style={{ fontSize:'12px', color:T.accent, fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px' }}>
                        <FontAwesomeIcon icon={faRotateLeft} style={{ fontSize:'11px' }} /> Restaurer
                      </span>
                      <span onClick={() => handlePurgeItem(item.trashPath)} style={{ fontSize:'12px', color:T.danger, fontWeight:'600', cursor:'pointer' }}>
                        Supprimer définitivement
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ SUBMISSIONS (DONNÉES RÉELLES) ══ */}
        {tab === 'submissions' && (
          <div>
            <ScreenHeader title="Soumissions" subtitle={isProf ? 'Travaux rendus par vos étudiants, organisés par devoir' : 'Déposez vos travaux et suivez le statut de vos soumissions'} />
            {/* Input caché commun aux dépôts étudiants */}
            <input ref={submitInputRef} type="file" style={{ display:'none' }} onChange={handleSubmitFile} />

            {subLoading ? (
              <div style={{ textAlign:'center', padding:'60px', color:T.textMuted }}>
                <FontAwesomeIcon icon={faSpinner} style={{ fontSize:'28px', marginBottom:'12px', display:'block' }} /> Chargement...
              </div>
            ) : !isProf ? (
              /* ── VUE ÉTUDIANT ── */
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {assignments.length === 0 ? (
                  <EmptyState T={T} icon={faBookOpen} title="Aucun devoir pour l'instant" text="Les devoirs de votre filière apparaîtront ici." />
                ) : assignments.map((a) => {
                  const done = submittedIds.has(a.id);
                  const late = !done && a.date_limite && new Date(a.date_limite) < new Date();
                  return (
                    <div key={a.id} style={{ ...card(T, { padding:'18px' }), display:'flex', alignItems:'center', gap:'16px' }}>
                      <div style={{ width:'40px', height:'40px', flexShrink:0, borderRadius:'8px', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center' }}>
                        <FontAwesomeIcon icon={done?faCircleCheck:faCloudArrowUp} style={{ fontSize:'17px', color: done ? T.success : late ? T.danger : T.textMuted }} />
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:T.text, fontSize:'14px', fontWeight:'600', margin:'0 0 4px' }}>{a.titre}</p>
                        <p style={{ color:T.textMuted, fontSize:'12px', margin:0 }}>
                          {a.filiere}{a.date_limite ? ` — Pour le ${fmtDate(a.date_limite)}` : ''}{a.prof_nom ? ` • ${a.prof_nom}` : ''}
                        </p>
                      </div>
                      {done ? (
                        <StatusBadge T={T} label="Rendu" tone="neutral" />
                      ) : (
                        <>
                          {late && <StatusBadge T={T} label="En retard" tone="danger" />}
                          <PrimaryButton T={T} onClick={() => triggerSubmit(a.id)} style={{ padding:'8px 16px' }}>
                            <FontAwesomeIcon icon={faUpload} style={{ fontSize:'12px' }} /> Soumettre
                          </PrimaryButton>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── VUE PROF / ASSISTANT ── */
              <div>
                <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'16px' }}>
                  <PrimaryButton T={T} onClick={() => setShowNewAssign(!showNewAssign)}>
                    <FontAwesomeIcon icon={faPlus} style={{ fontSize:'12px' }} /> Nouveau devoir
                  </PrimaryButton>
                </div>

                {/* Formulaire nouveau devoir */}
                {showNewAssign && (
                  <div style={{ ...card(T, { padding:'20px' }), marginBottom:'20px' }}>
                    <h3 style={{ color:T.text, fontSize:'15px', fontWeight:'700', margin:'0 0 16px', display:'flex', alignItems:'center', gap:'8px' }}>
                      <FontAwesomeIcon icon={faBookOpen} style={{ color:T.accent, fontSize:'14px' }} /> Créer un devoir
                    </h3>
                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      <TextInput T={T} value={newAssign.titre} onChange={e => setNewAssign(p => ({ ...p, titre:e.target.value }))} placeholder="Titre du devoir" />
                      <textarea value={newAssign.description} onChange={e => setNewAssign(p => ({ ...p, description:e.target.value }))} placeholder="Description (optionnelle)" rows={3}
                        style={{ padding:'11px 14px', background:T.surfaceAlt, border:'none', borderRadius:'8px', color:T.text, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif', resize:'vertical', boxSizing:'border-box' }} />
                      <div style={{ display:'flex', gap:'12px', flexWrap:'wrap' }}>
                        <select value={newAssign.filiere} onChange={e => setNewAssign(p => ({ ...p, filiere:e.target.value }))}
                          style={{ flex:1, minWidth:'180px', padding:'11px 14px', background:T.surfaceAlt, border:'none', borderRadius:'8px', color:T.text, fontSize:'14px', outline:'none', fontFamily:'Inter,sans-serif' }}>
                          {FILIERES.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                        <TextInput T={T} type="date" value={newAssign.date_limite} onChange={e => setNewAssign(p => ({ ...p, date_limite:e.target.value }))} style={{ flex:1, minWidth:'160px' }} />
                      </div>
                      <div style={{ display:'flex', gap:'10px' }}>
                        <PrimaryButton T={T} onClick={handleCreateAssign}>Créer le devoir</PrimaryButton>
                        <button onClick={() => setShowNewAssign(false)} style={{ padding:'11px 16px', background:'none', border:'none', borderRadius:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>Annuler</button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Liste des devoirs + rendus */}
                {received.length === 0 ? (
                  <EmptyState T={T} icon={faBookOpen} title="Aucun devoir créé" text="Créez un devoir pour recevoir les rendus des étudiants." />
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                    {received.map((group) => (
                      <div key={group.id} style={{ ...card(T, { padding:0, overflow:'hidden' }) }}>
                        <button onClick={() => toggleFolder(`sview_${group.id}`)} style={{ width:'100%', display:'flex', alignItems:'center', gap:'12px', padding:'14px 18px', background:'none', border:'none', cursor:'pointer', fontFamily:'Inter,sans-serif' }}>
                          <FontAwesomeIcon icon={openFolders[`sview_${group.id}`]!==false?faChevronDown:faChevronRight} style={{ color:T.textMuted, fontSize:'11px' }} />
                          <FontAwesomeIcon icon={faBookOpen} style={{ color:T.textMuted, fontSize:'18px' }} />
                          <div style={{ textAlign:'left', flex:1, minWidth:0 }}>
                            <span style={{ color:T.text, fontSize:'15px', fontWeight:'700', display:'block' }}>{group.titre}</span>
                            <span style={{ color:T.textMuted, fontSize:'12px' }}>{group.filiere}{group.date_limite ? ` — ${fmtDate(group.date_limite)}` : ''}</span>
                          </div>
                          <span style={{ color:T.textMuted, fontSize:'12px', fontWeight:'600' }}>{group.submissions.length} rendu{group.submissions.length>1?'s':''}</span>
                        </button>
                        {openFolders[`sview_${group.id}`]!==false && (
                          <div>
                            {group.submissions.length === 0 ? (
                              <p style={{ color:T.textMuted, fontSize:'13px', padding:'14px 18px', margin:0 }}>Aucun rendu pour ce devoir.</p>
                            ) : group.submissions.map((item) => (
                              <div key={item.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'12px 18px', borderTop:`1px solid ${T.border}` }}>
                                <div style={{ width:'30px', height:'30px', borderRadius:'50%', flexShrink:0, background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'700', color:T.textMuted }}>{(item.etudiant_nom||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
                                <div style={{ flex:1, minWidth:0 }}>
                                  <span style={{ color:T.text, fontSize:'13px', fontWeight:'600' }}>{item.etudiant_nom}</span>
                                  <span style={{ color:T.textMuted, fontSize:'12px', marginLeft:'6px' }}>— {item.fichier_nom}</span>
                                </div>
                                <span style={{ color:T.textMuted, fontSize:'11px', flexShrink:0 }}>{fmtDate(item.submitted_at)}</span>
                                <button onClick={() => handleDownloadSub(item.id, item.fichier_nom)} style={{ background:T.surfaceAlt, border:'none', borderRadius:'6px', padding:'6px 10px', color:T.text, cursor:'pointer' }}>
                                  <FontAwesomeIcon icon={faDownload} style={{ fontSize:'12px' }} />
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

        {/* ══ SETTINGS / PARAMÈTRES ══ */}
        {tab === 'settings' && (
          <div style={{ maxWidth:'600px' }}>
            <ScreenHeader title="Paramètres" subtitle="Profil, thème et mot de passe" />
            <div style={{ ...card(T, { padding:'24px', marginBottom:'16px' }) }}>
              <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'24px' }}>
                <div style={{ width:'56px', height:'56px', borderRadius:'50%', flexShrink:0, background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:'700', color:T.text }}>{initials}</div>
                <div>
                  <h3 style={{ color:T.text, fontSize:'17px', fontWeight:'700', margin:'0 0 6px' }}>{info.prenom} {info.nom}</h3>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap' }}>
                    <FontAwesomeIcon icon={isProf ? faUserTie : faUserGraduate} style={{ color:T.textMuted, fontSize:'12px' }} />
                    <span style={{ color:T.textMuted, fontSize:'13px', fontWeight:'600' }}>{user?.role === 'professeur' ? 'Professeur' : user?.role === 'assistant' ? 'Assistant' : 'Étudiant'}</span>
                    {info.filiere && <span style={{ background:T.surfaceAlt, color:T.textMuted, fontSize:'11px', padding:'2px 8px', borderRadius:'99px' }}>{info.filiere}</span>}
                  </div>
                </div>
              </div>
              {[
                { icon:faIdCard,       label:'Matricule',         value:info.matricule           },
                { icon:faEnvelope,     label:'Email',             value:info.email               },
                { icon:faHardDrive,    label:'Quota de stockage', value:quotaLabel               },
                { icon:faShieldHalved, label:'Compte Nextcloud',  value:info.nextcloud_username   },
              ].map((item,i,arr) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom:i<arr.length-1?`1px solid ${T.border}`:'none' }}>
                  <div style={{ width:'34px', height:'34px', flexShrink:0, background:T.surfaceAlt, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <FontAwesomeIcon icon={item.icon} style={{ color:T.textMuted, fontSize:'13px' }} />
                  </div>
                  <div>
                    <p style={{ color:T.textMuted, fontSize:'11px', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.05em', fontWeight:'600' }}>{item.label}</p>
                    <p style={{ color:T.text, fontSize:'14px', fontWeight:'500', margin:0 }}>{item.value||'—'}</p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ ...card(T, { padding:'24px', marginBottom:'16px' }) }}>
              <h3 style={{ color:T.text, fontSize:'15px', fontWeight:'700', marginBottom:'16px', display:'flex', alignItems:'center', gap:'8px' }}>
                <FontAwesomeIcon icon={faLock} style={{ color:T.accent, fontSize:'14px' }} /> Changer le mot de passe
              </h3>
              {['current','next','confirm'].map((field,i) => {
                const labels = ['Mot de passe actuel','Nouveau mot de passe','Confirmer le nouveau'];
                return (
                  <div key={field} style={{ marginBottom:'12px' }}>
                    <label style={{ display:'block', color:T.textMuted, fontSize:'11px', fontWeight:'600', letterSpacing:'0.05em', textTransform:'uppercase', marginBottom:'6px' }}>{labels[i]}</label>
                    <div style={{ position:'relative' }}>
                      <input type={showPw[field]?'text':'password'} placeholder="••••••••" value={pwForm[field]}
                        onChange={e => setPwForm(p => ({ ...p, [field]: e.target.value }))}
                        style={{ width:'100%', padding:'11px 44px 11px 14px', background:T.surfaceAlt, border:'none', borderRadius:'8px', color:T.text, fontSize:'14px', outline:'none', boxSizing:'border-box', fontFamily:'Inter,sans-serif' }}
                      />
                      <button type="button" onClick={() => setShowPw(p => ({ ...p, [field]: !p[field] }))}
                        style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:T.textMuted, cursor:'pointer' }}>
                        <FontAwesomeIcon icon={showPw[field]?faEyeSlash:faEye} style={{ fontSize:'14px' }} />
                      </button>
                    </div>
                  </div>
                );
              })}
              {pwStatus.error && <p style={{ color:T.danger, fontSize:'12px', margin:'0 0 10px' }}>{pwStatus.error}</p>}
              {pwStatus.success && <p style={{ color:T.success, fontSize:'12px', margin:'0 0 10px' }}>{pwStatus.success}</p>}
              <PrimaryButton T={T} onClick={handleChangePassword} disabled={pwStatus.loading} style={{ marginTop:'4px' }}>
                <FontAwesomeIcon icon={pwStatus.loading ? faSpinner : faFloppyDisk} style={{ fontSize:'13px' }} /> {pwStatus.loading ? 'Envoi...' : 'Sauvegarder'}
              </PrimaryButton>
            </div>

            {isMobile && (
              <div onClick={() => setDark(d => !d)} style={{ ...card(T, { padding:'16px', marginBottom:'16px' }), display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer' }}>
                <span style={{ fontSize:'13px', color:T.text, display:'flex', alignItems:'center', gap:'8px' }}>
                  <FontAwesomeIcon icon={dark ? faMoon : faSun} style={{ fontSize:'13px' }} /> Thème {dark ? 'sombre' : 'clair'}
                </span>
                <div style={{ width:'38px', height:'21px', borderRadius:'11px', background:T.surfaceAlt, position:'relative', flexShrink:0 }}>
                  <div style={{ width:'15px', height:'15px', borderRadius:'50%', background:T.accent, position:'absolute', top:'3px', left: dark ? '21px' : '3px' }} />
                </div>
              </div>
            )}

            <button onClick={handleLogout} style={{ width:'100%', padding:'13px', background:T.dangerDim, border:'none', borderRadius:'10px', color:T.danger, fontSize:'14px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:'10px', fontFamily:'Inter,sans-serif' }}>
              <FontAwesomeIcon icon={faRightFromBracket} style={{ fontSize:'14px' }} /> Se déconnecter
            </button>
          </div>
        )}
      </main>

      {/* ─── BARRE INFÉRIEURE (mobile) ─── */}
      {isMobile && (
        <>
          <nav style={{ position:'fixed', bottom:0, left:0, right:0, zIndex:50, display:'flex', background:T.surface, borderTop:`1px solid ${T.border}`, padding:'10px 0 max(16px, env(safe-area-inset-bottom))', boxSizing:'border-box' }}>
            {MOBILE_TABS.map(item => {
              const active = item.id === '__more' ? showMore : (tab === item.id && !showMore);
              return (
                <div key={item.id} onClick={() => item.id === '__more' ? setShowMore(true) : (setShowMore(false), setTab(item.id))} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:'4px', cursor:'pointer' }}>
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize:'16px', color: active ? T.accent : T.textMuted }} />
                  <span style={{ fontSize:'10px', fontWeight:'600', color: active ? T.text : T.textMuted }}>{item.label}</span>
                </div>
              );
            })}
          </nav>

          {showMore && (
            <div onClick={() => setShowMore(false)} style={{ position:'fixed', inset:0, zIndex:60, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end' }}>
              <div onClick={e => e.stopPropagation()} style={{ width:'100%', background:T.bg, borderRadius:'20px 20px 0 0', padding:'12px 16px max(20px, env(safe-area-inset-bottom))', boxSizing:'border-box' }}>
                <div style={{ width:'36px', height:'4px', borderRadius:'2px', background:T.border, margin:'0 auto 16px' }} />
                {NAV_ITEMS.filter(i => i.id !== 'dashboard' && i.id !== 'explorer').map(item => (
                  <div key={item.id} onClick={() => { setTab(item.id); setShowMore(false); }} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 8px', color: tab===item.id ? T.accent : T.text, fontSize:'15px', fontWeight:'500', cursor:'pointer' }}>
                    <FontAwesomeIcon icon={item.icon} style={{ fontSize:'16px', width:'18px' }} />
                    {item.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
