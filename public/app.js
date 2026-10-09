'use strict';

const main = document.querySelector('#main');
const toastRegion = document.querySelector('#toastRegion');
const sidebar = document.querySelector('#sidebar');
const mobileMenu = document.querySelector('#mobileMenu');
const sidebarScrim = document.querySelector('#sidebarScrim');

const paths = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  boxes: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4.3 7.6 7.7 4.5 7.7-4.5M12 21v-9"/>',
  plus: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h8"/>',
  settings: '<path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.5-1.7-.6a8 8 0 0 1-1.7 1l-.3 1.8h-2.9l-.3-1.8a8 8 0 0 1-1.7-1l-1.7.6-1.4-2.5 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.5 1.7.6a8 8 0 0 1 1.7-1l.3-1.8h2.9l.3 1.8a8 8 0 0 1 1.7 1l1.7-.6 1.4 2.5-1.4 1.1a7 7 0 0 1 0 2z"/>',
  monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
  terminal: '<path d="m4 6 6 6-6 6M13 18h7"/>',
  database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.4 4.4"/>',
  play: '<path d="m7 4 13 8-13 8z"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
  refresh: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5.5 9A7 7 0 0 1 18 6l2 2M4 16l2 2a7 7 0 0 0 12.5-3"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  external: '<path d="M14 3h7v7M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/>',
  filter: '<path d="M4 6h16M7 12h10m-7 6h4"/><circle cx="9" cy="6" r="2"/><circle cx="14" cy="12" r="2"/><circle cx="11" cy="18" r="2"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  alert: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0z"/><path d="M12 9v4m0 4h.01"/>',
  arrow: '<path d="M5 12h14m-7-7 7 7-7 7"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  cpu: '<rect x="5" y="5" width="14" height="14" rx="2"/><path d="M9 9h6v6H9zM9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4"/>',
  memory: '<rect x="3" y="7" width="18" height="10" rx="2"/><path d="M7 7V4m5 3V4m5 3V4M7 17v3m5-3v3m5-3v3M7 10h2v4H7zm4 0h2v4h-2zm4 0h2v4h-2z"/>',
  checkCircle: '<circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15.8 15.8 0 0 1-3 3.8M6.2 6.2C3.5 8.1 2 12 2 12s3.6 7 10 7a10.8 10.8 0 0 0 3.1-.5"/>',
  trash: '<path d="M3 6h18m-2 0-.9 14H5.9L5 6m4 0V4h6v2m-5 4v6m4-6v6"/>',
};
const icon = (name, cls = '') => `<svg${cls ? ` class="${cls}"` : ''} viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.info}</svg>`;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const state = { projects: [], overview: null, capabilities: null, deployments: [], page: 'dashboard', query: '', projectFilter: 'all', source: 'git', selectedLogProject: '', currentProject: null, backups: [], busy: false };

function addPasswordVisibilityControls(root = main) {
  root.querySelectorAll('input[type="password"]').forEach((input) => {
    if (input.parentElement?.classList.contains('password-control')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'password-control';
    input.before(wrapper);
    wrapper.append(input);
    const toggle = document.createElement('button');
    toggle.className = 'password-visibility';
    toggle.type = 'button';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.setAttribute('aria-controls', input.id);
    toggle.setAttribute('aria-pressed', 'false');
    toggle.title = 'Show password';
    toggle.innerHTML = icon('eye');
    toggle.addEventListener('click', () => {
      const showPassword = input.type === 'password';
      input.type = showPassword ? 'text' : 'password';
      toggle.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');
      toggle.setAttribute('aria-pressed', String(showPassword));
      toggle.title = showPassword ? 'Hide password' : 'Show password';
      toggle.innerHTML = icon(showPassword ? 'eyeOff' : 'eye');
    });
    wrapper.append(toggle);
  });
}

async function api(route, options = {}) {
  const response = await fetch(route, { credentials: 'same-origin', ...options, headers: { ...(options.body && !(options.body instanceof ArrayBuffer) && !(options.body instanceof Blob) ? { 'content-type': 'application/json' } : {}), ...(options.headers || {}) } });
  let result;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) result = await response.json(); else result = await response.text();
  if (!response.ok) throw new Error(result?.error || result || `Request failed (${response.status}).`);
  return result;
}

function renderAuthGate(configured) {
  document.body.classList.add('auth-locked');
  const title = configured ? 'Sign in to your control room' : 'Set your admin password';
  const subtitle = configured
    ? 'Project operations and deployment data are available only after administrator sign-in.'
    : 'Create a password for this local admin panel. Initial setup is accepted only from this device.';
  const action = configured ? 'Sign in' : 'Save password and continue';
  main.innerHTML = `<section class="auth-card"><div class="auth-brand"><svg class="brand-mark" viewBox="0 0 48 48" aria-hidden="true"><path d="M40 13c-5-7-17-8-25-3C6 16 4 27 9 34c4 6 13 8 20 4 7-4 10-12 7-18-2-4-7-6-11-4-4 1-6 5-5 8 1 2 4 3 6 2 2-1 3-3 2-4"/><path d="M7 37c8-4 12-9 14-15M30 9c3-3 7-4 11-3-1 4-3 7-7 9"/></svg><span class="brand-copy"><strong>Anshuman<span>Host</span></strong><small>PRIVATE CONTROL PLANE</small></span></div><p class="eyebrow">ADMIN ACCESS</p><h1>${title}</h1><p class="page-subtitle">${subtitle}</p><form id="authForm" data-mode="${configured ? 'login' : 'setup'}"><div class="form-field"><label for="adminPassword">${configured ? 'Admin password' : 'Create password'}</label><input class="input" id="adminPassword" name="password" type="password" minlength="14" maxlength="256" autocomplete="${configured ? 'current-password' : 'new-password'}" required autofocus></div>${configured ? '' : '<div class="form-field"><label for="confirmAdminPassword">Confirm password</label><input class="input" id="confirmAdminPassword" name="confirmPassword" type="password" minlength="14" maxlength="256" autocomplete="new-password" required><small>Use at least 14 characters.</small></div>'}<p class="auth-error" id="authError" role="alert"></p><button class="button button-primary" type="submit">${action}</button></form></section>`;
  addPasswordVisibilityControls();
  document.querySelector('#adminPassword')?.focus();
}

async function refresh() {
  const [projects, overview, capabilities] = await Promise.all([api('/api/projects'), api('/api/overview'), api('/api/capabilities')]);
  state.projects = projects;
  state.overview = overview;
  state.capabilities = capabilities;
  state.deployments = overview.deployments || [];
  const count = document.querySelector('#sidebarProjectCount');
  if (count) count.textContent = projects.length ? projects.length : '';
}

function statusPill(status) {
  const safeStatus = ['running', 'stopped', 'failed', 'deploying', 'unknown'].includes(status) ? status : 'unknown';
  const label = safeStatus === 'unknown' ? 'State unknown' : safeStatus[0].toUpperCase() + safeStatus.slice(1);
  return `<span class="status-pill ${safeStatus}" aria-label="Project status: ${label}"><i class="status-dot"></i>${label}</span>`;
}

function uptime(project) {
  if (project.status === 'running' && project.uptimeSeconds > 0) {
    const seconds = project.uptimeSeconds;
    const days = Math.floor(seconds / 86400); const hours = Math.floor((seconds % 86400) / 3600); const minutes = Math.floor((seconds % 3600) / 60);
    return `<span class="uptime-copy"><span>Uptime</span><strong>${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes}m</strong></span>`;
  }
  if (project.status === 'failed') return `<span class="uptime-copy"><span>Last error</span><strong class="failed-copy">${esc(project.lastError || 'Deployment failed')}</strong></span>`;
  if (project.status === 'unknown') return '<span class="uptime-copy"><span>After restart</span><strong>Review process state</strong></span>';
  if (project.stoppedAt) return `<span class="uptime-copy"><span>Stopped</span><strong>${esc(new Date(project.stoppedAt).toLocaleString())}</strong></span>`;
  return '<span class="uptime-copy"><span>Deployment</span><strong>Not deployed</strong></span>';
}

function filteredProjects() {
  const query = state.query.trim().toLowerCase();
  return state.projects.filter((project) => {
    const matches = !query || [project.name, project.slug, project.framework, project.hostname, project.runtime].join(' ').toLowerCase().includes(query);
    const filter = state.projectFilter === 'all' || project.status === state.projectFilter;
    return matches && filter;
  });
}

function projectRow(project) {
  const actions = project.status === 'running'
    ? `<button class="row-action" data-action="stop" data-slug="${esc(project.slug)}" aria-label="Stop ${esc(project.name)}" title="Stop">${icon('stop')}</button><button class="row-action" data-action="restart" data-slug="${esc(project.slug)}" aria-label="Restart ${esc(project.name)}" title="Restart">${icon('refresh')}</button>`
    : project.status === 'unknown'
      ? `<button class="row-action" data-action="confirm-stopped" data-slug="${esc(project.slug)}" aria-label="Confirm ${esc(project.name)} is stopped" title="Confirm stopped">${icon('check')}</button>`
      : `<button class="row-action" data-action="start" data-slug="${esc(project.slug)}" aria-label="Deploy ${esc(project.name)}" title="Deploy">${icon('play')}</button><button class="row-action" data-action="restart" data-slug="${esc(project.slug)}" aria-label="Redeploy ${esc(project.name)}" title="Redeploy">${icon('refresh')}</button>`;
  const hostname = project.hostname ? `<span class="hostname-link" title="Routes through the local proxy at 127.0.0.1:8780">${esc(project.hostname)} ${icon('external')}</span>` : '<span class="dim">No hostname</span>';
  return `<tr class="project-row" data-open-project="${esc(project.slug)}">
    <td><div class="project-name-cell"><span class="project-glyph">${icon('boxes')}</span><span class="project-name-copy"><strong>${esc(project.name)}</strong><span>${esc(project.framework || project.runtime)}</span></span></div></td>
    <td>${statusPill(project.status)}</td>
    <td>${hostname}</td>
    <td><div class="tag-list"><span class="tag">${esc(project.runtime)}</span><span class="tag">${esc(project.framework || 'Custom')}</span></div></td>
    <td>${uptime(project)}</td>
    <td><div class="row-actions">${actions}<button class="row-action" data-action="logs" data-slug="${esc(project.slug)}" aria-label="View ${esc(project.name)} logs" title="View logs">${icon('file')}</button></div></td>
  </tr>`;
}

function emptyProjects() {
  if (state.projects.length === 0) return `<div class="empty-state"><span class="empty-state-icon">${icon('boxes')}</span><strong>Your deployment space is clear</strong><p>Import a Git repository, upload a ZIP, or copy a project into <span class="inline-code">apps/</span> to get started. Project metrics will appear here after the backend records them.</p><button class="button button-primary" data-nav="deploy">${icon('plus')} Deploy your first project</button><button class="button button-quiet" data-action="sample">${icon('play')} Deploy sample app</button></div>`;
  return `<div class="empty-state"><span class="empty-state-icon">${icon('search')}</span><strong>No projects match that search</strong><p>Change the search text or filter to see other projects.</p><button class="button" data-action="clear-search">Clear search</button></div>`;
}

function summaryCard(value, label, glyph, meta = '') {
  return `<article class="summary-card"><span class="summary-icon">${icon(glyph)}</span><div class="summary-copy"><strong class="summary-value">${esc(value)}</strong><span class="summary-label">${esc(label)}</span></div>${meta ? `<span class="summary-meta">${esc(meta)}</span>` : ''}</article>`;
}

function renderDashboard() {
  const ov = state.overview || { projects: 0, running: 0, stopped: 0, failures: 0, system: { memoryUsedPercent: 0 } };
  const rows = filteredProjects();
  const deploymentLines = state.deployments.slice(0, 4).map((item) => `<div class="log-line">[${esc(new Date(item.createdAt).toLocaleTimeString())}] ${esc(item.projectSlug)} · ${esc(item.status)}${item.error ? ` · ${esc(item.error)}` : ''}</div>`).join('');
  const load = ov.system?.loadAverage?.[0] ?? 0; const cores = ov.system?.cores || 1; const loadPct = Math.min(100, Math.round(load / cores * 100)); const ramPct = Number(ov.system?.memoryUsedPercent || 0);
  main.innerHTML = `<div class="page-stack">
    <section class="hero" aria-label="AnshumanHost welcome banner"><div class="hero-copy"><span class="hero-kanji" aria-hidden="true">閃光<br>風影</span><div class="hero-quote"><p>“Speed is a choice. Build with intent, deploy with care.”</p><div class="hero-credit"><span>THE SHADOW HOKAGE EDITION</span><i></i><span>LOCAL CONTROL PLANE</span></div></div></div><span class="hero-aside" aria-hidden="true">創造 · 運用</span></section>
    <section class="summary-grid" aria-label="Live project summary">
      ${summaryCard(ov.projects, 'Total projects', 'boxes')}${summaryCard(ov.running, 'Running', 'play')}${summaryCard(ov.stopped, 'Stopped', 'stop')}${summaryCard(ov.failures, 'Failed', 'alert')}
      <article class="summary-card usage-card"><span class="summary-icon">${icon('memory')}</span><div class="summary-copy" style="flex:1"><strong class="summary-value">${ramPct}%</strong><span class="summary-label">Host memory used</span><span class="mini-meter"><span style="width:${ramPct}%"></span></span></div></article>
    </section>
    ${ov.unknown ? `<div class="notice">${icon('info')} ${ov.unknown} project process state${ov.unknown === 1 ? ' is' : 's are'} unknown after a dashboard restart. Review the host process list before redeploying.</div>` : ''}
    <section class="panel projects-panel" aria-labelledby="projectsTitle"><div class="panel-header"><div class="panel-title-wrap"><span class="panel-title-icon">${icon('boxes')}</span><div><h2 id="projectsTitle">Your Projects</h2><p class="panel-caption">Manage deployment state, hostnames and runtime settings.</p></div></div><div class="panel-tools"><label class="search-field">${icon('search')}<span class="sr-only">Search projects</span><input id="projectSearch" type="search" placeholder="Search projects…" value="${esc(state.query)}"></label><select id="projectFilter" class="select-small" aria-label="Filter projects by status"><option value="all" ${state.projectFilter === 'all' ? 'selected' : ''}>All status</option><option value="running" ${state.projectFilter === 'running' ? 'selected' : ''}>Running</option><option value="stopped" ${state.projectFilter === 'stopped' ? 'selected' : ''}>Stopped</option><option value="failed" ${state.projectFilter === 'failed' ? 'selected' : ''}>Failed</option><option value="unknown" ${state.projectFilter === 'unknown' ? 'selected' : ''}>Unknown</option></select><button class="button button-primary" data-nav="deploy">${icon('plus')} Deploy New Project</button></div></div>
      ${rows.length ? `<div class="project-table-wrap"><table class="project-table"><thead><tr><th>Project</th><th>Status</th><th>Hostname</th><th>Runtime</th><th>Activity</th><th><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.map(projectRow).join('')}</tbody></table></div>` : emptyProjects()}
    </section>
    <section class="lower-grid">
      <article class="panel lower-panel"><div class="lower-heading"><span class="lower-heading-icon">${icon('terminal')}</span><h2>Recent Deployments</h2><a class="panel-link" href="#logs">View all ${icon('arrow')}</a></div><div class="log-terminal">${deploymentLines || '<div class="log-line dim">No deployment events have been recorded.</div><div class="log-line dim">Deploy a project to see actual build and health-check activity.</div>'}</div></article>
      <article class="panel lower-panel"><div class="lower-heading"><span class="lower-heading-icon">${icon('cpu')}</span><h2>System Status</h2><a class="panel-link" href="#system">View details ${icon('arrow')}</a></div><div class="metric-row"><div class="metric-item"><div class="metric-label">Host load / cores</div><div class="metric-value">${icon('cpu')}<span>${load.toFixed(2)} / ${cores}</span></div><div class="meter" aria-label="Normalized host load ${loadPct}%"><span style="width:${loadPct}%"></span></div></div><div class="metric-item"><div class="metric-label">Memory in use</div><div class="metric-value">${icon('memory')}<span>${ramPct}%</span></div><div class="meter" aria-label="Memory used ${ramPct}%"><span style="width:${ramPct}%"></span></div></div><div class="metric-item"><div class="metric-label">Host uptime</div><div class="metric-value">${icon('clock')}<span>${formatDuration(ov.system?.uptimeSeconds || 0)}</span></div><div class="metric-note">Operating system</div></div></div></article>
      <article class="panel lower-panel quick-panel"><div class="lower-heading"><span class="lower-heading-icon">${icon('bolt')}</span><h2>Quick Actions</h2></div><div class="quick-grid"><button class="quick-action" data-nav="deploy">${icon('plus')} New project</button><button class="quick-action" data-nav="logs">${icon('file')} View logs</button><button class="quick-action" data-nav="domains">${icon('globe')} Manage domains</button><button class="quick-action" data-nav="backups">${icon('database')} Create backup</button><button class="quick-action" data-nav="system">${icon('monitor')} Host capabilities</button><button class="quick-action" data-action="sample">${icon('play')} Deploy sample</button></div></article>
    </section>
    <p class="footer-note">Dashboard and reverse proxy are bound to loopback. Public domain routing requires a separately configured tunnel or reverse proxy.</p>
  </div>`;
}

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0); const days = Math.floor(value / 86400); const hours = Math.floor(value % 86400 / 3600); const minutes = Math.floor(value % 3600 / 60);
  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes}m`;
}

function pageHeading(eyebrow, title, subtitle, action = '') {
  return `<header class="page-heading"><div><p class="eyebrow">${esc(eyebrow)}</p><h1>${esc(title)}</h1><p class="page-subtitle">${esc(subtitle)}</p></div>${action}</header>`;
}

function renderProjects() {
  const rows = filteredProjects();
  const table = rows.length ? `<div class="table-responsive"><table class="table-list"><thead><tr><th>Project</th><th>Runtime</th><th>Status</th><th>Hostname</th><th>Local port</th><th>Actions</th></tr></thead><tbody>${rows.map((p) => `<tr><td><button class="text-button" data-open-project="${esc(p.slug)}">${esc(p.name)}</button><div class="dim">${esc(p.slug)}</div></td><td>${esc(p.framework || p.runtime)} <span class="tag">${esc(p.runtime)}</span></td><td>${statusPill(p.status)}</td><td>${esc(p.hostname || '—')}</td><td>${p.port || '—'}</td><td><button class="button button-small" data-action="${p.status === 'running' ? 'stop' : p.status === 'unknown' ? 'confirm-stopped' : 'start'}" data-slug="${esc(p.slug)}">${p.status === 'running' ? icon('stop') : p.status === 'unknown' ? icon('check') : icon('play')}${p.status === 'running' ? 'Stop' : p.status === 'unknown' ? 'Confirm stopped' : 'Deploy'}</button> <button class="button button-small" data-action="logs" data-slug="${esc(p.slug)}">Logs</button></td></tr>`).join('')}</tbody></table></div>` : emptyProjects();
  main.innerHTML = `<div class="page-stack">${pageHeading('WORKSPACE', 'Projects', 'Search, inspect and operate projects backed by the local deployment manager.', `<button class="button button-primary" data-nav="deploy">${icon('plus')} Deploy New Project</button>`)}<section class="panel content-panel"><div class="panel-tools" style="margin:0 0 12px"><label class="search-field">${icon('search')}<span class="sr-only">Search projects</span><input id="projectSearch" type="search" placeholder="Search by name, runtime, or hostname…" value="${esc(state.query)}"></label><select id="projectFilter" class="select-small" aria-label="Filter projects"><option value="all" ${state.projectFilter === 'all' ? 'selected' : ''}>All status</option><option value="running" ${state.projectFilter === 'running' ? 'selected' : ''}>Running</option><option value="stopped" ${state.projectFilter === 'stopped' ? 'selected' : ''}>Stopped</option><option value="failed" ${state.projectFilter === 'failed' ? 'selected' : ''}>Failed</option><option value="unknown" ${state.projectFilter === 'unknown' ? 'selected' : ''}>Unknown</option></select></div>${table}</section></div>`;
}

function runtimeOptions(value = 'node') {
  return ['node', 'static', 'python', 'docker', 'compose'].map((runtime) => `<option value="${runtime}" ${value === runtime ? 'selected' : ''}>${runtime === 'node' ? 'Node.js' : runtime === 'static' ? 'Static website' : runtime === 'python' ? 'Python' : runtime === 'docker' ? 'Dockerfile (adapter unavailable)' : 'Docker Compose (adapter unavailable)'}</option>`).join('');
}

function renderDeploy() {
  const sourceFields = state.source === 'git'
    ? `<div class="form-field full"><label for="gitUrl">HTTPS repository URL</label><input class="input" id="gitUrl" name="gitUrl" type="url" placeholder="https://github.com/you/project.git"><small>Public HTTPS Git repositories are cloned with a shallow checkout. Private credentials are not accepted in the URL.</small></div>`
    : state.source === 'local'
      ? `<div class="form-field full"><label for="localDirectory">Existing folder under apps/</label><input class="input" id="localDirectory" name="localDirectory" value="" placeholder="my-existing-project"><small>From Termux, copy it into this project with <span class="inline-code">cp -R /path/to/project apps/&lt;folder&gt;</span>. The platform only reads a validated folder name inside apps/.</small></div>`
      : state.source === 'zip'
        ? `<div class="form-field full"><label for="zipFile">Project ZIP archive</label><input class="input" id="zipFile" name="zipFile" type="file" accept=".zip,application/zip"><small>Upload limit: 100 MiB compressed and 200 MiB expanded. Symlinks and unsafe paths are rejected.</small></div>`
        : '<div class="form-field full"><p class="muted">Create a project record now and import source later from its configuration.</p></div>';
  main.innerHTML = `<div class="page-stack">${pageHeading('NEW DEPLOYMENT', 'Deploy a project', 'Import source, review the detected runtime, then deploy when you are ready.')}
    <form id="deployForm" class="panel content-panel"><h2>Project details</h2><p class="page-subtitle">Project names and URLs are persisted locally. Deployment runs as a separate process under your current OS account.</p><div class="form-grid" style="margin-top:16px">
      <div class="form-field"><label for="projectName">Project name</label><input class="input" id="projectName" name="name" required maxlength="80" placeholder="E-Chat"></div>
      <div class="form-field"><label for="projectSlug">Unique slug</label><input class="input" id="projectSlug" name="slug" required pattern="[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?" placeholder="e-chat"><small>Lowercase letters, numbers and interior hyphens.</small></div>
      <div class="form-field full"><label for="projectDescription">Public project description</label><textarea class="textarea" id="projectDescription" name="description" maxlength="1200" placeholder="What does this project do? Who is it for?"></textarea><small>This appears on the public project directory when the project is live and listed.</small></div>
      <div class="form-field full"><label for="projectYoutube">YouTube overview link <span class="dim">(optional)</span></label><input class="input" id="projectYoutube" name="youtubeUrl" type="url" placeholder="https://youtu.be/…"><small>Only YouTube video links are accepted. Visitors open the video on YouTube.</small></div>
      <div class="form-field full"><label class="checkbox-row" for="projectPublic"><input id="projectPublic" name="isPublic" type="checkbox" checked><span>List this project on the public AnshumanHost site after it is running</span></label></div>
      <div class="form-field"><label for="projectHostname">Hostname</label><input class="input" id="projectHostname" name="hostname" placeholder="e-chat.${esc(state.capabilities?.baseDomain || 'anshman.online')}"><small>Defaults to a hostname under ${esc(state.capabilities?.baseDomain || 'anshman.online')}. This local proxy does not configure public DNS.</small></div>
      <div class="form-field"><label for="runtime">Runtime</label><select class="select" id="runtime" name="runtime"><option value="" selected>Auto-detect from source</option>${runtimeOptions('')}</select><small>Review the detected runtime after import. Node.js, Python (when installed), and static sites have native adapters.</small></div>
      <div class="form-field"><label for="framework">Framework / label</label><input class="input" id="framework" name="framework" placeholder="Auto-detect after source import"></div>
      <div class="form-field"><label for="healthPath">Health check path</label><input class="input" id="healthPath" name="healthPath" value="/" placeholder="/"></div>
      <div class="form-field full"><label for="buildCommand">Build command <span class="dim">(optional)</span></label><input class="input" id="buildCommand" name="buildCommand" placeholder="npm run build"><small>Runs as an executable plus arguments with shell operators disabled.</small></div>
      <div class="form-field full"><label for="startCommand">Start command <span class="dim">(optional)</span></label><input class="input" id="startCommand" name="startCommand" placeholder="npm start"><small>For Node.js apps the platform also detects package.json scripts.start or common entry files.</small></div>
    </div>
    <h2 style="margin-top:22px">Source</h2><div class="source-tabs" role="tablist" aria-label="Import method"><button class="source-tab ${state.source === 'git' ? 'active' : ''}" type="button" role="tab" aria-selected="${state.source === 'git'}" data-source="git">${icon('external')} Git repository</button><button class="source-tab ${state.source === 'zip' ? 'active' : ''}" type="button" role="tab" aria-selected="${state.source === 'zip'}" data-source="zip">${icon('upload')} ZIP upload</button><button class="source-tab ${state.source === 'local' ? 'active' : ''}" type="button" role="tab" aria-selected="${state.source === 'local'}" data-source="local">${icon('boxes')} Local folder</button><button class="source-tab ${state.source === 'none' ? 'active' : ''}" type="button" role="tab" aria-selected="${state.source === 'none'}" data-source="none">No source yet</button></div><div class="form-grid">${sourceFields}</div>
    <div class="notice">${icon('info')} Source code is executable. Processes run under your current Android/Linux user and are not a security sandbox. Dashboard and proxy listeners remain bound to 127.0.0.1.</div>
    <label class="checkbox-row" style="margin-top:13px"><input id="deployAfterImport" type="checkbox"><span>Deploy after import and save. A project becomes <span class="inline-code">Running</span> only after its process responds to the configured health check.</span></label>
    <div class="form-actions"><button type="button" class="button" data-nav="projects">Cancel</button><button type="submit" class="button button-primary" id="createProjectButton">${icon('plus')} Create project</button></div></form></div>`;
}

function renderDetails(project) {
  state.currentProject = project;
  const actionButtons = project.status === 'running'
    ? `<button class="button" data-action="stop" data-slug="${esc(project.slug)}">${icon('stop')} Stop</button><button class="button" data-action="restart" data-slug="${esc(project.slug)}">${icon('refresh')} Restart</button>`
    : project.status === 'unknown'
      ? `<button class="button" data-action="confirm-stopped" data-slug="${esc(project.slug)}">${icon('check')} Confirm stopped</button>`
      : `<button class="button button-primary" data-action="start" data-slug="${esc(project.slug)}">${icon('play')} Deploy</button>`;
  main.innerHTML = `<div class="page-stack">${pageHeading('PROJECT DETAIL', project.name, `Manage ${project.slug} · ${project.framework || project.runtime}`, `<button class="button" data-action="logs" data-slug="${esc(project.slug)}">${icon('file')} View logs</button>`)}
    <div class="details-grid"><section class="panel content-panel"><div class="panel-header"><div><h2>Deployment state</h2><p class="page-subtitle">Status and uptime are read from the process manager.</p></div><div style="margin-left:auto">${statusPill(project.status)}</div></div><div class="details-actions" style="margin-top:16px">${actionButtons}<button class="button button-danger" data-action="delete" data-slug="${esc(project.slug)}">${icon('trash')} Delete project</button></div><dl class="detail-list"><dt>Runtime</dt><dd>${esc(project.runtime)} · ${esc(project.framework || 'Custom')}</dd><dt>Hostname</dt><dd>${esc(project.hostname || 'Not assigned')}</dd><dt>Local port</dt><dd>${project.port || 'Unassigned'}</dd><dt>Source directory</dt><dd><span class="inline-code">${esc(project.sourcePath)}</span></dd><dt>Health check</dt><dd><span class="inline-code">${esc(project.healthPath)}</span></dd><dt>Last error</dt><dd class="${project.status === 'failed' ? 'warning-text' : ''}">${esc(project.lastError || 'No deployment error recorded.')}</dd><dt>Environment keys</dt><dd>${(project.envKeys || []).length ? project.envKeys.map((key) => `<span class="tag">${esc(key)}</span>`).join(' ') : 'No project environment variables configured.'}</dd></dl></section>
    <section class="panel content-panel"><h2>Source and process</h2><p class="page-subtitle">The dashboard does not expose an arbitrary shell to the browser.</p><div class="notice">${icon('info')} Runtime support is reported per host. Container-only deployment is disabled until a compatible adapter is enabled.</div><button class="button" data-nav="system" style="margin-top:13px">${icon('monitor')} View host capabilities</button></section></div>
    <section class="panel content-panel"><h2>Configuration</h2><p class="page-subtitle">Update operational settings and the public project page. Secret values are never returned by the API.</p><form id="projectConfigForm" data-slug="${esc(project.slug)}"><div class="form-grid" style="margin-top:15px"><div class="form-field"><label for="detailName">Project name</label><input class="input" id="detailName" name="name" value="${esc(project.name)}" required></div><div class="form-field"><label for="detailHostname">Hostname</label><input class="input" id="detailHostname" name="hostname" value="${esc(project.hostname || '')}" placeholder="project.${esc(state.capabilities?.baseDomain || 'anshman.online')}"></div><div class="form-field"><label for="detailRuntime">Runtime adapter</label><select class="select" id="detailRuntime" name="runtime">${runtimeOptions(project.runtime)}</select></div><div class="form-field"><label for="detailFramework">Framework / label</label><input class="input" id="detailFramework" name="framework" value="${esc(project.framework || '')}"></div><div class="form-field full"><label for="detailDescription">Public project description</label><textarea class="textarea" id="detailDescription" name="description" maxlength="1200" placeholder="What does this project do? Who is it for?">${esc(project.description || '')}</textarea><small>Shown on the public project page. It will be hidden from the directory when this project is stopped.</small></div><div class="form-field full"><label for="detailYoutube">YouTube overview link <span class="dim">(optional)</span></label><input class="input" id="detailYoutube" name="youtubeUrl" type="url" value="${esc(project.youtubeUrl || '')}" placeholder="https://youtu.be/…"><small>Only YouTube video links are accepted; visitors open the video directly on YouTube.</small></div><div class="form-field full"><label class="checkbox-row" for="detailPublic"><input type="checkbox" id="detailPublic" name="isPublic" ${project.isPublic === false ? '' : 'checked'}><span>List this project publicly when it is running</span></label></div><div class="form-field full"><label for="detailBuild">Build command</label><input class="input" id="detailBuild" name="buildCommand" value="${esc(project.buildCommand || '')}" placeholder="npm run build"></div><div class="form-field full"><label for="detailStart">Start command</label><input class="input" id="detailStart" name="startCommand" value="${esc(project.startCommand || '')}" placeholder="npm start"></div><div class="form-field"><label for="detailHealth">Health check path</label><input class="input" id="detailHealth" name="healthPath" value="${esc(project.healthPath || '/')}"></div><div class="form-field"><label class="checkbox-row" for="replaceEnv"><input type="checkbox" id="replaceEnv"> Replace environment variables</label><small>Existing values are not shown. Check this to submit a complete replacement set.</small></div><div class="form-field full"><label for="detailEnv">Environment variables</label><textarea class="textarea" id="detailEnv" placeholder="API_TOKEN=...&#10;DATABASE_URL=..." disabled></textarea><small>One KEY=value per line. Values are stored in a private local file and redacted from logs.</small></div></div><div class="form-actions"><button class="button button-primary" type="submit">${icon('check')} Save configuration</button></div></form></section></div>`;
}

async function renderDomains() {
  const domains = await api('/api/domains');
  const rows = domains.projects.length ? `<div class="table-responsive"><table class="table-list"><thead><tr><th>Hostname</th><th>Project</th><th>State</th><th>Local port</th><th>Actions</th></tr></thead><tbody>${domains.projects.map((p) => `<tr><td><span class="inline-code">${esc(p.hostname || 'Unassigned')}</span></td><td>${esc(p.name)}</td><td>${statusPill(p.status)}</td><td>${p.port || '—'}</td><td><button class="button button-small" data-action="edit-host" data-slug="${esc(p.slug)}">Edit hostname</button> <button class="button button-small" data-action="copy-proxy" data-host="${esc(p.hostname || '')}">Copy test command</button></td></tr>`).join('')}</tbody></table></div>` : emptyProjects();
  main.innerHTML = `<div class="page-stack">${pageHeading('ROUTING', 'Domains', 'The local proxy serves the public project directory and routes registered app hostnames.', '<a class="button" href="http://127.0.0.1:8780/" target="_blank" rel="noopener noreferrer">Preview public directory</a>')}
    <section class="panel content-panel"><div class="panel-header"><div><h2>Reverse proxy</h2><p class="page-subtitle">Loopback listener · HTTP · WebSocket upgrades enabled</p></div><span class="tag" style="margin-left:auto">${esc(domains.proxyUrl)}</span></div><div class="notice">${icon('info')} ${esc(domains.baseDomain)} serves the public project directory. Configure your DNS and HTTPS tunnel to send the base domain and project subdomains to this proxy. Keep the admin dashboard on port 3000 private.</div></section>
    <section class="panel content-panel"><h2>Project hostnames</h2><p class="page-subtitle">Use the copy action to test routing locally with a Host header.</p>${rows}</section><section class="panel content-panel"><h2>Local routing test</h2><p class="page-subtitle">The host does not need public DNS for a local proxy test.</p><pre class="terminal-banner">curl -H 'Host: ${esc(domains.projects.find((p) => p.hostname)?.hostname || `project.${domains.baseDomain}`)}' http://127.0.0.1:8780/</pre></section></div>`;
}

async function renderLogs() {
  if (!state.selectedLogProject && state.projects.length) state.selectedLogProject = state.projects[0].slug;
  const options = state.projects.map((p) => `<option value="${esc(p.slug)}" ${p.slug === state.selectedLogProject ? 'selected' : ''}>${esc(p.name)} · ${esc(p.slug)}</option>`).join('');
  let entries = [];
  if (state.selectedLogProject) { try { entries = await api(`/api/projects/${encodeURIComponent(state.selectedLogProject)}/logs?limit=500`); } catch (error) { entries = [`Could not load logs: ${error.message}`]; } }
  main.innerHTML = `<div class="page-stack">${pageHeading('OBSERVABILITY', 'Deployment logs', 'Captured build output, process stdout and stderr, and deployment health-check events.')}
    <section class="panel content-panel"><div class="log-toolbar"><label for="logProject" class="form-label">Project</label><select id="logProject" class="select">${options || '<option value="">No projects</option>'}</select><span class="spacer"></span><button class="button" data-action="refresh-logs">${icon('refresh')} Refresh</button></div><div id="logViewer" class="log-viewer" aria-live="polite">${entries.length ? entries.map(esc).join('\n') : 'No log entries recorded for this project yet.'}</div><p class="footer-note">Secret values are redacted before log lines are written. The server keeps the most recent 1,000 lines per request.</p></section></div>`;
}

async function renderSystem() {
  const data = await api('/api/system');
  const rows = data.runtimes.map((item) => `<div class="capability-row"><strong class="capability-name">${esc(item.name)}</strong><span class="capability-state ${esc(item.state)}">${esc(item.state.replaceAll('-', ' '))}</span><span class="capability-detail">${esc(item.detail)}${item.version ? ` <span class="dim">${esc(item.version)}</span>` : ''}</span></div>`).join('');
  const total = data.system.memoryTotal; const free = data.system.memoryFree; const pct = Math.round((1 - free / total) * 100);
  main.innerHTML = `<div class="page-stack">${pageHeading('HOST', 'System', 'Live capability discovery for the machine running this control plane.')}
    <section class="summary-grid system-summary-grid">${summaryCard(data.host.platform, 'Operating system', 'monitor')}${summaryCard(data.host.node, 'Node.js version', 'boxes')}${summaryCard(`${pct}%`, 'Host memory used', 'memory')}${summaryCard(`${data.host.cores}`, 'Logical CPU cores', 'cpu')}</section>
    <section class="panel content-panel"><div class="panel-header"><div><h2>Runtime capability matrix</h2><p class="page-subtitle">A detected runtime is not treated as deployable unless its adapter is implemented and enabled.</p></div><button class="button" data-action="refresh-system" style="margin-left:auto">${icon('refresh')} Refresh</button></div><div class="capability-list" style="margin-top:14px">${rows}</div></section>
    <section class="panel content-panel"><h2>Control plane</h2><dl class="detail-list"><dt>Dashboard listener</dt><dd><span class="inline-code">http://${esc(location.hostname)}:${location.port || 80}</span></dd><dt>Public router</dt><dd><span class="inline-code">http://127.0.0.1:8780</span></dd><dt>Dashboard process</dt><dd>PID ${data.process.pid} · uptime ${formatDuration(data.process.uptimeSeconds)}</dd><dt>Platform uptime</dt><dd>${formatDuration(data.system.uptimeSeconds)}</dd><dt>Host load average</dt><dd>${data.system.loadAverage.map((n) => Number(n).toFixed(2)).join(' · ')}</dd><dt>Memory</dt><dd>${formatBytes(total - free)} used of ${formatBytes(total)}</dd></dl><div class="notice">${icon('info')} Container and buildpack adapters are not enabled in this build. This page reflects capability discovery on the current host.</div></section></div>`;
}

function formatBytes(value) {
  const bytes = Number(value) || 0; const unit = ['B', 'KiB', 'MiB', 'GiB', 'TiB'][Math.min(4, Math.floor(Math.log(Math.max(1, bytes)) / Math.log(1024)))];
  return `${(bytes / 1024 ** ['B', 'KiB', 'MiB', 'GiB', 'TiB'].indexOf(unit)).toFixed(unit === 'B' ? 0 : 1)} ${unit}`;
}

function renderSettings() {
  const config = state.capabilities;
  main.innerHTML = `<div class="page-stack">${pageHeading('CONTROL PLANE', 'Settings', 'Host configuration and local data protection.')}
    <div class="settings-split"><nav class="panel settings-nav" aria-label="Settings sections"><a href="#settings">General</a><a href="#system">Runtime capabilities</a><a href="#backups">Backups</a><a href="#domains">Domain routing</a></nav>
    <section class="panel content-panel"><h2>Local host configuration</h2><p class="page-subtitle">Values below are discovered from the current process environment and host; this dashboard does not invent usage data.</p><dl class="detail-list"><dt>Platform</dt><dd>${esc(config?.host.platform || 'Loading')}</dd><dt>Node runtime</dt><dd>${esc(config?.host.node || 'Loading')}</dd><dt>Project port range</dt><dd>3100–3999</dd><dt>Project source root</dt><dd><span class="inline-code">apps/</span></dd><dt>Metadata root</dt><dd><span class="inline-code">data/</span></dd><dt>Base domain</dt><dd><a class="text-button" href="https://${esc(config?.baseDomain || 'anshman.online')}" target="_blank" rel="noopener noreferrer">https://${esc(config?.baseDomain || 'anshman.online')}</a></dd><dt>Public router</dt><dd><span class="inline-code">127.0.0.1:8780</span></dd></dl><div class="notice">${icon('info')} The public directory and project subdomains use the app proxy. The admin dashboard stays on its private loopback listener; do not route port 3000 publicly. Secret values remain in local files with restrictive permissions where supported.</div><div class="form-actions"><button class="button" data-nav="system">${icon('monitor')} View capabilities</button><button class="button" data-nav="backups">${icon('database')} Manage backups</button></div></section></div>
    <section class="panel content-panel"><h2>Change admin password</h2><p class="page-subtitle">The password is stored as a salted hash in the ignored local data directory. This also signs in the current browser again.</p><form id="changePasswordForm" class="password-form"><div class="form-grid" style="margin-top:15px"><div class="form-field full"><label for="currentAdminPassword">Current password</label><input class="input" id="currentAdminPassword" name="currentPassword" type="password" autocomplete="current-password" required></div><div class="form-field"><label for="newAdminPassword">New password</label><input class="input" id="newAdminPassword" name="newPassword" type="password" minlength="14" maxlength="256" autocomplete="new-password" required><small>At least 14 characters.</small></div><div class="form-field"><label for="confirmNewAdminPassword">Confirm new password</label><input class="input" id="confirmNewAdminPassword" name="confirmPassword" type="password" minlength="14" maxlength="256" autocomplete="new-password" required></div></div><div class="form-actions"><button class="button button-primary" type="submit">${icon('check')} Update password</button></div></form></section></div>`;
}

async function renderBackups() {
  state.backups = await api('/api/backups');
  const rows = state.backups.length ? `<div class="table-responsive"><table class="table-list"><thead><tr><th>Backup</th><th>Created</th><th>Projects</th><th>Secrets</th><th>Contents</th></tr></thead><tbody>${state.backups.map((b) => `<tr><td><span class="inline-code">${esc(b.id)}</span></td><td>${esc(b.createdAt ? new Date(b.createdAt).toLocaleString() : 'Incomplete')}</td><td>${Number(b.projectCount || 0)}</td><td>${b.includesSecrets ? '<span class="warning-text">Included · private</span>' : 'No values'}</td><td><span class="inline-code">backups/${esc(b.id)}/</span></td></tr>`).join('')}</tbody></table></div>` : `<div class="empty-state"><span class="empty-state-icon">${icon('database')}</span><strong>No snapshots yet</strong><p>A backup copies metadata, secret values, and project source while excluding node_modules and Git history.</p></div>`;
  main.innerHTML = `<div class="page-stack">${pageHeading('DATA SAFETY', 'Backups', 'Create a local snapshot of project configuration and source.', `<button class="button button-primary" data-action="create-backup">${icon('database')} Create backup</button>`)}
    <section class="panel content-panel"><div class="notice">${icon('alert')} Backups can contain environment-variable secrets. Keep the backup directory private and copy it to a separate secure location for off-device protection.</div>${rows}</section></div>`;
}

function renderTerminal() {
  const rows = state.projects.length ? state.projects.map((p) => `<tr><td>${esc(p.name)}</td><td>${statusPill(p.status)}</td><td>${p.port || '—'}</td><td><button class="button button-small" data-action="logs" data-slug="${esc(p.slug)}">${icon('file')} Open logs</button> <button class="button button-small" data-action="${p.status === 'running' ? 'stop' : 'start'}" data-slug="${esc(p.slug)}">${p.status === 'running' ? `${icon('stop')} Stop` : `${icon('play')} Deploy`}</button></td></tr>`).join('') : '';
  main.innerHTML = `<div class="page-stack">${pageHeading('OPERATIONS', 'Terminal', 'Read process status and open captured output from the dashboard.')}
    <section class="panel content-panel"><div class="terminal-banner"><strong>anshumanhost</strong> · browser terminal is disabled<br>Project source executes as your current OS user. An arbitrary browser shell would expose the host, so use Termux directly for host maintenance. The dashboard connects to each managed process through lifecycle actions and logs.</div>${rows ? `<div class="table-responsive" style="margin-top:14px"><table class="table-list"><thead><tr><th>Project</th><th>Status</th><th>Port</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>` : emptyProjects()}</section></div>`;
}

async function render() {
  closeMobileNav();
  document.querySelectorAll('[data-page]').forEach((link) => link.classList.toggle('active', link.dataset.page === (state.page === 'project' ? 'projects' : state.page)));
  try {
    if (state.page === 'dashboard') renderDashboard();
    else if (state.page === 'projects') renderProjects();
    else if (state.page === 'deploy') renderDeploy();
    else if (state.page === 'project') { const project = await api(`/api/projects/${encodeURIComponent(state.currentProjectSlug)}`); renderDetails(project); }
    else if (state.page === 'domains') await renderDomains();
    else if (state.page === 'logs') await renderLogs();
    else if (state.page === 'system') await renderSystem();
    else if (state.page === 'settings') renderSettings();
    else if (state.page === 'backups') await renderBackups();
    else if (state.page === 'terminal') renderTerminal();
    else { state.page = 'dashboard'; renderDashboard(); }
  } catch (error) {
    main.innerHTML = `<section class="panel content-panel"><div class="notice error">${icon('alert')} ${esc(error.message)}</div><button class="button" data-action="retry" style="margin-top:12px">${icon('refresh')} Retry</button></section>`;
  }
  const baseDomainLink = main.querySelector('.detail-list a.text-button');
  if (baseDomainLink) {
    baseDomainLink.href = 'http://127.0.0.1:8780/';
    baseDomainLink.title = 'Open local preview of this domain';
  }
  addPasswordVisibilityControls();
}

function routeFromHash() {
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (route.startsWith('project/')) { state.currentProjectSlug = route.slice('project/'.length); state.page = 'project'; }
  else state.page = ['dashboard', 'projects', 'deploy', 'domains', 'logs', 'settings', 'system', 'terminal', 'backups'].includes(route) ? route : 'dashboard';
  void render();
}

function navigate(page, slug) {
  if (slug) { state.currentProjectSlug = slug; location.hash = `project/${encodeURIComponent(slug)}`; }
  else location.hash = page;
}

function showToast(message, kind = 'success') {
  const toast = document.createElement('div'); toast.className = `toast ${kind}`; toast.innerHTML = `${icon(kind === 'error' ? 'alert' : 'checkCircle')}<span>${esc(message)}</span>`;
  toastRegion.append(toast); setTimeout(() => toast.remove(), 4800);
}

function closeMobileNav() {
  sidebar.classList.remove('open'); sidebarScrim.classList.remove('visible'); mobileMenu.setAttribute('aria-expanded', 'false');
}

function setBusy(button, label = 'Working…') {
  if (!button) return () => {};
  const old = button.innerHTML; button.disabled = true; button.innerHTML = `<span class="spinner-inline"></span>${label}`;
  return () => { button.disabled = false; button.innerHTML = old; };
}

async function refreshAndRender() {
  await refresh();
  await render();
}

function parseEnv(text) {
  const result = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) throw new Error('Use KEY=value on each environment-variable line.');
    result[line.slice(0, eq).trim()] = line.slice(eq + 1);
  }
  return result;
}

document.addEventListener('click', async (event) => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { event.preventDefault(); navigate(nav.dataset.nav); return; }
  const open = event.target.closest('[data-open-project]');
  if (open && !event.target.closest('button')) { navigate('project', open.dataset.openProject); return; }
  const source = event.target.closest('[data-source]');
  if (source) {
    const previous = document.querySelector('#deployForm');
    const values = previous ? Object.fromEntries(new FormData(previous).entries()) : {};
    const publicEnabled = previous?.querySelector('#projectPublic')?.checked ?? true;
    state.source = source.dataset.source; renderDeploy();
    for (const [name, value] of Object.entries(values)) { const field = document.querySelector(`#deployForm [name="${CSS.escape(name)}"]`); if (field && field.type !== 'file' && field.type !== 'checkbox') field.value = value; }
    const publicCheckbox = document.querySelector('#projectPublic'); if (publicCheckbox) publicCheckbox.checked = publicEnabled;
    return;
  }
  const actionButton = event.target.closest('[data-action]');
  if (!actionButton) return;
  const { action, slug } = actionButton.dataset;
  if (action === 'clear-search') { state.query = ''; state.projectFilter = 'all'; await render(); return; }
  if (action === 'retry') { try { await refreshAndRender(); } catch (error) { showToast(error.message, 'error'); } return; }
  if (action === 'refresh-system') { await render(); return; }
  if (action === 'refresh-logs') { await renderLogs(); return; }
  if (action === 'logs') { state.selectedLogProject = slug; navigate('logs'); return; }
  if (action === 'sample') { await deploySample(actionButton); return; }
  if (action === 'create-backup') { await createBackup(actionButton); return; }
  if (action === 'copy-proxy') { await copyProxy(actionButton.dataset.host); return; }
  if (action === 'edit-host') { await editHostname(slug); return; }
  if (action === 'delete') { await deleteProject(slug); return; }
  if (action === 'confirm-stopped') { await confirmStopped(slug); return; }
  if (['start', 'stop', 'restart'].includes(action)) { await projectAction(action, slug, actionButton); return; }
});

document.addEventListener('input', (event) => {
  if (event.target.id === 'projectSearch') { state.query = event.target.value; const position = event.target.selectionStart; void render(); const next = document.querySelector('#projectSearch'); next?.focus(); next?.setSelectionRange(position, position); }
  if (event.target.id === 'globalSearch') { state.query = event.target.value; }
  if (event.target.id === 'projectName') {
    const slug = document.querySelector('#projectSlug');
    if (slug && !slug.dataset.edited) slug.value = event.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const hostname = document.querySelector('#projectHostname');
    if (hostname && !hostname.dataset.edited) hostname.value = `${(slug?.value || '').toLowerCase()}.${state.capabilities?.baseDomain || 'anshman.online'}`;
  }
  if (event.target.id === 'projectSlug') { event.target.dataset.edited = 'true'; const hostname = document.querySelector('#projectHostname'); if (hostname && !hostname.dataset.edited) hostname.value = `${event.target.value}.${state.capabilities?.baseDomain || 'anshman.online'}`; }
  if (event.target.id === 'projectHostname') event.target.dataset.edited = 'true';
});

document.addEventListener('change', (event) => {
  if (event.target.id === 'projectFilter') { state.projectFilter = event.target.value; void render(); }
  if (event.target.id === 'logProject') { state.selectedLogProject = event.target.value; void renderLogs(); }
  if (event.target.id === 'replaceEnv') { const field = document.querySelector('#detailEnv'); if (field) field.disabled = !event.target.checked; }
});

document.addEventListener('submit', async (event) => {
  if (event.target.id === 'authForm') {
    event.preventDefault();
    const form = event.target;
    const password = form.querySelector('[name="password"]').value;
    const mode = form.dataset.mode;
    const error = document.querySelector('#authError');
    if (mode === 'setup' && password !== form.querySelector('[name="confirmPassword"]').value) { error.textContent = 'The passwords do not match.'; return; }
    const button = form.querySelector('[type="submit"]'); const restore = setBusy(button, mode === 'setup' ? 'Saving…' : 'Signing in…');
    try {
      await api(mode === 'setup' ? '/api/auth/setup' : '/api/auth/login', { method: 'POST', body: JSON.stringify({ password }) });
      form.reset();
      await init();
    } catch (requestError) { error.textContent = requestError.message; }
    finally { restore(); }
  }
  if (event.target.id === 'changePasswordForm') {
    event.preventDefault();
    const form = event.target;
    const values = Object.fromEntries(new FormData(form).entries());
    if (values.newPassword !== values.confirmPassword) { showToast('The new passwords do not match.', 'error'); return; }
    const restore = setBusy(form.querySelector('[type="submit"]'), 'Updating…');
    try { await api('/api/auth/change-password', { method: 'POST', body: JSON.stringify(values) }); form.reset(); showToast('Admin password updated.'); }
    catch (error) { showToast(error.message, 'error'); }
    finally { restore(); }
  }
  if (event.target.id === 'deployForm') { event.preventDefault(); await createProject(event.target); }
  if (event.target.id === 'projectConfigForm') { event.preventDefault(); await saveProjectConfig(event.target); }
});

document.querySelector('#primaryNav').addEventListener('click', (event) => {
  const link = event.target.closest('a[data-page]'); if (!link) return;
  event.preventDefault(); navigate(link.dataset.page);
});
document.querySelector('#notificationsButton').addEventListener('click', () => navigate('logs'));
document.querySelector('#signOutButton').addEventListener('click', async () => {
  try { await api('/api/auth/logout', { method: 'POST', body: '{}' }); await init(); }
  catch (error) { showToast(error.message, 'error'); }
});
mobileMenu.addEventListener('click', () => { const open = !sidebar.classList.contains('open'); sidebar.classList.toggle('open', open); sidebarScrim.classList.toggle('visible', open); mobileMenu.setAttribute('aria-expanded', String(open)); });
sidebarScrim.addEventListener('click', closeMobileNav);
document.querySelector('#globalSearch').addEventListener('keydown', (event) => { if (event.key === 'Enter') { navigate('projects'); setTimeout(() => { const input = document.querySelector('#projectSearch'); if (input) { input.value = state.query; input.focus(); } }, 0); } });
document.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#globalSearch').focus(); } });
window.addEventListener('hashchange', routeFromHash);

async function projectAction(action, slug, button) {
  const restore = setBusy(button, action === 'stop' ? 'Stopping…' : action === 'restart' ? 'Restarting…' : 'Deploying…');
  try {
    const project = await api(`/api/projects/${encodeURIComponent(slug)}/${action === 'start' ? 'deploy' : action}`, { method: 'POST', body: '{}' });
    await refresh();
    if (state.page === 'project') state.currentProject = project;
    await render();
    showToast(`${project.name || slug} ${action === 'stop' ? 'stopped' : 'is running'}.`);
  } catch (error) { await refresh().catch(() => {}); await render(); showToast(error.message, 'error'); }
  finally { restore(); }
}

async function deploySample(button) {
  if (state.busy) return;
  state.busy = true; const restore = setBusy(button, 'Building sample…');
  try {
    const project = await api('/api/sample/deploy', { method: 'POST', body: JSON.stringify({}) });
    await refresh(); showToast('Sample app passed its local health check.'); navigate('project', project.slug);
  } catch (error) { showToast(error.message, 'error'); await refresh().catch(() => {}); await render(); }
  finally { restore(); state.busy = false; }
}

async function createBackup(button) {
  const restore = setBusy(button, 'Snapshotting…');
  try { const backup = await api('/api/backups', { method: 'POST', body: '{}' }); showToast(`Backup ${backup.id} created with ${backup.projectCount} project(s).`); await renderBackups(); }
  catch (error) { showToast(error.message, 'error'); }
  finally { restore(); }
}

async function copyProxy(host) {
  if (!host) { showToast('Assign a hostname first.', 'error'); return; }
  const command = `curl -H 'Host: ${host}' http://127.0.0.1:8780/`;
  try { await navigator.clipboard.writeText(command); showToast('Local proxy test command copied.'); }
  catch { showToast(command, 'error'); }
}

async function editHostname(slug) {
  const project = state.projects.find((p) => p.slug === slug);
  const hostname = window.prompt('Project hostname (blank removes it):', project?.hostname || '');
  if (hostname === null) return;
  try { await api(`/api/projects/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify({ hostname }) }); await refresh(); await renderDomains(); showToast('Hostname mapping saved.'); }
  catch (error) { showToast(error.message, 'error'); }
}

async function deleteProject(slug) {
  const project = state.projects.find((p) => p.slug === slug) || state.currentProject;
  if (!window.confirm(`Delete ${project?.name || slug}, its source folder and stored environment values?`)) return;
  try { await api(`/api/projects/${encodeURIComponent(slug)}`, { method: 'DELETE', body: JSON.stringify({ confirm: slug }) }); await refresh(); showToast(`${project?.name || slug} deleted.`); navigate('projects'); }
  catch (error) { showToast(error.message, 'error'); }
}

async function confirmStopped(slug) {
  const project = state.projects.find((p) => p.slug === slug) || state.currentProject;
  if (!window.confirm(`Confirm that you checked the host process list and ${project?.name || slug} is no longer running?`)) return;
  try { await api(`/api/projects/${encodeURIComponent(slug)}/confirm-stopped`, { method: 'POST', body: JSON.stringify({ confirm: slug }) }); await refresh(); await render(); showToast('Project state marked stopped after your review.'); }
  catch (error) { showToast(error.message, 'error'); }
}

async function createProject(form) {
  const button = form.querySelector('[type="submit"]'); const restore = setBusy(button, 'Creating…');
  const values = Object.fromEntries(new FormData(form).entries());
  values.isPublic = Boolean(form.querySelector('#projectPublic')?.checked);
  values.buildCommand ||= ''; values.startCommand ||= '';
  try {
    if (state.source === 'git' && !form.querySelector('#gitUrl')?.value.trim()) throw new Error('Enter an HTTPS Git repository URL.');
    if (state.source === 'local' && !form.querySelector('#localDirectory')?.value.trim()) throw new Error('Enter an existing folder name under apps/.');
    if (state.source === 'zip' && !form.querySelector('#zipFile')?.files?.[0]) throw new Error('Choose a ZIP archive to upload.');
    const project = await api('/api/projects', { method: 'POST', body: JSON.stringify(values) });
    if (state.source === 'git') {
      const url = form.querySelector('#gitUrl')?.value.trim();
      await api(`/api/projects/${encodeURIComponent(project.slug)}/import/git`, { method: 'POST', body: JSON.stringify({ url }) });
    } else if (state.source === 'local') {
      const directory = form.querySelector('#localDirectory')?.value.trim();
      await api(`/api/projects/${encodeURIComponent(project.slug)}/import/local`, { method: 'POST', body: JSON.stringify({ directory }) });
    } else if (state.source === 'zip') {
      const file = form.querySelector('#zipFile')?.files?.[0];
      await api(`/api/projects/${encodeURIComponent(project.slug)}/import/zip`, { method: 'PUT', body: await file.arrayBuffer(), headers: { 'content-type': 'application/zip' } });
    }
    const configPayload = {};
    for (const field of ['runtime', 'framework', 'buildCommand', 'startCommand', 'healthPath']) if (values[field]) configPayload[field] = values[field];
    if (Object.keys(configPayload).length) await api(`/api/projects/${encodeURIComponent(project.slug)}`, { method: 'PUT', body: JSON.stringify(configPayload) });
    let finalProject = project;
    if (form.querySelector('#deployAfterImport')?.checked) finalProject = await api(`/api/projects/${encodeURIComponent(project.slug)}/deploy`, { method: 'POST', body: '{}' });
    await refresh(); showToast(form.querySelector('#deployAfterImport')?.checked ? 'Deployment passed its health check.' : 'Project configuration saved.'); navigate('project', finalProject.slug);
  } catch (error) { showToast(error.message, 'error'); await refresh().catch(() => {}); }
  finally { restore(); }
}

async function saveProjectConfig(form) {
  const slug = form.dataset.slug; const restore = setBusy(form.querySelector('[type="submit"]'), 'Saving…');
  const values = Object.fromEntries(new FormData(form).entries());
  values.isPublic = Boolean(form.querySelector('#detailPublic')?.checked);
  if (form.querySelector('#replaceEnv')?.checked) {
    try { values.env = parseEnv(form.querySelector('#detailEnv').value); }
    catch (error) { restore(); showToast(error.message, 'error'); return; }
  }
  try { await api(`/api/projects/${encodeURIComponent(slug)}`, { method: 'PUT', body: JSON.stringify(values) }); await refresh(); await render(); showToast('Project configuration saved.'); }
  catch (error) { showToast(error.message, 'error'); }
  finally { restore(); }
}

async function init() {
  try {
    const session = await api('/api/auth/session');
    if (!session.configured || !session.authenticated) { renderAuthGate(session.configured); return; }
    document.body.classList.remove('auth-locked');
    await refresh(); const shortcut = document.querySelector('.global-search kbd'); if (shortcut) shortcut.textContent = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K'; routeFromHash();
  }
  catch (error) { main.innerHTML = `<section class="panel content-panel"><p class="eyebrow">CONTROL PLANE UNAVAILABLE</p><h1>Could not connect to AnshumanHost</h1><p class="page-subtitle">${esc(error.message)}</p><p class="page-subtitle">Start the dashboard with <span class="inline-code">npm start</span> and keep it bound to 127.0.0.1.</p><button class="button button-primary" data-action="retry">${icon('refresh')} Retry connection</button></section>`; }
}

init();
