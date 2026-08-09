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
  recurring_group_id: string | null;
  status: "confirmed" | "cancelled";
  courts: { name: string; kind: "tennis" | "padel" }[];
};
type WaitlistEntry = {
  id: string;
  court_id: string;
  starts_at: string;
  ends_at: string;
  courts: { name: string }[];
};
type PendingSlot = { court: Court; start: Date; end?: Date };
type BookingRules = {
  advance_days: number;
  max_daily_bookings: number;
  daily_booking_limit_enabled: boolean;
  max_recurring_weeks: number;
  cancellation_hours: number;
};
type UpcomingEvent = { title: string; starts_at: string | null; category: string | null };
type ClubWeather = { temperature: number; wind: number; code: number };

const toDateKey = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const toClubDateKey = (date: Date) => {
  const parts = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const slotDate = (day: string, hour: number) => new Date(`${day}T${String(hour).padStart(2, "0")}:00:00`);
const weatherLabel = (code: number) => {
  if (code === 0) return "Sonnig";
  if ([1, 2].includes(code)) return "Heiter";
  if ([3, 45, 48].includes(code)) return "Bewölkt";
  if ([51, 53, 55, 56, 57].includes(code)) return "Nieseln";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Regnerisch";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Schnee";
  if ([95, 96, 99].includes(code)) return "Gewitter";
  return "Wetter folgt";
};
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
  onRequireLogin,
}: {
  userId: string | null;
  defaultEmail: string;
  onRequireLogin: () => void;
}) {
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [kind, setKind] = useState<"tennis" | "padel">("tennis");
  const [courts, setCourts] = useState<Court[]>([]);
  const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [myWaitlist, setMyWaitlist] = useState<WaitlistEntry[]>([]);
  const [pending, setPending] = useState<PendingSlot | null>(null);
  const [waitlistSlot, setWaitlistSlot] = useState<PendingSlot | null>(null);
  const [minutes, setMinutes] = useState(60);
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [guestName, setGuestName] = useState("");
  const [bookingEmail, setBookingEmail] = useState(defaultEmail);
  const [deliveryStatus, setDeliveryStatus] = useState("");
  const [step, setStep] = useState<"edit" | "confirm" | "success">("edit");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [rules, setRules] = useState<BookingRules | null>(null);
  const [nextEvent, setNextEvent] = useState<UpcomingEvent | null>(null);
  const [weather, setWeather] = useState<ClubWeather | null>(null);

  const loadSchedule = async () => {
    if (!supabase || !userId) {
      setCourts([]);
      setSchedule([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: courtData }, { data: scheduleData, error }, { data: rulesData }, { data: nextEventData }] = await Promise.all([
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
      supabase.from("booking_rules").select("advance_days,max_daily_bookings,daily_booking_limit_enabled,max_recurring_weeks,cancellation_hours").eq("id", true).maybeSingle(),
      supabase.from("events").select("title,starts_at,category").eq("status", "published").gte("starts_at", new Date().toISOString()).order("starts_at").limit(1).maybeSingle(),
    ]);
    if (courtData) setCourts(courtData as Court[]);
    if (scheduleData) setSchedule(scheduleData as ScheduleItem[]);
    if (rulesData) setRules(rulesData as BookingRules);
    if (nextEventData) setNextEvent(nextEventData as UpcomingEvent);
    if (error) setNotice(`Kalender konnte nicht geladen werden: ${error.message}`);
    setLoading(false);
  };

  const loadMyBookings = async () => {
    if (!supabase || !userId) {
      setMyBookings([]);
      setMyWaitlist([]);
      return;
    }
    const { data, error } = await supabase
      .from("court_bookings")
      .select("id,court_id,starts_at,ends_at,partner_name,amount_cents,booking_email,recurring_group_id,status,courts(name,kind)")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(100);
    if (error) {
      setNotice(`Eigene Buchungen konnten nicht geladen werden: ${error.message}`);
      return;
    }
    setMyBookings((data ?? []) as MyBooking[]);
    const { data: waitlistData } = await supabase
      .from("court_waitlist")
      .select("id,court_id,starts_at,ends_at,courts(name)")
      .order("starts_at")
      .limit(12);
    setMyWaitlist((waitlistData ?? []) as WaitlistEntry[]);
  };

  useEffect(() => {
    void loadSchedule();
  }, [day, kind, userId]);
  useEffect(() => {
    void loadMyBookings();
  }, [userId]);
  useEffect(() => {
    if (defaultEmail) setBookingEmail(defaultEmail);
  }, [defaultEmail]);
  useEffect(() => {
    const controller = new AbortController();
    const loadWeather = async () => {
      if (!userId) {
        setWeather(null);
        return;
      }
      try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=49.7499&longitude=6.6371&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FBerlin", { signal: controller.signal });
        const data = await response.json();
        if (response.ok && data.current) {
          setWeather({ temperature: Math.round(data.current.temperature_2m), wind: Math.round(data.current.wind_speed_10m), code: Number(data.current.weather_code) });
        }
      } catch (error) {
        if ((error as DOMException).name !== "AbortError") setWeather(null);
      }
    };
    void loadWeather();
    const refreshInterval = window.setInterval(() => void loadWeather(), 15 * 60 * 1000);
    return () => {
      controller.abort();
      window.clearInterval(refreshInterval);
    };
  }, [userId]);

  const visibleCourts = courts.filter((court) => court.kind === kind);
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
  const freeSlots = useMemo(
    () =>
      visibleCourts.reduce(
        (count, court) =>
          count + times.filter((hour) => !busyAt(court.id, slotDate(day, hour))).length,
        0,
      ),
    [visibleCourts, schedule, day],
  );
  const dailyBookings = useMemo(
    () => myBookings.filter((booking) => toClubDateKey(new Date(booking.starts_at)) === day).length,
    [myBookings, day],
  );
  const dailyFree = Math.max(0, (rules?.max_daily_bookings ?? 3) - dailyBookings);
  const dailyLimitEnabled = rules?.daily_booking_limit_enabled ?? true;

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
    setMinutes(60);
    setRepeatWeeks(1);
    setGuestName("");
    setBookingEmail(defaultEmail);
    setDeliveryStatus("");
    setStep("edit");
    setNotice("");
  };

  const openWaitlist = (court: Court, hour: number) => {
    if (!userId) {
      setNotice("Bitte melde dich an, um dich auf die Warteliste zu setzen.");
      onRequireLogin();
      return;
    }
    const start = slotDate(day, hour);
    const existingBooking = busyAt(court.id, start);
    setWaitlistSlot({
      court,
      start,
      end: existingBooking ? new Date(existingBooking.ends_at) : new Date(start.getTime() + 60 * 60_000),
    });
    setNotice("");
  };

  const book = async () => {
    if (!supabase || !pending) return;
    const { data, error } = repeatWeeks > 1
      ? await supabase.rpc("book_recurring_courts", {
          target_court_id: pending.court.id,
          first_start: pending.start.toISOString(),
          requested_minutes: minutes,
          weeks: repeatWeeks,
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
    const booking = (Array.isArray(data) ? data[0] : data) as { id: string };
    const { data: delivery, error: deliveryError } = await supabase.functions.invoke(
      "booking-confirmation",
      { body: { bookingId: booking.id } },
    );
    const emailStatus = deliveryError || delivery?.error
      ? `Die Buchung ist gespeichert, aber die Bestätigungs-E-Mail konnte nicht gesendet werden: ${delivery?.error ?? deliveryError?.message ?? "Unbekannter Fehler"}`
      : delivery?.skipped
        ? "Die Buchung ist gespeichert. Der automatische E-Mail-Versand wird noch eingerichtet."
        : `Bestätigung wurde an ${bookingEmail.trim()} gesendet.`;
    setDeliveryStatus(repeatWeeks > 1 ? `${repeatWeeks} wöchentliche Termine wurden gespeichert. ${emailStatus}` : emailStatus);
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
    await supabase.functions.invoke("waitlist-notification", {
      body: { bookingId: booking.id },
    });
    await Promise.all([loadSchedule(), loadMyBookings()]);
  };

  const joinWaitlist = async () => {
    if (!supabase || !waitlistSlot || !userId || !defaultEmail) return;
    const { error } = await supabase.from("court_waitlist").insert({
      user_id: userId,
      court_id: waitlistSlot.court.id,
      starts_at: waitlistSlot.start.toISOString(),
      ends_at: (waitlistSlot.end ?? new Date(waitlistSlot.start.getTime() + 60 * 60_000)).toISOString(),
      booking_email: defaultEmail,
    });
    if (error) {
      setNotice(
        error.code === "23505"
          ? "Du bist für diesen Termin bereits auf der Warteliste."
          : "Warteliste konnte nicht gespeichert werden: " + error.message,
      );
      return;
    }
    setWaitlistSlot(null);
    setNotice("Du bist auf der Warteliste. Sobald der Platz frei wird, erhältst du eine E-Mail.");
    await loadMyBookings();
  };

  const removeWaitlistEntry = async (id: string) => {
    if (!supabase) return;
    const { error } = await supabase.from("court_waitlist").delete().eq("id", id);
    if (error) {
      setNotice(error.message);
      return;
    }
    setMyWaitlist((items) => items.filter((entry) => entry.id !== id));
  };

  if (!userId) {
    return (
      <section className="booking-section booking-auth-gate" id="buchung">
        <div className="container">
          <div className="booking-auth-card">
            <span className="booking-auth-icon"><LockKeyhole size={24} /></span>
            <p className="eyebrow"><span /> TCT Mitgliederbereich</p>
            <h2>Erst anmelden.<br /><em>Dann aufschlagen.</em></h2>
            <p>Freie Plätze, Buchungen, Wartelisten und persönliche Kontingente sind ausschließlich für angemeldete TCT-Mitglieder sichtbar.</p>
            <button className="button button-light" type="button" onClick={onRequireLogin}>
              Anmelden oder Konto erstellen <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="booking-section" id="buchung">
      <div className="container">
        <div className="booking-heading">
          <div>
            <p className="eyebrow"><span /> TCT Court Booking</p>
            <h2>Platz.<br /><em>Einfach buchen.</em></h2>
            <p>Wähle Sportart, Court und Spielzeit. Freie Felder sind sofort buchbar.</p>
          </div>
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

        <section className="club-today" aria-labelledby="club-today-title">
          <div className="club-today-heading">
            <p className="eyebrow"><span /> Live vom Moselstadion</p>
            <h3 id="club-today-title">Heute im Club.</h3>
          </div>
          <div className="club-today-grid">
            <article><small>WETTER IN TRIER</small><b>{weather ? `${weather.temperature}°` : "–"}</b><span>{weather ? `${weatherLabel(weather.code)} · Wind ${weather.wind} km/h` : "Wird geladen …"}</span></article>
            <article><small>FREIE ZEITEN</small><b>{loading ? "–" : freeSlots}</b><span>{kind === "tennis" ? "heute auf den Tennisplätzen" : "heute auf dem Padel Court"}</span></article>
            <article><small>BUCHUNGSREGEL</small><b>{dailyLimitEnabled ? `${rules?.max_daily_bookings ?? 3} pro Tag` : "Unbegrenzt"}</b><span>{rules ? `${rules.advance_days} Tage im Voraus · Storno bis ${rules.cancellation_hours} Std.` : "Wird geladen …"}</span></article>
            <article><small>NÄCHSTER CLUBTERMIN</small><b>{nextEvent?.title ?? "Aktuell kein Termin"}</b><span>{nextEvent?.starts_at ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" }).format(new Date(nextEvent.starts_at)) : "Alle Termine im Turnierkalender"}</span></article>
          </div>
        </section>

        {userId && (
          <section className="booking-quota" aria-label="Dein Buchungskontingent">
            <div>
              <p className="kicker">DEIN TAGESKONTINGENT</p>
              <b>{dailyLimitEnabled ? `${dailyFree} frei` : "Unbegrenzt"}</b>
              <span>
                {dailyLimitEnabled
                  ? `${dailyBookings} von ${rules?.max_daily_bookings ?? 3} Buchungen am ${formatDay(day)} genutzt`
                  : "Die Tagesbegrenzung ist momentan deaktiviert"}
              </span>
            </div>
            <p>
              {dailyLimitEnabled
                ? `Reguläre Mitglieder können pro Kalendertag bis zu ${rules?.max_daily_bookings ?? 3} Termine buchen. Berechtigte Rollen sind davon ausgenommen.`
                : "Admin und Management haben die Tagesbegrenzung momentan aufgehoben."}
            </p>
          </section>
        )}

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
                    if (busy) {
                      return busy.is_own ? (
                        <span className="booking-slot is-busy is-own" key={court.id}>
                          Deine Buchung
                        </span>
                      ) : (
                        <button
                          className="booking-slot is-busy is-waitlist"
                          key={court.id}
                          onClick={() => openWaitlist(court, hour)}
                        >
                          Warteliste
                        </button>
                      );
                    }
                    return <button className="booking-slot is-free" key={court.id} onClick={() => openSlot(court, hour)}>Frei</button>;
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
            {myBookings.length ? <div className="my-booking-list">{myBookings.map((booking) => <article key={booking.id}><div><small>GEBUCHTER PLATZ</small><b>{booking.courts[0]?.name ?? "Court"}</b><span>{booking.courts[0]?.kind === "padel" ? "Padel" : "Tennis"}</span></div><p><CalendarDays size={15} /> {formatDay(booking.starts_at.slice(0, 10))}<br /><Clock3 size={15} /> {formatTime(booking.starts_at)} – {formatTime(booking.ends_at)} Uhr</p>{booking.partner_name && <p className="booking-for"><small>GEBUCHT FÜR</small>{booking.partner_name}</p>}<strong>{bookingPrice(booking)}</strong><div className="my-booking-actions"><button className="booking-cancel" onClick={() => void cancelBooking(booking.id)}><X size={23} strokeWidth={3} /><span>Stornieren</span></button></div></article>)}</div> : <p className="booking-empty">Noch keine kommenden Buchungen.</p>}
          </div>
        )}
        {userId && myWaitlist.length > 0 && (
          <section className="waitlist-list">
            <div>
              <p className="eyebrow"><span /> Mitgliederkonto</p>
              <h3>Meine Warteliste.</h3>
            </div>
            {myWaitlist.map((entry) => (
              <article key={entry.id}>
                <div>
                  <b>{entry.courts[0]?.name ?? "Court"}</b>
                  <span>
                    {formatDay(entry.starts_at.slice(0, 10))} ·{" "}
                    {formatTime(entry.starts_at)} – {formatTime(entry.ends_at)} Uhr
                  </span>
                </div>
                <button type="button" onClick={() => void removeWaitlistEntry(entry.id)}>
                  Austragen
                </button>
              </article>
            ))}
          </section>
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
                <label>
                  Wiederholung
                  <select value={repeatWeeks} onChange={(event) => setRepeatWeeks(Number(event.target.value))}>
                    <option value="1">Einmalig</option>
                    <option value="2">2 Wochen lang, wöchentlich</option>
                    <option value="3">3 Wochen lang, wöchentlich</option>
                    <option value="4">4 Wochen lang, wöchentlich</option>
                  </select>
                  <small>Für feste Spieltermine. Jeder Termin muss bei der Buchung frei sein.</small>
                </label>
                <label>E-Mail für die Buchungsbestätigung<input required value={bookingEmail} onChange={(event) => setBookingEmail(event.target.value)} type="email" autoComplete="email" placeholder="name@beispiel.de" /><small className="booking-spam-note">Hinweis: Die Bestätigungs-E-Mail kann derzeit im Spam-Ordner landen. Bitte dort ebenfalls nachsehen.</small></label>
                <label>Gebucht für <small>optional · dieser Name ist für andere angemeldete Mitglieder im Kalender sichtbar</small><input value={guestName} onChange={(event) => setGuestName(event.target.value)} placeholder="Name der spielenden Person" maxLength={100} /></label>
                {notice && <p className="booking-sheet-notice">{notice}</p>}<button className="button button-light" onClick={reviewBooking}>Buchung prüfen <ArrowRight size={17} /></button>
              </> : <>
                <div className="booking-confirm"><span>Sport</span><b>{pending.court.kind === "padel" ? "Padel" : "Tennis"}</b><span>Court</span><b>{pending.court.name}</b><span>Bestätigung an</span><b>{bookingEmail}</b><span>Gebucht für</span><b>{guestName || "Nicht angegeben"}</b><span>Wiederholung</span><b>{repeatWeeks === 1 ? "Einmalig" : repeatWeeks + " wöchentliche Termine"}</b><span>Preis</span><b>{pendingPrice}</b></div><button className="button button-light" onClick={() => void book()}>Verbindlich buchen <Check size={17} /></button><button className="booking-back" onClick={() => setStep("edit")}>Zurück</button>
              </>}
            </>}
          </div>
        </div>
      )}
      {waitlistSlot && (
        <div className="booking-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Warteliste">
          <div className="booking-sheet waitlist-sheet">
            <button className="booking-sheet-close" onClick={() => setWaitlistSlot(null)} aria-label="Warteliste schließen"><X size={22} /></button>
            <p className="eyebrow"><span /> TCT Warteliste</p>
            <h3>Platz gerade belegt.</h3>
            <p className="booking-sheet-date">
              {waitlistSlot.court.name}<br />
              {formatDay(day)} · {formatTime(waitlistSlot.start)} – {formatTime(waitlistSlot.end ?? new Date(waitlistSlot.start.getTime() + 60 * 60_000))} Uhr
            </p>
            <p>
              Sobald genau dieser Termin frei wird, bekommst du eine E-Mail und
              kannst den Platz direkt buchen. Die Warteliste reserviert den Platz
              nicht automatisch.
            </p>
            <button className="button button-light" onClick={() => void joinWaitlist()}>
              Auf Warteliste setzen <Check size={17} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
