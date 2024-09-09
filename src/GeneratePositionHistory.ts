/*
    ImportPGN

    USAGE: node GeneratePositionHistory.js outputdir/

    This will create outputdir/positions, creating outputdir/ if neccessary. It assumes games are in outputdir/games
*/

import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { ChessGameState } from './ChessGameState';
import * as crypto from 'crypto';
const fsp = fs.promises;

const GAME_DIR : string = "games";
const POSITION_DIR : string = "positions";
let INITIAL_IMPORT : boolean = false;

class ScriptParams {

    private output: string;
   
    public constructor(outputDir: string) {
        this.output = outputDir;
    }

    public outputDir() : string {
        return this.output;
    }
}




function generateBase64Characters(): string[] {
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

function initializeOutputDirectory(outputdir : string) : void {
    const positionsdir = path.join(outputdir, POSITION_DIR);

    if (fs.existsSync(positionsdir)) {
        INITIAL_IMPORT = false;
        return;
    } else {
        INITIAL_IMPORT = true;
    }

    // make positions
    const charSet = generateBase64Characters();
    for (let i=0; i<charSet.length; i++) {
        for (let j=0; j<charSet.length; j++) {
            let dir = path.join(positionsdir, charSet[i] + charSet[j]);
            fs.mkdirSync(dir, {recursive: true});
        }
    }
}

function readArgs(): ScriptParams {
    const args = process.argv.slice(2); // first 2 args are node and this file
    if (args.length < 1) {
        console.log("Not enough parameters. USAGE: node GeneratePositionHistories.js outputdir/");
        process.exit(1);
    }

    const params = new ScriptParams(args[0]);
    return params;
}

 function loadPosition(posId : string, baseDir : string) : {[key:string] : string[]}  {
    const filePath = path.join(baseDir, POSITION_DIR, posId.slice(0,2));
    const fileName = posId.slice(2);
    let data : string = "{}";
    try {
        const b : Buffer =  fs.readFileSync(path.join(filePath, fileName));
        data = b ? b.toString() : "{}";
        return JSON.parse(data);
    } catch (err) {
        //console.log(err);
    }
    return {};
}


 function savePosition(history : {[key:string] : string[]}, posId : string, baseDir : string) : void {
    const filePath = path.join(baseDir, POSITION_DIR, posId.slice(0,2));
    //console.log(filePath);
    writer.writeFile(filePath, posId.slice(2), JSON.stringify(history, null, " "));
}


 function updatePositionsForGame(game : ChessGameState, gameId : string, baseDir : string) : void {
    try {
        const moves = ChessGameState.parseMoves(game.getMeta("SAN"));
        const positions = game.getBoardStates();
        for (let i=0; i < positions.length-1; i++) { // no move is made in the last position
            const posId = positions[i].toBase64();

            /*
                If we just created the directory then we know that loadPosition
                will always fail, so just create an empty object. This speeds
                the import up a lot.
            */
            const outData : {[key:string] : string[]} 
                = INITIAL_IMPORT ? {} : loadPosition(posId, baseDir);

            // check if we've already added this game to this position
            if (!JSON.stringify(outData).includes(gameId)) {
                // add this gameId to the position history
                outData[moves[i]] = outData[moves[i]] ?? [];
                outData[moves[i]].push(gameId);
                savePosition(outData, posId, baseDir);
            } 
        }
    } catch (err) {
        console.log(err);
    }
}

function* enumerateFiles(dir : string) : Generator<string> {
  for (const entry of fs.readdirSync(dir)) {
    const fullPath : string = path.join(dir, entry);
    if (fs.statSync(fullPath).isDirectory()) {
      yield* enumerateFiles(fullPath);
    } else {
      yield fullPath;
    }
  }
}

let params : ScriptParams;
let fileGenerator : Generator<string>;
let writer : BufferedWriter;
let gameCount : number = 0;
let readAllGames : boolean = false;

function readAnotherGame() : void {
    const file : string | undefined = fileGenerator.next().value;
    if (file) {
        try {
            const data : Buffer = fs.readFileSync(file);
            const game = ChessGameState.fromJSON(JSON.parse(data.toString()));

            const enclosingDir : string = path.basename(path.dirname(file));
            const fileName : string = path.basename(file);
            
            updatePositionsForGame(game, enclosingDir + fileName, params.outputDir());
            if (++gameCount % 10 == 0) {
                console.error("game " + gameCount);
            }
        } catch (err) {
            console.log(err);
            console.log(file);
        }

    } else {
        readAllGames = true;
        writer.dataDone();
    }
}



function run(): void {
    params = readArgs();

    console.log("Initializing destination directory");
    initializeOutputDirectory(params.outputDir());

    console.log("Reading game directory");
    fileGenerator  = enumerateFiles(path.join(params.outputDir(), GAME_DIR));

    writer = new BufferedWriter(readAnotherGame);
    writer.start();
}

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

    public writeFile(dir:string, file:string, data:string) : void {
        this.buffer.push({
            filepath: path.join(dir, file),
            data: data
        });

        this.pump();
    }

    private pump() : void {
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
                        self.pump();
                    });
            }
        }
        
    }
}

console.log("Starting");
run();