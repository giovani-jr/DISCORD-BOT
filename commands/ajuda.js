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
        name: '⚙️ Configuração',
        value: [
          '`/configurar boas-vindas` → Define o canal de boas-vindas',
          '`/configurar cargo-inicial` → Define o cargo para novos membros',
          '`/configurar log-voz` → Define o canal de log de voz',
          '`/configurar avisos` → Define o canal de avisos',
          '`/configurar cargo-admin` → Define o cargo de administrador',
          '`/configurar status` → Mostra as configurações atuais',
        ].join('\n')
      },
      {
        name: '🔨 Moderação',
        value: [
          '`/moderar kick` → Expulsa um membro',
          '`/moderar ban` → Bane um membro',
          '`/moderar mute` → Silencia um membro temporariamente',
          '`/limpar quantidade` → Apaga quantidade específica de mensagens',
          '`/limpar tudo` → Apaga todas as mensagens (máx 14 dias)',
          '`/limpar forcar` → Apaga todas as mensagens incluindo antigas',
          '`/slowmode ativar` → Ativa o modo lento no canal',
          '`/slowmode desativar` → Desativa o modo lento no canal',
          '`/lock bloquear` → Bloqueia o canal para membros',
          '`/lock desbloquear` → Desbloqueia o canal',
        ].join('\n')
      },
      {
        name: '📢 Avisos',
        value: [
          '`/aviso enviar` → Envia um aviso para todos os membros',
          '`/aviso agendar` → Agenda um aviso para um horário específico',
        ].join('\n')
      },
      {
        name: '🎉 Diversão',
        value: [
          '`/coinflip` → Lança uma moeda',
          '`/dado` → Rola um dado personalizado (ex: 1d6, 2d20)',
          '`/8ball` → Bola mágica responde perguntas',
          '`/sortear` → Cria um sorteio com tempo definido e reações',
          '`/enquete` → Cria uma enquete com até 4 opções',
        ].join('\n')
      },
      {
        name: '👤 Informações',
        value: [
          '`/userinfo` → Informações detalhadas de um usuário',
          '`/serverinfo` → Informações do servidor',
          '`/avatar` → Exibe o avatar de um membro',
          '`/ping` → Verifica a latência do bot',
        ].join('\n')
      },
      {
        name: '🤖 Inteligencia Artificial',
        value: [
          '`/ia perguntar` → Faz uma pergunta rapida para a IA',
          '`/ia iniciar` → Cria um chat privado com a IA',
          '`/ia encerrar` → Encerra o chat privado com a IA',
        ].join('\n')
      },
    )
    .setFooter({ text: 'ZAPPY • Bot de gerenciamento de servidor' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}