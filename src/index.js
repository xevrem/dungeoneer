import React from 'react';
import ReactDOM from 'react-dom';

import './index.css';
//import {createStore} from 'redux'
import registerServiceWorker from './registerServiceWorker';
import ROT from 'rot-js';

var glyphs = {
  //wall
  'WALL':['#','#653','#320'],
  //floor
  'FLOOR':['.','#aaa','#333'],
  //player
  'PLAYER':['@','#ddd','#333'],
  //Goblin
  'GOBLIN':['g','#5f5','#333'],
  //Goblin King
  'GOBLIN_KING':['G','#5f5','#333'],
  //Potion
  'HEALING_POTION':['!','#88f','#333'],
  //Armor
  'ARMOR':['a','#ff8','#333'],
  //Weapon
  'WEAPON':['w','#875','#333'],
  //Stairs down
  'STAIRS_DOWN':['v','#ddd','#333'],
};



/*
* GAME CLASS
*/

class Game {
  constructor(){
    this.display = null;
    this.container = null;
    this.w =  50;
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
    this.final_floor=5;
    this.game_over = false;
  }

  init(){
    this.display = new ROT.Display({
      width:this.w,
      height:this.h,
      fontFamily: 'Ubuntu Mono',
      fontSize:15,
      forceSquareRatio: true
    });

    this.console_display = new ROT.Display({
      width: this.cw,
      height: this.ch,
      fontFamily: 'Ubuntu Mono',
      fontSize: 15,
      forceSquareRatio: true,
    });

    this.Console = new Console(this.console_display, this.ch);
    this.Console.init();

    this.scheduler = new ROT.Scheduler.Simple();
    this.engine = new ROT.Engine(this.scheduler);

    this.fov = new ROT.FOV.PreciseShadowcasting(this.handle_lightpass.bind(this));

    this.display_canvas = this.display.getContainer();
    this.display_canvas.id = 'display-canvas';

    this.console_canvas = this.console_display.getContainer();
    this.console_canvas.id = 'console-canvas'

    document.getElementById('displays').appendChild(this.display_canvas);
    document.getElementById('displays').appendChild(this.console_canvas);
  }

  generate_map(){

    var newmap = new ROT.Map.Uniform(this.w, this.h,{
      roomWidth:[3,10],
      roomHeight:[3,10],
      roomDugPercentage: 0.3,
    });
    newmap.create(this.handle_map.bind(this));
  }

  create_new_floor(current=0){
    this.cleanup();

    this.floor = current;

    this.generate_map();

    //remake the engine and scheduler
    //this.scheduler = new ROT.Scheduler.Simple();
    ///this.engine = new ROT.Engine(this.scheduler);

    var [x,y] = this.get_safe_location();
    this.player.x = x;
    this.player.y = y;
    this.entities.push(this.player);
    this.scheduler.add(this.player, true);

    for(var i = 0; i<10; i++){
      [x,y] = this.get_safe_location();
      new Entity(x,y,'Goblin', dynamic_goblin(this.floor));
    }

    for(var i = 0; i < 3; i++){
      [x,y] = this.get_safe_location();
      new Entity(x,y,'Potion', Templates.HealingPotion);
    }

    [x,y] = this.get_safe_location();
    new Entity(x,y, 'Weapon', Templates.Weapon);

    [x,y] = this.get_safe_location();
    new Entity(x,y, 'Armor', Templates.Armor);

    if(this.floor !== this.final_floor){
      [x,y] = this.get_safe_location();
      new Entity(x,y, 'Stairs', dynamic_stairs_down());
    }

    //spawn goblin king
    if(this.floor === this.final_floor){
      [x,y] = this.get_safe_location();
      new Entity(x,y,'Goblin King', Templates.GoblinKing);
    }

  }

  cleanup(){
    for(var e of this.entities){
      if(e.has_component('Actor') || e.has_component('PlayerActor'))
        game.scheduler.remove(e);
    }
    this.entities.splice(0,this.entities.length);
    this.free.splice(0,this.free.length);
    this.map.splice(0,this.map.length);
  }

  handle_map(x,y,v){
    //set tile key
    var tile = {
      glyph: v ? 'WALL': 'FLOOR',
      is_walkable: v ? false : true,
      is_light_passible: v ? false : true,
      uncovered: false,
      entities:[],
    };
    //store free cells
    if(!v) this.free.push([x, y, x*this.h+y]);
    //push a new tile onto map, allows multiple objects per coord
    this.map.push(tile);
  }

  get_safe_location(){
    return this.free[Math.floor(Math.random() * this.free.length)];
  }

  get_tile(x, y){
    if(x >= 0 && x < this.w && y>=0 && y < this.h)
      return this.map[x*this.h+y];
    return null;
  }

  //get entity at location and ignore any specific name passed
  get_entity_at(x,y, ignore=''){
    if(x >= 0 && x < this.w && y>=0 && y < this.h){
      for(var e of this.entities){
        if(e.x === x && e.y === y){
          if(e.name !== ignore)
            return e;
        }
      }
    }
  }

  is_entity_adjacent(x,y, entity){
    for(var i = -1; i<2; i++){
      for(var j = -1; j<2; j++){
        //dont look for yourself
        if(i === 0 && j === 0) continue;

        if((x+i === entity.x) && (y+j === entity.y)){
          return true;
        }
      }
    }
    return false;
  }

  create_player(){
    var [x,y] = this.get_safe_location();
    this.player = new Entity(x, y, 'Player', Templates.Player);
  }

  remove_entity(entity){
    for(var i in this.entities){
      if(entity === this.entities[i])
        this.entities.splice(i,1);
    }
  }

  send_message(message){
    this.Console.add_message(message);
  }

  win_game(){
    this.game_over = true;
    this.cleanup();
    this.display.clear();

    this.display.drawText(16,12,'%c{gold}Congratulations!!!');
    this.display.drawText(8,13,'%c{gold}You Have Defeated The %c{#8f8}Goblin King%c{gold}!');
    this.display.drawText(11,15,'To Play Again, Press [ENTER]');
  }

  lose_game(creature_name){
    this.game_over = true;
    this.cleanup();
    this.display.clear();

    this.display.drawText(20,12,'%c{red}You Died!!!');
    var msg = 'The '+creature_name+' Defeated You.';
    this.display.drawText(Math.floor(this.w/2) - Math.floor(msg.length/2), 13, msg);
    this.display.drawText(11,15,'To Play Again, Press [ENTER]');
  }

  after_render_callback(cb){
    this.after_render = cb;
  }

  //return the light passed attribute for the given tile
  handle_lightpass(x, y){
    var tile = this.get_tile(x,y);
    return tile ? tile.is_light_passible : false;
  }

  handle_fov_compute(x,y,r,v){
    this.display.draw(x,y, ...glyphs[this.map[x*this.h+y].glyph]);
    //see if there are any visible entities, ignoring player
    var entity = this.get_entity_at(x,y,'Player');
    if(entity){
      // console.log(entity);
      this.display.draw(entity.x, entity.y, ...glyphs[entity.glyph]);
    }
  }

  render(){
    this.display.clear();

    //compute and draw the field of view at the player's position
    this.fov.compute(this.player.x, this.player.y, this.r, this.handle_fov_compute.bind(this));

    //ensure player drawn over top
    this.display.draw(this.player.x, this.player.y, ...glyphs[this.player.glyph]);

    //draw console
    this.Console.render();

    //issue_callback
    this.after_render();
  }

  render_old(){
    this.display.clear();

    //draw base map
    for(var x = 0; x < this.w; x++){
      for(var y = 0; y < this.h; y++){
        this.display.draw(x,y, ...glyphs[this.map[x*this.h+y].glyph]);
      }
    }

    //draw entities
    for(var e of this.entities){
      this.display.draw(e.x, e.y, ...glyphs[e.glyph]);
    }

    //ensure player drawn over top
    this.display.draw(this.player.x, this.player.y, ...glyphs[this.player.glyph]);

    //draw console
    this.Console.render();

    //issue_callback
    this.after_render();
  }
}

var game = new Game();


/*
* CONSOLE
*/

//message creation helper
function create_message (text, fg_color, bg_color){
  var msg = {
    text: text,
    fg: fg_color || '#fff',
    bg: bg_color || '#000',
  };
  game.send_message(msg);
}

class Console{
  constructor(display, size){
    this.display = display;
    this.buffer = [];
    this.buffer_size = size;
    this.cursor = 0;
  }

  init(){
    create_message('Welcome to Dungeoneer: The Roguelike!');
    create_message('Move: [W,A,S,D], Use: [U], Look: [L]');
    create_message('Defeat the Goblin King on floor '+game.final_floor+' to win.');
    create_message('You fall through the ground and find yourself','#88f','#000');
    create_message('in a dungeon. There are goblins nearby...','#88f','#000');
  }

  clear_buffer(){
    this.buffer = [];
    this.cursor = 0;
    for(var i = 0; i < this.buffer_size-4; i++){
      this.buffer.push({text:'', fg:'', bg:''});
    }
    this.display.clear();
  }

  add_message(message){
    this.buffer[this.cursor%this.buffer_size] = message;
    this.cursor += 1;
  }

  render(){
    this.display.clear();
    for(var i = 0; i < this.buffer_size; i++){
      var index = (this.cursor + i) % this.buffer_size;
      this.display.drawText(0,i,'%c{'+this.buffer[index].fg+'}%b{'+this.buffer[index].bg+'}'+this.buffer[index].text);
    }
  }
}


/*
* COMPONENTS
*/
var Components={};
Components.Moveable = {
  name: 'Moveable',
  try_move: function(x, y){
    //console.log('try_move...', this);
    //get this tile
    var tile = game.get_tile(x, y);
    var entity = game.get_entity_at(x, y);
    //console.log(entity,tile);
    if(entity){
      if(this.has_component('Attacker') && entity.has_component('Destructable')){
        this.attack(entity);
        return;
      }
    }

    if(tile.is_walkable){
      this.x = x;
      this.y = y;
    }

  },
};


Components.Actor = {
  name: 'Actor',
  init: function() {
    this.target = null;
  },
  act: function(){

    //attack a target if possible
    if(this.target){
      //console.log('have target',this.target);
      if(game.is_entity_adjacent(this.x, this.y, this.target)){
        //console.log('is nearby...')
        this.attack(this.target);
        return;
      }
    }

    var dx = Math.floor(Math.random() * 3 - 1);
    var dy = Math.floor(Math.random() * 3 - 1);

    //dont do anything
    if(dx === 0 && dy === 0)
      return;

    var x = this.x + dx;
    var y = this.y + dy;

    var tile = game.get_tile(x,y);
    var entity = game.get_entity_at(x,y);

    if(entity){
      if(this.has_component('Attacker') && entity.has_component('Destructable')){
        if(this.race === entity.race)
          return;
        this.target = entity;
        this.attack(entity);
        return;
      }
    }

    if(tile.is_walkable){
      this.x = x;
      this.y = y;
      return;
    }
  }
};

Components.PlayerActor = {
  name:'PlayerActor',
  init: function() {},
  act: function(){
    //issue redraw
    game.render();

    //lock the engine - will be released after player moves
    game.engine.lock();
  }
};

Components.Attacker={
  name:'Attacker',
  init: function(template) {
    this.defense_value = template.defense_value || 0;
    this.attack_value = template.attack_value || 1;
  },
  attack: function(target){
    if(target.has_component('Destructable')){
      //console.log(this.name,'attacks',target.name);
      var dmg = Math.floor(Math.random()*(1+this.attack_value - target.defense_value));

      if(dmg === 0){
        create_message(this.name+' misses '+target.name,'#ff8','#000');
      }

      var msg = this.name + ' attacks ' + target.name + ' for ' + dmg + ' damage.';
      create_message(msg, '#f80','#000');
      target.take_damage(this, dmg);
    }
  }
};

Components.Destructable ={
  name:'Destructable',
  init: function(template) {
    this.max_hp = template.max_hp || 10;
    this.hp = template.hp || this.max_hp;
  },
  take_damage(attacker, damage){
    this.hp -= damage;

    //if you've been attacked set your target
    if(this.has_component('Actor')) this.target = attacker;

    if(this.hp <= 0){
      //console.log(attacker.name,'killed',this.name);
      create_message(attacker.name + ' kills ' + this.name+'.', '#f55','#000');
      this.remove_self();

      if(attacker.has_component('Leveling')){
        //award xp based on dungeon floor
        attacker.award(game.floor);
      }

      if(this.has_component('WinOnDefeat')){
        this.win_game();
      }

      if(this.has_component('LoseOnDefeat')){
        this.lose_game(attacker);
      }
    }
  }
};

Components.Usable = {
  name: 'Usable',
  init: function(template){
    this.charges = template.charges || 1;
    this.eternal = template.eternal || false;
  },
  use: function(user){
    //if healing potion
    if(this.has_component('Healing')){
      create_message(user.name+' uses '+this.name+'.','#88f','#000');
      this.heal(user);
    }

    //if upgrade
    if(this.has_component('Upgrading')){
      create_message(user.name+' picks up a '+this.name+'.','#ddd','#000');
      this.upgrade(user);
    }

    //if changes floor
    if(this.has_component('ChangesFloor')){
      create_message(user.name+' uses '+this.name+'.', '#ddd','#000');
      this.change_floor(user);
    }

    //if lower the charges and remove if appropriate
    if(--this.charges <= 0){
      //remove if not eternal
      if(!this.eternal)
        this.remove_self();
    }
  }
};

Components.Healing = {
  name: 'Healing',
  init: function(template){
    this.healing_power = template.healing_power || 5;
  },
  heal: function(entity){
    create_message(entity.name+' gains '+this.healing_power+' hp from '+this.name+'.','#8f8','#000');
    var new_hp = entity.hp + this.healing_power;
    entity.hp =  new_hp > entity.max_hp ? entity.max_hp : new_hp;
  }
};

Components.Upgrading = {
  name: 'Upgrading',
  init: function(template){
    this.upgrades = template.upgrades || {'HP':1};
  },
  upgrade: function(entity){
    for(var upgrade in this.upgrades){
      switch(upgrade){
      case 'HP':
        entity.max_hp += this.upgrades['HP'];
        break;
      case 'ATK':
        entity.attack_value += this.upgrades['ATK'];
        break;
      case 'DEF':
        entity.defense_value += this.upgrades['DEF'];
        break;
      default:
        break;
      }
      create_message(entity.name+' gains '+this.upgrades[upgrade]+' '+upgrade+'.','#f8f','#000');
    }
  }
};

Components.Leveling = {
  name: 'Leveling',
  init: function(template){
    this.level = template.level || 1;
    this.xp = template.starting_xp || 0;
    this.next_lvl = template.next_lvl || 5;
  },
  award: function(xp){
    this.xp += xp;
    create_message(this.name+' gains experience.','#88f','#000');
    if(this.xp >= this.next_lvl){
      this.level += 1;
      this.attack_value += 1;
      this.max_hp += 5;
      this.hp = this.max_hp;
      this.next_lvl *= 2;
      create_message(this.name+' levels up.','#f8f','#000');
    }
  }
};

Components.ChangesFloor = {
  name: 'ChangesFloor',
  init:function(template){
    this.next_floor = template.next_floor || 2;
  },
  change_floor:function(entity){
    create_message(entity.name+' decends deeper into the dungeon.','#ddd','#000');
    game.create_new_floor(game.floor+1);
  }
};

Components.WinOnDefeat = {
  name: 'WinOnDefeat',
  win_game:function(){
    create_message('You Have Won!', 'gold', '#000');
    game.Console.render();
    game.win_game();
  }
};

Components.LoseOnDefeat = {
  name: 'LoseOnDefeat',
  lose_game:function(entity){
    create_message('You Have Lost!', 'red', '#000');
    game.Console.render();
    game.lose_game(entity.name);
  }
};

/*
* STATIC TEMPLATES
*/
var Templates = {};

Templates.Player = {
  glyph: 'PLAYER',
  race: 'HUMAN',
  max_hp: 10,
  attack_value: 2,
  defense_value: 0,
  components: [Components.Moveable, Components.PlayerActor, Components.Attacker, Components.Destructable, Components.Leveling, Components.LoseOnDefeat]
};

Templates.Goblin = {
  glyph: 'GOBLIN',
  race: 'GOBLIN',
  max_hp: 3,
  attack_value: 2,
  defense_value: 0,
  components: [Components.Moveable, Components.Actor, Components.Attacker, Components.Destructable]
};

Templates.HealingPotion = {
  glyph: 'HEALING_POTION',
  healing_power: 5,
  charges: 1,
  components: [Components.Usable, Components.Healing]
};

Templates.Weapon = {
  glyph: 'WEAPON',
  charges: 1,
  upgrades:{
    'ATK':1,
  },
  components:[Components.Usable, Components.Upgrading]
};

Templates.Armor = {
  glyph: 'ARMOR',
  charges: 1,
  upgrades:{
    'DEF':1,
  },
  components:[Components.Usable, Components.Upgrading]
};

Templates.GoblinKing ={
  glyph: 'GOBLIN_KING',
  race: 'GOBLIN',
  max_hp: 40,
  attack_value: 10,
  defense_value: 5,
  components: [Components.Moveable, Components.Actor, Components.Attacker, Components.Destructable, Components.WinOnDefeat]
};

/*
* DYNAMIC TEMPLATES
*/

const dynamic_goblin = floor =>{
  return {
    glyph: 'GOBLIN',
    race: 'GOBLIN',
    max_hp: 5 + 2 * floor,
    attack_value: 1 + floor,
    defense_value: floor - 1,
    components: [Components.Moveable, Components.Actor, Components.Attacker, Components.Destructable]
  };
};

const dynamic_stairs_down = floor =>{
  return {
    glyph: 'STAIRS_DOWN',
    next_floor: floor+1,
    eternal: true,
    components: [Components.Usable, Components.ChangesFloor]
  };
};

/*
* ENTITIES
*/

class Entity {
  constructor(x, y, name, template){
    this.x = x;
    this.y = y;
    this.name = name;

    this.apply_template(template);

    //add to game
    game.entities.push(this);

    //add to engine
    if(this.has_component('Actor') || this.has_component('PlayerActor'))
      game.scheduler.add(this, true);
  }

  //applies template
  apply_template(template){
    for(var key in template){
      //console.log(key, template[key]);
      //check to see if this is a component
      if(key === 'components'){
        this.add_components(template[key], template);
      }
      this[key] = template[key];
    }
    return template;
  }

  //adds component mixins
  add_components(components, template){
    for(var i in components){
      for(var key in components[i]){
        //don't copy ovesr component name, init method, or overwrite anything
        if(key !== 'init' && key !== 'name' && !this.hasOwnProperty(key)){
          this[key] = components[i][key];
        }
      }

      //call component's init method
      if(components[i].init)
        components[i].init.call(this, template);
    }
  }

  has_component(component){
    for(var c of this.components){
      if(c.name === component){
        return true;
      }
    }
    return false;
  }

  remove_self(){
    if(this.has_component('Actor') || this.has_component('PlayerActor'))
      game.scheduler.remove(this);

    game.remove_entity(this);
  }
}

/*
* REACT STUFF
*/

const PlayerInfo = props => {
  var lvl = props.player ? props.player.level : 0;
  var hp = props.player ? props.player.hp : 0;
  var atk = props.player ? props.player.attack_value : 0;
  var def = props.player ? props.player.defense_value : 0;
  var xp = props.player ? props.player.xp : 0;
  var flr = props.floor ? props.floor : 0;
  return (
    <div className="player-info">
      <p className='inline'>Level: {lvl}</p>
      <p className="inline">HP: {hp}</p>
      <p className="inline">Attack: {atk}</p>
      <p className="inline">Defense: {def}</p>
      <p className="inline">XP: {xp}</p>
      <p className="inline">Floor: {flr}</p>
    </div>
  );
};

class App extends React.Component{
  constructor(){
    super();
    this.state = {
      game: game,
    };
  }

  // componentWillMount(){
  //
  // }

  componentDidMount(){
    this.state.game.init();

    var handle_render = this.handle_render.bind(this);
    this.state.game.after_render_callback(handle_render);

    var handle_input = this.handle_input.bind(this);
    window.addEventListener('keydown', handle_input);

    this.state.game.generate_map();

    //create character
    this.state.game.create_player();

    var x,y;
    for(var i = 0; i < 10; i++){
      [x,y] = this.state.game.get_safe_location();
      new Entity(x,y, 'Goblin', Templates.Goblin);
    }

    for(var i = 0; i < 3; i++){
      [x,y] = this.state.game.get_safe_location();
      new Entity(x,y, 'Potion', Templates.HealingPotion);
    }

    [x,y] = this.state.game.get_safe_location();
    new Entity(x,y, 'Weapon', Templates.Weapon);

    [x,y] = this.state.game.get_safe_location();
    new Entity(x,y, 'Armor', Templates.Armor);

    [x,y] = this.state.game.get_safe_location();
    new Entity(x,y, 'Stairs', dynamic_stairs_down());

    // [x,y] = this.state.game.get_safe_location();
    // new Entity(x,y, 'Goblin King', Templates.GoblinKing);

    this.state.game.engine.start();

    this.state.game.render();
  }

  handle_input(event){
    event.preventDefault();

    if(this.state.game.game_over){
      //restart the game
      if(event.key === 'Enter'){
        game.player =  new Entity(0, 0, 'Player', Templates.Player);
        game.create_new_floor(1);
        game.game_over = false;
        game.render();
        game.Console.clear_buffer();
        game.Console.init();
      }
      //done allow other controls
      return;
    }

    //handle movement
    if(event.key === 'w' || event.key === 'ArrowUp'){
      //move UP
      this.move(0, -1);
    } else if (event.key === 'a' || event.key === 'ArrowLeft'){
      //upove LEFT
      this.move(-1,0);
    } else if (event.key === 's' || event.key === 'ArrowDown'){
      //move DOWN
      this.move(0,1);
    } else if (event.key === 'd' || event.key === 'ArrowRight'){
      //move RIGHT
      this.move(1,0);
    } else if(event.key === 'u'){
      this.use_at_location();
    } else if(event.key === 'l'){
      this.look();
    }
    else if (event.key === 'x'){
      //do nothing
      this.state.game.engine.unlock();
    }
  }

  look(){
    var entity = this.state.game.get_entity_at(this.state.game.player.x, this.state.game.player.y, this.state.game.player.name);
    if(entity){
      create_message('There is a '+entity.name+' here.','#ddd','#000');
    }else{
      create_message('There is nothing here.','#ddd', '#000');
    }
    this.state.game.engine.unlock();
  }

  use_at_location(){
    var entity = this.state.game.get_entity_at(this.state.game.player.x, this.state.game.player.y, this.state.game.player.name);

    if(entity){
      //console.log(entity);
      if(entity.name !== this.state.game.player.name)
        entity.use(this.state.game.player);
    }
    this.state.game.engine.unlock();
  }

  move(dx, dy){
    this.state.game.player.try_move(this.state.game.player.x+dx, this.state.game.player.y + dy);

    this.state.game.engine.unlock();
  }

  handle_render(){
    this.setState({
      game: game,
    });
  }

  render(){
    return(
      <div className="container">
        <div className="header">
          <h1>Dungeoneer: The Roguelike</h1>
          <PlayerInfo player={this.state.game.player}
            floor={this.state.game.floor}/>
        </div>
        <div id="displays"></div>
      </div>
    );
  }
}


ReactDOM.render(<App />, document.getElementById('app'));
registerServiceWorker();
