
const { workerData, parentPort } = require('worker_threads');
import { ChessGameState } from './ChessGameState';
import * as path from 'path';
import * as fs from 'fs';
const fsp = fs.promises;

const POSITION_DIR = "positions";

let positionFilter : {[key:string] : boolean} | undefined = undefined;
let baseDir : string = "";

class PositionInfo {
	private id : string;
	private history : {[key:string] : string[]}; // {'nf3' : [gameid, gameid ...], 'e4':[], ...}

	public constructor(id:string, history:{[key:string] : string[]}) {
		this.id = id;
		this.history = history;
	}

	public getId() : string {
		return this.id;
	}

	public getHistory() : {[key:string] : string[]} {
		return this.history;
	}

	public addGame(move:string, gameId:string) : void {
		this.history[move] = this.history[move] ?? [];
		this.history[move].push(gameId);
	}

	public toString() : string {
		const obj = {
			id: this.id,
			history: this.history
		};
		return JSON.stringify(obj);
	}

	public static fromString(data : string) : PositionInfo {
		const obj = JSON.parse(data);
		return new PositionInfo(obj.id, obj.history);
	}
}

function loadPosition(posId : string, baseDir : string) : PositionInfo  {
        const filePath = path.join(baseDir, POSITION_DIR, posId.slice(0,2));
        const fileName = posId.slice(2);
        let ret : PositionInfo = new PositionInfo(posId, {});
        let data : string = "{}";
        try {
        	// acquire file lock even if it doesn't exist yet
        	// this prevents 2 workers from making the same file
            const b : Buffer =  fs.readFileSync(path.join(filePath, fileName));
            data = b ? b.toString() : "{}";
            ret = new PositionInfo(posId, JSON.parse(data));
        } catch (err) {
            //console.log(err);
        }
        return ret;
    }


async function savePositions_old(positions : PositionInfo[]) : Promise<void> {
	try {
		await Promise.all(positions.map(function(pos : PositionInfo) {
			const filePath = path.join(baseDir, POSITION_DIR, pos.getId().slice(0,2), pos.getId().slice(2));
			fsp.writeFile(filePath, JSON.stringify(pos.getHistory(), null, " "));
		}));
    } catch (err) {

    }
}

async function savePositions(positions : PositionInfo[]) : Promise<void> {
	const writer = new BufferedWriter();
	await writer.writeFiles(positions.map(function(pos : PositionInfo) {
			const filePath = path.join(baseDir, POSITION_DIR, pos.getId().slice(0,2), pos.getId().slice(2));
			return{filepath: filePath, data: JSON.stringify(pos.getHistory(), null, " ")};
		}));
}

function updatePositionsForGame(game : ChessGameState, 
								gameId : string, 
								baseDir : string) : PositionInfo[]  {
    const ret : PositionInfo[] = []; // [{'nf3' : [gameid, gameid...]}, ...]
    try {
        const moves = ChessGameState.parseMoves(game.getMeta("SAN"));
        const positions = game.getBoardStates();
        for (let i=0; i < positions.length-1; i++) { // no move is made in the last position
            const posId = positions[i].toBase64();
            
            if (positionFilter && !positionFilter[posId]) {
                // not in filter  skip this position
                continue;
            }
            
            const outData : PositionInfo = loadPosition(posId, baseDir);
            

            // check if we've already added this game to this position
            if (!JSON.stringify(outData.getHistory()).includes(gameId)) {
                // add this gameId to the position history
                outData.addGame(moves[i], gameId);
                ret.push(outData);
            } 
        }
    } catch (err) {
        log(JSON.stringify(err));
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

function log(msg:string):void {
	process.stdout.write(msg + '\n');
}

async function onMessage(msg : {[key:string]:string[]}) : Promise<void> {
	const gamefilepaths = msg.data;
	let positions : PositionInfo[] = [];
	//log("worker got " + gamefilepaths[0]);

	gamefilepaths.forEach(function(filepath:string) {
		positions = positions.concat(processGame(filepath));
	})

	await savePositions(positions);	
	parentPort.postMessage("more data");
};



if (workerData) {
	//log("worker initializing " + (workerData.filter ? "with filter" : "without filter"));
	positionFilter = workerData.filter;
	baseDir = workerData.baseDir;
};


if (parentPort) {
	parentPort.on('message', onMessage);
}


class BufferedWriter {

    
    // This limits the number of open file descriptors
    private static MAX_PENDING : number = 50;
    private pendingWrites : number = 0;
    private buffer : {filepath:string, data:string}[] = [];
    private resolve: (value?: unknown | PromiseLike<unknown>) => unknown = ()=>{};

    public constructor() {
    }

    public async writeFiles(writes:{filepath:string, data:string}[]) : Promise<unknown> {
        const self = this;
        writes.forEach(function(write:{filepath:string, data:string}) {
        	self.buffer.push({filepath: write.filepath, data: write.data});
        })

        let count = 0;
        while(count < BufferedWriter.MAX_PENDING && self.buffer.length) {
        	self.dispatch();
        	count++;
        }

        const promise = new Promise(function(res,rej) {
        	self.resolve = res;
        });
        return promise;
    }



    private async dispatch() : Promise<void> {
        const self = this;
        if (self.buffer.length && self.pendingWrites < BufferedWriter.MAX_PENDING) {
            self.pendingWrites++;
            const toWrite : {filepath:string, data:string} | undefined = self.buffer.shift();
            if (toWrite) {
            	try {
	                await fsp.writeFile(toWrite.filepath, toWrite.data);
	            } catch (err) {

				} finally {
                    self.pendingWrites--;
                    if (self.buffer.length) {
                        self.dispatch();
                    } else if (self.resolve) {
                    	self.resolve();
                    }
				}
            }
        } 
    }
}


