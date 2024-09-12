/*
    ImportPGN

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

//500 to 3500 took 2:20
//    to 9500 took 8:10
//    to 25500 took 26:00
//    to 36500 took 1:20:00
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

    private static MAX_WORKERS : number = 10;

    private params : ScriptParams;
    private fileGenerator : Generator<string>;
    private writer : BufferedWriter;
    private filter : {[key:string] : number} | undefined = undefined;
    private gameCount : number = 0;
    private workerCount : number = 0;
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


     private savePosition(pos : PositionInfo, baseDir : string) : void {
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

    
    public readAnotherGame() : void {
        const self = this;
        if (self.workerCount > PositionGenerator.MAX_WORKERS) {
            return;
        }
        const file : string | undefined = self.fileGenerator.next().value;
        if (file) {
            self.gameCount ++;
            self.workerCount ++;

            if (self.gameCount % 10 == 0) {
                console.log("game " + self.gameCount);
            }

            const baseDir = path.dirname(path.dirname(file));
            const worker = new Worker('./dist/process_game_worker.js', {
              //workerData: { filepath: file, filter: self.filter }
                workerData: {data:file}
            });

            worker.on('message', function(positions : string[]) : void {    
                positions.forEach(function(pos:string) {
                    const position = PositionInfo.fromString(pos);
                    self.savePosition(position, baseDir);
                })
             });
/*
            worker.on('message', function(positions : string[]) : void {    
                positions.forEach(function(pos : string) : void {
                    self.savePosition(PositionInfo.fromString(pos), 
                        baseDir);
                });
            });
*/
            worker.on('exit', function():void {
                self.workerCount --;
                self.writer.pump();
            });
            
        } else {
            self.readAllGames = true;
            console.log("end of input");
            self.writer.dataDone();
        }
    }
    

    public run(): void {
        const self = this;
        console.log("Initializing destination directory");
        self.initializeOutputDirectory(self.params.outputDir());
        self.writer.start();
    }

} // class PositionGenerator

class BufferedWriter {

    
    // This limits the number of open file descriptors
    private static MAX_PENDING : number = 500;
    private static MAX_BUFFER : number = 5000;
    private pendingWrites : number = 0;
    private buffer : {filepath:string, data:string}[] = [];
    private requestMoreDataCB : ()=>void;
    private gameCount: number = 0;
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

    public writeFile(filepath:string, data:string) : void {
        //this.buffer.push({filepath: filepath, data: data});
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
                    .finally(function() {
                        self.pendingWrites--;
                        if (self.done && self.pendingWrites % 100 == 0) {
                            console.log(self.pendingWrites + " files left to write.");
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

