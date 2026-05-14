// Debug overlay first — so it tracks every signal, including module-level
// store signals created during the imports below (Ctrl+Shift+D to toggle).
import 'tina4js/debug';
import { route, router, html } from 'tina4js';
import '@/components/todo-input';
import '@/components/todo-item';
import '@/routes/index';

// Start the router
router.start({ target: '#root', mode: 'hash' });
