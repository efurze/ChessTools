export class ChessBoardState {

    static readonly VALID_PIECES = new Set('rnbkqpRNBKQP'.split(''));
    static readonly COLS_TO_LETTERS = 'abcdefgh'.split('');
    static readonly LETTERS_TO_COLS = ChessBoardState.COLS_TO_LETTERS.reduce<{[key: string]: number}>((acc, elem, idx) => { acc[elem] = idx; return acc; }, {});
    static readonly PIECE_MOVES = (() => { 
        const ret: {[key: string]: number[][][]} = {
            K: [[[-1, 1], [0, 1], [1, 1], [-1, 0], [1, 0], [-1, -1], [0, -1], [1, -1]]],
            N: [[[1, 2], [-1, 2], [2, 1], [-2, 1], [-1, -2], [1, -2], [-2, -1], [2, -1]]],
            B: [[[ -1, -1 ], [ -2, -2 ], [ -3, -3 ], [ -4, -4 ], [ -5, -5 ], [ -6, -6 ], [ -7, -7 ]],
                [[ 1, -1 ], [ 2, -2 ], [ 3, -3 ], [ 4, -4 ], [ 5, -5 ], [ 6, -6 ], [ 7, -7 ]],
                [[ -1, 1 ], [ -2, 2 ], [ -3, 3 ], [ -4, 4 ], [ -5, 5 ], [ -6, 6 ], [ -7, 7 ]],
                [[ 1, 1 ], [ 2, 2 ], [ 3, 3 ], [ 4, 4 ], [ 5, 5 ], [ 6, 6 ], [ 7, 7 ]]],
            R: [[[ -1, 0 ], [ -2, 0 ], [ -3, 0 ], [ -4, 0 ], [ -5, 0 ], [ -6, 0 ], [ -7, 0 ]],
                [[ 1, 0 ], [ 2, 0 ], [ 3, 0 ], [ 4, 0 ], [ 5, 0 ], [ 6, 0 ], [ 7, 0 ]],
                [[ 0, -1 ], [ 0, -2 ], [ 0, -3 ], [ 0, -4 ], [ 0, -5 ], [ 0, -6 ], [ 0, -7 ]],
                [[ 0, 1 ], [ 0, 2 ], [ 0, 3 ], [ 0, 4 ], [ 0, 5 ], [ 0, 6 ], [ 0, 7 ]]]
        };
        ret.Q = [...ret.R, ...ret.B];
        return ret;
    })();
    static readonly PIECE_MOVES_FLAT = (() => {
        const ret: {[key: string]: number[][]} = {};
        Object.keys(ChessBoardState.PIECE_MOVES).forEach((piece) => {
            ret[piece] = ChessBoardState.PIECE_MOVES[piece].reduce((acc, elem) => [...acc, ...elem], []);
        });
        return ret;
    })();


    private board: string[][];
    private activeColor: string;
    private canCastle: Set<string>;
    private enPassantTargetSquare: string;
    private halfMoveClock: number;
    private fullMoveNumber: number;

    private constructor(otherBoard: string[][], activeColor: string, canCastle: Set<string>, 
                        enPassantTargetSquare: string, halfMoveClock: number, fullMoveNumber: number) {
        this.board = otherBoard;
        this.activeColor = activeColor;
        this.canCastle = canCastle;
        this.enPassantTargetSquare = enPassantTargetSquare;
        this.halfMoveClock = halfMoveClock;
        this.fullMoveNumber = fullMoveNumber;
    }


    public copy(): ChessBoardState {
        return new ChessBoardState(this.toArray(), this.activeColor, new Set(this.canCastle),
                              this.enPassantTargetSquare, this.halfMoveClock, this.fullMoveNumber);
    }

    // Returns a copy of the internal representation array.
    public toArray(): string[][] {
        return JSON.parse(JSON.stringify(this.board));
    }

    public toPrintable(): string {
        let ret: string = `${this.fullMoveNumber} ${this.activeColor}\n`;
        for (let i = 0; i < 8; i++) {
            ret += `${8 - i} ` + this.board[i].map((elem) => elem === '' ? '.' : elem).join(' ') + '\n';
        }
        ret += '  a b c d e f g h';
        return ret;
    }

    public static fromFEN(fen: string): ChessBoardState {
        const sections = fen.split(' ');
        if (sections.length !== 6) {
            throw 'Invalid FEN';
        }

        const [fenBoard, activeColor, castlingAvailability, enPassantTargetSquare, halfMoveClock, fullMoveNumber] = sections;

        // Process fenBoard
        const splitBoard = fenBoard.split('/');
        if (splitBoard.length !== 8) {
            throw 'Invalid FEN board';
        }
        const arrayBoard = splitBoard.map((row) => {
            const cols = row.split('');
            const ret = cols.reduce<string[]>((acc, col) => {
                if (ChessBoardState.VALID_PIECES.has(col)) {
                    acc.push(col);
                } else {
                    try {
                        const num = parseInt(col);
                        if (num < 1 || num > 8) {
                            throw 'Bad Num In FEN';
                        }
                        acc.push(...Array(num).fill(''));
                    } catch(err) {
                        throw `Invalid FEN line: ${row}`;
                    }
                }
                return acc;
            }, []);
            if (ret.length !== 8) {
                throw `Wrong length FEN line: ${row} - ${ret.length}`;
            }
            return ret;
        });

        // Process activeColor
        if (activeColor !== 'w' && activeColor !== 'b') {
            throw 'Invalid FEN active color';
        }

        // Process castlingAvailability
        const canCastle = new Set<string>();
        if (castlingAvailability !== '-') {
            if (!/^K?Q?k?q?$/.test(castlingAvailability)) {
                throw 'Invalid FEN castling availability';
            }
            castlingAvailability.split('').forEach((elem) => {
                canCastle.add(elem);
            })
        }

        // Process enPassantTargetSquare
        if (enPassantTargetSquare !== '-' && !/^[a-h][36]$/.test(enPassantTargetSquare)) {
            throw 'Invalid FEN en passant target square';
        }

        // Process halfMoveClock
        let numHalfMoveClock = 0;
        try {
            numHalfMoveClock = parseInt(halfMoveClock);
            if (numHalfMoveClock < 0) {
                throw 'Invalid FEN halfmove clock';
            }
        } catch(err) {
            throw 'Invalid FEN halfmove clock';
        }


        // Process fullMoveNumber
        let numFullMoveNumber = 0;
        try {
            numFullMoveNumber = parseInt(fullMoveNumber);
            if (numFullMoveNumber < 1) {
                throw 'Invalid FEN fullmove number';
            }
        } catch(err) {
            throw 'Invalid FEN fullmove number';
        }

        return new ChessBoardState(arrayBoard, activeColor, canCastle, enPassantTargetSquare === '-' ? '' : enPassantTargetSquare, 
                              numHalfMoveClock, numFullMoveNumber);
    }


    public toFEN(): string {
        const fenBoard = this.board.map((row) => {
            let numSpaces = 0;
            return row.reduce<string>((acc, col, idx) => {
                if (col === '') {
                    numSpaces++;
                    if (idx === 7) {
                        acc += numSpaces;
                    }
                } else {
                    if (numSpaces) {
                        acc += numSpaces;
                        numSpaces = 0;
                    }
                    acc += col;
                }
                return acc;
            }, '');
        }).join('/');

        const strCanCastle = this.canCastle.size == 0 ? '-' : [...this.canCastle].sort().join('');

        return `${fenBoard} ${this.activeColor} ${strCanCastle} ${this.enPassantTargetSquare === '' ? '-' : this.enPassantTargetSquare} ${this.halfMoveClock} ${this.fullMoveNumber}`;
    }


    public move(algMove: string): ChessBoardState {
        let shouldClearEnPassant = true;
        algMove = algMove.replace(/[+#?!]+$/, '');

        try {
            let match;
            if (algMove === 'O-O' || algMove === '0-0') {
                // Kingside castle
                if (!this.canCastle.has(this.activeColor === 'w' ? 'K' : 'k')) {
                    throw 'canCastle false';
                }

                if (this.activeColor === 'w') {
                    if (this.board[7][4] !== 'K' || this.board[7][5] !== '' || this.board[7][6] !== '' || this.board[7][7] !== 'R') {
                        throw 'pieces not in legal places';
                    }
                    this.board[7][4] = '';
                    this.board[7][5] = 'R';
                    this.board[7][6] = 'K';
                    this.board[7][7] = '';

                    this.canCastle.delete('K');
                    this.canCastle.delete('Q');
                } else {
                    if (this.board[0][4] !== 'k' || this.board[0][5] !== '' || this.board[0][6] !== '' || this.board[0][7] !== 'r') {
                        throw 'pieces not in legal places';
                    }

                    this.board[0][4] = '';
                    this.board[0][5] = 'r';
                    this.board[0][6] = 'k';
                    this.board[0][7] = '';

                    this.canCastle.delete('k');
                    this.canCastle.delete('q');
                }
                this.halfMoveClock++;

            } else if (algMove === 'O-O-O' || algMove === '0-0-0') {
                // Queenside castle
                if (!this.canCastle.has(this.activeColor === 'w' ? 'Q' : 'q')) {
                    throw 'canCastle false';
                }

                if (this.activeColor === 'w') {
                    if (this.board[7][4] !== 'K' || this.board[7][3] !== '' || this.board[7][2] !== '' || this.board[7][1] !== '' ||
                        this.board[7][0] !== 'R') {
                        throw 'pieces not in legal places';
                    }
                    this.board[7][0] = '';
                    this.board[7][1] = '';
                    this.board[7][2] = 'K';
                    this.board[7][3] = 'R';
                    this.board[7][4] = '';

                    this.canCastle.delete('K');
                    this.canCastle.delete('Q');

                } else {
                    if (this.board[0][4] !== 'k' || this.board[0][3] !== '' || this.board[0][2] !== '' || this.board[0][1] !== '' || 
                        this.board[0][0] !== 'r') {
                        throw 'pieces not in legal places';
                    }

                    this.board[0][0] = '';
                    this.board[0][1] = '';
                    this.board[0][2] = 'k';
                    this.board[0][3] = 'r';
                    this.board[0][4] = '';

                    this.canCastle.delete('k');
                    this.canCastle.delete('q');
                    
                }
                this.halfMoveClock++;

            } else if ((match = algMove.match(/^([a-h])([1-8])(=[RNBQ])?$/))) {
                // Pawn move
                const [j, i] = [ChessBoardState.LETTERS_TO_COLS[match[1]], 8 - parseInt(match[2])];
                const promoPiece = match[3] ? match[3].substring(1) : '';

                if (this.activeColor === 'w') {
                    if (i >= 6) {
                        throw 'white pawn moving to row 2 or 1';
                    }
                    if (i === 0 && promoPiece === '') {
                        throw 'promotion info missing';
                    }

                    if (i === 4 && this.board[5][j] === '') {  // 2-space move
                        if (this.board[6][j] !== 'P' || this.board[4][j] !== '') {
                            throw 'pawn or space not there';
                        }
                        this.board[6][j] = '';
                        this.board[4][j] = 'P';

                        this.enPassantTargetSquare = `${ChessBoardState.COLS_TO_LETTERS[j]}3`;
                        shouldClearEnPassant = false;
                    } else {
                        if (this.board[i + 1][j] !== 'P' || this.board[i][j] !== '') {
                            throw 'pawn or space not there';
                        }
                        this.board[i][j] = (i === 0 ? promoPiece : 'P');
                        this.board[i + 1][j] = '';
                    }
                } else {
                    if (i <= 1) {
                        throw 'black pawn moving to row 7 or 8';
                    }
                    if (i === 7 && promoPiece === '') {
                        throw 'promotion info missing';
                    }

                    if (i === 3 && this.board[2][j] === '') {  // 2-space move
                        if (this.board[1][j] !== 'p' || this.board[3][j] !== '') {
                            throw 'pawn or space not there';
                        }
                        this.board[1][j] = '';
                        this.board[3][j] = 'p';

                        this.enPassantTargetSquare = `${ChessBoardState.COLS_TO_LETTERS[j]}6`;
                        shouldClearEnPassant = false;
                    } else {
                        if (this.board[i - 1][j] !== 'p' || this.board[i][j] !== '') {
                            throw 'pawn or space not there';
                        }
                        this.board[i][j] = (i === 7 ? promoPiece.toLowerCase() : 'p');
                        this.board[i - 1][j] = '';
                    }
                }

                this.halfMoveClock = 0;
            } else if ((match = algMove.match(/^([a-h])x([a-h])([1-8])(=[RNBQ])?$/))) {
                // Pawn capture
                const [j1, j2, i] = [ChessBoardState.LETTERS_TO_COLS[match[1]], ChessBoardState.LETTERS_TO_COLS[match[2]], 8 - parseInt(match[3])];
                const promoPiece = match[4] ? match[4].substring(1) : '';

                if (Math.abs(j2 - j1) !== 1) {
                    throw 'illegal pawn capture';
                }

                if (this.activeColor === 'w') {
                    if (i >= 6) {
                        throw 'white pawn moving to row 2';
                    }
                    if (i === 0 && promoPiece === '') {
                        throw 'promotion info missing';
                    }

                    if (this.enPassantTargetSquare === `${ChessBoardState.COLS_TO_LETTERS[j2]}${8 - i}`) {
                        this.board[i + 1][j1] = '';
                        this.board[i + 1][j2] = '';
                    } else {
                        if (this.board[i + 1][j1] !== 'P' || !/^[rnbqp]$/.test(this.board[i][j2])) {
                            throw 'pawn or piece to capture not there';
                        }
                        this.board[i + 1][j1] = '';    
                    }

                    this.board[i][j2] = (i === 0 ? promoPiece : 'P');
                } else {
                    if (i <= 1) {
                        throw 'black pawn moving to row 7';
                    }
                    if (i === 7 && promoPiece === '') {
                        throw 'promotion info missing';
                    }

                    if (this.enPassantTargetSquare === `${ChessBoardState.COLS_TO_LETTERS[j2]}${8 - i}`) {
                        this.board[i - 1][j1] = '';
                        this.board[i - 1][j2] = '';
                    } else {

                        if (this.board[i - 1][j1] !== 'p' || !/^[RNBQP]$/.test(this.board[i][j2])) {
                            throw 'pawn or piece to capture not there';
                        }
                        this.board[i - 1][j1] = '';
                    }
                    this.board[i][j2] = (i === 7 ? promoPiece.toLowerCase() : 'p');
                }

                this.halfMoveClock = 0;

            } else if ((match = algMove.match(/^([RNBQK])([a-h]?)([1-8]?)(x)?([a-h])([1-8])$/))) {
                // Piece move or capture
                const [_, piece, fromCol, fromRow, capture, toCol, toRow] = match;
                const [j2, i2] = [ChessBoardState.LETTERS_TO_COLS[toCol], 8 - parseInt(toRow)];

                const [j1, i1] = this.findPieceFromPos(piece, j2, i2, 
                                                       fromCol ? ChessBoardState.LETTERS_TO_COLS[fromCol] : null, 
                                                       fromRow ? 8 - parseInt(fromRow) : null);
                if (capture && this.board[i1][j1] === '') {
                    throw 'king capture target square empty';
                }
                this.board[i1][j1] = '';
                this.board[i2][j2] = this.activeColor === 'w' ? piece : piece.toLowerCase();

                if (capture) {
                    this.halfMoveClock = 0;
                } else {
                    this.halfMoveClock++;
                }
                if (piece === 'K') {
                    if (this.activeColor === 'b') {
                        this.canCastle.delete('q');
                        this.canCastle.delete('k');
                    } else if (this.activeColor === 'w') {
                        this.canCastle.delete('Q');
                        this.canCastle.delete('K');
                    }
                }

                if (piece === 'R') {
                    if (this.activeColor === 'b' && i1 === 0) {
                        if (j1 === 0) {
                            this.canCastle.delete('q');
                        } else if (j1 === 7) {
                            this.canCastle.delete('k');
                        }
                    } else if (this.activeColor === 'w' && i1 === 7) {
                        if (j1 === 0) {
                            this.canCastle.delete('Q');
                        } else if (j1 === 7) {
                            this.canCastle.delete('K');
                        }
                    }
                }

            } else {
                throw 'unknown move';
            }
        } catch(err) {
            throw `Illegal move ${algMove} - ${err}`;
        }

        if (this.activeColor === 'b') {
            this.fullMoveNumber++;
        }
        this.activeColor = this.activeColor === 'w' ? 'b' : 'w';
        if (shouldClearEnPassant) {
            this.enPassantTargetSquare = '';
        }

        return this;
    }


    public diff(next: ChessBoardState): string {
        // Look for castling
        if (this.board[0][0] === 'r' && this.board[0][4] === 'k' && next.board[0][2] === 'k' && next.board[0][3] === 'r') {
            return 'O-O-O';
        } else if (this.board[0][7] === 'r' && this.board[0][4] === 'k' && next.board[0][6] === 'k' && next.board[0][5] === 'r') {
            return 'O-O';
        } else if (this.board[7][0] === 'R' && this.board[7][4] === 'K' && next.board[7][2] === 'K' && next.board[7][3] === 'R') {
            return 'O-O-O';
        } else if (this.board[7][7] === 'R' && this.board[7][4] === 'K' && next.board[7][6] === 'K' && next.board[7][5] === 'R') {
            return 'O-O';
        } 

        // Find the piece that moved and where it moved.
        let piece = null, capture = false, i = null, j = null, i2 = null, j2 = null;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] !== '' && next.board[row][col] === '') {
                    if (i !== null || j !== null) {
                        if (piece === 'P') {
                            // en passant
                            if (next.activeColor === 'w') {
                                [i, j] = [row, col];
                            }
                            capture = true;
                        } else {
                            throw 'More than one piece moved';
                        }
                    } else {
                        piece = this.board[row][col].toUpperCase();
                        [i, j] = [row, col];
                    }
                } else if (this.board[row][col] !== next.board[row][col]) {
                    if (i2 !== null || j2 !== null) {
                        throw 'More than one square moved to';
                    }
                    if (this.board[row][col] !== '') {
                        capture = true;
                    }

                    [i2, j2] = [row, col];
                }
            }
        }

        if (i === null || j === null || i2 === null || j2 === null) {
            throw 'Pieces not found';
        }

        let promotion = '';
        if (piece === 'P' && (i2 === 0 || i2 === 7)) {
            promotion = `=${next.board[i2][j2].toUpperCase()}`;
        }

        let check = next.isKingInCheck();
        return `${(piece !== 'P') ? piece : (capture ? ChessBoardState.COLS_TO_LETTERS[j] : '')}${capture ? 'x' : ''}${ChessBoardState.COLS_TO_LETTERS[j2]}${8 - i2}${check}${promotion}`;
    }


    // Generates a compressed base-64 of the board.
    
    public toBase64(): string {
        let pieces: number[] = [];
        let firstNibble = true;
        const bitVector: number[] = this.board.map((row, i) => {
            let ret = 0;
            for (let j = 0, bit = 1; j < 8; j++, bit <<= 1) {
                const col = row[j];
                if (col !== '') {
                    ret |= bit;
                    let pieceCode: number;
                    switch(col) {
                        case 'P':
                            if (i === 4 && this.enPassantTargetSquare === `${ChessBoardState.COLS_TO_LETTERS[j]}3`) {
                                pieceCode = 12;
                            } else {
                                pieceCode = 0;
                            } 
                            break;
                        case 'p':
                            if (i === 3 && this.enPassantTargetSquare === `${ChessBoardState.COLS_TO_LETTERS[j]}6`) {
                                pieceCode = 12;
                            } else {
                                pieceCode = 1;
                            } 
                            break;
                        case 'N':   pieceCode = 2; break;
                        case 'n':   pieceCode = 3; break;
                        case 'B':   pieceCode = 4; break;
                        case 'b':   pieceCode = 5; break;
                        case 'R':
                            if (i === 7 && (j === 0 && this.canCastle.has('Q')) || j === 7 && this.canCastle.has('K'))  {
                                pieceCode = 13;
                            } else {
                                pieceCode = 6;
                            }
                            break;
                        case 'r':   
                            if (i === 0 && (j === 0 && this.canCastle.has('q')) || j === 7 && this.canCastle.has('k'))  {
                                pieceCode = 14;
                            } else {
                                pieceCode = 7;
                            }
                            break;
                        case 'Q':   pieceCode = 8; break;
                        case 'q':   pieceCode = 9; break;
                        case 'K':   pieceCode = 10; break;
                        case 'k':   pieceCode = (this.activeColor === 'b') ? 15 : 11; break;
                        default:    throw `toBase64: Invalid piece found in row: ${row}`
                    }
                    if (firstNibble) {
                        pieces.push(pieceCode);
                    } else {
                        pieces[pieces.length - 1] |= pieceCode << 4;
                    }
                    firstNibble = !firstNibble;
                }
            }
            return ret;
        });

        return Buffer.from([...bitVector, ...pieces]).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    }


    public static fromBase64(base64Str: string): ChessBoardState {
        const buffer = Buffer.from(base64Str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (base64Str.length % 4)) % 4), 'base64');
        const board: string[][] = [];
        const canCastle = new Set<string>();
        let activeColor = 'w';
        let pieceNum = 0;
        let enPassantTargetSquare = '';
        for (let i = 0; i < 8; i++) {
            board.push(Array(8).fill(''));
            for (let j = 0; j < 8; j++) {
                if (buffer[i] & (1 << j)) {
                    let pieceCode = buffer[8 + Math.floor(pieceNum / 2)];
                    if (pieceNum & 1) {
                        pieceCode >>= 4;
                    } else {
                        pieceCode &= 15;
                    }
                    pieceNum++;
                    let piece = '';
                    switch(pieceCode) {
                        case 0:     piece = 'P'; break;
                        case 1:     piece = 'p'; break;
                        case 2:     piece = 'N'; break;
                        case 3:     piece = 'n'; break;
                        case 4:     piece = 'B'; break;
                        case 5:     piece = 'b'; break;
                        case 6:     piece = 'R'; break;
                        case 7:     piece = 'r'; break;
                        case 8:     piece = 'Q'; break;
                        case 9:     piece = 'q'; break;
                        case 10:    piece = 'K'; break;
                        case 11:    piece = 'k'; break;
                        case 12:    
                            if (i === 3) {
                                enPassantTargetSquare = `${ChessBoardState.COLS_TO_LETTERS[j]}6`;
                                piece = 'p';
                            } else { // i === 5
                                enPassantTargetSquare = `${ChessBoardState.COLS_TO_LETTERS[j]}3`;
                                piece = 'P';
                            }
                            break;
                        case 13:    piece = 'R'; canCastle.add(j === 0 ? 'Q' : 'K'); break;
                        case 14:    piece = 'r'; canCastle.add(j === 0 ? 'q' : 'k'); break;
                        case 15:    piece = 'k'; activeColor = 'b'; break;
                    }
                    board[i][j] = piece;
                    
                }         
            }
        }

        return new ChessBoardState(board, activeColor, canCastle, enPassantTargetSquare, 0, 1);
    }

    private moveIsBlocked(piece: string, sourceCol: number, sourceRow: number, destCol: number, destRow: number): boolean {
        if (piece === 'N' || piece === 'K') {
            return false;
        }

        // Check if there's stuff in the way
        const colStep = (destCol === sourceCol ? 0 : (destCol > sourceCol ? 1 : -1));    
        const rowStep = (destRow === sourceRow ? 0 : (destRow > sourceRow ? 1 : -1));

        for (let i = sourceRow + rowStep, j = sourceCol + colStep; !(i === destRow && j === destCol); i += rowStep, j += colStep) {
            if (this.board[i][j] !== '') {
                return true;
            }
        }
        return false;
    }


    private moveCausesCheck(piece: string, sourceCol: number, sourceRow: number, destCol: number, destRow: number): boolean {
        const prevDest = this.board[destRow][destCol];
        this.board[destRow][destCol] = piece;
        const prevSource = this.board[sourceRow][sourceCol];
        this.board[sourceRow][sourceCol] = '';

        const check = this.isKingInCheck();

        this.board[destRow][destCol] = prevDest;
        this.board[sourceRow][sourceCol] = prevSource;

        return check !== '';
    }


    private findPieceFromPos(piece: string, col: number, row: number, fromCol: number | null, fromRow: number | null): number[] {
        let ret: number[] | null = null;
        for (const move of ChessBoardState.PIECE_MOVES_FLAT[piece]) {
            const [i, j] = [row + move[0], col + move[1]];
            if (i < 0 || i > 7 || j < 0 || j > 7) {
                continue;
            }
            if ((fromCol !== null && j !== fromCol) || (fromRow !== null && i !== fromRow)) {
                continue;
            }

            if (this.board[i][j] === (this.activeColor === 'w' ? piece : piece.toLowerCase()) && !this.moveIsBlocked(piece, j, i, col, row)) {
                if (ret) {
                    // Duplication. So, select the one that doesn't cause check.
                    if (!this.moveCausesCheck(piece, j, i, col, row)) {
                        ret = [j, i];
                    }
                } else {
                    ret = [j, i];
                }
            }
        }
        if (!ret) {
            throw `${piece} not found`;
        }
        return ret;
    }

    private findPieces(piece: string): number[][] {
        const arr = [];
        let i, j;
        for (i = 0; i < 8; i++) {
            for (j = 0; j < 8; j++) {
                if (this.board[i][j] === piece) {
                    arr.push([i, j]);
                }
            }
        }
        return arr;
    }


    private isCheckmate(col: number, row: number): string {
        // Is it checkmate?
        for (let move of ChessBoardState.PIECE_MOVES['K'][0]) {
            const [i, j] = [row + move[0], col + move[1]];
            if (i < 0 || j < 0 || i > 7 || j > 7) {
                continue;
            }
            const regex = (this.activeColor === 'w') ? /^[PRNBQK]$/ : /^[prnbqk]$/;
            if (!regex.test(this.board[i][j]) && this.isCheck(j, i) === '') {
                return '+';
            }
        }
        return '#';
    }

    private isCheck(col: number, row: number): string {
        const [i, j] = [row, col];

        // Pawn checks
        if (this.activeColor === 'w' && (this.board[i - 1][j + 1] === 'p' || this.board[i - 1][j - 1] === 'p')) {
            return '+';
        } else if (this.activeColor === 'b' && (this.board[i + 1][j + 1] === 'P' || this.board[i + 1][j - 1] === 'P')) {
            return '+';
        }

        // Knight checks
        for (let move of ChessBoardState.PIECE_MOVES['N'][0]) {
            let [i2, j2] = [i + move[0], j + move[1]];
            if (i2 >= 0 && i2 <= 7 && j2 >= 0 && j2 <= 7) {
                if (this.board[i2][j2] === (this.activeColor === 'w' ? 'n' : 'N')) {
                    return '+';
                }
            }
        }

        // Rook checks
        for (let moveGroup of ChessBoardState.PIECE_MOVES['R']) {
            for (let move of moveGroup) {
                let [i2, j2] = [i + move[0], j + move[1]];
                if (i2 < 0 || i2 > 7 || j2 < 0 || j2 > 7) {
                    break;
                }
                if ((this.board[i2][j2] === (this.activeColor === 'w' ? 'r' : 'R')) ||
                    (this.board[i2][j2] === (this.activeColor === 'w' ? 'q' : 'Q'))) {
                    return '+';
                }
                // Something in the way...
                if (this.board[i2][j2] !== '') {
                    break;
                }
            }
        }

        // Bishop checks
        for (let moveGroup of ChessBoardState.PIECE_MOVES['B']) {
            for (let move of moveGroup) {
                let [i2, j2] = [i + move[0], j + move[1]];
                if (i2 < 0 || i2 > 7 || j2 < 0 || j2 > 7) {
                    break;
                }
                if (i2 >= 0 && i2 <= 7 && j2 >= 0 && j2 <= 7) {
                    if ((this.board[i2][j2] === (this.activeColor === 'w' ? 'b' : 'B')) ||
                        (this.board[i2][j2] === (this.activeColor === 'w' ? 'q' : 'Q'))) {
                        return '+';
                    }
                }
                // Something in the way...
                if (this.board[i2][j2] !== '') {
                    break;
                }
            }
        }


        return '';

    }


    public isKingInCheck(): string {
        const [i, j] = this.findPieces((this.activeColor === 'w') ? 'K' : 'k')[0];
        let check = this.isCheck(j, i);
        if (check !== '') {
            check = this.isCheckmate(j, i);
        }
        return check;
    }

}