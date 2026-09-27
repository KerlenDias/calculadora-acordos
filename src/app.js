(function () {
  'use strict';

  var moeda = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  var percentual = new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 4
  });

  var campos = {
    valor: document.getElementById('valor'),
    data: document.getElementById('data'),
    parcelas: document.getElementById('parcelas'),
    juros: document.getElementById('juros')
  };

  var saidas = {
    multa: document.getElementById('multa-semanal'),
    taxaTotal: document.getElementById('taxa-total'),
    parcelaHabitual: document.getElementById('parcela-habitual'),
    ultimaParcela: document.getElementById('ultima-parcela'),
    totalJuros: document.getElementById('total-juros'),
    totalMulta: document.getElementById('total-multa'),
    totalPagar: document.getElementById('total-pagar'),
    mensagem: document.getElementById('mensagem'),
    corpoParcelas: document.getElementById('corpo-parcelas'),
    mensagemParcelas: document.getElementById('mensagem-parcelas'),
    rodapeParcelas: document.getElementById('rodape-parcelas')
  };

  var apresentacao = {
    painel: document.getElementById('apresentacao'),
    abrir: document.getElementById('abrir-apresentacao'),
    fechar: document.getElementById('fechar-apresentacao'),
    imprimir: document.getElementById('imprimir-apresentacao'),
    valor: document.getElementById('ap-valor'),
    parcelas: document.getElementById('ap-parcelas'),
    parcela: document.getElementById('ap-parcela'),
    total: document.getElementById('ap-total'),
    juros: document.getElementById('ap-juros'),
    corpo: document.getElementById('ap-corpo')
  };

  var ultimoResultado = null;
  var focoAnterior = null;

  var rotulos = {
    valor: 'valor original',
    data: 'data do acordo',
    parcelas: 'quantidade de parcelas',
    juros: 'taxa de juros por semana'
  };

  function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function limparResumo() {
    saidas.parcelaHabitual.textContent = '—';
    saidas.ultimaParcela.textContent = '—';
    saidas.totalJuros.textContent = '—';
    saidas.totalMulta.textContent = '—';
    saidas.totalPagar.textContent = '—';
  }

  function limparParcelas(mensagem) {
    saidas.corpoParcelas.innerHTML = '';
    saidas.rodapeParcelas.innerHTML = '';
    saidas.mensagemParcelas.textContent = mensagem;
    saidas.mensagemParcelas.hidden = false;
  }

  function exibirMensagem(texto, tipo) {
    saidas.mensagem.textContent = texto;
    saidas.mensagem.className = 'mensagem mensagem--' + tipo;
    saidas.mensagem.hidden = !texto;
  }

  function celula(texto, classe) {
    var td = document.createElement('td');
    td.textContent = texto;
    if (classe) {
      td.className = classe;
    }
    return td;
  }

  function renderizarParcelas(resultado) {
    var corpo = document.createDocumentFragment();

    resultado.linhas.forEach(function (linha) {
      var tr = document.createElement('tr');
      tr.appendChild(celula(String(linha.numero), 'numero'));
      tr.appendChild(celula(formatarData(linha.vencimento), 'numero'));
      tr.appendChild(celula(moeda.format(linha.saldoAnterior), 'numero'));
      tr.appendChild(celula(moeda.format(linha.juros), 'numero'));
      tr.appendChild(celula(moeda.format(linha.multa), 'numero'));
      tr.appendChild(celula(moeda.format(linha.amortizacao), 'numero'));
      tr.appendChild(celula(moeda.format(linha.pagamento), 'numero'));
      tr.appendChild(celula(moeda.format(linha.saldoRestante), 'numero'));
      corpo.appendChild(tr);
    });

    saidas.corpoParcelas.innerHTML = '';
    saidas.corpoParcelas.appendChild(corpo);

    var rodape = document.createElement('tr');
    rodape.appendChild(celula('Totais'));
    rodape.appendChild(celula(''));
    rodape.appendChild(celula(''));
    rodape.appendChild(celula(moeda.format(resultado.resumo.totalJuros), 'numero'));
    rodape.appendChild(celula(moeda.format(resultado.resumo.totalMulta), 'numero'));
    rodape.appendChild(celula(moeda.format(resultado.resumo.totalAmortizacao), 'numero'));
    rodape.appendChild(celula(moeda.format(resultado.resumo.totalPagar), 'numero'));
    rodape.appendChild(celula(moeda.format(0), 'numero'));

    saidas.rodapeParcelas.innerHTML = '';
    saidas.rodapeParcelas.appendChild(rodape);
    saidas.mensagemParcelas.hidden = true;
  }

  function renderizarApresentacao(resultado) {
    var linhas = resultado.linhas.filter(function (linha) {
      return linha.pagamento > 0;
    });
    if (linhas.length === 0) {
      linhas = resultado.linhas;
    }

    apresentacao.valor.textContent = moeda.format(resultado.entradas.valor);
    apresentacao.parcelas.textContent = linhas.length + (linhas.length === 1 ? ' pagamento semanal' : ' pagamentos semanais');
    apresentacao.parcela.textContent = moeda.format(resultado.resumo.parcelaHabitual);
    apresentacao.total.textContent = moeda.format(resultado.resumo.totalPagar);
    apresentacao.juros.textContent = percentual.format(resultado.entradas.juros);

    var corpo = document.createDocumentFragment();
    linhas.forEach(function (linha) {
      var tr = document.createElement('tr');
      tr.appendChild(celula(String(linha.numero)));
      tr.appendChild(celula(formatarData(linha.vencimento)));
      tr.appendChild(celula(moeda.format(linha.pagamento), 'numero'));
      corpo.appendChild(tr);
    });
    apresentacao.corpo.innerHTML = '';
    apresentacao.corpo.appendChild(corpo);
  }

  function abrirApresentacao() {
    if (!ultimoResultado) {
      return;
    }
    renderizarApresentacao(ultimoResultado);
    focoAnterior = document.activeElement;
    apresentacao.painel.hidden = false;
    document.body.classList.add('com-apresentacao');
    apresentacao.fechar.focus();
  }

  function fecharApresentacao() {
    apresentacao.painel.hidden = true;
    document.body.classList.remove('com-apresentacao');
    if (focoAnterior && typeof focoAnterior.focus === 'function') {
      focoAnterior.focus();
    }
  }

  function lerEntradas() {
    return {
      valor: campos.valor.value.trim(),
      data: campos.data.value.trim(),
      parcelas: campos.parcelas.value.trim(),
      juros: campos.juros.value.trim() === '' ? '' : Number(campos.juros.value) / 100
    };
  }

  function atualizarTaxas(entradas) {
    saidas.multa.textContent = percentual.format(Acordo.MULTA_SEMANAL);
    if (entradas.juros === '' || !isFinite(Number(entradas.juros)) || Number(entradas.juros) < 0) {
      saidas.taxaTotal.textContent = '—';
      return;
    }
    saidas.taxaTotal.textContent = percentual.format(Acordo.somarTaxas(Number(entradas.juros), Acordo.MULTA_SEMANAL));
  }

  function recalcular() {
    var entradas = lerEntradas();
    atualizarTaxas(entradas);

    var resultado = Acordo.calcular(entradas);

    if (!resultado.ok) {
      ultimoResultado = null;
      apresentacao.abrir.disabled = true;
      fecharApresentacao();
      limparResumo();
      if (resultado.vazios.length > 0) {
        var faltantes = resultado.vazios.map(function (campo) {
          return rotulos[campo];
        });
        exibirMensagem('Preencha ' + faltantes.join(', ') + ' para ver os resultados.', 'instrucao');
        limparParcelas('Preencha os dados do acordo para gerar a tabela de parcelas.');
      } else {
        exibirMensagem(resultado.erros.join(' '), 'erro');
        limparParcelas('Corrija os dados do acordo para gerar a tabela de parcelas.');
      }
      return;
    }

    ultimoResultado = resultado;
    apresentacao.abrir.disabled = false;
    exibirMensagem('', 'instrucao');
    saidas.parcelaHabitual.textContent = moeda.format(resultado.resumo.parcelaHabitual);
    saidas.ultimaParcela.textContent = moeda.format(resultado.resumo.ultimaParcela);
    saidas.totalJuros.textContent = moeda.format(resultado.resumo.totalJuros);
    saidas.totalMulta.textContent = moeda.format(resultado.resumo.totalMulta);
    saidas.totalPagar.textContent = moeda.format(resultado.resumo.totalPagar);
    renderizarParcelas(resultado);

    if (!apresentacao.painel.hidden) {
      renderizarApresentacao(resultado);
    }
  }

  function configurarPreferencia(atributo, chaveArmazenada, valorPadrao) {
    var raiz = document.documentElement;
    var botoes = Array.prototype.slice.call(document.querySelectorAll('[data-' + atributo + ']'))
      .filter(function (elemento) {
        return elemento !== raiz;
      });

    function aplicar(valor) {
      raiz.dataset[atributo] = valor;
      botoes.forEach(function (botao) {
        var ativo = botao.dataset[atributo] === valor;
        botao.classList.toggle('botao--ativo', ativo);
        botao.setAttribute('aria-pressed', String(ativo));
      });
      try {
        localStorage.setItem(chaveArmazenada, valor);
      } catch (erro) {
        void erro;
      }
    }

    var salvo = null;
    try {
      salvo = localStorage.getItem(chaveArmazenada);
    } catch (erro) {
      void erro;
    }

    var conhecidos = botoes.map(function (botao) {
      return botao.dataset[atributo];
    });

    aplicar(conhecidos.indexOf(salvo) >= 0 ? salvo : valorPadrao);

    botoes.forEach(function (botao) {
      botao.addEventListener('click', function () {
        aplicar(botao.dataset[atributo]);
      });
    });
  }

  Object.keys(campos).forEach(function (chave) {
    campos[chave].addEventListener('input', recalcular);
  });

  apresentacao.abrir.addEventListener('click', abrirApresentacao);
  apresentacao.fechar.addEventListener('click', fecharApresentacao);
  apresentacao.imprimir.addEventListener('click', function () {
    window.print();
  });

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && !apresentacao.painel.hidden) {
      fecharApresentacao();
    }
  });

  configurarPreferencia('tema', 'acordo:tema', 'claro');
  configurarPreferencia('texto', 'acordo:texto', 'normal');
  recalcular();
})();
