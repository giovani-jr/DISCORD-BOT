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

client.once("clientReady", () => {
  console.log(`✅ Bot iniciado como ${client.user.tag}`);
});


const voiceTimes = new Map(); 
const readConfirmations = new Map(); 


client.on("guildMemberAdd", async (member) => {
  const guild = member.guild;
  const channel = guild.channels.cache.get(process.env.WELCOME_CHANNEL_ID);

  if (channel) {
    try {
      await channel.send({
        content: `🔥 Bem vindo, ${member} acabou de se juntar à fac !! 🔥`,
      });
    } catch (err) {
      console.error("Erro ao enviar mensagem pública:", err);
    }
  }

  try {
    const welcomeEmbed = new EmbedBuilder()
      .setTitle(`Bem-vindo(a) ao ${guild.name}!`)
      .setDescription(
        `Olá ${member.displayName}, seja muito bem-vindo(a) à **PitsOfInferno!** 🔥🔥\n\n📜 Leia as regras com atenção para evitar punições.`,
      )
      .setColor("Red")
      .setTimestamp();

    await member.send({ embeds: [welcomeEmbed] });
  } catch (err) {
    console.error("Erro ao enviar mensagem privada:", err);
  }

  let role = guild.roles.cache.get(process.env.WELCOME_ROLE_ID);
  if (!role) {
    try {
      role = await guild.roles.fetch(process.env.WELCOME_ROLE_ID);
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
  } else {
    console.log("Cargo de boas-vindas não encontrado");
  }
});


async function sendNoticeDM(member, messageContent, authorTag) {
  const avisoEmbed = new EmbedBuilder()
    .setTitle("📢 Novo Aviso da Administração")
    .setDescription(messageContent)
    .setColor("Red")
    .setFooter({ text: `Enviado por ${authorTag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("confirm_read")
      .setLabel("✅ Li o aviso")
      .setStyle(ButtonStyle.Primary),
  );

  try {
    const dmMessage = await member.send({
      embeds: [avisoEmbed],
      components: [row],
    });
    return dmMessage.id;
  } catch (err) {
    console.log(`Não foi possível enviar DM para ${member.user.tag}`);
    return null;
  }
}


async function sendToAll(content, authorTag, messageChannel) {
  const members = await messageChannel.guild.members.fetch();
  let sentCount = 0;

  for (const member of members.values()) {
    if (member.user.bot) continue;
    const messageId = await sendNoticeDM(member, content, authorTag);
    if (messageId) {
      sentCount++;
      if (!readConfirmations.has(member.id))
        readConfirmations.set(member.id, []);
      readConfirmations.get(member.id).push(messageId);
    }
  }

  messageChannel.reply(
    `✅ Mensagem enviada para ${sentCount} membros com sucesso!`,
  );
}


client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.channel.id !== process.env.NOTIFY_CHANNEL_ID) return;

  const adminRole = message.guild.roles.cache.get(process.env.ADMIN_ROLE_ID);
  if (!adminRole || !message.member.roles.cache.has(adminRole.id)) return;

  const args = message.content.trim().split(" ");

  if (args[0].toLowerCase() === "!aviso") {
    let avisoText;
    let delay = 0;

    if (args[1] && /^\d{1,2}:\d{2}$/.test(args[1])) {
      const [hour, minute] = args[1].split(":").map(Number);
      avisoText = args.slice(2).join(" ");

      const now = new Date();
      let target = new Date();
      target.setHours(hour, minute, 0, 0);

      delay = target.getTime() - now.getTime();
      if (delay < 0) delay += 24 * 60 * 60 * 1000;

      message.reply(
        `⏳ Aviso agendado para ${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`,
      );
      console.log(
        `Agendamento de aviso para ${hour}:${minute}: "${avisoText}"`,
      );
    } else {
      avisoText = args.slice(1).join(" ");
    }

    if (delay > 0) {
      setTimeout(async () => {
        try {
          await sendToAll(avisoText, message.author.tag, message);
        } catch (err) {
          console.error("Erro ao enviar aviso agendado:", err);
        }
      }, delay);
    } else {
      await sendToAll(avisoText, message.author.tag, message);
    }
  }
});


client.on(Events.InteractionCreate, async (interaction) => {
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
      const guild = client.guilds.cache.get(process.env.GUILD_ID);
      if (!guild)
        return console.log("Guild não encontrada para log de leitura");

      const logChannel = guild.channels.cache.get(
        process.env.VOICE_LOG_CHANNEL_ID,
      );
      if (logChannel) {
        logChannel.send(
          `✅ ${interaction.user.tag} confirmou leitura do aviso.`,
        );
      }
    } catch (err) {
      console.error("Erro ao enviar log de confirmação de leitura:", err);
    }

    console.log(`${interaction.user.tag} confirmou leitura do aviso.`);
  }
});


client.on("voiceStateUpdate", async (oldState, newState) => {
  const logChannel = newState.guild.channels.cache.get(
    process.env.VOICE_LOG_CHANNEL_ID,
  );
  if (!logChannel) return;

  const member = newState.member;
  const userTag = member.user.tag;

  if (!oldState.channel && newState.channel) {
    voiceTimes.set(member.id, {
      joinTime: Date.now(),
      channelName: newState.channel.name,
    });
    logChannel.send(
      `🎧 ${userTag} entrou na call **${newState.channel.name}** às ${new Date().toLocaleTimeString()}`,
    );
  }

  if (oldState.channel && !newState.channel) {
    const record = voiceTimes.get(member.id);
    if (record) {
      const duration = Date.now() - record.joinTime;
      const seconds = Math.floor(duration / 1000);
      logChannel.send(
        `❌ ${userTag} saiu da call **${oldState.channel.name}**. Tempo de voz: ${seconds} segundos`,
      );
      voiceTimes.delete(member.id);
    }
  }

  if (
    oldState.channel &&
    newState.channel &&
    oldState.channel.id !== newState.channel.id
  ) {
    const record = voiceTimes.get(member.id);
    const now = Date.now();
    let duration = 0;
    if (record) duration = now - record.joinTime;

    logChannel.send(
      `🔄 ${userTag} mudou da call **${oldState.channel.name}** para **${newState.channel.name}**. Tempo na call anterior: ${Math.floor(duration / 1000)} segundos`,
    );

    voiceTimes.set(member.id, {
      joinTime: now,
      channelName: newState.channel.name,
    });
  }
});


client.login(process.env.TOKEN);
