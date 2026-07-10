type ValidationScreen = {
  id: string;
  title: string;
  intent: string;
  eyebrow: string;
  body: string;
  primary: string;
  secondary?: string;
  chips?: string[];
  notes?: string[];
  sample?: string;
};

const screens: ValidationScreen[] = [
  {
    id: "01",
    eyebrow: "Entrada",
    title: "Sua jornada registrada em um só lugar.",
    intent: "Apresentar o valor central antes de pedir dados.",
    body:
      "Canetta organiza aplicações, peso, sintomas, hábitos e perguntas para consulta a partir do que você registrar.",
    primary: "Começar meu registro",
    secondary: "Já tenho conta",
    chips: ["Dose", "Peso", "Sintomas", "Consulta"]
  },
  {
    id: "02",
    eyebrow: "Limite seguro",
    title: "Espelho dos seus registros, não orientação médica.",
    intent: "Fixar a fronteira regulatória logo no início.",
    body:
      "O app não diagnostica, não prescreve e não recomenda dose, alimento, treino ou mudança de tratamento.",
    primary: "Entendi",
    notes: ["Mudanças de tratamento devem ser combinadas com profissionais.", "Os dados exibidos vêm do usuário."]
  },
  {
    id: "03",
    eyebrow: "Momento",
    title: "Em que ponto você está agora?",
    intent: "Separar quem já usa GLP-1 de quem ainda vai conversar com profissional.",
    body: "Essa escolha muda a ordem dos próximos registros, sem mudar orientações clínicas.",
    primary: "Continuar",
    chips: ["Já uso GLP-1", "Quero conversar com profissional"]
  },
  {
    id: "04",
    eyebrow: "Identidade",
    title: "Como o Canetta deve chamar você?",
    intent: "Criar vínculo leve e coletar apenas o necessário.",
    body: "O nome aparece nos resumos e nas telas de consulta.",
    primary: "Salvar nome",
    sample: "Lucas"
  },
  {
    id: "05",
    eyebrow: "Tratamento informado",
    title: "Registre o medicamento como foi informado a você.",
    intent: "Guardar medicamento, dose e frequência como campos declarados pelo usuário.",
    body: "Esses campos são rótulos para o seu histórico. O Canetta não valida nem sugere dose.",
    primary: "Salvar tratamento",
    chips: ["Medicamento", "Dose registrada", "Frequência registrada"]
  },
  {
    id: "06",
    eyebrow: "Corpo e meta",
    title: "Se quiser, registre altura e meta informada por você.",
    intent: "Permitir contexto sem cálculo de peso ideal ou projeção.",
    body: "A meta aparece como referência declarada, sem promessa de resultado.",
    primary: "Salvar contexto",
    notes: ["Sem IMC interpretativo.", "Sem previsão de tempo.", "Sem peso ideal calculado."]
  },
  {
    id: "07",
    eyebrow: "Maior dificuldade",
    title: "O que mais costuma atrapalhar sua rotina?",
    intent: "Capturar linguagem do usuário para personalizar registros e consultas.",
    body: "Essa resposta ajuda a organizar lembretes e perguntas, sem transformar o app em prescrição.",
    primary: "Continuar",
    chips: ["Fome à noite", "Náusea", "Constipação", "Fim de semana", "Esquecimento"]
  },
  {
    id: "08",
    eyebrow: "Fase da jornada",
    title: "Marque a fase que melhor descreve seu momento.",
    intent: "Trazer a lógica por fases do protocolo sem parecer conduta clínica.",
    body: "A fase serve para organizar seu diário e preparar conversa com profissional.",
    primary: "Salvar fase",
    chips: ["Primeiro mês", "Até 3 meses", "3 a 6 meses", "Manutenção", "Redução ou pausa"]
  },
  {
    id: "09",
    eyebrow: "Eixos",
    title: "Como você quer enxergar sua jornada?",
    intent: "Configurar os dois eixos simples que alimentam o dashboard.",
    body: "Escolha o estado da dose e o objetivo atual, ambos informados por você.",
    primary: "Salvar eixos",
    chips: ["Dose aumentando", "Dose fixa", "Perdendo peso", "Mantendo", "Reduzindo ou parou"]
  },
  {
    id: "10",
    eyebrow: "Plano de registros",
    title: "Escolha o que quer acompanhar primeiro.",
    intent: "Dar controle e reduzir carga inicial.",
    body: "Você pode ativar mais registros depois. Começar simples ajuda a manter consistência.",
    primary: "Montar meu diário",
    chips: ["Aplicações", "Peso", "Sintomas", "Hábitos", "Perguntas"]
  },
  {
    id: "11",
    eyebrow: "Aplicações",
    title: "Lembrete baseado no dia e horário que você informar.",
    intent: "Criar lembrete sem recomendar dia, horário ou intervalo.",
    body: "O Canetta lembra o registro. O dia e o horário são definidos por você.",
    primary: "Configurar lembrete",
    secondary: "Pular por enquanto"
  },
  {
    id: "12",
    eyebrow: "Sintomas",
    title: "Quando algo aparecer, registre intensidade e duração.",
    intent: "Transformar o SOS em diário observacional, não em orientação terapêutica.",
    body: "O app ajuda a levar fatos para consulta. Ele não interpreta gravidade nem indica conduta.",
    primary: "Ativar diário de sintomas",
    chips: ["Náusea", "Azia", "Constipação", "Cansaço", "Outro"]
  },
  {
    id: "13",
    eyebrow: "Anti-rebote",
    title: "Acompanhe sinais de rotina sem promessa de resultado.",
    intent: "Incluir anti-rebote como organização por hábitos observados.",
    body: "Registre refeições, água, movimento, sono e fome percebida. O resumo mostra padrões informados por você.",
    primary: "Adicionar ao diário",
    notes: ["Sem calorias.", "Sem macros.", "Sem treino indicado.", "Sem previsão de reganho."]
  },
  {
    id: "14",
    eyebrow: "Alimentação",
    title: "Registre o prato como memória visual simples.",
    intent: "Permitir acompanhamento alimentar sem metas prescritivas.",
    body: "Use fotos ou notas para lembrar o que aconteceu no dia. O Canetta não monta dieta.",
    primary: "Ativar registro alimentar",
    secondary: "Deixar para depois"
  },
  {
    id: "15",
    eyebrow: "Peso",
    title: "Escolha se quer acompanhar peso informado por você.",
    intent: "Deixar claro que peso é registro, não julgamento.",
    body: "Os gráficos mostram entradas registradas, sem comparar corpos ou prometer velocidade de perda.",
    primary: "Ativar peso",
    notes: ["Exibir tendência visual.", "Sem classificação corporal.", "Sem meta automática."]
  },
  {
    id: "16",
    eyebrow: "Consulta",
    title: "Prepare perguntas para levar ao profissional.",
    intent: "Transformar dados em pauta de consulta sem responder clinicamente.",
    body: "O Canetta junta registros recentes e perguntas salvas para você revisar antes do atendimento.",
    primary: "Criar checklist",
    chips: ["Sintomas", "Dose registrada", "Fome", "Peso", "Dúvidas"]
  },
  {
    id: "17",
    eyebrow: "Revisão",
    title: "Confira o resumo antes de abrir sua jornada.",
    intent: "Dar transparência sobre o que foi salvo.",
    body: "Você pode editar tudo depois. Este resumo é apenas o ponto de partida do diário.",
    primary: "Confirmar",
    sample: "Fase: até 3 meses · Eixo: dose fixa · Diário: aplicações, sintomas, consulta"
  },
  {
    id: "18",
    eyebrow: "Ativação",
    title: "Pronto. Seu diário começa com o próximo registro.",
    intent: "Levar ao aha moment: a jornada virou um painel claro e acionável.",
    body: "O dashboard abre com lembrete, registros rápidos e preparação de consulta.",
    primary: "Abrir minha jornada",
    secondary: "Enviar fluxo para validação"
  }
];

export default function OnboardingValidationPage() {
  return (
    <>
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          Canetta
        </div>
        <span className="validation-pill">Validação</span>
      </header>
      <section className="page validation-page">
        <span className="eyebrow">Onboarding completo</span>
        <h1 className="title">Fluxo de validação das telas iniciais.</h1>
        <p className="sub">
          Storyboard público para revisar narrativa, ordem das perguntas e limites regulatórios antes de transformar tudo em
          fluxo funcional.
        </p>

        <div className="validation-summary">
          <div>
            <b>{screens.length}</b>
            <span>telas</span>
          </div>
          <div>
            <b>0</b>
            <span>prescrições</span>
          </div>
          <div>
            <b>1</b>
            <span>diário inicial</span>
          </div>
        </div>

        <div className="screen-list">
          {screens.map((screen) => (
            <article className="validation-screen" key={screen.id}>
              <div className="screen-meta">
                <span>{screen.id}</span>
                <p>{screen.intent}</p>
              </div>
              <div className="screen-preview">
                <span className="eyebrow">{screen.eyebrow}</span>
                <h2>{screen.title}</h2>
                <p>{screen.body}</p>

                {screen.sample ? <div className="sample-box">{screen.sample}</div> : null}

                {screen.chips ? (
                  <div className="chip-row">
                    {screen.chips.map((chip) => (
                      <span key={chip}>{chip}</span>
                    ))}
                  </div>
                ) : null}

                {screen.notes ? (
                  <div className="note-list">
                    {screen.notes.map((note) => (
                      <span key={note}>{note}</span>
                    ))}
                  </div>
                ) : null}

                <div className="screen-actions">
                  <button className="btn btn-primary" type="button">
                    {screen.primary}
                  </button>
                  {screen.secondary ? (
                    <button className="btn btn-ghost" type="button">
                      {screen.secondary}
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
