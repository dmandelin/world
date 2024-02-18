import { Injectable } from "@angular/core";

@Injectable({providedIn: 'root'})
export class World {
    private year_ = 0;

    get year() { return this.year_; }
}