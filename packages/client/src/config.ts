import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ClientConfig } from './types';

const CONFIG_DIR = path.join(os.homedir(), '.agent-ops');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG: ClientConfig = {
  gatewayUrl: process.env.AGENT_OPS_GATEWAY_URL || 'http://localhost:3001',
};

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): ClientConfig {
  ensureConfigDir();

  if (!fs.existsSync(CONFIG_FILE)) {
    return { ...DEFAULT_CONFIG };
  }

  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const saved = JSON.parse(content);
    return { ...DEFAULT_CONFIG, ...saved };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: Partial<ClientConfig>): void {
  ensureConfigDir();

  const current = loadConfig();
  const updated = { ...current, ...config };

  fs.writeFileSync(CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
