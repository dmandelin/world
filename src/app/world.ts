import { Injectable } from "@angular/core";

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;
    private polities = DEFAULT_POLITIES.map(pd => new Polity(this, pd.name, pd.mapColor));
    readonly map = new WorldMap(5, 5, this.polities);

    constructor() {
    }

    get year() { return this.year_; }

    get population() {
        return this.map.tiles.flat().map(t => t.population).reduce((a, b) => a + b);
    }

    nextTurn() {
        this.year_ += 20;
    }
    
    getRankedPolities(): Polity[] {
        return [...this.polities].sort((a, b) => {
            const popDiff = a.population - b.population;
            if (popDiff) return popDiff;
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        })
    }
}

class Polity {
    constructor(private readonly world: World, readonly name: string, readonly mapColor: string) {}

    get population() {
        return this.world.map.tiles
            .flat()
            .filter(t => t.controller == this)
            .map(t => t.population)
            .reduce((a, b) => a + b);
    }
}

class PolityDef {
    constructor(readonly name: string, readonly mapColor: string) {}
}

const DEFAULT_POLITIES = [
    new PolityDef('A', 'red'),
    new PolityDef('B', 'orange'),
    new PolityDef('C', 'yellow'),
    new PolityDef('D', 'green'),
    new PolityDef('E', 'blue'),
    new PolityDef('F', 'purple'),
    new PolityDef('G', 'brown'),
    new PolityDef('H', 'grey'),
    new PolityDef('I', 'pink'),
    new PolityDef('J', 'lightblue'),
    new PolityDef('K', 'magenta'),
    new PolityDef('L', 'cyan'),
    new PolityDef('M', 'darkred'),
    new PolityDef('N', 'lightgreen'),
    new PolityDef('O', 'darkgreen'),
    new PolityDef('P', 'darkblue'),
    new PolityDef('Q', 'indigo'),
    new PolityDef('R', 'darkorange'),
    new PolityDef('S', 'tan'),
    new PolityDef('T', 'slateblue'),
    new PolityDef('U', 'violet'),
    new PolityDef('V', 'mediumseagreen'),
    new PolityDef('W', 'goldenrod'),
    new PolityDef('X', 'darkgrey'),
    new PolityDef('Y', 'lightgrey'),
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
  
    constructor(public width: number, public height: number, polities: ReadonlyArray<Polity>) {
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                this.tiles[i][j] = new Tile(1000, polities[i * width + j])
            }
        }
    }
}
