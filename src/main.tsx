import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./style.css";
// Remove the inventory fragment before Firebase or application effects run.
const collectorFragment = window.location.hash.startsWith("#hardware=")
  ? window.location.hash
  : "";
if (collectorFragment)
  window.history.replaceState(
    null,
    "",
    window.location.pathname + window.location.search,
  );
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App collectorFragment={collectorFragment} />
  </React.StrictMode>,
);
