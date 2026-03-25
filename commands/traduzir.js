import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Groq from 'groq-sdk';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idiomasPath = path.join(__dirname, '../data/idiomas.json');

// Cooldown por usuário — 10 segundos
const cooldowns = new Map();
const COOLDOWN_MS = 10_000;

export const data = new SlashCommandBuilder()
  .setName('traduzir')
  .setDescription('Traduz um texto usando IA')
  .addStringOption(opt => opt
    .setName('texto')
    .setDescription('Texto que deseja traduzir')
    .setRequired(true))
  .addStringOption(opt => opt
    .setName('idioma')
    .setDescription('Idioma de destino (ex: inglês, espanhol). Deixe vazio para usar o seu padrão.')
    .setRequired(false));

export async function execute(interaction) {
  // Inicializa o cliente aqui para garantir que o .env já foi carregado
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const texto = interaction.options.getString('texto');
  let idioma = interaction.options.getString('idioma');

  // Verifica cooldown
  const agora = Date.now();
  const ultimoUso = cooldowns.get(interaction.user.id) || 0;
  const tempoRestante = COOLDOWN_MS - (agora - ultimoUso);

  if (tempoRestante > 0) {
    return interaction.reply({
      content: `⏳ Aguarde **${Math.ceil(tempoRestante / 1000)}s** antes de traduzir novamente.`,
      ephemeral: true,
    });
  }

  // Se não passou idioma, busca o padrão do usuário
  if (!idioma) {
    const dados = fs.readJsonSync(idiomasPath, { throws: false }) || {};
    idioma = dados[interaction.user.id];

    if (!idioma) {
      return interaction.reply({
        content: '❌ Você não tem um idioma padrão definido. Use `/idioma definir` ou passe o idioma no comando.',
        ephemeral: true,
      });
    }
  }

  await interaction.deferReply();

  try {
    cooldowns.set(interaction.user.id, agora);

    const resposta = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `Você é um tradutor profissional. Traduza o texto do usuário para ${idioma}.
Retorne APENAS o texto traduzido, sem explicações, sem aspas, sem cabeçalhos.`,
        },
        {
          role: 'user',
          content: texto,
        },
      ],
      max_tokens: 1000,
    });

    const traducao = resposta.choices[0].message.content.trim();

    const embed = new EmbedBuilder()
      .setTitle('🌐 Tradução')
      .setColor('Blue')
      .addFields(
        { name: '📝 Original', value: texto.length > 1024 ? texto.slice(0, 1021) + '...' : texto },
        { name: `🔄 Traduzido para ${idioma}`, value: traducao.length > 1024 ? traducao.slice(0, 1021) + '...' : traducao },
      )
      .setFooter({ text: `Solicitado por ${interaction.user.tag} • Powered by Groq` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });

  } catch (err) {
    console.error('Erro na tradução:', err);
    await interaction.editReply({
      content: '❌ Ocorreu um erro ao traduzir. Tente novamente em instantes.',
    });
  }
}