import { signal, computed, html, route, router, navigate, api } from 'tina4js';
import './routes/index';

// Debug overlay in dev mode (Ctrl+Shift+D to toggle)
if (import.meta.env.DEV) import('tina4js/debug');

// Configure API (uncomment to connect to tina4-php/python backend)
// api.configure({ baseUrl: '/api', auth: true });

// Start router
router.start({ target: '#root', mode: 'hash' });
