import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('sortear')
  .setDescription('Cria um sorteio no canal')
  .addIntegerOption(opt => opt
    .setName('minutos')
    .setDescription('Duração do sorteio em minutos')
    .setRequired(true)
    .setMinValue(1)
    .setMaxValue(10080)) // máx 7 dias
  .addStringOption(opt => opt
    .setName('premio')
    .setDescription('O que será sorteado?')
    .setRequired(false));

export async function execute(interaction) {
  const minutos = interaction.options.getInteger('minutos');
  const premio = interaction.options.getString('premio') || 'Sem prêmio definido';
  const duracao = minutos * 60 * 1000;

  // Formata o tempo para exibição
  const formatarTempo = (min) => {
    if (min < 60) return `${min} minuto(s)`;
    const horas = Math.floor(min / 60);
    const mins = min % 60;
    return mins > 0 ? `${horas}h ${mins}min` : `${horas}h`;
  };

  const encerraEm = new Date(Date.now() + duracao);

  const embed = new EmbedBuilder()
    .setTitle('🎉 SORTEIO!')
    .setDescription(`Reaja com 🎉 para participar!\n\n**Prêmio:** ${premio}\n**Duração:** ${formatarTempo(minutos)}\n**Encerra:** <t:${Math.floor(encerraEm.getTime() / 1000)}:R>`)
    .setColor('Gold')
    .setFooter({ text: `Sorteio criado por ${interaction.user.tag}` })
    .setTimestamp(encerraEm);

  await interaction.reply({ embeds: [embed] });

  // Busca a mensagem e adiciona a reação
  const mensagem = await interaction.fetchReply();
  await mensagem.react('🎉');

  // Aguarda o tempo do sorteio
  setTimeout(async () => {
    try {
      // Busca a mensagem atualizada com as reações
      const mensagemAtualizada = await interaction.channel.messages.fetch(mensagem.id);
      const reacao = mensagemAtualizada.reactions.cache.get('🎉');

      if (!reacao) {
        await interaction.followUp('❌ Ninguém participou do sorteio!');
        return;
      }

      // Busca todos que reagiram, exceto bots
      const participantes = await reacao.users.fetch();
      const humanos = participantes.filter(u => !u.bot);

      if (humanos.size === 0) {
        await interaction.followUp('❌ Ninguém participou do sorteio!');
        return;
      }

      // Sorteia o vencedor
      const array = [...humanos.values()];
      const vencedor = array[Math.floor(Math.random() * array.length)];

      const embedResultado = new EmbedBuilder()
        .setTitle('🎊 Sorteio Encerrado!')
        .setDescription(`**🏆 Vencedor:** ${vencedor}\n**🎁 Prêmio:** ${premio}`)
        .setColor('Green')
        .setThumbnail(vencedor.displayAvatarURL())
        .addFields(
          { name: '👥 Participantes', value: `${humanos.size}` },
        )
        .setFooter({ text: `Sorteio criado por ${interaction.user.tag}` })
        .setTimestamp();

      await interaction.followUp({ embeds: [embedResultado] });

      // Edita a mensagem original indicando que encerrou
      const embedEncerrado = EmbedBuilder.from(mensagemAtualizada.embeds[0])
        .setTitle('🎉 SORTEIO ENCERRADO!')
        .setColor('Grey');

      await mensagemAtualizada.edit({ embeds: [embedEncerrado] });

    } catch (err) {
      console.error('Erro ao finalizar sorteio:', err);
    }
  }, duracao);
}