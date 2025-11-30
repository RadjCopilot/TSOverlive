class Settings {
    constructor() {
        this.opacity = 80;
        this.minimal = false;
        this.maxUsers = 10;
        this.color = '#10b981';
        this.clickThrough = false;
        this.onChange = null;
    }

    load() {
        const saved = localStorage.getItem('ts6-settings');
        if (saved) {
            const data = JSON.parse(saved);
            this.opacity = data.opacity || 80;
            this.minimal = data.minimal || false;
            this.maxUsers = data.maxUsers || 10;
            this.color = data.color || '#10b981';
            this.clickThrough = data.clickThrough || false;
        }
    }

    save() {
        localStorage.setItem('ts6-settings', JSON.stringify({
            opacity: this.opacity,
            minimal: this.minimal,
            maxUsers: this.maxUsers,
            color: this.color,
            clickThrough: this.clickThrough
        }));
        if (this.onChange) this.onChange();
    }

    setOpacity(value) {
        this.opacity = value;
        this.save();
    }

    setMinimal(value) {
        this.minimal = value;
        this.save();
    }

    setMaxUsers(value) {
        this.maxUsers = value;
        this.save();
    }

    setColor(value) {
        this.color = value;
        this.save();
    }

    setClickThrough(value) {
        this.clickThrough = value;
        this.save();
    }
}
