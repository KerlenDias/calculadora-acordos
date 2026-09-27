(function () {
  'use strict';

  if (typeof window === 'undefined' && typeof require === 'function') {
    require('../src/calculadora.js');
  }

  var Acordo = globalThis.Acordo;
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

  teste('cenario base: 1000, 8 parcelas, juros 12% e multa 2%', function () {
    var r = Acordo.calcular(base());
    igual(r.ok, true, 'calculo valido');
    igual(r.entradas.taxaTotal, 0.14, 'taxa total');
    igual(r.resumo.parcelaHabitual, 189.1, 'parcela habitual');
    igual(r.resumo.ultimaParcela, 189.07, 'ultima parcela');
    igual(r.resumo.totalJuros, 439.51, 'total de juros');
    igual(r.resumo.totalMulta, 73.26, 'total de multa');
    igual(r.resumo.totalPagar, 1512.77, 'total a pagar');
    r.linhas.slice(0, 7).forEach(function (linha) {
      igual(linha.pagamento, 189.1, 'parcela ' + linha.numero);
    });
    conciliar(r);
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
    igual(r.linhas[1].juros, Acordo.arredondar(r.linhas[1].saldoAnterior * 0.12), 'juros da segunda parcela');
    igual(r.linhas[1].multa, Acordo.arredondar(r.linhas[1].saldoAnterior * 0.02), 'multa da segunda parcela');
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

  teste('juros definidos de 0% cobram apenas a multa de 2%', function () {
    var r = Acordo.calcular(base({ juros: 0 }));
    igual(r.entradas.taxaTotal, 0.02, 'taxa total');
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

  teste('alteracao da taxa de 12% para 5% recalcula a taxa total', function () {
    var r = Acordo.calcular(base({ juros: 0.05 }));
    igual(r.entradas.taxaTotal, 0.07, 'taxa total');
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
