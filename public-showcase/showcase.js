'use strict';

const content = document.querySelector('#content');
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[ch]);
document.querySelector('#year').textContent = new Date().getFullYear();
const adminLink = document.querySelector('#adminLink');
if (adminLink && ['127.0.0.1', 'localhost'].includes(location.hostname)) {
  adminLink.href = `http://${location.hostname}:3000/`;
  adminLink.hidden = false;
  adminLink.title = 'Open the local admin panel';
}

async function getJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load projects.');
  return result;
}

function card(project) {
  const description = project.description || 'Description has not been added yet.';
  return `<article class="project-card"><div class="project-meta"><span class="live-dot" aria-hidden="true"></span>Live project <span>·</span> ${esc(project.framework || project.runtime)}</div><h2>${esc(project.name)}</h2><p>${esc(description)}</p><div class="card-footer"><a class="project-link" href="/projects/${encodeURIComponent(project.slug)}">View project details →</a><a class="host-link" href="${esc(project.projectUrl)}" target="_blank" rel="noopener noreferrer">${esc(project.hostname)}</a></div></article>`;
}

function renderDirectory(projects) {
  document.title = 'AnshumanHost · Projects';
  content.innerHTML = projects.length
    ? `<div class="project-grid">${projects.map(card).join('')}</div>`
    : '<div class="empty"><strong>No public projects yet</strong>Published, running projects will appear here.</div>';
}

function renderDetails(project) {
  document.title = `${project.name} · AnshumanHost`;
  const description = project.description || 'Description has not been added yet.';
  const video = project.youtubeUrl ? `<a class="button-link secondary" href="${esc(project.youtubeUrl)}" target="_blank" rel="noopener noreferrer">Watch the project overview on YouTube ↗</a>` : '';
  content.innerHTML = `<article class="detail-card"><a class="back-link" href="/">← All projects</a><div class="project-meta detail-meta"><span class="live-dot" aria-hidden="true"></span>Live project <span>·</span> ${esc(project.framework || project.runtime)}</div><h1>${esc(project.name)}</h1><p class="detail-description">${esc(description)}</p><div class="detail-links"><a class="button-link" href="${esc(project.projectUrl)}" target="_blank" rel="noopener noreferrer">Open live project ↗</a>${video}</div><div class="detail-foot">Deployed on AnshumanHost · <a href="${esc(project.projectUrl)}" target="_blank" rel="noopener noreferrer">${esc(project.hostname)}</a></div></article>`;
}

async function init() {
  const match = location.pathname.match(/^\/projects\/([a-z0-9-]+)\/?$/i);
  try {
    if (match) renderDetails(await getJson(`/directory-api/projects/${encodeURIComponent(match[1])}`));
    else renderDirectory(await getJson('/directory-api/projects'));
  } catch (error) {
    if (match && error.message === 'Project not found.') {
      content.innerHTML = '<div class="not-found"><h2>Project unavailable</h2><p>This project is not currently published and running.</p><a href="/">Return to the project directory</a></div>';
      return;
    }
    content.innerHTML = `<p class="state">${esc(error.message)}</p>`;
  }
}

init();
