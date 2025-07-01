import * as ROT from "rot-js";
import { Console } from "./Console";
import { dynamic_goblin, dynamic_stairs_down, Templates } from "./Templates";
import { Entity } from "./Entity";
import { glyphs } from "./constants";

export class Game {
  constructor() {
    this.display = null;
    this.container = null;
    this.w = 50;
    this.h = 30;
    this.map = [];
    this.free = [];
    this.entities = [];
    this.Console = null;
    this.console_display = null;
    this.cw = 50;
    this.ch = 5;
    this.floor = 1;
    this.r = 10;
    this.final_floor = 5;
    this.game_over = false;
  }

  init() {
    this.display = new ROT.Display({
      width: this.w,
      height: this.h,
      fontFamily: "Ubuntu Mono",
      fontSize: 15,
      forceSquareRatio: true,
    });

    this.console_display = new ROT.Display({
      width: this.cw,
      height: this.ch,
      fontFamily: "Ubuntu Mono",
      fontSize: 15,
      forceSquareRatio: true,
    });

    this.Console = new Console(this, this.console_display, this.ch);
    this.Console.init();

    this.scheduler = new ROT.Scheduler.Simple();
    this.engine = new ROT.Engine(this.scheduler);

    this.fov = new ROT.FOV.PreciseShadowcasting(
      this.handle_lightpass.bind(this),
    );

    this.display_canvas = this.display.getContainer();
    this.display_canvas.id = "display-canvas";

    this.console_canvas = this.console_display.getContainer();
    this.console_canvas.id = "console-canvas";

    document.getElementById("displays").appendChild(this.display_canvas);
    document.getElementById("displays").appendChild(this.console_canvas);
  }

  generate_map() {
    var newmap = new ROT.Map.Uniform(this.w, this.h, {
      roomWidth: [3, 10],
      roomHeight: [3, 10],
      roomDugPercentage: 0.3,
    });
    newmap.create(this.handle_map.bind(this));
  }

  create_new_floor(current = 0) {
    this.cleanup();

    this.floor = current;

    this.generate_map();

    //remake the engine and scheduler
    //this.scheduler = new ROT.Scheduler.Simple();
    ///this.engine = new ROT.Engine(this.scheduler);

    var [x, y] = this.get_safe_location();
    this.player.x = x;
    this.player.y = y;
    this.entities.push(this.player);
    this.scheduler.add(this.player, true);

    for (var i = 0; i < 10; i++) {
      [x, y] = this.get_safe_location();
      new Entity(this, x, y, "Goblin", dynamic_goblin(this.floor));
    }

    for (var i = 0; i < 3; i++) {
      [x, y] = this.get_safe_location();
      new Entity(this, x, y, "Potion", Templates.HealingPotion);
    }

    [x, y] = this.get_safe_location();
    new Entity(this, x, y, "Weapon", Templates.Weapon);

    [x, y] = this.get_safe_location();
    new Entity(this, x, y, "Armor", Templates.Armor);

    if (this.floor !== this.final_floor) {
      [x, y] = this.get_safe_location();
      new Entity(this, x, y, "Stairs", dynamic_stairs_down());
    }

    //spawn goblin king
    if (this.floor === this.final_floor) {
      [x, y] = this.get_safe_location();
      new Entity(this, x, y, "Goblin King", Templates.GoblinKing);
    }
  }

  cleanup() {
    for (var e of this.entities) {
      if (e.has_component("Actor") || e.has_component("PlayerActor"))
        this.scheduler.remove(e);
    }
    this.entities.splice(0, this.entities.length);
    this.free.splice(0, this.free.length);
    this.map.splice(0, this.map.length);
  }

  handle_map(x, y, v) {
    //set tile key
    var tile = {
      glyph: v ? "WALL" : "FLOOR",
      is_walkable: v ? false : true,
      is_light_passible: v ? false : true,
      uncovered: false,
      entities: [],
    };
    //store free cells
    if (!v) this.free.push([x, y, x * this.h + y]);
    //push a new tile onto map, allows multiple objects per coord
    this.map.push(tile);
  }

  get_safe_location() {
    return this.free[Math.floor(Math.random() * this.free.length)];
  }

  get_tile(x, y) {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h)
      return this.map[x * this.h + y];
    return null;
  }

  //get entity at location and ignore any specific name passed
  get_entity_at(x, y, ignore = "") {
    if (x >= 0 && x < this.w && y >= 0 && y < this.h) {
      for (var e of this.entities) {
        if (e.x === x && e.y === y) {
          if (e.name !== ignore) return e;
        }
      }
    }
  }

  is_entity_adjacent(x, y, entity) {
    for (var i = -1; i < 2; i++) {
      for (var j = -1; j < 2; j++) {
        //dont look for yourself
        if (i === 0 && j === 0) continue;

        if (x + i === entity.x && y + j === entity.y) {
          return true;
        }
      }
    }
    return false;
  }

  create_player() {
    var [x, y] = this.get_safe_location();
    this.player = new Entity(this, x, y, "Player", Templates.Player);
  }

  remove_entity(entity) {
    for (var i in this.entities) {
      if (entity === this.entities[i]) this.entities.splice(i, 1);
    }
  }

  send_message(message) {
    this.Console.add_message(message);
  }

  win_game() {
    this.game_over = true;
    this.cleanup();
    this.display.clear();

    this.display.drawText(16, 12, "%c{gold}Congratulations!!!");
    this.display.drawText(
      8,
      13,
      "%c{gold}You Have Defeated The %c{#8f8}Goblin King%c{gold}!",
    );
    this.display.drawText(11, 15, "To Play Again, Press [ENTER]");
  }

  lose_game(creature_name) {
    this.game_over = true;
    this.cleanup();
    this.display.clear();

    this.display.drawText(20, 12, "%c{red}You Died!!!");
    var msg = "The " + creature_name + " Defeated You.";
    this.display.drawText(
      Math.floor(this.w / 2) - Math.floor(msg.length / 2),
      13,
      msg,
    );
    this.display.drawText(11, 15, "To Play Again, Press [ENTER]");
  }

  after_render_callback(cb) {
    this.after_render = cb;
  }

  //return the light passed attribute for the given tile
  handle_lightpass(x, y) {
    var tile = this.get_tile(x, y);
    return tile ? tile.is_light_passible : false;
  }

  handle_fov_compute(x, y, r, v) {
    this.display.draw(x, y, ...glyphs[this.map[x * this.h + y].glyph]);
    //see if there are any visible entities, ignoring player
    var entity = this.get_entity_at(x, y, "Player");
    if (entity) {
      // console.log(entity);
      this.display.draw(entity.x, entity.y, ...glyphs[entity.glyph]);
    }
  }

  render() {
    this.display.clear();

    //compute and draw the field of view at the player's position
    this.fov.compute(
      this.player.x,
      this.player.y,
      this.r,
      this.handle_fov_compute.bind(this),
    );

    //ensure player drawn over top
    this.display.draw(
      this.player.x,
      this.player.y,
      ...glyphs[this.player.glyph],
    );

    //draw console
    this.Console.render();

    //issue_callback
    this.after_render();
  }

  render_old() {
    this.display.clear();

    //draw base map
    for (var x = 0; x < this.w; x++) {
      for (var y = 0; y < this.h; y++) {
        this.display.draw(x, y, ...glyphs[this.map[x * this.h + y].glyph]);
      }
    }

    //draw entities
    for (var e of this.entities) {
      this.display.draw(e.x, e.y, ...glyphs[e.glyph]);
    }

    //ensure player drawn over top
    this.display.draw(
      this.player.x,
      this.player.y,
      ...glyphs[this.player.glyph],
    );

    //draw console
    this.Console.render();

    //issue_callback
    this.after_render();
  }
}
