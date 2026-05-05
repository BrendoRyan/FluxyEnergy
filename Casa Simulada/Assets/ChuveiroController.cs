using UnityEngine;
using UnityEngine.Networking;
using System.Collections;

/// <summary>
/// Controlador do chuveiro elétrico com modos VERÃO (morno) e INVERNO (quente),
/// cada um com sua potência e vazão característica.
///
/// Interação:
///   - Clique no botão de liga/desliga  →  ToggleLigado()
///   - Clique no botão de modo          →  AlternarModo()
///
/// O estado é enviado para a API Flask em /update sempre que muda
/// e também a cada `intervaloEnvio` segundos (heartbeat),
/// pra garantir que o dashboard nunca fique com dado obsoleto.
/// </summary>
public class ChuveiroController : MonoBehaviour
{
    public enum ModoChuveiro { Desligado, Verao, Inverno }

    [Header("Identificação")]
    public string dispositivoId = "chuveiro_principal";

    [Header("Modo VERÃO (morno)")]
    [Tooltip("Potência elétrica em Watts no modo verão.")]
    public float wattsVerao = 2700f;
    [Tooltip("Vazão em L/min no modo verão (água sai mais aberta).")]
    public float vazaoVerao = 9.0f;

    [Header("Modo INVERNO (quente)")]
    [Tooltip("Potência elétrica em Watts no modo inverno.")]
    public float wattsInverno = 5500f;
    [Tooltip("Vazão em L/min no modo inverno (água um pouco mais fechada).")]
    public float vazaoInverno = 7.0f;

    [Header("Visual / Áudio")]
    public Renderer ledLigaDesliga;
    public Renderer ledModo;
    public Color corDesligado = Color.red;
    public Color corVerao     = new Color(1f, 0.9f, 0.2f);   // amarelo
    public Color corInverno   = new Color(1f, 0.3f, 0.0f);   // laranja-quente
    public GameObject jatoAgua;
    public ParticleSystem vapor;
    public AudioSource somAgua;

    [Header("Rede")]
    [Tooltip("Intervalo (s) entre envios de heartbeat para a API.")]
    public float intervaloEnvio = 2.0f;

    private ModoChuveiro modoAtual = ModoChuveiro.Desligado;
    private const string API_URL  = "http://127.0.0.1:5000/update";


    void Start()
    {
        AtualizarVisual();
        StartCoroutine(HeartbeatLoop());
    }


    // -----------------------------------------------------------------
    //   API pública (chamada pelo PlayerMovement / botões)
    // -----------------------------------------------------------------

    /// <summary>Liga/desliga o chuveiro mantendo o último modo.</summary>
    public void ToggleLigado()
    {
        if (modoAtual == ModoChuveiro.Desligado)
            modoAtual = ModoChuveiro.Verao;
        else
            modoAtual = ModoChuveiro.Desligado;

        AtualizarVisual();
        StartCoroutine(EnviarEstado());
    }

    /// <summary>Alterna entre VERÃO e INVERNO. Se desligado, liga em verão.</summary>
    public void AlternarModo()
    {
        switch (modoAtual)
        {
            case ModoChuveiro.Desligado: modoAtual = ModoChuveiro.Verao;   break;
            case ModoChuveiro.Verao:     modoAtual = ModoChuveiro.Inverno; break;
            case ModoChuveiro.Inverno:   modoAtual = ModoChuveiro.Verao;   break;
        }
        AtualizarVisual();
        StartCoroutine(EnviarEstado());
    }


    // -----------------------------------------------------------------
    //   Internals
    // -----------------------------------------------------------------

    private (float watts, float vazao) ConsumoAtual()
    {
        return modoAtual switch
        {
            ModoChuveiro.Verao   => (wattsVerao,  vazaoVerao),
            ModoChuveiro.Inverno => (wattsInverno, vazaoInverno),
            _                    => (0f, 0f)
        };
    }


    private void AtualizarVisual()
    {
        bool ligado = modoAtual != ModoChuveiro.Desligado;

        if (ledLigaDesliga != null)
            ledLigaDesliga.material.color = ligado ? Color.green : corDesligado;

        if (ledModo != null)
        {
            ledModo.material.color = modoAtual switch
            {
                ModoChuveiro.Verao   => corVerao,
                ModoChuveiro.Inverno => corInverno,
                _                    => corDesligado
            };
        }

        if (jatoAgua != null) jatoAgua.SetActive(ligado);

        if (vapor != null)
        {
            if (modoAtual == ModoChuveiro.Inverno) vapor.Play();
            else                                   vapor.Stop();
        }

        if (somAgua != null)
        {
            if (ligado && !somAgua.isPlaying) somAgua.Play();
            if (!ligado && somAgua.isPlaying) somAgua.Stop();
        }
    }


    private IEnumerator HeartbeatLoop()
    {
        while (true)
        {
            yield return new WaitForSeconds(intervaloEnvio);
            yield return EnviarEstado();
        }
    }


    private IEnumerator EnviarEstado()
    {
        var (watts, vazao) = ConsumoAtual();

        WWWForm form = new WWWForm();
        form.AddField("dispositivo_id", dispositivoId);
        form.AddField("wattage",   watts.ToString("F2"));
        form.AddField("vazao_lpm", vazao.ToString("F2"));
        form.AddField("circuito",  "chuveiro");

        using (UnityWebRequest www = UnityWebRequest.Post(API_URL, form))
        {
            yield return www.SendWebRequest();
            if (www.result != UnityWebRequest.Result.Success)
            {
                Debug.LogWarning($"[Chuveiro] Falha no envio: {www.error}");
            }
        }
    }
}
