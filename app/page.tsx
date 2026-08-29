"use client";
import { useEffect, useMemo, useState } from "react";

declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => { open(): void } } }
type Product={id:string;title:string;brand:string;category?:string;price:number;mrp:number;discountPercentage:number;score:number;stockStatus:string;sellerCount:number;description?:string};
type CartItem={product:Product;quantity:number};
const sid="demo-session", money=(value:number)=>`₹${Number(value||0).toLocaleString("en-IN")}`;
const api=(url:string,body?:unknown)=>fetch(url,{method:body?"POST":"GET",headers:body?{"content-type":"application/json"}:undefined,body:body?JSON.stringify(body):undefined}).then(r=>r.json());

function ProductImage({product}:{product:Product}){const [url,setUrl]=useState("");const [state,setState]=useState<"loading"|"missing">("loading");useEffect(()=>{let active=true;setUrl("");setState("loading");api(`/api/catalog/products/${product.id}/image`).then(data=>{if(!active)return;if(data.imageUrl)setUrl(data.imageUrl);else setState("missing")}).catch(()=>active&&setState("missing"));return()=>{active=false}},[product.id]);return url?<img src={url} alt={product.title} onError={()=>{setUrl("");setState("missing")}}/>:<span className="imageLookup">{state==="loading"?"Finding product photo…":"Image unavailable"}</span>}

function CartIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1.5" fill="currentColor"/>
      <circle cx="19" cy="21" r="1.5" fill="currentColor"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

export default function Home(){
 const [query,setQuery]=useState("I need a skincare product under ₹1,000 with a good discount."),[products,setProducts]=useState<Product[]>([]),[message,setMessage]=useState("Tell BuyFlow what you need and it will rank available catalog products."),[mode,setMode]=useState("AI shopping assistant"),[tab,setTab]=useState("shop"),[selected,setSelected]=useState<Product>(),[upsell,setUpsell]=useState<Product>(),[order,setOrder]=useState<any>(),[compare,setCompare]=useState<Product[]>([]),[audit,setAudit]=useState<any[]>([]),[metrics,setMetrics]=useState<any>(),[detail,setDetail]=useState<Product>(),[loading,setLoading]=useState(false),[cart,setCart]=useState<CartItem[]>([]),[cartReady,setCartReady]=useState(false),[processingOrder,setProcessingOrder]=useState(false);
 const cartTotal=useMemo(()=>cart.reduce((total,item)=>total+item.product.price*item.quantity,0),[cart]);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem("buyflow-cart")||"[]"))}catch{setCart([])}setCartReady(true)},[]);useEffect(()=>{if(cartReady)localStorage.setItem("buyflow-cart",JSON.stringify(cart))},[cart,cartReady]);
 const event=(eventType:string,description:string,metadata={})=>api("/api/audit/event",{sessionId:sid,eventType,description,metadata});
 async function search(next=query){if(!next.trim())return;setLoading(true);try{const data=await api("/api/agent",{message:next,sessionId:sid});setProducts(data.products||[]);setMode(data.mode||mode);setMessage(cleanReply(data.reply||""));setTab("shop")}finally{setLoading(false)}}
 async function select(product:Product){setSelected(product);setDetail(undefined);await event("PRODUCT_SELECTED",`Selected ${product.title}`,{productId:product.id,amount:product.price});const data=await api(`/api/catalog/products/${product.id}/complementary`);setUpsell(data.product);if(data.product)await event("UPSELL_SHOWN",`Complementary product shown: ${data.product.title}`,{productId:data.product.id});setMessage(data.product?"We found a complementary option from the same product domain.":"Product selected. Review it before purchase.")}
 function addToCart(product:Product){setCart(items=>{const existing=items.find(item=>item.product.id===product.id);return existing?items.map(item=>item.product.id===product.id?{...item,quantity:item.quantity+1}:item):[...items,{product,quantity:1}]});setMessage(`${product.title} is in your cart.`)}
 function updateCart(id:string,amount:number){setCart(items=>items.flatMap(item=>item.product.id!==id?[item]:item.quantity+amount>0?[{...item,quantity:item.quantity+amount}]:[]))}
 
 async function propose(includeUpsell:boolean){
  if(!selected || processingOrder) return;
  setProcessingOrder(true);
  try {
    if(upsell) await event(includeUpsell?"UPSELL_ACCEPTED":"UPSELL_REJECTED",includeUpsell?"User accepted complementary product.":"User declined complementary product.",{upsellProductId:upsell.id});
    const data=await api("/api/orders",{productId:selected.id,upsellProductId:includeUpsell?upsell?.id:undefined,sessionId:sid,idempotencyKey:`${sid}-${selected.id}-${Date.now()}`});
    if(data.error) return setMessage(data.error);
    setOrder(data);
    setUpsell(undefined);
    setMessage("Protected checkout is ready. Explicit approval is required before payment.");
    await event("APPROVAL_REQUESTED","Explicit approval requested before payment.",{orderId:data.id,amount:data.totalAmount});
  } catch(err: any) {
    setMessage(err.message || "Failed to create purchase proposal.");
  } finally {
    setProcessingOrder(false);
  }
 }

 async function approve(){
  if(!order || processingOrder) return;
  setProcessingOrder(true);
  try {
    const data=await api(`/api/orders/${order.id}/approve`,{sessionId:sid});
    if(data.error) return setMessage(data.error);
    setOrder(data);
    setMessage("Approval saved. Continue to secure payment when ready.");
  } catch(err: any) {
    setMessage(err.message || "Failed to approve order.");
  } finally {
    setProcessingOrder(false);
  }
 }

 async function pay(){
  if(!order || processingOrder) return;
  setProcessingOrder(true);
  try {
    const data=await api(`/api/orders/${order.id}/pay`,{sessionId:sid});
    if(data.error) return setMessage(data.error);
    const removePurchased=()=>setCart(items=>items.filter(item=>item.product.id!==selected?.id));
    if(data.demo){
      setOrder(data.order);
      removePurchased();
      setMessage("Demo payment complete. The purchased item was removed from your cart.");
      return;
    }
    if(!window.Razorpay){
      const script=document.createElement("script");
      script.src="https://checkout.razorpay.com/v1/checkout.js";
      await new Promise(resolve=>{script.onload=resolve;script.onerror=resolve;document.body.appendChild(script)});
    }
    if(!window.Razorpay){
      await api(`/api/orders/${order.id}/payment-failed`,{sessionId:sid});
      setMessage("Checkout could not load. No payment was recorded.");
      return;
    }
    await api(`/api/orders/${order.id}/checkout-opened`,{sessionId:sid});
    const checkout=data.checkout;
    new window.Razorpay({
      key:checkout.key,
      amount:checkout.amount,
      currency:checkout.currency,
      name:checkout.name,
      description:checkout.description,
      order_id:checkout.orderId,
      handler:async(response:any)=>{
        try {
          const verified=await api(`/api/orders/${order.id}/verify-payment`,{...response,sessionId:sid});
          setOrder(verified.order);
          if(verified.verified) removePurchased();
          setMessage(verified.verified?"Payment verified. The purchased item was removed from your cart.":verified.error);
        } catch(e:any) {
          setMessage("Payment verification encountered an issue.");
        }
      },
      modal:{
        ondismiss:async()=>{
          setOrder(await api(`/api/orders/${order.id}/payment-failed`,{sessionId:sid}));
          setMessage("Checkout dismissed. No payment was recorded.");
        }
      }
    }).open();
  } catch(err: any) {
    setMessage(err.message || "Payment process encountered an error.");
  } finally {
    setProcessingOrder(false);
  }
 }

 function resetOrder(){
  setOrder(undefined);
  setSelected(undefined);
  setUpsell(undefined);
  setMessage("Order completed. Ready for your next AI search or product selection.");
 }

 async function open(next:string){setTab(next);if(next==="audit")setAudit(await api("/api/audit"));if(next==="growth")setMetrics(await api("/api/dashboard"));if(next==="compare"&&compare.length){const data=await api(`/api/catalog/compare?ids=${compare.map(product=>product.id).join(",")}`);setCompare(data.products||[])}}
 const checkoutCart=async()=>{const first=cart[0];if(!first)return;await select(first.product);setTab("shop");setMessage(`Ready to securely check out ${first.product.title}. ${cart.length>1?"Remaining items stay safely in your cart.":""}`)};
 return <main><header><button className="brand" onClick={()=>open("shop")}>Buy<span>Flow</span><i>AI</i></button><div className="pill">● {mode}</div><nav>{[["shop","Shop"],["cart",`Cart${cart.length?` (${cart.length})`:""}`],["compare","Compare"],["audit","Audit"],["growth","Growth"]].map(([id,label])=><button className={tab===id?"navActive":""} key={id} onClick={()=>open(id)}>{label}</button>)}</nav></header>{tab==="cart"?<Cart items={cart} total={cartTotal} update={updateCart} checkout={checkoutCart}/>:tab==="compare"?<Comparison products={compare} select={select} addToCart={addToCart} setTab={setTab}/>:tab==="audit"?<Audit events={audit}/>:tab==="growth"?<Growth data={metrics}/>:<Shop query={query} setQuery={setQuery} search={search} loading={loading} message={message} products={products} selected={selected} compare={compare} setCompare={setCompare} select={select} addToCart={addToCart} detail={detail} setDetail={setDetail} upsell={upsell} propose={propose} order={order} approve={approve} pay={pay} processingOrder={processingOrder} resetOrder={resetOrder}/>}</main>;
}

function Shop(props: any) {
  const { query, setQuery, search, loading, message, products, selected, compare, setCompare, select, addToCart, detail, setDetail, upsell, propose, order, approve, pay, processingOrder, resetOrder } = props;
  const [addedId, setAddedId] = useState<string | null>(null);

  const handleAdded = (id: string) => {
    setAddedId(id);
    setTimeout(() => setAddedId(null), 1600);
  };

  return (
    <>
      <section className="hero">
        <p className="eyebrow">YOUR AI SHOPPING COPILOT</p>
        <h1>Find what fits.<br /><em>Buy with confidence.</em></h1>
        <p className="sub">Describe what you need. BuyFlow searches the catalog and explains every choice.</p>
        <div className="assistant">
          <div className="ask">
            <textarea value={query} onChange={e => setQuery(e.target.value)} />
            <button onClick={() => search()}>{loading ? "Searching…" : "Ask BuyFlow →"}</button>
          </div>
          <p className="reply">{message}</p>
        </div>
      </section>

      <section className="chips">
        {["Hair Care", "Skin Care", "Fragrance", "Bath & Shower", "Grocery", "Detergents"].map(category => (
          <button key={category} onClick={() => { setQuery(`Show me ${category} products`); search(`Show me ${category} products`); }}>
            {category} →
          </button>
        ))}
      </section>

      {selected && upsell && (
        <section className="recommendationSection">
          <div className="recommendationHeader">
            <span className="recommendationBadge">✦ AI RECOMMENDED ROUTINE BUNDLE</span>
            <h2>Pair your selection for maximum results</h2>
            <p>BuyFlow identified a complementary catalog match in <strong>{selected.category || "this domain"}</strong>.</p>
          </div>

          <div className="recommendationBundleGrid">
            <div className="bundleCard primaryBundleCard">
              <span className="bundleCardTag">Your Selection</span>
              <div className="bundleCardImage">
                <ProductImage product={selected} />
              </div>
              <div className="bundleCardDetails">
                <small>{selected.brand}</small>
                <h3>{selected.title}</h3>
                <div className="bundlePrice">
                  <b>{money(selected.price)}</b>
                  <s>{money(selected.mrp)}</s>
                </div>
              </div>
            </div>

            <div className="bundlePlusConnector">
              <span>+</span>
            </div>

            <div className="bundleCard upsellBundleCard">
              <span className="bundleCardTag recommendationTag">Recommended Add-on</span>
              <div className="bundleCardImage">
                <ProductImage product={upsell} />
              </div>
              <div className="bundleCardDetails">
                <small>{upsell.brand}</small>
                <h3>{upsell.title}</h3>
                <div className="bundlePrice">
                  <b>{money(upsell.price)}</b>
                  <s>{money(upsell.mrp)}</s>
                  <mark>{Math.round(upsell.discountPercentage)}% OFF</mark>
                </div>
              </div>
            </div>
          </div>

          <div className="recommendationFooter">
            <div className="bundleSummaryText">
              <div className="bundleTotalDisplay">
                <span>Combined Bundle Total:</span>
                <b>{money(selected.price + upsell.price)}</b>
              </div>
              <small>✓ Server verified · Stock confirmed · Never added automatically</small>
            </div>
            <div className="bundleActionGroup">
              <button className="bundleSkipBtn" disabled={processingOrder} onClick={() => propose(false)}>
                Just {selected.brand || "Main Item"}
              </button>
              <button className="primary bundleAddBtn" disabled={processingOrder} onClick={() => propose(true)}>
                {processingOrder ? "Creating Checkout…" : "Add Bundle & Proceed →"}
              </button>
            </div>
          </div>
        </section>
      )}

      {order && <Summary product={selected} order={order} approve={approve} pay={pay} resetOrder={resetOrder} processingOrder={processingOrder} />}

      <section className="results">
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">{products.length ? "PERSONALIZED RESULTS" : "START SHOPPING"}</p>
            <h2>{products.length ? "Recommendations, ranked for you" : "Ask BuyFlow anything"}</h2>
          </div>
          <span>{products.length ? `${products.length} matches` : "Try a natural-language search"}</span>
        </div>
        <div className="grid">
          {products.slice(0, 8).map((product: Product, index: number) => (
            <article className={`card visualCard ${selected?.id === product.id ? "selectedCard" : ""}`} key={product.id}>
              <div className="productImageWrapper">
                <button className="productImage" onClick={() => setDetail(product)}>
                  <ProductImage product={product} />
                  <small>{product.stockStatus}</small>
                </button>
                <button
                  className={`cartIconButton ${addedId === product.id ? "justAdded" : ""}`}
                  title="Add to cart"
                  aria-label="Add to cart"
                  onClick={(e) => {
                    e.stopPropagation();
                    addToCart(product);
                    handleAdded(product.id);
                  }}
                >
                  {addedId === product.id ? <CheckIcon /> : <CartIcon />}
                </button>
              </div>
              <div className="cardBody">
                <b className="rank">#{index + 1} {product.brand}</b>
                <button className="productTitle" onClick={() => setDetail(product)}>
                  <h3>{product.title}</h3>
                </button>
                <div className="price">
                  <b>{money(product.price)}</b>
                  <s>{money(product.mrp)}</s>
                  <mark>{Math.round(product.discountPercentage)}% off</mark>
                </div>
                <p>Available · {product.sellerCount || 1} seller{product.sellerCount === 1 ? "" : "s"}</p>
                <div className="cardActions">
                  <button
                    className={compare.some((p: Product) => p.id === product.id) ? "selectedAction" : ""}
                    onClick={() => setCompare((items: Product[]) => items.some(p => p.id === product.id) ? items.filter(p => p.id !== product.id) : items.length < 3 ? [...items, product] : items)}
                  >
                    {compare.some((p: Product) => p.id === product.id) ? "Comparing" : "Compare"}
                  </button>
                  <button className="buy" onClick={() => select(product)}>Buy now</button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      {detail && <ProductModal product={detail} close={() => setDetail(undefined)} add={() => addToCart(detail)} buy={() => select(detail)} />}
    </>
  );
}

function ProductModal({product,close,add,buy}:{product:Product;close:()=>void;add:()=>void;buy:()=>void}){
 return <div className="modal" onClick={close}><section onClick={e=>e.stopPropagation()}><button className="x" onClick={close}>×</button><div className="modalImage"><ProductImage product={product}/></div><div><p className="eyebrow">{product.brand} · {product.category}</p><h2>{product.title}</h2><div className="price"><b>{money(product.price)}</b><s>{money(product.mrp)}</s><mark>{Math.round(product.discountPercentage)}% off</mark></div><p>{product.description||"Product details from the merchant catalog."}</p><div className="modalActions"><button className="modalCart" onClick={add}><CartIcon/> Add to cart</button><button className="buy modalBuy" onClick={buy}>Buy now</button></div></div></section></div>
}

function Cart({items,total,update,checkout}:{items:CartItem[];total:number;update:(id:string,amount:number)=>void;checkout:()=>void}){return <section className="cartPage"><div className="tabHero"><div><p className="eyebrow">YOUR SHOPPING CART</p><h2>Ready when you are.</h2><p>Add products while you browse, then return here when your shopping is done.</p></div><span>{items.length} product{items.length===1?"":"s"}</span></div>{!items.length?<div className="cartEmpty"><span>🛍</span><h2>Your cart is waiting</h2><p>Discover products in AI Shop and add the ones you want to revisit.</p></div>:<div className="cartLayout"><div className="cartList">{items.map(({product,quantity})=><article className="cartItem" key={product.id}><div className="cartImage"><ProductImage product={product}/></div><div><p className="eyebrow">{product.brand}</p><h3>{product.title}</h3><b>{money(product.price)}</b></div><div className="quantity"><button onClick={()=>update(product.id,-1)}>−</button><span>{quantity}</span><button onClick={()=>update(product.id,1)}>+</button></div><strong>{money(product.price*quantity)}</strong></article>)}</div><aside className="cartSummary"><p className="eyebrow">ORDER SUMMARY</p><div><span>Products</span><b>{items.reduce((sum,item)=>sum+item.quantity,0)}</b></div><div><span>Cart total</span><b>{money(total)}</b></div><small>Each product is checked against price, availability, and the spending policy before secure payment.</small><button className="primary" onClick={checkout}>Checkout first item →</button><p className="cartNote">Cart checkout processes one protected product order at a time. Remaining items stay in your cart.</p></aside></div>}</section>}

function Summary({
  product,
  order,
  approve,
  pay,
  resetOrder,
  processingOrder
}: {
  product?: Product;
  order: any;
  approve: () => void;
  pay: () => void;
  resetOrder: () => void;
  processingOrder: boolean;
}) {
  const isPaid = order.status === "PAID";
  const isPending = order.status === "PENDING_APPROVAL";
  const isApproved = order.status === "APPROVED";

  return (
    <section className="purchaseCard">
      <div className="purchaseIcon">
        ✓
      </div>
      <div className="purchaseInfo">
        <p className="eyebrow">
          {isPaid ? "ORDER CONFIRMED & PAID" : "YOUR PROTECTED CHECKOUT"}
        </p>
        <h2>{product?.title || "Product Checkout"}</h2>
        <p>
          {isPaid
            ? `Price verified · Stock confirmed · Payment ID: ${order.razorpayPaymentId || `demo_${order.id.slice(-6)}`}`
            : "Price verified on server · Stock confirmed · Spending policy passed"}
        </p>
        <div className="purchaseMeta">
          <span>Total <b>{money(order.totalAmount)}</b></span>
          <span className={isPaid ? "paidStatus" : isPending ? "pending" : "ready"}>
            {isPaid ? "Paid ✓" : isPending ? "Approval required" : "Ready for payment"}
          </span>
        </div>
      </div>

      <div className="purchaseAction">
        {isPending ? (
          <button className="primary" disabled={processingOrder} onClick={approve}>
            {processingOrder ? "Approving Order…" : "Approve order →"}
          </button>
        ) : isApproved ? (
          <button className="primary" disabled={processingOrder} onClick={pay}>
            {processingOrder ? "Processing Payment…" : "Pay securely →"}
          </button>
        ) : isPaid ? (
          <button className="paidOptionBtn" title="Click to start a new search or order" onClick={resetOrder}>
            Paid ✓
          </button>
        ) : (
          <b>{order.status.replaceAll("_", " ")}</b>
        )}
        <small>
          {isPaid ? "Receipt logged in Activity & Decision log." : "No charge is made until Razorpay confirms payment."}
        </small>
      </div>
    </section>
  );
}

function Comparison({products, select, addToCart, setTab}:{products:Product[]; select:(p:Product)=>void; addToCart:(p:Product)=>void; setTab:(t:string)=>void}){
 const [addedId, setAddedId] = useState<string | null>(null);
 const handleAdded = (id: string) => {
   setAddedId(id);
   setTimeout(() => setAddedId(null), 1600);
 };
 if(!products.length)return <section className="panel emptyState compareEmpty"><span>↔</span><p className="eyebrow">PRODUCT COMPARISON</p><h2>Build your shortlist</h2><p>Select up to three products in AI Shop to compare price, savings, availability, seller signals, and match score.</p></section>;
 const low=Math.min(...products.map(p=>p.price)),best=Math.max(...products.map(p=>p.score));
 return <section className="comparison comparisonPolished"><div className="tabHero"><div><p className="eyebrow">PRODUCT COMPARISON</p><h2>Decide with clarity.</h2><p>Every highlight comes from trusted catalog data. Buy or add to cart directly from here.</p></div><span>{products.length} options</span></div><div className="grid">{products.map(product=><article className="card compareCard" key={product.id}><div className="compareTop"><b>{product.brand}</b><span>{product.category}</span></div><div className="compareImageHeader"><ProductImage product={product}/></div><div className="cardBody"><h3>{product.title}</h3><div className="comparePrice"><b>{money(product.price)}</b>{product.price===low&&<mark>LOWEST PRICE</mark>}</div><dl><div><dt>Discount</dt><dd>{product.discountPercentage}% off</dd></div><div><dt>Availability</dt><dd>{product.stockStatus}</dd></div><div><dt>Match score</dt><dd><strong>{product.score}</strong> {product.score===best&&<mark>BEST MATCH</mark>}</dd></div></dl><div className="compareActions"><button className={`compareCartBtn ${addedId===product.id?"justAdded":""}`} onClick={()=>{addToCart(product);handleAdded(product.id)}}>{addedId===product.id?<><CheckIcon/> Added</>:<><CartIcon/> Add to cart</>}</button><button className="buy compareBuyBtn" onClick={()=>{select(product);setTab("shop")}}>Buy now →</button></div></div></article>)}</div></section>
}

function Audit({events}:{events:any[]}){return <section className="audit auditPolished"><div className="tabHero"><div><p className="eyebrow">ACTIVITY & DECISION LOG</p><h2>Your shopping timeline.</h2><p>Catalog, approval, policy, and payment events are visible here.</p></div><span>{events.length} events</span></div><div className="timeline">{events.length?events.map((event,index)=><article key={event.id}><i>{index+1}</i><div><b>{event.eventType.replaceAll("_"," ")}</b><span>{event.description}</span></div><small>{new Date(event.timestamp).toLocaleString()}</small></article>):<p className="timelineEmpty">Your next search or order will begin the timeline.</p>}</div></section>}

function Growth({data}:{data:any}){const rows=data?Object.entries(data).filter(([key])=>key!=="label"):[];return <section className="growth growthPolished"><div className="tabHero"><div><p className="eyebrow">COMMERCE IMPACT</p><h2>Growth, with evidence.</h2><p>Metrics are derived from events and paid orders created after the reset.</p></div><span>Live metrics</span></div><div className="metricGrid">{rows.map(([key,value])=><article key={key}><small>{key.replaceAll(/([A-Z])/g," $1")}</small><b>{typeof value==="number"&&key.includes("Rate")?`${(value*100).toFixed(0)}%`:String(value)}</b><i>Event-derived metric</i></article>)}</div></section>}

function cleanReply(text:string){const value=text.split("|")[0].replace(/[*_`#]/g,"").trim();return value.length>260?`${value.slice(0,257)}…`:value||"I found matching catalog products."}

