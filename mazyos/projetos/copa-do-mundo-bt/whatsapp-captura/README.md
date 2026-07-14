# WhatsApp Captura — Copa do Mundo de Beach Tennis

Lê as equipes que os capitães mandam **no privado do teu WhatsApp** e gera, sozinho:

- 🎽 `../inscricoes/<etapa>/pedido-camisetas.md` — somado por tamanho/modelagem (pra gráfica)
- 🤖 `../inscricoes/<etapa>/bot-inscricao.csv` — `nome,categoria` (pro teu bot inscrever no letzplay)

Sem API key, sem IA paga: a extração é por regra (`core.js`). Quando o capitão manda
no formato certo, ele lê tudo; quando não consegue, **responde o capitão pedindo pra
reenviar no padrão** — no teu tom.

## Rodar no teu PC

Precisa de **Node** (você já tem) e do teu **celular** pra parear na primeira vez.

```bash
cd projetos/copa-do-mundo-bt/whatsapp-captura
npm install
npm start
```

1. Aparece um **QR code** no terminal → abre WhatsApp no celular → **Aparelhos conectados** → **Conectar** → escaneia.
2. Pronto. Enquanto o terminal estiver aberto, ele ouve os capitães e vai gerando os arquivos.
3. A sessão fica salva (pasta `.wwebjs_auth/`) — nas próximas vezes não precisa escanear de novo.

## Configurar (`capitaes.json`)

```json
{
  "etapa": "umuarama",
  "capturarTodosPrivados": false,
  "capitaes": [
    { "nome": "Rafael Souza", "numero": "5544999990000" }
  ]
}
```

- `etapa` — nome da pasta onde os arquivos são salvos (ex.: `umuarama`).
- `capitaes` — lista com **número no formato internacional** (55 + DDD + número, só dígitos).
  Só quem está aqui é ouvido.
- `capturarTodosPrivados` — se `true`, também processa qualquer privado que **pareça uma
  equipe** (útil quando você ainda não cadastrou os números). Deixe `false` no dia a dia.

## Formato que o capitão deve mandar

Uma linha por atleta, numerada:

```
1- João Pedro Silva - A - G masc
2- Bruna Costa - B - P fem
3- Sérgio e Paulo - 60+ - GG/GG masc
```

- **Categorias:** A · B · C · D · E · 40+ · 60+
- **Tamanhos:** PP · P · M · G · GG · XG
- **Modelagem:** masc · fem · baby look
- Manda o modelo pro capitão: `../inscricoes/modelo-equipe.md`

## Testar sem WhatsApp

```bash
npm test
```

Roda o `core.js` numa mensagem bagunçada de exemplo e mostra a extração + os arquivos gerados.

## Limites (honestos)

- Sem IA, a leitura depende do formato. Fora do padrão, o parser erra mais — por isso ele
  **cobra o reenvio** em vez de chutar. Dado faltando é sempre sinalizado, nunca inventado.
- `whatsapp-web.js` é **não-oficial**: automatiza o WhatsApp Web. Use no teu número com bom
  senso (volume normal de organizador). Se um dia quiser blindar, migra pro caminho oficial
  (WhatsApp Business API).
- Precisa ficar **rodando** (terminal aberto / processo ligado) pra capturar em tempo real.
