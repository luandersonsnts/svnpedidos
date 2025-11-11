import React, { useState, useContext, createContext, useEffect, useMemo, useRef } from 'react'
import { Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom'

// Contexto simples para cupom aplicado
const CouponContext = createContext({ coupon: null, setCoupon: () => {} })

// Contexto para dados do estabelecimento (nome, cidade, UF), com persistência
const EstablishmentContext = createContext({ establishment: null, setEstablishment: () => {} })
// Contexto de autenticação simples (persistido em localStorage)
const AuthContext = createContext({ auth: { loggedIn:false, phone:'', name:'', address:null, savedAddresses:[] }, setAuth: () => {} })
// Contexto de carrinho com persistência
const CartContext = createContext({ cart: [], setCart: () => {} })

const mockEstablishment = {
  id: 'mundodocen5',
  name: 'Mundo Doce - Bolos Caseiros',
  city: 'Petrolina',
  uf: 'PE',
  openMsg: 'Apenas agendamento • Abrimos amanhã às 07h00',
  coverImage: 'https://via.placeholder.com/1180x360.png?text=Mundo+Doce+-+Capa',
  avatarImage: 'https://via.placeholder.com/256.png?text=Mundo+Doce',
  instagram: '',
  phones: ['(74) 98121-3461'],
  addressLines: ['R. Quinze Lot Guararapes, 140', 'COHAB São Francisco, Petrolina - PE'],
  payments: ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Transferência'],
  deliveryCities: [
    { city: 'Petrolina', uf: 'PE', allowed: true, fee: 7.0 },
    { city: 'Juazeiro', uf: 'BA', allowed: true, fee: 10.0 }
  ],
  baseAddress: { street: '', number: '', neighborhood: '', city: 'Petrolina', uf: 'PE' },
  deliveryFeeTable: {
    bands: [
      { min: 0,   max: 2.0,  fee: 6.00 },
      { min: 2.1, max: 3.0,  fee: 7.00 },
      { min: 3.1, max: 4.0,  fee: 8.00 },
      { min: 4.1, max: 5.0,  fee: 9.00 },
      { min: 5.1, max: 6.0,  fee: 10.00 },
      { min: 6.1, max: 7.0,  fee: 11.00 },
      { min: 7.1, max: 8.0,  fee: 12.00 },
      { min: 8.1, max: 9.0,  fee: 13.00 },
      { min: 9.1, max: 10.0, fee: 14.00 },
      { min: 11.0, max: 11.0, fee: 15.00 },
      { min: 12.0, max: 12.0, fee: 16.00 },
      { min: 13.0, max: 13.0, fee: 17.00 },
      { min: 14.0, max: 14.0, fee: 18.00 },
    ],
    kmFees: {
      15: 25.00,
      16: 26.50,
      17: 28.00,
      18: 29.50,
      19: 31.00,
      20: 32.50,
      21: 34.00,
      22: 35.50,
      23: 37.00,
      24: 38.50,
      25: 40.00,
      26: 41.50,
      27: 43.00,
      28: 44.50,
      29: 46.00,
      30: 47.50
    },
    aboveKm: 40,
    perKmAbove: 2.50,
    baseFeeAtAboveKm: 72.50
  },
  hours: [
    { label: 'Segunda', value: '07:00 — 18:00' },
    { label: 'Terça', value: '07:00 — 18:00' },
    { label: 'Quarta', value: '07:00 — 18:00' },
    { label: 'Quinta', value: '07:00 — 18:00' },
    { label: 'Sexta', value: '07:00 — 18:00' },
    { label: 'Sábado', value: '07:00 — 12:00' },
    { label: 'Domingo', value: 'Fechado' },
  ]
}

const mockCategories = [
  { id:'bolos_caseiros', name:'Bolos Caseiros', image:'https://picsum.photos/seed/cat-bolos-caseiros/400/300' },
  { id:'bolos_vulcao', name:'Bolos Vulcão', image:'https://picsum.photos/seed/cat-bolos-vulcao/400/300' },
  { id:'bolos_festas', name:'Bolos para Festas', image:'https://picsum.photos/seed/cat-bolos-festas/400/300' },
  { id:'salgados', name:'Salgados', image:'https://picsum.photos/seed/cat-salgados/400/300' },
  { id:'bebidas', name:'Bebidas', image:'https://picsum.photos/seed/cat-bebidas/400/300' },
  { id:'doces', name:'Doces', image:'https://picsum.photos/seed/cat-doces/400/300' },
  { id:'picole', name:'Picolé', image:'https://picsum.photos/seed/cat-picole/400/300' },
  { id:'pipocas', name:'Pipocas', image:'https://picsum.photos/seed/cat-pipocas/400/300' },
]

const mockProducts = [
  // Bolos Caseiros
  { id:'bc-tradicional', name:'Tradicional', basePrice: 25.00, image:'https://picsum.photos/seed/bc-tradicional/800/600', category:'bolos_caseiros', available:true, descShort:'Bolo clássico fofinho', stockQty: 10, autoStockControl:true },
  { id:'bc-formigueiro', name:'Formigueiro', basePrice: 28.00, image:'https://picsum.photos/seed/bc-formigueiro/800/600', category:'bolos_caseiros', available:true, descShort:'Com granulado de chocolate', stockQty: 6, autoStockControl:true },
  { id:'bc-gotas-chocolate', name:'Gotas de Chocolate', basePrice: 30.00, image:'https://picsum.photos/seed/bc-gotas-chocolate/800/600', category:'bolos_caseiros', available:true, descShort:'Massa amanteigada com gotas', stockQty: 0, autoStockControl:true },
  { id:'bc-chocolate', name:'Chocolate', basePrice: 30.00, image:'https://picsum.photos/seed/bc-chocolate/800/600', category:'bolos_caseiros', available:true, descShort:'Intenso e úmido', stockQty: 4, autoStockControl:true, promoActive:true, promoPrice: 24.90 },
  { id:'bc-cafe', name:'Café', basePrice: 27.00, image:'https://picsum.photos/seed/bc-cafe/800/600', category:'bolos_caseiros', available:true, descShort:'Aromático com café especial', stockQty: 5, autoStockControl:true },
  { id:'bc-dois-amores', name:'Dois Amores', basePrice: 32.00, image:'https://picsum.photos/seed/bc-dois-amores/800/600', category:'bolos_caseiros', available:true, descShort:'Chocolate e baunilha', stockQty: 3, autoStockControl:true },
  { id:'bc-mesclado', name:'Mesclado', basePrice: 29.00, image:'https://picsum.photos/seed/bc-mesclado/800/600', category:'bolos_caseiros', available:true, descShort:'Marmorizado saboroso', stockQty: 2, autoStockControl:true },
  { id:'bc-milho', name:'Milho', basePrice: 26.00, image:'https://picsum.photos/seed/bc-milho/800/600', category:'bolos_caseiros', available:true, descShort:'Tradicional nordestino', stockQty: 12, autoStockControl:true },
  { id:'bc-leite', name:'Leite', basePrice: 25.00, image:'https://picsum.photos/seed/bc-leite/800/600', category:'bolos_caseiros', available:true, descShort:'Suave e cremoso', stockQty: 8, autoStockControl:true },
  { id:'bc-limao-siciliano', name:'Limão Siciliano', basePrice: 31.00, image:'https://picsum.photos/seed/bc-limao-siciliano/800/600', category:'bolos_caseiros', available:true, descShort:'Cítrico refrescante', stockQty: 7, autoStockControl:true },
  { id:'bc-cenoura-tradicional', name:'Cenoura Tradicional', basePrice: 28.00, image:'https://picsum.photos/seed/bc-cenoura-tradicional/800/600', category:'bolos_caseiros', available:true, descShort:'Clássico com cobertura', stockQty: 9, autoStockControl:true },
  { id:'bc-cenoura-granulado', name:'Cenoura Granulado', basePrice: 28.00, image:'https://picsum.photos/seed/bc-cenoura-granulado/800/600', category:'bolos_caseiros', available:true, descShort:'Crocante por cima', stockQty: 5, autoStockControl:true },
  { id:'bc-cenoura-mesclado', name:'Cenoura Mesclado', basePrice: 29.00, image:'https://picsum.photos/seed/bc-cenoura-mesclado/800/600', category:'bolos_caseiros', available:true, descShort:'Chocolate com cenoura', stockQty: 0, autoStockControl:true },

  // Bolos Vulcão (preparado para variações de sabor futuras)
  { id:'bv-mini', name:'Bolos Mini Vulcão', basePrice: 0.00, image:'https://picsum.photos/seed/bv-mini/800/600', category:'bolos_vulcao', available:true, descShort:'Mini vulcões deliciosos', stockQty: 10, autoStockControl:true, optionsGroup:{ id:'tamanho', name:'Tamanho', required:true, min:1, max:1, options:[{ id:'mini', name:'Mini', priceDelta:0 }] } },
  { id:'bv-m', name:'Bolos M Vulcão', basePrice: 0.00, image:'https://picsum.photos/seed/bv-m/800/600', category:'bolos_vulcao', available:true, descShort:'Tamanho médio', stockQty: 10, autoStockControl:true, optionsGroup:{ id:'tamanho', name:'Tamanho', required:true, min:1, max:1, options:[{ id:'m', name:'M', priceDelta:0 }] } },
  { id:'bv-g', name:'Bolos G Vulcão', basePrice: 0.00, image:'https://picsum.photos/seed/bv-g/800/600', category:'bolos_vulcao', available:true, descShort:'Tamanho grande', stockQty: 10, autoStockControl:true, optionsGroup:{ id:'tamanho', name:'Tamanho', required:true, min:1, max:1, options:[{ id:'g', name:'G', priceDelta:0 }] } },
]

function Home() {
  const [showInfo, setShowInfo] = useState(false)
  const [showCoupons, setShowCoupons] = useState(false)
  const [showCepModal, setShowCepModal] = useState(false)
  const { establishment } = useContext(EstablishmentContext)
  const { cart, setCart } = useContext(CartContext)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [showCats, setShowCats] = useState(false)
  const [showAvailableOnly, setShowAvailableOnly] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [priceSort, setPriceSort] = useState('none')
  const [modalProduct, setModalProduct] = useState(null)
  const [modalChoice, setModalChoice] = useState(null)
  const [modalQty, setModalQty] = useState(1)
  const [modalObs, setModalObs] = useState('')
  const [expandedCats, setExpandedCats] = useState({})
  const [refreshTick, setRefreshTick] = useState(0)
  const eid = getCurrentEstabId()
  let categoriesAvailability = {}
  try { categoriesAvailability = JSON.parse(localStorage.getItem(`categoriesAvailability_${eid}`)||'{}') } catch {}
  useEffect(()=>{ const id = setInterval(()=> setRefreshTick(t=>t+1), 30000); return ()=> clearInterval(id) }, [])
  const [apiCats, setApiCats] = useState(null)
  const [apiProds, setApiProds] = useState(null)
  const [estInactive, setEstInactive] = useState(false)
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const [estStatus, setEstStatus] = useState(null)
  useEffect(()=>{ fetch(`${apiBase}/api/establishment/${eid}/status`).then(r=> r.ok? r.json(): null).then(s=> setEstStatus(s)).catch(()=> setEstStatus(null)) }, [eid])
  // Listener global para abrir o modal de CEP a partir do Home
  useEffect(() => {
    const open = () => setShowCepModal(true)
    window.addEventListener('openCepModal', open)
    window.addEventListener('triggerCepModal', open)
    return () => {
      window.removeEventListener('openCepModal', open)
      window.removeEventListener('triggerCepModal', open)
    }
  }, [])
  useEffect(()=>{
    const load = async ()=>{
      try {
        const resp = await fetch(`${apiBase}/api/cardapio?establishment_id=${eid}`)
        if (!resp.ok) { setApiCats(null); setApiProds(null); setEstInactive(false); return }
        const json = await resp.json()
        if (json && json.inactive){ setEstInactive(true); setApiCats([]); setApiProds([]); return }
        const cats = Array.isArray(json.categories)? json.categories : []
        const grouped = json.productsByCategory || {}
        const catsUi = cats.map(c=> ({ id: c.id, name: c.name, image: c.image_url || `https://picsum.photos/seed/cat-${c.id}/400/300` }))
        const prodsUi = Object.keys(grouped).flatMap(catId => (grouped[catId]||[]).map(x=> ({
          id: x.id,
          name: x.name,
          basePrice: Number(x.base_price||0),
          image: x.image_url,
          category: x.category_id,
          status: x.status || 'active',
          available: !!x.available,
          descShort: x.desc_short || '',
          notes: x.notes || '',
          prepTimeMin: x.prep_time_min || undefined,
          stockQty: x.stock_qty || 0,
          autoStockControl: !!x.auto_stock_control,
          sku: x.sku || undefined,
          promoActive: !!x.promo_active,
          promoPrice: x.promo_price!=null? Number(x.promo_price): undefined,
        })))
        setApiCats(catsUi)
        setApiProds(prodsUi)
        setEstInactive(false)
      } catch(e){ setApiCats(null); setApiProds(null); setEstInactive(false) }
    }
    load()
  }, [eid, refreshTick])
  const addToCart = (p) => {
    const isSoldOut = (p.autoStockControl && (p.stockQty||0) <= 0)
    const isInactive = ((p.status||'active') !== 'active') || !p.available
    if (isSoldOut || isInactive){ try { showToast({ titulo:'Item indisponível', mensagem:'Este item está temporariamente indisponível.', tipo:'info' }) } catch(e){}; return }
    if (p.optionsGroup && p.optionsGroup.required) {
      setModalProduct(p)
      setModalChoice(null)
      return
    }
    const item = { id: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, image: p.image, choice: null, qty: 1, obs: '', unitPrice: p.promoActive? (p.promoPrice||p.basePrice) : p.basePrice }
    // Limite de estoque
    const inCartQty = cart.filter(i=> i.productId===p.id).reduce((s,i)=> s+i.qty, 0)
    if (p.autoStockControl && (inCartQty + 1) > (p.stockQty||0)) return
    setCart(prev => [...prev, item])
  }
  const confirmModalAdd = () => {
    const p = modalProduct
    if (!p) return
    const choiceName = modalChoice?.name || null
    const base = p.promoActive? (p.promoPrice||p.basePrice) : p.basePrice
    const delta = modalChoice?.priceDelta || 0
    const unit = base + delta
    const qty = Math.max(1, modalQty||1)
    const obs = (modalObs||'').trim()
    const item = { id: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, image: p.image, choice: choiceName, qty, obs, unitPrice: unit }
    const inCartQty = cart.filter(i=> i.productId===p.id).reduce((s,i)=> s+i.qty, 0)
    if (p.autoStockControl && (inCartQty + qty) > (p.stockQty||0)) { setModalProduct(null); setModalChoice(null); return }
    setCart(prev => [...prev, item]); setModalProduct(null); setModalChoice(null); setModalQty(1); setModalObs('')
  }
  const computeOpenStatus = () => {
    const hours = (establishment && establishment.hours) || (mockEstablishment && mockEstablishment.hours) || []
    const now = new Date()
    const idx = now.getDay() // 0 Dom ... 6 Sáb
    const labelsFull = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
    const todayLabel = labelsFull[idx]
    const todayEntry = (hours.find(h => h.label === todayLabel) || { value: '' }).value || ''
    const norm = todayEntry.replace(/\s+/g,' ').trim()
    const isClosed = /fechado/i.test(norm)
    const parseTime = (s) => { const [hh,mm] = s.split(':').map(x=>parseInt(x,10)); return hh*60+mm }
    const between = (s,e,c) => c>=s && c<=e
    let status = 'closed', label = 'Fechado hoje'
    if (!isClosed && norm.length>0){
      const segs = norm.split(',').map(s=> s.trim()).filter(Boolean)
      const cur = now.getHours()*60 + now.getMinutes()
      let matched = null
      for (const seg of segs){
        const m = seg.match(/^(\d{2}:\d{2})\s*[—-]\s*(\d{2}:\d{2})$/)
        if (!m) continue
        const s = parseTime(m[1]); const e = parseTime(m[2])
        if (between(s,e,cur)) { matched = seg; break }
      }
      if (matched){ status='open'; label = `Aberto agora • Hoje: ${matched}` } else { status='schedule'; label='Fora do horário • Apenas agendamento' }
    } else if (isClosed) {
      for (let i=1;i<=7;i++){
        const d = labelsFull[(idx+i)%7]
        const h = (hours.find(x=>x.label===d)||{ value:'' }).value || ''
        const n = h.replace(/\s+/g,' ').trim()
        if (!/fechado/i.test(n) && n.length>0){
          const firstSeg = (n.split(',')[0]||'').trim()
          const startStr = firstSeg.split(/—|-/)[0]?.trim() || ''
          label = `Fechado hoje • Abrimos ${i===1? 'amanhã' : `em ${i} dias`} às ${startStr}`
          break
        }
      }
    }
    return { status, label }
  }
  const categories = (Array.isArray(apiCats) && apiCats.length>0)? apiCats : (()=>{ try { const raw = localStorage.getItem(`categories_${eid}`); const list = raw? JSON.parse(raw): null; return Array.isArray(list)&&list.length>0? list : mockCategories } catch { return mockCategories } })()
  const productsSource = (Array.isArray(apiProds) && apiProds.length>0)? apiProds : (()=>{ try { const raw = localStorage.getItem(`products_${eid}`); const list = raw? JSON.parse(raw): null; return Array.isArray(list)&&list.length>0? list : mockProducts } catch { return mockProducts } })()
  const products = productsSource
    .filter(p => (!selectedCategory || p.category === selectedCategory))
    .filter(p => ((p.status || 'active') === 'active'))
    .filter(p => p.available)
    .filter(p => !categoriesAvailability[p.category])
    .filter(p => (searchQuery.trim()? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true))
    .sort((a,b)=> {
      // Promoções primeiro
      if ((a.promoActive?1:0) !== (b.promoActive?1:0)) return (b.promoActive?1:0) - (a.promoActive?1:0)
      // Ordem alfabética dentro da categoria
      if ((a.category||'') === (b.category||'')) return a.name.localeCompare(b.name)
      return 0
    })
    .sort((a,b)=> {
      if (priceSort==='asc') return (a.promoActive? (a.promoPrice||a.basePrice): a.basePrice) - (b.promoActive? (b.promoPrice||b.basePrice): b.basePrice)
      if (priceSort==='desc') return (b.promoActive? (b.promoPrice||b.basePrice): b.basePrice) - (a.promoActive? (a.promoPrice||a.basePrice): a.basePrice)
      return 0
    })
  const featured = productsSource.filter(p => p.available && !categoriesAvailability[p.category]).slice(0, 4)
  return (
    <>
      <div className="hero" style={{marginTop:12}}>
        <div className="hero-bg">
          <div className="hero-frame">
            <img
              className="estab-cover"
              src={(establishment && establishment.coverImage) || (mockEstablishment && mockEstablishment.coverImage)}
              alt="Capa do estabelecimento"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              onError={(e)=> { e.currentTarget.src = (mockEstablishment && mockEstablishment.coverImage) || e.currentTarget.src }}
            />
            <div className="hero-gradient" />
          </div>
        </div>
        <div className="hero-content mobile">
          <div className="avatar-card">
            <img
              className="avatar-img"
              src={(establishment && establishment.avatarImage) || (mockEstablishment && mockEstablishment.avatarImage)}
              alt="Logo"
              loading="eager"
              fetchpriority="high"
              decoding="async"
              onError={(e)=> { e.currentTarget.src = (mockEstablishment && mockEstablishment.avatarImage) || e.currentTarget.src }}
            />
          </div>
          <h1 className="hero-title" style={{marginTop:8}}>{(establishment && establishment.name) || (mockEstablishment && mockEstablishment.name) || 'Seu Estabelecimento'}</h1>
          <div className="hero-info" style={{marginTop:6}}>
            {(() => { const os = computeOpenStatus(); return (<span className={`open-badge status-${os.status}`}>{os.label}</span>) })()}
            <span className="hero-dot" />
            <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
              <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>
              {(establishment && establishment.city) || (mockEstablishment && mockEstablishment.city)} - {(establishment && establishment.uf) || (mockEstablishment && mockEstablishment.uf)}
            </span>
            <span className="hero-dot" />
            <button className="linklike" onClick={()=> setShowInfo(true)} style={{fontWeight:600}}>Mais informações</button>
          </div>
        </div>
        <div className="hero-content desktop">
          <div className="avatar-card" style={{width:96, height:96}}>
            <img
              className="avatar-img"
              src={(establishment && establishment.avatarImage) || (mockEstablishment && mockEstablishment.avatarImage)}
              alt="Logo"
              loading="eager"
              decoding="async"
              onError={(e)=> { e.currentTarget.src = (mockEstablishment && mockEstablishment.avatarImage) || e.currentTarget.src }}
            />
          </div>
          <div>
            <h1 className="hero-title">{(establishment && establishment.name) || (mockEstablishment && mockEstablishment.name) || 'Seu Estabelecimento'}</h1>
            <div className="hero-info" style={{marginTop:6}}>
              {(() => { const os = computeOpenStatus(); return (<span className={`open-badge status-${os.status}`}>{os.label}</span>) })()}
              <span className="hero-dot" />
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>
                {(establishment && establishment.city) || (mockEstablishment && mockEstablishment.city)} - {(establishment && establishment.uf) || (mockEstablishment && mockEstablishment.uf)}
              </span>
              <span className="hero-dot" />
              <button className="linklike" onClick={()=> setShowInfo(true)} style={{fontWeight:600}}>Mais informações</button>
            </div>
          </div>
        </div>
      </div>

      {/* Removido: barra redundante "Saiba mais" e abas internas */}

      <div className="container" style={{paddingTop:16}}>

      {estInactive && (
        <div className="section-card" style={{marginTop:12}}>
          <div style={{fontWeight:700}}>Estabelecimento temporariamente indisponível</div>
          <div className="muted" style={{marginTop:4}}>Entre em contato com a SVN PEDIDOS para regularizar</div>
        </div>
      )}

      {/* Layout em duas colunas: conteúdo principal + painel lateral (imagem de referência) */}
      <div className="feed-layout">
      <div className="feed-main">

      <div id="destaques" className="section-card" style={{marginTop:12}}>
        <div style={{fontWeight:700}}>DESTAQUES</div>
        <div className="grid products-grid" style={{marginTop:8}}>
          {featured.map(p => (
            <div key={p.id} className="card" onClick={()=> { setModalProduct(p); setModalChoice(null) }}>
              <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
              <div className="info">
                <div className="row product-header" style={{alignItems:'center'}}>
                  <div className="product-name">{p.name}</div>
                  {p.optionsGroup?.required ? (
                    <div className="price">A partir de R$ {(((p.promoActive ? (p.promoPrice || p.basePrice) : p.basePrice) + Math.min(...(p.optionsGroup.options || []).map(o => o.priceDelta || 0), 0)).toFixed(2))}</div>
                  ) : (
                    <div className="price">R$ {(p.promoActive ? (p.promoPrice || p.basePrice) : p.basePrice).toFixed(2)}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{marginTop:8}}>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <button className="btn btn-lg catlist-trigger" onClick={()=> setShowCats(v=>!v)}>LISTAR CATEGORIAS</button>
          {selectedCategory && <button className="btn outline btn-lg" onClick={()=> setSelectedCategory('')}>LIMPAR FILTRO</button>}
        </div>
        {showCats && (
          <div className="cats-dropdown" style={{marginTop:10}}>
            {categories.filter(cat => !categoriesAvailability[cat.id]).map(cat => (
              <div key={cat.id} className="cats-item" onClick={()=> { setSelectedCategory(cat.id); setShowCats(false) }}>
                <span>{cat.name}</span>
                <span>›</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Banner de cupons como na imagem (lado esquerdo, abaixo de destaques) */}
      <div id="categorias" className="section-card" style={{marginTop:12}}>
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div>
            <div style={{fontWeight:700}}>Que tal usar um cupom?</div>
            <div className="muted">2 disponíveis</div>
          </div>
          <button className="btn outline" onClick={()=> setShowCoupons(true)}>VER CUPONS</button>
        </div>
        {showCoupons && <CouponsModal onClose={()=> setShowCoupons(false)} />}
      </div>

      {/* Filtros e busca (Desktop somente) */}
      <div className="section-card desktop-only">
        <div className="row" style={{alignItems:'center'}}>
          {/* Campo de busca removido conforme solicitado */}
          <div className="field" style={{flex:1}}>
            <label className="muted">Ordenar por preço</label>
            <select value={priceSort} onChange={(e)=> setPriceSort(e.target.value)}>
              <option value="none">Padrão</option>
              <option value="asc">Menor → Maior</option>
              <option value="desc">Maior → Menor</option>
            </select>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <label className="muted">Mostrar apenas disponíveis</label>
            <input type="checkbox" checked={showAvailableOnly} onChange={(e)=> setShowAvailableOnly(e.target.checked)} />
          </div>
        </div>
      </div>

      {showInfo && <EstablishmentInfoModal onClose={()=> setShowInfo(false)} />}

      {/* Removido grid de categorias para usar somente o botão LISTAR CATEGORIAS */}

      <div id="itens" className="section-card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:700}}>Itens{selectedCategory? ` • ${categories.find(c=>c.id===selectedCategory)?.name||''}`:''}</div>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            {cart.length>0 && <Link to="/sacola" className="btn secondary">Ver sacola ({cart.length})</Link>}
          </div>
        </div>
        {(() => {
          const groupsMap = {}
          products.forEach(p => { (groupsMap[p.category] = groupsMap[p.category] || []).push(p) })
          const visibleCats = selectedCategory? [selectedCategory] : Object.keys(groupsMap)
          return visibleCats.map(catId => {
            const cat = categories.find(c=> c.id===catId)
            const items = (groupsMap[catId]||[])
            const expanded = expandedCats[catId] !== false // default expand
            const toggle = () => setExpandedCats(prev => ({ ...prev, [catId]: !expanded }))
            return (
              <div key={catId} style={{marginTop:8, borderTop:'1px solid #eee'}}>
                <div onClick={toggle} style={{display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', padding:'8px 0'}}>
                  <div style={{fontWeight:700}}>{cat?.name || catId}</div>
                  <div className="muted">{expanded? 'Recolher' : 'Expandir'}</div>
                </div>
                {expanded && (
                  <div className="grid products-grid" style={{marginTop:8}}>
                    {items.map(p => {
                      const isSoldOut = (p.autoStockControl && (p.stockQty||0) <= 0)
                      const priceCurrent = p.promoActive? (p.promoPrice||p.basePrice) : p.basePrice
                      return (
                        <div key={p.id} className={`card ${isSoldOut?'soldout':''}`} onClick={()=> { setModalProduct(p); setModalChoice(null); setModalQty(1); setModalObs('') }}>
                          <div style={{position:'relative'}}>
                            <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
                            <div className="labels">
                              {p.promoActive && <span className="badge red">Promoção</span>}
                              {isSoldOut && <span className="badge gray">Esgotado</span>}
                            </div>
                          </div>
                          <div className="info">
                            <div className="row product-header" style={{alignItems:'center'}}>
                              <div className="product-name">{p.name}</div>
                              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end'}}>
                                <div className="price-new">
                                  {p.optionsGroup?.required
                                    ? `A partir de R$ ${(priceCurrent + Math.min(...(p.optionsGroup.options || []).map(o => o.priceDelta || 0), 0)).toFixed(2)}`
                                    : `R$ ${priceCurrent.toFixed(2)}`}
                                </div>
                                {p.promoActive && (
                                  <div className="price-old">{`R$ ${(p.basePrice + (p.optionsGroup?.required ? Math.min(...(p.optionsGroup.options || []).map(o => o.priceDelta || 0), 0) : 0)).toFixed(2)}`}</div>
                                )}
                              </div>
                            </div>
                            {p.descShort && <div className="desc-short">{String(p.descShort).length>100? `${String(p.descShort).slice(0,100)}…` : p.descShort}</div>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        })()}
      
      {modalProduct && (
        <ProductModal
          product={modalProduct}
          choice={modalChoice}
          setChoice={setModalChoice}
          qty={modalQty}
          setQty={setModalQty}
          obs={modalObs}
          setObs={setModalObs}
          onConfirm={confirmModalAdd}
          onClose={()=> { setModalProduct(null); setModalChoice(null) }}
        />
      )}
      </div>

  </div>{/* /.feed-main */}

      {/* Painel lateral (direita) com Fidelidade e mini sacola */}
      <HomeAside onOpenCoupons={()=> setShowCoupons(true)} />

      </div>{/* /.feed-layout */}

      {showCepModal && <CepModal onClose={()=> setShowCepModal(false)} />}
      <Footer />
      <Tabs />
    </div>
    </>
  )
}
;
// Modal simples para escolha de variações (tamanhos)
function ProductModal({ product, choice, setChoice, qty, setQty, obs, setObs, onConfirm, onClose }){
  if (!product) return null
  const og = product.optionsGroup
  const currentPrice = (() => {
    const base = product.promoActive ? (product.promoPrice || product.basePrice) : product.basePrice
    const delta = choice?.priceDelta || 0
    return (base + delta)
  })()
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  // Se há apenas uma opção e é obrigatória, selecioná-la automaticamente
  useEffect(() => {
    const onlyOne = Array.isArray(og?.options) && og.options.length === 1
    if (og?.required && onlyOne && !choice) {
      try { setChoice(og.options[0]) } catch {}
    }
  }, [og, choice, setChoice])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e)=> e.stopPropagation()}>
        <div className="left">
          <img src={product.image} alt={product.name} />
        </div>
        <div className="right">
          <h3 style={{marginTop:0}}>{product.name}</h3>
          {product.descShort && <div className="muted" style={{marginBottom:8}}>{product.descShort}</div>}
          {og?.name && <div className="muted" style={{marginBottom:8}}>{og.name}</div>}
          {(og?.options||[]).map(opt => (
            <label key={opt.id} className="option">
              <input type="radio" name="choice" checked={choice?.id===opt.id} onChange={()=> setChoice(opt)} />
              <div style={{flex:1}}>{opt.name}</div>
              <div className="price">R$ {( (product.promoActive ? (product.promoPrice || product.basePrice) : product.basePrice) + (opt.priceDelta||0) ).toFixed(2)}</div>
            </label>
          ))}
          {/* Quantidade */}
          <div className="qty-control" style={{marginTop:8}}>
            <label className="muted" style={{minWidth:100}}>Quantidade</label>
            <div className="qty-box">
              <button type="button" className="qty-btn" onClick={()=> setQty(Math.max(1, (qty||1)-1))}>−</button>
              <input className="qty-input" aria-label="Quantidade" title="Selecione a quantidade" type="number" min={1} value={qty} onChange={(e)=> setQty(Math.max(1, parseInt(e.target.value||'1',10)||1))} />
              <button type="button" className="qty-btn" onClick={()=> setQty((qty||1)+1)}>+</button>
            </div>
          </div>
          {/* Observação do item */}
          <div className="field" style={{marginTop:8}}>
            <label className="muted">Alguma observação?</label>
            <textarea className="obs-field" placeholder="Ex.: Retirar o tomate" value={obs} onChange={(e)=> setObs(e.target.value)} rows={3} />
          </div>
          <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
            <div className="price" aria-label="Preço atual">R$ {currentPrice.toFixed(2)}</div>
          </div>
          <div className="btn-row" style={{marginTop:12}}>
            <button className="btn secondary" onClick={onClose}>Cancelar</button>
            <button className="btn" disabled={!!og?.required && !choice} onClick={onConfirm}>Adicionar</button>
          </div>
        </div>
      </div>
    </div>
  )
}
// ProductModal removido temporariamente para desbloquear o build

function CouponsModal({ onClose }){
  const { coupon, setCoupon } = useContext(CouponContext)
  const [code, setCode] = useState('')
  const available = [
    { id:'CUPOM5', label:'5% TERÇA E QUARTA', description:'Cupom disponível apenas terça e quarta.', type:'percent', value:5 },
    { id:'PRIMEIRA', label:'PRIMEIRO COMPRA', description:'Disponível apenas para novos clientes.', type:'shipping_free', value:0 }
  ]
  const applyCode = () => {
    const found = available.find(a => a.id.toLowerCase() === code.trim().toLowerCase())
    if (found) { setCoupon(found); onClose() }
  }
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple" onClick={(e)=> e.stopPropagation()}>
        <div className="row">
          <h3 style={{margin:0}}>Cupons</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="row" style={{gap:8, marginTop:8}}>
          <input placeholder="Código do cupom" value={code} onChange={(e)=> setCode(e.target.value)} />
          <button className="btn" onClick={applyCode}>ADICIONAR</button>
        </div>
        <div style={{marginTop:12, fontWeight:700}}>Cupons disponíveis</div>
        <div>
          {available.map(a => (
            <label key={a.id} className="option">
              <input type="radio" name="cupom" checked={coupon?.id===a.id} onChange={()=> setCoupon(a)} />
              <div style={{flex:1}}>
                <div style={{fontWeight:600}}>{a.label}</div>
                <div className="muted">{a.description}</div>
                {a.type==='percent' && <div className="muted">{a.value} %</div>}
                {a.type==='shipping_free' && <div className="muted">ENTREGA GRÁTIS</div>}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

function HomeAside({ onOpenCoupons }){
  const navigate = useNavigate()
  const { cart, setCart } = useContext(CartContext)
  const { coupon } = useContext(CouponContext)
  const { establishment } = useContext(EstablishmentContext)
  const { auth, setAuth } = useContext(AuthContext)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const discount = coupon ? (coupon.type==='percent' ? subtotal * (coupon.value/100) : coupon.value) : 0
  const deliveryFee = auth?.address ? (auth.address.fee ?? null) : null
  const total = subtotal - discount + (deliveryFee || 0)

  const computeEta = (addr) => {
    const km = addr?.distanceKm ?? null
    if (km == null) return '1h'
    if (km <= 2) return '30min'
    if (km <= 5) return '45min'
    if (km <= 8) return '1h'
    return '1h 15min'
  }

  const incQty = (id) => setCart(prev => prev.map(i => i.id===id ? { ...i, qty: i.qty + 1 } : i))
  const decQty = (id) => setCart(prev => prev.map(i => i.id===id ? { ...i, qty: Math.max(1, i.qty - 1) } : i))
  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))

  return (
    <aside className="feed-aside">
      <div className="section-card loyalty-card">
        <div style={{display:'flex', justifyContent:'flex-start', alignItems:'center', gap:8}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            {/* Ícone de presente simples */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <rect x="3" y="9" width="18" height="12" rx="3" stroke="#1f2937" strokeWidth="1.5"/>
              <path d="M3 12h18" stroke="#1f2937" strokeWidth="1.5"/>
              <path d="M12 9v12" stroke="#1f2937" strokeWidth="1.5"/>
              <path d="M8.5 6.5c0-1.38 1.12-2.5 2.5-2.5 1.1 0 2.04.7 2.38 1.68M15.5 6.5c0-1.38-1.12-2.5-2.5-2.5-.62 0-1.19.23-1.62.61" stroke="#1f2937" strokeWidth="1.5"/>
            </svg>
            <div style={{fontWeight:700}}>Programa de fidelidade</div>
          </div>
        </div>
        <div className="muted" style={{marginTop:6}}>A cada R$ 1,00 em compras você ganha 1 ponto que pode ser trocado por prêmios.</div>
        {auth?.loggedIn ? (
          <div style={{marginTop:6}}>Para participar do programa de fidelidade <a href="#" onClick={(e)=>{e.preventDefault(); navigate('/fidelidade')}}>clique aqui</a> e complete seu cadastro!</div>
        ) : (
          <div className="muted" style={{marginTop:6}}>Os novos clientes ganham automaticamente 10 pontos.</div>
        )}
      </div>

      <div className="section-card mini-cart">
        {/* Cabeçalho de entrega/endereço */}
        {!auth?.address ? (
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:8}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              {/* Ícone localização com interrogação */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 21s-7-6.2-7-11a7 7 0 1114 0c0 4.8-7 11-7 11z" stroke="#374151" strokeWidth="1.5"/>
                <text x="12" y="13" textAnchor="middle" fontSize="10" fill="#374151">?</text>
              </svg>
              <div style={{fontWeight:700}}>Calcular taxa e tempo de entrega</div>
            </div>
            <button className="btn outline btn-sm" onClick={()=> setShowDeliveryModal(true)} aria-label="Definir endereço">›</button>
          </div>
        ) : (
          <div>
            {auth?.deliveryType === 'retirada' ? (
              <>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  {/* Ícone de pessoa/retirada simples */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 6a3 3 0 110 6 3 3 0 010-6z" stroke="#111827" strokeWidth="1.5"/>
                    <path d="M6 20c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="#111827" strokeWidth="1.5"/>
                  </svg>
                  <div style={{fontWeight:700, color:'#111827', minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>Retirar no local</div>
                </div>
                <div className="muted" style={{marginTop:4, minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                  {auth.address.label ?? `${auth.address.street || ''}${auth.address.number ? ', ' + auth.address.number : ''}${auth.address.neighborhood ? ' - ' + auth.address.neighborhood : ''}${(auth.address.city || auth.address.uf) ? ` • ${[auth.address.city, auth.address.uf].filter(Boolean).join('/')}` : ''}`}
                </div>
              </>
            ) : (
              <>
                <div style={{display:'flex', alignItems:'center', gap:8}}>
                  {/* Ícone de moto simples */}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="6" cy="17" r="3" stroke="#111827" strokeWidth="1.5"/>
                    <circle cx="18" cy="17" r="3" stroke="#111827" strokeWidth="1.5"/>
                    <path d="M9 17h6l2-5h3" stroke="#111827" strokeWidth="1.5"/>
                    <path d="M8 12h4l-1.5-3H7" stroke="#111827" strokeWidth="1.5"/>
                  </svg>
                  <div style={{fontWeight:700, color:'#111827', minWidth:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis'}}>
                    {auth.address.label ?? `${auth.address.street}, ${auth.address.city}`}
                  </div>
                </div>
                <div className="muted" style={{marginTop:4}}>
                  Entrega em {computeEta(auth.address)} • {deliveryFee!=null? `R$ ${deliveryFee.toFixed(2)}` : '—'}
                </div>
              </>
            )}
          </div>
        )}

        {/* Conteúdo da sacola */}
        {cart.length===0 ? (
          <div style={{textAlign:'center', padding:'20px 0'}}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{opacity:.6}}>
              <path d="M6 8h12l-1 11a2 2 0 01-2 2H9a2 2 0 01-2-2L6 8z" stroke="#6b7280" strokeWidth="1.5"/>
              <path d="M9 8V6a3 3 0 016 0v2" stroke="#6b7280" strokeWidth="1.5"/>
            </svg>
            <div className="muted" style={{marginTop:6, fontSize:16}}>Sacola vazia</div>
          </div>
        ) : (
          <div className="mini-cart-items">
            {cart.map(item => (
              <div key={item.id} className="mini-cart-item">
                <img src={item.image} alt={item.name} loading="lazy" decoding="async" />
                <div className="info">
                  <div className="title">{item.name}</div>
                  <div className="muted">R$ {(item.unitPrice).toFixed(2)} • {item.qty}x</div>
                  <div className="row actions">
                    <button className="btn outline btn-sm" onClick={()=> decQty(item.id)}>-</button>
                    <button className="btn outline btn-sm" onClick={()=> incQty(item.id)}>+</button>
                    <button className="btn outline btn-sm" onClick={()=> removeItem(item.id)}>Remover</button>
                  </div>
                </div>
                <div className="price">R$ {(item.unitPrice * item.qty).toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
        {/* Removida duplicação da listagem de itens da sacola */}

        <div className="price-box" style={{marginTop:10}}>
          <div className="price-row"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
          <div className="price-row"><span>Desconto</span><span>{discount>0? `− R$ ${discount.toFixed(2)}` : 'R$ 0,00'}</span></div>
          <div className="price-row"><span>Taxa de entrega</span><span>{deliveryFee!=null? `R$ ${deliveryFee.toFixed(2)}` : '—'}</span></div>
          <div className="price-row total"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
        </div>

        {/* Cupom */}
        <div className="section-card" style={{marginTop:12, padding:12}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
            <div style={{display:'flex', alignItems:'center', gap:10}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7a3 3 0 013-3h10a3 3 0 013 3v3a2 2 0 11-2 2 2 2 0 112 2v3a3 3 0 01-3 3H7a3 3 0 01-3-3v-3a2 2 0 112-2 2 2 0 11-2-2V7z" stroke="#6b7280" strokeWidth="1.5"/>
              </svg>
              <div>
                <div style={{fontWeight:700}}>{coupon ? 'PRIMEIRO COMPRA' : 'Que tal usar um cupom?'}</div>
                <div className="muted">{coupon ? 'Cupom aplicado' : '2 disponíveis'}</div>
              </div>
            </div>
            <button className="btn outline btn-sm" onClick={onOpenCoupons}>›</button>
          </div>
        </div>

        <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
          <button className="btn outline" onClick={onOpenCoupons}>Usar cupom</button>
          <button className="btn" disabled={cart.length===0} onClick={()=> navigate('/sacola')}>Continuar pedido</button>
        </div>
        {showDeliveryModal && (
          <DeliveryOptionsModal
            onClose={()=> setShowDeliveryModal(false)}
            onSelected={(opt) => {
              if (opt === 'entrega') {
                setShowDeliveryModal(false)
                // Abre modal de CEP; ao concluir, marca tipo como entrega
                window.dispatchEvent(new CustomEvent('openCepModal', { detail: { onDone: (addr) => {
                  try { setAuth({ ...auth, deliveryType:'entrega', address: addr }) } catch {}
                } } }))
              } else if (opt === 'retirar') {
                setShowDeliveryModal(false)
                const b = (establishment && establishment.baseAddress) || {}
                const city = b.city || (establishment && establishment.city) || ''
                const uf = b.uf || (establishment && establishment.uf) || ''
                const streetLine = [b.street, b.number].filter(Boolean).join(', ')
                const neigh = b.neighborhood ? ` - ${b.neighborhood}` : ''
                const cityUf = (city || uf) ? ` • ${[city, uf].filter(Boolean).join('/')}` : ''
                const label = `${streetLine}${neigh}${cityUf}`
                const addr = {
                  street: b.street || '',
                  number: b.number || '',
                  neighborhood: b.neighborhood || '',
                  city,
                  uf,
                  label,
                  fee: 0,
                  distanceKm: 0
                }
                try { setAuth({ ...auth, deliveryType:'retirada', address: addr }) } catch {}
              } else if (opt === 'agendar') {
                setShowDeliveryModal(false)
                navigate('/entrega', { state: { option: 'agendar' } })
              }
            }}
          />
        )}
      </div>
    </aside>
  )
}

function PhoneStep() {
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const confirm = () => {
    if (!phone.trim()) return
    navigate('/entrega')
  }
  return (
    <div className="container">
      <h2>Informe seu telefone</h2>
      <div className="field" style={{maxWidth:420}}>
        <input placeholder="(99) 99999-9999" value={phone} onChange={(e)=> setPhone(e.target.value)} />
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={confirm}>Confirmar</button>
      </div>
      <Footer />
      <Tabs />
    </div>
  )
}

function DeliveryType() {
  const navigate = useNavigate()
  const location = useLocation()
  const { cart } = useContext(CartContext)
  const { auth, setAuth } = useContext(AuthContext)
  const initialType = (location?.state && location.state.option) || auth?.deliveryType || 'retirada'
  const [type, setType] = useState(() => initialType)
  useEffect(() => {
    if ((cart || []).length === 0) {
      navigate('/', { replace: true })
    }
  }, [cart, navigate])
  const onContinue = () => {
    try { setAuth({ ...auth, deliveryType: type }) } catch(e) {}
    if (type === 'entrega' && !auth?.address) {
      window.dispatchEvent(new CustomEvent('openCepModal', { detail: { onDone: () => navigate('/checkout') } }))
      return
    }
    navigate('/checkout')
  }
  return (
    <div className="container">
      <h2>Tipo de entrega</h2>
      <div className="field" style={{maxWidth:420}}>
        <select value={type} onChange={(e)=> setType(e.target.value)}>
          <option value="retirada">Retirada</option>
          <option value="entrega">Entrega</option>
          <option value="agendamento">Agendamento</option>
        </select>
      </div>
      <div style={{marginTop:12}}>
        <button className="btn btn-lg btn-block" onClick={onContinue}>Continuar</button>
      </div>
      <Footer />
      <Tabs />
    </div>
  )
}

function Sacola(){
  const { cart, setCart } = useContext(CartContext)
  const { coupon } = useContext(CouponContext)
  const { auth } = useContext(AuthContext)
  const navigate = useNavigate()
  const [showCoupons, setShowCoupons] = useState(false)
  const [showDeliveryModal, setShowDeliveryModal] = useState(false)
  const [showCepModal, setShowCepModal] = useState(false)

  useEffect(() => {
    const open = () => setShowCepModal(true)
    window.addEventListener('openCepModal', open)
    window.addEventListener('triggerCepModal', open)
    return () => {
      window.removeEventListener('openCepModal', open)
      window.removeEventListener('triggerCepModal', open)
    }
  }, [])
  const [editingId, setEditingId] = useState(null)
  const [tempQty, setTempQty] = useState(1)
  const [tempObs, setTempObs] = useState('')
  const productsMap = useMemo(() => {
    const src = getProductsLS() || mockProducts
    const m = {}
    ;(src||[]).forEach(p=> { m[p.id] = p })
    return m
  }, [])

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const discount = coupon ? (coupon.type==='percent' ? subtotal * (coupon.value/100) : coupon.value) : 0
  const deliveryFee = auth?.address ? (auth.address.fee ?? null) : null
  const total = subtotal - discount

  const removeItem = (id) => setCart(prev => prev.filter(i => i.id !== id))
  const startEdit = (item) => { setEditingId(item.id); setTempQty(item.qty); setTempObs(item.obs || '') }
  const applyEdit = () => {
    setCart(prev => prev.map(it => {
      if (it.id!==editingId) return it
      let nextQty = tempQty
      const prod = productsMap[it.productId]
      if (prod && prod.autoStockControl){
        const othersTotal = prev.filter(x=> x.productId===it.productId && x.id!==it.id).reduce((s,x)=> s + x.qty, 0)
        const maxAllowed = Math.max(1, (prod.stockQty||0) - othersTotal)
        nextQty = Math.min(nextQty, maxAllowed)
      }
      return { ...it, qty: nextQty, obs: tempObs }
    }))
    setEditingId(null)
  }
  const cancelEdit = () => setEditingId(null)
  const addSuggestion = (p) => { const item = { id: `${p.id}-${Date.now()}`, productId: p.id, name: p.name, image: p.image, choice: null, qty: 1, obs: '', unitPrice: p.basePrice }; setCart(prev => [...prev, item]) }

  const inCartIds = new Set(cart.map(i => i.productId))
  const suggestions = mockProducts.filter(p => !inCartIds.has(p.id)).slice(0,4)

  return (
    <div className="container">
      <div className="cart-page">
        <div className="row" style={{alignItems:'center'}}>
          <h2 style={{margin:0}}>Sua sacola</h2>
          {cart.length>0 && (
            <button className="btn outline" onClick={()=> setCart([])}>Esvaziar Carrinho</button>
          )}
        </div>
        {cart.length===0 ? (
          <div className="empty">Sua sacola está vazia. <button className="btn secondary btn-lg btn-block" onClick={()=> navigate('/')}>Adicionar mais itens</button></div>
        ) : (
          <div className="cart-body">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <img src={item.image} alt={item.name} />
                <div className="info">
                  <div className="row">
                    <div>
                      <div className="title">{item.name}</div>
                      {item.choice && <div className="muted">Opção: {item.choice}</div>}
                    </div>
                    <div className="price">R$ {(item.unitPrice * item.qty).toFixed(2)}</div>
                  </div>
                  {editingId===item.id ? (
                    <div className="edit-box">
                      <div className="qty">
                        <button className="btn secondary" onClick={()=> setTempQty(q=> Math.max(1, q-1))}>-</button>
                        <span>{tempQty}</span>
                        <button className="btn secondary" onClick={()=> setTempQty(q=> q+1)}>+</button>
                      </div>
                      <input className="input" value={tempObs} onChange={e=> setTempObs(e.target.value)} placeholder="Observação" />
                      <div className="btn-row">
                        <button className="btn btn-lg" onClick={applyEdit}>Aplicar</button>
                        <button className="btn secondary btn-lg" onClick={cancelEdit}>Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <div className="row actions">
                      <button className="btn secondary" onClick={()=> startEdit(item)}>Editar</button>
                      <button className="btn secondary" onClick={()=> removeItem(item.id)}>Remover</button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div className="row" style={{marginTop:8}}>
              <button className="btn secondary btn-lg btn-block" onClick={()=> navigate('/')}>Adicionar mais itens</button>
            </div>

            <div style={{marginTop:16}}>
              <div className="muted" style={{marginBottom:8}}>Peça também</div>
              <div className="suggestions">
                {suggestions.map(p => (
                  <div key={p.id} className="suggestion-card">
                    <img src={p.image} alt={p.name} />
                    <div className="name">{p.name}</div>
                    <button className="btn secondary" onClick={()=> addSuggestion(p)}>Adicionar</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="price-box">
              <div className="price-row"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
              <div className="price-row total"><span>TOTAL</span><span>R$ {total.toFixed(2)}</span></div>
            </div>

            <button className="btn cta-blink" onClick={()=> setShowCoupons(true)}>Que tal usar um cupom?</button>
            {showCoupons && <CouponsModal onClose={()=> setShowCoupons(false)} />}

            <div className="row" style={{marginTop:12}}>
              <button className="btn btn-lg btn-block" onClick={()=> setShowDeliveryModal(true)}>Continuar pedido</button>
            </div>
            {showDeliveryModal && (
              <DeliveryOptionsModal
                onClose={()=> setShowDeliveryModal(false)}
                onSelected={(opt) => {
                  if (opt === 'entrega') {
                    setShowDeliveryModal(false)
                    if (auth?.address) {
                      try { setAuth({ ...auth, deliveryType:'entrega' }) } catch {}
                      navigate('/checkout')
                    } else {
                      window.dispatchEvent(new CustomEvent('openCepModal', { detail: { onDone: (addr) => {
                        try { setAuth({ ...auth, deliveryType:'entrega', address: addr }) } catch {}
                        navigate('/checkout')
                      } } }))
                    }
                  } else if (opt === 'retirar') {
                    setShowDeliveryModal(false)
                    try { setAuth({ ...auth, deliveryType:'retirada' }) } catch {}
                    navigate('/checkout')
                  } else if (opt === 'agendar') {
                    setShowDeliveryModal(false)
                    navigate('/entrega', { state: { option: 'agendar' } })
                  }
                }}
              />
            )}
            {showCepModal && <CepModal onClose={()=> setShowCepModal(false)} />}
          </div>
        )}
        <Footer />
        <Tabs />
      </div>
    </div>
  )
}

function DeliveryOptionsModal({ onClose, onSelected }){
  const { auth } = useContext(AuthContext)
  const [selected, setSelected] = useState('')
  const navigate = useNavigate()
  const canContinue = !!selected
  useEffect(() => {
    const handler = (e) => {
      onClose()
      // dispara evento para abrir CepModal globalmente
      window.dispatchEvent(new CustomEvent('triggerCepModal', { detail: e.detail }))
    }
    window.addEventListener('openCepModal', handler)
    return () => window.removeEventListener('openCepModal', handler)
  }, [])
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=> e.stopPropagation()}>
        <div className="row">
          <h3 style={{margin:0}}>Como deseja receber?</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="options">
          <label className="option">
            <input type="radio" name="deliver" checked={selected==='entrega'} onChange={()=> setSelected('entrega')} />
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Receber no seu endereço</div>
              {auth?.address && <div className="muted">{auth.address.label ?? `${auth.address.street}, ${auth.address.city}`}</div>}
            </div>
          </label>
          <label className="option">
            <input type="radio" name="deliver" checked={selected==='retirar'} onChange={()=> setSelected('retirar')} />
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Retirar no estabelecimento</div>
            </div>
          </label>
          <label className="option">
            <input type="radio" name="deliver" checked={selected==='agendar'} onChange={()=> setSelected('agendar')} />
            <div style={{flex:1}}>
              <div style={{fontWeight:600}}>Agendar pedido</div>
            </div>
          </label>
        </div>
        <div className="btn-row" style={{marginTop:12}}>
          <button className="btn btn-lg" disabled={!canContinue} onClick={()=> {
            if (typeof onSelected === 'function') {
              onSelected(selected)
              return
            }
            if (selected==='entrega' && !auth?.address) {
              window.dispatchEvent(new CustomEvent('openCepModal', { detail: { onDone: () => navigate('/entrega', { state: { option: 'entrega' } }) } }))
            } else {
              onClose();
              navigate('/entrega', { state: { option: selected } })
            }
          }}>Continuar</button>
          <button className="btn secondary btn-lg" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function CepModal({ onClose }){
  const { establishment } = useContext(EstablishmentContext)
  const { auth, setAuth } = useContext(AuthContext)
  const [cep, setCep] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [number, setNumber] = useState('')
  const [complement, setComplement] = useState('')
  const [showSaved, setShowSaved] = useState(false)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  const formatCep = (v) => {
    const digits = v.replace(/\D/g, '').slice(0,8)
    if (digits.length <= 5) return digits
    return digits.slice(0,5) + '-' + digits.slice(5)
  }

  const buscarCep = async () => {
    setError('')
    const digits = cep.replace(/\D/g, '')
    if (digits.length !== 8) { setError('CEP inválido.'); return }
    setLoading(true)
    try {
      const resp = await fetch(`https://viacep.com.br/ws/${digits}/json/`)
      const data = await resp.json()
      if (data?.erro) { setError('CEP não encontrado.'); setResult(null); return }
      const city = (data.localidade || '').trim()
      const uf = (data.uf || '').trim()
      const normalize = (s) => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase()
      const allowed = (establishment?.deliveryCities || []).find(c => {
        const matchCity = normalize(c.city) === normalize(city)
        const matchUf = !c.uf || normalize(c.uf) === normalize(uf)
        return c.allowed && matchCity && matchUf
      })
      if (!allowed) {
        setError('No momento não entregamos na sua região.')
        setResult(null)
        return
      }
      setResult({ street: data.logradouro, neighborhood: data.bairro, city, uf, cep: formatCep(digits), fee: allowed.fee })
    } catch {
      setError('Falha ao consultar o CEP. Tente novamente.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  // --- Geocodificação e cálculo de distância ---
  const getBaseQuery = () => {
    const b = establishment?.baseAddress || {}
    const parts = [b.street, b.number, b.neighborhood, (b.city || establishment?.city), (b.uf || establishment?.uf)].filter(Boolean)
    return parts.join(', ')
  }
  const geocode = async (query) => {
    if (!query) return null
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`
      const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
      const json = await resp.json()
      if (!Array.isArray(json) || json.length === 0) return null
      return { lat: parseFloat(json[0].lat), lon: parseFloat(json[0].lon) }
    } catch {
      return null
    }
  }
  const toRad = (v) => v * Math.PI / 180
  const haversineKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = toRad(lat2 - lat1)
    const dLon = toRad(lon2 - lon1)
    const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }
  const getFeeByDistance = (km) => {
    const table = establishment?.deliveryFeeTable
    if (!table || !km || !isFinite(km)) return null
    for (const band of (table.bands || [])) {
      if (km >= band.min && km <= band.max) return band.fee
    }
    const ikm = Math.round(km)
    if (table.kmFees && table.kmFees[ikm] != null) return table.kmFees[ikm]
    // regra para acima de X km
    if (table.aboveKm != null && table.perKmAbove != null && ikm > table.aboveKm) {
      let baseFee = table.baseFeeAtAboveKm
      if (baseFee == null) {
        // tenta derivar base a partir do maior km conhecido
        const knownKms = Object.keys(table.kmFees || {}).map(n=> parseInt(n,10)).filter(n=> !isNaN(n)).sort((a,b)=> a-b)
        const maxKnown = knownKms.length ? knownKms[knownKms.length-1] : null
        if (maxKnown != null && table.kmFees[maxKnown] != null) {
          baseFee = table.kmFees[maxKnown] + (table.aboveKm - maxKnown) * table.perKmAbove
        }
      }
      if (baseFee != null) return baseFee + (ikm - table.aboveKm) * table.perKmAbove
    }
    return null
  }
  const computeDistanceAndFee = async (addr) => {
    const baseQuery = getBaseQuery()
    const deliverQuery = [addr.street, addr.number, addr.neighborhood, addr.city, addr.uf].filter(Boolean).join(', ')
    const base = await geocode(baseQuery)
    const dest = await geocode(deliverQuery)
    if (!base || !dest) return addr
    const km = haversineKm(base.lat, base.lon, dest.lat, dest.lon)
    const fee = getFeeByDistance(km)
    return { ...addr, distanceKm: Math.round(km * 10) / 10, fee }
  }

  const salvar = async () => {
    if (!result) { setError('Preencha seu endereço.'); return }
    if (!result.street?.trim()) { setError('Informe a rua.'); return }
    if (!number.trim()) { setError('Informe o número.'); return }
    if (!result.neighborhood?.trim()) { setError('Informe o bairro.'); return }
    if (!result.refPoint?.trim()) { setError('Informe um ponto de referência.'); return }
    if (!result.city?.trim() || !result.uf?.trim()) { setError('Informe cidade e estado.'); return }
    let addr = { ...result, number: number.trim(), complement: complement.trim(), label: `${result.street}, ${number} - ${result.neighborhood} • ${result.city}/${result.uf}`, fee: result.fee }
    addr = await computeDistanceAndFee(addr)
    const saved = Array.isArray(auth?.savedAddresses) ? auth.savedAddresses : []
    const nextSaved = [addr, ...saved].slice(0,3)
    setAuth({ ...auth, deliveryType:'entrega', address: addr, savedAddresses: nextSaved })
    onClose()
    const event = (window.lastCepModalDetail || {}).onDone
    if (typeof event === 'function') event(addr)
  }

  useEffect(() => {
    const handler = (e) => { window.lastCepModalDetail = e.detail }
    window.addEventListener('triggerCepModal', handler)
    return () => window.removeEventListener('triggerCepModal', handler)
  }, [])

  const savedList = Array.isArray(auth?.savedAddresses) ? auth.savedAddresses : []

  // Habilita o botão Confirmar somente quando todos os campos obrigatórios estão preenchidos
  const canConfirm = Boolean(
    result &&
    (result.street || '').trim() &&
    (number || '').trim() &&
    (result.neighborhood || '').trim() &&
    ((result.refPoint || '').trim()) &&
    (result.city || '').trim() &&
    (result.uf || '').trim()
  )
  

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple" onClick={e=> e.stopPropagation()}>
        <div className="row">
          <h3 style={{margin:0}}>Endereço de entrega</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="field" style={{maxWidth:360}}>
          <label className="muted">Informe seu CEP para verificarmos se entregamos em sua região</label>
          <input placeholder="00000-000" value={formatCep(cep)} onChange={e=> setCep(e.target.value)} />
        </div>
        <div style={{marginTop:10}}>
          <button className="btn btn-lg btn-block" onClick={buscarCep} disabled={loading}>{loading ? 'Buscando...' : 'Buscar CEP'}</button>
        </div>
        <div style={{marginTop:8}}>
          <a className="linklike" href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noopener noreferrer">Não sei meu CEP</a>
        </div>
        {error && <div className="muted" style={{color:'#ef4444', marginTop:8}}>{error}</div>}

        {result && (
          <div className="section-card" style={{marginTop:12}}>
            <div className="row">
              <h3 style={{margin:0}}>Endereço de entrega</h3>
            </div>
            <div className="row" style={{gap:12, marginTop:8}}>
              <div className="field" style={{flex:1}}>
                <label className="muted">Rua <span className="required">*</span></label>
                <input placeholder="Rua" value={result.street} onChange={e=> setResult({ ...result, street: e.target.value })} />
              </div>
              <div className="field" style={{width:120}}>
                <label className="muted">N° <span className="required">*</span></label>
                <input placeholder="Número" value={number} onChange={e=> setNumber(e.target.value)} />
              </div>
            </div>
            <div className="row" style={{gap:12, marginTop:8}}>
              <div className="field" style={{flex:1}}>
                <label className="muted">Bairro <span className="required">*</span></label>
                <input placeholder="Bairro" value={result.neighborhood} onChange={e=> setResult({ ...result, neighborhood: e.target.value })} />
              </div>
            </div>
            <div className="field" style={{marginTop:8}}>
              <label className="muted">Complemento</label>
              <input placeholder="Apto/Bloco/Casa" value={complement} onChange={e=> setComplement(e.target.value)} />
            </div>
            <div className="field" style={{marginTop:8}}>
              <label className="muted">Ponto de referência <span className="required">*</span></label>
              <input placeholder="Ex.: Próximo à praça" value={result.refPoint || ''} onChange={e=> setResult({ ...result, refPoint: e.target.value })} />
            </div>
            <div className="row" style={{gap:12, marginTop:8}}>
              <div className="field" style={{flex:1}}>
                <label className="muted">Cidade *</label>
                <input placeholder="Cidade" value={result.city} onChange={e=> setResult({ ...result, city: e.target.value })} />
              </div>
              <div className="field" style={{width:120}}>
                <label className="muted">Estado *</label>
                <input placeholder="UF" value={result.uf} onChange={e=> setResult({ ...result, uf: e.target.value.toUpperCase().slice(0,2) })} />
              </div>
            </div>
            <div className="btn-row" style={{marginTop:12}}>
              <button className="btn btn-lg" onClick={salvar} disabled={!canConfirm}>Confirmar</button>
              <button className="btn secondary btn-lg" onClick={onClose}>Voltar</button>
            </div>
          </div>
        )}

        <div className="section-card" style={{marginTop:12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Você possui endereços salvos</div>
          {savedList.length===0 ? (
            <div className="muted">Nenhum endereço salvo</div>
          ) : (
            <div className="menu-list">
              {savedList.map((a, idx) => (
                <button key={idx} className="linklike" onClick={()=> { setAuth({ ...auth, address: a }); onClose(); }}>
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Fluxo de login: telefone -> nome -> concluir
function LoginStep(){
  const navigate = useNavigate()
  const { setAuth } = useContext(AuthContext)
  const [phone, setPhone] = useState('')
  const digits = phone.replace(/\D/g, '')
  const phoneValid = digits.length >= 10

  // Máscara brasileira de telefone: (DD) 9XXXX-XXXX ou (DD) XXXX-XXXX
  const formatBRPhone = (onlyDigits) => {
    const d = (onlyDigits || '').slice(0, 11)
    const dd = d.slice(0, 2)
    if (d.length <= 2) return `(${dd}`
    if (d.length <= 6) return `(${dd}) ${d.slice(2)}`
    if (d.length <= 10) return `(${dd}) ${d.slice(2, 6)}-${d.slice(6)}`
    return `(${dd}) ${d.slice(2, 7)}-${d.slice(7, 11)}`
  }

  const onPhoneChange = (e) => {
    const onlyDigits = e.target.value.replace(/\D/g, '').slice(0, 11)
    setPhone(formatBRPhone(onlyDigits))
  }

  const confirmPhone = () => {
    if (!phoneValid) return
    setAuth({ loggedIn:true, phone })
    navigate('/')
  }
  return (
    <div className="container">
      <h2>Entrar</h2>
      <div className="muted">Use seu número associado ao cadastro.</div>
      <div className="field" style={{maxWidth:420, marginTop:8}}>
        <label className="muted">Telefone</label>
        <input placeholder="(__) _____-____" value={phone} onChange={onPhoneChange} inputMode="tel" autoComplete="tel" />
        {!phoneValid && phone && <div className="muted" style={{color:'#ef4444', marginTop:6}}>Número inválido. Informe com DDD.</div>}
      </div>
      <div style={{marginTop:12}}>
        <button className="btn btn-lg btn-block" disabled={!phoneValid} onClick={confirmPhone}>Continuar</button>
      </div>
      <div className="muted" style={{marginTop:8}}>O nome é coletado apenas no cadastro.</div>
      <Footer />
      <Tabs />
    </div>
  )
}

function Tabs(){
  const location = useLocation()
  const navigate = useNavigate()
  const [showAccount, setShowAccount] = useState(false)
  const { auth, setAuth } = useContext(AuthContext)
  const isActive = (path) => location.pathname === path
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const [loginPhone, setLoginPhone] = useState('')
  const loginDigits = loginPhone.replace(/\D/g, '')
  const validLogin = (loginDigits.length >= 10 || loginPhone.includes('@'))
  const submitLogin = () => {
    if (!validLogin) return
    setAuth({ loggedIn:true, phone: loginPhone, name: auth?.name })
    setShowAccount(false)
    setLoginPhone('')
  }

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)')
    const handler = () => setIsDesktop(mq.matches)
    mq.addEventListener?.('change', handler)
    window.addEventListener('resize', handler)
    return () => {
      mq.removeEventListener?.('change', handler)
      window.removeEventListener('resize', handler)
    }
  }, [])

  const handleLogout = () => {
    setShowAccount(false)
    setAuth({ loggedIn:false, phone:'', name:'' })
    navigate('/')
  }

  useEffect(() => {
    const onDocClick = (e) => {
      const dropdown = document.querySelector('.account-dropdown')
      const trigger = document.querySelector('.account-trigger')
      if (!dropdown || !trigger) return
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        setShowAccount(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  return (
    <nav className="tabs">
      <Link className={isActive('/')? 'active':''} to="/">
        <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10z"/></svg>
        <span>Início</span>
      </Link>
      <Link className={isActive('/promocoes')? 'active':''} to="/promocoes">
        <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l9 9-7 7-9-9V7z"/></svg>
        <span>Promoções</span>
      </Link>
      <Link className={isActive('/pedidos')? 'active':''} to="/pedidos">
        <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20l-2-2-2 2-2-2-2 2-2-2-2 2V2z"/></svg>
        <span>Pedidos</span>
      </Link>
      {isDesktop ? (
        auth?.loggedIn ? (
          <button className={`linklike account-trigger ${isActive('/perfil')? 'active':''}`} onClick={()=> setShowAccount(s=> !s)} style={{padding:'10px 0'}}>
            <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-9 10a9 9 0 1 1 18 0H3z"/></svg>
            <span>Minha conta{auth?.name ? ` (${auth.name})` : ''}</span><span className="caret">▾</span>
          </button>
        ) : (
          <button className="linklike account-trigger" onClick={()=> setShowAccount(s=> !s)} style={{padding:'10px 0'}}>
            <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V7a6 6 0 1 1 12 0v3h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2zm2 0h8V7a4 4 0 1 0-8 0v3z"/></svg>
            <span>Entrar/Cadastrar</span><span className="caret">▾</span>
          </button>
        )
      ) : (
        <button className={`linklike ${isActive('/perfil')? 'active':''}`} onClick={()=> navigate(auth?.loggedIn ? '/perfil' : '/entrar')} style={{padding:'10px 0'}}>
          <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-9 10a9 9 0 1 1 18 0H3z"/></svg>
          <span>Perfil</span>
        </button>
      )}

      {isDesktop && showAccount && (
        auth?.loggedIn ? (
          <div className="account-dropdown">
            <button className="linklike" onClick={()=> { setShowAccount(false); navigate('/perfil') }}>Editar perfil</button>
            <button className="linklike" onClick={()=> { setShowAccount(false); alert('Trocar senha em breve') }}>Trocar senha</button>
            <button className="linklike" onClick={()=> { setShowAccount(false); navigate('/fidelidade') }}>Programa de fidelidade</button>
            <button className="linklike" onClick={handleLogout}>Sair</button>
          </div>
        ) : (
          <div className="account-dropdown" style={{minWidth:280}}>
            <div style={{fontWeight:700, marginBottom:6}}>Entrar</div>
            <div className="field">
              <label className="muted">Celular ou e-mail</label>
              <input placeholder="Digite seu celular ou e-mail" value={loginPhone} onChange={(e)=> setLoginPhone(e.target.value)} />
            </div>
            <div style={{marginTop:10, display:'flex', gap:8}}>
              <button className="btn" disabled={!validLogin} onClick={submitLogin}>Continuar</button>
              <button className="linklike" onClick={()=> setShowAccount(false)}>Cancelar</button>
            </div>
            <div className="muted" style={{marginTop:8}}>O nome é solicitado apenas no cadastro.</div>
          </div>
        )
      )}
    </nav>
  )
}

function TopNav(){
  const location = useLocation()
  const navigate = useNavigate()
  // Ocultar barra de navegação nas rotas administrativas
  if (location.pathname.startsWith('/admin')) return null
  const [showAccount, setShowAccount] = useState(false)
  const { auth, setAuth } = useContext(AuthContext)
  const { establishment } = useContext(EstablishmentContext)
  const isActive = (path) => location.pathname === path
  const [loginPhone, setLoginPhone] = useState('')
  const loginDigits = loginPhone.replace(/\D/g, '')
  const validLogin = (loginDigits.length >= 10 || loginPhone.includes('@'))
  const submitLogin = () => {
    if (!validLogin) return
    setAuth({ loggedIn:true, phone: loginPhone, name: auth?.name })
    setShowAccount(false)
    setLoginPhone('')
  }

  useEffect(() => {
    const onDocClick = (e) => {
      const dropdown = document.querySelector('.account-dropdown')
      const trigger = document.querySelector('.account-trigger')
      if (!dropdown || !trigger) return
      if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
        setShowAccount(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [])

  const handleLogout = () => {
    setShowAccount(false)
    setAuth({ loggedIn:false, phone:'', name:'' })
    navigate('/')
  }

  return (
    <nav className="top-nav">
      <div className="nav-content">
        <div className="brand">
          <img
            className="brand-logo"
            src={(establishment && establishment.avatarImage) || (mockEstablishment && mockEstablishment.avatarImage)}
            alt="Logo"
            loading="eager"
            decoding="async"
            onError={(e)=> { e.currentTarget.src = (mockEstablishment && mockEstablishment.avatarImage) || e.currentTarget.src }}
          />
          <span className="brand-name">{(establishment && establishment.name) || 'Seu Estabelecimento'}</span>
        </div>
        <div className="nav-items">
          <Link className={`nav-item ${isActive('/')? 'active':''}`} to="/">
            <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10l9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1V10z"/></svg>
            <span>Início</span>
          </Link>
          <Link className={`nav-item ${isActive('/promocoes')? 'active':''}`} to="/promocoes">
            <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h5l9 9-7 7-9-9V7z"/></svg>
            <span>Promoções</span>
          </Link>
          <Link className={`nav-item ${isActive('/pedidos')? 'active':''}`} to="/pedidos">
            <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h12v20l-2-2-2 2-2-2-2 2-2-2-2 2V2z"/></svg>
            <span>Pedidos</span>
          </Link>
          {auth?.loggedIn ? (
            <button className={`nav-item account-trigger ${isActive('/perfil')? 'active':''}`} onClick={()=> setShowAccount(s=> !s)}>
              <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-9 10a9 9 0 1 1 18 0H3z"/></svg>
              <span>Minha conta{auth?.name ? ` (${auth.name})` : ''}</span><span className="caret">▾</span>
            </button>
          ) : (
            <button className="nav-item account-trigger" onClick={()=> setShowAccount(s=> !s)}>
              <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10V7a6 6 0 1 1 12 0v3h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2zm2 0h8V7a4 4 0 1 0-8 0v3z"/></svg>
              <span>Entrar/Cadastrar</span><span className="caret">▾</span>
            </button>
          )}
        </div>
      </div>

      {showAccount && (
        auth?.loggedIn ? (
          <div className="account-dropdown">
            <button className="linklike" onClick={()=> { setShowAccount(false); navigate('/perfil') }}>Editar perfil</button>
            <button className="linklike" onClick={()=> { setShowAccount(false); alert('Trocar senha em breve') }}>Trocar senha</button>
            <button className="linklike" onClick={()=> { setShowAccount(false); navigate('/fidelidade') }}>Programa de fidelidade</button>
            <button className="linklike" onClick={handleLogout}>Sair</button>
          </div>
        ) : (
          <div className="account-dropdown" style={{minWidth:300}}>
            <div style={{fontWeight:700, marginBottom:6}}>Entrar</div>
            <div className="field">
              <label className="muted">Celular ou e-mail</label>
              <input placeholder="Digite seu celular ou e-mail" value={loginPhone} onChange={(e)=> setLoginPhone(e.target.value)} />
            </div>
            <div style={{marginTop:10, display:'flex', gap:8}}>
              <button className="btn" disabled={!validLogin} onClick={submitLogin}>Continuar</button>
              <button className="linklike" onClick={()=> setShowAccount(false)}>Cancelar</button>
            </div>
            <div className="muted" style={{marginTop:8}}>O nome é solicitado apenas no cadastro.</div>
          </div>
        )
      )}
    </nav>
  )
}

function Checkout(){
  const navigate = useNavigate()
  const { cart, setCart } = useContext(CartContext)
  const { auth } = useContext(AuthContext)
  const { establishment } = useContext(EstablishmentContext)
  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const fee = auth?.address?.fee ?? 0
  const total = subtotal + fee

  const [paymentMethod, setPaymentMethod] = useState('Pix')
  const [stage, setStage] = useState('pagamento') // pagamento | confirmacao
  const [showAskChange, setShowAskChange] = useState(false)
  const [showChangeAmount, setShowChangeAmount] = useState(false)
  const [changeAmount, setChangeAmount] = useState('')
  const [orderNotes, setOrderNotes] = useState('')

  const parseAmount = (str) => {
    const digits = (str || '').replace(/\D/g,'')
    const cents = parseInt(digits || '0', 10)
    return (cents || 0) / 100
  }
  const formatBRL = (cents) => {
    const c = Math.max(0, parseInt(cents || 0, 10))
    const reais = Math.floor(c / 100)
    const cent = c % 100
    const reaisStr = reais.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    const centStr = cent.toString().padStart(2, '0')
    return `R$ ${reaisStr},${centStr}`
  }
  const handleChangeAmount = (e) => {
    const digits = e.target.value.replace(/\D/g,'')
    if (!digits) { setChangeAmount(''); return }
    const cents = parseInt(digits, 10)
    setChangeAmount(formatBRL(cents))
  }
  const changeValue = parseAmount(changeAmount)
  const canConfirmChange = changeValue >= total && changeValue > 0

  const selectMethod = (m) => {
    setPaymentMethod(m)
    if (m === 'Dinheiro') {
      setShowAskChange(true)
    }
  }

  const continueCheckout = () => {
    if (stage === 'pagamento') {
      setStage('confirmacao')
    } else {
      const order = {
        id: `${Date.now()}`,
        phone: auth?.phone || 'anon',
        name: auth?.name || '',
        items: cart.map(i=> ({ id:i.id, productId:i.productId, name:i.name, qty:i.qty, unitPrice:i.unitPrice, choice: i.choice || null, obs: i.obs || '' })),
        subtotal,
        fee,
        total,
        paymentMethod,
        notes: orderNotes || '',
        createdAt: new Date().toLocaleString('pt-BR'),
        status: 'Aguardando confirmação',
        address: auth?.address || {},
        history: [{ status: 'Aguardando confirmação', at: new Date().toLocaleString('pt-BR') }]
      }
      try {
        const eid = (establishment?.id) || 'tita'
        const key = `orders_${eid}`
        const prev = JSON.parse(localStorage.getItem(key) || '[]')
        prev.push(order)
        localStorage.setItem(key, JSON.stringify(prev))
        // Atualiza estoque automaticamente para produtos com controle ativo
        const src = getProductsLS() || mockProducts
        const next = (src || []).map(p => {
          const usedQty = cart.filter(i => i.productId === p.id).reduce((s, i) => s + (i.qty || 0), 0)
          if (p.autoStockControl) {
            const newQty = Math.max(0, (p.stockQty || 0) - usedQty)
            return { ...p, stockQty: newQty }
          }
          return p
        })
        setProductsLS(next)
      } catch(e) {}
      // Limpa a sacola após confirmar o pedido
      try { setCart([]) } catch(e) {}
      navigate('/sucesso')
    }
  }

  const paymentOptions = ['Pix', 'Dinheiro', 'Cartão de crédito', 'Cartão de débito', 'Transferência']

  return (
    <div className="container">
      <div className="row" style={{alignItems:'center'}}>
        <button className="close" onClick={()=> navigate('/sacola')}>×</button>
        <h2 style={{margin:0}}>Checkout</h2>
        <button className="linklike" onClick={()=> navigate('/sacola')} style={{marginLeft:'auto'}}>Editar sacola</button>
      </div>

      {/* Stepper visual */}
      <div className="section-card">
        <div className="stepper">
          <div className="steps">
            <button className="step active" onClick={()=> navigate('/entrega')}><span className="dot">✓</span><span>Entrega</span></button>
            <button className="step active" onClick={()=> navigate('/fidelidade')}><span className="dot">✓</span><span>Fidelidade</span></button>
            <button className={`step ${stage==='pagamento'?'active':''}`} onClick={()=> setStage('pagamento')}><span className="dot">✓</span><span>Pagamento</span></button>
            <button className={`step ${stage==='confirmacao'?'active':''}`} onClick={()=> setStage('confirmacao')}><span className="dot">✓</span><span>Confirmação</span></button>
          </div>
          <div className="track"><div className="bar" style={{width: stage==='confirmacao' ? '100%' : '75%'}} /></div>
        </div>
      </div>
      {stage==='pagamento' ? (
        <>
          <div className="section-card">
            <div style={{fontWeight:700}}>Pagar online</div>
            <div className="option" onClick={()=> selectMethod('Pix')} style={{borderRadius:10, border:'1px solid #eee', marginTop:8}}>
              <div style={{fontSize:18}}>⚡</div>
              <div style={{flex:1}}>Pix</div>
              <input type="checkbox" readOnly checked={paymentMethod==='Pix'} />
            </div>
          </div>

          <div className="section-card">
            <div style={{fontWeight:700}}>Pagar na entrega</div>
            {paymentOptions.filter(p=> p!=='Pix').map(p=> (
              <div key={p} className="option" onClick={()=> selectMethod(p)} style={{borderRadius:10, border:'1px solid #eee', marginTop:8}}>
                <div style={{fontSize:18}}>{p==='Dinheiro'?'💵':(p.includes('Cartão')?'💳':'🔁')}</div>
                <div style={{flex:1}}>{p}</div>
                <input type="checkbox" readOnly checked={paymentMethod===p} />
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="section-card" style={{textAlign:'center'}}>
            <div className="muted">Pedido agendado para</div>
            <div style={{fontWeight:800, fontSize:18}}>sexta, 07 de nov</div>
            <div style={{fontWeight:700}}>07:00 - 08:00</div>
          </div>

          <div className="section-card">
            <div style={{fontWeight:700, marginBottom:8}}>Informações para entrega</div>
            <div className="row" style={{justifyContent:'flex-start'}}>
              <div style={{width:24}}>👤</div>
              <div>
                <div style={{fontWeight:600}}>{auth?.name || 'Seu nome'}</div>
                <div className="muted">{auth?.phone || '(00) 00000-0000'}</div>
              </div>
            </div>
            <div className="row" style={{justifyContent:'flex-start', marginTop:8}}>
              <div style={{width:24}}>📍</div>
              <div>
                <div style={{fontWeight:600}}>{(auth?.address?.street || 'Rua')}, {(auth?.address?.number || '100')}</div>
                <div className="muted">{auth?.address?.neighborhood || 'Bairro'}, {(auth?.address?.city || 'Cidade')}</div>
                <div className="muted">{auth?.address?.complement || 'Casa'}</div>
                <div className="muted">{auth?.address?.reference || 'Praça'}</div>
              </div>
              <button className="linklike" onClick={()=> navigate('/entrega')}>Editar</button>
            </div>
          </div>

          <div className="section-card">
            {(cart || []).map(item => (
              <div key={item.id} className="row" style={{marginTop:8}}>
                <div>{item.qty}x {item.name}{item.choice? ` ${item.choice}`:''}</div>
                <div>R$ {(item.unitPrice * item.qty).toFixed(2)}</div>
              </div>
            ))}
            <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
              <div className="muted">Subtotal</div>
              <div>R$ {subtotal.toFixed(2)}</div>
            </div>
            <div className="row" style={{justifyContent:'space-between'}}>
              <div className="muted">Taxa de entrega</div>
              <div>R$ {fee.toFixed(2)}</div>
            </div>
            <div className="row" style={{justifyContent:'space-between', fontWeight:700}}>
              <div>Total</div>
              <div>R$ {total.toFixed(2)}</div>
            </div>
          </div>

      <div className="section-card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div style={{fontWeight:700}}>Pagamento</div>
          <button className="linklike" onClick={()=> setStage('pagamento')}>✏️</button>
        </div>
        <div className="row" style={{justifyContent:'flex-start', marginTop:8}}>
          <div style={{width:24}}>{paymentMethod==='Pix'?'⚡':'💵'}</div>
          <div>{paymentMethod}</div>
        </div>
      </div>

      <div className="section-card">
        <div style={{fontWeight:700, marginBottom:8}}>Alguma observação?</div>
        <div className="field">
          <label className="muted">Observações do pedido (opcional)</label>
          <textarea rows={3} placeholder="Ex: sem açúcar, deixar na portaria, ligar ao chegar" value={orderNotes} onChange={(e)=> setOrderNotes(e.target.value)} />
        </div>
      </div>
        </>
      )}

      <div className="muted" style={{textAlign:'center', marginTop:12}}>PAGAR COM DUAS FORMAS DE PAGAMENTO</div>

      <div style={{position:'fixed', left:0, right:0, bottom:68, padding:'0 16px'}}>
        <button className="btn btn-lg btn-block" onClick={continueCheckout}>{stage==='pagamento' ? 'Continuar' : 'Enviar pedido'}</button>
        <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
          <div className="muted">Subtotal</div>
          <div>R$ {subtotal.toFixed(2)}</div>
        </div>
        <div className="row" style={{justifyContent:'space-between'}}>
          <div className="muted">Taxa de entrega</div>
          <div>R$ {fee.toFixed(2)}</div>
        </div>
        <div className="row" style={{justifyContent:'space-between', fontWeight:700}}>
          <div>Total</div>
          <div>R$ {total.toFixed(2)}</div>
        </div>
      </div>

      {showAskChange && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal simple" style={{maxWidth:420}}>
            <div className="left" style={{gridColumn:'1 / -1'}}>
              <div style={{textAlign:'center'}}>
                <div className="muted">Você vai pagar R$ {total.toFixed(2)} em dinheiro</div>
                <h3 style={{marginTop:8}}>Vai precisar de troco?</h3>
              </div>
              <div className="btn-row" style={{marginTop:12}}>
                <button className="btn secondary btn-lg btn-block" onClick={()=> setShowAskChange(false)}>Não</button>
                <button className="btn btn-lg btn-block" onClick={()=> { setShowAskChange(false); setShowChangeAmount(true); }}>Sim</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showChangeAmount && (
        <div className="modal-backdrop" role="dialog" aria-modal="true">
          <div className="modal simple" style={{maxWidth:420}}>
            <div className="left" style={{gridColumn:'1 / -1'}}>
              <div style={{textAlign:'center'}}>
                <h3 style={{margin:0}}>Troco pra quanto?</h3>
                <div className="muted" style={{marginTop:8}}>Informe quanto você irá dar que calculamos o troco</div>
              </div>
              <div className="field" style={{marginTop:12}}>
                <label className="muted">Valor</label>
                <input placeholder="R$ 0,00" value={changeAmount} onChange={handleChangeAmount} inputMode="numeric" />
                {changeValue > 0 && changeValue < total && (
                  <div className="error-text">O valor informado é menor que o total (R$ {total.toFixed(2)}).</div>
                )}
                {canConfirmChange && (
                  <div className="muted" style={{marginTop:6}}>Troco: {formatBRL(Math.round((changeValue - total) * 100))}</div>
                )}
              </div>
              <div className="btn-row" style={{marginTop:12}}>
                <button className="btn secondary btn-lg btn-block" onClick={()=> setShowChangeAmount(false)}>Voltar</button>
                <button className="btn btn-lg btn-block" disabled={!canConfirmChange} onClick={()=> setShowChangeAmount(false)}>Confirmar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Promotions(){
  const promotions = [
    { id:'promo-bolo-macaxeira', productId:'bolo-macaxeira', name:'Bolo de macaxeira com tartalete', image:'https://picsum.photos/seed/bolo1/800/600', description:'Aproveite! Promoção por tempo limitado.', originalPrice: 35.0, promoPrice: 25.0 },
    { id:'promo-bolo-coco', productId:'bolo-coco', name:'Bolo de coco', image:'https://picsum.photos/seed/bolo2/800/600', description:'Tradicional e delicioso.', originalPrice: 25.0, promoPrice: 20.0 }
  ]
  const [showEmpty, setShowEmpty] = useState(promotions.length === 0)
  const [selected, setSelected] = useState(null)
  return (
    <div className="container">
      <h2 className="page-title">Promoções</h2>
      {promotions.length > 0 ? (
        <div className="grid products-grid">
          {promotions.map(p => (
            <div key={p.id} className="card" onClick={()=> {
              const prod = mockProducts.find(mp=> mp.id === p.productId)
              if (prod) setSelected(prod)
            }}>
              <img src={p.image} alt={p.name} loading="lazy" decoding="async" />
              <div className="info">
                <div className="row product-header" style={{alignItems:'center'}}>
                  <div className="product-name">{p.name}</div>
                  <div className="price-new">R$ {p.promoPrice.toFixed(2)}</div>
                </div>
                <div className="row" style={{justifyContent:'space-between', alignItems:'center', marginTop:6}}>
                  <div className="muted"><span className="price-old">R$ {p.originalPrice.toFixed(2)}</span></div>
                  <span className="badge green">Em promoção</span>
                </div>
                <div className="muted" style={{marginTop:6}}>{p.description}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="section-card" style={{textAlign:'center'}}>
          <div className="muted">Nenhuma promoção cadastrada no momento.</div>
          <div className="muted" style={{marginTop:6}}>Volte mais tarde para aproveitar ofertas.</div>
        </div>
      )}

      {showEmpty && (
        <div className="modal-backdrop" onClick={()=> setShowEmpty(false)}>
          <div className="modal simple" onClick={(e)=> e.stopPropagation()}>
            <div className="row">
              <h3 style={{margin:0}}>Promoções</h3>
              <button className="close" onClick={()=> setShowEmpty(false)}>×</button>
            </div>
            <div style={{display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'24px 0'}}>
              <div className="empty-icon" />
              <div style={{fontWeight:700, marginTop:12}}>Nenhuma promoção encontrada</div>
            </div>
          </div>
        </div>
      )}
      {selected && (
        <ProductModal product={selected} onClose={()=> setSelected(null)} />
      )}
      <Footer />
      <Tabs />
    </div>
  )
}

function Orders(){
  const { auth } = useContext(AuthContext)
  const [orders, setOrders] = useState(getOrdersLS())
  const eid = getCurrentEstabId()
  const [showNotif, setShowNotif] = useState(()=> {
    try { const c = localStorage.getItem(`notifConsent_${eid}`) || (typeof Notification!=='undefined'? Notification.permission : 'default'); return c!=='granted' && c!=='denied' } catch { return true }
  })
  const prevStatusRef = useRef({})
  useEffect(()=>{
    const id = setInterval(()=> {
      const list = getOrdersLS()
      setOrders(list)
      try {
        const myPhone = auth?.phone
        const mine = (list||[]).filter(o=> o.phone === myPhone)
        mine.forEach(o => {
          const prev = prevStatusRef.current[o.id]
          if (prev && prev !== o.status){
            notificarCliente(o, o.status)
          }
        })
        prevStatusRef.current = Object.fromEntries(mine.map(o=> [o.id, o.status]))
      } catch(e) {}
    }, 10000)
    return ()=> clearInterval(id)
  }, [auth?.phone, eid])
  const filtered = auth?.loggedIn ? orders.filter(o => o.phone === auth.phone) : []
  const pillClass = (st) => {
    if (st==='Aguardando confirmação') return 'yellow'
    if (st==='Confirmado') return 'green'
    if (st==='Em preparo') return 'orange'
    if (st==='Saiu para entrega') return 'blue'
    if (st==='Entregue') return 'green'
    if (st==='Cancelado') return 'red'
    return ''
  }
  return (
    <div className="container">
      <div className="banner" style={{display: showNotif? 'flex':'none'}}>
        <div>
          <div style={{fontWeight:600}}>Ative as notificações</div>
          <div className="muted">para ser avisado quando seu pedido mudar de status.</div>
        </div>
        <div className="btn-row">
          <button className="btn outline btn-lg" onClick={()=> { try { localStorage.setItem(`notifConsent_${eid}`,'denied') } catch(e) {}; setShowNotif(false) }}>NÃO AGORA</button>
          <button className="btn btn-lg" onClick={()=> {
            try {
              if (typeof Notification!=='undefined' && Notification.requestPermission){
                Notification.requestPermission().then(res => { localStorage.setItem(`notifConsent_${eid}`, res||'default'); setShowNotif(false) })
              } else { localStorage.setItem(`notifConsent_${eid}`, 'granted'); setShowNotif(false) }
            } catch(e){ setShowNotif(false) }
          }}>ATIVAR</button>
        </div>
      </div>
      {!auth?.loggedIn && (
        <div className="section-card">
          <div style={{fontWeight:700}}>Entre para ver seus pedidos</div>
          <div className="muted">Use seu número para acessar o histórico associado a ele.</div>
        </div>
      )}

      {auth?.loggedIn && filtered.length === 0 && (
        <div className="section-card">
          <div style={{fontWeight:700}}>Nenhum pedido encontrado</div>
          <div className="muted">Você ainda não fez pedidos com este número.</div>
        </div>
      )}

      {filtered.map((o) => (
        <div key={o.id} className="order-card">
          <div className="row">
            <div>
              <div style={{fontWeight:700}}>Pedido N° {o.id}</div>
              <div className="muted">Feito em {o.createdAt}</div>
              <div className="muted">Tipo: Delivery</div>
            </div>
            <div style={{textAlign:'right'}}>
              <div style={{fontWeight:700}}>Total: R$ {o.total.toFixed(2)}</div>
              <Link to={`/pedido/${o.id}`}>Detalhes</Link>
            </div>
          </div>
          <div style={{marginTop:8}}>
            <span className={`pill ${pillClass(o.status)}`} /> <span className="muted">{o.status}</span>
          </div>
        </div>
      ))}

      <div className="section-card">
        <div className="row">
          <div>
            <div style={{fontWeight:700}}>Pedidos finalizados</div>
            <div className="muted">Os pedidos finalizados são mostrados após cadastro de uma senha.</div>
          </div>
          <div>›</div>
        </div>
        <div className="muted" style={{marginTop:8}}>• Clique aqui e cadastre sua senha</div>
      </div>
      <Tabs />
    </div>
  )
}

function OrderDetails(){
  const { id } = useParams()
  const navigate = useNavigate()
  const { auth } = useContext(AuthContext)
  const [order, setOrder] = useState(() => {
    try { const list = getOrdersLS(); return list.find(o => String(o.id) === String(id)) || null } catch { return null }
  })
  useEffect(()=>{ const t = setInterval(()=> { const list = getOrdersLS(); setOrder(list.find(o => String(o.id) === String(id)) || null) }, 10000); return ()=> clearInterval(t) }, [id])
  const items = order?.items || []
  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0)
  const fee = order?.fee ?? null
  const total = order?.total ?? (subtotal + (fee ?? 0))
  const statuses = ['Aguardando confirmação','Confirmado','Em preparo','Saiu para entrega','Entregue']
  const currentIdx = Math.max(0, statuses.indexOf(order?.status || 'Aguardando confirmação'))
  const iconFor = (label) => {
    if (label==='Aguardando confirmação') return '⏳'
    if (label==='Confirmado') return '✅'
    if (label==='Em preparo') return '🍰'
    if (label==='Saiu para entrega') return '🛵'
    if (label==='Entregue') return '🎉'
    return '•'
  }
  const pillClass = (st) => {
    if (st==='Aguardando confirmação') return 'yellow'
    if (st==='Confirmado') return 'green'
    if (st==='Em preparo') return 'orange'
    if (st==='Saiu para entrega') return 'blue'
    if (st==='Entregue') return 'green'
    if (st==='Cancelado') return 'red'
    return ''
  }
  const handleContactEstabelecimento = () => {
    try {
      const eid = getCurrentEstabId()
      const waRaw = localStorage.getItem(`whatsappNumber_${eid}`) || (() => {
        try {
          const est = JSON.parse(localStorage.getItem('establishment')||'{}')
          const fallback = Array.isArray(est?.phones) ? (est.phones[0] || '') : (est?.phone || '')
          return fallback || ''
        } catch { return '' }
      })()
      const numero = normalizePhone(waRaw)
      if (!numero){
        showToast({ titulo: 'WhatsApp indisponível', mensagem: 'O WhatsApp do estabelecimento não está configurado.', tipo: 'warning' })
        return
      }
      const nome = auth?.name || 'Cliente'
      const dataHora = order?.createdAt || new Date().toLocaleString('pt-BR')
      const mensagem = `Olá, meu nome é ${nome} e gostaria de saber informações sobre o meu pedido de número ${id} feito ${dataHora}`
      const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
      window.open(url, '_blank')
    } catch(e) {}
  }
  return (
    <div className="container">
      <div className="row">
        <h2 style={{margin:0}}>Detalhes do pedido</h2>
        <button className="close" onClick={()=> navigate('/pedidos')}>×</button>
      </div>
      <div className="section-card">
        <div className="row" style={{justifyContent:'space-between'}}>
          <div>
            <div style={{fontWeight:700}}>Pedido # {id}</div>
            <div className="muted">Feito em {order?.createdAt || '—'}</div>
          </div>
          <div style={{textAlign:'right'}}>
            <div style={{fontWeight:700}}>Total: R$ {total.toFixed(2)}</div>
            <div><span className={`pill ${pillClass(order?.status)}`} /> <span style={{fontWeight:600}}>{order?.status || 'Aguardando confirmação'}</span></div>
          </div>
        </div>
      </div>

      <div className="timeline">
        {statuses.map((st, idx) => (
          <div key={st} className={`item ${idx<=currentIdx? 'active':''}`}>
            <div className="icon">{iconFor(st)}</div>
            <div>
              <div className="title">{st}</div>
              <div className="muted">{idx<=currentIdx? 'Atual': 'Pendente'}</div>
            </div>
          </div>
        ))}
        {order?.status==='Cancelado' && (
          <div className="item active">
            <div className="icon">❌</div>
            <div>
              <div className="title">Cancelado</div>
              <div className="muted">Atual</div>
            </div>
          </div>
        )}
      </div>

      <div className="section-card">
        <div style={{fontWeight:700}}>Pedido N° {id}</div>
        {items.map(item => (
          <div key={item.id} className="row" style={{marginTop:8}}>
            <div>{item.qty}x {item.name}</div>
            <div>R$ {(item.unitPrice * item.qty).toFixed(2)}</div>
          </div>
        ))}
        <div className="muted" style={{marginTop:8}}>Subtotal</div>
        <div>R$ {subtotal.toFixed(2)}</div>
        <div className="muted">Taxa de entrega</div>
        <div>{fee==null? 'A definir' : `R$ ${fee.toFixed(2)}`}</div>
        <div style={{fontWeight:700, marginTop:8}}>Total R$ {total.toFixed(2)}</div>
      </div>

      <div className="section-card">
        <div style={{fontWeight:700}}>Observações do pedido</div>
        <div className="muted" style={{marginTop:6}}>{(order?.notes||'').trim() ? order.notes : '—'}</div>
      </div>

      <div className="section-card">
        <div style={{fontWeight:700, marginBottom:8}}>Informações para entrega</div>
        <div>{auth?.name || 'Cliente'}</div>
        <div className="muted">{auth?.phone || '(00) 00000-0000'}</div>
        {auth?.address && (
          <>
            <div style={{marginTop:8}}>{auth.address.street}, {auth.address.number}</div>
            <div className="muted">{auth.address.neighborhood}, {auth.address.city} • {auth.address.complement} • {auth.address.reference}</div>
          </>
        )}
      </div>

      <div className="cta-whatsapp" onClick={handleContactEstabelecimento}>FALAR COM O ESTABELECIMENTO</div>
      <Tabs />
    </div>
  )
}

// Utilidades Admin (localStorage) com escopo por estabelecimento
function getCurrentEstabId(){
  try {
    return localStorage.getItem('currentEstabId') || (JSON.parse(localStorage.getItem('establishment')||'{}').id) || 'default'
  } catch {
    return localStorage.getItem('currentEstabId') || 'default'
  }
}
function getOrdersLS(){
  const eid = getCurrentEstabId()
  try { return JSON.parse(localStorage.getItem(`orders_${eid}`) || '[]') } catch(e){ return [] }
}
function setOrdersLS(list){
  const eid = getCurrentEstabId()
  try { localStorage.setItem(`orders_${eid}`, JSON.stringify(list||[])) } catch(e){}
}
function updateOrderStatus(id, status){
  const list = getOrdersLS()
  const idx = list.findIndex(o=> String(o.id) === String(id))
  if (idx>=0){
    const now = new Date().toLocaleString('pt-BR')
    const prevHist = Array.isArray(list[idx].history) ? list[idx].history : []
    list[idx].status = status
    list[idx].history = [...prevHist, { status, at: now }]
    setOrdersLS(list)
  }
}

function normalizePhone(raw){
  try {
    const digits = String(raw||'').replace(/\D/g,'')
    if (!digits) return ''
    // Assume BR if length 10-11; prepend 55
    if (digits.startsWith('55')) return digits
    return `55${digits}`
  } catch { return '' }
}

function enviarNotificacaoWhatsApp(order, status){
  try {
    const eid = getCurrentEstabId()
    const dedupKey = `wa_sent_status_${eid}_${order.id}_${status}`
    const enabled = localStorage.getItem(`notifyCustomerOnStatus_${eid}`) !== 'false'
    if (!enabled) return
    if (localStorage.getItem(dedupKey)==='true') return
    const numero = normalizePhone(order.phone)
    if (!numero) return
    const mensagem = [
      '🍰 Atualização do seu pedido Mundo Doce 🍰',
      '',
      `#️⃣ Pedido Nº ${order.id}`,
      `Status atual: ${status}`,
      '',
      'Acompanhe seu pedido em:',
      `${window.location.origin}/pedido/${order.id}`,
      '',
      '💖 Obrigado por comprar conosco!'
    ].join('\n')
    const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`
    window.open(url, '_blank')
    localStorage.setItem(dedupKey,'true')
  } catch(e) {}
}

// Emissão de comanda/impressão para cozinha/entrega
function printComanda(order){
  try {
    const fmt = (n) => { try { return (typeof n==='number'? n : parseFloat(n||'0')).toFixed(2) } catch { return '0.00' } }
    const est = (()=>{ try{ return JSON.parse(localStorage.getItem('establishment')||'{}') } catch{ return {} } })()
    const nomeEstab = est?.name || 'Mundo Doce'
    const addr = order?.address || {}
    const itens = (order?.items||[]).map(it => {
      const choice = it.choice ? ` • ${it.choice}` : ''
      const obs = it.obs ? `\n    obs: ${it.obs}` : ''
      return `${it.qty}x ${it.name}${choice}${obs}`
    }).join('\n')
  const pagamento = order?.paymentMethod || '—'
  const total = fmt(order?.total)
  const fee = order?.fee != null ? fmt(order.fee) : null
  const subtotal = order?.subtotal != null ? fmt(order.subtotal) : null
  const obsPedido = (order?.notes||'').trim() || ''
    const endereco = [addr.street, addr.number].filter(Boolean).join(' ') || '—'
    const bairro = addr.neighborhood || ''
    const cidadeUf = [addr.city, addr.uf].filter(Boolean).join(' • ') || ''
    const complemento = addr.complement || ''
    const referencia = addr.reference || ''
    const criadoEm = order?.createdAt || new Date().toLocaleString('pt-BR')
    const status = order?.status || 'Aguardando confirmação'
    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Comanda #${order.id}</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; margin: 0; padding: 16px; }
      .ticket { width: 320px; margin: 0 auto; border: 1px dashed #aaa; padding: 12px; }
      .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 8px; margin-bottom: 8px; }
      .title { font-weight: 800; font-size: 18px; }
      .meta { font-size: 12px; color: #444; }
      .section { margin-top: 8px; }
      .section h4 { margin: 0 0 4px 0; font-size: 13px; font-weight: 400; }
      .section h4.obs-title { font-weight: 700; }
      .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; white-space: pre-wrap; }
      .totals { border-top: 1px solid #eee; margin-top: 8px; padding-top: 8px; }
      .row { display: flex; justify-content: space-between; font-size: 13px; }
      .big { font-size: 16px; font-weight: 700; }
      @media print {
        body { padding: 0; }
        .ticket { width: 80mm; border: none; }
      }
    </style>
  </head>
  <body>
    <div class="ticket">
      <div class="header">
        <div class="title">${nomeEstab}</div>
        <div class="meta">Comanda #${order.id} • ${criadoEm}</div>
        <div class="meta">Cliente: ${order.name || ''} ${order.phone ? '• '+order.phone : ''}</div>
        <div class="meta">Status: ${status}</div>
      </div>
      <div class="section">
        <h4>Itens</h4>
        <div class="mono">${itens || '—'}</div>
      </div>
      <div class="section">
        <h4>Entrega</h4>
        <div class="mono">${endereco}</div>
        ${bairro?`<div class="mono">${bairro}</div>`:''}
        ${cidadeUf?`<div class="mono">${cidadeUf}</div>`:''}
        ${complemento?`<div class="mono">Compl.: ${complemento}</div>`:''}
        ${referencia?`<div class="mono">Ref.: ${referencia}</div>`:''}
      </div>
      ${obsPedido?`
      <div class="section">
        <h4 class="obs-title">Observação do pedido</h4>
        <div class="mono">${obsPedido}</div>
      </div>
      `:''}
      <div class="section">
        <h4>Pagamento</h4>
        <div class="mono">${pagamento}</div>
      </div>
      <div class="section totals">
        ${subtotal!=null?`<div class="row"><div>Subtotal</div><div>R$ ${subtotal}</div></div>`:''}
        ${fee!=null?`<div class="row"><div>Entrega</div><div>R$ ${fee}</div></div>`:''}
        <div class="row big"><div>Total</div><div>R$ ${total}</div></div>
      </div>
      <div class="section" style="text-align:center; margin-top:10px;">
        <div class="mono">—— Cortar aqui ——</div>
      </div>
    </div>
    <script>window.onload = ()=> { try { window.print(); } catch(e) {} };<\/script>
  </body>
</html>`
    const w = window.open('', '_blank')
    if (w && w.document){ w.document.open(); w.document.write(html); w.document.close(); }
  } catch(e) {}
}

// Toast global simples
function showToast({ titulo, mensagem, tipo = 'info', duracao = 5000 }){
  try {
    const detail = { id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, titulo, mensagem, tipo, duracao }
    window.dispatchEvent(new CustomEvent('appToast', { detail }))
  } catch(e) {}
}

// Notificação ao cliente (Web Notification ou Toast interno)
function notificarCliente(order, status){
  try {
    const eid = getCurrentEstabId()
    const consent = localStorage.getItem(`notifConsent_${eid}`) || (typeof Notification!=='undefined'? Notification.permission : 'default')
    const title = 'Mundo Doce 🍰'
    const body = `Seu pedido #${order.id} agora está: ${status}`
    const icon = (JSON.parse(localStorage.getItem('establishment')||'{}').avatarImage) || '/img/logo.png'
    if (('Notification' in window) && (consent === 'granted')){
      try { new Notification(title, { body, icon }) } catch(e) { showToast({ titulo: '🍰 Atualização de Pedido', mensagem: body, tipo: 'sucesso' }) }
    } else {
      showToast({ titulo: '🍰 Atualização de Pedido', mensagem: body, tipo: 'sucesso' })
    }
    // Registrar notificação em localStorage
    try {
      const list = JSON.parse(localStorage.getItem(`notifications_${eid}`) || '[]')
      list.push({ id: Date.now(), tipo:'status_pedido', destinatario:'cliente', pedido_id: order.id, mensagem: body, status:'não lida', data_envio: new Date().toISOString() })
      localStorage.setItem(`notifications_${eid}`, JSON.stringify(list))
    } catch(e) {}
  } catch(e) {}
}

// Produtos e categorias (localStorage) com escopo por estabelecimento
function getProductsLS(){ const eid = getCurrentEstabId(); try { return JSON.parse(localStorage.getItem(`products_${eid}`) || 'null') || null } catch { return null } }
function setProductsLS(list){ const eid = getCurrentEstabId(); try { localStorage.setItem(`products_${eid}`, JSON.stringify(list||[])) } catch {} }
function getCategoriesLS(){ const eid = getCurrentEstabId(); try { return JSON.parse(localStorage.getItem(`categories_${eid}`) || 'null') || null } catch { return null } }
function setCategoriesLS(list){ const eid = getCurrentEstabId(); try { localStorage.setItem(`categories_${eid}`, JSON.stringify(list||[])) } catch {} }

function AdminLogin(){
  const navigate = useNavigate()
  const [estabId, setEstabId] = useState(localStorage.getItem('currentEstabId')||'')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const est = (()=>{ try{ return JSON.parse(localStorage.getItem('establishment')||'{}') } catch{ return {} } })()
  const expectedId = (est?.id) || 'default'
  const expectedPass = (est?.adminPassword) || (localStorage.getItem('adminAccessKey') || 'RVADMIN')
  const canLogin = estabId.trim().length>0 && pass.trim().length>0
  const login = () => {
    if (!canLogin) return
    if (estabId.trim() === expectedId && pass.trim() === expectedPass){
      setError('')
      localStorage.setItem('currentEstabId', estabId.trim())
      localStorage.setItem(`adminLogged_${estabId.trim()}`,'true')
      navigate('/admin/painel')
    } else {
      setError('ID do estabelecimento ou senha incorretos. Tente novamente.')
    }
  }
  return (
    <div className="container">
      <h2 className="page-title">Gerenciamento do Estabelecimento</h2>
      <div className="section-card">
        <div className="muted">Acesse com o ID do seu estabelecimento e senha definida por você.</div>
        <div className="row" style={{gap:12, marginTop:8}}>
          <div className="field" style={{flex:1}}>
            <label className="muted">ID do estabelecimento</label>
            <input placeholder="Ex: default" value={estabId} onChange={(e)=> setEstabId(e.target.value)} />
          </div>
          <div className="field" style={{flex:1}}>
            <label className="muted">Senha</label>
            <input type="password" placeholder="Sua senha" value={pass} onChange={(e)=> setPass(e.target.value)} />
          </div>
        </div>
        {error && (
          <div style={{color:'var(--error, #b00020)', marginTop:8}}>{error}</div>
        )}
        <div style={{marginTop:8}}>
          <button className="btn" disabled={!canLogin} onClick={login}>Entrar</button>
        </div>
        <div className="muted" style={{marginTop:8}}>Dica: configure o ID e a senha em "Configurar Estabelecimento".</div>
      </div>
    </div>
  )
}

function AdminPanel(){
  const navigate = useNavigate()
  const eid = getCurrentEstabId()
  const logged = localStorage.getItem(`adminLogged_${eid}`) === 'true'
  useEffect(()=> { if(!logged) navigate('/admin') }, [logged])
  return (
    <div className="container">
      <h2 className="page-title">Painel administrativo</h2>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))'}}>
        {[
          {label:'Estabelecimento', path:'/admin/estabelecimento'},
          {label:'Itens', path:'/admin/itens'},
          {label:'Cidades', path:'/admin/cidades'},
          {label:'Cupons', path:'/admin/cupons'},
          {label:'Pedidos', path:'/admin/pedidos'},
          {label:'Dashboard', path:'/admin/dashboard'},
        ].map(card => (
          <div key={card.path} className="card" style={{cursor:'pointer'}} onClick={()=> navigate(card.path)}>
            <div className="info">
              <div style={{fontWeight:700}}>{card.label}</div>
              <div className="muted">Gerenciar {card.label.toLowerCase()}.</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AdminOrders(){
  const navigate = useNavigate()
  const eid = getCurrentEstabId()
  const logged = localStorage.getItem(`adminLogged_${eid}`) === 'true'
  useEffect(()=> { if(!logged) navigate('/admin') }, [logged])
  const [orders, setOrders] = useState(getOrdersLS())
  const [filterStatus, setFilterStatus] = useState('')
  const [search, setSearch] = useState('')
  const [showDetails, setShowDetails] = useState(null)
  const prevIdsRef = useRef({})
  const statuses = ['Aguardando confirmação','Confirmado','Em preparo','Saiu para entrega','Entregue','Cancelado']
  const setStatus = (id, st) => {
    updateOrderStatus(id, st)
    const updated = getOrdersLS()
    setOrders(updated)
    try { localStorage.setItem(`order_seen_${eid}_${id}`,'true') } catch(e) {}
  }
  const badgeClass = (st) => {
    if (st==='Aguardando confirmação') return 'yellow'
    if (st==='Confirmado') return 'green'
    if (st==='Em preparo') return 'orange'
    if (st==='Saiu para entrega') return 'blue'
    if (st==='Entregue') return 'green'
    if (st==='Cancelado') return 'red'
    return ''
  }
  // Polling e alerta visual/sonoro para novos pedidos
  useEffect(()=>{
    const id = setInterval(()=> {
      const list = getOrdersLS()
      setOrders(list)
      try {
        const soundEnabled = (localStorage.getItem(`adminSoundEnabled_${eid}`) || 'true') !== 'false'
        (list||[]).forEach(o => {
          const known = !!prevIdsRef.current[o.id]
          if (!known){
            prevIdsRef.current[o.id] = true
            const dedupKey = `soundPlayed_${eid}_${o.id}`
            if (soundEnabled && localStorage.getItem(dedupKey)!=='true'){
              let played = false
              try { const audio = new Audio('/sons/novo-pedido.mp3'); audio.play().then(()=> { played = true }).catch(()=>{}) } catch {}
              if (!played){
                try {
                  const ctx = new (window.AudioContext || window.webkitAudioContext)()
                  const osc = ctx.createOscillator(); const gain = ctx.createGain()
                  osc.type = 'sine'; osc.frequency.value = 880; gain.gain.value = 0.05
                  osc.connect(gain); gain.connect(ctx.destination)
                  osc.start(); setTimeout(()=> { osc.stop(); ctx.close() }, 400)
                } catch {}
              }
              localStorage.setItem(dedupKey,'true')
            }
            showToast({ titulo: '🧁 Novo Pedido Recebido!', mensagem: `Pedido #${o.id} - ${o.name||o.phone}`, tipo: 'info', duracao: 7000 })
            try {
              const list = JSON.parse(localStorage.getItem(`notifications_${eid}`) || '[]')
              list.push({ id: Date.now(), tipo:'novo_pedido', destinatario:'admin', pedido_id: o.id, mensagem: `Pedido #${o.id} de ${o.name||o.phone}`, status:'não lida', data_envio: new Date().toISOString() })
              localStorage.setItem(`notifications_${eid}`, JSON.stringify(list))
            } catch(e) {}
          }
        })
      } catch(e) {}
    }, 10000)
    return ()=> clearInterval(id)
  }, [eid])
  const timeAgo = (createdAt) => {
    try {
      const created = new Date(createdAt)
      const diffMs = Date.now() - created.getTime()
      const mins = Math.floor(diffMs / 60000)
      if (mins < 60) return `Feito há ${mins} min`
      const hours = Math.floor(mins/60)
      const rem = mins % 60
      return `Feito há ${hours}h ${rem}m`
    } catch { return createdAt }
  }
  const display = orders.filter(o => {
    const matchStatus = !filterStatus || o.status === filterStatus
    const matchSearch = !search || (String(o.id).includes(search) || (o.phone||'').includes(search) || (o.name||'').toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })
  return (
    <div className="container">
      <AdminHeader title="📦 Pedidos do Dia" />
      <style>{`
        @keyframes blinkGlow { 0% { box-shadow: 0 0 0 rgba(123,74,46,0); } 50% { box-shadow: 0 0 0 6px rgba(123,74,46,0.18); } 100% { box-shadow: 0 0 0 rgba(123,74,46,0); } }
        .blink { animation: blinkGlow 1.4s ease-in-out infinite; border: 1px solid rgba(123,74,46,0.35); }
      `}</style>
      <div className="row" style={{alignItems:'flex-start', gap:16}}>
        <div style={{width:240}}>
          <div className="section-card">
            <div style={{fontWeight:700, marginBottom:8}}>Menu</div>
            <div className="menu-list">
              <Link to="/admin/pedidos">🧁 Pedidos</Link>
              <Link to="/admin/itens">📦 Produtos</Link>
              <Link to="/admin/itens">🏷️ Categorias</Link>
              <Link to="/admin/dashboard">📊 Relatórios</Link>
              <Link to="/admin/estabelecimento">⚙️ Configurações</Link>
            </div>
          </div>
        </div>
        <div style={{flex:1}}>
          <div className="section-card">
            <div className="row" style={{gap:12}}>
              <div className="field" style={{flex:1}}>
                <label className="muted">Buscar por nome, telefone ou N°</label>
                <input placeholder="Ex: Maria, 8799..., 123" value={search} onChange={(e)=> setSearch(e.target.value)} />
              </div>
              <div className="field" style={{width:240}}>
                <label className="muted">Filtrar por status</label>
                <select value={filterStatus} onChange={(e)=> setFilterStatus(e.target.value)}>
                  <option value="">Todos</option>
                  {statuses.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>
              <div className="field" style={{width:240}}>
                <label className="muted">Notificar cliente via WhatsApp</label>
                <select value={(localStorage.getItem(`notifyCustomerOnStatus_${eid}`) || 'true')} onChange={(e)=> localStorage.setItem(`notifyCustomerOnStatus_${eid}`, e.target.value)}>
                  <option value="true">Ativado</option>
                  <option value="false">Desativado</option>
                </select>
              </div>
              <div className="field" style={{width:240}}>
                <label className="muted">🔔 Som de novo pedido</label>
                <select value={(localStorage.getItem(`adminSoundEnabled_${eid}`) || 'true')} onChange={(e)=> localStorage.setItem(`adminSoundEnabled_${eid}`, e.target.value)}>
                  <option value="true">Ativado</option>
                  <option value="false">Desativado</option>
                </select>
              </div>
            </div>
            <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
              <button className={`btn outline ${filterStatus===''? 'active':''}`} onClick={()=> setFilterStatus('')}>Todos</button>
              {statuses.map(st => (
                <button key={st} className={`btn outline ${filterStatus===st? 'active':''}`} onClick={()=> setFilterStatus(st)}>{st}</button>
              ))}
              <button className="btn" onClick={()=> {
                const todayStr = new Date().toLocaleDateString('pt-BR')
                const todays = orders.filter(o => (new Date(o.createdAt)).toLocaleDateString('pt-BR') === todayStr)
                const header = ['id','nome','telefone','total','pagamento','status','data']
                const lines = todays.map(o => [o.id, o.name||'', o.phone||'', (o.total||0).toFixed(2), o.paymentMethod||'', o.status||'', o.createdAt||''].join(','))
                const csv = [header.join(','), ...lines].join('\n')
                const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url; a.download = `pedidos-dia-${todayStr}.csv`; a.click(); URL.revokeObjectURL(url)
              }}>Exportar CSV</button>
            </div>
          </div>
          {display.length===0 ? (
            <div className="section-card"><div className="muted">Nenhum pedido recebido ainda.</div></div>
          ) : display.map(o=> (
            <div key={o.id} className={`section-card ${localStorage.getItem(`order_seen_${eid}_${o.id}`)!=='true' ? 'blink' : ''}`}>
              <div className="row" style={{justifyContent:'space-between'}}>
                <div>
                  <div style={{fontWeight:700}}>Pedido N° {o.id}</div>
                  <div className="muted">Cliente: {o.name ? `${o.name} • ${o.phone}` : o.phone}</div>
                  <div className="muted">{timeAgo(o.createdAt)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontWeight:700}}>Total: R$ {o.total.toFixed(2)}</div>
                  <div>
                    <span className={`badge ${badgeClass(o.status)}`}>{o.status}</span>
                  </div>
                </div>
              </div>
              <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
                <button className="btn outline" onClick={()=> setStatus(o.id, 'Confirmado')}>✅ Confirmar</button>
                <button className="btn outline" onClick={()=> setStatus(o.id, 'Em preparo')}>🍰 Em preparo</button>
                <button className="btn outline" onClick={()=> setStatus(o.id, 'Saiu para entrega')}>🛵 Enviar para entrega</button>
                <button className="btn outline" onClick={()=> setStatus(o.id, 'Entregue')}>🎉 Entregue</button>
                <button className="btn outline" onClick={()=> setStatus(o.id, 'Cancelado')}>❌ Cancelar</button>
                <button className="btn outline" onClick={()=> printComanda(o)}>🧾 Comanda</button>
                <button className="btn" onClick={()=> { try { localStorage.setItem(`order_seen_${eid}_${o.id}`,'true') } catch(e) {}; setShowDetails(o) }}>Ver Detalhes</button>
              </div>
            </div>
          ))}
          {showDetails && (
            <AdminOrderDetailsModal order={showDetails} onClose={()=> setShowDetails(null)} />
          )}
        </div>
      </div>
    </div>
  )
}

function AdminOrderDetailsModal({ order, onClose }){
  const fmt = (n) => { try { return (typeof n==='number'? n : parseFloat(n||'0')).toFixed(2) } catch { return '0.00' } }
  const addr = order?.address || {}
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple" onClick={(e)=> e.stopPropagation()}>
        <div className="row" style={{justifyContent:'space-between'}}>
          <h3 style={{margin:0}}>Pedido #{order.id}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="muted">Cliente: {order.name ? `${order.name} • ${order.phone}` : order.phone}</div>
        <div className="muted">Feito em {order.createdAt}</div>
        <div className="section-card" style={{marginTop:12}}>
          <div style={{fontWeight:700}}>Itens</div>
          {(order.items||[]).map(it => (
            <div key={it.id} className="row" style={{marginTop:6}}>
              <div>{it.qty}x {it.name} {it.choice||''}</div>
              <div>R$ {fmt((it.unitPrice||0)* (it.qty||0))}</div>
            </div>
          ))}
          <div className="row" style={{justifyContent:'space-between', marginTop:8}}>
            <div>Subtotal</div><div>R$ {fmt(order.subtotal)}</div>
          </div>
          <div className="row" style={{justifyContent:'space-between', marginTop:4}}>
            <div>Entrega</div><div>R$ {fmt(order.fee)}</div>
          </div>
          <div className="row" style={{justifyContent:'space-between', marginTop:4, fontWeight:700}}>
            <div>Total</div><div>R$ {fmt(order.total)}</div>
          </div>
          <div className="muted" style={{marginTop:6}}>Pagamento: {order.paymentMethod}</div>
        </div>

        <div className="section-card">
          <div style={{fontWeight:700}}>Endereço</div>
          <div className="muted" style={{marginTop:6}}>{[addr.street, addr.number].filter(Boolean).join(' ') || '—'}</div>
          <div className="muted">{addr.neighborhood || '—'}</div>
          <div className="muted">{[addr.city, addr.uf].filter(Boolean).join(' • ') || ''}</div>
          <div className="muted">Complemento: {addr.complement || '—'}</div>
          <div className="muted">Referência: {addr.reference || '—'}</div>
        </div>

        <div className="section-card">
          <div style={{fontWeight:700}}>Histórico de status</div>
          <div className="menu-list">
            {(order.history||[]).length===0 ? <div className="muted">Sem histórico</div> : (order.history||[]).map((h,idx)=> (
              <div key={idx} className="row" style={{justifyContent:'space-between'}}>
                <div>{h.status}</div><div className="muted">{h.at}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{marginTop:8, display:'flex', gap:8}}>
          <button className="btn" onClick={onClose}>Fechar</button>
          <button className="btn" onClick={()=> printComanda(order)}>Emitir comanda</button>
          <button className="btn outline" onClick={()=> enviarNotificacaoWhatsApp(order, order.status)}>Enviar WhatsApp</button>
        </div>
      </div>
    </div>
  )
}

// Gráfico simples de barras em SVG
function BarChart({ labels, values, height=160, color='#10b981', formatValue=(v)=> Math.round(v) }){
  const max = Math.max(1, ...values)
  const barW = 24, gap = 12, padding = 24
  const width = padding*2 + labels.length * (barW + gap) - gap
  const scale = (v) => (v / max) * (height - padding*2)
  const short = (s) => {
    const parts = String(s).split('/')
    return parts.length>=2 ? `${parts[0]}/${parts[1]}` : s
  }
  return (
    <div style={{overflowX:'auto'}}>
      <svg width={width} height={height} role="img" aria-label="Gráfico de barras">
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e5e7eb" />
        {values.map((v,i)=>{
          const x = padding + i*(barW+gap)
          const h = scale(v)
          const y = height - padding - h
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill={color} rx={4} />
              <text x={x + barW/2} y={height - padding + 12} fontSize={10} fill="#6b7280" textAnchor="middle">{short(labels[i])}</text>
              <text x={x + barW/2} y={y - 4} fontSize={10} fill="#374151" textAnchor="middle">{formatValue(v)}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Gráfico de linha simples em SVG
function LineChart({ labels, values, height=160, stroke='#3b82f6' }){
  const max = Math.max(1, ...values)
  const padding = 24
  const gap = 36
  const width = padding*2 + (labels.length-1) * gap
  const scaleY = (v) => (v / max) * (height - padding*2)
  const short = (s) => {
    const parts = String(s).split('/')
    return parts.length>=2 ? `${parts[0]}/${parts[1]}` : s
  }
  const points = values.map((v,i)=>{
    const x = padding + i*gap
    const y = height - padding - scaleY(v)
    return `${x},${y}`
  }).join(' ')
  return (
    <div style={{overflowX:'auto'}}>
      <svg width={width} height={height} role="img" aria-label="Gráfico de linha">
        <line x1={padding} y1={height-padding} x2={width-padding} y2={height-padding} stroke="#e5e7eb" />
        <polyline points={points} fill="none" stroke={stroke} strokeWidth={2} />
        {values.map((v,i)=>{
          const x = padding + i*gap
          const y = height - padding - scaleY(v)
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={3} fill={stroke} />
              <text x={x} y={y-6} fontSize={10} fill="#374151" textAnchor="middle">{Math.round(v)}</text>
              <text x={x} y={height - padding + 12} fontSize={10} fill="#6b7280" textAnchor="middle">{short(labels[i])}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// Cabeçalho padrão para páginas administrativas
function AdminHeader({ title }){
  const navigate = useNavigate()
  return (
    <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
      <h2 style={{margin:0}}>{title}</h2>
      <div className="btn-group" style={{display:'flex', gap:8}}>
        <button className="btn outline" onClick={()=> navigate(-1)}>Voltar</button>
        <button className="btn" onClick={()=> navigate('/admin/painel')}>Painel</button>
      </div>
    </div>
  )
}

function AdminDashboard(){
  const navigate = useNavigate()
  const eid = getCurrentEstabId()
  const logged = localStorage.getItem(`adminLogged_${eid}`) === 'true'
  useEffect(()=> { if(!logged) navigate('/admin') }, [logged])
  // Relatórios com filtros e métricas
  const [orders, setOrders] = useState(getOrdersLS())
  useEffect(()=>{ const t = setInterval(()=> setOrders(getOrdersLS()), 10000); return ()=> clearInterval(t) },[])
  const sum = (list) => list.reduce((s,o)=> s + (o.total||0), 0)
  const products = getProductsLS() || []
  const categoriesList = getCategoriesLS() || []
  const categoryMap = Object.fromEntries(products.map(p=> [p.id, p.category || '']))
  const paymentOptions = ['Pix','Dinheiro','Cartão de crédito','Cartão de débito','Transferência']
  const parseBRDate = (s) => { try { const [d,m,y] = String(s).split(/[\/]/).map(x=> parseInt(x,10)); const t = String(s).split(' '); const hm = (t[1]||'00:00').split(':').map(x=> parseInt(x,10)); return new Date(y, m-1, d, hm[0]||0, hm[1]||0) } catch { return new Date() } }
  const [period, setPeriod] = useState('hoje')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterPayment, setFilterPayment] = useState('')
  const [compare, setCompare] = useState(false)
  const [modalCat, setModalCat] = useState('')
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0,0,0)
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23,59,59)
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()-6, 0,0,0)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0)
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0, 23,59,59)
  const periodRange = (()=>{
    if (period==='hoje') return [todayStart, todayEnd]
    if (period==='7dias') return [weekStart, todayEnd]
    if (period==='mes') return [monthStart, monthEnd]
    if (period==='custom') {
      const s = customStart ? new Date(customStart) : weekStart
      const e = customEnd ? new Date(customEnd) : todayEnd
      return [s,e]
    }
    return [weekStart,todayEnd]
  })()
  const isConfirmed = (st) => st !== 'Cancelado'
  const filtered = orders.filter(o => {
    if (!isConfirmed(o.status||'')) return false
    const d = parseBRDate(o.createdAt)
    const inRange = d >= periodRange[0] && d <= periodRange[1]
    const payOk = !filterPayment || (o.paymentMethod||'') === filterPayment
    const catOk = !filterCategory || (o.items||[]).some(it=> (categoryMap[it.productId]||'') === filterCategory)
    return inRange && payOk && catOk
  })
  const prevRange = (()=>{ const ms = periodRange[1] - periodRange[0]; const endPrev = new Date(periodRange[0].getTime()-1); const startPrev = new Date(periodRange[0].getTime()-ms); return [startPrev, endPrev] })()
  const prevFiltered = compare ? orders.filter(o => {
    if (!isConfirmed(o.status||'')) return false
    const d = parseBRDate(o.createdAt)
    const inRange = d >= prevRange[0] && d <= prevRange[1]
    const payOk = !filterPayment || (o.paymentMethod||'') === filterPayment
    const catOk = !filterCategory || (o.items||[]).some(it=> (categoryMap[it.productId]||'') === filterCategory)
    return inRange && payOk && catOk
  }) : []
  const faturamento_total = sum(filtered)
  const qtd_pedidos = filtered.length
  const ticket_medio = qtd_pedidos>0 ? (faturamento_total / qtd_pedidos) : 0
  const productQtyMap = {}
  const categoryValueMap = {}
  filtered.forEach(o => { (o.items||[]).forEach(it => { const cat = categoryMap[it.productId] || 'outros'; const val = (it.unitPrice||0) * (it.qty||1); productQtyMap[it.name] = (productQtyMap[it.name]||0) + (it.qty||1); categoryValueMap[cat] = (categoryValueMap[cat]||0) + val }) })
  const produto_top = Object.entries(productQtyMap).sort((a,b)=> b[1]-a[1])[0]?.[0] || '—'
  const pagamento_top = Object.entries(filtered.reduce((acc,o)=> { const k=o.paymentMethod||'Outros'; acc[k]=(acc[k]||0)+1; return acc },{})).sort((a,b)=> b[1]-a[1])[0]?.[0] || '—'
  const dailyMap = {}
  filtered.forEach(o => { const d = parseBRDate(o.createdAt); const key = d.toLocaleDateString('pt-BR'); dailyMap[key] = (dailyMap[key]||0) + (o.total||0) })
  const dailyChrono = Object.entries(dailyMap).sort((a,b)=>{ const pa = a[0].split('/').reverse().join('-'); const pb = b[0].split('/').reverse().join('-'); return new Date(pa) - new Date(pb) })
  const payMap = {}
  filtered.forEach(o => { const k=o.paymentMethod||'Outros'; payMap[k]=(payMap[k]||0)+1 })
  const payLabels = Object.keys(payMap)
  const payValues = payLabels.map(k=> payMap[k])
  const topProductsArr = Object.entries(productQtyMap).sort((a,b)=> b[1]-a[1]).slice(0,5)
  const prevTotal = sum(prevFiltered)
  const varPct = compare && prevTotal>0 ? Math.round(((faturamento_total - prevTotal) / prevTotal) * 100) : 0

  const exportCSV = () => {
    const header = ['ID','Data','Nome','Telefone','Qtde Itens','Subtotal','Taxa','Total','Pagamento','Status']
    const rows = filtered.map(o => [
      o.id,
      o.createdAt,
      o.name||'',
      o.phone||'',
      (o.items||[]).reduce((s,i)=> s + (i.qty||1), 0),
      (o.subtotal||0).toFixed(2),
      ((o.fee||0)??0).toFixed(2),
      (o.total||0).toFixed(2),
      o.paymentMethod||'',
      o.status||''
    ])
    const csv = [header.join(','), ...rows.map(r => r.map(v => String(v).replace(/,/g,';')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const rangeLabel = `${periodRange[0].toLocaleDateString('pt-BR')}_${periodRange[1].toLocaleDateString('pt-BR')}`
    a.href = url; a.download = `relatorio_${eid}_${rangeLabel}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const exportPDF = () => {
    const w = window.open('', '_blank', 'noopener,noreferrer')
    if (!w) return
    const rowsHtml = filtered.map(o => `
      <tr>
        <td>${o.id}</td>
        <td>${o.createdAt}</td>
        <td>${o.name||''}</td>
        <td>${o.phone||''}</td>
        <td>${(o.items||[]).reduce((s,i)=> s + (i.qty||1), 0)}</td>
        <td>R$ ${(o.subtotal||0).toFixed(2)}</td>
        <td>R$ ${((o.fee||0)??0).toFixed(2)}</td>
        <td>R$ ${(o.total||0).toFixed(2)}</td>
        <td>${o.paymentMethod||''}</td>
        <td>${o.status||''}</td>
      </tr>`).join('')
    w.document.write(`<!doctype html><html><head><meta charset=\"utf-8\"><title>Relatório ${eid}</title>
      <style>body{font-family:Arial,sans-serif;padding:16px;} h1{margin:0 0 12px;} table{width:100%;border-collapse:collapse;} th,td{border:1px solid #ddd;padding:6px;font-size:12px;} th{background:#f4f5f7;text-align:left;} .btn{display:none}</style>
    </head><body>
      <h1>Relatório de Vendas</h1>
      <div>Estabelecimento: ${eid}</div>
      <div>Período: ${periodRange[0].toLocaleDateString('pt-BR')} a ${periodRange[1].toLocaleDateString('pt-BR')}</div>
      <div>Total de pedidos: ${qtd_pedidos} • Faturamento: R$ ${faturamento_total.toFixed(2)}</div>
      <table><thead><tr>
        <th>ID</th><th>Data</th><th>Nome</th><th>Telefone</th><th>Qtde Itens</th><th>Subtotal</th><th>Taxa</th><th>Total</th><th>Pagamento</th><th>Status</th>
      </tr></thead><tbody>${rowsHtml}</tbody></table>
      <script>window.print()</script>
    </body></html>`)
    w.document.close()
  }
  return (
    <div className="container">
      <AdminHeader title="📊 Relatórios e Estatísticas de Vendas" />
      <div className="section-card" style={{marginTop:8}}>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          <div className="field" style={{width:220}}>
            <label className="muted">Período</label>
            <select value={period} onChange={(e)=> setPeriod(e.target.value)}>
              <option value="hoje">Hoje</option>
              <option value="7dias">Últimos 7 dias</option>
              <option value="mes">Mês atual</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {period==='custom' && (
            <>
              <div className="field" style={{width:200}}>
                <label className="muted">De</label>
                <input type="date" value={customStart} onChange={(e)=> setCustomStart(e.target.value)} />
              </div>
              <div className="field" style={{width:200}}>
                <label className="muted">Até</label>
                <input type="date" value={customEnd} onChange={(e)=> setCustomEnd(e.target.value)} />
              </div>
            </>
          )}
          <div className="field" style={{width:220}}>
            <label className="muted">Categoria</label>
            <select value={filterCategory} onChange={(e)=> setFilterCategory(e.target.value)}>
              <option value="">Todas</option>
              {categoriesList.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="field" style={{width:220}}>
            <label className="muted">Forma de pagamento</label>
            <select value={filterPayment} onChange={(e)=> setFilterPayment(e.target.value)}>
              <option value="">Todas</option>
              {paymentOptions.map(p=> <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="field" style={{width:200}}>
            <label className="muted">Modo analítico</label>
            <select value={compare? 'on':'off'} onChange={(e)=> setCompare(e.target.value==='on')}>
              <option value="off">Desativado</option>
              <option value="on">Comparar com período anterior</option>
            </select>
          </div>
        </div>
        <div className="row" style={{gap:8, marginTop:8}}>
          <button className="btn" onClick={exportCSV}>Exportar Excel (CSV)</button>
          <button className="btn outline" onClick={exportPDF}>Exportar PDF</button>
        </div>
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fill, minmax(220px, 1fr))'}}>
        <div className="card"><div className="info"><div className="muted">💰 Faturamento total</div><div style={{fontWeight:800}}>R$ {faturamento_total.toFixed(2)}</div>{compare && <div className="muted">Variação: {varPct>0? '+':''}{varPct}%</div>}</div></div>
        <div className="card"><div className="info"><div className="muted">📦 Total de pedidos</div><div style={{fontWeight:800}}>{qtd_pedidos}</div></div></div>
        <div className="card"><div className="info"><div className="muted">📈 Ticket médio</div><div style={{fontWeight:800}}>R$ {ticket_medio.toFixed(2)}</div></div></div>
        <div className="card"><div className="info"><div className="muted">🧁 Produto mais vendido</div><div style={{fontWeight:800}}>{produto_top}</div></div></div>
        <div className="card"><div className="info"><div className="muted">💳 Pagamento mais usado</div><div style={{fontWeight:800}}>{pagamento_top}</div></div></div>
      </div>
      <div className="section-card" style={{marginTop:12}}>
        <div className="muted" style={{marginBottom:6}}>Evolução de vendas por dia</div>
        {dailyChrono.length===0 ? <div className="muted">Sem dados no período</div> : (
          <LineChart labels={dailyChrono.map(([d])=> d)} values={dailyChrono.map(([,v])=> v)} height={180} stroke="#3b82f6" />
        )}
      </div>
      <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', marginTop:12}}>
        <div className="section-card">
          <div style={{fontWeight:700}}>Distribuição por categoria</div>
          {Object.keys(categoryValueMap).length===0 ? <div className="muted">Sem dados</div> : (
            <>
              <BarChart labels={Object.keys(categoryValueMap)} values={Object.keys(categoryValueMap).map(k=> categoryValueMap[k])} height={160} color="#6b4f2a" formatValue={(v)=> Math.round(v)} />
              <div className="menu-list" style={{marginTop:8}}>
                {Object.entries(categoryValueMap).sort((a,b)=> b[1]-a[1]).map(([cat,val])=> (
                  <button key={cat} className="linklike" onClick={()=> setModalCat(cat) } style={{display:'flex', justifyContent:'space-between'}}>
                    <span>{(categoriesList.find(c=> c.id===cat)?.name)||cat}</span><span>R$ {val.toFixed(2)}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="section-card">
          <div style={{fontWeight:700}}>Formas de pagamento</div>
          {payLabels.length===0 ? <div className="muted">Sem dados</div> : (
            <BarChart labels={payLabels} values={payValues} height={160} color="#f59e0b" formatValue={(v)=> Math.round(v)} />
          )}
        </div>
        <div className="section-card">
          <div style={{fontWeight:700}}>Top 5 produtos mais vendidos</div>
          {topProductsArr.length===0 ? <div className="muted">Sem dados</div> : (
            <BarChart labels={topProductsArr.map(([name])=> name)} values={topProductsArr.map(([,qty])=> qty)} height={160} color="#10b981" formatValue={(v)=> Math.round(v)} />
          )}
        </div>
      </div>
      <div className="section-card" style={{marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:6}}>Pedidos do período</div>
        {filtered.length===0 ? <div className="muted">Sem pedidos no período.</div> : (
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%', borderCollapse:'collapse'}}>
              <thead>
                <tr>
                  <th style={{textAlign:'left'}}>N° Pedido</th>
                  <th style={{textAlign:'left'}}>Cliente</th>
                  <th style={{textAlign:'left'}}>Data</th>
                  <th style={{textAlign:'left'}}>Valor Total</th>
                  <th style={{textAlign:'left'}}>Pagamento</th>
                  <th style={{textAlign:'left'}}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o=> (
                  <tr key={o.id}>
                    <td>{o.id}</td>
                    <td>{o.name ? `${o.name} • ${o.phone}` : o.phone}</td>
                    <td>{o.createdAt}</td>
                    <td>R$ {(o.total||0).toFixed(2)}</td>
                    <td>{o.paymentMethod||''}</td>
                    <td>{o.status||''}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{fontWeight:700}}>Total</td>
                  <td style={{fontWeight:700}}>R$ {faturamento_total.toFixed(2)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
      {modalCat && (
        <div className="modal-backdrop" onClick={()=> setModalCat('')}>
          <div className="modal" onClick={e=> e.stopPropagation()}>
            <div className="row">
              <h3 style={{margin:0}}>Categoria: {(categoriesList.find(c=> c.id===modalCat)?.name)||modalCat}</h3>
              <button className="close" onClick={()=> setModalCat('')}>×</button>
            </div>
            <div className="menu-list" style={{maxHeight:280, overflowY:'auto'}}>
              {(()=>{
                const byProduct = {}
                filtered.forEach(o => {
                  (o.items||[]).forEach(it => {
                    const cat = categoryMap[it.productId] || ''
                    if (cat===modalCat){
                      const key = it.name
                      const qty = (it.qty||1)
                      const val = (it.unitPrice||0) * qty
                      byProduct[key] = { qty: (byProduct[key]?.qty||0)+qty, total: (byProduct[key]?.total||0)+val }
                    }
                  })
                })
                const entries = Object.entries(byProduct).sort((a,b)=> b[1].qty - a[1].qty)
                if (entries.length===0) return <div className="muted">Sem dados para a categoria selecionada.</div>
                return entries.map(([name,info])=> (
                  <div key={name} className="row" style={{justifyContent:'space-between'}}>
                    <div>{name}</div>
                    <div>{info.qty} un • R$ {info.total.toFixed(2)}</div>
                  </div>
                ))
              })()}
            </div>
            <div className="btn-row" style={{marginTop:12}}>
              <button className="btn secondary" onClick={()=> setModalCat('')}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminCoupons(){
  const navigate = useNavigate()
  const eid = getCurrentEstabId()
  const logged = localStorage.getItem(`adminLogged_${eid}`) === 'true'
  useEffect(()=> { if(!logged) navigate('/admin') }, [logged])
  const [coupons, setCoupons] = useState(()=> { try { return JSON.parse(localStorage.getItem(`coupons_${eid}`) || '[]') } catch(e){ return [] } })
  const [code, setCode] = useState('')
  const [type, setType] = useState('percent')
  const [value, setValue] = useState('')
  const [active, setActive] = useState(true)
  const add = () => {
    const v = parseFloat(value || '0')
    const c = { id: `${Date.now()}`, code, type, value: v, active }
    const list = [...coupons, c]
    setCoupons(list)
    localStorage.setItem(`coupons_${eid}`, JSON.stringify(list))
    setCode(''); setValue(''); setType('percent'); setActive(true)
  }
  const toggle = (id) => { const list = coupons.map(c=> c.id===id ? { ...c, active: !c.active } : c); setCoupons(list); localStorage.setItem(`coupons_${eid}`, JSON.stringify(list)) }
  const remove = (id) => { const list = coupons.filter(c=> c.id!==id); setCoupons(list); localStorage.setItem(`coupons_${eid}`, JSON.stringify(list)) }
  return (
    <div className="container">
      <AdminHeader title="Cupons" />
      <div className="section-card">
        <div className="row" style={{gap:12}}>
          <div className="field" style={{flex:1}}><label className="muted">Código</label><input value={code} onChange={(e)=> setCode(e.target.value)} /></div>
          <div className="field" style={{width:180}}><label className="muted">Tipo</label><select value={type} onChange={(e)=> setType(e.target.value)}><option value="percent">Percentual</option><option value="value">Valor</option></select></div>
          <div className="field" style={{width:180}}><label className="muted">Valor</label><input value={value} onChange={(e)=> setValue(e.target.value)} /></div>
          <div className="field" style={{width:180}}><label className="muted">Ativo</label><input type="checkbox" checked={active} onChange={(e)=> setActive(e.target.checked)} /></div>
        </div>
        <div style={{marginTop:8}}><button className="btn" disabled={!code.trim()} onClick={add}>Adicionar</button></div>
      </div>
      <div className="section-card">
        <div style={{fontWeight:700, marginBottom:6}}>Cupons cadastrados</div>
        {coupons.length===0 ? <div className="muted">Nenhum cupom cadastrado</div> : (
          <div className="menu-list">
            {coupons.map(c=> (
              <div key={c.id} className="row" style={{justifyContent:'space-between'}}>
                <div>{c.code} • {c.type==='percent'? `${c.value}%`:`R$ ${c.value.toFixed(2)}`}</div>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn outline" onClick={()=> toggle(c.id)}>{c.active? 'Desativar':'Ativar'}</button>
                  <button className="btn outline" onClick={()=> remove(c.id)}>Remover</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AdminItems(){
  const navigate = useNavigate()
  const eid = getCurrentEstabId()
  const logged = localStorage.getItem(`adminLogged_${eid}`) === 'true'
  useEffect(()=> { if(!logged) navigate('/admin') }, [logged])
  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const [estStatus, setEstStatus] = useState(null)
  useEffect(()=>{ fetch(`${apiBase}/api/establishment/${eid}/status`).then(r=> r.ok? r.json(): null).then(s=> setEstStatus(s)).catch(()=> setEstStatus(null)) }, [eid])
  const [catAvailability, setCatAvailability] = useState(()=> { try { return JSON.parse(localStorage.getItem(`categoriesAvailability_${eid}`) || '{}') } catch(e){ return {} } })
  const [products, setProducts] = useState(()=> getProductsLS() || mockProducts)
  const [cats, setCats] = useState(()=> getCategoriesLS() || mockCategories)
  useEffect(()=>{
    const load = async ()=>{
      try {
        const c = await fetch(`${apiBase}/api/categorias?establishment_id=${eid}`).then(r=> r.ok? r.json(): [])
        const p = await fetch(`${apiBase}/api/produtos?establishment_id=${eid}`).then(r=> r.ok? r.json(): [])
        const catsUi = (Array.isArray(c)? c: []).map(x=> ({ id: x.id, name: x.name, image: x.image_url || `https://picsum.photos/seed/cat-${x.id}/400/300` }))
        const prodsUi = (Array.isArray(p)? p: []).map(x=> ({
          id: x.id,
          name: x.name,
          basePrice: Number(x.base_price||0),
          image: x.image_url,
          category: x.category_id,
          status: x.status || 'active',
          available: !!x.available,
          descShort: x.desc_short || '',
          notes: x.notes || '',
          prepTimeMin: x.prep_time_min || undefined,
          stockQty: x.stock_qty || 0,
          autoStockControl: !!x.auto_stock_control,
          sku: x.sku || undefined,
          promoActive: !!x.promo_active,
          promoPrice: x.promo_price!=null? Number(x.promo_price): undefined,
        }))
        if (catsUi.length>0) setCats(catsUi)
        if (prodsUi.length>0) setProducts(prodsUi)
      } catch(e){}
    }
    load()
  }, [eid])
  const [selectedCat, setSelectedCat] = useState('')
  const [newName, setNewName] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newCat, setNewCat] = useState('')
  const [newDesc, setNewDesc] = useState('')
  // Imagem por upload (obrigatória)
  const [newImageData, setNewImageData] = useState('')
  const [newImageError, setNewImageError] = useState('')
  const [newStock, setNewStock] = useState('')
  const [newAutoStock, setNewAutoStock] = useState(true)
  const [newSku, setNewSku] = useState('')
  const [newPromoActive, setNewPromoActive] = useState(false)
  const [newPromoPrice, setNewPromoPrice] = useState('')
  // Campos exigidos pelo cadastro tipo iFood
  const [newStatus, setNewStatus] = useState('active') // 'active' | 'inactive'
  const [newAvailable, setNewAvailable] = useState(false)
  const [newPrepTime, setNewPrepTime] = useState('') // minutos
  const [newNotes, setNewNotes] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatImage, setNewCatImage] = useState('')
  const [newCatImageError, setNewCatImageError] = useState('')
  const prods = products
  // Edição inline
  const [editingId, setEditingId] = useState(null)
  const [draftName, setDraftName] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [draftProduct, setDraftProduct] = useState(null)
  const [editImageError, setEditImageError] = useState('')
  // Edição inline de categoria
  const [editingCatId, setEditingCatId] = useState(null)
  const [draftCatName, setDraftCatName] = useState('')
  const [draftCatImage, setDraftCatImage] = useState('')
  const toggleCat = (id) => { const next = { ...catAvailability, [id]: !(catAvailability[id]) }; setCatAvailability(next); localStorage.setItem(`categoriesAvailability_${eid}`, JSON.stringify(next)) }
  const handleNewImageChange = (e) => {
    try {
      const file = e.target.files && e.target.files[0]
      if (!file) { setNewImageData(''); setNewImageError(''); return }
      const okTypes = ['image/jpeg','image/png','image/webp']
      if (!okTypes.includes(file.type)) { setNewImageError('Formato inválido. Use JPG, PNG ou WebP.'); setNewImageData(''); return }
      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) { setNewImageError('Imagem acima de 5MB. Escolha um arquivo menor.'); setNewImageData(''); return }
      const reader = new FileReader()
      reader.onload = () => { setNewImageData(String(reader.result||'')); setNewImageError('') }
      reader.onerror = () => { setNewImageError('Falha ao ler o arquivo.'); setNewImageData('') }
      reader.readAsDataURL(file)
    } catch(e){ setNewImageError('Erro ao processar imagem.'); setNewImageData('') }
  }

  const handleNewCatImageChange = (e) => {
    try {
      const file = e.target.files && e.target.files[0]
      if (!file) { setNewCatImage(''); setNewCatImageError(''); return }
      const okTypes = ['image/jpeg','image/png','image/webp']
      if (!okTypes.includes(file.type)) { setNewCatImageError('Formato inválido. Use JPG, PNG ou WebP.'); setNewCatImage(''); return }
      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) { setNewCatImageError('Imagem acima de 5MB. Escolha um arquivo menor.'); setNewCatImage(''); return }
      const reader = new FileReader()
      reader.onload = () => { setNewCatImage(String(reader.result||'')); setNewCatImageError('') }
      reader.onerror = () => { setNewCatImageError('Falha ao ler o arquivo.'); setNewCatImage('') }
      reader.readAsDataURL(file)
    } catch(e){ setNewCatImageError('Erro ao processar imagem.'); setNewCatImage('') }
  }

  const handleEditProductImageChange = (e) => {
    try {
      const file = e.target.files && e.target.files[0]
      if (!file) { setEditImageError(''); setDraftProduct(prev=> ({ ...(prev||{}), image: '' })); return }
      const okTypes = ['image/jpeg','image/png','image/webp']
      if (!okTypes.includes(file.type)) { setEditImageError('Formato inválido. Use JPG, PNG ou WebP.'); return }
      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) { setEditImageError('Imagem acima de 5MB. Escolha um arquivo menor.'); return }
      const reader = new FileReader()
      reader.onload = () => { setDraftProduct(prev=> ({ ...(prev||{}), image: String(reader.result||'') })); setEditImageError('') }
      reader.onerror = () => { setEditImageError('Falha ao ler o arquivo.') }
      reader.readAsDataURL(file)
    } catch(e){ setEditImageError('Erro ao processar imagem.') }
  }

  const handleEditCatImageChange = (e) => {
    try {
      const file = e.target.files && e.target.files[0]
      if (!file) { setDraftCatImage(''); return }
      const okTypes = ['image/jpeg','image/png','image/webp']
      if (!okTypes.includes(file.type)) { setDraftCatImage(''); return }
      const maxBytes = 5 * 1024 * 1024
      if (file.size > maxBytes) { setDraftCatImage(''); return }
      const reader = new FileReader()
      reader.onload = () => { setDraftCatImage(String(reader.result||'')) }
      reader.readAsDataURL(file)
    } catch(e){}
  }

  const appendProductAudit = (entry) => {
    try {
      const eid = getCurrentEstabId()
      const key = `productsHistory_${eid}`
      const list = JSON.parse(localStorage.getItem(key) || '[]')
      list.push({ ...entry, at: new Date().toISOString() })
      localStorage.setItem(key, JSON.stringify(list))
    } catch(e){}
  }

  const addProduct = () => {
    const name = newName.trim()
    const price = (()=>{ const n = String(newPrice||'0').replace(',','.'); const v = parseFloat(n||'0'); return isNaN(v)? 0: v })()
    const cat = (newCat || selectedCat || '').trim()
    const desc = newDesc.trim()
    const stockQty = parseInt(newStock||'0', 10)
    const prep = parseInt(newPrepTime||'0',10)
    const catExists = cats.some(c=> c.id===cat)
    // Validações obrigatórias
    if (!name) { alert('Informe o nome do produto.'); return }
    if (!cat) { alert('Selecione uma categoria.'); return }
    if (!catExists) { alert('Categoria inexistente. Crie a categoria antes de prosseguir.'); return }
    if (!price || price<=0) { alert('Preço deve ser maior que zero.'); return }
    if (!newImageData) { alert('Imagem é obrigatória (JPG/PNG/WebP, até 5MB).'); return }
    if (!prep || prep<=0) { alert('Informe o tempo médio de preparo (minutos).'); return }
    const id = `${cat}-${name.toLowerCase().replace(/[^a-z0-9]+/gi,'-')}`
    const payload = {
      id,
      establishment_id: eid,
      category_id: cat,
      name,
      desc_short: desc,
      notes: newNotes.trim() || undefined,
      image_url: newImageData,
      base_price: price,
      promo_active: newPromoActive,
      promo_price: newPromoActive ? parseFloat(String(newPromoPrice||'0').replace(',','.')) : undefined,
      status: newStatus,
      available: newStatus==='active' ? !!newAvailable : false,
      prep_time_min: Math.max(1, prep),
      stock_qty: isNaN(stockQty)? 0: Math.max(0, stockQty),
      auto_stock_control: newAutoStock,
      sku: newSku.trim() || undefined,
      by_user_id: 'admin'
    }
    fetch(`${apiBase}/api/produtos`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      .then(r=> r.ok? r.json(): Promise.reject(r))
      .then(()=>{
        // reload
        return fetch(`${apiBase}/api/produtos?establishment_id=${eid}`).then(r=> r.json()).then(p=>{
          const prodsUi = (Array.isArray(p)? p: []).map(x=> ({
            id: x.id, name: x.name, basePrice: Number(x.base_price||0), image: x.image_url, category: x.category_id,
            status: x.status || 'active', available: !!x.available, descShort: x.desc_short || '', notes: x.notes || '',
            prepTimeMin: x.prep_time_min || undefined, stockQty: x.stock_qty || 0, autoStockControl: !!x.auto_stock_control,
            sku: x.sku || undefined, promoActive: !!x.promo_active, promoPrice: x.promo_price!=null? Number(x.promo_price): undefined,
          }))
          setProducts(prodsUi)
        })
      })
      .catch(()=>{})
    setNewName(''); setNewPrice(''); setNewCat(''); setNewDesc(''); setNewImageData(''); setNewImageError(''); setNewStock(''); setNewAutoStock(true); setNewSku(''); setNewPromoActive(false); setNewPromoPrice(''); setNewStatus('active'); setNewAvailable(false); setNewPrepTime(''); setNewNotes('')
    try { showToast({ titulo:'✅ Produto cadastrado', mensagem:`${name} foi adicionado com sucesso.`, tipo:'sucesso' }) } catch(e){}
  }
  const removeProduct = (id) => {
    const prod = products.find(p=> p.id===id)
    appendProductAudit({ action:'delete', by:'admin', id, name: prod?.name })
    fetch(`${apiBase}/api/produtos/${encodeURIComponent(id)}`, { method:'DELETE', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ establishment_id: eid, by_user_id: 'admin' }) })
      .then(()=> fetch(`${apiBase}/api/produtos?establishment_id=${eid}`).then(r=> r.json()).then(p=>{
        const prodsUi = (Array.isArray(p)? p: []).map(x=> ({
          id: x.id, name: x.name, basePrice: Number(x.base_price||0), image: x.image_url, category: x.category_id,
          status: x.status || 'active', available: !!x.available, descShort: x.desc_short || '', notes: x.notes || '',
          prepTimeMin: x.prep_time_min || undefined, stockQty: x.stock_qty || 0, autoStockControl: !!x.auto_stock_control,
          sku: x.sku || undefined, promoActive: !!x.promo_active, promoPrice: x.promo_price!=null? Number(x.promo_price): undefined,
        }))
        setProducts(prodsUi)
      }))
  }
  const updateProduct = (id, fields) => {
    const payload = {
      establishment_id: eid,
      by_user_id: 'admin',
      // map fields to API keys when needed
      name: fields.name,
      desc_short: fields.descShort,
      notes: fields.notes,
      image_url: fields.image,
      base_price: fields.basePrice,
      promo_active: fields.promoActive,
      promo_price: fields.promoPrice,
      status: fields.status,
      available: fields.available,
      prep_time_min: fields.prepTimeMin,
      stock_qty: fields.stockQty,
      auto_stock_control: fields.autoStockControl,
      sku: fields.sku,
      category_id: fields.category,
    }
    fetch(`${apiBase}/api/produtos/${encodeURIComponent(id)}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      .then(()=> fetch(`${apiBase}/api/produtos?establishment_id=${eid}`).then(r=> r.json()).then(p=>{
        const prodsUi = (Array.isArray(p)? p: []).map(x=> ({
          id: x.id, name: x.name, basePrice: Number(x.base_price||0), image: x.image_url, category: x.category_id,
          status: x.status || 'active', available: !!x.available, descShort: x.desc_short || '', notes: x.notes || '',
          prepTimeMin: x.prep_time_min || undefined, stockQty: x.stock_qty || 0, autoStockControl: !!x.auto_stock_control,
          sku: x.sku || undefined, promoActive: !!x.promo_active, promoPrice: x.promo_price!=null? Number(x.promo_price): undefined,
        }))
        setProducts(prodsUi)
      }))
  }
  const toggleAvailable = (id) => {
    const p = products.find(x=> x.id===id)
    if (!p) return
    if ((p.status||'active')==='inactive') { alert('Ative o status do produto antes de disponibilizar.'); return }
    if (!p.available){
      // Validar antes de ativar
      const hasCat = !!p.category
      const hasImage = !!(p.image && p.image.trim())
      const stockOk = !p.autoStockControl || ((p.stockQty||0) > 0)
      if (!hasCat || !hasImage || !stockOk){
        alert('Não é possível ativar: verifique categoria, imagem e estoque válido.')
        return
      }
    }
    fetch(`${apiBase}/api/produtos/${encodeURIComponent(id)}/disponibilidade`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ establishment_id: eid, available: !p.available, by_user_id:'admin' }) })
      .then(()=> fetch(`${apiBase}/api/produtos?establishment_id=${eid}`).then(r=> r.json()).then(p=>{
        const prodsUi = (Array.isArray(p)? p: []).map(x=> ({
          id: x.id, name: x.name, basePrice: Number(x.base_price||0), image: x.image_url, category: x.category_id,
          status: x.status || 'active', available: !!x.available, descShort: x.desc_short || '', notes: x.notes || '',
          prepTimeMin: x.prep_time_min || undefined, stockQty: x.stock_qty || 0, autoStockControl: !!x.auto_stock_control,
          sku: x.sku || undefined, promoActive: !!x.promo_active, promoPrice: x.promo_price!=null? Number(x.promo_price): undefined,
        }))
        setProducts(prodsUi)
      }))
  }
  const addCategory = () => {
    const name = newCatName.trim()
    if (!name) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/gi,'-')
    if (cats.some(c=> c.id===id)) { return }
    const image = newCatImage || `https://picsum.photos/seed/cat-${id}/400/300`
    fetch(`${apiBase}/api/categorias`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ establishment_id: eid, id, name, image_url: image }) })
      .then(()=> fetch(`${apiBase}/api/categorias?establishment_id=${eid}`).then(r=> r.json()).then(c=>{
        const catsUi = (Array.isArray(c)? c: []).map(x=> ({ id: x.id, name: x.name, image: x.image_url || `https://picsum.photos/seed/cat-${x.id}/400/300` }))
        setCats(catsUi)
      }))
    setNewCatName(''); setNewCatImage('')
  }
  const updateCategory = (id, fields={}) => {
    const payload = { establishment_id: eid, name: fields.name, image_url: fields.image_url }
    return fetch(`${apiBase}/api/categorias/${encodeURIComponent(id)}`, { method:'PUT', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
      .then(()=> fetch(`${apiBase}/api/categorias?establishment_id=${eid}`).then(r=> r.json()).then(c=>{
        const catsUi = (Array.isArray(c)? c: []).map(x=> ({ id: x.id, name: x.name, image: x.image_url || `https://picsum.photos/seed/cat-${x.id}/400/300` }))
        setCats(catsUi)
      }))
  }
  return (
    <div className="container">
      <AdminHeader title="Itens" />
      {(() => { const s = estStatus; const gated = !!s && (s.status!=='active' || s.billing_status!=='paid'); return gated ? (
        <div className="section-card" style={{marginTop:12}}>
          <div style={{fontWeight:700}}>Acesso restrito</div>
          <div className="muted" style={{marginTop:4}}>Estabelecimento inativo ou com pagamento pendente. Entre em contato com a SVN PEDIDOS.</div>
        </div>
      ) : null })()}
      {/* Removido bloco redundante de "Status dos itens"; status agora é editado inline por produto */}
      <div className="section-card">
        <div style={{fontWeight:700, marginBottom:6}}>Categorias</div>
        {cats.map(c => (
          <div key={c.id} className="row" style={{justifyContent:'space-between', marginTop:8, alignItems:'center'}}>
            {editingCatId === c.id ? (
              <>
                <div style={{display:'flex', gap:8, alignItems:'center', flex:1}}>
                  <input style={{flex:2}} value={draftCatName} onChange={(e)=> setDraftCatName(e.target.value)} placeholder="Nome da categoria" />
                  <div className="field" style={{flex:2}}>
                    <label className="muted" htmlFor={`edit-cat-image-${c.id}`}>Imagem (JPG/PNG/WebP)</label>
                    <input id={`edit-cat-image-${c.id}`} name="editCatImage" aria-label="Imagem da categoria (edição)" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditCatImageChange} />
                  </div>
                </div>
                <div style={{display:'flex', gap:8}}>
                  <button className="btn" onClick={()=> {
                    const nextName = draftCatName.trim() || c.name
                    const nextImage = draftCatImage || c.image || ''
                    updateCategory(c.id, { name: nextName, image_url: nextImage })
                    setEditingCatId(null); setDraftCatName(''); setDraftCatImage('')
                  }} disabled={!!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))}>Salvar</button>
                  <button className="btn outline" onClick={()=> { setEditingCatId(null); setDraftCatName(''); setDraftCatImage('') }}>Cancelar</button>
                </div>
              </>
            ) : (
              <>
                <div>{c.name}</div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <span className="muted">{catAvailability[c.id] ? 'Indisponível' : 'Disponível'}</span>
                  <button className="btn outline" onClick={()=> toggleCat(c.id)} disabled={!!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))}>{catAvailability[c.id] ? 'Reativar' : 'Inativar'}</button>
                  <button className="btn outline" onClick={()=> { setEditingCatId(c.id); setDraftCatName(c.name); setDraftCatImage(c.image||'') }} disabled={!!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))}>Editar</button>
                </div>
              </>
            )}
          </div>
        ))}
        <div style={{marginTop:12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Criar nova categoria</div>
          <div className="row" style={{gap:12}}>
            <div className="field" style={{flex:1}}><label className="muted">Nome</label><input value={newCatName} onChange={(e)=> setNewCatName(e.target.value)} placeholder="Ex: Bolos para Festas" /></div>
            <div className="field" style={{flex:1}}>
              <label className="muted" htmlFor="new-cat-image">Imagem (JPG/PNG/WebP • opcional)</label>
              <input id="new-cat-image" name="newCatImage" aria-label="Imagem da categoria (nova)" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleNewCatImageChange} />
              {newCatImageError && <div className="muted" style={{color:'#b91c1c'}}>{newCatImageError}</div>}
            </div>
          </div>
          <div style={{marginTop:8}}><button className="btn" onClick={addCategory} disabled={!newCatName.trim() || !!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))}>Adicionar categoria</button></div>
        </div>
      </div>
      <div className="section-card">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
          <div style={{fontWeight:700}}>Gerenciar produtos por categoria</div>
          <div style={{display:'flex', gap:8}}>
            <select value={selectedCat} onChange={(e)=> setSelectedCat(e.target.value)}>
              <option value="">Todas</option>
              {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="menu-list" style={{marginTop:8}}>
          {prods.filter(p=> !selectedCat || p.category===selectedCat).map(p=> (
            <div key={p.id} className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
              {editingId === p.id ? (
                <>
                  <div style={{display:'flex', flexDirection:'column', gap:8, flex:1}}>
                    <div className="row" style={{gap:8}}>
                      <input aria-label="Nome do produto" title="Nome do produto (obrigatório)" style={{flex:2}} value={draftProduct?.name||''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), name: e.target.value }))} placeholder="Nome do produto" />
                      <select aria-label="Categoria" title="Categoria do produto" style={{flex:1}} value={draftProduct?.category||''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), category: e.target.value }))}>
                        <option value="">Não Categorizado</option>
                        {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="field" style={{width:160}}>
                        <label className="muted">Valor do produto*</label>
                        <input aria-label="Valor do produto" title="Preço base em reais" value={draftProduct?.basePrice??''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), basePrice: parseFloat(String(e.target.value||'').replace(',','.'))||0 }))} placeholder="0,00" />
                      </div>
                    </div>
                    <div className="row" style={{gap:8}}>
                      <input aria-label="Descrição curta" title="Breve resumo visível ao cliente" style={{flex:2}} value={draftProduct?.descShort||''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), descShort: e.target.value }))} placeholder="Descrição curta" />
                      <div className="field" style={{flex:2}}>
                        <label className="muted" htmlFor={`edit-product-image-${p.id}`}>Imagem (JPG/PNG/WebP)</label>
                        <input id={`edit-product-image-${p.id}`} name="editProductImage" aria-label="Imagem do produto (edição)" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleEditProductImageChange} />
                        {editImageError && <div className="muted" style={{color:'#b91c1c'}}>{editImageError}</div>}
                      </div>
                    </div>
                    <div className="row" style={{gap:8}}>
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <label className="muted">Promoção ativa</label>
                        <input type="checkbox" checked={!!draftProduct?.promoActive} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), promoActive: e.target.checked }))} />
                      </div>
                      <input style={{width:160}} value={draftProduct?.promoPrice??''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), promoPrice: parseFloat(String(e.target.value||'').replace(',','.'))||0 }))} placeholder="Preço promo" disabled={!draftProduct?.promoActive} />
                      <select aria-label="Status do produto" title="Controla se o produto aparece para o cliente" style={{width:200}} value={draftProduct?.status||'active'} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), status: e.target.value }))}>
                        <option value="active">Ativo (visível e disponível)</option>
                        <option value="inactive">Inativo (oculto/indisponível)</option>
                      </select>
                    </div>
                    <div className="row" style={{gap:8}}>
                      <input aria-label="Quantidade em estoque" title="Quantidade disponível para venda" style={{width:140}} value={draftProduct?.stockQty??0} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), stockQty: parseInt(e.target.value||'0',10)||0 }))} placeholder="Estoque" />
                      <div style={{display:'flex', alignItems:'center', gap:8}}>
                        <label className="muted">Auto estoque</label>
                        <input type="checkbox" checked={!!draftProduct?.autoStockControl} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), autoStockControl: e.target.checked }))} />
                      </div>
                      <input aria-label="SKU" title="Código interno para controle (opcional)" style={{width:200}} value={draftProduct?.sku||''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), sku: e.target.value }))} placeholder="SKU (opcional)" />
                      <input aria-label="Tempo de preparo" title="Tempo médio de preparo em minutos" style={{width:160}} value={draftProduct?.prepTimeMin??''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), prepTimeMin: parseInt(e.target.value||'0',10)||0 }))} placeholder="Tempo (min)" />
                      <input aria-label="Observações" title="Observações internas ou ao cliente" style={{flex:1}} value={draftProduct?.notes||''} onChange={(e)=> setDraftProduct(prev=>({ ...(prev||{}), notes: e.target.value }))} placeholder="Observações" />
                    </div>
                    <div className="muted" role="status" aria-live="polite">
                      {(!draftProduct?.name?.trim()) ? 'Informe o nome do produto.' : ''}
                      {((typeof draftProduct?.basePrice !== 'number') || (draftProduct?.basePrice < 0)) ? ' Preço base deve ser um número ≥ 0.' : ''}
                      {(draftProduct?.promoActive && ((typeof draftProduct?.promoPrice !== 'number') || (draftProduct?.promoPrice < 0))) ? ' Preço promo deve ser um número ≥ 0.' : ''}
                    </div>
                  </div>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn" onClick={()=> {
                      const fields = {
                        name: (draftProduct?.name||p.name).trim(),
                        category: draftProduct?.category || p.category || '',
                        basePrice: typeof draftProduct?.basePrice==='number'? draftProduct.basePrice : p.basePrice,
                        descShort: draftProduct?.descShort ?? p.descShort,
                        image: (draftProduct?.image||p.image||'').trim(),
                        promoActive: !!draftProduct?.promoActive,
                        promoPrice: draftProduct?.promoActive ? (typeof draftProduct?.promoPrice==='number'? draftProduct.promoPrice : (p.promoPrice||0)) : undefined,
                        status: draftProduct?.status || p.status || 'active',
                        available: (draftProduct?.status || p.status || 'active') === 'active',
                        stockQty: typeof draftProduct?.stockQty==='number'? draftProduct.stockQty : p.stockQty,
                        autoStockControl: !!draftProduct?.autoStockControl,
                        sku: (draftProduct?.sku||p.sku||'').trim() || undefined,
                        prepTimeMin: typeof draftProduct?.prepTimeMin==='number'? draftProduct.prepTimeMin : p.prepTimeMin,
                        notes: draftProduct?.notes ?? p.notes,
                      }
                      updateProduct(p.id, fields)
                      setEditingId(null); setDraftName(''); setDraftCategory(''); setDraftProduct(null)
                    }} disabled={!!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid')) || !draftProduct?.name?.trim() || (typeof draftProduct?.basePrice!=='number' || draftProduct?.basePrice<0) || (draftProduct?.promoActive && (typeof draftProduct?.promoPrice!=='number' || draftProduct?.promoPrice<0))}>Salvar</button>
                    <button className="btn outline" onClick={()=> { setEditingId(null); setDraftName(''); setDraftCategory(''); setDraftProduct(null) }}>Cancelar</button>
                  </div>
                </>
              ) : (
                <>
                  <div>{p.name} • <span className="muted">{cats.find(c=>c.id===p.category)?.name || 'Não Categorizado'}</span></div>
                  <div style={{display:'flex', gap:8}}>
                    <button className="btn outline" onClick={()=> { setEditingId(p.id); setDraftName(p.name); setDraftCategory(p.category||''); setDraftProduct({ name:p.name, category:p.category||'', basePrice:p.basePrice, descShort:p.descShort||'', image:p.image||'', promoActive:!!p.promoActive, promoPrice:p.promoPrice??'', status:p.status||'active', available:!!p.available, stockQty:p.stockQty||0, autoStockControl:!!p.autoStockControl, sku:p.sku||'', prepTimeMin:p.prepTimeMin||'', notes:p.notes||'' }) }} disabled={!!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))}>Editar</button>
                    <button className="btn outline" onClick={()=> removeProduct(p.id)} disabled={!!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))}>Remover</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        <div style={{marginTop:12}}>
          <div style={{fontWeight:600, marginBottom:6}}>Adicionar produto</div>
          <div className="row" style={{gap:12}}>
            <div className="field" style={{flex:1}}><label className="muted">Nome</label><input value={newName} onChange={(e)=> setNewName(e.target.value)} placeholder="Ex: Tradicional" /></div>
            <div className="field" style={{width:160}}><label className="muted">Preço base</label><input value={newPrice} onChange={(e)=> setNewPrice(e.target.value)} placeholder="0,00" /></div>
            <div className="field" style={{width:240}}>
              <label className="muted">Categoria (obrigatória)</label>
              <select value={newCat} onChange={(e)=> setNewCat(e.target.value)}>
                <option value="">Selecione</option>
                {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>
          <div className="row" style={{gap:12, marginTop:8}}>
            <div className="field" style={{flex:2}}><label className="muted">Descrição</label><input value={newDesc} onChange={(e)=> setNewDesc(e.target.value)} maxLength={200} placeholder="Breve e informativa" /></div>
            <div className="field" style={{flex:2}}>
              <label className="muted" htmlFor="new-product-image">Imagem (JPG/PNG/WebP) • Máx 5MB</label>
              <input id="new-product-image" name="newProductImage" aria-label="Imagem do produto (novo)" type="file" accept="image/jpeg,image/png,image/webp" onChange={handleNewImageChange} />
              {newImageError && <div className="muted" style={{color:'#b91c1c'}}>{newImageError}</div>}
            </div>
          </div>
          <div className="row" style={{gap:12, marginTop:8}}>
            <div className="field" style={{width:180}}><label className="muted">Tempo médio (min)</label><input value={newPrepTime} onChange={(e)=> setNewPrepTime(e.target.value)} placeholder="Ex: 20" /></div>
            <div className="field" style={{flex:1}}><label className="muted">Observações (opcional)</label><input value={newNotes} onChange={(e)=> setNewNotes(e.target.value)} placeholder="Ex: acompanha molho" /></div>
          </div>
          <div className="row" style={{gap:12, marginTop:8}}>
            <div className="field" style={{width:160}}><label className="muted">Estoque</label><input value={newStock} onChange={(e)=> setNewStock(e.target.value)} placeholder="0" /></div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <label className="muted">Controle automático de estoque</label>
              <input type="checkbox" checked={newAutoStock} onChange={(e)=> setNewAutoStock(e.target.checked)} />
            </div>
            <div className="field" style={{width:200}}><label className="muted">SKU (opcional)</label><input value={newSku} onChange={(e)=> setNewSku(e.target.value)} placeholder="Código interno" /></div>
          </div>
          <div className="row" style={{gap:12, marginTop:8}}>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <label className="muted">Promoção ativa</label>
              <input type="checkbox" checked={newPromoActive} onChange={(e)=> setNewPromoActive(e.target.checked)} />
            </div>
            <div className="field" style={{width:160}}><label className="muted">Preço promocional</label><input value={newPromoPrice} onChange={(e)=> setNewPromoPrice(e.target.value)} placeholder="0,00" disabled={!newPromoActive} /></div>
            <div className="field" style={{width:160}}><label className="muted">Status</label><select value={newStatus} onChange={(e)=> setNewStatus(e.target.value)}><option value="active">Ativo</option><option value="inactive">Inativo</option></select></div>
            <div style={{display:'flex', alignItems:'center', gap:8}}>
              <label className="muted">Disponibilidade</label>
              <input type="checkbox" checked={newAvailable} onChange={(e)=> setNewAvailable(e.target.checked)} />
            </div>
          </div>
          <div style={{marginTop:8}}>
            <button className="btn" onClick={addProduct} disabled={!newName.trim() || !newCat || !newImageData || !(parseFloat(String(newPrice||'0').replace(',','.'))>0) || !(parseInt(newPrepTime||'0',10)>0) || !!(estStatus && (estStatus.status!=='active' || estStatus.billing_status!=='paid'))} >Salvar produto</button>
          </div>
        </div>
      </div>
      <div className="section-card">
        <div style={{fontWeight:700}}>Não Categorizados</div>
        <div className="menu-list" style={{marginTop:8}}>
          {prods.filter(p=> !p.category || !cats.find(c=> c.id===p.category)).map(p=> (
            <div key={p.id} className="row" style={{justifyContent:'space-between'}}>
              <div>{p.name}</div>
              <div style={{display:'flex', gap:8}}>
                <select onChange={(e)=> updateProduct(p.id, { category: e.target.value })} defaultValue="">
                  <option value="">Definir categoria…</option>
                  {cats.map(c=> <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button className="btn outline" onClick={()=> removeProduct(p.id)}>Remover</button>
              </div>
            </div>
          ))}
          {prods.filter(p=> !p.category || !cats.find(c=> c.id===p.category)).length===0 && (
            <div className="muted">Nenhum item sem categoria</div>
          )}
        </div>
      </div>
    </div>
  )
}

function AdminCities(){
  const navigate = useNavigate()
  const eid = getCurrentEstabId()
  const logged = localStorage.getItem(`adminLogged_${eid}`) === 'true'
  useEffect(()=> { if(!logged) navigate('/admin') }, [logged])
  const { establishment, setEstablishment } = useContext(EstablishmentContext)
  const [cityInput, setCityInput] = useState('')
  const known = ['Petrolina','Juazeiro','Lagoa Grande','Sobradinho','Casa Nova']
  const addCity = () => {
    const name = cityInput.trim()
    if (!name) return
    const prev = establishment?.deliveryCities || []
    const exists = prev.some(c => c.city.toLowerCase() === name.toLowerCase())
    if (exists) { setCityInput(''); return }
    const next = [...prev, { city:name, uf:'', allowed:true, fee: 0 }]
    setEstablishment({ ...(establishment || {}), deliveryCities: next })
    setCityInput('')
  }
  const removeCity = (name) => {
    const prev = establishment?.deliveryCities || []
    const next = prev.filter(c => c.city !== name)
    setEstablishment({ ...(establishment || {}), deliveryCities: next })
  }
  return (
    <div className="container">
      <AdminHeader title="Cidades de entrega" />
      <div className="section-card">
        <div className="field" style={{maxWidth:420}}>
          <label className="muted">Digite o nome da cidade</label>
          <input list="cities" placeholder="Ex: Petrolina" value={cityInput} onChange={(e)=> setCityInput(e.target.value)} />
          <datalist id="cities">
            {known.map(c=> <option key={c} value={c} />)}
          </datalist>
        </div>
        <div style={{marginTop:8}}><button className="btn" onClick={addCity}>Adicionar</button></div>
      </div>
      <div className="section-card">
        <div style={{fontWeight:700}}>Cidades cadastradas</div>
        <div className="menu-list">
          {(establishment?.deliveryCities || []).map(c => (
            <div key={c.city} className="row" style={{justifyContent:'space-between'}}>
              <div>{c.city} {c.uf && `• ${c.uf}`}</div>
              <button className="btn outline" onClick={()=> removeCity(c.city)}>Remover</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Success(){
  const navigate = useNavigate()
  const { auth } = useContext(AuthContext)
  const { establishment } = useContext(EstablishmentContext)
  // Busca o último pedido salvo para montar a mensagem
  const lastOrder = (() => {
    const list = getOrdersLS()
    return (list && list.length > 0) ? list[list.length - 1] : null
  })()

  useEffect(() => {
    if (!lastOrder) return
    const fmt = (n) => {
      try {
        const v = typeof n === 'number' ? n : parseFloat(n || '0')
        return v.toFixed(2).replace('.', ',')
      } catch { return '0,00' }
    }
    const addr = auth?.address || {}
    const street = [addr.street, addr.number].filter(Boolean).join(' ')
    const neighborhood = addr.neighborhood || ''
    const city = addr.city || ''
    const uf = addr.uf || ''
    const mapsQuery = [street, neighborhood, city, uf].filter(Boolean).join(', ')
    const linkMaps = `https://maps.google.com/?q=${encodeURIComponent(mapsQuery)}`
    const itensMsg = (lastOrder.items || []).map(it => {
      const unit = fmt(it.unitPrice)
      const total = fmt((it.unitPrice || 0) * (it.qty || 0))
      const choice = it.choice ? ` ${it.choice}` : ''
      return `• *${it.qty}x ${it.name}${choice}* — R$ ${unit} → R$ ${total}`
    }).join('\n')
    const prazo = '40' // padrão; pode ser dinamizado futuramente
    const loja = establishment?.name || 'Mundo Doce'
    const msg = [
      `*🛍️ NOVO PEDIDO - ${loja}*`,
      '',
      `#️⃣ Pedido Nº: *${lastOrder.id}*`,
      `📅 Feito em: ${lastOrder.createdAt}`,
      '',
      `👤 Cliente: *${auth?.name || 'Cliente'}*`,
      `📞 Telefone: ${auth?.phone || ''}`,
      '',
      '📍 Endereço de entrega:',
      street || '—',
      `Complemento: ${addr.complement || '—'}`,
      `Bairro: ${neighborhood || '—'}`,
      '',
      `🔗 Localização: ${linkMaps}`,
      '',
      '———————————————',
      '🧺 *Itens do pedido*',
      itensMsg || '—',
      '———————————————',
      '',
      `💰 Subtotal: *R$ ${fmt(lastOrder.subtotal)}*`,
      `🚚 Entrega: *R$ ${fmt(lastOrder.fee)}*`,
      `🧾 Total: *R$ ${fmt(lastOrder.total)}*`,
      '',
      `💳 Pagamento: *${lastOrder.paymentMethod}*`,
      '',
      `🕐 Prazo estimado: ${prazo} minutos`
    ].join('\n')
    try {
      const eid = getCurrentEstabId()
      const sentKey = `wa_sent_order_${eid}_${lastOrder.id}`
      const waNumber = localStorage.getItem(`whatsappNumber_${eid}`) || '5587988474060'
      if (!localStorage.getItem(sentKey)){
        const url = `https://wa.me/${waNumber}?text=` + encodeURIComponent(msg)
        // Redirecionar imediatamente para o WhatsApp, ao invés de abrir nova aba
        window.location.href = url
        localStorage.setItem(sentKey, 'true')
      }
    } catch(e) {}
  }, [])
  return (
    <div className="container" style={{textAlign:'center'}}>
      <div style={{width:72, height:72, borderRadius:36, background:'var(--primary)', display:'inline-flex', alignItems:'center', justifyContent:'center', margin:'12px auto'}}>
        <span style={{color:'#000', fontSize:32}}>✓</span>
      </div>
      <h2>Pedido enviado com sucesso!</h2>
      <div className="muted">Obrigado por pedir com a gente! Você pode acompanhar seu pedido através da página “Meus Pedidos”.</div>
      <div className="banner" style={{margin:'16px auto', maxWidth:560}}>
        <div>
          <div style={{fontWeight:600}}>Ative as notificações</div>
          <div className="muted">para ser avisado quando seu pedido mudar de status.</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn outline">NÃO AGORA</button>
          <button className="btn">ATIVAR</button>
        </div>
      </div>
      <div style={{display:'flex', gap:12, justifyContent:'center'}}>
        <button className="btn" onClick={()=> navigate(lastOrder ? `/pedido/${lastOrder.id}` : '/pedidos')}>Acompanhar meu pedido</button>
        <button className="btn outline" onClick={()=> navigate('/')}>Continuar comprando</button>
      </div>
      <Footer />
      <Tabs />
    </div>
  )
}

function Profile(){
  const navigate = useNavigate()
  const [showComplete, setShowComplete] = useState(true)
  return (
    <div className="container">
      <h2 className="page-title">Perfil</h2>
      <div className="section-card">
        <div className="menu-list">
          <button className="linklike" onClick={()=> setShowComplete(true)}>Editar perfil</button>
          <button className="linklike" onClick={()=> alert('Trocar senha em breve')}>Trocar senha</button>
          <button className="linklike" onClick={()=> navigate('/fidelidade')}>Programa de fidelidade</button>
          <Link to="/estabelecimento">Configurar estabelecimento</Link>
          <button className="linklike" onClick={()=> alert('Sair (mock)')}>Sair</button>
        </div>
      </div>

      {showComplete && (
        <CompleteProfileModal onClose={()=> setShowComplete(false)} />
      )}
      <Footer />
      <Tabs />
    </div>
  )
}

function CompleteProfileModal({ onClose }){
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [pass, setPass] = useState('')
  const [confirm, setConfirm] = useState('')
  const canConfirm = phone.trim() && name.trim() && pass && confirm && pass === confirm
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple" onClick={(e)=> e.stopPropagation()}>
        <div className="row">
          <h3 style={{margin:0}}>Faltam algumas informações</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="muted">Você só precisa preencher estes dados uma vez</div>
        <div className="field" style={{marginTop:12}}>
          <label className="muted">Telefone *</label>
          <input placeholder="(87) 99999-9999" value={phone} onChange={(e)=> setPhone(e.target.value)} />
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="muted">Seu nome *</label>
          <input placeholder="Seu nome" value={name} onChange={(e)=> setName(e.target.value)} />
        </div>
        <div className="muted" style={{marginTop:12}}>Escolha uma senha. Ela será usada para garantir que só você terá acesso a suas informações e benefícios</div>
        <div className="field" style={{marginTop:12}}>
          <label className="muted">Senha *</label>
          <input type="password" placeholder="Senha" value={pass} onChange={(e)=> setPass(e.target.value)} />
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="muted">Confirmar Senha *</label>
          <input type="password" placeholder="Confirmar Senha" value={confirm} onChange={(e)=> setConfirm(e.target.value)} />
        </div>
        <div style={{marginTop:12}}>
          <button className="btn" disabled={!canConfirm} onClick={onClose}>CONFIRMAR</button>
        </div>
      </div>
    </div>
  )
}

function Loyalty(){
  return (
    <div className="container">
      <h2 className="page-title">Programa de fidelidade</h2>
      <div className="section-card">
        <div>A cada R$ 1,00 em compras você ganha 1 ponto que pode ser trocado por prêmios.</div>
        <div className="muted" style={{marginTop:6}}>Complete seu cadastro para começar a pontuar.</div>
      </div>
      <Footer />
      <Tabs />
    </div>
  )
}

export default function App() {
  const [coupon, setCoupon] = useState(null)
  const [establishment, setEstablishment] = useState(() => {
    try {
      const eidLS = localStorage.getItem('currentEstabId')
      let eidFromEst = null
      try { eidFromEst = (JSON.parse(localStorage.getItem('establishment')||'{}')||{}).id || null } catch {}
      const eid = eidLS || eidFromEst || (mockEstablishment && mockEstablishment.id) || 'mundodocen5'
      const perKey = localStorage.getItem(`establishment_${eid}`)
      if (perKey) return JSON.parse(perKey)
      const stored = localStorage.getItem('establishment')
      return stored ? JSON.parse(stored) : mockEstablishment
    } catch {
      return mockEstablishment
    }
  })
  const [auth, setAuth] = useState(() => {
    try {
      const stored = localStorage.getItem('auth')
      return stored ? JSON.parse(stored) : { loggedIn:false, phone:'', name:'', address:null, savedAddresses:[] }
    } catch {
      return { loggedIn:false, phone:'', name:'', address:null, savedAddresses:[] }
    }
  })
  const [cart, setCart] = useState(() => {
    try {
      const eid = getCurrentEstabId()
      const stored = localStorage.getItem(`cart_${eid}`)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  // Migração automática: se houver dados antigos da Tita no localStorage, trocar para Mundo Doce
  useEffect(() => {
    try {
      const raw = localStorage.getItem('establishment')
      const prev = raw ? JSON.parse(raw) : null
      const wasTita = prev && (prev.id === 'tita' || /tita/i.test((prev.name||'')))
      if (wasTita) {
        const updated = { ...prev, id: 'mundodocen5', name: 'Mundo Doce - Bolos Caseiros' }
        localStorage.setItem('establishment', JSON.stringify(updated))
        localStorage.setItem('currentEstabId', 'mundodocen5')
        localStorage.setItem('establishment_mundodocen5', JSON.stringify(updated))
        try { localStorage.removeItem('establishment_tita') } catch {}
        setEstablishment(updated)
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem('establishment', JSON.stringify(establishment))
      const eid = (establishment?.id) || localStorage.getItem('currentEstabId') || (mockEstablishment && mockEstablishment.id) || 'mundodocen5'
      if (eid) localStorage.setItem(`establishment_${eid}`, JSON.stringify(establishment))
    } catch {}
  }, [establishment])
  // Aplicar tema do estabelecimento via CSS variables
  useEffect(() => {
    const est = establishment || {}
    const root = document.documentElement
    const setVar = (key, val) => { try { root.style.setProperty(key, val) } catch {} }
    setVar('--primary', est.brandPrimary || '#f599cf')
    setVar('--accent', est.brandAccent || '#7b4a2e')
    setVar('--bg', est.brandBg || '#f4f5f7')
    setVar('--text', est.brandText || '#1f2937')
    setVar('--muted', est.brandMuted || '#6b7280')
    try {
      const themeMeta = document.querySelector('meta[name="theme-color"]')
      if (themeMeta) themeMeta.setAttribute('content', est.brandPrimary || '#f599cf')
    } catch {}
  }, [establishment])
  // Atualizar título da aba e metatags OG quando o nome mudar
  useEffect(() => {
    const name = (establishment?.name && establishment.name.trim()) || 'Seu Estabelecimento'
    try { document.title = name } catch {}
    try {
      const setMeta = (prop, content) => {
        const el = document.querySelector(`meta[property="${prop}"]`)
        if (el) el.setAttribute('content', content)
      }
      setMeta('og:site_name', name)
      setMeta('og:title', name)
    } catch {}
  }, [establishment?.name])
  // Atualizar favicon com a logomarca (avatar) do estabelecimento
  useEffect(() => {
    const logoSrc = establishment?.avatarImage || establishment?.coverImage
    if (!logoSrc) return
    try {
      const link = document.querySelector('link[rel="icon"]') || document.createElement('link')
      link.setAttribute('rel','icon')
      link.setAttribute('type','image/png')
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.src = logoSrc
      img.onload = () => {
        try {
          const size = 64
          const canvas = document.createElement('canvas')
          canvas.width = size
          canvas.height = size
          const ctx = canvas.getContext('2d')
          ctx.clearRect(0,0,size,size)
          ctx.save()
          ctx.beginPath(); ctx.arc(size/2, size/2, size/2, 0, Math.PI*2); ctx.closePath(); ctx.clip()
          ctx.drawImage(img, 0, 0, size, size)
          ctx.restore()
          const url = canvas.toDataURL('image/png')
          link.href = url
          if (!link.isConnected) document.head.appendChild(link)
        } catch {
          // Ignorar erro de CORS e manter favicon padrão
        }
      }
    } catch {}
  }, [establishment?.avatarImage, establishment?.coverImage])
  useEffect(() => {
    try {
      localStorage.setItem('auth', JSON.stringify(auth))
    } catch {}
  }, [auth])
  useEffect(() => {
    try {
      const eid = getCurrentEstabId()
      localStorage.setItem(`cart_${eid}`, JSON.stringify(cart))
    } catch {}
  }, [cart])
  return (
    <EstablishmentContext.Provider value={{ establishment, setEstablishment }}>
    <CouponContext.Provider value={{ coupon, setCoupon }}>
    <AuthContext.Provider value={{ auth, setAuth }}>
    <CartContext.Provider value={{ cart, setCart }}>
    {(() => { const loc = useLocation(); const isAdmin = loc.pathname.startsWith('/admin'); return (
      <div className={isAdmin? 'admin-shell' : 'site-shell'}>
        {!isAdmin && <TopNav />}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/promocoes" element={<Promotions />} />
          <Route path="/pedidos" element={<Orders />} />
          <Route path="/pedido/:id" element={<OrderDetails />} />
          <Route path="/telefone" element={<PhoneStep />} />
          <Route path="/entrega" element={<DeliveryType />} />
          <Route path="/sacola" element={<Sacola />} />
          <Route path="/entrar" element={<LoginStep />} />
          <Route path="/sucesso" element={<Success />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/fidelidade" element={<Loyalty />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/rv-pedidos" element={<RVPedidos />} />
          <Route path="/estabelecimento" element={<EstabConfig />} />
          <Route path="/admin/estabelecimento" element={<EstabConfig />} />
          <Route path="/admin" element={<AdminLogin />} />
          <Route path="/admin/painel" element={<AdminPanel />} />
          <Route path="/admin/pedidos" element={<AdminOrders />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/cupons" element={<AdminCoupons />} />
          <Route path="/admin/itens" element={<AdminItems />} />
          <Route path="/admin/cidades" element={<AdminCities />} />
          <Route path="*" element={<Home />} />
        </Routes>
        <Toasts />
      </div>
    ) })()}
    </CartContext.Provider>
    </AuthContext.Provider>
    </CouponContext.Provider>
    </EstablishmentContext.Provider>
  )
}

// Container de Toasts (visual discreto marrom)
function Toasts(){
  const [list, setList] = useState([])
  useEffect(()=>{
    const handler = (e)=>{
      const t = e.detail || {}
      setList(prev => [...prev, t])
      const ms = Math.max(1000, parseInt(t.duracao||5000,10))
      setTimeout(()=> setList(prev => prev.filter(x=> x.id!==t.id)), ms)
    }
    window.addEventListener('appToast', handler)
    return ()=> window.removeEventListener('appToast', handler)
  }, [])
  const bg = 'var(--accent)'
  const color = '#fff'
  return (
    <div style={{position:'fixed', right:16, bottom:16, display:'flex', flexDirection:'column', gap:8, zIndex:1000}}>
      {list.map(t => (
        <div key={t.id} style={{minWidth:280, maxWidth:360, background:bg, color, borderRadius:10, padding:'10px 12px', boxShadow:'0 6px 20px rgba(0,0,0,0.2)'}}>
          {t.titulo && <div style={{fontWeight:700, marginBottom:4}}>{t.titulo}</div>}
          <div style={{opacity:0.95}}>{t.mensagem}</div>
        </div>
      ))}
    </div>
  )
}

function Footer(){
  const { establishment } = useContext(EstablishmentContext)
  const year = new Date().getFullYear()
  const waNumber = '5574981213461'
  return (
    <footer className="footer">
      <div className="left">{(establishment && establishment.name) || 'Seu Estabelecimento'} - {year}. Todos os direitos reservados</div>
      <div className="right">
        <a className="whatsapp-link" href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Olá! Quero contratar a plataforma SVN PEDIDOS.')}`} target="_blank" rel="noopener noreferrer">Plataforma fornecida por SVN PEDIDOS, Clique para contratar</a>
      </div>
    </footer>
  )
}

function RVPedidos(){
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [insta, setInsta] = useState('')
  const canGo = name.trim() && phone.trim() && insta.trim()
  return (
    <div className="rv-container">
      <div className="rv-progress"><div className="bar" /></div>
      <div style={{textAlign:'center', marginBottom:8}}>
        <div style={{fontWeight:800}}>RV Pedidos</div>
      </div>
      <div className="rv-card">
        <h2 className="rv-title">Seja Bem vindo(a) RV PEDIDOS!</h2>
        <div className="rv-sub">Você está no Rv Pedidos, aqui você irá responder para entendermos as suas necessidades.</div>
        <img className="rv-hero" src="https://picsum.photos/seed/rv/1000/600" alt="Sistema RV Pedidos" loading="lazy" decoding="async" />
        <h3 style={{margin:'8px 0'}}>Precisamos te conhecer.</h3>
        <div className="rv-form">
          <div className="rv-field">
            <label className="muted">Como deseja ser chamado! *</label>
            <input placeholder="Seu nome" value={name} onChange={(e)=> setName(e.target.value)} />
          </div>
          <div className="rv-field">
            <label className="muted">Numero para contato *</label>
            <input placeholder="Seu numero de whatsapp" value={phone} onChange={(e)=> setPhone(e.target.value)} />
          </div>
          <div className="rv-field">
            <label className="muted">Qual instagram do seu delivery? *</label>
            <input placeholder="Digite aqui..." value={insta} onChange={(e)=> setInsta(e.target.value)} />
          </div>
          <button className="rv-btn" disabled={!canGo} onClick={()=> navigate('/')}>Continuar</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}

// Modal de informações do estabelecimento
function EstablishmentInfoModal({ onClose }){
  const { establishment } = useContext(EstablishmentContext)
  const est = establishment || mockEstablishment
  const [tab, setTab] = useState('sobre')
  const waNumber = '5574981213461'
  const instaHandle = (est.instagram || '').replace(/^@/, '')
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple" onClick={(e)=> e.stopPropagation()}>
        <div className="row">
          <h3 style={{margin:0}}>{(est.name || 'Estabelecimento').toUpperCase()}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div className="info-tabs">
          <button className={tab==='sobre'? 'active':''} onClick={()=> setTab('sobre')}>SOBRE</button>
          <button className={tab==='horario'? 'active':''} onClick={()=> setTab('horario')}>HORÁRIO</button>
          <button className={tab==='pagamento'? 'active':''} onClick={()=> setTab('pagamento')}>PAGAMENTO</button>
        </div>

        {tab === 'sobre' && (
          <div>
            <div className="row" style={{alignItems:'center', gap:12}}>
              <img className="estab-avatar" src={est.avatarImage || mockEstablishment.avatarImage} alt="Logo" loading="lazy" decoding="async" />
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h4l2-2h4l2 2h4v12H4V7zm8 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"></path></svg>
                {instaHandle ? (
                  <a className="insta-link" href={`https://instagram.com/${instaHandle}`} target="_blank" rel="noopener noreferrer" style={{fontWeight:600, textDecoration:'none'}}>{est.instagram}</a>
                ) : (
                  <div style={{fontWeight:600}}>@instagram</div>
                )}
              </div>
            </div>

            <h3 style={{margin:'16px 0 8px'}}>Contato</h3>
            <div className="contact-buttons" style={{display:'flex', gap:12, flexWrap:'wrap'}}>
              <a className="contact-btn" href={`https://wa.me/${waNumber}?text=${encodeURIComponent('Olá! Quero fazer um pedido.')}`} target="_blank" rel="noopener noreferrer">
                <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 0 0-9.95 11.18A10 10 0 0 0 12 22a10 10 0 0 0 10-10A10 10 0 0 0 12 2zm.06 17.5c-1.7 0-3.3-.5-4.7-1.5l-3.1.8.8-3.1c-1.1-1.4-1.6-3-1.6-4.7 0-4.3 3.5-7.8 7.8-7.8s7.8 3.5 7.8 7.8-3.5 7.5-7.8 7.5zm3.4-4.2c-.2-.1-1.3-.6-1.5-.7-.2-.1-.3-.1-.5.1-.1.2-.6.7-.7.8-.1.1-.3.1-.5 0-1-.5-1.8-1-2.5-1.8-.2-.2-.5-.5-.6-.8-.1-.2 0-.4.1-.6.1-.1.2-.3.3-.5.1-.2.1-.3 0-.5-.1-.2-.5-1.3-.7-1.7-.2-.4-.4-.3-.5-.3h-.4c-.1 0-.4.1-.5.3-.2.2-.7.7-.7 1.8 0 1 .7 2 1.5 2.8 1.1 1.1 2.4 1.8 3.8 2.2.4.1.7.1 1 .1.3 0 .7 0 1-.2.3-.1 1.3-.6 1.5-.8.2-.1.3-.2.4-.3.1-.2.1-.4 0-.5-.2-.2-.4-.3-.6-.4z"></path></svg>
                <span>WhatsApp {est.phones?.[0] || '(74) 98121-3461'}</span>
              </a>
              <a className="contact-btn" href={`tel:+${waNumber}`}>
                <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.56 0 1 .44 1 1v3.5c0 .56-.44 1-1 1C10.61 22 2 13.39 2 3.5c0-.56.44-1 1-1H6.5c.56 0 1 .44 1 1 0 1.24.2 2.45.57 3.57.12.35.03.75-.24 1.02l-2.2 2.2z"></path></svg>
                <span>Ligar {est.phones?.[0] || '(74) 98121-3461'}</span>
              </a>
            </div>

            <h3 style={{margin:'16px 0 8px'}}>Endereço</h3>
            <div className="muted">
              {(est.addressLines || mockEstablishment.addressLines || []).map((line, idx)=> (
                <div key={idx}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {tab === 'horario' && (
          <div>
            {(() => {
              const hours = est.hours || mockEstablishment.hours || []
              const now = new Date()
              const dayIdx = now.getDay()
              const dayLabels = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
              const parseTime = (s) => { const [hh,mm] = s.split(':').map(x=>parseInt(x,10)); return hh*60+mm }
              return hours.map((h, idx) => {
                const isToday = h.label === dayLabels[dayIdx]
                const norm = (h.value||'').replace(/\s+/g,' ').trim()
                const isClosed = /fechado/i.test(norm)
                let status = 'closed', label = 'Fechado'
                if (!isClosed && /\d{2}:\d{2}\s*[—-]\s*\d{2}:\d{2}/.test(norm)) {
                  const parts = norm.split(/—|-/).map(p=>p.trim())
                  const startMin = parseTime(parts[0])
                  const endMin = parseTime(parts[1])
                  const curMin = now.getHours()*60 + now.getMinutes()
                  if (isToday && curMin>=startMin && curMin<=endMin) { status = 'open'; label = 'Aberto agora' }
                  else { status = 'schedule'; label = 'Fora do horário' }
                }
                return (
                  <div key={idx} className="row" style={{justifyContent:'flex-start', padding:'4px 0', background: isToday? 'rgba(14,165,233,0.06)' : 'transparent', borderRadius:8}}>
                    <div style={{width:160, fontWeight:isToday?700:600}}>{h.label}</div>
                    <span className={`open-badge status-${status}`} style={{marginRight:12}}>{label}</span>
                    <div className="muted" style={{fontWeight:600}}>{norm || '—'}</div>
                  </div>
                )
              })
            })()}
          </div>
        )}

        {tab === 'pagamento' && (
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            {(est.payments || mockEstablishment.payments || []).map((p)=> {
              const iconMap = {
                'Dinheiro': '💵',
                'Pix': '⚡',
                'Cartão de crédito': '💳',
                'Cartão de débito': '💳',
                'Transferência': '🔁'
              }
              const icon = iconMap[p] || '💳'
              return (
                <span key={p} className="pay-pill"><span className="icon">{icon}</span>{p}</span>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
// Página de configuração do estabelecimento
function EstabConfig(){
  const navigate = useNavigate()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith('/admin')
  const { establishment, setEstablishment } = useContext(EstablishmentContext)
  const dayLabels = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
  const ensureSevenDays = (inHours) => {
    const list = Array.isArray(inHours) ? inHours : []
    const mapByLabel = {}
    list.forEach(h => { if (h && h.label) mapByLabel[h.label] = h.value || '' })
    // Expand "Segunda a Sexta" se existir
    const segSex = mapByLabel['Segunda a Sexta'] || mapByLabel['Segunda à Sexta'] || mapByLabel['Seg a Sex']
    const sab = mapByLabel['Sábado']
    const dom = mapByLabel['Domingo']
    const result = []
    dayLabels.forEach(lbl => {
      let val = mapByLabel[lbl]
      if (!val && segSex && ['Segunda','Terça','Quarta','Quinta','Sexta'].includes(lbl)) val = segSex
      if (!val && lbl==='Sábado' && sab) val = sab
      if (!val && lbl==='Domingo' && dom) val = dom
      result.push({ label: lbl, value: (val || '') })
    })
    // Preencher defaults se vazio
    return result.map(h => ({ label: h.label, value: h.value || 'Fechado' }))
  }
  const [id, setId] = useState(establishment?.id || '')
  const [adminPassword, setAdminPassword] = useState(establishment?.adminPassword || (localStorage.getItem('adminAccessKey') || 'RVADMIN'))
  const [name, setName] = useState(establishment?.name || '')
  const [city, setCity] = useState(establishment?.city || '')
  const [uf, setUf] = useState(establishment?.uf || '')
  const [instagram, setInstagram] = useState(establishment?.instagram || '')
  const eid = getCurrentEstabId()
  const [whatsapp, setWhatsapp] = useState(() => {
    try {
      const fromLS = localStorage.getItem(`whatsappNumber_${eid}`) || ''
      const fromEstab = Array.isArray(establishment?.phones) ? (establishment.phones[0] || '') : ''
      return fromLS || fromEstab || ''
    } catch { return '' }
  })
  const [coverImage, setCoverImage] = useState(establishment?.coverImage || '')
  const [avatarImage, setAvatarImage] = useState(establishment?.avatarImage || '')
  // Tema do estabelecimento (cores)
  const [brandPrimary, setBrandPrimary] = useState(establishment?.brandPrimary || '#f599cf')
  const [brandAccent, setBrandAccent] = useState(establishment?.brandAccent || '#7b4a2e')
  const [brandBg, setBrandBg] = useState(establishment?.brandBg || '#f4f5f7')
  const [brandText, setBrandText] = useState(establishment?.brandText || '#1f2937')
  const [brandMuted, setBrandMuted] = useState(establishment?.brandMuted || '#6b7280')
  const paymentOptions = ['Dinheiro', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Transferência']
  const [payments, setPayments] = useState(establishment?.payments || paymentOptions)
  const [hours, setHours] = useState(ensureSevenDays(establishment?.hours || mockEstablishment.hours))
  // Editor de imagem (crop/resize)
  const [editor, setEditor] = useState(null) // { src, w, h, setter, title }
  const isValidDayValue = (val) => {
    const norm = String(val||'').replace(/\s+/g,' ').trim()
    if (!norm) return false
    if (/fechado/i.test(norm)) return true
    const segs = norm.split(',').map(s=> s.trim()).filter(Boolean)
    if (segs.length===0) return false
    const parse = (t)=> { const [hh,mm] = t.split(':').map(x=>parseInt(x,10)); return hh*60+mm }
    const ranges = []
    for (const seg of segs){
      const m = seg.match(/^(\d{2}:\d{2})\s*[—-]\s*(\d{2}:\d{2})$/)
      if (!m) return false
      const s = parse(m[1]); const e = parse(m[2])
      if (s>=e) return false
      ranges.push([s,e])
    }
    ranges.sort((a,b)=> a[0]-b[0])
    for (let i=1;i<ranges.length;i++){ if (ranges[i][0] < ranges[i-1][1]) return false }
    return true
  }
  const onSelectImage = (file, setter) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const isCover = setter === setCoverImage
      const aspect = isCover ? { w: 1180, h: 360 } : { w: 512, h: 512 }
      setEditor({ src: reader.result, w: aspect.w, h: aspect.h, setter, title: isCover? 'Ajustar capa' : 'Ajustar avatar' })
    }
    reader.readAsDataURL(file)
  }
  const canSave = name.trim().length > 0 && (hours||[]).every(h => isValidDayValue(h.value)) && !!normalizePhone(whatsapp)
  const parseDayValue = (val) => {
    const norm = String(val||'').replace(/\s+/g,' ').trim()
    if (!norm || /fechado/i.test(norm)) return []
    return norm.split(',').map(s=> s.trim()).filter(Boolean).map(seg => {
      const parts = seg.split(/—|-/).map(p=>p.trim())
      return { start: parts[0]||'', end: parts[1]||'' }
    })
  }
  const stringifyDayValue = (ranges) => {
    const list = (ranges||[]).filter(r=> (r?.start||'').trim() || (r?.end||'').trim())
    return list.length ? list.map(r=> `${r.start} — ${r.end}`).join(', ') : ''
  }
  const rgbToHex = (r,g,b) => '#' + [r,g,b].map(x=> {
    const n = Math.max(0, Math.min(255, parseInt(x,10) || 0))
    return n.toString(16).padStart(2,'0')
  }).join('')
  const normalizeColorToHex = (val) => {
    const s = String(val||'').trim()
    if (!s) return '#000000'
    if (s.startsWith('#')) {
      const h = s.replace('#','')
      if (h.length===3) return '#' + h.split('').map(c=> c+c).join('')
      if (h.length===6) return '#' + h.toLowerCase()
      return '#' + h.substring(0,6).toLowerCase()
    }
    const m = s.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i)
    if (m) return rgbToHex(m[1], m[2], m[3])
    // fallback: deixar como está (CSS aceitará nomes), mas não será hex
    return s
  }
  const save = () => {
    const next = { ...(establishment || {}), id, adminPassword, name, city, uf, instagram, coverImage, avatarImage, payments, hours: ensureSevenDays(hours), brandPrimary: normalizeColorToHex(brandPrimary), brandAccent: normalizeColorToHex(brandAccent), brandBg: normalizeColorToHex(brandBg), brandText: normalizeColorToHex(brandText), brandMuted: normalizeColorToHex(brandMuted), phones: [whatsapp].filter(Boolean) }
    // Persistir estabelecimento no backend para habilitar cardápio
    try {
      if (id?.trim()) {
        fetch(`${apiBase}/api/establishment`, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ id: id.trim(), name, city, uf }) }).catch(()=>{})
      }
    } catch {}
    setEstablishment(next)
    try {
      if (id?.trim()) {
        localStorage.setItem('currentEstabId', id.trim())
        localStorage.setItem(`establishment_${id.trim()}`, JSON.stringify(next))
        localStorage.setItem('establishment', JSON.stringify(next))
      }
    } catch {}
    try {
      const keyId = (id?.trim() || eid)
      const waDigits = normalizePhone(whatsapp)
      if (waDigits) localStorage.setItem(`whatsappNumber_${keyId}`, waDigits)
    } catch {}
    navigate('/admin/painel')
  }
  // Preview instantâneo de cores enquanto edita
  useEffect(() => {
    const root = document.documentElement
    const setVar = (k,v) => { try { root.style.setProperty(k, v) } catch {} }
    setVar('--primary', brandPrimary)
    setVar('--accent', brandAccent)
    setVar('--bg', brandBg)
    setVar('--text', brandText)
    setVar('--muted', brandMuted)
  }, [brandPrimary, brandAccent, brandBg, brandText, brandMuted])
  const computePreviewOpenStatus = () => {
    const now = new Date()
    const idx = now.getDay() // 0 Dom ... 6 Sáb
    const labelsFull = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado']
    const todayLabel = labelsFull[idx]
    const todayEntry = (hours.find(h => h.label === todayLabel) || { value: '' }).value || ''
    const norm = todayEntry.replace(/\s+/g,' ').trim()
    const isClosed = /fechado/i.test(norm)
    const parseTime = (s) => { const [hh,mm] = s.split(':').map(x=>parseInt(x,10)); return hh*60+mm }
    const between = (s,e,c) => c>=s && c<=e
    let status = 'closed', label = 'Fechado hoje'
    if (!isClosed && norm.length>0){
      const segs = norm.split(',').map(s=> s.trim()).filter(Boolean)
      const cur = now.getHours()*60 + now.getMinutes()
      let matched = null
      for (const seg of segs){
        const m = seg.match(/^(\d{2}:\d{2})\s*[—-]\s*(\d{2}:\d{2})$/)
        if (!m) continue
        const s = parseTime(m[1]); const e = parseTime(m[2])
        if (between(s,e,cur)) { matched = seg; break }
      }
      if (matched){ status='open'; label = `Aberto agora • Hoje: ${matched}` } else { status='schedule'; label='Fora do horário • Apenas agendamento' }
    } else if (isClosed) {
      for (let i=1;i<=7;i++){
        const d = labelsFull[(idx+i)%7]
        const h = (hours.find(x=>x.label===d)||{ value:'' }).value || ''
        const n = h.replace(/\s+/g,' ').trim()
        if (!/fechado/i.test(n) && n.length>0){
          const firstSeg = (n.split(',')[0]||'').trim()
          const startStr = firstSeg.split(/—|-/)[0]?.trim() || ''
          label = `Fechado hoje • Abrimos ${i===1? 'amanhã' : `em ${i} dias`} às ${startStr}`
          break
        }
      }
    }
    return { status, label }
  }
  return (
    <div className="container">
      {isAdmin ? <AdminHeader title="Configurar Estabelecimento" /> : <h2 className="page-title">Configurar Estabelecimento</h2>}
      <div className="section-card">
        {isAdmin && (
          <div className="row" style={{gap:12}}>
            <div className="field" style={{flex:1}}>
              <label className="muted">ID do estabelecimento *</label>
              <input placeholder="Ex: tita" value={id} onChange={(e)=> setId(e.target.value)} />
            </div>
            <div className="field" style={{flex:1}}>
              <label className="muted">Senha de administração *</label>
              <input type="password" placeholder="Defina sua senha" value={adminPassword} onChange={(e)=> setAdminPassword(e.target.value)} />
            </div>
          </div>
        )}
        <div className="field">
          <label className="muted">Nome do estabelecimento *</label>
          <input placeholder="Ex: Pizzaria do João" value={name} onChange={(e)=> setName(e.target.value)} />
        </div>
        {isAdmin && (
          <div className="row" style={{gap:12, marginTop:12}}>
            <div className="field" style={{flex:1}}>
              <label className="muted" htmlFor="cover-image">Foto de capa (upload)</label>
              <input id="cover-image" name="coverImage" aria-label="Foto de capa" type="file" accept="image/*" onChange={(e)=> onSelectImage(e.target.files?.[0], setCoverImage)} />
            </div>
            <div className="field" style={{flex:1}}>
              <label className="muted" htmlFor="avatar-image">Logo/Perfil (upload)</label>
              <input id="avatar-image" name="avatarImage" aria-label="Logo/Perfil" type="file" accept="image/*" onChange={(e)=> onSelectImage(e.target.files?.[0], setAvatarImage)} />
            </div>
          </div>
        )}
      <div className="row" style={{gap:12, marginTop:12}}>
        <div style={{flex:1}}>
          <div className="muted">Preview capa</div>
          {coverImage ? (
            <img src={coverImage} alt="Capa" style={{width:'100%', height:120, objectFit:'cover', borderRadius:10}} loading="lazy" decoding="async" />
          ) : (
            <div className="muted">Selecione um arquivo para visualizar</div>
          )}
        </div>
        <div style={{width:160}}>
          <div className="muted">Preview logo</div>
          {avatarImage ? (
            <img src={avatarImage} alt="Logo" style={{width:'100%', height:120, objectFit:'cover', borderRadius:10}} loading="lazy" decoding="async" />
          ) : (
            <div className="muted">Selecione um arquivo para visualizar</div>
          )}
        </div>
      </div>
      {!isAdmin && (
      <div className="section-card" style={{marginTop:12}}>
        <div style={{fontWeight:700, marginBottom:8}}>Pré-visualização do site</div>
        <div className="hero" style={{marginTop:8}}>
          <div className="hero-bg">
            <img className="estab-cover" src={coverImage || establishment?.coverImage || mockEstablishment.coverImage} alt="Capa do estabelecimento" loading="eager" fetchpriority="high" decoding="async" />
            <div className="hero-gradient" />
          </div>
          <div className="hero-content mobile">
            <div className="avatar-card">
              <img className="avatar-img" src={avatarImage || establishment?.avatarImage || mockEstablishment.avatarImage} alt="Logo" loading="eager" fetchpriority="high" decoding="async" />
            </div>
            <h1 className="hero-title" style={{marginTop:8}}>{name || establishment?.name || mockEstablishment.name}</h1>
            <div className="hero-info" style={{marginTop:6}}>
              {(() => { const os = computePreviewOpenStatus(); return (<span className={`open-badge status-${os.status}`}>{os.label}</span>) })()}
              <span className="hero-dot" />
              <span style={{display:'inline-flex', alignItems:'center', gap:6}}>
                <svg className="icon-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.13 2 5 5.13 5 9c0 4.17 4.42 9.92 6.24 12.11.4.48 1.13.48 1.53 0C14.58 18.92 19 13.17 19 9c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"></path></svg>
                {(city || establishment?.city || mockEstablishment.city)} - {(uf || establishment?.uf || mockEstablishment.uf)}
              </span>
            </div>
          </div>
        </div>
      </div>
      )}
        <div className="field" style={{marginTop:12}}>
          <label className="muted">Instagram (somente o @)</label>
          <input placeholder="@seuinstagram" value={instagram} onChange={(e)=> setInstagram(e.target.value)} />
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="muted">WhatsApp do estabelecimento *</label>
          <input placeholder="(74) 98121-3461" value={whatsapp} onChange={(e)=> setWhatsapp(e.target.value)} />
          <div className="muted">Informe com DDD. Salvamos automaticamente como número internacional.</div>
        </div>
        <div className="row" style={{gap:12, marginTop:12}}>
          <div className="field" style={{flex:1}}>
            <label className="muted">Cidade</label>
            <input placeholder="Cidade" value={city} onChange={(e)=> setCity(e.target.value)} />
          </div>
          <div className="field" style={{width:120}}>
            <label className="muted">UF</label>
            <input placeholder="UF" value={uf} onChange={(e)=> setUf(e.target.value)} />
          </div>
        </div>
        <div className="section-separator" style={{marginTop:16}} />
        <div style={{marginTop:8}}>
          <div style={{fontWeight:700, marginBottom:6}}>Cores do estabelecimento</div>
        <div className="row" style={{gap:12, alignItems:'stretch'}}>
          <div className="field" style={{flex:1}}>
            <label className="muted">Primária</label>
            <div className="color-stack">
              <span className="color-swatch circle" title={normalizeColorToHex(brandPrimary)} style={{background: brandPrimary}} />
              <input className="color-input" type="color" value={normalizeColorToHex(brandPrimary)} onChange={(e)=> setBrandPrimary(e.target.value)} />
              <input className="hex-input" type="text" value={normalizeColorToHex(brandPrimary)} onChange={(e)=> setBrandPrimary(normalizeColorToHex(e.target.value))} placeholder="#rrggbb" />
            </div>
          </div>
          <div className="field" style={{flex:1}}>
            <label className="muted">Destaque (accent)</label>
            <div className="color-stack">
              <span className="color-swatch circle" title={normalizeColorToHex(brandAccent)} style={{background: brandAccent}} />
              <input className="color-input" type="color" value={normalizeColorToHex(brandAccent)} onChange={(e)=> setBrandAccent(e.target.value)} />
              <input className="hex-input" type="text" value={normalizeColorToHex(brandAccent)} onChange={(e)=> setBrandAccent(normalizeColorToHex(e.target.value))} placeholder="#rrggbb" />
            </div>
          </div>
          <div className="field" style={{flex:1}}>
            <label className="muted">Fundo</label>
            <div className="color-stack">
              <span className="color-swatch circle" title={normalizeColorToHex(brandBg)} style={{background: brandBg}} />
              <input className="color-input" type="color" value={normalizeColorToHex(brandBg)} onChange={(e)=> setBrandBg(e.target.value)} />
              <input className="hex-input" type="text" value={normalizeColorToHex(brandBg)} onChange={(e)=> setBrandBg(normalizeColorToHex(e.target.value))} placeholder="#rrggbb" />
            </div>
          </div>
          <div className="field" style={{flex:1}}>
            <label className="muted">Texto</label>
            <div className="color-stack">
              <span className="color-swatch circle" title={normalizeColorToHex(brandText)} style={{background: brandText}} />
              <input className="color-input" type="color" value={normalizeColorToHex(brandText)} onChange={(e)=> setBrandText(e.target.value)} />
              <input className="hex-input" type="text" value={normalizeColorToHex(brandText)} onChange={(e)=> setBrandText(normalizeColorToHex(e.target.value))} placeholder="#rrggbb" />
            </div>
          </div>
          <div className="field" style={{flex:1}}>
            <label className="muted">Texto secundário (muted)</label>
            <div className="color-stack">
              <span className="color-swatch circle" title={normalizeColorToHex(brandMuted)} style={{background: brandMuted}} />
              <input className="color-input" type="color" value={normalizeColorToHex(brandMuted)} onChange={(e)=> setBrandMuted(e.target.value)} />
              <input className="hex-input" type="text" value={normalizeColorToHex(brandMuted)} onChange={(e)=> setBrandMuted(normalizeColorToHex(e.target.value))} placeholder="#rrggbb" />
            </div>
          </div>
        </div>
        </div>
        <div className="section-separator" style={{marginTop:16}} />
        <div style={{marginTop:8}}>
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:700}}>Horário de funcionamento</div>
            <div className="btn-group">
              <button type="button" className="btn btn-xs outline" onClick={()=> {
                setHours(prev => prev.map(x => ({ ...x, value: '' })))
              }}>Limpar todos os campos</button>
            </div>
          </div>
          {(hours||[]).map((h, idx) => {
            const norm = (h.value||'').replace(/\s+/g,' ').trim()
            const isClosed = /fechado/i.test(norm)
            const ranges = parseDayValue(norm)
            const setRanges = (nextRanges) => {
              const v = stringifyDayValue(nextRanges)
              setHours(prev => prev.map((x,i)=> i===idx ? { ...x, value: v } : x))
            }
            const changeRange = (ri, field, val) => {
              const next = [...ranges]; next[ri] = { ...next[ri], [field]: val }
              setRanges(next)
            }
            const addRange = () => {
              const next = [...ranges, { start:'', end:'' }]
              setRanges(next)
            }
            const removeRange = (ri) => {
              const next = ranges.filter((_,i)=> i!==ri)
              setRanges(next)
            }
            const clearDay = () => setHours(prev => prev.map((x,i)=> i===idx ? { ...x, value: '' } : x))
            const invalid = (!isClosed && !isValidDayValue(stringifyDayValue(ranges)))
            return (
              <div key={h.label||idx} className="row" style={{gap:12, alignItems:'center', marginTop:6, flexWrap:'wrap'}}>
                <div className="muted" style={{width:80}}>{h.label}</div>
                <label style={{display:'flex', alignItems:'center', gap:6}}>
                  <input type="checkbox" checked={isClosed} onChange={(e)=> {
                    const v = e.target.checked ? 'Fechado' : stringifyDayValue(ranges)
                    setHours(prev => prev.map((x,i)=> i===idx ? { ...x, value: v } : x))
                  }} />
                  <span>Fechado</span>
                </label>
                {(!isClosed && ranges.length===0) && (<div className="muted">Sem períodos</div>)}
                {(!isClosed) && ranges.map((r,ri) => (
                  <div key={ri} style={{display:'flex', alignItems:'center', gap:8}}>
                    <input className="time-mini" type="time" value={r.start} onChange={(e)=> changeRange(ri,'start', e.target.value)} />
                    <span className="muted">—</span>
                    <input className="time-mini" type="time" value={r.end} onChange={(e)=> changeRange(ri,'end', e.target.value)} />
                    <button type="button" className="btn btn-xs outline" onClick={()=> removeRange(ri)}>×</button>
                  </div>
                ))}
                {invalid && (
                  <div className="muted" style={{color:'#ef4444'}}>Informe períodos válidos (início antes de fim, sem sobreposição)</div>
                )}
                <div className="btn-group" style={{gap:6, width:'100%', marginTop:6}}>
                  <button type="button" className="btn btn-xs outline" disabled={isClosed || ranges.length>=3} onClick={addRange}>Adicionar período</button>
                  <button type="button" className="btn btn-xs outline" onClick={clearDay}>Limpar dia</button>
                  <button type="button" className="btn btn-xs outline" onClick={()=> {
                    const sourceVal = (hours[idx]?.value||'').trim()
                    setHours(prev => prev.map((x,i)=> {
                      if (i === idx) return x
                      const lbl = (x.label||'').toLowerCase()
                      const isWeekday = /(segunda|terça|terca|quarta|quinta|sexta)/i.test(lbl)
                      return isWeekday ? { ...x, value: sourceVal } : x
                    }))
                  }}>Replicar p/ dias úteis</button>
                  <button type="button" className="btn btn-xs outline" onClick={()=> {
                    const sourceVal = (hours[idx]?.value||'').trim()
                    setHours(prev => prev.map((x,i)=> i===idx ? x : { ...x, value: sourceVal }))
                  }}>Replicar p/ todos</button>
                </div>
              </div>
            )
          })}
        </div>
        <div className="field" style={{marginTop:12}}>
          <label className="muted">Formas de pagamento aceitas</label>
          <div style={{display:'flex', gap:12, flexWrap:'wrap', marginTop:6}}>
            {paymentOptions.map(opt => {
              const checked = payments.includes(opt)
              return (
                <label key={opt} style={{display:'flex', alignItems:'center', gap:6}}>
                  <input type="checkbox" checked={checked} onChange={(e)=> {
                    setPayments(prev => {
                      if (e.target.checked) return [...prev, opt]
                      return prev.filter(p => p !== opt)
                    })
                  }} />
                  <span>{opt}</span>
                </label>
              )
            })}
          </div>
      </div>
      <div style={{marginTop:12}}>
        <button className="btn btn-lg btn-block" disabled={!canSave} onClick={save}>Salvar e voltar</button>
      </div>
      {editor && (
        <ImageEditorModal
          src={editor.src}
          aspectW={editor.w}
          aspectH={editor.h}
          title={editor.title}
          onClose={()=> setEditor(null)}
          onConfirm={(data)=> { editor.setter(data); setEditor(null) }}
        />
      )}
    </div>
    <Footer />
  </div>
  )
}

function ImageEditorModal({ src, aspectW, aspectH, title='Ajustar imagem', onClose, onConfirm }){
  const [scale, setScale] = React.useState(1)
  const [offsetX, setOffsetX] = React.useState(0)
  const [offsetY, setOffsetY] = React.useState(0)
  const canvasRef = React.useRef(null)
  const imgRef = React.useRef(null)
  const draggingRef = React.useRef(false)
  const lastRef = React.useRef({ x: 0, y: 0 })
  React.useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = src
    img.onload = () => { imgRef.current = img; draw() }
  }, [src])
  React.useEffect(() => { draw() }, [scale, offsetX, offsetY])
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v))
  const draw = () => {
    const canvas = canvasRef.current; const img = imgRef.current
    if (!canvas || !img) return
    canvas.width = aspectW; canvas.height = aspectH
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0,0,canvas.width,canvas.height)
    const iw = img.naturalWidth; const ih = img.naturalHeight
    const base = Math.max(aspectW/iw, aspectH/ih)
    const s = base * clamp(scale, 1, 3)
    // Limites para offsets (em pixels do output)
    const maxX = (iw*s - aspectW)/2
    const maxY = (ih*s - aspectH)/2
    const dx = aspectW/2 - (iw*s)/2 + clamp(offsetX, -maxX, maxX)
    const dy = aspectH/2 - (ih*s)/2 + clamp(offsetY, -maxY, maxY)
    ctx.drawImage(img, dx, dy, iw*s, ih*s)
  }
  const getPoint = (e) => {
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY }
    }
    return { x: e.clientX, y: e.clientY }
  }
  const startDrag = (e) => {
    e.preventDefault()
    draggingRef.current = true
    lastRef.current = getPoint(e)
  }
  const moveDrag = (e) => {
    if (!draggingRef.current) return
    e.preventDefault()
    const p = getPoint(e)
    const dx = p.x - lastRef.current.x
    const dy = p.y - lastRef.current.y
    lastRef.current = p
    const c = canvasRef.current
    if (!c) return
    const fx = aspectW / Math.max(1, c.clientWidth)
    const fy = aspectH / Math.max(1, c.clientHeight)
    setOffsetX(o => o + dx * fx)
    setOffsetY(o => o + dy * fy)
  }
  const endDrag = () => { draggingRef.current = false }
  React.useEffect(() => {
    const onMouseMove = (ev) => moveDrag(ev)
    const onMouseUp = () => endDrag()
    const onTouchMove = (ev) => moveDrag(ev)
    const onTouchEnd = () => endDrag()
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [])
  const onWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY < 0 ? 0.06 : -0.06
    setScale(s => clamp(s + delta, 1, 3))
  }
  const confirm = () => {
    const url = canvasRef.current?.toDataURL('image/jpeg', 0.92)
    if (url) onConfirm(url)
  }
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal simple" onClick={(e)=> e.stopPropagation()}>
        <div className="row" style={{alignItems:'center'}}>
          <h3 style={{margin:0}}>{title}</h3>
          <button className="close" onClick={onClose}>×</button>
        </div>
        <div style={{display:'grid', gap:12}}>
          <canvas
            ref={canvasRef}
            className="image-editor-canvas"
            onMouseDown={startDrag}
            onTouchStart={startDrag}
            onWheel={onWheel}
          />
          <div className="row" style={{gap:12}}>
            <div className="field" style={{flex:1}}>
              <label className="muted">Zoom</label>
              <input type="range" min={1} max={3} step={0.01} value={scale} onChange={(e)=> setScale(parseFloat(e.target.value))} />
            </div>
            <div className="field" style={{flex:1}}>
              <label className="muted">Horizontal</label>
              <input type="range" min={-aspectW} max={aspectW} step={1} value={offsetX} onChange={(e)=> setOffsetX(parseFloat(e.target.value))} />
            </div>
            <div className="field" style={{flex:1}}>
              <label className="muted">Vertical</label>
              <input type="range" min={-aspectH} max={aspectH} step={1} value={offsetY} onChange={(e)=> setOffsetY(parseFloat(e.target.value))} />
            </div>
          </div>
          <div className="row" style={{gap:8, justifyContent:'flex-end'}}>
            <button className="linklike" onClick={onClose}>Cancelar</button>
            <button className="btn" onClick={confirm}>Aplicar</button>
          </div>
        </div>
      </div>
    </div>
  )
}