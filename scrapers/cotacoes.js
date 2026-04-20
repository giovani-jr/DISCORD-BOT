import axios from 'axios';

// ─────────────────────────────────────────────────────────
// Cotações via AwesomeAPI (gratuita, sem chave necessária)
// + SELIC/IPCA via API pública do Banco Central do Brasil
// ─────────────────────────────────────────────────────────

// Todas as moedas que queremos buscar numa única chamada
const MOEDAS_FIAT = 'USD-BRL,EUR-BRL,GBP-BRL,ARS-BRL,JPY-BRL,CNY-BRL,RUB-BRL,CAD-BRL,AUD-BRL,CHF-BRL';
const MOEDAS_CRIPTO = 'BTC-BRL,ETH-BRL,BTC-USD,ETH-USD,SOL-BRL,BNB-BRL';
const OUTROS = 'XAU-BRL,XAG-BRL,IBOVESPA';

export async function buscarCotacoes() {
  const [fiat, cripto, outros, selic] = await Promise.allSettled([
    axios.get(`https://economia.awesomeapi.com.br/json/last/${MOEDAS_FIAT}`, { timeout: 10000 }),
    axios.get(`https://economia.awesomeapi.com.br/json/last/${MOEDAS_CRIPTO}`, { timeout: 10000 }),
    axios.get(`https://economia.awesomeapi.com.br/json/last/${OUTROS}`, { timeout: 10000 }),
    // API pública do Banco Central — Taxa SELIC meta atual
    axios.get(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json',
      { timeout: 10000 },
    ),
  ]);

  return {
    fiat: fiat.status === 'fulfilled' ? fiat.value.data : null,
    cripto: cripto.status === 'fulfilled' ? cripto.value.data : null,
    outros: outros.status === 'fulfilled' ? outros.value.data : null,
    selic: selic.status === 'fulfilled' ? selic.value.data?.[0] : null,
    hora: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: new Date().toLocaleDateString('pt-BR'),
  };
}

// ── Helpers de formatação ──
export function fmt(valor, decimais = 2) {
  const n = parseFloat(valor);
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  });
}

export function fmtBRL(valor) {
  const n = parseFloat(valor);
  if (isNaN(n)) return '—';
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function fmtUSD(valor) {
  const n = parseFloat(valor);
  if (isNaN(n)) return '—';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

export function fmtVar(pct) {
  const n = parseFloat(pct);
  if (isNaN(n)) return '';
  const icon = n >= 0 ? '▲' : '▼';
  const sinal = n >= 0 ? '+' : '';
  return `${icon} ${sinal}${fmt(n)}%`;
}

// Monta a linha de uma moeda
function linha(dados, chave, nome, icone, formatador = fmtBRL) {
  const d = dados?.[chave];
  if (!d) return null;
  const valor = formatador(d.bid);
  const var_ = fmtVar(d.pctChange);
  return `${icone} **${nome}:** ${valor} ${var_}`;
}