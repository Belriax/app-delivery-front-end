document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init();
  item.event.init();
});


var item = {};
var ITEM_ID = {};
var PRODUTO = {};
var VALIDACAOES = [];
var OPCIONAIS = [];
var OPCIONAIS_SELECIONADOS = [];
var QUANTIDADE_SELECIONADA = 1;

item.event = {

  init: () => {
    let url = new URL(window.location.href);
    var p = url.searchParams.get('p');

    if(p != null && p.trim() != '' && !isNaN(p)){
      ITEM_ID = p;
      item.method.obterDadosProduto();
      item.method.obterOpcionaisProduto();

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

        if(response.status === 'error'){
          app.method.mensagem(response.message)
          return;
        }

        let produto = response.data[0];

        PRODUTO = produto;

        if(produto.imagem != null){
          document.getElementById('img-produto').style.backgroundImage = `url('../public/images/${produto.imagem}')`;
          document.getElementById('img-produto').style.backgroundSize = 'cover';
        }
        else{
          document.getElementById('img-produto').style.backgroundImage = `url('../public/images/default.jpg')`;
          document.getElementById('img-produto').style.backgroundSize = 'cover';
        }

        document.getElementById('titulo-produto').innerText = produto.nome;
        document.getElementById('descricao-produto').innerText = produto.descricao;
        document.getElementById('preco-produto').innerText = `R$ ${(produto.valor).toFixed(2).replace('.', ',')}`
        document.getElementById('btn-preco-produto').innerText = `R$ ${(produto.valor).toFixed(2).replace('.', ',')}`

      },
      (error) =>{
        app.method.loading(false);
        // app.method.mensagem(reponse.message);
        console.log('error', error)
        // return;
      }, true
    )
  },
  
  obterOpcionaisProduto: () => {
    PRODUTO = {};

    app.method.get('/opcional/produto/' + ITEM_ID, 
      (response) => {
        console.log(response);

        if(response.status === 'error'){
          app.method.mensagem(response.message)
          return;
        }

        OPCIONAIS = response.data;

        item.method.carregarOpcionais(response.data);
        item.method.carregarOpcionaisSimples(response.data);
        
      },
      (error) =>{
        // app.method.mensagem(reponse.message);
        console.log('error', error)
        // return;
      }, true
    )
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

        for (let index = 0; index < opcional.length; index++){
          let element = opcional[index];

          let valor = '';

          if(element.valoropcional > 0) {
            valor = `+ R$ ${(element.valoropcional).toFixed(2).replace('.', ',')}`
          }
  
          itens += item.template.opcionalItem.replace(/\${idopcionalitem}/g, element.idopcionalitem)
          .replace(/\${nome}/g, element.nomeopcional)
          .replace(/\${valor}/g, valor)
          .replace(/\${idopcional}/g, e[0])
        }

        let temp = item.template.opcional.replace(/\${idopcional}/g, e[0])
          .replace(/\${obrigatorio}/g, obrigatorio)
          .replace(/\${titulo}/g, opcional[0].titulo)
          .replace(/\${sub-titulo}/g, subtitulo)
          .replace(/\${minimo}/g, minimo)
          .replace(/\${maximo}/g, maximo)
          .replace(/\${itens}/g, itens)

        document.querySelector('#listaOpcionais').innerHTML += temp;        
      })
    }

  },

  carregarOpcionaisSimples: (lista) => {
    
    let listaSimples = lista.filter((elem) => { return elem.tiposimples == 1 });
    
    document.querySelector('#listaOpcionaisSimples').innerHTML = '';
    
    if(listaSimples.length > 0) {
      document.querySelector('#containerOpcionaisSimples').classList.remove('hidden');

      listaSimples.forEach((e, i) => {
        
        let valor = '';

        if(e.valoropcional > 0) {
          valor = `+ R$ ${(e.valoropcional).toFixed(2).replace('.', ',')}`
        }

        let temp = item.template.opcionalItemSimples.replace(/\${idopcionalitem}/g, e.idopcionalitem)
        .replace(/\${nome}/g, e.nomeopcional)
        .replace(/\${valor}/g, valor);


      document.querySelector('#listaOpcionaisSimples').innerHTML += temp;

      });
      
    }else{
      document.querySelector('#containerOpcionaisSimples').remove();
    }
  },

  // selecion o opcional
  selecionarOpcional: (idopcionalitem, idopcional) => {
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
    let valorTotal = PRODUTO.valor;

    for (let index = 0;  index < OPCIONAIS_SELECIONADOS.length; index ++) {
      const element = OPCIONAIS_SELECIONADOS[index];

      if(element.valoropcional > 0) {
        valorTotal += element.valoropcional;
      }
    }
    
    valorTotal = QUANTIDADE_SELECIONADA * valorTotal;

    document.getElementById('btn-preco-produto').innerText = `R$ ${(valorTotal).toFixed(2).replace('.', ',')}`;
    
  },
  
  adicionarAoCarrinho: () => {
    let observacao = document.querySelector('#txtObservacao').value.trim();
    
    if(VALIDACAOES.length > 0) {
      app.method.mensagem("Selecione os campos obrigatórios.");
      return;
    }

    let carrinho = app.method.obterValorSessao('cart');
    
    let cart = {
      itens: []
    };

    if(carrinho != undefined){
      cart = JSON.parse(carrinho);
    }

    let guid = app.method.criarGuid();

    cart.itens.push({
      guid: guid,
      idproduto: PRODUTO.idproduto,
      nome: PRODUTO.nome,
      imagem: PRODUTO.imagem,
      valor: PRODUTO.valor,
      quantidade: QUANTIDADE_SELECIONADA,
      observacao: observacao,
      opcionais: OPCIONAIS_SELECIONADOS
    })

    app.method.gravarValorsecao(JSON.stringify(cart), 'cart');

    app.method.mensagem('Item adicionado ao carrinho.', 'green');

    setTimeout(() => {
      window.location.href = '/index.html';
    }, 1500)

  },
  
  diminuirQuantidade: () => {
    if(QUANTIDADE_SELECIONADA === 1) {
      return
    }
    
    QUANTIDADE_SELECIONADA -= 1;
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
      \${itens}
    </div>
  `,

  opcionalItem: `
    <div class="card card-opcionais mt-2">
      <div class="infos-produto-opcional">
        <p class="name mb-0"><b>\${nome}</b></p>
        <p class="price mb-0"><b>\${valor}</b></p>
      </div>
      <div class="checks">
        <label class="container-check">
          <input id="check-opcional-\${idopcionalitem}" type="checkbox" class="paiopcional-\${idopcional}" onchange="item.method.selecionarOpcional('\${idopcionalitem}', \${idopcional})" />
          <span class="checkmark"></span>
        </label>
      </div>
    </div>
  `,

  opcionalItemSimples: `
    <div class="card card-opcionais mt-2">
      <div class="infos-produto-opcional">
        <p class="name mb-0"><b>\${nome}</b></p>
        <p class="price mb-0"><b>\${valor}</b></p>
      </div>
      <div class="checks">
        <label class="container-check">
          <input id="check-opcional-\${idopcionalitem}" type="checkbox" onchange="item.method.selecionarOpcionalSimples('\${idopcionalitem}')" />
          <span class="checkmark"></span>
        </label>
      </div>
    </div>
  `,

}