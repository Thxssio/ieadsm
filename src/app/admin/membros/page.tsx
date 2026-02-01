"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  setDoc,
} from "firebase/firestore";
import { Users, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";
import { db } from "@/lib/firebase/client";
import { deleteStorageObject } from "@/lib/firebase/storageUtils";

type ChildInfo = {
  name: string;
  cpf: string;
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

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
};

const formatBool = (value?: boolean) => (value ? "Sim" : "Não");
const isNonEmpty = (value?: string): value is string => Boolean(value);
const formatRegistro = (value?: string, other?: string) => {
  if (value === "Outros" && other) {
    return `Outros - ${other}`;
  }
  return value || "Registro";
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

const displayMultiline = (value?: string) => {
  const cleaned = (value ?? "").trim();
  if (!cleaned) return "&nbsp;";
  return escapeHtml(cleaned).replaceAll("\n", "<br />");
};

const cargoOptions = [
  { value: "membro", label: "Membro" },
  { value: "auxiliar", label: "Auxiliar" },
  { value: "diacono", label: "Diácono" },
  { value: "presbitero", label: "Presbítero" },
  { value: "evangelista", label: "Evangelista" },
  { value: "pastor", label: "Pastor" },
];

const formatCargo = (value?: string) => {
  const found = cargoOptions.find((option) => option.value === value);
  return found?.label ?? "Membro";
};

export default function AdminMembrosPage() {
  const router = useRouter();
  const { isAuthenticated, isReady } = useAuth();
  const { pushToast } = useToast();
  const { settings } = useSiteSettings();

  const [items, setItems] = useState<CensusMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMember, setActiveMember] = useState<CensusMember | null>(null);
  const [search, setSearch] = useState("");
  const [filterCongregation, setFilterCongregation] = useState("");
  const [filterSector, setFilterSector] = useState("");
  const [filterRegistro, setFilterRegistro] = useState("");
  const [filterCargo, setFilterCargo] = useState("");
  const [toggling, setToggling] = useState(false);
  const [cargoSaving, setCargoSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
          snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<CensusMember, "id">),
          }))
        );
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const congregationOptions = useMemo(() => {
    return Array.from(
      new Set(items.map((item) => item.congregacao).filter(isNonEmpty))
    ).sort((a, b) => a.localeCompare(b));
  }, [items]);

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
    const values = new Set(items.map((item) => item.cargo).filter(isNonEmpty));
    values.add("membro");
    return cargoOptions.filter((option) => values.has(option.value));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
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
        const cargo = item.cargo || "membro";
        if (cargo !== filterCargo) return false;
      }
      if (search.trim()) {
        const term = search.trim().toLowerCase();
        const hay = [
          item.name,
          item.cpf,
          item.email,
          item.celular,
          item.congregacao,
          item.setor,
          item.idInterno,
          item.registroTipoOutro,
          item.cargo,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [items, filterCongregation, filterSector, filterRegistro, filterCargo, search]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds]
  );

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => items.some((i) => i.id === id)));
  }, [items]);

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
      if (target?.photo) {
        await deleteStorageObject(target.photo);
      }
      pushToast({ type: "success", title: "Cadastro removido" });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Falha ao excluir",
        description: "Não foi possível excluir o cadastro.",
      });
    }
  };

  const handleCargoChange = async (
    member: CensusMember,
    nextCargo: string
  ) => {
    if (!db || !member.id) {
      pushToast({
        type: "error",
        title: "Firebase não configurado",
        description: "Não foi possível atualizar o cargo.",
      });
      return;
    }
    if (member.cargo === nextCargo) return;
    setCargoSaving(true);
    setActiveMember((prev) =>
      prev ? { ...prev, cargo: nextCargo } : prev
    );
    try {
      await updateDoc(doc(db, "censusMembers", member.id), {
        cargo: nextCargo,
      });
      pushToast({
        type: "success",
        title: "Cargo atualizado",
        description: formatCargo(nextCargo),
      });
    } catch (err) {
      pushToast({
        type: "error",
        title: "Falha ao atualizar",
        description: "Não foi possível atualizar o cargo.",
      });
      setActiveMember((prev) =>
        prev ? { ...prev, cargo: member.cargo } : prev
      );
    } finally {
      setCargoSaving(false);
    }
  };

  const buildFichaMarkup = (member: CensusMember) => {
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
          }))
          .filter((child) => child.name || child.cpf)
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
            <td class="text-center">&nbsp;</td>
          </tr>
        `;
      })
      .join("");

    const logoSrc = "/logo.png";
    const photoSrc = safePhoto(member.photo);
    const photoMarkup = photoSrc
      ? `<img src="${escapeHtml(photoSrc)}" alt="Foto do membro" />`
      : `<div class="photo-placeholder">Sem foto</div>`;

    const generatedAt = new Date().toLocaleString("pt-BR");

    return `
      <div class="page">
        <header>
          <div class="header-left">
            <img class="logo" src="${escapeHtml(logoSrc)}" alt="Logo" />
            <div class="titles">
              <div class="title">Ficha de Cadastro de Membro</div>
              <div class="subtitle">${escapeHtml(
                settings.censusTitle || "Sistema de Gestão Eclesiástica"
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
            <div class="value">${displayValue(member.celular)}</div>
          </div>
        </div>
        <div class="row">
          <div class="field col-6">
            <span class="label">E-mail</span>
            <div class="value">${displayValue(member.email)}</div>
          </div>
          <div class="field col-6">
            <span class="label">Telefone</span>
            <div class="value">${displayValue(member.telefone)}</div>
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

        <div class="section-title">Outras Informações</div>
        <div class="row">
          <div class="field col-12">
            <span class="label">Observações</span>
            <div class="value multiline">${displayMultiline(
              member.informacoes
            )}</div>
          </div>
        </div>

        <div class="section-title">Autorizações</div>
        <div class="row">
          <div class="field col-12">
            <span class="label">Termos</span>
            <div class="value">
              <div class="checkbox-group">
                <span><span class="check">${
                  member.autorizacao ? "X" : ""
                }</span>Autorizo uso dos dados (LGPD)</span>
                <span><span class="check">${
                  member.usoImagem ? "X" : ""
                }</span>Autorizo uso de imagem</span>
              </div>
            </div>
          </div>
        </div>

        <div class="signature-row">
          <div class="signature">
            <div class="signature-line"></div>
            Assinatura do Membro
          </div>
          <div class="signature">
            <div class="signature-line"></div>
            Secretaria / Pastor Responsável
          </div>
        </div>

        <div class="footer">Gerado em: ${escapeHtml(generatedAt)}</div>
      </div>
    `;
  };

  const buildPrintDocument = (pages: string) => `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Fichas de Cadastro</title>
        <style>
          @import url("https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Playfair+Display:wght@600;700&display=swap");

          :root {
            --ink: #111827;
            --muted: #6b7280;
            --line: #d1d5db;
            --panel: #f3f4f6;
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

          @page {
            size: A4;
            margin: 8mm;
          }

          .page {
            width: 210mm;
            min-height: 297mm;
            margin: 8mm auto;
            padding: 8mm;
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

          header {
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding-bottom: 10px;
            border-bottom: 2px solid var(--ink);
            margin-bottom: 10px;
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
            font-size: 18pt;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }

          .subtitle {
            font-size: 9pt;
            color: var(--muted);
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }

          .photo {
            width: 90px;
            height: 120px;
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
          }

          .photo-placeholder {
            font-size: 9pt;
            color: var(--muted);
            text-align: center;
            padding: 6px;
          }

          .section-title {
            margin-top: 10px;
            margin-bottom: 6px;
            padding: 4px 8px;
            border: 1px solid var(--line);
            background: var(--panel);
            text-transform: uppercase;
            font-size: 9pt;
            font-weight: 700;
            letter-spacing: 0.08em;
            color: #374151;
          }

          .row {
            display: grid;
            grid-template-columns: repeat(12, minmax(0, 1fr));
            gap: 6px;
            margin-bottom: 6px;
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
            font-size: 8pt;
            text-transform: uppercase;
            color: var(--muted);
            font-weight: 600;
            letter-spacing: 0.06em;
          }

          .value {
            border: 1px solid var(--line);
            border-radius: 4px;
            padding: 4px 6px;
            min-height: 18px;
            font-size: 10pt;
            background: #fff;
          }

          .value.multiline {
            min-height: 48px;
            line-height: 1.4;
          }

          .checkbox-group {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            font-size: 9pt;
          }

          .check {
            width: 12px;
            height: 12px;
            border: 1px solid var(--ink);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 8pt;
            font-weight: 700;
            margin-right: 4px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 9.5pt;
          }

          th, td {
            border: 1px solid var(--line);
            padding: 4px 6px;
          }

          th {
            background: #f9fafb;
            text-transform: uppercase;
            font-size: 8pt;
            letter-spacing: 0.06em;
            color: var(--muted);
            text-align: left;
          }

          .text-center {
            text-align: center;
          }

          .signature-row {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 24px;
            margin-top: 24px;
          }

          .signature {
            text-align: center;
            font-size: 9pt;
            color: var(--muted);
          }

          .signature-line {
            border-top: 1px solid var(--ink);
            margin-bottom: 4px;
          }

          .footer {
            margin-top: 16px;
            font-size: 8pt;
            color: var(--muted);
            text-align: center;
          }

          @media print {
            body { background: #fff; }
            .page {
              margin: 0;
              box-shadow: none;
              width: 100%;
              min-height: auto;
            }
          }
        </style>
      </head>
      <body>
        ${pages}
        <script>
          window.onload = () => setTimeout(() => window.print(), 150);
          window.onafterprint = () => setTimeout(() => window.close(), 50);
        </script>
      </body>
    </html>
  `;

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

    const pages = members.map((member) => buildFichaMarkup(member)).join("");
    const html = buildPrintDocument(pages);

    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handlePrintFicha = (member: CensusMember) => {
    handlePrintFichas(member ? [member] : []);
  };

  const toggleSelection = (itemId: string) => {
    setSelectedIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectAllFiltered = () => {
    if (!filteredItems.length) return;
    setSelectedIds(filteredItems.map((item) => item.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  if (!isReady) {
    return <div className="min-h-screen pb-20 bg-slate-50" />;
  }

  if (!isAuthenticated) {
    return null;
  }

  const renderDetail = (label: string, value?: string, force = false) => {
    if (!value && !force) return null;
    return (
      <p className="text-sm text-slate-600">
        <span className="font-semibold text-slate-700">{label}:</span>{" "}
        {value || "-"}
      </p>
    );
  };

  return (
    <main className="min-h-screen pb-20 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Membros • Censo
            </h1>
            <p className="text-slate-500">
              Acompanhe os cadastros enviados pelo formulário.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/admin")}
            className="inline-flex items-center text-blue-600 font-bold hover:text-blue-800 transition-colors bg-white px-6 py-3 rounded-full shadow-sm hover:shadow-md"
          >
            Voltar ao painel
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[0.8fr_1.2fr] gap-8">
          <aside className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck size={24} />
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

            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Cadastros</p>
                  <p className="text-lg font-bold text-slate-900">
                    {filteredItems.length}
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none"
                  placeholder="Buscar por nome, CPF, congregação..."
                />
                <select
                  value={filterCongregation}
                  onChange={(event) =>
                    setFilterCongregation(event.target.value)
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
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
                  onChange={(event) => setFilterRegistro(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
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
                  onChange={(event) => setFilterCargo(event.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                >
                  <option value="">Todos os cargos</option>
                  {cargoFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </aside>

          <section className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">
                Lista de cadastros
              </h2>
              <span className="text-sm text-slate-500">
                {filteredItems.length} item{filteredItems.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <label className="flex items-center gap-2 font-semibold">
                <input
                  type="checkbox"
                  checked={
                    filteredItems.length > 0 &&
                    filteredItems.every((item) => selectedIds.includes(item.id))
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
                <strong className="text-slate-700">{selectedItems.length}</strong>
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
                onClick={() => handlePrintFichas(filteredItems)}
                disabled={!filteredItems.length}
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
            </div>

            {loading ? (
              <p className="text-slate-500">Carregando...</p>
            ) : filteredItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
                Nenhum cadastro encontrado.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredItems.map((item) => (
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
                      {item.cpf ? <span>CPF: {item.cpf}</span> : null}
                      {item.celular ? <span>Celular: {item.celular}</span> : null}
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
            )}
          </section>
        </div>
      </div>

      {activeMember ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4"
          onClick={() => setActiveMember(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-xl max-w-3xl w-full overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-slate-100">
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrintFicha(activeMember)}
                  className="rounded-full border border-blue-200 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-50 transition"
                >
                  Gerar ficha (PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMember(null)}
                  className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                  aria-label="Fechar"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="px-6 py-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {activeMember.photo ? (
                <div className="w-full max-h-[320px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <img
                    src={safePhoto(activeMember.photo)}
                    alt={activeMember.name || "Foto do membro"}
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : null}

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
                  <select
                    value={activeMember.cargo ?? "membro"}
                    onChange={(event) =>
                      handleCargoChange(activeMember, event.target.value)
                    }
                    disabled={cargoSaving}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-70"
                  >
                    {cargoOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    Identificação
                  </h4>
                  {renderDetail("Nome", activeMember.name)}
                  {renderDetail("CPF", activeMember.cpf)}
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
                  {renderDetail("Telefone", activeMember.telefone)}
                  {renderDetail("Celular", activeMember.celular)}
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
                  {renderDetail("CPF do pai", activeMember.cpfPai)}
                  {renderDetail("Mãe", activeMember.mae)}
                  {renderDetail("CPF da mãe", activeMember.cpfMae)}
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
                  {renderDetail("Grau de instrução", activeMember.grauInstrucao)}
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
                  {renderDetail("Quantidade de filhos", activeMember.qtdeFilhos)}
                  {renderDetail("Nome do cônjuge", activeMember.nomeConjuge)}
                  {renderDetail("CPF do cônjuge", activeMember.cpfConjuge)}
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
                  {renderDetail(
                    "Enviado em",
                    formatDate(activeMember.createdAt)
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
