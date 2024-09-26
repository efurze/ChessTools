import http from 'http';
import { ChessGameState } from './ChessGameState';


class HttpImporter {

    private server: any;
    constructor() {
       
    }

    public run() {
        this.server = http.createServer(async (req: any, res: any) => {
            // Wait for the request data to be fully received
            let body = '';
            req.on('data', (chunk: string) => { body += chunk.toString(); });
            req.on('end', () => {
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                try {
                    this.import(body, res);
                } catch(err) {
                    console.error(err);
                }
                res.end();
            });

        });

        this.server.listen(3000, () => {});
    }

    private import(pgn: string, res: any) {
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
            res.write(tsvData.join('\t') + '\n');
        }
    }
}

const importer = new HttpImporter();
importer.run();
