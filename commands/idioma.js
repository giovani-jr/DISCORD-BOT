import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const idiomasPath = path.join(__dirname, '../data/idiomas.json');

const IDIOMAS_DISPONIVEIS = [
  { name: '🇧🇷 Português', value: 'português' },
  { name: '🇺🇸 Inglês', value: 'inglês' },
  { name: '🇪🇸 Espanhol', value: 'espanhol' },
  { name: '🇫🇷 Francês', value: 'francês' },
  { name: '🇩🇪 Alemão', value: 'alemão' },
  { name: '🇮🇹 Italiano', value: 'italiano' },
  { name: '🇯🇵 Japonês', value: 'japonês' },
  { name: '🇰🇷 Coreano', value: 'coreano' },
  { name: '🇨🇳 Chinês', value: 'chinês' },
  { name: '🇷🇺 Russo', value: 'russo' },
];

export const data = new SlashCommandBuilder()
  .setName('idioma')
  .setDescription('Gerencie seu idioma padrão de tradução')
  .addSubcommand(sub => sub
    .setName('definir')
    .setDescription('Define seu idioma padrão para traduções')
    .addStringOption(opt => opt
      .setName('idioma')
      .setDescription('Escolha o idioma padrão')
      .setRequired(true)
      .addChoices(...IDIOMAS_DISPONIVEIS)))
  .addSubcommand(sub => sub
    .setName('ver')
    .setDescription('Veja qual é o seu idioma padrão atual'))
  .addSubcommand(sub => sub
    .setName('remover')
    .setDescription('Remove seu idioma padrão'));

export async function execute(interaction) {
  const sub = interaction.options.getSubcommand();
  const dados = fs.readJsonSync(idiomasPath, { throws: false }) || {};

  if (sub === 'definir') {
    const idioma = interaction.options.getString('idioma');
    dados[interaction.user.id] = idioma;
    fs.writeJsonSync(idiomasPath, dados, { spaces: 2 });

    const embed = new EmbedBuilder()
      .setTitle('✅ Idioma padrão definido!')
      .setDescription(`Seu idioma padrão agora é **${idioma}**.\nAgora você pode usar \`/traduzir\` sem precisar informar o idioma toda vez.`)
      .setColor('Green')
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'ver') {
    const idioma = dados[interaction.user.id];

    const embed = new EmbedBuilder()
      .setColor(idioma ? 'Blue' : 'Grey')
      .setTitle('🌐 Seu idioma padrão')
      .setDescription(idioma
        ? `Seu idioma padrão é **${idioma}**.`
        : 'Você não tem idioma padrão definido. Use `/idioma definir` para configurar.')
      .setTimestamp();

    return interaction.reply({ embeds: [embed], ephemeral: true });
  }

  if (sub === 'remover') {
    delete dados[interaction.user.id];
    fs.writeJsonSync(idiomasPath, dados, { spaces: 2 });

    return interaction.reply({
      content: '🗑️ Idioma padrão removido com sucesso.',
      ephemeral: true,
    });
  }
}