import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, MessageFlags } from 'discord.js';
import { setConfig, getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('configurar')
  .setDescription('Configura o bot para este servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('bate-papo')
    .setDescription('Canal de bate-papo (boas-vindas)')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Selecione o canal (ou deixe vazio para criar automaticamente)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('cargo-inicial')
    .setDescription('Cargo dado a novos membros')
    .addRoleOption(opt => opt
      .setName('cargo')
      .setDescription('Selecione o cargo (ou deixe vazio para criar automaticamente)')
      .setRequired(false)))   // ← tornou opcional
  .addSubcommand(sub => sub
    .setName('log-servidor')
    .setDescription('Canal de logs do servidor')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Selecione o canal (ou deixe vazio para criar automaticamente)')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('cargo-admin')
    .setDescription('Cargo de administrador')
    .addRoleOption(opt => opt
      .setName('cargo')
      .setDescription('Selecione o cargo (ou deixe vazio para criar automaticamente)')
      .setRequired(false)))   // ← tornou opcional
  .addSubcommand(sub => sub
    .setName('status')
    .setDescription('Mostra as configurações atuais do servidor'));

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();
  const config = getConfig(guildId);

  // Para comandos que podem criar recursos (canais ou cargos), fazemos deferReply
  if (['bate-papo', 'log-servidor', 'cargo-inicial', 'cargo-admin'].includes(sub)) {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  }

  if (sub === 'bate-papo') {
    let canal = interaction.options.getChannel('canal');
    
    if (!canal) {
      canal = await interaction.guild.channels.create({
        name: '📢-bate-papo',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            type: 0,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
            deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions],
          },
          ...(config.admin_role ? [{
            id: config.admin_role,
            type: 0,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.SendMessages],
          }] : []),
          {
            id: interaction.guild.members.me.id,
            type: 1,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
          },
        ],
      });
    }

    setConfig(guildId, 'welcome_channel', canal.id);
    await interaction.editReply(`✅ Canal de bate-papo definido para ${canal}`);
    return;
  }

  if (sub === 'cargo-inicial') {
    let cargo = interaction.options.getRole('cargo');

    if (!cargo) {
      cargo = await interaction.guild.roles.create({
        name: 'Membro',
        color: 'Green',
        reason: 'Cargo inicial automático para novos membros',
      });
    }

    setConfig(guildId, 'welcome_role', cargo.id);
    await interaction.editReply(`✅ Cargo inicial definido para ${cargo}`);
    return;
  }

  if (sub === 'log-servidor') {
    let canal = interaction.options.getChannel('canal');

    if (!canal) {
      canal = await interaction.guild.channels.create({
        name: '📋-log-servidor',
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone.id,
            type: 0,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          ...(config.admin_role ? [{
            id: config.admin_role,
            type: 0,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
          }] : []),
          {
            id: interaction.guild.members.me.id,
            type: 1,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels],
          },
        ],
      });
    }

    setConfig(guildId, 'log_channel', canal.id);
    await interaction.editReply(`✅ Canal de log do servidor definido para ${canal}`);
    return;
  }

  if (sub === 'cargo-admin') {
    let cargo = interaction.options.getRole('cargo');

    if (!cargo) {
      cargo = await interaction.guild.roles.create({
        name: 'Administração',
        color: 'Red',
        permissions: [PermissionFlagsBits.Administrator],
        reason: 'Cargo de administrador automático',
      });
    }

    setConfig(guildId, 'admin_role', cargo.id);
    await interaction.editReply(`✅ Cargo de admin definido para ${cargo}`);
    return;
  }

  if (sub === 'status') {
    const canal_bate_papo = config.welcome_channel ? `<#${config.welcome_channel}>` : '❌ Não configurado';
    const cargo_inicial = config.welcome_role ? `<@&${config.welcome_role}>` : '❌ Não configurado';
    const canal_log = config.log_channel ? `<#${config.log_channel}>` : '❌ Não configurado';
    const canal_avisos = config.notify_channel ? `<#${config.notify_channel}>` : '❌ Não configurado';
    const cargo_admin = config.admin_role ? `<@&${config.admin_role}>` : '❌ Não configurado';

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configurações do Servidor')
      .setColor('Blue')
      .addFields(
        { name: '💬 Canal de bate-papo', value: canal_bate_papo },
        { name: '🎭 Cargo inicial', value: cargo_inicial },
        { name: '📋 Canal de log do servidor', value: canal_log },
        { name: '📣 Canal de avisos', value: canal_avisos },
        { name: '👑 Cargo admin', value: cargo_admin },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  }
}