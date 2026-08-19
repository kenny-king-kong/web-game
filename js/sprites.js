// ASCII "billboard" glyph templates for trees and cars. Each template is a
// small grid of characters; a space means transparent. Colors are resolved
// per-character via colorFor().

const GLYPHS = {
  tree: {
    rows: [
      '   ^   ',
      '  /^\\  ',
      ' /***\\ ',
      '/*****\\',
      ' ***** ',
      '  | |  ',
      '  | |  ',
    ],
    colorFor(ch) {
      if (ch === '|') return '#6b4a2a';
      return '#2f8f4e';
    },
  },
  car: {
    rows: [
      '  ____  ',
      ' /[==]\\ ',
      '/______\\',
      '|_.__.-|',
      '  O  O  ',
    ],
    colorFor(ch, sprite) {
      if (ch === 'O') return '#1a1a1a';
      if (ch === '=') return '#bcdfff';
      return sprite.color || '#c94b4b';
    },
  },
};
