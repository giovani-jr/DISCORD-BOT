import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  OverwriteType,
  MessageFlags,
} from 'discord.js';
import { getConfig, setConfig } from '../config/configManager.js';

// ── Cria o canal de avisos somente-leitura ──
async function criarCanalAvisos(guild) {
  const canal = await guild.channels.create({
    name: '📣-avisos',
    type: ChannelType.GuildText,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: ['SendMessages', 'AddReactions', 'CreatePublicThreads'],
        allow: ['ViewChannel', 'ReadMessageHistory'],
        type: OverwriteType.Role,
      },
    ],
  });

  const msgFixa = await canal.send({
    embeds: [
      new EmbedBuilder()
        .setTitle('📣 Canal de Avisos')
        .setDescription(
          'Este canal é destinado a avisos oficiais da administração.\n\n' +
          '> 🔕 Apenas a administração pode enviar mensagens aqui.\n' +
          '> 📩 Você também receberá os avisos por mensagem privada (DM).\n' +
          '> ✅ Confirme a leitura do aviso pelo botão que aparecerá na sua DM.',
        )
        .setColor(0xe74c3c)
        .setFooter({ text: 'Fique atento aos avisos da administração.' }),
    ],
  });

  try { await msgFixa.pin(); } catch {}

  return canal;
}

// ── Embed do aviso ──
function criarEmbedAviso(mensagem, autorTag) {
  return new EmbedBuilder()
    .setTitle('📢 Novo Aviso da Administração')
    .setDescription(mensagem)
    .setColor('Red')
    .setFooter({ text: `Enviado por ${autorTag}` })
    .setTimestamp();
}

// ── Botão de confirmação ──
function criarBotaoConfirmacao() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_read')
      .setLabel('✅ Li o aviso')
      .setStyle(ButtonStyle.Primary),
  );
}

// ── Envia DM com botão de confirmação e registra no mapa ──
async function sendNoticeDM(member, mensagem, autorTag, avisoId, avisoMap) {
  const embed = criarEmbedAviso(mensagem, autorTag);
  const row = criarBotaoConfirmacao();

  try {
    const dmMessage = await member.send({ embeds: [embed], components: [row] });
    avisoMap.set(dmMessage.id, avisoId);
    return true;
  } catch {
    return false;
  }
}

// ── Dispara o aviso para canal + DMs ──
async function dispararAviso(guild, mensagem, autorTag, avisoMap, avisoData) {
  const config = getConfig(guild.id);
  const avisoId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const avisoTimestamp = new Date();

  // Inicializa os dados do aviso
  avisoData.set(avisoId, {
    guildId: guild.id,
    authorTag: autorTag,            // <--- corrigido
    timestamp: avisoTimestamp,
    confirmations: new Set(),
    logMessageId: null,
  });

  // Envia relatório inicial no canal de log (se existir)
  const logChannel = guild.channels.cache.get(config.log_channel);
  if (logChannel) {
    const embedLog = new EmbedBuilder()
      .setTitle('📢 Registro de Aviso')
      .setColor(0x3498db)
      .addFields(
        { name: '👤 Criado por', value: autorTag, inline: true },
        { name: '🕒 Horário', value: avisoTimestamp.toLocaleString('pt-BR'), inline: true },
        { name: '✅ Confirmaram', value: 'Nenhum ainda', inline: false },
      )
      .setFooter({ text: `ID do aviso: ${avisoId}` })
      .setTimestamp();

    const logMessage = await logChannel.send({ embeds: [embedLog] });
    avisoData.get(avisoId).logMessageId = logMessage.id;
  }

  let sentCount = 0;

  // Posta no canal de avisos (se configurado)
  const notifyChannel = guild.channels.cache.get(config.notify_channel);
  if (notifyChannel) {
    const embed = criarEmbedAviso(mensagem, autorTag);
    const row = criarBotaoConfirmacao();
    try {
      const msg = await notifyChannel.send({ embeds: [embed], components: [row] });
      avisoMap.set(msg.id, avisoId);
    } catch (err) {
      console.error('[aviso] Erro ao postar no canal:', err.message);
    }
  }

  // Envia DM para todos os membros
  const members = await guild.members.fetch();
  for (const member of members.values()) {
    if (member.user.bot) continue;
    const ok = await sendNoticeDM(member, mensagem, autorTag, avisoId, avisoMap);
    if (ok) sentCount++;
  }

  return sentCount;
}

export const data = new SlashCommandBuilder()
  .setName('aviso')
  .setDescription('Gerencia o sistema de avisos do servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((s) =>
    s
      .setName('criar-canal')
      .setDescription('Cria o canal de avisos (somente-leitura) e o configura automaticamente'),
  )
  .addSubcommand((s) =>
    s
      .setName('enviar')
      .setDescription('Envia um aviso imediatamente para o canal e DM de todos os membros')
      .addStringOption((o) =>
        o.setName('mensagem').setDescription('Mensagem do aviso').setRequired(true),
      ),
  )
  .addSubcommand((s) =>
    s
      .setName('agendar')
      .setDescription('Agenda um aviso para um horário específico (ex: 18:30)')
      .addStringOption((o) =>
        o.setName('mensagem').setDescription('Mensagem do aviso').setRequired(true),
      )
      .addStringOption((o) =>
        o
          .setName('horario')
          .setDescription('Horário no formato HH:MM (ex: 18:30)')
          .setRequired(true),
      ),
  );

export function createExecute({ avisoMap, avisoData }) {
  return async function execute(interaction) {
    const config = getConfig(interaction.guildId);
    const adminRole = config.admin_role;

    if (adminRole && !interaction.member.roles.cache.has(adminRole) &&
        !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: '❌ Você não tem permissão para usar este comando!',
        flags: MessageFlags.Ephemeral,
      });
    }

    const sub = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // ── /aviso criar-canal ──
    if (sub === 'criar-canal') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (config.notify_channel && guild.channels.cache.get(config.notify_channel)) {
        return interaction.editReply(
          `⚠️ O canal de avisos já está configurado: <#${config.notify_channel}>\n` +
          `Use \`/configurar avisos\` para alterar para outro canal existente.`,
        );
      }

      const canal = await criarCanalAvisos(guild);
      setConfig(guild.id, 'notify_channel', canal.id);

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Canal de Avisos Criado!')
            .setDescription(
              `Canal ${canal} criado e configurado com sucesso!\n\n` +
              `> 🔕 Membros podem apenas **ler**\n` +
              `> 📌 Mensagem explicativa fixada no canal\n` +
              `> 📢 Use \`/aviso enviar\` para enviar avisos`,
            )
            .setColor(0x2ecc71)
            .setTimestamp(),
        ],
      });
    }

    // ── /aviso enviar ──
    if (sub === 'enviar') {
      const mensagem = interaction.options.getString('mensagem');
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      if (!config.notify_channel || !guild.channels.cache.get(config.notify_channel)) {
        return interaction.editReply(
          '⚠️ Nenhum canal de avisos configurado.\n' +
          'Use `/aviso criar-canal` para criar um automaticamente ou `/configurar avisos` para usar um existente.',
        );
      }

      const sentCount = await dispararAviso(
        guild,
        mensagem,
        interaction.user.tag,
        avisoMap,
        avisoData,
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('✅ Aviso Enviado!')
            .addFields(
              { name: '📢 Canal', value: `<#${config.notify_channel}>`, inline: true },
              { name: '📩 DMs enviadas', value: `${sentCount} membros`, inline: true },
            )
            .setColor(0x2ecc71)
            .setTimestamp(),
        ],
      });
    }

    // ── /aviso agendar ──
    if (sub === 'agendar') {
      const mensagem = interaction.options.getString('mensagem');
      const horario = interaction.options.getString('horario');

      if (!/^\d{1,2}:\d{2}$/.test(horario)) {
        return interaction.reply({
          content: '❌ Formato inválido. Use **HH:MM** (ex: 18:30)',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!config.notify_channel || !guild.channels.cache.get(config.notify_channel)) {
        return interaction.reply({
          content:
            '⚠️ Nenhum canal de avisos configurado.\n' +
            'Use `/aviso criar-canal` antes de agendar.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const [hour, minute] = horario.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hour, minute, 0, 0);
      let delay = target.getTime() - now.getTime();
      if (delay < 0) delay += 24 * 60 * 60 * 1000;

      const horaFormatada = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('⏳ Aviso Agendado!')
            .setDescription(`O aviso será enviado às **${horaFormatada}**.`)
            .addFields({ name: '📝 Mensagem', value: mensagem })
            .setColor(0xf39c12)
            .setTimestamp(),
        ],
        flags: MessageFlags.Ephemeral,
      });

      setTimeout(async () => {
        try {
          const sentCount = await dispararAviso(
            guild,
            mensagem,
            interaction.user.tag,
            avisoMap,
            avisoData,
          );
          await interaction.followUp({
            content: `✅ Aviso agendado das **${horaFormatada}** enviado para **${sentCount}** membros!`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (err) {
          console.error('[aviso] Erro ao enviar aviso agendado:', err.message);
        }
      }, delay);
    }
  };
}