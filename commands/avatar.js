import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('avatar')
  .setDescription('Exibe o avatar de um membro')
  .addUserOption(opt => opt
    .setName('membro')
    .setDescription('Selecione o membro')
    .setRequired(false));

export async function execute(interaction) {
  const membro = interaction.options.getUser('membro') || interaction.user;

  const avatarUrl = membro.displayAvatarURL({ size: 512, extension: 'png' });

  const embed = new EmbedBuilder()
    .setTitle(`🖼️ Avatar de ${membro.tag}`)
    .setImage(avatarUrl)
    .setColor('Blue')
    .addFields(
      { name: '🔗 Link', value: `[Clique aqui](${avatarUrl})` },
    )
    .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}