# Calculadora de acordos com juros e multa

Simulador de acordo em parcelas semanais em HTML e JavaScript, sem dependências e sem build.
Juros e multa são informados **ao mês**, mas o pagamento é **semanal**: a cada parcela incide a
fração pró-rata de sete dias (`taxa ao mês × 7 ÷ 30`), sobre o saldo devedor anterior, a partir
da segunda parcela.

## Como usar

Abra `index.html` no navegador (duplo clique já funciona, não é necessário servidor).

Tudo fica em uma única tela: dados do acordo, resumo e tabela de parcelas.

1. Informe valor original, data do acordo, quantidade de parcelas semanais e juros ao mês
   — ou abra um link de proposta já preenchido.
2. A tela mostra a taxa total ao mês e a taxa efetivamente aplicada por semana.
3. O resumo traz parcela semanal habitual, última parcela e os totais separados de juros e multa.
4. A tabela mostra vencimentos, encargos, amortização e saldo restante de cada semana.
5. Qualquer alteração nas entradas recalcula a tela inteira.

### Apresentar ao cliente

O botão **Apresentar ao cliente**, no bloco de parcelas, abre uma tela limpa em cima da
calculadora com apenas o essencial: valor do acordo, quantidade de parcelas, valor da parcela,
total a pagar e a lista de datas com os valores. Fecha com **Esc** ou pelo botão Fechar, e o
botão **Imprimir ou salvar em PDF** gera a folha sem os controles da calculadora.

### Escolher as colunas

Acima da tabela, cada coluna tem um chip que a liga e desliga; passar o mouse sobre o chip (ou
sobre o cabeçalho da coluna) mostra o que ela significa. A escolha fica salva no navegador
(`localStorage`), vale para a tabela na tela **e para a cópia**, e a última coluna marcada não
pode ser desligada.

### Copiar a tabela para o Excel

O ícone de cópia ao lado do título **3. Parcelas** copia a tabela — cabeçalho, as semanas e a
linha de totais, apenas com as colunas visíveis. Ao copiar, o ícone vira um visto e aparece um
aviso com o que foi copiado (`8 linhas × 5 colunas copiadas`). Vai para a área de transferência em dois formatos: HTML (o Excel e
o Google Sheets colam como células) e TSV (editores de texto e navegadores antigos). Os valores
saem sem `R$` e com vírgula decimal, então o Excel em português os lê como número, e as datas
como `dd/mm/aaaa`.

### Link da proposta

O botão **Copiar link da proposta** (no bloco de parcelas e na tela de apresentação) copia um
endereço com a simulação inteira no fragmento: `index.html#v=1000.00&d=2026-09-27&n=8&j=12`.
Quem abrir esse link vê exatamente a mesma simulação. A barra de endereço acompanha as
entradas enquanto você digita, então copiar da barra tem o mesmo efeito. Parâmetro fora do
formato esperado é ignorado, e o valor padrão da tela permanece.

### Simulações salvas

**Salvar simulação** guarda valor, data, parcelas e juros no `localStorage` deste navegador,
com a identificação digitada (ou uma descrição automática). A lista permite **Abrir** — que
recarrega a simulação e o link — e **Excluir**. Ficam as 30 mais recentes. É armazenamento
local: não sincroniza entre máquinas nem entre navegadores; para enviar a alguém, use o link
da proposta.

### Interface

- Visual corporativo: cabeçalho navy, blocos em cartão com borda sutil, cartões de resumo com
  rótulo em caixa alta e valor tabular, tabela com cabeçalho fixo e coluna **Pagamento**
  destacada.
- Tema **Claro** (padrão) e **Escuro**, salvo no navegador (`localStorage`).
- Números alinhados à direita com dígitos de largura fixa, cabeçalho da tabela fixo na rolagem,
  foco visível e mensagens de erro anunciadas por leitor de tela (`aria-live`).

## Regras de cálculo

- A primeira parcela vence no dia do acordo e não tem juros nem multa.
- As demais vencem a cada sete dias corridos.
- Juros e multa são mensais e convertidos pró-rata para a semana:
  `jurosSemanal = juros × 7 ÷ 30` e `multaSemanal = 2% × 7 ÷ 30`.
- Taxa semanal total = `jurosSemanal + multaSemanal`. Com 12% a.m. de juros e 2% a.m. de multa,
  a semana fica em 3,2667%.
- Parcela habitual pelo sistema de parcelas iguais com pagamento antecipado
  (equivalente a `ARRED(-PGTO(i; n; V; 0; 1); 2)`, com `i` semanal).
- Juros e multa são arredondados separadamente antes da soma.
- A última parcela quita o saldo; pode diferir da parcela habitual.

## Estrutura

```
index.html            interface em tela única
styles.css            estilos e temas claro/escuro
src/calculadora.js    regras de cálculo e validação (sem DOM)
src/proposta.js       estado da simulação no link (codificar/decodificar, sem DOM)
src/tabela.js         colunas da tabela e exportação em TSV/HTML para o Excel (sem DOM)
src/app.js            entradas, renderização, tema, link e simulações salvas
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
