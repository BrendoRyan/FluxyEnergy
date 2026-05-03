from flask import Flask, request, jsonify
import threading
import pprint # Para logar melhor

app = Flask(__name__)

# --- NOVA ESTRUTURA DE DADOS ---
# Agora, armazenamos o estado de cada DISPOSITIVO
# Ex: { "cozinha": {"microondas": 1400, "geladeira": 250}, "chuveiro": {"chuveiro_1": 5500} }
estado_dos_dispositivos = {
    "quarto": {},
    "cozinha": {},
    "chuveiro": {},
    "iluminacao_geral": {}
}

# Lock para evitar problemas de concorrência
data_lock = threading.Lock()

# Rota [POST] /update
# O Unity vai enviar dados para cá
@app.route('/update', methods=['POST'])
def update_data():
    with data_lock:
        try:
            circuito = request.form['circuito']
            dispositivo_id = request.form['dispositivo_id']
            wattage = float(request.form['wattage'])
            
            # Garante que o circuito existe no dicionário
            if circuito not in estado_dos_dispositivos:
                estado_dos_dispositivos[circuito] = {}
                
            # Atualiza o wattage daQUELE dispositivo específico
            estado_dos_dispositivos[circuito][dispositivo_id] = wattage
            
            print("--- Estado Atualizado ---")
            pprint.pprint(estado_dos_dispositivos)
            
            return jsonify({"status": "sucesso"})
            
        except Exception as e:
            return jsonify({"status": "erro", "mensagem": str(e)}), 400

# Rota [GET] /data
# O Streamlit vai ler os dados daqui
@app.route('/data', methods=['GET'])
def get_data():
    with data_lock:
        # --- NOVA LÓGICA DE SOMA ---
        # Agora, calculamos os totais SOMANDO os dispositivos de cada circuito
        
        total_cozinha = sum(estado_dos_dispositivos.get("cozinha", {}).values())
        total_quarto = sum(estado_dos_dispositivos.get("quarto", {}).values())
        total_chuveiro = sum(estado_dos_dispositivos.get("chuveiro", {}).values())
        total_geral = sum(estado_dos_dispositivos.get("iluminacao_geral", {}).values())
        
        total_consumo = total_cozinha + total_quarto + total_chuveiro + total_geral

        # Retorna o JSON com os totais somados
        return jsonify({
            "quarto": total_quarto,
            "cozinha": total_cozinha,
            "chuveiro": total_chuveiro,
            "iluminacao_geral": total_geral,
            "total": total_consumo
        })

# --- Como rodar esta API ---
# 1. Abra um terminal
# 2. Digite: python3 -m flask --app api run
# 3. Deixe este terminal rodando
if __name__ == '__main__':
    app.run(debug=True)
