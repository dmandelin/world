import {Injectable} from "@angular/core";
import {Brain, BasicBrain, DefensiveBrain, NullBrain, SubjectBrain} from "./agents/brains";
import {NAMED_DEFAULT_POLITIES, Polity} from "./polity";
import {Tile} from "./tile";
import {Combatant, War} from "./legacy_war";
import {randelem, randint} from "./lib";

// Top TODOs
// - allocations
//   - experiment with land allocation and both allocation
//   - retune production functions based on above analysis
//   - apply to actual production
// - trade food for increased production
// - trade for obsidian for labor productivity and health bonuses
// - trade for lapis lazuli for culture bonuses
// - craft specialists: tools, cloth, pottery, jewelry

// Plan for trade
// - Start with existing food goods, since we already have them
//   - Don't expect huge gains from this type of trade, but it
//     would be nice to see some gains
//   - For the first step, consider only trade between adjacent tiles.
//   - Search for trades that increase utility on both sides. 
//   - At first, could even consider only unit-for-unit trades
//     since the products are for now nominally equally valued.
//   - Use some resonable transaction cost; lower for dairy
//   - Then visualize these trades and the gains from them
// - Very rough later steps:
//   - Consider markets, floating prices, diagonal trades
//   - Add plausible goods from the four sides of the map, e.g.,
//     obsidian/flint from the west, dairy from the north, lapis
//     lazuli from the east, and fish from the south.
//   - Allow longer-range trade and variable transaction costs
//   - Add effects on other aspects of society from each trade good.
//   - Add industries that create trade goods such as pottery and cloth.
//   - Model trade-driven urbanization and its ramifications.

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;
    private polities_ = NAMED_DEFAULT_POLITIES.map((pd, i) => 
        new Polity(this, pd.name, pd.mapColor, randelem(World.BRAINS)));
    readonly map = new WorldMap(this, 5, 5, this.polities);
    readonly log = new WorldLog();

    lastPopulation = new Map<Tile, number>();
    lastAttacks = new Set<[Polity, Polity]>();

    private watchers_: Set<Function> = new Set<Function>();
    private locallyControlledPolities = new Set<string>(['E']);

    constructor() {
        this.updateLastPopulation();
        this.recordRanks();
    }

    isLocallyControlled(p: Polity) {
        return this.locallyControlledPolities.has(p.name);
    }

    clearLocalControl() {
        this.locallyControlledPolities.clear();
    }

    updateLastPopulation() {
        for (const tile of this.map.tiles.flat()) {
            this.lastPopulation.set(tile, tile.population);
        }
    }

    populationChange(tile: Tile): number {
        const last = this.lastPopulation.get(tile);
        if (last === undefined) return 0;
        return (tile.population - last) / (last || 1);
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
                //this.resolveConstruct(this.actor);
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
        this.updateLastPopulation();
        /*
        this.lastAttacks.clear();
        this.log.turnlogClear();

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
        this.performAttack(actor, target);
        
        this.advanceState = 'continue';
        this.notifyWatchers();
    }

    skipAction() {
        ++this.actorState; 
    }

    advanceTurnFinish() {
        //this.updateTradeLinks();
        this.map.updatePopulations();

        this.year_ += 20;
        this.recordRanks();
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

    resolveConstruct(p: Polity) {
        if (p.suzerain) return;
        for (const t of this.map.tiles.flat()) {
            if (t.controller === p || t.controller.suzerain === p) {
                t.constructTurn();
            }
        }
    }

    performAttack(attacker: Polity, target: Polity) {
        this.resolveWar(this.setUpAttack(attacker, target));
    }

    setUpAttack(attacker: Polity, target: Polity): War {
        const ac = new Combatant(attacker, [attacker, ...attacker.vassals]);
        const defenders = attacker.counterAlliance.includes(target)
            ? attacker.counterAlliance : [target];
        const sovereignDefenders = [...new Set<Polity>(defenders.map(d => d.suzerain || d))];
        const dc = new Combatant(target.suzerain || target, sovereignDefenders.flatMap(d =>
            [d, ...[...d.vassals].filter(v => v !== attacker)]));
        return new War(this, attacker, ac, target, dc);
    }

    resolveWar(war: War) {
        this.lastAttacks.add([war.attacker, war.target]);

        this.log.turnlog('-');
        this.log.turnlog(`${war.attacker.name} attacks ${war.target.name}`)
        this.log.turnlog(`- AP = ${Math.floor(war.ap)} (${war.attackingCoalition.polities.map(p => p.name)})`);
        if (war.influenceAttackPenalty > 0.05) {
            this.log.turnlog(`- - attack impeded by ${Math.floor(war.influenceAttackPenalty*100)}% due to cultural sympathy!`);
        }
        this.log.turnlog(`- DP = ${Math.floor(war.dp)} (${war.defendingCoalition.polities.map(p => p.name)})`);

        war.attacker.attacked.add(war.target);
        war.target.defended.add(war.attacker);

        if (Math.random() < war.winp) {
            for (const p of war.attackingCoalition.polities) {
                this.losses(p, 0.01);
            }
            for (const p of war.defendingCoalition.polities) {
                this.losses(p, 0.05);
            }
            if (war.attacker.suzerain === war.target) {
                this.log.turnlog(`  Successful attack: ${war.attacker.name} throws off ${war.target.name}`);
                this.devassalize(war.target, war.attacker);            
            } else {
                this.log.turnlog(`  Successful attack: ${war.attacker.name} takes over ${war.target.name}`);
                this.vassalize(war.attacker, war.target);            
            }
        } else {
            this.log.turnlog(`  Failed attack`);
            for (const p of war.attackingCoalition.polities) {
                this.losses(p, 0.05);
            }
            for (const p of war.defendingCoalition.polities) {
                this.losses(p, 0.01);
            }
        }
    }

    losses(target: Polity, ratio: number) {
        for (const tile of this.map.tiles.flat()) {
            if (tile.controller == target) {
                tile.population -= Math.floor(ratio * tile.population);
            }
        }
    }

    takeover(attacker: Polity, defender: Polity) {
        for (const tile of this.map.tiles.flat()) {
            if (tile.controller == defender) {
                tile.controller = attacker;
            }
        }
        this.polities = this.polities.filter(p => p != defender);
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
}

class WorldLog {
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
                const dryLightSoilFraction = Math.random() * (1 - wetFraction);
                const capacityRatio = Math.random() * 0.3 + 0.5;
                this.tiles[i][j] = new Tile(world, i, j, polity, isRiver, wetFraction, dryLightSoilFraction, capacityRatio);
            }
        }
    }

    updatePopulations() {
        for (const t of this.tiles.flat()) {
            t.updatePopulation();
        }
    }
}
