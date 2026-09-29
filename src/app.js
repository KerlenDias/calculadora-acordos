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
    multa: document.getElementById('multa-mensal'),
    taxaTotal: document.getElementById('taxa-total'),
    taxaSemana: document.getElementById('taxa-semana'),
    dicaTaxaTotal: document.getElementById('dica-taxa-total'),
    dicaTaxaSemana: document.getElementById('dica-taxa-semana'),
    parcelaHabitual: document.getElementById('parcela-habitual'),
    ultimaParcela: document.getElementById('ultima-parcela'),
    totalJuros: document.getElementById('total-juros'),
    totalMulta: document.getElementById('total-multa'),
    totalPagar: document.getElementById('total-pagar'),
    mensagem: document.getElementById('mensagem'),
    copiarTabela: document.getElementById('copiar-tabela'),
    cabecalhoParcelas: document.getElementById('cabecalho-parcelas'),
    colunas: document.getElementById('colunas-tabela'),
    iconeCopiar: document.querySelector('#copiar-tabela .icone--copiar'),
    iconeFeito: document.querySelector('#copiar-tabela .icone--feito'),
    avisoCopia: document.getElementById('aviso-copia'),
    corpoParcelas: document.getElementById('corpo-parcelas'),
    mensagemParcelas: document.getElementById('mensagem-parcelas'),
    rodapeParcelas: document.getElementById('rodape-parcelas')
  };

  var simulacoes = {
    nome: document.getElementById('nome-simulacao'),
    salvar: document.getElementById('salvar-simulacao'),
    lista: document.getElementById('lista-simulacoes'),
    vazio: document.getElementById('vazio-simulacoes'),
    mensagem: document.getElementById('mensagem-simulacoes'),
    copiar: document.getElementById('copiar-link')
  };

  var CHAVE_SIMULACOES = 'acordo:simulacoes';
  var MAXIMO_SIMULACOES = 30;
  var ROTULO_COPIAR = 'Copiar tabela para colar no Excel';
  var CHAVE_COLUNAS = 'acordo:colunas';
  var temporizadorCopia = null;
  var colunasVisiveis = lerColunas();

  function lerColunas() {
    var bruto = null;
    try {
      bruto = localStorage.getItem(CHAVE_COLUNAS);
    } catch (erro) {
      void erro;
    }
    if (!bruto) {
      return Tabela.todasAsChaves();
    }
    try {
      var salvas = JSON.parse(bruto);
      var validas = Tabela.selecionar(salvas).map(function (coluna) {
        return coluna.chave;
      });
      return validas;
    } catch (erro) {
      void erro;
      return Tabela.todasAsChaves();
    }
  }

  function gravarColunas() {
    try {
      localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(colunasVisiveis));
    } catch (erro) {
      void erro;
    }
  }

  function aplicarColunas() {
    var celulas = document.querySelectorAll('.tabela [data-coluna]');
    Array.prototype.forEach.call(celulas, function (elemento) {
      elemento.hidden = colunasVisiveis.indexOf(elemento.dataset.coluna) < 0;
    });
  }

  function renderizarSeletorColunas() {
    saidas.colunas.innerHTML = '';

    Tabela.COLUNAS.forEach(function (coluna) {
      var visivel = colunasVisiveis.indexOf(coluna.chave) >= 0;

      var rotulo = document.createElement('label');
      rotulo.className = 'coluna-chip';
      rotulo.title = coluna.dica;

      var caixa = document.createElement('input');
      caixa.type = 'checkbox';
      caixa.checked = visivel;
      caixa.value = coluna.chave;
      // Sem nenhuma coluna a tabela some; a ultima marcada fica travada.
      caixa.disabled = visivel && colunasVisiveis.length === 1;

      caixa.addEventListener('change', function () {
        if (caixa.checked) {
          colunasVisiveis = Tabela.selecionar(colunasVisiveis.concat([coluna.chave])).map(function (item) {
            return item.chave;
          });
        } else {
          colunasVisiveis = colunasVisiveis.filter(function (chave) {
            return chave !== coluna.chave;
          });
        }
        gravarColunas();
        aplicarColunas();
        renderizarSeletorColunas();
      });

      var texto = document.createElement('span');
      texto.textContent = coluna.titulo;

      rotulo.appendChild(caixa);
      rotulo.appendChild(texto);
      saidas.colunas.appendChild(rotulo);
    });
  }

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
    taxaSemana: document.getElementById('ap-taxa-semana'),
    corpo: document.getElementById('ap-corpo'),
    copiar: document.getElementById('copiar-link-apresentacao')
  };

  var ultimoResultado = null;
  var focoAnterior = null;

  var rotulos = {
    valor: 'valor original',
    data: 'data do acordo',
    parcelas: 'quantidade de parcelas semanais',
    juros: 'taxa de juros ao mês'
  };

  function formatarData(data) {
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function estadoAtual() {
    return {
      valor: campos.valor.value.trim(),
      data: campos.data.value.trim(),
      parcelas: campos.parcelas.value.trim(),
      juros: campos.juros.value.trim()
    };
  }

  function aplicarEstado(estado) {
    Object.keys(campos).forEach(function (chave) {
      if (estado[chave] !== undefined) {
        campos[chave].value = estado[chave];
      }
    });
  }

  function linkAtual() {
    return Proposta.montarLink(window.location.href, estadoAtual());
  }

  function sincronizarLink() {
    var codificado = Proposta.codificarEstado(estadoAtual());
    var alvo = codificado === '' ? window.location.pathname + window.location.search : '#' + codificado;
    if (!window.history || typeof window.history.replaceState !== 'function') {
      return;
    }
    try {
      window.history.replaceState(null, '', alvo);
    } catch (erro) {
      void erro;
    }
  }

  function copiarTexto(texto) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(texto).then(function () {
        return true;
      }, function () {
        return copiarPorSelecao(texto);
      });
    }
    return Promise.resolve(copiarPorSelecao(texto));
  }

  // file:// e navegadores antigos bloqueiam a Clipboard API; a selecao oculta ainda funciona.
  function copiarPorSelecao(texto) {
    var area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    var copiou = false;
    try {
      copiou = document.execCommand('copy');
    } catch (erro) {
      void erro;
    }
    document.body.removeChild(area);
    return copiou;
  }

  function copiarTabela() {
    if (!ultimoResultado) {
      return;
    }

    var tsv = Tabela.paraTsv(ultimoResultado, colunasVisiveis);
    var html = Tabela.paraHtml(ultimoResultado, colunasVisiveis);

    function concluir(copiou) {
      var texto = copiou
        ? ultimoResultado.linhas.length + (ultimoResultado.linhas.length === 1 ? ' linha' : ' linhas')
          + ' × ' + colunasVisiveis.length
          + (colunasVisiveis.length === 1 ? ' coluna copiada' : ' colunas copiadas')
        : 'Não foi possível copiar';

      saidas.copiarTabela.classList.remove('botao--feito', 'botao--falhou');
      saidas.copiarTabela.classList.add(copiou ? 'botao--feito' : 'botao--falhou');
      saidas.copiarTabela.setAttribute('aria-label', copiou ? 'Tabela copiada' : 'Não foi possível copiar a tabela');
      saidas.copiarTabela.title = saidas.copiarTabela.getAttribute('aria-label');
      saidas.iconeCopiar.hidden = copiou;
      saidas.iconeFeito.hidden = !copiou;

      saidas.avisoCopia.textContent = texto;
      saidas.avisoCopia.className = 'aviso-copia' + (copiou ? '' : ' aviso-copia--erro');
      saidas.avisoCopia.hidden = false;

      if (temporizadorCopia) {
        clearTimeout(temporizadorCopia);
      }
      temporizadorCopia = setTimeout(function () {
        saidas.copiarTabela.classList.remove('botao--feito', 'botao--falhou');
        saidas.copiarTabela.setAttribute('aria-label', ROTULO_COPIAR);
        saidas.copiarTabela.title = ROTULO_COPIAR;
        saidas.iconeCopiar.hidden = false;
        saidas.iconeFeito.hidden = true;
        saidas.avisoCopia.hidden = true;
      }, 2500);
    }

    // O Excel cola a versao HTML como celulas; o TSV cobre editor de texto e navegador antigo.
    if (navigator.clipboard && typeof navigator.clipboard.write === 'function'
      && typeof ClipboardItem === 'function') {
      navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': new Blob([tsv], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' })
        })
      ]).then(function () {
        concluir(true);
      }, function () {
        copiarTexto(tsv).then(concluir);
      });
      return;
    }

    copiarTexto(tsv).then(concluir);
  }

  function avisarSimulacoes(texto, tipo) {
    simulacoes.mensagem.textContent = texto;
    simulacoes.mensagem.className = 'mensagem mensagem--' + (tipo || 'instrucao');
    simulacoes.mensagem.hidden = !texto;
  }

  function lerSimulacoes() {
    var bruto = null;
    try {
      bruto = localStorage.getItem(CHAVE_SIMULACOES);
    } catch (erro) {
      void erro;
      return [];
    }
    if (!bruto) {
      return [];
    }
    try {
      var lista = JSON.parse(bruto);
      return Array.isArray(lista) ? lista : [];
    } catch (erro) {
      void erro;
      return [];
    }
  }

  function gravarSimulacoes(lista) {
    try {
      localStorage.setItem(CHAVE_SIMULACOES, JSON.stringify(lista));
      return true;
    } catch (erro) {
      void erro;
      return false;
    }
  }

  function descreverSimulacao(item) {
    var partes = [];
    if (item.valor !== undefined && item.valor !== '') {
      partes.push(moeda.format(Number(item.valor)));
    }
    if (item.parcelas) {
      partes.push(item.parcelas + 'x semanal');
    }
    if (item.juros !== undefined && item.juros !== '') {
      partes.push(item.juros.toString().replace('.', ',') + '% a.m.');
    }
    if (item.data) {
      var partesData = item.data.split('-');
      if (partesData.length === 3) {
        partes.push(partesData[2] + '/' + partesData[1] + '/' + partesData[0]);
      }
    }
    return partes.join(' · ');
  }

  function renderizarSimulacoes() {
    var lista = lerSimulacoes();
    simulacoes.lista.innerHTML = '';
    simulacoes.vazio.hidden = lista.length > 0;

    lista.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'simulacao';

      var dados = document.createElement('div');
      dados.className = 'simulacao__dados';

      var nome = document.createElement('p');
      nome.className = 'simulacao__nome';
      nome.textContent = item.nome;
      dados.appendChild(nome);

      var detalhe = document.createElement('p');
      detalhe.className = 'simulacao__detalhe';
      detalhe.textContent = descreverSimulacao(item);
      dados.appendChild(detalhe);

      var acoes = document.createElement('div');
      acoes.className = 'simulacao__acoes';

      var abrir = document.createElement('button');
      abrir.type = 'button';
      abrir.className = 'botao';
      abrir.textContent = 'Abrir';
      abrir.addEventListener('click', function () {
        aplicarEstado(item);
        recalcular();
        avisarSimulacoes('Simulação "' + item.nome + '" carregada.', 'instrucao');
      });

      var excluir = document.createElement('button');
      excluir.type = 'button';
      excluir.className = 'botao';
      excluir.textContent = 'Excluir';
      excluir.addEventListener('click', function () {
        var restantes = lerSimulacoes().filter(function (outro) {
          return outro.id !== item.id;
        });
        gravarSimulacoes(restantes);
        renderizarSimulacoes();
        avisarSimulacoes('Simulação "' + item.nome + '" excluída.', 'instrucao');
      });

      acoes.appendChild(abrir);
      acoes.appendChild(excluir);
      li.appendChild(dados);
      li.appendChild(acoes);
      simulacoes.lista.appendChild(li);
    });
  }

  function salvarSimulacao() {
    if (!ultimoResultado) {
      avisarSimulacoes('Preencha e corrija os dados do acordo antes de salvar.', 'erro');
      return;
    }

    var estado = estadoAtual();
    var nome = simulacoes.nome.value.trim();
    if (nome === '') {
      nome = descreverSimulacao(estado) || 'Simulação sem identificação';
    }

    var item = {
      id: String(Date.now()) + '-' + Math.random().toString(36).slice(2, 8),
      nome: nome,
      valor: estado.valor,
      data: estado.data,
      parcelas: estado.parcelas,
      juros: estado.juros,
      salvoEm: new Date().toISOString()
    };

    var lista = [item].concat(lerSimulacoes()).slice(0, MAXIMO_SIMULACOES);
    if (!gravarSimulacoes(lista)) {
      avisarSimulacoes('Não foi possível salvar: o navegador bloqueou o armazenamento local.', 'erro');
      return;
    }

    simulacoes.nome.value = '';
    renderizarSimulacoes();
    avisarSimulacoes('Simulação "' + nome + '" salva neste navegador.', 'instrucao');
  }

  function copiarLink(botao) {
    var rotuloOriginal = botao.textContent;
    copiarTexto(linkAtual()).then(function (copiou) {
      botao.textContent = copiou ? 'Link copiado' : 'Copie da barra de endereço';
      avisarSimulacoes(
        copiou
          ? 'Link da proposta copiado. Quem abrir vê exatamente esta simulação.'
          : 'Não foi possível copiar automaticamente. O link já está na barra de endereço.',
        copiou ? 'instrucao' : 'erro'
      );
      setTimeout(function () {
        botao.textContent = rotuloOriginal;
      }, 2500);
    });
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

  function celula(texto, chave, classe) {
    var td = document.createElement('td');
    td.textContent = texto;
    td.dataset.coluna = chave;
    if (classe) {
      td.className = classe;
    }
    return td;
  }

  var CONTEUDO_TELA = {
    semana: function (linha) { return String(linha.numero); },
    vencimento: function (linha) { return formatarData(linha.vencimento); },
    saldoAnterior: function (linha) { return moeda.format(linha.saldoAnterior); },
    juros: function (linha) { return moeda.format(linha.juros); },
    multa: function (linha) { return moeda.format(linha.multa); },
    amortizacao: function (linha) { return moeda.format(linha.amortizacao); },
    pagamento: function (linha) { return moeda.format(linha.pagamento); },
    saldoRestante: function (linha) { return moeda.format(linha.saldoRestante); }
  };

  var TOTAL_TELA = {
    semana: function () { return 'Totais'; },
    vencimento: function () { return ''; },
    saldoAnterior: function () { return ''; },
    juros: function (resumo) { return moeda.format(resumo.totalJuros); },
    multa: function (resumo) { return moeda.format(resumo.totalMulta); },
    amortizacao: function (resumo) { return moeda.format(resumo.totalAmortizacao); },
    pagamento: function (resumo) { return moeda.format(resumo.totalPagar); },
    saldoRestante: function () { return moeda.format(0); }
  };

  function renderizarCabecalho() {
    saidas.cabecalhoParcelas.innerHTML = '';
    Tabela.COLUNAS.forEach(function (coluna) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = coluna.titulo;
      th.title = coluna.dica;
      th.dataset.coluna = coluna.chave;
      saidas.cabecalhoParcelas.appendChild(th);
    });
  }

  function renderizarParcelas(resultado) {
    var corpo = document.createDocumentFragment();

    resultado.linhas.forEach(function (linha) {
      var tr = document.createElement('tr');
      Tabela.COLUNAS.forEach(function (coluna) {
        tr.appendChild(celula(CONTEUDO_TELA[coluna.chave](linha), coluna.chave, 'numero'));
      });
      corpo.appendChild(tr);
    });

    saidas.corpoParcelas.innerHTML = '';
    saidas.corpoParcelas.appendChild(corpo);

    var rodape = document.createElement('tr');
    Tabela.COLUNAS.forEach(function (coluna) {
      rodape.appendChild(celula(
        TOTAL_TELA[coluna.chave](resultado.resumo),
        coluna.chave,
        coluna.chave === 'semana' ? '' : 'numero'
      ));
    });

    saidas.rodapeParcelas.innerHTML = '';
    saidas.rodapeParcelas.appendChild(rodape);
    saidas.mensagemParcelas.hidden = true;
    aplicarColunas();
  }

  function renderizarApresentacao(resultado) {
    var linhas = resultado.linhas.filter(function (linha) {
      return linha.pagamento > 0;
    });
    if (linhas.length === 0) {
      linhas = resultado.linhas;
    }

    apresentacao.valor.textContent = moeda.format(resultado.entradas.valor);
    apresentacao.parcelas.textContent = String(linhas.length);
    apresentacao.parcela.textContent = moeda.format(resultado.resumo.parcelaHabitual);
    apresentacao.total.textContent = moeda.format(resultado.resumo.totalPagar);
    apresentacao.juros.textContent = percentual.format(resultado.entradas.juros);
    apresentacao.taxaSemana.textContent = percentual.format(resultado.entradas.taxaTotal);

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
    saidas.multa.textContent = percentual.format(Acordo.MULTA_MENSAL);
    if (entradas.juros === '' || !isFinite(Number(entradas.juros)) || Number(entradas.juros) < 0) {
      saidas.taxaTotal.textContent = '—';
      saidas.taxaSemana.textContent = '—';
      saidas.dicaTaxaTotal.textContent = 'Informe os juros ao mês para somar com a multa de '
        + percentual.format(Acordo.MULTA_MENSAL) + '.';
      saidas.dicaTaxaSemana.textContent = 'A taxa da semana é a taxa do mês × 7 ÷ 30 dias.';
      return;
    }
    var juros = Number(entradas.juros);
    var taxaMensal = Acordo.somarTaxas(juros, Acordo.MULTA_MENSAL);
    saidas.taxaTotal.textContent = percentual.format(taxaMensal);
    saidas.taxaSemana.textContent = percentual.format(Acordo.proRataSemanal(taxaMensal));
    saidas.dicaTaxaTotal.textContent = percentual.format(juros) + ' de juros + '
      + percentual.format(Acordo.MULTA_MENSAL) + ' de multa = ' + percentual.format(taxaMensal);
    saidas.dicaTaxaSemana.textContent = percentual.format(taxaMensal) + ' ao mês × 7 ÷ 30 dias = '
      + percentual.format(Acordo.proRataSemanal(taxaMensal)) + ' por semana';
  }

  function recalcular() {
    var entradas = lerEntradas();
    atualizarTaxas(entradas);
    sincronizarLink();

    var resultado = Acordo.calcular(entradas);

    if (!resultado.ok) {
      ultimoResultado = null;
      apresentacao.abrir.disabled = true;
      simulacoes.copiar.disabled = true;
      saidas.copiarTabela.disabled = true;
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
    simulacoes.copiar.disabled = false;
    saidas.copiarTabela.disabled = false;
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

  saidas.copiarTabela.addEventListener('click', copiarTabela);
  simulacoes.salvar.addEventListener('click', salvarSimulacao);
  simulacoes.nome.addEventListener('keydown', function (evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      salvarSimulacao();
    }
  });
  simulacoes.copiar.addEventListener('click', function () {
    copiarLink(simulacoes.copiar);
  });
  apresentacao.copiar.addEventListener('click', function () {
    copiarLink(apresentacao.copiar);
  });

  window.addEventListener('hashchange', function () {
    var estado = Proposta.decodificarEstado(window.location.hash);
    if (estado) {
      aplicarEstado(estado);
      recalcular();
    }
  });

  document.addEventListener('keydown', function (evento) {
    if (evento.key === 'Escape' && !apresentacao.painel.hidden) {
      fecharApresentacao();
    }
  });

  configurarPreferencia('tema', 'acordo:tema', 'claro');

  var estadoDaUrl = Proposta.decodificarEstado(window.location.href);
  if (estadoDaUrl) {
    aplicarEstado(estadoDaUrl);
  }

  renderizarCabecalho();
  renderizarSeletorColunas();
  aplicarColunas();
  renderizarSimulacoes();
  recalcular();

  if (estadoDaUrl) {
    avisarSimulacoes('Simulação carregada a partir do link compartilhado.', 'instrucao');
  }
})();
