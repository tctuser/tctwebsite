import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MoveRight,
  Newspaper,
  Phone,
  Search,
  Settings2,
  UsersRound,
  X,
} from "lucide-react";
import {
  board,
  boardPortraits,
  club,
  downloads,
  facilities,
  facilityExperiences,
  history,
  historyDetails,
  legacyNews,
  membership,
  officialImages,
  officialLinks,
  teamGallery,
  teamGroups,
} from "./data/club";
import { supabase } from "./lib/supabase";
import { BookingPortal } from "./BookingPortal";
import { BookingAdmin } from "./BookingAdmin";

const navLinks = [
  ["Club", "#verein"],
  ["Anlage", "#anlage"],
  ["Buchen", "/booking"],
  ["Teams", "#mannschaften"],
  ["Turniere", "#turniere"],
];

type PriceItem = { name: string; price: string; monthly: string };
type DownloadItem = {
  category: string;
  title: string;
  text: string;
  file: string;
};
type ClubSettings = {
  openingHours: string;
  tennisBookingUrl: string;
  padelBookingUrl: string;
  schoolUrl: string;
};
type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: "new" | "read" | "archived";
  created_at: string;
};
type ManagedUser = {
  id: string;
  display_name: string | null;
  username: string | null;
  login_email: string | null;
  role: string;
  must_change_password: boolean;
  created_at: string;
};
type TeamPhoto = { category: string; title: string; image: string };
type NewsItem = {
  id: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  image_path: string | null;
  published_at: string | null;
};
type NewsGallery = Record<string, string[]>;
type PublicEvent = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  starts_at: string | null;
  ends_at: string | null;
};
type MediaFile = { name: string; created_at: string | null };
type AdminEditor =
  | "news"
  | "event"
  | "media"
  | "membership"
  | "teams"
  | "club"
  | "downloads"
  | "focus"
  | "assistant"
  | "booking"
  | "inbox"
  | "users"
  | null;
type TeamGroup = { name: string; number: string; text: string; note: string };
type SiteImageKey = keyof typeof officialImages;
type AuditItem = {
  id: string;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  row_id: string;
  actor_email: string | null;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};
type FeaturedContent = {
  kind: "event" | "news";
  title: string;
  kicker: string;
  text: string;
  image: string;
  date: string;
  href: string;
};
type AiProposal = {
  action: "create_news" | "create_event" | "update_team" | "create_user";
  title: string;
  details: string;
  payload: Record<string, unknown>;
};
const OWNER_EMAIL = "elfinko008@icloud.com";
type TournamentFilter = "Alle" | "ITF" | "Jugend" | "LK" | "Herren" | "Damen";
type TournamentCategory = Exclude<TournamentFilter, "Alle">;
const tournamentEntries: Array<{
  date: string;
  month: string;
  kicker: string;
  title: string;
  categories: TournamentCategory[];
}> = [
  {
    date: "27 — 28",
    month: "JUN",
    kicker: "JUGEND · LK TURNIER",
    title: "Jugend LK Turnier U9 — U18",
    categories: ["Jugend", "LK"],
  },
  {
    date: "04",
    month: "JUL",
    kicker: "CLUB EVENT",
    title: "2. Schorle Cup",
    categories: [],
  },
  {
    date: "16 — 19",
    month: "JUL",
    kicker: "DTB HERREN A7",
    title: "1. Trier Wildcard Turnier",
    categories: ["Herren"],
  },
  {
    date: "10 — 16",
    month: "AUG",
    kicker: "ITF WORLD TENNIS TOUR · HERREN",
    title: "Etges & Dächert Open Trier",
    categories: ["ITF", "Herren"],
  },
  {
    date: "11 — 13",
    month: "SEP",
    kicker: "JUGEND · LK TURNIER",
    title: "TCT Jugend Tennis Turnier",
    categories: ["Jugend", "LK"],
  },
  {
    date: "18 — 22",
    month: "SEP",
    kicker: "DAMEN & HERREN · LK TURNIER",
    title: "Damen & Herren LK-Turnier",
    categories: ["Damen", "Herren", "LK"],
  },
];
const defaultFeaturedContent: FeaturedContent = {
  kind: "event",
  title: "Etges & Dächert Open.",
  kicker: "ITF WORLD TENNIS TOUR · HERREN",
  text: "Das internationale Weltranglistenturnier kehrt zum 40. Mal an das Moselstadion zurück. Eine Woche Tennis auf hohem Niveau, direkt in Trier.",
  image: "/assets/tct/images/turnier-itf.jpg",
  date: "10. – 16. August 2026",
  href: "#turniere",
};
const siteSearchIndex = [
  {
    title: "Der Verein",
    description: "Vorstand, Geschichte und Clubleben",
    href: "#verein",
  },
  {
    title: "Anlage",
    description: "Außenplätze, Halle, Padel und La Palma",
    href: "#anlage",
  },
  {
    title: "Mannschaften",
    description: "Herren, Damen und Jugend",
    href: "#mannschaften",
  },
  {
    title: "Turniere",
    description: "ITF, Herren, Damen, Jugend und LK",
    href: "#turniere",
  },
  {
    title: "Mitgliedschaft",
    description: "Beiträge und Mitglied werden",
    href: "#mitgliedschaft",
  },
  {
    title: "Downloads",
    description: "Aufnahmeantrag und Hallenpreise",
    href: "#downloads",
  },
  {
    title: "Kontakt",
    description: "Adresse, E-Mail und Telefon",
    href: "#kontakt",
  },
];

const auditAreaLabels: Record<string, string> = {
  news: "News",
  events: "Termine",
  club_content: "Website-Inhalte",
};
const auditFieldLabels: Record<string, string> = {
  title: "Titel",
  excerpt: "Kurztext",
  body: "Artikeltext",
  image_path: "Bild",
  status: "Status",
  published_at: "Veröffentlichung",
  starts_at: "Beginn",
  ends_at: "Ende",
  category: "Kategorie",
  description: "Beschreibung",
  value: "Inhalte",
  updated_by: "Verantwortliche Person",
};
const roleLabels: Record<string, string> = {
  member: "Mitglied",
  management: "Management",
  admin: "Vollzugriff",
  editor: "Vollzugriff Redaktion",
  content_manager: "Redaktion & Medien",
  tournament_manager: "Turnierleitung",
  team_manager: "Mannschaftsführung",
};

const editorialRoles = [
  "management",
  "admin",
  "editor",
  "content_manager",
  "tournament_manager",
  "team_manager",
];

function auditChangeSummary(item: AuditItem) {
  if (item.action === "INSERT") return "Neuen Eintrag erstellt";
  if (item.action === "DELETE") return "Eintrag gelöscht";
  const before = item.before_data ?? {};
  const after = item.after_data ?? {};
  const fields = Object.keys(after)
    .filter(
      (field) =>
        !["id", "created_at", "updated_at"].includes(field) &&
        JSON.stringify(before[field]) !== JSON.stringify(after[field]),
    )
    .map((field) => auditFieldLabels[field] ?? field);
  return fields.length
    ? `Geändert: ${fields.join(", ")}`
    : "Eintrag aktualisiert";
}

function ExternalArrow() {
  return <ArrowDownRight size={17} strokeWidth={2.2} aria-hidden="true" />;
}

function NewsManager({
  open,
  close,
  items,
  refresh,
  editing,
  setEditing,
  uploadPath,
  setUploadPath,
  save,
  upload,
  remove,
}: {
  open: boolean;
  close: () => void;
  items: NewsItem[];
  refresh: () => void;
  editing: NewsItem | null;
  setEditing: (news: NewsItem | null) => void;
  uploadPath: string;
  setUploadPath: (path: string) => void;
  save: (event: FormEvent<HTMLFormElement>) => void;
  upload: (file: File) => void;
  remove: (news: NewsItem) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="editor-overlay content-manager"
      role="dialog"
      aria-modal="true"
      aria-label="News verwalten"
    >
      <button
        className="admin-close"
        onClick={close}
        aria-label="Newsverwaltung schließen"
      >
        <X size={23} />
      </button>
      <div className="content-manager-card">
        <header>
          <div>
            <p className="eyebrow">
              <span /> Redaktion
            </p>
            <h2>
              News.
              <br />
              <em>In deiner Hand.</em>
            </h2>
            <p>
              Erstellen, bearbeiten, Bilder ersetzen oder Beiträge vollständig
              löschen – direkt auf der neuen TCT-Website.
            </p>
          </div>
          <div>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setUploadPath("");
              }}
            >
              Neue News
            </button>
          </div>
        </header>
        <div className="content-manager-grid">
          <form key={editing?.id ?? "new"} onSubmit={save}>
            <p className="kicker">
              {editing ? "NEWS BEARBEITEN" : "NEUE NEWS"}
            </p>
            <label>
              Titel
              <input
                required
                name="title"
                defaultValue={editing?.title ?? ""}
                placeholder="Titel der News"
              />
            </label>
            <label>
              Kurztext
              <textarea
                name="excerpt"
                rows={2}
                defaultValue={editing?.excerpt ?? ""}
                placeholder="Worum geht es?"
              />
            </label>
            <label>
              Artikeltext
              <textarea
                name="body"
                rows={8}
                defaultValue={editing?.body ?? ""}
                placeholder="Der vollständige Inhalt"
              />
            </label>
            <label>
              Aufmacherbild ersetzen
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) upload(file);
                }}
              />
            </label>
            {uploadPath && (
              <img
                className="upload-preview"
                src={uploadPath}
                alt="Ausgewähltes Newsbild"
              />
            )}
            <button className="button button-light" type="submit">
              {editing ? "Änderungen speichern" : "Jetzt veröffentlichen"}{" "}
              <ArrowRight size={17} />
            </button>
          </form>
          <section className="content-manager-list">
            <div>
              <p className="kicker">ALLE NEWS</p>
              <button type="button" onClick={refresh}>
                Aktualisieren
              </button>
            </div>
            {items.length ? (
              items.map((news) => (
                <article key={news.id}>
                  {news.image_path && <img src={news.image_path} alt="" />}
                  <div>
                    <p className="kicker">
                      {news.published_at
                        ? new Intl.DateTimeFormat("de-DE", {
                            dateStyle: "medium",
                          }).format(new Date(news.published_at))
                        : "ENTWURF"}
                    </p>
                    <h3>{news.title}</h3>
                    <p>{news.excerpt || "Kein Kurztext"}</p>
                    <footer>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(news);
                          setUploadPath(news.image_path ?? "");
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => remove(news)}
                      >
                        Löschen
                      </button>
                    </footer>
                  </div>
                </article>
              ))
            ) : (
              <p className="content-manager-empty">
                Noch keine News geladen. Klicke auf „Aktualisieren“.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function DownloadManager({
  open,
  close,
  items,
  save,
  remove,
}: {
  open: boolean;
  close: () => void;
  items: DownloadItem[];
  save: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: DownloadItem) => void;
}) {
  if (!open) return null;
  return (
    <div
      className="editor-overlay content-manager"
      role="dialog"
      aria-modal="true"
      aria-label="PDFs und Downloads verwalten"
    >
      <button
        className="admin-close"
        onClick={close}
        aria-label="Downloadverwaltung schließen"
      >
        <X size={23} />
      </button>
      <div className="content-manager-card">
        <header>
          <div>
            <p className="eyebrow">
              <span /> Service
            </p>
            <h2>
              PDFs.
              <br />
              <em>Aktuell halten.</em>
            </h2>
            <p>
              Hallenpreise, Aufnahmeantrag und weitere Vereinsunterlagen werden
              hier hochgeladen, ersetzt oder entfernt.
            </p>
          </div>
        </header>
        <div className="content-manager-grid">
          <form onSubmit={save}>
            <p className="kicker">PDF HOCHLADEN / ERSETZEN</p>
            <label>
              Titel
              <input required name="title" placeholder="z. B. Hallenpreise" />
            </label>
            <label>
              Kategorie
              <input required name="category" placeholder="z. B. TENNISHALLE" />
            </label>
            <label>
              Beschreibung
              <textarea
                required
                name="text"
                rows={3}
                placeholder="Kurze Erklärung zum Dokument"
              />
            </label>
            <label>
              PDF-Datei
              <input
                required
                name="pdf"
                type="file"
                accept="application/pdf,.pdf"
              />
            </label>
            <button className="button button-light" type="submit">
              PDF veröffentlichen <FileText size={17} />
            </button>
          </form>
          <section className="content-manager-list">
            <div>
              <p className="kicker">AKTUELLE DOWNLOADS</p>
            </div>
            {items.length ? (
              items.map((download) => (
                <article key={download.file}>
                  <div>
                    <p className="kicker">{download.category}</p>
                    <h3>{download.title}</h3>
                    <p>{download.text}</p>
                    <footer>
                      <a href={download.file} target="_blank" rel="noreferrer">
                        Öffnen
                      </a>
                      <button
                        className="danger"
                        type="button"
                        onClick={() => remove(download)}
                      >
                        Entfernen
                      </button>
                    </footer>
                  </div>
                </article>
              ))
            ) : (
              <p className="content-manager-empty">
                Derzeit sind keine PDFs veröffentlicht.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function SiteImageManager({
  open,
  close,
  images,
  upload,
  reset,
}: {
  open: boolean;
  close: () => void;
  images: Record<SiteImageKey, string>;
  upload: (key: SiteImageKey, file: File) => void;
  reset: (key: SiteImageKey) => void;
}) {
  if (!open) return null;
  const labels: Record<SiteImageKey, string> = {
    logo: "TCT Logo",
    facility: "Anlage",
    hall: "Tennishalle",
    padel: "Padelplatz",
    restaurant: "La Palma",
    court: "Startseitenbild",
    player: "Tennisspieler",
    tournament: "Turnierbild",
    school: "Tennisschule",
  };
  return (
    <div
      className="editor-overlay content-manager"
      role="dialog"
      aria-modal="true"
      aria-label="Websitebilder verwalten"
    >
      <button
        className="admin-close"
        onClick={close}
        aria-label="Bildverwaltung schließen"
      >
        <X size={23} />
      </button>
      <div className="content-manager-card">
        <header>
          <div>
            <p className="eyebrow">
              <span /> Medien
            </p>
            <h2>
              Website-
              <br />
              <em>Bilder.</em>
            </h2>
            <p>
              Hier ersetzt du Logo, Startseitenbild und alle festen Bilder der
              Website. Mannschafts- und Newsbilder verwaltest du in ihren
              jeweiligen Bereichen.
            </p>
          </div>
        </header>
        <div className="site-image-grid">
          {(Object.keys(images) as SiteImageKey[]).map((key) => (
            <article key={key}>
              <img src={images[key]} alt={labels[key]} />
              <div>
                <p className="kicker">{key}</p>
                <h3>{labels[key]}</h3>
                <label>
                  Bild ersetzen
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      if (file) upload(key, file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {images[key] !== officialImages[key] && (
                  <button
                    className="danger"
                    type="button"
                    onClick={() => reset(key)}
                  >
                    Eigene Datei löschen
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

function FocusManager({
  open,
  close,
  news,
  events,
  featured,
  choose,
  clear,
  createNews,
  createEvent,
}: {
  open: boolean;
  close: () => void;
  news: NewsItem[];
  events: PublicEvent[];
  featured: FeaturedContent;
  choose: (item: FeaturedContent) => void;
  clear: () => void;
  createNews: () => void;
  createEvent: () => void;
}) {
  if (!open) return null;
  const eventDate = (event: PublicEvent) =>
    event.starts_at
      ? new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(
          new Date(event.starts_at),
        )
      : "Datum folgt";
  return (
    <div
      className="editor-overlay content-manager"
      role="dialog"
      aria-modal="true"
      aria-label="Startseiten-Fokus verwalten"
    >
      <button
        className="admin-close"
        onClick={close}
        aria-label="Fokusverwaltung schließen"
      >
        <X size={23} />
      </button>
      <div className="content-manager-card">
        <header>
          <div>
            <p className="eyebrow">
              <span /> Startseite
            </p>
            <h2>
              Im
              <br />
              <em>Fokus.</em>
            </h2>
            <p>
              Genau ein Termin oder eine News bekommt den großen Platz direkt
              unter dem Startbild. Der alte Fokus lässt sich jederzeit wieder
              entfernen – ideal nach dem ITF.
            </p>
          </div>
          <div>
            <button type="button" onClick={createNews}>
              Neue News
            </button>
            <button type="button" onClick={createEvent}>
              Neuer Termin
            </button>
            <button type="button" onClick={clear}>
              Fokus entfernen
            </button>
          </div>
        </header>
        <div className="focus-current">
          <img src={featured.image} alt="Aktueller Fokus" />
          <div>
            <p className="kicker">
              AKTUELLER FOKUS · {featured.kind === "event" ? "TERMIN" : "NEWS"}
            </p>
            <h3>{featured.title}</h3>
            <p>{featured.date}</p>
          </div>
        </div>
        <div className="focus-options">
          <section>
            <p className="kicker">NEWS IN DEN FOKUS SETZEN</p>
            {news.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  choose({
                    kind: "news",
                    title: item.title,
                    kicker: "TCT NEWS",
                    text:
                      item.excerpt ||
                      item.body ||
                      "Aktuelles aus dem Tennisclub Trier.",
                    image:
                      item.image_path || "/assets/tct/images/turnier-itf.jpg",
                    date: item.published_at
                      ? new Intl.DateTimeFormat("de-DE", {
                          dateStyle: "long",
                        }).format(new Date(item.published_at))
                      : "Aktuell",
                    href: "#aktuell",
                  })
                }
              >
                {item.image_path && <img src={item.image_path} alt="" />}
                <span>{item.title}</span>
                <ArrowRight size={17} />
              </button>
            ))}
          </section>
          <section>
            <p className="kicker">TERMINE / TURNIERE IN DEN FOKUS SETZEN</p>
            {events.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() =>
                  choose({
                    kind: "event",
                    title: item.title,
                    kicker: item.category
                      ? `${item.category.toUpperCase()} · TERMIN`
                      : "TCT TERMIN",
                    text:
                      item.description ||
                      "Alle Informationen zum Termin im Tennisclub Trier.",
                    image: "/assets/tct/images/turnier-itf.jpg",
                    date: eventDate(item),
                    href: "#turniere",
                  })
                }
              >
                <CalendarDays size={18} />
                <span>
                  {item.title}
                  <small>{eventDate(item)}</small>
                </span>
                <ArrowRight size={17} />
              </button>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}

function ClubAssistant({
  open,
  close,
  role,
}: {
  open: boolean;
  close: () => void;
  role: string;
}) {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState("");
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [waiting, setWaiting] = useState(false);
  if (!open) return null;
  const ask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !prompt.trim()) return;
    setWaiting(true);
    setStatus("");
    setProposal(null);
    const { data, error } = await supabase.functions.invoke("club-ai", {
      body: { mode: "chat", prompt },
    });
    setWaiting(false);
    if (error || data?.error) {
      setStatus(
        data?.error ??
          `KI-Anfrage fehlgeschlagen: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setReply(data.reply ?? "");
    setProposal((data.proposal ?? null) as AiProposal | null);
  };
  const execute = async () => {
    if (
      !supabase ||
      !proposal ||
      !window.confirm(`Wirklich ausführen?\n\n${proposal.details}`)
    )
      return;
    if (proposal.action === "create_user" && password.length < 10) {
      setStatus("Bitte ein Startpasswort mit mindestens 10 Zeichen eingeben.");
      return;
    }
    setWaiting(true);
    setStatus("");
    const { data, error } = await supabase.functions.invoke("club-ai", {
      body: {
        mode: "execute",
        proposal,
        password: proposal.action === "create_user" ? password : undefined,
      },
    });
    setWaiting(false);
    if (error || data?.error) {
      setStatus(
        data?.error ??
          `Änderung fehlgeschlagen: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setStatus(data.message ?? "Änderung wurde ausgeführt.");
    setProposal(null);
    setPrompt("");
    setPassword("");
  };
  const examples: Record<string, string> = {
    tournament_manager:
      "Erstelle ein Jugend-LK-Turnier am 14. September um 10 Uhr.",
    team_manager: "Aktualisiere den Saisonhinweis für Herren.",
    content_manager: "Schreibe eine News über unser Sommerfest.",
    management: "Lege einen Benutzer für die Turnierleitung an.",
    admin: "Erstelle eine News über die neue Hallensaison.",
    editor: "Erstelle einen Termin für die Mitgliederversammlung.",
  };
  return (
    <div
      className="editor-overlay ai-assistant"
      role="dialog"
      aria-modal="true"
      aria-label="TCT KI-Assistent"
    >
      <button
        className="admin-close"
        onClick={close}
        aria-label="KI-Assistent schließen"
      >
        <X size={23} />
      </button>
      <section>
        <header>
          <p className="eyebrow">
            <span /> TCT Club Assistant · Groq
          </p>
          <h2>
            Wie kann ich
            <br />
            <em>helfen?</em>
          </h2>
          <p>
            Frage mich etwas zum Club oder zur Website – oder lasse dir eine
            Änderung vorbereiten. Nichts wird ohne deine ausdrückliche
            Bestätigung geändert.
          </p>
        </header>
        <form onSubmit={ask}>
          <label>
            Frage oder Aufgabe
            <textarea
              required
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              rows={4}
              placeholder={
                examples[role] ??
                "Frag etwas oder beschreibe, was du erledigen möchtest."
              }
            />
          </label>
          <button
            className="button button-light"
            disabled={waiting}
            type="submit"
          >
            {waiting ? "Denke nach …" : "Fragen oder vorbereiten"}{" "}
            <ArrowRight size={17} />
          </button>
        </form>
        {reply && (
          <div className="ai-reply">
            <p className="kicker">KI-ANTWORT</p>
            <p>{reply}</p>
          </div>
        )}
        {proposal && (
          <div className="ai-proposal">
            <p className="kicker">
              ÄNDERUNGSVORSCHLAG · BESTÄTIGUNG ERFORDERLICH
            </p>
            <h3>{proposal.title}</h3>
            <p>{proposal.details}</p>
            <code>{proposal.action}</code>
            {proposal.action === "create_user" && (
              <label>
                Startpasswort für den neuen Benutzer
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  minLength={10}
                  autoComplete="new-password"
                  placeholder="Mindestens 10 Zeichen"
                />
              </label>
            )}
            <div>
              <button type="button" onClick={() => setProposal(null)}>
                Verwerfen
              </button>
              <button
                className="button button-light"
                disabled={waiting}
                type="button"
                onClick={() => void execute()}
              >
                Jetzt bestätigen <Check size={17} />
              </button>
            </div>
          </div>
        )}
        {status && <p className="ai-status">{status}</p>}
        <small>
          Rolle: {roleLabels[role] ?? role}. Die Rollenprüfung läuft vor jedem
          Vorschlag und nochmals vor jeder Ausführung auf dem Server.
        </small>
      </section>
    </div>
  );
}

function App() {
  const isBookingPage = window.location.pathname.replace(/\/+$/, "") === "/booking";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [adminPanel, setAdminPanel] = useState<"login" | "dashboard" | null>(
    null,
  );
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [showAuthPassword, setShowAuthPassword] = useState(false);
  const [adminNotice, setAdminNotice] = useState("");
  const [adminEditor, setAdminEditor] = useState<AdminEditor>(null);
  const [adminUserId, setAdminUserId] = useState<string | null>(null);
  const [uploadPath, setUploadPath] = useState("");
  const [liveMembership, setLiveMembership] = useState<PriceItem[]>(
    membership.map(([name, price, monthly]) => ({ name, price, monthly })),
  );
  const [liveDownloads, setLiveDownloads] = useState<DownloadItem[]>(
    downloads.map((download) => ({ ...download })),
  );
  const [liveClub, setLiveClub] = useState<ClubSettings>({
    openingHours:
      "Aktuelle Platz- und Hallenzeiten direkt über die Buchung prüfen.",
    tennisBookingUrl: club.bookingUrl,
    padelBookingUrl: club.padelUrl,
    schoolUrl: club.schoolUrl,
  });
  const [liveSiteImages, setLiveSiteImages] = useState<
    Record<SiteImageKey, string>
  >({ ...officialImages });
  const [liveTeams, setLiveTeams] = useState<TeamGroup[]>(
    teamGroups.map((team) => ({ ...team })),
  );
  const [liveTeamGallery, setLiveTeamGallery] = useState<TeamPhoto[]>(
    teamGallery.map((team) => ({ ...team })),
  );
  const [liveNews, setLiveNews] = useState<NewsItem[]>([]);
  const [featuredContent, setFeaturedContent] = useState<FeaturedContent>(
    defaultFeaturedContent,
  );
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [newsGalleries, setNewsGalleries] = useState<NewsGallery>({});
  const [newsArchive, setNewsArchive] = useState<NewsItem[] | null>(null);
  const [allPublishedNews, setAllPublishedNews] = useState<NewsItem[]>([]);
  const [adminNews, setAdminNews] = useState<NewsItem[]>([]);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [selectedTeamPhoto, setSelectedTeamPhoto] = useState<{
    title: string;
    image: string;
  } | null>(null);
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [liveEvents, setLiveEvents] = useState<PublicEvent[]>([]);
  const [adminEvents, setAdminEvents] = useState<PublicEvent[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [contactError, setContactError] = useState("");
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminRole, setAdminRole] = useState("");
  const [adminName, setAdminName] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [tournamentFilter, setTournamentFilter] =
    useState<TournamentFilter>("Alle");
  const [teamGroup, setTeamGroup] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("in-view");
        }),
      { threshold: 0.14 },
    );
    document
      .querySelectorAll(".motion")
      .forEach((element) => observer.observe(element));
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("keydown", onKeyDown);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadTeamGallery = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "team_gallery")
        .maybeSingle();
      const items = data?.value?.items;
      if (Array.isArray(items)) setLiveTeamGallery(items as TeamPhoto[]);
    };
    void loadTeamGallery();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadSiteImages = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "site_images")
        .maybeSingle();
      const items = data?.value?.items;
      if (items && typeof items === "object")
        setLiveSiteImages((previous) => {
          const next = {
            ...previous,
            ...(items as Partial<Record<SiteImageKey, string>>),
          };
          Object.assign(officialImages, next);
          return next;
        });
    };
    void loadSiteImages();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadNewsGalleries = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "legacy_news_images")
        .maybeSingle();
      const items = data?.value?.items;
      if (items && typeof items === "object")
        setNewsGalleries(items as NewsGallery);
    };
    void loadNewsGalleries();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadFeaturedContent = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "featured_content")
        .maybeSingle();
      const item = data?.value?.item;
      if (item && typeof item === "object")
        setFeaturedContent(item as FeaturedContent);
    };
    void loadFeaturedContent();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadClubSettings = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "club_settings")
        .maybeSingle();
      const settings = data?.value?.settings;
      if (settings && typeof settings === "object")
        setLiveClub((previous) => ({ ...previous, ...settings }));
    };
    void loadClubSettings();
  }, []);

  useEffect(() => {
    if (["#admin", "#anmelden", "#registrieren"].includes(window.location.hash)) {
      setAuthMode(window.location.hash === "#registrieren" ? "register" : "login");
      setAdminPanel("login");
    }
    if (window.location.hash === "#datenschutz") setPrivacyOpen(true);
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadContent = async () => {
      const [
        membershipResult,
        downloadsResult,
        teamsResult,
        newsResult,
        eventsResult,
      ] = await Promise.all([
        client
          .from("club_content")
          .select("value")
          .eq("key", "membership")
          .maybeSingle(),
        client
          .from("club_content")
          .select("value")
          .eq("key", "downloads")
          .maybeSingle(),
        client
          .from("club_content")
          .select("value")
          .eq("key", "teams")
          .maybeSingle(),
        client
          .from("news")
          .select("id,title,excerpt,body,image_path,published_at")
          .eq("status", "published")
          .order("published_at", { ascending: false })
          .limit(3),
        client
          .from("events")
          .select("id,title,category,description,starts_at,ends_at")
          .eq("status", "published")
          .order("starts_at", { ascending: true })
          .limit(4),
      ]);
      const items = membershipResult.data?.value?.items;
      if (Array.isArray(items)) setLiveMembership(items as PriceItem[]);
      const downloadItems = downloadsResult.data?.value?.items;
      if (Array.isArray(downloadItems))
        setLiveDownloads(downloadItems as DownloadItem[]);
      const teams = teamsResult.data?.value?.items;
      if (Array.isArray(teams)) setLiveTeams(teams as TeamGroup[]);
      if (newsResult.data) setLiveNews(newsResult.data);
      if (eventsResult.data) setLiveEvents(eventsResult.data);
    };
    void loadContent();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadPublishedArchive = async () => {
      const { data } = await client
        .from("news")
        .select("id,title,excerpt,body,image_path,published_at")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(200);
      if (data) setAllPublishedNews(data);
    };
    void loadPublishedArchive();
  }, []);

  const submitInterest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const message = String(form.get("message") ?? "");
    setContactError("");
    if (!supabase) {
      const subject = encodeURIComponent(`Mitgliedschafts-Anfrage von ${name}`);
      const body = encodeURIComponent(
        `Name: ${name}\nE-Mail: ${email}\n\nNachricht:\n${message}`,
      );
      window.location.href = `mailto:${club.email}?subject=${subject}&body=${body}`;
      setFormSent(true);
      return;
    }
    const { error } = await supabase
      .from("contact_messages")
      .insert({ name, email, message: message || null });
    if (error) {
      setContactError(
        "Deine Anfrage konnte gerade nicht gespeichert werden. Bitte schreibe uns direkt per E-Mail.",
      );
      return;
    }
    setFormSent(true);
  };

  const shownTournaments = tournamentEntries.filter(
    (entry) =>
      tournamentFilter === "Alle" ||
      entry.categories.includes(tournamentFilter),
  );
  const searchResults = [
    ...siteSearchIndex,
    ...liveNews.map((news) => ({
      title: news.title,
      description: news.excerpt ?? "News des Tennisclub Trier",
      href: "#news",
    })),
  ].filter(
    (entry) =>
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const currentHour = new Date().getHours();
  const greetingPrefix =
    currentHour < 5
      ? "Gute Nacht"
      : currentHour < 12
        ? "Guten Morgen"
        : currentHour < 18
          ? "Guten Tag"
          : "Guten Abend";
  const dashboardGreeting = `${greetingPrefix}${adminName ? `, ${adminName.split(" ")[0]}` : ""}.`;
  const canManageNews = [
    "management",
    "admin",
    "editor",
    "content_manager",
  ].includes(adminRole);
  const canManageEvents = [
    "management",
    "admin",
    "editor",
    "tournament_manager",
  ].includes(adminRole);
  const canManageTeams = [
    "management",
    "admin",
    "editor",
    "team_manager",
  ].includes(adminRole);
  const canManageGeneralContent = [
    "management",
    "admin",
    "editor",
    "content_manager",
  ].includes(adminRole);
  const canManageInbox = ["management", "admin", "editor"].includes(adminRole);
  const canManageBooking = ["management", "admin"].includes(adminRole);
  const canManageFocus = ["management", "admin", "editor"].includes(adminRole);
  const traditionYears = new Date().getFullYear() - 1888;
  const tutorialSteps =
    adminRole === "tournament_manager"
      ? [
          ["Willkommen.", "Du verwaltest Termine und Turniere für den Club."],
          [
            "Termine & Turniere",
            "Wähle eine Kategorie wie ITF, Jugend oder LK aus und veröffentliche neue Einträge.",
          ],
          [
            "Dein Ablauf",
            "Prüfe nach dem Speichern die öffentliche Turnierseite und halte Daten aktuell.",
          ],
        ]
      : adminRole === "team_manager"
        ? [
            ["Willkommen.", "Du pflegst die Mannschaftsbereiche des TCT."],
            [
              "Neue Saisonbilder",
              "Unter Mannschaften kannst du jedes Teamfoto direkt ersetzen.",
            ],
            [
              "Dein Ablauf",
              "Lade nur freigegebene Bilder hoch; die Website übernimmt sie sofort.",
            ],
          ]
        : [
            [
              "Willkommen.",
              `Deine Rolle: ${roleLabels[adminRole] ?? "Redaktion"}.`,
            ],
            [
              "Dein Dashboard",
              "News, Termine, Medien, Mannschaften und Postfach erreichst du links.",
            ],
            [
              "Sicher arbeiten",
              "Änderungen werden im Änderungslog protokolliert. Prüfe Inhalte vor der Veröffentlichung.",
            ],
          ];

  const loadAudit = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("audit_log")
      .select(
        "id,action,table_name,row_id,actor_email,before_data,after_data,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setAuditItems(data as AuditItem[]);
  };

  const loadMedia = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.storage
      .from("club-media")
      .list("news", {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (!error && data)
      setMediaFiles(
        data.filter(
          (file) => file.name !== ".emptyFolderPlaceholder",
        ) as MediaFile[],
      );
  };

  const loadNewsArchive = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("news")
      .select("id,title,excerpt,body,image_path,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .limit(100);
    if (data) {
      setAllPublishedNews(data);
      setNewsArchive(data);
    }
  };

  const loadAdminNews = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("news")
      .select("id,title,excerpt,body,image_path,published_at")
      .order("published_at", { ascending: false })
      .limit(200);
    if (error) {
      setAdminNotice(`News konnten nicht geladen werden: ${error.message}`);
      return;
    }
    setAdminNews(data ?? []);
  };

  const deleteNews = async (news: NewsItem) => {
    if (!supabase || !window.confirm(`„${news.title}“ wirklich löschen?`))
      return;
    const { error } = await supabase.from("news").delete().eq("id", news.id);
    if (error) {
      setAdminNotice(`News konnte nicht gelöscht werden: ${error.message}`);
      return;
    }
    setAdminNews((items) => items.filter((item) => item.id !== news.id));
    setLiveNews((items) => items.filter((item) => item.id !== news.id));
    setAdminNotice("News wurde gelöscht.");
  };

  /* The one-time legacy-news migration has been completed. It intentionally has no UI action anymore.
  const importLegacyNews = async () => {
    if (
      !supabase ||
      !window.confirm(
        "Die bisherigen TCT-News samt Bildern in die neue Website übernehmen? Bereits übernommene Beiträge werden nicht doppelt angelegt.",
      )
    )
      return;
    setAdminNotice(
      "Alte News und Bilder werden in die neue Website kopiert. Das kann kurz dauern …",
    );
    const { data, error } = await supabase.functions.invoke(
      "import-legacy-news",
      { body: {} },
    );
    if (error || data?.error) {
      setAdminNotice(
        data?.error ??
          `Übernahme fehlgeschlagen: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setAdminNotice(
      `${data.imported ?? 0} News und ${data.images ?? 0} Bilder wurden in die neue Website übernommen.`,
    );
    await loadAdminNews();
    const { data: galleryData } = await supabase
      .from("club_content")
      .select("value")
      .eq("key", "legacy_news_images")
      .maybeSingle();
    if (galleryData?.value?.items)
      setNewsGalleries(galleryData.value.items as NewsGallery);
  };

  */

  const loadAdminEvents = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from("events")
      .select("id,title,category,description,starts_at,ends_at")
      .order("starts_at", { ascending: true })
      .limit(100);
    if (data) setAdminEvents(data);
  };

  const loadContactMessages = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("contact_messages")
      .select("id,name,email,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setContactMessages(data as ContactMessage[]);
  };

  const loadManagedUsers = async () => {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "list" },
    });
    if (error || data?.error) {
      setAdminNotice(
        data?.error ??
          `Benutzerverwaltung konnte deine Anmeldung nicht prüfen: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setManagedUsers((data.users ?? []) as ManagedUser[]);
  };

  const createManagedUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: {
        action: "create",
        email: String(form.get("email")),
        username: String(form.get("username")),
        password: String(form.get("password")),
        displayName: String(form.get("displayName")),
        role: String(form.get("role")),
      },
    });
    if (error || data?.error) {
      setAdminNotice(
        data?.error ??
          `Konto konnte nicht erstellt werden: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    event.currentTarget.reset();
    setAdminNotice(
      `Benutzer erstellt. Anmeldung mit ${data.username ?? "dem Benutzernamen"}${data.usesInternalEmail ? " (es wurde noch keine echte E-Mail hinterlegt)" : ""}. Beim ersten Login muss das Passwort geändert werden.`,
    );
    await loadManagedUsers();
  };

  const changeManagedUserRole = async (userId: string, role: string) => {
    if (!supabase) return;
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "role", userId, role },
    });
    if (error || data?.error) {
      setAdminNotice(data?.error ?? "Rolle konnte nicht aktualisiert werden.");
      return;
    }
    setManagedUsers((users) =>
      users.map((user) => (user.id === userId ? { ...user, role } : user)),
    );
  };

  const deleteManagedUser = async (user: ManagedUser) => {
    if (
      !supabase ||
      !window.confirm(
        `Zugang von ${user.display_name || user.username || user.login_email} wirklich löschen?`,
      )
    )
      return;
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "delete", userId: user.id },
    });
    if (error || data?.error) {
      setAdminNotice(
        data?.error ??
          `Zugang konnte nicht gelöscht werden: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setManagedUsers((users) => users.filter((item) => item.id !== user.id));
    setAdminNotice("Benutzerzugang wurde gelöscht.");
  };

  const changeInitialPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    const confirmation = String(form.get("confirmation"));
    if (password !== confirmation) {
      setAdminNotice("Die Passwörter stimmen nicht überein.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setAdminNotice(`Passwort konnte nicht geändert werden: ${error.message}`);
      return;
    }
    const { data, error: completionError } = await supabase.functions.invoke(
      "admin-users",
      { body: { action: "passwordChanged" } },
    );
    if (completionError || data?.error) {
      setAdminNotice(
        `Passwort geändert, aber die Erstlogin-Sperre konnte nicht bestätigt werden: ${data?.error ?? completionError?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setMustChangePassword(false);
    setAdminNotice("Passwort sicher geändert.");
  };

  const changeOwnCredentials = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (password) {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setAdminNotice(
          `Passwort konnte nicht geändert werden: ${error.message}`,
        );
        return;
      }
    }
    if (email && email !== adminEmail) {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "changeOwnEmail", email },
      });
      if (error || data?.error) {
        setAdminNotice(data?.error ?? "E-Mail konnte nicht geändert werden.");
        return;
      }
      setAdminEmail(email);
    }
    setAccountOpen(false);
    setAdminNotice("Deine Zugangsdaten wurden aktualisiert.");
  };

  const signOutAccount = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAdminNotice(`Abmeldung fehlgeschlagen: ${error.message}`);
      return;
    }
    setAccountOpen(false);
    setAdminEditor(null);
    setAdminPanel(null);
    setAdminNotice("Du wurdest abgemeldet.");
  };

  const completeTutorial = async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc("complete_platform_tutorial");
    if (error) {
      setAdminNotice(
        `Tutorial konnte nicht abgeschlossen werden: ${error.message}`,
      );
      return;
    }
    setTutorialOpen(false);
    setTutorialStep(0);
  };

  const updateContactStatus = async (
    id: string,
    status: ContactMessage["status"],
  ) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id);
    if (error) {
      setAdminNotice(
        `Anfrage konnte nicht aktualisiert werden: ${error.message}`,
      );
      return;
    }
    setContactMessages((messages) =>
      messages.map((message) =>
        message.id === id ? { ...message, status } : message,
      ),
    );
  };

  useEffect(() => {
    if (adminEditor === "event") void loadAdminEvents();
  }, [adminEditor]);

  useEffect(() => {
    if (adminEditor === "inbox") void loadContactMessages();
  }, [adminEditor]);

  useEffect(() => {
    if (adminEditor === "news") void loadAdminNews();
  }, [adminEditor]);

  useEffect(() => {
    if (adminEditor === "focus") {
      void loadAdminNews();
      void loadAdminEvents();
    }
  }, [adminEditor]);

  useEffect(() => {
    if (
      adminEditor === "users" &&
      (adminEmail === OWNER_EMAIL || adminRole === "management")
    )
      void loadManagedUsers();
  }, [adminEditor, adminEmail]);

  const applyAuthenticatedUser = async (
    userId: string,
    userEmail: string | null,
    openMemberAccount = true,
    openAdminDashboard = true,
  ) => {
    if (!supabase) return false;
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role,display_name,must_change_password,tutorial_completed,email_verified")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile) {
      setAdminNotice("Zu diesem Login wurde kein Mitgliederkonto gefunden.");
      return false;
    }
    if (!profile.email_verified) {
      const code = window.prompt("Bitte gib den sechsstelligen Code aus deiner TCT-E-Mail ein.");
      if (!code || !userEmail) {
        await supabase.auth.signOut();
        setAdminNotice("Bitte bestätige zuerst den sechsstelligen Code aus deiner TCT-E-Mail.");
        return false;
      }
      const { data: verified, error: verifyError } = await supabase.functions.invoke(
        "verify-member-email",
        { body: { email: userEmail, code } },
      );
      if (verifyError || verified?.error) {
        await supabase.auth.signOut();
        setAdminNotice(verified?.error ?? "Code konnte nicht geprüft werden.");
        return false;
      }
      profile.email_verified = true;
    }
    setAdminUserId(userId);
    setAdminEmail(userEmail);
    setAdminRole(profile.role);
    setAdminName(profile.display_name ?? "");
    setMustChangePassword(Boolean(profile.must_change_password));
    setTutorialOpen(
      editorialRoles.includes(profile.role) && !profile.tutorial_completed,
    );
    if (userEmail === OWNER_EMAIL) void loadAudit();

    if (editorialRoles.includes(profile.role)) {
      setAdminNotice("Sicher angemeldet.");
      if (openAdminDashboard) setAdminPanel("dashboard");
      return true;
    }

    setAdminPanel(null);
    setAdminNotice("Willkommen im TCT-Mitgliederkonto.");
    if (openMemberAccount) setAccountOpen(true);
    return true;
  };

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const restoreSession = async () => {
      const {
        data: { session },
      } = await client.auth.getSession();
      if (session?.user)
        await applyAuthenticatedUser(
          session.user.id,
          session.user.email ?? null,
          false,
          false,
        );
    };
    void restoreSession();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (session?.user) return;
      setAdminUserId(null);
      setAdminEmail(null);
      setAdminRole("");
      setAdminName("");
      setAccountOpen(false);
      setAdminPanel(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loginAdmin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAdminNotice(
        "Supabase ist noch nicht verbunden — dies ist die Demo-Ansicht.",
      );
      setAdminPanel("dashboard");
      return;
    }
    const form = new FormData(event.currentTarget);
    const identifier = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (!identifier.includes("@")) {
      const { data: lookup, error: lookupError } =
        await supabase.functions.invoke("login-username", {
          body: { username: identifier, password },
        });
      if (lookupError || lookup?.error || !lookup?.session) {
        setAdminNotice("Anmeldung fehlgeschlagen. Bitte Zugang prüfen.");
        return;
      }
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession(lookup.session);
      if (sessionError || !sessionData.user) {
        setAdminNotice("Anmeldung fehlgeschlagen. Bitte Zugang prÃ¼fen.");
        return;
      }
      await applyAuthenticatedUser(
        sessionData.user.id,
        sessionData.user.email ?? null,
      );
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });
    if (error) {
      setAdminNotice(
        "Anmeldung fehlgeschlagen. Bitte Zugang in Supabase prüfen.",
      );
      return;
    }
    await applyAuthenticatedUser(data.user.id, data.user.email ?? null);
  };

  const registerMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAdminNotice("Supabase ist noch nicht verbunden.");
      return;
    }
    const form = new FormData(event.currentTarget);
    const { data, error } = await supabase.functions.invoke(
      "member-registration",
      {
        body: {
          displayName: String(form.get("displayName")).trim(),
          username: String(form.get("username")).trim(),
          email: String(form.get("email")).trim(),
          password: String(form.get("password")),
        },
      },
    );
    if (error || data?.error) {
      setAdminNotice(
        data?.error ??
          `Registrierung konnte nicht abgeschlossen werden: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    event.currentTarget.reset();
    if (data?.needsEmailConfirmation) {
      const code = window.prompt("Fast geschafft: Bitte gib den sechsstelligen Code aus deiner TCT-E-Mail ein.");
      if (!code) {
        setAdminNotice("Der Code wurde per E-Mail versendet. Bestätige ihn beim nächsten Anmeldeversuch.");
        setAuthMode("login");
        return;
      }
      const { data: verified, error: verifyError } = await supabase.functions.invoke("verify-member-email", { body: { email: String(form.get("email")).trim(), code } });
      setAuthMode("login");
      setAdminNotice(verifyError || verified?.error ? verified?.error ?? "Code konnte nicht geprüft werden." : "E-Mail bestätigt. Du kannst dich jetzt anmelden.");
      return;
    }
    setAuthMode("login");
    setAdminNotice(
      data?.needsEmailConfirmation
        ? "Fast geschafft: Bitte bestätige zuerst den Link in deiner E-Mail."
        : "Dein Mitgliederkonto wurde erstellt. Du kannst dich jetzt anmelden.",
    );
  };

  const saveNews = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const payload = {
      title: String(form.get("title")),
      excerpt: String(form.get("excerpt")) || null,
      body: String(form.get("body")) || null,
      image_path: uploadPath || null,
      status: "published",
      published_at: editingNews?.published_at ?? new Date().toISOString(),
    };
    const { error } = editingNews
      ? await supabase.from("news").update(payload).eq("id", editingNews.id)
      : await supabase.from("news").insert(payload);
    if (error) {
      setAdminNotice(`News konnte nicht gespeichert werden: ${error.message}`);
      return;
    }
    setAdminNotice(
      editingNews ? "News wurde aktualisiert." : "News wurde veröffentlicht.",
    );
    setEditingNews(null);
    setUploadPath("");
    await loadAdminNews();
  };

  const saveEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const startsAt = String(form.get("starts_at"));
    const endsAt = String(form.get("ends_at"));
    const { error } = await supabase.from("events").insert({
      title: String(form.get("title")),
      category: String(form.get("category")) || null,
      description: String(form.get("description")) || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      status: "published",
    });
    if (error) {
      setAdminNotice(
        `Termin konnte nicht gespeichert werden: ${error.message}`,
      );
      return;
    }
    setAdminNotice("Termin wurde veröffentlicht.");
    await loadAdminEvents();
    event.currentTarget.reset();
  };

  const deleteEvent = async (id: string) => {
    if (!supabase || !window.confirm("Termin wirklich löschen?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setAdminNotice(`Termin konnte nicht gelöscht werden: ${error.message}`);
      return;
    }
    setAdminNotice("Termin wurde gelöscht.");
    await loadAdminEvents();
  };

  const saveFeaturedContent = async (item: FeaturedContent) => {
    if (!supabase || !adminUserId) return;
    const { error } = await supabase.from("club_content").upsert({
      key: "featured_content",
      value: { item },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(`Fokus konnte nicht gespeichert werden: ${error.message}`);
      return;
    }
    setFeaturedContent(item);
    setAdminNotice("Der Beitrag steht jetzt im Fokus auf der Startseite.");
  };

  const clearFeaturedContent = async () => {
    if (
      !supabase ||
      !adminUserId ||
      !window.confirm(
        "Den aktuellen Fokus von der Startseite nehmen? Der Beitrag selbst wird nicht gelöscht.",
      )
    )
      return;
    const { error } = await supabase.from("club_content").upsert({
      key: "featured_content",
      value: { item: defaultFeaturedContent },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(`Fokus konnte nicht entfernt werden: ${error.message}`);
      return;
    }
    setFeaturedContent(defaultFeaturedContent);
    setAdminNotice("Der Fokus wurde zurückgesetzt.");
  };

  const saveMembership = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveMembership.map((_, index) => ({
      name: String(form.get(`name-${index}`)),
      price: String(form.get(`price-${index}`)),
      monthly: String(form.get(`monthly-${index}`)),
    }));
    const { error } = await supabase
      .from("club_content")
      .upsert({ key: "membership", value: { items }, updated_by: adminUserId });
    if (error) {
      setAdminNotice(
        `Beiträge konnten nicht gespeichert werden: ${error.message}`,
      );
      return;
    }
    setLiveMembership(items);
    setAdminNotice("Beiträge wurden aktualisiert.");
    setAdminEditor(null);
  };

  const saveTeams = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveTeams.map((team, index) => ({
      name: team.name,
      number: team.number,
      text: String(form.get(`text-${index}`)),
      note: String(form.get(`note-${index}`)),
    }));
    const { error } = await supabase
      .from("club_content")
      .upsert({ key: "teams", value: { items }, updated_by: adminUserId });
    if (error) {
      setAdminNotice(
        `Mannschaften konnten nicht gespeichert werden: ${error.message}`,
      );
      return;
    }
    setLiveTeams(items);
    setAdminNotice("Mannschaftsinformationen wurden aktualisiert.");
    setAdminEditor(null);
  };

  const saveClubSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const settings: ClubSettings = {
      openingHours: String(form.get("openingHours")),
      tennisBookingUrl: String(form.get("tennisBookingUrl")),
      padelBookingUrl: String(form.get("padelBookingUrl")),
      schoolUrl: String(form.get("schoolUrl")),
    };
    const { error } = await supabase.from("club_content").upsert({
      key: "club_settings",
      value: { settings },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(
        `Einstellungen konnten nicht gespeichert werden: ${error.message}`,
      );
      return;
    }
    setLiveClub(settings);
    setAdminNotice("Öffnungszeiten und Buchungslinks wurden aktualisiert.");
    setAdminEditor(null);
  };

  const uploadNewsImageFile = async (file: File) => {
    if (!supabase) return;
    if (!file) return;
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `news/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from("club-media")
      .upload(path, file, { upsert: false });
    if (error) {
      setAdminNotice(`Upload fehlgeschlagen: ${error.message}`);
      return;
    }
    const { data } = supabase.storage.from("club-media").getPublicUrl(path);
    setUploadPath(data.publicUrl);
    void loadMedia();
    setAdminNotice(
      "Bild wurde hochgeladen und kann nun für eine News verwendet werden.",
    );
  };

  const uploadImage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem(
      "image",
    ) as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await uploadNewsImageFile(file);
  };

  const saveDownload = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("pdf");
    if (!(file instanceof File) || file.size === 0) {
      setAdminNotice("Bitte eine PDF-Datei auswählen.");
      return;
    }
    if (
      file.type !== "application/pdf" &&
      !file.name.toLowerCase().endsWith(".pdf")
    ) {
      setAdminNotice("Bitte nur PDF-Dateien hochladen.");
      return;
    }
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `downloads/${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("club-media")
      .upload(path, file, { upsert: false });
    if (uploadError) {
      setAdminNotice(`PDF-Upload fehlgeschlagen: ${uploadError.message}`);
      return;
    }
    const { data } = supabase.storage.from("club-media").getPublicUrl(path);
    const item: DownloadItem = {
      category: String(form.get("category")),
      title: String(form.get("title")),
      text: String(form.get("text")),
      file: data.publicUrl,
    };
    const items = [
      ...liveDownloads.filter((download) => download.title !== item.title),
      item,
    ];
    const { error } = await supabase
      .from("club_content")
      .upsert({ key: "downloads", value: { items }, updated_by: adminUserId });
    if (error) {
      setAdminNotice(
        `PDF wurde hochgeladen, aber nicht verknüpft: ${error.message}`,
      );
      return;
    }
    setLiveDownloads(items);
    event.currentTarget.reset();
    setAdminNotice(`${item.title} wurde auf der Website ersetzt.`);
  };

  const deleteDownload = async (item: DownloadItem) => {
    if (
      !supabase ||
      !adminUserId ||
      !window.confirm(`„${item.title}“ wirklich von der Website entfernen?`)
    )
      return;
    const items = liveDownloads.filter(
      (download) => download.file !== item.file,
    );
    const { error } = await supabase
      .from("club_content")
      .upsert({ key: "downloads", value: { items }, updated_by: adminUserId });
    if (error) {
      setAdminNotice(`PDF konnte nicht entfernt werden: ${error.message}`);
      return;
    }
    const match = item.file.match(
      /\/storage\/v1\/object\/public\/club-media\/(.+)$/,
    );
    if (match) await supabase.storage.from("club-media").remove([match[1]]);
    setLiveDownloads(items);
    setAdminNotice(`${item.title} wurde von der Website entfernt.`);
  };

  const uploadSiteImage = async (key: SiteImageKey, file: File) => {
    if (!supabase || !adminUserId) return;
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `site-images/${key}-${crypto.randomUUID()}-${safeName}`;
    const { error: uploadError } = await supabase.storage
      .from("club-media")
      .upload(path, file, { upsert: false });
    if (uploadError) {
      setAdminNotice(
        `Bild konnte nicht hochgeladen werden: ${uploadError.message}`,
      );
      return;
    }
    const { data } = supabase.storage.from("club-media").getPublicUrl(path);
    const items = { ...liveSiteImages, [key]: data.publicUrl };
    const { error } = await supabase.from("club_content").upsert({
      key: "site_images",
      value: { items },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(
        `Bild wurde hochgeladen, aber nicht gespeichert: ${error.message}`,
      );
      return;
    }
    Object.assign(officialImages, items);
    setLiveSiteImages(items);
    setAdminNotice("Website-Bild wurde ersetzt.");
  };

  const resetSiteImage = async (key: SiteImageKey) => {
    if (
      !supabase ||
      !adminUserId ||
      !window.confirm("Dieses Bild auf die lokale Originaldatei zurücksetzen?")
    )
      return;
    const previous = liveSiteImages[key];
    const items = { ...liveSiteImages, [key]: officialImages[key] };
    const { error } = await supabase.from("club_content").upsert({
      key: "site_images",
      value: { items },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(
        `Bild konnte nicht zurückgesetzt werden: ${error.message}`,
      );
      return;
    }
    const match = previous.match(
      /\/storage\/v1\/object\/public\/club-media\/(.+)$/,
    );
    if (match) await supabase.storage.from("club-media").remove([match[1]]);
    Object.assign(officialImages, items);
    setLiveSiteImages(items);
    setAdminNotice("Website-Bild wurde zurückgesetzt.");
  };

  const uploadTeamPhoto = async (
    title: string,
    event: FormEvent<HTMLInputElement>,
  ) => {
    if (!supabase || !adminUserId) return;
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
    const path = `teams/${crypto.randomUUID()}-${safeName}`;
    const { error } = await supabase.storage
      .from("club-media")
      .upload(path, file, { upsert: false });
    if (error) {
      setAdminNotice(
        `Mannschaftsfoto konnte nicht hochgeladen werden: ${error.message}`,
      );
      return;
    }
    const { data } = supabase.storage.from("club-media").getPublicUrl(path);
    const items = liveTeamGallery.map((team) =>
      team.title === title ? { ...team, image: data.publicUrl } : team,
    );
    const { error: saveError } = await supabase.from("club_content").upsert({
      key: "team_gallery",
      value: { items },
      updated_by: adminUserId,
    });
    if (saveError) {
      setAdminNotice(
        `Foto wurde hochgeladen, aber nicht gespeichert: ${saveError.message}`,
      );
      return;
    }
    setLiveTeamGallery(items);
    setAdminNotice(`${title}: neues Mannschaftsfoto gespeichert.`);
    event.currentTarget.value = "";
  };

  const deleteMedia = async (name: string) => {
    if (!supabase || !window.confirm(`Bild ${name} wirklich löschen?`)) return;
    const { error } = await supabase.storage
      .from("club-media")
      .remove([`news/${name}`]);
    if (error) {
      setAdminNotice(`Bild konnte nicht gelöscht werden: ${error.message}`);
      return;
    }
    setAdminNotice("Bild wurde gelöscht.");
    await loadMedia();
  };

  const undoChange = async (id: string) => {
    if (!supabase || (adminEmail !== OWNER_EMAIL && adminRole !== "management"))
      return;
    const { error } = await supabase.rpc("undo_audit_change", {
      change_id: id,
    });
    if (error) {
      setAdminNotice(
        `Änderung konnte nicht zurückgesetzt werden: ${error.message}`,
      );
      return;
    }
    setAdminNotice("Änderung wurde zurückgesetzt.");
    await loadAudit();
  };

  return (
    <main className={isBookingPage ? "booking-page" : ""}>
      <NewsManager
        open={adminEditor === "news"}
        close={() => setAdminEditor(null)}
        items={adminNews}
        refresh={() => void loadAdminNews()}
        editing={editingNews}
        setEditing={setEditingNews}
        uploadPath={uploadPath}
        setUploadPath={setUploadPath}
        save={(event) => void saveNews(event)}
        upload={(file) => void uploadNewsImageFile(file)}
        remove={(news) => void deleteNews(news)}
      />
      <DownloadManager
        open={adminEditor === "downloads"}
        close={() => setAdminEditor(null)}
        items={liveDownloads}
        save={(event) => void saveDownload(event)}
        remove={(item) => void deleteDownload(item)}
      />
      <SiteImageManager
        open={adminEditor === "media"}
        close={() => setAdminEditor(null)}
        images={liveSiteImages}
        upload={(key, file) => void uploadSiteImage(key, file)}
        reset={(key) => void resetSiteImage(key)}
      />
      <FocusManager
        open={adminEditor === "focus"}
        close={() => setAdminEditor(null)}
        news={adminNews}
        events={adminEvents}
        featured={featuredContent}
        choose={(item) => void saveFeaturedContent(item)}
        clear={() => void clearFeaturedContent()}
        createNews={() => {
          setEditingNews(null);
          setUploadPath("");
          setAdminEditor("news");
        }}
        createEvent={() => setAdminEditor("event")}
      />
      <ClubAssistant
        open={adminEditor === "assistant"}
        close={() => setAdminEditor(null)}
        role={adminRole}
      />
      <BookingAdmin
        open={adminEditor === "booking" && canManageBooking}
        close={() => setAdminEditor(null)}
      />
      <a className="skip-link" href="#content">
        Zum Inhalt springen
      </a>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <a
          className="brand logo-brand"
          href={isBookingPage ? "/" : "#top"}
          aria-label="TCT 1888 Startseite"
        >
          <img src={liveSiteImages.logo} alt="TCT 1888" />
        </a>
        <nav className="desktop-nav" aria-label="Hauptnavigation">
          {navLinks.map(([label, href]) => (
            <a key={href} href={isBookingPage && href.startsWith("#") ? `/${href}` : href}>
              {label}
            </a>
          ))}
        </nav>
        <div className="header-actions">
          <button
            className="icon-button search-trigger"
            onClick={() => setSearchOpen(true)}
            aria-label="Website durchsuchen"
          >
            <Search size={19} />
          </button>
          {adminUserId ? (
            <button
              className="admin-trigger"
              onClick={() =>
                editorialRoles.includes(adminRole)
                  ? setAdminPanel("dashboard")
                  : setAccountOpen(true)
              }
            >
              <LockKeyhole size={14} />
              {editorialRoles.includes(adminRole) ? "Adminbereich" : "Mein Konto"}
            </button>
          ) : (
            <>
              <button
                className="admin-trigger"
                onClick={() => {
                  setAuthMode("login");
                  setAdminNotice("");
                  setAdminPanel("login");
                }}
              >
                <LockKeyhole size={14} /> Anmelden
              </button>
              <button
                className="header-cta"
                onClick={() => {
                  setAuthMode("register");
                  setAdminNotice("");
                  setAdminPanel("login");
                }}
              >
                Registrieren <ArrowRight size={16} />
              </button>
            </>
          )}
          <button
            className="icon-button menu-trigger"
            onClick={() => setMenuOpen(true)}
            aria-label="Menü öffnen"
          >
            <Menu size={22} />
          </button>
        </div>
      </header>

      <section className="hero" id="top" aria-labelledby="hero-title">
        <img
          className="hero-image"
          src={liveSiteImages.court}
          alt="Tennisanlage des Tennisclub Trier"
        />
        <div className="hero-wash" />
        <div className="hero-grid" />
        <div className="hero-content container">
          <p className="eyebrow hero-eyebrow">
            <span /> Tennisclub Trier · seit 1888
          </p>
          <h1 id="hero-title">
            <span>Hier spielt</span>
            <em>Trier.</em>
          </h1>
          <div className="hero-bottom">
            <p>
              Leistungsorientiertes Tennis, freundliches Miteinander und eine
              besondere Anlage am Moselstadion.
            </p>
            <div className="hero-ctas">
              <a className="button button-light" href="#mitgliedschaft">
                Mitglied werden <ArrowRight size={18} />
              </a>
              <a className="button button-outline hero-discover" href="#verein">
                Entdecke den Club <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
        <a
          className="scroll-cue"
          href="#aktuell"
          aria-label="Zum nächsten Abschnitt scrollen"
        >
          <span>Scroll to play</span>
          <i>
            <ArrowRight size={16} />
          </i>
        </a>
      </section>

      <section className="ticker" aria-label="Club Angebote">
        <div className="ticker-track">
          <div className="ticker-set">
            <span>TENNIS</span>
            <i /> <span>PADEL</span>
            <i /> <span>GEMEINSCHAFT</span>
            <i /> <span>TRADITION</span>
            <i />
          </div>
          <div className="ticker-set" aria-hidden="true">
            <span>TENNIS</span>
            <i /> <span>PADEL</span>
            <i /> <span>GEMEINSCHAFT</span>
            <i /> <span>TRADITION</span>
            <i />
          </div>
          <div className="ticker-set" aria-hidden="true">
            <span>TENNIS</span>
            <i /> <span>PADEL</span>
            <i /> <span>GEMEINSCHAFT</span>
            <i /> <span>TRADITION</span>
            <i />
          </div>
          <div className="ticker-set" aria-hidden="true">
            <span>TENNIS</span>
            <i /> <span>PADEL</span>
            <i /> <span>GEMEINSCHAFT</span>
            <i /> <span>TRADITION</span>
            <i />
          </div>
        </div>
      </section>

      <div id="content">
        <section className="section current" id="aktuell">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Im Fokus
              </p>
              <a className="text-link" href="#turniere">
                Alle Termine <ArrowRight size={17} />
              </a>
            </div>
            <article className="feature-event motion">
              <div className="event-image-wrap">
                <img src={featuredContent.image} alt={featuredContent.title} />
              </div>
              <div className="event-copy">
                <p className="kicker">{featuredContent.kicker}</p>
                <h2>{featuredContent.title}</h2>
                <p className="event-description">{featuredContent.text}</p>
                <div className="event-meta">
                  <span>
                    <CalendarDays size={17} /> {featuredContent.date}
                  </span>
                  <span>
                    <MapPin size={17} /> Am Moselstadion
                  </span>
                </div>
                <a className="circle-link" href={featuredContent.href}>
                  {featuredContent.kind === "event"
                    ? "Termin erleben"
                    : "News lesen"}{" "}
                  <i>
                    <ArrowRight size={18} />
                  </i>
                </a>
              </div>
            </article>
          </div>
        </section>

        <section className="section club-intro" id="verein">
          <div className="container intro-grid motion">
            <p className="eyebrow">
              <span /> Der Club
            </p>
            <div>
              <h2>
                Mehr als ein
                <br />
                <em>Aufschlag.</em>
              </h2>
              <p className="lead">
                Ein Club für Menschen, die Tennis lieben — ganz gleich, ob sie
                einsteigen, trainieren oder sich sportlich messen möchten.
              </p>
              <div
                className="club-members"
                aria-label="Mehr als 600 Mitglieder"
              >
                <span className="club-member-orbit" aria-hidden="true"><i /></span>
                <div>
                  <b>600<sup>+</sup></b>
                  <p>Mitglieder<br />im TCT</p>
                </div>
                <small>Gemeinsam<br />auf dem Platz</small>
              </div>
              <a className="text-link" href="#geschichte">
                Unsere Geschichte <ArrowRight size={17} />
              </a>
            </div>
            <aside className="club-stamp">
              <span>TRADITION</span>
              <b>{traditionYears}</b>
              <span>JAHRE · SEIT 1888</span>
            </aside>
          </div>
        </section>

        <section className="quick-links" aria-labelledby="quick-links-title">
          <div className="container">
            <div className="quick-links-heading">
              <p className="eyebrow">
                <span /> Direkt zum Ziel
              </p>
              <h2 id="quick-links-title">Was möchtest du machen?</h2>
            </div>
            <div className="quick-links-grid">
              <a href="#mitgliedschaft">
                <span>01</span>
                <div>
                  <h3>Mitglied werden</h3>
                  <p>Beiträge ansehen und Aufnahme beantragen.</p>
                </div>
                <ArrowRight size={20} />
              </a>
              <a href="/booking">
                <span>02</span>
                <div>
                  <h3>Platz buchen</h3>
                  <p>Freie Plätze sehen und direkt reservieren.</p>
                </div>
                <ArrowRight size={20} />
              </a>
              <a href="#mannschaften">
                <span>03</span>
                <div>
                  <h3>Teams entdecken</h3>
                  <p>Alle Damen-, Herren- und Jugendteams.</p>
                </div>
                <ArrowRight size={20} />
              </a>
              <a href="#kontakt">
                <span>04</span>
                <div>
                  <h3>Kontakt aufnehmen</h3>
                  <p>Fragen stellen oder den Club kennenlernen.</p>
                </div>
                <ArrowRight size={20} />
              </a>
            </div>
          </div>
        </section>

        <section className="section facilities" id="anlage">
          <div className="container">
            <div className="section-head inverse">
              <p className="eyebrow">
                <span /> Unsere Anlage
              </p>
              <p>{liveClub.openingHours}</p>
            </div>
            <div className="facility-layout motion">
              <div className="facility-image">
                <img
                  src={liveSiteImages.player}
                  alt="Tennisspieler beim Schlag"
                />
                <span className="image-label">Am Moselstadion · Trier</span>
              </div>
              <div className="facility-list">
                {facilities.map((item, index) => (
                  <article className="facility-item" key={item.label}>
                    <span className="facility-index">0{index + 1}</span>
                    <b>{item.number}</b>
                    <div>
                      <h3>{item.label}</h3>
                      <p>{item.text}</p>
                    </div>
                    <ChevronRight size={21} />
                  </article>
                ))}
                <a
                  className="button button-outline"
                  href="/booking"
                >
                  Jetzt Platz buchen <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {isBookingPage && (
          <BookingPortal
            userId={adminUserId}
            defaultEmail={adminEmail ?? ""}
            role={adminRole}
            onRequireLogin={() => {
              setAuthMode("login");
              setAdminNotice("");
              setAdminPanel("login");
            }}
          />
        )}

        <section className="section experience-section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Vier Perspektiven
              </p>
              <p className="section-note">Dein Club, dein Spiel.</p>
            </div>
            <div className="experience-grid motion">
              {facilityExperiences.map((experience, index) => (
                <article
                  className={`experience-card experience-${index + 1}`}
                  key={experience.title}
                >
                  <img
                    src={liveSiteImages[experience.image]}
                    alt={experience.title}
                  />
                  <div className="experience-shade" />
                  <div className="experience-content">
                    <p className="kicker">{experience.eyebrow}</p>
                    <h3>{experience.title}</h3>
                    <p>{experience.text}</p>
                    <a href={experience.image === "restaurant" ? experience.href : "/booking"}>
                      {experience.image === "restaurant" ? experience.action : "Plätze buchen"} <ArrowRight size={17} />
                    </a>
                  </div>
                  <span className="experience-index">0{index + 1}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section teams-section" id="mannschaften">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Mannschaften
              </p>
              <a
                className="text-link"
                href="https://www.rlp-tennis.de/"
                target="_blank"
                rel="noreferrer"
              >
                Alle Tabellen <ExternalArrow />
              </a>
            </div>
            <div className="teams-layout motion">
              <div>
                <p className="team-count">
                  40 <span>Mannschaften</span>
                </p>
                <h2>
                  Gemeinsam
                  <br />
                  <em>antreten.</em>
                </h2>
                <p className="team-intro">
                  Die Mannschaften des TCT repräsentieren den Club auf den
                  Plätzen der Region.
                </p>
              </div>
              <div className="team-panel">
                <div className="team-tabs">
                  {liveTeams.map((team, index) => (
                    <button
                      key={team.name}
                      className={teamGroup === index ? "active" : ""}
                      onClick={() => setTeamGroup(index)}
                    >
                      <span>{team.number}</span>
                      {team.name}
                    </button>
                  ))}
                </div>
                <article>
                  <p className="kicker">TCT MANNSCHAFTEN</p>
                  <h3>{liveTeams[teamGroup].name}</h3>
                  <p>{liveTeams[teamGroup].text}</p>
                  <div className="team-note">{liveTeams[teamGroup].note}</div>
                  <a
                    href="https://www.rlp-tennis.de/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Zu den Tabellen <ArrowRight size={18} />
                  </a>
                </article>
              </div>
            </div>
            <div className="team-gallery motion">
              {liveTeamGallery
                .filter((team) => team.category === liveTeams[teamGroup].name)
                .map((team) => (
                  <button
                    key={team.title}
                    onClick={() =>
                      setSelectedTeamPhoto({
                        title: team.title,
                        image: team.image,
                      })
                    }
                    aria-label={`${team.title} groß ansehen`}
                  >
                    <img
                      loading="lazy"
                      src={team.image}
                      alt={`TCT ${team.title}`}
                    />
                    <div>
                      <p className="kicker">{team.category}</p>
                      <h3>{team.title}</h3>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </section>

        <section className="section official-teams-section">
          <div className="container official-teams-card motion">
            <div>
              <p className="eyebrow">
                <span /> Offizielle Mannschaftsdaten
              </p>
              <h2>
                Spieler, Spiele
                <br />
                und <em>Tabellen.</em>
              </h2>
              <p>
                Die vollständigen Meldelisten, Spielpläne und aktuellen
                Tabellenstände werden direkt vom Tennisverband Rheinland-Pfalz
                geführt.
              </p>
            </div>
            <a
              className="button button-light"
              href={officialLinks.teams}
              target="_blank"
              rel="noreferrer"
            >
              Zu allen Mannschaften <ExternalArrow />
            </a>
          </div>
        </section>

        <section className="section timeline" id="geschichte">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Seit Generationen
              </p>
              <p className="section-note">
                Vier Kapitel. Eine gemeinsame Geschichte.
              </p>
            </div>
            <h2>
              Eine Geschichte,
              <br />
              <em>die weiter spielt.</em>
            </h2>
            <div className="history-grid motion">
              {history.map(([year, title]) => {
                const detail = historyDetails[year];
                return (
                  <article key={year} className="history-card">
                    <img
                      loading="lazy"
                      src={detail.image}
                      alt="Historisches Motiv des Tennisclub Trier"
                    />
                    <div className="history-card-shade" />
                    <div className="history-card-content">
                      <p>{detail.label}</p>
                      <span>{year}</span>
                      <h3>{title}</h3>
                      <small>{detail.text}</small>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section school motion">
          <div className="school-image">
            <img src={liveSiteImages.school} alt="Kinder beim Tennistraining" />
          </div>
          <div className="school-copy">
            <p className="eyebrow">
              <span /> Tennisschule Point
            </p>
            <h2>
              Dein Spiel.
              <br />
              <em>Dein Tempo.</em>
            </h2>
            <p>
              Trainingsangebote für unterschiedliche Altersbereiche und
              Leistungsniveaus — vom Einstieg bis zum leistungsorientierten
              Tennis.
            </p>
            <a
              className="button button-dark"
              href={liveClub.schoolUrl}
              target="_blank"
              rel="noreferrer"
            >
              Zur Tennisschule <ExternalArrow />
            </a>
          </div>
        </section>

        <section className="section tournaments" id="turniere">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Aufschlag für 2026
              </p>
              <p className="section-note">Offizielle Turnierübersicht</p>
            </div>
            <div className="tournament-head">
              <h2>
                Der Kalender
                <br />
                <em>des Spiels.</em>
              </h2>
              <div className="filter-row">
                {(
                  [
                    "Alle",
                    "ITF",
                    "Herren",
                    "Damen",
                    "Jugend",
                    "LK",
                  ] as TournamentFilter[]
                ).map((filter) => (
                  <button
                    key={filter}
                    className={`filter ${tournamentFilter === filter ? "active" : ""}`}
                    onClick={() => setTournamentFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            <div className="tournament-list motion">
              {shownTournaments.length ? (
                shownTournaments.map((event) => (
                  <article key={event.title}>
                    <span className="date">
                      {event.date} <small>{event.month}</small>
                    </span>
                    <div>
                      <p className="kicker">{event.kicker}</p>
                      <h3>{event.title}</h3>
                    </div>
                    <ArrowRight size={22} />
                  </article>
                ))
              ) : (
                <p className="tournament-empty">
                  Für diese Kategorie sind aktuell keine bestätigten Termine
                  veröffentlicht.
                </p>
              )}
            </div>
            {liveEvents.length > 0 && (
              <div className="live-events">
                {liveEvents.map((event) => (
                  <article key={event.id}>
                    <p className="kicker">{event.category ?? "CLUB TERMIN"}</p>
                    <h3>{event.title}</h3>
                    <p>
                      {event.starts_at
                        ? new Intl.DateTimeFormat("de-DE", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(event.starts_at))
                        : "Datum folgt"}
                    </p>
                    {event.description && <span>{event.description}</span>}
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {liveNews.length > 0 && (
          <section className="section news-section">
            <div className="container">
              <div className="section-head">
                <p className="eyebrow">
                  <span /> Aktuelles
                </p>
                <button
                  className="text-link archive-trigger"
                  onClick={() => void loadNewsArchive()}
                >
                  Alle News <ArrowRight size={17} />
                </button>
              </div>
              <div className="news-grid">
                {liveNews.map((news) => (
                  <button
                    className="news-card"
                    key={news.id}
                    onClick={() => setSelectedNews(news)}
                  >
                    <div className="news-image">
                      {news.image_path ? (
                        <img src={news.image_path} alt="" />
                      ) : (
                        <span>
                          TCT
                          <br />
                          NEWS
                        </span>
                      )}
                    </div>
                    <p className="kicker">
                      {news.published_at
                        ? new Intl.DateTimeFormat("de-DE", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          }).format(new Date(news.published_at))
                        : "AKTUELL"}
                    </p>
                    <h3>{news.title}</h3>
                    {news.excerpt && <p>{news.excerpt}</p>}
                    <span className="news-read">
                      Artikel lesen <ArrowRight size={16} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section legacy-news-section" id="news-archiv">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Seit 2021
              </p>
              <button
                className="text-link archive-trigger"
                onClick={() => void loadNewsArchive()}
              >
                Alle Artikel öffnen <ArrowRight size={17} />
              </button>
            </div>
            <h2>
              Vereins-
              <br />
              <em>archiv.</em>
            </h2>
            <div className="legacy-news-grid motion">
              {legacyNews.map(([date, title]) => {
                const key = title
                  .toLocaleLowerCase("de-DE")
                  .replace(/[^a-z0-9äöüß]/gi, "")
                  .slice(0, 12);
                const article = allPublishedNews.find((news) =>
                  news.title
                    .toLocaleLowerCase("de-DE")
                    .replace(/[^a-z0-9äöüß]/gi, "")
                    .includes(key),
                );
                return (
                  <button
                    key={`${date}-${title}`}
                    className={article ? "" : "not-ready"}
                    disabled={!article}
                    onClick={() => article && setSelectedNews(article)}
                  >
                    <span>{date}</span>
                    <h3>{title}</h3>
                    <small>
                      {article ? "Artikel lesen" : "Im Admin noch übernehmen"}
                    </small>
                    <ArrowRight size={18} />
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section membership" id="mitgliedschaft">
          <div className="container membership-grid motion">
            <div className="membership-copy">
              <p className="eyebrow">
                <span /> Mitglied werden
              </p>
              <h2>
                Dein Platz
                <br />
                im <em>Club.</em>
              </h2>
              <p>
                Ob erste Schritte auf dem Platz oder sportlicher Anspruch: Im
                TCT bist du willkommen.
              </p>
              <a className="button button-light" href="#kontakt">
                Interesse anmelden <ArrowRight size={18} />
              </a>
            </div>
            <div className="prices">
              <p className="kicker">JAHRESBEITRÄGE</p>
              {liveMembership.map(({ name, price, monthly }) => (
                <div className="price-row" key={name}>
                  <div>
                    <h3>{name}</h3>
                    <p>{monthly}</p>
                  </div>
                  <b>{price}</b>
                </div>
              ))}
              <p className="price-footnote">
                * Berechnet auf sieben Sommermonate von April bis Oktober.
                Familienregelung laut aktueller Beitragsübersicht.
              </p>
            </div>
          </div>
        </section>

        <section className="section downloads-section" id="downloads">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Service
              </p>
              <p className="section-note">Offizielle Vereinsunterlagen</p>
            </div>
            <div className="downloads-layout motion">
              <div>
                <h2>
                  Alles Wichtige.
                  <br />
                  <em>Direkt da.</em>
                </h2>
                <p>
                  Formulare und Preisübersichten des TCT zum Öffnen, Speichern
                  oder Ausdrucken.
                </p>
              </div>
              <div className="downloads-list">
                {liveDownloads.map((download, index) => (
                  <a
                    key={`${download.title}-${download.file}`}
                    href={download.file}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>0{index + 1}</span>
                    <div>
                      <p className="kicker">{download.category}</p>
                      <h3>{download.title}</h3>
                      <p>{download.text}</p>
                    </div>
                    <b>PDF</b>
                    <ArrowRight size={21} />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="section board-section">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> Für den Club
              </p>
              <a className="text-link" href="#kontakt">
                Kontakt aufnehmen <ArrowRight size={17} />
              </a>
            </div>
            <h2>
              Menschen mit
              <br />
              <em>Bewegung.</em>
            </h2>
            <div className="board-grid motion">
              {board.map(([name, role], i) => (
                <article key={name}>
                  <span>0{i + 1}</span>
                  <div
                    className={`portrait-placeholder ${boardPortraits[name] ? "has-portrait" : ""}`}
                  >
                    {boardPortraits[name] ? (
                      <img
                        loading="lazy"
                        src={boardPortraits[name]}
                        alt={name}
                      />
                    ) : (
                      <b>
                        {name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")}
                      </b>
                    )}
                  </div>
                  <h3>{name}</h3>
                  <p>{role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="social-section">
          <div className="container">
            <p className="eyebrow">
              <span /> TCT Socials
            </p>
            <div>
              <h2>
                Folge dem
                <br />
                <em>Club.</em>
              </h2>
              <p>
                Aktuelle Eindrücke, Turniermomente und Clubleben direkt aus
                Trier.
              </p>
            </div>
            <nav aria-label="TCT Social Media">
              <a
                href={officialLinks.instagram}
                target="_blank"
                rel="noreferrer"
              >
                Instagram <ArrowRight size={20} />
              </a>
              <a href={officialLinks.facebook} target="_blank" rel="noreferrer">
                Facebook <ArrowRight size={20} />
              </a>
            </nav>
          </div>
        </section>

        <section className="section contact" id="kontakt">
          <div className="container contact-grid">
            <div>
              <p className="eyebrow">
                <span /> Kontakt
              </p>
              <h2>
                Lass uns
                <br />
                <em>spielen.</em>
              </h2>
              <div className="contact-details">
                <a href={`mailto:${club.email}`}>
                  <Mail size={18} />
                  {club.email}
                </a>
                <a href={`tel:${club.phone.replaceAll(" ", "")}`}>
                  <Phone size={18} />
                  {club.phone}
                </a>
                <a
                  href="https://maps.google.com/?q=Am+Stadion+1+54292+Trier"
                  target="_blank"
                  rel="noreferrer"
                >
                  <MapPin size={18} />
                  {club.address}
                </a>
              </div>
            </div>
            <form className="interest-form" onSubmit={submitInterest}>
              {formSent ? (
                <div className="success">
                  <span>✓</span>
                  <h3>Danke für dein Interesse.</h3>
                  <p>
                    {supabase
                      ? "Deine Anfrage ist beim Club eingegangen."
                      : "Dein E-Mail-Programm wurde mit deiner Anfrage geöffnet."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="kicker">INTERESSE AN EINER MITGLIEDSCHAFT</p>
                  <label>
                    Name
                    <input
                      required
                      name="name"
                      placeholder="Wie dürfen wir dich ansprechen?"
                    />
                  </label>
                  <label>
                    E-Mail
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="name@beispiel.de"
                    />
                  </label>
                  <label>
                    Nachricht
                    <textarea
                      name="message"
                      placeholder="Wobei können wir dir helfen?"
                      rows={3}
                    />
                  </label>
                  {contactError && <p className="form-error">{contactError}</p>}
                  <button className="button button-light" type="submit">
                    Anfrage senden <MoveRight size={18} />
                  </button>
                  <p className="form-note">
                    Deine Anfrage wird sicher im Club-Postfach gespeichert. Der
                    Club meldet sich per E-Mail bei dir.
                  </p>
                </>
              )}
            </form>
          </div>
        </section>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <a className="brand logo-brand footer-brand" href="#top">
              <img src={officialImages.logo} alt="TCT 1888" />
            </a>
            <p>
              Tennisclub Trier 1888 e.V.
              <br />
              Am Moselstadion.
            </p>
            <a className="footer-round" href="#top" aria-label="Nach oben">
              <ArrowRight size={22} />
            </a>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Tennisclub Trier 1888 e.V.</span>
            <div>
              <a href="#kontakt">Impressum</a>
              <a href="#datenschutz" onClick={() => setPrivacyOpen(true)}>
                Datenschutz
              </a>
              <a href="#downloads">Vereinsunterlagen</a>
            </div>
          </div>
        </div>
      </footer>

      {privacyOpen && (
        <div
          className="privacy-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Datenschutzerklärung"
        >
          <section className="privacy-card">
            <button
              className="privacy-close"
              type="button"
              onClick={() => {
                setPrivacyOpen(false);
                window.history.replaceState(null, "", "#top");
              }}
              aria-label="Datenschutzerklärung schließen"
            >
              <X size={22} /> Schließen
            </button>
            <p className="eyebrow">
              <span /> Tennisclub Trier 1888 e.V.
            </p>
            <h1>
              Datenschutz-
              <br />
              <em>erklärung.</em>
            </h1>
            <p className="privacy-intro">
              Hier erklären wir verständlich, welche Daten diese Website
              verarbeitet und wofür. Stand: August 2026.
            </p>

            <div className="privacy-live-check">
              <b>Hinweis vor dem Livegang</b>
              <p>
                Name und Anschrift des finalen Hosting-Anbieters müssen vor der
                Veröffentlichung noch ergänzt werden. Der Vorstand sollte diese
                Erklärung anschließend freigeben.
              </p>
            </div>

            <div className="privacy-content">
              <section>
                <h2>1. Verantwortlicher</h2>
                <p>
                  Verantwortlich für diese Website ist der Tennisclub Trier 1888
                  e.V., Am Stadion 1, 54292 Trier, Deutschland. Bei Fragen zum
                  Datenschutz erreichst du den Verein unter{" "}
                  <a href={`mailto:${club.email}`}>{club.email}</a>
                  oder telefonisch unter{" "}
                  <a href={`tel:${club.phone.replaceAll(" ", "")}`}>
                    {club.phone}
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2>2. Besuch der Website</h2>
                <p>
                  Beim Aufruf der Website verarbeitet der künftige
                  Hosting-Anbieter technisch erforderliche Daten, insbesondere
                  IP-Adresse, Zeitpunkt, aufgerufene Seite, Browser und
                  Betriebssystem. Das ist erforderlich, um die Website
                  auszuliefern und gegen Angriffe zu schützen (Art. 6 Abs. 1
                  lit. f DSGVO). Die konkreten Angaben zum Hoster und dessen
                  Log-Speicherdauer werden vor dem Livegang ergänzt.
                </p>
              </section>

              <section>
                <h2>3. Kontaktformular und E-Mail</h2>
                <p>
                  Wenn du das Kontaktformular nutzt, speichern wir Name,
                  E-Mail-Adresse und Nachricht im Club-Postfach, um deine
                  Anfrage zu beantworten (Art. 6 Abs. 1 lit. b DSGVO bei
                  Anfragen vor einem Vertrag, sonst Art. 6 Abs. 1 lit. f DSGVO).
                  Die Angaben sind freiwillig, ohne Kontaktmöglichkeit können
                  wir jedoch nicht per E-Mail antworten. Anfragen werden nach
                  Abschluss des Anliegens gelöscht, soweit keine gesetzlichen
                  Aufbewahrungspflichten entgegenstehen.
                </p>
              </section>

              <section>
                <h2>4. Adminbereich, Benutzerkonten und Änderungslog</h2>
                <p>
                  Der Adminbereich ist ausschließlich für vom Verein angelegte
                  Redaktionskonten bestimmt. Dabei verarbeiten wir Name,
                  Benutzername, E-Mail-Adresse, Rolle, Anmeldeinformationen
                  sowie Sicherheits- und Änderungsprotokolle. Passwörter werden
                  nicht im Klartext gespeichert. Das Änderungslog dokumentiert,
                  welches Konto wann welchen Website-Inhalt geändert hat.
                  Grundlage sind das berechtigte Interesse an einer sicheren
                  Verwaltung und die Nachvollziehbarkeit von Veröffentlichungen
                  (Art. 6 Abs. 1 lit. f DSGVO).
                </p>
              </section>

              <section>
                <h2>5. Supabase</h2>
                <p>
                  Für Anmeldung, Datenbank, Dateien und das Kontakt-Postfach
                  setzen wir Supabase als technischen Auftragsverarbeiter ein.
                  Das Projekt läuft in der EU-Region Irland (eu-west-1). Je nach
                  Funktion werden Konto- und Kontaktdaten, Inhalte, hochgeladene
                  Bilder und Dateien verarbeitet. Der Verein bleibt
                  Verantwortlicher; mit Supabase wird ein
                  Auftragsverarbeitungsvertrag abgeschlossen.
                </p>
              </section>

              <section>
                <h2>6. KI-Assistent im Adminbereich</h2>
                <p>
                  Angemeldete Redaktionsmitglieder können einen KI-Assistenten
                  nutzen, um Entwürfe für News oder Termine zu erstellen. Dafür
                  wird die eingegebene Anweisung an Groq übermittelt. Groq
                  verarbeitet Daten auch in den USA; der Verein schließt hierfür
                  vor dem Livegang den passenden Auftragsverarbeitungsvertrag
                  und stellt die erforderlichen Garantien für
                  Drittlandübermittlungen sicher. Bitte keine sensiblen Daten,
                  Mitgliederdaten, Gesundheitsdaten oder Zugangsdaten in die KI
                  eingeben. Die KI trifft keine automatisierten Entscheidungen
                  über Mitglieder; jede Veröffentlichung und Änderung wird von
                  einem berechtigten Menschen bestätigt.
                </p>
              </section>

              <section>
                <h2>7. Bilder, Social Media und Cookies</h2>
                <p>
                  Mannschafts- und Veranstaltungsbilder werden nur nach Freigabe
                  durch den Verein veröffentlicht. Bei berechtigten Anliegen zur
                  Entfernung eines Bildes wende dich bitte an uns. Diese Website
                  nutzt derzeit keine Werbe- oder Analyse-Cookies, kein Google
                  Analytics und keine eingebetteten Facebook- oder
                  Instagram-Plugins. Social-Media-Links führen erst nach deinem
                  Klick zu den jeweiligen Plattformen. Für die Anmeldung kann
                  dein Browser technisch notwendige Sitzungsdaten lokal
                  speichern.
                </p>
              </section>

              <section>
                <h2>8. Speicherdauer und Empfänger</h2>
                <p>
                  Wir speichern Daten nur so lange, wie sie für den jeweiligen
                  Zweck erforderlich sind. Administratoren löschen nicht mehr
                  benötigte Kontaktanfragen, Konten und Dateien im Rahmen der
                  laufenden Verwaltung. Empfänger sind ausschließlich
                  berechtigte Personen des Vereins sowie die in dieser Erklärung
                  genannten technischen Dienstleister, soweit dies für den
                  Betrieb erforderlich ist.
                </p>
              </section>

              <section>
                <h2>9. Deine Rechte</h2>
                <p>
                  Du hast das Recht auf Auskunft, Berichtigung, Löschung,
                  Einschränkung der Verarbeitung, Datenübertragbarkeit und
                  Widerspruch gegen Verarbeitungen auf Grundlage berechtigter
                  Interessen. Du kannst dich außerdem bei einer
                  Datenschutz-Aufsichtsbehörde beschweren, insbesondere beim{" "}
                  <a
                    href="https://www.datenschutz.rlp.de/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Landesbeauftragten für den Datenschutz und die
                    Informationsfreiheit Rheinland-Pfalz
                  </a>
                  . Wende dich für Anfragen zunächst an den Verein unter{" "}
                  {club.email}.
                </p>
              </section>
            </div>
          </section>
        </div>
      )}

      {menuOpen && (
        <div
          className="menu-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <button
            className="menu-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Menü schließen"
          >
            <X size={26} />
          </button>
          <div className="menu-content">
            <p className="eyebrow">
              <span /> Navigation
            </p>
            {navLinks.map(([label, href], i) => (
              <a href={isBookingPage && href.startsWith("#") ? `/${href}` : href} onClick={() => setMenuOpen(false)} key={href}>
                <span>0{i + 1}</span>
                {label}
                <ArrowRight size={24} />
              </a>
            ))}
            <button
              className="menu-admin"
              onClick={() => {
                setMenuOpen(false);
                if (adminUserId) {
                  if (editorialRoles.includes(adminRole)) setAdminPanel("dashboard");
                  else setAccountOpen(true);
                  return;
                }
                setAuthMode("register");
                setAdminNotice("");
                setAdminPanel("login");
                window.history.replaceState(null, "", "#registrieren");
              }}
            >
              <LockKeyhole size={17} />
              {adminUserId ? "Mein Konto" : "Registrieren"} <ArrowRight size={17} />
            </button>
            {!adminUserId && (
              <button
                className="menu-member"
                onClick={() => {
                  setMenuOpen(false);
                  setAuthMode("login");
                  setAdminNotice("");
                  setAdminPanel("login");
                }}
              >
                Anmelden <ArrowRight size={18} />
              </button>
            )}
            {adminUserId && (
              <button
                className="menu-signout"
                type="button"
                onClick={() => void signOutAccount()}
              >
                Abmelden <MoveRight size={18} />
              </button>
            )}
            <a
              className="menu-book"
              href="/booking"
              onClick={() => setMenuOpen(false)}
            >
              Platz buchen <ArrowRight size={17} />
            </a>
          </div>
        </div>
      )}
      {searchOpen && (
        <div
          className="search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Suche"
        >
          <button
            className="menu-close"
            onClick={() => setSearchOpen(false)}
            aria-label="Suche schließen"
          >
            <X size={26} />
          </button>
          <div className="search-box">
            <Search size={28} />
            <input
              autoFocus
              placeholder="Wonach suchst du?"
              aria-label="Suche"
            />
            <p>Suche nach Anlage, Mitgliedschaft, Turnieren oder Kontakt.</p>
          </div>
        </div>
      )}
      {adminPanel === "login" && (
        <div
          className="admin-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Anmelden oder registrieren"
        >
          <button
            className="admin-close"
            onClick={() => setAdminPanel(null)}
            aria-label="Admin schließen"
          >
            <X size={23} />
          </button>
          <div className="admin-login">
            <div className="admin-logo">
              <img src={officialImages.logo} alt="TCT 1888" />
            </div>
            <p className="eyebrow">
              <span /> Geschützter Bereich
            </p>
            <h2>
              {authMode === "login" ? "Willkommen" : "Neu"}
              <br />
              <em>{authMode === "login" ? "zurück." : "dabei."}</em>
            </h2>
            <p>
              {authMode === "login"
                ? "Melde dich mit deinem TCT-Mitgliederkonto an und verwalte deine persönlichen Angaben und Buchungen."
                : "Erstelle dein persönliches TCT-Mitgliederkonto. Für die spätere Platzbuchung werden nur echte Mitgliederdaten freigeschaltet."}
            </p>
            <p className="auth-migration-note">
              Du hattest bereits ein Konto auf der alten TCT-Seite? Bitte erstelle
              einmalig ein neues Konto für diese Website.
            </p>
            {authMode === "login" ? (
            <form onSubmit={loginAdmin}>
              <label>
                Benutzername oder E-Mail
                <input
                  required
                  name="email"
                  type="text"
                  autoComplete="username"
                  placeholder="max.mustermann oder admin@verein.de"
                />
              </label>
              <label>
                Passwort
                <input
                  required
                  name="password"
                  type={showAuthPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                />
                <button
                  className="auth-password-toggle"
                  type="button"
                  onClick={() => setShowAuthPassword((show) => !show)}
                  aria-label={showAuthPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                >
                  {showAuthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </label>
              <button className="button button-light" type="submit">
                Anmelden <ArrowRight size={17} />
              </button>
            </form>
            ) : (
              <form onSubmit={registerMember}>
                <label>
                  Vor- und Nachname
                  <input required name="displayName" autoComplete="name" placeholder="z. B. Max Mustermann" />
                </label>
                <label>
                  Benutzername <small>optional</small>
                  <input name="username" pattern="[A-Za-z0-9._-]{3,32}" placeholder="z. B. m.mustermann" />
                </label>
                <label>
                  E-Mail
                  <input required name="email" type="email" autoComplete="email" placeholder="name@beispiel.de" />
                </label>
                <label>
                  Passwort <small>mindestens 6 Zeichen</small>
                  <input required name="password" type={showAuthPassword ? "text" : "password"} minLength={6} autoComplete="new-password" />
                  <button
                    className="auth-password-toggle"
                    type="button"
                    onClick={() => setShowAuthPassword((show) => !show)}
                    aria-label={showAuthPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showAuthPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </label>
                <button className="button button-light" type="submit">
                  Konto erstellen <ArrowRight size={17} />
                </button>
              </form>
            )}
            <button
              className="auth-switch"
              type="button"
              onClick={() => {
                setAuthMode((mode) => (mode === "login" ? "register" : "login"));
                setAdminNotice("");
              }}
            >
              {authMode === "login"
                ? "Noch kein Konto? Jetzt registrieren"
                : "Schon registriert? Jetzt anmelden"}
            </button>
            <small>
              {supabase
                ? "Mit Supabase Auth verbunden."
                : "Demo-Ansicht: .env.local noch nicht mit Supabase verbunden."}
            </small>
            {adminNotice && <small>{adminNotice}</small>}
          </div>
        </div>
      )}
      {adminPanel === "dashboard" && (
        <div
          className="admin-overlay admin-dashboard"
          role="dialog"
          aria-modal="true"
          aria-label="Admin Dashboard"
        >
          <button
            className="admin-close"
            onClick={() => setAdminPanel(null)}
            aria-label="Admin schließen"
          >
            <X size={23} />
          </button>
          <aside>
            <div className="admin-logo">
              <img src={officialImages.logo} alt="TCT 1888" />
            </div>
            <p>TCT WEBSITE</p>
            <a className="selected">
              <LayoutDashboard size={18} /> Übersicht
            </a>
            {canManageNews && (
              <a onClick={() => setAdminEditor("news")}>
                <Newspaper size={18} /> News
              </a>
            )}
            {canManageEvents && (
              <a onClick={() => setAdminEditor("event")}>
                <CalendarDays size={18} /> Termine
              </a>
            )}
            {canManageBooking && (
              <a onClick={() => setAdminEditor("booking")}>
                <CalendarDays size={18} /> Buchungen
              </a>
            )}
            {canManageTeams && (
              <a onClick={() => setAdminEditor("teams")}>
                <UsersRound size={18} /> Mannschaften
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("media")}>
                <ImagePlus size={18} /> Medien
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("downloads")}>
                <FileText size={18} /> PDFs &amp; Downloads
              </a>
            )}
            {canManageInbox && (
              <a onClick={() => setAdminEditor("inbox")}>
                <Mail size={18} /> Postfach
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("club")}>
                <Settings2 size={18} /> Einstellungen
              </a>
            )}
            <a onClick={() => setAccountOpen(true)}>
              <LockKeyhole size={18} /> Mein Zugang
            </a>
            <button
              className="admin-signout"
              type="button"
              onClick={() => void signOutAccount()}
            >
              <MoveRight size={18} /> Abmelden
            </button>
          </aside>
          <section className="dashboard-main">
            <p className="eyebrow">
              <span /> Admin Bereich
            </p>
            <h2>{dashboardGreeting}</h2>
            <p className="dashboard-lead">
              Was möchtest du heute am Clubauftritt ändern?
            </p>
            {adminNotice && <p className="admin-notice">{adminNotice}</p>}
            <div className="admin-task-list" aria-label="Admin Aufgaben">
              <button
                className="admin-task ai-task"
                onClick={() => setAdminEditor("assistant")}
              >
                <span className="admin-task-icon">✦</span>
                <span>
                  <b>KI-Assistent</b>
                  <small>News, Termine und Inhalte per Text vorbereiten</small>
                </span>
                <ArrowRight size={18} />
              </button>
              {canManageNews && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("news")}
                >
                  <Newspaper size={19} />
                  <span>
                    <b>News verwalten</b>
                    <small>
                      Beiträge schreiben, Bilder ersetzen oder löschen
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageEvents && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("event")}
                >
                  <CalendarDays size={19} />
                  <span>
                    <b>Termine &amp; Turniere</b>
                    <small>Veranstaltungen veröffentlichen und entfernen</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageFocus && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("focus")}
                >
                  <Newspaper size={19} />
                  <span>
                    <b>Im Fokus setzen</b>
                    <small>
                      News oder Termin groß auf der Startseite zeigen
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageTeams && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("teams")}
                >
                  <UsersRound size={19} />
                  <span>
                    <b>Mannschaften</b>
                    <small>Saisonbilder und Bereichstexte pflegen</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("media")}
                >
                  <ImagePlus size={19} />
                  <span>
                    <b>Website-Bilder</b>
                    <small>Logo, Startseite und Anlagenbilder ersetzen</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("downloads")}
                >
                  <FileText size={19} />
                  <span>
                    <b>PDFs &amp; Downloads</b>
                    <small>
                      Hallenpreise, Aufnahmeantrag und weitere Dateien
                    </small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("membership")}
                >
                  <FileText size={19} />
                  <span>
                    <b>Mitgliedsbeiträge</b>
                    <small>Preise und Hinweise ändern</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("club")}
                >
                  <Settings2 size={19} />
                  <span>
                    <b>Club-Einstellungen</b>
                    <small>Öffnungszeiten und Buchungslinks</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageBooking && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("booking")}
                >
                  <CalendarDays size={19} />
                  <span>
                    <b>Platzbuchung</b>
                    <small>Sperrzeiten und Buchungsregeln verwalten</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageInbox && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("inbox")}
                >
                  <Mail size={19} />
                  <span>
                    <b>Kontakt-Postfach</b>
                    <small>Anfragen lesen und bearbeiten</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              <button
                className="admin-task"
                onClick={() => setAccountOpen(true)}
              >
                <LockKeyhole size={19} />
                <span>
                  <b>Mein Zugang</b>
                  <small>E-Mail-Adresse oder Passwort ändern</small>
                </span>
                <ArrowRight size={18} />
              </button>
              {(adminEmail === OWNER_EMAIL || adminRole === "management") && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("users")}
                >
                  <UsersRound size={19} />
                  <span>
                    <b>Benutzer verwalten</b>
                    <small>Zugänge erstellen, Rollen ändern oder löschen</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {(adminEmail === OWNER_EMAIL || adminRole === "management") && (
                <button
                  className="admin-task"
                  onClick={() => {
                    setAuditOpen(true);
                    void loadAudit();
                  }}
                >
                  <FileText size={19} />
                  <span>
                    <b>Änderungslog</b>
                    <small>Alle Änderungen ansehen und zurücksetzen</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
            </div>
          </section>
        </div>
      )}
      {adminPanel === "dashboard" &&
        adminEmail === OWNER_EMAIL &&
        auditOpen && (
          <div
            className="audit-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Änderungslog"
          >
            <button
              className="admin-close"
              onClick={() => setAuditOpen(false)}
              aria-label="Änderungslog schließen"
            >
              <X size={23} />
            </button>
            <section className="audit-card">
              <header>
                <div>
                  <p className="eyebrow">
                    <span /> Nur für dich
                  </p>
                  <h2>
                    Änderungs-
                    <br />
                    <em>log.</em>
                  </h2>
                  <p>
                    Jede redaktionelle Änderung mit Person, Uhrzeit und Bereich.
                    Das Zurücksetzen ist nur für dein Konto möglich.
                  </p>
                </div>
                <button
                  className="audit-refresh"
                  onClick={() => void loadAudit()}
                >
                  Aktualisieren
                </button>
              </header>
              <div className="audit-list">
                {auditItems.length ? (
                  auditItems.map((item) => (
                    <article key={item.id}>
                      <div className="audit-entry-main">
                        <span
                          className={`audit-action audit-${item.action.toLowerCase()}`}
                        >
                          {item.action === "INSERT"
                            ? "Erstellt"
                            : item.action === "UPDATE"
                              ? "Geändert"
                              : "Gelöscht"}
                        </span>
                        <div>
                          <h3>
                            {auditAreaLabels[item.table_name] ??
                              item.table_name}
                          </h3>
                          <p>{auditChangeSummary(item)}</p>
                        </div>
                      </div>
                      <div className="audit-entry-meta">
                        <span>
                          {item.actor_email ?? "Unbekannte Redaktion"}
                        </span>
                        <time>
                          {new Intl.DateTimeFormat("de-DE", {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          }).format(new Date(item.created_at))}
                        </time>
                        <button onClick={() => void undoChange(item.id)}>
                          Rückgängig
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="audit-empty">
                    Noch keine Änderungen protokolliert.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      {adminPanel === "dashboard" &&
        adminRole === "management" &&
        auditOpen && (
          <div
            className="audit-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Änderungslog"
          >
            <button
              className="admin-close"
              onClick={() => setAuditOpen(false)}
              aria-label="Änderungslog schließen"
            >
              <X size={23} />
            </button>
            <section className="audit-card">
              <header>
                <div>
                  <p className="eyebrow">
                    <span /> Management
                  </p>
                  <h2>
                    Änderungs-
                    <br />
                    <em>log.</em>
                  </h2>
                  <p>
                    Alle Änderungen des Redaktionsteams – mit Person, Uhrzeit
                    und Rückgängig-Funktion.
                  </p>
                </div>
                <button
                  className="audit-refresh"
                  onClick={() => void loadAudit()}
                >
                  Aktualisieren
                </button>
              </header>
              <div className="audit-list">
                {auditItems.length ? (
                  auditItems.map((item) => (
                    <article key={item.id}>
                      <div className="audit-entry-main">
                        <span
                          className={`audit-action audit-${item.action.toLowerCase()}`}
                        >
                          {item.action === "INSERT"
                            ? "Erstellt"
                            : item.action === "UPDATE"
                              ? "Geändert"
                              : "Gelöscht"}
                        </span>
                        <div>
                          <h3>
                            {auditAreaLabels[item.table_name] ??
                              item.table_name}
                          </h3>
                          <p>{auditChangeSummary(item)}</p>
                        </div>
                      </div>
                      <div className="audit-entry-meta">
                        <span>
                          {item.actor_email ?? "Unbekannte Redaktion"}
                        </span>
                        <time>
                          {new Intl.DateTimeFormat("de-DE", {
                            dateStyle: "medium",
                            timeStyle: "medium",
                          }).format(new Date(item.created_at))}
                        </time>
                        <button onClick={() => void undoChange(item.id)}>
                          Rückgängig
                        </button>
                      </div>
                    </article>
                  ))
                ) : (
                  <p className="audit-empty">
                    Noch keine Änderungen protokolliert.
                  </p>
                )}
              </div>
            </section>
          </div>
        )}
      {adminEditor && (
        <div
          className="editor-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Inhalt bearbeiten"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Editor schließen"
          >
            <X size={23} />
          </button>
          <div className="editor-card">
            {adminEditor === "news" && (
              <>
                <p className="eyebrow">
                  <span /> News
                </p>
                <h2>Neue Nachricht</h2>
                <form onSubmit={saveNews}>
                  <label>
                    Titel
                    <input required name="title" placeholder="Titel der News" />
                  </label>
                  <label>
                    Kurztext
                    <textarea
                      name="excerpt"
                      rows={2}
                      placeholder="Worum geht es?"
                    />
                  </label>
                  <label>
                    Artikeltext
                    <textarea
                      name="body"
                      rows={5}
                      placeholder="Der vollständige Inhalt"
                    />
                  </label>
                  {uploadPath && (
                    <img
                      className="upload-preview"
                      src={uploadPath}
                      alt="Ausgewähltes Newsbild"
                    />
                  )}
                  <button className="button button-light" type="submit">
                    Jetzt veröffentlichen <ArrowRight size={17} />
                  </button>
                </form>
                <button
                  className="editor-link"
                  onClick={() => setAdminEditor("media")}
                >
                  Zuerst ein Foto hochladen
                </button>
              </>
            )}
            {adminEditor === "media" && (
              <>
                <p className="eyebrow">
                  <span /> Medien
                </p>
                <h2>Foto hochladen</h2>
                <form onSubmit={uploadImage}>
                  <label>
                    Bilddatei
                    <input
                      required
                      name="image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                    />
                  </label>
                  <button className="button button-light" type="submit">
                    In Medien speichern <ImagePlus size={17} />
                  </button>
                </form>
                {uploadPath && (
                  <>
                    <img
                      className="upload-preview"
                      src={uploadPath}
                      alt="Hochgeladenes Bild"
                    />
                    <p className="editor-help">
                      Erfolgreich hochgeladen. Du kannst es jetzt beim Erstellen
                      einer News verwenden.
                    </p>
                    <button
                      className="editor-link"
                      onClick={() => setAdminEditor("news")}
                    >
                      Zur News wechseln
                    </button>
                  </>
                )}
              </>
            )}
            {adminEditor === "membership" && (
              <>
                <p className="eyebrow">
                  <span /> Mitgliedschaft
                </p>
                <h2>Beiträge ändern</h2>
                <form onSubmit={saveMembership}>
                  {liveMembership.map((item, index) => (
                    <fieldset key={index}>
                      <label>
                        Bezeichnung
                        <input
                          required
                          name={`name-${index}`}
                          defaultValue={item.name}
                        />
                      </label>
                      <label>
                        Jahrespreis
                        <input
                          required
                          name={`price-${index}`}
                          defaultValue={item.price}
                        />
                      </label>
                      <label>
                        Monatshinweis
                        <input
                          required
                          name={`monthly-${index}`}
                          defaultValue={item.monthly}
                        />
                      </label>
                    </fieldset>
                  ))}
                  <button className="button button-light" type="submit">
                    Beiträge speichern <Check size={17} />
                  </button>
                </form>
              </>
            )}
            {adminEditor === "event" && (
              <>
                <p className="eyebrow">
                  <span /> Termine
                </p>
                <h2>Terminbereich</h2>
                <p className="editor-help">
                  Die Datenbank ist vorbereitet. Als nächstes ergänze ich die
                  vollständige Terminverwaltung mit Entwurf, Veröffentlichung
                  und Bearbeitung direkt im Dashboard.
                </p>
              </>
            )}
          </div>
        </div>
      )}
      {adminEditor === "event" && (
        <div
          className="editor-overlay event-editor"
          role="dialog"
          aria-modal="true"
          aria-label="Termin anlegen"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Editor schließen"
          >
            <X size={23} />
          </button>
          <div className="editor-card">
            <p className="eyebrow">
              <span /> Veranstaltungen
            </p>
            <h2>Termin anlegen</h2>
            <form onSubmit={saveEvent}>
              <label>
                Titel
                <input
                  required
                  name="title"
                  placeholder="Name der Veranstaltung"
                />
              </label>
              <label>
                Kategorie
                <input
                  name="category"
                  placeholder="z. B. Jugend, ITF oder Club"
                />
              </label>
              <label>
                Beginn
                <input required name="starts_at" type="datetime-local" />
              </label>
              <label>
                Ende
                <input name="ends_at" type="datetime-local" />
              </label>
              <label>
                Beschreibung
                <textarea
                  name="description"
                  rows={4}
                  placeholder="Wichtige Informationen zum Termin"
                />
              </label>
              <button className="button button-light" type="submit">
                Termin veröffentlichen <CalendarDays size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
      {adminEditor === "event" && (
        <div
          className="event-manager"
          role="dialog"
          aria-modal="true"
          aria-label="Termine verwalten"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Terminverwaltung schließen"
          >
            <X size={23} />
          </button>
          <div className="event-manager-card">
            <div className="event-manager-intro">
              <p className="eyebrow">
                <span /> Veranstaltungen
              </p>
              <h2>
                Termine
                <br />
                <em>im Griff.</em>
              </h2>
              <p>
                Neue Termine anlegen, bereits veröffentlichte Termine prüfen und
                bei Bedarf direkt entfernen.
              </p>
            </div>
            <div className="event-manager-grid">
              <form onSubmit={saveEvent} className="event-create-form">
                <p className="kicker">NEU ANLEGEN</p>
                <label>
                  Titel
                  <input
                    required
                    name="title"
                    placeholder="Name der Veranstaltung"
                  />
                </label>
                <label>
                  Kategorie
                  <select name="category" defaultValue="Club">
                    <option value="Club">Club-Termin</option>
                    <option value="ITF">ITF</option>
                    <option value="Herren">Herren</option>
                    <option value="Damen">Damen</option>
                    <option value="Jugend">Jugend</option>
                    <option value="LK">LK-Turnier</option>
                  </select>
                </label>
                <div className="event-date-row">
                  <label>
                    Beginn
                    <input required name="starts_at" type="datetime-local" />
                  </label>
                  <label>
                    Ende
                    <input name="ends_at" type="datetime-local" />
                  </label>
                </div>
                <label>
                  Beschreibung
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Wichtige Informationen zum Termin"
                  />
                </label>
                <button className="button button-light" type="submit">
                  Termin veröffentlichen <CalendarDays size={17} />
                </button>
              </form>
              <section className="event-admin-list-wrap">
                <div className="event-list-head">
                  <div>
                    <p className="kicker">VERÖFFENTLICHTE TERMINE</p>
                    <h3>{adminEvents.length} Termine</h3>
                  </div>
                  <button type="button" onClick={() => void loadAdminEvents()}>
                    Aktualisieren
                  </button>
                </div>
                <div className="event-admin-list">
                  {adminEvents.length ? (
                    adminEvents.map((event) => (
                      <article key={event.id}>
                        <div>
                          <span>{event.category || "Club"}</span>
                          <h4>{event.title}</h4>
                          <p>
                            {event.starts_at
                              ? new Intl.DateTimeFormat("de-DE", {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                }).format(new Date(event.starts_at))
                              : "Datum folgt"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void deleteEvent(event.id)}
                          aria-label={`${event.title} löschen`}
                        >
                          Löschen
                        </button>
                      </article>
                    ))
                  ) : (
                    <p className="event-empty">
                      Noch keine Termine geladen. Klicke auf „Aktualisieren“.
                    </p>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      {adminEditor === "teams" && (
        <div
          className="editor-overlay team-editor"
          role="dialog"
          aria-modal="true"
          aria-label="Mannschaften bearbeiten"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Editor schließen"
          >
            <X size={23} />
          </button>
          <div className="editor-card">
            <p className="eyebrow">
              <span /> Mannschaften
            </p>
            <h2>Bereiche pflegen</h2>
            <form onSubmit={saveTeams}>
              {liveTeams.map((team, index) => (
                <fieldset key={team.name}>
                  <p className="kicker">
                    {team.number} · {team.name}
                  </p>
                  <label>
                    Kurzbeschreibung
                    <textarea
                      required
                      name={`text-${index}`}
                      rows={2}
                      defaultValue={team.text}
                    />
                  </label>
                  <label>
                    Saisonhinweis
                    <textarea
                      required
                      name={`note-${index}`}
                      rows={2}
                      defaultValue={team.note}
                    />
                  </label>
                </fieldset>
              ))}
              <button className="button button-light" type="submit">
                Mannschaften speichern <Check size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
      {selectedNews && (
        <div
          className="news-detail-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Newsartikel"
        >
          <button
            className="admin-close"
            onClick={() => setSelectedNews(null)}
            aria-label="Artikel schließen"
          >
            <X size={23} />
          </button>
          <article className="news-detail">
            {selectedNews.image_path && (
              <img src={selectedNews.image_path} alt="" />
            )}
            <p className="eyebrow">
              <span />{" "}
              {selectedNews.published_at
                ? new Intl.DateTimeFormat("de-DE", {
                    dateStyle: "long",
                  }).format(new Date(selectedNews.published_at))
                : "Aktuelles"}
            </p>
            <h2>{selectedNews.title}</h2>
            {selectedNews.excerpt && (
              <p className="news-lead">{selectedNews.excerpt}</p>
            )}
            <p className="news-body">
              {selectedNews.body ??
                "Für diesen Beitrag wurde noch kein vollständiger Artikeltext hinterlegt."}
            </p>
            {newsGalleries[selectedNews.id]?.length > 1 && (
              <div className="news-gallery">
                {newsGalleries[selectedNews.id].slice(1).map((image) => (
                  <img
                    key={image}
                    src={image}
                    alt="Weitere Eindrücke zum Beitrag"
                  />
                ))}
              </div>
            )}
          </article>
        </div>
      )}
      {adminEditor === "media" && (
        <div
          className="editor-overlay media-library"
          role="dialog"
          aria-modal="true"
          aria-label="Medienbibliothek"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Medien schließen"
          >
            <X size={23} />
          </button>
          <div className="editor-card">
            <p className="eyebrow">
              <span /> Medienbibliothek
            </p>
            <h2>Bilder verwalten</h2>
            <form onSubmit={uploadImage}>
              <label>
                Neues Bild
                <input
                  required
                  name="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                />
              </label>
              <button className="button button-light" type="submit">
                Bild hochladen <ImagePlus size={17} />
              </button>
            </form>
            <div className="media-library-head">
              <p className="kicker">HOCHGELADENE NEWS-BILDER</p>
              <button onClick={() => void loadMedia()}>Aktualisieren</button>
            </div>
            <div className="media-library-grid">
              {mediaFiles.length ? (
                mediaFiles.map((file) => {
                  const { data } = supabase!.storage
                    .from("club-media")
                    .getPublicUrl(`news/${file.name}`);
                  return (
                    <article key={file.name}>
                      <img src={data.publicUrl} alt="" />
                      <span>{file.name}</span>
                      <button onClick={() => void deleteMedia(file.name)}>
                        Löschen
                      </button>
                    </article>
                  );
                })
              ) : (
                <p>Noch keine Bilder geladen. Klicke auf „Aktualisieren“.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {selectedTeamPhoto && (
        <div
          className="team-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selectedTeamPhoto.title}
        >
          <button
            className="admin-close"
            onClick={() => setSelectedTeamPhoto(null)}
            aria-label="Bild schließen"
          >
            <X size={24} />
          </button>
          <figure>
            <img
              src={selectedTeamPhoto.image}
              alt={`TCT ${selectedTeamPhoto.title}`}
            />
            <figcaption>{selectedTeamPhoto.title}</figcaption>
          </figure>
        </div>
      )}
      {newsArchive && (
        <div
          className="news-archive-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="News Archiv"
        >
          <button
            className="admin-close"
            onClick={() => setNewsArchive(null)}
            aria-label="Archiv schließen"
          >
            <X size={23} />
          </button>
          <section>
            <p className="eyebrow">
              <span /> News Archiv
            </p>
            <h2>Alle Meldungen.</h2>
            <div className="archive-grid">
              {newsArchive.map((news) => (
                <button
                  key={news.id}
                  onClick={() => {
                    setSelectedNews(news);
                    setNewsArchive(null);
                  }}
                >
                  <p className="kicker">
                    {news.published_at
                      ? new Intl.DateTimeFormat("de-DE", {
                          dateStyle: "medium",
                        }).format(new Date(news.published_at))
                      : "AKTUELL"}
                  </p>
                  <h3>{news.title}</h3>
                  {news.excerpt && <p>{news.excerpt}</p>}
                  <ArrowRight size={17} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {searchOpen && (
        <div
          className="site-search-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Website durchsuchen"
        >
          <button
            className="admin-close"
            onClick={() => {
              setSearchOpen(false);
              setSearchQuery("");
            }}
            aria-label="Suche schließen"
          >
            <X size={25} />
          </button>
          <div className="site-search-panel">
            <Search size={27} />
            <input
              autoFocus
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Suche nach Turnier, Mannschaft, Mitgliedschaft …"
              aria-label="Website durchsuchen"
            />
            <div className="search-result-list">
              {searchQuery ? (
                searchResults.length ? (
                  searchResults.map((result) => (
                    <button
                      key={result.title}
                      onClick={() => {
                        setSearchOpen(false);
                        setSearchQuery("");
                        window.location.hash = result.href;
                      }}
                    >
                      <span>{result.title}</span>
                      <small>{result.description}</small>
                      <ArrowRight size={17} />
                    </button>
                  ))
                ) : (
                  <p>Keine passenden Inhalte gefunden.</p>
                )
              ) : (
                <p>
                  Starte mit einem Begriff wie „Padel“, „U12“, „ITF“ oder
                  „Mitgliedschaft“.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
      {adminEditor === "club" && (
        <div
          className="editor-overlay club-settings-editor"
          role="dialog"
          aria-modal="true"
          aria-label="Club-Einstellungen"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Einstellungen schließen"
          >
            <X size={23} />
          </button>
          <div className="editor-card">
            <p className="eyebrow">
              <span /> Club Einstellungen
            </p>
            <h2>
              Links &amp;
              <br />
              <em>Öffnungszeiten.</em>
            </h2>
            <p className="editor-help">
              Diese Angaben steuern die Buchungsbuttons auf der Website. Nutze
              vollständige Internetadressen mit https://.
            </p>
            <form onSubmit={saveClubSettings}>
              <label>
                Hinweis zu Öffnungszeiten
                <textarea
                  required
                  name="openingHours"
                  rows={3}
                  defaultValue={liveClub.openingHours}
                />
              </label>
              <label>
                Tennis- &amp; Hallenbuchung
                <input
                  required
                  name="tennisBookingUrl"
                  type="url"
                  defaultValue={liveClub.tennisBookingUrl}
                />
              </label>
              <label>
                Padelbuchung
                <input
                  required
                  name="padelBookingUrl"
                  type="url"
                  defaultValue={liveClub.padelBookingUrl}
                />
              </label>
              <label>
                Link Tennisschule
                <input
                  required
                  name="schoolUrl"
                  type="url"
                  defaultValue={liveClub.schoolUrl}
                />
              </label>
              <button className="button button-light" type="submit">
                Einstellungen speichern <Check size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
      {adminEditor === "inbox" && (
        <div
          className="editor-overlay inbox-editor"
          role="dialog"
          aria-modal="true"
          aria-label="Kontaktanfragen"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Postfach schließen"
          >
            <X size={23} />
          </button>
          <div className="inbox-card">
            <div className="inbox-heading">
              <div>
                <p className="eyebrow">
                  <span /> Kontakt-Postfach
                </p>
                <h2>
                  Anfragen.
                  <br />
                  <em>Direkt da.</em>
                </h2>
                <p>
                  Neue Interessenten werden hier gespeichert. Antworte per
                  E-Mail und archiviere erledigte Anfragen.
                </p>
              </div>
              <button type="button" onClick={() => void loadContactMessages()}>
                Aktualisieren
              </button>
            </div>
            <div className="inbox-list">
              {contactMessages.length ? (
                contactMessages.map((message) => (
                  <article key={message.id}>
                    <header>
                      <div>
                        <span
                          className={`inbox-status status-${message.status}`}
                        >
                          {message.status === "new"
                            ? "Neu"
                            : message.status === "read"
                              ? "Gelesen"
                              : "Archiviert"}
                        </span>
                        <h3>{message.name}</h3>
                        <a href={`mailto:${message.email}`}>{message.email}</a>
                      </div>
                      <time>
                        {new Intl.DateTimeFormat("de-DE", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(message.created_at))}
                      </time>
                    </header>
                    {message.message && <p>{message.message}</p>}
                    <footer>
                      <a
                        href={`mailto:${message.email}?subject=${encodeURIComponent("Deine Anfrage beim Tennisclub Trier")}`}
                      >
                        Antworten <ArrowRight size={16} />
                      </a>
                      {message.status === "new" && (
                        <button
                          onClick={() =>
                            void updateContactStatus(message.id, "read")
                          }
                        >
                          Als gelesen markieren
                        </button>
                      )}
                      {message.status !== "archived" && (
                        <button
                          onClick={() =>
                            void updateContactStatus(message.id, "archived")
                          }
                        >
                          Archivieren
                        </button>
                      )}
                    </footer>
                  </article>
                ))
              ) : (
                <p className="inbox-empty">Noch keine Anfragen vorhanden.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {adminEditor === "users" &&
        (adminEmail === OWNER_EMAIL || adminRole === "management") && (
          <div
            className="editor-overlay users-editor"
            role="dialog"
            aria-modal="true"
            aria-label="Benutzerverwaltung"
          >
            <button
              className="admin-close"
              onClick={() => setAdminEditor(null)}
              aria-label="Benutzerverwaltung schließen"
            >
              <X size={23} />
            </button>
            <div className="users-card">
              <div className="users-heading">
                <div>
                  <p className="eyebrow">
                    <span /> Management
                  </p>
                  <h2>
                    Dein
                    <br />
                    <em>Team.</em>
                  </h2>
                  <p>
                    Lege Zugänge an und vergib exakt die Berechtigung, die
                    jemand braucht.
                  </p>
                </div>
                <button onClick={() => void loadManagedUsers()}>
                  Aktualisieren
                </button>
              </div>
              <div className="users-grid">
                <form onSubmit={createManagedUser}>
                  <p className="kicker">NEUER BENUTZER</p>
                  <label>
                    Name
                    <input
                      required
                      name="displayName"
                      placeholder="z. B. Markus Mustermann"
                    />
                  </label>
                  <label>
                    Benutzername <small>oder automatisch aus dem Namen</small>
                    <input
                      name="username"
                      pattern="[A-Za-z0-9._-]{3,32}"
                      placeholder="z. B. m.mustermann"
                    />
                  </label>
                  <label>
                    E-Mail <small>oder nur Benutzername verwenden</small>
                    <input
                      name="email"
                      type="email"
                      placeholder="name@verein.de"
                    />
                  </label>
                  <label>
                    Startpasswort
                    <input
                      required
                      name="password"
                      type="password"
                      minLength={10}
                      placeholder="Mindestens 10 Zeichen"
                    />
                  </label>
                  <label>
                    Rolle
                    <select name="role" defaultValue="tournament_manager">
                      <option value="management">
                        Management · alles wie Eigentümer
                      </option>
                      <option value="admin">Vollzugriff</option>
                      <option value="editor">Vollzugriff Redaktion</option>
                      <option value="content_manager">
                        Redaktion &amp; Medien
                      </option>
                      <option value="tournament_manager">Nur Turniere</option>
                      <option value="team_manager">Nur Mannschaften</option>
                    </select>
                  </label>
                  <button className="button button-light" type="submit">
                    Benutzer anlegen <ArrowRight size={17} />
                  </button>
                  <p className="users-note">
                    E-Mail oder Benutzername genügt. Ohne E-Mail meldet sich die
                    Person zunächst mit ihrem Benutzernamen an und hinterlegt
                    ihre Adresse später unter „Mein Zugang“. Beim ersten Login
                    muss die Person ihr Passwort ändern.
                  </p>
                </form>
                <section className="users-list">
                  <p className="kicker">BESTEHENDE ZUGÄNGE</p>
                  {managedUsers.length ? (
                    managedUsers.map((user) => (
                      <article key={user.id}>
                        <div>
                          <h3>
                            {user.display_name || user.username || "Ohne Namen"}
                          </h3>
                          <p>
                            {user.username && `@${user.username} · `}
                            {user.login_email ??
                              "E-Mail wird über Auth verwaltet"}
                          </p>
                          <small>
                            {user.must_change_password
                              ? "Passwortwechsel beim ersten Login ausstehend"
                              : "Zugang aktiv"}
                          </small>
                        </div>
                        <label>
                          <span>Rolle</span>
                          <select
                            value={user.role}
                            onChange={(event) =>
                              void changeManagedUserRole(
                                user.id,
                                event.target.value,
                              )
                            }
                          >
                            <option value="management">
                              Management · alles wie Eigentümer
                            </option>
                            <option value="admin">Vollzugriff</option>
                            <option value="editor">
                              Vollzugriff Redaktion
                            </option>
                            <option value="content_manager">
                              Redaktion &amp; Medien
                            </option>
                            <option value="tournament_manager">
                              Nur Turniere
                            </option>
                            <option value="team_manager">
                              Nur Mannschaften
                            </option>
                          </select>
                        </label>
                        {user.id !== adminUserId &&
                          user.login_email !== OWNER_EMAIL && (
                            <button
                              className="user-delete"
                              onClick={() => void deleteManagedUser(user)}
                            >
                              Löschen
                            </button>
                          )}
                      </article>
                    ))
                  ) : (
                    <p className="users-empty">
                      Noch keine Benutzer geladen. Klicke auf Aktualisieren,
                      nachdem die Edge Function bereitgestellt wurde.
                    </p>
                  )}
                </section>
              </div>
            </div>
          </div>
        )}
      {mustChangePassword && (
        <div
          className="editor-overlay password-change-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Passwort ändern"
        >
          <div className="editor-card">
            <p className="eyebrow">
              <span /> Sicherheit
            </p>
            <h2>
              Neues
              <br />
              <em>Passwort.</em>
            </h2>
            <p className="editor-help">
              Dein Startpasswort ist nur für die erste Anmeldung gedacht. Bitte
              lege jetzt ein eigenes Passwort fest.
            </p>
            {adminNotice && <p className="password-notice">{adminNotice}</p>}
            <form onSubmit={changeInitialPassword}>
              <label>
                Neues Passwort
                <input
                  required
                  name="password"
                  type="password"
                  minLength={10}
                  autoComplete="new-password"
                />
              </label>
              <label>
                Passwort wiederholen
                <input
                  required
                  name="confirmation"
                  type="password"
                  minLength={10}
                  autoComplete="new-password"
                />
              </label>
              <button className="button button-light" type="submit">
                Passwort speichern <Check size={17} />
              </button>
            </form>
          </div>
        </div>
      )}
      {accountOpen && (
        <div
          className="editor-overlay account-editor"
          role="dialog"
          aria-modal="true"
          aria-label="Eigene Zugangsdaten"
        >
          <button
            className="admin-close"
            onClick={() => setAccountOpen(false)}
            aria-label="Zugang schließen"
          >
            <X size={23} />
          </button>
          <div className="editor-card">
            <p className="eyebrow">
              <span /> Mein Zugang
            </p>
            <h2>
              Deine
              <br />
              <em>Daten.</em>
            </h2>
            <p className="editor-help">
              Du kannst deine Anmelde-E-Mail und dein Passwort jederzeit selbst
              ändern. Nach einer E-Mail-Änderung bitte erneut anmelden.
            </p>
            <form onSubmit={changeOwnCredentials}>
              <label>
                E-Mail
                <input
                  required
                  name="email"
                  type="email"
                  defaultValue={adminEmail ?? ""}
                />
              </label>
              <label>
                Neues Passwort{" "}
                <small>leer lassen, wenn es unverändert bleibt</small>
                <input
                  name="password"
                  type="password"
                  minLength={10}
                  autoComplete="new-password"
                />
              </label>
              <button className="button button-light" type="submit">
                Zugang aktualisieren <Check size={17} />
              </button>
              <button
                className="auth-switch"
                type="button"
                onClick={() => void signOutAccount()}
              >
                Abmelden
              </button>
            </form>
          </div>
        </div>
      )}
      {adminEditor === "teams" && (
        <div
          className="team-photo-manager"
          role="dialog"
          aria-modal="true"
          aria-label="Mannschaftsfotos verwalten"
        >
          <button
            className="admin-close"
            onClick={() => setAdminEditor(null)}
            aria-label="Mannschaftsfotos schließen"
          >
            <X size={23} />
          </button>
          <section>
            <div className="team-photo-heading">
              <div>
                <p className="eyebrow">
                  <span /> Mannschaften
                </p>
                <h2>
                  Neue Saison.
                  <br />
                  <em>Neue Bilder.</em>
                </h2>
                <p>
                  Ein Bild pro Mannschaft auswählen. Es wird sofort gespeichert
                  und auf der Website ersetzt.
                </p>
              </div>
              <span>JPG · PNG · WEBP</span>
            </div>
            <div className="team-photo-grid">
              {liveTeamGallery.map((team) => (
                <article key={team.title}>
                  <img src={team.image} alt={`Aktuelles Foto ${team.title}`} />
                  <div>
                    <p className="kicker">{team.category}</p>
                    <h3>{team.title}</h3>
                    <label>
                      Foto ersetzen
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(event) =>
                          void uploadTeamPhoto(team.title, event)
                        }
                      />
                    </label>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      )}
      {adminEditor === "event" && (
        <button className="event-back" onClick={() => setAdminEditor(null)}>
          ← Zur Übersicht
        </button>
      )}
      {adminEditor === "event" && adminNotice && (
        <p className="event-save-notice">{adminNotice}</p>
      )}
      {tutorialOpen && !mustChangePassword && (
        <div
          className="tutorial-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Plattform-Tutorial"
        >
          <section>
            <p className="eyebrow">
              <span /> Dein Start im TCT Portal
            </p>
            <div className="tutorial-progress">
              {tutorialSteps.map((_, index) => (
                <i
                  key={index}
                  className={index <= tutorialStep ? "active" : ""}
                />
              ))}
            </div>
            <p className="kicker">
              SCHRITT {tutorialStep + 1} VON {tutorialSteps.length}
            </p>
            <h2>{tutorialSteps[tutorialStep][0]}</h2>
            <p>{tutorialSteps[tutorialStep][1]}</p>
            <div>
              <button
                className="tutorial-skip"
                onClick={() => void completeTutorial()}
              >
                Später ansehen
              </button>
              <button
                className="button button-light"
                onClick={() =>
                  tutorialStep < tutorialSteps.length - 1
                    ? setTutorialStep((step) => step + 1)
                    : void completeTutorial()
                }
              >
                {tutorialStep < tutorialSteps.length - 1
                  ? "Weiter"
                  : "Loslegen"}{" "}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>
        </div>
      )}
      {adminEditor === "users" && adminNotice && (
        <p className="users-notice">{adminNotice}</p>
      )}
    </main>
  );
}

export default App;
