import { AppProviders } from "./AppProviders";
import { AppRouter } from "@/routes";

export default function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  );
}
