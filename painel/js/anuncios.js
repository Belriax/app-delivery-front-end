$(document).ready(function () {
    app.method.validaToken();
    app.method.carregarDadosEmpresa();
    
    anuncios.method.obterTodosAnuncios();
});

var LISTA_ANUNCIOS = [];

var anuncios = {};

anuncios.method = {

    obterTodosAnuncios: () => {
        app.method.loading(true);
        app.method.get('/anuncio',
            (response) => {
                app.method.loading(false);
                if (response.status === "error") {
                    app.method.mensagem(response.message);
                    return;
                }
                LISTA_ANUNCIOS = response.data;
                anuncios.method.renderizarAnuncios();
            },
            (error) => {
                app.method.loading(false);
                app.method.mensagem('Erro ao carregar anúncios.', 'red');
            }
        );
    },

    renderizarAnuncios: () => {
        let tbody = $("#lista-anuncios");
        tbody.html('');

        if (LISTA_ANUNCIOS.length === 0) {
            tbody.append(`<tr><td colspan="6" class="text-center">Nenhum anúncio encontrado.</td></tr>`);
            return;
        }

        LISTA_ANUNCIOS.forEach((item) => {
            let dataInicio = item.data_inicio ? new Date(item.data_inicio).toLocaleString('pt-BR') : 'Livre';
            let dataFim = item.data_fim ? new Date(item.data_fim).toLocaleString('pt-BR') : 'Livre';
            let ativoText = item.ativo == 1 ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-danger">Inativo</span>';

            let row = `
                <tr>
                    <td><img src="${item.imagem}" width="80" style="border-radius:4px; max-height: 50px; object-fit: cover;"></td>
                    <td>${item.titulo}</td>
                    <td><small>${dataInicio}<br>até<br>${dataFim}</small></td>
                    <td>${ativoText}</td>
                    <td>${item.ordem}</td>
                    <td class="text-end">
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-secondary" onclick="anuncios.method.subirOrdem(${item.idanuncio})" title="Subir"><i class="fas fa-arrow-up"></i></button>
                            <button class="btn btn-sm btn-outline-secondary" onclick="anuncios.method.descerOrdem(${item.idanuncio})" title="Descer"><i class="fas fa-arrow-down"></i></button>
                            <button class="btn btn-sm btn-outline-primary" onclick="anuncios.method.abrirModalEdicao(${item.idanuncio})" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="anuncios.method.abrirModalRemover(${item.idanuncio})" title="Remover"><i class="fas fa-trash"></i></button>
                        </div>
                    </td>
                </tr>
            `;
            tbody.append(row);
        });
    },

        subirOrdem: (idanuncio) => {
        let index = LISTA_ANUNCIOS.findIndex(e => e.idanuncio == idanuncio);
        if (index > 0) {
            // Troca de posicao com o de cima
            let temp = LISTA_ANUNCIOS[index - 1];
            LISTA_ANUNCIOS[index - 1] = LISTA_ANUNCIOS[index];
            LISTA_ANUNCIOS[index] = temp;
            anuncios.method.atualizarOrdemNoBanco();
        }
    },
    descerOrdem: (idanuncio) => {
        let index = LISTA_ANUNCIOS.findIndex(e => e.idanuncio == idanuncio);
        if (index < LISTA_ANUNCIOS.length - 1 && index !== -1) {
            // Troca de posicao com o de baixo
            let temp = LISTA_ANUNCIOS[index + 1];
            LISTA_ANUNCIOS[index + 1] = LISTA_ANUNCIOS[index];
            LISTA_ANUNCIOS[index] = temp;
            anuncios.method.atualizarOrdemNoBanco();
        }
    },
    atualizarOrdemNoBanco: () => {
        let payload = {
            lista: LISTA_ANUNCIOS.map((item, index) => ({
                idanuncio: item.idanuncio,
                ordem: index
            }))
        };
        app.method.loading(true);
        app.method.post('/anuncio/ordenar', JSON.stringify(payload),
            (response) => {
                app.method.loading(false);
                anuncios.method.obterTodosAnuncios();
            },
            (error) => {
                app.method.loading(false);
                app.method.mensagem('Erro ao ordenar.', 'red');
            }
        );
    },
    
    abrirModalCadastro: () => {
        $("#txtIdAnuncio").val('');
        $("#txtOrdemAnuncio").val('0');
        $("#txtTitulo").val('');
        $("#txtDescricao").val('');
        $("#txtLinkBotao").val('');
        $("#txtTextoBotao").val('');
        $("#txtDataInicio").val('');
        $("#txtDataFim").val('');
        $("#txtImagemUrl").val('');
        $("#fileImagem").val('');
        $("#chkAtivo").prop("checked", true);
        
        $("#containerPreview").hide();
        $("#imgPreview").attr("src", "");

        $("#titleModalAnuncio").text("Novo Anúncio");
        $("#modalAnuncio").modal('show');
    },

    abrirModalEdicao: (idanuncio) => {
        let item = LISTA_ANUNCIOS.find(e => e.idanuncio == idanuncio);
        if (!item) return;

        $("#txtIdAnuncio").val(item.idanuncio);
        $("#txtOrdemAnuncio").val(item.ordem);
        $("#txtTitulo").val(item.titulo);
        $("#txtDescricao").val(item.descricao || '');
        $("#txtLinkBotao").val(item.link_botao || '');
        $("#txtTextoBotao").val(item.texto_botao || '');
        
        if (item.data_inicio) {
            let di = new Date(item.data_inicio);
            di.setMinutes(di.getMinutes() - di.getTimezoneOffset());
            $("#txtDataInicio").val(di.toISOString().slice(0, 16));
        } else {
            $("#txtDataInicio").val('');
        }

        if (item.data_fim) {
            let df = new Date(item.data_fim);
            df.setMinutes(df.getMinutes() - df.getTimezoneOffset());
            $("#txtDataFim").val(df.toISOString().slice(0, 16));
        } else {
            $("#txtDataFim").val('');
        }

        $("#chkAtivo").prop("checked", item.ativo == 1);
        
        $("#txtImagemUrl").val('');
        $("#fileImagem").val('');
        
        if (item.imagem) {
            $("#imgPreview").attr("src", item.imagem);
            $("#containerPreview").show();
        } else {
            $("#containerPreview").hide();
        }

        $("#titleModalAnuncio").text("Editar Anúncio");
        $("#modalAnuncio").modal('show');
    },

    converterImagemBase64: (input) => {
        if (input.files && input.files[0]) {
            let reader = new FileReader();
            reader.onload = function (e) {
                $("#txtImagemUrl").val(e.target.result);
                $("#imgPreview").attr("src", e.target.result);
                $("#containerPreview").show();
            };
            reader.readAsDataURL(input.files[0]);
        }
    },

    salvarAnuncio: () => {
        let idanuncio = $("#txtIdAnuncio").val();
        let ordem = $("#txtOrdemAnuncio").val();
        let titulo = $("#txtTitulo").val().trim();
        let descricao = $("#txtDescricao").val().trim();
        let link_botao = $("#txtLinkBotao").val().trim();
        let texto_botao = $("#txtTextoBotao").val().trim();
        let data_inicio = $("#txtDataInicio").val();
        let data_fim = $("#txtDataFim").val();
        let ativo = $("#chkAtivo").prop("checked") ? 1 : 0;
        let imagemUrl = $("#txtImagemUrl").val();

        if (titulo.length <= 0) {
            app.method.mensagem('O título é obrigatório.');
            return;
        }

        let isEditing = idanuncio && idanuncio.length > 0;

        if (!isEditing && imagemUrl.length <= 0) {
            app.method.mensagem('A imagem do banner é obrigatória para novos anúncios.');
            return;
        }

        let payload = {
            titulo: titulo,
            descricao: descricao,
            link_botao: link_botao,
            texto_botao: texto_botao,
            ativo: ativo,
            data_inicio: data_inicio ? data_inicio.replace('T', ' ') + ':00' : null,
            data_fim: data_fim ? data_fim.replace('T', ' ') + ':00' : null,
            imagem: imagemUrl,
            ordem: ordem
        };

        app.method.loading(true);
        if (isEditing) {
            payload.idanuncio = idanuncio;
            app.method.post('/anuncio/atualizar', JSON.stringify(payload),
                (response) => {
                    app.method.loading(false);
                    if (response.status === "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $("#modalAnuncio").modal('hide');
                    anuncios.method.obterTodosAnuncios();
                    $("#modalRemoverAnuncio").modal("hide");
                },
                (error) => {
                    app.method.loading(false);
                    app.method.mensagem('Erro ao atualizar.', 'red');
                }
            );
        } else {
            app.method.post('/anuncio', JSON.stringify(payload),
                (response) => {
                    app.method.loading(false);
                    if (response.status === "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $("#modalAnuncio").modal('hide');
                    anuncios.method.obterTodosAnuncios();
                    $("#modalRemoverAnuncio").modal("hide");
                },
                (error) => {
                    app.method.loading(false);
                    app.method.mensagem('Erro ao cadastrar.', 'red');
                }
            );
        }
    },

    abrirModalRemover: (idanuncio) => {
        $("#txtIdAnuncioRemover").val(idanuncio);
        $("#modalRemoverAnuncio").modal('show');
    },

    removerAnuncio: () => {
        let idanuncio = $("#txtIdAnuncioRemover").val();
        if(!idanuncio) return;
        
        app.method.loading(true);
        app.method.post('/anuncio/remover', JSON.stringify({ idanuncio: idanuncio }),
            (response) => {
                app.method.loading(false);
                if (response.status === "error") {
                    app.method.mensagem(response.message);
                    return;
                }
                app.method.mensagem(response.message, 'green');
                anuncios.method.obterTodosAnuncios();
                $("#modalRemoverAnuncio").modal("hide");
            },
            (error) => {
                app.method.loading(false);
                app.method.mensagem('Erro ao remover.', 'red');
            }
        );
    }
};
