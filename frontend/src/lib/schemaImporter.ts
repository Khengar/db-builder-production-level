import { v4 as uuid } from "uuid";
import type { DBTable, Column, Relation } from "../store/dbStore";

const mapType = (sqlType: string): string => {
  const t = sqlType.toLowerCase();
  if (t.includes("int")) return "int";
  if (t.includes("uuid")) return "uuid";
  if (t.includes("bool")) return "bool";
  if (t.includes("time") || t.includes("date")) return "date";
  if (t.includes("json")) return "json";
  if (t.includes("float") || t.includes("double")) return "float";
  return "text";
};

export function parseAtlasJson(atlasData: any) {
  const newTables: DBTable[] = [];
  const newRelations: Relation[] = [];
  
  const publicSchema = atlasData.schemas?.find((s: any) => s.name === "public");
  if (!publicSchema || !publicSchema.tables) return { tables: [], relations: [] };

  const tableMap = new Map<string, DBTable>();

  publicSchema.tables.forEach((tbl: any, index: number) => {
    const tableId = uuid();
    const x = (index % 4) * 320 + 50; 
    const y = Math.floor(index / 4) * 300 + 50;

    const columns: Column[] = tbl.columns.map((col: any) => ({
      id: uuid(),
      name: col.name,
      type: mapType(col.type),
      isNullable: col.null,
      isPrimary: tbl.primary_key?.columns.includes(col.name),
      isUnique: false,
    }));

    const tableObj: DBTable = { id: tableId, name: tbl.name, x, y, columns };
    newTables.push(tableObj);
    tableMap.set(tbl.name, tableObj);
  });

  publicSchema.tables.forEach((tbl: any) => {
    if (!tbl.foreign_keys) return;
    const childTable = tableMap.get(tbl.name);
    if (!childTable) return;

    tbl.foreign_keys.forEach((fk: any) => {
      const parentTable = tableMap.get(fk.ref_table);
      if (!parentTable) return;

      const childColName = fk.columns[0];
      const parentColName = fk.ref_columns[0];
      const childCol = childTable.columns.find(c => c.name === childColName);
      const parentCol = parentTable.columns.find(c => c.name === parentColName);

      if (childCol && parentCol) {
        childCol.isForeign = true;
        childCol.references = { tableId: parentTable.id, columnId: parentCol.id };

        newRelations.push({
          id: uuid(),
          from: { tableId: parentTable.id, columnId: parentCol.id },
          to: { tableId: childTable.id, columnId: childCol.id },
          cardinality: "one-to-many",
          deleteRule: fk.on_delete?.toLowerCase() === "set null" ? "set-null" : "cascade",
          updateRule: "cascade",
          isOneToManyReversed: false
        });
      }
    });
  });

  return { tables: newTables, relations: newRelations };
}