import Store from "electron-store";
import MemStore from "./mem-store";

export interface IStore {
    get(key: string, defaultValue?: any): any;
    delete(key: string): void;
    set(key: string, value: any): void;
}

// Parameterise with Record<string, any> so get/set/delete all return `any`,
// keeping the rest of the codebase free of strict-type concerns from electron-store.
export class ExplorookStore extends Store<Record<string, any>> {
    constructor(name: string = "explorook") {
        super({ name });
    }

    public getOrCreate(key: string, value: any, onCreated: () => void = null): any {
        const data = this.get(key);
        if (!data) {
            this.set(key, value);
            if (onCreated) {
                onCreated();
            }
            return value;
        }
        return data;
    }
}

export const getStoreSafe = (): IStore => {
    try {
        return new Store<Record<string, any>>({ name: "explorook", watch: true });
    } catch (error) { // probably headless mode - defaulting to memory store
        // tslint:disable-next-line:no-console
        console.log("couldn't create electron-store. defaulting to memory store (this is normal when running headless mode)");
        return new MemStore();
    }
};
