import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Armazena o histórico de cada canal de IA
export const historicoChats = new Map();

export const data = new SlashCommandBuilder()
  .setName('ia')
  .setDescription('Comandos de Inteligencia Artificial')
  .addSubcommand(sub => sub
    .setName('perguntar')
    .setDescription('Faca uma pergunta rapida para a IA')
    .addStringOption(opt => opt
      .setName('pergunta')
      .setDescription('O que voce quer perguntar?')
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('iniciar')
    .setDescription('Inicia um chat privado com a IA'))
  .addSubcommand(sub => sub
    .setName('encerrar')
    .setDescription('Encerra o chat privado com a IA'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();

  // ── Pergunta rápida ──
  if (sub === 'perguntar') {
    await interaction.deferReply();
    const pergunta = interaction.options.getString('pergunta');

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const result = await model.generateContent(pergunta);
      const resposta = result.response.text();

      const respostaTruncada = resposta.length > 3900
        ? resposta.substring(0, 3900) + '...'
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

  // ── Iniciar chat privado ──
  if (sub === 'iniciar') {
    await interaction.deferReply({ ephemeral: true });

    // Verifica se já tem um canal aberto
    const canalExistente = interaction.guild.channels.cache.find(
      c => c.name === `ia-${interaction.user.username.toLowerCase()}`
    );

    if (canalExistente) {
      await interaction.editReply({
        content: `Voce ja tem um canal de chat aberto! ${canalExistente}`,
      });
      return;
    }

    try {
      // Cria o canal privado
      const canal = await interaction.guild.channels.create({
        name: `ia-${interaction.user.username.toLowerCase()}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
          {
            id: interaction.client.user.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
          },
        ],
      });

      // Inicializa o histórico do chat
      historicoChats.set(canal.id, []);

      const embed = new EmbedBuilder()
        .setTitle('Chat de IA iniciado!')
        .setColor('Green')
        .setDescription(`Ola ${interaction.user}! Seu chat privado com a IA foi criado.\n\nDigite suas perguntas diretamente aqui e a IA respondera mantendo o contexto da conversa.\n\nPara encerrar use \`/ia encerrar\``)
        .setFooter({ text: 'Powered by Google Gemini' })
        .setTimestamp();

      await canal.send({ embeds: [embed] });
      await interaction.editReply({ content: `Canal criado com sucesso! ${canal}` });

    } catch (err) {
      console.error('Erro ao criar canal de IA:', err);
      await interaction.editReply({
        content: 'Nao foi possivel criar o canal de chat. Verifique as permissoes do bot!',
      });
    }
  }

  // ── Encerrar chat ──
  if (sub === 'encerrar') {
    await interaction.deferReply({ ephemeral: true });

    // Busca o canal pelo tópico ou por canais que começam com 'ia-'
    const canal = interaction.guild.channels.cache.find(
      c => c.name.startsWith('ia-') && 
      c.permissionOverwrites.cache.has(interaction.user.id)
    );

    if (!canal) {
      await interaction.editReply({
        content: 'Voce nao tem nenhum canal de chat aberto!',
      });
      return;
    }

    try {
      historicoChats.delete(canal.id);
      await interaction.editReply({ content: 'Canal encerrado com sucesso!' });
      await canal.delete();
    } catch (err) {
      console.error('Erro ao deletar canal de IA:', err);
      await interaction.editReply({
        content: 'Nao foi possivel encerrar o canal. Tente novamente!',
      });
    }
  }
}

// ── Função para responder mensagens no canal de IA ──
export async function handleIAMessage(message, historicoChats) {
  if (!historicoChats.has(message.channel.id)) return;
  if (message.author.bot) return;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Busca o histórico do canal
    const historico = historicoChats.get(message.channel.id);

    // Adiciona a mensagem do usuário ao histórico
    historico.push({
      role: 'user',
      parts: [{ text: message.content }],
    });

    // Inicia o chat com histórico
    const chat = model.startChat({ history: historico.slice(0, -1) });
    const result = await chat.sendMessage(message.content);
    const resposta = result.response.text();

    // Adiciona a resposta da IA ao histórico
    historico.push({
      role: 'model',
      parts: [{ text: resposta }],
    });

    // Limita o histórico a 20 mensagens para não estourar o limite da API
    if (historico.length > 20) historico.splice(0, 2);

    historicoChats.set(message.channel.id, historico);

    // Divide a resposta se for muito longa
    if (resposta.length > 2000) {
      const partes = resposta.match(/.{1,2000}/gs) || [];
      for (const parte of partes) {
        await message.channel.send(parte);
      }
    } else {
      await message.channel.send(resposta);
    }

  } catch (err) {
    console.error('Erro ao responder no canal de IA:', err);
    await message.channel.send('Nao foi possivel obter uma resposta no momento. Tente novamente!');
  }
}