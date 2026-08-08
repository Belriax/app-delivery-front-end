document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init();
  historico.event.init();
});

var historico = {};

historico.event = {
  init: () => {
    let idcliente = app.method.obterValorSessao('idcliente');
    
    if (!idcliente) {
      window.location.href = './login.html';
      return;
    }

    historico.method.configurarAbas();
    historico.method.obterHistoricoPedidos(idcliente);
    historico.method.obterHistoricoFidelidade(idcliente);
    
    // Atualizar badget do carrinho, se houver
    let carrinho = app.method.obterValorSessao('cart');
    if (carrinho) {
      let cart = JSON.parse(carrinho);
      if (cart.itens.length > 0) {
        document.querySelector("#icone-carrinho-vazio").classList.add('hidden');
        document.querySelector("#total-carrinho").classList.remove('hidden');
        document.querySelector("#total-carrinho").innerText = cart.itens.length;
      }
    }
  }
};

historico.method = {

  configurarAbas: () => {
    const tabs = document.querySelectorAll('.tab-historico');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content-historico').forEach(c => c.classList.remove('active'));
        
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        document.getElementById('tab-' + target).classList.add('active');
      });
    });
  },

  obterHistoricoPedidos: (idcliente) => {
    app.method.loading(true);

    app.method.get('/pedido/historico/cliente/' + idcliente,
      (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        const lista = response.data;
        const container = document.getElementById('listaPedidosHistorico');
        const semDados = document.getElementById('containerNenhumPedido');
        container.innerHTML = '';

        if (!lista || lista.length === 0) {
          semDados.classList.remove('hidden');
          return;
        }

        semDados.classList.add('hidden');

        lista.forEach(pedido => {
          let datacadastro = pedido.datacadastro.split('T');
          let dataFormatada = datacadastro[0].split('-').reverse().join('/');
          let horarioFormatado = datacadastro[1].substring(0, 5);

          let temp = historico.template.pedido
            .replace(/\${idpedido}/g, pedido.idpedido)
            .replace(/\${data}/g, `${dataFormatada} às ${horarioFormatado}`)
            .replace(/\${status}/g, pedido.status)
            .replace(/\${total}/g, `R$ ${parseFloat(pedido.total).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`);

          container.innerHTML += temp;
        });

      },
      (error) => {
        app.method.loading(false);
        console.error('error', error);
      }
    );
  },

  obterHistoricoFidelidade: (idcliente) => {
    app.method.loading(true);

    app.method.get('/fidelizacao/historico/cliente/' + idcliente,
      (response) => {
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        const lista = response.data;
        const container = document.getElementById('listaBeneficiosHistorico');
        const semDados = document.getElementById('containerNenhumBeneficio');
        container.innerHTML = '';

        if (!lista || lista.length === 0) {
          semDados.classList.remove('hidden');
          return;
        }

        semDados.classList.add('hidden');

        lista.forEach(item => {
          let datacadastro = item.datacadastro.split('T');
          let dataFormatada = datacadastro[0].split('-').reverse().join('/');
          
          let classeTipo = item.tipo === 'entrada' ? 'pontos-entrada' : 'pontos-saida';
          let icone = item.tipo === 'entrada' ? '<i class="fas fa-plus"></i>' : '<i class="fas fa-minus"></i>';
          let sinal = item.tipo === 'entrada' ? '+' : '-';
          
          let pontosTexto = '';
          if (item.pontos > 0) {
            pontosTexto = `${item.pontos} pts`;
          }
          if (item.cashback > 0) {
            if (pontosTexto !== '') pontosTexto += ' / ';
            pontosTexto += `R$ ${parseFloat(item.cashback).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
          }
          if (pontosTexto === '') pontosTexto = '0 pts';

          let temp = historico.template.beneficio
            .replace(/\${classeTipo}/g, classeTipo)
            .replace(/\${icone}/g, icone)
            .replace(/\${descricao}/g, item.descricao || (item.tipo === 'entrada' ? 'Ganho de benefício' : 'Resgate de benefício'))
            .replace(/\${data}/g, dataFormatada)
            .replace(/\${sinal}/g, sinal)
            .replace(/\${pontos}/g, pontosTexto);

          container.innerHTML += temp;
        });

      },
      (error) => {
        app.method.loading(false);
        console.error('error', error);
      }
    );
  },

  verPedido: (idpedido) => {
    app.method.gravarValorSessao('order', JSON.stringify({ order: idpedido }));
    window.location.href = './pedido.html';
  }

};

historico.template = {
  pedido: `
    <div class="historico-card mb-3 cursor-pointer" onclick="historico.method.verPedido('\${idpedido}')" style="cursor: pointer;">
      <div class="historico-icon pedido">
        <i class="fas fa-utensils"></i>
      </div>
      <div class="historico-info">
        <p><b>Pedido #\${idpedido}</b></p>
        <small>\${data}</small>
      </div>
      <div class="historico-valor">
        <p>\${total}</p>
        <small>\${status}</small>
      </div>
    </div>
  `,

  beneficio: `
    <div class="historico-card mb-3">
      <div class="historico-icon \${classeTipo}">
        \${icone}
      </div>
      <div class="historico-info">
        <p><b>\${descricao}</b></p>
        <small>\${data}</small>
      </div>
      <div class="historico-valor \${classeTipo === 'pontos-entrada' ? 'entrada' : 'saida'}">
        <p>\${sinal} \${pontos}</p>
      </div>
    </div>
  `
};
