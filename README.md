# 🤖 — Bot de Gerenciamento de Servidor

Bot completo para gerenciamento de servidores Discord, desenvolvido em JavaScript com discord.js v14. Oferece ferramentas de moderação, comunicação, diversão, inteligência artificial e configuração personalizável por servidor.

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
| `/aviso criar-canal` | cria automaticamente o canal 📣-avisos com permissão somente-leitura e mensagem fixada |
| `/aviso enviar` | Envia um aviso para todos os membros via DM e canal |
| `/aviso agendar` | Agenda um aviso para um horário específico |

### 🎫 Sistema de Tickets
| Comando | Descrição |
|---|---|
| `/ticket setup` | Cria a categoria 🎫 SUPORTE, o canal 🎫-abrir-ticket e o canal 📋-logs-ticket |
| `/ticket configurar cargo` | Define o cargo da equipe de suporte que pode assumir e fechar tickets |
| `/ticket remover` | Remove toda a categoria, canais e configurações do sistema de tickets |

### 🎉 Diversão e Utilidade
| Comando | Descrição |
|---|---|
| `/sortear` | Cria um sorteio com tempo definido e reações |
| `/enquete` | Cria uma enquete com até 4 opções |
| `/coinflip` | Lança uma moeda — cara ou coroa |
| `/dado` | Rola um dado personalizado (ex: `1d6`, `2d20`, `3d8`) |
| `/8ball` | Consulte a bola mágica com uma pergunta |
| `/ping` | Verifica a latência do bot |

### 👤 Informações
| Comando | Descrição |
|---|---|
| `/userinfo` | Exibe informações detalhadas de um usuário |
| `/serverinfo` | Exibe informações do servidor |
| `/avatar` | Mostra o avatar de um membro em tamanho grande |

### 🌐 Tradução
Sistema de tradução integrado com IA via **Groq (llama-3.3-70b-versatile)**, com cooldown de 10 segundos por usuário e idioma padrão configurável individualmente.

| Comando | Descrição |
|---|---|
| `/traduzir` | Traduz um texto para o idioma desejado ou para o seu idioma padrão |
| `/idioma definir` | Define seu idioma padrão de tradução |
| `/idioma ver` | Exibe seu idioma padrão atual |
| `/idioma remover` | Remove seu idioma padrão |

### 🤖 Inteligência Artificial
Sistema de IA integrado com **Google Gemini**, com suporte a perguntas rápidas e chat privado com histórico de conversa por canal.

| Comando | Descrição |
|---|---|
| `/ia perguntar` | Faz uma pergunta rápida para a IA |
| `/ia iniciar` | Cria um canal de chat privado com a IA e histórico de conversa |
| `/ia encerrar` | Encerra e remove o canal de chat privado |

📡 Web Scraping (Notícias e Cotações)
O bot pode criar canais automáticos que publicam notícias e cotações de moedas em intervalos regulares. Todos os comandos exigem permissão de administrador ou o cargo configurado em `/configurar cargo-admin`.

| Comando | Descrição |
|---------|-----------|
| `/ativar scraping noticias [regiao] [nome-canal]` | Cria um canal de notícias dentro da categoria `📡 SCRAPING`. Atualiza a cada 30 minutos. Regiões: `brasil`, `eua`, `europa`, `tudo` |
| `/ativar scraping cotacoes [nome-canal]` | Cria um canal de cotações financeiras na mesma categoria. Atualiza a cada 15 minutos. Inclui USD, EUR, BTC, Ouro, SELIC e mais |
| `/desativar scraping noticias` | Para o envio de notícias e remove o canal (com opção de manter o canal vazio) |
| `/desativar scraping cotacoes` | Para o envio de cotações e remove o canal (com opção de manter o canal vazio) |

> ⚠️ Os canais são criados **somente-leitura** e dentro de uma categoria chamada **📡 SCRAPING** (criada automaticamente se não existir).


### 📋 Ajuda inteligente
O comando `/ajuda` exibe conteúdo diferente dependendo de quem o utiliza:
- **Membros comuns** — veem apenas os comandos de diversão, informações, tradução e IA
- **Administradores** — veem todos os comandos acima mais os de moderação, configuração, avisos e controle de canais

### 🤖 Automático
- 👋 **Boas-vindas** — mensagem pública e DM privada para novos membros com cargo automático
- 🎧 **Log de voz** — registra entradas, saídas e mudanças de canal de voz com duração
- ✅ **Confirmação de avisos** — membros confirmam leitura de avisos via botão na DM
- 📡 **Web Scraping** — (Notícias e Cotações)
- 🎫 Tickets — sistema completo de atendimento com logs, permissões e DMs automáticas

---

## 🛠️ Tecnologias utilizadas

- [Node.js](https://nodejs.org/) v24
- [discord.js](https://discord.js.org/) v14
- [dotenv](https://www.npmjs.com/package/dotenv)
- [fs-extra](https://www.npmjs.com/package/fs-extra)
- [axios](https://www.npmjs.com/package/axios)
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai)
- [groq-sdk](https://www.npmjs.com/package/groq-sdk)

---

## ▶️ Como executar o projeto

### Pré-requisitos
- Node.js v18 ou superior
- Conta no [Discord Developer Portal](https://discord.com/developers/applications)
- Chave de API do [Google Gemini](https://aistudio.google.com/apikey)
- Chave de API do [Groq](https://console.groq.com/keys)

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
GEMINI_API_KEY=sua_chave_gemini_aqui
GROQ_API_KEY=sua_chave_groq_aqui
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
│   ├── 8ball.js
│   ├── ajuda.js
│   ├── ativar.js
│   ├── avatar.js
│   ├── aviso.js
│   ├── coinflip.js
│   ├── configurar.js
│   ├── dado.js
│   ├── desativar.js
│   ├── enquete.js
│   ├── ia.js
│   ├── idioma.js
│   ├── limpar.js
│   ├── lock.js
│   ├── moderar.js
│   ├── ping.js
│   ├── serverinfo.js
│   ├── slowmode.js
│   ├── sortear.js
│   ├── ticket.js
│   ├── traduzir.js
│   └── userinfo.js
├── config/
│   ├── config.json
│   └── configManager.js
├── data/
│   ├── idiomas.json
│   └── tickets.json
├── handlers/
│   └── ticketHandler.js
├── scrapers/
│   ├── cotacoes.js
│   ├── noticias.js
│   └── scheduler.js
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
- O `/traduzir` tem cooldown de 10 segundos por usuário para evitar sobrecarga da API
- Os comandos `/ativar scraping *` criam automaticamente uma categoria `📡 SCRAPING` e canais somente-leitura. O bot precisa da permissão **Gerenciar Canais** para isso.
- O sistema de tickets requer que o bot tenha permissão de Gerenciar Canais e Gerenciar Permissões
- Tickets são armazenados em data/tickets.json — não apague este arquivo ou o histórico será perdido

---

## 👨‍💻 Autor

Desenvolvido por **Giovani**.

[![GitHub](https://img.shields.io/badge/GitHub-giovani--jr-181717?style=flat&logo=github)](https://github.com/giovani-jr)