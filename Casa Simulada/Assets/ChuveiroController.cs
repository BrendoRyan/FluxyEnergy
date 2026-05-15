using UnityEngine;
using UnityEngine.Networking;
using System.Collections;
using System.Text;

public class ChuveiroController : MonoBehaviour
{
    public enum ModoChuveiro { Desligado, Verao, Inverno }

    [Header("Identificação")]
    public string dispositivoId = "chuveiro_principal";

    [Header("Modo VERÃO (morno)")]
    public float wattsVerao = 2700f;
    public float vazaoVerao = 9.0f;

    [Header("Modo INVERNO (quente)")]
    public float wattsInverno = 5500f;
    public float vazaoInverno = 7.0f;

    [Header("Visual / Áudio")]
    public Renderer corpoRenderer;
    public Renderer ledLigaDesliga;
    public Renderer ledModo;
    public Color corDesligado = Color.red;
    public Color corVerao     = new Color(1f, 0.9f, 0.2f);
    public Color corInverno   = new Color(1f, 0.3f, 0.0f);
    public GameObject jatoAgua;
    public ParticleSystem vapor;
    public AudioSource somAgua;

    [Header("Indicadores de Clima")]
    public GameObject solVisual;
    public GameObject neveVisual;

    [Header("Label de Status")]
    public bool mostrarLabelStatus = true;
    public float alturaLabel = 0.5f;
    public float tamanhoLabel = 0.4f;
    public string textoDesligado = "DESLIGADO";
    public string textoVerao     = "VERÃO";
    public string textoInverno   = "INVERNO";

    [Header("Rotação do Label")]
    public bool labelOlharCamera = true;
    public Vector3 rotacaoLabel = Vector3.zero;

    [Header("Rede")]
    public float intervaloEnvio = 2.0f;

    // ── Supabase ──────────────────────────────────────────────────
    private const string SUPABASE_URL = "https://yaikuzgtcgmkzvhwuorn.supabase.co/rest/v1/banho";
    private const string SUPABASE_KEY = "sb_publishable_TtlSmxnnfkAm7tx_uqzy7w_6IrRkUQk";
    // ─────────────────────────────────────────────────────────────

    private ModoChuveiro modoAtual = ModoChuveiro.Desligado;
    private float tempoSessao = 0f;

    private Transform labelTransform;
    private TextMesh  labelTextMesh;
    private Camera    cameraCache;


    void Start()
    {
        if (corpoRenderer == null) corpoRenderer = GetComponent<Renderer>();
        CriarLabelStatus();
        AtualizarVisual();
        StartCoroutine(HeartbeatLoop());
    }

    void Update()
    {
        // Conta o tempo de sessão enquanto ligado
        if (modoAtual != ModoChuveiro.Desligado)
            tempoSessao += Time.deltaTime;

        if (labelTransform == null) return;

        if (labelOlharCamera)
        {
            if (cameraCache == null) cameraCache = Camera.main;
            if (cameraCache != null)
            {
                Vector3 dir = labelTransform.position - cameraCache.transform.position;
                if (dir.sqrMagnitude > 0.0001f)
                {
                    Quaternion lookCam = Quaternion.LookRotation(dir);
                    Quaternion offset  = Quaternion.Euler(rotacaoLabel);
                    labelTransform.rotation = lookCam * offset;
                }
            }
        }
        else
        {
            labelTransform.rotation = Quaternion.Euler(rotacaoLabel);
        }
    }


    // -----------------------------------------------------------------
    //   API pública
    // -----------------------------------------------------------------

    public void ToggleLigado()
    {
        if (modoAtual == ModoChuveiro.Desligado)
        {
            tempoSessao = 0f; // reseta o timer ao ligar
            modoAtual = ModoChuveiro.Verao;
        }
        else
        {
            StartCoroutine(FinalizarSessao()); // salva sessão ao desligar
            modoAtual = ModoChuveiro.Desligado;
        }

        AtualizarVisual();
        StartCoroutine(EnviarHeartbeat());
    }

    public void AlternarModo()
    {
        modoAtual = modoAtual switch
        {
            ModoChuveiro.Desligado => ModoChuveiro.Verao,
            ModoChuveiro.Verao     => ModoChuveiro.Inverno,
            _                      => ModoChuveiro.Verao
        };
        AtualizarVisual();
        StartCoroutine(EnviarHeartbeat());
    }

    public void SetModo(ModoChuveiro novoModo)
    {
        if (modoAtual == novoModo && novoModo != ModoChuveiro.Desligado)
        {
            StartCoroutine(FinalizarSessao());
            modoAtual = ModoChuveiro.Desligado;
        }
        else
        {
            if (modoAtual == ModoChuveiro.Desligado) tempoSessao = 0f;
            modoAtual = novoModo;
        }

        AtualizarVisual();
        StartCoroutine(EnviarHeartbeat());
    }

    public void ToggleState()
    {
        if (modoAtual == ModoChuveiro.Desligado) tempoSessao = 0f;

        modoAtual = modoAtual switch
        {
            ModoChuveiro.Desligado => ModoChuveiro.Verao,
            ModoChuveiro.Verao     => ModoChuveiro.Inverno,
            _                      => ModoChuveiro.Desligado
        };

        if (modoAtual == ModoChuveiro.Desligado)
            StartCoroutine(FinalizarSessao());

        AtualizarVisual();
        StartCoroutine(EnviarHeartbeat());
    }

    public ModoChuveiro ModoAtual => modoAtual;


    // -----------------------------------------------------------------
    //   Supabase
    // -----------------------------------------------------------------

    /// <summary>
    /// Salva a sessão completa no Supabase quando o chuveiro é desligado.
    /// </summary>
    private IEnumerator FinalizarSessao()
    {
        var (watts, vazao) = ConsumoAtual();
        float duracaoSegundos = tempoSessao;
        float custoRS = (watts / 1000f) * (duracaoSegundos / 3600f) * 0.95f; // R$ 0,95/kWh
        string mes = System.DateTime.Now.ToString("yyyy-MM");

        string json = $@"{{
            ""potencia_w"": {watts.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)},
            ""vazao_lmin"": {vazao.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)},
            ""duracao_s"":  {Mathf.RoundToInt(duracaoSegundos)},
            ""custo_rs"":   {custoRS.ToString("F4", System.Globalization.CultureInfo.InvariantCulture)},
            ""mes"":        ""{mes}""
        }}";

        yield return EnviarParaSupabase(json);
        Debug.Log($"[Supabase] Sessão salva — {duracaoSegundos:F0}s | R$ {custoRS:F4}");
    }

    /// <summary>
    /// Heartbeat: atualiza o dashboard em tempo real com os dados atuais.
    /// Usa upsert pelo dispositivo_id pra não criar milhares de linhas.
    /// </summary>
    private IEnumerator EnviarHeartbeat()
    {
        var (watts, vazao) = ConsumoAtual();
        string mes = System.DateTime.Now.ToString("yyyy-MM");

        string json = $@"{{
            ""potencia_w"": {watts.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)},
            ""vazao_lmin"": {vazao.ToString("F2", System.Globalization.CultureInfo.InvariantCulture)},
            ""duracao_s"":  {Mathf.RoundToInt(tempoSessao)},
            ""custo_rs"":   0,
            ""mes"":        ""{mes}""
        }}";

        yield return EnviarParaSupabase(json);
    }

    private IEnumerator EnviarParaSupabase(string json)
    {
        byte[] bodyRaw = Encoding.UTF8.GetBytes(json);

        using (UnityWebRequest www = new UnityWebRequest(SUPABASE_URL, "POST"))
        {
            www.uploadHandler   = new UploadHandlerRaw(bodyRaw);
            www.downloadHandler = new DownloadHandlerBuffer();

            www.SetRequestHeader("Content-Type",  "application/json");
            www.SetRequestHeader("apikey",        SUPABASE_KEY);
            www.SetRequestHeader("Authorization", "Bearer " + SUPABASE_KEY);
            www.SetRequestHeader("Prefer",        "return=minimal");

            yield return www.SendWebRequest();

            if (www.result != UnityWebRequest.Result.Success)
                Debug.LogWarning($"[Supabase] Erro: {www.error} | {www.downloadHandler.text}");
        }
    }

    private IEnumerator HeartbeatLoop()
    {
        while (true)
        {
            yield return new WaitForSeconds(intervaloEnvio);
            if (modoAtual != ModoChuveiro.Desligado)
                yield return EnviarHeartbeat();
        }
    }


    // -----------------------------------------------------------------
    //   Internals
    // -----------------------------------------------------------------

    private (float watts, float vazao) ConsumoAtual()
    {
        return modoAtual switch
        {
            ModoChuveiro.Verao   => (wattsVerao,   vazaoVerao),
            ModoChuveiro.Inverno => (wattsInverno, vazaoInverno),
            _                    => (0f, 0f)
        };
    }

    private void AtualizarVisual()
    {
        bool ligado = modoAtual != ModoChuveiro.Desligado;

        if (corpoRenderer != null)
        {
            corpoRenderer.material.color = modoAtual switch
            {
                ModoChuveiro.Verao   => corVerao,
                ModoChuveiro.Inverno => corInverno,
                _                    => corDesligado
            };
        }

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
            if (ligado  && !somAgua.isPlaying) somAgua.Play();
            if (!ligado &&  somAgua.isPlaying) somAgua.Stop();
        }

        if (solVisual  != null) solVisual.SetActive(modoAtual == ModoChuveiro.Verao);
        if (neveVisual != null) neveVisual.SetActive(modoAtual == ModoChuveiro.Inverno);

        AtualizarLabelStatus();
    }

    private void CriarLabelStatus()
    {
        if (!mostrarLabelStatus) return;

        GameObject go = new GameObject("LabelStatus_Chuveiro");
        go.transform.SetParent(transform, false);
        go.transform.localPosition = Vector3.up * alturaLabel;

        labelTextMesh = go.AddComponent<TextMesh>();
        labelTextMesh.text      = textoDesligado;
        labelTextMesh.color     = corDesligado;
        labelTextMesh.fontSize  = 80;
        labelTextMesh.fontStyle = FontStyle.Bold;
        labelTextMesh.characterSize = tamanhoLabel * 0.1f;
        labelTextMesh.anchor    = TextAnchor.MiddleCenter;
        labelTextMesh.alignment = TextAlignment.Center;

        Font fonte = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf")
                  ?? Resources.GetBuiltinResource<Font>("Arial.ttf");
        if (fonte != null)
        {
            labelTextMesh.font = fonte;
            var mr = go.GetComponent<MeshRenderer>();
            if (mr != null && fonte.material != null)
                mr.material = fonte.material;
        }

        labelTransform = go.transform;
    }

    private void AtualizarLabelStatus()
    {
        if (labelTextMesh == null) return;

        labelTextMesh.text = modoAtual switch
        {
            ModoChuveiro.Verao   => textoVerao,
            ModoChuveiro.Inverno => textoInverno,
            _                    => textoDesligado
        };
        labelTextMesh.color = modoAtual switch
        {
            ModoChuveiro.Verao   => corVerao,
            ModoChuveiro.Inverno => corInverno,
            _                    => corDesligado
        };
    }
}