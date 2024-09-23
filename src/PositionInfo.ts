export class PositionInfo {
	private id : string;
	private history : {[key:string] : Set<string>} = {}; // {'nf3' : [gameid, gameid ...], 'e4':[], ...}
	private gameCount : number = 0;
	private fen : string = "";

	public constructor(id:string, history:{[key:string] : string[]}, fen: string, gameCount:number = 0) {
		const self = this;
		this.id = id;
		this.fen = fen;
		this.gameCount = gameCount;
		Object.keys(history).forEach(function(move) {
			self.history[move] = new Set(history[move]);
		})
	}

	public merge(other : PositionInfo) : void {
		const self = this;
		const otherHistory = other.getHistory();
		Object.keys(otherHistory).forEach(function(move) {
			self.history[move] = self.history[move] ?? new Set<string>();
			if (otherHistory[move]) {
				otherHistory[move].forEach(function(gameId) {
					self.history[move].add(gameId);
				})
			}
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

	public getHistory() : {[key:string] : Set<string>} {
		return this.history;
	}

	public addGame(move:string, gameId:string) : void {
		this.history[move] = this.history[move] ?? new Set<string>();
		this.history[move].add(gameId);
		this.gameCount ++;
	}

	public toString() : string {
		const self = this;
		const h : {[key:string]:string[]} = {};
		Object.keys(self.history).forEach(function(move) {
			h[move] = Array.from(self.history[move]);
		})

		const obj = {
			id: this.id,
			fen: this.fen,
			gameCount: this.gameCount,
			history: h
		};
		return JSON.stringify(obj);
	}

	public static fromString(data : string) : PositionInfo {
		const obj = JSON.parse(data);
		const ret = new PositionInfo(obj.id, obj.history, obj.fen, obj.gameCount);
		return ret;
	}
}