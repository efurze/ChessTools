
const { workerData, parentPort } = require('worker_threads');
import { ChessGameState } from './ChessGameState';
import * as path from 'path';
import * as fs from 'fs';
import { PositionInfo } from './PositionInfo';

const INITIAL_IMPORT = false;
const POSITION_DIR = "position";

let positionFilter : {[key:string] : boolean} | undefined = undefined;


function updatePositionsForGame(game : ChessGameState, 
								gameId : string, 
								baseDir : string) : PositionInfo[]  {
    const ret : PositionInfo[] = []; // [{'nf3' : [gameid, gameid...]}, ...]
    try {
        const moves = ChessGameState.parseMoves(game.getMeta("SAN"));
        const positions = game.getBoardStates();
        for (let i=2; i < positions.length-1; i++) { // no move is made in the last position, and we want to ignore the start position
            const posId = positions[i].toBase64();
            
            if (positionFilter && !positionFilter[posId]) {
                // not in filter - skip this position
                continue;
            }
            
            const outData : PositionInfo
                = new PositionInfo(posId, {}, positions[i].toFEN());

            // check if we've already added this game to this position
            if (!JSON.stringify(outData.getHistory()).includes(gameId)) {
                // add this gameId to the position history
                outData.addGame(moves[i], gameId);
                ret.push(outData);
            } 
        }
    } catch (err) {
        log("updatePositionsForGame ERROR: " + JSON.stringify(err));
    }

    return ret;
}

function processGame(filepath : string) : PositionInfo[]  {
	let ret : PositionInfo[] = [];

	try {
	  	const data : Buffer = fs.readFileSync(filepath);
		const game = ChessGameState.fromJSON(JSON.parse(data.toString()));
		const baseDir = path.dirname(path.dirname(filepath));
		const enclosingDir : string = path.basename(path.dirname(filepath));
		const fileName : string = path.basename(filepath);

		ret = updatePositionsForGame(game, enclosingDir + fileName, baseDir);
	} catch (err) {
	}
	return ret;
}

function test(filepath:string):string{
	const data : Buffer = fs.readFileSync(filepath);
	const game = ChessGameState.fromJSON(JSON.parse(data.toString()));
	return updatePositionsForGame(game, "foo", "bar")[0].toString();
}

function log(msg:string):void {
	process.stdout.write(msg + '\n');
}

if (workerData) {
	//log("worker initializing " + (workerData.filter ? "with filter" : "without filter"));
	positionFilter = workerData.filter;
};

if (parentPort) {
	parentPort.on('message', function(msg : {[key:string]:string[]}) {
		const gamefilepaths = msg.data;
		//log("worker got " + gamefilepaths.length + " games");

		gamefilepaths.forEach(function(filepath:string) {
			parentPort.postMessage(processGame(filepath).map(function(p){
				return p.toString();
			}));
		})
	});
}



