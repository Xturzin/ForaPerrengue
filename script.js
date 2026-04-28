'use strict';

let _supa = null;

async function initSupabase() {
  try {
    const SUPABASE_URL = "https://wmyzhifyihcxuphkicwu.supabase.co";
    const SUPABASE_KEY = "sb_publishable_Jsofa9dlC_Pl9ZkdgvPGcA_7fAlfpTB";

    _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("✅ Supabase conectado");

  } catch (err) {
    console.error("❌ Erro Supabase:", err);
    _supa = null;
  }
}

const CAT_EMOJIS = {
  'Alimentação':'🍔','Transporte':'🚗','Lazer':'🎮',
  'Contas':'💡','Saúde':'🏥','Educação':'📚',
  'Beleza':'💅','Outros':'📦','cartao':'💳',
};
const CAT_COLORS = {
  'Alimentação':'#f87171','Transporte':'#34d399','Lazer':'#fbbf24',
  'Contas':'#a78bfa','Saúde':'#fb7185','Educação':'#60a5fa',
  'Beleza':'#f472b6','Outros':'#9ca3af','cartao':'#c084fc',
};
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_PT  = ['D','S','T','Q','Q','S','S'];

let pieChart   = null;
let currentUser= null;
let _userId    = null;   
let clockTimer = null;

const _gastoFromDB = r => ({ id:r.id, nome:r.nome, valor:r.valor, categoria:r.categoria, subcategoria:r.subcategoria||'', data:r.data });
const _gastoDB     = g => ({ id:g.id, user_id:_userId, nome:g.nome, valor:g.valor, categoria:g.categoria, subcategoria:g.subcategoria||'', data:g.data });

const _rendaFromDB = r => ({ id:r.id, tipo:r.tipo, nome:r.nome, valor:r.valor,
  data:r.data, diaMes:r.dia_mes, mesInicio:r.mes_inicio,
  tipoTermino:r.tipo_termino, mesFim:r.mes_fim });
const _rendaDB     = r => ({ id:r.id, user_id:_userId, tipo:r.tipo, nome:r.nome, valor:r.valor,
  data:r.data||null, dia_mes:r.diaMes||null, mes_inicio:r.mesInicio||null,
  tipo_termino:r.tipoTermino||null, mes_fim:r.mesFim||null });

const _parcFromDB  = r => ({ id:r.id, nome:r.nome, valorTotal:r.valor_total,
  valorParcela:r.valor_parcela, numParcelas:r.num_parcelas,
  inicio:r.inicio, tipo:r.tipo, diaVenc:r.dia_venc, parcelas:r.parcelas });
const _parcDB      = p => ({ id:p.id, user_id:_userId, nome:p.nome, valor_total:p.valorTotal,
  valor_parcela:p.valorParcela, num_parcelas:p.numParcelas,
  inicio:p.inicio, tipo:p.tipo, dia_venc:p.diaVenc, parcelas:p.parcelas });

const _futFromDB   = r => ({ id:r.id, nome:r.nome, valorEstimado:r.valor_estimado, data:r.data, obs:r.obs||'' });
const _futDB       = f => ({ id:f.id, user_id:_userId, nome:f.nome, valor_estimado:f.valorEstimado, data:f.data, obs:f.obs||'' });

const _recFromDB   = r => ({ id:r.id, nome:r.nome, valor:r.valor, frequencia:r.frequencia,
  proximaData:r.proxima_data, ultimoGastoId:r.ultimo_gasto_id });
const _recDB       = r => ({ id:r.id, user_id:_userId, nome:r.nome, valor:r.valor,
  frequencia:r.frequencia, proxima_data:r.proximaData, ultimo_gasto_id:r.ultimoGastoId||null });

const DB = {
  session:     () => { try{return JSON.parse(localStorage.getItem('fp7_session'));}catch{return null;} },
  saveSession: v  => localStorage.setItem('fp7_session', JSON.stringify(v)),
  clearSession:() => localStorage.removeItem('fp7_session'),
  theme:       () => localStorage.getItem('fp7_theme')||'auto',
  saveTheme:   v  => localStorage.setItem('fp7_theme', v),

  async findUser(username, password) {
    try {
      if (!_supa) return null;

      const { data, error } = await _supa
        .from('users')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();

      if (error || !data) return null;

      _userId = data.id;

      return { id: data.id, nome: data.nome, username: data.username };

    } catch (err) {
      console.error("Erro login:", err);
      return null;
    }
  },

  async findUserByUsername(username) {
    try {
      if (!_supa) return null;

      const { data, error } = await _supa
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) return null;

      _userId = data.id;

      return { id: data.id, nome: data.nome, username: data.username };

    } catch (err) {
      console.error("Erro buscar usuário:", err);
      return null;
    }
  },

  async usernameExists(username) {
    try {
      if (!_supa) return false;

      const { data } = await _supa
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

      return !!data;

    } catch {
      return false;
    }
  },

  async createUser(nome, username, password) {
    try {
      if (!_supa) return null;

      const { data, error } = await _supa
        .from('users')
        .insert({ nome, username, password })
        .select()
        .single();

      if (error || !data) {
        console.error("Erro ao criar usuário:", error);
        return null;
      }

      return { id: data.id, nome: data.nome, username: data.username };

    } catch (err) {
      console.error("Erro createUser:", err);
      return null;
    }
  },

  async gastos() {
    try {
      if (!_supa) return [];

      const { data } = await _supa.from('gastos')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });

      return (data||[]).map(_gastoFromDB);

    } catch {
      return [];
    }
  },

  async saveGastos(list) {
    try {
      if (!_supa) return;

      await _supa.from('gastos').delete().eq('user_id', _userId);

      if (list.length) {
        await _supa.from('gastos')
          .insert(list.map((g,i) => ({ ..._gastoDB(g), ordem:i })));
      }
    } catch (err) {
      console.error("Erro saveGastos:", err);
    }
  },

  async rendas() {
    try {
      if (!_supa) return [];

      const { data } = await _supa.from('rendas')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });

      return (data||[]).map(_rendaFromDB);

    } catch {
      return [];
    }
  },

  async saveRendas(list) {
    try {
      if (!_supa) return;

      await _supa.from('rendas').delete().eq('user_id', _userId);

      if (list.length) {
        await _supa.from('rendas')
          .insert(list.map((r,i) => ({ ..._rendaDB(r), ordem:i })));
      }
    } catch (err) {
      console.error("Erro saveRendas:", err);
    }
  },

  async parceladas() {
    try {
      if (!_supa) return [];

      const { data } = await _supa.from('parceladas')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });

      return (data||[]).map(_parcFromDB);

    } catch {
      return [];
    }
  },

  async saveParcelas(list) {
    try {
      if (!_supa) return;

      await _supa.from('parceladas').delete().eq('user_id', _userId);

      if (list.length) {
        await _supa.from('parceladas')
          .insert(list.map((p,i) => ({ ..._parcDB(p), ordem:i })));
      }
    } catch (err) {
      console.error("Erro saveParcelas:", err);
    }
  },

  async futuras() {
    try {
      if (!_supa) return [];

      const { data } = await _supa.from('futuras')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });

      return (data||[]).map(_futFromDB);

    } catch {
      return [];
    }
  },

  async saveFuturas(list) {
    try {
      if (!_supa) return;

      await _supa.from('futuras').delete().eq('user_id', _userId);

      if (list.length) {
        await _supa.from('futuras')
          .insert(list.map((f,i) => ({ ..._futDB(f), ordem:i })));
      }
    } catch (err) {
      console.error("Erro saveFuturas:", err);
    }
  },

  async recorrentes() {
    try {
      if (!_supa) return [];

      const { data } = await _supa.from('recorrentes')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });

      return (data||[]).map(_recFromDB);

    } catch {
      return [];
    }
  },

  async saveRecorr(list) {
    try {
      if (!_supa) return;

      await _supa.from('recorrentes').delete().eq('user_id', _userId);

      if (list.length) {
        await _supa.from('recorrentes')
          .insert(list.map((r,i) => ({ ..._recDB(r), ordem:i })));
      }
    } catch (err) {
      console.error("Erro saveRecorr:", err);
    }
  },
};

const fmt = {
  brl:      v  => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
  date:     s  => { if(!s)return'—'; const[y,m,d]=s.split('-'); return`${d}/${m}/${y}`; },
  dateLong: s  => { if(!s)return'—'; return new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); },
  hora:     () => new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
  dataCurta:() => new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'}),
  hoje:     () => new Date().toISOString().split('T')[0],
  mesAtual: () => { const d=new Date(); return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
  mesOffset:n  => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+n); return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
  parseMes: s  => { const[y,m]=(s||'').split('-').map(Number); return{ano:y,mes0:m-1}; },
  uid:      () => Date.now().toString(36)+Math.random().toString(36).slice(2,6),
  esc:      s  => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
  saudacao: n  => { const h=new Date().getHours(); const g=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'; return`${g}, ${n}! 👋`; },

  avancaMes: dateStr => {
    const d = new Date(dateStr+'T12:00:00'), dia = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth()+1);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(dia, ultimoDia));
    return d.toISOString().split('T')[0];
  },
  voltaMes: dateStr => {
    const d = new Date(dateStr+'T12:00:00'), dia = d.getDate();
    d.setDate(1); d.setMonth(d.getMonth()-1);
    const ultimoDia = new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
    d.setDate(Math.min(dia, ultimoDia));
    return d.toISOString().split('T')[0];
  },
};

function setupMoneyInput(id) {
  const inp = document.getElementById(id);
  if (!inp) return;
  inp.addEventListener('input', () => {
    let raw = inp.value.replace(/[^\d,]/g,'');
    const parts = raw.split(',');
    let intP = parts[0].replace(/\D/g,'');
    if (intP) intP = Number(intP).toLocaleString('pt-BR');
    const decP = parts.length > 1 ? ','+parts[1].slice(0,2) : '';
    inp.value = intP + decP;
  });
  inp.addEventListener('keydown', e => {
    const ok = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End',','];
    if (!ok.includes(e.key) && !e.key.match(/^\d$/)) e.preventDefault();
  });
}
function parseMoney(id) {
  const v = (document.getElementById(id)?.value||'0').replace(/\./g,'').replace(',','.');
  return parseFloat(v)||0;
}

class DatePicker {
  constructor(inputId, opts={}) {
    this.input = document.getElementById(inputId);
    if (!this.input) return;
    this.opts  = opts;
    this.open  = false;
    this.current = null;
    const now = new Date();
    this.viewYear  = now.getFullYear();
    this.viewMonth = now.getMonth();
    if (this.input.value) {
      this.current = this.input.value;
      const [y,m] = this.input.value.split('-').map(Number);
      this.viewYear = y; this.viewMonth = m-1;
    }
    this._build();
  }
  _build() {
    const wrap = document.createElement('div');
    wrap.className = 'dp-wrap';
    this.input.parentNode.insertBefore(wrap, this.input);
    wrap.appendChild(this.input);
    this.display = document.createElement('button');
    this.display.type = 'button';
    this.display.className = 'dp-display';
    this._updateDisplay();
    wrap.appendChild(this.display);
    this.popup = document.createElement('div');
    this.popup.className = 'dp-popup hidden';
    wrap.appendChild(this.popup);
    this.display.addEventListener('click', e => { e.stopPropagation(); this._toggle(); });
    document.addEventListener('click', () => { if(this.open) this._close(); });
    this.popup.addEventListener('click', e => e.stopPropagation());
    this._renderCal();
  }
  _updateDisplay() {
    if (this.current) {
      this.display.innerHTML = `${fmt.date(this.current)} <span class="dp-cal-icon">📅</span>`;
    } else {
      this.display.innerHTML = `<span class="dp-placeholder">Selecione a data</span> <span class="dp-cal-icon">📅</span>`;
    }
  }
  _toggle() { this.open ? this._close() : this._openCal(); }
  _openCal() { this.display.classList.add('active'); this.popup.classList.remove('hidden'); this.open=true; this._renderCal(); }
  _close()   { this.display.classList.remove('active'); this.popup.classList.add('hidden'); this.open=false; }
  _renderCal() {
    const y=this.viewYear, m=this.viewMonth;
    const firstDay  = new Date(y,m,1).getDay();
    const daysInM   = new Date(y,m+1,0).getDate();
    const daysInPrev= new Date(y,m,0).getDate();
    const hoje      = fmt.hoje();
    const minDate   = this.opts.minDate||null;
    const maxDate   = this.opts.maxDate||null;
    let html = `
      <div class="dp-nav">
        <button class="dp-nav-btn" id="dp-prev-${y}${m}">‹</button>
        <span class="dp-month-year">${MESES_PT[m]} ${y}</span>
        <button class="dp-nav-btn" id="dp-next-${y}${m}">›</button>
      </div>
      <div class="dp-weekdays">${DIAS_PT.map(d=>`<div class="dp-wd">${d}</div>`).join('')}</div>
      <div class="dp-days">
    `;
    for (let i=firstDay-1;i>=0;i--) html+=`<div class="dp-day dp-other-month dp-disabled">${daysInPrev-i}</div>`;
    for (let d=1;d<=daysInM;d++) {
      const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      let cls='dp-day';
      if (ds===hoje) cls+=' dp-today';
      if (ds===this.current) cls+=' dp-selected';
      if ((minDate&&ds<minDate)||(maxDate&&ds>maxDate)) cls+=' dp-disabled';
      html+=`<div class="${cls}" data-date="${ds}">${d}</div>`;
    }
    const rem = (firstDay+daysInM)%7===0?0:7-(firstDay+daysInM)%7;
    for (let d=1;d<=rem;d++) html+=`<div class="dp-day dp-other-month dp-disabled">${d}</div>`;
    html+='</div>';
    this.popup.innerHTML=html;
    this.popup.querySelector(`#dp-prev-${y}${m}`).addEventListener('click',()=>{
      this.viewMonth--; if(this.viewMonth<0){this.viewMonth=11;this.viewYear--;} this._renderCal();
    });
    this.popup.querySelector(`#dp-next-${y}${m}`).addEventListener('click',()=>{
      this.viewMonth++; if(this.viewMonth>11){this.viewMonth=0;this.viewYear++;} this._renderCal();
    });
    this.popup.querySelectorAll('.dp-day:not(.dp-disabled):not(.dp-other-month)').forEach(el => {
      el.addEventListener('click',()=>{
        this.current=el.dataset.date;
        this.input.value=this.current;
        this._updateDisplay();
        this._close();
        this.opts.onChange?.(this.current);
      });
    });
  }
  getValue() { return this.current||''; }
  setValue(ds) { this.current=ds||''; if(ds){const[y,m]=ds.split('-').map(Number);this.viewYear=y;this.viewMonth=m-1;} this.input.value=this.current; this._updateDisplay(); }
}

const pickers = {};

function initDatePickers() {
  Object.keys(pickers).forEach(k => {
    if (pickers[k] && typeof pickers[k].destroy === 'function') {
      pickers[k].destroy();
    }
    delete pickers[k];
  });

  const hoje = fmt.hoje();
  const amanha = new Date(); amanha.setDate(amanha.getDate()+1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  pickers.gasto  = new DatePicker('g-data',  {maxDate:hoje});
  pickers.gasto.setValue(hoje);
  pickers.rpData = new DatePicker('rp-data', {});
  pickers.rpData.setValue(hoje);
  pickers.fData  = new DatePicker('f-data',  {minDate:amanhaStr});
  pickers.fData.setValue(amanhaStr);
  pickers.rcData = new DatePicker('rc-data', {});
  pickers.rcData.setValue(hoje);
}

let _toastT=null;
function toast(msg,type='success',ms=3200) {
  const el=document.getElementById('toast');
  const icons={success:'✅',error:'❌',info:'💜'};
  el.className=`toast toast-${type}`;
  el.classList.remove('hidden','leaving');
  document.getElementById('toast-icon').textContent=icons[type]||'💬';
  document.getElementById('toast-msg').textContent=msg;
  clearTimeout(_toastT);
  _toastT=setTimeout(()=>{ el.classList.add('leaving'); setTimeout(()=>el.classList.add('hidden'),220); },ms);
}

function applyTheme(t) {
  const html=document.documentElement;
  const toggle=document.getElementById('theme-toggle');
  const lbl=document.getElementById('theme-lbl');
  let real=t;
  if(t==='auto') real=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';
  html.setAttribute('data-theme',real);
  if(toggle) toggle.checked=(real==='light');
  if(lbl) lbl.textContent=real==='light'?'☀️ Modo claro':'🌙 Modo escuro';
  DB.saveTheme(t);
  if(pieChart) renderPieChart([]);
}
function initTheme() {
  applyTheme(DB.theme());
  document.getElementById('theme-toggle').addEventListener('change',e=>applyTheme(e.target.checked?'light':'dark'));
  window.matchMedia('(prefers-color-scheme:dark)').addEventListener('change',()=>{if(DB.theme()==='auto')applyTheme('auto');});
}

function initClock() {
  const dateEl=document.getElementById('clock-date');
  const timeEl=document.getElementById('clock-time');
  const tick=()=>{ if(dateEl)dateEl.textContent=fmt.dataCurta(); if(timeEl)timeEl.textContent=fmt.hora(); };
  tick();
  clearInterval(clockTimer);
  clockTimer=setInterval(tick,1000);
}

function initAuth() {
  document.querySelectorAll('.auth-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    });
  });
  document.querySelectorAll('.btn-eye').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const inp=document.getElementById(btn.dataset.t);
      inp.type=inp.type==='password'?'text':'password';
      btn.textContent=inp.type==='password'?'👁️':'🙈';
    });
  });
  ['l-user','l-pass'].forEach(id=>document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btn-login').click();}));

  document.getElementById('btn-login').addEventListener('click', async () => {
    const u   = document.getElementById('l-user').value.trim();
    const p   = document.getElementById('l-pass').value;
    const rem = document.getElementById('l-remember').checked;
    const err = document.getElementById('l-error');
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    const found = await DB.findUser(u, p);
    btn.disabled = false;
    if (!found) { err.classList.remove('hidden'); document.getElementById('l-pass').value=''; return; }
    err.classList.add('hidden');
    DB.saveSession({ username:u, nome:found.nome, remember:rem });
    await openApp(found);
  });

  document.getElementById('btn-register').addEventListener('click', async () => {
    const nome  = document.getElementById('r-nome').value.trim();
    const user  = document.getElementById('r-user').value.trim();
    const pass  = document.getElementById('r-pass').value;
    const pass2 = document.getElementById('r-pass2').value;
    const err   = document.getElementById('r-error');
    const btn   = document.getElementById('btn-register');
    err.classList.add('hidden');
    if (nome.length<2)   { err.textContent='Nome muito curto.';           err.classList.remove('hidden'); return; }
    if (user.length<3)   { err.textContent='Login mín. 3 caracteres.';    err.classList.remove('hidden'); return; }
    if (pass.length<4)   { err.textContent='Senha mín. 4 caracteres.';    err.classList.remove('hidden'); return; }
    if (pass!==pass2)    { err.textContent='Senhas não coincidem.';        err.classList.remove('hidden'); return; }
    btn.disabled = true;
    const exists = await DB.usernameExists(user);
    if (exists) { err.textContent='Login já existe.'; err.classList.remove('hidden'); btn.disabled=false; return; }
    const newUser = await DB.createUser(nome, user, pass);
    btn.disabled = false;
    if (!newUser) { err.textContent='Erro ao criar conta. Tente novamente.'; err.classList.remove('hidden'); return; }
    document.querySelector('.auth-tab[data-tab="login"]').click();
    document.getElementById('l-user').value = user;
    ['r-nome','r-user','r-pass','r-pass2'].forEach(id=>document.getElementById(id).value='');
    toast('Conta criada! Faça login 🎉','success',4000);
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    if (!confirm('Deseja sair?')) return;
    const sess = DB.session();
    if (!sess?.remember) DB.clearSession();
    currentUser=null; _userId=null;
    clearInterval(clockTimer);
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('l-pass').value='';
  });
}

async function openApp(user) {
  currentUser = user;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const nome = user.nome || user.username;
  document.getElementById('sb-name').textContent = nome;
  document.getElementById('sb-avatar').textContent = nome.charAt(0).toUpperCase();
  document.getElementById('user-greet').textContent = fmt.saudacao(nome);
  // Campos month
  const mes = fmt.mesAtual();
  const rrInicio = document.getElementById('rr-inicio');
  if (rrInicio) rrInicio.value = mes;
  const rrFim = document.getElementById('rr-fim');
  if (rrFim) rrFim.min = fmt.mesOffset(1);
  const pInicio = document.getElementById('p-inicio');
  if (pInicio) pInicio.value = mes;

  initDatePickers();
  initClock();
  await renderAll();
  showView('dashboard');
}

function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click',()=>{showView(btn.dataset.view);closeSB();});
  });
  document.querySelectorAll('[data-view]:not(.nav-item)').forEach(el=>{
    el.addEventListener('click',()=>showView(el.dataset.view));
  });
  document.getElementById('btn-hamburger').addEventListener('click',openSB);
  document.getElementById('btn-sb-close').addEventListener('click',closeSB);
  document.getElementById('sb-overlay').addEventListener('click',closeSB);
}
function showView(name) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById(`view-${name}`)?.classList.add('active');
  document.querySelector(`.nav-item[data-view="${name}"]`)?.classList.add('active');
  const titles={dashboard:'Dashboard',gastos:'Novo Gasto',rendas:'Rendas',parceladas:'Parceladas',futuras:'Compras Futuras',recorrentes:'Recorrentes',historico:'Histórico',simulacao:'Simulação'};
  document.getElementById('page-title').textContent=titles[name]||name;
  const renders={dashboard:renderDashboard,historico:renderHistorico,rendas:renderRendas,parceladas:renderParceladas,futuras:renderFuturas,recorrentes:renderRecorrentes};
  renders[name]?.().catch(err=>console.error('Render error:',err));
}
function openSB(){document.getElementById('sidebar').classList.add('open');document.getElementById('sb-overlay').classList.add('open');}
function closeSB(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sb-overlay').classList.remove('open');}

function initModals() {
  const mAbout = document.getElementById('modal-about');
  document.getElementById('btn-about').addEventListener('click',()=>mAbout.classList.remove('hidden'));
  document.getElementById('btn-close-about').addEventListener('click',()=>mAbout.classList.add('hidden'));
  mAbout.addEventListener('click',e=>{if(e.target===mAbout)mAbout.classList.add('hidden');});

  const mPrev = document.getElementById('modal-previsao');
  document.getElementById('card-proximo-mes').addEventListener('click', async () => {
    await abrirModalPrevisao();
    mPrev.classList.remove('hidden');
  });
  document.getElementById('btn-close-previsao').addEventListener('click',()=>mPrev.classList.add('hidden'));
  mPrev.addEventListener('click',e=>{if(e.target===mPrev)mPrev.classList.add('hidden');});
}

async function abrirModalPrevisao() {
  const proxM = fmt.mesOffset(1);
  const {ano,mes0} = fmt.parseMes(proxM);
  document.getElementById('modal-prev-titulo').textContent = `Previsão de ${MESES_PT[mes0]} ${ano}`;

  const [rendas, parc, rec, futuras] = await Promise.all([
    DB.rendas(), DB.parceladas(), DB.recorrentes(), DB.futuras()
  ]);

  const entradas = todasEntradasSync(rendas, proxM+'-31').filter(e=>e.data.startsWith(proxM));
  const listEnt  = document.getElementById('prev-list-entradas');
  listEnt.innerHTML = '';
  let totalEnt = 0;
  if (entradas.length===0) {
    listEnt.innerHTML = '<p class="empty-msg">Nenhuma entrada prevista.</p>';
  } else {
    entradas.sort((a,b)=>a.data.localeCompare(b.data)).forEach(e=>{
      totalEnt += e.valor;
      const div=document.createElement('div'); div.className='prev-item';
      div.innerHTML=`<span class="prev-item-name">${fmt.esc(e.nome)}</span><span class="prev-item-val pos">+ ${fmt.brl(e.valor)}</span>`;
      listEnt.appendChild(div);
    });
  }
  document.getElementById('prev-total-entradas').textContent = `Total: ${fmt.brl(totalEnt)}`;

  const saidas = [];
  parc.forEach(p => {
    const parMes = p.parcelas.find(x=>x.mesAno===proxM && !x.pago);
    if (parMes) saidas.push({nome:`${p.nome} (${parMes.num}/${p.numParcelas})`,valor:parMes.valorParcela,tipo:'parcela'});
  });
  rec.filter(r=>r.frequencia==='mensal').forEach(r=>saidas.push({nome:r.nome,valor:r.valor,tipo:'mensal'}));
  rec.filter(r=>r.frequencia==='semanal').forEach(r=>saidas.push({nome:`${r.nome} ×4`,valor:r.valor*4,tipo:'semanal'}));
  rec.filter(r=>r.frequencia==='quinzenal').forEach(r=>saidas.push({nome:`${r.nome} ×2`,valor:r.valor*2,tipo:'quinzenal'}));
  futuras.filter(f=>f.data.startsWith(proxM)).forEach(f=>saidas.push({nome:f.nome,valor:f.valorEstimado,tipo:'futura'}));

  const listSai = document.getElementById('prev-list-saidas');
  listSai.innerHTML = '';
  let totalSai = 0;
  if (saidas.length===0) {
    listSai.innerHTML = '<p class="empty-msg">Nenhuma saída prevista.</p>';
  } else {
    saidas.forEach(s=>{
      totalSai += s.valor;
      const div=document.createElement('div'); div.className='prev-item';
      div.innerHTML=`<span class="prev-item-name">${fmt.esc(s.nome)}</span><span class="prev-item-val neg">− ${fmt.brl(s.valor)}</span>`;
      listSai.appendChild(div);
    });
  }
  document.getElementById('prev-total-saidas').textContent = `Total: ${fmt.brl(totalSai)}`;

  const resultado = totalEnt - totalSai;
  const resEl = document.getElementById('prev-resultado-valor');
  resEl.textContent = fmt.brl(resultado);
  resEl.style.color = resultado < 0 ? 'var(--red)' : 'var(--green)';
}

function initMiniTabs() {
  document.querySelectorAll('.mini-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.mini-tab').forEach(t=>t.classList.remove('active'));
      tab.classList.add('active');
      ['renda-pontual','renda-regular'].forEach(id=>{
        const el=document.getElementById(`mt-${id}`);
        if(el)el.style.display=tab.dataset.mt===id?'block':'none';
      });
    });
  });
}
function gerarOcorrencias(renda, ateData) {
  const resultado=[],seen=new Set();
  const maxAnos=new Date();maxAnos.setFullYear(maxAnos.getFullYear()+5);
  const maxStr=maxAnos.toISOString().split('T')[0];
  let{ano,mes0}=fmt.parseMes(renda.mesInicio);
  let anoFim=null,mes0Fim=null;
  if(renda.tipoTermino==='determinado'&&renda.mesFim){const p=fmt.parseMes(renda.mesFim);anoFim=p.ano;mes0Fim=p.mes0;}
  while(true){
    const diaMax=new Date(ano,mes0+1,0).getDate();
    const dia=Math.min(renda.diaMes,diaMax);
    const ds=`${ano}-${String(mes0+1).padStart(2,'0')}-${String(dia).padStart(2,'0')}`;
    if(ds>ateData||ds>maxStr)break;
    if(anoFim!==null&&(ano>anoFim||(ano===anoFim&&mes0>mes0Fim)))break;
    if(!seen.has(ds)){seen.add(ds);resultado.push({id:renda.id+'_'+ds,nome:renda.nome,valor:renda.valor,data:ds,rendaId:renda.id});}
    mes0++;if(mes0>11){mes0=0;ano++;}
  }
  return resultado;
}

function todasEntradasSync(rendas, ateData) {
  const lista=[],seen=new Set();
  rendas.forEach(r=>{
    if(r.tipo==='pontual'){
      if(r.data<=ateData&&!seen.has(r.id)){seen.add(r.id);lista.push({id:r.id,nome:r.nome,valor:r.valor,data:r.data});}
    } else if(r.tipo==='regular'){
      gerarOcorrencias(r,ateData).forEach(o=>{if(!seen.has(o.id)){seen.add(o.id);lista.push(o);}});
    }
  });
  return lista;
}

async function todasEntradas(ateData) {
  const rendas = await DB.rendas();
  return todasEntradasSync(rendas, ateData);
}

function calcSaldosSync(gastos, parc, rec, futuras, rendas) {
  const hoje   = fmt.hoje();
  const mesAtu = fmt.mesAtual();
  const proxM  = fmt.mesOffset(1);

  // Gastos normais = todos exceto cartao (cartao já tem data no próximo mês)
  const gastosNormais = gastos.filter(g => g.categoria !== 'cartao');
  const gastosCartao  = gastos.filter(g => g.categoria === 'cartao');

  const recebidas   = todasEntradasSync(rendas, hoje);
  const totalRec    = recebidas.reduce((a,e)=>a+e.valor,0);
  const totalGastos = gastosNormais.reduce((a,g)=>a+g.valor,0);
  const totalPagas  = parc.reduce((a,p)=>a+p.parcelas.filter(x=>x.pago).reduce((b,x)=>b+x.valorParcela,0),0);
  const disponivel  = totalRec - totalGastos - totalPagas;

  const todasMes   = todasEntradasSync(rendas, mesAtu+'-31');
  const aReceberMes= todasMes.filter(e=>e.data>hoje&&e.data.startsWith(mesAtu));
  const totalARec  = aReceberMes.reduce((a,e)=>a+e.valor,0);

  const gastosMes  = gastosNormais.filter(g=>g.data>=mesAtu+'-01'&&g.data<=mesAtu+'-31').reduce((a,g)=>a+g.valor,0);
  const parcMes    = parc.reduce((a,p)=>a+p.parcelas.filter(x=>x.pago&&x.mesAno===mesAtu).reduce((b,x)=>b+x.valorParcela,0),0);
  const totalSaidas= gastosMes + parcMes;

  const entradasProx  = todasEntradasSync(rendas, proxM+'-31').filter(e=>e.data.startsWith(proxM));
  const totalEntrProx = entradasProx.reduce((a,e)=>a+e.valor,0);
  const recMensal  = rec.filter(r=>r.frequencia==='mensal').reduce((a,r)=>a+r.valor,0);
  const recSemanal = rec.filter(r=>r.frequencia==='semanal').reduce((a,r)=>a+r.valor*4,0);
  const recQuinz   = rec.filter(r=>r.frequencia==='quinzenal').reduce((a,r)=>a+r.valor*2,0);
  const parcProx   = parc.reduce((a,p)=>a+p.parcelas.filter(x=>x.mesAno===proxM&&!x.pago).reduce((b,x)=>b+x.valorParcela,0),0);
  const futProx    = futuras.filter(f=>f.data.startsWith(proxM)).reduce((a,f)=>a+f.valorEstimado,0);
  // Gastos de cartão que caem no próximo mês
  const cartaoProx = gastosCartao.filter(g=>g.data.startsWith(proxM)).reduce((a,g)=>a+g.valor,0);
  const proximoMes = totalEntrProx - recMensal - recSemanal - recQuinz - parcProx - futProx - cartaoProx;

  return {disponivel,aReceberMes,totalARec,totalSaidas,proximoMes,mesAtu,gastosCartao};
}

function initGastos() {
  setupMoneyInput('g-valor');

  // Mostrar/esconder campo de subcategoria ao selecionar Cartão de Crédito
  document.getElementById('g-cat').addEventListener('change', function() {
    const subcatWrap = document.getElementById('g-subcat-wrap');
    if (this.value === 'cartao') {
      subcatWrap.classList.remove('hidden');
    } else {
      subcatWrap.classList.add('hidden');
      document.getElementById('g-subcat').value = '';
    }
  });

  document.getElementById('btn-add-gasto').addEventListener('click', async () => {
    const nome      = document.getElementById('g-nome').value.trim();
    const valor     = parseMoney('g-valor');
    const cat       = document.getElementById('g-cat').value;
    const data      = pickers.gasto?.getValue()||'';
    const isCartao  = cat === 'cartao';
    const subcat    = isCartao ? document.getElementById('g-subcat').value : '';

    if (!nome || valor <= 0 || !cat || !data) { toast('Preencha todos os campos.','error'); return; }
    if (data > fmt.hoje()) { toast('Data do gasto não pode ser futura.','error'); return; }
    if (isCartao && !subcat) { toast('Selecione a categoria do cartão.','error'); return; }

    const list = await DB.gastos();

    if (isCartao) {
      // Cartão: salvar com data no PRÓXIMO mês (mesmo dia), para não impactar o mês atual
      const dataOriginal = data; // data que o usuário viu
      const proxMesData  = fmt.avancaMes(data); // empurra 1 mês
      list.unshift({ id:fmt.uid(), nome, valor, categoria:'cartao', subcategoria:subcat, data:proxMesData, dataCompra:dataOriginal });
      await DB.saveGastos(list);
      toast(`💳 ${fmt.brl(valor)} no cartão — sai em ${fmt.date(proxMesData)}`, 'info', 4000);
    } else {
      list.unshift({ id:fmt.uid(), nome, valor, categoria:cat, subcategoria:'', data });
      await DB.saveGastos(list);
      toast(`${fmt.brl(valor)} registrado! 💸`);
    }

    document.getElementById('g-nome').value = '';
    document.getElementById('g-valor').value = '';
    document.getElementById('g-cat').value = '';
    document.getElementById('g-subcat').value = '';
    document.getElementById('g-subcat-wrap').classList.add('hidden');
    pickers.gasto?.setValue(fmt.hoje());
    await renderDashboard();
  });
}
window.deletarGasto = async function(id) {
  if (!confirm('Excluir este gasto?')) return;
  const list = await DB.gastos();
  await DB.saveGastos(list.filter(g=>g.id!==id));
  await renderDashboard();
  await renderHistorico();
};

function initRendas() {
  setupMoneyInput('rp-valor');
  setupMoneyInput('rr-valor');

  document.querySelectorAll('input[name="rr-prazo"]').forEach(r=>{
    r.addEventListener('change',()=>{
      const wrap=document.getElementById('rr-fim-wrap');
      wrap.style.display=r.value==='determinado'?'block':'none';
      document.getElementById('rr-fim').min=fmt.mesOffset(1);
    });
  });

  document.getElementById('btn-add-rp').addEventListener('click', async () => {
    const nome  = document.getElementById('rp-nome').value.trim();
    const valor = parseMoney('rp-valor');
    const data  = pickers.rpData?.getValue()||'';
    if (!nome||valor<=0||!data) { toast('Preencha todos os campos.','error'); return; }
    const list = await DB.rendas();
    list.unshift({id:fmt.uid(),tipo:'pontual',nome,valor,data});
    await DB.saveRendas(list);
    document.getElementById('rp-nome').value='';
    document.getElementById('rp-valor').value='';
    pickers.rpData?.setValue(fmt.hoje());
    await renderDashboard();
    await renderRendas();
    toast(`Entrada de ${fmt.brl(valor)} registrada! 💰`);
  });

  document.getElementById('btn-add-rr').addEventListener('click', async () => {
    const nome  = document.getElementById('rr-nome').value.trim();
    const valor = parseMoney('rr-valor');
    const dia   = parseInt(document.getElementById('rr-dia').value);
    const inicio= document.getElementById('rr-inicio').value;
    const prazo = document.querySelector('input[name="rr-prazo"]:checked')?.value;
    const fim   = document.getElementById('rr-fim').value;
    if (!nome||valor<=0||isNaN(dia)||dia<1||dia>28||!inicio) { toast('Preencha todos os campos.','error'); return; }
    if (prazo==='determinado'&&!fim) { toast('Informe o mês de encerramento.','error'); return; }
    if (prazo==='determinado'&&fim<=fmt.mesAtual()) { toast('Encerramento deve ser futuro.','error'); return; }
    const list = await DB.rendas();
    list.unshift({id:fmt.uid(),tipo:'regular',nome,valor,diaMes:dia,mesInicio:inicio,tipoTermino:prazo,mesFim:prazo==='determinado'?fim:null});
    await DB.saveRendas(list);
    document.getElementById('rr-nome').value='';
    document.getElementById('rr-valor').value='';
    document.getElementById('rr-dia').value='';
    await renderDashboard();
    await renderRendas();
    toast('Renda regular cadastrada! 🔁');
  });
}
window.receberAntecipado = async function(id,nome,valor) {
  if (!confirm(`Confirmar recebimento antecipado de ${fmt.brl(valor)} (${nome})?`)) return;
  const rendas = await DB.rendas();
  const item = rendas.find(r=>r.id===id);
  if (item) { item.data=fmt.hoje(); await DB.saveRendas(rendas); }
  await renderDashboard();
  await renderRendas();
  toast(`${fmt.brl(valor)} marcado como recebido! ✅`);
};
window.deletarRenda = async function(id) {
  if (!confirm('Remover esta renda?')) return;
  const list = await DB.rendas();
  await DB.saveRendas(list.filter(r=>r.id!==id));
  await renderDashboard();
  await renderRendas();
};

function initParceladas() {
  setupMoneyInput('p-valor');
  ['p-valor','p-num'].forEach(id=>document.getElementById(id).addEventListener('input',atualizarPreviewParc));
  document.getElementById('p-tipo-total').addEventListener('change',()=>{
    document.getElementById('p-valor-label').textContent='Valor total (R$)'; atualizarPreviewParc();
  });
  document.getElementById('p-tipo-parcela').addEventListener('change',()=>{
    document.getElementById('p-valor-label').textContent='Valor da parcela (R$)'; atualizarPreviewParc();
  });

  document.getElementById('btn-add-parc').addEventListener('click', async () => {
    const nome  = document.getElementById('p-nome').value.trim();
    const valI  = parseMoney('p-valor');
    const num   = parseInt(document.getElementById('p-num').value);
    const inicio= document.getElementById('p-inicio').value;
    const tipo  = document.getElementById('p-tipo-total').checked?'total':'parcela';
    const diaV  = parseInt(document.getElementById('p-dia-venc').value);
    if (!nome||valI<=0||isNaN(num)||num<1||!inicio) { toast('Preencha todos os campos.','error'); return; }
    if (isNaN(diaV)||diaV<1||diaV>28) { toast('Informe o dia de vencimento (1–28).','error'); return; }

    const valParc  = tipo==='total'?valI/num:valI;
    const valTotal = tipo==='total'?valI:valI*num;
    const parcelas = [];
    let{ano,mes0}=fmt.parseMes(inicio);
    for (let i=0;i<num;i++) {
      const mesStr=`${ano}-${String(mes0+1).padStart(2,'0')}`;
      parcelas.push({num:i+1,mesAno:mesStr,valorParcela:valParc,diaVenc:diaV,pago:false});
      mes0++; if(mes0>11){mes0=0;ano++;}
    }
    const list = await DB.parceladas();
    list.unshift({id:fmt.uid(),nome,valorTotal:valTotal,valorParcela:valParc,numParcelas:num,inicio,tipo,diaVenc:diaV,parcelas});
    await DB.saveParcelas(list);
    document.getElementById('p-nome').value='';
    document.getElementById('p-valor').value='';
    document.getElementById('p-num').value='';
    document.getElementById('p-dia-venc').value='';
    document.getElementById('p-preview').classList.add('hidden');
    await renderParceladas();
    await renderDashboard();
    toast(`Parcelamento de ${fmt.brl(valTotal)} adicionado! 💳`);
  });
}
function atualizarPreviewParc() {
  const valor = parseMoney('p-valor');
  const num   = parseInt(document.getElementById('p-num').value)||0;
  const tipo  = document.getElementById('p-tipo-total').checked?'total':'parcela';
  const prev  = document.getElementById('p-preview');
  if (valor>0&&num>=1) {
    const parc  = tipo==='total'?valor/num:valor;
    const total = tipo==='total'?valor:valor*num;
    prev.innerHTML=`${num}x de ${fmt.brl(parc)} · Total: ${fmt.brl(total)}`;
    prev.classList.remove('hidden');
  } else prev.classList.add('hidden');
}
window.toggleParcela = async function(parcId, mesAno) {
  const lista = await DB.parceladas();
  const parc  = lista.find(p=>p.id===parcId);
  if (!parc) return;
  const mes = parc.parcelas.find(m=>m.mesAno===mesAno);
  if (mes) {
    mes.pago = !mes.pago;
    await DB.saveParcelas(lista);
    await renderParceladas();
    await renderDashboard();
    toast(mes.pago?'Parcela paga ✅':'Parcela desmarcada.','info');
  }
};
window.deletarParcelada = async function(id) {
  if (!confirm('Remover este parcelamento?')) return;
  const list = await DB.parceladas();
  await DB.saveParcelas(list.filter(p=>p.id!==id));
  await renderParceladas();
  await renderDashboard();
};

function initFuturas() {
  setupMoneyInput('f-valor');
  document.getElementById('btn-add-fut').addEventListener('click', async () => {
    const nome  = document.getElementById('f-nome').value.trim();
    const valor = parseMoney('f-valor');
    const data  = pickers.fData?.getValue()||'';
    const obs   = document.getElementById('f-obs').value.trim();
    if (!nome||valor<=0||!data) { toast('Preencha os campos obrigatórios.','error'); return; }
    if (data<fmt.hoje()) { toast('A data não pode ser no passado.','error'); return; }
    const list = await DB.futuras();
    list.unshift({id:fmt.uid(),nome,valorEstimado:valor,data,obs});
    await DB.saveFuturas(list);
    document.getElementById('f-nome').value='';
    document.getElementById('f-valor').value='';
    document.getElementById('f-obs').value='';
    const amanha=new Date();amanha.setDate(amanha.getDate()+1);
    pickers.fData?.setValue(amanha.toISOString().split('T')[0]);
    await renderFuturas();
    await renderDashboard();
    toast('Compra planejada! 🛍️');
  });
}
window.deletarFutura = async function(id) {
  if (!confirm('Remover?')) return;
  const list = await DB.futuras();
  await DB.saveFuturas(list.filter(f=>f.id!==id));
  await renderFuturas();
  await renderDashboard();
};
window.toggleRealizarForm = function(id) {
  const existing=document.getElementById(`rf-${id}`);
  if (existing) { existing.remove(); return; }
  const row=document.querySelector(`[data-futura-id="${id}"]`);
  if (!row) return;
  const form=document.createElement('div');
  form.id=`rf-${id}`; form.className='realizar-form';
  form.innerHTML=`
    <select id="rf-cat-${id}">
      <option value="">Categoria</option>
      <option value="Alimentação">🍔 Alimentação</option>
      <option value="Transporte">🚗 Transporte</option>
      <option value="Lazer">🎮 Lazer</option>
      <option value="Contas">💡 Contas</option>
      <option value="Saúde">🏥 Saúde</option>
      <option value="Educação">📚 Educação</option>
      <option value="Beleza">💅 Beleza</option>
      <option value="Outros">📦 Outros</option>
    </select>
    <input type="date" id="rf-data-${id}" value="${fmt.hoje()}" max="${fmt.hoje()}"/>
    <button class="qa-btn" onclick="confirmarRealizacao('${id}')">Confirmar</button>
    <button class="qa-btn" style="background:var(--surf3);color:var(--txt2)" onclick="this.closest('.realizar-form').remove()">Cancelar</button>
  `;
  row.insertAdjacentElement('afterend', form);
};
window.confirmarRealizacao = async function(id) {
  const cat  = document.getElementById(`rf-cat-${id}`)?.value;
  const data = document.getElementById(`rf-data-${id}`)?.value;
  const futuras = await DB.futuras();
  const f = futuras.find(x=>x.id===id);
  if (!f) return;
  if (!cat) { toast('Selecione uma categoria.','error'); return; }
  const gastos = await DB.gastos();
  gastos.unshift({id:fmt.uid(),nome:f.nome,valor:f.valorEstimado,categoria:cat,data:data||fmt.hoje()});
  await DB.saveGastos(gastos);
  await DB.saveFuturas(futuras.filter(x=>x.id!==id));
  await renderFuturas();
  await renderDashboard();
  toast(`${f.nome} realizado e registrado! ✅`);
};

function initRecorrentes() {
  setupMoneyInput('rc-valor');
  document.getElementById('btn-add-rec').addEventListener('click', async () => {
    const nome  = document.getElementById('rc-nome').value.trim();
    const valor = parseMoney('rc-valor');
    const freq  = document.getElementById('rc-freq').value;
    const data  = pickers.rcData?.getValue()||'';
    if (!nome||valor<=0||!freq||!data) { toast('Preencha todos os campos.','error'); return; }
    const list = await DB.recorrentes();
    list.unshift({id:fmt.uid(),nome,valor,frequencia:freq,proximaData:data,ultimoGastoId:null});
    await DB.saveRecorr(list);
    document.getElementById('rc-nome').value='';
    document.getElementById('rc-valor').value='';
    document.getElementById('rc-freq').value='';
    pickers.rcData?.setValue(fmt.hoje());
    await renderRecorrentes();
    await renderDashboard();
    toast('Recorrente adicionada! 🔄');
  });
}
window.pagarRecorrente = async function(id) {
  const list = await DB.recorrentes();
  const rec  = list.find(r=>r.id===id);
  if (!rec) return;

  const gastoId = fmt.uid();
  const gastos  = await DB.gastos();
  gastos.unshift({id:gastoId,nome:rec.nome,valor:rec.valor,categoria:'Contas',data:rec.proximaData});
  await DB.saveGastos(gastos);

  rec.ultimoGastoId = gastoId;
  if (rec.frequencia==='mensal') {
    rec.proximaData = fmt.avancaMes(rec.proximaData);
  } else {
    const dias={semanal:7,quinzenal:15}[rec.frequencia]||7;
    const nova=new Date(rec.proximaData+'T12:00:00');
    nova.setDate(nova.getDate()+dias);
    rec.proximaData=nova.toISOString().split('T')[0];
  }
  await DB.saveRecorr(list);
  await renderRecorrentes();
  await renderDashboard();
  toast(`${rec.nome} pago! Próximo: ${fmt.date(rec.proximaData)} ✅`);
};
window.desfazerRecorrente = async function(id) {
  if (!confirm('Desfazer último pagamento?')) return;
  const list = await DB.recorrentes();
  const rec  = list.find(r=>r.id===id);
  if (!rec) return;

  if (rec.ultimoGastoId) {
    const gastos = await DB.gastos();
    await DB.saveGastos(gastos.filter(g=>g.id!==rec.ultimoGastoId));
    rec.ultimoGastoId = null;
  }
  if (rec.frequencia==='mensal') {
    rec.proximaData = fmt.voltaMes(rec.proximaData);
  } else {
    const dias={semanal:7,quinzenal:15}[rec.frequencia]||7;
    const ant=new Date(rec.proximaData+'T12:00:00');
    ant.setDate(ant.getDate()-dias);
    rec.proximaData=ant.toISOString().split('T')[0];
  }
  await DB.saveRecorr(list);
  await renderRecorrentes();
  await renderDashboard();
  await renderHistorico();
  toast('Pagamento desfeito e gasto removido.','info');
};
window.deletarRecorrente = async function(id) {
  if (!confirm('Remover esta recorrente?')) return;
  const list = await DB.recorrentes();
  await DB.saveRecorr(list.filter(r=>r.id!==id));
  await renderRecorrentes();
  await renderDashboard();
};

function initHistorico() {
  document.getElementById('h-cat-filter').addEventListener('change', ()=>renderHistorico().catch(console.error));
  document.getElementById('btn-limpar').addEventListener('click', async () => {
    if (!confirm('Apagar TODOS os gastos?')) return;
    await DB.saveGastos([]);
    await renderDashboard();
    await renderHistorico();
    toast('Gastos removidos.','info');
  });
}

async function renderDashboard() {
  const [gastos, parc, rec, futuras, rendas] = await Promise.all([
    DB.gastos(), DB.parceladas(), DB.recorrentes(), DB.futuras(), DB.rendas()
  ]);

  const s = calcSaldosSync(gastos, parc, rec, futuras, rendas);

  const dispEl = document.getElementById('val-disponivel');
  dispEl.textContent = fmt.brl(s.disponivel);
  dispEl.style.color = s.disponivel<0?'var(--red)':'';
  document.getElementById('val-previsto').textContent = fmt.brl(s.totalARec);
  document.getElementById('val-saidas-mes').textContent = fmt.brl(s.totalSaidas);
  const proxEl = document.getElementById('val-proximo-mes');
  proxEl.textContent = fmt.brl(s.proximoMes);
  proxEl.style.color = s.proximoMes<0?'var(--red)':'';

  renderBoxEntradasMes(s, rendas);
  renderBoxSaidasMes(s.mesAtu, rec, parc, futuras);
  renderBoxParcelados(parc);
  renderPieChart(gastos);

  const recBox = document.getElementById('list-recent-gastos');
  recBox.innerHTML='';
  if (gastos.length===0) recBox.innerHTML='<p class="empty-msg">Nenhum gasto registrado.</p>';
  else gastos.slice(0,5).forEach(g=>recBox.appendChild(buildGastoItem(g)));
}

function renderBoxEntradasMes(s, rendas) {
  const box  = document.getElementById('list-entradas-mes');
  box.innerHTML = '';
  const hoje = fmt.hoje();
  const todasDoMes = todasEntradasSync(rendas, s.mesAtu+'-31').filter(e=>e.data.startsWith(s.mesAtu));
  const sorted = [...todasDoMes].sort((a,b)=>a.data.localeCompare(b.data));
  if (sorted.length===0) { box.innerHTML='<p class="empty-msg">Nenhuma entrada este mês.</p>'; return; }
  sorted.forEach(e=>{
    const recebido = e.data<=hoje;
    const row = document.createElement('div'); row.className='item-row';
    row.innerHTML=`
      <div class="item-icon">${recebido?'💚':'⏳'}</div>
      <div class="item-body">
        <div class="item-name">${fmt.esc(e.nome)}</div>
        <div class="item-meta">${fmt.date(e.data)}</div>
      </div>
      <span class="badge ${recebido?'badge-green':'badge-blue'}">${recebido?'Recebido':'A receber'}</span>
      <div class="item-val pos">+ ${fmt.brl(e.valor)}</div>
    `;
    box.appendChild(row);
  });
}

function renderBoxSaidasMes(mesAtu, rec, parc, futuras) {
  const box  = document.getElementById('list-saidas-futuras');
  box.innerHTML = '';
  const seen = new Set(), itens = [];

  rec.forEach(r=>{
    const key=`rec_${r.id}`;
    if (r.proximaData.startsWith(mesAtu)&&!seen.has(key)) {
      seen.add(key);
      itens.push({icon:'🔄',nome:r.nome,data:r.proximaData,valor:r.valor});
    }
  });
  parc.forEach(p=>{
    const parMes = p.parcelas.find(x=>x.mesAno===mesAtu&&!x.pago);
    if (parMes) {
      const key=`parc_${p.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        const diaF = parMes.diaVenc||1;
        itens.push({icon:'💳',nome:`${p.nome} (${parMes.num}/${p.numParcelas})`,data:mesAtu+'-'+String(diaF).padStart(2,'0'),valor:parMes.valorParcela});
      }
    }
  });
  futuras.forEach(f=>{
    const key=`fut_${f.id}`;
    if (f.data.startsWith(mesAtu)&&!seen.has(key)) {
      seen.add(key);
      itens.push({icon:'🛍️',nome:f.nome,data:f.data,valor:f.valorEstimado});
    }
  });

  if (itens.length===0) { box.innerHTML='<p class="empty-msg">Nenhuma saída este mês.</p>'; return; }
  itens.sort((a,b)=>a.data.localeCompare(b.data)).forEach(item=>{
    const row=document.createElement('div'); row.className='item-row';
    row.innerHTML=`
      <div class="item-icon">${item.icon}</div>
      <div class="item-body">
        <div class="item-name">${fmt.esc(item.nome)}</div>
        <div class="item-meta">${fmt.date(item.data)}</div>
      </div>
      <div class="item-val neg">− ${fmt.brl(item.valor)}</div>
    `;
    box.appendChild(row);
  });
}

function renderBoxParcelados(lista) {
  const box = document.getElementById('list-parcelados-dash');
  box.innerHTML = '';
  if (lista.length===0) { box.innerHTML='<p class="empty-msg">Nenhum parcelamento.</p>'; return; }
  const mesAtu = fmt.mesAtual();
  lista.slice(0,5).forEach(p=>{
    const pagas   = p.parcelas.filter(x=>x.pago).length;
    const pct     = Math.round((pagas/p.numParcelas)*100);
    const rest    = p.numParcelas-pagas;
    const parcMes = p.parcelas.find(x=>x.mesAno===mesAtu);
    const diaStr  = p.diaVenc?` · dia ${p.diaVenc}`:'';
    const div=document.createElement('div'); div.className='parc-dash-item';
    div.innerHTML=`
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
        <span class="parc-dash-nome" onclick="toggleParcela('${p.id}','${mesAtu}')" title="Clique para marcar/desmarcar este mês">
          ${fmt.esc(p.nome)}
          ${parcMes?.pago?'<span class="badge badge-green" style="margin-left:5px;font-size:.59rem">✓ pago</span>':''}
        </span>
        <span style="font-size:.78rem;font-weight:800;color:var(--red)">${fmt.brl(p.valorParcela)}/mês${diaStr}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <div style="flex:1;height:3.5px;background:var(--surf3);border-radius:99px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,var(--p6),var(--p4));border-radius:99px;transition:width .5s"></div>
        </div>
        <span style="font-size:.64rem;color:var(--txt3);white-space:nowrap">${pagas}/${p.numParcelas}</span>
      </div>
    `;
    box.appendChild(div);
  });
}

function renderPieChart(gastos) {
  const ctx   = document.getElementById('pie-chart');
  const empty = document.getElementById('chart-empty');
  const leg   = document.getElementById('cat-legend');
  if (!gastos||gastos.length===0) {
    empty.style.display='block'; ctx.style.display='none'; leg.innerHTML='';
    if (pieChart) { pieChart.destroy(); pieChart=null; } return;
  }
  empty.style.display='none'; ctx.style.display='block';

  const totals={}, gastosPerCat={};
  gastos.forEach(g=>{
    const cat = g.categoria==='cartao' ? 'cartao' : g.categoria;
    totals[cat]=(totals[cat]||0)+g.valor;
    if (!gastosPerCat[cat]) gastosPerCat[cat]=[];
    gastosPerCat[cat].push(g);
  });

  const total  = Object.values(totals).reduce((a,b)=>a+b,0);
  const labels = Object.keys(totals);
  const data   = Object.values(totals);
  const cores  = labels.map(l=>CAT_COLORS[l]||'#9ca3af');
  const isDark = document.documentElement.getAttribute('data-theme')!=='light';
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type:'doughnut',
    data:{labels,datasets:[{data,backgroundColor:cores,borderColor:isDark?'#1c1930':'#ffffff',borderWidth:3,hoverOffset:10}]},
    options:{
      responsive:true,cutout:'65%',
      plugins:{
        legend:{display:false},
        tooltip:{
          callbacks:{
            title:items=>{const c=items[0].label;return`${CAT_EMOJIS[c]||'📦'} ${c==='cartao'?'Cartão de Crédito':c}`;},
            label:ctx=>{
              const cat=ctx.label,val=ctx.raw;
              const itens=(gastosPerCat[cat]||[]).slice(0,3);
              const linhas=[`  Total: ${fmt.brl(val)}`];
              if (cat==='cartao') {
                // Subdividir por subcategoria no tooltip
                const subTotals={};
                (gastosPerCat[cat]||[]).forEach(g=>{ subTotals[g.subcategoria||'Outros']=(subTotals[g.subcategoria||'Outros']||0)+g.valor; });
                linhas.push('  ─────────');
                Object.entries(subTotals).sort((a,b)=>b[1]-a[1]).forEach(([sub,v])=>{
                  linhas.push(`  ${CAT_EMOJIS[sub]||'📦'} ${sub}: ${fmt.brl(v)}`);
                });
              } else {
                if (itens.length){linhas.push('  ─────────');itens.forEach(g=>linhas.push(`  • ${g.nome}: ${fmt.brl(g.valor)}`));}
                if ((gastosPerCat[cat]||[]).length>3) linhas.push(`  + mais ${(gastosPerCat[cat]||[]).length-3}...`);
              }
              return linhas;
            },
          },
          backgroundColor:isDark?'#24213d':'#fff',
          titleColor:isDark?'#edeaff':'#1a1630',
          bodyColor:isDark?'#a49fc2':'#4a4470',
          borderColor:isDark?'#3a3560':'#ddd6fe',
          borderWidth:1,padding:12,cornerRadius:10,boxPadding:4,
        }
      },
      animation:{animateRotate:true,duration:650}
    }
  });

  // Legend — cartão expande subcategorias
  leg.innerHTML='';
  Object.entries(totals).sort((a,b)=>b[1]-a[1]).forEach(([cat,val])=>{
    const pct=(total>0?(val/total*100).toFixed(0):0);
    const color=CAT_COLORS[cat]||'#9ca3af';
    const label=cat==='cartao'?'💳 Cartão de Crédito':`${CAT_EMOJIS[cat]||'📦'} ${cat}`;
    const div=document.createElement('div'); div.className='cat-row';
    div.innerHTML=`
      <div class="cat-dot" style="background:${color}"></div>
      <div class="cat-info">
        <div class="cat-name-row"><span>${label}</span><span>${fmt.brl(val)} (${pct}%)</span></div>
        <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      </div>`;
    leg.appendChild(div);

    // Se for cartão, adicionar linhas de subcategoria abaixo
    if (cat==='cartao') {
      const subTotals={};
      (gastosPerCat[cat]||[]).forEach(g=>{ subTotals[g.subcategoria||'Outros']=(subTotals[g.subcategoria||'Outros']||0)+g.valor; });
      Object.entries(subTotals).sort((a,b)=>b[1]-a[1]).forEach(([sub,sv])=>{
        const subPct=(val>0?(sv/val*100).toFixed(0):0);
        const subDiv=document.createElement('div'); subDiv.className='cat-row cat-row-sub';
        subDiv.innerHTML=`
          <div class="cat-dot" style="background:${CAT_COLORS[sub]||'#9ca3af'};opacity:.6;width:8px;height:8px;margin-left:18px"></div>
          <div class="cat-info">
            <div class="cat-name-row" style="font-size:.8rem;opacity:.8">
              <span>${CAT_EMOJIS[sub]||'📦'} ${sub}</span>
              <span>${fmt.brl(sv)} (${subPct}%)</span>
            </div>
          </div>`;
        leg.appendChild(subDiv);
      });
    }
  });
}

async function renderRendas() {
  const box   = document.getElementById('list-rendas');
  const hoje  = fmt.hoje();
  box.innerHTML = '';
  const rendas = await DB.rendas();
  if (rendas.length===0) { box.innerHTML='<p class="empty-msg">Nenhuma renda cadastrada.</p>'; return; }
  rendas.forEach(r=>{
    const row = document.createElement('div'); row.className='item-row';
    const recebido = r.tipo==='pontual'&&r.data<=hoje;
    const futuro   = r.tipo==='pontual'&&r.data>hoje;
    if (r.tipo==='pontual') {
      row.innerHTML=`
        <div class="item-icon">${recebido?'💚':'⏳'}</div>
        <div class="item-body"><div class="item-name">${fmt.esc(r.nome)}</div><div class="item-meta">${fmt.dateLong(r.data)}</div></div>
        ${futuro?`<button class="btn-antecipar" onclick="receberAntecipado('${r.id}','${fmt.esc(r.nome)}',${r.valor})">Receber agora</button>`:''}
        <span class="badge ${recebido?'badge-green':'badge-blue'}">${recebido?'Recebido':'A receber'}</span>
        <div class="item-val pos">+ ${fmt.brl(r.valor)}</div>
        <button class="btn-del" onclick="deletarRenda('${r.id}')">🗑️</button>
      `;
    } else {
      row.innerHTML=`
        <div class="item-icon">🔁</div>
        <div class="item-body"><div class="item-name">${fmt.esc(r.nome)}</div><div class="item-meta">Dia ${r.diaMes} · desde ${r.mesInicio}${r.mesFim?` até ${r.mesFim}`:' (indeterminado)'}</div></div>
        <span class="badge badge-purple">Regular</span>
        <div class="item-val pos">+ ${fmt.brl(r.valor)}/mês</div>
        <button class="btn-del" onclick="deletarRenda('${r.id}')">🗑️</button>
      `;
    }
    box.appendChild(row);
  });
}

async function renderParceladas() {
  const box = document.getElementById('list-parceladas');
  box.innerHTML = '';
  const lista = await DB.parceladas();
  if (lista.length===0) { box.innerHTML='<p class="empty-msg">Nenhum parcelamento ativo.</p>'; return; }
  lista.forEach(p=>{
    const pagas = p.parcelas.filter(x=>x.pago).length;
    const pct   = Math.round((pagas/p.numParcelas)*100);
    const concl = pagas===p.numParcelas;
    const diaStr= p.diaVenc?` · Dia ${p.diaVenc}`:'';
    const btns  = p.parcelas.map(parc=>{
      const[y,m]=parc.mesAno.split('-');
      const lab=`${m}/${y.slice(2)}`;
      const tip=parc.pago?'Desmarcar':'Marcar pago';
      return`<button class="parc-mes-btn ${parc.pago?'pago':''}" onclick="toggleParcela('${p.id}','${parc.mesAno}')" data-tip="${tip}">${lab}</button>`;
    }).join('');
    const card=document.createElement('div'); card.className='parc-card';
    card.innerHTML=`
      <div class="parc-top">
        <span class="item-icon">💳</span>
        <div style="flex:1;min-width:0">
          <div class="parc-title" onclick="toggleParcela('${p.id}','${fmt.mesAtual()}')" title="Marcar/desmarcar mês atual">${fmt.esc(p.nome)}</div>
          <div style="font-size:.64rem;color:var(--txt3)">${p.numParcelas}x · ${fmt.brl(p.valorTotal)} total${diaStr}</div>
        </div>
        <span class="parc-val">${fmt.brl(p.valorParcela)}/mês</span>
        ${concl?'<span class="badge badge-green">Quitado</span>':''}
        <button class="btn-del" onclick="deletarParcelada('${p.id}')">🗑️</button>
      </div>
      <div class="parc-bar-bg"><div class="parc-bar-fill" style="width:${pct}%"></div></div>
      <div class="parc-meta"><span>${pagas} paga${pagas!==1?'s':''}</span><span>${p.numParcelas-pagas} restante${p.numParcelas-pagas!==1?'s':''}</span></div>
      <div class="parc-parcelas-list">${btns}</div>
    `;
    box.appendChild(card);
  });
}

async function renderFuturas() {
  const box  = document.getElementById('list-futuras');
  box.innerHTML = '';
  const lista = [...(await DB.futuras())].sort((a,b)=>a.data.localeCompare(b.data));
  if (lista.length===0) { box.innerHTML='<p class="empty-msg">Nenhuma compra planejada ✨</p>'; return; }
  lista.forEach(f=>{
    const diff = Math.ceil((new Date(f.data+'T12:00:00')-new Date())/86400000);
    const urgLabel = diff<=0?'Hoje!':diff===1?'Amanhã':`em ${diff} dias`;
    const wrap=document.createElement('div');
    wrap.setAttribute('data-futura-id', f.id);
    const row=document.createElement('div'); row.className='item-row';
    row.innerHTML=`
      <div class="item-icon">🛍️</div>
      <div class="item-body"><div class="item-name">${fmt.esc(f.nome)}</div><div class="item-meta">${fmt.dateLong(f.data)}${f.obs?' · '+fmt.esc(f.obs):''}</div></div>
      <span class="badge badge-blue">${urgLabel}</span>
      <div class="item-val neg">~ ${fmt.brl(f.valorEstimado)}</div>
      <button class="btn-realizar" onclick="toggleRealizarForm('${f.id}')">Realizar</button>
      <button class="btn-del" onclick="deletarFutura('${f.id}')">🗑️</button>
    `;
    wrap.appendChild(row);
    box.appendChild(wrap);
  });
}

async function renderRecorrentes() {
  const all = await DB.recorrentes();
  const mensais  = all.filter(r=>r.frequencia==='mensal');
  const semanais = all.filter(r=>r.frequencia==='semanal');
  const quinzs   = all.filter(r=>r.frequencia==='quinzenal');
  document.getElementById('rec-tot-mensal').textContent   = `${fmt.brl(mensais.reduce((a,r)=>a+r.valor,0))}/mês`;
  document.getElementById('rec-tot-semanal').textContent  = `${fmt.brl(semanais.reduce((a,r)=>a+r.valor,0))}/sem`;
  document.getElementById('rec-tot-quinzenal').textContent= `${fmt.brl(quinzs.reduce((a,r)=>a+r.valor,0))}/qnz`;
  renderRecLista('rec-list-mensal',   mensais,  'Nenhuma mensal.');
  renderRecLista('rec-list-semanal',  semanais, 'Nenhuma semanal.');
  renderRecLista('rec-list-quinzenal',quinzs,   'Nenhuma quinzenal.');
}

function renderRecLista(boxId, lista, emptyTxt) {
  const box = document.getElementById(boxId);
  box.innerHTML = '';
  if (lista.length===0) { box.innerHTML=`<p class="empty-msg">${emptyTxt}</p>`; return; }
  const sorted = [...lista].sort((a,b)=>a.proximaData.localeCompare(b.proximaData));
  sorted.forEach(r=>{
    const diff = Math.ceil((new Date(r.proximaData+'T12:00:00')-new Date())/86400000);
    const urgente = diff<=3;
    const freqLabel = {semanal:'Semanal',quinzenal:'Quinzenal',mensal:'Mensal'}[r.frequencia]||r.frequencia;
    const row=document.createElement('div'); row.className='item-row';
    row.innerHTML=`
      <div class="item-icon">🔄</div>
      <div class="item-body">
        <div class="item-name">${fmt.esc(r.nome)} <span style="font-size:.62rem;color:var(--txt3);font-weight:400">${freqLabel}</span></div>
        <div class="item-meta" style="${urgente?'color:var(--red)':''}">
          ${diff<=0?'⚠️ Vencida':diff===1?'⚠️ Amanhã':fmt.date(r.proximaData)}
        </div>
      </div>
      <div class="item-val neg">${fmt.brl(r.valor)}</div>
      <button class="btn-del" style="color:var(--green);font-size:1rem" title="Marcar pago" onclick="pagarRecorrente('${r.id}')">✓</button>
      <button class="btn-del" style="color:var(--yellow)" title="Desfazer último pagamento" onclick="desfazerRecorrente('${r.id}')">↩</button>
      <button class="btn-del" onclick="deletarRecorrente('${r.id}')">🗑️</button>
    `;
    box.appendChild(row);
  });
}

async function renderHistorico() {
  const filter = document.getElementById('h-cat-filter').value;
  let gastos   = await DB.gastos();
  if (filter) gastos = gastos.filter(g=>g.categoria===filter);
  const box = document.getElementById('list-historico');
  box.innerHTML = '';
  if (gastos.length===0) box.innerHTML='<p class="empty-msg">Nenhum gasto.</p>';
  else gastos.forEach(g=>box.appendChild(buildGastoItem(g)));

  const hoje   = fmt.hoje();
  const rendas = await DB.rendas();
  const recebidos = [];
  rendas.forEach(r=>{
    if (r.tipo==='pontual'&&r.data<=hoje) recebidos.push({nome:r.nome,valor:r.valor,data:r.data});
    else if (r.tipo==='regular') gerarOcorrencias(r,hoje).forEach(o=>recebidos.push({nome:o.nome,valor:o.valor,data:o.data}));
  });
  recebidos.sort((a,b)=>b.data.localeCompare(a.data));
  const boxR = document.getElementById('list-recebidos');
  boxR.innerHTML = '';
  if (recebidos.length===0) boxR.innerHTML='<p class="empty-msg">Nenhum valor recebido ainda.</p>';
  else recebidos.forEach(r=>{
    const row=document.createElement('div'); row.className='item-row';
    row.innerHTML=`
      <div class="item-icon">💚</div>
      <div class="item-body"><div class="item-name">${fmt.esc(r.nome)}</div><div class="item-meta">${fmt.dateLong(r.data)}</div></div>
      <div class="item-val pos">+ ${fmt.brl(r.valor)}</div>
    `;
    boxR.appendChild(row);
  });
}

function buildGastoItem(g) {
  const isCartao = g.categoria === 'cartao';
  const icon     = isCartao ? '💳' : (CAT_EMOJIS[g.categoria]||'📦');
  const badgeTxt = isCartao
    ? `💳 Cartão${g.subcategoria ? ' · '+g.subcategoria : ''}`
    : g.categoria;
  const badgeCls = isCartao ? 'badge badge-cartao' : 'badge badge-purple';
  const meta     = isCartao
    ? `${fmt.dateLong(g.data)} <span style="color:var(--p4);font-size:.75rem">• sai no próximo mês</span>`
    : fmt.dateLong(g.data);

  const div = document.createElement('div'); div.className='item-row';
  div.innerHTML=`
    <div class="item-icon">${icon}</div>
    <div class="item-body"><div class="item-name">${fmt.esc(g.nome)}</div><div class="item-meta">${meta}</div></div>
    <span class="${badgeCls}">${fmt.esc(badgeTxt)}</span>
    <div class="item-val neg">− ${fmt.brl(g.valor)}</div>
    <button class="btn-del" title="Excluir">🗑️</button>
  `;
  div.querySelector('.btn-del').addEventListener('click', ()=>window.deletarGasto(g.id));
  return div;
}

async function renderAll() {
  await renderDashboard();
}


document.addEventListener('DOMContentLoaded', () => {

  initSupabase()
    .catch(err => {
      console.error("Erro Supabase:", err);
    })
    .finally(async () => {

      try {

        initTheme();
        initAuth();
        initNav();
        initModals();
        initMiniTabs();
        initGastos();
        initRendas();
        initParceladas();
        initFuturas();
        initRecorrentes();
        initHistorico();

        if (!_supa) {
          console.warn("⚠️ Supabase não carregou");
          showLoginScreen();
          return;
        }

        const sess = DB.session();

        if (sess) {
          try {

            const u = await Promise.race([
              DB.findUserByUsername(sess.username),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout usuário")), 4000)
              )
            ]);

            if (u) {
              await openApp(u);
            } else {
              DB.clearSession();
              showLoginScreen();
            }

          } catch (e) {
            console.error('Erro ao restaurar sessão:', e);
            DB.clearSession();
            showLoginScreen();
          }

        } else {
          showLoginScreen();
        }

      } catch (err) {
        console.error("Erro geral ao iniciar app:", err);
        showLoginScreen();
      }

      setTimeout(() => {
        document.getElementById('loading-overlay')?.classList.add('hidden');
      }, 100);

    });

});

function showLoginScreen() {
  document.getElementById('login-screen')?.classList.remove('hidden');
}