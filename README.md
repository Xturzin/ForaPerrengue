<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=8E5CFF,C9AFFF&height=200&section=header&text=Fora%20Perrengue&fontSize=52&fontColor=F6F3FF&animation=twinkling&fontAlignY=38&desc=controle%20financeiro%20pessoal&descAlignY=62&descSize=18&descColor=C9AFFF" width="100%"/>
</p>

<p align="center">
  <img src="https://readme-typing-svg.demolab.com?font=Sora&weight=600&size=20&duration=3000&pause=800&color=A076FF&center=true&vCenter=true&repeat=true&width=520&lines=controle+financeiro+pessoal;saldo+em+tempo+real;chega+de+susto+no+fim+do+m%C3%AAs;seus+gastos%2C+finalmente+no+lugar" alt="Typing animation"/>
</p>

<p align="center">
  <a href="https://test-perrengue.vercel.app">
    <img src="https://img.shields.io/badge/Acessar_o_Site-A076FF?style=for-the-badge&logo=vercel&logoColor=white" alt="Acessar o Site"/>
  </a>
</p>

<br>

## Demo

<p align="center">
  <img src="assets/demo/00_showcase_completo.gif" alt="Demonstração do Fora Perrengue" width="100%"/>
</p>

<br>

## Visão Geral

O Fora Perrengue começou como trabalho de faculdade com uma restrição simples: construir um site usando apenas HTML, CSS e JavaScript puro. Poderia ter ficado em uma landing page qualquer, mas foi crescendo até virar um app de controle financeiro pessoal real, que uso no dia a dia.

A proposta é direta: você registra seus gastos, rendas, parcelamentos e contas fixas num lugar só. O app calcula o saldo em tempo real, mostra como você está distribuindo os gastos por categoria e ainda te antecipa o que esperar do próximo mês antes que ele chegue.

Feito pra quem quer se achar financeiramente sem depender de planilha ou bloco de notas.

<br>

## Tecnologias

<p align="center">
  <a href="https://skillicons.dev">
    <img src="https://skillicons.dev/icons?i=html,css,js,supabase,vercel&theme=dark" alt="Tecnologias"/>
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Chart.js-FF6384?style=flat-square&logo=chartdotjs&logoColor=white" alt="Chart.js"/>
  &nbsp;
  <img src="https://img.shields.io/badge/jsPDF-EC1C24?style=flat-square&logoColor=white" alt="jsPDF"/>
  &nbsp;
  <img src="https://img.shields.io/badge/Lucide-1a1a2e?style=flat-square&logoColor=white" alt="Lucide"/>
</p>

<br>

## Funcionalidades

<details>
<summary><strong>Dashboard</strong></summary>
<br>

Tela principal com visão geral do mês. Exibe quatro cards no topo: saldo disponível, a receber no mês, saídas do mês e previsão do próximo mês. Esse último é clicável e abre um modal com o detalhamento de entradas e saídas previstas para o mês seguinte.

Abaixo dos cards: lista de entradas do mês, gráfico de pizza com os gastos por categoria (clicável por fatia), parcelamentos em andamento com progresso individual, recorrentes do mês e um gráfico de barras comparativo com histórico de até 12 meses.

</details>

<details>
<summary><strong>Gastos</strong></summary>
<br>

Registro de gastos com nome, valor, categoria e data. Categorias disponíveis: Alimentação, Transporte, Lazer, Contas, Saúde, Educação, Beleza, Outros e Cartão de Crédito.

Gastos no cartão funcionam de forma diferente: o valor não sai do saldo atual. Ele entra como saída no próximo mês, no dia do vencimento da fatura. Esse dia é configurado na primeira compra no cartão e fica salvo para as seguintes.

</details>

<details>
<summary><strong>Rendas</strong></summary>
<br>

Dois tipos de entrada para cobrir situações diferentes:

- **Avulsa:** valor que entrou uma única vez em um dia específico (freelance, venda, etc).
- **Regular:** renda que cai todo mês no mesmo dia, com opção de prazo determinado ou indeterminado (salário, aluguel, etc).

</details>

<details>
<summary><strong>Parceladas</strong></summary>
<br>

Cadastro de compras divididas. Você pode informar o valor total e o app divide automaticamente, ou informar direto o valor de cada parcela. Além disso, informe o número de parcelas, o mês da primeira e o dia de vencimento. Cada parcela pode ser marcada como paga conforme você for quitando.

</details>

<details>
<summary><strong>Recorrentes</strong></summary>
<br>

Pagamentos que se repetem com frequência: mensal, quinzenal ou semanal. Cada um tem um botão "Pagar" que registra o gasto e já agenda o próximo vencimento automaticamente. É possível desfazer o último pagamento se precisar corrigir alguma coisa.

</details>

<details>
<summary><strong>Lista de Desejos</strong></summary>
<br>

Planejamento de compras futuras com nome, valor estimado, data pretendida e uma observação opcional. Os itens já entram no cálculo de previsão do próximo mês exibido no Dashboard.

</details>

<details>
<summary><strong>Histórico</strong></summary>
<br>

Listagem completa de todos os gastos com filtro por categoria. Exibe também os valores recebidos, separados dos gastos. Tem opção de limpar tudo caso precise zerar o histórico.

</details>

<details>
<summary><strong>Relatório PDF</strong></summary>
<br>

Gera um PDF com os dados do mês escolhido. Você seleciona o que incluir: gastos por categoria, rendas, parceladas, recorrentes e despesas futuras. O arquivo é baixado direto pelo navegador.

</details>

<details>
<summary><strong>Perfil</strong></summary>
<br>

Edição do nome de exibição, upload de foto de perfil (salva no Supabase Storage) e alteração de senha. Exibe também a data de criação da conta.

</details>

<details>
<summary><strong>Notificações</strong></summary>
<br>

Sino no topo da tela com badge numérico. Mostra parcelas, recorrentes e fatura do cartão que vencem nos próximos 7 dias. Itens com vencimento em até 2 dias aparecem marcados como urgentes.

</details>

<details>
<summary><strong>Onboarding</strong></summary>
<br>

Tutorial de 8 slides exibido automaticamente no primeiro acesso. Apresenta cada área do app antes de o usuário começar a registrar qualquer coisa.

</details>

<br>

## Screenshots

<table>
  <tr>
    <td align="center" width="50%">
      <img src="assets/screenshots/dashboard_escuro_desktop.png" alt="Dashboard" width="100%"/>
      <br><sub>Dashboard</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/screenshots/modal_previsao.png" alt="Previsão do próximo mês" width="100%"/>
      <br><sub>Previsão do próximo mês</sub>
    </td>
  </tr>
  <tr>
    <td align="center" width="50%">
      <img src="assets/screenshots/dashboard_notif_dropdown.png" alt="Notificações de vencimento" width="100%"/>
      <br><sub>Notificações de vencimento</sub>
    </td>
    <td align="center" width="50%">
      <img src="assets/screenshots/modal_pdf.png" alt="Relatório PDF" width="100%"/>
      <br><sub>Relatório PDF</sub>
    </td>
  </tr>
</table>

<p align="center">
  <img src="assets/screenshots/dashboard_escuro_mobile.png" alt="Layout mobile" width="28%"/>
  <br><sub>Layout mobile</sub>
</p>

<br>

## Arquitetura

SPA sem bundler: três arquivos estáticos (`index.html`, `script.js`, `style.css`) servidos direto pelo Vercel. Toda a navegação acontece por troca de classes no DOM, sem roteamento de URL.

O acesso a dados passa por um objeto central chamado `DB`, que funciona como camada de abstração. Em modo autenticado, cada operação vai ao Supabase. Em modo visitante, os dados ficam em memória e somem ao recarregar a página.

As credenciais do Supabase não ficam expostas no código: são recuperadas em tempo de execução via uma serverless function (`/api/config`), que lê as variáveis de ambiente configuradas no painel do Vercel.

**Banco de dados (Supabase / PostgreSQL)**

| Tabela | Conteúdo |
|---|---|
| `perfis` | nome, username, e-mail, URL do avatar |
| `users` | preferências do usuário (tema, dia de vencimento do cartão) |
| `gastos` | gastos avulsos e de cartão |
| `rendas` | entradas avulsas e regulares |
| `parceladas` | compras parceladas com array de parcelas |
| `futuras` | despesas planejadas para o futuro |
| `recorrentes` | pagamentos recorrentes |

<br>

## Autor

<p align="center">
  <a href="https://github.com/Xturzin">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://www.linkedin.com/in/arthurcoutooliveira">
    <img src="https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white" alt="LinkedIn"/>
  </a>
  &nbsp;&nbsp;
  <a href="https://www.instagram.com/xtruzin/">
    <img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" alt="Instagram"/>
  </a>
</p>

<br>

<p align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=8E5CFF,C9AFFF&height=120&section=footer" width="100%"/>
</p>
