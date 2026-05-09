import { prisma } from "../../utils/prisma";
import type { ComponentCategory } from "../../../app/generated/prisma/enums";

const ALLOWED_SORTS = new Set([
  "newest",
  "price_asc",
  "price_desc",
  "stock_asc",
  "stock_desc",
  "name_asc",
]);
const ALLOWED_CATEGORIES = new Set([
  "DISTANCE_SENSOR",
  "CAMERA",
  "SERVO_DRIVE",
  "MANIPULATOR",
]);
const CATEGORY_IMAGE_MAP: Record<ComponentCategory, string> = {
  DISTANCE_SENSOR:
    "https://commons.wikimedia.org/wiki/Special:FilePath/HC_SR04_Ultrasonic_sensor_1480322_3_4_HDR_Enhancer.jpg",
  CAMERA:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Machine_Vision_System.jpg",
  SERVO_DRIVE:
    "https://commons.wikimedia.org/wiki/Special:FilePath/Servo_motor_drive.png",
  MANIPULATOR:
    "https://commons.wikimedia.org/wiki/Special:FilePath/FANUC_6-axis_welding_robots.jpg",
};

function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event);

  const categoryRaw = normalizeString(query.category);
  const manufacturer = normalizeString(query.manufacturer);
  const search = normalizeString(query.search);
  const sortRaw = normalizeString(query.sort);
  const page = Math.max(
    Number.parseInt(normalizeString(query.page) || "1", 10),
    1,
  );
  const pageSize = Math.min(
    Math.max(Number.parseInt(normalizeString(query.pageSize) || "12", 10), 1),
    48,
  );

  const category = ALLOWED_CATEGORIES.has(categoryRaw)
    ? (categoryRaw as ComponentCategory)
    : undefined;
  const sort = ALLOWED_SORTS.has(sortRaw) ? sortRaw : "newest";

  const where = {
    ...(category ? { category } : {}),
    ...(manufacturer ? { manufacturer } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const orderBy =
    sort === "price_asc"
      ? [{ unitPrice: "asc" as const }]
      : sort === "price_desc"
        ? [{ unitPrice: "desc" as const }]
        : sort === "stock_asc"
          ? [{ quantityOnHand: "asc" as const }]
          : sort === "stock_desc"
            ? [{ quantityOnHand: "desc" as const }]
            : sort === "name_asc"
              ? [{ name: "asc" as const }]
              : [{ createdAt: "desc" as const }];

  const [items, total, categoriesRaw, manufacturersRaw] = await Promise.all([
    prisma.component.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        manufacturer: true,
        description: true,
        imageUrl: true,
        unitPrice: true,
        minStockLevel: true,
        quantityOnHand: true,
      },
    }),
    prisma.component.count({ where }),
    prisma.component.findMany({
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
    prisma.component.findMany({
      distinct: ["manufacturer"],
      select: { manufacturer: true },
      orderBy: { manufacturer: "asc" },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      manufacturer: item.manufacturer,
      description: item.description,
      unitPrice: Number(item.unitPrice),
      minStockLevel: item.minStockLevel,
      currentStock: item.quantityOnHand,
      imageUrl: item.imageUrl,
    })),
    total,
    page,
    pageSize,
    categories: categoriesRaw.map((x) => x.category),
    manufacturers: manufacturersRaw.map((x) => x.manufacturer),
  };
});
