document.addEventListener("DOMContentLoaded", function (event) {
  relatorio.event.init();
});

var relatorio = {};
var CHART_INSTANCIA = undefined;
var TABELA_INSTANCIA = undefined;
var RELATORIO_ATUAL = null;

const REPORTS_CONFIG = {
  vendas_periodo: {
    id: 'vendas_periodo',
    titulo: 'Vendas por Período',
    desc: 'Análise detalhada do faturamento diário em um período específico.',
    filtros: ['data_inicio', 'data_fim', 'categoria'],
    grafico: 'line'
  },
  vendas_ticket: {
    id: 'vendas_ticket',
    titulo: 'Ticket Médio Mensal',
    desc: 'Evolução do valor médio gasto por pedido ao longo dos meses.',
    filtros: ['ano'],
    grafico: 'bar'
  },
  produtos_mais_vendidos: {
    id: 'produtos_mais_vendidos',
    titulo: 'Produtos Mais Vendidos (Curva ABC)',
    desc: 'Ranking dos itens que mais geram receita para o negócio.',
    filtros: ['data_inicio', 'data_fim'],
    grafico: 'doughnut'
  },
  produtos_inativos: {
    id: 'produtos_inativos',
    titulo: 'Produtos Sem Venda',
    desc: 'Itens do cardápio que não tiveram nenhuma saída no período.',
    filtros: ['data_inicio', 'data_fim'],
    grafico: null
  },
  pedidos_horario: {
    id: 'pedidos_horario',
    titulo: 'Pedidos por Horário',
    desc: 'Volume de pedidos distribuído pelas horas do dia.',
    filtros: ['data_inicio', 'data_fim'],
    grafico: 'bar'
  },
  pedidos_status: {
    id: 'pedidos_status',
    titulo: 'Pedidos por Status',
    desc: 'Proporção de pedidos finalizados, cancelados e em andamento.',
    filtros: ['data_inicio', 'data_fim'],
    grafico: 'doughnut'
  }
};

relatorio.event = {
  init: () => {
    app.method.validaToken();
    app.method.carregarDadosEmpresa();
    relatorio.method.carregarMenuBase();
    
    // Bind search global
    $("#txtPesquisaRelatorio").on("keyup", function() {
      let termo = $(this).val().toLowerCase();
      
      if(termo.trim() === '') {
        // Mostrar tudo (recolher accordions)
        $(".accordion-collapse").removeClass('show');
        $(".list-group-item").show();
        $(".accordion-item").show();
      } else {
        // Expandir todos os accordions para mostrar resultados
        $(".accordion-collapse").addClass('show');
        $(".list-group-item").each(function() {
          let texto = $(this).text().toLowerCase();
          let match = texto.includes(termo);
          $(this).toggle(match);
          
          // Se encontrou algum filho, mostrar o pai
          if(match) {
            $(this).closest('.accordion-item').show();
          }
        });
        
        // Esconder accordions que não tem nenhum filho visível
        $(".accordion-item").each(function() {
          let visiveis = $(this).find(".list-group-item:visible").length;
          if(visiveis === 0) {
            $(this).hide();
          }
        });
      }
    });
  }
}

let MENU_DATA = [];

relatorio.method = {
  
  // =================== MENU, FAVORITOS E RECENTES ===================
  carregarMenuBase: () => {
    app.method.loading(true);
    
    var headers = new Headers();
    headers.append("Authorization", app.method.obterValorSessao('token'));

    fetch('/relatorio/menu', { method: 'GET', headers: headers })
    .then(response => response.json())
    .then(result => {
      app.method.loading(false);
      if (result.status === 'error') {
        app.method.mensagem(result.message);
        return;
      }
      MENU_DATA = result.data.menu;
      relatorio.method.renderizarMenu(MENU_DATA);
      relatorio.method.renderizarFavoritos(result.data.favoritos);
      relatorio.method.renderizarRecentes(result.data.recentes);
    })
    .catch(error => {
      app.method.loading(false);
      console.log('error', error);
    });
  },

  renderizarMenu: (menuList) => {
    let html = '';
    menuList.forEach(modulo => {
      html += `
        <div class="accordion-item border-0 bg-transparent mb-2">
          <h2 class="accordion-header" id="heading${modulo.id}">
            <button class="accordion-button collapsed py-2 px-3 rounded shadow-sm bg-white" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${modulo.id}" style="font-size: 14px; font-weight: 600;">
              <i class="${modulo.icone} text-${modulo.cor} me-2"></i> ${modulo.titulo} 
              <span class="badge bg-light text-muted ms-auto rounded-pill">${modulo.relatorios.length}</span>
            </button>
          </h2>
          <div id="collapse${modulo.id}" class="accordion-collapse collapse" data-bs-parent="#accordionCategoriasBI">
            <div class="accordion-body p-2 pt-3">
              <div class="list-group list-group-flush">
      `;
      modulo.relatorios.forEach(rel => {
        let config = REPORTS_CONFIG[rel.id];
        let iconeStr = config ? `<i class="fas fa-chevron-right me-2" style="width: 15px; font-size: 10px;"></i>` : '';
        html += `<a href="#" class="list-group-item list-group-item-action border-0 py-2 rounded mb-1 text-muted" onclick="relatorio.method.abrirRelatorio('${rel.id}', '${modulo.titulo}')">${iconeStr} ${rel.titulo}</a>`;
      });
      html += `</div></div></div></div>`;
    });
    $("#accordionCategoriasBI").html(html);
  },

  renderizarFavoritos: (favIds) => {
    let html = '';
    window.USUARIO_FAVORITOS = favIds; // cache
    favIds.forEach(id => {
      let config = REPORTS_CONFIG[id];
      if (config) {
        html += `<a href="#" class="list-group-item list-group-item-action border-0 py-2 rounded mb-1 text-muted" onclick="relatorio.method.abrirRelatorio('${id}', 'Favoritos')"><i class="fas fa-star text-warning me-2" style="width: 15px;"></i> ${config.titulo}</a>`;
      }
    });
    if (favIds.length === 0) {
      html = '<p class="text-muted small px-3">Nenhum favorito salvo.</p>';
    }
    $("#menu-favoritos").html(html);
  },

  renderizarRecentes: (recIds) => {
    let html = '';
    recIds.forEach(id => {
      let config = REPORTS_CONFIG[id];
      if (config) {
        html += `<a href="#" class="list-group-item list-group-item-action border-0 py-2 rounded mb-1 text-muted" onclick="relatorio.method.abrirRelatorio('${id}', 'Recentes')"><i class="fas fa-history text-info me-2" style="width: 15px;"></i> ${config.titulo}</a>`;
      }
    });
    if (recIds.length === 0) {
      html = '<p class="text-muted small px-3">Nenhum relatório recente.</p>';
    }
    $("#menu-recentes").html(html);
  },

  toggleFavorito: () => {
    if (!RELATORIO_ATUAL) return;
    let id = RELATORIO_ATUAL.id;
    
    var headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", app.method.obterValorSessao('token'));

    fetch('/relatorio/favorito', { method: 'POST', headers: headers, body: JSON.stringify({ id: id }) })
    .then(response => response.json())
    .then(result => {
      if (result.status === 'success') {
        relatorio.method.renderizarFavoritos(result.data);
        let isFav = result.data.includes(id);
        if (isFav) {
          $("#btn-favoritar").removeClass('btn-outline-warning').addClass('btn-warning text-white');
        } else {
          $("#btn-favoritar").removeClass('btn-warning text-white').addClass('btn-outline-warning');
        }
      }
    });
  },

  salvarRecente: (id) => {
    var headers = new Headers();
    headers.append("Content-Type", "application/json");
    headers.append("Authorization", app.method.obterValorSessao('token'));

    fetch('/relatorio/recente', { method: 'POST', headers: headers, body: JSON.stringify({ id: id }) })
    .then(response => response.json())
    .then(result => {
      if (result.status === 'success') {
        relatorio.method.renderizarRecentes(result.data);
      }
    });
  },

  verificarFavorito: (id) => {
    let favs = JSON.parse(localStorage.getItem('bi_favoritos')) || [];
    if (favs.includes(id)) {
      $("#btn-favoritar").removeClass('btn-outline-warning').addClass('btn-warning text-white');
    } else {
      $("#btn-favoritar").removeClass('btn-warning text-white').addClass('btn-outline-warning');
    }
  },

  // =================== NAVEGAÇÃO ===================
  abrirRelatorio: (id) => {
    let config = REPORTS_CONFIG[id];
    if (!config) return;
    RELATORIO_ATUAL = config;

    // Ajustar UI
    $("#container-empty-state").addClass('hidden');
    $("#container-relatorio-ativo").removeClass('hidden');
    $("#lbl-relatorio-titulo").text(config.titulo);
    $("#lbl-relatorio-desc").text(config.desc);
    
    // Limpar estados
    $("#container-kpis").html('');
    $("#container-mini-dash").addClass('hidden');
    $("#container-grafico").addClass('hidden');
    if (CHART_INSTANCIA) {
      CHART_INSTANCIA.destroy();
      CHART_INSTANCIA = undefined;
    }
    if (TABELA_INSTANCIA) {
      TABELA_INSTANCIA.destroy();
      $('#tabela-relatorio').empty();
      TABELA_INSTANCIA = undefined;
    } else {
      $('#tabela-relatorio').empty();
    }

    relatorio.method.verificarFavorito(id);
    relatorio.method.montarFiltros(config.filtros);

    // Destaque visual no menu
    $(".list-group-item").removeClass('active bg-light font-weight-bold');
    event.currentTarget.classList.add('active', 'bg-light', 'font-weight-bold');
  },

  // =================== FILTROS ===================
  montarFiltros: (filtrosArray) => {
    let html = '';
    
    // Hoje
    let dataHoje = new Date().toISOString().split('T')[0];
    let dataTrintaDias = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];

    filtrosArray.forEach(f => {
      if (f === 'data_inicio') {
        html += `
          <div class="col-md-3 mb-2">
            <label class="form-label text-muted small font-weight-bold mb-1">Data Início</label>
            <input type="date" class="form-control form-control-sm" id="filtro_data_inicio" value="${dataTrintaDias}">
          </div>
        `;
      }
      if (f === 'data_fim') {
        html += `
          <div class="col-md-3 mb-2">
            <label class="form-label text-muted small font-weight-bold mb-1">Data Fim</label>
            <input type="date" class="form-control form-control-sm" id="filtro_data_fim" value="${dataHoje}">
          </div>
        `;
      }
      if (f === 'categoria') {
        html += `
          <div class="col-md-3 mb-2">
            <label class="form-label text-muted small font-weight-bold mb-1">Categoria</label>
            <select class="form-select form-select-sm" id="filtro_categoria">
              <option value="0">Todas</option>
              <option value="1">Delivery</option>
              <option value="2">Retirada</option>
            </select>
          </div>
        `;
      }
      if (f === 'ano') {
        let anoAtual = new Date().getFullYear();
        html += `
          <div class="col-md-3 mb-2">
            <label class="form-label text-muted small font-weight-bold mb-1">Ano</label>
            <select class="form-select form-select-sm" id="filtro_ano">
              <option value="${anoAtual}">${anoAtual}</option>
              <option value="${anoAtual - 1}">${anoAtual - 1}</option>
            </select>
          </div>
        `;
      }
    });

    html += `
      <div class="col-md-2 mb-2">
        <button class="btn btn-warning btn-sm w-100" onclick="relatorio.method.executarRelatorio()"><i class="fas fa-play"></i> Gerar</button>
      </div>
    `;

    $("#container-filtros").html(html);
  },

  // =================== MOTOR DE EXECUÇÃO ===================
  executarRelatorio: () => {
    if (!RELATORIO_ATUAL) return;

    let payload = {
      relatorio_id: RELATORIO_ATUAL.id
    };

    // Coletar filtros
    if ($("#filtro_data_inicio").length) payload.data_inicio = $("#filtro_data_inicio").val();
    if ($("#filtro_data_fim").length) payload.data_fim = $("#filtro_data_fim").val();
    if ($("#filtro_categoria").length) payload.categoria = $("#filtro_categoria").val();
    if ($("#filtro_ano").length) payload.ano = $("#filtro_ano").val();

    // Validações
    if (payload.data_inicio && payload.data_fim && new Date(payload.data_inicio) > new Date(payload.data_fim)) {
      app.method.mensagem("A data inicial não pode ser maior que a final.");
      return;
    }

    app.method.loading(true);
    app.method.post('/relatorio/gerar', JSON.stringify(payload),
      (response) => {
        app.method.loading(false);
        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }
        relatorio.method.renderizarKPIs(response.data.kpis);
        relatorio.method.renderizarGrafico(response.data.grafico);
        relatorio.method.renderizarTabela(response.data.tabela);
      },
      (error) => {
        app.method.loading(false);
        app.method.mensagem("Falha na comunicação com o servidor.");
      }
    );
  },

  // =================== RENDERIZADORES ===================
  renderizarKPIs: (kpis) => {
    if (!kpis || kpis.length === 0) {
      $("#container-mini-dash").addClass('hidden');
      return;
    }
    
    let html = '';
    kpis.forEach(kpi => {
      let cor = kpi.cor || 'primary';
      let icone = kpi.icone || 'fas fa-chart-line';
      html += `
        <div class="col-md-3">
          <div class="card border-0 shadow-sm rounded">
            <div class="card-body p-3">
              <div class="d-flex align-items-center">
                <div class="rounded-circle bg-${cor} text-white d-flex align-items-center justify-content-center me-3" style="width: 40px; height: 40px;">
                  <i class="${icone}"></i>
                </div>
                <div>
                  <p class="text-muted mb-0" style="font-size: 12px; font-weight: 600; text-transform: uppercase;">${kpi.titulo}</p>
                  <h4 class="font-weight-bold mb-0 text-dark">${kpi.valor}</h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    });
    $("#container-kpis").html(html);
    $("#container-mini-dash").removeClass('hidden');
  },

  renderizarGrafico: (graficoData) => {
    if (!graficoData || !graficoData.labels || graficoData.labels.length === 0 || !RELATORIO_ATUAL.grafico) {
      $("#container-grafico").addClass('hidden');
      return;
    }

    $("#container-grafico").removeClass('hidden');
    
    if (CHART_INSTANCIA) {
      CHART_INSTANCIA.destroy();
    }

    const ctx = document.getElementById('grafico-relatorio').getContext("2d");
    
    let chartConfig = {
      type: RELATORIO_ATUAL.grafico,
      data: {
        labels: graficoData.labels,
        datasets: [{
          label: graficoData.titulo || 'Valor',
          data: graficoData.valores,
          backgroundColor: RELATORIO_ATUAL.grafico === 'line' ? 'rgba(245, 134, 55, 0.1)' : ['#f58637', '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#6c757d'],
          borderColor: '#f58637',
          borderWidth: RELATORIO_ATUAL.grafico === 'line' ? 3 : 0,
          fill: true
        }]
      },
      options: {
        responsive: true,
        legend: { display: RELATORIO_ATUAL.grafico === 'doughnut' }
      }
    };

    CHART_INSTANCIA = new Chart(ctx, chartConfig);
  },

  renderizarTabela: (tabelaData) => {
    if (TABELA_INSTANCIA) {
      TABELA_INSTANCIA.destroy();
      $('#tabela-relatorio').empty();
    } else {
      $('#tabela-relatorio').empty();
    }

    if (!tabelaData || !tabelaData.colunas || tabelaData.linhas.length === 0) {
      $('#tabela-relatorio').html('<tbody><tr><td class="text-center p-4">Nenhum dado encontrado para o período.</td></tr></tbody>');
      return;
    }

    // Montar Header
    let thead = '<thead><tr>';
    tabelaData.colunas.forEach(col => {
      thead += `<th>${col.label}</th>`;
    });
    thead += '</tr></thead>';

    // Montar Body
    let tbody = '<tbody>';
    tabelaData.linhas.forEach(linha => {
      tbody += '<tr>';
      tabelaData.colunas.forEach(col => {
        let val = linha[col.id];
        // Formatações
        if (col.type === 'currency' && val != null) {
          val = `R$ ${parseFloat(val).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
        }
        else if (col.type === 'date' && val != null) {
          if (String(val).includes('/')) {
            // já está formatada pelo SQL (ex: 12/07/2026)
          } else {
            let d = new Date(val);
            if (!isNaN(d.getTime())) val = d.toLocaleDateString('pt-BR');
          }
        }
        
        tbody += `<td>${val ?? '-'}</td>`;
      });
      tbody += '</tr>';
    });
    tbody += '</tbody>';

    // Montar Footer
    let tfoot = '';
    if (tabelaData.totais) {
      tfoot = '<tfoot><tr>';
      tabelaData.colunas.forEach((col, idx) => {
        if (idx === 0) {
          tfoot += `<td>Total</td>`;
        } else {
          let val = tabelaData.totais[col.id] || '';
          if (col.type === 'currency' && val !== '') val = `R$ ${parseFloat(val).toLocaleString('pt-BR', {minimumFractionDigits: 2})}`;
          tfoot += `<td>${val}</td>`;
        }
      });
      tfoot += '</tr></tfoot>';
    }

    $('#tabela-relatorio').html(thead + tbody + tfoot);

    TABELA_INSTANCIA = $('#tabela-relatorio').DataTable({
      language: { url: './js/datatable.pt-BR.json' },
      pageLength: 25,
      dom: 'Bfrtipl',
      buttons: []
    });
  },

  // =================== EXPORTAÇÃO ===================
  exportarCSV: () => {
    if (!TABELA_INSTANCIA) {
      app.method.mensagem("Não há dados para exportar.");
      return;
    }
    // Uma forma simples de exportar a tabela do DOM
    let csv = [];
    let rows = document.querySelectorAll("#tabela-relatorio tr");
    
    for (let i = 0; i < rows.length; i++) {
        let row = [], cols = rows[i].querySelectorAll("td, th");
        for (let j = 0; j < cols.length; j++) 
            row.push('"' + cols[j].innerText.replace(/"/g, '""') + '"');
        csv.push(row.join(";"));
    }
    
    let csvFile = new Blob(["\ufeff" + csv.join("\n")], {type: "text/csv;charset=utf-8;"});
    let downloadLink = document.createElement("a");
    downloadLink.download = `Relatorio_${RELATORIO_ATUAL.id}_${new Date().getTime()}.csv`;
    downloadLink.href = window.URL.createObjectURL(csvFile);
    downloadLink.style.display = "none";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  },

  imprimirRelatorio: () => {
    window.print();
  }
}