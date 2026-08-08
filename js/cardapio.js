document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init(true);
  cardapio.event.init();
});


var cardapio = {
  state: {
    produtos: [],
    categorias: [],
    termoBusca: '',
    categoriaAtiva: 'home'
  }
}

cardapio.event = {

  init: () => {
    cardapio.method.obterDadosEmpresa();
    cardapio.method.obterCuponsAtivos();
    cardapio.method.obterItensCarrinho();
    cardapio.method.obterCategorias();
    cardapio.method.obterDestaques();
    cardapio.method.obterAnuncios();
    cardapio.method.obterAdicionaisHome();
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

      let esgotado = '';
      let classeEsgotado = '';
      let ofuscarEstilo = '';

      if (Number(e.ativo) === 0) {
        esgotado = `<div class="faixa-esgotado" style="background-color: #6c757d;">Indisponível</div>`;
        classeEsgotado = 'destaque-esgotado';
        ofuscarEstilo = 'style="opacity: 0.6; pointer-events: none; filter: grayscale(1);"';
      } else if (Number(e.quantidade) <= 0) {
        esgotado = `<div class="faixa-esgotado">Esgotado</div>`;
        classeEsgotado = 'destaque-esgotado';
      }

      let temp = cardapio.templates.produtoDestaque
        .replace(/\${idproduto}/g, e.idproduto)
        .replace(/\${nome}/g, e.nome)
        .replace(/\${imagem}/g, _imagem)
        .replace(/\${descricao}/g, e.descricao || '')
        .replace(/\${valor}/g, (e.tem_variacao > 0 && e.valor_min_variacao) ? `<span style="font-size: 11px; color: #777; font-weight: normal; display: block; margin-bottom: -2px;">A partir de</span>R$ ${parseFloat(e.valor_min_variacao).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : `R$ ${parseFloat(e.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
        .replace(/\${seloMaisVendido}/g, maisVendido)
        .replace(/\${faixaEsgotado}/g, esgotado)
        .replace(/\${ofuscarEstilo}/g, ofuscarEstilo)
        .replace(/\${classeEsgotado}/g, classeEsgotado);

      lista.innerHTML += temp;
    });
  },

  obterAnuncios: () => {
    app.method.get('/anuncio/cardapio',
      (response) => {
        if (response.status == "error") {
          console.log(response.message);
          return;
        }
        cardapio.method.carregarAnuncios(response.data);
      },
      (error) => {
        console.log('error', error)
      }
    )
  },

  carregarAnuncios: (lista) => {
    if (lista.length > 0) {
      document.querySelector("#secaoAnuncios").classList.remove('hidden');
      document.querySelector("#secaoAnuncios").innerHTML = '';

      // Se houver apenas 1, centraliza, senao deixa o flex iniciar do canto esquerdo
      let justifyContent = lista.length === 1 ? 'justify-content: center;' : '';
      let carrosselHtml = `<div class="anuncios-container" style="display:flex; ${justifyContent} overflow-x:auto; scroll-snap-type: x mandatory; gap: 15px; padding-bottom: 10px;">`;

      lista.forEach((item) => {
        let botaoHtml = item.texto_botao
          ? `<a href="${item.link_botao || '#'}" target="_blank" class="btn btn-yellow btn-sm mt-2" style="font-size:12px; padding: 5px 15px; display:inline-block;">${item.texto_botao}</a>`
          : '';
        
        let conteudoBanner = `
          <div style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(to top, rgba(0,0,0,0.8), transparent); padding: 20px 15px 15px; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px;">
            ${item.titulo ? `<h3 style="color:#fff; font-size: 16px; margin-bottom: 3px; text-shadow: 1px 1px 2px rgba(0,0,0,0.5);">${item.titulo}</h3>` : ''}
            ${item.descricao ? `<p style="color:#ddd; font-size: 12px; margin-bottom: 5px; line-height: 1.2;">${item.descricao}</p>` : ''}
            ${botaoHtml}
          </div>
        `;

        carrosselHtml += `
          <div class="anuncio-item" style="position: relative; min-width: 90%; max-width: 90%; height: 160px; scroll-snap-align: center; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1); flex-shrink: 0; background-color: #f8f9fa;">
            <img src="${item.imagem}" style="width: 100%; height: 100%; object-fit: cover; object-position: center center; display: block;" loading="lazy">
            ${(item.titulo || item.descricao || item.texto_botao) ? conteudoBanner : ''}
          </div>
        `;
      });

      carrosselHtml += `</div>`;
      document.querySelector("#secaoAnuncios").innerHTML = carrosselHtml;

      // Autoplay do Carrossel (Slides)
      if (lista.length > 1) {
        if (cardapio.method.slideInterval) clearInterval(cardapio.method.slideInterval);
        
        cardapio.method.slideInterval = setInterval(() => {
          let container = document.querySelector(".anuncios-container");
          if (!container) {
            clearInterval(cardapio.method.slideInterval);
            return;
          }
          
          // Pega todos os cards
          let cards = container.querySelectorAll(".anuncio-item");
          if (cards.length <= 1) return;
          
          let cardWidth = cards[0].offsetWidth + 15; // largura + gap
          let maxScroll = container.scrollWidth - container.clientWidth;
          
          // Verifica se chegou no final do scroll
          if (container.scrollLeft >= maxScroll - 10) {
             container.scrollTo({ left: 0, behavior: 'smooth' }); // Volta para o primeiro
          } else {
             // Rola exatamente a largura de um card
             container.scrollBy({ left: cardWidth, behavior: 'smooth' });
          }
        }, 3500); // 3.5 segundos por slide
      }

    }
  },

  obterAdicionaisHome: () => {
    app.method.get('/opcional/home',
      (response) => {
        if(response.status === 'error') {
          return;
        }
        cardapio.method.carregarAdicionaisHome(response.data);
      },
      (error) => {
        console.log('error', error);
      }
    )
  },

  carregarAdicionaisHome: (list) => {
    if (!list || list.length === 0) return;

    const container = document.querySelector("#secaoAdicionaisHome");
    container.innerHTML = cardapio.templates.headerAdicionais;
    container.classList.remove('hidden');

    const lista = document.querySelector("#listaAdicionais");
    lista.innerHTML = '';

    list.forEach((e) => {
      let _imagem = e.imagem ? e.imagem : 'default.jpg';
      let nomeGrupo = e.nomegrupo || 'Adicional';

      let temp = cardapio.templates.adicionalHome
        .replace(/\${idopcionalitem}/g, e.idopcionalitem)
        .replace(/\${imagem}/g, _imagem)
        .replace(/\${nome}/g, e.nomeopcional)
        .replace(/\${valor}/g, e.valoropcional)
        .replace(/\${grupo}/g, nomeGrupo);

      lista.innerHTML += temp;
    });
  },

  adicionarAdicionalHome: (idopcionalitem, nome, valor, imagem) => {
    let carrinhoLocal = app.method.obterValorSessao('cart');
    let cart = carrinhoLocal ? JSON.parse(carrinhoLocal) : { itens: [] };

    // Valida se há produtos normais no carrinho
    let possuiProdutoPrincipal = cart.itens.some(item => !item.is_avulso);

    if (!possuiProdutoPrincipal) {
        app.method.mensagem('Adicione primeiro um produto ao carrinho para incluir este adicional.');
        return;
    }

    let guid = app.method.criarGuid();

    cart.itens.push({
      guid: guid,
      is_avulso: true,
      idopcionalitem: idopcionalitem,
      nome: nome,
      imagem: imagem,
      valor: parseFloat(valor || 0),
      quantidade: 1,
      observacao: '',
      opcionais: [],
      idvariacao: null,
      nomevariacao: null
    });

    app.method.gravarValorSessao(JSON.stringify(cart), 'cart');
    app.method.mensagem('Adicional incluído no pedido!', 'green');
    cardapio.method.obterItensCarrinho();
  },

  obterDadosEmpresa: () => {
    app.method.get('/empresa',
      (response) => {

        console.log(response);

        if(response.status === 'error') {
          app.method.mensagem(response.message)
          return;
        }

        localStorage.setItem("idempresa", response.data[0].idempresa);

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
  
  obterCuponsAtivos: () => {
    let idempresa = localStorage.getItem("idempresa");
    if(!idempresa) {
      setTimeout(cardapio.method.obterCuponsAtivos, 500);
      return;
    }
    app.method.get('/fidelizacao/cupons-ativos/' + idempresa, (response) => {
      if(response.status === 'success' && response.data && response.data.length > 0) {
        cardapio.method.renderizarBannerCupons(response.data);
      }
    }, () => {});
  },

  renderizarBannerCupons: (cupons) => {
    let dest = document.getElementById("secaoDestaques") || document.getElementById("listaItensCardapio");
    if (!dest) return;
    
    let html = `<p class="title-categoria"><b>🎟️ Cupons Disponíveis</b></p><div class="d-flex" style="gap: 15px; overflow-x: auto; padding-bottom: 10px;">`;
    cupons.forEach(c => {
      let desc = c.tipo === "percentual" ? `${Number(c.valor).toFixed(0)}% OFF` : `R$ ${Number(c.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
      html += `
        <div class="card shadow-sm" style="min-width: 240px; background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; flex-shrink: 0; cursor: pointer; flex-direction: row; align-items: stretch; overflow: hidden;" onclick="cardapio.method.copiarCupom('${c.codigo}')">
          <div style="padding: 12px 15px; border-right: 1px dashed #ccc; background: #fafafa; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #f58637;">
            <i class="fas fa-ticket-alt fa-lg mb-1"></i>
            <span style="font-size: 10px; font-weight: bold; text-transform: uppercase;">Copiar</span>
          </div>
          <div style="padding: 12px 15px; flex-grow: 1; display: flex; flex-direction: column; justify-content: center;">
            <h6 class="mb-1" style="font-weight: 800; letter-spacing: 0.5px; color: #333; margin-top: 0;">${c.codigo}</h6>
            <p class="mb-0" style="font-size: 13px; color: #666;">${desc} de desconto</p>
          </div>
        </div>
      `;
    });
    html += `</div>`;
    dest.insertAdjacentHTML('beforebegin', `<div id="bannerCupons" class="mb-4">${html}</div>`);
  },

  copiarCupom: (codigo) => {
    navigator.clipboard.writeText(codigo);
    alert(`Cupom ${codigo} copiado com sucesso!`);
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
        <button type="button" id="categoria-home" class="item-categoria btn btn-white btn-sm active"
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
  
  // GA4 Event: view_item_list
  if (typeof gtag === 'function' && cardapio.state.produtos.length > 0) {
    let eventItems = cardapio.state.produtos.map(item => ({
      item_id: item.idproduto,
      item_name: item.nome,
      price: parseFloat(item.valor || 0)
    }));
    gtag('event', 'view_item_list', {
      item_list_id: 'cardapio_completo',
      item_list_name: 'Cardápio Principal',
      items: eventItems
    });
  }

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

      let statusEstoque = '';
      let ofuscarEstilo = '';

      if (Number(e.ativo) === 0) {
        statusEstoque = `<span class="badge bg-secondary text-white ms-2">Indisponível</span>`;
        ofuscarEstilo = 'style="opacity: 0.6; pointer-events: none; filter: grayscale(1);"';
      } else if (Number(e.quantidade) <= 0) {
        statusEstoque = `<span class="badge bg-warning text-dark ms-2">Esgotado</span>`;
      }

      let temp = cardapio.templates.produto
        .replace(/\${idproduto}/g, e.idproduto)
        .replace(/\${nome}/g, e.nome)
        .replace(/\${imagem}/g, _imagem)
        .replace(/\${descricao}/g, e.descricao || '')
        .replace(/\${valor}/g, (e.tem_variacao > 0 && e.valor_min_variacao) ? `<span style="font-size: 11px; color: #777; font-weight: normal; display: block; margin-bottom: -2px;">A partir de</span>R$ ${parseFloat(e.valor_min_variacao).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}` : `R$ ${parseFloat(e.valor).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
        .replace(/\${ofuscarEstilo}/g, ofuscarEstilo)
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
      if (cardapio.state.categoriaAtiva !== 'home') {
        Array.from(document.querySelectorAll('.item-categoria')).forEach(e => e.classList.remove('active'));
        let btnHome = document.querySelector('#categoria-home');
        if (btnHome) btnHome.classList.add('active');
        cardapio.state.categoriaAtiva = 'home';
        
        let container = document.querySelector("#listaCategorias");
        if (container) container.scrollTo({ left: 0, behavior: 'smooth' });
      }
      return;
    }

    let idAtivo = null;

    for (let index = 0; index < categorias.length; index++) {
      let element = categorias[index].getAttribute('id');

      let elemTop = document.querySelector('#' + element).offsetTop;
      let top = (elemTop - (docViewTop + 150)) * -1;
      let id = element.split('categoria-header-')[1];

      if (top > 0) {
        idAtivo = id;
      }
    }

    if (idAtivo && cardapio.state.categoriaAtiva !== idAtivo) {
        cardapio.state.categoriaAtiva = idAtivo;
        Array.from(document.querySelectorAll('.item-categoria')).forEach(e => e.classList.remove('active'));
        
        let btnCategoria = document.querySelector('#categoria-' + idAtivo);
        if (btnCategoria) {
            btnCategoria.classList.add('active');
            
            let containerCategorias = document.querySelector("#listaCategorias");
            if (containerCategorias) {
                let scrollPosition = btnCategoria.offsetLeft - (containerCategorias.offsetWidth / 2) + (btnCategoria.offsetWidth / 2);
                containerCategorias.scrollTo({
                    left: scrollPosition,
                    behavior: 'smooth'
                });
            }
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
  <div class="container-group mb-3">
    <p class="title-categoria"><b>🔥 Destaques</b></p>
    <div class="carousel-destaques" id="listaDestaques"></div>
  </div>
`,

  headerAdicionais: `
  <div class="container-group mb-3">
    <p class="title-categoria"><b>🔥 Adicionais</b></p>
    <div class="carousel-destaques" id="listaAdicionais"></div>
  </div>
`,

  adicionalHome: `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; width: 75px; margin-right: 10px; cursor: pointer;" onclick="cardapio.method.adicionarAdicionalHome('\${idopcionalitem}', '\${nome}', '\${valor}', '\${imagem}')" title="\${grupo} - \${nome}">
        <div class="card-adicional-home" style="margin-right: 0;">
           <img src="/public/images/\${imagem}" alt="\${nome}" loading="lazy">
        </div>
        <span style="font-size: 11px; color: #888; font-weight: 400; text-align: center; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 100%; font-family: 'Inter', sans-serif, Arial;">\${nome}</span>
    </div>
  `,

  produtoDestaque: `
    <div class="card destaque-card \${classeEsgotado}" \${ofuscarEstilo} onclick="cardapio.method.abrirProduto('\${idproduto}')">
      \${seloMaisVendido}

      <div class="container-img-produto destaque-img"
        style="background-image: url('./public/images/\${imagem}');">
        \${faixaEsgotado}
      </div>

      <div class="infos-produto p-2">
        <p class="name mb-1"><b>\${nome}</b></p>
        <p class="price mb-0"><b>\${valor}</b></p>
      </div>
    </div>
  `,
  categoria: `
    <button type="button" id="categoria-\${idcategoria}" class="item-categoria btn btn-white btn-sm " onclick="cardapio.method.selecionarCategoria('\${idcategoria}')">
      \${icone}&nbsp; \${nome}
    </button>
  `,

  headerCategoria: `
    <div id="categoria-header-\${idcategoria}" class="container-group mb-4">
      <p class="title-categoria"><b>\${nome}</b></p>
    </div>
  `,
  
  produto: `
    <div class="card mb-2 item-cardapio" \${ofuscarEstilo} onclick="cardapio.method.abrirProduto('\${idproduto}')">
      <div class="d-flex">
        <div class="container-img-produto" style="background-image: url('./public/images/\${imagem}'); background-size: cover;"></div>
        <div class="infos-produto">
        <p class="name"><b>\${nome}</b> \${statusEstoque}</p>
          <p class="description">\${descricao}</p>
          <p class="price"><b>\${valor}</b></p>
        </div>
      </div>
    </div>
  `
};