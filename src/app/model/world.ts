import {Injectable} from "@angular/core";
import {Brain, BasicBrain, DefensiveBrain, SubjectBrain} from "./agents/brains";
import {NAMED_DEFAULT_POLITIES, Polity} from "./polity";
import {Tile} from "./tile";
import {randelem, randint} from "./lib";
import { resolveRaids } from "./raiding";

// Motivation-driven plan:
// - Starting on turn 1, look for a tile where people would be motivated
//   to do something different from what the model does now, and then
//   add that ability to the model.
// - Problems and opportunities discovered:
//   - Variable pricing: Bad-Tibira was malnourished because they had
//     no pasture land, and couldn't get enough dairy at 1:1 trade.
//     But with a marginal utility of 5 for dairy, and 0.22 for barley,
//     they'd be willing to trade much more than 1 barley per dairy.
//   - Visualize these on the map because they're needed to understand
//     what problems tiles are facing.
//     - rites
//     - raiding losses/gains
//     - population change?

// - Ideology/Culture
//     - Specialist labor and trade required to take full advantage of temple
// - Economy
// - Military
//   * Simple raiding model
//     * Capture produce, and/or trade goods
//     - Defensive works and patrols
//       - Specialist labor required to take full advantage
// - Politics
//   - Start with achievement-based societies
//     - Collective for agrarians, individualistic for pastoralists
//   - Define some sort of coordination bonuses that impact
//     each other power source
// - Environment
//   - Climate conditions that change over time and affect productivity.

// Top economic TODOs:
// - allocations
//   - experiment with land allocation and both allocation
//   - retune production functions based on above analysis
//   - apply to actual production
// - trade food for increased production
// - trade for obsidian for labor productivity and health bonuses
// - trade for lapis lazuli for culture bonuses
// - craft specialists: tools, cloth, pottery, jewelry

// - Future steps for trade:
//   - Consider markets, floating prices, diagonal trades
//   - Add plausible goods from the four sides of the map, e.g.,
//     obsidian/flint from the west, dairy from the north, lapis
//     lazuli from the east, and fish from the south.
//   - Allow longer-range trade and variable transaction costs
//   - Add effects on other aspects of society from each trade good.
//   - Add industries that create trade goods such as pottery and cloth.
//   - Model trade-driven urbanization and its ramifications.

@Injectable({providedIn: 'root'})
export class WorldViewModel {
    constructor(readonly world: World) {}

    selectedTile_: Tile|undefined;

    get selectedTile() { 
        return this.selectedTile_; 
    }

    set selectedTile(value: Tile|undefined) { 
        this.selectedTile_ = value; 
        this.world.notifyWatchers();
    }
}

@Injectable({providedIn: 'root'})
export class World {
    private yearOrigin_ = -5000;
    private year_ = 0;
    private polities_ = NAMED_DEFAULT_POLITIES.map((pd, i) => 
        new Polity(this, pd.name, pd.mapColor, randelem(World.BRAINS)));
    
    readonly map = new WorldMap(this, 5, 5, this.polities);

    readonly log = new WorldLog();

    lastAttacks = new Set<[Polity, Polity]>();

    private watchers_: Set<Function> = new Set<Function>();
    private locallyControlledPolities = new Set<string>(['E']);

    constructor() {
        // Initialize trade links.
        for (const t of this.map.tiles.flat()) {
            t.market.initialize();
        }
        for (const t of this.map.tiles.flat()) {
            t.market.update();
        }

        this.recordRanks();

        this.forTiles(t => t.updateTimeSeries());
    }

    isLocallyControlled(p: Polity) {
        return this.locallyControlledPolities.has(p.name);
    }

    clearLocalControl() {
        this.locallyControlledPolities.clear();
    }

    recordRanks() {
        let i = 1;
        for (const polity of this.getRankedPolities()) {
            polity.historicalRanks.push([this.year, i++]);
        }
    }

    static BRAINS = [
        new BasicBrain('A', 1.0),
        new SubjectBrain('S', 0.66, 0.5),
        new BasicBrain('N', 0.5, 0.4),
        new DefensiveBrain('D', 0.33),
        new DefensiveBrain('P', 0.2),
        new SubjectBrain('U', 0.0),
    ];

    addWatcher(w: Function) {
        this.watchers_.add(w);
        return w;
    }

    removeWatcher(w: Function|undefined) {
        if (w) this.watchers_.delete(w);
    }

    setBrains(brains: readonly Brain[]) {
        for (let i = 0; i < brains.length; ++i) {
            this.polities_[i].setBrain(brains[i]);
        }
    }

    get year() { return this.year_; }
    get yearForDisplay() { return this.yearDisplay(this.year); }
    yearDisplay(yearFromOrigin: number) {
        const year = yearFromOrigin + this.yearOrigin_;
        return year < 0 ? `${-year} BC` : `${year + 1} AD`;
    }

    get polities() { return this.polities_; }
    private set polities(value: Polity[]) { this.polities_ = value; }

    get capacity() {
        return this.map.tiles.flat().map(t => t.capacity).reduce((a, b) => a + b);
    }

    get population() {
        return this.map.tiles.flat().map(t => t.population).reduce((a, b) => a + b);
    }

    private advanceState: 'startTurn'|'skipAction'|'continue' = 'startTurn';
    private actorState: number = 0;

    get actor(): Polity { return this.polities_[this.actorState]; }

    get advanceStateDisplay() {
        switch (this.advanceState) {
            case 'startTurn':
                return 'Click to start turn';
            case 'skipAction':
                return 'Click to attack or skip';
            case 'continue':
                return 'Click to continue';
        }
    }

    advance() {
        switch (this.advanceState) {
            case 'startTurn':
                this.advanceTurnStart();
                if (this.advanceTurnAct()) {
                    this.advanceState = 'skipAction';
                    this.notifyWatchers();
                    return;
                }
                this.advanceTurnFinish();
                this.notifyWatchers();
                break;
            case 'skipAction':
                this.skipAction();
                if (this.advanceTurnAct()) {
                    this.advanceState = 'skipAction';
                    this.notifyWatchers();
                    return;
                }
                this.advanceTurnFinish();
                this.advanceState = 'startTurn';
                this.notifyWatchers();
                break;
            case 'continue':
                this.skipAction();
                if (this.advanceTurnAct()) {
                    this.advanceState = 'skipAction';
                    this.notifyWatchers();
                    return;
                }
                this.advanceTurnFinish();
                this.advanceState = 'startTurn';
                this.notifyWatchers();
                break;
        }
    }

    advanceTurn() {
        this.advanceTurnStart();
        this.advanceTurnFinish();
    }

    advanceTurnStart() {
        this.log.turnlogClear();

        this.forTiles(t => t.optimizeLabor());
        this.forTiles(t => t.market.update());
        /*
        this.lastAttacks.clear();

        if (this.year == 200) {
            this.log.turnlog('Large-scale irrigation works begun!');
            for (const t of this.map.tiles.flat()) {
                t.enableDryLightSoil();
            }
        }

        // Compute what alliance exists against each potential aggressor.
        for (const p of this.polities) {
            p.counterAlliance = p.neighboringPolities.filter(n => 
                n != p && n.brain.joinsCounterAlliance(this, n, p));
        }
        */
    }

    advanceTurnAct() {
        while (this.actorState < this.polities.length) {
            const p = this.polities[this.actorState];
            if (!this.polities.includes(p)) continue;
            
            //this.startTurnFor(p);
            if (!this.locallyControlledPolities.has(p.name)) {
                //p.brain.move(this, p);
            } else {
                return true;
            }

            ++this.actorState;
        }
        this.actorState = 0;
        return false;
    }

    actAttack(target: Polity) {
        const actor = this.polities[this.actorState];
        if (!actor.canAttack(target)[0]) {
            return;
        }
        //this.performAttack(actor, target);
        
        this.advanceState = 'continue';
        this.notifyWatchers();
    }

    skipAction() {
        ++this.actorState; 
    }

    advanceTurnFinish() {
        // Raiding.
        resolveRaids(this);

        // Construction.
        this.forTiles(t => t.applyConstruction());

        // Technology invention and adoption.
        const snapshot = new Map(this.map.tiles.flat().map(t => [t, t.techKit.asMap]));
        this.forTiles(t => t.adoptNeighborTechs(snapshot));
        this.forTiles(t => t.advanceTechKit());

        // Population.
        this.forTiles(t => t.updatePopulation());

        this.year_ += 20;
        this.recordRanks();

        // Time series recording.
        this.forTiles(t => t.updateTimeSeries());

        this.log.turnlog(`The year is now ${this.year}`);
        this.notifyWatchers();
    }

    notifyWatchers() {
        if (this.watchers_ === undefined) return;
        for (const w of this.watchers_) {
            w();
        }
    }

    startTurnFor(p: Polity) {
        p.attacked.clear();
        p.defended.clear();
    }

    vassalize(attacker: Polity, defender: Polity) {
        // Defender is removed from any existing suzerain.
        if (defender.suzerain) {
            defender.suzerain.vassals.delete(defender);
            const formerSuzerain = defender.suzerain;
            defender.suzerain = undefined;
            this.releaseDisconnectedVassals(formerSuzerain);
        }


        // Vassals of the defender are released.
        for (const v of defender.vassals) {
            v.suzerain = undefined;
        }
        defender.vassals.clear();

        // The new vassal relationship.
        defender.suzerain = attacker;
        attacker.vassals.add(defender);
    }

    devassalize(suzerain: Polity, vassal: Polity) {
        suzerain.vassals.delete(vassal);
        vassal.suzerain = undefined;
        this.releaseDisconnectedVassals(suzerain);
    }

    releaseDisconnectedVassals(p: Polity) {
        const connectedVassals = new Set<Polity>();
        const done = new Set<Tile>();
        const work: Tile[] = [];
        for (const t of this.map.tiles.flat()) {
            if (t.controller === p) {
                work.push(t);
            }
        }
        while (work.length) {
            const t = work.pop();
            done.add(t!);
            for (const n of this.neighoringTiles(t!)) {
                if (done.has(n)) continue;
                if (n.controller != p && n.controller.suzerain != p) continue;
                work.push(n);
                if (n.controller != p) {
                    connectedVassals.add(n.controller);
                }
            }
        }
        const oldVassals = p.vassals;
        p.vassals = new Set<Polity>([...p.vassals].filter(v => connectedVassals.has(v)));
        for (const v of oldVassals) {
            if (!p.vassals.has(v)) {
                v.suzerain = undefined;
            }
        }
    }

    foughtThisTurn(a: Polity, b: Polity): boolean {
        return a.attacked.has(b) || b.attacked.has(a);
    }

    neighoringTiles(tile: Tile): Tile[] {
        const ts = this.map.tiles;
        const ns = [];
        if (tile.i > 0) ns.push(ts[tile.i-1][tile.j]);
        if (tile.i < this.map.height - 1) ns.push(ts[tile.i+1][tile.j]);
        if (tile.j > 0) ns.push(ts[tile.i][tile.j-1]);
        if (tile.j < this.map.width - 1) ns.push(ts[tile.i][tile.j+1]);
        return ns;
    }

    getRankedPolities(): Polity[] {
        return [...this.polities].sort((a, b) => {
            const popDiff = b.vassalPopulation - a.vassalPopulation;
            if (popDiff) return popDiff;
            if (a.name < b.name) return -1;
            if (b.name < a.name) return 1;
            return 0;
        })
    }

    forTiles(f: (t: Tile) => any) {
        for (const t of this.map.tiles.flat()) {
            f(t);
        }
    }
}

export class WorldLog {
    readonly turnlogs: string[] = [];

    turnlog(s: string) {
        this.turnlogs.push(s);
    }

    turnlogClear() {
        this.turnlogs.length = 0;
    }
}

class WorldMap {
    tiles: Tile[][];
  
    constructor(world: World, public readonly width: number, public readonly height: number, polities: ReadonlyArray<Polity>) {
        const jCenter = Math.floor((width - 1)/2);

        // Initialize tiles.
        this.tiles = [];
        for (let i = 0; i < height; i++) {
            this.tiles[i] = [];
            for (let j = 0; j < width; j++) {
                const polity = polities[i * width + j];
                
                const isRiver = 
                       i < height - 1 && Math.abs(j - jCenter) == 1 
                    || i == height - 1 && j == jCenter;

                
                const wetFraction = 0.01 * (isRiver
                    ? 10 + randint(10) + randint(10)
                    : 0)
                const dryLightSoilFraction = isRiver
                    ? Math.random() * (1 - wetFraction)
                    : Math.random() * 0.1;
                const capacityRatio = Math.random() * 0.3 + 0.5;
                this.tiles[i][j] = new Tile(world, i, j, polity, isRiver, wetFraction, dryLightSoilFraction, capacityRatio);
            }
        }
    }
}
