document.addEventListener("DOMContentLoaded", function () {
  fidelizacao.event.init();
});

var fidelizacao = {
  cupons: [],
  clientes: [],
  pontos: {},
  cashback: {}
};

fidelizacao.event = {
  init: async () => {
    app.method.validaToken();
    app.method.carregarDadosEmpresa();

    fidelizacao.method.configurarTabsFidelizacao();
    await fidelizacao.method.carregarDadosFidelizacao();
  }
};

fidelizacao.method = {

  carregarDadosFidelizacao: () => {
    app.method.loading(true);

    app.method.get('/fidelizacao/obter-dados',
      (response) => {
        app.method.loading(false);

        if (response.status !== 'success') {
          app.method.mensagem(response.message);
          return;
        }

        fidelizacao.cupons = response.data.cupons || [];
        fidelizacao.clientes = response.data.clientes || [];
        fidelizacao.pontos = response.data.pontos || {};
        fidelizacao.cashback = response.data.cashback || {};

        fidelizacao.method.preencherConfiguracoes();
        fidelizacao.method.atualizarIndicadores();
        fidelizacao.method.renderizarCupons();
        fidelizacao.method.renderizarClientes();
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        app.method.mensagem('Falha ao carregar dados de fidelização.');
      }
    );
  },

  configurarTabsFidelizacao: () => {
    const tabs = document.querySelectorAll(".tab-fidelizacao");

    tabs.forEach(tab => {
      tab.addEventListener("click", function () {
        const tabSelecionada = this.dataset.tab;

        document.querySelectorAll(".tab-fidelizacao").forEach(item => {
          item.classList.remove("active");
        });

        document.querySelectorAll(".tab-content-fidelizacao").forEach(content => {
          content.classList.remove("active");
        });

        this.classList.add("active");

        const content = document.getElementById("tab-" + tabSelecionada);
        if (content) {
          content.classList.add("active");
        }
      });
    });
  },

  preencherConfiguracoes: () => {
    if (document.getElementById("pontosAtivo")) {
      document.getElementById("pontosAtivo").value = String(Number(fidelizacao.pontos.ativo ?? 1) === 1);
      document.getElementById("pontosPorReal").value = fidelizacao.pontos.pontosPorReal ?? 1;
      document.getElementById("validadePontos").value = fidelizacao.pontos.validade ?? 90;
      document.getElementById("pontosParaDesconto").value = fidelizacao.pontos.pontosParaDesconto ?? 100;
      document.getElementById("valorDescontoPontos").value = fidelizacao.pontos.valorDesconto ?? 10;
    }

    if (document.getElementById("cashbackAtivo")) {
      document.getElementById("cashbackAtivo").value = String(Number(fidelizacao.cashback.ativo ?? 1) === 1);
      document.getElementById("percentualCashback").value = fidelizacao.cashback.percentual ?? 5;
      document.getElementById("validadeCashback").value = fidelizacao.cashback.validade ?? 30;
    }
  },

  atualizarIndicadores: () => {
    const cuponsAtivos = fidelizacao.cupons.filter(c => Number(c.ativo) === 1).length;
    const totalPontos = fidelizacao.clientes.reduce((total, c) => total + Number(c.pontos || 0), 0);
    const totalCashback = fidelizacao.clientes.reduce((total, c) => total + Number(c.cashback || 0), 0);

    document.getElementById("lblCuponsAtivos").innerText = cuponsAtivos;
    document.getElementById("lblPontosGerados").innerText = totalPontos;
    document.getElementById("lblClientesCadastrados").innerText = fidelizacao.clientes.length;
    document.getElementById("lblCashbackGerado").innerText = "R$ " + totalCashback.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
  },

  renderizarCupons: () => {
    const container = document.getElementById("listaCupons");
    container.innerHTML = "";

    if (fidelizacao.cupons.length === 0) {
      container.innerHTML = `
        <div class="col-12">
          <div class="empty-fidelizacao">
            <i class="fas fa-ticket-alt"></i>
            <h5>Nenhum cupom cadastrado</h5>
            <p>Crie seu primeiro cupom para incentivar novas compras.</p>
          </div>
        </div>
      `;
      return;
    }

    fidelizacao.cupons.forEach((cupom) => {
      const ativo = Number(cupom.ativo) === 1;

      const valorMinimo = cupom.valorMinimo ?? cupom.valor_minimo ?? 0;
      const limite = cupom.limite ?? cupom.limite_uso ?? 0;

      const desconto = cupom.tipo === "percentual"
        ? Number(cupom.valor).toFixed(0) + "% OFF"
        : "R$ " + Number(cupom.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

      const validade = cupom.validade ? String(cupom.validade).split("T")[0] : null;

      const txtCadastrado = Number(cupom.clienteCadastrado) === 1 ? '<span class="badge bg-secondary me-1" style="font-size: 0.65rem;">Apenas cadastrados</span>' : '';
      const txtNovo = Number(cupom.clienteNovo) === 1 ? '<span class="badge bg-primary me-1" style="font-size: 0.65rem;">Somente novos clientes</span>' : '';

      container.innerHTML += `
        <div class="col-4 mb-3">
          <div class="cupom-card">

            <div class="d-flex justify-content-between align-items-start">
              <div>
                <div class="cupom-code">${cupom.codigo}</div>
                <div class="cupom-desc">${desconto}</div>
              </div>

              <span class="cupom-status ${ativo ? "status-ativo" : "status-inativo"}">
                ${ativo ? "Ativo" : "Inativo"}
              </span>
            </div>

            <div class="cupom-meta">
              <span>Mínimo R$ ${Number(valorMinimo).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
              <span>Usados ${cupom.usados || 0}/${limite}</span>
              <span>Até ${fidelizacao.method.formatarData(validade)}</span>
            </div>
            ${(txtCadastrado || txtNovo) ? `<div class="mt-2">${txtCadastrado}${txtNovo}</div>` : ''}

            <div class="cupom-actions">
              <button class="btn btn-sm btn-white" onclick="fidelizacao.method.alternarCupom(${cupom.idcupom}, ${ativo ? 1 : 0})">
                ${ativo ? "Desativar" : "Ativar"}
              </button>

              <button class="btn btn-sm btn-light" onclick="fidelizacao.method.excluirCupom(${cupom.idcupom})">
                Excluir
              </button>
            </div>

          </div>
        </div>
      `;
    });
  },

  criarCupom: () => {
    const codigo = document.getElementById("txtCodigoCupom").value.trim().toUpperCase();
    const tipo = document.getElementById("tipoCupom").value;
    const valor = Number(document.getElementById("valorCupom").value);
    const valorMinimo = Number(document.getElementById("valorMinimoCupom").value);
    const validade = document.getElementById("validadeCupom").value;
    const limite = Number(document.getElementById("limiteCupom").value) || 0;
    const clienteCadastrado = document.getElementById("clienteCadastradoCupom").checked ? 1 : 0;
    const clienteNovo = document.getElementById("clienteNovoCupom").checked ? 1 : 0;

    if (!codigo || !tipo || !valor || !validade) {
      app.method.mensagem("Preencha os campos obrigatórios do cupom.");
      return;
    }

    const cupomExistente = fidelizacao.cupons.find(c => c.codigo === codigo);

    if (cupomExistente) {
      app.method.mensagem("Já existe um cupom com esse código.");
      return;
    }

    const dados = {
      codigo,
      tipo,
      valor,
      valorMinimo,
      validade,
      limite,
      clienteCadastrado,
      clienteNovo
    };

    app.method.loading(true);

    app.method.post('/fidelizacao/criar-cupom', JSON.stringify(dados),
      async (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        fidelizacao.method.limparFormularioCupom();

        const modal = bootstrap.Modal.getInstance(document.getElementById("modalCupom"));
        if (modal) modal.hide();

        await fidelizacao.method.carregarDadosFidelizacao();

        app.method.mensagem(response.message, 'green');
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        app.method.mensagem("Erro ao criar cupom.");
      }
    );
  },

  alternarCupom: (idcupom, ativoAtual) => {
    const novoStatus = Number(ativoAtual) === 1 ? 0 : 1;

    const dados = {
      idcupom,
      ativo: novoStatus
    };

    app.method.loading(true);

    app.method.post('/fidelizacao/alterar-status-cupom', JSON.stringify(dados),
      async (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          alert(response.message);
          return;
        }

        await fidelizacao.method.carregarDadosFidelizacao();
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao alterar status do cupom.");
      }
    );
  },

  excluirCupom: (idcupom) => {
    if (!confirm("Deseja excluir este cupom?")) return;

    const dados = {
      idcupom
    };

    app.method.loading(true);

    app.method.post('/fidelizacao/excluir-cupom', JSON.stringify(dados),
      async (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          alert(response.message);
          return;
        }

        await fidelizacao.method.carregarDadosFidelizacao();
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao excluir cupom.");
      }
    );
  },

  salvarConfiguracaoPontos: () => {
    const dados = {
      ativo: document.getElementById("pontosAtivo").value === "true" ? 1 : 0,
      pontosPorReal: Number(document.getElementById("pontosPorReal").value),
      validade: Number(document.getElementById("validadePontos").value),
      pontosParaDesconto: Number(document.getElementById("pontosParaDesconto").value),
      valorDesconto: Number(document.getElementById("valorDescontoPontos").value)
    };

    console.log("DADOS PONTOS:", dados);

    app.method.loading(true);

    app.method.post('/fidelizacao/salvar-config-pontos', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          alert(response.message);
          return;
        }

        app.method.mensagem(response.message, 'green' );
        fidelizacao.method.carregarDadosFidelizacao();
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao salvar configuração de pontos.");
      }
    );
  },

  salvarConfiguracaoCashback: () => {
    const dados = {
      ativo: document.getElementById("cashbackAtivo").value === "true" ? 1 : 0,
      percentual: Number(document.getElementById("percentualCashback").value),
      validade: Number(document.getElementById("validadeCashback").value)
    };

    console.log("DADOS CASHBACK:", dados);

    app.method.loading(true);

    app.method.post('/fidelizacao/salvar-config-cashback', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        app.method.mensagem(response.message, "green");
        fidelizacao.method.carregarDadosFidelizacao();
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao salvar configuração de cashback.");
      }
    );
  },

  renderizarClientes: () => {
    const tbody = document.getElementById("listaClientes");
    tbody.innerHTML = "";

    if (fidelizacao.clientes.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">
            Nenhum cliente cadastrado.
          </td>
        </tr>
      `;
      return;
    }

    fidelizacao.clientes.forEach(cliente => {
      const ativo = Number(cliente.ativo) === 1;

      tbody.innerHTML += `
        <tr>
          <td><b>${cliente.nome}</b></td>
          <td>${cliente.telefone}</td>
          <td>${cliente.pontos || 0}</td>
          <td>R$ ${Number(cliente.cashback || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
          <td>
            <span class="badge ${ativo ? "bg-success" : "bg-danger"}">
              ${ativo ? "Ativo" : "Bloqueado"}
            </span>
          </td>
        </tr>
      `;
    });
  },

  limparFormularioCupom: () => {
    document.getElementById("txtCodigoCupom").value = "";
    document.getElementById("valorCupom").value = "";
    document.getElementById("valorMinimoCupom").value = "";
    document.getElementById("validadeCupom").value = "";
    document.getElementById("limiteCupom").value = "";
    document.getElementById("clienteCadastradoCupom").checked = true;
    document.getElementById("clienteNovoCupom").checked = false;
  },

  formatarData: (data) => {
    if (!data) return "-";

    const partes = String(data).split("-");

    if (partes.length === 3) {
      return `${partes[2]}/${partes[1]}/${partes[0]}`;
    }

    return data;
  }
};

function criarCupom() {
  fidelizacao.method.criarCupom();
}

function salvarConfiguracaoPontos() {
  fidelizacao.method.salvarConfiguracaoPontos();
}

function salvarConfiguracaoCashback() {
  fidelizacao.method.salvarConfiguracaoCashback();
}