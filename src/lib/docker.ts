import { readFileSync } from 'fs';

export function isRunningInDocker(): boolean {
  try {
    // Check if we're in a Docker container by looking for Docker-specific files
    const cgroup = readFileSync('/proc/1/cgroup', 'utf8');
    return cgroup.includes('docker') || cgroup.includes('containerd');
  } catch {
    try {
      // Alternative check - look for .dockerenv file
      readFileSync('/.dockerenv');
      return true;
    } catch {
      return false;
    }
  }
}
