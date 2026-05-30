import { useState, useEffect } from 'react'
import './App.css'

import { auth } from './firebase'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut
} from 'firebase/auth'

const API_URL = 'https://mfteka7hvh.execute-api.us-east-2.amazonaws.com'

const CATEGORY_IMAGES = [
  { name: 'Basketball', image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop' },
  { name: 'Running', image: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?w=400&h=300&fit=crop' },
  { name: 'Lifestyle', image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&h=300&fit=crop' },
  { name: 'Soccer', image: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400&h=300&fit=crop' },
  { name: 'Cricket', image: 'https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=400&h=300&fit=crop' },
  { name: 'Luxury', image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop' },
  { name: 'Slides', image: 'https://images.unsplash.com/photo-1603487742131-4160ec999306?w=400&h=300&fit=crop' },
  { name: 'Dress', image: 'https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=400&h=300&fit=crop' }
]

const BRAND_LOGOS = [
  { name: 'Nike', logo: 'https://pngimg.com/uploads/nike/nike_PNG6.png' },
  { name: 'Jordan', logo: 'https://download.logo.wine/logo/Air_Jordan/Air_Jordan-Logo.wine.png' }, 
  { name: 'Adidas', logo: 'https://www.logo.wine/a/logo/Adidas/Adidas-Logo.wine.svg' },
  { name: 'New Balance', logo: 'https://www.logo.wine/a/logo/New_Balance/New_Balance-Logo.wine.svg' },
  { name: 'Puma', logo: 'https://www.logo.wine/a/logo/Puma_(brand)/Puma_(brand)-Logo.wine.svg' },
  { name: 'Asics', logo: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Asics_Logo.svg' },
  { name: 'Reebok', logo: 'https://www.logo.wine/a/logo/Reebok/Reebok-Logo.wine.svg' },
  { name: 'Converse', logo: 'https://www.logo.wine/a/logo/Converse_(shoe_company)/Converse_(shoe_company)-Logo.wine.svg' }
]

function ProductCard({ product, isFav, onToggleFavorite, onCompare }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 transition duration-200 hover:-translate-y-1 hover:border-orange-500/60 hover:shadow-lg hover:shadow-black/40">
      {/* Image area — fixed square, white bg, contain, padded */}
      <div className="relative">
        <div className="relative aspect-square w-full cursor-pointer bg-white p-5" onClick={onCompare}>
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 animate-pulse bg-neutral-200" />
          )}
          {!imgError && product.image ? (
            <img
              src={product.image}
              alt={product.name}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`h-full w-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-neutral-300" fill="currentColor" aria-hidden="true">
                <path d="M2 18h20a1 1 0 0 0 1-1v-1.2a2 2 0 0 0-1.45-1.92l-5.34-1.53a3 3 0 0 1-1.2-.7l-2.6-2.5a1 1 0 0 0-1.4 0l-1.1 1.07 1.6 1.55a.75.75 0 1 1-1.04 1.08L7.4 11.8l-1 .98 1.6 1.55a.75.75 0 1 1-1.04 1.07L5.3 13.8l-1.4 1.37A3 3 0 0 1 2 16v2z" />
              </svg>
            </div>
          )}
        </div>

        {/* discount pill — top-left (guarded) */}
        {product.discount_percent > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-xs font-bold text-white shadow">
            -{product.discount_percent}%
          </span>
        )}

        {/* wishlist heart — top-right, wired to existing toggleFavorite */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur transition ${
            isFav
              ? 'border-orange-500 bg-orange-500/90 text-white'
              : 'border-white/20 bg-black/40 text-white/80 hover:border-white/40 hover:text-white'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-orange-500">{product.brand}</span>
        <h4 onClick={onCompare} className="line-clamp-2 min-h-[2.5rem] cursor-pointer text-sm font-bold leading-snug text-white">
          {product.name}
        </h4>

        {/* price row */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="text-lg font-bold text-white">${product.lowest_price}</span>
          {product.retail_price > product.lowest_price && (
            <span className="text-sm text-neutral-500 line-through">${product.retail_price}</span>
          )}
          {/* "Save $X" — optional: only when a dollar discount is actually present */}
          {product.discount > 0 && (
            <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-semibold text-green-400">
              Save ${product.discount}
            </span>
          )}
        </div>

        {/* meta badges: Pre-Owned (neutral, only when applicable) + Verified */}
        <div className="flex items-center gap-2 text-xs">
          {product.condition === 'pre-owned' && (
            <span className="rounded-full border border-white/15 bg-white/5 px-2 py-0.5 font-medium text-neutral-300">
              Pre-Owned
            </span>
          )}
          <span className="flex items-center gap-1 text-neutral-400">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            Verified
          </span>
        </div>

        {/* full-width outline Compare — existing selectProduct flow */}
        <button
          type="button"
          onClick={onCompare}
          className="mt-2 w-full rounded-lg border border-orange-500/70 py-2 text-sm font-semibold text-orange-400 transition hover:bg-orange-500 hover:text-white"
        >
          Compare
        </button>
      </div>
    </div>
  )
}

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [sneakerInfo, setSneakerInfo] = useState(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [categories, setCategories] = useState([])
  const [brands, setBrands] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('')
  const [allProducts, setAllProducts] = useState([])
  const [sortBy, setSortBy] = useState('price-asc')
  const [historyInitialized, setHistoryInitialized] = useState(false)
  
  const [hotDeals, setHotDeals] = useState([])
  const [dealsLoading, setDealsLoading] = useState(false)
  
  const [user, setUser] = useState(null)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authConfirm, setAuthConfirm] = useState('')
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [favorites, setFavorites] = useState([])
  const [showProfile, setShowProfile] = useState(false)
  const [profileTab, setProfileTab] = useState('favorites')
  const [priceAlerts, setPriceAlerts] = useState([])

  useEffect(() => {
    fetchInitialData()
    fetchHotDeals()
    const savedUser = localStorage.getItem('sneakersUser')
    if (savedUser) {
      const userData = JSON.parse(savedUser)
      setUser(userData)
      loadUserData(userData.email)
    }
    if (!historyInitialized) {
      window.history.replaceState({ page: 'home', isBase: true }, '', window.location.pathname)
      setHistoryInitialized(true)
    }
    const handlePopState = (event) => {
      const state = event.state
      if (!state || state.page === 'home' || state.isBase) resetToHome()
      else if (state.category) restoreCategory(state.category)
      else if (state.brand) restoreBrand(state.brand)
      else if (state.search) restoreSearch(state.search)
      else if (state.product) restoreProduct(state.product)
      else resetToHome()
    }
    window.addEventListener('popstate', handlePopState)

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = { email: firebaseUser.email }
        setUser(userData)
        localStorage.setItem('sneakersUser', JSON.stringify(userData))
        loadUserData(userData.email)
        setShowAuthModal(false)
        resetAuthForm()
      } else {
        setUser(null)
        localStorage.removeItem('sneakersUser')
      }
    })

    return () => { window.removeEventListener('popstate', handlePopState); unsubAuth() }
  }, [historyInitialized])

  const fetchHotDeals = async () => {
    setDealsLoading(true)
    try {
      const response = await fetch(`${API_URL}/api/deals?limit=8`)
      if (response.ok) { const data = await response.json(); setHotDeals(data.deals || []) }
    } catch (e) { console.error('Failed to fetch deals:', e) }
    finally { setDealsLoading(false) }
  }

  const loadUserData = async (email) => {
    try {
      const res = await fetch(`${API_URL}/api/user/data?email=${encodeURIComponent(email)}`)
      if (res.ok) { const data = await res.json(); setFavorites(data.favorites || []); setPriceAlerts(data.priceAlerts || []) }
    } catch (e) { console.error('Failed to load user data:', e) }
  }

  const resetToHome = () => { setSelectedCategory(''); setSelectedBrand(''); setHasSearched(false); setSneakerInfo(null); setAllProducts([]); setResults([]); setSearchQuery(''); setShowProfile(false) }
  
  const restoreCategory = async (category) => {
    setLoading(true); setHasSearched(true); setError(null); setSelectedCategory(category); setSelectedBrand(''); setSneakerInfo(null); setSearchQuery(''); setShowProfile(false)
    try { const response = await fetch(`${API_URL}/api/products?category=${encodeURIComponent(category)}`); if (!response.ok) throw new Error(); const data = await response.json(); setAllProducts(data.products || []); setResults([]) }
    catch { setError('Could not load products.'); setAllProducts([]) }
    finally { setLoading(false) }
  }

  const restoreBrand = async (brand) => {
    setLoading(true); setHasSearched(true); setError(null); setSelectedBrand(brand); setSelectedCategory(''); setSneakerInfo(null); setSearchQuery(''); setShowProfile(false)
    try { const response = await fetch(`${API_URL}/api/products?brand=${encodeURIComponent(brand)}`); if (!response.ok) throw new Error(); const data = await response.json(); setAllProducts(data.products || []); setResults([]) }
    catch { setError('Could not load products.'); setAllProducts([]) }
    finally { setLoading(false) }
  }

  const restoreSearch = async (term) => {
    setSearchQuery(term); setLoading(true); setHasSearched(true); setError(null); setSelectedCategory(''); setSelectedBrand(''); setShowProfile(false)
    try { const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(term)}`); if (!response.ok) throw new Error(); const data = await response.json(); setResults(data.results || []); setSneakerInfo(data); setAllProducts([]) }
    catch { setError('Could not connect.'); setResults([]); setSneakerInfo(null) }
    finally { setLoading(false) }
  }

  const restoreProduct = async (productId) => {
    setLoading(true); setHasSearched(true); setShowProfile(false)
    try { const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(productId)}`); if (!response.ok) throw new Error(); const data = await response.json(); setResults(data.results || []); setSneakerInfo(data); setAllProducts([]); setSearchQuery(productId) }
    catch (e) { console.error('Product fetch error:', e) }
    finally { setLoading(false) }
  }

  const fetchInitialData = async () => {
    try { const response = await fetch(`${API_URL}/`); const data = await response.json(); setCategories(data.categories || []); setBrands(data.brands || []) }
    catch (e) { console.error('Failed to fetch initial data:', e) }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true); setHasSearched(true); setError(null); setShowProfile(false)
    window.history.pushState({ search: searchQuery }, '', `?search=${encodeURIComponent(searchQuery)}`)
    try { const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(searchQuery)}`); if (!response.ok) throw new Error(); const data = await response.json(); setResults(data.results || []); setSneakerInfo(data); setAllProducts([]) }
    catch { setError('Could not connect.'); setResults([]); setSneakerInfo(null) }
    finally { setLoading(false) }
  }

  const handleKeyPress = (e) => { if (e.key === 'Enter') handleSearch() }

  const quickSearch = async (term) => {
    setSearchQuery(term); setLoading(true); setHasSearched(true); setError(null); setSelectedCategory(''); setSelectedBrand(''); setShowProfile(false)
    window.history.pushState({ search: term }, '', `?search=${encodeURIComponent(term)}`)
    try { const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(term)}`); if (!response.ok) throw new Error(); const data = await response.json(); setResults(data.results || []); setSneakerInfo(data); setAllProducts([]) }
    catch { setError('Could not connect.'); setResults([]); setSneakerInfo(null) }
    finally { setLoading(false) }
  }

  const browseByCategory = async (category) => {
    setLoading(true); setHasSearched(true); setError(null); setSelectedCategory(category); setSelectedBrand(''); setSneakerInfo(null); setSearchQuery(''); setShowProfile(false)
    window.history.pushState({ category }, '', `?category=${encodeURIComponent(category)}`)
    try { const response = await fetch(`${API_URL}/api/products?category=${encodeURIComponent(category)}`); if (!response.ok) throw new Error(); const data = await response.json(); setAllProducts(data.products || []); setResults([]) }
    catch { setError('Could not load products.'); setAllProducts([]) }
    finally { setLoading(false) }
  }

  const browseByBrand = async (brand) => {
    setLoading(true); setHasSearched(true); setError(null); setSelectedBrand(brand); setSelectedCategory(''); setSneakerInfo(null); setSearchQuery(''); setShowProfile(false)
    window.history.pushState({ brand }, '', `?brand=${encodeURIComponent(brand)}`)
    try { const response = await fetch(`${API_URL}/api/products?brand=${encodeURIComponent(brand)}`); if (!response.ok) throw new Error(); const data = await response.json(); setAllProducts(data.products || []); setResults([]) }
    catch { setError('Could not load products.'); setAllProducts([]) }
    finally { setLoading(false) }
  }

  const selectProduct = async (productId) => {
    setLoading(true); setHasSearched(true); setShowProfile(false); setSelectedCategory(''); setSelectedBrand(''); setAllProducts([])
    window.history.pushState({ product: productId }, '', `?product=${encodeURIComponent(productId)}`)
    try { const response = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(productId)}`); if (!response.ok) throw new Error(); const data = await response.json(); setResults(data.results || []); setSneakerInfo(data); setSearchQuery(data.name || productId) }
    catch (e) { console.error('Product fetch error:', e) }
    finally { setLoading(false) }
  }

  const goHome = () => { resetToHome(); window.history.pushState({ page: 'home' }, '', window.location.pathname) }

  const handleLogin = async () => {
    if (!authEmail || !authPassword) { setAuthError('Email and password required'); return }
    setAuthLoading(true); setAuthError('')
    try { await signInWithEmailAndPassword(auth, authEmail, authPassword) }
    catch (e) { setAuthError(e?.message || 'Login failed') }
    finally { setAuthLoading(false) }
  }

  const handleRegister = async () => {
    if (!authEmail || !authPassword) { setAuthError('Email and password required'); return }
    if (authPassword.length < 6) { setAuthError('Password must be 6+ characters'); return }
    if (authPassword !== authConfirm) { setAuthError('Passwords do not match'); return }
    setAuthLoading(true); setAuthError('')
    try { await createUserWithEmailAndPassword(auth, authEmail, authPassword); setAuthSuccess('Account created!') }
    catch (e) { setAuthError(e?.message || 'Registration failed') }
    finally { setAuthLoading(false) }
  }

  const handleLogout = async () => {
    try { await signOut(auth) } catch (e) { console.error(e) }
    setUser(null); setFavorites([]); setPriceAlerts([]); localStorage.removeItem('sneakersUser'); setShowProfile(false)
  }

  const resetAuthForm = () => {
    setAuthEmail(''); setAuthPassword(''); setAuthConfirm(''); setAuthError(''); setAuthSuccess('')
    setShowPassword(false); setShowConfirmPassword(false)
  }

  const handleGoogleSignIn = async () => {
    setAuthLoading(true); setAuthError('')
    try { const provider = new GoogleAuthProvider(); await signInWithPopup(auth, provider) }
    catch (e) { setAuthError(e?.message || 'Google sign-in failed') }
    finally { setAuthLoading(false) }
  }

  const toggleFavorite = async (product) => {
    if (!user) { setShowAuthModal(true); return }
    const isFav = favorites.some(f => f.id === product.id)
    const newFavorites = isFav ? favorites.filter(f => f.id !== product.id) : [...favorites, { id: product.id, name: product.name, brand: product.brand, image: product.image, lowest_price: product.lowest_price || results[0]?.price, addedAt: new Date().toISOString() }]
    setFavorites(newFavorites)
    try { await fetch(`${API_URL}/api/user/favorites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, favorites: newFavorites }) }) }
    catch (e) { console.error('Failed to save favorites:', e) }
  }

  const isFavorite = (productId) => favorites.some(f => f.id === productId)

  const addPriceAlert = async (product, targetPrice) => {
    if (!user) { setShowAuthModal(true); return }
    const newAlert = { id: product.id, name: product.name, image: product.image, currentPrice: product.lowest_price || results[0]?.price, targetPrice, createdAt: new Date().toISOString() }
    const newAlerts = [...priceAlerts.filter(a => a.id !== product.id), newAlert]
    setPriceAlerts(newAlerts)
    try { await fetch(`${API_URL}/api/user/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, alerts: newAlerts }) }) }
    catch (e) { console.error('Failed to save alert:', e) }
  }

  const removePriceAlert = async (productId) => {
    const newAlerts = priceAlerts.filter(a => a.id !== productId)
    setPriceAlerts(newAlerts)
    try { await fetch(`${API_URL}/api/user/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: user.email, alerts: newAlerts }) }) }
    catch (e) { console.error('Failed to remove alert:', e) }
  }

  const openProfile = () => { setShowProfile(true); setHasSearched(false) }

  const sortProducts = (products) => {
    const arr = [...products]
    if (sortBy === 'price-asc') arr.sort((a, b) => (a.lowest_price ?? Infinity) - (b.lowest_price ?? Infinity))
    else if (sortBy === 'price-desc') arr.sort((a, b) => (b.lowest_price ?? -Infinity) - (a.lowest_price ?? -Infinity))
    else if (sortBy === 'brand-asc') arr.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
    return arr
  }

  return (
    <div className="app">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/95 backdrop-blur">
        {/* Row 1: logo + auth */}
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 py-4">
          <button type="button" onClick={goHome} className="flex items-center gap-2 whitespace-nowrap text-xl font-extrabold tracking-tight sm:text-2xl">
            <span className="text-2xl sm:text-3xl" aria-hidden="true">👟</span>
            <span className="text-orange-500">SNEAKERS</span>
            <span className="text-white">FOR LESS</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <button type="button" onClick={openProfile} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/90 transition hover:border-white/30">
                <span aria-hidden="true">👤</span><span className="hidden sm:inline">{user.email.split('@')[0]}</span>
              </button>
              <button type="button" onClick={openProfile} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-white/90 transition hover:border-white/30">❤️ {favorites.length}</button>
              <button type="button" onClick={handleLogout} className="rounded-lg px-3 py-2 text-sm text-neutral-400 transition hover:text-white">Logout</button>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAuthModal(true)} className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
              Login / Sign Up
            </button>
          )}
        </div>

        {/* Row 2: nav + search */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1200px] flex-col gap-3 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap items-center gap-1">
              {/* Categories — CSS-only dropdown, reuses categories + browseByCategory */}
              <div className="group relative">
                <button type="button" className="flex items-center gap-1 rounded-lg px-3 py-2 text-base font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white">
                  Categories
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <div className="invisible absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-auto rounded-xl border border-white/10 bg-neutral-900 p-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {categories.map((cat) => (
                    <button key={cat} type="button" onClick={() => browseByCategory(cat)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition hover:bg-orange-500 hover:text-white">{cat}</button>
                  ))}
                </div>
              </div>

              {/* Brands — CSS-only dropdown, reuses brands + browseByBrand */}
              <div className="group relative">
                <button type="button" className="flex items-center gap-1 rounded-lg px-3 py-2 text-base font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white">
                  Brands
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                <div className="invisible absolute left-0 top-full z-50 mt-1 max-h-80 w-56 overflow-auto rounded-xl border border-white/10 bg-neutral-900 p-1 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                  {brands.map((brand) => (
                    <button key={brand} type="button" onClick={() => browseByBrand(brand)} className="block w-full rounded-lg px-3 py-2 text-left text-sm text-neutral-300 transition hover:bg-orange-500 hover:text-white">{brand}</button>
                  ))}
                </div>
              </div>

              {/* Deals — existing return-to-homepage/hot-deals handler */}
              <button type="button" onClick={goHome} className="rounded-lg px-3 py-2 text-base font-medium text-neutral-300 transition hover:bg-white/5 hover:text-white">Deals</button>
            </nav>

            {/* Search — reuses searchQuery + handleSearch + handleKeyPress */}
            <div className="flex w-full items-center gap-2 lg:w-auto">
              <input
                type="text"
                placeholder="Search sneakers, brands, or styles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-neutral-500 focus:border-orange-500 focus:outline-none lg:w-72"
              />
              <button type="button" onClick={handleSearch} className="shrink-0 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600">
                {loading ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {showAuthModal && (
        <div className="modal-overlay" onClick={() => { setShowAuthModal(false); resetAuthForm(); }}>
          <div className="auth-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => { setShowAuthModal(false); resetAuthForm(); }}>&times;</button>
            <h2>{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            
            <div className="auth-tabs">
              <button className={authMode === 'login' ? 'active' : ''} onClick={() => { setAuthMode('login'); resetAuthForm(); }}>Login</button>
              <button className={authMode === 'register' ? 'active' : ''} onClick={() => { setAuthMode('register'); resetAuthForm(); }}>Register</button>
            </div>

            <button className="google-btn" onClick={handleGoogleSignIn} disabled={authLoading}>
              <svg className="google-icon" viewBox="0 0 24 24" width="20" height="20">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="auth-divider"><span>or continue with email</span></div>

            <input type="email" placeholder="Email address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyPress={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : null)} />

            <div className="password-input-container">
              <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyPress={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : null)} />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} tabIndex={-1}>
                {showPassword ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
                )}
              </button>
            </div>

            {authMode === 'register' && (
              <div className="password-input-container">
                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleRegister()} />
                <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} tabIndex={-1}>
                  {showConfirmPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            )}

            {authError && <p className="auth-error">{authError}</p>}
            {authSuccess && <p className="auth-success">{authSuccess}</p>}

            <button className="auth-submit" onClick={authMode === 'login' ? handleLogin : handleRegister} disabled={authLoading}>
              {authLoading ? 'Please wait...' : (authMode === 'login' ? 'Login' : 'Create Account')}
            </button>

            <p className="auth-terms">By continuing, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      )}

      {showProfile && user && (
        <div className="profile-page">
          <div className="profile-header"><h2>👤 My Account</h2><p>{user.email}</p></div>
          <div className="profile-tabs">
            <button className={profileTab === 'favorites' ? 'active' : ''} onClick={() => setProfileTab('favorites')}>❤️ Favorites ({favorites.length})</button>
            <button className={profileTab === 'alerts' ? 'active' : ''} onClick={() => setProfileTab('alerts')}>🔔 Price Alerts ({priceAlerts.length})</button>
            <button className={profileTab === 'settings' ? 'active' : ''} onClick={() => setProfileTab('settings')}>⚙️ Settings</button>
          </div>
          {profileTab === 'favorites' && (
            <div className="favorites-list">
              {favorites.length === 0 ? (
                <div className="empty-state"><p>No favorites yet!</p><button onClick={goHome}>Browse Sneakers</button></div>
              ) : (
                <div className="grid">
                  {favorites.map(fav => (
                    <ProductCard
                      key={fav.id}
                      product={fav}
                      isFav={isFavorite(fav.id)}
                      onToggleFavorite={() => toggleFavorite(fav)}
                      onCompare={() => selectProduct(fav.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {profileTab === 'alerts' && (
            <div className="alerts-list">
              {priceAlerts.length === 0 ? (
                <div className="empty-state"><p>No price alerts set!</p><p className="hint">Set alerts on products to get notified when prices drop.</p></div>
              ) : (
                priceAlerts.map(alert => (
                  <div key={alert.id} className="alert-card">
                    {alert.image && <img src={alert.image} alt={alert.name} loading="lazy" />}
                    <div className="alert-info"><h4>{alert.name}</h4><p>Current: ${alert.currentPrice} → Target: ${alert.targetPrice}</p></div>
                    <button className="remove-alert" onClick={() => removePriceAlert(alert.id)}>Remove</button>
                  </div>
                ))
              )}
            </div>
          )}
          {profileTab === 'settings' && (
            <div className="settings-section">
              <div className="setting-item"><div><h4>Email Notifications</h4><p>Get notified when prices drop on your alerts</p></div><label className="toggle"><input type="checkbox" defaultChecked /><span className="slider"></span></label></div>
              <div className="setting-item"><div><h4>Account</h4></div><button className="danger-btn" onClick={handleLogout}>Logout</button></div>
            </div>
          )}
        </div>
      )}

      <main className="main">
        {!showProfile && (
          <>
            <div className="search-container">
              <div className="quick-tags"><span className="quick-label">Popular:</span>{['Jordan 1', 'Dunk Low', 'Yeezy 350', 'Travis Scott', 'Air Max 95', 'Air Force 1'].map((tag) => (<button key={tag} onClick={() => quickSearch(tag)} className="tag">{tag}</button>))}</div>
            </div>

            {error && <div className="error-message"><p>{error}</p></div>}
            {(selectedCategory || selectedBrand) && (<div className="active-filter"><span>Showing: {selectedCategory || selectedBrand}</span><button onClick={goHome} className="clear-filter">Clear</button></div>)}

            {hasSearched && !error && (
              <div className="results-section">
                {loading ? (
                  <div className="loading"><div className="spinner"></div><p>Finding the best prices...</p></div>
                ) : allProducts.length > 0 ? (
                  <div className="products-grid">
                    <div className="grid-header">
                      <h3 className="grid-title">{allProducts.length} products found</h3>
                      <div className="sort-control">
                        <label htmlFor="sort-select">Sort by:</label>
                        <select id="sort-select" className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                          <option value="price-asc">Price: Low to High</option>
                          <option value="price-desc">Price: High to Low</option>
                          <option value="brand-asc">Brand (A-Z)</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid">
                      {sortProducts(allProducts).map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          isFav={isFavorite(product.id)}
                          onToggleFavorite={() => toggleFavorite(product)}
                          onCompare={() => selectProduct(product.id)}
                        />
                      ))}
                    </div>
                  </div>
                ) : results.length > 0 && sneakerInfo ? (
                  <div>
                    <div className="sneaker-header">
                      {sneakerInfo.image && <div className="sneaker-image"><img src={sneakerInfo.image} alt={sneakerInfo.name} loading="lazy" /></div>}
                      <div className="sneaker-details">
                        <div className="sneaker-badges">
                          <span className="brand-tag">{sneakerInfo.brand}</span>
                          {sneakerInfo.category && <span className="category-tag">{sneakerInfo.category}</span>}
                          {sneakerInfo.condition === 'pre-owned' && <span className="preowned-tag">Pre-Owned</span>}
                          {sneakerInfo.discount_percent > 0 && <span className="discount-tag">-{sneakerInfo.discount_percent}% OFF</span>}
                        </div>
                        <h2 className="sneaker-name">{sneakerInfo.name}</h2>
                        {sneakerInfo.colorway && <p className="colorway">{sneakerInfo.colorway}</p>}
                        {sneakerInfo.sku && <p className="sku">SKU: {sneakerInfo.sku}</p>}
                        <div className="price-summary">
                          <div className="lowest-price"><span className="label">Lowest Price</span><span className="value">${results[0].price}</span></div>
                          {sneakerInfo.retail_price && <div className="retail-price"><span className="label">Retail</span><span className="value">${sneakerInfo.retail_price}</span></div>}
                          {sneakerInfo.savings > 0 && <div className="savings-badge">Save ${sneakerInfo.savings}</div>}
                        </div>
                        <div className="product-actions">
                          <button className={`action-btn fav ${isFavorite(sneakerInfo.id) ? 'active' : ''}`} onClick={() => toggleFavorite(sneakerInfo)}>{isFavorite(sneakerInfo.id) ? '❤️ Saved' : '🤍 Save'}</button>
                          <button className="action-btn alert" onClick={() => { const target = prompt('Enter target price for alert:', Math.floor(results[0].price * 0.9)); if (target) addPriceAlert(sneakerInfo, parseInt(target)) }}>🔔 Price Alert</button>
                        </div>
                      </div>
                    </div>
                    <div className="results-list">
                      <h3 className="results-title">{results.length} stores compared</h3>
                      {results.map((item, idx) => (
                        <div key={idx} className={`result-card ${idx === 0 ? 'best-deal' : ''}`}>
                          {idx === 0 && <div className="best-label">BEST PRICE</div>}
                          <div className="store-name">{item.store}</div>
                          <div className="price-info"><span className="price">${item.price}</span><span className="shipping">{item.shipping} shipping</span></div>
                          <div className="condition">{item.condition}</div>
                          <a href={item.url || '#'} target="_blank" rel="noopener noreferrer" className="view-btn">View Deal</a>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="no-results"><p>No results found for "{searchQuery}"</p><p className="hint">Try searching for "Jordan", "Nike", "Travis Scott", or browse by category above</p></div>
                )}
              </div>
            )}

            {!hasSearched && (
              <div className="homepage">
                <div className="hot-deals-section">
                  <div className="section-header"><h3>🔥 Hot Deals</h3><span className="section-subtitle">Biggest discounts right now</span></div>
                  {dealsLoading ? (
                    <div className="deals-loading"><div className="spinner"></div><p>Loading deals...</p></div>
                  ) : hotDeals.length > 0 ? (
                    <div className="deals-grid">
                      {hotDeals.map((deal) => (
                        <ProductCard
                          key={deal.id}
                          product={deal}
                          isFav={isFavorite(deal.id)}
                          onToggleFavorite={() => toggleFavorite(deal)}
                          onCompare={() => selectProduct(deal.id)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="no-deals">No deals available at the moment.</p>
                  )}
                </div>

                <div className="category-showcase">
                  <h3>Shop by Category</h3>
                  <div className="category-cards">{CATEGORY_IMAGES.map((cat) => (<div key={cat.name} className="category-card" onClick={() => browseByCategory(cat.name)}><img src={cat.image} alt={cat.name} loading="lazy" /><span className="category-name">{cat.name}</span></div>))}</div>
                </div>

                <div className="brand-showcase">
                  <h3>Popular Brands</h3>
                  <div className="brand-cards">{BRAND_LOGOS.map((brand) => (<div key={brand.name} className="brand-card" onClick={() => browseByBrand(brand.name)}><img src={brand.logo} alt={brand.name} loading="lazy" /><span className="brand-name">{brand.name}</span></div>))}</div>
                </div>

                <div className="how-it-works">
                  <h3>How it works</h3>
                  <div className="steps">
                    <div className="step"><div className="step-num">1</div><p>Search or browse sneakers</p></div>
                    <div className="step"><div className="step-num">2</div><p>Compare prices from 10+ stores</p></div>
                    <div className="step"><div className="step-num">3</div><p>Click to buy at the lowest price</p></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>Comparing prices across StockX, GOAT, eBay, Flight Club, Soccer.com and more</p>
        <p className="footer-small">© 2026 SneakersForLess. Not affiliated with any retailer.</p>
      </footer>
    </div>
  )
}

export default App