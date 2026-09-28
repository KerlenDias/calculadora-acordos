(function (global) {
  'use strict';

  // Sem simbolo de moeda e com virgula decimal: o Excel pt-BR le a celula como numero.
  function numero(valor) {
    return (Math.round(Number(valor) * 100) / 100).toFixed(2).replace('.', ',');
  }

  function data(valor) {
    var dia = String(valor.getDate()).padStart(2, '0');
    var mes = String(valor.getMonth() + 1).padStart(2, '0');
    return dia + '/' + mes + '/' + valor.getFullYear();
  }

  var COLUNAS = [
    {
      chave: 'semana',
      titulo: 'Semana',
      dica: 'Número da parcela, de 1 até a última semana',
      celula: function (linha) { return String(linha.numero); },
      total: function () { return 'Totais'; }
    },
    {
      chave: 'vencimento',
      titulo: 'Vencimento',
      dica: 'Data de pagamento, a cada sete dias corridos',
      celula: function (linha) { return data(linha.vencimento); },
      total: function () { return ''; }
    },
    {
      chave: 'saldoAnterior',
      titulo: 'Saldo anterior',
      dica: 'Dívida antes do pagamento da semana',
      celula: function (linha) { return numero(linha.saldoAnterior); },
      total: function () { return ''; }
    },
    {
      chave: 'juros',
      titulo: 'Juros da semana',
      dica: 'Juros pró-rata sobre o saldo anterior',
      celula: function (linha) { return numero(linha.juros); },
      total: function (resumo) { return numero(resumo.totalJuros); }
    },
    {
      chave: 'multa',
      titulo: 'Multa da semana',
      dica: 'Multa pró-rata sobre o saldo anterior',
      celula: function (linha) { return numero(linha.multa); },
      total: function (resumo) { return numero(resumo.totalMulta); }
    },
    {
      chave: 'amortizacao',
      titulo: 'Amortização',
      dica: 'Parte do pagamento que reduz a dívida',
      celula: function (linha) { return numero(linha.amortizacao); },
      total: function (resumo) { return numero(resumo.totalAmortizacao); }
    },
    {
      chave: 'pagamento',
      titulo: 'Pagamento',
      dica: 'Valor da parcela: juros + multa + amortização',
      celula: function (linha) { return numero(linha.pagamento); },
      total: function (resumo) { return numero(resumo.totalPagar); }
    },
    {
      chave: 'saldoRestante',
      titulo: 'Saldo após pagar',
      dica: 'Dívida que sobra para a semana seguinte',
      celula: function (linha) { return numero(linha.saldoRestante); },
      total: function () { return numero(0); }
    }
  ];

  function todasAsChaves() {
    return COLUNAS.map(function (coluna) {
      return coluna.chave;
    });
  }

  // Mantem a ordem canonica e descarta chave desconhecida; sem chave valida, volta tudo.
  function selecionar(chaves) {
    if (!Array.isArray(chaves)) {
      return COLUNAS.slice();
    }
    var escolhidas = COLUNAS.filter(function (coluna) {
      return chaves.indexOf(coluna.chave) >= 0;
    });
    return escolhidas.length > 0 ? escolhidas : COLUNAS.slice();
  }

  function matriz(resultado, chaves) {
    var colunas = selecionar(chaves);

    var linhas = resultado.linhas.map(function (linha) {
      return colunas.map(function (coluna) {
        return coluna.celula(linha);
      });
    });

    linhas.push(colunas.map(function (coluna) {
      return coluna.total(resultado.resumo);
    }));

    return {
      cabecalho: colunas.map(function (coluna) {
        return coluna.titulo;
      }),
      linhas: linhas
    };
  }

  function paraTsv(resultado, chaves) {
    var dados = matriz(resultado, chaves);
    return [dados.cabecalho].concat(dados.linhas).map(function (linha) {
      return linha.join('\t');
    }).join('\n');
  }

  function escapar(texto) {
    return String(texto)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function paraHtml(resultado, chaves) {
    var dados = matriz(resultado, chaves);

    var cabecalho = '<tr>' + dados.cabecalho.map(function (coluna) {
      return '<th>' + escapar(coluna) + '</th>';
    }).join('') + '</tr>';

    var corpo = dados.linhas.map(function (linha) {
      return '<tr>' + linha.map(function (celula) {
        return '<td>' + escapar(celula) + '</td>';
      }).join('') + '</tr>';
    }).join('');

    return '<table><thead>' + cabecalho + '</thead><tbody>' + corpo + '</tbody></table>';
  }

  global.Tabela = {
    COLUNAS: COLUNAS,
    todasAsChaves: todasAsChaves,
    selecionar: selecionar,
    paraTsv: paraTsv,
    paraHtml: paraHtml
  };
})(typeof window !== 'undefined' ? window : globalThis);
