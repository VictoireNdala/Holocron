import axios from 'axios';

const API = axios.create({
  baseURL: 'http://192.168.1.4:5000/api',
  withCredentials: true
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ─────────────────────────────────────────────────────────────────
export const verifyMatricule = (matricule) => API.get(`/auth/verify-matricule/${matricule}`);
export const register = (data) => API.post('/auth/register', data);
export const login    = (data) => API.post('/auth/login', data);
export const logout   = ()     => API.post('/auth/logout');
export const changePassword = (currentPassword, newPassword) =>
  API.post('/auth/change-password', { currentPassword, newPassword });

// ── Users ────────────────────────────────────────────────────────────────
export const getProfile = () => API.get('/users/profile');
export const getStats   = () => API.get('/users/stats');

// ── Fichiers (Explorer) ──────────────────────────────────────────────────
export const listFiles = (path = '/') => API.get(`/files/list?path=${encodeURIComponent(path)}`);

export const uploadFile = (path, file, onProgress, signal) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  return API.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
    signal
  });
};

export const downloadFile = (path) => API.get(`/files/download?path=${encodeURIComponent(path)}`, { responseType: 'blob' });
export const getFilePreview = (fileId, size = 160) => API.get(`/files/preview?fileId=${fileId}&size=${size}`, { responseType: 'blob' });
export const createFolder = (path) => API.post('/files/mkdir', { path });
export const deleteFile   = (path) => API.delete('/files/delete', { data: { path } });
export const moveFile     = (path, newPath) => API.post('/files/move', { path, newPath });

// ── Corbeille (trashbin natif Nextcloud) ────────────────────────────────────
export const getTrash        = () => API.get('/files/trash');
export const restoreTrash    = (trashPath) => API.post('/files/trash/restore', { trashPath });
export const purgeTrashItem  = (trashPath) => API.delete('/files/trash/item', { data: { trashPath } });
export const emptyTrash      = () => API.delete('/files/trash/empty');

// Données réelles Dashboard
export const getQuota         = () => API.get('/files/quota');
export const getSharedFolders = () => API.get('/files/shared');

// ── Notifications (D3) ────────────────────────────────────────────────────
export const listNotifications         = () => API.get('/notifications');
export const markNotificationRead      = (id) => API.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead  = () => API.patch('/notifications/read-all');

// ── Submissions ──────────────────────────────────────────────────────────
export const listAssignments  = ()     => API.get('/submissions/assignments');
export const createAssignment = (data) => API.post('/submissions/assignments', data);

export const submitAssignment = (assignmentId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('assignment_id', assignmentId);
  return API.post('/submissions/submit', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

export const getMySubmissions       = () => API.get('/submissions/my');
export const getReceivedSubmissions = () => API.get('/submissions/received');
export const downloadSubmission     = (id) => API.get(`/submissions/download/${id}`, { responseType: 'blob' });

// ── Espace communautaire ─────────────────────────────────────────────────
export const listFaculties = () => API.get('/faculties');
export const listLevels    = () => API.get('/levels');
export const listPublicPriorityFolders = () => API.get('/community/priority-folders');
export const listCategories = () => API.get('/community/categories');

export const listCommunityResources = (params = {}) => {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
  return API.get(`/community/resources${q.toString() ? `?${q}` : ''}`);
};
export const getCommunityResource = (id) => API.get(`/community/resources/${id}`);

export const createCommunityResource = (data) => {
  const formData = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v != null && v !== '') formData.append(k, v); });
  return API.post('/community/resources', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const downloadCommunityResource = (id) => API.get(`/community/resources/${id}/download`, { responseType: 'blob' });
export const reportCommunityResource   = (id, raison) => API.post(`/community/resources/${id}/report`, { raison });
export const getCommunityResourceCover = (id) => API.get(`/community/resources/${id}/cover`, { responseType: 'blob' });
export const setResourceVerification   = (id, status) => API.patch(`/community/resources/${id}/verification`, { status });
export const deleteCommunityResource   = (id) => API.delete(`/community/resources/${id}`);

// ── Panel Admin avancé ────────────────────────────────────────────────────
export const listAdmins       = () => API.get('/admin/admins');
export const searchUsers      = (q) => API.get(`/admin/users/search?q=${encodeURIComponent(q)}`);
export const grantAdmin       = (userId, adminLevel, permissions) => API.post(`/admin/admins/${userId}/grant`, { admin_level: adminLevel, permissions });
export const revokeAdmin      = (userId) => API.delete(`/admin/admins/${userId}`);

export const listPriorityFolders  = () => API.get('/admin/priority-folders');
export const createPriorityFolder = (data) => API.post('/admin/priority-folders', data);
export const deletePriorityFolder = (id) => API.delete(`/admin/priority-folders/${id}`);
export const listFacultyFilieres  = (facultyId) => API.get(`/admin/faculty-filieres${facultyId ? `?faculty_id=${facultyId}` : ''}`);

export const listActivityLogs = (params = {}) => {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v)));
  return API.get(`/admin/logs${q.toString() ? `?${q}` : ''}`);
};

export const listAdminUsers    = (q = '') => API.get(`/admin/users?q=${encodeURIComponent(q)}`);
export const toggleUserActive  = (userId) => API.patch(`/admin/users/${userId}/toggle-active`);
export const resetUserPassword = (userId) => API.post(`/admin/users/${userId}/reset-password`);

export const listMatricules  = (q = '') => API.get(`/admin/matricules?q=${encodeURIComponent(q)}`);
export const addMatricule    = (data)   => API.post('/admin/matricules', data);
export const deleteMatricule = (matricule) => API.delete(`/admin/matricules/${matricule}`);

// ── Taxonomie Espace communautaire (Axe F6) ──────────────────────────────
export const createFaculty = (nom) => API.post('/admin/faculties', { nom });
export const deleteFaculty = (id)  => API.delete(`/admin/faculties/${id}`);
export const createFiliereEntry = (facultyId, nom) => API.post('/admin/faculty-filieres', { faculty_id: facultyId, nom });
export const deleteFiliereEntry = (id) => API.delete(`/admin/faculty-filieres/${id}`);
export const createLevelEntry = (nom, ordre) => API.post('/admin/levels', { nom, ordre });
export const deleteLevelEntry = (id) => API.delete(`/admin/levels/${id}`);
export const createCategoryEntry = (nom, isLogiciel, ordre) => API.post('/admin/categories', { nom, is_logiciel: isLogiciel, ordre });
export const deleteCategoryEntry = (id) => API.delete(`/admin/categories/${id}`);
