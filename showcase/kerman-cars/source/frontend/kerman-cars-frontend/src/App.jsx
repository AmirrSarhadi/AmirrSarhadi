import { ThemeSync } from "./components/theme/ThemeToggle";
import AppRouter from "./router/AppRouter";
import SessionBoundary from "./components/SessionBoundary";

function App() {
  return <><ThemeSync /><a className="skip-link" href="#main-content">رفتن به محتوای اصلی</a><SessionBoundary><AppRouter /></SessionBoundary></>;
}

export default App;
