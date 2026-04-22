import axios from 'axios';

// ── Fontes por região ──
// Usamos Google News RSS + fontes diretas que não bloqueiam
export const FONTES = {
  brasil: [
    {
      nome: 'Agência Brasil',
      url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml',
      emoji: '🇧🇷',
      regiao: 'brasil',
    },
    {
      nome: 'R7 Notícias',
      url: 'https://noticias.r7.com/feed.xml',
      emoji: '📺',
      regiao: 'brasil',
    },
    {
      nome: 'G1 - Google News BR',
      url: 'https://news.google.com/rss/search?q=brasil+noticias&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      emoji: '📰',
      regiao: 'brasil',
    },
    {
      nome: 'Tecnologia BR',
      url: 'https://news.google.com/rss/search?q=tecnologia+brasil&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      emoji: '💻',
      regiao: 'brasil',
    },
  ],
  usa: [
    {
      nome: 'BBC News',
      url: 'https://news.google.com/rss/search?q=breaking+news&hl=en-US&gl=US&ceid=US:en',
      emoji: '🇺🇸',
      regiao: 'usa',
    },
    {
      nome: 'Tech US',
      url: 'https://news.google.com/rss/search?q=technology+AI&hl=en-US&gl=US&ceid=US:en',
      emoji: '🔬',
      regiao: 'usa',
    },
  ],
  europa: [
    {
      nome: 'Europa Notícias',
      url: 'https://news.google.com/rss/search?q=europe+news&hl=pt-BR&gl=BR&ceid=BR:pt-419',
      emoji: '🇪🇺',
      regiao: 'europa',
    },
  ],
};

// Parser RSS robusto
function parseRSS(xml) {
  const items = [];
  const itemRegex = /<item[\s\S]*?<\/item>/g;
  const matches = xml.match(itemRegex) || [];

  for (const item of matches.slice(0, 6)) {
    const title = (
      item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || []
    )[1];
    const link = (
      item.match(/<link>([\s\S]*?)<\/link>/) ||
      item.match(/<link\s+href="([^"]+)"/) || []
    )[1];
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1];
    const description = (
      item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || []
    )[1];

    if (title && link) {
      const tituloLimpo = title
        .trim()
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/<[^>]+>/g, '');

      const descLimpa = description
        ? description
            // Decodifica entidades antes de remover tags (Google News usa &lt;a href=...&gt;)
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'")
            .replace(/&#\d+;/g, '')
            // Remove todas as tags HTML (agora decodificadas)
            .replace(/<[^>]+>/g, '')
            // Remove espaços e quebras extras
            .replace(/&nbsp;/g, ' ')
            .replace(/\s{2,}/g, ' ')
            .trim()
            .slice(0, 200)
        : '';

      let dataFormatada = 'Hoje';
      if (pubDate) {
        try {
          dataFormatada = new Date(pubDate).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch {}
      }

      items.push({
        titulo: tituloLimpo,
        link: link.trim(),
        data: dataFormatada,
        descricao: descLimpa,
        timestamp: pubDate ? new Date(pubDate).getTime() : Date.now(),
      });
    }
  }

  // Ordena do mais recente para o mais antigo
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

// Busca notícias de uma lista de fontes
export async function buscarNoticias(regioes = ['brasil']) {
  const todas = [];

  const fontesParaBuscar = regioes.flatMap((r) => FONTES[r] || []);

  for (const fonte of fontesParaBuscar) {
    try {
      const res = await axios.get(fonte.url, {
        timeout: 10000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
      });

      const items = parseRSS(res.data);
      for (const item of items.slice(0, 3)) {
        todas.push({
          ...item,
          fonte: fonte.nome,
          emoji: fonte.emoji,
          regiao: fonte.regiao,
        });
      }
    } catch (err) {
      console.error(`[noticias] Erro em ${fonte.nome}: ${err.message}`);
    }
  }

  return todas;
}

// Verifica se uma notícia já existe no canal pelo link (evita duplicatas ao reiniciar)
export async function noticiasNoCanvas(canal, limit = 50) {
  try {
    const msgs = await canal.messages.fetch({ limit });
    const links = new Set();
    for (const msg of msgs.values()) {
      for (const embed of msg.embeds) {
        if (embed.url) links.add(embed.url);
      }
    }
    return links;
  } catch {
    return new Set();
  }
}