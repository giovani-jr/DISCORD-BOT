import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'config.json');

//LÊ AS CONFIG
export function getConfig(guildId) {
  const data = fs.readJsonSync(configPath, { throws: false }) || {};
  return data[guildId] || {};
}

//SALVA
export function setConfig(guildId, key, value) {
  const data = fs.readJsonSync(configPath, { throws: false }) || {};
  if (!data[guildId]) data[guildId] = {};
  data[guildId][key] = value;
  fs.writeJsonSync(configPath, data, { spaces: 2 });
}