import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "@/app/App";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import "@/styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento #root nao encontrado no HTML.");

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(rootElement).render(
  <CurrentUserProvider>
    <RouterProvider router={router} />
  </CurrentUserProvider>
);
