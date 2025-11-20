document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init(true);
  cardapio.event.init();
});


var cardapio = {}

cardapio.event = {

  init: () => {
    cardapio.method.obterDadosEmpresa();
    cardapio.method.obterItensCarrinho();
    cardapio.method.obterCategorias();
  }

}


cardapio.method = {
  
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
    if(list.length > 0) {
      document.querySelector("#listaCategorias").innerHTML = '';

      document.querySelector("#listaItensCardapio").innerHTML = '';

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
    
    if(list.length > 0) {
      
      list.forEach((e, i) => {
        let _imagem = e.imagem;
        
        if(e.imagem == null) {
          _imagem = 'default.jpg';
        }

        let temp = cardapio.templates.produto.replace(/\${idproduto}/g, e.idproduto)
          .replace(/\${nome}/g, e.nome)
          .replace(/\${imagem}/g, _imagem)
          .replace(/\${descricao}/g, e.descricao)
          .replace(/\${valor}/g, e.valor.toFixed(2).replace('.', ','))

        document.querySelector("#categoria-header-" + e.idcategoria).innerHTML += temp;
        
        
      });
    }
  },

  abrirProduto: (id) => {
    window.location.href = `/item.html?p=${id}`;
  },


  validarCategoriaScroll: () => {
    var categorias = document.querySelector("#listaItensCardapio").getElementsByClassName('container-group');

    for (let index = 0; index < categorias.length; index++) {
      let element = categorias[index].getAttribute('id');

      let docViewTop = window.scrollY;
      let elemTop = document.querySelector('#' + element).offsetTop;
      let top = (elemTop - (docViewTop + 100)) * -1; //faz a conta para validar se está no topo;
      let id = element.split('categoria-header-')[1]; //pega o id da categoria

      // se for maior que 0, ativa a categoria;
      if(top > 0) {
        Array.from(document.querySelectorAll('.item-categoria')).forEach(e => e.classList.remove('active'))
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
  categoria: `
    <a href="#" id="categoria-\${idcategoria}" class="item-categoria btn btn-white btn-sm mb-3 me-3 \${active}" onclick="cardapio.method.selecionarCategoria('\${idcategoria}')">
      \${icone}&nbsp; \${nome}
    </a>
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
          <p class="name"><b>\${nome}</b></p>
          <p class="description">\${descricao}</p>
          <p class="price"><b>R$ \${valor}</b></p>
        </div>
      </div>
    </div>
  `
};