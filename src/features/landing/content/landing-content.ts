/**
 * Conteúdo validado da Landing Page Híbrida do Smart Barber (Abordagem A).
 * Reúne todas as cópias factuais, descrições, itens do Bento Grid, How it Works,
 * configurações de planos e FAQ.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface TrustItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  highlight: string;
  meta: string;
}

export interface BentoItem {
  id: string;
  title: string;
  description: string;
  badge: string;
  span: 'wide' | 'normal';
  exampleTitle: string;
  exampleDetail: string;
}

export interface FlowStep {
  number: string;
  title: string;
  description: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  target: string;
  price: string;
  badge?: string;
  isFeatured?: boolean;
  features: string[];
  ctaLabel: string;
}

export interface FaqItem {
  id: string;
  category: 'cliente' | 'barbearia';
  question: string;
  answer: string;
}

export const landingContent = {
  header: {
    brandName: 'Smart Barber',
    links: [
      { label: 'Para clientes', href: '#para-clientes' },
      { label: 'Para barbearias', href: '#para-barbearias' },
      { label: 'Como funciona', href: '#como-funciona' },
      { label: 'Preços', href: '#precos' },
      { label: 'Dúvidas', href: '#faq' },
    ] as NavLink[],
    loginAction: 'Entrar',
    authenticatedAction: 'Minha área',
  },

  hero: {
    eyebrow: 'Smart Barber — Sistema e Descoberta',
    headline: 'Seu próximo horário. Sua barbearia em movimento.',
    support:
      'Encontre uma barbearia e escolha seu atendimento. Cuide dos serviços, dos horários e da rotina da sua equipe com o Smart Barber.',
    clientCta: {
      tag: 'Quero agendar',
      title: 'Encontre profissionais e agende com autonomia',
      action: 'Encontrar barbearias',
      href: '#para-clientes',
    },
    barberCta: {
      tag: 'Tenho uma barbearia',
      title: 'Organize serviços, equipe e agenda num só fluxo',
      action: 'Solicitar demonstração',
      href: '#demonstracao',
    },
    mockupNotice: 'Demonstração ilustrativa',
  },

  trust: {
    headline: 'Veja o que acontece em cada etapa.',
    subtitle: 'Recortes demonstráveis das ferramentas reais do Smart Barber.',
    items: [
      {
        id: 'catalogo',
        title: 'Serviço, preço e duração',
        description: 'O cliente sabe exatamente o investimento e o tempo antes de confirmar.',
        badge: 'Catálogo',
        highlight: 'R$ 85,00',
        meta: 'Corte Tradicional & Barba • 45 min',
      },
      {
        id: 'revisao',
        title: 'Revisão do horário escolhido',
        description: 'Conferência de profissional e horário selecionado antes do envio.',
        badge: 'Reserva',
        highlight: '16:30',
        meta: 'Sexta-feira • Com Marcos Silva',
      },
      {
        id: 'agenda',
        title: 'Agenda operacional do dia',
        description: 'Grade em tempo real para acompanhar atendimentos e intervalos.',
        badge: 'Operação',
        highlight: '8 atendimentos',
        meta: '2 horários livres • Grade sincronizada',
      },
    ] as TrustItem[],
  },

  problem: {
    headline: 'Menos mensagens para combinar. Mais clareza para atender.',
    subtitle:
      'O custo do agendamento espalhado em conversas versus a tranquilidade de um fluxo integrado.',
    beforeTitle: 'Hoje, tudo espalhado',
    beforePoints: [
      { author: 'Cliente', quote: 'Qual serviço? Qual valor? Ainda tem horário para hoje?' },
      { author: 'Dono', quote: 'Entre uma conversa e outra, fica difícil acompanhar o dia.' },
      { author: 'Rotina', quote: 'Mensagens acumuladas em múltiplos chats e interrupções na cadeira.' },
    ],
    afterTitle: 'Com o fluxo organizado',
    afterResolution: 'Uma escolha clara para o cliente. Uma rotina organizada para a barbearia.',
    afterSteps: [
      'Serviço catalogado com preço e duração precisos',
      'Profissional preferido e horário livre na grade',
      'Revisão detalhada sem ambiguidades',
      'Confirmação real integrada na agenda da equipe',
    ],
  },

  bento: {
    headline: 'Do horário escolhido ao dia organizado.',
    subtitle: 'Recursos desenhados para conectar quem atende a quem valoriza o seu tempo.',
    items: [
      {
        id: 'catalogo-publico',
        title: 'Escolha sabendo o que vai contratar',
        description: 'Consulte serviço, duração e valor antes de avançar. Informação clara para uma decisão sem surpresas.',
        badge: 'Catálogo público',
        span: 'wide',
        exampleTitle: 'Exemplo: Tabela de serviços pública',
        exampleDetail:
          'O cliente navega pelos serviços oferecidos com valores, descrição e tempo estimado de execução, sem necessidade de login prévio.',
      },
      {
        id: 'reserva-autonoma',
        title: 'Encontre um horário que combine com você',
        description: 'Selecione serviço, profissional e disponibilidade sem idas e vindas de mensagens.',
        badge: 'Reserva autônoma',
        span: 'normal',
        exampleTitle: 'Exemplo: Seleção de horário',
        exampleDetail:
          'Apenas horários realmente livres são apresentados para o profissional selecionado, evitando conflitos na cadeira.',
      },
      {
        id: 'agenda-contexto',
        title: 'Veja sua agenda com contexto',
        description: 'Acompanhe o dia e localize cada atendimento com status e notas operacionais.',
        badge: 'Agenda operacional',
        span: 'normal',
        exampleTitle: 'Exemplo: Grade diária',
        exampleDetail:
          'Visualização em linha do tempo dos atendimentos marcados, permitindo remanejamentos e visão rápida do próximo cliente.',
      },
      {
        id: 'equipe-horarios',
        title: 'Organize quando sua equipe atende',
        description: 'Cuide de horários semanais, pausas de almoço e exceções pontuais da equipe.',
        badge: 'Disponibilidade',
        span: 'normal',
        exampleTitle: 'Exemplo: Escalas e exceções',
        exampleDetail:
          'Definição flexível de dias de trabalho, turnos, intervalos e bloqueios de feriados para cada profissional.',
      },
      {
        id: 'proximo-atendimento',
        title: 'Saiba qual é o próximo atendimento',
        description: 'Consulte próximos agendamentos e contexto operacional para manter o ritmo sem atrasos.',
        badge: 'Painel do dia',
        span: 'wide',
        exampleTitle: 'Exemplo: Resumo operacional',
        exampleDetail:
          'Painel direto com contagem do dia, próximo cliente a chegar e status atualizado em tempo real.',
      },
    ] as BentoItem[],
  },

  howItWorks: {
    headline: 'Uma escolha do cliente. Um atendimento na sua agenda.',
    subtitle: 'Duas jornadas complementares que se conectam em tempo real.',
    clientTrack: {
      title: 'Para quem vai cortar',
      badge: 'Jornada do Cliente',
      steps: [
        {
          number: '01',
          title: 'Encontrar a barbearia',
          description: 'Acesse o catálogo da barbearia de sua escolha pelo link direto ou pela busca.',
        },
        {
          number: '02',
          title: 'Consultar serviços',
          description: 'Veja preços, durações e descrições dos serviços oferecidos.',
        },
        {
          number: '03',
          title: 'Escolher profissional e horário',
          description: 'Selecione o barbeiro de sua preferência e um horário livre na grade.',
        },
        {
          number: '04',
          title: 'Revisar e confirmar',
          description: 'Confira os dados do agendamento e receba a confirmação oficial.',
        },
      ] as FlowStep[],
    },
    barberTrack: {
      title: 'Para quem comanda a barbearia',
      badge: 'Jornada da Barbearia',
      steps: [
        {
          number: '01',
          title: 'Configurar serviços',
          description: 'Cadastre serviços, tempos médios de cadeira e valores praticados.',
        },
        {
          number: '02',
          title: 'Definir disponibilidade',
          description: 'Configure a escala de atendimento da equipe e os intervalos programados.',
        },
        {
          number: '03',
          title: 'Receber e acompanhar reservas',
          description: 'Acompanhe a agenda preenchida em tempo real sem precisar parar para responder chats.',
        },
      ] as FlowStep[],
    },
    scenes: [
      {
        id: 'escolha',
        title: '1. Escolha do atendimento',
        tag: 'Cliente',
        preview: 'Corte Degradê com Marcos Silva • Sexta às 16:30',
        detail: 'O cliente seleciona o serviço e o horário conveniente de forma autônoma.',
      },
      {
        id: 'revisao',
        title: '2. Revisão transparente',
        tag: 'Sistema',
        preview: 'Validação de disponibilidade na grade da unidade',
        detail: 'O sistema verifica os parâmetros e valida a reserva sem sobreposições.',
      },
      {
        id: 'agenda',
        title: '3. Atendimento na agenda',
        tag: 'Barbearia',
        preview: 'Grade do profissional atualizada instantaneamente',
        detail: 'O barbeiro visualiza o compromisso e o histórico do cliente em sua tela.',
      },
    ],
  },

  pricing: {
    headline: 'Uma configuração para o momento da sua barbearia.',
    subtitle: 'Configurações sob consulta. Condições e recursos definidos na demonstração.',
    notice: 'Demonstração personalizada de acordo com o porte e a equipe da sua barbearia.',
    plans: [
      {
        id: 'essencial',
        name: 'Essencial',
        target: 'Operação enxuta, iniciando a organização digital.',
        price: 'Sob consulta',
        badge: 'Operação individual',
        isFeatured: false,
        features: [
          'Catálogo digital de serviços',
          'Agenda para 1 profissional',
          'Definição de disponibilidade semanal',
          'Link direto para agendamento',
          'Revisão clara de horários',
        ],
        ctaLabel: 'Solicitar demonstração',
      },
      {
        id: 'equipe',
        name: 'Equipe',
        target: 'Operação com vários profissionais e rotina compartilhada.',
        price: 'Sob consulta',
        badge: 'Para equipes',
        isFeatured: true,
        features: [
          'Tudo da configuração Essencial',
          'Grade compartilhada de profissionais',
          'Disponibilidade individual por barbeiro',
          'Visão operacional centralizada da barbearia',
          'Acompanhamento de atendimentos do dia',
        ],
        ctaLabel: 'Solicitar demonstração',
      },
      {
        id: 'ampliada',
        name: 'Operação ampliada',
        target: 'Necessidades que exigem dimensionamento e análise de aderência.',
        price: 'Sob consulta',
        badge: 'Personalizado',
        isFeatured: false,
        features: [
          'Múltiplas cadeiras ou unidades',
          'Fluxos operacionais adaptados',
          'Orientação na implantação',
          'Atendimento direto para a equipe',
          'Dimensionamento sob medida',
        ],
        ctaLabel: 'Conversar sobre minha operação',
      },
    ] as PricingPlan[],
  },

  faq: {
    headline: 'Antes de dar o próximo passo.',
    subtitle: 'Dúvidas frequentes de clientes e gestores de barbearias.',
    items: [
      {
        id: 'faq-1',
        category: 'cliente',
        question: 'Preciso criar conta para conhecer as barbearias?',
        answer:
          'Você poderá explorar as opções e consultar os serviços antes de entrar. Para concluir o agendamento, seguimos a identificação exigida pelo fluxo de reserva.',
      },
      {
        id: 'faq-2',
        category: 'cliente',
        question: 'Como sei se meu horário foi confirmado?',
        answer:
          'A reserva estará confirmada quando o sistema apresentar a confirmação do agendamento. Escolher um horário ou revisar os dados ainda não conclui a reserva.',
      },
      {
        id: 'faq-3',
        category: 'cliente',
        question: 'Posso remarcar ou cancelar?',
        answer:
          'As opções dependem do estado do agendamento e das regras aplicáveis. Confira as ações disponíveis nos detalhes da sua reserva.',
      },
      {
        id: 'faq-4',
        category: 'barbearia',
        question: 'Quanto custa para minha barbearia?',
        answer:
          'O dimensionamento e os valores são apresentados na demonstração. Conte como sua operação funciona para conversarmos sobre a configuração adequada.',
      },
      {
        id: 'faq-5',
        category: 'barbearia',
        question: 'O que acontece quando solicito a demonstração?',
        answer:
          'Você preenche um formulário curto e abre o WhatsApp com a mensagem pronta. Revise e envie para iniciar a conversa com nossa equipe.',
      },
    ] as FaqItem[],
  },

  footer: {
    headline: 'Seu próximo passo começa com um horário.',
    subtitle: 'Escolha a experiência que melhor atende à sua necessidade.',
    clientPanel: {
      tag: 'Para clientes',
      title: 'Encontre seu próximo atendimento',
      description: 'Veja os serviços e profissionais disponíveis na sua região.',
      action: 'Encontrar barbearias',
      href: '#para-clientes',
    },
    barberPanel: {
      tag: 'Para barbearias',
      title: 'Conheça uma rotina mais organizada',
      description: 'Descubra como o Smart Barber organiza sua agenda e simplifica o dia.',
      action: 'Solicitar demonstração',
      href: '#demonstracao',
    },
    formTitle: 'Solicitar demonstração comercial',
    formSubtitle:
      'Preencha as informações da sua barbearia para gerarmos a mensagem de apresentação no WhatsApp.',
    formNotice:
      'Vamos abrir uma conversa com os dados preenchidos. Você poderá revisar todo o texto antes de enviar.',
    copyright: '© 2026 Smart Barber. Todos os direitos reservados.',
    contactLabel: 'Fale conosco',
    termsLabel: 'Termos de Uso',
    privacyLabel: 'Política de Privacidade',
    loginLabel: 'Acesso do Profissional / Cliente',
  },
} as const;
