"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type DragEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import { ClipboardList } from "lucide-react";
import Image from "next/image";
import QRCode from "qrcode";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useCongregations } from "@/lib/firebase/useCongregations";
import { useDepartments } from "@/lib/firebase/useDepartments";
import { db, storage } from "@/lib/firebase/client";
import { deleteStorageObject, deleteStorageObjects } from "@/lib/firebase/storageUtils";
import { AdminHeader } from "@/components/admin/AdminHeader";

const DEFAULT_PHOTO = "/logo.png";
const LABEL_W_MM = 60;
const LABEL_H_MM = 30;

type PatrimonyDoc = {
  id: string;
  numericId?: number;
  name: string;
  acquiredAt?: string;
  description?: string;
  department?: string;
  congregation?: string;
  sector?: string;
  photos?: string[];
  createdAt?: string;
};

type FormState = {
  numericId?: number;
  name: string;
  acquiredAt: string;
  description: string;
  department: string;
  congregation: string;
  sector: string;
  photos: string[];
  createdAt?: string;
};

const emptyForm: FormState = {
  numericId: undefined,
  name: "",
  acquiredAt: "",
  description: "",
  department: "",
  congregation: "",
  sector: "",
  photos: [],
};

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const formatMonthYear = (value?: string) => {
  if (!value) return "";
  const [year, month] = value.split("-");
  if (!year || !month) return value;
  return `${month}/${year}`;
};

const csvEscape = (value: string) => {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
};

export default function AdminPatrimonioPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const { items: congregations } = useCongregations();
  const { items: departments } = useDepartments();

  const [items, setItems] = useState<PatrimonyDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDraggingPhotos, setIsDraggingPhotos] = useState(false);
  const [activeLabel, setActiveLabel] = useState<PatrimonyDoc | null>(null);
  const [labelQr, setLabelQr] = useState("");
  const [photoViewer, setPhotoViewer] = useState<{
    photos: string[];
    index: number;
  } | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scannerLoading, setScannerLoading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filterCongregation, setFilterCongregation] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const listRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const detectorRef = useRef<any>(null);
  const jsQrRef = useRef<any>(null);

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
    const q = collection(db, "patrimony");
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<PatrimonyDoc, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const congregationOptions = useMemo(() => {
    return [...congregations]
      .map((item) => item.name)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [congregations]);

  const congregationSectorMap = useMemo(() => {
    return new Map(
      congregations
        .filter((item) => item.name)
        .map((item) => [item.name, item.sector])
    );
  }, [congregations]);

  const formCongregationOptions = useMemo(() => {
    const sector = form.sector?.trim();
    const list = sector
      ? congregations
          .filter((item) => item.sector === sector)
          .map((item) => item.name)
      : congregationOptions;
    return list.filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [congregations, congregationOptions, form.sector]);

  const filterCongregationOptions = useMemo(() => {
    const sector = filterSector?.trim();
    const list = sector
      ? congregations
          .filter((item) => item.sector === sector)
          .map((item) => item.name)
      : congregationOptions;
    return list.filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [congregations, congregationOptions, filterSector]);

  const sectorOptions = useMemo(() => {
    return Array.from(
      new Set(congregations.map((item) => item.sector).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));
  }, [congregations]);

  const departmentOptions = useMemo(() => {
    return [...departments]
      .map((item) => item.title)
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [departments]);

  const canSubmit = useMemo(() => form.name.trim().length > 0, [form]);

  const getDisplayId = (item?: PatrimonyDoc | null) => {
    if (!item) return "";
    if (typeof item.numericId === "number" && !Number.isNaN(item.numericId)) {
      return String(item.numericId);
    }
    return item.id;
  };

  const nextNumericId = async () => {
    const firestore = db;
    if (!firestore) return 1;
    const counterRef = doc(firestore, "counters", "patrimony");
    return runTransaction(firestore, async (tx) => {
      const counterSnap = await tx.get(counterRef);
      let nextId = 1;
      if (counterSnap.exists()) {
        const data = counterSnap.data() as { nextId?: number; value?: number };
        const current = Number(data.nextId ?? data.value ?? 1);
        nextId =
          Number.isFinite(current) && current > 0 ? Math.floor(current) : 1;
      } else {
        const maxExisting = items
          .map((item) =>
            typeof item.numericId === "number" && !Number.isNaN(item.numericId)
              ? item.numericId
              : Number(item.id)
          )
          .filter((value) => Number.isFinite(value) && value > 0)
          .reduce((max, value) => Math.max(max, value), 0);
        nextId = Math.max(1, Math.floor(maxExisting) + 1);
      }

      let candidate = nextId;
      for (let i = 0; i < 5; i += 1) {
        const candidateRef = doc(firestore, "patrimony", String(candidate));
        const candidateSnap = await tx.get(candidateRef);
        if (!candidateSnap.exists()) {
          tx.set(counterRef, { nextId: candidate + 1 }, { merge: true });
          return candidate;
        }
        candidate += 1;
      }

      tx.set(counterRef, { nextId: candidate + 1 }, { merge: true });
      return candidate;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!db || !canSubmit) {
      if (!db) {
        pushToast({
          type: "error",
          title: "Firebase não configurado",
          description: "Não foi possível salvar o patrimônio.",
        });
      }
      return;
    }
    const isEditing = Boolean(editingId);
    setSaving(true);
    const payload: Omit<PatrimonyDoc, "id"> = {
      name: form.name.trim(),
      acquiredAt: form.acquiredAt.trim(),
      description: form.description.trim(),
      department: form.department.trim(),
      congregation: form.congregation.trim(),
      sector: form.sector.trim(),
      photos: form.photos.filter(Boolean),
      createdAt: form.createdAt ?? new Date().toISOString(),
    };
    if (typeof form.numericId === "number" && !Number.isNaN(form.numericId)) {
      payload.numericId = form.numericId;
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, "patrimony", editingId), payload);
      } else {
        const numericId = await nextNumericId();
        const docRef = doc(db, "patrimony", String(numericId));
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(docRef);
          if (snap.exists()) {
            throw new Error("ID já utilizado. Tente novamente.");
          }
          tx.set(docRef, { ...payload, numericId });
        });
      }
      setForm(emptyForm);
      setEditingId(null);
      pushToast({
        type: "success",
        title: isEditing ? "Patrimônio atualizado" : "Patrimônio adicionado",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: isEditing
          ? "Falha ao atualizar patrimônio"
          : "Falha ao adicionar patrimônio",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: PatrimonyDoc) => {
    setEditingId(item.id);
    setUploadError("");
    setForm({
      numericId: item.numericId,
      name: item.name || "",
      acquiredAt: item.acquiredAt || "",
      description: item.description || "",
      department: item.department || "",
      congregation: item.congregation || "",
      sector: item.sector || "",
      photos: item.photos ?? [],
      createdAt: item.createdAt,
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setForm(emptyForm);
    setUploadError("");
  };

  const uploadPhotos = async (files: File[]) => {
    if (!storage) {
      setUploadError("Storage não configurado.");
      pushToast({
        type: "error",
        title: "Storage não configurado",
        description: "Não foi possível enviar as fotos.",
      });
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const uploaded: string[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
        const fileRef = ref(
          storage,
          `uploads/patrimony/${Date.now()}-${safeName}`
        );
        await uploadBytes(fileRef, file, { contentType: file.type });
        const url = await getDownloadURL(fileRef);
        uploaded.push(url);
      }
      setForm((prev) => ({ ...prev, photos: [...prev.photos, ...uploaded] }));
      pushToast({
        type: "success",
        title: "Fotos enviadas",
      });
    } catch (error) {
      setUploadError("Falha ao enviar as fotos.");
      pushToast({
        type: "error",
        title: "Falha ao enviar fotos",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handlePhotoDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDraggingPhotos(false);
    const files = Array.from(event.dataTransfer.files || []);
    if (files.length) {
      void uploadPhotos(files);
    }
  };

  const handlePhotoDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };

  const handleRemovePhoto = (index: number) => {
    setForm((prev) => {
      const target = prev.photos[index];
      if (target) {
        void deleteStorageObject(target);
      }
      return {
        ...prev,
        photos: prev.photos.filter((_, idx) => idx !== index),
      };
    });
  };

  const handleDelete = async (itemId: string) => {
    if (!db) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível excluir o patrimônio.",
      });
      return;
    }
    const ok = window.confirm("Deseja excluir este patrimônio?");
    if (!ok) return;
    try {
      const target = items.find((item) => item.id === itemId);
      await deleteDoc(doc(db, "patrimony", itemId));
      if (target?.photos?.length) {
        await deleteStorageObjects(target.photos);
      }
      setSelectedIds((prev) => prev.filter((id) => id !== itemId));
      pushToast({
        type: "success",
        title: "Patrimônio removido",
      });
    } catch (error) {
      pushToast({
        type: "error",
        title: "Falha ao excluir patrimônio",
        description:
          error instanceof Error ? error.message : "Tente novamente em instantes.",
      });
    }
  };

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filteredItems = useMemo(() => {
    return sortedItems.filter((item) => {
      if (filterCongregation && item.congregation !== filterCongregation) {
        return false;
      }
      if (filterDepartment && item.department !== filterDepartment) {
        return false;
      }
      if (filterSector && item.sector !== filterSector) {
        return false;
      }
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const hay = [
          item.name,
          item.description,
          item.department,
          item.congregation,
          item.sector,
          item.id,
          item.numericId ? String(item.numericId) : "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [sortedItems, filterCongregation, filterDepartment, filterSector, search]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredItems.length / pageSize)),
    [filteredItems.length, pageSize]
  );

  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterCongregation, filterDepartment, filterSector, search]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const selectedItems = useMemo(() => {
    if (!selectedIds.length) return [];
    const selectedSet = new Set(selectedIds);
    return items.filter((item) => selectedSet.has(item.id));
  }, [items, selectedIds]);

  const allFilteredSelected = useMemo(() => {
    if (!filteredItems.length) return false;
    const selectedSet = new Set(selectedIds);
    return filteredItems.every((item) => selectedSet.has(item.id));
  }, [filteredItems, selectedIds]);

  const activeLabelUrl = useMemo(() => {
    if (!activeLabel || typeof window === "undefined") return "";
    return `${window.location.origin}/patrimonio/${activeLabel.id}`;
  }, [activeLabel]);

  useEffect(() => {
    if (!activeLabelUrl) {
      setLabelQr("");
      return;
    }
    QRCode.toDataURL(activeLabelUrl, { width: 280, margin: 1 })
      .then((url) => setLabelQr(url))
      .catch(() => setLabelQr(""));
  }, [activeLabelUrl]);

  useEffect(() => {
    if (!photoViewer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPhotoViewer(null);
        return;
      }
      if (event.key === "ArrowRight") {
        setPhotoViewer((prev) => {
          if (!prev) return prev;
          const nextIndex = (prev.index + 1) % prev.photos.length;
          return { ...prev, index: nextIndex };
        });
      }
      if (event.key === "ArrowLeft") {
        setPhotoViewer((prev) => {
          if (!prev) return prev;
          const nextIndex =
            (prev.index - 1 + prev.photos.length) % prev.photos.length;
          return { ...prev, index: nextIndex };
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoViewer]);

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
            const canvas =
              canvasRef.current ?? document.createElement("canvas");
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
            const parsed = (() => {
              try {
                const url = new URL(raw);
                const parts = url.pathname.split("/").filter(Boolean);
                const idx = parts.indexOf("patrimonio");
                if (idx >= 0 && parts[idx + 1]) return parts[idx + 1];
              } catch {
                // ignore
              }
              return raw.trim();
            })();

            if (parsed) {
              setSearch(parsed);
              setFilterCongregation("");
              setFilterDepartment("");
              setFilterSector("");
              const match = items.find(
                (item) =>
                  item.id === parsed ||
                  (item.numericId && String(item.numericId) === parsed)
              );
              if (match) {
                pushToast({
                  type: "success",
                  title: "Patrimônio encontrado",
                  description: match.name,
                });
              } else {
                pushToast({
                  type: "info",
                  title: "Busca aplicada",
                  description: "Verifique o item na lista.",
                });
              }
              listRef.current?.scrollIntoView({ behavior: "smooth" });
              setScannerOpen(false);
              return;
            }
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

  const handlePrintLabel = () => {
    if (!activeLabel || !labelQr) return;

    const w = window.open("", "_blank");
    if (!w) return;

    const displayId = escapeHtml(getDisplayId(activeLabel));

    // Layout em mm (evita “mudança” no print)
    const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Etiqueta Patrimônio</title>
        <style>
          /* ✅ Tamanho real da página/etiqueta */
          @page {
            size: ${LABEL_W_MM}mm ${LABEL_H_MM}mm;
            margin: 0;
          }

          html, body {
            margin: 0;
            padding: 0;
            width: ${LABEL_W_MM}mm;
            height: ${LABEL_H_MM}mm;
            font-family: Arial, sans-serif;
          }

          /* ✅ Forçar cores/gradientes no print (Chrome/Edge) */
          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            background: white;
          }

          .label {
            width: ${LABEL_W_MM}mm;
            height: ${LABEL_H_MM}mm;
            box-sizing: border-box;
            border: 0.3mm solid #e2e8f0;
            border-radius: 2.5mm;
            overflow: hidden;
            display: flex;
            background: #fff;
          }

          .left {
            width: 24mm;
            height: 100%;
            background: #f8fafc;
            border-right: 0.3mm solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2mm;
            box-sizing: border-box;
          }

          .left img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }

          .right {
            flex: 1;
            padding: 2.5mm 3mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            box-sizing: border-box;
          }

          .title {
            font-size: 4mm;
            font-weight: 800;
            letter-spacing: 0.4mm;
            text-transform: uppercase;
            color: #0f172a;
          }

          .number {
            margin-top: 1mm;
            font-size: 3.4mm;
            font-weight: 700;
            color: #1e293b;
          }

          .logo {
            display: flex;
            align-items: center;
            gap: 2mm;
          }

          .logo img {
            height: 6mm;
            width: auto;
            object-fit: contain;
          }

          .logo span {
            font-size: 2.6mm;
            color: #64748b;
            font-weight: 600;
          }

          /* ✅ Evita sombras na impressão */
          @media print {
            .label { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="left">
            <img id="qr" src="${labelQr}" alt="QR Code" />
          </div>
          <div class="right">
            <div>
              <div class="title">Patrimônio</div>
              <div class="number">Nº ${displayId}</div>
            </div>
            <div class="logo">
              <img src="${DEFAULT_PHOTO}" alt="IEADSM" />
              <span>IEADSM</span>
            </div>
          </div>
        </div>

        <script>
          // ✅ Só imprime depois do QR carregar (evita sair “diferente” ou sem QR)
          const img = document.getElementById("qr");
          const doPrint = () => setTimeout(() => window.print(), 50);
          if (img && img.complete) doPrint();
          else if (img) img.onload = doPrint;
          else doPrint();

          // Fecha depois (opcional)
          window.onafterprint = () => setTimeout(() => window.close(), 50);
        </script>
      </body>
    </html>
    `;

    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  // helper simples pra evitar quebrar HTML com caracteres especiais
  function escapeHtml(input: string) {
    return String(input ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  const toggleSelection = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const buildLabelMarkup = (item: PatrimonyDoc, qrDataUrl: string) => {
    const displayId = escapeHtml(getDisplayId(item));
    return `
      <div class="label">
        <div class="left">
          <img src="${qrDataUrl}" alt="QR Code" />
        </div>
        <div class="right">
          <div>
            <div class="title">Patrimônio</div>
            <div class="number">Nº ${displayId}</div>
          </div>
          <div class="logo">
            <img src="${DEFAULT_PHOTO}" alt="IEADSM" />
            <span>IEADSM</span>
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintBatch = async (batch: PatrimonyDoc[], title: string) => {
    if (!batch.length || typeof window === "undefined") {
      pushToast({
        type: "info",
        title: "Nenhuma etiqueta selecionada",
      });
      return;
    }
    setPrinting(true);
    try {
      const origin = window.location.origin;
      const labels = await Promise.all(
        batch.map(async (item) => {
          const url = `${origin}/patrimonio/${item.id}`;
          const qr = await QRCode.toDataURL(url, { width: 280, margin: 1 });
          return buildLabelMarkup(item, qr);
        })
      );

      const w = window.open("", "_blank");
      if (!w) {
        setPrinting(false);
        return;
      }

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width,initial-scale=1" />
            <title>${escapeHtml(title)}</title>
            <style>
              @page { size: A4; margin: 8mm; }
              * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              body { margin: 0; padding: 0; font-family: Arial, sans-serif; background: white; }
              .sheet {
                display: flex;
                flex-wrap: wrap;
                gap: 4mm;
                align-content: flex-start;
              }
              .label {
                width: ${LABEL_W_MM}mm;
                height: ${LABEL_H_MM}mm;
                box-sizing: border-box;
                border: 0.3mm solid #e2e8f0;
                border-radius: 2.5mm;
                overflow: hidden;
                display: flex;
                background: #fff;
              }
              .left {
                width: 24mm;
                height: 100%;
                background: #f8fafc;
                border-right: 0.3mm solid #e2e8f0;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 2mm;
                box-sizing: border-box;
              }
              .left img {
                width: 100%;
                height: 100%;
                object-fit: contain;
              }
              .right {
                flex: 1;
                padding: 2.5mm 3mm;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                box-sizing: border-box;
              }
              .title {
                font-size: 4mm;
                font-weight: 800;
                letter-spacing: 0.4mm;
                text-transform: uppercase;
                color: #0f172a;
              }
              .number {
                margin-top: 1mm;
                font-size: 3.4mm;
                font-weight: 700;
                color: #1e293b;
              }
              .logo {
                display: flex;
                align-items: center;
                gap: 2mm;
              }
              .logo img {
                height: 6mm;
                width: auto;
                object-fit: contain;
              }
              .logo span {
                font-size: 2.6mm;
                color: #64748b;
                font-weight: 600;
              }
            </style>
          </head>
          <body>
            <div class="sheet">
              ${labels.join("")}
            </div>
            <script>
              const images = Array.from(document.images || []);
              let loaded = 0;
              const done = () => {
                loaded += 1;
                if (loaded >= images.length) {
                  setTimeout(() => window.print(), 50);
                }
              };
              if (!images.length) {
                setTimeout(() => window.print(), 50);
              } else {
                images.forEach((img) => {
                  if (img.complete) done();
                  else {
                    img.onload = done;
                    img.onerror = done;
                  }
                });
              }
              window.onafterprint = () => setTimeout(() => window.close(), 50);
            </script>
          </body>
        </html>
      `;

      w.document.open();
      w.document.write(html);
      w.document.close();
    } finally {
      setPrinting(false);
    }
  };
  const openPhotoViewer = (photos: string[], index = 0) => {
    if (!photos.length) return;
    setPhotoViewer({ photos, index });
  };

  if (!isReady) {
    return <div className="min-h-screen pb-20 bg-slate-50" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-900">
      <AdminHeader
        title="Patrimônio"
        subtitle="Cadastre itens com setor, congregação e fotos."
        icon={<ClipboardList className="w-6 h-6" />}
        right={<span>{items.length} itens</span>}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!db ? (
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
            <p className="text-slate-500">
              Firebase não configurado. Adicione as variáveis de ambiente para
              liberar o gerenciamento do patrimônio.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-10">
            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 mb-6">
                {editingId ? "Editar patrimônio" : "Novo patrimônio"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                {editingId ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                    <span className="font-semibold text-slate-700">ID:</span>{" "}
                    {form.numericId ?? editingId}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    ID será gerado automaticamente após salvar.
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Nome
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Ex.: Mesa de som"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mês/Ano de aquisição
                    </label>
                    <input
                      type="month"
                      value={form.acquiredAt}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          acquiredAt: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Setor
                    </label>
                    <input
                      type="text"
                      list="sector-options"
                      value={form.sector}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((prev) => {
                          const currentCongregation = prev.congregation;
                          const currentSector = currentCongregation
                            ? congregationSectorMap.get(currentCongregation)
                            : "";
                          const keepCongregation =
                            !currentCongregation ||
                            !value ||
                            currentSector === value;
                          return {
                            ...prev,
                            sector: value,
                            congregation: keepCongregation
                              ? currentCongregation
                              : "",
                          };
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: SETOR 01 | MATRIZ"
                    />
                    <datalist id="sector-options">
                      {sectorOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        description: event.target.value,
                      }))
                    }
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                    placeholder="Detalhes do patrimônio"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Departamento (locação)
                    </label>
                    <input
                      type="text"
                      list="department-options"
                      value={form.department}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          department: event.target.value,
                        }))
                      }
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: Música"
                    />
                    <datalist id="department-options">
                      {departmentOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Congregação
                    </label>
                    <input
                      type="text"
                      list="congregation-options"
                      value={form.congregation}
                      onChange={(event) => {
                        const value = event.target.value;
                        const match = congregations.find(
                          (item) => item.name === value
                        );
                        setForm((prev) => ({
                          ...prev,
                          congregation: value,
                          sector: match?.sector ?? prev.sector,
                        }));
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                      placeholder="Ex.: Cong. Matriz"
                    />
                    <datalist id="congregation-options">
                      {formCongregationOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Fotos
                  </label>
                  <p className="text-xs text-slate-400 mb-3">
                    Envie uma ou mais fotos do patrimônio.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {form.photos.length ? (
                      form.photos.map((photo, index) => (
                        <div
                          key={`${photo}-${index}`}
                          className="relative w-20 h-20 rounded-2xl border border-slate-200 overflow-hidden"
                        >
                          <Image
                            src={safePhoto(photo) || DEFAULT_PHOTO}
                            alt="Foto do patrimônio"
                            width={80}
                            height={80}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-white/90 text-slate-500 text-xs flex items-center justify-center shadow"
                            aria-label="Remover foto"
                          >
                            ×
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="w-20 h-20 rounded-2xl border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                        Sem fotos
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <input
                      id="patrimony-photo-upload"
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={(event) => {
                        const files = Array.from(event.target.files || []);
                        if (files.length) {
                          void uploadPhotos(files);
                        }
                      }}
                      className="sr-only"
                    />
                    <label
                      htmlFor="patrimony-photo-upload"
                      onDrop={handlePhotoDrop}
                      onDragOver={handlePhotoDragOver}
                      onDragEnter={() => setIsDraggingPhotos(true)}
                      onDragLeave={() => setIsDraggingPhotos(false)}
                      className={`flex flex-col items-center justify-center gap-2 px-4 py-5 rounded-xl border-2 border-dashed text-sm font-medium transition cursor-pointer w-full sm:w-auto sm:min-w-[240px] ${
                        isDraggingPhotos || uploading
                          ? "border-blue-400 bg-blue-50 text-blue-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>Arraste as fotos aqui</span>
                      <span className="text-xs text-slate-500">
                        ou clique para enviar
                      </span>
                    </label>
                    {uploading ? (
                      <span className="text-xs text-slate-500">
                        Enviando fotos...
                      </span>
                    ) : null}
                  </div>
                  {uploadError ? (
                    <p className="text-xs text-red-600 mt-2">{uploadError}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={!canSubmit || saving}
                    className={`px-6 py-3 rounded-xl bg-blue-600 text-white font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition disabled:opacity-60 disabled:cursor-not-allowed ${
                      saving ? "animate-pulse" : ""
                    }`}
                  >
                    {saving
                      ? "Salvando..."
                      : editingId
                      ? "Salvar alterações"
                      : "Adicionar patrimônio"}
                  </button>
                  {editingId ? (
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition"
                    >
                      Cancelar
                    </button>
                  ) : null}
                </div>
              </form>
            </section>

            <section className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm">
              <div className="flex flex-col gap-4 mb-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-slate-900">
                    Lista de patrimônio
                  </h2>
                  <span className="text-sm text-slate-500">
                    {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (allFilteredSelected) {
                          setSelectedIds((prev) =>
                            prev.filter(
                              (id) => !filteredItems.some((item) => item.id === id)
                            )
                          );
                        } else {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            filteredItems.forEach((item) => next.add(item.id));
                            return Array.from(next);
                          });
                        }
                      }}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      {allFilteredSelected ? "Desmarcar todos" : "Selecionar todos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      disabled={selectedIds.length === 0}
                      className="px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition disabled:opacity-50"
                    >
                      Limpar seleção
                    </button>
                    <span className="text-xs text-slate-500">
                      {selectedIds.length} selecionado
                      {selectedIds.length === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handlePrintBatch(selectedItems, "Etiquetas selecionadas")
                      }
                      disabled={selectedIds.length === 0 || printing}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-60"
                    >
                      Imprimir selecionadas
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handlePrintBatch(filteredItems, "Etiquetas patrimônio")
                      }
                      disabled={!filteredItems.length || printing}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
                    >
                      Imprimir todas
                    </button>
                  </div>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                    placeholder="Buscar por nome, setor, congregação..."
                  />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <select
                      value={filterCongregation}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFilterCongregation(value);
                        if (value) {
                          const sector = congregationSectorMap.get(value);
                          if (sector) setFilterSector(sector);
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    >
                      <option value="">Todas as congregações</option>
                      {filterCongregationOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterDepartment}
                      onChange={(event) => setFilterDepartment(event.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    >
                      <option value="">Todos os departamentos</option>
                      {departmentOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filterSector}
                      onChange={(event) => {
                        const value = event.target.value;
                        setFilterSector(value);
                        if (filterCongregation) {
                          const sector = congregationSectorMap.get(
                            filterCongregation
                          );
                          if (sector && sector !== value) {
                            setFilterCongregation("");
                          }
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                    >
                      <option value="">Todos os setores</option>
                      {sectorOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setScannerOpen(true)}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                    >
                      Ler QR Code
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const header = [
                          "ID",
                          "Nome",
                          "Aquisição",
                          "Departamento",
                          "Congregação",
                          "Setor",
                        ];
                        const rows = filteredItems.map((item) => [
                          getDisplayId(item),
                          item.name,
                          formatMonthYear(item.acquiredAt),
                          item.department || "",
                          item.congregation || "",
                          item.sector || "",
                        ]);
                        const csv = [
                          header.map(csvEscape).join(","),
                          ...rows.map((row) =>
                            row.map((cell) => csvEscape(String(cell))).join(",")
                          ),
                        ].join("\n");
                        const blob = new Blob([csv], {
                          type: "text/csv;charset=utf-8;",
                        });
                        const url = URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = "patrimonio.csv";
                        link.click();
                        URL.revokeObjectURL(url);
                      }}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                    >
                      Baixar CSV
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const w = window.open("", "_blank");
                        if (!w) return;
                        const rows = filteredItems
                          .map((item) => {
                            return `<tr>
                              <td>${getDisplayId(item)}</td>
                              <td>${item.name}</td>
                              <td>${formatMonthYear(item.acquiredAt)}</td>
                              <td>${item.department || ""}</td>
                              <td>${item.congregation || ""}</td>
                              <td>${item.sector || ""}</td>
                            </tr>`;
                          })
                          .join("");
                        w.document.write(`
                          <html>
                            <head>
                              <title>Lista de Patrimônio</title>
                              <style>
                                body { font-family: Arial, sans-serif; padding: 24px; }
                                table { width: 100%; border-collapse: collapse; font-size: 12px; }
                                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                                th { background: #f3f4f6; }
                              </style>
                            </head>
                            <body>
                              <h1>Lista de Patrimônio</h1>
                              <table>
                                <thead>
                                  <tr>
                                    <th>ID</th>
                                    <th>Nome</th>
                                    <th>Aquisição</th>
                                    <th>Departamento</th>
                                    <th>Congregação</th>
                                    <th>Setor</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  ${rows}
                                </tbody>
                              </table>
                              <script>
                                window.onload = () => { window.print(); };
                              </script>
                            </body>
                          </html>
                        `);
                        w.document.close();
                      }}
                      className="px-4 py-2 rounded-full text-sm font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      Imprimir lista
                    </button>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className="text-slate-500">Carregando...</p>
              ) : filteredItems.length === 0 ? (
                <p className="text-slate-500">Nenhum patrimônio cadastrado.</p>
              ) : (
                <div ref={listRef} className="space-y-4">
                  {paginatedItems.map((item) => {
                    const preview = safePhoto(item.photos?.[0]) || DEFAULT_PHOTO;
                    return (
                      <div
                        key={item.id}
                        className="border border-slate-100 rounded-2xl p-4 flex gap-4 items-start"
                      >
                        <div className="w-16 h-16 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden">
                          <Image
                            src={preview}
                            alt={item.name}
                            width={64}
                            height={64}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-bold text-slate-800">
                                {item.name}
                              </h3>
                              <p className="text-xs text-slate-500 mt-1">
                                ID: {getDisplayId(item)}
                              </p>
                              {item.department ? (
                                <p className="text-xs text-slate-500 mt-1">
                                  Departamento: {item.department}
                                </p>
                              ) : null}
                              {item.congregation ? (
                                <p className="text-xs text-slate-500 mt-1">
                                  Congregação: {item.congregation}
                                </p>
                              ) : null}
                              {item.sector ? (
                                <p className="text-xs text-slate-500 mt-1">
                                  Setor: {item.sector}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {item.acquiredAt ? (
                                <div className="text-xs font-semibold text-slate-500">
                                  {formatMonthYear(item.acquiredAt)}
                                </div>
                              ) : null}
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(item.id)}
                                onChange={() => toggleSelection(item.id)}
                                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                aria-label={`Selecionar ${item.name}`}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2 mt-3">
                            <button
                              type="button"
                              onClick={() => handleEdit(item)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            >
                              Editar
                            </button>
                            {item.photos && item.photos.length > 0 ? (
                              <button
                                type="button"
                                onClick={() => openPhotoViewer(item.photos ?? [])}
                                className="px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                              >
                                Ver fotos ({item.photos.length})
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => setActiveLabel(item)}
                              className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
                            >
                              Etiqueta (QR)
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
                      </div>
                    );
                  })}
                </div>
              )}
              {!loading && filteredItems.length > pageSize ? (
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
        )}

      {activeLabel ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          onClick={() => setActiveLabel(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-lg w-full overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
                  Etiqueta Patrimônio
                </p>
                <h3 className="text-xl font-bold text-slate-900">
                  {activeLabel.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLabel(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="px-6 py-6">
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="grid grid-cols-[150px_1fr] gap-0">
                  <div className="bg-slate-50 border-r border-slate-200 p-4 flex items-center justify-center">
                    {labelQr ? (
                      <img
                        src={labelQr}
                        alt="QR Code"
                        className="w-full h-auto"
                      />
                    ) : (
                      <span className="text-xs text-slate-400">
                        Gerando QR...
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex flex-col justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-500">
                        Patrimônio
                      </p>
                      <h4 className="text-lg font-semibold text-slate-900">
                        Nº {getDisplayId(activeLabel)}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                      <img
                        src={DEFAULT_PHOTO}
                        alt="IEADSM"
                        className="h-6 w-6 object-contain"
                      />
                      <span>IEADSM</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-5">
                <button
                  type="button"
                  onClick={handlePrintLabel}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
                >
                  Imprimir etiqueta
                </button>
                {activeLabelUrl ? (
                  <a
                    href={activeLabelUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
                  >
                    Abrir identificação
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {photoViewer ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/70 px-4"
          onClick={() => setPhotoViewer(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-4xl w-full overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Fotos do patrimônio
                </p>
                <p className="text-sm text-slate-600">
                  {photoViewer.index + 1} de {photoViewer.photos.length}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPhotoViewer(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            <div className="bg-slate-50">
              <div className="relative w-full h-[60vh] flex items-center justify-center">
                <Image
                  src={
                    safePhoto(photoViewer.photos[photoViewer.index]) ||
                    DEFAULT_PHOTO
                  }
                  alt="Foto do patrimônio"
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
            <div className="px-6 py-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() =>
                  setPhotoViewer((prev) => {
                    if (!prev) return prev;
                    const nextIndex =
                      (prev.index - 1 + prev.photos.length) %
                      prev.photos.length;
                    return { ...prev, index: nextIndex };
                  })
                }
                className="px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Anterior
              </button>
              <div className="flex gap-2 overflow-x-auto max-w-[60%]">
                {photoViewer.photos.map((photo, index) => (
                  <button
                    key={`${photo}-${index}`}
                    type="button"
                    onClick={() =>
                      setPhotoViewer((prev) =>
                        prev ? { ...prev, index } : prev
                      )
                    }
                    className={`relative h-12 w-12 flex-none rounded-xl border overflow-hidden ${
                      index === photoViewer.index
                        ? "border-blue-500"
                        : "border-slate-200"
                    }`}
                    aria-label={`Ver foto ${index + 1}`}
                  >
                    <Image
                      src={safePhoto(photo) || DEFAULT_PHOTO}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setPhotoViewer((prev) => {
                    if (!prev) return prev;
                    const nextIndex = (prev.index + 1) % prev.photos.length;
                    return { ...prev, index: nextIndex };
                  })
                }
                className="px-4 py-2 rounded-full text-sm font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                Próxima
              </button>
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
                  Aponte a câmera para a etiqueta.
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
      </main>
    </div>
  );
}
