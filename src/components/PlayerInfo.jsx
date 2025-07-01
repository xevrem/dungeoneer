import React from "react";

export function PlayerInfo(props) {
  var lvl = props.player ? props.player.level : 0;
  var hp = props.player ? props.player.hp : 0;
  var atk = props.player ? props.player.attack_value : 0;
  var def = props.player ? props.player.defense_value : 0;
  var xp = props.player ? props.player.xp : 0;
  var flr = props.floor ? props.floor : 0;
  return (
    <div className="player-info">
      <p className="inline">Level: {lvl}</p>
      <p className="inline">HP: {hp}</p>
      <p className="inline">Attack: {atk}</p>
      <p className="inline">Defense: {def}</p>
      <p className="inline">XP: {xp}</p>
      <p className="inline">Floor: {flr}</p>
    </div>
  );
}
