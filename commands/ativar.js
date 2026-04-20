import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
  OverwriteType,
} from 'discord.js';
import { setConfig, getConfig } from '../config/configManager.js';
import { buscarNoticias } from '../scrapers/noticias.js';
import { buscarCotacoes } from '../scrapers/cotacoes.js';
import {
  criarEmbedNoticia,
  criarEmbedPromocao,
  criarEmbedCotacoes,
} from '../scrapers/scheduler.js';

const CATEGORIA_NOME = '📡 SCRAPING';

async function obterCategoria(guild) {
  let cat = guild.channels.cache.find(
    (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORIA_NOME,
  );
  if (!cat) {
    cat = await guild.channels.create({ name: CATEGORIA_NOME, type: ChannelType.GuildCategory });
  }
  return cat;
}

async function criarCanalSomenteLeitura(guild, nome, categoria) {
  return guild.channels.create({
    name: nome,
    type: ChannelType.GuildText,
    parent: categoria.id,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: ['SendMessages', 'AddReactions', 'CreatePublicThreads', 'CreatePrivateThreads'],
        allow: ['ViewChannel', 'ReadMessageHistory'],
        type: OverwriteType.Role,
      },
    ],
  });
}

export const data = new SlashCommandBuilder()
  .setName('ativar')
  .setDescription('Ativa um módulo de scraping criando o canal automaticamente')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((g) =>
    g
      .setName('scraping')
      .setDescription('Módulos disponíveis')
      .addSubcommand((s) =>
        s
          .setName('noticias')
          .setDescription('Canal de notícias automáticas (30min)')
          .addStringOption((o) =>
            o
              .setName('regiao')
              .setDescription('Região das notícias')
              .setRequired(false)
              .addChoices(
                { name: '🇧🇷 Brasil (padrão)', value: 'brasil' },
                { name: '🇺🇸 EUA', value: 'usa' },
                { name: '🇪🇺 Europa', value: 'europa' },
                { name: '🌎 Tudo (Brasil + EUA + Europa)', value: 'all' },
              ),
          )
          .addStringOption((o) =>
            o.setName('nome-canal').setDescription('Nome do canal').setRequired(false),
          ),
      )
      .addSubcommand((s) =>
        s
          .setName('cotacoes')
          .setDescription('Canal de cotações financeiras (15min) — Dólar, Euro, Cripto, SELIC...')
          .addStringOption((o) =>
            o.setName('nome-canal').setDescription('Nome do canal').setRequired(false),
          ),
      ),
  );

export async function execute(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const guild = interaction.guild;
  const guildId = guild.id;
  const config = getConfig(guildId);
  const sub = interaction.options.getSubcommand();

  // ── NOTÍCIAS ──
  if (sub === 'noticias') {
    if (config.scraper_noticias && guild.channels.cache.get(config.scraper_noticias)) {
      return interaction.editReply(
        `⚠️ Notícias já ativas em <#${config.scraper_noticias}>. Use \`/desativar scraping noticias\` primeiro.`,
      );
    }

    const regiaoInput = interaction.options.getString('regiao') || 'brasil';
    const regioes = regiaoInput === 'all' ? ['brasil', 'usa', 'europa'] : [regiaoInput];
    const nomePadrao = interaction.options.getString('nome-canal') || '📰-noticias';

    const categoria = await obterCategoria(guild);
    const canal = await criarCanalSomenteLeitura(guild, nomePadrao, categoria);

    setConfig(guildId, 'scraper_noticias', canal.id);
    setConfig(guildId, 'scraper_noticias_regioes', regioes);

    const regiaoLabel = {
      brasil: '🇧🇷 Brasil',
      usa: '🇺🇸 EUA',
      europa: '🇪🇺 Europa',
      all: '🌎 Brasil + EUA + Europa',
    }[regiaoInput];

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Módulo de Notícias Ativado!')
          .addFields(
            { name: '📢 Canal', value: `<#${canal.id}>`, inline: true },
            { name: '🌍 Região', value: regiaoLabel, inline: true },
            { name: '⏱️ Intervalo', value: 'A cada 30 minutos', inline: true },
            { name: '📡 Fontes', value: 'Google News, Agência Brasil, R7', inline: false },
          )
          .setColor(0x3498db)
          .setTimestamp(),
      ],
    });

    // Posta conteúdo imediato
    try {
      await canal.send({ content: '📰 **Módulo ativado! Buscando notícias...**' });
      const noticias = await buscarNoticias(regioes);
      for (const n of noticias.slice(0, 5)) {
        await canal.send({ embeds: [criarEmbedNoticia(n)] });
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      console.error('[ativar] Notícias iniciais:', err.message);
    }
    return;
  }

  // ── COTAÇÕES ──
  if (sub === 'cotacoes') {
    if (config.scraper_cotacoes && guild.channels.cache.get(config.scraper_cotacoes)) {
      return interaction.editReply(
        `⚠️ Cotações já ativas em <#${config.scraper_cotacoes}>. Use \`/desativar scraping cotacoes\` primeiro.`,
      );
    }

    const nomePadrao = interaction.options.getString('nome-canal') || '💹-cotacoes';
    const categoria = await obterCategoria(guild);
    const canal = await criarCanalSomenteLeitura(guild, nomePadrao, categoria);

    setConfig(guildId, 'scraper_cotacoes', canal.id);

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Módulo de Cotações Ativado!')
          .addFields(
            { name: '📢 Canal', value: `<#${canal.id}>`, inline: true },
            { name: '⏱️ Intervalo', value: 'A cada 15 minutos', inline: true },
            {
              name: '💰 Inclui',
              value:
                'USD, EUR, GBP, JPY, CNY, RUB, ARS, CAD, AUD, CHF\nBTC, ETH, SOL, BNB\nOuro, Prata, Ibovespa, SELIC',
              inline: false,
            },
          )
          .setColor(0xf39c12)
          .setTimestamp(),
      ],
    });

    try {
      await canal.send({ content: '💹 **Módulo ativado! Buscando cotações...**' });
      const dados = await buscarCotacoes();
      if (dados) await canal.send({ embeds: [criarEmbedCotacoes(dados)] });
    } catch (err) {
      console.error('[ativar] Cotações iniciais:', err.message);
    }
    return;
  }
}