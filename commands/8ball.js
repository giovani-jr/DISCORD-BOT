import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('8ball')
  .setDescription('Consulte a bola mágica!')
  .addStringOption(opt => opt
    .setName('pergunta')
    .setDescription('Faça sua pergunta')
    .setRequired(true));

export async function execute(interaction) {
  const pergunta = interaction.options.getString('pergunta');

  const respostas = [
    // Positivas
    { texto: 'Com certeza!', cor: 'Green', emoji: '✅' },
    { texto: 'Definitivamente sim!', cor: 'Green', emoji: '✅' },
    { texto: 'Sem dúvidas!', cor: 'Green', emoji: '✅' },
    { texto: 'Sim, pode contar!', cor: 'Green', emoji: '✅' },
    { texto: 'As perspectivas são boas!', cor: 'Green', emoji: '✅' },
    // Neutras
    { texto: 'Difícil dizer agora...', cor: 'Yellow', emoji: '🤔' },
    { texto: 'Concentre-se e pergunte novamente.', cor: 'Yellow', emoji: '🤔' },
    { texto: 'Não posso prever agora.', cor: 'Yellow', emoji: '🤔' },
    { texto: 'As respostas não estão claras.', cor: 'Yellow', emoji: '🤔' },
    { texto: 'Melhor não te dizer agora.', cor: 'Yellow', emoji: '🤔' },
    // Negativas
    { texto: 'Não conte com isso.', cor: 'Red', emoji: '❌' },
    { texto: 'Minha resposta é não.', cor: 'Red', emoji: '❌' },
    { texto: 'As perspectivas não são boas.', cor: 'Red', emoji: '❌' },
    { texto: 'Muito duvidoso.', cor: 'Red', emoji: '❌' },
    { texto: 'Definitivamente não!', cor: 'Red', emoji: '❌' },
  ];

  const resposta = respostas[Math.floor(Math.random() * respostas.length)];

  const embed = new EmbedBuilder()
    .setTitle('🎱 Bola Mágica')
    .setColor(resposta.cor)
    .addFields(
      { name: '❓ Pergunta', value: pergunta },
      { name: `${resposta.emoji} Resposta`, value: resposta.texto },
    )
    .setFooter({ text: `Consultado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}