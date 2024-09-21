
const { workerData, parentPort } = require('worker_threads');
import { ChessGameState } from './ChessGameState';
import * as path from 'path';
import * as fs from 'fs';

const INITIAL_IMPORT = false;
const POSITION_DIR = "position";

let positionFilter : {[key:string] : boolean} | undefined = undefined;

export class PositionInfo {
	private id : string;
	private history : {[key:string] : string[]}; // {'nf3' : [gameid, gameid ...], 'e4':[], ...}
	private gameCount : number = 0;
	private fen : string = "";

	public constructor(id:string, history:{[key:string] : string[]}, fen: string, gameCount:number = 0) {
		this.id = id;
		this.fen = fen;
		this.gameCount = gameCount;
		this.history = history;
	}

	public merge(other : PositionInfo) : void {
		const self = this;
		const otherHistory = other.getHistory();
		Object.keys(otherHistory).forEach(function(move) {
			self.history[move] = self.history[move] ?? [];
			self.history[move] = self.history[move].concat(otherHistory[move]);
		})

		self.gameCount += other.getGameCount();
	}

	public setFEN(fen : string) : void {
		this.fen = fen;
	}

	public getFEN() : string {
		return this.fen;
	}

	public getId() : string {
		return this.id;
	}

	public getGameCount() : number {
		return this.gameCount;
	}

	public getHistory() : {[key:string] : string[]} {
		return this.history;
	}

	public addGame(move:string, gameId:string) : void {
		this.history[move] = this.history[move] ?? [];
		this.history[move].push(gameId);
		this.gameCount ++;
	}

	public toString() : string {
		const obj = {
			id: this.id,
			fen: this.fen,
			gameCount: this.gameCount,
			history: this.history
		};
		return JSON.stringify(obj);
	}

	public static fromString(data : string) : PositionInfo {
		const obj = JSON.parse(data);
		const ret = new PositionInfo(obj.id, obj.history, obj.fen, obj.gameCount);
		return ret;
	}
}


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



