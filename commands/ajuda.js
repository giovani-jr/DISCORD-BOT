import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('ajuda')
  .setDescription('Lista todos os comandos disponíveis do bot');

export async function execute(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('📋 Comandos do ZAPPY')
    .setColor('Blue')
    .setDescription('Aqui estão todos os comandos disponíveis:')
    .addFields(
      {
        name: '⚙️ /configurar',
        value: [
          '`boas-vindas` → Define o canal de boas-vindas',
          '`cargo-inicial` → Define o cargo para novos membros',
          '`log-voz` → Define o canal de log de voz',
          '`avisos` → Define o canal de avisos',
          '`cargo-admin` → Define o cargo de administrador',
          '`status` → Mostra as configurações atuais',
        ].join('\n')
      },
      {
        name: '🔨 /moderar',
        value: [
          '`kick` → Expulsa um membro',
          '`ban` → Bane um membro',
          '`mute` → Silencia um membro temporariamente',
        ].join('\n')
      },
      {
        name: '📢 /aviso',
        value: [
          '`enviar` → Envia um aviso para todos os membros',
          '`agendar` → Agenda um aviso para um horário específico',
        ].join('\n')
      },
      {
        name: '🧹 /limpar',
        value: [
          '`quantidade` → Apaga uma quantidade específica de mensagens',
          '`tudo` → Apaga todas as mensagens do canal',
          '`forcar` → Apaga todas as mensagens incluindo antigas (lento)',
        ].join('\n')
      },
      {
        name: '🎉 /sortear',
        value: '`premio` → Sorteia um membro aleatório do servidor',
      },
      {
        name: '📊 /enquete',
        value: 'Cria uma enquete com até 4 opções',
      },
      {
        name: '🏓 /ping',
        value: 'Verifica a latência do bot',
      },
      {
        name: '❓ /ajuda',
        value: 'Exibe esta lista de comandos',
      },
      {
        name: '🐌 /slowmode',
        value: [
          '`ativar` → Ativa o modo lento no canal',
          '`desativar` → Desativa o modo lento no canal',
        ].join('\n')
      },
      {
        name: '🔒 /lock',
        value: [
          '`bloquear` → Bloqueia o canal para membros',
          '`desbloquear` → Desbloqueia o canal',
        ].join('\n')
      },
    )
    .setFooter({ text: 'ZAPPY • Bot de gerenciamento de servidor' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}