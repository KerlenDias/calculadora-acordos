(function (global) {
  'use strict';

  var CAMPOS = {
    valor: 'v',
    data: 'd',
    parcelas: 'n',
    juros: 'j'
  };

  var PADROES = {
    valor: /^\d{1,12}(\.\d{1,2})?$/,
    data: /^\d{4}-\d{2}-\d{2}$/,
    parcelas: /^\d{1,3}$/,
    juros: /^\d{1,4}(\.\d{1,4})?$/
  };

  function normalizar(campo, bruto) {
    var texto = String(bruto).trim();
    if (texto === '') {
      return null;
    }
    if (campo === 'valor' || campo === 'juros') {
      texto = texto.replace(',', '.');
    }
    return PADROES[campo].test(texto) ? texto : null;
  }

  function codificarEstado(estado) {
    var origem = estado || {};
    var partes = [];
    Object.keys(CAMPOS).forEach(function (campo) {
      var bruto = origem[campo];
      if (bruto === null || bruto === undefined) {
        return;
      }
      var valor = normalizar(campo, bruto);
      if (valor !== null) {
        partes.push(CAMPOS[campo] + '=' + encodeURIComponent(valor));
      }
    });
    return partes.join('&');
  }

  // Aceita a URL inteira, so o fragmento ou so a query, com ou sem separador inicial.
  function decodificarEstado(texto) {
    if (!texto) {
      return null;
    }

    var bruto = String(texto);
    var corte = bruto.indexOf('#');
    if (corte >= 0) {
      bruto = bruto.slice(corte + 1);
    } else {
      corte = bruto.indexOf('?');
      if (corte >= 0) {
        bruto = bruto.slice(corte + 1);
      }
    }
    bruto = bruto.replace(/^[#?]/, '');
    if (bruto === '') {
      return null;
    }

    var chaves = {};
    Object.keys(CAMPOS).forEach(function (campo) {
      chaves[CAMPOS[campo]] = campo;
    });

    var estado = {};
    var encontrou = false;

    bruto.split('&').forEach(function (par) {
      if (par === '') {
        return;
      }
      var divisor = par.indexOf('=');
      if (divisor < 0) {
        return;
      }
      var chave = par.slice(0, divisor);
      var campo = chaves[chave];
      if (!campo) {
        return;
      }
      var valor;
      try {
        valor = decodeURIComponent(par.slice(divisor + 1).replace(/\+/g, ' '));
      } catch (erro) {
        void erro;
        return;
      }
      var limpo = normalizar(campo, valor);
      if (limpo !== null) {
        estado[campo] = limpo;
        encontrou = true;
      }
    });

    return encontrou ? estado : null;
  }

  function montarLink(base, estado) {
    var codificado = codificarEstado(estado);
    var endereco = String(base || '').split('#')[0];
    return codificado === '' ? endereco : endereco + '#' + codificado;
  }

  global.Proposta = {
    CAMPOS: CAMPOS,
    codificarEstado: codificarEstado,
    decodificarEstado: decodificarEstado,
    montarLink: montarLink
  };
})(typeof window !== 'undefined' ? window : globalThis);
