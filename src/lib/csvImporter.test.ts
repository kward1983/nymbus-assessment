import { describe, it, expect } from "vitest";
import { parseCSV } from "./csvImporter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeFile(content: string, name = "test.csv"): File {
  return new File([content], name, { type: "text/csv" });
}

const HEADER = "date,description,amount";

// ─── File-level guards ────────────────────────────────────────────────────────

describe("parseCSV – file guards", () => {
  it("rejects a file without .csv extension", async () => {
    const file = makeFile(`${HEADER}\n2024-01-01,Salary,1000`, "data.txt");
    await expect(parseCSV(file)).rejects.toThrow(/Invalid file type/i);
  });

  it("rejects a file larger than 10 MB", async () => {
    // Create a File stub with an inflated size
    const bigContent = "a".repeat(1024); // small actual content
    const file = new File([bigContent], "big.csv", { type: "text/csv" });
    Object.defineProperty(file, "size", { value: 10_485_761 });
    await expect(parseCSV(file)).rejects.toThrow(/10 MB/i);
  });

  it("rejects when data rows exceed 10,000", async () => {
    // Build a CSV with 10,001 data rows
    const rows = [HEADER];
    for (let i = 0; i < 10_001; i++) {
      rows.push(`2024-01-01,Row ${i},${i + 1}.00`);
    }
    const file = makeFile(rows.join("\n"));
    await expect(parseCSV(file)).rejects.toThrow(/10[,.]?000|row/i);
  });
});

// ─── Happy-path parsing ───────────────────────────────────────────────────────

describe("parseCSV – valid rows", () => {
  it("parses a well-formed 3-row CSV and skips the header", async () => {
    const csv = [
      HEADER,
      "2024-01-15,Salary,3000.00",
      "2024-01-20,Groceries,-150.50",
      "2024-01-25,Freelance,500",
    ].join("\n");

    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(3);
    expect(result.skippedRows).toHaveLength(0);
    expect(result.totalRows).toBe(3);
  });

  it("assigns correct fields to each transaction", async () => {
    const csv = [HEADER, "2024-03-10,Coffee,-4.50"].join("\n");
    const result = await parseCSV(makeFile(csv));
    const tx = result.transactions[0];

    expect(tx.date).toBe("2024-03-10");
    expect(tx.description).toBe("Coffee");
    expect(tx.amount).toBe(-4.5);
    expect(tx.source).toBe("csv");
    expect(typeof tx.id).toBe("string");
    expect(tx.id).toHaveLength(36); // UUID v4
    expect(typeof tx.createdAt).toBe("string");
  });

  it("classifies positive amounts as inflow", async () => {
    const csv = [HEADER, "2024-01-01,Income,2000"].join("\n");
    const { transactions } = await parseCSV(makeFile(csv));
    expect(transactions[0].classification).toBe("inflow");
  });

  it("classifies negative amounts as outflow", async () => {
    const csv = [HEADER, "2024-01-01,Rent,-1500.00"].join("\n");
    const { transactions } = await parseCSV(makeFile(csv));
    expect(transactions[0].classification).toBe("outflow");
  });

  it("classifies zero amounts as unclassified", async () => {
    const csv = [HEADER, "2024-01-01,Adjustment,0"].join("\n");
    const { transactions } = await parseCSV(makeFile(csv));
    expect(transactions[0].classification).toBe("unclassified");
  });

  it("handles amounts without sign as positive", async () => {
    const csv = [HEADER, "2024-01-01,Deposit,2000"].join("\n");
    const { transactions } = await parseCSV(makeFile(csv));
    expect(transactions[0].amount).toBe(2000);
    expect(transactions[0].classification).toBe("inflow");
  });

  it("handles negative amounts correctly", async () => {
    const csv = [HEADER, "2024-01-01,Expense,-1500.00"].join("\n");
    const { transactions } = await parseCSV(makeFile(csv));
    expect(transactions[0].amount).toBe(-1500);
  });

  it("trims whitespace from fields", async () => {
    const csv = [HEADER, "  2024-01-01  ,  Salary  ,  500  "].join("\n");
    const { transactions } = await parseCSV(makeFile(csv));
    expect(transactions[0].date).toBe("2024-01-01");
    expect(transactions[0].description).toBe("Salary");
    expect(transactions[0].amount).toBe(500);
  });
});

// ─── Row-level validation / skipping ─────────────────────────────────────────

describe("parseCSV – skipped rows", () => {
  it("skips row with non-parseable amount and records unparseable_amount", async () => {
    const csv = [HEADER, "2024-01-01,Coffee,abc"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
    expect(result.skippedRows[0].reason).toBe("unparseable_amount");
    expect(result.skippedRows[0].rowNumber).toBe(2);
    expect(result.skippedRows[0].fieldName).toBe("amount");
  });

  it("skips row with invalid date (month 13) and records unparseable_date", async () => {
    const csv = [HEADER, "2024-13-01,Salary,1000"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
    expect(result.skippedRows[0].reason).toBe("unparseable_date");
    expect(result.skippedRows[0].fieldName).toBe("date");
  });

  it("skips row with invalid date (Feb 30) and records unparseable_date", async () => {
    const csv = [HEADER, "2024-02-30,Salary,1000"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.skippedRows[0].reason).toBe("unparseable_date");
  });

  it("skips row with missing description and records missing_field", async () => {
    const csv = [HEADER, "2024-01-01,,500"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(0);
    expect(result.skippedRows[0].reason).toBe("missing_field");
    expect(result.skippedRows[0].fieldName).toBe("description");
  });

  it("skips row with missing amount and records missing_field", async () => {
    const csv = [HEADER, "2024-01-01,Salary,"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.skippedRows[0].reason).toBe("missing_field");
    expect(result.skippedRows[0].fieldName).toBe("amount");
  });

  it("skips row with missing date and records missing_field", async () => {
    const csv = [HEADER, ",Salary,500"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.skippedRows[0].reason).toBe("missing_field");
    expect(result.skippedRows[0].fieldName).toBe("date");
  });

  it("skips row with description exceeding 255 characters", async () => {
    const longDesc = "A".repeat(256);
    const csv = [HEADER, `2024-01-01,${longDesc},500`].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(1);
  });

  it("records correct row numbers for multiple skipped rows", async () => {
    const csv = [
      HEADER,
      "2024-01-01,Valid,100",     // row 2 → valid
      "bad-date,Invalid,200",     // row 3 → skipped
      "2024-01-03,Also Valid,50", // row 4 → valid
      "2024-01-04,Bad amount,xyz",// row 5 → skipped
    ].join("\n");

    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(2);
    expect(result.skippedRows).toHaveLength(2);
    expect(result.skippedRows[0].rowNumber).toBe(3);
    expect(result.skippedRows[1].rowNumber).toBe(5);
    expect(result.totalRows).toBe(4);
  });

  it("returns zero valid transactions when all rows are invalid", async () => {
    const csv = [HEADER, "bad,date,here", "also,bad,row"].join("\n");
    const result = await parseCSV(makeFile(csv));

    expect(result.transactions).toHaveLength(0);
    expect(result.skippedRows).toHaveLength(2);
  });

  it("totalRows equals valid + skipped", async () => {
    const csv = [
      HEADER,
      "2024-01-01,Good,100",
      "2024-01-02,Good,200",
      "bad-date,Bad,300",
    ].join("\n");

    const result = await parseCSV(makeFile(csv));
    expect(result.transactions.length + result.skippedRows.length).toBe(
      result.totalRows
    );
  });
});
