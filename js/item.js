document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init();
  item.event.init();
});


var item = {};
var ITEM_ID = {};
var PRODUTO = {};
var VARIACOES = [];
var VARIACAO_SELECIONADA = null;
var VALIDACAOES = [];
var OPCIONAIS = [];
var OPCIONAIS_SELECIONADOS = [];
var QUANTIDADE_SELECIONADA = 1;

var PRODUTO_INDISPONIVEL = false;

item.event = {

  init: () => {
    let url = new URL(window.location.href);
    var p = url.searchParams.get('p');

    VALIDACAOES = [];
    OPCIONAIS = [];
    OPCIONAIS_SELECIONADOS = [];
    VARIACOES = [];
    VARIACAO_SELECIONADA = null;
    QUANTIDADE_SELECIONADA = 1;
    PRODUTO_INDISPONIVEL = false;

    if(p != null && p.trim() != '' && !isNaN(p)){
      ITEM_ID = p;
      item.method.obterDadosProduto();
    }else{
      window.location.href = '/index.html';
    }

  }

}

item.method = {
  obterDadosProduto: () => {
    app.method.loading(true);

    PRODUTO = {};

    app.method.get('/produto/' + ITEM_ID, 
      (response) => {
        console.log(response);
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        if (!response.data || response.data.length <= 0) {
          app.method.mensagem('Produto não encontrado.');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 1200);
          return;
        }

        let produto = response.data[0];
        PRODUTO = produto;

        if (produto.imagem != null) {
          document.getElementById('img-produto').style.backgroundImage = `url('../public/images/${produto.imagem}')`;
          document.getElementById('img-produto').style.backgroundSize = 'cover';
        } else {
          document.getElementById('img-produto').style.backgroundImage = `url('../public/images/default.jpg')`;
          document.getElementById('img-produto').style.backgroundSize = 'cover';
        }

        document.getElementById('titulo-produto').innerText = produto.nome;
        document.getElementById('descricao-produto').innerText = produto.descricao || '';
        document.getElementById('preco-produto').innerText = `R$ ${parseFloat(produto.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('btn-preco-produto').innerText = `R$ ${parseFloat(produto.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

        item.method.validarDisponibilidadeProduto(produto);
        item.method.obterVariacoesProduto();
        item.method.obterOpcionaisProduto();
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error);
      }, true
    );
  },
  
  obterVariacoesProduto: () => {
    app.method.get('/produto/variacoes/' + ITEM_ID, (response) => {
      if (response.status === 'success' && response.data && response.data.length > 0) {
        VARIACOES = response.data;
        let menorValor = Math.min(...VARIACOES.map(v => parseFloat(v.valor)));
        document.getElementById('preco-produto').innerHTML = `<span style="font-size: 11px; color: #777; font-weight: normal; display: block; margin-bottom: -2px;">A partir de</span>R$ ${menorValor.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('btn-preco-produto').innerText = 'Selecione um tamanho';
        item.method.carregarVariacoes();
      }
    });
  },

  carregarVariacoes: () => {
    let container = document.getElementById('listaVariacoes');
    container.classList.remove('hidden');
    container.innerHTML = `
      <div class="container-group mb-5">
        <span class="badge">Obrigatório</span>
        <p class="title-categoria mb-0"><b>Opções de Tamanho/Preço</b></p>
        <span class="sub-title-categoria">Escolha 1 opção</span>
        <div id="itensVariacoes"></div>
      </div>
    `;

    let itensHTML = '';
    VARIACOES.forEach(v => {
      let valorFormatado = `R$ ${parseFloat(v.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      itensHTML += `
        <div class="card card-opcionais mt-2" onclick="item.method.selecionarVariacao('${v.idvariacao}')">
          <div class="infos-produto-opcional">
            <p class="name mb-0"><b>${v.nome}</b></p>
            <p class="price mb-0"><b>${valorFormatado}</b></p>
          </div>
          <div class="checks">
            <label class="container-check">
              <input id="check-variacao-${v.idvariacao}" type="radio" name="radio-variacao" />
              <span class="checkmark radio"></span>
            </label>
          </div>
        </div>
      `;
    });
    document.getElementById('itensVariacoes').innerHTML = itensHTML;
  },

  selecionarVariacao: (idvariacao) => {
    VARIACAO_SELECIONADA = VARIACOES.find(v => v.idvariacao == idvariacao);
    document.getElementById('check-variacao-' + idvariacao).checked = true;
    item.method.atualizarSacola();
  },
  
  obterOpcionaisProduto: () => {
    OPCIONAIS = [];

    app.method.get('/opcional/produto/' + ITEM_ID, 
      (response) => {
        console.log(response);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        OPCIONAIS = response.data || [];

        if (PRODUTO_INDISPONIVEL) {
          document.querySelector('#listaOpcionais').innerHTML = '';
          document.querySelector('#listaOpcionaisSimples').innerHTML = '';
          return;
        }

        item.method.carregarOpcionais(response.data);
        item.method.carregarOpcionaisSimples(response.data);
      },
      (error) => {
        console.log('error', error);
      }, true
    );
  },

  carregarOpcionais: (lista) => {

    document.querySelector('#listaOpcionais').innerHTML = '';

    if(lista.length > 0) {
      // agrupa pelo tipo de seleção (opcionais de seleção);
      let listaSelecao = lista.filter((elem) => { return elem.tiposimples == 0 });

      let listaAgrupada = listaSelecao.reduce(function (obj, item) { 
        obj[item.idopcional] = obj[item.idopcional] || [];
        obj[item.idopcional].push(item);
        return obj
       }, {});

       console.log('lista agrupada: ', listaAgrupada);

       Object.entries(listaAgrupada).forEach((e, i) => {
        let opcional = e[1];
        let obrigatorio = '';
        let subtitulo = '';
        let itens = '';

        // valida se é obrigatório ou não e altera o subtítulo
        let minimo = opcional[0].minimo;
        let maximo = opcional[0].maximo;

        if(minimo == maximo) {
          if(minimo > 1) {
            subtitulo = `Escolha ${minimo} opções`;
            obrigatorio = `<span class="badge" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
            VALIDACAOES.push({idopcional: e[0]}); //deixa o id do opcional na variavel global pra saber que precisa ser validada
          }else {
            subtitulo = `Escolha 1 opção.`;
            obrigatorio = `<span class="badge" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
            VALIDACAOES.push({idopcional: e[0]}); //deixa o id do opcional na variavel global pra saber que precisa ser validada
          }
        }

        if(minimo < maximo) {
          if(minimo > 0) {
            subtitulo = `Escolha de ${minimo} até ${maximo} opções`;
            obrigatorio = `<span class="badge" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
            VALIDACAOES.push({idopcional: e[0]}); //deixa o id do opcional na variavel global pra saber que precisa ser validada
          }else{
            if(maximo > 1 ){
              subtitulo = `Escolha até ${maximo} opções`
            }else{
              subtitulo = `Escolha até 1 opção.`
            }
          }
        }

        let exibicao = opcional[0].exibicao; // 1 = lista, 2 = cards
        let containerClass = exibicao == 2 ? 'opcionais-cards-grid' : '';

        for (let index = 0; index < opcional.length; index++){
          let element = opcional[index];
          let valor = '';

          if(element.valoropcional > 0) {
            valor = `+ R$ ${parseFloat(element.valoropcional).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
          }

          let imgHtml = '';
          if (element.imagem) {
            imgHtml = exibicao == 2 
              ? `<div class="card-opcional-img" style="background-image: url('../public/images/${element.imagem}')"></div>`
              : `<div class="card-opcionais-img" style="background-image: url('../public/images/${element.imagem}')"></div>`;
          } else {
            imgHtml = exibicao == 2 
              ? `<div class="card-opcional-img no-img"><i class="fas fa-camera"></i></div>`
              : ``; // In list view, if no image, just don't render the image box to save space.
          }
  
          let descHtml = element.descricao ? `<p class="desc">${element.descricao}</p>` : '';

          let templateItem = exibicao == 2 ? item.template.opcionalItemCard : item.template.opcionalItem;

          itens += templateItem.replace(/\${idopcionalitem}/g, element.idopcionalitem)
          .replace(/\${nome}/g, element.nomeopcional)
          .replace(/\${valor}/g, valor)
          .replace(/\${idopcional}/g, e[0])
          .replace(/\${img}/g, imgHtml)
          .replace(/\${desc}/g, descHtml);
        }

        let temp = item.template.opcional.replace(/\${idopcional}/g, e[0])
          .replace(/\${obrigatorio}/g, obrigatorio)
          .replace(/\${titulo}/g, opcional[0].titulo)
          .replace(/\${sub-titulo}/g, subtitulo)
          .replace(/\${minimo}/g, minimo)
          .replace(/\${maximo}/g, maximo)
          .replace(/\${containerClass}/g, containerClass)
          .replace(/\${itens}/g, itens)

        document.querySelector('#listaOpcionais').innerHTML += temp;        
      })
    }

  },

  carregarOpcionaisSimples: (lista) => {
    
    let listaSimples = lista.filter((elem) => { return elem.tiposimples == 1 });
    
    let containerSimples = document.querySelector('#listaOpcionaisSimples');
    let boxSimples = document.querySelector('#containerOpcionaisSimples');

    if (containerSimples) containerSimples.innerHTML = '';
    
    if(listaSimples.length > 0) {
      if (boxSimples) boxSimples.classList.remove('hidden');

      listaSimples.forEach((e, i) => {
        
        let valor = '';

        if(e.valoropcional > 0) {
          valor = `+ R$ ${parseFloat(e.valoropcional).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`
        }

        let imgHtml = e.imagem 
            ? `<div class="card-opcionais-img" style="background-image: url('../public/images/${e.imagem}')"></div>`
            : '';
        let descHtml = e.descricao ? `<p class="desc">${e.descricao}</p>` : '';

        let temp = item.template.opcionalItemSimples.replace(/\${idopcionalitem}/g, e.idopcionalitem)
        .replace(/\${nome}/g, e.nomeopcional)
        .replace(/\${valor}/g, valor)
        .replace(/\${img}/g, imgHtml)
        .replace(/\${desc}/g, descHtml);

        if (containerSimples) containerSimples.innerHTML += temp;

      });
      
    }else{
      if (boxSimples) boxSimples.classList.add('hidden');
    }
  },

  // selecion o opcional
  selecionarOpcional: (idopcionalitem, idopcional) => {
    if (PRODUTO_INDISPONIVEL) return;
    let selecionado = document.querySelector("#check-opcional-" + idopcionalitem).checked;
    let inputSelecao = document.getElementsByClassName("paiopcional-" + idopcional);
    let opcional = OPCIONAIS.filter((e) => { return e.idopcionalitem == idopcionalitem });

    console.log('Selecionado', selecionado)
    console.log('InputSeleceção', inputSelecao)
    console.log('opcional', opcional)

    if(opcional[0].minimo === opcional[0].maximo){
      if(opcional[0].minimo > 1) {
        // validação mais de uma opção
        item.method.validacaoCheckMaisdeUmaOpcao(opcional, selecionado, idopcional, idopcionalitem, true);
      }else{
        item.method.validacaoCheckUmaOpcao(opcional, selecionado, idopcional, idopcionalitem, inputSelecao, true);
      }
      
    }
    
    if(opcional[0].minimo < opcional[0].maximo){
      if(opcional[0].minimo > 0) {
        item.method.validacaoCheckMaisdeUmaOpcao(opcional, selecionado, idopcional, idopcionalitem, true);
        
      }else{
        if(opcional[0].maximo > 0) {
          item.method.validacaoCheckMaisdeUmaOpcao(opcional, selecionado, idopcional, idopcionalitem);
        }else{
          item.method.validacaoCheckUmaOpcao(opcional, selecionado, idopcional, idopcionalitem);
        }
      }
    }
  },

  validarDisponibilidadeProduto: (produto) => {
  if (!produto) return;

  const ativo = Number(produto.ativo) === 1;
  const quantidade = Number(produto.quantidade || 0);

  if (!ativo) {
    PRODUTO_INDISPONIVEL = true;
    item.method.exibirProdutoIndisponivel(
      'Produto indisponível',
      'Este produto está desativado no momento.'
    );
    return;
  }

  if (quantidade <= 0) {
    PRODUTO_INDISPONIVEL = true;
    item.method.exibirProdutoIndisponivel(
      'Produto esgotado',
      'Este produto está sem estoque no momento.'
    );
    return;
  }

  PRODUTO_INDISPONIVEL = false;
  item.method.exibirProdutoDisponivel();
},

  exibirProdutoIndisponivel: (titulo, texto) => {
    const boxStatus = document.querySelector('#box-status-produto');
    const tituloStatus = document.querySelector('#titulo-status-produto');
    const textoStatus = document.querySelector('#texto-status-produto');
    const menuNormal = document.querySelector('#menu-bottom');
    const menuEsgotado = document.querySelector('#menu-bottom-esgotado');

    if (boxStatus) boxStatus.classList.remove('hidden');
    if (tituloStatus) tituloStatus.innerText = titulo;
    if (textoStatus) textoStatus.innerText = texto;

    if (menuNormal) menuNormal.classList.add('hidden');
    if (menuEsgotado) menuEsgotado.classList.remove('hidden');
  },

  exibirProdutoDisponivel: () => {
    const boxStatus = document.querySelector('#box-status-produto');
    const menuNormal = document.querySelector('#menu-bottom');
    const menuEsgotado = document.querySelector('#menu-bottom-esgotado');

    if (boxStatus) boxStatus.classList.add('hidden');
    if (menuEsgotado) menuEsgotado.classList.add('hidden');
    if (menuNormal) menuNormal.classList.remove('hidden');
  },

  validacaoCheckMaisdeUmaOpcao: (opcional, selecionado, idopcional, idopcionalitem, obrigatorio = false) => {
    let filtro = OPCIONAIS_SELECIONADOS.filter((e) => { return e.idopcional == idopcional});

    if(filtro.length >= opcional[0].maximo){
      if(selecionado){
        document.querySelector("#check-opcional-" + idopcionalitem).checked = false;
        app.method.mensagem(`Limite de ${opcional[0].maximo} opções atingido.`);
      }else{
        let outros = OPCIONAIS_SELECIONADOS.filter((e) => {return e.idopcionalitem != idopcionalitem});
        OPCIONAIS_SELECIONADOS = outros;
      }
    }else{
      if(selecionado) {
        OPCIONAIS_SELECIONADOS.push(opcional[0]);
      }else{
        let outros = OPCIONAIS_SELECIONADOS.filter((e) => {return e.idopcionalitem != idopcionalitem});
        OPCIONAIS_SELECIONADOS = outros;
      }
    }

    if(obrigatorio){
      let filtroOpcionais = OPCIONAIS_SELECIONADOS.filter((e) => { return e.idopcional == idopcional})

      if(filtroOpcionais.length >= opcional[0].maximo){
        let filtroValidacoes = VALIDACAOES.filter((e) => {return e.idopcional != idopcional});
        VALIDACAOES = filtroValidacoes;
        document.querySelector('#badge-obrigatorio-' + idopcional).innerHTML = '<i class="fas fa-check"></i>';
        
      }else{
        VALIDACAOES.push({ idopcional: idopcional });
        document.querySelector('#badge-obrigatorio-' + idopcional).innerHTML = 'Obrigatorio';
      }
    }

    item.method.atualizarSacola();

  },
  
  atualizarSacola: () => {
    let basePrice = VARIACAO_SELECIONADA ? parseFloat(VARIACAO_SELECIONADA.valor) : parseFloat(PRODUTO.valor);
    let valorProduto = basePrice * parseInt(QUANTIDADE_SELECIONADA);
    let valorOpcionais = 0;

    for (let index = 0;  index < OPCIONAIS_SELECIONADOS.length; index ++) {
      const element = OPCIONAIS_SELECIONADOS[index];

      const valorOpcional = parseFloat(element.valoropcional);

      if(valorOpcional > 0) {
        valorOpcionais += valorOpcional;
      }
    }

    let valorTotal = valorProduto + valorOpcionais;

    document.getElementById('btn-preco-produto').innerText = `R$ ${valorTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;    

    // Atualiza estado visual (selected) de todos os cards
    document.querySelectorAll('[id^="check-opcional-"]').forEach(chk => {
      let card = chk.closest('.card-opcionais') || chk.closest('.card-opcional-grid');
      if (card) {
        if (chk.checked) card.classList.add('selected');
        else card.classList.remove('selected');
      }
    });
  },
  
  adicionarAoCarrinho: () => {
    if (PRODUTO_INDISPONIVEL) {
      app.method.mensagem('Este produto está indisponível no momento.');
      return;
    }

    let observacao = document.querySelector('#txtObservacao').value.trim();

    if (VARIACOES.length > 0 && !VARIACAO_SELECIONADA) {
      app.method.mensagem("Selecione uma opção de tamanho/preço obrigatória.");
      return;
    }

    if (VALIDACAOES.length > 0) {
      app.method.mensagem("Selecione os campos obrigatórios.");
      return;
    }

    let carrinho = app.method.obterValorSessao('cart');

    let cart = {
      itens: []
    };

    if (carrinho != undefined) {
      cart = JSON.parse(carrinho);
    }

    let guid = app.method.criarGuid();

    cart.itens.push({
      guid: guid,
      idproduto: PRODUTO.idproduto,
      nome: PRODUTO.nome,
      imagem: PRODUTO.imagem,
      valor: VARIACAO_SELECIONADA ? VARIACAO_SELECIONADA.valor : PRODUTO.valor,
      quantidade: QUANTIDADE_SELECIONADA,
      observacao: observacao,
      opcionais: OPCIONAIS_SELECIONADOS,
      idvariacao: VARIACAO_SELECIONADA ? VARIACAO_SELECIONADA.idvariacao : null,
      nomevariacao: VARIACAO_SELECIONADA ? VARIACAO_SELECIONADA.nome : null
    });

    app.method.gravarValorSessao(JSON.stringify(cart), 'cart');

    // GA4 Event: add_to_cart
    if (typeof gtag === 'function') {
      let valorFinal = VARIACAO_SELECIONADA ? VARIACAO_SELECIONADA.valor : PRODUTO.valor;
      gtag('event', 'add_to_cart', {
        currency: 'BRL',
        value: parseFloat(valorFinal) * parseInt(QUANTIDADE_SELECIONADA),
        items: [{
          item_id: PRODUTO.idproduto,
          item_name: PRODUTO.nome,
          price: parseFloat(valorFinal),
          quantity: parseInt(QUANTIDADE_SELECIONADA)
        }]
      });
    }

    app.method.mensagem('Item adicionado ao carrinho.', 'green');

    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1500);
  },
  
  diminuirQuantidade: () => {
    if (PRODUTO_INDISPONIVEL) return;

    if (QUANTIDADE_SELECIONADA === 1) {
      return;
    }

    QUANTIDADE_SELECIONADA -= 1;
    document.querySelector('#qntd-carrinho').innerHTML = QUANTIDADE_SELECIONADA;
    item.method.atualizarSacola();
  },

  aumentarQuantidade: () => {
    if (PRODUTO_INDISPONIVEL) return;

    QUANTIDADE_SELECIONADA += 1;
    document.querySelector('#qntd-carrinho').innerHTML = QUANTIDADE_SELECIONADA;
    item.method.atualizarSacola();
  },

  aumentarQuantidade: () => {
    QUANTIDADE_SELECIONADA += 1;    
    document.querySelector('#qntd-carrinho').innerHTML = QUANTIDADE_SELECIONADA;
    item.method.atualizarSacola();
  },

  validacaoCheckUmaOpcao: (opcional, selecionado, idopcional, idopcionalitem, inputSelecao, obrigatorio = false) => {
    Array.from(inputSelecao).forEach((e) => {e.checked = false});

    let filtro = OPCIONAIS_SELECIONADOS.filter((e) => { return e.idopcional != idopcional});
    OPCIONAIS_SELECIONADOS = filtro;

    if(selecionado) {
      document.querySelector('#check-opcional-' + idopcionalitem).checked = true;
      OPCIONAIS_SELECIONADOS.push(opcional[0]);

      if(obrigatorio){        
        let filtroValidacoes = VALIDACAOES.filter((e) => {return e.idopcional != idopcional});
        VALIDACAOES = filtroValidacoes;
        document.querySelector('#badge-obrigatorio-' + idopcional).innerHTML = '<i class="fas fa-check"></i>';
      }
    }else{

      if(obrigatorio){
        VALIDACAOES.push({idopcional: idopcional});
        document.querySelector('#badge-obrigatorio-' + idopcional).innerHTML = 'Obrigatorio';
      }
    }

    item.method.atualizarSacola();
  },
  
  selecionarOpcionalSimples: (idopcionalitem) => {
    let selecionado = document.querySelector("#check-opcional-" + idopcionalitem).checked;
    let opcional = OPCIONAIS.filter((e) => { return e.idopcionalitem == idopcionalitem });

    if(selecionado) {
      let filtro = OPCIONAIS_SELECIONADOS.filter((e) => { return e.idopcionalitem == opcional[0].idopcionalitem});

      if(filtro.length <= 0) {
        OPCIONAIS_SELECIONADOS.push(opcional[0])
      }
    }else{
      let filtro = OPCIONAIS_SELECIONADOS.filter((e) => {return e.idopcionalitem != opcional[0].idopcionalitem});
      OPCIONAIS_SELECIONADOS = filtro;
    }

    item.method.atualizarSacola();
  },

}


item.template = {

  opcional: `
    <div class="container-group mb-5" data-minimo="\${minimo}" data-maximo=\${maximo} id="opcional-\${idopcional}">
    \${obrigatorio}

      <p class="title-categoria mb-0"><b>\${titulo}</b></p>
      <span class="sub-title-categoria">\${sub-titulo}</span>
      <div class="\${containerClass}">
        \${itens}
      </div>
    </div>
  `,

  opcionalItem: `
    <div class="card card-opcionais mt-2" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; item.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})">
      \${img}
      <div class="infos-produto-opcional">
        <p class="name mb-0"><b>\${nome}</b></p>
        \${desc}
        <p class="price mb-0"><b>\${valor}</b></p>
      </div>
      <div class="checks">
        <label class="container-check" onclick="event.stopPropagation();">
          <input id="check-opcional-\${idopcionalitem}" type="checkbox" class="paiopcional-\${idopcional}" onchange="item.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})" />
          <span class="checkmark"></span>
        </label>
      </div>
    </div>
  `,

  opcionalItemCard: `
    <div class="card-opcional-grid" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; item.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})">
      \${img}
      <div class="card-opcional-body">
        <p class="name"><b>\${nome}</b></p>
        \${desc}
        <p class="price">\${valor}</p>
      </div>
      <div class="checks" onclick="event.stopPropagation();">
        <label class="container-check">
          <input id="check-opcional-\${idopcionalitem}" type="checkbox" class="paiopcional-\${idopcional}" onchange="item.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})" />
          <span class="checkmark"></span>
        </label>
      </div>
    </div>
  `,

  opcionalItemSimples: `
    <div class="card card-opcionais mt-2" onclick="let chk = document.querySelector('#check-opcional-\${idopcionalitem}'); chk.checked = !chk.checked; item.method.selecionarOpcionalSimples('\${idopcionalitem}')">
      \${img}
      <div class="infos-produto-opcional">
        <p class="name mb-0"><b>\${nome}</b></p>
        \${desc}
        <p class="price mb-0"><b>\${valor}</b></p>
      </div>
      <div class="checks" onclick="event.stopPropagation();">
        <label class="container-check">
          <input id="check-opcional-\${idopcionalitem}" type="checkbox" onchange="item.method.selecionarOpcionalSimples('\${idopcionalitem}')" />
          <span class="checkmark"></span>
        </label>
      </div>
    </div>
  `,

}