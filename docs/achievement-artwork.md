# Artes das conquistas

20 imagens geradas com ImageGen integrado. Arquivos PNG em `frontend/public/achievements/<slug>.png`. Catálogo conferido no banco configurado em backend/.env.

O campo `achievement.image_url` guarda um caminho local, uma URL HTTPS ou uma referência `s3://bucket/key`. Referências S3 são convertidas pela API em URLs assinadas com duração de uma hora. O campo `icon` original continua como alternativa. Conquistas secretas permanecem ocultas até o desbloqueio.

Publicação: executar, a partir de backend, `node --env-file=.env scripts/publish-achievement-art.cjs`. O script usa chaves com hash do conteúdo, verifica o arquivo baixado, salva backup das referências anteriores em `tmp/achievement-art` e atualiza o catálogo em uma transação. Não modifica ACL/política do bucket. `--local` vincula os arquivos servidos pelo frontend; `--slug <slug>` limita a publicação a um item.

## Prompts

### sentinela-primeira-missao

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: small teal shield with a cream checkmark. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### sentinela-em-acao

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: sturdy teal and purple shield with two golden corner rivets. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### sentinela-veterano

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: ornate teal shield medallion with golden rim and central checkmark. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### sentinela-implacavel

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: legendary teal purple shield with golden wings and a small crown. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### especialista-primeira-aula

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: open cream book with purple cover and teal checkmark. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### especialista-dedicado

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: three stacked purple teal and cream books with a golden bookmark. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### especialista-da-academia

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: purple graduation cap on an open book with golden tassel. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### mestre-do-conhecimento

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: glowing lavender brain floating above a golden open book. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### investigador-primeira-partida

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: teal magnifying glass with purple handle and bright cream lens. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### investigador-dez-partidas

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: magnifying glass over a lavender evidence card with a teal target. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### investigador-perfeito

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: teal concentric target with a golden arrow hitting its center. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### investigador-lendario

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: golden detective badge with a lavender fingerprint and small teal gems. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### consistencia-primeiro-dia

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: small coral orange flame inside a purple badge. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### consistencia-tres-dias

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: lavender calendar with exactly three teal checkmarks. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### consistencia-sete-dias

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: golden calendar with seven small teal squares and a coral flame. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### consistencia-trinta-dias

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: legendary golden laurel wreath surrounding a large coral flame and purple star. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### elite-nivel-dois

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: two golden chevrons pointing upward on a lavender rank badge. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### elite-nivel-cinco

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: ascending teal arrow with three golden steps and purple badge. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### elite-nivel-dez

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: golden crown with three lavender and teal gems. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.

### elite-vinte-cinco-mil

Use case: stylized-concept. Asset type: standalone achievement badge for a children's cybersecurity academy, readable at 40px. Subject: legendary golden trophy with purple handles, teal gem and two sparkling stars. Match a cohesive set of playful 16-bit pixel art game icons: chunky visible square pixels, crisp dark purple stepped outlines, broad simple shapes, subtle pixel highlights, limited lavender, teal, cream, coral and warm gold palette. Centered silhouette filling 80% of square canvas, safe margins on all sides. Genuine transparent alpha background, no background color, no checkerboard, no frame rectangle, no scenery, no labels, no text, no numbers. Simple premium game inventory sprite, not realistic or overly detailed.
