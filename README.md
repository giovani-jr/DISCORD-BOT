# 🤖 — Bot de Gerenciamento de Servidor

Bot completo para gerenciamento de servidores Discord, desenvolvido em JavaScript com discord.js v14. Oferece ferramentas de moderação, comunicação, diversão e configuração personalizável por servidor.

---

## ✨ Funcionalidades

### ⚙️ Configuração
O bot é totalmente configurável por servidor através de slash commands. Cada servidor tem suas próprias configurações independentes.

| Comando | Descrição |
|---|---|
| `/configurar boas-vindas` | Define o canal de boas-vindas |
| `/configurar cargo-inicial` | Define o cargo para novos membros |
| `/configurar log-voz` | Define o canal de log de voz |
| `/configurar avisos` | Define o canal de avisos |
| `/configurar cargo-admin` | Define o cargo de administrador |
| `/configurar status` | Exibe as configurações atuais |

### 🔨 Moderação
| Comando | Descrição |
|---|---|
| `/moderar kick` | Expulsa um membro do servidor |
| `/moderar ban` | Bane um membro permanentemente |
| `/moderar mute` | Silencia um membro temporariamente |
| `/limpar quantidade` | Apaga uma quantidade específica de mensagens |
| `/limpar tudo` | Apaga todas as mensagens do canal (máx 14 dias) |
| `/limpar forcar` | Apaga todas as mensagens incluindo antigas |
| `/slowmode ativar` | Ativa o modo lento no canal |
| `/slowmode desativar` | Desativa o modo lento no canal |
| `/lock bloquear` | Bloqueia o canal para membros |
| `/lock desbloquear` | Desbloqueia o canal |

### 📢 Avisos
| Comando | Descrição |
|---|---|
| `/aviso enviar` | Envia um aviso para todos os membros via DM e canal |
| `/aviso agendar` | Agenda um aviso para um horário específico |

### 🎉 Diversão e Utilidade
| Comando | Descrição |
|---|---|
| `/sortear` | Cria um sorteio com tempo definido e reações |
| `/enquete` | Cria uma enquete com até 4 opções |
| `/ping` | Verifica a latência do bot |
| `/ajuda` | Exibe todos os comandos disponíveis |

### 🤖 Automático
- 👋 **Boas-vindas** — mensagem pública e DM privada para novos membros com cargo automático
- 🎧 **Log de voz** — registra entradas, saídas e mudanças de canal de voz
- ✅ **Confirmação de avisos** — membros confirmam leitura de avisos via botão na DM

---

## 🛠️ Tecnologias utilizadas

- [Node.js](https://nodejs.org/) v24
- [discord.js](https://discord.js.org/) v14
- [dotenv](https://www.npmjs.com/package/dotenv)
- [fs-extra](https://www.npmjs.com/package/fs-extra)
- [axios](https://www.npmjs.com/package/axios)

---

## ▶️ Como executar o projeto

### Pré-requisitos
- Node.js v18 ou superior
- Conta no [Discord Developer Portal](https://discord.com/developers/applications)

### 1. Clone o repositório
```bash
git clone https://github.com/giovani-jr/DISCORD-BOT.git
cd DISCORD-BOT
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure o arquivo `.env`
Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:
```env
TOKEN=seu_token_aqui
CLIENT_ID=seu_client_id_aqui
```

### 4. Registre os slash commands
```bash
node deploy-commands.js
```

### 5. Inicie o bot
```bash
node index.js
```

### 6. Configure o bot no servidor
Use os slash commands para configurar o bot no seu servidor Discord:
```
/configurar boas-vindas #canal
/configurar cargo-inicial @cargo
/configurar log-voz #canal
/configurar avisos #canal
/configurar cargo-admin @cargo
```

---

## 📁 Estrutura do projeto
```
DISCORD-BOT/
├── commands/
│   ├── ajuda.js
│   ├── advertir.js
│   ├── aviso.js
│   ├── configurar.js
│   ├── enquete.js
│   ├── limpar.js
│   ├── lock.js
│   ├── moderar.js
│   ├── ping.js
│   ├── slowmode.js
│   └── sortear.js
├── config/
│   ├── config.json
│   ├── configManager.js
│   └── advertencias.json
├── events/
├── deploy-commands.js
├── index.js
├── package.json
└── .env (não versionado)
```

---

## ⚠️ Observações

- O arquivo `.env` **nunca** deve ser compartilhado ou enviado ao GitHub
- Mensagens com mais de 14 dias só podem ser apagadas com `/limpar forcar`
- O bot precisa ter as permissões necessárias no servidor para funcionar corretamente

---

## 👨‍💻 Autor

Desenvolvido por **Giovani**.

[![GitHub](https://img.shields.io/badge/GitHub-giovani--jr-181717?style=flat&logo=github)](https://github.com/giovani-jr)