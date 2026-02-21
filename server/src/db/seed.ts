import { sqlite } from "./connection";
import { v4 as uuid } from "uuid";

/**
 * Seed the database with limit categories, subcategories, and individual limits.
 * This data comes from the app specification.
 * Idempotent - checks if data already exists before inserting.
 */
function seed() {
  console.log("Seeding limit categories data...");

  // Check if data already exists
  const existing = sqlite
    .prepare("SELECT COUNT(*) as count FROM limit_categories")
    .get() as { count: number };
  if (existing.count > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  const insertCategory = sqlite.prepare(
    "INSERT INTO limit_categories (id, name, description, icon, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );
  const insertSubcategory = sqlite.prepare(
    "INSERT INTO limit_subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)"
  );
  const insertLimit = sqlite.prepare(
    "INSERT INTO limits (id, subcategory_id, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)"
  );

  const seedData = sqlite.transaction(() => {
    // Category 1: Contact professionnel
    const cat1 = uuid();
    insertCategory.run(cat1, "Contact professionnel", "Interactions dans un cadre professionnel respectueux", "\uD83E\uDD1D", null, 1);

    const sub1_1 = uuid();
    insertSubcategory.run(sub1_1, cat1, "Communication verbale", 1);
    insertLimit.run(uuid(), sub1_1, "Recevoir des compliments sur le travail", null, null, 1);
    insertLimit.run(uuid(), sub1_1, "Recevoir des compliments sur l'apparence (vestimentaire)", null, null, 2);
    insertLimit.run(uuid(), sub1_1, "Conversations personnelles l\u00E9g\u00E8res (weekend, vacances)", null, null, 3);
    insertLimit.run(uuid(), sub1_1, "Tutoiement", null, null, 4);

    const sub1_2 = uuid();
    insertSubcategory.run(sub1_2, cat1, "Contact physique professionnel", 2);
    insertLimit.run(uuid(), sub1_2, "Poign\u00E9e de main", null, null, 1);
    insertLimit.run(uuid(), sub1_2, "Tape amicale sur l'\u00E9paule", null, null, 2);
    insertLimit.run(uuid(), sub1_2, "Bise de salutation", null, null, 3);

    // Category 2: Contact amical
    const cat2 = uuid();
    insertCategory.run(cat2, "Contact amical", "Interactions amicales et chaleureuses", "\uD83D\uDE0A", null, 2);

    const sub2_1 = uuid();
    insertSubcategory.run(sub2_1, cat2, "Communication amicale", 1);
    insertLimit.run(uuid(), sub2_1, "Compliments personnels (personnalit\u00E9, qualit\u00E9s)", null, null, 1);
    insertLimit.run(uuid(), sub2_1, "Compliments sur l'apparence physique", null, null, 2);
    insertLimit.run(uuid(), sub2_1, "Messages personnels en dehors du contexte habituel", null, null, 3);
    insertLimit.run(uuid(), sub2_1, "Appels t\u00E9l\u00E9phoniques personnels", null, null, 4);
    insertLimit.run(uuid(), sub2_1, "Partage de confidences", null, null, 5);

    const sub2_2 = uuid();
    insertSubcategory.run(sub2_2, cat2, "Contact physique amical", 2);
    insertLimit.run(uuid(), sub2_2, "Accolade / c\u00E2lin amical", null, null, 1);
    insertLimit.run(uuid(), sub2_2, "Toucher le bras ou l'avant-bras", null, null, 2);
    insertLimit.run(uuid(), sub2_2, "Toucher le dos", null, null, 3);
    insertLimit.run(uuid(), sub2_2, "Toucher la main (tenir la main bri\u00E8vement)", null, null, 4);
    insertLimit.run(uuid(), sub2_2, "Bras autour des \u00E9paules", null, null, 5);

    const sub2_3 = uuid();
    insertSubcategory.run(sub2_3, cat2, "Activit\u00E9s sociales", 3);
    insertLimit.run(uuid(), sub2_3, "Sorties en duo (caf\u00E9, restaurant)", null, null, 1);
    insertLimit.run(uuid(), sub2_3, "Invitations \u00E0 des \u00E9v\u00E9nements sociaux", null, null, 2);
    insertLimit.run(uuid(), sub2_3, "Activit\u00E9s sportives ensemble", null, null, 3);

    // Category 3: Flirt et s\u00E9duction
    const cat3 = uuid();
    insertCategory.run(cat3, "Flirt et s\u00E9duction", "Interactions \u00E0 caract\u00E8re s\u00E9ducteur", "\uD83D\uDCAC", null, 3);

    const sub3_1 = uuid();
    insertSubcategory.run(sub3_1, cat3, "Flirt verbal", 1);
    insertLimit.run(uuid(), sub3_1, "Compliments suggestifs", null, null, 1);
    insertLimit.run(uuid(), sub3_1, "Taquineries \u00E0 caract\u00E8re s\u00E9ducteur", null, null, 2);
    insertLimit.run(uuid(), sub3_1, "Sous-entendus", null, null, 3);
    insertLimit.run(uuid(), sub3_1, "Messages flirteurs / emojis suggestifs", null, null, 4);

    const sub3_2 = uuid();
    insertSubcategory.run(sub3_2, cat3, "Langage corporel", 2);
    insertLimit.run(uuid(), sub3_2, "Regards prolong\u00E9s", null, null, 1);
    insertLimit.run(uuid(), sub3_2, "Proximit\u00E9 physique rapproch\u00E9e", null, null, 2);
    insertLimit.run(uuid(), sub3_2, "Toucher le visage (joue, menton)", null, null, 3);
    insertLimit.run(uuid(), sub3_2, "Toucher les cheveux", null, null, 4);
    insertLimit.run(uuid(), sub3_2, "Toucher la taille", null, null, 5);

    // Category 4: Contact rapproch\u00E9
    const cat4 = uuid();
    insertCategory.run(cat4, "Contact rapproch\u00E9", "Contacts physiques plus intimes", "\uD83E\uDD17", null, 4);

    const sub4_1 = uuid();
    insertSubcategory.run(sub4_1, cat4, "Gestes tendres", 1);
    insertLimit.run(uuid(), sub4_1, "Caresses sur le bras / la main", null, null, 1);
    insertLimit.run(uuid(), sub4_1, "Caresses dans le dos", null, null, 2);
    insertLimit.run(uuid(), sub4_1, "Caresses sur le visage", null, null, 3);
    insertLimit.run(uuid(), sub4_1, "C\u00E2lins prolong\u00E9s", null, null, 4);
    insertLimit.run(uuid(), sub4_1, "Se tenir la main", null, null, 5);

    const sub4_2 = uuid();
    insertSubcategory.run(sub4_2, cat4, "Contact plus intime", 2);
    insertLimit.run(uuid(), sub4_2, "Toucher les cuisses", null, null, 1);
    insertLimit.run(uuid(), sub4_2, "Toucher le cou / la nuque", null, null, 2);
    insertLimit.run(uuid(), sub4_2, "Massage des \u00E9paules", null, null, 3);
    insertLimit.run(uuid(), sub4_2, "Massage complet", null, null, 4);

    // Category 5: Intimit\u00E9
    const cat5 = uuid();
    insertCategory.run(cat5, "Intimit\u00E9", "Propositions et contacts intimes", "\uD83D\uDC95", null, 5);

    const sub5_1 = uuid();
    insertSubcategory.run(sub5_1, cat5, "Rapprochement intime", 1);
    insertLimit.run(uuid(), sub5_1, "Bisou sur la joue", null, null, 1);
    insertLimit.run(uuid(), sub5_1, "Bisou sur le front", null, null, 2);
    insertLimit.run(uuid(), sub5_1, "Baiser sur les l\u00E8vres", null, null, 3);
    insertLimit.run(uuid(), sub5_1, "Baiser prolong\u00E9", null, null, 4);

    const sub5_2 = uuid();
    insertSubcategory.run(sub5_2, cat5, "Propositions intimes", 2);
    insertLimit.run(uuid(), sub5_2, "Propositions de rendez-vous romantique", null, null, 1);
    insertLimit.run(uuid(), sub5_2, "D\u00E9clarations de sentiments", null, null, 2);
    insertLimit.run(uuid(), sub5_2, "Propositions de rapprochement physique intime", null, null, 3);
    insertLimit.run(uuid(), sub5_2, "Discussion ouverte sur les d\u00E9sirs et attentes", null, null, 4);
  });

  seedData();
  console.log("Seed data inserted successfully.");
}

seed();
