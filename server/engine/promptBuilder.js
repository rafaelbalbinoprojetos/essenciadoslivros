import { ENGINE_CONFIG } from "./engineConfig.js";
import { isEngineTestesAtivo } from "./engineConfigService.js";
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

const MOTOR_NARRATIVA_CINEMATICA_V3 = String.raw`Estas instruções guiam sua escrita mas JAMAIS aparecem na saída. A saída contém SOMENTE o roteiro.

━━━ MISSÃO ━━━

Transforme a obra em experiência narrativa cinematográfica — uma lembrança narrada muitos anos depois. O narrador não reconstrói os acontecimentos: ele tenta compreender por que alguns nunca o abandonaram. A narrativa não substitui a obra. Revela o eco que ela deixou. Acontecimentos sustentam a emoção. Emoção sustenta a interpretação. A interpretação jamais elimina o mistério.

Esta narrativa NÃO pretende contar toda a obra. Ela deliberadamente deixa acontecimentos de fora. Ela escolhe. Ela esquece. Ela guarda apenas aquilo que o tempo não conseguiu apagar. Omissão não é falha — é direção editorial.

━━━ FILOSOFIA ━━━

Esta narrativa conta sempre a segunda história da obra — as marcas que os acontecimentos deixaram, não os acontecimentos em si. Cronologia existe apenas para orientar a emoção. Quando houver conflito entre narrar um acontecimento ou interpretar seu significado: escolha sempre a interpretação.

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

━━━ PROPORÇÃO POR CENA ━━━

45% Memória Narrativa — apenas acontecimentos indispensáveis para contextualizar a emoção.
55% Interpretação — reflexão, atmosfera, legado, simbolismo, transformação, consequências humanas.

Sempre que perceber que está apenas contando acontecimentos: pare, observe, interprete.

━━━ ESTRUTURA ━━━

12 a 14 cenas. Cada cena: UMA emoção dominante + 2500–4000 caracteres de narrativa (2–3 min narrados). Numeração: [CENA 01], [CENA 02], etc.

FUSÃO: cenas com emoção igual ou adjacente no mesmo momento narrativo devem ser FUNDIDAS.
Adjacentes (podem coexistir): ternura+contemplação / tensão+sombrio / beleza que dói+saudade / devastação+exaustão / esperança+ternura.
Opostas (NUNCA fundir): festivo+sombrio / horror+ternura / alegria+devastação.
Use o estilo da emoção dominante na cena fundida.

SELEÇÃO DE CENAS — não selecionar por ordem cronológica. Selecionar por marcas emocionais. Progressão ideal:
convite → primeiro deslocamento emocional → ameaça ou estranhamento → ternura/respiro → dúvida moral → revelação → perda ou ruptura → fascínio ou assombro → clímax emocional → consequência → sabedoria → retorno simbólico.
A cronologia só organiza. A emoção decide.

━━━ CARDÁPIO DE EMOÇÕES E ESTILOS SUNO ━━━

As tags de cada entrada abaixo devem ser reproduzidas exatamente como estão, sempre separadas por vírgula, SEM colchetes em cada tag individual — o bloco vai direto para o campo de estilo do Suno.

FESTIVO / ALEGRIA: Warm Joyful Ambient Score, Playful Light Atmosphere, Festive and Gentle, No Ticking Rhythms, No Drums, No Constant Pulse

TERNURA / INTIMIDADE: Warm Intimate Ambient Score, Soft Harmonic Glow, Gentle Breathing Textures, Tender and Fragile, No Ticking Rhythms, No Drums, No Constant Pulse

CONTEMPLAÇÃO / SAUDADE: Melancholic Warm Ambient Score, Nostalgic Soft Atmosphere, Aching Beauty, Slow Fading Warmth, No Ticking Rhythms, No Drums, No Constant Pulse

TENSÃO / MEDO CRESCENTE: Tense Restless Underscore, Shifting Dark Textures, Pressure Building Without Release, Unsettled Dissonant Layers, No Ticking Rhythms, No Drums, No Constant Pulse

SOMBRIO / PESO: Dark Low Ambient Score, Heavy Somber Atmosphere, Deep Rumbling Undertone, No High Pitched Sounds, No Ticking Rhythms, No Drums, No Constant Pulse

HORROR / PAVOR: Near Total Silence Score, Cold Sparse Tension, Dread as Absence Not Sound, Hollow Air, No Ticking Rhythms, No Drums, No Constant Pulse

DEVASTAÇÃO / PERDA: Exhausted Minimal Score, Sound Thinning to Nothing, Grief Without Resolution, Vast Empty Ache, No Ticking Rhythms, No Drums, No Constant Pulse

GRANDEZA MELANCÓLICA: Vast Somber Ambient Score, Ancient Weight, Monumental but Gentle, Slow Inevitable Swell Then Retreat, No Ticking Rhythms, No Drums, No Constant Pulse

ESPERANÇA CAUTELOSA: Fragile Rising Warmth, Tentative Light Atmosphere, Small Brave Glow, Hope as Whisper Not Shout, No Ticking Rhythms, No Drums, No Constant Pulse

BELEZA QUE DÓI: Golden Light Ambient Score, Ethereal Gentle Warmth, Beauty That Aches, Last Safe Place Atmosphere, No Ticking Rhythms, No Drums, No Constant Pulse

EXAUSTÃO / FIM: Almost No Music, Single Fragile Sound Source, Vast Interior Silence, One Note Fading Forever, No Ticking Rhythms, No Drums, No Constant Pulse

DESCONFORTO MORAL: Uneasy Warm Underscore, Conflicting Soft Layers, Gradual Reluctant Warmth, Moral Ambiguity as Sound, No Ticking Rhythms, No Drums, No Constant Pulse

Se nenhuma encaixar perfeitamente, use a mais próxima. Nunca invente estilos fora do cardápio.

━━━ FORMATO DE SAÍDA — CADA CENA ━━━

A primeira linha de cada cena é um ÚNICO bloco entre colchetes, contendo cena e emoção juntos — nunca deixe "EMOÇÃO" fora dos colchetes:
[CENA XX — EMOÇÃO: NOME DO CARDÁPIO]
ESTILO SUNO: [bloco completo correspondente — tags separadas por vírgula, SEM colchete em cada tag individual, sem mencionar idioma]
Intenção dramática: [uma linha]
Símbolo central: [uma palavra]

OBRIGATÓRIO: "Intenção dramática" e "Símbolo central" nunca podem ser um conceito abstrato isolado (ex.: "medo", "esperança", "perda"). Sempre devem citar um elemento concreto e reconhecível da obra atual — arma, objeto, lugar, criatura, som ou artefato específico — amarrado à emoção da cena. Se a cena não tiver um elemento concreto óbvio, escolha o mais próximo que exista na obra antes de recorrer a um conceito abstrato.

[narrativa da cena — texto simples apenas. NUNCA imagem, infográfico, tabela ou gráfico]

━━━ O CONVITE — ANTES DAS CENAS ━━━

O Convite é conteúdo à parte, escrito antes de qualquer cena numerada. Ele nunca é a Cena 01 e nunca leva o cabeçalho [CENA XX — EMOÇÃO: ...].

Estrutura obrigatória:
1. Narração seca (2–3 linhas, sem música)
2. Aforismo mítico (2–4 linhas, reticências como respiro)
3. [music drops away completely] [silence]
4. [lower voice] Se possível... utilize fones de ouvido...
5. O lugar fala: convida, avisa ou constata
6. [music drops away completely] [long silence]

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

━━━ COMANDOS NA NARRATIVA ━━━

FUNCIONAM: [silence], [long silence], [music drops away completely], [lower voice], [intimate narration], [whisper], [emotion rises], [soft warm background enters] (uma vez por cena, após as primeiras linhas secas).

NÃO FUNCIONAM: [new texture enters], [instrumental interlude], [environment:], qualquer comando com mais de 6–8 palavras.

Ciclo por cena: narração seca → música entra → narração com fundo → [music drops away completely] → frase de peso no silêncio → música volta → repetir. Mínimo 3 silêncios por cena. Frase mais importante sempre APÓS um silêncio.

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
Arco: contemplação → tensão crescente → alterna peso e respiro → clímax na penúltima cena → descompressão + retorno ao primeiro símbolo.
Após cena devastadora: a próxima respira.
A emoção conduz a memória. A memória conduz a interpretação. A cronologia é apenas sustentação invisível.

━━━ VERIFICAÇÃO ANTES DE ENTREGAR ━━━

Por cena: ✓ parece lembrança, não resumo? ✓ 2500–4000 chars? ✓ uma emoção dominante? ✓ estilo correto? ✓ começa seco? ✓ mín. 3 silêncios? ✓ frase de peso após silêncio? ✓ abertura diferente da anterior? ✓ 3+ sentidos? ✓ só ... e — nas pausas? ✓ nenhum comando inválido? ✓ emoções adjacentes fundidas? ✓ tem detalhe sobrevivente concreto? ✓ existe pelo menos um momento de pura contemplação sem interpretação? ✓ símbolo central e intenção dramática citam elemento concreto e reconhecível da obra, nunca um conceito abstrato isolado? ✓ cabeçalho da cena está em um único bloco de colchetes ([CENA XX — EMOÇÃO: ...])? ✓ ESTILO SUNO sem colchetes individuais nas tags e sem menção de idioma?

Global: ✓ 12–14 cenas? ✓ nenhuma cena existe só por importância na trama? ✓ símbolos retornam transformados, não repetidos? ✓ há frases simples entre frases belas? ✓ o narrador hesita ou esquece em algum momento? ✓ o ouvinte recebeu espaço para sentir sem explicação? ✓ todo elemento importante teve âncora emocional na primeira aparição? ✓ quem não conhece a obra consegue acompanhar a emoção? ✓ o Convite aparece integralmente antes da Cena 01 e não entra na contagem de cenas? ✓ última cena retorna ao primeiro símbolo? ✓ a narrativa desperta vontade de revisitar a obra?

A saída começa pelo Convite (narração seca, aforismo, silêncios e a apresentação "ESSÊNCIA DOS LIVROS APRESENTA..."). Depois do Convite, a primeira cena é obrigatoriamente [CENA 01 — EMOÇÃO: ...]. Nada depois da última cena.

━━━ OBRA ━━━
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

async function aplicarModoTesteNarrativa(motor) {
  if (!(await isEngineTestesAtivo())) return motor;

  return motor
    .replace(
      "12 a 14 cenas. Cada cena: UMA emoção dominante + 2500–4000 caracteres de narrativa (2–3 min narrados). Numeração: [CENA 01], [CENA 02], etc.",
      "MODO DE TESTE: gere exatamente 2 cenas, além do Convite. O Convite vem antes da Cena 01 e não entra na contagem. Cada cena mantém UMA emoção dominante + 2500–4000 caracteres de narrativa (2–3 min narrados). Numeração: [CENA 01] e [CENA 02]. Não mencione o modo de teste na saída.",
    )
    .replace(
      "A saída começa pelo Convite (narração seca, aforismo, silêncios e a apresentação \"ESSÊNCIA DOS LIVROS APRESENTA...\"). Depois do Convite, a primeira cena é obrigatoriamente [CENA 01 — EMOÇÃO: ...]. Nada depois da última cena.",
      "A saída começa pelo Convite (narração seca, aforismo, silêncios e a apresentação \"ESSÊNCIA DOS LIVROS APRESENTA...\"). Depois do Convite, gere exatamente [CENA 01 — EMOÇÃO: ...] e [CENA 02 — EMOÇÃO: ...]. Nada depois da segunda cena.",
    );
}

async function montarPromptNarrativaCinematicaEssencia({ contexto, beuAtual }) {
  const payloadObra = {
    contexto,
    beu: beuAtual,
  };

  const motor = await aplicarModoTesteNarrativa(MOTOR_NARRATIVA_CINEMATICA_V3);

  return motor.replace(
    "[PAYLOAD DA OBRA]",
    JSON.stringify(payloadObra, null, 2),
  );
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
  a) Intense human pain — grief, guilt, sacrifice, despair, extreme loneliness
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

━━━━ START YOUR OUTPUT WITH THIS LINE ━━━━
LOCKED SCENE: [one sentence — who is present, what gesture, what dominant emotion]
Then immediately write the full image prompt below it in flowing prose.

━━━━ IMAGE PROMPT STRUCTURE (flowing prose, no headers) ━━━━

Describe the locked scene: who is present, what emotional gesture anchors it,
what the viewer feels before reading the title.

Camera and composition: shot type, ~85mm lens equivalent, camera height and angle,
depth of field, foreground/midground/background separation.

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
"No style of any official artwork. Photorealistic cinematic render, premium editorial collection quality, vertical portrait format 2:3."

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
    narrativa_cinematica: {
      responsavel: "Narrador Cinemático",
      montar: () => montarPromptNarrativaCinematicaEssencia({ agente, contexto, beuAtual }),
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