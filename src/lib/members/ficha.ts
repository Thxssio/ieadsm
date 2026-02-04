"use client";

import type { PrintMode } from "@/lib/members/card";

type ChildInfo = {
  name?: string;
  cpf?: string;
  observacao?: string;
};

export type FichaMember = {
  id?: string;
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
};

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const escapeHtml = (input: string) =>
  String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const normalizeCpf = (value?: string) => (value ?? "").replace(/\D/g, "");
const normalizePhone = (value?: string) => (value ?? "").replace(/\D/g, "");

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

const formatDateForPrint = (value?: string) => {
  if (!value) return "";
  if (value.includes("-")) {
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
  }
  return value;
};

const displayValue = (value?: string) => {
  const cleaned = (value ?? "").trim();
  return cleaned ? escapeHtml(cleaned) : "&nbsp;";
};

const displayDateValue = (value?: string) => {
  const formatted = formatDateForPrint(value);
  return formatted ? escapeHtml(formatted) : "&nbsp;";
};

const displayCpfValue = (value?: string) => {
  const formatted = formatCpf(value);
  return formatted ? escapeHtml(formatted) : "&nbsp;";
};

const displayPhoneValue = (value?: string) => {
  const formatted = formatPhone(value);
  return formatted ? escapeHtml(formatted) : "&nbsp;";
};

const displayMultiline = (value?: string) => {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "&nbsp;";
  return escapeHtml(cleaned).replaceAll("\n", "<br />");
};

export const buildFichaMarkup = (member: FichaMember, title?: string) => {
  const registroTipoLabel =
    member.registroTipo === "Outros"
      ? `Outros${
          member.registroTipoOutro?.trim()
            ? `: ${member.registroTipoOutro.trim()}`
            : ""
        }`
      : member.registroTipo || "Registro";

  const filhos = Array.isArray(member.filhos)
    ? member.filhos
        .map((child) => ({
          name: child.name?.trim() ?? "",
          cpf: child.cpf?.trim() ?? "",
          observacao: child.observacao?.trim() ?? "",
        }))
        .filter((child) => child.name || child.cpf || child.observacao)
    : [];

  const filhosCount =
    member.qtdeFilhos?.trim() || (filhos.length ? String(filhos.length) : "-");
  const rowsToRender = Math.max(filhos.length, 3);
  const childRows = Array.from({ length: rowsToRender })
    .map((_, index) => {
      const child = filhos[index];
      return `
          <tr>
            <td>${child ? displayValue(child.name) : "&nbsp;"}</td>
            <td class="text-center">${
              child ? displayCpfValue(child.cpf) : "&nbsp;"
            }</td>
            <td class="text-center">${
              child ? displayValue(child.observacao) : "&nbsp;"
            }</td>
          </tr>
        `;
    })
    .join("");

  const logoSrc = "/logo.png";
  const photoSrc = safePhoto(member.photo);
  const photoMarkup = photoSrc
    ? `<img src="${escapeHtml(photoSrc)}" alt="Foto do membro" />`
    : `<div class="photo-placeholder">Sem foto</div>`;

  const isSolteiro = member.estadoCivil === "Solteiro(a)";
  const hasChildren = filhos.length > 0 || Boolean(member.qtdeFilhos?.trim());
  const maritalSection = isSolteiro
    ? ""
    : `
        <div class="section-title">Dados Matrimoniais</div>
        <div class="row">
          <div class="field col-3">
            <span class="label">Estado Civil</span>
            <div class="value">${displayValue(member.estadoCivil)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Data Casamento</span>
            <div class="value">${displayDateValue(member.dtCasamento)}</div>
          </div>
          <div class="field col-6">
            <span class="label">Cônjuge</span>
            <div class="value">${displayValue(member.nomeConjuge)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-3">
            <span class="label">CPF Cônjuge</span>
            <div class="value">${displayCpfValue(member.cpfConjuge)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Data Nasc. Cônjuge</span>
            <div class="value">${displayDateValue(
              member.dataNascimentoConjuge
            )}</div>
          </div>
          <div class="field col-3">
            <span class="label">Profissão Cônjuge</span>
            <div class="value">${displayValue(member.profissaoConjuge)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Grau Instrução Cônjuge</span>
            <div class="value">${displayValue(
              member.grauInstrucaoConjuge
            )}</div>
          </div>
        </div>
      `;

  const childrenSection = hasChildren
    ? `
        <div class="section-title">Filhos (Quantidade: ${escapeHtml(
          filhosCount
        )})</div>
        <table>
          <thead>
            <tr>
              <th>Nome do Filho(a)</th>
              <th class="text-center">CPF</th>
              <th class="text-center">Observação</th>
            </tr>
          </thead>
          <tbody>
            ${childRows}
          </tbody>
        </table>
      `
    : "";

  const observacoes = member.informacoes?.trim() || "";
  const observacoesSection = observacoes
    ? `
        <div class="section-title">Outras Informações</div>
        <div class="row">
          <div class="field col-12">
            <span class="label">Observações</span>
            <div class="value multiline">${displayMultiline(observacoes)}</div>
          </div>
        </div>
      `
    : "";

  return `
      <div class="page">
        <header>
          <div class="header-left">
            <img class="logo" src="${escapeHtml(logoSrc)}" alt="Logo" />
            <div class="titles">
              <div class="title">Ficha de Cadastro de Membro</div>
              <div class="subtitle">${escapeHtml(
                title || "Sistema de Gestão Eclesiástica"
              )}</div>
            </div>
          </div>
          <div class="photo">${photoMarkup}</div>
        </header>

        <div class="section-title">Dados de Registro</div>
        <div class="row">
          <div class="field col-3">
            <span class="label">ID Interno</span>
            <div class="value">${displayValue(member.idInterno)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Tipo de Registro</span>
            <div class="value">${displayValue(registroTipoLabel)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Congregação</span>
            <div class="value">${displayValue(member.congregacao)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Setor</span>
            <div class="value">${displayValue(member.setor)}</div>
          </div>
        </div>

        <div class="section-title">Dados Pessoais</div>
        <div class="row">
          <div class="field col-8">
            <span class="label">Nome Completo</span>
            <div class="value">${displayValue(member.name)}</div>
          </div>
          <div class="field col-2">
            <span class="label">Sexo</span>
            <div class="value">${displayValue(member.sexo)}</div>
          </div>
          <div class="field col-2">
            <span class="label">Data Nasc.</span>
            <div class="value">${displayDateValue(member.dataNascimento)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-3">
            <span class="label">Nacionalidade</span>
            <div class="value">${displayValue(member.nacionalidade)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Naturalidade</span>
            <div class="value">${displayValue(member.naturalidade)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Profissão</span>
            <div class="value">${displayValue(member.profissao)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Grau de Instrução</span>
            <div class="value">${displayValue(member.grauInstrucao)}</div>
          </div>
        </div>

        <div class="section-title">Documentos e Contatos</div>
        <div class="row">
          <div class="field col-3">
            <span class="label">CPF</span>
            <div class="value">${displayCpfValue(member.cpf)}</div>
          </div>
          <div class="field col-3">
            <span class="label">RG</span>
            <div class="value">${displayValue(member.rg)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Título Eleitor</span>
            <div class="value">${displayValue(member.tituloEleitor)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Celular</span>
            <div class="value">${displayPhoneValue(member.celular)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-6">
            <span class="label">E-mail</span>
            <div class="value">${displayValue(member.email)}</div>
          </div>
          <div class="field col-6">
            <span class="label">Telefone</span>
            <div class="value">${displayPhoneValue(member.telefone)}</div>
          </div>
        </div>

        <div class="section-title">Endereço Residencial</div>
        <div class="row">
          <div class="field col-2">
            <span class="label">CEP</span>
            <div class="value">${displayValue(member.cep)}</div>
          </div>
          <div class="field col-8">
            <span class="label">Logradouro</span>
            <div class="value">${displayValue(member.endereco)}</div>
          </div>
          <div class="field col-2">
            <span class="label">Número</span>
            <div class="value">${displayValue(member.numero)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-4">
            <span class="label">Complemento</span>
            <div class="value">${displayValue(member.complemento)}</div>
          </div>
          <div class="field col-4">
            <span class="label">Bairro</span>
            <div class="value">${displayValue(member.bairro)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Cidade</span>
            <div class="value">${displayValue(member.cidade)}</div>
          </div>
          <div class="field col-1">
            <span class="label">UF</span>
            <div class="value">${displayValue(member.uf)}</div>
          </div>
        </div>

        <div class="section-title">Filiação</div>
        <div class="row">
          <div class="field col-5">
            <span class="label">Nome do Pai</span>
            <div class="value">${displayValue(member.pai)}</div>
          </div>
          <div class="field col-3">
            <span class="label">CPF Pai</span>
            <div class="value">${displayCpfValue(member.cpfPai)}</div>
          </div>
          <div class="field col-4">
            <span class="label">Órfão de Pai</span>
            <div class="value">
              <div class="checkbox-group">
                <span><span class="check">${
                  member.isOrphanFather ? "X" : ""
                }</span>Sim</span>
                <span><span class="check">${
                  member.isOrphanFather ? "" : "X"
                }</span>Não</span>
              </div>
            </div>
          </div>
        </div>
        <div class="row">
          <div class="field col-5">
            <span class="label">Nome da Mãe</span>
            <div class="value">${displayValue(member.mae)}</div>
          </div>
          <div class="field col-3">
            <span class="label">CPF Mãe</span>
            <div class="value">${displayCpfValue(member.cpfMae)}</div>
          </div>
          <div class="field col-4">
            <span class="label">Órfão de Mãe</span>
            <div class="value">
              <div class="checkbox-group">
                <span><span class="check">${
                  member.isOrphan ? "X" : ""
                }</span>Sim</span>
                <span><span class="check">${
                  member.isOrphan ? "" : "X"
                }</span>Não</span>
              </div>
            </div>
          </div>
        </div>

        <div class="section-title">Dados Eclesiásticos</div>
        <div class="row">
          <div class="field col-3">
            <span class="label">Data Conversão</span>
            <div class="value">${displayDateValue(member.dataConversao)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Data Batismo (Águas)</span>
            <div class="value">${displayDateValue(member.dataBatismo)}</div>
          </div>
          <div class="field col-6">
            <span class="label">Local Batismo</span>
            <div class="value">${displayValue(member.localBatismo)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-3">
            <span class="label">Recebimento</span>
            <div class="value">${displayValue(member.recebimento)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Data Recebimento</span>
            <div class="value">${displayDateValue(member.dataRecebimento)}</div>
          </div>
          <div class="field col-3">
            <span class="label">Batismo Espírito Santo</span>
            <div class="value">
              <div class="checkbox-group">
                <span><span class="check">${
                  member.batizadoEspiritoSanto ? "X" : ""
                }</span>Sim</span>
                <span><span class="check">${
                  member.batizadoEspiritoSanto ? "" : "X"
                }</span>Não</span>
              </div>
            </div>
          </div>
          <div class="field col-3">
            <span class="label">Data Batismo Espírito Santo</span>
            <div class="value">${displayDateValue(
              member.dataBatismoEspiritoSanto
            )}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-12">
            <span class="label">Origem (Igreja anterior)</span>
            <div class="value">${displayValue(member.origem)}</div>
          </div>
        </div>
        ${maritalSection}

        ${childrenSection}

        ${observacoesSection}

        <div class="section-title">Declaração</div>
        <div class="row">
          <div class="field col-12">
            <span class="label">Concordância</span>
            <div class="value">
              <div class="checkbox-group">
                <span><span class="check">${
                  member.autorizacao ? "X" : ""
                }</span>Declaro que li e concordo</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">&nbsp;</div>
      </div>
    `;
};

export const buildPrintDocument = (
  pages: string,
  meta: { loginLabel: string; generatedAt: string },
  options?: {
    mode?: PrintMode;
    filename?: string;
    pageSelector?: string;
    toolbar?: boolean;
    title?: string;
  }
) => {
  const mode = options?.mode ?? "print";
  const filename = options?.filename ?? "fichas-cadastro";
  const pageSelector = options?.pageSelector ?? ".page";
  const toolbar = options?.toolbar ?? false;
  const toolbarTitle = options?.title ?? "Ficha do membro";
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

          const setDesktopMode = (enabled = true) => {
            document.body.classList.toggle("force-desktop", enabled);
          };

          const setToolbarHidden = (hidden = true) => {
            document.body.classList.toggle("hide-toolbar", hidden);
          };

          const waitForLayout = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => setTimeout(resolve, 60))
            );

          const waitForStableRender = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => setTimeout(resolve, 120))
              )
            );

          const cleanup = () => {
            setDesktopMode(false);
            setToolbarHidden(false);
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
                5,
                Math.max(3, (window.devicePixelRatio || 1) * 2)
              );
              const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
              for (let i = 0; i < elements.length; i += 1) {
                const canvas = await html2canvasFn(elements[i], {
                  scale: renderScale,
                  useCORS: true,
                  allowTaint: true,
                  logging: false,
                  imageTimeout: 3000,
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
            setDesktopMode(true);
            setToolbarHidden(true);
            await waitForLayout();
            await waitForImages();
            await waitForFonts();
            await waitForStableRender();
            await exportPdf();
            setTimeout(() => cleanup(), 300);
          };

          const runPrint = async () => {
            setDesktopMode(true);
            setToolbarHidden(true);
            await waitForLayout();
            await waitForImages();
            await waitForFonts();
            await waitForStableRender();
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
            closeBtn.addEventListener("click", () => window.close());
          }
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

          const waitForLayout = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => setTimeout(resolve, 60))
            );

          const waitForStableRender = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => setTimeout(resolve, 120))
              )
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
                5,
                Math.max(3, (window.devicePixelRatio || 1) * 2)
              );
              const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "p" });
              for (let i = 0; i < elements.length; i += 1) {
                const canvas = await html2canvasFn(elements[i], {
                  scale: renderScale,
                  useCORS: true,
                  allowTaint: true,
                  logging: false,
                  imageTimeout: 3000,
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

          let printed = false;
          const triggerExport = () => {
            if (printed) return;
            printed = true;
            setDesktopMode(true);
            setTimeout(() => {
              waitForLayout()
                .then(waitForImages)
                .then(waitForFonts)
                .then(waitForStableRender)
                .then(exportPdf);
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

          const waitForLayout = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => setTimeout(resolve, 60))
            );

          const waitForStableRender = () =>
            new Promise((resolve) =>
              requestAnimationFrame(() =>
                requestAnimationFrame(() => setTimeout(resolve, 120))
              )
            );

          let printed = false;
          const triggerPrint = () => {
            if (printed) return;
            printed = true;
            setDesktopMode(true);
            setTimeout(() => {
              waitForLayout()
                .then(waitForImages)
                .then(waitForStableRender)
                .then(() => window.print());
            }, 80);
          };
        `;

  const triggerAction = mode === "download" ? "triggerExport" : "triggerPrint";

  const toolbarMarkup = toolbar
    ? `
        <div class="toolbar">
          <div class="toolbar-title">${escapeHtml(toolbarTitle)}</div>
          <div class="toolbar-actions">
            <button id="toolbar-print" type="button">Imprimir</button>
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
        <title>Fichas de Cadastro</title>
        <meta name="pdf-login" content="${escapeHtml(meta.loginLabel)}" />
        <meta name="pdf-generated-at" content="${escapeHtml(meta.generatedAt)}" />
        <meta name="pdf-ip" content="" />
        <meta name="pdf-generated" content="true" />
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap");

          :root {
            --ink: #111827;
            --muted: #6b7280;
            --line: #d1d5db;
            --panel: #f3f4f6;
            --font-title: 16pt;
            --font-subtitle: 8pt;
            --font-section: 8pt;
            --font-label: 7pt;
            --font-value: 9pt;
            --font-small: 8pt;
            --font-table: 9pt;
          }

          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            margin: 0;
            font-family: "Archivo", "Helvetica Neue", sans-serif;
            color: var(--ink);
            background: #e5e7eb;
          }

          .toolbar {
            position: sticky;
            top: 0;
            z-index: 10;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 12px 18px;
            background: #111827;
            color: #fff;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
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
            font-size: 11px;
            padding: 6px 12px;
            border-radius: 999px;
            cursor: pointer;
          }

          .toolbar button:hover {
            background: rgba(255, 255, 255, 0.12);
          }

          @page {
            size: A4;
            margin: 6mm;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            padding: 6mm;
            background: #fff;
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
            position: relative;
            break-after: page;
            page-break-after: always;
          }

          .page:last-child {
            break-after: auto;
            page-break-after: auto;
          }

          @media (max-width: 1024px) {
            body:not(.force-desktop) .page {
              width: min(210mm, 94vw);
              min-height: auto;
              padding: 16px;
              margin: 16px auto;
            }

            body:not(.force-desktop) header {
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
            }

            body:not(.force-desktop) .photo {
              align-self: center;
              width: 96px;
              height: 128px;
            }
          }

          @media (max-width: 720px) {
            body:not(.force-desktop) .toolbar {
              flex-wrap: wrap;
              gap: 8px;
            }

            body:not(.force-desktop) .row {
              grid-template-columns: repeat(6, minmax(0, 1fr));
              gap: 6px;
            }

            body:not(.force-desktop) .col-1,
            body:not(.force-desktop) .col-2,
            body:not(.force-desktop) .col-3,
            body:not(.force-desktop) .col-4,
            body:not(.force-desktop) .col-5,
            body:not(.force-desktop) .col-6,
            body:not(.force-desktop) .col-8,
            body:not(.force-desktop) .col-9,
            body:not(.force-desktop) .col-12 {
              grid-column: span 6;
            }

            body:not(.force-desktop) .title {
              font-size: 14pt;
            }

            body:not(.force-desktop) .subtitle {
              font-size: 7pt;
            }

            body:not(.force-desktop) .value {
              font-size: 10pt;
            }

            body:not(.force-desktop) .section-title {
              margin-top: 8px;
            }

            body:not(.force-desktop) table {
              display: block;
              width: 100%;
              overflow-x: auto;
            }

            body:not(.force-desktop) th,
            body:not(.force-desktop) td {
              white-space: nowrap;
            }
          }

          @media (max-width: 480px) {
            body:not(.force-desktop) .page {
              padding: 12px;
            }

            body:not(.force-desktop) .photo {
              width: 86px;
              height: 114px;
            }
          }

          @media print {
            .page {
              margin: 0;
              box-shadow: none;
              width: 100%;
              min-height: auto;
              break-after: auto;
              page-break-after: auto;
            }
            .toolbar {
              display: none !important;
            }
          }

          .hide-toolbar .toolbar {
            display: none !important;
          }

          header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 6px;
            border-bottom: 2px solid var(--ink);
            margin-bottom: 6px;
          }

          .header-left {
            display: flex;
            gap: 12px;
            align-items: center;
          }

          .logo {
            width: 62px;
            height: 62px;
            border: 1px solid var(--line);
            border-radius: 8px;
            object-fit: contain;
            padding: 6px;
            background: #fff;
          }

          .titles {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .title {
            font-family: "Playfair Display", serif;
            font-size: var(--font-title);
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .subtitle {
            font-size: var(--font-subtitle);
            color: var(--muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .photo {
            width: 80px;
            height: 108px;
            border: 1px solid var(--line);
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #f9fafb;
          }

          .photo img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: center;
          }

          .photo-placeholder {
            font-size: var(--font-value);
            color: var(--muted);
            text-align: center;
            padding: 6px;
          }

          .section-title {
            margin-top: 6px;
            margin-bottom: 4px;
            padding: 4px 8px;
            border: 1px solid var(--line);
            background: var(--panel);
            text-transform: uppercase;
            font-size: var(--font-section);
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #374151;
          }

          .row {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            gap: 4px;
            margin-bottom: 4px;
          }

          .col-1 { grid-column: span 1; }
          .col-2 { grid-column: span 2; }
          .col-3 { grid-column: span 3; }
          .col-4 { grid-column: span 4; }
          .col-5 { grid-column: span 5; }
          .col-6 { grid-column: span 6; }
          .col-8 { grid-column: span 8; }
          .col-9 { grid-column: span 9; }
          .col-12 { grid-column: span 12; }

          .field {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .label {
            font-size: var(--font-label);
            text-transform: uppercase;
            color: var(--muted);
            font-weight: 600;
            letter-spacing: 0.06em;
          }

          .value {
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 3px 5px;
            min-height: 16px;
            font-size: var(--font-value);
            background: #fff;
          }

          .value.multiline {
            min-height: 36px;
            line-height: 1.4;
          }

          .checkbox-group {
            display: flex;
            gap: 8px;
            align-items: center;
            flex-wrap: wrap;
            font-size: var(--font-small);
          }

          .check {
            width: 12px;
            height: 12px;
            border: 1px solid var(--ink);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: var(--font-small);
            font-weight: 700;
            margin-right: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: var(--font-table);
          }

          th, td {
            border: 1px solid var(--line);
            padding: 4px 6px;
          }

          th {
            background: #f9fafb;
            text-transform: uppercase;
            font-size: var(--font-label);
            letter-spacing: 0.06em;
            color: var(--muted);
            text-align: left;
          }

          .text-center {
            text-align: center;
          }

          .footer {
            margin-top: 10px;
            font-size: 8pt;
            color: var(--muted);
            text-align: center;
          }

          @media print {
            body { background: #fff; }
          }
        </style>
        ${downloadScripts}
      </head>
      <body>
        ${toolbarMarkup}
        <div id="pdf-meta" data-login="${escapeHtml(
          meta.loginLabel
        )}" data-generated-at="${escapeHtml(
          meta.generatedAt
        )}" data-ip="" data-pdf-generated="true" style="display:none"></div>
        ${pages}
        <script>
          ${actionScript}
          if (!${toolbar}) {
            const ipMeta = document.querySelector('meta[name="pdf-ip"]');
            const metaNode = document.getElementById("pdf-meta");
            const setIp = (value) => {
              if (ipMeta) ipMeta.setAttribute("content", value);
              if (metaNode) metaNode.setAttribute("data-ip", value);
            };

            window.onload = () => {
              const waitResources = async () => {
                if (typeof waitForImages === "function") {
                  await waitForImages();
                }
                if (typeof waitForFonts === "function") {
                  await waitForFonts();
                }
              };

              let timeoutId = null;
              const controller = new AbortController();

              timeoutId = setTimeout(() => {
                controller.abort();
                setIp("N/D");
                waitResources().then(${triggerAction});
              }, 1500);

              fetch("https://api.ipify.org?format=json", { signal: controller.signal })
                .then((res) => (res.ok ? res.json() : null))
                .then((data) => {
                  if (data && data.ip) {
                    setIp(data.ip);
                  } else {
                    setIp("N/D");
                  }
                })
                .catch(() => setIp("N/D"))
                .finally(() => {
                  if (timeoutId) clearTimeout(timeoutId);
                  waitResources().then(${triggerAction});
                });
            };

            ${
              mode === "print"
                ? "window.onafterprint = () => setTimeout(() => window.close(), 50);"
                : ""
            }
          }
        </script>
      </body>
    </html>
  `;
};
