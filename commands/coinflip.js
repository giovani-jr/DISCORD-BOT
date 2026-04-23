import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('coinflip')
  .setDescription('Lança uma moeda — cara ou coroa!');

export async function execute(interaction) {
  const resultado = Math.random() < 0.5 ? 'Cara' : 'Coroa';
  const emoji = resultado === 'Cara' ? '🪙' : '💿';

  const embed = new EmbedBuilder()
    .setTitle('🪙 Lançamento de Moeda')
    .setDescription(`${emoji} **${resultado}!**`)
    .setColor(resultado === 'Cara' ? 'Gold' : 'Grey')
    .setFooter({ text: `Lançado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral  });
}