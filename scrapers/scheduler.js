import { EmbedBuilder } from 'discord.js';
import { getConfig } from '../config/configManager.js';
import { buscarNoticias, noticiasNoCanvas } from '../scrapers/noticias.js';
import { buscarCotacoes, fmtBRL, fmtUSD, fmtVar, fmt } from '../scrapers/cotacoes.js';

// ── Intervalos ──
const T_NOTICIAS  = 30 * 60 * 1000;  // 30 minutos
const T_COTACOES  = 15 * 60 * 1000;  // 15 minutos

// ═══════════════════════════════════════════════
// EMBED BUILDERS  (exportados para ativar.js)
// ═══════════════════════════════════════════════

export function criarEmbedNoticia(noticia) {
  return new EmbedBuilder()
    .setTitle(`${noticia.emoji} ${noticia.titulo}`.slice(0, 256))
    .setURL(noticia.link)
    .setDescription(noticia.descricao || null)
    .addFields(
      { name: '📅 Data',  value: noticia.data,  inline: true },
      { name: '📡 Fonte', value: noticia.fonte, inline: true },
    )
    .setColor(0x3498db)
    .setTimestamp();
}

export function criarEmbedPromocao(promo) {
  const embed = new EmbedBuilder()
    .setTitle(`${promo.emoji} ${promo.nome}`.slice(0, 256))
    .setURL(promo.link)
    .setColor(0xe74c3c)
    .addFields(
      { name: '💸 Preço Atual', value: promo.precoAtual,    inline: true },
      { name: '🏷️ Original',   value: promo.precoOriginal, inline: true },
      { name: '🔥 Desconto',   value: promo.desconto,      inline: true },
      { name: '🏪 Loja',       value: promo.loja,          inline: true },
      { name: '📦 Categoria',  value: promo.categoria,     inline: true },
    )
    .setTimestamp();
  if (promo.thumbnail) embed.setThumbnail(promo.thumbnail);
  return embed;
}

export function criarEmbedCotacoes(dados) {
  const embed = new EmbedBuilder()
    .setTitle('💹 Cotações em Tempo Real')
    .setColor(0xf39c12)
    .setFooter({ text: `🕐 Atualizado às ${dados.hora} de ${dados.data} • Fonte: AwesomeAPI + BCB` })
    .setTimestamp();

  // ── Moedas Principais ──
  const { fiat } = dados;
  if (fiat) {
    const linhas = [
      fiat.USDBRL  && `🇺🇸 **Dólar (USD):** ${fmtBRL(fiat.USDBRL.bid)} ${fmtVar(fiat.USDBRL.pctChange)}`,
      fiat.EURBRL  && `🇪🇺 **Euro (EUR):** ${fmtBRL(fiat.EURBRL.bid)} ${fmtVar(fiat.EURBRL.pctChange)}`,
      fiat.GBPBRL  && `🇬🇧 **Libra (GBP):** ${fmtBRL(fiat.GBPBRL.bid)} ${fmtVar(fiat.GBPBRL.pctChange)}`,
      fiat.CADBRL  && `🇨🇦 **Dólar CAD:** ${fmtBRL(fiat.CADBRL.bid)} ${fmtVar(fiat.CADBRL.pctChange)}`,
      fiat.AUDBRL  && `🇦🇺 **Dólar AUD:** ${fmtBRL(fiat.AUDBRL.bid)} ${fmtVar(fiat.AUDBRL.pctChange)}`,
      fiat.CHFBRL  && `🇨🇭 **Franco Suíço:** ${fmtBRL(fiat.CHFBRL.bid)} ${fmtVar(fiat.CHFBRL.pctChange)}`,
    ].filter(Boolean);
    if (linhas.length) embed.addFields({ name: '💵 Moedas Principais', value: linhas.join('\n') });
  }

  // ── Moedas de Rua / Exóticas ──
  if (fiat) {
    const linhas = [
      fiat.ARSBRL  && `🇦🇷 **Peso ARS:** ${fmtBRL(fiat.ARSBRL.bid)} ${fmtVar(fiat.ARSBRL.pctChange)}`,
      fiat.JPYBRL  && `🇯🇵 **Iene (JPY):** R$ ${fmt(parseFloat(fiat.JPYBRL.bid), 4)} ${fmtVar(fiat.JPYBRL.pctChange)}`,
      fiat.CNYBRL  && `🇨🇳 **Yuan (CNY):** ${fmtBRL(fiat.CNYBRL.bid)} ${fmtVar(fiat.CNYBRL.pctChange)}`,
      fiat.RUBBBRL && `🇷🇺 **Rublo (RUB):** R$ ${fmt(parseFloat(fiat.RUBBRL?.bid ?? 0), 4)} ${fmtVar(fiat.RUBBRL?.pctChange)}`,
    ].filter(Boolean);
    if (linhas.length) embed.addFields({ name: '🌍 Moedas Exóticas', value: linhas.join('\n') });
  }

  // ── Criptomoedas ──
  const { cripto } = dados;
  if (cripto) {
    const linhas = [
      cripto.BTCBRL && `₿ **Bitcoin (BTC):** ${fmtBRL(cripto.BTCBRL.bid)} / ${fmtUSD(cripto.BTCUSD?.bid)} ${fmtVar(cripto.BTCBRL.pctChange)}`,
      cripto.ETHBRL && `Ξ **Ethereum (ETH):** ${fmtBRL(cripto.ETHBRL.bid)} / ${fmtUSD(cripto.ETHUSD?.bid)} ${fmtVar(cripto.ETHBRL.pctChange)}`,
      cripto.SOLBRL && `◎ **Solana (SOL):** ${fmtBRL(cripto.SOLBRL.bid)} ${fmtVar(cripto.SOLBRL.pctChange)}`,
      cripto.BNBBRL && `🔶 **BNB:** ${fmtBRL(cripto.BNBBRL.bid)} ${fmtVar(cripto.BNBBRL.pctChange)}`,
    ].filter(Boolean);
    if (linhas.length) embed.addFields({ name: '🪙 Criptomoedas', value: linhas.join('\n') });
  }

  // ── Commodities & Bolsa ──
  const { outros } = dados;
  if (outros) {
    const linhas = [
      outros.XAUBRL     && `🥇 **Ouro (XAU):** ${fmtBRL(outros.XAUBRL.bid)}/oz ${fmtVar(outros.XAUBRL.pctChange)}`,
      outros.XAGBRL     && `🥈 **Prata (XAG):** ${fmtBRL(outros.XAGBRL.bid)}/oz ${fmtVar(outros.XAGBRL.pctChange)}`,
      outros.IBOVESPA   && `📈 **Ibovespa:** ${parseFloat(outros.IBOVESPA.bid).toLocaleString('pt-BR')} pts ${fmtVar(outros.IBOVESPA.pctChange)}`,
    ].filter(Boolean);
    if (linhas.length) embed.addFields({ name: '📊 Bolsa & Commodities', value: linhas.join('\n') });
  }

  // ── Indicadores BR ──
  if (dados.selic) {
    embed.addFields({
      name: '🏦 Indicadores Banco Central',
      value: `📌 **Taxa SELIC Meta:** ${dados.selic.valor}% a.a.\n> Fonte: Banco Central do Brasil`,
    });
  }

  return embed;
}

// ═══════════════════════════════════════════════
// FUNÇÕES DE ENVIO
// ═══════════════════════════════════════════════

async function enviarNoticias(client) {
  for (const [guildId, guild] of client.guilds.cache) {
    const config = getConfig(guildId);
    if (!config.scraper_noticias) continue;

    const canal = guild.channels.cache.get(config.scraper_noticias);
    if (!canal) continue;

    // Resolve a região configurada (padrão: brasil)
    const regioes = config.scraper_noticias_regioes || ['brasil'];

    // ★ Verificação anti-duplicata: busca links já no canal
    const linksExistentes = await noticiasNoCanvas(canal, 100);

    const noticias = await buscarNoticias(regioes);

    for (const noticia of noticias) {
      if (linksExistentes.has(noticia.link)) continue; // já está no canal

      try {
        await canal.send({ embeds: [criarEmbedNoticia(noticia)] });
        linksExistentes.add(noticia.link); // evita duplicar na mesma rodada
        await new Promise((r) => setTimeout(r, 800)); // throttle
      } catch (err) {
        console.error(`[scheduler] Notícia [${guildId}]: ${err.message}`);
      }
    }
  }
}

async function enviarPromocoes(client) {
  const promocoes = await buscarPromocoes();
  if (!promocoes.length) return;

  for (const [guildId, guild] of client.guilds.cache) {
    const config = getConfig(guildId);
    if (!config.scraper_promocoes) continue;

    const canal = guild.channels.cache.get(config.scraper_promocoes);
    if (!canal) continue;

    if (!cachePromos.has(guildId)) cachePromos.set(guildId, new Set());
    const enviados = cachePromos.get(guildId);

    for (const promo of promocoes) {
      if (enviados.has(promo.id)) continue;
      try {
        await canal.send({ embeds: [criarEmbedPromocao(promo)] });
        enviados.add(promo.id);
        await new Promise((r) => setTimeout(r, 800));
      } catch (err) {
        console.error(`[scheduler] Promoção [${guildId}]: ${err.message}`);
      }
    }
  }
}

async function enviarCotacoes(client) {
  const dados = await buscarCotacoes();
  if (!dados) return;

  const embed = criarEmbedCotacoes(dados);

  for (const [guildId, guild] of client.guilds.cache) {
    const config = getConfig(guildId);
    if (!config.scraper_cotacoes) continue;

    const canal = guild.channels.cache.get(config.scraper_cotacoes);
    if (!canal) continue;

    try {
      // Edita a última mensagem do bot em vez de postar nova (canal limpo)
      const msgs = await canal.messages.fetch({ limit: 10 });
      const ultima = msgs.find((m) => m.author.id === client.user.id && m.embeds.length > 0);

      if (ultima) {
        await ultima.edit({ embeds: [embed] });
      } else {
        await canal.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error(`[scheduler] Cotações [${guildId}]: ${err.message}`);
    }
  }
}

// ═══════════════════════════════════════════════
// INICIALIZAÇÃO
// ═══════════════════════════════════════════════

export function iniciarScrapers(client) {
  console.log('🔍 Scrapers iniciados.');

  // Primeira rodada: aguarda 30s para o bot estar estabilizado
  setTimeout(async () => {
    console.log('📰 Buscando notícias...');
    await enviarNoticias(client);

    console.log('💹 Buscando cotações...');
    await enviarCotacoes(client);

    console.log('✅ Primeira rodada de scrapers concluída.');
  }, 30_000);

  // Ciclos recorrentes
  setInterval(() => enviarNoticias(client),  T_NOTICIAS);
  setInterval(() => enviarCotacoes(client),  T_COTACOES);

  // Limpa cache de promoções todo dia para não acumular
  setInterval(() => {
    cachePromos.clear();
    console.log('🧹 Cache de promoções limpo.');
  }, 24 * 60 * 60 * 1000);
}