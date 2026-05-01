
 var pedido = {};

 var DADOS_EMPRESA = {};

 var MODAL_DETALHES = new bootstrap.Modal(document.getElementById('modalDetalhes'));
 var MODAL_RECUSA_PEDIDO = new bootstrap.Modal(document.getElementById('modalRecusarPedido'));


 pedido.event = {
  init: () => {
    app.method.validaToken();
    app.method.carregarDadosEmpresa();

    pedido.method.openTab('pendentes', 1);

    setInterval(() => {
      pedido.method.atualizarLista();
    }, 10000);

  }
 }

 pedido.method = {

  // metodo para carregar as tabs
  openTab: (tab, n) => {
    Array.from(document.querySelectorAll(".tab-content")).forEach(e => e.classList.remove('active'));

    document.querySelector("#tab-" + tab).classList.add('active');
    document.querySelector("#lista-pedidos").innerHTML = '';

    app.method.loading(true);
    
    app.method.get('/pedido/painel/' + n,
      (response) => {
        console.log(response)
        app.method.loading(false)

        if(response.status === "error") {
          app.method.mensagem(response.message)
          return;
        }

        pedido.method.carregarPedidos(response.data);
        pedido.method.carregarTotais(response.totais);
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error);
      }
    )
  },

  // carrega a lista de pedidos na tela
  carregarPedidos: (lista) => {

    if(lista.length > 0) {

      lista.forEach((e, i) => {
        let btnAcoes = '';
        let titleBtn = '';
        let acoesPai = '<div class="dropdown-menu" aria-labelledby="menuAcoes">\${acoes}</div>';
        let acoes = '';
        let acoesFinal = '';
        let tipoentregaicon = '';
        let tipoentrega = '';
        let formapagamentoicon = '';
        let formapagamento = '';
        let formapagamentodesc = '';
        let datahora = '';

        if (e.idpedidostatus == 1){
          titleBtn = 'Pendente';
          acoes = `
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(2, '${e.idpedido}')">Mover para <b>Aceito</b> <i class="far fa-thumbs-up"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(3, '${e.idpedido}')">Mover para <b>Em preparo</b> <i class="far fa-clock"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(4, '${e.idpedido}')">Mover para <b>Em entrega</b> <i class="fas fa-motorcycle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(5, '${e.idpedido}')">Mover para <b>Concluído</b> <i class="far fa-check-circle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(6, '${e.idpedido}')">Recusar Pedido<i class="far fa-times-circle"></i></a>
          `
        }else if(e.idpedidostatus == 2){
          titleBtn = 'Aceito';
          acoes = `
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(3, '${e.idpedido}')">Mover para <b>Em preparo</b> <i class="far fa-clock"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(4, '${e.idpedido}')">Mover para <b>Em entrega</b> <i class="fas fa-motorcycle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(5, '${e.idpedido}')">Mover para <b>Concluído</b> <i class="far fa-check-circle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(6, '${e.idpedido}')">Recusar Pedido<i class="far fa-times-circle"></i></a>
          `
        }else if(e.idpedidostatus == 3){
          titleBtn = 'Em preparo';
          acoes = `
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(4, '${e.idpedido}')">Mover para <b>Em entrega</b> <i class="fas fa-motorcycle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(5, '${e.idpedido}')">Mover para <b>Concluído</b> <i class="far fa-check-circle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(6, '${e.idpedido}')">Recusar Pedido<i class="far fa-times-circle"></i></a>
          `
        }else if(e.idpedidostatus == 4){
          titleBtn = 'Em entrega';
          acoes = `
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(5, '${e.idpedido}')">Mover para <b>Concluído</b> <i class="far fa-check-circle"></i></a>
            <a href="javascript:void(0)" class="dropdown-item" onclick="pedido.method.moverPara(6, '${e.idpedido}')">Recusar Pedido<i class="far fa-times-circle"></i></a>
          `
        }

        // se for != de recusado adiciona as ações
        if(e.idpedidostatus != 5 && e.idpedidostatus != 6) {
          acoesFinal = acoesPai.replace(/\${acoes}/g, acoes);
          btnAcoes = `
            <button class="btn btn-white btn-sm dropdown-toggle active" type="button" data-bs-toggle="dropdown" aria-expanded="false" id="dropdownMenuLink">
              ${titleBtn}
            </button>
          `;
        }

        // valida o tipo de entrega
        if(e.idtipoentrega == 1){
          tipoentregaicon = 'fas fa-motorcycle';
          tipoentrega = 'Delivery';
        } else {
          tipoentregaicon = 'fas fa-box';
          tipoentrega = 'Retirada';
        }

        // valida o tipo de pagamento
        if(e.idformapagamento == 1){
          formapagamentoicon = 'fas fa-receipt';
          formapagamento = 'Pix';
          formapagamentodesc = 'Pagamento na entrega do pedido';
        }else if(e.idformapagamento == 2) {
          formapagamentoicon = 'fas fa-coins';
          formapagamento = 'Dinheiro';
          formapagamentodesc = e.troco != null ? `Troco para ${(e.troco).toFixed(2).replace('.', ',')} reais` : 'Pagamento na entrega do pedido';
        }else if(e.idformapagamento ==3) {
          formapagamentoicon = 'fas fa-credit-card';
          formapagamento = 'Cartão de Crédito';
          formapagamentodesc = e.idtipoentrega == 1 ? 'Levar maquininha de cartão' : 'Pagamento na retirada do pedido';
        }else if(e.idformapagamento == 4) {
          formapagamentoicon = 'fas fa-credit-card';
          formapagamento = 'Cartão de Débito';
          formapagamentodesc = e.idtipoentrega == 1 ? 'Levar maquininha de cartão' : 'Pagamento na retirada do pedido';
        }

        // data e hora de recebimento.
        let datacadastro = e.datacadastro.split('T');
        let dataFormatada = datacadastro[0].split('-')[2] + '/' + datacadastro[0].split('-')[1];
        let horarioFormatado = datacadastro[1].split(':')[0] + ':' + datacadastro[1].split(':')[1];

        datahora = `${dataFormatada} às ${horarioFormatado}`;
        
        let temp = pedido.template.card.replace(/\${idpedido}/g, e.idpedido)
          .replace(/\${btnAcoes}/g, btnAcoes)
          .replace(/\${acoes}/g, acoesFinal)
          .replace(/\${nome}/g, e.nomecliente)
          .replace(/\${tipoentregaicon}/g, tipoentregaicon)
          .replace(/\${tipoentrega}/g, tipoentrega)
          .replace(/\${formapagamentoicon}/g, formapagamentoicon)
          .replace(/\${formapagamento}/g, formapagamento)
          .replace(/\${formapagamentodesc}/g, formapagamentodesc)
          .replace(/\${datahora}/g, datahora)
          .replace(/\${total}/g, parseFloat(e.total).toFixed(2).replace('.', ','));
  
        // adiciona o pedido na tela
        document.querySelector("#lista-pedidos").innerHTML += temp;
      })

    }
    
  },

  // carrega os totais nas tabs
  carregarTotais: (data) => {
    // oculta todos os totais
    document.querySelector("#badge-total-pendentes").classList.add('hidden');
    document.querySelector("#badge-total-aceito").classList.add('hidden');
    document.querySelector("#badge-total-preparo").classList.add('hidden');
    document.querySelector("#badge-total-entrega").classList.add('hidden');

    if(data.pendente > 0) {
      document.querySelector("#badge-total-pendentes").classList.remove('hidden');
      document.querySelector("#badge-total-pendentes").innerText = data.pendente;
    }
    
    if(data.aceito > 0) {
      document.querySelector("#badge-total-aceito").classList.remove('hidden');
      document.querySelector("#badge-total-aceito").innerText = data.aceito;
    }
    
    if(data.preparo > 0) {
      document.querySelector("#badge-total-preparo").classList.remove('hidden');
      document.querySelector("#badge-total-preparo").innerText = data.preparo;
    }
    
    if(data.entrega > 0) {
      document.querySelector("#badge-total-entrega").classList.remove('hidden');
      document.querySelector("#badge-total-entrega").innerText = data.entrega;
    }
  },

  abrirModalDetalhes: (idpedido) => {

    MODAL_DETALHES.show();

    app.method.loading(true);

    app.method.get('/pedido/' + idpedido,
      (response) => {

        console.log(response);
        app.method.loading(false);

        if(response.status == "error"){
          app.method.mensagem(response.message);
          return;
        }

        pedido.method.carregarModalDetalhes(response.data, idpedido, response.cart);

      },
      (error) => {
        app.method.loading(false);
        console.log('error', error);
      }
    )

  },

  // carrega os dados da modal de detalhes
  carregarModalDetalhes: (data, idpedido, cart) => {
    $('#content-print').attr('data-pedido-id', idpedido);

    let datacadastro = data.datacadastro.split('T');
    let dataFormatada = datacadastro[0].split('-')[2] + '/' + datacadastro[0].split('-')[1];
    let horarioFormatado = datacadastro[1].split(':')[0] + ':' + datacadastro[1].split(':')[1];

    document.querySelector('#lblDataHora').innerText = `Recebido em ${dataFormatada} às ${horarioFormatado}`;

    document.querySelector('#lblNomeCliente').innerText = data.nomecliente;
    document.querySelector('#lblTelefoneCliente').innerText = data.telefonecliente;

    document.querySelector('#lblTipoEntrega').innerHTML = data.idtipoentrega == 1 ? '<i class="fas fa-motorcycle"></i> Entrega' : '<i class="fas fa-box"></i> Retirada';

    document.querySelector('#lblFormaPagamentoTitulo').innerText = data.formapagamento;
    document.querySelector('#lblFormaPagamentoDescricao').innerText = 'Pagamento na entrega do pedido';

    if (data.idformapagamento == 1) {
        document.querySelector('#lblFormaPagamentoIcon').innerHTML = '<i class="fas fa-receipt"></i>';
    }
    else if (data.idformapagamento == 2) {
        document.querySelector('#lblFormaPagamentoIcon').innerHTML = '<i class="fas fa-coins"></i>';
        document.querySelector('#lblFormaPagamentoDescricao').innerHTML = data.troco != null ? `Troco para ${(data.troco).toFixed(2).replace('.', ',')} reais` : 'Pagamento na entrega do pedido';
    }
    else {
        document.querySelector('#lblFormaPagamentoIcon').innerHTML = '<i class="fas fa-credit-card"></i>';
        document.querySelector('#lblFormaPagamentoDescricao').innerHTML = data.idtipoentrega == 1 ? 'Levar maquininha de cartão' : 'Pagamento na retirada do pedido';
    }


    if (data.idtipoentrega == 1) {
        document.querySelector('#container-endereco').classList.remove('hidden');
        document.querySelector('#lblEndereco').innerText = `${data.endereco}, ${data.numero}, ${data.bairro} ${data.complemento ? ` - ${data.complemento}` : ''}`;
        document.querySelector('#lblCep').innerText = `${data.cidade}-${data.estado} / ${data.cep}`;
    }   
    else {
        document.querySelector('#container-endereco').classList.add('hidden');
    }

    const footer = document.querySelector('#container-action-footer');

    footer.innerHTML = '';

    footer.innerHTML+= `
      <button onclick="pedido.method.imprimir()"
        type="button"
        class="btn btn-white btn-sm">
          Imprimir
      </button>
    `;

    // carrega o botão final na modal (somente se for != de concluído ou recusado)
    if (data.idpedidostatus != 5 && data.idpedidostatus != 6) {

      let actionBtn = '';

      if (data.idpedidostatus == 1) {
        actionBtn += `<button onclick="pedido.method.moverPara(2, '${idpedido}')" type="button" class="btn btn-yellow btn-sm">Aceitar Pedido</button>`
      }
      
      if (data.idpedidostatus == 2) {
        actionBtn += `<button onclick="pedido.method.moverPara(3, '${idpedido}')" type="button" class="btn btn-yellow btn-sm">Preparar Pedido</button>`
      }
      
      if (data.idpedidostatus == 3) {
        actionBtn += `<button onclick="pedido.method.moverPara(4, '${idpedido}')" type="button" class="btn btn-yellow btn-sm">Entregar Pedido</button>`
      }
      
      if (data.idpedidostatus == 4) {
        actionBtn += `<button onclick="pedido.method.moverPara(5, '${idpedido}')" type="button" class="btn btn-yellow btn-sm">Concluir Pedido</button>`
      }

      footer.innerHTML += actionBtn;
    }
    else {
      document.querySelector('#container-action-footer').innerHTML = '';
    }

    document.querySelector('#itensPedido').innerHTML = '';

    // organiza o carrinho em grupo
    var itens_pedido = cart.reduce(function (results, item) {
      (results[item.idpedidoitem] = results[item.idpedidoitem] || []).push(item)
      return results;
    }, {})

    console.log('itens_pedido', itens_pedido)

    var order = [];

    for (var key in itens_pedido) {

      var obj = itens_pedido[key];
  
      // cria o objeto principal do item
      var _item = {
        idpedidoitem: obj[0].idpedidoitem,
        nome: obj[0].nome,
        observacao: obj[0].observacao,
        quantidade: obj[0].quantidade,
        valor: obj[0].valor,
        opcionais: []
      }

      obj.forEach((e, i) => {
        // monta a lista de opcionais
        if (e.idopcionalitem != null) {

          var _opc = {
            idopcionalitem: e.idopcionalitem,
            nomeopcional: e.nomeopcional,
            valoropcional: e.valoropcional
          }

          // adiciona o opcional na lista
          _item.opcionais.push(_opc)
        }
      })

      // adiciona o item no objeto de order
      order.push(_item);
    
    }

    console.log('order', order);

    order.forEach((e, i) => {

      let itens = '';

      if (e.opcionais.length > 0) {
        // monta a lista de opcionais
        for (let index = 0; index < e.opcionais.length; index++) {
          let element = e.opcionais[index];
          
          itens += pedido.template.opcional.replace(/\${nome}/g, `${e.quantidade}x ${element.nomeopcional}`)
          .replace(/\${preco}/g, `+ R$ ${(e.quantidade * element.valoropcional).toFixed(2).replace('.', ',')}`)

        }
      }

      let obs = '';

      if (e.observacao != null && e.observacao.length > 0) {
        obs = pedido.template.obs.replace(/\${observacao}/g, e.observacao);
      }

      let temp = pedido.template.produto.replace(/\${guid}/g, e.guid)
        .replace(/\${nome}/g, `${e.quantidade}x ${e.nome}`)
        .replace(/\${preco}/g, `R$ ${(e.quantidade * e.valor).toFixed(2).replace('.', ',')}`)
        .replace(/\${obs}/g, obs)
        .replace(/\${opcionais}/g, itens)

      document.querySelector('#itensPedido').innerHTML += temp;

    });

    // valida se tem taxa
    if (data.taxaentrega > 0) {
      let valorTaxa = data.taxaentrega ? parseFloat(data.taxaentrega) : 0;
let temptaxa = pedido.template.taxaentrega.replace(/\${total}/g, `+ R$ ${valorTaxa.toFixed(2).replace('.', ',')}`)
      document.querySelector('#itensPedido').innerHTML += temptaxa;
    }

    let temptotal = pedido.template.total.replace(/\${total}/g, `R$ ${parseFloat(data.total).toFixed(2).replace('.', ',')}`)
    document.querySelector('#itensPedido').innerHTML += temptotal;
  },

  moverPara: (target, idpedido) => {

    RECUSAR_PEDIDO_ID = 0;

    // se for recusar, abre a modal de confirmação
    if (parseInt(target) == 6) {
      RECUSAR_PEDIDO_ID = idpedido;
      document.querySelector('#txtMotivoRecusa').value = '';
      MODAL_RECUSA_PEDIDO.show();
      return;
    }

    var dados = {
      tab: target,
      idpedido: idpedido
    }

    app.method.loading(true);

    app.method.post('/pedido/mover', JSON.stringify(dados),
      (response) => {

        console.log('response', response)
        app.method.loading(false);

        if (response.status === 'error') {
            app.method.mensagem(response.message)
            return;
        }

        app.method.mensagem(response.message, 'green');

        // pedido.method.atualizarLista();
        MODAL_DETALHES.hide();
        pedido.method.irParaStatus(target);
      },
      (error) => {
          console.log('error', error);
          app.method.loading(false);
      }
    );

  },

    moverPedidoNaTela: (idpedido, novoStatus) => {

    const card = document.querySelector(`#pedido-${idpedido}`);
    if (!card) return;

    // efeito visual de saída
    card.classList.add('pedido-movendo');

    setTimeout(() => {

      // remove da lista atual
      card.remove();

      // atualiza status interno
      card.dataset.status = novoStatus;

      // insere na nova lista
      const novaLista = document.querySelector(
        `#lista-status-${novoStatus}`
      );

      if (novaLista) {
        novaLista.prepend(card);
      }

      // remove efeito
      card.classList.remove('pedido-movendo');

    }, 200);
  },


  irParaStatus: (status) => {
    switch (parseInt(status)) {
      case 1:
        pedido.method.openTab('pendentes', 1);
        break;

      case 2:
        pedido.method.openTab('aceito', 2);
        break;
      
      case 3:
        pedido.method.openTab('preparo', 3);
        break;
      
      case 4:
        pedido.method.openTab('entrega', 4);
        break;

      case 5:
        pedido.method.openTab('concluido', 5);
        break;
    }
  },

  atualizarLista: () => {
    // valida qual é o target, pra carregar os itens da tab atual
    let tabAtiva = document.querySelector('.tab-content.active').id;

    if (tabAtiva == 'tab-pendentes') {
      pedido.method.openTab('pendentes', 1);
    }
    else if (tabAtiva == 'tab-aceito') {
      pedido.method.openTab('aceito', 2);
    }
    else if (tabAtiva == 'tab-preparo') {
      pedido.method.openTab('preparo', 3);
    }
    else if (tabAtiva == 'tab-entrega') {
      pedido.method.openTab('entrega', 4);
    }
  },
  
  // recusa o pedido
  recusarPedido: () => {

    if (RECUSAR_PEDIDO_ID != 0) {

      let motivo = document.querySelector('#txtMotivoRecusa').value.trim();

      var dados = {
        idpedido: RECUSAR_PEDIDO_ID,
        motivo: motivo
      }

      app.method.loading(true);

      app.method.post('/pedido/recusar', JSON.stringify(dados),
        (response) => {

          console.log('response', response)
          app.method.loading(false);

          if (response.status === 'error') {
            app.method.mensagem(response.message)
            return;
          }

          app.method.mensagem(response.message, 'green');

          pedido.method.atualizarLista();

          MODAL_RECUSA_PEDIDO.hide();

        },
        (error) => {
          console.log('error', error);
          app.method.loading(false);
        }
      );
    }
  },

  montarEnderecoEmpresa: (app)  => {
  const get = (key) => app.method.obterValorSessao(key) || '';

  const endereco = get('address');
  const numero   = get('numero');
  const bairro   = get('bairro');
  const cidade   = get('cidade');
  const estado   = get('estado');
  const cep      = get('cep');

  const linha1 = [endereco, numero].filter(Boolean).join(', ');
  const linha2 = bairro;
  const linha3 = [`${cidade}/${estado}`, cep && `CEP ${cep}`]
    .filter(Boolean)
    .join(' - ');

  const enderecoFormatado = [linha1, linha2, linha3]
    .filter(Boolean)
    .join('\n');

  return enderecoFormatado; 
  
},

imprimir: () => {
  app.method.loading(true);

  // Pega o número do pedido que foi salvo no data-attribute
  const numeroPedido = $('#content-print').attr('data-pedido-id') || 'N/A';

  // Pega os dados da empresa da sessão
  const nomeEmpresa = app.method.obterValorSessao('Nome') || 'NOME DA EMPRESA';
  
  // Pega a logo
  let logotipo = app.method.obterValorSessao('Logo');
  let logoEmpresa = '../img/logo.png';
  
  if (logotipo != undefined && logotipo != null && logotipo != 'null' && logotipo != '') {
    logoEmpresa = '/public/images/empresa/' + logotipo;
  } else {
    logoEmpresa = '/public/images/default.jpg';
  }
  
  // Pega o endereço da empresa da sessão
  let enderecoEmpresa = app.method.obterValorSessao('endereco');
  let numeroEmpresa = app.method.obterValorSessao('numero');
  let bairroEmpresa = app.method.obterValorSessao('bairro');
  let cidadeEmpresa = app.method.obterValorSessao('cidade');
  let estadoEmpresa = app.method.obterValorSessao('estado');
  let cepEmpresa = app.method.obterValorSessao('cep');
  let telefoneEmpresa = app.method.obterValorSessao('telefone');
  
  // Verifica se o endereço veio como string JSON e faz o parse
  if (typeof enderecoEmpresa === 'string' && enderecoEmpresa.startsWith('{')) {
    try {
      const enderecoObj = JSON.parse(enderecoEmpresa);
      enderecoEmpresa = enderecoObj.Endereco || enderecoObj.endereco || '';
      numeroEmpresa = enderecoObj.Numero || enderecoObj.numero || '';
      bairroEmpresa = enderecoObj.Bairro || enderecoObj.bairro || '';
      cidadeEmpresa = enderecoObj.Cidade || enderecoObj.cidade || '';
      estadoEmpresa = enderecoObj.Estado || enderecoObj.estado || '';
      cepEmpresa = enderecoObj.Cep || enderecoObj.cep || '';
    } catch (e) {
      console.error('Erro ao fazer parse do endereço:', e);
      enderecoEmpresa = '';
    }
  }
  
  // Monta o endereço completo de forma limpa
  let linhaEndereco = '';
  let linhaCidade = '';
  let linhaTelefone = '';
  
  // Linha 1: Endereço, número e bairro
  if (enderecoEmpresa) {
    linhaEndereco = enderecoEmpresa;
    
    if (numeroEmpresa) {
      linhaEndereco += ', ' + numeroEmpresa;
    }
    
    if (bairroEmpresa) {
      linhaEndereco += ' - ' + bairroEmpresa;
    }
  }
  
  // Linha 2: Cidade, Estado e CEP
  if (cidadeEmpresa || estadoEmpresa) {
    if (cidadeEmpresa) {
      linhaCidade = cidadeEmpresa;
    }
    
    if (estadoEmpresa) {
      linhaCidade += (linhaCidade ? '/' : '') + estadoEmpresa;
    }
    
    if (cepEmpresa) {
      linhaCidade += ' - CEP: ' + cepEmpresa;
    }
  }
  
  // Linha 3: Telefone
  if (telefoneEmpresa) {
    linhaTelefone = 'Tel: ' + telefoneEmpresa;
  }

  // Cria o cabeçalho com logo e dados da empresa
  const cabecalho = `
    <div class="cabecalho-impressao">
      <img src="${logoEmpresa}" alt="Logo" class="logo-impressao">
      <h2>${nomeEmpresa}</h2>
      ${linhaEndereco ? `<p>${linhaEndereco}</p>` : ''}
      ${linhaCidade ? `<p>${linhaCidade}</p>` : ''}
      ${linhaTelefone ? `<p>${linhaTelefone}</p>` : ''}
      <p class="titulo-pedido">PEDIDO #${numeroPedido}</p>
    </div>
  `;

  // Cria o rodapé
  const rodape = `
    <div class="rodape-impressao">
      <p>Obrigado pela preferência!</p>
      <p>Volte sempre!</p>
    </div>
  `;

  // Insere o cabeçalho no início do content-print
  $('#content-print').prepend(cabecalho);
  
  // Insere o rodapé no final do content-print
  $('#content-print').append(rodape);

  // Adiciona a classe print para aplicar os estilos de impressão
  $("#content-print").addClass('print');
  
  const div = document.getElementById('content-print');

  // Aguarda um momento para o CSS ser aplicado e imagens carregarem
  setTimeout(() => {
    html2canvas(div, {
      scale: 4,
      backgroundColor: '#ffffff',
      logging: false,
      width: 200,
      windowWidth: 200,
      removeContainer: true,
      useCORS: true,
      allowTaint: true,
      imageTimeout: 0
    }).then(function (canvas) {  
      // Remove a classe print
      $("#content-print").removeClass('print');
      
      // Remove o cabeçalho e rodapé adicionados
      $('.cabecalho-impressao').remove();
      $('.rodape-impressao').remove();

      const imagem = canvas.toDataURL('image/png');
      const novaJanela = window.open('', '_blank');
      
      novaJanela.document.write(`
        <html>
          <head>
            <title>Impressão - Pedido #${numeroPedido}</title>
            <style>
              @page {
                size: 58mm auto;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                text-align: center;
                background: #f0f0f0;
              }
              img {
                width: 58mm;
                height: auto;
                display: block;
                margin: 0 auto;
              }
            </style>
          </head>
          <body onload="window.print();">
            <img src="${imagem}" />
          </body>
        </html>  
      `);

      novaJanela.document.close();
      app.method.loading(false);

      // Fecha a janela após impressão
      setTimeout(function() {
        novaJanela.close();
      }, 500);

    }).catch(function(error) {
      console.error('Erro ao gerar impressão:', error);
      $("#content-print").removeClass('print');
      $('.cabecalho-impressao').remove();
      $('.rodape-impressao').remove();
      app.method.loading(false);
      alert('Erro ao gerar a impressão. Tente novamente.');
    });
  }, 200);
}
 }

 pedido.template = {

  card: `
    <div class="col-3 mb-4">
      <div class="card card-pedido">
        <div class="card-pedido-header">
          <div class="dropdown">
            \${btnAcoes}
            \${acoes}
          </div>
          <p class="numero-pedido mt-2">#\${idpedido}</p>
        </div>

        <div class="card-pedido-content" onclick="pedido.method.abrirModalDetalhes('\${idpedido}')" >
          <div class="card-pedido-body mt-3">
            <p class="info-pedido">
              <i class="fas fa-user"></i>\${nome}
            </p>
            <p class="info-pedido">
              <i class="\${tipoentregaicon}"></i> \${tipoentrega}
            </p>
            <p class="info-pedido">
              <i class="\${formapagamentoicon}"></i> \${formapagamento}
              <span>\${formapagamentodesc}</span>
            </p>
          </div>

          <div class="separate"></div>
          <div class="card-pedido-footer">
            <p class="horario-pedido">\${datahora}</p>
            <p class="total-pedido"><b>R$ \${total}</b></p>
          </div>
        </div>

      </div>
    </div>
  `,

  produto: `
    <div class="card-item mb-2">
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
          
        </div>
      </div>
    </div>
  `,
  // <i class="fas fa-pencil-alt"></i>

  opcional: `
    <div class="infos-produto">
      <p class="name-opcional mb-0">\${nome}</p>
      <p class="price-opcional mb-0">\${preco}</p>
    </div>
  `,

  obs: `
    <div class="infos-produto">
      <p class="obs-opcional mb-0">- \${observacao}</p>
    </div>
  `,

  taxaentrega: `
    <div class="card-item mb-2">
      <div class="detalhes-produto">
        <div class="infos-produto">
          <p class="name mb-0"><i class="fas fa-motorcycle">&nbsp;</i><b>Taxa de entrega</b></p>
          <p class="price mb-0"><b>\${total}</b></p>
        </div>
      </div>
    </div>
  `
  ,

  total: `
    <div class="card-item mb-2">
      <div class="detalhes-produto">
        <div class="infos-produto">
          <p class="name-total mb-0"><b>Total</b></p>
          <p class="price-total mb-0"><b> \${total}</b></p>
        </div>
      </div>
    </div>
  `,
}