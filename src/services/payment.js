const axios = require('axios');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');
const { db, admin } = require('../config/firebase');

// Pasta para arquivos temporários
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

// Função para enviar informações de pagamento
async function enviarInformacoesPagamento(client, whatsappNumber, userId, userData) {
  try {
    // Buscar contratos ativos do usuário
    const contratosQuery = await db.collection('contratos')
      .where('cliente', '==', userId)
      .where('statusContrato', '==', true)
      .get();

    if (contratosQuery.empty) {
      await client.sendText(whatsappNumber,
        'Você *não possui contratos ativos* no momento. Para mais informações, acesse o *aplicativo Papa Tango* ou fale com suporte através do número (85) 99268-4035.');
      return;
    }

    // Buscar último pagamento aprovado
    const paymentsQuery = await db.collection('payments')
      .where('userEmail', '==', userId)
      .where('status', '==', 'approved')
      .orderBy('dateCreated', 'desc')
      .limit(1)
      .get();

    let dataBase;
    let proximaData;
    let valor;

    if (!paymentsQuery.empty) {
      const ultimoPagamento = paymentsQuery.docs[0].data();
      dataBase = ultimoPagamento.dateCreated.toDate();
    } else {
      // Se não houver pagamento, usar data de início do contrato
      dataBase = contratosQuery.docs[0].data().dataInicio.toDate();
    }

    // Obter dados do aluguel
    const contrato = contratosQuery.docs[0].data();
    const tipoRecorrencia = contrato.tipoRecorrenciaPagamento || 'mensal';

    let aluguel;
    if (contrato.aluguelId) {
      const aluguelDoc = await db.collection('alugueis').doc(contrato.aluguelId).get();
      if (aluguelDoc.exists) {
        aluguel = aluguelDoc.data();
      }
    } else if (contrato.motoId) {
      const alugueisQuery = await db.collection('alugueis')
        .where('motoId', '==', contrato.motoId)
        .where('ativo', '==', true)
        .limit(1)
        .get();

      if (!alugueisQuery.empty) {
        aluguel = alugueisQuery.docs[0].data();
      }
    }

    if (!aluguel) {
      await client.sendText(whatsappNumber,
        'Não foi possível encontrar *informações do seu aluguel*. Por favor, entre em contato com nosso suporte (85) 99268-4035.');
      return;
    }

    // Calcular valor e próxima data de pagamento
    valor = tipoRecorrencia === 'semanal' ?
      (aluguel.valorSemanal || 70) :
      (aluguel.valorMensal || 250);

    proximaData = new Date(dataBase);
    if (tipoRecorrencia === 'semanal') {
      proximaData.setDate(proximaData.getDate() + 7);
      while (proximaData <= dataBase) {
        proximaData.setDate(proximaData.getDate() + 7);
      }
    } else {
      proximaData.setMonth(proximaData.getMonth() + 1);
      while (proximaData <= dataBase) {
        proximaData.setMonth(proximaData.getMonth() + 1);
      }
    }

    // Calcular dias restantes
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diasRestantes = Math.floor((proximaData - hoje) / (1000 * 60 * 60 * 24));

    // Formatar data para exibição
    const dataFormatada = proximaData.toLocaleDateString('pt-BR');

    // Enviar mensagem com informações de pagamento
    let mensagem = `*Informações de Pagamento*\n\n`;
    mensagem += `Cliente: *${userData.nome || userData.nomeCompleto || userId}*\n`;
    mensagem += `Valor: *R$ ${valor.toFixed(2)}*\n`;
    mensagem += `Próximo pagamento: *${dataFormatada}*\n\n`;

    if (diasRestantes < 0) {
      const diasAtraso = Math.abs(diasRestantes);
      mensagem += `*⚠️ PAGAMENTO EM ATRASO ⚠️*\n`;
      mensagem += `Dias em atraso: *${diasAtraso}*\n\n`;
      mensagem += `Por favor, regularize sua situação o mais rápido possível para evitar a suspensão do serviço.\n\n`;
      mensagem += `Para pagar agora, responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada.`;
    } else if (diasRestantes === 0) {
      mensagem += `*⚠️ PAGAMENTO VENCE HOJE ⚠️*\n\n`;
      mensagem += `Para pagar agora, responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada.`;
    } else {
      mensagem += `Dias até o vencimento: *${diasRestantes}*\n\n`;
      mensagem += `Para pagar antecipadamente, responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada.`;
    }

    await client.sendText(whatsappNumber, mensagem);
  } catch (error) {
    logger.error('Erro ao enviar informações de pagamento:', error);
    await client.sendText(whatsappNumber,
      'Desculpe, ocorreu um erro ao buscar suas informações de pagamento. Por favor, tente novamente mais tarde.');
  }
}

// Função para gerar e enviar boleto
async function enviarBoleto(client, whatsappNumber, userId, userData) {
  try {
    // Buscar contratos ativos do usuário
    const contratosQuery = await db.collection('contratos')
      .where('cliente', '==', userId)
      .where('statusContrato', '==', true)
      .get();
    if (contratosQuery.empty) {
      await client.sendText(whatsappNumber,
        'Você *não possui contratos ativos* no momento. Para mais informações, acesse o *aplicativo Papa Tango* ou fale com suporte através do número (85) 99268-4035.');
      return;
    }

    // Obter dados do aluguel e valor
    const contrato = contratosQuery.docs[0].data();
    const tipoRecorrencia = contrato.tipoRecorrenciaPagamento || 'mensal';
    let aluguel;
    if (contrato.aluguelId) {
      const aluguelDoc = await db.collection('alugueis').doc(contrato.aluguelId).get();
      if (aluguelDoc.exists) {
        aluguel = aluguelDoc.data();
      }
    } else if (contrato.motoId) {
      const alugueisQuery = await db.collection('alugueis')
        .where('motoId', '==', contrato.motoId)
        .where('ativo', '==', true)
        .limit(1)
        .get();
      if (!alugueisQuery.empty) {
        aluguel = alugueisQuery.docs[0].data();
      }
    }
    if (!aluguel) {
      await client.sendText(whatsappNumber,
        'Não foi possível encontrar informações do seu aluguel. Por favor, entre em contato com nosso suporte através do WhatsApp (85) 99268-4035.');
      return;
    }

    // Calcular valor base
    const valorBase = tipoRecorrencia === 'semanal' ?
      (aluguel.valorSemanal || 70) :
      (aluguel.valorMensal || 250);

    // Verificar se o pagamento está em atraso
    // Calcular próximo pagamento e verificar atraso
    let valorFinal = valorBase;
    let diasAtraso = 0;
    let estaEmAtraso = false;
    let proximaData = null;
    try {
      // Buscar pagamentos do usuário
      const paymentsQuery = await db.collection('payments')
        .where('userEmail', '==', userId)
        .where('status', '==', 'approved')
        .orderBy('dateCreated', 'desc')
        .limit(1)
        .get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Normalizar para início do dia
      let dataBase;
      // Se tiver pagamento aprovado, calcular a partir dele
      if (!paymentsQuery.empty) {
        const ultimoPagamento = paymentsQuery.docs[0].data();
        const ultimoPagamentoData = ultimoPagamento.dateCreated?.toDate();
        if (ultimoPagamentoData) {
          dataBase = new Date(ultimoPagamentoData);
          dataBase.setHours(0, 0, 0, 0); // Normalizar para início do dia
        } else {
          dataBase = new Date(contrato.dataInicio.toDate());
          dataBase.setHours(0, 0, 0, 0);
        }
      } else {
        // Se não tiver pagamento aprovado, usar a data de início do contrato
        dataBase = new Date(contrato.dataInicio.toDate());
        dataBase.setHours(0, 0, 0, 0);
      }

      // Calcular a próxima data de pagamento com base no tipo de recorrência
      proximaData = new Date(dataBase);
      if (tipoRecorrencia === 'semanal') {
        // Para pagamento semanal
        proximaData.setDate(proximaData.getDate() + 7);
        // Ajustar para encontrar a data de pagamento correta
        if (paymentsQuery.empty) {
          proximaData = new Date(dataBase);
          // Avançar de 7 em 7 dias até encontrar a primeira data após a data base
          while (proximaData <= dataBase) {
            proximaData.setDate(proximaData.getDate() + 7);
          }
        }
      } else {
        // Para pagamento mensal
        proximaData.setMonth(proximaData.getMonth() + 1);
        // Ajustar para encontrar a data de pagamento correta
        if (paymentsQuery.empty) {
          proximaData = new Date(dataBase);
          // Avançar de mês em mês até encontrar a primeira data após a data base
          while (proximaData <= dataBase) {
            proximaData.setMonth(proximaData.getMonth() + 1);
          }
        }
      }

      // Calcular dias de atraso (se estiver atrasado)
      if (proximaData < hoje) {
        diasAtraso = Math.floor((hoje - proximaData) / (1000 * 60 * 60 * 24));
        estaEmAtraso = true;
        // Calcular valor com multa (2% + R$10 por dia)
        const multaFixa = valorBase * 0.02; // 2% de multa fixa
        const multaDiaria = 10 * diasAtraso; // R$ 10 por dia de atraso
        valorFinal = valorBase + multaFixa + multaDiaria;
        logger.info(`Pagamento em atraso para ${userId}. Dias de atraso: ${diasAtraso}. Valor original: ${valorBase}. Valor com multa: ${valorFinal}`);
      }
    } catch (err) {
      logger.error(`Erro ao calcular atraso para ${userId}:`, err);
      // Em caso de erro, usar o valor base
      valorFinal = valorBase;
    }

    // Verificar valor mínimo para boleto
    if (valorFinal < 3) {
      await client.sendText(whatsappNumber,
        'O valor mínimo para gerar um boleto é R$ 3,00. Por favor, escolha outra forma de pagamento.');
      return;
    }

    // Enviar mensagem de processamento
    await client.sendText(whatsappNumber, 'Gerando seu boleto, aguarde um momento...');

    // Buscar dados de endereço diretamente do Firestore para garantir dados corretos
    let endereco = {};
    try {
      // Tentar obter o endereço diretamente da coleção de usuários
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        // Verificar se o endereço está no documento principal
        if (userData.endereco) {
          endereco = userData.endereco;
        }
      }
    } catch (err) {
      logger.error(`Erro ao buscar endereço do usuário ${userId}:`, err);
    }

    // Valores padrão caso não encontre dados
    const cepFormatado = (endereco.cep || '60000000').replace(/\D/g, '');
    const logradouro = endereco.logradouro || 'Rua não informada';
    const numero = endereco.numero || '0';
    const bairro = endereco.bairro || 'Bairro não informado';
    const cidade = endereco.cidade || 'Fortaleza';
    const estado = endereco.estado || 'CE';

    logger.info(`Gerando novo boleto para ${userId}`);

    // Verificar se já existe um pagamento pendente de boleto
    const pendingPaymentsQuery = await db.collection('payments')
      .where('userEmail', '==', userId)
      .where('status', '==', 'pending')
      .where('paymentMethod', '==', 'boleto')
      .limit(1)
      .get();

    // Verificar se o pagamento pendente tem o valor correto e/ou está dentro do vencimento
    if (!pendingPaymentsQuery.empty) {
      const pendingPayment = pendingPaymentsQuery.docs[0].data();
      const valorPendente = pendingPayment.amount;

      // Verificar se o boleto ainda está dentro da data de vencimento
      let boletoDentroDoVencimento = false;
      let dataVencimento = null;

      // Verificar diferentes caminhos possíveis para a data de vencimento
      if (pendingPayment.paymentDetails?.date_of_expiration) {
        dataVencimento = new Date(pendingPayment.paymentDetails.date_of_expiration);
      } else if (pendingPayment.date_of_expiration) {
        dataVencimento = new Date(pendingPayment.date_of_expiration);
      } else if (pendingPayment.paymentDetails?.transaction_details?.date_of_expiration) {
        dataVencimento = new Date(pendingPayment.paymentDetails.transaction_details.date_of_expiration);
      }

      if (dataVencimento) {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0); // Normalizar para início do dia

        // Boleto está dentro do vencimento se a data de vencimento for hoje ou no futuro
        boletoDentroDoVencimento = dataVencimento >= hoje;

        logger.info(`Boleto para ${userId}: Data vencimento: ${dataVencimento.toISOString()}, Hoje: ${hoje.toISOString()}, Dentro do vencimento: ${boletoDentroDoVencimento}`);
      }

      // Se o pagamento pendente tem o valor correto (com margem de 1 centavo para arredondamentos)
      // OU se o boleto ainda está dentro do vencimento (mesmo com valor diferente)
      if (Math.abs(valorPendente - valorFinal) < 0.01 || boletoDentroDoVencimento) {
        // Enviar mensagem com link do boleto existente
        let mensagem = `*Você já possui um boleto pendente!*\n\n`;
        mensagem += `Valor: *R$ ${pendingPayment.amount.toFixed(2)}*\n`;
        mensagem += `ID do pagamento: *${pendingPayment.paymentId}*\n\n`;

        if (boletoDentroDoVencimento && Math.abs(valorPendente - valorFinal) >= 0.01) {
          mensagem += `⚠️ *ATENÇÃO: O valor deste boleto (R$ ${valorPendente.toFixed(2)}) é diferente do valor atual (R$ ${valorFinal.toFixed(2)}).*\n`;
          mensagem += `Isso pode ocorrer devido a atrasos acumulados. Você pode pagar este boleto ou cancelá-lo e gerar um novo.\n\n`;
        } else if (estaEmAtraso) {
          mensagem += `⚠️ *ATENÇÃO: Seu pagamento está atrasado em ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}*\n`;
          mensagem += `O valor inclui multa de 2% + R$10 ao dia de atraso.\n\n`;
        }

        // Obter URL do boleto
        const boletoUrl = pendingPayment.boletoUrl ||
          pendingPayment.paymentDetails?.transaction_details?.external_resource_url ||
          pendingPayment.transaction_details?.external_resource_url;

        if (boletoUrl) {
          mensagem += `Acesse o link abaixo para visualizar e imprimir seu boleto:\n\n`;
          mensagem += `${boletoUrl}\n\n`;
        } else {
          mensagem += `⚠️ *Link do boleto não disponível. Por favor, acesse o aplicativo Papa Tango para visualizar seu boleto.*\n\n`;
        }

        mensagem += `⚠️ O boleto pode levar até 3 dias úteis para ser compensado após o pagamento.\n\n`;
        mensagem += `*Obrigado por escolher a Papa Tango!*\n\n\n`;
        mensagem += `Código de barras 👇`;
        await client.sendText(whatsappNumber, mensagem);

        let mensagemCodigoBarras = '';
        // Tentar diferentes caminhos para o código de barras
        if (pendingPayment.paymentDetails?.transaction_details?.digitable_line) {
          mensagemCodigoBarras += `${pendingPayment.paymentDetails.transaction_details.digitable_line}`;
        } else if (pendingPayment.transaction_details?.digitable_line) {
          mensagemCodigoBarras += `${pendingPayment.transaction_details.digitable_line}`;
        } else if (pendingPayment.barcode) {
          mensagemCodigoBarras += `${pendingPayment.barcode}`;
        } else {
          mensagemCodigoBarras += `Código de barras não disponível. Por favor, use o link do boleto acima.`;
        }

        await client.sendText(whatsappNumber, mensagemCodigoBarras);
        return;
      } else {
        // Se o valor está desatualizado E o boleto está vencido, cancelar o boleto antigo
        logger.info(`Cancelando boleto desatualizado para ${userId}. Valor antigo: ${valorPendente}, Novo valor: ${valorFinal}, Dentro do vencimento: ${boletoDentroDoVencimento}`);

        // Atualizar o status para 'cancelled' no Firestore
        await db.collection('payments').doc(pendingPayment.paymentId.toString()).update({
          status: 'cancelled',
          observacao: 'Cancelado automaticamente devido a atraso no pagamento e boleto vencido',
          dateCancelled: admin.firestore.FieldValue.serverTimestamp()
        });

        await client.sendText(whatsappNumber,
          'Seu boleto anterior foi cancelado pois o valor está desatualizado e o prazo de pagamento já venceu. Gerando um novo boleto com o valor atualizado...');
      }
    }

    // Preparar dados para a API do Mercado Pago
    const paymentData = {
      paymentType: 'boleto',
      transactionAmount: valorFinal,
      description: `Pagamento ${tipoRecorrencia === 'semanal' ? 'Semanal' : 'Mensal'}`,
      payer: {
        email: userId,
        first_name: userData.nome || userData.nomeCompleto?.split(' ')[0] || 'Cliente',
        last_name: userData.nomeCompleto?.split(' ').slice(1).join(' ') || 'Papa Tango',
        identification: {
          type: 'CPF',
          number: userData.cpf?.replace(/\D/g, '') || '00000000000'
        },
        address: {
          zip_code: cepFormatado,
          street_name: logradouro,
          street_number: numero,
          neighborhood: bairro,
          city: cidade,
          federal_unit: estado
        }
      },
      externalReference: `user_${userId}`
    };

    // Log para depuração
    logger.info(`Dados do pagamento: ${JSON.stringify(paymentData)}`);

    // Chamar a API para gerar o boleto
    const response = await axios.post(
      'https://us-central1-papamotos-2988e.cloudfunctions.net/processPayment',
      paymentData
    );

    if (response.data && response.data.transaction_details && response.data.transaction_details.external_resource_url) {
      // Salvar o pagamento no Firestore
      await db.collection('payments').doc(response.data.id.toString()).set({
        paymentId: response.data.id,
        userId: userId,
        userEmail: userId,
        userName: userData.nome || userData.nomeCompleto || 'Cliente',
        status: response.data.status,
        amount: valorFinal,
        paymentMethod: 'boleto',
        dateCreated: admin.firestore.FieldValue.serverTimestamp(),
        description: paymentData.description,
        externalReference: paymentData.externalReference,
        boletoUrl: response.data.transaction_details.external_resource_url,
        barcode: response.data.transaction_details.barcode?.content || null,
        // Adicionar informações sobre atraso
        emAtraso: estaEmAtraso,
        diasAtraso: diasAtraso,
        valorOriginal: valorBase,
        proximaDataPagamento: proximaData ? admin.firestore.Timestamp.fromDate(proximaData) : null,
        // Salvar a data de vencimento do boleto
        date_of_expiration: response.data.date_of_expiration,
        // Salvar os detalhes completos da resposta
        paymentDetails: response.data,
        // Adicionar timestamp de atualização
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Enviar mensagem com link do boleto
      let mensagem = `*Boleto gerado com sucesso!*\n\n`;
      mensagem += `Valor: *R$ ${valorFinal.toFixed(2)}*\n`;
      mensagem += `ID do pagamento: *${response.data.id}*\n\n`;
      if (estaEmAtraso) {
        mensagem += `⚠️ *ATENÇÃO: Seu pagamento está atrasado em ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}*\n`;
        mensagem += `O valor inclui multa de 2% + R$10 ao dia de atraso.\n\n`;
      }
      mensagem += `Acesse o link abaixo para visualizar e imprimir seu boleto 👇\n\n`;
      mensagem += `${response.data.transaction_details.external_resource_url}\n\n`;
      mensagem += `⚠️ *O boleto pode levar até 3 dias úteis para ser compensado após o pagamento* ⚠️\n\n`;
      mensagem += `*Obrigado por escolher a Papa Tango!*\n\n\n`;
      mensagem += `Código de barras 👇`;
      await client.sendText(whatsappNumber, mensagem);

      let mensagemCodigoBarras = '';
      if (response.data?.paymentDetails?.transaction_details?.digitable_line) {
        mensagemCodigoBarras += `${response.data.paymentDetails.transaction_details.digitable_line}`;
      } else if (response.data?.transaction_details?.barcode?.content) {
        mensagemCodigoBarras += `${response.data.transaction_details.barcode.content}`;
      } else if (response.data?.transaction_details?.digitable_line) {
        mensagemCodigoBarras += `${response.data.transaction_details.digitable_line}`;
      }
      await client.sendText(whatsappNumber, mensagemCodigoBarras);
    } else {
      throw new Error('Falha ao gerar boleto');
    }
  } catch (error) {
    logger.error('Erro ao gerar boleto:', error);
    // Log detalhado para depuração
    if (error.response) {
      logger.error('Detalhes do erro:', {
        status: error.response.status,
        data: error.response.data
      });
    }
    await client.sendText(whatsappNumber,
      'Desculpe, *ocorreu um erro ao gerar seu boleto*. Por favor, tente novamente mais tarde, use o aplicativo Papa Tango ou entre em contato com o suporte através do WhatsApp (85) 99268-4035.');
  }
}

// Função para gerar e enviar código PIX
async function enviarPix(client, whatsappNumber, userId, userData) {
  try {
    // Buscar contratos ativos do usuário
    const contratosQuery = await db.collection('contratos')
      .where('cliente', '==', userId)
      .where('statusContrato', '==', true)
      .get();
    if (contratosQuery.empty) {
      await client.sendText(whatsappNumber,
        'Você *não possui contratos ativos* no momento. Para mais informações, acesse o *aplicativo Papa Tango* ou fale com suporte através do número (85) 99268-4035.');
      return;
    }

    // Obter dados do aluguel e valor
    const contrato = contratosQuery.docs[0].data();
    const tipoRecorrencia = contrato.tipoRecorrenciaPagamento || 'mensal';
    let aluguel;
    if (contrato.aluguelId) {
      const aluguelDoc = await db.collection('alugueis').doc(contrato.aluguelId).get();
      if (aluguelDoc.exists) {
        aluguel = aluguelDoc.data();
      }
    } else if (contrato.motoId) {
      const alugueisQuery = await db.collection('alugueis')
        .where('motoId', '==', contrato.motoId)
        .where('ativo', '==', true)
        .limit(1)
        .get();
      if (!alugueisQuery.empty) {
        aluguel = alugueisQuery.docs[0].data();
      }
    }
    if (!aluguel) {
      await client.sendText(whatsappNumber,
        'Não foi possível *encontrar informações do seu aluguel*. Por favor, entre em contato com nosso suporte no WhatsApp (85) 99268-4035.');
      return;
    }

    // Calcular valor base
    const valorBase = tipoRecorrencia === 'semanal' ?
      (aluguel.valorSemanal || 70) :
      (aluguel.valorMensal || 250);

    // Verificar se o pagamento está em atraso
    // Calcular próximo pagamento e verificar atraso
    let valorFinal = valorBase;
    let diasAtraso = 0;
    let estaEmAtraso = false;
    let proximaData = null;
    try {
      // Buscar pagamentos do usuário
      const paymentsQuery = await db.collection('payments')
        .where('userEmail', '==', userId)
        .where('status', '==', 'approved')
        .orderBy('dateCreated', 'desc')
        .limit(1)
        .get();
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0); // Normalizar para início do dia
      let dataBase;
      // Se tiver pagamento aprovado, calcular a partir dele
      if (!paymentsQuery.empty) {
        const ultimoPagamento = paymentsQuery.docs[0].data();
        const ultimoPagamentoData = ultimoPagamento.dateCreated?.toDate();
        if (ultimoPagamentoData) {
          dataBase = new Date(ultimoPagamentoData);
          dataBase.setHours(0, 0, 0, 0); // Normalizar para início do dia
        } else {
          dataBase = new Date(contrato.dataInicio.toDate());
          dataBase.setHours(0, 0, 0, 0);
        }
      } else {
        // Se não tiver pagamento aprovado, usar a data de início do contrato
        dataBase = new Date(contrato.dataInicio.toDate());
        dataBase.setHours(0, 0, 0, 0);
      }
      // Calcular a próxima data de pagamento com base no tipo de recorrência
      proximaData = new Date(dataBase);
      if (tipoRecorrencia === 'semanal') {
        // Para pagamento semanal
        proximaData.setDate(proximaData.getDate() + 7);
        // Ajustar para encontrar a data de pagamento correta
        if (paymentsQuery.empty) {
          proximaData = new Date(dataBase);
          // Avançar de 7 em 7 dias até encontrar a primeira data após a data base
          while (proximaData <= dataBase) {
            proximaData.setDate(proximaData.getDate() + 7);
          }
        }
      } else {
        // Para pagamento mensal
        proximaData.setMonth(proximaData.getMonth() + 1);
        // Ajustar para encontrar a data de pagamento correta
        if (paymentsQuery.empty) {
          proximaData = new Date(dataBase);
          // Avançar de mês em mês até encontrar a primeira data após a data base
          while (proximaData <= dataBase) {
            proximaData.setMonth(proximaData.getMonth() + 1);
          }
        }
      }
      // Calcular dias de atraso (se estiver atrasado)
      if (proximaData < hoje) {
        diasAtraso = Math.floor((hoje - proximaData) / (1000 * 60 * 60 * 24));
        estaEmAtraso = true;
        // Calcular valor com multa (2% + 10 por dia)
        const multaFixa = valorBase * 0.02; // 2% de multa fixa
        const multaDiaria = 10 * diasAtraso; // R$ 10 por dia de atraso
        valorFinal = valorBase + multaFixa + multaDiaria;
        logger.info(`Pagamento em atraso para ${userId}. Dias de atraso: ${diasAtraso}. Valor original: ${valorBase}. Valor com multa: ${valorFinal}`);
      }
    } catch (err) {
      logger.error(`Erro ao calcular atraso para ${userId}:`, err);
      // Em caso de erro, usar o valor base
      valorFinal = valorBase;
    }

    // Enviar mensagem de processamento
    await client.sendText(whatsappNumber, 'Verificando pagamentos pendentes e gerando seu código PIX, aguarde um momento...');

    // Verificar se já existe um pagamento PIX pendente
    const pendingPixQuery = await db.collection('payments')
      .where('userEmail', '==', userId)
      .where('status', '==', 'pending')
      .where('paymentMethod', '==', 'pix')
      .orderBy('dateCreated', 'desc')
      .limit(1)
      .get();
    let pixData;
    let paymentId;
    let responseData = null; // Variável para armazenar a resposta da API

    if (!pendingPixQuery.empty) {
      // Já existe um pagamento PIX pendente
      const pixDoc = pendingPixQuery.docs[0];
      const pixPayment = pixDoc.data();
      const valorPendente = pixPayment.amount;
      // Verificar se o valor do pagamento pendente está correto (considerando atraso)
      if (Math.abs(valorPendente - valorFinal) < 0.01) {
        // O valor está correto, usar o pagamento existente
        logger.info(`Encontrado pagamento PIX pendente com valor correto para ${userId}`);
        paymentId = pixPayment.paymentId;
        // Extrair QR code e código PIX
        if (pixPayment.pixQrCode) {
          pixData = {
            qr_code: pixPayment.pixQrCode,
            qr_code_base64: pixPayment.pixCopyPaste
          };
        } else if (pixPayment.paymentDetails &&
          pixPayment.paymentDetails.point_of_interaction &&
          pixPayment.paymentDetails.point_of_interaction.transaction_data) {
          pixData = pixPayment.paymentDetails.point_of_interaction.transaction_data;
        }
        await client.sendText(whatsappNumber, 'Encontramos um pagamento PIX pendente para você. Enviando os dados...');
      } else {
        // O valor está desatualizado, cancelar o pagamento antigo
        logger.info(`Cancelando PIX desatualizado para ${userId}. Valor antigo: ${valorPendente}, Novo valor: ${valorFinal}`);
        // Atualizar o status para 'cancelled' no Firestore
        await db.collection('payments').doc(pixPayment.paymentId.toString()).update({
          status: 'cancelled',
          observacao: 'Cancelado automaticamente devido a atraso no pagamento'
        });
        await client.sendText(whatsappNumber,
          'Seu PIX anterior foi cancelado pois o valor está desatualizado devido ao atraso. Gerando um novo PIX com o valor atualizado...');
        // Continuar para gerar um novo pagamento
        pixData = null;
      }
    }

    // Se não temos dados de PIX válidos, gerar um novo pagamento
    if (!pixData) {
      // Não existe pagamento PIX pendente válido, vamos criar um novo
      logger.info(`Gerando novo pagamento PIX para ${userId} com valor ${valorFinal}`);

      // Garantir que o valor seja um número válido e arredondado corretamente
      const valorNumerico = parseFloat(valorBase); // Usar valorBase (sem multa)
      if (isNaN(valorNumerico) || valorNumerico <= 0) {
        logger.error(`Valor base inválido para pagamento: ${valorBase}`);
        throw new Error('Valor de pagamento inválido');
      }

      // Arredondar para 2 casas decimais para evitar problemas de precisão
      const valorArredondado = Math.round(valorNumerico * 100) / 100;

      // Preparar dados para a API do Mercado Pago
      const paymentData = {
        paymentType: 'pix',
        transactionAmount: valorArredondado, // Usar o valor base arredondado
        description: `Pagamento ${tipoRecorrencia === 'semanal' ? 'Semanal' : 'Mensal'}`,
        payer: {
          email: userId,
          first_name: userData.nome || userData.nomeCompleto?.split(' ')[0] || 'Cliente',
          last_name: userData.nomeCompleto?.split(' ').slice(1).join(' ') || 'Papa Tango',
          identification: {
            type: 'CPF',
            number: userData.cpf ? userData.cpf.replace(/\D/g, '') : '00000000000'
          }
        },
        // Adicionar informações de dias de atraso para cálculo correto da multa
        diasAtraso: diasAtraso,
        // Adicionar referência externa única
        externalReference: `user_${userId}_${Date.now()}`,
        // Adicionar statement descriptor
        statementDescriptor: 'PAPA TANGO MOTOS'
      };

      // Log detalhado dos dados que serão enviados
      logger.info(`Dados do pagamento a serem enviados: ${JSON.stringify(paymentData)}`);

      // Chamar a API para gerar o PIX - usando diretamente a URL do Cloud Run
      const response = await axios.post(
        'https://processpayment-q3zrn7ctxq-uc.a.run.app',
        paymentData,
        {
          timeout: 15000, // Timeout de 15 segundos
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      responseData = response.data; // Salvar a resposta para uso posterior

      if (responseData && responseData.point_of_interaction && responseData.point_of_interaction.transaction_data) {
        pixData = responseData.point_of_interaction.transaction_data;
        paymentId = responseData.id;

        // Atualizar valorFinal com o valor retornado pela API (que inclui a multa)
        if (responseData.transaction_amount) {
          valorFinal = responseData.transaction_amount;
        }

        // Salvar o pagamento no Firestore
        await db.collection('payments').doc(responseData.id.toString()).set({
          paymentId: responseData.id,
          userId: userId,
          userEmail: userId,
          userName: userData.nome || userData.nomeCompleto || 'Cliente',
          status: responseData.status,
          amount: responseData.transaction_amount || valorFinal, // Usar o valor retornado pela API
          paymentMethod: 'pix',
          dateCreated: admin.firestore.FieldValue.serverTimestamp(),
          description: paymentData.description,
          externalReference: paymentData.externalReference,
          pixQrCode: pixData.qr_code,
          pixCopyPaste: pixData.qr_code_base64,
          // Adicionar informações sobre atraso
          emAtraso: estaEmAtraso,
          diasAtraso: diasAtraso,
          valorOriginal: valorBase,
          proximaDataPagamento: proximaData ? admin.firestore.Timestamp.fromDate(proximaData) : null,
          // Adicionar detalhes completos da resposta
          paymentDetails: responseData
        });
      } else {
        throw new Error('Falha ao gerar código PIX');
      }
    }

    if (!pixData || !pixData.qr_code) {
      throw new Error('Dados do PIX não encontrados');
    }

    // Gerar imagem do QR Code
    const qrCodePath = path.join(tempDir, `pix_${paymentId || Date.now()}.png`);
    await qrcode.toFile(qrCodePath, pixData.qr_code, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });

    // Enviar mensagem com código PIX
    let mensagem = `*Código PIX gerado com sucesso!*\n\n`;
    mensagem += `Valor: *R$ ${valorFinal.toFixed(2)}*\n`;
    mensagem += `ID do pagamento: *${paymentId}*\n\n`;

    if (estaEmAtraso) {
      mensagem += `⚠️ *ATENÇÃO: Seu pagamento está atrasado em ${diasAtraso} ${diasAtraso === 1 ? 'dia' : 'dias'}*\n`;
      mensagem += `O valor inclui multa de 2% + R$10 ao dia de atraso.\n\n`;
    }

    mensagem += `⚠️ O pagamento via PIX é processado em poucos minutos após a confirmação.\n\n`;
    mensagem += `*Obrigado por escolher a Papa Tango!*\n\n`;
    mensagem += `Escaneie o QR Code abaixo ou use o código PIX copia e cola 👇`;

    let mensagemQR = `${pixData.qr_code}`;

    // Enviar mensagem com texto
    await client.sendText(whatsappNumber, mensagem);

    // Enviar mensagem com o código PIX copia e cola
    await client.sendText(whatsappNumber, mensagemQR);

    // Enviar QR Code como imagem
    await client.sendImage(
      whatsappNumber,
      qrCodePath,
      'QR_Code_PIX.png ☝️',
      'QR Code para pagamento PIX ☝️'
    );

    // Limpar arquivo temporário após envio
    setTimeout(() => {
      fs.unlink(qrCodePath, (err) => {
        if (err) logger.error('Erro ao excluir arquivo temporário:', err);
      });
    }, 5000);
  } catch (error) {
    logger.error('Erro ao gerar código PIX:', error);
    await client.sendText(whatsappNumber,
      'Desculpe, *ocorreu um erro ao gerar seu código PIX*. Por favor, tente novamente mais tarde, use o aplicativo Papa Tango ou entre em contato com o suporte através do WhatsApp (85) 99268-4035.');
  }
}


// Função para verificar atraso de pagamento
async function verificarAtraso(client, whatsappNumber, userId, userData) {
  try {
    // Buscar contratos ativos do usuário
    const contratosQuery = await db.collection('contratos')
      .where('cliente', '==', userId)
      .where('statusContrato', '==', true)
      .get();

    if (contratosQuery.empty) {
      await client.sendText(whatsappNumber,
        'Você *não possui contratos ativos* no momento. Para mais informações, acesse o *aplicativo Papa Tango* ou fale com suporte através do número (85) 99268-4035.');
      return;
    }

    // Buscar último pagamento aprovado
    const paymentsQuery = await db.collection('payments')
      .where('userEmail', '==', userId)
      .where('status', '==', 'approved')
      .orderBy('dateCreated', 'desc')
      .limit(1)
      .get();

    let dataBase;
    let proximaData;
    let valor;

    if (!paymentsQuery.empty) {
      const ultimoPagamento = paymentsQuery.docs[0].data();
      dataBase = ultimoPagamento.dateCreated.toDate();
    } else {
      // Se não houver pagamento, usar data de início do contrato
      dataBase = contratosQuery.docs[0].data().dataInicio.toDate();
    }

    // Obter dados do aluguel
    const contrato = contratosQuery.docs[0].data();
    const tipoRecorrencia = contrato.tipoRecorrenciaPagamento || 'mensal';

    let aluguel;
    if (contrato.aluguelId) {
      const aluguelDoc = await db.collection('alugueis').doc(contrato.aluguelId).get();
      if (aluguelDoc.exists) {
        aluguel = aluguelDoc.data();
      }
    } else if (contrato.motoId) {
      const alugueisQuery = await db.collection('alugueis')
        .where('motoId', '==', contrato.motoId)
        .where('ativo', '==', true)
        .limit(1)
        .get();

      if (!alugueisQuery.empty) {
        aluguel = alugueisQuery.docs[0].data();
      }
    }

    if (!aluguel) {
      await client.sendText(whatsappNumber,
        'Não foi possível *encontrar informações do seu aluguel*. Por favor, entre em contato com nosso suporte através do WhatsApp (85) 99268-4035.');
      return;
    }

    // Calcular valor e próxima data de pagamento
    valor = tipoRecorrencia === 'semanal' ?
      (aluguel.valorSemanal || 70) :
      (aluguel.valorMensal || 250);

    proximaData = new Date(dataBase);
    if (tipoRecorrencia === 'semanal') {
      proximaData.setDate(proximaData.getDate() + 7);
      while (proximaData <= dataBase) {
        proximaData.setDate(proximaData.getDate() + 7);
      }
    } else {
      proximaData.setMonth(proximaData.getMonth() + 1);
      while (proximaData <= dataBase) {
        proximaData.setMonth(proximaData.getMonth() + 1);
      }
    }

    // Calcular dias restantes
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const diasRestantes = Math.floor((proximaData - hoje) / (1000 * 60 * 60 * 24));

    // Formatar data para exibição
    const dataFormatada = proximaData.toLocaleDateString('pt-BR');

    // Verificar situação de pagamento
    if (diasRestantes < 0) {
      const diasAtraso = Math.abs(diasRestantes);

      let mensagem = `*⚠️ PAGAMENTO EM ATRASO ⚠️*\n\n`;
      mensagem += `Cliente: *${userData.nome || userData.nomeCompleto || userId}*\n`;
      mensagem += `Valor: *R$ ${valor.toFixed(2)}*\n`;
      mensagem += `Data de vencimento: *${dataFormatada}*\n`;
      mensagem += `Dias em atraso: *${diasAtraso}*\n\n`;

      if (diasAtraso > 3) {
        mensagem += `⚠️ *Atenção: Seu serviço pode ser suspenso devido ao atraso no pagamento* ⚠️\n\n`;
      }

      mensagem += `Para regularizar sua situação, você pode *pagar agora* através de *PIX* ou *boleto*.\n`;
      mensagem += `Responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada.\n\n`;
      mensagem += `Se precisar de mais informações, entre em contato com nosso suporte no WhatsApp: (85) 99268-4035.\n\n`;

      await client.sendText(whatsappNumber, mensagem);
    } else if (diasRestantes === 0) {
      let mensagem = `*⚠️ HOJE É O DIA DO PAGAMENTO ⚠️*\n\n`;
      mensagem += `Cliente: *${userData.nome || userData.nomeCompleto || userId}*\n`;
      mensagem += `Valor: *R$ ${valor.toFixed(2)}*\n`;
      mensagem += `Próximo pagamento: *${dataFormatada}* *(Hoje)*\n\n`;
      mensagem += `✅ Sua situação está *regular*! Não há pagamentos em atraso.\n\n`;
      mensagem += `Hoje é o dia do pagamento, responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada, caso ainda não tenha recebido os dados para pagamento.`;

      await client.sendText(whatsappNumber, mensagem);
    } else {
      let mensagem = `*Situação de Pagamento*\n\n`;
      mensagem += `Cliente: *${userData.nome || userData.nomeCompleto || userId}*\n`;
      mensagem += `Valor: *R$ ${valor.toFixed(2)}*\n`;
      mensagem += `Próximo pagamento: *${dataFormatada}*\n`;
      mensagem += `Dias até o vencimento: *${diasRestantes}*\n\n`;
      mensagem += `✅ Sua situação está *regular*! Não há pagamentos em atraso.\n\n`;
      mensagem += `Para pagar antecipadamente, responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada.`;

      await client.sendText(whatsappNumber, mensagem);
    }
  } catch (error) {
    logger.error('Erro ao verificar atraso:', error);
    await client.sendText(whatsappNumber,
      'Desculpe, ocorreu um erro ao *verificar sua situação de pagamento*. Por favor, tente novamente mais tarde, use o aplicativo Papa Tango ou entre em contato com nosso suporte através do WhatsApp (85) 99268-4035.');
  }
}

// Função para enviar lembretes de pagamento
async function enviarLembretesPagamento() {
  try {
    logger.info('Iniciando envio de lembretes de pagamento');
    // Buscar contratos ativos
    const contratosSnapshot = await db.collection('contratos')
      .where('statusContrato', '==', true)
      .get();

    if (contratosSnapshot.empty) {
      logger.info('Nenhum contrato ativo encontrado');
      return;
    }

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let sucessos = 0;
    let falhas = 0;

    // Obter cliente WhatsApp
    const client = require('./whatsapp').getClient();
    if (!client) {
      logger.error('Cliente WhatsApp não inicializado');
      return;
    }

    // Para cada contrato ativo
    for (const contratoDoc of contratosSnapshot.docs) {
      const contrato = contratoDoc.data();

      // Verificar se o contrato tem usuário associado
      if (!contrato.cliente) {
        logger.warn(`Contrato ${contratoDoc.id} não tem cliente associado`);
        falhas++;
        continue;
      }

      // Obter dados do usuário
      const userEmail = contrato.cliente;
      let userData;

      try {
        const userDoc = await db.collection('users').doc(userEmail).get();
        if (!userDoc.exists) {
          logger.warn(`Usuário ${userEmail} não encontrado`);
          falhas++;
          continue;
        }

        userData = userDoc.data();
        // Verificar se o usuário tem telefone
        if (!userData.telefone) {
          logger.warn(`Usuário ${userEmail} não tem telefone cadastrado`);
          falhas++;
          continue;
        }
      } catch (error) {
        logger.error(`Erro ao buscar usuário ${userEmail}:`, error);
        falhas++;
        continue;
      }

      // Buscar último pagamento aprovado
      let dataBase;
      try {
        const paymentsQuery = await db.collection('payments')
          .where('userEmail', '==', userEmail)
          .where('status', '==', 'approved')
          .orderBy('dateCreated', 'desc')
          .limit(1)
          .get();

        if (!paymentsQuery.empty) {
          const ultimoPagamento = paymentsQuery.docs[0].data();
          dataBase = ultimoPagamento.dateCreated.toDate();
        } else {
          // Se não houver pagamento, usar data de início do contrato
          dataBase = contrato.dataInicio.toDate();
        }

        dataBase.setHours(0, 0, 0, 0);
      } catch (error) {
        logger.error(`Erro ao buscar pagamentos para ${userEmail}:`, error);
        falhas++;
        continue;
      }

      // Calcular próxima data de pagamento
      const tipoRecorrencia = contrato.tipoRecorrenciaPagamento || 'mensal';
      const proximaData = new Date(dataBase);

      if (tipoRecorrencia === 'semanal') {
        proximaData.setDate(proximaData.getDate() + 7);
        while (proximaData <= dataBase) {
          proximaData.setDate(proximaData.getDate() + 7);
        }
      } else {
        proximaData.setMonth(proximaData.getMonth() + 1);
        while (proximaData <= dataBase) {
          proximaData.setMonth(proximaData.getMonth() + 1);
        }
      }

      // Calcular dias restantes
      const diasRestantes = Math.floor((proximaData - hoje) / (1000 * 60 * 60 * 24));

      // Verificar se já enviamos um lembrete hoje para este usuário
      const reminderRef = db.collection('whatsappReminders')
        .doc(`${userEmail}_${hoje.toISOString().split('T')[0]}`);
      const reminderDoc = await reminderRef.get();

      if (reminderDoc.exists) {
        logger.info(`Já enviamos um lembrete hoje para ${userEmail}, pulando`);
        continue;
      }

      // Determinar se devemos enviar lembrete hoje
      let deveEnviarLembrete = false;
      let tipoLembrete = '';

      if (tipoRecorrencia === 'mensal') {
        // Para pagamento mensal: enviar no dia do pagamento e 3 dias antes
        if (diasRestantes === 0 || diasRestantes === 1 || diasRestantes === 2 || diasRestantes === 3) {
          deveEnviarLembrete = true;
          tipoLembrete = diasRestantes === 0 ? 'vencimento' : 'antecipado';
        }
      } else {
        // Para pagamento semanal: enviar apenas no dia do pagamento
        if (diasRestantes === 0) {
          deveEnviarLembrete = true;
          tipoLembrete = 'vencimento';
        }
      }

      // Verificar se o pagamento está atrasado (até 3 dias)
      const diasAtraso = diasRestantes < 0 ? Math.abs(diasRestantes) : 0;
      if (diasAtraso > 0 && diasAtraso <= 3) {
        deveEnviarLembrete = true;
        tipoLembrete = 'atraso';
      }

      // Se devemos enviar lembrete, preparar e enviar
      if (deveEnviarLembrete) {
        try {
          // Formatar número para WhatsApp
          const numeroWhatsApp = `${userData.telefone.replace(/\D/g, '')}@c.us`;

          // Obter valor do aluguel
          let valorBase;
          let aluguel;

          if (contrato.aluguelId) {
            const aluguelDoc = await db.collection('alugueis').doc(contrato.aluguelId).get();
            if (aluguelDoc.exists) {
              aluguel = aluguelDoc.data();
            }
          } else if (contrato.motoId) {
            const alugueisQuery = await db.collection('alugueis')
              .where('motoId', '==', contrato.motoId)
              .where('ativo', '==', true)
              .limit(1)
              .get();

            if (!alugueisQuery.empty) {
              aluguel = alugueisQuery.docs[0].data();
            }
          }

          if (aluguel) {
            valorBase = tipoRecorrencia === 'semanal' ?
              (aluguel.valorSemanal || 70) :
              (aluguel.valorMensal || 250);
          } else {
            valorBase = tipoRecorrencia === 'semanal' ? 70 : 250;
          }

          // Calcular valor com multa se estiver em atraso
          let valorFinal = valorBase;
          let estaEmAtraso = false;

          if (diasAtraso > 0) {
            estaEmAtraso = true;
            // Calcular valor com multa (2% + 0.5% ao dia)
            const multaFixa = valorBase * 0.02; // 2% de multa fixa
            const multaDiaria = 10 * diasAtraso; // R$ 10 por dia de atraso
            valorFinal = valorBase + multaFixa + multaDiaria;

            logger.info(`Pagamento em atraso para ${userEmail}. Dias de atraso: ${diasAtraso}. Valor original: ${valorBase}. Valor com multa: ${valorFinal}`);
          }

          // Formatar data para exibição
          const dataFormatada = proximaData.toLocaleDateString('pt-BR');

          // Verificar se já existe um pagamento PIX pendente para este usuário
          let pixPayment = null;
          let pixQrCodeBase64 = null;
          let pixQrCodeText = null;
          let pixPaymentId = null;

          try {
            const pendingPixQuery = await db.collection('payments')
              .where('userEmail', '==', userEmail)
              .where('status', '==', 'pending')
              .where('paymentMethod', '==', 'pix')
              .orderBy('dateCreated', 'desc')
              .limit(1)
              .get();

            if (!pendingPixQuery.empty) {
              // Já existe um pagamento PIX pendente
              const pixDoc = pendingPixQuery.docs[0];
              pixPayment = pixDoc.data();
              pixPaymentId = pixDoc.id;
              const valorPendente = pixPayment.amount;

              // NOVO: Verificar se o valor do pagamento pendente está correto (considerando atraso)
              if (Math.abs(valorPendente - valorFinal) < 0.01) {
                // O valor está correto, usar o pagamento existente
                logger.info(`Encontrado pagamento PIX pendente com valor correto para ${userEmail}`);

                // Extrair QR code e código PIX
                if (pixPayment.pixQrCode) {
                  pixQrCodeText = pixPayment.pixQrCode;
                }
                if (pixPayment.pixCopyPaste) {
                  pixQrCodeBase64 = pixPayment.pixCopyPaste;
                }

                // Verificar também no formato do paymentDetails (compatibilidade)
                if ((!pixQrCodeText || !pixQrCodeBase64) &&
                  pixPayment.paymentDetails &&
                  pixPayment.paymentDetails.point_of_interaction &&
                  pixPayment.paymentDetails.point_of_interaction.transaction_data) {
                  const transactionData = pixPayment.paymentDetails.point_of_interaction.transaction_data;
                  if (!pixQrCodeBase64) pixQrCodeBase64 = transactionData.qr_code_base64;
                  if (!pixQrCodeText) pixQrCodeText = transactionData.qr_code;
                }
              } else {
                // O valor está desatualizado, cancelar o pagamento antigo
                logger.info(`Cancelando PIX desatualizado para ${userEmail}. Valor antigo: ${valorPendente}, Novo valor: ${valorFinal}`);

                // Atualizar o status para 'cancelled' no Firestore
                await db.collection('payments').doc(pixPayment.paymentId.toString()).update({
                  status: 'cancelled',
                  observacao: 'Cancelado automaticamente devido a atraso no pagamento'
                });

                // Continuar para gerar um novo pagamento
                pixQrCodeBase64 = null;
                pixQrCodeText = null;
                pixPaymentId = null;
              }
            }

            // Se não temos dados de PIX válidos, gerar um novo pagamento
            if (!pixQrCodeText) {
              try {
                // Não existe pagamento PIX pendente válido, vamos criar um novo
                logger.info(`Gerando novo pagamento PIX para ${userEmail} com valor ${valorFinal}`);

                // Garantir que o valor seja um número válido e arredondado corretamente
                const valorNumerico = parseFloat(valorBase); // Usar valorBase (sem multa)
                if (isNaN(valorNumerico) || valorNumerico <= 0) {
                  logger.error(`Valor base inválido para pagamento: ${valorBase}`);
                  throw new Error('Valor de pagamento inválido');
                }

                // Arredondar para 2 casas decimais para evitar problemas de precisão
                const valorArredondado = Math.round(valorNumerico * 100) / 100;

                // Preparar dados para a API do Mercado Pago
                const paymentData = {
                  paymentType: 'pix',
                  transactionAmount: valorArredondado, // Usar o valor base arredondado
                  description: `Pagamento ${tipoRecorrencia === 'semanal' ? 'Semanal' : 'Mensal'}`,
                  payer: {
                    email: userEmail,
                    first_name: userData.nome || userData.nomeCompleto?.split(' ')[0] || 'Cliente',
                    last_name: userData.nomeCompleto?.split(' ').slice(1).join(' ') || 'Papa Tango',
                    // Adicionar identificação (CPF) se disponível
                    identification: userData.cpf ? {
                      type: 'CPF',
                      number: userData.cpf.replace(/\D/g, '')
                    } : {
                      // Fornecer um CPF padrão se não estiver disponível
                      type: 'CPF',
                      number: '00000000000'
                    }
                  },
                  // Adicionar informações de dias de atraso para cálculo correto da multa
                  diasAtraso: diasAtraso,
                  // Adicionar referência externa única
                  externalReference: `user_${userEmail}_${Date.now()}`,
                  // Adicionar statement descriptor
                  statementDescriptor: 'PAPA TANGO MOTOS'
                };


                // Log detalhado dos dados que serão enviados
                logger.info(`Dados do pagamento a serem enviados: ${JSON.stringify(paymentData)}`);

                // Chamar a API para gerar o PIX - usando diretamente a URL do Cloud Run
                const response = await axios.post(
                  'https://processpayment-q3zrn7ctxq-uc.a.run.app',
                  paymentData,
                  {
                    timeout: 15000, // Timeout de 15 segundos
                    headers: {
                      'Content-Type': 'application/json'
                    }
                  }
                );

                // Verificar se a resposta contém os dados necessários
                if (response.data && response.data.point_of_interaction && response.data.point_of_interaction.transaction_data) {
                  const transactionData = response.data.point_of_interaction.transaction_data;
                  pixQrCodeBase64 = transactionData.qr_code_base64;
                  pixQrCodeText = transactionData.qr_code;
                  pixPaymentId = response.data.id;

                  // Log de sucesso com detalhes
                  logger.info(`PIX gerado com sucesso. ID: ${pixPaymentId}, QR Code disponível: ${!!pixQrCodeText}`);

                  // Salvar o pagamento no Firestore
                  const paymentDoc = {
                    paymentId: response.data.id,
                    userId: userEmail,
                    userEmail: userEmail,
                    userName: userData.nome || userData.nomeCompleto || 'Cliente',
                    status: response.data.status || 'pending',
                    amount: response.data.transaction_amount || valorFinal, // Valor retornado pela API
                    paymentMethod: 'pix',
                    dateCreated: admin.firestore.FieldValue.serverTimestamp(),
                    description: paymentData.description,
                    externalReference: paymentData.externalReference,
                    pixQrCode: pixQrCodeText,
                    pixCopyPaste: pixQrCodeBase64,
                    // Adicionar informações sobre atraso
                    emAtraso: estaEmAtraso,
                    diasAtraso: diasAtraso,
                    valorOriginal: valorBase,
                    proximaDataPagamento: proximaData ? admin.firestore.Timestamp.fromDate(proximaData) : null,
                    // Adicionar dados completos da resposta
                    paymentDetails: response.data,
                    // Adicionar timestamp de atualização
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  };

                  // Se houver informações de multa na resposta, incluí-las no documento
                  if (response.data.multa) {
                    paymentDoc.multa = response.data.multa;
                  }

                  await db.collection('payments').doc(response.data.id.toString()).set(paymentDoc);

                  logger.info(`Novo pagamento PIX criado com ID: ${response.data.id}`);
                } else {
                  // Log detalhado da resposta inválida
                  logger.error(`Resposta inválida da API de pagamento: ${JSON.stringify(response.data)}`);
                  throw new Error('Resposta inválida da API de pagamento');
                }
              } catch (paymentError) {
                // Log detalhado do erro
                logger.error(`Erro ao processar pagamento PIX para ${userEmail}:`, paymentError);

                if (paymentError.response) {
                  logger.error(`Detalhes do erro de resposta: Status ${paymentError.response.status}, Dados: ${JSON.stringify(paymentError.response.data)}`);
                } else if (paymentError.request) {
                  logger.error(`Erro de requisição (sem resposta): ${paymentError.request}`);
                }
              }
            }
          } catch (error) {
            logger.error(`Erro ao processar pagamento PIX para ${userEmail}:`, error);
            // Continuar mesmo sem o pagamento PIX
          }

          // Preparar mensagem com base no tipo de lembrete
          let mensagem = '';

          if (tipoLembrete === 'vencimento') {
            mensagem = `*⚠️ LEMBRETE DE PAGAMENTO - VENCE HOJE ⚠️*\n\n`;
            mensagem += `Olá, *${userData.nome || userData.nomeCompleto || 'cliente'}!* Somos o *setor de boletos* da Papa Tango.\n`;
            mensagem += `Seu pagamento de *R$ ${valorFinal.toFixed(2)}* vence hoje *(${dataFormatada}).*\n`;
          } else if (tipoLembrete === 'antecipado') {
            mensagem = `*🗓️ LEMBRETE DE PAGAMENTO 🗓️*\n\n`;
            mensagem += `Olá, *${userData.nome || userData.nomeCompleto || 'cliente'}!* Somos o *setor de boletos* da Papa Tango.\n`;
            mensagem += `Seu pagamento de *R$ ${valorFinal.toFixed(2)}* vencerá em *${diasRestantes}* ${diasRestantes === 1 ? 'dia' : 'dias'} *(${dataFormatada}).*\n`;
          } else if (tipoLembrete === 'atraso') {
            mensagem = `*⚠️ PAGAMENTO EM ATRASO ⚠️*\n\n`;
            mensagem += `Olá, *${userData.nome || userData.nomeCompleto || 'cliente'}!* Somos o *setor de boletos* da Papa Tango.\n`;
            mensagem += `Notamos que seu pagamento de *R$ ${valorBase.toFixed(2)}* está atrasado há *${diasAtraso}* ${diasAtraso === 1 ? 'dia' : 'dias'} *(venceu em ${dataFormatada}).*\n`;

            // NOVO: Adicionar informações sobre multa
            if (estaEmAtraso) {
              mensagem += `\n⚠️ *Valor atualizado com multa: R$ ${valorFinal.toFixed(2)}*\n`;
              mensagem += `(Multa de 2% + R$10 ao dia de atraso)\n`;
            }
          }

          // Adicionar informações de pagamento PIX se disponíveis
          if (pixQrCodeText) {
            mensagem += `\nPara sua comodidade, segue os dados do PIX para realizar o pagamento.\n\nPIX copia e cola 👇`;

            // Enviar mensagem inicial
            await client.sendText(numeroWhatsApp, mensagem);

            // Enviar código PIX copia e cola
            await client.sendText(numeroWhatsApp, `${pixQrCodeText}`);

            // Gerar e enviar QR Code como imagem
            if (pixQrCodeText) {
              try {
                const qrCodePath = path.join(tempDir, `pix_${pixPaymentId || Date.now()}.png`);
                await qrcode.toFile(qrCodePath, pixQrCodeText, {
                  errorCorrectionLevel: 'H',
                  margin: 1,
                  width: 300
                });

                // Enviar QR Code como imagem
                await client.sendImage(
                  numeroWhatsApp,
                  qrCodePath,
                  'QR_Code_PIX.png ☝️',
                  'QR Code para pagamento PIX ☝️'
                );

                // Limpar arquivo temporário após envio
                setTimeout(() => {
                  fs.unlink(qrCodePath, (err) => {
                    if (err) logger.error('Erro ao excluir arquivo temporário:', err);
                  });
                }, 5000);
              } catch (error) {
                logger.error(`Erro ao gerar QR code para ${userEmail}:`, error);
              }
            }

            let mensagemFinal = '';

            if (tipoLembrete === 'vencimento') {
              mensagemFinal = `⚠️ *O pagamento até hoje garante a permanência da locação da moto*⚠️\n\n`;
              mensagemFinal += `Se preferir pagar com boleto, responda com "BOLETO" para gerar a opção desejada.\n\n`;
              mensagemFinal += `*Obrigado por escolher a Papa Tango!*\n\n`;
              mensagemFinal += `Esta é uma mensagem automática, caso já tenha realizado o pagamento, desconsidere esta mensagem.\nCaso precise de ajuda ou tenha alguma dúvida, entre em contato conosco através do WhatsApp *(85) 99268-4035*`;
            } else if (tipoLembrete === 'antecipado') {
              mensagemFinal = `Se preferir pagar com boleto, responda com "BOLETO" para gerar a opção desejada.\n\n`;
              mensagemFinal += `*Obrigado por escolher a Papa Tango!*\n\n`;
              mensagemFinal += `Esta é uma mensagem automática, caso já tenha realizado o pagamento, desconsidere esta mensagem.\nCaso precise de ajuda ou tenha alguma dúvida, entre em contato conosco através do WhatsApp *(85) 99268-4035*`;
            } else if (tipoLembrete === 'atraso') {
              mensagemFinal = `⚠️ *A sua locação poderá ser suspensa a qualquer momento se o pagamento não for realizado*⚠️\n\n`;
              // Adicionar informação sobre aumento do valor por dia de atraso
              mensagemFinal += `⚠️ *Atenção: O valor aumentará a cada dia de atraso (R$10 ao dia)*\n\n`;
              mensagemFinal += `Esta é uma mensagem automática, caso já tenha realizado o pagamento, desconsidere esta mensagem.\nCaso precise de ajuda ou tenha alguma dúvida, entre em contato conosco através do WhatsApp *(85) 99268-4035*`;
            }

            await client.sendText(numeroWhatsApp, mensagemFinal);
          } else {
            // Se não temos PIX, enviar mensagem padrão
            if (estaEmAtraso) {
              // Adicionar informações sobre multa
              mensagem += `\n⚠️ *Valor atualizado com multa: R$ ${valorFinal.toFixed(2)}*\n`;
              mensagem += `(Multa de 2% + R$10 ao dia de atraso)\n`;
            }

            mensagem += `\nPara sua comodidade, você pode pagar diretamente por aqui através de PIX ou boleto.\n`;
            mensagem += `Responda com *"PIX"* ou *"BOLETO"* para gerar a opção desejada.\n\n`;

            if (tipoLembrete === 'atraso') {
              mensagem += `⚠️ *A sua locação poderá ser suspensa a qualquer momento se o pagamento não for realizado*⚠️\n\n`;
              // Adicionar informação sobre aumento do valor por dia de atraso
              mensagem += `⚠️ *Atenção: O valor aumentará a cada dia de atraso (R$10 ao dia)*\n\n`;
            } else if (tipoLembrete === 'vencimento') {
              mensagem += `⚠️ *O pagamento até hoje garante a permanência da locação da moto*⚠️\n\n`;
            }

            mensagem += `*Obrigado por escolher a Papa Tango!*\n\n`;
            mensagem += `Esta é uma mensagem automática, caso já tenha realizado o pagamento, desconsidere esta mensagem.\nCaso precise de ajuda ou tenha alguma dúvida, entre em contato conosco através do WhatsApp *(85) 99268-4035*`;

            await client.sendText(numeroWhatsApp, mensagem);
          }

          // Registrar que o lembrete foi enviado hoje
          const reminderData = {
            userEmail: userEmail,
            paymentDate: proximaData,
            paymentAmount: valorBase,
            // Adicionar valor com multa se estiver em atraso
            paymentAmountWithFine: valorFinal,
            diasRestantes: diasRestantes,
            diasAtraso: diasAtraso,
            tipoLembrete: tipoLembrete,
            // Adicionar flag de atraso
            emAtraso: estaEmAtraso,
            sentAt: admin.firestore.FieldValue.serverTimestamp()
          };

          // Adicionar pixPaymentId apenas se ele existir
          if (pixPaymentId) {
            reminderData.pixPaymentId = pixPaymentId;
          }

          await reminderRef.set(reminderData);
          logger.info(`Lembrete de pagamento enviado para ${userEmail} (${tipoLembrete})`);
          sucessos++;
        } catch (error) {
          logger.error(`Erro ao enviar lembrete para ${userEmail}:`, error);
          falhas++;
        }
      }
    }

    logger.info(`Envio de lembretes concluído. Sucessos: ${sucessos}, Falhas: ${falhas}`);
  } catch (error) {
    logger.error('Erro ao processar lembretes de pagamento:', error);
  }
}

// Função para enviar lembretes noturnos de pagamentos PIX pendentes
async function enviarLembretesNoturnosPix() {
  try {
    logger.info('Iniciando envio de lembretes noturnos de pagamentos PIX pendentes');

    // Obter cliente WhatsApp
    const client = require('./whatsapp').getClient();
    if (!client) {
      logger.error('Cliente WhatsApp não inicializado para lembretes noturnos');
      return;
    }

    // Buscar pagamentos PIX pendentes criados hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const pendingPixQuery = await db.collection('payments')
      .where('status', '==', 'pending')
      .where('paymentMethod', '==', 'pix')
      .where('dateCreated', '>=', admin.firestore.Timestamp.fromDate(hoje))
      .where('dateCreated', '<', admin.firestore.Timestamp.fromDate(amanha))
      .get();

    if (pendingPixQuery.empty) {
      logger.info('Nenhum pagamento PIX pendente encontrado para hoje');
      return;
    }

    logger.info(`Encontrados ${pendingPixQuery.size} pagamentos PIX pendentes para hoje`);
    let sucessos = 0;
    let falhas = 0;

    // Para cada pagamento PIX pendente
    for (const pixDoc of pendingPixQuery.docs) {
      const pixPayment = pixDoc.data();
      const userEmail = pixPayment.userEmail;

      // Verificar se já enviamos um lembrete noturno hoje para este pagamento
      const reminderRef = db.collection('whatsappReminders')
        .doc(`noturno_pix_${pixPayment.paymentId}_${hoje.toISOString().split('T')[0]}`);
      const reminderDoc = await reminderRef.get();

      if (reminderDoc.exists) {
        logger.info(`Já enviamos um lembrete noturno para o pagamento ${pixPayment.paymentId}, pulando`);
        continue;
      }

      try {
        // Obter dados do usuário
        const userDoc = await db.collection('users').doc(userEmail).get();
        if (!userDoc.exists) {
          logger.warn(`Usuário ${userEmail} não encontrado para lembrete noturno`);
          falhas++;
          continue;
        }

        const userData = userDoc.data();
        // Verificar se o usuário tem telefone
        if (!userData.telefone) {
          logger.warn(`Usuário ${userEmail} não tem telefone cadastrado para lembrete noturno`);
          falhas++;
          continue;
        }

        // Formatar número para WhatsApp
        const numeroWhatsApp = `${userData.telefone.replace(/\D/g, '')}@c.us`;

        // Extrair dados do PIX
        let pixQrCodeText = pixPayment.pixQrCode;
        let pixQrCodeBase64 = pixPayment.pixCopyPaste;

        // Verificar também no formato do paymentDetails (compatibilidade)
        if ((!pixQrCodeText || !pixQrCodeBase64) &&
          pixPayment.paymentDetails &&
          pixPayment.paymentDetails.point_of_interaction &&
          pixPayment.paymentDetails.point_of_interaction.transaction_data) {
          const transactionData = pixPayment.paymentDetails.point_of_interaction.transaction_data;
          if (!pixQrCodeBase64) pixQrCodeBase64 = transactionData.qr_code_base64;
          if (!pixQrCodeText) pixQrCodeText = transactionData.qr_code;
        }

        if (!pixQrCodeText) {
          logger.warn(`Dados do PIX não encontrados para o pagamento ${pixPayment.paymentId}`);
          falhas++;
          continue;
        }

        // Preparar mensagem de lembrete noturno
        let mensagem = `*🌙 LEMBRETE NOTURNO DE PAGAMENTO PIX 🌙*\n\n`;
        mensagem += `Olá, *${userData.nome || userData.nomeCompleto || 'cliente'}!*\n\n`;
        mensagem += `Notamos que você ainda não concluiu o pagamento via PIX gerado hoje no valor de *R$ ${pixPayment.amount.toFixed(2)}*.\n\n`;

        if (pixPayment.emAtraso) {
          mensagem += `⚠️ *ATENÇÃO: Seu pagamento está atrasado em ${pixPayment.diasAtraso} ${pixPayment.diasAtraso === 1 ? 'dia' : 'dias'}*\n`;
          mensagem += `O valor inclui multa de 2% + R$10 ao dia de atraso.\n\n`;
          mensagem += `⚠️ *A sua locação poderá ser suspensa a qualquer momento se o pagamento não for realizado*⚠️\n\n`;
        }

        mensagem += `Para sua comodidade, estamos enviando novamente os dados do PIX para que você possa concluir o pagamento.\n\nPIX copia e cola 👇`;

        // Enviar mensagem inicial
        await client.sendText(numeroWhatsApp, mensagem);

        // Enviar código PIX copia e cola
        await client.sendText(numeroWhatsApp, `${pixQrCodeText}`);

        // Gerar e enviar QR Code como imagem
        try {
          const qrCodePath = path.join(tempDir, `pix_noturno_${pixPayment.paymentId || Date.now()}.png`);
          await qrcode.toFile(qrCodePath, pixQrCodeText, {
            errorCorrectionLevel: 'H',
            margin: 1,
            width: 300
          });

          // Enviar QR Code como imagem
          await client.sendImage(
            numeroWhatsApp,
            qrCodePath,
            'QR_Code_PIX.png ☝️',
            'QR Code para pagamento PIX ☝️'
          );

          // Limpar arquivo temporário após envio
          setTimeout(() => {
            fs.unlink(qrCodePath, (err) => {
              if (err) logger.error('Erro ao excluir arquivo temporário:', err);
            });
          }, 5000);
        } catch (error) {
          logger.error(`Erro ao gerar QR code para lembrete noturno ${userEmail}:`, error);
        }

        // Mensagem final
        let mensagemFinal = `⚠️ *O pagamento via PIX é processado em poucos minutos após a confirmação.*\n\n`;
        mensagemFinal += `*Obrigado por escolher a Papa Tango!*\n\n`;
        mensagemFinal += `Esta é uma mensagem automática. Caso já tenha realizado o pagamento, desconsidere esta mensagem.\nCaso precise de ajuda ou tenha alguma dúvida, entre em contato conosco através do WhatsApp *(85) 99268-4035*`;

        await client.sendText(numeroWhatsApp, mensagemFinal);

        // Registrar que o lembrete noturno foi enviado
        await reminderRef.set({
          paymentId: pixPayment.paymentId,
          userEmail: userEmail,
          paymentAmount: pixPayment.amount,
          emAtraso: pixPayment.emAtraso || false,
          diasAtraso: pixPayment.diasAtraso || 0,
          sentAt: admin.firestore.FieldValue.serverTimestamp()
        });

        logger.info(`Lembrete noturno de PIX enviado para ${userEmail} (pagamento ${pixPayment.paymentId})`);
        sucessos++;
      } catch (error) {
        logger.error(`Erro ao enviar lembrete noturno para ${userEmail} (pagamento ${pixPayment.paymentId}):`, error);
        falhas++;
      }
    }

    logger.info(`Envio de lembretes noturnos concluído. Sucessos: ${sucessos}, Falhas: ${falhas}`);
  } catch (error) {
    logger.error('Erro ao processar lembretes noturnos de pagamentos PIX:', error);
  }
}

module.exports = {
  enviarInformacoesPagamento,
  enviarBoleto,
  enviarPix,
  verificarAtraso,
  enviarLembretesPagamento,
  enviarLembretesNoturnosPix,
};
