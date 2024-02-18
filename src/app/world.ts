import { Injectable } from "@angular/core";

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;
    private polities = [...DEFAULT_POLITIES];
    readonly map = new WorldMap(5, 5);

    get year() { return this.year_; }

    nextTurn() {
        this.year_ += 20;
      }
    
    //getPolitiesSortedByPopulation() {
    //    return this.polities.sort((a, b) => b.population - a.population);
    //}
}

class Polity {
    constructor(readonly name: string, readonly mapColor: string) {}
}

const DEFAULT_POLITIES = [
    new Polity('A', 'red'),
    new Polity('B', 'orange'),
    new Polity('C', 'yellow'),
    new Polity('D', 'green'),
    new Polity('E', 'blue'),
    new Polity('F', 'purple'),
    new Polity('G', 'brown'),
    new Polity('H', 'grey'),
    new Polity('I', 'pink'),
    new Polity('J', 'lightblue'),
    new Polity('K', 'magenta'),
    new Polity('L', 'cyan'),
    new Polity('M', 'darkred'),
    new Polity('N', 'lightgreen'),
    new Polity('O', 'darkgreen'),
    new Polity('P', 'darkblue'),
    new Polity('Q', 'indigo'),
    new Polity('R', 'darkorange'),
    new Polity('S', 'tan'),
    new Polity('T', 'slateblue'),
    new Polity('U', 'violet'),
    new Polity('V', 'mediumseagreen'),
    new Polity('W', 'goldenrod'),
    new Polity('X', 'darkgrey'),
    new Polity('Y', 'lightgrey'),
];

class Tile {
    private controller_: Polity;

    constructor(readonly population: number, controller: Polity) {
        this.controller_ = controller;
    }

    get controller() { return this.controller_; }
}
  
class WorldMap {
    tiles: Tile[][];
  
    constructor(public width: number, public height: number) {
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                this.tiles[i][j] = new Tile(1000, DEFAULT_POLITIES[i * width + j])
            }
        }
    }
}
