import { Routes, Route } from "react-router-dom";
import Hero from "./pages/Hero.jsx";
import Register from "./pages/Register.jsx";
import Invest from "./pages/Invest.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Refer from "./pages/Refer.jsx";
import Team from "./pages/Team.jsx";
import TeamTree from "./pages/TeamTree.jsx";
import Withdraw from "./pages/Withdraw.jsx";
import History from "./pages/History.jsx";
import AdminLogin from "./pages/admin/AdminLogin.jsx";
import AdminOverview from "./pages/admin/AdminOverview.jsx";
import AdminUsers from "./pages/admin/AdminUsers.jsx";
import AdminTransfers from "./pages/admin/AdminTransfers.jsx";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals.jsx";
import AdminSettings from "./pages/admin/AdminSettings.jsx";
import PrivacyPolicy from "./pages/legal/PrivacyPolicy.jsx";
import Terms from "./pages/legal/Terms.jsx";
import RiskDisclaimer from "./pages/legal/RiskDisclaimer.jsx";
import RefundPolicy from "./pages/legal/RefundPolicy.jsx";
import MaintenanceGate from "./components/MaintenanceGate.jsx";
import AuthGate from "./components/AuthGate.jsx";

// Wrap a user page: maintenance check -> wallet connect/verify gate -> page.
function Protected({ children, require }) {
  return (
    <MaintenanceGate>
      <AuthGate require={require}>{children}</AuthGate>
    </MaintenanceGate>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Admin panel — normal browser, no wallet needed. Not affected by maintenance. */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminOverview />} />
      <Route path="/admin/users" element={<AdminUsers />} />
      <Route path="/admin/transfers" element={<AdminTransfers />} />
      <Route path="/admin/withdrawals" element={<AdminWithdrawals />} />
      <Route path="/admin/settings" element={<AdminSettings />} />

      {/* Legal pages — fully public, no wallet or maintenance gate. */}
      <Route path="/legal/privacy" element={<PrivacyPolicy />} />
      <Route path="/legal/terms" element={<Terms />} />
      <Route path="/legal/risk" element={<RiskDisclaimer />} />
      <Route path="/legal/refund" element={<RefundPolicy />} />

      {/* Public landing — connecting happens here. */}
      <Route path="/" element={<MaintenanceGate><Hero /></MaintenanceGate>} />

      {/* Wallet-gated user app. AuthGate blocks direct access + fake wallets. */}
      <Route path="/register" element={<Protected require="verified"><Register /></Protected>} />
      <Route path="/invest" element={<Protected require="registered"><Invest /></Protected>} />
      <Route path="/dashboard" element={<Protected require="registered"><Dashboard /></Protected>} />
      <Route path="/refer" element={<Protected require="registered"><Refer /></Protected>} />
      <Route path="/team" element={<Protected require="registered"><Team /></Protected>} />
      <Route path="/team/tree" element={<Protected require="registered"><TeamTree /></Protected>} />
      <Route path="/withdraw" element={<Protected require="registered"><Withdraw /></Protected>} />
      <Route path="/history" element={<Protected require="registered"><History /></Protected>} />
    </Routes>
  );
}
