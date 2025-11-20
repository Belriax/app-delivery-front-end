document.addEventListener("DOMContentLoaded", function (event) {

  login.event.init();

});

var login = {};

login.event = {

  init: () => {
    document.querySelector("#btnLogin").onclick = () => {
      login.method.validarLogin();
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
          app.method.gravarValorsecao(response.TokenAcesso, "token");
          app.method.gravarValorsecao(response.Nome, "Nome");
          app.method.gravarValorsecao(response.Email, "Email");
          app.method.gravarValorsecao(response.Logo, "Logo");

          window.location.href = '/painel/home.html';
        }
      },

      (error) => {
        console.log(error);
      }, true
    )
  }
};