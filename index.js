import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
} from "discord.js";
import dotenv from "dotenv";
dotenv.config();
import axios from 'axios';
import { getConfig } from './config/configManager.js';
import { execute as configurarExecute } from './commands/configurar.js';
import { execute as moderarExecute } from './commands/moderar.js';
import { createExecute } from './commands/aviso.js';
import { execute as ajudaExecute } from './commands/ajuda.js';
import { execute as limparExecute } from './commands/limpar.js';
import { execute as pingExecute } from './commands/ping.js';
import { execute as sortearExecute } from './commands/sortear.js';
import { execute as enqueteExecute } from './commands/enquete.js';

// ── Inicialização do client ──
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

// ── Bot pronto ──
client.once("clientReady", () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});

// ── Mapas de controle ──
const voiceTimes = new Map();
const readConfirmations = new Map();
const avisoExecute = createExecute(readConfirmations);

// ── Boas vindas ──
client.on("guildMemberAdd", async (member) => {
  const guild = member.guild;
  const config = getConfig(guild.id);

  const channel = guild.channels.cache.get(config.welcome_channel);
  if (channel) {
    try {
      await channel.send({
        content: `🔥 Bem vindo, ${member} acabou de se juntar ao servidor!! 🔥`,
      });
    } catch (err) {
      console.error("Erro ao enviar mensagem pública:", err);
    }
  }

  try {
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`Bem-vindo(a) ao ${guild.name}!`)
      .setDescription(
        `Olá ${member.displayName}, seja muito bem-vindo(a)! 🔥\n\n📜 Leia as regras com atenção para evitar punições.`,
      )
      .setColor("Red")
      .setTimestamp();

    await member.send({ embeds: [welcomeEmbed] });
  } catch (err) {
    console.error("Erro ao enviar mensagem privada:", err);
  }

  const config2 = getConfig(guild.id);
  let role = guild.roles.cache.get(config2.welcome_role);
  if (!role) {
    try {
      role = await guild.roles.fetch(config2.welcome_role);
    } catch (err) {
      console.error("Erro ao buscar o cargo:", err);
    }
  }

  if (role) {
    try {
      await member.roles.add(role);
      console.log(`Cargo ${role.name} atribuído a ${member.user.tag}`);
    } catch (err) {
      console.error("Erro ao adicionar cargo:", err);
    }
  }
});

// ── Interações (slash commands e botões) ──
client.on(Events.InteractionCreate, async (interaction) => {

  // Slash commands
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'configurar') {
      await configurarExecute(interaction);
      return;
    }
    if (interaction.commandName === 'moderar') {
      await moderarExecute(interaction);
      return;
    }
    if (interaction.commandName === 'aviso') {
      await avisoExecute(interaction);
      return;
    }
    if (interaction.commandName === 'ajuda') {
      await ajudaExecute(interaction);
      return;
    }
    if (interaction.commandName === 'limpar') {
      await limparExecute(interaction);
      return;
    }
    if (interaction.commandName === 'ping') {
      await pingExecute(interaction);
      return;
    }
    if (interaction.commandName === 'sortear') {
      await sortearExecute(interaction);
      return;
    }
    if (interaction.commandName === 'enquete') {
      await enqueteExecute(interaction);
      return;
    }
  }

  // Botão de confirmação de leitura de aviso
  if (!interaction.isButton()) return;
  if (interaction.customId === "confirm_read") {
    if (!readConfirmations.has(interaction.user.id))
      readConfirmations.set(interaction.user.id, []);
    readConfirmations.get(interaction.user.id).push(interaction.message.id);

    await interaction.update({
      content: "✅ Aviso marcado como lido!",
      components: [],
    });

    try {
  // Busca o servidor pelo cache do client
  const guilds = interaction.client.guilds.cache;
  for (const guild of guilds.values()) {
    const config = getConfig(guild.id);
    if (config.log_channel) {
      const logChannel = guild.channels.cache.get(config.log_channel);
      if (logChannel) {
        logChannel.send(`✅ **${interaction.user.tag}** confirmou leitura do aviso.`);
        break;
      }
    }
  }
} catch (err) {
  console.error("Erro ao enviar log de confirmação de leitura:", err);
    }

    console.log(`${interaction.user.tag} confirmou leitura do aviso.`);
  }
});

// ── Log de voz ──
client.on("voiceStateUpdate", async (oldState, newState) => {
  const config = getConfig(newState.guild.id);
  const logChannel = newState.guild.channels.cache.get(config.log_channel);
  if (!logChannel) return;

  const member = newState.member;
  const userTag = member.user.tag;

  // Busca horário real de Brasília via API
  const horarioBrasilia = async () => {
    try {
      const response = await axios.get('https://worldtimeapi.org/api/timezone/America/Sao_Paulo');
      const date = new Date(response.data.datetime);
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (err) {
      return new Date().toLocaleTimeString('pt-BR');
    }
  };

  // Entrou na call
  if (!oldState.channel && newState.channel) {
    voiceTimes.set(member.id, {
      joinTime: Date.now(),
      channelName: newState.channel.name,
    });
    logChannel.send(
      `🎧 ${userTag} entrou na call **${newState.channel.name}** às ${await horarioBrasilia()}`
    );
  }

  // Saiu da call
  if (oldState.channel && !newState.channel) {
    const record = voiceTimes.get(member.id);
    if (record) {
      const duration = Date.now() - record.joinTime;
      const segundos = Math.floor((duration / 1000) % 60);
      const minutos = Math.floor((duration / (1000 * 60)) % 60);
      const horas = Math.floor(duration / (1000 * 60 * 60));

      const duracaoFormatada = horas > 0
        ? `${horas}h ${minutos}m ${segundos}s`
        : minutos > 0
          ? `${minutos}m ${segundos}s`
          : `${segundos}s`;

      logChannel.send(
        `❌ ${userTag} saiu da call **${oldState.channel.name}** às ${await horarioBrasilia()}. Tempo de voz: ${duracaoFormatada}`
      );
      voiceTimes.delete(member.id);
    }
  }

  // Mudou de call
  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    const record = voiceTimes.get(member.id);
    const now = Date.now();
    let duration = 0;
    if (record) duration = now - record.joinTime;

    const segundos = Math.floor((duration / 1000) % 60);
    const minutos = Math.floor((duration / (1000 * 60)) % 60);
    const horas = Math.floor(duration / (1000 * 60 * 60));

    const duracaoFormatada = horas > 0
      ? `${horas}h ${minutos}m ${segundos}s`
      : minutos > 0
        ? `${minutos}m ${segundos}s`
        : `${segundos}s`;

    logChannel.send(
      `🔄 ${userTag} mudou da call **${oldState.channel.name}** para **${newState.channel.name}** às ${await horarioBrasilia()}. Tempo na call anterior: ${duracaoFormatada}`
    );

    voiceTimes.set(member.id, {
      joinTime: now,
      channelName: newState.channel.name,
    });
  }
});

// ── Login do bot ──
client.login(process.env.TOKEN);