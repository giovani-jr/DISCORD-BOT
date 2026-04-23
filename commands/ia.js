import { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Armazena o histórico de cada canal de IA
export const historicoChats = new Map();

// Cooldowns
const cooldownsPerguntar = new Map(); // userId -> array de timestamps (máx 2 por minuto)
const cooldownsChat = new Map();      // userId -> timestamp da última mensagem no chat

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
    const agora = Date.now();
    const timestamps = cooldownsPerguntar.get(interaction.user.id) || [];

    // Remove timestamps mais antigos que 1 minuto
    const recentes = timestamps.filter(t => agora - t < 60_000);

    if (recentes.length >= 2) {
      return interaction.reply({
        content: '⏳ Você já fez 2 perguntas no último minuto. Aguarde um pouco antes de perguntar novamente.',
        flags: MessageFlags.Ephemeral,
      });
    }

    recentes.push(agora);
    cooldownsPerguntar.set(interaction.user.id, recentes);

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

      historicoChats.set(canal.id, []);

      const embed = new EmbedBuilder()
        .setTitle('Chat de IA iniciado!')
        .setColor('Green')
        .setDescription(`Ola ${interaction.user}! Seu chat privado com a IA foi criado.\n\nDigite suas perguntas diretamente aqui e a IA respondera mantendo o contexto da conversa.\n\nPara encerrar use \`/ia encerrar\`\n\n⏱️ Cooldown: 20 segundos entre mensagens.`)
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
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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
      cooldownsChat.delete(interaction.user.id);
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

  // Cooldown de 20 segundos entre mensagens no chat
  const agora = Date.now();
  const ultimoUso = cooldownsChat.get(message.author.id) || 0;
  const restante = 20_000 - (agora - ultimoUso);

  if (restante > 0) {
    const segundos = Math.ceil(restante / 1000);
    const aviso = await message.reply(`⏳ Aguarde **${segundos}s** antes de enviar outra mensagem.`);
    // Apaga o aviso e a mensagem original após 3 segundos (opcional, mas limpo)
    setTimeout(() => {
      aviso.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 3000);
    return;
  }

  cooldownsChat.set(message.author.id, agora);

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const historico = historicoChats.get(message.channel.id);

    historico.push({
      role: 'user',
      parts: [{ text: message.content }],
    });

    const chat = model.startChat({ history: historico.slice(0, -1) });
    const result = await chat.sendMessage(message.content);
    const resposta = result.response.text();

    historico.push({
      role: 'model',
      parts: [{ text: resposta }],
    });

    if (historico.length > 20) historico.splice(0, 2);

    historicoChats.set(message.channel.id, historico);

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