using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

public class EnviarDados : MonoBehaviour
{
    [Header("Configuração do Circuito")]
    public string circuito = "cozinha";
    public string dispositivoId = "geladeira";
    public float wattage = 250f;

    [Header("Configuração Visual")]
    public Renderer luzIndicadora; // O objeto que vai mudar de cor (LED)
    public Color corLigado = Color.green;
    public Color corDesligado = Color.red;
    
    private bool isOn = false;

    void Start()
    {
        // Garante que a luz comece com a cor de "Desligado"
        if (luzIndicadora != null)
        {
            luzIndicadora.material.color = corDesligado;
        }
    }

    public void ToggleState()
    {
        isOn = !isOn;
        float currentWattage = isOn ? wattage : 0f;
        
        // --- MUDANÇA VISUAL ---
        if (luzIndicadora != null)
        {
            // Se estiver ligado, fica Verde. Se desligado, Vermelho.
            luzIndicadora.material.color = isOn ? corLigado : corDesligado;
        }
        
        Debug.Log($"Toggle {dispositivoId}: {currentWattage}W");
        StartCoroutine(SendData(circuito, dispositivoId, currentWattage));
    }

    IEnumerator SendData(string circuitoId, string devId, float valor)
    {
        WWWForm form = new WWWForm();
        form.AddField("circuito", circuitoId);
        form.AddField("dispositivo_id", devId);
        form.AddField("wattage", valor.ToString());

        using (UnityWebRequest www = UnityWebRequest.Post("http://127.0.0.1:5000/update", form))
        {
            yield return www.SendWebRequest();
        }
    }
}
