'use strict';

let _supa = null;

const _cache = {
  gastos: null,
  rendas: null,
  parceladas: null,
  futuras: null,
  recorrentes: null,
  invalidar() { this.gastos=null; this.rendas=null; this.parceladas=null; this.futuras=null; this.recorrentes=null; }
};

async function initSupabase() {
  try {
    const SUPABASE_URL = "https://wmyzhifyihcxuphkicwu.supabase.co";
    const SUPABASE_KEY = "sb_publishable_Jsofa9dlC_Pl9ZkdgvPGcA_7fAlfpTB";

    _supa = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: { session } } = await _supa.auth.getSession();

    if (session) {
      _userId = session.user.id; 
      console.log("✅ Sessão restaurada:", session.user.email);
    } else {
      console.log("ℹ️ Nenhuma sessão ativa");
    }

  } catch (err) {
    console.error("❌ Erro Supabase:", err);
    _supa = null;
  }
}
const CAT_ICONS = {
  'Alimentação':'utensils','Transporte':'car','Lazer':'gamepad-2',
  'Contas':'lightbulb','Saúde':'heart-pulse','Educação':'graduation-cap',
  'Beleza':'sparkles','Outros':'package','cartao':'credit-card',
};
const CAT_EMOJIS = CAT_ICONS; // legacy alias
const CAT_COLORS = {
  'Alimentação':'#FFC46B','Transporte':'#A9B2DE','Lazer':'#FF9CC7',
  'Contas':'#A076FF','Saúde':'#5EDDBD','Educação':'#7FB3FF',
  'Beleza':'#C9AFFF','Outros':'#8C92BC','cartao':'#A076FF',
};
function ic(name, size=16) {
  return `<i data-lucide="${name}" width="${size}" height="${size}"></i>`;
}
function lcIcons(el) { if (window.lucide) lucide.createIcons({el}); }
const MESES_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_PT  = ['D','S','T','Q','Q','S','S'];

let pieChart   = null;
let barChart   = null;
let currentUser= null;
let _userId    = null;
let clockTimer = null;

// Modo visitante: dados em memória — F5 reseta tudo
let _modoVisitante = false;
const _SESSION = {
  get gastos()      { return this._gastos      ??= DEMO_DATA.gastos.map(x=>({...x})); },
  get rendas()      { return this._rendas      ??= DEMO_DATA.rendas.map(x=>({...x})); },
  get parceladas()  { return this._parceladas  ??= DEMO_DATA.parceladas.map(x=>({...x})); },
  get futuras()     { return this._futuras     ??= DEMO_DATA.futuras.map(x=>({...x})); },
  get recorrentes() { return this._recorrentes ??= DEMO_DATA.recorrentes.map(x=>({...x})); },
  set gastos(v)      { this._gastos      = v; },
  set rendas(v)      { this._rendas      = v; },
  set parceladas(v)  { this._parceladas  = v; },
  set futuras(v)     { this._futuras     = v; },
  set recorrentes(v) { this._recorrentes = v; },
  diaVencCartao: null, jaEntrou: false,
};

const _hoje = () => new Date().toISOString().slice(0,10);
const _mesAtual = () => new Date().toISOString().slice(0,7);
const _mesOffset = (n) => { const d = new Date(); d.setMonth(d.getMonth()+n); return d.toISOString().slice(0,10); };

const DEMO_DATA = {
  gastos: [
    { id:'d1', nome:'iFood',        valor:45.90,  categoria:'Alimentação', subcategoria:'', data: _hoje() },
    { id:'d2', nome:'Uber',         valor:22.50,  categoria:'Transporte',  subcategoria:'', data: _hoje() },
    { id:'d3', nome:'Netflix',      valor:45.90,  categoria:'Lazer',       subcategoria:'', data: _hoje() },
    { id:'d4', nome:'Conta de Luz', valor:180.00, categoria:'Contas',      subcategoria:'', data: _hoje() },
    { id:'d5', nome:'Farmácia',     valor:67.30,  categoria:'Saúde',       subcategoria:'', data: _hoje() },
    { id:'d6', nome:'Curso Online', valor:97.00,  categoria:'Educação',    subcategoria:'', data: _hoje() },
  ],
  rendas: [
    { id:'r1', tipo:'regular', nome:'Salário',  valor:3500.00, diaMes:5,  mesInicio: _mesAtual(), tipoTermino:'indeterminado', mesFim:null, data:null },
    { id:'r2', tipo:'pontual', nome:'Freela',   valor:800.00,  data: _hoje(), diaMes:null, mesInicio:null, tipoTermino:null, mesFim:null },
  ],
  parceladas: [
    { id:'p1', nome:'Notebook',  valorTotal:3600.00, valorParcela:300.00, numParcelas:12, inicio: _mesAtual(), tipo:'total', diaVenc:10, parcelas:[false,false,false,false,false,false,false,false,false,false,false,false] },
    { id:'p2', nome:'Headphone', valorTotal:600.00,  valorParcela:100.00, numParcelas:6,  inicio: _mesAtual(), tipo:'total', diaVenc:15, parcelas:[false,false,false,false,false,false] },
  ],
  futuras: [
    { id:'f1', nome:'Viagem de férias', valorEstimado:2000.00, data: _mesOffset(2), obs:'Guardar todo mês' },
    { id:'f2', nome:'Tênis novo',       valorEstimado:450.00,  data: _mesOffset(1), obs:'' },
  ],
  recorrentes: [
    { id:'rc1', nome:'Spotify',  valor:21.90, frequencia:'mensal',    proximaData: _hoje(), ultimoGastoId:null },
    { id:'rc2', nome:'Academia', valor:99.90, frequencia:'mensal',    proximaData: _hoje(), ultimoGastoId:null },
    { id:'rc3', nome:'Água',     valor:55.00, frequencia:'quinzenal', proximaData: _hoje(), ultimoGastoId:null },
  ],
};

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
  theme:       () => 'auto',
  saveTheme:   v  => {},

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

async getDiaVencCartao() {
    try {
      if (_modoVisitante) return _SESSION.diaVencCartao;
      if (!_supa || !_userId) return null;
      const { data } = await _supa.from('users').select('dia_venc_cartao').eq('id', _userId).single();
      return data?.dia_venc_cartao || null;
    } catch { return null; }
  },

  async saveDiaVencCartao(dia) {
    try {
      if (_modoVisitante) { _SESSION.diaVencCartao = dia; return true; }
      if (!_supa || !_userId) return false;
      const { error } = await _supa.from('users').update({ dia_venc_cartao: dia }).eq('id', _userId);
      return !error;
    } catch { return false; }
  },
async getPrefs() {
    try {
      if (_modoVisitante) return { tema: 'auto', jaEntrou: _SESSION.jaEntrou };
      if (!_supa || !_userId) return { tema: 'auto', jaEntrou: false };
      const { data } = await _supa.from('users').select('tema, ja_entrou').eq('id', _userId).single();
      return { tema: data?.tema || 'auto', jaEntrou: !!data?.ja_entrou };
    } catch { return { tema: 'auto', jaEntrou: false }; }
  },

  async savePrefs(prefs) {
    try {
      if (_modoVisitante) { if ('ja_entrou' in prefs) _SESSION.jaEntrou = !!prefs.ja_entrou; return; }
      if (!_supa || !_userId) return;
      await _supa.from('users').update(prefs).eq('id', _userId);
    } catch {}
  },
  
  async getPerfil() {
    try {
      if (!_supa || !_userId) return null;
      const { data } = await _supa.from('perfis').select('nome, username, created_at, email, avatar_url').eq('id', _userId).single();
      return data;
    } catch { return null; }
  },

  async updatePerfil(fields) {
    try {
      if (!_supa || !_userId) return false;
      const { error } = await _supa.from('perfis').update(fields).eq('id', _userId);
      return !error;
    } catch { return false; }
  },

  async gastos() {
    try {
      if (_modoVisitante) return _SESSION.gastos;
      if (!_supa) return [];
      if (_cache.gastos) return _cache.gastos;
      const { data } = await _supa.from('gastos')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });
      _cache.gastos = (data||[]).map(_gastoFromDB);
      return _cache.gastos;
    } catch { return []; }
  },

  async uploadAvatar(file, userId) {
    try {
      if (!_supa) return null;
      const ext  = file.name.split('.').pop();
      const path = `${userId}/avatar.${ext}`;
      const { error } = await _supa.storage.from('avatars').upload(path, file, { upsert: true });
      if (error) { console.error('Erro upload:', error); return null; }
      const { data } = _supa.storage.from('avatars').getPublicUrl(path);
      return data.publicUrl + '?t=' + Date.now();
    } catch(e) { console.error(e); return null; }
  },

  async saveGastos(list) {
    try {
      if (_modoVisitante) { _SESSION.gastos = list; return; }
      if (!_supa) return;
      _cache.invalidar();
      const ids = list.map(g => g.id);
      if (ids.length > 0) {
        await _supa.from('gastos').delete().eq('user_id', _userId).not('id', 'in', `(${ids.join(',')})`);
      } else {
        await _supa.from('gastos').delete().eq('user_id', _userId);
      }
      if (list.length > 0) {
        const { error } = await _supa.from('gastos')
          .upsert(list.map((g,i) => ({ ..._gastoDB(g), user_id:_userId, ordem:i })),
            { onConflict: 'id' });
        if (error) console.error("❌ Erro saveGastos:", error);
      }
    } catch (err) {
      console.error("Erro saveGastos:", err);
    }
  },

  async rendas() {
    try {
      if (_modoVisitante) return _SESSION.rendas;
      if (!_supa) return [];
      if (_cache.rendas) return _cache.rendas;
      const { data } = await _supa.from('rendas')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });
      _cache.rendas = (data||[]).map(_rendaFromDB);
      return _cache.rendas;
    } catch { return []; }
  },

  async saveRendas(list) {
    try {
      if (_modoVisitante) { _SESSION.rendas = list; return; }
      if (!_supa) return;
      _cache.invalidar();
      const ids = list.map(r => r.id);
      if (ids.length > 0) {
        await _supa.from('rendas').delete().eq('user_id', _userId).not('id', 'in', `(${ids.join(',')})`);
      } else {
        await _supa.from('rendas').delete().eq('user_id', _userId);
      }
      if (list.length > 0) {
        const { error } = await _supa.from('rendas')
          .upsert(list.map((r,i) => ({ ..._rendaDB(r), user_id:_userId, ordem:i })),
            { onConflict: 'id' });
        if (error) console.error("❌ Erro saveRendas:", error);
      }
    } catch (err) {
      console.error("Erro saveRendas:", err);
    }
  },

  async parceladas() {
    try {
      if (_modoVisitante) return _SESSION.parceladas;
      if (!_supa) return [];
      if (_cache.parceladas) return _cache.parceladas;
      const { data } = await _supa.from('parceladas')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });
      _cache.parceladas = (data||[]).map(_parcFromDB);
      return _cache.parceladas;
    } catch { return []; }
  },

  async saveParceladas(list) {
    try {
      if (_modoVisitante) { _SESSION.parceladas = list; return; }
      if (!_supa) return;
      _cache.invalidar();
      const ids = list.map(p => p.id);
      if (ids.length > 0) {
        await _supa.from('parceladas').delete().eq('user_id', _userId).not('id', 'in', `(${ids.join(',')})`);
      } else {
        await _supa.from('parceladas').delete().eq('user_id', _userId);
      }
      if (list.length > 0) {
        const { error } = await _supa.from('parceladas')
          .upsert(list.map((p,i) => ({ ..._parcDB(p), user_id:_userId, ordem:i })),
            { onConflict: 'id' });
        if (error) console.error("❌ Erro saveParcelas:", error);
      }
    } catch (err) {
      console.error("Erro saveParcelas:", err);
    }
  },

  async futuras() {
    try {
      if (_modoVisitante) return _SESSION.futuras;
      if (!_supa) return [];
      if (_cache.futuras) return _cache.futuras;
      const { data } = await _supa.from('futuras')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });
      _cache.futuras = (data||[]).map(_futFromDB);
      return _cache.futuras;
    } catch { return []; }
  },

  async saveFuturas(list) {
    try {
      if (_modoVisitante) { _SESSION.futuras = list; return; }
      if (!_supa) return;
      _cache.invalidar();
      const ids = list.map(f => f.id);
      if (ids.length > 0) {
        await _supa.from('futuras').delete().eq('user_id', _userId).not('id', 'in', `(${ids.join(',')})`);
      } else {
        await _supa.from('futuras').delete().eq('user_id', _userId);
      }
      if (list.length > 0) {
        const { error } = await _supa.from('futuras')
          .upsert(list.map((f,i) => ({ ..._futDB(f), user_id:_userId, ordem:i })),
            { onConflict: 'id' });
        if (error) console.error("❌ Erro saveFuturas:", error);
      }
    } catch (err) {
      console.error("Erro saveFuturas:", err);
    }
  },

  async recorrentes() {
    try {
      if (_modoVisitante) return _SESSION.recorrentes;
      if (!_supa) return [];
      if (_cache.recorrentes) return _cache.recorrentes;
      const { data } = await _supa.from('recorrentes')
        .select('*')
        .eq('user_id', _userId)
        .order('ordem', { ascending:true });
      _cache.recorrentes = (data||[]).map(_recFromDB);
      return _cache.recorrentes;
    } catch { return []; }
  },

  async saveRecorrentes(list) {
    try {
      if (_modoVisitante) { _SESSION.recorrentes = list; return; }
      if (!_supa) return;
      _cache.invalidar();
      const ids = list.map(r => r.id);
      if (ids.length > 0) {
        await _supa.from('recorrentes').delete().eq('user_id', _userId).not('id', 'in', `(${ids.join(',')})`);
      } else {
        await _supa.from('recorrentes').delete().eq('user_id', _userId);
      }
      if (list.length > 0) {
        const { error } = await _supa.from('recorrentes')
          .upsert(list.map((r,i) => ({ ..._recDB(r), user_id:_userId, ordem:i })),
            { onConflict: 'id' });
        if (error) console.error("❌ Erro saveRecorr:", error);
      }
    } catch (err) {
      console.error("Erro saveRecorr:", err);
    }
  },
};

async function login(username, password) {
  try {
    if (!_supa) return null;

    // Busca o e-mail pelo username na tabela perfis
    const { data: perfil, error: perfilError } = await _supa
      .from('perfis')
      .select('email, nome, username')
      .eq('username', username)
      .single();

    if (perfilError || !perfil) return null;

    // Faz o login com o e-mail encontrado
    const { data, error } = await _supa.auth.signInWithPassword({
      email: perfil.email,
      password
    });

    if (error || !data.user) return null;

    _userId = data.user.id;

    return { id: _userId, nome: perfil.nome, username: perfil.username };

  } catch (err) {
    console.error("Erro login:", err);
    return null;
  }
}

async function cadastrar(nome, username, email, password) {
  try {
    if (!_supa) return null;

    // Cria o usuário no Supabase Auth (senha fica criptografada)
    const { data, error } = await _supa.auth.signUp({ email, password });

    if (error || !data.user) {
      console.error("Erro signUp:", error);
      return null;
    }

    _userId = data.user.id;

    // Salva nome e username na tabela perfis
    const { error: perfilError } = await _supa
      .from('perfis')
      .insert({ id: _userId, nome, username, email });

    if (perfilError) {
      console.error("Erro ao criar perfil:", perfilError);
      return null;
    }

    return { id: _userId, nome, username };

  } catch (err) {
    console.error("Erro cadastrar:", err);
    return null;
  }
}

const fmt = {
  brl:      v  => Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),
  date:     s  => { if(!s)return''; const[y,m,d]=s.split('-'); return`${d}/${m}/${y}`; },
  dateLong: s  => { if(!s)return''; return new Date(s+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'}); },
  hora:     () => new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}),
  dataCurta:() => new Date().toLocaleDateString('pt-BR',{weekday:'short',day:'2-digit',month:'short'}),
  hoje:     () => new Date().toISOString().split('T')[0],
  mesAtual: () => { const d=new Date(); return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
  mesOffset:n  => { const d=new Date(); d.setDate(1); d.setMonth(d.getMonth()+n); return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; },
  parseMes: s  => { const[y,m]=(s||'').split('-').map(Number); return{ano:y,mes0:m-1}; },
  uid:      () => Date.now().toString(36)+Math.random().toString(36).slice(2,6),
  esc:      s  => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'),
  saudacao: n  => { const h=new Date().getHours(); const g=h<12?'Bom dia':h<18?'Boa tarde':'Boa noite'; return`${g}, ${n}!`; },

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
      this.display.innerHTML = `${fmt.date(this.current)} <span class="dp-cal-icon">${ic('calendar',14)}</span>`;
    } else {
      this.display.innerHTML = `<span class="dp-placeholder">Selecione a data</span> <span class="dp-cal-icon">${ic('calendar',14)}</span>`;
    }
    lcIcons(this.display);
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
  destroy() {
    if (!this.input) return;
    const wrap = this.input.closest('.dp-wrap');
    if (wrap) {
      wrap.parentNode.insertBefore(this.input, wrap);
      wrap.remove();
    }
    this.input = null;
  }
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
  const icons={success:ic('check-circle',15),error:ic('x-circle',15),info:ic('info',15)};
  el.className=`toast toast-${type}`;
  el.classList.remove('hidden','leaving');
  const iconEl=document.getElementById('toast-icon');
  iconEl.innerHTML=icons[type]||ic('message-circle',15);
  lcIcons(iconEl);
  document.getElementById('toast-msg').textContent=msg;
  clearTimeout(_toastT);
  _toastT=setTimeout(()=>{ el.classList.add('leaving'); setTimeout(()=>el.classList.add('hidden'),220); },ms);
}

function applyTheme(t) {
  const html=document.documentElement;
  let real=t;
  if(t==='auto') real=window.matchMedia('(prefers-color-scheme:light)').matches?'light':'dark';
  const apply=()=>html.setAttribute('data-theme',real);
  if(document.startViewTransition){
    document.startViewTransition(apply);
  } else {
    html.classList.add('theme-anim');
    apply();
    setTimeout(()=>html.classList.remove('theme-anim'),220);
  }
  const toggle=document.getElementById('theme-toggle');
  if(toggle) toggle.checked=(real==='light');
  document.querySelectorAll('[data-theme-btn]').forEach(btn=>{
    btn.classList.toggle('on', btn.dataset.themeBtn===real);
  });
  // sincroniza ícone do botão mini
  const miniBtn=document.getElementById('btn-mini-theme');
  if(miniBtn){
    miniBtn.innerHTML=ic(real==='light'?'sun':'moon',17);
    miniBtn.classList.remove('anim');
    void miniBtn.offsetWidth; // força reflow para reiniciar animação
    miniBtn.classList.add('anim');
    lcIcons(miniBtn);
    setTimeout(()=>miniBtn.classList.remove('anim'),400);
  }
  DB.saveTheme(t);
  if(document.getElementById('view-dashboard')?.classList.contains('on')) renderDashboard();
}
function initMiniThemeBtn() {
  document.getElementById('btn-mini-theme')?.addEventListener('click',async()=>{
    const cur=document.documentElement.getAttribute('data-theme')||'dark';
    const next=cur==='dark'?'light':'dark';
    applyTheme(next);
    await DB.savePrefs({tema:next});
  });
}
function initTheme() {
  applyTheme(DB.theme());
  document.querySelectorAll('[data-theme-btn]').forEach(btn=>{
    btn.addEventListener('click', async ()=>{
      const novoTema=btn.dataset.themeBtn;
      applyTheme(novoTema);
      await DB.savePrefs({ tema: novoTema });
    });
  });
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
  const titleEl  = document.querySelector('#tab-login .auth-form-title');
  const subEl    = document.querySelector('#tab-login .auth-form-sub');
  if (titleEl) titleEl.textContent = 'Bem-vindo!';
  if (subEl)   subEl.textContent   = 'Entre na sua conta para continuar';

  const TAB_ORDER=['login','register'];
  const indicator=document.getElementById('auth-indicator');
  document.querySelectorAll('.auth-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      const prev=document.querySelector('.auth-tab.on')?.dataset.tab;
      const next=tab.dataset.tab;
      if(prev===next)return;
      const dir=TAB_ORDER.indexOf(next)>TAB_ORDER.indexOf(prev)?'r':'l';
      document.querySelectorAll('.auth-tab').forEach(t=>t.classList.remove('on'));
      document.querySelectorAll('.auth-form').forEach(f=>f.classList.remove('on','tab-r','tab-l'));
      tab.classList.add('on');
      if(indicator) indicator.classList.toggle('to-r', next==='register');
      const nextForm=document.getElementById(`tab-${next}`);
      nextForm.classList.add('on',`tab-${dir}`);
      nextForm.addEventListener('animationend',()=>nextForm.classList.remove('tab-r','tab-l'),{once:true});
    });
  });
  document.querySelectorAll('.btn-eye').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const inp=document.getElementById(btn.dataset.t);
      inp.type=inp.type==='password'?'text':'password';
      btn.innerHTML=ic(inp.type==='password'?'eye':'eye-off',15);
      lcIcons(btn);
    });
  });
  ['l-user','l-pass'].forEach(id=>document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')document.getElementById('btn-login').click();}));
  document.getElementById('chk-remember')?.addEventListener('click',function(){const on=this.classList.toggle('on');this.setAttribute('aria-checked',on);});
  
  // Esqueci a senha
  document.getElementById('btn-forgot').addEventListener('click', () => {
    document.getElementById('fp-email').value = document.getElementById('l-user').value;
    document.getElementById('fp-error').classList.add('hidden');
    document.getElementById('fp-success').classList.add('hidden');
    document.getElementById('modal-forgot').classList.remove('hidden');
  });

  ['btn-fp-cancel', 'btn-fp-cancel2'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => {
      document.getElementById('modal-forgot').classList.add('hidden');
    });
  });

  document.getElementById('btn-fp-save').addEventListener('click', async () => {
    const email = document.getElementById('fp-email').value.trim();
    const errEl = document.getElementById('fp-error');
    const sucEl = document.getElementById('fp-success');
    const btn   = document.getElementById('btn-fp-save');

    errEl.classList.add('hidden');
    sucEl.classList.add('hidden');

    if (!email.includes('@')) {
      errEl.textContent = 'Digite um e-mail válido.';
      errEl.classList.remove('hidden');
      return;
    }

    btn.disabled = true; btn.textContent = 'Enviando...';

    const { error } = await _supa.auth.resetPasswordForEmail(email);

    btn.disabled = false; btn.textContent = 'Enviar link';

    if (error) {
      errEl.textContent = 'Erro ao enviar. Tente novamente.';
      errEl.classList.remove('hidden');
    } else {
      sucEl.classList.remove('hidden');
    }
  });

  document.getElementById('btn-login').addEventListener('click', async () => {
    const u   = document.getElementById('l-user').value.trim();
    const p   = document.getElementById('l-pass').value;
    const err = document.getElementById('l-error');
    const btn = document.getElementById('btn-login');
    btn.disabled = true;
    const found = await login(u, p);
    btn.disabled = false;
    if (!found) { err.classList.remove('hidden'); document.getElementById('l-pass').value=''; return; }
    err.classList.add('hidden');
    const prefsLogin = await DB.getPrefs();
    if (titleEl) titleEl.textContent = prefsLogin.jaEntrou ? 'Bem-vindo de volta' : 'Bem-vindo!';
    await openApp(found, !prefsLogin.jaEntrou);
  });
  
  document.getElementById('btn-register').addEventListener('click', async () => {
    const nome  = document.getElementById('r-nome').value.trim();
    const user  = document.getElementById('r-user').value.trim();
    const email = document.getElementById('r-email').value.trim();
    const pass  = document.getElementById('r-pass').value;
    const pass2 = document.getElementById('r-pass2').value;
    const err   = document.getElementById('r-error');
    const btn   = document.getElementById('btn-register');
    err.classList.add('hidden');
    if (nome.length<2)    { err.textContent='Nome muito curto.';           err.classList.remove('hidden'); return; }
    if (user.length<3)    { err.textContent='Usuário mín. 3 caracteres.';  err.classList.remove('hidden'); return; }
    if (!email.includes('@')){ err.textContent='E-mail inválido.';         err.classList.remove('hidden'); return; }
    if (pass.length<8)    { err.textContent='Senha mín. 8 caracteres.';    err.classList.remove('hidden'); return; }
    if (pass!==pass2)     { err.textContent='Senhas não coincidem.';       err.classList.remove('hidden'); return; }
    btn.disabled = true;
    const newUser = await cadastrar(nome, user, email, pass);
    btn.disabled = false;
    if (!newUser) { err.textContent='Erro ao criar conta. Tente novamente.'; err.classList.remove('hidden'); return; }
    document.querySelector('.auth-tab[data-tab="login"]').click();
    document.getElementById('l-user').value = user;
    ['r-nome','r-user','r-email','r-pass','r-pass2'].forEach(id=>document.getElementById(id).value='');
    toast('Conta criada! Faça login.','success',4000);
  });

  document.getElementById('btn-visitante').addEventListener('click', async () => {
    _modoVisitante = true;
    await openApp({ nome: 'Visitante', username: 'visitante' }, false);
  });

  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (_modoVisitante) {
      _modoVisitante = false;
      currentUser = null;
      _userId = null;
      clearInterval(clockTimer);
      document.getElementById('app').classList.add('hidden');
      document.getElementById('login-screen').classList.remove('hidden');
      return;
    }
    if (!confirm('Deseja sair?')) return;
    await _supa.auth.signOut();
    currentUser=null; _userId=null;
    clearInterval(clockTimer);
    document.getElementById('app').classList.add('hidden');
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('l-pass').value='';
  });
}

async function openApp(user, primeiroAcesso = false) {
  currentUser = user;
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  const nome = user.nome || user.username;
  document.getElementById('sb-name').textContent = nome;
  const perfilInicial = await DB.getPerfil();
  const sbAvatar = document.getElementById('sb-avatar');
  if (perfilInicial?.avatar_url) {
    sbAvatar.innerHTML = `<img src="${perfilInicial.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`;
  } else {
    sbAvatar.textContent = nome.charAt(0).toUpperCase();
  }
  const greetEl2 = document.getElementById('user-greet');
  greetEl2._baseName = nome;
  greetEl2.textContent = fmt.saudacao(nome);
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
  const prefs = await DB.getPrefs();
  applyTheme(prefs.tema);
  await renderAll();
  showView('dashboard');
// Onboarding apenas no primeiro acesso
  if (primeiroAcesso) {
    setTimeout(() => {  
      const ob      = document.getElementById('onboarding');
      const slides  = ob.querySelectorAll('.ob-slide');
      const dotsEl  = document.getElementById('ob-dots');
      const btnPrev = document.getElementById('btn-ob-prev');
      const btnNext = document.getElementById('btn-ob-next');
      let cur = 0;

      const goTo = (idx) => {
        slides[cur].classList.add('hidden');
        cur = idx;
        slides[cur].classList.remove('hidden');
        dotsEl.querySelectorAll('.ob-dot').forEach((d, i) => d.classList.toggle('active', i === cur));
        btnPrev.style.display = cur === 0 ? 'none' : 'block';
        btnNext.textContent   = cur === slides.length - 1 ? 'Começar agora 🚀' : 'Próximo →';
      };

      dotsEl.innerHTML = '';
      slides.forEach((_, i) => {
        const d = document.createElement('div');
        d.className = 'ob-dot' + (i === 0 ? ' active' : '');
        d.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(d);
      });

      btnNext.addEventListener('click', async () => {
        if (cur < slides.length - 1) {
          goTo(cur + 1);
        } else {
          ob.style.opacity = '0';
          ob.style.transition = 'opacity .3s ease';
          setTimeout(() => ob.classList.add('hidden'), 300);
          await DB.savePrefs({ ja_entrou: true });
        }
      });

      btnPrev.addEventListener('click', () => { if (cur > 0) goTo(cur - 1); });

      ob.style.visibility = 'visible';
      ob.classList.remove('hidden');
    }, 600);
  }
}
function initNav() {
  document.querySelectorAll('.nav-item').forEach(btn=>{
    btn.addEventListener('click',()=>{showView(btn.dataset.view);closeSB();});
  });
  document.querySelectorAll('[data-view]:not(.nav-item)').forEach(el=>{
    el.addEventListener('click',()=>showView(el.dataset.view));
  });
  document.getElementById('btn-hamburger').addEventListener('click',openSB);
  document.getElementById('btn-sb-collapse')?.addEventListener('click', () => {
    const app = document.getElementById('app');
    const isMini = app.classList.toggle('sb-mini');
    const btn = document.getElementById('btn-sb-collapse');
    btn.title = isMini ? 'Expandir menu' : 'Recolher menu';
    btn.setAttribute('aria-label', btn.title);
    btn.innerHTML = ic(isMini ? 'panel-left-open' : 'panel-left-close', 17);
    lcIcons(btn);
  });
  document.getElementById('sb-overlay').addEventListener('click',closeSB);
}
function initModalCatDetalhe() {
  document.getElementById('btn-close-cat-detalhe').addEventListener('click', () => {
    document.getElementById('modal-cat-detalhe').classList.add('hidden');
  });
  document.getElementById('modal-cat-detalhe').addEventListener('click', e => {
    if (e.target === e.currentTarget) document.getElementById('modal-cat-detalhe').classList.add('hidden');
  });
}
function showView(name) {
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('on'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('on'));
  document.getElementById(`view-${name}`)?.classList.add('on');
  document.querySelector(`.nav-item[data-view="${name}"]`)?.classList.add('on');
  const titles={dashboard:'Início',gastos:'Novo gasto',rendas:'Rendas',parceladas:'Parceladas',futuras:'Lista de desejos',recorrentes:'Recorrentes',historico:'Histórico'};
  document.getElementById('page-title').textContent=titles[name]||name;
  const renders={dashboard:renderDashboard,historico:renderHistorico,rendas:renderRendas,parceladas:renderParceladas,futuras:renderFuturas,recorrentes:renderRecorrentes};
  renders[name]?.().catch(err=>console.error('Render error:',err));
}
function openSB(){document.getElementById('app').classList.add('sb-open');}
function closeSB(){document.getElementById('app').classList.remove('sb-open');}

function initModals() {
  const mAbout = document.getElementById('modal-about');
  document.getElementById('btn-about').addEventListener('click',()=>mAbout.classList.remove('hidden'));
  document.getElementById('btn-about2')?.addEventListener('click',()=>mAbout.classList.remove('hidden'));
  document.getElementById('btn-close-about').addEventListener('click',()=>mAbout.classList.add('hidden'));
  mAbout.addEventListener('click',e=>{if(e.target===mAbout)mAbout.classList.add('hidden');});

  const mPrev = document.getElementById('modal-previsao');
  document.getElementById('card-proximo-mes').addEventListener('click', async () => {
    await abrirModalPrevisao();
    mPrev.classList.remove('hidden');
  });
  document.getElementById('btn-close-previsao').addEventListener('click',()=>mPrev.classList.add('hidden'));
  mPrev.addEventListener('click',e=>{if(e.target===mPrev)mPrev.classList.add('hidden');});

  const mCat = document.getElementById('modal-cat-detalhe');
  document.getElementById('btn-close-cat-detalhe').addEventListener('click',()=>mCat.classList.add('hidden'));
  mCat.addEventListener('click',e=>{if(e.target===mCat)mCat.classList.add('hidden');});

  // Modal vencimento cartão
  const mVenc = document.getElementById('modal-venc-cartao');
  document.getElementById('btn-venc-cartao-save').addEventListener('click', async () => {
    const dia = parseInt(document.getElementById('venc-cartao-dia').value);
    const erroEl = document.getElementById('venc-cartao-erro');
    if (isNaN(dia) || dia < 1 || dia > 31) {
      erroEl.classList.remove('hidden'); return;
    }
    erroEl.classList.add('hidden');
    await DB.saveDiaVencCartao(dia);
    mVenc.classList.add('hidden');
    if (window._vencCartaoCallback) { window._vencCartaoCallback(dia); window._vencCartaoCallback = null; }
  });

  // PDF
  const mPdf = document.getElementById('modal-pdf');
  document.getElementById('btn-open-pdf').addEventListener('click', () => {
    document.getElementById('pdf-mes').value = fmt.mesAtual();
    mPdf.classList.remove('hidden');
  });
  document.getElementById('btn-close-pdf').addEventListener('click', () => { mPdf.classList.add('hidden'); showView('dashboard'); });
  mPdf.addEventListener('click', e => { if (e.target === mPdf) { mPdf.classList.add('hidden'); showView('dashboard'); } });
  document.getElementById('btn-gerar-pdf').addEventListener('click', gerarPDF);

  // Perfil
  const mPerfil = document.getElementById('modal-perfil');
  if (mPerfil) {
    let emojiSelecionado = '😊';

    document.getElementById('btn-open-perfil').addEventListener('click', async () => {
      if (!_userId) { console.log('sem userId'); return; }
      const perfil = await DB.getPerfil();
      if (!perfil) { console.log('sem perfil'); return; }
      emojiSelecionado = perfil.emoji || '😊';

      // Carregar foto atual
      const avatarImg = document.getElementById('perfil-avatar-img');
      const avatarInicial = document.getElementById('perfil-avatar-inicial');
      if (perfil.avatar_url) {
        avatarImg.src = perfil.avatar_url;
        avatarImg.style.display = 'block';
        avatarInicial.style.display = 'none';
      } else {
        avatarImg.style.display = 'none';
        avatarInicial.style.display = 'block';
        avatarInicial.textContent = (perfil.nome || perfil.username || '?').charAt(0).toUpperCase();
      }
      document.getElementById('perfil-foto-input').value = '';
      document.getElementById('perfil-username').textContent = '@' + (perfil.username || '');
      document.getElementById('perfil-nome').value = perfil.nome || '';
      document.getElementById('perfil-senha-atual').value = '';
      document.getElementById('perfil-senha-nova').value = '';
      document.getElementById('perfil-senha-conf').value = '';
      document.getElementById('perfil-erro').classList.add('hidden');
      document.getElementById('perfil-ok').classList.add('hidden');
      const criado = perfil.created_at ? new Date(perfil.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' }) : 'sem data';
      document.getElementById('perfil-criado').textContent = criado;
      document.querySelectorAll('.emoji-opt').forEach(e => {
        e.classList.toggle('selected', e.textContent === emojiSelecionado);
      });
      mPerfil.classList.remove('hidden');
    });

    document.getElementById('btn-close-perfil').addEventListener('click', () => mPerfil.classList.add('hidden'));
    mPerfil.addEventListener('click', e => { if (e.target === mPerfil) mPerfil.classList.add('hidden'); });

    document.getElementById('btn-toggle-senha').addEventListener('click', () => {
      const fields = document.getElementById('senha-fields');
      fields.classList.toggle('hidden');
    });

    // Clique no avatar abre o input de arquivo
    document.getElementById('perfil-avatar-display').addEventListener('click', () => {
      document.getElementById('perfil-foto-input').click();
    });

    // Preview da foto selecionada
    document.getElementById('perfil-foto-input').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) { toast('Imagem muito grande. Máx. 2MB.', 'error'); return; }
      const reader = new FileReader();
      reader.onload = (ev) => {
        document.getElementById('perfil-avatar-img').src = ev.target.result;
        document.getElementById('perfil-avatar-img').style.display = 'block';
        document.getElementById('perfil-avatar-inicial').style.display = 'none';
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('btn-perfil-save').addEventListener('click', async () => {
      const nome      = document.getElementById('perfil-nome').value.trim();
      const senhaAt   = document.getElementById('perfil-senha-atual').value;
      const senhaNova = document.getElementById('perfil-senha-nova').value;
      const senhaConf = document.getElementById('perfil-senha-conf').value;
      const erroEl    = document.getElementById('perfil-erro');
      const okEl      = document.getElementById('perfil-ok');
      const btn       = document.getElementById('btn-perfil-save');
      const username  = document.getElementById('perfil-username').value;

      erroEl.classList.add('hidden');
      okEl.classList.add('hidden');

      if (!nome) { erroEl.textContent = 'O nome não pode estar vazio.'; erroEl.classList.remove('hidden'); return; }

      if (senhaAt || senhaNova || senhaConf) {
        if (!senhaAt)  { erroEl.textContent = 'Informe a senha atual.'; erroEl.classList.remove('hidden'); return; }
        if (!senhaNova){ erroEl.textContent = 'Informe a nova senha.';  erroEl.classList.remove('hidden'); return; }
        if (senhaNova !== senhaConf) { erroEl.textContent = 'As senhas não coincidem.'; erroEl.classList.remove('hidden'); return; }
        if (senhaNova.length < 4)   { erroEl.textContent = 'Senha mín. 4 caracteres.'; erroEl.classList.remove('hidden'); return; }
        const userOk = await DB.findUser(username, senhaAt);
        if (!userOk) { erroEl.textContent = 'Senha atual incorreta.'; erroEl.classList.remove('hidden'); return; }
        const { data: userData } = await _supa.from('users').select('password').eq('id', _userId).single();
        if (userData?.password === senhaNova) { erroEl.textContent = 'A nova senha não pode ser igual à atual.'; erroEl.classList.remove('hidden'); return; }
      }

      btn.disabled = true; btn.textContent = 'Salvando...';
      const fotoInput = document.getElementById('perfil-foto-input');
      const file = fotoInput.files[0];
      let avatarUrl = null;
      if (file) {
        btn.textContent = 'Enviando foto...';
        avatarUrl = await DB.uploadAvatar(file, _userId);
        if (!avatarUrl) { erroEl.textContent = 'Erro ao enviar foto.'; erroEl.classList.remove('hidden'); btn.disabled=false; btn.textContent='Salvar alterações'; return; }
      }
      const fields = { nome };
      if (senhaNova) fields.password = senhaNova;
      if (avatarUrl) fields.avatar_url = avatarUrl;
      const ok = await DB.updatePerfil(fields);
      btn.disabled = false; btn.textContent = 'Salvar alterações';

      if (ok) {
        document.getElementById('sb-name').textContent = nome;
        if (avatarUrl) {
          const sbAvatar = document.getElementById('sb-avatar');
          sbAvatar.innerHTML = `<img src="${avatarUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:inherit;"/>`;
        }
        currentUser.nome = nome;
        okEl.textContent = 'Perfil atualizado com sucesso!';
        okEl.classList.remove('hidden');
        document.getElementById('perfil-senha-atual').value = '';
        document.getElementById('perfil-senha-nova').value  = '';
        document.getElementById('perfil-senha-conf').value  = '';
      } else {
        erroEl.textContent = 'Erro ao salvar. Tente novamente.';
        erroEl.classList.remove('hidden');
      }
    });
  }
}

async function abrirModalPrevisao() {
  const proxM = fmt.mesOffset(1);
  const {ano,mes0} = fmt.parseMes(proxM);
  document.getElementById('modal-prev-titulo').textContent = `Previsão de ${MESES_PT[mes0]} ${ano}`;

  const [rendas, parc, rec, futuras, gastos] = await Promise.all([
    DB.rendas(), DB.parceladas(), DB.recorrentes(), DB.futuras(), DB.gastos()
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
  gastos.filter(g=>g.categoria==='cartao'&&g.data.startsWith(proxM)).forEach(g=>saidas.push({nome:g.nome,valor:g.valor,tipo:'cartao'}));

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
  resEl.style.color = resultado < 0 ? 'var(--bad)' : 'var(--ok)';
}

function initMiniTabs() {
  document.querySelectorAll('.mini-tab').forEach(tab=>{
    tab.addEventListener('click',()=>{
      document.querySelectorAll('.mini-tab').forEach(t=>t.classList.remove('on'));
      tab.classList.add('on');
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

  document.getElementById('g-cat').addEventListener('change', async function() {
    const subcatWrap = document.getElementById('g-subcat-wrap');
    if (this.value === 'cartao') {
      subcatWrap.classList.remove('hidden');
      const dia = await DB.getDiaVencCartao();
      document.getElementById('g-venc-dia-txt').textContent = dia || '';
      document.getElementById('g-venc-info').classList.remove('hidden');
    } else {
      subcatWrap.classList.add('hidden');
      document.getElementById('g-subcat').value = '';
      document.getElementById('g-venc-info').classList.add('hidden');
    }
  });

  document.getElementById('btn-alterar-venc').addEventListener('click', () => {
    document.getElementById('venc-cartao-dia').value = '';
    document.getElementById('venc-cartao-erro').classList.add('hidden');
    document.getElementById('modal-venc-cartao').classList.remove('hidden');
    window._vencCartaoCallback = async (dia) => {
      document.getElementById('g-venc-dia-txt').textContent = dia;
    };
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
      const salvarCartao = async (diaVenc) => {
        const proxM    = fmt.mesOffset(1);
        const diaMax   = new Date(parseInt(proxM.split('-')[0]), parseInt(proxM.split('-')[1]), 0).getDate();
        const diaFinal = Math.min(diaVenc, diaMax);
        const proxMesData = `${proxM}-${String(diaFinal).padStart(2,'0')}`;

        list.unshift({ id:fmt.uid(), nome, valor, categoria:'cartao', subcategoria:subcat, data:proxMesData, dataCompra:data });
        await DB.saveGastos(list);
        document.getElementById('g-nome').value = '';
        document.getElementById('g-valor').value = '';
        document.getElementById('g-cat').value = '';
        document.getElementById('g-subcat').value = '';
        document.getElementById('g-subcat-wrap').classList.add('hidden');
        pickers.gasto?.setValue(fmt.hoje());
        await renderDashboard();
        toast('Foi pro cartão: entra na fatura do mês que vem.', 'info', 4000);
      };

      const diaJaSalvo = await DB.getDiaVencCartao();
      if (diaJaSalvo) {
        await salvarCartao(diaJaSalvo);
      } else {
        document.getElementById('venc-cartao-dia').value = '';
        document.getElementById('venc-cartao-erro').classList.add('hidden');
        document.getElementById('modal-venc-cartao').classList.remove('hidden');
        window._vencCartaoCallback = salvarCartao;
      }
      return;
    } else {
      list.unshift({ id:fmt.uid(), nome, valor, categoria:cat, subcategoria:'', data });
      await DB.saveGastos(list);
      toast(`${fmt.brl(valor)} registrado!`);
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
    toast('Dinheiro na conta! Entrada registrada.');
  });

  document.getElementById('btn-add-rr').addEventListener('click', async () => {
    const nome  = document.getElementById('rr-nome').value.trim();
    const valor = parseMoney('rr-valor');
    const dia   = parseInt(document.getElementById('rr-dia').value);
    const inicio= document.getElementById('rr-inicio').value;
    const prazo = document.querySelector('input[name="rr-prazo"]:checked')?.value;
    const fim   = document.getElementById('rr-fim').value;
    if (!nome||valor<=0||isNaN(dia)||dia<1||dia>31||!inicio) { toast('Preencha todos os campos.','error'); return; }
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
    toast('Renda regular cadastrada!');
  });
}
window.receberAntecipado = async function(id,nome,valor) {
  if (!confirm(`Confirmar recebimento antecipado de ${fmt.brl(valor)} (${nome})?`)) return;
  const rendas = await DB.rendas();
  const item = rendas.find(r=>r.id===id);
  if (item) { item.data=fmt.hoje(); await DB.saveRendas(rendas); }
  await renderDashboard();
  await renderRendas();
  toast(`${fmt.brl(valor)} marcado como recebido!`);
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
    if (isNaN(diaV)||diaV<1||diaV>31) { toast('Informe o dia de vencimento (1–31).','error'); return; }

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
    toast('Parcelamento adicionado. Seu eu do futuro agradece.');
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
    toast(mes.pago?'Parcela paga!':'Parcela desmarcada.','info');
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
    toast('Compra planejada!');
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
      <option value="Alimentação">Alimentação</option>
      <option value="Transporte">Transporte</option>
      <option value="Lazer">Lazer</option>
      <option value="Contas">Contas</option>
      <option value="Saúde">Saúde</option>
      <option value="Educação">Educação</option>
      <option value="Beleza">Beleza</option>
      <option value="Outros">Outros</option>
    </select>
    <input type="date" id="rf-data-${id}" value="${fmt.hoje()}" max="${fmt.hoje()}"/>
    <button class="qa-btn" onclick="confirmarRealizacao('${id}')">Confirmar</button>
    <button class="qa-btn" style="background:var(--surface3);color:var(--txt2)" onclick="this.closest('.realizar-form').remove()">Cancelar</button>
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
  toast(`${f.nome} realizado e registrado!`);
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
    toast('Recorrente adicionada!');
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
  toast(`${rec.nome} paga! Próximo vencimento já agendado.`);
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

async function renderNotificacoes() {
  const hoje   = fmt.hoje();
  const mesAtu = fmt.mesAtual();
  const [parc, rec, gastos] = await Promise.all([DB.parceladas(), DB.recorrentes(), DB.gastos()]);
  const itens = [];

  // Parcelas vencendo em até 7 dias
  parc.forEach(p => {
    const parMes = p.parcelas.find(x => x.mesAno === mesAtu && !x.pago);
    if (parMes && p.diaVenc) {
      const dataVenc = `${mesAtu}-${String(p.diaVenc).padStart(2,'0')}`;
      const diff = Math.ceil((new Date(dataVenc+'T12:00:00') - new Date()) / 86400000);
      if (diff >= 0 && diff <= 7) {
        itens.push({
          icon: 'package', urgente: diff <= 2,
          title: p.nome,
          sub: diff === 0 ? 'Vence hoje!' : diff === 1 ? 'Vence amanhã' : `Vence em ${diff} dias`,
          val: parMes.valorParcela
        });
      }
    }
  });

  // Recorrentes vencendo em até 7 dias
  rec.forEach(r => {
    if (!r.proximaData) return;
    const diff = Math.ceil((new Date(r.proximaData+'T12:00:00') - new Date()) / 86400000);
    if (diff >= 0 && diff <= 7) {
      itens.push({
        icon: 'refresh-cw', urgente: diff <= 2,
        title: r.nome,
        sub: diff === 0 ? 'Vence hoje!' : diff === 1 ? 'Vence amanhã' : `Vence em ${diff} dias`,
        val: r.valor
      });
    }
  });

  // Fatura do cartão vencendo em até 7 dias
  const proxM = fmt.mesOffset(1);
  const diaVencCartao = await DB.getDiaVencCartao();
  if (diaVencCartao) {
    const dataFatura = `${mesAtu}-${String(diaVencCartao).padStart(2,'0')}`;
    const diff = Math.ceil((new Date(dataFatura+'T12:00:00') - new Date()) / 86400000);
    const totalCartao = gastos.filter(g => g.categoria === 'cartao' && g.data.startsWith(proxM)).reduce((a,g) => a+g.valor, 0);
    if (diff >= 0 && diff <= 7 && totalCartao > 0) {
      itens.push({
        icon: 'credit-card', urgente: diff <= 2,
        title: 'Fatura do Cartão',
        sub: diff === 0 ? 'Vence hoje!' : diff === 1 ? 'Vence amanhã' : `Vence em ${diff} dias`,
        val: totalCartao
      });
    }
  }

  // Renderizar
  const badge    = document.getElementById('notif-badge');
  const list     = document.getElementById('notif-list');
  const countLbl = document.getElementById('notif-count-label');

  if (itens.length > 0) {
    badge.textContent = itens.length;
    badge.classList.remove('hidden');
    countLbl.textContent = `${itens.length} pendente${itens.length > 1 ? 's' : ''}`;
    list.innerHTML = '';
    itens.sort((a,b) => b.urgente - a.urgente).forEach(item => {
      const div = document.createElement('div');
      div.className = 'notif-item' + (item.urgente ? ' notif-urgente' : '');
      div.innerHTML = `
        <div class="notif-item-icon">${ic(item.icon, 15)}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${fmt.esc(item.title)}</div>
          <div class="notif-item-sub">${item.sub}</div>
        </div>
        <div class="notif-item-val">− ${fmt.brl(item.val)}</div>`;
      list.appendChild(div);
    });
    lcIcons(list);
  } else {
    badge.classList.add('hidden');
    countLbl.textContent = '';
    list.innerHTML = `<p class="notif-empty">${ic('check-circle',14)} Nenhum vencimento próximo.</p>`;
    lcIcons(list);
  }
}

function initNotificacoes() {
  const btn = document.getElementById('btn-notif');
  const dd  = document.getElementById('notif-dropdown');

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dd.classList.toggle('hidden');
  });

  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('notif-wrap');
    if (wrap && !wrap.contains(e.target)) dd.classList.add('hidden');
  });
}

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
async function gerarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const mes     = document.getElementById('pdf-mes').value || fmt.mesAtual();
  const [ano, m] = mes.split('-').map(Number);
  const fmtData = d => { if (!d || d==='-') return '-'; const [y,mo,di]=d.split('-'); return `${di}/${mo}/${y}`; };
  const nomeMes = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  const incGastos = document.getElementById('pdf-gastos').checked;
  const incRendas = document.getElementById('pdf-rendas').checked;
  const incParc   = document.getElementById('pdf-parc').checked;
  const incRec    = document.getElementById('pdf-rec').checked;
  const incFut    = document.getElementById('pdf-fut').checked;

  const [gastos, rendas, parc, rec, futuras] = await Promise.all([
    DB.gastos(), DB.rendas(), DB.parceladas(), DB.recorrentes(), DB.futuras()
  ]);

  const W = 210, pad = 16;
  let y = 20;

  // Cabeçalho
  doc.setFillColor(109, 40, 217);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18); doc.setFont('helvetica', 'bold');
  doc.text('Fora Perrengue', pad, 13);
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(`Relatório ${nomeMes}`, pad, 21);
  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W - pad, 21, { align: 'right' });
  y = 38;

  // Resumo financeiro
  const gastosDoMes     = gastos.filter(g => g.categoria !== 'cartao' && g.data.startsWith(mes));
  const gastosCartaoMes = gastos.filter(g => g.categoria === 'cartao' && g.data.startsWith(mes));
  const totalGastos     = gastosDoMes.reduce((a, g) => a + g.valor, 0);
  const entradasMes     = todasEntradasSync(rendas, mes + '-31').filter(e => e.data.startsWith(mes));
  const totalEntradas   = entradasMes.reduce((a, e) => a + e.valor, 0);
  const saldo           = totalEntradas - totalGastos;

  doc.setTextColor(30, 22, 48);
  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('Resumo do Mês', pad, y); y += 7;

  doc.autoTable({
    startY: y,
    head: [['Descrição', 'Valor']],
    body: [
      ['Total de Entradas', fmt.brl(totalEntradas)],
      ['Total de Gastos',   fmt.brl(totalGastos)],
      ['Saldo do Mês',      fmt.brl(saldo)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [109, 40, 217], textColor: 255, fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { fontSize: 9, textColor: [30, 22, 48] },
    columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' } },
    didParseCell: d => { if(d.column.index===0) d.cell.styles.halign='left'; if(d.column.index===1) d.cell.styles.halign='center'; },
    margin: { left: pad, right: pad },
  });
  y = doc.lastAutoTable.finalY + 10;

  // Gastos por categoria
  if (incGastos && gastosDoMes.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Gastos por Categoria', pad, y); y += 4;
    const porCat = {};
    gastosDoMes.forEach(g => { porCat[g.categoria] = (porCat[g.categoria]||[]).concat(g); });
    const rows = [];
    Object.entries(porCat).forEach(([cat, itens]) => {
      itens.forEach((g, i) => {
        rows.push([i === 0 ? cat : '', g.nome, fmt.brl(g.valor), fmtData(g.data)]);
      });
    });
    doc.autoTable({
      startY: y,
      head: [['Categoria', 'Nome', 'Valor', 'Data']],
      body: rows,
      theme: 'striped',
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 22, 48] },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
      margin: { left: pad, right: pad },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Gastos no Cartão
  if (incGastos && gastosCartaoMes.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Gastos no Cartão', pad, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Subcategoria', 'Nome', 'Valor', 'Compra em']],
      body: gastosCartaoMes.map(g => [
        g.subcategoria || 'Outros',
        g.nome,
        fmt.brl(g.valor),
        fmtData(g.dataCompra || g.data)
      ]),
      theme: 'striped',
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 22, 48] },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'left' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
      margin: { left: pad, right: pad },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Rendas
  if (incRendas && entradasMes.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Entradas', pad, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Nome', 'Valor', 'Data']],
      body: entradasMes.map(e => [e.nome, fmt.brl(e.valor), fmtData(e.data)]),
      theme: 'striped',
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 22, 48] },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'right' } },
      didParseCell: d => { if(d.column.index===0) d.cell.styles.halign='left'; if(d.column.index===1) d.cell.styles.halign='center'; if(d.column.index===2) d.cell.styles.halign='right'; },
      margin: { left: pad, right: pad },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Parceladas
  if (incParc && parc.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Parceladas', pad, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Nome', 'Parcela', 'Valor (R$)', 'Status']],
      body: parc.map(p => {
        const parMes = p.parcelas.find(x => x.mesAno === mes);
        const pagas  = p.parcelas.filter(x => x.pago).length;
        return [
          p.nome,
          parMes ? `${parMes.num}/${p.numParcelas}` : `${pagas}/${p.numParcelas}`,
          fmt.brl(p.valorParcela),
          parMes ? (parMes.pago ? 'Pago' : 'Pendente') : 'Fora do mês'
        ];
      }),
      theme: 'striped',
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 22, 48] },
      columnStyles: {
        0: { halign: 'left',   cellWidth: 80 },
        1: { halign: 'center', cellWidth: 28 },
        2: { halign: 'center', cellWidth: 38 },
        3: { halign: 'right',  cellWidth: 32 },
      },
      didParseCell: d => { const a=['left','center','center','right']; d.cell.styles.halign=a[d.column.index]||'left'; },
      margin: { left: pad, right: pad },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Recorrentes
  if (incRec && rec.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Recorrentes', pad, y); y += 4;
    doc.autoTable({
      startY: y,
      head: [['Nome', 'Valor', 'Frequência', 'Próximo']],
      body: rec.map(r => [r.nome, fmt.brl(r.valor), r.frequencia, fmtData(r.proximaData)]),
      theme: 'striped',
      headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: [30, 22, 48] },
      columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'right' } },
      margin: { left: pad, right: pad },
    });
    y = doc.lastAutoTable.finalY + 10;
  }

  // Futuras
  if (incFut) {
    const futMes = futuras.filter(f => f.data.startsWith(mes));
    if (futMes.length > 0) {
      if (y > 240) { doc.addPage(); y = 20; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Despesas Futuras', pad, y); y += 4;
      doc.autoTable({
        startY: y,
        head: [['Nome', 'Valor Estimado', 'Data']],
        body: futMes.map(f => [f.nome, fmt.brl(f.valorEstimado), fmtData(f.data)]),
        theme: 'striped',
        headStyles: { fillColor: [109, 40, 217], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 8, textColor: [30, 22, 48] },
        columnStyles: { 0: { halign: 'left' }, 1: { halign: 'center' }, 2: { halign: 'right' } },
        didParseCell: d => { if(d.column.index===0) d.cell.styles.halign='left'; if(d.column.index===1) d.cell.styles.halign='center'; if(d.column.index===2) d.cell.styles.halign='right'; },
        margin: { left: pad, right: pad },
      });
    }
  }

  // Rodapé
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Fora Perrengue · Pág. ${i} de ${pages}`, W / 2, 290, { align: 'center' });
  }

  const [anoP, mesP] = mes.split('-');
  doc.save(`fora-perrengue-${mesP}-${anoP}.pdf`);
  document.getElementById('modal-pdf').classList.add('hidden');
  toast('PDF gerado com sucesso!', 'success', 3000);
  showView('dashboard');
}
async function renderDashboard() {
  const [gastos, parc, rec, futuras, rendas] = await Promise.all([
    DB.gastos(), DB.parceladas(), DB.recorrentes(), DB.futuras(), DB.rendas()
  ]);

  const s = calcSaldosSync(gastos, parc, rec, futuras, rendas);

  const greetEl = document.getElementById('user-greet');
  if (greetEl && greetEl._baseName) {
    const cond = s.disponivel >= 0 ? 'seu mês tá no azul' : 'atenção, mês no vermelho';
    greetEl.textContent = `${fmt.saudacao(greetEl._baseName)}, ${cond}`;
  }

  const dispEl = document.getElementById('val-disponivel');
  dispEl.textContent = fmt.brl(s.disponivel);
  dispEl.style.color = s.disponivel<0?'var(--bad)':'';
  document.getElementById('val-previsto').textContent = fmt.brl(s.totalARec);
  document.getElementById('val-saidas-mes').textContent = fmt.brl(s.totalSaidas);
  const proxEl = document.getElementById('val-proximo-mes');
  proxEl.textContent = fmt.brl(s.proximoMes);
  proxEl.style.color = s.proximoMes<0?'var(--bad)':'';

  renderBoxEntradasMes(s, rendas);
  renderBoxSaidasMes(s.mesAtu, rec, parc, futuras);
  renderBoxParcelados(parc);
  renderPieChart(gastos);
  const compMeses = document.getElementById('comp-meses');
  await renderBarChart(parseInt(compMeses.value));
  compMeses.onchange = async () => await renderBarChart(parseInt(compMeses.value));

  const recBox = document.getElementById('list-recent-gastos');
  recBox.innerHTML='';
  if (gastos.length===0) recBox.innerHTML='<p class="empty-msg">Nenhum gasto registrado.</p>';
  else gastos.slice(0,5).forEach(g=>recBox.appendChild(buildGastoItem(g)));

  await renderNotificacoes();
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
    const row = document.createElement('div'); row.className='rowi';
    row.innerHTML=`
      <div class="tile" style="${recebido?'color:var(--ok)':'color:var(--txt3)'}">${recebido?ic('check-circle',16):ic('clock',16)}</div>
      <div class="r-main">
        <div class="r-name">${fmt.esc(e.nome)}</div>
        <div class="r-meta">${fmt.date(e.data)}</div>
      </div>
      <div class="r-right">
        <span class="pill ${recebido?'pill-ok':'pill-ac'}">${recebido?'Recebido':'A receber'}</span>
        <span class="r-val up">+ ${fmt.brl(e.valor)}</span>
      </div>
    `;
    box.appendChild(row);
  });
  lcIcons(box);
}

function renderBoxSaidasMes(mesAtu, rec, parc, futuras) {
  const box  = document.getElementById('list-saidas-futuras');
  box.innerHTML = '';
  const seen = new Set(), itens = [];

  rec.forEach(r=>{
    const key=`rec_${r.id}`;
    if (r.proximaData.startsWith(mesAtu)&&!seen.has(key)) {
      seen.add(key);
      itens.push({icon:'refresh-cw',nome:r.nome,data:r.proximaData,valor:r.valor});
    }
  });
  parc.forEach(p=>{
    const parMes = p.parcelas.find(x=>x.mesAno===mesAtu&&!x.pago);
    if (parMes) {
      const key=`parc_${p.id}`;
      if (!seen.has(key)) {
        seen.add(key);
        const diaF = parMes.diaVenc||1;
        itens.push({icon:'credit-card',nome:`${p.nome} (${parMes.num}/${p.numParcelas})`,data:mesAtu+'-'+String(diaF).padStart(2,'0'),valor:parMes.valorParcela});
      }
    }
  });
  futuras.forEach(f=>{
    const key=`fut_${f.id}`;
    if (f.data.startsWith(mesAtu)&&!seen.has(key)) {
      seen.add(key);
      itens.push({icon:'shopping-bag',nome:f.nome,data:f.data,valor:f.valorEstimado});
    }
  });

  if (itens.length===0) { box.innerHTML='<p class="empty-msg">Nenhuma saída este mês.</p>'; return; }
  itens.sort((a,b)=>a.data.localeCompare(b.data)).forEach(item=>{
    const row=document.createElement('div'); row.className='rowi';
    row.innerHTML=`
      <div class="tile">${ic(item.icon,16)}</div>
      <div class="r-main">
        <div class="r-name">${fmt.esc(item.nome)}</div>
        <div class="r-meta">${fmt.date(item.data)}</div>
      </div>
      <div class="r-right">
        <span class="r-val down">− ${fmt.brl(item.valor)}</span>
      </div>
    `;
    box.appendChild(row);
  });
  lcIcons(box);
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
    const div=document.createElement('div'); div.className='parc-item';
    div.innerHTML=`
      <div class="parc-top">
        <span class="parc-name" onclick="toggleParcela('${p.id}','${mesAtu}')" title="Clique para marcar/desmarcar este mês" style="cursor:pointer">
          ${fmt.esc(p.nome)}
          ${parcMes?.pago?'<span class="pill pill-ok" style="margin-left:5px;font-size:.59rem">pago</span>':''}
        </span>
        <span class="parc-val">${fmt.brl(p.valorParcela)}<strong>/mês</strong>${diaStr}</span>
      </div>
      <div class="parc-bottom">
        <div class="prog"><span style="width:${pct}%"></span></div>
        <span class="parc-count">${pagas}/${p.numParcelas}</span>
      </div>
    `;
    box.appendChild(div);
  });
}

function openCatModal(cat, totals, gastosPerCat) {
  const itens = gastosPerCat[cat] || [];
  const total = totals[cat] || 0;
  const label = cat === 'cartao' ? 'Cartão de Crédito' : cat;

  const heroEl = document.getElementById('cat-detalhe-hero');
  heroEl.innerHTML = ic(cat === 'cartao' ? 'credit-card' : (CAT_ICONS[cat] || 'package'), 22);
  lcIcons(heroEl);
  document.getElementById('cat-detalhe-titulo').textContent = label;
  document.getElementById('cat-detalhe-total').textContent  = `Total: ${fmt.brl(total)}`;

  const body = document.getElementById('cat-detalhe-body');
  body.innerHTML = '';

  if (cat === 'cartao') {
    const subGroups = {};
    itens.forEach(g => {
      const sub = g.subcategoria || 'Outros';
      if (!subGroups[sub]) subGroups[sub] = [];
      subGroups[sub].push(g);
    });
    Object.entries(subGroups).sort((a, b) => {
      return b[1].reduce((s,g)=>s+g.valor,0) - a[1].reduce((s,g)=>s+g.valor,0);
    }).forEach(([sub, gs]) => {
      const subTotal = gs.reduce((s,g)=>s+g.valor,0);
      const header = document.createElement('div');
      header.style.cssText = 'font-size:.78rem;font-weight:700;color:var(--ac);margin-top:12px;margin-bottom:4px;text-transform:uppercase;letter-spacing:.05em;';
      header.innerHTML = `${ic(CAT_ICONS[sub]||'package',13)} ${sub} ${fmt.brl(subTotal)}`;
      lcIcons(header);
      body.appendChild(header);
      gs.forEach(g => {
        const row = document.createElement('div');
        row.className = 'prev-section';
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;margin-bottom:4px;';
        row.innerHTML = `<span style="font-size:.84rem;color:var(--txt)">${fmt.esc(g.nome)}</span><span style="font-size:.84rem;font-weight:700;color:var(--bad)">− ${fmt.brl(g.valor)}</span>`;
        body.appendChild(row);
      });
    });
  } else {
    itens.sort((a,b)=>b.valor-a.valor).forEach(g => {
      const row = document.createElement('div');
      row.className = 'prev-section';
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 14px;margin-bottom:4px;';
      row.innerHTML = `<span style="font-size:.84rem;color:var(--txt)">${fmt.esc(g.nome)}</span><span style="font-size:.84rem;font-weight:700;color:var(--bad)">− ${fmt.brl(g.valor)}</span>`;
      body.appendChild(row);
    });
  }

  if (itens.length === 0) body.innerHTML = '<p class="empty-msg">Nenhum item.</p>';
  document.getElementById('modal-cat-detalhe').classList.remove('hidden');
}

function renderPieChart(gastos) {
  const wrap  = document.getElementById('pie-chart-wrap');
  const empty = document.getElementById('chart-empty');
  const leg   = document.getElementById('cat-legend');

  if (!gastos || gastos.length === 0) {
    empty.style.display = 'block';
    if (wrap) { wrap.innerHTML = ''; wrap.style.display = 'none'; }
    leg.innerHTML = '';
    return;
  }
  empty.style.display = 'none';
  if (wrap) wrap.style.display = 'block';

  const totals = {}, gastosPerCat = {};
  gastos.forEach(g => {
    const cat = g.categoria === 'cartao' ? 'cartao' : g.categoria;
    totals[cat] = (totals[cat] || 0) + g.valor;
    if (!gastosPerCat[cat]) gastosPerCat[cat] = [];
    gastosPerCat[cat].push(g);
  });

  const total   = Object.values(totals).reduce((a, b) => a + b, 0);
  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1]);

  // SVG donut — igual ao componente Donut do handoff
  const size = 196, stroke = 16;
  const rad  = (size - stroke) / 2;
  const C    = 2 * Math.PI * rad;
  const gap  = entries.length > 1 ? 2.5 : 0;
  let off = -90;

  const circles = entries.map(([cat, valor]) => {
    const frac  = total > 0 ? valor / total : 0;
    const len   = Math.max(0, frac * 360 - gap);
    const color = CAT_COLORS[cat] || '#8C92BC';
    const dash  = `${(len / 360) * C} ${C}`;
    const el    = `<circle cx="${size/2}" cy="${size/2}" r="${rad}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${dash}" transform="rotate(${off} ${size/2} ${size/2})" style="transition:stroke-dasharray .6s var(--ease)"/>`;
    off += frac * 360;
    return el;
  }).join('');

  if (wrap) {
    wrap.innerHTML = `
      <div style="position:relative;width:${size}px;height:${size}px;margin:0 auto">
        <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
          <circle cx="${size/2}" cy="${size/2}" r="${rad}" fill="none" stroke="var(--surface3)" stroke-width="${stroke}"/>
          ${circles}
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none">
          <span class="t-micro" style="white-space:nowrap">Este mês</span>
          <span class="t-num" style="font-size:19px;font-weight:700;white-space:nowrap">${fmt.brl(total)}</span>
        </div>
      </div>`;
  }

  // legenda
  leg.innerHTML = '';
  entries.forEach(([cat, val]) => {
    const pct   = total > 0 ? Math.round(val / total * 100) : 0;
    const color = CAT_COLORS[cat] || '#8C92BC';
    const label = cat === 'cartao' ? 'Cartão de Crédito' : cat;
    const div   = document.createElement('div');
    div.className = 'lg-row';
    div.style.cursor = 'pointer';
    div.innerHTML = `
      <span class="lg-dot" style="background:${color}"></span>
      <span class="lg-name">${label}</span>
      <span class="lg-val">${fmt.brl(val)}</span>
      <span class="lg-pct">${pct}%</span>`;
    div.addEventListener('click', () => openCatModal(cat, totals, gastosPerCat));
    leg.appendChild(div);

    if (cat === 'cartao') {
      const subTotals = {};
      (gastosPerCat[cat] || []).forEach(g => {
        subTotals[g.subcategoria || 'Outros'] = (subTotals[g.subcategoria || 'Outros'] || 0) + g.valor;
      });
      Object.entries(subTotals).sort((a, b) => b[1] - a[1]).forEach(([sub, sv]) => {
        const subPct = val > 0 ? Math.round(sv / val * 100) : 0;
        const subDiv = document.createElement('div');
        subDiv.className = 'lg-row';
        subDiv.style.cssText = 'padding-left:20px;opacity:.8';
        subDiv.innerHTML = `
          <span class="lg-dot" style="background:${CAT_COLORS[sub] || '#8C92BC'};opacity:.7"></span>
          <span class="lg-name" style="font-size:11.5px">${sub}</span>
          <span class="lg-val" style="font-size:11.5px">${fmt.brl(sv)}</span>
          <span class="lg-pct" style="font-size:10px">${subPct}%</span>`;
        leg.appendChild(subDiv);
      });
    }
  });
}

async function renderBarChart(meses) {
  const wrap  = document.getElementById('bar-chart-wrap');
  const empty = document.getElementById('bar-empty');
  if (!wrap) return;

  const [gastos, rendas] = await Promise.all([DB.gastos(), DB.rendas()]);
  const hoje = fmt.hoje();
  const resultado = [];

  for (let i = meses - 1; i >= 0; i--) {
    const mes       = fmt.mesOffset(-i);
    const [ano, m]  = mes.split('-').map(Number);
    const label     = new Date(ano, m - 1, 1).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

    const entradas = todasEntradasSync(rendas, mes + '-31')
      .filter(e => e.data.startsWith(mes) && e.data <= hoje)
      .reduce((a, e) => a + e.valor, 0);

    const saidas = gastos
      .filter(g => g.categoria !== 'cartao' && g.data.startsWith(mes))
      .reduce((a, g) => a + g.valor, 0);

    resultado.push({ label, entradas, saidas });
  }

  const temDados = resultado.some(r => r.entradas > 0 || r.saidas > 0);
  if (!temDados) {
    wrap.innerHTML = ''; empty.style.display = 'block'; return;
  }
  empty.style.display = 'none';

  // GroupBars HTML — igual ao componente GroupBars do handoff
  const max  = Math.max(1, ...resultado.flatMap(r => [r.entradas, r.saidas]));
  const nice = Math.ceil(max / 500) * 500;
  const ticks = [nice, nice * 0.75, nice * 0.5, nice * 0.25, 0];

  const yLabels = ticks.map(t =>
    `<span>${t >= 1000 ? (t / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'k' : t}</span>`
  ).join('');

  const gridLines = ticks.map(() => '<i></i>').join('');

  const cols = resultado.map(r => `
    <div class="gbar-col">
      <div class="gbar-pair">
        <div class="gbar-bar in"  style="height:${(r.entradas / nice) * 100}%" title="Entradas ${fmt.brl(r.entradas)}"></div>
        <div class="gbar-bar out" style="height:${(r.saidas   / nice) * 100}%" title="Saídas ${fmt.brl(r.saidas)}"></div>
      </div>
      <div class="gbar-x">${r.label}</div>
    </div>`).join('');

  wrap.innerHTML = `
    <div class="gbar-wrap">
      <div class="gbar-y">${yLabels}</div>
      <div class="gbar-plot">
        <div class="gbar-grid">${gridLines}</div>
        ${cols}
      </div>
    </div>`;
}

async function renderRendas() {
  const box   = document.getElementById('list-rendas');
  const hoje  = fmt.hoje();
  box.innerHTML = '';
  const rendas = await DB.rendas();
  if (rendas.length===0) { box.innerHTML='<p class="empty-msg">Nenhuma renda cadastrada.</p>'; return; }
  rendas.forEach(r=>{
    const row = document.createElement('div'); row.className='rowi';
    const recebido = r.tipo==='pontual'&&r.data<=hoje;
    const futuro   = r.tipo==='pontual'&&r.data>hoje;
    if (r.tipo==='pontual') {
      row.innerHTML=`
        <div class="tile" style="${recebido?'color:var(--ok)':'color:var(--txt3)'}">${recebido?ic('check-circle',16):ic('clock',16)}</div>
        <div class="r-main"><div class="r-name">${fmt.esc(r.nome)}</div><div class="r-meta">${fmt.dateLong(r.data)}</div></div>
        <div class="r-right">
          ${futuro?`<button class="btn-antecipar" onclick="receberAntecipado('${r.id}','${fmt.esc(r.nome)}',${r.valor})">Receber agora</button>`:''}
          <span class="pill ${recebido?'pill-ok':'pill-ac'}">${recebido?'Recebido':'A receber'}</span>
          <span class="r-val up">+ ${fmt.brl(r.valor)}</span>
          <div class="r-acts"><button class="icon-btn is-danger" onclick="deletarRenda('${r.id}')">${ic('trash-2',14)}</button></div>
        </div>
      `;
    } else {
      row.innerHTML=`
        <div class="tile">${ic('repeat',16)}</div>
        <div class="r-main"><div class="r-name">${fmt.esc(r.nome)}</div><div class="r-meta">Dia ${r.diaMes} · desde ${r.mesInicio}${r.mesFim?` até ${r.mesFim}`:' (indeterminado)'}</div></div>
        <div class="r-right">
          <span class="pill pill-ac">Regular</span>
          <span class="r-val up">+ ${fmt.brl(r.valor)}/mês</span>
          <div class="r-acts"><button class="icon-btn is-danger" onclick="deletarRenda('${r.id}')">${ic('trash-2',14)}</button></div>
        </div>
      `;
    }
    box.appendChild(row);
  });
  lcIcons(box);
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
        <span class="tile" style="width:32px;height:32px;border-radius:9px">${ic('credit-card',16)}</span>
        <div style="flex:1;min-width:0">
          <div class="parc-title" onclick="toggleParcela('${p.id}','${fmt.mesAtual()}')" title="Marcar/desmarcar mês atual">${fmt.esc(p.nome)}</div>
          <div style="font-size:.64rem;color:var(--txt3)">${p.numParcelas}x · ${fmt.brl(p.valorTotal)} total${diaStr}</div>
        </div>
        <span class="parc-val">${fmt.brl(p.valorParcela)}/mês</span>
        ${concl?'<span class="badge badge-green">Quitado</span>':''}
        <button class="btn-del" onclick="deletarParcelada('${p.id}')">${ic('trash-2',14)}</button>
      </div>
      <div class="prog" style="margin:8px 0 4px"><span style="width:${pct}%"></span></div>
      <div class="parc-meta"><span>${pagas} paga${pagas!==1?'s':''}</span><span>${p.numParcelas-pagas} restante${p.numParcelas-pagas!==1?'s':''}</span></div>
      <div class="parc-parcelas-list">${btns}</div>
    `;
    box.appendChild(card);
  });
  lcIcons(box);
}

async function renderFuturas() {
  const box  = document.getElementById('list-futuras');
  box.innerHTML = '';
  const lista = [...(await DB.futuras())].sort((a,b)=>a.data.localeCompare(b.data));
  if (lista.length===0) { box.innerHTML='<p class="empty-msg">Lista de desejos vazia. Sonhar é grátis, planejar também.</p>'; return; }
  lista.forEach(f=>{
    const diff = Math.ceil((new Date(f.data+'T12:00:00')-new Date())/86400000);
    const urgLabel = diff<=0?'Hoje!':diff===1?'Amanhã':`em ${diff} dias`;
    const wrap=document.createElement('div');
    wrap.setAttribute('data-futura-id', f.id);
    const row=document.createElement('div'); row.className='rowi';
    row.innerHTML=`
      <div class="tile" style="color:var(--c2)">${ic('shopping-bag',16)}</div>
      <div class="r-main"><div class="r-name">${fmt.esc(f.nome)}</div><div class="r-meta">${fmt.dateLong(f.data)}${f.obs?' · '+fmt.esc(f.obs):''}</div></div>
      <div class="r-right">
        <span class="pill ${diff<=7?'pill-warn':'pill-mut'}">${urgLabel}</span>
        <span class="r-val down">~ ${fmt.brl(f.valorEstimado)}</span>
        <button class="btn btn-soft btn-sm btn-realizar" onclick="toggleRealizarForm('${f.id}')">Realizar</button>
        <div class="r-acts"><button class="icon-btn is-danger" onclick="deletarFutura('${f.id}')">${ic('trash-2',14)}</button></div>
      </div>
    `;
    wrap.appendChild(row);
    box.appendChild(wrap);
  });
  lcIcons(box);
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
    const row=document.createElement('div'); row.className='rowi';
    row.innerHTML=`
      <div class="tile" style="${urgente?'color:var(--bad)':''}">${ic('refresh-cw',16)}</div>
      <div class="r-main">
        <div class="r-name">${fmt.esc(r.nome)} <span style="font-size:.62rem;color:var(--txt3);font-weight:400">${freqLabel}</span></div>
        <div class="r-meta" style="${urgente?'color:var(--bad)':''}">
          ${diff<=0?'Vencida':diff===1?'Amanhã':fmt.date(r.proximaData)}
        </div>
      </div>
      <div class="r-right">
        <span class="r-val down">${fmt.brl(r.valor)}</span>
        <div class="r-acts">
          <button class="icon-btn" style="color:var(--ok)" title="Marcar pago" onclick="pagarRecorrente('${r.id}')">${ic('check',14)}</button>
          <button class="icon-btn" style="color:var(--warn)" title="Desfazer último pagamento" onclick="desfazerRecorrente('${r.id}')">${ic('undo-2',14)}</button>
          <button class="icon-btn is-danger" onclick="deletarRecorrente('${r.id}')">${ic('trash-2',14)}</button>
        </div>
      </div>
    `;
    box.appendChild(row);
  });
  lcIcons(box);
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
    const row=document.createElement('div'); row.className='rowi';
    row.innerHTML=`
      <div class="tile" style="color:var(--ok)">${ic('check-circle',16)}</div>
      <div class="r-main"><div class="r-name">${fmt.esc(r.nome)}</div><div class="r-meta">${fmt.dateLong(r.data)}</div></div>
      <div class="r-right"><span class="r-val up">+ ${fmt.brl(r.valor)}</span></div>
    `;
    boxR.appendChild(row);
  });
  lcIcons(boxR);
}

function buildGastoItem(g) {
  const isCartao = g.categoria === 'cartao';
  const iconName = isCartao ? 'credit-card' : (CAT_ICONS[g.categoria]||'package');
  const badgeTxt = isCartao
    ? `Cartão${g.subcategoria ? ' · '+g.subcategoria : ''}`
    : g.categoria;
  const badgeCls = isCartao ? 'pill pill-ac' : 'pill pill-ac';
  const meta     = isCartao
    ? `${fmt.dateLong(g.data)} <span style="color:var(--ac);font-size:.75rem">(Pagamento apenas no próximo mês)</span>`
    : fmt.dateLong(g.data);
  const tileColor = CAT_COLORS[g.categoria] || 'var(--txt3)';

  const div = document.createElement('div'); div.className='rowi';
  div.innerHTML=`
    <div class="tile" style="color:${tileColor};border-color:color-mix(in oklab,${tileColor} 28%,transparent);background:color-mix(in oklab,${tileColor} 9%,transparent)">${ic(iconName,16)}</div>
    <div class="r-main"><div class="r-name">${fmt.esc(g.nome)}</div><div class="r-meta">${meta}</div></div>
    <div class="r-right">
      <span class="${badgeCls}">${fmt.esc(badgeTxt)}</span>
      <span class="r-val down">− ${fmt.brl(g.valor)}</span>
      <div class="r-acts"><button class="icon-btn is-danger" title="Excluir">${ic('trash-2',14)}</button></div>
    </div>
  `;
  div.querySelector('.icon-btn.is-danger').addEventListener('click', ()=>window.deletarGasto(g.id));
  lcIcons(div);
  return div;
}

async function renderAll() {
  await renderDashboard();
}


document.addEventListener('DOMContentLoaded', () => {

// Detecta link de reset de senha vindo do e-mail
  const hash = window.location.hash;
  if (hash.includes('type=recovery')) {
    document.getElementById('modal-nova-senha').classList.remove('hidden');
  }

  document.getElementById('btn-ns-save').addEventListener('click', async () => {
    const pass  = document.getElementById('ns-pass').value;
    const pass2 = document.getElementById('ns-pass2').value;
    const errEl = document.getElementById('ns-error');
    const btn   = document.getElementById('btn-ns-save');

    errEl.classList.add('hidden');
    if (pass.length < 8)  { errEl.textContent = 'Senha mín. 8 caracteres.'; errEl.classList.remove('hidden'); return; }
    if (pass !== pass2)   { errEl.textContent = 'Senhas não coincidem.';     errEl.classList.remove('hidden'); return; }

    btn.disabled = true; btn.textContent = 'Salvando...';

    const { error } = await _supa.auth.updateUser({ password: pass });

    btn.disabled = false; btn.textContent = 'Salvar nova senha';

    if (error) {
      errEl.textContent = 'Erro ao salvar. Tente novamente.';
      errEl.classList.remove('hidden');
    } else {
      toast('Senha alterada com sucesso!', 'success', 3500);
      setTimeout(() => {
        window.location.replace(window.location.pathname);
      }, 2000);
    }
  });

  initSupabase()
    .catch(err => {
      console.error("Erro Supabase:", err);
    })
    .finally(async () => {

      try {

        initTheme();
        initMiniThemeBtn();
        initAuth();
        initNav();
        initModalCatDetalhe();
        initModals();
        initNotificacoes();
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

        const { data: { session } } = await _supa.auth.getSession();

        if (session) {
          try {

            _userId = session.user.id;

            const { data: perfil } = await _supa
              .from('perfis')
              .select('nome, username')
              .eq('id', _userId)
              .single();

            if (perfil) {
              await openApp({ id: _userId, nome: perfil.nome, username: perfil.username });
            } else {
              await _supa.auth.signOut();
              showLoginScreen();
            }

          } catch (e) {
            console.error('Erro ao restaurar sessão:', e);
            await _supa.auth.signOut();
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