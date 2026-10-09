# Future public subdomains with Cloudflare Tunnel

This guide is for a later setup after AnshumanHost works locally. It does not create DNS records or a tunnel automatically. Keep the dashboard private.

## Current local route

AnshumanHost has two listeners:

- Dashboard/API: `127.0.0.1:3000` (private control plane)
- Application reverse proxy: `127.0.0.1:8780` (registered application hostnames only)

First deploy an app and verify it locally:

```sh
curl -H 'Host: chat.anshuman.online' http://127.0.0.1:8780/
```

Do not point a public route at port 3000. The dashboard has no login system in this prototype.

## Cloudflare-side setup

1. Add `anshuman.online` to a Cloudflare account and complete any registrar nameserver changes manually. The platform never edits DNS or nameservers.
2. In Cloudflare Zero Trust, create a Cloudflare Tunnel. Cloudflare currently recommends remotely managed tunnels for most users; locally managed tunnels remain available for local-development and legacy configurations.
3. Add a published application route for each app hostname, such as `chat.anshuman.online`, with the local service set to `http://127.0.0.1:8780`.
4. Add a route only after the matching hostname exists in AnshumanHost and the application is running. Multiple app hostnames can target the same local reverse proxy; its `Host` routing chooses the project.
5. Keep `127.0.0.1:3000` out of tunnel ingress rules.

Cloudflare documents locally managed ingress rules as hostname-to-service mappings and requires a final catch-all rule. An illustrative config for a locally managed tunnel is:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /path/to/<TUNNEL-UUID>.json

ingress:
  - hostname: chat.anshuman.online
    service: http://127.0.0.1:8780
  - hostname: billweb.anshuman.online
    service: http://127.0.0.1:8780
  - hostname: store.anshuman.online
    service: http://127.0.0.1:8780
  - service: http_status:404
```

For remotely managed tunnels, configure the same public-hostname-to-service mappings in the Cloudflare dashboard instead of using this local YAML. Cloudflare DNS records can be created from the dashboard or by `cloudflared tunnel route dns`; creating a DNS record does not start the tunnel.

## Verify the connector configuration

For a locally managed tunnel, validate ingress before connecting:

```sh
cloudflared tunnel ingress validate
cloudflared tunnel ingress rule https://chat.anshuman.online
cloudflared tunnel run <TUNNEL-NAME>
```

Keep the Termux session alive while the connector runs. Android background process limits, device sleep, changing mobile networks, and Termux package availability can interrupt service. No uptime guarantee is made.

## Android/Termux checks still required

The Cloudflare route model and commands above follow Cloudflare's current docs, but these steps have not been verified on Android in this workspace:

- Installing a compatible `cloudflared` build for the device's CPU architecture and Android/Termux environment.
- Keeping `cloudflared` and Node alive when Termux is backgrounded or Android enters doze.
- Confirming Cloudflare can reach the local `127.0.0.1:8780` origin from the connector process.
- Checking current certificate, account, hostname, and wildcard DNS settings for `anshuman.online`.
- Testing WebSocket behavior end-to-end through Cloudflare.

Test from Termux with the tunnel foregrounded and verify one app hostname from an external network. Do not open the dashboard port as a workaround.

## References

- [Cloudflare: Locally managed tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/)
- [Cloudflare: Configuration file and ingress rules](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/)
- [Cloudflare: DNS records for Tunnel](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/dns/)
- [Cloudflare: Published applications](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/routing-to-tunnel/)
