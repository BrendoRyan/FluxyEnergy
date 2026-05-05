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
    [Tooltip("Renderer do corpo da esfera/chuveiro. Se vazio, pega do próprio GameObject. Muda de cor conforme o modo.")]
    public Renderer corpoRenderer;
    [Tooltip("LED separado de liga/desliga (opcional, fica verde/vermelho).")]
    public Renderer ledLigaDesliga;
    [Tooltip("LED separado de modo (opcional, fica amarelo/laranja).")]
    public Renderer ledModo;
    public Color corDesligado = Color.red;
    public Color corVerao     = new Color(1f, 0.9f, 0.2f);   // amarelo
    public Color corInverno   = new Color(1f, 0.3f, 0.0f);   // laranja-quente
    public GameObject jatoAgua;
    public ParticleSystem vapor;
    public AudioSource somAgua;

    [Header("Indicadores de Clima (parede)")]
    [Tooltip("GameObject do SOL (aparece quando o modo for VERÃO).")]
    public GameObject solVisual;
    [Tooltip("GameObject da NEVE (aparece quando o modo for INVERNO).")]
    public GameObject neveVisual;

    [Header("Label de Status (texto flutuante acima do chuveiro)")]
    [Tooltip("Se true, mostra texto flutuante acima do GameObject indicando o modo atual.")]
    public bool mostrarLabelStatus = true;
    [Tooltip("Altura (m) do label acima do GameObject.")]
    public float alturaLabel = 0.5f;
    [Tooltip("Tamanho do texto do label.")]
    public float tamanhoLabel = 0.4f;
    [Tooltip("Texto exibido quando o chuveiro está desligado.")]
    public string textoDesligado = "DESLIGADO";
    [Tooltip("Texto exibido no modo Verão.")]
    public string textoVerao     = "VERÃO";
    [Tooltip("Texto exibido no modo Inverno.")]
    public string textoInverno   = "INVERNO";

    [Header("Rotação do Label")]
    [Tooltip("Se true, o label sempre olha pra câmera (billboard). Se false, usa rotação fixa do campo abaixo.")]
    public bool labelOlharCamera = true;
    [Tooltip("Rotação extra (Euler em graus) aplicada ao label.\n" +
             "• Com billboard ligado: somada à rotação que olha pra câmera (útil pra inclinar/inverter).\n" +
             "• Com billboard desligado: usada como rotação fixa do label no mundo.\n" +
             "Exemplo: (0,180,0) inverte o texto se ficar de costas.")]
    public Vector3 rotacaoLabel = Vector3.zero;

    [Header("Rede")]
    [Tooltip("Intervalo (s) entre envios de heartbeat para a API.")]
    public float intervaloEnvio = 2.0f;

    private ModoChuveiro modoAtual = ModoChuveiro.Desligado;
    private const string API_URL  = "http://127.0.0.1:5000/update";

    // Refs internas do label
    private Transform labelTransform;
    private TextMesh labelTextMesh;
    private Camera cameraCache;


    void Start()
    {
        // Se o usuário não atribuiu o Renderer do corpo, pega do próprio GameObject.
        // Assim a esfera (ou qualquer mesh) muda de cor "de graça".
        if (corpoRenderer == null) corpoRenderer = GetComponent<Renderer>();

        CriarLabelStatus();
        AtualizarVisual();
        StartCoroutine(HeartbeatLoop());
    }

    void Update()
    {
        if (labelTransform == null) return;

        if (labelOlharCamera)
        {
            // Billboard: vira pra câmera + offset Euler do Inspector
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
            // Sem billboard: rotação fixa no mundo, usa só o offset
            labelTransform.rotation = Quaternion.Euler(rotacaoLabel);
        }
    }

    private void CriarLabelStatus()
    {
        if (!mostrarLabelStatus) return;

        GameObject go = new GameObject("LabelStatus_Chuveiro");
        go.transform.SetParent(transform, false);
        go.transform.localPosition = Vector3.up * alturaLabel;

        labelTextMesh = go.AddComponent<TextMesh>();
        labelTextMesh.text = textoDesligado;
        labelTextMesh.color = corDesligado;
        labelTextMesh.fontSize = 80;
        labelTextMesh.fontStyle = FontStyle.Bold;
        labelTextMesh.characterSize = tamanhoLabel * 0.1f;
        labelTextMesh.anchor = TextAnchor.MiddleCenter;
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

        switch (modoAtual)
        {
            case ModoChuveiro.Verao:
                labelTextMesh.text  = textoVerao;
                labelTextMesh.color = corVerao;
                break;
            case ModoChuveiro.Inverno:
                labelTextMesh.text  = textoInverno;
                labelTextMesh.color = corInverno;
                break;
            default:
                labelTextMesh.text  = textoDesligado;
                labelTextMesh.color = corDesligado;
                break;
        }
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

    /// <summary>
    /// Define o modo diretamente (chamado pelos botões de parede de Verão/Inverno).
    /// Se o usuário clicar de novo no botão do modo já ativo, desliga o chuveiro.
    /// </summary>
    public void SetModo(ModoChuveiro novoModo)
    {
        // Clique no mesmo modo que já está ligado → desliga
        if (modoAtual == novoModo && novoModo != ModoChuveiro.Desligado)
            modoAtual = ModoChuveiro.Desligado;
        else
            modoAtual = novoModo;

        AtualizarVisual();
        StartCoroutine(EnviarEstado());
    }

    /// <summary>
    /// Chamado pelo PlayerMovement no raycast/clique direto no GameObject.
    /// Cicla pelos 3 estados a cada clique:
    ///   Desligado → Verao → Inverno → Desligado → ...
    /// Útil quando NÃO há botões de parede e você só quer interagir clicando
    /// no próprio objeto do chuveiro.
    /// </summary>
    public void ToggleState()
    {
        modoAtual = modoAtual switch
        {
            ModoChuveiro.Desligado => ModoChuveiro.Verao,
            ModoChuveiro.Verao     => ModoChuveiro.Inverno,
            _                      => ModoChuveiro.Desligado
        };

        AtualizarVisual();
        StartCoroutine(EnviarEstado());
    }

    /// <summary>Modo atual (somente leitura) — útil pros botões destacarem o ativo.</summary>
    public ModoChuveiro ModoAtual => modoAtual;


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

        // --- Cor do CORPO (esfera/mesh principal) muda conforme o modo ---
        if (corpoRenderer != null)
        {
            Color cor = modoAtual switch
            {
                ModoChuveiro.Verao   => corVerao,
                ModoChuveiro.Inverno => corInverno,
                _                    => corDesligado
            };
            corpoRenderer.material.color = cor;
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
            if (ligado && !somAgua.isPlaying) somAgua.Play();
            if (!ligado && somAgua.isPlaying) somAgua.Stop();
        }

        // --- Indicadores de clima na parede ---
        if (solVisual  != null) solVisual.SetActive(modoAtual == ModoChuveiro.Verao);
        if (neveVisual != null) neveVisual.SetActive(modoAtual == ModoChuveiro.Inverno);

        // --- Label de texto acima do chuveiro ---
        AtualizarLabelStatus();
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
