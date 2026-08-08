document.addEventListener("DOMContentLoaded", function () {
  carregarPerfilCliente();

  document.getElementById("btnSairCliente").addEventListener("click", function (e) {
    e.preventDefault();

    localStorage.removeItem("usuarioLogado");
    localStorage.removeItem("tokenCliente");
    localStorage.removeItem("cliente");
    localStorage.removeItem("idcliente");
    localStorage.removeItem("clienteNome");
    localStorage.removeItem("clienteTelefone");
    localStorage.removeItem("order");

    window.location.href = "./index.html";
  });
});

function carregarPerfilCliente() {
  const tokenCliente = localStorage.getItem("tokenCliente");

  if (!tokenCliente) {
    window.location.href = "./login.html";
    return;
  }

  app.method.loading(true);

  fetch('/cliente/perfil', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'authorization': tokenCliente
    }
  })
    .then((response) => response.json())
    .then((response) => {
      app.method.loading(false);

      if (response.status === "error" || !response.data) {
        alert("Faça login novamente.");
        localStorage.removeItem("usuarioLogado");
        localStorage.removeItem("tokenCliente");
        localStorage.removeItem("cliente");
        localStorage.removeItem("idcliente");
        localStorage.removeItem("clienteNome");
        localStorage.removeItem("clienteTelefone");
        window.location.href = "./login.html";
        return;
      }

      document.getElementById("lblNomeCliente").innerText = response.data.nome;
      document.getElementById("lblTelefoneCliente").innerText = response.data.telefone;
      document.getElementById("lblPontosCliente").innerText = response.data.pontos || 0;
      document.getElementById("lblCashbackCliente").innerText =
        "R$ " + Number(response.data.cashback || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});

      localStorage.setItem("cliente", JSON.stringify(response.data));
    })
    .catch((error) => {
      app.method.loading(false);
      console.log(error);
      alert("Erro ao carregar perfil.");
    });
}