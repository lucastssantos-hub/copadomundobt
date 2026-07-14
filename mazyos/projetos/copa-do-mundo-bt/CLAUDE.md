# Copa do Mundo de Beach Tennis

> Projeto criado em 2026-07-14. Pasta dedicada — instruções aqui sobrescrevem as da raiz quando relevantes.

## Sobre

Automatizar o processo inteiro do evento Copa do Mundo de Beach Tennis (circuito
de equipes/seleções). Operação própria do Lucas — ele toca, executa e entrega tudo.

## Tipo

Operação própria (projeto interno).

## Entregas previstas

- Automação de inscrição/gestão de capitães e atletas (dados + tamanho de camiseta)
- Conteúdo de Instagram (anúncio de capitães + posts de aquecimento)
- Prospecção de patrocinadores (lista + abordagem + proposta)
- Preparação dos dados no formato do LED display (reduzir o "subir manual")

## Onde salvar o que

- Briefing e contexto do processo: `briefing.md` nessa pasta
- Inscrições (capitães/atletas/camisetas): `inscricoes/`
- Conteúdo (posts, carrosséis, roteiros): `conteudo/`
- Patrocinadores (lista, abordagens, propostas): `patrocinadores/`

## Contexto que herda da raiz

Herda automaticamente o tom de voz, marca e contexto do negócio de `_memoria/` e
`identidade/` da raiz. Não duplicar aqui.

## Específico desse projeto

- O fluxo começa sempre por **fechar a arena** — nada de inscrição antes disso.
- Inscrição é **por capitão**, não por atleta. O capitão monta a própria equipe.
  Todo contato de captação é direto Lucas ↔ capitão.
- Chaves e confrontos são gerados pelo LED display; a inscrição sobe **manual** ali.
- Sempre coletar **tamanho de camiseta** junto com os dados do atleta.
