import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('dado')
  .setDescription('Rola um dado personalizado')
  .addStringOption(opt => opt
    .setName('tipo')
    .setDescription('Tipo do dado (ex: 1d6, 2d20, 3d8)')
    .setRequired(false));

export async function execute(interaction) {
  const tipo = interaction.options.getString('tipo') || '1d6';

  if (!/^\d+d\d+$/i.test(tipo)) {
    await interaction.reply({
      content: '❌ Formato inválido! Use o formato `NdN` (ex: `1d6`, `2d20`, `3d8`)',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const [quantidade, lados] = tipo.toLowerCase().split('d').map(Number);

  if (quantidade > 20) {
    await interaction.reply({
      content: '❌ Máximo de 20 dados por vez!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  if (lados > 1000) {
    await interaction.reply({
      content: '❌ Máximo de 1000 lados por dado!',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const resultados = Array.from({ length: quantidade }, () =>
    Math.floor(Math.random() * lados) + 1
  );

  const total = resultados.reduce((a, b) => a + b, 0);
  const listaResultados = resultados.join(', ');

  const embed = new EmbedBuilder()
    .setTitle('🎲 Rolagem de Dados')
    .setColor('Blue')
    .addFields(
      { name: '🎯 Dado', value: tipo.toUpperCase(), inline: true },
      { name: '🔢 Resultados', value: listaResultados, inline: true },
      { name: '➕ Total', value: `${total}`, inline: true },
    )
    .setFooter({ text: `Rolado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}