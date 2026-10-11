import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Content } from "./content/Content.tsx";
import { App } from "./ui/App.tsx";
import "./ui/style.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App content={<Content />} />
  </StrictMode>,
);
