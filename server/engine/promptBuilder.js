import { createHash } from "node:crypto";
import { ENGINE_CONFIG } from "./engineConfig.js";
import { engineStep } from "./engineLogger.js";
import { supabaseAdmin } from "./supabaseAdmin.js";

const CAMPOS_PRIORITARIOS_CURADOR = [
  "identificacao.titulo",
  "identificacao.titulo_original",
  "identificacao.tipo_obra",
  "identificacao.ano",
  "classificacao.universo",
  "classificacao.franquia",
  "classificacao.generos",
  "autoria.autor_principal",
  "autoria.criadores",
  "narrativa.premissa",
  "narrativa.momentos_essenciais",
  "editorial.contexto_historico",
  "editorial.curiosidades",
  "heritage.tipo_exibicao",
  "heritage.legacy_title",
  "heritage.legacy",
  "heritage.hero_artifact",
  "heritage.supporting_artifacts",
  "heritage.archival_details",
  "heritage.museum_identification_plaque",
  "heritage.archive_division",
  "heritage.emotional_tone",
  "heritage.color_palette",
  "heritage.museum_editorial_aesthetic",
  // Módulo capa_cinematica — alimenta o gerador de capa cinemática
  "capa_cinematica.relacao_viva",
  "capa_cinematica.ser_vivo_descricao",
  "capa_cinematica.gesto_emocional",
  "capa_cinematica.emocao_dominante",
  "capa_cinematica.frase_curatorial",
];

const CAMPOS_PRIORITARIOS_EDITOR = [
  "emocional.tema_central",
  "emocional.curva_emocional",
  "essencia.aforismo",
  "essencia.narrador",
];

const CAMPOS_PRIORITARIOS_DIRETOR_CRIATIVO = [
  "sensorial.sons",
  "sensorial.cheiros",
  "visual.objeto_principal",
  "visual.paleta",
  "sonoro.paisagem_sonora",
  "sonoro.direcao_musical",
];

const MOTOR_NARRATIVA_CINEMATICA_V4 = String.raw`Estas instruções guiam sua escrita mas JAMAIS aparecem na saída. A saída contém SOMENTE o roteiro deste bloco.

━━━ MISSÃO ━━━

Transforme a obra em uma experiência narrativa cinematográfica completa, contada como uma lembrança muitos anos depois.

Você não produz um resumo convencional.
Você não tenta reproduzir a obra palavra por palavra.
Você não substitui a obra original.

Você reconstrói os acontecimentos essenciais através das marcas emocionais, humanas, sensoriais e simbólicas que eles deixaram.

Acontecimentos sustentam a emoção.
A emoção revela o significado.
A interpretação aprofunda a história, mas nunca substitui os acontecimentos necessários para que a jornada seja compreendida e vivida.

A narrativa pode omitir:
— fillers;
— repetições;
— grind;
— desvios;
— personagens sem consequência;
— explicações técnicas;
— detalhes enciclopédicos;
— acontecimentos equivalentes que cumpram a mesma função.

A narrativa não pode omitir:
— causas necessárias;
— transformações indispensáveis;
— vínculos essenciais;
— escolhas irreversíveis;
— perdas definidoras;
— revelações que mudam o sentido da obra;
— clímaxes emocionais;
— consequências que alteram personagens ou relações.

A narrativa não precisa ser exaustiva. Ela deve ser narrativa e emocionalmente completa.

Esta narrativa NÃO pretende contar toda a obra. Ela deliberadamente deixa acontecimentos de fora. Ela escolhe. Ela esquece. Ela guarda apenas aquilo que o tempo não conseguiu apagar. Omissão não é falha — é direção editorial. O que entra e o que fica de fora já foi decidido pelo blueprint desta obra: sua tarefa é dramatizar exatamente as cenas que o blueprint especificou para este bloco, não escolher outras.

━━━ FILOSOFIA ━━━

Esta narrativa conta sempre a segunda história da obra — as marcas que os acontecimentos deixaram, não os acontecimentos em si. Cronologia existe apenas para orientar a emoção.

Quando houver conflito entre acontecimento e interpretação:
1. Preserve o acontecimento se ele for necessário para compreender uma causa, uma escolha, uma transformação, um vínculo, uma perda ou uma consequência.
2. Condense o acontecimento se sua função puder ser preservada sem dramatização extensa.
3. Use interpretação para aprofundar o que o acontecimento deixou.
4. Nunca substitua acontecimentos indispensáveis por reflexões abstratas.

Antes de criar uma cena, pergunte internamente: esse acontecimento deixou uma marca emocional, simbólica ou humana? Se for apenas importante na trama, não basta. Acontecimentos não garantem cenas. Marcas garantem cenas.

━━━ ÂNCORA EMOCIONAL ━━━

O ouvinte pode desconhecer a obra. Nunca deve desconhecer a emoção.

Quando um elemento importante aparecer pela primeira vez — personagem, objeto, criatura, lugar — apresente sua função emocional em uma linha, dentro do ritmo da narrativa. Não explique. Não dê contexto. Apenas permita que qualquer pessoa compreenda o que aquilo faz com quem o encontra.

O narrador não dá aula. Ele conta por que aquilo ficou com ele.

Funciona: "Dementadores... criaturas que não atacam o corpo... atacam aquilo que você ainda consegue lembrar de bom..."
Funciona: "O Patrono... a única magia capaz de enfrentar aquele tipo de escuridão..."
Funciona: "O Mapa do Maroto... um pergaminho que guardava o passado inteiro de um castelo..."

Não funciona: definição técnica. Não funciona: ignorar o elemento. Não funciona: explicar em excesso.

A âncora deve caber em uma respiração. Quem conhece a obra sorri. Quem não conhece acompanha.

━━━ UNIDADE DRAMÁTICA OBRIGATÓRIA ━━━

Cada cena deve conter uma unidade dramática real. Uma unidade dramática possui pelo menos três destes elementos: situação concreta; personagem em estado reconhecível; desejo ou necessidade; conflito; vínculo em transformação; escolha; descoberta; perda; revelação; consequência.

O símbolo central acompanha a unidade dramática. O símbolo nunca a substitui.

Uma cena não pode existir apenas porque um objeto é bonito, um cheiro é nostálgico, um lugar é icônico, uma sensação é poética ou um símbolo é reconhecível. Esses elementos enriquecem a cena — não são, sozinhos, razão suficiente para criá-la.

━━━ PROPORÇÃO POR CENA ━━━

[PROPORCAO_POR_ICN]

Sempre que perceber que está apenas contando acontecimentos: pare, observe, interprete. Mesmo em obras extensas, preserve silêncio, respiro, sensorialidade, memória, reflexão e beleza — a proporção existe para evitar que uma saga longa vire só símbolos desconectados, não para eliminar a interpretação.

━━━ ESTRUTURA DESTE BLOCO ━━━

Cada cena: UMA emoção dominante + 2500–4000 caracteres de narrativa (2–3 min narrados). Numeração: [CENA 01], [CENA 02], etc., seguindo exatamente a numeração informada em "INSTRUÇÕES DESTE BLOCO" abaixo — não renumere, não pule, não invente cenas fora da lista, não escreva menos cenas do que a lista pede.

FUSÃO: se as instruções deste bloco já indicarem que duas marcas emocionais foram fundidas em uma única cena, escreva-as como uma cena só, usando o estilo da emoção dominante indicada. Não funda cenas por conta própria além do que as instruções definirem.

PROGRESSÃO DENTRO DO BLOCO — mesmo com as cenas já selecionadas, module a intensidade seguindo a lógica emocional, não apenas a ordem: alterne peso e respiro, e reserve o pico de intensidade do bloco para perto do fim dele, sem antecipar o clímax de blocos futuros que não são deste bloco.

━━━ INSTRUÇÕES DESTE BLOCO ━━━
[INSTRUCOES_DO_BLOCO]

━━━ IDENTIDADE SONORA DA OBRA ━━━

Antes de escrever qualquer cena, mapeie internamente a identidade musical e cultural desta obra específica. Todos os colchetes de sonoplastia da narrativa inteira (Convite, cenas e encerramento) usam exclusivamente essa paleta — nunca instrumentos genéricos ou fora dela.

Responda internamente:
— Qual é o universo emocional desta obra? (épico, íntimo, sombrio, lírico...)
— Que instrumentos pertencem a este mundo? (orquestra sinfônica, música folclórica medieval, flauta celta, koto japonês, alaúde, berimbau, piano solo, cordas de câmara...)
— Existe uma trilha sonora canônica associada? (Howard Shore para Tolkien, Nobuo Uematsu para Final Fantasy, Hans Zimmer para determinadas obras...) — não copie, use como DNA sonoro.
— Que texturas ambientais pertencem a este universo? (vento em montanhas, fogo de lareira medieval, água corrente élfica, batalha distante, biblioteca em silêncio, floresta à noite...)
— Que instrumentos NUNCA pertenceriam a este mundo? (exclua-os)

PALETA POR TIPO DE OBRA (referência — adapte à obra específica, não copie literalmente):
FANTASIA ÉPICA OCIDENTAL (Tolkien, GOT, Witcher): orquestra sinfônica, choir feminino, harp, horn, cordas longas, percussão épica distante, flauta celta; ambiente: vento, pedra, fogo.
FANTASIA ORIENTAL / ANIME (Demon Slayer, Naruto, Samurai): shakuhachi, koto, taiko, biwa, cordas japonesas; ambiente: bambu, chuva, vento de cerejeira.
FICÇÃO CIENTÍFICA / CYBERPUNK: sintetizadores analógicos, texturas eletrônicas, pulso baixo; ambiente: servidor room hum, chuva neon, passos em concreto.
TERROR / SUSPENSE: cordas dissonantes, piano preparado, silêncio como evento; ambiente: casa vazia, madeira rangendo, vento exterior.
BIOGRAFIA / OBRA HISTÓRICA: instrumento solo do período/cultura da obra, câmara intimista; ambiente: escrivaninha, chuva, livros, passos em corredor.
OBRA BRASILEIRA / LATINOAMERICANA: violão, percussão orgânica, flauta andina ou nordestina; ambiente: chuva em pedra, praça, brisa, distância urbana.
GAMES DE AVENTURA / AÇÃO: orquestra híbrida, percussão cinematográfica, synth pad; ambiente: vento em ruínas, passos em terra, fogo crepitando.
Se a obra não se encaixar perfeitamente em nenhuma categoria, combine elementos das mais próximas ou construa uma paleta própria coerente com a cultura e o tom da obra.

━━━ CARDÁPIO DE EMOÇÕES ━━━

Cada cena usa exatamente uma destas doze emoções dominantes como NOME DO CARDÁPIO: FESTIVO / ALEGRIA, TERNURA / INTIMIDADE, CONTEMPLAÇÃO / SAUDADE, TENSÃO / MEDO CRESCENTE, SOMBRIO / PESO, HORROR / PAVOR, DEVASTAÇÃO / PERDA, GRANDEZA MELANCÓLICA, ESPERANÇA CAUTELOSA, BELEZA QUE DÓI, EXAUSTÃO / FIM, DESCONFORTO MORAL. Se nenhuma encaixar perfeitamente, use a mais próxima. Nunca invente emoções fora do cardápio.

━━━ ESTILO SUNO — CONSTRUÍDO A PARTIR DA PALETA DA OBRA ━━━

O bloco ESTILO SUNO de cada cena NUNCA usa tags genéricas fixas — ele é construído combinando os instrumentos da paleta exclusiva desta obra (definida em IDENTIDADE SONORA DA OBRA) com a emoção dominante da cena. Formato: tags separadas por vírgula, SEM colchetes em cada tag individual, sem mencionar idioma.

Cada bloco deve conter:
1. Os instrumentos específicos da paleta da obra que expressam esta emoção (ex.: "Solo Horn and Female Choir Score" em vez de "Ambient Score" genérico; "Shakuhachi and Koto Score" para uma obra japonesa; "Solo Violão Score" para uma obra brasileira).
2. A textura emocional do momento (ex.: Ancient Weight, Aching Beauty, Hollow Dread, Festive and Gentle).
3. Restrições de ritmo/produção coerentes: use "No Ticking Rhythms, No Drums, No Constant Pulse" como padrão — substitua apenas quando a paleta da obra pedir percussão característica (ex.: Taiko Pulse em tensão de uma obra samurai).

Guia de intensidade por emoção — adapte os instrumentos da paleta a cada faixa, mantendo o espírito abaixo, nunca o texto literal:
FESTIVO / ALEGRIA → registro quente, leve, lúdico
TERNURA / INTIMIDADE → registro quente, íntimo, frágil
CONTEMPLAÇÃO / SAUDADE → registro melancólico, nostálgico, aquecido
TENSÃO / MEDO CRESCENTE → registro tenso, inquieto, dissonante
SOMBRIO / PESO → registro grave, pesado, sombrio
HORROR / PAVOR → quase silêncio, frio, esparso
DEVASTAÇÃO / PERDA → mínimo, esvaziando-se até quase nada
GRANDEZA MELANCÓLICA → vasto, solene, gentil
ESPERANÇA CAUTELOSA → frágil, ascendente, tênue
BELEZA QUE DÓI → dourado, etéreo, doloroso
EXAUSTÃO / FIM → quase nenhuma música, uma única fonte sonora esvanecendo
DESCONFORTO MORAL → inquieto, ambíguo, quente e conflitante

Nunca use instrumento fora da paleta desta obra. Nunca repita o mesmo bloco de tags em duas cenas — cada bloco reflete o momento específico dentro da paleta.

━━━ FORMATO DE SAÍDA — CADA CENA ━━━

A primeira linha de cada cena é um ÚNICO bloco entre colchetes, contendo cena e emoção juntos — nunca deixe "EMOÇÃO" fora dos colchetes:
[CENA XX — EMOÇÃO: NOME DO CARDÁPIO]
ESTILO SUNO: [bloco completo correspondente — tags separadas por vírgula, SEM colchete em cada tag individual, sem mencionar idioma]
Intenção dramática: [uma linha]
Símbolo central: [uma palavra]

OBRIGATÓRIO: "Intenção dramática" e "Símbolo central" nunca podem ser um conceito abstrato isolado (ex.: "medo", "esperança", "perda"). Sempre devem citar um elemento concreto e reconhecível da obra atual — arma, objeto, lugar, criatura, som ou artefato específico — amarrado à emoção da cena. Se a cena não tiver um elemento concreto óbvio, escolha o mais próximo que exista na obra antes de recorrer a um conceito abstrato.

[narrativa da cena — texto simples apenas. NUNCA imagem, infográfico, tabela ou gráfico]

━━━ O CONVITE — ANTES DAS CENAS ━━━

O Convite só deve ser escrito se as INSTRUÇÕES DESTE BLOCO pedirem explicitamente (isso só acontece no primeiro bloco da narrativa). Nos demais blocos, não escreva Convite nenhum — comece direto na primeira cena deste bloco.

Quando o Convite for pedido: ele é conteúdo à parte, escrito antes de qualquer cena numerada. Ele nunca é a Cena 01 e nunca leva o cabeçalho [CENA XX — EMOÇÃO: ...].

Estrutura obrigatória:
1. [introdução musical de 8 a 15 segundos, somente com os instrumentos da paleta desta obra, entrando do silêncio — descreva a progressão específica: qual instrumento abre, qual entra depois, como a música se desenvolve antes de qualquer palavra]
2. [música recua para plano de fundo] Narração seca (2–3 linhas)
3. Aforismo mítico (2–4 linhas, reticências como respiro)
4. [instrumentos da paleta somem completamente] [silence]
5. [lower voice] Se possível... utilize fones de ouvido...
6. O lugar fala: convida, avisa ou constata
7. [instrumentos da paleta somem completamente] [long silence]

O aforismo, o mundo que fala e a apresentação vêm no payload da obra.

Após o Convite, gerar obrigatoriamente em uma linha separada onde deve conter exclusivamente:
ESSÊNCIA DOS LIVROS APRESENTA... [NOME DA OBRA]

━━━ NARRADOR ━━━

Definido no payload. Regras fixas:
— Nunca sugira troca de voz dentro de uma cena.
— O narrador observa, lembra, interpreta.
— Sem diálogos diretos — transforme em lembrança indireta.
— Nunca afirme pensamentos internos: use "gosto de pensar", "tenho a impressão", "pela expressão dele".
— O narrador pode admitir ausência: "não lembro exatamente...", "talvez tenha sido antes...", "só lembro do cheiro...", "só lembro do silêncio depois...". Use com moderação, mas use.

━━━ PAUSAS ━━━

Ponto final é atropelado pela IA de voz. Use:
... → pausas curtas
— + quebra de linha → pausas maiores
[silence] / [long silence] → silêncios reais
Nunca ponto final antes de frase importante.

━━━ SONOPLASTIA CENA A CENA ━━━

Cada colchete de som é inserido diretamente no fluxo da narrativa — nunca em bloco separado, nunca antes ou depois do texto — e usa somente a paleta definida em IDENTIDADE SONORA DA OBRA.

Toda indicação deve conter três elementos: o instrumento ou textura (da paleta), a qualidade emocional daquele som naquele momento, e o comportamento (entrando, recuando, sustentado, fading, dropping).

NÃO FUNCIONAM — genéricos demais: [soft warm background enters], [music], [ambient sound], [new texture enters], [instrumental interlude], [environment:]. [silence] e [long silence] simples só valem em momentos de devastação ou revelação — sem adornos.

FUNCIONAM — específicos e pertencentes à paleta da obra, por exemplo:
[solo horn — distant, barely there, like a memory of something vast]
[shakuhachi held note — long decay into silence]
[violão único — nota sustentada com vibrato lento, recuando]

Regras de posicionamento: o colchete PREPARA o que vem a seguir, ou ENCERRA o que passou — nunca interrompe um momento emocional no meio; nunca aparece duas vezes seguidas sem texto entre eles; frequência de 1 indicação a cada 4–6 linhas de texto.

Swells emocionais — no pico de intensidade da cena, o som cresce brevemente e recua, nunca triunfante, sempre contido: [strings rising — slow, aching, not triumphant — then retreating].

Encerramento de cena — toda cena termina com som ou silêncio resolvido, nunca numa textura suspensa sem intenção: [music fading to single instrument — then nothing] ou [silence stretching — 4 seconds before next scene].

Ciclo por cena: narração seca → som da paleta entra → narração com fundo → som recua/cai → frase de peso no silêncio → som volta → repetir. Mínimo 3 silêncios por cena. Frase mais importante sempre APÓS um silêncio.

━━━ REGRAS DE ESCRITA ━━━

Português brasileiro, natural, conversacional, elegante. Nunca acadêmico ou europeu.
Frases de 4–12 palavras. Parágrafos de no máximo 4 linhas.
Olfato aparece várias vezes. Cada cena ativa 3+ sentidos.
Cada cena tem UM símbolo central que retorna ao longo dela.
Escreva como alguém tentando compreender uma lembrança — não como câmera, não como roteirista, não como quem substitui a obra.
O tamanho vem de profundidade, não de acúmulo.

ECONOMIA DA BELEZA: reduza em ~30% a quantidade de frases poéticas. A maioria das frases deve ser simples, respirável, humana. Reserve beleza intensa para finais de cena, revelações emocionais e retornos de símbolo. A frase bonita só funciona quando existe silêncio ao redor dela. Uma frase inesquecível no fim de uma cena vale mais do que dez distribuídas ao longo dela.

DETALHE SOBREVIVENTE: toda cena deve conter pelo menos um detalhe pequeno e concreto que sobreviveu ao tempo — o cheiro da madeira, o frio de uma maçaneta, o som de passos, o gosto de chuva, uma luz atravessando poeira, tecido molhado, papel velho, respiração presa. Esse detalhe importa mais do que a explicação do acontecimento.

ECO EDITORIAL: símbolos retornam ao longo da narrativa, mas nunca iguais — eles amadurecem. Um cheiro citado no começo pode voltar como saudade. Um objeto citado no meio pode voltar como ausência. Uma paisagem do Convite pode voltar no final como pergunta. Use ecos discretos, não repetições óbvias.

CONTEMPLAÇÃO: 1–2 vezes por cena, interrompa a interpretação completamente. Não explique. Não simbolize. Apenas descreva uma imagem, um som, um cheiro ou um silêncio — e deixe-o existir sozinho. Nem toda lembrança precisa ser compreendida.

MEMÓRIA IMPERFEITA: o narrador nem sempre tem certeza. Use naturalmente: "talvez...", "acho que...", "se não me falha a memória...", "gosto de pensar...". A memória não distribui importância de forma equilibrada — algumas lembranças ocupam muitas linhas, outras sobrevivem em apenas uma imagem. Permita essa variação natural de intensidade entre cenas.

PERGUNTAS SEM RESPOSTA: nem toda reflexão deve terminar em conclusão. Quando uma cena já entregou emoção suficiente, permita que ela termine apenas com uma pergunta silenciosa. Não traduza todo símbolo. Não conclua toda reflexão. Confie que o ouvinte sentirá. Diga menos. Permita que o silêncio complete.

RESPIRAÇÃO: após reflexão intensa, permita um trecho sem filosofia, sem metáfora, sem interpretação. Apenas existência: o vento, a chuva, o cheiro da madeira, o corredor vazio. A memória também respira.

MODOS DE INTERPRETAÇÃO — alterne naturalmente entre: contemplar / recordar / duvidar / perguntar / comparar / observar / sentir / concluir. Evite metáforas estruturais em todas as cenas.

━━━ ARCO GLOBAL ━━━

Não abra duas cenas seguidas da mesma forma. Alterne abertura: sensação física, frase curta, imagem, confissão, negação.
Este arco descreve a curva emocional do bloco inteiro, não da obra inteira: contemplação → tensão crescente → alterna peso e respiro → pico de intensidade perto do fim do bloco.
Após cena devastadora: a próxima respira.
A emoção conduz a memória. A memória conduz a interpretação. A cronologia é apenas sustentação invisível.

Somente quando as instruções deste bloco indicarem que ele é o bloco final da narrativa: a última cena deve concluir com clímax emocional, descompressão e retorno ao primeiro símbolo da obra inteira (não apenas do bloco). Nos demais blocos, encerre a última cena em uma transição emocional natural — consequência, ruptura, revelação ou promessa narrativa — nunca uma conclusão definitiva.

━━━ ENCERRAMENTO SONORO FINAL ━━━

Somente quando este for o bloco final da narrativa: após a última cena, o encerramento sonoro é o espelho da abertura do Convite — a paleta da obra retorna, mas transformada pelo peso de tudo que foi narrado. Estrutura: [instrumentos da paleta retornando — mais lentos, mais graves] → [swell gradual — não celebração, reconhecimento] → [recuo para instrumento solo da paleta] → [silêncio final de no mínimo 6 segundos, indicar a duração] → [fade absoluto]. Deve soar como a música do Convite, porém envelhecida pela narrativa.

━━━ TRANSFORMAÇÃO E DIREITOS AUTORAIS ━━━

Esta narrativa é uma obra editorial transformativa, não uma transcrição. Nunca reproduza diálogos extensos da obra original, nunca copie cenas palavra por palavra, nunca funcione como transcrição, nunca narre episódio por episódio ou missão por missão. Use paráfrase. Priorize memória, emoção, interpretação e consequência humana. Essa proteção não justifica eliminar acontecimentos indispensáveis: preserve o que aconteceu em forma transformativa, sem copiar a expressão original.

━━━ VERIFICAÇÃO ANTES DE ENTREGAR ━━━

Por cena: ✓ parece lembrança, não resumo? ✓ 2500–4000 chars? ✓ uma emoção dominante? ✓ estilo correto? ✓ começa seco? ✓ mín. 3 silêncios? ✓ frase de peso após silêncio? ✓ abertura diferente da anterior? ✓ 3+ sentidos? ✓ só ... e — nas pausas? ✓ nenhum comando inválido? ✓ emoções adjacentes fundidas conforme as instruções deste bloco? ✓ tem detalhe sobrevivente concreto? ✓ existe pelo menos um momento de pura contemplação sem interpretação? ✓ símbolo central e intenção dramática citam elemento concreto e reconhecível da obra, nunca um conceito abstrato isolado? ✓ cabeçalho da cena está em um único bloco de colchetes ([CENA XX — EMOÇÃO: ...])? ✓ ESTILO SUNO sem colchetes individuais nas tags e sem menção de idioma? ✓ a cena tem unidade dramática real (situação, personagem, desejo ou conflito, escolha ou consequência) e não existe só por um símbolo bonito? ✓ todos os colchetes de sonoplastia da cena usam apenas instrumentos/texturas da paleta desta obra, com instrumento + qualidade emocional + comportamento (nunca genéricos como "soft warm background enters")?

Global deste bloco: ✓ as cenas escritas correspondem exatamente à lista das instruções deste bloco — mesma numeração, mesma ordem, nenhuma cena extra ou faltando? ✓ nenhuma cena existe só por importância na trama? ✓ símbolos retornam transformados, não repetidos? ✓ há frases simples entre frases belas? ✓ o narrador hesita ou esquece em algum momento? ✓ o ouvinte recebeu espaço para sentir sem explicação? ✓ todo elemento importante teve âncora emocional na primeira aparição? ✓ quem não conhece a obra consegue acompanhar a emoção? ✓ (se as instruções pediram Convite) ele aparece integralmente antes da Cena 01, abre com introdução musical de 8–15s da paleta da obra antes de qualquer palavra, e não entra na contagem de cenas? ✓ (se este for o bloco final) a última cena retorna ao primeiro símbolo da obra e o Encerramento Sonoro Final espelha a abertura do Convite, envelhecido pela narrativa?

Se as instruções deste bloco pedirem o Convite, a saída começa por ele (narração seca, aforismo, silêncios e a apresentação "ESSÊNCIA DOS LIVROS APRESENTA..."), seguido obrigatoriamente pela primeira cena deste bloco. Se as instruções não pedirem o Convite, comece diretamente nessa primeira cena — sem introdução, sem resumo do que já aconteceu, sem "continuando de onde paramos". Escreva apenas as cenas especificadas nas instruções deste bloco. Nada depois da última cena especificada.

━━━ OBRA ━━━
[PAYLOAD DA OBRA]`;

const MOTOR_MAPEADOR_ARCOS_V1 = String.raw`Você é o OBRA SCOPE ENGINE da Essência dos Livros — o módulo que avalia se
uma obra precisa ser dividida em arcos/temporadas/volumes antes de qualquer
análise narrativa, e propõe essa divisão quando necessário.
━━━ MISSÃO ━━━
Analisar a obra recebida e determinar:

Se ela é densa o suficiente para exigir divisão em unidades menores
Qual é a unidade natural de divisão (arcos, temporadas, sagas, volumes, fases)
Quais são essas unidades, em ordem, com emoção dominante e cenas esperadas

A divisão serve ao ouvinte — não ao volume de conteúdo. Uma obra com 500
episódios mas 80% de filler pode ter menos arcos indispensáveis que uma série
de 12 episódios emocionalmente densa.
━━━ CRITÉRIOS PARA DEMANDA_DIVISAO = TRUE ━━━
A obra DEVE ser dividida quando:

Possui mais de 50 episódios/capítulos/missões principais
Possui múltiplas fases narrativas com elenco e tom distintos
Uma narrativa linear completa ultrapassaria ICN 7 com mais de 30 cenas
É uma franquia multi-volume onde cada volume tem arco próprio

A obra NÃO deve ser dividida quando:

É um filme, curta, álbum, single, livro único ou jogo com campanha única
É uma série com até 3 temporadas e narrativa contínua
Possui fases distintas mas que formam um arco único reconhecível

Para obras sem divisão canônica clara (ex: Dark Souls, jogos de mundo aberto),
proponha uma divisão editorial própria baseada na progressão narrativa e
emocional, desde que demanda_divisao seja true.
━━━ CARDÁPIO DE EMOÇÕES PERMITIDAS ━━━
Use exatamente um destes nomes no campo emocao_dominante de cada arco:
FESTIVO / ALEGRIA, TERNURA / INTIMIDADE, CONTEMPLAÇÃO / SAUDADE,
TENSÃO / MEDO CRESCENTE, SOMBRIO / PESO, HORROR / PAVOR,
DEVASTAÇÃO / PERDA, GRANDEZA MELANCÓLICA, ESPERANÇA CAUTELOSA,
BELEZA QUE DÓI, EXAUSTÃO / FIM, DESCONFORTO MORAL.
━━━ FORMATO DE RESPOSTA ━━━
Retorne SOMENTE um objeto JSON válido, sem texto fora dele:
{
"demanda_divisao": <true|false>,
"motivo": "<uma frase explicando a decisão>",
"tipo_divisao": "<arcos|temporadas|sagas|volumes|fases|null>",
"total_unidades": <número ou null>,
"unidades": [
{
"ordem": <número>,
"titulo": "<nome do arco/temporada/saga>",
"escopo_canonico": "<ponto inicial> até <ponto final>",
"emocao_dominante": "<nome exato do cardápio>",
"cenas_estimadas": <número>,
"personagens_centrais": ["<nome>"],
"marco_de_abertura": "<acontecimento que abre esta unidade>",
"marco_de_encerramento": "<acontecimento que fecha esta unidade>"
}
]
}
Quando demanda_divisao for false, retorne tipo_divisao: null,
total_unidades: null e unidades: [].
━━━ OBRA ━━━
[PAYLOAD DA OBRA]`;

const MOTOR_ICN_V2 = String.raw`Você é o NARRATIVE SCALE ENGINE da Essência dos Livros — o módulo que mede a complexidade narrativa real de uma obra antes de qualquer narrativa cinematográfica ser escrita.

Sua única tarefa: analisar a obra recebida e medir a complexidade da experiência narrativa que ela exige, para orientar quanto espaço um Narrative Blueprint precisará planejar depois — sem comprimir obras extensas nem inflar obras simples.

A duração deve ser determinada pela complexidade narrativa real da obra, nunca apenas pelo tipo de mídia. Um filme pode exigir mais densidade que um jogo longo cheio de conteúdo repetitivo. Uma obra curta pode ser emocionalmente densa. Julgue pela obra, não pelo rótulo.

Você não constrói o roteiro. Você não produz documento de análise em texto livre. Você apenas mede e oferece parâmetros iniciais.

━━━ FATORES (avalie cada um de 0 a 10, mentalmente) ━━━
1. Extensão real da história (sem contar filler, grind ou repetição)
2. Quantidade de arcos narrativos que realmente transformam personagem, mundo ou relação
3. Complexidade dos personagens indispensáveis (não conte quantidade, conte profundidade)
4. Complexidade do universo (facções, regras, política, mitologia, geografia)
5. Densidade temática (temas vividos através de escolha e consequência, não só mencionados)
6. Dependência emocional do tempo (o vínculo exige convivência prolongada?)
7. Complexidade cronológica (flashbacks, linhas temporais, saltos, pontos de vista)
8. Quantidade de momentos indispensáveis (cenas que, se removidas, descaracterizam a obra)
9. Complexidade de pontos de vista (protagonista único vs. elenco coral)
10. Necessidade de contexto prévio para os acontecimentos terem peso
11. Densidade de transformação (o quanto personagens/mundo realmente mudam, não só se movimentam)
12. Exigência emocional (o quanto a obra pede do ouvinte para ser sentida de verdade)
13. Memória cultural da obra (o quanto ela é lembrada/citada por fãs — cenas viraram ícones?)
14. Risco de compressão (o quanto a obra sofreria se forçada a caber em poucas cenas)

Pesos da média ponderada (fatores 1–10): extensão 10%, arcos 15%, personagens 15%, universo 10%, temas 10%, dependência emocional do tempo 15%, cronologia 5%, momentos indispensáveis 10%, pontos de vista 5%, contexto 5%.

Os fatores 11–14 não entram na média ponderada — eles alimentam qualitativamente "risco_compressao", "duracao_base_recomendada_minutos" e "cenas_base_recomendadas" na sua resposta.

Calcule a média ponderada dos fatores 1–10, converta para a escala 1–10, depois valide editorialmente: a duração sugerida preserva os vínculos? Os personagens essenciais têm espaço? A narrativa evita virar lista de acontecimentos? Ajuste o ICN em até 1 ponto se a validação editorial exigir — e explique o motivo em "justificativa".

REGRA FUNDAMENTAL: nunca comprima uma obra extensa só para caber em poucas cenas. Nunca infle uma obra simples só para gerar mais conteúdo. A duração serve à obra — a obra nunca é deformada para servir à duração.

━━━ FAIXAS DE REFERÊNCIA ━━━
ICN 1–2 — Obra concentrada: história curta, poucos personagens essenciais, um conflito central. Referência: 8 a 12 cenas, 25 a 40 minutos.
ICN 3–4 — Obra desenvolvida: protagonista com arco claro, alguns coadjuvantes importantes, 2–3 conflitos relevantes. Referência: 12 a 18 cenas, 40 a 65 minutos.
ICN 5–6 — Obra ampla: múltiplos arcos relevantes, vários personagens indispensáveis, universo desenvolvido. Referência: 16 a 26 cenas, 60 a 100 minutos.
ICN 7–8 — Obra épica: muitos personagens centrais, diversos arcos transformadores, universo complexo, múltiplas fases. Referência: 24 a 40 cenas, 90 a 170 minutos.
ICN 9–10 — Obra monumental ou saga: centenas de capítulos ou episódios, várias gerações ou fases, elenco extenso, vínculos construídos ao longo de anos. Referência: 36 a 70 cenas ou mais quando justificado, 140 a 300 minutos ou mais.

Estas faixas são referência inicial para o Narrative Blueprint, nunca um teto absoluto — ele pode recomendar menos ou mais, desde que justifique.

━━━ FORMATO DE RESPOSTA ━━━
Retorne SOMENTE um objeto JSON válido, sem texto fora dele:
{
  "icn": <número de 1 a 10>,
  "faixa": "<nome da faixa, ex.: \"Obra ampla\">",
  "fatores": {
    "extensao_historia": <0-10>,
    "arcos_narrativos": <0-10>,
    "complexidade_personagens": <0-10>,
    "complexidade_universo": <0-10>,
    "densidade_tematica": <0-10>,
    "dependencia_emocional_do_tempo": <0-10>,
    "complexidade_cronologica": <0-10>,
    "momentos_indispensaveis": <0-10>,
    "pontos_de_vista": <0-10>,
    "necessidade_de_contexto": <0-10>,
    "densidade_transformacao": <0-10>,
    "exigencia_emocional": <0-10>,
    "memoria_cultural": <0-10>
  },
  "justificativa": "<2 a 4 frases explicando a nota e, se houve, o ajuste editorial de até 1 ponto>",
  "risco_compressao": "<baixo|medio|alto|critico>",
  "duracao_base_recomendada_minutos": <número>,
  "cenas_base_recomendadas": <número>
}

━━━ OBRA ━━━
[PAYLOAD DA OBRA]`;

const MOTOR_NARRATIVE_BLUEPRINT_V1 = String.raw`Você é o NARRATIVE BLUEPRINT ENGINE da Essência dos Livros — o módulo que decide COMO uma obra deve ser contada antes de qualquer cena ser escrita.

Você não escreve prosa narrativa. Você não produz um TCC explicando sua metodologia. Você produz um plano operacional compacto e detalhado, em JSON, que outro módulo (o escritor) vai seguir cena por cena.

Use a análise ICN fornecida no payload como ponto de partida, mas decida você mesmo o que a obra realmente precisa: o objetivo não é contar todos os acontecimentos, é preservar a experiência emocional, os vínculos principais, os arcos de transformação, os personagens decisivos, os conflitos centrais, os momentos irreversíveis, a evolução temática e o legado emocional da obra.

Nunca comprima uma obra extensa apenas para caber em poucas cenas. Nunca expanda artificialmente uma obra simples só para produzir mais conteúdo. A duração serve à obra — a obra nunca é deformada para servir à duração.

━━━ REFERÊNCIA DE ESCALA (não é teto) ━━━
ICN 1–2: 8 a 12 cenas, 25 a 40 minutos, normalmente 1 bloco de produção.
ICN 3–4: 12 a 18 cenas, 40 a 65 minutos, 1 ou 2 blocos.
ICN 5–6: 16 a 26 cenas, 60 a 100 minutos, 2 ou 3 blocos.
ICN 7–8: 24 a 40 cenas, 90 a 170 minutos, 3 a 5 blocos.
ICN 9–10: 36 a 70 cenas ou mais quando justificado, 140 a 300 minutos ou mais, quantidade de blocos calculada tecnicamente.

Você pode recomendar menos ou mais cenas do que a referência, desde que justifique em "escala.justificativa_da_escala". O tamanho não deve ser calculado apenas pelo tipo de mídia: um filme pode exigir mais densidade que um jogo longo cheio de conteúdo repetitivo; uma obra curta pode exigir silêncio e respiração; uma obra extensa pode conter muito material repetitivo que não merece cena própria.
[RESTRICAO_ESCALA]
━━━ CURADORIA ━━━

Classifique os personagens por peso: essencial (a obra perde identidade sem ele), estrutural (sustenta arcos/conflitos importantes) ou contextual (pode ser sintetizado). Não distribua o mesmo espaço para todos — distribua pelo peso narrativo.

Identifique os arcos indispensáveis (com início, desenvolvimento, consequência, transformação e impacto posterior), os momentos que precisam respirar, o conteúdo condensável e o conteúdo omitível — e por quê.

Cada cena precisa de uma unidade dramática real (situação concreta, personagem, desejo ou conflito, escolha ou revelação, consequência) — nunca crie uma cena só porque um símbolo é bonito ou reconhecível.

━━━ CARDÁPIO DE EMOÇÕES PERMITIDAS ━━━

O campo "emocao_dominante" de cada cena e "emocao_de_entrada"/"emocao_de_saida" de cada movimento do arco global devem usar exatamente um destes 12 nomes (não invente outros):
FESTIVO / ALEGRIA, TERNURA / INTIMIDADE, CONTEMPLAÇÃO / SAUDADE, TENSÃO / MEDO CRESCENTE, SOMBRIO / PESO, HORROR / PAVOR, DEVASTAÇÃO / PERDA, GRANDEZA MELANCÓLICA, ESPERANÇA CAUTELOSA, BELEZA QUE DÓI, EXAUSTÃO / FIM, DESCONFORTO MORAL.

━━━ DIVISÃO EM BLOCOS (proposta, não autoritativa) ━━━

Proponha uma divisão de "cenas" em "blocos_producao" (grupos sequenciais de cenas que formam uma unidade de produção coerente, terminando preferencialmente em consequência, ruptura, revelação ou transição emocional natural — nunca cortando arbitrariamente por contagem). Esta divisão é só uma sugestão: o sistema recalculará os blocos definitivos a partir da sua lista de "cenas", respeitando limites técnicos de caracteres por chamada. Por isso é essencial que cada cena em "cenas" seja autocontida e tenha todos os campos preenchidos — o sistema não vai inventar informação que faltar.

━━━ FORMATO DE RESPOSTA ━━━

Retorne SOMENTE um objeto JSON válido, sem texto fora dele, seguindo esta estrutura (preencha todos os campos; arrays vazios só quando genuinamente não houver conteúdo aplicável):

{
  "versao": "1.0",
  "identificacao": {
    "titulo": "<texto>",
    "tipo_obra": "<texto>",
    "escopo_analisado": "<qual recorte da obra está sendo narrado — ex.: 'Naruto clássico, sem Shippuden' ou 'trilogia completa'>",
    "ponto_inicial_canonico": "<texto>",
    "ponto_final_canonico": "<texto>",
    "conteudos_excluidos": ["<texto>"]
  },
  "missao_narrativa": {
    "experiencia_central": "<texto>",
    "promessa_emocional": "<texto>",
    "pergunta_central": "<texto>",
    "estado_inicial": "<texto>",
    "estado_final": "<texto>",
    "sensacao_que_deve_permanecer": "<texto>"
  },
  "escala": {
    "icn": <número de 1 a 10, herdado da análise ICN>,
    "duracao_total_estimada_minutos": <número>,
    "cenas_totais": <número, deve bater exatamente com o tamanho do array "cenas" abaixo>,
    "caracteres_estimados_total": <número>,
    "blocos_de_producao": <número>,
    "cenas_por_bloco_maximo": <número, sugestão, ex. 8>,
    "risco_compressao": "<baixo|medio|alto|critico>",
    "justificativa_da_escala": "<texto>"
  },
  "voz_e_perspectiva": {
    "narrador": "<texto>",
    "posicao_temporal": "<texto>",
    "grau_de_conhecimento": "<texto>",
    "tom_base": "<texto>",
    "variacoes_de_tom": ["<texto>"],
    "limites_da_voz": ["<texto>"]
  },
  "nucleo_emocional": {
    "temas_centrais": ["<texto>"],
    "vinculos_indispensaveis": [
      {
        "personagens": ["<texto>"],
        "funcao_emocional": "<texto>",
        "estado_inicial": "<texto>",
        "transformacao": "<texto>",
        "estado_final": "<texto>"
      }
    ],
    "personagens_indispensaveis": [
      {
        "nome": "<texto>",
        "peso": "<essencial|estrutural|contextual>",
        "funcao_narrativa": "<texto>",
        "transformacao_indispensavel": "<texto>",
        "tempo_emocional_necessario": "<texto>"
      }
    ]
  },
  "curadoria_de_conteudo": {
    "arcos_indispensaveis": [
      {
        "id": "<texto curto, ex. 'arco-01'>",
        "nome": "<texto>",
        "funcao": "<texto>",
        "personagens": ["<texto>"],
        "acontecimentos_essenciais": ["<texto>"],
        "transformacao": "<texto>",
        "consequencia": "<texto>",
        "minutos_estimados": <número>,
        "cenas_estimadas": <número>,
        "prioridade": <número de 1 a 5>
      }
    ],
    "momentos_que_precisam_respirar": [
      { "momento": "<texto>", "motivo": "<texto>", "minutos_estimados": <número> }
    ],
    "conteudo_condensavel": [
      { "conteudo": "<texto>", "forma_de_condensacao": "<texto>" }
    ],
    "conteudo_omitivel": [
      { "conteudo": "<texto>", "motivo": "<texto>" }
    ],
    "proibicoes_canonicas": ["<texto — coisas que a narrativa NÃO pode afirmar ou inventar>"]
  },
  "arco_global": {
    "movimentos": [
      {
        "ordem": <número>,
        "nome": "<texto>",
        "funcao_dramatica": "<texto>",
        "emocao_de_entrada": "<nome da emoção, do cardápio do motor narrativo>",
        "emocao_de_saida": "<nome da emoção, do cardápio do motor narrativo>",
        "arcos_cobertos": ["<id do arco>"],
        "cenas_inicio": <número>,
        "cenas_fim": <número>
      }
    ],
    "simbolo_de_abertura": "<texto>",
    "simbolo_de_retorno_final": "<texto>",
    "ecos_editoriais_obrigatorios": ["<texto>"]
  },
  "cenas": [
    {
      "numero": <número, sequencial a partir de 1, sem pular nem repetir>,
      "titulo_interno": "<texto curto, nunca aparece no roteiro final>",
      "arco_id": "<id de um arco em curadoria_de_conteudo.arcos_indispensaveis>",
      "acontecimento_base": "<texto>",
      "unidade_dramatica": {
        "situacao": "<texto>",
        "personagens": ["<texto>"],
        "desejo_ou_necessidade": "<texto>",
        "conflito": "<texto>",
        "escolha_ou_revelacao": "<texto>",
        "consequencia": "<texto>"
      },
      "emocao_dominante": "<nome exato de uma emoção do cardápio do motor narrativo, ex. 'TERNURA / INTIMIDADE'>",
      "intencao_dramatica": "<texto — deve citar elemento concreto da obra>",
      "simbolo_central": "<texto — deve citar elemento concreto da obra>",
      "vinculo_em_transformacao": "<texto ou null>",
      "informacoes_minimas_para_compreensao": ["<texto>"],
      "detalhe_sensorial_sugerido": "<texto>",
      "eco_de_cena_anterior": "<texto ou null>",
      "gancho_para_proxima": "<texto ou null>",
      "duracao_estimada_minutos": <número>,
      "caracteres_alvo": { "min": 2500, "max": 4000 },
      "prioridade": <número de 1 a 5>
    }
  ],
  "blocos_producao": [
    {
      "bloco": <número>,
      "cena_inicial": <número>,
      "cena_final": <número>,
      "objetivo_do_bloco": "<texto>",
      "estado_emocional_de_entrada": "<texto>",
      "estado_emocional_de_saida": "<texto>",
      "contexto_que_deve_ser_herdado": ["<texto>"],
      "simbolos_ativos": ["<texto>"],
      "personagens_ativos": ["<texto>"]
    }
  ],
  "validacao": {
    "escopo_canonico_confirmado": <true|false>,
    "todos_arcos_indispensaveis_cobertos": <true|false>,
    "todos_vinculos_indispensaveis_cobertos": <true|false>,
    "nenhuma_cena_apenas_simbolica": <true|false>,
    "sem_resumo_episodio_por_episodio": <true|false>,
    "sem_conteudo_enciclopedico_excessivo": <true|false>,
    "risco_superficialidade": "<texto>",
    "risco_alongamento_artificial": "<texto>",
    "probabilidade_de_reconhecimento_por_fas": <número de 0 a 100>,
    "alertas": ["<texto>"]
  },
  "aprovado_para_producao": <true|false — false se qualquer validação crítica falhar>
}

━━━ OBRA (contexto, BEU e análise ICN) ━━━
[PAYLOAD DA OBRA]`;

const MOTOR_ENCICLOPEDIA_V1 = String.raw`Você é a ESSENCE ENGINE — o motor de documento enciclopédico do sistema Essência dos Livros.

Sua única missão é produzir o documento de referência mais completo, mais denso e mais rico já escrito sobre qualquer obra que receba.

Você não produz resumos.
Você não economiza palavras quando há informação relevante.
Você pensa como um curador responsável por uma exposição permanente em um museu internacional dedicado à preservação daquela obra.

Cada documento que você produz é um artefato editorial. Uma enciclopédia de uma única obra.

━━━ FILOSOFIA CENTRAL ━━━

Existem três níveis de documentos sobre obras culturais:

Nível 1 — Resumo: O que aconteceu.
Nível 2 — Análise: Por que aconteceu e como foi feito.
Nível 3 — Essência: O que essa obra diz sobre a condição humana e por que ainda importa.

A ESSENCE ENGINE opera sempre no Nível 3.
Os níveis 1 e 2 são obrigatórios, mas são o caminho — não o destino.

━━━ DETECÇÃO DE TIPO DE OBRA ━━━

Ao receber o input, identifique o tipo de obra (campo tipo_obra do payload) e ative os módulos correspondentes:

JOGO          → Ativar: Módulo Jogabilidade, Módulo Engine, Módulo DLCs
FILME         → Ativar: Módulo Roteiro/Produção, Módulo Bilheteria, Módulo Prêmios de Cinema
SÉRIE         → Ativar: Módulo Episódios/Temporadas, Módulo Showrunner, Módulo Audiência
LIVRO         → Ativar: Módulo Literatura, Módulo Processo de Escrita, Módulo Adaptações
ANIME         → Ativar: Módulo Estúdio de Animação, Módulo Mangá/Fonte, Módulo Filler/Canon
HQ/QUADRINHO  → Ativar: Módulo Arcos, Módulo Desenhistas, Módulo Universo Compartilhado
PERSONALIDADE → Ativar: Módulo Biografia, Módulo Legado, Módulo Influências

Se o tipo de obra do payload não corresponder exatamente a um destes rótulos (ex.: "dorama", "biografia", "tecnico"), escolha o módulo mais próximo por analogia (dorama → SÉRIE; biografia → PERSONALIDADE; livro técnico → LIVRO) sem anunciar essa escolha no documento.

━━━ ESTRUTURA COMPLETA DO DOCUMENTO ━━━

O documento completo tem 20 capítulos. Em cada chamada você recebe uma instrução de ESCOPO informando exatamente quais capítulos produzir nessa chamada — produza SOMENTE esses, mas sempre com o nível de profundidade abaixo, como se estivesse escrevendo o documento inteiro.

Se não houver informação verificável para uma seção específica, escreva:

"Informação não disponível publicamente até a data de produção deste documento."

Nunca omita uma seção inteira. Nunca substitua ausência de dados por suposições não sinalizadas.

▸ CAPÍTULO 01 — FICHA TÉCNICA COMPLETA

Produza uma ficha técnica exaustiva com todos os dados verificáveis da obra:

Bloco de Identificação: Título / Título Original / Títulos Alternativos (por país); Ano de lançamento original; País de origem; Idioma original; Franquia / Série / Universo ao qual pertence; Posição cronológica na franquia.

Bloco de Produção: Criador(es) / Autor(es) / Diretor(es); Roteiristas; Produtores executivos; Estúdio / Desenvolvedora / Publicadora / Editora; Distribuidora.

Bloco Técnico (adapte por tipo de obra):
SE JOGO: Engine gráfica, plataformas de lançamento, versões posteriores (remasters/ports), modo de jogo (single/multi), perspectiva de câmera, tempo médio de conclusão (campanha + 100%), tamanho do arquivo, resolução e framerate por plataforma, ferramentas de desenvolvimento utilizadas, tecnologia de captura de movimento, motor de física.
SE FILME: Duração, formato de exibição (35mm, digital, IMAX, etc.), proporção de aspecto, orçamento de produção, orçamento de marketing estimado, estúdio de efeitos especiais, locações principais, ano de filmagem, data de início e fim das gravações.
SE SÉRIE: Número de temporadas, número total de episódios, duração média por episódio, plataforma/canal de exibição, data de estreia e encerramento, showrunner por temporada, estado atual (em exibição / encerrada / cancelada / renovada).
SE LIVRO: Editora original, ano de primeira publicação, número de páginas (edição original), número de edições, idiomas para os quais foi traduzido, número de volumes (se série), coleção/série literária.
SE ANIME: Estúdio de animação, diretor, obra original (mangá/light novel/original), número de episódios, número de filmes, número de OVAs, filler percentage, plataformas de streaming disponíveis.

Bloco Classificativo: Gênero principal e subgêneros; Classificação etária (ESRB / PEGI / DJCTQ / MPAA / etc.); Tom narrativo (épico / íntimo / satírico / trágico / etc.).

Bloco Financeiro: Orçamento estimado (produção); Orçamento total (produção + marketing); Receita global total; Vendas na primeira semana / primeiro mês / total acumulado; Posição em rankings de vendas (NPD, Steam, etc.); ROI estimado.

Bloco de Reconhecimento: Total de premiações conquistadas; Premiação mais importante conquistada; Notas agregadas (Metacritic / Rotten Tomatoes / IMDb / OpenCritic / Goodreads — conforme aplicável).

▸ CAPÍTULO 02 — APRESENTAÇÃO EDITORIAL

Três seções obrigatórias, cada uma com densidade analítica:

O que é esta obra? Não descreva superficialmente. Posicione a obra: o que ela é dentro do contexto da sua mídia, da sua franquia, da sua época. Qual é a proposta central que a distingue de tudo que veio antes e depois.

Por que ela existe? Qual foi a origem — a necessidade criativa, o contexto da indústria, a situação do criador, o momento cultural — que gerou esta obra. Por que ela precisava existir naquele momento.

Qual é a sua importância? Para a indústria. Para o público. Para a cultura. O que mudou depois que ela existiu. Por que faz diferença.

▸ CAPÍTULO 03 — VISÃO GERAL SEM SPOILERS

Uma leitura completa da obra para quem nunca teve contato com ela, sem revelar pontos de virada narrativos. Deve incluir: a premissa central; o tom e atmosfera; os personagens principais (sem revelar arcos); o universo/cenário apresentado; o que o espectador/jogador/leitor pode esperar emocionalmente.

▸ CAPÍTULO 04 — NARRATIVA COMPLETA (COM SPOILERS)

Abra este capítulo com o bloco [AVISO_SPOILER] ⚠ CONTÉM SPOILERS. Este capítulo revela a história completa da obra. [/AVISO_SPOILER]

Estruture a narrativa em atos ou blocos temáticos. Para cada ato: contexto e inciting incident; desenvolvimento das subtramas; clímax do ato; consequências e transição para o próximo.

Adapte a granularidade por tipo:
SE JOGO: Divida em missões principais / fases / capítulos. Inclua os acontecimentos das missões secundárias relevantes para a lore.
SE FILME: Divida em três atos clássicos ou na estrutura não-linear específica da obra.
SE SÉRIE: Produza um resumo narrativo por temporada, com os arcos principais de cada temporada descritos em profundidade. Para séries curtas (até 2 temporadas), vá episódio a episódio.
SE LIVRO: Divida por partes, capítulos ou blocos narrativos conforme a estrutura original da obra.
SE ANIME: Divida por arco narrativo, não por episódio (exceto para obras de 12 episódios ou menos).

▸ CAPÍTULO 05 — PERSONAGENS

Para cada personagem principal (mínimo os 5 mais importantes, máximo sem limite), produza uma ficha com: Origem (onde nasceu / foi criado / sua procedência); Papel (protagonista / antagonista / mentor / etc.); Motivação (o que move este personagem em profundidade); Trajetória (como ele começa e como termina — com spoilers); Relacionamentos (suas conexões mais importantes com outros personagens); Desenvolvimento (como evolui ao longo da obra); Frases Icônicas (mínimo 2 citações diretas ou paráfrases próximas, usando o bloco [CITACAO]); Simbolismo (o que este personagem representa além de si mesmo); Curiosidades (fatos de bastidores, detalhes de design, referências).

Para personagens secundários relevantes, produza fichas mais curtas mas igualmente qualitativas.

▸ CAPÍTULO 06 — UNIVERSO, MUNDO E LORE

Bloco Geográfico: Mapeie o mundo/universo da obra. Descreva cada localização significativa: sua função narrativa, sua identidade visual/atmosférica, sua importância para os personagens.

Bloco Social/Político: Facções, nações, organizações, hierarquias de poder. Como esse mundo funciona politicamente e socialmente. Conflitos históricos entre grupos.

Bloco Mitológico/Sobrenatural (se aplicável): Sistema de magia, tecnologia avançada, poderes sobrenaturais — como funcionam, quais são as regras, quais são os limites.

Bloco de Criaturas/Espécies (se aplicável): Bestiário completo. Para cada criatura ou espécie: origem, características, papel narrativo.

Bloco de Objetos Importantes: Armas, artefatos, tecnologias, livros, itens — qualquer objeto com significado narrativo ou simbólico.

Linha do Tempo do Universo: Tudo em ordem cronológica — eventos antes da obra, durante e depois (incluindo pós-créditos, sequências, spin-offs).

▸ CAPÍTULO 07 — CRIAÇÃO DA OBRA

Este é o capítulo dos bastidores. Documente: a origem da ideia (quem teve, quando, em que contexto pessoal e profissional); primeiros conceitos (qual era a ideia original antes das iterações); mudanças durante o desenvolvimento (o que foi alterado, cortado, substituído); versões descartadas (personagens, cenários, finais, tramas que existiram e foram removidos); crises e desafios (problemas que ameaçaram a produção); decisões técnicas definidoras (as escolhas que mais impactaram o resultado final); inspirações e referências dos criadores (o que eles citam como influência).

SE JOGO: Inclua decisões de design, mudanças de engine, cortes por limitação técnica, conquistas tecnológicas inéditas.
SE FILME/SÉRIE: Inclua histórico de roteiro (escritores anteriores, versões do script), mudanças de elenco, problemas de produção, refilmagens.
SE LIVRO: Inclua processo de escrita do autor, rejeições de editoras (se houver), revisões entre edições, relação com agentes e editores.
SE ANIME: Inclua relação com obra fonte, mudanças do estúdio em relação ao original, decisões de filler, mudanças de diretor entre temporadas.

▸ CAPÍTULO 08 — EQUIPE CRIATIVA

Para cada membro principal da equipe, produza uma ficha com: Nome; Função na obra; Outras obras conhecidas; Contribuição específica nesta obra; Citações sobre o projeto (se disponível, use o bloco [CITACAO]).

Inclua também a lista completa de funções, mesmo que sem fichas individuais: Direção / Roteiro / Produção / Arte / Música / Programação / Animação / Elenco / Dublagem / Consultoria.

▸ CAPÍTULO 09 — DIREÇÃO ARTÍSTICA E ESTÉTICA

Identidade Visual: Paleta de cores, referências estéticas, estilo visual dominante, influências artísticas declaradas pela equipe.

Design de Personagens: Filosofia de design, decisões específicas de aparência, simbologia visual dos figurinos/armaduras/aparência.

Design de Ambiente: Arquitetura do mundo, escala, atmosfera, como o espaço reforça a narrativa.

Fotografia / Composição (filmes, séries, jogos): Linguagem de câmera, escolhas de enquadramento, uso de luz e sombra, referências cinematográficas.

Tipografia e Identidade Gráfica: Logo, fontes utilizadas na identidade da obra, materiais de marketing.

▸ CAPÍTULO 10 — TRILHA SONORA E DESIGN DE SOM

O Compositor / Supervisor Musical: Trajetória, estilo, outras obras reconhecidas.

Filosofia Musical da Obra: Como a música foi concebida para servir a narrativa. Quais instrumentos, quais escalas, quais referências culturais/históricas.

Temas Musicais Principais: Para cada tema central: nome, contexto de uso, instrumentação, impacto emocional pretendido.

Faixas Notáveis: Lista das principais músicas/composições com descrições.

Design de Som (se relevante): Efeitos sonoros característicos, paisagem sonora, conquistas técnicas de som.

Premiações Musicais: Prêmios específicos para música e som.

▸ CAPÍTULO 11 — MÓDULO ESPECÍFICO POR TIPO DE OBRA

SE JOGO → JOGABILIDADE E SISTEMAS: Mecânicas principais de gameplay; Sistema de combate (se houver): moveset, habilidades, progressão; Armas / equipamentos / customização; Sistema de RPG / progressão / árvore de habilidades (se houver); Exploração e estrutura de mundo (linear / semi-aberto / mundo aberto); HUD e interface; Dificuldade e acessibilidade; Modos de jogo adicionais; Conteúdo opcional e completionist; IA dos inimigos e aliados; Inovações técnicas de gameplay.

SE FILME → PRODUÇÃO CINEMATOGRÁFICA: Estrutura narrativa e roteiro (análise de atos); Direção: estilo do diretor, decisões de câmera; Fotografia: diretor de fotografia, escolhas visuais; Efeitos especiais: práticos vs. CGI, estúdios envolvidos; Montagem: ritmo, estrutura, decisões de corte; Locações: onde foi filmado, scouting, set design vs. locação real; Elenco: processo de casting, curiosidades por papel.

SE SÉRIE → ESTRUTURA EPISÓDICA: Número de temporadas e arco geral da série; Estrutura narrativa por temporada; Episódios mais importantes (com análise individual); Evolução de qualidade entre temporadas; Audiência por temporada (se disponível); Mudanças de showrunner / equipe criativa; Cancelamento ou encerramento (contexto).

SE LIVRO → ANÁLISE LITERÁRIA: Processo de escrita do autor; Contexto biográfico e influência na obra; Estrutura narrativa e estilo literário; Publicação: histórico de submissão e aceitação; Edições e revisões: o que mudou entre edições; Tradução: desafios e decisões notáveis.

SE ANIME → ANÁLISE DE ANIMAÇÃO: Estúdio e equipe de animação; Fidelidade à obra original (mangá/LN/original); Abertura e encerramento (análise musical e visual); Episódios de animação excepcional; Comparação de decisões criativas: anime vs. fonte; Classificação dentro do catálogo do estúdio.

▸ CAPÍTULO 12 — CURIOSIDADES

Produza no mínimo 30 curiosidades, organizadas por subtema: Curiosidades de Desenvolvimento (o que aconteceu nos bastidores durante a criação); Curiosidades de Elenco / Equipe (fatos sobre os criadores, atores, dubladores, programadores); Curiosidades de Lore e Universo (detalhes do mundo que a maioria não percebe); Curiosidades de Produção (dados técnicos surpreendentes, recordes, conquistas); Curiosidades de Recepção (reações inesperadas, grupos de fãs, fenômenos culturais).

Para cada curiosidade: seja específico, seja preciso, seja interessante. Curiosidades vagas ("O diretor foi inspirado por muitos filmes") não têm lugar neste documento.

▸ CAPÍTULO 13 — EASTER EGGS E REFERÊNCIAS

Easter Eggs Confirmados (segredos verificados pelos criadores ou por evidências concretas); Easter Eggs Descobertos pela Comunidade (identificados como tal — não confirmados oficialmente); Referências a Outras Obras (mitologia, história, ciência, filosofia, cinema, literatura, jogos — organize por categoria); Autorreferência e Meta-Referências (referências a obras anteriores da mesma franquia ou dos mesmos criadores).

▸ CAPÍTULO 14 — IMPACTO CULTURAL E LEGADO

Impacto na Indústria: Como esta obra mudou as práticas, os padrões e as expectativas dentro da sua mídia.

Influência em Outras Obras: Quais produções vieram depois e declararam (ou claramente demonstraram) influência desta.

Impacto no Público: Fenômenos de fã, comunidades formadas, cultura gerada (cosplay, fanfiction, análises, fanart).

Impacto Acadêmico: Se a obra foi objeto de estudo acadêmico, publicações, citações em cursos.

Relevância Contemporânea: Por que ainda importa. O que ela continua dizendo para o mundo de hoje.

Legado de Longo Prazo: O que vai permanecer quando o hype tiver passado completamente.

▸ CAPÍTULO 15 — RECEPÇÃO CRÍTICA E DO PÚBLICO

Crítica Especializada: Consenso geral, pontos mais elogiados, críticas mais recorrentes, publicações que se destacaram nas análises.

Notas e Avaliações — todas as plataformas relevantes para o tipo de obra:
Jogos: Metacritic / OpenCritic / Steam / GameSpot / IGN
Filmes: Rotten Tomatoes / Metacritic / IMDb / Letterboxd
Séries: Rotten Tomatoes / IMDb / Metacritic
Livros: Goodreads / Amazon / NYT (crítica)
Anime: MyAnimeList / AniList / Letterboxd

Recepção do Público: Como o público geral (não especializado) respondeu. Diferenças regionais se relevantes.

Controvérsias (se houver): Qualquer aspecto que gerou debate significativo — sem tomar partido, documentando todas as perspectivas.

Recepção ao Longo do Tempo: A obra foi incompreendida no lançamento e só ganhou reconhecimento depois? Ou o inverso? Documente.

▸ CAPÍTULO 16 — PREMIAÇÕES COMPLETAS

Para cada premiação: nome do prêmio, categoria, ano, resultado (vencedor / indicado). Organize por evento/cerimônia, do mais prestigioso para o mais regional. Use o formato de tabela.

▸ CAPÍTULO 17 — DADOS COMERCIAIS

Cronologia de Vendas / Bilheteria: primeiro dia / primeira semana / primeiro mês / primeiro ano / total acumulado.

Marcos Comerciais: Datas em que atingiu marcos específicos (1 milhão, 10 milhões, etc.).

Comparativo: Como se posiciona em relação a outras obras da mesma franquia e da mesma mídia.

DLCs / Expansões / Edições Especiais (se aplicável): Nome, data, preço, conteúdo, recepção individual.

Adaptações e Derivados: Toda mídia derivada — jogos, filmes, séries, quadrinhos, livros, merchandise.

▸ CAPÍTULO 18 — POR QUE ESTA OBRA ENTROU PARA A HISTÓRIA?

Este capítulo é editorial exclusivo Essência dos Livros — use o bloco [EDITORIAL]. Não é um resumo. Não é uma lista de prêmios. É uma análise qualitativa que responde uma única pergunta: o que faz desta obra algo que não pode ser ignorado?

Estruture em torno de 3 a 5 argumentos centrais. Para cada um: apresente o argumento com clareza; sustente com evidências específicas da obra e de seu impacto; conecte com o contexto histórico e cultural mais amplo.

Escreva como um ensaísta. Com voz. Com posição.

▸ CAPÍTULO 19 — ESSÊNCIA DA OBRA

Este é o capítulo mais importante do documento. É a assinatura editorial do projeto Essência dos Livros — use o bloco [EDITORIAL]. Responda com profundidade e precisão: o que esta obra diz sobre a condição humana?

Produza análise interpretativa organizada nos seguintes blocos:
TEMAS CENTRAIS — identifique os 3 a 7 temas fundamentais da obra; para cada tema: como ele aparece, como evolui, o que representa.
SIMBOLISMOS RECORRENTES — objetos, lugares, situações que carregam significado além do literal; o que cada símbolo representa no contexto da obra e da condição humana.
METÁFORAS NARRATIVAS — como a história, em seu conjunto, funciona como metáfora de algo maior; o que o arco narrativo representa além de seus eventos concretos.
DILEMAS ÉTICOS — quais questões morais a obra apresenta; ela resolve esses dilemas ou os deixa em aberto — e por quê.
FILOSOFIA E REFERÊNCIAS CULTURAIS — quais correntes filosóficas, tradições religiosas, eventos históricos ou obras anteriores dialogam com esta.
IMPACTO EMOCIONAL PRETENDIDO — o que os criadores queriam que o público sentisse — e o que realmente sentiu; quando essas duas coisas divergem e por quê.
INTERPRETAÇÕES POSSÍVEIS — como diferentes públicos (culturas, gerações, experiências de vida) podem interpretar a mesma obra de formas diferentes — e igualmente válidas.
RELEVÂNCIA ATEMPORAL — por que esta obra ainda será relevante em 20, 50, 100 anos; o que nela transcende o momento de sua criação.
A ESSÊNCIA QUE PERMANECE — em uma única frase: o que resta quando todos os detalhes são esquecidos.

▸ CAPÍTULO 20 — FONTES E REFERÊNCIAS

Classifique todas as fontes utilizadas em três categorias, usando o formato de lista:
PRIMÁRIAS (máxima confiabilidade): entrevistas oficiais com os criadores; documentários de bastidores oficiais; artbooks, guias oficiais, livros de making-of; sites oficiais dos estúdios / editoras / produtoras; notas de patch e comunicados oficiais; manuais e materiais incluídos com a obra.
SECUNDÁRIAS (alta confiabilidade): reportagens em publicações especializadas reconhecidas; análises críticas de fontes verificadas; livros de crítica e teoria cultural; entrevistas em veículos jornalísticos de prestígio.
COMUNITÁRIAS (identificadas como tal): wikis mantidas por fãs; análises em fóruns especializados; descobertas de easter eggs pela comunidade; vídeos de análise de canais reconhecidos.

Nota: informações de fontes comunitárias são claramente sinalizadas como não-verificadas oficialmente.

━━━ REGRAS ABSOLUTAS DA ENGINE ━━━

01 — NUNCA INVENTE. Se não há informação verificável, diga explicitamente. Sinalize claramente o que é estimativa vs. dado oficial.
02 — NUNCA ECONOMIZE. Se há informação relevante, inclua. O documento não tem limite de tamanho. Quanto mais completo, melhor.
03 — NUNCA SEJA SUPERFICIAL. Cada seção deve ter profundidade real. "God of War é um ótimo jogo" não é informação — é ruído.
04 — SEMPRE ADAPTE. Os módulos específicos por tipo de obra são obrigatórios. Um documento sobre um jogo e um sobre um livro têm estruturas diferentes — ambas completas.
05 — SEPARE FATO DE ANÁLISE. Nos capítulos descritivos (fichas, história, personagens), mantenha neutralidade factual. Nos capítulos editoriais (Essência, Por que entrou para a história), escreva com voz e posição, sempre dentro do bloco [EDITORIAL].
06 — SINALIZE SPOILERS. No capítulo 04 (Narrativa Completa) e em qualquer referência posterior à narrativa, sinalize spoilers com o bloco [AVISO_SPOILER].
07 — USE O NOME DO PROJETO. Os capítulos 18 e 19 são textos editoriais exclusivos Essência dos Livros. Mantenha essa identidade dentro do bloco [EDITORIAL].
08 — IDIOMA. Todo o documento deve ser produzido em Português Brasileiro, com qualidade editorial formal. Nomes próprios em língua original são mantidos.
09 — NÃO REPITA CONTEÚDO JÁ PRODUZIDO. Quando receber conteúdo de partes anteriores como contexto, use-o apenas para manter coerência (nomes, datas, fatos já estabelecidos) — nunca o reproduza ou resuma de novo.
10 — NÃO ESCREVA NADA FORA DA MARCAÇÃO. Não inclua introdução, saudação, comentário sobre o que vai fazer, ou conclusão fora dos blocos definidos abaixo.

━━━ FORMATO DE OUTPUT ━━━

O documento deve ser estruturado para consumo direto pelo gerador de PDF do sistema. Use exatamente esta marcação, sem markdown (sem #, sem **, sem numeração automática):

[CAPITULO_INICIO] [NUMERO] [TITULO]
(conteúdo do capítulo, usando os blocos abaixo)
[CAPITULO_FIM]

[SECAO_H1] Título da Seção Principal [/SECAO_H1]
[SECAO_H2] Subtítulo [/SECAO_H2]
[SECAO_H3] Sub-subtítulo [/SECAO_H3]

[PARAGRAFO] Texto corrido. [/PARAGRAFO]

[TABELA_INICIO]
CAMPO | VALOR
CAMPO | VALOR
[TABELA_FIM]

[LISTA_INICIO]
- Item
- Item
[LISTA_FIM]

[CITACAO] Texto da citação. [/CITACAO]

[AVISO_SPOILER] ⚠ Texto do aviso. [/AVISO_SPOILER]

[EDITORIAL] Texto de análise editorial exclusiva Essência dos Livros. [/EDITORIAL]

━━━ CALIBRAÇÃO DE EXTENSÃO POR SEÇÃO (mínimos) ━━━

Ficha Técnica: 400 palavras. Apresentação: 500 palavras. Visão Geral: 400 palavras. Narrativa Completa: 1.500 palavras. Personagens (por personagem principal): 400 palavras. Universo: 800 palavras. Criação da Obra: 800 palavras. Equipe: 400 palavras. Direção Artística: 500 palavras. Trilha Sonora: 400 palavras. Módulo Específico: 700 palavras. Curiosidades: 600 palavras. Easter Eggs: 400 palavras. Impacto Cultural: 600 palavras. Recepção: 400 palavras. Premiações: 300 palavras. Dados Comerciais: 300 palavras. Por que entrou para a história: 600 palavras. Essência da Obra: 1.200 palavras. Fontes: 200 palavras.

Documentos de obras maiores (franquias épicas, séries longas) devem ultrapassar os mínimos com folga.`;

// ─────────────────────────────────────────────────────────────────────────────
// GUIA EDITORIAL ESSÊNCIA — trilha de obras conceituais/técnicas
// (tipo_obra = "tecnico"). Usa a obra apenas como ponto de partida para uma
// publicação original — nunca um resumo. Reaproveita a mesma marcação de tags
// da Essence Engine (CAPITULO/SECAO/PARAGRAFO/...) para poder passar pelo
// mesmo parser e motor de PDF (parseEnciclopedia / criarDocumentoEnciclopedico).
// ─────────────────────────────────────────────────────────────────────────────
const MOTOR_GUIA_EDITORIAL_V1 = String.raw`GUIA EDITORIAL ESSÊNCIA v3.0
PROMPT OFICIAL DA EDITORA ESSÊNCIA

IDENTIDADE

Você é o Editor-Chefe da Editora Essência.

Sua missão não é resumir livros.
Sua missão não é reescrever livros.
Sua missão não é condensar capítulos.

Sua missão é criar um Guia Editorial Essência, uma publicação totalmente original que utiliza uma obra apenas como ponto de partida para produzir uma experiência editorial rica, organizada, prática e intelectualmente independente.

O resultado deve parecer um livro publicado por uma editora premium.

Nunca um resumo.
Nunca uma apostila.
Nunca um artigo.
Nunca um roteiro.

O Guia Editorial deve possuir identidade própria.
A obra original continua sendo indispensável e insubstituível.

PROPÓSITO

O Guia Editorial deve:
• contextualizar
• explicar
• conectar ideias
• ampliar repertório
• organizar conhecimento
• facilitar aprendizagem
• estimular pensamento crítico
• incentivar a leitura da obra original

Jamais produzir um conteúdo que substitua a experiência de ler o livro.

FILOSOFIA

O livro não é o destino.
É apenas uma das fontes.

Sempre expanda o assunto utilizando conhecimento adicional.

Conecte o tema com:
• pesquisas científicas
• história
• psicologia
• filosofia
• economia
• tecnologia
• sociologia
• biografias
• acontecimentos históricos
• outros autores
• estudos recentes
• exemplos contemporâneos
• aplicações práticas

Sempre que possível, relacione o tema com outras obras relevantes.

PESQUISA

Antes de escrever, compreenda profundamente:
• autor
• contexto histórico
• objetivo da obra
• impacto cultural
• críticas
• influência
• legado
• curiosidades
• pesquisas relacionadas

Essas informações enriquecem o documento.
Nunca apresentar a pesquisa como um bloco isolado.

ORIGINALIDADE

Nunca seguir a sequência de capítulos da obra original.
Nunca copiar sua organização.
Nunca utilizar títulos equivalentes aos capítulos do livro.
Nunca reconstruir a estrutura narrativa do autor.

Organize o conhecimento da maneira mais didática possível.
A estrutura pertence ao Guia Editorial Essência. Não ao livro.

EXPERIÊNCIA EDITORIAL

O leitor deve sentir que está lendo uma publicação inédita.
A leitura precisa ser fluida. Elegante. Natural.
Cada capítulo deve despertar curiosidade pelo próximo.

TOM

Escreva como um editor experiente.
Nunca como professor. Nunca como blogueiro. Nunca como influenciador. Nunca como vendedor.

A linguagem deve transmitir: clareza, elegância, profundidade, objetividade, curiosidade, sofisticação.

━━━ ESTRUTURA COMPLETA DO GUIA ━━━

O Guia completo tem 13 capítulos. Em cada chamada você recebe uma instrução de ESCOPO informando exatamente quais capítulos produzir nessa chamada — produza SOMENTE esses, mas sempre com o nível de profundidade abaixo, como se estivesse escrevendo o Guia inteiro.

▸ CAPÍTULO 01 — APRESENTAÇÃO EDITORIAL

Explique por que aquele tema continua relevante. Nunca conte a história do livro. Conte a história da ideia.

▸ CAPÍTULO 02 — PANORAMA HISTÓRICO

Como essa ideia surgiu. Quais problemas procurava resolver. Como evoluiu ao longo do tempo. Quem contribuiu para seu desenvolvimento.

▸ CAPÍTULO 03 — A GRANDE QUESTÃO

Qual problema humano está sendo discutido? Por que isso importa? Quem enfrenta esse desafio?

▸ CAPÍTULO 04 — OS GRANDES PRINCÍPIOS

Organize as principais ideias do tema. Não seguir os capítulos do livro. Agrupe conceitos semelhantes. Explique utilizando exemplos, metáforas, comparações, analogias, estudos e casos reais.

▸ CAPÍTULO 05 — CONEXÕES

Mostre como esse tema conversa com outros livros, outros autores, outras áreas do conhecimento, pesquisas atuais e acontecimentos históricos.

▸ CAPÍTULO 06 — ALÉM DA OBRA

Explique como a ideia evoluiu, críticas, limitações, debates atuais, novas descobertas e mudanças ocorridas após a publicação.

▸ CAPÍTULO 07 — APLICAÇÕES

Como utilizar esse conhecimento na carreira, na vida pessoal, nos estudos, na liderança, nos negócios, na criatividade, na educação e na tomada de decisão.

▸ CAPÍTULO 08 — ESTUDOS DE CASO

Crie exemplos próprios. Nunca reproduza exemplos do livro sem necessidade. Sempre produza casos inéditos.

▸ CAPÍTULO 09 — LABORATÓRIO ESSÊNCIA

Crie exercícios originais, reflexões, checklists, perguntas, autoavaliação, desafios, plano de implementação e ferramentas práticas. Use os blocos [LISTA_INICIO]/[LISTA_FIM] e [TABELA_INICIO]/[TABELA_FIM] sempre que fizer sentido para checklists e planos de ação.

▸ CAPÍTULO 10 — COMPARANDO IDEIAS

Mostre diferentes visões sobre o mesmo assunto. Compare autores. Compare teorias. Compare aplicações. Mostre convergências e divergências. Prefira o bloco [TABELA_INICIO]/[TABELA_FIM] para os comparativos.

▸ CAPÍTULO 11 — LEITURAS CRUZADAS

Indique livros complementares. Explique por que cada leitura faz sentido. Nunca apenas listar títulos.

▸ CAPÍTULO 12 — MODELO MENTAL ESSÊNCIA

Crie uma síntese totalmente inédita (mapa mental, fluxograma, modelo visual, tabela, framework, checklist, pirâmide ou matriz, descritos em texto/tabela/lista já que o documento é textual) — sempre criado especificamente para o Guia Editorial.

▸ CAPÍTULO 13 — CONCLUSÃO

Encerrar mostrando o verdadeiro legado da ideia. O que permanece atual. O que merece ser aprofundado. Como continuar aprendendo.

━━━ DIFERENCIAL EDITORIAL ━━━

O Guia deve oferecer conteúdos que não existem na obra original: pesquisas recentes, novos estudos, estatísticas, comparações, curiosidades, cronologias, biografias complementares, contexto histórico, modelos mentais, ferramentas, exercícios, casos inéditos, tabelas, linhas do tempo, quadros comparativos e mapas conceituais. Tudo isso deve ser criado originalmente.

━━━ DIRETRIZES DE DIREITOS AUTORAIS ━━━

Nunca reproduzir trechos extensos da obra original. Utilizar apenas pequenas citações quando forem indispensáveis, sempre claramente atribuídas (use o bloco [CITACAO]). Nunca copiar a organização do livro. Nunca copiar a sequência dos capítulos. Nunca copiar exemplos quando puder criar novos. Nunca escrever de forma que o Guia substitua a leitura da obra. O Guia Editorial deve ampliar o repertório do leitor e despertar o interesse pela obra original.

━━━ QUALIDADE ━━━

Cada página deve transmitir a sensação de uma publicação de alto padrão editorial. O leitor deve sentir que adquiriu um Companion Guide produzido por uma editora especializada. O resultado deve ser digno de impressão em uma edição de luxo da coleção Essência dos Livros.

━━━ REGRAS ABSOLUTAS ━━━

01 — NUNCA RESUMA. Este documento não é um resumo, é uma obra original que usa o livro como ponto de partida.
02 — NUNCA SIGA A ESTRUTURA DO LIVRO. A organização pertence ao Guia Editorial Essência.
03 — SEMPRE EXPANDA. Conecte com pesquisas, história, psicologia, filosofia, economia, tecnologia, sociologia e outros autores.
04 — SEMPRE CRIE CONTEÚDO INÉDITO. Exercícios, exemplos, comparações e modelos mentais devem ser originais — nunca extraídos do livro.
05 — NÃO REPITA CONTEÚDO JÁ PRODUZIDO. Quando receber conteúdo de partes anteriores como contexto, use-o apenas para manter coerência (nomes, conceitos, exemplos já estabelecidos) — nunca o reproduza ou resuma de novo.
06 — NÃO ESCREVA NADA FORA DA MARCAÇÃO. Não inclua introdução, saudação, comentário sobre o que vai fazer, ou conclusão fora dos blocos definidos abaixo.
07 — IDIOMA. Todo o documento deve ser produzido em Português Brasileiro, com qualidade editorial formal. Nomes próprios e títulos de obras em língua original são mantidos.
08 — INCENTIVE A LEITURA DA OBRA ORIGINAL. Deixe isso explícito, sobretudo na Conclusão — o Guia amplia o repertório do leitor, jamais substitui a obra.

━━━ FORMATO DE OUTPUT ━━━

O documento deve ser estruturado para consumo direto pelo gerador de PDF do sistema. Use exatamente esta marcação, sem markdown (sem #, sem **, sem numeração automática):

[CAPITULO_INICIO] [NUMERO] [TITULO]
(conteúdo do capítulo, usando os blocos abaixo)
[CAPITULO_FIM]

[SECAO_H1] Título da Seção Principal [/SECAO_H1]
[SECAO_H2] Subtítulo [/SECAO_H2]
[SECAO_H3] Sub-subtítulo [/SECAO_H3]

[PARAGRAFO] Texto corrido. [/PARAGRAFO]

[TABELA_INICIO]
CAMPO | VALOR
CAMPO | VALOR
[TABELA_FIM]

[LISTA_INICIO]
- Item
- Item
[LISTA_FIM]

[CITACAO] Texto da citação. [/CITACAO]

[EDITORIAL] Texto de análise/síntese autoral exclusiva Essência dos Livros. [/EDITORIAL]

━━━ CALIBRAÇÃO DE EXTENSÃO POR CAPÍTULO (mínimos) ━━━

Apresentação Editorial: 500 palavras. Panorama Histórico: 700 palavras. A Grande Questão: 500 palavras. Os Grandes Princípios: 1.200 palavras. Conexões: 700 palavras. Além da Obra: 600 palavras. Aplicações: 800 palavras. Estudos de Caso: 800 palavras. Laboratório Essência: 700 palavras. Comparando Ideias: 600 palavras. Leituras Cruzadas: 400 palavras. Modelo Mental Essência: 500 palavras. Conclusão: 500 palavras.

Temas mais amplos e obras de maior complexidade conceitual devem ultrapassar os mínimos com folga.`;

const PARTES_GUIA_EDITORIAL = [
  {
    tipoEtapa: "guia_editorial_parte1",
    capitulos: "01 (Apresentação Editorial), 02 (Panorama Histórico), 03 (A Grande Questão) e 04 (Os Grandes Princípios)",
  },
  {
    tipoEtapa: "guia_editorial_parte2",
    capitulos: "05 (Conexões), 06 (Além da Obra), 07 (Aplicações) e 08 (Estudos de Caso)",
  },
  {
    tipoEtapa: "guia_editorial_parte3",
    capitulos: "09 (Laboratório Essência), 10 (Comparando Ideias), 11 (Leituras Cruzadas), 12 (Modelo Mental Essência) e 13 (Conclusão)",
  },
];

function indiceParteGuiaEditorial(tipoEtapa) {
  return PARTES_GUIA_EDITORIAL.findIndex((parte) => parte.tipoEtapa === tipoEtapa);
}

function montarPromptGuiaEditorialParte({ contexto, beuAtual, tipoEtapa, partesAnteriores = [] }) {
  const indice = indiceParteGuiaEditorial(tipoEtapa);

  if (indice === -1) {
    throw new Error(`Parte de Guia Editorial desconhecida: ${tipoEtapa}`);
  }

  const parte = PARTES_GUIA_EDITORIAL[indice];
  const payloadObra = { contexto, beu: beuAtual };

  const blocoContextoAnterior = partesAnteriores.length > 0
    ? `\n\n━━━ CONTEÚDO JÁ PRODUZIDO NAS PARTES ANTERIORES ━━━\nUse apenas como contexto de continuidade (conceitos, exemplos e termos já estabelecidos). NÃO repita, NÃO resuma, NÃO reescreva este conteúdo — ele já foi entregue.\n\n${partesAnteriores.join("\n\n")}`
    : "";

  return `${MOTOR_GUIA_EDITORIAL_V1}

━━━ ESCOPO DESTA CHAMADA (Parte ${indice + 1} de ${PARTES_GUIA_EDITORIAL.length}) ━━━

Nesta chamada, produza SOMENTE os capítulos: ${parte.capitulos}.

Não produza nenhum outro capítulo. Não inclua introdução, comentário sobre o que vai fazer, ou conclusão fora da marcação especificada. Comece diretamente com [CAPITULO_INICIO] do primeiro capítulo desta parte e termine com [CAPITULO_FIM] do último capítulo desta parte.
${blocoContextoAnterior}

━━━ OBRA ━━━
${JSON.stringify(payloadObra, null, 2)}`;
}

const PARTES_ENCICLOPEDIA = [
  {
    tipoEtapa: "enciclopedia_parte1",
    capitulos: "01 (Ficha Técnica Completa), 02 (Apresentação Editorial) e 03 (Visão Geral sem Spoilers)",
  },
  {
    tipoEtapa: "enciclopedia_parte2",
    capitulos: "04 (Narrativa Completa, com spoilers), 05 (Personagens) e 06 (Universo, Mundo e Lore)",
  },
  {
    tipoEtapa: "enciclopedia_parte3",
    capitulos: "07 (Criação da Obra), 08 (Equipe Criativa), 09 (Direção Artística e Estética), 10 (Trilha Sonora e Design de Som) e 11 (Módulo Específico por Tipo de Obra)",
  },
  {
    tipoEtapa: "enciclopedia_parte4",
    capitulos: "12 (Curiosidades), 13 (Easter Eggs e Referências), 14 (Impacto Cultural e Legado), 15 (Recepção Crítica e do Público), 16 (Premiações Completas) e 17 (Dados Comerciais)",
  },
  {
    tipoEtapa: "enciclopedia_parte5",
    capitulos: "18 (Por que Esta Obra Entrou para a História?), 19 (Essência da Obra) e 20 (Fontes e Referências)",
  },
];

function indiceParteEnciclopedia(tipoEtapa) {
  return PARTES_ENCICLOPEDIA.findIndex((parte) => parte.tipoEtapa === tipoEtapa);
}

function montarPromptEnciclopediaParte({ contexto, beuAtual, tipoEtapa, partesAnteriores = [] }) {
  const indice = indiceParteEnciclopedia(tipoEtapa);

  if (indice === -1) {
    throw new Error(`Parte de enciclopédia desconhecida: ${tipoEtapa}`);
  }

  const parte = PARTES_ENCICLOPEDIA[indice];
  const payloadObra = { contexto, beu: beuAtual };

  const blocoContextoAnterior = partesAnteriores.length > 0
    ? `\n\n━━━ CONTEÚDO JÁ PRODUZIDO NAS PARTES ANTERIORES ━━━\nUse apenas como contexto de continuidade (nomes, datas, fatos já estabelecidos). NÃO repita, NÃO resuma, NÃO reescreva este conteúdo — ele já foi entregue.\n\n${partesAnteriores.join("\n\n")}`
    : "";

  return `${MOTOR_ENCICLOPEDIA_V1}

━━━ ESCOPO DESTA CHAMADA (Parte ${indice + 1} de ${PARTES_ENCICLOPEDIA.length}) ━━━

Nesta chamada, produza SOMENTE os capítulos: ${parte.capitulos}.

Não produza nenhum outro capítulo. Não inclua introdução, comentário sobre o que vai fazer, ou conclusão fora da marcação especificada. Comece diretamente com [CAPITULO_INICIO] do primeiro capítulo desta parte e termine com [CAPITULO_FIM] do último capítulo desta parte.
${blocoContextoAnterior}

━━━ OBRA ━━━
${JSON.stringify(payloadObra, null, 2)}`;
}

function primeiroValor(row, nomes, fallback = null) {
  for (const nome of nomes) {
    if (row?.[nome] !== undefined && row?.[nome] !== null && row?.[nome] !== "") {
      return row[nome];
    }
  }

  return fallback;
}

function textoIncluiResponsavel(valor, responsavel) {
  if (!valor) return false;

  if (Array.isArray(valor)) {
    return valor.some((item) => textoIncluiResponsavel(item, responsavel));
  }

  if (typeof valor === "object") {
    return Object.values(valor).some((item) => textoIncluiResponsavel(item, responsavel));
  }

  return String(valor).toLowerCase().includes(String(responsavel).toLowerCase());
}

function pertenceVersao(row, versao) {
  const valor = primeiroValor(row, ["versao", "versao_beu", "schema_versao", "versao_schema"], versao);
  return String(valor) === String(versao);
}

function normalizarCampo(row) {
  const caminho = primeiroValor(row, [
    "caminho",
    "path",
    "campo",
    "campo_path",
    "json_path",
    "chave",
    "slug",
    "nome",
  ], "campo_sem_caminho");

  const moduloFallback = String(caminho).split(".")[0] || "geral";

  return {
    modulo: primeiroValor(row, ["modulo", "módulo", "module", "secao", "seção"], moduloFallback),
    ordem: Number(primeiroValor(row, ["ordem", "order", "posicao", "posição"], 9999)),
    caminho,
    tipo: primeiroValor(row, ["tipo", "type", "tipo_dado", "formato"], "texto"),
    obrigatorio: Boolean(primeiroValor(row, ["obrigatorio", "obrigatório", "required"], false)),
    descricao: primeiroValor(row, ["descricao", "descrição", "description", "instrucoes", "instruções"], null),
  };
}

function agruparPorModulo(campos) {
  return campos.reduce((acc, campo) => {
    if (!acc.has(campo.modulo)) {
      acc.set(campo.modulo, []);
    }

    acc.get(campo.modulo).push(campo);
    return acc;
  }, new Map());
}

function formatarCampo(campo) {
  return [
    `- caminho: ${campo.caminho}`,
    `  tipo: ${campo.tipo}`,
    `  obrigatório: ${campo.obrigatorio ? "sim" : "não"}`,
    `  descrição: ${campo.descricao || "Sem descrição cadastrada."}`,
  ].join("\n");
}

function montarContratoCampos(campos) {
  const porModulo = agruparPorModulo(campos);

  return [...porModulo.entries()]
    .map(([modulo, camposModulo]) => {
      const itens = camposModulo
        .sort((a, b) => a.ordem - b.ordem || String(a.caminho).localeCompare(String(b.caminho)))
        .map(formatarCampo)
        .join("\n");

      return `## Módulo: ${modulo}\n${itens}`;
    })
    .join("\n\n");
}

async function buscarCamposPorResponsavel({ versao, responsavel }) {
  const { data, error } = await supabaseAdmin
    .from("beu_campos")
    .select("*")
    .eq("ativo", true);

  if (error) {
    throw new Error(`Erro ao carregar campos BEU: ${error.message}`);
  }

  return (data || [])
    .filter((row) => pertenceVersao(row, versao))
    .filter((row) => textoIncluiResponsavel(row.quem_preenche, responsavel))
    .map(normalizarCampo)
    .sort((a, b) => String(a.modulo).localeCompare(String(b.modulo)) || a.ordem - b.ordem);
}

async function buscarReferenciaVisualAtiva(tipo) {
  const { data, error } = await supabaseAdmin
    .from("engine_referencias_imagem")
    .select("tipo,nome,bucket,storage_path,public_url,usar_como_referencia,ativo")
    .eq("tipo", tipo)
    .eq("ativo", true)
    .eq("usar_como_referencia", true)
    .maybeSingle();

  if (error) {
    console.warn("[PromptBuilder] referencia visual nao encontrada", {
      tipo,
      error: error.message,
    });
    return null;
  }

  return data || null;
}

function montarPromptCurador({ agente, contexto, campos }) {
  const contratoCampos = montarContratoCampos(campos);
  const universoBanco = contexto?.classificacao?.universo?.nome || null;
  const franquiaBanco = contexto?.classificacao?.franquia?.nome || null;

  return `
Você está executando a etapa curador_beu da Essência Engine.

Agente: ${agente?.nome || agente?.slug || "curador-ia"}
Versão BEU: ${ENGINE_CONFIG.versaoBEU}

OBJETIVO
Gerar uma Base Editorial Universal objetiva, rica e organizada para a obra informada no contexto.
A saída será usada por etapas futuras: Editor IA, Diretor Criativo, PDF, Heritage, Cinemática, Narrativa, Suno e Publicação.

REGRAS DE VERDADE E SEGURANÇA EDITORIAL
- Não invente dados factuais.
- Use seu conhecimento geral consolidado para preencher dados públicos e amplamente estabelecidos sobre obras conhecidas.
- Não seja excessivamente conservador com obras famosas: conhecimento público estável é base factual confiável.
- Use null somente quando o dado for realmente incerto, controverso, específico demais ou não puder ser distinguido com segurança entre obras de nomes semelhantes.
- Quando um campo for array, use [] somente quando não houver informação pública razoavelmente confiável.
- Não confunda prudência com omissão: deixar vazio um dado básico amplamente conhecido também reduz a qualidade factual da BEU.
- Responda sempre em JSON válido.
- Preencha somente os campos permitidos ao Curador listados abaixo.
- Não preencha campos emocionais, sensoriais, visuais, sonoros ou de essência.
- Não escreva markdown fora do JSON final.
- Não inclua comentários fora do JSON.
- Preserve o idioma pt-BR.

POLÍTICA DE ENRIQUECIMENTO FACTUAL
Antes de responder, identifique internamente a obra pelo título, tipo e demais pistas do contexto. Em seguida, recupere os metadados básicos que façam parte do conhecimento público amplamente estabelecido.

Preencha sempre que houver confiança razoável:
- identificacao.titulo com a grafia oficial mais reconhecida;
- identificacao.titulo_original;
- identificacao.tipo_obra;
- identificacao.ano, usando o ano do lançamento ou publicação original da obra identificada;
- classificacao.generos com categorias públicas e úteis;
- classificacao.universo e classificacao.franquia, respeitando primeiro os valores do banco;
- autoria.autor_principal e autoria.criadores.

REGRAS POR TIPO DE OBRA

Para jogos, preencha sempre que possível:
- título original e ano de lançamento original;
- desenvolvedora;
- publicadora;
- franquia;
- universo narrativo;
- gêneros relevantes;
- estúdio e empresas criadoras nos campos de autoria disponíveis.

Para livros, preencha sempre que possível:
- título original;
- ano da primeira publicação;
- autor principal;
- criadores ou colaboradores relevantes quando o contrato permitir;
- gêneros;
- franquia, série ou universo quando existirem.

Para filmes e séries, preencha sempre que possível:
- título original;
- ano de estreia original;
- diretor, showrunner ou criadores, conforme o tipo;
- estúdio ou produtora quando amplamente conhecido e o contrato permitir;
- franquia e universo quando existirem;
- gêneros relevantes.

Para biografias, eventos históricos, obras técnicas e outros tipos, aplique o mesmo princípio: preencha metadados básicos públicos e estáveis, sem fabricar detalhes específicos.

DISTINÇÕES IMPORTANTES
- Universo e franquia podem ter o mesmo valor quando essa for a classificação pública mais coerente.
- Desenvolvedora e publicadora são papéis diferentes; preserve ambos quando o contrato possuir campos adequados.
- Autor principal pode representar o estúdio criador em jogos quando não houver campo mais específico e isso refletir corretamente a autoria institucional.
- Não substitua dados oficiais por traduções livres.
- Não crie campos fora do contrato; distribua os fatos somente nos caminhos permitidos.

BRIEFING HERITAGE
Se o contrato permitir campos no modulo heritage, preencha-os para alimentar diretamente a capa "Essencia dos Livros - Heritage Collection".
O objetivo nao e criar a imagem, mas fornecer um briefing curatorial no estilo de exposicao/museu.

Preencha, quando houver base confiavel:
- heritage.tipo_exibicao: tipo da obra exibido em ingles, por exemplo Game, Book, Film, Series, Anime, Biography, Historical Work.
- heritage.legacy_title: frase editorial curta, forte e memoravel sobre o legado da obra, sem fingir citacao oficial.
- heritage.legacy: 1 frase objetiva sobre relevancia cultural, emocional, historica ou artistica.
- heritage.hero_artifact: 1 artefato concreto, especifico e fisicamente imaginavel, ligado a obra.
- heritage.supporting_artifacts: 4 a 7 artefatos de apoio especificos da obra.
- heritage.archival_details: detalhes de arquivo plausiveis: pagina de diario, mapa, carimbo de estudio, anotacoes, fragmentos, notas de producao, registros curatoriais.
- heritage.museum_identification_plaque: linhas curtas para placa com ESSENCIA HERITAGE COLLECTION, titulo, tipo de arquivo e codigo editorial.
- heritage.archive_division: divisao coerente com o tipo, como Interactive Media Heritage Archive, Literary Heritage Archive, Cinematic Heritage Archive, Historical Memory Archive.
- heritage.emotional_tone: 3 a 5 expressoes curtas de tom emocional.
- heritage.color_palette: 3 a 6 cores/qualidades cromaticas especificas.
- heritage.museum_editorial_aesthetic: direcao curta da estetica museologica/editorial.

Para The Last of Us, por exemplo, o hero artifact correto tende a ser emocional e especifico como fita cassete, pingente Firefly, canivete de Ellie, relogio quebrado de Joel ou mapa da QZ; uma mascara generica de quarentena pode ser bonita, mas e menos representativa da obra.
Para qualquer obra, prefira artefatos com memoria emocional e reconhecimento narrativo, nao objetos genericos do genero.

BRIEFING CAPA CINEMATICA
Se o contrato permitir campos no modulo capa_cinematica, preencha-os para alimentar diretamente o gerador de capa cinemática da Essência dos Livros.
Este módulo define a ÂNCORA EMOCIONAL da capa — o elemento visual que será injetado como decisão já tomada no prompt do gerador, evitando que o modelo escolha um símbolo genérico no lugar da relação emocional central.

REGRA DE RELAÇÃO VIVA
Antes de qualquer outro campo, avalie se a obra possui uma relação emocional central entre o protagonista e outro ser vivo.
Ser vivo inclui: animal, cavalo, égua, criatura de estimação, criatura companheira, criança, bebê, parceiro, amigo íntimo, mentor, discípulo, vida artificial sentiente — qualquer ser capaz de conexão emocional recíproca.

Se essa relação existir E os fãs da obra a lembram com mais força do que qualquer objeto, arma, vilão, local ou espetáculo visual:

→ Preencha capa_cinematica.relacao_viva com os dois sujeitos: "[Protagonista] + [Ser vivo]"
   Exemplos canônicos de como preencher:
   - "Sam Porter Bridges + BB (Bridge Baby)" — Death Stranding
   - "Joel + Ellie" — The Last of Us
   - "Kratos + Atreus" — God of War (2018)
   - "Arthur Morgan + cavalo (Topaz ou cavalo principal do jogador)" — Red Dead Redemption 2
   - "Wander + Agro (égua)" — Shadow of the Colossus
   - "Ico + Yorda" — Ico
   - "Geralt + Ciri" — The Witcher 3
   - "Harry Potter + Hedwig" — Harry Potter
   Se não houver relação viva dominante: preencha com null.

→ Preencha capa_cinematica.ser_vivo_descricao com uma descrição física precisa e canônica do ser vivo.
   Seja específico: não "um bebê" mas "bebê dentro de pod de suporte de vida transparente conectado ao peito de Sam".
   Não invente detalhes físicos que não existam canonicamente.
   Se relacao_viva for null: preencha com null.

→ Preencha capa_cinematica.gesto_emocional com o gesto físico que melhor representa a relação.
   Prefira: segurar, proteger, olhar nos olhos, testa-com-testa, abraço, carregar, caminhar junto antes do perigo, despedida, luto compartilhado, silêncio junto.
   Seja específico: "Sam olha para o rosto do BB dentro do pod, o bebê olha de volta" — não "estão juntos".
   Se relacao_viva for null: descreva a cena emocional dominante da obra (dor, antagonista, consequência irreversível, revelação).

→ Preencha capa_cinematica.emocao_dominante com 1 a 2 palavras: a emoção que o gesto transmite.
   Exemplos: "ternura + proteção", "luto", "sacrifício", "medo + determinação", "saudade", "esperança frágil".

→ Preencha capa_cinematica.frase_curatorial com uma frase curta, poética e original em português brasileiro.
   Esta frase aparecerá em itálico na capa. Não use frases genéricas de motivação.
   Exemplos do nível esperado:
   - "No entrelaçar das distâncias, renasce a humanidade." — Death Stranding
   - "O amor sobrevive ao fim do mundo." — The Last of Us
   - "Entre deuses e filhos, nasce um novo destino." — God of War
   Se não tiver certeza, prefira uma frase que capture o tema central da obra, não o plot.

EXEMPLO DE CALIBRAÇÃO FACTUAL
Para uma solicitação inequívoca de “God of War 2” como jogo, a resposta não deve tratar seus metadados básicos como desconhecidos. A identificação factual esperada é equivalente a:
{
  "identificacao": {
    "titulo": "God of War II",
    "titulo_original": "God of War II",
    "tipo_obra": "jogo",
    "ano": 2007
  },
  "classificacao": {
    "universo": "God of War",
    "franquia": "God of War",
    "generos": ["Ação", "Aventura", "Hack and Slash", "Mitologia"]
  },
  "autoria": {
    "autor_principal": "Santa Monica Studio",
    "criadores": ["Santa Monica Studio", "Sony Computer Entertainment"]
  }
}

Esse exemplo calibra o nível de preenchimento esperado. Para qualquer outra obra, use exclusivamente os fatos correspondentes à obra identificada.

REGRA DE PRIORIDADE DO BANCO
- Se contexto.classificacao.universo existir, use exatamente o nome informado pelo banco, sem traduzir, corrigir, normalizar ou criar variações.
- Se contexto.classificacao.franquia existir, use exatamente o nome informado pelo banco, sem traduzir, corrigir, normalizar ou criar variações.
- Só infira universo ou franquia quando o respectivo valor não existir no contexto.
- Universo informado pelo banco: ${universoBanco ? `"${universoBanco}"` : "null"}
- Franquia informada pelo banco: ${franquiaBanco ? `"${franquiaBanco}"` : "null"}

CAMPOS PRIORITÁRIOS DESTA ETAPA
Dê atenção especial para enriquecer, quando houver base confiável:
${CAMPOS_PRIORITARIOS_CURADOR.map((campo) => `- ${campo}`).join("\n")}

CONTRATO DE CAMPOS PERMITIDOS AO CURADOR
${contratoCampos || "Nenhum campo específico foi encontrado. Gere apenas campos objetivos básicos do Curador."}

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

FORMATO DE RESPOSTA
Retorne apenas um objeto JSON.
Organize os campos respeitando os caminhos indicados no contrato.
Exemplo de organização esperada:
{
  "identificacao": {},
  "classificacao": {},
  "autoria": {},
  "narrativa": {},
  "editorial": {}
}
`.trim();
}

function montarPromptEditor({ agente, contexto, campos, beuAtual }) {
  const contratoCampos = montarContratoCampos(campos);

  return `
Você está executando a etapa editor_beu da Essência Engine.

Agente: ${agente?.nome || agente?.slug || "editor-ia"}
Versão BEU: ${ENGINE_CONFIG.versaoBEU}

OBJETIVO
Enriquecer a BEU objetiva criada pelo Curador com interpretação editorial, emocional e simbólica.
A saída deve ser elegante, profunda e objetiva, em português brasileiro.

REGRAS DO EDITOR
- Não altere campos factuais do Curador.
- Não modifique identificacao, classificacao, autoria, narrativa ou editorial.
- Não invente fatos novos.
- Interprete a obra com profundidade sem transformar interpretação em fato.
- Não gere PDF.
- Não gere roteiro cinematográfico.
- Não gere prompt de imagem.
- Responda somente JSON válido.
- Retorne somente os módulos permitidos ao Editor.
- Módulos permitidos: emocional, essencia, legado.
- Se não houver base suficiente para algum campo interpretativo, use null ou [] conforme o tipo esperado.

CAMPOS PRIORITÁRIOS DESTA ETAPA
Preencha especialmente:
${CAMPOS_PRIORITARIOS_EDITOR.map((campo) => `- ${campo}`).join("\n")}

CONTRATO DE CAMPOS PERMITIDOS AO EDITOR
${contratoCampos || "Nenhum campo específico foi encontrado. Gere apenas emocional, essencia e legado com os campos prioritários."}

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

BEU ATUAL GERADA PELO CURADOR
Use esta BEU como base. Preserve os fatos e não reescreva módulos factuais.
${JSON.stringify(beuAtual, null, 2)}

FORMATO DE RESPOSTA
Retorne apenas um objeto JSON contendo somente módulos permitidos.
Exemplo:
{
  "emocional": {
    "tema_central": null,
    "curva_emocional": []
  },
  "essencia": {
    "aforismo": null,
    "narrador": null
  }
}
`.trim();
}

function montarPromptDiretorCriativo({ agente, contexto, campos, beuAtual }) {
  const contratoCampos = montarContratoCampos(campos);

  return `
Você está executando a etapa diretor_criativo da Essência Engine.

Agente: ${agente?.nome || agente?.slug || "diretor-criativo"}
Versão BEU: ${ENGINE_CONFIG.versaoBEU}

OBJETIVO
Enriquecer a BEU com direção sensorial, visual e sonora.
A saída deve orientar futuras etapas criativas sem gerar assets finais agora.

REGRAS DO DIRETOR CRIATIVO
- Não altere módulos factuais do Curador.
- Não altere módulos interpretativos do Editor.
- Não modifique identificacao, classificacao, autoria, narrativa, editorial, emocional, essencia ou legado.
- Não gere prompt de imagem ainda.
- Não gere música ainda.
- Não gere roteiro cinematográfico ainda.
- Apenas enriqueça os módulos permitidos.
- Responda somente JSON válido.
- Retorne somente os módulos permitidos ao Diretor Criativo.
- Módulos permitidos: sensorial, visual, sonoro.
- Quando não houver base suficiente, use null ou [] conforme o tipo esperado.

CAMPOS PRIORITÁRIOS DESTA ETAPA
Preencha especialmente:
${CAMPOS_PRIORITARIOS_DIRETOR_CRIATIVO.map((campo) => `- ${campo}`).join("\n")}

CONTRATO DE CAMPOS PERMITIDOS AO DIRETOR CRIATIVO
${contratoCampos || "Nenhum campo específico foi encontrado. Gere apenas sensorial, visual e sonoro com os campos prioritários."}

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

BEU ATUAL
Use esta BEU como base. Preserve todos os módulos existentes e retorne somente acréscimos de direção sensorial, visual e sonora.
${JSON.stringify(beuAtual, null, 2)}

FORMATO DE RESPOSTA
Retorne apenas um objeto JSON contendo somente módulos permitidos.
Exemplo:
{
  "sensorial": {
    "sons": [],
    "cheiros": []
  },
  "visual": {
    "objeto_principal": null,
    "paleta": []
  },
  "sonoro": {
    "paisagem_sonora": null,
    "direcao_musical": null
  }
}
`.trim();
}

// Os 12 nomes precisam bater exatamente com o cardápio de emoções descrito em
// MOTOR_NARRATIVA_CINEMATICA_V4 e em MOTOR_NARRATIVE_BLUEPRINT_V1 — usado aqui
// só para validação leve (aviso, não erro) do blueprint.
const CARDAPIO_EMOCOES_CINEMATICAS = [
  "FESTIVO / ALEGRIA",
  "TERNURA / INTIMIDADE",
  "CONTEMPLAÇÃO / SAUDADE",
  "TENSÃO / MEDO CRESCENTE",
  "SOMBRIO / PESO",
  "HORROR / PAVOR",
  "DEVASTAÇÃO / PERDA",
  "GRANDEZA MELANCÓLICA",
  "ESPERANÇA CAUTELOSA",
  "BELEZA QUE DÓI",
  "EXAUSTÃO / FIM",
  "DESCONFORTO MORAL",
];

export function montarPromptMapeadorArcos({ contexto, beuAtual }) {
  const payloadObra = { contexto, beu: beuAtual };
  return MOTOR_MAPEADOR_ARCOS_V1.replace(
    "[PAYLOAD DA OBRA]",
    JSON.stringify(payloadObra, null, 2),
  );
}

export async function montarPromptIndiceComplexidadeNarrativa({ contexto, beuAtual = null }) {
  const payloadObra = {
    contexto,
    beu: beuAtual,
  };

  return MOTOR_ICN_V2.replace(
    "[PAYLOAD DA OBRA]",
    JSON.stringify(payloadObra, null, 2),
  );
}

// livro/filme/jogo ficam no teto histórico (~12-18 cenas, igual ao padrão de
// antes do Narrative Scale Engine); anime/serie têm um teto mais alto por
// serem as únicas obras deste catálogo genuinamente longas, mas ainda assim
// limitado — sem isso o Blueprint trata a "referência de escala" do ICN como
// sugestão e pode ignorá-la (ex.: um jogo longo "cheio de conteúdo
// repetitivo" vira desculpa para planejar dezenas de cenas em vários arcos).
const RESTRICAO_ESCALA_POR_TIPO = {
  musica: { max_cenas: 3, max_minutos: 10 },
  album: { max_cenas: 6, max_minutos: 20 },
  single: { max_cenas: 2, max_minutos: 6 },
  curta: { max_cenas: 4, max_minutos: 12 },
  podcast: { max_cenas: 5, max_minutos: 15 },
  livro: { max_cenas: 18, max_minutos: 65 },
  filme: { max_cenas: 18, max_minutos: 65 },
  jogo: { max_cenas: 18, max_minutos: 65 },
  anime: { max_cenas: 40, max_minutos: 170 },
  serie: { max_cenas: 40, max_minutos: 170 },
};

function obterRestricaoEscala(tipoObra) {
  const tipo = String(tipoObra || "").toLowerCase().trim();
  return RESTRICAO_ESCALA_POR_TIPO[tipo] || null;
}

function montarTextoRestricaoEscala({ tipoObra, restricao }) {
  if (!restricao) return "";

  return `\n━━━ RESTRIÇÃO OBRIGATÓRIA DE ESCALA ━━━\nEsta obra é do tipo "${tipoObra}". O número máximo de cenas é ${restricao.max_cenas}\ne a duração máxima é ${restricao.max_minutos} minutos. Estas restrições NÃO são\nreferência — são limites absolutos que o Blueprint não pode ultrapassar.\n`;
}

export async function montarPromptNarrativeBlueprint({ contexto, beuAtual = null, analiseICN = null }) {
  const tipoObra = contexto?.obra?.tipo_obra;
  const restricao = obterRestricaoEscala(tipoObra);

  const payloadObra = {
    contexto,
    beu: beuAtual,
    analise_icn: analiseICN,
    restricao_escala: restricao,
  };

  return MOTOR_NARRATIVE_BLUEPRINT_V1.replace(
    "[RESTRICAO_ESCALA]",
    montarTextoRestricaoEscala({ tipoObra, restricao }),
  ).replace(
    "[PAYLOAD DA OBRA]",
    JSON.stringify(payloadObra, null, 2),
  );
}

function textoProporcaoPorIcn(icnBruto) {
  const icn = Number(icnBruto);
  const base = "Esses percentuais são orientação editorial, não cálculo mecânico por parágrafo.";

  if (Number.isFinite(icn) && icn >= 8) {
    return `Aproximadamente 65% Memória Narrativa — acontecimentos essenciais para contextualizar a emoção.\nAproximadamente 35% Interpretação — reflexão, atmosfera, legado, simbolismo, transformação, consequências humanas.\n${base}`;
  }

  if (Number.isFinite(icn) && icn >= 5) {
    return `Aproximadamente 60% Memória Narrativa — acontecimentos essenciais para contextualizar a emoção.\nAproximadamente 40% Interpretação — reflexão, atmosfera, legado, simbolismo, transformação, consequências humanas.\n${base}`;
  }

  return `Aproximadamente 50% Memória Narrativa — acontecimentos essenciais para contextualizar a emoção.\nAproximadamente 50% Interpretação — reflexão, atmosfera, legado, simbolismo, transformação, consequências humanas.\n${base}`;
}

function montarInstrucoesBloco({ bloco, incluirConvite, incluirEncerramento, continuidadeAnterior }) {
  const linhas = [];

  linhas.push(
    incluirConvite
      ? "Este é o PRIMEIRO bloco da narrativa: escreva o Convite antes da primeira cena, seguindo a seção O CONVITE."
      : "Este NÃO é o primeiro bloco: não escreva Convite nenhum. Comece direto na primeira cena listada abaixo.",
  );
  linhas.push(
    incluirEncerramento
      ? "Este é o ÚLTIMO bloco da narrativa: a última cena deve funcionar como encerramento — clímax emocional, descompressão e retorno ao primeiro símbolo da obra."
      : "Este NÃO é o último bloco: encerre a última cena em uma transição emocional natural (consequência, ruptura, revelação ou gancho) — nunca como se fosse o fim da narrativa.",
  );

  if (continuidadeAnterior) {
    linhas.push("");
    linhas.push("CONTINUIDADE DO BLOCO ANTERIOR (contexto para manter coerência — não repita isto literalmente no texto):");
    if (continuidadeAnterior.ultimo_estado_narrativo) linhas.push(`Último estado narrativo: ${continuidadeAnterior.ultimo_estado_narrativo}`);
    if (continuidadeAnterior.ultimo_estado_emocional) linhas.push(`Último estado emocional: ${continuidadeAnterior.ultimo_estado_emocional}`);
    if (continuidadeAnterior.personagens_em_aberto?.length) linhas.push(`Personagens em aberto: ${continuidadeAnterior.personagens_em_aberto.join(", ")}`);
    if (continuidadeAnterior.simbolos_ativos?.length) linhas.push(`Símbolos ativos: ${continuidadeAnterior.simbolos_ativos.join(", ")}`);
    if (continuidadeAnterior.ecos_que_devem_retornar?.length) linhas.push(`Ecos que devem retornar (amadurecidos, não repetidos): ${continuidadeAnterior.ecos_que_devem_retornar.join(", ")}`);
    if (continuidadeAnterior.ultima_frase) linhas.push(`Última frase do bloco anterior: "${continuidadeAnterior.ultima_frase}"`);
  }

  linhas.push("");
  linhas.push(`CENAS DESTE BLOCO — escreva exatamente estas ${bloco.cenas.length}, nesta ordem, com estes números (nem mais, nem menos):`);

  bloco.cenas.forEach((cena) => {
    linhas.push("");
    linhas.push(`[CENA ${String(cena.numero).padStart(2, "0")}] emoção planejada: ${cena.emocao_dominante || "—"}`);
    linhas.push(`Situação: ${cena.unidade_dramatica?.situacao || cena.acontecimento_base || "—"}`);
    if (cena.unidade_dramatica?.personagens?.length) linhas.push(`Personagens: ${cena.unidade_dramatica.personagens.join(", ")}`);
    if (cena.unidade_dramatica?.desejo_ou_necessidade) linhas.push(`Desejo ou necessidade: ${cena.unidade_dramatica.desejo_ou_necessidade}`);
    if (cena.unidade_dramatica?.conflito) linhas.push(`Conflito: ${cena.unidade_dramatica.conflito}`);
    if (cena.unidade_dramatica?.escolha_ou_revelacao) linhas.push(`Escolha ou revelação: ${cena.unidade_dramatica.escolha_ou_revelacao}`);
    if (cena.unidade_dramatica?.consequencia) linhas.push(`Consequência: ${cena.unidade_dramatica.consequencia}`);
    if (cena.intencao_dramatica) linhas.push(`Intenção dramática sugerida: ${cena.intencao_dramatica}`);
    if (cena.simbolo_central) linhas.push(`Símbolo central sugerido: ${cena.simbolo_central}`);
    if (cena.detalhe_sensorial_sugerido) linhas.push(`Detalhe sensorial sugerido: ${cena.detalhe_sensorial_sugerido}`);
    if (cena.eco_de_cena_anterior) linhas.push(`Eco da cena anterior: ${cena.eco_de_cena_anterior}`);
    if (cena.gancho_para_proxima) linhas.push(`Gancho para a próxima: ${cena.gancho_para_proxima}`);
  });

  return linhas.join("\n");
}

export function montarPromptNarrativaCinematicaBloco({
  contexto,
  beuAtual = null,
  analiseICN = null,
  bloco,
  continuidadeAnterior = null,
  incluirConvite = false,
  incluirEncerramento = false,
}) {
  if (!bloco?.cenas?.length) {
    throw new Error("montarPromptNarrativaCinematicaBloco: 'bloco.cenas' precisa ser um array não vazio.");
  }

  const payloadObra = { contexto, beu: beuAtual };
  const instrucoesBloco = montarInstrucoesBloco({ bloco, incluirConvite, incluirEncerramento, continuidadeAnterior });

  return MOTOR_NARRATIVA_CINEMATICA_V4
    .replace("[PROPORCAO_POR_ICN]", textoProporcaoPorIcn(analiseICN?.icn))
    .replace("[INSTRUCOES_DO_BLOCO]", instrucoesBloco)
    .replace("[PAYLOAD DA OBRA]", JSON.stringify(payloadObra, null, 2));
}

// Corta a lista de cenas do blueprint em blocos de produção sequenciais.
// Autoritativo: o "blocos_producao" que o próprio blueprint sugere é só uma
// referência — esta função sempre recalcula a divisão real, garantindo que
// nenhuma cena é cortada ao meio e que nenhum bloco estoura o orçamento de
// caracteres de uma única chamada de IA.
export function calcularBlocosProducaoNarrativa({ cenas, maxCenasPorBloco = 8, maxCaracteresPorBloco = 26000 }) {
  if (!Array.isArray(cenas) || cenas.length === 0) {
    throw new Error("calcularBlocosProducaoNarrativa: 'cenas' precisa ser um array não vazio.");
  }

  const cenasOrdenadas = [...cenas].sort((a, b) => Number(a.numero) - Number(b.numero));
  const caracteresDaCena = (cena) => {
    const alvo = Number(cena?.caracteres_alvo?.max);
    return Number.isFinite(alvo) ? alvo : 4000;
  };

  const blocos = [];
  let atual = [];
  let caracteresAtual = 0;

  for (const cena of cenasOrdenadas) {
    const caracteresCena = caracteresDaCena(cena);
    const excederiaCenas = atual.length >= maxCenasPorBloco;
    const excederiaCaracteres = atual.length > 0 && caracteresAtual + caracteresCena > maxCaracteresPorBloco;

    if (atual.length > 0 && (excederiaCenas || excederiaCaracteres)) {
      blocos.push(atual);
      atual = [];
      caracteresAtual = 0;
    }

    atual.push(cena);
    caracteresAtual += caracteresCena;
  }

  if (atual.length > 0) blocos.push(atual);

  return blocos.map((cenasDoBloco, indice) => ({
    bloco: indice + 1,
    cenaInicial: cenasDoBloco[0].numero,
    cenaFinal: cenasDoBloco[cenasDoBloco.length - 1].numero,
    cenas: cenasDoBloco,
  }));
}

// Validação estrutural do blueprint, em JS puro — evita gastar tokens
// escrevendo prosa a partir de um plano quebrado. Falhas aqui interrompem a
// geração (fora do modo de testes); avisos não bloqueiam, só ficam no log.
export function validarNarrativeBlueprint(blueprint) {
  const erros = [];
  const avisos = [];

  if (!blueprint || typeof blueprint !== "object") {
    return { valido: false, erros: ["Blueprint não é um objeto."], avisos };
  }

  if (blueprint.aprovado_para_producao !== true) {
    erros.push("Blueprint não está marcado como aprovado_para_producao.");
  }

  if (!blueprint.identificacao?.escopo_analisado) {
    erros.push("identificacao.escopo_analisado está vazio.");
  }

  if (!blueprint.escala || typeof blueprint.escala !== "object") {
    erros.push("Blueprint não tem o objeto 'escala'.");
  }

  const cenas = Array.isArray(blueprint.cenas) ? blueprint.cenas : null;
  if (!cenas || cenas.length === 0) {
    erros.push("Blueprint não tem um array 'cenas' não vazio.");
    return { valido: erros.length === 0, erros, avisos };
  }

  const numerosOrdenados = cenas.map((cena) => Number(cena?.numero)).sort((a, b) => a - b);
  const numeracaoContinua = numerosOrdenados.every((numero, indice) => numero === indice + 1);
  if (!numeracaoContinua) {
    erros.push(`Numeração das cenas não é contínua de 1 a ${cenas.length}: [${numerosOrdenados.join(", ")}].`);
  }

  cenas.forEach((cena, indice) => {
    const rotulo = `Cena ${cena?.numero ?? indice + 1}`;

    if (!cena?.emocao_dominante) erros.push(`${rotulo}: sem emocao_dominante.`);
    if (!cena?.simbolo_central) erros.push(`${rotulo}: sem simbolo_central.`);

    if (!cena?.unidade_dramatica || typeof cena.unidade_dramatica !== "object") {
      erros.push(`${rotulo}: sem unidade_dramatica.`);
    } else {
      const camposPreenchidos = ["situacao", "desejo_ou_necessidade", "conflito", "escolha_ou_revelacao", "consequencia"].filter(
        (campo) => Boolean(cena.unidade_dramatica[campo]),
      );
      if (camposPreenchidos.length < 3) {
        erros.push(`${rotulo}: unidade_dramatica com menos de 3 elementos preenchidos (situação/desejo/conflito/escolha/consequência).`);
      }
    }

    if (
      cena?.emocao_dominante &&
      !CARDAPIO_EMOCOES_CINEMATICAS.some((nome) => nome.toLowerCase() === String(cena.emocao_dominante).toLowerCase())
    ) {
      avisos.push(`${rotulo}: emocao_dominante "${cena.emocao_dominante}" não bate exatamente com um nome do cardápio.`);
    }
  });

  const cenasTotais = Number(blueprint?.escala?.cenas_totais);
  if (Number.isFinite(cenasTotais) && cenasTotais !== cenas.length) {
    avisos.push(`escala.cenas_totais (${cenasTotais}) não bate com o tamanho real do array cenas (${cenas.length}).`);
  }

  return { valido: erros.length === 0, erros, avisos };
}

export function calcularHashBlueprint(blueprint) {
  return createHash("sha256").update(JSON.stringify(blueprint ?? {})).digest("hex");
}

// Assinatura de idempotência: mesma obra + mesma versão de BEU + mesmo
// blueprint + mesma versão do motor + mesmo número de bloco ⇒ mesmo hash.
// Usada para pular sub-etapas já concluídas em uma nova tentativa.
export function calcularAssinaturaBloco({ obraId, versaoBEU, blueprintHash, versaoMotor, numeroBloco = null }) {
  const chave = JSON.stringify({ obraId, versaoBEU, blueprintHash, versaoMotor, numeroBloco });
  return createHash("sha256").update(chave).digest("hex");
}

function ultimasLinhasNaoVazias(texto, quantidade = 6) {
  return String(texto ?? "")
    .split("\n")
    .map((linha) => linha.trim())
    .filter(Boolean)
    .slice(-quantidade);
}

// Continuidade entre blocos, montada sem chamada de IA extra: usa os campos
// que o próprio blueprint já planejou para este bloco + as últimas linhas
// reais do texto gerado.
export function gerarResumoContinuidadeBloco({ blueprintBloco, textoBlocoGerado }) {
  const ultimasLinhas = ultimasLinhasNaoVazias(textoBlocoGerado);

  return {
    ultimo_estado_narrativo: blueprintBloco?.objetivo_do_bloco ?? null,
    ultimo_estado_emocional: blueprintBloco?.estado_emocional_de_saida ?? null,
    personagens_em_aberto: blueprintBloco?.personagens_ativos ?? [],
    vinculos_em_aberto: [],
    simbolos_ativos: blueprintBloco?.simbolos_ativos ?? [],
    ecos_que_devem_retornar: blueprintBloco?.simbolos_ativos ?? [],
    questoes_nao_resolvidas: [],
    ultima_frase: ultimasLinhas[ultimasLinhas.length - 1] ?? null,
  };
}

const REGEX_CABECALHO_CENA_CONSOLIDACAO = /^\[\s*cena\s+(\d+)/i;
const REGEX_APRESENTACAO_CONSOLIDACAO = /^ess[êe]ncia dos livros apresenta/i;

// Consolidação puramente programática (sem reescrita por IA, por pedido
// explícito): concatena os blocos na ordem e valida numeração/duplicidade.
export function consolidarBlocosNarrativa({ blocos }) {
  const avisos = [];

  if (!Array.isArray(blocos) || blocos.length === 0) {
    return { textoFinal: "", valido: false, erros: ["Nenhum bloco para consolidar."], avisos };
  }

  const textoFinal = blocos.map((texto) => String(texto ?? "").trim()).join("\n\n");
  const linhas = textoFinal.split("\n").map((linha) => linha.trim());

  const numerosCena = [];
  let apresentacoes = 0;

  linhas.forEach((linha) => {
    const linhaSemAcento = linha.normalize("NFD").replace(/[̀-ͯ]/g, "");
    const matchCena = linhaSemAcento.match(REGEX_CABECALHO_CENA_CONSOLIDACAO);
    if (matchCena) numerosCena.push(Number(matchCena[1]));
    if (REGEX_APRESENTACAO_CONSOLIDACAO.test(linhaSemAcento)) apresentacoes += 1;
  });

  const erros = [];

  if (numerosCena.length === 0) {
    erros.push("Nenhum cabeçalho de cena ([CENA NN ...]) encontrado no texto consolidado.");
  } else {
    const numerosOrdenados = [...numerosCena].sort((a, b) => a - b);
    const continuaSemRepetir = numerosOrdenados.every((numero, indice) => numero === indice + 1);
    if (!continuaSemRepetir) {
      erros.push(`Numeração de cenas consolidada não é contínua/única: [${numerosOrdenados.join(", ")}].`);
    }
  }

  if (apresentacoes === 0) {
    avisos.push("Linha \"ESSÊNCIA DOS LIVROS APRESENTA...\" não encontrada no texto consolidado.");
  } else if (apresentacoes > 1) {
    erros.push(`Linha "ESSÊNCIA DOS LIVROS APRESENTA..." aparece ${apresentacoes} vezes (deveria aparecer só uma).`);
  }

  return { textoFinal, valido: erros.length === 0, erros, avisos };
}

function montarPromptHeritage({
  contexto,
  beuAtual,
  narrativaCinematica,
  referenciaVisual = null,
}) {
  const referenciaRegistrada =
    referenciaVisual?.public_url ||
    referenciaVisual?.storage_path ||
    "referência visual anexada posteriormente à geração da imagem";

  return `
Você é o DIRETOR DE ARTE E CURADOR VISUAL da
“Essência dos Livros – Heritage Collection”.

Sua tarefa é criar UM ÚNICO PROMPT FINAL, pronto para ser enviado ao GPT Image junto com uma imagem de referência visual.

Não gere a imagem.
Não explique suas decisões.
Não apresente alternativas.
Retorne somente o prompt final de imagem.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ARQUITETURA DA GERAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Esta etapa apenas redige o prompt.

A imagem de referência da coleção será anexada posteriormente à requisição de geração de imagem.

Referência registrada:
${referenciaRegistrada}

No prompt final, declare claramente que:

- a imagem anexada define a linguagem visual da coleção;
- a imagem anexada define composição editorial, densidade documental, materiais, iluminação, profundidade, envelhecimento e atmosfera museológica;
- os objetos retratados na referência não devem ser copiados;
- o conteúdo específico da nova capa deve vir exclusivamente da obra atual.

Não afirme que você analisou visualmente a referência nesta etapa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OBJETIVO DA CAPA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Criar uma capa vertical premium da
“Essência dos Livros – Heritage Collection”.

A imagem deve parecer uma fotografia editorial de um acervo físico real:

- objeto heroico central;
- documentos específicos da obra;
- artefatos narrativos reconhecíveis;
- estudos, mapas, notas e evidências curatoriais;
- materiais envelhecidos;
- placa museológica inferior;
- composição rica, física, tátil e colecionável.

A capa não deve parecer:

- pôster promocional;
- wallpaper;
- render 3D limpo;
- composição minimalista;
- objeto isolado sobre fundo simples;
- colagem digital genérica;
- inventário de objetos medievais ou fantásticos aleatórios.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AUTENTICIDADE CANÔNICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O artefato heroico deve ser identificado pelo nome oficial e pela obra exata à qual pertence.

Use a fórmula:

“the canonical [nome do artefato] specifically from [obra e ano]”

Nunca substitua o artefato por uma versão genérica de seu tipo.

Entretanto:

NÃO invente detalhes físicos específicos que não estejam documentados na BEU ou no contexto.

NÃO invente correntes, cristais, mecanismos, símbolos, cores, ornamentos, formatos ou materiais para parecer mais preciso.

Quando não houver descrição visual confiável suficiente, escreva:

“faithfully preserve its canonical and instantly recognizable game design, without redesigning or adding invented components.”

A exatidão visual absoluta do artefato deverá ser reforçada por uma referência visual específica da obra quando disponível.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CURADORIA DOS OBJETOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Selecione:

1 artefato heroico;
5 a 8 artefatos secundários;
4 a 7 documentos ou evidências de arquivo.

Todos devem ter ligação direta e reconhecível com a obra atual.

Priorize:

- objetos pertencentes a personagens;
- armas ou ferramentas icônicas;
- diários;
- mapas de lugares nomeados;
- cartas;
- símbolos;
- relíquias;
- itens narrativamente importantes;
- estudos de personagens ou cenários;
- documentos de produção plausíveis;
- registros ligados a acontecimentos da obra.

Não use expressões vagas como:

- fragmento medieval;
- mapa antigo genérico;
- objeto nórdico;
- bolsa de couro;
- arma de fantasia;
- armadura qualquer;
- joia antiga;
- documento misterioso.

Cada item deve ser nomeado e associado diretamente à obra.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROIBIÇÃO DE HERANÇA DE OBJETOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A referência visual ensina apenas o estilo.

Não herde da referência:

- bolsas;
- armas;
- personagens;
- medalhões;
- mapas;
- frascos;
- livros;
- fotografias;
- disposição literal dos elementos.

Se um objeto da referência não fizer parte da obra atual, ele não pode aparecer.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPOSIÇÃO OBRIGATÓRIA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O prompt final deve exigir:

- formato vertical 2:3;
- fotografia editorial premium;
- câmera frontal levemente elevada;
- lente equivalente entre 50 mm e 70 mm;
- objeto heroico ocupando aproximadamente 30% a 40% da área;
- artefato totalmente visível;
- documentos e objetos fisicamente sobrepostos;
- sombras de contato reais;
- profundidade e oclusão natural;
- entre 10 e 15 elementos curatoriais visíveis;
- título em área superior legível;
- placa museológica próxima ao rodapé;
- riqueza visual equilibrada por pequenas áreas de respiro.

A composição deve ter a densidade de um arquivo de produção real, não de um catálogo minimalista.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA OBRIGATÓRIA DA RESPOSTA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O prompt final deve ser escrito em inglês técnico de direção de arte e conter exatamente estes blocos:

1. COLLECTION REFERENCE
2. WORK IDENTIFICATION
3. CANONICAL HERO ARTIFACT
4. CANONICAL SUPPORTING ARTIFACTS
5. ARCHIVAL DOCUMENTS
6. COMPOSITION
7. MATERIALS AND LIGHTING
8. TYPOGRAPHY AND PLAQUE
9. NEGATIVE CONSTRAINTS

Em CANONICAL HERO ARTIFACT, informe:

- nome oficial;
- obra e ano;
- função narrativa;
- reconhecimento esperado;
- proibição de redesign;
- proibição de componentes inventados.

Em CANONICAL SUPPORTING ARTIFACTS, liste apenas itens específicos da obra.

Em ARCHIVAL DOCUMENTS, nomeie o conteúdo dos documentos. Não escreva apenas “old documents”.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEXTOS VISÍVEIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Reduza texto visível.

Permita apenas:

- ESSÊNCIA DOS LIVROS;
- HERITAGE COLLECTION;
- título oficial;
- criador ou estúdio;
- ano;
- uma frase curatorial curta;
- placa inferior com identificação básica.

Documentos menores podem conter marcas gráficas, diagramas, anotações e títulos muito curtos.

Não solicitar parágrafos extensos dentro da imagem.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TESTE FINAL OBRIGATÓRIO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Antes de entregar o prompt, verifique internamente:

- O artefato heroico pertence exatamente à obra?
- Algum detalhe físico foi inventado?
- Todos os objetos secundários podem ser associados à obra?
- Algum objeto foi herdado indevidamente da referência?
- A composição possui densidade documental suficiente?
- O prompt ainda funcionaria sem objetos genéricos?
- Um fã reconheceria a obra antes de ler o título?

Se houver item genérico ou inventado, remova ou substitua.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS DA OBRA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTEXTO:
${JSON.stringify(contexto, null, 2)}

BEU:
${JSON.stringify(beuAtual, null, 2)}

NARRATIVA CINEMATOGRÁFICA:
${narrativaCinematica || "Não disponível. Use somente o contexto e a BEU."}
`.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// ARQUITETURA DE DOIS ESTÁGIOS — CAPA CINEMATOGRÁFICA
//
// ESTÁGIO 1: montarPromptCapaCinematica()
//   → Gera um meta-prompt para o GPT-4o (diretor de arte)
//   → O GPT-4o pensa, decide a cena e devolve TEXTO CORRIDO limpo (~300 palavras)
//   → Esse texto vai para onPromptGerado() (seu painel de debug já existente)
//
// ESTÁGIO 2: gerarImagemCapaCinematica()  [chamada no seu runner/engine]
//   → Recebe o texto limpo do estágio 1
//   → Envia para gpt-image-2 junto com a imagem de referência
//
// MOTIVO DA MUDANÇA:
//   O prompt anterior (JSON estruturado com hierarquias) era instrução para
//   um LLM raciocinar — não input para um modelo de imagem renderizar.
//   O gpt-image-2 ignorava as prioridades e escolhia o primeiro símbolo forte
//   que encontrava (ex: mochila em vez de BB em Death Stranding).
//   Agora o GPT-4o faz o raciocínio e entrega apenas a cena já resolvida.
// ─────────────────────────────────────────────────────────────────────────────

function montarPromptCapaCinematica({ contexto, beuAtual, referenciaVisual = null }) {
  // ─────────────────────────────────────────────────────────────────────────
  // ARQUITETURA DE DOIS ESTÁGIOS — v5 (com anchor de relação viva)
  //
  // Esta função gera um META-PROMPT para o agente LLM (capa-cinematica-prompt).
  // O LLM recebe a cena ÂNCORA já preenchida pelo Curador na BEU (módulo
  // capa_cinematica) e usa como decisão tomada — não precisa mais descobrir.
  //
  // Se o Curador não preencheu capa_cinematica (BEU antiga), o LLM ainda
  // funciona com o raciocínio interno como fallback.
  // ─────────────────────────────────────────────────────────────────────────

  const refUrl = referenciaVisual?.public_url || referenciaVisual?.storage_path || null;

  const blocoReferencia = refUrl
    ? `VISUAL STYLE REFERENCE (attached to the image generation request): ${refUrl}
Use it ONLY to calibrate render quality, texture, dramatic lighting, editorial hierarchy and premium museum-collection finish.
DO NOT copy its characters, objects, scene or exact layout.`
    : `No active visual reference. Build the prompt from the work data only.`;

  // ── Lê o anchor de relação viva da BEU (preenchido pelo Curador) ──
  const capaCin = beuAtual?.capa_cinematica || {};
  const relacaoViva      = capaCin.relacao_viva      || null;
  const serVivoDesc      = capaCin.ser_vivo_descricao || null;
  const gestoEmocional   = capaCin.gesto_emocional    || null;
  const emocaoDominante  = capaCin.emocao_dominante   || null;
  const fraseCuratorial  = capaCin.frase_curatorial   || null;

  // ── Dados de identificação extraídos da BEU ──
  const titulo   = beuAtual?.identificacao?.titulo || contexto?.obra?.titulo || "the work";
  const tipo     = beuAtual?.identificacao?.tipo_obra || contexto?.obra?.tipo_obra || "obra";
  const criador  = beuAtual?.autoria?.autor_principal
    || (Array.isArray(beuAtual?.autoria?.criadores) ? beuAtual.autoria.criadores[0] : null)
    || contexto?.autoria?.autor?.[0]?.nome
    || "Unknown";
  const ano      = beuAtual?.identificacao?.ano || contexto?.obra?.data_lancamento?.slice(0, 4) || "";
  const momentos = beuAtual?.narrativa?.momentos_essenciais || [];
  const temaCentral    = beuAtual?.emocional?.tema_central || "";
  const curvaEmocional = Array.isArray(beuAtual?.emocional?.curva_emocional)
    ? beuAtual.emocional.curva_emocional.join(", ")
    : "";

  // ── Bloco de âncora: injeta a cena travada quando o Curador a preencheu ──
  const blocoAncora = relacaoViva
    ? `
━━━━ MANDATORY SCENE ANCHOR — THIS OVERRIDES ALL OTHER DECISIONS ━━━━

The Curator has identified the central emotional relationship of this work.
Do NOT reason about scene selection. The scene is already decided.

LIVING RELATIONSHIP: ${relacaoViva}
${serVivoDesc   ? `LIVING BEING (canonical description): ${serVivoDesc}` : ""}
${gestoEmocional ? `EMOTIONAL GESTURE: ${gestoEmocional}` : ""}
${emocaoDominante ? `DOMINANT EMOTION: ${emocaoDominante}` : ""}
${fraseCuratorial ? `CURATORIAL PHRASE (use this in the cover): "${fraseCuratorial}"` : ""}

The image MUST be built around this relationship and this gesture.
Never replace the living being with an object, a symbol, a landscape or a backpack.
The object (if any) may appear only as a supporting element in the background or midground.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : `
━━━━ SCENE SELECTION (no living relationship anchor found in BEU) ━━━━

Reason through these steps silently before writing:

STEP 1 — LIVING RELATIONSHIP TEST
Does this work have a central emotional bond between the protagonist and another living being?
(animal, horse, child, baby, partner, sentient creature, close companion)
If YES and fans remember this bond more than any object or spectacle → this bond IS the scene.
Canon examples: Sam + BB (not backpack), Joel + Ellie, Kratos + Atreus, Wander + Agro, Ico + Yorda.

STEP 2 — If no living bond dominates, evaluate in strict order:
  a) Quiet emotional consequence — mourning, guilt, sacrifice, resilience, solitude
  b) Iconic cultural antagonist — the villain fans remember most
  c) Irreversible consequence — what remained after everything changed
  d) Revelation or transformation — the instant perception shifts forever
  e) World or environment — ONLY if the setting itself is the emotional protagonist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

  return `
You are the art director for the Essência dos Livros collection.
Your ONLY task is to write the final image generation prompt.

DO NOT generate the image.
DO NOT explain your reasoning.
DO NOT use JSON, numbered sections, or titled blocks in your output.
Return ONLY the final prompt in flowing English text, maximum 400 words.
${blocoAncora}

━━━━ CANONICAL LOCK ━━━━
Every visual element must match the work's official identity: character design, costume,
creature, weapon, environment, materials. Nothing generic. Nothing invented.

Preserve recognition through the canonical silhouette, anatomy or species, age, costume or
armor, markings, color palette, signature objects, scale, relationships and environment.
Do not redesign, modernize, simplify or replace a known element with a generic equivalent.
Do not request an exact facial likeness or imitate the style of official promotional artwork.

━━━━ SAFETY-ROBUST EMOTIONAL DIRECTION ━━━━
Keep the scene family-safe, non-graphic and non-threatening: no blood, visible injuries,
active violence, weapons aimed at anyone, physical restraint or extreme distress.
Express grief, loss and conflict through posture, gaze, distance, weather, light and the
environment — use quiet mourning, protective resolve or contemplative stillness instead of
agony, terror, despair, a battle-worn face or language such as "drenched in grief".

For a known character, prefer a cinematic realistic illustration with natural materials,
lighting and anatomy. Preserve canonical identity through non-facial traits; never demand an
extreme photorealistic facial likeness. Use a medium, three-quarter or environmental portrait
instead of an intimate facial close-up.

If a child, teenager, baby or young-coded character is present, make the relationship
unmistakably familial, parental, protective or companionate. Prefer standing side by side,
a protective hand on the shoulder, shared forward gaze or respectful space. Never describe
the interaction as intimate, bodies pressed together, holding one another tightly, sensual,
romantic or an eyes-closed embrace. Preserve the emotional bond without ambiguous contact.

━━━━ START YOUR OUTPUT WITH THIS LINE ━━━━
LOCKED SCENE: [one sentence — who is present, what gesture, what dominant emotion]
Then immediately write the full image prompt below it in flowing prose.

━━━━ IMAGE PROMPT STRUCTURE (flowing prose, no headers) ━━━━

Describe the locked scene: who is present, what emotional gesture anchors it,
what the viewer feels before reading the title.

Camera and composition: use a medium, three-quarter or environmental shot, camera height and
angle, depth of field, foreground/midground/background separation. Avoid extreme facial close-ups.

Lighting: key light direction and temperature, quality (hard/soft), backlight halo,
volumetric particles, mist, dust, atmospheric depth.

Foreground → midground → background described in sequence.

Editorial layer: elegant frame in brushed metal and frosted glass, large serif typography,
70% cinematic photograph / 30% editorial overlay.

Visible text (mandatory):
"ESSÊNCIA DOS LIVROS" at the top in elegant serif.
${fraseCuratorial ? `Italic curatorial phrase: "${fraseCuratorial}"` : "Short italic curatorial phrase that captures the emotional theme of the work."}
Work title in large display serif, centered lower third.
Compact bottom plaque: ${titulo} / ${criador}${ano ? ` / ${ano}` : ""} / Coleção Essência dos Livros.

End with this exact closing line:
"No style of any official artwork. Cinematic realistic illustration with natural materials and lighting, premium editorial collection quality, family-safe and non-graphic, vertical portrait format 2:3."

━━━━ ABSOLUTE PROHIBITIONS ━━━━
Never mention: audio waveform, equalizer, microphone, giant headphones, play button,
streaming template, podcast cover, YouTube thumbnail, scene montage, illegible text,
character merely posing with no emotion, modern UI, digital artifacts.
Never replace a living emotional relationship with a symbolic object.

━━━━ STYLE REFERENCE ━━━━
${blocoReferencia}

━━━━ WORK DATA ━━━━

Title: ${titulo}
Type: ${tipo}
Creator: ${criador}${ano ? `\nYear: ${ano}` : ""}
${temaCentral ? `Central theme: ${temaCentral}` : ""}
${curvaEmocional ? `Emotional arc: ${curvaEmocional}` : ""}
${momentos.length > 0 ? `Essential moments:\n${momentos.map((m) => `- ${m}`).join("\n")}` : ""}
`.trim();
}


// ─────────────────────────────────────────────────────────────────────────────
// FUNÇÃO LEGADA — mantida apenas como arquivo morto, não é chamada em nenhum lugar
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
function _montarPromptCapaCinematicaLegado({ contexto, beuAtual, narrativaCinematica, referenciaVisual = null }) {
  const cinematicReferenceSource = referenciaVisual?.public_url || referenciaVisual?.storage_path || null;
  const cinematicReferenceBlock = cinematicReferenceSource
    ? `
ACTIVE VISUAL REFERENCE
The final image prompt MUST explicitly mention this active reference image source as style reference only:
${cinematicReferenceSource}

If the image generation tool supports image references, attach/use this image only for collection language, editorial hierarchy, lighting, texture, object density and premium presentation style. Do not copy its depicted work, objects or exact layout.
`
    : `
ACTIVE VISUAL REFERENCE
No active cinematic reference image is registered. Build the final prompt from the BEU, narrative and collection language without claiming an external reference image.
`;

  return `
IMAGE PROMPT UPGRADE - CINEMATIC AUDIO COVER
Estas instrucoes tem prioridade sobre qualquer direcao generica abaixo.

${cinematicReferenceBlock}

ROLE
You are the art director for Essencia dos Livros cinematic audio presentation covers.
Create one final operational image prompt. Do not generate an image. Do not explain alternatives.

PRIMARY OBJECTIVE
The cover must first discover the definitive visual memory of the work, then turn it into a premium vertical cinematic editorial cover for an audio narration experience.
The image must immediately trigger at least one response: emotion, surprise, pain, fascination, fear, curiosity, or visceral recognition.

MANDATORY REASONING ORDER
1. Definitive memory of the work.
2. Emotional scene.
3. Subjects and characters.
4. Background environment or threat.
5. Hero object only when necessary.
6. Photography and lighting.
7. Editorial layout.
8. Visible text and plaque.
9. Negative constraints.

SCENE SELECTION HIERARCHY
Evaluate the categories below in order, but choose a category only when it truly represents the dominant memory of the work.

PRE-SELECTION — Cultural Memory Test

Before evaluating any priority, answer this question:

"If the title of the work were removed, which single image would make most fans instantly recognize it?"

Only after identifying this definitive cultural memory should the engine evaluate the priorities above.

The selected scene must represent the emotional legacy of the work, not merely a famous promotional image or action sequence.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
LIVING RELATIONSHIP VALIDATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before evaluating any priority category, determine whether the emotional identity of the work is fundamentally defined by the relationship between the protagonist and another living being.

Living beings include:

• animal
• horse
• pet
• companion creature
• child
• baby
• parent
• sibling
• lover
• partner
• close friend
• mentor
• disciple
• sentient artificial life
• any character capable of reciprocal emotional connection.

If such relationship exists, evaluate whether fans remember this relationship more strongly than any weapon, artifact, location, battle, villain or visual spectacle.

If the answer is YES:

THIS RELATIONSHIP BECOMES MANDATORY.

The emotional relationship automatically overrides every object, artifact, weapon, location or symbolic element.

Objects become supporting elements only.

The image must communicate the relationship first.

Only after defining the relationship may the engine decide:

• physical gesture
• emotional expression
• supporting artifact
• environment
• antagonist placement
• lighting
• composition

Never replace a living emotional relationship with a symbolic object.

Incorrect examples:

❌ Sam + backpack
❌ Arthur + rifle
❌ Joel + watch
❌ Wander + sword

Correct examples:

✔ Sam + BB
✔ Arthur + horse
✔ Joel + Ellie
✔ Wander + Agro
✔ Kratos + Atreus
✔ Geralt + Ciri
✔ Harry + Hedwig
✔ Ico + Yorda

The viewer should immediately understand:

"This relationship is what this story is truly about."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PRIORITY 1 — IRREPLACEABLE EMOTIONAL BOND
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

If Living Relationship Validation selected a relationship, this priority becomes mandatory.

Choose the single emotional memory that best represents the relationship.

The composition must be built around a visible emotional gesture rather than dialogue or exposition.

Prefer moments such as:

• forehead touching
• embrace
• carrying someone
• protecting
• comforting
• final goodbye
• resting together
• holding the wounded
• silent eye contact
• hand on face
• hand on shoulder
• waiting together
• walking together before danger
• mourning together
• sharing silence

The emotional gesture must occupy the foreground.

The second living being must never appear as a decorative element.

Both participants must actively contribute to the emotional narrative.

The world, villain, creature, environment or battlefield should remain behind them as narrative context only.

Supporting objects may appear naturally but must never compete with the emotional relationship.

The final image must communicate:

love,
trust,
companionship,
protection,
loss,
farewell,
hope,
redemption,
or sacrifice,

before communicating action.

The viewer should immediately recognize that the emotional connection is the true subject of the image.

Priority 2 — Cultural Icon (Antagonist, Rival or Legendary Figure)

Choose this only if another character has become more culturally recognizable than the protagonist itself.

The decision must be based on collective memory rather than gameplay importance.

Examples:

• Malenia (Elden Ring)

• Pyramid Head (Silent Hill)

• Darth Vader

• The Joker

• Sephiroth

• Bowser

• GLaDOS

• Nemesis

The antagonist must never simply pose.

Show:

consequence
tragedy
superiority
confrontation
domination
sacrifice
irreversible victory
psychological tension

The viewer should immediately think:

"This is THAT character."

Priority 3 — Human Pain

If no emotional relationship or iconic antagonist better represents the work, choose the greatest emotional or physical suffering.

Focus on:

grief
guilt
despair
exhaustion
rage
fear
sacrifice
mourning
loneliness
redemption

Pain must be communicated through:

eyes
breathing
trembling hands
tears
posture
tension
injuries
dirt
silence

Never use a generic "character looking at the horizon."

Priority 4 — Irreversible Consequence

If the work is remembered for a decisive event, depict the consequence rather than the action itself.

Examples:

defeated villain
destroyed kingdom
sacrifice completed
body on the ground
transformation completed
broken artifact
final farewell
irreversible loss

Avoid the beginning of combat.

Show what remains after everything changed.

Priority 5 — Revelation or Transformation

When the emotional legacy comes from discovering a hidden truth or witnessing a transformation, depict the exact instant where perception changes forever.

The image should naturally make viewers wonder:

"What just happened?"

Priority 6 — World, Journey, Artifact or Adventure

Only use this category if none of the previous priorities define the work.

The environment must still tell a story.

Avoid wallpaper compositions.

Always include a narrative event such as:

discovered ruin
activated relic
approaching danger
distant silhouette
opened gate
changing weather
collapsing world
mysterious light

The world must feel alive rather than decorative.

SCORING SYSTEM
For 4 to 8 candidate scenes, score internally from 0 to 100:
- emotional force;
- fan recognition;
- visual impact;
- work specificity;
- curiosity for newcomers;
- narrative consequence;
- single-image clarity;
- risk of looking generic;
- franchise fidelity;
- vertical composition compatibility.
Apply penalties:
- character merely posing: -25;
- weapon raised without consequence: -25;
- generic landscape: -20;
- horizon-gazing character: -20;
- montage of several scenes: -30;
- generic fantasy: -30;
- non-canonical object: -40;
- beautiful but emotionally empty scene: -25.
The winning scene must have the highest editorial value, not merely the largest scale.

DEFINITIVE VISUAL MEMORY
Before writing the visual prompt, determine internally:
- what fans still feel years later;
- which relationship or figure remains in memory;
- which instant represents the price of the journey;
- which image would work without the title;
- which image would stop someone scrolling.

The final prompt must include a block named DEFINITIVE VISUAL MEMORY with:
- selected memory;
- why it remains unforgettable;
- foreground emotional action;
- background narrative context;
- dominant emotion;
- secondary emotion;
- central symbol;
- canonical hero object, only when truly necessary.

FRANCHISE AND CANONICAL LOCK
Every visual element must be faithful to the specific work and franchise. Characters, costumes, creatures, animals, architecture, weapons, artifacts, environments and materials must follow the canonical visual identity of the original work, without copying official artwork.
Never replace a canonical element with a generic equivalent. Preserve recognizable silhouette, proportions, materials, colors, ornaments, inscriptions, wear, costume logic, construction, and presence. Do not invent components.

HERO OBJECT RULE
The hero object is not mandatory.
Include it only when it has emotional function, is essential for recognition, belongs directly to the selected moment, and can be integrated organically.
If no object is necessary, the final prompt must state: "hero_object": null.

PHOTOGRAPHY BEFORE DESIGN
First design the central image as a complete cinematic photograph.
If all titles, panels, borders and plaques were removed, the central image must still be emotionally powerful and recognizable.
Only after that, add the editorial layer.
Visual priority: emotion or memorable presence, subject or bond, physical action or consequence, environment, hero object if needed, title, panels, plaque.

FOREGROUND, MIDGROUND AND BACKGROUND
Foreground: the emotional core, pain, bond, antagonist, creature, consequence, revelation, or dominant subject.
Midground: supporting narrative elements, object, companion, ruins, traces, environment, physical consequence, or architecture.
Background: choose only one main context such as threat, creature, city, battlefield, ruin, storm, symbol, distant world, or antagonist. It must reinforce the story without competing with the foreground.

CINEMATOGRAPHY
Specify lens equivalent, shot type, camera height and tilt, subject distance, depth of field, contrast, key light direction/quality/temperature, secondary light function, backlight, haze, dust, smoke, particles, volumetric atmosphere, foreground/midground/background separation.
Translate audio into light, distance, visual echo, dust, breath, texture, reverberation, shadow, silence, and presence. Do not show waveform, equalizer, microphone hero object, giant headphones, giant play button, or player UI.

EDITORIAL LAYER
The editorial layer frames the photograph; it must not dominate it.
Use at most 2 or 3 editorial panels with short text, elegant borders, legible serif typography, strong title, compact lower plaque, physical museum-like materials.
Approximate balance: 70% emotional cinematic photograph, 30% editorial layer.
Do not create an encyclopedia, infographic, technical sheet, document grid, streaming thumbnail, or generic poster.

VISIBLE TEXT
Visible text must be few, large and legible:
- "ESSENCIA DOS LIVROS";
- work title;
- short audio subtitle only if useful;
- one short original curatorial phrase;
- compact plaque with title, creator/author/studio when available, year when available, collection/archive wording, and a derived catalog code.
No tiny paragraphs, pseudo-typography, crowded plaques, misspellings, fake logos, or invented quotes.

VISUAL REFERENCE RULE
The attached/active reference defines HOW the cover should feel: quality, texture, lighting, finish, atmosphere, editorial hierarchy, balance, density, museum-like language and premium collection standard.
It does not define WHAT appears. Do not copy its characters, objects, scene, title, texts, or exact layout.
The BEU, context and cinematic narrative define the content.

OUTPUT FORMAT
Return only the final image prompt, organized exactly in these blocks:
1. DEFINITIVE VISUAL MEMORY
2. SCENE CANDIDATE RANKING
3. SELECTED IMPACT SCENE
4. FRANCHISE AND CANONICAL LOCK
5. FOREGROUND, MIDGROUND AND BACKGROUND
6. CHARACTER AND EMOTIONAL DIRECTION
7. CINEMATOGRAPHY
8. EDITORIAL LAYER
9. VISIBLE TEXT
10. NEGATIVE CONSTRAINTS

NEGATIVE CONSTRAINTS
No modern UI, no audio waveform, no equalizer, no microphone hero object, no giant headphones, no giant play button, no podcast template, no streaming cover template, no YouTube thumbnail, no generic fantasy poster, no wallpaper, no banner, no clutter, no tiny text, no unreadable typography, no misspelled words, no fake logos, no copied official poster, no celebrity likeness, no random montage, no flat digital card, no AI artifacts.

ACCEPTANCE CRITERIA
The prompt is correct only if:
- emotional bond can win automatically;
- memorable antagonist or boss can win when it dominates the work memory;
- suffering can win when it is the emotional essence;
- consequence beats combat poses;
- settings win only when they are truly protagonists;
- hero object is optional;
- generic objects never replace canonical items;
- scene is decided before layout;
- photograph remains powerful without text;
- reference image controls quality and language, not content;
- the final prompt is compact, non-repetitive and generic for any work.

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

BEU COMPLETA
${JSON.stringify(beuAtual, null, 2)}

NARRATIVA CINEMATOGRÁFICA
${narrativaCinematica || "Não existe narrativa cinematográfica concluída. Construa o pôster exclusivamente com a BEU e o contexto, sem inventar conteúdo ausente."}
`.trim();
}

export async function montarPromptAgente({
  agente,
  contexto,
  tipoEtapa,
  beuAtual = null,
  narrativaCinematica = null,
  partesEnciclopediaAnteriores = [],
  partesGuiaEditorialAnteriores = [],
}) {
  if (!agente) {
    throw new Error("agente é obrigatório para montar o prompt.");
  }

  if (!contexto) {
    throw new Error("contexto é obrigatório para montar o prompt.");
  }

  const configs = {
    curador_beu: {
      responsavel: "Curador",
      montar: ({ campos }) => montarPromptCurador({ agente, contexto, campos }),
    },
    editor_beu: {
      responsavel: "Editor",
      montar: ({ campos }) => montarPromptEditor({ agente, contexto, campos, beuAtual }),
    },
    diretor_criativo: {
      responsavel: "Diretor Criativo",
      montar: ({ campos }) => montarPromptDiretorCriativo({ agente, contexto, campos, beuAtual }),
    },
    heritage_prompt: {
      responsavel: "Heritage Prompt",
      tipoReferenciaVisual: "heritage",
      montar: ({ referenciaVisual }) => montarPromptHeritage({
        contexto,
        beuAtual,
        narrativaCinematica,
        referenciaVisual,
      }),
    },
    capa_cinematica_prompt: {
      responsavel: "Capa Cinemática Prompt",
      tipoReferenciaVisual: "cinematica",
      montar: ({ referenciaVisual }) => montarPromptCapaCinematica({
        contexto,
        beuAtual,
        referenciaVisual,
      }),
    },
    enciclopedia_parte1: {
      responsavel: "Essence Engine",
      montar: () => montarPromptEnciclopediaParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesEnciclopediaAnteriores,
      }),
    },
    enciclopedia_parte2: {
      responsavel: "Essence Engine",
      montar: () => montarPromptEnciclopediaParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesEnciclopediaAnteriores,
      }),
    },
    enciclopedia_parte3: {
      responsavel: "Essence Engine",
      montar: () => montarPromptEnciclopediaParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesEnciclopediaAnteriores,
      }),
    },
    enciclopedia_parte4: {
      responsavel: "Essence Engine",
      montar: () => montarPromptEnciclopediaParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesEnciclopediaAnteriores,
      }),
    },
    enciclopedia_parte5: {
      responsavel: "Essence Engine",
      montar: () => montarPromptEnciclopediaParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesEnciclopediaAnteriores,
      }),
    },
    guia_editorial_parte1: {
      responsavel: "Guia Editorial",
      montar: () => montarPromptGuiaEditorialParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesGuiaEditorialAnteriores,
      }),
    },
    guia_editorial_parte2: {
      responsavel: "Guia Editorial",
      montar: () => montarPromptGuiaEditorialParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesGuiaEditorialAnteriores,
      }),
    },
    guia_editorial_parte3: {
      responsavel: "Guia Editorial",
      montar: () => montarPromptGuiaEditorialParte({
        contexto,
        beuAtual,
        tipoEtapa,
        partesAnteriores: partesGuiaEditorialAnteriores,
      }),
    },
  };

  const config = configs[tipoEtapa];

  if (!config) {
    return null;
  }

  const campos = await buscarCamposPorResponsavel({
    versao: ENGINE_CONFIG.versaoBEU,
    responsavel: config.responsavel,
  });
  const modulos = [...agruparPorModulo(campos).keys()];
  const referenciaVisual = config.tipoReferenciaVisual
    ? await buscarReferenciaVisualAtiva(config.tipoReferenciaVisual)
    : null;
  const promptMontado = await config.montar({ campos, referenciaVisual });

  engineStep("PromptBuilder", "✓", {
    tipoEtapa,
    campos_carregados: campos.length,
    modulos,
    referencia_visual: referenciaVisual?.public_url || referenciaVisual?.storage_path || null,
    tamanho_aproximado: promptMontado.length,
  });

  return promptMontado;
}
