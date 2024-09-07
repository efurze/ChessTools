import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { ChessGameState } from './ChessGameState';
import * as crypto from 'crypto';

class ScriptParams {

    private input : string;
    private output: string;
   
    public constructor(inputFile: string, outputDir: string) {
        this.input = inputFile;
        this.output = outputDir;
    }

    public inputFile() : string {
        return this.input;
    }

    public outputDir() : string {
        return this.output;
    }
}

function initializeOutputDirectory(outputdir : string) : void {
    const gamesdir = path.join(outputdir, "games");
    const positionsdir = path.join(outputdir, "positions");    
    for (let i=0; i<256; i++) {
        const dir = path.join(gamesdir, i.toString(16).padStart(2, '0'));
        fs.mkdirSync(dir, { recursive: true });
    }
}

function readArgs(): ScriptParams {
    const args = process.argv.slice(2); // first 2 args are node and this file
    if (args.length < 2) {
        console.log("Not enough parameters. USAGE: node ImportPGN.js games.pgn outputdir/");
        process.exit(1);
    }

    const params = new ScriptParams(args[0], args[1]);
    return params;
}

function saveGame(data : string[], baseDir : string) : void {
    try {
        const game = ChessGameState.fromPGN(data.join('\n'));
        const moves = ChessGameState.parseMoves(game.getMeta("SAN"));

        // filename is 64-bit hash of the move sequence
        const hash = crypto.createHash('sha256')
                        .update(moves.join())
                        .digest('hex')
                        .slice(0,16);

        // get the metadata
        let outdata: {[key: string]:string} = {};
        game.getMetaKeys().forEach(function(key:string) {
            outdata[key] = game.getMeta(key);
        })
        // Save. Files are sharded by splitting the first 2 bytes of the hash
        // 'e8e7c50fbff3c046' => 'e8/e7c50fbff3c046'
        fs.writeFileSync(path.join(baseDir, "games", hash.slice(0,2), hash.slice(2)),
            JSON.stringify(outdata, null, " ")); 

    } catch (err) {
        //console.log(err);
        //console.log(data);
    }
}

async function doImport(): Promise<void> {
    const params = readArgs();
    initializeOutputDirectory(params.outputDir());
    const fileStream = fs.createReadStream(params.inputFile());  // Use createReadStream from 'fs'

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,  // Handle both Windows and Unix-style line breaks
    });

    let buffer : string[] = [];
    let gamecount : number = 0;
    // Read the file line by line
    for await (const line of rl) {
        buffer.push(line);
        if (line.trim().startsWith("1.")) {
            saveGame(buffer, params.outputDir());
            buffer = [];
            gamecount++;
            if (gamecount % 1000 == 0) {
                console.log("game " + gamecount);
            }
            
        }
    }
}

doImport();