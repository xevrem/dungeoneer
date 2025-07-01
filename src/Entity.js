export class Entity {
  /**
   *
   *
   * @param {import('./Game').Game} game
   * @param {number} x
   * @param {number} y
   * @param {string} name
   * @param {import('./Templates').Template} template
   */
  constructor(game, x, y, name, template) {
    this.x = x;
    this.y = y;
    this.name = name;

    this.apply_template(template);

    //add to game
    this.game = game;
    this.game.entities.push(this);

    //add to engine
    if (this.has_component("Actor") || this.has_component("PlayerActor"))
      this.game.scheduler.add(this, true);
  }

  /**
   * applies template
   *
   * @param {import('./Templates').Template} template
   */
  apply_template(template) {
    for (var key in template) {
      //console.log(key, template[key]);
      //check to see if this is a component
      if (key === "components") {
        this.add_components(template[key], template);
      }
      this[key] = template[key];
    }
    return template;
  }

  /**
   * adds component mixins
   * @param {import('./Components').Component[]} components
   * @param {import('./Templates').Template} template
   */
  add_components(components, template) {
    for (var i in components) {
      if (components[i].setGame) components[i].setGame.call(this, this.game);

      for (var key in components[i]) {
        //don't copy ovesr component name, init method, or overwrite anything
        if (key !== "init" && key !== "name" && !this.hasOwnProperty(key)) {
          this[key] = components[i][key];
        }
      }

      //call component's init method
      if (components[i].init) components[i].init.call(this, template);
    }
  }

  has_component(component) {
    for (var c of this.components) {
      if (c.name === component) {
        return true;
      }
    }
    return false;
  }

  remove_self() {
    if (this.has_component("Actor") || this.has_component("PlayerActor"))
      this.game.scheduler.remove(this);

    this.game.remove_entity(this);
  }
}
