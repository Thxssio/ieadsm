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
  const [toggling, setToggling] = useState(false);

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
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [items, filterCongregation, filterSector, filterRegistro, search]);

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
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">
                          {item.name || "Sem nome"}
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                          {item.congregacao || "-"} • {item.setor || "-"}
                        </p>
                      </div>
                      <div className="text-xs font-semibold text-slate-500">
                        {formatRegistro(item.registroTipo, item.registroTipoOutro)}
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
              <button
                type="button"
                onClick={() => setActiveMember(null)}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
                aria-label="Fechar"
              >
                ×
              </button>
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
