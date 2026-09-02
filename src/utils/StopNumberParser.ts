/**
 * Utilities to extract a bus stop number from an Alexa slot value.
 *
 * Alexa+ (the LLM-based Alexa) is much more liberal than classic Alexa when it
 * fills slots: instead of "199" it may send "ciento noventa y nueve",
 * "parada 199", "la 199", "199." or even "one nine nine". Classic Alexa also
 * occasionally sends "?" when it could not resolve an AMAZON.NUMBER slot.
 *
 * This parser tries, in order:
 *   1. Plain digits anywhere in the string.
 *   2. Spanish cardinal number words (uno … novecientos noventa y nueve).
 *   3. English cardinal number words (fallback for mixed-locale devices).
 */

const ES_UNITS: Record<string, number> = {
    cero: 0, un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9,
    diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
    dieciseis: 16, dieciséis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19,
    veinte: 20, veintiuno: 21, veintiún: 21, veintiun: 21, veintiuna: 21, veintidos: 22, veintidós: 22, veintitres: 23, veintitrés: 23,
    veinticuatro: 24, veinticinco: 25, veintiseis: 26, veintiséis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
};

const ES_TENS: Record<string, number> = {
    treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
};

const ES_HUNDREDS: Record<string, number> = {
    cien: 100, ciento: 100, doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300,
    cuatrocientos: 400, cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
    setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900, novecientas: 900,
};

const EN_WORDS: Record<string, number> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100,
};

function parseSpanishWords(tokens: string[]): number | null {
    let total = 0;
    let matched = false;
    for (const tok of tokens) {
        if (tok === 'y' || tok === 'la' || tok === 'el' || tok === 'parada' || tok === 'numero' || tok === 'número') continue;
        if (tok in ES_HUNDREDS) { total += ES_HUNDREDS[tok]; matched = true; continue; }
        if (tok in ES_TENS) { total += ES_TENS[tok]; matched = true; continue; }
        if (tok in ES_UNITS) { total += ES_UNITS[tok]; matched = true; continue; }
        // Unknown token in the middle of a number phrase → give up on word parsing
        if (matched) return null;
    }
    return matched ? total : null;
}

function parseEnglishWords(tokens: string[]): number | null {
    let total = 0;
    let current = 0;
    let matched = false;
    for (const tok of tokens) {
        if (tok === 'and' || tok === 'stop' || tok === 'number') continue;
        if (!(tok in EN_WORDS)) { if (matched) return null; continue; }
        matched = true;
        const v = EN_WORDS[tok];
        if (v === 100) { current = (current || 1) * 100; }
        else { current += v; }
    }
    total += current;
    return matched ? total : null;
}

/**
 * Returns the stop number as a positive integer, or null if nothing usable was found.
 */
export function parseStopNumber(raw: string | undefined | null): number | null {
    if (!raw) return null;
    const value = String(raw).trim().toLowerCase();
    if (!value || value === '?') return null;

    // 1. Digits (allow "parada 199", "199.", "1 9 9")
    const digitGroups = value.match(/\d+/g);
    if (digitGroups && digitGroups.length > 0) {
        const joined = digitGroups.join('');
        const n = parseInt(joined, 10);
        if (!isNaN(n) && n > 0 && n < 100000) return n;
    }

    // 2/3. Number words
    const tokens = value
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents -> "dieciseis"
        .replace(/[^a-z\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);

    const es = parseSpanishWords(tokens);
    if (es !== null && es > 0) return es;

    const en = parseEnglishWords(tokens);
    if (en !== null && en > 0) return en;

    return null;
}
