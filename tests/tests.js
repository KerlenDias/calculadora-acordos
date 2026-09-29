(function () {
  'use strict';

  if (typeof window === 'undefined' && typeof require === 'function') {
    require('../src/calculadora.js');
    require('../src/proposta.js');
    require('../src/tabela.js');
  }

  var Acordo = globalThis.Acordo;
  var Proposta = globalThis.Proposta;
  var Tabela = globalThis.Tabela;
  var resultados = [];

  function teste(nome, fn) {
    try {
      fn();
      resultados.push({ nome: nome, ok: true, erro: null });
    } catch (erro) {
      resultados.push({ nome: nome, ok: false, erro: erro.message });
    }
  }

  function igual(atual, esperado, contexto) {
    if (atual !== esperado) {
      throw new Error((contexto || 'valor') + ': esperado ' + esperado + ', obtido ' + atual);
    }
  }

  function verdadeiro(condicao, contexto) {
    if (!condicao) {
      throw new Error(contexto || 'condicao falsa');
    }
  }

  function base(sobrescritas) {
    return Object.assign(
      { valor: '1000.00', data: '2026-09-27', parcelas: '8', juros: 0.12 },
      sobrescritas || {}
    );
  }

  function conciliar(resultado) {
    var somaAmort = 0;
    var somaPagamento = 0;
    var somaJuros = 0;
    var somaMulta = 0;

    resultado.linhas.forEach(function (linha) {
      igual(
        linha.pagamento,
        Acordo.arredondar(linha.juros + linha.multa + linha.amortizacao),
        'parcela ' + linha.numero + ' nao concilia'
      );
      verdadeiro(linha.pagamento >= 0, 'parcela ' + linha.numero + ' com pagamento negativo');
      verdadeiro(linha.saldoRestante >= 0, 'parcela ' + linha.numero + ' com saldo negativo');
      somaAmort = Acordo.arredondar(somaAmort + linha.amortizacao);
      somaPagamento = Acordo.arredondar(somaPagamento + linha.pagamento);
      somaJuros = Acordo.arredondar(somaJuros + linha.juros);
      somaMulta = Acordo.arredondar(somaMulta + linha.multa);
    });

    igual(somaAmort, resultado.entradas.valor, 'soma das amortizacoes');
    igual(
      somaPagamento,
      Acordo.arredondar(resultado.entradas.valor + somaJuros + somaMulta),
      'soma dos pagamentos'
    );
    igual(resultado.linhas[resultado.linhas.length - 1].saldoRestante, 0, 'saldo final');
  }

  teste('cenario base: 1000, 8 parcelas semanais, juros 12% a.m. e multa 2% a.m.', function () {
    var r = Acordo.calcular(base());
    igual(r.ok, true, 'calculo valido');
    igual(r.entradas.taxaMensal, 0.14, 'taxa total ao mes');
    igual(r.entradas.taxaTotal, 0.0326666667, 'taxa total por semana');
    igual(r.resumo.parcelaHabitual, 139.51, 'parcela habitual');
    igual(r.resumo.ultimaParcela, 139.46, 'ultima parcela');
    igual(r.resumo.totalJuros, 99.45, 'total de juros');
    igual(r.resumo.totalMulta, 16.58, 'total de multa');
    igual(r.resumo.totalPagar, 1116.03, 'total a pagar');
    r.linhas.slice(0, 7).forEach(function (linha) {
      igual(linha.pagamento, 139.51, 'parcela ' + linha.numero);
    });
    conciliar(r);
  });

  teste('taxas mensais viram fracao pro-rata de sete dias', function () {
    igual(Acordo.proRataSemanal(0.12), 0.028, 'juros de 12% ao mes');
    igual(Acordo.proRataSemanal(0.02), 0.0046666667, 'multa de 2% ao mes');
    igual(Acordo.proRataSemanal(0), 0, 'taxa zero');
    var r = Acordo.calcular(base());
    igual(r.entradas.jurosSemanal, Acordo.proRataSemanal(0.12), 'juros semanais derivados');
    igual(r.entradas.multaSemanal, Acordo.proRataSemanal(Acordo.MULTA_MENSAL), 'multa semanal derivada');
  });

  teste('primeira parcela sem juros e sem multa', function () {
    var r = Acordo.calcular(base());
    igual(r.linhas[0].juros, 0, 'juros da primeira parcela');
    igual(r.linhas[0].multa, 0, 'multa da primeira parcela');
    igual(r.linhas[0].saldoAnterior, 1000, 'saldo anterior da primeira parcela');
  });

  teste('vencimentos consecutivos com sete dias de diferenca', function () {
    var r = Acordo.calcular(base());
    igual(r.linhas[0].vencimento.getTime(), new Date('2026-09-27T00:00:00').getTime(), 'primeiro vencimento');
    for (var k = 1; k < r.linhas.length; k++) {
      var dias = (r.linhas[k].vencimento - r.linhas[k - 1].vencimento) / 86400000;
      igual(dias, 7, 'intervalo da parcela ' + (k + 1));
    }
  });

  teste('juros e multa incidem sobre o saldo anterior', function () {
    var r = Acordo.calcular(base());
    igual(
      r.linhas[1].juros,
      Acordo.arredondar(r.linhas[1].saldoAnterior * Acordo.proRataSemanal(0.12)),
      'juros da segunda parcela'
    );
    igual(
      r.linhas[1].multa,
      Acordo.arredondar(r.linhas[1].saldoAnterior * Acordo.proRataSemanal(0.02)),
      'multa da segunda parcela'
    );
    verdadeiro(r.linhas[2].saldoAnterior < r.linhas[1].saldoAnterior, 'saldo deve decrescer');
  });

  teste('uma parcela quita o valor original sem encargos', function () {
    var r = Acordo.calcular(base({ parcelas: '1' }));
    igual(r.linhas.length, 1, 'quantidade de linhas');
    igual(r.linhas[0].pagamento, 1000, 'pagamento unico');
    igual(r.resumo.totalJuros, 0, 'total de juros');
    igual(r.resumo.totalMulta, 0, 'total de multa');
    conciliar(r);
  });

  teste('juros definidos de 0% cobram apenas a multa de 2% ao mes', function () {
    var r = Acordo.calcular(base({ juros: 0 }));
    igual(r.entradas.taxaMensal, 0.02, 'taxa total ao mes');
    igual(r.entradas.taxaTotal, 0.0046666667, 'taxa total por semana');
    igual(r.resumo.totalJuros, 0, 'total de juros');
    verdadeiro(r.resumo.totalMulta > 0, 'multa deve ser cobrada');
    igual(r.linhas[0].multa, 0, 'multa da primeira parcela');
    conciliar(r);
  });

  teste('valor original zero zera encargos, pagamentos e saldo', function () {
    var r = Acordo.calcular(base({ valor: '0' }));
    igual(r.resumo.parcelaHabitual, 0, 'parcela habitual');
    igual(r.resumo.totalPagar, 0, 'total a pagar');
    r.linhas.forEach(function (linha) {
      igual(linha.pagamento, 0, 'pagamento da parcela ' + linha.numero);
      igual(linha.saldoRestante, 0, 'saldo da parcela ' + linha.numero);
    });
  });

  teste('valor com centavos concilia', function () {
    conciliar(Acordo.calcular(base({ valor: '1234.57', parcelas: '11', juros: 0.037 })));
  });

  teste('alteracao da quantidade de parcelas nao deixa residuo', function () {
    [3, 8, 12, 52].forEach(function (n) {
      var r = Acordo.calcular(base({ parcelas: String(n) }));
      igual(r.linhas.length, n, 'quantidade de linhas para ' + n + ' parcelas');
      conciliar(r);
    });
  });

  teste('alteracao da taxa de 12% para 5% ao mes recalcula as taxas', function () {
    var r = Acordo.calcular(base({ juros: 0.05 }));
    igual(r.entradas.taxaMensal, 0.07, 'taxa total ao mes');
    igual(
      r.entradas.taxaTotal,
      Acordo.somarTaxas(Acordo.proRataSemanal(0.05), Acordo.proRataSemanal(0.02)),
      'taxa total por semana'
    );
    verdadeiro(r.resumo.totalJuros > 0, 'juros cobrados');
    conciliar(r);
  });

  teste('valor pequeno com prazo longo nao gera pagamento negativo', function () {
    conciliar(Acordo.calcular(base({ valor: '0.07', parcelas: '40', juros: 0.12 })));
  });

  teste('campos vazios retornam instrucao de preenchimento', function () {
    var r = Acordo.calcular(base({ valor: '', parcelas: '' }));
    igual(r.ok, false, 'resultado deve ser invalido');
    igual(r.vazios.length, 2, 'campos vazios identificados');
    igual(r.erros.length, 0, 'sem mensagens de erro');
  });

  teste('entradas invalidas retornam mensagem especifica', function () {
    igual(Acordo.calcular(base({ valor: '-1' })).ok, false, 'valor negativo');
    igual(Acordo.calcular(base({ juros: -0.01 })).ok, false, 'juros negativos');
    igual(Acordo.calcular(base({ parcelas: '2.5' })).ok, false, 'parcelas fracionarias');
    igual(Acordo.calcular(base({ parcelas: '0' })).ok, false, 'parcelas zero');
    igual(Acordo.calcular(base({ data: '2026-13-45' })).ok, false, 'data invalida');
    igual(Acordo.calcular(base({ valor: '10.005' })).ok, false, 'mais de duas casas decimais');
    verdadeiro(Acordo.calcular(base({ valor: '-1' })).erros.length > 0, 'mensagem de erro presente');
  });

  teste('data final fora do limite suportado e rejeitada', function () {
    var r = Acordo.calcular(base({ data: '9999-01-01', parcelas: '200' }));
    igual(r.ok, false, 'resultado deve ser invalido');
    verdadeiro(r.erros.join(' ').indexOf('ultima parcela') >= 0, 'mensagem sobre a ultima parcela');
  });

  teste('link da proposta codifica e recupera o mesmo estado', function () {
    var estado = { valor: '1234.57', data: '2026-09-27', parcelas: '11', juros: '3.7' };
    var codificado = Proposta.codificarEstado(estado);
    igual(codificado, 'v=1234.57&d=2026-09-27&n=11&j=3.7', 'texto codificado');
    var lido = Proposta.decodificarEstado('https://exemplo.com/index.html#' + codificado);
    igual(lido.valor, '1234.57', 'valor');
    igual(lido.data, '2026-09-27', 'data');
    igual(lido.parcelas, '11', 'parcelas');
    igual(lido.juros, '3.7', 'juros');
  });

  teste('link aceita fragmento, query e virgula decimal', function () {
    igual(Proposta.decodificarEstado('#v=1000&n=8').parcelas, '8', 'fragmento puro');
    igual(Proposta.decodificarEstado('?v=1000&n=8').valor, '1000', 'query pura');
    igual(Proposta.decodificarEstado('v=1000&j=12,5').juros, '12.5', 'virgula decimal');
    igual(Proposta.montarLink('https://exemplo.com/a#antigo', { valor: '1000' }), 'https://exemplo.com/a#v=1000', 'link montado');
  });

  teste('link ignora entrada ausente, invalida ou desconhecida', function () {
    igual(Proposta.decodificarEstado(''), null, 'texto vazio');
    igual(Proposta.decodificarEstado('#x=1&y=2'), null, 'chaves desconhecidas');
    igual(Proposta.decodificarEstado('#v=abc'), null, 'valor nao numerico');
    igual(Proposta.decodificarEstado('#n=2.5'), null, 'parcelas fracionarias');
    igual(Proposta.decodificarEstado('#d=27/09/2026'), null, 'data fora do formato ISO');
    igual(Proposta.decodificarEstado('#v=1000&n=abc').parcelas, undefined, 'campo invalido descartado');
    igual(Proposta.codificarEstado({ valor: '', juros: null }), '', 'estado sem dados');
  });

  teste('tabela em TSV sai colavel no Excel', function () {
    var r = Acordo.calcular(base());
    var linhas = Tabela.paraTsv(r).split('\n');
    var titulos = Tabela.COLUNAS.map(function (coluna) {
      return coluna.titulo;
    });
    igual(linhas.length, 10, 'cabecalho, 8 semanas e totais');
    igual(linhas[0], titulos.join('\t'), 'cabecalho');
    igual(linhas[0].split('\t').length, 8, 'oito colunas');
    igual(linhas[1], '1\t27/09/2026\t1000,00\t0,00\t0,00\t139,51\t139,51\t860,49', 'primeira semana');
    igual(linhas[8].split('\t')[7], '0,00', 'saldo final zerado');
    igual(linhas[9], 'Totais\t\t\t99,45\t16,58\t1000,00\t1116,03\t0,00', 'linha de totais');
    verdadeiro(linhas[1].indexOf('R$') < 0, 'sem simbolo de moeda');
  });

  teste('tabela em HTML tem uma celula por coluna e escapa texto', function () {
    var r = Acordo.calcular(base({ parcelas: '3' }));
    var html = Tabela.paraHtml(r);
    igual((html.match(/<tr>/g) || []).length, 5, 'cabecalho, 3 semanas e totais');
    igual((html.match(/<th>/g) || []).length, 8, 'oito cabecalhos');
    verdadeiro(html.indexOf('<td>27/09/2026</td>') > 0, 'data na celula');
    verdadeiro(html.indexOf('&lt;') < 0 && html.indexOf('&amp;') < 0, 'nada a escapar neste caso');
    verdadeiro(html.indexOf('<table>') === 0, 'comeca com a tabela');
  });

  teste('coluna oculta nao entra na copia', function () {
    var r = Acordo.calcular(base({ parcelas: '3' }));
    var visiveis = ['semana', 'vencimento', 'pagamento'];
    var linhas = Tabela.paraTsv(r, visiveis).split('\n');
    igual(linhas[0], 'Semana\tVencimento\tPagamento', 'so as colunas escolhidas');
    var moeda = function (valor) {
      return valor.toFixed(2).replace('.', ',');
    };
    igual(linhas[1], '1\t27/09/2026\t' + moeda(r.linhas[0].pagamento), 'primeira semana reduzida');
    igual(linhas[4], 'Totais\t\t' + moeda(r.resumo.totalPagar), 'totais na coluna certa');
    linhas.forEach(function (linha) {
      igual(linha.split('\t').length, 3, 'tres colunas em toda linha');
    });

    var html = Tabela.paraHtml(r, visiveis);
    igual((html.match(/<th>/g) || []).length, 3, 'tres cabecalhos no HTML');
    verdadeiro(html.indexOf('Saldo anterior') < 0, 'coluna oculta ausente do HTML');
  });

  teste('selecao de colunas ignora chave desconhecida e mantem a ordem', function () {
    var chaves = Tabela.selecionar(['pagamento', 'inexistente', 'semana']).map(function (coluna) {
      return coluna.chave;
    });
    igual(chaves.join(','), 'semana,pagamento', 'ordem canonica sem chave invalida');
    igual(Tabela.selecionar([]).length, Tabela.COLUNAS.length, 'lista vazia volta para todas');
    igual(Tabela.selecionar(['nada']).length, Tabela.COLUNAS.length, 'so invalidas volta para todas');
    igual(Tabela.selecionar(null).length, Tabela.COLUNAS.length, 'sem argumento volta para todas');
    igual(Tabela.todasAsChaves().length, 8, 'oito colunas disponiveis');
  });

  var falhas = resultados.filter(function (r) {
    return !r.ok;
  });

  if (typeof document !== 'undefined') {
    var lista = document.getElementById('resultado');
    var resumo = document.getElementById('resumo');
    resumo.textContent = resultados.length - falhas.length + ' de ' + resultados.length + ' testes passaram';
    resumo.className = falhas.length === 0 ? 'ok' : 'falha';
    resultados.forEach(function (r) {
      var li = document.createElement('li');
      li.className = r.ok ? 'ok' : 'falha';
      li.textContent = (r.ok ? 'PASSOU — ' : 'FALHOU — ') + r.nome + (r.ok ? '' : ': ' + r.erro);
      lista.appendChild(li);
    });
  } else {
    resultados.forEach(function (r) {
      console.log((r.ok ? 'PASSOU' : 'FALHOU') + ' — ' + r.nome + (r.ok ? '' : ': ' + r.erro));
    });
    console.log(resultados.length - falhas.length + '/' + resultados.length + ' testes passaram');
    if (falhas.length > 0) {
      process.exitCode = 1;
    }
  }
})();
