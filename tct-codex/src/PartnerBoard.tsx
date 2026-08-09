import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, CalendarDays, Mail, Plus, Trash2, UsersRound } from "lucide-react";
import { supabase } from "./lib/supabase";

type PartnerPost = {
  id: string;
  user_id: string;
  display_name: string;
  contact_email: string;
  level: string;
  availability: string;
  message: string | null;
  expires_at: string;
  created_at: string;
};

export function PartnerBoard({
  userId,
  defaultEmail,
  displayName,
  onRequireLogin,
}: {
  userId: string | null;
  defaultEmail: string;
  displayName: string;
  onRequireLogin: () => void;
}) {
  const [posts, setPosts] = useState<PartnerPost[]>([]);
  const [open, setOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const loadPosts = async () => {
    if (!supabase || !userId) {
      setPosts([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("partner_requests")
      .select("id,user_id,display_name,contact_email,level,availability,message,expires_at,created_at")
      .eq("active", true)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (error) setNotice(`Gesuche konnten nicht geladen werden: ${error.message}`);
    else setPosts((data ?? []) as PartnerPost[]);
    setLoading(false);
  };

  useEffect(() => {
    void loadPosts();
  }, [userId]);

  const createPost = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase || !userId) return;
    const form = new FormData(event.currentTarget);
    const { error } = await supabase.from("partner_requests").insert({
      user_id: userId,
      display_name: displayName.trim() || "TCT Mitglied",
      contact_email: defaultEmail,
      level: String(form.get("level") ?? "").trim(),
      availability: String(form.get("availability") ?? "").trim(),
      message: String(form.get("message") ?? "").trim() || null,
    });
    if (error) {
      setNotice(`Gesuch konnte nicht veröffentlicht werden: ${error.message}`);
      return;
    }
    event.currentTarget.reset();
    setOpen(false);
    setNotice("Dein Gesuch ist 14 Tage sichtbar. Du kannst es jederzeit wieder entfernen.");
    await loadPosts();
  };

  const removePost = async (id: string) => {
    if (!supabase || !window.confirm("Dein Gesuch wirklich entfernen?")) return;
    const { error } = await supabase.from("partner_requests").delete().eq("id", id);
    if (error) setNotice(`Gesuch konnte nicht entfernt werden: ${error.message}`);
    else {
      setPosts((items) => items.filter((item) => item.id !== id));
      setNotice("Gesuch wurde entfernt.");
    }
  };

  return (
    <section className="partner-board route-spielpartner" aria-labelledby="partner-board-title">
      <div className="container">
        <div className="partner-board-head">
          <div>
            <p className="eyebrow"><span /> Nur für TCT-Mitglieder</p>
            <h2 id="partner-board-title">Finde deinen<br /><em>Tennispartner.</em></h2>
            <p>Für eine Runde nach Feierabend, das nächste Match oder regelmäßige Termine. Kontaktdaten sehen nur angemeldete Mitglieder.</p>
          </div>
          {userId ? (
            <button className="button button-light" onClick={() => { setOpen((value) => !value); setNotice(""); }}>
              <Plus size={18} /> Gesuch erstellen
            </button>
          ) : (
            <button className="button button-light" onClick={onRequireLogin}>
              Anmelden zum Mitspielen <ArrowRight size={18} />
            </button>
          )}
        </div>

        {open && userId && (
          <form className="partner-form" onSubmit={(event) => void createPost(event)}>
            <label>Deine Spielstärke<input name="level" required maxLength={50} placeholder="z. B. LK 15–18 oder Freizeit" /></label>
            <label>Wann passt es dir?<input name="availability" required maxLength={120} placeholder="z. B. Dienstag und Donnerstag ab 18 Uhr" /></label>
            <label>Kurze Nachricht <small>optional</small><textarea name="message" maxLength={500} placeholder="Zum Beispiel: Suche regelmäßigen Partner für Einzel oder Doppel." /></label>
            <p>Dein Name und deine Konto-E-Mail werden nur angemeldeten TCT-Mitgliedern angezeigt.</p>
            <button className="button button-dark" type="submit">Gesuch veröffentlichen <ArrowRight size={17} /></button>
          </form>
        )}

        {notice && <p className="partner-notice">{notice}</p>}
        {!userId ? (
          <div className="partner-lock"><UsersRound size={26} /><p>Bitte melde dich mit deinem TCT-Konto an, um aktuelle Gesuche zu sehen oder selbst eines zu erstellen.</p></div>
        ) : loading ? <p className="partner-empty">Gesuche werden geladen …</p> : posts.length ? (
          <div className="partner-list">
            {posts.map((post) => (
              <article key={post.id}>
                <div className="partner-avatar" aria-hidden="true">{post.display_name.slice(0, 1).toUpperCase()}</div>
                <div>
                  <div className="partner-title"><h3>{post.display_name}</h3>{post.user_id === userId && <span>Dein Gesuch</span>}</div>
                  <p><b>{post.level}</b><span /> {post.availability}</p>
                  {post.message && <blockquote>„{post.message}“</blockquote>}
                  <small><CalendarDays size={14} /> sichtbar bis {new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(post.expires_at))}</small>
                </div>
                {post.user_id === userId ? (
                  <button className="partner-remove" onClick={() => void removePost(post.id)} aria-label="Eigenes Gesuch entfernen"><Trash2 size={18} /> Entfernen</button>
                ) : (
                  <a className="partner-contact" href={`mailto:${post.contact_email}?subject=${encodeURIComponent("TCT Spielpartner")}`}><Mail size={17} /> Kontakt</a>
                )}
              </article>
            ))}
          </div>
        ) : <p className="partner-empty">Noch keine Gesuche. Mach den Anfang und finde jemanden für dein nächstes Match.</p>}
      </div>
    </section>
  );
}
