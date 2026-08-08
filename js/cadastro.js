document.addEventListener("DOMContentLoaded", function () {

  if (!localStorage.getItem("idempresa")) {
    app.method.get('/empresa', (response) => {
      if (response.status === "success" && response.data.length > 0) {
        localStorage.setItem("idempresa", response.data[0].idempresa);
      }
    }, () => {});
  }

  document.getElementById("btnCadastrar").addEventListener("click", function (e) {
    e.preventDefault();

    const nome = document.getElementById("txtNome").value.trim();
    const telefone = document.getElementById("txtTelefone").value.replace(/\D/g, "");
    const senha = document.getElementById("txtSenha").value.trim();
    const idempresa = Number(localStorage.getItem("idempresa"));

    if (!idempresa) {
      alert("Não foi possível identificar a empresa. Recarregue a página.");
      return;
    }

    if (!nome || !telefone || !senha) {
      alert("Preencha todos os campos.");
      return;
    }

    const dados = {
      idempresa,
      nome,
      telefone,
      senha
    };

    app.method.loading(true);

    app.method.post('/cliente/cadastrar', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === "error") {
          app.method.mensagem(response.message, 'red');
          return;
        }

        app.method.mensagem("Cadastro realizado com sucesso!", 'green');
        
        // GA4 Event: sign_up
        if (typeof gtag === 'function') {
          gtag('event', 'sign_up', { method: 'Local' });
        }

        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1500);
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        app.method.mensagem("Erro ao cadastrar cliente.", 'red');
      }
    );
  });

});