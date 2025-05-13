const venom = require('venom-bot');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const paymentService = require('./payment');
const { db } = require('../config/firebase');
const emailSender = require('../utils/emailSender');

// Configurações de email
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'pedrohenriquecastro.martins@gmail.com';
const SERVER_URL = process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';

// Pasta para tokens
const tokensDir = path.join(__dirname, '../../tokens');
if (!fs.existsSync(tokensDir)) {
  fs.mkdirSync(tokensDir);
}

let client = null;
// Variável para armazenar o QR code
let currentQrCode = null;
// Variável para armazenar o timestamp do último QR code
let lastQrCodeTimestamp = null;
// Variável para controlar se já enviamos email para o QR code atual
let qrCodeEmailSent = false;

// Função para configurar conexão robusta
function setupRobustConnection(client) {
  // Monitorar estado da sessão com tratamento mais robusto
  client.onStateChange((state) => {
    logger.info('Estado da sessão alterado:', state);

    // Reconectar se desconectado
    if (state === 'CONFLICT') {
      logger.warn('Conflito detectado. Usando sessão aqui...');
      client.useHere();
    } else if (state === 'UNPAIRED' || state === 'UNLAUNCHED') {
      logger.warn('Sessão desemparelhada ou não iniciada. Tentando reconectar...');
      setTimeout(() => {
        client.useHere();
      }, 3000);
    }
  });

  // Verificar estado da conexão periodicamente
  setInterval(async () => {
    try {
      if (!client) return;

      const state = await client.getConnectionState();
      logger.info(`Verificação periódica do estado da conexão: ${state}`);

      if (state === 'DISCONNECTED') {
        logger.warn('Conexão desconectada. Tentando reconectar...');
        try {
          await client.restart();
          logger.info('Cliente reiniciado após desconexão');
        } catch (error) {
          logger.error('Erro ao reiniciar cliente:', error);
        }
      }
    } catch (error) {
      logger.error('Erro ao verificar estado da conexão:', error);
    }
  }, 3 * 60 * 1000); // A cada 3 minutos
}

// Função para enviar notificação por email sobre novo QR code
async function notifyQrCodeByEmail() {
  try {
    if (qrCodeEmailSent) {
      logger.info('Email já enviado para este QR code, ignorando');
      return;
    }
    
    const qrCodeUrl = `${SERVER_URL}/qrcode`;
    logger.info(`Enviando notificação de QR code por email para ${ADMIN_EMAIL} com URL ${qrCodeUrl}`);
    
    const success = await emailSender.sendQrCodeNotification(ADMIN_EMAIL, qrCodeUrl);
    
    if (success) {
      logger.info('Notificação de QR code enviada com sucesso');
      qrCodeEmailSent = true;
    } else {
      logger.error('Falha ao enviar notificação de QR code');
    }
  } catch (error) {
    logger.error('Erro ao enviar notificação de QR code:', error);
    logger.error('Detalhes do erro:', error.message);
    if (error.response) {
      logger.error('Resposta do servidor de email:', error.response.data);
    }
  }
}

// Inicializar cliente WhatsApp
async function initWhatsApp() {
  try {
    client = await venom.create({
      session: 'papa-motos',
      multidevice: true,
      headless: 'new',
      useChrome: true,
      browserArgs: ['--no-sandbox'],
      disableWelcome: true,
      // Opções para capturar o QR code
      qrOptions: {
        size: 300
      },
      // Callback para quando o QR code for gerado
      onQR: (qrCode) => {
        currentQrCode = qrCode;
        lastQrCodeTimestamp = new Date().toISOString();
        qrCodeEmailSent = false; // Resetar flag para permitir envio de email
        logger.info('Novo QR code gerado');

        // Enviar notificação por email
        notifyQrCodeByEmail();
      }
    });

    logger.info('Cliente WhatsApp conectado!');

    // Configurar manipulador de mensagens recebidas
    client.onMessage(handleIncomingMessage);

    // Configurar conexão robusta
    setupRobustConnection(client);

    return client;
  } catch (error) {
    logger.error('Erro ao inicializar cliente WhatsApp:', error);
    throw error;
  }
}

// Função para lidar com mensagens recebidas
async function handleIncomingMessage(message) {
  if (message.isGroupMsg) return;

  // Verificar o tipo de mensagem ANTES de verificar o corpo
  if (message.type === 'ptt' || message.type === 'audio') {
    // Mensagem de áudio
    await client.sendText(message.from,
      '🤖 Desculpe, este é um *atendimento automatizado* e não consigo processar *mensagens de áudio*.\n\n' +
      '🤖 *Por favor, envie sua solicitação em formato de texto.*');
    return;
  }

  // Verificar se é uma imagem ou documento
  if (message.type === 'image' || message.type === 'document') {
    await client.sendText(message.from,
      `*Obrigado por enviar seu comprovante* 🙏🏽\n\n` +
      `Seu pagamento será processado *automaticamente pelo sistema* assim que for *confirmado* pela instituição financeira.\n\n` +
      `Se precisar de ajuda, entre em contato com nosso suporte: (85) 99268-4035.\n\n` +
      `Verifique seu e-mail, pois quando o pagamento for aprovado enviaremos uma mensagem por lá.\n\n*Obs: Caso já tenha recebido o e-mail de pagamento recebido, desconsidere este aviso.*`);
    return; // Adicionado return para interromper o processamento aqui
  }

  // Se chegou aqui, é uma mensagem de texto
  // Verificar se tem corpo da mensagem
  if (!message.body) return;

  // Extrair o número de telefone e remover o sufixo @c.us
  const telefoneCompleto = message.from.replace('@c.us', '');

  // Formatos possíveis para buscar no banco de dados
  const formatosPossiveis = [
    telefoneCompleto,                                // Formato completo com código do país
    telefoneCompleto.replace(/^55/, ''),            // Sem o código do país (55)
    telefoneCompleto.replace(/^55(\d{2})/, '$1'),   // Apenas DDD + número
    `+${telefoneCompleto}`,                         // Com + na frente
    `+55${telefoneCompleto.replace(/^55/, '')}`     // Formato internacional padrão
  ];

  try {
    // Registrar o número recebido para depuração
    logger.info(`Mensagem recebida de: ${message.from}, número extraído: ${telefoneCompleto}`);

    // Tentar encontrar o usuário com qualquer um dos formatos possíveis
    let userQuery;
    let userData;
    let userId;

    for (const formato of formatosPossiveis) {
      logger.info(`Tentando buscar usuário com telefone: ${formato}`);

      userQuery = await db.collection('users')
        .where('telefone', '==', formato)
        .limit(1)
        .get();

      if (!userQuery.empty) {
        userData = userQuery.docs[0].data();
        userId = userQuery.docs[0].id;
        logger.info(`Usuário encontrado com telefone ${formato}: ${userId}`);
        break;
      }
    }

    // Se não encontrou o usuário, tentar uma busca mais ampla
    if (!userData) {
      logger.info('Tentando busca alternativa por número parcial');

      // Obter os últimos 8 dígitos do número (parte comum em qualquer formato)
      const ultimosDigitos = telefoneCompleto.slice(-8);

      // Buscar todos os usuários
      const todosUsuarios = await db.collection('users').get();

      // Verificar cada usuário se o telefone termina com os mesmos dígitos
      for (const doc of todosUsuarios.docs) {
        const dadosUsuario = doc.data();
        if (dadosUsuario.telefone && dadosUsuario.telefone.endsWith(ultimosDigitos)) {
          userData = dadosUsuario;
          userId = doc.id;
          logger.info(`Usuário encontrado com correspondência parcial: ${userId}`);
          break;
        }
      }
    }

    // Se ainda não encontrou o usuário
    if (!userData) {
      logger.warn(`Usuário não encontrado para o número: ${telefoneCompleto}`);
      await client.sendText(message.from,
        'Olá! Parece que você ainda não está cadastrado no nosso sistema.\n\n ' +
        'Baixe nosso aplicativo Papa Tango na Play Store ou fale conosco no WhatsApp (85) 99268-4035 para se cadastrar e alugar uma moto!');
      return;
    }

    const mensagem = message.body.toLowerCase();

    // Verificar se é um agradecimento
    const palavrasAgradecimento = ['obrigado', 'obrigada', 'obg', 'obg!', 'valeu', 'grato', 'grata', 'thanks', 'agradeço', 'vlw', 'flw'];
    const ehAgradecimento = palavrasAgradecimento.some(palavra => mensagem.includes(palavra));

    if (ehAgradecimento) {
      await client.sendText(message.from,
        'De nada! Estamos sempre à disposição para ajudar. Se precisar de mais alguma coisa, é só me chamar :)');
      return;
    }

    // Verificar o conteúdo da mensagem e responder adequadamente
    if (mensagem.includes('pagamento') || mensagem.includes('pagar') || mensagem.includes('1') || mensagem.includes('informações sobre o pagamento')) {
      await paymentService.enviarInformacoesPagamento(client, message.from, userId, userData);
    }
    else if (mensagem.includes('boleto') || mensagem.includes('2') || mensagem.includes('pagar com boleto')) {
      await paymentService.enviarBoleto(client, message.from, userId, userData);
    }
    else if (mensagem.includes('pix') || mensagem.includes('3') || mensagem.includes('pagar com pix')) {
      await paymentService.enviarPix(client, message.from, userId, userData);
    }
    else if (mensagem.includes('atraso') || mensagem.includes('atrasado') || mensagem.includes('4') || mensagem.includes('regularizar atraso')) {
      await paymentService.verificarAtraso(client, message.from, userId, userData);
    }
    else if (mensagem.includes('atendimento') || mensagem.includes('atendente') || mensagem.includes('falar com atendente') || mensagem.includes('5')) {
      await client.sendText(message.from, 'Por favor, entre em contato com nossa equipe de atendimento para obter assistência. O número para contato é (85) 99268-4035.\n\nEste contato é *automatizado* e não posso responder a perguntas que *não sejam as mencionadas acima*.');
    }
    else {
      // Mensagem padrão com menu de opções
      await client.sendText(message.from,
        `Olá, *${userData.nome || 'cliente'}!* Como posso ajudar?\n\n` +
        '1️⃣ - Informações sobre pagamento\n' +
        '2️⃣ - Gerar boleto\n' +
        '3️⃣ - Gerar código PIX\n' +
        '4️⃣ - Verificar atraso\n' +
        '5️⃣ - Falar com atendente\n\n' +
        'Responda com o número da opção desejada ou digite sua dúvida.'
      );
    }
  } catch (error) {
    logger.error('Erro ao processar mensagem:', error);
    await client.sendText(message.from,
      'Desculpe, ocorreu um erro ao processar sua solicitação. Por favor, tente novamente mais tarde.');
  }
}

// Função para enviar código de verificação
async function enviarCodigo(numero, codigo) {
  try {
    if (!client) {
      throw new Error('Cliente WhatsApp não inicializado');
    }

    // Formatar número para WhatsApp
    const numeroLimpo = numero.replace(/\D/g, '');
    const numeroWhatsApp = `${numeroLimpo}@c.us`;

    const mensagem = `Seu código de verificação é: ${codigo}`;

    const resultado = await client.sendText(numeroWhatsApp, mensagem);

    logger.info(`Código enviado para ${numeroLimpo}: ${codigo}`);

    return {
      success: true,
      messageId: resultado.id
    };
  } catch (error) {
    logger.error(`Erro ao enviar código para ${numero}:`, error);
    throw error;
  }
}

// Função para obter o QR code atual
function getQrCode() {
  return currentQrCode;
}

// Função para obter o timestamp do último QR code
function getLastQrCodeTimestamp() {
  return lastQrCodeTimestamp;
}

module.exports = {
  initWhatsApp,
  enviarCodigo,
  getClient: () => client,
  getQrCode,
  getLastQrCodeTimestamp
};
