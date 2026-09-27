(function (global) {
  'use strict';

  var MULTA_SEMANAL = 0.02;
  var DIAS_POR_PARCELA = 7;
  var ANO_MAXIMO = 9999;

  function arredondar(valor) {
    if (!isFinite(valor)) {
      throw new RangeError('Valor nao finito no arredondamento');
    }
    var escalado = valor * 100;
    var corrigido = Math.round(escalado * 1e6) / 1e6;
    var sinal = corrigido < 0 ? -1 : 1;
    return (sinal * Math.round(Math.abs(corrigido))) / 100;
  }

  function somarTaxas(a, b) {
    return Math.round((a + b) * 1e10) / 1e10;
  }

  function temNoMaximoDuasCasas(valor) {
    return Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6;
  }

  function parcelaHabitual(valor, parcelas, taxaTotal) {
    if (valor === 0) {
      return 0;
    }
    if (taxaTotal === 0) {
      return arredondar(valor / parcelas);
    }
    var fator = (1 - Math.pow(1 + taxaTotal, -parcelas)) / taxaTotal;
    return arredondar(valor / (fator * (1 + taxaTotal)));
  }

  function somarDias(data, dias) {
    var nova = new Date(data.getTime());
    nova.setDate(nova.getDate() + dias);
    return nova;
  }

  function validar(entradas) {
    var erros = [];
    var vazios = [];

    ['valor', 'data', 'parcelas', 'juros'].forEach(function (campo) {
      var bruto = entradas[campo];
      if (bruto === null || bruto === undefined || bruto === '') {
        vazios.push(campo);
      }
    });

    if (vazios.length > 0) {
      return { valido: false, vazios: vazios, erros: [] };
    }

    var valor = Number(entradas.valor);
    if (!isFinite(valor)) {
      erros.push('Informe um valor original numerico.');
    } else if (valor < 0) {
      erros.push('O valor original nao pode ser negativo.');
    } else if (!temNoMaximoDuasCasas(valor)) {
      erros.push('O valor original aceita no maximo duas casas decimais.');
    }

    var data = entradas.data instanceof Date ? entradas.data : new Date(entradas.data + 'T00:00:00');
    if (isNaN(data.getTime())) {
      erros.push('Informe uma data do acordo valida.');
    }

    var parcelas = Number(entradas.parcelas);
    if (!isFinite(parcelas)) {
      erros.push('Informe uma quantidade de parcelas numerica.');
    } else if (!Number.isInteger(parcelas)) {
      erros.push('A quantidade de parcelas deve ser um numero inteiro.');
    } else if (parcelas <= 0) {
      erros.push('A quantidade de parcelas deve ser maior que zero.');
    }

    var juros = Number(entradas.juros);
    if (!isFinite(juros)) {
      erros.push('Informe uma taxa de juros numerica.');
    } else if (juros < 0) {
      erros.push('A taxa de juros nao pode ser negativa.');
    }

    if (erros.length === 0) {
      var ultima = somarDias(data, DIAS_POR_PARCELA * (parcelas - 1));
      if (isNaN(ultima.getTime()) || ultima.getFullYear() > ANO_MAXIMO) {
        erros.push('A data da ultima parcela ultrapassa o limite suportado de datas.');
      }
    }

    return { valido: erros.length === 0, vazios: [], erros: erros };
  }

  function calcular(entradas) {
    var validacao = validar(entradas);
    if (!validacao.valido) {
      return { ok: false, vazios: validacao.vazios, erros: validacao.erros };
    }

    var valor = arredondar(Number(entradas.valor));
    var parcelas = Number(entradas.parcelas);
    var juros = Number(entradas.juros);
    var multa = MULTA_SEMANAL;
    var taxaTotal = somarTaxas(juros, multa);
    var data = entradas.data instanceof Date ? entradas.data : new Date(entradas.data + 'T00:00:00');

    var habitual = parcelaHabitual(valor, parcelas, taxaTotal);

    var linhas = [];
    var saldoAnterior = valor;
    var totalJuros = 0;
    var totalMulta = 0;
    var totalAmortizacao = 0;
    var totalPagamento = 0;

    for (var k = 1; k <= parcelas; k++) {
      var jurosLinha = k === 1 ? 0 : arredondar(saldoAnterior * juros);
      var multaLinha = k === 1 ? 0 : arredondar(saldoAnterior * multa);
      var devido = arredondar(saldoAnterior + jurosLinha + multaLinha);

      var saldoRestante;
      if (k === parcelas) {
        saldoRestante = 0;
      } else {
        saldoRestante = Math.max(0, arredondar(devido - habitual));
      }

      var amortizacao = arredondar(saldoAnterior - saldoRestante);
      var pagamento = arredondar(jurosLinha + multaLinha + amortizacao);

      linhas.push({
        numero: k,
        vencimento: somarDias(data, DIAS_POR_PARCELA * (k - 1)),
        saldoAnterior: saldoAnterior,
        juros: jurosLinha,
        multa: multaLinha,
        amortizacao: amortizacao,
        pagamento: pagamento,
        saldoRestante: saldoRestante
      });

      totalJuros = arredondar(totalJuros + jurosLinha);
      totalMulta = arredondar(totalMulta + multaLinha);
      totalAmortizacao = arredondar(totalAmortizacao + amortizacao);
      totalPagamento = arredondar(totalPagamento + pagamento);

      saldoAnterior = saldoRestante;
    }

    return {
      ok: true,
      entradas: {
        valor: valor,
        parcelas: parcelas,
        juros: juros,
        multa: multa,
        taxaTotal: taxaTotal,
        data: data
      },
      resumo: {
        parcelaHabitual: habitual,
        ultimaParcela: linhas[linhas.length - 1].pagamento,
        totalJuros: totalJuros,
        totalMulta: totalMulta,
        totalAmortizacao: totalAmortizacao,
        totalPagar: totalPagamento
      },
      linhas: linhas
    };
  }

  global.Acordo = {
    MULTA_SEMANAL: MULTA_SEMANAL,
    DIAS_POR_PARCELA: DIAS_POR_PARCELA,
    arredondar: arredondar,
    somarTaxas: somarTaxas,
    parcelaHabitual: parcelaHabitual,
    somarDias: somarDias,
    validar: validar,
    calcular: calcular
  };
})(typeof window !== 'undefined' ? window : globalThis);
