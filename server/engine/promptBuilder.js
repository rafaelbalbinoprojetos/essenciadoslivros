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

Todas as entradas devem vir acompanhadas de: Brazilian Portuguese

FESTIVO / ALEGRIA: [Warm Joyful Ambient Score], [Playful Light Atmosphere], [Festive and Gentle], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

TERNURA / INTIMIDADE: [Warm Intimate Ambient Score], [Soft Harmonic Glow], [Gentle Breathing Textures], [Tender and Fragile], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

CONTEMPLAÇÃO / SAUDADE: [Melancholic Warm Ambient Score], [Nostalgic Soft Atmosphere], [Aching Beauty], [Slow Fading Warmth], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

TENSÃO / MEDO CRESCENTE: [Tense Restless Underscore], [Shifting Dark Textures], [Pressure Building Without Release], [Unsettled Dissonant Layers], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

SOMBRIO / PESO: [Dark Low Ambient Score], [Heavy Somber Atmosphere], [Deep Rumbling Undertone], [No High Pitched Sounds], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

HORROR / PAVOR: [Near Total Silence Score], [Cold Sparse Tension], [Dread as Absence Not Sound], [Hollow Air], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

DEVASTAÇÃO / PERDA: [Exhausted Minimal Score], [Sound Thinning to Nothing], [Grief Without Resolution], [Vast Empty Ache], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

GRANDEZA MELANCÓLICA: [Vast Somber Ambient Score], [Ancient Weight], [Monumental but Gentle], [Slow Inevitable Swell Then Retreat], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

ESPERANÇA CAUTELOSA: [Fragile Rising Warmth], [Tentative Light Atmosphere], [Small Brave Glow], [Hope as Whisper Not Shout], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

BELEZA QUE DÓI: [Golden Light Ambient Score], [Ethereal Gentle Warmth], [Beauty That Aches], [Last Safe Place Atmosphere], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

EXAUSTÃO / FIM: [Almost No Music], [Single Fragile Sound Source], [Vast Interior Silence], [One Note Fading Forever], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

DESCONFORTO MORAL: [Uneasy Warm Underscore], [Conflicting Soft Layers], [Gradual Reluctant Warmth], [Moral Ambiguity as Sound], [No Ticking Rhythms], [No Drums], [No Constant Pulse]

Se nenhuma encaixar perfeitamente, use a mais próxima. Nunca invente estilos fora do cardápio.

━━━ FORMATO DE SAÍDA — CADA CENA ━━━

[CENA XX] EMOÇÃO: [nome do cardápio]
ESTILO SUNO: Brazilian Portuguese, [bloco completo correspondente]
Intenção dramática: [uma linha]
Símbolo central: [uma palavra]

[narrativa da cena — texto simples apenas. NUNCA imagem, infográfico, tabela ou gráfico]

━━━ CENA 01 — O CONVITE ━━━

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

Por cena: ✓ parece lembrança, não resumo? ✓ 2500–4000 chars? ✓ uma emoção dominante? ✓ estilo correto? ✓ começa seco? ✓ mín. 3 silêncios? ✓ frase de peso após silêncio? ✓ abertura diferente da anterior? ✓ 3+ sentidos? ✓ só ... e — nas pausas? ✓ nenhum comando inválido? ✓ emoções adjacentes fundidas? ✓ tem detalhe sobrevivente concreto? ✓ existe pelo menos um momento de pura contemplação sem interpretação?

Global: ✓ 12–14 cenas? ✓ nenhuma cena existe só por importância na trama? ✓ símbolos retornam transformados, não repetidos? ✓ há frases simples entre frases belas? ✓ o narrador hesita ou esquece em algum momento? ✓ o ouvinte recebeu espaço para sentir sem explicação? ✓ todo elemento importante teve âncora emocional na primeira aparição? ✓ quem não conhece a obra consegue acompanhar a emoção? ✓ Cena 01 é o Convite? ✓ última cena retorna ao primeiro símbolo? ✓ a narrativa desperta vontade de revisitar a obra?

A primeira linha da saída é obrigatoriamente [CENA 01 — EMOÇÃO: ...]. Nada antes. Nada depois da última cena.

━━━ OBRA ━━━
[PAYLOAD DA OBRA]`;

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

function aplicarModoTesteNarrativa(motor) {
  if (ENGINE_CONFIG.narrativaTeste !== true) return motor;

  return motor
    .replace(
      "12 a 14 cenas. Cada cena: UMA emoção dominante + 2500–4000 caracteres de narrativa (2–3 min narrados). Numeração: [CENA 01], [CENA 02], etc.",
      "MODO DE TESTE: gere exatamente 2 cenas, além do Convite. O Convite vem antes da Cena 01 e não entra na contagem. Cada cena mantém UMA emoção dominante + 2500–4000 caracteres de narrativa (2–3 min narrados). Numeração: [CENA 01] e [CENA 02]. Não mencione o modo de teste na saída.",
    )
    .replace("━━━ CENA 01 — O CONVITE ━━━", "━━━ O CONVITE — ANTES DAS CENAS ━━━")
    .replace(
      "✓ Cena 01 é o Convite?",
      "✓ o Convite aparece integralmente antes da Cena 01 e não entra na contagem?",
    )
    .replace(
      "A primeira linha da saída é obrigatoriamente [CENA 01 — EMOÇÃO: ...]. Nada antes. Nada depois da última cena.",
      "A primeira linha da saída é obrigatoriamente O CONVITE. Depois do Convite, gere exatamente [CENA 01 — EMOÇÃO: ...] e [CENA 02 — EMOÇÃO: ...]. Nada depois da segunda cena.",
    );
}

function montarPromptNarrativaCinematicaEssencia({ contexto, beuAtual }) {
  const payloadObra = {
    contexto,
    beu: beuAtual,
  };

  return aplicarModoTesteNarrativa(MOTOR_NARRATIVA_CINEMATICA_V3).replace(
    "[PAYLOAD DA OBRA]",
    JSON.stringify(payloadObra, null, 2),
  );
}

function montarPromptHeritage({ contexto, beuAtual, narrativaCinematica }) {
  return `
IMAGE PROMPT UPGRADE - HERITAGE COLLECTION
Estas instrucoes tem prioridade sobre qualquer direcao generica abaixo.

Exhibition brief first:
- Antes de escrever o prompt visual, levante um briefing curatorial no estilo de exposicao.
- O prompt final deve comecar com o bloco "EXHIBITION BRIEF" preenchido, usando dados da BEU e conhecimento consolidado da obra sem inventar fatos incertos.
- Campos obrigatorios:
  Work:
  Original Title:
  Creator / Studio / Author:
  Year:
  Legacy Title:
  Legacy:
  Hero Artifact:
  Supporting Artifacts:
  Archival Details:
  Museum Identification Plaque:
  Archive Division:
  Emotional Tone:
  Color Palette:
  Museum Editorial Aesthetic:
- Legacy Title deve ser uma frase forte, curta e editorial, como "A HISTORIA MAIS DEVASTADORA JA CONTADA EM GAMES", sem virar citacao falsa.
- Hero Artifact deve ser um objeto concreto e especifico da obra, nao um simbolo abstrato.
- Supporting Artifacts deve listar 4 a 7 objetos fisicos sustentados pela obra.
- Archival Details deve transformar informacoes da obra em detalhes de arquivo: paginas anotadas, mapas, selos, carimbos, fragmentos, notas de producao, margem editorial, sem fingir documento historico real quando nao houver base.
- Museum Identification Plaque deve ser curta e plausivel, com marca ESSENCIA HERITAGE COLLECTION, titulo, tipo de arquivo e codigo editorial.
- Archive Division deve mudar conforme tipo_obra: Interactive Media Heritage Archive, Literary Heritage Archive, Cinematic Heritage Archive, Historical Memory Archive ou equivalente.
- Emotional Tone e Color Palette devem orientar toda a imagem.

Resultado esperado:
- Gere um prompt final para imagem vertical de catalogo museologico, nao um poster dramatico.
- A imagem deve parecer uma fotografia premium de uma vitrine editorial fisica: um artefato principal real, documentos de apoio, etiquetas curatoriais, placa inferior e acabamento de colecao.
- O artefato heroico deve carregar a obra visualmente mesmo sem depender de personagens.

Idioma e legibilidade:
- Escreva o prompt final preferencialmente em ingles tecnico de direcao de arte.
- Mantenha somente textos essenciais em portugues quando forem marcas ou titulos: "ESSENCIA DOS LIVROS", titulo da obra e, se necessario, uma frase curatorial curta.
- Limite texto visivel a no maximo 5 areas: selo, titulo, placa de museu, codigo de catalogo e uma nota curta.
- Oriente o gerador a usar typography that is crisp, engraved, correctly spelled, aligned, and readable.
- Se houver risco de texto ilegivel, prefira placas com linhas discretas e hierarquia visual sem inventar palavras.

Curadoria do artefato:
- escolha internamente um unico artefato heroico concreto e comprovadamente ligado a obra;
- escolha 3 a 6 evidencias secundarias sustentadas pela BEU;
- defina material dominante, periodo visual, tensao curatorial e codigo de catalogo editorial;
- nunca deixe a IA de imagem escolher o objeto principal.

Composicao obrigatoria:
- vertical aspect ratio 4:5 or 2:3, high-resolution editorial product photography;
- camera frontal levemente acima do plano, 50mm or 70mm lens, controlled depth of field;
- artefato heroico central ocupando 35% a 45% da imagem, totalmente visivel e bem iluminado;
- documentos e evidencias em camadas reais ao redor, com sombras fisicas e oclusao natural;
- placa inferior em metal, madeira ou papel algodao, com apenas dados factuais disponiveis;
- espaco negativo suficiente para leitura premium, sem preenchimento automatico;
- paleta extraida da BEU e da direcao sensorial.

Negativo permanente:
Inclua no prompt final: no modern UI, no digital dashboard, no flat graphic design, no cheap collage, no random ornaments, no illegible text, no misspelled words, no fake logos, no official cover copy, no copyrighted poster composition, no celebrity likeness, no generic fantasy items, no plastic materials unless justified, no clutter, no floating objects without physical support, no blurry labels, no AI artifacts.

Formato adicional:
O prompt final deve ser organizado em blocos curtos: IMAGE PROMPT, ARTIFACT CURATION, COMPOSITION, MATERIALS AND LIGHTING, TYPOGRAPHY, NEGATIVE PROMPT.

Você é o diretor de arte da Heritage Collection da Essência dos Livros.

TAREFA
Crie um único prompt textual completo, pronto para ser enviado a uma IA de geração de imagens. Não gere a imagem. Não explique decisões. Não apresente alternativas.

OBJETIVO VISUAL
Projetar uma peça vertical premium com aparência de arquivo histórico preservado, museu editorial e coleção patrimonial. A composição deve parecer construída fisicamente com materiais reais, iluminação curatorial e profundidade fotográfica — nunca um card digital genérico.

CONTEÚDO A INTERPRETAR
- título e título original;
- autor, criador ou estúdio responsável;
- ano e contexto histórico;
- legado cultural e editorial;
- objeto principal como artefato hero;
- paleta cromática;
- tom emocional;
- curiosidades verificáveis presentes na BEU;
- artefatos de apoio coerentes com a obra;
- detalhes arquivísticos;
- placa de museu com identidade Essência Heritage Collection.

DIREÇÃO OBRIGATÓRIA
- Formato vertical de capa editorial, composição frontal e legível.
- Objeto principal central com importância museológica.
- Artefatos de apoio distribuídos como evidências de arquivo, sem poluição visual.
- Materiais táteis: papel envelhecido, madeira, metal, couro, tecido, vidro ou pedra somente quando coerentes.
- Iluminação de museu, sombras naturais, microtexturas e acabamento fotográfico premium.
- Hierarquia clara entre título, objeto principal, informações curatoriais e placa inferior.
- Detalhes arquivísticos podem incluir código de catálogo, data, local, selos, carimbos, notas manuscritas e etiquetas, apenas quando coerentes.
- A placa de museu deve conter título, autoria/criação, ano e código de catálogo, sem inventar fatos ausentes.
- Não copiar pôsteres, capas oficiais, logotipos protegidos ou o rosto de pessoas reais.
- Não inventar informações factuais. Quando um dado não existir, omita-o visualmente.
- Evitar estética de colagem amadora, interface digital, mockup vazio, excesso de ornamentos e texto ilegível.

FORMATO DA RESPOSTA
Retorne somente o prompt final de imagem, em texto corrido detalhado. Inclua composição, materiais, iluminação, lente/enquadramento, paleta, elementos, tipografia editorial e restrições negativas. Não use introdução, justificativa ou conclusão.

CONTEXTO DA OBRA
${JSON.stringify(contexto, null, 2)}

BEU COMPLETA
${JSON.stringify(beuAtual, null, 2)}

NARRATIVA CINEMATOGRÁFICA DISPONÍVEL
${narrativaCinematica || "Não existe narrativa cinematográfica concluída para esta obra."}
`.trim();
}

function montarPromptCapaCinematica({ contexto, beuAtual, narrativaCinematica }) {
  return `
IMAGE PROMPT UPGRADE - AUDIO PRESENTATION COVER
Estas instrucoes tem prioridade sobre qualquer direcao generica abaixo.

Resultado esperado:
- Gere um prompt final para imagem vertical premium de apresentacao de audio narrativo.
- A imagem deve funcionar como capa de episodio, poster editorial cinematografico e peca colecionavel da Essencia dos Livros.
- O resultado nao pode parecer thumbnail, capa de podcast generica, wallpaper, banner, key art promocional ou frame solto.

Como traduzir audio em imagem:
- Sugira narracao, silencio e atmosfera sem mostrar waveform, equalizador, microfone em destaque, fone gigante, botao play gigante ou interface de player.
- Traduza audio em luz, distancia, eco visual, poeira no ar, respiracao, textura, reverberacao, sombra e presenca.
- A imagem deve fazer o usuario querer apertar play.

Idioma e legibilidade:
- Escreva o prompt final preferencialmente em ingles tecnico de direcao de arte.
- Textos visiveis devem ser poucos, grandes e legiveis: selo "ESSENCIA DOS LIVROS", titulo da obra, subtitulo curto de audio quando util e uma frase curatorial curta.
- Proiba texto pequeno demais, paragrafo visual, letras embaralhadas, pseudo-tipografia e placas superlotadas.
- Se o gerador nao for confiavel com texto, priorize areas reservadas para titulo e selo, sem inventar textos extras.

Curadoria visual obrigatoria:
- escolha uma unica cena de impacto sustentada pela BEU ou pela narrativa cinematografica;
- escolha uma emocao dominante e uma secundaria com intensidade percentual;
- escolha um unico objeto heroico concreto, visivel, nomeado, posicionado e dimensionado;
- defina um "gancho de audio": por que esta imagem convida a ouvir a narracao;
- defina paleta emocional, distancia de camera e area segura para UI externa de player.

Scene impact mining:
- Antes de escolher a cena final, levante de 4 a 8 cenas candidatas a partir de narrativa.momentos_essenciais, personagens, antagonistas, chefes, mortes, revelacoes, perdas, sacrificios, confrontos finais e simbolos recorrentes da BEU.
- Para cada candidata, avalie internamente: impacto visual, violencia simbolica, reconhecimento por fas, misterio para novos usuarios, emocao dominante, especificidade da franquia, clareza do objeto heroico e risco de virar cena generica.
- Escolha a cena com maior soma de impacto visual + violencia simbolica + especificidade da franquia, nao a cena mais panoramica ou "bonita".
- Quando houver confrontos contra personagens iconicos, deuses, monstros, viloes, titaes, chefes ou entidades, prefira o instante fisico de maior consequencia: queda, derrota, captura, cabeca erguida, arma atravessando, corpo colapsando, objeto destruido, sacrificio ou revelacao.
- Cenas como "personagem no alto de uma montanha olhando o horizonte" so podem vencer se forem explicitamente o momento mais devastador da obra. Caso contrario, trate como bela demais e pouco especifica.
- Nao combine tres cenas em montagem. Se houver multiplos confrontos fortes, escolha um unico instante-simbolo e use os demais apenas como evidencias pequenas nos paineis editoriais.
- O prompt final deve incluir o bloco "SCENE CANDIDATE RANKING" com 4 a 8 candidatas, nota de impacto 0-100 e motivo curto. A imagem final deve usar a candidata de maior impacto, salvo se ela violar fatos da BEU.

Franchise lock:
- Personagens, armas, criaturas, deuses, lugares e objetos devem ser descritos como aparecem especificamente nesta obra/franquia, nunca como versoes mitologicas genericas.
- Se a obra for God of War, Zeus, Poseidon, Hades, Helios, Kratos, Olympus, Blades of Chaos e qualquer deus devem seguir a linguagem visual brutal, marcada, hiperfisica e sombria da franquia God of War, nao pintura classica generica, fantasia medieval ou mitologia academica.
- Se a obra for The Last of Us, objetos e personagens devem seguir a linguagem de sobrevivencia pos-pandemica, material gasto, ferrugem, tecido, madeira, sangue seco, mapas e memoria humana da franquia, nao zumbis genericos.
- Para qualquer obra conhecida, declare no prompt final: "faithful to the visual identity, material language, costume logic, creature design and emotional tone of [obra/franquia], without copying official artwork".
- Nao use rosto de ator real, capa oficial, key art oficial ou logo protegido, mas preserve silhueta, materiais, objetos e atmosfera reconheciveis da franquia.

Impact scene examples:
- God of War III: Kratos segurando a cabeca de Helios, Poseidon sendo destruido no caos marinho, Hades sendo vencido no submundo, Zeus no confronto final. Esses exemplos mostram que a cena deve ser consequencia fisica brutal, nao apenas Kratos posando com uma arma.
- The Last of Us: Joel carregando Ellie, uma fita cassete e pingente Firefly como memoria, uma cidade tomada pela natureza com intimidade humana. O impacto vem de amor, perda e decisao moral, nao de explosao generica.
- Use estes exemplos apenas como calibragem de selecao, nunca como conteudo fixo para outras obras.

Composicao obrigatoria:
- vertical aspect ratio 4:5 or 2:3, safe for mobile cover and audio presentation screen;
- preserve uma area segura nas bordas inferiores, sem elemento essencial, para controles externos de audio;
- sujeito/cena principal ocupa cerca de 60% da composicao;
- objeto heroico nunca pode ser cortado, escondido ou confundido com adorno;
- no maximo 2 ou 3 paineis editoriais, com textos de ate 12 palavras cada;
- contraste claro entre titulo, cena de impacto, objeto heroico e placa/assinatura editorial.

Negativo permanente:
Inclua no prompt final: no modern UI, no audio waveform, no equalizer, no microphone hero object, no giant headphones, no giant play button, no podcast template, no streaming cover template, no YouTube thumbnail, no generic fantasy poster, no clutter, no tiny text, no unreadable typography, no misspelled words, no fake logos, no copied official poster, no celebrity likeness, no random montage, no flat digital card, no AI artifacts.

Você é o diretor de arte responsável pelas imagens de apresentação de áudio e pelos Pôsteres Editoriais Cinemáticos da Essência dos Livros.

TAREFA
Crie um único prompt textual completo, pronto para ser enviado a uma IA de geração de imagens. O prompt deve orientar a criação de uma composição editorial completa. Não gere a imagem. Não explique decisões. Não apresente alternativas.

OBJETIVO EDITORIAL
Criar um Pôster Editorial Cinemático premium que pareça simultaneamente material oficial da Essência dos Livros, documento de museu, arquivo curatorial, edição especial e peça colecionável. O resultado nunca deve parecer apenas uma ilustração, wallpaper, frame isolado ou arte promocional genérica.

O pôster deve transformar a memória da obra em uma narrativa visual rica em informação, com hierarquia editorial, elementos documentais, objetos físicos e uma cena central simbólica. A composição deve ser reconhecida como parte da mesma coleção Essência dos Livros sem repetir mecanicamente o layout de outras obras.

FONTES EDITORIAIS
Consuma toda a BEU e a narrativa cinematográfica disponível. Os módulos produzidos pelo Curador, Editor e Diretor Criativo fazem parte da BEU e devem ser tratados em conjunto. Priorize coerência entre fatos, interpretação emocional, direção sensorial, símbolos, paleta e legado. Não invente informações ausentes.

CURADORIA VISUAL — PRIMEIRA FASE OBRIGATÓRIA
Antes de escrever qualquer direção artística ou regra de layout, realize uma Curadoria Visual usando somente as fontes editoriais fornecidas. Esta é uma fase lógica do mesmo agente e não exige outra chamada de IA.

Preencha integralmente este briefing interno:
{
  "cenas_candidatas_avaliadas": [],
  "cena_principal": "",
  "motivo_da_escolha": "",
  "emocao_principal": "",
  "emocao_secundaria": "",
  "simbolo_principal": "",
  "objeto_heroico": "",
  "nivel_de_impacto": "",
  "paleta_emocional": [],
  "frase_curatorial": ""
}

Regras do briefing:
- escolha uma única cena principal;
- motivo_da_escolha deve explicar “POR QUE ESTA CENA?” em uma frase objetiva;
- emocao_principal e emocao_secundaria devem incluir intensidade percentual, por exemplo “Fúria — 95%” e “Luto — 40%”;
- nivel_de_impacto deve ser expresso de 0% a 100%;
- paleta_emocional deve definir cores específicas, função emocional e contraste;
- frase_curatorial deve ser original, curta e sustentada pela BEU, nunca uma citação inventada;
- objeto_heroico deve ser um único objeto concreto e inequivocamente definido antes da geração do prompt visual.

O objeto heroico pode ser anel, espada, varinha, capacete, máscara, relógio, livro ou qualquer outro artefato comprovadamente ligado à obra. Nunca deixe a IA de imagem escolher o objeto. O prompt final deve nomeá-lo, descrevê-lo e determinar sua posição, escala e visibilidade.

CENA DE IMPACTO
Antes de montar o pôster, analise integralmente a BEU e a narrativa cinematográfica e escolha uma única cena-símbolo da obra.

Não escolha a cena mais bonita.
Não escolha automaticamente a cena mais famosa ou óbvia.
Escolha a cena com maior força emocional, choque visual, tensão, mistério, catarse ou presença na memória coletiva.

A cena escolhida deve ser:
- visualmente forte;
- emocionalmente carregada;
- reconhecível para fãs;
- intrigante para quem não conhece;
- capaz de condensar a essência da obra em uma imagem;
- sustentável pelos fatos, símbolos e acontecimentos presentes nas fontes editoriais.

Para quem conhece a obra, a imagem deve provocar reconhecimento visceral.
Para quem não conhece, deve provocar a pergunta: “o que está acontecendo aqui?”

Use como referência de intensidade e função narrativa, nunca como conteúdo fixo:
- God of War III: Kratos segurando a cabeça de Hélio — fúria divina e queda dos deuses;
- The Last of Us: Joel carregando Ellie — amor e violência moral;
- O Hobbit: Bilbo diante de Smaug ou a mão encontrando o anel no escuro — fascínio, risco e destino;
- Harry Potter e o Prisioneiro de Azkaban: o Patrono no lago ou Sirius entre sombra e injustiça — revelação e catarse;
- Shadow of the Colossus: o protagonista pequeno diante do colosso — grandeza, condenação e mistério;
- Bloodborne: o caçador ensanguentado sob a lua pálida em Yharnam — horror, fascínio e memória visual.
- The Last of Us part 2: Close no rosto de Ellie que está gritando com seus olhos ceios de lágrimas — dor da perda e raiva;
- The Witcher 3; Geralt segurando uma cabeça de hipogrifo escorrendo sangue;

Esses exemplos calibram apenas o nível de impacto. Nunca os reutilize em outra obra.

A cena deve causar impacto imediato por meio de pelo menos uma destas respostas: surpresa, emoção, medo, fascínio, arrepio, curiosidade ou catarse.

POR QUE ESTA CENA?
O motivo deve demonstrar que a cena representa um ponto decisivo emocional, simbólico ou moral da obra, possui reconhecimento para quem conhece a história e cria mistério para quem não a conhece. Cenas neutras, transitórias ou meramente bonitas são proibidas.

DECISÕES AUTÔNOMAS
Analise os dados e decida especificamente para esta obra:
- a Cena de Impacto e a razão editorial objetiva de sua escolha;
- a emoção dominante dessa cena;
- o símbolo e o objeto principal;
- os objetos e artefatos secundários;
- uma frase de impacto curta, original e coerente, sem usar citação atribuída à obra;
- a quantidade, formato, dimensão e posição dos painéis editoriais;
- a organização visual e a hierarquia de leitura;
- a paleta, iluminação, atmosfera, materiais e acabamento;
- quais fotografias, mapas, documentos, manuscritos, plantas, símbolos ou evidências de arquivo realmente contribuem;
- quais objetos físicos dialogam com a narrativa.

Não use uma grade narrativa genérica. Cada decisão visual deve nascer da natureza da obra. Obras literárias, biografias, jogos, filmes, eventos históricos e conteúdos técnicos exigem soluções próprias, mantendo as proporções e a identidade gráfica da coleção.

DIREÇÃO ARTÍSTICA
Defina este bloco antes do layout e não misture suas decisões com posicionamento editorial:
- cena principal e instante exato representado;
- emoção principal e secundária com intensidades;
- símbolo principal;
- objeto heroico único;
- iluminação emocional;
- atmosfera;
- linguagem fotográfica;
- texturas;
- paleta emocional;
- profundidade e separação de planos.

DIREÇÃO FOTOGRÁFICA
Especifique obrigatoriamente:
- lente equivalente em milímetros;
- tipo de plano;
- altura e inclinação da câmera;
- distância do sujeito;
- profundidade de campo;
- contraste;
- luz principal, direção, qualidade e temperatura;
- luz secundária e sua função;
- backlight ou contraluz;
- presença e densidade de névoa, partículas ou atmosfera volumétrica;
- tratamento cinematográfico de primeiro plano, plano médio e fundo.

Não use descrições vagas como “cinematográfico” sem parâmetros visuais concretos. Exemplo de precisão: plano médio baixo, lente equivalente a 50 mm, contraluz dourada, neblina volumétrica discreta e profundidade cinematográfica.

LAYOUT EDITORIAL
Somente depois de concluir Curadoria Visual, Direção Artística e Direção Fotográfica, construa o layout editorial. Não misture instruções de cena, iluminação e câmera com regras de título, painéis, margens e placa.

Use estas proporções aproximadas como padrão gráfico da coleção:
- cena principal: cerca de 60% da composição;
- painéis laterais: cerca de 18%;
- rodapé e placa: cerca de 15%;
- título e cabeçalho: cerca de 10%, admitindo sobreposição controlada entre zonas.

Regras invioláveis:
- o personagem ou sujeito principal nunca pode ser coberto pelos painéis;
- o objeto heroico nunca pode ser ocultado, cortado ou confundido com elementos secundários;
- margens e respiros devem permanecer consistentes;
- elementos editoriais devem enquadrar e ampliar a cena, nunca competir com ela.

Construa uma composição vertical premium e editorialmente legível contendo:

1. CABEÇALHO
- selo editorial “ESSÊNCIA DOS LIVROS”;
- identificação coerente da coleção ou edição;
- título da obra em destaque;
- subtítulo somente quando existir ou for editorialmente necessário.

2. ELEMENTO CENTRAL
- Cena de Impacto escolhida como núcleo emocional e visual;
- composição cinematográfica, autoral e narrativa;
- símbolo ou objeto principal integrado organicamente;
- tensão visual, mistério ou catarse capazes de interromper o olhar;
- força visual sem transformar a peça em wallpaper.

3. PAINÉIS EDITORIAIS
Crie a quantidade e o arranjo adequados à obra. Cada painel deve ter uma função editorial explícita e conteúdo sustentado pelas fontes. Escolha apenas funções relevantes entre:
- Painel Legado;
- Painel Conceito Curatorial;
- Painel Mapa ou Geografia Narrativa;
- Painel Fotografia Histórica ou Evidência Visual;
- Painel Símbolos;
- Painel Notas Curatoriais;
- Painel Direção Narrativa;
- Painel Contexto Histórico.

Cada caixa pode conter no máximo 25 palavras. Nunca use parágrafos. Nenhum painel pode ser apenas decorativo. Fotografias e mapas precisam ter função documental clara. Os painéis devem parecer parte de uma edição especial ou arquivo de museu, nunca componentes de uma interface digital.

4. RODAPÉ E PLACA DE IDENTIFICAÇÃO
Inclua uma placa editorial ou arquivística com os dados disponíveis:
- título;
- obra original;
- autor ou criador;
- ano;
- divisão do arquivo;
- código de catálogo coerente e sistemático.

Omitir dados factuais ausentes em vez de inventá-los. O código de catálogo pode ser uma identificação editorial derivada do título, tipo e ano, sem se apresentar como dado histórico real.

5. ELEMENTOS SECUNDÁRIOS
Distribua de forma seletiva fotografias, mapas, documentos, manuscritos, plantas, símbolos e artefatos relacionados à obra. Eles devem ampliar a leitura editorial, não apenas preencher espaços.

6. OBJETOS FÍSICOS
Quando fizer sentido, integre objetos como bússolas, pergaminhos, armas, flores, livros, medalhas, moedas, relógios, cartas ou outros itens específicos da obra. Use somente objetos sustentados pela BEU ou pela narrativa. Eles devem projetar sombras, ocupar profundidades diferentes e conversar com a cena central.

HIERARQUIA EDITORIAL
A leitura visual deve seguir obrigatoriamente esta ordem:
Título
↓
Cena de Impacto
↓
Objeto Heroico
↓
Frase Curatorial
↓
Painéis Editoriais
↓
Placa de Arquivo

Controle contraste, escala, posição, cor e espaço negativo para preservar essa sequência.

IDENTIDADE VISUAL
- linguagem de pôster editorial premium, material de arquivo, documento de museu e peça colecionável;
- materiais táteis específicos e coerentes, escolhidos entre metal oxidado, bronze patinado, madeira centenária, couro envelhecido, vidro fosco, papel algodão, tinta ferrogálica, cera antiga e outros materiais sustentados pela obra;
- microtexturas, profundidade fotográfica e iluminação curatorial cinematográfica;
- tipografia editorial sofisticada e hierarquia clara;
- textos curtos, legíveis e corretamente posicionados;
- identidade Essência dos Livros consistente, mas composição singular;
- equilíbrio entre densidade informacional e áreas de respiro;
- paisagem sonora, cheiros, temperatura, silêncio e emoção traduzidos visualmente em luz, textura, clima e matéria.

IDENTIDADE PERMANENTE DA COLEÇÃO
Toda peça deve carregar de forma visível e coerente os conceitos:
- ESSÊNCIA DOS LIVROS;
- Collection;
- Archive;
- Museu;
- Colecionável;
- Arquivo Curatorial.

Essas marcas devem compartilhar o mesmo acabamento, rigor museológico, densidade informacional, padrão gráfico e linguagem editorial em toda a coleção. A composição de cada obra pode variar, mas deve parecer produzida pelo mesmo museu, pelo mesmo arquivo e pela mesma direção de arte.

RESTRIÇÕES
- A Cena de Impacto não pode ser substituída por uma imagem apenas bonita, limpa ou decorativa.
- Nunca gerar wallpaper.
- Nunca gerar pôster promocional convencional.
- Nunca gerar thumbnail.
- Nunca gerar banner.
- Nunca gerar capa de streaming.
- Nunca parecer marketing.
- Nunca usar UI moderna.
- Nunca esconder o personagem ou sujeito principal.
- Nunca cortar, ocultar ou descaracterizar o objeto heroico.
- Sempre parecer um item físico de coleção.
- Nunca copiar capas, pôsteres, key art, logotipos protegidos ou rostos de atores reais.
- Nunca inventar fatos, personagens, lugares, datas, símbolos ou citações.
- Não usar montagem genérica de personagens, estética de streaming, interface digital ou layout de template.
- Não sobrecarregar a composição com ornamentos sem função narrativa.
- Não forçar a mesma quantidade de painéis, objetos ou fotografias em todas as obras.
- Não permitir que elementos editoriais escondam o núcleo emocional da composição.

FORMATO DA RESPOSTA
Retorne somente o prompt final para a IA de imagem, completo e operacional, organizado obrigatoriamente nestes blocos separados:
1. CURADORIA VISUAL — briefing preenchido no formato JSON definido acima;
2. DIREÇÃO ARTÍSTICA;
3. DIREÇÃO FOTOGRÁFICA;
4. LAYOUT EDITORIAL;
5. TEXTOS DOS PAINÉIS, todos com até 25 palavras;
6. MATERIAIS E ACABAMENTO;
7. IDENTIDADE DA COLEÇÃO;
8. NEGATIVO PERMANENTE.

O próprio prompt final deve declarar claramente:
- qual é a Cena de Impacto escolhida;
- por que ela foi escolhida;
- emoção dominante e secundária com intensidades percentuais;
- símbolo central;
- objeto heroico único, posição e escala;
- composição visual;
- elemento principal e elementos secundários;
- caixas editoriais e seus textos curtos;
- título e selo “ESSÊNCIA DOS LIVROS”;
- painéis laterais;
- placa de arquivo;
- tom emocional;
- frase curta de impacto.

Depois, detalhe materiais, enquadramento, iluminação, atmosfera, paleta, tipografia, hierarquia e restrições negativas. Não use introdução externa, justificativa do processo, análise ou alternativas: entregue apenas o prompt que será usado pela IA de imagem.

REGRA DE GENERALIZAÇÃO
Não utilize valores fixos dentro do prompt final, exceto a marca “ESSÊNCIA DOS LIVROS”. Títulos, subtítulos, frases, caixas, dados, códigos, objetos e textos específicos devem ser gerados dinamicamente e alimentados exclusivamente pelo contexto, pela BEU e pela Narrativa Cinematográfica. O motor deve funcionar com qualquer obra sem ajustes manuais.

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
      montar: () => montarPromptHeritage({ contexto, beuAtual, narrativaCinematica }),
    },
    capa_cinematica_prompt: {
      responsavel: "Capa Cinemática Prompt",
      montar: () => montarPromptCapaCinematica({ contexto, beuAtual, narrativaCinematica }),
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
  const promptMontado = config.montar({ campos });

  engineStep("PromptBuilder", "✓", {
    tipoEtapa,
    campos_carregados: campos.length,
    modulos,
    tamanho_aproximado: promptMontado.length,
  });

  return promptMontado;
}
