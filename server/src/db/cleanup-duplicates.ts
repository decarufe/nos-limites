import { client } from "./connection";

/**
 * Remove duplicate seed data (categories, subcategories, limits).
 * Keeps the first occurrence of each category name and remaps any user_limits
 * referencing duplicate limit IDs to the canonical (kept) limit IDs.
 */
export async function cleanupDuplicateSeeds() {
  const dupCheck = await client.execute(
    "SELECT name, COUNT(*) as cnt FROM limit_categories GROUP BY name HAVING cnt > 1",
  );

  if (dupCheck.rows.length === 0) {
    return;
  }

  console.log(
    `Found ${dupCheck.rows.length} duplicate category name(s), cleaning up...`,
  );

  for (const row of dupCheck.rows) {
    const name = row.name as string;

    // Get all category IDs for this name, keep the first (by rowid)
    const cats = await client.execute({
      sql: "SELECT id, rowid FROM limit_categories WHERE name = ? ORDER BY rowid",
      args: [name],
    });

    const keepCatId = cats.rows[0].id as string;
    const deleteCatIds = cats.rows.slice(1).map((r) => r.id as string);

    // Get subcategories for the kept category
    const keptSubs = await client.execute({
      sql: "SELECT id, name FROM limit_subcategories WHERE category_id = ? ORDER BY sort_order",
      args: [keepCatId],
    });

    for (const delCatId of deleteCatIds) {
      const delSubs = await client.execute({
        sql: "SELECT id, name FROM limit_subcategories WHERE category_id = ? ORDER BY sort_order",
        args: [delCatId],
      });

      // For each duplicate subcategory, remap user_limits from deleted limits to kept limits
      for (const delSub of delSubs.rows) {
        const keptSub = keptSubs.rows.find((s) => s.name === delSub.name);
        if (!keptSub) continue;

        const delLimits = await client.execute({
          sql: "SELECT id, name FROM limits WHERE subcategory_id = ?",
          args: [delSub.id as string],
        });
        const keptLimits = await client.execute({
          sql: "SELECT id, name FROM limits WHERE subcategory_id = ?",
          args: [keptSub.id as string],
        });

        for (const delLimit of delLimits.rows) {
          const keptLimit = keptLimits.rows.find(
            (l) => l.name === delLimit.name,
          );
          if (!keptLimit) continue;

          // Remap user_limits, skip if would create a duplicate (UNIQUE constraint)
          await client.execute({
            sql: `UPDATE user_limits SET limit_id = ?
                  WHERE limit_id = ?
                  AND NOT EXISTS (
                    SELECT 1 FROM user_limits ul2
                    WHERE ul2.user_id = user_limits.user_id
                    AND ul2.relationship_id = user_limits.relationship_id
                    AND ul2.limit_id = ?
                  )`,
            args: [
              keptLimit.id as string,
              delLimit.id as string,
              keptLimit.id as string,
            ],
          });
          // Remove any remaining references that couldn't be remapped
          await client.execute({
            sql: "DELETE FROM user_limits WHERE limit_id = ?",
            args: [delLimit.id as string],
          });
        }
      }

      // Delete duplicate limits, subcategories, and category
      await client.execute({
        sql: `DELETE FROM limits WHERE subcategory_id IN
              (SELECT id FROM limit_subcategories WHERE category_id = ?)`,
        args: [delCatId],
      });
      await client.execute({
        sql: "DELETE FROM limit_subcategories WHERE category_id = ?",
        args: [delCatId],
      });
      await client.execute({
        sql: "DELETE FROM limit_categories WHERE id = ?",
        args: [delCatId],
      });
    }
  }

  console.log("Duplicate seed data cleaned up successfully.");
}

if (require.main === module) {
  cleanupDuplicateSeeds().catch(console.error);
}
