# Papa Tango WhatsApp Bot

![Status](https://img.shields.io/badge/status-ativo-brightgreen)
![Versão](https://img.shields.io/badge/versão-1.0.0-blue)
![Node](https://img.shields.io/badge/node-14+-green)
![Licença](https://img.shields.io/badge/licença-MIT-orange)

Um bot de WhatsApp automatizado para gerenciamento de pagamentos e comunicação com clientes da Papa Tango, uma plataforma de aluguel de motos.

## 📋 Índice
- [Visão Geral](#-visão-geral)
- [Problema Resolvido](#problema-resolvido)
- [Benefícios](#benefícios)
- [Screenshots](#-screenshots)
- [Funcionalidades](#-funcionalidades)
- [Fluxo de Trabalho](#-fluxo-de-trabalho)
- [Sistema de Notificação por Email](#-sistema-de-notificação-por-email)
- [Tecnologias Utilizadas](#️-tecnologias-utilizadas)
- [Instalação e Configuração](#-instalação-e-configuração)
- [Uso do Bot](#-uso-do-bot)
- [Tarefas Agendadas](#️-tarefas-agendadas)
- [Endpoints da API](#-endpoints-da-api)
- [Testes](#-testes)
- [Manutenção](#-manutenção)
- [Solução de Problemas](#-solução-de-problemas)
- [Deploy](#-deploy)
- [Testes na EC2](#-testes-na-ec2)
- [Ajuste de Fuso Horário na EC2](#-ajuste-de-fuso-horário-na-ec2)
- [Testes Locais com Docker](#-testes-locais-com-docker)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Roadmap](#-roadmap)
- [Contato](#-contato)

## 📋 Visão Geral

O Papa Tango WhatsApp Bot é uma solução automatizada para gerenciar pagamentos, enviar lembretes, gerar boletos e códigos PIX, e fornecer informações sobre contratos de aluguel de motos. O bot se integra com o Firebase para armazenamento de dados, com o Mercado Pago para processamento de pagamentos e funciona 24 horas por dia 7 dias por semana, porque está em uma instância EC2 da AWS.

### Problema Resolvido

O bot resolve os seguintes desafios enfrentados pela Papa Tango:
- Acompanhamento manual de pagamentos pendentes
- Alta taxa de inadimplência por esquecimento dos clientes
- Dificuldade em gerar métodos de pagamento de forma rápida
- Comunicação inconsistente sobre datas e valores de pagamento

### Benefícios

- **Redução de inadimplência**: Lembretes automáticos aumentam a taxa de pagamentos em dia
- **Economia de tempo**: Automatização de tarefas repetitivas de cobrança
- **Melhor experiência do cliente**: Facilidade para realizar pagamentos via WhatsApp
- **Monitoramento em tempo real**: Acompanhamento de pagamentos e interações
- **Comunicação consistente**: Mensagens padronizadas e profissionais

## 📸 Screenshots

<table>
  <tr>
    <td align="center"><b>Menu Principal</b></td>
    <td align="center"><b>Informações de Pagamento</b></td>
  </tr>
  <tr>
    <td><img src="./screenshots/menu-principal.jpeg" width="300"/></td>
    <td><img src="./screenshots/informacoes-sobre-pagamento-no-dia-do-pagamento.jpeg" width="300"/></td>
  </tr>
  <tr>
    <td align="center"><b>Pagamento Atrasado</b></td>
    <td align="center"><b>Pagamento Adiantado</b></td>
  </tr>
  <tr>
    <td><img src="./screenshots/informacoes-sobre-pagamento-atrasado.jpeg" width="300"/></td>
    <td><img src="./screenshots/informacoes-sobre-pagamento-adiantado.jpeg" width="300"/></td>
  </tr>
</table>

### Geração de Métodos de Pagamento

<table>
  <tr>
    <td align="center"><b>Boleto Normal</b></td>
    <td align="center"><b>Boleto com Atraso</b></td>
    <td align="center"><b>PIX Normal</b></td>
    <td align="center"><b>PIX com Atraso</b></td>
  </tr>
  <tr>
    <td><img src="./screenshots/boleto.jpeg" width="200"/></td>
    <td><img src="./screenshots/boleto-atraso.jpeg" width="200"/></td>
    <td><img src="./screenshots/codigo-pix.jpeg" width="200"/></td>
    <td><img src="./screenshots/codigo-pix-atraso.jpeg" width="200"/></td>
  </tr>
</table>

### Verificação de Atraso

<table>
  <tr>
    <td align="center"><b>Regular</b></td>
    <td align="center"><b>No Dia do Pagamento</b></td>
    <td align="center"><b>Pagamento Atrasado</b></td>
  </tr>
  <tr>
    <td><img src="./screenshots/verificacao-atraso-regular.jpeg" width="250"/></td>
    <td><img src="./screenshots/verificacao-atraso-no-dia-do-pagamento.jpeg" width="250"/></td>
    <td><img src="./screenshots/verificacao-atraso-atrasado.jpeg" width="250"/></td>
  </tr>
</table>

### Atendimento

<table>
   <tr> 
      <td align="center"><b>Atendimento</b></td> 
   </tr>
   <tr>
      <td><img src="./screenshots/atendimento.jpeg" width="200"/></td>
   </tr>
</table>


### Lembretes de Pagamento

<table>
  <tr>
    <td align="center"><b>No Dia</b></td>
    <td align="center"><b>Atrasado</b></td>
    <td align="center"><b>Adiantado</b></td>
    <td align="center"><b>Noturno</b></td>
  </tr>
  <tr>
    <td><img src="./screenshots/lembrete-pagamento-no-dia.jpeg" width="200"/></td>
    <td><img src="./screenshots/lembrete-pagamento-atrasado.jpeg" width="200"/></td>
    <td><img src="./screenshots/lembrete-pagamento-adiantado.jpeg" width="200"/></td>
    <td><img src="./screenshots/lembrete-pagamento-noturno.jpeg" width="200"/></td>
  </tr>
</table>

## ✨ Funcionalidades

- **Atendimento Automatizado**: Responde a mensagens dos clientes com um menu interativo
- **Informações de Pagamento**: Fornece detalhes sobre próximos pagamentos e status de contratos
- **Geração de Boletos**: Cria boletos bancários para pagamentos
- **Geração de Códigos PIX**: Gera QR codes e códigos PIX para pagamentos instantâneos
- **Verificação de Atraso**: Informa sobre pagamentos em atraso e suas consequências
- **Lembretes Automáticos**: 
  - Lembretes diurnos (10:10): Enviados para pagamentos próximos do vencimento, no vencimento e atrasados
  - Lembretes noturnos (21:00): Reforço para pagamentos PIX pendentes gerados durante o dia

## 🔄 Fluxo de Trabalho

```mermaid
graph TD
    A[Cliente envia mensagem] --> B{Bot identifica comando}
    B -->|Pagamento| C[Verifica contratos e pagamentos]
    B -->|Boleto| D[Gera boleto via Mercado Pago]
    B -->|PIX| E[Gera código PIX via Mercado Pago]
    B -->|Atraso| F[Verifica situação de atraso]
    B -->|Atendente| G[Encaminha para atendimento humano]
    
    C --> H[Envia informações de pagamento]
    D --> I[Envia link e código de barras]
    E --> J[Envia QR code e código PIX]
    F --> K[Envia status de pagamento]
    
    L[Agendador] -->|10:10 diariamente| M[Envia lembretes matinais]
    L -->|21:00 diariamente| N[Envia lembretes noturnos de PIX]
    
    M --> O[Firestore registra lembretes enviados]
    N --> O
```

## 📧 Sistema de Notificação por Email

O bot inclui um sistema de notificação por email que envia alertas automáticos quando um novo QR code é gerado. Isso facilita a reconexão do bot caso a sessão do WhatsApp seja desconectada.

### Funcionamento

1. Quando um novo QR code é gerado (na inicialização ou após desconexão), o sistema envia automaticamente um email para o administrador
2. O email contém um link direto para a página do QR code
3. O administrador pode clicar no link e escanear o QR code para reconectar o bot

### Configuração

Para que o sistema de notificação funcione, as seguintes variáveis de ambiente devem estar configuradas:

```env
EMAIL_USER=seu-email@gmail.com
EMAIL_PASS=sua-senha-de-app
ADMIN_EMAIL=email-do-administrador@gmail.com
```

### Endpoints Relacionados

- `GET /qrcode`: Exibe a página com o QR code para escaneamento
- `GET /qrcode-status`: Retorna o status atual do QR code e da conexão
- `GET /teste-email`: Testa o envio de email de notificação

## 🔄 Conexão Robusta

O sistema implementa mecanismos para manter a conexão do WhatsApp estável:

1. **Monitoramento de Estado**: Verifica periodicamente o estado da conexão
2. **Reconexão Automática**: Tenta reconectar automaticamente em caso de desconexão
3. **Resolução de Conflitos**: Resolve conflitos de sessão automaticamente
4. **Notificação por Email**: Envia email quando é necessário escanear um novo QR code

## 🛠️ Tecnologias Utilizadas

- **Node.js**: Ambiente de execução JavaScript
- **Express**: Framework web para APIs
- **Venom-Bot**: Biblioteca para automação do WhatsApp
- **Firebase/Firestore**: Banco de dados e autenticação
- **Mercado Pago API**: Processamento de pagamentos
- **QRCode**: Geração de QR codes para pagamentos PIX
- **Axios**: Cliente HTTP para requisições
- **Node Schedule**: Agendamento de tarefas
- **Nodemailer**: Envio de emails de notificação

## 🚀 Instalação e Configuração

### Pré-requisitos

- Node.js 14+ instalado
- Conta no Firebase com Firestore configurado
- Conta no Mercado Pago para processamento de pagamentos
- Número de telefone dedicado para o bot do WhatsApp

### Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/papa-tango-whatsapp-bot.git
cd papa-tango-whatsapp-bot
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
   - Crie um arquivo `.env` baseado no `.env.example`
   - Adicione as credenciais do Firebase e outras configurações necessárias

4. Adicione o arquivo de credenciais do Firebase:
   - Baixe o arquivo `serviceAccountKey.json` do console do Firebase
   - Coloque-o na raiz do projeto

5. Inicie o servidor:
```bash
npm start
```

6. Escaneie o QR code que aparecerá no console para autenticar o WhatsApp

## 📱 Uso do Bot

### Comandos Disponíveis

Os clientes podem interagir com o bot usando os seguintes comandos:

| Comando | Alternativas | Descrição |
|---------|--------------|-----------|
| **1** | pagamento, informações sobre o pagamento | Receber informações sobre o próximo pagamento |
| **2** | boleto, pagar com boleto | Gerar um boleto bancário para pagamento |
| **3** | pix, pagar com pix | Gerar um código PIX para pagamento |
| **4** | atraso, atrasado, regularizar atraso | Verificar situação de atraso em pagamentos |
| **5** | atendente, atendimento, falar com atendente | Solicitar contato com atendente humano |

### Exemplo de Interação

```
Cliente: Olá, preciso pagar meu aluguel
Bot: Olá, Cliente! Como posso ajudar?
     1. Informações sobre pagamento
     2. Pagar com boleto
     3. Pagar com PIX
     4. Verificar atraso
     5. Falar com atendente

Cliente: 3
Bot: Gerando seu código PIX, aguarde um momento...
     [Envia QR Code e instruções de pagamento]
```

### Fluxo de Pagamento

1. Cliente solicita informações de pagamento ou geração de boleto/PIX
2. Bot verifica contratos ativos e calcula valores e datas
3. Bot gera o método de pagamento solicitado e envia para o cliente
4. Cliente realiza o pagamento

## ⏱️ Tarefas Agendadas

O sistema executa automaticamente as seguintes tarefas:

- **Lembretes de Pagamento Diurno**: Enviados diariamente às 10:10
  - Para pagamentos que vencem hoje
  - Para pagamentos que vencem nos próximos 3 dias
  - Para pagamentos atrasados
  
- **Lembretes de Pagamento Noturno**: Enviados diariamente às 21:00
  - Apenas para pagamentos PIX pendentes gerados durante o dia
  - Reforço para aumentar a conversão de pagamentos

- **Keep-Alive**: A cada 14 minutos para evitar que o serviço adormeça no Render.com

## 🔌 Endpoints da API

### Endpoints Públicos

- `GET /`: Verifica status do servidor
- `POST /enviar-codigo`: Envia código de verificação para um número

### Endpoints Administrativos

- `GET /qrcode`: Exibe QR code para autenticação do WhatsApp
- `GET /qrcode-status`: Verifica o status atual do QR code e da conexão
- `GET /teste-email`: Testa o sistema de notificação por email
- `POST /teste-lembrete-matinal`: Testa o envio de lembretes de pagamento matinal
- `POST /teste-lembrete-noturno`: Testa o envio de lembretes de pagamento noturno
- `POST /teste-mensagem`: Testa o envio de mensagens para um número específico
- `GET /verificar-usuarios`: Verifica usuários pelo número de telefone

## 🧪 Testes

Para testar as funcionalidades do bot sem esperar pelo agendamento, você pode usar os seguintes endpoints:

### Teste de Lembretes Matinais
```bash
curl -X POST http://localhost:3000/teste-lembrete-matinal
```

### Teste de Lembretes Noturnos
```bash
curl -X POST http://localhost:3000/teste-lembrete-noturno
```

### Teste de Envio de Mensagem
```bash
curl -X POST http://localhost:3000/teste-mensagem \
  -H "Content-Type: application/json" \
  -d '{"numero": "5585999999999", "mensagem": "Teste de mensagem"}'
```

## 🧪 Testes na EC2

Após realizar o deploy na instância EC2 da AWS, você pode testar as rotas da API para garantir que tudo está funcionando corretamente.

### Passos para testar:

1. **Obtenha o IP público ou domínio da sua instância EC2.**

2. **Substitua `localhost` pelo IP público ou domínio na URL dos endpoints.**

Exemplo para testar lembretes matinais:

```bash
curl -X POST http://seu-ip-ec2/teste-lembrete-matinal
```

Exemplo para testar lembretes noturnos:
```bash
curl -X POST http://seu-ip-ec2/teste-lembrete-noturno
```

3. **Testar envio de mensagem específica:**

Enviar informações de pagamento
```bash
curl -X POST http://seu-ip-ec2/teste-mensagem \
  -H "Content-Type: application/json" \
  -d '{"numero": "5585999999999", "tipo": "info"}'
```
Enviar boleto
```bash
curl -X POST http://seu-ip-ec2/teste-mensagem \
  -H "Content-Type: application/json" \
  -d '{"numero": "5585999999999", "tipo": "boleto"}'
```
Enviar PIX
```bash
curl -X POST http://seu-ip-ec2/teste-mensagem \
  -H "Content-Type: application/json" \
  -d '{"numero": "5585999999999", "tipo": "pix"}'
```
Verificar atraso
```bash
curl -X POST http://seu-ip-ec2/teste-mensagem \
  -H "Content-Type: application/json" \
  -d '{"numero": "5585999999999", "tipo": "atraso"}'
```
Enviar mensagem de texto personalizada
```bash
curl -X POST http://seu-ip-ec2/teste-mensagem \
  -H "Content-Type: application/json" \
  -d '{"numero": "5585999999999", "tipo": "texto", "mensagem": "Teste de mensagem personalizada"}'
```

4. **Verificar status do servidor:**

```bash
curl http://SEU_IP_EC2
```

5. **Testar Envio de Email:**
```bash
curl http://seu-ip-ec2/teste-email
```

6. **Verificar QR code para autenticação:**

Acesse no navegador:

```
http://SEU_IP_EC2/qrcode
```

7. **Verificar Status do QR Code:**
```bash	
curl http://seu-ip-ec2/qrcode-status
```

---

## ⏰ Ajuste de Fuso Horário na EC2

Como a instância EC2 pode estar em um fuso horário diferente do Brasil, é importante ajustar o timezone para que as tarefas agendadas (como lembretes diurnos e noturnos) sejam executadas no horário correto.

### Como ajustar o fuso horário:

1. Conecte-se à sua instância EC2 via SSH:

```bash
ssh -i caminho/para/sua-chave.pem ec2-user@SEU_IP_EC2
```

2. Verifique o timezone atual:

```bash
date
```

3. Ajuste para o fuso horário de São Paulo (GMT-3) (Para Amazon Linux 2 ou Amazon Linux 2023):

```bash
sudo timedatectl set-timezone America/Sao_Paulo
```

4. Confirme a alteração:

```bash
date
```

---

## 🐳 Testes Locais com Docker

Para facilitar o desenvolvimento e testes locais, você pode rodar o bot dentro de um container Docker. Abaixo está um passo a passo para criar o Dockerfile, configurar o docker-compose e executar o bot localmente.

### Passo 1: Criar o arquivo `Dockerfile` na raiz do projeto

```dockerfile
FROM node:16-alpine

WORKDIR /app

# Instalar dependências do sistema
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont

# Definir variáveis de ambiente para o Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código-fonte
COPY . .

# Criar diretório para tokens
RUN mkdir -p tokens && chmod 777 tokens

# Expor porta
EXPOSE 3000

# Comando para iniciar a aplicação
CMD ["npm", "start"]
```

### Passo 2: Criar o arquivo `docker-compose.yml` na raiz do projeto

```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - NODE_ENV=development
      - LOG_LEVEL=debug
      - EMAIL_USER=${EMAIL_USER}
      - EMAIL_PASS=${EMAIL_PASS}
      - ADMIN_EMAIL=${ADMIN_EMAIL}
    volumes:
      - ./src:/app/src
      - ./tokens:/app/tokens
      - ./temp:/app/temp
    restart: unless-stopped
```

### Passo 3: Construir e rodar o container

No terminal, execute:

```bash
docker-compose up --build
```

Verificar logs
```bash
docker-compose logs -f
```

Parar os contêineres
```bash
docker-compose down
```

### Passo 4: Testar localmente

Agora o bot estará rodando em `http://localhost:3000`. Você pode usar os mesmos comandos curl para testar as rotas, por exemplo:

```bash
curl -X POST http://localhost:3000/teste-lembrete-matinal
```

### Observações

- O volume `.:/app` permite que alterações no código sejam refletidas imediatamente no container.
- Certifique-se de configurar corretamente as variáveis de ambiente no arquivo `docker-compose.yml` ou usando um arquivo `.env`.

## 🔧 Manutenção

### Monitoramento

O sistema registra logs detalhados sobre:
- Conexões do WhatsApp
- Processamento de mensagens
- Geração de pagamentos
- Webhooks recebidos
- Erros e exceções

Os logs são armazenados no console e podem ser integrados com serviços como Papertrail ou Loggly para monitoramento em produção.

### Reinicialização

Se o bot desconectar, você pode:
1. Acessar `/qrcode` para escanear um novo QR code
2. Reiniciar o serviço no painel do Render.com

## 🔍 Solução de Problemas

### Problemas Comuns

1. **QR Code não aparece ou não funciona**
   - Verifique se a pasta `tokens` existe e tem permissões de escrita
   - Apague a pasta `tokens` e reinicie o servidor
   - Certifique-se de que o WhatsApp não está aberto em outro dispositivo
   - Verifique seu email para ver se recebeu uma notificação com o link do QR code

2. **Não recebo emails de notificação do QR code**
   - Verifique se as variáveis de ambiente relacionadas ao email estão configuradas corretamente
   - Confirme se o email não está na pasta de spam
   - Teste o envio de email usando o endpoint `/teste-email`
   - Verifique os logs para identificar erros no envio de email

3. **Erro de Índice no Firestore**
   - Acesse o link fornecido no erro para criar o índice necessário
   - Aguarde alguns minutos para que o índice seja criado

4. **Pagamentos não são processados**
   - Verifique as credenciais do Mercado Pago no arquivo .env
   - Confirme se o webhook do Mercado Pago está configurado corretamente
   - Verifique os logs para identificar erros específicos

5. **Bot não responde às mensagens**
   - Verifique se o serviço está em execução
   - Confirme se a autenticação do WhatsApp está ativa
   - Reinicie o serviço e escaneie o QR code novamente

### Logs de Erro

Para visualizar logs detalhados de erros:

```bash
# No ambiente de desenvolvimento
npm start

# No Render.com
Acesse o painel do Render > Logs
```

## 🚢 Deploy

### Pré-requisitos
- Conta na AWS
- Conhecimentos básicos de EC2 e Docker
- Chave SSH para acesso à instância

### Etapa 1: Criar uma Instância EC2
1. Acesse o [Console AWS](https://aws.amazon.com/console/)
2. Navegue até o serviço EC2
3. Clique em "Launch Instance" (Executar instância)
4. Escolha a Amazon Linux 2023 como sistema operacional
5. Selecione o tipo de instância t2.micro (elegível para o nível gratuito)
6. Configure os detalhes da instância conforme necessário
7. Adicione armazenamento (8GB é suficiente para começar)
8. Configure grupos de segurança para permitir tráfego nas portas:
   - SSH (22) - apenas do seu IP
   - HTTP (80) - de qualquer lugar
   - HTTPS (443) - de qualquer lugar
9. Revise e execute a instância
10. Crie ou selecione um par de chaves para SSH

### Etapa 2: Conectar à Instância
```bash
ssh -i caminho/para/sua-chave.pem ec2-user@seu-ip-publico
```

### Etapa 3: Instalar Docker na Instância
```bash
# Atualizar o sistema
sudo yum update -y

# Instalar Docker
sudo yum install -y docker

# Iniciar o serviço Docker
sudo systemctl start docker

# Habilitar Docker para iniciar na inicialização
sudo systemctl enable docker

# Adicionar o usuário ec2-user ao grupo docker
sudo usermod -a -G docker ec2-user

# Aplicar as alterações de grupo (reconecte-se após este comando)
exit
```

### Etapa 4: Instalar Docker Compose
```bash
# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Tornar o binário executável
sudo chmod +x /usr/local/bin/docker-compose

# Verificar a instalação
docker-compose --version
```

### Etapa 5: Configurar o Projeto
1. Crie um diretório para o projeto:
```bash
mkdir -p ~/papa-tango-bot
```

2. Transfira os arquivos do projeto para a instância:
```bash
# No seu computador local (PowerShell):
scp -i "caminho/para/sua-chave.pem" -r "caminho/local/Dockerfile" "caminho/local/docker-compose.yml" "caminho/local/src" ec2-user@seu-ip-publico:~/papa-tango-bot/
scp -i "caminho/para/sua-chave.pem" "caminho/local/package.json" "caminho/local/package-lock.json" "caminho/local/serviceAccountKey.json" ec2-user@seu-ip-publico:~/papa-tango-bot/
```

3. Configure o arquivo docker-compose.yml:
```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "80:3000"
    environment:
      - PORT=3000
      - NODE_ENV=production
      - LOG_LEVEL=info
      - AWS=true
      - EMAIL_USER=seu-email@gmail.com
      - EMAIL_PASS=sua-senha-de-app
      - ADMIN_EMAIL=email-do-administrador@gmail.com
      - AWS_EXTERNAL_URL=http://seu-ip-publico
    volumes:
      - ./tokens:/app/tokens
    restart: always
```

### Etapa 6: Executar o Bot
```bash
cd ~/papa-tango-bot
mkdir -p tokens
chmod 777 tokens
docker-compose up -d --build
```

### Etapa 7: Autenticar o WhatsApp
1. Verifique os logs para ver o QR code:
```bash
docker-compose logs -f
```

2. Escaneie o QR code com seu WhatsApp para autenticar o bot
3. Após a autenticação, o bot estará operacional

### Etapa 8: Configurar Inicialização Automática
```bash
# Criar script de inicialização
cat > ~/startup.sh << 'EOL'
#!/bin/bash
cd ~/papa-tango-bot
docker-compose up -d
EOL

# Tornar o script executável
chmod +x ~/startup.sh

# Configurar para executar na inicialização
echo "@reboot ~/startup.sh" | crontab -
```

### Monitoramento e Manutenção

#### Verificar Logs
```bash
cd ~/papa-tango-bot
docker-compose logs -f
```

#### Reiniciar o Bot
```bash
cd ~/papa-tango-bot
docker-compose restart
```

#### Atualizar o Bot
1. Transfira os arquivos atualizados para a instância
2. Reconstrua o contêiner:
```bash
cd ~/papa-tango-bot
docker-compose down
docker-compose up -d --build
```

#### Parar o Bot
```bash
cd ~/papa-tango-bot
docker-compose down
```

### Considerações de Segurança
- Mantenha a porta SSH (22) aberta apenas para seu IP
- Use senhas fortes para todos os serviços
- Considere implementar HTTPS com Let's Encrypt para maior segurança
- Faça backup regular dos tokens de sessão do WhatsApp

### Monitoramento de Custos
- A instância t2.micro é elegível para o nível gratuito da AWS por 12 meses
- Configure alertas de orçamento para evitar cobranças inesperadas
- Monitore o uso de recursos regularmente no painel da AWS

## 📊 Estrutura do Projeto

```
papa-tango-whatsapp-bot/
├── src/
│   ├── config/
│   │   └── firebase.js       # Configuração do Firebase
│   ├── services/
│   │   ├── index.js          # Servidor Express e rotas
│   │   ├── payment.js        # Serviços de pagamento
│   │   ├── scheduler.js      # Agendador de tarefas
│   │   └── whatsapp.js       # Cliente WhatsApp
│   └── utils/
│       └── logger.js         # Utilitário de logging
├── temp/                     # Arquivos temporários (QR codes)
├── tokens/                   # Tokens de sessão do WhatsApp
├── screenshots/              # Screenshots para documentação
├── .env                      # Variáveis de ambiente
├── .env.example              # Exemplo de variáveis de ambiente
├── .gitignore                # Arquivos ignorados pelo Git
├── package.json              # Dependências e scripts
└── README.md                 # Documentação
```

## 🚀 Roadmap

Funcionalidades planejadas para futuras versões:

- [ ] **Integração com CRM**: Sincronização com sistema de gestão de clientes
- [ ] **Análise de sentimento**: Detecção automática de clientes insatisfeitos
- [ ] **Múltiplos números**: Suporte a vários números de WhatsApp para escalabilidade
- [ ] **Chatbot com IA**: Integração com modelos de linguagem para respostas mais naturais
- [ ] **Relatórios automáticos**: Envio de relatórios diários/semanais para gestores

## 📞 Contato

Para suporte ou dúvidas, entre em contato através do WhatsApp: (85) 99268-4035.

Para questões técnicas ou contribuições ao projeto, entre em contato com:
- Pedro Castro - [pedrohenriquecastro.martins@gmail.com](mailto:pedrohenriquecastro.martins@gmail.com)
- [GitHub](https://github.com/pedcastr)
- [LinkedIn](https://www.linkedin.com/in/pedro-castro-2504471b7/)

---

Desenvolvido com ❤️ por Pedro Castro

*Este projeto é proprietário e seu uso é restrito à Papa Tango.*
