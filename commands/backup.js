import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  AttachmentBuilder,
  ChannelType,
  MessageFlags,
} from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { getConfig, setConfig } from '../config/configManager.js';
import { criarMensagemAbertura } from './ticket.js';
import { buscarNoticias } from '../scrapers/noticias.js';
import { buscarCotacoes } from '../scrapers/cotacoes.js';
import { criarEmbedNoticia, criarEmbedCotacoes } from '../scrapers/scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backupsPath = path.join(__dirname, '../data/backups.json');

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function lerBackups() {
  return fs.readJsonSync(backupsPath, { throws: false }) || {};
}
function salvarBackups(data) {
  fs.writeJsonSync(backupsPath, data, { spaces: 2 });
}

async function enviarLog(guild, payload) {
  try {
    const config = getConfig(guild.id);
    if (!config.log_channel) return;
    const canal = guild.channels.cache.get(config.log_channel);
    if (canal) await canal.send(payload);
  } catch {}
}

// ════════════════════════════════════════════════
// MAPEAMENTO DE CONFIGURAÇÕES (nomes de canais/cargos)
// ════════════════════════════════════════════════
function criarMapeamentoNomes(guild, configBot) {
  const map = {};
  for (const [chave, id] of Object.entries(configBot)) {
    if (!id) continue;
    // Tenta como canal
    const canal = guild.channels.cache.get(id);
    if (canal) {
      map[chave] = { tipo: 'canal', nome: canal.name, channelType: canal.type };
      continue;
    }
    // Tenta como cargo
    const cargo = guild.roles.cache.get(id);
    if (cargo) {
      map[chave] = { tipo: 'cargo', nome: cargo.name };
    }
  }
  return map;
}

// ════════════════════════════════════════════════
// GERAÇÃO
// ════════════════════════════════════════════════
async function gerarBackup(guild, autorTag, autorId) {
  const configAtual = getConfig(guild.id);
  const backup = {
    versao: '1.0',
    servidor: guild.name,
    servidorId: guild.id,
    geradoEm: new Date().toISOString(),
    geradoPor: autorTag,
    geradoPorId: autorId,
    icone: guild.iconURL({ size: 512 }) || null,
    categorias: [],
    canaisSemCategoria: [],
    cargos: [],
    configBot: configAtual,
    configNomes: criarMapeamentoNomes(guild, configAtual),
  };

  const cargos = guild.roles.cache
    .filter((r) => r.id !== guild.id && !r.managed)
    .sort((a, b) => b.position - a.position);

  for (const cargo of cargos.values()) {
    backup.cargos.push({
      nome: cargo.name,
      cor: cargo.hexColor !== '#000000' ? cargo.hexColor : null,
      permissoes: cargo.permissions.bitfield.toString(),
      mentionavel: cargo.mentionable,
      hoist: cargo.hoist,
      posicao: cargo.position,
    });
  }

  const categorias = guild.channels.cache
    .filter((c) => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  for (const cat of categorias.values()) {
    const catData = {
      nome: cat.name,
      posicao: cat.position,
      permissoes: extrairPermissoes(cat, guild),
      canais: [],
    };
    const canaisDaCat = guild.channels.cache
      .filter((c) => c.parentId === cat.id)
      .sort((a, b) => a.position - b.position);
    for (const canal of canaisDaCat.values()) {
      catData.canais.push(extrairCanal(canal, guild));
    }
    backup.categorias.push(catData);
  }

  const semCat = guild.channels.cache
    .filter((c) => !c.parentId && c.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);
  for (const canal of semCat.values()) {
    backup.canaisSemCategoria.push(extrairCanal(canal, guild));
  }

  return backup;
}

function extrairPermissoes(channel, guild) {
  const perms = [];
  for (const [id, overwrite] of channel.permissionOverwrites.cache) {
    const role = guild.roles.cache.get(id);
    const member = guild.members.cache.get(id);
    perms.push({
      tipo: overwrite.type === 0 ? 'role' : 'member',
      nome: role?.name || member?.user?.username || id,
      id,
      allow: overwrite.allow.bitfield.toString(),
      deny: overwrite.deny.bitfield.toString(),
    });
  }
  return perms;
}

function extrairCanal(canal, guild) {
  const base = {
    nome: canal.name,
    tipo: canal.type,
    posicao: canal.position,
    permissoes: extrairPermissoes(canal, guild),
    nsfw: canal.nsfw || false,
  };
  if (canal.type === ChannelType.GuildText) {
    base.topico = canal.topic || null;
    base.slowmode = canal.rateLimitPerUser || 0;
  }
  if (canal.type === ChannelType.GuildVoice) {
    base.bitrate = canal.bitrate || 64000;
    base.limitUsuarios = canal.userLimit || 0;
  }
  return base;
}

// ════════════════════════════════════════════════
// RESTAURAÇÃO — roda em BACKGROUND, sem editReply
// ════════════════════════════════════════════════
async function restaurarBackup(guild, backup, zerarAntes, autorUser, client) {
  const criados = { cargos: 0, categorias: 0, canais: 0, erros: 0 };
  const logs = [];
  const log = (msg) => { logs.push(msg); console.log(`[backup restore] ${msg}`); };

  if (zerarAntes) {
    log('🗑️ Removendo estrutura existente...');
    for (const canal of guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory).values()) {
      try { await canal.delete('Restauração de backup'); } catch {}
      await delay(350);
    }
    for (const cat of guild.channels.cache.filter((c) => c.type === ChannelType.GuildCategory).values()) {
      try { await cat.delete('Restauração de backup'); } catch {}
      await delay(350);
    }
    for (const cargo of guild.roles.cache.filter((r) => r.id !== guild.id && !r.managed && r.editable).values()) {
      try { await cargo.delete('Restauração de backup'); } catch {}
      await delay(350);
    }
  }

  log('🎭 Recriando cargos...');
  const mapaCargoNomeParaId = new Map();
  mapaCargoNomeParaId.set('@everyone', guild.roles.everyone.id);

  for (const cargo of [...backup.cargos].reverse()) {
    if (!zerarAntes) {
      const existente = guild.roles.cache.find((r) => r.name === cargo.nome);
      if (existente) { mapaCargoNomeParaId.set(cargo.nome, existente.id); continue; }
    }
    try {
      const novo = await guild.roles.create({
        name: cargo.nome,
        color: cargo.cor || null,
        permissions: BigInt(cargo.permissoes),
        mentionable: cargo.mentionavel,
        hoist: cargo.hoist,
        reason: 'Restauração de backup',
      });
      mapaCargoNomeParaId.set(cargo.nome, novo.id);
      criados.cargos++;
      await delay(350);
    } catch (err) {
      console.error(`[backup] Cargo ${cargo.nome}: ${err.message}`);
      criados.erros++;
    }
  }

  function converterPermissoes(perms = []) {
    return perms.map((p) => ({
      id: p.tipo === 'role'
        ? (mapaCargoNomeParaId.get(p.nome) || guild.roles.everyone.id)
        : p.id,
      type: p.tipo === 'role' ? 0 : 1,
      allow: BigInt(p.allow),
      deny: BigInt(p.deny),
    }));
  }

  log('📝 Recriando canais soltos...');
  for (const canalData of backup.canaisSemCategoria || []) {
    const existe = guild.channels.cache.find(
      (c) => c.name === canalData.nome && !c.parentId && c.type !== ChannelType.GuildCategory,
    );
    if (!zerarAntes && existe) continue;
    try {
      await criarCanalFn(guild, canalData, null, converterPermissoes);
      criados.canais++;
      await delay(400);
    } catch (err) {
      console.error(`[backup] Canal solto ${canalData.nome}: ${err.message}`);
      criados.erros++;
    }
  }

  log('📁 Recriando categorias e canais...');
  for (const cat of backup.categorias || []) {
    let categoriaId = null;

    if (!zerarAntes) {
      const existente = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name === cat.nome,
      );
      if (existente) categoriaId = existente.id;
    }

    if (!categoriaId) {
      try {
        const novaCat = await guild.channels.create({
          name: cat.nome,
          type: ChannelType.GuildCategory,
          permissionOverwrites: converterPermissoes(cat.permissoes),
          reason: 'Restauração de backup',
        });
        categoriaId = novaCat.id;
        criados.categorias++;
        await delay(400);
      } catch (err) {
        console.error(`[backup] Categoria ${cat.nome}: ${err.message}`);
        criados.erros++;
        continue;
      }
    }

    for (const canalData of cat.canais || []) {
      const existe = guild.channels.cache.find(
        (c) => c.name === canalData.nome && c.parentId === categoriaId,
      );
      if (!zerarAntes && existe) continue;

      try {
        await criarCanalFn(guild, canalData, categoriaId, converterPermissoes);
        criados.canais++;
        await delay(400);
      } catch (err) {
        console.error(`[backup] Canal ${canalData.nome}: ${err.message}`);
        criados.erros++;
      }
    }
  }

  // Restaura configurações do bot (mapeando por nomes se disponível)
  if (backup.configBot) {
    for (const [key, val] of Object.entries(backup.configBot)) {
      if (val === null || val === undefined) continue;

      const nomeMap = backup.configNomes?.[key];
      if (nomeMap) {
        if (nomeMap.tipo === 'canal') {
          // Agora usamos o channelType do mapeamento (se existir) para evitar filtrar categorias indevidamente
          const canalEquivalente = guild.channels.cache.find(
            (c) => c.name === nomeMap.nome && (nomeMap.channelType ? c.type === nomeMap.channelType : c.type !== ChannelType.GuildCategory)
          );
          if (canalEquivalente) {
            setConfig(guild.id, key, canalEquivalente.id);
          } else {
            console.warn(`[backup] Canal "${nomeMap.nome}" não encontrado no destino para a chave ${key}`);
          }
        } else if (nomeMap.tipo === 'cargo') {
          const cargoEquivalente = guild.roles.cache.find(
            (r) => r.name === nomeMap.nome && r.id !== guild.roles.everyone.id
          );
          if (cargoEquivalente) {
            setConfig(guild.id, key, cargoEquivalente.id);
          } else {
            console.warn(`[backup] Cargo "${nomeMap.nome}" não encontrado no destino para a chave ${key}`);
          }
        }
      } else {
        setConfig(guild.id, key, val);
      }
    }
  }

  // ════════════════════════════════════════════════
  // REENVIAR MENSAGENS FIXAS DE SISTEMAS RECRIADOS
  // ════════════════════════════════════════════════
  try {
    const configFinal = getConfig(guild.id);

    // Ticket: reenviar o embed de abertura no canal 🎫-abrir-ticket
    if (configFinal.ticket_abertura_id) {
      const canalAbertura = await guild.channels.fetch(configFinal.ticket_abertura_id).catch(() => null);
      if (canalAbertura) {
        await canalAbertura.send(criarMensagemAbertura());
        log('🎫 Mensagem de abertura de ticket restaurada.');
      }
    }

    // Scrapers: enviar conteúdo inicial imediato (igual à ativação normal)
    if (configFinal.scraper_noticias) {
      const canalNoticias = guild.channels.cache.get(configFinal.scraper_noticias);
      if (canalNoticias) {
        const regioes = configFinal.scraper_noticias_regioes || ['brasil'];
        log('📰 Buscando notícias iniciais...');
        try {
          const noticias = await buscarNoticias(regioes);
          for (const n of noticias.slice(0, 5)) {
            await canalNoticias.send({ embeds: [criarEmbedNoticia(n)] });
            await delay(500);
          }
        } catch (err) {
          console.error('[backup] Erro ao enviar notícias iniciais:', err.message);
        }
      }
    }

    if (configFinal.scraper_cotacoes) {
      const canalCotacoes = guild.channels.cache.get(configFinal.scraper_cotacoes);
      if (canalCotacoes) {
        log('💹 Buscando cotações iniciais...');
        try {
          const dados = await buscarCotacoes();
          if (dados) {
            await canalCotacoes.send({ embeds: [criarEmbedCotacoes(dados)] });
          }
        } catch (err) {
          console.error('[backup] Erro ao enviar cotações iniciais:', err.message);
        }
      }
    }
  } catch (err) {
    console.error('[backup] Erro ao reenviar mensagens de sistema:', err);
  }

  // DM ao admin
  try {
    await autorUser.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Restauração Concluída!')
          .setDescription(`Backup de **${backup.servidor}** restaurado em **${guild.name}**.`)
          .addFields(
            { name: '🎭 Cargos',     value: `${criados.cargos}`,     inline: true },
            { name: '📁 Categorias', value: `${criados.categorias}`, inline: true },
            { name: '📝 Canais',     value: `${criados.canais}`,     inline: true },
            { name: '❌ Erros',      value: `${criados.erros}`,      inline: true },
          )
          .setColor(0x2ecc71)
          .setTimestamp(),
      ],
    });
  } catch {}

  // Log
  await enviarLog(guild, {
    embeds: [
      new EmbedBuilder()
        .setTitle('📦 Backup Restaurado')
        .setDescription(
          `**${autorUser.tag}** restaurou um backup.\n` +
          `> 🎭 ${criados.cargos} cargos • 📁 ${criados.categorias} cats • 📝 ${criados.canais} canais`,
        )
        .setColor(0xf39c12)
        .setTimestamp(),
    ],
  });
}

async function criarCanalFn(guild, canalData, categoriaId, converterPermissoes) {
  const base = {
    name: canalData.nome,
    type: canalData.tipo,
    permissionOverwrites: converterPermissoes(canalData.permissoes || []),
    nsfw: canalData.nsfw || false,
    reason: 'Restauração de backup',
  };
  if (categoriaId) base.parent = categoriaId;
  if (canalData.tipo === ChannelType.GuildText) {
    base.topic = canalData.topico || null;
    base.rateLimitPerUser = canalData.slowmode || 0;
  }
  if (canalData.tipo === ChannelType.GuildVoice) {
    base.bitrate = canalData.bitrate || 64000;
    base.userLimit = canalData.limitUsuarios || 0;
  }
  return guild.channels.create(base);
}

// ════════════════════════════════════════════════
// EXPORT DO COMANDO
// ════════════════════════════════════════════════
export const data = new SlashCommandBuilder()
  .setName('backup')
  .setDescription('Sistema de backup e restauração do servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .setDMPermission(false)
  .addSubcommand((s) => s.setName('criar').setDescription('Gera backup completo e envia por DM'))
  .addSubcommand((s) =>
    s
      .setName('restaurar')
      .setDescription('Restaura estrutura a partir de um arquivo .json')
      .addAttachmentOption((o) =>
        o.setName('arquivo').setDescription('Arquivo .json do /backup criar').setRequired(true),
      )
      .addBooleanOption((o) =>
        o.setName('zerar-antes').setDescription('Apagar estrutura atual antes? (padrão: NÃO)').setRequired(false),
      ),
  )
  .addSubcommand((s) => s.setName('listar').setDescription('Lista os backups criados neste servidor'))
  .addSubcommand((s) =>
    s
      .setName('remover')
      .setDescription('Remove um backup do histórico pelo número da lista')
      .addIntegerOption((o) =>
        o.setName('numero').setDescription('Número do backup em /backup listar').setRequired(true).setMinValue(1),
      ),
  );

export async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({
      content: '❌ Apenas administradores do servidor podem usar o sistema de backup.',
      flags: MessageFlags.Ephemeral,
    });
  }

  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild;
  const guildId = guild.id;

  // ── /backup criar ──
  if (sub === 'criar') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    try {
      await interaction.editReply({
        embeds: [new EmbedBuilder().setDescription('⏳ Gerando backup...').setColor(0xf39c12)],
      });

      const backup = await gerarBackup(guild, interaction.user.tag, interaction.user.id);
      const totalCanais = backup.categorias.reduce((a, c) => a + c.canais.length, 0) + backup.canaisSemCategoria.length;

      const nomeArquivo = `backup_${guild.name.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.json`;
      const buffer = Buffer.from(JSON.stringify(backup, null, 2), 'utf-8');
      const attachment = new AttachmentBuilder(buffer, { name: nomeArquivo });

      try {
        await interaction.user.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('📦 Backup do Servidor')
              .setDescription(
                `Backup de **${guild.name}** gerado!\n\n` +
                `> 📁 Categorias: **${backup.categorias.length}**\n` +
                `> 📝 Canais: **${totalCanais}**\n` +
                `> 🎭 Cargos: **${backup.cargos.length}**\n\n` +
                `⚠️ Guarde este arquivo em local seguro.`,
              )
              .setColor(0x2ecc71)
              .setTimestamp(),
          ],
          files: [attachment],
        });
      } catch {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('❌ DM Bloqueada')
              .setDescription('Ative mensagens diretas nas configurações do Discord e tente novamente.')
              .setColor(0xe74c3c),
          ],
        });
      }

      const backups = lerBackups();
      if (!backups[guildId]) backups[guildId] = [];
      backups[guildId].push({
        id: Date.now().toString(),
        geradoEm: backup.geradoEm,
        geradoPor: interaction.user.tag,
        nomeArquivo,
        categorias: backup.categorias.length,
        canais: totalCanais,
        cargos: backup.cargos.length,
      });
      if (backups[guildId].length > 10) backups[guildId] = backups[guildId].slice(-10);
      salvarBackups(backups);

      await enviarLog(guild, {
        embeds: [
          new EmbedBuilder()
            .setTitle('📦 Backup Criado')
            .setDescription(
              `**${interaction.user.tag}** criou um backup.\n` +
              `> 📁 ${backup.categorias.length} cats • 📝 ${totalCanais} canais • 🎭 ${backup.cargos.length} cargos`,
            )
            .setColor(0x2ecc71)
            .setTimestamp(),
        ],
      });

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Backup Criado!')
            .setDescription('O arquivo foi enviado para sua **DM**.')
            .addFields(
              { name: '📁 Categorias', value: `${backup.categorias.length}`, inline: true },
              { name: '📝 Canais',     value: `${totalCanais}`,              inline: true },
              { name: '🎭 Cargos',     value: `${backup.cargos.length}`,     inline: true },
            )
            .setColor(0x2ecc71)
            .setTimestamp(),
        ],
      });
    } catch (err) {
      console.error('[backup] Criar:', err);
      return interaction.editReply({ content: `❌ Erro: ${err.message}` });
    }
  }

  // ── /backup restaurar ──
  if (sub === 'restaurar') {
    const arquivo = interaction.options.getAttachment('arquivo');
    const zerarAntes = interaction.options.getBoolean('zerar-antes') ?? false;

    if (!arquivo.name.endsWith('.json')) {
      return interaction.reply({
        content: '❌ O arquivo deve ser um `.json` gerado pelo `/backup criar`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    let backup;
    try {
      const res = await fetch(arquivo.url);
      backup = JSON.parse(await res.text());
      if (!backup.versao || !backup.categorias) throw new Error('Arquivo inválido ou corrompido.');
    } catch (err) {
      return interaction.reply({ content: `❌ ${err.message}`, flags: MessageFlags.Ephemeral });
    }

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⏳ Restauração Iniciada em Background!')
          .setDescription(
            `A restauração está rodando. **Não desligue o bot.**\n\n` +
            `${zerarAntes ? '⚠️ **Modo zerar** — estrutura atual será apagada.' : '✅ **Modo seguro** — apenas o que falta será criado.'}\n\n` +
            `📩 Você receberá uma **DM** quando concluir.`,
          )
          .addFields(
            { name: '📦 Backup de', value: backup.servidor,                                        inline: true },
            { name: '📅 Gerado em', value: new Date(backup.geradoEm).toLocaleDateString('pt-BR'), inline: true },
            { name: '👤 Por',       value: backup.geradoPor,                                       inline: true },
          )
          .setColor(0xf39c12)
          .setTimestamp(),
      ],
      flags: MessageFlags.Ephemeral,
    });

    // Passa o client para a restauração
    restaurarBackup(guild, backup, zerarAntes, interaction.user, interaction.client).catch((err) => {
      console.error('[backup] Erro restore:', err);
      interaction.user.send(`❌ Erro durante restauração: ${err.message}`).catch(() => {});
    });

    return;
  }

  // ── /backup listar ──
  if (sub === 'listar') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const backups = lerBackups();
    const lista = backups[guildId];

    if (!lista || lista.length === 0) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('📋 Backups do Servidor')
            .setDescription('Nenhum backup criado ainda. Use `/backup criar`.')
            .setColor(0x95a5a6),
        ],
      });
    }

    const linhas = [...lista]
      .reverse()
      .map((b, i) => {
        const data = new Date(b.geradoEm).toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
        });
        return `**${i + 1}.** \`${data}\`\n> 👤 ${b.geradoPor} • 📁 ${b.categorias} cats • 📝 ${b.canais} canais • 🎭 ${b.cargos} cargos`;
      })
      .join('\n\n');

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('📋 Histórico de Backups')
          .setDescription(linhas)
          .setFooter({ text: 'Use /backup remover <número> para deletar um registro.' })
          .setColor(0x3498db)
          .setTimestamp(),
      ],
    });
  }

  // ── /backup remover ──
  if (sub === 'remover') {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const numero = interaction.options.getInteger('numero');
    const backups = lerBackups();
    const lista = backups[guildId];

    if (!lista || lista.length === 0) {
      return interaction.editReply('⚠️ Nenhum backup encontrado neste servidor.');
    }

    const listaInvertida = [...lista].reverse();

    if (numero > listaInvertida.length) {
      return interaction.editReply(`❌ Número inválido. Use entre 1 e ${listaInvertida.length}.`);
    }

    const removido = listaInvertida[numero - 1];
    const idxOriginal = lista.findIndex((b) => b.id === removido.id);
    lista.splice(idxOriginal, 1);
    backups[guildId] = lista;
    salvarBackups(backups);

    const dataFormatada = new Date(removido.geradoEm).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    await enviarLog(guild, {
      embeds: [
        new EmbedBuilder()
          .setTitle('🗑️ Registro de Backup Removido')
          .setDescription(
            `**${interaction.user.tag}** removeu um registro de backup do histórico.\n` +
            `> 📅 ${dataFormatada} • gerado por ${removido.geradoPor}`,
          )
          .setColor(0xe74c3c)
          .setTimestamp(),
      ],
    });

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🗑️ Registro Removido')
          .setDescription(
            `Backup **#${numero}** removido do histórico.\n\n` +
            `> 📅 **Data:** ${dataFormatada}\n` +
            `> 👤 **Gerado por:** ${removido.geradoPor}\n\n` +
            `⚠️ O arquivo **.json** enviado por DM continua válido para restauração.`,
          )
          .setColor(0xe74c3c)
          .setTimestamp(),
      ],
    });
  }
}