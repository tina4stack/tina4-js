/**
 * Cloudflare Worker — tina4-js Admin Dashboard
 *
 * Serves a reactive admin panel powered by tina4-js (1.5KB gzip).
 * REST API backed by D1 (SQLite on the edge).
 *
 * Routes:
 *   GET  /                  → Admin dashboard HTML
 *   GET  /api/stats         → Dashboard KPIs
 *   GET  /api/users         → List users (with ?search= and ?role= filters)
 *   POST /api/users         → Create user
 *   PUT  /api/users/:id     → Update user
 *   DELETE /api/users/:id   → Delete user
 *   GET  /api/activity      → Recent activity log
 */

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>tina4-js Admin — Cloudflare Workers</title>
  <link rel="stylesheet" href="https://unpkg.com/tina4-css@2/dist/tina4.min.css">
  <style>
    :root {
      --bg: #0f1923; --surface: #1a2733; --border: #2a3a4a;
      --text: #e0e8f0; --muted: #8899aa; --accent: #4fc3f7;
      --success: #66bb6a; --danger: #ef5350; --warn: #ffa726;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

    /* Layout */
    .shell { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
    .sidebar { background: var(--surface); border-right: 1px solid var(--border); padding: 1.5rem 1rem; }
    .sidebar h2 { font-size: 1.1rem; color: var(--accent); margin-bottom: 1.5rem; }
    .sidebar a { display: block; padding: 0.6rem 0.8rem; color: var(--muted); text-decoration: none; border-radius: 6px; margin-bottom: 2px; font-size: 0.9rem; }
    .sidebar a:hover, .sidebar a.active { background: rgba(79,195,247,0.1); color: var(--accent); }
    .main { padding: 2rem; overflow-y: auto; }

    /* Stats */
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.2rem; }
    .stat-card .label { font-size: 0.8rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; }
    .stat-card .value { font-size: 2rem; font-weight: 700; margin-top: 0.3rem; }
    .stat-card .value.accent { color: var(--accent); }
    .stat-card .value.success { color: var(--success); }
    .stat-card .value.warn { color: var(--warn); }

    /* Table */
    .toolbar { display: flex; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap; }
    .toolbar input, .toolbar select { background: var(--surface); border: 1px solid var(--border); color: var(--text); padding: 0.5rem 0.8rem; border-radius: 6px; font-size: 0.9rem; }
    .toolbar input { flex: 1; min-width: 200px; }
    table { width: 100%; border-collapse: collapse; background: var(--surface); border-radius: 8px; overflow: hidden; }
    th { text-align: left; padding: 0.8rem 1rem; background: rgba(79,195,247,0.08); color: var(--accent); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 0.7rem 1rem; border-top: 1px solid var(--border); font-size: 0.9rem; }
    tr:hover td { background: rgba(79,195,247,0.04); }

    /* Badges & Buttons */
    .badge { display: inline-block; padding: 0.2rem 0.6rem; border-radius: 12px; font-size: 0.75rem; font-weight: 600; }
    .badge.admin { background: rgba(79,195,247,0.15); color: var(--accent); }
    .badge.editor { background: rgba(255,167,38,0.15); color: var(--warn); }
    .badge.user { background: rgba(102,187,106,0.15); color: var(--success); }
    .badge.active { background: rgba(102,187,106,0.15); color: var(--success); }
    .badge.inactive { background: rgba(239,83,80,0.15); color: var(--danger); }
    .btn { padding: 0.5rem 1rem; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; }
    .btn-accent { background: var(--accent); color: #000; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-sm { padding: 0.3rem 0.6rem; font-size: 0.8rem; }

    /* Activity */
    .activity-list { list-style: none; }
    .activity-list li { padding: 0.8rem 0; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; font-size: 0.9rem; }
    .activity-list .time { color: var(--muted); font-size: 0.8rem; }

    /* Modal */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 1.5rem; width: 400px; max-width: 90vw; }
    .modal h3 { margin-bottom: 1rem; }
    .modal label { display: block; font-size: 0.85rem; color: var(--muted); margin-bottom: 0.3rem; margin-top: 0.8rem; }
    .modal input, .modal select { width: 100%; background: var(--bg); border: 1px solid var(--border); color: var(--text); padding: 0.5rem; border-radius: 4px; }
    .modal .actions { display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.2rem; }

    /* Section titles */
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .subtitle { color: var(--muted); font-size: 0.9rem; margin-bottom: 1.5rem; }

    /* Responsive */
    @media (max-width: 768px) {
      .shell { grid-template-columns: 1fr; }
      .sidebar { display: none; }
    }
  </style>
</head>
<body>
  <div class="shell">
    <nav class="sidebar">
      <h2>tina4-js Admin</h2>
      <a href="#" class="active" data-page="dashboard">Dashboard</a>
      <a href="#" data-page="users">Users</a>
      <a href="#" data-page="activity">Activity</a>
      <div style="margin-top:auto; padding-top:2rem;">
        <span style="font-size:0.75rem; color:var(--muted);">Powered by tina4-js<br>Running on Cloudflare Workers</span>
      </div>
    </nav>
    <main class="main" id="app"></main>
  </div>

  <script src="https://unpkg.com/tina4js@1/dist/core.es.js" type="module"></script>
  <script type="module">
    // ── tina4-js reactivity (from CDN or bundle) ──
    // Using inline for zero-dependency demo
    let currentEffect = null;
    function signal(val) {
      const subs = new Set();
      return {
        get value() { if (currentEffect) subs.add(currentEffect); return val; },
        set value(v) { if (!Object.is(val, v)) { val = v; for (const s of [...subs]) s(); } },
      };
    }
    function computed(fn) {
      const s = signal(undefined);
      effect(() => { s.value = fn(); });
      return { get value() { return s.value; } };
    }
    function effect(fn) {
      const run = () => { const prev = currentEffect; currentEffect = run; try { fn(); } finally { currentEffect = prev; } };
      run();
      return () => {};
    }

    // ── State ──
    const page = signal('dashboard');
    const stats = signal({ total: 0, active: 0, admins: 0, recentActions: 0 });
    const users = signal([]);
    const activity = signal([]);
    const search = signal('');
    const roleFilter = signal('');
    const showModal = signal(false);
    const editingUser = signal(null);
    const loading = signal(false);

    // ── API helpers ──
    const BASE = '/api';

    async function fetchStats() {
      const res = await fetch(BASE + '/stats');
      stats.value = await res.json();
    }

    async function fetchUsers() {
      loading.value = true;
      const params = new URLSearchParams();
      if (search.value) params.set('search', search.value);
      if (roleFilter.value) params.set('role', roleFilter.value);
      const qs = params.toString();
      const res = await fetch(BASE + '/users' + (qs ? '?' + qs : ''));
      users.value = await res.json();
      loading.value = false;
    }

    async function fetchActivity() {
      const res = await fetch(BASE + '/activity');
      activity.value = await res.json();
    }

    async function saveUser(data) {
      if (data.id) {
        await fetch(BASE + '/users/' + data.id, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      } else {
        await fetch(BASE + '/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      }
      showModal.value = false;
      editingUser.value = null;
      fetchUsers();
      fetchStats();
    }

    async function deleteUser(id) {
      if (!confirm('Delete this user?')) return;
      await fetch(BASE + '/users/' + id, { method: 'DELETE' });
      fetchUsers();
      fetchStats();
    }

    // ── Render functions ──
    const app = document.getElementById('app');

    function renderDashboard() {
      const s = stats.value;
      return \`
        <h1>Dashboard</h1>
        <p class="subtitle">Real-time stats from D1 on the edge</p>
        <div class="stats">
          <div class="stat-card"><div class="label">Total Users</div><div class="value accent">\${s.total}</div></div>
          <div class="stat-card"><div class="label">Active</div><div class="value success">\${s.active}</div></div>
          <div class="stat-card"><div class="label">Admins</div><div class="value warn">\${s.admins}</div></div>
          <div class="stat-card"><div class="label">Recent Actions</div><div class="value accent">\${s.recentActions}</div></div>
        </div>
        <h2 style="font-size:1.1rem; margin-bottom:1rem;">Recent Activity</h2>
        <ul class="activity-list">
          \${activity.value.slice(0, 5).map(a => \`
            <li><span>\${a.user_name || 'System'} — \${a.action}: \${a.detail || ''}</span><span class="time">\${a.created_at}</span></li>
          \`).join('')}
        </ul>
      \`;
    }

    function renderUsers() {
      return \`
        <h1>Users</h1>
        <p class="subtitle">Manage users stored in Cloudflare D1</p>
        <div class="toolbar">
          <input type="text" id="search-input" placeholder="Search by name or email..." value="\${search.value}">
          <select id="role-filter">
            <option value="">All roles</option>
            <option value="admin" \${roleFilter.value === 'admin' ? 'selected' : ''}>Admin</option>
            <option value="editor" \${roleFilter.value === 'editor' ? 'selected' : ''}>Editor</option>
            <option value="user" \${roleFilter.value === 'user' ? 'selected' : ''}>User</option>
          </select>
          <button class="btn btn-accent" id="add-user-btn">+ Add User</button>
        </div>
        <table>
          <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            \${users.value.map(u => \`
              <tr>
                <td>\${u.name}</td>
                <td>\${u.email}</td>
                <td><span class="badge \${u.role}">\${u.role}</span></td>
                <td><span class="badge \${u.active ? 'active' : 'inactive'}">\${u.active ? 'Active' : 'Inactive'}</span></td>
                <td>
                  <button class="btn btn-sm btn-accent edit-btn" data-id="\${u.id}">Edit</button>
                  <button class="btn btn-sm btn-danger del-btn" data-id="\${u.id}">Delete</button>
                </td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;
    }

    function renderActivity() {
      return \`
        <h1>Activity Log</h1>
        <p class="subtitle">All actions from D1</p>
        <table>
          <thead><tr><th>User</th><th>Action</th><th>Detail</th><th>Time</th></tr></thead>
          <tbody>
            \${activity.value.map(a => \`
              <tr>
                <td>\${a.user_name || 'System'}</td>
                <td><span class="badge \${a.action === 'delete' ? 'inactive' : 'active'}">\${a.action}</span></td>
                <td>\${a.detail || '—'}</td>
                <td style="color:var(--muted)">\${a.created_at}</td>
              </tr>
            \`).join('')}
          </tbody>
        </table>
      \`;
    }

    function renderModal() {
      if (!showModal.value) return '';
      const u = editingUser.value || {};
      return \`
        <div class="modal-overlay" id="modal-overlay">
          <div class="modal">
            <h3>\${u.id ? 'Edit' : 'Add'} User</h3>
            <label>Name</label>
            <input id="m-name" value="\${u.name || ''}">
            <label>Email</label>
            <input id="m-email" value="\${u.email || ''}">
            <label>Role</label>
            <select id="m-role">
              <option value="user" \${u.role === 'user' ? 'selected' : ''}>User</option>
              <option value="editor" \${u.role === 'editor' ? 'selected' : ''}>Editor</option>
              <option value="admin" \${u.role === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
            <div class="actions">
              <button class="btn" id="modal-cancel" style="background:var(--border);color:var(--text)">Cancel</button>
              <button class="btn btn-accent" id="modal-save">Save</button>
            </div>
          </div>
        </div>
      \`;
    }

    // ── Reactive render loop ──
    effect(() => {
      const p = page.value;
      let html = '';
      if (p === 'dashboard') html = renderDashboard();
      else if (p === 'users') html = renderUsers();
      else if (p === 'activity') html = renderActivity();
      app.innerHTML = html + renderModal();
      bindEvents();
    });

    function bindEvents() {
      // Search
      const searchEl = document.getElementById('search-input');
      if (searchEl) {
        searchEl.addEventListener('input', (e) => { search.value = e.target.value; fetchUsers(); });
      }

      // Role filter
      const roleEl = document.getElementById('role-filter');
      if (roleEl) {
        roleEl.addEventListener('change', (e) => { roleFilter.value = e.target.value; fetchUsers(); });
      }

      // Add user
      const addBtn = document.getElementById('add-user-btn');
      if (addBtn) {
        addBtn.addEventListener('click', () => { editingUser.value = null; showModal.value = true; });
      }

      // Edit buttons
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const u = users.value.find(u => u.id === Number(btn.dataset.id));
          editingUser.value = { ...u };
          showModal.value = true;
        });
      });

      // Delete buttons
      document.querySelectorAll('.del-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteUser(Number(btn.dataset.id)));
      });

      // Modal
      const overlay = document.getElementById('modal-overlay');
      if (overlay) {
        overlay.addEventListener('click', (e) => { if (e.target === overlay) showModal.value = false; });
      }
      const cancelBtn = document.getElementById('modal-cancel');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => showModal.value = false);
      }
      const saveBtn = document.getElementById('modal-save');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const data = {
            ...(editingUser.value?.id ? { id: editingUser.value.id } : {}),
            name: document.getElementById('m-name').value,
            email: document.getElementById('m-email').value,
            role: document.getElementById('m-role').value,
          };
          saveUser(data);
        });
      }

      // Sidebar nav
      document.querySelectorAll('.sidebar a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          page.value = link.dataset.page;
          document.querySelectorAll('.sidebar a').forEach(l => l.classList.remove('active'));
          link.classList.add('active');
        });
      });
    }

    // ── Init ──
    fetchStats();
    fetchUsers();
    fetchActivity();
  </script>
</body>
</html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // ── CORS headers ──
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: cors });
    }

    // ── API Routes ──

    // GET /api/stats
    if (path === '/api/stats' && method === 'GET') {
      const total = await env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
      const active = await env.DB.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1').first();
      const admins = await env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").first();
      const recent = await env.DB.prepare('SELECT COUNT(*) as count FROM activity_log WHERE created_at > datetime("now", "-24 hours")').first();

      return Response.json({
        total: total.count,
        active: active.count,
        admins: admins.count,
        recentActions: recent.count,
      }, { headers: cors });
    }

    // GET /api/users
    if (path === '/api/users' && method === 'GET') {
      let query = 'SELECT * FROM users WHERE 1=1';
      const params = [];

      const search = url.searchParams.get('search');
      if (search) {
        query += ' AND (name LIKE ? OR email LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
      }

      const role = url.searchParams.get('role');
      if (role) {
        query += ' AND role = ?';
        params.push(role);
      }

      query += ' ORDER BY created_at DESC';
      const { results } = await env.DB.prepare(query).bind(...params).all();
      return Response.json(results, { headers: cors });
    }

    // POST /api/users
    if (path === '/api/users' && method === 'POST') {
      const body = await request.json();
      const { name, email, role } = body;

      if (!name || !email) {
        return Response.json({ error: 'Name and email required' }, { status: 400, headers: cors });
      }

      await env.DB.prepare('INSERT INTO users (name, email, role) VALUES (?, ?, ?)')
        .bind(name, email, role || 'user').run();

      await env.DB.prepare('INSERT INTO activity_log (action, detail) VALUES (?, ?)')
        .bind('create', `Added user: ${name}`).run();

      return Response.json({ ok: true }, { status: 201, headers: cors });
    }

    // PUT /api/users/:id
    const putMatch = path.match(/^\/api\/users\/(\d+)$/);
    if (putMatch && method === 'PUT') {
      const id = putMatch[1];
      const body = await request.json();
      const { name, email, role } = body;

      await env.DB.prepare('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?')
        .bind(name, email, role, id).run();

      await env.DB.prepare('INSERT INTO activity_log (user_id, action, detail) VALUES (?, ?, ?)')
        .bind(id, 'update', `Updated user: ${name}`).run();

      return Response.json({ ok: true }, { headers: cors });
    }

    // DELETE /api/users/:id
    const delMatch = path.match(/^\/api\/users\/(\d+)$/);
    if (delMatch && method === 'DELETE') {
      const id = delMatch[1];
      const user = await env.DB.prepare('SELECT name FROM users WHERE id = ?').bind(id).first();

      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();

      await env.DB.prepare('INSERT INTO activity_log (action, detail) VALUES (?, ?)')
        .bind('delete', `Deleted user: ${user?.name || 'unknown'}`).run();

      return Response.json({ ok: true }, { headers: cors });
    }

    // GET /api/activity
    if (path === '/api/activity' && method === 'GET') {
      const { results } = await env.DB.prepare(`
        SELECT a.*, u.name as user_name
        FROM activity_log a
        LEFT JOIN users u ON a.user_id = u.id
        ORDER BY a.created_at DESC
        LIMIT 50
      `).all();
      return Response.json(results, { headers: cors });
    }

    // ── Serve dashboard ──
    return new Response(DASHBOARD_HTML, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', ...cors },
    });
  },
};
