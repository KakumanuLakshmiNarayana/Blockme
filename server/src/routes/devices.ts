import { Router, Request, Response } from 'express';
import QRCode from 'qrcode';
import { requireAuth } from './auth';
import { getDevices, getDevice, addDevice, removeDevice, getNextVpnIp } from '../db/queries';
import { generateKeypair, addPeer, removePeer, generateClientConfig, getServerPublicKey } from '../wireguard';
import { getSetting } from '../db/queries';

export const devicesRouter = Router();

devicesRouter.get('/', requireAuth, (req: Request, res: Response) => {
  res.json(getDevices());
});

devicesRouter.post('/', requireAuth, async (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name?.trim()) { res.status(400).json({ error: 'Device name required' }); return; }

  const { privateKey, publicKey } = generateKeypair();
  const vpnIp = getNextVpnIp();
  const serverPublicKey = getSetting('wg_server_public_key') || getServerPublicKey();
  const serverIp = getSetting('server_ip') || 'YOUR_SERVER_IP';

  const config = generateClientConfig(name.trim(), privateKey, vpnIp, serverPublicKey, serverIp);

  try {
    addPeer(publicKey, vpnIp);
  } catch (err) {
    // WireGuard may not be running in dev — still save device
    console.warn('[devices] WireGuard peer add failed (may be dev mode):', (err as Error).message);
  }

  const device = addDevice(name.trim(), publicKey, vpnIp);
  const qr = await QRCode.toDataURL(config);

  res.status(201).json({ device, config, qr });
});

devicesRouter.get('/:id/config', requireAuth, (req: Request, res: Response) => {
  const device = getDevice(parseInt(req.params.id));
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }

  // Config stored at creation time; regenerate with current server settings
  res.set('Content-Disposition', `attachment; filename="${device.name.replace(/\s+/g, '_')}.conf"`);
  res.set('Content-Type', 'text/plain');
  res.send(`# Blockme — ${device.name}\n# Re-add this device to get the private key config\n# Public key: ${device.public_key}\n`);
});

devicesRouter.delete('/:id', requireAuth, (req: Request, res: Response) => {
  const device = getDevice(parseInt(req.params.id));
  if (!device) { res.status(404).json({ error: 'Device not found' }); return; }

  try { removePeer(device.public_key); } catch {}
  removeDevice(device.id);
  res.json({ ok: true });
});
