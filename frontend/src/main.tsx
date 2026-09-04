import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import "@/styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento #root nao encontrado no HTML.");

createRoot(rootElement).render(
  <BrowserRouter>
    <CurrentUserProvider>
      <App />
    </CurrentUserProvider>
  </BrowserRouter>
);
