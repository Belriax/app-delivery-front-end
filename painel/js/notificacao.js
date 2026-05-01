(function () {

  // ── Configurações ─────────────────────────────────────────────────────────
  const CONFIG = {
    pollMs          : 10000,   // intervalo de verificação de novos pedidos (10 s)
    minAlertGapMs   : 4000,    // anti-spam entre alertas vindos de abas diferentes (4 s)
    soundRepeatMs   : 2000,   // intervalo para repetir o som enquanto alerta estiver ativo (2 s)
    channelName     : 'delivery_pedidos_channel',
    storageLastId   : 'delivery_last_pedido_id',
    storageAlertAt  : 'delivery_last_alert_at',
    soundUrl        : '', // deixe '' para usar o beep embutido
    autoStart       : true,
    logoPath        : '/img/logo.png',
    // Páginas consideradas "tela de pedidos" — ao entrar nelas, o alerta é dispensado
    pedidosPathMatch: ['pedidos.html'],
  };

  // ── Estado interno ────────────────────────────────────────────────────────
  let _audio         = null;
  let _audioCtx      = null;
  let _initialized   = false;
  let _pollingTimer  = null;
  let _tituloTimer   = null;
  let _soundTimer    = null;
  let _alertaAtivo   = false;   // true enquanto houver alerta não dispensado
  let _toastEl       = null;    // referência ao toast atual (único na tela)

  const _tituloOriginal = document.title;

  // BroadcastChannel — coordena múltiplas abas abertas
  const bc = ('BroadcastChannel' in window)
    ? new BroadcastChannel(CONFIG.channelName)
    : null;

  // ── Verifica se estamos na página de pedidos ──────────────────────────────
  // function estaNaPaginaDePedidos() {
  //   return CONFIG.pedidosPathMatch.some(p => window.location.pathname.includes(p));
  // }

  // ── Helpers de localStorage ───────────────────────────────────────────────
  function getLastId() {
    return parseInt(localStorage.getItem(CONFIG.storageLastId) || '0', 10);
  }

  function setLastId(id) {
    localStorage.setItem(CONFIG.storageLastId, String(id));
  }

  function canAlertNow() {
    const last = parseInt(localStorage.getItem(CONFIG.storageAlertAt) || '0', 10);
    if ((Date.now() - last) < CONFIG.minAlertGapMs) return false;
    localStorage.setItem(CONFIG.storageAlertAt, String(Date.now()));
    return true;
  }

  // ── Dispensar alerta (chamado ao clicar ou navegar para pedidos) ──────────
  function dispensarAlerta() {
    if (!_alertaAtivo) return;
    _alertaAtivo = false;

    // Para título piscando
    clearInterval(_tituloTimer);
    document.title = _tituloOriginal;

    // Para som repetindo
    clearInterval(_soundTimer);

    // Fecha o toast se ainda estiver aberto
    if (_toastEl) {
      fecharToast(_toastEl);
      _toastEl = null;
    }
  }

  // ── Estilos do Toast ──────────────────────────────────────────────────────
  function injetarEstilos() {
    if (document.getElementById('notif-css')) return;
    const s = document.createElement('style');
    s.id = 'notif-css';
    s.textContent = `
      #notif-container {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 99999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      }
      .notif-toast {
        pointer-events: all;
        background: #1c1c2e;
        border-left: 4px solid #f5a623;
        color: #fff;
        padding: 13px 16px;
        border-radius: 10px;
        min-width: 290px;
        max-width: 350px;
        box-shadow: 0 6px 28px rgba(0,0,0,.45);
        animation: notif-in .3s ease;
        display: flex;
        flex-direction: column;
        gap: 6px;
        cursor: pointer;
      }
      .notif-toast.saindo {
        animation: notif-out .3s ease forwards;
      }
      .notif-toast-topo {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .notif-toast-titulo {
        font-weight: 700;
        font-size: 13px;
        color: #f5a623;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .notif-toast-titulo .notif-pulse {
        width: 8px;
        height: 8px;
        background: #f5a623;
        border-radius: 50%;
        display: inline-block;
        animation: notif-pulse 1.2s infinite;
        flex-shrink: 0;
      }
      .notif-toast-fechar {
        background: none;
        border: none;
        color: #888;
        font-size: 16px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        margin-left: 8px;
      }
      .notif-toast-fechar:hover { color: #fff; }
      .notif-toast-corpo {
        font-size: 12px;
        color: #ddd;
        line-height: 1.6;
      }
      .notif-toast-rodape {
        font-size: 11px;
        color: #f5a623;
        font-weight: 600;
        padding-top: 4px;
        border-top: 1px solid rgba(245,166,35,.2);
      }
      .notif-toast-dispensar {
        background: none;
        border: 1px solid rgba(255,255,255,.15);
        color: #aaa;
        font-size: 11px;
        border-radius: 6px;
        padding: 3px 8px;
        cursor: pointer;
        margin-top: 2px;
        align-self: flex-start;
        transition: all .2s;
      }
      .notif-toast-dispensar:hover {
        background: rgba(255,255,255,.08);
        color: #fff;
      }
      @keyframes notif-in {
        from { opacity: 0; transform: translateX(60px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes notif-out {
        from { opacity: 1; transform: translateX(0); }
        to   { opacity: 0; transform: translateX(60px); }
      }
      @keyframes notif-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%       { opacity: .4; transform: scale(1.4); }
      }
    `;
    document.head.appendChild(s);
  }

  function getContainer() {
    let c = document.getElementById('notif-container');
    if (!c) {
      injetarEstilos();
      c = document.createElement('div');
      c.id = 'notif-container';
      document.body.appendChild(c);
    }
    return c;
  }

  function fecharToast(el) {
    if (!el || !el.parentNode) return;
    el.classList.add('saindo');
    setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 320);
  }

  function showToast(pedidos) {
    const container = getContainer();

    // Remove toast anterior se existir (atualiza com os novos dados)
    if (_toastEl) {
      fecharToast(_toastEl);
      _toastEl = null;
    }

    const qtd = pedidos.length;

    const linhas = pedidos.slice(0, 4).map(p => {
      const tipo  = parseInt(p.idtipoentrega) === 1 ? '🛵 Delivery' : '📦 Retirada';
      const total = parseFloat(p.total || 0).toFixed(2).replace('.', ',');
      return `<div>• <b>#${p.idpedido}</b> — ${p.nomecliente} | ${tipo} | R$ ${total}</div>`;
    }).join('');

    const extra = qtd > 4
      ? `<div style="color:#aaa;margin-top:2px">+ ${qtd - 4} pedido(s) a mais...</div>`
      : '';

    const href = window.location.pathname.includes('/painel/')
      ? './pedidos.html'
      : './painel/pedidos.html';

    const toast = document.createElement('div');
    toast.className = 'notif-toast';
    toast.innerHTML = `
      <div class="notif-toast-topo">
        <span class="notif-toast-titulo">
          <span class="notif-pulse"></span>
          ${qtd} novo${qtd > 1 ? 's pedidos' : ' pedido'} pendente${qtd > 1 ? 's' : ''}!
        </span>
        <button class="notif-toast-fechar" title="Fechar">✕</button>
      </div>
      <div class="notif-toast-corpo">${linhas}${extra}</div>
      <div class="notif-toast-rodape">👆 Clique para abrir os pedidos</div>
      <button class="notif-toast-dispensar">Dispensar notificação</button>
    `;

    // Clicar no corpo abre pedidos e dispensa
    toast.addEventListener('click', (e) => {
      const btn = e.target;

      if (btn.classList.contains('notif-toast-fechar') || btn.classList.contains('notif-toast-dispensar')) {
        dispensarAlerta();
        return;
      }

      // Clique em qualquer outra área redireciona
      dispensarAlerta();
      window.location.href = href;
    });

    container.appendChild(toast);
    _toastEl = toast;
    // SEM setTimeout — o toast fica até ser dispensado manualmente
  }

  // ── Mensagem no #container-mensagens ─────────────────────────────────────
  function showTopMessage(maxId, pendentes) {
    const container = document.getElementById('container-mensagens');
    if (!container) return;

    // Remove mensagem anterior de pedido para não acumular
    const anterior = container.querySelector('.notif-top-msg');
    if (anterior) anterior.remove();

    const href = window.location.pathname.includes('/painel/')
      ? './pedidos.html'
      : './painel/pedidos.html';

    const el = document.createElement('div');
    el.className = 'alert alert-success shadow-sm notif-top-msg';
    el.style.cursor = 'pointer';
    el.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>🔔 <b>Novo pedido #${maxId}!</b> &nbsp;|&nbsp; Pendentes: <b>${pendentes}</b></div>
        <small>Clique para abrir →</small>
      </div>
    `;

    el.onclick = () => {
      dispensarAlerta();
      window.location.href = href;
    };

    container.prepend(el);
    // Também sem auto-remove — some ao dispensar ou ao navegar
  }

  // ── Remove a mensagem do topo ─────────────────────────────────────────────
  function removerTopMessage() {
    const el = document.querySelector('.notif-top-msg');
    if (el) el.remove();
  }

  // ── Som ───────────────────────────────────────────────────────────────────
  function playSound() {
    if (CONFIG.soundUrl) {
      try {
        if (!_audio) _audio = new Audio(CONFIG.soundUrl);
        _audio.currentTime = 0;
        _audio.play().catch(_playBeep);
        return;
      } catch (e) {}
    }
    _playBeep();
  }

  function _playBeep() {
    try {
      if (!_audioCtx) {
        _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = _audioCtx;
      [[880, 0], [1100, 0.2], [880, 0.4]].forEach(([freq, delay]) => {
        const osc  = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0,    ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + delay + 0.02);
        gain.gain.linearRampToValueAtTime(0,    ctx.currentTime + delay + 0.14);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime  + delay + 0.15);
      });
    } catch (e) {}
  }

  // Inicia o som e o faz repetir enquanto o alerta estiver ativo
  function iniciarSomRepetido() {
    clearInterval(_soundTimer);
    playSound();
    _soundTimer = setInterval(() => {
      if (_alertaAtivo) {
        playSound();
      } else {
        clearInterval(_soundTimer);
      }
    }, CONFIG.soundRepeatMs);
  }

  // ── Título da aba piscando ────────────────────────────────────────────────
  function iniciarPiscarTitulo(qtd) {
    clearInterval(_tituloTimer);
    let toggle = true;
    _tituloTimer = setInterval(() => {
      if (!_alertaAtivo) {
        clearInterval(_tituloTimer);
        document.title = _tituloOriginal;
        return;
      }
      document.title = toggle
        ? `🔔 (${qtd}) Novo${qtd > 1 ? 's pedidos' : ' pedido'}!`
        : _tituloOriginal;
      toggle = !toggle;
    }, 900);
  }

  // ── Notificação nativa do navegador ───────────────────────────────────────
  function solicitarPermissao() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    window.addEventListener('click', function handler() {
      Notification.requestPermission();
      window.removeEventListener('click', handler);
    }, { once: true });
  }

  function notifyBrowser(maxId, pendentes) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification('🍕 Pizza Food — Novo Pedido!', {
        body    : `Pedido #${maxId} | Pendentes: ${pendentes}`,
        icon    : CONFIG.logoPath,
        tag     : 'pedido-novo',
        renotify: true,
      });
      n.onclick = () => {
        dispensarAlerta();
        window.focus();
        window.location.href = './pedidos.html';
      };
      // Notificação nativa também não fecha sozinha (reuse via tag)
    } catch (e) {}
  }

  // ── BroadcastChannel ─────────────────────────────────────────────────────
  function broadcast(type, payload) {
    if (!bc) return;
    bc.postMessage({ type, ...payload, ts: Date.now() });
  }

  if (bc) {
    bc.onmessage = (ev) => {
      const msg = ev.data;
      if (!msg) return;

      if (msg.type === 'NEW_ORDER') {
        // Outra aba já disparou os alertas — apenas atualiza id e mostra aviso leve
        if (msg.maxId > getLastId()) setLastId(msg.maxId);
        if (!estaNaPaginaDePedidos()) {
          showTopMessage(msg.maxId, msg.pendentes);
        }
      }

      if (msg.type === 'DISPENSAR') {
        // Usuário dispensou em outra aba — dispensa aqui também
        dispensarAlerta();
        removerTopMessage();
      }
    };
  }

  // ── Polling principal ─────────────────────────────────────────────────────
  function checkNewOrders() {
    if (!window.app || !app.method || !app.method.get) return;

    // // Se já estamos na página de pedidos, dispensa silenciosamente
    // if (estaNaPaginaDePedidos() && _alertaAtivo) {
    //   dispensarAlerta();
    //   removerTopMessage();
    // }

    app.method.get('/pedido/painel/1',
      (response) => {
        if (!response || response.status === 'error') return;

        const lista = Array.isArray(response.data) ? response.data : [];
        if (lista.length === 0) return;

        let maxId = 0;
        lista.forEach(p => {
          const id = parseInt(p.idpedido, 10);
          if (!isNaN(id) && id > maxId) maxId = id;
        });
        if (maxId <= 0) return;

        const lastId = getLastId();

        // Primeira execução: apenas registra o estado atual sem notificar
        if (lastId === 0) {
          setLastId(maxId);
          return;
        }

        if (maxId > lastId) {
          if (!canAlertNow()) {
            setLastId(maxId);
            return;
          }

          setLastId(maxId);

          // Não notifica se já está na página de pedidos
          // if (estaNaPaginaDePedidos()) return;

          const pendentes = response.totais?.pendente ?? lista.length;
          const novos     = lista.filter(p => parseInt(p.idpedido, 10) > lastId);

          _alertaAtivo = true;

          showToast(novos);
          showTopMessage(maxId, pendentes);
          iniciarSomRepetido();
          notifyBrowser(maxId, pendentes);
          iniciarPiscarTitulo(novos.length);
          broadcast('NEW_ORDER', { maxId, pendentes });
        }
      },
      (_err) => { /* silencioso */ }
    );
  }

  // ── API pública ───────────────────────────────────────────────────────────
  window.deliveryNotifier = {

    start() {
      if (_initialized) return;
      _initialized = true;
      solicitarPermissao();
      checkNewOrders();
      _pollingTimer = setInterval(checkNewOrders, CONFIG.pollMs);
      console.info('[deliveryNotifier] iniciado — polling a cada', CONFIG.pollMs / 1000, 's');
    },

    stop() {
      clearInterval(_pollingTimer);
      clearInterval(_soundTimer);
      clearInterval(_tituloTimer);
      document.title = _tituloOriginal;
      _initialized = false;
      _alertaAtivo  = false;
      console.info('[deliveryNotifier] parado.');
    },

    reset() {
      localStorage.removeItem(CONFIG.storageLastId);
      localStorage.removeItem(CONFIG.storageAlertAt);
    },

    dispensar() {
      dispensarAlerta();
      removerTopMessage();
      broadcast('DISPENSAR', {});
    },
  };

  // ── Auto-start ────────────────────────────────────────────────────────────
  if (CONFIG.autoStart) {
    function tryStart() {
      if (window.app && app.method && app.method.get) {
        deliveryNotifier.start();
      } else {
        setTimeout(tryStart, 500);
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => setTimeout(tryStart, 800));
    } else {
      setTimeout(tryStart, 800);
    }
  }

})();