import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/app.css";

const RootShell = () => (
  <main className="app-shell" aria-label="aelf Campaign OS">
    <section className="shell-panel">
      <p className="eyebrow">aelf Campaign OS</p>
      <h1>Campaign operations shell</h1>
      <p className="shell-copy">
        Project Console, User App, and Admin/Ops surfaces will be assembled on
        this public-safe TypeScript foundation.
      </p>
      <div className="surface-row" aria-label="Campaign OS surfaces">
        <span>Project Console</span>
        <span>User App</span>
        <span>Admin/Ops</span>
      </div>
    </section>
  </main>
);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <RootShell />
  </React.StrictMode>,
);
