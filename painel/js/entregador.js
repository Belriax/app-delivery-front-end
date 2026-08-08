document.addEventListener("DOMContentLoaded", function (event) {
    app.event.init();
    entregador.event.init();
});

var entregador = {};

entregador.pedidos = [];
entregador.abaAtual = 'disponiveis';

entregador.event = {
    init: () => {
        let token = app.method.obterValorSessao('token');
        if (!token) {
            window.location.href = '/painel/login-entregador.html';
            return;
        }

        let nome = app.method.obterValorSessao('Nome') || 'Entregador';
        document.getElementById('lblNomeEntregador').innerText = 'Olá, ' + nome;

        entregador.method.obterPedidos();

        // Atualiza a cada 30 segundos
        setInterval(() => {
            entregador.method.obterPedidos(true);
        }, 30000);
    }
}

entregador.method = {

    mudarAba: (aba, btn) => {
        document.querySelectorAll('.tab-btn').forEach(e => e.classList.remove('active'));
        btn.classList.add('active');
        entregador.abaAtual = aba;
        entregador.method.renderizarPedidos();
    },

    obterPedidos: (silencioso = false) => {
        if (!silencioso) {
            document.getElementById('lista-pedidos').innerHTML = `
                <div class="text-center mt-5">
                    <div class="spinner-border text-dark" role="status"></div>
                </div>`;
        }

        // Vamos usar a rota de Kanban para pegar os pedidos em entrega (status 4)
        app.method.get('/pedido/painel/kanban',
            (response) => {
                if (response.status == "success") {
                    // Filtra apenas Delivery (idtipoentrega = 1) e status Em Entrega (4), Pronto (3) ou Concluído (5)
                    entregador.pedidos = response.data.filter(p => p.idtipoentrega == 1 && (p.idpedidostatus == 3 || p.idpedidostatus == 4 || p.idpedidostatus == 5));
                    entregador.method.renderizarPedidos();
                }
            },
            (error) => { console.log('error', error) }
        )
    },

    renderizarPedidos: () => {
        let idEntregadorLogado = parseInt(app.method.obterValorSessao('IdUsuario'));

        // Calcular ganhos do dia
        let ganhosHoje = 0;
        let dataHoje = new Date().toLocaleDateString('pt-BR');
        entregador.pedidos.forEach(p => {
            if (p.identregador === idEntregadorLogado && p.idpedidostatus == 5) {
                let dataPedido = new Date(p.datacadastro).toLocaleDateString('pt-BR');
                if (dataPedido === dataHoje) {
                    ganhosHoje += parseFloat(p.total || 0);
                }
            }
        });
        document.getElementById('lblGanhosHoje').innerText = 'R$ ' + ganhosHoje.toFixed(2).replace('.', ',');

        let filtro = [];
        if (entregador.abaAtual === 'disponiveis') {
            // Pedidos Prontos (3) ou Em Entrega (4) mas sem entregador atribuído
            filtro = entregador.pedidos.filter(p => !p.identregador && (p.idpedidostatus == 3 || p.idpedidostatus == 4));
        } else if (entregador.abaAtual === 'minhas_rotas') {
            // Minhas rotas: Pedidos com meu ID (status 4)
            filtro = entregador.pedidos.filter(p => p.identregador === idEntregadorLogado && p.idpedidostatus == 4);
        } else {
            // Histórico: Pedidos concluídos (status 5)
            filtro = entregador.pedidos.filter(p => p.identregador === idEntregadorLogado && p.idpedidostatus == 5);
        }

        let html = '';

        if (filtro.length === 0) {
            html = `
            <div class="text-center mt-5 p-4">
                <i class="fas fa-motorcycle fa-4x text-muted mb-3" style="opacity: 0.2"></i>
                <h6 class="text-muted">Nenhum pedido encontrado.</h6>
            </div>`;
        }

        filtro.forEach(p => {
            let data = new Date(p.datacadastro);
            let hora = data.getHours().toString().padStart(2, '0') + ':' + data.getMinutes().toString().padStart(2, '0');

            let btnAcao = '';
            let btnRota = '';

            if (entregador.abaAtual === 'disponiveis') {
                btnAcao = `<button class="btn btn-aceitar btn-acao mt-3 shadow-sm" onclick="entregador.method.aceitarPedido(${p.idpedido})"><i class="fas fa-check"></i> Aceitar Corrida</button>`;
            } else if (entregador.abaAtual === 'minhas_rotas') {
                let enderecoCompleto = 'Endereco teste, 123'; // Requerer fetch completo do pedido se nao vier no kanban
                // O kanban padrao retorna formapagamento e total.
                btnRota = `
                <div class="d-flex mb-3 gap-2" style="gap: 10px;">
                    <a href="https://waze.com/ul?q=${encodeURIComponent(p.nomecliente)}" target="_blank" class="btn btn-rota btn-acao flex-fill"><i class="fab fa-waze"></i> Waze</a>
                    <a href="https://maps.google.com/?q=${encodeURIComponent(p.nomecliente)}" target="_blank" class="btn btn-rota btn-acao flex-fill"><i class="fas fa-map-marker-alt"></i> Maps</a>
                </div>`;
                btnAcao = `<button class="btn btn-finalizar btn-acao shadow-sm" onclick="entregador.method.finalizarEntrega(${p.idpedido})"><i class="fas fa-flag-checkered"></i> Confirmar Entrega</button>`;
            } else {
                // Aba histórico (Concluído)
                btnAcao = `<button class="btn btn-light btn-acao shadow-sm text-success" disabled><i class="fas fa-check-double"></i> Entrega Concluída</button>`;
            }

            html += `
            <div class="pedido-card">
                <div class="pedido-header">
                    <span class="id-pedido">#${p.idpedido.toString().padStart(4, '0')}</span>
                    <span class="tempo-pedido"><i class="far fa-clock"></i> ${hora}</span>
                </div>
                
                <div class="cliente-info">
                    <div class="cliente-nome">${p.nomecliente}</div>
                    <div class="cliente-endereco">
                        <i class="fas fa-map-pin text-danger mr-1"></i> Endereço para entrega
                    </div>
                </div>
                
                <div class="pagamento-info">
                    <div>
                        <small class="d-block text-muted">A Receber</small>
                        <strong style="font-size: 16px;">R$ ${parseFloat(p.total).toFixed(2).replace('.', ',')}</strong>
                    </div>
                    <div class="text-right">
                        <small class="d-block text-muted">Pagamento</small>
                        <strong>${p.formapagamento || 'Não info.'} ${p.troco ? '(Troco para R$ ' + p.troco + ')' : ''}</strong>
                    </div>
                </div>
                
                ${btnRota}
                ${btnAcao}
            </div>`;
        });

        document.getElementById('lista-pedidos').innerHTML = html;
    },

    aceitarPedido: (idpedido) => {
        let idEntregadorLogado = app.method.obterValorSessao('IdUsuario');

        // Chamada fictícia/adaptada - No ideal teriamos uma rota POST /pedido/atribuir-entregador
        // Como o foco é MVP, usamos atualizarStatusPedido e mandamos identregador no body se a API aceitasse
        // Vamos simular passando o status 4 (Em Entrega)
        app.method.loading(true);
        app.method.post('/pedido/mover', JSON.stringify({ idpedido: idpedido, tab: 4, identregador: idEntregadorLogado }),
            (response) => {
                app.method.loading(false);
                if (response.status == "success") {
                    app.method.mensagem('Corrida aceita!', 'green');
                    entregador.method.obterPedidos(true);

                    // Vai para "Minhas Rotas"
                    document.querySelectorAll('.tab-btn')[1].click();
                } else {
                    app.method.mensagem('Erro ao aceitar corrida.');
                }
            },
            (error) => { app.method.loading(false); console.log(error); }
        );
    },

    finalizarEntrega: (idpedido) => {
        if (!confirm('Confirmar que a entrega foi concluída e o pagamento (se houver) recebido?')) return;

        app.method.loading(true);
        app.method.post('/pedido/mover', JSON.stringify({ idpedido: idpedido, tab: 5 }),
            (response) => {
                app.method.loading(false);
                if (response.status == "success") {
                    app.method.mensagem('Entrega finalizada!', 'green');
                    entregador.method.obterPedidos(true);
                } else {
                    app.method.mensagem('Erro ao finalizar entrega.');
                }
            },
            (error) => { app.method.loading(false); console.log(error); }
        );
    },

    logout: () => {
        app.method.limparSessao();
        window.location.href = '/painel/login-entregador.html';
    }
}
