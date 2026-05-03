import streamlit as st
import pandas as pd
import numpy as np
import time
import requests # <--- Importe
from datetime import datetime

# --- Configuração da Página ---
st.set_page_config(
    page_title="PowerTrack Simulação",
    page_icon="⚡️",
    layout="wide"
)

st.title("⚡️ PowerTrack: Gêmeo Digital (Simulador)")
st.caption(f"Lendo dados em tempo real da simulação (via API) | {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")

# --- NOVO: Input do Limite de Consumo ---
# Este st.number_input fica FORA do loop 'while', então ele só é desenhado uma vez.
limite_w = st.number_input(
    label="Defina seu limite de consumo total (W):",
    min_value=0,
    value=5000, # Vamos definir um padrão de 5000W
    step=100,
    help="Defina um valor em Watts. Um aviso será exibido se o consumo total ultrapassar este limite."
)

# --- NOVA FUNÇÃO: Buscar dados da API Flask ---
def buscar_dados_reais():
    try:
        # Faz uma requisição GET para a API que está rodando
        response = requests.get("http://127.0.0.1:5000/data")
        
        if response.status_code == 200:
            dados = response.json()
            
            # Formata os dados para o dataframe
            df_dados = pd.DataFrame({
                'Timestamp': [datetime.now()],
                'Quarto Principal (W)': [dados.get("quarto", 0)],
                'Cozinha (W)': [dados.get("cozinha", 0)],
                'Chuveiro (W)': [dados.get("chuveiro", 0)],
                'Iluminação/Geral (W)': [dados.get("iluminacao_geral", 0)],
                'Consumo Total (W)': [dados.get("total", 0)]
            })
            return df_dados
        
    except requests.exceptions.ConnectionError:
        # Retorna dados vazios se a API não estiver rodando
        st.error("Erro: Não foi possível conectar à API de simulação (api.py). Por favor, execute 'flask --app api run' em outro terminal.")
        return pd.DataFrame(columns=[
            'Timestamp', 'Quarto Principal (W)', 'Cozinha (W)', 
            'Chuveiro (W)', 'Iluminação/Geral (W)', 'Consumo Total (W)'
        ])

# --- Inicialização do Histórico ---
if 'dados_historico' not in st.session_state:
    st.session_state.dados_historico = pd.DataFrame(columns=[
        'Timestamp', 'Quarto Principal (W)', 'Cozinha (W)', 
        'Chuveiro (W)', 'Iluminação/Geral (W)', 'Consumo Total (W)'
    ])

# --- Layout do Dashboard ---
placeholder_aviso = st.empty() # <--- NOVO: Placeholder para o aviso de limite
placeholder_metricas = st.empty()
placeholder_grafico = st.empty()

while True:
    # 1. Obter novos dados (agora da API)
    novos_dados = buscar_dados_reais()
    
    # 2. Atualizar o histórico (só se os dados não estiverem vazios)
    if not novos_dados.empty:
        st.session_state.dados_historico = pd.concat(
            [st.session_state.dados_historico, novos_dados], 
            ignore_index=True
        )
        st.session_state.dados_historico = st.session_state.dados_historico.tail(100)
    
        # 3. Pegar o último registro para as métricas
        dados_atuais = novos_dados.iloc[0]

        # --- NOVO: Lógica para checar o limite ---
        consumo_total_atual = dados_atuais['Consumo Total (W)']
        with placeholder_aviso.container():
            if consumo_total_atual > limite_w:
                st.warning(f"⚠️ **ALERTA!** Consumo atual ({consumo_total_atual:.0f} W) ultrapassou o limite de {limite_w:.0f} W!")
            else:
                # Se o consumo estiver abaixo, o placeholder fica vazio
                st.empty()

        # --- Atualizar as Métricas ---
        with placeholder_metricas.container():
            st.subheader("Consumo em Tempo Real por Cômodo/Setor")
            col1, col2, col3, col4, col5 = st.columns(5)
            
            col1.metric(label="🔌 Consumo Total", value=f"{consumo_total_atual:.0f} W") 
            col2.metric(label="🛏️ Quarto Principal", value=f"{dados_atuais['Quarto Principal (W)']:.0f} W")
            col3.metric(label="🍳 Cozinha", value=f"{dados_atuais['Cozinha (W)']:.0f} W")
            col4.metric(label="🚿 Chuveiro", value=f"{dados_atuais['Chuveiro (W)']:.0f} W")
            col5.metric(label="💡 Iluminação/Geral", value=f"{dados_atuais['Iluminação/Geral (W)']:.0f} W")

        # --- Atualizar o Gráfico ---
        with placeholder_grafico.container():
            st.subheader("Histórico de Consumo")
            df_grafico = st.session_state.dados_historico.melt(
                id_vars='Timestamp', 
                var_name='Circuito', 
                value_name='Consumo (W)'
            )
            df_grafico = df_grafico[df_grafico['Circuito'] != 'Consumo Total (W)']

            st.line_chart(
                df_grafico,
                x='Timestamp',
                y='Consumo (W)',
                color='Circuito'
            )

    # A frequência de atualização do seu projeto [cite: 92]
    # No nosso caso, 1 segundo fica mais dinâmico para a simulação
    time.sleep(1)