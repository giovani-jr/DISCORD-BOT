import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('enquete')
  .setDescription('Cria uma enquete no canal')
  .addStringOption(opt => opt
    .setName('pergunta')
    .setDescription('A pergunta da enquete')
    .setRequired(true))
  .addStringOption(opt => opt
    .setName('opcao1')
    .setDescription('Primeira opção')
    .setRequired(true))
  .addStringOption(opt => opt
    .setName('opcao2')
    .setDescription('Segunda opção')
    .setRequired(true))
  .addStringOption(opt => opt
    .setName('opcao3')
    .setDescription('Terceira opção')
    .setRequired(false))
  .addStringOption(opt => opt
    .setName('opcao4')
    .setDescription('Quarta opção')
    .setRequired(false));

export async function execute(interaction) {
  const pergunta = interaction.options.getString('pergunta');
  const opcao1 = interaction.options.getString('opcao1');
  const opcao2 = interaction.options.getString('opcao2');
  const opcao3 = interaction.options.getString('opcao3');
  const opcao4 = interaction.options.getString('opcao4');

  const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣'];
  const opcoes = [opcao1, opcao2, opcao3, opcao4].filter(Boolean);

  const descricao = opcoes
    .map((opcao, index) => `${emojis[index]} ${opcao}`)
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${pergunta}`)
    .setDescription(descricao)
    .setColor('Blue')
    .setFooter({ text: `Enquete criada por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });

  // Busca a mensagem enviada e adiciona as reações
  const mensagem = await interaction.fetchReply();
  for (let i = 0; i < opcoes.length; i++) {
    await mensagem.react(emojis[i]);
  }
}