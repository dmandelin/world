import { Component } from '@angular/core';
import { NgFor, NgStyle } from '@angular/common';

import { World } from '../../../model/world';
import { Polity } from '../../../model/polity';

@Component({
  selector: 'app-world-info-panel',
  standalone: true,
  imports: [NgFor, NgStyle],
  templateUrl: './world-info-panel.component.html',
  styleUrl: './world-info-panel.component.scss'
})
export class WorldInfoPanelComponent {
  constructor(readonly world: World) {
  }

  floor(n: number): number { return Math.floor(n); }

  advance() {
    this.world.advance();
  }

  rankChangeDisplay(p: Polity): string {
    if (p.historicalRanks.length <= 1) {
      return '';
    }

    const change = p.historicalRanks[p.historicalRanks.length - 2][1] -
        p.historicalRanks[p.historicalRanks.length - 1][1];
    switch (true) {
      case change > 0:
        return `⇧${change}`;
      case change < 0:
        return `⇩${-change}`;
      default:
        return '=';
    }
  }

  legacyDisplay(p: Polity): string {
    if (p.historicalRanks.length <= 1) {
      return '';
    }

    let message = '';

    const rank = p.historicalRanks[p.historicalRanks.length - 1][1];
    if (rank <= 5) {
      const targetRank = rank == 1 ? 1 : 5;
      const term = this.timeInRank(p, targetRank);
      message += term 
          ? `${targetRank == 1 ? '#1' : 'Top 5'} for ${term} years`
          : `Now #${rank}!`;

      if (targetRank == 1) {
        const termInTop5 = this.timeInRank(p, 5);
        if (termInTop5 > term) {
          message += `, top 5 for ${termInTop5} years`;
        }
      }
    }

    const [bestYear, bestRank] = this.bestYearAndRank(p);
    if (bestRank < rank && bestRank <= 5) {
      if (message) message += ', ';
      message += `was #${bestRank} ${this.world.year - bestYear} years ago`;
    }

    return message;
  }

  timeInRank(p: Polity, rank: number): number {
    let i = p.historicalRanks.length - 1;
    while (i > 0 && p.historicalRanks[i - 1][1] <= rank) --i;
    const firstYear = p.historicalRanks[i][0];
    return this.world.year - firstYear;
  }

  bestYearAndRank(p: Polity): [number, number] {
    let best = p.historicalRanks[0];
    for (const [year, rank] of p.historicalRanks) {
      if (rank <= best[1]) best = [year, rank];
    }
    return best;
  }
}
