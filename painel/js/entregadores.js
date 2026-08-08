document.addEventListener("DOMContentLoaded", function (event) {
    app.event.init();
    app.method.validaToken();
    app.method.carregarDadosEmpresa();
    entregadores.event.init();
});

var entregadores = {};

entregadores.event = {
    init: () => {
        entregadores.method.obterEntregadores();
    }
}

entregadores.method = {
    obterEntregadores: () => {
        app.method.loading(true);
        app.method.get('/entregador',
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    console.log(response.message);
                    return;
                }
                entregadores.method.carregarTabela(response.data);
            },
            (error) => {
                app.method.loading(false);
                console.log('error', error)
            }
        )
    },

    carregarTabela: (lista) => {
        let html = '';
        if (lista.length === 0) {
            html = '<tr><td colspan="4" class="text-center text-muted">Nenhum entregador cadastrado.</td></tr>';
        } else {
            lista.forEach(item => {
                let statusBadge = item.ativo == 1 ? '<span class="badge bg-success">Ativo</span>' : '<span class="badge bg-danger">Inativo</span>';
                
                html += `
                <tr>
                    <td><b>${item.nome}</b></td>
                    <td>${item.email}</td>
                    <td>${statusBadge}</td>
                    <td class="text-end">
                        <div class="d-flex justify-content-end gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick='entregadores.method.abrirModalEdicao(${JSON.stringify(item).replace(/'/g, "&#39;")})'><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="entregadores.method.abrirModalRemover(${item.identregador})"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
        }
        document.getElementById('lista-entregadores').innerHTML = html;
    },

    abrirModalCadastro: () => {
        document.getElementById('txtIdEntregador').value = '';
        document.getElementById('txtNome').value = '';
        document.getElementById('txtEmail').value = '';
        document.getElementById('txtSenha').value = '';
        document.getElementById('chkAtivo').checked = true;
        
        document.getElementById('titleModalEntregador').innerText = 'Novo Entregador';
        document.getElementById('lblSenhaObg').innerText = '*';
        document.getElementById('dicaSenha').classList.add('d-none');
        
        var modal = new bootstrap.Modal(document.getElementById('modalEntregador'));
        modal.show();
    },

    abrirModalEdicao: (item) => {
        document.getElementById('txtIdEntregador').value = item.identregador;
        document.getElementById('txtNome').value = item.nome;
        document.getElementById('txtEmail').value = item.email;
        document.getElementById('txtSenha').value = '';
        document.getElementById('chkAtivo').checked = (item.ativo == 1);
        
        document.getElementById('titleModalEntregador').innerText = 'Editar Entregador';
        document.getElementById('lblSenhaObg').innerText = '';
        document.getElementById('dicaSenha').classList.remove('d-none');
        
        var modal = new bootstrap.Modal(document.getElementById('modalEntregador'));
        modal.show();
    },

    salvarEntregador: () => {
        let identregador = document.getElementById('txtIdEntregador').value;
        let nome = document.getElementById('txtNome').value.trim();
        let email = document.getElementById('txtEmail').value.trim();
        let senha = document.getElementById('txtSenha').value.trim();
        let ativo = document.getElementById('chkAtivo').checked ? 1 : 0;

        if (nome === '' || email === '') {
            app.method.mensagem('Nome e e-mail são obrigatórios.');
            return;
        }
        
        if (!identregador && senha === '') {
            app.method.mensagem('A senha é obrigatória para novos cadastros.');
            return;
        }

        let dados = {
            nome: nome,
            email: email,
            ativo: ativo
        };
        
        if (senha !== '') {
            dados.senha = senha;
        }

        app.method.loading(true);
        if (identregador) {
            dados.identregador = identregador;
            app.method.put('/entregador', JSON.stringify(dados),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $('#modalEntregador').modal('hide');
                    entregadores.method.obterEntregadores();
                },
                (error) => { app.method.loading(false); console.log(error); }
            );
        } else {
            app.method.post('/entregador', JSON.stringify(dados),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $('#modalEntregador').modal('hide');
                    entregadores.method.obterEntregadores();
                },
                (error) => { app.method.loading(false); console.log(error); }
            );
        }
    },

    abrirModalRemover: (identregador) => {
        document.getElementById('txtIdEntregadorRemover').value = identregador;
        var modal = new bootstrap.Modal(document.getElementById('modalRemoverEntregador'));
        modal.show();
    },

    removerEntregador: () => {
        let identregador = document.getElementById('txtIdEntregadorRemover').value;
        
        app.method.loading(true);
        app.method.post('/entregador/remover', JSON.stringify({ identregador: identregador }),
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    app.method.mensagem(response.message);
                    return;
                }
                app.method.mensagem(response.message, 'green');
                $('#modalRemoverEntregador').modal('hide');
                entregadores.method.obterEntregadores();
            },
            (error) => { app.method.loading(false); console.log(error); }
        );
    }
}
