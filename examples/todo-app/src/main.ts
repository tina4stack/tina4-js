import { route, router, html } from 'tina4js';
import 'tina4js/debug';
import './components/todo-input';
import './components/todo-item';
import './routes/index';

// Start the router
router.start({ target: '#root', mode: 'hash' });
