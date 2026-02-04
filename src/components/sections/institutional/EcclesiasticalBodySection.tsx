"use client";

import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { collection, onSnapshot, query } from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Users,
  BookOpen,
  Scroll,
  HandHelping,
  User,
  MoreHorizontal,
  Sparkles,
} from "lucide-react";
import { db } from "@/lib/firebase/client";
import { useSiteSettings } from "@/lib/firebase/useSiteSettings";

type CensusMember = {
  id: string;
  name?: string;
  cargo?: string;
  photo?: string;
};

type GroupMember = {
  id: string;
  name: string;
  displayName: string;
  role: string;
  photo?: string;
};

type GroupConfig = {
  id: string;
  title: string;
  role: string;
  description: string;
  colorTheme: "blue" | "indigo" | "emerald" | "orange" | "slate";
  icon: ReactElement;
};

type GroupData = GroupConfig & {
  members: GroupMember[];
};

const DEFAULT_PHOTO = "/logo.png";

const groupConfigs: GroupConfig[] = [
  {
    id: "pastor",
    title: "Corpo Pastoral",
    role: "Pastor",
    description: "Liderança e pastoreio das congregações",
    icon: <Users size={20} className="text-white" />,
    colorTheme: "blue",
  },
  {
    id: "evangelista",
    title: "Evangelistas",
    role: "Evangelista",
    description: "Proclamação e expansão da fé",
    icon: <BookOpen size={20} className="text-white" />,
    colorTheme: "indigo",
  },
  {
    id: "presbitero",
    title: "Presbitério",
    role: "Presbítero",
    description: "Supervisão e cuidado da doutrina",
    icon: <Scroll size={20} className="text-white" />,
    colorTheme: "emerald",
  },
  {
    id: "diacono",
    title: "Diaconato",
    role: "Diácono",
    description: "Serviço social e ordem do templo",
    icon: <HandHelping size={20} className="text-white" />,
    colorTheme: "orange",
  },
  {
    id: "auxiliar",
    title: "Corpo de Auxiliares",
    role: "Auxiliar",
    description: "Apoio e iniciação ministerial",
    icon: <User size={20} className="text-white" />,
    colorTheme: "slate",
  },
];

const themeBorderHover: Record<GroupConfig["colorTheme"], string> = {
  blue: "group-hover:border-blue-500",
  indigo: "group-hover:border-indigo-500",
  emerald: "group-hover:border-emerald-500",
  orange: "group-hover:border-orange-500",
  slate: "group-hover:border-slate-500",
};

const themeRing: Record<GroupConfig["colorTheme"], string> = {
  blue: "ring-blue-50 text-blue-600 bg-blue-50",
  indigo: "ring-indigo-50 text-indigo-600 bg-indigo-50",
  emerald: "ring-emerald-50 text-emerald-600 bg-emerald-50",
  orange: "ring-orange-50 text-orange-600 bg-orange-50",
  slate: "ring-slate-50 text-slate-600 bg-slate-50",
};

const themeIconBg: Record<GroupConfig["colorTheme"], string> = {
  blue: "bg-blue-600 shadow-blue-200",
  indigo: "bg-indigo-600 shadow-indigo-200",
  emerald: "bg-emerald-600 shadow-emerald-200",
  orange: "bg-orange-600 shadow-orange-200",
  slate: "bg-slate-600 shadow-slate-200",
};

const themeBar: Record<GroupConfig["colorTheme"], string> = {
  blue: "bg-blue-600",
  indigo: "bg-indigo-600",
  emerald: "bg-emerald-600",
  orange: "bg-orange-600",
  slate: "bg-slate-600",
};

const safePhoto = (photo?: string) => {
  if (!photo) return "";
  if (photo.startsWith("http://") || photo.startsWith("https://")) return photo;
  if (!photo.startsWith("/")) return "";
  return encodeURI(photo);
};

const normalizeText = (value?: string) =>
  (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const normalizeCargo = (value?: string) => {
  const raw = normalizeText(value);
  if (!raw) return "";
  const compact = raw.replace(/[^a-z]/g, "");
  if (compact.includes("pastor") && compact.includes("presidente")) {
    return "pastor-presidente";
  }
  if (compact.includes("pastor")) return "pastor";
  if (compact.includes("evangelista")) return "evangelista";
  if (compact.includes("presbitero")) return "presbitero";
  if (compact.includes("diacono")) return "diacono";
  if (compact.includes("auxiliar")) return "auxiliar";
  if (compact.includes("membro")) return "membro";
  return compact;
};

const prefixMap: Record<string, string> = {
  pastor: "Pr.",
  "pastor-presidente": "Pr.",
  diacono: "Diác.",
  presbitero: "Presb.",
  evangelista: "Ev.",
  auxiliar: "Aux.",
};

const stripKnownPrefix = (name: string) =>
  name.replace(
    /^(pr\.?|presb\.?|diac\.?|diác\.?|ev\.?|aux\.?)\s+/i,
    ""
  );

const getNameParts = (name: string) =>
  stripKnownPrefix(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const getFirstAndLastName = (name: string) => {
  const parts = getNameParts(name);
  if (parts.length === 0) return "";
  if (parts.length <= 2) return parts.join(" ");
  return `${parts[0]} ${parts[parts.length - 1]}`;
};

const formatMinisterName = (name: string, cargo: string) => {
  const prefix = prefixMap[cargo];
  const shortName = getFirstAndLastName(name) || name.trim();
  const parts = getNameParts(name);
  if (!prefix || parts.length < 2) return shortName;
  const normalizedName = normalizeText(shortName);
  const normalizedPrefix = normalizeText(prefix.replace(".", ""));
  if (normalizedName.startsWith(normalizedPrefix)) {
    return shortName;
  }
  return `${prefix} ${shortName}`;
};

const getInitials = (name?: string) => {
  if (!name) return "IE";
  const parts = name.split(" ").filter(Boolean);
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase());
  return initials.join("") || "IE";
};

const MemberCard = ({
  member,
  colorTheme,
}: {
  member: GroupMember;
  colorTheme: GroupConfig["colorTheme"];
}) => {
  const photo = safePhoto(member.photo);
  return (
    <div
      className={`group relative flex-shrink-0 w-48 rounded-2xl p-6 bg-white border border-slate-100 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.25)] ${
        themeBorderHover[colorTheme]
      }`}
    >
      <div
        className={`absolute top-0 inset-x-0 h-1 rounded-t-2xl transition-opacity duration-300 opacity-0 group-hover:opacity-100 ${
          themeBar[colorTheme]
        }`}
      />
      <div className="flex flex-col items-center">
        <div
          className={`relative w-24 h-24 mb-4 rounded-full p-1 ring-4 transition-all duration-300 ${themeRing[colorTheme]} group-hover:ring-offset-2`}
        >
          {photo ? (
            <img
              src={photo}
              alt={member.name}
              className="w-full h-full rounded-full object-cover shadow-inner"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-500">
              {getInitials(member.displayName)}
            </div>
          )}
        </div>
        <h3 className="font-bold text-slate-800 text-base text-center leading-snug mb-1">
          {member.displayName}
        </h3>
        <p
          className={`text-xs font-semibold uppercase tracking-wider opacity-70 ${
            themeRing[colorTheme].split(" ")[1]
          }`}
        >
          {member.role}
        </p>
        <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <MoreHorizontal size={16} className="text-slate-300" />
        </div>
      </div>
    </div>
  );
};

const GroupSection = ({ group }: { group: GroupData }) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const members = group.members;
  const isLooping = members.length >= 6;
  const infiniteMembers = useMemo(() => {
    if (!members.length) return [] as GroupMember[];
    return isLooping ? [...members, ...members, ...members] : members;
  }, [members, isLooping]);

  const getSingleSetWidth = () => {
    if (!isLooping) return 0;
    const container = scrollContainerRef.current;
    if (!container) return 0;
    const setSize = members.length;
    if (!setSize || container.children.length < setSize * 3) return 0;
    const first = container.children[0] as HTMLElement | undefined;
    const middle = container.children[setSize] as HTMLElement | undefined;
    if (!first || !middle) return 0;
    return middle.offsetLeft - first.offsetLeft;
  };

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !members.length || !isLooping) return;
    const initScroll = () => {
      const width = getSingleSetWidth();
      if (width > 0 && container.scrollLeft === 0) {
        container.scrollLeft = width;
      }
    };
    initScroll();
    const timer = setTimeout(initScroll, 120);
    return () => clearTimeout(timer);
  }, [members.length]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || !members.length || !isLooping) return;
    const width = getSingleSetWidth();
    if (!width) return;
    const tolerance = 5;
    if (container.scrollLeft >= width * 2 - tolerance) {
      container.scrollLeft = container.scrollLeft - width;
    } else if (container.scrollLeft <= width - tolerance) {
      container.scrollLeft = container.scrollLeft + width;
    }
  };

  const scrollByAmount = (direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const scrollAmount = 320;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  return (
    <section className="mb-12 relative">
      <div className="flex items-start md:items-center gap-4 mb-6 px-6 md:px-8 max-w-6xl mx-auto">
        <div
          className={`p-3 rounded-2xl shadow-lg transform -rotate-3 transition-transform hover:rotate-0 ${themeIconBg[group.colorTheme]}`}
        >
          {group.icon}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {group.title}
          </h2>
          <p className="text-sm text-slate-500 font-medium">
            {group.description}
          </p>
        </div>
        <div className="ml-auto hidden md:block">
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
            {group.members.length}
          </span>
        </div>
      </div>

      {members.length ? (
        <div className="relative group/ecclesia">
          <button
            type="button"
            onClick={() => scrollByAmount("left")}
            className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white rounded-full shadow-xl border border-slate-100 text-slate-500 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover/ecclesia:opacity-100"
          >
            <ChevronLeft size={24} />
          </button>

          <button
            type="button"
            onClick={() => scrollByAmount("right")}
            className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 items-center justify-center bg-white rounded-full shadow-xl border border-slate-100 text-slate-500 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover/ecclesia:opacity-100"
          >
            <ChevronRight size={24} />
          </button>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex overflow-x-auto gap-5 pb-8 px-6 md:px-2 eccl-scroll eccl-mask"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {infiniteMembers.map((member, index) => (
              <MemberCard
                key={`${member.id}-${index}`}
                member={member}
                colorTheme={group.colorTheme}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-8 text-center text-sm text-slate-500">
          Nenhum membro cadastrado neste grupo.
        </div>
      )}
    </section>
  );
};

export default function EcclesiasticalBodySection() {
  const { settings } = useSiteSettings();
  const [members, setMembers] = useState<CensusMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, "censusMembers"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<CensusMember, "id">),
        }));
        setMembers(items);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  const grouped = useMemo<GroupData[]>(() => {
    const map = new Map<string, GroupMember[]>();
    groupConfigs.forEach((group) => map.set(group.id, []));

    members.forEach((member) => {
      const cargo = normalizeCargo(member.cargo);
      if (!cargo || cargo === "membro") return;
      if (cargo === "pastor-presidente") return;
      const groupKey = cargo === "pastor-presidente" ? "pastor" : cargo;
      const target = map.get(groupKey);
      if (!target || !member.name) return;
      const displayName = formatMinisterName(member.name, cargo);
      target.push({
        id: member.id,
        name: member.name,
        displayName,
        role:
          cargo === "pastor-presidente"
            ? "Pastor Presidente"
            : groupConfigs.find((group) => group.id === groupKey)?.role || cargo,
        photo: member.photo,
      });
    });

    return groupConfigs.map((group) => ({
      ...group,
      members: (map.get(group.id) || []).sort((a, b) =>
        a.displayName.localeCompare(b.displayName)
      ),
    }));
  }, [members]);
  const totalMembers = useMemo(
    () => grouped.reduce((total, group) => total + group.members.length, 0),
    [grouped]
  );
  const visibleGroups = useMemo(
    () => grouped.filter((group) => group.members.length > 0),
    [grouped]
  );

  const presidentByCargo = useMemo(
    () =>
      members.find((member) => normalizeCargo(member.cargo) === "pastor-presidente") ||
      null,
    [members]
  );
  const presidentByName = useMemo(() => {
    const name = settings.presidentSignatureName?.trim();
    if (!name) return null;
    const target = normalizeText(name);
    return members.find((member) => normalizeText(member.name) === target) || null;
  }, [members, settings.presidentSignatureName]);
  const presidentMember = presidentByCargo || presidentByName;
  const hasLeader = Boolean(presidentMember);
  const rawPresidentName = presidentMember?.name?.trim() || "";
  const leaderCargo =
    normalizeCargo(presidentMember?.cargo) || "pastor-presidente";
  const presidentName = hasLeader
    ? formatMinisterName(rawPresidentName, leaderCargo)
    : "Pr.";
  const presidentRole =
    "Presidente da Igreja Evangélica Assembleia de Deus de Santa Maria - RS";
  const presidentPhoto = safePhoto(presidentMember?.photo) || DEFAULT_PHOTO;

  return (
    <section className="relative py-20">
      <div className="container mx-auto max-w-6xl px-4">
        <header className="mx-auto mb-12 md:mb-16 max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-700 shadow-sm backdrop-blur">
            <Sparkles size={14} />
            <span>Corpo Eclesiástico</span>
          </div>

          <h2 className="mt-4 text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            Liderança Ministerial
          </h2>

          <p className="mt-3 text-sm md:text-base text-slate-600">
            Conheça os obreiros que servem e apoiam o crescimento espiritual da
            igreja.
          </p>

          <div className="mx-auto mt-6 h-px w-44 bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
        </header>

        <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 px-6 py-10 md:px-10 md:py-12 mb-12 shadow-2xl">
          <div className="absolute inset-0 opacity-30 pointer-events-none">
            <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-blue-500 blur-3xl mix-blend-screen" />
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-amber-500 blur-3xl mix-blend-screen" />
          </div>
          <div className="relative flex flex-col items-center text-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-amber-500 blur opacity-30" />
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 to-amber-600 shadow-2xl relative">
                <img
                  src={presidentPhoto}
                  className="w-full h-full rounded-full object-cover border-4 border-slate-900 bg-slate-800"
                  alt={presidentName}
                />
                <div className="absolute -bottom-2 -right-2 bg-amber-500 text-white h-10 w-10 rounded-full shadow-lg border-4 border-slate-900 flex items-center justify-center">
                  <span className="text-lg leading-none" aria-hidden="true">
                    ☧
                  </span>
                </div>
              </div>
            </div>
            <span className="text-amber-400 font-bold tracking-[0.3em] text-[10px] uppercase">
              Liderança Geral
            </span>
            <h3 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
              {presidentName}
            </h3>
            <p className="text-slate-300 text-sm md:text-lg font-medium">
              {presidentRole}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-10 text-center text-slate-500">
            Carregando corpo eclesiástico...
          </div>
        ) : totalMembers === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500">
            Nenhum obreiro cadastrado com cargo ministerial ainda.
          </div>
        ) : (
          visibleGroups.map((group) => (
            <GroupSection key={group.id} group={group} />
          ))
        )}
      </div>

      <style>{`
        .eccl-scroll::-webkit-scrollbar {
          display: none;
        }
        .eccl-mask {
          mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black 2%, black 98%, transparent);
        }
      `}</style>
    </section>
  );
}
