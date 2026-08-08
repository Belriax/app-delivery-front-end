document.addEventListener("DOMContentLoaded", function (event) {
    app.event.init();
    app.method.validaToken();
    app.method.carregarDadosEmpresa();
    garcons.event.init();
});

var garcons = {};

garcons.event = {
    init: () => {
        garcons.method.obterGarcons();
    }
}

garcons.method = {
    obterGarcons: () => {
        app.method.loading(true);
        app.method.get('/garcom',
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    console.log(response.message);
                    return;
                }
                garcons.method.carregarTabela(response.data);
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
            html = '<tr><td colspan="4" class="text-center text-muted">Nenhum garçom cadastrado.</td></tr>';
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
                            <button class="btn btn-sm btn-outline-primary" onclick='garcons.method.abrirModalEdicao(${JSON.stringify(item).replace(/'/g, "&#39;")})'><i class="fas fa-edit"></i></button>
                            <button class="btn btn-sm btn-outline-danger" onclick="garcons.method.abrirModalRemover(${item.idgarcom})"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </td>
                </tr>`;
            });
        }
        document.getElementById('lista-garcons').innerHTML = html;
    },

    abrirModalCadastro: () => {
        document.getElementById('txtIdGarcom').value = '';
        document.getElementById('txtNome').value = '';
        document.getElementById('txtEmail').value = '';
        document.getElementById('txtSenha').value = '';
        document.getElementById('chkAtivo').checked = true;
        
        document.getElementById('titleModalGarcom').innerText = 'Novo Garçom';
        document.getElementById('lblSenhaObg').innerText = '*';
        document.getElementById('dicaSenha').classList.add('d-none');
        
        var modal = new bootstrap.Modal(document.getElementById('modalGarcom'));
        modal.show();
    },

    abrirModalEdicao: (item) => {
        document.getElementById('txtIdGarcom').value = item.idgarcom;
        document.getElementById('txtNome').value = item.nome;
        document.getElementById('txtEmail').value = item.email;
        document.getElementById('txtSenha').value = '';
        document.getElementById('chkAtivo').checked = (item.ativo == 1);
        
        document.getElementById('titleModalGarcom').innerText = 'Editar Garçom';
        document.getElementById('lblSenhaObg').innerText = '';
        document.getElementById('dicaSenha').classList.remove('d-none');
        
        var modal = new bootstrap.Modal(document.getElementById('modalGarcom'));
        modal.show();
    },

    salvarGarcom: () => {
        let idgarcom = document.getElementById('txtIdGarcom').value;
        let nome = document.getElementById('txtNome').value.trim();
        let email = document.getElementById('txtEmail').value.trim();
        let senha = document.getElementById('txtSenha').value.trim();
        let ativo = document.getElementById('chkAtivo').checked ? 1 : 0;

        if (nome === '' || email === '') {
            app.method.mensagem('Nome e e-mail são obrigatórios.');
            return;
        }
        
        if (!idgarcom && senha === '') {
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
        if (idgarcom) {
            dados.idgarcom = idgarcom;
            app.method.put('/garcom', JSON.stringify(dados),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $('#modalGarcom').modal('hide');
                    garcons.method.obterGarcons();
                },
                (error) => { app.method.loading(false); console.log(error); }
            );
        } else {
            app.method.post('/garcom', JSON.stringify(dados),
                (response) => {
                    app.method.loading(false);
                    if (response.status == "error") {
                        app.method.mensagem(response.message);
                        return;
                    }
                    app.method.mensagem(response.message, 'green');
                    $('#modalGarcom').modal('hide');
                    garcons.method.obterGarcons();
                },
                (error) => { app.method.loading(false); console.log(error); }
            );
        }
    },

    abrirModalRemover: (idgarcom) => {
        document.getElementById('txtIdGarcomRemover').value = idgarcom;
        var modal = new bootstrap.Modal(document.getElementById('modalRemoverGarcom'));
        modal.show();
    },

    removerGarcom: () => {
        let idgarcom = document.getElementById('txtIdGarcomRemover').value;
        
        app.method.loading(true);
        app.method.post('/garcom/remover', JSON.stringify({ idgarcom: idgarcom }),
            (response) => {
                app.method.loading(false);
                if (response.status == "error") {
                    app.method.mensagem(response.message);
                    return;
                }
                app.method.mensagem(response.message, 'green');
                $('#modalRemoverGarcom').modal('hide');
                garcons.method.obterGarcons();
            },
            (error) => { app.method.loading(false); console.log(error); }
        );
    }
}
