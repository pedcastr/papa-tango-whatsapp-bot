const schedule = require('node-schedule');
const logger = require('../utils/logger');
const paymentService = require('./payment');

// Inicializar agendamentos
function initScheduler() {
  logger.info('Inicializando agendador de tarefas');
  
  // Agendar envio de lembretes de pagamento todos os dias às 10:10
  schedule.scheduleJob('10 10 * * *', async () => {
    logger.info('Executando tarefa agendada: envio de lembretes de pagamento');
    try {
      await paymentService.enviarLembretesPagamento();
    } catch (error) {
      logger.error('Erro ao executar tarefa agendada de lembretes:', error);
    }
  });

  // Agendar envio de lembretes noturnos de PIX todos os dias às 21:00
  schedule.scheduleJob('0 21 * * *', async () => {
    logger.info('Executando tarefa agendada: envio de lembretes noturnos de PIX');
    try {
      await paymentService.enviarLembretesNoturnosPix();
    } catch (error) {
      logger.error('Erro ao executar tarefa agendada de lembretes noturnos:', error);
    }
  });
  
  logger.info('Agendador de tarefas inicializado com sucesso');
}

module.exports = {
  initScheduler
};
