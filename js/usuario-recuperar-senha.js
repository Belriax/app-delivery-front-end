document.addEventListener("DOMContentLoaded", function () {

  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  if (!token) {
    alert("Link inválido ou expirado.");
    window.location.href = "./login.html";
    return;
  }

  const toggleSenha = (btnId, inputId) => {
    const btn = document.getElementById(btnId);
    const input = document.getElementById(inputId);
    if (btn && input) {
      btn.addEventListener("click", function() {
        const icon = this.querySelector("i");
        if (input.type === "password") {
          input.type = "text";
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          input.type = "password";
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      });
    }
  };

  toggleSenha("btnToggleSenha", "txtSenha");
  toggleSenha("btnToggleConfirmarSenha", "txtConfirmarSenha");

  document.getElementById("btnSalvar").addEventListener("click", function (e) {
    e.preventDefault();

    const novaSenha = document.getElementById("txtSenha").value.trim();
    const confirmarSenha = document.getElementById("txtConfirmarSenha").value.trim();

    if (!novaSenha || !confirmarSenha) {
      alert("Preencha as duas senhas.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      alert("As senhas não conferem.");
      return;
    }

    if (novaSenha.length < 4) {
      alert("A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    const dados = {
      token,
      novaSenha
    };

    app.method.loading(true);

    // Usa POST mas desativa a checagem de token de autenticação local (login = false por default em app.method.post, mas o último parametro é login, que na verdade valida token se for true. Wait, get e post validam se login for false, vamos ver)
    // Em app.js: validaToken(login) -> if (!login) return true; So it doesn't redirect if login=false.
    app.method.post('/cliente/resetar-senha', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);

        if (response.status === "error") {
          alert(response.message);
          return;
        }

        app.method.mensagem("Senha alterada com sucesso!", "green");
        
        setTimeout(() => {
          window.location.href = "./login.html";
        }, 1500);
      },
      (error) => {
        app.method.loading(false);
        console.log(error);
        alert("Erro ao alterar senha. O link pode ser inválido ou expirado.");
      }
    );
  });

});
