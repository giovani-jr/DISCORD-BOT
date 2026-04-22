import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ticketsPath = path.join(__dirname, '../data/tickets.json');

// Garante que o arquivo existe
function lerDados() {
  return fs.readJsonSync(ticketsPath, { throws: false }) || {};
}

function salvarDados(data) {
  fs.writeJsonSync(ticketsPath, data, { spaces: 2 });
}

// ── Retorna todos os dados de um guild ──
export function getTicketData(guildId) {
  const data = lerDados();
  if (!data[guildId]) {
    data[guildId] = { contador: 0, tickets: {} };
    salvarDados(data);
  }
  return data[guildId];
}

// ── Gera próximo ID incremental ──
export function gerarTicketId(guildId) {
  const data = lerDados();
  if (!data[guildId]) data[guildId] = { contador: 0, tickets: {} };

  data[guildId].contador += 1;
  const id = `TICKET-${String(data[guildId].contador).padStart(3, '0')}`;
  salvarDados(data);
  return id;
}

// ── Salva um ticket novo ──
export function criarTicket(guildId, ticketId, info) {
  const data = lerDados();
  if (!data[guildId]) data[guildId] = { contador: 0, tickets: {} };
  data[guildId].tickets[ticketId] = {
    id: ticketId,
    ...info,
    status: 'aguardando', // aguardando | ativo | fechado
    aberturaEm: new Date().toISOString(),
    staffId: null,
    canalId: null,
    fechadoEm: null,
  };
  salvarDados(data);
}

// ── Atualiza campos de um ticket ──
export function atualizarTicket(guildId, ticketId, campos) {
  const data = lerDados();
  if (!data[guildId]?.tickets?.[ticketId]) return;
  Object.assign(data[guildId].tickets[ticketId], campos);
  salvarDados(data);
}

// ── Retorna um ticket específico ──
export function getTicket(guildId, ticketId) {
  const data = lerDados();
  return data[guildId]?.tickets?.[ticketId] || null;
}

// ── Verifica se o membro já tem ticket ativo ──
export function membroTemTicketAtivo(guildId, autorId) {
  const data = lerDados();
  const tickets = data[guildId]?.tickets || {};
  return Object.values(tickets).find(
    (t) => t.autorId === autorId && (t.status === 'aguardando' || t.status === 'ativo'),
  ) || null;
}

// ── Busca ticket pelo canal ──
export function getTicketPorCanal(guildId, canalId) {
  const data = lerDados();
  const tickets = data[guildId]?.tickets || {};
  return Object.values(tickets).find((t) => t.canalId === canalId) || null;
}