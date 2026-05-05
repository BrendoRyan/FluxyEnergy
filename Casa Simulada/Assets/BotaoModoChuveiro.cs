using UnityEngine;

/// <summary>
/// Botão de parede que define o MODO do chuveiro (Verão ou Inverno).
///
/// Coloque este script em cada cubo/quadrado que servirá de botão.
/// Configure no Inspector:
///   - chuveiro       : referência ao ChuveiroController da cena
///   - modoAlvo       : Verao ou Inverno
///   - corAtivo/corInativo : cores do material para feedback visual
///
/// O PlayerMovement faz raycast e chama ToggleState() no objeto clicado,
/// então o botão também responde a ToggleState() para manter compatibilidade.
/// </summary>
[RequireComponent(typeof(Collider))]
public class BotaoModoChuveiro : MonoBehaviour
{
    [Header("Ligação")]
    [Tooltip("Referência ao ChuveiroController da cena.")]
    public ChuveiroController chuveiro;

    [Tooltip("Modo que este botão aciona quando clicado.")]
    public ChuveiroController.ModoChuveiro modoAlvo = ChuveiroController.ModoChuveiro.Verao;

    [Header("Feedback Visual")]
    [Tooltip("Renderer do botão (geralmente o próprio cubo). Se vazio, pega o do GameObject.")]
    public Renderer rendererBotao;

    [Tooltip("Cor quando este modo está ATIVO no chuveiro.")]
    public Color corAtivo = new Color(0.2f, 1f, 0.4f);

    [Tooltip("Cor quando este modo está inativo (chuveiro desligado ou em outro modo).")]
    public Color corInativo = new Color(0.6f, 0.6f, 0.6f);

    [Header("Animação de clique (opcional)")]
    [Tooltip("Quanto o botão afunda ao ser clicado, em metros.")]
    public float profundidadeClique = 0.02f;
    [Tooltip("Tempo (s) que o botão leva pra voltar.")]
    public float tempoVoltar = 0.1f;

    [Header("Ícone flutuante (opcional)")]
    [Tooltip("Caractere/emoji exibido acima do botão. Ex: ☀ (sol) ou ❄ (floco). Deixe vazio pra não criar.")]
    public string iconeChar = "";
    [Tooltip("Cor do ícone.")]
    public Color corIcone = Color.white;
    [Tooltip("Tamanho do ícone (escala do TextMesh).")]
    public float tamanhoIcone = 0.3f;
    [Tooltip("Altura do ícone acima do botão (em metros).")]
    public float alturaIcone = 0.25f;
    [Tooltip("Se true, o ícone fica subindo e descendo suavemente.")]
    public bool flutuarIcone = true;
    [Tooltip("Amplitude do movimento de flutuação (m).")]
    public float amplitudeFlutuacao = 0.04f;
    [Tooltip("Velocidade da flutuação.")]
    public float velocidadeFlutuacao = 2f;
    [Tooltip("Se true, o ícone sempre fica de frente pra câmera (billboard).")]
    public bool olharCamera = true;

    private Vector3 posOriginal;
    private float tempoRestanteAnim;

    private Transform iconeTransform;
    private TextMesh iconeTextMesh;
    private Vector3 iconePosBase;
    private Camera cameraCache;

    void Start()
    {
        if (rendererBotao == null) rendererBotao = GetComponent<Renderer>();
        posOriginal = transform.localPosition;
        AtualizarCor();
        CriarIconeSeNecessario();
    }

    void Update()
    {
        // Volta o botão pra posição original após o clique
        if (tempoRestanteAnim > 0f)
        {
            tempoRestanteAnim -= Time.deltaTime;
            float t = 1f - Mathf.Clamp01(tempoRestanteAnim / tempoVoltar);
            transform.localPosition = Vector3.Lerp(
                posOriginal - transform.forward * profundidadeClique,
                posOriginal,
                t);
        }

        AtualizarCor();
        AtualizarIcone();
    }

    private void CriarIconeSeNecessario()
    {
        if (string.IsNullOrEmpty(iconeChar)) return;

        // Cria um GameObject filho com TextMesh
        GameObject go = new GameObject("Icone_" + modoAlvo);
        go.transform.SetParent(transform, false);
        go.transform.localPosition = Vector3.up * alturaIcone;

        iconeTextMesh = go.AddComponent<TextMesh>();
        iconeTextMesh.text = iconeChar;
        iconeTextMesh.color = corIcone;
        iconeTextMesh.fontSize = 80;
        iconeTextMesh.characterSize = tamanhoIcone * 0.1f; // ajuste de escala em world space
        iconeTextMesh.anchor = TextAnchor.MiddleCenter;
        iconeTextMesh.alignment = TextAlignment.Center;

        // Tenta carregar a fonte built-in (nome muda entre versões do Unity).
        // Se nenhuma for achada, o TextMesh usa o default e ainda renderiza.
        Font fonte = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf")
                  ?? Resources.GetBuiltinResource<Font>("Arial.ttf");
        if (fonte != null)
        {
            iconeTextMesh.font = fonte;
            var mr = go.GetComponent<MeshRenderer>();
            if (mr != null && fonte.material != null)
                mr.material = fonte.material;
        }

        iconeTransform = go.transform;
        iconePosBase = iconeTransform.localPosition;
    }

    private void AtualizarIcone()
    {
        if (iconeTransform == null) return;

        // Flutuação suave (bobbing)
        if (flutuarIcone)
        {
            float offsetY = Mathf.Sin(Time.time * velocidadeFlutuacao) * amplitudeFlutuacao;
            iconeTransform.localPosition = iconePosBase + Vector3.up * offsetY;
        }

        // Billboard — sempre olha pra câmera
        if (olharCamera)
        {
            if (cameraCache == null) cameraCache = Camera.main;
            if (cameraCache != null)
            {
                Vector3 dir = iconeTransform.position - cameraCache.transform.position;
                if (dir.sqrMagnitude > 0.0001f)
                    iconeTransform.rotation = Quaternion.LookRotation(dir);
            }
        }

        // Mantém cor do ícone caso o usuário troque no Inspector em runtime
        if (iconeTextMesh != null && iconeTextMesh.color != corIcone)
            iconeTextMesh.color = corIcone;
    }

    /// <summary>
    /// Método padrão chamado pelo PlayerMovement no raycast.
    /// </summary>
    public void ToggleState()
    {
        if (chuveiro == null)
        {
            Debug.LogWarning($"[{name}] ChuveiroController não atribuído no Inspector.");
            return;
        }

        chuveiro.SetModo(modoAlvo);
        tempoRestanteAnim = tempoVoltar;
    }

    private void AtualizarCor()
    {
        if (rendererBotao == null || chuveiro == null) return;
        bool ativo = chuveiro.ModoAtual == modoAlvo;
        rendererBotao.material.color = ativo ? corAtivo : corInativo;
    }
}
