import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('slowmode')
  .setDescription('Ativa ou desativa o modo lento no canal')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('ativar')
    .setDescription('Ativa o modo lento no canal')
    .addIntegerOption(opt => opt
      .setName('segundos')
      .setDescription('Intervalo em segundos entre mensagens (1-21600)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(21600)))
  .addSubcommand(sub => sub
    .setName('desativar')
    .setDescription('Desativa o modo lento no canal'));

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

  if (sub === 'ativar') {
    const segundos = interaction.options.getInteger('segundos');

    await interaction.channel.setRateLimitPerUser(segundos);

    const formatarTempo = (seg) => {
      if (seg < 60) return `${seg} segundo(s)`;
      if (seg < 3600) return `${Math.floor(seg / 60)} minuto(s)`;
      return `${Math.floor(seg / 3600)} hora(s)`;
    };

    const embed = new EmbedBuilder()
      .setTitle('🐌 Modo Lento Ativado')
      .setColor('Orange')
      .addFields(
        { name: '⏱️ Intervalo', value: formatarTempo(segundos) },
        { name: '📢 Canal', value: `${interaction.channel}` },
        { name: '🔨 Moderador', value: interaction.user.tag },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }

  if (sub === 'desativar') {
    await interaction.channel.setRateLimitPerUser(0);

    const embed = new EmbedBuilder()
      .setTitle('✅ Modo Lento Desativado')
      .setColor('Green')
      .addFields(
        { name: '📢 Canal', value: `${interaction.channel}` },
        { name: '🔨 Moderador', value: interaction.user.tag },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
}