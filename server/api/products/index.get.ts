import { prisma } from "../../utils/prisma";
import type { ComponentCategory } from '@prisma/client'
import { normalizeApiError } from "../../utils/apiError";
import { parsePage, parsePageSize } from "../../utils/queryParams";
import { resolveCatalogImageUrl } from "../../../shared/lib/catalogImageUrl";

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
function normalizeString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export default defineEventHandler(async (event) => {
  try {
    const query = getQuery(event);

    const categoryRaw = normalizeString(query.category);
    const manufacturer = normalizeString(query.manufacturer);
    const search = normalizeString(query.search);
    const sortRaw = normalizeString(query.sort);
    const page = parsePage(query.page);
    const pageSize = parsePageSize(query.pageSize, 12, 48);

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
      imageUrl: resolveCatalogImageUrl(item.imageUrl, item.sku, item.category),
    })),
    total,
    page,
    pageSize,
    categories: categoriesRaw.map((x) => x.category),
    manufacturers: manufacturersRaw.map((x) => x.manufacturer),
    };
  } catch (error) {
    normalizeApiError(error, "Не вдалося отримати список товарів");
  }
});
