import type { ReactNode } from "react";

export interface ServiceTime {
  id: number;
  day: string;
  times: string[];
  label: string;
  iconName?: "Sun" | "Flame" | "Heart" | "BookOpen" | "Award" | "Users" | "Clock";
  color?: string;
  textColor?: string;
  order?: number;
}

export interface Department {
  id: string;
  title: string;
  description: string;
  icon?: ReactNode;
  logo?: string;
  order?: number;
}

export interface HistoryEvent {
  year: string;
  title: string;
  description: string;
}

export interface BoardMember {
  id: string;
  role: string;
  name: string;
  photo?: string;
  order?: number;
}

export const LOGO_BLACK = "/dark.svg";
export const LOGO_WHITE = "/light.svg";
export const HERO_IMAGE_URL = "/capa.png";
export const MAP_EMBED_URL =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3466.1476142611236!2d-53.81129370000001!3d-29.686499700000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9503cb428c84a02d%3A0x84aa41becb02a068!2sIgreja%20Evang%C3%A9lica%20Assembleia%20de%20Deus%20de%20Santa%20Maria%2FRS!5e0!3m2!1spt-BR!2sbr!4v1770526854995!5m2!1spt-BR!2sbr";

export const historyTimeline: HistoryEvent[] = [
  {
    year: "1919",
    title: "Origem",
    description:
      "O Grande Movimento Pentecostal surgiu em várias partes do mundo. Na Suécia, o Pastor Gustav Nordlund iniciou seu ministério em Lidköping, com 16 irmãos em 18 de janeiro de 1919.",
  },
  {
    year: "1927",
    title: "Início – Santa Maria",
    description:
      "Gustav, Hedwig e Herbert Nordlund viajaram de trem e a pé até Arroio do Só (Santa Maria), realizando o primeiro culto na casa de Guiomar Barcellos.",
  },
  {
    year: "1928",
    title: "Primeiro Batismo",
    description:
      "Ocorreu em 11 de novembro em uma sanga nos fundos da propriedade de Guiomar Barcellos, com pioneiros como Osmilda Pires e Rosa Pires.",
  },
  {
    year: "1928",
    title: "Primeiro Obreiro",
    description:
      "Leonardo Gonçalves converteu-se e foi nomeado primeiro obreiro, ajudando a erguer a capela de 1929 em terreno doado por Guiomar.",
  },
  {
    year: "1932",
    title: "Organização Oficial",
    description:
      "Em 21 de fevereiro, Paulo Cruz organizou oficialmente a congregação de Santa Maria como parte de Porto Alegre.",
  },
  {
    year: "1940–2021",
    title: "Missionários e Pastores",
    description:
      "Uma história marcada por grandes líderes: Leonard Pettersen, Luiz Neves, Orvalino Lemos, Avelino Maicá, Elói Rocha, Domingos Floreni e atualmente Moisés Adriano Lamberty.",
  },
];

export const seedBoardMembers: BoardMember[] = [
  {
    id: "1",
    role: "Presidente",
    name: "Pr. Moisés Lamberty",
    photo: "/directors/Moises.png",
    order: 1,
  },
  {
    id: "2",
    role: "1º Vice-Presidente",
    name: "Pr. Joel Jardim",
    photo: "/directors/Joel.png",
    order: 2,
  },
  {
    id: "3",
    role: "2º Vice-Presidente",
    name: "Pr. José de Ávila",
    photo: "/directors/José.png",
    order: 3,
  },
  {
    id: "4",
    role: "1º Secretário",
    name: "Ev. Paulo Mucenecki",
    photo: "/directors/Paulo.png",
    order: 4,
  },
  {
    id: "5",
    role: "2º Secretário",
    name: "Ev. Adonir Marques",
    photo: "/directors/Adonir.png",
    order: 5,
  },
  {
    id: "6",
    role: "1º Tesoureiro",
    name: "Ev. Emerson Rolim",
    photo: "/directors/Emerson.png",
    order: 6,
  },
  {
    id: "7",
    role: "2º Tesoureiro",
    name: "Ev. Mauricio Hilleshheim",
    photo: "/directors/Mauricio.png",
    order: 7,
  },
];

export const boardMembers: BoardMember[] = [];

export const seedServiceTimes: ServiceTime[] = [
  {
    id: 1,
    day: "Domingo",
    times: [
      "08:50 - Escola Bíblica Dominical (Oração 08h30)",
      "11:00 - Programa 'A Voz da Assembleia de Deus'",
      "19:00 - Culto Público",
    ],
    label: "Dia do Senhor",
    iconName: "Sun",
    color: "bg-yellow-500",
    textColor: "text-yellow-500",
    order: 1,
  },
  {
    id: 2,
    day: "Terça-feira",
    times: ["19:30 - Culto de Oração"],
    label: "Busca de Poder",
    iconName: "Flame",
    color: "bg-orange-500",
    textColor: "text-orange-500",
    order: 2,
  },
  {
    id: 3,
    day: "Quarta-feira",
    times: ["14:30 - Círculo de Oração"],
    label: "Intercessão",
    iconName: "Heart",
    color: "bg-pink-500",
    textColor: "text-pink-500",
    order: 3,
  },
  {
    id: 4,
    day: "Quinta-feira",
    times: ["19:45 - Culto de Ensino (Oração 19h15)"],
    label: "Doutrina",
    iconName: "BookOpen",
    color: "bg-blue-600",
    textColor: "text-blue-600",
    order: 4,
  },
  {
    id: 5,
    day: "Sexta-feira",
    times: ["15:00 - Culto da Vitória"],
    label: "Tarde da Bênção",
    iconName: "Award",
    color: "bg-green-600",
    textColor: "text-green-600",
    order: 5,
  },
  {
    id: 6,
    day: "Sábado",
    times: ["15:00 - DEPAD (Adolescentes)", "19:30 - Culto de Jovens"],
    label: "Juventude",
    iconName: "Users",
    color: "bg-purple-600",
    textColor: "text-purple-600",
    order: 6,
  },
];

export const serviceTimes: ServiceTime[] = [];

export const seedDepartments: Department[] = [
  {
    id: "1",
    title: "UMADESMA – União da Mocidade",
    description:
      "A UMADESMA é o departamento que reúne a juventude da igreja em torno de propósitos eternos. Promove cultos, congressos, ações evangelísticas e sociais, despertando uma geração santa, avivada e disposta a fazer a diferença.",
    logo: "/UMADESMA.png",
    order: 1,
  },
  {
    id: "2",
    title: "UFADESMA – União Feminina",
    description:
      "União que reúne as irmãs da IEADSM em comunhão, serviço e oração. A UFADESMA promove congressos, encontros, discipulados e ações sociais, fortalecendo as mulheres em seu chamado espiritual e papel na obra do Senhor.",
    logo: "/UFADESMA.png",
    order: 2,
  },
  {
    id: "3",
    title: "DEFAM – Departamento da Família",
    description:
      "O DEFAM atua na edificação de lares segundo os princípios bíblicos, promovendo encontros, palestras e aconselhamentos para casais, pais e filhos. Seu objetivo é fortalecer as famílias como alicerce da igreja e da sociedade.",
    logo: "/DEFAM.png",
    order: 3,
  },
  {
    id: "4",
    title: "DEPAD – Departamento de Adolescentes",
    description:
      "O DEPAD cuida do desenvolvimento espiritual e emocional dos adolescentes, promovendo cultos, encontros e atividades que os aproximam de Deus. Busca preparar essa geração para viver e servir com propósito.",
    logo: "/DEPAD.png",
    order: 4,
  },
  {
    id: "5",
    title: "DEPINF – Departamento Infantil",
    description:
      "O DEPINF tem como missão evangelizar, ensinar e cuidar das crianças, conduzindo-as ao conhecimento de Deus desde os primeiros passos. Com linguagem acessível e atividades criativas, forma corações firmes no caminho do Senhor.",
    logo: "/DEPINF.png",
    order: 5,
  },
  {
    id: "6",
    title: "EBD e Educação Cristã",
    description:
      "A Escola Bíblica Dominical é o braço de ensino da IEADSM, oferecendo classes para todas as idades e promovendo o estudo sistemático da Palavra de Deus. A Educação Cristã busca aprofundar o conhecimento bíblico e fortalecer a fé da igreja.",
    logo: "/EBD.png",
    order: 6,
  },
  {
    id: "7",
    title: "Missões",
    description:
      "O Departamento de Missões mobiliza a igreja para alcançar os confins da terra, apoiando missionários e promovendo ações de envio e sustento. Com fervor evangelístico, vive o compromisso de expandir o Reino de Deus em todas as nações.",
    logo: "/MISSOES.png",
    order: 7,
  },
  {
    id: "8",
    title: "Música",
    description:
      "Responsável pela organização e formação dos ministérios de louvor, corais e músicos da IEADSM. O Departamento de Música busca excelência na adoração, conduzindo a igreja à presença de Deus através dos cânticos espirituais.",
    logo: "/MÚSICA.png",
    order: 8,
  },
  {
    id: "9",
    title: "Ação Social",
    description:
      "Com o compromisso de ser resposta prática ao amor de Cristo, desenvolve projetos de assistência a famílias em vulnerabilidade, campanhas solidárias e apoio emergencial. Seu foco é estender a mão e compartilhar esperança.",
    logo: "/ACAOSOCIAL.png",
    order: 9,
  },
  {
    id: "10",
    title: "AFINIDADE – Melhor Idade",
    description:
      "Departamento voltado aos irmãos da melhor idade, promovendo integração, comunhão e cuidado espiritual. O AFINIDADE valoriza a sabedoria e a experiência dos idosos, oferecendo programações edificantes e apoio mútuo.",
    logo: "/AFINIDADE.png",
    order: 10,
  },
  {
    id: "11",
    title: "DECOM – Comunicação",
    description:
      "Responsável por comunicar com excelência tudo o que Deus tem feito na IEADSM. Atua na produção de conteúdo, transmissões ao vivo, artes visuais e redes sociais, sempre com criatividade e compromisso com a verdade.",
    logo: "/DECOM.png",
    order: 11,
  },
];

export const departments: Department[] = [];
