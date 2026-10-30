/*
 * Dados editáveis do site — altere aqui sem mexer no resto do código.
 * Itens marcados com [CONFIRMAR] foram tirados de fontes públicas e
 * precisam ser confirmados com a secretaria do MDM.
 */
window.MDM_CONFIG = {
  nome: 'Melhores do Mundo Cursos',
  whatsapp: '5581987706195',            // número que recebe as matrículas
  whatsappExibicao: '(81) 9 8770-6195',
  email: 'ouvidoriamdm@melhoresdomundocursos.com.br', // [CONFIRMAR]
  endereco: 'Rua do Riachuelo, 529 – Boa Vista, Recife – PE', // [CONFIRMAR]
  anoLetivo: 2027,

  instagram: {
    pre: 'https://www.instagram.com/mdmpreoficial/',
    kids: 'https://www.instagram.com/mdmkidsoficial/',
    policiais: 'https://www.instagram.com/mdm.carreiraspoliciais/'
  },

  /*
   * Se quiser salvar as matrículas numa planilha do Google, publique o script
   * em integracao/google-apps-script.gs e cole a URL do app da Web aqui.
   * Vazio = a matrícula é enviada só pelo WhatsApp.
   */
  endpointMatricula: '',

  cursos: [
    {
      id: 'pre-enem',
      nome: 'Pré-ENEM',
      tag: 'Mais procurado',
      resumo: 'Preparação completa para o ENEM com foco na TRI, redação forte e simulados no padrão INEP.',
      itens: ['Todas as áreas do ENEM', 'Correção de redação', 'Simulados no padrão INEP', 'Aulões e revisões'],
      cor: '#7B2CF0',
      icone: 'target'
    },
    {
      id: 'pre-ssa',
      nome: 'Pré-SSA',
      tag: 'SSA 1, 2 e 3',
      resumo: 'Turmas para o Sistema Seriado da UPE, com conteúdo organizado por etapa e treino de prova.',
      itens: ['Conteúdo por etapa do SSA', 'Questões no estilo UPE', 'Fichas-resumo', 'Plantão de dúvidas'],
      cor: '#9B4DFF',
      icone: 'stairs'
    },
    {
      id: 'carreiras-policiais',
      nome: 'Carreiras Policiais',
      tag: 'MDM Carreiras',
      resumo: 'Preparatório para concursos da área de segurança, com turmas iniciante e avançada.',
      itens: ['Turmas iniciante e avançada', 'Disciplinas do edital', 'Treino de questões', 'Acompanhamento de perto'],
      cor: '#5A1BB8',
      icone: 'shield'
    },
    {
      id: 'reforco',
      nome: 'Reforço Escolar',
      tag: 'Fundamental e Médio',
      resumo: 'Acompanhamento para recuperar a base, tirar dúvidas da escola e ganhar confiança.',
      itens: ['Turmas reduzidas', 'Base de português e matemática', 'Apoio nas provas da escola', 'Rotina de estudos'],
      cor: '#B07BFF',
      icone: 'book'
    },
    {
      id: 'kids',
      nome: 'MDM Kids',
      tag: 'Para os pequenos',
      resumo: 'O jeito MDM de ensinar, pensado para crianças que estão começando a jornada.',
      itens: ['Aprendizado lúdico', 'Leitura e escrita', 'Raciocínio lógico', 'Acompanhamento da família'],
      cor: '#FFC21A',
      icone: 'star'
    }
  ],

  turnos: ['Manhã', 'Tarde', 'Noite'], // [CONFIRMAR]

  series: ['6º ao 9º ano (Fundamental)', '1º ano do Ensino Médio', '2º ano do Ensino Médio', '3º ano do Ensino Médio', 'Já concluí o Ensino Médio', 'Educação infantil / Fundamental I']
};
