import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/global.css";

// Apply saved theme preference on startup
const savedTheme = localStorage.getItem("nos_limites_theme");
if (savedTheme === "dark" || savedTheme === "light") {
  document.documentElement.setAttribute("data-theme", savedTheme);
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
