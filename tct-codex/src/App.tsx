import { createContext, lazy, Suspense, useContext, useEffect, useState, type CSSProperties, type FormEvent } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownRight,
  ArrowRight,
  CalendarDays,
  ChevronRight,
  Check,
  Eye,
  EyeOff,
  Euro,
  FileText,
  ImagePlus,
  LayoutDashboard,
  LockKeyhole,
  Mail,
  MapPin,
  Menu,
  MoveRight,
  Newspaper,
  Pencil,
  Phone,
  Search,
  Settings2,
  Trophy,
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

// Code-Splitting: Buchung, Buchungs-Admin und die Spielpartner-Börse werden
// nur geladen, wenn sie tatsächlich gebraucht werden, statt bei jedem
// Seitenaufruf im Hauptbundle mitzuladen.
const BookingPortal = lazy(() =>
  import("./BookingPortal").then((m) => ({ default: m.BookingPortal })),
);
const BookingAdmin = lazy(() =>
  import("./BookingAdmin").then((m) => ({ default: m.BookingAdmin })),
);
const PartnerBoard = lazy(() =>
  import("./PartnerBoard").then((m) => ({ default: m.PartnerBoard })),
);

type NavItem = { id: string; label: string; href: string; visible: boolean; primary: boolean };
const defaultNavItems: NavItem[] = [
  { id: "club", label: "Club", href: "/club", visible: true, primary: true },
  { id: "anlage", label: "Anlage", href: "/anlage", visible: true, primary: true },
  { id: "booking", label: "Buchen", href: "/booking", visible: true, primary: true },
  { id: "spielpartner", label: "Spielpartner", href: "/spielpartner", visible: true, primary: true },
  { id: "teams", label: "Teams", href: "/teams", visible: true, primary: true },
  { id: "turniere", label: "Turniere", href: "/turniere", visible: true, primary: true },
  { id: "news", label: "News", href: "/news", visible: true, primary: false },
  { id: "mitglied-werden", label: "Mitglied werden", href: "/mitglied-werden", visible: true, primary: false },
  { id: "service", label: "Downloads", href: "/service", visible: true, primary: false },
  { id: "galerie", label: "Galerie", href: "/galerie", visible: true, primary: false },
  { id: "partner", label: "Partner", href: "/partner", visible: true, primary: false },
  { id: "kontakt", label: "Kontakt", href: "/kontakt", visible: true, primary: false },
];

type PriceItem = { name: string; price: string; monthly: string };
type DownloadItem = {
  category: string;
  title: string;
  text: string;
  file: string;
};
type PartnerItem = { id: string; name: string; website: string; logo: string; note: string };
type BoardMember = { id: string; name: string; role: string; photo: string };
type HistoryEvent = { id: string; year: string; title: string; label: string; text: string; image: string };
type FacilityItem = { id: string; number: string; title: string; eyebrow: string; text: string; action: string; href: string; image: string };
type CustomBlock = { id: string; title: string; text: string; image: string };
type CustomPage = { id: string; slug: string; title: string; eyebrow: string; text: string; body: string; image: string; published: boolean };
const reservedSlugs = new Set(["club", "anlage", "teams", "turniere", "news", "mitglied-werden", "service", "kontakt", "galerie", "partner", "spielpartner", "impressum", "booking", "turnier-anmeldung", "datenschutz", ""]);
type FormSettings = { contactFormEnabled: boolean; partnerFormEnabled: boolean; pausedMessage: string };
type ClubSettings = {
  openingHours: string;
  tennisBookingUrl: string;
  padelBookingUrl: string;
  schoolUrl: string;
  instagramUrl: string;
  facebookUrl: string;
  siteTitle: string;
  siteDescription: string;
  faviconUrl: string;
};
type SiteTheme = {
  headingFont: "dm-serif" | "playfair" | "cormorant" | "libre-baskerville";
  bodyFont: "manrope" | "inter" | "montserrat" | "source-sans";
  darkColor: string;
  deepDarkColor: string;
  accentColor: string;
  backgroundColor: string;
};
const defaultSiteTheme: SiteTheme = {
  headingFont: "dm-serif",
  bodyFont: "manrope",
  darkColor: "#112e25",
  deepDarkColor: "#0b211a",
  accentColor: "#cef166",
  backgroundColor: "#f5f3ee",
};
const courtAccentPresets: { key: string; label: string; color: string }[] = [
  { key: "standard", label: "Standard", color: defaultSiteTheme.accentColor },
  { key: "sandplatz", label: "Sandplatz", color: "#e2794f" },
  { key: "hartplatz", label: "Hartplatz", color: "#6fb3d9" },
  { key: "wimbledon", label: "Wimbledon", color: "#5c9a4a" },
];
const headingFontFamilies: Record<SiteTheme["headingFont"], string> = {
  "dm-serif": "'DM Serif Display', Georgia, serif",
  playfair: "'Playfair Display', Georgia, serif",
  cormorant: "'Cormorant Garamond', Georgia, serif",
  "libre-baskerville": "'Libre Baskerville', Georgia, serif",
};
const bodyFontFamilies: Record<SiteTheme["bodyFont"], string> = {
  manrope: "Manrope, Arial, sans-serif",
  inter: "Inter, Arial, sans-serif",
  montserrat: "Montserrat, Arial, sans-serif",
  "source-sans": "'Source Sans 3', Arial, sans-serif",
};
const normalizeSiteTheme = (value: unknown): SiteTheme => {
  const source = value && typeof value === "object"
    ? (value as Partial<Record<keyof SiteTheme, unknown>>)
    : {};
  const headingFont = typeof source.headingFont === "string" && source.headingFont in headingFontFamilies
    ? (source.headingFont as SiteTheme["headingFont"])
    : defaultSiteTheme.headingFont;
  const bodyFont = typeof source.bodyFont === "string" && source.bodyFont in bodyFontFamilies
    ? (source.bodyFont as SiteTheme["bodyFont"])
    : defaultSiteTheme.bodyFont;
  const safeColor = (candidate: unknown, fallback: string) =>
    typeof candidate === "string" && /^#[0-9a-f]{6}$/i.test(candidate)
      ? candidate.toLowerCase()
      : fallback;
  return {
    headingFont,
    bodyFont,
    darkColor: safeColor(source.darkColor, defaultSiteTheme.darkColor),
    deepDarkColor: safeColor(source.deepDarkColor, defaultSiteTheme.deepDarkColor),
    accentColor: safeColor(source.accentColor, defaultSiteTheme.accentColor),
    backgroundColor: safeColor(source.backgroundColor, defaultSiteTheme.backgroundColor),
  };
};
type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string | null;
  status: "new" | "read" | "archived";
  created_at: string;
};
type TournamentInquiry = {
  id: string;
  name: string;
  email: string;
  tournament_title: string;
  inquiry_type: "question" | "registration";
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
  email_verified: boolean;
  profile_complete: boolean;
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
  registration_enabled: boolean;
  spectators_allowed: boolean;
  admission_price_cents: number | null;
  venue_name: string | null;
  venue_address: string | null;
};
type MediaFile = { name: string; created_at: string | null };
type MediaEntry = { folder: string; name: string; path: string; url: string; inUse: boolean };
type AdminEditor =
  | "news"
  | "event"
  | "media"
  | "membership"
  | "teams"
  | "club"
  | "downloads"
  | "partners"
  | "board"
  | "history"
  | "facilities"
  | "blocks"
  | "navigation"
  | "mediaLibrary"
  | "pages"
  | "forms"
  | "tournaments"
  | "focus"
  | "assistant"
  | "booking"
  | "inbox"
  | "tournamentInbox"
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
  spectatorsAllowed?: boolean;
  admissionPriceCents?: number | null;
  admissionLabel?: string;
  venueName?: string;
  venueAddress?: string;
};
type AiProposal = {
  action:
    | "create_news"
    | "update_news"
    | "create_event"
    | "update_team"
    | "create_user"
    | "update_theme"
    | "update_facility"
    | "update_history"
    | "update_partner_note"
    | "update_club_settings"
    | "update_navigation";
  title: string;
  details: string;
  warning?: string | null;
  payload: Record<string, unknown>;
};
const OWNER_EMAIL = "elfinko008@icloud.com";
type TournamentFilter = "Alle" | "ITF" | "Jugend" | "LK" | "Herren" | "Damen";
type TournamentCategory = Exclude<TournamentFilter, "Alle">;
type Tournament = {
  id: string;
  date: string;
  month: string;
  kicker: string;
  title: string;
  categories: TournamentCategory[];
  endsAt: string;
  registrationEnabled: boolean;
  admission: string;
  prizeMoney: string;
  venue: string;
  mapsUrl: string;
};
const allTournamentCategories: TournamentCategory[] = ["ITF", "Herren", "Damen", "Jugend", "LK"];
const tournamentEntries: Array<{
  date: string;
  month: string;
  kicker: string;
  title: string;
  categories: TournamentCategory[];
  endsAt: string;
  registrationEnabled: boolean;
  admission?: string;
  prizeMoney?: string;
  venue?: string;
  mapsUrl?: string;
}> = [
  {
    date: "27 — 28",
    month: "JUN",
    kicker: "JUGEND · LK TURNIER",
    title: "Jugend LK Turnier U9 — U18",
    categories: ["Jugend", "LK"],
    endsAt: "2026-06-28T23:59:59+02:00",
    registrationEnabled: true,
  },
  {
    date: "04",
    month: "JUL",
    kicker: "CLUB EVENT",
    title: "2. Schorle Cup",
    categories: [],
    endsAt: "2026-07-04T23:59:59+02:00",
    registrationEnabled: false,
  },
  {
    date: "16 — 19",
    month: "JUL",
    kicker: "DTB HERREN A7",
    title: "1. Trier Wildcard Turnier",
    categories: ["Herren"],
    endsAt: "2026-07-19T23:59:59+02:00",
    registrationEnabled: false,
  },
  {
    date: "10 — 16",
    month: "AUG",
    kicker: "ITF WORLD TENNIS TOUR · HERREN",
    title: "Etges & Dächert Open Trier",
    categories: ["ITF", "Herren"],
    endsAt: "2026-08-16T23:59:59+02:00",
    registrationEnabled: false,
    admission: "Montag bis Freitag Eintritt frei · Halbfinale und Finale am Samstag und Sonntag kostenpflichtig (Preis noch nicht veröffentlicht)",
    prizeMoney: "15.000 US-Dollar",
    venue: "Am Stadion 1, 54292 Trier",
    mapsUrl: "https://www.google.com/maps/search/?api=1&query=Am+Stadion+1%2C+54292+Trier",
  },
  {
    date: "11 — 13",
    month: "SEP",
    kicker: "JUGEND · LK TURNIER",
    title: "TCT Jugend Tennis Turnier",
    categories: ["Jugend", "LK"],
    endsAt: "2026-09-13T23:59:59+02:00",
    registrationEnabled: true,
  },
  {
    date: "18 — 22",
    month: "SEP",
    kicker: "DAMEN & HERREN · LK TURNIER",
    title: "Damen & Herren LK-Turnier",
    categories: ["Damen", "Herren", "LK"],
    endsAt: "2026-09-22T23:59:59+02:00",
    registrationEnabled: true,
  },
];
const defaultFeaturedContent: FeaturedContent = {
  kind: "event",
  title: "Etges & Dächert Open.",
  kicker: "ITF WORLD TENNIS TOUR · HERREN",
  text: "Das internationale Weltranglistenturnier kehrt zum 40. Mal an das Moselstadion zurück. Eine Woche Tennis auf hohem Niveau, direkt in Trier.",
  image: "/assets/tct/images/turnier-itf-2026.png",
  date: "10. – 16. August 2026",
  href: "/turniere",
  spectatorsAllowed: true,
  admissionPriceCents: null,
  admissionLabel: "Mo–Fr frei · Wochenende Preis folgt",
  venueName: "TC Trier 1888 e.V.",
  venueAddress: "Am Stadion 1, 54292 Trier",
};
const siteSearchIndex = [
  {
    title: "Der Verein",
    description: "Vorstand, Geschichte und Clubleben",
    href: "/club",
  },
  {
    title: "Anlage",
    description: "Außenplätze, Halle, Padel und La Palma",
    href: "/anlage",
  },
  {
    title: "Mannschaften",
    description: "Herren, Damen und Jugend",
    href: "/teams",
  },
  {
    title: "Turniere",
    description: "ITF, Herren, Damen, Jugend und LK",
    href: "/turniere",
  },
  {
    title: "Mitgliedschaft",
    description: "Beiträge und Mitglied werden",
    href: "/mitglied-werden",
  },
  {
    title: "Downloads",
    description: "Aufnahmeantrag und Hallenpreise",
    href: "/service",
  },
  {
    title: "Kontakt",
    description: "Adresse, E-Mail und Telefon",
    href: "/kontakt",
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
  programmer: "Programmer",
  admin: "Vollzugriff",
  editor: "Vollzugriff Redaktion",
  content_manager: "Redaktion & Medien",
  tournament_manager: "Turnierleitung",
  team_manager: "Mannschaftsführung",
};

const editorialRoles = [
  "management",
  "programmer",
  "admin",
  "editor",
  "content_manager",
  "tournament_manager",
  "team_manager",
];

// Supabase's FunctionsHttpError only carries a generic message; the actual
// { error: "…" } body from our Edge Functions lives in error.context (a
// Response) and has to be read out separately.
async function edgeFunctionErrorMessage(
  error: unknown,
  fallback: string,
): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: unknown }).context;
    if (context instanceof Response) {
      try {
        const body = await context.clone().json();
        if (typeof body?.error === "string") return body.error;
      } catch {
        // response wasn't JSON — fall through to the generic message
      }
    }
  }
  return error instanceof Error ? error.message : fallback;
}

// Postgres/PostgREST errors leak technical strings ("duplicate key value
// violates unique constraint …") straight into the admin UI. Translate the
// common cases so non-technical Vorstand-Admins get something they can act on.
function friendlyDbError(error: { code?: string; message?: string } | null | undefined): string {
  const code = error?.code;
  if (code === "23505") return "Dieser Eintrag existiert bereits.";
  if (code === "23503") return "Der Eintrag wird an anderer Stelle noch verwendet und kann so nicht geändert werden.";
  if (code === "23502") return "Bitte fülle alle Pflichtfelder aus.";
  if (code === "23514") return "Die Eingabe erfüllt nicht die Anforderungen (z. B. Textlänge).";
  if (code === "42501" || code === "PGRST301") return "Keine Berechtigung oder Sitzung abgelaufen. Bitte neu anmelden.";
  if (error?.message === "Failed to fetch") return "Keine Verbindung zum Server. Bitte Internetverbindung prüfen.";
  return error?.message ?? "Unbekannter Fehler.";
}

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

const eventMapsUrl = (address?: string | null) =>
  address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    : "";

const eventAdmissionLabel = (price?: number | null) => {
  if (price === 0) return "Eintritt frei";
  if (typeof price !== "number") return "Preis folgt";
  return `${new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(price / 100)} € Eintritt`;
};

const eventDateTimeInput = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

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
  reorder,
}: {
  open: boolean;
  close: () => void;
  items: DownloadItem[];
  save: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: DownloadItem) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
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
              hier hochgeladen, ersetzt oder entfernt. Ziehe eine Karte per Drag
              &amp; Drop, um die Reihenfolge zu ändern.
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
              items.map((download, index) => (
                <article
                  key={download.file}
                  className={`draggable-row${dragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className="content-manager-drag-handle" aria-hidden="true">⠿</span>
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

function PartnerManager({ open, close, items, save, remove, reorder }: { open: boolean; close: () => void; items: PartnerItem[]; save: (event: FormEvent<HTMLFormElement>) => void; remove: (item: PartnerItem) => void; reorder: (fromIndex: number, toIndex: number) => void }) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Partner verwalten">
    <button className="admin-close" onClick={close} aria-label="Partnerverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Partner & Sponsoren</p><h2>Partner.<br /><em>Sichtbar machen.</em></h2><p>Logo hochladen, Website verlinken und Partner jederzeit wieder entfernen. Ziehe eine Karte per Drag &amp; Drop, um die Reihenfolge zu ändern.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={save}>
          <p className="kicker">NEUEN PARTNER ANLEGEN</p>
          <label>Name<input required name="name" placeholder="Name des Partners" /></label>
          <label>Website<input required type="url" name="website" placeholder="https://www.beispiel.de" /></label>
          <label>Logo<input required type="file" name="logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" /></label>
          <label>Hinweis <small>optional</small><textarea name="note" rows={3} placeholder="z. B. Unterstützt die TCT-Jugend" /></label>
          <button className="button button-light" type="submit">Partner veröffentlichen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list"><div><p className="kicker">SICHTBARE PARTNER</p></div>{items.length ? items.map((item, index) => <article
          key={item.id}
          className={`draggable-row${dragIndex === index ? " dragging" : ""}`}
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
          onDragEnd={() => setDragIndex(null)}
        ><span className="content-manager-drag-handle" aria-hidden="true">⠿</span><img className="partner-admin-logo" src={item.logo} alt="" /><div><h3>{item.name}</h3><p>{item.website}</p>{item.note && <p>{item.note}</p>}<footer><a href={item.website} target="_blank" rel="noreferrer">Website öffnen</a><button className="danger" type="button" onClick={() => remove(item)}>Löschen</button></footer></div></article>) : <p className="content-manager-empty">Noch keine Partner angelegt.</p>}</section>
      </div>
    </div>
  </div>;
}

function BoardManager({
  open, close, items, saveAll, addOne, remove, uploadPhoto, reorder,
}: {
  open: boolean; close: () => void; items: BoardMember[];
  saveAll: (event: FormEvent<HTMLFormElement>) => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: BoardMember) => void;
  uploadPhoto: (id: string, file: File) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Vorstand verwalten">
    <button className="admin-close" onClick={close} aria-label="Vorstandsverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Vorstand</p><h2>Vorstand.<br /><em>Pflegen.</em></h2><p>Namen und Rollen ändern, neue Mitglieder aufnehmen oder Fotos hinterlegen. Ziehe eine Karte per Drag &amp; Drop, um die Reihenfolge zu ändern.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUES VORSTANDSMITGLIED</p>
          <label>Name<input required name="newName" placeholder="Vor- und Nachname" /></label>
          <label>Funktion<input required name="newRole" placeholder="z. B. Schatzmeisterin" /></label>
          <button className="button button-light" type="submit">Mitglied aufnehmen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">AKTUELLER VORSTAND</p></div>
          {items.length ? (
            <form onSubmit={saveAll}>
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className={`content-manager-row draggable-row${dragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className="content-manager-drag-handle" aria-hidden="true">⠿</span>
                  {item.photo ? <img className="partner-admin-logo" src={item.photo} alt="" /> : <span className="content-manager-noimage">Kein Foto</span>}
                  <div>
                    <label>Name<input required name={`name-${index}`} defaultValue={item.name} /></label>
                    <label>Funktion<input required name={`role-${index}`} defaultValue={item.role} /></label>
                    <label>Foto<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadPhoto(item.id, file); }} /></label>
                    <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
                  </div>
                </article>
              ))}
              <button className="button button-light" type="submit">Änderungen speichern <Check size={17} /></button>
            </form>
          ) : <p className="content-manager-empty">Noch kein Vorstand angelegt.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function TournamentManager({
  open, close, items, saveAll, addOne, remove, reorder,
}: {
  open: boolean; close: () => void; items: Tournament[];
  saveAll: (event: FormEvent<HTMLFormElement>) => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: Tournament) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Turniere verwalten">
    <button className="admin-close" onClick={close} aria-label="Turnierverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Turniere</p><h2>Kalender.<br /><em>Pflegen.</em></h2><p>Turniere anlegen, Termine anpassen oder abgeschlossene Turniere entfernen. Ziehe eine Karte per Drag &amp; Drop, um die Reihenfolge zu ändern.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUES TURNIER</p>
          <label>Titel<input required name="newTitle" placeholder="z. B. Herbstpokal 2026" /></label>
          <label>Kicker <small>optional</small><input name="newKicker" placeholder="z. B. DAMEN & HERREN · LK TURNIER" /></label>
          <label>Ende (Datum &amp; Uhrzeit)<input required name="newEndsAt" type="datetime-local" /></label>
          <label>Anzeige-Datum <small>optional, sonst automatisch</small><input name="newDate" placeholder="z. B. 18 — 22" /></label>
          <label>Anzeige-Monat <small>optional, sonst automatisch</small><input name="newMonth" placeholder="z. B. SEP" /></label>
          <div className="category-toggle-row">
            <p className="kicker">KATEGORIEN</p>
            {allTournamentCategories.map((category) => (
              <label key={category} className="nav-toggle"><input type="checkbox" name={`newCategory-${category}`} /> {category}</label>
            ))}
          </div>
          <label className="nav-toggle"><input type="checkbox" name="newRegistration" /> Anmeldung über die Website erlauben</label>
          <button className="button button-light" type="submit">Turnier anlegen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">ALLE TURNIERE</p></div>
          {items.length ? (
            <form onSubmit={saveAll}>
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className={`content-manager-row draggable-row${dragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className="content-manager-drag-handle" aria-hidden="true">⠿</span>
                  <div>
                    <label>Titel<input required name={`title-${index}`} defaultValue={item.title} /></label>
                    <label>Kicker<input name={`kicker-${index}`} defaultValue={item.kicker} /></label>
                    <div className="event-date-row">
                      <label>Anzeige-Datum<input required name={`date-${index}`} defaultValue={item.date} /></label>
                      <label>Anzeige-Monat<input required name={`month-${index}`} defaultValue={item.month} /></label>
                    </div>
                    <label>Ende (Datum &amp; Uhrzeit) <small>entscheidet, ob „Abgeschlossen“ angezeigt wird</small><input required name={`endsAt-${index}`} type="datetime-local" defaultValue={item.endsAt.slice(0, 16)} /></label>
                    <div className="category-toggle-row">
                      <p className="kicker">KATEGORIEN</p>
                      {allTournamentCategories.map((category) => (
                        <label key={category} className="nav-toggle"><input type="checkbox" name={`category-${index}-${category}`} defaultChecked={item.categories.includes(category)} /> {category}</label>
                      ))}
                    </div>
                    <label className="nav-toggle"><input type="checkbox" name={`registration-${index}`} defaultChecked={item.registrationEnabled} /> Anmeldung über die Website erlauben</label>
                    <label>Eintritt <small>optional</small><input name={`admission-${index}`} defaultValue={item.admission} placeholder="z. B. Mo–Fr frei · Wochenende kostenpflichtig" /></label>
                    <label>Preisgeld <small>optional</small><input name={`prizeMoney-${index}`} defaultValue={item.prizeMoney} placeholder="z. B. 15.000 US-Dollar" /></label>
                    <label>Austragungsort <small>optional</small><input name={`venue-${index}`} defaultValue={item.venue} placeholder="z. B. Am Stadion 1, 54292 Trier" /></label>
                    <label>Google-Maps-Link <small>optional</small><input name={`mapsUrl-${index}`} defaultValue={item.mapsUrl} placeholder="https://www.google.com/maps/..." /></label>
                    <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
                  </div>
                </article>
              ))}
              <button className="button button-light" type="submit">Änderungen speichern <Check size={17} /></button>
            </form>
          ) : <p className="content-manager-empty">Noch keine Turniere angelegt.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function HistoryManager({
  open, close, items, saveAll, addOne, remove, uploadImage, reorder,
}: {
  open: boolean; close: () => void; items: HistoryEvent[];
  saveAll: (event: FormEvent<HTMLFormElement>) => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: HistoryEvent) => void;
  uploadImage: (id: string, file: File) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Vereinschronik verwalten">
    <button className="admin-close" onClick={close} aria-label="Chronikverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Vereinschronik</p><h2>Chronik.<br /><em>Fortschreiben.</em></h2><p>Meilensteine bearbeiten, neue Jahre ergänzen oder Einträge entfernen. Ziehe eine Karte per Drag &amp; Drop, um die Reihenfolge zu ändern.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUER CHRONIK-EINTRAG</p>
          <label>Jahr<input required name="newYear" placeholder="z. B. 2026" /></label>
          <label>Titel<input required name="newTitle" placeholder="Was ist passiert?" /></label>
          <button className="button button-light" type="submit">Eintrag anlegen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">CHRONIK</p></div>
          {items.length ? (
            <form onSubmit={saveAll}>
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className={`content-manager-row draggable-row${dragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className="content-manager-drag-handle" aria-hidden="true">⠿</span>
                  {item.image ? <img className="partner-admin-logo" src={item.image} alt="" /> : <span className="content-manager-noimage">Kein Bild</span>}
                  <div>
                    <label>Jahr<input required name={`year-${index}`} defaultValue={item.year} /></label>
                    <label>Titel<input required name={`title-${index}`} defaultValue={item.title} /></label>
                    <label>Kurzlabel <small>optional</small><input name={`label-${index}`} defaultValue={item.label} /></label>
                    <label>Text <small>optional</small><textarea name={`text-${index}`} rows={2} defaultValue={item.text} /></label>
                    <label>Bild<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(item.id, file); }} /></label>
                    <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
                  </div>
                </article>
              ))}
              <button className="button button-light" type="submit">Änderungen speichern <Check size={17} /></button>
            </form>
          ) : <p className="content-manager-empty">Noch keine Chronik-Einträge angelegt.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function FacilityManager({
  open, close, items, saveAll, addOne, remove, uploadImage, reorder,
}: {
  open: boolean; close: () => void; items: FacilityItem[];
  saveAll: (event: FormEvent<HTMLFormElement>) => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: FacilityItem) => void;
  uploadImage: (id: string, file: File) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Anlage-Bereiche verwalten">
    <button className="admin-close" onClick={close} aria-label="Anlagenverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Anlage</p><h2>Bereiche.<br /><em>Pflegen.</em></h2><p>Texte, Zahlen, Bilder und Buchungslinks für Außenplätze, Halle, Padel & Co. Ziehe eine Karte per Drag &amp; Drop, um die Reihenfolge zu ändern.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUER BEREICH</p>
          <label>Titel<input required name="newTitle" placeholder="z. B. Sauna" /></label>
          <label>Zahl <small>optional</small><input name="newNumber" placeholder="z. B. 1" /></label>
          <label>Text <small>optional</small><textarea name="newText" rows={2} placeholder="Kurzbeschreibung" /></label>
          <button className="button button-light" type="submit">Bereich anlegen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">ANLAGE-BEREICHE</p></div>
          {items.length ? (
            <form onSubmit={saveAll}>
              {items.map((item, index) => (
                <article
                  key={item.id}
                  className={`content-manager-row draggable-row${dragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (dragIndex !== null) reorder(dragIndex, index); setDragIndex(null); }}
                  onDragEnd={() => setDragIndex(null)}
                >
                  <span className="content-manager-drag-handle" aria-hidden="true">⠿</span>
                  {item.image ? <img className="partner-admin-logo" src={item.image} alt="" /> : <span className="content-manager-noimage">Kein Bild</span>}
                  <div>
                    <label>Titel<input required name={`title-${index}`} defaultValue={item.title} /></label>
                    <label>Zahl <small>optional – erscheint nur mit Zahl zusätzlich als Kennzahl oben auf der Anlage-Seite</small><input name={`number-${index}`} defaultValue={item.number} /></label>
                    <label>Eyebrow <small>optional</small><input name={`eyebrow-${index}`} defaultValue={item.eyebrow} /></label>
                    <label>Text<textarea required name={`text-${index}`} rows={2} defaultValue={item.text} /></label>
                    <label>Button-Text <small>optional</small><input name={`action-${index}`} defaultValue={item.action} /></label>
                    <label>Link <small>optional</small><input name={`href-${index}`} defaultValue={item.href} /></label>
                    <label>Bild<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(item.id, file); }} /></label>
                    <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
                  </div>
                </article>
              ))}
              <button className="button button-light" type="submit">Änderungen speichern <Check size={17} /></button>
            </form>
          ) : <p className="content-manager-empty">Noch keine Bereiche angelegt.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function CustomBlockManager({
  open, close, items, saveAll, addOne, remove, uploadImage,
}: {
  open: boolean; close: () => void; items: CustomBlock[];
  saveAll: (event: FormEvent<HTMLFormElement>) => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: CustomBlock) => void;
  uploadImage: (id: string, file: File) => void;
}) {
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Zusatzblöcke verwalten">
    <button className="admin-close" onClick={close} aria-label="Zusatzblöcke-Verwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Zusatzblöcke</p><h2>Eigene<br /><em>Inhalte.</em></h2><p>Neue Absätze mit Titel, Text und optionalem Bild anlegen — erscheinen auf der Startseite unter „Direkt zum Ziel“.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUER BLOCK</p>
          <label>Titel<input required name="newTitle" placeholder="z. B. Sommerfest 2026" /></label>
          <label>Text <small>optional</small><textarea name="newText" rows={3} placeholder="Was soll hier stehen?" /></label>
          <button className="button button-light" type="submit">Block anlegen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">AKTUELLE BLÖCKE</p></div>
          {items.length ? (
            <form onSubmit={saveAll}>
              {items.map((item, index) => (
                <article key={item.id} className="content-manager-row">
                  {item.image ? <img className="partner-admin-logo" src={item.image} alt="" /> : <span className="content-manager-noimage">Kein Bild</span>}
                  <div>
                    <label>Titel<input required name={`title-${index}`} defaultValue={item.title} /></label>
                    <label>Text<textarea name={`text-${index}`} rows={3} defaultValue={item.text} /></label>
                    <label>Bild<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(item.id, file); }} /></label>
                    <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
                  </div>
                </article>
              ))}
              <button className="button button-light" type="submit">Änderungen speichern <Check size={17} /></button>
            </form>
          ) : <p className="content-manager-empty">Noch keine Zusatzblöcke angelegt.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function NavigationManager({
  open, close, items, reorder, updateField, commit, toggleField, addOne, remove,
}: {
  open: boolean; close: () => void; items: NavItem[];
  reorder: (fromIndex: number, toIndex: number) => void;
  updateField: (id: string, field: "label" | "href", value: string) => void;
  commit: () => void;
  toggleField: (id: string, field: "visible" | "primary") => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: NavItem) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Navigation verwalten">
    <button className="admin-close" onClick={close} aria-label="Navigationsverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Navigation</p><h2>Menü.<br /><em>Anordnen.</em></h2><p>Ziehe Einträge per Drag &amp; Drop in eine neue Reihenfolge. „Hauptmenü“ zeigt einen Punkt direkt in der Kopfzeile statt im „Mehr“-Menü. Mindestens ein Eintrag muss sichtbar bleiben.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUER MENÜPUNKT</p>
          <label>Text<input required name="newLabel" placeholder="z. B. Sponsoren" /></label>
          <label>Link<input required name="newHref" placeholder="z. B. /partner" /></label>
          <button className="button button-light" type="submit">Hinzufügen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">MENÜPUNKTE</p></div>
          <div className="nav-manager-rows">
            {items.map((item, index) => (
              <article
                key={item.id}
                className={`nav-manager-row${dragIndex === index ? " dragging" : ""}${!item.visible ? " is-hidden" : ""}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  if (dragIndex !== null) reorder(dragIndex, index);
                  setDragIndex(null);
                }}
                onDragEnd={() => setDragIndex(null)}
              >
                <span className="nav-drag-handle" aria-hidden="true">⠿</span>
                <input
                  value={item.label}
                  onChange={(event) => updateField(item.id, "label", event.target.value)}
                  onBlur={commit}
                  aria-label="Menütext"
                />
                <input
                  value={item.href}
                  onChange={(event) => updateField(item.id, "href", event.target.value)}
                  onBlur={commit}
                  aria-label="Link"
                />
                <label className="nav-toggle">
                  <input type="checkbox" checked={item.primary} onChange={() => toggleField(item.id, "primary")} />
                  Hauptmenü
                </label>
                <label className="nav-toggle">
                  <input type="checkbox" checked={item.visible} onChange={() => toggleField(item.id, "visible")} />
                  Sichtbar
                </label>
                <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  </div>;
}

function MediaLibraryManager({
  open, close, files, loading, onOpen, refresh, remove, upload,
}: {
  open: boolean; close: () => void; files: MediaEntry[]; loading: boolean;
  onOpen: () => void;
  refresh: () => void;
  remove: (entry: MediaEntry) => void;
  upload: (file: File) => void;
}) {
  useEffect(() => {
    if (open) onOpen();
  }, [open]);
  if (!open) return null;
  const folderLabels: Record<string, string> = {
    news: "News", downloads: "Downloads", partners: "Partner", board: "Vorstand",
    history: "Chronik", facilities: "Anlage-Bereiche", blocks: "Zusatzblöcke",
    "site-images": "Website-Bilder", teams: "Mannschaften", library: "Mediathek (frei)",
  };
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Mediathek">
    <button className="admin-close" onClick={close} aria-label="Mediathek schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Mediathek</p><h2>Alle<br /><em>Bilder.</em></h2><p>Alle hochgeladenen Bilder der Website an einem Ort. Bilder, die noch verwendet werden, sind markiert — beim Löschen wird gewarnt.</p></div></header>
      <form
        className="admin-add-form"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.querySelector("input[type=file]") as HTMLInputElement;
          const file = input.files?.[0];
          if (file) upload(file);
          event.currentTarget.reset();
        }}
      >
        <p className="kicker">NEUES BILD HOCHLADEN</p>
        <label>Datei<input required type="file" accept="image/png,image/jpeg,image/webp" /></label>
        <button className="button button-light" type="submit">Hochladen <ImagePlus size={17} /></button>
      </form>
      <div className="media-library-head">
        <p className="kicker">{loading ? "LÄDT …" : `${files.length} DATEIEN`}</p>
        <button onClick={refresh}>Aktualisieren</button>
      </div>
      <div className="media-library-grid">
        {files.length ? (
          files.map((entry) => (
            <article key={entry.path} className={entry.inUse ? "in-use" : ""}>
              <img src={entry.url} alt="" loading="lazy" />
              <span>{folderLabels[entry.folder] ?? entry.folder} · {entry.name}</span>
              {entry.inUse && <small className="media-in-use-badge">Wird verwendet</small>}
              <button onClick={() => remove(entry)}>Löschen</button>
            </article>
          ))
        ) : !loading ? (
          <p className="content-manager-empty">Noch keine Bilder hochgeladen.</p>
        ) : null}
      </div>
    </div>
  </div>;
}

function CustomPageManager({
  open, close, items, saveAll, addOne, remove, uploadImage,
}: {
  open: boolean; close: () => void; items: CustomPage[];
  saveAll: (event: FormEvent<HTMLFormElement>) => void;
  addOne: (event: FormEvent<HTMLFormElement>) => void;
  remove: (item: CustomPage) => void;
  uploadImage: (id: string, file: File) => void;
}) {
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Seiten verwalten">
    <button className="admin-close" onClick={close} aria-label="Seitenverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Eigene Seiten</p><h2>Neue<br /><em>Abteile.</em></h2><p>Lege komplett neue Seiten mit eigener Internetadresse an — z. B. für ein Sommerfest oder eine neue Sparte. Eine neue Seite ist erst live, wenn „Veröffentlicht“ angehakt ist. Danach kannst du sie unter Navigation ins Menü aufnehmen.</p></div></header>
      <div className="content-manager-grid">
        <form onSubmit={addOne}>
          <p className="kicker">NEUE SEITE</p>
          <label>Titel<input required name="newTitle" placeholder="z. B. Sommerfest 2026" /></label>
          <label>Internetadresse <small>optional – wird sonst aus dem Titel erzeugt, z. B. /sommerfest-2026</small><input name="newSlug" placeholder="sommerfest-2026" /></label>
          <label>Kicker <small>optional</small><input name="newEyebrow" placeholder="z. B. TCT Vereinsleben" /></label>
          <label>Kurztext <small>optional</small><textarea name="newText" rows={2} placeholder="Kurze Einleitung unter der Überschrift" /></label>
          <label>Inhalt <small>optional, ein Absatz pro Zeile</small><textarea name="newBody" rows={5} placeholder="Der eigentliche Seiteninhalt …" /></label>
          <button className="button button-light" type="submit">Seite anlegen <ArrowRight size={17} /></button>
        </form>
        <section className="content-manager-list">
          <div><p className="kicker">ALLE EIGENEN SEITEN</p></div>
          {items.length ? (
            <form onSubmit={saveAll}>
              {items.map((item, index) => (
                <article key={item.id} className="content-manager-row">
                  {item.image ? <img className="partner-admin-logo" src={item.image} alt="" /> : <span className="content-manager-noimage">Kein Bild</span>}
                  <div>
                    <p className="page-manager-url">/{item.slug}</p>
                    <label>Titel<input required name={`title-${index}`} defaultValue={item.title} /></label>
                    <label>Kicker<input name={`eyebrow-${index}`} defaultValue={item.eyebrow} /></label>
                    <label>Kurztext<textarea name={`text-${index}`} rows={2} defaultValue={item.text} /></label>
                    <label>Inhalt <small>ein Absatz pro Zeile</small><textarea name={`body-${index}`} rows={5} defaultValue={item.body} /></label>
                    <label>Bild<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadImage(item.id, file); }} /></label>
                    <label className="nav-toggle"><input type="checkbox" name={`published-${index}`} defaultChecked={item.published} /> Veröffentlicht</label>
                    <button className="danger" type="button" onClick={() => remove(item)}>Löschen</button>
                  </div>
                </article>
              ))}
              <button className="button button-light" type="submit">Änderungen speichern <Check size={17} /></button>
            </form>
          ) : <p className="content-manager-empty">Noch keine eigenen Seiten angelegt.</p>}
        </section>
      </div>
    </div>
  </div>;
}

function FormsManager({
  open, close, settings, save,
}: {
  open: boolean; close: () => void; settings: FormSettings;
  save: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;
  return <div className="editor-overlay content-manager" role="dialog" aria-modal="true" aria-label="Formulare verwalten">
    <button className="admin-close" onClick={close} aria-label="Formularverwaltung schließen"><X size={23} /></button>
    <div className="content-manager-card">
      <header><div><p className="eyebrow"><span /> Formulare</p><h2>Anfragen<br /><em>steuern.</em></h2><p>Die Kontakt- und Partneranfrage können bei Bedarf pausiert werden — Besucher sehen dann statt des Formulars einen Hinweistext mit Mail-Adresse. Turnier-Anmeldungen steuerst du direkt beim jeweiligen Turnier.</p></div></header>
      <form key={`${settings.contactFormEnabled}-${settings.partnerFormEnabled}`} onSubmit={save}>
        <label className="nav-toggle"><input type="checkbox" name="contactFormEnabled" defaultChecked={settings.contactFormEnabled} /> Kontaktformular (Seite „Kontakt") ist geöffnet</label>
        <label className="nav-toggle"><input type="checkbox" name="partnerFormEnabled" defaultChecked={settings.partnerFormEnabled} /> Partneranfrage-Formular (Seite „Partner") ist geöffnet</label>
        <label>Hinweistext bei pausiertem Formular<textarea name="pausedMessage" rows={2} defaultValue={settings.pausedMessage} /></label>
        <button className="button button-light" type="submit">Speichern <Check size={17} /></button>
      </form>
    </div>
  </div>;
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
  moveToNews,
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
  moveToNews: () => void;
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
            <button type="button" onClick={moveToNews}>
              Als News behalten
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
                    href: "/news",
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
                    href: "/turniere",
                    spectatorsAllowed: item.spectators_allowed,
                    admissionPriceCents: item.admission_price_cents,
                    venueName: item.venue_name ?? undefined,
                    venueAddress: item.venue_address ?? undefined,
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
  themeChanged,
}: {
  open: boolean;
  close: () => void;
  role: string;
  themeChanged: (theme: SiteTheme) => void;
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
      !window.confirm(
        `Wirklich ausführen?\n\n${proposal.details}${proposal.warning ? `\n\n⚠️ ${proposal.warning}` : ""}`,
      )
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
    if (proposal.action === "update_theme" && data.theme) {
      themeChanged(data.theme as SiteTheme);
    }
    setProposal(null);
    setPrompt("");
    setPassword("");
  };
  const examples: Record<string, string> = {
    programmer:
      "Ändere die Überschriften auf Playfair Display und die Akzentfarbe auf #d8ff63.",
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
            <span /> TCT Club Assistant
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
            {proposal.warning && (
              <p className="ai-proposal-warning">
                <AlertTriangle size={16} /> {proposal.warning}
              </p>
            )}
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

const KNOWN_SECTION_PAGES = ["club", "anlage", "teams", "turniere", "news", "mitglied-werden", "service", "kontakt", "galerie", "partner", "spielpartner", "impressum"];
const KNOWN_PATHS = ["", "/", "/booking", "/turnier-anmeldung", "/datenschutz", ...KNOWN_SECTION_PAGES.map((page) => `/${page}`)];
const sectionPageInfo: Record<string, { eyebrow: string; title: string; accent: string; text: string; docTitle?: string }> = {
  club: { eyebrow: "Tennisclub Trier 1888 e.V.", title: "Der", accent: "Club.", text: "Tradition, Menschen und das Clubleben am Moselstadion." },
  anlage: { eyebrow: "Am Moselstadion", title: "Unsere", accent: "Anlage.", text: "Tennis, Padel, Halle und Gastronomie an einem Ort." },
  teams: { eyebrow: "Gemeinsam antreten", title: "Unsere", accent: "Teams.", text: "Damen, Herren und Jugend – alle Mannschaften des TCT." },
  turniere: { eyebrow: "Tennis in Trier", title: "Unsere", accent: "Turniere.", text: "Aktuelle Termine, Turnierdetails und direkte Fragen an die Turnierleitung." },
  news: { eyebrow: "Was den Club bewegt", title: "TCT", accent: "News.", text: "Aktuelles, Rückblicke und das komplette Vereinsarchiv." },
  "mitglied-werden": { eyebrow: "Willkommen im TCT", title: "Mitglied", accent: "werden.", text: "Beiträge ansehen, Unterlagen öffnen und den ersten Schritt in den Club machen." },
  service: { eyebrow: "Alles auf einen Blick", title: "TCT", accent: "Service.", text: "Offizielle Unterlagen und wichtige Downloads für den Cluballtag." },
  kontakt: { eyebrow: "Wir sind für dich da", title: "Sag", accent: "Hallo.", text: "Fragen, Interesse oder ein erstes Kennenlernen – wir freuen uns auf dich." },
  galerie: { eyebrow: "Momente vom Moselstadion", title: "TCT", accent: "Galerie.", text: "Mannschaften, Turniere, Anlage und Clubleben in Bildern." },
  partner: { eyebrow: "Gemeinsam für Trier", title: "Partner", accent: "werden.", text: "Sichtbarkeit, Sport und echtes Engagement für den Tennisclub Trier." },
  spielpartner: { eyebrow: "TCT Mitgliederbörse", title: "Spielpartner", accent: "finden.", text: "Finde unkompliziert ein Match, einen festen Termin oder neue Spielpartner im Club." },
  impressum: { eyebrow: "Tennisclub Trier 1888 e.V.", title: "Rechtliche", accent: "Angaben.", docTitle: "Impressum", text: "Angaben zum Anbieter und Kontaktmöglichkeiten des Tennisclub Trier." },
};

type SiteCopyApi = {
  copy: Record<string, string>;
  editMode: boolean;
  save: (id: string, value: string) => void;
};
const SiteCopyContext = createContext<SiteCopyApi>({
  copy: {},
  editMode: false,
  save: () => {},
});

// Editierbarer Text für den Seiteninhaltsmodus: als eigene Top-Level-
// Komponente (statt in App() verschachtelt) definiert, damit React ihre
// Identität zwischen Renders stabil hält — sonst würde jeder Tastenanschlag
// woanders auf der Seite das contenteditable-Element neu mounten und den
// Cursor/Fokus killen. Daten kommen daher über Context statt Props.
function EditableText({
  id,
  defaultValue,
  as: Tag = "span",
  className,
}: {
  id: string;
  defaultValue: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div" | "b" | "small";
  className?: string;
}) {
  const { copy, editMode, save } = useContext(SiteCopyContext);
  const value = copy[id] ?? defaultValue;
  if (!editMode) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag
      className={`${className ?? ""} editable-text-active`.trim()}
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => {
        const next = event.currentTarget.textContent?.trim() ?? "";
        if (next && next !== value) save(id, next);
      }}
    >
      {value}
    </Tag>
  );
}

function App() {
  // Client-seitiges Routing: currentPath ist reaktiver State statt eines
  // einmalig beim Laden gelesenen const. Ein globaler Klick-Interceptor
  // (siehe unten) verhindert den vollen Browser-Reload bei internen Links
  // und ruft stattdessen pushState + setCurrentPath auf. Vorher löste jeder
  // Navigationsklick einen kompletten Neuladevorgang aus.
  const [currentPath, setCurrentPath] = useState(() =>
    window.location.pathname.replace(/\/+$/, ""),
  );
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search);
  const [liveCustomPages, setLiveCustomPages] = useState<CustomPage[]>([]);
  const [liveClub, setLiveClub] = useState<ClubSettings>({
    openingHours:
      "Aktuelle Platz- und Hallenzeiten direkt über die Buchung prüfen.",
    tennisBookingUrl: club.bookingUrl,
    padelBookingUrl: club.padelUrl,
    schoolUrl: club.schoolUrl,
    instagramUrl: officialLinks.instagram,
    facebookUrl: officialLinks.facebook,
    siteTitle: "TCT 1888 — Tennisclub Trier",
    siteDescription: "Tennisclub Trier 1888 e.V. – Tennis, Padel und Gemeinschaft am Moselstadion.",
    faviconUrl: "",
  });
  const [liveFormSettings, setLiveFormSettings] = useState<FormSettings>({
    contactFormEnabled: true,
    partnerFormEnabled: true,
    pausedMessage: "Dieses Formular ist gerade pausiert. Schreib uns gerne direkt per E-Mail.",
  });
  const [teamDragIndex, setTeamDragIndex] = useState<number | null>(null);

  const navigate = (path: string) => {
    const url = new URL(path, window.location.origin);
    const samePage =
      url.pathname === window.location.pathname && url.search === window.location.search;
    window.history.pushState(null, "", path);
    setCurrentPath(url.pathname.replace(/\/+$/, ""));
    setCurrentSearch(url.search);
    if (url.hash) {
      // Anker-Links (z.B. /club#geschichte) sollen weiterhin zur Zielstelle
      // springen statt immer nach ganz oben zu scrollen.
      requestAnimationFrame(() => {
        document
          .getElementById(url.hash.slice(1))
          ?.scrollIntoView({ behavior: samePage ? "smooth" : "instant" });
      });
    } else {
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }
  };

  useEffect(() => {
    const onPopState = () => {
      setCurrentPath(window.location.pathname.replace(/\/+$/, ""));
      setCurrentSearch(window.location.search);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as HTMLElement)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("//")) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      // Links auf echte Dateien (z.B. /vereinsunterlagen/satzung.pdf) sollen
      // normal geöffnet/heruntergeladen werden, nicht vom Router abgefangen.
      const lastSegment = href.split(/[?#]/)[0].split("/").pop() ?? "";
      if (lastSegment.includes(".")) return;
      event.preventDefault();
      navigate(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const isHomePage = currentPath === "" || currentPath === "/";
  const isBookingPage = currentPath === "/booking";
  const isTournamentContactPage = currentPath === "/turnier-anmeldung";
  const isKnownPath = KNOWN_PATHS.includes(currentPath);
  const sectionPage = KNOWN_SECTION_PAGES.find(
    (page) => currentPath === `/${page}`,
  );
  const pageInfo = sectionPage ? sectionPageInfo[sectionPage] : null;
  const customPage = liveCustomPages.find(
    (page) => page.published && currentPath === `/${page.slug}`,
  );
  const isFocusedPage = !isHomePage;

  // Seitentitel & Meta-Description pro Route — seit dem Umstieg auf
  // Client-Side-Routing (kein Full-Reload mehr) muss das jetzt manuell
  // passieren, sonst zeigt der Browser-Tab auf jeder Seite denselben Titel.
  useEffect(() => {
    const siteTitle = liveClub.siteTitle;
    const siteDescription = liveClub.siteDescription;
    let title = siteTitle;
    let description = siteDescription;
    if (pageInfo) {
      title = `${pageInfo.docTitle ?? `${pageInfo.title} ${pageInfo.accent.replace(/\.$/, "")}`} — TCT 1888`;
      description = pageInfo.text;
    } else if (isBookingPage) {
      title = "Platz buchen — TCT 1888";
      description = "Freie Tennis-, Hallen- und Padelplätze direkt online buchen.";
    } else if (isTournamentContactPage) {
      title = "Turnier-Anfrage — TCT 1888";
      description = "Fragen oder Anmeldung zu einem Turnier des Tennisclub Trier.";
    } else if (currentPath === "/datenschutz") {
      title = "Datenschutz — TCT 1888";
    } else if (customPage) {
      title = `${customPage.title} — TCT 1888`;
      description = customPage.text || description;
    } else if (!isHomePage && !isKnownPath) {
      title = "Seite nicht gefunden — TCT 1888";
    }
    document.title = title;
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", description);
  }, [currentPath, pageInfo, isBookingPage, isTournamentContactPage, isHomePage, isKnownPath, customPage, liveClub.siteTitle, liveClub.siteDescription]);

  useEffect(() => {
    if (!liveClub.faviconUrl) return;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = liveClub.faviconUrl;
  }, [liveClub.faviconUrl]);
  const selectedTournamentTitle = new URLSearchParams(currentSearch).get("turnier") ?? "Allgemeine Turnieranfrage";
  const registrationAllowed = new URLSearchParams(currentSearch).get("anmeldung") !== "0";
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [adminPanel, setAdminPanel] = useState<"login" | "dashboard" | null>(
    null,
  );
  const [authMode, setAuthMode] = useState<
    "login" | "register" | "verify" | "forgot" | "reset"
  >("login");
  const [passwordResetIdentifier, setPasswordResetIdentifier] = useState("");
  const [pendingRegistrationEmail, setPendingRegistrationEmail] = useState("");
  // Nur für den Weg "frisch registriert -> Code bestätigen" nötig, damit wir
  // die Person danach direkt einloggen können, statt sie ein zweites Mal
  // Zugangsdaten eingeben zu lassen. Kommt man stattdessen über einen
  // Login-Versuch auf ein noch unbestätigtes Konto, existiert schon eine
  // Session (signInWithPassword läuft dort schon durch) und dieses Feld
  // bleibt leer.
  const [pendingRegistrationPassword, setPendingRegistrationPassword] = useState("");
  const [resendingCode, setResendingCode] = useState(false);
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
  const [livePartners, setLivePartners] = useState<PartnerItem[]>([]);
  const [liveCustomBlocks, setLiveCustomBlocks] = useState<CustomBlock[]>([]);
  const [liveNavItems, setLiveNavItems] = useState<NavItem[]>(defaultNavItems);
  const [mediaLibraryFiles, setMediaLibraryFiles] = useState<MediaEntry[]>([]);
  const [mediaLibraryLoading, setMediaLibraryLoading] = useState(false);
  const [liveCopy, setLiveCopy] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [liveBoard, setLiveBoard] = useState<BoardMember[]>(
    board.map(([name, role]) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name,
      role,
      photo: boardPortraits[name] ?? "",
    })),
  );
  const [liveTournaments, setLiveTournaments] = useState<Tournament[]>(
    tournamentEntries.map((entry) => ({
      ...entry,
      id: entry.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      admission: entry.admission ?? "",
      prizeMoney: entry.prizeMoney ?? "",
      venue: entry.venue ?? "",
      mapsUrl: entry.mapsUrl ?? "",
    })),
  );
  const [liveHistory, setLiveHistory] = useState<HistoryEvent[]>(
    history.map(([year, title]) => ({
      id: year,
      year,
      title,
      label: historyDetails[year]?.label ?? "",
      text: historyDetails[year]?.text ?? "",
      image: historyDetails[year]?.image ?? "",
    })),
  );
  const [liveFacilities, setLiveFacilities] = useState<FacilityItem[]>(
    // facilityExperiences (4 Einträge, inkl. La Palma) ist die Basis; die
    // kürzere facilities-Liste (nur 3, ohne Restaurant) liefert nur die
    // Stat-Zahl für die ersten drei.
    facilityExperiences.map((experience, index) => {
      const stat = facilities[index];
      return {
        id: experience.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        number: stat?.number ?? "",
        title: experience.title,
        eyebrow: experience.eyebrow,
        text: experience.text,
        action: experience.action,
        href: experience.href,
        image: officialImages[experience.image as SiteImageKey] ?? "",
      };
    }),
  );
  const [liveSiteTheme, setLiveSiteTheme] = useState<SiteTheme>(defaultSiteTheme);
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
  const [editingEvent, setEditingEvent] = useState<PublicEvent | null>(null);
  const [contactMessages, setContactMessages] = useState<ContactMessage[]>([]);
  const [replyingToContact, setReplyingToContact] = useState<ContactMessage | null>(null);
  const [contactReplyText, setContactReplyText] = useState("");
  const [contactReplyStatus, setContactReplyStatus] = useState("");
  const [tournamentInquiries, setTournamentInquiries] = useState<TournamentInquiry[]>([]);
  const [contactError, setContactError] = useState("");
  const [partnerInquirySent, setPartnerInquirySent] = useState(false);
  const [partnerInquiryError, setPartnerInquiryError] = useState("");
  const [tournamentFormError, setTournamentFormError] = useState("");
  const [tournamentFormSent, setTournamentFormSent] = useState(false);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [managedUserSearch, setManagedUserSearch] = useState("");
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [adminRole, setAdminRole] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [accountNotice, setAccountNotice] = useState("");
  const [accountBusy, setAccountBusy] = useState(false);
  const [pendingAccountEmail, setPendingAccountEmail] = useState("");
  const [showAccountPasswords, setShowAccountPasswords] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [auditItems, setAuditItems] = useState<AuditItem[]>([]);
  const [auditOpen, setAuditOpen] = useState(false);
  const [tournamentFilter, setTournamentFilter] =
    useState<TournamentFilter>("Alle");
  const [selectedTournament, setSelectedTournament] =
    useState<Tournament | null>(null);
  const [teamGroup, setTeamGroup] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
        setPrivacyOpen(false);
        if (window.location.pathname.replace(/\/+$/, "") === "/datenschutz") navigate("/");
        setAdminPanel(null);
        setAdminEditor(null);
        setAccountOpen(false);
        setAuditOpen(false);
        setTutorialOpen(false);
        setSelectedNews(null);
        setSelectedTournament(null);
        setSelectedTeamPhoto(null);
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
        setFeaturedContent({
          ...defaultFeaturedContent,
          ...(item as Partial<FeaturedContent>),
        });
    };
    void loadFeaturedContent();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadPartners = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "partners").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLivePartners(data.value.items as PartnerItem[]);
    };
    void loadPartners();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadBoard = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "board").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLiveBoard(data.value.items as BoardMember[]);
    };
    void loadBoard();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadTournaments = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "tournaments").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLiveTournaments(data.value.items as Tournament[]);
    };
    void loadTournaments();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadHistory = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "history").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLiveHistory(data.value.items as HistoryEvent[]);
    };
    void loadHistory();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadFacilities = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "facilities").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLiveFacilities(data.value.items as FacilityItem[]);
    };
    void loadFacilities();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadCustomBlocks = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "custom_blocks").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLiveCustomBlocks(data.value.items as CustomBlock[]);
    };
    void loadCustomBlocks();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadNavigation = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "navigation").maybeSingle();
      if (Array.isArray(data?.value?.items) && data.value.items.length) setLiveNavItems(data.value.items as NavItem[]);
    };
    void loadNavigation();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadCustomPages = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "custom_pages").maybeSingle();
      if (Array.isArray(data?.value?.items)) setLiveCustomPages(data.value.items as CustomPage[]);
    };
    void loadCustomPages();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadCopy = async () => {
      const { data } = await client.from("club_content").select("value").eq("key", "site_copy").maybeSingle();
      const texts = data?.value?.texts;
      if (texts && typeof texts === "object") setLiveCopy(texts as Record<string, string>);
    };
    void loadCopy();
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
    const client = supabase;
    if (!client) return;
    const loadFormSettings = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "form_settings")
        .maybeSingle();
      const settings = data?.value?.settings;
      if (settings && typeof settings === "object")
        setLiveFormSettings((previous) => ({ ...previous, ...settings }));
    };
    void loadFormSettings();
  }, []);

  useEffect(() => {
    const client = supabase;
    if (!client) return;
    const loadSiteTheme = async () => {
      const { data } = await client
        .from("club_content")
        .select("value")
        .eq("key", "site_theme")
        .maybeSingle();
      setLiveSiteTheme(normalizeSiteTheme(data?.value?.settings));
    };
    void loadSiteTheme();
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--serif", headingFontFamilies[liveSiteTheme.headingFont]);
    root.style.setProperty("--sans", bodyFontFamilies[liveSiteTheme.bodyFont]);
    root.style.setProperty("--ink", liveSiteTheme.darkColor);
    root.style.setProperty("--ink-2", liveSiteTheme.deepDarkColor);
    root.style.setProperty("--lime", liveSiteTheme.accentColor);
    root.style.setProperty("--cream", liveSiteTheme.backgroundColor);
  }, [liveSiteTheme]);

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
          .select("id,title,category,description,starts_at,ends_at,registration_enabled,spectators_allowed,admission_price_cents,venue_name,venue_address")
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
    if (String(form.get("website") ?? "").trim()) {
      setFormSent(true);
      return;
    }
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

  const submitPartnerInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const company = String(form.get("company") ?? "").trim();
    const message = String(form.get("message") ?? "").trim();
    setPartnerInquiryError("");
    if (String(form.get("website") ?? "").trim()) {
      setPartnerInquirySent(true);
      return;
    }
    const subject = "Partnerschaftsanfrage";
    const fullMessage = `[${subject}]${company ? ` Unternehmen: ${company}` : ""}\n\n${message}`;
    if (!supabase) {
      window.location.href = `mailto:${club.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nE-Mail: ${email}${company ? `\nUnternehmen: ${company}` : ""}\n\n${message}`)}`;
      setPartnerInquirySent(true);
      return;
    }
    const { error } = await supabase
      .from("contact_messages")
      .insert({ name, email, message: fullMessage });
    if (error) {
      setPartnerInquiryError("Deine Anfrage konnte gerade nicht gespeichert werden. Bitte schreibe uns direkt per E-Mail.");
      return;
    }
    setPartnerInquirySent(true);
  };

  const sendContactReply = async () => {
    if (!supabase || !replyingToContact) return;
    const text = contactReplyText.trim();
    if (text.length < 2) {
      setContactReplyStatus("Bitte schreibe zuerst eine Antwort.");
      return;
    }
    setContactReplyStatus("Wird gesendet …");
    const { data, error } = await supabase.functions.invoke("contact-reply", {
      body: { contactMessageId: replyingToContact.id, message: text },
    });
    if (error || data?.error) {
      setContactReplyStatus(data?.error ?? "Die E-Mail konnte nicht gesendet werden.");
      return;
    }
    setContactMessages((items) => items.map((item) => item.id === replyingToContact.id ? { ...item, status: "read" } : item));
    setReplyingToContact(null);
    setContactReplyText("");
    setContactReplyStatus("Antwort wurde per E-Mail gesendet.");
  };

  const submitTournamentInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const inquiryType = String(form.get("inquiryType") ?? "question");
    const message = String(form.get("message") ?? "").trim();
    setTournamentFormError("");
    if (String(form.get("website") ?? "").trim()) {
      setTournamentFormSent(true);
      return;
    }
    if (!supabase) {
      setTournamentFormError("Das Turnier-Postfach ist gerade nicht verfügbar. Bitte versuche es später erneut.");
      return;
    }
    const { error } = await supabase.from("tournament_inquiries").insert({
      name,
      email,
      tournament_title: selectedTournamentTitle,
      inquiry_type: inquiryType,
      message: message || null,
    });
    if (error) {
      setTournamentFormError("Deine Anfrage konnte gerade nicht gespeichert werden. Bitte schreibe uns direkt per E-Mail.");
      return;
    }
    setTournamentFormSent(true);
  };

  const shownTournaments = liveTournaments.filter(
    (entry) =>
      tournamentFilter === "Alle" ||
      entry.categories.includes(tournamentFilter),
  );
  const eventIsEnded = (event: PublicEvent) =>
    Boolean(event.ends_at && new Date(event.ends_at).getTime() < Date.now());
  const tournamentIsEnded = (event: Tournament) =>
    new Date(event.endsAt).getTime() < Date.now();
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
  const canManageTournamentInbox = ["management", "admin", "tournament_manager"].includes(adminRole);
  const canManageBooking = ["management", "admin"].includes(adminRole);
  const canManageFocus = ["management", "admin", "editor"].includes(adminRole);
  const filteredManagedUsers = managedUsers.filter((user) => {
    const query = managedUserSearch.trim().toLowerCase();
    if (!query) return true;
    return [user.display_name, user.username, user.login_email, roleLabels[user.role]]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(query));
  });
  const traditionYears = new Date().getFullYear() - 1888;
  const tutorialSteps =
    adminRole === "programmer"
      ? [
          ["Willkommen.", "Du verwaltest das technische Erscheinungsbild der TCT-Website mit dem abgesicherten KI-Designer."],
          ["KI-Website-Designer", "Beschreibe Schriftarten oder Farben. Groq erstellt zuerst einen Vorschlag; erst deine Bestätigung wendet ihn an."],
          ["Sicherheitsgrenze", "Deine Rolle kann keine Benutzer verwalten oder löschen. Der Eigentümer kann jedes KI-Design jederzeit auf den TCT-Standard zurücksetzen."],
        ]
      : adminRole === "tournament_manager"
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
              "Vereinsinhalte pflegen",
              "Vorstand, Chronik und Anlage-Bereiche sind eigene Editoren links im Menü — dort kannst du Mitglieder, Meilensteine und Bereichstexte direkt bearbeiten.",
            ],
            [
              "Mitgliedsbeiträge",
              "Unter Mitgliedsbeiträge änderst du Preise und legst neue Beitragsstufen an oder entfernst sie.",
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
      setAdminNotice(`News konnten nicht geladen werden: ${friendlyDbError(error)}`);
      return;
    }
    setAdminNews(data ?? []);
  };

  const deleteNews = async (news: NewsItem) => {
    if (!supabase || !window.confirm(`„${news.title}“ wirklich löschen?`))
      return;
    const { error } = await supabase.from("news").delete().eq("id", news.id);
    if (error) {
      setAdminNotice(`News konnte nicht gelöscht werden: ${friendlyDbError(error)}`);
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
      .select("id,title,category,description,starts_at,ends_at,registration_enabled,spectators_allowed,admission_price_cents,venue_name,venue_address")
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

  const loadTournamentInquiries = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("tournament_inquiries")
      .select("id,name,email,tournament_title,inquiry_type,message,status,created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error && data) setTournamentInquiries(data as TournamentInquiry[]);
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
      setAdminNotice(`Passwort konnte nicht geändert werden: ${friendlyDbError(error)}`);
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

  const invokeAccountSettings = async (
    body: Record<string, unknown>,
  ): Promise<Record<string, unknown>> => {
    if (!supabase) return { error: "Supabase ist noch nicht verbunden." };
    const { data, error } = await supabase.functions.invoke(
      "account-settings",
      { body },
    );
    if (data?.error) return { error: String(data.error) };
    if (!error) return data as Record<string, unknown>;
    try {
      const context = (error as { context?: Response }).context;
      const payload = context
        ? ((await context.clone().json()) as { error?: string })
        : null;
      return { error: payload?.error ?? error.message };
    } catch {
      return { error: error.message };
    }
  };

  const changeOwnName = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const displayName = String(
      new FormData(event.currentTarget).get("displayName"),
    ).trim();
    setAccountBusy(true);
    const { data, error } = await supabase.functions.invoke("admin-users", {
      body: { action: "changeOwnName", displayName },
    });
    setAccountBusy(false);
    if (error || data?.error) {
      setAccountNotice(data?.error ?? "Name konnte nicht geändert werden.");
      return;
    }
    setAdminName(displayName);
    setAccountNotice("Dein Name wurde gespeichert.");
  };

  const changeOwnUsername = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const username = String(
      new FormData(event.currentTarget).get("username"),
    ).trim();
    setAccountBusy(true);
    const result = await invokeAccountSettings({
      action: "changeUsername",
      username,
    });
    setAccountBusy(false);
    if (result?.error) {
      setAccountNotice(String(result.error));
      return;
    }
    setAdminUsername(String(result.username ?? username));
    setAccountNotice("Dein Benutzername wurde geändert.");
  };

  const requestOwnEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const newEmail = String(form.get("newEmail")).trim();
    setAccountBusy(true);
    const result = await invokeAccountSettings({
      action: "requestEmailChange",
      newEmail,
      currentPassword: String(form.get("currentPassword")),
    });
    setAccountBusy(false);
    if (result?.error) {
      setAccountNotice(String(result.error));
      return;
    }
    event.currentTarget.reset();
    setPendingAccountEmail(String(result.newEmail ?? newEmail));
    setAccountNotice(
      "Der sechsstellige Code wurde an deine neue E-Mail-Adresse gesendet. Bitte prüfe auch den Spam-Ordner.",
    );
  };

  const confirmOwnEmailChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    setAccountBusy(true);
    const result = await invokeAccountSettings({
      action: "confirmEmailChange",
      code,
    });
    setAccountBusy(false);
    if (result?.error) {
      setAccountNotice(String(result.error));
      return;
    }
    await supabase.auth.signOut();
    setPendingAccountEmail("");
    setAccountOpen(false);
    setAuthMode("login");
    setAdminPanel("login");
    setAdminNotice(
      "E-Mail-Adresse geändert. Melde dich jetzt mit der neuen Adresse an.",
    );
  };

  const changeOwnPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const newPassword = String(form.get("newPassword"));
    if (newPassword !== String(form.get("newPasswordRepeat"))) {
      setAccountNotice("Die neuen Passwörter stimmen nicht überein.");
      return;
    }
    setAccountBusy(true);
    const result = await invokeAccountSettings({
      action: "changePassword",
      currentPassword: String(form.get("currentPassword")),
      newPassword,
    });
    setAccountBusy(false);
    if (result?.error) {
      setAccountNotice(String(result.error));
      return;
    }
    event.currentTarget.reset();
    await supabase.auth.signOut();
    setAccountOpen(false);
    setAuthMode("login");
    setAdminPanel("login");
    setAdminNotice("Passwort geändert. Bitte melde dich erneut an.");
  };

  const signOutAccount = async () => {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      setAdminNotice(`Abmeldung fehlgeschlagen: ${friendlyDbError(error)}`);
      return;
    }
    setAccountOpen(false);
    setPendingAccountEmail("");
    setAccountNotice("");
    setAdminEditor(null);
    setAdminPanel(null);
    setAdminNotice("Du wurdest abgemeldet.");
  };

  const completeTutorial = async () => {
    if (!supabase) return;
    const { error } = await supabase.rpc("complete_platform_tutorial");
    if (error) {
      setAdminNotice(
        `Tutorial konnte nicht abgeschlossen werden: ${friendlyDbError(error)}`,
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
        `Anfrage konnte nicht aktualisiert werden: ${friendlyDbError(error)}`,
      );
      return;
    }
    setContactMessages((messages) =>
      messages.map((message) =>
        message.id === id ? { ...message, status } : message,
      ),
    );
  };

  const updateTournamentInquiryStatus = async (
    id: string,
    status: TournamentInquiry["status"],
  ) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("tournament_inquiries")
      .update({ status })
      .eq("id", id);
    if (error) return;
    setTournamentInquiries((items) =>
      items.map((item) => (item.id === id ? { ...item, status } : item)),
    );
  };

  useEffect(() => {
    if (adminEditor === "event") void loadAdminEvents();
  }, [adminEditor]);

  useEffect(() => {
    if (adminEditor === "inbox") void loadContactMessages();
  }, [adminEditor]);

  useEffect(() => {
    if (adminEditor === "tournamentInbox") void loadTournamentInquiries();
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
      adminEmail === OWNER_EMAIL
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
      .select("role,display_name,username,login_email,must_change_password,tutorial_completed,email_verified")
      .eq("id", userId)
      .maybeSingle();
    if (error || !profile) {
      setAdminNotice("Zu diesem Login wurde kein Mitgliederkonto gefunden.");
      return false;
    }
    if (!profile.email_verified) {
      setPendingRegistrationEmail(profile.login_email ?? userEmail ?? "");
      setAuthMode("verify");
      setAdminPanel("login");
      setAdminNotice(
        "Bitte bestätige dein Konto mit dem sechsstelligen Code aus deiner TCT-E-Mail.",
      );
      return false;
    }
    setAdminUserId(userId);
    setAdminEmail(profile.login_email ?? userEmail);
    setAdminRole(profile.role);
    setAdminName(profile.display_name ?? "");
    setAdminUsername(profile.username ?? "");
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
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) return;
      if (event !== "SIGNED_OUT") return;
      setAdminUserId(null);
      setAdminEmail(null);
      setAdminRole("");
      setAdminName("");
      setAdminUsername("");
      setPendingAccountEmail("");
      setAccountNotice("");
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
        setAdminNotice("Anmeldung fehlgeschlagen. Bitte Zugang prüfen.");
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
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const registrationEmail = String(form.get("email")).trim().toLowerCase();
    const registrationPassword = String(form.get("password"));
    const { data, error } = await supabase.functions.invoke(
      "member-registration",
      {
        body: {
          displayName: String(form.get("displayName")).trim(),
          username: String(form.get("username")).trim(),
          email: registrationEmail,
          password: registrationPassword,
        },
      },
    );
    if (error || data?.error) {
      const detail =
        (data?.error as string | undefined) ??
        (await edgeFunctionErrorMessage(error, "Unbekannter Fehler"));
      setAdminNotice(`Registrierung konnte nicht abgeschlossen werden: ${detail}`);
      return;
    }
    formElement.reset();
    if (data?.needsEmailConfirmation) {
      setPendingRegistrationEmail(registrationEmail);
      setPendingRegistrationPassword(registrationPassword);
      setAuthMode("verify");
      setAdminNotice(
        "Der sechsstellige Code wurde versendet. Bitte prüfe auch deinen Spam-Ordner.",
      );
      return;
    }
    setAuthMode("login");
    setAdminNotice(
      data?.needsEmailConfirmation
        ? "Fast geschafft: Bitte bestätige zuerst den Link in deiner E-Mail."
        : "Dein Mitgliederkonto wurde erstellt. Du kannst dich jetzt anmelden.",
    );
  };

  const verifyRegistrationEmail = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !pendingRegistrationEmail) {
      setAdminNotice("Bitte registriere dich zuerst oder melde dich erneut an.");
      return;
    }
    const code = String(new FormData(event.currentTarget).get("code")).trim();
    const { data, error } = await supabase.functions.invoke(
      "verify-member-email",
      { body: { email: pendingRegistrationEmail, code } },
    );
    if (error || data?.error) {
      const detail =
        (data?.error as string | undefined) ??
        (await edgeFunctionErrorMessage(error, "Der Code konnte nicht geprüft werden."));
      setAdminNotice(detail);
      return;
    }
    const email = pendingRegistrationEmail;
    const password = pendingRegistrationPassword;
    setPendingRegistrationEmail("");
    setPendingRegistrationPassword("");

    // Kam die Person über einen Login-Versuch auf ein noch unbestätigtes
    // Konto hierher, läuft bereits eine Session (signInWithPassword ist dort
    // schon durchgelaufen) — die reicht aus, kein erneuter Login nötig.
    const { data: existingSession } = await supabase.auth.getSession();
    if (existingSession.session?.user?.email === email) {
      setAuthMode("login");
      await applyAuthenticatedUser(
        existingSession.session.user.id,
        existingSession.session.user.email ?? null,
      );
      return;
    }

    // Frische Registrierung: bislang existiert noch keine Session (die
    // Registrierung legt das Konto server-seitig an, ohne den Browser
    // einzuloggen) — jetzt mit dem gemerkten Passwort direkt anmelden,
    // damit die Person nicht ein zweites Mal Zugangsdaten eingeben muss.
    if (password) {
      const { data: signInData, error: signInError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (!signInError && signInData.user) {
        setAuthMode("login");
        await applyAuthenticatedUser(
          signInData.user.id,
          signInData.user.email ?? null,
        );
        return;
      }
    }

    // Fallback, falls beides nicht greift (z. B. Passwort zwischenzeitlich
    // geändert): wie bisher zur manuellen Anmeldung weiterleiten.
    setAuthMode("login");
    setAdminPanel("login");
    setAdminNotice("E-Mail bestätigt. Du kannst dich jetzt anmelden.");
  };

  const resendVerificationCode = async () => {
    if (!supabase || !pendingRegistrationEmail) {
      setAdminNotice("Bitte melde dich erneut mit deinem Passwort an, um einen neuen Code zu erhalten.");
      return;
    }
    setResendingCode(true);
    const { data, error } = await supabase.functions.invoke(
      "resend-verification-code",
      { body: { email: pendingRegistrationEmail } },
    );
    setResendingCode(false);
    if (error || data?.error) {
      const detail =
        (data?.error as string | undefined) ??
        (await edgeFunctionErrorMessage(error, "Der Code konnte nicht neu versendet werden."));
      setAdminNotice(detail);
      return;
    }
    setAdminNotice("Neuer Code versendet. Bitte prüfe auch deinen Spam-Ordner.");
  };

  const requestPasswordReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setAdminNotice("Supabase ist noch nicht verbunden.");
      return;
    }
    const identifier = String(new FormData(event.currentTarget).get("identifier")).trim();
    const { data, error } = await supabase.functions.invoke(
      "request-password-reset",
      { body: { identifier } },
    );
    if (error || data?.error) {
      setAdminNotice(data?.error ?? "Der Code konnte nicht angefordert werden.");
      return;
    }
    setPasswordResetIdentifier(identifier);
    setAuthMode("reset");
    setAdminNotice(
      "Wenn ein passender Zugang existiert, ist ein sechsstelliger Code unterwegs. Bitte prüfe auch den Spam-Ordner.",
    );
  };

  const resetPasswordWithCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password !== String(form.get("passwordRepeat"))) {
      setAdminNotice("Die beiden Passwörter stimmen nicht überein.");
      return;
    }
    const { data, error } = await supabase.functions.invoke(
      "reset-password-with-code",
      {
        body: {
          identifier: passwordResetIdentifier,
          code: String(form.get("code")).trim(),
          password,
        },
      },
    );
    if (error || data?.error) {
      setAdminNotice(data?.error ?? "Das Passwort konnte nicht zurückgesetzt werden.");
      return;
    }
    setAuthMode("login");
    setPasswordResetIdentifier("");
    setAdminNotice("Passwort geändert. Du kannst dich jetzt anmelden.");
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
      setAdminNotice(`News konnte nicht gespeichert werden: ${friendlyDbError(error)}`);
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
    if (endsAt && new Date(endsAt).getTime() <= new Date(startsAt).getTime()) {
      setAdminNotice("Das Ende muss nach dem Beginn liegen.");
      return;
    }
    const spectatorsAllowed = form.get("spectators_allowed") === "on";
    const priceInput = String(form.get("admission_price") ?? "")
      .trim()
      .replace(",", ".");
    const priceNumber = priceInput === "" ? null : Number(priceInput);
    if (
      spectatorsAllowed &&
      (priceNumber === null || !Number.isFinite(priceNumber) || priceNumber < 0)
    ) {
      setAdminNotice(
        "Bitte gib einen gültigen Eintrittspreis ein. Für kostenlosen Eintritt trägst du 0 ein.",
      );
      return;
    }
    const payload = {
      title: String(form.get("title")),
      category: String(form.get("category")) || null,
      description: String(form.get("description")) || null,
      starts_at: startsAt ? new Date(startsAt).toISOString() : null,
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
      registration_enabled: form.get("registration_enabled") === "on",
      spectators_allowed: spectatorsAllowed,
      admission_price_cents:
        spectatorsAllowed && priceNumber !== null
          ? Math.round(priceNumber * 100)
          : null,
      venue_name: String(form.get("venue_name")).trim() || null,
      venue_address: String(form.get("venue_address")).trim() || null,
      status: "published",
    };
    const eventSelect =
      "id,title,category,description,starts_at,ends_at,registration_enabled,spectators_allowed,admission_price_cents,venue_name,venue_address";
    const { data: savedEvent, error } = editingEvent
      ? await supabase
          .from("events")
          .update(payload)
          .eq("id", editingEvent.id)
          .select(eventSelect)
          .single()
      : await supabase.from("events").insert(payload).select(eventSelect).single();
    if (error) {
      setAdminNotice(
        `Termin konnte nicht gespeichert werden: ${friendlyDbError(error)}`,
      );
      return;
    }
    if (savedEvent) {
      setLiveEvents((items) => {
        const next = editingEvent
          ? items.map((item) =>
              item.id === savedEvent.id ? (savedEvent as PublicEvent) : item,
            )
          : [...items, savedEvent as PublicEvent];
        return next
          .sort(
            (a, b) =>
              new Date(a.starts_at ?? 0).getTime() -
              new Date(b.starts_at ?? 0).getTime(),
          )
          .slice(0, 4);
      });
    }
    setAdminNotice(
      editingEvent ? "Termin wurde aktualisiert." : "Termin wurde veröffentlicht.",
    );
    setEditingEvent(null);
    await loadAdminEvents();
    event.currentTarget.reset();
  };

  const deleteEvent = async (id: string) => {
    if (!supabase || !window.confirm("Termin wirklich löschen?")) return;
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      setAdminNotice(`Termin konnte nicht gelöscht werden: ${friendlyDbError(error)}`);
      return;
    }
    setAdminNotice("Termin wurde gelöscht.");
    setLiveEvents((events) => events.filter((event) => event.id !== id));
    if (editingEvent?.id === id) setEditingEvent(null);
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
      setAdminNotice(`Fokus konnte nicht gespeichert werden: ${friendlyDbError(error)}`);
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
      setAdminNotice(`Fokus konnte nicht entfernt werden: ${friendlyDbError(error)}`);
      return;
    }
    setFeaturedContent(defaultFeaturedContent);
    setAdminNotice("Der Fokus wurde zurückgesetzt.");
  };

  const moveFeaturedToNews = async () => {
    if (
      !supabase ||
      !adminUserId ||
      !window.confirm(
        "Den aktuellen Fokus als normale News im Archiv behalten? Anschließend erscheint wieder der Standardfokus auf der Startseite.",
      )
    )
      return;

    const alreadyNews =
      featuredContent.kind === "news" &&
      adminNews.some(
        (item) =>
          item.title.trim().toLocaleLowerCase("de-DE") ===
          featuredContent.title.trim().toLocaleLowerCase("de-DE"),
      );

    if (!alreadyNews) {
      const { error: newsError } = await supabase.from("news").insert({
        title: featuredContent.title,
        excerpt: featuredContent.text || null,
        body: featuredContent.text || null,
        image_path: featuredContent.image || null,
        status: "published",
        published_at: new Date().toISOString(),
      });
      if (newsError) {
        setAdminNotice(
          `Fokus konnte nicht als News gespeichert werden: ${newsError.message}`,
        );
        return;
      }
    }

    const { error: focusError } = await supabase.from("club_content").upsert({
      key: "featured_content",
      value: { item: defaultFeaturedContent },
      updated_by: adminUserId,
    });
    if (focusError) {
      setAdminNotice(
        `News wurde gespeichert, aber der Fokus konnte nicht entfernt werden: ${focusError.message}`,
      );
      return;
    }
    setFeaturedContent(defaultFeaturedContent);
    setAdminNotice(
      alreadyNews
        ? "Die News bleibt im Archiv. Der Fokus wurde aufgehoben."
        : "Der Fokus wurde als normale News archiviert und von der Startseite genommen.",
    );
    await loadAdminNews();
    await loadNewsArchive();
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
        `Beiträge konnten nicht gespeichert werden: ${friendlyDbError(error)}`,
      );
      return;
    }
    setLiveMembership(items);
    setAdminNotice("Beiträge wurden aktualisiert.");
    setAdminEditor(null);
  };

  const addPriceTier = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("newName") ?? "").trim();
    if (!name) return;
    const item: PriceItem = {
      name,
      price: String(form.get("newPrice") ?? "").trim(),
      monthly: String(form.get("newMonthly") ?? "").trim(),
    };
    const items = [...liveMembership, item];
    const { error } = await supabase.from("club_content").upsert({ key: "membership", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Beitragsstufe konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveMembership(items); event.currentTarget.reset(); setAdminNotice(`„${name}“ wurde hinzugefügt.`);
  };

  const deletePriceTier = async (item: PriceItem) => {
    if (!supabase || !adminUserId || !window.confirm(`„${item.name}“ wirklich löschen?`)) return;
    const items = liveMembership.filter((price) => price !== item);
    const { error } = await supabase.from("club_content").upsert({ key: "membership", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    setLiveMembership(items); setAdminNotice(`„${item.name}“ wurde gelöscht.`);
  };

  const saveTeams = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveTeams.map((team, index) => ({
      name: String(form.get(`name-${index}`) ?? team.name).trim(),
      number: String(form.get(`number-${index}`) ?? team.number).trim(),
      text: String(form.get(`text-${index}`)),
      note: String(form.get(`note-${index}`)),
    }));
    const { error } = await supabase
      .from("club_content")
      .upsert({ key: "teams", value: { items }, updated_by: adminUserId });
    if (error) {
      setAdminNotice(
        `Mannschaften konnten nicht gespeichert werden: ${friendlyDbError(error)}`,
      );
      return;
    }
    setLiveTeams(items);
    setAdminNotice("Mannschaftsinformationen wurden aktualisiert.");
    setAdminEditor(null);
  };

  const addTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("newName") ?? "").trim();
    if (!name) return;
    const item: TeamGroup = {
      name,
      number: String(form.get("newNumber") ?? "").trim(),
      text: String(form.get("newText") ?? "").trim(),
      note: String(form.get("newNote") ?? "").trim(),
    };
    const items = [...liveTeams, item];
    const { error } = await supabase.from("club_content").upsert({ key: "teams", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Mannschaft konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveTeams(items); event.currentTarget.reset(); setAdminNotice(`„${name}“ wurde hinzugefügt.`);
  };

  const deleteTeam = async (item: TeamGroup) => {
    if (!supabase || !adminUserId || !window.confirm(`„${item.name}“ wirklich löschen?`)) return;
    const items = liveTeams.filter((team) => team !== item);
    const { error } = await supabase.from("club_content").upsert({ key: "teams", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    setLiveTeams(items); setAdminNotice(`„${item.name}“ wurde gelöscht.`);
  };

  const saveAccentPreset = async (accentColor: string) => {
    if (!supabase || !adminUserId) return;
    const nextTheme: SiteTheme = { ...liveSiteTheme, accentColor };
    const { error } = await supabase.from("club_content").upsert({
      key: "site_theme",
      value: { settings: nextTheme },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(`Farbe konnte nicht gespeichert werden: ${friendlyDbError(error)}`);
      return;
    }
    setLiveSiteTheme(nextTheme);
    setAdminNotice("Die neue Akzentfarbe ist für alle Besucher sichtbar.");
  };

  const saveCopyField = async (id: string, value: string) => {
    if (!supabase || !adminUserId) return;
    const nextCopy = { ...liveCopy, [id]: value };
    setLiveCopy(nextCopy);
    const { error } = await supabase.from("club_content").upsert({
      key: "site_copy",
      value: { texts: nextCopy },
      updated_by: adminUserId,
    });
    if (error) setAdminNotice(`Text konnte nicht gespeichert werden: ${friendlyDbError(error)}`);
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
      instagramUrl: String(form.get("instagramUrl") ?? liveClub.instagramUrl),
      facebookUrl: String(form.get("facebookUrl") ?? liveClub.facebookUrl),
      siteTitle: String(form.get("siteTitle") ?? liveClub.siteTitle),
      siteDescription: String(form.get("siteDescription") ?? liveClub.siteDescription),
      faviconUrl: liveClub.faviconUrl,
    };
    const { error } = await supabase.from("club_content").upsert({
      key: "club_settings",
      value: { settings },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(
        `Einstellungen konnten nicht gespeichert werden: ${friendlyDbError(error)}`,
      );
      return;
    }
    setLiveClub(settings);
    setAdminNotice("Website-Einstellungen wurden aktualisiert.");
    setAdminEditor(null);
  };

  const saveFormSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const settings: FormSettings = {
      contactFormEnabled: form.get("contactFormEnabled") === "on",
      partnerFormEnabled: form.get("partnerFormEnabled") === "on",
      pausedMessage: String(form.get("pausedMessage") ?? liveFormSettings.pausedMessage) || liveFormSettings.pausedMessage,
    };
    const { error } = await supabase.from("club_content").upsert({
      key: "form_settings",
      value: { settings },
      updated_by: adminUserId,
    });
    if (error) {
      setAdminNotice(`Formular-Einstellungen konnten nicht gespeichert werden: ${friendlyDbError(error)}`);
      return;
    }
    setLiveFormSettings(settings);
    setAdminNotice("Formular-Einstellungen wurden aktualisiert.");
  };

  const uploadFavicon = async (file: File) => {
    if (!supabase || !adminUserId) return;
    let url: string;
    try { url = await uploadClubMediaFile("site-images", file); }
    catch (error) { setAdminNotice(`Favicon-Upload fehlgeschlagen: ${(error as Error).message}`); return; }
    const settings: ClubSettings = { ...liveClub, faviconUrl: url };
    const { error } = await supabase.from("club_content").upsert({ key: "club_settings", value: { settings }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Favicon konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveClub(settings);
    setAdminNotice("Favicon wurde aktualisiert.");
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
      setAdminNotice(`Upload fehlgeschlagen: ${friendlyDbError(error)}`);
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
        `PDF wurde hochgeladen, aber nicht verknüpft: ${friendlyDbError(error)}`,
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
      setAdminNotice(`PDF konnte nicht entfernt werden: ${friendlyDbError(error)}`);
      return;
    }
    const match = item.file.match(
      /\/storage\/v1\/object\/public\/club-media\/(.+)$/,
    );
    if (match) await supabase.storage.from("club-media").remove([match[1]]);
    setLiveDownloads(items);
    setAdminNotice(`${item.title} wurde von der Website entfernt.`);
  };

  const savePartner = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const file = form.get("logo");
    if (!(file instanceof File) || file.size === 0 || !file.type.startsWith("image/")) {
      setAdminNotice("Bitte ein Bild als Partnerlogo auswählen.");
      return;
    }
    const path = `partners/${crypto.randomUUID()}-${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-")}`;
    const { error: uploadError } = await supabase.storage.from("club-media").upload(path, file, { upsert: false });
    if (uploadError) { setAdminNotice(`Logo-Upload fehlgeschlagen: ${uploadError.message}`); return; }
    const { data: publicUrl } = supabase.storage.from("club-media").getPublicUrl(path);
    const item: PartnerItem = { id: crypto.randomUUID(), name: String(form.get("name")).trim(), website: String(form.get("website")).trim(), logo: publicUrl.publicUrl, note: String(form.get("note") ?? "").trim() };
    const items = [...livePartners, item];
    const { error } = await supabase.from("club_content").upsert({ key: "partners", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Partner konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLivePartners(items); event.currentTarget.reset(); setAdminNotice(`${item.name} ist jetzt als Partner sichtbar.`);
  };

  const deletePartner = async (item: PartnerItem) => {
    if (!supabase || !adminUserId || !window.confirm(`${item.name} wirklich als Partner entfernen?`)) return;
    const items = livePartners.filter((partner) => partner.id !== item.id);
    const { error } = await supabase.from("club_content").upsert({ key: "partners", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Partner konnte nicht entfernt werden: ${friendlyDbError(error)}`); return; }
    const match = item.logo.match(/\/storage\/v1\/object\/public\/club-media\/(.+)$/);
    if (match) await supabase.storage.from("club-media").remove([match[1]]);
    setLivePartners(items); setAdminNotice(`${item.name} wurde entfernt.`);
  };

  const uploadClubMediaFile = async (folder: string, file: File) => {
    const path = `${folder}/${crypto.randomUUID()}-${file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "-")}`;
    const { error } = await supabase!.storage.from("club-media").upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase!.storage.from("club-media").getPublicUrl(path).data.publicUrl;
  };

  const removeClubMediaFile = async (url: string) => {
    const match = url.match(/\/storage\/v1\/object\/public\/club-media\/(.+)$/);
    if (match) await supabase!.storage.from("club-media").remove([match[1]]);
  };

  const reorderClubItems = async <T,>(
    key: string,
    items: T[],
    setItems: (items: T[]) => void,
    fromIndex: number,
    toIndex: number,
  ) => {
    if (!supabase || !adminUserId || fromIndex === toIndex) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    setItems(next);
    const { error } = await supabase.from("club_content").upsert({ key, value: { items: next }, updated_by: adminUserId });
    if (error) setAdminNotice(`Reihenfolge konnte nicht gespeichert werden: ${friendlyDbError(error)}`);
  };
  const reorderBoard = (from: number, to: number) => void reorderClubItems("board", liveBoard, setLiveBoard, from, to);
  const reorderTournaments = (from: number, to: number) => void reorderClubItems("tournaments", liveTournaments, setLiveTournaments, from, to);
  const reorderHistory = (from: number, to: number) => void reorderClubItems("history", liveHistory, setLiveHistory, from, to);
  const reorderFacilities = (from: number, to: number) => void reorderClubItems("facilities", liveFacilities, setLiveFacilities, from, to);
  const reorderTeams = (from: number, to: number) => void reorderClubItems("teams", liveTeams, setLiveTeams, from, to);
  const reorderPartners = (from: number, to: number) => void reorderClubItems("partners", livePartners, setLivePartners, from, to);
  const reorderDownloads = (from: number, to: number) => void reorderClubItems("downloads", liveDownloads, setLiveDownloads, from, to);

  // --- Vorstand ---------------------------------------------------------
  const saveBoard = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveBoard.map((member, index) => ({
      ...member,
      name: String(form.get(`name-${index}`) ?? member.name).trim(),
      role: String(form.get(`role-${index}`) ?? member.role).trim(),
    }));
    const { error } = await supabase.from("club_content").upsert({ key: "board", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Vorstand konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveBoard(items); setAdminNotice("Vorstand aktualisiert.");
  };

  const addBoardMember = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const name = String(form.get("newName") ?? "").trim();
    const role = String(form.get("newRole") ?? "").trim();
    if (!name || !role) return;
    const item: BoardMember = { id: crypto.randomUUID(), name, role, photo: "" };
    const items = [...liveBoard, item];
    const { error } = await supabase.from("club_content").upsert({ key: "board", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Vorstandsmitglied konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveBoard(items); event.currentTarget.reset(); setAdminNotice(`${name} wurde zum Vorstand hinzugefügt.`);
  };

  const uploadBoardPhoto = async (id: string, file: File) => {
    if (!supabase || !adminUserId) return;
    let url: string;
    try { url = await uploadClubMediaFile("board", file); }
    catch (error) { setAdminNotice(`Foto-Upload fehlgeschlagen: ${(error as Error).message}`); return; }
    const items = liveBoard.map((member) => (member.id === id ? { ...member, photo: url } : member));
    const { error } = await supabase.from("club_content").upsert({ key: "board", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Foto konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveBoard(items);
  };

  const deleteBoardMember = async (item: BoardMember) => {
    if (!supabase || !adminUserId || !window.confirm(`${item.name} wirklich aus dem Vorstand entfernen?`)) return;
    const items = liveBoard.filter((member) => member.id !== item.id);
    const { error } = await supabase.from("club_content").upsert({ key: "board", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht entfernt werden: ${friendlyDbError(error)}`); return; }
    if (item.photo) await removeClubMediaFile(item.photo);
    setLiveBoard(items); setAdminNotice(`${item.name} wurde entfernt.`);
  };

  // --- Turniere -----------------------------------------------------------
  const saveTournaments = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveTournaments.map((entry, index) => ({
      ...entry,
      date: String(form.get(`date-${index}`) ?? entry.date).trim(),
      month: String(form.get(`month-${index}`) ?? entry.month).trim().toUpperCase(),
      kicker: String(form.get(`kicker-${index}`) ?? entry.kicker).trim(),
      title: String(form.get(`title-${index}`) ?? entry.title).trim(),
      categories: allTournamentCategories.filter((category) => form.get(`category-${index}-${category}`) === "on"),
      endsAt: String(form.get(`endsAt-${index}`) ?? entry.endsAt),
      registrationEnabled: form.get(`registration-${index}`) === "on",
      admission: String(form.get(`admission-${index}`) ?? entry.admission).trim(),
      prizeMoney: String(form.get(`prizeMoney-${index}`) ?? entry.prizeMoney).trim(),
      venue: String(form.get(`venue-${index}`) ?? entry.venue).trim(),
      mapsUrl: String(form.get(`mapsUrl-${index}`) ?? entry.mapsUrl).trim(),
    }));
    const { error } = await supabase.from("club_content").upsert({ key: "tournaments", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Turniere konnten nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveTournaments(items); setAdminNotice("Turniere aktualisiert.");
  };

  const addTournament = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("newTitle") ?? "").trim();
    const endsAt = String(form.get("newEndsAt") ?? "");
    if (!title || !endsAt) return;
    const endsAtDate = new Date(endsAt);
    const item: Tournament = {
      id: crypto.randomUUID(),
      title,
      date: String(form.get("newDate") ?? "").trim() || String(endsAtDate.getDate()).padStart(2, "0"),
      month: (String(form.get("newMonth") ?? "").trim() || endsAtDate.toLocaleDateString("de-DE", { month: "short" })).toUpperCase(),
      kicker: String(form.get("newKicker") ?? "").trim(),
      categories: allTournamentCategories.filter((category) => form.get(`newCategory-${category}`) === "on"),
      endsAt: endsAtDate.toISOString(),
      registrationEnabled: form.get("newRegistration") === "on",
      admission: "",
      prizeMoney: "",
      venue: "",
      mapsUrl: "",
    };
    const items = [...liveTournaments, item];
    const { error } = await supabase.from("club_content").upsert({ key: "tournaments", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Turnier konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveTournaments(items); event.currentTarget.reset(); setAdminNotice(`„${title}“ wurde angelegt.`);
  };

  const deleteTournament = async (item: Tournament) => {
    if (!supabase || !adminUserId || !window.confirm(`„${item.title}“ wirklich entfernen?`)) return;
    const items = liveTournaments.filter((entry) => entry.id !== item.id);
    const { error } = await supabase.from("club_content").upsert({ key: "tournaments", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht entfernt werden: ${friendlyDbError(error)}`); return; }
    setLiveTournaments(items); setAdminNotice(`„${item.title}“ wurde entfernt.`);
  };

  // --- Vereinschronik -----------------------------------------------------
  const saveHistory = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveHistory.map((entry, index) => ({
      ...entry,
      year: String(form.get(`year-${index}`) ?? entry.year).trim(),
      title: String(form.get(`title-${index}`) ?? entry.title).trim(),
      label: String(form.get(`label-${index}`) ?? entry.label).trim(),
      text: String(form.get(`text-${index}`) ?? entry.text).trim(),
    }));
    const { error } = await supabase.from("club_content").upsert({ key: "history", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Chronik konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveHistory(items); setAdminNotice("Chronik aktualisiert.");
  };

  const addHistoryEvent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const year = String(form.get("newYear") ?? "").trim();
    const title = String(form.get("newTitle") ?? "").trim();
    if (!year || !title) return;
    const item: HistoryEvent = { id: crypto.randomUUID(), year, title, label: "", text: "", image: "" };
    const items = [...liveHistory, item].sort((a, b) => a.year.localeCompare(b.year));
    const { error } = await supabase.from("club_content").upsert({ key: "history", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Eintrag konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveHistory(items); event.currentTarget.reset(); setAdminNotice(`${year} wurde zur Chronik hinzugefügt.`);
  };

  const uploadHistoryImage = async (id: string, file: File) => {
    if (!supabase || !adminUserId) return;
    let url: string;
    try { url = await uploadClubMediaFile("history", file); }
    catch (error) { setAdminNotice(`Bild-Upload fehlgeschlagen: ${(error as Error).message}`); return; }
    const items = liveHistory.map((entry) => (entry.id === id ? { ...entry, image: url } : entry));
    const { error } = await supabase.from("club_content").upsert({ key: "history", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Bild konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveHistory(items);
  };

  const deleteHistoryEvent = async (item: HistoryEvent) => {
    if (!supabase || !adminUserId || !window.confirm(`„${item.year} · ${item.title}“ wirklich löschen?`)) return;
    const items = liveHistory.filter((entry) => entry.id !== item.id);
    const { error } = await supabase.from("club_content").upsert({ key: "history", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    if (item.image) await removeClubMediaFile(item.image);
    setLiveHistory(items); setAdminNotice(`Eintrag „${item.title}“ wurde gelöscht.`);
  };

  // --- Anlage-Bereiche ---------------------------------------------------
  const saveFacilities = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveFacilities.map((facility, index) => ({
      ...facility,
      number: String(form.get(`number-${index}`) ?? facility.number).trim(),
      title: String(form.get(`title-${index}`) ?? facility.title).trim(),
      eyebrow: String(form.get(`eyebrow-${index}`) ?? facility.eyebrow).trim(),
      text: String(form.get(`text-${index}`) ?? facility.text).trim(),
      action: String(form.get(`action-${index}`) ?? facility.action).trim(),
      href: String(form.get(`href-${index}`) ?? facility.href).trim(),
    }));
    const { error } = await supabase.from("club_content").upsert({ key: "facilities", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Anlage-Bereiche konnten nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveFacilities(items); setAdminNotice("Anlage-Bereiche aktualisiert.");
  };

  const addFacility = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("newTitle") ?? "").trim();
    if (!title) return;
    const item: FacilityItem = {
      id: crypto.randomUUID(),
      number: String(form.get("newNumber") ?? "").trim(),
      title,
      eyebrow: "",
      text: String(form.get("newText") ?? "").trim(),
      action: "Mehr erfahren",
      href: "/anlage",
      image: "",
    };
    const items = [...liveFacilities, item];
    const { error } = await supabase.from("club_content").upsert({ key: "facilities", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Bereich konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveFacilities(items); event.currentTarget.reset(); setAdminNotice(`„${title}“ wurde hinzugefügt.`);
  };

  const uploadFacilityImage = async (id: string, file: File) => {
    if (!supabase || !adminUserId) return;
    let url: string;
    try { url = await uploadClubMediaFile("facilities", file); }
    catch (error) { setAdminNotice(`Bild-Upload fehlgeschlagen: ${(error as Error).message}`); return; }
    const items = liveFacilities.map((facility) => (facility.id === id ? { ...facility, image: url } : facility));
    const { error } = await supabase.from("club_content").upsert({ key: "facilities", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Bild konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveFacilities(items);
  };

  const deleteFacility = async (item: FacilityItem) => {
    if (!supabase || !adminUserId || !window.confirm(`„${item.title}“ wirklich löschen?`)) return;
    const items = liveFacilities.filter((facility) => facility.id !== item.id);
    const { error } = await supabase.from("club_content").upsert({ key: "facilities", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    if (item.image) await removeClubMediaFile(item.image);
    setLiveFacilities(items); setAdminNotice(`„${item.title}“ wurde gelöscht.`);
  };

  const saveNavItems = async (items: NavItem[]) => {
    if (!supabase || !adminUserId) return;
    const { error } = await supabase.from("club_content").upsert({ key: "navigation", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Navigation konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveNavItems(items);
    setAdminNotice("Navigation aktualisiert.");
  };

  const reorderNavItems = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const items = [...liveNavItems];
    const [moved] = items.splice(fromIndex, 1);
    items.splice(toIndex, 0, moved);
    void saveNavItems(items);
  };

  const updateNavField = (id: string, field: "label" | "href", value: string) => {
    setLiveNavItems((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const toggleNavField = (id: string, field: "visible" | "primary") => {
    const items = liveNavItems.map((item) => (item.id === id ? { ...item, [field]: !item[field] } : item));
    if (field === "visible" && !items.some((item) => item.visible)) {
      setAdminNotice("Mindestens ein Navigationspunkt muss sichtbar bleiben.");
      return;
    }
    void saveNavItems(items);
  };

  const addNavItem = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const label = String(form.get("newLabel") ?? "").trim();
    const href = String(form.get("newHref") ?? "").trim();
    if (!label || !href) return;
    const item: NavItem = { id: crypto.randomUUID(), label, href, visible: true, primary: false };
    await saveNavItems([...liveNavItems, item]);
    event.currentTarget.reset();
  };

  const deleteNavItem = async (item: NavItem) => {
    if (!window.confirm(`„${item.label}“ wirklich aus der Navigation entfernen?`)) return;
    const items = liveNavItems.filter((entry) => entry.id !== item.id);
    if (!items.some((entry) => entry.visible)) {
      setAdminNotice("Mindestens ein Navigationspunkt muss übrig bleiben.");
      return;
    }
    await saveNavItems(items);
  };

  const normalizeSlug = (value: string) => {
    const stripped = value.trim().toLowerCase().normalize("NFD").split("").filter((ch) => ch.charCodeAt(0) < 0x0300 || ch.charCodeAt(0) > 0x036f).join("");
    return stripped.replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);
  };

  const saveCustomPages = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveCustomPages.map((page, index) => ({
      ...page,
      title: String(form.get(`title-${index}`) ?? page.title).trim(),
      eyebrow: String(form.get(`eyebrow-${index}`) ?? page.eyebrow).trim(),
      text: String(form.get(`text-${index}`) ?? page.text).trim(),
      body: String(form.get(`body-${index}`) ?? page.body),
      published: form.get(`published-${index}`) === "on",
    }));
    const { error } = await supabase.from("club_content").upsert({ key: "custom_pages", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Seiten konnten nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveCustomPages(items);
    setAdminNotice("Seiten aktualisiert.");
  };

  const addCustomPage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("newTitle") ?? "").trim();
    const requestedSlug = normalizeSlug(String(form.get("newSlug") ?? "") || title);
    if (!title || !requestedSlug) { setAdminNotice("Bitte Titel und eine gültige URL angeben."); return; }
    if (reservedSlugs.has(requestedSlug)) { setAdminNotice(`„/${requestedSlug}“ ist bereits eine feste Seite der Website. Bitte eine andere URL wählen.`); return; }
    if (liveCustomPages.some((page) => page.slug === requestedSlug)) { setAdminNotice(`„/${requestedSlug}“ gibt es schon. Bitte eine andere URL wählen.`); return; }
    const page: CustomPage = {
      id: crypto.randomUUID(),
      slug: requestedSlug,
      title,
      eyebrow: String(form.get("newEyebrow") ?? "").trim(),
      text: String(form.get("newText") ?? "").trim(),
      body: String(form.get("newBody") ?? "").trim(),
      image: "",
      published: false,
    };
    const items = [...liveCustomPages, page];
    const { error } = await supabase.from("club_content").upsert({ key: "custom_pages", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Seite konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveCustomPages(items);
    event.currentTarget.reset();
    setAdminNotice(`„${title}“ wurde als Entwurf angelegt. Unter /${requestedSlug} sichtbar, sobald „Veröffentlicht“ angehakt ist. Füge sie danach bei Bedarf zur Navigation hinzu.`);
  };

  const uploadCustomPageImage = async (id: string, file: File) => {
    if (!supabase || !adminUserId) return;
    let url: string;
    try { url = await uploadClubMediaFile("pages", file); }
    catch (error) { setAdminNotice(`Bild-Upload fehlgeschlagen: ${(error as Error).message}`); return; }
    const items = liveCustomPages.map((page) => (page.id === id ? { ...page, image: url } : page));
    const { error } = await supabase.from("club_content").upsert({ key: "custom_pages", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Bild konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveCustomPages(items);
  };

  const deleteCustomPage = async (page: CustomPage) => {
    if (!supabase || !adminUserId || !window.confirm(`„${page.title}“ (/${page.slug}) wirklich löschen? Menüpunkte, die darauf zeigen, führen danach ins Leere.`)) return;
    const items = liveCustomPages.filter((entry) => entry.id !== page.id);
    const { error } = await supabase.from("club_content").upsert({ key: "custom_pages", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    if (page.image) await removeClubMediaFile(page.image);
    setLiveCustomPages(items);
    setAdminNotice(`„${page.title}“ wurde gelöscht.`);
  };

  const saveCustomBlocks = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const items = liveCustomBlocks.map((block, index) => ({
      ...block,
      title: String(form.get(`title-${index}`) ?? block.title).trim(),
      text: String(form.get(`text-${index}`) ?? block.text).trim(),
    }));
    const { error } = await supabase.from("club_content").upsert({ key: "custom_blocks", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Zusatzblöcke konnten nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveCustomBlocks(items); setAdminNotice("Zusatzblöcke aktualisiert.");
  };

  const addCustomBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !adminUserId) return;
    const form = new FormData(event.currentTarget);
    const title = String(form.get("newTitle") ?? "").trim();
    if (!title) return;
    const block: CustomBlock = {
      id: crypto.randomUUID(),
      title,
      text: String(form.get("newText") ?? "").trim(),
      image: "",
    };
    const items = [...liveCustomBlocks, block];
    const { error } = await supabase.from("club_content").upsert({ key: "custom_blocks", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Block konnte nicht angelegt werden: ${friendlyDbError(error)}`); return; }
    setLiveCustomBlocks(items); event.currentTarget.reset(); setAdminNotice(`„${title}“ wurde hinzugefügt.`);
  };

  const uploadCustomBlockImage = async (id: string, file: File) => {
    if (!supabase || !adminUserId) return;
    let url: string;
    try { url = await uploadClubMediaFile("blocks", file); }
    catch (error) { setAdminNotice(`Bild-Upload fehlgeschlagen: ${(error as Error).message}`); return; }
    const items = liveCustomBlocks.map((block) => (block.id === id ? { ...block, image: url } : block));
    const { error } = await supabase.from("club_content").upsert({ key: "custom_blocks", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Bild konnte nicht gespeichert werden: ${friendlyDbError(error)}`); return; }
    setLiveCustomBlocks(items);
  };

  const deleteCustomBlock = async (item: CustomBlock) => {
    if (!supabase || !adminUserId || !window.confirm(`„${item.title}“ wirklich löschen?`)) return;
    const items = liveCustomBlocks.filter((block) => block.id !== item.id);
    const { error } = await supabase.from("club_content").upsert({ key: "custom_blocks", value: { items }, updated_by: adminUserId });
    if (error) { setAdminNotice(`Konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    if (item.image) await removeClubMediaFile(item.image);
    setLiveCustomBlocks(items); setAdminNotice(`„${item.title}“ wurde gelöscht.`);
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
        `Bild wurde hochgeladen, aber nicht gespeichert: ${friendlyDbError(error)}`,
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
        `Bild konnte nicht zurückgesetzt werden: ${friendlyDbError(error)}`,
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
        `Mannschaftsfoto konnte nicht hochgeladen werden: ${friendlyDbError(error)}`,
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

  const mediaLibraryFolders = ["library", "news", "downloads", "partners", "board", "history", "facilities", "blocks", "site-images", "teams"];

  const loadMediaLibrary = async () => {
    if (!supabase) return;
    setMediaLibraryLoading(true);
    const usedUrls = new Set<string>([
      ...liveBoard.map((item) => item.photo),
      ...liveHistory.map((item) => item.image),
      ...liveFacilities.map((item) => item.image),
      ...liveCustomBlocks.map((item) => item.image),
      ...livePartners.map((item) => item.logo),
      ...liveDownloads.map((item) => item.file),
      ...liveTeamGallery.map((item) => item.image),
      ...allPublishedNews.map((item) => item.image_path ?? ""),
      ...Object.values(liveSiteImages),
    ].filter(Boolean));
    const entries: MediaEntry[] = [];
    for (const folder of mediaLibraryFolders) {
      const { data } = await supabase.storage.from("club-media").list(folder, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
      for (const file of data ?? []) {
        if (file.name === ".emptyFolderPlaceholder") continue;
        const path = `${folder}/${file.name}`;
        const { data: urlData } = supabase.storage.from("club-media").getPublicUrl(path);
        entries.push({ folder, name: file.name, path, url: urlData.publicUrl, inUse: usedUrls.has(urlData.publicUrl) });
      }
    }
    setMediaLibraryFiles(entries);
    setMediaLibraryLoading(false);
  };

  const deleteMediaLibraryFile = async (entry: MediaEntry) => {
    if (!supabase) return;
    const warning = entry.inUse
      ? `„${entry.name}“ wird aktuell auf der Website verwendet. Wirklich löschen? Die Stelle, die dieses Bild nutzt, zeigt danach kein Bild mehr.`
      : `„${entry.name}“ wirklich endgültig löschen?`;
    if (!window.confirm(warning)) return;
    const { error } = await supabase.storage.from("club-media").remove([entry.path]);
    if (error) { setAdminNotice(`Datei konnte nicht gelöscht werden: ${friendlyDbError(error)}`); return; }
    setMediaLibraryFiles((files) => files.filter((file) => file.path !== entry.path));
    setAdminNotice(`„${entry.name}“ wurde gelöscht.`);
  };

  const uploadToMediaLibrary = async (file: File) => {
    if (!supabase) return;
    try {
      await uploadClubMediaFile("library", file);
    } catch (error) {
      setAdminNotice(`Upload fehlgeschlagen: ${(error as Error).message}`);
      return;
    }
    setAdminNotice(`„${file.name}“ wurde in die Mediathek hochgeladen.`);
    await loadMediaLibrary();
  };

  const deleteMedia = async (name: string) => {
    if (!supabase || !window.confirm(`Bild ${name} wirklich löschen?`)) return;
    const { error } = await supabase.storage
      .from("club-media")
      .remove([`news/${name}`]);
    if (error) {
      setAdminNotice(`Bild konnte nicht gelöscht werden: ${friendlyDbError(error)}`);
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
        `Änderung konnte nicht zurückgesetzt werden: ${friendlyDbError(error)}`,
      );
      return;
    }
    setAdminNotice("Änderung wurde zurückgesetzt.");
    await loadAudit();
  };

  const resetSiteTheme = async () => {
    if (
      !supabase ||
      adminEmail !== OWNER_EMAIL ||
      !window.confirm(
        "Alle KI-Designänderungen wirklich auf den fest eingebauten TCT-Standard zurücksetzen?",
      )
    )
      return;
    const { data, error } = await supabase.functions.invoke("club-ai", {
      body: { mode: "reset_theme" },
    });
    if (error || data?.error) {
      setAdminNotice(
        data?.error ??
          `Design konnte nicht zurückgesetzt werden: ${error?.message ?? "Unbekannter Fehler"}`,
      );
      return;
    }
    setLiveSiteTheme(normalizeSiteTheme(data.theme));
    setAdminNotice("Das Website-Design entspricht wieder vollständig dem TCT-Standard.");
  };

  if (!isKnownPath && !customPage) {
    return (
      <main className="not-found-page">
        <div className="container">
          <p className="eyebrow">
            <span /> Fehler 404
          </p>
          <h1>Seite nicht gefunden.</h1>
          <p>
            Die aufgerufene Seite gibt es nicht (mehr). Vielleicht hilft dir
            einer dieser Links weiter.
          </p>
          <div className="not-found-actions">
            <a className="button button-light" href="/">
              Zur Startseite <ArrowRight size={17} />
            </a>
            <a className="button button-outline" href="/kontakt">
              Kontakt aufnehmen
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <SiteCopyContext.Provider value={{ copy: liveCopy, editMode, save: saveCopyField }}>
    <main className={`${isBookingPage ? "booking-page" : isTournamentContactPage ? "tournament-contact-page" : ""} ${sectionPage || customPage ? "section-page" : ""}`}>
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
        reorder={reorderDownloads}
      />
      <PartnerManager
        open={adminEditor === "partners" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={livePartners}
        save={(event) => void savePartner(event)}
        remove={(item) => void deletePartner(item)}
        reorder={reorderPartners}
      />
      <BoardManager
        open={adminEditor === "board" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveBoard}
        saveAll={(event) => void saveBoard(event)}
        addOne={(event) => void addBoardMember(event)}
        remove={(item) => void deleteBoardMember(item)}
        uploadPhoto={(id, file) => void uploadBoardPhoto(id, file)}
        reorder={reorderBoard}
      />
      <TournamentManager
        open={adminEditor === "tournaments" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveTournaments}
        saveAll={(event) => void saveTournaments(event)}
        addOne={(event) => void addTournament(event)}
        remove={(item) => void deleteTournament(item)}
        reorder={reorderTournaments}
      />
      <HistoryManager
        open={adminEditor === "history" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveHistory}
        saveAll={(event) => void saveHistory(event)}
        addOne={(event) => void addHistoryEvent(event)}
        remove={(item) => void deleteHistoryEvent(item)}
        uploadImage={(id, file) => void uploadHistoryImage(id, file)}
        reorder={reorderHistory}
      />
      <FacilityManager
        open={adminEditor === "facilities" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveFacilities}
        saveAll={(event) => void saveFacilities(event)}
        addOne={(event) => void addFacility(event)}
        remove={(item) => void deleteFacility(item)}
        uploadImage={(id, file) => void uploadFacilityImage(id, file)}
        reorder={reorderFacilities}
      />
      <CustomBlockManager
        open={adminEditor === "blocks" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveCustomBlocks}
        saveAll={(event) => void saveCustomBlocks(event)}
        addOne={(event) => void addCustomBlock(event)}
        remove={(item) => void deleteCustomBlock(item)}
        uploadImage={(id, file) => void uploadCustomBlockImage(id, file)}
      />
      <NavigationManager
        open={adminEditor === "navigation" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveNavItems}
        reorder={reorderNavItems}
        updateField={updateNavField}
        commit={() => void saveNavItems(liveNavItems)}
        toggleField={toggleNavField}
        addOne={(event) => void addNavItem(event)}
        remove={(item) => void deleteNavItem(item)}
      />
      <CustomPageManager
        open={adminEditor === "pages" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        items={liveCustomPages}
        saveAll={(event) => void saveCustomPages(event)}
        addOne={(event) => void addCustomPage(event)}
        remove={(item) => void deleteCustomPage(item)}
        uploadImage={(id, file) => void uploadCustomPageImage(id, file)}
      />
      <FormsManager
        open={adminEditor === "forms" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        settings={liveFormSettings}
        save={(event) => void saveFormSettings(event)}
      />
      <MediaLibraryManager
        open={adminEditor === "mediaLibrary" && canManageGeneralContent}
        close={() => setAdminEditor(null)}
        files={mediaLibraryFiles}
        loading={mediaLibraryLoading}
        onOpen={() => void loadMediaLibrary()}
        refresh={() => void loadMediaLibrary()}
        remove={(entry) => void deleteMediaLibraryFile(entry)}
        upload={(file) => void uploadToMediaLibrary(file)}
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
        moveToNews={() => void moveFeaturedToNews()}
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
        themeChanged={(theme) => setLiveSiteTheme(normalizeSiteTheme(theme))}
      />
      <Suspense fallback={null}>
        <BookingAdmin
          open={adminEditor === "booking" && canManageBooking}
          close={() => setAdminEditor(null)}
        />
      </Suspense>
      <a className="skip-link" href="#content">
        Zum Inhalt springen
      </a>
      <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
        <a
          className="brand logo-brand"
          href={isFocusedPage ? "/" : "#top"}
          aria-label="TCT 1888 Startseite"
        >
          <img src={liveSiteImages.logo} alt="TCT 1888" />
        </a>
        <nav className="desktop-nav" aria-label="Hauptnavigation">
          {liveNavItems.filter((item) => item.visible && item.primary).map((item) => (
            <a key={item.id} href={isFocusedPage && item.href.startsWith("#") ? `/${item.href}` : item.href}>
              {item.label}
            </a>
          ))}
          {liveNavItems.some((item) => item.visible && !item.primary) && (
            <details className="desktop-nav-more">
              <summary>Mehr</summary>
              <div>
                {liveNavItems.filter((item) => item.visible && !item.primary).map((item) => (
                  <a key={item.id} href={item.href}>{item.label}</a>
                ))}
              </div>
            </details>
          )}
        </nav>
        <a className="mobile-header-title" href="/" aria-label="Tennisclub Trier Startseite">
          <span>Tennisclub <em>Trier.</em></span>
          <small>1888 e.V.</small>
        </a>
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

      {pageInfo && sectionPage && (
        <section className="section-page-hero" aria-labelledby="section-page-title">
          <div className="container">
            <p className="eyebrow"><span /> <EditableText id={`page.${sectionPage}.eyebrow`} defaultValue={pageInfo.eyebrow} /></p>
            <h1 id="section-page-title"><EditableText id={`page.${sectionPage}.title`} defaultValue={pageInfo.title} /><br /><em><EditableText id={`page.${sectionPage}.accent`} defaultValue={pageInfo.accent} /></em></h1>
            <p><EditableText id={`page.${sectionPage}.text`} as="span" defaultValue={pageInfo.text} /></p>
          </div>
        </section>
      )}
      {customPage && (
        <section className="section-page-hero" aria-labelledby="section-page-title">
          <div className="container">
            <p className="eyebrow"><span /> {customPage.eyebrow}</p>
            <h1 id="section-page-title">{customPage.title}</h1>
            <p>{customPage.text}</p>
          </div>
        </section>
      )}

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
            <span /> <EditableText id="hero.eyebrow" defaultValue="Tennisclub Trier · seit 1888" />
          </p>
          <h1 id="hero-title">
            <span><EditableText id="hero.title" defaultValue="Hier spielt" /></span>
            <em><EditableText id="hero.titleAccent" defaultValue="Trier." /></em>
          </h1>
          <div className="hero-bottom">
            <p>
              <EditableText
                id="hero.lead"
                as="span"
                defaultValue="Leistungsorientiertes Tennis, freundliches Miteinander und eine besondere Anlage am Moselstadion."
              />
            </p>
            <div className="hero-ctas">
              <a className="button button-light" href="/mitglied-werden">
                <EditableText id="hero.cta1" defaultValue="Mitglied werden" /> <ArrowRight size={18} />
              </a>
              <a className="button button-outline hero-discover" href="/club">
                <EditableText id="hero.cta2" defaultValue="Entdecke den Club" /> <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </div>
        <a
          className="scroll-cue"
          href="#aktuell"
          aria-label="Zum nächsten Abschnitt scrollen"
        >
          <span><EditableText id="hero.scrollCue" defaultValue="Scroll to play" /></span>
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

      <div id="content" className={`content-route ${isHomePage ? "route-home" : sectionPage ? `route-${sectionPage}` : customPage ? "route-custom-page" : ""}`}>
        {customPage && (
          <section className="section custom-page-section route-custom-page" id="custom-page">
            <div className="container custom-page-body">
              {customPage.image && <img className="custom-page-image" src={customPage.image} alt={customPage.title} />}
              {customPage.body && customPage.body.split("\n").filter(Boolean).map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          </section>
        )}
        <section className="section current route-home" id="aktuell">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="home.focus.eyebrow" defaultValue="Im Fokus" />
              </p>
              <a className="text-link" href="/turniere">
                <EditableText id="home.focus.link" defaultValue="Alle Termine" /> <ArrowRight size={17} />
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
                  {featuredContent.kind === "event" &&
                    featuredContent.venueAddress && (
                      <a
                        href={eventMapsUrl(featuredContent.venueAddress)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${featuredContent.venueName ?? "Veranstaltungsort"} in Google Maps öffnen`}
                      >
                        <MapPin size={17} />
                        {featuredContent.venueName
                          ? `${featuredContent.venueName} · `
                          : ""}
                        {featuredContent.venueAddress}
                      </a>
                    )}
                  {featuredContent.kind === "event" &&
                    featuredContent.spectatorsAllowed && (
                      <span>
                        <Euro size={17} />
                        {featuredContent.admissionLabel ??
                          eventAdmissionLabel(
                            featuredContent.admissionPriceCents,
                          )}
                      </span>
                    )}
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

        <section className="section club-intro route-club" id="verein">
          <div className="container intro-grid motion">
            <p className="eyebrow">
              <span /> <EditableText id="home.clubIntro.eyebrow" defaultValue="Der Club" />
            </p>
            <div>
              <h2>
                <EditableText id="home.clubIntro.title" defaultValue="Mehr als ein" />
                <br />
                <em><EditableText id="home.clubIntro.titleAccent" defaultValue="Aufschlag." /></em>
              </h2>
              <p className="lead">
                <EditableText
                  id="home.clubIntro.lead"
                  as="span"
                  defaultValue="Ein Club für Menschen, die Tennis lieben — ganz gleich, ob sie einsteigen, trainieren oder sich sportlich messen möchten."
                />
              </p>
              <div
                className="club-members"
                aria-label="Mehr als 600 Mitglieder"
              >
                <span className="club-member-orbit" aria-hidden="true"><i /></span>
                <div>
                  <b>600<sup>+</sup></b>
                  <p><EditableText id="home.clubIntro.membersLabel1" defaultValue="Mitglieder" /><br /><EditableText id="home.clubIntro.membersLabel2" defaultValue="im TCT" /></p>
                </div>
                <small><EditableText id="home.clubIntro.membersCaption1" defaultValue="Gemeinsam" /><br /><EditableText id="home.clubIntro.membersCaption2" defaultValue="auf dem Platz" /></small>
              </div>
              <a className="text-link" href="/club#geschichte">
                <EditableText id="home.clubIntro.link" defaultValue="Unsere Geschichte" /> <ArrowRight size={17} />
              </a>
            </div>
            <aside className="club-stamp">
              <span><EditableText id="home.clubIntro.stamp1" defaultValue="TRADITION" /></span>
              <b>{traditionYears}</b>
              <span><EditableText id="home.clubIntro.stamp2" defaultValue="JAHRE · SEIT 1888" /></span>
            </aside>
          </div>
        </section>

        <section className="quick-links route-home" aria-labelledby="quick-links-title">
          <div className="container">
            <div className="quick-links-heading">
              <p className="eyebrow">
                <span /> <EditableText id="home.quickLinks.eyebrow" defaultValue="Direkt zum Ziel" />
              </p>
              <h2 id="quick-links-title"><EditableText id="home.quickLinks.title" defaultValue="Was möchtest du machen?" /></h2>
            </div>
            <div className="quick-links-grid">
              <a href="/mitglied-werden">
                <span>01</span>
                <div>
                  <h3><EditableText id="home.quickLinks.card1.title" defaultValue="Mitglied werden" /></h3>
                  <p><EditableText id="home.quickLinks.card1.text" defaultValue="Beiträge ansehen und Aufnahme beantragen." /></p>
                </div>
                <ArrowRight size={20} />
              </a>
              <a href="/booking">
                <span>02</span>
                <div>
                  <h3><EditableText id="home.quickLinks.card2.title" defaultValue="Platz buchen" /></h3>
                  <p><EditableText id="home.quickLinks.card2.text" defaultValue="Freie Plätze sehen und direkt reservieren." /></p>
                </div>
                <ArrowRight size={20} />
              </a>
              <a href="/teams">
                <span>03</span>
                <div>
                  <h3><EditableText id="home.quickLinks.card3.title" defaultValue="Teams entdecken" /></h3>
                  <p><EditableText id="home.quickLinks.card3.text" defaultValue="Alle Damen-, Herren- und Jugendteams." /></p>
                </div>
                <ArrowRight size={20} />
              </a>
              <a href="/kontakt">
                <span>04</span>
                <div>
                  <h3><EditableText id="home.quickLinks.card4.title" defaultValue="Kontakt aufnehmen" /></h3>
                  <p><EditableText id="home.quickLinks.card4.text" defaultValue="Fragen stellen oder den Club kennenlernen." /></p>
                </div>
                <ArrowRight size={20} />
              </a>
            </div>
          </div>
        </section>

        {liveCustomBlocks.length > 0 && (
          <section className="section custom-blocks-section route-home">
            <div className="container">
              <div className="custom-blocks-grid motion">
                {liveCustomBlocks.map((block) => (
                  <article className="custom-block-card" key={block.id}>
                    {block.image && <img loading="lazy" src={block.image} alt={block.title} />}
                    <h3>{block.title}</h3>
                    {block.text && <p>{block.text}</p>}
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="section facilities route-home route-anlage" id="anlage">
          <div className="container">
            <div className="section-head inverse">
              <p className="eyebrow">
                <span /> <EditableText id="anlage.intro.eyebrow" defaultValue="Unsere Anlage" />
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
                {liveFacilities.filter((item) => item.number).map((item, index) => (
                  <article className="facility-item" key={item.id}>
                    <span className="facility-index">0{index + 1}</span>
                    <b>{item.number}</b>
                    <div>
                      <h3>{item.title}</h3>
                      <p>{item.text}</p>
                    </div>
                    <ChevronRight size={21} />
                  </article>
                ))}
                <a
                  className="button button-outline"
                  href="/booking"
                >
                  <EditableText id="anlage.bookCta" defaultValue="Jetzt Platz buchen" /> <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>

        {isBookingPage && (
          <Suspense fallback={<p className="lazy-loading">Lädt …</p>}>
            <BookingPortal
              userId={adminUserId}
              defaultEmail={adminEmail ?? ""}
              onRequireLogin={() => {
                setAuthMode("login");
                setAdminNotice("");
                setAdminPanel("login");
              }}
            />
          </Suspense>
        )}
        {currentPath === "/spielpartner" && (
          <Suspense fallback={<p className="lazy-loading">Lädt …</p>}>
            <PartnerBoard
              userId={adminUserId}
              defaultEmail={adminEmail ?? ""}
              displayName={adminName}
              onRequireLogin={() => {
                setAuthMode("login");
                setAdminNotice("");
                setAdminPanel("login");
              }}
            />
          </Suspense>
        )}

        <section className="section experience-section route-anlage">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="anlage.experience.eyebrow" defaultValue="Vier Perspektiven" />
              </p>
              <p className="section-note"><EditableText id="anlage.experience.note" defaultValue="Dein Club, dein Spiel." /></p>
            </div>
            <div className="experience-grid motion">
              {liveFacilities.map((item, index) => (
                <article
                  className={`experience-card experience-${index + 1}`}
                  key={item.id}
                >
                  {item.image && <img src={item.image} alt={item.title} />}
                  <div className="experience-shade" />
                  <div className="experience-content">
                    <p className="kicker">{item.eyebrow}</p>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <a href={item.href || "/booking"}>
                      {item.action || "Mehr erfahren"} <ArrowRight size={17} />
                    </a>
                  </div>
                  <span className="experience-index">0{index + 1}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section teams-section route-teams" id="mannschaften">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="teams.intro.eyebrow" defaultValue="Mannschaften" />
              </p>
              <a
                className="text-link"
                href="https://www.rlp-tennis.de/"
                target="_blank"
                rel="noreferrer"
              >
                <EditableText id="teams.intro.link" defaultValue="Alle Tabellen" /> <ExternalArrow />
              </a>
            </div>
            <div className="teams-layout motion">
              <div>
                <p className="team-count">
                  40 <span><EditableText id="teams.intro.countLabel" defaultValue="Mannschaften" /></span>
                </p>
                <h2>
                  <EditableText id="teams.intro.title" defaultValue="Gemeinsam" />
                  <br />
                  <em><EditableText id="teams.intro.titleAccent" defaultValue="antreten." /></em>
                </h2>
                <p className="team-intro">
                  <EditableText
                    id="teams.intro.text"
                    as="span"
                    defaultValue="Die Mannschaften des TCT repräsentieren den Club auf den Plätzen der Region."
                  />
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
                  <p className="kicker"><EditableText id="teams.panel.kicker" defaultValue="TCT MANNSCHAFTEN" /></p>
                  <h3>{liveTeams[teamGroup].name}</h3>
                  <p>{liveTeams[teamGroup].text}</p>
                  <div className="team-note">{liveTeams[teamGroup].note}</div>
                  <a
                    href="https://www.rlp-tennis.de/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <EditableText id="teams.panel.link" defaultValue="Zu den Tabellen" /> <ArrowRight size={18} />
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

        <section className="section official-teams-section route-teams">
          <div className="container official-teams-card motion">
            <div>
              <p className="eyebrow">
                <span /> <EditableText id="teams.official.eyebrow" defaultValue="Offizielle Mannschaftsdaten" />
              </p>
              <h2>
                <EditableText id="teams.official.title" defaultValue="Spieler, Spiele" />
                <br />
                <EditableText id="teams.official.titleMid" defaultValue="und" /> <em><EditableText id="teams.official.titleAccent" defaultValue="Tabellen." /></em>
              </h2>
              <p>
                <EditableText
                  id="teams.official.text"
                  as="span"
                  defaultValue="Die vollständigen Meldelisten, Spielpläne und aktuellen Tabellenstände werden direkt vom Tennisverband Rheinland-Pfalz geführt."
                />
              </p>
            </div>
            <a
              className="button button-light"
              href={officialLinks.teams}
              target="_blank"
              rel="noreferrer"
            >
              <EditableText id="teams.official.link" defaultValue="Zu allen Mannschaften" /> <ExternalArrow />
            </a>
          </div>
        </section>

        <section className="section timeline route-club" id="geschichte">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="club.history.eyebrow" defaultValue="Seit Generationen" />
              </p>
              <p className="section-note">
                <EditableText id="club.history.note" defaultValue="Vier Kapitel. Eine gemeinsame Geschichte." />
              </p>
            </div>
            <h2>
              <EditableText id="club.history.title" defaultValue="Eine Geschichte," />
              <br />
              <em><EditableText id="club.history.titleAccent" defaultValue="die weiter spielt." /></em>
            </h2>
            <div className="history-grid motion">
              {liveHistory.map((entry) => (
                <article key={entry.id} className="history-card">
                  {entry.image && (
                    <img
                      loading="lazy"
                      src={entry.image}
                      alt="Historisches Motiv des Tennisclub Trier"
                    />
                  )}
                  <div className="history-card-shade" />
                  <div className="history-card-content">
                    <p>{entry.label}</p>
                    <span>{entry.year}</span>
                    <h3>{entry.title}</h3>
                    <small>{entry.text}</small>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section school route-home route-anlage" id="tennisschule">
          <div className="school-image">
            <img src={liveSiteImages.school} alt="Kinder beim Tennistraining" />
          </div>
          <div className="school-copy motion">
            <p className="eyebrow">
              <span /> <EditableText id="school.eyebrow" defaultValue="Tennisschule Point" />
            </p>
            <h2>
              <EditableText id="school.title" defaultValue="Dein Spiel." />
              <br />
              <em><EditableText id="school.titleAccent" defaultValue="Dein Tempo." /></em>
            </h2>
            <p>
              <EditableText
                id="school.text"
                as="span"
                defaultValue="Trainingsangebote für unterschiedliche Altersbereiche und Leistungsniveaus — vom Einstieg bis zum leistungsorientierten Tennis."
              />
            </p>
            <a
              className="button button-dark"
              href="mailto:mgtrier@t-online.de?subject=Tennistraining%20beim%20TCT"
            >
              <EditableText id="school.cta" defaultValue="Training anfragen" /> <ExternalArrow />
            </a>
          </div>
        </section>

        <section className="section tournaments route-turniere" id="turniere">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="tournaments.eyebrow" defaultValue="Aufschlag für 2026" />
              </p>
              <p className="section-note"><EditableText id="tournaments.note" defaultValue="Offizielle Turnierübersicht" /></p>
            </div>
            <div className="tournament-head">
              <h2>
                <EditableText id="tournaments.title" defaultValue="Der Kalender" />
                <br />
                <em><EditableText id="tournaments.titleAccent" defaultValue="des Spiels." /></em>
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
                shownTournaments.map((event) => {
                  const ended = tournamentIsEnded(event);
                  const content = <><span className="date">{event.date} <small>{event.month}</small></span><div><p className="kicker">{ended ? "BEENDET" : event.kicker}</p><h3>{event.title}</h3>{event.admission && !ended && <p className="tournament-entry-price">Mo–Fr Eintritt frei · Wochenende kostenpflichtig</p>}</div></>;
                  return ended ? <article className="tournament-entry is-ended" key={event.id}>{content}<span className="tournament-ended-label">Abgeschlossen</span></article> : <button className="tournament-entry" type="button" key={event.id} onClick={() => setSelectedTournament(event)}>{content}<ArrowRight size={22} /></button>;
                })
              ) : (
                <p className="tournament-empty">
                  Für diese Kategorie sind aktuell keine bestätigten Termine
                  veröffentlicht.
                </p>
              )}
            </div>
            {liveEvents.length > 0 && (
              <div className="live-events">
                {liveEvents.map((event) => {
                  const ended = eventIsEnded(event);
                  const content = <><p className="kicker">{ended ? "BEENDET" : event.category ?? "CLUB TERMIN"}</p><h3>{event.title}</h3><p>{event.starts_at ? new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.starts_at)) : "Datum folgt"}</p>{event.description && <span>{event.description}</span>}{event.spectators_allowed && <span className="live-event-admission"><Euro size={14} /> {eventAdmissionLabel(event.admission_price_cents)}</span>}{event.venue_address && <span className="live-event-venue"><MapPin size={14} /> {event.venue_name ? `${event.venue_name} · ` : ""}{event.venue_address}</span>}{!ended && <b>{event.registration_enabled ? "Frage / Anmeldung" : "Frage zum Turnier"} <ArrowRight size={16} /></b>}</>;
                  if (ended) return <article className="is-ended" key={event.id}>{content}</article>;
                  return <article className="live-event-card" key={event.id}><a className="live-event-link" href={`/turnier-anmeldung?turnier=${encodeURIComponent(event.title)}&anmeldung=${event.registration_enabled ? "1" : "0"}`}>{content}</a>{event.venue_address && <a className="live-event-maps" href={eventMapsUrl(event.venue_address)} target="_blank" rel="noreferrer"><MapPin size={15} /> Route in Google Maps <ArrowRight size={14} /></a>}</article>;
                })}
              </div>
            )}
          </div>
        </section>

        <section className="section tournament-contact-section" id="turnier-anmeldung">
          <div className="container tournament-contact-grid">
            <div>
              <p className="eyebrow"><span /> <EditableText id="tournamentContact.eyebrow" defaultValue="Turnier-Service" /></p>
              <h1><EditableText id="tournamentContact.title" defaultValue="Fragen." /><br /><em><EditableText id="tournamentContact.titleAccent" defaultValue="Anmelden." /></em></h1>
              <p className="tournament-contact-lead">Für <strong>{selectedTournamentTitle}</strong>. Deine Nachricht geht direkt an die zuständige Turnierleitung.</p>
              <a className="text-link" href="/#turniere">Zur Turnierübersicht <ArrowLeft size={17} /></a>
            </div>
            <form className="tournament-contact-form" onSubmit={submitTournamentInquiry}>
              {tournamentFormSent ? <div className="tournament-contact-success"><Check size={30} /><h2>Gesendet.</h2><p>Danke! Die Turnierleitung meldet sich bei dir per E-Mail.</p></div> : <>
                <p className="kicker">DEINE ANFRAGE</p>
                <label>Anliegen<select name="inquiryType" defaultValue="question"><option value="question">Frage zum Turnier</option>{registrationAllowed && <option value="registration">Anmeldung / Teilnahme</option>}</select></label>
                <input type="text" name="website" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <label>Name<input required name="name" minLength={2} maxLength={120} autoComplete="name" placeholder="Vor- und Nachname" /></label>
                <label>E-Mail<input required name="email" type="email" autoComplete="email" placeholder="name@beispiel.de" /></label>
                <label>Nachricht <small>{registrationAllowed ? "optional bei einer Anmeldung" : "Die Turnierleitung meldet sich bei dir."}</small><textarea name="message" rows={5} maxLength={4000} placeholder={registrationAllowed ? "Frage, Altersklasse, LK oder weitere Hinweise …" : "Deine Frage zum Turnier …"} /></label>
                {tournamentFormError && <p className="form-error">{tournamentFormError}</p>}
                <button className="button button-light" type="submit">Anfrage senden <ArrowRight size={17} /></button>
              </>}
            </form>
          </div>
        </section>

        {selectedTournament && (
          <div className="tournament-detail-backdrop route-turniere" role="dialog" aria-modal="true" aria-label="Turnierdetails">
            <article className="tournament-detail-card">
              <button className="admin-close" onClick={() => setSelectedTournament(null)} aria-label="Turnierdetails schließen"><X size={23} /></button>
              <p className="eyebrow"><span /> {selectedTournament.kicker}</p>
              <p className="tournament-detail-date">{selectedTournament.date} {selectedTournament.month} 2026</p>
              <h2>{selectedTournament.title}</h2>
              <p>{selectedTournament.registrationEnabled ? "Fragen stellen oder direkt für das Turnier anmelden – die Turnierleitung erhält deine Anfrage getrennt vom normalen Kontakt-Postfach." : "Fragen zur Veranstaltung gehen direkt an die zuständige Turnierleitung. Eine Anmeldung über die Website ist für dieses Turnier nicht freigeschaltet."}</p>
              {(selectedTournament.admission || selectedTournament.prizeMoney || selectedTournament.venue) && (
                <div className="tournament-detail-facts">
                  {selectedTournament.admission && (
                    <div><small>EINTRITT</small><strong>{selectedTournament.admission}</strong></div>
                  )}
                  {selectedTournament.prizeMoney && (
                    <div><small>PREISGELD</small><strong>{selectedTournament.prizeMoney}</strong></div>
                  )}
                  {selectedTournament.venue && selectedTournament.mapsUrl && (
                    <a href={selectedTournament.mapsUrl} target="_blank" rel="noreferrer">
                      <MapPin size={18} />
                      <span><small>AUSTRAGUNGSORT · GOOGLE MAPS</small><strong>{selectedTournament.venue}</strong></span>
                      <ArrowRight size={18} />
                    </a>
                  )}
                </div>
              )}
              <a className="button button-light" href={`/turnier-anmeldung?turnier=${encodeURIComponent(selectedTournament.title)}&anmeldung=${selectedTournament.registrationEnabled ? "1" : "0"}`} onClick={() => setSelectedTournament(null)}>{selectedTournament.registrationEnabled ? "Frage / Anmeldung" : "Frage zum Turnier"} <ArrowRight size={17} /></a>
            </article>
          </div>
        )}

        {liveNews.length > 0 && (
          <section className="section news-section route-news">
            <div className="container">
              <div className="section-head">
                <p className="eyebrow">
                  <span /> <EditableText id="news.eyebrow" defaultValue="Aktuelles" />
                </p>
                <button
                  className="text-link archive-trigger"
                  onClick={() => void loadNewsArchive()}
                >
                  <EditableText id="news.link" defaultValue="Alle News" /> <ArrowRight size={17} />
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
                        <img src={news.image_path} alt={news.title} />
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

        <section className="section legacy-news-section route-news" id="news-archiv">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="newsArchive.eyebrow" defaultValue="Seit 2021" />
              </p>
              <button
                className="text-link archive-trigger"
                onClick={() => void loadNewsArchive()}
              >
                <EditableText id="newsArchive.link" defaultValue="Alle Artikel öffnen" /> <ArrowRight size={17} />
              </button>
            </div>
            <h2>
              <EditableText id="newsArchive.title" defaultValue="Vereins-" />
              <br />
              <em><EditableText id="newsArchive.titleAccent" defaultValue="archiv." /></em>
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

        <section className="section membership route-mitglied-werden" id="mitgliedschaft">
          <div className="container membership-grid motion">
            <div className="membership-copy">
              <p className="eyebrow">
                <span /> <EditableText id="membership.eyebrow" defaultValue="Mitglied werden" />
              </p>
              <h2>
                <EditableText id="membership.title" defaultValue="Dein Platz" />
                <br />
                <EditableText id="membership.titleMid" defaultValue="im" /> <em><EditableText id="membership.titleAccent" defaultValue="Club." /></em>
              </h2>
              <p>
                <EditableText
                  id="membership.text"
                  as="span"
                  defaultValue="Ob erste Schritte auf dem Platz oder sportlicher Anspruch: Im TCT bist du willkommen."
                />
              </p>
              <a className="button button-dark membership-contact-cta" href="/kontakt">
                <EditableText id="membership.cta" defaultValue="Kontaktformular ausfüllen" /> <ArrowRight size={18} />
              </a>
            </div>
            <div className="prices">
              <p className="kicker"><EditableText id="membership.pricesKicker" defaultValue="JAHRESBEITRÄGE" /></p>
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

        <section className="section downloads-section route-service" id="downloads">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="downloads.eyebrow" defaultValue="Service" />
              </p>
              <p className="section-note"><EditableText id="downloads.note" defaultValue="Offizielle Vereinsunterlagen" /></p>
            </div>
            <div className="downloads-layout motion">
              <div>
                <h2>
                  <EditableText id="downloads.title" defaultValue="Alles Wichtige." />
                  <br />
                  <em><EditableText id="downloads.titleAccent" defaultValue="Direkt da." /></em>
                </h2>
                <p>
                  <EditableText
                    id="downloads.text"
                    as="span"
                    defaultValue="Formulare und Preisübersichten des TCT zum Öffnen, Speichern oder Ausdrucken."
                  />
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

        <section className="section board-section route-club">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="board.eyebrow" defaultValue="Für den Club" />
              </p>
              <a className="text-link" href="/kontakt">
                <EditableText id="board.link" defaultValue="Kontakt aufnehmen" /> <ArrowRight size={17} />
              </a>
            </div>
            <h2>
              <EditableText id="board.title" defaultValue="Menschen mit" />
              <br />
              <em><EditableText id="board.titleAccent" defaultValue="Bewegung." /></em>
            </h2>
            <div className="board-grid motion">
              {liveBoard.map((member, i) => (
                <article key={member.id}>
                  <span>0{i + 1}</span>
                  <div
                    className={`portrait-placeholder ${member.photo ? "has-portrait" : ""}`}
                  >
                    {member.photo ? (
                      <img
                        loading="lazy"
                        src={member.photo}
                        alt={member.name}
                      />
                    ) : (
                      <b>
                        {member.name
                          .split(" ")
                          .map((word) => word[0])
                          .join("")}
                      </b>
                    )}
                  </div>
                  <h3>{member.name}</h3>
                  <p>{member.role}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="social-section route-home">
          <div className="container">
            <p className="eyebrow">
              <span /> <EditableText id="social.eyebrow" defaultValue="TCT Socials" />
            </p>
            <div>
              <h2>
                <EditableText id="social.title" defaultValue="Folge dem" />
                <br />
                <em><EditableText id="social.titleAccent" defaultValue="Club." /></em>
              </h2>
              <p>
                <EditableText
                  id="social.text"
                  as="span"
                  defaultValue="Aktuelle Eindrücke, Turniermomente und Clubleben direkt aus Trier."
                />
              </p>
            </div>
            <nav aria-label="TCT Social Media">
              <a
                href={liveClub.instagramUrl}
                target="_blank"
                rel="noreferrer"
              >
                Instagram <ArrowRight size={20} />
              </a>
              <a href={liveClub.facebookUrl} target="_blank" rel="noreferrer">
                Facebook <ArrowRight size={20} />
              </a>
            </nav>
          </div>
        </section>

        <section className="section contact route-kontakt" id="kontakt">
          <div className="container contact-grid">
            <div>
              <p className="eyebrow">
                <span /> <EditableText id="contact.eyebrow" defaultValue="Kontakt" />
              </p>
              <h2>
                <EditableText id="contact.title" defaultValue="Lass uns" />
                <br />
                <em><EditableText id="contact.titleAccent" defaultValue="spielen." /></em>
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
              {!liveFormSettings.contactFormEnabled ? (
                <div className="success">
                  <span>i</span>
                  <h3>Formular pausiert</h3>
                  <p>{liveFormSettings.pausedMessage}</p>
                  <a className="text-link" href={`mailto:${club.email}`}><Mail size={16} /> {club.email}</a>
                </div>
              ) : formSent ? (
                <div className="success">
                  <span>✓</span>
                  <h3><EditableText id="contact.form.successTitle" defaultValue="Danke für dein Interesse." /></h3>
                  <p>
                    {supabase
                      ? "Deine Anfrage ist beim Club eingegangen."
                      : "Dein E-Mail-Programm wurde mit deiner Anfrage geöffnet."}
                  </p>
                </div>
              ) : (
                <>
                  <p className="kicker"><EditableText id="contact.form.kicker" defaultValue="INTERESSE AN EINER MITGLIEDSCHAFT" /></p>
                  <input type="text" name="website" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                  <label>
                    <EditableText id="contact.form.nameLabel" as="span" defaultValue="Name" />
                    <input
                      required
                      name="name"
                      placeholder="Wie dürfen wir dich ansprechen?"
                    />
                  </label>
                  <label>
                    <EditableText id="contact.form.emailLabel" as="span" defaultValue="E-Mail" />
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="name@beispiel.de"
                    />
                  </label>
                  <label>
                    <EditableText id="contact.form.messageLabel" as="span" defaultValue="Nachricht" />
                    <textarea
                      name="message"
                      placeholder="Wobei können wir dir helfen?"
                      rows={3}
                    />
                  </label>
                  {contactError && <p className="form-error">{contactError}</p>}
                  <button className="button button-light" type="submit">
                    <EditableText id="contact.form.submit" defaultValue="Anfrage senden" /> <MoveRight size={18} />
                  </button>
                  <p className="form-note">
                    <EditableText
                      id="contact.form.note"
                      as="span"
                      defaultValue="Deine Anfrage wird sicher im Club-Postfach gespeichert. Der Club meldet sich per E-Mail bei dir."
                    />
                  </p>
                </>
              )}
            </form>
          </div>
        </section>

        <section className="section gallery-section route-galerie">
          <div className="container">
            <div className="section-head">
              <p className="eyebrow">
                <span /> <EditableText id="gallery.eyebrow" defaultValue="TCT in Bildern" />
              </p>
              <a className="text-link" href="/teams">
                <EditableText id="gallery.link" defaultValue="Unsere Teams" /> <ArrowRight size={17} />
              </a>
            </div>
            <div className="gallery-intro">
              <h2>
                <EditableText id="gallery.title" defaultValue="Momente, die" />
                <br />
                <em><EditableText id="gallery.titleAccent" defaultValue="bleiben." /></em>
              </h2>
              <p>
                <EditableText
                  id="gallery.text"
                  as="span"
                  defaultValue="Training, Turniere, Mannschaften und das Clubleben am Moselstadion. Ein Bild anklicken, um es groß zu sehen."
                />
              </p>
            </div>
            <div className="gallery-mosaic motion">
              {[
                { title: "Tennis am Moselstadion", image: liveSiteImages.court },
                { title: "Unsere Anlage", image: liveSiteImages.facility },
                { title: "Tennishalle", image: liveSiteImages.hall },
                { title: "Padel beim TCT", image: liveSiteImages.padel },
                ...liveTeamGallery.slice(0, 4).map((team) => ({
                  title: team.title,
                  image: team.image,
                })),
              ].map((item, index) => (
                <button
                  className={`gallery-tile gallery-tile-${index + 1}`}
                  type="button"
                  key={`${item.title}-${index}`}
                  onClick={() => setSelectedTeamPhoto(item)}
                  aria-label={`${item.title} groß ansehen`}
                >
                  <img loading="lazy" src={item.image} alt={item.title} />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="section partner-section route-partner">
          <div className="container partner-grid">
            <div>
              <p className="eyebrow">
                <span /> <EditableText id="partner.eyebrow" defaultValue="Partner & Förderer" />
              </p>
              <h2>
                <EditableText id="partner.title" defaultValue="Gemeinsam" />
                <br />
                <em><EditableText id="partner.titleAccent" defaultValue="sichtbar." /></em>
              </h2>
              <p className="partner-copy">
                <EditableText
                  id="partner.text"
                  as="span"
                  defaultValue="Gute Partnerschaften machen mehr möglich: Nachwuchs fördern, Turniere gestalten und Tennis in Trier erlebbar machen."
                />
              </p>
              <a className="button" href="#partner-anfrage">
                <EditableText id="partner.cta" defaultValue="Partnergespräch starten" /> <ArrowRight size={18} />
              </a>
            </div>
            <div className="partner-values motion">
              <article>
                <span>01</span>
                <h3><EditableText id="partner.value1.title" defaultValue="Turniere & Events" /></h3>
                <p><EditableText id="partner.value1.text" defaultValue="Präsenz bei besonderen Momenten auf und neben dem Platz." /></p>
              </article>
              <article>
                <span>02</span>
                <h3><EditableText id="partner.value2.title" defaultValue="Jugend fördern" /></h3>
                <p><EditableText id="partner.value2.text" defaultValue="Unterstützung für Training, Camps und den TCT-Nachwuchs." /></p>
              </article>
              <article>
                <span>03</span>
                <h3><EditableText id="partner.value3.title" defaultValue="Clubleben stärken" /></h3>
                <p><EditableText id="partner.value3.text" defaultValue="Ein lokales Engagement, das bei Mitgliedern ankommt." /></p>
              </article>
            </div>
          </div>
          {livePartners.length > 0 && (
            <div className="container public-partner-list">
              <p className="eyebrow"><span /> <EditableText id="partner.listEyebrow" defaultValue="Unsere Partner" /></p>
              <div>{livePartners.map((item) => <a key={item.id} href={item.website} target="_blank" rel="noreferrer" aria-label={`${item.name} – Website öffnen`}>
                {item.logo ? <img src={item.logo} alt={item.name} /> : <span className={`partner-logo-sprite partner-logo-${item.id}`} role="img" aria-label={item.name} />}
                {item.note && <small>{item.note}</small>}
              </a>)}</div>
            </div>
          )}
          <div className="container partner-inquiry-wrap" id="partner-anfrage">
            <form className="partner-inquiry-form" onSubmit={submitPartnerInquiry}>
              {!liveFormSettings.partnerFormEnabled ? (
                <div className="success">
                  <span>i</span>
                  <h3>Formular pausiert</h3>
                  <p>{liveFormSettings.pausedMessage}</p>
                  <a className="text-link" href={`mailto:${club.email}`}><Mail size={16} /> {club.email}</a>
                </div>
              ) : partnerInquirySent ? (
                <div className="success">
                  <span>✓</span>
                  <h3><EditableText id="partnerForm.successTitle" defaultValue="Danke für dein Interesse." /></h3>
                  <p><EditableText id="partnerForm.successText" defaultValue="Deine Partnerschaftsanfrage ist beim TCT eingegangen." /></p>
                </div>
              ) : (
                <>
                  <div className="partner-inquiry-copy">
                    <p className="eyebrow"><span /> <EditableText id="partnerForm.eyebrow" defaultValue="Partnerschaft anfragen" /></p>
                    <h3><EditableText id="partnerForm.title" defaultValue="Lasst uns" /><br /><em><EditableText id="partnerForm.titleAccent" defaultValue="etwas bewegen." /></em></h3>
                    <p><EditableText id="partnerForm.text" defaultValue="Erzähl uns kurz, wer ihr seid und wie ihr den TCT unterstützen möchtet. Der Vorstand meldet sich persönlich bei euch." /></p>
                  </div>
                  <div className="partner-inquiry-fields">
                    <input type="text" name="website" className="hp-field" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                    <label><EditableText id="partnerForm.nameLabel" as="span" defaultValue="Name" /><input required name="name" placeholder="Vor- und Nachname" /></label>
                    <label><EditableText id="partnerForm.companyLabel" as="span" defaultValue="Unternehmen" /> <small>optional</small><input name="company" placeholder="Name des Unternehmens" /></label>
                    <label><EditableText id="partnerForm.emailLabel" as="span" defaultValue="E-Mail" /><input required type="email" name="email" placeholder="name@unternehmen.de" /></label>
                    <label><EditableText id="partnerForm.messageLabel" as="span" defaultValue="Nachricht" /><textarea required name="message" rows={4} placeholder="Wofür interessiert ihr euch? Zum Beispiel Sponsoring, Event-Partnerschaft oder Jugendförderung." /></label>
                    {partnerInquiryError && <p className="form-error">{partnerInquiryError}</p>}
                    <button className="button button-light" type="submit"><EditableText id="partnerForm.submit" defaultValue="Partnerschaft anfragen" /> <MoveRight size={18} /></button>
                    <p className="form-note"><EditableText id="partnerForm.note" defaultValue="Die Anfrage landet gesondert markiert im TCT-Postfach und wird vertraulich behandelt." /></p>
                  </div>
                </>
              )}
            </form>
          </div>
        </section>

        <section className="section imprint-section route-impressum">
          <div className="container legal-layout">
            <div>
              <p className="eyebrow">
                <span /> <EditableText id="imprint.eyebrow" defaultValue="Rechtliches" />
              </p>
              <h2>
                <EditableText id="imprint.title" defaultValue="Klar." />
                <br />
                <em><EditableText id="imprint.titleAccent" defaultValue="Erreichbar." /></em>
              </h2>
            </div>
            <div className="legal-content">
              <article>
                <h3><EditableText id="imprint.club.title" defaultValue="Angaben zum Verein" /></h3>
                <p>
                  Tennisclub Trier 1888 e.V.<br />
                  Am Stadion 1<br />
                  54292 Trier
                </p>
              </article>
              <article>
                <h3><EditableText id="imprint.rep.title" defaultValue="Vertretung" /></h3>
                <p>
                  <EditableText
                    id="imprint.rep.text"
                    as="span"
                    defaultValue="Der Verein wird durch seinen Vorstand vertreten. 1. Vorsitzender: Alexander Jelen. 2. Vorsitzender: Roland Mohr."
                  />
                </p>
              </article>
              <article>
                <h3><EditableText id="imprint.contact.title" defaultValue="Kontakt" /></h3>
                <p>
                  Telefon: <a href={`tel:${club.phone.replaceAll(" ", "")}`}>{club.phone}</a>
                  <br />
                  E-Mail: <a href={`mailto:${club.email}`}>{club.email}</a>
                </p>
              </article>
              <article>
                <h3><EditableText id="imprint.responsibility.title" defaultValue="Verantwortung für Inhalte" /></h3>
                <p>
                  <EditableText
                    id="imprint.responsibility.text"
                    as="span"
                    defaultValue="Verantwortlich für die Inhalte dieser Website ist der Tennisclub Trier 1888 e.V. Angaben zum Verein werden regelmäßig geprüft und bei Änderungen aktualisiert."
                  />
                </p>
              </article>
              <article>
                <h3><EditableText id="imprint.dispute.title" defaultValue="Streitbeilegung" /></h3>
                <p>
                  <EditableText
                    id="imprint.dispute.text"
                    as="span"
                    defaultValue="Der Tennisclub Trier 1888 e.V. nimmt nicht an einem Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teil und ist hierzu auch nicht verpflichtet."
                  />
                </p>
              </article>
              <p className="legal-note">
                <EditableText
                  id="imprint.legalNote"
                  as="span"
                  defaultValue="Vor dem finalen Livegang sollte der Vorstand die Angaben zur Vertretung sowie mögliche Register- und Steuerangaben nochmals verbindlich prüfen."
                />
              </p>
            </div>
          </div>
        </section>
        {livePartners.length > 0 && (
          <section className="home-partner-strip route-home" aria-labelledby="home-partners-title">
            <div className="container">
              <div>
                <p className="eyebrow"><span /> <EditableText id="homePartnerStrip.eyebrow" defaultValue="Gemeinsam für Trier" /></p>
                <h2 id="home-partners-title"><EditableText id="homePartnerStrip.title" defaultValue="Unsere Partner." /></h2>
              </div>
              <div className="home-partner-logos">
                {livePartners.slice(0, 6).map((item) => <a key={item.id} href={item.website} target="_blank" rel="noreferrer" aria-label={`${item.name} – Website öffnen`}>
                  {item.logo ? <img src={item.logo} alt={item.name} /> : <span className={`partner-logo-sprite partner-logo-${item.id}`} role="img" aria-label={item.name} />}
                </a>)}
              </div>
              <a className="text-link" href="/partner"><EditableText id="homePartnerStrip.link" defaultValue="Partner werden" /> <ArrowRight size={17} /></a>
            </div>
          </section>
        )}
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-top">
            <a className="brand logo-brand footer-brand" href="/">
              <img src={officialImages.logo} alt="TCT 1888" />
            </a>
            <p>
              <EditableText id="footer.line1" defaultValue="Tennisclub Trier 1888 e.V." />
              <br />
              <EditableText id="footer.line2" defaultValue="Am Moselstadion." />
            </p>
            <a className="footer-round" href="/" aria-label="Zur Startseite">
              <ArrowRight size={22} />
            </a>
          </div>
          <div className="footer-bottom">
            <span>© {new Date().getFullYear()} Tennisclub Trier 1888 e.V.</span>
            <div>
              <a href="/impressum">Impressum</a>
              <a href="/datenschutz" onClick={() => setPrivacyOpen(true)}>
                Datenschutz
              </a>
              <a href="/galerie">Galerie</a>
              <a href="/partner">Partner</a>
              <a href="/service">Vereinsunterlagen</a>
            </div>
          </div>
        </div>
      </footer>

      {(privacyOpen || currentPath === "/datenschutz") && (
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
                if (currentPath === "/datenschutz") {
                  navigate("/");
                } else {
                  window.history.replaceState(null, "", "#top");
                }
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
                  <a href={`mailto:${club.email}`}>{club.email}</a>{" "}
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
                  sowie Sicherheits- und Änderungsprotokolle. Für einen
                  Passwort-Reset speichern wir einen zeitlich begrenzten,
                  gehashten Bestätigungscode. Passwörter werden nicht im
                  Klartext gespeichert. Das Änderungslog dokumentiert,
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
                  nutzen, um Entwürfe für News oder Termine zu erstellen. Die
                  gesonderte Rolle „Programmer“ kann zusätzlich kontrollierte
                  Designvorschläge für Schriftarten und Farben bestätigen. Dafür
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
                <h2>7. Wetterdaten (Open-Meteo)</h2>
                <p>
                  Auf der Buchungsseite zeigen wir auf Wunsch aktuelle
                  Wetterdaten für Trier an. Dafür ruft dein Browser die
                  Schnittstelle von Open-Meteo mit dem Standort der Anlage ab.
                  Dabei werden technisch bedingt Verbindungsdaten, insbesondere
                  deine IP-Adresse, an Open-Meteo übermittelt. Wir legen dafür
                  kein Wetter-Profil an und verwenden keine zusätzlichen
                  Cookies. Rechtsgrundlage ist unser berechtigtes Interesse an
                  einer hilfreichen Buchungsplanung (Art. 6 Abs. 1 lit. f
                  DSGVO). Weitere Informationen bietet{" "}
                  <a
                    href="https://open-meteo.com/en/docs"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open-Meteo
                  </a>
                  .
                </p>
              </section>

              <section>
                <h2>8. Bilder, Social Media und Cookies</h2>
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
                <h2>9. Speicherdauer und Empfänger</h2>
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
                <h2>10. Deine Rechte</h2>
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
            <div className="mobile-menu-account">
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
                <LockKeyhole size={16} />
                {adminUserId ? "Mein Konto" : "Registrieren"} <ArrowRight size={16} />
              </button>
              {!adminUserId ? (
                <button className="menu-member" onClick={() => { setMenuOpen(false); setAuthMode("login"); setAdminNotice(""); setAdminPanel("login"); }}>
                  Anmelden <ArrowRight size={16} />
                </button>
              ) : (
                <button className="menu-signout" type="button" onClick={() => void signOutAccount()}>
                  Abmelden <MoveRight size={16} />
                </button>
              )}
            </div>
            <a className="menu-book" href="/booking" onClick={() => setMenuOpen(false)}>
              Platz buchen <ArrowRight size={18} />
            </a>
            <div className="mobile-menu-groups">
              <section className="mobile-menu-group">
                <p>Menü</p>
                <div>
                  {liveNavItems.filter((item) => item.visible).map((item) => (
                    <a href={item.href} onClick={() => setMenuOpen(false)} key={item.id}>
                      {item.label}<ArrowRight size={15} />
                    </a>
                  ))}
                </div>
              </section>
            </div>
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
              {authMode === "login"
                ? "Willkommen"
                : authMode === "register"
                  ? "Neu"
                  : authMode === "verify"
                    ? "E-Mail"
                  : "Passwort"}
              <br />
              <em>
                {authMode === "login"
                  ? "zurück."
                  : authMode === "register"
                    ? "dabei."
                    : authMode === "verify"
                      ? "bestätigen."
                    : "neu."}
              </em>
            </h2>
            <p>
              {authMode === "login"
                ? "Melde dich mit deinem TCT-Mitgliederkonto an und verwalte deine persönlichen Angaben und Buchungen."
                 : authMode === "register"
                   ? "Erstelle dein persönliches TCT-Mitgliederkonto. Für die spätere Platzbuchung werden nur echte Mitgliederdaten freigeschaltet."
                  : authMode === "verify"
                    ? "Gib den sechsstelligen Code aus deiner TCT-E-Mail ein. Danach ist dein neues Mitgliederkonto freigeschaltet."
                  : authMode === "forgot"
                    ? "Wir schicken dir einen eigenen sechsstelligen TCT-Code, damit du sicher ein neues Passwort vergeben kannst."
                    : "Gib den Code aus deiner TCT-E-Mail ein und vergib anschließend ein neues Passwort."}
            </p>
            {(authMode === "login" || authMode === "register") && (
              <p className="auth-migration-note">
                Du hattest bereits ein Konto auf der alten TCT-Seite? Bitte erstelle
                einmalig ein neues Konto für diese Website.
              </p>
            )}
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
              <button
                className="auth-forgot"
                type="button"
                onClick={() => {
                  setAuthMode("forgot");
                  setAdminNotice("");
                }}
              >
                Passwort vergessen?
              </button>
            </form>
            ) : authMode === "register" ? (
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
            ) : authMode === "verify" ? (
              <form onSubmit={verifyRegistrationEmail}>
                <p className="form-note">
                  Code gesendet an <strong>{pendingRegistrationEmail}</strong>.
                  Bitte prüfe auch deinen Spam-Ordner.
                </p>
                <label>
                  Sechsstelliger Bestätigungscode
                  <input
                    required
                    autoFocus
                    name="code"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="123456"
                  />
                </label>
                <button className="button button-light" type="submit">
                  Konto bestätigen <Check size={17} />
                </button>
                <button
                  className="auth-switch"
                  type="button"
                  disabled={resendingCode}
                  onClick={resendVerificationCode}
                >
                  {resendingCode ? "Wird gesendet …" : "Keinen Code erhalten? Erneut senden"}
                </button>
              </form>
            ) : authMode === "forgot" ? (
              <form onSubmit={requestPasswordReset}>
                <label>
                  Benutzername oder E-Mail
                  <input
                    required
                    name="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder="max.mustermann oder max@beispiel.de"
                  />
                </label>
                <button className="button button-light" type="submit">
                  Code anfordern <ArrowRight size={17} />
                </button>
                <p className="form-note">
                  Aus Sicherheitsgründen zeigen wir nicht an, ob ein Zugang
                  existiert. Schau auch in deinen Spam-Ordner.
                </p>
              </form>
            ) : (
              <form onSubmit={resetPasswordWithCode}>
                <label>
                  Sechsstelliger Code
                  <input
                    required
                    name="code"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="123456"
                  />
                </label>
                <label>
                  Neues Passwort <small>mindestens 8 Zeichen</small>
                  <input
                    required
                    name="password"
                    type={showAuthPassword ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
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
                <label>
                  Passwort wiederholen
                  <input
                    required
                    name="passwordRepeat"
                    type={showAuthPassword ? "text" : "password"}
                    minLength={8}
                    autoComplete="new-password"
                  />
                </label>
                <button className="button button-light" type="submit">
                  Passwort speichern <Check size={17} />
                </button>
              </form>
            )}
            {authMode === "login" || authMode === "register" ? (
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
            ) : (
              <button
                className="auth-switch"
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setPasswordResetIdentifier("");
                  setPendingRegistrationEmail("");
                  setAdminNotice("");
                }}
              >
                Zurück zur Anmeldung
              </button>
            )}
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
            <a className="selected">
              <LayoutDashboard size={18} /> Übersicht
            </a>
            <p>INHALTE</p>
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
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("tournaments")}>
                <Trophy size={18} /> Turniere
              </a>
            )}
            {canManageFocus && (
              <a onClick={() => setAdminEditor("focus")}>
                <Newspaper size={18} /> Im Fokus setzen
              </a>
            )}
            {canManageTeams && (
              <a onClick={() => setAdminEditor("teams")}>
                <UsersRound size={18} /> Mannschaften
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("partners")}>
                <UsersRound size={18} /> Partner
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("board")}>
                <UsersRound size={18} /> Vorstand
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("history")}>
                <CalendarDays size={18} /> Chronik
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("facilities")}>
                <Settings2 size={18} /> Anlage-Bereiche
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("blocks")}>
                <ImagePlus size={18} /> Zusatzblöcke
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("pages")}>
                <LayoutDashboard size={18} /> Eigene Seiten
              </a>
            )}
            <p>MEDIEN</p>
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("media")}>
                <ImagePlus size={18} /> Website-Bilder
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("mediaLibrary")}>
                <ImagePlus size={18} /> Mediathek
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("downloads")}>
                <FileText size={18} /> PDFs &amp; Downloads
              </a>
            )}
            <p>WEBSITE</p>
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("navigation")}>
                <Menu size={18} /> Navigation
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("forms")}>
                <FileText size={18} /> Formulare
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("membership")}>
                <FileText size={18} /> Mitgliedsbeiträge
              </a>
            )}
            {canManageBooking && (
              <a onClick={() => setAdminEditor("booking")}>
                <CalendarDays size={18} /> Platzbuchung
              </a>
            )}
            {canManageGeneralContent && (
              <a onClick={() => setAdminEditor("club")}>
                <Settings2 size={18} /> Einstellungen &amp; Design
              </a>
            )}
            <p>POSTFACH</p>
            {canManageInbox && (
              <a onClick={() => setAdminEditor("inbox")}>
                <Mail size={18} /> Kontakt-Postfach
              </a>
            )}
            {canManageTournamentInbox && (
              <a onClick={() => setAdminEditor("tournamentInbox")}>
                <Mail size={18} /> Turnier-Postfach
              </a>
            )}
            <p>VERWALTUNG</p>
            {adminEmail === OWNER_EMAIL && (
              <a onClick={() => setAdminEditor("users")}>
                <UsersRound size={18} /> Nutzer &amp; Rollen
              </a>
            )}
            {(adminEmail === OWNER_EMAIL || adminRole === "management") && (
              <a onClick={() => { setAuditOpen(true); void loadAudit(); }}>
                <FileText size={18} /> Änderungslog
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
                  <b>{adminRole === "programmer" ? "KI-Website-Designer" : "KI-Assistent"}</b>
                  <small>{adminRole === "programmer" ? "Schriftarten und Farben kontrolliert ändern" : "News, Termine und Inhalte per Text vorbereiten"}</small>
                </span>
                <ArrowRight size={18} />
              </button>
              {editorialRoles.includes(adminRole) && (
                <button
                  className="admin-task"
                  onClick={() => {
                    setEditMode((value) => !value);
                    setAdminPanel(null);
                  }}
                >
                  <Pencil size={19} />
                  <span>
                    <b>{editMode ? "Textbearbeitung beenden" : "Startseite bearbeiten"}</b>
                    <small>Jeden Text auf der Website direkt anklicken und ändern</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
              {adminEmail === OWNER_EMAIL && (
                <button className="admin-task" onClick={() => void resetSiteTheme()}>
                  <Settings2 size={19} />
                  <span>
                    <b>TCT-Designstandard</b>
                    <small>Alle KI-Designänderungen vollständig zurücksetzen</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              )}
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
                <button className="admin-task" onClick={() => setAdminEditor("partners")}>
                  <UsersRound size={19} />
                  <span><b>Partner verwalten</b><small>Logo, Website und Sponsoren sichtbar machen</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("tournaments")}>
                  <Trophy size={19} />
                  <span><b>Turniere verwalten</b><small>Turnierkalender anlegen, ändern und entfernen</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("board")}>
                  <UsersRound size={19} />
                  <span><b>Vorstand verwalten</b><small>Mitglieder aufnehmen, bearbeiten, entfernen</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("history")}>
                  <CalendarDays size={19} />
                  <span><b>Chronik verwalten</b><small>Meilensteine ergänzen oder ändern</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("facilities")}>
                  <Settings2 size={19} />
                  <span><b>Anlage-Bereiche verwalten</b><small>Außenplätze, Halle, Padel &amp; Co.</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("blocks")}>
                  <ImagePlus size={19} />
                  <span><b>Zusatzblöcke verwalten</b><small>Eigene Absätze mit Bild hinzufügen</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("pages")}>
                  <LayoutDashboard size={19} />
                  <span><b>Eigene Seiten</b><small>Neue Abteile mit eigener Adresse anlegen oder entfernen</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("navigation")}>
                  <Menu size={19} />
                  <span><b>Navigation verwalten</b><small>Menüpunkte anordnen, umbenennen, verstecken</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("forms")}>
                  <FileText size={19} />
                  <span><b>Formulare</b><small>Kontakt- und Partneranfrage öffnen oder pausieren</small></span>
                  <ArrowRight size={18} />
                </button>
              )}
              {canManageGeneralContent && (
                <button className="admin-task" onClick={() => setAdminEditor("mediaLibrary")}>
                  <ImagePlus size={19} />
                  <span><b>Mediathek</b><small>Alle Bilder an einem Ort ansehen, hochladen, löschen</small></span>
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
              {canManageTournamentInbox && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("tournamentInbox")}
                >
                  <CalendarDays size={19} />
                  <span>
                    <b>Turnier-Postfach</b>
                    <small>Fragen und Anmeldungen bearbeiten</small>
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
              {adminEmail === OWNER_EMAIL && (
                <button
                  className="admin-task"
                  onClick={() => setAdminEditor("users")}
                >
                  <UsersRound size={19} />
                  <span>
                    <b>Alle Benutzer &amp; Rollen</b>
                    <small>Jede Registrierung sehen und Rollen festlegen</small>
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
      {["news", "media", "membership"].includes(adminEditor ?? "") && (
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
                      <button
                        className="danger"
                        type="button"
                        onClick={() => void deletePriceTier(item)}
                      >
                        Löschen
                      </button>
                    </fieldset>
                  ))}
                  <button className="button button-light" type="submit">
                    Beiträge speichern <Check size={17} />
                  </button>
                </form>
                <form className="admin-add-form" onSubmit={addPriceTier}>
                  <p className="kicker">NEUE BEITRAGSSTUFE</p>
                  <label>
                    Bezeichnung
                    <input required name="newName" placeholder="z. B. Familienbeitrag" />
                  </label>
                  <label>
                    Jahrespreis
                    <input name="newPrice" placeholder="z. B. 200 €" />
                  </label>
                  <label>
                    Monatshinweis
                    <input name="newMonthly" placeholder="z. B. 28,00 € / Monat*" />
                  </label>
                  <button className="button button-outline" type="submit">
                    Beitragsstufe anlegen <ArrowRight size={17} />
                  </button>
                </form>
              </>
            )}
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
            onClick={() => { setEditingEvent(null); setAdminEditor(null); }}
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
              <form key={editingEvent?.id ?? "new-event"} onSubmit={saveEvent} className="event-create-form">
                <p className="kicker">{editingEvent ? "TERMIN BEARBEITEN" : "NEU ANLEGEN"}</p>
                <label>
                  Titel
                  <input
                    required
                    name="title"
                    placeholder="Name der Veranstaltung"
                    defaultValue={editingEvent?.title ?? ""}
                  />
                </label>
                <label>
                  Kategorie
                  <select name="category" defaultValue={editingEvent?.category ?? "Club"}>
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
                    <input required name="starts_at" type="datetime-local" defaultValue={eventDateTimeInput(editingEvent?.starts_at)} />
                  </label>
                  <label>
                    Ende
                    <input name="ends_at" type="datetime-local" defaultValue={eventDateTimeInput(editingEvent?.ends_at)} />
                  </label>
                </div>
                <div className="event-option-grid">
                  <label className="event-registration-check"><input name="registration_enabled" type="checkbox" defaultChecked={editingEvent?.registration_enabled ?? false} /> Anmeldung über die Website erlauben <small>Teilnehmende können direkt eine Anmeldung senden.</small></label>
                  <label className="event-registration-check"><input name="spectators_allowed" type="checkbox" defaultChecked={editingEvent?.spectators_allowed ?? false} /> Zuschauer erlaubt <small>Aktivieren, wenn Besucher das Turnier ansehen können.</small></label>
                </div>
                <label>
                  Eintrittspreis in Euro <small>0 bedeutet Eintritt frei</small>
                  <input
                    required
                    name="admission_price"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={editingEvent?.spectators_allowed && editingEvent.admission_price_cents !== null ? (editingEvent.admission_price_cents / 100).toFixed(2) : "0.00"}
                  />
                </label>
                <div className="event-venue-row">
                  <label>
                    Name des Ortes
                    <input name="venue_name" placeholder="z. B. TC Trier 1888 e.V." defaultValue={editingEvent?.venue_name ?? "TC Trier 1888 e.V."} />
                  </label>
                  <label>
                    Vollständige Adresse
                    <input required name="venue_address" placeholder="Straße, PLZ Ort" defaultValue={editingEvent?.venue_address ?? "Am Stadion 1, 54292 Trier"} />
                    <small>Aus dieser Adresse wird automatisch der Google-Maps-Link.</small>
                  </label>
                </div>
                <label>
                  Beschreibung
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Wichtige Informationen zum Termin"
                    defaultValue={editingEvent?.description ?? ""}
                  />
                </label>
                <button className="button button-light" type="submit">
                  {editingEvent ? "Änderungen speichern" : "Termin veröffentlichen"} <CalendarDays size={17} />
                </button>
                {editingEvent && <button className="event-edit-cancel" type="button" onClick={() => setEditingEvent(null)}>Bearbeitung abbrechen</button>}
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
                          {event.venue_address && <small>{event.venue_name ? `${event.venue_name} · ` : ""}{event.venue_address}</small>}
                          <small>{event.spectators_allowed ? eventAdmissionLabel(event.admission_price_cents) : "Keine Zuschauerfreigabe"}</small>
                        </div>
                        <div className="event-admin-actions">
                          <button type="button" onClick={() => setEditingEvent(event)}>Bearbeiten</button>
                          <button
                            type="button"
                            onClick={() => void deleteEvent(event.id)}
                            aria-label={`${event.title} löschen`}
                          >
                            Löschen
                          </button>
                        </div>
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
            <p className="editor-help">Ziehe einen Bereich per Drag &amp; Drop, um die Reihenfolge zu ändern.</p>
            <form onSubmit={saveTeams}>
              {liveTeams.map((team, index) => (
                <fieldset
                  key={team.name}
                  className={`draggable-row${teamDragIndex === index ? " dragging" : ""}`}
                  draggable
                  onDragStart={() => setTeamDragIndex(index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => { event.preventDefault(); if (teamDragIndex !== null) reorderTeams(teamDragIndex, index); setTeamDragIndex(null); }}
                  onDragEnd={() => setTeamDragIndex(null)}
                >
                  <span className="content-manager-drag-handle" aria-hidden="true">⠿</span>
                  <label>
                    Nummer
                    <input
                      required
                      name={`number-${index}`}
                      defaultValue={team.number}
                    />
                  </label>
                  <label>
                    Bereich
                    <input
                      required
                      name={`name-${index}`}
                      defaultValue={team.name}
                    />
                  </label>
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
                  <button
                    className="danger"
                    type="button"
                    onClick={() => void deleteTeam(team)}
                  >
                    Löschen
                  </button>
                </fieldset>
              ))}
              <button className="button button-light" type="submit">
                Mannschaften speichern <Check size={17} />
              </button>
            </form>
            <form className="admin-add-form" onSubmit={addTeam}>
              <p className="kicker">NEUER BEREICH</p>
              <label>
                Nummer
                <input required name="newNumber" placeholder="z. B. 04" />
              </label>
              <label>
                Bereich
                <input required name="newName" placeholder="z. B. Senioren" />
              </label>
              <label>
                Kurzbeschreibung
                <textarea name="newText" rows={2} placeholder="Kurzbeschreibung" />
              </label>
              <label>
                Saisonhinweis
                <textarea name="newNote" rows={2} placeholder="Saisonhinweis" />
              </label>
              <button className="button button-outline" type="submit">
                Bereich anlegen <ArrowRight size={17} />
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
              <img src={selectedNews.image_path} alt={selectedNews.title} />
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
              placeholder="Wonach suchst du?"
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
              <span /> Website-Einstellungen
            </p>
            <h2>
              Alles an
              <br />
              <em>einem Ort.</em>
            </h2>
            <p className="editor-help">
              Buchungslinks, Social-Media, Suchmaschinen-Anzeige und Favicon
              der ganzen Website. Nutze vollständige Internetadressen mit
              https://.
            </p>
            <p className="kicker">AKZENTFARBE (BUTTONS &amp; HIGHLIGHTS)</p>
            <div className="accent-preset-row">
              {courtAccentPresets.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  className={`accent-preset${liveSiteTheme.accentColor === preset.color ? " active" : ""}`}
                  style={{ "--preset-color": preset.color } as CSSProperties}
                  onClick={() => void saveAccentPreset(preset.color)}
                >
                  <span />
                  {preset.label}
                </button>
              ))}
            </div>
            <p className="editor-help">
              Gilt sofort für die ganze Website und alle Besucher, auch ohne
              eigenes Konto.
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
              <fieldset>
                <p className="kicker">SOCIAL MEDIA</p>
                <label>
                  Instagram
                  <input name="instagramUrl" type="url" defaultValue={liveClub.instagramUrl} />
                </label>
                <label>
                  Facebook
                  <input name="facebookUrl" type="url" defaultValue={liveClub.facebookUrl} />
                </label>
              </fieldset>
              <fieldset>
                <p className="kicker">SUCHMASCHINEN-ANZEIGE (STANDARD)</p>
                <label>
                  Seitentitel
                  <input name="siteTitle" defaultValue={liveClub.siteTitle} />
                </label>
                <label>
                  Beschreibung
                  <textarea name="siteDescription" rows={2} defaultValue={liveClub.siteDescription} />
                </label>
              </fieldset>
              <button className="button button-light" type="submit">
                Einstellungen speichern <Check size={17} />
              </button>
            </form>
            <fieldset>
              <p className="kicker">FAVICON (BROWSER-TAB-SYMBOL)</p>
              {liveClub.faviconUrl && <img className="upload-preview" src={liveClub.faviconUrl} alt="" style={{ width: 48, height: 48, objectFit: "cover" }} />}
              <label>
                Neues Favicon hochladen
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/x-icon"
                  onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadFavicon(file); }}
                />
              </label>
            </fieldset>
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
                      <button
                        type="button"
                        onClick={() => {
                          setReplyingToContact(message);
                          setContactReplyText(`Hallo ${message.name},\n\nvielen Dank für deine Anfrage beim Tennisclub Trier.\n\n`);
                          setContactReplyStatus("");
                        }}
                      >
                        Antworten <ArrowRight size={16} />
                      </button>
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
                    {replyingToContact?.id === message.id && (
                      <div className="contact-reply-box">
                        <label>
                          Antwort an {message.email}
                          <textarea value={contactReplyText} onChange={(event) => setContactReplyText(event.target.value)} rows={6} maxLength={5000} autoFocus />
                        </label>
                        {contactReplyStatus && <p>{contactReplyStatus}</p>}
                        <div>
                          <button type="button" onClick={() => { setReplyingToContact(null); setContactReplyStatus(""); }}>Abbrechen</button>
                          <button className="button button-light" type="button" onClick={() => void sendContactReply()}>E-Mail senden <MoveRight size={16} /></button>
                        </div>
                      </div>
                    )}
                  </article>
                ))
              ) : (
                <p className="inbox-empty">Noch keine Anfragen vorhanden.</p>
              )}
            </div>
          </div>
        </div>
      )}
      {adminEditor === "tournamentInbox" && canManageTournamentInbox && (
        <div className="editor-overlay inbox-editor" role="dialog" aria-modal="true" aria-label="Turnier-Postfach">
          <button className="admin-close" onClick={() => setAdminEditor(null)} aria-label="Turnier-Postfach schließen"><X size={23} /></button>
          <div className="inbox-card">
            <div className="inbox-heading">
              <div>
                <p className="eyebrow"><span /> Turnier-Postfach</p>
                <h2>Aufschlag.<br /><em>Im Blick.</em></h2>
                <p>Hier landen ausschließlich Fragen und Anmeldungen zu Turnieren. Sichtbar für Turnierleitung, Admin und Management.</p>
              </div>
              <button type="button" onClick={() => void loadTournamentInquiries()}>Aktualisieren</button>
            </div>
            <div className="inbox-list">
              {tournamentInquiries.length ? tournamentInquiries.map((inquiry) => (
                <article key={inquiry.id}>
                  <header>
                    <div>
                      <span className={`inbox-status status-${inquiry.status}`}>{inquiry.inquiry_type === "registration" ? "Anmeldung" : "Frage"} · {inquiry.status === "new" ? "Neu" : inquiry.status === "read" ? "Gelesen" : "Archiviert"}</span>
                      <h3>{inquiry.tournament_title}</h3>
                      <p><strong>{inquiry.name}</strong> · <a href={`mailto:${inquiry.email}`}>{inquiry.email}</a></p>
                    </div>
                    <time>{new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(inquiry.created_at))}</time>
                  </header>
                  {inquiry.message && <p>{inquiry.message}</p>}
                  <footer>
                    <a href={`mailto:${inquiry.email}?subject=${encodeURIComponent(`Deine ${inquiry.inquiry_type === "registration" ? "Anmeldung" : "Frage"} zum ${inquiry.tournament_title}`)}`}>Antworten <ArrowRight size={16} /></a>
                    {inquiry.status === "new" && <button onClick={() => void updateTournamentInquiryStatus(inquiry.id, "read")}>Als gelesen markieren</button>}
                    {inquiry.status !== "archived" && <button onClick={() => void updateTournamentInquiryStatus(inquiry.id, "archived")}>Archivieren</button>}
                  </footer>
                </article>
              )) : <p className="inbox-empty">Noch keine Turnieranfragen vorhanden.</p>}
            </div>
          </div>
        </div>
      )}
      {adminEditor === "users" &&
        adminEmail === OWNER_EMAIL && (
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
                    <span /> Nur für den Eigentümer
                  </p>
                  <h2>
                    Alle
                    <br />
                    <em>Benutzer.</em>
                  </h2>
                  <p>
                    Sieh jede Registrierung und vergib exakt die Rolle, die
                    das Mitglied benötigt. Dieser Bereich ist ausschließlich
                    für dein Eigentümer-Konto sichtbar.
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
                    <select name="role" defaultValue="member">
                      <option value="member">Mitglied</option>
                      <option value="management">
                        Management · alles wie Eigentümer
                      </option>
                      <option value="programmer">Programmer · KI-Website-Design</option>
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
                  <div className="users-list-toolbar">
                    <p className="kicker">ALLE REGISTRIERUNGEN · {managedUsers.length}</p>
                    <label>
                      <span>Benutzer suchen</span>
                      <input
                        type="search"
                        value={managedUserSearch}
                        onChange={(event) => setManagedUserSearch(event.target.value)}
                        placeholder="Name, E-Mail, Benutzername oder Rolle"
                      />
                    </label>
                  </div>
                  {filteredManagedUsers.length ? (
                    filteredManagedUsers.map((user) => (
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
                            {user.email_verified ? "E-Mail bestätigt" : "E-Mail noch nicht bestätigt"}
                            {" · Registriert am "}
                            {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(user.created_at))}
                            {!user.profile_complete && " · Profil wurde automatisch ergänzt"}
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
                            <option value="programmer">
                              Programmer · KI-Website-Design
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
                            <option value="member">Mitglied</option>
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
              Konto
              <br />
              <em>Einstellungen.</em>
            </h2>
            <p className="editor-help">
              Hier verwaltest du deinen Namen, deinen Benutzernamen, deine
              Anmelde-E-Mail und dein Passwort. Sicherheitsänderungen werden
              zusätzlich bestätigt.
            </p>
            <div className="account-summary">
              <span>{roleLabels[adminRole] ?? "Mitglied"}</span>
              <strong>{adminName || "TCT-Mitglied"}</strong>
              <small>@{adminUsername || "kein-benutzername"} · {adminEmail?.endsWith("@tct-intern.invalid") ? "Noch keine persönliche E-Mail" : adminEmail}</small>
            </div>
            {accountNotice && (
              <p className="account-notice" role="status">{accountNotice}</p>
            )}

            <section className="account-setting-section">
              <div>
                <span>01</span>
                <h3>Persönliche Angaben</h3>
                <p>So wirst du im Mitgliederbereich angezeigt.</p>
              </div>
              <form onSubmit={changeOwnName}>
                <label>
                  Name
                  <input
                    required
                    name="displayName"
                    minLength={2}
                    maxLength={100}
                    defaultValue={adminName}
                  />
                </label>
                <button className="account-save" type="submit" disabled={accountBusy}>
                  Name speichern <Check size={16} />
                </button>
              </form>
            </section>

            <section className="account-setting-section">
              <div>
                <span>02</span>
                <h3>Benutzername</h3>
                <p>Damit kannst du dich alternativ zur E-Mail anmelden.</p>
              </div>
              <form onSubmit={changeOwnUsername} key={adminUsername}>
                <label>
                  Benutzername
                  <input
                    required
                    name="username"
                    minLength={3}
                    maxLength={32}
                    pattern="[A-Za-z0-9._-]{3,32}"
                    autoComplete="username"
                    defaultValue={adminUsername}
                    placeholder="z. B. m.mustermann"
                  />
                </label>
                <button className="account-save" type="submit" disabled={accountBusy}>
                  Benutzername ändern <Check size={16} />
                </button>
              </form>
            </section>

            <section className="account-setting-section account-security-section">
              <div>
                <span>03</span>
                <h3>E-Mail-Adresse</h3>
                <p>Die neue Adresse wird erst nach Eingabe des Codes übernommen.</p>
              </div>
              {!pendingAccountEmail ? (
                <form onSubmit={requestOwnEmailChange}>
                  <label>
                    Neue E-Mail-Adresse
                    <input
                      required
                      name="newEmail"
                      type="email"
                      autoComplete="email"
                      defaultValue={adminEmail?.endsWith("@tct-intern.invalid") ? "" : adminEmail ?? ""}
                    />
                  </label>
                  <label>
                    Aktuelles Passwort
                    <input
                      required
                      name="currentPassword"
                      type={showAccountPasswords ? "text" : "password"}
                      autoComplete="current-password"
                    />
                  </label>
                  <button className="account-save" type="submit" disabled={accountBusy}>
                    Bestätigungscode senden <Mail size={16} />
                  </button>
                </form>
              ) : (
                <form onSubmit={confirmOwnEmailChange} className="account-code-form">
                  <p>Code gesendet an <strong>{pendingAccountEmail}</strong></p>
                  <label>
                    Sechsstelliger Code
                    <input
                      required
                      autoFocus
                      name="code"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      placeholder="123456"
                    />
                  </label>
                  <button className="account-save" type="submit" disabled={accountBusy}>
                    E-Mail bestätigen <Check size={16} />
                  </button>
                  <button className="account-cancel" type="button" onClick={() => { setPendingAccountEmail(""); setAccountNotice(""); }}>
                    Andere E-Mail verwenden
                  </button>
                </form>
              )}
            </section>

            <section className="account-setting-section account-security-section">
              <div>
                <span>04</span>
                <h3>Passwort</h3>
                <p>Nach der Änderung meldest du dich mit dem neuen Passwort erneut an.</p>
              </div>
              <form onSubmit={changeOwnPassword}>
                <label>
                  Aktuelles Passwort
                  <input
                    required
                    name="currentPassword"
                    type={showAccountPasswords ? "text" : "password"}
                    autoComplete="current-password"
                  />
                </label>
                <label>
                  Neues Passwort <small>mindestens 10 Zeichen</small>
                  <input
                    required
                    name="newPassword"
                    type={showAccountPasswords ? "text" : "password"}
                    minLength={10}
                    autoComplete="new-password"
                  />
                </label>
                <label>
                  Neues Passwort wiederholen
                  <input
                    required
                    name="newPasswordRepeat"
                    type={showAccountPasswords ? "text" : "password"}
                    minLength={10}
                    autoComplete="new-password"
                  />
                </label>
                <button className="account-password-toggle" type="button" onClick={() => setShowAccountPasswords((visible) => !visible)}>
                  {showAccountPasswords ? <EyeOff size={16} /> : <Eye size={16} />}
                  {showAccountPasswords ? "Passwörter verbergen" : "Passwörter anzeigen"}
                </button>
                <button className="account-save account-save-danger" type="submit" disabled={accountBusy}>
                  Passwort ändern <LockKeyhole size={16} />
                </button>
              </form>
            </section>

            <div className="account-footer-actions">
              <button
                className="auth-switch"
                type="button"
                onClick={() => void signOutAccount()}
              >
                Abmelden <MoveRight size={16} />
              </button>
            </div>
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
    </SiteCopyContext.Provider>
  );
}

export default App;
