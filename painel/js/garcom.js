document.addEventListener("DOMContentLoaded", function (event) {
    app.event.init();
    garcom.event.init();
});

var garcom = {};

garcom.carrinho = [];
garcom.produtos = [];
garcom.pedidoAtual = null;

garcom.produtoAtual = null;
garcom.variacoes = [];
garcom.variacaoSelecionada = null;
garcom.opcionais = [];
garcom.opcionaisSelecionados = [];
garcom.validacoes = [];

garcom.template = {
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
      <div class="card card-opcionais mb-2 p-2 shadow-sm" style="cursor:pointer;" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; garcom.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})">
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
              <input id="check-opcional-\${idopcionalitem}" type="checkbox" class="paiopcional-\${idopcional}" onchange="garcom.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})" />
              <span class="checkmark"></span>
            </label>
          </div>
        </div>
      </div>
    `,
    opcionalItemSimples: `
      <div class="card card-opcionais mb-2 p-2 shadow-sm" style="cursor:pointer;" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; garcom.method.selecionarOpcionalSimples('\${idopcionalitem}')">
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
              <input id="check-opcional-\${idopcionalitem}" type="checkbox" onchange="garcom.method.selecionarOpcionalSimples('\${idopcionalitem}')" />
              <span class="checkmark"></span>
            </label>
          </div>
        </div>
      </div>
    `
};

garcom.event = {
    init: () => {
        let token = app.method.obterValorSessao('token');
        if (!token) {
            window.location.href = '/painel/login-garcom.html';
            return;
        }

        // Obter nome do garçom do localstorage (simulado pelo app.js)
        let nome = app.method.obterValorSessao('Nome') || 'Garçom';
        document.getElementById('lblNomeGarcom').innerText = 'Olá, ' + nome;

        garcom.method.obterMesas();
        garcom.method.obterCategorias();
        garcom.method.obterProdutos();

        // Atualizar mesas a cada 15 segundos
        setInterval(() => {
            garcom.method.obterMesas(true);
        }, 15000);
    }
}

garcom.method = {

    obterMesas: (silencioso = false) => {
        app.method.get('/mesa',
            (response) => {
                if (response.status == "success") {
                    garcom.method.renderizarMesas(response.data);
                }
            },
            (error) => { console.log('error', error) }
        )
    },

    renderizarMesas: (lista) => {
        let html = '';
        let mesaSelecionada = document.getElementById('txtNumeroMesa').value;

        if (lista.length === 0) {
            html = '<div class="text-center w-100 text-muted"><small>Nenhuma mesa cadastrada.</small></div>';
        }

        lista.forEach(m => {
            let isLivre   = !m.idpedidostatus;
            let isFechando = m.idpedidostatus == 7;
            let classeStatus = isLivre ? 'livre' : (isFechando ? 'fechando' : 'ocupada');
            let iconeFechando = isFechando ? ' <i class="fas fa-receipt" style="font-size:10px;"></i>' : '';
            let classeSelecionada = (mesaSelecionada && mesaSelecionada == m.numero) ? 'selecionada' : '';
            
            // Regra de Reset: se a mesa selecionada ficou livre, mas tínhamos um pedido local, reseta a tela (pois foi paga no PDV)
            if (classeSelecionada && isLivre && garcom.pedidoAtual != null) {
                app.method.mensagem('A mesa ' + m.numero + ' foi recebida e liberada no caixa.', 'green', 4000);
                garcom.carrinho = [];
                garcom.pedidoAtual = null;
                garcom.method.atualizarIconeCarrinho(null);
                
                // Fechar modais se estiverem abertos
                try {
                    bootstrap.Modal.getInstance(document.getElementById('modalPagamentoGarcom'))?.hide();
                    bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();
                    bootstrap.Modal.getInstance(document.getElementById('modalProdutoDetalhes'))?.hide();
                } catch(e) {}
            }

            html += `<div class="mesa-card ${classeStatus} ${classeSelecionada}" onclick="garcom.method.selecionarMesa('${m.numero}', this)">${m.numero}${iconeFechando}</div>`;
        });

        document.getElementById('mesas-grid').innerHTML = html;
    },

    selecionarMesa: (numero, el) => {
        document.querySelectorAll('.mesa-card').forEach(e => e.classList.remove('selecionada'));
        el.classList.add('selecionada');
        document.getElementById('txtNumeroMesa').value = numero;

        let lbl = document.getElementById('lblMesaSelecionada');
        lbl.style.display = 'inline-block';
        lbl.innerText = 'Mesa ' + numero;

        if (el.classList.contains('livre')) {
            // Mesa livre: estado limpo para novo pedido
            garcom.carrinho   = [];
            garcom.pedidoAtual = null;
            document.getElementById('lblQtdItens').innerText = '0';
            app.method.mensagem('Mesa ' + numero + ' livre. Adicione itens ao pedido.', 'green', 3000);
            bootstrap.Modal.getInstance(document.getElementById('modalSelecionarMesa'))?.hide();

        } else if (el.classList.contains('ocupada') || el.classList.contains('fechando')) {
            // Bug #2: agrupa por idpedidoitem e marca como 'enviado'
            app.method.loading(true);
            app.method.get('/pedido/mesa/' + numero,
                (response) => {
                    app.method.loading(false);
                    if (response.status === 'success') {
                        garcom.pedidoAtual = response.data;

                        const cart = response.cart || [];
                        const grupos = cart.reduce((acc, item) => {
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
                                    opcionais: [],
                                    status: 'enviado' // Já está na cozinha
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
                        garcom.carrinho = Object.values(grupos);

                        garcom.method.atualizarIconeCarrinho(numero);
                        let qtd = garcom.carrinho.length;
                        app.method.mensagem(`Mesa ${numero}: ${qtd} item(s) no pedido.`, 'green', 4000);
                        bootstrap.Modal.getInstance(document.getElementById('modalSelecionarMesa'))?.hide();
                    } else {
                        app.method.mensagem(response.message);
                    }
                },
                (error) => {
                    app.method.loading(false);
                    console.log(error);
                }
            );
        }
    },

    obterCategorias: () => {
        app.method.get('/categoria',
            (response) => {
                if (response.status == "success") {
                    garcom.method.carregarCategorias(response.data);
                }
            },
            (error) => { console.log('error', error) }
        )
    },

    carregarCategorias: (lista) => {
        let html = `<button class="cat-btn active" onclick="garcom.method.filtrarPorCategoria(0, this)">Todas</button>`;
        lista.forEach(c => {
            html += `<button class="cat-btn" onclick="garcom.method.filtrarPorCategoria(${c.idcategoria}, this)">${c.nome}</button>`;
        });
        document.getElementById('lista-categorias').innerHTML = html;
    },

    obterProdutos: () => {
        app.method.get('/produto',
            (response) => {
                if (response.status == "success") {
                    garcom.produtos = response.data;
                    garcom.method.carregarProdutos(response.data);
                }
            },
            (error) => { console.log('error', error) }
        )
    },

    carregarProdutos: (lista) => {
        let html = '';
        lista.forEach(p => {
            let img = p.imagem ? `/public/images/${p.imagem}` : '/public/images/default.jpg';
            html += `
            <div class="produto-item">
                <img src="${img}" alt="${p.nome}">
                <div class="produto-info">
                    <p class="produto-nome">${p.nome}</p>
                    ${(p.tem_variacao > 0 && parseFloat(p.valor_min_variacao) > 0) ? `<p class="produto-preco mb-0"><span style="font-size: 11px; color: #777; font-weight: normal; display: block; margin-bottom: -2px;">A partir de</span>R$ ${(parseFloat(p.valor_min_variacao) || 0).toFixed(2).replace('.', ',')}</p>` : `<p class="produto-preco mb-0">R$ ${(parseFloat(p.valor) || 0).toFixed(2).replace('.', ',')}</p>`}
                </div>
                <button class="btn-add shadow-sm" onclick="garcom.method.adicionarItem(${p.idproduto})">
                    <i class="fas fa-plus"></i>
                </button>
            </div>`;
        });
        document.getElementById('lista-produtos').innerHTML = html;
    },

    filtrarPorCategoria: (idcategoria, btn) => {
        document.querySelectorAll('.cat-btn').forEach(e => e.classList.remove('active'));
        btn.classList.add('active');

        if (idcategoria === 0) {
            garcom.method.carregarProdutos(garcom.produtos);
        } else {
            let filtro = garcom.produtos.filter(p => p.idcategoria == idcategoria);
            garcom.method.carregarProdutos(filtro);
        }
    },

    adicionarItem: (idproduto) => {
        let produto = garcom.produtos.find(p => p.idproduto == idproduto);
        if (!produto) return;

        let mesa = document.getElementById('txtNumeroMesa').value;
        if (!mesa) {
            app.method.mensagem('Selecione uma mesa primeiro para iniciar o pedido.', 'red');
            bootstrap.Modal.getOrCreateInstance(document.getElementById('modalSelecionarMesa')).show();
            return;
        }

        garcom.produtoAtual = produto;
        garcom.variacoes = [];
        garcom.variacaoSelecionada = null;
        garcom.opcionais = [];
        garcom.opcionaisSelecionados = [];
        garcom.validacoes = [];

        app.method.loading(true);
        app.method.get('/produto/variacoes/' + idproduto, (respVar) => {
            if (respVar.status === 'success' && respVar.data && respVar.data.length > 0) {
                garcom.variacoes = respVar.data;
            }

            app.method.get('/opcional/produto/' + idproduto, (respOpc) => {
                app.method.loading(false);
                if (respOpc.status === 'success' && respOpc.data && respOpc.data.length > 0) {
                    garcom.opcionais = respOpc.data;
                }

                if (garcom.variacoes.length > 0 || garcom.opcionais.length > 0) {
                    garcom.method.abrirModalOpcionais();
                } else {
                    // Produto simples: incrementa se já existe sem opcionais e também pendente
                    let existente = garcom.carrinho.find(p =>
                        p.idproduto == idproduto &&
                        (!p.opcionais || p.opcionais.length === 0) &&
                        p.status === 'pendente'
                    );
                    if (existente) {
                        existente.quantidade = parseInt(existente.quantidade, 10) + 1;
                    } else {
                        garcom.carrinho.push({
                            guid: app.method.criarGuid(),
                            idproduto: produto.idproduto,
                            nome: produto.nome,
                            valor: parseFloat(produto.valor) || 0,
                            quantidade: 1,
                            opcionais: [],
                            observacao: '',
                            status: 'pendente' // Novo item, ainda não enviado
                        });
                    }
                    garcom.method.atualizarIconeCarrinho(mesa);
                }
            }, () => { app.method.loading(false); });
        }, () => { app.method.loading(false); });
    },

    // Bug #6: somar quantidades em vez de contar linhas
    atualizarIconeCarrinho: (mesa) => {
        const totalItens = garcom.carrinho.reduce((acc, item) => acc + parseInt(item.quantidade, 10), 0);
        document.getElementById('lblQtdItens').innerText = totalItens;
        if (navigator.vibrate) navigator.vibrate(50);
        if (mesa) app.method.mensagem(`Item adicionado à mesa ${mesa}!`, 'green', 1500);
    },

    // Bug #3: função centralizada que inclui opcionais
    calcularTotalCarrinho: () => {
        return garcom.carrinho.reduce((acc, item) => {
            const valorOpcionais = (item.opcionais || []).reduce((s, opc) => s + (parseFloat(opc.valoropcional) || 0), 0);
            return acc + (parseFloat(item.valor) + valorOpcionais) * parseInt(item.quantidade, 10);
        }, 0);
    },

    abrirModalOpcionais: () => {
        document.getElementById('lblNomeProdutoModalGarcom').innerText = garcom.produtoAtual.nome;
        document.getElementById('txtObservacaoProdutoGarcom').value = '';

        let containerVar = document.getElementById('listaVariacoesModalGarcom');
        if (garcom.variacoes.length > 0) {
            containerVar.classList.remove('hidden');
            let htmlVar = `
                <div class="container-group mb-4">
                    <span class="badge badge-warning">Obrigatório</span>
                    <p class="title-categoria mb-0"><b>Opções de Tamanho/Preço</b></p>
                    <span class="sub-title-categoria text-muted" style="font-size: 13px;">Escolha 1 opção</span>
                    <div class="mt-2">
            `;
            garcom.variacoes.forEach(v => {
                let valFmt = `R$ ${parseFloat(v.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
                htmlVar += `
                    <div class="card card-opcionais mb-2 p-2 shadow-sm" style="cursor:pointer;" onclick="garcom.method.selecionarVariacao('${v.idvariacao}')">
                        <div class="d-flex align-items-center justify-content-between w-100">
                            <div class="infos-produto-opcional ml-2">
                                <p class="name mb-0 font-weight-bold" style="font-size:14px;">${v.nome}</p>
                                <p class="price mb-0 text-success" style="font-size:13px;">${valFmt}</p>
                            </div>
                            <div class="checks">
                                <label class="container-check mb-0" onclick="event.stopPropagation();">
                                    <input id="check-variacao-garcom-${v.idvariacao}" type="radio" name="radio-variacao-garcom" onchange="garcom.method.selecionarVariacao('${v.idvariacao}')" />
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

        document.getElementById('listaOpcionaisModalGarcom').innerHTML = '';
        if (garcom.opcionais.length > 0) {
            let listaSelecao = garcom.opcionais.filter(e => e.tiposimples == 0);
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
                    obrigatorio = `<span class="badge badge-warning" id="badge-obrigatorio-garcom-${e[0]}">Obrigatório</span>`;
                    garcom.validacoes.push({ idopcional: e[0] });
                } else if (minimo < maximo) {
                    if (minimo > 0) {
                        subtitulo = `Escolha de ${minimo} até ${maximo} opções`;
                        obrigatorio = `<span class="badge badge-warning" id="badge-obrigatorio-garcom-${e[0]}">Obrigatório</span>`;
                        garcom.validacoes.push({ idopcional: e[0] });
                    } else {
                        subtitulo = maximo > 1 ? `Escolha até ${maximo} opções` : `Escolha até 1 opção`;
                    }
                }

                let itensHTML = '';
                opc.forEach(element => {
                    let valor = element.valoropcional > 0 ? `+ R$ ${parseFloat(element.valoropcional).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
                    let imgHtml = element.imagem ? `<div class="card-opcionais-img" style="background-image: url('../public/images/${element.imagem}'); width: 40px; height: 40px; border-radius: 5px; background-size: cover;"></div>` : '';
                    let descHtml = element.descricao ? `<p class="desc text-muted mb-0" style="font-size: 11px;">${element.descricao}</p>` : '';

                    itensHTML += garcom.template.opcionalItem
                        .replace(/\${idopcionalitem}/g, element.idopcionalitem)
                        .replace(/\${nome}/g, element.nomeopcional)
                        .replace(/\${valor}/g, valor)
                        .replace(/\${idopcional}/g, e[0])
                        .replace(/\${img}/g, imgHtml)
                        .replace(/\${desc}/g, descHtml);
                });

                document.getElementById('listaOpcionaisModalGarcom').innerHTML += garcom.template.opcional
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

        let listaSimples = garcom.opcionais.filter(e => e.tiposimples == 1);
        let containerSimples = document.getElementById('listaOpcionaisSimplesModalGarcom');
        containerSimples.innerHTML = '';
        if (listaSimples.length > 0) {
            containerSimples.innerHTML = '<p class="title-categoria mb-2 mt-3"><b>Adicionais</b></p>';
            listaSimples.forEach(e => {
                let valor = e.valoropcional > 0 ? `+ R$ ${parseFloat(e.valoropcional).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '';
                let imgHtml = e.imagem ? `<div class="card-opcionais-img" style="background-image: url('../public/images/${e.imagem}'); width: 40px; height: 40px; border-radius: 5px; background-size: cover;"></div>` : '';
                let descHtml = e.descricao ? `<p class="desc text-muted mb-0" style="font-size: 11px;">${e.descricao}</p>` : '';

                containerSimples.innerHTML += garcom.template.opcionalItemSimples
                    .replace(/\${idopcionalitem}/g, e.idopcionalitem)
                    .replace(/\${nome}/g, e.nomeopcional)
                    .replace(/\${valor}/g, valor)
                    .replace(/\${img}/g, imgHtml)
                    .replace(/\${desc}/g, descHtml);
            });
        }

        garcom.method.atualizarTotalModal();
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalProdutoDetalhes')).show();
    },

    selecionarVariacao: (idvariacao) => {
        garcom.variacaoSelecionada = garcom.variacoes.find(v => v.idvariacao == idvariacao);
        document.getElementById('check-variacao-garcom-' + idvariacao).checked = true;
        garcom.method.atualizarTotalModal();
    },

    selecionarOpcional: (idopcionalitem, idopcional) => {
        let chk = document.querySelector("#check-opcional-" + idopcionalitem);
        let selecionado = chk ? chk.checked : false;
        let inputs = document.getElementsByClassName("paiopcional-" + idopcional);
        let opcional = garcom.opcionais.filter(e => e.idopcionalitem == idopcionalitem);

        if (opcional[0].minimo === opcional[0].maximo) {
            if (opcional[0].minimo > 1) {
                garcom.method.validacaoCheckOpcional(opcional, selecionado, idopcional, idopcionalitem, true);
            } else {
                garcom.method.validacaoCheckOpcionalUnico(opcional, selecionado, idopcional, idopcionalitem, inputs, true);
            }
        }
        else if (opcional[0].minimo < opcional[0].maximo) {
            if (opcional[0].minimo > 0) {
                garcom.method.validacaoCheckOpcional(opcional, selecionado, idopcional, idopcionalitem, true);
            } else {
                if (opcional[0].maximo > 0) {
                    garcom.method.validacaoCheckOpcional(opcional, selecionado, idopcional, idopcionalitem);
                } else {
                    garcom.method.validacaoCheckOpcionalUnico(opcional, selecionado, idopcional, idopcionalitem, inputs);
                }
            }
        }
    },

    selecionarOpcionalSimples: (idopcionalitem) => {
        let chk = document.querySelector("#check-opcional-" + idopcionalitem);
        let selecionado = chk ? chk.checked : false;
        let opcional = garcom.opcionais.filter(e => e.idopcionalitem == idopcionalitem)[0];

        if (selecionado) {
            if (!garcom.opcionaisSelecionados.some(e => e.idopcionalitem == opcional.idopcionalitem)) {
                garcom.opcionaisSelecionados.push(opcional);
            }
        } else {
            garcom.opcionaisSelecionados = garcom.opcionaisSelecionados.filter(e => e.idopcionalitem != opcional.idopcionalitem);
        }
        garcom.method.atualizarTotalModal();
    },

    validacaoCheckOpcional: (opcional, selecionado, idopcional, idopcionalitem, obrigatorio = false) => {
        let filtro = garcom.opcionaisSelecionados.filter(e => e.idopcional == idopcional);

        if (filtro.length >= opcional[0].maximo) {
            if (selecionado) {
                document.querySelector("#check-opcional-" + idopcionalitem).checked = false;
                app.method.mensagem(`Limite de ${opcional[0].maximo} opções atingido.`);
            } else {
                garcom.opcionaisSelecionados = garcom.opcionaisSelecionados.filter(e => e.idopcionalitem != idopcionalitem);
            }
        } else {
            if (selecionado) {
                garcom.opcionaisSelecionados.push(opcional[0]);
            } else {
                garcom.opcionaisSelecionados = garcom.opcionaisSelecionados.filter(e => e.idopcionalitem != idopcionalitem);
            }
        }

        if (obrigatorio) {
            let selCount = garcom.opcionaisSelecionados.filter(e => e.idopcional == idopcional).length;
            if (selCount >= opcional[0].minimo) {
                garcom.validacoes = garcom.validacoes.filter(e => e.idopcional != idopcional);
                let badge = document.querySelector('#badge-obrigatorio-garcom-' + idopcional);
                if (badge) {
                    badge.innerHTML = '<i class="fas fa-check"></i>';
                    badge.className = 'badge badge-success';
                }
            } else {
                if (!garcom.validacoes.some(e => e.idopcional == idopcional)) {
                    garcom.validacoes.push({ idopcional: idopcional });
                }
                let badge = document.querySelector('#badge-obrigatorio-garcom-' + idopcional);
                if (badge) {
                    badge.innerHTML = 'Obrigatório';
                    badge.className = 'badge badge-warning';
                }
            }
        }
        garcom.method.atualizarTotalModal();
    },

    validacaoCheckOpcionalUnico: (opcional, selecionado, idopcional, idopcionalitem, inputs, obrigatorio = false) => {
        Array.from(inputs).forEach(e => { e.checked = false; });
        garcom.opcionaisSelecionados = garcom.opcionaisSelecionados.filter(e => e.idopcional != idopcional);

        if (selecionado) {
            document.querySelector('#check-opcional-' + idopcionalitem).checked = true;
            garcom.opcionaisSelecionados.push(opcional[0]);

            if (obrigatorio) {
                garcom.validacoes = garcom.validacoes.filter(e => e.idopcional != idopcional);
                let badge = document.querySelector('#badge-obrigatorio-garcom-' + idopcional);
                if (badge) {
                    badge.innerHTML = '<i class="fas fa-check"></i>';
                    badge.className = 'badge badge-success';
                }
            }
        } else {
            if (obrigatorio) {
                if (!garcom.validacoes.some(e => e.idopcional == idopcional)) {
                    garcom.validacoes.push({ idopcional: idopcional });
                }
                let badge = document.querySelector('#badge-obrigatorio-garcom-' + idopcional);
                if (badge) {
                    badge.innerHTML = 'Obrigatório';
                    badge.className = 'badge badge-warning';
                }
            }
        }
        garcom.method.atualizarTotalModal();
    },

    atualizarTotalModal: () => {
        let base = (garcom.variacaoSelecionada && parseFloat(garcom.variacaoSelecionada.valor) > 0) ? parseFloat(garcom.variacaoSelecionada.valor) : (parseFloat(garcom.produtoAtual.valor) || 0);
        let extra = garcom.opcionaisSelecionados.reduce((acc, opc) => acc + (parseFloat(opc.valoropcional) || 0), 0);
        let total = base + extra;
        document.getElementById('lblTotalModalGarcom').innerText = `R$ ${total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    },

    confirmarAdicaoCarrinho: () => {
        if (garcom.variacoes.length > 0 && !garcom.variacaoSelecionada) {
            app.method.mensagem('Selecione uma opção de tamanho/preço obrigatória.');
            return;
        }

        if (garcom.validacoes.length > 0) {
            app.method.mensagem('Selecione os opcionais obrigatórios.');
            return;
        }

        let observacao = document.getElementById('txtObservacaoProdutoGarcom').value.trim();
        let base = (garcom.variacaoSelecionada && parseFloat(garcom.variacaoSelecionada.valor) > 0) ? parseFloat(garcom.variacaoSelecionada.valor) : (parseFloat(garcom.produtoAtual.valor) || 0);
        let mesa = document.getElementById('txtNumeroMesa').value;

        garcom.carrinho.push({
            guid: app.method.criarGuid(),
            idproduto: garcom.produtoAtual.idproduto,
            nome: garcom.produtoAtual.nome,
            imagem: garcom.produtoAtual.imagem,
            valor: base,
            quantidade: 1,
            observacao: observacao,
            opcionais: [...garcom.opcionaisSelecionados],
            idvariacao: garcom.variacaoSelecionada ? garcom.variacaoSelecionada.idvariacao : null,
            nomevariacao: garcom.variacaoSelecionada ? garcom.variacaoSelecionada.nome : null,
            status: 'pendente' // Novo item, ainda não enviado
        });

        bootstrap.Modal.getInstance(document.getElementById('modalProdutoDetalhes'))?.hide();
        garcom.method.atualizarIconeCarrinho(document.getElementById('txtNumeroMesa').value);
    },

    abrirCarrinho: () => {
        if (garcom.carrinho.length === 0) {
            app.method.mensagem('Nenhum item no pedido.');
            return;
        }

        const mesa      = document.getElementById('txtNumeroMesa').value;
        const total     = garcom.method.calcularTotalCarrinho();
        const temPendente = garcom.carrinho.some(i => i.status !== 'enviado');
        const qtdTotal  = garcom.carrinho.reduce((a, i) => a + parseInt(i.quantidade, 10), 0);
        const qtdNovos  = garcom.carrinho.filter(i => i.status !== 'enviado').reduce((a, i) => a + parseInt(i.quantidade, 10), 0);

        // Atualiza header
        document.getElementById('lblMesaConfirma').innerText = mesa;
        document.getElementById('lblResumoCarrinho').innerText =
            `${qtdTotal} item(s)` + (qtdNovos > 0 ? ` • ${qtdNovos} novo(s)` : ' • tudo enviado');

        let html = '';
        garcom.carrinho.forEach(item => {
            const valorOpcionais = (item.opcionais || []).reduce((s, opc) => s + (parseFloat(opc.valoropcional) || 0), 0);
            const valorTotalItem = (parseFloat(item.valor) + valorOpcionais) * parseInt(item.quantidade, 10);
            const isEnviado  = item.status === 'enviado';

            const statusTag  = isEnviado
                ? '<span class="item-enviado-tag">Enviado</span>'
                : '<span class="item-pendente-tag">Novo</span>';

            const opcionaisHtml  = (item.opcionais || []).map(opc =>
                `<span class="d-block text-muted" style="font-size:11px;">+ ${opc.nomeopcional}</span>`
            ).join('');
            const variacaoHtml   = item.nomevariacao
                ? `<span class="d-block text-muted" style="font-size:11px;">Tamanho: ${item.nomevariacao}</span>` : '';
            const observacaoHtml = item.observacao
                ? `<div class="mt-1 px-2 py-1 rounded" style="background:#fff9e6;font-size:11px;color:#856404;"><i class="fas fa-sticky-note mr-1"></i>${item.observacao}</div>` : '';

            html += `
            <div class="item-card-garcom ${isEnviado ? 'enviado' : ''}">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-1 flex-wrap gap-1">
                    <h6 class="font-weight-bold mb-0 mr-1">${item.nome}</h6>
                    ${statusTag}
                  </div>
                  ${variacaoHtml}${opcionaisHtml}${observacaoHtml}
                  <span class="font-weight-bold d-block mt-2" style="color:var(--color-primary,#f58637);font-size:15px;">R$ ${valorTotalItem.toFixed(2).replace('.', ',')}</span>
                </div>
                <button class="btn-edit-item ml-2" onclick="garcom.method.editarItemCarrinho('${item.guid}')" title="Editar">
                  <i class="fas fa-pen" style="font-size:12px;"></i>
                </button>
              </div>
              <div class="d-flex align-items-center mt-2" style="gap:10px;">
                <button class="btn btn-light btn-sm shadow-sm" style="width:32px;height:32px;padding:0;border-radius:50%;" onclick="garcom.method.alterarQtd('${item.guid}', -1)"><i class="fas fa-minus" style="font-size:11px;"></i></button>
                <span class="font-weight-bold" style="font-size:16px;min-width:30px;text-align:center;">${item.quantidade}</span>
                <button class="btn btn-light btn-sm shadow-sm" style="width:32px;height:32px;padding:0;border-radius:50%;" onclick="garcom.method.alterarQtd('${item.guid}', 1)"><i class="fas fa-plus" style="font-size:11px;"></i></button>
              </div>
            </div>`;
        });

        document.getElementById('itens-carrinho').innerHTML = html;
        document.getElementById('lblTotalCarrinho').innerText = 'R$ ' + total.toFixed(2).replace('.', ',');

        if (garcom.pedidoAtual) {
            document.getElementById('btnPedirConta').classList.remove('d-none');
            document.getElementById('btnEnviarCozinha').innerText = temPendente ? '📤 Enviar Novos Itens' : '✓ Tudo Enviado';
            document.getElementById('btnEnviarCozinha').disabled  = !temPendente;
        } else {
            document.getElementById('btnPedirConta').classList.add('d-none');
            document.getElementById('btnEnviarCozinha').innerText = '📤 Enviar para Cozinha';
            document.getElementById('btnEnviarCozinha').disabled  = false;
        }

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalCarrinho')).show();
    },

    // Bug #4: corrigido && -> filtrar por guid. Bug #11: parseInt com radix
    alterarQtd: (guid, delta) => {
        let item = garcom.carrinho.find(p => p.guid === guid);
        if (item) {
            item.quantidade = parseInt(item.quantidade, 10) + parseInt(delta, 10);
            if (item.quantidade <= 0) {
                garcom.carrinho = garcom.carrinho.filter(p => p.guid !== guid);
                app.method.mensagem('Item removido do pedido.', 'red', 2000);
            }
            garcom.method.atualizarIconeCarrinho(null);
            if (garcom.carrinho.length === 0) {
                bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();
            } else {
                garcom.method.abrirCarrinho();
            }
        }
    },

    // --- Funções de edição de item no carrinho ---

    editarItemCarrinho: (guid) => {
        const item = garcom.carrinho.find(p => p.guid === guid);
        if (!item) return;
        document.getElementById('editarItemGuid').value   = guid;
        document.getElementById('lblNomeItemEditar').innerText = item.nome;
        document.getElementById('lblQtdEdicao').innerText     = item.quantidade;
        document.getElementById('txtObsEdicaoGarcom').value   = item.observacao || '';
        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalEditarItemGarcom')).show();
    },

    alterarQtdEdicao: (delta) => {
        const lblQtd = document.getElementById('lblQtdEdicao');
        let qtd = parseInt(lblQtd.innerText, 10) + delta;
        if (qtd < 1) qtd = 1;
        lblQtd.innerText = qtd;
    },

    salvarEdicaoItem: () => {
        const guid = document.getElementById('editarItemGuid').value;
        const item = garcom.carrinho.find(p => p.guid === guid);
        if (!item) return;

        item.quantidade  = parseInt(document.getElementById('lblQtdEdicao').innerText, 10);
        item.observacao  = document.getElementById('txtObsEdicaoGarcom').value.trim();
        // Item editado vira pendente para ser reenviado
        item.status = 'pendente';

        bootstrap.Modal.getInstance(document.getElementById('modalEditarItemGarcom'))?.hide();
        garcom.method.atualizarIconeCarrinho(null);
        garcom.method.abrirCarrinho();
        app.method.mensagem('Item atualizado!', 'green', 2000);
    },

    removerItemEdicao: () => {
        const guid = document.getElementById('editarItemGuid').value;
        garcom.carrinho = garcom.carrinho.filter(p => p.guid !== guid);
        bootstrap.Modal.getInstance(document.getElementById('modalEditarItemGarcom'))?.hide();
        garcom.method.atualizarIconeCarrinho(null);
        app.method.mensagem('Item removido.', 'red', 2000);
        if (garcom.carrinho.length === 0) {
            bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();
        } else {
            garcom.method.abrirCarrinho();
        }
    },

    enviarParaCozinha: () => {
        const numeroMesa = document.getElementById('txtNumeroMesa').value;
        const idGarcom   = app.method.obterValorSessao('IdUsuario');

        // Bug #3: usar calcularTotalCarrinho() com opcionais
        const total = garcom.method.calcularTotalCarrinho();

        // Bug #8: padronizar com PDV
        const tipoPedidoDescricao = 'Mesa';

        if (garcom.pedidoAtual) {
            // Bug #1: enviar cart COMPLETO (backend apaga e reinsere tudo, preservando consistência)
            // Apenas itens 'pendente' são novos, mas enviamos tudo para não perder histórico
            const dadosAtualizacao = {
                idpedido: garcom.pedidoAtual.idpedido,
                idtipoentrega: 3,
                tipoPedidoDescricao: tipoPedidoDescricao,
                total: total,
                cart: garcom.carrinho,
                nomecliente: garcom.pedidoAtual.nomecliente || ('Mesa ' + numeroMesa),
                telefonecliente: '00000000000',
                numero_mesa: numeroMesa,
                idgarcom: idGarcom
            };

            app.method.loading(true);
            app.method.post('/pedido/atualizar-itens', JSON.stringify(dadosAtualizacao),
                (response) => {
                    app.method.loading(false);
                    if (response.status === 'error') {
                        app.method.mensagem(response.message);
                        return;
                    }
                    // Bug #1: marcar itens pendentes como enviados (não limpar carrinho)
                    garcom.carrinho.forEach(item => { item.status = 'enviado'; });

                    bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();
                    app.method.mensagem('Novos itens enviados para a cozinha!', 'green');
                    garcom.method.atualizarIconeCarrinho(null);
                    garcom.method.obterMesas(true);
                },
                (error) => { app.method.loading(false); console.log('error', error); }
            );
        } else {
            // Novo pedido
            const dadosPedido = {
                idtipoentrega: 3,
                tipoPedidoDescricao: tipoPedidoDescricao,
                idformapagamento: 1, // Placeholder, definido no fechamento
                total: total,
                nomecliente: 'Mesa ' + numeroMesa,
                telefonecliente: '00000000000',
                numero_mesa: numeroMesa,
                idgarcom: idGarcom,
                cart: garcom.carrinho,
                idpedidostatus: 2
            };

            app.method.loading(true);
            app.method.post('/pedido', JSON.stringify(dadosPedido),
                (response) => {
                    app.method.loading(false);
                    if (response.status === 'error') {
                        app.method.mensagem(response.message);
                        return;
                    }
                    // Marcar todos como enviados e guardar referência do pedido
                    garcom.carrinho.forEach(item => { item.status = 'enviado'; });
                    garcom.pedidoAtual = {
                        idpedido: response.order,
                        nomecliente: 'Mesa ' + numeroMesa,
                        numero_mesa: numeroMesa
                    };

                    bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();
                    app.method.mensagem('Pedido enviado para a cozinha!', 'green');
                    garcom.method.atualizarIconeCarrinho(null);
                    garcom.method.obterMesas(true);
                },
                (error) => {
                    app.method.loading(false);
                    console.log('error', error);
                }
            );
        }
    },

    abrirHistorico: () => {
        let hoje = new Date().toISOString().split('T')[0];
        let dados = {
            datainicio: hoje,
            datafim: hoje
        };

        let idGarcom = app.method.obterValorSessao('IdUsuario');

        app.method.loading(true);
        app.method.post('/pedido/historico', JSON.stringify(dados),
            (response) => {
                app.method.loading(false);
                if (response.status === 'success') {
                    let meusPedidos = response.data.filter(p => p.idgarcom == idGarcom);

                    let html = '';
                    if (meusPedidos.length === 0) {
                        html = '<div class="text-center text-muted py-4">Nenhum pedido anotado hoje.</div>';
                    } else {
                        let totalGanhos = 0;
                        meusPedidos.forEach(p => {
                            totalGanhos += p.total || 0;
                            let statusBadge = '';
                            if (p.idpedidostatus == 2) statusBadge = '<span class="badge badge-primary">Na Cozinha</span>';
                            else if (p.idpedidostatus == 4) statusBadge = '<span class="badge badge-warning">Pronto</span>';
                            else if (p.idpedidostatus == 5) statusBadge = '<span class="badge badge-success">Concluído</span>';
                            else if (p.idpedidostatus == 7) statusBadge = '<span class="badge badge-danger">Conta Solicitada</span>';
                            else statusBadge = `<span class="badge badge-secondary">Status ${p.idpedidostatus}</span>`;

                            html += `
                            <div class="card mb-2 shadow-sm border-0">
                                <div class="card-body p-3">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="mb-0 font-weight-bold color-primary">Pedido #${p.idpedido} - ${p.nomecliente}</h6>
                                        ${statusBadge}
                                    </div>
                                    <div class="d-flex justify-content-between text-muted small">
                                        <span>R$ ${(p.total || 0).toFixed(2).replace('.', ',')}</span>
                                        <span>${new Date(p.datacadastro).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>`;
                        });

                        html = `
                        <div class="alert border-0 text-center mb-3" style="background-color: var(--brand-primary-soft, #fff0e3); color: var(--color-primary, #f58637);">
                            <small class="d-block text-uppercase mb-1">Total Movimentado nas Mesas</small>
                            <h4 class="mb-0 font-weight-bold">R$ ${totalGanhos.toFixed(2).replace('.', ',')}</h4>
                        </div>
                        ${html}`;
                    }

                    document.getElementById('lista-historico').innerHTML = html;
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('modalHistorico')).show();
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

    abrirModalPagamento: () => {
        if (!garcom.pedidoAtual) return;

        const total = garcom.method.calcularTotalCarrinho();
        document.getElementById('lblTotalMesaModal').innerText = 'R$ ' + total.toFixed(2).replace('.', ',');

        // Resetar form: ativar botão Dinheiro e mostrar troco
        document.getElementById('ddlFormaPagamentoGarcom').value = '1';
        document.getElementById('txtValorRecebidoGarcom').value  = '';
        document.getElementById('lblTrocoGarcom').innerText      = 'R$ 0,00';
        document.getElementById('lblTrocoGarcom').className      = 'text-success font-weight-bold';
        document.getElementById('container-troco-garcom').classList.remove('d-none');

        // Reativar botão correto
        document.querySelectorAll('.btn-forma-pag').forEach((btn, idx) => {
            btn.classList.toggle('active', idx === 0); // Dinheiro = índice 0
        });

        bootstrap.Modal.getOrCreateInstance(document.getElementById('modalPagamentoGarcom')).show();
    },

    // Substitui mudarFormaPagamento para o novo seletor de botões
    selecionarFormaPagamento: (valor, btn) => {
        document.querySelectorAll('.btn-forma-pag').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('ddlFormaPagamentoGarcom').value = String(valor);
        const containerTroco = document.getElementById('container-troco-garcom');
        if (valor === 1) {
            containerTroco.classList.remove('d-none');
        } else {
            containerTroco.classList.add('d-none');
            document.getElementById('txtValorRecebidoGarcom').value = '';
            document.getElementById('lblTrocoGarcom').innerText     = 'R$ 0,00';
            document.getElementById('lblTrocoGarcom').className     = 'text-success font-weight-bold';
        }
    },

    // Mantido para compatibilidade (acionado pelo select legado se houver)
    mudarFormaPagamento: () => {
        const val = parseInt(document.getElementById('ddlFormaPagamentoGarcom').value, 10);
        const containerTroco = document.getElementById('container-troco-garcom');
        if (val === 1) {
            containerTroco.classList.remove('d-none');
        } else {
            containerTroco.classList.add('d-none');
            document.getElementById('txtValorRecebidoGarcom').value = '';
            document.getElementById('lblTrocoGarcom').innerText     = 'R$ 0,00';
        }
    },

    // Bug #3: usar calcularTotalCarrinho()
    calcularTroco: () => {
        const total = garcom.method.calcularTotalCarrinho();
        const valorRecebido = parseFloat(document.getElementById('txtValorRecebidoGarcom').value) || 0;
        const lblTroco = document.getElementById('lblTrocoGarcom');

        if (valorRecebido > 0) {
            const troco = valorRecebido - total;
            lblTroco.innerText  = 'R$ ' + troco.toFixed(2).replace('.', ',');
            lblTroco.className  = troco < 0 ? 'text-danger font-weight-bold' : 'text-success font-weight-bold';
        } else {
            lblTroco.innerText  = 'R$ 0,00';
            lblTroco.className  = 'text-success font-weight-bold';
        }
    },

    receberConta: () => {
        if (!garcom.pedidoAtual) return;

        // Bug #10: usar calcularTotalCarrinho()
        const total = garcom.method.calcularTotalCarrinho();
        const formaPagamento  = document.getElementById('ddlFormaPagamentoGarcom').value;
        const valorRecebido   = parseFloat(document.getElementById('txtValorRecebidoGarcom').value) || 0;
        let trocoReal = null;

        if (formaPagamento === '1') {
            if (valorRecebido > 0 && valorRecebido < total) {
                app.method.mensagem('Valor recebido menor que o total!');
                return;
            }
            if (valorRecebido > total) {
                trocoReal = parseFloat((valorRecebido - total).toFixed(2));
            }
        }

        let dadosFechamento = {
            idpedido: garcom.pedidoAtual.idpedido,
            idformapagamento: parseInt(formaPagamento),
            troco: trocoReal,
            numero_mesa: garcom.pedidoAtual.numero_mesa
        };

        app.method.loading(true);
        app.method.post('/pedido/fechar', JSON.stringify(dadosFechamento),
            (response) => {
                app.method.loading(false);
                if (response.status === "error") {
                    app.method.mensagem(response.message);
                    return;
                }

                app.method.mensagem('Mesa fechada com sucesso!', 'green');
                bootstrap.Modal.getInstance(document.getElementById('modalPagamentoGarcom'))?.hide();
                bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();

                // Limpar context
                garcom.carrinho = [];
                garcom.pedidoAtual = null;
                document.getElementById('lblQtdItens').innerText = '0';

                // Ocultar a badge da mesa selecionada
                document.getElementById('lblMesaSelecionada').style.display = 'none';

                garcom.method.obterMesas();
            },
            (error) => {
                app.method.loading(false);
                console.log('error', error)
            }
        );
    },

    solicitarFechamentoConta: () => {
        if (!garcom.pedidoAtual) return;

        let dados = { idpedido: garcom.pedidoAtual.idpedido };
        app.method.loading(true);
        app.method.post('/pedido/solicitar-fechamento', JSON.stringify(dados),
            (response) => {
                app.method.loading(false);
                if (response.status === 'success') {
                    app.method.mensagem('Solicitação enviada ao PDV com sucesso!', 'green');
                    bootstrap.Modal.getInstance(document.getElementById('modalCarrinho'))?.hide();
                    bootstrap.Modal.getInstance(document.getElementById('modalPagamentoGarcom'))?.hide();
                } else {
                    app.method.mensagem(response.message);
                }
            },
            (error) => {
                app.method.loading(false);
                console.log(error);
            }
        );
    },

    // Melhoria #16: busca de produtos
    filtrarProdutosGarcom: (texto) => {
        texto = texto.trim().toLowerCase();
        const filtro = texto
            ? garcom.produtos.filter(p => p.nome.toLowerCase().includes(texto))
            : garcom.produtos;
        garcom.method.carregarProdutos(filtro);
    },

    logout: () => {
        app.method.limparSessao();
        window.location.href = '/painel/login-garcom.html';
    }
}
