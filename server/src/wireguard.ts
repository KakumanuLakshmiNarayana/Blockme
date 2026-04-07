import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const WG_CONF = process.env.WG_CONF || '/etc/wireguard/wg0.conf';
const VPN_SUBNET = '10.13.13';
const SERVER_VPN_IP = `${VPN_SUBNET}.1`;

export function generateKeypair(): { privateKey: string; publicKey: string } {
  const privateKey = execSync('wg genkey').toString().trim();
  const publicKey = execSync(`echo '${privateKey}' | wg pubkey`).toString().trim();
  return { privateKey, publicKey };
}

export function getServerPublicKey(): string {
  const privKey = require('./db/queries').getSetting('wg_server_private_key') as string;
  if (!privKey) return '';
  return execSync(`echo '${privKey}' | wg pubkey`).toString().trim();
}

export function addPeer(publicKey: string, vpnIp: string): void {
  try {
    execSync(`wg set wg0 peer ${publicKey} allowed-ips ${vpnIp}/32`);
    // Persist to config file
    appendPeerToConfig(publicKey, vpnIp);
  } catch (err) {
    console.error('[wireguard] Failed to add peer:', err);
    throw new Error('Failed to add WireGuard peer. Is wg0 interface up?');
  }
}

export function removePeer(publicKey: string): void {
  try {
    execSync(`wg set wg0 peer ${publicKey} remove`);
    removePeerFromConfig(publicKey);
  } catch (err) {
    console.error('[wireguard] Failed to remove peer:', err);
  }
}

export function generateClientConfig(
  deviceName: string,
  devicePrivateKey: string,
  vpnIp: string,
  serverPublicKey: string,
  serverIp: string,
): string {
  return `# Blockme — ${deviceName}
[Interface]
PrivateKey = ${devicePrivateKey}
Address = ${vpnIp}/32
DNS = ${SERVER_VPN_IP}

[Peer]
PublicKey = ${serverPublicKey}
Endpoint = ${serverIp}:51820
AllowedIPs = 0.0.0.0/0, ::/0
PersistentKeepalive = 25
`;
}

function appendPeerToConfig(publicKey: string, vpnIp: string): void {
  if (!fs.existsSync(path.dirname(WG_CONF))) return;
  const entry = `\n[Peer]\nPublicKey = ${publicKey}\nAllowedIPs = ${vpnIp}/32\n`;
  fs.appendFileSync(WG_CONF, entry);
}

function removePeerFromConfig(publicKey: string): void {
  if (!fs.existsSync(WG_CONF)) return;
  const content = fs.readFileSync(WG_CONF, 'utf-8');
  const peerRegex = new RegExp(
    `\\n\\[Peer\\]\\nPublicKey = ${publicKey.replace(/[+/]/g, '\\$&')}\\nAllowedIPs = [^\\n]+\\n`,
    'g'
  );
  fs.writeFileSync(WG_CONF, content.replace(peerRegex, ''));
}

export function isWireGuardUp(): boolean {
  try {
    execSync('wg show wg0', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
