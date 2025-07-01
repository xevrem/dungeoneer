import { create_message } from "Console";

export class Component {
  /** @type {import('Game').Game } */
  game;
  /** @type {string} */
  name;

  constructor(props) {
    Object.assign(this, props);
  }

  /**
   * set the game instance
   *
   * @param {import('./Game').Game} game 
   */
  setGame(game) {
    this.game = game;
  }
}

/*
 * COMPONENTS
 */
/** @type {Record<string, Component>} */
export const Components = {};

Components.Moveable = new Component({
  name: "Moveable",
  try_move: function (x, y) {
    //console.log('try_move...', this);
    //get this tile
    var tile = this.game.get_tile(x, y);
    var entity = this.game.get_entity_at(x, y);
    //console.log(entity,tile);
    if (entity) {
      if (
        this.has_component("Attacker") &&
        entity.has_component("Destructable")
      ) {
        this.attack(entity);
        return;
      }
    }

    if (tile.is_walkable) {
      this.x = x;
      this.y = y;
    }
  },
});

Components.Actor = new Component({
  name: "Actor",
  init: function () {
    this.target = null;
  },
  act: function () {
    //attack a target if possible
    if (this.target) {
      //console.log('have target',this.target);
      if (this.game.is_entity_adjacent(this.x, this.y, this.target)) {
        //console.log('is nearby...')
        this.attack(this.target);
        return;
      }
    }

    var dx = Math.floor(Math.random() * 3 - 1);
    var dy = Math.floor(Math.random() * 3 - 1);

    //dont do anything
    if (dx === 0 && dy === 0) return;

    var x = this.x + dx;
    var y = this.y + dy;

    var tile = this.game.get_tile(x, y);
    var entity = this.game.get_entity_at(x, y);

    if (entity) {
      if (
        this.has_component("Attacker") &&
        entity.has_component("Destructable")
      ) {
        if (this.race === entity.race) return;
        this.target = entity;
        this.attack(entity);
        return;
      }
    }

    if (tile.is_walkable) {
      this.x = x;
      this.y = y;
      return;
    }
  },
});

Components.PlayerActor = new Component({
  name: "PlayerActor",
  init: function () {},
  act: function () {
    //issue redraw
    this.game.render();

    //lock the engine - will be released after player moves
    this.game.engine.lock();
  },
});

Components.Attacker = new Component({
  name: "Attacker",
  init: function (template) {
    this.defense_value = template.defense_value || 0;
    this.attack_value = template.attack_value || 1;
  },
  attack: function (target) {
    if (target.has_component("Destructable")) {
      //console.log(this.name,'attacks',target.name);
      var dmg = Math.floor(
        Math.random() * (1 + this.attack_value - target.defense_value),
      );

      if (dmg === 0) {
        create_message(
          this.game,
          this.name + " misses " + target.name,
          "#ff8",
          "#000",
        );
      }

      var msg =
        this.name + " attacks " + target.name + " for " + dmg + " damage.";
      create_message(this.game, msg, "#f80", "#000");
      target.take_damage(this, dmg);
    }
  },
});

Components.Destructable = new Component({
  name: "Destructable",
  init: function (template) {
    this.max_hp = template.max_hp || 10;
    this.hp = template.hp || this.max_hp;
  },
  take_damage(attacker, damage) {
    this.hp -= damage;

    //if you've been attacked set your target
    if (this.has_component("Actor")) this.target = attacker;

    if (this.hp <= 0) {
      //console.log(attacker.name,'killed',this.name);
      create_message(
        attacker.name + " kills " + this.name + ".",
        "#f55",
        "#000",
      );
      this.remove_self();

      if (attacker.has_component("Leveling")) {
        //award xp based on dungeon floor
        attacker.award(this.game.floor);
      }

      if (this.has_component("WinOnDefeat")) {
        this.win_game();
      }

      if (this.has_component("LoseOnDefeat")) {
        this.lose_game(attacker);
      }
    }
  },
});

Components.Usable = new Component({
  name: "Usable",
  init: function (template) {
    this.charges = template.charges || 1;
    this.eternal = template.eternal || false;
  },
  use: function (user) {
    //if healing potion
    if (this.has_component("Healing")) {
      create_message(
        this.game,
        user.name + " uses " + this.name + ".",
        "#88f",
        "#000",
      );
      this.heal(user);
    }

    //if upgrade
    if (this.has_component("Upgrading")) {
      create_message(
        this.game,
        user.name + " picks up a " + this.name + ".",
        "#ddd",
        "#000",
      );
      this.upgrade(user);
    }

    //if changes floor
    if (this.has_component("ChangesFloor")) {
      create_message(
        this.game,
        user.name + " uses " + this.name + ".",
        "#ddd",
        "#000",
      );
      this.change_floor(user);
    }

    //if lower the charges and remove if appropriate
    if (--this.charges <= 0) {
      //remove if not eternal
      if (!this.eternal) this.remove_self();
    }
  },
});

Components.Healing = new Component({
  name: "Healing",
  init: function (template) {
    this.healing_power = template.healing_power || 5;
  },
  heal: function (entity) {
    create_message(
      this.game,
      entity.name +
        " gains " +
        this.healing_power +
        " hp from " +
        this.name +
        ".",
      "#8f8",
      "#000",
    );
    var new_hp = entity.hp + this.healing_power;
    entity.hp = new_hp > entity.max_hp ? entity.max_hp : new_hp;
  },
});

Components.Upgrading = new Component({
  name: "Upgrading",
  init: function (template) {
    this.upgrades = template.upgrades || { HP: 1 };
  },
  upgrade: function (entity) {
    for (var upgrade in this.upgrades) {
      switch (upgrade) {
        case "HP":
          entity.max_hp += this.upgrades["HP"];
          break;
        case "ATK":
          entity.attack_value += this.upgrades["ATK"];
          break;
        case "DEF":
          entity.defense_value += this.upgrades["DEF"];
          break;
        default:
          break;
      }
      create_message(
        this.game,
        entity.name + " gains " + this.upgrades[upgrade] + " " + upgrade + ".",
        "#f8f",
        "#000",
      );
    }
  },
});

Components.Leveling = new Component({
  name: "Leveling",
  init: function (template) {
    this.level = template.level || 1;
    this.xp = template.starting_xp || 0;
    this.next_lvl = template.next_lvl || 5;
  },
  award: function (xp) {
    this.xp += xp;
    create_message(this.game, this.name + " gains experience.", "#88f", "#000");
    if (this.xp >= this.next_lvl) {
      this.level += 1;
      this.attack_value += 1;
      this.max_hp += 5;
      this.hp = this.max_hp;
      this.next_lvl *= 2;
      create_message(this.game, this.name + " levels up.", "#f8f", "#000");
    }
  },
});

Components.ChangesFloor = new Component({
  name: "ChangesFloor",
  init: function (template) {
    this.next_floor = template.next_floor || 2;
  },
  change_floor: function (entity) {
    create_message(
      this.game,
      entity.name + " decends deeper into the dungeon.",
      "#ddd",
      "#000",
    );
    this.game.create_new_floor(this.game.floor + 1);
  },
});

Components.WinOnDefeat = new Component({
  name: "WinOnDefeat",
  win_game: function () {
    create_message(this.game, "You Have Won!", "gold", "#000");
    this.game.Console.render();
    this.game.win_game();
  },
});

Components.LoseOnDefeat = new Component({
  name: "LoseOnDefeat",
  lose_game: function (entity) {
    create_message(this.game, "You Have Lost!", "red", "#000");
    this.game.Console.render();
    this.game.lose_game(entity.name);
  },
});
