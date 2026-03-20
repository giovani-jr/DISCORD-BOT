import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { setConfig, getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('configurar')
  .setDescription('Configura o bot para este servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('boas-vindas')
    .setDescription('Canal de boas-vindas')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Selecione o canal')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('cargo-inicial')
    .setDescription('Cargo dado a novos membros')
    .addRoleOption(opt => opt
      .setName('cargo')
      .setDescription('Selecione o cargo')
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('log-voz')
    .setDescription('Canal de logs de voz')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Selecione o canal')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('avisos')
    .setDescription('Canal de avisos')
    .addChannelOption(opt => opt
      .setName('canal')
      .setDescription('Selecione o canal')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('cargo-admin')
    .setDescription('Cargo de administrador')
    .addRoleOption(opt => opt
      .setName('cargo')
      .setDescription('Selecione o cargo')
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('status')
    .setDescription('Mostra as configurações atuais do servidor'));

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();

  if (sub === 'boas-vindas') {
    const canal = interaction.options.getChannel('canal');
    setConfig(guildId, 'welcome_channel', canal.id);
    await interaction.reply(`✅ Canal de boas-vindas definido para ${canal}`);
  }

  if (sub === 'cargo-inicial') {
    const cargo = interaction.options.getRole('cargo');
    setConfig(guildId, 'welcome_role', cargo.id);
    await interaction.reply(`✅ Cargo inicial definido para ${cargo}`);
  }

  if (sub === 'log-voz') {
    const canal = interaction.options.getChannel('canal');
    setConfig(guildId, 'log_channel', canal.id);
    await interaction.reply(`✅ Canal de log de voz definido para ${canal}`);
  }

  if (sub === 'avisos') {
    const canal = interaction.options.getChannel('canal');
    setConfig(guildId, 'notify_channel', canal.id);
    await interaction.reply(`✅ Canal de avisos definido para ${canal}`);
  }

  if (sub === 'cargo-admin') {
    const cargo = interaction.options.getRole('cargo');
    setConfig(guildId, 'admin_role', cargo.id);
    await interaction.reply(`✅ Cargo de admin definido para ${cargo}`);
  }

  if (sub === 'status') {
    const config = getConfig(guildId);

    const canal_boas_vindas = config.welcome_channel ? `<#${config.welcome_channel}>` : '❌ Não configurado';
    const cargo_inicial = config.welcome_role ? `<@&${config.welcome_role}>` : '❌ Não configurado';
    const canal_log = config.log_channel ? `<#${config.log_channel}>` : '❌ Não configurado';
    const canal_avisos = config.notify_channel ? `<#${config.notify_channel}>` : '❌ Não configurado';
    const cargo_admin = config.admin_role ? `<@&${config.admin_role}>` : '❌ Não configurado';

    const embed = new EmbedBuilder()
      .setTitle('⚙️ Configurações do Servidor')
      .setColor('Blue')
      .addFields(
        { name: '📢 Canal de boas-vindas', value: canal_boas_vindas },
        { name: '🎭 Cargo inicial', value: cargo_inicial },
        { name: '🎧 Canal de log de voz', value: canal_log },
        { name: '📣 Canal de avisos', value: canal_avisos },
        { name: '👑 Cargo admin', value: cargo_admin },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}