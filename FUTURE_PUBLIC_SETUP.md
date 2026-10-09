# Publish the AnshumanHost directory and project subdomains

AnshumanHost serves the public directory at `anshman.online` and app projects on subdomains such as `chat.anshman.online`. DNS is currently managed by Hostinger's parking nameservers; the domain does not yet route to this application. The app does not create DNS records or start a tunnel. The admin dashboard remains private.

## Current local route

AnshumanHost has two listeners:

- Dashboard/API: `127.0.0.1:3000` (private control plane)
- Public directory and app reverse proxy: `127.0.0.1:8780` (base domain plus registered app hostnames)

First deploy an app and verify it locally:

```sh
curl -H 'Host: chat.anshman.online' http://127.0.0.1:8780/
```

Do not point a public route at port 3000. The dashboard has password sign-in, but it is a local single-user control plane and is not intended to be public.

The public directory shows running projects whose **List this project publicly** option is on. A visitor can open each project's detail page, follow its subdomain, and open its optional YouTube overview. Add the description and video link in that project's admin configuration.

## Cloudflare-side setup

1. Add `anshman.online` to a Cloudflare account. Its current authoritative nameservers are Hostinger's `ns1.dns-parking.com` and `ns2.dns-parking.com`. Copy any DNS records that must remain active before changing the nameservers at Hostinger to the nameservers Cloudflare assigns. A nameserver change replaces the authoritative DNS provider for the whole domain.
2. In the Cloudflare dashboard, create a Tunnel under Networking → Tunnels. Choose a remotely managed or locally managed tunnel for your setup.
3. Add a published application route for `anshman.online` with the local service set to `http://127.0.0.1:8780`. This route serves the public directory.
4. Add a route for `*.anshman.online` to the same local proxy so project subdomains reach the hostname router. In a remotely managed tunnel, add the base domain and each required project hostname in the dashboard if wildcard hostnames are not available for that route.
5. Keep `127.0.0.1:3000` out of tunnel ingress rules. The admin dashboard must remain private even though it has password sign-in.

Cloudflare's locally managed ingress rules support wildcard hostnames and require a final catch-all rule. An illustrative config for a locally managed tunnel is:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /path/to/<TUNNEL-UUID>.json

ingress:
  - hostname: anshman.online
    service: http://127.0.0.1:8780
  - hostname: "*.anshman.online"
    service: http://127.0.0.1:8780
  - service: http_status:404
```

For remotely managed tunnels, configure the public-hostname-to-service mappings in the Cloudflare dashboard instead of using this local YAML. Cloudflare creates or associates DNS records for published application routes; creating a DNS record alone does not start the tunnel.

## Verify the connector configuration

For a locally managed tunnel, validate ingress before connecting:

```sh
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://anshman.online
cloudflared tunnel run <TUNNEL-NAME>
```

Keep the host and connector running while the site is published. Device sleep, changing networks, and process restarts can interrupt service. No uptime guarantee is made.

## Host and Tunnel checks still required

The host is Linux x86_64. `cloudflared` is not installed, and no Cloudflare tunnel credentials are present on this machine. These steps remain:

- Install a compatible `cloudflared` build for Linux x86_64.
- Create or select a Cloudflare tunnel and run its connector on this host.
- Confirming Cloudflare can reach the local `127.0.0.1:8780` origin from the connector process.
- Configure `anshman.online` and project subdomains to route to `http://127.0.0.1:8780`.
- Testing the base directory, a project detail page, app subdomains, and WebSocket behavior end-to-end through Cloudflare.

Verify `https://anshman.online` and one running app hostname from an external network. Do not open the dashboard port as a workaround.

## References

- [Cloudflare: Locally managed tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/)
- [Cloudflare: Configuration file and ingress rules](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Cloudflare: DNS records for Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/)
- [Cloudflare: Published applications](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/)
- [Cloudflare: Configuration file and wildcard ingress rules](https://developers.cloudflare.com/tunnel/features/locally-managed-tunnels/configuration-file/)
