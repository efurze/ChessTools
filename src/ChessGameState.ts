import { ChessBoardState } from './ChessBoardState';

export class ChessGameState {
    private meta: {[key: string]: string};
    private boardStates: ChessBoardState[];

    private constructor(meta: {[key: string]: string}, boardStates: ChessBoardState[]) {
        this.meta = meta;
        this.boardStates = boardStates;
    }

    // turns "1. e4 e5 2. nf3 nc6" into [e4, e5, nf3, nc6]
    public static parseMoves(pgn: string): string[] {
        return pgn.replace(/\d+\./g, '').split(/\s+/).filter(Boolean);
    }

    public static fromPGN(pgn: string): ChessGameState {
        const lines = pgn.split(/[\r\n]+/).filter(Boolean);
        const meta: {[key: string]: string} = {};
        const boardStates: ChessBoardState[] = [ChessBoardState.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')];

        for (const line of lines) {
            const match = line.match(/^\[([^\]]+)\s\"([^"]+)\"\]$/);
            if (!match) {
                if (line.startsWith('1.')) {
                    meta["SAN"] = line;
                    const moves = ChessGameState.parseMoves(line);
                    for (const move of moves) {
                        if (move !== '' && move !== '1-0' && move !== '0-1' && move !== '1/2-1/2') {
                            boardStates.push(boardStates[boardStates.length - 1].copy().move(move));
                        }
                    }
                }
            } else {
                meta[match[1]] = match[2];
            }
        }

        return new ChessGameState(meta, boardStates);
    }

    public getMeta(key: string): string {
        return this.meta[key];
    } 

    public getBoardStates(): ChessBoardState[] {
        return this.boardStates;
    } 
}