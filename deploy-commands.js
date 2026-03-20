import { REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import { data as configurarData } from './commands/configurar.js';
import { data as moderarData } from './commands/moderar.js';
import { data as avisoData } from './commands/aviso.js';
import { data as ajudaData } from './commands/ajuda.js';

dotenv.config();

const commands = [
  configurarData.toJSON(),
  moderarData.toJSON(),
  avisoData.toJSON(),
  ajudaData.toJSON(),
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