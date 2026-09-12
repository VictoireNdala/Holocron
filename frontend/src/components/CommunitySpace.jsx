import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUpload, faDownload, faFlag, faArrowLeft, faSpinner, faFolderOpen,
  faFileLines, faFileZipper, faTable, faFile, faMagnifyingGlass, faStar,
} from '@fortawesome/free-solid-svg-icons';
import {
  listFaculties, listLevels, listCommunityResources, getCommunityResource,
  createCommunityResource, downloadCommunityResource, reportCommunityResource,
  getCommunityResourceCover, setResourceVerification, deleteCommunityResource,
  listPublicPriorityFolders, listCategories,
} from '../services/api';

// F6 — les catégories sont maintenant gérables depuis le Panel Admin
// (table community_categories, plus un ENUM en dur) : plus de liste figée
// ici, tout vient de l'API. Icônes de repli connues pour les 4 catégories
// de départ ; toute catégorie créée après coup retombe sur faFile.
const CATEGORY_ICON = { Cours: faFileLines, Logiciel: faFileZipper, Media: faTable, Autre: faFile };

const fmtSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(0)} Ko`;
  return `${(bytes/(1024*1024)).toFixed(1)} Mo`;
};
const fmtDate = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' }); } catch { return ''; }
};

function Pill({ T, active, onClick, children }) {
  return (
    <span onClick={onClick} style={{ padding:'6px 13px', borderRadius:'12px', fontSize:'12px', fontWeight:'600', cursor:'pointer', background: active ? T.accentDim : T.surfaceAlt, color: active ? T.accent : T.textMuted, whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

function VerificationBadge({ T, status }) {
  if (!status || status === 'non_concerne') return null;
  const map = {
    verifie:    { label: '✓ Vérifié',    bg: T.accentDim, color: T.accent },
    non_verifie:{ label: 'Non vérifié',  bg: T.surfaceAlt, color: T.textMuted },
    dangereux:  { label: '⚠ Dangereux',  bg: T.dangerDim, color: T.danger },
  };
  const s = map[status];
  if (!s) return null;
  return <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background:s.bg, color:s.color, width:'fit-content' }}>{s.label}</span>;
}

// Vignette : image de couverture réelle si l'utilisateur en a fourni une
// (récupérée en blob authentifié — un <img src> direct ne pourrait pas
// envoyer le header d'autorisation), sinon repli dégradé + icône de
// catégorie, jamais de case vide (voir DECISIONS.md D-2026-09-04-04).
function Cover({ T, resourceId, coverImagePath, categorie, height = 100 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!coverImagePath) { setUrl(null); return; }
    let objectUrl;
    getCommunityResourceCover(resourceId)
      .then(res => { objectUrl = URL.createObjectURL(res.data); setUrl(objectUrl); })
      .catch(() => setUrl(null));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [resourceId, coverImagePath]);

  if (url) {
    return <img src={url} alt="" style={{ width:'100%', height:`${height}px`, borderRadius:'6px', objectFit:'cover', display:'block' }} />;
  }
  return (
    <div style={{ width:'100%', height:`${height}px`, borderRadius:'6px', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <FontAwesomeIcon icon={CATEGORY_ICON[categorie] || faFile} style={{ color:T.textMuted, fontSize: Math.round(height*0.28) }} />
    </div>
  );
}

function ResourceCard({ T, r, onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.surface, borderRadius:'6px', padding:'16px', cursor:'pointer' }}>
      <Cover T={T} resourceId={r.id} coverImagePath={r.cover_image_path} categorie={r.categorie} />
      <div style={{ marginTop:'12px', fontSize:'13.5px', fontWeight:'600', color:T.text, lineHeight:'1.3' }}>{r.titre}</div>
      <div style={{ fontSize:'11.5px', color:T.textMuted, marginTop:'4px' }}>{r.uploader_prenom} {r.uploader_nom?.[0]}. · {r.categorie === 'Media' ? 'Média' : r.categorie}</div>
      {r.verification_status && r.verification_status !== 'non_concerne' && (
        <div style={{ marginTop:'8px' }}><VerificationBadge T={T} status={r.verification_status} /></div>
      )}
    </div>
  );
}

// Ligne compacte — vue mobile du catalogue (vignette 56px + infos), reproduit
// la structure du canvas `Canvas.dc.html` section Catalogue mobile.
function ResourceRow({ T, r, onClick }) {
  return (
    <div onClick={onClick} style={{ background:T.surface, borderRadius:'6px', padding:'12px', cursor:'pointer', display:'flex', gap:'12px', alignItems:'center' }}>
      <div style={{ width:'56px', flexShrink:0 }}>
        <Cover T={T} resourceId={r.id} coverImagePath={r.cover_image_path} categorie={r.categorie} height={56} />
      </div>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:'13px', fontWeight:'600', color:T.text, lineHeight:'1.3', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titre}</div>
        <div style={{ fontSize:'11px', color:T.textMuted, marginTop:'3px' }}>{r.uploader_prenom} {r.uploader_nom?.[0]}. · {r.categorie === 'Media' ? 'Média' : r.categorie}</div>
        {r.verification_status && r.verification_status !== 'non_concerne' && (
          <div style={{ marginTop:'6px' }}><VerificationBadge T={T} status={r.verification_status} /></div>
        )}
      </div>
    </div>
  );
}

export default function CommunitySpace({ T, isMobile, isSuperAdmin, permissions = [] }) {
  const canVerify  = isSuperAdmin || permissions.includes('verifier_logiciels');
  const canModerate = isSuperAdmin || permissions.includes('moderer_communautaire');
  const [view, setView] = useState('catalogue'); // 'catalogue' | 'detail' | 'upload'
  const [faculties, setFaculties] = useState([]);
  const [levels, setLevels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [priorityFolders, setPriorityFolders] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ category:'', faculty:'', level:'', q:'' });
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [detailId, setDetailId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [uploadForm, setUploadForm] = useState({ titre:'', description:'', categorie:'', faculty_id:'', level_id:'' });
  const [uploadFile_, setUploadFile_] = useState(null);
  const [uploadCover, setUploadCover] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    listFaculties().then(r => setFaculties(r.data.faculties || [])).catch(() => {});
    listLevels().then(r => setLevels(r.data.levels || [])).catch(() => {});
    listPublicPriorityFolders().then(r => setPriorityFolders(r.data.folders || [])).catch(() => {});
    listCategories().then(r => {
      const cats = r.data.categories || [];
      setCategories(cats);
      setUploadForm(f => ({ ...f, categorie: f.categorie || cats[0]?.nom || '' }));
    }).catch(() => {});
  }, []);

  // Revenir à la page 1 à chaque changement de filtre (sinon on peut se
  // retrouver sur une page qui n'existe plus pour le nouveau résultat).
  useEffect(() => { setPage(1); }, [filters]);

  useEffect(() => {
    if (view !== 'catalogue') return;
    setLoading(true);
    listCommunityResources({ category: filters.category, faculty: filters.faculty, level: filters.level, q: filters.q, page, limit: 24 })
      .then(r => {
        setResources(r.data.resources || []);
        setTotalPages(r.data.pagination?.totalPages || 1);
      })
      .catch(() => { setResources([]); setTotalPages(1); })
      .finally(() => setLoading(false));
  }, [view, filters, page]);

  useEffect(() => {
    if (view !== 'detail' || !detailId) return;
    setDetailLoading(true);
    getCommunityResource(detailId)
      .then(r => setDetail(r.data))
      .catch(() => setDetail(null))
      .finally(() => setDetailLoading(false));
  }, [view, detailId]);

  const openDetail = (id) => { setDetailId(id); setView('detail'); };

  const handleDownload = async (id, nom) => {
    try {
      const res = await downloadCommunityResource(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = nom || 'fichier'; a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err.response?.data?.message || 'Téléchargement impossible.');
    }
  };

  const handleReport = async (id) => {
    const raison = window.prompt('Pourquoi signalez-vous cette ressource ? (optionnel)');
    if (raison === null) return;
    try { await reportCommunityResource(id, raison); alert('Signalement envoyé, merci.'); }
    catch { alert('Échec du signalement.'); }
  };

  const handleSetVerification = async (id, status) => {
    try {
      await setResourceVerification(id, status);
      const r = await getCommunityResource(id);
      setDetail(r.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Échec de la mise à jour du statut.');
    }
  };

  const handleModerationDelete = async (id) => {
    if (!window.confirm('Supprimer définitivement cette ressource ? Cette action est irréversible.')) return;
    try { await deleteCommunityResource(id); setView('catalogue'); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la suppression.'); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    if (!uploadForm.titre.trim()) return setUploadError('Le titre est requis');
    if (!uploadForm.categorie) return setUploadError('La catégorie est requise');
    if (!uploadFile_) return setUploadError('Un fichier est requis');
    setUploading(true);
    try {
      await createCommunityResource({ ...uploadForm, fichier: uploadFile_, cover_image: uploadCover });
      setUploadForm({ titre:'', description:'', categorie: categories[0]?.nom || '', faculty_id:'', level_id:'' });
      setUploadFile_(null); setUploadCover(null);
      setView('catalogue');
      setFilters(f => ({ ...f })); // redéclenche le chargement du catalogue
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Échec du dépôt.');
    } finally {
      setUploading(false);
    }
  };

  const card = (extra = {}) => ({ background:T.surface, borderRadius:'6px', ...extra });

  // ── FORMULAIRE DE DÉPÔT ──────────────────────────────────────────────────
  if (view === 'upload') {
    return (
      <div>
        <div onClick={() => setView('catalogue')} style={{ display:'flex', alignItems:'center', gap:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer', marginBottom:'20px', width:'fit-content' }}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize:'11px' }} /> Retour au catalogue
        </div>
        <h2 style={{ color:T.text, fontSize: isMobile?'19px':'24px', fontWeight:'700', margin:'0 0 24px' }}>Déposer une ressource</h2>
        <form onSubmit={handleUpload} style={{ maxWidth:'640px' }}>
          <div style={{ ...card({ padding: isMobile?'20px':'32px' }) }}>
            {uploadError && <p style={{ color:T.danger, fontSize:'13px', margin:'0 0 16px' }}>{uploadError}</p>}

            <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Titre</label>
            <input value={uploadForm.titre} onChange={e => setUploadForm(f => ({ ...f, titre:e.target.value }))} placeholder="Nom de la ressource"
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:'8px', background:T.surfaceAlt, border:'none', color:T.text, fontSize:'13.5px', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:'16px' }} />

            <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Description</label>
            <textarea value={uploadForm.description} onChange={e => setUploadForm(f => ({ ...f, description:e.target.value }))} placeholder="Décrivez brièvement la ressource…" rows={3}
              style={{ width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:'8px', background:T.surfaceAlt, border:'none', color:T.text, fontSize:'13.5px', fontFamily:'Inter,sans-serif', outline:'none', marginBottom:'20px', resize:'vertical' }} />

            <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap:'16px', marginBottom:'20px' }}>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Catégorie</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {categories.map(c => (
                    <Pill key={c.id} T={T} active={uploadForm.categorie === c.nom} onClick={() => setUploadForm(f => ({ ...f, categorie:c.nom }))}>{c.nom === 'Media' ? 'Média' : c.nom}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Faculté</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  <Pill T={T} active={!uploadForm.faculty_id} onClick={() => setUploadForm(f => ({ ...f, faculty_id:'' }))}>Général</Pill>
                  {faculties.map(f => (
                    <Pill key={f.id} T={T} active={uploadForm.faculty_id === String(f.id)} onClick={() => setUploadForm(p => ({ ...p, faculty_id:String(f.id) }))}>{f.nom}</Pill>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Niveau</label>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  <Pill T={T} active={!uploadForm.level_id} onClick={() => setUploadForm(f => ({ ...f, level_id:'' }))}>Tous niveaux</Pill>
                  {levels.map(l => (
                    <Pill key={l.id} T={T} active={uploadForm.level_id === String(l.id)} onClick={() => setUploadForm(p => ({ ...p, level_id:String(l.id) }))}>{l.nom}</Pill>
                  ))}
                </div>
              </div>
            </div>

            <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Fichier principal</label>
            <label style={{ display:'block', border:`1.5px dashed ${T.textMuted}`, borderRadius:'8px', padding:'28px', textAlign:'center', cursor:'pointer', marginBottom:'20px' }}>
              <input type="file" style={{ display:'none' }} onChange={e => setUploadFile_(e.target.files[0] || null)} />
              <span style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted }}>{uploadFile_ ? uploadFile_.name : 'Cliquer pour choisir un fichier'}</span>
            </label>

            <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Image de couverture (facultatif)</label>
            <label style={{ display:'block', border:`1.5px dashed ${T.textMuted}`, borderRadius:'8px', padding:'28px', textAlign:'center', cursor:'pointer', marginBottom:'20px' }}>
              <input type="file" accept="image/*" style={{ display:'none' }} onChange={e => setUploadCover(e.target.files[0] || null)} />
              <span style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted }}>{uploadCover ? uploadCover.name : 'Cliquer pour choisir une image'}</span>
            </label>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
              <span style={{ fontSize:'11.5px', color:T.textMuted }}>Visible immédiatement après dépôt.</span>
              <button type="submit" disabled={uploading} style={{ padding:'10px 22px', borderRadius:'8px', background:T.accent, color:T.accentText, border:'none', fontSize:'13px', fontWeight:'600', cursor: uploading?'default':'pointer', opacity: uploading?0.6:1, fontFamily:'Inter,sans-serif', display:'flex', alignItems:'center', gap:'8px' }}>
                {uploading && <FontAwesomeIcon icon={faSpinner} style={{ fontSize:'12px' }} />}
                {uploading ? 'Envoi...' : 'Déposer la ressource'}
              </button>
            </div>
          </div>
        </form>
      </div>
    );
  }

  // ── FICHE DÉTAIL ──────────────────────────────────────────────────────────
  if (view === 'detail') {
    if (detailLoading || !detail) {
      return <div style={{ textAlign:'center', padding:'60px', color:T.textMuted }}><FontAwesomeIcon icon={faSpinner} style={{ fontSize:'26px' }} /></div>;
    }
    const r = detail.resource;
    const dangereux = r.verification_status === 'dangereux';
    return (
      <div>
        <div onClick={() => setView('catalogue')} style={{ display:'flex', alignItems:'center', gap:'8px', color:T.textMuted, fontSize:'13px', cursor:'pointer', marginBottom:'20px', width:'fit-content' }}>
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize:'11px' }} /> Retour au catalogue
        </div>
        <div style={{ ...card({ padding: isMobile?'20px':'28px' }), marginBottom:'20px' }}>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '260px 1fr', gap:'24px' }}>
            <Cover T={T} resourceId={r.id} coverImagePath={r.cover_image_path} categorie={r.categorie} height={isMobile ? 140 : 200} />
            <div>
              <div style={{ display:'flex', gap:'8px', marginBottom:'10px', flexWrap:'wrap' }}>
                <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background:T.surfaceAlt, color:T.textMuted }}>{r.categorie === 'Media' ? 'Média' : r.categorie}</span>
                <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background:T.surfaceAlt, color:T.textMuted }}>{r.faculty_nom || 'Général'}</span>
                <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background:T.surfaceAlt, color:T.textMuted }}>{r.level_nom || 'Tous niveaux'}</span>
              </div>
              <div style={{ fontSize: isMobile?'18px':'22px', fontWeight:'700', color:T.text, marginBottom:'8px' }}>{r.titre}</div>
              {r.description && <div style={{ fontSize:'13px', color:T.textMuted, lineHeight:'1.6', marginBottom:'16px' }}>{r.description}</div>}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
                <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:T.surfaceAlt, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'600', color:T.text, fontSize:'12px', flexShrink:0 }}>
                  {(r.uploader_prenom?.[0]||'')}{(r.uploader_nom?.[0]||'')}
                </div>
                <div>
                  <div style={{ fontSize:'12.5px', fontWeight:'600', color:T.text }}>{r.uploader_prenom} {r.uploader_nom}</div>
                  <div style={{ fontSize:'11px', color:T.textMuted }}>Déposé le {fmtDate(r.created_at)} · {fmtSize(r.taille)} · {r.downloads_count || 0} téléchargement{(r.downloads_count||0)>1?'s':''}</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
                {dangereux ? (
                  <span style={{ fontSize:'12.5px', color:T.danger, fontWeight:'600' }}>Téléchargement bloqué — fichier marqué dangereux</span>
                ) : (
                  <button onClick={() => handleDownload(r.id, r.fichier_nom)} style={{ padding:'9px 18px', borderRadius:'8px', background:T.accent, color:T.accentText, border:'none', fontSize:'12.5px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontFamily:'Inter,sans-serif' }}>
                    <FontAwesomeIcon icon={faDownload} style={{ fontSize:'12px' }} /> Télécharger
                  </button>
                )}
                <button onClick={() => handleReport(r.id)} style={{ padding:'9px 18px', borderRadius:'8px', background:T.surfaceAlt, color:T.text, border:'none', fontSize:'12.5px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontFamily:'Inter,sans-serif' }}>
                  <FontAwesomeIcon icon={faFlag} style={{ fontSize:'12px' }} /> Signaler
                </button>
              </div>
            </div>
          </div>
        </div>

        {r.verification_status && r.verification_status !== 'non_concerne' && (
          <div style={{ ...card({ padding:'20px' }), marginBottom:'20px' }}>
            <div style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'12px' }}>Statut de vérification</div>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
              <VerificationBadge T={T} status={r.verification_status} />
              <span style={{ fontSize:'12.5px', color:T.textMuted }}>
                {r.verification_status === 'verifie' && 'Testé et approuvé par un administrateur.'}
                {r.verification_status === 'dangereux' && 'Testé et rejeté par un administrateur — téléchargement bloqué.'}
                {r.verification_status === 'non_verifie' && "Pas encore vérifié par un administrateur — téléchargez à vos risques."}
              </span>
            </div>
          </div>
        )}

        {(canVerify || canModerate) && (
          <div style={{ ...card({ padding:'20px' }), marginBottom:'20px' }}>
            <div style={{ fontSize:'12.5px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'12px' }}>Modération</div>
            <div style={{ display:'flex', gap:'16px', flexWrap:'wrap' }}>
              {canVerify && r.verification_status && r.verification_status !== 'non_concerne' && (
                <>
                  <span onClick={() => handleSetVerification(r.id, 'verifie')} style={{ fontSize:'12.5px', color:T.accent, fontWeight:'600', cursor:'pointer' }}>Marquer vérifié</span>
                  <span onClick={() => handleSetVerification(r.id, 'dangereux')} style={{ fontSize:'12.5px', color:T.danger, fontWeight:'600', cursor:'pointer' }}>Marquer dangereux</span>
                </>
              )}
              {canModerate && (
                <span onClick={() => handleModerationDelete(r.id)} style={{ fontSize:'12.5px', color:T.textMuted, fontWeight:'600', cursor:'pointer' }}>Supprimer (modération)</span>
              )}
            </div>
          </div>
        )}

        {detail.similar && detail.similar.length > 0 && (
          <div>
            <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'12px' }}>Ressources similaires</div>
            {isMobile ? (
              <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                {detail.similar.map(s => <ResourceRow key={s.id} T={T} r={s} onClick={() => openDetail(s.id)} />)}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'16px' }}>
                {detail.similar.map(s => <ResourceCard key={s.id} T={T} r={s} onClick={() => openDetail(s.id)} />)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── CATALOGUE ─────────────────────────────────────────────────────────────
  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'24px', gap:'16px', flexWrap:'wrap' }}>
        <div>
          <h2 style={{ color:T.text, fontSize: isMobile?'19px':'24px', fontWeight:'700', margin:0 }}>Espace communautaire</h2>
          <p style={{ color:T.textMuted, fontSize:'13px', margin:'6px 0 0' }}>Dépôt libre — cours, logiciels, médias</p>
        </div>
        <button onClick={() => setView('upload')} style={{ padding:'9px 16px', borderRadius:'8px', background:T.accent, color:T.accentText, border:'none', fontSize:'12.5px', fontWeight:'600', cursor:'pointer', display:'flex', alignItems:'center', gap:'8px', fontFamily:'Inter,sans-serif' }}>
          <FontAwesomeIcon icon={faUpload} style={{ fontSize:'12px' }} /> Déposer
        </button>
      </div>

      {priorityFolders.length > 0 && (
        <div style={{ marginBottom:'20px' }}>
          <div style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'10px' }}>Dossiers prioritaires</div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap:'12px' }}>
            {priorityFolders.map(pf => (
              <div key={pf.id} onClick={() => setFilters(f => ({ ...f, faculty:String(pf.faculty_id), level: pf.level_id ? String(pf.level_id) : '' }))}
                style={{ background:T.surface, borderRadius:'6px', padding:'14px 16px', cursor:'pointer', border:`1px solid ${T.accent}30` }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                  <FontAwesomeIcon icon={faStar} style={{ color:T.accent, fontSize:'11px' }} />
                  <span style={{ fontSize:'13px', fontWeight:'600', color:T.text }}>{pf.faculty_nom}{pf.filiere_nom ? ` › ${pf.filiere_nom}` : ''}{pf.level_nom ? ` › ${pf.level_nom}` : ''}</span>
                </div>
                <div style={{ fontSize:'11.5px', color:T.textMuted }}>{pf.resource_count || 0} ressource{(pf.resource_count || 0) > 1 ? 's' : ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginBottom:'20px' }}>
        <div style={{ display:'flex', gap:'4px', background: isMobile ? 'transparent' : T.surface, borderRadius:'8px', padding: isMobile ? 0 : '3px', width: isMobile ? '100%' : 'fit-content', overflowX: isMobile ? 'auto' : 'visible', flexWrap: isMobile ? 'nowrap' : 'wrap' }}>
          {[{ id:'all', nom:'' }, ...categories].map(c => (
            <span key={c.id} onClick={() => setFilters(f => ({ ...f, category:c.nom }))}
              style={{ padding: isMobile ? '6px 12px' : '6px 14px', borderRadius: isMobile ? '12px' : '6px', fontSize: isMobile ? '11.5px' : '12px', fontWeight:'600', cursor:'pointer', flexShrink:0, whiteSpace:'nowrap', background: isMobile ? (filters.category === c.nom ? T.accentDim : T.surfaceAlt) : (filters.category === c.nom ? T.bg : 'transparent'), color: filters.category === c.nom ? (isMobile ? T.accent : T.text) : T.textMuted }}>
              {c.nom === '' ? 'Tous' : c.nom === 'Media' ? 'Média' : c.nom}
            </span>
          ))}
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible' }}>
          <Pill T={T} active={!filters.faculty} onClick={() => setFilters(f => ({ ...f, faculty:'' }))}>Général</Pill>
          {faculties.map(f => (
            <Pill key={f.id} T={T} active={filters.faculty === String(f.id)} onClick={() => setFilters(p => ({ ...p, faculty:String(f.id) }))}>{f.nom}</Pill>
          ))}
        </div>
        <div style={{ display:'flex', gap:'6px', flexWrap: isMobile ? 'nowrap' : 'wrap', overflowX: isMobile ? 'auto' : 'visible' }}>
          <Pill T={T} active={!filters.level} onClick={() => setFilters(f => ({ ...f, level:'' }))}>Tous niveaux</Pill>
          {levels.map(l => (
            <Pill key={l.id} T={T} active={filters.level === String(l.id)} onClick={() => setFilters(p => ({ ...p, level:String(l.id) }))}>{l.nom}</Pill>
          ))}
        </div>
        <div style={{ position:'relative', maxWidth: isMobile ? '100%' : '320px' }}>
          <FontAwesomeIcon icon={faMagnifyingGlass} style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:T.textMuted, fontSize:'12px' }} />
          <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setFilters(f => ({ ...f, q:searchInput }))}
            onBlur={() => setFilters(f => ({ ...f, q:searchInput }))}
            placeholder="Rechercher une ressource…"
            style={{ width:'100%', boxSizing:'border-box', padding:'9px 14px 9px 36px', borderRadius:'8px', background:T.surface, border:'none', color:T.text, fontSize:'12.5px', fontFamily:'Inter,sans-serif', outline:'none' }} />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:T.textMuted }}><FontAwesomeIcon icon={faSpinner} style={{ fontSize:'26px' }} /></div>
      ) : resources.length === 0 ? (
        <div style={{ ...card({ padding:'48px 24px', textAlign:'center' }) }}>
          <FontAwesomeIcon icon={faFolderOpen} style={{ color:T.textMuted, fontSize:'28px', marginBottom:'12px' }} />
          <p style={{ color:T.text, fontSize:'15px', fontWeight:'600', margin:'0 0 4px' }}>Aucune ressource pour l'instant</p>
          <p style={{ color:T.textMuted, fontSize:'13px', margin:0 }}>Soyez le premier à déposer un cours, un logiciel ou un média.</p>
        </div>
      ) : isMobile ? (
        <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
          {resources.map(r => <ResourceRow key={r.id} T={T} r={r} onClick={() => openDetail(r.id)} />)}
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(200px, 1fr))', gap:'20px' }}>
          {resources.map(r => <ResourceCard key={r.id} T={T} r={r} onClick={() => openDetail(r.id)} />)}
        </div>
      )}

      {!loading && resources.length > 0 && totalPages > 1 && (
        <div style={{ display:'flex', justifyContent:'center', alignItems:'center', gap:'14px', marginTop:'28px' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            style={{ padding:'7px 14px', borderRadius:'8px', background:T.surface, border:'none', color: page <= 1 ? T.textMuted : T.text, fontSize:'12.5px', fontWeight:'600', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? .5 : 1 }}>
            Précédent
          </button>
          <span style={{ fontSize:'12.5px', color:T.textMuted }}>Page {page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            style={{ padding:'7px 14px', borderRadius:'8px', background:T.surface, border:'none', color: page >= totalPages ? T.textMuted : T.text, fontSize:'12.5px', fontWeight:'600', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? .5 : 1 }}>
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
