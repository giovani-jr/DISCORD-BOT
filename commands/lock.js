import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('lock')
  .setDescription('Bloqueia ou desbloqueia um canal')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('bloquear')
    .setDescription('Bloqueia o canal para membros')
    .addStringOption(opt => opt
      .setName('motivo')
      .setDescription('Motivo do bloqueio')
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('desbloquear')
    .setDescription('Desbloqueia o canal para membros')
    .addStringOption(opt => opt
      .setName('motivo')
      .setDescription('Motivo do desbloqueio')
      .setRequired(false)));

export async function execute(interaction) {
  const config = getConfig(interaction.guildId);
  const adminRole = config.admin_role;

  if (adminRole && !interaction.member.roles.cache.has(adminRole)) {
    await interaction.reply({
      content: '❌ Você não tem permissão para usar este comando!',
      ephemeral: true
    });
    return;
  }

  const sub = interaction.options.getSubcommand();
  const motivo = interaction.options.getString('motivo') || 'Sem motivo informado';

  // Pega o cargo @everyone do servidor
  const everyoneRole = interaction.guild.roles.everyone;

  if (sub === 'bloquear') {
    await interaction.channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: false,
    });

    const embed = new EmbedBuilder()
      .setTitle('🔒 Canal Bloqueado')
      .setColor('Red')
      .addFields(
        { name: '📢 Canal', value: `${interaction.channel}` },
        { name: '📋 Motivo', value: motivo },
        { name: '🔨 Moderador', value: interaction.user.tag },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log no canal de log
    const logChannel = interaction.guild.channels.cache.get(config.log_channel);
    if (logChannel) logChannel.send({ embeds: [embed] });
  }

  if (sub === 'desbloquear') {
    await interaction.channel.permissionOverwrites.edit(everyoneRole, {
      SendMessages: null,
    });

    const embed = new EmbedBuilder()
      .setTitle('🔓 Canal Desbloqueado')
      .setColor('Green')
      .addFields(
        { name: '📢 Canal', value: `${interaction.channel}` },
        { name: '📋 Motivo', value: motivo },
        { name: '🔨 Moderador', value: interaction.user.tag },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });

    // Log no canal de log
    const logChannel = interaction.guild.channels.cache.get(config.log_channel);
    if (logChannel) logChannel.send({ embeds: [embed] });
  }
}