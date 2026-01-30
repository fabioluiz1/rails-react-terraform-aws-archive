import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RewardsList } from "./components/rewards/RewardsList";
import { Navigation } from "./components/navigation/Navigation";
import { RedemptionHistory } from "./components/redemptions/RedemptionHistory";
import { 
  RedemptionHistory as AdminRedemptionHistory 
} from "./components/admin/redemptions/RedemptionHistory";
import styles from "./App.module.css";

export default function App() {
  return (
    <ErrorBoundary>
      <Navigation />
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<RewardsList />} />
          <Route path="/redemptions" element={<RedemptionHistory />} />
          <Route path="/admin/redemptions" element={<AdminRedemptionHistory />} />
        </Routes>
      </main>
    </ErrorBoundary>
  );
}
