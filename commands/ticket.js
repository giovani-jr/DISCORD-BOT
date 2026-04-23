import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  OverwriteType,
  MessageFlags,
} from 'discord.js';
import { setConfig, getConfig } from '../config/configManager.js';
import {
  gerarTicketId,
  criarTicket,
  atualizarTicket,
  getTicket,
  membroTemTicketAtivo,
  getTicketPorCanal,
  resetarTickets,
} from '../handlers/ticketManager.js';

const CATEGORIA_NOME = '🎫 SUPORTE';
const CANAL_ABERTURA = '🎫-abrir-ticket';
const CANAL_LOGS = '📋-logs-ticket';

// ── Embed + Select Menu fixo no canal de abertura ──
export function criarMensagemAbertura() {
  const embed = new EmbedBuilder()
    .setTitle('🎫 Sistema de Tickets')
    .setDescription(
      'Precisa de ajuda? Selecione a categoria do seu atendimento abaixo.\n\n' +
      '> **Dúvida** — Tire suas dúvidas com nossa equipe\n' +
      '> **Denúncia** — Reporte um membro ou situação\n' +
      '> **Sugestão** — Envie uma sugestão para o servidor\n' +
      '> **Outro** — Qualquer outro assunto',
    )
    .setColor(0xf1c40f)
    .setFooter({ text: 'Apenas 1 ticket ativo por usuário.' })
    .setTimestamp();

  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId('ticket_categoria')
    .setPlaceholder('📩 Selecione a categoria de atendimento.')
    .addOptions([
      { label: 'Dúvida',    description: 'Tire suas dúvidas com a equipe.', value: 'Dúvida',    emoji: '❓' },
      { label: 'Denúncia',  description: 'Reporte um membro ou situação.',  value: 'Denúncia',  emoji: '🚨' },
      { label: 'Sugestão',  description: 'Envie uma sugestão.',             value: 'Sugestão',  emoji: '💡' },
      { label: 'Outro',     description: 'Qualquer outro assunto.',         value: 'Outro',     emoji: '📋' },
    ]);

  const row = new ActionRowBuilder().addComponents(selectMenu);
  return { embeds: [embed], components: [row] };
}

export const data = new SlashCommandBuilder()
  .setName('ticket')
  .setDescription('Gerencia o sistema de tickets')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  // ── setup ──
  .addSubcommand((s) =>
    s.setName('setup').setDescription('Cria os canais e a categoria do sistema de tickets'),
  )
  // ── configurar cargo ──
  .addSubcommand((s) =>
    s
      .setName('configurar')
      .setDescription('Configura o cargo de suporte')
      .addRoleOption((o) =>
        o.setName('cargo')
          .setDescription('Cargo da equipe de suporte (ou deixe vazio para criar automaticamente)')
          .setRequired(false),   // ← tornou opcional
      ),
  )
  // ── remover ──
  .addSubcommand((s) =>
    s.setName('remover').setDescription('Remove todo o sistema de tickets do servidor'),
  )
  // ── reset ──
  .addSubcommand((s) =>
    s.setName('reset').setDescription('Reseta (zera) todos os tickets do servidor'),
  );

export async function execute(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const guildId = guild.id;
  const sub = interaction.options.getSubcommand();

  // ════════════════════════════════
  // /ticket setup
  // ════════════════════════════════
  if (sub === 'setup') {
    const config = getConfig(guildId);

    // Reutiliza categoria existente ou cria nova
    let categoria = guild.channels.cache.find(
      (c) => c.type === ChannelType.GuildCategory && c.name === CATEGORIA_NOME,
    );
    if (!categoria) {
      categoria = await guild.channels.create({
        name: CATEGORIA_NOME,
        type: ChannelType.GuildCategory,
      });
    }

    // Canal de abertura
    let canalAbertura = guild.channels.cache.find(
      (c) => c.parentId === categoria.id && c.name === CANAL_ABERTURA,
    );
    if (!canalAbertura) {
      canalAbertura = await guild.channels.create({
        name: CANAL_ABERTURA,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['SendMessages', 'CreatePublicThreads'],
            allow: ['ViewChannel', 'ReadMessageHistory'],
            type: OverwriteType.Role,
          },
        ],
      });
      // Envia o embed com o select menu
      await canalAbertura.send(criarMensagemAbertura());
    }

    // Canal de logs
    let canalLogs = guild.channels.cache.find(
      (c) => c.parentId === categoria.id && c.name === CANAL_LOGS,
    );
    if (!canalLogs) {
      canalLogs = await guild.channels.create({
        name: CANAL_LOGS,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: ['ViewChannel'],
            type: OverwriteType.Role,
          },
        ],
      });
    }

    // Salva IDs no config
    setConfig(guildId, 'ticket_categoria_id', categoria.id);
    setConfig(guildId, 'ticket_abertura_id', canalAbertura.id);
    setConfig(guildId, 'ticket_logs_id', canalLogs.id);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Sistema de Tickets Configurado!')
          .addFields(
            { name: '📁 Categoria',      value: CATEGORIA_NOME,               inline: true },
            { name: '🎫 Abertura',        value: `<#${canalAbertura.id}>`,     inline: true },
            { name: '📋 Logs',            value: `<#${canalLogs.id}>`,         inline: true },
          )
          .setColor(0x2ecc71)
          .setTimestamp(),
      ],
    });
  }

  // ════════════════════════════════
  // /ticket configurar cargo
  // ════════════════════════════════
  if (sub === 'configurar') {
    let cargo = interaction.options.getRole('cargo');

    // Cria automaticamente se não for passado
    if (!cargo) {
      cargo = await guild.roles.create({
        name: 'Suporte',
        color: 'DarkGreen',   // verde escuro
        reason: 'Cargo de suporte automático para tickets',
      });
    }

    setConfig(guildId, 'ticket_cargo_suporte', cargo.id);

    // Atualiza permissões do canal de logs para o cargo de suporte
    const config = getConfig(guildId);
    if (config.ticket_logs_id) {
      const canalLogs = guild.channels.cache.get(config.ticket_logs_id);
      if (canalLogs) {
        await canalLogs.permissionOverwrites.edit(cargo, {
          ViewChannel: true,
          ReadMessageHistory: true,
          SendMessages: false,
        });
      }
    }

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('✅ Cargo de Suporte Definido')
          .setDescription(`O cargo ${cargo} agora pode assumir e fechar tickets.`)
          .setColor(0x3498db)
          .setTimestamp(),
      ],
    });
  }

  // ════════════════════════════════
  // /ticket remover
  // ════════════════════════════════
  if (sub === 'remover') {
    const config = getConfig(guildId);
    const categoriaId = config.ticket_categoria_id;

    if (!categoriaId) {
      return interaction.editReply('⚠️ Nenhum sistema de tickets encontrado neste servidor.');
    }

    // Deleta todos os canais dentro da categoria
    const categoria = guild.channels.cache.get(categoriaId);
    if (categoria) {
      const filhos = guild.channels.cache.filter((c) => c.parentId === categoriaId);
      for (const canal of filhos.values()) {
        try { await canal.delete('Sistema de tickets removido'); } catch {}
      }
      try { await categoria.delete('Sistema de tickets removido'); } catch {}
    }

    // Limpa config
    setConfig(guildId, 'ticket_categoria_id', null);
    setConfig(guildId, 'ticket_abertura_id', null);
    setConfig(guildId, 'ticket_logs_id', null);
    setConfig(guildId, 'ticket_cargo_suporte', null);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🗑️ Sistema de Tickets Removido')
          .setDescription('Todos os canais, categoria e configurações foram removidos.')
          .setColor(0xe74c3c)
          .setTimestamp(),
      ],
    });
  }

  // ════════════════════════════════
  // /ticket reset
  // ════════════════════════════════
  if (sub === 'reset') {
    const config = getConfig(guildId);
    const categoriaId = config.ticket_categoria_id;

    if (!categoriaId) {
      return interaction.editReply('⚠️ Nenhum sistema de tickets encontrado neste servidor.');
    }

    resetarTickets(guildId);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle('🔄 Tickets Resetados')
          .setDescription('Todos os tickets do servidor foram removidos do histórico. Os canais de atendimento **não** foram deletados.')
          .setColor(0xf39c12)
          .setTimestamp(),
      ],
    });
  }
}