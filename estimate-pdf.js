/* =========================================================================
   CobWebZ — estimate PDF writer (vanilla JS, no library)
   script.js loads this file the first time someone clicks "Download PDF" in the estimator,
   so it costs nothing until then. It writes an A4 PDF by hand: the PDF viewer's built-in
   Helvetica fonts (nothing to embed) and the logo from assets/logo.png, drawn onto white and
   embedded as a greyscale image.
   Helvetica only covers Western European characters: anything else (e.g. a name typed in
   Sinhala or Tamil) is left out of the PDF rather than shown as boxes.
   ========================================================================= */
(() => {
  const PAGE_W = 595.28; // A4 in points
  const PAGE_H = 841.89;
  const M = 48; // page margin
  const CONTENT_W = PAGE_W - M * 2;

  const COLOR = {
    ink: [0.039, 0.039, 0.039],
    body: [0.412, 0.42, 0.439],
    rule: [0.89, 0.898, 0.91],
    band: [0.955, 0.96, 0.968],
    accent: [0.357, 0.471, 0.651], // dusty blue, from variables.css
    offer: [0.592, 0.286, 0.184]
  };

  /* ---------- Text: WinAnsi encoding and Helvetica character widths ---------- */
  // Widths (per 1000 units of font size) for characters 32–126, from Adobe's font metrics
  const HELVETICA = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
    556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667,
    722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722,
    667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556,
    222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
    260, 334, 584];
  const HELVETICA_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278,
    278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722,
    722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611,
    722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611,
    611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500,
    389, 280, 389, 584];
  // Characters outside plain ASCII that the estimate uses: WinAnsi code and [regular, bold] width
  const EXTRA = {
    '×': [0xd7, 584, 584], '—': [0x97, 1000, 1000], '–': [0x96, 556, 556], '·': [0xb7, 278, 278],
    '’': [0x92, 222, 278], '‘': [0x91, 222, 278], '“': [0x93, 333, 500], '”': [0x94, 333, 500],
    '•': [0x95, 350, 350], '…': [0x85, 1000, 1000], '−': [0x2d, 333, 333], ' ': [0x20, 278, 278]
  };

  // A string as [code, width] pairs; characters Helvetica can't show are dropped
  function encode(text, bold) {
    const out = [];
    for (const ch of String(text)) {
      const c = ch.codePointAt(0);
      if (c >= 32 && c <= 126) out.push([c, (bold ? HELVETICA_BOLD : HELVETICA)[c - 32]]);
      else if (EXTRA[ch]) out.push([EXTRA[ch][0], EXTRA[ch][bold ? 2 : 1]]);
      else if (c >= 0xa1 && c <= 0xff) out.push([c, 556]); // Latin-1 letters: é, ü, ñ…
    }
    return out;
  }
  const measure = (codes, size, spacing = 0) =>
    codes.reduce((w, [, cw]) => w + (cw * size) / 1000 + spacing, 0);
  // A PDF string literal, ASCII only: ( ) \ escaped, anything above 126 as an octal escape
  const literal = (codes) => `(${codes.map(([c]) => (c === 40 || c === 41 || c === 92
    ? `\\${String.fromCharCode(c)}`
    : c < 127 ? String.fromCharCode(c) : `\\${c.toString(8).padStart(3, '0')}`)).join('')})`;

  // Splits text into lines no wider than maxW (long words are left whole)
  function wrap(text, { size, bold, spacing = 0 }, maxW) {
    const words = String(text).split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const next = line ? `${line} ${word}` : word;
      if (line && measure(encode(next, bold), size, spacing) > maxW) {
        lines.push(line);
        line = word;
      } else line = next;
    });
    if (line) lines.push(line);
    return lines.length ? lines : [''];
  }

  /* ---------- The logo: assets/logo.png on white, as 8-bit greyscale ---------- */
  async function loadLogo(src) {
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const scale = 2; // twice the file's size, so its curves stay smooth in print
      const w = img.naturalWidth * scale;
      const h = img.naturalHeight * scale;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      const rgba = ctx.getImageData(0, 0, w, h).data;
      const grey = new Uint8Array(w * h);
      for (let i = 0; i < grey.length; i++) {
        grey[i] = Math.round(rgba[i * 4] * 0.299 + rgba[i * 4 + 1] * 0.587 + rgba[i * 4 + 2] * 0.114);
      }
      // Compressed where the browser can (all current ones); a few hundred KB uncompressed if not
      if ('CompressionStream' in window) {
        const stream = new Blob([grey]).stream().pipeThrough(new CompressionStream('deflate'));
        return { w, h, bytes: new Uint8Array(await new Response(stream).arrayBuffer()), flate: true };
      }
      return { w, h, bytes: grey, flate: false };
    } catch {
      return null; // no logo: the PDF falls back to the name in text
    }
  }

  /* ---------- Page layout ---------- */
  function layout(data, logo) {
    const pages = [];
    let ops; // drawing operators for the current page
    let y;

    const rgb = ([r, g, b]) => `${r} ${g} ${b}`;
    function newPage() {
      ops = [];
      pages.push(ops);
      y = PAGE_H - M;
    }
    // Leaves room for the footer; starts a new page when the next block won't fit
    function ensure(h) {
      if (y - h < M + 28) newPage();
    }
    function text(x, baseline, str, { size = 10, bold = false, color = COLOR.ink, align = 'left', spacing = 0 } = {}) {
      const codes = encode(str, bold);
      if (!codes.length) return;
      const w = measure(codes, size, spacing);
      const left = align === 'right' ? x - w : x;
      ops.push(`BT /${bold ? 'F2' : 'F1'} ${size} Tf ${rgb(color)} rg ${spacing} Tc ${left.toFixed(2)} ${baseline.toFixed(2)} Td ${literal(codes)} Tj ET`);
    }
    function rule(x1, x2, at, color = COLOR.rule, width = 0.6) {
      ops.push(`${rgb(color)} RG ${width} w ${x1.toFixed(2)} ${at.toFixed(2)} m ${x2.toFixed(2)} ${at.toFixed(2)} l S`);
    }
    function band(x, top, w, h, color) {
      ops.push(`${rgb(color)} rg ${x.toFixed(2)} ${(top - h).toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`);
    }

    newPage();

    // Header: the logo on the left, "Estimate", its number and date on the right
    const logoH = 58;
    if (logo) {
      const logoW = (logo.w / logo.h) * logoH;
      ops.push(`q ${logoW.toFixed(2)} 0 0 ${logoH} ${M} ${(y - logoH).toFixed(2)} cm /Logo Do Q`);
    } else {
      text(M, y - 30, 'CobWebZ', { size: 22, bold: true });
    }
    text(PAGE_W - M, y - 18, 'ESTIMATE', { size: 20, bold: true, align: 'right', spacing: 1.5 });
    text(PAGE_W - M, y - 36, `No. ${data.number}`, { size: 9.5, color: COLOR.body, align: 'right' });
    text(PAGE_W - M, y - 50, data.date, { size: 9.5, color: COLOR.body, align: 'right' });
    y -= logoH + 20;
    band(M, y, CONTENT_W, 2, COLOR.accent);
    y -= 28;

    // From / Prepared for
    const label = { size: 7.5, bold: true, color: COLOR.body, spacing: 1 };
    const columns = [['FROM', data.from], ['PREPARED FOR', data.to]].filter(([, lines]) => lines && lines.length);
    let tallest = 0;
    columns.forEach(([title, lines], i) => {
      const x = M + i * (CONTENT_W / 2);
      text(x, y, title, label);
      lines.forEach((line, j) => text(x, y - 16 - j * 14, line, { size: 10, bold: j === 0 }));
      tallest = Math.max(tallest, lines.length);
    });
    y -= 16 + tallest * 14 + 18;

    // The itemised table
    const PRICE_W = 150;
    const header = () => {
      band(M, y, CONTENT_W, 22, COLOR.band);
      text(M + 10, y - 14.5, 'ITEM', label);
      text(PAGE_W - M - 10, y - 14.5, 'PRICE', { ...label, align: 'right' });
      y -= 22;
    };
    header();
    data.rows.forEach(([name, price, cls], i) => {
      if (cls === 'is-group') {
        ensure(30);
        y -= 18;
        text(M + 10, y, name.toUpperCase(), { ...label, color: COLOR.accent });
        y -= 6;
        return;
      }
      const isPlan = i === 0;
      const indent = cls === 'is-note' ? 22 : 10;
      const style = isPlan ? { size: 11, bold: true }
        : cls === 'is-note' ? { size: 9.5, color: COLOR.body }
          : cls === 'is-offer' ? { size: 10, color: COLOR.offer }
            : { size: 10 };
      const lines = wrap(name, style, CONTENT_W - PRICE_W - indent - 10);
      const lead = style.size + 3.5;
      const h = lines.length * lead + (isPlan ? 12 : 8);
      ensure(h);
      const top = y - style.size - (isPlan ? 6 : 4);
      lines.forEach((line, j) => text(M + indent, top - j * lead, line, style));
      text(PAGE_W - M - 10, top, price, { ...style, align: 'right' });
      y -= h;
      rule(M, PAGE_W - M, y);
    });

    // Totals, right-aligned under the table
    ensure(30 + data.totals.length * 34);
    y -= 14;
    const boxX = PAGE_W - M - 270;
    rule(boxX, PAGE_W - M, y, COLOR.ink, 1);
    data.totals.forEach(([name, value, note]) => {
      y -= 20;
      text(boxX + 10, y, name, { size: 10, color: COLOR.body });
      text(PAGE_W - M - 10, y, value, { size: 13, bold: true, align: 'right' });
      if (note) {
        y -= 13;
        text(PAGE_W - M - 10, y, note, { size: 8.5, color: COLOR.body, align: 'right' });
      }
      y -= 6;
    });

    // Notes
    y -= 22;
    data.notes.forEach((note) => {
      const lines = wrap(note, { size: 8.5 }, CONTENT_W);
      ensure(lines.length * 12 + 4);
      lines.forEach((line) => {
        text(M, y, line, { size: 8.5, color: COLOR.body });
        y -= 12;
      });
      y -= 4;
    });

    // A footer on every page
    pages.forEach((page, i) => {
      ops = page;
      rule(M, PAGE_W - M, M + 8);
      text(M, M - 6, data.footer, { size: 7.5, color: COLOR.body });
      text(PAGE_W - M, M - 6, `Page ${i + 1} of ${pages.length}`, { size: 7.5, color: COLOR.body, align: 'right' });
    });
    return pages;
  }

  /* ---------- The PDF file itself ---------- */
  function assemble(pages, logo, title) {
    const chunks = [];
    const offsets = [];
    let length = 0;
    const ascii = (s) => {
      const bytes = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i) & 0xff;
      return bytes;
    };
    const put = (part) => {
      const bytes = typeof part === 'string' ? ascii(part) : part;
      chunks.push(bytes);
      length += bytes.length;
    };
    const object = (n, body, stream) => {
      offsets[n] = length;
      put(`${n} 0 obj\n${body}\n`);
      if (stream) {
        put('stream\n');
        put(stream);
        put('\nendstream\n');
      }
      put('endobj\n');
    };

    // 1 catalog, 2 page tree, 3–4 fonts, 5 info, 6 logo, then a page and its content per page
    const first = 7;
    const kids = pages.map((_, i) => `${first + i * 2} 0 R`).join(' ');
    put('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n');
    object(1, '<< /Type /Catalog /Pages 2 0 R >>');
    object(2, `<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>`);
    object(3, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    object(4, '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    object(5, `<< /Title ${literal(encode(title))} /Author (CobWebZ) /Creator (cobwebz.lk) >>`);
    if (logo) {
      object(6, `<< /Type /XObject /Subtype /Image /Width ${logo.w} /Height ${logo.h} /ColorSpace /DeviceGray `
        + `/BitsPerComponent 8 ${logo.flate ? '/Filter /FlateDecode ' : ''}/Length ${logo.bytes.length} >>`, logo.bytes);
    } else {
      object(6, '<< >>');
    }
    pages.forEach((ops, i) => {
      const n = first + i * 2;
      const content = ascii(ops.join('\n'));
      object(n, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] `
        + `/Resources << /Font << /F1 3 0 R /F2 4 0 R >>${logo ? ' /XObject << /Logo 6 0 R >>' : ''} >> `
        + `/Contents ${n + 1} 0 R >>`);
      object(n + 1, `<< /Length ${content.length} >>`, content);
    });

    const count = first + pages.length * 2;
    const xref = length;
    put(`xref\n0 ${count}\n0000000000 65535 f \n`);
    for (let n = 1; n < count; n++) put(`${String(offsets[n]).padStart(10, '0')} 00000 n \n`);
    put(`trailer\n<< /Size ${count} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(chunks, { type: 'application/pdf' });
  }

  /* data: { number, date, from: [lines], to: [lines] | null, rows: [[name, price, cls]],
             totals: [[label, value, note?]], notes: [text], footer, logo: 'assets/logo.png' } */
  async function make(data) {
    const logo = await loadLogo(data.logo);
    return assemble(layout(data, logo), logo, `CobWebZ estimate ${data.number}`);
  }

  window.CobwebzEstimatePdf = { make };
})();
