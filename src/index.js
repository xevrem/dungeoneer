import React from "react";
import ReactDOM from "react-dom";

import { App } from "components/App";
import registerServiceWorker from "./registerServiceWorker";
import { Game } from "Game";

/*
 * GAME CLASS
 */
var game = new Game();

ReactDOM.render(<App game={game} />, document.getElementById("app"));
registerServiceWorker();
