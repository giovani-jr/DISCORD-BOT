import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';
import { getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('ajuda')
  .setDescription('Lista os comandos disponíveis para você');

export async function execute(interaction) {
  const config = getConfig(interaction.guild.id);

  const temPermissao = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
  const temCargo = config.admin_role && interaction.member.roles.cache.has(config.admin_role);
  const isAdmin = temPermissao || temCargo;

  const embed = new EmbedBuilder()
    .setTitle(isAdmin ? '🔐 Comandos do ZAPPY — Visão Admin' : '📋 Comandos do ZAPPY')
    .setColor(isAdmin ? 'Red' : 'Blue')
    .setDescription(isAdmin
      ? 'Você tem acesso a todos os comandos, incluindo os de administração.'
      : 'Aqui estão todos os comandos disponíveis para você:'
    )
    .addFields(
      {
        name: '🎉 Diversão',
        value: [
          '`/coinflip` → Lança uma moeda — cara ou coroa!',
          '`/dado` → Rola um dado personalizado (ex: `1d6`, `2d20`)',
          '`/8ball` → Consulte a bola mágica com uma pergunta',
          '`/sortear` → Cria um sorteio com tempo definido',
          '`/enquete` → Cria uma enquete com até 4 opções',
        ].join('\n'),
      },
      {
        name: '👤 Informações',
        value: [
          '`/userinfo` → Informações detalhadas sobre um usuário',
          '`/serverinfo` → Informações sobre este servidor',
          '`/avatar` → Mostra o avatar de um membro',
          '`/ping` → Verifica a latência do bot',
        ].join('\n'),
      },
      {
        name: '🌐 Tradução',
        value: [
          '`/traduzir` → Traduz um texto para o idioma desejado',
          '`/idioma definir` → Define seu idioma padrão de tradução',
          '`/idioma ver` → Veja seu idioma padrão atual',
          '`/idioma remover` → Remove seu idioma padrão',
        ].join('\n'),
      },
      {
        name: '🤖 Inteligência Artificial',
        value: [
          '`/ia perguntar` → Faz uma pergunta rápida para a IA',
          '`/ia iniciar` → Cria um canal de chat privado com a IA',
          '`/ia encerrar` → Encerra o chat privado com a IA',
        ].join('\n'),
      },
    );

  if (isAdmin) {
    embed.addFields(
      {
        name: '⚙️ Configuração do Bot',
        value: [
          '`/configurar boas-vindas` → Define o canal de boas-vindas',
          '`/configurar cargo-inicial` → Define o cargo dado a novos membros',
          '`/configurar log-voz` → Define o canal de log de voz',
          '`/configurar avisos` → Define o canal de avisos',
          '`/configurar cargo-admin` → Define o cargo de administrador',
          '`/configurar status` → Exibe as configurações atuais',
        ].join('\n'),
      },
      {
        name: '🔨 Moderação',
        value: [
          '`/moderar kick` → Expulsa um membro do servidor',
          '`/moderar ban` → Bane permanentemente um membro',
          '`/moderar mute` → Silencia um membro por tempo determinado',
        ].join('\n'),
      },
      {
        name: '🧹 Limpeza de Mensagens',
        value: [
          '`/limpar quantidade` → Apaga quantidade específica de mensagens',
          '`/limpar tudo` → Apaga todas as mensagens recentes (máx 14 dias)',
          '`/limpar forcar` → Apaga todas as mensagens incluindo antigas',
        ].join('\n'),
      },
      {
        name: '🔧 Controle de Canais',
        value: [
          '`/slowmode ativar` → Ativa o modo lento no canal',
          '`/slowmode desativar` → Remove o modo lento',
          '`/lock bloquear` → Bloqueia o canal para membros',
          '`/lock desbloquear` → Desbloqueia o canal',
        ].join('\n'),
      },
      {
        name: '📢 Avisos',
        value: [
          '`/aviso enviar` → Envia um aviso imediato para todos',
          '`/aviso agendar` → Agenda um aviso para um horário específico',
        ].join('\n'),
      },
    );
  }

  embed
    .setFooter({ text: isAdmin ? 'ZAPPY • Modo Administrador' : 'ZAPPY • Bot de gerenciamento' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed], ephemeral: true });
}