document.addEventListener("DOMContentLoaded", function (event) {
    app.event.init();
    app.method.validaToken();
    app.method.carregarDadosEmpresa();
    mesas.event.init();
});

var mesas = {};

mesas.event = {
    init: () => {
        mesas.method.obterMesas();
    }
}

mesas.method = {
    obterMesas: () => {
        app.method.loading(true);
        app.method.get('/mesa',
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    console.log(response.message);
                    return;
                }
                mesas.method.carregarTabela(response.data);
            },
            (error) => {
                app.method.loading(false);
                console.log('error', error)
            }
        )
    },

    carregarTabela: (lista) => {
        let html = '';
        if (lista.length === 0) {
            html = '<div class="col-12 text-center text-muted mt-4">Nenhuma mesa cadastrada.</div>';
        } else {
            lista.forEach(item => {
                let isLivre = !item.idpedidostatus;
                let isFechando = item.idpedidostatus == 7;
                
                let classeStatus = isLivre ? 'mesa-status-livre' : (isFechando ? 'mesa-status-fechando' : 'mesa-status-ocupada');
                let textoStatus = isLivre ? 'Livre' : (isFechando ? 'Conta Solicitada' : 'Ocupada');
                let corTexto = isLivre ? 'text-success' : (isFechando ? 'text-warning' : 'text-danger');
                
                let cursorStyle = isLivre ? '' : 'cursor: pointer;';
                let clickAction = isLivre ? '' : `onclick="mesas.method.abrirDetalhesMesa('${item.numero}')"`;

                html += `
                <div class="mesa-card-admin" style="${cursorStyle}" ${clickAction}>
                    <div class="mesa-numero">${item.numero}</div>
                    <div class="font-weight-bold ${corTexto} mb-2">
                        <span class="mesa-status-indicador ${classeStatus}"></span> ${textoStatus}
                    </div>
                    <div class="mesa-acoes">
                        <button class="btn btn-outline-primary" onclick='event.stopPropagation(); mesas.method.abrirModalEdicao(${JSON.stringify(item)})'><i class="fas fa-edit"></i></button>
                        <button class="btn btn-outline-danger" onclick="event.stopPropagation(); mesas.method.abrirModalRemover(${item.idmesa})"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>`;
            });
        }
        document.getElementById('lista-mesas').innerHTML = html;
    },

    abrirDetalhesMesa: (numero) => {
        app.method.loading(true);
        app.method.get('/pedido/mesa/' + numero,
            (response) => {
                app.method.loading(false);
                if (response.status === 'success') {
                    let data = response.data;
                    let cart = response.cart;
                    
                    document.getElementById('lblMesaDetalheNumero').innerText = numero;
                    
                    // Calcular tempo
                    let dataCadastro = new Date(data.datacadastro);
                    let agora = new Date();
                    let diffMs = agora - dataCadastro;
                    let diffMins = Math.floor(diffMs / 60000);
                    let tempoTexto = diffMins > 0 ? `${diffMins} minutos` : 'Agora mesmo';
                    document.getElementById('lblMesaDetalheTempo').innerText = tempoTexto;
                    document.getElementById('lblMesaDetalheTotal').innerText = `R$ ${(data.total || 0).toFixed(2).replace('.', ',')}`;

                    let htmlItens = '';
                    if (cart && cart.length > 0) {
                        cart.forEach(item => {
                            htmlItens += `
                            <div class="d-flex justify-content-between border-bottom pb-2 mb-2">
                                <div>
                                    <span class="font-weight-bold">${item.quantidade}x</span> ${item.nome}
                                </div>
                                <div class="text-muted">R$ ${(item.valor * item.quantidade).toFixed(2).replace('.', ',')}</div>
                            </div>`;
                        });
                    } else {
                        htmlItens = '<p class="text-muted text-center">Nenhum item lançado ainda.</p>';
                    }
                    
                    document.getElementById('detalheMesaItens').innerHTML = htmlItens;
                    
                    var modal = new bootstrap.Modal(document.getElementById('modalDetalhesMesa'));
                    modal.show();
                } else {
                    app.method.mensagem(response.message);
                }
            },
            (error) => {
                app.method.loading(false);
                console.log('error', error);
            }
        );
    },

    forcarFecharMesa: () => {
        let numero = document.getElementById('lblMesaDetalheNumero').innerText;
        if (!numero) return;

        app.method.loading(true);
        app.method.post('/pedido/forcar-fechar-mesa', JSON.stringify({ numero_mesa: numero }),
            (response) => {
                app.method.loading(false);
                if (response.status === 'success') {
                    app.method.mensagem(response.message, 'green');
                    var modal = bootstrap.Modal.getInstance(document.getElementById('modalDetalhesMesa'));
                    if(modal) modal.hide();
                    mesas.method.obterMesas(); // recarregar lista
                } else {
                    app.method.mensagem(response.message);
                }
            },
            (error) => {
                app.method.loading(false);
                console.log('error', error);
            }
        );
    },

    abrirModalCadastro: () => {
        document.getElementById('txtIdMesa').value = '';
        document.getElementById('txtNumero').value = '';
        document.getElementById('chkLivre').checked = true;
        document.getElementById('titleModalMesa').innerText = 'Nova Mesa';

        var modal = new bootstrap.Modal(document.getElementById('modalMesa'));
        modal.show();
    },

    abrirModalEdicao: (item) => {
        document.getElementById('txtIdMesa').value = item.idmesa;
        document.getElementById('txtNumero').value = item.numero;
        document.getElementById('chkLivre').checked = (item.status == 0);
        document.getElementById('titleModalMesa').innerText = 'Editar Mesa';

        var modal = new bootstrap.Modal(document.getElementById('modalMesa'));
        modal.show();
    },

    salvarMesa: () => {
        let idmesa = document.getElementById('txtIdMesa').value;
        let numero = document.getElementById('txtNumero').value.trim();
        let status = document.getElementById('chkLivre').checked ? 0 : 1;

        if (numero === '') {
            app.method.mensagem('Informe o número ou nome da mesa.');
            return;
        }

        let dados = {
            numero: numero,
            status: status
        };

        app.method.loading(true);
        if (idmesa) {
            dados.idmesa = idmesa;
            app.method.put('/mesa', JSON.stringify(dados),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $('#modalMesa').modal('hide');
                    mesas.method.obterMesas();
                },
                (error) => { app.method.loading(false); console.log(error); }
            );
        } else {
            app.method.post('/mesa', JSON.stringify(dados),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $('#modalMesa').modal('hide');
                    mesas.method.obterMesas();
                },
                (error) => { app.method.loading(false); console.log(error); }
            );
        }
    },

    abrirModalRemover: (idmesa) => {
        document.getElementById('txtIdMesaRemover').value = idmesa;
        var modal = new bootstrap.Modal(document.getElementById('modalRemoverMesa'));
        modal.show();
    },

    removerMesa: () => {
        let idmesa = document.getElementById('txtIdMesaRemover').value;

        app.method.loading(true);
        app.method.post('/mesa/remover', JSON.stringify({ idmesa: idmesa }),
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    app.method.mensagem(response.message);
                    return;
                }
                app.method.mensagem(response.message, 'green');
                $('#modalRemoverMesa').modal('hide');
                mesas.method.obterMesas();
            },
            (error) => { app.method.loading(false); console.log(error); }
        );
    }
}
