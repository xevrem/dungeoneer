import { Components } from "Components";

/*
 * STATIC TEMPLATES
 */
export const Templates = {};

Templates.Player = {
  glyph: "PLAYER",
  race: "HUMAN",
  max_hp: 10,
  attack_value: 2,
  defense_value: 0,
  components: [
    Components.Moveable,
    Components.PlayerActor,
    Components.Attacker,
    Components.Destructable,
    Components.Leveling,
    Components.LoseOnDefeat,
  ],
};

Templates.Goblin = {
  glyph: "GOBLIN",
  race: "GOBLIN",
  max_hp: 3,
  attack_value: 2,
  defense_value: 0,
  components: [
    Components.Moveable,
    Components.Actor,
    Components.Attacker,
    Components.Destructable,
  ],
};

Templates.HealingPotion = {
  glyph: "HEALING_POTION",
  healing_power: 5,
  charges: 1,
  components: [Components.Usable, Components.Healing],
};

Templates.Weapon = {
  glyph: "WEAPON",
  charges: 1,
  upgrades: {
    ATK: 1,
  },
  components: [Components.Usable, Components.Upgrading],
};

Templates.Armor = {
  glyph: "ARMOR",
  charges: 1,
  upgrades: {
    DEF: 1,
  },
  components: [Components.Usable, Components.Upgrading],
};

Templates.GoblinKing = {
  glyph: "GOBLIN_KING",
  race: "GOBLIN",
  max_hp: 40,
  attack_value: 10,
  defense_value: 5,
  components: [
    Components.Moveable,
    Components.Actor,
    Components.Attacker,
    Components.Destructable,
    Components.WinOnDefeat,
  ],
};

/*
 * DYNAMIC TEMPLATES
 */

export function dynamic_goblin(floor) {
  return {
    glyph: "GOBLIN",
    race: "GOBLIN",
    max_hp: 5 + 2 * floor,
    attack_value: 1 + floor,
    defense_value: floor - 1,
    components: [
      Components.Moveable,
      Components.Actor,
      Components.Attacker,
      Components.Destructable,
    ],
  };
}

export function dynamic_stairs_down(floor) {
  return {
    glyph: "STAIRS_DOWN",
    next_floor: floor + 1,
    eternal: true,
    components: [Components.Usable, Components.ChangesFloor],
  };
}
