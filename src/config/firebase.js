const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Inicializar Firebase Admin
try {
  // Verificar se o arquivo de credenciais existe
  const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');
  
  if (fs.existsSync(serviceAccountPath)) {
    // Usar o arquivo de credenciais diretamente
    const serviceAccount = require(serviceAccountPath);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    logger.info('Firebase Admin inicializado com arquivo local');
  } else {
    // Fallback para variáveis de ambiente se o arquivo não existir
    logger.info('Arquivo de credenciais não encontrado, usando variáveis de ambiente');
    
    const serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    
    logger.info('Firebase Admin inicializado com variáveis de ambiente');
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
