import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import "./index.css";
import App from "./App.tsx";

gsap.registerPlugin(useGSAP);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
