# AnshumanHost

AnshumanHost is a local-first deployment control panel and public project directory for personal projects. The dashboard uses Node.js and Express when the dependency is available, with a built-in HTTP fallback for offline development. It stores metadata in atomic JSON files, launches supported applications as child processes, captures their output, checks readiness, and serves the public directory and registered app hostnames through a separate loopback proxy.

The dashboard is an operational prototype, not a public hosting service or a security sandbox. It binds to `127.0.0.1:3000`; the project reverse proxy binds to `127.0.0.1:8780`. Project code runs as the same operating-system user as the dashboard.

## Requirements

- Node.js 18.17 or newer. Node.js 22 was used for development.
- npm for installing the declared Express dependency and for Node projects that need packages.
- Git for HTTPS repository imports.
- Python 3 is optional and discovered at runtime.
- No Docker, root access, systemd, Nginx, or Kubernetes is required for the native Node.js and static-site path.

## Install and start in Termux

Copy this project to `~/hosting-platform`, then run:

```sh
cd ~/hosting-platform
npm install
npm start
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). On the first visit, set the admin password from this device; later visits require sign-in. Use at least 14 characters. Keep the Termux session alive while you use the dashboard. Android can stop background processes, so this setup does not promise VPS-like uptime.

Change the password in **Settings → Change admin password**. To recover a forgotten password, stop AnshumanHost, remove `data/admin-auth.json` on the host device, restart it, and set a new password through the local dashboard.

If npm cannot reach its registry, the app's dependency-free HTTP fallback can start with:

```sh
cd ~/hosting-platform
node src/server.js
```

The fallback exposes the same local API and UI. Express remains the preferred server when `npm install` succeeds. `npm test` uses Node's built-in test runner and does not need an installed test framework.

## Deploy the included sample

From the dashboard, select **Deploy New Project → Deploy sample app** (or use the empty dashboard's sample action). The sample uses Node's built-in HTTP module and needs no external package.

You can also create and deploy it through the local API:

```sh
curl -sS -X POST http://127.0.0.1:3000/api/sample/deploy \
  -H 'content-type: application/json' \
  -d '{}'
```

The response contains the actual assigned port and hostname. Verify the process health endpoint directly on that assigned port:

```sh
curl http://127.0.0.1:<assigned-port>/health
```

Verify hostname routing through the local reverse proxy:

```sh
curl -H 'Host: sample.anshman.online' http://127.0.0.1:8780/health
```

The hostname header is enough for local testing; no public DNS record is created. The dashboard's **Projects** and **Logs** pages expose real status, actions, process output, and deployment events.

## Import and deploy projects

The **Deploy New Project** form supports:

- **HTTPS Git URL:** clones a shallow checkout into `apps/<slug>`. URLs with embedded credentials and custom ports are rejected.
- **ZIP upload:** uploads up to 100 MiB and extracts up to 200 MiB. The extractor rejects traversal paths, symlinks, unsupported compression, excessive file counts, and oversized expansion.
- **Existing local folder:** copies a validated folder from `apps/<folder>`; unrestricted paths are never accepted.
- **No source yet:** creates a metadata record so you can configure and import later.

After import, review the detected runtime and configuration. Native adapters currently deploy:

| Runtime | Current behavior |
| --- | --- |
| Node.js | Runs a configured start command, `package.json` `scripts.start`, or a detected entry file. If `package.json` exists and `node_modules/` does not, it runs `npm install`. |
| Static website | Runs a configured build command, then serves `dist/`, `build/`, `public/`, or the project root with a lightweight static server. |
| Python | Capability is discovered if Python 3 is present. If `requirements.txt` exists, the platform creates a project-local virtual environment and installs its requirements when the file changes. It then starts the configured command or `python3 app.py`. |

Custom build and start commands are tokenized into an executable and arguments and launched with `shell: false`. Shell operators and expansions are rejected. They still run trusted project code as your current user.

The platform assigns an unused port in `3100–3999`, sets `PORT` and `HOST=127.0.0.1`, records logs, and marks a deployment successful only after the configured health path returns HTTP 2xx or 3xx. A failed build, start, or health check remains visible as a failure.

## Public project directory

The base domain (`anshman.online` by default) serves a public project directory through the reverse proxy. It lists only projects that are running, have an assigned subdomain, and have **List this project publicly** enabled. This setting is on by default for new projects and can be changed in each project's admin configuration. Existing projects are listed unless you switch the setting off.

Each card opens a detail page at `/projects/<slug>` with the project description, live subdomain, and optional YouTube overview link. Add or update the description and YouTube link from that project's **Configuration** section. Video links are validated as YouTube URLs and open on YouTube rather than being embedded.

The public directory intentionally returns only presentation fields. It does not expose deployment logs, local ports, process IDs, environment values, source paths, or admin APIs. Stopped projects disappear from the public directory until they are running again.

To test the directory locally:

```sh
curl -H 'Host: anshman.online' http://127.0.0.1:8780/
curl -H 'Host: anshman.online' http://127.0.0.1:8780/directory-api/projects
```

## Hostname routing and domains

The reverse proxy listens on `127.0.0.1:8780`, matches the HTTP `Host` header against registered project hostnames, and routes only to the currently managed process port. It supports HTTP and WebSocket upgrades. Unknown hosts return 404; a stopped or unknown project does not receive traffic. The dashboard listener is never registered as an upstream.

For local routing, use a command such as:

```sh
curl -H 'Host: app.anshman.online' http://127.0.0.1:8780/
```

This does not change DNS. To publish the directory and subdomains, follow [FUTURE_PUBLIC_SETUP.md](FUTURE_PUBLIC_SETUP.md) after local routing works.

## Data, secrets, logs, and backups

- Project metadata: `data/store.json` (atomic replacement writes).
- Project environment values: `data/secrets.json` (mode `0600` where supported); API responses expose variable names only.
- Imported source: `apps/<slug>/`.
- Captured deployment and runtime output: `logs/<slug>.log`; known secret values are redacted before writes.
- Backups: `backups/<timestamp>/`, including metadata, secret values, and project source, excluding `.git/` and `node_modules/`.

Backups contain secrets. Keep them private. To back up, open **Backups → Create backup**. Copy a completed backup directory to secure storage using Termux or your file manager. Restoration is a manual operation in this prototype: stop the dashboard, preserve the current `data/` and `apps/`, then restore those folders from the backup. Do not overwrite files while the dashboard is running.

Project deletion removes its source folder, logs, metadata, and environment values. It does not delete unrelated directories.

## Process recovery and security boundaries

On a clean dashboard shutdown, managed children receive `SIGTERM` and then `SIGKILL` after a short grace period. If the dashboard is restarted without a clean shutdown, project state becomes **Unknown**. The platform will not signal a persisted PID because it cannot prove that PID still belongs to the old project. Review the host process list, then use **Confirm stopped** before redeploying.

Dashboard and proxy listeners are loopback-only by default. The admin panel requires a password, stores a salted scrypt hash in ignored `data/admin-auth.json`, uses an HttpOnly SameSite session cookie, checks same-origin write requests, and temporarily rate-limits failed logins. Initial password setup is accepted only over loopback. Do not change the bind address or expose port 3000 publicly. Imported repositories and images are executable code; process separation under one OS user is not isolation.

The router serves the public directory at the base domain and publishes registered application hostnames; it never routes the dashboard API. This does not stop trusted application code from reading other files available to the same OS user. Only deploy source you trust.

## Capability limits in this build

The **System** page discovers the current operating system and available runtimes. Node.js, static sites, and detected Python are the native vertical slice. Docker Engine and Compose can be detected, but container lifecycle/build controls are not enabled yet. Java, Go, PHP, Ruby, background workers, scheduled jobs, databases, Kafka, RabbitMQ, buildpacks, remote deployment hosts, and persistent volume management are not implemented in this build. Those capabilities are shown as unavailable or adapter-required rather than being presented as working.

## Test and troubleshoot

Run the included test suite with:

```sh
npm test
```

It covers validation, duplicate slugs, port allocation, a sample child process, health checks, HTTP and WebSocket proxying, unknown hosts, ZIP traversal protection, metadata restart recovery, capability discovery, and secret redaction. Network and loopback integration tests need permission to open local sockets; a restricted execution sandbox may reject them even though Termux permits local loopback traffic.

Common checks:

```sh
curl http://127.0.0.1:3000/api/health
curl http://127.0.0.1:3000/api/capabilities
```

- **Port already in use:** set `ANSHUMANHOST_PORT` or `ANSHUMANHOST_PROXY_PORT` before startup; application ports are allocated from the configured range.
- **Git import fails:** confirm `git` is installed and the repository is reachable over HTTPS.
- **Node dependency install fails:** install dependencies from a network-enabled Termux session; logs show the command output and failure state.
- **Health check fails:** open the project's Logs page and confirm its server listens on `process.env.PORT` and the configured path returns 2xx/3xx.
- **A process shows Unknown:** inspect Termux's process list before confirming it stopped. The platform intentionally avoids killing an unverified PID.
- **A public hostname does not load:** confirm local Host-header routing first, then follow the separate tunnel guide. DNS alone does not start or keep a tunnel alive.

## Project layout

```text
src/server.js                 Dashboard API and local static delivery
src/services/store.js         Atomic metadata and private secret store
src/services/deployments.js    Import, configuration, deployment, backups
src/process-manager/manager.js Child processes, port allocation, health checks
src/reverse-proxy/server.js    Host-based HTTP and WebSocket router
src/security/                  Validation and safe ZIP extraction
public/                        Responsive dashboard
public/assets/                 Original generated hero illustration
public-showcase/               Public project directory and detail pages
examples/sample-node/          Deployable no-dependency sample application
apps/                          Imported projects (ignored by Git)
data/                          Local private state (ignored by Git)
logs/                          Runtime and deployment logs (ignored by Git)
backups/                       Local snapshots (ignored by Git)
tests/                         Built-in Node test suite
```
