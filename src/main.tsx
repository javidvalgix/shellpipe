import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import Updater from "./components/Updater";
import "./styles/globals-origin.css";
import TitleBar from "./components/titlebar";
import { getCurrentWindow } from "@tauri-apps/api/window";

document.addEventListener("contextmenu", (e) => e.preventDefault());

function Root() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    setWindowLabel(getCurrentWindow().label);
  }, []);

  if (windowLabel === null) return null;

  if (windowLabel === "updater") {
    return <Updater />;
  }

  return (
    <>
      <TitleBar />
      <App />
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
);
