# 🚿 FluxyEnergy - Monitoramento Inteligente de Chuveiro

Este projeto é um dashboard interativo desenvolvido em **React** para o monitoramento e cálculo de gastos com água e energia elétrica de um chuveiro em tempo real. [cite_start]O projeto foi criado para a disciplina de Usina de Projetos Experimentais (UPx) do Centro Universitário Facens.

## 🎯 Objetivo
[cite_start]Simular o "painel digital" que o usuário final utilizaria para monitorar o seu consumo no banho, apresentando métricas convertidas para Reais (R$) de forma instantânea, sem a necessidade de expor os alunos aos riscos do hardware físico (alta tensão)[cite: 285, 286]. 

Os dados que alimentam este dashboard (Potência e Vazão) são originados de uma simulação física construída separadamente na engine **Unity**.

## 🛠 Tecnologias Utilizadas
* **React + Vite:** Para a construção rápida de uma interface web rápida e responsiva.
* **Recharts:** Para a renderização dos gráficos dinâmicos de histórico de consumo.
* **Lucide React:** Para a iconografia moderna do painel.
* **Supabase (Backend/Database):** Planejado para fazer a comunicação em tempo real entre a simulação na Unity e este dashboard em React.

## 🚀 Como Executar Localmente

1. Certifique-se de ter o Node.js instalado.
2. Clone este repositório.
3. Instale as dependências executando:
   ```bash
   npm install