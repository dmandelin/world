import { Injectable } from "@angular/core";
import { Tile } from "../model/tile";
import { WorldViewModel } from "../model/world";

@Injectable()
export class TilePanelBase {
    tile: Tile|undefined;

    constructor(readonly wvm: WorldViewModel) {
        this.tile = wvm.selectedTile;
    }

    private deleteWatcher: Function|undefined;

    ngAfterViewInit(): void {
      this.deleteWatcher = this.wvm.world.addWatcher(this.update.bind(this));
    }

    ngOnDestroy(): void {
      this.wvm.world.removeWatcher(this.deleteWatcher);
    }

    update() {
        this.tile = this.wvm.selectedTile;
        this.refresh();
    }

    refresh() {}
}
