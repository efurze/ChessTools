/*
    ImportPGN

    USAGE: node ImportPGN.js lotsofgames.pgn outputdir/

    This will create both outputdir/games and outputdir/positions, creating outputdir/ if neccessary.
*/

import * as fs from 'fs';
import * as readline from 'readline';
import * as path from 'path';
import { ChessGameState } from './ChessGameState';
import * as crypto from 'crypto';
const fsp = fs.promises;

const GAME_DIR : string = "games";

class ScriptParams {

    private input : string;
    private output: string;
   
    public constructor(inputFile: string, outputFile: string) {
        this.input = inputFile;
        this.output = outputFile;
    }

    public inputFile() : string {
        return this.input;
    }

    public outputFile() : string {
        return this.output;
    }
}


function initializeOutputDirectory(outputdir : string) : void {
    const gamesdir = path.join(outputdir, GAME_DIR);
   // make games
    for (let i=0; i<256; i++) {
        let dir = path.join(gamesdir, i.toString(16).padStart(2, '0'));
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


async function importGame(data : string[], outFile : string) : Promise<void> {
    try {
        const joinedData = data.join('\n');
        if (joinedData.includes("Chess960") || joinedData.includes("Fisher Random") 
            || joinedData.includes("Fischer Random") || joinedData.includes("Freestyle Chess")) {
            return;
        }
        const game = ChessGameState.fromPGN(joinedData);
        const moves = ChessGameState.parseMoves(game.getMeta("SAN"));

        // filename is 64-bit hash of the move sequence
        const hash = crypto.createHash('sha256')
                        .update(moves.join())
                        .digest('hex')
                        .slice(0,16);


        let outdata: {[key: string]:string} = {};
         game.getMetaKeys().forEach(function(key:string) {
            outdata[key] = game.getMeta(key);
         })
         // Save game file. Files are sharded by splitting the first 2 bytes of the hash
         // 'e8e7c50fbff3c046' => 'e8/e7c50fbff3c046'
         /*
         await fsp.writeFile(path.join(baseDir, 
                                        GAME_DIR, 
                                        hash.slice(0,2), 
                                        hash.slice(2)), 
                            JSON.stringify(outdata, null, " ")); 
        */

         await fsp.appendFile(outFile, `"${hash}":${JSON.stringify(outdata)},\n`);

    } catch (err) {
        console.log(err);
        console.log(data);
    }
}

async function doImport(): Promise<void> {
    const params = readArgs();
    //initializeOutputDirectory(params.outputDir());
    
    const fileStream = fs.createReadStream(params.inputFile());  // Use createReadStream from 'fs'

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,  // Handle both Windows and Unix-style line breaks
    });

    await fsp.appendFile(params.outputFile(), "{");

    let buffer : string[] = [];
    let gamecount : number = 0;
    // Read the file line by line
    for await (const line of rl) {
        buffer.push(line);
        if (line.trim().startsWith("1.")) {
            await importGame(buffer, params.outputFile());
            buffer = [];
            gamecount++;
            if (gamecount % 10 == 0) {
                console.log("game " + gamecount);
            }
            
        }
    }

    await fsp.appendFile(params.outputFile(), "}");

}

doImport();