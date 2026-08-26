import { db } from "../lib/db";
const sample=[
 ["demo-1","Skin Care","Nivea Soft Light Moisturising Cream","Nivea","100 ml",299,199,"Available",3],
 ["demo-2","Skin Care","Himalaya Nourishing Skin Cream","Himalaya","150 ml",250,155,"Available",2],
 ["demo-3","Skin Care","Vaseline Intensive Care Dry Skin Lotion","Vaseline","400 ml",499,349,"Available",5],
 ["demo-4","Hair Care","Dove Intense Repair Shampoo","Dove","340 ml",450,299,"Available",4],
 ["demo-5","Fragrance","Nivea Fresh Active Deodorant","Nivea","150 ml",275,189,"Available",2],
 ["demo-6","Grocery & Gourmet Foods","Patanjali Honey","Patanjali","500 g",350,280,"Available",1]
]; const n=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
async function main(){for(const [sourceUniqueId,category,title,brand,packSize,mrp,price,stockAvailability,sellerCount] of sample as any[]){await db.product.upsert({where:{sourceUniqueId},update:{},create:{sourceUniqueId,category,normalizedCategory:n(category),title,normalizedTitle:n(title),description:`Demo historical catalog listing for ${title}.`,brand,normalizedBrand:n(brand),packSize,mrp,price,stockAvailability,stockStatus:"AVAILABLE",sellerCount,discountPercentage:Number((((mrp-price)/mrp)*100).toFixed(2))}})}console.log(`Seeded ${sample.length} demo products.`)} main().finally(()=>db.$disconnect());
