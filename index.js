import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events,
  MessageFlags,
  PermissionFlagsBits,
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
import { execute as slowmodeExecute } from './commands/slowmode.js';
import { execute as lockExecute } from './commands/lock.js';
import { execute as coinflipExecute } from './commands/coinflip.js';
import { execute as dadoExecute } from './commands/dado.js';
import { execute as eightballExecute } from './commands/8ball.js';
import { execute as userinfoExecute } from './commands/userinfo.js';
import { execute as serverinfoExecute } from './commands/serverinfo.js';
import { execute as avatarExecute } from './commands/avatar.js';
import { execute as iaExecute, handleIAMessage, historicoChats } from './commands/ia.js';
import { execute as traduzirExecute } from './commands/traduzir.js';
import { execute as idiomaExecute } from './commands/idioma.js';
import { execute as ativarExecute } from './commands/ativar.js';
import { execute as desativarExecute } from './commands/desativar.js';
import { iniciarScrapers } from './scrapers/scheduler.js';
import { execute as ticketExecute } from './commands/ticket.js';
import {
  handleTicketCategoria,
  handleTicketModal,
  handleAssumir,
  handleFechar,
} from './handlers/ticketHandler.js';
import { execute as backupExecute } from './commands/backup.js';

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
  iniciarScrapers(client);
});

// ── Mapas de controle ──
const voiceTimes = new Map();
const avisoMap = new Map();    // messageId -> avisoId
const avisoData = new Map();   // avisoId -> { guildId, authorTag, timestamp, confirmations, logMessageId }
const processingButtons = new Set();
const avisoExecute = createExecute({ avisoMap, avisoData });

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

// ── Mensagens (chat de IA) ──
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  await handleIAMessage(message, historicoChats);
});

// ── Interações (slash commands e botões) ──
client.on(Events.InteractionCreate, async (interaction) => {
  // ──────────────── Botão de confirmação de leitura de aviso ────────────────
  // (pode ser acionado de DM ou canal, por isso fica antes da verificação de guild)
  if (interaction.isButton() && interaction.customId === 'confirm_read') {
  const messageId = interaction.message.id;
  const avisoId = avisoMap.get(messageId);
  if (!avisoId) {
    return interaction.reply({ content: 'Este aviso não está mais disponível.', flags: MessageFlags.Ephemeral });
  }

  const avisoInfo = avisoData.get(avisoId);
  if (!avisoInfo) {
    return interaction.reply({ content: 'Este aviso expirou.', flags: MessageFlags.Ephemeral });
  }

  const userId = interaction.user.id;
  if (avisoInfo.confirmations.has(userId)) {
    return interaction.reply({ content: 'Você já confirmou a leitura deste aviso.', flags: MessageFlags.Ephemeral });
  }

  avisoInfo.confirmations.add(userId);

  // Se for DM (interaction.guild === null), remove o botão daquela DM
  if (!interaction.guild) {
    await interaction.update({ components: [] });
  } else {
    // No canal, não mexe na mensagem original, apenas confirma efemeramente
    await interaction.reply({ content: '✅ Leitura confirmada!', flags: MessageFlags.Ephemeral });
  }

  // Atualiza o relatório no log
  if (avisoInfo.logMessageId && avisoInfo.guildId) {
    try {
      const guild = interaction.client.guilds.cache.get(avisoInfo.guildId);
      if (guild) {
        const config = getConfig(guild.id);
        const logChannel = guild.channels.cache.get(config.log_channel);
        if (logChannel) {
          const logMessage = await logChannel.messages.fetch(avisoInfo.logMessageId).catch(() => null);
          if (logMessage) {
            const embed = EmbedBuilder.from(logMessage.embeds[0]);
            const confirmados = [...avisoInfo.confirmations].map(id => `<@${id}>`).join(', ');
            embed.spliceFields(2, 1, { name: '✅ Confirmaram', value: confirmados || 'Nenhum', inline: false });
            embed.setFooter({ text: `ID do aviso: ${avisoId} • ${avisoInfo.confirmations.size} confirmação(ões)` });
            await logMessage.edit({ embeds: [embed] });
          }
        }
      }
    } catch (err) {
      console.error('Erro ao atualizar relatório de aviso:', err);
    }
  }

  return;
}

  // ─── Exige servidor para todas as outras interações ───
  if (!interaction.guild) {
    try {
      await interaction.reply({
        content: '❌ Este bot só funciona em servidores. Utilize /ajuda para ver os comandos disponíveis em seu servidor.',
        flags: MessageFlags.Ephemeral,
      });
    } catch {}
    return;
  }

  // ─── Slash commands ───
  if (interaction.isChatInputCommand()) {
    const commandMap = {
      configurar: configurarExecute,
      moderar: moderarExecute,
      aviso: avisoExecute,
      ajuda: ajudaExecute,
      limpar: limparExecute,
      ping: pingExecute,
      sortear: sortearExecute,
      enquete: enqueteExecute,
      slowmode: slowmodeExecute,
      lock: lockExecute,
      coinflip: coinflipExecute,
      dado: dadoExecute,
      '8ball': eightballExecute,
      userinfo: userinfoExecute,
      serverinfo: serverinfoExecute,
      avatar: avatarExecute,
      ia: iaExecute,
      traduzir: traduzirExecute,
      idioma: idiomaExecute,
      ativar: ativarExecute,
      desativar: desativarExecute,
      ticket: ticketExecute,
      backup: backupExecute,
    };
    if (commandMap[interaction.commandName]) {
      await commandMap[interaction.commandName](interaction);
    }
    return;
  }

  // ─── Select Menu de tickets ───
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_categoria') {
    await handleTicketCategoria(interaction);
    return;
  }

  // ─── Modal de tickets ───
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_modal_')) {
    await handleTicketModal(interaction);
    return;
  }

  // ─── Botões de tickets e revogação (com anti-spam) ───
  if (interaction.isButton()) {
    // Revogação
    if (interaction.customId.startsWith('revogar_')) {
      if (processingButtons.has(interaction.customId)) return;
      processingButtons.add(interaction.customId);

      const config = getConfig(interaction.guildId);
      const adminRole = config.admin_role;
      const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
      const temCargo = adminRole && interaction.member.roles.cache.has(adminRole);
      if (!isAdmin && !temCargo) {
        processingButtons.delete(interaction.customId);
        return interaction.reply({ content: '❌ Você não tem permissão para revogar esta ação.', flags: MessageFlags.Ephemeral });
      }

      const parts = interaction.customId.split('_');
      const tipo = parts[1];
      const userId = parts[2];

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        if (tipo === 'ban') {
          await interaction.guild.members.unban(userId, 'Revogado por ' + interaction.user.tag);
          await interaction.message.edit({ components: [] });
          await interaction.editReply(`✅ Banimento de <@${userId}> revogado com sucesso.`);
        } else if (tipo === 'mute') {
          const membro = await interaction.guild.members.fetch(userId);
          await membro.timeout(null, 'Revogado por ' + interaction.user.tag);
          await interaction.message.edit({ components: [] });
          await interaction.editReply(`✅ Silenciamento de ${membro.user.tag} revogado.`);
        }
      } catch (err) {
        console.error(err);
        await interaction.editReply(`❌ Não foi possível revogar a ação. O membro pode já não estar mais no servidor.`);
      } finally {
        processingButtons.delete(interaction.customId);
      }
      return;
    }

    // Assumir ticket
    if (interaction.customId.startsWith('assumir_ticket_')) {
      const key = interaction.customId + interaction.user.id;
      if (processingButtons.has(key)) return;
      processingButtons.add(key);
      try {
        await handleAssumir(interaction);
      } finally {
        processingButtons.delete(key);
      }
      return;
    }

    // Fechar ticket
    if (interaction.customId.startsWith('fechar_ticket_')) {
      const key = interaction.customId + interaction.user.id;
      if (processingButtons.has(key)) return;
      processingButtons.add(key);
      try {
        await handleFechar(interaction);
      } finally {
        processingButtons.delete(key);
      }
      return;
    }
  }
});

// ── Log de voz (embed único por sessão) ──
client.on("voiceStateUpdate", async (oldState, newState) => {
  const config = getConfig(newState.guild.id);
  const logChannel = newState.guild.channels.cache.get(config.log_channel);
  if (!logChannel) return;

  const member = newState.member;
  const userTag = member.user.tag;
  const avatarURL = member.user.displayAvatarURL({ dynamic: true });

  function formatarDuracao(ms) {
    const segundos = Math.floor((ms / 1000) % 60);
    const minutos = Math.floor((ms / (1000 * 60)) % 60);
    const horas = Math.floor(ms / (1000 * 60 * 60));
    return horas > 0
      ? `${horas}h ${minutos}m ${segundos}s`
      : minutos > 0
        ? `${minutos}m ${segundos}s`
        : `${segundos}s`;
  }

  const horarioBrasilia = async () => {
    try {
      const response = await axios.get('https://worldtimeapi.org/api/timezone/America/Sao_Paulo');
      const date = new Date(response.data.datetime);
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return new Date().toLocaleTimeString('pt-BR');
    }
  };

  if (!oldState.channel && newState.channel) {
    const hora = await horarioBrasilia();
    const embed = new EmbedBuilder()
      .setTitle('🎧 Sessão de Voz Iniciada')
      .setColor(0x57f287)
      .setThumbnail(avatarURL)
      .addFields(
        { name: '👤 Membro', value: `${member} (${userTag})`, inline: true },
        { name: '📢 Canal inicial', value: `**${newState.channel.name}**`, inline: true },
        { name: '🕒 Entrada', value: hora, inline: true },
      )
      .setFooter({ text: `ID: ${member.id} • Sessão em andamento` })
      .setTimestamp();

    const msg = await logChannel.send({ embeds: [embed] });
    voiceTimes.set(member.id, {
      joinTime: Date.now(),
      currentChannel: newState.channel.name,
      logMessage: msg,
      historico: [{ channel: newState.channel.name, joinTime: Date.now() }],
    });
  }

  if (oldState.channel && !newState.channel) {
    const record = voiceTimes.get(member.id);
    if (!record) return;

    const horaSaida = await horarioBrasilia();
    const duracaoTotal = Date.now() - record.joinTime;
    const trajeto = record.historico.map(h => h.channel).join(' → ');

    const embed = new EmbedBuilder()
      .setTitle('❌ Sessão de Voz Encerrada')
      .setColor(0xed4245)
      .setThumbnail(avatarURL)
      .addFields(
        { name: '👤 Membro', value: `${member} (${userTag})`, inline: true },
        { name: '🕒 Entrada', value: new Date(record.joinTime).toLocaleTimeString('pt-BR'), inline: true },
        { name: '🕛 Saída', value: horaSaida, inline: true },
        { name: '⏱️ Duração total', value: formatarDuracao(duracaoTotal), inline: true },
      )
      .setFooter({ text: `ID: ${member.id} • Sessão finalizada` })
      .setTimestamp();

    if (record.historico.length > 1) {
      embed.addFields({ name: '🔄 Canais percorridos', value: trajeto });
    }

    try {
      await record.logMessage.edit({ embeds: [embed] });
    } catch {}
    voiceTimes.delete(member.id);
  }

  if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
    const record = voiceTimes.get(member.id);
    if (!record) return;

    record.historico.push({ channel: newState.channel.name, joinTime: Date.now() });
    record.currentChannel = newState.channel.name;

    const trajeto = record.historico.map(h => h.channel).join(' → ');
    const hora = await horarioBrasilia();

    const embed = new EmbedBuilder()
      .setTitle('🎧 Sessão de Voz em Andamento')
      .setColor(0xfee75c)
      .setThumbnail(avatarURL)
      .addFields(
        { name: '👤 Membro', value: `${member} (${userTag})`, inline: true },
        { name: '📢 Canal atual', value: `**${newState.channel.name}**`, inline: true },
        { name: '🕒 Última mudança', value: hora, inline: true },
        { name: '🔄 Histórico', value: trajeto },
      )
      .setFooter({ text: `ID: ${member.id} • Sessão em andamento` })
      .setTimestamp();

    try {
      await record.logMessage.edit({ embeds: [embed] });
    } catch {}
  }
});

// Previne o bot de cair por erros não tratados
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

// ── Login do bot ──
client.login(process.env.TOKEN);