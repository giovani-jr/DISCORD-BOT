import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, MessageFlags } from 'discord.js';
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

  // Verifica permissão (admin_role ou permissão de administrador)
  const adminRole = config.admin_role;
  const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  const temCargo = adminRole && interaction.member.roles.cache.has(adminRole);
  if (!isAdmin && !temCargo) {
    return interaction.reply({ 
      content: '❌ Você não tem permissão para usar este comando!', 
      flags: MessageFlags.Ephemeral 
    });
  }

  // deferReply efêmero para todas as ações
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const membro = interaction.options.getMember('membro');
  const motivo = interaction.options.getString('motivo') || 'Sem motivo informado';
  const autor = interaction.user;

  let acao = '';
  let cor = '';
  let emoji = '';

  try {
    if (sub === 'kick') {
      await membro.kick(motivo);
      acao = 'Expulso';
      cor = 'Orange';
      emoji = '👢';
    } 
    else if (sub === 'ban') {
      await membro.ban({ reason: motivo });
      acao = 'Banido';
      cor = 'Red';
      emoji = '🔨';
    } 
    else if (sub === 'mute') {
      const minutos = interaction.options.getInteger('minutos');
      const duracao = minutos * 60 * 1000;
      await membro.timeout(duracao, motivo);
      acao = 'Silenciado';
      cor = 'Yellow';
      emoji = '🔇';
    }

    // Embed de confirmação (efêmera)
    const embedConfirmacao = new EmbedBuilder()
      .setTitle(`${emoji} Membro ${acao}`)
      .setColor(cor)
      .addFields(
        { name: '👤 Membro', value: `${membro.user.tag} (${membro.id})`, inline: true },
        { name: '📋 Motivo', value: motivo, inline: true },
        { name: '🔨 Moderador', value: `${autor.tag}`, inline: true },
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embedConfirmacao] });

    // Log no canal de log, se existir
    const logChannelId = config.log_channel;
    if (logChannelId) {
      const logChannel = interaction.guild.channels.cache.get(logChannelId);
      if (logChannel) {
        // Botão de revogação (apenas para ban e mute)
        const components = [];
        if (sub === 'ban' || sub === 'mute') {
          const button = new ButtonBuilder()
            .setCustomId(`revogar_${sub}_${membro.id}`)
            .setLabel('Revogar')
            .setEmoji('↩️')
            .setStyle(ButtonStyle.Danger);
          components.push(new ActionRowBuilder().addComponents(button));
        }

        const embedLog = new EmbedBuilder()
          .setTitle(`${emoji} Registro de Moderação`)
          .setColor(cor)
          .addFields(
            { name: '👤 Membro', value: `${membro.user.tag} (${membro.id})`, inline: true },
            { name: '📋 Motivo', value: motivo, inline: true },
            { name: '🔨 Moderador', value: `${autor.tag}`, inline: true },
            { name: '📅 Data', value: new Date().toLocaleString('pt-BR'), inline: true },
          )
          .setTimestamp();

        await logChannel.send({ embeds: [embedLog], components });
      }
    }
  } catch (err) {
    console.error(err);
    await interaction.editReply({ content: `❌ Não foi possível executar a ação. Verifique as permissões do bot.` });
  }
}