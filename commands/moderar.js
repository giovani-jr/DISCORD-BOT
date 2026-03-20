import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('moderar')
  .setDescription('Comandos de moderação do servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('kick')
    .setDescription('Expulsa um membro do servidor')
    .addUserOption(opt => opt
      .setName('membro')
      .setDescription('Selecione o membro')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('motivo')
      .setDescription('Motivo da expulsão')
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('ban')
    .setDescription('Bane um membro do servidor')
    .addUserOption(opt => opt
      .setName('membro')
      .setDescription('Selecione o membro')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('motivo')
      .setDescription('Motivo do banimento')
      .setRequired(false)))
  .addSubcommand(sub => sub
    .setName('mute')
    .setDescription('Silencia um membro temporariamente')
    .addUserOption(opt => opt
      .setName('membro')
      .setDescription('Selecione o membro')
      .setRequired(true))
    .addIntegerOption(opt => opt
      .setName('minutos')
      .setDescription('Duração do mute em minutos')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(1440))
    .addStringOption(opt => opt
      .setName('motivo')
      .setDescription('Motivo do mute')
      .setRequired(false)));

export async function execute(interaction) {
  const guildId = interaction.guildId;
  const sub = interaction.options.getSubcommand();
  const config = getConfig(guildId);

  // Verifica se quem usou o comando tem o cargo admin configurado
  const adminRole = config.admin_role;
  if (adminRole && !interaction.member.roles.cache.has(adminRole)) {
    await interaction.reply({ 
      content: '❌ Você não tem permissão para usar este comando!', 
      ephemeral: true 
    });
    return;
  }

  if (sub === 'kick') {
    const membro = interaction.options.getMember('membro');
    const motivo = interaction.options.getString('motivo') || 'Sem motivo informado';

    try {
      await membro.kick(motivo);

      const embed = new EmbedBuilder()
        .setTitle('👢 Membro Expulso')
        .setColor('Orange')
        .addFields(
          { name: '👤 Membro', value: `${membro.user.tag}` },
          { name: '📋 Motivo', value: motivo },
          { name: '🔨 Moderador', value: `${interaction.user.tag}` },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ 
        content: '❌ Não foi possível expulsar o membro!', 
        ephemeral: true 
      });
    }
  }

  if (sub === 'ban') {
    const membro = interaction.options.getMember('membro');
    const motivo = interaction.options.getString('motivo') || 'Sem motivo informado';

    try {
      await membro.ban({ reason: motivo });

      const embed = new EmbedBuilder()
        .setTitle('🔨 Membro Banido')
        .setColor('Red')
        .addFields(
          { name: '👤 Membro', value: `${membro.user.tag}` },
          { name: '📋 Motivo', value: motivo },
          { name: '🔨 Moderador', value: `${interaction.user.tag}` },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ 
        content: '❌ Não foi possível banir o membro!', 
        ephemeral: true 
      });
    }
  }

  if (sub === 'mute') {
    const membro = interaction.options.getMember('membro');
    const minutos = interaction.options.getInteger('minutos');
    const motivo = interaction.options.getString('motivo') || 'Sem motivo informado';
    const duracao = minutos * 60 * 1000;

    try {
      await membro.timeout(duracao, motivo);

      const embed = new EmbedBuilder()
        .setTitle('🔇 Membro Silenciado')
        .setColor('Yellow')
        .addFields(
          { name: '👤 Membro', value: `${membro.user.tag}` },
          { name: '⏱️ Duração', value: `${minutos} minuto(s)` },
          { name: '📋 Motivo', value: motivo },
          { name: '🔨 Moderador', value: `${interaction.user.tag}` },
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
    } catch (err) {
      await interaction.reply({ 
        content: '❌ Não foi possível silenciar o membro!', 
        ephemeral: true 
      });
    }
  }
}