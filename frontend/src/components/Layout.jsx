import Sidebar from "./Sidebar.jsx";
import TopBar from "./TopBar.jsx";

export default function Layout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <aside className="w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <TopBar />

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}