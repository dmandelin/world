import { World } from './world';
import { Polity } from './polity';

export class War {
    constructor(
        readonly world: World,
        readonly attacker: Polity,
        readonly attackingCoalition: Combatant,
        readonly target: Polity,
        readonly defendingCoalition: Combatant,
    ) {}

    readonly baseAP = this.attackingCoalition.attackPower;
    readonly ap =
        this.target === this.attacker.suzerain
        ? this.attackingCoalition.defensePower
        : this.attackingCoalition.attackPower;
    readonly dp = this.target === this.attacker.suzerain
        ? this.defendingCoalition.attackPower
        : this.defendingCoalition.defensePower;
    readonly winp = this.ap * this.ap / (this.ap * this.ap + this.dp * this.dp);
}

export class Combatant {
    constructor(public readonly leader: Polity, public readonly polities: readonly Polity[]) {}

    get attackPower(): number {
        return this.polities
            .map(p => p === this.leader ? p.attackPower : 0.25 * p.attackPower)
            .reduce((a, b) => a + b);
    }

    get defensePower(): number { 
        return this.polities
            .map(p => p.defensePower)
            .reduce((a, b) => a + b);
    }
}