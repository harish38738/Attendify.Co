export const RESOURCE_FILE_TYPES = {
  pdf: { label: 'PDF', mimeTypes: ['application/pdf'], viewer: 'pdf' },
  jpg: { label: 'JPG', mimeTypes: ['image/jpeg'], viewer: 'image' },
  jpeg: { label: 'JPEG', mimeTypes: ['image/jpeg'], viewer: 'image' },
  png: { label: 'PNG', mimeTypes: ['image/png'], viewer: 'image' },
  webp: { label: 'WEBP', mimeTypes: ['image/webp'], viewer: 'image' },
  txt: { label: 'TXT', mimeTypes: ['text/plain'], viewer: 'text' },
};

export const RESOURCE_UNSUPPORTED_MESSAGE = 'This file type is not supported in Attendify V1. Please upload a PDF, image, or TXT file.';

export const SUPPORTED_RESOURCE_LABELS = Object.values(RESOURCE_FILE_TYPES).map((type) => type.label);

export const RESOURCE_ACCEPT = [
  ...Object.keys(RESOURCE_FILE_TYPES).map((extension) => `.${extension}`),
  ...new Set(Object.values(RESOURCE_FILE_TYPES).flatMap((type) => type.mimeTypes)),
].join(',');

export const getResourceExtension = (filename = '') => {
  const parts = filename.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop() : '';
};

export const isSupportedResourceFile = (file) => {
  if (!file) return false;
  const extension = getResourceExtension(file.name);
  const config = RESOURCE_FILE_TYPES[extension];
  return Boolean(config && config.mimeTypes.includes(file.type || ''));
};

export const getResourceViewerType = (resource) => {
  const fileType = (resource?.fileType || getResourceExtension(resource?.filename || '')).toLowerCase();
  const config = RESOURCE_FILE_TYPES[fileType];
  if (config && config.mimeTypes.includes(resource?.mimeType || '')) {
    return config.viewer;
  }
  return 'unsupported';
};
