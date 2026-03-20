import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Verifica a latência do bot');

export async function execute(interaction) {
  const sent = await interaction.deferReply({ fetchReply: true });
  
  const latencia = sent.createdTimestamp - interaction.createdTimestamp;
  const apiLatencia = Math.round(interaction.client.ws.ping);

  const embed = new EmbedBuilder()
    .setTitle('🏓 Pong!')
    .setColor('Green')
    .addFields(
      { name: '⏱️ Latência do bot', value: `${latencia}ms`, inline: true },
      { name: '💓 Latência da API', value: `${apiLatencia}ms`, inline: true },
    )
    .setTimestamp();

  await interaction.editReply({ embeds: [embed] });
}