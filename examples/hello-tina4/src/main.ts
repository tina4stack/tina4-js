// Debug overlay first — so it tracks every signal, including module-level
// store signals created during the imports below (Ctrl+Shift+D to toggle).
import 'tina4js/debug';
import { signal, computed, html, route, router, navigate, api } from 'tina4js';
import '@/routes/index';

// Configure API (uncomment to connect to tina4-php/python backend)
// api.configure({ baseUrl: '/api', auth: true });

// Start router
router.start({ target: '#root', mode: 'hash' });
