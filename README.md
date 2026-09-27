# Calculadora de acordos com juros e multa

Simulador de acordo em parcelas semanais em HTML e JavaScript, sem dependências e sem build.
Juros definidos pelo usuário e multa fixa de 2% incidem separadamente sobre o saldo devedor
anterior, a partir da segunda parcela, e são somados no cálculo do pagamento.

## Como usar

Abra `index.html` no navegador (duplo clique já funciona, não é necessário servidor).

Tudo fica em uma única tela: dados do acordo, resumo e tabela de parcelas.

1. Informe valor original, data do acordo, quantidade de parcelas e juros semanais.
2. O resumo traz parcela habitual, última parcela e os totais separados de juros e multa.
3. A tabela mostra vencimentos, encargos, amortização e saldo restante de cada parcela.
4. Qualquer alteração nas entradas recalcula a tela inteira.

### Apresentar ao cliente

O botão **Apresentar ao cliente**, no bloco de parcelas, abre uma tela limpa em cima da
calculadora com apenas o essencial: valor do acordo, quantidade de parcelas, valor da parcela,
total a pagar e a lista de datas com os valores. Fecha com **Esc** ou pelo botão Fechar, e o
botão **Imprimir ou salvar em PDF** gera a folha sem os controles da calculadora.

### Leitura e acessibilidade

- Tema **Claro** (padrão) e **Escuro**, com alto contraste nos dois.
- Tamanho de texto **Normal**, **Grande** e **Enorme** (20px, 24px e 29px de base).
- As duas preferências ficam salvas no navegador (`localStorage`).
- Números alinhados à direita com dígitos de largura fixa, cabeçalho da tabela fixo na rolagem,
  foco visível e mensagens de erro anunciadas por leitor de tela (`aria-live`).

## Regras de cálculo

- A primeira parcela vence no dia do acordo e não tem juros nem multa.
- As demais vencem a cada sete dias corridos.
- Taxa semanal total = juros definidos + 2% de multa.
- Parcela habitual pelo sistema de parcelas iguais com pagamento antecipado
  (equivalente a `ARRED(-PGTO(i; n; V; 0; 1); 2)`).
- Juros e multa são arredondados separadamente antes da soma.
- A última parcela quita o saldo; pode diferir da parcela habitual.

## Estrutura

```
index.html            interface em tela única
styles.css            estilos e temas claro/escuro
src/calculadora.js    regras de cálculo e validação (sem DOM)
src/app.js            entradas, renderização, tema e tamanho de texto
tests/tests.js        testes dos cenários do PRD
tests/tests.html      mesma suíte executada no navegador
```

## Testes

```bash
node tests/tests.js     # terminal
```

Ou abra `tests/tests.html` no navegador.

## Fora de escopo

Registro de pagamentos efetivos, pagamentos parciais, antecipações, renegociação,
múltiplos clientes, cobrança por atraso, notificações e avaliação jurídica das taxas.
