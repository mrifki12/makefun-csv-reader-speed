// Fast drop-in replacement for csv-reader 1.0.0: returns exactly {columns, rows, errors} as the
// reference reads {text, header}, but in one pass that slices fields out of the text instead of
// building them character by character. Segment assembly is used only where a field cannot be a
// single slice (a stray CR in an unquoted field, a doubled quote or a CR inside a quoted field).
//
// Reading policy (identical to the reference):
//   - a U+FEFF at the very start is dropped; a record ends at LF or CRLF; an empty line is no record;
//   - outside quotes a CR not followed by LF is dropped (stray_cr);
//   - a field opening with a quote runs to the next quote that is not doubled ("" is one quote, and
//     each CRLF or lone CR inside it reads as LF); what follows the closing quote up to the next
//     comma or line break is appended as it stands (quote_junk, when anything was appended);
//   - a quote that never closes is a literal character and the rest is read again as unquoted
//     (unterminated_quote); a quote inside an unquoted field is literal; fields stay strings;
//   - columns is the first record when header is true, else null; rows are padded (short_row) or
//     cut (long_row) to the first record's width; errors are {code, line, row} in the order met.

const COMMA = 0;
const BREAK = 1;
const END = 2;

export function run(input) {
  const t = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const n = t.length;
  let pos = 0;
  let line = 1;
  if (n > 0 && t.charCodeAt(0) === 0xfeff) pos = 1;

  // The record being read: the line it starts on and its index in rows (null for the header).
  let rl = 1;
  let rr = null;

  // The field just read: its value, how it ended, and (for unquoted reads) how many characters
  // were kept onto the initial value.
  let fv = '';
  let fe = END;
  let fa = 0;

  // Reads unquoted characters onto init, up to the next comma or line break.
  function readU(init) {
    let i = pos;
    let seg = pos;
    let parts = null;
    let end = END;
    let adv = 0;
    while (i < n) {
      const c = t.charCodeAt(i);
      if (c === 44) { end = COMMA; adv = 1; break; }
      if (c === 10) { end = BREAK; adv = 1; break; }
      if (c === 13) {
        if (t.charCodeAt(i + 1) === 10) { end = BREAK; adv = 2; break; }
        if (parts === null) parts = [];
        if (i > seg) parts.push(t.slice(seg, i));
        errors.push({ code: 'stray_cr', line: rl, row: rr });
        i += 1;
        seg = i;
        continue;
      }
      i += 1;
    }
    let val;
    if (parts === null) {
      val = init + t.slice(seg, i);
    } else {
      if (i > seg) parts.push(t.slice(seg, i));
      val = init + parts.join('');
    }
    fa = val.length - init.length;
    fv = val;
    fe = end;
    pos = i + adv;
    if (end === BREAK) line += 1;
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQ() {
    const open = pos;
    const openLine = line;
    let i = pos + 1;
    let seg = i;
    let parts = null;
    let closed = false;
    while (i < n) {
      const c = t.charCodeAt(i);
      if (c === 34) {
        if (t.charCodeAt(i + 1) === 34) {
          if (parts === null) parts = [];
          if (i > seg) parts.push(t.slice(seg, i));
          parts.push('"');
          i += 2;
          seg = i;
          continue;
        }
        closed = true;
        break;
      }
      if (c === 13) {
        if (parts === null) parts = [];
        if (i > seg) parts.push(t.slice(seg, i));
        parts.push('\n');
        line += 1;
        i += t.charCodeAt(i + 1) === 10 ? 2 : 1;
        seg = i;
        continue;
      }
      if (c === 10) line += 1;
      i += 1;
    }
    if (!closed) {
      // The quote never closes: it is a literal character, the rest is read again as unquoted.
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: rl, row: rr });
      readU('"');
      return;
    }
    let val;
    if (parts === null) {
      val = t.slice(seg, i);
    } else {
      if (i > seg) parts.push(t.slice(seg, i));
      val = parts.join('');
    }
    pos = i + 1;
    if (pos >= n) { fv = val; fe = END; return; }
    const c = t.charCodeAt(pos);
    if (c === 44) { pos += 1; fv = val; fe = COMMA; return; }
    if (c === 10) { pos += 1; line += 1; fv = val; fe = BREAK; return; }
    if (c === 13 && t.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; fv = val; fe = BREAK; return; }
    // What follows the closing quote is appended as it stands.
    readU(val);
    if (fa > 0) errors.push({ code: 'quote_junk', line: rl, row: rr });
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = t.charCodeAt(pos);
      if (c === 10) { pos += 1; line += 1; }
      else if (c === 13 && t.charCodeAt(pos + 1) === 10) { pos += 2; line += 1; }
      else break;
    }
    if (pos >= n) break;

    rl = line;
    rr = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    for (;;) {
      quoted = pos < n && t.charCodeAt(pos) === 34;
      if (quoted) readQ();
      else readU('');
      fields.push(fv);
      if (fe !== COMMA) break;
    }

    // A line that held only stray CRs is left with no characters: no record (its errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: rl, row: rr, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: rl, row: rr, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
