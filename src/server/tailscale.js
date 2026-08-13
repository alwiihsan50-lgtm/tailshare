import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function getTailscaleInfo() {
  const info = {
    connected: false,
    ip: null,
    ipv6: null,
    hostname: os.hostname(),
    dnsName: null,
    tailnet: null,
    user: null,
    peers: [],
    localIPs: []
  };

  // Get local network IPs as fallback
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (!iface.internal && iface.family === 'IPv4') {
        info.localIPs.push({ iface: name, ip: iface.address });
      }
    }
  }

  try {
    const { stdout } = await execAsync('tailscale status --json');
    const data = JSON.parse(stdout);

    if (data.BackendState === 'Running' && data.Self) {
      info.connected = true;
      info.ip = data.Self.TailscaleIPs && data.Self.TailscaleIPs[0] ? data.Self.TailscaleIPs[0] : null;
      info.ipv6 = data.Self.TailscaleIPs && data.Self.TailscaleIPs[1] ? data.Self.TailscaleIPs[1] : null;
      info.hostname = data.Self.HostName || os.hostname();
      info.dnsName = data.Self.DNSName ? data.Self.DNSName.replace(/\.$/, '') : null;
      info.tailnet = data.CurrentTailnet?.Name || null;
      
      if (data.User && data.Self.UserID && data.User[data.Self.UserID]) {
        const u = data.User[data.Self.UserID];
        info.user = {
          name: u.DisplayName,
          login: u.LoginName,
          pic: u.ProfilePicURL
        };
      }

      if (data.Peer) {
        info.peers = Object.values(data.Peer).map(peer => {
          const isOnline = !!peer.Online;
          const isActive = !!peer.Active;
          const peerName = peer.HostName || peer.DNSName?.split('.')[0] || 'Unknown Device';
          const ip = peer.TailscaleIPs?.[0] || 'Unknown IP';
          const peerOS = peer.OS || 'unknown';

          return {
            id: peer.ID,
            name: peerName,
            dnsName: peer.DNSName ? peer.DNSName.replace(/\.$/, '') : null,
            ip,
            os: peerOS,
            online: isOnline,
            active: isActive,
            lastSeen: peer.LastSeen,
            taildropTarget: peer.TaildropTarget
          };
        }).sort((a, b) => (b.online ? 1 : 0) - (a.online ? 1 : 0));
      }
    }
  } catch (err) {
    // Fallback: try `tailscale ip -4`
    try {
      const { stdout } = await execAsync('tailscale ip -4');
      const ip = stdout.trim();
      if (ip && ip.startsWith('100.')) {
        info.connected = true;
        info.ip = ip;
      }
    } catch {
      // If Tailscale is not running, fallback to first non-internal IPv4
      if (info.localIPs.length > 0) {
        info.ip = info.localIPs[0].ip;
      }
    }
  }

  // If still no IP, use localhost
  if (!info.ip) {
    info.ip = '127.0.0.1';
  }

  return info;
}
