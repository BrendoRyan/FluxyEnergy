using UnityEngine;

[RequireComponent(typeof(CharacterController))] // Garante que o controller exista
public class PlayerMovement : MonoBehaviour
{
    [Header("Movimento")]
    public float speed = 5f; // <-- Verifique no Inspetor se isso não está 0!
    private CharacterController controller;

    [Header("Gravidade")]
    private Vector3 playerVelocity;
    private float gravityValue = -9.81f;
    private bool isGrounded;

    [Header("Câmera")]
    public float mouseSensitivity = 2f;
    public Transform playerCamera; 
    private float verticalLookRotation = 0f;

    [Header("Interação")]
    public float interactionDistance = 3f; 

    void Start()
    {
        controller = GetComponent<CharacterController>();
        Cursor.lockState = CursorLockMode.Locked; 
        Cursor.visible = false; 
    }

    void Update()
    {
        // Checagem de segurança
        if (playerCamera == null || controller == null)
        {
            Debug.LogError("ERRO DE SETUP: Verifique o 'playerCamera' e o 'CharacterController' no Inspetor!");
            return; 
        }

        // --- Rotação da Câmera (Mouse) ---
        float mouseX = Input.GetAxis("Mouse X") * mouseSensitivity;
        transform.Rotate(Vector3.up * mouseX);

        float mouseY = Input.GetAxis("Mouse Y") * mouseSensitivity;
        verticalLookRotation -= mouseY;
        verticalLookRotation = Mathf.Clamp(verticalLookRotation, -80f, 80f); 
        playerCamera.localRotation = Quaternion.Euler(verticalLookRotation, 0f, 0f);

        
        // --- Gravidade ---
        isGrounded = controller.isGrounded; 
        if (isGrounded && playerVelocity.y < 0)
        {
            // Se estiver no chão, zera a velocidade de queda
            playerVelocity.y = -2f; 
        }

        // --- Movimento (WASD) ---
        float x = Input.GetAxis("Horizontal");
        float z = Input.GetAxis("Vertical");
        
        // Calcula o vetor de movimento horizontal (X, Z)
        Vector3 move = transform.right * x + transform.forward * z;
        Debug.Log("Movimento: " + move + " | Input X: " + x + " | Input Z: " + z);
        
        // --- Combina os Movimentos ---

        // 1. Aplica a velocidade WASD ao movimento
        Vector3 finalVelocity = move * speed;

        // 2. Aplica a aceleração da gravidade na velocidade vertical
        playerVelocity.y += gravityValue * Time.deltaTime;

        // 3. Adiciona a velocidade vertical (gravidade) ao vetor final
        finalVelocity.y = playerVelocity.y;

        // --- Move o Controller (UMA SÓ VEZ) ---
        // Aplica o movimento horizontal (finalVelocity.x, finalVelocity.z) 
        // E o movimento vertical (finalVelocity.y) de uma só vez
        controller.Move(finalVelocity * Time.deltaTime);


        // --- Interação (Mouse Click) ---
        if (Input.GetMouseButtonDown(0)) 
        {
            TryInteract();
        }
    }

    void TryInteract()
    {
        RaycastHit hit; 
        if (Physics.Raycast(playerCamera.position, playerCamera.forward, out hit, interactionDistance))
        {
            EnviarDados button = hit.collider.GetComponent<EnviarDados>();
            if (button != null)
            {
                button.ToggleState(); 
            }
        }
    }
}
