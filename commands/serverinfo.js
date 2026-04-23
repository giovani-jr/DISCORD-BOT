import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('serverinfo')
  .setDescription('Exibe informações do servidor');

export async function execute(interaction) {
  const guild = interaction.guild;
  await guild.fetch();

  const totalMembros = guild.memberCount;
  const totalBots = guild.members.cache.filter(m => m.user.bot).size;
  const totalHumanos = totalMembros - totalBots;
  const totalCanais = guild.channels.cache.size;
  const totalCargos = guild.roles.cache.size;
  const totalEmojis = guild.emojis.cache.size;

  const nivelVerificacao = {
    0: 'Nenhum',
    1: 'Baixo',
    2: 'Médio',
    3: 'Alto',
    4: 'Muito Alto',
  };

  const embed = new EmbedBuilder()
    .setTitle(`📊 Informações do servidor`)
    .setThumbnail(guild.iconURL({ size: 256 }))
    .setColor('Blue')
    .addFields(
      { name: '🏷️ Nome', value: guild.name, inline: true },
      { name: '🪪 ID', value: guild.id, inline: true },
      { name: '👑 Dono', value: `<@${guild.ownerId}>`, inline: true },
      { name: '👥 Membros', value: `${totalHumanos} humanos | ${totalBots} bots`, inline: true },
      { name: '📢 Canais', value: `${totalCanais}`, inline: true },
      { name: '🎭 Cargos', value: `${totalCargos}`, inline: true },
      { name: '😄 Emojis', value: `${totalEmojis}`, inline: true },
      { name: '🔒 Verificação', value: nivelVerificacao[guild.verificationLevel], inline: true },
      { name: '📅 Criado em', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
    )
    .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}