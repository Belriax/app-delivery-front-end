var app = {};

var DADOS_EMPRESA = {};

window.addEventListener('beforeunload', () => {
  app.method.loading(true);
});

window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    app.method.loading(false);
  }
});

app.event = {

  init: (home = false) => {
    app.method.validarEmpresaAberta(home);
  }
}

app.method = {

  // centraliza as chamadas de GET
  get: (url, callbackSuccess, callbackError, login = false) => {

    try {

      if (app.method.validaToken(login)) {

        // Adiciona um timestamp para evitar cache do navegador (busting cache)
        let separator = url.indexOf('?') !== -1 ? '&' : '?';
        let cacheBusterUrl = url + separator + '_t=' + new Date().getTime();

        let xhr = new XMLHttpRequest();
        xhr.open('GET', cacheBusterUrl);
        xhr.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        xhr.setRequestHeader("Authorization", app.method.obterValorSessao('token'));

        xhr.onreadystatechange = function () {
          if (this.readyState == 4) {

            if (this.status == 200) {
              return callbackSuccess(JSON.parse(xhr.responseText))
            }
            else {

              // se o retorno for não autorizado, redireciona o usuário para o login
              if (xhr.status == 401) {
                app.method.logout();
              }

              return callbackError(xhr.responseText);

            }

          }
        }

        xhr.send();

      }

    } catch (error) {
      return callbackError(error)
    }

  },

  // centraliza as chamadas de POST
  post: (url, dados, callbackSuccess, callbackError, login = false) => {

    try {

      if (app.method.validaToken(login)) {

        let xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        xhr.setRequestHeader("Authorization", app.method.obterValorSessao('token'));

        xhr.onreadystatechange = function () {
          if (this.readyState == 4) {

            if (this.status == 200) {
              return callbackSuccess(JSON.parse(xhr.responseText))
            }
            else {

              // se o retorno for não autorizado, redireciona o usuário para o login
              if (xhr.status == 401) {
                app.method.logout();
              }

              return callbackError(xhr.responseText);

            }

          }

        }

        xhr.send(dados);

      }

    } catch (error) {
      return callbackError(error)
    }

  },

  // centraliza as chamadas de PUT
  put: (url, dados, callbackSuccess, callbackError, login = false) => {
    try {
      if (app.method.validaToken(login)) {
        let xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader("Content-Type", "application/json;charset=utf-8");
        xhr.setRequestHeader("Authorization", app.method.obterValorSessao('token'));

        xhr.onreadystatechange = function () {
          if (this.readyState == 4) {
            if (this.status == 200) {
              return callbackSuccess(JSON.parse(xhr.responseText))
            } else {
              // se o retorno for não autorizado, redireciona o usuário para o login
              if (xhr.status == 401) {
                app.method.logout();
              }
              return callbackError(xhr.responseText);
            }
          }
        }
        xhr.send(dados);
      }
    } catch (error) {
      return callbackError(error)
    }
  },

  // centraliza as chamadas de UPLOAD;
  upload: (url, dados, callbackSuccess, callbackError, login = false) => {

    try {

      if (app.method.validaToken(login)) {

        let xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader("Mime-Type", "multipart/form-data");
        xhr.setRequestHeader("Authorization", app.method.obterValorSessao('token'));

        xhr.onreadystatechange = function () {
          if (this.readyState == 4) {

            if (this.status == 200) {
              return callbackSuccess(JSON.parse(xhr.responseText))
            }
            else {

              // se o retorno for não autorizado, redireciona o usuário para o login
              if (xhr.status == 401) {
                app.method.logout();
              }

              return callbackError(xhr.responseText);

            }

          }

        }

        xhr.send(dados);

      }

    } catch (error) {
      return callbackError(error)
    }
  },

  // método para validar se o token existe (local). É chamado em todas as requisições
  validaToken: (login = false) => {

    var tokenAtual = app.method.obterValorSessao('token');

    if (!login) {
      return true;
    }

    if ((tokenAtual == undefined || tokenAtual == null || tokenAtual == "" || tokenAtual == "null") && !login) {
      if (window.location.pathname.includes('garcom.html')) {
        window.location.href = '/painel/login-garcom.html';
      } else if (window.location.pathname.includes('entregador.html')) {
        window.location.href = '/painel/login-entregador.html';
      } else {
        window.location.href = '/painel/login.html';
      }
      return false;
    }

    return true;

  },

  // Descobre a role da aba atual, ou define com base na página
  getRole: () => {
    let role = sessionStorage.getItem('active_role');

    if (!role) {
      const path = window.location.pathname;

      // Se estiver na tela da cozinha e tiver token de cozinha, prefere ele
      if (path.includes('cozinha.html') && localStorage['token_cozinha']) {
        role = 'cozinha';
      } else if (path.includes('garcom.html') && localStorage['token_garcom']) {
        role = 'garcom';
      } else if (path.includes('entregador.html') && localStorage['token_entregador']) {
        role = 'entregador';
      } else if (localStorage['token_admin']) {
        role = 'admin';
      } else if (localStorage['token_cozinha']) {
        role = 'cozinha';
      } else {
        role = 'admin'; // fallback
      }
      sessionStorage.setItem('active_role', role);
    }
    return role;
  },

  // Valida a role do usuário e oculta menus ou redireciona
  validaRole: () => {
    const role = app.method.getRole();
    const path = window.location.pathname;

    // Se não for login, checa o acesso
    if (!path.includes('login.html') && !path.includes('login-garcom.html') && !path.includes('login-entregador.html')) {
      if (role === 'cozinha') {
        // Cozinha só pode acessar cozinha.html
        if (!path.includes('cozinha.html')) {
          window.location.href = '/painel/cozinha.html';
          return;
        }

        // Ocultar itens do menu que não são da cozinha
        const menus = document.querySelectorAll('.menus .menu-item');
        menus.forEach(menu => {
          if (!menu.href.includes('cozinha.html')) {
            menu.style.display = 'none';
          }
        });
      } else if (role === 'garcom') {
        if (!path.includes('garcom.html')) {
          window.location.href = '/painel/garcom.html';
          return;
        }
      } else if (role === 'entregador') {
        if (!path.includes('entregador.html')) {
          window.location.href = '/painel/entregador.html';
          return;
        }
      }
    }
  },

  // grava valores no localstorage
  gravarValorSessao: (valor, local) => {
    if (window.location.pathname.includes('/painel/')) {
      let role = app.method.getRole();
      localStorage[`${local}_${role}`] = valor;
    } else {
      localStorage[local] = valor;
    }
  },

  // obtem um valor do localstorage
  obterValorSessao: (local) => {
    if (window.location.pathname.includes('/painel/')) {
      let role = app.method.getRole();
      return localStorage[`${local}_${role}`];
    } else {
      return localStorage[local];
    }
  },

  // remove uma sessão
  removersecao: (local) => {
    if (window.location.pathname.includes('/painel/')) {
      let role = app.method.getRole();
      localStorage.removeItem(`${local}_${role}`);
    } else {
      localStorage.removeItem(local);
    }
  },

  // limpa toda a sessao (usado pelo app de garcom/entregador)
  limparSessao: () => {
    localStorage.clear();
    sessionStorage.clear();
  },

  // método que limpa a sessão atual e redireciona pro login
  logout: () => {
    let role = sessionStorage.getItem('active_role');
    if (role) {
      const chavesParaRemover = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.endsWith(`_${role}`)) {
          chavesParaRemover.push(key);
        }
      }
      chavesParaRemover.forEach(chave => localStorage.removeItem(chave));
      sessionStorage.removeItem('active_role');

      if (role === 'garcom') {
        window.location.href = '/painel/login-garcom.html';
      } else if (role === 'entregador') {
        window.location.href = '/painel/login-entregador.html';
      } else {
        window.location.href = '/painel/login.html';
      }
    } else {
      window.location.href = '/painel/login.html';
    }
  },

  // método genérico para mensagens
  mensagem: (texto, cor = 'red', tempo = 3500) => {

    let container = document.querySelector('#container-mensagens');

    if (!container) {
      container = document.createElement('div');
      container.id = 'container-mensagens';
      // Tira o container do fluxo normal da página para não desalinhar o flexbox (ex: no login)
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.right = '0';
      container.style.zIndex = '9999';
      document.body.appendChild(container);
    }

    if (container.childElementCount > 2) {
      return;
    }

    let id = Math.floor(Date.now() * Math.random()).toString();

    let msg = `<div id="msg-${id}" class="toast ${cor}">${texto}</div>`;

    container.innerHTML += msg;

    setTimeout(() => {
      let el = document.querySelector(`#msg-${id}`);
      if (el) el.remove();
    }, tempo)

  },

  _loadingCount: 0,

  // método que exibe o loader de carregamento
  loading: (running = false, force = false) => {
    let loader = document.querySelector(".loader-full");
    if (loader) {
      if (running) {
        app.method._loadingCount++;
        loader.classList.remove('hidden');
      } else {
        app.method._loadingCount--;
        if (app.method._loadingCount <= 0 || force) {
          app.method._loadingCount = 0;
          loader.classList.add('hidden');
        }
      }
    }
  },


  // carrega os dados da empresa
  carregarDadosEmpresa: () => {

    app.method.validaRole();

    document.querySelector('.nome-empresa').innerHTML = app.method.obterValorSessao('Nome');
    document.querySelector('.email-empresa').innerHTML = app.method.obterValorSessao('Email');

    // Carrega o tema salvo antes de setar a logo para garantir a cor correta
    app.method.carregarTemaGlobal();
    
    // Carrega o status do botão de som
    app.method.carregarSomGlobal();
  },

  carregarTemaGlobal: () => {
    let tema = app.method.obterValorSessao('theme') || 'light';
    const themeIcon = document.getElementById('theme-icon');
    if (tema === 'dark') {
      document.body.classList.add('dark-mode');
      if (themeIcon) themeIcon.className = 'fas fa-sun'; // Se tá escuro, o botão mostra o sol pra clarear
    } else {
      document.body.classList.remove('dark-mode');
      if (themeIcon) themeIcon.className = 'fas fa-moon';
    }
    app.method.atualizarLogoTema();
  },

  toggleTemaGlobal: () => {
    const isDark = document.body.classList.contains('dark-mode');
    const themeIcon = document.getElementById('theme-icon');

    if (isDark) {
      document.body.classList.remove('dark-mode');
      if (themeIcon) themeIcon.className = 'fas fa-moon';
      app.method.gravarValorSessao('light', 'theme');
    } else {
      document.body.classList.add('dark-mode');
      if (themeIcon) themeIcon.className = 'fas fa-sun';
      app.method.gravarValorSessao('dark', 'theme');
    }

    app.method.atualizarLogoTema();
  },

  carregarSomGlobal: () => {
    let mutado = app.method.obterValorSessao('som-mutado') === 'true';
    const soundIcon = document.getElementById('sound-icon');
    
    if (mutado) {
      if (soundIcon) soundIcon.className = 'fas fa-volume-mute';
    } else {
      if (soundIcon) soundIcon.className = 'fas fa-volume-up';
    }
  },

  toggleSomGlobal: () => {
    let mutado = app.method.obterValorSessao('som-mutado') === 'true';
    const soundIcon = document.getElementById('sound-icon');

    if (mutado) {
      // Estava mutado, vamos desmutar
      app.method.gravarValorSessao('false', 'som-mutado');
      if (soundIcon) soundIcon.className = 'fas fa-volume-up';

      // Aproveita o clique do usuário para forçar um "destravamento" do áudio no navegador
      try {
        let _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (_audioCtx.state === 'suspended') _audioCtx.resume();
        const osc = _audioCtx.createOscillator();
        const gain = _audioCtx.createGain();
        osc.connect(gain);
        gain.connect(_audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1100, _audioCtx.currentTime); 
        gain.gain.setValueAtTime(0, _audioCtx.currentTime);
        gain.gain.linearRampToValueAtTime(0.1, _audioCtx.currentTime + 0.02);
        gain.gain.linearRampToValueAtTime(0, _audioCtx.currentTime + 0.1);
        osc.start();
        osc.stop(_audioCtx.currentTime + 0.15);
      } catch (e) {}

      app.method.mensagem('Som de notificação ATIVADO!', 'green');

    } else {
      // Estava com som, vamos mutar
      app.method.gravarValorSessao('true', 'som-mutado');
      if (soundIcon) soundIcon.className = 'fas fa-volume-mute';
      app.method.mensagem('Som de notificação DESATIVADO!', 'red');
    }
  },

  atualizarLogoTema: () => {
    const logoEl = document.querySelector('.logo-empresa');
    if (!logoEl) return;
    if (document.body.classList.contains('dark-mode')) {
      logoEl.src = '../img/logo-dark.png';
    } else {
      let logotipo = app.method.obterValorSessao('Logo');
      if (logotipo != undefined && logotipo != null && logotipo != 'null' && logotipo != '') {
        logoEl.src = '/public/images/empresa/' + logotipo;
      } else {
        logoEl.src = '/public/images/default.jpg';
      }
    }
  },

  validarEmpresaAberta: (home = false) => {
    app.method.loading(true);

    app.method.get('/empresa/open',
      (response) => {
        app.method.loading(false);

        const statusBox = document.querySelector("#boxStatusLoja");
        const lblLojaAberta = document.querySelector("#lblLojaAberta");
        const lblStatusComplemento = document.querySelector("#lblStatusComplemento");
        const menuBottom = document.querySelector("#menu-bottom");
        const menuBottomClosed = document.querySelector("#menu-bottom-closed");

        if (home && statusBox) {
          statusBox.classList.remove('hidden', 'closed', 'warning');
        }

        const aberta = response?.status === "success";
        const data = response?.data || {};

        if (home && statusBox) {
          if (aberta) {
            const fechaAs = data.fechaAs ? ` até ${data.fechaAs}` : '';
            lblLojaAberta.innerText = data.mensagem || `Aberto${fechaAs}`;
            lblStatusComplemento.innerText = data.complemento || 'Faça seu pedido agora';
            statusBox.classList.remove('closed');
          } else {
            lblLojaAberta.innerText = data.mensagem || 'Fechado';
            lblStatusComplemento.innerText = data.complemento || 'No momento não estamos aceitando pedidos';
            statusBox.classList.add('closed');
          }
        }

        if (menuBottom) {
          menuBottom.classList.toggle('hidden', !aberta);
        }

        if (menuBottomClosed) {
          menuBottomClosed.classList.toggle('hidden', aberta);
        }

        const lblMenuFechadoInfo = document.querySelector("#lblMenuFechadoInfo");

        if (!aberta && lblMenuFechadoInfo) {
          lblMenuFechadoInfo.innerText = data.complemento || 'Voltaremos em breve';
        }
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error);
      },
      false
    );
  },

  criarGuid: () => {
    return "00000000-0000-0000-0000-000000000000".replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  },

  mascaraTelefone: (telefone) => {
    telefone = telefone.replace(/\D/g, ""); // Remove tudo o que não é dígito
    telefone = telefone.replace(/^(\d{2})(\d)/g, "($1) $2"); // Coloca parênteses em volta dos dois primeiros dígitos
    telefone = telefone.replace(/(\d)(\d{4})$/, "$1-$2"); // Coloca hífen entre o quarto e o quinto dígitos
    return telefone;
  }

}