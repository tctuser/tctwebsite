# TCT Benutzerverwaltung einrichten

## 1. Rollen in der Datenbank aktivieren

PostgreSQL benötigt dafür zwei getrennte Abfragen:

1. Zuerst den vollständigen Inhalt von `supabase/user-roles-enum.sql` im Supabase **SQL Editor** ausführen.
2. Danach erst den vollständigen Inhalt von `supabase/user-roles.sql` ausführen.

## 2. Edge Functions bereitstellen

Im Terminal im Projektordner einmal Supabase anmelden und das Projekt verknüpfen. Danach:

```powershell
npx supabase functions deploy admin-users
npx supabase functions deploy login-username --no-verify-jwt
```

`admin-users` akzeptiert nur dein angemeldetes Eigentümer-Konto `elfinko008@icloud.com`. Die zweite Function löst ausschließlich einen gewählten Benutzernamen in die hinterlegte Login-E-Mail auf, damit die Supabase-Anmeldung den Passwortcheck weiter selbst übernimmt.

## Rollen

- **Vollzugriff**: News, Bilder, Einstellungen, Mannschaften und Termine.
- **Vollzugriff Redaktion**: ebenfalls vollständige redaktionelle Arbeit.
- **Redaktion & Medien**: News, Beiträge und Bilder.
- **Nur Turniere**: Turniere und Termine.
- **Nur Mannschaften**: Mannschaftsinformationen.

Nur das Eigentümer-Konto kann Benutzer anlegen oder Rollen verändern. Neue Zugänge müssen beim ersten Login ein eigenes Passwort setzen.
