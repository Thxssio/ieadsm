export type LinkItem = {
  id?: string;
  text: string;
  href: string;
  icon?: string;
  order?: number;
};

export const seedLinks: LinkItem[] = [
  {
    href:
      "https://docs.google.com/forms/d/e/1FAIpQLScCHwOTL_K86fHSjVT_JIUFOGmZbNXb5wSEuTYkYjffGxAhjQ/viewform?usp=publish-editor",
    icon: "/logo.png",
    order: 20,
    text:
      "PROJETO VIDA | Ficha de Inscrição - Recepção e acolhimento de pessoas com deficiência e neurodivergentes",
  },
  {
    href: "https://forms.gle/m2jV3H8FhdbQJp9s8",
    icon: "/logo.png",
    order: 30,
    text: "RETIRO UMADESMA | 2026",
  },
  {
    href: "https://instagram.com/adsantamariars",
    icon: "/logo.png",
    order: 40,
    text: "Instagram",
  },
  {
    href: "https://www.facebook.com/adsantamariars",
    icon: "/logo.png",
    order: 50,
    text: "FACEBOOK",
  },
  {
    href:
      "https://drive.google.com/file/d/18WbNAhRhsnDyNyoLkY2-a8J0mmSafOk8/view?usp=drivesdk",
    icon: "/logo.png",
    order: 60,
    text: "AGENDA IEADSM | 2025",
  },
  {
    href:
      "https://api.whatsapp.com/send/?phone=555532215863&text&type=phone_number&app_absent=0",
    icon: "/logo.png",
    order: 70,
    text: "IEADSM | WHATSAPP",
  },
  {
    href:
      "https://www.google.com/maps/d/u/0/viewer?mid=1flrE81F-sZrBQPlVQa1FiWtzpOVutAY&ll=-29.65151510951133%2C-53.613207349999996&z=11",
    icon: "/logo.png",
    order: 80,
    text: "IEADSM | NOSSAS CONGREGAÇÕES",
  },
  {
    href:
      "https://drive.google.com/file/d/1kGKtlT77wOiJgGUkA_vWJxReO19Y2vyt/view",
    icon: "/logo.png",
    order: 90,
    text: "PIX",
  },
  {
    href:
      "https://docs.google.com/forms/d/e/1FAIpQLSey9kT-3adzUVa8ZAjbnX-Ryft4BWKyadDUuLZ2tiBzIRojxg/viewform",
    icon: "/logo.png",
    order: 100,
    text: "Ficha de inscrição - Escola de Música Floravante Bastos - ADSM",
  },
  {
    href: "https://maps.app.goo.gl/1GKHSjZbSKYQu4fp6?g_st=ipc",
    icon: "/logo.png",
    order: 110,
    text: "ENDEREÇO DO TEMPLO MATRIZ DA IEADSM",
  },
  {
    href: "https://cgadb.org.br/",
    icon: "/logo.png",
    order: 120,
    text: "SITE CGADB",
  },
  {
    href: "https://ciepadergs.com.br/",
    icon: "/logo.png",
    order: 130,
    text: "SITE CIEPADERGS",
  },
];

export const defaultLinks: LinkItem[] = [];
