using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

/// <summary>
/// Controla um dispositivo do banheiro (chuveiro / torneira / etc.)
/// e envia para a API Flask:
///   - wattage    : potencia em W
///   - vazao_lpm  : vazao em litros/minuto
///
/// Pode ser usado em qualquer interruptor - o jogador clica nele
/// (PlayerMovement faz raycast) e o estado liga/desliga.
/// </summary>
public class EnviarDados : MonoBehaviour
{
    [Header("Identificacao do Dispositivo")]
    [Tooltip("ID unico do dispositivo enviado para a API.")]
    public string dispositivoId = "chuveiro_principal";

    [Header("Consumo quando LIGADO")]
    [Tooltip("Potencia eletrica em Watts (0 = nao consome energia).")]
    public float wattage = 5500f;

    [Tooltip("Vazao de agua em litros por minuto (0 = nao consome agua).")]
    public float vazaoLpm = 8f;

    [Header("Configuracao Visual")]
    [Tooltip("Renderer cuja cor muda quando o dispositivo liga/desliga.")]
    public Renderer luzIndicadora;
    public Color corLigado    = Color.green;
    public Color corDesligado = Color.red;

    [Tooltip("Opcional: GameObject do jato de agua a ativar/desativar.")]
    public GameObject jatoAgua;

    [Tooltip("Opcional: AudioSource do barulho do chuveiro.")]
    public AudioSource somChuveiro;

    // Compatibilidade com prefab antigo (campo "circuito" do projeto original)
    [HideInInspector] public string circuito = "chuveiro";

    private bool isOn = false;
    private const string API_URL = "http://127.0.0.1:5000/update";


    void Start()
    {
        AtualizarVisual(false);
    }

    /// <summary>
    /// Liga/desliga o dispositivo. Chamado pelo PlayerMovement
    /// (no raycast/clique do mouse).
    /// </summary>
    public void ToggleState()
    {
        isOn = !isOn;

        float wAtual   = isOn ? wattage  : 0f;
        float lpmAtual = isOn ? vazaoLpm : 0f;

        AtualizarVisual(isOn);

        Debug.Log($"[{dispositivoId}] {(isOn ? "LIGADO" : "DESLIGADO")} - {wAtual} W, {lpmAtual} L/min");
        StartCoroutine(SendData(wAtual, lpmAtual));
    }


    private void AtualizarVisual(bool ligado)
    {
        if (luzIndicadora != null)
        {
            luzIndicadora.material.color = ligado ? corLigado : corDesligado;
        }
        if (jatoAgua != null)
        {
            jatoAgua.SetActive(ligado);
        }
        if (somChuveiro != null)
        {
            if (ligado) somChuveiro.Play();
            else        somChuveiro.Stop();
        }
    }


    IEnumerator SendData(float watts, float vazao)
    {
        WWWForm form = new WWWForm();
        form.AddField("dispositivo_id", dispositivoId);
        form.AddField("wattage",   watts.ToString("F2"));
        form.AddField("vazao_lpm", vazao.ToString("F2"));

        // Mantem compatibilidade com versao antiga da API
        form.AddField("circuito", circuito);

        using (UnityWebRequest www = UnityWebRequest.Post(API_URL, form))
        {
            yield return www.SendWebRequest();

            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning($"[{dispositivoId}] Falha ao enviar dados: {www.error}");
            }
        }
    }
}
