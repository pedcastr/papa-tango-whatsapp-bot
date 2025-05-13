const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Criar pasta de logs se não existir
const logDir = 'logs';
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

// Configurar logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'papa-tango-bot' },
  transports: [
    // Escrever logs de erro em error.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'error.log'), 
      level: 'error' 
    }),
    // Escrever todos os logs em combined.log
    new winston.transports.File({ 
      filename: path.join(logDir, 'combined.log') 
    }),
    // Mostrar logs no console também
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
});

// Capturar erros não tratados
process.on('uncaughtException', (error) => {
  logger.error('Erro não tratado:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promessa rejeitada não tratada:', { reason });
});

module.exports = logger;
