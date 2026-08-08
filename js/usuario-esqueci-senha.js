document.addEventListener("DOMContentLoaded", function () {

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

  document.getElementById("btnEnviar").addEventListener("click", function (e) {
    e.preventDefault();

    const telefone = txtTelefone.value.replace(/\D/g, "");
    const idempresa = Number(localStorage.getItem("idempresa"));

    if (!idempresa) {
      alert("Não foi possível identificar a empresa. Recarregue a página.");
      return;
    }

    if (!telefone) {
      alert("Informe seu telefone.");
      return;
    }

    const dados = {
      idempresa,
      telefone
    };

    app.method.loading(true);

    app.method.post('/cliente/esqueceu-senha', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === "error") {
          alert(response.message);
          return;
        }

        app.method.mensagem("Link enviado com sucesso! Verifique seu WhatsApp.", "green", 5000);
        
        setTimeout(() => {
          window.location.href = "./login.html";
        }, 5000);
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao solicitar recuperação de senha.");
      }
    );
  });

});
