/** The facts a table's public row is grouped by — everything except its
 *  label, since the label is exactly what tells two rows with the same
 *  facts apart. */
export type TableFacts = {
  type: string | null;
  size: string | null;
  brand: string | null;
  felt: string | null;
};

export type TableFactsRow = TableFacts & { labels: string[] };

const sameFacts = (a: TableFacts, b: TableFacts) =>
  a.type === b.type &&
  a.size === b.size &&
  a.brand === b.brand &&
  a.felt === b.felt;

/**
 * A club's tables as the fewest rows that still say all of it — the same
 * idea weekRows applies to opening hours: six identical 9ft American Pool
 * tables read as six copies of the same line otherwise, exactly the way an
 * un-collapsed week would read as seven identical hours rows.
 *
 * Adjacent only, in the order the tables were given (their own sort_order):
 * a club that alternates two kinds of table down a row is showing that
 * pattern on purpose, and merging table 1 with table 3 across an unlike
 * table 2 would erase it.
 */
export function groupTablesByFacts<T extends TableFacts & { label: string }>(
  tables: T[],
): TableFactsRow[] {
  const rows: TableFactsRow[] = [];

  for (const table of tables) {
    const last = rows[rows.length - 1];
    if (last && sameFacts(last, table)) last.labels.push(table.label);
    else
      rows.push({
        labels: [table.label],
        type: table.type,
        size: table.size,
        brand: table.brand,
        felt: table.felt,
      });
  }

  return rows;
}
