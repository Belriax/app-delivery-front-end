document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init(true);
  cardapio.event.init();
});


var cardapio = {
  state: {
    produtos: [],
    categorias: [],
    termoBusca: ''
  }
}

cardapio.event = {

  init: () => {
    cardapio.method.obterDadosEmpresa();
    cardapio.method.obterItensCarrinho();
    cardapio.method.obterCategorias();
    cardapio.method.obterDestaques();
    cardapio.method.iniciarBusca();
  }

}


cardapio.method = {
  irTopo: () => {
  // remove active de todos
    Array.from(document.querySelectorAll('.item-categoria'))
      .forEach(e => e.classList.remove('active'));

    // ativa o botão home
    document.querySelector('#categoria-home').classList.add('active');

    // rola para o topo
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  },
  iniciarBusca: () => {
  const input = document.querySelector('#inputBuscaProduto');

  if (!input) return;

  input.addEventListener('input', function () {
    cardapio.state.termoBusca = this.value.trim().toLowerCase();
    cardapio.method.renderizarProdutosFiltrados();
  });
},

  obterDestaques: () => {

  app.method.get('/produto/destaques',
    (response) => {

      if(response.status === 'error') {
        return;
      }

      cardapio.method.carregarDestaques(response.data);

    },
    (error) => {
      console.log('error', error)
    }
  )
},

  carregarDestaques: (list) => {
    if (!list || list.length === 0) return;

    const container = document.querySelector("#secaoDestaques");
    container.innerHTML = cardapio.templates.headerDestaques;

    const lista = document.querySelector("#listaDestaques");

    list.slice(0, 5).forEach((e, index) => {
      let _imagem = e.imagem || 'default.jpg';

      const maisVendido = index === 0
        ? `<div class="selo-mais-vendido">🔥 Mais vendido</div>`
        : '';

      const esgotado = Number(e.quantidade) <= 0
        ? `<div class="faixa-esgotado">Esgotado</div>`
        : '';

      const classeEsgotado = Number(e.quantidade) <= 0
        ? 'destaque-esgotado'
        : '';

      let temp = cardapio.templates.produtoDestaque
        .replace(/\${idproduto}/g, e.idproduto)
        .replace(/\${nome}/g, e.nome)
        .replace(/\${imagem}/g, _imagem)
        .replace(/\${descricao}/g, e.descricao || '')
        .replace(/\${valor}/g, parseFloat(e.valor).toFixed(2).replace('.', ','))
        .replace(/\${seloMaisVendido}/g, maisVendido)
        .replace(/\${faixaEsgotado}/g, esgotado)
        .replace(/\${classeEsgotado}/g, classeEsgotado);

      lista.innerHTML += temp;
    });
  },

  obterDadosEmpresa: () => {
    app.method.get('/empresa',
      (response) => {

        console.log(response);

        if(response.status === 'error') {
          app.method.mensagem(response.message)
          return;
        }

        document.querySelector("#lblNomeEmpresa").innerText = response.data[0].nome;

        if(response.data[0].logotipo != null){
          document.querySelector("#imgLogoEmpresa").style.backgroundImage = `url('/public/images/empresa/${response.data[0].logotipo}')`;
          document.querySelector("#imgLogoEmpresa").style.backgroundSize = 'cover';
        }
        else {
          document.querySelector("#imgLogoEmpresa").remove()
        }

      },
      (error) => {
        app.method.loading(false);
        console.log('error', error)
      }
    )
  },
  
  obterCategorias: () => {
    app.method.get('/categoria',
      (response) => {

        console.log(response);

        if(response.status === 'error') {
          app.method.mensagem(response.message)
          return;
        }

        cardapio.method.carregarCategorias(response.data);

      },
      (error) => {
        app.method.loading(false);
        console.log('error', error)
      }
    )
  },
  
  carregarCategorias: (list) => {
    cardapio.state.categorias = list;
    if(list.length > 0) {
      document.querySelector("#listaCategorias").innerHTML = '';

      document.querySelector("#listaItensCardapio").innerHTML = '';
      document.querySelector("#listaCategorias").innerHTML = `
        <button type="button" id="categoria-home" class="item-categoria btn btn-white btn-sm mb-3 me-3 active"
          onclick="cardapio.method.irTopo()">
          <i class="fas fa-home"></i>
        </button>
      `;

      list.forEach((e, i) => {
        let active = '';

        let iconeCategoria = '';
        let _icone = ICONES.filter((icone) => { return icone.name === e.icone });

        if(_icone.length > 0){
          iconeCategoria = _icone[0].icon;
        }

        if(i == 0) {
          active = 'active';
        }

        let temp = cardapio.templates.categoria.replace(/\${idcategoria}/g, e.idcategoria)
          .replace(/\${active}/g, active)
          .replace(/\${icone}/g, iconeCategoria)
          .replace(/\${nome}/g, e.nome)

        document.querySelector("#listaCategorias").innerHTML += temp;
        
        let tempHeaderCategoria = cardapio.templates.headerCategoria.replace(/\${idcategoria}/g, e.idcategoria)
        .replace(/\${nome}/g, e.nome)
        
        document.querySelector("#listaItensCardapio").innerHTML += tempHeaderCategoria;

        if(list.length == (i + 1)){
          cardapio.method.obterProdutos();

          // quando rolar inicia a validação dos scroll setando a categoria ativa;
          document.addEventListener("scroll", (event) => {
            cardapio.method.validarCategoriaScroll();
          })
        }
      });
    }
  },

  obterProdutos: () => {

    app.method.loading(true);

    app.method.get('/produto',
      (response) => {

        console.log(response);
        app.method.loading(false);

        if(response.status === 'error') {
          app.method.mensagem(response.message)
          return;
        }

        cardapio.method.carregarProdutos(response.data);

      },
      (error) => {
        app.method.loading(false);
        console.log('error', error)
      }
    )
  },

  // carrega os produtos na tela;
  carregarProdutos: (list) => {
  cardapio.state.produtos = list || [];
  cardapio.method.renderizarProdutosFiltrados();
},
renderizarProdutosFiltrados: () => {
  const termo = cardapio.state.termoBusca;
  const produtos = cardapio.state.produtos || [];
  const categorias = cardapio.state.categorias || [];

  document.querySelector("#listaItensCardapio").innerHTML = '';

  if (!categorias.length) return;

  categorias.forEach((categoria) => {
    const produtosDaCategoria = produtos.filter((produto) => {
      const pertenceCategoria = String(produto.idcategoria) === String(categoria.idcategoria);

      if (!pertenceCategoria) return false;

      if (!termo) return true;

      const nome = (produto.nome || '').toLowerCase();
      const descricao = (produto.descricao || '').toLowerCase();

      return nome.includes(termo) || descricao.includes(termo);
    });

    if (!produtosDaCategoria.length) return;

    let tempHeaderCategoria = cardapio.templates.headerCategoria
      .replace(/\${idcategoria}/g, categoria.idcategoria)
      .replace(/\${nome}/g, categoria.nome);

    document.querySelector("#listaItensCardapio").innerHTML += tempHeaderCategoria;

    produtosDaCategoria.forEach((e) => {
      let _imagem = e.imagem ? e.imagem : 'default.jpg';

      let statusEstoque = Number(e.quantidade) <= 0
        ? `<span class="badge bg-warning text-dark">Esgotado</span>`
        : '';

      let temp = cardapio.templates.produto
        .replace(/\${idproduto}/g, e.idproduto)
        .replace(/\${nome}/g, e.nome)
        .replace(/\${imagem}/g, _imagem)
        .replace(/\${descricao}/g, e.descricao || '')
        .replace(/\${valor}/g, parseFloat(e.valor).toFixed(2).replace('.', ','))
        .replace(/\${statusEstoque}/g, statusEstoque);

      document.querySelector("#categoria-header-" + e.idcategoria).innerHTML += temp;
    });
  });

  cardapio.method.renderizarMensagemSemResultados();
},
renderizarMensagemSemResultados: () => {
  const container = document.querySelector("#listaItensCardapio");
  const jaTemProduto = container.querySelector('.item-cardapio');
  const termo = cardapio.state.termoBusca;

  const msgAntiga = document.querySelector('#msg-sem-resultados');
  if (msgAntiga) msgAntiga.remove();

  if (!jaTemProduto && termo) {
    container.innerHTML = `
      <div id="msg-sem-resultados" class="card text-center">
        <p class="mb-1"><b>Nenhum item encontrado</b></p>
        <p class="mb-0">Tente buscar por outro nome.</p>
      </div>
    `;
  }
},

  abrirProduto: (id) => {
    window.location.href = `/item.html?p=${id}`;
  },


  validarCategoriaScroll: () => {
    var categorias = document.querySelector("#listaItensCardapio")
      .getElementsByClassName('container-group');

    let docViewTop = window.scrollY;

    // Se estiver no topo → ativa HOME
    if (docViewTop < 100) {
      Array.from(document.querySelectorAll('.item-categoria'))
        .forEach(e => e.classList.remove('active'));

      document.querySelector('#categoria-home').classList.add('active');
      return;
    }

    for (let index = 0; index < categorias.length; index++) {
      let element = categorias[index].getAttribute('id');

      let elemTop = document.querySelector('#' + element).offsetTop;
      let top = (elemTop - (docViewTop + 100)) * -1;
      let id = element.split('categoria-header-')[1];

      if (top > 0) {
        Array.from(document.querySelectorAll('.item-categoria'))
          .forEach(e => e.classList.remove('active'));

        document.querySelector('#categoria-' + id).classList.add('active');
      }
    }
  },

  selecionarCategoria: (id) => {
    Array.from(document.querySelectorAll('.item-categoria')).forEach(e => e.classList.remove('active'))
    document.querySelector('#categoria-' + id).classList.add('active');

    window.scrollTo({
      top: document.querySelector('#categoria-header-' + id).offsetTop - 90,
      behavior: 'smooth',
    })

  },

  obterItensCarrinho: () => {
    
    let carrinho = app.method.obterValorSessao('cart');

    if(carrinho != undefined){
      let cart = JSON.parse(carrinho);

      if (cart.itens.length > 0){
        document.querySelector("#icone-carrinho-vazio").classList.add('hidden');
        document.querySelector("#total-carrinho").classList.remove('hidden');
        document.querySelector("#total-carrinho").innerText = cart.itens.length;

      }else{
        document.querySelector("#icone-carrinho-vazio").classList.remove('hidden');
        document.querySelector("#total-carrinho").classList.add('hidden');
        document.querySelector("#total-carrinho").innerText = 0;

      }

    }else{
      document.querySelector("#icone-carrinho-vazio").classList.remove('hidden');
      document.querySelector("#total-carrinho").classList.add('hidden');
      document.querySelector("#total-carrinho").innerText = 0;
    }
  },
  
}

cardapio.templates = {
  headerDestaques: `
  <div class="container-group mb-4">
    <p class="title-categoria"><b>🔥 Destaques</b></p>
    <div class="carousel-destaques" id="listaDestaques"></div>
  </div>
`,

  produtoDestaque: `
    <div class="card destaque-card \${classeEsgotado}" onclick="cardapio.method.abrirProduto('\${idproduto}')">
      \${seloMaisVendido}

      <div class="container-img-produto destaque-img"
        style="background-image: url('./public/images/\${imagem}');">
        \${faixaEsgotado}
      </div>

      <div class="infos-produto p-2">
        <p class="name mb-1"><b>\${nome}</b></p>
        <p class="price mb-0"><b>R$ \${valor}</b></p>
      </div>
    </div>
  `,
  categoria: `
    <button type="button" id="categoria-\${idcategoria}" class="item-categoria btn btn-white btn-sm mb-3 me-3" onclick="cardapio.method.selecionarCategoria('\${idcategoria}')">
      \${icone}&nbsp; \${nome}
    </button>
  `,

  headerCategoria: `
    <div id="categoria-header-\${idcategoria}" class="container-group mb-5">
      <p class="title-categoria"><b>\${nome}</b></p>
    </div>
  `,
  
  produto: `
    <div class="card mb-2 item-cardapio" onclick="cardapio.method.abrirProduto('\${idproduto}')">
      <div class="d-flex">
        <div class="container-img-produto" style="background-image: url('./public/images/\${imagem}'); background-size: cover;"></div>
        <div class="infos-produto">
        <p class="name"><b>\${nome}</b> \${statusEstoque}</p>
          <p class="description">\${descricao}</p>
          <p class="price"><b>R$ \${valor}</b></p>
        </div>
      </div>
    </div>
  `
};