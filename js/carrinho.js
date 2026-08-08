document.addEventListener("DOMContentLoaded", function (event) {
  carrinho.event.init();
});

var carrinho = {};
var CARRINHO_ATUAL = [];
var PRODUTO_SELECIONADO = '';
var TEMPO_DEFAULT = '';
var TAXAS_ENTREGA = [];
var TAXA_ATUAL = 0;
var TAXA_ATUAL_ID = null;

var FORMAS_PAGAMENTO = [];
var FORMA_SELECIONADA = null;
var TROCO = 0;

var CUPOM_ATUAL = null;
var DESCONTO_ATUAL = 0;

var PONTOS_CONFIG = null;
var PONTOS_SALDO = 0;
var PONTOS_RESGATADOS = false;

var CASHBACK_CONFIG = null;
var CASHBACK_SALDO = 0;
var CASHBACK_RESGATADO = false;
var VALOR_CASHBACK_USADO = 0;

var MODAL_ENDERECO = new bootstrap.Modal(document.getElementById('modalEndereco'));

var MODAL_EDITAR_PRODUTO = new bootstrap.Modal(
  document.getElementById('modalEditarProduto')
);

var PAGAMENTO_ONLINE = false;


carrinho.event = {
  init: () => {
    $(".cep").mask('00000-000');

    var SPMaskBehavior = function (val) {
      return val.replace(/\D/g, '').length === 11 ? '(00) 00000-0000' : '(00) 0000-00009';
    },
    spOptions = {
      onKeyPress: function(val, e, field, options) {
          field.mask(SPMaskBehavior.apply({}, arguments), options);
        }
    };

    $('.sp_celphones').mask(SPMaskBehavior, spOptions);

    carrinho.method.obterCarrinho();
    carrinho.method.obterTiposEntrega();
    carrinho.method.obterTaxaEntrega();
    carrinho.method.obterEndereco();
    carrinho.method.obterFormasPagamento();
    carrinho.method.obterBeneficiosCliente();
    carrinho.method.carregarDadosCliente();
  }
}

carrinho.method = {
  // carrega dados do cliente logado;
  carregarDadosCliente: () => {
    if (localStorage.getItem("usuarioLogado") === "true") {
      let nome = localStorage.getItem("clienteNome");
      let telefone = localStorage.getItem("clienteTelefone");
      
      if (nome) {
        document.getElementById("txtNomeSobrenome").value = nome;
      }
      
      if (telefone) {
        $('#txtCelular').val(telefone).trigger('input');
      }
    }
  },

  // itens do carrinho;

  // carrega o carrinho.
  obterCarrinho: () => {
    CARRINHO_ATUAL = [];

    let carrinhoLocal = app.method.obterValorSessao('cart');

    if(carrinhoLocal != undefined) {

      let cart = JSON.parse(carrinhoLocal);

      CARRINHO_ATUAL = cart.itens;

      if(cart.itens.length > 0){
        // exibe o carrinho
        document.querySelector("#carrinho-vazio").classList.add('hidden');
        document.querySelector("#carrinho-cheio").classList.remove('hidden');
        document.querySelector("#opcoes-entrega").classList.remove('hidden');
        document.querySelector("#btnFazerPedido").classList.remove('hidden');
        document.querySelector("#btnVoltar").classList.add('hidden');

        carrinho.method.carregarProdutosCarrinho(cart.itens);

        // GA4 Event: view_cart
        if (typeof gtag === 'function') {
          let eventItems = cart.itens.map(item => ({
            item_id: item.idproduto,
            item_name: item.nome,
            price: parseFloat(item.valor || 0),
            quantity: parseInt(item.quantidade || 1)
          }));
          let totalValue = eventItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
          gtag('event', 'view_cart', {
            currency: 'BRL',
            value: totalValue,
            items: eventItems
          });
        }

      }else{
        document.querySelector("#carrinho-vazio").classList.remove('hidden');
        document.querySelector("#carrinho-cheio").classList.add('hidden');
        document.querySelector("#opcoes-entrega").classList.add('hidden');
        document.querySelector("#btnFazerPedido").classList.add('hidden');
        document.querySelector("#btnVoltar").classList.remove('hidden');
      }

    }else{
      document.querySelector("#carrinho-vazio").classList.remove('hidden');
      document.querySelector("#carrinho-cheio").classList.add('hidden');
      document.querySelector("#opcoes-entrega").classList.add('hidden');
      document.querySelector("#btnFazerPedido").classList.add('hidden');
      document.querySelector("#btnVoltar").classList.remove('hidden');
    }
  },

  // carrega os produtos na tela;
  carregarProdutosCarrinho: (list) => {
    document.querySelector("#listaProdutos").innerHTML = '';

    list = list || [];

    if (list.length > 0) {
      list.forEach((e) => {
        let itens = '';
        let totalOpcionais = 0;

        if (e.opcionais && e.opcionais.length > 0) {
          for (let index = 0; index < e.opcionais.length; index++) {
            let element = e.opcionais[index];
            totalOpcionais += parseFloat(element.valoropcional || 0);

            itens += carrinho.template.opcional
              .replace(/\${nome}/g, `${element.nomeopcional}`)
              .replace(/\${preco}/g, `+R$ ${parseFloat(element.valoropcional || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
          }
        }

        let obs = '';

        if (e.observacao && e.observacao.length > 0) {
          obs = carrinho.template.obs.replace(/\${observacao}/g, e.observacao);
        }

        let subTotalItem = parseFloat(e.valor || 0) * parseInt(e.quantidade || 1);

        let nomeProdutoStr = `${e.quantidade}x ${e.nome}`;
        if (e.nomevariacao) {
          nomeProdutoStr += ` (${e.nomevariacao})`;
        }

        let temp = carrinho.template.produto
          .replace(/\${guid}/g, e.guid)
          .replace(/\${nome}/g, nomeProdutoStr)
          .replace(/\${preco}/g, `R$ ${subTotalItem.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
          .replace(/\${obs}/g, obs)
          .replace(/\${opcionais}/g, itens);

        document.querySelector('#listaProdutos').innerHTML += temp;
      });

      carrinho.method.atualizarValorTotal();
    }
  },

  atualizarValorTotal: () => {
    if (CARRINHO_ATUAL.length > 0) {
      let total = 0;

      CARRINHO_ATUAL.forEach((e) => {
        let subTotal = 0;

        if (e.opcionais && e.opcionais.length > 0) {
          for (let index = 0; index < e.opcionais.length; index++) {
            let element = e.opcionais[index];

            subTotal += parseFloat(element.valoropcional || 0);
          }
        }

        let valorProduto = (parseFloat(e.valor || 0) + subTotal) * parseInt(e.quantidade || 1);
        total += valorProduto;
      });

      if (TAXA_ATUAL > 0) {
        total += Number(TAXA_ATUAL);

        document.querySelector("#containerTaxaEntrega").classList.remove('hidden');
        document.querySelector("#lblTaxaEntrega").innerText = `+ R$ ${parseFloat(TAXA_ATUAL).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      } else {
        document.querySelector("#containerTaxaEntrega").classList.add('hidden');
        document.querySelector("#lblTaxaEntrega").innerText = '-';
      }

      let lblDescontoContainer = document.querySelector("#containerDesconto");
      if (!lblDescontoContainer) {
        let containerTaxa = document.getElementById("containerTaxaEntrega");
        if (containerTaxa) {
          containerTaxa.insertAdjacentHTML('beforebegin', `
            <div id="containerCupomArea" class="cupom-area mb-3">
              <div class="input-group input-group-sm shadow-sm" style="border-radius: 8px; overflow: hidden;">
                <span class="input-group-text bg-white border-end-0 text-warning"><i class="fas fa-ticket-alt"></i></span>
                <input type="text" id="txtCupom" class="form-control border-start-0 ps-0" placeholder="Código do cupom" style="text-transform: uppercase; box-shadow: none;">
                <button type="button" class="btn btn-yellow" onclick="carrinho.method.validarCupom()">Aplicar</button>
              </div>
            </div>
            <div id="containerBeneficiosArea" class="mb-3 hidden">
                <div id="containerPontosArea" class="pontos-area mb-2 hidden">
                    <div class="d-flex justify-content-between align-items-center p-2 shadow-sm" style="border-radius: 8px; border: 1px solid #dee2e6;">
                        <div>
                            <span class="text-primary"><i class="fas fa-star"></i> Meus Pontos: <b id="lblSaldoPontos">0</b></span>
                            <div style="font-size: 12px; color: #6c757d;" id="lblRegraPontos"></div>
                        </div>
                        <button type="button" id="btnResgatarPontos" class="btn btn-sm btn-primary" onclick="carrinho.method.toggleResgatePontos()">Resgatar</button>
                    </div>
                </div>
                <div id="containerCashbackArea" class="cashback-area mb-2 hidden">
                    <div class="d-flex justify-content-between align-items-center p-2 shadow-sm" style="border-radius: 8px; border: 1px solid #dee2e6;">
                        <div>
                            <span class="text-success"><i class="fas fa-money-bill-wave"></i> Meu Cashback: <b id="lblSaldoCashback">R$ 0,00</b></span>
                            <div style="font-size: 12px; color: #6c757d;" id="lblRegraCashback">Será abatido do total</div>
                        </div>
                        <button type="button" id="btnResgatarCashback" class="btn btn-sm btn-success" onclick="carrinho.method.toggleResgateCashback()">Usar</button>
                    </div>
                </div>
            </div>
            <div class="linha-resumo hidden mb-2" id="containerDesconto" style="color: #28a745; font-weight: bold; display: flex; justify-content: space-between; font-size: 16px;">
              <span><i class="fas fa-tags"></i> Desconto</span>
              <span id="lblDesconto">- R$ 0,00</span>
            </div>
          `);
          lblDescontoContainer = document.querySelector("#containerDesconto");
          carrinho.method.atualizarUiBeneficios();
        }
      }

      DESCONTO_ATUAL = 0;
      VALOR_CASHBACK_USADO = 0;
      if (CUPOM_ATUAL) {
        
        if (PONTOS_RESGATADOS) {
          app.method.mensagem('Não é possível utilizar cupom e resgate de pontos na mesma compra. Resgate cancelado.', 'red');
          PONTOS_RESGATADOS = false;
        }
        if (CASHBACK_RESGATADO) {
          app.method.mensagem('Não é possível utilizar cupom e cashback na mesma compra. Cashback cancelado.', 'red');
          CASHBACK_RESGATADO = false;
        }
        carrinho.method.atualizarUiBeneficios();

        let valorminimo = Number(CUPOM_ATUAL.valorminimo || 0);
        let subtotalProdutos = total - (TAXA_ATUAL > 0 ? Number(TAXA_ATUAL) : 0);
        
        if (valorminimo > 0 && subtotalProdutos < valorminimo) {
            app.method.mensagem(`O cupom exige um pedido mínimo de R$ ${valorminimo.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 'red');
            CUPOM_ATUAL = null;
        } else {
            let limit = Number(CUPOM_ATUAL.limite || 0);
            if (CUPOM_ATUAL.tipo === 'fixo') {
                DESCONTO_ATUAL = Number(CUPOM_ATUAL.valor);
            } else if (CUPOM_ATUAL.tipo === 'percentual') {
                DESCONTO_ATUAL = total * (Number(CUPOM_ATUAL.valor) / 100);
            }
            if (limit > 0 && DESCONTO_ATUAL > limit) {
                DESCONTO_ATUAL = limit;
            }
            if (DESCONTO_ATUAL > total) DESCONTO_ATUAL = total;
            total -= DESCONTO_ATUAL;
        }
      } else if (PONTOS_RESGATADOS && PONTOS_CONFIG) {
        DESCONTO_ATUAL = Number(PONTOS_CONFIG.valorDesconto || 0);
        if (DESCONTO_ATUAL > total) DESCONTO_ATUAL = total;
        total -= DESCONTO_ATUAL;
      } else if (CASHBACK_RESGATADO && CASHBACK_CONFIG) {
        VALOR_CASHBACK_USADO = Number(CASHBACK_SALDO || 0);
        if (VALOR_CASHBACK_USADO > total) VALOR_CASHBACK_USADO = total;
        DESCONTO_ATUAL = VALOR_CASHBACK_USADO;
        total -= DESCONTO_ATUAL;
      }

      if (lblDescontoContainer) {
        if (DESCONTO_ATUAL > 0) {
          lblDescontoContainer.classList.remove('hidden');
          document.querySelector("#lblDesconto").innerText = `- R$ ${parseFloat(DESCONTO_ATUAL).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        } else {
          lblDescontoContainer.classList.add('hidden');
        }
      }

      document.querySelector("#lblTotalCarrinho").innerText = `R$ ${parseFloat(total).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      document.querySelector("#lblTotalCarrinhoBotao").innerText = `R$ ${parseFloat(total).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

      // Atualiza a UI de benefícios caso haja alteração de saldo/valores
      carrinho.method.atualizarUiBeneficios();
    }
  },

  abrirModalOpcoesProduto: (guid) => {
    PRODUTO_SELECIONADO = guid;
    document.querySelector('#modalActionsProduto').classList.remove('hidden');
  },
  
  fecharModalActionsProduto: () => {
    PRODUTO_SELECIONADO = '';
    document.querySelector('#modalActionsProduto').classList.add('hidden');
  },

  abrirModalEditarProduto: () => {

    if(PRODUTO_SELECIONADO.length <= 0){
      return;
    }

    let produto = CARRINHO_ATUAL.find((e) => {
      return e.guid == PRODUTO_SELECIONADO;
    });

    if(!produto){
      return;
    }

    document.getElementById('txtEditarProdutoNome').value = produto.nome;

    document.getElementById('txtEditarProdutoQuantidade').value =
      produto.quantidade;

    document.getElementById('txtEditarProdutoObservacao').value =
      produto.observacao || '';

    document.querySelector('#modalActionsProduto')
      .classList.add('hidden');

    MODAL_EDITAR_PRODUTO.show();

    carrinho.method.carregarTodosOpcionaisProduto(produto);

  },

  carregarTodosOpcionaisProduto: (produto) => {
    let container = document.getElementById('listaEditarProdutoOpcionais');

    if (produto.is_avulso) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
      <div class="text-center p-3">
        Carregando adicionais...
      </div>
    `;

    app.method.get(
      `/opcional/produto/${produto.idproduto}`,

      (response) => {
        if (response.status == 'error') {
          app.method.mensagem(response.message);
          return;
        }

        produto.todosopcionais = response.data || [];

        let carrinhoLocal = app.method.obterValorSessao('cart');

        if (carrinhoLocal != undefined) {
          let cart = JSON.parse(carrinhoLocal);

          let produtoCart = cart.itens.find((e) => {
            return e.guid == produto.guid;
          });

          if (produtoCart) {
            produtoCart.todosopcionais = produto.todosopcionais;

            app.method.gravarValorSessao(
              JSON.stringify(cart),
              'cart'
            );
          }
        }

        carrinho.method.carregarOpcionaisEditarProduto(produto);
      },

      (error) => {
        console.log(error);
        app.method.mensagem('Erro ao carregar opcionais.');
      },

      true
    );
  },

  carregarOpcionaisEditarProduto: (produto) => {
    let container = document.getElementById('listaEditarProdutoOpcionais');

    container.innerHTML = '';

    let opcionais = produto.todosopcionais || [];

    if (opcionais.length <= 0) {
      container.innerHTML = `
        <div class="opcional-empty">
          Nenhum adicional disponível.
        </div>
      `;
      return;
    }

    let grupos = {};

    opcionais.forEach((item) => {
      let chave = item.idopcional;

      if (!grupos[chave]) {
        grupos[chave] = {
          titulo: item.titulo,
          minimo: parseInt(item.minimo || 0),
          maximo: parseInt(item.maximo || 0),
          tiposimples: parseInt(item.tiposimples || 0),
          itens: []
        };
      }

      grupos[chave].itens.push(item);
    });

    Object.keys(grupos).forEach((idopcional) => {
      let grupo = grupos[idopcional];

      let textoRegra = '';

      if (grupo.minimo > 0 && grupo.maximo > 0) {
        textoRegra = `Escolha de ${grupo.minimo} até ${grupo.maximo}`;
      } else if (grupo.minimo > 0) {
        textoRegra = `Escolha no mínimo ${grupo.minimo}`;
      } else if (grupo.maximo > 0) {
        textoRegra = `Escolha até ${grupo.maximo}`;
      } else {
        textoRegra = `Opcional`;
      }

      let htmlGrupo = `
        <div class="grupo-opcional-edit"
            data-idopcional="${idopcional}"
            data-minimo="${grupo.minimo}"
            data-maximo="${grupo.maximo}">

          <div class="grupo-opcional-header">
            <div>
              <p class="grupo-opcional-titulo mb-0">
                <b>${grupo.titulo}</b>
              </p>
              <span class="grupo-opcional-regra">
                ${textoRegra}
              </span>
            </div>

            ${grupo.minimo > 0 ? '<span class="badge">Obrigatório</span>' : ''}
          </div>

          <div class="grupo-opcional-alerta hidden" id="alertaOpcional_${idopcional}">
            Selecione uma opção obrigatória.
          </div>
      `;

      grupo.itens.forEach((opcional) => {
        let selecionado = produto.opcionais.find((o) => {
          return o.idopcionalitem == opcional.idopcionalitem;
        });

        let checked = selecionado ? 'checked' : '';

        htmlGrupo += `
          <label class="opcional-card-edit ${checked ? 'opcional-card-selected' : ''}">
            <div class="opcional-card-info">
              <p class="opcional-card-name mb-0">
                <b>${opcional.nomeopcional}</b>
              </p>

              <span class="opcional-card-price">
                + R$ ${parseFloat(opcional.valoropcional || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
              </span>
            </div>

            <input
              type="checkbox"
              class="opcional-card-check"
              id="chkOpcional_${opcional.idopcionalitem}"
              data-idopcional="${idopcional}"
              onchange="carrinho.method.validarSelecaoOpcional('${idopcional}')"
              ${checked}
            >
          </label>
        `;
      });

      htmlGrupo += `</div>`;

      container.innerHTML += htmlGrupo;
    });
  },

  validarSelecaoOpcional: (idopcional) => {
    let grupo = document.querySelector(`[data-idopcional="${idopcional}"]`);

    if (!grupo) {
      return true;
    }

    let maximo = parseInt(grupo.getAttribute('data-maximo') || 0);

    let checks = document.querySelectorAll(
      `.opcional-card-check[data-idopcional="${idopcional}"]`
    );

    let selecionados = Array.from(checks).filter((c) => c.checked);

    if (maximo > 0 && selecionados.length > maximo) {
      let ultimoMarcado = selecionados[selecionados.length - 1];
      ultimoMarcado.checked = false;

      app.method.mensagem(`Você pode selecionar no máximo ${maximo} opção(ões).`);

      return false;
    }

    checks.forEach((check) => {
      let card = check.closest('.opcional-card-edit');

      if (card) {
        if (check.checked) {
          card.classList.add('opcional-card-selected');
        } else {
          card.classList.remove('opcional-card-selected');
        }
      }
    });

    return true;
  },

  validarOpcionaisObrigatorios: () => {
    let grupos = document.querySelectorAll('.grupo-opcional-edit');

    for (let i = 0; i < grupos.length; i++) {
      let grupo = grupos[i];

      let idopcional = grupo.getAttribute('data-idopcional');
      let minimo = parseInt(grupo.getAttribute('data-minimo') || 0);

      let checks = document.querySelectorAll(
        `.opcional-card-check[data-idopcional="${idopcional}"]`
      );

      let selecionados = Array.from(checks).filter((c) => c.checked);

      let alerta = document.getElementById(`alertaOpcional_${idopcional}`);

      if (minimo > 0 && selecionados.length < minimo) {
        if (alerta) {
          alerta.classList.remove('hidden');
          alerta.innerText = `Selecione pelo menos ${minimo} opção(ões).`;
        }

        grupo.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        return false;
      } else {
        if (alerta) {
          alerta.classList.add('hidden');
        }
      }
    }

    return true;
  },

  salvarEdicaoProdutoCarrinho: () => {
    let quantidade = parseInt(
      document.getElementById('txtEditarProdutoQuantidade').value
    );

    if (isNaN(quantidade) || quantidade <= 0) {
      app.method.mensagem('Informe uma quantidade válida.');
      return;
    }

    if(!carrinho.method.validarOpcionaisObrigatorios()) {
      return;
    }

    let observacao = document
      .getElementById('txtEditarProdutoObservacao')
      .value
      .trim();

    let carrinhoLocal = app.method.obterValorSessao('cart');

    if (carrinhoLocal == undefined) {
      app.method.mensagem('Carrinho não encontrado.');
      return;
    }

    let cart = JSON.parse(carrinhoLocal);

    let produto = cart.itens.find((e) => {
      return e.guid == PRODUTO_SELECIONADO;
    });

    let produtoTela = CARRINHO_ATUAL.find((e) => {
      return e.guid == PRODUTO_SELECIONADO;
    });

    if (!produto) {
      app.method.mensagem('Produto não encontrado.');
      return;
    }

    produto.quantidade = quantidade;
    produto.observacao = observacao;
    produto.opcionais = [];

    let todosOpcionais =
      produto.todosopcionais ||
      produtoTela?.todosopcionais ||
      [];

    produto.todosopcionais = todosOpcionais;

    todosOpcionais.forEach((opcional) => {
      let checkbox = document.getElementById(
        `chkOpcional_${opcional.idopcionalitem}`
      );

      if (checkbox && checkbox.checked) {
        produto.opcionais.push({
          idopcional: opcional.idopcional,
          idopcionalitem: opcional.idopcionalitem,
          titulo: opcional.titulo,
          nomeopcional: opcional.nomeopcional,
          valoropcional: parseFloat(opcional.valoropcional || 0)
        });
      }
    });

    app.method.gravarValorSessao(
      JSON.stringify(cart),
      'cart'
    );

    CARRINHO_ATUAL = cart.itens;

    MODAL_EDITAR_PRODUTO.hide();

    PRODUTO_SELECIONADO = '';

    carrinho.method.obterCarrinho();

    app.method.mensagem('Pedido atualizado!', 'green');
  },
  removerProdutoCarrinho: () => {

    if(PRODUTO_SELECIONADO.length > 0) {
      let carrinhoLocal = app.method.obterValorSessao('cart');
      if(carrinho != undefined) {
        let cart = JSON.parse(carrinhoLocal);

        if(cart.itens.length > 0){
          let outros = cart.itens.filter((e) => {return e.guid != PRODUTO_SELECIONADO});
          cart.itens = outros;

          app.method.gravarValorSessao(JSON.stringify(cart), 'cart');

          carrinho.method.obterCarrinho();

          PRODUTO_SELECIONADO = '';
          document.querySelector('#modalActionsProduto').classList.add('hidden');

          app.method.mensagem('Item removido', 'green');

        }
      }
    }
  },

  adicionarProdutoCarrinho: () => {
    window.location.href = './index.html';
  },

  // fim itens do carrniho

  validarCupom: () => {
    // DICA: Crie um input no seu HTML com o ID "txtCupom" para usar aqui
    let inputCupom = document.getElementById("txtCupom");
    let codigo = inputCupom ? inputCupom.value.trim() : prompt("Informe o código do cupom:");
    let idempresa = localStorage.getItem("idempresa");
    let idcliente = localStorage.getItem("idcliente");

    if(!codigo || !idempresa) {
      app.method.mensagem("Informe o código do cupom.");
      return;
    }

    app.method.loading(true);
    app.method.post('/fidelizacao/validar-cupom', JSON.stringify({ idempresa: Number(idempresa), codigo: codigo, idcliente: idcliente ? Number(idcliente) : 0 }),
      (response) => {
        app.method.loading(false);
        if(response.status === 'error') {
          app.method.mensagem(response.message, 'red');
          CUPOM_ATUAL = null;
          carrinho.method.atualizarValorTotal();
          return;
        }
        CUPOM_ATUAL = response.data;
        app.method.mensagem("Cupom aplicado!", "green");
        carrinho.method.atualizarValorTotal();
      },
      (error) => {
        app.method.loading(false);
        app.method.mensagem("Erro ao validar cupom.", 'red');
      }
    );
  },

  // Tipo Entrega

  obterTiposEntrega: () => {
    CARRINHO_ATUAL = [];

    let carrinhoLocal = app.method.obterValorSessao('cart');

    if(carrinhoLocal != undefined) {

      let cart = JSON.parse(carrinhoLocal);

      CARRINHO_ATUAL = cart.itens;

      if(cart.itens.length > 0){
        // exibe o carrinho
        document.querySelector("#carrinho-vazio").classList.add('hidden');
        document.querySelector("#carrinho-cheio").classList.remove('hidden');
        document.querySelector("#opcoes-entrega").classList.remove('hidden');
        document.querySelector("#btnFazerPedido").classList.remove('hidden');
        document.querySelector("#btnVoltar").classList.add('hidden');

        carrinho.method.carregarProdutosCarrinho(cart.itens);

      }else{
        document.querySelector("#carrinho-vazio").classList.remove('hidden');
        document.querySelector("#carrinho-cheio").classList.add('hidden');
        document.querySelector("#opcoes-entrega").classList.add('hidden');
        document.querySelector("#btnFazerPedido").classList.add('hidden');
        document.querySelector("#btnVoltar").classList.remove('hidden');
      }

    }else{
      document.querySelector("#carrinho-vazio").classList.remove('hidden');
      document.querySelector("#carrinho-cheio").classList.add('hidden');
      document.querySelector("#opcoes-entrega").classList.add('hidden');
      document.querySelector("#btnFazerPedido").classList.add('hidden');
      document.querySelector("#btnVoltar").classList.remove('hidden');
    }

    app.method.get('/entrega/tipo', 
      (response) => {
        app.method.loading(false);
        console.log(response);

        if(response.status == "error"){
          app.method.mensagem(response.message)
          return;
        }

        let retirada = response.data.filter((e) => { return e.idtipoentrega == 1 });
        let delivery = response.data.filter((e) => { return e.idtipoentrega == 2 });

       if(delivery[0].ativo){
        let tempo = '';

        if((delivery[0].tempominimo != null && delivery[0].tempominimo > 0) &&
          (delivery[0].tempomaximo != null && delivery[0].tempomaximo > 0)){
            tempo = `(${delivery[0].tempominimo}-${delivery[0].tempomaximo}min)`;
          }

          TEMPO_DEFAULT = tempo;
          document.querySelector("#containerTipoEntrega").classList.remove('hidden');
       }

       if(retirada[0].ativo){
        let tempo = '';

        if((retirada[0].tempominimo != null && retirada[0].tempominimo > 0) &&
          (retirada[0].tempominimo != null && retirada[0].tempominimo > 0)){
            tempo = `(${retirada[0].tempominimo}-${retirada[0].tempomaximo}min)`;
          }

          document.querySelector("#lblTipoRetiradaTempo").innerText = `Retirada ${tempo}`;
          document.querySelector("#containerTipoRetirada").classList.remove('hidden');
       }

      },
      (error) =>{
        app.method.loading(false);
        console.log('error', error)
      },
    )
  },

  changeTipoEntrega: () => {
    let check = document.querySelector("#chkEntrega").checked;

    if(check) {
      document.querySelector("#containerEnderecoEntrega").classList.remove('hidden');

      document.querySelector("#chkRetirada").checked = false;

      carrinho.method.validarEnderecoSelecionado();

    }else{
      document.querySelector("#containerEnderecoEntrega").classList.add('hidden');
      document.querySelector("#containerTaxaEntrega").classList.add('hidden');
      
      TAXA_ATUAL = 0;
      TAXA_ATUAL_ID = null;

      carrinho.method.atualizarValorTotal();
    }
  },

  changeTipoRetirada: () => {
    let check = document.querySelector("#chkRetirada").checked;

    if(check) {
      document.querySelector("#containerEnderecoEntrega").classList.add('hidden');

      document.querySelector("#chkEntrega").checked = false;

      carrinho.method.validarEnderecoSelecionado();

      document.querySelector("#containerTaxaEntrega").classList.add('hidden');
    }
      
    TAXA_ATUAL = 0;
    TAXA_ATUAL_ID = null;

    carrinho.method.atualizarValorTotal();
  },

  obterTaxaEntrega: () => {
    app.method.get('/entrega/taxa', 
      (response) => {
        app.method.loading(false);
        console.log(response);

        if(response.status == "error"){
          app.method.mensagem(response.message)
          return;
        }

        TAXAS_ENTREGA = response.data;

      },
      (error) =>{
        app.method.loading(false);
        console.log('error', error)
      },
    )
  },

  validarEnderecoSelecionado: () => {
    if(TAXAS_ENTREGA.length == 0){
      document.querySelector('#containerTaxaEntrega').classList.add('hidden');
      return;
    }

    if(TAXAS_ENTREGA[0].idtaxaentregatipo == 1) {
      TAXA_ATUAL = TAXAS_ENTREGA[0].valor;
      TAXA_ATUAL_ID = TAXAS_ENTREGA[0].idtaxaentrega;

      let tempo = ''
      
      if((TAXAS_ENTREGA[0].tempominimo != null && TAXAS_ENTREGA[0].tempominimo > 0) &&
        (TAXAS_ENTREGA[0].tempomaximo != null && TAXAS_ENTREGA[0].tempomaximo > 0)){
        tempo = `(${TAXAS_ENTREGA[0].tempominimo}-${TAXAS_ENTREGA[0].tempomaximo}min)`;
      }else{
        tempo = TEMPO_DEFAULT;
      }

      document.querySelector("#lblTipoEntregaTempo").innerText = `Entrega ${tempo}`;

    }
    
    if(TAXAS_ENTREGA[0].idtaxaentregatipo == 2) {

      // valida se é a retirada que está checada
      let retirada = document.querySelector("#chkRetirada").checked;
      
      if(retirada){
        return;
      }

      let enderecoAtual = app.method.obterValorSessao('address');

      if(enderecoAtual != undefined) {

        let endereco = JSON.parse(enderecoAtual);

        let ruaNormalizada = endereco.endereco
          .replace(/^R\.\s*/i, 'Rua ')
          .replace(/^Av\.\s*/i, 'Avenida ')
          .replace(/\s+/g, ' ')
          .trim();

        let dados = {
          endereco: `${ruaNormalizada}, ${endereco.numero} - Bairro ${endereco.bairro}, ${endereco.cidade} - ${endereco.estado}, ${endereco.cep}, Brasil`,
          bairro: endereco.bairro,
          cep: endereco.cep,
          latitude: endereco.latitude || null,
          longitude: endereco.longitude || null
        };

        app.method.loading(true);

        app.method.post('/pedido/taxa', JSON.stringify(dados),
          (response) => {
            console.log('response', response)
            app.method.loading(false);

            if(response.status === 'error'){
              app.method.mensagem(response.message)
              return;
            }

            TAXA_ATUAL = response.taxa;
            TAXA_ATUAL_ID = response.idtaxa;

            carrinho.method.atualizarValorTotal();

            let filtro_taxa = TAXAS_ENTREGA.filter((e) => { return e.idtaxaentrega == TAXA_ATUAL_ID });

            if(filtro_taxa.length > 0) {
              let tempo = ''
        
              if((filtro_taxa[0].tempominimo != null && filtro_taxa[0].tempominimo > 0) &&
                (filtro_taxa[0].tempomaximo != null && filtro_taxa[0].tempomaximo > 0)){
                tempo = `(${filtro_taxa[0].tempominimo}-${filtro_taxa[0].tempomaximo}min)`;
              }else{
                tempo = TEMPO_DEFAULT;
              }
  
              document.querySelector("#lblTipoEntregaTempo").innerText = `Entrega ${tempo}`;
            }


            
            // app.method.mensagem(response.message, 'green');
          
          },
          (error) => {
            console.log('error', error);
            app.method.loading(false);
          }
        );


      }
      else{
        TAXA_ATUAL = 0;
        TAXA_ATUAL_ID = null;
      }
    }
    
    if(TAXAS_ENTREGA[0].idtaxaentregatipo == 3) {
      TAXA_ATUAL = 0;

      document.querySelector("#lblTipoEntregaTempo").innerText = `Entrega ${TEMPO_DEFAULT}`;
    }

    carrinho.method.atualizarValorTotal();
  },

  // endereço;

  obterEndereco: () => {
    // obtém o endereço selecionado do local storage
    let enderecoAtual = app.method.obterValorSessao('address');
    
    if(enderecoAtual != undefined){
      let endereco=JSON.parse(enderecoAtual);
      document.querySelector("#lblEnderecoSelecionado").innerText = `${endereco.endereco}, ${endereco.numero}, ${endereco.bairro} ${endereco.complemento ? ` - ${endereco.complemento}` : ''}`;

      document.querySelector("#lblCepEnderecoSelecionado").innerText = `${endereco.cidade}-${endereco.estado} / ${endereco.cep}`

      document.querySelector("#cardAddEndereco").classList.add('hidden');
      document.querySelector("#cardEnderecoSelecionado").classList.remove('hidden');

    }else{
      document.querySelector("#cardAddEndereco").classList.remove('hidden');
      document.querySelector("#cardEnderecoSelecionado").classList.add('hidden');
    }
  },

  // abre modal para informar endereço;
  abrirModalEndereco: () => {
    MODAL_ENDERECO.show();
  },


  // salva o endereço no local storage
  salvarEndereco: () => {
    let cep =  document.getElementById("txtCEP").value.trim();
    let endereco = document.getElementById("txtEndereco").value.trim();
    let bairro = document.getElementById("txtBairro").value.trim();
    let numero = document.getElementById("txtNumero").value.trim();
    let cidade = document.getElementById("txtCidade").value.trim();
    let complemento = document.getElementById("txtComplemento").value.trim();
    let uf = document.getElementById("ddlUf").value.trim();

    if(cep.length <= 0){
      app.method.mensagem('Informe o CEP, por favor');
      document.getElementById("txtCEP").focus();
      return;
    }

    if(endereco.length <= 0){
      app.method.mensagem('Informe o endereço, por favor');
      document.getElementById("txtEndereco").focus();
      return;
    }

    if(bairro.length <= 0){
      app.method.mensagem('Informe o bairro, por favor');
      document.getElementById("txtBairro").focus();
      return;
    }

    if(numero.length <= 0){
      app.method.mensagem('Informe o numero, por favor');
      document.getElementById("txtNumero").focus();
      return;
    }

    if(cidade.length <= 0){
      app.method.mensagem('Informe a cidade, por favor');
      document.getElementById("txtCidade").focus();
      return;
    }

    if(uf == "-1"){
      app.method.mensagem('Informe o estado, por favor');
      document.getElementById("ddlUf").focus();
      return;
    }

    // let dados = {
    //   cep: cep.replace(/\D/g,''),
    //   endereco: endereco,
    //   bairro: bairro,
    //   cidade: cidade,
    //   estado: uf,
    //   numero: numero,
    //   complemento: complemento
    // }

    let dados = {
      latitude: endereco.latitude,
      longitude: endereco.longitude,
      endereco: `${endereco.endereco}, ${endereco.numero} - Bairro ${endereco.bairro}, ${endereco.cidade} - ${endereco.estado}, ${endereco.cep}, Brasil`
    };

    app.method.gravarValorSessao(JSON.stringify(dados), 'address');

    if (!navigator.geolocation) {
      app.method.mensagem('Seu navegador não suporta geolocalização.');
      return;
    }

    app.method.loading(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        let dados = {
          cep: cep,
          endereco: endereco,
          bairro: bairro,
          cidade: cidade,
          estado: uf,
          numero: numero,
          complemento: complemento,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          precisaoGps: pos.coords.accuracy
        };

        app.method.gravarValorSessao(JSON.stringify(dados), 'address');

        carrinho.method.obterEndereco();
        carrinho.method.validarEnderecoSelecionado();

        app.method.loading(false);
        MODAL_ENDERECO.hide();
      },
      (error) => {
        app.method.loading(false);
        app.method.mensagem('Permita o acesso à localização para validar a entrega.');
        console.log(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  },

  // API ViaCEP
  buscarCep: () => {
    var cep = document.getElementById('txtCEP').value.trim().replace(/\D/g, '');

    if(cep != ''){
      // expressaõ regular para validar o CEP;
      var validacep = /^[0-9]{8}$/;

      // valida o formato do CEP;
      if(validacep.test(cep)){
        // cria um elemento javascript
        var script = document.createElement('script');

        // sincroniza com o callback
        script.src = 'https://viacep.com.br/ws/' + cep + '/json/?callback=carrinho.method.callbackCep';

        // insere o scirpt no documento e carregado o conteúdo
        document.body.appendChild(script);

      }else{
        app.method.mensagem('Formato do CEP inválido.');
        document.getElementById('txtCEP').focus();
      }
    }
    else {
      app.method.mensagem('Informe o CEP, por favor.');
      document.getElementById('txtCEP').focus();
    }

  },

  // metodo chamado quando retorna algo da API de CEP
  callbackCep: (dados) => {
    if(!("error" in dados)) {
      // atualiza os campos com os valores retornados;
      document.getElementById("txtEndereco").value = dados.logradouro;
      document.getElementById("txtBairro").value = dados.bairro;
      document.getElementById("txtCidade").value = dados.localidade;
      document.getElementById("ddlUf").value = dados.uf;
      document.getElementById("txtNumero").focus();

    }else{
      app.method.mensagem('CEP não encontrado. Preencha as informaçõe manualmente');
      document.getElementById('txtEndereco').focus();

    }
  },

  abrirModalOpcoesEndereco: () => {

    document.querySelector('#modalActionsEndereco').classList.remove('hidden');
  },

  fecharModalActionsEndereco: () => {
    document.querySelector('#modalActionsEndereco').classList.add('hidden');
  },

  editarEnderecoCarrinho: () => {

    let enderecoAtual = app.method.obterValorSessao('address');

    if(enderecoAtual != undefined){
      let endereco = JSON.parse(enderecoAtual);
      
      document.getElementById("txtCEP").value = endereco.cep;
      document.getElementById("txtEndereco").value = endereco.endereco;
      document.getElementById("txtBairro").value = endereco.bairro;
      document.getElementById("txtNumero").value = endereco.numero;
      document.getElementById("txtCidade").value = endereco.cidade;
      document.getElementById("ddlUf").value = endereco.estado;
      document.getElementById("txtComplemento").value = endereco.complemento;

      document.querySelector('#modalActionsEndereco').classList.add('hidden');

      MODAL_ENDERECO.show();
      
    }
   
  },
  
  removerEnderecoCarrinho: () => {
    localStorage.removeItem('address');

    carrinho.method.obterEndereco();
    carrinho.method.validarEnderecoSelecionado();

    document.querySelector('#modalActionsEndereco').classList.add('hidden');   
  },

  // ----------- FORMAS DE PAGAMENTO ----------- //

  obterFormasPagamento: () => {

    app.method.get('/formapagamento', 
      (response) => {
        // app.method.loading(false);
        console.log(response);

        if(response.status == "error") {
          app.method.mensagem(response.message)
          return;
        }

        // console.log('Formas pagamento: ', response.data);
        FORMAS_PAGAMENTO = response.data;

        carrinho.method.carregaFormasPagamento(response.data);
      },
      (error) =>{
        app.method.loading(false);
        console.log('error', error)
      }, true
    )
  },

  carregaFormasPagamento: (list) => {
    if(list.length > 0) {

      let pagamentoonline = list.filter((e) => { return e.idformapagamento === 5 });

      if(pagamentoonline.length > 0) {
        
        document.getElementById('container-como-pagar').classList.add('hidden');
        document.getElementById('lblFazerPedido').innerText = 'Realizar Pagamento';
        PAGAMENTO_ONLINE = true;

      } else {

        document.getElementById('container-como-pagar').classList.remove('hidden');
        document.getElementById('lblFazerPedido').innerText = 'Fazer Pedido';
        PAGAMENTO_ONLINE = false;

      }

      list.forEach((e, i) => {
        
        let temp = `<a href="#!" onclick="carrinho.method.selecionarFormaPagamento('${e.idformapagamento}')">${e.nome} </a>`

        document.querySelector("#modalActionsFormaPagamento .container-modal-actions").innerHTML += temp;

        if((i + 1) == list.length) {
          document.querySelector("#modalActionsFormaPagamento .container-modal-actions").innerHTML += `<a href="#!" class="color-red" onclick="carrinho.method.selecionarFormaPagamento('')">Remover</a>`
        }

        // <a href="#!" onclick="carrinho.method.editarEnderecoCarrinho()">Editar endereço</a>
        // <a href="#!" class="color-red" onclick="carrinho.method.removerEnderecoCarrinho()">Remover</a>

      })
    } else{
      document.querySelector("#formasPagamento").remove();
    }
  },

  abrirModalFormaPagamento: () => {
    document.querySelector('#modalActionsFormaPagamento').classList.remove('hidden');
  },

  fecharModalActionsFormaPagamento: () => {
    document.querySelector('#modalActionsFormaPagamento').classList.add('hidden');
  },

  selecionarFormaPagamento: (forma) => {
    let selecionada = FORMAS_PAGAMENTO.filter((e) => { return e.idformapagamento == forma});

    TROCO = 0;

    if(selecionada.length > 0) {
      FORMA_SELECIONADA = selecionada[0];

      document.querySelector('#cardFormaPagamentoSelecionada').classList.remove('hidden');
      document.querySelector('#cardAddFormaPagamento').classList.add('hidden');

      document.querySelector('#lblFormaPagamentoSelecionada').innerText = FORMA_SELECIONADA.nome;

      // se for PIX
      if(FORMA_SELECIONADA.idformapagamento == 1) {
        document.querySelector('#lblDescFormaPagamentoSelecionada').innerText = `Pagamento na entrega do pedido.`
        document.querySelector('#iconFormaPagamentoSelecionada').innerHTML = `<i class="fas fa-receipt"></i>`
      }
      // se for cartão
      else if (FORMA_SELECIONADA.idformapagamento == 2){
        let troco = prompt("Qual o valor do troco?");
        if(troco != null){

          let _teste = parseFloat(troco);
          if(isNaN(_teste) || troco.trim == '' || _teste <= 1) {
            TROCO = 0;
            document.querySelector('#lblDescFormaPagamentoSelecionada').innerText = `Pagamento na entrega do pedido.`
          }
          else{
            TROCO = _teste;
            document.querySelector('#lblDescFormaPagamentoSelecionada').innerText = `Troco para: R$${(_teste).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} reais.`
          }
        }else{
          document.querySelector('#lblDescFormaPagamentoSelecionada').innerText = `Pagamento na entrega do pedido.`
        }

        document.querySelector('#iconFormaPagamentoSelecionada').innerHTML= `<i class= "fas fa-coins"></i>`
      }
      // se for cartão
      else {
        document.querySelector('#lblDescFormaPagamentoSelecionada').innerText = `Pagamento na entrega do pedido.`
        document.querySelector('#iconFormaPagamentoSelecionada').innerHTML = `<i class="fas fa-credit-card"></i>`
      }

    }else{
      document.querySelector('#cardFormaPagamentoSelecionada').classList.add('hidden');
      document.querySelector('#cardAddFormaPagamento').classList.remove('hidden');

      FORMA_SELECIONADA = null;
    }

    carrinho.method.fecharModalActionsFormaPagamento();
  },


  fazerPedido: () => {
    // GA4 Event: begin_checkout
    if (CARRINHO_ATUAL.length > 0 && typeof gtag === 'function') {
      let eventItems = CARRINHO_ATUAL.map(item => ({
        item_id: item.idproduto,
        item_name: item.nome,
        price: parseFloat(item.valor || 0),
        quantity: parseInt(item.quantidade || 1)
      }));
      let totalValue = eventItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      gtag('event', 'begin_checkout', {
        currency: 'BRL',
        value: totalValue,
        items: eventItems
      });
    }

    if(CARRINHO_ATUAL.length > 0) {
      if (localStorage.getItem("usuarioLogado") !== "true") {
        app.method.mensagem("Você precisa estar logado para fazer o pedido.");
        setTimeout(() => {
          window.location.href = '/login.html';
        }, 1500);
        return;
      }

      let checkEntrega = document.querySelector('#chkEntrega').checked;
      let checkRetirada = document.querySelector('#chkRetirada').checked;

      if(!checkEntrega && !checkRetirada) {
        app.method.mensagem("Selecione entrega ou retirada.");
        return;
      }

      // obtem o endereço selecionado do localstorage
      let enderecoAtual = app.method.obterValorSessao('address');

      if(checkEntrega && enderecoAtual == undefined){
        app.method.mensagem("Informe o endereço de entrega");
        return;
      }

      let enderecoSelecionado = enderecoAtual != undefined ? JSON.parse(enderecoAtual) : null;

      let nome = $('#txtNomeSobrenome').val().trim();
      let celular = $('#txtCelular').val().trim();

      if(nome.length <= 0) {
        app.method.mensagem("Informe Nome e Sobrenome, por favor.");
        return;
      }

      if(celular.length <= 0){
        app.method.mensagem("informe o celular, por favor.");
        return;
      }

      let total = 0;
    
    CARRINHO_ATUAL.forEach((e) => {
      let subTotal = 0;

      if (e.opcionais && e.opcionais.length > 0) {
        for (let index = 0; index < e.opcionais.length; index++) {
          let element = e.opcionais[index];

          subTotal += parseFloat(element.valoropcional || 0);
        }
      }


      subTotal += parseFloat(e.valor || 0);
      total += subTotal * parseInt(e.quantidade || 1);
    });

    // Adiciona taxa de entrega ao total
    if(TAXA_ATUAL > 0) {
      total += Number(TAXA_ATUAL);
    }

    // Abate o desconto do total
    if(DESCONTO_ATUAL > 0) {
      total -= Number(DESCONTO_ATUAL);
      if(total < 0) total = 0;
    }

    // Garante que o total está em formato numérico correto (sem formatação)
    total = parseFloat(total.toFixed(2));
    // ===== FIM DO CÁLCULO =====

    let idcliente = localStorage.getItem("idcliente");

      let cartPedido = CARRINHO_ATUAL.map((produto) => {
        return {
          ...produto,
          quantidade: parseInt(produto.quantidade || 1),
          valor: parseFloat(produto.valor || 0),

          opcionais: (produto.opcionais || []).map((opcional) => {
            return {
              idopcional: opcional.idopcional,
              idopcionalitem: opcional.idopcionalitem,
              titulo: opcional.titulo,
              nomeopcional: opcional.nomeopcional,
              valoropcional: parseFloat(opcional.valoropcional || 0)
            };
          })
        };
      });

      let dados = {
        entrega: checkEntrega,
        retirada: checkRetirada,
        cart: cartPedido,
        endereco: enderecoSelecionado,
        idtaxaentregatipo: TAXAS_ENTREGA[0].idtaxaentregatipo,
        idtaxaentrega: TAXA_ATUAL_ID,
        taxaentrega: parseFloat(Number(TAXA_ATUAL).toFixed(2)),
        total: total,
        troco: TROCO,
        nomecliente: nome,
        telefonecliente: celular,
        idempresa: localStorage.getItem("idempresa") ? Number(localStorage.getItem("idempresa")) : null,
        idcliente: idcliente ? Number(idcliente) : null,
        idcupom: CUPOM_ATUAL ? CUPOM_ATUAL.idcupom : null,
        desconto: parseFloat(Number(DESCONTO_ATUAL).toFixed(2)),
        resgatarPontos: PONTOS_RESGATADOS,
        pontosResgatados: PONTOS_RESGATADOS && PONTOS_CONFIG ? Number(PONTOS_CONFIG.pontosParaDesconto) : 0,
        resgatarCashback: CASHBACK_RESGATADO,
        cashbackResgatado: parseFloat(Number(VALOR_CASHBACK_USADO).toFixed(2))
      };

      if(PAGAMENTO_ONLINE){

        dados.idformapagamento = 5;

        app.method.gravarValorSessao(JSON.stringify(dados), 'sub-order');

        window.location.href = ('/pagamento.html');

      } else {

        if(FORMA_SELECIONADA == null) {
          app.method.mensagem("Selecione a forma de pagamento");
          return;
        }
        dados.idformapagamento = FORMA_SELECIONADA.idformapagamento;

        // tudo ok, faz o pedido;
        app.method.loading(true);
        
        app.method.post('/pedido', JSON.stringify(dados),
          (response) => {
            console.log('response', response)
            app.method.loading(false);

            if(response.status === 'error'){
              app.method.mensagem(response.message)
              return;
            }
            
            // GA4 Event: purchase (Local/Pagamento na Entrega)
            if (typeof gtag === 'function') {
              let eventItems = cartPedido.map(item => ({
                item_id: item.idproduto,
                item_name: item.nome,
                price: item.valor,
                quantity: item.quantidade
              }));
              gtag('event', 'purchase', {
                transaction_id: response.order,
                currency: 'BRL',
                value: total,
                shipping: parseFloat(Number(TAXA_ATUAL).toFixed(2)),
                coupon: CUPOM_ATUAL ? CUPOM_ATUAL.codigo : null,
                items: eventItems
              });
            }
            app.method.mensagem("Pedido realizado!", 'green');

            // salva o novo pedido
            dados.order = response.order;

            console.log('DADOS ENVIADOS DO PEDIDO: ', dados)

            app.method.gravarValorSessao(JSON.stringify(dados), 'order');

            setTimeout(() => {
              localStorage.removeItem('cart');
              window.location.href = '/pedido.html'
            }, 1000);
          
          },
          (error) => {
            console.log('error', error);
            app.method.loading(false);
          }, true
        );
      }

    }else{
      app.method.mensagem("Nenhum item no carrinho.")
    }
  },

  obterBeneficiosCliente: () => {
    let idempresa = localStorage.getItem("idempresa");
    let idcliente = localStorage.getItem("idcliente") || 0;

    app.method.get(`/fidelizacao/beneficios/${idempresa}/${idcliente}`,
        (response) => {
            if (response.status === 'success' && response.data) {
                if (response.data.pontos && response.data.pontos.config) {
                    PONTOS_CONFIG = response.data.pontos.config;
                    PONTOS_SALDO = response.data.pontos.saldo;
                }
                if (response.data.cashback && response.data.cashback.config) {
                    CASHBACK_CONFIG = response.data.cashback.config;
                    CASHBACK_SALDO = response.data.cashback.saldo;
                }
                carrinho.method.atualizarUiBeneficios();
            }
        },
        (error) => {
            console.log("Erro ao obter pontos", error);
        }
    );
  },

  toggleResgatePontos: () => {
      if (CUPOM_ATUAL) {
          app.method.mensagem("Você já utilizou um cupom de desconto. O sistema não permite usar pontos e cupons na mesma compra.", "red");
          return;
      }
      if (CASHBACK_RESGATADO) {
          CASHBACK_RESGATADO = false;
          app.method.mensagem("O uso do cashback foi cancelado para aplicar os pontos.", "yellow");
      }

      let btn = document.getElementById("btnResgatarPontos");
      if (!PONTOS_RESGATADOS) {
          if (PONTOS_SALDO < Number(PONTOS_CONFIG.pontosParaDesconto)) {
              app.method.mensagem("Você não tem saldo suficiente para realizar o resgate.", "red");
              return;
          }
          PONTOS_RESGATADOS = true;
          app.method.mensagem("Pontos resgatados com sucesso!", "green");
      } else {
          PONTOS_RESGATADOS = false;
          app.method.mensagem("Resgate de pontos cancelado.", "yellow");
      }
      
      carrinho.method.atualizarUiBeneficios();
      carrinho.method.atualizarValorTotal();
  },

  toggleResgateCashback: () => {
      if (CUPOM_ATUAL) {
          app.method.mensagem("Você já utilizou um cupom de desconto. O sistema não permite usar cashback e cupons na mesma compra.", "red");
          return;
      }
      if (PONTOS_RESGATADOS) {
          PONTOS_RESGATADOS = false;
          app.method.mensagem("O resgate de pontos foi cancelado para usar o cashback.", "yellow");
      }

      if (!CASHBACK_RESGATADO) {
          if (CASHBACK_SALDO <= 0) {
              app.method.mensagem("Você não tem saldo de cashback para resgatar.", "red");
              return;
          }
          CASHBACK_RESGATADO = true;
          app.method.mensagem("Cashback resgatado com sucesso!", "green");
      } else {
          CASHBACK_RESGATADO = false;
          app.method.mensagem("Resgate de cashback cancelado.", "yellow");
      }

      carrinho.method.atualizarUiBeneficios();
      carrinho.method.atualizarValorTotal();
  },

  atualizarUiBeneficios: () => {
      let area = document.getElementById("containerBeneficiosArea");
      if (!area) return;

      let hasBeneficio = false;
      let idcliente = localStorage.getItem("idcliente") || 0;

      let pontosAtivo = PONTOS_CONFIG && Number(PONTOS_CONFIG.ativo) === 1;
      let cashbackAtivo = CASHBACK_CONFIG && Number(CASHBACK_CONFIG.ativo) === 1;

      if (idcliente <= 0 && (pontosAtivo || cashbackAtivo)) {
          let alertaHtml = `
            <div id="containerAvisoFidelidade" class="alert alert-info mb-2">
              <i class="fas fa-info-circle"></i> Para obter e resgatar pontos e cashback, <a href="./login.html" style="font-weight:bold; color:#0c5460; text-decoration:underline;">faça o login</a>!
            </div>
          `;
          
          let avisoExistente = document.getElementById("containerAvisoFidelidade");
          if (!avisoExistente) {
              area.insertAdjacentHTML('afterbegin', alertaHtml);
          }
          area.classList.remove("hidden");

          // Esconde as áreas de resgate porque o cliente não está logado
          let areaPontos = document.getElementById("containerPontosArea");
          if (areaPontos) areaPontos.classList.add("hidden");

          let areaCashback = document.getElementById("containerCashbackArea");
          if (areaCashback) areaCashback.classList.add("hidden");

          return;
      }

      // Update Pontos UI
      let areaPontos = document.getElementById("containerPontosArea");
      if (areaPontos && pontosAtivo) {
          areaPontos.classList.remove("hidden");
          hasBeneficio = true;
          
          let pontosNecessarios = Number(PONTOS_CONFIG.pontosParaDesconto);
          let valorDesconto = Number(PONTOS_CONFIG.valorDesconto);

          let regra = `Utilize ${pontosNecessarios} pontos para ganhar R$ ${valorDesconto.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} de desconto.`;
          document.getElementById("lblRegraPontos").innerText = regra;

          let btn = document.getElementById("btnResgatarPontos");
          if (PONTOS_RESGATADOS) {
              document.getElementById("lblSaldoPontos").innerText = (PONTOS_SALDO - pontosNecessarios);
              btn.innerText = "Cancelar";
              btn.classList.remove("btn-primary");
              btn.classList.add("btn-danger");
          } else {
              document.getElementById("lblSaldoPontos").innerText = PONTOS_SALDO;
              btn.innerText = "Resgatar";
              btn.classList.remove("btn-danger");
              btn.classList.add("btn-primary");
              
              if (PONTOS_SALDO < pontosNecessarios) {
                  btn.disabled = true;
              } else {
                  btn.disabled = false;
              }
          }
      }

      // Update Cashback UI
      let areaCashback = document.getElementById("containerCashbackArea");
      if (areaCashback && cashbackAtivo && CASHBACK_SALDO > 0) {
          areaCashback.classList.remove("hidden");
          hasBeneficio = true;

          let btn = document.getElementById("btnResgatarCashback");
          if (CASHBACK_RESGATADO) {
              document.getElementById("lblSaldoCashback").innerText = `R$ ${parseFloat(CASHBACK_SALDO - VALOR_CASHBACK_USADO).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
              btn.innerText = "Cancelar";
              btn.classList.remove("btn-success");
              btn.classList.add("btn-danger");
          } else {
              document.getElementById("lblSaldoCashback").innerText = `R$ ${parseFloat(CASHBACK_SALDO).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
              btn.innerText = "Usar";
              btn.classList.remove("btn-danger");
              btn.classList.add("btn-success");
          }
      }

      if (hasBeneficio) {
          area.classList.remove("hidden");
      } else {
          area.classList.add("hidden");
      }
  }

}

carrinho.template = {

  produto: `
    <div class="card mb-2 pr-0">
      <div class="container-detalhes">
        <div class="detalhes-produto">
          <div class="infos-produto">
            <p class="name"><b>\${nome}</b></p>
            <p class="price"><b>\${preco}</b></p>
          </div>
          \${opcionais}
          \${obs}
        </div> 
        <div class="detalhes-produto-edit" onclick="carrinho.method.abrirModalOpcoesProduto('\${guid}')">
          <i class="fas fa-pencil-alt"></i>
        </div>
      </div>
    </div>
  `,

  opcional: `
    <div class="infos-produto">
      <p class="name-opcional mb-0">\${nome}</p>
      <p class="price-opcional mb-0">\${preco}</p>
    </div>
  `,

  obs: `
    <div class="infos-produto">
      <p class="obs-opcional mb-0">- \${observacao}</p>
      <!-- <p class="price-opcional mb-0">R$ 39,90</p> -->
    </div>
  `,

}