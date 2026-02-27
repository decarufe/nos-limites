import { client } from "./connection";
import { v5 as uuidv5 } from "uuid";

// Fixed namespace for deterministic seed IDs — prevents duplicate inserts
// when multiple serverless instances cold-start concurrently.
const SEED_NS = "f47ac10b-58cc-4372-a567-0d02b2c3d479";

function deterministicId(path: string): string {
  return uuidv5(path, SEED_NS);
}

/**
 * Seed the database with limit categories, subcategories, and individual limits.
 * This data comes from the app specification.
 * Uses deterministic IDs + INSERT OR IGNORE for true idempotency,
 * safe against concurrent execution in serverless environments.
 */
export async function seed() {
  console.log("Seeding limit categories data...");

  // Fast-path: skip if data already exists
  const existing = await client.execute(
    "SELECT COUNT(*) as count FROM limit_categories",
  );
  if (Number(existing.rows[0].count) > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  // Build all INSERT OR IGNORE statements for a single batch call
  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  // Context for deterministic ID generation
  let _catName = "";
  let _subName = "";

  function insertCategory(
    name: string,
    description: string,
    icon: string,
    imageUrl: string | null,
    sortOrder: number,
  ): string {
    _catName = name;
    const id = deterministicId(`cat:${name}`);
    statements.push({
      sql: "INSERT OR IGNORE INTO limit_categories (id, name, description, icon, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, name, description, icon, imageUrl, sortOrder],
    });
    return id;
  }

  function insertSubcategory(
    categoryId: string,
    name: string,
    sortOrder: number,
  ): string {
    _subName = name;
    const id = deterministicId(`sub:${_catName}/${name}`);
    statements.push({
      sql: "INSERT OR IGNORE INTO limit_subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)",
      args: [id, categoryId, name, sortOrder],
    });
    return id;
  }

  function insertLimit(subcategoryId: string, name: string, sortOrder: number) {
    const id = deterministicId(`lim:${_catName}/${_subName}/${name}`);
    statements.push({
      sql: "INSERT OR IGNORE INTO limits (id, subcategory_id, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, subcategoryId, name, null, null, sortOrder],
    });
  }

  // Category 1: Contact professionnel
  const cat1 = insertCategory(
    "Contact professionnel",
    "Interactions dans un cadre professionnel respectueux",
    "🤝",
    null,
    1,
  );

  const sub1_1 = insertSubcategory(cat1, "Communication verbale", 1);
  insertLimit(sub1_1, "Recevoir des compliments sur le travail", 1);
  insertLimit(
    sub1_1,
    "Recevoir des compliments sur l'apparence (vestimentaire)",
    2,
  );
  insertLimit(
    sub1_1,
    "Conversations personnelles légères (weekend, vacances)",
    3,
  );
  insertLimit(sub1_1, "Tutoiement", 4);

  const sub1_2 = insertSubcategory(cat1, "Contact physique professionnel", 2);
  insertLimit(sub1_2, "Poignée de main", 1);
  insertLimit(sub1_2, "Tape amicale sur l'épaule", 2);
  insertLimit(sub1_2, "Bise de salutation", 3);

  // Category 2: Contact amical
  const cat2 = insertCategory(
    "Contact amical",
    "Interactions amicales et chaleureuses",
    "😊",
    null,
    2,
  );

  const sub2_1 = insertSubcategory(cat2, "Communication amicale", 1);
  insertLimit(sub2_1, "Compliments personnels (personnalité, qualités)", 1);
  insertLimit(sub2_1, "Compliments sur l'apparence physique", 2);
  insertLimit(sub2_1, "Messages personnels en dehors du contexte habituel", 3);
  insertLimit(sub2_1, "Appels téléphoniques personnels", 4);
  insertLimit(sub2_1, "Partage de confidences", 5);

  const sub2_2 = insertSubcategory(cat2, "Contact physique amical", 2);
  insertLimit(sub2_2, "Accolade / câlin amical", 1);
  insertLimit(sub2_2, "Toucher le bras ou l'avant-bras", 2);
  insertLimit(sub2_2, "Toucher le dos", 3);
  insertLimit(sub2_2, "Toucher la main (tenir la main brièvement)", 4);
  insertLimit(sub2_2, "Bras autour des épaules", 5);

  const sub2_3 = insertSubcategory(cat2, "Activités sociales", 3);
  insertLimit(sub2_3, "Sorties en duo (café, restaurant)", 1);
  insertLimit(sub2_3, "Invitations à des événements sociaux", 2);
  insertLimit(sub2_3, "Activités sportives ensemble", 3);

  // Category 3: Flirt et séduction
  const cat3 = insertCategory(
    "Flirt et séduction",
    "Interactions à caractère séducteur",
    "💬",
    null,
    3,
  );

  const sub3_1 = insertSubcategory(cat3, "Flirt verbal", 1);
  insertLimit(sub3_1, "Compliments suggestifs", 1);
  insertLimit(sub3_1, "Taquineries à caractère séducteur", 2);
  insertLimit(sub3_1, "Sous-entendus", 3);
  insertLimit(sub3_1, "Messages flirteurs / emojis suggestifs", 4);

  const sub3_2 = insertSubcategory(cat3, "Langage corporel", 2);
  insertLimit(sub3_2, "Regards prolongés", 1);
  insertLimit(sub3_2, "Proximité physique rapprochée", 2);
  insertLimit(sub3_2, "Toucher le visage (joue, menton)", 3);
  insertLimit(sub3_2, "Toucher les cheveux", 4);
  insertLimit(sub3_2, "Toucher la taille", 5);

  // Category 4: Contact rapproché
  const cat4 = insertCategory(
    "Contact rapproché",
    "Contacts physiques plus intimes",
    "🤗",
    null,
    4,
  );

  const sub4_1 = insertSubcategory(cat4, "Gestes tendres", 1);
  insertLimit(sub4_1, "Caresses sur le bras / la main", 1);
  insertLimit(sub4_1, "Caresses dans le dos", 2);
  insertLimit(sub4_1, "Caresses sur le visage", 3);
  insertLimit(sub4_1, "Câlins prolongés", 4);
  insertLimit(sub4_1, "Se tenir la main", 5);

  const sub4_2 = insertSubcategory(cat4, "Contact plus intime", 2);
  insertLimit(sub4_2, "Toucher les cuisses", 1);
  insertLimit(sub4_2, "Toucher le cou / la nuque", 2);
  insertLimit(sub4_2, "Massage des épaules", 3);
  insertLimit(sub4_2, "Massage complet", 4);

  // Category 5: Intimité
  const cat5 = insertCategory(
    "Intimité",
    "Propositions et contacts intimes",
    "💕",
    null,
    5,
  );

  const sub5_1 = insertSubcategory(cat5, "Rapprochement intime", 1);
  insertLimit(sub5_1, "Bisou sur la joue", 1);
  insertLimit(sub5_1, "Bisou sur le front", 2);
  insertLimit(sub5_1, "Baiser sur les lèvres", 3);
  insertLimit(sub5_1, "Baiser prolongé", 4);

  const sub5_2 = insertSubcategory(cat5, "Propositions intimes", 2);
  insertLimit(sub5_2, "Propositions de rendez-vous romantique", 1);
  insertLimit(sub5_2, "Déclarations de sentiments", 2);
  insertLimit(sub5_2, "Propositions de rapprochement physique intime", 3);
  insertLimit(sub5_2, "Discussion ouverte sur les désirs et attentes", 4);

  await client.batch(statements, "write");
  console.log("Seed data inserted successfully.");
}

if (require.main === module) {
  seed().catch(console.error);
}
