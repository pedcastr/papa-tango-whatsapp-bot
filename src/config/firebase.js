const admin = require('firebase-admin');
const path = require('path');
const logger = require('../utils/logger');

// Inicializar Firebase Admin
try {
  // Verificar se estamos no ambiente Render.com
  if (process.env.RENDER) {
    // Usar variáveis de ambiente para as credenciais
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: process.env.FIREBASE_AUTH_URI,
      token_uri: process.env.FIREBASE_TOKEN_URI,
      auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_CERT_URL,
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    logger.info('Firebase Admin inicializado com variáveis de ambiente');
  } else {
    // Caminho para o arquivo de credenciais local
    const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountPath)
    });
    
    logger.info('Firebase Admin inicializado com arquivo local');
  }
  
  logger.info('Firebase Admin inicializado com sucesso');
} catch (error) {
  logger.error('Erro ao inicializar Firebase Admin:', error);
  process.exit(1);
}

// Exportar instância do Firestore
const db = admin.firestore();

module.exports = {
  admin,
  db
};
