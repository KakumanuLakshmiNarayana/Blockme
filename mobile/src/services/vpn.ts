/**
 * VPN service abstraction — bridges to native Android/iOS modules.
 * The actual WireGuard tunnel is implemented in:
 *   Android: android/app/src/main/java/com/blockme/vpn/BlockmeVpnModule.kt
 *   iOS:     ios/BlockmeTunnel/PacketTunnelProvider.swift
 */
import {NativeModules, NativeEventEmitter, Platform} from 'react-native';

const {BlockmeVpn} = NativeModules;
const vpnEmitter = BlockmeVpn ? new NativeEventEmitter(BlockmeVpn) : null;

export type VpnStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface VpnConfig {
  privateKey: string;
  address: string;   // e.g. "10.13.13.5/32"
  dns: string;       // e.g. "10.13.13.1"
  serverPublicKey: string;
  serverEndpoint: string; // "SERVER_IP:51820"
}

export async function connectVpn(config: VpnConfig): Promise<void> {
  if (!BlockmeVpn) {
    console.warn('[vpn] Native module not available (running in simulator/web)');
    return;
  }
  return BlockmeVpn.connect(config);
}

export async function disconnectVpn(): Promise<void> {
  if (!BlockmeVpn) return;
  return BlockmeVpn.disconnect();
}

export async function getVpnStatus(): Promise<VpnStatus> {
  if (!BlockmeVpn) return 'disconnected';
  return BlockmeVpn.getStatus();
}

export function onVpnStatusChange(
  callback: (status: VpnStatus) => void,
): () => void {
  if (!vpnEmitter) return () => {};
  const sub = vpnEmitter.addListener('VpnStatusChanged', e =>
    callback(e.status as VpnStatus),
  );
  return () => sub.remove();
}

/** Parse a WireGuard .conf string into a VpnConfig object */
export function parseWgConfig(confText: string): VpnConfig {
  const get = (key: string) => {
    const match = confText.match(new RegExp(`${key}\\s*=\\s*(.+)`));
    return match ? match[1].trim() : '';
  };
  return {
    privateKey: get('PrivateKey'),
    address: get('Address'),
    dns: get('DNS'),
    serverPublicKey: get('PublicKey'),
    serverEndpoint: get('Endpoint'),
  };
}
