class Settings {
    constructor() {
        this.opacity = 80;
        this.minimal = false;
        this.maxUsers = 10;
        this.color = '#10b981';
        this.clickThrough = false;
        this.tsVersion = 'ts6';
        this.ts3ApiKey = '';
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
            this.tsVersion = data.tsVersion || 'ts6';
            this.ts3ApiKey = data.ts3ApiKey || '';
        }
    }

    save(reconnect = false) {
        localStorage.setItem('ts6-settings', JSON.stringify({
            opacity: this.opacity,
            minimal: this.minimal,
            maxUsers: this.maxUsers,
            color: this.color,
            clickThrough: this.clickThrough,
            tsVersion: this.tsVersion,
            ts3ApiKey: this.ts3ApiKey
        }));
        if (this.onChange) this.onChange(reconnect);
    }

    setOpacity(value) {
        this.opacity = value;
        this.save(false);
    }

    setMinimal(value) {
        this.minimal = value;
        this.save(false);
    }

    setMaxUsers(value) {
        this.maxUsers = value;
        this.save(false);
    }

    setColor(value) {
        this.color = value;
        this.save(false);
    }

    setClickThrough(value) {
        this.clickThrough = value;
        this.save(false);
    }

    setTsVersion(value) {
        this.tsVersion = value;
        this.save(true);
    }

    setTs3ApiKey(value) {
        this.ts3ApiKey = value;
        this.save(true);
    }
}
