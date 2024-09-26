import { ChessBoardState } from './ChessBoardState';
import ecoJson from '../../eco.json/eco.json';
import interpolatedJson from '../../eco.json/eco_interpolated.json';


const ecoHash = ecoJson.reduce((acc: any, elem: any) => {
    acc[elem.fen] = elem;
    return acc;
}, {});
const openingsHash = { ...ecoHash, ... interpolatedJson };


export type ChessOpening = {
    eco: string,
    name: string
};



export class ChessGameState {
    private meta: {[key: string]: string};
    private boardStates: ChessBoardState[];
    private opening: ChessOpening | null;

    private constructor(meta: {[key: string]: string}, boardStates: ChessBoardState[]) {
        this.meta = meta;
        this.boardStates = boardStates;

        this.opening = null;
        for (let i = boardStates.length - 1; i >= 0; i--) {
            const fen = boardStates[i].toFEN();
            if (openingsHash[fen]) {
                this.opening = {
                    eco: openingsHash[fen].eco,
                    name: openingsHash[fen].name
                };
                break;
            }
        }        
    }

    // turns "1. e4 e5 2. nf3 nc6" into [e4, e5, nf3, nc6]
    public static parseMoves(pgn: string): string[] {
        return pgn.replace(/\d+\.\s*/g, '').split(/\s+/).filter(Boolean);
    }


    public static fromPGN(pgn: string): ChessGameState {
        const meta: {[key: string]: string} = ChessGameState.parseMetaFromPGN(pgn);
        const boardStates: ChessBoardState[] = [ChessBoardState.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')];

        const moves = ChessGameState.parseMoves(meta["SAN"]);
        for (const move of moves) {
            if (move !== '' && move !== '1-0' && move !== '0-1' && move !== '1/2-1/2' && move !== '*') {
                boardStates.push(boardStates[boardStates.length - 1].copy().move(move));
            }
        }

        return new ChessGameState(meta, boardStates);
    }

    public static parseMetaFromPGN(pgn: string): {[key: string]: string} {
        const lines = pgn.split(/[\r\n]+/).filter(Boolean);
        const meta: {[key: string]: string} = {};

        for (const line of lines) {
            const match = line.match(/^\[([^\]]+)\s\"([^"]+)\"\]$/);
            if (!match) {
                if (line.startsWith('1.')) {
                    meta["SAN"] = line;
                }
            } else {
                meta[match[1]] = match[2].replace(/\"/g, ""); // strip off the quotes
            }
        }

        return meta;
    }

    public static fromJSON(pgn: {[key: string]: string}): ChessGameState {
        const meta: {[key: string]: string} = {};
        const boardStates: ChessBoardState[] = [ChessBoardState.fromFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')];

        Object.keys(pgn).forEach(function(key) {
            const value = pgn[key]
            if (key === "SAN" || key === "Moves") {
                meta["SAN"] = value;
                const moves = ChessGameState.parseMoves(value);
                for (const move of moves) {
                    if (move !== '' && move !== '1-0' && move !== '0-1' && move !== '1/2-1/2' && move !== '*') {
                        boardStates.push(boardStates[boardStates.length - 1].copy().move(move));
                    }
                }
            } else {
                meta[key] = value;
            }
        })

        return new ChessGameState(meta, boardStates);
    }   


    public getMeta(key: string): string {
        return this.meta[key];
    } 

    public getMetaKeys(): string[] {
        return Object.keys(this.meta);
    }

    public getBoardStates(): ChessBoardState[] {
        return this.boardStates;
    } 

    public getOpening(): ChessOpening | null {
        return this.opening;
    }
}