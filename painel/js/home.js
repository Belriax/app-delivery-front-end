document.addEventListener("DOMContentLoaded", function (event) {
  home.event.init();
});

var home = {};

var GRAFICO_TIPOS_ENTREGA = undefined;
var GRAFICO_VENDAS_HORA = undefined;
var GRAFICO_DIAS_SEMANA = undefined;
var GRAFICO_FORMA_PAGAMENTO = undefined;

home.event = {
  init: () => {
    app.method.validaToken();
    app.method.carregarDadosEmpresa();

    $(".title-home-page").html(
      `<b>Olá, ${app.method.obterValorSessao("Nome")}</b>`
    );

    // Primeira carga
    app.method.loading(true);
    home.method.obterDashboardCompleto(true);

    // Polling a cada 10 segundos
    setInterval(() => home.method.obterDashboardCompleto(false), 10000);
  },
};

home.method = {
  obterDashboardCompleto: (isFirstLoad) => {
    app.method.get(
      "/home/dashboard/completo",
      (response) => {
        if (isFirstLoad) app.method.loading(false);
        if (response.status === "error") {
          return;
        }
        if (response.data) {
           home.method.renderizarDashboard(response.data);
        }
      },
      (error) => {
        if (isFirstLoad) app.method.loading(false);
        console.log("error", error);
      }
    );
  },

  renderizarDashboard: (dados) => {
    // 1. Faturamento e KPIs (Totais)
    let faturamento = dados.faturamento;
    $("#lblFaturamentoHoje").text(`R$ ${parseFloat(faturamento.faturamento_hoje || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    $("#lblFaturamentoSemana").text(`R$ ${parseFloat(faturamento.faturamento_semana || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);
    $("#lblTotalPedidosHoje").text(faturamento.qtd_pedidos_hoje || 0);
    
    let ticketMedio = (faturamento.qtd_pedidos_hoje > 0) ? (faturamento.faturamento_hoje / faturamento.qtd_pedidos_hoje) : 0;
    $("#lblTicketMedio").text(`R$ ${parseFloat(ticketMedio).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`);

    // 2. Status Operacionais
    let cards = dados.cardsStatus;
    $("#lblAguardando").text(cards.aguardando || 0);
    $("#lblNaCozinha").text(cards.nacozinha || 0);
    $("#lblEntrega").text(cards.entrega || 0);

    // 3. Mesas
    let mesas = Array.isArray(dados.mesas) ? dados.mesas : [];
    let mesasLivres = 0; let mesasOcupadas = 0; let mesasFechando = 0;
    mesas.forEach(m => {
        if (!m.idpedidostatus) mesasLivres++;
        else if (m.idpedidostatus == 7) mesasFechando++;
        else mesasOcupadas++;
    });
    $("#lblMesasLivres").text(mesasLivres);
    $("#lblMesasOcupadas").text(mesasOcupadas);
    $("#lblMesasFechando").text(mesasFechando);

    // 4. Alertas Inteligentes
    let pedidos = Array.isArray(dados.pedidosAtivos) ? dados.pedidosAtivos : [];
    home.method.renderizarAlertas(pedidos);

    // 5. Pedidos em Andamento
    home.method.renderizarPedidosAndamento(pedidos);

    // 6. Top Produtos
    let topProd = Array.isArray(dados.topProdutos) ? dados.topProdutos : [];
    home.method.renderizarTopProdutos(topProd);

    // 7. Gráficos
    let tipos = Array.isArray(dados.tiposPedido) ? dados.tiposPedido : [];
    home.method.renderizarGraficoTipos(tipos);
    
    let horas = Array.isArray(dados.graficoHoras) ? dados.graficoHoras : [];
    home.method.renderizarGraficoHoras(horas);

    let dias = Array.isArray(dados.diasSemana) ? dados.diasSemana : [];
    home.method.renderizarGraficoDiasSemana(dias);

    home.method.renderizarGraficoFormaPagamento(dados.formaPagamento || {});
  },

  renderizarAlertas: (pedidos) => {
     let htmlAlertas = '';
     pedidos.forEach(p => {
        let ident = p.numero_mesa ? `Mesa ${p.numero_mesa}` : (p.tipo_pedido || 'Balcão');
        if (p.idpedidostatus == 7 && p.tempo_espera > 10) {
            htmlAlertas += `<div class="alert alert-warning mb-2 py-2" role="alert" style="animation: pulse 2s infinite;"><i class="fas fa-exclamation-triangle"></i> <b>${ident}</b> aguardando fechamento há <b class="text-danger">${p.tempo_espera} minutos</b>.</div>`;
        } else if (p.idpedidostatus >= 2 && p.idpedidostatus <= 3 && p.tempo_espera > 30) {
            htmlAlertas += `<div class="alert alert-danger mb-2 py-2" role="alert" style="animation: pulse 2s infinite;"><i class="fas fa-fire"></i> Pedido <b>#${p.idpedido} (${ident})</b> na cozinha há <b>${p.tempo_espera} minutos</b>.</div>`;
        }
     });
     $("#container-alertas-home").html(htmlAlertas);
  },

  renderizarPedidosAndamento: (pedidos) => {
     let html = '';
     if(pedidos.length === 0) {
        html = '<tr><td colspan="5" class="text-center text-muted py-3">Nenhum pedido em andamento no momento.</td></tr>';
     } else {
        pedidos.forEach(p => {
           let isCritico = (p.idpedidostatus == 7 && p.tempo_espera > 10) || (p.idpedidostatus <= 3 && p.tempo_espera > 30);
           let classEspera = isCritico ? 'text-danger font-weight-bold' : '';
           let ident = p.numero_mesa ? `Mesa ${p.numero_mesa}` : (p.tipo_pedido || 'Balcão');
           
           let badgeStatus = '';
           if (p.idpedidostatus == 7) badgeStatus = '<span class="badge bg-warning text-dark">Pgto Pendente</span>';
           else if (p.idpedidostatus == 4) badgeStatus = '<span class="badge bg-primary">Em Entrega</span>';
           else if (p.idpedidostatus == 1) badgeStatus = '<span class="badge bg-secondary">Novo</span>';
           else badgeStatus = '<span class="badge bg-info text-dark">Na Cozinha</span>';

           let hora = new Date(p.datacadastro).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

           html += `
            <tr>
              <td><b>#${p.idpedido}</b><br><small class="text-muted">${hora}</small></td>
              <td>${ident}</td>
              <td>${p.nomecliente || 'Não informado'}</td>
              <td class="text-center">${badgeStatus}</td>
              <td class="text-right ${classEspera}">${p.tempo_espera} min</td>
            </tr>
           `;
        });
     }
     $("#tbody-pedidos-andamento").html(html);
  },

  renderizarTopProdutos: (produtos) => {
     let html = '';
     if (produtos.length === 0) {
         html = '<li class="list-group-item text-center text-muted border-0">Nenhuma venda no período.</li>';
     } else {
         produtos.forEach(p => {
            html += `<li class="list-group-item d-flex justify-content-between align-items-center py-2 px-3 border-left-0 border-right-0 border-top-0" style="font-size: 13px;">
                        ${p.nome}
                        <span class="badge badge-success badge-pill">${p.total_vendido} un</span>
                     </li>`;
         });
     }
     $("#lista-top-produtos").html(html);
  },

  renderizarGraficoTipos: (tipos) => {
    if (GRAFICO_TIPOS_ENTREGA != undefined) {
      GRAFICO_TIPOS_ENTREGA.destroy();
      GRAFICO_TIPOS_ENTREGA = undefined;
    }
    
    let labels = [];
    let valores = [];
    let cores = ["#f58637", "#17a2b8", "#28a745", "#ffc107", "#dc3545"];
    
    tipos.forEach(t => {
       labels.push(t.tipo_pedido || 'Balcão');
       valores.push(t.quantidade);
    });

    if (valores.length === 0) return;

    const ctx = document.getElementById("graficoTiposPedido").getContext("2d");
    GRAFICO_TIPOS_ENTREGA = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [{ data: valores, backgroundColor: cores }],
      },
      options: {
        responsive: true,
        legend: { position: 'bottom' },
        animation: { duration: 0 } // Desativa animação p/ não piscar no polling
      }
    });
  },

  renderizarGraficoHoras: (horas) => {
    if (GRAFICO_VENDAS_HORA != undefined) {
      GRAFICO_VENDAS_HORA.destroy();
      GRAFICO_VENDAS_HORA = undefined;
    }
    
    let labels = [];
    let valores = [];
    
    horas.forEach(h => {
       labels.push(`${h.hora}h`);
       valores.push(h.faturamento);
    });

    const ctx = document.getElementById("graficoVendasHora").getContext("2d");
    GRAFICO_VENDAS_HORA = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: "Faturamento (R$)",
          data: valores,
          borderColor: "#28a745",
          backgroundColor: "rgba(40, 167, 69, 0.1)",
          fill: true
        }],
      },
      options: {
        responsive: true,
        legend: { display: false },
        animation: { duration: 0 }, // Desativa animação p/ não piscar no polling
        scales: {
            yAxes: [{ ticks: { beginAtZero: true } }]
        }
      }
    });
  },

  renderizarGraficoDiasSemana: (lista) => {
    if (GRAFICO_DIAS_SEMANA != undefined) {
      GRAFICO_DIAS_SEMANA.destroy();
      GRAFICO_DIAS_SEMANA = undefined;
    }

    var DIAS = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    if (lista.length === 0) return;

    $.each(lista, (i, e) => {
      if(e.datafinalizado) {
         let data = new Date(`${e.datafinalizado.split("T")[0]} 00:00:00`);
         DIAS[data.getDay()] += 1;
      }
    });

    let domingo = parseFloat((DIAS[0] * 100) / lista.length).toFixed(2);
    let segunda = parseFloat((DIAS[1] * 100) / lista.length).toFixed(2);
    let terca = parseFloat((DIAS[2] * 100) / lista.length).toFixed(2);
    let quarta = parseFloat((DIAS[3] * 100) / lista.length).toFixed(2);
    let quinta = parseFloat((DIAS[4] * 100) / lista.length).toFixed(2);
    let sexta = parseFloat((DIAS[5] * 100) / lista.length).toFixed(2);
    let sabado = parseFloat((DIAS[6] * 100) / lista.length).toFixed(2);

    var TITULOS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    var VALORES_PORCENTO = [domingo, segunda, terca, quarta, quinta, sexta, sabado];
    var VALORES_PEDIDOS = [DIAS[0], DIAS[1], DIAS[2], DIAS[3], DIAS[4], DIAS[5], DIAS[6]];

    const ctx = document.getElementById("graficoDiasSemana").getContext("2d");
    GRAFICO_DIAS_SEMANA = new Chart(ctx, {
      type: "bar",
      data: {
        labels: TITULOS,
        datasets: [
          {
            label: "Total de pedidos",
            data: VALORES_PEDIDOS,
            borderColor: "#e74c3c",
            backgroundColor: "rgb(133 42 0 / 10%)",
            type: "line",
            order: 1,
          },
          {
            label: "Porcentagem (%)",
            data: VALORES_PORCENTO,
            backgroundColor: "#f58637",
            order: 0,
          },
        ],
      },
      options: {
        responsive: true,
        legend: { display: false },
        animation: { duration: 0 },
        scales: {
          yAxes: [{ ticks: { callback: (value) => value + " %" }, gridLines: { display: false, drawBorder: false } }],
          xAxes: [{ gridLines: { display: false, drawBorder: false } }],
        },
      },
    });
  },

  renderizarGraficoFormaPagamento: (dadosForma) => {
    if (GRAFICO_FORMA_PAGAMENTO != undefined) {
      GRAFICO_FORMA_PAGAMENTO.destroy();
      GRAFICO_FORMA_PAGAMENTO = undefined;
    }

    if (!dadosForma || !dadosForma.total || dadosForma.total == 0) return;

    let pix = parseFloat((dadosForma.pix * 100) / dadosForma.total).toFixed(2);
    let dinheiro = parseFloat((dadosForma.dinheiro * 100) / dadosForma.total).toFixed(2);
    let credito = parseFloat((dadosForma.credito * 100) / dadosForma.total).toFixed(2);
    let debito = parseFloat((dadosForma.debito * 100) / dadosForma.total).toFixed(2);

    var TITULOS = ["Pix", "Dinheiro", "Crédito", "Débito"];
    var VALORES = [pix, dinheiro, credito, debito];

    const ctx = document.getElementById("graficoFormaPagamento").getContext("2d");
    GRAFICO_FORMA_PAGAMENTO = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: TITULOS,
        datasets: [{
          data: VALORES,
          backgroundColor: ["#f58637", "#ffda6f", "#17a2b8", "#ececec"],
        }],
      },
      options: {
        responsive: true,
        animation: { duration: 0 },
        legend: { position: 'bottom' }
      },
    });
  }
};
