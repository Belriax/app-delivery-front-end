document.addEventListener("DOMContentLoaded", function (event) {
    app.event.init();
    pdv.event.init();
});

var pdv = {};

pdv.carrinho = [];
pdv.produtos = [];
pdv.categorias = [];
pdv.idPedidoAtual = null;
pdv.mesasFechandoNotificadas = []; // Controle de toasts já exibidos

pdv.produtoAtual = null;
pdv.variacoes = [];
pdv.variacaoSelecionada = null;
pdv.opcionais = [];
pdv.opcionaisSelecionados = [];
pdv.validacoes = [];

pdv.template = {
    opcional: `
      <div class="container-group mb-4" data-minimo="\${minimo}" data-maximo="\${maximo}" id="opcional-\${idopcional}">
        \${obrigatorio}
        <p class="title-categoria mb-0"><b>\${titulo}</b></p>
        <span class="sub-title-categoria text-muted" style="font-size: 13px;">\${sub-titulo}</span>
        <div class="mt-2 \${containerClass}">
          \${itens}
        </div>
      </div>
    `,
    opcionalItem: `
      <div class="card card-opcionais mb-2 p-2 shadow-sm" style="cursor:pointer;" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; pdv.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})">
        <div class="d-flex align-items-center justify-content-between w-100">
          <div class="d-flex align-items-center">
            \${img}
            <div class="infos-produto-opcional ml-2">
              <p class="name mb-0 font-weight-bold" style="font-size:14px;">\${nome}</p>
              \${desc}
              <p class="price mb-0 text-success" style="font-size:13px;">\${valor}</p>
            </div>
          </div>
          <div class="checks">
            <label class="container-check mb-0" onclick="event.stopPropagation();">
              <input id="check-opcional-\${idopcionalitem}" type="checkbox" class="paiopcional-\${idopcional}" onchange="pdv.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})" />
              <span class="checkmark"></span>
            </label>
          </div>
        </div>
      </div>
    `,
    opcionalItemSimples: `
      <div class="card card-opcionais mb-2 p-2 shadow-sm" style="cursor:pointer;" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; pdv.method.selecionarOpcionalSimples('\${idopcionalitem}')">
        <div class="d-flex align-items-center justify-content-between w-100">
          <div class="d-flex align-items-center">
            \${img}
            <div class="infos-produto-opcional ml-2">
              <p class="name mb-0 font-weight-bold" style="font-size:14px;">\${nome}</p>
              \${desc}
              <p class="price mb-0 text-success" style="font-size:13px;">\${valor}</p>
            </div>
          </div>
          <div class="checks">
            <label class="container-check mb-0" onclick="event.stopPropagation();">
              <input id="check-opcional-\${idopcionalitem}" type="checkbox" onchange="pdv.method.selecionarOpcionalSimples('\${idopcionalitem}')" />
              <span class="checkmark"></span>
            </label>
          </div>
        </div>
      </div>
    `
};

pdv.event = {
    init: () => {
        pdv.method.obterMesas();
        pdv.method.obterCategorias();
        pdv.method.obterProdutos();
        pdv.method.mudarFormaPagamento();

        // Atualizar mesas silenciosamente e checar notificações a cada 10s
        setInterval(() => {
            // Checar notificações de garçom independentemente da aba atual
            pdv.method.checarNotificacoesGarcom();
            
            // Atualizar grid de mesas apenas se a aba selecionada for Mesa
            if (document.getElementById('ddlTipoPedido').value === '3') {
                pdv.method.obterMesas(true);
            }
        }, 10000);

        // Atalhos de teclado
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F2') {
                e.preventDefault();
                document.getElementById('txtBuscaProduto').focus();
            }
        });

        document.getElementById('txtBuscaProduto').addEventListener('input', function (e) {
            pdv.method.filtrarProdutos(e.target.value);
        });
    }
}

pdv.method = {

    obterCategorias: () => {
        app.method.loading(true);
        app.method.get('/categoria',
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    app.method.mensagem(response.message);
                    return;
                }
                pdv.categorias = response.data;
                pdv.method.carregarCategorias(response.data);
            },
            (error) => {
                app.method.loading(false);
                console.log('error', error)
            }
        )
    },

    carregarCategorias: (lista) => {
        let html = `<button class="btn btn-white active categoria-btn shadow-sm" onclick="pdv.method.filtrarPorCategoria(0, this)">Todos</button>`;
        lista.forEach(c => {
            html += `<button class="btn btn-white categoria-btn shadow-sm" onclick="pdv.method.filtrarPorCategoria(${c.idcategoria}, this)">${c.nome}</button>`;
        });
        document.getElementById('lista-categorias-pdv').innerHTML = html;
    },

    obterProdutos: () => {
        app.method.get('/produto',
            (response) => {
                if (response.status == "error") {
                    return;
                }
                pdv.produtos = response.data;
                pdv.method.carregarProdutos(response.data);
            },
            (error) => { console.log('error', error) }
        )
    },

    carregarProdutos: (lista) => {
        let html = '';
        if (lista.length === 0) {
            html = '<div class="col-12 text-center mt-5"><p class="text-muted">Nenhum produto encontrado.</p></div>';
        } else {
            lista.forEach(p => {
                let img = p.imagem ? `/public/images/${p.imagem}` : '/public/images/default.jpg';
                html += `
                <div class="col-3 mb-4">
                    <div class="produto-card" onclick="pdv.method.adicionarAoCarrinho(${p.idproduto})">
                        <img src="${img}" alt="${p.nome}">
                        <div>
                            <p class="mb-0 font-weight-bold" style="font-size: 14px; line-height: 1.2;">${p.nome}</p>
                            ${(p.tem_variacao > 0 && parseFloat(p.valor_min_variacao) > 0) ? `<p class="produto-preco mb-0"><span style="font-size: 11px; color: #777; font-weight: normal; display: block; margin-bottom: -2px;">A partir de</span>R$ ${(parseFloat(p.valor_min_variacao) || 0).toFixed(2).replace('.', ',')}</p>` : `<p class="produto-preco mb-0">R$ ${(parseFloat(p.valor) || 0).toFixed(2).replace('.', ',')}</p>`}
                        </div>
                    </div>
                </div>`;
            });
        }
        document.getElementById('lista-produtos-pdv').innerHTML = html;
    },

    filtrarPorCategoria: (idcategoria, btn) => {
        // Estilo dos botoes
        document.querySelectorAll('.categoria-btn').forEach(e => {
            e.classList.remove('active');
        });
        btn.classList.add('active');

        if (idcategoria === 0) {
            pdv.method.carregarProdutos(pdv.produtos);
            return;
        }

        let filtro = pdv.produtos.filter(p => p.idcategoria == idcategoria);
        pdv.method.carregarProdutos(filtro);
    },

    filtrarProdutos: (texto) => {
        texto = texto.toLowerCase();
        let filtro = pdv.produtos.filter(p => p.nome.toLowerCase().includes(texto));
        pdv.method.carregarProdutos(filtro);
    },

    mudarTipoPedido: () => {
        const tipo = document.getElementById('ddlTipoPedido').value;
        const containerMesa = document.getElementById('container-mesa');

        if (tipo === '3') { // Mesa
            containerMesa.classList.remove('d-none');
            pdv.method.obterMesas(true);

            if (!pdv.idPedidoAtual) {
                document.getElementById('ddlFormaPagamento').classList.add('d-none');
                document.getElementById('container-troco').classList.add('d-none');
                document.getElementById('btnFinalizarPedido').innerHTML = '<i class="fas fa-concierge-bell"></i> Lançar Pedido na Mesa';
            }
        } else {
            // Bug #8: limpar carrinho e estado da mesa ao sair do modo Mesa
            if (pdv.idPedidoAtual) {
                pdv.carrinho = [];
                pdv.method.atualizarCarrinho();
            }
            pdv.idPedidoAtual = null;
            containerMesa.classList.add('d-none');
            document.getElementById('txtNumeroMesa').value = '';
            document.querySelectorAll('.mesa-card-mini').forEach(e => e.classList.remove('selecionada'));
            document.getElementById('ddlFormaPagamento').classList.remove('d-none');
            document.getElementById('container-troco').classList.remove('d-none');
            document.getElementById('btnFinalizarPedido').innerHTML = '<i class="fas fa-check-circle"></i> Finalizar Pedido';
        }
    },

    obterMesas: (silencioso = false) => {
        app.method.get('/mesa',
            (response) => {
                if (response.status == "success") {
                    pdv.method.renderizarMesasPdv(response.data);
                }
            },
            (error) => { console.log('error', error) }
        )
    },

    checarNotificacoesGarcom: () => {
        app.method.get('/mesa',
            (response) => {
                if (response.status == "success") {
                    const mesas = response.data;
                    const mesasFechando = mesas.filter(m => m.idpedidostatus == 7);
                    
                    mesasFechando.forEach(mesa => {
                        if (!pdv.mesasFechandoNotificadas.includes(mesa.numero)) {
                            pdv.mesasFechandoNotificadas.push(mesa.numero);
                            
                            // Buscar detalhes do pedido para exibir no Toast
                            app.method.get('/pedido/mesa/' + mesa.numero, (resPedido) => {
                                if (resPedido.status === 'success' && resPedido.data) {
                                    pdv.method.exibirToastNotificacao(mesa.numero, resPedido.data);
                                }
                            });
                        }
                    });
                }
            },
            (error) => {}
        )
    },

    exibirToastNotificacao: (numeroMesa, pedidoDados) => {
        const idToast = `toast-mesa-${numeroMesa}-${Date.now()}`;
        const total = parseFloat(pedidoDados.total || 0).toFixed(2).replace('.', ',');
        const cliente = pedidoDados.nomecliente || 'Não informado';
        const hora = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const toastHtml = `
            <div id="${idToast}" class="toast-notificacao">
                <div class="toast-header-custom">
                    <h6><i class="fas fa-bell"></i> Mesa ${numeroMesa}</h6>
                    <small style="opacity: 0.9;">${hora}</small>
                </div>
                <div class="toast-body-custom">
                    <div class="mb-2" style="font-size: 13px;">
                        <strong>Cliente:</strong> ${cliente}<br>
                        <strong>Total:</strong> <span class="text-success font-weight-bold" style="font-size: 15px;">R$ ${total}</span>
                    </div>
                    <button class="btn btn-success btn-sm w-100 font-weight-bold shadow-sm" onclick="pdv.method.receberContaNotificacao('${numeroMesa}', '${idToast}')">
                        <i class="fas fa-check-circle mr-1"></i> Receber Conta
                    </button>
                </div>
            </div>
        `;
        
        document.getElementById('containerToastsPdv').insertAdjacentHTML('beforeend', toastHtml);
        
        // Exibir animado após um micro delay
        setTimeout(() => {
            const toastEl = document.getElementById(idToast);
            if(toastEl) toastEl.classList.add('show');
            // Toca beep se existir o audio, senão falha silenciosamente
            try { new Audio('../audio/notification.mp3').play().catch(()=>{}); } catch(e){}
        }, 100);
    },

    receberContaNotificacao: (numeroMesa, idToast) => {
        // Remove toast
        const toastEl = document.getElementById(idToast);
        if (toastEl) {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.remove(), 400);
        }
        
        // Simular clique na grade de mesas
        const elMesa = Array.from(document.querySelectorAll('.mesa-card-mini')).find(e => e.innerText.startsWith(numeroMesa));
        if (elMesa) {
            pdv.method.selecionarMesaPdv(numeroMesa, elMesa);
        } else {
            // Fallback se elemento DOM não for encontrado
            const fakeEl = document.createElement('div');
            fakeEl.className = 'mesa-card-mini fechando';
            pdv.method.selecionarMesaPdv(numeroMesa, fakeEl);
        }
    },

    renderizarMesasPdv: (lista) => {
        let html = '';
        let mesaSelecionada = document.getElementById('txtNumeroMesa').value;

        if (lista.length === 0) {
            html = '<div class="text-center w-100 text-muted" style="grid-column: 1 / -1;"><small>Nenhuma mesa cadastrada.</small></div>';
        }

        lista.forEach(m => {
            let isLivre = !m.idpedidostatus;
            let isFechando = m.idpedidostatus == 7;
            let classeStatus = isLivre ? 'livre' : (isFechando ? 'fechando' : 'ocupada');
            let iconeFechando = isFechando ? '<i class="fas fa-receipt mt-1 d-block" style="font-size: 12px;"></i>' : '';
            let classeSelecionada = (mesaSelecionada && mesaSelecionada == m.numero) ? 'selecionada' : '';
            html += `<div class="mesa-card-mini ${classeStatus} ${classeSelecionada}" onclick="pdv.method.selecionarMesaPdv('${m.numero}', this)">${m.numero} ${iconeFechando}</div>`;
        });

        document.getElementById('pdv-mesas-grid').innerHTML = html;
    },

    selecionarMesaPdv: (numero, el) => {
        document.querySelectorAll('.mesa-card-mini').forEach(e => e.classList.remove('selecionada'));
        el.classList.add('selecionada');
        document.getElementById('txtNumeroMesa').value = numero;
        pdv.idPedidoAtual = null;

        // Se a mesa estiver livre, limpa o carrinho para novo pedido
        if (el.classList.contains('livre')) {
            pdv.carrinho = [];
            pdv.method.atualizarCarrinho();
            document.getElementById('btnFinalizarPedido').innerHTML = '<i class="fas fa-concierge-bell"></i> Lançar Pedido na Mesa';
            document.getElementById('ddlFormaPagamento').classList.add('d-none');
            document.getElementById('container-troco').classList.add('d-none');
        }
        // Se a mesa estiver ocupada ou fechando, busca o pedido
        else if (el.classList.contains('ocupada') || el.classList.contains('fechando')) {
            app.method.loading(true);
            app.method.get('/pedido/mesa/' + numero,
                (response) => {
                    app.method.loading(false);
                    if (response.status === 'success') {
                        pdv.idPedidoAtual = response.data.idpedido;
                        document.getElementById('txtNomeCliente').value = response.data.nomecliente || '';

                        // Bug #5: Recria o carrinho mapeando TODOS os campos corretamente
                        pdv.carrinho = [];
                        if (response.cart && response.cart.length > 0) {
                            // Agrupa itens por idpedidoitem para consolidar opcionais
                            const grupos = response.cart.reduce((acc, item) => {
                                if (!acc[item.idpedidoitem]) {
                                    acc[item.idpedidoitem] = {
                                        guid: app.method.criarGuid(),
                                        idproduto: item.idproduto,
                                        nome: item.nome,
                                        valor: parseFloat(item.valorvariacao || item.valor || 0),
                                        quantidade: parseInt(item.quantidade, 10),
                                        observacao: item.observacao || '',
                                        nomevariacao: item.nomevariacao || null,
                                        idvariacao: item.idvariacao || null,
                                        opcionais: []
                                    };
                                }
                                if (item.idopcionalitem) {
                                    acc[item.idpedidoitem].opcionais.push({
                                        idopcionalitem: item.idopcionalitem,
                                        nomeopcional: item.nomeopcional,
                                        valoropcional: parseFloat(item.valoropcional || 0)
                                    });
                                }
                                return acc;
                            }, {});
                            pdv.carrinho = Object.values(grupos);
                        }
                        pdv.method.atualizarCarrinho();
                        document.getElementById('btnFinalizarPedido').innerHTML = '<i class="fas fa-hand-holding-usd"></i> Receber e Liberar Mesa';
                        document.getElementById('ddlFormaPagamento').classList.remove('d-none');
                        if (document.getElementById('ddlFormaPagamento').value === '1') {
                            document.getElementById('container-troco').classList.remove('d-none');
                        }
                        app.method.mensagem('Pedido da mesa carregado.', 'green');
                    } else {
                        app.method.mensagem(response.message);
                    }
                },
                (error) => {
                    app.method.loading(false);
                    console.log('error', error);
                }
            );
        }
    },

    adicionarAoCarrinho: (idproduto) => {
        let produto = pdv.produtos.find(p => p.idproduto == idproduto);
        if (!produto) return;

        pdv.produtoAtual = produto;
        pdv.variacoes = [];
        pdv.variacaoSelecionada = null;
        pdv.opcionais = [];
        pdv.opcionaisSelecionados = [];
        pdv.validacoes = [];

        app.method.loading(true);
        // Busca Variações
        app.method.get('/produto/variacoes/' + idproduto, (respVar) => {
            if (respVar.status === 'success' && respVar.data && respVar.data.length > 0) {
                pdv.variacoes = respVar.data;
            }

            // Busca Opcionais
            app.method.get('/opcional/produto/' + idproduto, (respOpc) => {
                app.method.loading(false);
                if (respOpc.status === 'success' && respOpc.data && respOpc.data.length > 0) {
                    pdv.opcionais = respOpc.data;
                }

                if (pdv.variacoes.length > 0 || pdv.opcionais.length > 0) {
                    pdv.method.abrirModalOpcionais();
                } else {
                    // Adiciona direto se não tem nada
                    let existente = pdv.carrinho.find(p => p.idproduto == idproduto && (!p.opcionais || p.opcionais.length === 0));
                    if (existente) {
                        existente.quantidade += 1;
                    } else {
                        pdv.carrinho.push({
                            guid: app.method.criarGuid(),
                            idproduto: produto.idproduto,
                            nome: produto.nome,
                            valor: produto.valor,
                            quantidade: 1,
                            opcionais: [],
                            observacao: ''
                        });
                    }
                    pdv.method.atualizarCarrinho();
                }
            }, () => { app.method.loading(false); });
        }, () => { app.method.loading(false); });
    },

    abrirModalOpcionais: () => {
        document.getElementById('lblNomeProdutoModal').innerText = pdv.produtoAtual.nome;
        document.getElementById('txtObservacaoProduto').value = '';

        let containerVar = document.getElementById('listaVariacoesModal');
        if (pdv.variacoes.length > 0) {
            containerVar.classList.remove('hidden');
            let htmlVar = `
                <div class="container-group mb-4">
                    <span class="badge badge-warning">Obrigatório</span>
                    <p class="title-categoria mb-0"><b>Opções de Tamanho/Preço</b></p>
                    <span class="sub-title-categoria text-muted" style="font-size: 13px;">Escolha 1 opção</span>
                    <div class="mt-2">
            `;
            pdv.variacoes.forEach(v => {
                let valFmt = `R$ ${parseFloat(v.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                htmlVar += `
                    <div class="card card-opcionais mb-2 p-2 shadow-sm" style="cursor:pointer;" onclick="pdv.method.selecionarVariacao('${v.idvariacao}')">
                        <div class="d-flex align-items-center justify-content-between w-100">
                            <div class="infos-produto-opcional ml-2">
                                <p class="name mb-0 font-weight-bold" style="font-size:14px;">${v.nome}</p>
                                <p class="price mb-0 text-success" style="font-size:13px;">${valFmt}</p>
                            </div>
                            <div class="checks">
                                <label class="container-check mb-0" onclick="event.stopPropagation();">
                                    <input id="check-variacao-${v.idvariacao}" type="radio" name="radio-variacao-pdv" onchange="pdv.method.selecionarVariacao('${v.idvariacao}')" />
                                    <span class="checkmark radio"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                `;
            });
            htmlVar += `</div></div>`;
            containerVar.innerHTML = htmlVar;
        } else {
            containerVar.classList.add('hidden');
            containerVar.innerHTML = '';
        }

        document.getElementById('listaOpcionaisModal').innerHTML = '';
        if (pdv.opcionais.length > 0) {
            let listaSelecao = pdv.opcionais.filter(e => e.tiposimples == 0);
            let agrupado = listaSelecao.reduce((obj, item) => {
                obj[item.idopcional] = obj[item.idopcional] || [];
                obj[item.idopcional].push(item);
                return obj;
            }, {});

            Object.entries(agrupado).forEach(e => {
                let opc = e[1];
                let minimo = opc[0].minimo;
                let maximo = opc[0].maximo;
                let obrigatorio = '';
                let subtitulo = '';

                if (minimo == maximo) {
                    subtitulo = minimo > 1 ? `Escolha ${minimo} opções` : `Escolha 1 opção`;
                    obrigatorio = `<span class="badge badge-warning" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
                    pdv.validacoes.push({ idopcional: e[0] });
                } else if (minimo < maximo) {
                    if (minimo > 0) {
                        subtitulo = `Escolha de ${minimo} até ${maximo} opções`;
                        obrigatorio = `<span class="badge badge-warning" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
                        pdv.validacoes.push({ idopcional: e[0] });
                    } else {
                        subtitulo = maximo > 1 ? `Escolha até ${maximo} opções` : `Escolha até 1 opção`;
                    }
                }

                let itensHTML = '';
                opc.forEach(element => {
                    let valor = element.valoropcional > 0 ? `+ R$ ${parseFloat(element.valoropcional).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
                    let imgHtml = element.imagem ? `<div class="card-opcionais-img" style="background-image: url('../public/images/${element.imagem}'); width: 40px; height: 40px; border-radius: 5px; background-size: cover;"></div>` : '';
                    let descHtml = element.descricao ? `<p class="desc text-muted mb-0" style="font-size: 11px;">${element.descricao}</p>` : '';

                    itensHTML += pdv.template.opcionalItem
                        .replace(/\${idopcionalitem}/g, element.idopcionalitem)
                        .replace(/\${nome}/g, element.nomeopcional)
                        .replace(/\${valor}/g, valor)
                        .replace(/\${idopcional}/g, e[0])
                        .replace(/\${img}/g, imgHtml)
                        .replace(/\${desc}/g, descHtml);
                });

                document.getElementById('listaOpcionaisModal').innerHTML += pdv.template.opcional
                    .replace(/\${idopcional}/g, e[0])
                    .replace(/\${obrigatorio}/g, obrigatorio)
                    .replace(/\${titulo}/g, opc[0].titulo)
                    .replace(/\${sub-titulo}/g, subtitulo)
                    .replace(/\${minimo}/g, minimo)
                    .replace(/\${maximo}/g, maximo)
                    .replace(/\${containerClass}/g, '')
                    .replace(/\${itens}/g, itensHTML);
            });
        }

        let listaSimples = pdv.opcionais.filter(e => e.tiposimples == 1);
        let containerSimples = document.getElementById('listaOpcionaisSimplesModal');
        containerSimples.innerHTML = '';
        if (listaSimples.length > 0) {
            containerSimples.innerHTML = '<p class="title-categoria mb-2 mt-3"><b>Adicionais</b></p>';
            listaSimples.forEach(e => {
                let valor = e.valoropcional > 0 ? `+ R$ ${parseFloat(e.valoropcional).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
                let imgHtml = e.imagem ? `<div class="card-opcionais-img" style="background-image: url('../public/images/${e.imagem}'); width: 40px; height: 40px; border-radius: 5px; background-size: cover;"></div>` : '';
                let descHtml = e.descricao ? `<p class="desc text-muted mb-0" style="font-size: 11px;">${e.descricao}</p>` : '';

                containerSimples.innerHTML += pdv.template.opcionalItemSimples
                    .replace(/\${idopcionalitem}/g, e.idopcionalitem)
                    .replace(/\${nome}/g, e.nomeopcional)
                    .replace(/\${valor}/g, valor)
                    .replace(/\${img}/g, imgHtml)
                    .replace(/\${desc}/g, descHtml);
            });
        }

        pdv.method.atualizarTotalModal();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalProdutoDetalhes')).show();
    },

    selecionarVariacao: (idvariacao) => {
        pdv.variacaoSelecionada = pdv.variacoes.find(v => v.idvariacao == idvariacao);
        document.getElementById('check-variacao-' + idvariacao).checked = true;
        pdv.method.atualizarTotalModal();
    },

    selecionarOpcional: (idopcionalitem, idopcional) => {
        let chk = document.querySelector("#check-opcional-" + idopcionalitem);
        let selecionado = chk ? chk.checked : false;
        let inputs = document.getElementsByClassName("paiopcional-" + idopcional);
        let opcional = pdv.opcionais.filter(e => e.idopcionalitem == idopcionalitem);

        if (opcional[0].minimo === opcional[0].maximo) {
            if (opcional[0].minimo > 1) {
                pdv.method.validacaoCheckOpcional(opcional, selecionado, idopcional, idopcionalitem, true);
            } else {
                pdv.method.validacaoCheckOpcionalUnico(opcional, selecionado, idopcional, idopcionalitem, inputs, true);
            }
        }
        else if (opcional[0].minimo < opcional[0].maximo) {
            if (opcional[0].minimo > 0) {
                pdv.method.validacaoCheckOpcional(opcional, selecionado, idopcional, idopcionalitem, true);
            } else {
                if (opcional[0].maximo > 0) {
                    pdv.method.validacaoCheckOpcional(opcional, selecionado, idopcional, idopcionalitem);
                } else {
                    pdv.method.validacaoCheckOpcionalUnico(opcional, selecionado, idopcional, idopcionalitem, inputs);
                }
            }
        }
    },

    selecionarOpcionalSimples: (idopcionalitem) => {
        let chk = document.querySelector("#check-opcional-" + idopcionalitem);
        let selecionado = chk ? chk.checked : false;
        let opcional = pdv.opcionais.filter(e => e.idopcionalitem == idopcionalitem)[0];

        if (selecionado) {
            if (!pdv.opcionaisSelecionados.some(e => e.idopcionalitem == opcional.idopcionalitem)) {
                pdv.opcionaisSelecionados.push(opcional);
            }
        } else {
            pdv.opcionaisSelecionados = pdv.opcionaisSelecionados.filter(e => e.idopcionalitem != opcional.idopcionalitem);
        }
        pdv.method.atualizarTotalModal();
    },

    validacaoCheckOpcional: (opcional, selecionado, idopcional, idopcionalitem, obrigatorio = false) => {
        let filtro = pdv.opcionaisSelecionados.filter(e => e.idopcional == idopcional);

        if (filtro.length >= opcional[0].maximo) {
            if (selecionado) {
                document.querySelector("#check-opcional-" + idopcionalitem).checked = false;
                app.method.mensagem(`Limite de ${opcional[0].maximo} opções atingido.`);
            } else {
                pdv.opcionaisSelecionados = pdv.opcionaisSelecionados.filter(e => e.idopcionalitem != idopcionalitem);
            }
        } else {
            if (selecionado) {
                pdv.opcionaisSelecionados.push(opcional[0]);
            } else {
                pdv.opcionaisSelecionados = pdv.opcionaisSelecionados.filter(e => e.idopcionalitem != idopcionalitem);
            }
        }

        if (obrigatorio) {
            let selCount = pdv.opcionaisSelecionados.filter(e => e.idopcional == idopcional).length;
            if (selCount >= opcional[0].minimo) {
                pdv.validacoes = pdv.validacoes.filter(e => e.idopcional != idopcional);
                let badge = document.querySelector('#badge-obrigatorio-' + idopcional);
                if (badge) {
                    badge.innerHTML = '<i class="fas fa-check"></i>';
                    badge.className = 'badge badge-success';
                }
            } else {
                if (!pdv.validacoes.some(e => e.idopcional == idopcional)) {
                    pdv.validacoes.push({ idopcional: idopcional });
                }
                let badge = document.querySelector('#badge-obrigatorio-' + idopcional);
                if (badge) {
                    badge.innerHTML = 'Obrigatório';
                    badge.className = 'badge badge-warning';
                }
            }
        }
        pdv.method.atualizarTotalModal();
    },

    validacaoCheckOpcionalUnico: (opcional, selecionado, idopcional, idopcionalitem, inputs, obrigatorio = false) => {
        Array.from(inputs).forEach(e => { e.checked = false; });
        pdv.opcionaisSelecionados = pdv.opcionaisSelecionados.filter(e => e.idopcional != idopcional);

        if (selecionado) {
            document.querySelector('#check-opcional-' + idopcionalitem).checked = true;
            pdv.opcionaisSelecionados.push(opcional[0]);

            if (obrigatorio) {
                pdv.validacoes = pdv.validacoes.filter(e => e.idopcional != idopcional);
                let badge = document.querySelector('#badge-obrigatorio-' + idopcional);
                if (badge) {
                    badge.innerHTML = '<i class="fas fa-check"></i>';
                    badge.className = 'badge badge-success';
                }
            }
        } else {
            if (obrigatorio) {
                if (!pdv.validacoes.some(e => e.idopcional == idopcional)) {
                    pdv.validacoes.push({ idopcional: idopcional });
                }
                let badge = document.querySelector('#badge-obrigatorio-' + idopcional);
                if (badge) {
                    badge.innerHTML = 'Obrigatório';
                    badge.className = 'badge badge-warning';
                }
            }
        }
        pdv.method.atualizarTotalModal();
    },

    atualizarTotalModal: () => {
        let base = (pdv.variacaoSelecionada && parseFloat(pdv.variacaoSelecionada.valor) > 0) ? parseFloat(pdv.variacaoSelecionada.valor) : (parseFloat(pdv.produtoAtual.valor) || 0);
        let extra = pdv.opcionaisSelecionados.reduce((acc, opc) => acc + (parseFloat(opc.valoropcional) || 0), 0);
        let total = base + extra;
        document.getElementById('lblTotalModal').innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    },

    confirmarAdicaoCarrinho: () => {
        if (pdv.variacoes.length > 0 && !pdv.variacaoSelecionada) {
            app.method.mensagem('Selecione uma opção de tamanho/preço obrigatória.');
            return;
        }

        if (pdv.validacoes.length > 0) {
            app.method.mensagem('Selecione os opcionais obrigatórios.');
            return;
        }

        let observacao = document.getElementById('txtObservacaoProduto').value.trim();
        let base = (pdv.variacaoSelecionada && parseFloat(pdv.variacaoSelecionada.valor) > 0) ? parseFloat(pdv.variacaoSelecionada.valor) : (parseFloat(pdv.produtoAtual.valor) || 0);

        pdv.carrinho.push({
            guid: app.method.criarGuid(),
            idproduto: pdv.produtoAtual.idproduto,
            nome: pdv.produtoAtual.nome,
            imagem: pdv.produtoAtual.imagem,
            valor: base,
            quantidade: 1,
            observacao: observacao,
            opcionais: [...pdv.opcionaisSelecionados], // clone
            idvariacao: pdv.variacaoSelecionada ? pdv.variacaoSelecionada.idvariacao : null,
            nomevariacao: pdv.variacaoSelecionada ? pdv.variacaoSelecionada.nome : null
        });

        bootstrap.Modal.getInstance(document.getElementById('modalProdutoDetalhes'))?.hide();
        pdv.method.atualizarCarrinho();
    },

    removerItemCarrinho: (guid) => {
        // Bug #4: filtrar apenas por guid (todos os itens do PDV têm guid único)
        pdv.carrinho = pdv.carrinho.filter(p => p.guid !== guid);
        pdv.method.atualizarCarrinho();
    },

    // Bug #2 e #3: função centralizada para calcular total do carrinho incluindo opcionais
    calcularTotalCarrinho: () => {
        return pdv.carrinho.reduce((acc, item) => {
            const valorOpcionais = (item.opcionais || []).reduce((s, opc) => s + (parseFloat(opc.valoropcional) || 0), 0);
            return acc + (parseFloat(item.valor) + valorOpcionais) * parseInt(item.quantidade, 10);
        }, 0);
    },

    atualizarCarrinho: () => {
        let html = '';
        let total = 0;
        let qtdItens = 0;

        if (pdv.carrinho.length === 0) {
            document.getElementById('itens-carrinho-pdv').innerHTML = `
                <div class="text-center text-muted mt-5" id="carrinho-vazio">
                    <i class="fas fa-shopping-basket fa-3x mb-3" style="opacity: 0.2;"></i>
                    <p>Adicione itens ao pedido.</p>
                </div>`;
            document.getElementById('lblTotal').innerText = 'R$ 0,00';
            document.getElementById('lblQtdItens').innerText = '0';
            return;
        }

        pdv.carrinho.forEach(item => {
            // Calcula o valor total do item somando os opcionais
            let valorOpcionais = 0;
            let opcionaisHtml = '';

            if (item.opcionais && item.opcionais.length > 0) {
                item.opcionais.forEach(opc => {
                    if (opc.valoropcional > 0) {
                        valorOpcionais += parseFloat(opc.valoropcional);
                    }
                    opcionaisHtml += `<span class="d-block text-muted" style="font-size: 11px; margin-left: 20px;">+ ${opc.nomeopcional}</span>`;
                });
            }

            let valorTotalItem = (parseFloat(item.valor) + valorOpcionais) * item.quantidade;
            total += valorTotalItem;
            qtdItens += item.quantidade;

            let variacaoHtml = item.nomevariacao ? `<span class="d-block text-muted" style="font-size: 11px; margin-left: 20px;">Tamanho: ${item.nomevariacao}</span>` : '';
            let observacaoHtml = item.observacao ? `<span class="d-block text-muted" style="font-size: 11px; margin-left: 20px;">Obs: ${item.observacao}</span>` : '';

            html += `
            <div class="item-carrinho border-bottom pb-2 mb-2">
                <div class="w-100">
                    <div class="d-flex justify-content-between align-items-center w-100">
                        <div>
                            <span class="item-qtd">${item.quantidade}x</span>
                            <span class="ml-2 font-weight-bold" style="font-size: 14px;">${item.nome}</span>
                        </div>
                        <div class="d-flex align-items-center">
                            <span class="mr-3 font-weight-bold">R$ ${valorTotalItem.toFixed(2).replace('.', ',')}</span>
                            <button class="btn-remover-item text-danger border-0 bg-transparent" onclick="pdv.method.removerItemCarrinho('${item.guid || item.idproduto}')"><i class="fas fa-times"></i></button>
                        </div>
                    </div>
                    ${variacaoHtml}
                    ${opcionaisHtml}
                    ${observacaoHtml}
                </div>
            </div>`;
        });

        document.getElementById('itens-carrinho-pdv').innerHTML = html;
        document.getElementById('lblTotal').innerText = `R$ ${parseFloat(total).toFixed(2).replace('.', ',')}`;
        document.getElementById('lblQtdItens').innerText = qtdItens;

        // Rolar carrinho para baixo
        let container = document.getElementById('itens-carrinho-pdv');
        container.scrollTop = container.scrollHeight;

        // Recalcular troco se já houver valor
        pdv.method.calcularTroco();
    },

    mudarFormaPagamento: () => {
        const formaPagamento = document.getElementById('ddlFormaPagamento').value;
        const containerTroco = document.getElementById('container-troco');
        // Bug #7: padronizar para classes Bootstrap em vez de style.display
        if (formaPagamento === '1') { // Dinheiro
            containerTroco.classList.remove('d-none');
        } else {
            containerTroco.classList.add('d-none');
            document.getElementById('txtValorRecebido').value = '';
            document.getElementById('lblTroco').innerText = 'R$ 0,00';
            document.getElementById('lblTroco').className = 'text-success font-weight-bold';
        }
    },

    calcularTroco: () => {
        // Bug #2: usar calcularTotalCarrinho() que inclui opcionais
        let total = pdv.method.calcularTotalCarrinho();
        let valorRecebido = parseFloat(document.getElementById('txtValorRecebido').value) || 0;
        let lblTroco = document.getElementById('lblTroco');

        if (valorRecebido > 0) {
            let troco = valorRecebido - total;
            lblTroco.innerText = 'R$ ' + troco.toFixed(2).replace('.', ',');
            lblTroco.className = troco < 0 ? 'text-danger font-weight-bold' : 'text-success font-weight-bold';
        } else {
            lblTroco.innerText = 'R$ 0,00';
            lblTroco.className = 'text-success font-weight-bold';
        }
    },

    finalizarPedido: () => {
        if (pdv.carrinho.length === 0) {
            app.method.mensagem('Adicione itens ao pedido primeiro.');
            return;
        }

        const tipoPedido = document.getElementById('ddlTipoPedido').value;
        const formaPagamento = document.getElementById('ddlFormaPagamento').value;
        const nomeCliente = document.getElementById('txtNomeCliente').value.trim() || 'Cliente Balcão';
        const numeroMesa = document.getElementById('txtNumeroMesa').value;
        const valorRecebido = parseFloat(document.getElementById('txtValorRecebido').value) || 0;

        if (tipoPedido === '3' && !numeroMesa) {
            app.method.mensagem('Informe o número da mesa ou comanda.');
            return;
        }

        // Previne duplicação de mesa já ocupada (verificação visual via DOM)
        if (tipoPedido === '3' && !pdv.idPedidoAtual && numeroMesa) {
            const elMesa = Array.from(document.querySelectorAll('.mesa-card-mini'))
                .find(e => e.innerText.trim() === numeroMesa.toString() ||
                           e.innerText.trim().startsWith(numeroMesa.toString() + ' '));
            if (elMesa && (elMesa.classList.contains('ocupada') || elMesa.classList.contains('fechando'))) {
                app.method.mensagem('Esta mesa já está aberta! Selecione-a clicando na grade para atualizá-la ou receber a conta.');
                return;
            }
        }

        // Bug #3: usar calcularTotalCarrinho() que inclui opcionais
        const total = pdv.method.calcularTotalCarrinho();

        let trocoReal = null;
        if (formaPagamento === '1' && valorRecebido > 0) {
            trocoReal = parseFloat((valorRecebido - total).toFixed(2));
        }

        // Monta descrição legível do tipo de pedido (principal objetivo)
        const descricoesTipo = { '1': 'Delivery', '2': 'Balcão / Retirada', '3': 'Mesa' };
        const tipoPedidoDescricao = descricoesTipo[tipoPedido] || 'Balcão / Retirada';

        const dadosPedido = {
            idtipoentrega: parseInt(tipoPedido, 10),
            tipoPedidoDescricao: tipoPedidoDescricao,
            idformapagamento: (tipoPedido === '3' && !pdv.idPedidoAtual) ? 1 : parseInt(formaPagamento, 10),
            total: total,
            troco: (tipoPedido === '3' && !pdv.idPedidoAtual) ? null : trocoReal,
            nomecliente: nomeCliente,
            telefonecliente: '00000000000',
            numero_mesa: numeroMesa || null,
            cart: pdv.carrinho,
            idpedidostatus: (tipoPedido === '3' && !pdv.idPedidoAtual) ? 2 : 1
        };

        // Enviar pedido
        app.method.loading(true);

        if (pdv.idPedidoAtual) {
            // Se for um pedido de mesa já existente, apenas fechar
            let dadosFechamento = {
                idpedido: pdv.idPedidoAtual,
                idformapagamento: parseInt(formaPagamento),
                troco: trocoReal,
                numero_mesa: numeroMesa
            };

            app.method.post('/pedido/fechar', JSON.stringify(dadosFechamento),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    pdv.method.limparPdv();
                    pdv.method.obterMesas(true); // Recarrega mesas para atualizar cores
                },
                (error) => {
                    app.method.loading(false);
                    console.log('error', error)
                }
            );
        } else {
            // Cria um novo pedido
            app.method.post('/pedido', JSON.stringify(dadosPedido),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }

                    if (tipoPedido === '3' && !pdv.idPedidoAtual) {
                        app.method.mensagem('Mesa aberta com sucesso!', 'green');
                    } else {
                        app.method.mensagem('Pedido gerado com sucesso!', 'green');
                    }
                    pdv.method.limparPdv();

                    if (tipoPedido === '3') {
                        pdv.method.obterMesas(true);
                    }
                },
                (error) => {
                    app.method.loading(false);
                    console.log('error', error)
                }
            );
        }
    },

    limparPdv: () => {
        pdv.idPedidoAtual = null;
        pdv.carrinho = [];
        pdv.method.atualizarCarrinho();
        document.getElementById('txtNomeCliente').value = '';
        document.getElementById('txtNumeroMesa').value = '';
        document.getElementById('txtValorRecebido').value = '';
        document.getElementById('btnFinalizarPedido').innerHTML = '<i class="fas fa-check-circle"></i> Finalizar Pedido';
        document.querySelectorAll('.mesa-card-mini').forEach(e => e.classList.remove('selecionada'));
        pdv.method.mudarFormaPagamento();
    }
}
