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

    gmgames 12k import takes 1:17
*/

import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { Worker } from 'worker_threads';
import * as crypto from 'crypto';
const fsp = fs.promises;

const GAME_DIR : string = "games";
const POSITION_DIR : string = "positions";
let INITIAL_IMPORT : boolean = false;


class ScriptParams {

    private output: string;
    private filter: string;
   
    public constructor(filterFile: string, outputDir: string) {
        this.filter = filterFile;
        this.output = outputDir;
    }

    public outputDir() : string {
        return this.output;
    }

    public filterFile() : string {
        return this.filter;
    }
}


class PositionGenerator {

    private static MAX_WORKERS : number = 2;

    private params : ScriptParams;
    private fileGenerator : Generator<string>;
    private filter : {[key:string] : number} | undefined = undefined;
    private gameCount : number = 0;
    private gamesPending : number = 0; // # of games we're waiting for the workers to finish
    private currentWorker : number = 0; // round-robin pointer
    private workers : Worker[] = [];
    private readAllGames : boolean = false;

    public constructor() {
        this.params = this.readArgs();
        this.fileGenerator = this.enumerateFiles(path.join(this.params.outputDir(), 
                                                            GAME_DIR));
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

        // make positions
        const charSet = this.generateBase64Characters();
        for (let i=0; i<charSet.length; i++) {
            for (let j=0; j<charSet.length; j++) {
                let dir = path.join(positionsdir, charSet[i] + charSet[j]);
                fs.mkdirSync(dir, {recursive: true});
            }
        }
    }

    private initializeWorkers() : void {
        const self = this;
        for (let i=0; i < PositionGenerator.MAX_WORKERS; i++) {
            const worker = new Worker('./dist/process_game_worker.js', {
                workerData: {filter:self.filter, baseDir:self.params.outputDir()}
            });
            worker.on('message', this.workerMsg.bind(this));
            this.workers.push(worker);
        }
    }

    private loadFilter(filterFile: string) : void {
        const self = this;
        try {
            self.filter = JSON.parse(fs.readFileSync(filterFile).toString());
            if (self.filter) {
                // prune out all the positions that occur > 50k times. This eliminates
                // stuff like the starting position or 1. e4
                Object.keys(self.filter).forEach(function(posId:string) {
                    if (self.filter && self.filter[posId] > 50000) {
                        delete self.filter[posId];
                    }
                })
            }
        } catch (err) {
            self.filter = undefined;
        }
    }

    private readArgs(): ScriptParams {
        const args = process.argv.slice(2); // first 2 args are node and this file
        if (args.length < 1) {
            console.log("Not enough parameters. USAGE: node GeneratePositionHistories.js [filter.json] outputdir/");
            process.exit(1);
        }

        const params = args.length > 1  
                            ? new ScriptParams(args[0], args[1])
                            : new ScriptParams("", args[0]);
        return params;
    }


    private * enumerateFiles(dir : string) : Generator<string> {
      for (const entry of fs.readdirSync(dir)) {
        const fullPath : string = path.join(dir, entry);
        if (fs.statSync(fullPath).isDirectory()) {
          yield* this.enumerateFiles(fullPath);
        } else {
          yield fullPath;
        }
      }
    }

    private workerMsg() : void {
        //console.log("worker callback");
        this.gamesPending --;
        this.gameCount ++;
        if (this.gameCount % 10 == 0) {
            console.log("processed game: " + this.gameCount);
        }
        if (!this.readAllGames) {
            this.readAnotherGame();
        } else if (!this.gamesPending) {
            //this.terminateWorkers();
        }
    }

    private workerError(msg : string) : void {
        console.log("worker error: " + msg);
        this.workerMsg();
    }

    private terminateWorkers() : void {
        console.log("shutting down worker threads");
        this.workers.forEach(function(worker) {
            worker.terminate();
        })
    }

    private sendOfData() : void {
        this.workers.forEach(function(worker) {
            worker.postMessage({cmd: "save"});
        })
    }


    public readAnotherGame() : void {
        const self = this;
        
        if (self.readAllGames) {
            return;
        }

        let file : string = "";
        file = self.fileGenerator.next().value;
        if (file) {
            self.gamesPending ++;
            self.currentWorker ++;
            self.currentWorker %= PositionGenerator.MAX_WORKERS;
            self.workers[self.currentWorker].postMessage({cmd: "game", data: [file]});
            
        } else {
            self.readAllGames = true;
            console.log("**** end of input");
            self.sendOfData();
            if (!self.gamesPending) {
                //self.terminateWorkers();
            }
        }
    }
    

    public run(): void {
        const self = this;
        console.log("Initializing destination directory");
        self.initializeOutputDirectory(self.params.outputDir());
        self.loadFilter(self.params.filterFile());
        self.initializeWorkers();
        for (let i=0; i<PositionGenerator.MAX_WORKERS; i++) {
            self.readAnotherGame();
        }
    }

} // class PositionGenerator


console.log("Starting");
new PositionGenerator().run();

