# Setup dos botões Verão/Inverno + Sol/Neve

Esse guia mostra como configurar a cena no Unity depois das mudanças nos scripts.

## O que mudou no código

- `ChuveiroController.cs` — ganhou os campos **Sol Visual** e **Neve Visual** no Inspector, e o método público `SetModo()` que os botões chamam.
- `BotaoModoChuveiro.cs` (**novo**) — script que vai em cada botão de parede. Cada botão sabe qual modo ele aciona (Verão ou Inverno).
- `PlayerMovement.cs` — agora usa `SendMessage("ToggleState")` no raycast, então funciona com qualquer um dos 3 scripts (esfera antiga, chuveiro, botão).

## Passo 1 — Trocar a esfera pelo chuveiro

Na sua cena `Bathroom_set(interior).unity`:

1. Selecione a esfera atual e desative-a (ou apague).
2. Arraste o prefab do chuveiro do Bathroom_Set pra cena. Os prefabs disponíveis estão em `Assets/GeniusCrate_Games/Bathroom_Set/Prefab/Bathroom_props_set/`. Use o que tiver o chuveiro (provavelmente `Bathroom_props_Set01` ou `Bathroom_Props_Set02`).
3. No GameObject raiz do chuveiro, adicione o componente `ChuveiroController` (Add Component → ChuveiroController).
4. Garanta que o GameObject tenha um `Collider` (Box, Mesh ou Sphere) — sem ele o raycast do PlayerMovement não detecta o clique.

## Passo 2 — Criar os 2 botões na parede

1. GameObject → 3D Object → **Cube**. Renomeie pra `Botao_Verao`.
2. Posicione na parede (escala tipo `0.15 x 0.15 x 0.05`), com a face mais fina pra fora.
3. Add Component → `BotaoModoChuveiro`. No Inspector:
   - **Chuveiro**: arraste o GameObject do chuveiro (que tem o `ChuveiroController`).
   - **Modo Alvo**: `Verao`.
   - **Cor Ativo**: amarelo (ex: `#FFE233`).
   - **Cor Inativo**: cinza.
   - **Icone Char**: `☀` (copie e cole esse caractere).
   - **Cor Icone**: amarelo claro (`#FFE066`).
4. Duplique o cubo (Ctrl+D), renomeie pra `Botao_Inverno`, posicione ao lado.
5. No `Botao_Inverno`, troque:
   - **Modo Alvo** → `Inverno`
   - **Cor Ativo** → azul gelo (`#88CCFF`)
   - **Icone Char** → `❄`
   - **Cor Icone** → branco azulado (`#CCEEFF`)

### Sobre os ícones flutuantes

Quando você define **Icone Char** no Inspector, o `BotaoModoChuveiro` cria automaticamente em runtime um `TextMesh` filho acima do botão, com o caractere escolhido. Configurações que afetam o ícone:

- **Tamanho Icone** — escala do texto (default `0.3`).
- **Altura Icone** — distância em metros entre o botão e o ícone (default `0.25`).
- **Flutuar Icone** — se ligado, o ícone sobe e desce devagar (mais visível).
- **Amplitude Flutuacao** / **Velocidade Flutuacao** — ajustes finos do bobbing.
- **Olhar Camera** — se ligado, o ícone gira pra sempre encarar a câmera (recomendado).

Caracteres alternativos caso ☀ ou ❄ não rendam bem na sua fonte: `*` (sol simples), `+` (cruz), `■` (quadrado), ou desligue o ícone deixando **Icone Char** vazio.

## Passo 3 — Criar o Sol e a Neve (indicadores de clima)

Esses são GameObjects que ficam **escondidos** e só aparecem quando o modo correspondente é ativado.

### Sol (modo Verão)

1. GameObject → 3D Object → **Sphere**, renomeie pra `Indicador_Sol`.
2. Posicione perto da janela ou em cima do chuveiro.
3. Crie um material amarelo brilhante e adicione um `Light` filho (Point Light, cor amarela, intensidade 2-3).
4. **Desative o GameObject no Inspector** (checkbox no topo) — o `ChuveiroController` cuida de ligar/desligar.

### Neve (modo Inverno)

1. GameObject → Effects → **Particle System**, renomeie pra `Indicador_Neve`.
2. Configure pra cair: Start Speed `1`, Gravity `0.3`, Start Color branco, Shape `Box` largo.
3. Posicione no teto da cena.
4. **Desative o GameObject no Inspector**.

## Passo 4 — Ligar tudo no ChuveiroController

No GameObject do chuveiro (que tem o script `ChuveiroController`), preencha no Inspector:

- **Sol Visual**: arraste `Indicador_Sol`.
- **Neve Visual**: arraste `Indicador_Neve`.
- **Jato Agua**, **Vapor**, **Som Agua**: opcionais — preencha se você tiver.

## Passo 5 — Testar

1. Play.
2. Andando pela cena (WASD + mouse), clique no `Botao_Verao` → o sol deve aparecer e o chuveiro liga em modo Verão (2700W, 9 L/min).
3. Clique no `Botao_Inverno` → o sol some, a neve aparece, chuveiro vai pra Inverno (5500W, 7 L/min).
4. Clique de novo no botão do modo ativo → desliga o chuveiro.

## API Flask

Nada mudou na chamada da API. O POST pra `http://127.0.0.1:5000/update` continua acontecendo com os campos `dispositivo_id`, `wattage`, `vazao_lpm`, `circuito` — tanto na troca de modo quanto a cada 2s pelo heartbeat.

## Troubleshooting

- **Clique não faz nada**: confira que o objeto clicado tem `Collider` e que está dentro de `interactionDistance` (3m por padrão no PlayerMovement).
- **Sol/Neve não aparecem**: confira que arrastou os GameObjects no Inspector do `ChuveiroController` e que eles começam **desativados**.
- **Cor do botão não muda**: o `BotaoModoChuveiro` precisa de um `Renderer` no mesmo objeto. Se o cubo é filho, preencha o campo **Renderer Botao** no Inspector manualmente.
