document.addEventListener("DOMContentLoaded", function () {

  if (localStorage.getItem("usuarioLogado") === "true" && localStorage.getItem("tokenCliente")) {
    window.location.href = "./perfil.html";
    return;
  }

  if (!localStorage.getItem("idempresa")) {
    app.method.get('/empresa', (response) => {
      if (response.status === "success" && response.data.length > 0) {
        localStorage.setItem("idempresa", response.data[0].idempresa);
      }
    }, () => {});
  }

  const txtTelefone = document.getElementById("txtTelefone");
  if (txtTelefone) {
    txtTelefone.addEventListener("input", function() {
      this.value = app.method.mascaraTelefone(this.value);
    });
  }

  const btnToggleSenha = document.getElementById("btnToggleSenha");
  const txtSenha = document.getElementById("txtSenha");
  if (btnToggleSenha && txtSenha) {
    btnToggleSenha.addEventListener("click", function() {
      const icon = this.querySelector("i");
      if (txtSenha.type === "password") {
        txtSenha.type = "text";
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      } else {
        txtSenha.type = "password";
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    });
  }

  document.getElementById("btnLogin").addEventListener("click", function (e) {
    e.preventDefault();

    const telefone = document.getElementById("txtTelefone").value.replace(/\D/g, "");
    const senha = document.getElementById("txtSenha").value.trim();
    const idempresa = Number(localStorage.getItem("idempresa"));

    if (!idempresa) {
      alert("Não foi possível identificar a empresa. Recarregue a página.");
      return;
    }

    if (!telefone || !senha) {
      alert("Informe telefone e senha.");
      return;
    }

    const dados = {
      idempresa,
      telefone,
      senha
    };

    app.method.loading(true);

    app.method.post('/cliente/login', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === "error") {
          alert(response.message);
          return;
        }

        localStorage.setItem("usuarioLogado", "true");
        localStorage.setItem("tokenCliente", response.data.tokenCliente);
        localStorage.setItem("cliente", JSON.stringify(response.data.cliente));
        localStorage.setItem("idcliente", response.data.cliente.idcliente);
        localStorage.setItem("clienteNome", response.data.cliente.nome);
        localStorage.setItem("clienteTelefone", response.data.cliente.telefone);

        // GA4 Event: login
        if (typeof gtag === 'function') {
          gtag('event', 'login', { method: 'Local' });
        }

        // Recupera o último pedido do cliente para manter no acompanhamento
        app.method.get('/pedido/historico/cliente/' + response.data.cliente.idcliente, 
          (histResp) => {
            if (histResp.status === "success" && histResp.data && histResp.data.length > 0) {
              localStorage.setItem("order", JSON.stringify({ order: histResp.data[0].idpedido }));
            } else {
              localStorage.removeItem("order");
            }
            window.location.href = "./index.html";
          }, 
          (error) => {
            localStorage.removeItem("order");
            window.location.href = "./index.html";
          }
        );
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao fazer login.");
      }
    );
  });

});