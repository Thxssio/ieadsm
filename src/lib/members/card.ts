export type PrintMode = "print" | "download";

export type CardMember = {
  id?: string;
  idInterno?: string;
  cargo?: string;
  name?: string;
  createdAt?: string;
  dataNascimento?: string;
  estadoCivil?: string;
  cpf?: string;
  rg?: string;
  pai?: string;
  mae?: string;
  photo?: string;
};

export type CardSettings = {
  locationAddress1?: string;
  locationAddress2?: string;
  locationCep?: string;
  presidentSignatureName?: string;
  presidentSignatureRole?: string;
};

const cargoLabels: Record<string, string> = {
  membro: "Membro",
  auxiliar: "Auxiliar",
  diacono: "Diácono",
  presbitero: "Presbítero",
  evangelista: "Evangelista",
  pastor: "Pastor",
  "pastor-presidente": "Pastor Presidente",
};

const escapeHtml = (input: string) =>
  String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString("pt-BR");
  }
  if (value.includes("-")) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
};

const formatDateShort = (value?: string) => {
  if (!value) return "-";
  if (value.includes("-")) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
};

const normalizeCargoValue = (value?: string) => {
  const raw = (value ?? "").trim().toLowerCase();
  if (!raw) return "membro";
  if (raw.includes("pastor") && raw.includes("presidente")) {
    return "pastor-presidente";
  }
  if (raw.startsWith("pastor")) return "pastor";
  if (raw.startsWith("evangel")) return "evangelista";
  if (raw.startsWith("presb")) return "presbitero";
  if (raw.startsWith("diac")) return "diacono";
  if (raw.startsWith("aux")) return "auxiliar";
  if (raw.startsWith("membro")) return "membro";
  return raw.replace(/\s+/g, "-");
};

const formatCargo = (value?: string) =>
  cargoLabels[normalizeCargoValue(value)] ?? cargoLabels.membro;

export const resolveCarteiraTitle = (cargo?: string) =>
  `Carteira de ${formatCargo(cargo)}`;

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("data:")) return photo;
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const resolvePhotoForCard = async (photo?: string) => {
  const src = safePhoto(photo);
  if (!src) return "";
  if (src.startsWith("data:")) return src;
  const fetchAsDataUrl = async (url: string) => {
    try {
      const response = await fetch(url, { mode: "cors", cache: "force-cache" });
      if (!response.ok) return "";
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) return "";
      const dataUrl = await blobToDataUrl(blob);
      return dataUrl || "";
    } catch {
      return "";
    }
  };

  const direct = await fetchAsDataUrl(src);
  if (direct) return direct;

  if (src.startsWith("http://") || src.startsWith("https://")) {
    const proxyUrl = `/api/card-photo?url=${encodeURIComponent(src)}`;
    const proxied = await fetchAsDataUrl(proxyUrl);
    if (proxied) return proxied;
  }

  return src;
};

const displayValue = (value?: string) => {
  const cleaned = (value ?? "").trim();
  return cleaned ? escapeHtml(cleaned) : "&nbsp;";
};

export const buildMemberQrPayload = (member: CardMember) => {
  const clean = (value?: string) => value?.trim() || "";
  const idLabel = member.idInterno?.trim() || member.id || "";
  const issuedAt = new Date().toLocaleDateString("pt-BR");
  const memberSince = formatDate(member.createdAt) || "-";
  const birthDate = formatDateShort(member.dataNascimento);

  const payload: {
    v: number;
    data: Record<string, string>;
  } = {
    v: 1,
    data: {
      id: idLabel,
      nome: clean(member.name),
      cargo: clean(member.cargo),
      expedidaEm: issuedAt,
      membroDesde: memberSince,
      filiacaoPai: clean(member.pai),
      filiacaoMae: clean(member.mae),
      nascimento: birthDate,
      estadoCivil: clean(member.estadoCivil),
      cpf: formatCpf(member.cpf ?? ""),
      rg: clean(member.rg),
    },
  };

  const data = payload.data;
  Object.keys(data).forEach((key) => {
    if (!data[key]) {
      delete data[key];
    }
  });

  return JSON.stringify(payload);
};

export const buildCarteiraMarkup = (
  member: CardMember,
  qrDataUrl: string,
  settings: CardSettings
) => {
  const idLabel = member.idInterno?.trim() || member.id || "N/D";
  const carteiraTitle = resolveCarteiraTitle(member.cargo);
  const cargoLabel = formatCargo(member.cargo).toUpperCase();
  const issuedAt = new Date().toLocaleDateString("pt-BR");
  const memberSince = formatDate(member.createdAt) || "-";
  const birthDate = formatDateShort(member.dataNascimento);
  const estadoCivil = member.estadoCivil?.trim() || "-";
  const cpf = formatCpf(member.cpf ?? "") || "-";
  const rg = member.rg?.trim() || "-";
  const pai = member.pai?.trim() || "-";
  const mae = member.mae?.trim() || "-";
  const photoSrc = safePhoto(member.photo);
  const photoMarkup = photoSrc
    ? `<img src="${escapeHtml(photoSrc)}" alt="Foto" />`
    : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:10px;color:#999;">SEM FOTO</div>`;

  const addressLine = [
    settings.locationAddress1,
    settings.locationAddress2,
    settings.locationCep,
  ]
    .filter(Boolean)
    .join(" - ");
  const pastorName = settings.presidentSignatureName || "";
  const pastorRole = settings.presidentSignatureRole || "";

  return `
      <div class="card-page">
        <div class="card-sheet">
          <div class="card front">
          <div class="front-header">
            <div class="brand">
              <div class="brand-logo">
                <img src="/logo.png" alt="Logo" />
              </div>
              <div class="brand-text">
                <span class="brand-name">Igreja Evangelica Assembleia de Deus</span>
                <span class="brand-sub">SANTA MARIA</span>
              </div>
            </div>
            <div class="header-right">
              <div class="card-title">${escapeHtml(carteiraTitle)}</div>
              <div class="card-chip">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <div class="front-body">
            <div class="photo-box">${photoMarkup}</div>
            <div class="front-info">
              <div class="name-block">
                <span class="label">Nome</span>
                <span class="value name">${displayValue(member.name)}</span>
              </div>
              <div class="meta-grid">
                <div>
                  <span class="label">Cargo</span>
                  <div class="value">${displayValue(cargoLabel)}</div>
                </div>
                <div>
                  <span class="label">ID</span>
                  <div class="value">${displayValue(idLabel)}</div>
                </div>
                <div>
                  <span class="label">Expedição</span>
                  <div class="value">${displayValue(issuedAt)}</div>
                </div>
                <div>
                  <span class="label">Membro Desde</span>
                  <div class="value">${displayValue(memberSince)}</div>
                </div>
              </div>
            </div>
          </div>

          <div class="front-footer">
            Documento Intransferível
          </div>
          </div>

          <div class="card back">
          <div class="back-header">
            <div>
              <div class="back-title">Dados Pessoais</div>
            </div>
            <div class="back-id">ID <span>${displayValue(idLabel)}</span></div>
          </div>

          <div class="back-body">
            <div class="back-grid">
              <div class="info-block grid-full">
                <span class="label">Filiação</span>
                <span class="value">${displayValue(pai)}</span>
                <span class="value">${displayValue(mae)}</span>
              </div>

              <div class="info-block grid-col-1">
                <span class="label">Nascimento</span>
                <span class="value">${displayValue(birthDate)}</span>
              </div>
              
              <div class="info-block grid-col-1">
                <span class="label">Estado Civil</span>
                <span class="value">${displayValue(estadoCivil)}</span>
              </div>

              <div class="grid-qr-area">
                <img src="${qrDataUrl}" class="qr-img" alt="QR" />
              </div>

              <div class="info-block grid-col-1">
                <span class="label">CPF</span>
                <span class="value">${displayValue(cpf)}</span>
              </div>

              <div class="info-block grid-col-1">
                <span class="label">RG</span>
                <span class="value">${displayValue(rg)}</span>
              </div>
            </div>

            <div class="back-bottom">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="pastor-info">${displayValue(pastorName)}</div>
                <div class="pastor-role">${displayValue(pastorRole)}</div>
              </div>
              ${addressLine ? `<div class="address">${displayValue(addressLine)}</div>` : ""}
            </div>
          </div>
          </div>
        </div>
      </div>
    `;
};

export const buildCarteiraDocument = (
  sheets: string,
  options?: {
    mode?: PrintMode;
    filename?: string;
    pageSelector?: string;
    toolbar?: boolean;
    title?: string;
    forceDesktop?: boolean;
    showPrintButton?: boolean;
  }
) => {
  const mode = options?.mode ?? "print";
  const filename = options?.filename ?? "carteira-membro";
  const pageSelector = options?.pageSelector ?? ".card-page";
  const toolbar = options?.toolbar ?? false;
  const toolbarTitle = options?.title ?? "Carteira de Membro";
  const showPrintButton = options?.showPrintButton ?? true;
  const forceDesktop = options?.forceDesktop ?? false;
  const documentTitle = toolbarTitle;
  const includePdfScripts = mode === "download" || toolbar;
  const downloadScripts = includePdfScripts
    ? `
        <script src="https://cdn.jsdelivr.net/npm/html2canvas-pro@1.6.6/dist/html2canvas-pro.min.js"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
      `
    : "";

  const actionScript =
    toolbar
      ? `
          const waitForImages = () => {
            const images = Array.from(document.images || []);
            return Promise.all(
              images.map(
                (img) =>
                  img.complete
                    ? Promise.resolve()
                    : new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                      })
              )
            );
          };

          const waitForFonts = async () => {
            if (document.fonts && document.fonts.ready) {
              try {
                await document.fonts.ready;
              } catch {
                // ignore
              }
            }
          };

          const initialForceDesktop = document.body.classList.contains("force-desktop");
          let isExporting = false;

          const setDesktopMode = (enabled = true) => {
            document.body.classList.toggle("force-desktop", enabled);
          };

          const setExporting = (enabled = true) => {
            document.body.classList.toggle("exporting", enabled);
            isExporting = enabled;
          };

          const setDesktopScale = (value = 1) => {
            document.body.style.setProperty("--desktop-scale", String(value));
          };

          const setDesktopPageSize = (width, height) => {
            const pages = Array.from(document.querySelectorAll("${pageSelector}"));
            pages.forEach((page) => {
              page.style.setProperty("--desktop-page-width", String(width) + "px");
              page.style.setProperty("--desktop-page-height", String(height) + "px");
            });
          };

          const clearDesktopPageSize = () => {
            const pages = Array.from(document.querySelectorAll("${pageSelector}"));
            pages.forEach((page) => {
              page.style.removeProperty("--desktop-page-width");
              page.style.removeProperty("--desktop-page-height");
            });
          };

          const applyDesktopScale = () => {
            if (!document.body.classList.contains("force-desktop")) return;
            if (isExporting) return;
            setDesktopScale(1);
            clearDesktopPageSize();
            const target = document.querySelector("${pageSelector}");
            if (!target) return;
            const measureTarget =
              target.querySelector(".card-sheet") || target;
            const rect = measureTarget.getBoundingClientRect();
            const viewportWidth = Math.min(
              window.visualViewport?.width || window.innerWidth,
              document.documentElement.clientWidth
            );
            const available = viewportWidth - 24;
            if (available <= 0 || rect.width <= 0) return;
            const scale = Math.min(1, available / rect.width);
            setDesktopScale(scale);
            setDesktopPageSize(rect.width * scale, rect.height * scale);
          };

          const scheduleDesktopScale = () => {
            requestAnimationFrame(() => setTimeout(applyDesktopScale, 30));
          };

          const setToolbarHidden = (hidden = true) => {
            document.body.classList.toggle("hide-toolbar", hidden);
          };

          const waitForLayout = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => setTimeout(resolve, 60))
            );

          const cleanup = () => {
            if (!initialForceDesktop) {
              setDesktopMode(false);
            }
            setToolbarHidden(false);
            if (initialForceDesktop) {
              scheduleDesktopScale();
            } else {
              setDesktopScale(1);
              clearDesktopPageSize();
            }
            setExporting(false);
          };

          const exportPdf = async () => {
            try {
              const elements = Array.from(document.querySelectorAll("${pageSelector}"));
              if (!elements.length) return;
              const { jsPDF } = window.jspdf || {};
              const html2canvasFn = window.html2canvas || window.html2canvasPro;
              if (!jsPDF || !html2canvasFn) {
                window.print();
                return;
              }
              const renderScale = Math.min(
                4,
                Math.max(2, window.devicePixelRatio || 2)
              );
              const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
              for (let i = 0; i < elements.length; i += 1) {
                const canvas = await html2canvasFn(elements[i], {
                  scale: renderScale,
                  useCORS: true,
                  backgroundColor: "#ffffff",
                });
                const imgData = canvas.toDataURL("image/png");
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const offsetY = Math.max(0, (297 - imgHeight) / 2);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, offsetY, imgWidth, imgHeight);
              }
              pdf.save("${filename}.pdf");
            } catch (err) {
              window.print();
            }
          };

          const runDownload = async () => {
            setExporting(true);
            setDesktopMode(true);
            setDesktopScale(1);
            clearDesktopPageSize();
            setToolbarHidden(true);
            await waitForLayout();
            await waitForImages();
            await waitForFonts();
            await exportPdf();
            setTimeout(() => cleanup(), 300);
          };

          const runPrint = async () => {
            setExporting(true);
            setDesktopMode(true);
            setDesktopScale(1);
            clearDesktopPageSize();
            setToolbarHidden(true);
            await waitForLayout();
            await waitForImages();
            await waitForFonts();
            const finalize = () => cleanup();
            window.onafterprint = () => finalize();
            window.print();
            setTimeout(() => finalize(), 2000);
          };

          const downloadBtn = document.getElementById("toolbar-download");
          const printBtn = document.getElementById("toolbar-print");
          const closeBtn = document.getElementById("toolbar-close");

          if (downloadBtn) {
            downloadBtn.addEventListener("click", () => runDownload());
          }
          if (printBtn) {
            printBtn.addEventListener("click", () => runPrint());
          }
          if (closeBtn) {
            closeBtn.addEventListener("click", () => {
              if (window.opener && !window.opener.closed) {
                window.close();
              } else {
                window.history.back();
              }
            });
          }

          Promise.resolve()
            .then(() => waitForImages())
            .then(() => waitForFonts())
            .then(() => scheduleDesktopScale());

          window.addEventListener("resize", () => scheduleDesktopScale());
        `
      : mode === "download"
      ? `
          const waitForImages = () => {
            const images = Array.from(document.images || []);
            return Promise.all(
              images.map(
                (img) =>
                  img.complete
                    ? Promise.resolve()
                    : new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                      })
              )
            );
          };

          const waitForFonts = async () => {
            if (document.fonts && document.fonts.ready) {
              try {
                await document.fonts.ready;
              } catch {
                // ignore
              }
            }
          };

          const setDesktopMode = (enabled = true) => {
            document.body.classList.toggle("force-desktop", enabled);
          };

          const setExporting = (enabled = true) => {
            document.body.classList.toggle("exporting", enabled);
          };

          const waitForLayout = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => setTimeout(resolve, 60))
            );

          const exportPdf = async () => {
            try {
              const elements = Array.from(document.querySelectorAll("${pageSelector}"));
              if (!elements.length) return;
              const { jsPDF } = window.jspdf || {};
              const html2canvasFn = window.html2canvas || window.html2canvasPro;
              if (!jsPDF || !html2canvasFn) {
                window.print();
                return;
              }
              const renderScale = Math.min(
                4,
                Math.max(2, window.devicePixelRatio || 2)
              );
              const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
              for (let i = 0; i < elements.length; i += 1) {
                const canvas = await html2canvasFn(elements[i], {
                  scale: renderScale,
                  useCORS: true,
                  backgroundColor: "#ffffff",
                });
                const imgData = canvas.toDataURL("image/png");
                const imgWidth = 210;
                const imgHeight = (canvas.height * imgWidth) / canvas.width;
                const offsetY = Math.max(0, (297 - imgHeight) / 2);
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, "PNG", 0, offsetY, imgWidth, imgHeight);
              }
              pdf.save("${filename}.pdf");
              setTimeout(() => window.close(), 100);
            } catch (err) {
              window.print();
            }
          };

          const triggerExport = () => {
            setExporting(true);
            setDesktopMode(true);
            setTimeout(() => {
              waitForLayout().then(exportPdf);
            }, 80);
          };
        `
      : `
          const waitForImages = () => {
            const images = Array.from(document.images || []);
            return Promise.all(
              images.map(
                (img) =>
                  img.complete
                    ? Promise.resolve()
                    : new Promise((resolve) => {
                        img.onload = resolve;
                        img.onerror = resolve;
                      })
              )
            );
          };

          const setDesktopMode = (enabled = true) => {
            document.body.classList.toggle("force-desktop", enabled);
          };

          const setExporting = (enabled = true) => {
            document.body.classList.toggle("exporting", enabled);
          };

          const waitForLayout = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => setTimeout(resolve, 60))
            );

          const triggerPrint = () => {
            setExporting(true);
            setDesktopMode(true);
            setTimeout(() => {
              waitForLayout().then(() => window.print());
            }, 80);
          };
        `;

  const triggerAction = mode === "download" ? "triggerExport" : "triggerPrint";
  const toolbarMarkup = toolbar
    ? `
        <div class="toolbar">
          <div class="toolbar-title">${escapeHtml(toolbarTitle)}</div>
          <div class="toolbar-actions">
            ${
              showPrintButton
                ? '<button id="toolbar-print" type="button">Imprimir</button>'
                : ""
            }
            <button id="toolbar-download" type="button">Baixar PDF</button>
            <button id="toolbar-close" type="button">Fechar</button>
          </div>
        </div>
      `
    : "";

  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(documentTitle)}</title>
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap");

          :root {
            --ink: #0b1120;
            --muted: #64748b;
            --accent: #0ea5a4;
            --accent-strong: #2563eb;
            --accent-soft: #dbeafe;
            --paper: #f8fafc;
            --line: #e2e8f0;
            --page-width: 210mm;
            --page-height: 297mm;
            --card-width: 160mm; 
            --card-height: 100mm;
          }

          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }

          body {
            font-family: "Manrope", sans-serif;
            background: #e2e8f0;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
          }

          body.has-toolbar {
            flex-direction: column;
            justify-content: flex-start;
            padding: 16px 0 24px;
          }

          body.force-desktop {
            --desktop-scale: 1;
            overflow-x: hidden;
            align-items: flex-start;
            justify-content: flex-start;
            padding: 16px 0 24px;
          }

          @page {
            size: A4;
            margin: 0;
          }

          .card-page {
            width: var(--page-width);
            height: var(--page-height);
            display: flex;
            align-items: center;
            justify-content: center;
            page-break-after: always;
            overflow: visible;
          }

          .card-page:last-child {
            page-break-after: auto;
          }

          .card-sheet {
            width: var(--page-width);
            height: var(--page-height);
            padding: 10mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5mm;
          }

          body.force-desktop .card-page {
            width: var(--desktop-page-width, var(--page-width));
            height: var(--desktop-page-height, var(--page-height));
          }

          body.force-desktop .card-sheet {
            transform: scale(var(--desktop-scale));
            transform-origin: top center;
          }

          body.force-desktop:not(.exporting) .card-page {
            height: auto;
            min-height: 0;
            padding: 8px 0 16px;
          }

          body.force-desktop:not(.exporting) {
            align-items: center;
          }

          body.force-desktop:not(.exporting) .card-sheet {
            width: fit-content;
            height: auto;
            padding: 6mm 6mm 8mm;
            gap: 6mm;
          }
          .card {
            width: var(--card-width);
            height: var(--card-height);
            border-radius: 18px;
            border: 1px solid var(--line);
            background: var(--paper);
            position: relative;
            overflow: hidden;
            box-shadow: 0 14px 32px rgba(15, 23, 42, 0.18);
            flex-shrink: 0;
          }

          .card.front {
            background: linear-gradient(140deg, #f8fafc 0%, #e0f2fe 40%, #dbeafe 100%);
          }

          .card.front::before {
            content: "";
            position: absolute;
            width: 120mm;
            height: 120mm;
            background: radial-gradient(circle at 30% 30%, rgba(14, 165, 233, 0.38), transparent 60%);
            top: -70mm;
            right: -40mm;
            z-index: 0;
          }

          .card.front::after {
            content: "";
            position: absolute;
            bottom: 0;
            left: 0;
            height: 12mm;
            width: 100%;
            background: linear-gradient(90deg, #0b1120 0%, #0ea5a4 60%, #22d3ee 100%);
            z-index: 1;
          }

          .front-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 8mm 10mm 4mm;
            padding: 3mm 5mm;
            position: relative;
            z-index: 2;
            border-radius: 12px;
            background: rgba(255, 255, 255, 0.85);
            border: 1px solid rgba(15, 23, 42, 0.05);
          }

          .brand {
            display: flex;
            align-items: center;
            gap: 3mm;
          }

          .brand-logo {
            width: 14mm;
            height: 14mm;
            border-radius: 50%;
            background: #fff;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .brand-logo img {
            width: 80%;
            height: 80%;
            object-fit: contain;
          }

          .brand-text {
            display: flex;
            flex-direction: column;
          }

          .brand-name {
            font-family: "Space Grotesk", sans-serif;
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: var(--ink);
          }

          .brand-sub {
            font-size: 8px;
            color: var(--muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .header-right {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: 1mm;
          }

          .card-title {
            font-family: "Space Grotesk", sans-serif;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--ink);
          }

          .card-chip {
            width: 20mm;
            height: 12mm;
            border-radius: 4px;
            background: linear-gradient(135deg, #1e293b, #0f766e);
            border: 1px solid rgba(255,255,255,0.3);
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 2px;
            padding: 0 4px;
          }
          
          .card-chip span {
            height: 1px;
            background: rgba(255,255,255,0.4);
            width: 100%;
          }

          .front-body {
            display: grid;
            grid-template-columns: 35mm 1fr;
            gap: 6mm;
            padding: 0 10mm 6mm;
            position: relative;
            z-index: 2;
          }

          .photo-box {
            width: 35mm;
            height: 48mm;
            border-radius: 8px;
            border: 3px solid #fff;
            background: #e2e8f0;
            overflow: hidden;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
          }

          .front-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            gap: 4mm;
          }

          .name-block {
            display: flex;
            flex-direction: column;
          }

          .label {
            font-size: 8px;
            text-transform: uppercase;
            color: var(--muted);
            font-weight: 700;
            margin-bottom: 1px;
          }

          .value {
            font-size: 11px;
            color: var(--ink);
            font-weight: 700;
            text-transform: uppercase;
            line-height: 1.2;
          }

          .value.name {
            font-family: "Space Grotesk", sans-serif;
            font-size: 18px;
            color: var(--accent-strong);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }

          .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 3mm 4mm;
            background: rgba(255,255,255,0.6);
            padding: 3mm;
            border-radius: 8px;
            border: 1px solid rgba(0,0,0,0.05);
          }

          .front-footer {
            position: absolute;
            bottom: 3mm;
            right: 10mm;
            font-size: 7px;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #fff;
            z-index: 3;
          }

          .card.back {
            background: var(--paper);
          }

          .card.back::before {
            content: "";
            position: absolute;
            inset: 0;
            background: linear-gradient(180deg, #0f172a 0%, #0f172a 32mm, #f8fafc 32mm, #f8fafc 100%);
            z-index: 0;
          }

          .back-header {
            position: relative;
            z-index: 2;
            display: flex;
            justify-content: space-between;
            padding: 6mm 10mm;
            color: #fff;
          }

          .back-title {
            font-family: "Space Grotesk", sans-serif;
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
          }

          .back-id {
            border: 1px solid rgba(255,255,255,0.3);
            border-radius: 20px;
            padding: 1mm 3mm;
            font-size: 10px;
            font-family: "Space Grotesk", monospace;
            background: rgba(0,0,0,0.2);
          }

          .back-body {
            position: relative;
            z-index: 2;
            padding: 4mm 10mm 8mm;
            height: calc(100% - 32mm);
            display: flex;
            flex-direction: column;
            gap: 4mm;
          }

          .back-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 30mm;
            gap: 3mm;
            background: #fff;
            border-radius: 10px;
            padding: 3mm;
            box-shadow: 0 4px 15px rgba(0,0,0,0.05);
            border: 1px solid var(--line);
          }

          .grid-full { grid-column: 1 / -1; }
          .grid-col-1 { grid-column: span 1; }
          .grid-qr-area { 
            grid-column: 3; 
            grid-row: 2 / 4;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
          }

          .info-block {
            display: flex;
            flex-direction: column;
          }

          .info-block .value {
            font-size: 10px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .qr-img {
            width: 24mm;
            height: 24mm;
            object-fit: contain;
            image-rendering: crisp-edges;
            image-rendering: pixelated;
          }

          .back-bottom {
            margin-top: auto;
            display: flex;
            flex-direction: column;
            gap: 2mm;
          }

          .signature-line {
            width: 100%;
            height: 1px;
            background: #000;
            margin-bottom: 1mm;
          }

          .pastor-info {
            font-size: 10px;
            font-weight: 700;
            color: var(--ink);
          }
          .pastor-role {
            font-size: 8px;
            color: var(--muted);
            text-transform: uppercase;
          }

          .address {
            font-size: 7px;
            color: var(--muted);
            text-align: center;
            margin-top: 2mm;
          }

          @media print {
            body { 
              background: none; 
              display: block;
            }
            .toolbar {
              display: none !important;
            }
            .card-page {
              margin: 0 auto;
              page-break-after: always;
            }
          }

          .hide-toolbar .toolbar {
            display: none !important;
          }

          .toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            width: min(210mm, 96vw);
            margin: 0 auto 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 10px 16px;
            background: #0f172a;
            color: #fff;
            font-size: 11px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            border-radius: 999px;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.25);
          }

          .toolbar-actions {
            display: flex;
            gap: 8px;
            align-items: center;
          }

          .toolbar button {
            border: 1px solid rgba(255, 255, 255, 0.4);
            background: transparent;
            color: #fff;
            font-weight: 600;
            font-size: 10px;
            padding: 6px 12px;
            border-radius: 999px;
            cursor: pointer;
          }

          .toolbar button:hover {
            background: rgba(255, 255, 255, 0.12);
          }

          body.force-desktop:not(.exporting) .toolbar {
            width: min(420px, 92vw);
          }

          @media (max-width: 900px) {
            body:not(.force-desktop) {
              align-items: flex-start;
              padding: 16px 0 24px;
            }

            body:not(.force-desktop) .toolbar {
              width: min(420px, 92vw);
              flex-wrap: wrap;
              gap: 8px;
            }

            body:not(.force-desktop) .card-page {
              width: 100%;
              height: auto;
              min-height: 0;
              padding: 0;
            }

            body:not(.force-desktop) .card-sheet {
              width: 100%;
              height: auto;
              padding: 20px 12px;
              gap: 18px;
            }

            body:not(.force-desktop) .card {
              width: min(420px, 92vw);
              height: auto;
              min-height: var(--card-height);
            }

            body:not(.force-desktop) .front-header {
              flex-direction: column;
              align-items: flex-start;
              gap: 6px;
            }

            body:not(.force-desktop) .header-right {
              align-items: flex-start;
            }

            body:not(.force-desktop) .front-body {
              grid-template-columns: 1fr;
              padding-bottom: 10mm;
            }

            body:not(.force-desktop) .photo-box {
              width: 45mm;
              height: 58mm;
              margin: 0 auto;
            }

            body:not(.force-desktop) .meta-grid {
              grid-template-columns: 1fr;
            }

            body:not(.force-desktop) .back-header {
              flex-direction: column;
              gap: 3mm;
            }

            body:not(.force-desktop) .back-grid {
              grid-template-columns: 1fr;
            }

            body:not(.force-desktop) .grid-qr-area {
              grid-column: 1 / -1;
              grid-row: auto;
            }
          }

          @media (max-width: 520px) {
            body:not(.force-desktop) .card {
              width: 94vw;
            }

            body:not(.force-desktop) .front-header {
              margin: 6mm 6mm 4mm;
              padding: 2mm 3mm;
            }

            body:not(.force-desktop) .front-body {
              padding: 0 6mm 6mm;
            }

            body:not(.force-desktop) .back-header {
              padding: 6mm 6mm;
            }

            body:not(.force-desktop) .back-body {
              padding: 4mm 6mm 8mm;
            }
          }
        </style>
        ${downloadScripts}
      </head>
      <body class="${toolbar ? "has-toolbar" : ""}${forceDesktop ? " force-desktop" : ""}">
        ${toolbarMarkup}
        ${sheets}
        <script>
          ${actionScript}
          ${
            toolbar
              ? ""
              : `
          window.onload = () => {
            const waitResources = async () => {
              if (typeof waitForImages === "function") {
                await waitForImages();
              }
              if (typeof waitForFonts === "function") {
                await waitForFonts();
              }
            };
            waitResources().then(${triggerAction});
          };
          ${
            mode === "print"
              ? "window.onafterprint = () => setTimeout(() => window.close(), 50);"
              : ""
          }
          `
          }
        </script>
      </body>
    </html>
  `;
};
