import "./style.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Display } from "./Display";
import { Organizer } from "./Organizer";
import { localStorageStore } from "./storage";
import type { Tournament } from "./tournament";

// Two routes: the organizer route (laptop) and the display route (#/display, a second window on the TV).
const store = localStorageStore<Tournament>("cribbage-tournament");
const onDisplay = location.hash === "#/display";
document.body.classList.toggle("display", onDisplay);

createRoot(document.querySelector("#app")!).render(
  <StrictMode>
    {onDisplay ? <Display store={store} /> : <Organizer store={store} />}
  </StrictMode>,
);

window.addEventListener("hashchange", () => location.reload());
