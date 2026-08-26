import { db } from "./db";
export type Intent = { query?: string; category?: string; brand?: string; maxPrice?: number; stockOnly?: boolean; preference?: "cheapest" | "high_discount" | "best_value" };
const norm = (s = "") => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
export function parseIntent(input: string): Intent {
 const text=input.toLowerCase(); const amount=text.match(/(?:under|below|less than|₹|rs\.?)[\s]*([\d,]+)/i);
 const cats=["skin care","hair care","fragrance","bath shower","grocery","detergents dishwash"];
 const category=cats.find(c=>text.includes(c)) || (text.includes("skincare")||text.includes("moisturizer")||text.includes("dry skin")?"skin care":text.includes("shampoo")?"hair care":undefined);
 const known=["nivea","dove","loreal","maybelline","himalaya","vaseline","patanjali"];
 const brand=known.find(b=>text.includes(b));
 return {query: input, category, brand, maxPrice:amount?Number(amount[1].replace(/,/g,"")):undefined, stockOnly:true, preference:text.includes("cheapest")||text.includes("lowest price")?"cheapest":text.includes("discount")?"high_discount":text.includes("value")?"best_value":undefined};
}
export async function searchCatalog(intent: Intent) {
 const products=await db.product.findMany({where:{
  ...(intent.category?{normalizedCategory:{contains:norm(intent.category)}}:{}), ...(intent.brand?{normalizedBrand:{contains:norm(intent.brand)}}:{}), ...(intent.maxPrice?{price:{lte:intent.maxPrice}}:{}), ...(intent.stockOnly?{stockStatus:"AVAILABLE"}:{}),
  ...(intent.query?{OR:[{normalizedTitle:{contains:norm(intent.query).split(" ").filter(x=>x.length>3)[0]||""}},{description:{contains:intent.query.split(" ").filter(x=>x.length>4)[0]||""}}]}:{})
 },take:50});
 // Broadens a natural language search when it has no literal keyword match.
 const candidates=products.length?products:await db.product.findMany({where:{...(intent.category?{normalizedCategory:{contains:norm(intent.category)}}:{}),...(intent.brand?{normalizedBrand:{contains:norm(intent.brand)}}:{}),...(intent.maxPrice?{price:{lte:intent.maxPrice}}:{}),...(intent.stockOnly?{stockStatus:"AVAILABLE"}:{})},take:50});
 return rank(candidates, intent);
}
export function rank<T extends {price:number; mrp:number; discountPercentage:number; sellerCount:number; stockStatus:string; normalizedTitle:string}>(items:T[], intent:Intent): Array<T & {score:number;scoreComponents:{price:number;discount:number;relevance:number;availability:number;sellers:number}}> {
 const maxPrice=Math.max(...items.map(x=>x.price),1), maxDiscount=Math.max(...items.map(x=>x.discountPercentage),1), maxSellers=Math.max(...items.map(x=>x.sellerCount),1);
 return items.map(p=>{ const components={price:(maxPrice-p.price)/maxPrice,discount:p.discountPercentage/maxDiscount,relevance:intent.query&&p.normalizedTitle.includes(norm(intent.query).split(" ")[0])?1:0.7,availability:p.stockStatus==="AVAILABLE"?1:0,sellers:p.sellerCount/maxSellers};
  let score=.4*components.price+.25*components.discount+.2*components.relevance+.1*components.availability+.05*components.sellers;
  if(intent.preference==="cheapest")score+=components.price*.35; if(intent.preference==="high_discount")score+=components.discount*.35; if(intent.preference==="best_value")score+=(components.price+components.discount)/4;
  return {...p,score:Number(score.toFixed(3)),scoreComponents:components}; }).sort((a,b)=>b.score-a.score);
}
