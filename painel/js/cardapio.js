$(document).ready(function () {
	cardapio.event.init();
});

var cardapio = {};

var CATEGORIAS = [];
var PRODUTOS = [];

var CATEGORIA_ID = 0;
var PRODUTO_ID = 0;

var OPCIONAL_ITEM_ID = 0;

var DROP_AREA = document.getElementById("drop-area");

cardapio.event = {
	init: () => {
		app.method.validaToken();
		app.method.carregarDadosEmpresa();

		$('#categoriasMenu').sortable({
			scroll: false, // para não scrollar a tela;
			update: function (event, ui) {
				// função para atualizar a ordem da lista;
				cardapio.method.atualizarOrdemCategoria();
			},
			handle: '.drag-icon', //define a classe que pode receber o "drag and drop";
		});

		// máscara para o campo de dinheiro
		$('.money').mask('#.##0,00', {
			reverse: true,
		});

		cardapio.method.obterCategorias();
		cardapio.method.carregarListaIcones();

		// inicializa o drag e drop da imagem;
    // previne os comportamentos padrões do navegador;
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      DROP_AREA.addEventListener(eventName, cardapio.method.preventDefaults, false);
      document.body.addEventListener(eventName, cardapio.method.preventDefaults, false);
    });

    // evento quando passa o mouse em cima com a imagem segurada (hover);
    ['dragenter', 'dragover'].forEach(eventName => {
      DROP_AREA.addEventListener(eventName, cardapio.method.highlight, false);
    });

    // evento quando sai com o mouse de cima;
    ['dragleave', 'drop'].forEach(eventName => {
      DROP_AREA.addEventListener(eventName, cardapio.method.unhighlight, false);
    });

    // evento quando solta a imagem no container;
    DROP_AREA.addEventListener('drop', cardapio.method.handleDrop, false);
	},
};

cardapio.method = {
	// CATEGORIAS
	// obtém a lista de categorias;
	obterCategorias: () => {
		app.method.loading(true);
		$('#categoriasMenu').html('');

		CATEGORIAS = [];

		app.method.get('/categoria',
			(response) => {
				console.log(response);
				app.method.loading(false);

				if(response.status == 'error') {
					app.method.mensagem(response.message);
					return;
				}
				CATEGORIAS = response.data;

				cardapio.method.carregarCategorias(response.data);
			},
			(error) => {
				app.method.loading(false);
				console.log('error', error);
			},
		);
	},
	// carrega as categorias na tela;
	carregarCategorias: (lista) => {
		if(lista.length > 0) {
			lista.forEach((e, i) => {
				let icone = ICONES.filter((elem) => {
						return (elem.name === e.icone);
					}
				);

				let temp = cardapio.template.categoria
				.replace(/\${id}/g, e.idcategoria)
				.replace(/\${icone}/g, icone[0].icon)
				.replace(/\${titulo}/g, e.nome);

				$('#categoriasMenu').append(temp);

				// inicia o evento de tooltip;
				if(i + 1 == lista.length) {
					$('[data-toggle="tooltip"]').tooltip();
				}
			});
		}
	},

	// método para confirmar o cadastro / edição da categoria
	salvarCategoria: () => {
		let icone = $('#ddlIconeCategoria').val();
		let nome = $('#txtNomeCategoria').val().trim();

		if(icone == '-1') {
			app.method.mensagem('Selecione ícone da categoria, por favor');
			return;
		}

		if(nome.length <= 0){
			app.method.mensagem('Informe o nome da categoria, por favor');
			return;
		}

		let dados = {
			icone: icone,
			nome: nome,
			idcategoria: CATEGORIA_ID,
		};

		app.method.loading(true);

		app.method.post('/categoria', JSON.stringify(dados),
			(response) => {
				console.log(
					'response',
					response,
				);
				app.method.loading(false);

				$('#modalCategoria').modal('hide');

				if(response.status === 'error'){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message,'green');
				cardapio.method.obterCategorias();
			},

			(error) => {
				console.log('error', error);
				app.method.loading(false);
			},
		);
	},

	// carrega a lista de ícones da categoria
	carregarListaIcones: () => {
		$.each(ICONES, (i, e) => {
			$('#ddlIconeCategoria').append(
				`<option value="${e.name}">${e.unicode}</option>`,
			);
		});
	},

	// obter produtos por categoria
	obterProdutosCategoria: (idcategoria, forcar = false) => {
		let conteudo = document.getElementById("listaProdutos-" + idcategoria).children.length;

		if (conteudo <= 0 || forcar) {
			$("#listaProdutos-" + idcategoria).html('');

			PRODUTOS[idcategoria] = [];

			app.method.loading(true);

			app.method.get('/produto/categoria/' + idcategoria,
				(response) => {
					console.log(response)
					app.method.loading(false);

					if (response.status == "error") {
							app.method.mensagem(response.message)
							return;
					}

					PRODUTOS[idcategoria] = response.data;

					cardapio.method.carregarProdutos(response.data, idcategoria);

				},
				(error) => {
					app.method.loading(false);
					console.log('error', error)
				}
			);

		}
},

	// carrega os produtos dentro da categoria
	carregarProdutos: (lista, idcategoria) => {
		if (lista.length > 0) {
			// percorre as categorias e adiciona na tela
			lista.forEach((e, i) => {
				let imagem = `style="background-image: url('/public/images/${e.imagem}'); background-size: cover;"`;
				let btnEditar = 'hidden';
				let btnRemover = 'hidden';

				if (e.imagem == null) {
					imagem = `style="background-image: url('/public/images/default.jpg'); background-size: cover;"`;
					btnEditar = '';
				} else {
					btnRemover = '';
				}

				let badgeOpcionais = '';

				if (e.opcionais > 0) {
					badgeOpcionais = `<span class="badge-adicionais">${e.opcionais}</span>`;
				}


				let temp = cardapio.template.produto.replace(/\${id}/g, e.idproduto,)
					.replace(/\${imagem}/g, imagem,)
					.replace(/\${nome}/g, e.nome,)
					.replace(/\${descricao}/g, e.descricao,)
					.replace(/\${preco}/g, e.valor.toFixed(2).replace('.', ','))
					.replace(/\${idcategoria}/g, idcategoria,)
					.replace(/\${btnEditar}/g, btnEditar,)
					.replace(/\${btnRemover}/g, btnRemover,)
					// .replace(/\${opcionais}/g, e.opcionais > 0 ? `<span class="badge-adicionais">${e.opcionais}</span>` : '')
					.replace(/\${opcionais}/g, badgeOpcionais);

				$('#listaProdutos-' + idcategoria).append(temp);

				cardapio.method.buscarContagemOpcionais(e.idproduto);

				if ((i + 1) == lista.length) {
					// inicia o tooltip
					$('[data-toggle="tooltip"]',).tooltip();

					$('#listaProdutos-' + idcategoria,).sortable({
						scroll: false, // para não scrollar a tela;
						update: function (event, ui,){
							// função para atualizar a ordem da lista;
							cardapio.method.atualizarOrdemProduto(idcategoria,);
						},
						handle:
							'.drag-icon-produto', //define a classe que pode receber o "drag and drop";
					});
				}
			});
		} else {
			// nenhum produto encontrado
		}
	},

buscarContagemOpcionais: (idproduto) => {
    // Busca os opcionais para contar os itens
    app.method.get(`/opcional/produto/${idproduto}`,
        (response) => {
            if (response.status === 'success' && response.data) {
                // Conta os itens
                const quantidade = response.data.length;
                
                // Atualiza o badge no DOM
                cardapio.method.atualizarBadgeOpcionaisDOM(idproduto, quantidade);
            }
        },
        (error) => {
            console.error('Erro ao buscar contagem:', error);
        }
    );
},

	// Atualizar badge fazendo requisição para obter todos os opcionais
atualizarBadgeOpcionais: (idcategoria, idproduto) => {
    
    // Busca os opcionais do produto
    app.method.get(`/opcional/produto/${idproduto}`,
        (response) => {
					console.log('Resposta API:', response);
            if (response.status === 'error') {
                console.error('Erro ao buscar opcionais:', response.message);
                return;
            }
            
            // Conta quantos opcionais existem
            const quantidade = response.data ? response.data.length : 0;
            
            // Atualiza o badge no DOM
            cardapio.method.atualizarBadgeOpcionaisDOM(idproduto, quantidade);
        },
        (error) => {
            console.error('Erro na requisição:', error);
        }
    );
},

// Atualiza o badge diretamente no DOM
atualizarBadgeOpcionaisDOM: (idproduto, quantidade) => {
    // Seleciona o card do produto específico
    const card = document.querySelector(`.card[data-idproduto="${idproduto}"]`);
    
    if (!card) {
        console.error('Produto não encontrado no DOM');
        return;
    }
    
    // Localiza o link de opcionais dentro do card
    const linkOpcionais = card.querySelector('.actions a[onclick*="abrirModalOpcionaisProduto"]');
    
    if (!linkOpcionais) {
        console.error('Link de opcionais não encontrado');
        return;
    }
    
    // Remove TODOS os badges existentes (pode haver mais de um)
    const badgesExistentes = linkOpcionais.querySelectorAll('.badge-adicionais');
    badgesExistentes.forEach(badge => badge.remove());
    
    // Adiciona o novo badge SOMENTE se houver opcionais (quantidade > 0)
    if (quantidade > 0) {
        const badge = document.createElement('span');
        badge.className = 'badge-adicionais';
        badge.textContent = quantidade;
        
        // Insere o badge antes do ícone
        const icone = linkOpcionais.querySelector('i');
        if (icone) {
            linkOpcionais.insertBefore(badge, icone);
        }
    }
},

	// método que atualiza a ordem das categorias;
	atualizarOrdemCategoria: () => {
		let categorias = [];

		let listacategorias = $('#categoriasMenu > .card');

		$.each(listacategorias, (i, e) => {
			let idcategoria = $(e).attr('data-idcategoria');

			categorias.push({
				idcategoria: idcategoria,
				ordem: i + 1,
			});

			// último item, manda as informações para a API
			if ((i + 1) == listacategorias.length) {
				console.log('categorias', categorias);

				app.method.loading(true);
				app.method.post('/categoria/ordenar', JSON.stringify(categorias),
					(response) => {
						console.log('response', response);
						app.method.loading(false);

						if (response.status === 'error') {
							app.method.mensagem(response.message);
							return;
						}
						app.method.mensagem(response.message, 'green');
					},
					(error) => {
						console.log('error', error);
						app.method.loading(false);
					},
				);
			}
		});
	},

	editarCategoria: (idcategoria) => {
		CATEGORIA_ID = idcategoria;

		let categoria = CATEGORIAS.filter((e) => {
				return e.idcategoria == idcategoria;
			},
		);

		if (categoria.length > 0) {
			// altera os campos da modal
			$('#ddlIconeCategoria').val(categoria[0].icone);
			$('#txtNomeCategoria').val(categoria[0].nome);

			// abre a modal
			$('#modalCategoria').modal({
				backdrop: 'static',
			});
			$('#modalCategoria').modal('show');
		}
	},

	// método para remover a categoria;
	removerCategoria: () => {
		var data = {
			idcategoria: CATEGORIA_ID
		}

		app.method.loading(true);

		app.method.post('/categoria/remover', JSON.stringify(data),
			(response) => {
				console.log(response);

				app.method.loading(false);

				$("#modalRemoverCategoria").modal('hide');

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				cardapio.method.obterCategorias();
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			}
		);
	},

	// método para duplicar a categoria
	duplicarCategoria: () => {
		var data = {
			idcategoria: CATEGORIA_ID
		}

		app.method.loading(true);

		app.method.post('/categoria/duplicar', JSON.stringify(data),
			(response) => {
				console.log(response);

				app.method.loading(false);

				$("#modalDuplicarCategoria").modal('hide');

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				cardapio.method.obterCategorias();
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			}
		);
	},

	// método para abrir a modal para adicionar nova categoria
	abrirModalAdicionarCategoria: () => {
		CATEGORIA_ID = 0;

		// limpa os campos
		$('#ddlIconeCategoria').val('-1');
		$('#txtNomeCategoria').val('');

		// abre a modal
		$('#modalCategoria').modal({
			backdrop: 'static',
		});
		$('#modalCategoria').modal('show');
	},
	
	// abre a modal para duplicar categoria
	abrirModalDuplicarCategoria: (idcategoria) => {
		CATEGORIA_ID = idcategoria;

		$("#modalDuplicarCategoria").modal('show');
	},

	// abre modal para remover categoria;
	abrirModalRemoverCategoria: (idcategoria) => {
		CATEGORIA_ID = idcategoria;
		$('#modalRemoverCategoria').modal('show');	
	},
	
	
	// PRODUTO
	// método que atualiza a ordem dos produtos
	atualizarOrdemProduto: (idcategoria) => {
		let produtos = [];

		let listaprodutos = $(`#listaProdutos-${idcategoria} > .card`,);

		$.each(listaprodutos, (i, e) => {
			let idproduto = $(e).attr('data-idproduto',);

			produtos.push({
				idproduto: idproduto,
				ordem: i + 1,
			});

			// último item, manda as informações para a API
			if ((i + 1) == listaprodutos.length) {
				app.method.loading(true);

				app.method.post('/produto/ordenar', JSON.stringify(produtos),
					(response) => {
						console.log('response', response,);
						app.method.loading(false);

						if (response.status === 'error') {
							app.method.mensagem(response.message);
							return;
						}

						app.method.mensagem(response.message, 'green');
					},
					(error) => {
						console.log('error', error);
						app.method.loading(false);
					},
				);
			}
		});
	},

	// método para abrir a modal de adicionar novo produto;
	abrirModalAdicionarProduto: (idcategoria) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = 0;

		// limpa os campos
		$('#txtNomeProduto').val('');
		$('#txtPrecoProduto').val('');
		$('#txtDescricaoProduto').val('');

		// abre modal
		$('#modalProduto').modal({backdrop: 'static',});
		$('#modalProduto').modal('show');
	},

	// abre a modal de remover o produto
	abrirModalRemoverProduto: (idcategoria, idproduto) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = idproduto;

		$("#modalRemoverProduto").modal('show');

	},

	abrirModalDuplicarProduto: (idcategoria, produto) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = produto;

		$("#modalDuplicarProduto").modal('show');
	},

	// método para abrir a modal de editar o produto;
	editarProduto: (idcategoria, idproduto) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = idproduto;

		// obter produtos da lista global de produtos
		let produto = PRODUTOS[idcategoria].filter((e) => {
			return e.idproduto == idproduto;
		});

		// se existir o produto abre a modal
		if (produto.length > 0) {
			// limpa os campos
			$('#txtNomeProduto').val(produto[0].nome);
			$('#txtPrecoProduto').val(produto[0].valor.toFixed(2).toString().replace('.', ','));
			$('#txtDescricaoProduto').val(produto[0].descricao);

			// abre a modal
			$('#modalProduto').modal({backdrop: 'static'});
			$('#modalProduto').modal('show');
		}
	},

	// método para confirmar o cadastro / edição do produto;
	salvarProduto: () => {
		// validar os campos
		let nome = $('#txtNomeProduto').val().trim();
		let valor = parseFloat($('#txtPrecoProduto').val().replace(/\./g, '').replace(',', '.'));
		let descricao = $('#txtDescricaoProduto').val().trim();

		if (nome.length <= 0) {
			app.method.mensagem('Informe o nome do produto, por favor.');
			return;
		}

		if (isNaN(valor) || valor <= 0) {
			app.method.mensagem('Informe o valor do produto, por favor.');
			return;
		}

		let dados = {
			idcategoria: CATEGORIA_ID,
			idproduto: PRODUTO_ID,
			nome: nome,
			valor: valor,
			descricao: descricao,
		};

		app.method.loading(true);

		app.method.post('/produto', JSON.stringify(dados),
			(response) => {
				console.log('response',response,);
				app.method.loading(false);

				$('#modalProduto').modal('hide',);

				if (response.status === 'error') {
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message,'green');
				cardapio.method.obterProdutosCategoria(CATEGORIA_ID, true);
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			},
		);
	},

	// método para remover o produto;
	removerProduto: () => {
		var data = {
			idproduto: PRODUTO_ID
		}

		app.method.loading(true);

		app.method.post('/produto/remover', JSON.stringify(data),
			(response) => {
				console.log(response);

				app.method.loading(false);

				$("#modalRemoverProduto").modal('hide');

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				cardapio.method.obterProdutosCategoria(CATEGORIA_ID, true);
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			}
		);
	},

	// método para duplicar o produto;
	duplicarProduto: () => {
		var data = {
			idproduto: PRODUTO_ID
		}

		app.method.loading(true);

		app.method.post('/produto/duplicar', JSON.stringify(data),
			(response) => {
				console.log(response);

				app.method.loading(false);

				$("#modalDuplicarProduto").modal('hide');

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				cardapio.method.obterProdutosCategoria(CATEGORIA_ID, true);
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			}
		);
	},

	// abre a modal de adicionar imagem do produto
	abrirModalImagemProduto: (idcategoria, idproduto) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = idproduto;

		// limpa o input da imagem
		$("#fileElem").val(null);

		// abre o modal de upload da imagem
		$("#modalUpload").modal('show');
	},

	// faz o upload da imagem do produto
	uploadImagemProduto: (imagemUpload = []) => {
		$("#modalUpload").modal('hide');

		let formData = new FormData();

		if(imagemUpload != undefined){
			formData.append('image', imagemUpload[0]);
		}else{
			formData.append('image', document.querySelector('#fileElem').files[0]);
		}

		app.method.loading(true);

		app.method.upload('/image/produto/upload/' + PRODUTO_ID, formData,
			(response) => {
				console.log(response);

				app.method.loading(false);

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				cardapio.method.obterProdutosCategoria(CATEGORIA_ID, true);
			},
			(error) => {
				console.log('error', error)
				app.method.loading(false);
			},
		);
	},

	// remove a imagem do produto
	removerImagemProduto: () => {
		$("#modalRemoverImagemProduto").modal('hide');

		var data = {
			idproduto: PRODUTO_ID
		}

		app.method.loading(true);

		app.method.post('/image/produto/remove', JSON.stringify(data),
			(response) => {
				console.log(response);

				app.method.loading(false);

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				cardapio.method.obterProdutosCategoria(CATEGORIA_ID, true);
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			}
		);
	},

	// abre a modal para remover a imagem do produto
	abrirModalremoverImagemProduto: (idcategoria, idproduto) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = idproduto;

		$("#modalRemoverImagemProduto").modal('show');
	},

	// DRAG AND DROP - previne os comportamentos padrões
	preventDefaults: (e) => {
		e.preventDefault();
		e.stopPropagation();
	},

	// DRAG AND DROP - adiciona a classe highlight quando entra com a imagem no cotainer
	highlight: (e) => {
		if(!DROP_AREA.classList.contains('highlight')){
			DROP_AREA.classList.add('highlight');
		}
	},

	// DRAG AND DROP - remove a classe highlight quando entra com a imagem no cotainer
	unhighlight: (e) => {
		DROP_AREA.classList.remove('highlight');
	},

	// DRAG AND DROP - quando solta a imagem no cotainer
	handleDrop: (e) => {
		var dt = e.dataTrasnfer;
		var files = dt.files;

		cardapio.method.uploadImagemProduto(files);
	},

	// OPCIONAIS

	abrirModalOpcionaisProduto: (idcategoria, idproduto) => {
		CATEGORIA_ID = idcategoria;
		PRODUTO_ID = idproduto;
		// limpa os campos
		$("#listaOpcionaisProduto").html('');
		
		$("#modalOpcionaisProduto").modal({ backdrop: 'static'});
		$('#modalOpcionaisProduto').modal('show');

		cardapio.method.obterOpcicionaisProduto(idproduto);
	},


		obterOpcicionaisProduto: (idproduto) => {

		app.method.loading(true);		

		app.method.get('/opcional/produto/' + idproduto,
				(response) => {
					console.log(response)
					app.method.loading(false);

					if (response.status == "error") {
							app.method.mensagem(response.message)
							return;
					}


					cardapio.method.carregarOpcionaisProduto(response.data);
					cardapio.method.carregarOpcionaisProdutoSimples(response.data);

				},
				(error) => {
					app.method.loading(false);
					console.log('error', error)
				}
			);
	},

	carregarOpcionaisProduto: (lista) => {

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
          }else {
            subtitulo = `Escolha 1 opção.`;
            obrigatorio = `<span class="badge" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
          }
        }

        if(minimo < maximo) {
          if(minimo > 0) {
            subtitulo = `Escolha de ${minimo} até ${maximo} opções`;
            obrigatorio = `<span class="badge" id="badge-obrigatorio-${e[0]}">Obrigatório</span>`;
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
  
          itens += cardapio.template.opcionalItem.replace(/\${idopcionalitem}/g, element.idopcionalitem)
          .replace(/\${nome}/g, element.nomeopcional)
          .replace(/\${valor}/g, valor)
          .replace(/\${idopcional}/g, e[0])
        }

        let temp = cardapio.template.opcional.replace(/\${idopcional}/g, e[0])
          .replace(/\${obrigatorio}/g, obrigatorio)
          .replace(/\${titulo}/g, opcional[0].titulo)
          .replace(/\${sub-titulo}/g, subtitulo)
          .replace(/\${minimo}/g, minimo)
          .replace(/\${maximo}/g, maximo)
          .replace(/\${itens}/g, itens)

        $('#listaOpcionaisProduto').append(temp);        
      })
    }
	},


	carregarOpcionaisProdutoSimples: (lista) => {
		let listaSimples = lista.filter((elem) => { return elem.tiposimples === 1; });

		if(listaSimples.length > 0) {
			$("#listaOpcionaisProduto").append(cardapio.template.opcionalSimples);

			listaSimples.forEach((e, i) => {

				let valor = '';

				if(e.valoropcional > 0) {
					valor = `+ RS ${(e.valoropcional).toFixed(2).replace('.', ',')}`;
				}
				
				let temp = cardapio.template.opcionalItemSimples.replace(/\${idopcionalitem}/g, e.idopcionalitem)
					.replace(/\${nome}/g, e.nomeopcional,)
					.replace(/\${valor}/g, valor)

				$("#listaOpcionaisSimples").append(temp);
			});
		}
	},

	abrirModalRemoverOpcionalItem: (idopcionalitem) => {
		OPCIONAL_ITEM_ID = idopcionalitem;

		$("#modalRemoverOpcionalItem").modal('show');

	},

	removerOpcionalItem: () => {

		if(OPCIONAL_ITEM_ID > 0) {
			var dados = {
			idopcionalitem: OPCIONAL_ITEM_ID
		}

		app.method.loading(true);

		app.method.post('/opcional/item/remover', JSON.stringify(dados),
			(response) => {
				console.log(response);

				app.method.loading(false);

				if(response.status == "error"){
					app.method.mensagem(response.message);
					return;
				}

				app.method.mensagem(response.message, 'green');

				$("#modalRemoverOpcionalItem").modal('hide');

				cardapio.method.atualizarBadgeOpcionais(CATEGORIA_ID, PRODUTO_ID);

				cardapio.method.abrirModalOpcionaisProduto(CATEGORIA_ID, PRODUTO_ID);
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			}
		);
		}		
	},

	abrirModalAddOpcional: () => {
		$("#modalOpcionaisProduto").modal('hide');

		$("#container-chkOpcionalSimples").removeClass('hidden');
		$("#container-chkSelecaoOpcoes").addClass('hidden');

		$("#txtNomeSimples").val('');
		$("#txtPrecoSimples").val('');

		$("#txtTituloSecao").val('Deseja borda recheada?');
		$("#txtMinimoOpcao").val(0);
		$("#txtMaximoOpcao").val(1);

		$("#title-opcao-hint").text('Deseja borda recheada?');
		$("#text-opcao-hint").text('Escolha até 1 opção');

		$("#listaOpcoesSelecao").html('');

		$("#chkOpcionalSimples").prop('checked', true);
		$("#chkSelecaoOpcoes").prop('checked', false);

		$("#modalAddOpcionalProduto").modal({ backdrop: 'static' });
		$("#modalAddOpcionalProduto").modal('show');
	},

	salvarOpcional: () => {

		let simples = $("#chkOpcionalSimples").prop('checked');
		let opcoes = $("#chkSelecaoOpcoes").prop('checked');

		// salvar opcional simples;
		if(simples){
			let nomesimples = $("#txtNomeSimples").val().trim();
			let precosimples = parseFloat($("#txtPrecoSimples").val().replace(/\./g, '').replace(',' , '.'));

			if(nomesimples.length <= 0) {
				app.method.mensagem('Informe o nome do opcional, por favor');
				return;
			}

			if(isNaN(precosimples) || precosimples < 0) {
				app.method.mensagem('Informe o valor do opcional, por favor');
				return;
			}

			var dados = {
				nome: nomesimples,
				valor: precosimples,
				simples: true,
				idproduto: PRODUTO_ID
			}

			cardapio.method.salvarOpcionalProduto(dados);
		}

		// salvar opções seleção;

		if (opcoes) {

			let titulosecao = $("#txtTitulosecao").val().trim();
			let minimoOpcao = parseInt($("#txtMinimoOpcao").val());
			let maximoOpcao = parseInt($("#txtMaximoOpcao").val());

			if (titulosecao.length <= 0) {
				app.method.mensagem('Informe o título da sessão, por favor.');
				return;
			}

			if (minimoOpcao.length <= 0) {
				app.method.mensagem('Informe o mínimo, por favor.');
			}

			if (maximoOpcao.length <= 0){
				app.method.mensagem('Informe o máximo, por favor.');
			}

			let _opcoes = [];
			let continuar = true;

			document.querySelectorAll('#listaOpcoesSelecao .linha').forEach((e, i) => {
				let _id = e.id.split('-')[1];

				
				let nomesimples = $("#txtNomeSimples-" + _id).val().trim();
				let precosimples = parseFloat($("#txtPrecoSimples-" + _id).val().replace(/\./g, '').replace(',' , '.'));
			
				if(nomesimples.length <= 0) {
					continuar = false;
				}

				if(isNaN(precosimples) || precosimples < 0) {
					continuar = false;
				}

				_opcoes.push({
					nome: nomesimples,
					valor: precosimples,
				})
			})

			if (!continuar) {
				app.method.mensagem('Alguns campos não foram preenchidos');
				return;
			}

			if (_opcoes.length <= 0){
				app.method.mensagem('Adicione pelo menos uma opção para continuar');
				return;
			}

			var dados = {
				titulo: titulosecao,
				minimoOpcao: minimoOpcao,
				maximoOpcao: maximoOpcao,
				simples: false,
				idproduto: PRODUTO_ID,
				lista: _opcoes,
			}

			cardapio.method.salvarOpcionalProduto(dados);
		}

	},

	// método que envia a requisição para a API(salvar o opcional);
	salvarOpcionalProduto: (dados) => {

		app.method.loading(true);

		app.method.post('/opcional/produto', JSON.stringify(dados),
			(response) => {
				console.log('response', response);
				app.method.loading(false);

				if (response.status === 'error') {
					app.method.mensagem(response.message);
					return;
				}
				app.method.mensagem(response.message, 'green');

				cardapio.method.atualizarBadgeOpcionais(CATEGORIA_ID, PRODUTO_ID);

				$("#modalAddOpcionalProduto").modal('hide');
				cardapio.method.abrirModalOpcionaisProduto(CATEGORIA_ID, PRODUTO_ID);
			},
			(error) => {
				console.log('error', error);
				app.method.loading(false);
			},
		);
	},

	// seta o checkbox para a opção selecionada;
	changeTipoOpcional: (opcao) => {
		$("#chkOpcionalSimples").prop('checked',false);
		$("#chkSelecaoOpcoes").prop('checked', false);
		$("#" + opcao).prop('checked', true);

		$(".container-opcionais").addClass('hidden');
		$("#container-" + opcao).removeClass('hidden');

	},

	changeTitulosecaoOpcao: () => {

		let texto = $("#txtTitulosecao").val().trim();
		$("#title-opcao-hint").text(texto);

	},

	changeMinimoMaximoOpcao: () => {
		let minimo = parseInt($("#txtMinimoOpcao").val());
		let maximo = parseInt($("#txtMaximoOpcao").val());

		if (isNaN(minimo) || minimo < 0) {
			$("#txtMinimoOpcao").val(0);
			minimo = 0;
		}

		if (isNaN(maximo) || maximo < 1) {
			$("#txtMaximo").val(0);
			maximo = 1;
		}

		if (minimo > maximo) {
			$("#txtMinimoOpcao").val(maximo);
		} else if(maximo < minimo) {
			$("#txtMaximoOpcao").val(minimo);
		}


		cardapio.method.atualizarHintOpcao();
	},

	atualizarHintOpcao: () => {

		let minimo = parseInt($("#txtMinimoOpcao").val());
		let maximo = parseInt($("#txtMaximoOpcao").val());

		let texto  ='';

		if (minimo === maximo) {
			if(minimo > 1){
				texto = `Escolha ${minimo} opções (obrigatório)`;
			} else{
				texto = `Escolho 1 opção (obrigatório)`;
			}
		}

		if (minimo < maximo) {
			if (minimo > 0) {
				texto = `Escolha de ${minimo} até ${maximo} opções (obrigatório)`;
			} else {
				if (maximo > 1) {
					texto = `Escolha até ${maximo} opções`;
				} else {
					texto = `Escolha até 1 opção`;
				}
			}
		}

		$("#text-opcao-hint").text(texto);
	},

	// adiciona linha opcional;
	adicionarLinhaOpcao: () => {

		let id = Math.floor(Date.now() * Math.random()).toString();

		let temp = cardapio.template.opcaoSelecao.replace(/\${id}/g, id);

		$("#listaOpcoesSelecao").append(temp);

		$(".money").mask('#.##0,00', { reverse: true })
		
	},

	// remove linha opcional;
	removerLinhaOpcao: (id) => {
		$("#opcao-" + id).remove();
	},

	fecharModalAddOpcionalProduto: ()=> {
		$("#modalAddOpcionalProduto").modal({ backdrop: 'static' });
		$("#modalOpcionaisProduto").modal('show');

	},


};

// abre a modal de edição de categoria;

cardapio.template = {
	categoria: `
		<div class="card mt-3" data-idcategoria="\${id}">
			<div class="card-drag" id="heading-\${id}">
				<div class="drag-icon">
					<i class="fas fa-ellipsis-v"></i>
					<i class="fas fa-ellipsis-v"></i>
				</div>
				<div class="infos">
					<a href="#!" class="name mb-0" data-bs-toggle="collapse" data-bs-target="#collapse-\${id}" aria-expanded="true" aria-controls="collapse-\${id}" onclick="cardapio.method.obterProdutosCategoria('\${id}')" >
						<span class="me-2">\${icone}</span>
							<b>\${titulo}</b>
					</a>
				</div>

				<div class="actions">
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Editar" onclick="cardapio.method.editarCategoria('\${id}')" >
						<i class="fas fa-pencil-alt"></i>
					</a>
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Duplicar" onclick="cardapio.method.abrirModalDuplicarCategoria('\${id}')">
						<i class="far fa-copy"></i>
					</a>
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Remover" onclick="cardapio.method.abrirModalRemoverCategoria('\${id}')">
						<i class="fas fa-trash-alt"></i>
					</a>
				</div>
			</div>
			
			<div id="collapse-\${id}" class="collapse" data-parent="#categoriasMenu">
				<div class="card-body">
					<p class="title-produtos mb-0"><b>Produtos</b></p>
					<div id="listaProdutos-\${id}" class="lista-produtos">
					</div>

					<div class="card card-select mt-3" onclick="cardapio.method.abrirModalAdicionarProduto('\${id}')">
						<div class="infos-produto-opcional">
							<p class="mb-0 color-primary">
								<i class="fas fa-plus-circle"></i>&nbsp; Adicionar novo produto
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	`,

	produto: `
		<div class="card mt-3 pl-0" data-idproduto="\${id}">
			<div class="d-flex">
				<div class="drag-icon-produto">
					<i class="fas fa-ellipsis-v"></i>
					<i class="fas fa-ellipsis-v"></i>
				</div>
				<div class="container-img-produto" \${imagem}>
					<a id="btn-editar-imagem-\${id}" onclick="cardapio.method.abrirModalImagemProduto('\${idcategoria}', '\${id}')" href="#!" class="icon-action me-1 mb-1 \${btnEditar}" data-bs-toggle="tooltip" data-bs-placement="top" title="Editar">
							<i class="fas fa-pencil-alt"></i>
					</a>
					<a id="btn-remover-imagem-\${id}" onclick="cardapio.method.abrirModalremoverImagemProduto('\${idcategoria}', '\${id}')" href="#!" class="icon-action" me-1 mb-1 \${btnRemover} data-bs-toggle="tooltip" data-bs-placement="top" title="Remover">
							<i class="fas fa-trash-alt"></i>
					</a>
				</div>
				<div class="infos-produto">
					<p class="name"><b>\${nome}</b></p>
					<p class="description">\${descricao}</p>
					<p class="price"><b>R$ \${preco}</b></p>
				</div>
				<div class="actions">
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Opcionais" onclick="cardapio.method.abrirModalOpcionaisProduto('\${idcategoria}', '\${id}')">
						\${opcionais}
						<i class="fas fa-layer-group"></i>
					</a>
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Editar" onclick="cardapio.method.editarProduto('\${idcategoria}', '\${id}')">
						<i class="fas fa-pencil-alt"></i>
					</a>
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Duplicar" onclick="cardapio.method.abrirModalDuplicarProduto('\${idcategoria}', '\${id}')">
						<i class="far fa-copy"></i>
					</a>
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Remover" onclick="cardapio.method.abrirModalRemoverProduto('\${idcategoria}', '\${id}')">
						<i class="fas fa-trash-alt"></i>
					</a>
				</div>
			</div>
		</div>
	`,

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
				<div class="actions">
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Remover" onclick="cardapio.method.abrirModalRemoverOpcionalItem('\${idopcionalitem}')" data-bs-original-title="Remover">
						<i class="fas fa-trash-alt"></i>
					</a>
				</div>
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
        <div class="actions">
					<a href="#!" class="icon-action" data-toggle="tooltip" data-placement="top" title="Remover" onclick="cardapio.method.abrirModalRemoverOpcionalItem('\${idopcionalitem}')" data-bs-original-title="Remover">
						<i class="fas fa-trash-alt"></i>
					</a>
				</div>
      </div>
    </div>
  `,

	opcionalSimples: `
		<section class="opcionais-simples">
			<p class="title-categoria mb-0"><b>Opcionais</b></p>
			<div class="container-group mb-5" id="listaOpcionaisSimples">
			
			</div>
		</section>
	`,

	opcaoSelecao: `
		<div class="row linha mt-4" id="opcao-\${id}">
			<div class="col-8">
				<div class="form-group">
					<p class="title-categoria mb-0"><b>Nome:</b></p>
					<input id="txtNomeSimples-\${id}" type="text" class="form-control" placeholder="Ex: Bacon" />
				</div>
			</div>
			<div class="col-3">
				<div class="form-group">
					<p class="title-categoria mb-0"><b>Preço (R$):</b></p>
					<input id="txtPrecoSimples-\${id}" type="text" class="form-control money" placeholder="0,00" />
				</div>
			</div>
			<div class="col-1">
				<a href="#!" class="btn btn-red btn-sm mt-4" onclick="cardapio.method.removerLinhaOpcao('\${id}')">
					<i class="fas fa-trash-alt"></i>
				</a>
			</div>
		</div>		
	`,

	};
