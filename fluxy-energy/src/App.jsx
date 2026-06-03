import { useState, useEffect, useRef } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, CalendarDays, User, LogOut, Droplet, Zap, ShowerHead, TrendingUp, Coins } from 'lucide-react';
import { supabase } from './supabaseClient';
import './App.css';

// --- COMPONENTE: Tela de Login ---
function TelaLogin({ onLogin }) {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && senha) onLogin();
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f4f4f9', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '380px', textAlign: 'center', border: '1px solid #ecf0f1' }}>
        <div style={{ backgroundColor: '#ebf5fb', width: '100px', height: '100px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
          <ShowerHead size={50} color="#3498db" />
        </div>
        <h1 style={{ color: '#2c3e50', margin: '0 0 5px 0', fontSize: '2rem' }}>FluxyEnergy</h1>
        <p style={{ color: '#7f8c8d', marginBottom: '35px', fontSize: '1.1rem' }}>Faça login para acessar o painel</p>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <input 
            type="email" placeholder="Seu E-mail (ex: upx@facens.br)" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '15px', borderRadius: '10px', border: '2px solid #bdc3c7', fontSize: '1.1rem', transition: '0.2s', outline: 'none' }}
          />
          <input 
            type="password" placeholder="Sua Senha" required
            value={senha} onChange={(e) => setSenha(e.target.value)}
            style={{ padding: '15px', borderRadius: '10px', border: '2px solid #bdc3c7', fontSize: '1.1rem', transition: '0.2s', outline: 'none' }}
          />
          <button type="submit" style={{ backgroundColor: '#3498db', color: 'white', padding: '15px', border: 'none', borderRadius: '10px', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold' }}>
            Entrar no Painel
          </button>
        </form>
      </div>
    </div>
  );
}

// --- COMPONENTE: Dashboard (Banho Ativo) ---
function TelaDashboard({ tarifaKwh, tarifaAgua }) {
  const [energiaAtual, setEnergiaAtual]   = useState(0);
  const [aguaAtual, setAguaAtual]         = useState(0);
  const [gastoEnergia, setGastoEnergia]   = useState(0);
  const [gastoAgua, setGastoAgua]         = useState(0);
  const [tempoBanho, setTempoBanho]       = useState(0);
  const [historico, setHistorico]         = useState([]);
  const [ligado, setLigado]               = useState(false);

  // Refs para cálculo de custo incremental
  const prevDadoRef    = useRef(null);
  const timerRef       = useRef(null);

  // ── Leitura inicial + realtime do Supabase ─────────────────────
  useEffect(() => {
    // Busca o registro mais recente
    const buscarUltimo = async () => {
      const { data, error } = await supabase
        .from('banho')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) aplicarDado(data);
    };

    buscarUltimo();

    // Escuta INSERT em tempo real
    const channel = supabase
      .channel('banho-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'banho' },
        (payload) => aplicarDado(payload.new)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ── Aplica novo dado vindo do Supabase ─────────────────────────
  const aplicarDado = (dado) => {
    const watts  = dado.potencia_w  ?? 0;
    const vazao  = dado.vazao_lmin  ?? 0;
    const duracao = dado.duracao_s  ?? 0;

    setEnergiaAtual(watts);
    setAguaAtual(vazao);
    setTempoBanho(duracao);
    setLigado(watts > 0);

    // Calcula custo acumulado com base na duração total
    const custoEnerg = ((watts / 1000) * (duracao / 3600)) * tarifaKwh;
    const custoAgua  = ((vazao / 60) / 1000) * duracao * tarifaAgua;
    setGastoEnergia(custoEnerg);
    setGastoAgua(custoAgua);

    // Adiciona ponto ao gráfico
    setHistorico((prev) => {
      const novoPonto = {
        tempo: `${duracao}s`,
        Watts: watts,
        Litros: vazao,
      };
      const novo = [...prev, novoPonto];
      return novo.length > 15 ? novo.slice(-15) : novo;
    });

    prevDadoRef.current = dado;
  };

  // ── Timer local para incrementar duração entre heartbeats ──────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (ligado) {
      timerRef.current = setInterval(() => {
        setTempoBanho((prev) => prev + 1);
      }, 1000);
    }

    return () => clearInterval(timerRef.current);
  }, [ligado]);

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60).toString().padStart(2, '0');
    const seg = (segundos % 60).toString().padStart(2, '0');
    return `${min}:${seg}`;
  };
  
  // ── Lógica para determinar o modo de temperatura ────────────────
  const obterTextoStatus = () => {
    if (!ligado) return 'Aguardando dados do Unity...';
    // Se a potência for maior que 4000W, assume modo Inverno, senão Verão.
    // Altere o valor de 4000 de acordo com as potências enviadas pelo Unity.
    return energiaAtual > 4000 
      ? `Chuveiro Ligado (Modo Inverno ❄️)` 
      : `Chuveiro Ligado (Modo Verão ☀️)`;
  };
  
  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.5rem' }}>Em Tempo Real 🚿⚡</h2>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Acompanhe o banho atual</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Duração do Banho</p>
          <strong style={{ color: '#e74c3c', fontSize: '2rem' }}>{formatarTempo(tempoBanho)}</strong>
        </div>
      </header>

      {/* Badge de status corrigido */}
<div style={{ marginBottom: '20px' }}>
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold',
    backgroundColor: ligado ? '#eafaf1' : '#fdecea',
    color: ligado ? '#27ae60' : '#e74c3c',
    border: `1px solid ${ligado ? '#27ae60' : '#e74c3c'}`
  }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: ligado ? '#27ae60' : '#e74c3c', display: 'inline-block' }} />
    
    {/* ADICIONE A CHAMADA DA FUNÇÃO AQUI: */}
    {obterTextoStatus()}
    
  </span>
</div>

      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <div className="card-responsivo" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', flex: 1, borderTop: '5px solid #f1c40f', minWidth: '200px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#f39c12', marginTop: 0, display: 'flex', alignItems: 'center', gap: '5px' }}><Zap size={20}/> Potência</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#2c3e50' }}>{energiaAtual} <span style={{ fontSize: '1rem', color: '#95a5a6' }}>W</span></p>
        </div>
        <div className="card-responsivo" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', flex: 1, borderTop: '5px solid #3498db', minWidth: '200px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#2980b9', marginTop: 0, display: 'flex', alignItems: 'center', gap: '5px' }}><Droplet size={20}/> Vazão</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#2c3e50' }}>{aguaAtual} <span style={{ fontSize: '1rem', color: '#95a5a6' }}>L/min</span></p>
        </div>
        <div className="card-responsivo" style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', flex: 1, borderTop: '5px solid #e74c3c', minWidth: '200px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#e74c3c', marginTop: 0 }}>Custo Atual</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#2c3e50' }}>R$ {(gastoEnergia + gastoAgua).toFixed(4)}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', height: '350px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px', fontSize: '1.1rem' }}>Histórico (Últimos 15s)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={historico} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
            <XAxis dataKey="tempo" style={{ fontSize: '0.8rem' }} />
            <YAxis yAxisId="esquerda" stroke="#f1c40f" domain={['auto', 'auto']} style={{ fontSize: '0.8rem' }} />
            <YAxis yAxisId="direita" orientation="right" stroke="#3498db" domain={['auto', 'auto']} style={{ fontSize: '0.8rem' }} />
            <Tooltip />
            <Legend wrapperStyle={{ paddingTop: '10px' }} />
            <Line yAxisId="esquerda" type="monotone" dataKey="Watts" stroke="#f1c40f" strokeWidth={3} isAnimationActive={false} dot={false} />
            <Line yAxisId="direita"  type="monotone" dataKey="Litros" stroke="#3498db" strokeWidth={3} isAnimationActive={false} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- COMPONENTE: Histórico Mensal ---
function TelaMensal() {
  const [dadosMensais, setDadosMensais] = useState([]);
  const [totais, setTotais]             = useState({ energia: 0, agua: 0, acumulado: 0, projecao: 0 });
  const [carregando, setCarregando]     = useState(true);

  const TARIFA_KWH  = 0.95;
  const TARIFA_AGUA = 5.00; // R$/m³

  useEffect(() => {
    const buscarDados = async () => {
      setCarregando(true);

      // Busca todas as sessões salvas
      const { data, error } = await supabase
        .from('banho')
        .select('potencia_w, vazao_lmin, duracao_s, custo_rs, mes, created_at')
        .order('created_at', { ascending: true });

      if (error || !data) { setCarregando(false); return; }

      // Agrupa por mês
      const porMes = {};
      data.forEach((row) => {
        const mes = row.mes ?? row.created_at?.slice(0, 7) ?? 'N/A';
        if (!porMes[mes]) porMes[mes] = { energia: 0, agua: 0 };

        const duracaoH = (row.duracao_s ?? 0) / 3600;
        const watts    = row.potencia_w ?? 0;
        const vazao    = row.vazao_lmin ?? 0;

        porMes[mes].energia += ((watts / 1000) * duracaoH) * TARIFA_KWH;
        porMes[mes].agua    += ((vazao / 60) / 1000) * (row.duracao_s ?? 0) * TARIFA_AGUA;
      });

      const mesesLabel = {
        '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
        '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
        '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez',
      };

      const mesAtual = new Date().toISOString().slice(0, 7);
      const grafico = Object.entries(porMes).map(([mes, vals]) => ({
        mes: mes === mesAtual
          ? `${mesesLabel[mes.slice(5)] ?? mes} (Atual)`
          : (mesesLabel[mes.slice(5)] ?? mes),
        Energia: +vals.energia.toFixed(2),
        Agua:    +vals.agua.toFixed(2),
      }));

      setDadosMensais(grafico);

      // Totais do mês atual
      const atual = porMes[mesAtual] ?? { energia: 0, agua: 0 };
      const diasNoMes = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
      const diaAtual  = new Date().getDate();
      const fator     = diasNoMes / diaAtual;

      setTotais({
        energia:   atual.energia,
        agua:      atual.agua,
        acumulado: atual.energia + atual.agua,
        projecao:  (atual.energia + atual.agua) * fator,
      });

      setCarregando(false);
    };

    buscarDados();
  }, []);

  const estiloCard = {
    backgroundColor: 'white', padding: '20px', borderRadius: '15px',
    flex: 1, minWidth: '140px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
    border: '1px solid #ecf0f1'
  };

  if (carregando) return <p style={{ color: '#7f8c8d' }}>Carregando dados...</p>;

  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <header style={{ marginBottom: '35px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.5rem' }}>Mês Atual 📅</h2>
        <p style={{ color: '#7f8c8d', margin: 0, fontSize: '1rem' }}>
          Desdobramento dos custos em {new Date().toLocaleString('pt-BR', { month: 'long' })}
        </p>
      </header>

      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <div className="card-responsivo" style={{ ...estiloCard, borderTop: '5px solid #f1c40f' }}>
          <h3 style={{ color: '#f39c12', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}><Zap size={16}/> Energia</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}>R$ {totais.energia.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="card-responsivo" style={{ ...estiloCard, borderTop: '5px solid #3498db' }}>
          <h3 style={{ color: '#2980b9', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}><Droplet size={16}/> Água</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}>R$ {totais.agua.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="card-responsivo" style={{ ...estiloCard, borderTop: '5px solid #2c3e50' }}>
          <h3 style={{ color: '#2c3e50', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}><Coins size={16}/> Acumulado</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}>R$ {totais.acumulado.toFixed(2).replace('.', ',')}</p>
        </div>
        <div className="card-responsivo" style={{ ...estiloCard, backgroundColor: '#fdfefe', borderTop: '5px solid #27ae60' }}>
          <h3 style={{ color: '#27ae60', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem' }}><TrendingUp size={16}/> Projeção</h3>
          <p style={{ fontSize: '1.8rem', fontWeight: 'bold', margin: 0, color: '#27ae60' }}>R$ {totais.projecao.toFixed(2).replace('.', ',')}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', height: '350px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #ecf0f1' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px', fontSize: '1.1rem' }}>Comparativo por Mês (R$)</h3>
        {dadosMensais.length === 0
          ? <p style={{ color: '#7f8c8d', textAlign: 'center', paddingTop: '60px' }}>Nenhuma sessão registrada ainda.</p>
          : (
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={dadosMensais} margin={{ top: 20, right: 0, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" vertical={false} />
                <XAxis dataKey="mes" stroke="#95a5a6" style={{ fontSize: '0.8rem' }} />
                <YAxis stroke="#95a5a6" style={{ fontSize: '0.8rem' }} />
                <Tooltip cursor={{ fill: '#f4f6f7' }} />
                <Legend wrapperStyle={{ paddingTop: '10px' }} />
                <Bar dataKey="Energia" fill="#f1c40f" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Agua"    fill="#3498db" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )
        }
      </div>
    </div>
  );
}

// --- COMPONENTE: Conta ---
function TelaConta({ tarifaKwh, setTarifaKwh, tarifaAgua, setTarifaAgua }) {
  const estiloInput = {
    padding: '12px', width: '100%', borderRadius: '10px',
    border: '2px solid #bdc3c7', fontSize: '1.1rem', transition: '0.3s',
    outline: 'none', fontWeight: 'bold', color: '#2c3e50'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <header style={{ marginBottom: '35px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.5rem' }}>Minha Conta 👤</h2>
        <p style={{ color: '#7f8c8d', margin: 0, fontSize: '1rem' }}>Gerencie suas tarifas locais</p>
      </header>

      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '20px', maxWidth: '650px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #ecf0f1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '25px', paddingBottom: '25px', borderBottom: '2px solid #ecf0f1' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#3498db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={40} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.5rem' }}>Usuário UPx</h3>
            <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '1rem', wordBreak: 'break-all' }}>upx@facens.br</p>
          </div>
        </div>

        <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.2rem' }}>Configurações de Tarifa</h3>
        <p style={{ color: '#7f8c8d', fontSize: '0.9rem', marginBottom: '25px' }}>
          Atualize os valores abaixo baseados na sua conta. Eles mudarão o cálculo em tempo real instantaneamente.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2c3e50', fontWeight: '600', marginBottom: '10px', fontSize: '1rem' }}>
              <Zap size={18} color="#f39c12"/> Preço do kWh (R$)
            </label>
            <input
              type="number" step="0.01" min="0" value={tarifaKwh}
              onChange={(e) => setTarifaKwh(Number(e.target.value))}
              style={estiloInput}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2c3e50', fontWeight: '600', marginBottom: '10px', fontSize: '1rem' }}>
              <Droplet size={18} color="#3498db"/> Preço do m³ (R$)
            </label>
            <input
              type="number" step="0.01" min="0" value={tarifaAgua}
              onChange={(e) => setTarifaAgua(Number(e.target.value))}
              style={estiloInput}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- COMPONENTE PRINCIPAL ---
function App() {
  const [logado, setLogado]       = useState(false);
  const [telaAtiva, setTelaAtiva] = useState('dashboard');
  const [tarifaKwh, setTarifaKwh]   = useState(0.95);
  const [tarifaAgua, setTarifaAgua] = useState(5.00);

  if (!logado) return <TelaLogin onLogin={() => setLogado(true)} />;

  const getEstiloBotao = (tela) => ({
    display: 'flex', alignItems: 'center', gap: '12px', padding: '15px',
    backgroundColor: telaAtiva === tela ? '#3e5871' : 'transparent',
    color: telaAtiva === tela ? 'white' : '#bdc3c7',
    border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem',
    textAlign: 'left', transition: '0.2s', fontWeight: telaAtiva === tela ? 'bold' : '500'
  });

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '40px' }}>
          <ShowerHead size={30} color="#3498db" />
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>FluxyEnergy</h2>
        </div>

        <nav className="sidebar-nav">
          <button style={getEstiloBotao('dashboard')} onClick={() => setTelaAtiva('dashboard')}>
            <LayoutDashboard size={22} /> <span className="hide-mobile">Banho Ativo</span>
          </button>
          <button style={getEstiloBotao('mensal')} onClick={() => setTelaAtiva('mensal')}>
            <CalendarDays size={22} /> <span className="hide-mobile">Mês Atual</span>
          </button>
          <button style={getEstiloBotao('conta')} onClick={() => setTelaAtiva('conta')}>
            <User size={22} /> <span className="hide-mobile">Minha Conta</span>
          </button>
          <button
            className="hide-desktop"
            onClick={() => setLogado(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', fontWeight: 'bold' }}
          >
            <LogOut size={22} />
          </button>
        </nav>

        <div className="hide-mobile" style={{ borderTop: '2px solid #3e5871', paddingTop: '20px', marginTop: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', color: '#bdc3c7' }}>
            <User size={20} />
            <span>upx@facens.br</span>
          </div>
          <button
            onClick={() => setLogado(false)}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1rem', width: '100%', fontWeight: 'bold' }}
          >
            <LogOut size={22} /> Sair do Sistema
          </button>
        </div>
      </aside>

      <main className="main-content">
        {telaAtiva === 'dashboard' && <TelaDashboard tarifaKwh={tarifaKwh} tarifaAgua={tarifaAgua} />}
        {telaAtiva === 'mensal'    && <TelaMensal />}
        {telaAtiva === 'conta'     && <TelaConta tarifaKwh={tarifaKwh} setTarifaKwh={setTarifaKwh} tarifaAgua={tarifaAgua} setTarifaAgua={setTarifaAgua} />}
      </main>
    </div>
  );
}

export default App;