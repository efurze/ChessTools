import { ChessBoardState } from './ChessBoardState';

export class ChessGameState {
    private meta: {[key: string]: string};
    private boardStates: ChessBoardState[];

    private constructor(meta: {[key: string]: string}, boardStates: ChessBoardState[]) {
        this.meta = meta;
        this.boardStates = boardStates;
    }

    public static fromPGN(pgn: string): ChessGameState {
        const lines = pgn.split(/[\r\n]+/);
        const meta: {[key: string]: string} = {};
        const boardStates: ChessBoardState[] = [ChessBoardState.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')];

        for (const line of lines) {
            const match = line.match(/^\[([^\]]+)\s\"([^"]+)\"\]$/);
            if (!match) {
                if (line.startsWith('1.')) {
                    meta["SAN"] = line;
                    const moves = line.replace(/\d+\./g, '').split(/\s+/);
                    for (const move of moves) {
                        if (move !== '' && move !== '1-0' && move !== '0-1' && move !== '1/2-1/2') {
                            boardStates.push(boardStates[boardStates.length - 1].copy().move(move));
                        }
                    }
                }
                break;
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