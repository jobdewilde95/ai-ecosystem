import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const DATA_DIR = path.join(ROOT, 'data');
export const CURATED_DIR = path.join(DATA_DIR, 'curated');
export const SNAPSHOT_DIR = path.join(DATA_DIR, 'snapshots', 'latest');
export const HISTORY_DIR = path.join(DATA_DIR, 'history');
export const CHANGELOG_PATH = path.join(DATA_DIR, 'changelog.json');
