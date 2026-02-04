"use client";

import {
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type RefObject,
} from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  query,
  runTransaction,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { UserPlus } from "lucide-react";
import QRCode from "qrcode";
import { db, storage } from "@/lib/firebase/client";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { useCongregations } from "@/lib/firebase/useCongregations";
import { deleteStorageObject } from "@/lib/firebase/storageUtils";
import {
  buildCarteiraDocument,
  buildCarteiraMarkup,
  buildMemberQrPayload,
  resolvePhotoForCard,
  type PrintMode,
} from "@/lib/members/card";

type ChildInfo = {
  name: string;
  cpf: string;
  observacao: string;
};

const normalizeQtdeFilhos = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.max(0, Math.trunc(value)));
  }
  if (typeof value === "string") return value;
  return "";
};

const parseChildrenCount = (value: string) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return 0;
  return Math.max(0, parsed);
};

const ensureChildrenCount = (children: ChildInfo[], count: number) => {
  if (count <= 0) return [];
  if (children.length === count) return children;
  if (children.length > count) return children.slice(0, count);
  return [
    ...children,
    ...Array.from({ length: count - children.length }, () => ({
      name: "",
      cpf: "",
      observacao: "",
    })),
  ];
};

type CensusFormState = {
  registroTipo: string;
  registroTipoOutro: string;
  idInterno: string;
  cargo: string;
  congregacao: string;
  setor: string;
  name: string;
  email: string;
  telefone: string;
  celular: string;
  cpf: string;
  rg: string;
  tituloEleitor: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  pai: string;
  mae: string;
  cpfPai: string;
  cpfMae: string;
  isOrphan: boolean;
  isOrphanFather: boolean;
  nacionalidade: string;
  profissao: string;
  grauInstrucao: string;
  sexo: string;
  dataNascimento: string;
  naturalidade: string;
  estadoCivil: string;
  dtCasamento: string;
  certidaoCasamento: string;
  qtdeFilhos: string;
  nomeConjuge: string;
  profissaoConjuge: string;
  grauInstrucaoConjuge: string;
  dataNascimentoConjuge: string;
  cpfConjuge: string;
  filhos: ChildInfo[];
  dataConversao: string;
  batizadoEspiritoSanto: boolean;
  dataBatismoEspiritoSanto: string;
  origem: string;
  informacoes: string;
  localBatismo: string;
  dataBatismo: string;
  recebimento: string;
  dataRecebimento: string;
  autorizacao: boolean;
  photo: string;
  usoImagem: boolean;
};

type CensusFormSectionProps = {
  variant?: "section" | "modal";
};

type CensusRecord = Partial<CensusFormState> & {
  cpfNormalized?: string;
};

const createEmptyForm = (): CensusFormState => ({
  registroTipo: "Admissão",
  registroTipoOutro: "",
  idInterno: "",
  cargo: "membro",
  congregacao: "",
  setor: "",
  name: "",
  email: "",
  telefone: "",
  celular: "",
  cpf: "",
  rg: "",
  tituloEleitor: "",
  endereco: "",
  numero: "",
  complemento: "",
  bairro: "",
  cidade: "",
  uf: "",
  cep: "",
  pai: "",
  mae: "",
  cpfPai: "",
  cpfMae: "",
  isOrphan: false,
  isOrphanFather: false,
  nacionalidade: "",
  profissao: "",
  grauInstrucao: "",
  sexo: "",
  dataNascimento: "",
  naturalidade: "",
  estadoCivil: "",
  dtCasamento: "",
  certidaoCasamento: "",
  qtdeFilhos: "",
  nomeConjuge: "",
  profissaoConjuge: "",
  grauInstrucaoConjuge: "",
  dataNascimentoConjuge: "",
  cpfConjuge: "",
  filhos: [],
  dataConversao: "",
  batizadoEspiritoSanto: false,
  dataBatismoEspiritoSanto: "",
  origem: "",
  informacoes: "",
  localBatismo: "",
  dataBatismo: "",
  recebimento: "",
  dataRecebimento: "",
  autorizacao: false,
  photo: "",
  usoImagem: false,
});

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const registroOptions = [
  "Atualização",
  "Batismo",
  "Admissão",
  "Reconciliação",
  "Transferência",
  "Outros",
];

const normalizeCpf = (value: string) => value.replace(/\D/g, "");

const formatCpf = (value: string) => {
  const normalized = normalizeCpf(value);
  if (normalized.length === 0) return "";
  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6) return `${normalized.slice(0, 3)}.${normalized.slice(3)}`;
  if (normalized.length <= 9) return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6)}`;
  return `${normalized.slice(0, 3)}.${normalized.slice(3, 6)}.${normalized.slice(6, 9)}-${normalized.slice(9, 11)}`;
};

const normalizePhone = (value: string) => value.replace(/\D/g, "");

const formatPhone = (value: string) => {
  const digits = normalizePhone(value);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatDate = (value: string) => {
  if (!value) return "";
  // Se vem no formato YYYY-MM-DD (do input date), converte para DD/MM/YYYY
  if (value.includes("-")) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  // Se já está formatado, retorna como está
  return value;
};

const parseDateToISO = (value: string) => {
  // Converte DD/MM/YYYY para YYYY-MM-DD para o input date
  if (!value) return "";
  if (value.includes("-")) return value; // Já está em ISO
  const parts = value.split("/");
  if (parts.length !== 3) return "";
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
};

const sexoOptions = ["Masculino", "Feminino"];

const estadoCivilOptions = [
  "Solteiro(a)",
  "Casado(a)",
  "Divorciado(a)",
  "Viúvo(a)",
  "Outro",
];

const mapRecordToForm = (
  record: CensusRecord,
  fallbackCpf: string
): CensusFormState => {
  const base = createEmptyForm();
  const { cpfNormalized, ...rest } = record;
    const filhos = Array.isArray(rest.filhos)
      ? rest.filhos.map((child) => ({
          name: typeof child?.name === "string" ? child.name : "",
          cpf: typeof child?.cpf === "string" ? child.cpf : "",
          observacao:
            typeof child?.observacao === "string" ? child.observacao : "",
        }))
      : [];
  const qtdeFilhosValue = normalizeQtdeFilhos(rest.qtdeFilhos);
  const filhosNormalized = ensureChildrenCount(
    filhos,
    parseChildrenCount(qtdeFilhosValue)
  );
  const cpfValue =
    (typeof rest.cpf === "string" && rest.cpf.trim()) ||
    (typeof cpfNormalized === "string" && cpfNormalized.trim()) ||
    fallbackCpf;
  const certidaoCasamento =
    typeof rest.certidaoCasamento === "string" ? rest.certidaoCasamento : "";

  const registroTipo =
    typeof rest.registroTipo === "string" && rest.registroTipo.trim()
      ? rest.registroTipo
      : "Atualização";
  const registroTipoOutro =
    typeof rest.registroTipoOutro === "string" ? rest.registroTipoOutro : "";

  return {
    ...base,
    ...rest,
    certidaoCasamento,
    qtdeFilhos: qtdeFilhosValue,
    filhos: filhosNormalized,
    cpf: cpfValue,
    registroTipo,
    registroTipoOutro,
    autorizacao: false,
    idInterno: typeof rest.idInterno === "string" ? rest.idInterno : "",
    sexo:
      typeof rest.sexo === "string" && sexoOptions.includes(rest.sexo)
        ? rest.sexo
        : "",
    isOrphan: Boolean(rest.isOrphan),
    isOrphanFather: Boolean(rest.isOrphanFather),
    batizadoEspiritoSanto: Boolean(rest.batizadoEspiritoSanto),
    usoImagem: Boolean(rest.usoImagem),
  };
};

export default function CensusFormSection({
  variant = "section",
}: CensusFormSectionProps) {
  const { settings } = useSiteSettings();
  const { items: congregations } = useCongregations();
  const [form, setForm] = useState<CensusFormState>(() => createEmptyForm());
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cardNotice, setCardNotice] = useState("");
  const [cardError, setCardError] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const [lastSubmittedMember, setLastSubmittedMember] = useState<
    (CensusFormState & { createdAt?: string }) | null
  >(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const congregacaoRef = useRef<HTMLSelectElement>(null);
  const setorRef = useRef<HTMLSelectElement>(null);
  const registroTipoOutroRef = useRef<HTMLInputElement>(null);
  const paiRef = useRef<HTMLInputElement>(null);
  const maeRef = useRef<HTMLInputElement>(null);
  const autorizacaoRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const certidaoInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadingCertidao, setUploadingCertidao] = useState(false);
  const [certidaoUploadError, setCertidaoUploadError] = useState("");
  const [cpfLookupStatus, setCpfLookupStatus] = useState<
    "idle" | "loading" | "found" | "not-found" | "error"
  >("idle");
  const [cpfLookupError, setCpfLookupError] = useState("");
  const [lastCpfLookup, setLastCpfLookup] = useState("");
  const [cepLookupStatus, setCepLookupStatus] = useState<
    "idle" | "loading" | "found" | "not-found" | "error"
  >("idle");
  const [cepLookupError, setCepLookupError] = useState("");
  const [lastCepLookup, setLastCepLookup] = useState("");
  const [isEditingExisting, setIsEditingExisting] = useState(false);
  const [existingDocId, setExistingDocId] = useState<string | null>(null);
  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS|Android/.test(navigator.userAgent);

  const congregationOptions = useMemo(() => {
    const setorSelecionado = form.setor.trim();
    const filtered = setorSelecionado
      ? congregations.filter((item) => item.sector === setorSelecionado)
      : congregations;
    return [...filtered]
      .map((item) => item.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [congregations, form.setor]);

  const sectorOptions = useMemo(() => {
    return Array.from(
      new Set(congregations.map((item) => item.sector).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [congregations]);

  const congregacaoSelectOptions = useMemo(() => {
    const options = [...congregationOptions];
    const current = form.congregacao.trim();
    if (current && !options.includes(current)) {
      return [current, ...options];
    }
    return options;
  }, [congregationOptions, form.congregacao]);

  const setorSelectOptions = useMemo(() => {
    const options = [...sectorOptions];
    const current = form.setor.trim();
    if (current && !options.includes(current)) {
      return [current, ...options];
    }
    return options;
  }, [sectorOptions, form.setor]);

  const canSubmit =
    form.name.trim().length > 0 &&
    form.congregacao.trim().length > 0 &&
    form.setor.trim().length > 0 &&
    form.autorizacao;

  const isSolteiro = form.estadoCivil === "Solteiro(a)";
  const isCasado = form.estadoCivil === "Casado(a)";
  const qtdeFilhosCount = parseChildrenCount(form.qtdeFilhos);

  const updateChild = (index: number, key: keyof ChildInfo, value: string) => {
    setForm((prev) => ({
      ...prev,
      filhos: prev.filhos.map((child, idx) =>
        idx === index ? { ...child, [key]: value } : child
      ),
    }));
  };

  const uploadPhoto = async (file: File) => {
    if (!storage) {
      setUploadError("Storage não configurado.");
      return;
    }
    setUploading(true);
    setUploadError("");
    const previous = form.photo;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(
        storage,
        `uploads/census/${Date.now()}-${safeName}`
      );
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, photo: url }));
      if (previous && previous !== url) {
        await deleteStorageObject(previous);
      }
    } catch (err) {
      setUploadError("Falha ao enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : undefined;
    if (!file || file.size === 0) {
      setUploading(false);
      setUploadError("");
      event.currentTarget.value = "";
      return;
    }
    void uploadPhoto(file);
    event.currentTarget.value = "";
  };

  const handlePhotoPick = () => {
    photoInputRef.current?.click();
  };

  const uploadCertidaoCasamento = async (file: File) => {
    if (!storage) {
      setCertidaoUploadError("Storage não configurado.");
      return;
    }
    setUploadingCertidao(true);
    setCertidaoUploadError("");
    const previous = form.certidaoCasamento;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(
        storage,
        `uploads/census/certidao-casamento/${Date.now()}-${safeName}`
      );
      await uploadBytes(fileRef, file, { contentType: file.type });
      const url = await getDownloadURL(fileRef);
      setForm((prev) => ({ ...prev, certidaoCasamento: url }));
      if (previous && previous !== url) {
        await deleteStorageObject(previous);
      }
    } catch (err) {
      setCertidaoUploadError("Falha ao enviar a certidão. Tente novamente.");
    } finally {
      setUploadingCertidao(false);
    }
  };

  const handleCertidaoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    const file = files && files.length > 0 ? files[0] : undefined;
    if (!file || file.size === 0) {
      setUploadingCertidao(false);
      setCertidaoUploadError("");
      event.currentTarget.value = "";
      return;
    }
    void uploadCertidaoCasamento(file);
    event.currentTarget.value = "";
  };

  const handleCertidaoPick = () => {
    certidaoInputRef.current?.click();
  };

  const getNextInternalId = async () => {
    if (!db) return "";
    const counterRef = doc(db, "censusCounters", "members");
    const nextId = await runTransaction(db, async (tx) => {
      const snap = await tx.get(counterRef);
      if (!snap.exists()) {
        tx.set(counterRef, { nextId: 2 });
        return 1;
      }
      const data = snap.data() as { nextId?: number };
      const current = Number(data.nextId ?? 1);
      const value = Number.isNaN(current) || current < 1 ? 1 : current;
      tx.set(counterRef, { nextId: value + 1 }, { merge: true });
      return value;
    });
    return String(nextId);
  };

  const handleCpfLookup = async (rawCpf: string) => {
    if (!db) return;
    const normalized = normalizeCpf(rawCpf);
    if (normalized.length !== 11) return;
    if (normalized === lastCpfLookup && cpfLookupStatus !== "error") return;

    setCpfLookupStatus("loading");
    setCpfLookupError("");
    setLastCpfLookup(normalized);

    try {
      const censusRef = collection(db, "censusMembers");
      let snap = await getDocs(
        query(censusRef, where("cpfNormalized", "==", normalized), limit(1))
      );
      if (snap.empty) {
        snap = await getDocs(
          query(censusRef, where("cpf", "==", normalized), limit(1))
        );
      }
      if (snap.empty && rawCpf.trim()) {
        snap = await getDocs(
          query(censusRef, where("cpf", "==", rawCpf.trim()), limit(1))
        );
      }

      if (!snap.empty) {
        const data = snap.docs[0].data() as CensusRecord;
        const docId = snap.docs[0].id;
        // Mescla os dados encontrados com o formulário atual, permitindo edição
        setForm((prev) => {
          const mapped = mapRecordToForm(data, prev.cpf || rawCpf);
          return {
            ...mapped,
            autorizacao: prev.autorizacao, // Mantém o status da autorização LGPD
          };
        });
        setCpfLookupStatus("found");
        setIsEditingExisting(true);
        setExistingDocId(docId);
      } else {
        setCpfLookupStatus("not-found");
        setIsEditingExisting(false);
      }
    } catch (err) {
      setCpfLookupError("Não foi possível buscar este CPF. Tente novamente.");
      setCpfLookupStatus("error");
      setIsEditingExisting(false);
    }
  };

  const handleCpfChange = (value: string) => {
    setForm((prev) => ({ ...prev, cpf: value }));
    setError("");
    setSuccess(false);
    setSubmittedId("");
    setUploadError("");
    setCertidaoUploadError("");

    const normalized = normalizeCpf(value);
    if (normalized !== lastCpfLookup) {
      setCpfLookupStatus("idle");
      setCpfLookupError("");
      setIsEditingExisting(false);
      setExistingDocId(null);
    }

    if (normalized.length === 11 && cpfLookupStatus !== "loading") {
      void handleCpfLookup(value);
    }
  };

  const handleCepLookup = async (rawCep: string) => {
    const normalized = rawCep.replace(/\D/g, "");
    if (normalized.length !== 8) return;
    if (normalized === lastCepLookup && cepLookupStatus !== "error") return;

    setCepLookupStatus("loading");
    setCepLookupError("");
    setLastCepLookup(normalized);

    try {
      const response = await fetch(
        `https://viacep.com.br/ws/${normalized}/json/`
      );
      if (!response.ok) {
        setCepLookupStatus("not-found");
        setCepLookupError("CEP não encontrado.");
        return;
      }

      const data = await response.json();

      if (data.erro) {
        setCepLookupStatus("not-found");
        setCepLookupError("CEP não encontrado.");
        return;
      }

      setForm((prev) => ({
        ...prev,
        bairro: data.bairro || prev.bairro,
        cidade: data.localidade || prev.cidade,
        uf: data.uf || prev.uf,
        endereco: data.logradouro || prev.endereco,
      }));
      setCepLookupStatus("found");
    } catch (err) {
      setCepLookupError("Não foi possível buscar este CEP. Tente novamente.");
      setCepLookupStatus("error");
    }
  };

  const handleCepChange = (value: string) => {
    setForm((prev) => ({ ...prev, cep: value }));
    setError("");
    setSuccess(false);
    setSubmittedId("");
    setUploadError("");
    setCertidaoUploadError("");

    const normalized = value.replace(/\D/g, "");
    if (normalized !== lastCepLookup) {
      setCepLookupStatus("idle");
      setCepLookupError("");
    }

    if (normalized.length === 8 && cepLookupStatus !== "loading") {
      void handleCepLookup(value);
    }
  };

  const focusField = <T extends HTMLElement>(ref: RefObject<T | null>) => {
    const node = ref.current;
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.focus();
  };

  const openMemberCard = async (
    memberForCard: CensusFormState & { createdAt?: string },
    targetWindow?: Window | null
  ) => {
    try {
      const qrPayload = buildMemberQrPayload(memberForCard);
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 240,
        margin: 1,
        errorCorrectionLevel: "L",
      });
      const w = targetWindow && !targetWindow.closed ? targetWindow : window.open("", "_blank");
      if (!w) {
        setCardError(
          "Censo enviado, mas não foi possível abrir a carteirinha. Libere os pop-ups e tente novamente."
        );
        return;
      }
      const photoResolved = await resolvePhotoForCard(memberForCard.photo);
      const memberWithPhoto = photoResolved
        ? { ...memberForCard, photo: photoResolved }
        : memberForCard;
      const sheets = buildCarteiraMarkup(memberWithPhoto, qrDataUrl, settings);
      const mode: PrintMode = isSafari ? "download" : "print";
      const html = buildCarteiraDocument(sheets, {
        mode,
        filename: "carteira-membro",
        pageSelector: ".card-sheet",
      });
      w.document.open();
      w.document.write(html);
      w.document.close();
      setCardNotice(
        "Carteirinha gerada automaticamente. Se não abriu, use o botão Carteirinha no topo."
      );
    } catch (err) {
      setCardError(
        "Censo enviado, mas não foi possível gerar a carteirinha agora."
      );
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess(false);
    setSubmittedId("");
    setUploadError("");
    setCardNotice("");
    setCardError("");
    setLastSubmittedMember(null);

    if (!db) {
      setError("Firebase não configurado.");
      return;
    }

    if (!canSubmit) {
      if (!form.name.trim()) {
        setError("Informe o nome completo.");
        focusField(nameRef);
        return;
      }
      if (!form.congregacao.trim()) {
        setError("Informe a congregação.");
        focusField(congregacaoRef);
        return;
      }
      if (!form.setor.trim()) {
        setError("Informe o setor.");
        focusField(setorRef);
        return;
      }
      if (!form.autorizacao) {
        setError("Aceite a LGPD para enviar o formulário.");
        focusField(autorizacaoRef);
        return;
      }
      setError("Preencha os campos obrigatórios.");
      return;
    }

    if (!form.isOrphan && !form.mae.trim()) {
      setError("Informe o nome da mãe ou marque a opção de órfão.");
      focusField(maeRef);
      return;
    }
    if (!form.isOrphanFather && !form.pai.trim()) {
      setError("Informe o nome do pai ou marque a opção de órfão.");
      focusField(paiRef);
      return;
    }
    if (form.registroTipo === "Outros" && !form.registroTipoOutro.trim()) {
      setError("Informe o tipo de registro em 'Outros'.");
      focusField(registroTipoOutroRef);
      return;
    }

    let popupWindow: Window | null = null;
    try {
      popupWindow = window.open("", "_blank");
      if (popupWindow) {
        popupWindow.document.open();
        popupWindow.document.write(
          "<!doctype html><html><head><meta charset='utf-8' /><title>Carteirinha</title></head><body style='font-family:Arial,sans-serif;padding:24px;'><strong>Gerando carteirinha...</strong><p>Aguarde um instante.</p></body></html>"
        );
        popupWindow.document.close();
      }
    } catch {
      popupWindow = null;
    }

    setSaving(true);
    // Se já tem um ID interno (registro existente), mantém; senão gera novo
    const internalId = form.idInterno.trim() || await getNextInternalId();
    if (!internalId) {
      setSaving(false);
      setError("Não foi possível gerar o ID interno. Tente novamente.");
      return;
    }

    const cleanedChildren = form.filhos
      .map((child) => ({
        name: child.name.trim(),
        cpf: child.cpf.trim(),
        observacao: child.observacao.trim(),
      }))
      .filter((child) => child.name || child.cpf || child.observacao);

    const recordForPrint: CensusFormState = {
      ...form,
      registroTipo: form.registroTipo.trim(),
      registroTipoOutro: form.registroTipoOutro.trim(),
      idInterno: internalId,
      cargo: form.cargo.trim() || "membro",
      congregacao: form.congregacao.trim(),
      setor: form.setor.trim(),
      name: form.name.trim(),
      email: form.email.trim(),
      telefone: form.telefone.trim(),
      celular: form.celular.trim(),
      cpf: form.cpf.trim(),
      rg: form.rg.trim(),
      tituloEleitor: form.tituloEleitor.trim(),
      endereco: form.endereco.trim(),
      numero: form.numero.trim(),
      complemento: form.complemento.trim(),
      bairro: form.bairro.trim(),
      cidade: form.cidade.trim(),
      uf: form.uf.trim(),
      cep: form.cep.trim(),
      pai: form.pai.trim(),
      mae: form.mae.trim(),
      cpfPai: form.cpfPai.trim(),
      cpfMae: form.cpfMae.trim(),
      nacionalidade: form.nacionalidade.trim(),
      profissao: form.profissao.trim(),
      grauInstrucao: form.grauInstrucao.trim(),
      sexo: form.sexo.trim(),
      dataNascimento: form.dataNascimento.trim(),
      naturalidade: form.naturalidade.trim(),
      estadoCivil: form.estadoCivil.trim(),
      dtCasamento: isSolteiro ? "" : form.dtCasamento.trim(),
      certidaoCasamento: isCasado ? form.certidaoCasamento.trim() : "",
      qtdeFilhos: form.qtdeFilhos.trim(),
      nomeConjuge: isSolteiro ? "" : form.nomeConjuge.trim(),
      profissaoConjuge: isSolteiro ? "" : form.profissaoConjuge.trim(),
      grauInstrucaoConjuge: isSolteiro ? "" : form.grauInstrucaoConjuge.trim(),
      dataNascimentoConjuge: isSolteiro
        ? ""
        : form.dataNascimentoConjuge.trim(),
      cpfConjuge: isSolteiro ? "" : form.cpfConjuge.trim(),
      filhos: cleanedChildren,
      dataConversao: form.dataConversao.trim(),
      dataBatismoEspiritoSanto: form.batizadoEspiritoSanto
        ? form.dataBatismoEspiritoSanto.trim()
        : "",
      origem: form.origem.trim(),
      informacoes: form.informacoes.trim(),
      localBatismo: form.localBatismo.trim(),
      dataBatismo: form.dataBatismo.trim(),
      recebimento: form.recebimento.trim(),
      dataRecebimento: form.dataRecebimento.trim(),
      photo: form.photo.trim(),
    };

    const payload = {
      ...recordForPrint,
      cpfNormalized: normalizeCpf(recordForPrint.cpf),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const memberForCard = {
      ...recordForPrint,
      idInterno: internalId,
      createdAt: payload.createdAt,
    };

    try {
      if (existingDocId) {
        // Atualizar documento existente
        await updateDoc(doc(db, "censusMembers", existingDocId), payload);
      } else {
        // Criar novo documento
        await addDoc(collection(db, "censusMembers"), payload);
      }
      setForm(createEmptyForm());
      setCpfLookupStatus("idle");
      setCpfLookupError("");
      setLastCpfLookup("");
      setIsEditingExisting(false);
      setExistingDocId(null);
      setSuccess(true);
      setSubmittedId(internalId);
      setLastSubmittedMember(memberForCard);
      void openMemberCard(memberForCard, popupWindow);
    } catch (err) {
      console.error("Censo submit failed", err);
      setError("Não foi possível enviar o censo. Tente novamente.");
      if (popupWindow && !popupWindow.closed) {
        popupWindow.close();
      }
    } finally {
      setSaving(false);
    }
  };

  const title = settings.censusTitle || "Censo de Membros";
  const description =
    settings.censusDescription ||
    "Preencha o formulário para atualizar seus dados.";
  const isModal = variant === "modal";

  const content = (
    <div
      className={
        isModal
          ? "p-6"
          : "rounded-3xl border border-gray-200 bg-white p-8 shadow-sm"
      }
    >
      {!isModal ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <UserPlus className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
              <p className="mt-1 text-sm text-gray-500">{description}</p>
            </div>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              settings.censusOpen
                ? "bg-emerald-50 text-emerald-700"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {settings.censusOpen ? "Censo aberto" : "Censo fechado"}
          </span>
        </div>
      ) : null}

        {!settings.censusOpen ? (
          <div className="mt-8 rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
            O formulário do censo está fechado no momento. Volte mais tarde.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-8">
            {success ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Formulário enviado com sucesso. Obrigado por contribuir!
                {submittedId ? (
                  <span className="block mt-1 font-semibold">
                    ID interno: {submittedId}
                  </span>
                ) : null}
                {lastSubmittedMember ? (
                  <button
                    type="button"
                    onClick={() => openMemberCard(lastSubmittedMember)}
                    className="mt-3 inline-flex items-center justify-center rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                  >
                    Abrir carteirinha
                  </button>
                ) : null}
              </div>
            ) : null}

            {cardNotice ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                {cardNotice}
              </div>
            ) : null}

            {cardError ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {cardError}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                CPF
              </legend>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  CPF (primeiro passo)
                </label>
                <input
                  type="text"
                  value={formatCpf(form.cpf)}
                  onChange={(event) => handleCpfChange(event.target.value)}
                  onBlur={() => {
                    const normalized = normalizeCpf(form.cpf);
                    if (normalized.length === 11) {
                      void handleCpfLookup(form.cpf);
                    }
                  }}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  placeholder="000.000.000-00"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Digite o CPF para localizar seus dados automaticamente.
                </p>
                {cpfLookupStatus === "loading" ? (
                  <p className="mt-2 text-xs text-gray-500">
                    Buscando CPF...
                  </p>
                ) : null}
                {cpfLookupStatus === "found" ? (
                  <p className="mt-2 text-xs text-emerald-600">
                    Cadastro encontrado! Você pode editar todos os campos.
                  </p>
                ) : null}
                {cpfLookupStatus === "not-found" ? (
                  <p className="mt-2 text-xs text-gray-500">
                    CPF não encontrado. Preencha o formulário normalmente.
                  </p>
                ) : null}
                {cpfLookupStatus === "error" && cpfLookupError ? (
                  <p className="mt-2 text-xs text-red-600">
                    {cpfLookupError}
                  </p>
                ) : null}
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Registro
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de registro
                  </label>
                  <select
                    value={form.registroTipo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        registroTipo: event.target.value,
                        registroTipoOutro:
                          event.target.value === "Outros"
                            ? prev.registroTipoOutro
                            : "",
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none disabled:bg-gray-100"
                  >
                    {registroOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {form.registroTipo === "Outros" ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Outros (especifique)
                    </label>
                    <input
                      ref={registroTipoOutroRef}
                      type="text"
                      value={form.registroTipoOutro}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          registroTipoOutro: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                      placeholder="Descreva o tipo de registro"
                      required
                    />
                  </div>
                ) : null}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ID interno
                  </label>
                  <input
                    type="text"
                    value={form.idInterno}
                    readOnly
                    className="w-full rounded-xl border border-gray-300 bg-gray-100 px-4 py-3 text-sm text-gray-600"
                    placeholder="Gerado automaticamente ao enviar"
                  />
                  <p className="mt-1 text-xs text-gray-400">
                    Gerado automaticamente.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Congregação
                  </label>
                  <select
                    ref={congregacaoRef}
                    value={form.congregacao}
                    onChange={(event) => {
                      const value = event.target.value;
                      const match = congregations.find(
                        (item) => item.name === value
                      );
                      setForm((prev) => ({
                        ...prev,
                        congregacao: value,
                        setor: match?.sector ?? prev.setor,
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none disabled:bg-gray-100"
                    required
                  >
                    <option value="">Selecione</option>
                    {congregacaoSelectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Setor
                  </label>
                  <select
                    ref={setorRef}
                    value={form.setor}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => {
                        if (!value) {
                          return { ...prev, setor: value };
                        }
                        const validCongregation = congregations.some(
                          (item) =>
                            item.sector === value &&
                            item.name === prev.congregacao
                        );
                        return {
                          ...prev,
                          setor: value,
                          congregacao: validCongregation ? prev.congregacao : "",
                        };
                      });
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    required
                  >
                    <option value="">Selecione</option>
                    {setorSelectOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Identificação e contato
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome completo
                  </label>
                  <input
                    ref={nameRef}
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    placeholder="Nome completo"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        email: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    placeholder="nome@email.com"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Telefone
                  </label>
                  <input
                    type="text"
                    value={formatPhone(form.telefone)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        telefone: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    placeholder="(00) 0000-0000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Celular
                  </label>
                  <input
                    type="text"
                    value={formatPhone(form.celular)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        celular: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    placeholder="(00) 00000-0000"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    RG
                  </label>
                  <input
                    type="text"
                    value={form.rg}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, rg: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Título de eleitor
                  </label>
                  <input
                    type="text"
                    value={form.tituloEleitor}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        tituloEleitor: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Endereço
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    type="text"
                    value={form.endereco}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        endereco: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Número
                    </label>
                    <input
                      type="text"
                      value={form.numero}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          numero: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Complemento
                    </label>
                    <input
                      type="text"
                      value={form.complemento}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          complemento: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bairro
                  </label>
                  <input
                    type="text"
                    value={form.bairro}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bairro: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cidade
                  </label>
                  <input
                    type="text"
                    value={form.cidade}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        cidade: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UF
                    </label>
                    <input
                      type="text"
                      value={form.uf}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          uf: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm uppercase focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <input
                      type="text"
                      value={form.cep}
                      onChange={(event) => handleCepChange(event.target.value)}
                      onBlur={() => {
                        const normalized = form.cep.replace(/\D/g, "");
                        if (normalized.length === 8) {
                          void handleCepLookup(form.cep);
                        }
                      }}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                      placeholder="00000-000"
                    />
                    <p className="mt-1 text-xs text-gray-400">
                      Digite o CEP para preencher endereço automaticamente.
                    </p>
                    {cepLookupStatus === "loading" ? (
                      <p className="mt-2 text-xs text-gray-500">
                        Buscando CEP...
                      </p>
                    ) : null}
                    {cepLookupStatus === "found" ? (
                      <p className="mt-2 text-xs text-emerald-600">
                        CEP encontrado. Revise os dados do endereço.
                      </p>
                    ) : null}
                    {cepLookupStatus === "not-found" ? (
                      <p className="mt-2 text-xs text-gray-500">
                        CEP não encontrado. Preencha manualmente.
                      </p>
                    ) : null}
                    {cepLookupStatus === "error" && cepLookupError ? (
                      <p className="mt-2 text-xs text-red-600">
                        {cepLookupError}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Filiação
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome do pai
                  </label>
                  <input
                    ref={paiRef}
                    type="text"
                    value={form.pai}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, pai: event.target.value }))
                    }
                    disabled={form.isOrphanFather}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF do pai
                  </label>
                  <input
                    type="text"
                    value={formatCpf(form.cpfPai)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        cpfPai: event.target.value,
                      }))
                    }
                    disabled={form.isOrphanFather}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nome da mãe
                  </label>
                  <input
                    ref={maeRef}
                    type="text"
                    value={form.mae}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, mae: event.target.value }))
                    }
                    disabled={form.isOrphan}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none disabled:bg-gray-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CPF da mãe
                  </label>
                  <input
                    type="text"
                    value={formatCpf(form.cpfMae)}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        cpfMae: event.target.value,
                      }))
                    }
                    disabled={form.isOrphan}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.isOrphanFather}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isOrphanFather: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Não possui pai registrado (órfão)
                </label>
                <label className="flex items-center gap-3 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.isOrphan}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        isOrphan: event.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Não possui mãe registrada (órfão)
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Dados pessoais
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nacionalidade
                  </label>
                  <input
                    type="text"
                    value={form.nacionalidade}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        nacionalidade: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Profissão
                  </label>
                  <input
                    type="text"
                    value={form.profissao}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        profissao: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Grau de instrução
                  </label>
                  <input
                    type="text"
                    value={form.grauInstrucao}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        grauInstrucao: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sexo
                  </label>
                  <select
                    value={form.sexo}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, sexo: event.target.value }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  >
                    <option value="">Selecione</option>
                    {sexoOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de nascimento
                  </label>
                  <input
                    type="date"
                    value={form.dataNascimento}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dataNascimento: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                  {form.dataNascimento ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(form.dataNascimento)}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Naturalidade
                  </label>
                  <input
                    type="text"
                    value={form.naturalidade}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        naturalidade: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Estado civil e família
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Estado civil
                  </label>
                  <select
                    value={form.estadoCivil}
                    onChange={(event) => {
                      const value = event.target.value;
                      setForm((prev) => ({
                        ...prev,
                        estadoCivil: value,
                        ...(value === "Solteiro(a)"
                          ? {
                              dtCasamento: "",
                              nomeConjuge: "",
                              cpfConjuge: "",
                              profissaoConjuge: "",
                              grauInstrucaoConjuge: "",
                              dataNascimentoConjuge: "",
                            }
                          : {}),
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  >
                    <option value="">Selecione</option>
                    {estadoCivilOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                {!isSolteiro ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data do casamento
                    </label>
                    <input
                      type="date"
                      value={form.dtCasamento}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          dtCasamento: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                    {form.dtCasamento ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(form.dtCasamento)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {isCasado ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">
                        Certidão de casamento
                      </p>
                      <p className="text-xs text-gray-500">
                        Envie uma foto ou PDF da certidão de casamento.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="censo-certidao-upload"
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={handleCertidaoChange}
                        ref={certidaoInputRef}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={handleCertidaoPick}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Enviar certidão
                      </button>
                      {form.certidaoCasamento ? (
                        <>
                          <a
                            href={form.certidaoCasamento}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
                          >
                            Ver certidão
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              void deleteStorageObject(form.certidaoCasamento);
                              setForm((prev) => ({
                                ...prev,
                                certidaoCasamento: "",
                              }));
                            }}
                            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                          >
                            Remover
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  {uploadingCertidao ? (
                    <span className="mt-2 block text-xs text-gray-500">
                      Enviando certidão...
                    </span>
                  ) : null}
                  {certidaoUploadError ? (
                    <span className="mt-2 block text-xs text-red-600">
                      {certidaoUploadError}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quantidade de filhos
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.qtdeFilhos}
                    onChange={(event) => {
                      const value = event.target.value;
                      const count = parseChildrenCount(value);
                      setForm((prev) => ({
                        ...prev,
                        qtdeFilhos: value,
                        filhos: ensureChildrenCount(prev.filhos, count),
                      }));
                    }}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                {!isSolteiro ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nome do cônjuge
                      </label>
                      <input
                        type="text"
                        value={form.nomeConjuge}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            nomeConjuge: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        CPF do cônjuge
                      </label>
                      <input
                        type="text"
                        value={formatCpf(form.cpfConjuge)}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            cpfConjuge: event.target.value,
                          }))
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                      />
                    </div>
                  </>
                ) : null}
              </div>

              {!isSolteiro ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Profissão do cônjuge
                    </label>
                    <input
                      type="text"
                      value={form.profissaoConjuge}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          profissaoConjuge: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grau de instrução (cônjuge)
                    </label>
                    <input
                      type="text"
                      value={form.grauInstrucaoConjuge}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          grauInstrucaoConjuge: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nascimento do cônjuge
                    </label>
                    <input
                      type="date"
                      value={form.dataNascimentoConjuge}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          dataNascimentoConjuge: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                    {form.dataNascimentoConjuge ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(form.dataNascimentoConjuge)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Filhos
              </legend>
              {qtdeFilhosCount === 0 ? (
                <p className="text-sm text-gray-400">
                  Nenhum filho adicionado ainda.
                </p>
              ) : (
                <div className="space-y-3">
                  {form.filhos.map((child, index) => (
                    <div
                      key={`child-${index}`}
                      className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_1fr]"
                    >
                      <input
                        type="text"
                        value={child.name}
                        onChange={(event) =>
                          updateChild(index, "name", event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                        placeholder={`Nome do filho ${index + 1}`}
                      />
                      <input
                        type="text"
                        value={formatCpf(child.cpf)}
                        onChange={(event) =>
                          updateChild(index, "cpf", event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                        placeholder="CPF"
                      />
                      <input
                        type="text"
                        value={child.observacao}
                        onChange={(event) =>
                          updateChild(index, "observacao", event.target.value)
                        }
                        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                        placeholder="Observação"
                      />
                    </div>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Igreja
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data de conversão
                  </label>
                  <input
                    type="date"
                    value={form.dataConversao}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dataConversao: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                  {form.dataConversao ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(form.dataConversao)}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 pt-8">
                  <input
                    type="checkbox"
                    checked={form.batizadoEspiritoSanto}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        batizadoEspiritoSanto: checked,
                        dataBatismoEspiritoSanto: checked
                          ? prev.dataBatismoEspiritoSanto
                          : "",
                      }));
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">
                    Batizado no Espírito Santo
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Origem (Igreja de conversão)
                </label>
                  <input
                    type="text"
                    value={form.origem}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        origem: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                {form.batizadoEspiritoSanto ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Data do batismo no Espírito Santo
                    </label>
                    <input
                      type="date"
                      value={form.dataBatismoEspiritoSanto}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          dataBatismoEspiritoSanto: event.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                    />
                    {form.dataBatismoEspiritoSanto ? (
                      <p className="mt-1 text-xs text-gray-500">
                        {formatDate(form.dataBatismoEspiritoSanto)}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Informações adicionais
                </label>
                <textarea
                  value={form.informacoes}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      informacoes: event.target.value,
                    }))
                  }
                  rows={4}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                />
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Batismo e recebimento
              </legend>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Local do batismo
                  </label>
                  <input
                    type="text"
                    value={form.localBatismo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        localBatismo: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do batismo
                  </label>
                  <input
                    type="date"
                    value={form.dataBatismo}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dataBatismo: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                  {form.dataBatismo ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(form.dataBatismo)}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recebimento
                  </label>
                  <input
                    type="text"
                    value={form.recebimento}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        recebimento: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data do recebimento
                  </label>
                  <input
                    type="date"
                    value={form.dataRecebimento}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        dataRecebimento: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none"
                  />
                  {form.dataRecebimento ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(form.dataRecebimento)}
                    </p>
                  ) : null}
                </div>
              </div>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                LGPD
              </legend>
              <label className="flex items-center gap-3 text-sm text-gray-600">
                <input
                  ref={autorizacaoRef}
                  type="checkbox"
                  checked={form.autorizacao}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      autorizacao: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  required
                />
                Autorizo o uso dos dados conforme a LGPD.
              </label>
            </fieldset>

            <fieldset className="space-y-4">
              <legend className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                Foto e uso de imagem
              </legend>

              <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    <img
                      src={safePhoto(form.photo) || "/logo.png"}
                      alt="Foto do membro"
                      className={`h-full w-full object-cover ${
                        form.photo ? "" : "opacity-30 grayscale"
                      }`}
                    />
                    {!form.photo ? (
                      <div className="absolute inset-0 flex items-center justify-center text-[11px] font-semibold text-gray-500">
                        Sem foto
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 space-y-2">
                    <p className="text-sm font-semibold text-gray-700">
                      Enviar foto
                    </p>
                    <p className="text-xs text-gray-500">
                      Clique no botão abaixo para selecionar uma imagem do seu
                      celular/computador.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        id="censo-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        ref={photoInputRef}
                        className="sr-only"
                      />
                      <button
                        type="button"
                        onClick={handlePhotoPick}
                        className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                      >
                        Escolher foto
                      </button>
                      {form.photo ? (
                        <button
                          type="button"
                          onClick={() => {
                            void deleteStorageObject(form.photo);
                            setForm((prev) => ({ ...prev, photo: "" }));
                          }}
                          className="text-xs font-semibold text-gray-500 hover:text-gray-700"
                        >
                          Remover foto
                        </button>
                      ) : null}
                    </div>
                    {uploading ? (
                      <span className="text-xs text-gray-500">
                        Enviando foto...
                      </span>
                    ) : null}
                    {uploadError ? (
                      <span className="text-xs text-red-600">{uploadError}</span>
                    ) : null}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={form.usoImagem}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      usoImagem: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                Autorizo o uso da minha imagem.
              </label>
            </fieldset>

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={saving}
                aria-disabled={!canSubmit}
                className={`rounded-xl px-6 py-3 text-sm font-semibold text-white transition ${
                  saving
                    ? "bg-indigo-400"
                    : !canSubmit
                    ? "bg-indigo-500/80 hover:bg-indigo-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } disabled:cursor-not-allowed`}
              >
                {saving ? "Enviando..." : "Enviar censo"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setForm(createEmptyForm());
                  setError("");
                  setSuccess(false);
                }}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Limpar formulário
              </button>
            </div>
          </form>
        )}
    </div>
  );

  return isModal ? (
    content
  ) : (
    <section className="mx-auto max-w-5xl px-4 pb-16" id="censo">
      {content}
    </section>
  );
}
