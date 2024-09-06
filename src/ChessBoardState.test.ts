import { ChessBoardState } from './ChessBoardState';

describe('FEN Import / Export', () => {
    it('should handle the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const board = ChessBoardState.fromFEN(fen);
        const arr = board.toArray();
        expect(arr[0][0]).toBe('r');
        expect(arr[1][1]).toBe('p');
        expect(arr[2][2]).toBe('');
        expect(arr[6][6]).toBe('P');
        expect(arr[7][7]).toBe('R');

        expect(board.toFEN()).toBe(fen);

    });

    it('should handle some common situations', () => {
        {
            const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
            const board = ChessBoardState.fromFEN(fen);
            expect(board.toFEN()).toBe(fen);
        }
        {
            const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2';
            const board = ChessBoardState.fromFEN(fen);
            expect(board.toFEN()).toBe(fen);
        }
        {
            const fen = 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2';
            const board = ChessBoardState.fromFEN(fen);
            expect(board.toFEN()).toBe(fen);
        }
    });

});



describe('Base64 Import / Export', () => {
    it('should handle the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const origBoard = ChessBoardState.fromFEN(fen);
        const base64Str = origBoard.toBase64();
        const board = ChessBoardState.fromBase64(base64Str);

        const arr = board.toArray();
        expect(arr[0][0]).toBe('r');
        expect(arr[1][1]).toBe('p');
        expect(arr[2][2]).toBe('');
        expect(arr[6][6]).toBe('P');
        expect(arr[7][7]).toBe('R');

        expect(board.toFEN()).toBe(fen);
    });

    it('should handle a more complex fen', () => {
        const fen = '1r2kr2/pp1p1pp1/2p4p/7P/P1PP4/1P6/5PP1/R3K2R b KQ - 0 1';        
        const origBoard = ChessBoardState.fromFEN(fen);
        const base64Str = origBoard.toBase64();
        const board = ChessBoardState.fromBase64(base64Str);
        expect(board.toFEN()).toBe(fen);
    });

    it('should handle another more complex fen', () => {
        const fen = '1r2kr2/pp1p1p2/2p4p/6pP/P1PP4/1P6/5PP1/R3K2R w KQ g6 0 1';
        const origBoard = ChessBoardState.fromFEN(fen);
        const base64Str = origBoard.toBase64();
        const board = ChessBoardState.fromBase64(base64Str);
        expect(board.toFEN()).toBe(fen);
    });   

});



describe('Moves properly change the board', () => {
    it('should handle white O-O', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/8/RNBQK2R w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppppppp/8/8/8/8/8/RNBQ1RK1 b kq - 1 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('O-O');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white O-O-O', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/R3KBNR w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/2KR1BNR b kq - 1 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('O-O-O');
        expect(board.toFEN()).toBe(fen2);
    });
    
    it('should handle black O-O', () => {
        const fen = 'rnbqk2r/8/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
        const fen2 = 'rnbq1rk1/8/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 1 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('O-O');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle black O-O-O', () => {
        const fen = 'r3kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
        const fen2 = '2kr1bnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQ - 1 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('O-O-O');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle e3 from the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppppppp/8/8/8/4P3/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('e3');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle e4 from the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('e4');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle e6 as black from the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppp1ppp/4p3/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('e6');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle e5 as black from the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppp1ppp/8/4p3/8/8/PPPPPPPP/RNBQKBNR w KQkq e6 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('e5');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle axb7 from the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/P7/8/8/8/1PPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pPpppppp/8/8/8/8/1PPPPPPP/RNBQKBNR b KQkq - 0 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('axb7');
        expect(board.toFEN()).toBe(fen2);
    });


    it('should handle axb6 en passant from the starting position', () => {
        const fen = 'rnbqkbnr/pppppppp/8/P7/8/8/1PPPPPPP/RNBQKBNR b KQkq - 0 1';
        const fen2 = 'rnbqkbnr/p1pppppp/1P6/8/8/8/1PPPPPPP/RNBQKBNR b KQkq - 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('b5');
        board.move('axb6');
        expect(board.toFEN()).toBe(fen2);
    });


    it('should handle axb3 as black from the starting position', () => {
        const fen = 'rnbqkbnr/1ppppppp/8/8/p7/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/1ppppppp/8/8/8/1p6/P1PPPPPP/RNBQKBNR w KQkq - 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('b4');
        board.move('axb3');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white pawn promotion', () => {
        const fen = '7k/P7/8/8/8/8/8/7K w - - 0 1';
        const fen2 = 'Q6k/8/8/8/8/8/8/7K b - - 0 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('a8=Q');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle black pawn promotion', () => {
        const fen = '7k/8/8/8/8/8/p7/7K b - - 0 1';
        const fen2 = '7k/8/8/8/8/8/8/q6K w - - 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('a1=Q');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white pawn promotion and capture', () => {
        const fen = '1n5k/P7/8/8/8/8/8/7K w - - 0 1';
        const fen2 = '1Q5k/8/8/8/8/8/8/7K b - - 0 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('axb8=Q');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle black pawn promotion and capture', () => {
        const fen = '7k/8/8/8/8/8/p7/1N5K b - - 0 1';
        const fen2 = '7k/8/8/8/8/8/8/1q5K w - - 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('axb1=Q');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white king move', () => {
        const fen = '7k/8/8/8/8/8/8/7K w - - 0 1';
        const fen2 = '7k/8/8/8/8/8/8/6K1 b - - 1 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('Kg1');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle black king move', () => {
        const fen = '7k/8/8/8/8/8/8/7K b - - 0 1';
        const fen2 = '6k1/8/8/8/8/8/8/7K w - - 1 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('Kg8');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white king capture', () => {
        const fen = '7k/8/8/8/8/8/8/6nK w - - 0 1';
        const fen2 = '7k/8/8/8/8/8/8/6K1 b - - 0 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('Kxg1');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle black king capture', () => {
        const fen = '6Nk/8/8/8/8/8/8/7K b - - 0 1';
        const fen2 = '6k1/8/8/8/8/8/8/7K w - - 0 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('Kxg8');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white knight move', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const fen2 = 'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq - 1 1';
        const board = ChessBoardState.fromFEN(fen);
        board.move('Nf3');
        expect(board.toFEN()).toBe(fen2);
    });

    it('should handle white knight move', () => {
        const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 1';
        const fen2 = 'rnbqkb1r/pppppppp/5n2/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 1 2';
        const board = ChessBoardState.fromFEN(fen);
        board.move('Nf6');
        expect(board.toFEN()).toBe(fen2);
    });

});