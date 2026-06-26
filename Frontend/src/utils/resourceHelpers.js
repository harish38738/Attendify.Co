import api from './api';

export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

export const downloadResource = async (resourceId, filename) => {
  const res = await api.get(`/api/resources/${resourceId}/download`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename || 'resource');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const previewResource = async (resourceId) => {
  const res = await api.get(`/api/resources/${resourceId}/preview`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] }));
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
};
