import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('userinfo')
  .setDescription('Exibe informações detalhadas de um usuário')
  .addUserOption(opt => opt
    .setName('membro')
    .setDescription('Selecione o membro')
    .setRequired(false));

export async function execute(interaction) {
  const membro = interaction.options.getMember('membro') || interaction.member;
  const usuario = membro.user;

  const cargos = membro.roles.cache
    .filter(r => r.id !== interaction.guild.roles.everyone.id)
    .sort((a, b) => b.position - a.position)
    .map(r => `${r}`)
    .join(', ') || 'Nenhum cargo';

  const flags = usuario.flags?.toArray() || [];
  const badges = flags.length > 0 ? flags.join(', ') : 'Nenhuma';

  const embed = new EmbedBuilder()
    .setTitle(`👤 Informações de ${usuario.tag}`)
    .setThumbnail(usuario.displayAvatarURL({ size: 256 }))
    .setColor(membro.displayHexColor || 'Blue')
    .addFields(
      { name: '🪪 ID', value: usuario.id, inline: true },
      { name: '📛 Apelido', value: membro.nickname || 'Nenhum', inline: true },
      { name: '🤖 Bot', value: usuario.bot ? 'Sim' : 'Não', inline: true },
      { name: '📅 Conta criada em', value: `<t:${Math.floor(usuario.createdTimestamp / 1000)}:D>`, inline: true },
      { name: '📥 Entrou no servidor em', value: `<t:${Math.floor(membro.joinedTimestamp / 1000)}:D>`, inline: true },
      { name: '🏅 Cargos', value: cargos },
    )
    .setFooter({ text: `Solicitado por ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}