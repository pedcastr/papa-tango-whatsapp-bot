require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const logger = require('../utils/logger');
const whatsappService = require('./whatsapp');
const scheduler = require('./scheduler');
const paymentService = require('./payment'); 
const { db } = require('../config/firebase');

// Função para evitar que o serviço adormeça no RAILWAY
function setupKeepAlive() {
  const interval = 14 * 60 * 1000; // 14 minutos (menos que o limite de 15 minutos do Render)

  setInterval(() => {
    logger.info('Executando ping para manter o serviço ativo');

    // Fazer uma requisição para o próprio serviço
    const url = process.env.RAILWAY_EXTERNAL_URL || `http://localhost:${PORT}`;

    axios.get(url)
      .then(() => logger.info('Ping realizado com sucesso'))
      .catch(err => logger.error('Erro ao realizar ping:', err.message));
  }, interval);

  logger.info('Sistema de keep-alive configurado');
}

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rota para verificar status do servidor
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Papa Tango WhatsApp Bot está funcionando!'
  });
});

// Rota para enviar código de verificação
app.post('/enviar-codigo', async (req, res) => {
  try {
    const { numero, codigo } = req.body;

    if (!numero || !codigo) {
      return res.status(400).json({
        success: false,
        message: 'Número e código são obrigatórios'
      });
    }

    logger.info(`Solicitação para enviar código ${codigo} para ${numero}`);

    const resultado = await whatsappService.enviarCodigo(numero, codigo);

    return res.json({
      success: true,
      message: 'Código enviado com sucesso',
      data: resultado
    });
  } catch (error) {
    logger.error('Erro ao enviar código:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar código',
      error: error.message
    });
  }
});

// Rota para verificar usuários diretamente no Firebase
app.get('/verificar-usuarios', async (req, res) => {
  try {
    const { telefone } = req.query;

    if (!telefone) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone é obrigatório'
      });
    }

    logger.info(`Verificando usuário com telefone: ${telefone}`);

    // Buscar usuário pelo telefone exato
    const userQuery = await db.collection('users')
      .where('telefone', '==', telefone)
      .limit(1)
      .get();

    if (!userQuery.empty) {
      const userData = userQuery.docs[0].data();
      const userId = userQuery.docs[0].id;

      return res.json({
        success: true,
        message: 'Usuário encontrado',
        data: {
          userId,
          nome: userData.nome || userData.nomeCompleto,
          telefone: userData.telefone
        }
      });
    }

    // Se não encontrou, listar todos os usuários para verificação
    const todosUsuarios = await db.collection('users').get();
    const usuarios = [];

    todosUsuarios.forEach(doc => {
      const data = doc.data();
      if (data.telefone) {
        usuarios.push({
          id: doc.id,
          nome: data.nome || data.nomeCompleto,
          telefone: data.telefone
        });
      }
    });

    return res.json({
      success: false,
      message: 'Usuário não encontrado com o telefone exato',
      usuarios: usuarios
    });
  } catch (error) {
    logger.error('Erro ao verificar usuários:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao verificar usuários',
      error: error.message
    });
  }
});

// Rota para testar a função enviarLembretesPagamento a qualquer hora.
app.post('/teste-lembrete-matinal', async (req, res) => {
  try {
    logger.info('Executando teste de envio de lembretes matinais de pagamento');
    await paymentService.enviarLembretesPagamento();
    return res.json({
      success: true,
      message: 'Teste de lembretes matinais executado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao executar teste de lembretes matinais:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao executar teste de lembretes matinais',
      error: error.message
    });
  }
});

// Rota para testar a função enviarLembretesNoturnosPix a qualquer hora.
app.post('/teste-lembrete-noturno', async (req, res) => {
  try {
    logger.info('Executando teste de envio de lembretes noturnos de pagamento');
    await paymentService.enviarLembretesNoturnosPix();
    return res.json({
      success: true,
      message: 'Teste de lembretes noturnos executado com sucesso'
    });
  } catch (error) {
    logger.error('Erro ao executar teste de lembretes noturnos:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao executar teste de lembretes noturnos',
      error: error.message
    });
  }
});

// Rota para testar o envio de mensagens para um número específico
app.post('/teste-mensagem', async (req, res) => {
  try {
    const { numero, mensagem, tipo } = req.body;

    if (!numero || !tipo) {
      return res.status(400).json({
        success: false,
        message: 'Número e tipo são obrigatórios'
      });
    }

    logger.info(`Executando teste de envio de mensagem tipo ${tipo} para ${numero}`);

    // Formatar número para WhatsApp
    const numeroWhatsApp = `${numero.replace(/\D/g, '')}@c.us`;

    // Obter cliente WhatsApp
    const client = whatsappService.getClient();
    if (!client) {
      throw new Error('Cliente WhatsApp não inicializado');
    }

    // Buscar usuário pelo telefone
    const userQuery = await db.collection('users')
      .where('telefone', '==', numero)
      .limit(1)
      .get();

    if (userQuery.empty) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado com este número'
      });
    }

    const userData = userQuery.docs[0].data();
    const userId = userQuery.docs[0].id;

    // Executar a função correspondente ao tipo
    switch (tipo) {
      case 'info':
        await paymentService.enviarInformacoesPagamento(client, numeroWhatsApp, userId, userData);
        break;
      case 'boleto':
        await paymentService.enviarBoleto(client, numeroWhatsApp, userId, userData);
        break;
      case 'pix':
        await paymentService.enviarPix(client, numeroWhatsApp, userId, userData);
        break;
      case 'atraso':
        await paymentService.verificarAtraso(client, numeroWhatsApp, userId, userData);
        break;
      case 'texto':
        if (!mensagem) {
          return res.status(400).json({
            success: false,
            message: 'Mensagem é obrigatória para o tipo texto'
          });
        }
        await client.sendText(numeroWhatsApp, mensagem);
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Tipo inválido. Use: info, boleto, pix, atraso ou texto'
        });
    }

    return res.json({
      success: true,
      message: `Mensagem de tipo ${tipo} enviada com sucesso para ${numero}`
    });
  } catch (error) {
    logger.error('Erro ao enviar mensagem de teste:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar mensagem de teste',
      error: error.message
    });
  }
});

// Rota para testar o envio de email
app.get('/teste-email', async (req, res) => {
  try {
    const emailSender = require('../utils/emailSender');
    const success = await emailSender.sendQrCodeNotification(
      process.env.ADMIN_EMAIL,
      `${req.protocol}://${req.get('host')}/qrcode`
    );
    
    if (success) {
      return res.json({
        success: true,
        message: 'Email enviado com sucesso'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Falha ao enviar email'
      });
    }
  } catch (error) {
    console.error('Erro ao enviar email de teste:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro ao enviar email',
      error: error.message
    });
  }
});

// Rota para exibir o QR code
app.get('/qrcode', (req, res) => {
  const qrCode = whatsappService.getQrCode();
  if (!qrCode) {
    return res.status(404).json({
      success: false,
      message: 'QR Code não disponível no momento. O bot pode já estar conectado ou ainda não gerou o QR code.'
    });
  }

  // Enviar como página HTML com a imagem
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Papa Tango - WhatsApp QR Code</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 500px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        img { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 5px; }
        h1 { color: #4a4a4a; }
        .refresh-text { color: #666; font-size: 14px; margin-top: 20px; }
        .status { margin-top: 15px; padding: 10px; background-color: #e8f5e9; border-radius: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>WhatsApp QR Code</h1>
        <p>Escaneie este QR code com seu WhatsApp para autenticar o bot</p>
        <img src="${qrCode}" alt="WhatsApp QR Code">
        <p class="status">Status: Aguardando escaneamento</p>
        <p class="refresh-text">Esta página será atualizada automaticamente a cada 10 segundos</p>
      </div>
      <script>
        setTimeout(function() {
          window.location.reload();
        }, 10000);
      </script>
    </body>
    </html>
  `);
});

// Rota para verificar o status do QR code
app.get('/qrcode-status', (req, res) => {
  const qrCode = whatsappService.getQrCode();
  const lastQrCodeTimestamp = whatsappService.getLastQrCodeTimestamp();
  const client = whatsappService.getClient();
  
  res.json({
    hasQrCode: qrCode ? true : false,
    clientConnected: client ? true : false,
    lastQrCodeGenerated: lastQrCodeTimestamp,
    serverTime: new Date().toISOString()
  });
});

// Iniciar servidor
app.listen(PORT, async () => {
  logger.info(`Servidor iniciado na porta ${PORT}`);

  try {
    // Inicializar cliente WhatsApp
    await whatsappService.initWhatsApp();

    // Inicializar agendador de tarefas
    scheduler.initScheduler();

    // Configurar sistema para evitar adormecimento no Render.com
    if (process.env.RAILWAY) {
      setupKeepAlive();
    }

    logger.info('Inicialização completa!');
  } catch (error) {
    logger.error('Erro na inicialização:', error);
  }
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promessa rejeitada não tratada:', { reason });
});
