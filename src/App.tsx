import { BrowserRouter, Routes, Route } from "react-router-dom";
import GruhasundariEstimate from "./components/gruhasundari-estimate";
import GruhasundariAdminEstimate from "./components/gruhasundari-admin-estimate";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GruhasundariEstimate />} />

        {/* 👇 YOUR ADMIN ROUTE */}
        <Route path="/admin" element={<GruhasundariAdminEstimate />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
