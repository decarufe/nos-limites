import { client } from "./connection";
import { v4 as uuid } from "uuid";

/**
 * Seed the database with limit categories, subcategories, and individual limits.
 * This data comes from the app specification.
 * Idempotent - checks if data already exists before inserting.
 */
export async function seed() {
  console.log("Seeding limit categories data...");

  // Check if data already exists
  const existing = await client.execute(
    "SELECT COUNT(*) as count FROM limit_categories",
  );
  if (Number(existing.rows[0].count) > 0) {
    console.log("Seed data already exists, skipping.");
    return;
  }

  // Build all INSERT statements for a single batch call
  const statements: { sql: string; args: (string | number | null)[] }[] = [];

  function insertCategory(
    id: string,
    name: string,
    description: string,
    icon: string,
    imageUrl: string | null,
    sortOrder: number,
  ) {
    statements.push({
      sql: "INSERT INTO limit_categories (id, name, description, icon, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, name, description, icon, imageUrl, sortOrder],
    });
  }

  function insertSubcategory(
    id: string,
    categoryId: string,
    name: string,
    sortOrder: number,
  ) {
    statements.push({
      sql: "INSERT INTO limit_subcategories (id, category_id, name, sort_order) VALUES (?, ?, ?, ?)",
      args: [id, categoryId, name, sortOrder],
    });
  }

  function insertLimit(subcategoryId: string, name: string, sortOrder: number) {
    statements.push({
      sql: "INSERT INTO limits (id, subcategory_id, name, description, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?)",
      args: [uuid(), subcategoryId, name, null, null, sortOrder],
    });
  }

  // Category 1: Contact professionnel
  const cat1 = uuid();
  insertCategory(
    cat1,
    "Contact professionnel",
    "Interactions dans un cadre professionnel respectueux",
    "🤝",
    null,
    1,
  );

  const sub1_1 = uuid();
  insertSubcategory(sub1_1, cat1, "Communication verbale", 1);
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

  const sub1_2 = uuid();
  insertSubcategory(sub1_2, cat1, "Contact physique professionnel", 2);
  insertLimit(sub1_2, "Poignée de main", 1);
  insertLimit(sub1_2, "Tape amicale sur l'épaule", 2);
  insertLimit(sub1_2, "Bise de salutation", 3);

  // Category 2: Contact amical
  const cat2 = uuid();
  insertCategory(
    cat2,
    "Contact amical",
    "Interactions amicales et chaleureuses",
    "😊",
    null,
    2,
  );

  const sub2_1 = uuid();
  insertSubcategory(sub2_1, cat2, "Communication amicale", 1);
  insertLimit(sub2_1, "Compliments personnels (personnalité, qualités)", 1);
  insertLimit(sub2_1, "Compliments sur l'apparence physique", 2);
  insertLimit(sub2_1, "Messages personnels en dehors du contexte habituel", 3);
  insertLimit(sub2_1, "Appels téléphoniques personnels", 4);
  insertLimit(sub2_1, "Partage de confidences", 5);

  const sub2_2 = uuid();
  insertSubcategory(sub2_2, cat2, "Contact physique amical", 2);
  insertLimit(sub2_2, "Accolade / câlin amical", 1);
  insertLimit(sub2_2, "Toucher le bras ou l'avant-bras", 2);
  insertLimit(sub2_2, "Toucher le dos", 3);
  insertLimit(sub2_2, "Toucher la main (tenir la main brièvement)", 4);
  insertLimit(sub2_2, "Bras autour des épaules", 5);

  const sub2_3 = uuid();
  insertSubcategory(sub2_3, cat2, "Activités sociales", 3);
  insertLimit(sub2_3, "Sorties en duo (café, restaurant)", 1);
  insertLimit(sub2_3, "Invitations à des événements sociaux", 2);
  insertLimit(sub2_3, "Activités sportives ensemble", 3);

  // Category 3: Flirt et séduction
  const cat3 = uuid();
  insertCategory(
    cat3,
    "Flirt et séduction",
    "Interactions à caractère séducteur",
    "💬",
    null,
    3,
  );

  const sub3_1 = uuid();
  insertSubcategory(sub3_1, cat3, "Flirt verbal", 1);
  insertLimit(sub3_1, "Compliments suggestifs", 1);
  insertLimit(sub3_1, "Taquineries à caractère séducteur", 2);
  insertLimit(sub3_1, "Sous-entendus", 3);
  insertLimit(sub3_1, "Messages flirteurs / emojis suggestifs", 4);

  const sub3_2 = uuid();
  insertSubcategory(sub3_2, cat3, "Langage corporel", 2);
  insertLimit(sub3_2, "Regards prolongés", 1);
  insertLimit(sub3_2, "Proximité physique rapprochée", 2);
  insertLimit(sub3_2, "Toucher le visage (joue, menton)", 3);
  insertLimit(sub3_2, "Toucher les cheveux", 4);
  insertLimit(sub3_2, "Toucher la taille", 5);

  // Category 4: Contact rapproché
  const cat4 = uuid();
  insertCategory(
    cat4,
    "Contact rapproché",
    "Contacts physiques plus intimes",
    "🤗",
    null,
    4,
  );

  const sub4_1 = uuid();
  insertSubcategory(sub4_1, cat4, "Gestes tendres", 1);
  insertLimit(sub4_1, "Caresses sur le bras / la main", 1);
  insertLimit(sub4_1, "Caresses dans le dos", 2);
  insertLimit(sub4_1, "Caresses sur le visage", 3);
  insertLimit(sub4_1, "Câlins prolongés", 4);
  insertLimit(sub4_1, "Se tenir la main", 5);

  const sub4_2 = uuid();
  insertSubcategory(sub4_2, cat4, "Contact plus intime", 2);
  insertLimit(sub4_2, "Toucher les cuisses", 1);
  insertLimit(sub4_2, "Toucher le cou / la nuque", 2);
  insertLimit(sub4_2, "Massage des épaules", 3);
  insertLimit(sub4_2, "Massage complet", 4);

  // Category 5: Intimité
  const cat5 = uuid();
  insertCategory(
    cat5,
    "Intimité",
    "Propositions et contacts intimes",
    "💕",
    null,
    5,
  );

  const sub5_1 = uuid();
  insertSubcategory(sub5_1, cat5, "Rapprochement intime", 1);
  insertLimit(sub5_1, "Bisou sur la joue", 1);
  insertLimit(sub5_1, "Bisou sur le front", 2);
  insertLimit(sub5_1, "Baiser sur les lèvres", 3);
  insertLimit(sub5_1, "Baiser prolongé", 4);

  const sub5_2 = uuid();
  insertSubcategory(sub5_2, cat5, "Propositions intimes", 2);
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
