import { ChessGameState } from './ChessGameState';


class StdinImporter {
    public static import(pgn: string) {
        const chessGameState = ChessGameState.fromPGN(pgn);
        for (const chessBoardState of chessGameState.getBoardStates()) {

            const tsvData = [
                chessGameState.getOpening()?.eco ?? '',
                chessBoardState.toBase64(),
                chessGameState.getMeta('White'),
                chessGameState.getMeta('Black'),
                chessGameState.getMeta('Date'),
                chessGameState.getOpening()?.name ?? '',
                chessBoardState.getFullMoveNumber(),
                chessBoardState.getActiveColor()
            ]


            console.log(tsvData.join('\t'));
        }
    }
}


process.stdin.setEncoding('utf8').on('data', StdinImporter.import).on('end', () => {});
