import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "@/app/App";
import { CurrentUserProvider } from "@/contexts/CurrentUserContext";
import { ThemeProvider } from '@/contexts/ThemeContext';
import { PageLoadingProvider } from '@/contexts/PageLoadingContext';
import "@/styles/index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Elemento #root nao encontrado no HTML.");

const router = createBrowserRouter([{ path: '*', element: <App /> }]);

createRoot(rootElement).render(
  <CurrentUserProvider>
    <ThemeProvider>
      <PageLoadingProvider>
        <RouterProvider router={router} />
      </PageLoadingProvider>
    </ThemeProvider>
  </CurrentUserProvider>
);
