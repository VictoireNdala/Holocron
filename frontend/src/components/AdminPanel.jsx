import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faStar, faTrash } from '@fortawesome/free-solid-svg-icons';
import {
  listAdmins, searchUsers, grantAdmin, revokeAdmin,
  listPriorityFolders, createPriorityFolder, deletePriorityFolder,
  listActivityLogs, listFaculties, listLevels, listFacultyFilieres,
  listAdminUsers, toggleUserActive, listMatricules, addMatricule, deleteMatricule,
  listCategories, createFaculty, deleteFaculty, createFiliereEntry, deleteFiliereEntry,
  createLevelEntry, deleteLevelEntry, createCategoryEntry, deleteCategoryEntry,
} from '../services/api';

const FILIERES = ['Genie Logiciel', 'Intelligence Artificielle', 'Systemes Informatiques'];
const ROLES = [
  { value:'etudiant',   label:'Étudiant' },
  { value:'professeur', label:'Professeur' },
  { value:'assistant',  label:'Assistant' },
];

const PERMISSIONS = [
  { value:'verifier_logiciels',      label:'Vérifier les logiciels' },
  { value:'moderer_communautaire',   label:"Modérer l'espace communautaire" },
  { value:'gerer_matricules',        label:'Gérer les matricules' },
  { value:'gerer_utilisateurs',      label:'Gérer les utilisateurs' },
  { value:'gerer_dossiers',          label:'Gérer les dossiers prioritaires' },
  { value:'voir_logs',               label:"Voir les journaux d'activité" },
  { value:'gerer_taxonomie',         label:'Gérer la taxonomie (facultés, niveaux, catégories)' },
];

const ACTION_LABELS = {
  upload: 'a déposé une ressource', download: 'a téléchargé une ressource', signaler: 'a signalé une ressource',
  verifier_logiciel: 'a vérifié un logiciel', marquer_dangereux: 'a marqué un logiciel comme dangereux',
  moderer_supprimer: 'a supprimé une ressource (modération)',
  promotion_super_admin: 'a promu super admin', grant_admin_simple: 'a accordé des droits admin simple',
  revoke_admin: 'a retiré des droits admin', creer_dossier_prioritaire: 'a créé un dossier prioritaire',
  supprimer_dossier_prioritaire: 'a supprimé un dossier prioritaire',
};

function Pill({ T, active, onClick, children }) {
  return (
    <span onClick={onClick} style={{ padding:'6px 13px', borderRadius:'12px', fontSize:'12px', fontWeight:'600', cursor:'pointer', background: active ? T.accentDim : T.surfaceAlt, color: active ? T.accent : T.textMuted, whiteSpace:'nowrap' }}>
      {children}
    </span>
  );
}

const SUB_TABS = [
  { id:'users',   label:'Utilisateurs',         perm:'gerer_utilisateurs',
    desc:"Voir les comptes inscrits, filtrer par rôle et activer/désactiver un accès." },
  { id:'matricules', label:'Matricules',        perm:'gerer_matricules',
    desc:"Liste blanche des matricules autorisés à s'inscrire — ajouter ou retirer un matricule." },
  { id:'admins',  label:'Administrateurs',      perm:null,
    desc:"Voir qui a des droits admin et lesquels ; un super admin peut en attribuer ou en retirer." },
  { id:'folders', label:'Dossiers prioritaires', perm:'gerer_dossiers',
    desc:"Mettre en avant une faculté/niveau dans le catalogue de l'Espace communautaire." },
  { id:'logs',    label:"Journaux d'activité",  perm:'voir_logs',
    desc:"Historique des actions sensibles (dépôts, vérifications, droits admin...) — filtrable." },
  { id:'taxonomy', label:'Taxonomie',           perm:'gerer_taxonomie',
    desc:"Facultés, filières, niveaux et catégories de l'Espace communautaire — créer, retirer, sans toucher au code." },
];

export default function AdminPanel({ T, isMobile, isSuperAdmin, permissions = [] }) {
  const visibleTabs = SUB_TABS.filter(t => !t.perm || isSuperAdmin || permissions.includes(t.perm));
  const [sub, setSub] = useState(visibleTabs[0]?.id || 'admins');

  const card = (extra = {}) => ({ background:T.surface, borderRadius:'6px', ...extra });
  const inputStyle = { width:'100%', boxSizing:'border-box', padding:'10px 13px', borderRadius:'8px', background:T.surfaceAlt, border:'none', color:T.text, fontSize:'13.5px', fontFamily:'Inter,sans-serif', outline:'none' };
  const buttonStyle = { padding:'9px 20px', borderRadius:'8px', background:T.accent, color:T.accentText, border:'none', fontSize:'12.5px', fontWeight:'600', cursor:'pointer', fontFamily:'Inter,sans-serif' };

  return (
    <div>
      <h2 style={{ color:T.text, fontSize: isMobile?'19px':'24px', fontWeight:'700', margin:'0 0 6px' }}>Administration</h2>
      <p style={{ color:T.textMuted, fontSize:'13px', margin:'0 0 20px' }}>Panel Admin</p>

      <div style={{ display:'flex', gap:'4px', background: isMobile ? 'transparent' : T.surface, borderRadius:'8px', padding: isMobile ? 0 : '3px', width: isMobile ? '100%' : 'fit-content', overflowX: isMobile ? 'auto' : 'visible', flexWrap: isMobile ? 'nowrap' : 'wrap', marginBottom:'24px' }}>
        {visibleTabs.map(t => (
          <span key={t.id} onClick={() => setSub(t.id)} style={{ padding: isMobile ? '6px 12px' : '6px 14px', borderRadius: isMobile ? '12px' : '6px', fontSize: isMobile ? '11.5px' : '12px', fontWeight:'600', cursor:'pointer', background: isMobile ? (sub === t.id ? T.accentDim : T.surfaceAlt) : (sub === t.id ? T.bg : 'transparent'), color: sub === t.id ? (isMobile ? T.accent : T.text) : T.textMuted, whiteSpace:'nowrap', flexShrink:0 }}>
            {t.label}
          </span>
        ))}
      </div>

      {SUB_TABS.find(t => t.id === sub)?.desc && (
        <p style={{ color:T.textMuted, fontSize:'12.5px', margin:'0 0 16px' }}>{SUB_TABS.find(t => t.id === sub).desc}</p>
      )}
      {isMobile && ['admins', 'folders', 'matricules', 'taxonomy'].includes(sub) && (
        <p style={{ color:T.textMuted, fontSize:'12px', margin:'0 0 16px' }}>Création et attribution disponibles sur la version desktop.</p>
      )}

      {sub === 'users'      && <UsersTab      T={T} isMobile={isMobile} card={card} inputStyle={inputStyle} />}
      {sub === 'matricules' && <MatriculesTab T={T} isMobile={isMobile} card={card} inputStyle={inputStyle} buttonStyle={buttonStyle} />}
      {sub === 'admins'     && <AdminsTab     T={T} isMobile={isMobile} isSuperAdmin={isSuperAdmin} card={card} inputStyle={inputStyle} buttonStyle={buttonStyle} />}
      {sub === 'folders'    && <FoldersTab    T={T} isMobile={isMobile} card={card} inputStyle={inputStyle} buttonStyle={buttonStyle} />}
      {sub === 'logs'       && <LogsTab       T={T} isMobile={isMobile} card={card} inputStyle={inputStyle} />}
      {sub === 'taxonomy'   && <TaxonomyTab   T={T} isMobile={isMobile} card={card} inputStyle={inputStyle} buttonStyle={buttonStyle} />}
    </div>
  );
}

// ── Utilisateurs ──────────────────────────────────────────────────────────
function UsersTab({ T, isMobile, card, inputStyle }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [query, setQuery] = useState('');

  const load = () => { setLoading(true); listAdminUsers(query).then(r => setUsers(r.data.users || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [query]);

  const handleToggle = async (userId) => {
    try { await toggleUserActive(userId); load(); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la mise à jour.'); }
  };

  const filtered = users.filter(u => {
    if (roleFilter === 'desactives') return !u.is_active;
    if (roleFilter) return u.role === roleFilter;
    return true;
  });

  return (
    <div>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'16px', marginBottom:'16px', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          <Pill T={T} active={!roleFilter} onClick={() => setRoleFilter('')}>Tous</Pill>
          <Pill T={T} active={roleFilter==='etudiant'} onClick={() => setRoleFilter('etudiant')}>Étudiants</Pill>
          <Pill T={T} active={roleFilter==='professeur'} onClick={() => setRoleFilter('professeur')}>Professeurs</Pill>
          <Pill T={T} active={roleFilter==='assistant'} onClick={() => setRoleFilter('assistant')}>Assistants</Pill>
          <Pill T={T} active={roleFilter==='desactives'} onClick={() => setRoleFilter('desactives')}>Désactivés</Pill>
        </div>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un utilisateur…" style={{ ...inputStyle, width: isMobile ? '100%' : '220px' }} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px' }}><FontAwesomeIcon icon={faSpinner} style={{ color:T.textMuted }} /></div>
      ) : filtered.length === 0 ? (
        <p style={{ color:T.textMuted, fontSize:'13px' }}>Aucun utilisateur trouvé.</p>
      ) : (
        <div style={{ ...card({ padding:'12px' }) }}>
          {filtered.map(u => (
            <div key={u.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'14px 16px', borderBottom:`1px solid ${T.border}`, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <div style={{ minWidth:0, flex:'1.5' }}>
                <div style={{ fontSize:'13.5px', fontWeight:'600', color:T.text }}>{u.prenom} {u.nom}</div>
                <div style={{ fontSize:'12px', color:T.textMuted, marginTop:'2px', fontFamily:'ui-monospace,Menlo,monospace' }}>{u.matricule}</div>
              </div>
              <span style={{ fontSize:'12.5px', color:T.textMuted, flex:'1' }}>{ROLES.find(r => r.value===u.role)?.label || u.role}</span>
              <span style={{ fontSize:'11px', fontWeight:'600', padding:'3px 9px', borderRadius:'12px', background: u.is_active ? T.surfaceAlt : T.dangerDim, color: u.is_active ? T.textMuted : T.danger, whiteSpace:'nowrap' }}>{u.is_active ? 'Actif' : 'Désactivé'}</span>
              <span onClick={() => handleToggle(u.id)} style={{ fontSize:'12px', color: u.is_active ? T.danger : T.accent, fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' }}>{u.is_active ? 'Désactiver' : 'Réactiver'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Matricules (liste blanche) ────────────────────────────────────────────
function MatriculesTab({ T, isMobile, card, inputStyle, buttonStyle }) {
  const [matricules, setMatricules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState({ matricule:'', nom:'', prenom:'', role:'etudiant', filiere:FILIERES[0] });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => { setLoading(true); listMatricules(query).then(r => setMatricules(r.data.matricules || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [query]);

  const handleAdd = async () => {
    setError('');
    if (!form.matricule.trim() || !form.nom.trim() || !form.prenom.trim()) return setError('Matricule, nom et prénom sont requis.');
    setSaving(true);
    try {
      await addMatricule({ ...form, matricule: form.matricule.trim().toUpperCase() });
      setForm({ matricule:'', nom:'', prenom:'', role:'etudiant', filiere:FILIERES[0] });
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Échec de l'ajout.");
    } finally { setSaving(false); }
  };

  const handleDelete = async (matricule) => {
    if (!window.confirm(`Retirer ${matricule} de la liste blanche ?`)) return;
    try { await deleteMatricule(matricule); load(); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la suppression.'); }
  };

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher un matricule…" style={{ ...inputStyle, width: isMobile ? '100%' : '260px', marginBottom:'16px' }} />

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px' }}><FontAwesomeIcon icon={faSpinner} style={{ color:T.textMuted }} /></div>
      ) : (
        <div style={{ ...card({ padding:'12px' }), marginBottom:'20px' }}>
          {matricules.length === 0 ? <p style={{ color:T.textMuted, fontSize:'13px', padding:'8px' }}>Aucun matricule.</p> : matricules.map(m => (
            <div key={m.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'14px 16px', borderBottom:`1px solid ${T.border}`, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <span style={{ fontSize:'12.5px', color:T.textMuted, fontFamily:'ui-monospace,Menlo,monospace', flex:'1' }}>{m.matricule}</span>
              <span style={{ fontSize:'13.5px', fontWeight:'600', color:T.text, flex:'1.4' }}>{m.prenom} {m.nom}</span>
              <span style={{ fontSize:'12.5px', color:T.textMuted, flex:'1' }}>{ROLES.find(r => r.value===m.role)?.label || m.role}{m.filiere ? ` · ${m.filiere}` : ''}</span>
              <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background: m.is_used ? T.surfaceAlt : T.accentDim, color: m.is_used ? T.textMuted : T.accent, whiteSpace:'nowrap' }}>{m.is_used ? 'Utilisé' : 'Disponible'}</span>
              {!m.is_used && <span onClick={() => handleDelete(m.matricule)} style={{ fontSize:'12px', color:T.danger, fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' }}>Retirer</span>}
            </div>
          ))}
        </div>
      )}

      {!isMobile && (
        <div style={{ ...card({ padding:'24px' }) }}>
          <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'16px' }}>Ajouter un matricule</div>
          {error && <p style={{ color:T.danger, fontSize:'12.5px', margin:'0 0 12px' }}>{error}</p>}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'14px' }}>
            <input value={form.matricule} onChange={e => setForm(f => ({ ...f, matricule:e.target.value.toUpperCase() }))} placeholder="Matricule" style={inputStyle} />
            <div style={{ display:'flex', gap:'10px' }}>
              <input value={form.prenom} onChange={e => setForm(f => ({ ...f, prenom:e.target.value }))} placeholder="Prénom" style={inputStyle} />
              <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom:e.target.value }))} placeholder="Nom" style={inputStyle} />
            </div>
          </div>
          <div style={{ display:'flex', gap:'16px', flexWrap:'wrap', marginBottom:'18px' }}>
            <div style={{ display:'flex', gap:'6px' }}>
              {ROLES.map(r => <Pill key={r.value} T={T} active={form.role===r.value} onClick={() => setForm(f => ({ ...f, role:r.value }))}>{r.label}</Pill>)}
            </div>
            {form.role === 'etudiant' && (
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {FILIERES.map(f => <Pill key={f} T={T} active={form.filiere===f} onClick={() => setForm(p => ({ ...p, filiere:f }))}>{f}</Pill>)}
              </div>
            )}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={handleAdd} disabled={saving} style={{ ...buttonStyle, opacity: saving?0.6:1 }}>{saving ? 'Envoi...' : 'Ajouter à la liste blanche'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Administrateurs ─────────────────────────────────────────────────────────
function AdminsTab({ T, isMobile, isSuperAdmin, card, inputStyle, buttonStyle }) {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [level, setLevel] = useState('simple');
  const [perms, setPerms] = useState([]);
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); listAdmins().then(r => setAdmins(r.data.admins || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => { searchUsers(query).then(r => setResults(r.data.users || [])).catch(() => {}); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  const togglePerm = (p) => setPerms(ps => ps.includes(p) ? ps.filter(x => x !== p) : [...ps, p]);

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await grantAdmin(selected.id, level, level === 'simple' ? perms : []);
      setSelected(null); setQuery(''); setResults([]); setLevel('simple'); setPerms([]);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Échec de l\'attribution des droits.');
    } finally { setSaving(false); }
  };

  const handleRevoke = async (userId) => {
    if (!window.confirm('Retirer les droits admin de cet utilisateur ?')) return;
    try { await revokeAdmin(userId); load(); }
    catch (err) { alert(err.response?.data?.message || 'Échec du retrait.'); }
  };

  if (!isSuperAdmin) {
    return (
      <div style={{ ...card({ padding:'24px' }) }}>
        {loading ? <FontAwesomeIcon icon={faSpinner} /> : (
          <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
            {admins.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0', borderBottom:`1px solid ${T.border}` }}>
                <div>
                  <span style={{ fontSize:'13.5px', fontWeight:'600', color:T.text }}>{a.prenom} {a.nom}</span>
                  <span style={{ fontSize:'12px', color:T.textMuted, marginLeft:'8px' }}>{a.matricule}</span>
                </div>
                <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background: a.admin_level==='super' ? T.accentDim : T.surfaceAlt, color: a.admin_level==='super' ? T.accent : T.textMuted }}>{a.admin_level==='super'?'Super admin':'Admin simple'}</span>
              </div>
            ))}
          </div>
        )}
        <p style={{ color:T.textMuted, fontSize:'12px', marginTop:'16px' }}>Seul un super admin peut attribuer ou retirer des droits admin.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ ...card({ padding:'12px' }), marginBottom:'20px' }}>
        {loading ? <div style={{ padding:'20px', textAlign:'center' }}><FontAwesomeIcon icon={faSpinner} style={{ color:T.textMuted }} /></div> : (
          <div style={{ overflowX:'auto' }}>
            {admins.map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px', padding:'14px 16px', borderBottom:`1px solid ${T.border}`, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:'13.5px', fontWeight:'600', color:T.text }}>{a.prenom} {a.nom}</div>
                  <div style={{ fontSize:'12px', color:T.textMuted, marginTop:'2px' }}>{a.matricule}</div>
                </div>
                <span style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background: a.admin_level==='super' ? T.accentDim : T.surfaceAlt, color: a.admin_level==='super' ? T.accent : T.textMuted, whiteSpace:'nowrap' }}>{a.admin_level==='super'?'Super admin':'Admin simple'}</span>
                <div style={{ display:'flex', gap:'5px', flexWrap:'wrap', flex:1, minWidth:'140px' }}>
                  {a.admin_level === 'super' ? <span style={{ fontSize:'11.5px', color:T.textMuted }}>Tous les droits</span> :
                    (a.permissions || []).map(p => (
                      <span key={p} style={{ fontSize:'10.5px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', background:T.surfaceAlt, color:T.textMuted, whiteSpace:'nowrap' }}>{PERMISSIONS.find(x => x.value===p)?.label || p}</span>
                    ))}
                </div>
                <span onClick={() => handleRevoke(a.id)} style={{ fontSize:'12px', color:T.danger, fontWeight:'600', cursor:'pointer', whiteSpace:'nowrap' }}>Retirer</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isMobile && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px' }}>
          <div style={{ ...card({ padding:'24px' }) }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'14px' }}>1. Choisir un utilisateur</div>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Rechercher par nom ou matricule…" style={{ ...inputStyle, marginBottom:'14px' }} />
            <div style={{ display:'flex', flexDirection:'column', gap:'2px' }}>
              {results.map(u => (
                <div key={u.id} onClick={() => setSelected(u)} style={{ padding:'10px 12px', borderRadius:'6px', cursor:'pointer', background: selected?.id === u.id ? T.surfaceAlt : 'transparent' }}>
                  <span style={{ fontSize:'13px', fontWeight:'600', color:T.text }}>{u.prenom} {u.nom}</span>
                  <span style={{ fontSize:'12px', color:T.textMuted, marginLeft:'8px' }}>{u.matricule} · {u.role}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ ...card({ padding:'24px' }) }}>
            <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'14px' }}>
              2. Définir le niveau{selected ? ` — ${selected.prenom} ${selected.nom}` : ''}
            </div>
            {!selected ? (
              <p style={{ color:T.textMuted, fontSize:'12.5px' }}>Choisissez d'abord un utilisateur.</p>
            ) : (
              <>
                <div style={{ display:'flex', gap:'10px', marginBottom:'18px' }}>
                  <Pill T={T} active={level==='super'} onClick={() => setLevel('super')}>Super admin</Pill>
                  <Pill T={T} active={level==='simple'} onClick={() => setLevel('simple')}>Admin simple</Pill>
                </div>
                {level === 'simple' && (
                  <>
                    <div style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'10px' }}>Permissions accordées</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:'10px', marginBottom:'20px' }}>
                      {PERMISSIONS.map(p => (
                        <label key={p.value} style={{ display:'flex', alignItems:'center', gap:'10px', cursor:'pointer' }}>
                          <input type="checkbox" checked={perms.includes(p.value)} onChange={() => togglePerm(p.value)} style={{ width:'16px', height:'16px', accentColor:T.accent, cursor:'pointer' }} />
                          <span style={{ fontSize:'13px', color:T.text }}>{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </>
                )}
                <div style={{ display:'flex', justifyContent:'flex-end' }}>
                  <button onClick={handleConfirm} disabled={saving} style={{ ...buttonStyle, opacity: saving?0.6:1 }}>{saving ? 'Envoi...' : 'Confirmer'}</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dossiers prioritaires ─────────────────────────────────────────────────
function FoldersTab({ T, isMobile, card, buttonStyle }) {
  const [folders, setFolders] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [levels, setLevels] = useState([]);
  const [filieres, setFilieres] = useState([]);
  const [loading, setLoading] = useState(false);
  const [facultyId, setFacultyId] = useState('');
  const [filiereId, setFiliereId] = useState('');
  const [levelId, setLevelId] = useState('');
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); listPriorityFolders().then(r => setFolders(r.data.folders || [])).catch(() => {}).finally(() => setLoading(false)); };
  useEffect(load, []);
  useEffect(() => {
    listFaculties().then(r => setFaculties(r.data.faculties || [])).catch(() => {});
    listLevels().then(r => setLevels(r.data.levels || [])).catch(() => {});
  }, []);
  useEffect(() => {
    setFiliereId('');
    if (!facultyId) { setFilieres([]); return; }
    listFacultyFilieres(facultyId).then(r => setFilieres(r.data.filieres || [])).catch(() => setFilieres([]));
  }, [facultyId]);

  const handleCreate = async () => {
    if (!facultyId) return alert('Choisissez une faculté.');
    setSaving(true);
    try {
      await createPriorityFolder({ faculty_id:facultyId, filiere_id:filiereId || undefined, level_id:levelId || undefined });
      setFacultyId(''); setFiliereId(''); setLevelId(''); load();
    }
    catch (err) { alert(err.response?.data?.message || 'Échec de la création.'); }
    finally { setSaving(false); }
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Retirer ce dossier prioritaire ?')) return;
    try { await deletePriorityFolder(id); load(); }
    catch { alert('Échec de la suppression.'); }
  };

  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1.4fr 1fr', gap:'20px', alignItems:'start' }}>
      <div>
        {loading ? <FontAwesomeIcon icon={faSpinner} style={{ color:T.textMuted }} /> : folders.length === 0 ? (
          <p style={{ color:T.textMuted, fontSize:'13px' }}>Aucun dossier prioritaire pour l'instant.</p>
        ) : folders.map(f => (
          <div key={f.id} style={{ ...card({ padding:'18px' }), marginBottom:'12px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'12px' }}>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                <FontAwesomeIcon icon={faStar} style={{ color:T.accent, fontSize:'12px' }} />
                <span style={{ fontSize:'13.5px', fontWeight:'600', color:T.text }}>{f.faculty_nom} › {f.filiere_nom || '—'} › {f.level_nom || 'Tous niveaux'}</span>
              </div>
              <div style={{ fontSize:'12px', color:T.textMuted }}>{f.resource_count ?? 0} ressource{(f.resource_count ?? 0) > 1 ? 's' : ''} · créé le {new Date(f.created_at).toLocaleDateString('fr-FR', { day:'2-digit', month:'long' })}</div>
            </div>
            <span onClick={() => handleDelete(f.id)} style={{ fontSize:'12px', color:T.danger, fontWeight:'600', cursor:'pointer', flexShrink:0 }}><FontAwesomeIcon icon={faTrash} style={{ fontSize:'11px' }} /></span>
          </div>
        ))}
      </div>
      {!isMobile && (
        <div style={{ ...card({ padding:'24px' }) }}>
          <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'16px' }}>Créer un dossier prioritaire</div>
          <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Faculté</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
            {faculties.map(f => <Pill key={f.id} T={T} active={facultyId===String(f.id)} onClick={() => setFacultyId(String(f.id))}>{f.nom}</Pill>)}
          </div>
          {facultyId && filieres.length > 0 && (
            <>
              <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Filière (optionnel)</label>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'16px' }}>
                <Pill T={T} active={!filiereId} onClick={() => setFiliereId('')}>Toutes filières</Pill>
                {filieres.map(f => <Pill key={f.id} T={T} active={filiereId===String(f.id)} onClick={() => setFiliereId(String(f.id))}>{f.nom}</Pill>)}
              </div>
            </>
          )}
          <label style={{ fontSize:'12px', fontWeight:'600', color:T.textMuted, marginBottom:'6px', display:'block' }}>Niveau (optionnel)</label>
          <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'20px' }}>
            <Pill T={T} active={!levelId} onClick={() => setLevelId('')}>Tous niveaux</Pill>
            {levels.map(l => <Pill key={l.id} T={T} active={levelId===String(l.id)} onClick={() => setLevelId(String(l.id))}>{l.nom}</Pill>)}
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end' }}>
            <button onClick={handleCreate} disabled={saving} style={{ ...buttonStyle, opacity: saving?0.6:1 }}>{saving ? 'Envoi...' : 'Créer'}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Journaux d'activité ───────────────────────────────────────────────────
function LogsTab({ T, isMobile, card, inputStyle }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    setLoading(true);
    listActivityLogs({ user: selectedUser?.id, action, from, to }).then(r => setLogs(r.data.logs || [])).catch(() => setLogs([])).finally(() => setLoading(false));
  }, [selectedUser, action, from, to]);

  useEffect(() => {
    if (!userQuery.trim() || selectedUser) { setUserResults([]); return; }
    const t = setTimeout(() => { searchUsers(userQuery).then(r => setUserResults(r.data.users || [])).catch(() => {}); }, 300);
    return () => clearTimeout(t);
  }, [userQuery, selectedUser]);

  return (
    <div>
      <div style={{ display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-start', marginBottom:'20px' }}>
        <div style={{ position:'relative', width: isMobile ? '100%' : '220px' }}>
          {selectedUser ? (
            <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'9px 12px', borderRadius:'8px', background:T.accentDim }}>
              <span style={{ flex:1, fontSize:'12.5px', color:T.accent, fontWeight:'600', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{selectedUser.prenom} {selectedUser.nom}</span>
              <span onClick={() => { setSelectedUser(null); setUserQuery(''); }} style={{ cursor:'pointer', color:T.accent, fontWeight:'700' }}>×</span>
            </div>
          ) : (
            <input value={userQuery} onChange={e => setUserQuery(e.target.value)} placeholder="Filtrer par utilisateur…" style={{ ...inputStyle, width: isMobile ? '100%' : '220px' }} />
          )}
          {userResults.length > 0 && (
            <div style={{ position:'absolute', top:'100%', left:0, right:0, marginTop:'4px', background:T.surface, borderRadius:'8px', padding:'4px', zIndex:10, maxHeight:'200px', overflowY:'auto' }}>
              {userResults.map(u => (
                <div key={u.id} onClick={() => { setSelectedUser(u); setUserResults([]); }} style={{ padding:'8px 10px', borderRadius:'6px', cursor:'pointer', fontSize:'12.5px', color:T.text }}>
                  {u.prenom} {u.nom} <span style={{ color:T.textMuted }}>· {u.matricule}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <select value={action} onChange={e => setAction(e.target.value)} style={{ ...inputStyle, width:'auto' }}>
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={{ ...inputStyle, width:'auto' }} />
        <input type="date" value={to} onChange={e => setTo(e.target.value)} style={{ ...inputStyle, width:'auto' }} />
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'40px' }}><FontAwesomeIcon icon={faSpinner} style={{ color:T.textMuted }} /></div>
      ) : logs.length === 0 ? (
        <p style={{ color:T.textMuted, fontSize:'13px' }}>Aucune activité pour cette période.</p>
      ) : (
        <div style={{ ...card({ padding:'8px' }) }}>
          {logs.map(l => (
            <div key={l.id} style={{ display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px', borderBottom:`1px solid ${T.border}`, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:'13.5px', fontWeight:'600', color:T.text }}>{l.prenom} {l.nom}</span>
                <span style={{ fontSize:'13px', color:T.textMuted }}> {ACTION_LABELS[l.action] || l.action}{l.cible_id ? ` (#${l.cible_id})` : ''}</span>
              </div>
              <span style={{ fontSize:'12px', color:T.textMuted, whiteSpace:'nowrap' }}>{new Date(l.created_at).toLocaleString('fr-FR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Taxonomie Espace communautaire (Axe F6) ──────────────────────────────
// Les valeurs de départ (Sciences Informatiques, L1-L5, Cours/Logiciel/
// Media/Autre) n'étaient qu'un échantillon — CRUD simple sur les 4
// référentiels, plus rien en dur côté code une fois ici.
function TaxonomyTab({ T, isMobile, card, inputStyle, buttonStyle }) {
  const [faculties, setFaculties] = useState([]);
  const [levels, setLevels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filieresByFaculty, setFilieresByFaculty] = useState({}); // { [facultyId]: [...] }
  const [loading, setLoading] = useState(false);
  const [expandedFaculty, setExpandedFaculty] = useState(null);

  const [newFaculty, setNewFaculty] = useState('');
  const [newFiliere, setNewFiliere] = useState('');
  const [newLevel, setNewLevel] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryIsLogiciel, setNewCategoryIsLogiciel] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([listFaculties(), listLevels(), listCategories()])
      .then(([f, l, c]) => { setFaculties(f.data.faculties || []); setLevels(l.data.levels || []); setCategories(c.data.categories || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const loadFilieres = (facultyId) => {
    listFacultyFilieres(facultyId).then(r => setFilieresByFaculty(prev => ({ ...prev, [facultyId]: r.data.filieres || [] }))).catch(() => {});
  };
  const toggleFaculty = (facultyId) => {
    if (expandedFaculty === facultyId) { setExpandedFaculty(null); return; }
    setExpandedFaculty(facultyId);
    if (!filieresByFaculty[facultyId]) loadFilieres(facultyId);
  };

  const handleAddFaculty = async () => {
    if (!newFaculty.trim()) return;
    setSaving(true);
    try { await createFaculty(newFaculty.trim()); setNewFaculty(''); load(); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la création.'); }
    finally { setSaving(false); }
  };
  const handleDeleteFaculty = async (id) => {
    if (!window.confirm('Supprimer cette faculté ? Les ressources déjà classées dessus repasseront en "Général".')) return;
    try { await deleteFaculty(id); load(); }
    catch { alert('Échec de la suppression.'); }
  };

  const handleAddFiliere = async (facultyId) => {
    if (!newFiliere.trim()) return;
    setSaving(true);
    try { await createFiliereEntry(facultyId, newFiliere.trim()); setNewFiliere(''); loadFilieres(facultyId); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la création.'); }
    finally { setSaving(false); }
  };
  const handleDeleteFiliere = async (facultyId, id) => {
    if (!window.confirm('Supprimer cette filière ? Les dossiers prioritaires basés dessus seront aussi retirés.')) return;
    try { await deleteFiliereEntry(id); loadFilieres(facultyId); }
    catch { alert('Échec de la suppression.'); }
  };

  const handleAddLevel = async () => {
    if (!newLevel.trim()) return;
    setSaving(true);
    try { await createLevelEntry(newLevel.trim(), levels.length + 1); setNewLevel(''); load(); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la création.'); }
    finally { setSaving(false); }
  };
  const handleDeleteLevel = async (id) => {
    if (!window.confirm('Supprimer ce niveau ?')) return;
    try { await deleteLevelEntry(id); load(); }
    catch { alert('Échec de la suppression.'); }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    setSaving(true);
    try { await createCategoryEntry(newCategory.trim(), newCategoryIsLogiciel, categories.length + 1); setNewCategory(''); setNewCategoryIsLogiciel(false); load(); }
    catch (err) { alert(err.response?.data?.message || 'Échec de la création.'); }
    finally { setSaving(false); }
  };
  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Supprimer cette catégorie ? Les ressources déjà déposées sous ce nom ne sont pas affectées.')) return;
    try { await deleteCategoryEntry(id); load(); }
    catch { alert('Échec de la suppression.'); }
  };

  if (loading) return <div style={{ textAlign:'center', padding:'40px' }}><FontAwesomeIcon icon={faSpinner} style={{ color:T.textMuted }} /></div>;

  return (
    <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap:'20px' }}>
      {/* Facultés + filières imbriquées */}
      <div style={{ ...card({ padding:'20px' }) }}>
        <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'14px' }}>Facultés & filières</div>
        {faculties.length === 0 && <p style={{ color:T.textMuted, fontSize:'13px' }}>Aucune faculté.</p>}
        {faculties.map(f => (
          <div key={f.id} style={{ marginBottom:'8px' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 12px', borderRadius:'6px', background:T.surfaceAlt, cursor:'pointer' }} onClick={() => toggleFaculty(f.id)}>
              <span style={{ fontSize:'13px', fontWeight:'600', color:T.text }}>{f.nom}</span>
              <span onClick={e => { e.stopPropagation(); handleDeleteFaculty(f.id); }} style={{ fontSize:'12px', color:T.danger, fontWeight:'600' }}>Retirer</span>
            </div>
            {expandedFaculty === f.id && (
              <div style={{ padding:'10px 12px 4px 20px' }}>
                {(filieresByFaculty[f.id] || []).map(fil => (
                  <div key={fil.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0' }}>
                    <span style={{ fontSize:'12.5px', color:T.text }}>{fil.nom}</span>
                    <span onClick={() => handleDeleteFiliere(f.id, fil.id)} style={{ fontSize:'11.5px', color:T.danger, fontWeight:'600', cursor:'pointer' }}>Retirer</span>
                  </div>
                ))}
                {(filieresByFaculty[f.id] || []).length === 0 && <p style={{ color:T.textMuted, fontSize:'12px', margin:'4px 0' }}>Aucune filière.</p>}
                {!isMobile && (
                  <div style={{ display:'flex', gap:'8px', marginTop:'8px' }}>
                    <input value={newFiliere} onChange={e => setNewFiliere(e.target.value)} placeholder="Nouvelle filière" style={{ ...inputStyle, fontSize:'12.5px', padding:'7px 10px' }} />
                    <button onClick={() => handleAddFiliere(f.id)} disabled={saving} style={{ ...buttonStyle, padding:'7px 14px', fontSize:'11.5px' }}>Ajouter</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        {!isMobile && (
          <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
            <input value={newFaculty} onChange={e => setNewFaculty(e.target.value)} placeholder="Nouvelle faculté" style={inputStyle} />
            <button onClick={handleAddFaculty} disabled={saving} style={buttonStyle}>Ajouter</button>
          </div>
        )}
      </div>

      {/* Niveaux */}
      <div style={{ ...card({ padding:'20px' }) }}>
        <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'14px' }}>Niveaux</div>
        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap', marginBottom: isMobile ? 0 : '16px' }}>
          {levels.map(l => (
            <span key={l.id} style={{ display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px', borderRadius:'12px', background:T.surfaceAlt, fontSize:'12px', fontWeight:'600', color:T.text }}>
              {l.nom} <FontAwesomeIcon icon={faTrash} onClick={() => handleDeleteLevel(l.id)} style={{ fontSize:'10px', color:T.danger, cursor:'pointer' }} />
            </span>
          ))}
        </div>
        {!isMobile && (
          <div style={{ display:'flex', gap:'8px' }}>
            <input value={newLevel} onChange={e => setNewLevel(e.target.value)} placeholder="Nouveau niveau (ex. M1)" style={inputStyle} />
            <button onClick={handleAddLevel} disabled={saving} style={buttonStyle}>Ajouter</button>
          </div>
        )}
      </div>

      {/* Catégories */}
      <div style={{ ...card({ padding:'20px' }) }}>
        <div style={{ fontSize:'13px', fontWeight:'600', color:T.textMuted, textTransform:'uppercase', letterSpacing:'.04em', marginBottom:'14px' }}>Catégories de ressources</div>
        <div style={{ display:'flex', flexDirection:'column', gap:'6px', marginBottom: isMobile ? 0 : '16px' }}>
          {categories.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', borderRadius:'6px', background:T.surfaceAlt }}>
              <span style={{ fontSize:'13px', color:T.text }}>{c.nom}{c.is_logiciel && <span style={{ color:T.accent, fontSize:'11px', fontWeight:'600', marginLeft:'8px' }}>badges de vérification</span>}</span>
              <span onClick={() => handleDeleteCategory(c.id)} style={{ fontSize:'12px', color:T.danger, fontWeight:'600', cursor:'pointer' }}>Retirer</span>
            </div>
          ))}
        </div>
        {!isMobile && (
          <>
            <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
              <input value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="Nouvelle catégorie" style={inputStyle} />
              <button onClick={handleAddCategory} disabled={saving} style={buttonStyle}>Ajouter</button>
            </div>
            <label style={{ display:'flex', alignItems:'center', gap:'8px', cursor:'pointer' }}>
              <input type="checkbox" checked={newCategoryIsLogiciel} onChange={e => setNewCategoryIsLogiciel(e.target.checked)} style={{ width:'14px', height:'14px', accentColor:T.accent, cursor:'pointer' }} />
              <span style={{ fontSize:'12px', color:T.textMuted }}>Catégorie logiciel (active les badges de vérification)</span>
            </label>
          </>
        )}
      </div>

      {/* Dossiers prioritaires : voir l'onglet dédié */}
      {!isMobile && (
        <p style={{ color:T.textMuted, fontSize:'12px', gridColumn:'1 / -1', margin:0 }}>Les dossiers prioritaires (facultés/niveaux mis en avant dans le catalogue) se gèrent dans l'onglet "Dossiers prioritaires".</p>
      )}
    </div>
  );
}
