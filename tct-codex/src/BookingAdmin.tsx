import { useEffect, useState, type FormEvent } from "react";
import { Check, X } from "lucide-react";
import { supabase } from "./lib/supabase";

type Court = { id: string; name: string };
type CourtBlock = { id: string; title: string; starts_at: string; ends_at: string; courts: { name: string }[] };
type Rules = { advance_days: number; max_active_bookings: number; default_minutes: number; cancellation_hours: number; allow_guest: boolean };

const localDateTime = (date: string, time: string) => new Date(`${date}T${time}:00`).toISOString();
const dateTime = (value: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function BookingAdmin({ open, close }: { open: boolean; close: () => void }) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [blocks, setBlocks] = useState<CourtBlock[]>([]);
  const [rules, setRules] = useState<Rules | null>(null);
  const [notice, setNotice] = useState("");

  const load = async () => {
    if (!supabase) return;
    const [{ data: courtData }, { data: blockData }, { data: ruleData }] = await Promise.all([
      supabase.from("courts").select("id,name").eq("active", true).order("sort_order"),
      supabase.from("court_blocks").select("id,title,starts_at,ends_at,courts(name)").gte("ends_at", new Date().toISOString()).order("starts_at").limit(80),
      supabase.from("booking_rules").select("advance_days,max_active_bookings,default_minutes,cancellation_hours,allow_guest").eq("id", true).maybeSingle(),
    ]);
    if (courtData) setCourts(courtData as Court[]);
    if (blockData) setBlocks(blockData as CourtBlock[]);
    if (ruleData) setRules(ruleData as Rules);
  };
  useEffect(() => { if (open) void load(); }, [open]);

  const createBlock = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const selectedCourtIds = form.getAll("courtIds").map(String);
    if (!selectedCourtIds.length) {
      setNotice("Bitte wähle mindestens einen Platz aus.");
      return;
    }
    const { data, error } = await supabase.rpc("create_court_blocks", {
      target_court_ids: selectedCourtIds,
      requested_start: localDateTime(String(form.get("date")), String(form.get("startsAt"))),
      requested_end: localDateTime(String(form.get("date")), String(form.get("endsAt"))),
      block_title: String(form.get("title")).trim(),
      repeat_mode: String(form.get("repeatMode")),
      repeat_count: Number(form.get("repeatCount")),
    });
    if (error) { setNotice(`Sperrzeit konnte nicht erstellt werden: ${error.message}`); return; }
    event.currentTarget.reset();
    setNotice(`${data} Sperrzeit${data === 1 ? "" : "en"} gespeichert.`);
    await load();
  };

  const deleteBlock = async (id: string) => {
    if (!supabase || !window.confirm("Diese Sperrzeit wirklich entfernen?")) return;
    const { error } = await supabase.from("court_blocks").delete().eq("id", id);
    if (error) { setNotice(error.message); return; }
    setBlocks((items) => items.filter((item) => item.id !== id));
    setNotice("Sperrzeit entfernt.");
  };

  const saveRules = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("booking_rules").update({
      advance_days: Number(form.get("advanceDays")),
      max_active_bookings: Number(form.get("maxBookings")),
      default_minutes: Number(form.get("defaultMinutes")),
      cancellation_hours: Number(form.get("cancellationHours")),
      allow_guest: form.get("allowGuest") === "on",
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    if (error) { setNotice(`Regeln konnten nicht gespeichert werden: ${error.message}`); return; }
    setNotice("Buchungsregeln gespeichert.");
    await load();
  };

  if (!open) return null;
  const today = new Date().toISOString().slice(0, 10);
  return <div className="editor-overlay booking-admin" role="dialog" aria-modal="true" aria-label="Buchungen verwalten">
    <button className="admin-close" onClick={close} aria-label="Buchungsverwaltung schließen"><X size={23} /></button>
    <div className="booking-admin-card">
      <div><p className="eyebrow"><span /> Platzverwaltung</p><h2>Plätze.<br /><em>Im Griff.</em></h2><p>Sperrzeiten und Buchungsregeln gelten sofort für das Mitgliederportal.</p></div>
      {notice && <p className="admin-notice">{notice}</p>}
      <div className="booking-admin-grid">
        <form onSubmit={createBlock}>
          <p className="kicker">PLATZ SPERREN</p>
          <label>Plätze <small>Mehrfachauswahl für Turniere möglich</small><select required name="courtIds" multiple size={Math.min(8, Math.max(4, courts.length))}>{courts.map((court) => <option value={court.id} key={court.id}>{court.name}</option>)}</select></label>
          <label>Grund<input required name="title" defaultValue="Platzpflege" maxLength={100} /></label>
          <label>Datum<input required name="date" type="date" min={today} defaultValue={today} /></label>
          <div className="booking-time-fields"><label>Von<input required name="startsAt" type="time" defaultValue="14:00" /></label><label>Bis<input required name="endsAt" type="time" defaultValue="18:00" /></label></div>
          <label>Wiederholung<select name="repeatMode" defaultValue="once"><option value="once">Einmalig</option><option value="daily">Täglich</option><option value="weekly">Wöchentlich</option></select></label>
          <label>Anzahl Termine<input required name="repeatCount" type="number" min="1" max="52" defaultValue="1" /></label>
          <button className="button button-light" type="submit">Sperrzeit speichern <Check size={17} /></button>
        </form>
        <form onSubmit={saveRules}>
          <p className="kicker">BUCHUNGSREGELN</p>
          <label>Vorausbuchung in Tagen<input required name="advanceDays" type="number" min="1" max="30" defaultValue={rules?.advance_days ?? 7} /></label>
          <label>Max. gleichzeitige Buchungen<input required name="maxBookings" type="number" min="1" max="20" defaultValue={rules?.max_active_bookings ?? 3} /></label>
          <label>Standard-Spielzeit<select name="defaultMinutes" defaultValue={rules?.default_minutes ?? 60}><option value="60">60 Minuten</option><option value="90">90 Minuten</option><option value="120">120 Minuten</option></select></label>
          <label>Storno bis Stunden vorher<input required name="cancellationHours" type="number" min="0" max="48" defaultValue={rules?.cancellation_hours ?? 2} /></label>
          <label className="booking-check"><input name="allowGuest" type="checkbox" defaultChecked={rules?.allow_guest ?? true} /> Gastspieler erlauben</label>
          <button className="button button-light" type="submit">Regeln speichern <Check size={17} /></button>
        </form>
      </div>
      <div className="booking-block-list"><p className="kicker">KOMMENDE SPERRZEITEN</p>{blocks.length ? blocks.map((block) => <article key={block.id}><div><b>{block.courts[0]?.name}</b><span>{block.title}</span></div><time>{dateTime(block.starts_at)} – {new Intl.DateTimeFormat("de-DE", { timeStyle: "short" }).format(new Date(block.ends_at))}</time><button onClick={() => void deleteBlock(block.id)}>Entfernen</button></article>) : <p>Keine Sperrzeiten geplant.</p>}</div>
    </div>
  </div>;
}
