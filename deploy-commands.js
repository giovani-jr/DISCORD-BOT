import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { data as configurarData } from './commands/configurar.js';
import { data as moderarData } from './commands/moderar.js';
import { data as avisoData } from './commands/aviso.js';
import { data as ajudaData } from './commands/ajuda.js';
import { data as limparData } from './commands/limpar.js';
import { data as pingData } from './commands/ping.js';
import { data as sortearData } from './commands/sortear.js';
import { data as enqueteData } from './commands/enquete.js';
import { data as slowmodeData } from './commands/slowmode.js';
import { data as lockData } from './commands/lock.js';
import { data as coinflipData } from './commands/coinflip.js';
import { data as dadoData } from './commands/dado.js';
import { data as eightballData } from './commands/8ball.js';
import { data as userinfoData } from './commands/userinfo.js';
import { data as serverinfoData } from './commands/serverinfo.js';
import { data as avatarData } from './commands/avatar.js';

dotenv.config();

const commands = [
  configurarData.toJSON(),
  moderarData.toJSON(),
  avisoData.toJSON(),
  ajudaData.toJSON(),
  limparData.toJSON(),
  pingData.toJSON(),
  sortearData.toJSON(),
  enqueteData.toJSON(),
  slowmodeData.toJSON(),
  lockData.toJSON(),
  coinflipData.toJSON(),
  dadoData.toJSON(),
  eightballData.toJSON(),
  userinfoData.toJSON(),
  serverinfoData.toJSON(),
  avatarData.toJSON(),
];

const rest = new REST().setToken(process.env.TOKEN);

try {
  console.log('🔄 Registrando slash commands...');

  await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands },
  );

  console.log('✅ Slash commands registrados com sucesso!');
} catch (error) {
  console.error(error);
}