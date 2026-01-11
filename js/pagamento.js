document.addEventListener("DOMContentLoaded", function (event) {
  pagamento.event.init();
});


var pagamento = {};

var SUB_ORDER = null;
var TOTAL_CARRINHO = 0;

var MP = null;
var BRICKS_BUILDER = null; //variavel do mercado pago container bricks;

pagamento.event = {
  init: () => {

    app.method.loading(true);

    let subOrderAtual = app.method.obterValorSessao('sub-order');

    SUB_ORDER = subOrderAtual !== undefined ? JSON.parse(subOrderAtual) : null;

    if(SUB_ORDER === null) {
      window.location.href = '/index.html';
    }

    pagamento.method.obterTotalCarrinho(pagamento.method.obterDadosMP);

  },
}

pagamento.method = {
  obterTotalCarrinho: (callback) => {
    let total = 0;

    if(SUB_ORDER.cart.length > 0) {

      SUB_ORDER.cart.forEach((e, i) => {
        let subTotal = 0;

        if(e.opcionais.length > 0){
          for (let index = 0; index < e.opcionais.length; index++){
            let element = e.opcionais[index];
            subTotal += element.valoropcional * e.quantidade;
          }
        }

        subTotal += (e.quantidade * e.valor);
        total += subTotal;
      });

      // validar taxa entrega
      if(SUB_ORDER.taxaentrega > 0 ){
        total += SUB_ORDER.taxaentrega;
      }
    }

    TOTAL_CARRINHO = total;
    document.getElementById('lblTotalCarrinho').innerText = `R$ ${(total).toFixed(2).replace('.', ',')}`;
    callback();    

  },

  obterDadosMP: () => {

    app.method.get('/pagamento/publickey', 
      (response) => {

        console.log('response', response);
        app.method.loading(false);

        if(response.status === 'error'){
          app.method.mensagem(response.message)
          return;
        }

        if (response.data[0].publickey === null || response.data[0].publickey === ''){
          app.method.mensagem('Pagamento online não habilitado para esta empresa');
          setTimeout(() => {
            window.location.href = '/index.html';
          }, 2500)
          return;
        }

        MP = new MercadoPago(response.data[0].publickey, {
          locale: 'pt-BR',
        });

        BRICKS_BUILDER = MP.bricks();

        pagamento.method.renderPaymentBrick()


      },
      (error) => {
        console.log('error', error);
        app.method.loading(false);
      }, true
    )

  },

  renderPaymentBrick: async() => {

    const settings = {
      initialization: {
        amount: TOTAL_CARRINHO,
        payer: {
          firstName: SUB_ORDER.nomecliente,
          lastName: "",
          email: "",
        },
      },
      customization: {
        visual: {
          style: {
            theme: "default",
            customVariables: {
              baseColor: '#ffbf00',
              baseColorSecondVariant: '#ffda6f',
              buttonTextColor: '#000000',
            }
          },
        },
        paymentMethods: {
          creditCard: "all",
          bankTransfer: "all",
          maxInstallments: 1,
        },
      },
      callbacks: {
        onReady: () => {},
        onSubmit: ({ selectedPaymentMethod, formData }) => {
          let dados = {
            formData: formData,
            selectedPaymentMethod: selectedPaymentMethod,
          }

          pagamento.method.gerarPagamento(dados);
        
        },
        onError: (error) => {
          console.error(error);
          app.method.mensagem(error);
        },
      },
    };

    window.paymentBrickController = await BRICKS_BUILDER.create(
      "payment",
      "paymentBrick_container",
      settings
    );    
  },

  gerarPagamento: (dados) => {

    app.method.loading(true);

    // cria uma variavel pro back saber se é um rascunho
    SUB_ORDER.pedidoRascunho = 1;

    // se já tiver um Pedido Em rascunho criado, só continua
    if (SUB_ORDER.payment_created_id > 0) {
        pagamento.method.pagar(dados);
    }
    else {

      // Primeiro, salva o pedido como rascunho para obter o ID gerado
      app.method.post('/pedido', JSON.stringify(SUB_ORDER),
        (response) => {
          console.log(response);
          app.method.loading(false);

          if (response.status == "error") {
              console.log(response.message)
              return;
          }

          // salva o id do pedido gerado como rascunho
          SUB_ORDER.payment_created_id = response.order;
          app.method.gravarValorSessao(JSON.stringify(SUB_ORDER), 'sub-order');

          // com o ID do peido no SUB_ORDER, chama o metodo para gerar o pagamento do MP
          pagamento.method.pagar(dados);

        },
        (error) => {
          console.log('error', error);
          app.method.loading(false);
        }, true
      );

    }
  },

  pagar: (dados) => {

    dados.pedido = SUB_ORDER;

    app.method.post('/pagamento', JSON.stringify(dados),
      (response) => {

        console.log(response)
        app.method.loading(false);

        if(response.status == "error"){
          app.method.mensagem(response.mensagem)
          return;
        }
        

      },
      (error) => {
        console.log('error', error)
        app.method.loading(false);
      }
    ), true

  },
}

