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

// ── Users ────────────────────────────────────────────────────────────────
export const getProfile = () => API.get('/users/profile');
export const getStats   = () => API.get('/users/stats');

// ── Fichiers (Explorer) ──────────────────────────────────────────────────
export const listFiles = (path = '/') => API.get(`/files/list?path=${encodeURIComponent(path)}`);

export const uploadFile = (path, file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('path', path);
  return API.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress
  });
};

export const downloadFile = (path) => API.get(`/files/download?path=${encodeURIComponent(path)}`, { responseType: 'blob' });
export const createFolder = (path) => API.post('/files/mkdir', { path });
export const deleteFile   = (path) => API.delete('/files/delete', { data: { path } });

// Données réelles Dashboard
export const getQuota         = () => API.get('/files/quota');
export const getSharedFolders = () => API.get('/files/shared');

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
