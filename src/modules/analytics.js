import { inject } from '@vercel/analytics';

const isLocal =
  typeof location !== 'undefined' &&
  (location.hostname === 'localhost' || location.hostname === '127.0.0.1');

inject({ mode: isLocal ? 'development' : 'production' });
