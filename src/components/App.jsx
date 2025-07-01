import { dynamic_stairs_down, Templates } from "Templates";
import "./App.css";
import { PlayerInfo } from "./PlayerInfo";
import { create_message } from "Console";

export class App extends React.Component {
  constructor() {
    super();
    this.state = {
      game: this.props.game,
    };
  }

  // componentWillMount(){
  //
  // }

  componentDidMount() {
    this.state.game.init();

    var handle_render = this.handle_render.bind(this);
    this.state.game.after_render_callback(handle_render);

    var handle_input = this.handle_input.bind(this);
    window.addEventListener("keydown", handle_input);

    this.state.game.generate_map();

    //create character
    this.state.game.create_player();

    var x, y;
    for (var i = 0; i < 10; i++) {
      [x, y] = this.state.game.get_safe_location();
      new Entity(x, y, "Goblin", Templates.Goblin);
    }

    for (var i = 0; i < 3; i++) {
      [x, y] = this.state.game.get_safe_location();
      new Entity(x, y, "Potion", Templates.HealingPotion);
    }

    [x, y] = this.state.game.get_safe_location();
    new Entity(x, y, "Weapon", Templates.Weapon);

    [x, y] = this.state.game.get_safe_location();
    new Entity(x, y, "Armor", Templates.Armor);

    [x, y] = this.state.game.get_safe_location();
    new Entity(x, y, "Stairs", dynamic_stairs_down());

    // [x,y] = this.state.game.get_safe_location();
    // new Entity(x,y, 'Goblin King', Templates.GoblinKing);

    this.state.game.engine.start();

    this.state.game.render();
  }

  handle_input(event) {
    event.preventDefault();

    if (this.state.game.game_over) {
      //restart the game
      if (event.key === "Enter") {
        game.player = new Entity(0, 0, "Player", Templates.Player);
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
    if (event.key === "w" || event.key === "ArrowUp") {
      //move UP
      this.move(0, -1);
    } else if (event.key === "a" || event.key === "ArrowLeft") {
      //upove LEFT
      this.move(-1, 0);
    } else if (event.key === "s" || event.key === "ArrowDown") {
      //move DOWN
      this.move(0, 1);
    } else if (event.key === "d" || event.key === "ArrowRight") {
      //move RIGHT
      this.move(1, 0);
    } else if (event.key === "u") {
      this.use_at_location();
    } else if (event.key === "l") {
      this.look();
    } else if (event.key === "x") {
      //do nothing
      this.state.game.engine.unlock();
    }
  }

  look() {
    var entity = this.state.game.get_entity_at(
      this.state.game.player.x,
      this.state.game.player.y,
      this.state.game.player.name,
    );
    if (entity) {
      create_message(this.game, "There is a " + entity.name + " here.", "#ddd", "#000");
    } else {
      create_message(this.game, "There is nothing here.", "#ddd", "#000");
    }
    this.state.game.engine.unlock();
  }

  use_at_location() {
    var entity = this.state.game.get_entity_at(
      this.state.game.player.x,
      this.state.game.player.y,
      this.state.game.player.name,
    );

    if (entity) {
      //console.log(entity);
      if (entity.name !== this.state.game.player.name)
        entity.use(this.state.game.player);
    }
    this.state.game.engine.unlock();
  }

  move(dx, dy) {
    this.state.game.player.try_move(
      this.state.game.player.x + dx,
      this.state.game.player.y + dy,
    );

    this.state.game.engine.unlock();
  }

  handle_render() {
    this.setState({
      game: game,
    });
  }

  render() {
    return (
      <div className="container">
        <div className="github">
          <a href="https://github.com/xevrem/dungeoneer">
            <i className="fa fa-github" aria-hidden="true"></i>
          </a>
        </div>
        <div className="header">
          <h1>Dungeoneer: The Roguelike</h1>
          <PlayerInfo
            player={this.state.game.player}
            floor={this.state.game.floor}
          />
        </div>
        <div id="displays"></div>
      </div>
    );
  }
}
