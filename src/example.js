'use strict';
class Player {
  getFirstEquip(obj){
    let e = new obj();
    e.material = 'wooden'
    e.name = e.material + ' ' + e.type
    if(obj === Armor){
      e.def = 2;
      e.name +=' (+'+e.def+' DEF)';
    } else {
      e.atk = 30;
      e.name +=' (+'+e.atk+' ATK)';
    }
    return e;
  }
  constructor(x, y, game) {
    this.x = x;
    this.y = y;
    this.game = game;
    this.equipment = {
      weapon: this.getFirstEquip(Weapon),
      armor:this.getFirstEquip(Armor)
    };
    this.stats = {
      level: 1,
      health: 100,
      str: 10,
      def: 10,
      agi: 10,
      acc: 65,
      xp: 0
    };
    this.plyrChar = '&';
    this.plyrColor = '#aa0';
    this.fov = new ROT.FOV.PreciseShadowcasting((x,y)=>{
      let k = x+','+y;
      if (k in this.game.map) { return true; }
      return false;
    })
    this.draw();
  }
  equip(item) {
    switch(item.itemType){
      case 'w':
        this.equipment.weapon = item;
        break;
      case 'a':
        this.equipment.armor = item;
        break;
    }
    this.game.updatePlyrState(this);
  }
  drinkPotion(potion){
    this.stats.health += potion.getHealedVal();
    this.game.updatePlyrState(this);
  }
  draw() {
    let plyr = this.plyrChar;
    let pColor = this.plyrColor;
    let bgColor = this.game.mapSettings.floorColor;
    this.game.display.draw(this.x, this.y, plyr, pColor, bgColor);
    this.fov.compute(this.x, this.y, 3, (x, y, r, visibility)=>{
      let monCh = null,
          monChCol = null,
          chstCh = null,
          chstCol = null,
          mapCh = null,
          mapCol = null,
          bgCol = '#000';

      let key = x+','+y;
      if (key in this.game.mons) {
        let mon = this.game.mons[key];
        monCh = mon.monChar;
        monChCol = mon.monColor;
      }
      if (key in this.game.chests) {
        let chst = this.game.chests[key];
        chstCh = chst.chr;
        chstCol = chst.color;
      }
      if (key in this.game.map) {
        mapCh = this.game.map[key][0];
        mapCol = this.game.map[key][1];
        bgCol = this.game.mapSettings.floorColor;
      }
      let ch = (r? (monCh || chstCh || mapCh): plyr);
      let chCol = (r? (monChCol || chstCol || mapCol):pColor);

      this.game.display.draw(x, y, ch, chCol, bgCol);

    })
  }
  act() {
    this.game.engine.lock();
    //wait for user input, do stuff on user keydown
    window.addEventListener('keydown', this);
  }
  handleEvent(e) {
    let keyMap = {
      87: 0,
      68: 1,
      83: 2,
      65: 3
    };

    let code = e.keyCode;

    if(!(code in keyMap)) { return; }

    let diff = ROT.DIRS[4][keyMap[code]];
    let newX = this.x + diff[0];
    let newY = this.y + diff[1];
    let newKey = newX+','+newY;
    let bossMon = false;
    //if new x,y not available in map, i.e. cannot move to this position
    if(!(newKey in this.game.map)) { return; }

    // if this space is occupied by a mon, then do fight round

    // if occupied by chest, then check it.
    if (newKey in this.game.mons) {
      if(this.game.mons[newKey].type === 'boss'){bossMon = true;}
      this.doFight(newKey);
      // if mon still alive, don't do move;
      if (newKey in this.game.mons && this.stats.health > 0){
        return;
      }

    }
    if (newKey in this.game.chests) {
      if (!this.game.chests[newKey].isEmpty()){
        this.checkBox(newKey);
        this.draw();
        return;
      }
    }
    //floor transition
    if (this.game.upStairs === newKey){
      this.game.goUpFloor();

    } else if(this.stats.health===0) {
      //game over
      alert('You Died :( ');
      this.resetPlyr();
      this.game.transitionFloor();
      this.game.setState({floorLvl: 0});
      this.game.updatePlyrState(this);


    } else if (bossMon){
      // Victory
      alert('You Beat the Floor '+this.game.state.floorLvl+' Boss!');
      this.resetPlyr();
      this.game.transitionFloor();
      this.game.setState({floorLvl: 0});
      this.game.updatePlyrState(this);

    } else {
      let mapPosInfo = this.game.map[this.x+','+this.y];
      this.game.display.draw(this.x, this.y, ...mapPosInfo);
      this.x = newX;
      this.y = newY;
    }
      this.draw();
      window.removeEventListener('keydown', this);
      this.game.engine.unlock();

  }
  checkBox(key) {
    let chest = this.game.chests[key];
    if (chest.isEmpty()) {
      alert("You've already looted this one...");
    } else {
      switch(chest.contains()) {
        case 'armor':
          let armor = chest.getItem();
          if(confirm("Found some nifty armor here.\n"+armor.name+'\nEquip it?')){
            this.equip(armor);
          }
          break;
        case 'weapon':
          let weap = chest.getItem();
          if(confirm("Found a better weapon.\n"+weap.name+'\nEquip it?')){
            this.equip(weap);
          }
          break;
        case 'potion':
          alert("Thank goodness you found a potion.  This should help keep death at bay.");
          this.drinkPotion(chest.getItem());
          break;
      }
    }
  }
  doFight(key){
    let mon = this.game.mons[key];
    let toHit = ROT.RNG.getNormal(0, 15) + this.stats.acc;
    if(toHit>mon.stats.agi){
      let damage = this.stats.str + this.equipment.weapon.atk + (ROT.RNG.getUniform() * this.stats.level);
      let critChance = ROT.RNG.getPercentage();
      // 2% chance to crit
      if(critChance>98) damage *= 1.75;
      damage = Math.floor(damage) - mon.stats.def;
      if(damage<0) { damage = 0; }
      if(damage>=mon.stats.health) {
        // mon defeated condition
        // add xp
        this.stats.xp += mon.stats.xp;
        this.doLvlUpCheck();
        // remove mon from map
        delete this.game.mons[key];
        //end battle
        this.game.updatePlyrState(this);
        return;
      } else {
        mon.stats.health = mon.stats.health - damage;
      }
    } else {
      // missed

    }
    mon.attack(this);
  }
  doLevelUp(){
    console.log('Level Up!');
    if (this.stats.health < 100) { this.stats.health = 100; }
    this.stats.level++;
    let strBoost = Math.floor(ROT.RNG.getUniform() * 20);
    let defBoost = Math.floor(ROT.RNG.getUniform() * 12);
    this.stats.str = this.stats.str + strBoost;
    this.stats.def = this.stats.def + defBoost;
    this.game.updatePlyrState(this);
  }
  doLvlUpCheck() {
    let lvlProg = {
      2: 100,
      3: 200,
      4: 500,
      5: 1000,
      6: 1500,
      7: 2500,
      8: 4000,
      9: 5000,
      10: 7500
    };
    let nxtLvl = lvlProg[this.stats.level+1];
    if (this.stats.xp>nxtLvl){
      this.doLevelUp();
      this.doLvlUpCheck();
    }
    return;
  }
  resetPlyr() {
    this.equipment = {
      weapon: this.getFirstEquip(Weapon),
      armor:this.getFirstEquip(Armor)
    };
    this.stats = {
      level: 1,
      health: 100,
      str: 10,
      def: 10,
      agi: 10,
      acc: 65,
      xp: 0
    };
  }
}
class Monster {
  constructor(x, y, game) {
    this.x = x;
    this.y = y;
    this.game = game;
    this.monChar = null;
    this.monColor = null;
    this.type = 'mob';
  }
  draw() {
    this.game.display.draw(this.x, this.y, this.monChar, this.monColor, this.game.mapSettings.floorColor);
  }
  getCoords() {
    return (this.x+','+this.y);
  }
  doAtk(plyr,mon){
    let toHit = ROT.RNG.getNormal(0, 15) + mon.stats.acc;
    if(toHit>plyr.stats.agi){
      let random = Math.floor(ROT.RNG.getUniform() * plyr.stats.level);
      let damage = mon.stats.str + random;
      let critChance = ROT.RNG.getPercentage();
      // 2% chance to crit
      if(critChance>98) damage *= 1.75;
      //calclate player defenses
      damage = Math.floor(damage) - (plyr.stats.def + plyr.equipment.armor.def);
      if(damage<0) { damage = 0; }
      if(damage>plyr.stats.health) {
        //Game Over Condition
        plyr.stats.health = 0;
        plyr.game.updatePlyrState(plyr);

      } else {
        plyr.stats.health -= damage;
      }
    } else {
      // missed
      }
    plyr.game.updatePlyrState(plyr);
  }
}
class Bat extends Monster {
  constructor(...props){
    super(...props);
    this.monChar = '^';
    this.monColor = '#222';
    this.stats = {
      health: 300,
      str: 20,
      def: 5,
      agi: 40,
      acc: 65,
      xp: 50  + Math.floor((ROT.RNG.getUniform() * 25))
    }
    //this.draw();
  }
  attack(plyr){
    this.doAtk(plyr, this);
  }

}
class Goblin extends Monster {
  constructor(...props){
    super(...props);
    this.monChar = 'a';
    this.monColor = 'green';
    this.stats = {
      health: 750,
      str: 30,
      def: 20,
      agi: 20,
      acc: 80,
      xp: 100 + Math.floor((ROT.RNG.getUniform() * 50))
    }
    //this.draw();
  }
  attack(plyr){
    this.doAtk(plyr, this);
  }

}
class Orc extends Monster {
  constructor(...props){
    super(...props);
    this.monChar='%';
    this.monColor='darkgreen';
    this.stats = {
      health: 1500,
      str: 50,
      def: 25,
      agi: 5,
      acc: 50,
      xp: 200 + Math.floor((ROT.RNG.getUniform() * 100))
    }
    //this.draw();
  }
  attack(plyr){
    this.doAtk(plyr, this);
  }

}
class BossMon extends Monster {
  constructor(...props){
    super(...props);
    this.monChar = String.fromCharCode(246);
    this.monColor = 'red';
    this.type = 'boss';
    this.stats = {
      health: 5000,
      str: 75,
      def: 75,
      agi: 10,
      acc: 65,
      xp: 1000 + Math.floor((ROT.RNG.getUniform() * 500))
    }
  }
  attack(plyr){
    this.doAtk(plyr, this);
  }
}
class Potion {
  getHealedVal(){
    let val = ROT.RNG.getUniform() * 100;
    return parseInt(val);
  }
}
class Equipment {
  constructor() {
    //maybe this will work...
  }
  getMaterial() {
    let material = {
      bronze: 10,
      iron: 6,
      steel: 4,
      diamond: 1
    };
    return ROT.RNG.getWeightedValue(material);
  }
}
class Weapon extends Equipment{
  getWeapType() {
    let type = {
      dagger: 3,
      sword: 5,
      axe: 2,
      spear: 2,
      pole: 2
    };
    return ROT.RNG.getWeightedValue(type);
  }
  getAtk(mat, typ){
    let atk = 0;
    switch(mat){
      case 'bronze':
        atk += 35;
        break;
      case 'iron':
        atk += 50;
        break;
      case 'steel':
        atk += 100;
        break;
      case 'diamond':
        atk += 150;
        break;
    };
    switch(typ){
      case 'dagger':
      case 'pole':
        atk += 15;
        break;
      case 'sword':
      case 'spear':
        atk += 30;
        break;
      case 'axe':
        atk += 50;
        break;
    };
    return atk;
  }
  constructor() {
    super();
    this.itemType = 'w';
    this.material = this.getMaterial();
    this.type = this.getWeapType();
    this.atk = this.getAtk(this.material, this.type);
    this.name = this.material+' '+this.type+' (+'+this.atk+' ATK)';


  }

}
class Armor extends Equipment{
  getArmorType(){
    let type = {
      'chain mail': 3,
      'plate mail': 2
    };
    return ROT.RNG.getWeightedValue(type);
  }
  getDef(mat) {
    let def = Math.floor(ROT.RNG.getUniform() * 8);
    switch(mat) {
      case 'bronze':
        def += 10;
        break;
      case 'iron':
        def += 15;
        break;
      case 'steel':
        def += 20;
        break;
      case 'diamond':
        def += 35;
        break;
    };
    return def;
  }
  constructor(){
    super();
    this.itemType = 'a'
    this.material = this.getMaterial();
    this.type = this.getArmorType();
    this.def = this.getDef();
    this.name = this.material+' '+this.type+' (+'+this.def+' DEF)';

  }
}
class Chest {
  constructor(x, y){
    this.x = x;
    this.y = y;
    this.empty = false;
    this.item = null;
    this.chr = '=';
    this.color = '#000';
  }
  isEmpty() {
    return this.empty;
  }
  getItem() {
    this.empty = true;
    this.chr = 'L';
    return this.item;
  }
}
class HChest extends Chest {
  constructor(...props){
    super(...props);
    this.item = new Potion();
  }
  contains() {
    return 'potion';
  }
}
class WChest extends Chest {
  constructor(...props){
    super(...props);
    this.item = new Weapon();
  }
  contains() {
    return 'weapon';
  }
}
class AChest extends Chest {
  constructor(...props){
    super(...props);
    this.item = new Armor();
  }
  contains() {
    return 'armor';
  }
}
class GameBase extends React.Component {
  constructor(props){
    super(props);
    this.display = new ROT.Display({width: this.props.width, height: this.props.height, fontSize: 18});
    this.map = {};
    this.mons = {};
    this.chests = {};
    this.downStairs = null;
    this.upStairs = null;
    this.mapSettings = {
      floorColor: 'grey'
    };
    this.player = null;
    this.engine = null;
    this.h = this.props.height;
    this.w = this.props.width;
    this.state = {
      floorLvl: 0,
      health: null,
      level: null,
      weapon: null,
      armor: null,
      xp: null
    }

  }
  drawMap() {
    for(let key in this.map) {
      let parts = key.split(',');
      let x = parseInt(parts[0]);
      let y = parseInt(parts[1]);
      let mapPosInfo = this.map[key];
      this.display.draw(x, y, ...mapPosInfo)
    }
  }
  transitionFloor(){
    this.display.clear();
    this.generateMap();
  }
  goUpFloor(){
    this.setState({floorLvl: this.state.floorLvl+1})
    this.transitionFloor();
  }
  placePlayer(plyr, fCells){
    let ind = Math.floor(ROT.RNG.getUniform() * fCells.length);
    let key = fCells.splice(ind, 1)[0];
    let coords = key.split(',');
    let x = parseInt(coords[0]);
    let y = parseInt(coords[1]);
    plyr.x = x;
    plyr.y = y;
  }
  createThing(obj, freeCells){
    let ind = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    let key = freeCells.splice(ind, 1)[0];
    let coords = key.split(',');
    let x = parseInt(coords[0]);
    let y = parseInt(coords[1]);
    return new obj(x, y, this);
  }
  makeFloor(){
    return (
      [' ', 'transparent', this.mapSettings.floorColor]
    );
  }
  generateMons(freeCells){
    // if mons already generated, reset them
    if (this.mons !== {}) this.mons = {};
    let monWeight = {
      0: {
        'bat':5,
        'gob':2,
        'orc':0
      },
      1: {
        'bat': 3,
        'gob':5,
        'orc':1
      },
      2: {
        'bat':2,
        'gob':5,
        'orc':2
      },
      3: {
        'bat':2,
        'gob':2,
        'orc':5
      },
      4: {
        'bat':3,
        'gob':1,
        'orc':5
      }
    }
    let mons = [];
    const numMons = (this.state.floorLvl+1)*7;
    let weightCalc = null;
    if (this.state.floorLvl > 4) weightCalc = 4;
    else weightCalc = this.state.floorLvl;
    for(let i=0; i<= numMons; i++) {
      mons.push(ROT.RNG.getWeightedValue(monWeight[weightCalc]));
    }
    mons.forEach((mon)=>{
      let obj = null;
      if (mon==='bat'){
        obj = Bat;
      } else if (mon==='orc') {
        obj = Orc;
      } else {
        obj = Goblin;
      }
      let m = this.createThing(obj, freeCells);
      this.mons[m.getCoords()] = m;
    });
  }
  generateStairs(freeCells){
    if (this.state.floorLvl === 4 ) { return; }
    let ind = Math.floor(ROT.RNG.getUniform() * freeCells.length);
    let key = freeCells.splice(ind, 1)[0];
    this.map[key] = ['+', 'purple', this.mapSettings.floorColor];
    this.upStairs = key;

  }
  generateTreasures(freeCells){
    // if chests already generated, reset it
    if (this.chests !== {}) this.chests = {};
    // create one armor and one weapon chest
    let aChest = this.createThing(AChest, freeCells),
        wChest = this.createThing(WChest, freeCells);
    // add them to this.chests
    this.chests[aChest.x+','+aChest.y] = aChest;
    this.chests[wChest.x+','+wChest.y] = wChest;
    // add a random number of health chests plus extra per floor level
    let hFactor = ROT.RNG.getUniform() * 10 + this.state.floorLvl;
    // iterated and add to this.chests
    for(let i=0; i<hFactor; i++){
      let hChest = this.createThing(HChest, freeCells);
      let key = hChest.x+','+hChest.y;
      this.chests[key] = hChest;
    }
  }
  generateMap() {
    // if map already generated, reset it
    if (this.map !== {}) this.map = {};
    let map = new ROT.Map.Rogue(this.w, this.h);
    let freeCells = [];
    map.create((x, y, val)=>{
      if (val) return; // if wall, don't store in map obj;
      let key = x+','+y;
      freeCells.push(key);
      //map stores [char, fgColor, bgColor] keyed to 'x,y'
      this.map[key] = this.makeFloor();
    });
    // Let FOV reveal map instead of drawing it ahead of time
    //this.drawMap();

    // Add stairs down to map
    this.generateStairs(freeCells); //TO-DO
    // Add healing items and loot to map
    this.generateTreasures(freeCells);
    // Add monsters to map
    this.generateMons(freeCells);
    // Add Boss every 4th Floor
    if (this.state.floorLvl === 4) {
      let b = this.createThing(BossMon, freeCells);
      this.mons[b.getCoords()] = b;
    }

    // Add Player Char to map
    if(!this.player){
      this.player = this.createThing(Player, freeCells);
      this.updatePlyrState(this.player);
    } else {
      this.placePlayer(this.player, freeCells);
    }


  }
  updatePlyrState(plyr){
    this.setState({
        level: plyr.stats.level,
        health: plyr.stats.health,
        weapon: plyr.equipment.weapon.name,
        armor: plyr.equipment.armor.name,
        xp: plyr.stats.xp
      });
  }
  componentWillMount() {
    document.body.appendChild(this.display.getContainer());
    this.generateMap();
    let scheduler = new ROT.Scheduler.Simple();
    scheduler.add(this.player, true);

    //TO-DO
    // If mons have actions, e.g walking/flying around, flapping, starting a fight
    // add them to scheduler
    this.engine = new ROT.Engine(scheduler);
    this.engine.start();


  }
  componentDidMount() {
    alert('Welcome! Move with the WASD keys.\n\n Can You Overcome the Boss on the 4th Floor?');
  }
  render() {
    return (
      <div className='hudElems'>
        <div>Level: {this.state.level} </div>
        <div>Health: {this.state.health} </div>
        <div>Weapon: {this.state.weapon} </div>
        <div>Armor: {this.state.armor} </div>
        <div>XP: {this.state.xp} </div>
        <div>Dungeon Level: {this.state.floorLvl} </div>
      </div>
    );
  }
}
let w = Math.floor($(document).width()/10.2),
      h = Math.floor($(document).height()/19);
ReactDOM.render(<GameBase width={w} height={h} />, document.getElementById('mountNode'));
