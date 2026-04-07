# Blockme — No-Turn-Back Social Media Blocker

Cross-device, VPN-based social media blocker with strict mode, typed friction unlocks, emergency cap, and reliability monitoring.

## How It Works

All your devices connect to a WireGuard VPN running on your server. The VPN routes all DNS queries through Blockme's DNS server, which blocks social media domains for every app on every device — natively, everywhere.

## Requirements

- Linux server (VPS or Raspberry Pi) — always-on
- Node.js 20+
- WireGuard: `sudo apt install wireguard`
- Root access (port 53 + WireGuard management)

## Quick Start

```bash
# 1. Clone and install
git clone <repo> && cd Blockme
npm install

# 2. Set up WireGuard server interface (one time)
wg genkey | tee /etc/wireguard/server_private.key | wg pubkey > /etc/wireguard/server_public.key
cat > /etc/wireguard/wg0.conf << 'EOF'
[Interface]
Address = 10.13.13.1/24
ListenPort = 51820
PrivateKey = <paste server private key>
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT; iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT; iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
EOF
systemctl enable --now wg-quick@wg0

# 3. Enable IP forwarding
echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
sysctl -p

# 4. Build and start (port 53 requires root)
npm run build
sudo node server/dist/index.js

# Or with systemd:
cp blockme.service /etc/systemd/system/
systemctl enable --now blockme
```

## First Login

Open `http://SERVER_IP:3000` — default password: **blockme** (change immediately in Settings).

## Adding Devices

1. Go to **Devices** → Add Device → enter a name
2. Scan the QR code with the WireGuard app
3. **iOS**: Enable "On Demand" in the tunnel settings
4. **Android**: Enable "Always-on VPN" in Android Settings → Network → VPN

## No-Turn-Back Features

| Feature | Description |
|---------|-------------|
| Session Lock | No edits to schedules or blocklist while session active |
| Typed Friction | Must type an escalating phrase to unlock (10/20/40/60 min wait) |
| Per-platform unlock | Unlocking Instagram keeps YouTube blocked |
| Auto-relock | Unlocks expire in 15 minutes automatically |
| Emergency cap | 3 emergency unlocks/week, essential apps only |
| Clock tamper detection | NTP check every 15 min, re-engages blocking on tamper |
| Restart-safe | Session state persists across server restarts |
| Health monitoring | Checks DNS, VPN, block set every 5 min |

## Bypass Prevention

- Full VPN tunnel (`AllowedIPs = 0.0.0.0/0`) — no split tunnel leaks
- Both IPv4 and IPv6 blocked
- Subdomain wildcard matching
- DoH providers (Cloudflare, Google, Quad9) added to blocklist
- NTP-verified time for schedules

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | API server port |
| `DB_PATH` | `./blockme.db` | SQLite database path |
| `DNS_LISTEN_IP` | `10.13.13.1` | DNS server bind address |
| `DNS_PORT` | `53` | DNS server port |
| `JWT_SECRET` | (insecure default) | Change in production! |

## Browser Extension (Desktop bonus)

For sub-platform blocking (YouTube Shorts, etc.) that DNS can't target:

1. Go to `chrome://extensions` → Enable developer mode
2. Load unpacked → select the `extension/` folder
3. Extension auto-syncs URL rules from the Blockme server

## License

MIT
