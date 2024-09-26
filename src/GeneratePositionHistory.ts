/*
    GeneratePositionHistory

    USAGE: node GeneratePositionHistory.js [filter.json] outputdir/

    This will create outputdir/positions, creating outputdir/ if neccessary. 
    It assumes games are in outputdir/games.

    filter.json is an optional file which has the following format:
    {
        <positionID> : count,
        <positionID> : count,
        ...
    }

    The <count> is irrelevant to this script, but it will ignore any positionID that isn't in the file.
*/

import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { Worker } from 'worker_threads';
import { PositionInfo } from './PositionInfo';
import { ChessGameState } from './ChessGameState';
import * as crypto from 'crypto';
const fsp = fs.promises;
import { ObjectIterator } from './ObjectIterator';
import { BigMap } from './BigMap';

const POSITION_DIR : string = "positions";
let INITIAL_IMPORT : boolean = false;


class ScriptParams {

    private games_dir : string;
    private output_file : string;
    private filter : string;
    private filter_mode : boolean = false;
   
    public constructor(filterFile: string, gamesDir: string, outputFile: string, filterMode: boolean) {
        this.filter = filterFile;
        this.output_file = outputFile;
        this.games_dir = gamesDir;
        this.filter_mode = filterMode;
    }

    public gamesDir() : string {
        return this.games_dir;
    }

    public outputDir() : string {
        return "";
    }

    public outputFile() : string {
        return this.output_file;
    }

    public filterFile() : string {
        return this.filter;
    }

    public hasFilter() : boolean {
        return this.filter.length > 0;
    }

    public filterMode() : boolean {
        return this.filter_mode;
    }
}

function replacer(key:any, value:any) : any {
    if (value instanceof Set) {
        return [...value];
    }
    return value;
}


class PositionGenerator {

    private params : ScriptParams;
    private gameIterator : ObjectIterator;
    private filter : Set<string> | null = null;
    private gameCount : number = 0;
    private positionCache : {[id:string]:PositionInfo} = {};
    private positionCount : BigMap<number> = new BigMap<number>();
    private posIdsToWrite : Set<string> = new Set<string>();

    public constructor() {
        this.params = this.readArgs();
        this.gameIterator = new ObjectIterator(this.params.gamesDir());
        this.gameIterator.init();
    }

    private generateBase64Characters(): string[] {
        const base64Chars = [];
        // Uppercase letters (A-Z)
        for (let i = 65; i <= 90; i++) {
            base64Chars.push(String.fromCharCode(i));
        }
        // Lowercase letters (a-z)
        for (let i = 97; i <= 122; i++) {
            base64Chars.push(String.fromCharCode(i));
        }
        // Digits (0-9)
        for (let i = 48; i <= 57; i++) {
            base64Chars.push(String.fromCharCode(i));
        }
        // Special characters (+ and /)
        base64Chars.push('-', '_');
        return base64Chars;
    }

    private initializeOutputDirectory(outputdir : string) : void {
        const positionsdir = path.join(outputdir, POSITION_DIR);

        if (fs.existsSync(positionsdir)) {
            INITIAL_IMPORT = false;
            return;
        } else {
            INITIAL_IMPORT = true;
        }

        // make positions
        const charSet = this.generateBase64Characters();
        for (let i=0; i<charSet.length; i++) {
            for (let j=0; j<charSet.length; j++) {
                let dir = path.join(positionsdir, charSet[i] + charSet[j]);
                fs.mkdirSync(dir, {recursive: true});
            }
        }
    }

    private loadFilter(filterFile: string) : void {
        const self = this;
        try {
            const filterArray : string[] = JSON.parse(fs.readFileSync(filterFile).toString());
            self.filter = new Set<string>();
            filterArray.forEach(function(id) {
                self.filter?.add(id);
            })
        } catch (err) {
            self.filter = null;
        }
    }

    private readArgs(): ScriptParams {
        const args = process.argv.slice(2); // first 2 args are node and this file
        let filterMode = false;
        const nonFlagArgs: string[] = [];
        args.forEach(function(arg) {
            if (arg === "-f") {
                filterMode = true;
            } else {
                nonFlagArgs.push(arg);
            }
        })

        if (!filterMode && nonFlagArgs.length < 2) {
            console.log("Not enough parameters. USAGE: node GeneratePositionHistories.js [-f] [filter.json] games.json output.json");
            process.exit(1);
        } else if (filterMode && nonFlagArgs.length < 1) {
            console.log("Must provide input gamefile in filter mode");
            process.exit(1);
        }

        let params : ScriptParams;

        if (filterMode) {
            params = new ScriptParams("", nonFlagArgs[0], "", true);
        } else {
            params = nonFlagArgs.length > 2  
                                ? new ScriptParams(nonFlagArgs[0], nonFlagArgs[1], nonFlagArgs[2], false)
                                : new ScriptParams("", nonFlagArgs[0], nonFlagArgs[1], false);
        }

        return params;
    }


    private cachePosition(pos : PositionInfo) : void {
        if (this.filter !== null && !this.filter.has(pos.getId())) {
            return;
        }

        if (pos.getId() in this.positionCache) {
            this.positionCache[pos.getId()].merge(pos);
        } else {
            this.positionCache[pos.getId()] = pos;
        }

    }

    private flushCache() : void {
        const self = this;
            
        // do a final prune
        const ids = Object.keys(self.positionCache);
        ids.forEach(function(id) {
            if (self.positionCache[id].getGameCount() < 25) {
                delete self.positionCache[id];
            } else if (self.positionCache[id].getGameCount() > 500000) {
                // prune the starting pos
                delete self.positionCache[id];
            }
        })

        // write
        console.log("saving...");
        fs.appendFileSync(self.params.outputFile(), "{");
        Object.keys(self.positionCache).forEach(function(key, idx) {
            if (idx > 0) {
                fs.appendFileSync(self.params.outputFile(), ",\n");
            }
            const pos = self.positionCache[key];
            fs.appendFileSync(self.params.outputFile(), `"${key}":${JSON.stringify(pos)}`);
        })
        fs.appendFileSync(self.params.outputFile(), "}");
        //fs.writeFileSync(self.params.outputFile(), JSON.stringify(self.positionCache, replacer, " "));
    }


    private pruneCache(min:number) : void {
        const self = this;
        if (self.filter !== null) {
            // we're using a filter, no need to prune
            return;
        }
        const ids = Object.keys(self.positionCache);
        const total = ids.length;
        let count = 0;
        ids.forEach(function(id) {
            if (self.positionCache[id].getGameCount() < min) {
                delete self.positionCache[id];
                count ++;
            }
        })
        console.log("Pruned " + count + " out of " + total + " positions");
    }


    private generatePositionsForGame(game : ChessGameState, gameId : string) : PositionInfo[]  {
        const ret : PositionInfo[] = []; // [{'nf3' : [gameid, gameid...]}, ...]
        try {
            const moves = ChessGameState.parseMoves(game.getMeta("SAN"));
            const positions = game.getBoardStates();
            for (let i=2; i < positions.length-1; i++) { // no move is made in the last position, and we want to ignore the first 2 moves
                const posId = positions[i].toBase64();
                
                const outData : PositionInfo = new PositionInfo(posId, {}, positions[i].toFEN());

                outData.addGame(moves[i], gameId);
                ret.push(outData);
            }
        } catch (err) {
            console.log("generatePositionsForGame ERROR: " + JSON.stringify(err));
        }

        return ret;
    }
    

    public async run(): Promise<void> {
        const self = this;
        let count : number = 0;
        let gameData : string[] | undefined = [];

        if (self.params.hasFilter()) {
            self.loadFilter(self.params.filterFile());
        }

        if (self.params.filterMode()) {
            console.log("Generating filter");
        }

        while((gameData = await self.gameIterator.next()) !== undefined) {
            let game : ChessGameState;

            try {
                game = ChessGameState.fromJSON(JSON.parse(gameData[1]));
            } catch (err) {
                // malformed pgn, skip game
                continue;
            }
            const positions = self.generatePositionsForGame(game, gameData[0]);
            positions.forEach(function(pos) {
                
                if (self.params.filterMode()) {
                    
                    if (self.posIdsToWrite.has(pos.getId())) {
                        // position has already passed threshold
                        return;
                    }

                    let count = self.positionCount.get(pos.getId()) ?? 0;

                    if (++count >= 25) {
                        self.posIdsToWrite.add(pos.getId());
                    } else {
                        self.positionCount.set(pos.getId(), count);
                    }

                } else {
                    self.cachePosition(pos);
                }
            })
            if (++count % 1000 == 0) {
                if (self.params.filterMode()) {
                    console.log(count + " games processed", self.positionCount.size() + " positions ("
                        + "max shard=" + self.positionCount.maxShardSize() + ")");
                } else {
                    console.log(count + " games processed");
                }
            }

            if (!self.params.filterMode() && count % 50000 == 0) {
                self.pruneCache(3);
            }
        }

        if (self.params.filterMode()) {
            console.log("Writing filter. Saving " + self.posIdsToWrite.size + " out of " + self.positionCount.size());
            fs.writeFileSync("filter.json", JSON.stringify(self.posIdsToWrite, replacer, " "));
        } else {
            self.flushCache();
        }
    }

} // class PositionGenerator


console.log("Starting");
new PositionGenerator().run();

