document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init();
  pedido.event.init();
});


var pedido = {}

var ORDER = null;

var MODAL_DETALHES = new bootstrap.Modal(document.getElementById('modalDetalhes'));

pedido.event = {

  init: () => {
    pedido.method.obterUltimoPedido();
    pedido.method.obterItensCarrinho();

    setInterval(() => {
        pedido.method.obterUltimoPedido();
    }, 15000)
  }

}

pedido.method = {

  obterUltimoPedido: () => {
    let pedidoLocal = app.method.obterValorSessao('order');

    if(pedidoLocal != undefined) {

      let order = JSON.parse(pedidoLocal);
      let idPedido = typeof order === 'object' && order !== null ? order.order : order;

      if (!idPedido) {
        app.method.removersecao('order');
        document.querySelector('#containerNenhumPedido').classList.remove('hidden'); 
        document.querySelector('#containerAcompanhamento').classList.add('hidden');
        return;
      }

      ORDER = order;

      document.querySelector('#containerNenhumPedido').classList.add('hidden'); 
      document.querySelector('#containerAcompanhamento').classList.remove('hidden');


      app.method.loading(true);

      app.method.get('/pedido/' + idPedido,
        (response) => {
          console.log(response);
          app.method.loading(false);

          if (response.status == "error" || !response.data){
            app.method.removersecao('order');
            document.querySelector('#containerNenhumPedido').classList.remove('hidden'); 
            document.querySelector('#containerAcompanhamento').classList.add('hidden');
            return;
          }

          document.querySelector('#containerAcompanhamento').innerHTML = '';

          let datacadastro = response.data.datacadastro.split('T');
          let dataFormatada = datacadastro[0].split('-')[2] + '/' + datacadastro[0].split('-')[1];
          let horarioFormatado = datacadastro[1].split(':')[0] + ':' + datacadastro[1].split(':')[1];

          let temp = pedido.template.dadospedido.replace(/\${data}/g, `${dataFormatada} às ${horarioFormatado}`)
            .replace(/\${valor}/g, `R$ ${parseFloat(response.data.total).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

          document.querySelector('#containerAcompanhamento').innerHTML += temp;

          pedido.method.carregarEtapas(response.data);

          pedido.method.carregarModalDetalhes(response);

        },
        (error) => {
          app.method.loading(false);
          console.log('error', error);
        }, true
      );

    }else{
      ORDER = null;
      document.querySelector('#containerNenhumPedido').classList.remove('hidden');
      document.querySelector('#containerAcompanhamento').classList.add('hidden');
    }
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

    mensagemWhatsApp: () => {
      let idpedido = ORDER.order;

      if (!idpedido) {
        app.method.mensagem('Pedido não encontrado.');
        return;
      }

      app.method.get(`/pedido/${idpedido}`,
        (response) => {
          if (response.status === 'error') {
            app.method.mensagem(response.message);
            return;
          }

          let pedido = response.data;

          let texto = `Olá! Gostaria de saber sobre o meu pedido:
            📦 Pedido: ${idpedido}
            👤 Cliente: ${pedido.nomecliente || ''}
            💰 Total: R$ ${pedido.total || ''}
          `;

          let url = `https://wa.me/5594981064520?text=${encodeURIComponent(texto)}`;
          window.open(url, '_blank');
        },
        (error) => {
          console.log('error', error);
        }
      );
    },

  carregarEtapas: (data) => {

    if(data.idpedidostatus == 6) {
      let _motivo = '<span class="text mb-0">O restaurante recusou o seu pedido. Entre em contato para mais informações.</span>'

      if (data.motivorecusa != null && data.motivorecusa.trim() != '') {
        _motivo = `<span class="text mb-0"><b>Mensagem: </b>${data.motivorecusa}</span>`
      }
  
      let temp = pedido.template.cancelado.replace(/\${motivo}/g, _motivo);
  
      if (app.method.obterValorSessao('hide_timeline_' + data.idpedido) !== 'true') {
        document.querySelector('#containerAcompanhamento').innerHTML += temp;
      }

      setTimeout(() => {
        app.method.gravarValorSessao('hide_timeline_' + data.idpedido, 'true');
        let cardCancelado = document.querySelector('.card-status-pedido.cancelado');
        if(cardCancelado) cardCancelado.remove();
      }, 120000); // 2 minutos
      return;
    }

    let pedidoEnviado = pedido.template.etapa.replace(/\${icon}/g, '<i class="fas fa-clock"></i>')
      .replace(/\${titulo}/g, 'Pedido enviado!');

    let preparando = pedido.template.etapa.replace(/\${icon}/g, '<i class="fas fa-utensils"></i>')
      .replace(/\${titulo}/g, 'Preparando');

    let indo = pedido.template.etapa.replace(/\${icon}/g, data.idtipoentrega == 1 ? '<i class="fas fa-motorcycle"></i>' : '<i class="fas fa-box"></i>')
      .replace(/\${titulo}/g, data.idtipoentrega == 1 ? 'Indo até você' : 'Pedido pronto!');

    if(data.idpedidostatus == 1) {
      pedidoEnviado = pedidoEnviado.replace(/\${status}/g, 'active')
        .replace(/\${status-icon}/g, '')
        .replace(/\${descricao}/g, 'Aguardando a confirmação do pedido')

      preparando = preparando.replace(/\${status}/g, 'pending')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')

      indo = indo.replace(/\${status}/g, 'pending')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')
    }

    // Aceito ou Em preparo
    if (data.idpedidostatus == 2 || data.idpedidostatus == 3) {
      pedidoEnviado = pedidoEnviado.replace(/\${status}/g, '')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')

      preparando = preparando.replace(/\${status}/g, 'active')
        .replace(/\${status-icon}/g, '')
        .replace(/\${descricao}/g, 'Seu pedido está sendo preparado')

      indo = indo.replace(/\${status}/g, 'pending')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')
    }

    // Em entrega (ou retirada)
    if (data.idpedidostatus == 4) {
      pedidoEnviado = pedidoEnviado.replace(/\${status}/g, '')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')

      preparando = preparando.replace(/\${status}/g, '')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')

      indo = indo.replace(/\${status}/g, 'active')
        .replace(/\${status-icon}/g, '')
        .replace(/\${descricao}/g, data.idtipoentrega == 1 ? 'Saiu para entrega' : 'Seu pedido já pode ser retirado')
    }

    // Concluido
    if (data.idpedidostatus == 5) {
      pedidoEnviado = pedidoEnviado.replace(/\${status}/g, '')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')

      preparando = preparando.replace(/\${status}/g, '')
        .replace(/\${status-icon}/g, 'status')
        .replace(/\${descricao}/g, '')

      indo = indo.replace(/\${status}/g, 'completed')
        .replace(/\${status-icon}/g, '')
        .replace(/\${descricao}/g, 'Seu pedido foi entregue')
        .replace(/fa-motorcycle|fa-box/g, 'fa-check-double')

      setTimeout(() => {
        app.method.gravarValorSessao('hide_timeline_' + data.idpedido, 'true');
        let timeline = document.querySelector('.timeline-pedidos');
        if(timeline) timeline.remove();
      }, 120000); // 2 minutos
    }

    if (app.method.obterValorSessao('hide_timeline_' + data.idpedido) !== 'true') {
      let htmlEtapas = `
        <div class="timeline-pedidos">
          ${pedidoEnviado}
          ${preparando}
          ${indo}
        </div>
      `;
      document.querySelector('#containerAcompanhamento').innerHTML += htmlEtapas;
    }

  },

  abrirModalDetalhesPedido: () => {
    MODAL_DETALHES.show();
  },

  fecharModalDetalhesPedido: () => {
    if (document.activeElement) {
      document.activeElement.blur();
    }
    MODAL_DETALHES.hide();
  },

  carregarModalDetalhes: (response) => {
    let data = response.data || response;
    document.querySelector("#itensPedido").innerHTML = '';

    document.querySelector('#lblNomeCliente').innerText = data.nomecliente;
    document.querySelector('#lblTelefoneCliente').innerText = data.telefonecliente;
    document.querySelector('#lblFormaPagamentoTitulo').innerText = data.formapagamento;
    document.querySelector('#lblFormaPagamentoDescricao').innerText = 'Pagamento na entrega do pedido';

    if (data.idformapagamento == 1) {
      document.querySelector('#lblFormaPagamentoIcon').innerHTML = '<i class="fas fa-receipt"></i>';
    }
    else if (data.idformapagamento == 2) {
      document.querySelector('#lblFormaPagamentoIcon').innerHTML = '<i class="fas fa-coins"></i>';
      document.querySelector('#lblFormaPagamentoDescricao').innerHTML = data.troco != null ? `Troco para ${(data.troco).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} reais` : 'Pagamento na entrega do pedido';
    }
    else {
      document.querySelector('#lblFormaPagamentoIcon').innerHTML = '<i class="fas fa-credit-card"></i>';
      document.querySelector('#lblFormaPagamentoDescricao').innerHTML = data.idtipoentrega == 1 ? 'Levar maquininha de cartão' : 'Pagamento na retirada do pedido';
    }

    let cartArray = response.cart || (ORDER && ORDER.cart) || [];

    cartArray.forEach((e) => {
      let itens = '';
      let totalOpcionais = 0;

      // Note: A API retorna os opcionais de forma diferente (nomeopcional, valoropcional diretamente no item) 
      // Se tivermos e.opcionais (quando gravado pelo frontend), lemos a partir dali. 
      if (e.opcionais && e.opcionais.length > 0) {
        for (let index = 0; index < e.opcionais.length; index++) {
          let element = e.opcionais[index];
          totalOpcionais += parseFloat(element.valoropcional || 0);

          itens += pedido.template.opcional
            .replace(/\${nome}/g, `1x ${element.nomeopcional}`)
            .replace(/\${preco}/g, `+ R$ ${parseFloat(element.valoropcional || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
        }
      } else if (e.nomeopcional) {
          // Quando vem da API através do obterItensPedidos
          totalOpcionais += parseFloat(e.valoropcional || 0);
          itens += pedido.template.opcional
            .replace(/\${nome}/g, `1x ${e.nomeopcional}`)
            .replace(/\${preco}/g, `+ R$ ${parseFloat(e.valoropcional || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
      }

      let obs = '';

      if (e.observacao != null && e.observacao.length > 0) {
        obs = pedido.template.obs.replace(/\${observacao}/g, e.observacao);
      }

      let subTotalItem = parseFloat(e.valor || 0) * parseInt(e.quantidade || 1);

      let temp = pedido.template.produto
        .replace(/\${guid}/g, e.guid)
        .replace(/\${nome}/g, `${e.quantidade}x ${e.nome}`)
        .replace(/\${preco}/g, `R$ ${subTotalItem.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`)
        .replace(/\${obs}/g, obs)
        .replace(/\${opcionais}/g, itens);

      document.querySelector('#itensPedido').innerHTML += temp;
    });

    if (data.taxaentrega > 0) {
      let valorTaxa = data.taxaentrega ? parseFloat(data.taxaentrega) : 0;
      let temptaxa = pedido.template.taxaentrega.replace(/\${total}/g, `+ R$ ${valorTaxa.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
      document.querySelector('#itensPedido').innerHTML += temptaxa;
    }

    if (data.desconto > 0) {
      let valorDesconto = data.desconto ? parseFloat(data.desconto) : 0;
      let tempdesconto = pedido.template.desconto.replace(/\${total}/g, `- R$ ${valorDesconto.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
      document.querySelector('#itensPedido').innerHTML += tempdesconto;
    }

    let temptotal = pedido.template.total.replace(/\${total}/g, `R$ ${parseFloat(data.total).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);
    document.querySelector('#itensPedido').innerHTML += temptotal;
  },

}

pedido.template = {
  dadospedido: `
    <div class="card card-status-pedido mb-4">
      <div class="detalhes-produto">
          <div class="infos-produto">
            <p class="name-total mb-0"><b>\${data}</b></p>
            <p class="price-total mb-0"><b>\${valor}</b></p>
          </div>
      </div>
      <div class="detalhes-produto-acoes" onclick="pedido.method.mensagemWhatsApp()">
        <i class="fab fa-whatsapp"></i>
        <p class="mb-0 mt-1">Mensagem</p>
      </div>
      <div class="detalhes-produto-acoes" onclick="pedido.method.abrirModalDetalhesPedido()">
        <i class="far fa-file-alt"></i>
        <p class="mb-0 mt-1">Ver pedido</p>
      </div>
    </div>`,

    cancelado: `
      <div class="card card-status-pedido mt-2 cancelado">
        <div class="img-icon-details">
          <i class="fas fa-times"></i>
        </div>
        <div class="infos">
          <p class="name mb-1"><b>Pedido recusadp!</b></p>
          \${motivo}
        </div>
      </div>`
    ,
    
    etapa: `
    <div class="card card-status-pedido mt-3 \${status}">
      <div class="img-icon-details" \${status-icon}>
        \${icon}
      </div>
      <div class="infos">
        <p class="name mb-1"><b>\${titulo}</b></p>
        \${descricao}
      </div>
    </div>
    `,
    produto: `
    <div class="pedido-detalhe-card mb-3">
      <div class="pedido-detalhe-produto">
        <div>
          <p class="pedido-detalhe-nome mb-1">
            <b>\${nome}</b>
          </p>
          \${opcionais}
          \${obs}
        </div>

        <p class="pedido-detalhe-preco mb-0">
          <b>\${preco}</b>
        </p>
      </div>
    </div>
  `,

  opcional: `
    <div class="pedido-detalhe-opcional">
      <span class="pedido-detalhe-opcional-nome">
        \${nome}
      </span>

      <span class="pedido-detalhe-opcional-preco">
        \${preco}
      </span>
    </div>
  `,

  obs: `
    <div class="pedido-detalhe-obs">
      <i class="fas fa-comment-alt"></i>
      <span>\${observacao}</span>
    </div>
  `,

  taxaentrega: `
    <div class="pedido-detalhe-card pedido-detalhe-taxa mb-2">
      <div class="pedido-detalhe-produto">
        <p class="pedido-detalhe-nome mb-0">
          <i class="fas fa-motorcycle"></i>&nbsp;
          <b>Taxa de entrega</b>
        </p>

        <p class="pedido-detalhe-preco mb-0">
          <b>\${total}</b>
        </p>
      </div>
    </div>
  `,

  desconto: `
    <div class="pedido-detalhe-card pedido-detalhe-taxa mb-2" style="color: #28a745;">
      <div class="pedido-detalhe-produto">
        <p class="pedido-detalhe-nome mb-0">
          <i class="fas fa-tags"></i>&nbsp;
          <b>Desconto</b>
        </p>

        <p class="pedido-detalhe-preco mb-0">
          <b>\${total}</b>
        </p>
      </div>
    </div>
  `,

  total: `
    <div class="pedido-detalhe-total-card mb-2">
      <span>Total</span>
      <b>\${total}</b>
    </div>
  `,

}
