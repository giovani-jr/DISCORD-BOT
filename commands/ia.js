import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const data = new SlashCommandBuilder()
  .setName('ia')
  .setDescription('Faca uma pergunta para a IA')
  .addStringOption(opt => opt
    .setName('pergunta')
    .setDescription('O que voce quer perguntar?')
    .setRequired(true));

export async function execute(interaction) {
  await interaction.deferReply();

  const pergunta = interaction.options.getString('pergunta');

  try {
    // Inicializa o Gemini dentro da função para garantir que o .env já foi carregado
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(pergunta);
    const resposta = result.response.text();

    const respostaTruncada = resposta.length > 4000
      ? resposta.substring(0, 4000) + '...'
      : resposta;

    const embed = new EmbedBuilder()
      .setTitle('ZAPPY IA')
      .setColor('Blue')
      .setDescription(`**Pergunta:** ${pergunta}\n\n**Resposta:**\n${respostaTruncada}`)
      .setFooter({ text: `Perguntado por ${interaction.user.tag} - Powered by Google Gemini` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('Erro ao chamar Gemini:', err);
    await interaction.editReply({
      content: 'Nao foi possivel obter uma resposta da IA no momento. Tente novamente!',
    });
  }
}