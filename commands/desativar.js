import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType, MessageFlags } from 'discord.js';
import { setConfig, getConfig } from '../config/configManager.js';

export const data = new SlashCommandBuilder()
  .setName('desativar')
  .setDescription('Desativa um módulo de scraping')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup((g) =>
    g
      .setName('scraping')
      .setDescription('Módulos de scraping')
      .addSubcommand((s) =>
        s
          .setName('noticias')
          .setDescription('Desativa o módulo de notícias')
          .addBooleanOption((o) =>
            o.setName('deletar-canal').setDescription('Deletar o canal? (padrão: sim)').setRequired(false),
          ),
      )
      .addSubcommand((s) =>
        s
          .setName('cotacoes')
          .setDescription('Desativa o módulo de cotações')
          .addBooleanOption((o) =>
            o.setName('deletar-canal').setDescription('Deletar o canal? (padrão: sim)').setRequired(false),
          ),
      ),
  );

async function desativar(interaction, chave, nome, emoji) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const guild = interaction.guild;
  const guildId = guild.id;
  const config = getConfig(guildId);
  const canalId = config[chave];
  const deletar = interaction.options.getBoolean('deletar-canal') ?? true;

  if (!canalId) {
    return interaction.editReply(`⚠️ O módulo de **${nome}** não está ativo neste servidor.`);
  }

  setConfig(guildId, chave, null);
  if (chave === 'scraper_noticias') setConfig(guildId, 'scraper_noticias_regioes', null);

  // ★ Responde PRIMEIRO antes de qualquer delete
  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle(`${emoji} Módulo de ${nome} Desativado`)
        .setDescription(
          deletar
            ? 'O módulo foi desativado e o **canal foi deletado**.'
            : 'O módulo foi desativado mas o **canal foi mantido** (não receberá mais atualizações).',
        )
        .setColor(0x95a5a6)
        .setTimestamp(),
    ],
  });

  // ★ Deleta DEPOIS de ter respondido
  if (deletar) {
    try {
      const canal = guild.channels.cache.get(canalId);
      if (canal) await canal.delete(`Módulo ${nome} desativado por ${interaction.user.tag}`);
    } catch (err) {
      console.error(`[desativar] Erro ao deletar canal de ${nome}:`, err.message);
    }

    // Remove categoria se estiver vazia
    try {
      const cfg = getConfig(guildId);
      const algumAtivo = [cfg.scraper_noticias, cfg.scraper_cotacoes].some(Boolean);
      if (!algumAtivo) {
        const cat = guild.channels.cache.find(
          (c) => c.type === ChannelType.GuildCategory && c.name === '📡 SCRAPING',
        );
        if (cat && cat.children.cache.size === 0) {
          await cat.delete('Categoria vazia após desativar todos os módulos');
        }
      }
    } catch {}
  }
}

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  if (sub === 'noticias') return desativar(interaction, 'scraper_noticias', 'Notícias', '📰');
  if (sub === 'cotacoes') return desativar(interaction, 'scraper_cotacoes', 'Cotações', '💹');
}