import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "@/app/App";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <CurrentUserProvider>
      <App />
    </CurrentUserProvider>
  </BrowserRouter>
);
