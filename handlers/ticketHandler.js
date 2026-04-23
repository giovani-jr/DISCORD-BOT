import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  OverwriteType,
  PermissionFlagsBits,
  MessageFlags,
} from 'discord.js';
import { getConfig } from '../config/configManager.js';
import {
  gerarTicketId,
  criarTicket,
  atualizarTicket,
  getTicket,
  membroTemTicketAtivo,
  getTicketPorCanal,
} from './ticketManager.js';

// ═══════════════════════════════════════════════════
// SELECT MENU — usuário escolhe a categoria
// ═══════════════════════════════════════════════════
export async function handleTicketCategoria(interaction) {
  const categoria = interaction.values[0]; // 'Dúvida', 'Denúncia', etc.

  // Abre o modal para o motivo
  const modal = new ModalBuilder()
    .setCustomId(`ticket_modal_${categoria}`)
    .setTitle(`Ticket — ${categoria}`);

  const motivoInput = new TextInputBuilder()
    .setCustomId('ticket_motivo')
    .setLabel('Descreva brevemente o motivo')
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder('Seja claro e objetivo. Ex: Não consigo acessar o canal X...')
    .setMinLength(10)
    .setMaxLength(500)
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(motivoInput));
  await interaction.showModal(modal);
}

// ═══════════════════════════════════════════════════
// MODAL SUBMIT — recebe o motivo e registra o ticket
// ═══════════════════════════════════════════════════
export async function handleTicketModal(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const guildId = guild.id;
  const config = getConfig(guildId);
  const autor = interaction.member;

  // Extrai o tipo do customId (ticket_modal_Dúvida → Dúvida)
  const tipo = interaction.customId.replace('ticket_modal_', '');
  const motivo = interaction.fields.getTextInputValue('ticket_motivo');

  // ── Verifica se o membro já tem ticket ativo ──
  const ticketExistente = membroTemTicketAtivo(guildId, autor.id);
  if (ticketExistente) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('⚠️ Ticket já em andamento')
          .setDescription(
            `Você já possui o ticket **${ticketExistente.id}** em andamento.\n` +
            `Aguarde o atendimento antes de abrir um novo.`,
          )
          .setColor(0xe67e22),
      ],
    });
  }

  // ── Verifica se o canal de logs existe ──
  const canalLogs = guild.channels.cache.get(config.ticket_logs_id);
  if (!canalLogs) {
    return interaction.editReply('❌ Sistema de tickets não configurado. Contate um administrador.');
  }

  // ── Gera ID e salva o ticket ──
  const ticketId = gerarTicketId(guildId);
  criarTicket(guildId, ticketId, {
    tipo,
    motivo,
    autorId: autor.id,
    logMsgId: null,
  });

  // ── Embed de log com botão Assumir ──
  const embedLog = new EmbedBuilder()
    .setTitle(`🎫 Novo Ticket — ${ticketId}`)
    .setColor(0xf1c40f)
    .addFields(
      { name: '📂 Tipo',    value: tipo,             inline: true  },
      { name: '👤 Autor',   value: `<@${autor.id}>`, inline: true  },
      { name: '📝 Motivo',  value: motivo,            inline: false },
      { name: '📊 Status',  value: '⏳ Aguardando',  inline: true  },
    )
    .setTimestamp();

  const botaoAssumir = new ButtonBuilder()
    .setCustomId(`assumir_ticket_${ticketId}`)
    .setLabel('🎫 Assumir Ticket')
    .setStyle(ButtonStyle.Success);

  const rowLog = new ActionRowBuilder().addComponents(botaoAssumir);
  const msgLog = await canalLogs.send({ embeds: [embedLog], components: [rowLog] });

  // Salva o ID da mensagem de log
  atualizarTicket(guildId, ticketId, { logMsgId: msgLog.id });

  // ── DM ao membro ──
  try {
    await autor.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Ticket Registrado!')
          .setDescription(
            `Seu ticket **${ticketId}** foi registrado com sucesso.\n\n` +
            `**Tipo:** ${tipo}\n` +
            `**Motivo:** ${motivo}\n\n` +
            `Em breve um membro da equipe irá assumir o atendimento.`,
          )
          .setColor(0x2ecc71)
          .setTimestamp(),
      ],
    });
  } catch {
    // DM bloqueada — ignora silenciosamente
  }

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle('✅ Ticket Aberto!')
        .setDescription(
          `Seu ticket **${ticketId}** foi registrado.\n` +
          `Aguarde — em breve nossa equipe irá assumir o atendimento.`,
        )
        .setColor(0x2ecc71),
    ],
  });
}

// ═══════════════════════════════════════════════════
// BOTÃO — Assumir Ticket
// ═══════════════════════════════════════════════════
export async function handleAssumir(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const guildId = guild.id;
  const config = getConfig(guildId);
  const staff = interaction.member;

  // ── Verifica cargo de suporte ──
  const cargoSuporte = config.ticket_cargo_suporte;
  const isAdmin = staff.permissions.has(PermissionFlagsBits.Administrator);
  const temCargo = cargoSuporte && staff.roles.cache.has(cargoSuporte);

  if (!isAdmin && !temCargo) {
    return interaction.editReply('❌ Você não tem permissão para assumir tickets.');
  }

  // ── Extrai o ticketId do customId ──
  const ticketId = interaction.customId.replace('assumir_ticket_', '');
  const ticket = getTicket(guildId, ticketId);

  if (!ticket) {
    return interaction.editReply('❌ Ticket não encontrado.');
  }

  if (ticket.status !== 'aguardando') {
    return interaction.editReply(`⚠️ Este ticket já foi assumido ou está fechado.`);
  }

  // ── Cria o canal do ticket ──
  const nomeMembro = (await guild.members.fetch(ticket.autorId).catch(() => null))
    ?.displayName?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'membro';

  const nomeCanal = `ticket-${ticketId.toLowerCase().replace('ticket-', '')}-${nomeMembro}`;

  const categoriaId = config.ticket_categoria_id;

  const overwrites = [
    {
      id: guild.roles.everyone.id,
      deny: ['ViewChannel'],
      type: OverwriteType.Role,
    },
    {
      id: ticket.autorId,
      allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'AttachFiles'],
      type: OverwriteType.Member,
    },
    {
      id: guild.members.me.id,
      allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ReadMessageHistory'],
      type: OverwriteType.Member,
    },
  ];

  // Adiciona permissão para o cargo de suporte
  if (cargoSuporte) {
    overwrites.push({
      id: cargoSuporte,
      allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'AttachFiles'],
      type: OverwriteType.Role,
    });
  }

  const canalTicket = await guild.channels.create({
    name: nomeCanal,
    type: ChannelType.GuildText,
    parent: categoriaId || null,
    permissionOverwrites: overwrites,
  });

  // ── Mensagem de abertura no canal ──
  const botaoFechar = new ButtonBuilder()
    .setCustomId(`fechar_ticket_${ticketId}`)
    .setLabel('🔒 Fechar Ticket')
    .setStyle(ButtonStyle.Danger);

  const rowCanal = new ActionRowBuilder().addComponents(botaoFechar);

  await canalTicket.send({
    content: `<@${ticket.autorId}> <@${staff.id}>`,
    embeds: [
      new EmbedBuilder()
        .setTitle(`🎫 ${ticketId} — ${ticket.tipo}`)
        .setDescription(
          `🔔 Ticket assumido por <@${staff.id}>.\n\n` +
          `Olá <@${ticket.autorId}>, como podemos te ajudar?\n\n` +
          `**Motivo informado:** ${ticket.motivo}`,
        )
        .setColor(0x3498db)
        .addFields({ name: '⚠️ Atenção', value: 'Apenas a equipe de suporte pode fechar este ticket.' })
        .setTimestamp(),
    ],
    components: [rowCanal],
  });

  // ── Atualiza o ticket no JSON ──
  atualizarTicket(guildId, ticketId, {
    status: 'ativo',
    staffId: staff.id,
    canalId: canalTicket.id,
  });

  // ── Atualiza a mensagem de log ──
  try {
    const canalLogs = guild.channels.cache.get(config.ticket_logs_id);
    if (canalLogs && ticket.logMsgId) {
      const msgLog = await canalLogs.messages.fetch(ticket.logMsgId);
      if (msgLog) {
        const embedAtualizado = EmbedBuilder.from(msgLog.embeds[0])
          .spliceFields(3, 1, { name: '📊 Status', value: '🟢 Em atendimento', inline: true })
          .addFields({ name: '👨‍💼 Assumido por', value: `<@${staff.id}>`, inline: true });

        // Botão Assumir desabilitado + botão Fechar
        const botaoAssumirDesabilitado = new ButtonBuilder()
          .setCustomId(`assumir_ticket_${ticketId}`)
          .setLabel('✅ Assumido')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true);

        const botaoFecharLog = new ButtonBuilder()
          .setCustomId(`fechar_ticket_${ticketId}`)
          .setLabel('🔒 Fechar Ticket')
          .setStyle(ButtonStyle.Danger);

        const rowAtualizada = new ActionRowBuilder().addComponents(
          botaoAssumirDesabilitado,
          botaoFecharLog,
        );

        await msgLog.edit({ embeds: [embedAtualizado], components: [rowAtualizada] });
      }
    }
  } catch (err) {
    console.error('[ticket] Erro ao atualizar log:', err.message);
  }

  // ── DM ao membro ──
  try {
    const membro = await guild.members.fetch(ticket.autorId);
    await membro.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🟢 Ticket Assumido!')
          .setDescription(
            `Seu ticket **${ticketId}** foi assumido por <@${staff.id}>.\n` +
            `Acesse o canal <#${canalTicket.id}> para continuar o atendimento.`,
          )
          .setColor(0x3498db),
      ],
    });
  } catch {}

  await interaction.editReply(`✅ Ticket **${ticketId}** assumido! Canal: <#${canalTicket.id}>`);
}

// ═══════════════════════════════════════════════════
// BOTÃO — Fechar Ticket (apenas staff)
// ═══════════════════════════════════════════════════
export async function handleFechar(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const guildId = guild.id;
  const config = getConfig(guildId);
  const quemFechou = interaction.member;

  // ── Verifica cargo de suporte ──
  const cargoSuporte = config.ticket_cargo_suporte;
  const isAdmin = quemFechou.permissions.has(PermissionFlagsBits.Administrator);
  const temCargo = cargoSuporte && quemFechou.roles.cache.has(cargoSuporte);

  if (!isAdmin && !temCargo) {
    return interaction.editReply('❌ Apenas a equipe de suporte pode fechar tickets.');
  }

  // ── Extrai ticketId ──
  const ticketId = interaction.customId.replace('fechar_ticket_', '');
  const ticket = getTicket(guildId, ticketId);

  if (!ticket) {
    return interaction.editReply('❌ Ticket não encontrado.');
  }

  if (ticket.status === 'fechado') {
    return interaction.editReply('⚠️ Este ticket já foi fechado.');
  }

  const fechadoEm = new Date();

  // ── Atualiza ticket no JSON ──
  atualizarTicket(guildId, ticketId, {
    status: 'fechado',
    fechadoEm: fechadoEm.toISOString(),
  });

  // ── Responde antes de deletar ──
  await interaction.editReply(`✅ Ticket **${ticketId}** fechado com sucesso.`);

  // ── Atualiza mensagem de log ──
  try {
    const canalLogs = guild.channels.cache.get(config.ticket_logs_id);
    if (canalLogs && ticket.logMsgId) {
      const msgLog = await canalLogs.messages.fetch(ticket.logMsgId);
      if (msgLog) {
        const dataFormatada = fechadoEm.toLocaleDateString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });

        const embedFechado = EmbedBuilder.from(msgLog.embeds[0])
          .setColor(0x95a5a6)
          .spliceFields(3, 1, { name: '📊 Status', value: '🔒 Fechado', inline: true })
          .addFields({ name: '🔒 Fechado por', value: `<@${quemFechou.id}>`, inline: true })
          .addFields({ name: '📅 Fechado em', value: dataFormatada, inline: true });

        // Desabilita todos os botões
        const rowDesabilitada = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`assumir_ticket_${ticketId}`)
            .setLabel('✅ Assumido')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          new ButtonBuilder()
            .setCustomId(`fechar_ticket_${ticketId}`)
            .setLabel('🔒 Fechado')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
        );

        await msgLog.edit({ embeds: [embedFechado], components: [rowDesabilitada] });
      }
    }
  } catch (err) {
    console.error('[ticket] Erro ao atualizar log no fechamento:', err.message);
  }

  // ── DM ao membro ──
  try {
    const membro = await guild.members.fetch(ticket.autorId);
    await membro.send({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔒 Ticket Fechado')
          .setDescription(
            `Seu ticket **${ticketId}** foi fechado por <@${quemFechou.id}>.\n` +
            `Se precisar de mais ajuda, abra um novo ticket.`,
          )
          .setColor(0x95a5a6)
          .setTimestamp(),
      ],
    });
  } catch {}

  // ── Deleta o canal DEPOIS de tudo ──
  try {
    const canalTicket = guild.channels.cache.get(ticket.canalId);
    if (canalTicket) {
      await new Promise((r) => setTimeout(r, 1500)); // pequeno delay para garantir resposta
      await canalTicket.delete(`Ticket ${ticketId} fechado por ${quemFechou.user.tag}`);
    }
  } catch (err) {
    console.error('[ticket] Erro ao deletar canal:', err.message);
  }
}