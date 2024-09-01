import { Injectable } from "@angular/core";
import { WorldViewModel } from "../../model/world";

@Injectable()
export class TilePanelBase {
    constructor(readonly wvm: WorldViewModel) {}

    get tile() { return this.wvm.selectedTile; }

    private deleteWatcher: Function|undefined;

    ngAfterViewInit(): void {
      this.deleteWatcher = this.wvm.world.addWatcher(this.update.bind(this));
    }

    ngOnDestroy(): void {
      this.wvm.world.removeWatcher(this.deleteWatcher);
    }

    update() {
    }
}
