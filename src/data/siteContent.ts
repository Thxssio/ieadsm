import { MAP_EMBED_URL } from "@/data/site";

export type SiteSettings = {
  heroBadge: string;
  heroTitleLine: string;
  heroTitleHighlight: string;
  heroVerse: string;
  heroVerseRef: string;
  scheduleEyebrow: string;
  scheduleTitle: string;
  scheduleSubtitle: string;
  departmentsEyebrow: string;
  departmentsTitle: string;
  newsTitle: string;
  newsSubtitle: string;
  socialFeedTitle: string;
  socialPrompt: string;
  socialInstagram: string;
  socialFacebook: string;
  socialYoutube: string;
  mapEyebrow: string;
  mapTitle: string;
  mapDescription: string;
  mapEmbedUrl: string;
  locationTitle: string;
  locationAddress1: string;
  locationAddress2: string;
  locationCep: string;
  officeTitle: string;
  officeHours: string;
  officePhone: string;
  pixKey: string;
  institutionalPresidentTitle: string;
  presidentVerseRef: string;
  presidentVerseText: string;
  presidentMessage: string;
  presidentHighlight: string;
  presidentSignatureName: string;
  presidentSignatureRole: string;
  institutionalHistoryTitle: string;
  institutionalBoardTitle: string;
};

const EMPTY_SITE_SETTINGS: SiteSettings = {
  heroBadge: "",
  heroTitleLine: "",
  heroTitleHighlight: "",
  heroVerse: "",
  heroVerseRef: "",
  scheduleEyebrow: "",
  scheduleTitle: "",
  scheduleSubtitle: "",
  departmentsEyebrow: "",
  departmentsTitle: "",
  newsTitle: "",
  newsSubtitle: "",
  socialFeedTitle: "",
  socialPrompt: "",
  socialInstagram: "",
  socialFacebook: "",
  socialYoutube: "",
  mapEyebrow: "",
  mapTitle: "",
  mapDescription: "",
  mapEmbedUrl: "",
  locationTitle: "",
  locationAddress1: "",
  locationAddress2: "",
  locationCep: "",
  officeTitle: "",
  officeHours: "",
  officePhone: "",
  pixKey: "",
  institutionalPresidentTitle: "",
  presidentVerseRef: "",
  presidentVerseText: "",
  presidentMessage: "",
  presidentHighlight: "",
  presidentSignatureName: "",
  presidentSignatureRole: "",
  institutionalHistoryTitle: "",
  institutionalBoardTitle: "",
};

export const seedSiteSettings: SiteSettings = {
  heroBadge: "Bem-vindo à Casa do Pai",
  heroTitleLine: "O ANO DAS",
  heroTitleHighlight: "TRÊS VIRTUDES",
  heroVerse:
    "Portanto, vocês já não são estrangeiros nem forasteiros, mas concidadãos dos santos e membros da família de Deus.",
  heroVerseRef: "— Efésios 2:19 (NVI)",
  scheduleEyebrow: "Programação Semanal",
  scheduleTitle: "Junte-se a Nós em Adoração",
  scheduleSubtitle:
    "Temos um lugar especial para você e sua família em todos os nossos encontros.",
  departmentsEyebrow: "Nossa Comunidade",
  departmentsTitle: "Ministérios e\nDepartamentos",
  newsTitle: "Últimas notícias da IEADSM",
  newsSubtitle: "Comunicados e eventos especiais publicados pela liderança.",
  socialFeedTitle: "Mural de Novidades",
  socialPrompt: "Siga-nos:",
  socialInstagram: "https://instagram.com/adsantamariars",
  socialFacebook: "https://facebook.com/adsantamariars",
  socialYoutube: "https://youtube.com/@adsantamariars",
  mapEyebrow: "Onde Estamos",
  mapTitle: "Venha nos visitar em nossa Sede ou Congregações",
  mapDescription:
    "Estamos localizados estrategicamente para servir a nossa cidade. Temos amplo estacionamento e equipe de recepção pronta para te acolher.",
  mapEmbedUrl: MAP_EMBED_URL,
  locationTitle: "Sede Principal",
  locationAddress1: "R. Venâncio Aires, 1504 - Centro",
  locationAddress2: "Santa Maria - RS",
  locationCep: "CEP: 97010-001",
  officeTitle: "Secretaria",
  officeHours: "Segunda a Sexta: 08:00 - 17:00",
  officePhone: "Tel: (55) 3221-5863",
  pixKey: "95629689/0001-24",
  institutionalPresidentTitle: "Palavra do Presidente",
  presidentVerseRef: "Atos 6:4",
  presidentVerseText:
    '"Mas nós perseveraremos na oração e no ministério da palavra."',
  presidentMessage:
    "Dirijo-me aos queridos irmãos com muita alegria saudando a todos com nossa costumeira e calorosa saudação assembleiana: A Paz do Senhor Jesus, nosso Senhor e Salvador.\n\nEnfrentamos um 2024 de muitos desafios, experimentamos situações novas que jamais imaginaríamos passar, mas em tudo fomos vencedores na pessoa bendita de Cristo. Agora, as aflições de antes e de ontem não podem mais nos alcançar, por isso disse o Apóstolo Paulo “deixando as coisas que para trás ficam, avanço para o alvo”. Diante disso, o que temos é a cada dia a oportunidade nova e abençoada que Deus nos dá de viver e vivendo, servir a Ele e a sua Obra.\n\nEm 2024 nosso lema foi focado na Palavra de Deus – a Santa Bíblia. Em 2025 continuaremos perseverando na Palavra sem descuidar das outras funções principais da Igreja de Cristo na terra, como a adoração verdadeira, o culto, a fidelidade, as virtudes bíblicas, a evangelização, a missão, os trabalhos sociais e as visitas aos necessitados através da Capelania e obreiros da Igreja em todo o campo da IEADSM.\n\nProssigamos, sabendo que nosso descanso e coroação não é aqui, mas está reservado um dia para que a Igreja de Cristo receba das mãos do seu Senhor o seu galardão.\n\nFortalecei-vos uns aos outros! Vamos chorar com os que choram, nos alegrar com os que se alegram e continuar nos quatro cantos de Santa Maria dizendo que Jesus Cristo é o Senhor, que Ele salva, cura, batiza com o Espírito Santo e brevemente vai voltar para buscar a sua Igreja.\n\nPor fim desejo a todos os queridos irmãos um 2025 abençoado em todos os sentidos da vossa vida e que nossa igreja possa crescer para a glória de Deus, sabendo que todos são importantes para o reino de Deus.",
  presidentHighlight:
    '"Deixo minha palavra de orientação e aconselhamento a todos os obreiros, esposas e membros da IEADSM: vamos nos fortalecer naquilo que realmente edifica que é a Palavra de Deus e servir a Deus cada dia mais com inteireza de coração, pois estamos muito perto do grande dia da Igreja."',
  presidentSignatureName: "Pr. Moisés Lamberty",
  presidentSignatureRole:
    "Presidente da Igreja Evangélica Assembleia de Deus de Santa Maria - RS",
  institutionalHistoryTitle: "Nossa História",
  institutionalBoardTitle: "Diretoria Executiva",
};

export const defaultSiteSettings: SiteSettings = EMPTY_SITE_SETTINGS;
