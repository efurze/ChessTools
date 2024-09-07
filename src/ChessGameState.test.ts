import { ChessGameState } from './ChessGameState';

describe('PGN Import', () => {
    it('should handle a basic PGN import', () => {
        const pgn = `[Event "F/S Return Match"]
[Site "Belgrade, Serbia JUG"]
[Date "1992.11.04"]
[Round "29"]
[White "Fischer, Robert J."]
[Black "Spassky, Boris V."]
[Result "1/2-1/2"]

1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 d6 8.c3 O-O 9.h3 Nb8 10.d4 Nbd7 11.c4 c6 12.cxb5 axb5 13.Nc3 Bb7 14.Bg5 b4 15.Nb1 h6 16.Bh4 c5 17.dxe5 Nxe4 18.Bxe7 Qxe7 19.exd6 Qf6 20.Nbd2 Nxd6 21.Nc4 Nxc4 22.Bxc4 Nb6 23.Ne5 Rae8 24.Bxf7+ Rxf7 25.Nxf7 Rxe1+ 26.Qxe1 Kxf7 27.Qe3 Qg5 28.Qxg5 hxg5 29.b3 Ke6 30.a3 Kd6 31.axb4 cxb4 32.Ra5 Nd5 33.f3 Bc8 34.Kf2 Bf5 35.Ra7 g6 36.Ra6+ Kc5 37.Ke1 Nf4 38.g3 Nxh3 39.Kd2 Kb5 40.Rd6 Kc5 41.Ra6 Nf2 42.g4 Bd3 43.Re6 1/2-1/2`;

        const game = ChessGameState.fromPGN(pgn);
        expect(game.getMeta('Event')).toBe('F/S Return Match');
        const boardStates = game.getBoardStates();
        expect(boardStates[boardStates.length - 1].toFEN()).toBe('8/8/4R1p1/2k3p1/1p4P1/1P1b1P2/3K1n2/8 b - - 2 43');
    });

    it('should handle Opera Game pgn import', () => {
        const pgn = `[Event "Opera Game"]
[Site "Paris"]
[Date "1858.??.??"]
[Round "?"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]
[ECO "C41"]

1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0`;

        const game = ChessGameState.fromPGN(pgn);
        expect(game.getMeta('Event')).toBe('Opera Game');
        const boardStates = game.getBoardStates();
        expect(boardStates[boardStates.length - 1].toFEN()).toBe('1n1Rkb1r/p4ppp/4q3/4p1B1/4P3/8/PPP2PPP/2K5 b k - 1 17');
    });


    it('should handle long world champ game pgn import', () => {
        const pgn = `[Event "FIDE World Chess Championship 2021"]
[Site "Chess.com"]
[Date "2021.12.03"]
[Round "06"]
[White "Carlsen, Magnus"]
[Black "Nepomniachtchi, Ian"]
[Result "1-0"]
[WhiteElo "2855"]
[BlackElo "2782"]
[TimeControl "5400+30"]

1.d4 Nf6 2. Nf3 d5 3. g3 e6 4. Bg2 Be7 5. O-O O-O 6. b3 c5 7. dxc5 Bxc5 8. c4 dxc4 9. Qc2 Qe7 10. Nbd2 Nc6 11. Nxc4 b5 12. Nce5 Nb4 13. Qb2 Bb7 14. a3 Nc6 15. Nd3 Bb6 16. Bg5 Rfd8 17. Bxf6 gxf6 18. Rac1 Nd4 19. Nxd4 Bxd4 20. Qa2 Bxg2 21. Kxg2 Qb7+ 22. Kg1 Qe4 23. Qc2 a5 24. Rfd1 Kg7 25. Rd2 Rac8 26. Qxc8 Rxc8 27. Rxc8 Qd5 28. b4 a4 29. e3 Be5 30. h4 h5 31. Kh2 Bb2 32. Rc5 Qd6 33. Rd1 Bxa3 34. Rxb5 Qd7 35. Rc5 e5 36. Rc2 Qd5 37. Rdd2 Qb3 38. Ra2 e4 39. Nc5 Qxb4 40. Nxe4 Qb3 41. Rac2 Bf8 42. Nc5 Qb5 43. Nd3 a3 44. Nf4 Qa5 45. Ra2 Bb4 46. Rd3 Kh6 47. Rd1 Qa4 48. Rda1 Bd6 49. Kg1 Qb3 50. Ne2 Qd3 51. Nd4 Kh7 52. Kh2 Qe4 53. Rxa3 Qxh4+ 54. Kg1 Qe4 55. Ra4 Be5 56. Ne2 Qc2 57. R1a2 Qb3 58. Kg2 Qd5+ 59. f3 Qd1 60. f4 Bc7 61. Kf2 Bb6 62. Ra1 Qb3 63. Re4 Kg7 64. Re8 f5 65. Raa8 Qb4 66. Rac8 Ba5 67. Rc1 Bb6 68. Re5 Qb3 69. Re8 Qd5 70. Rcc8 Qh1 71. Rc1 Qd5 72. Rb1 Ba7 73. Re7 Bc5 74. Re5 Qd3 75. Rb7 Qc2 76. Rb5 Ba7 77. Ra5 Bb6 78. Rab5 Ba7 79. Rxf5 Qd3 80. Rxf7+ Kxf7 81. Rb7+ Kg6 82. Rxa7 Qd5 83. Ra6+ Kh7 84. Ra1 Kg6 85. Nd4 Qb7 86. Ra2 Qh1 87. Ra6+ Kf7 88. Nf3 Qb1 89. Rd6 Kg7 90. Rd5 Qa2+ 91. Rd2 Qb1 92. Re2 Qb6 93. Rc2 Qb1 94. Nd4 Qh1 95. Rc7+ Kf6 96. Rc6+ Kf7 97. Nf3 Qb1 98. Ng5+ Kg7 99. Ne6+ Kf7 100. Nd4 Qh1 101. Rc7+ Kf6 102. Nf3 Qb1 103. Rd7 Qb2+ 104. Rd2 Qb1 105. Ng1 Qb4 106. Rd1 Qb3 107. Rd6+ Kg7 108. Rd4 Qb2+ 109. Ne2 Qb1 110. e4 Qh1 111. Rd7+ Kg8 112. Rd4 Qh2+ 113. Ke3 h4 114. gxh4 Qh3+ 115. Kd2 Qxh4 116. Rd3 Kf8 117. Rf3 Qd8+ 118. Ke3 Qa5 119. Kf2 Qa7+ 120. Re3 Qd7 121. Ng3 Qd2+ 122. Kf3 Qd1+ 123. Re2 Qb3+ 124. Kg2 Qb7 125. Rd2 Qb3 126. Rd5 Ke7 127. Re5+ Kf7 128. Rf5+ Ke8 129. e5 Qa2+ 130. Kh3 Qe6 131. Kh4 Qh6+ 132. Nh5 Qh7 133. e6 Qg6 134. Rf7 Kd8 135. f5 Qg1 136. Ng7 1-0`;

        const game = ChessGameState.fromPGN(pgn);
        expect(game.getMeta('Event')).toBe('FIDE World Chess Championship 2021');
        const boardStates = game.getBoardStates();
        expect(boardStates[boardStates.length - 1].toFEN()).toBe('3k4/5RN1/4P3/5P2/7K/8/8/6q1 b - - 2 136');
    });

    it('should handle a test game with promotions', () => {
        const pgn = `[Event "Test Game"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. d4 Nxd4 5. Nxd4 exd4 6. Qxd4 Nxe4 7. Qxe4+ Qe7 8. Qxe7+ Bxe7 9. O-O d5 10. Bxd5 f6 11. c4 c6 12. Be4 Be6 13. Bf4 O-O-O 14. Nc3 Bxc4 15. Rfd1 Rxd1+ 16. Rxd1 Bd3 17. Bxd3 Bd6 18. Bxd6 Rf8 19. Bxf8 Kd7 20. Bxg7 Kd6 21. Bxh7+ Kc7 22. Bxf6 Kb8 23. g4 Ka8 24. g5 Kb8 25. g6 Ka8 26. g7 Kb8 27. g8=R+ Kc7 28. Be5+ Kb6 29. f4 Ka6 30. f5 Kb6 31. f6 Ka6 32. f7 Kb6 33. f8=R Ka6 34. h4 Kb6 35. Bg6 Ka6 36. h5 Kb6 37. h6 Ka6 38. h7 Kb6 39. h8=R Ka6 40. Re8 Kb6 41. Rgf8 Ka6 42. Rf6 Kb6 43. Rfe6 Ka6 44. Red8 Kb6 45. Rhe8 Ka6 46. R8d7 Kb6 47. R8e7 Kc5 48. b4+ Kc4 49. b5 Kb4 50. bxc6 Kc4 51. cxb7 Kb4 52. b8=Q+ Kc4 53. a4 Kc5 54. a5 Kc4 55. a6 Kc5 56. Qxa7+ Kc4 57. Qc7+ Kb4 58. a7 Kb3 59. a8=Q Kb2 60. Bh2 Kb3 61. Qg3 Kb2 62. Qab8+ Ka3 63. Qbe5 Kb3 64. Qgf4 Ka3 65. Qfd4 Kb3 66. Rb1+ Ka3 67. Rb3+ Kxb3 68. Qb4+ Kxb4 69. Rb7+ Ka3 70. Qa5#`;

        const game = ChessGameState.fromPGN(pgn);
        expect(game.getMeta('Event')).toBe('Test Game');
        const boardStates = game.getBoardStates();
        expect(boardStates[boardStates.length - 1].toFEN()).toBe('8/1R2R3/4R1B1/Q7/8/k1N5/7B/6K1 b - - 3 70');
    });

    it('should handle a test game with en passant', () => {
        const pgn = `[Event "Test Game"]

1. e4 Nc6 2. d4 Nb8 3. d5 Nc6 4. e5 Nb8 5. c4 Nc6 6. c5 Nb8 7. b4 f5 8. exf6 e5 9. dxe6 d5 10. cxd6 cxd6 11. Qxd6 Qxd6 12. Bb5+ Kd8 13. Bg5 a6 14. f7+ Qe7 15. Bxe7+ Kxe7 16. fxg8=Q Kd8 17. Qf7 g6 18. Qe8+ Kc7 19. Na3 Kb6 20. Rc1 Ka7 21. Qxc8 Nc6 22. Bxc6 bxc6 23. Qc7#`

        const game = ChessGameState.fromPGN(pgn);
        expect(game.getMeta('Event')).toBe('Test Game');
        const boardStates = game.getBoardStates();
        expect(boardStates[boardStates.length - 1].toFEN()).toBe('r4b1r/k1Q4p/p1p1P1p1/8/1P6/N7/P4PPP/2R1K1NR b K - 1 23');
    });    

    it('should handle a test game with double disambiguation', () => {
        const pgn = `[Event "Test Game"]

1. e4 e5 2. Nf3 Nc6 3. d4 Nf6 4. dxe5 Be7 5. exf6 Nb4 6. fxe7 Nc6 7. exd8=B Nb4 8. Bxc7 Nd5 9. exd5 d6 10. Bxd6 b6 11. Bc7 a6 12. d6 Bb7 13. d7+ Kf8 14. d8=B Ke8 15. B1f4 f6 16. Bcd6 Bc8 17. Bb4 b5 18. Bdc7 a5 19. Bb8 a4 20. B8d6 a3 21. Bb8 h6 22. c4 Ra7 23. c5 Ra8 24. c6 Ra7 25. g4 Rd7 26. c7 Rd8 27. cxd8=B Ba6 28. Bde7 Bb7 29. Bf8 Ba6 30. Bf8d6 Kf7 31. Qe2 Kg8 32. Qe7 g5 33. Bde5 h5 34. Bxf6 h4 35. Qg7#`

        const game = ChessGameState.fromPGN(pgn);
        expect(game.getMeta('Event')).toBe('Test Game');
        const boardStates = game.getBoardStates();
        expect(boardStates[boardStates.length - 1].toFEN()).toBe('1B4kr/6Q1/b4B2/1p4p1/1B3BPp/p4N2/PP3P1P/RN2KB1R b KQ - 1 35');
    });
});