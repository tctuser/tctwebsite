# TCT Admin – einmalige Supabase-Einrichtung

## 1. Tabellen und Rechte anlegen

1. Im Supabase-Projekt links **SQL Editor** öffnen.
2. **New query** klicken.
3. Den vollständigen Inhalt von `supabase/schema.sql` einfügen und **Run** drücken.

## 2. Adminkonto anlegen

1. Links **Authentication → Users** öffnen.
2. **Add user → Create new user** wählen.
3. Eigene E-Mail und ein langes Passwort setzen.
4. Im SQL Editor diese Abfrage ausführen und die E-Mail ersetzen:

```sql
insert into public.profiles (id, role, display_name)
select id, 'admin', 'TCT Administration'
from auth.users
where email = 'DEINE-EMAIL@BEISPIEL.DE'
on conflict (id) do update set role = 'admin';
```

## 3. Medienordner erstellen

Unter **Storage** einen Bucket mit dem Namen `club-media` erstellen. Bilder dürfen öffentlich lesbar sein, Schreibrechte erhalten nur Admins/Editoren über die Policies aus `schema.sql`.

Danach kann das Konto über den Button **Admin** auf der Website angemeldet werden.

## 4. Kontakt-Postfach aktivieren

1. Im **SQL Editor** eine neue Abfrage öffnen.
2. Den vollständigen Inhalt von `supabase/contact-inbox.sql` einfügen und **Run** drücken.
3. Auf der Website als Admin anmelden und unten rechts **Kontakt-Postfach** öffnen.

Anfragen aus dem Kontaktformular werden danach sicher in Supabase gespeichert. Sie können nur von Accounts mit der Rolle `admin` oder `editor` gelesen, als gelesen markiert oder archiviert werden.

## 5. Änderungslog aktualisieren

Falls das Änderungslog bereits eingerichtet ist, den vollständigen Inhalt von `supabase/audit-and-undo.sql` erneut im **SQL Editor** ausführen. Das ergänzt die E-Mail-Adresse der bearbeitenden Person für neue Einträge und aktualisiert die Datenbank-Funktionen gefahrlos.
