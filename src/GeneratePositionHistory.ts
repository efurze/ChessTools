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
import { PositionInfo } from './process_game_worker';
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

    private static MAX_WORKERS : number = 20;
    private static MAX_GAMES_PENDING : number = 100;

    private params : ScriptParams;
    private fileGenerator : Generator<string>;
    private writer : BufferedWriter;
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
        this.writer = new BufferedWriter(this.readAnotherGame.bind(this));
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

    private initializeWorkers() : void {
        const self = this;
        for (let i=0; i < PositionGenerator.MAX_WORKERS; i++) {
            const worker = new Worker('./dist/process_game_worker.js', {
                workerData: {filter:self.filter}
            });
            worker.on('message', this.workerMsg.bind(this));
            this.workers.push(worker);
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
        if (args.length < 1) {
            console.log("Not enough parameters. USAGE: node GeneratePositionHistories.js [filter.json] outputdir/");
            process.exit(1);
        }

        const params = args.length > 1  
                            ? new ScriptParams(args[0], args[1])
                            : new ScriptParams("", args[0]);
        return params;
    }


     private savePosition(pos : PositionInfo) : void {
        const baseDir = this.params.outputDir();
        const filePath = path.join(baseDir, POSITION_DIR, pos.getId().slice(0,2), pos.getId().slice(2));
        this.writer.writeFile(filePath, JSON.stringify(pos.getHistory(), null, " "));
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

    private workerMsg(positions : string[]) : void {
        //console.log("worker callback with " + positions.length + " positions");
        const self = this;

        // TODO: I probably can't count on 1 callback per game, so this isn't stable.
        // if the script fails to terminate after all the data's read this is probably why
        self.gamesPending--;

        self.gameCount ++;
        if (self.gameCount % 100 == 0) {
            console.error("game " + self.gameCount + " processed, positions written: " + self.writer.written());
        }
        
        positions.forEach(function(pos:string) {
            const position = PositionInfo.fromString(pos);
            self.savePosition(position);
        })
        self.shutDownIfDone();
    }

    private workerError(msg : string) : void {
        console.log("worker error: " + msg);
        this.workerMsg([]);
    }

    private shutDownIfDone() : void {
        if (this.readAllGames && this.gamesPending == 0) {
            // terminate the workers
            console.log("shutting down workers");
            this.workers.forEach(function(worker : Worker) {
                worker.terminate();
            })
        }
    }

    public readAnotherGame() : void {
        const self = this;
        
        if (self.gamesPending > PositionGenerator.MAX_GAMES_PENDING) {
            return;
        }

        let file : string = "";
        file = self.fileGenerator.next().value;
        if (file) {
            self.gamesPending ++;
            self.currentWorker ++;
            self.currentWorker %= PositionGenerator.MAX_WORKERS;
            self.workers[self.currentWorker].postMessage({data: [file]});
            
        } else {
            self.readAllGames = true;
            console.log("**** end of input", self.gamesPending + " games still to process");
            self.writer.dataDone();
            self.shutDownIfDone();
        }
    }
    

    public run(): void {
        const self = this;
        console.log("Initializing destination directory");
        self.initializeOutputDirectory(self.params.outputDir());
        self.loadFilter(self.params.filterFile());
        self.initializeWorkers();
        self.writer.start();
    }

} // class PositionGenerator

class BufferedWriter {

    
    // This limits the number of open file descriptors
    private static MAX_PENDING : number = 500;
    private static MAX_BUFFER : number = 1000;
    private pendingWrites : number = 0;
    private buffer : {filepath:string, data:string}[] = [];
    private requestMoreDataCB : ()=>void;
    private writeCount: number = 0;
    private done: boolean = false;

    public constructor(requestDataCB : ()=>void) {
        this.requestMoreDataCB = requestDataCB;
    }

    public dataDone() : void {
        this.done = true;
    }

    public start() : void {
        this.pump();
    }

    public written() : number {
        return this.writeCount;
    }

    public writeFile(filepath:string, data:string) : void {
        this.buffer.push({filepath: filepath, data: data});
        this.pump();
    }

    public pump() : void {
        const self = this;
        setTimeout(function(){self.doPump();}, 0);
    }

    private doPump() : void {
        const self = this;
        //console.log("doPump", "buffer:", this.buffer.length, "pending:", this.pendingWrites);
        if (self.buffer.length < BufferedWriter.MAX_BUFFER && !self.done) {
            self.requestMoreDataCB();
        }
        if (self.buffer.length && self.pendingWrites < BufferedWriter.MAX_PENDING) {
            self.pendingWrites++;
            const toWrite : {filepath:string, data:string} | undefined = self.buffer.shift();
            if (toWrite) {
                fsp.writeFile(toWrite.filepath, toWrite.data)
                    .catch(function(err){

                    })
                    .finally(function() {
                        self.pendingWrites--;
                        self.writeCount++;
                        if (self.done && self.pendingWrites % 100 == 0) {
                            //console.log(self.pendingWrites + " files left to write.");
                        }
                        self.pump();
                    });
            }
        } else if (!self.done && !self.buffer.length) {
            //console.log("buffer underrun");
        } else if (!self.done && self.pendingWrites >= BufferedWriter.MAX_PENDING) {
            //console.log("At max filehandles");
        }
        
    }
}

console.log("Starting");
new PositionGenerator().run();

