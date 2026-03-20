import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('limpar')
  .setDescription('Limpa mensagens do canal')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand(sub => sub
    .setName('quantidade')
    .setDescription('Apaga uma quantidade específica de mensagens (máx 14 dias)')
    .addIntegerOption(opt => opt
      .setName('mensagens')
      .setDescription('Quantidade de mensagens a apagar (1-100)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)))
  .addSubcommand(sub => sub
    .setName('tudo')
    .setDescription('Apaga todas as mensagens do canal (máx 14 dias)'))
  .addSubcommand(sub => sub
    .setName('forcar')
    .setDescription('Apaga todas as mensagens incluindo antigas (lento)'));

export async function execute(interaction) {
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

  if (sub === 'quantidade') {
    try {
      await interaction.deferReply({ ephemeral: true });
      const quantidade = interaction.options.getInteger('mensagens');
      const deletadas = await interaction.channel.bulkDelete(quantidade, true);
      await interaction.editReply({
        content: `✅ ${deletadas.size} mensagem(ns) apagada(s) com sucesso!`,
      });
    } catch (err) {
      await interaction.editReply({
        content: '❌ Não foi possível apagar as mensagens!',
      });
    }
  }

  if (sub === 'tudo') {
    try {
      await interaction.deferReply({ ephemeral: true });
      let deletadas = 0;
      let mensagens;
      do {
        mensagens = await interaction.channel.bulkDelete(100, true);
        deletadas += mensagens.size;
      } while (mensagens.size === 100);

      await interaction.editReply({
        content: `✅ ${deletadas} mensagem(ns) apagada(s) com sucesso!`,
      });
    } catch (err) {
      await interaction.editReply({
        content: '❌ Não foi possível apagar as mensagens!',
      });
    }
  }

  if (sub === 'forcar') {
    try {
      await interaction.deferReply({ ephemeral: true });
      await interaction.editReply({
        content: '⏳ Apagando todas as mensagens incluindo antigas... Isso pode demorar!',
      });

      let deletadas = 0;
      let mensagens;

      do {
        mensagens = await interaction.channel.messages.fetch({ limit: 100 });
        for (const message of mensagens.values()) {
          try {
            await message.delete();
            deletadas++;
            // Pequena pausa para evitar rate limit do Discord
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (err) {
            console.log(`Não foi possível apagar mensagem: ${err.message}`);
          }
        }
      } while (mensagens.size > 0);

      await interaction.followUp({
        content: `✅ ${deletadas} mensagem(ns) apagada(s) com sucesso!`,
        ephemeral: true
      });
    } catch (err) {
      await interaction.followUp({
        content: '❌ Erro ao apagar mensagens!',
        ephemeral: true
      });
    }
  }
}