import * as fs from 'fs';
import * as readline from 'readline';
import { ChessGameState } from './ChessGameState';

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

function readArgs(): ScriptParams {
    const args = process.argv.slice(2); // first 2 args are node and this file
    if (args.length < 2) {
        console.log("Not enough parameters. USAGE: node ImportPGN.js games.pgn outputdir/");
        process.exit(1);
    }

    const params = new ScriptParams(args[0], args[1]);
    return params;
}

function saveGame(data : string[]) : void {
    try {
        const game = ChessGameState.fromPGN(data.join('\n'));
        console.log(game.getMeta("White") + " vs " + game.getMeta("Black"));
    } catch (err) {
        console.log(err);
        console.log(data);
    }
}

async function doImport(): Promise<void> {
    const params = readArgs();

    const fileStream = fs.createReadStream(params.inputFile());  // Use createReadStream from 'fs'

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,  // Handle both Windows and Unix-style line breaks
    });

    let buffer : string[] = [];

    // Read the file line by line
    for await (const line of rl) {
        buffer.push(line);
        if (line.trim().startsWith("1.")) {
            saveGame(buffer);
            buffer = [];
        }
    }
}

doImport();