import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import "./admin.css";
import "./audit.css";
import "./logo.css";
import "./ticker.css";
import "./filters.css";
import "./experiences.css";
import "./teams.css";
import "./events-admin.css";
import "./live-events.css";
import "./team-admin.css";
import "./team-gallery.css";
import "./news-detail.css";
import "./news-gallery.css";
import "./media-library.css";
import "./team-lightbox.css";
import "./team-lightbox-fix.css";
import "./news-archive.css";
import "./site-search.css";
import "./mobile-search.css";
import "./events-manager.css";
import "./downloads.css";
import "./archive.css";
import "./content-manager.css";
import "./clean-home.css";
import "./ai-assistant.css";
import "./admin-task-list.css";
import "./privacy.css";
import "./booking.css";
import "./booking-overrides.css";
import "./booking-admin.css";
import "./padel-booking.css";
import "./booking-route.css";
import "./tournament-contact.css";
import "./site-pages.css";
import "./motion-plus.css";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
