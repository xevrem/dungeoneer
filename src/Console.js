//message creation helper
/**
 * use game to print message
 *
 * @param {import('Game').Game} game
 * @param {string} text
 * @param {string} fg_color
 * @param {string} bg_color
 */
export function create_message(game, text, fg_color, bg_color) {
  var msg = {
    text: text,
    fg: fg_color || "#fff",
    bg: bg_color || "#000",
  };
  game.send_message(msg);
}

export class Console {
  constructor(game, display, size) {
    this.display = display;
    this.buffer = [];
    this.buffer_size = size;
    this.cursor = 0;
    this.game = game;
  }

  init() {
    create_message(this.game, "Welcome to Dungeoneer: The Roguelike!");
    create_message(this.game, "Move: [W,A,S,D], Use: [U], Look: [L]");
    create_message(
      this.game,
      "Defeat the Goblin King on floor " + this.game.final_floor + " to win.",
    );
    create_message(
      this.game,
      "You fall through the ground and find yourself",
      "#88f",
      "#000",
    );
    create_message(
      this.game,
      "in a dungeon. There are goblins nearby...",
      "#88f",
      "#000",
    );
  }

  clear_buffer() {
    this.buffer = [];
    this.cursor = 0;
    for (var i = 0; i < this.buffer_size - 4; i++) {
      this.buffer.push({ text: "", fg: "", bg: "" });
    }
    this.display.clear();
  }

  add_message(message) {
    this.buffer[this.cursor % this.buffer_size] = message;
    this.cursor += 1;
  }

  render() {
    this.display.clear();
    for (var i = 0; i < this.buffer_size; i++) {
      var index = (this.cursor + i) % this.buffer_size;
      this.display.drawText(
        0,
        i,
        "%c{" +
          this.buffer[index].fg +
          "}%b{" +
          this.buffer[index].bg +
          "}" +
          this.buffer[index].text,
      );
    }
  }
}
