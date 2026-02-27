import { Router } from "express";
import { db } from "../db/connection";
import { limitCategories, limitSubcategories, limits } from "../db/schema";
import { eq, asc } from "drizzle-orm";

const router = Router();

/**
 * GET /api/limits/categories
 * Returns all limit categories with their subcategories and individual limits.
 * This is a public endpoint (no auth required) for browsing the limit structure.
 */
router.get("/limits/categories", async (req, res) => {
  try {
    console.log(
      "[DB Query] SELECT * FROM limit_categories ORDER BY sort_order ASC",
    );
    const categories = await db
      .select()
      .from(limitCategories)
      .orderBy(asc(limitCategories.sortOrder));

    console.log(`[DB Query] Found ${categories.length} categories`);

    // For each category, fetch subcategories and their limits
    const result = await Promise.all(
      categories.map(async (category) => {
        console.log(
          `[DB Query] SELECT * FROM limit_subcategories WHERE category_id = '${category.id}'`,
        );
        const subcategories = await db
          .select()
          .from(limitSubcategories)
          .where(eq(limitSubcategories.categoryId, category.id))
          .orderBy(asc(limitSubcategories.sortOrder));

        const subcategoriesWithLimits = await Promise.all(
          subcategories.map(async (subcategory) => {
            console.log(
              `[DB Query] SELECT * FROM limits WHERE subcategory_id = '${subcategory.id}'`,
            );
            const subcategoryLimits = await db
              .select()
              .from(limits)
              .where(eq(limits.subcategoryId, subcategory.id))
              .orderBy(asc(limits.sortOrder));

            return {
              ...subcategory,
              limits: subcategoryLimits,
            };
          }),
        );

        return {
          ...category,
          subcategories: subcategoriesWithLimits,
        };
      }),
    );

    res.json({
      success: true,
      data: result,
      count: categories.length,
    });
  } catch (error) {
    console.error("[DB Error] Failed to fetch limit categories:", error);
    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des catégories de limites.",
    });
  }
});

export default router;
