import React from "react";
import { createRoot } from "react-dom/client";

import { App } from "components/App";
import { Game } from "Game";
import registerServiceWorker from "./registerServiceWorker";

/*
 * GAME CLASS
 */
const MOUNT_NODE = document.getElementById("app");
const root = createRoot(MOUNT_NODE);
const game = new Game();
root.render(<App game={game} />);

// registerServiceWorker();
