import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('aviso')
  .setDescription('Envia um aviso para todos os membros do servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('enviar')
    .setDescription('Envia um aviso imediatamente')
    .addStringOption(opt => opt
      .setName('mensagem')
      .setDescription('Mensagem do aviso')
      .setRequired(true)))
  .addSubcommand(sub => sub
    .setName('agendar')
    .setDescription('Agenda um aviso para um horário específico')
    .addStringOption(opt => opt
      .setName('mensagem')
      .setDescription('Mensagem do aviso')
      .setRequired(true))
    .addStringOption(opt => opt
      .setName('horario')
      .setDescription('Horário no formato HH:MM (ex: 18:30)')
      .setRequired(true)));

async function sendNoticeDM(member, messageContent, authorTag) {
  const avisoEmbed = new EmbedBuilder()
    .setTitle('📢 Novo Aviso da Administração')
    .setDescription(messageContent)
    .setColor('Red')
    .setFooter({ text: `Enviado por ${authorTag}` })
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('confirm_read')
      .setLabel('✅ Li o aviso')
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

async function sendToAll(content, authorTag, guild, interaction, readConfirmations) {
  const config = getConfig(guild.id);
  const members = await guild.members.fetch();
  let sentCount = 0;

  // Envia no canal de avisos configurado
  const notifyChannel = guild.channels.cache.get(config.notify_channel);
  if (notifyChannel) {
    const canalEmbed = new EmbedBuilder()
      .setTitle('📢 Novo Aviso da Administração')
      .setDescription(content)
      .setColor('Red')
      .setFooter({ text: `Enviado por ${authorTag}` })
      .setTimestamp();

    await notifyChannel.send({ embeds: [canalEmbed] });
  }

  // Envia DM para todos os membros
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

  await interaction.editReply(`✅ Aviso enviado para o canal e para ${sentCount} membros com sucesso!`);
}

export function createExecute(readConfirmations) {
  return async function execute(interaction) {
    const config = getConfig(interaction.guildId);
    const adminRole = config.admin_role;

    if (adminRole && !interaction.member.roles.cache.has(adminRole)) {
      await interaction.reply({
        content: '❌ Você não tem permissão para usar este comando!',
        ephemeral: true
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    if (sub === 'enviar') {
      const mensagem = interaction.options.getString('mensagem');
      await interaction.deferReply();
      await sendToAll(mensagem, interaction.user.tag, interaction.guild, interaction, readConfirmations);
    }

    if (sub === 'agendar') {
      const mensagem = interaction.options.getString('mensagem');
      const horario = interaction.options.getString('horario');

      if (!/^\d{1,2}:\d{2}$/.test(horario)) {
        await interaction.reply({
          content: '❌ Formato de horário inválido! Use HH:MM (ex: 18:30)',
          ephemeral: true
        });
        return;
      }

      const [hour, minute] = horario.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hour, minute, 0, 0);

      let delay = target.getTime() - now.getTime();
      if (delay < 0) delay += 24 * 60 * 60 * 1000;

      const horaFormatada = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      await interaction.reply(`⏳ Aviso agendado para **${horaFormatada}**!`);

      setTimeout(async () => {
        try {
          await interaction.followUp(`📢 Enviando aviso agendado para **${horaFormatada}**...`);
          const members = await interaction.guild.members.fetch();
          const config = getConfig(interaction.guildId);
          let sentCount = 0;

          // Envia no canal de avisos
          const notifyChannel = interaction.guild.channels.cache.get(config.notify_channel);
          if (notifyChannel) {
            const canalEmbed = new EmbedBuilder()
              .setTitle('📢 Novo Aviso da Administração')
              .setDescription(mensagem)
              .setColor('Red')
              .setFooter({ text: `Enviado por ${interaction.user.tag}` })
              .setTimestamp();
            await notifyChannel.send({ embeds: [canalEmbed] });
          }

          // Envia DM para todos os membros
          for (const member of members.values()) {
            if (member.user.bot) continue;
            const messageId = await sendNoticeDM(member, mensagem, interaction.user.tag);
            if (messageId) {
              sentCount++;
              if (!readConfirmations.has(member.id))
                readConfirmations.set(member.id, []);
              readConfirmations.get(member.id).push(messageId);
            }
          }

          await interaction.followUp(`✅ Aviso agendado enviado para o canal e para ${sentCount} membros!`);
        } catch (err) {
          console.error('Erro ao enviar aviso agendado:', err);
        }
      }, delay);
    }
  };
}