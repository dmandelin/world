import { World } from '../world';
import { Polity } from '../polity';
import { Brain, BasicBrain, DefensiveBrain, SubjectBrain } from './brains';
import { randelem, shuffled, argmax, sorted } from '../lib';

function test() {
    const N = 1000;
    const games_by_brain: {[key: string]: number} = {};
    const wins_by_brain: {[key: string]: number} = {};
    const wins_by_start: {[key: string]: number} = {};
    let turns = 0;
    
    for (let i = 0; i < N; ++i) {
        const w = new World();
        for (const p of w.polities) {
            games_by_brain[p.brain.tag] = 1 + (games_by_brain[p.brain.tag] || 0);
        }
        let guard = 1000;
        while (w.polities.length > 1 && guard > 0) {
            w.advance();
            ++turns;
            --guard;
        }
        if (w.polities.length > 1) debugger;
        wins_by_brain[w.polities[0].brain.tag] = 1 + (wins_by_brain[w.polities[0].brain.tag] || 0);
        wins_by_start[w.polities[0].name] = 1 + (wins_by_start[w.polities[0].name] || 0);
    }

    console.log(`Results from ${N} games:`);
    console.log(`  Average turns per game: ${(turns / N).toFixed(2)}`);
    console.log(`  Average win rate per brain:`);
    for (const brainTag of Object.keys(wins_by_brain)) {
        const winRate = wins_by_brain[brainTag] / games_by_brain[brainTag];
        console.log(`    ${brainTag}: ${winRate}`);
    }
    console.log(`  Average win rate per start location:`);
    for (const start of Object.keys(wins_by_start)) {
        const winRate = wins_by_start[start] / N;
        console.log(`    ${start}: ${winRate}`);
    }
}

//test();

function evolve() {
    const generations = 500;

    const brainPopulation = [];
    let brains = World.BRAINS;
    if (true) {
        for (let i = 0; i < 25; ++i) {
            brainPopulation.push(randelem(World.BRAINS));
        }
    } else {
        brains = [
            new BasicBrain('B', 0.75, 0.25),
            new DefensiveBrain('D', 0.75),
            new SubjectBrain('S', 0.75, 0.75),
        ];
        for (let i = 0; i < 8; ++i) {
            brainPopulation.push(brains[0]);
        }
        for (let i = 0; i < 9; ++i) {
            brainPopulation.push(brains[1]);
        }
        for (let i = 0; i < 8; ++i) {
            brainPopulation.push(brains[2]);
        }
    }

    for (let i = 0; i < generations; ++i) {
        console.log(`* Generation ${i}`);

        const w = new World();
        w.clearLocalControl();
        w.setBrains(shuffled(brainPopulation));

        while (w.polities.length > 1 && w.year < 1000) {
            w.advance();
        }

        const top = argmax(w.polities, p => p.population);
        const winner = randelem(w.polities).brain;
        console.log(`  winner = ${winner.tag}, duplicating`);
        const nonWinningIndices = [...brainPopulation.filter(b => b.tag != winner.tag).keys()];
        if (nonWinningIndices.length === 0) {
            console.log('  no other brain types');
        } else {
            const removed = brainPopulation.splice(randelem(nonWinningIndices), 1);
            console.log(`  removed ${removed[0].tag} to make room for clone of winner`);
            brainPopulation.push(winner.clone());
        }

        if (Math.random() < 0.1) {
            const nonWinningIndices = [...brainPopulation.filter(b => b.tag != winner.tag).keys()];
            if (nonWinningIndices.length !== 0) {
                const removed = brainPopulation.splice(randelem(nonWinningIndices), 1);
                const mutant = randelem(brains);
                console.log(`  removed ${removed[0].tag} to make room for random brain ${mutant.tag}`);
                brainPopulation.push(mutant);
            }    
        }


        console.log('  new population');
        const counts: {[key: string]: number} = {};
        for (const b of brainPopulation) {
            counts[b.tag] = 1 + (counts[b.tag] || 0);
        }
        for (const k of sorted(Object.keys(counts))) {
            console.log(`    ${k}: ${counts[k]}`);
        }
    }
}

//evolve();
