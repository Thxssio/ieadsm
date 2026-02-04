"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  Users,
  Search,
  Filter,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Printer,
  Download,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Camera,
  QrCode,
} from "lucide-react";
import QRCode from "qrcode";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { db, storage } from "@/lib/firebase/client";
import { deleteStorageObject } from "@/lib/firebase/storageUtils";
import {
  buildCarteiraDocument,
  buildCarteiraMarkup,
  buildMemberQrPayload,
  resolveCarteiraTitle,
  resolvePhotoForCard,
  type PrintMode,
} from "@/lib/members/card";
import { buildFichaMarkup, buildPrintDocument } from "@/lib/members/ficha";
import { AdminHeader } from "@/components/admin/AdminHeader";

// --- Types ---
type ChildInfo = {
  name: string;
  cpf: string;
  observacao?: string;
};

type CensusMember = {
  id: string;
  registroTipo?: string;
  registroTipoOutro?: string;
  idInterno?: string;
  cargo?: string;
  congregacao?: string;
  setor?: string;
  name?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  cpf?: string;
  rg?: string;
  tituloEleitor?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
  cep?: string;
  pai?: string;
  mae?: string;
  cpfPai?: string;
  cpfMae?: string;
  isOrphan?: boolean;
  isOrphanFather?: boolean;
  nacionalidade?: string;
  profissao?: string;
  grauInstrucao?: string;
  sexo?: string;
  dataNascimento?: string;
  naturalidade?: string;
  estadoCivil?: string;
  dtCasamento?: string;
  certidaoCasamento?: string;
  qtdeFilhos?: string;
  nomeConjuge?: string;
  profissaoConjuge?: string;
  grauInstrucaoConjuge?: string;
  dataNascimentoConjuge?: string;
  cpfConjuge?: string;
  filhos?: ChildInfo[];
  dataConversao?: string;
  batizadoEspiritoSanto?: boolean;
  dataBatismoEspiritoSanto?: string;
  origem?: string;
  informacoes?: string;
  localBatismo?: string;
  dataBatismo?: string;
  recebimento?: string;
  dataRecebimento?: string;
  autorizacao?: boolean;
  photo?: string;
  usoImagem?: boolean;
  createdAt?: string;
};

// --- Helper Functions ---
const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const isSolteiroEstadoCivil = (value?: string) =>
  value?.trim().toLowerCase().startsWith("solteir") ?? false;

const isCasadoEstadoCivil = (value?: string) =>
  value?.trim().toLowerCase().startsWith("casad") ?? false;

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
};

const formatBool = (value?: boolean) => (value ? "Sim" : "Não");

const isNonEmpty = (value?: string): value is string => Boolean(value);

const formatRegistro = (value?: string, other?: string) => {
  if (value === "Outros" && other) return `Outros - ${other}`;
  return value || "Registro";
};

const normalizeCpf = (value?: string) => (value ?? "").replace(/\D/g, "");

const formatCpf = (value?: string) => {
  const normalized = normalizeCpf(value);
  if (normalized.length === 0) return "";
  if (normalized.length <= 3) return normalized;
  if (normalized.length <= 6)
    return `${normalized.slice(0, 3)}.${normalized.slice(3)}`;
  if (normalized.length <= 9)
    return `${normalized.slice(0, 3)}.${normalized.slice(
      3,
      6
    )}.${normalized.slice(6)}`;
  return `${normalized.slice(0, 3)}.${normalized.slice(
    3,
    6
  )}.${normalized.slice(6, 9)}-${normalized.slice(9, 11)}`;
};

const normalizePhone = (value?: string) => (value ?? "").replace(/\D/g, "");

const formatPhone = (value?: string) => {
  let digits = normalizePhone(value);
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 8) {
    return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  }
  if (digits.length === 9) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const cargoOptions = [
  { value: "membro", label: "Membro" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "diacono", label: "Diácono" },
  { value: "presbitero", label: "Presbítero" },
  { value: "evangelista", label: "Evangelista" },
  { value: "pastor", label: "Pastor" },
  { value: "pastor-presidente", label: "Pastor Presidente" },
];

const resolveCargoValue = (value?: string) => {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "membro";
  const byValue = cargoOptions.find((option) => option.value === raw);
  if (byValue) return byValue.value;
  const byLabel = cargoOptions.find(
    (option) => option.label.toLowerCase() === raw
  );
  return byLabel?.value ?? "membro";
};

const formatCargo = (value?: string) => {
  const resolved = resolveCargoValue(value);
  const found = cargoOptions.find((option) => option.value === resolved);
  return found?.label ?? "Membro";
};

const parseMemberQrPayload = (raw: string) => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && "data" in parsed) {
      const data = (parsed as { data?: Record<string, string> }).data;
      if (data && typeof data === "object") return data;
    }
  } catch {
    // ignore
  }
  return null;
};

// --- Components Auxiliares ---

const LoadingSkeleton = () => (
  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
    {[1, 2, 3, 4].map((i) => (
      <div
        key={i}
        className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex gap-3 w-full">
            <div className="h-12 w-12 bg-slate-200 rounded-full shrink-0"></div>
            <div className="space-y-2 w-full">
              <div className="h-5 w-1/2 bg-slate-200 rounded"></div>
              <div className="h-4 w-1/3 bg-slate-200 rounded"></div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="h-32 bg-slate-200 rounded-xl"></div>
          <div className="h-32 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    ))}
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center transition-all hover:bg-slate-50">
    <div className="mb-4 rounded-full bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <Search className="h-8 w-8 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900">Nenhum resultado</h3>
    <p className="text-sm text-slate-500 max-w-xs mx-auto mt-1">{message}</p>
  </div>
);

export default function SecretariaPage() {
  const router = useRouter();
  const { isAuthenticated, isReady, user } = useAuth();
  const { pushToast } = useToast();
  const { settings } = useSiteSettings();

  const [items, setItems] = useState<CensusMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCongregation, setFilterCongregation] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterRegistro, setFilterRegistro] = useState("");
  const [filterCargo, setFilterCargo] = useState("");
  const [docFilter, setDocFilter] = useState<
    "all" | "no-photo" | "no-certidao" | "casados-sem-certidao"
  >("all");
  const [activeView, setActiveView] = useState<"documents" | "members">(
    "members"
  );
  const [activeMember, setActiveMember] = useState<CensusMember | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 6;
  const [cargoSaving, setCargoSaving] = useState<Record<string, boolean>>({});
  const [toggling, setToggling] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);

  // Upload States
  const [photoUploading, setPhotoUploading] = useState<Record<string, boolean>>({});
  const [photoUploadError, setPhotoUploadError] = useState<Record<string, string>>({});
  const [certidaoUploading, setCertidaoUploading] = useState<Record<string, boolean>>({});
  const [certidaoUploadError, setCertidaoUploadError] = useState<Record<string, string>>({});
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const jsQrRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isSafari =
    typeof navigator !== "undefined" &&
    /Safari/.test(navigator.userAgent) &&
    !/Chrome|Chromium|Edg|OPR|CriOS|FxiOS|Android/.test(navigator.userAgent);
  const isSafariMobile = (() => {
    if (!isSafari || typeof navigator === "undefined") return false;
    const ua = navigator.userAgent;
    const isIOS = /Mobile|iP(ad|hone|od)/.test(ua);
    const isIPadDesktop =
      navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
    return isIOS || isIPadDesktop;
  })();

  // --- Auth & Data Fetching ---
  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/?login=1");
    }
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "censusMembers"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((docSnap) => ({
            id: docSnap.id,
            ...(docSnap.data() as Omit<CensusMember, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!scannerOpen) {
      if (scanFrameRef.current) {
        cancelAnimationFrame(scanFrameRef.current);
        scanFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      detectorRef.current = null;
      jsQrRef.current = null;
      canvasRef.current = null;
      setScannerLoading(false);
      return;
    }

    const startScanner = async () => {
      setScannerError("");
      setScannerLoading(true);
      if (!navigator?.mediaDevices?.getUserMedia) {
        setScannerError("Não foi possível acessar a câmera neste navegador.");
        setScannerLoading(false);
        return;
      }

      const Detector =
        typeof window !== "undefined" ? (window as any).BarcodeDetector : null;
      const useBarcodeDetector = Boolean(Detector);

      if (!useBarcodeDetector) {
        try {
          const mod = await import("jsqr");
          jsQrRef.current = mod.default || mod;
        } catch {
          setScannerError("Não foi possível carregar o leitor de QR Code.");
          setScannerLoading(false);
          return;
        }
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        if (useBarcodeDetector) {
          detectorRef.current = new Detector({ formats: ["qr_code"] });
        }
      } catch (error) {
        setScannerError(
          error instanceof Error
            ? error.message
            : "Não foi possível acessar a câmera."
        );
        setScannerLoading(false);
        return;
      }

      const scanLoop = async () => {
        if (!videoRef.current) return;
        try {
          if (videoRef.current.readyState < 2) {
            scanFrameRef.current = requestAnimationFrame(scanLoop);
            return;
          }

          let raw = "";

          if (useBarcodeDetector && detectorRef.current) {
            const codes = await detectorRef.current.detect(videoRef.current);
            if (codes && codes.length > 0) {
              raw = codes[0]?.rawValue || codes[0]?.value || "";
            }
          } else if (jsQrRef.current) {
            const canvas = canvasRef.current ?? document.createElement("canvas");
            canvasRef.current = canvas;
            const width = videoRef.current.videoWidth;
            const height = videoRef.current.videoHeight;
            if (width && height) {
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const result = jsQrRef.current(imageData.data, width, height, {
                  inversionAttempts: "attemptBoth",
                });
                raw = result?.data || "";
              }
            }
          }

          if (raw) {
            const trimmed = raw.trim();
            const data = parseMemberQrPayload(trimmed);
            const id = data?.id?.trim();
            const cpf = normalizeCpf(data?.cpf);
            const nome = data?.nome?.trim().toLowerCase();

            const match = items.find((item) => {
              if (id && (item.idInterno?.trim() === id || item.id === id)) {
                return true;
              }
              if (cpf && normalizeCpf(item.cpf) === cpf) {
                return true;
              }
              if (nome && item.name?.trim().toLowerCase() === nome) {
                return true;
              }
              if (!data && trimmed) {
                return (
                  item.id === trimmed ||
                  item.idInterno?.trim() === trimmed ||
                  normalizeCpf(item.cpf) === normalizeCpf(trimmed)
                );
              }
              return false;
            });

            if (match) {
              setActiveMember(match);
              pushToast({
                type: "success",
                title: "Membro identificado",
                description: match.name || "Cadastro encontrado.",
              });
            } else {
              const fallbackSearch = id || data?.cpf || data?.nome || trimmed;
              if (fallbackSearch) {
                setSearch(fallbackSearch);
              }
              pushToast({
                type: "info",
                title: "QR Code lido",
                description: data?.nome
                  ? `Membro: ${data.nome}`
                  : "Aplicamos a busca na lista.",
              });
            }

            setScannerOpen(false);
            return;
          }
        } catch {
          // ignore
        }
        scanFrameRef.current = requestAnimationFrame(scanLoop);
      };

      setScannerLoading(false);
      scanFrameRef.current = requestAnimationFrame(scanLoop);
    };

    void startScanner();
  }, [scannerOpen, items, pushToast]);

  // --- Logic ---
  const matchesSearch = (item: CensusMember, term: string) => {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return true;
    const termCpf = normalized.replace(/\D/g, "");
    const hay = [
      item.name,
      item.cpf,
      item.email,
      item.celular,
      item.congregacao,
      item.setor,
      item.idInterno,
      item.registroTipo,
      item.registroTipoOutro,
      item.cargo,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    const hayCpf = (item.cpf || "").replace(/\D/g, "");
    if (!hay.includes(normalized)) {
      if (termCpf && hayCpf.includes(termCpf)) return true;
      return false;
    }
    return true;
  };

  const docStats = useMemo(() => {
    const semFoto = items.filter((item) => !item.photo).length;
    const semCertidao = items.filter(
      (item) =>
        !isSolteiroEstadoCivil(item.estadoCivil) && !item.certidaoCasamento
    ).length;
    const pendentes = items.filter(
      (item) =>
        !item.photo ||
        (!isSolteiroEstadoCivil(item.estadoCivil) && !item.certidaoCasamento)
    ).length;
    const casadosSemCertidao = items.filter(
      (item) =>
        isCasadoEstadoCivil(item.estadoCivil) && !item.certidaoCasamento
    ).length;
    return {
      total: items.length,
      pendentes,
      semFoto,
      semCertidao,
      casadosSemCertidao,
    };
  }, [items]);

  const congregationOptions = useMemo(() => {
    const filtered = filterSector
      ? items.filter((item) => item.setor === filterSector)
      : items;
    return Array.from(
      new Set(filtered.map((item) => item.congregacao).filter(isNonEmpty))
    ).sort((a, b) => a.localeCompare(b));
  }, [items, filterSector]);

  const sectorOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.setor).filter(isNonEmpty))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const registroOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.registroTipo).filter(isNonEmpty))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const cargoFilterOptions = useMemo(() => {
    const values = new Set(
      items.map((item) => resolveCargoValue(item.cargo)).filter(isNonEmpty)
    );
    values.add("membro");
    return cargoOptions.filter((option) => values.has(option.value));
  }, [items]);

  useEffect(() => {
    if (!filterSector || !filterCongregation) return;
    const valid = items.some(
      (item) =>
        item.setor === filterSector && item.congregacao === filterCongregation
    );
    if (!valid) {
      setFilterCongregation("");
    }
  }, [filterSector, filterCongregation, items]);

  const searchFilteredItems = useMemo(
    () =>
      items.filter((item) => {
        if (filterCongregation && item.congregacao !== filterCongregation) {
          return false;
        }
        if (filterSector && item.setor !== filterSector) {
          return false;
        }
        if (filterRegistro && item.registroTipo !== filterRegistro) {
          return false;
        }
        if (filterCargo) {
          const cargo = resolveCargoValue(item.cargo);
          if (cargo !== filterCargo) return false;
        }
        if (!matchesSearch(item, search)) return false;
        return true;
      }),
    [items, filterCongregation, filterSector, filterRegistro, filterCargo, search]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (docFilter === "no-photo" && item.photo) return false;
      if (docFilter === "no-certidao") {
        if (isSolteiroEstadoCivil(item.estadoCivil)) return false;
        if (item.certidaoCasamento) return false;
      }
      if (docFilter === "casados-sem-certidao") {
        if (!isCasadoEstadoCivil(item.estadoCivil)) return false;
        if (item.certidaoCasamento) return false;
      }
      if (!matchesSearch(item, search)) return false;
      return true;
    });
  }, [items, docFilter, search]);

  const viewItems = useMemo(
    () => (activeView === "documents" ? filteredItems : searchFilteredItems),
    [activeView, filteredItems, searchFilteredItems]
  );

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(viewItems.length / pageSize)),
    [viewItems.length, pageSize]
  );

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return viewItems.slice(start, start + pageSize);
  }, [viewItems, page, pageSize]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  useEffect(() => {
    setPage(1);
  }, [
    search,
    docFilter,
    activeView,
    filterCongregation,
    filterSector,
    filterRegistro,
    filterCargo,
  ]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((i) => i.id === id)));
  }, [items]);

  const updateMemberState = (memberId: string, patch: Partial<CensusMember>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === memberId ? { ...item, ...patch } : item))
    );
    setActiveMember((prev) =>
      prev && prev.id === memberId ? { ...prev, ...patch } : prev
    );
  };

  const updateMemberCargo = async (member: CensusMember, nextCargo: string) => {
    if (!db) return;
    const value = resolveCargoValue(nextCargo);
    setCargoSaving((prev) => ({ ...prev, [member.id]: true }));
    try {
      await updateDoc(doc(db, "censusMembers", member.id), {
        cargo: value,
        updatedAt: new Date().toISOString(),
      });
      updateMemberState(member.id, { cargo: value });
      pushToast({ type: "success", title: "Cargo atualizado" });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Falha ao atualizar cargo",
        description: "Tente novamente.",
      });
    } finally {
      setCargoSaving((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  const toggleSelection = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (!searchFilteredItems.length) return;
    setSelectedIds(searchFilteredItems.map((item) => item.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // --- Handlers (Photo) ---
  const uploadMemberPhoto = async (member: CensusMember, file: File) => {
    if (!db || !storage) return;
    setPhotoUploading((prev) => ({ ...prev, [member.id]: true }));
    setPhotoUploadError((prev) => ({ ...prev, [member.id]: "" }));
    const previous = member.photo;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(storage, `uploads/census/photos/${member.id || Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "censusMembers", member.id), { photo: url, updatedAt: new Date().toISOString() });
      updateMemberState(member.id, { photo: url });
      if (previous && previous !== url) await deleteStorageObject(previous);
      pushToast({ type: "success", title: "Foto atualizada" });
    } catch (err) {
      setPhotoUploadError((prev) => ({ ...prev, [member.id]: "Erro ao enviar." }));
      pushToast({ type: "error", title: "Falha ao enviar foto", description: "Tente novamente." });
    } finally {
      setPhotoUploading((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  const removeMemberPhoto = async (member: CensusMember) => {
    if (!db || !member.photo) return;
    try {
      await updateDoc(doc(db, "censusMembers", member.id), { photo: "", updatedAt: new Date().toISOString() });
      updateMemberState(member.id, { photo: "" });
      await deleteStorageObject(member.photo);
      pushToast({ type: "success", title: "Foto removida" });
    } catch (err) {
      pushToast({ type: "error", title: "Erro ao remover" });
    }
  };

  // --- Handlers (Certidao) ---
  const uploadMemberCertidao = async (member: CensusMember, file: File) => {
    if (!db || !storage) return;
    setCertidaoUploading((prev) => ({ ...prev, [member.id]: true }));
    setCertidaoUploadError((prev) => ({ ...prev, [member.id]: "" }));
    const previous = member.certidaoCasamento;
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const fileRef = ref(storage, `uploads/census/certidao-casamento/${member.id || Date.now()}-${safeName}`);
      await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
      const url = await getDownloadURL(fileRef);
      await updateDoc(doc(db, "censusMembers", member.id), { certidaoCasamento: url, updatedAt: new Date().toISOString() });
      updateMemberState(member.id, { certidaoCasamento: url });
      if (previous && previous !== url) await deleteStorageObject(previous);
      pushToast({ type: "success", title: "Certidão atualizada" });
    } catch (err) {
      setCertidaoUploadError((prev) => ({ ...prev, [member.id]: "Erro ao enviar." }));
      pushToast({ type: "error", title: "Falha ao enviar documento", description: "Tente novamente." });
    } finally {
      setCertidaoUploading((prev) => ({ ...prev, [member.id]: false }));
    }
  };

  const removeMemberCertidao = async (member: CensusMember) => {
    if (!db || !member.certidaoCasamento) return;
    try {
      await updateDoc(doc(db, "censusMembers", member.id), { certidaoCasamento: "", updatedAt: new Date().toISOString() });
      updateMemberState(member.id, { certidaoCasamento: "" });
      await deleteStorageObject(member.certidaoCasamento);
      pushToast({ type: "success", title: "Certidão removida" });
    } catch (err) {
      pushToast({ type: "error", title: "Erro ao remover" });
    }
  };

  // --- UI Helpers ---
  const openFilePicker = (inputId: string) => {
    const el = document.getElementById(inputId);
    if (el) el.click();
  };

  const handleFileChange =
    (member: CensusMember, type: "photo" | "certidao") =>
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        event.currentTarget.value = "";
        return;
      }
      if (type === "photo") uploadMemberPhoto(member, file);
      else uploadMemberCertidao(member, file);
      event.currentTarget.value = "";
    };

  const handlePrintFichas = (members: CensusMember[]) => {
    if (!members.length) {
      pushToast({
        type: "info",
        title: "Nenhum membro selecionado",
        description: "Selecione pelo menos um cadastro para exportar.",
      });
      return;
    }

    const w = window.open("", "_blank");
    if (!w) return;

    const pages = members
      .map((member) => buildFichaMarkup(member, settings.censusTitle))
      .join("");
    const meta = {
      loginLabel: user?.email || user?.displayName || "Não identificado",
      generatedAt: new Date().toLocaleString("pt-BR"),
    };
    const mode: PrintMode = isSafari ? "download" : "print";
    const html = buildPrintDocument(pages, meta, {
      mode,
      filename: "fichas-cadastro",
      pageSelector: ".page",
    });

    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handleToggleCensus = async () => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível atualizar o status do censo.",
      });
      return;
    }
    setToggling(true);
    try {
      await setDoc(
        doc(db, "settings", "site"),
        { censusOpen: !settings.censusOpen },
        { merge: true }
      );
      pushToast({
        type: "success",
        title: settings.censusOpen ? "Censo fechado" : "Censo aberto",
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Falha ao atualizar",
        description: "Não foi possível atualizar o status do censo.",
      });
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir o cadastro.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir este cadastro?");
    if (!ok) return;
    try {
      const target = items.find((item) => item.id === itemId);
      await deleteDoc(doc(db, "censusMembers", itemId));
      if (target?.photo) await deleteStorageObject(target.photo);
      if (target?.certidaoCasamento) {
        await deleteStorageObject(target.certidaoCasamento);
      }
      setActiveMember((prev) => (prev?.id === itemId ? null : prev));
      pushToast({ type: "success", title: "Cadastro removido" });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Falha ao excluir",
        description: "Não foi possível excluir o cadastro.",
      });
    }
  };

  const handleOpenFichaPreview = (member: CensusMember) => {
    const w = window.open("", "_blank");
    if (!w) return pushToast({ type: "error", title: "Pop-up bloqueado" });
    const pages = buildFichaMarkup(member, settings.censusTitle);
    const html = buildPrintDocument(
      pages,
      { loginLabel: user?.email || "Admin", generatedAt: new Date().toLocaleString("pt-BR") },
      {
        mode: "download",
        filename: `ficha-${member.idInterno || member.id}`,
        pageSelector: ".page",
        toolbar: true,
        title: `Ficha • ${member.name}`,
      }
    );
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handleOpenCarteira = async (member: CensusMember) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(buildMemberQrPayload(member), {
        width: 504,
        margin: 1,
      });
      const w = window.open("", "_blank");
      if (!w) return;
      const photoForCard = await resolvePhotoForCard(member.photo);
      const memberForCard = { ...member, photo: photoForCard || member.photo };
      const carteiraTitle = resolveCarteiraTitle(member.cargo);
      const fullTitle = member.name
        ? `${carteiraTitle} • ${member.name}`
        : carteiraTitle;
      const html = buildCarteiraDocument(
        buildCarteiraMarkup(memberForCard, qrDataUrl, settings),
        {
          mode: isSafari ? "download" : "print",
          filename: "carteira-membro",
          pageSelector: ".card-page",
          toolbar: true,
          title: fullTitle,
          forceDesktop: true,
          showPrintButton: !isSafariMobile,
        }
      );
      w.document.open();
      w.document.write(html);
      w.document.close();
    } catch (err) {
      pushToast({ type: "error", title: "Falha ao gerar carteira" });
    }
  };

  const renderDetail = (label: string, value?: string, force = false) => {
    if (!value && !force) return null;
    return (
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-700">{label}:</span>{" "}
        {value || "-"}
      </p>
    );
  };

  const renderLinkDetail = (label: string, href?: string) => {
    if (!href) return null;
    return (
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-700">{label}:</span>{" "}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 hover:text-blue-800 font-semibold"
        >
          Abrir documento
        </a>
      </p>
    );
  };

  if (!isReady) return <div className="min-h-screen bg-slate-50" />;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <AdminHeader
        title="Secretaria"
        subtitle="Gestão de documentos dos membros."
        icon={<FileText className="w-6 h-6" />}
        right={
          <>
            <span>{items.length} membros</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 text-amber-700 border border-amber-100 px-3 py-1 text-xs font-semibold">
              Pendências: {docStats.pendentes}
            </span>
          </>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="space-y-6">
            <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-6 text-white">
                <div className="flex items-center gap-3 opacity-90">
                  <FileText size={20} />
                  <span className="text-sm font-medium">Pendências</span>
                </div>
                <div className="mt-2 text-3xl font-bold">{docStats.pendentes}</div>
                <div className="text-xs opacity-70">Membros com documentos faltantes</div>
              </div>
              <div className="p-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Total</p>
                  <p className="text-lg font-bold text-slate-800">{docStats.total}</p>
                </div>
                <div className="rounded-xl bg-amber-50 p-3 border border-amber-100">
                  <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">Sem Foto</p>
                  <p className="text-lg font-bold text-amber-800">{docStats.semFoto}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3 border border-rose-100 col-span-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-rose-600 tracking-wider">Sem Certidão</p>
                      <p className="text-lg font-bold text-rose-800">{docStats.semCertidao}</p>
                    </div>
                    {docStats.casadosSemCertidao > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] text-rose-500">Casados S/ Doc</p>
                        <p className="text-sm font-bold text-rose-700">{docStats.casadosSemCertidao}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Users size={22} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Status do censo</p>
                  <p className="text-lg font-bold text-slate-900">
                    {settings.censusOpen ? "Aberto" : "Fechado"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCensus}
                disabled={toggling}
                className={`w-full rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                  settings.censusOpen
                    ? "bg-slate-800 hover:bg-slate-900"
                    : "bg-emerald-600 hover:bg-emerald-700"
                } ${toggling ? "opacity-70 cursor-wait" : ""}`}
              >
                {toggling
                  ? "Atualizando..."
                  : settings.censusOpen
                  ? "Fechar censo"
                  : "Abrir censo"}
              </button>
              <p className="text-xs text-slate-500 mt-3">
                O formulário público será exibido apenas quando o censo estiver
                aberto.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-slate-800">
                <Filter size={16} />
                <h3 className="text-sm font-bold">Filtrar Lista</h3>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome, CPF..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm outline-none ring-offset-2 transition-all focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                {activeView === "documents" ? (
                  [
                    { id: "all", label: "Todos os membros" },
                    { id: "no-photo", label: "Faltando Foto" },
                    { id: "no-certidao", label: "Faltando Certidão" },
                    { id: "casados-sem-certidao", label: "Casados s/ Certidão" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => setDocFilter(opt.id as any)}
                      className={`w-full rounded-xl px-4 py-2.5 text-left text-xs font-semibold transition-all ${
                        docFilter === opt.id
                          ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))
                ) : (
                  <>
                    <select
                      value={filterCongregation}
                      onChange={(event) =>
                        setFilterCongregation(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Todas as congregações</option>
                      {congregationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterSector}
                      onChange={(event) => setFilterSector(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Todos os setores</option>
                      {sectorOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterRegistro}
                      onChange={(event) =>
                        setFilterRegistro(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Todos os registros</option>
                      {registroOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterCargo}
                      onChange={(event) =>
                        setFilterCargo(event.target.value)
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                    >
                      <option value="">Todos os cargos</option>
                      {cargoFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <section>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveView("members")}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  activeView === "members"
                    ? "border-blue-200 bg-blue-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-blue-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Membros
                  </p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Users size={16} />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {items.length}
                    </p>
                    <p className="text-xs text-slate-500">
                      Lista geral de cadastros
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
                    Ver membros
                  </span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setActiveView("documents")}
                className={`rounded-2xl border p-5 text-left transition-all ${
                  activeView === "documents"
                    ? "border-amber-200 bg-amber-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-amber-200 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Documentos
                  </p>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <FileText size={16} />
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold text-slate-900">
                      {docStats.pendentes}
                    </p>
                    <p className="text-xs text-slate-500">
                      Pendências para atualizar
                    </p>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[10px] font-semibold text-amber-700">
                    Ver documentos
                  </span>
                </div>
              </button>
            </div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">
                {activeView === "documents"
                  ? "Documentos"
                  : "Membros"}
              </h2>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {viewItems.length}
              </span>
            </div>

            {loading ? (
              <LoadingSkeleton />
            ) : viewItems.length === 0 ? (
              <EmptyState message="Tente ajustar os filtros ou buscar por outro nome." />
            ) : activeView === "documents" ? (
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                {paginatedItems.map((item) => {
                  const hasPhoto = Boolean(item.photo);
                  const hasCertidao = Boolean(item.certidaoCasamento);
                  const isCasado = isCasadoEstadoCivil(item.estadoCivil);
                  const isSolteiro = isSolteiroEstadoCivil(item.estadoCivil);
                  const requiresCertidao = !isSolteiro;
                  const photoId = `file-photo-${item.id}`;
                  const certidaoId = `file-certidao-${item.id}`;
                  const cargoValue = resolveCargoValue(item.cargo);

                  return (
                    <article
                      key={item.id}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-slate-300"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/50 p-4">
                        <div className="flex gap-3 w-full">
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border overflow-hidden ${
                              hasPhoto ? "border-slate-200" : "border-dashed border-slate-300 bg-white text-slate-400"
                            }`}
                          >
                            {hasPhoto ? (
                              <img
                                src={safePhoto(item.photo)}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Users size={20} />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-slate-800 truncate">
                              {item.name || "Sem nome"}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {isCasado && (
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                                    hasCertidao
                                      ? "bg-emerald-100 text-emerald-700"
                                      : "bg-rose-100 text-rose-700"
                                  }`}
                                >
                                  {hasCertidao ? <CheckCircle2 size={10} /> : <AlertCircle size={10} />}
                                  Casado(a)
                                </span>
                              )}
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 truncate">
                                {item.congregacao || "Sede"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="flex flex-1 flex-col p-4 gap-4">
                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-500">
                          <div>
                            <span className="block font-semibold text-slate-400 mb-0.5">CPF</span>
                            <span className="font-mono text-slate-700">{item.cpf || "-"}</span>
                          </div>
                          <div>
                            <span className="block font-semibold text-slate-400 mb-0.5">Setor</span>
                            <span className="text-slate-700">{item.setor || "-"}</span>
                          </div>
                          <div>
                            <span className="block font-semibold text-slate-400 mb-0.5">Cargo</span>
                            <div className="flex items-center gap-2">
                              <select
                                value={cargoValue}
                                onChange={(event) =>
                                  updateMemberCargo(item, event.target.value)
                                }
                                disabled={cargoSaving[item.id]}
                                className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                              >
                                {cargoOptions.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {cargoSaving[item.id] ? (
                                <Loader2 size={12} className="animate-spin text-blue-500" />
                              ) : null}
                            </div>
                          </div>
                        </div>

                        <hr className="border-slate-100" />

                        {/* Upload Zones Container */}
                        <div className="grid grid-cols-2 gap-3">
                          {/* Photo Zone */}
                          <div className="space-y-2">
                            <label className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400">
                              <span>Foto 3x4</span>
                              {photoUploading[item.id] && (
                                <Loader2 size={12} className="animate-spin text-blue-500" />
                              )}
                            </label>
                            <div
                              className={`relative flex aspect-[3/4] flex-col items-center justify-center overflow-hidden rounded-xl border transition-colors ${
                                hasPhoto
                                  ? "border-slate-200 bg-white"
                                  : "border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100"
                              }`}
                            >
                              {hasPhoto ? (
                                <>
                                  <img
                                    src={safePhoto(item.photo)}
                                    className="h-full w-full object-cover"
                                    alt="Foto"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center gap-2">
                                    <button
                                      onClick={() => removeMemberPhoto(item)}
                                      className="p-2 bg-white/20 text-white rounded-full hover:bg-red-500 hover:text-white transition-colors"
                                      title="Remover"
                                    >
                                      <Trash2 size={14} />
                                    </button>
                                    <button
                                      onClick={() => openFilePicker(photoId)}
                                      className="p-2 bg-white/20 text-white rounded-full hover:bg-blue-500 hover:text-white transition-colors"
                                      title="Alterar"
                                    >
                                      <Camera size={14} />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  onClick={() => openFilePicker(photoId)}
                                  className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400 hover:text-blue-500"
                                >
                                  <ImageIcon size={24} />
                                  <span className="text-[10px] font-medium">Adicionar</span>
                                </button>
                              )}
                            </div>
                            <input
                              id={photoId}
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleFileChange(item, "photo")}
                            />
                            {photoUploadError[item.id] && (
                              <p className="text-[10px] text-red-500">
                                {photoUploadError[item.id]}
                              </p>
                            )}
                          </div>

                          {/* Certidao & Actions Zone */}
                          <div className="flex flex-col gap-3">
                            <div className="space-y-2 flex-1">
                              <label className="flex items-center justify-between text-[11px] font-bold uppercase text-slate-400">
                                <span>Certidão</span>
                                {!requiresCertidao && !hasCertidao ? (
                                  <span className="text-[10px] text-slate-400">
                                    Dispensado
                                  </span>
                                ) : certidaoUploading[item.id] ? (
                                  <Loader2 size={12} className="animate-spin text-blue-500" />
                                ) : null}
                              </label>
                              <div
                                className={`relative flex h-24 flex-col items-center justify-center rounded-xl border transition-colors ${
                                  hasCertidao
                                    ? "border-emerald-200 bg-emerald-50/50"
                                    : "border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100"
                                }`}
                              >
                                {hasCertidao ? (
                                  <div className="text-center">
                                    <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
                                      <FileText size={20} />
                                      <CheckCircle2 size={14} />
                                    </div>
                                    <div className="flex gap-2 justify-center mt-2">
                                      <a
                                        href={item.certidaoCasamento}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
                                      >
                                        <Download size={14} />
                                      </a>
                                      {requiresCertidao ? (
                                        <button
                                          onClick={() =>
                                            openFilePicker(certidaoId)
                                          }
                                          className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-700 transition"
                                        >
                                          <UploadCloud size={14} />
                                        </button>
                                      ) : null}
                                      <button
                                        onClick={() => removeMemberCertidao(item)}
                                        className="p-1.5 rounded-lg hover:bg-rose-100 text-rose-600 transition"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </div>
                                ) : requiresCertidao ? (
                                  <button
                                    onClick={() => openFilePicker(certidaoId)}
                                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-400 hover:text-blue-500"
                                  >
                                    <UploadCloud size={20} />
                                    <span className="text-[10px] font-medium">
                                      Upload PDF/Img
                                    </span>
                                  </button>
                                ) : (
                                  <div className="text-center text-slate-400 text-[10px]">
                                    Dispensado para solteiro(a).
                                  </div>
                                )}
                              </div>
                              <input
                                id={certidaoId}
                                type="file"
                                accept="application/pdf,image/*"
                                className="hidden"
                                onChange={handleFileChange(item, "certidao")}
                              />
                            </div>

                            {/* Print Actions */}
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => handleOpenFichaPreview(item)}
                                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                              >
                                <Printer size={16} />
                                <span className="text-[10px] font-bold">Ficha</span>
                              </button>
                              <button
                                onClick={() => handleOpenCarteira(item)}
                                className="flex flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-2 text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                              >
                                <QrCode size={16} />
                                <span className="text-[10px] font-bold">Carteira</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900">
                    Lista de cadastros
                  </h3>
                  <span className="text-xs text-slate-500">
                    {searchFilteredItems.length} item
                    {searchFilteredItems.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <label className="flex items-center gap-2 font-semibold">
                    <input
                      type="checkbox"
                      checked={
                        searchFilteredItems.length > 0 &&
                        searchFilteredItems.every((item) =>
                          selectedIds.includes(item.id)
                        )
                      }
                      onChange={(event) =>
                        event.target.checked
                          ? handleSelectAllFiltered()
                          : handleClearSelection()
                      }
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Selecionar todos (filtrados)
                  </label>
                  <span className="text-slate-400">|</span>
                  <span>
                    Selecionados:{" "}
                    <strong className="text-slate-700">
                      {selectedItems.length}
                    </strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePrintFichas(selectedItems)}
                    disabled={!selectedItems.length}
                    className="rounded-full border border-blue-200 px-3 py-1.5 font-semibold text-blue-600 hover:bg-blue-50 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Exportar selecionados
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrintFichas(searchFilteredItems)}
                    disabled={!searchFilteredItems.length}
                    className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Exportar filtrados
                  </button>
                  <button
                    type="button"
                    onClick={handleClearSelection}
                    disabled={!selectedItems.length}
                    className="rounded-full border border-slate-200 px-3 py-1.5 font-semibold text-slate-500 hover:bg-slate-100 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    Limpar seleção
                  </button>
                  <button
                    type="button"
                    onClick={() => setScannerOpen(true)}
                    className="rounded-full border border-emerald-200 px-3 py-1.5 font-semibold text-emerald-600 hover:bg-emerald-50 transition"
                  >
                    Ler QR Code
                  </button>
                </div>

                <div className="space-y-4">
                  {paginatedItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-100 p-4 flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelection(item.id)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <div>
                            <h3 className="text-lg font-bold text-slate-800">
                              {item.name || "Sem nome"}
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">
                              {item.congregacao || "-"} • {item.setor || "-"}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-start sm:items-end text-xs font-semibold text-slate-500 gap-1">
                          <span>
                            {formatRegistro(
                              item.registroTipo,
                              item.registroTipoOutro
                            )}
                          </span>
                          <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {formatCargo(item.cargo)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                        {item.cpf ? (
                          <span>CPF: {formatCpf(item.cpf)}</span>
                        ) : null}
                        {item.celular ? (
                          <span>Celular: {formatPhone(item.celular)}</span>
                        ) : null}
                        {item.createdAt ? (
                          <span>Enviado: {formatDate(item.createdAt)}</span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveMember(item)}
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                        >
                          Ver detalhes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!loading && viewItems.length > pageSize ? (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  disabled={page === 1}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="text-xs text-slate-500">
                  Página {page} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={page === totalPages}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            ) : null}
          </section>
        </div>
      </main>

      {activeMember ? (
        <div
          className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-slate-900/60 px-3 sm:px-4 py-6 sm:py-10 overflow-y-auto overscroll-contain"
          onClick={() => setActiveMember(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[calc(100dvh-3rem)] sm:max-h-[90vh]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  {formatRegistro(
                    activeMember.registroTipo,
                    activeMember.registroTipoOutro
                  ) || "Cadastro"}
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeMember.name || "Sem nome"}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                <button
                  type="button"
                  onClick={() => handleOpenFichaPreview(activeMember)}
                  className="w-full sm:w-auto rounded-full border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                >
                  Abrir ficha
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCarteira(activeMember)}
                  className="w-full sm:w-auto rounded-full border border-emerald-200 px-4 py-2 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 transition"
                >
                  Gerar carteira
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMember(null)}
                  className="ml-auto sm:ml-0 text-slate-400 hover:text-slate-600 text-2xl leading-none"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="px-5 sm:px-6 py-6 space-y-6 flex-1 min-h-0 overflow-y-auto">
              {activeMember.photo ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-40 sm:w-48 aspect-[3/4] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm">
                    <img
                      src={safePhoto(activeMember.photo)}
                      alt={activeMember.name || "Foto do membro"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <span className="text-xs text-slate-400">Foto 3x4</span>
                </div>
              ) : null}

              <div className="rounded-2xl border border-slate-100 bg-white p-4">
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Documentos
                    </p>
                    <p className="text-sm text-slate-500">
                      Atualize foto 3x4 e certidão de casamento do membro.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">
                          Foto 3x4
                        </p>
                        {photoUploading[activeMember.id] ? (
                          <span className="text-xs text-slate-400">
                            Enviando...
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          id={`member-photo-${activeMember.id}`}
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange(activeMember, "photo")}
                          className="sr-only"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            openFilePicker(`member-photo-${activeMember.id}`)
                          }
                          disabled={photoUploading[activeMember.id]}
                          className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                        >
                          Atualizar foto
                        </button>
                        {activeMember.photo ? (
                          <button
                            type="button"
                            onClick={() => removeMemberPhoto(activeMember)}
                            disabled={photoUploading[activeMember.id]}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-70"
                          >
                            Remover
                          </button>
                        ) : null}
                      </div>
                      {photoUploadError[activeMember.id] ? (
                        <span className="block text-xs text-red-600">
                          {photoUploadError[activeMember.id]}
                        </span>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700">
                          Certidão de casamento
                        </p>
                        {isSolteiroEstadoCivil(activeMember.estadoCivil) &&
                        !activeMember.certidaoCasamento ? (
                          <span className="text-xs text-slate-400">
                            Dispensado
                          </span>
                        ) : certidaoUploading[activeMember.id] ? (
                          <span className="text-xs text-slate-400">
                            Enviando...
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {!isSolteiroEstadoCivil(activeMember.estadoCivil) ? (
                          <>
                            <input
                              id={`member-certidao-${activeMember.id}`}
                              type="file"
                              accept="application/pdf,image/*"
                              onChange={handleFileChange(activeMember, "certidao")}
                              className="sr-only"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                openFilePicker(
                                  `member-certidao-${activeMember.id}`
                                )
                              }
                              disabled={certidaoUploading[activeMember.id]}
                              className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-70"
                            >
                              Atualizar certidão
                            </button>
                            {activeMember.certidaoCasamento ? (
                              <>
                                <a
                                  href={activeMember.certidaoCasamento}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                                >
                                  Ver
                                </a>
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeMemberCertidao(activeMember)
                                  }
                                  disabled={certidaoUploading[activeMember.id]}
                                  className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-70"
                                >
                                  Remover
                                </button>
                              </>
                            ) : null}
                          </>
                        ) : activeMember.certidaoCasamento ? (
                          <>
                            <a
                              href={activeMember.certidaoCasamento}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                            >
                              Ver
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                removeMemberCertidao(activeMember)
                              }
                              disabled={certidaoUploading[activeMember.id]}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-70"
                            >
                              Remover
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Dispensado para solteiro(a).
                          </span>
                        )}
                      </div>
                      {certidaoUploadError[activeMember.id] ? (
                        <span className="block text-xs text-red-600">
                          {certidaoUploadError[activeMember.id]}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Cargo ministerial
                    </p>
                    <p className="text-sm text-slate-600">
                      Defina o cargo do membro cadastrado.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={resolveCargoValue(activeMember.cargo)}
                      onChange={(event) =>
                        updateMemberCargo(activeMember, event.target.value)
                      }
                      disabled={cargoSaving[activeMember.id]}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-70"
                    >
                      {cargoOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {cargoSaving[activeMember.id] ? (
                      <Loader2 size={14} className="animate-spin text-blue-500" />
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Identificação
                  </h4>
                  {renderDetail("Nome", activeMember.name)}
                  {renderDetail("CPF", formatCpf(activeMember.cpf))}
                  {renderDetail("RG", activeMember.rg)}
                  {renderDetail("Título de eleitor", activeMember.tituloEleitor)}
                  {renderDetail("ID interno", activeMember.idInterno)}
                  {renderDetail("Congregação", activeMember.congregacao)}
                  {renderDetail("Setor", activeMember.setor)}
                  {renderDetail(
                    "Data de nascimento",
                    formatDate(activeMember.dataNascimento)
                  )}
                  {renderDetail("Sexo", activeMember.sexo)}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Contato
                  </h4>
                  {renderDetail("Email", activeMember.email)}
                  {renderDetail("Telefone", formatPhone(activeMember.telefone))}
                  {renderDetail("Celular", formatPhone(activeMember.celular))}
                  {renderDetail("Endereço", activeMember.endereco)}
                  {renderDetail("Número", activeMember.numero)}
                  {renderDetail("Complemento", activeMember.complemento)}
                  {renderDetail("Bairro", activeMember.bairro)}
                  {renderDetail("Cidade", activeMember.cidade)}
                  {renderDetail("UF", activeMember.uf)}
                  {renderDetail("CEP", activeMember.cep)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Filiação
                  </h4>
                  {renderDetail("Pai", activeMember.pai)}
                  {renderDetail("CPF do pai", formatCpf(activeMember.cpfPai))}
                  {renderDetail("Mãe", activeMember.mae)}
                  {renderDetail("CPF da mãe", formatCpf(activeMember.cpfMae))}
                  {renderDetail(
                    "Órfão",
                    formatBool(activeMember.isOrphan),
                    true
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Dados pessoais
                  </h4>
                  {renderDetail("Nacionalidade", activeMember.nacionalidade)}
                  {renderDetail("Profissão", activeMember.profissao)}
                  {renderDetail(
                    "Grau de instrução",
                    activeMember.grauInstrucao
                  )}
                  {renderDetail("Naturalidade", activeMember.naturalidade)}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Estado civil
                  </h4>
                  {renderDetail("Estado civil", activeMember.estadoCivil)}
                  {renderDetail(
                    "Data do casamento",
                    formatDate(activeMember.dtCasamento)
                  )}
                  {renderLinkDetail(
                    "Certidão de casamento",
                    activeMember.certidaoCasamento
                  )}
                  {renderDetail(
                    "Quantidade de filhos",
                    activeMember.qtdeFilhos
                  )}
                  {renderDetail("Nome do cônjuge", activeMember.nomeConjuge)}
                  {renderDetail("CPF do cônjuge", formatCpf(activeMember.cpfConjuge))}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Cônjuge
                  </h4>
                  {renderDetail(
                    "Profissão do cônjuge",
                    activeMember.profissaoConjuge
                  )}
                  {renderDetail(
                    "Grau de instrução do cônjuge",
                    activeMember.grauInstrucaoConjuge
                  )}
                  {renderDetail(
                    "Nascimento do cônjuge",
                    formatDate(activeMember.dataNascimentoConjuge)
                  )}
                </div>
              </div>

              {activeMember.filhos && activeMember.filhos.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Filhos
                  </h4>
                  <ul className="list-disc list-inside text-sm text-slate-600 space-y-1">
                    {activeMember.filhos.map((child, index) => (
                      <li key={`${child.name}-${index}`}>
                        {child.name || "Sem nome"}
                        {child.cpf ? ` — CPF: ${child.cpf}` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Igreja
                  </h4>
                  {renderDetail(
                    "Data de conversão",
                    formatDate(activeMember.dataConversao)
                  )}
                  {renderDetail(
                    "Batizado no Espírito Santo",
                    formatBool(activeMember.batizadoEspiritoSanto),
                    true
                  )}
                  {renderDetail(
                    "Data do batismo no Espírito Santo",
                    formatDate(activeMember.dataBatismoEspiritoSanto)
                  )}
                  {renderDetail("Origem", activeMember.origem)}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Batismo e recebimento
                  </h4>
                  {renderDetail("Local do batismo", activeMember.localBatismo)}
                  {renderDetail(
                    "Data do batismo",
                    formatDate(activeMember.dataBatismo)
                  )}
                  {renderDetail("Recebimento", activeMember.recebimento)}
                  {renderDetail(
                    "Data do recebimento",
                    formatDate(activeMember.dataRecebimento)
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Vínculo e LGPD
                  </h4>
                  {renderDetail(
                    "Autorização LGPD",
                    formatBool(activeMember.autorizacao),
                    true
                  )}
                  {renderDetail(
                    "Uso de imagem",
                    formatBool(activeMember.usoImagem),
                    true
                  )}
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Observações
                  </h4>
                  {renderDetail("Informações", activeMember.informacoes)}
                  {renderDetail("Enviado em", formatDate(activeMember.createdAt))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {scannerOpen ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setScannerOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-2xl w-full overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Leitor de QR Code
                </p>
                <p className="text-sm text-slate-500">
                  Aponte a câmera para a carteirinha do membro.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setScannerOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              {scannerError ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  {scannerError}
                </div>
              ) : (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-slate-200 bg-slate-900">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400/70 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
                  </div>
                </div>
              )}
              {scannerLoading ? (
                <p className="mt-3 text-xs text-slate-500">
                  Ativando câmera...
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
