import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { LayoutDashboard, CalendarDays, User, LogOut, Droplet, Zap, ShowerHead, TrendingUp, Coins } from 'lucide-react';
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
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f4f4f9', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '20px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '380px', textAlign: 'center', border: '1px solid #ecf0f1' }}>
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
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
          />
          <input 
            type="password" placeholder="Sua Senha" required
            value={senha} onChange={(e) => setSenha(e.target.value)}
            style={{ padding: '15px', borderRadius: '10px', border: '2px solid #bdc3c7', fontSize: '1.1rem', transition: '0.2s', outline: 'none' }}
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
          />
          <button type="submit" style={{ backgroundColor: '#3498db', color: 'white', padding: '15px', border: 'none', borderRadius: '10px', fontSize: '1.2rem', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s', boxShadow: '0 4px 6px rgba(52, 152, 219, 0.2)' }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#2980b9'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#3498db'}
          >
            Entrar no Painel
          </button>
        </form>
      </div>
    </div>
  );
}

// --- COMPONENTE: Dashboard (VOLTOU AO ESTILO COMPACTO ORIGINAL) ---
function TelaDashboard({ tarifaKwh, tarifaAgua }) {
  const [status, setStatus] = useState('Ligado');
  const [tempoBanho, setTempoBanho] = useState(0); 
  const [energiaAtual, setEnergiaAtual] = useState(0);
  const [aguaAtual, setAguaAtual] = useState(0);
  const [gastoEnergia, setGastoEnergia] = useState(0);
  const [gastoAgua, setGastoAgua] = useState(0);
  const [historico, setHistorico] = useState([]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      if (status === 'Ligado') {
        const novaEnergia = Math.floor(Math.random() * (5500 - 5200 + 1)) + 5200; 
        const novaAgua = +(Math.random() * (8.6 - 8.4) + 8.4).toFixed(1); 

        setEnergiaAtual(novaEnergia);
        setAguaAtual(novaAgua);
        
        const custoEnergiaSegundo = ((novaEnergia / 1000) * (1 / 3600)) * tarifaKwh;
        const custoAguaSegundo = ((novaAgua / 60) / 1000) * tarifaAgua;
        
        setGastoEnergia((prev) => prev + custoEnergiaSegundo);
        setGastoAgua((prev) => prev + custoAguaSegundo);

        setTempoBanho((prevTempo) => prevTempo + 1);

        setHistorico((prevHist) => {
          const ultimoSegundo = prevHist.length > 0 ? parseInt(prevHist[prevHist.length - 1].tempo) : 0;
          const novoSegundo = ultimoSegundo + 1;
          const novoDado = { tempo: novoSegundo + 's', Watts: novaEnergia, Litros: novaAgua };
          const novoHistorico = [...prevHist, novoDado];
          return novoHistorico.length > 15 ? novoHistorico.slice(1) : novoHistorico;
        });
      }
    }, 1000);
    return () => clearInterval(intervalo);
  }, [status, tarifaKwh, tarifaAgua]);

  const formatarTempo = (segundos) => {
    const min = Math.floor(segundos / 60).toString().padStart(2, '0');
    const seg = (segundos % 60).toString().padStart(2, '0');
    return `${min}:${seg}`;
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <header style={{ marginBottom: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#2c3e50', margin: 0 }}>Monitoramento em Tempo Real 🚿⚡</h2>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Acompanhe o banho atual</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ color: '#7f8c8d', margin: 0 }}>Duração do Banho</p>
          <strong style={{ color: '#e74c3c', fontSize: '2rem' }}>{formatarTempo(tempoBanho)}</strong>
        </div>
      </header>

      {/* Cards Originais (3 em uma linha só) */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', flex: 1, borderTop: '5px solid #f1c40f', minWidth: '200px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#f39c12', marginTop: 0, display: 'flex', alignItems: 'center', gap: '5px' }}><Zap size={20}/> Potência Atual</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#2c3e50' }}>{energiaAtual} <span style={{ fontSize: '1rem', color: '#95a5a6' }}>W</span></p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', flex: 1, borderTop: '5px solid #3498db', minWidth: '200px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#2980b9', marginTop: 0, display: 'flex', alignItems: 'center', gap: '5px' }}><Droplet size={20}/> Vazão Atual</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#2c3e50' }}>{aguaAtual} <span style={{ fontSize: '1rem', color: '#95a5a6' }}>L/min</span></p>
        </div>
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', flex: 1, borderTop: '5px solid #e74c3c', minWidth: '200px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#e74c3c', marginTop: 0 }}>Custo Deste Banho</h3>
          <p style={{ fontSize: '2rem', fontWeight: 'bold', margin: '10px 0', color: '#2c3e50' }}>R$ {(gastoEnergia + gastoAgua).toFixed(4)}</p>
        </div>
      </div>

      <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', height: '350px', boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px' }}>Histórico (Últimos 15s)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={historico} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" />
            <XAxis dataKey="tempo" />
            <YAxis yAxisId="esquerda" stroke="#f1c40f" domain={['auto', 'auto']} />
            <YAxis yAxisId="direita" orientation="right" stroke="#3498db" domain={['auto', 'auto']} />
            <Tooltip />
            <Legend />
            <Line yAxisId="esquerda" type="monotone" dataKey="Watts" stroke="#f1c40f" strokeWidth={3} isAnimationActive={false} />
            <Line yAxisId="direita" type="monotone" dataKey="Litros" stroke="#3498db" strokeWidth={3} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- COMPONENTE: Histórico Mensal (AGORA SIM, COM A SEPARAÇÃO DE GASTOS!) ---
function TelaMensal() {
  // Dados mensais separados por Energia e Água
  const dadosMensais = [
    { mes: 'Jan', Energia: 15.50, Agua: 30.00 },
    { mes: 'Fev', Energia: 18.30, Agua: 34.00 },
    { mes: 'Mar', Energia: 16.10, Agua: 32.00 },
    { mes: 'Abr', Energia: 20.00, Agua: 40.00 },
    { mes: 'Mai (Atual)', Energia: 8.40, Agua: 17.00 },
  ];

  const estiloCard = {
    backgroundColor: 'white', padding: '20px', borderRadius: '15px', 
    flex: 1, minWidth: '150px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', 
    border: '1px solid #ecf0f1'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <header style={{ marginBottom: '35px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.8rem' }}>Relatório do Mês Atual 📅</h2>
        <p style={{ color: '#7f8c8d', margin: 0, fontSize: '1.1rem' }}>Desdobramento dos custos do chuveiro em Maio</p>
      </header>

      {/* Cards de Gasto Separados */}
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
        
        <div style={{ ...estiloCard, borderTop: '5px solid #f1c40f' }}>
          <h3 style={{ color: '#f39c12', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem' }}><Zap size={18}/> Gasto Energia</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}><span style={{fontSize: '1.2rem', color: '#95a5a6'}}>R$</span> 8,40</p>
        </div>

        <div style={{ ...estiloCard, borderTop: '5px solid #3498db' }}>
          <h3 style={{ color: '#2980b9', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem' }}><Droplet size={18}/> Gasto Água</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}><span style={{fontSize: '1.2rem', color: '#95a5a6'}}>R$</span> 17,00</p>
        </div>

        <div style={{ ...estiloCard, borderTop: '5px solid #2c3e50' }}>
          <h3 style={{ color: '#2c3e50', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem' }}><Coins size={18}/> Total Acumulado</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: '#2c3e50' }}><span style={{fontSize: '1.2rem', color: '#95a5a6'}}>R$</span> 25,40</p>
        </div>

        <div style={{ ...estiloCard, backgroundColor: '#fdfefe', borderTop: '5px solid #27ae60' }}>
          <h3 style={{ color: '#27ae60', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '1rem' }}><TrendingUp size={18}/> Projeção Final</h3>
          <p style={{ fontSize: '2.2rem', fontWeight: 'bold', margin: 0, color: '#27ae60' }}><span style={{fontSize: '1.2rem'}}>R$</span> 58,90</p>
        </div>

      </div>

      {/* Gráfico de Barras Lado a Lado (Energia vs Água) */}
      <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '18px', height: '400px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', border: '1px solid #ecf0f1' }}>
        <h3 style={{ color: '#2c3e50', marginTop: 0, marginBottom: '20px', fontSize: '1.2rem' }}>Comparativo por Mês (Energia vs Água)</h3>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={dadosMensais} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ecf0f1" vertical={false} />
            <XAxis dataKey="mes" stroke="#95a5a6" style={{fontSize: '0.9rem'}} />
            <YAxis stroke="#95a5a6" style={{fontSize: '0.9rem'}} />
            <Tooltip cursor={{fill: '#f4f6f7'}} contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }} />
            <Legend wrapperStyle={{paddingTop: '10px'}} />
            
            {/* Barras Lado a Lado */}
            <Bar dataKey="Energia" fill="#f1c40f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Agua" fill="#3498db" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// --- COMPONENTE: Conta ---
function TelaConta({ tarifaKwh, setTarifaKwh, tarifaAgua, setTarifaAgua }) {
  const estiloInput = {
    padding: '15px', width: '100%', borderRadius: '10px', 
    border: '2px solid #bdc3c7', fontSize: '1.2rem', transition: '0.3s', 
    outline: 'none', fontWeight: 'bold', color: '#2c3e50'
  };

  return (
    <div style={{ animation: 'fadeIn 0.5s' }}>
      <header style={{ marginBottom: '35px' }}>
        <h2 style={{ color: '#2c3e50', margin: 0, fontSize: '1.8rem' }}>Minha Conta 👤</h2>
        <p style={{ color: '#7f8c8d', margin: 0, fontSize: '1.1rem' }}>Gerencie seus dados e atualize as tarifas locais</p>
      </header>

      <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '20px', maxWidth: '650px', boxShadow: '0 10px 25px rgba(0,0,0,0.02)', border: '1px solid #ecf0f1' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '25px', marginBottom: '35px', paddingBottom: '25px', borderBottom: '2px solid #ecf0f1' }}>
          <div style={{ width: '100px', height: '100px', backgroundColor: '#3498db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={50} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#2c3e50', fontSize: '1.8rem' }}>Usuário UPx</h3>
            <p style={{ margin: '5px 0 0 0', color: '#7f8c8d', fontSize: '1.1rem' }}>upx@facens.br</p>
          </div>
        </div>

        <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '1.3rem' }}>Configurações de Tarifa da Região</h3>
        <p style={{ color: '#7f8c8d', fontSize: '1rem', marginBottom: '25px' }}>
          Atualize os valores abaixo baseados na sua conta de energia/água. Eles mudarão o cálculo na tela de monitoramento em tempo real instantaneamente.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2c3e50', fontWeight: '600', marginBottom: '10px', fontSize: '1rem' }}>
              <Zap size={20} color="#f39c12"/> Preço do kWh de Energia (R$)
            </label>
            <input 
              type="number" step="0.01" min="0"
              value={tarifaKwh} 
              onChange={(e) => setTarifaKwh(Number(e.target.value))}
              style={estiloInput} 
              onFocus={(e) => e.target.style.borderColor = '#f1c40f'}
              onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#2c3e50', fontWeight: '600', marginBottom: '10px', fontSize: '1rem' }}>
              <Droplet size={20} color="#3498db"/> Preço do m³ de Água (R$)
            </label>
            <input 
              type="number" step="0.01" min="0"
              value={tarifaAgua} 
              onChange={(e) => setTarifaAgua(Number(e.target.value))}
              style={estiloInput} 
              onFocus={(e) => e.target.style.borderColor = '#3498db'}
              onBlur={(e) => e.target.style.borderColor = '#bdc3c7'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}


// --- COMPONENTE PRINCIPAL (Roteador e Layout) ---
function App() {
  const [logado, setLogado] = useState(false);
  const [telaAtiva, setTelaAtiva] = useState('dashboard');

  const [tarifaKwh, setTarifaKwh] = useState(0.95);
  const [tarifaAgua, setTarifaAgua] = useState(5.00);

  if (!logado) {
    return <TelaLogin onLogin={() => setLogado(true)} />;
  }

  const getEstiloBotao = (tela) => ({
    display: 'flex', alignItems: 'center', gap: '12px', width: '100%', padding: '15px 20px', 
    backgroundColor: telaAtiva === tela ? '#3e5871' : 'transparent',
    color: telaAtiva === tela ? 'white' : '#bdc3c7',
    border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1.1rem',
    textAlign: 'left', transition: '0.2s', marginBottom: '8px', fontWeight: telaAtiva === tela ? 'bold' : '500'
  });

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#f4f4f9', fontFamily: 'sans-serif', overflow: 'hidden' }}>
      
      {/* Menu Lateral */}
      <aside style={{ width: '280px', backgroundColor: '#2c3e50', padding: '30px', display: 'flex', flexDirection: 'column', color: 'white', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '50px', padding: '10px' }}>
          <ShowerHead size={35} color="#3498db" />
          <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800' }}>FluxyEnergy </h2>
        </div>

        <nav style={{ flex: 1 }}>
          <button style={getEstiloBotao('dashboard')} onClick={() => setTelaAtiva('dashboard')}>
            <LayoutDashboard size={22} /> Banho Ativo
          </button>
          <button style={getEstiloBotao('mensal')} onClick={() => setTelaAtiva('mensal')}>
            <CalendarDays size={22} /> Mês Atual
          </button>
          <button style={getEstiloBotao('conta')} onClick={() => setTelaAtiva('conta')}>
            <User size={22} /> Minha Conta
          </button>
        </nav>

        <div style={{ borderTop: '2px solid #3e5871', paddingTop: '20px', marginTop: '20px' }}>
            
            <button 
                onClick={() => setLogado(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px', backgroundColor: '#c0392b', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '1.1rem', width: '100%', fontWeight: 'bold', transition: '0.2s' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#e74c3c'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#c0392b'}
            >
                <LogOut size={22} /> Sair do Sistema
            </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '40px 60px', overflowY: 'auto' }}>
        {telaAtiva === 'dashboard' && <TelaDashboard tarifaKwh={tarifaKwh} tarifaAgua={tarifaAgua} />}
        {telaAtiva === 'mensal' && <TelaMensal />}
        {telaAtiva === 'conta' && <TelaConta tarifaKwh={tarifaKwh} setTarifaKwh={setTarifaKwh} tarifaAgua={tarifaAgua} setTarifaAgua={setTarifaAgua} />}
      </main>

    </div>
  );
}

export default App;