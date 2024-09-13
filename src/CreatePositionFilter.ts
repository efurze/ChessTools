
import * as fs from 'fs';
import * as path from 'path';
import { ChessGameState } from './ChessGameState';
const fsp = fs.promises;



class ScriptParams {

    private input: string;
   
    public constructor(inputDir: string) {
        this.input = inputDir;
    }

    public inputDir() : string {
        return this.input;
    }
}

function *enumerateFiles(dir : string) : Generator<string> {
	  for (const entry of fs.readdirSync(dir)) {
	    const fullPath : string = path.join(dir, entry);
	    if (fs.statSync(fullPath).isDirectory()) {
	      yield* enumerateFiles(fullPath);
	    } else {
	      yield fullPath;
	    }
	  }
}

function readArgs() : ScriptParams {
	const args = process.argv.slice(2); // first 2 args are node and this file
	if (args.length < 1) {
	    console.log("Not enough parameters. USAGE: node CreatePositionFilter.js gamesdir/");
	    process.exit(1);
	}

	const params = new ScriptParams(args[0]);
	return params;
}


function run() : void {
	const params = readArgs();
	const fileGenerator = enumerateFiles(params.inputDir());
	let gameCount = 0;
	let positionCount : {[key:string] : number} = {};
	let file:string = "";

	while((file = fileGenerator.next().value) !== undefined) {
		const data : Buffer = fs.readFileSync(file);
        const game = ChessGameState.fromJSON(JSON.parse(data.toString()));

        // get positions for game
        const positions = game.getBoardStates();
        for (let i=0; i < positions.length-1; i++) { // no move is made in the last position
            const posId = positions[i].toBase64();
            positionCount[posId] = positionCount[posId] ?? 0;
            positionCount[posId]++;
        }

        if (++gameCount % 100 == 0) {
        	console.log("game " + gameCount);
        }

        if (gameCount % 30000 == 0) {
        	Object.keys(positionCount).forEach(function(key) {
        		if (positionCount[key] < 3) {
        			delete positionCount[key];
        		}
        	})
        }
	}

	Object.keys(positionCount).forEach(function(key) {
		if (positionCount[key] < 50) {
			delete positionCount[key];
		}
	})

	fs.writeFileSync("output.json", JSON.stringify(positionCount, null, " "));
}
// 10k to 20k took 30s => 20k/min => ~1 hour for whole set
run();





