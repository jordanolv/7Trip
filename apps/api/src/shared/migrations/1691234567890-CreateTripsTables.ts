import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTripsTables1691234567890 implements MigrationInterface {
  name = 'CreateTripsTables1691234567890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create categories table
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "icon" character varying,
        "color" character varying,
        CONSTRAINT "UQ_categories_name" UNIQUE ("name"),
        CONSTRAINT "PK_categories" PRIMARY KEY ("id")
      )
    `);

    // Create trips table
    await queryRunner.query(`
      CREATE TABLE "trips" (
        "id" SERIAL NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "startDate" date NOT NULL,
        "endDate" date NOT NULL,
        "createdBy" integer NOT NULL,
        "isPublic" boolean NOT NULL DEFAULT false,
        "coverImage" character varying,
        "status" character varying NOT NULL DEFAULT 'draft',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_trips" PRIMARY KEY ("id")
      )
    `);

    // Create trip_members table
    await queryRunner.query(`
      CREATE TABLE "trip_members" (
        "id" SERIAL NOT NULL,
        "tripId" integer NOT NULL,
        "userId" integer NOT NULL,
        "role" character varying NOT NULL DEFAULT 'viewer',
        "status" character varying NOT NULL DEFAULT 'pending',
        "invitedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "joinedAt" TIMESTAMP,
        CONSTRAINT "PK_trip_members" PRIMARY KEY ("id")
      )
    `);

    // Create days table
    await queryRunner.query(`
      CREATE TABLE "days" (
        "id" SERIAL NOT NULL,
        "tripId" integer NOT NULL,
        "date" date NOT NULL,
        "title" character varying NOT NULL,
        "order" integer NOT NULL,
        CONSTRAINT "PK_days" PRIMARY KEY ("id")
      )
    `);

    // Create activities table
    await queryRunner.query(`
      CREATE TABLE "activities" (
        "id" SERIAL NOT NULL,
        "dayId" integer NOT NULL,
        "title" character varying NOT NULL,
        "description" text,
        "address" character varying,
        "latitude" numeric(10,8),
        "longitude" numeric(11,8),
        "startTime" time,
        "endTime" time,
        "categoryId" integer NOT NULL,
        "order" integer NOT NULL,
        "notes" text,
        "cost" numeric(10,2),
        "bookingUrl" character varying,
        CONSTRAINT "PK_activities" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "trips" 
      ADD CONSTRAINT "FK_trips_createdBy" 
      FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "trip_members" 
      ADD CONSTRAINT "FK_trip_members_tripId" 
      FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "trip_members" 
      ADD CONSTRAINT "FK_trip_members_userId" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "days" 
      ADD CONSTRAINT "FK_days_tripId" 
      FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "activities" 
      ADD CONSTRAINT "FK_activities_dayId" 
      FOREIGN KEY ("dayId") REFERENCES "days"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "activities" 
      ADD CONSTRAINT "FK_activities_categoryId" 
      FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // Insert default categories
    await queryRunner.query(`
      INSERT INTO "categories" ("name", "icon", "color") VALUES
      ('Restaurant', 'utensils', '#FF6B6B'),
      ('Hôtel', 'bed', '#4ECDC4'),
      ('Visite', 'map-marker-alt', '#45B7D1'),
      ('Transport', 'car', '#96CEB4'),
      ('Shopping', 'shopping-bag', '#FFEAA7'),
      ('Divertissement', 'music', '#DDA0DD')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraints
    await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_categoryId"`);
    await queryRunner.query(`ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_dayId"`);
    await queryRunner.query(`ALTER TABLE "days" DROP CONSTRAINT "FK_days_tripId"`);
    await queryRunner.query(`ALTER TABLE "trip_members" DROP CONSTRAINT "FK_trip_members_userId"`);
    await queryRunner.query(`ALTER TABLE "trip_members" DROP CONSTRAINT "FK_trip_members_tripId"`);
    await queryRunner.query(`ALTER TABLE "trips" DROP CONSTRAINT "FK_trips_createdBy"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "activities"`);
    await queryRunner.query(`DROP TABLE "days"`);
    await queryRunner.query(`DROP TABLE "trip_members"`);
    await queryRunner.query(`DROP TABLE "trips"`);
    await queryRunner.query(`DROP TABLE "categories"`);
  }
}
