document.addEventListener("DOMContentLoaded", function (event) {

  login.event.init();

});

var login = {};

login.event = {

  init: () => {
    document.querySelector("#btnLogin").onclick = () => {
      // Destrava o áudio nativo na interação do clique de login (o navegador vai lembrar dessa interação para a próxima tela)
      try {
        let _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        gain.gain.value = 0;
        osc.start();
        osc.stop(_audioCtx.currentTime + 0.01);
      } catch (e) {}

      // Pede permissão de notificação nativa
      if (window.Notification && Notification.permission === "default") {
        Notification.requestPermission();
      }

      login.method.validarLogin();
    }

    const btnToggleSenhaPainel = document.getElementById("btnToggleSenhaPainel");
    const txtSenhaLogin = document.getElementById("txtSenhaLogin");
    
    if (btnToggleSenhaPainel && txtSenhaLogin) {
      btnToggleSenhaPainel.addEventListener("click", function() {
        const icon = this.querySelector("i");
        if (txtSenhaLogin.type === "password") {
          txtSenhaLogin.type = "text";
          icon.classList.remove("fa-eye");
          icon.classList.add("fa-eye-slash");
        } else {
          txtSenhaLogin.type = "password";
          icon.classList.remove("fa-eye-slash");
          icon.classList.add("fa-eye");
        }
      });
    }
  }

}

login.method = {
  // valida os campos input;
  validarLogin: () => {
    let email = document.querySelector("#txtEmailLogin").value.trim();
    let senha = document.querySelector("#txtSenhaLogin").value.trim();

    if(email.length == 0){
      app.method.mensagem('Por favor, informe um e-mail válido!');
      document.querySelector("#txtEmailLogin").focus();
      return;
    }

    if(senha.length == 0){
      app.method.mensagem('Informe a senha por favor')
      document.querySelector("#txtSenhaLogin").focus();
      return
    }

    login.method.login(email, senha);
  },

  // método para fazer login (via API);
  login: (email, senha) => {
    var dados = {
      email: email,
      senha: senha,
    }

    app.method.post('/login', JSON.stringify(dados),
      (response) => {
        console.log(response);
        if(response.status == 'error'){
          app.method.mensagem(response.message);
          return;
        }

        if(response.status == 'success') {
          // Define qual será a permissão ativa DESTA ABA no navegador
          sessionStorage.setItem('active_role', response.Role);

          app.method.gravarValorSessao(response.TokenAcesso, "token");
          app.method.gravarValorSessao(response.Nome, "Nome");
          app.method.gravarValorSessao(response.Email, "Email");
          app.method.gravarValorSessao(response.Logo, "Logo");
          app.method.gravarValorSessao(response.Role, "Role");

          if (response.Role === 'cozinha') {
            window.location.href = '/painel/cozinha.html';
          } else {
            window.location.href = '/painel/home.html';
          }
        }
      },

      (error) => {
        console.log(error);
      }, true
    )
  }
};