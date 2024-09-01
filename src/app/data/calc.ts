export class Modifier {
}

export class Factor extends Modifier {
    value_: number;
    sourceMap_ = new Map<string, number>();

    constructor(value: number = 1) {
        super();
        this.value_ = value;    
    }

    public get value() { return this.value_; }
    private set value(value: number) { this.value_ = value; }

    public get rel() { return this.value_ - 1; }

    apply(source: string, baseValue: number, downscaleFactor: number = 1) {
        const newValue = downscaleFactor < 1 
            ? 1 + (baseValue - 1) * downscaleFactor
            : baseValue;

        const oldValue = this.sourceMap_.get(source);

        this.sourceMap_.set(source, newValue);
        if (oldValue === undefined) {
            this.value_ *= newValue;
        } else if (oldValue !== newValue) {
            this.refresh();
        }
    }

    private refresh() {
        this.value_ = 1;
        for (const v of this.sourceMap_.values()) {
            this.value_ *= v;
        }
    }
}
