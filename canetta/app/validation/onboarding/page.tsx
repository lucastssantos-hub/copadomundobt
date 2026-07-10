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
    eyebrow: "Limite & privacidade",
    title: "Espelho dos seus registros, e sob seu controle.",
    intent:
      "Fixar a fronteira regulatória e o consentimento de dados de saúde (LGPD) logo no início.",
    body:
      "O app não diagnostica, não prescreve e não recomenda dose, alimento, treino ou mudança de tratamento. Seus dados de saúde são privados e você decide o que registrar.",
    primary: "Aceitar e continuar",
    secondary: "Ler termos e privacidade",
    notes: [
      "Mudanças de tratamento devem ser combinadas com profissionais.",
      "Os dados exibidos vêm de você.",
      "Você pode exportar ou apagar seus dados quando quiser."
    ]
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
    eyebrow: "Contexto opcional",
    title: "Se quiser, registre altura e um objetivo pessoal.",
    intent: "Permitir contexto sem cálculo de peso ideal ou projeção.",
    body:
      "Fica guardado como referência declarada por você, sem promessa de resultado e sem cálculo de peso ideal.",
    primary: "Salvar contexto",
    secondary: "Pular por enquanto",
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
    eyebrow: "Onde você está",
    title: "Marque a fase e o estado atual da sua rotina.",
    intent:
      "Unir fase da jornada e estado da dose numa só tela (organização por fases), em linguagem simples e sem conduta clínica.",
    body:
      "Escolha a fase e diga se sua dose está aumentando, fixa ou reduzindo — tudo informado por você. Serve para organizar seu diário e preparar a consulta.",
    primary: "Salvar",
    chips: ["Primeiro mês", "Até 3 meses", "3 a 6 meses", "Manutenção", "Redução ou pausa"],
    notes: ["Dose: aumentando · fixa · reduzindo (informado por você)."]
  },
  {
    id: "09",
    eyebrow: "Seu diário",
    title: "Escolha o que quer acompanhar primeiro.",
    intent: "Dar controle, reduzir carga inicial e condicionar quais configurações aparecem a seguir.",
    body:
      "Você só configura o que escolher aqui — e pode ativar o resto depois. Começar simples ajuda na consistência.",
    primary: "Montar meu diário",
    chips: ["Aplicações", "Peso", "Sintomas", "Rotina & hábitos", "Perguntas"]
  },
  {
    id: "10",
    eyebrow: "Aplicações",
    title: "Lembrete no dia e horário que você informar.",
    intent: "Criar lembrete sem recomendar dia, horário ou intervalo; solicitar permissão de notificação.",
    body: "O Canetta lembra o registro no horário que você definir. O dia e o horário são seus.",
    primary: "Permitir notificações e configurar",
    secondary: "Pular por enquanto"
  },
  {
    id: "11",
    eyebrow: "Sintomas",
    title: "Quando algo aparecer, registre intensidade e duração.",
    intent: "Transformar o SOS em diário observacional, não em orientação terapêutica.",
    body: "O app ajuda a levar fatos para consulta. Ele não interpreta gravidade nem indica conduta.",
    primary: "Ativar diário de sintomas",
    chips: ["Náusea", "Azia", "Constipação", "Cansaço", "Outro"]
  },
  {
    id: "12",
    eyebrow: "Rotina & hábitos",
    title: "Acompanhe sinais da rotina, sem metas prescritas.",
    intent:
      "Organização por hábitos observados (a lógica anti-rebote entra aqui como registro, nunca como promessa). Inclui o registro alimentar visual.",
    body:
      "Registre refeições (foto ou nota), água, movimento, sono e fome percebida. O resumo mostra apenas padrões informados por você — o Canetta não monta dieta.",
    primary: "Adicionar ao diário",
    notes: ["Sem calorias.", "Sem macros.", "Sem treino indicado.", "Sem previsão de reganho."]
  },
  {
    id: "13",
    eyebrow: "Peso",
    title: "Escolha se quer acompanhar peso informado por você.",
    intent: "Deixar claro que peso é registro, não julgamento.",
    body: "Os gráficos mostram entradas registradas, sem comparar corpos ou prometer velocidade de perda.",
    primary: "Ativar peso",
    secondary: "Deixar para depois",
    notes: ["Exibir tendência visual.", "Sem classificação corporal.", "Sem meta automática."]
  },
  {
    id: "14",
    eyebrow: "Consulta",
    title: "Prepare perguntas para levar ao profissional.",
    intent: "Transformar dados em pauta de consulta sem responder clinicamente.",
    body: "O Canetta junta registros recentes e perguntas salvas para você revisar antes do atendimento.",
    primary: "Criar checklist",
    chips: ["Sintomas", "Dose registrada", "Fome", "Peso", "Dúvidas"]
  },
  {
    id: "15",
    eyebrow: "Revisão",
    title: "Confira o resumo antes de abrir sua jornada.",
    intent: "Dar transparência sobre o que foi salvo.",
    body: "Você pode editar tudo depois. Este resumo é apenas o ponto de partida do diário.",
    primary: "Confirmar",
    sample: "Fase: até 3 meses · Dose: fixa · Diário: aplicações, sintomas, consulta"
  },
  {
    id: "16",
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
