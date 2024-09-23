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

const POSITION_DIR : string = "positions";
let INITIAL_IMPORT : boolean = false;


class ScriptParams {

    private games_dir : string;
    private output_file : string;
    private filter : string;
   
    public constructor(filterFile: string, gamesDir: string, outputFile: string) {
        this.filter = filterFile;
        this.output_file = outputFile;
        this.games_dir = gamesDir;
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
}

function replacer(key:any, value:any) : any {
    if (value instanceof Set) {
        return [...value];
    }
    return value;
}


class PositionGenerator {

    private static MAX_WORKERS : number = 20;
    private static MAX_GAMES_PENDING : number = 100;
    private static MAX_FILEHANDLES : number = 20;

    private params : ScriptParams;
    private gameIterator : ObjectIterator;
    //private writer : BufferedWriter;
    private filter : {[key:string] : number} | undefined = undefined;
    private gameCount : number = 0;
    private gamesPending : number = 0; // # of games we're waiting for the workers to finish
    private currentWorker : number = 0; // round-robin pointer
    private workers : Worker[] = [];
    private readAllGames : boolean = false;
    private positionCache : {[id:string]:PositionInfo} = {};
    private posIdsToWrite : string[] = [];
    private flushed = false;

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
        try {
            this.filter = JSON.parse(fs.readFileSync(filterFile).toString());
        } catch (err) {
            this.filter = undefined;
        }
    }

    private readArgs(): ScriptParams {
        const args = process.argv.slice(2); // first 2 args are node and this file
        if (args.length < 2) {
            console.log("Not enough parameters. USAGE: node GeneratePositionHistories.js [filter.json] games.json output.json");
            process.exit(1);
        }

        const params = args.length > 2  
                            ? new ScriptParams(args[0], args[1], args[2])
                            : new ScriptParams("", args[0], args[1]);
        return params;
    }


    private cachePosition(pos : PositionInfo) : void {
        if (pos.getId() in this.positionCache) {
            this.positionCache[pos.getId()].merge(pos);
        } else {
            this.positionCache[pos.getId()] = pos;
        }

    }

    private flushCache() : void {
        const self = this;

        if (!self.flushed) {
            self.flushed = true;
            
            // do a final prune
            const ids = Object.keys(self.positionCache);
            ids.forEach(function(id) {
                if (self.positionCache[id].getGameCount() < 50) {
                    delete self.positionCache[id];
                } else if (self.positionCache[id].getGameCount() > 500000) {
                    // prune the starting pos
                    delete self.positionCache[id];
                }
            })

            // write
            console.log("saving...")
            fs.writeFileSync(self.params.outputFile(), JSON.stringify(self.positionCache, replacer, " "));
            /*
            this.posIdsToWrite = Object.keys(this.positionCache);
            for (let i=0; i < PositionGenerator.MAX_FILEHANDLES; i++) {
                this.writePosition();
            }
            */
        }
    }


    private pruneCache() : void {
        const self = this;
        const ids = Object.keys(self.positionCache);
        const total = ids.length;
        let count = 0;
        ids.forEach(function(id) {
            if (self.positionCache[id].getGameCount() < 3) {
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
            for (let i=2; i < positions.length-1; i++) { // no move is made in the last position, and we want to ignore the start position
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

        while((gameData = await self.gameIterator.next()) !== undefined) {
            const game = ChessGameState.fromJSON(JSON.parse(gameData[1]));
            const positions = self.generatePositionsForGame(game, gameData[0]);
            positions.forEach(function(pos) {
                self.cachePosition(pos);
            })
            if (++count % 100 == 0) {
                console.log(count + " games processed");
            }

            if (count % 50000 == 0) {
                self.pruneCache();
            }
        }

        self.flushCache();
    }

} // class PositionGenerator


console.log("Starting");
new PositionGenerator().run();

