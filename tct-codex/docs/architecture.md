# Architecture

The current build is a Vite + React + TypeScript frontend prototype. Content lives in `src/data/club.ts`, so the UI does not depend on hard-coded facts spread through components. A production CMS can replace this single data adapter without redesigning sections.

## Production next step

Move to Next.js with a server-side content layer; protect `/admin` with role-based authentication; validate all form input server-side; store media in an access-controlled image service; add rate limits and CSRF protection to all mutations.
