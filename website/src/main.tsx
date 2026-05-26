
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import App from "./app/App.tsx";
import Dashboard from "./platform/pages/Dashboard.tsx";
import GatewayDetail from "./platform/pages/GatewayDetail.tsx";
import PatientView from "./platform/pages/PatientView.tsx";
import LiveView from "./platform/pages/LiveView.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Routes>
      {/* Marketing site */}
      <Route path="/" element={<App />} />

      {/* Platform app */}
      <Route path="/platform/" element={<Dashboard />} />
      <Route path="/platform/gateway/:id" element={<GatewayDetail />} />
      <Route path="/platform/patient/:id" element={<PatientView />} />
      <Route path="/platform/live/:gatewayId" element={<LiveView />} />
    </Routes>
  </BrowserRouter>
);
  