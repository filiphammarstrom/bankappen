export interface SieAccount {
  number: number;
  name: string;
}

export interface SieBalance {
  year: number; // 0 = current, -1 = previous
  accountNumber: number;
  amount: number;
}

export interface SieTrans {
  accountNumber: number;
  amount: number;
  description: string;
}

export interface SieVer {
  series: string;
  number: number;
  date: string; // YYYYMMDD
  description: string;
  transactions: SieTrans[];
}

export interface SieFile {
  companyName: string;
  orgNumber: string;
  program: string;
  fiscalYearStart: string; // YYYYMMDD
  fiscalYearEnd: string;   // YYYYMMDD
  accounts: SieAccount[];
  openingBalances: SieBalance[];   // #IB
  closingBalances: SieBalance[];   // #UB
  resultBalances: SieBalance[];    // #RES
  verifications: SieVer[];
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === " " || line[i] === "\t") { i++; continue; }
    if (line[i] === '"') {
      let s = "";
      i++;
      while (i < line.length && line[i] !== '"') {
        if (line[i] === "\\" && i + 1 < line.length) { i++; }
        s += line[i++];
      }
      i++; // closing quote
      tokens.push(s);
    } else if (line[i] === "{") {
      let depth = 0;
      let s = "";
      while (i < line.length) {
        s += line[i];
        if (line[i] === "{") depth++;
        else if (line[i] === "}") { depth--; if (depth === 0) { i++; break; } }
        i++;
      }
      tokens.push(s);
    } else {
      let s = "";
      while (i < line.length && line[i] !== " " && line[i] !== "\t") s += line[i++];
      tokens.push(s);
    }
  }
  return tokens;
}

export function parseSie(buffer: Buffer): SieFile {
  // SIE files are Latin-1 encoded
  const text = buffer.toString("latin1");
  const lines = text.split(/\r?\n/);

  const result: SieFile = {
    companyName: "",
    orgNumber: "",
    program: "",
    fiscalYearStart: "",
    fiscalYearEnd: "",
    accounts: [],
    openingBalances: [],
    closingBalances: [],
    resultBalances: [],
    verifications: [],
  };

  let currentVer: SieVer | null = null;
  let inVer = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line === "{" || line === "}") {
      if (line === "}" && inVer && currentVer) {
        result.verifications.push(currentVer);
        currentVer = null;
        inVer = false;
      }
      continue;
    }
    if (!line.startsWith("#")) continue;

    const spaceIdx = line.indexOf(" ");
    const tag = spaceIdx === -1 ? line : line.slice(0, spaceIdx);
    const rest = spaceIdx === -1 ? "" : line.slice(spaceIdx + 1);
    const tokens = tokenize(rest);

    switch (tag) {
      case "#FNAMN":
        result.companyName = tokens[0] ?? "";
        break;
      case "#ORGNR":
        result.orgNumber = tokens[0] ?? "";
        break;
      case "#PROGRAM":
        result.program = tokens[0] ?? "";
        break;
      case "#RAR":
        // #RAR 0 start end — year 0 = current fiscal year
        if (tokens[0] === "0") {
          result.fiscalYearStart = tokens[1] ?? "";
          result.fiscalYearEnd = tokens[2] ?? "";
        }
        break;
      case "#KONTO":
        result.accounts.push({
          number: parseInt(tokens[0] ?? "0", 10),
          name: tokens[1] ?? "",
        });
        break;
      case "#IB":
        result.openingBalances.push({
          year: parseInt(tokens[0] ?? "0", 10),
          accountNumber: parseInt(tokens[1] ?? "0", 10),
          amount: parseFloat(tokens[2] ?? "0"),
        });
        break;
      case "#UB":
        result.closingBalances.push({
          year: parseInt(tokens[0] ?? "0", 10),
          accountNumber: parseInt(tokens[1] ?? "0", 10),
          amount: parseFloat(tokens[2] ?? "0"),
        });
        break;
      case "#RES":
        result.resultBalances.push({
          year: parseInt(tokens[0] ?? "0", 10),
          accountNumber: parseInt(tokens[1] ?? "0", 10),
          amount: parseFloat(tokens[2] ?? "0"),
        });
        break;
      case "#VER":
        currentVer = {
          series: tokens[0] ?? "",
          number: parseInt(tokens[1] ?? "0", 10),
          date: tokens[2] ?? "",
          description: tokens[3] ?? "",
          transactions: [],
        };
        inVer = true;
        break;
      case "#TRANS":
        if (currentVer) {
          currentVer.transactions.push({
            accountNumber: parseInt(tokens[0] ?? "0", 10),
            amount: parseFloat(tokens[2] ?? "0"),
            description: tokens[4] ?? "",
          });
        }
        break;
      // #BTRANS and #RTRANS are cancelled/corrected — skip, only use #TRANS
    }
  }

  return result;
}
