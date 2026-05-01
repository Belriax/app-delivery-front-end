document.addEventListener("DOMContentLoaded", function (event) {
  app.event.init();
  sobre.event.init();
});

var sobre = {}

var DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

sobre.event = {
  init: () => {
    sobre.method.obterDadosEmpresa();
    sobre.method.obterHorariosFuncionamento();
    sobre.method.obterFormasPagamento();
    sobre.method.obterTiposEntrega();
  }
}

sobre.method = {

  obterDadosEmpresa: () => {
    app.method.get('/empresa/sobre',
      (response) => {
        console.log(response);

        if (response.status === 'error') {
          app.method.mensagem(response.message)
          return;
        }

        let empresa = response.data[0];

        document.querySelector("#lblNomeEmpresa").innerText = empresa.nome;

        if (empresa.sobre != null) {
          document.querySelector("#lblSobreEmpresa").innerHTML = empresa.sobre.replace(/\\n/g, '<br>');
        } else {
          let infosSub = document.querySelector(".infos-sub");
          if (infosSub) infosSub.remove();
        }

        if (empresa.logotipo != null) {
          document.querySelector("#imgLogoEmpresa").style.backgroundImage = `url('/public/images/empresa/${empresa.logotipo}')`;
          document.querySelector("#imgLogoEmpresa").style.backgroundSize = '70%';
        } else {
          let imgLogo = document.querySelector("#imgLogoEmpresa");
          if (imgLogo) imgLogo.remove();
        }

        if (empresa.endereco != null) {
          let comp = empresa.complemento != null ? ` (${empresa.complemento})` : '';
          let enderecoCompleto = `${empresa.endereco}, ${empresa.numero}${comp} - ${empresa.bairro}, ${empresa.cidade}-${empresa.estado}`;
          document.querySelector("#lblEnderecoEmpresa").innerText = enderecoCompleto;

          if (empresa.latitude != null && empresa.longitude != null) {
            sobre.method.inicializarMapa(
              parseFloat(empresa.latitude),
              parseFloat(empresa.longitude),
              empresa.nome,
              enderecoCompleto
            );
          }
        }
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error)
      }
    )
  },

  inicializarMapa: (latitude, longitude, nomeEmpresa, endereco) => {
    if (typeof L === 'undefined') {
      console.error('Leaflet não está carregado!');
      return;
    }

    document.querySelector("#mapContainer").classList.remove("hidden");

    setTimeout(() => {
      const map = L.map('map', {
        dragging: false,
        touchZoom: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false
      }).setView([latitude, longitude], 16);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      const customIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);

      marker.bindPopup(`
        <div style="text-align: center; padding: 5px; font-size: 13px;">
          <strong>${nomeEmpresa}</strong><br>
          <small>${endereco}</small><br>
          <a href="https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}" 
             target="_blank"
             style="color: #007bff; text-decoration: none; font-size: 12px;">
             📍 Como chegar
          </a>
        </div>
      `).openPopup();

      setTimeout(() => {
        map.invalidateSize();
      }, 100);

    }, 100);
  },

  obterHorariosFuncionamento: () => {
    app.method.loading(true);

    app.method.get('/empresa/horario',
      (response) => {
        console.log(response);
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        sobre.method.carregarHorarios(response.data);
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error);
      }
    );
  },

  carregarHorarios: (list) => {
    let container = document.querySelector("#horarioFuncionamento");
    let listaHorarios = document.querySelector("#horariosLista");
    let statusBadge = document.querySelector("#statusLojaBadge");

    if (!container || !listaHorarios || !statusBadge) return;

    if (!list || list.length === 0) {
      container.remove();
      return;
    }

    const horariosPorDia = sobre.method.normalizarHorariosPorDia(list);
    const hoje = new Date().getDay();
    const abertoAgora = sobre.method.verificarLojaAberta(horariosPorDia);

    container.classList.remove('hidden');
    listaHorarios.innerHTML = '';

    statusBadge.classList.remove('hidden', 'open', 'closed');
    statusBadge.classList.add(abertoAgora ? 'open' : 'closed');
    statusBadge.innerText = abertoAgora ? 'Aberto agora' : 'Fechado';

    DIAS_SEMANA.forEach((diaNome, diaIndex) => {
      const horarioDia = horariosPorDia[diaIndex];

      let textoHorario = 'Fechado';

      if (horarioDia) {
        textoHorario = `${horarioDia.iniciohorarioum} às ${horarioDia.fimhorarioum}`;

        if (
          horarioDia.iniciohorariodois != null && horarioDia.iniciohorariodois !== '' &&
          horarioDia.fimhorariodois != null && horarioDia.fimhorariodois !== ''
        ) {
          textoHorario += ` • ${horarioDia.iniciohorariodois} às ${horarioDia.fimhorariodois}`;
        }
      }

      let temp = sobre.templates.horarioModerno
        .replace(/\${dia}/g, diaNome)
        .replace(/\${horario}/g, textoHorario)
        .replace(/\${todayClass}/g, diaIndex === hoje ? 'today' : '')
        .replace(/\${todayTag}/g, diaIndex === hoje ? '<span class="schedule-day-tag">Hoje</span>' : '');

      listaHorarios.innerHTML += temp;
    });
  },

  normalizarHorariosPorDia: (list) => {
    const horariosPorDia = {
      0: null,
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
      6: null
    };

    list.forEach((item) => {
      const diaInicio = Number(item.diainicio);
      const diaFim = Number(item.diafim);

      // intervalo normal: ex. 3 a 6
      if (diaInicio <= diaFim) {
        for (let dia = diaInicio; dia <= diaFim; dia++) {
          horariosPorDia[dia] = item;
        }
      }
      // intervalo virando a semana: ex. 5 a 1
      else {
        for (let dia = diaInicio; dia <= 6; dia++) {
          horariosPorDia[dia] = item;
        }
        for (let dia = 0; dia <= diaFim; dia++) {
          horariosPorDia[dia] = item;
        }
      }
    });

    return horariosPorDia;
  },

  verificarLojaAberta: (horariosPorDia) => {
    const agora = new Date();
    const diaAtual = agora.getDay();
    const horaAtual = agora.getHours() * 60 + agora.getMinutes();

    const horarioHoje = horariosPorDia[diaAtual];

    if (!horarioHoje) return false;

    if (horarioHoje.iniciohorarioum && horarioHoje.fimhorarioum) {
      const inicio1 = sobre.method.horaParaMinutos(horarioHoje.iniciohorarioum);
      const fim1 = sobre.method.horaParaMinutos(horarioHoje.fimhorarioum);

      if (sobre.method.estaDentroDoIntervalo(horaAtual, inicio1, fim1)) {
        return true;
      }
    }

    if (horarioHoje.iniciohorariodois && horarioHoje.fimhorariodois) {
      const inicio2 = sobre.method.horaParaMinutos(horarioHoje.iniciohorariodois);
      const fim2 = sobre.method.horaParaMinutos(horarioHoje.fimhorariodois);

      if (sobre.method.estaDentroDoIntervalo(horaAtual, inicio2, fim2)) {
        return true;
      }
    }

    return false;
  },

  estaDentroDoIntervalo: (horaAtual, inicio, fim) => {
    // horário normal
    if (inicio <= fim) {
      return horaAtual >= inicio && horaAtual <= fim;
    }

    // horário atravessando meia-noite, ex: 18:00 às 01:00
    return horaAtual >= inicio || horaAtual <= fim;
  },

  horaParaMinutos: (hora) => {
    if (!hora) return 0;

    let partes = hora.split(':');
    return (parseInt(partes[0]) * 60) + parseInt(partes[1]);
  },
  obterFormasPagamento: () => {
    app.method.get('/formapagamento',
      (response) => {
        console.log(response);
        app.method.loading(false);

        if (response.status === 'error') {
          app.method.mensagem(response.message)
          return;
        }

        sobre.method.carregaFormasPagamento(response.data);
      },
      (error) => {
        app.method.loading(false);
        console.log('error', error)
      }
    )
  },

  carregaFormasPagamento: (list) => {
    let container = document.querySelector("#formasPagamento");
    let lista = document.querySelector("#listaFormasPagamento");

    if (!list || list.length === 0) {
      container.remove();
      return;
    }

    container.classList.remove('hidden');
    lista.innerHTML = '';

    list.forEach((e) => {
      let nome = e.nome.toLowerCase();

      let tipoClasse = 'default';
      let icone = 'fas fa-credit-card';

      if (nome.includes('pix')) {
        tipoClasse = 'pix';
        icone = 'fas fa-bolt';
      }
      else if (nome.includes('crédito')) {
        tipoClasse = 'credit';
        icone = 'fas fa-credit-card';
      }
      else if (nome.includes('débito')) {
        tipoClasse = 'debit';
        icone = 'fas fa-credit-card';
      }
      else if (nome.includes('dinheiro')) {
        tipoClasse = 'money';
        icone = 'fas fa-money-bill-wave';
      }

      let temp = sobre.templates.formapagamentoModerno
        .replace(/\${classe}/g, tipoClasse)
        .replace(/\${icone}/g, icone)
        .replace(/\${nome}/g, e.nome);

      lista.innerHTML += temp;
    });
  },

  obterTiposEntrega: () => {
    app.method.get('/entrega/tipo',
      (response) => {
        console.log(response);

        if (response.status === 'error') {
          app.method.mensagem(response.message);
          return;
        }

        sobre.method.carregarTiposEntrega(response.data);
      },
      (error) => {
        console.log('error', error);
      }
    );
  },

  carregarTiposEntrega: (list) => {
    let container = document.querySelector("#tiposEntrega");
    let lista = document.querySelector("#listaTiposEntrega");

    if (!container || !lista) return;

    if (!list || list.length === 0) {
      container.remove();
      return;
    }

    container.classList.remove('hidden');
    lista.innerHTML = '';

    let retirada = list.find((e) => e.idtipoentrega == 1);
    let delivery = list.find((e) => e.idtipoentrega == 2);

    if (delivery) {
      let ativo = Number(delivery.ativo) === 2;
      let tempo = (delivery.tempominimo != null && delivery.tempomaximo != null)
        ? `${delivery.tempominimo} a ${delivery.tempomaximo} min`
        : 'Tempo não informado';

      lista.innerHTML += sobre.templates.tipoEntregaModerno
        .replace(/\${cardClass}/g, ativo ? 'active' : 'inactive')
        .replace(/\${icon}/g, 'fas fa-motorcycle')
        .replace(/\${tipo}/g, 'Entrega')
        .replace(/\${statusClass}/g, ativo ? 'active' : 'inactive')
        .replace(/\${status}/g, ativo ? 'Disponível' : 'Indisponível')
        .replace(/\${tempo}/g, tempo);
    }

    if (retirada) {
      let ativo = Number(retirada.ativo) === 1;
      let tempo = (retirada.tempominimo != null && retirada.tempomaximo != null)
        ? `${retirada.tempominimo} a ${retirada.tempomaximo} min`
        : 'Tempo não informado';

      lista.innerHTML += sobre.templates.tipoEntregaModerno
        .replace(/\${cardClass}/g, ativo ? 'active' : 'inactive')
        .replace(/\${icon}/g, 'fas fa-store')
        .replace(/\${tipo}/g, 'Retirada no local')
        .replace(/\${statusClass}/g, ativo ? 'active' : 'inactive')
        .replace(/\${status}/g, ativo ? 'Disponível' : 'Indisponível')
        .replace(/\${tempo}/g, tempo);
    }

    if (!retirada && !delivery) {
      container.remove();
    }
  }
};

sobre.templates = {
  formapagamentoModerno: `
    <div class="payment-card">
      <div class="payment-icon \${classe}">
        <i class="\${icone}"></i>
      </div>
      <span>\${nome}</span>
    </div>
  `,

  horarioModerno: `
    <div class="schedule-card \${todayClass}">
      <div class="schedule-day">
        <span class="schedule-day-name">\${dia}</span>
        \${todayTag}
      </div>
      <div class="schedule-time">\${horario}</div>
    </div>
  `,

  tipoEntregaModerno: `
    <div class="delivery-option-card \${cardClass}">
      <div class="delivery-option-top">
        <div class="delivery-option-title">
          <i class="\${icon}"></i>
          <span>\${tipo}</span>
        </div>
        <span class="delivery-option-status \${statusClass}">\${status}</span>
      </div>
      <div class="delivery-option-time">Tempo estimado: \${tempo}</div>
    </div>
  `
}