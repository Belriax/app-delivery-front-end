var cozinha = {};

cozinha.state = {
  pedidosAceitos: [],
  pedidosPreparo: [],
  pedidosProntos: [],
  knownPedidosIds: [] // Para tocar som ao chegar pedido novo
};

cozinha.event = {
  init: () => {
    app.method.validaToken();
    app.method.carregarDadosEmpresa();

    cozinha.method.buscarPedidos(true);

    // Atualiza a cada 10 segundos
    setInterval(() => {
      cozinha.method.buscarPedidos(false);
    }, 10000);
  }
};

cozinha.method = {
  buscarPedidos: (isFirstLoad) => {
    app.method.get('/pedido/painel/cozinha',
      (response) => {
        if (response.status === "error") {
          console.log(response.message);
          return;
        }

        cozinha.method.processarPedidos(response.data, isFirstLoad);
      },
      (error) => {
        console.log('error', error);
      }
    );
  },

  processarPedidos: (lista, isFirstLoad) => {
    let aceitos = [];
    let preparo = [];
    let prontos = [];
    let novosTickets = [];

    lista.forEach(item => {
      let p = item.pedido;
      p.itens = item.itens;

      if (p.idpedidostatus == 2) {
        aceitos.push(p);

        // Verifica se é novo para notificar
        if (!isFirstLoad && !cozinha.state.knownPedidosIds.includes(p.idpedido)) {
          novosTickets.push(p);
        }

        if (!cozinha.state.knownPedidosIds.includes(p.idpedido)) {
          cozinha.state.knownPedidosIds.push(p.idpedido);
        }
      } else if (p.idpedidostatus == 3) {
        preparo.push(p);

        if (!cozinha.state.knownPedidosIds.includes(p.idpedido)) {
          cozinha.state.knownPedidosIds.push(p.idpedido);
        }
      } else if (p.idpedidostatus == 4 || p.idpedidostatus == 5) {
        prontos.push(p);
      }
    });

    if (novosTickets.length > 0) {
      cozinha.method.tocarSomNovoPedido();
      cozinha.method.notificacaoVisual(novosTickets);
    }

    cozinha.state.pedidosAceitos = aceitos;
    cozinha.state.pedidosPreparo = preparo;
    // Ordena os prontos do mais recente para o mais antigo
    cozinha.state.pedidosProntos = prontos.sort((a, b) => parseInt(b.idpedido) - parseInt(a.idpedido));

    cozinha.method.renderizarColunas();
  },

  _audioCtx: null,

  tocarSomNovoPedido: () => {
    // Se o usuário desativou o som globalmente, não toca
    if (app.method.obterValorSessao('som-mutado') === 'true') return;

    try {
      if (!cozinha.method._audioCtx) {
        cozinha.method._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = cozinha.method._audioCtx;
      if (ctx.state === 'suspended') ctx.resume();
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
    } catch (e) {
      console.log('Erro ao tocar áudio', e);
    }
  },

  _tituloTimer: null,
  _tituloOriginal: document.title,

  notificacaoVisual: (novos) => {
    let qtd = novos.length;
    let texto = qtd > 1 ? `${qtd} novos pedidos pendentes!` : `Novo pedido pendente!`;
    
    let linhas = novos.slice(0, 4).map(p => {
      let total = parseFloat(p.total || 0).toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2});
      // Inclui tipo do pedido no toast (Bug #10)
      let tipo = p.nometipoentrega || (p.idtipoentrega == 1 ? 'Delivery' : p.idtipoentrega == 2 ? 'Balcão' : p.numero_mesa ? 'Mesa ' + p.numero_mesa : 'PDV');
      return `<div>• <b>#${p.idpedido}</b> — [${tipo}] ${p.nomecliente} | R$ ${total}</div>`;
    }).join('');

    let extra = qtd > 4 ? `<div style="color:#aaa;margin-top:2px">+ ${qtd - 4} pedido(s)...</div>` : '';

    let toastHtml = `
      <div id="cozinha-toast" style="pointer-events: all; background: #1c1c2e; border-left: 4px solid #f5a623; color: #fff; padding: 13px 16px; border-radius: 10px; min-width: 290px; max-width: 350px; box-shadow: 0 6px 28px rgba(0,0,0,.45); display: flex; flex-direction: column; gap: 6px; position: fixed; bottom: 20px; right: 20px; z-index: 99999; animation: fadeIn 0.3s ease;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <span style="font-weight: 700; font-size: 13px; color: #f5a623; display: flex; align-items: center; gap: 6px;">
            <span style="width: 8px; height: 8px; background: #f5a623; border-radius: 50%; display: inline-block;"></span>
            ${texto}
          </span>
          <button onclick="document.getElementById('cozinha-toast').remove()" style="background: none; border: none; color: #888; font-size: 16px; cursor: pointer; padding: 0; line-height: 1;">✕</button>
        </div>
        <div style="font-size: 12px; color: #ddd; line-height: 1.6;">${linhas}${extra}</div>
      </div>
    `;

    // Remove anterior se existir
    let prev = document.getElementById('cozinha-toast');
    if (prev) prev.remove();
    
    document.body.insertAdjacentHTML('beforeend', toastHtml);

    // Some após 15 segundos
    setTimeout(() => {
      let t = document.getElementById('cozinha-toast');
      if (t) t.remove();
    }, 15000);

    // 2. Piscar o título da aba
    clearInterval(cozinha.method._tituloTimer);
    let toggle = true;
    cozinha.method._tituloTimer = setInterval(() => {
      document.title = toggle ? `🔔 ${texto}` : cozinha.method._tituloOriginal;
      toggle = !toggle;
    }, 1000);
    
    // Parar de piscar após 15 segundos
    setTimeout(() => {
        clearInterval(cozinha.method._tituloTimer);
        document.title = cozinha.method._tituloOriginal;
    }, 15000);

    // 3. Notificação Nativa do Sistema Operacional (Desktop/Mobile)
    if (window.Notification && Notification.permission === "granted") {
      let nativeText = novos.map(p => `#${p.idpedido} - ${p.nomecliente}`).join(", ");
      let n = new Notification(texto, {
        body: nativeText,
        icon: '../img/logo.png', // Fallback icon
        silent: true // O áudio já é tocado pelo sistema web
      });
      setTimeout(() => n.close(), 10000);
    }
  },


  renderizarColunas: () => {
    document.getElementById('count-aceitos').innerText = cozinha.state.pedidosAceitos.length;
    document.getElementById('count-preparo').innerText = cozinha.state.pedidosPreparo.length;
    document.getElementById('count-prontos').innerText = cozinha.state.pedidosProntos.length;

    let htmlAceitos = '';
    cozinha.state.pedidosAceitos.forEach(p => {
      htmlAceitos += cozinha.method.montarTicket(p, 'preparo');
    });
    document.getElementById('lista-aceitos').innerHTML = htmlAceitos || '<p class="text-center mt-3 text-muted">Nenhum pedido aceito no momento.</p>';

    let htmlPreparo = '';
    cozinha.state.pedidosPreparo.forEach(p => {
      htmlPreparo += cozinha.method.montarTicket(p, 'pronto');
    });
    document.getElementById('lista-preparo').innerHTML = htmlPreparo || '<p class="text-center mt-3 text-muted">Nenhum pedido em preparo.</p>';

    let htmlProntos = '';
    cozinha.state.pedidosProntos.forEach(p => {
      htmlProntos += cozinha.method.montarTicket(p, 'finalizado');
    });
    document.getElementById('lista-prontos').innerHTML = htmlProntos || '<p class="text-center mt-3 text-muted">Nenhum pedido finalizado hoje.</p>';
  },

  montarTicket: (p, acao) => {
    let datacadastro = p.datacadastro.split('T');
    let horarioFormatado = datacadastro[1].split(':')[0] + ':' + datacadastro[1].split(':')[1];

    // Badge colorido do tipo de pedido (Bug #1 — principal objetivo)
    let tipoBadge = '';
    if (p.idtipoentrega == 1 || p.nometipoentrega === 'Delivery') {
      tipoBadge = `<span class="badge" style="background:#e53935;color:#fff;font-size:11px;border-radius:4px;padding:2px 7px;"><i class="fas fa-motorcycle"></i> DELIVERY</span>`;
    } else if (p.idtipoentrega == 3 || p.numero_mesa) {
      let numMesa = p.numero_mesa ? ' Nº ' + p.numero_mesa : '';
      tipoBadge = `<span class="badge" style="background:#2e7d32;color:#fff;font-size:11px;border-radius:4px;padding:2px 7px;"><i class="fas fa-chair"></i> MESA${numMesa}</span>`;
    } else {
      tipoBadge = `<span class="badge" style="background:#1565c0;color:#fff;font-size:11px;border-radius:4px;padding:2px 7px;"><i class="fas fa-store"></i> BALCÃO</span>`;
    }

    let itensHtml = '';

    // Agrupa itens e seus opcionais por idpedidoitem
    const grupoItens = p.itens.reduce(function (results, item) {
      (results[item.idpedidoitem] = results[item.idpedidoitem] || []).push(item);
      return results;
    }, {});

    for (const key in grupoItens) {
      const grupo = grupoItens[key];
      const qty  = grupo[0].quantidade;
      const name = grupo[0].nome;
      const obs  = grupo[0].observacao;

      let opcionaisHtml = '';
      grupo.forEach(e => {
        if (e.idopcionalitem != null) {
          opcionaisHtml += `<span class="item-opcional">+ ${e.nomeopcional}</span>`;
        }
      });

      itensHtml += `
        <li>
          <span class="item-qty">${qty}x</span> 
          <span class="item-name"><b>${name}</b></span>
          ${opcionaisHtml}
          ${obs ? `<span class="item-obs">Obs: ${obs}</span>` : ''}
        </li>
      `;
    }

    let btnHtml = '';
    if (acao === 'preparo') {
      btnHtml = `<button class="btn btn-warning btn-sm w-100" onclick="cozinha.method.mudarStatus('${p.idpedido}', 3)"><i class="fas fa-clock"></i> Começar Preparo</button>`;
    } else if (acao === 'pronto') {
      btnHtml = `<button class="btn btn-success btn-sm w-100" onclick="cozinha.method.mudarStatus('${p.idpedido}', 4)"><i class="fas fa-check"></i> Pronto / Finalizar</button>`;
    } else if (acao === 'finalizado') {
      if (p.idpedidostatus == 4) {
        btnHtml = `<button class="btn btn-outline-secondary btn-sm w-100" onclick="cozinha.method.mudarStatus('${p.idpedido}', 3)"><i class="fas fa-undo"></i> Desfazer (Voltar)</button>`;
      } else {
        btnHtml = `<span class="badge bg-secondary w-100 py-2"><i class="fas fa-check-double"></i> Totalmente Concluído</span>`;
      }
    }

    return `
      <div class="card-ticket" id="ticket-${p.idpedido}" draggable="true" ondragstart="cozinha.method.drag(event, '${p.idpedido}')">
        <div class="ticket-header">
          <span class="order-number">#${p.idpedido}</span>
          <span class="time"><i class="fas fa-clock"></i> ${horarioFormatado}</span>
        </div>
        <div class="ticket-body">
          <div class="mb-2">${tipoBadge}</div>
          <p class="mb-2"><i class="fas fa-user text-muted"></i> ${p.nomecliente || 'Cliente'}</p>
          <ul class="item-list">
            ${itensHtml}
          </ul>
        </div>
        <div class="ticket-footer">
          ${btnHtml}
        </div>
      </div>
    `;
  },

  mudarStatus: (idpedido, novoStatus) => {
    var dados = {
      tab: novoStatus,
      idpedido: idpedido
    };

    app.method.loading(true);
    app.method.post('/pedido/mover', JSON.stringify(dados),
      (response) => {
        app.method.loading(false);
        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        // Toca animação e atualiza
        document.getElementById('ticket-' + idpedido).style.opacity = '0.5';
        setTimeout(() => {
          cozinha.method.buscarPedidos(false);
        }, 500);
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error);
      }
    );
  },

  drag: (event, idpedido) => {
    event.dataTransfer.setData("idpedido", idpedido);
  },

  allowDrop: (event) => {
    event.preventDefault();
  },

  drop: (event, novoStatus) => {
    event.preventDefault();
    var idpedido = event.dataTransfer.getData("idpedido");
    if (idpedido) {
      cozinha.method.mudarStatus(idpedido, novoStatus);
    }
  }
};

// Tenta pedir permissão automaticamente assim que o DOM carregar
document.addEventListener("DOMContentLoaded", function () {
  cozinha.event.init();
  if (window.Notification && Notification.permission !== "granted") {
    Notification.requestPermission();
  }
});

// Hack silencioso de retaguarda: caso o navegador bloqueie o bip inicial, o primeiro clique em qualquer lugar da tela destrava
window.addEventListener('click', function audioUnlock() {
  try {
    if (!cozinha.method._audioCtx) {
      cozinha.method._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (cozinha.method._audioCtx.state === 'suspended') {
      cozinha.method._audioCtx.resume();
    }
    const osc = cozinha.method._audioCtx.createOscillator();
    const gain = cozinha.method._audioCtx.createGain();
    osc.connect(gain);
    gain.connect(cozinha.method._audioCtx.destination);
    gain.gain.value = 0;
    osc.start();
    osc.stop(cozinha.method._audioCtx.currentTime + 0.01);
  } catch (e) {}
  window.removeEventListener('click', audioUnlock);
}, { once: true });
