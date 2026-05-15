# Fora Perrengue 💸

Aplicação web de controle financeiro pessoal voltada para o contexto brasileiro. Desenvolvida sem frameworks JavaScript, com foco em clareza de uso e cobertura real do ciclo financeiro mensal, da renda ao parcelamento, passando por recorrentes, cartão de crédito e despesas planejadas.

**[Acesse o app →](https://test-perrengue.vercel.app/)**

---

## Overview

O Fora Perrengue resolve um problema bastante específico: a maioria das ferramentas de finanças pessoais trata o dinheiro de forma linear, sem considerar como os brasileiros realmente gastam: parcelamentos que chegam meses depois, faturas do cartão que impactam o mês seguinte, contas recorrentes que vencem em dias diferentes.

A aplicação modela exatamente esse comportamento. Um gasto no cartão de crédito não sai do saldo imediato; ele é registrado com data de vencimento da fatura e aparece como compromisso futuro. Parcelas são geradas automaticamente e controladas individualmente. Rendas regulares se repetem mês a mês sem precisar de reentrada manual. O resultado é um saldo disponível real, não uma soma ingênua de entradas e saídas.

Toda a lógica de negócio vive no cliente, e o Supabase funciona como backend: auth, banco de dados relacional e storage de avatares. Não há servidor de aplicação, não há build step, não há dependências de runtime além das CDNs referenciadas no HTML.

---

## Features

**Dashboard financeiro**
Quatro cards de resumo calculados em tempo real: saldo disponível (rendas recebidas menos gastos e parcelas pagas até hoje), total a receber no mês, saídas do mês corrente, e previsão do próximo mês. O card de previsão abre um modal detalhado com entradas e saídas discriminadas.

**Gastos por categoria**
Registro de gastos com oito categorias predefinidas (Alimentação, Transporte, Lazer, Contas, Saúde, Educação, Beleza, Outros) mais a categoria especial de Cartão de Crédito, que tem comportamento diferenciado. Gastos no cartão são lançados no mês de vencimento da fatura, não na data da compra.

**Gráficos interativos**
Gráfico de pizza (Chart.js) com distribuição de gastos por categoria, clicável para drill-down em cada categoria. Gráfico de barras comparativo mensal configurável de 1 a 12 meses, mostrando entradas versus saídas.

**Rendas**
Dois modelos de entrada: avulsa (ocorre uma vez em uma data específica) e regular (se repete mensalmente a partir de um mês de início, com prazo determinado ou indeterminado). Ocorrências regulares são geradas dinamicamente pela função `gerarOcorrencias`, sem duplicação no banco.

**Parcelamentos**
Compras parceladas com suporte a duas formas de entrada: valor total dividido automaticamente pelo número de parcelas, ou valor fixo por parcela. Cada parcela tem controle individual de pagamento. O dashboard exibe as parcelas do mês com status e progresso.

**Recorrentes**
Pagamentos recorrentes com frequência semanal (7 dias), quinzenal (15 dias) ou mensal, com data do próximo vencimento. Organizados por frequência na tela de gestão, com total calculado por frequência.

**Despesas futuras**
Planejamento de compras com data prevista e valor estimado. Despesas futuras com data no próximo mês já impactam a previsão financeira do dashboard.

**Notificações de vencimento**
Sistema de alertas que identifica parcelas, recorrentes e fatura do cartão vencendo nos próximos 7 dias. Itens com vencimento em até 2 dias recebem destaque visual de urgência. O badge no sino exibe a contagem de pendências.

**Exportação PDF**
Relatório financeiro mensal gerado no cliente com jsPDF e jspdf-autotable. Conteúdo configurável: gastos por categoria, gastos no cartão, entradas, parcelamentos, recorrentes e despesas futuras. O PDF inclui resumo financeiro no topo e paginação automática.

**Tema claro e escuro**
Troca de tema via toggle, com preferência salva no banco por usuário. O sistema também lê `prefers-color-scheme` para definir o tema padrão na primeira vez.

**Perfil e avatar**
Upload de foto de perfil diretamente para o Supabase Storage (bucket `avatars`, organizado por `userId`). Alteração de nome e senha pelo modal de perfil, sem sair do app.

**Onboarding**
Tour guiado de 8 slides exibido somente no primeiro acesso, apresentando cada módulo da aplicação com exemplos práticos. Controlado por flag `ja_entrou` no banco, não no localStorage.

---

## Tech Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Vanilla JavaScript (ES6+, strict mode), HTML5, CSS3 |
| Tipografia | Google Fonts (Poppins) |
| Gráficos | Chart.js (via CDN) |
| PDF | jsPDF + jspdf-autotable (via CDN) |
| Backend / Auth | Supabase (Auth, PostgreSQL, Storage) |
| Deploy | Vercel (static + serverless function) |

Sem bundler. Sem transpilador. Sem framework de componentes. O arquivo `script.js` é servido diretamente ao browser.

---

## Architecture

A aplicação é uma SPA de arquivo único com navegação baseada em visibilidade de seções, sem library de roteamento, sem history API. `showView(name)` ativa a seção correspondente e chama sua função de render específica.

A camada de dados é encapsulada no objeto `DB`, que expõe métodos assíncronos para cada entidade (`gastos`, `rendas`, `parceladas`, `futuras`, `recorrentes`) e abstrai completamente o Supabase do restante do código. Internamente, o `DB` mantém um cache em memória (`_cache`) invalidado a cada operação de escrita, reduzindo o número de round-trips ao banco em navegações repetidas entre seções.

A separação entre schema do banco e modelo da aplicação é feita por funções de mapeamento explícitas: `_gastoFromDB` converte o registro do Supabase para o shape interno; `_gastoDB` faz o caminho inverso antes de um `upsert`. Isso isola o restante do código de qualquer mudança de nomenclatura no banco.

A autenticação usa Supabase Auth com email e senha. O `username` escolhido no cadastro fica em uma tabela separada (`perfis`); no login, o app busca o email correspondente e delega a autenticação ao Supabase. A sessão é restaurada automaticamente via `getSession()` no `DOMContentLoaded`, evitando tela de login desnecessária em retornos.

O módulo de renda regular não armazena ocorrências individuais. A função `gerarOcorrencias` computa todas as datas de recebimento a partir do `mesInicio` e `diaMes`, respeitando meses com menos dias, prazo de encerramento e um limite de 5 anos. Isso mantém o banco simples e a geração determinística.

---

## Project Structure

```
ForaPerrengue/
├── index.html        # Documento único com todas as seções da SPA
├── script.js         # Lógica completa da aplicação (~2.500 linhas)
├── style.css         # Sistema visual com CSS custom properties (~840 linhas)
├── api/
│   └── config.js     # Serverless function Vercel: expõe credenciais Supabase
└── vercel.json       # Configuração de deploy (cleanUrls, sem trailing slash)
```

**`index.html`** contém a estrutura completa: tela de login (com abas login/cadastro), onboarding, todas as views da aplicação, modais e overlays. A separação entre HTML e comportamento é estrita, sem nenhum handler inline.

**`script.js`** está organizado em blocos funcionais: constantes e mapeadores no topo, objeto `DB` com acesso ao Supabase, funções de negócio (`calcSaldosSync`, `gerarOcorrencias`, `todasEntradasSync`), funções de render por seção, funções de inicialização de cada módulo, e bootstrap no `DOMContentLoaded`.

**`style.css`** usa um sistema de design tokens via CSS custom properties, com dois conjuntos de variáveis `[data-theme="dark"]` e `[data-theme="light"]`, aplicados no elemento `html`. Todas as cores da interface referenciam essas variáveis, tornando a troca de tema instantânea sem JavaScript adicional.

**`api/config.js`** é uma Vercel Serverless Function que serve as variáveis de ambiente `SUPABASE_URL` e `SUPABASE_ANON_KEY` ao frontend, evitando que fiquem expostas diretamente no código-fonte em deploys com variáveis de ambiente configuradas no dashboard.

---

## Getting Started

**Pré-requisitos:** conta no Supabase com as tabelas configuradas (ver seção de banco abaixo), conta na Vercel.

```bash
# Clone o repositório
git clone https://github.com/Xturzin/ForaPerrengue.git
cd ForaPerrengue

# Não há dependências de runtime; abra diretamente no browser
open index.html

# Ou sirva localmente com qualquer servidor estático:
npx serve .
# ou
python3 -m http.server 8080
```

Para desenvolvimento local, o Supabase URL e key estão hardcoded no topo de `script.js` (referenciando o projeto de staging). Para produção, configure as variáveis de ambiente na Vercel e o endpoint `/api/config` passa a servir as credenciais dinamicamente.

---

## Environment Variables

Configure no dashboard da Vercel em **Settings → Environment Variables**:

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase (`https://<id>.supabase.co`) |
| `SUPABASE_ANON_KEY` | Chave pública anon do projeto |

Sem essas variáveis configuradas, o endpoint `/api/config` retorna erro 500 com instruções. O frontend no estado atual usa as credenciais inline em `script.js`.

---

## Database Schema

O projeto usa as seguintes tabelas no Supabase (todas com RLS por `user_id`):

- **`perfis`**: nome, username, email, avatar_url, created_at (vinculada ao `auth.users`)
- **`gastos`**: nome, valor, categoria, subcategoria, data, ordem
- **`rendas`**: tipo (`pontual`|`regular`), nome, valor, data, dia_mes, mes_inicio, tipo_termino, mes_fim, ordem
- **`parceladas`**: nome, valor_total, valor_parcela, num_parcelas, inicio, tipo, dia_venc, parcelas (JSONB), ordem
- **`futuras`**: nome, valor_estimado, data, obs, ordem
- **`recorrentes`**: nome, valor, frequencia, proxima_data, ultimo_gasto_id, ordem
- **`users`**: dia_venc_cartao, tema, ja_entrou (preferências do usuário)

Storage bucket `avatars` com estrutura `{userId}/avatar.{ext}`, acesso público para leitura.

---

## API / Integrations

**Supabase Auth**: cadastro com email/senha, login, logout, reset de senha por email (link magic), atualização de senha com token de recovery. A recuperação é tratada via hash `#type=recovery` na URL, detectado no `DOMContentLoaded`.

**Supabase Database**: leitura e escrita via `@supabase/supabase-js` (CDN). Todas as queries filtram por `user_id` do usuário autenticado. Upserts usam `onConflict: 'id'` para garantir idempotência.

**Supabase Storage**: upload de avatar com `upsert: true` no path `{userId}/avatar.{ext}`. A URL pública é gerada com cache-busting via timestamp de query string para forçar reload após troca de foto.

**Chart.js**: instâncias gerenciadas manualmente (`pieChart`, `barChart`) destruídas e recriadas a cada re-render para evitar conflito de canvas. Cores sincronizadas com o tema ativo via CSS custom properties lidas em tempo de render.

**jsPDF + jspdf-autotable**: geração de PDF inteiramente no cliente, sem servidor. O relatório é construído iterando os dados já em memória, com paginação automática quando o cursor vertical (`y`) ultrapassa 240mm.

---

## Technical Decisions

**Sem build step.** A decisão de não usar bundler elimina toda uma categoria de problemas em um projeto pessoal: sem dependências de devtools, sem configuração de webpack/vite, sem etapa de compilação no deploy. A Vercel serve os arquivos estáticos diretamente.

**Cache em memória com invalidação por escrita.** O objeto `_cache` evita múltiplos fetches ao Supabase durante a mesma sessão. Qualquer operação de escrita chama `_cache.invalidar()`, forçando refetch na próxima leitura. É simples o suficiente para a escala do projeto e elimina problemas de dados desatualizados.

**DatePicker customizado.** O `<input type="date">` do browser varia significativamente entre plataformas, especialmente em mobile. A classe `DatePicker` constrói um calendário visual consistente com navegação por mês, suporte a `minDate`/`maxDate` e callback `onChange`. O input nativo fica oculto (`date-hidden`) e serve apenas como fonte de verdade do valor.

**Cartão de crédito como categoria especial.** Em vez de criar uma entidade separada para gastos no cartão, eles são registrados como gastos normais na categoria `cartao`, mas com data correspondente ao próximo mês no dia de vencimento da fatura. Isso simplifica a estrutura de dados e permite que a lógica de saldo trate o cartão como qualquer outro compromisso futuro.

**Rendas regulares sem materialização.** O app não persiste cada ocorrência futura de uma renda mensal. A função `gerarOcorrencias` computa as datas dinamicamente a partir de `mesInicio` e `diaMes`. Isso evita crescimento infinito da tabela `rendas` e torna qualquer ajuste (valor, prazo) retroativo sem necessidade de migração de dados.

**Mapeadores de schema explícitos.** As funções `_*FromDB` e `_*DB` criam uma fronteira clara entre o schema do Supabase e o modelo interno da aplicação. Renomear uma coluna no banco exige mudança em um único lugar.

---

## Future Improvements

**Metas de economia.** Definição de metas mensais por categoria com acompanhamento de progresso. Seria natural integrar com o gráfico de pizza existente; a legenda já tem espaço para indicadores de limite.

**Simulação financeira.** A seção de Simulação já existe no menu, com placeholder de "Em desenvolvimento". O cenário mais óbvio seria: dado o saldo atual e os compromissos registrados, qual o impacto de adicionar ou remover um gasto recorrente nos próximos N meses.

**Modo offline com sync.** Como toda a lógica já roda no cliente e os dados são relativamente pequenos, uma camada de sync com Service Worker e IndexedDB tornaria o app funcional sem conexão, sincronizando ao reconectar.

**Multimoeda / moeda configurável.** O código de formatação de moeda está centralizado em `fmt.brl()`. Parametrizar o locale e a moeda é uma mudança pontual que abre o app para usuários fora do Brasil.

**Importação de extrato.** Parsing de OFX ou CSV de extratos bancários para registro automático de gastos. Reduziria significativamente o atrito de entrada de dados para quem quer adotar o app no dia a dia.

---
