import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  LockKeyhole,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";

type Court = {
  id: string;
  name: string;
  kind: "tennis" | "padel";
  area: "outdoor" | "indoor";
  sort_order: number;
  active: boolean;
};
type ScheduleItem = {
  court_id: string;
  starts_at: string;
  ends_at: string;
  source: "booking" | "block";
  label: string;
  is_own: boolean;
};
type MyBooking = {
  id: string;
  court_id: string;
  starts_at: string;
  ends_at: string;
  partner_name: string | null;
  amount_cents: number;
  booking_email: string | null;
  status: "confirmed" | "cancelled";
  courts: { name: string; kind: "tennis" | "padel" }[];
};
type PendingSlot = { court: Court; start: Date };

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const slotDate = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
const formatDay = (day: string) =>
  new Intl.DateTimeFormat("de-DE", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(`${day}T12:00:00`));
const formatTime = (date: string | Date) =>
  new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(
    new Date(date),
  );
const bookingPrice = (booking: MyBooking) => {
  return `${(booking.amount_cents / 100).toFixed(2).replace(".", ",")} €`;
};

export function BookingPortal({
  userId,
  defaultEmail,
  role,
  onRequireLogin,
}: {
  userId: string | null;
  defaultEmail: string;
  role: string;
  onRequireLogin: () => void;
}) {
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [kind, setKind] = useState<"tennis" | "padel">("tennis");
  const [courts, setCourts] = useState<Court[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [pending, setPending] = useState<PendingSlot | null>(null);
  const [selectedCourtIds, setSelectedCourtIds] = useState<string[]>([]);
  const [minutes, setMinutes] = useState(60);
  const [guestName, setGuestName] = useState("");
  const [bookingEmail, setBookingEmail] = useState(defaultEmail);
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [step, setStep] = useState<"edit" | "confirm" | "success">("edit");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const loadSchedule = async () => {
    if (!supabase) return;
    setLoading(true);
    const [{ data: courtData }, { data: scheduleData, error }] = await Promise.all([
      supabase
        .from("courts")
        .select("id,name,kind,area,sort_order,active")
        .eq("active", true)
        .eq("kind", kind)
        .order("sort_order"),
      supabase.rpc("get_court_schedule", {
        target_day: day,
        requested_kind: kind,
      }),
    ]);
    if (courtData) setCourts(courtData as Court[]);
    if (scheduleData) setSchedule(scheduleData as ScheduleItem[]);
    if (error) setNotice(`Kalender konnte nicht geladen werden: ${error.message}`);
    setLoading(false);
  };

  const loadMyBookings = async () => {
    if (!supabase || !userId) {
      setMyBookings([]);
      return;
    }
    const { data, error } = await supabase
      .from("court_bookings")
      .select("id,court_id,starts_at,ends_at,partner_name,amount_cents,booking_email,status,courts(name,kind)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(12);
    if (error) {
      setNotice(`Eigene Buchungen konnten nicht geladen werden: ${error.message}`);
      return;
    }
    setMyBookings((data ?? []) as MyBooking[]);
  };

  useEffect(() => {
    void loadSchedule();
  }, [day, kind]);
  useEffect(() => {
    void loadMyBookings();
  }, [userId]);
  useEffect(() => {
    if (defaultEmail) setBookingEmail(defaultEmail);
  }, [defaultEmail]);

  const visibleCourts = courts.filter((court) => court.kind === kind);
  const canBookCourtGroups = ["management", "admin", "tournament_manager", "team_manager"].includes(role);
  const selectedCourts = visibleCourts.filter((court) => selectedCourtIds.includes(court.id));
  const selectedEnd = pending ? new Date(pending.start.getTime() + minutes * 60_000) : null;
  const pendingPrice =
    pending?.court.kind === "padel"
      ? `${(minutes / 60 * 24).toFixed(2).replace(".", ",")} €`
      : "0,00 €";
  const times = Array.from({ length: 15 }, (_, index) => index + 7);
  const busyAt = (courtId: string, start: Date) => {
    const end = new Date(start.getTime() + 60 * 60_000);
    return schedule.find(
      (item) =>
        item.court_id === courtId &&
        new Date(item.starts_at) < end &&
        new Date(item.ends_at) > start,
    );
  };
  const courtIsFreeForDuration = (courtId: string, start: Date, duration: number) => {
    const end = new Date(start.getTime() + duration * 60_000);
    return !schedule.some(
      (item) => item.court_id === courtId && new Date(item.starts_at) < end && new Date(item.ends_at) > start,
    );
  };
  const freeSlots = useMemo(
    () =>
      visibleCourts.reduce(
        (count, court) =>
          count + times.filter((hour) => !busyAt(court.id, slotDate(day, hour))).length,
        0,
      ),
    [visibleCourts, schedule, day],
  );

  const changeDay = (offset: number) => {
    const next = new Date(`${day}T12:00:00`);
    next.setDate(next.getDate() + offset);
    setDay(toDateKey(next));
  };

  const openSlot = (court: Court, hour: number) => {
    if (!userId) {
      setNotice("Bitte melde dich an, um einen Platz verbindlich zu buchen.");
      onRequireLogin();
      return;
    }
    setPending({ court, start: slotDate(day, hour) });
    setSelectedCourtIds([court.id]);
    setMinutes(60);
    setGuestName("");
    setBookingEmail(defaultEmail);
    setDeliveryStatus("");
    setStep("edit");
    setNotice("");
  };

  const book = async () => {
    if (!supabase || !pending) return;
    const courtIds = selectedCourtIds.length ? selectedCourtIds : [pending.court.id];
    const isGroupBooking = courtIds.length > 1;
    const { data, error } = isGroupBooking
      ? await supabase.rpc("book_multiple_courts", {
          target_court_ids: courtIds,
          requested_start: pending.start.toISOString(),
          requested_minutes: minutes,
          guest_name: guestName.trim() || null,
          requested_email: bookingEmail.trim(),
        })
      : await supabase.rpc("book_court", {
          target_court_id: pending.court.id,
          requested_start: pending.start.toISOString(),
          requested_minutes: minutes,
          guest_name: guestName.trim() || null,
          requested_email: bookingEmail.trim(),
        });
    if (error) {
      if (error.message.includes("court_bookings_no_overlap")) {
        setPending(null);
        setNotice(
          "Diese Zeit wurde gerade bereits gebucht. Bitte wähle einen anderen freien Zeitraum.",
        );
        return;
      }
      setNotice(error.message);
      setStep("edit");
      return;
    }
    const bookings = (isGroupBooking ? data : [data]) as Array<{ id: string }>;
    const booking = bookings[0];
    const { data: delivery, error: deliveryError } = await supabase.functions.invoke(
      "booking-confirmation",
      { body: { bookingId: booking.id } },
    );
    if (bookings.length > 1) {
      await Promise.all(
        bookings.slice(1).map((item) =>
          supabase!.functions.invoke("booking-confirmation", { body: { bookingId: item.id } }),
        ),
      );
    }
    setDeliveryStatus(
      deliveryError || delivery?.error
        ? `Die Buchung ist gespeichert, aber die Bestätigungs-E-Mail konnte nicht gesendet werden: ${delivery?.error ?? deliveryError?.message ?? "Unbekannter Fehler"}`
        : delivery?.skipped
          ? "Die Buchung ist gespeichert. Der automatische E-Mail-Versand wird noch eingerichtet."
          : `Bestätigung wurde an ${bookingEmail.trim()} gesendet.`,
    );
    setStep("success");
    await Promise.all([loadSchedule(), loadMyBookings()]);
  };

  const reviewBooking = () => {
    if (!/^\S+@\S+\.\S+$/.test(bookingEmail.trim())) {
      setNotice("Bitte gib eine gültige E-Mail-Adresse für die Buchungsbestätigung ein.");
      return;
    }
    setNotice("");
    setStep("confirm");
  };

  const toggleCourt = (courtId: string) => {
    setSelectedCourtIds((ids) => {
      if (ids.includes(courtId)) return ids.length === 1 ? ids : ids.filter((id) => id !== courtId);
      return ids.length >= 4 ? ids : [...ids, courtId];
    });
  };

  const cancelBooking = async (id: string) => {
    if (!supabase || !window.confirm("Diese Buchung wirklich stornieren?")) return;
    const { data: booking, error } = await supabase.rpc(
      "cancel_own_booking_with_email",
      { booking_id: id },
    );
    if (error) {
      setNotice(error.message);
      return;
    }
    const { data: delivery, error: deliveryError } = await supabase.functions.invoke(
      "booking-confirmation",
      { body: { bookingId: booking.id } },
    );
    setNotice(
      deliveryError || delivery?.error
        ? "Buchung wurde storniert, aber die E-Mail konnte nicht gesendet werden."
        : delivery?.skipped
          ? "Buchung wurde storniert. Der automatische E-Mail-Versand wird noch eingerichtet."
          : "Buchung wurde storniert. Die Bestätigung wurde per E-Mail gesendet.",
    );
    await Promise.all([loadSchedule(), loadMyBookings()]);
  };

  return (
    <section className="booking-section" id="buchung">
      <div className="container">
        <div className="booking-heading">
          <div>
            <p className="eyebrow"><span /> TCT Court Booking</p>
            <h2>Platz.<br /><em>Einfach buchen.</em></h2>
            <p>Wähle Sportart, Court und Spielzeit. Freie Felder sind sofort buchbar.</p>
          </div>
          {!userId && (
            <button className="booking-login" onClick={onRequireLogin}>
              <LockKeyhole size={16} /> Anmelden zum Buchen
            </button>
          )}
        </div>

        <div className="booking-sport-cards">
          {(["tennis", "padel"] as const).map((entry) => (
            <button
              key={entry}
              className={kind === entry ? "is-active" : ""}
              onClick={() => setKind(entry)}
            >
              <span>{entry === "tennis" ? "Tennis" : "Padel"}</span>
              <b>{kind === entry ? freeSlots : "–"} freie Zeiten heute</b>
              <ArrowRight size={19} />
            </button>
          ))}
        </div>

        <div className="booking-calendar">
          <header>
            <button aria-label="Vorheriger Tag" onClick={() => changeDay(-1)}><ArrowLeft size={19} /></button>
            <div>
              <p className="kicker">{kind === "tennis" ? "TENNIS" : "PADEL"}</p>
              <h3>{formatDay(day)}</h3>
            </div>
            <button aria-label="Nächster Tag" onClick={() => changeDay(1)}><ArrowRight size={19} /></button>
          </header>
          <div className="booking-quick-days">
            {Array.from({ length: 7 }, (_, offset) => offset).map((offset) => {
              const quick = new Date();
              quick.setDate(quick.getDate() + offset);
              const key = toDateKey(quick);
              return <button key={key} className={key === day ? "is-active" : ""} onClick={() => setDay(key)}>{offset === 0 ? "Heute" : offset === 1 ? "Morgen" : new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric" }).format(quick)}</button>;
            })}
          </div>
          <div className="booking-grid-wrap">
            <div className="booking-grid" style={{ gridTemplateColumns: `68px repeat(${visibleCourts.length}, minmax(122px, 1fr))` }}>
              <span className="booking-time-head">ZEIT</span>
              {visibleCourts.map((court) => <span className="booking-court-head" key={court.id}>{court.name}<small>{court.area === "indoor" ? "Halle" : court.kind === "padel" ? "Padel" : "Außen"}</small></span>)}
              {times.map((hour) => (
                <div className="booking-row" key={hour}>
                  <time>{String(hour).padStart(2, "0")}:00</time>
                  {visibleCourts.map((court) => {
                    const busy = busyAt(court.id, slotDate(day, hour));
                    return busy ? <span className={`booking-slot is-busy ${busy.is_own ? "is-own" : ""}`} key={court.id}>{busy.is_own ? "Deine Buchung" : busy.source === "block" ? busy.label : "Belegt"}</span> : <button className="booking-slot is-free" key={court.id} onClick={() => openSlot(court, hour)}>Frei</button>;
                  })}
                </div>
              ))}
            </div>
          </div>
          {loading && <p className="booking-status">Aktualisiere freie Zeiten …</p>}
        </div>

        {userId && (
          <div className="my-bookings">
            <div><p className="eyebrow"><span /> Mitgliederkonto</p><h3>Meine Buchungen.</h3></div>
            {myBookings.length ? <div className="my-booking-list">{myBookings.map((booking) => <article key={booking.id}><div><small>GEBUCHTER PLATZ</small><b>{booking.courts[0]?.name ?? "Court"}</b><span>{booking.courts[0]?.kind === "padel" ? "Padel" : "Tennis"}</span></div><p><CalendarDays size={15} /> {formatDay(booking.starts_at.slice(0, 10))}<br /><Clock3 size={15} /> {formatTime(booking.starts_at)} – {formatTime(booking.ends_at)} Uhr</p><strong>{bookingPrice(booking)}</strong><div className="my-booking-actions"><button className="booking-cancel" onClick={() => void cancelBooking(booking.id)}><X size={23} strokeWidth={3} /><span>Stornieren</span></button></div></article>)}</div> : <p className="booking-empty">Noch keine kommenden Buchungen.</p>}
          </div>
        )}
        {notice && <p className="booking-notice">{notice}</p>}
      </div>

      {pending && selectedEnd && (
        <div className="booking-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Buchung erstellen">
          <div className="booking-sheet">
            <button className="booking-sheet-close" onClick={() => setPending(null)} aria-label="Buchung schließen"><X size={22} /></button>
            {step === "success" ? <div className="booking-success"><Check size={34} /><p className="eyebrow"><span /> Reserviert</p><h3>Platz gebucht.</h3><p>{pending.court.name}, {formatDay(day)} · {formatTime(pending.start)} – {formatTime(selectedEnd)} Uhr</p>{deliveryStatus && <p className="booking-delivery-status">{deliveryStatus}</p>}{pending.court.kind === "padel" && <div className="padel-payment"><b>Bitte überweise {pendingPrice}</b><p><span>Empfänger</span>Padelexpert GbR</p><p><span>Bank</span>Sparkasse Trier</p><p className="padel-iban"><span>IBAN</span><code>DE05 5855 0130 0001 0468 20</code></p></div>}<button className="button button-light" onClick={() => setPending(null)}>Fertig <ArrowRight size={17} /></button></div> : <>
              <p className="eyebrow"><span /> {pending.court.kind === "padel" ? "Padel Court" : "Tennis Court"}</p>
              <h3>{pending.court.name}</h3>
              <p className="booking-sheet-date">{formatDay(day)}<br />{formatTime(pending.start)} – {formatTime(selectedEnd)} Uhr</p>
              {step === "edit" ? <>
                <fieldset><legend>Dauer</legend>{[60, 90].map((value) => <button key={value} className={minutes === value ? "is-active" : ""} onClick={() => setMinutes(value)}>{value} Min</button>)}</fieldset>
                {canBookCourtGroups && pending.court.kind === "tennis" && <fieldset className="booking-group-courts"><legend>Plätze für Mannschaft / Turnier <small>bis zu 4 gleichzeitig</small></legend><div>{visibleCourts.filter((court) => court.id === pending.court.id || courtIsFreeForDuration(court.id, pending.start, minutes)).map((court) => <label key={court.id}><input type="checkbox" checked={selectedCourtIds.includes(court.id)} onChange={() => toggleCourt(court.id)} />{court.name}</label>)}</div></fieldset>}
                <label>E-Mail für die Buchungsbestätigung<input required value={bookingEmail} onChange={(event) => setBookingEmail(event.target.value)} type="email" autoComplete="email" placeholder="name@beispiel.de" /><small className="booking-spam-note">Hinweis: Die Bestätigungs-E-Mail kann derzeit im Spam-Ordner landen. Bitte dort ebenfalls nachsehen.</small></label>
                <label>Spielpartner <small>optional</small><input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Name eingeben …" maxLength={100} /></label>
                {notice && <p className="booking-sheet-notice">{notice}</p>}<button className="button button-light" onClick={reviewBooking}>Buchung prüfen <ArrowRight size={17} /></button>
              </> : <>
                <div className="booking-confirm"><span>Sport</span><b>{pending.court.kind === "padel" ? "Padel" : "Tennis"}</b><span>{selectedCourts.length > 1 ? "Plätze" : "Court"}</span><b>{selectedCourts.map((court) => court.name).join(", ") || pending.court.name}</b><span>Bestätigung an</span><b>{bookingEmail}</b><span>Spielpartner</span><b>{guestName || "Kein Gastspieler"}</b><span>Preis</span><b>{pendingPrice}</b></div><button className="button button-light" onClick={() => void book()}>Verbindlich buchen <Check size={17} /></button><button className="booking-back" onClick={() => setStep("edit")}>Zurück</button>
              </>}
            </>}
          </div>
        </div>
      )}
    </section>
  );
}
