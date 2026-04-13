// @ts-ignore - dns2 has no type definitions
import dns2 from 'dns2';
import { recordBlock, getActiveSession, getSetting } from './db/queries';
import { isDomainBlocked, getBlockSet } from './blocklist';
import { isScheduleCurrentlyBlocking } from './scheduler';
import { isTamperDetected } from './time-guard';

const { Packet, createServer, UDPClient } = dns2;

let server: ReturnType<typeof createServer> | null = null;

export async function startDnsServer(): Promise<void> {
  if (server) return;

  server = createServer({
    udp: true,
    handle: async (request: any, send: any) => {
      const response = Packet.createResponseFromRequest(request);
      const [question] = request.questions;
      if (!question) { send(response); return; }

      const { name, type } = question;

      // Block only when:
      //   1. An active locked session exists (user started a blocking session), OR
      //   2. A schedule is currently active, OR
      //   3. Tamper-detection forced re-lock (blocking_enabled override)
      const session = getActiveSession();
      const sessionBlocking = !!session && session.locked === 1 && session.state === 'active';
      const scheduleBlocking = isScheduleCurrentlyBlocking();
      const tamperForced = isTamperDetected();

      if ((sessionBlocking || scheduleBlocking || tamperForced) && isDomainBlocked(name, getBlockSet())) {
        // Non-blocking stat record
        setImmediate(() => {
          try { recordBlock(name.toLowerCase().replace(/\.$/, '')); } catch {}
        });

        // Block both A (IPv4) and AAAA (IPv6) with null addresses
        if (type === Packet.TYPE.A) {
          response.answers.push({
            name, type: Packet.TYPE.A, class: Packet.CLASS.IN,
            ttl: 60, address: '0.0.0.0',
          });
        } else if (type === Packet.TYPE.AAAA) {
          response.answers.push({
            name, type: Packet.TYPE.AAAA, class: Packet.CLASS.IN,
            ttl: 60, address: '::',
          });
        } else {
          response.header.rcode = 3; // NXDOMAIN for other record types
        }

        send(response);
        return;
      }

      // Forward to upstream
      try {
        const upstreamDns = getSetting('upstream_dns') || '8.8.8.8';
        const resolve = UDPClient({ dns: upstreamDns });
        const upstream = await resolve(name, type === 28 ? 'AAAA' : 'A');
        response.answers = upstream.answers || [];
        response.authorities = upstream.authorities || [];
        response.additionals = upstream.additionals || [];
      } catch {
        response.header.rcode = 2; // SERVFAIL
      }
      send(response);
    },
  });

  const listenIp = process.env.DNS_LISTEN_IP || '10.13.13.1';
  const listenPort = parseInt(process.env.DNS_PORT || '53');

  await new Promise<void>((resolve, reject) => {
    server!.listen({ udp: { port: listenPort, address: listenIp } });
    server!.on('listening', resolve);
    server!.on('error', reject);
  });

  console.log(`[dns] Listening on ${listenIp}:${listenPort}`);
}

export function isDnsRunning(): boolean {
  return server !== null;
}
