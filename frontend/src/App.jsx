import { useState, useEffect, useRef } from 'react'
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
    <div className="flex flex-col overflow-hidden rounded-[14px] border border-white/[0.08] bg-[#141416] transition hover:border-white/[0.14]">
      {/* Image area — white bg, fixed aspect, contain */}
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
          <span className="absolute left-3 top-3 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-[#2a1500]">
            -{product.discount_percent}%
          </span>
        )}

        {/* wishlist heart — top-right, wired to existing toggleFavorite */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onToggleFavorite() }}
          aria-label={isFav ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute right-3 top-3 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full transition ${
            isFav
              ? 'bg-orange-500 text-[#2a1500]'
              : 'bg-black/55 text-white/90 hover:bg-black/70'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill={isFav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-2 p-3.5">
        <span className="text-[11px] uppercase tracking-[0.08em] text-[#7a7a80]">{product.brand}</span>
        <h4 onClick={onCompare} className="line-clamp-2 min-h-[2.5rem] cursor-pointer text-sm font-normal leading-[1.3] text-[#eaeaec]">
          {product.name}
        </h4>

        {/* price row */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-lg font-medium text-[#f4f4f5]">${product.lowest_price}</span>
          {product.retail_price > product.lowest_price && (
            <span className="text-[13px] text-[#6a6a6f] line-through">${product.retail_price}</span>
          )}
          {/* "Save $X" — optional: only when a dollar discount is actually present */}
          {product.discount > 0 && (
            <span className="rounded-[6px] bg-[rgba(74,222,128,0.12)] px-1.5 py-0.5 text-[11px] text-[#4ade80]">
              Save ${product.discount}
            </span>
          )}
        </div>

        {/* meta: Pre-Owned (only when applicable) + Verified */}
        <div className="flex items-center gap-2 text-xs">
          {product.condition === 'pre-owned' && (
            <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-[#8a8a8f]">
              Pre-Owned
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-[#7a7a80]">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#4ade80]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="m8.5 12 2.5 2.5 4.5-4.5" />
            </svg>
            Verified
          </span>
        </div>

        {/* full-width outline "Compare prices" — existing onCompare action */}
        <button
          type="button"
          onClick={onCompare}
          className="mt-auto flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-orange-500/50 py-2 text-sm font-medium text-orange-500 transition hover:bg-orange-500 hover:text-[#2a1500]"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3 4 7l4 4" />
            <path d="M4 7h16" />
            <path d="m16 21 4-4-4-4" />
            <path d="M20 17H4" />
          </svg>
          Compare prices
        </button>
      </div>
    </div>
  )
}

function App() {
  // Restore the initial view from the URL on load (refresh / deep link).
  const initialRoute = (() => {
    const p = new URLSearchParams(window.location.search)
    if (p.get('view') === 'account') {
      const tab = p.get('tab')
      return { type: 'account', value: ['favorites', 'alerts', 'settings'].includes(tab) ? tab : 'favorites' }
    }
    if (p.get('product')) return { type: 'product', value: p.get('product') }
    if (p.get('category')) return { type: 'category', value: p.get('category') }
    if (p.get('brand')) return { type: 'brand', value: p.get('brand') }
    if (p.get('search')) return { type: 'search', value: p.get('search') }
    return null
  })()
  // Data routes paint a loading spinner on mount; the account view does not.
  const isDataRoute = !!initialRoute && initialRoute.type !== 'account'

  const [searchQuery, setSearchQuery] = useState('')
  const [results, setResults] = useState([])
  const [sneakerInfo, setSneakerInfo] = useState(null)
  const [hasSearched, setHasSearched] = useState(isDataRoute)
  const [loading, setLoading] = useState(isDataRoute)
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
  const [showProfile, setShowProfile] = useState(initialRoute?.type === 'account' && !!localStorage.getItem('sneakersUser'))
  const [profileTab, setProfileTab] = useState(initialRoute?.type === 'account' ? initialRoute.value : 'favorites')
  const [priceAlerts, setPriceAlerts] = useState([])

  // Header dropdowns (account + wishlist preview) + sign-out overlay
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [wishlistMenuOpen, setWishlistMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [signOutDone, setSignOutDone] = useState(false)
  const accountMenuRef = useRef(null)
  const wishlistMenuRef = useRef(null)
  const signingOutRef = useRef(false)

  // Navbar hover dropdowns (Categories / Brands) — JS-driven open with a small
  // close delay so the cursor can travel from the label down onto the items.
  const [openNav, setOpenNav] = useState(null) // 'categories' | 'brands' | null
  const navCloseTimer = useRef(null)
  const openNavMenu = (name) => {
    if (navCloseTimer.current) { clearTimeout(navCloseTimer.current); navCloseTimer.current = null }
    setOpenNav(name) // mutually exclusive: only one nav menu open at a time
  }
  const closeNavMenuSoon = () => {
    if (navCloseTimer.current) clearTimeout(navCloseTimer.current)
    navCloseTimer.current = setTimeout(() => setOpenNav(null), 150)
  }

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
      if (initialRoute && initialRoute.type === 'account') {
        if (savedUser) {
          window.history.replaceState({ view: 'account', tab: initialRoute.value }, '', `?view=account&tab=${initialRoute.value}`)
          // showProfile + profileTab were lazy-initialized from initialRoute.
        } else {
          // Account view requires a logged-in user; fall back to home.
          window.history.replaceState({ page: 'home', isBase: true }, '', window.location.pathname)
          setShowProfile(false)
        }
      } else if (initialRoute) {
        const { type, value } = initialRoute
        window.history.replaceState({ [type]: value }, '', `?${type}=${encodeURIComponent(value)}`)
        if (type === 'product') restoreProduct(value)
        else if (type === 'category') restoreCategory(value)
        else if (type === 'brand') restoreBrand(value)
        else if (type === 'search') restoreSearch(value)
      } else {
        window.history.replaceState({ page: 'home', isBase: true }, '', window.location.pathname)
      }
      setHistoryInitialized(true)
    }
    const handlePopState = (event) => {
      const state = event.state
      if (state && state.view === 'account') restoreAccount(state.tab)
      else if (!state || state.page === 'home' || state.isBase) resetToHome()
      else if (state.category) restoreCategory(state.category)
      else if (state.brand) restoreBrand(state.brand)
      else if (state.search) restoreSearch(state.search)
      else if (state.product) restoreProduct(state.product)
      else resetToHome()
    }
    window.addEventListener('popstate', handlePopState)

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = {
          email: firebaseUser.email,
          name: firebaseUser.displayName,
          photo: firebaseUser.photoURL,
        }
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
      const token = await auth.currentUser?.getIdToken()
      const res = await fetch(`${API_URL}/api/user/data?email=${encodeURIComponent(email)}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const data = await res.json(); setFavorites(data.favorites || []); setPriceAlerts(data.priceAlerts || []) }
    } catch (e) { console.error('Failed to load user data:', e) }
  }

  const resetToHome = () => { setSelectedCategory(''); setSelectedBrand(''); setHasSearched(false); setSneakerInfo(null); setAllProducts([]); setResults([]); setSearchQuery(''); setShowProfile(false) }

  const restoreAccount = (tab) => {
    setShowProfile(true); setHasSearched(false)
    setProfileTab(['favorites', 'alerts', 'settings'].includes(tab) ? tab : 'favorites')
  }

  const selectProfileTab = (tab) => {
    setProfileTab(tab)
    window.history.replaceState({ view: 'account', tab }, '', `?view=account&tab=${tab}`)
  }
  
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
    setUser(null); setFavorites([]); setPriceAlerts([]); localStorage.removeItem('sneakersUser')
    // Always land on a clean home view, regardless of where logout was triggered
    // (brand, category, search, product detail, or My Account).
    resetToHome()                 // clears brand, category, search, hasSearched, results, allProducts, sneakerInfo, showProfile
    setProfileTab('favorites')    // reset the account sub-tab
    setError(null)
    window.history.replaceState({ page: 'home', isBase: true }, '', window.location.pathname)  // clear URL query (?product/?category/?brand/?search/?view/?tab)
    window.scrollTo(0, 0)
  }

  // Sign out with a ~3s UX overlay: spinner -> green check. The real signOut still runs.
  const handleSignOut = async () => {
    if (signingOutRef.current) return            // guard rapid double-clicks (race-proof)
    signingOutRef.current = true
    setAccountMenuOpen(false)
    setSignOutDone(false)
    setSigningOut(true)
    const logoutPromise = handleLogout()         // real Firebase signOut + state cleanup
    await new Promise((r) => setTimeout(r, 2400)) // spinner for ~2.4s from click
    await logoutPromise                           // ensure the real sign-out finished
    setSignOutDone(true)                          // swap to green check + "Signed out"
    await new Promise((r) => setTimeout(r, 600))  // ~0.6s (≈3s total)
    setSigningOut(false)
    setSignOutDone(false)
    signingOutRef.current = false
  }

  // Close the header dropdowns (account + wishlist) on outside click or Escape.
  useEffect(() => {
    if (!accountMenuOpen && !wishlistMenuOpen) return
    const onMouseDown = (e) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target)) setAccountMenuOpen(false)
      if (wishlistMenuRef.current && !wishlistMenuRef.current.contains(e.target)) setWishlistMenuOpen(false)
    }
    const onKeyDown = (e) => { if (e.key === 'Escape') { setAccountMenuOpen(false); setWishlistMenuOpen(false) } }
    document.addEventListener('mousedown', onMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => { document.removeEventListener('mousedown', onMouseDown); document.removeEventListener('keydown', onKeyDown) }
  }, [accountMenuOpen, wishlistMenuOpen])

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
    try { const token = await auth.currentUser?.getIdToken(); await fetch(`${API_URL}/api/user/favorites`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: user.email, favorites: newFavorites }) }) }
    catch (e) { console.error('Failed to save favorites:', e) }
  }

  const isFavorite = (productId) => favorites.some(f => f.id === productId)

  const addPriceAlert = async (product, targetPrice) => {
    if (!user) { setShowAuthModal(true); return }
    const newAlert = { id: product.id, name: product.name, image: product.image, currentPrice: product.lowest_price || results[0]?.price, targetPrice, createdAt: new Date().toISOString() }
    const newAlerts = [...priceAlerts.filter(a => a.id !== product.id), newAlert]
    setPriceAlerts(newAlerts)
    try { const token = await auth.currentUser?.getIdToken(); await fetch(`${API_URL}/api/user/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: user.email, alerts: newAlerts }) }) }
    catch (e) { console.error('Failed to save alert:', e) }
  }

  const removePriceAlert = async (productId) => {
    const newAlerts = priceAlerts.filter(a => a.id !== productId)
    setPriceAlerts(newAlerts)
    try { const token = await auth.currentUser?.getIdToken(); await fetch(`${API_URL}/api/user/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ email: user.email, alerts: newAlerts }) }) }
    catch (e) { console.error('Failed to remove alert:', e) }
  }

  const openProfile = (tab) => { const target = typeof tab === 'string' ? tab : profileTab; setShowProfile(true); setHasSearched(false); setProfileTab(target); window.history.pushState({ view: 'account', tab: target }, '', `?view=account&tab=${target}`) }

  const sortProducts = (products) => {
    const arr = [...products]
    if (sortBy === 'price-asc') arr.sort((a, b) => (a.lowest_price ?? Infinity) - (b.lowest_price ?? Infinity))
    else if (sortBy === 'price-desc') arr.sort((a, b) => (b.lowest_price ?? -Infinity) - (a.lowest_price ?? -Infinity))
    else if (sortBy === 'brand-asc') arr.sort((a, b) => (a.brand || '').localeCompare(b.brand || ''))
    return arr
  }

  // A single-product detail/compare view is open (sneakerInfo + store results, not a grid)
  // AND the URL says it's a product page (?product=) rather than a search — used only to
  // hide the hero/search block there. Search and grid results keep the hero.
  const onProductDetail = !!sneakerInfo && results.length > 0 && allProducts.length === 0 && new URLSearchParams(window.location.search).has('product')

  return (
    <div className="app bg-[#0a0a0b] text-[#f4f4f5]">
      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#0a0a0b]/95 backdrop-blur">
        <div className="flex items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
          {/* Left: wordmark + quiet nav */}
          <div className="flex items-center gap-6">
            <button type="button" onClick={goHome} className="flex cursor-pointer items-center gap-2 whitespace-nowrap">
              <img src="/logo.png" alt="" className="h-7 w-auto" />
              <span className="text-lg tracking-tight">
                <span className="font-medium text-orange-500">SNEAKERS</span>
                <span className="font-medium text-[#f4f4f5]"> FOR LESS</span>
              </span>
            </button>
            <nav className="hidden items-center gap-1 sm:flex">
              {/* Categories — quiet nav link; dropdown behavior unchanged */}
              <div className="group relative" onMouseEnter={() => openNavMenu('categories')} onMouseLeave={closeNavMenuSoon}>
                <button type="button" className="flex cursor-pointer items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[13px] text-[#8a8a8f] transition hover:text-[#f4f4f5]">
                  Categories
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {/* Outer = positioner + transparent pt-1 bridge (no margin gap); inner keeps the styling */}
                <div className={`absolute left-0 top-full z-50 pt-1 transition group-focus-within:visible group-focus-within:opacity-100 ${openNav === 'categories' ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                  <div className="max-h-80 w-56 overflow-auto rounded-xl border border-white/[0.08] bg-[#141416] p-1 shadow-xl">
                    {categories.map((cat) => (
                      <button key={cat} type="button" onClick={() => browseByCategory(cat)} className="block w-full cursor-pointer rounded-[10px] px-3 py-2 text-left text-sm text-[#8a8a8f] transition hover:bg-orange-500 hover:text-[#2a1500]">{cat}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Brands — quiet nav link; dropdown behavior unchanged */}
              <div className="group relative" onMouseEnter={() => openNavMenu('brands')} onMouseLeave={closeNavMenuSoon}>
                <button type="button" className="flex cursor-pointer items-center gap-1 rounded-[10px] px-2.5 py-1.5 text-[13px] text-[#8a8a8f] transition hover:text-[#f4f4f5]">
                  Brands
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
                </button>
                {/* Outer = positioner + transparent pt-1 bridge (no margin gap); inner keeps the styling */}
                <div className={`absolute left-0 top-full z-50 pt-1 transition group-focus-within:visible group-focus-within:opacity-100 ${openNav === 'brands' ? 'visible opacity-100' : 'invisible opacity-0'}`}>
                  <div className="max-h-80 w-56 overflow-auto rounded-xl border border-white/[0.08] bg-[#141416] p-1 shadow-xl">
                    {brands.map((brand) => (
                      <button key={brand} type="button" onClick={() => browseByBrand(brand)} className="block w-full cursor-pointer rounded-[10px] px-3 py-2 text-left text-sm text-[#8a8a8f] transition hover:bg-orange-500 hover:text-[#2a1500]">{brand}</button>
                    ))}
                  </div>
                </div>
              </div>
            </nav>
          </div>

          {/* Right: wishlist + account */}
          {user ? (
            <div className="flex items-center gap-2">
              {/* Wishlist — trigger pill + preview dropdown */}
              <div className="relative" ref={wishlistMenuRef}>
                <button type="button" onClick={() => { setAccountMenuOpen(false); setWishlistMenuOpen((o) => !o) }} aria-haspopup="menu" aria-expanded={wishlistMenuOpen} aria-label="Wishlist" className="flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-[#141416] px-3 py-1.5 text-[13px] text-[#f4f4f5] transition hover:border-white/[0.14]">
                  <svg viewBox="0 0 24 24" className="h-4 w-4 text-[#8a8a8f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                  </svg>
                  <span className="hidden sm:inline">Wishlist</span>
                  <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-medium leading-5 text-[#2a1500]">{favorites.length}</span>
                </button>

                {wishlistMenuOpen && (
                  <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141416] shadow-xl">
                    <div className="flex items-center justify-between border-b border-white/[0.08] px-4 py-3">
                      <span className="text-sm font-medium text-[#f4f4f5]">Wishlist</span>
                      <span className="text-xs text-[#8a8a8f]">{favorites.length} saved</span>
                    </div>
                    {favorites.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-[#8a8a8f]">No saved pairs yet</div>
                    ) : (
                      <div className="max-h-80 overflow-auto p-1">
                        {favorites.map((fav) => (
                          <div key={fav.id} className="flex items-center gap-3 rounded-[10px] px-2 py-2 transition hover:bg-white/[0.04]">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-white p-1">
                              {fav.image && <img src={fav.image} alt={fav.name} loading="lazy" className="h-full w-full object-contain" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-[10px] uppercase tracking-[0.08em] text-[#7a7a80]">{fav.brand}</div>
                              <div className="truncate text-[13px] text-[#f4f4f5]">{fav.name}</div>
                              <div className="text-[13px] font-medium text-[#f4f4f5]">${fav.lowest_price}</div>
                            </div>
                            <button type="button" onClick={() => toggleFavorite(fav)} aria-label="Remove from wishlist" className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full text-[#8a8a8f] transition hover:bg-red-500/10 hover:text-red-400">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-white/[0.08] p-1">
                      <button type="button" onClick={() => { setWishlistMenuOpen(false); openProfile('favorites') }} className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[10px] px-3 py-2 text-sm font-medium text-orange-500 transition hover:bg-orange-500 hover:text-[#2a1500]">
                        View full wishlist
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account dropdown — trigger pill + menu (behavior unchanged) */}
              <div className="relative" ref={accountMenuRef}>
                <button type="button" onClick={() => { setWishlistMenuOpen(false); setAccountMenuOpen((o) => !o) }} aria-haspopup="menu" aria-expanded={accountMenuOpen} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/[0.08] bg-[#141416] py-1 pl-1 pr-2 text-[13px] text-[#f4f4f5] transition hover:border-white/[0.14]">
                  <span className="relative flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500 text-[11px] font-medium uppercase leading-none text-[#2a1500]">
                    {(user.name ? user.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') : user.email.split('@')[0].slice(0, 2)).toUpperCase()}
                    {user.photo && (
                      <img src={user.photo} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full rounded-full object-cover" />
                    )}
                  </span>
                  <span className="hidden sm:inline">{user.name ? user.name.trim().split(/\s+/)[0] : user.email.split('@')[0]}</span>
                  <svg viewBox="0 0 24 24" className={`h-4 w-4 text-[#8a8a8f] transition-transform duration-200 ${accountMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {accountMenuOpen && (
                  <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/[0.08] bg-[#141416] shadow-xl">
                    {/* Identity */}
                    <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
                      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-orange-500 text-[13px] font-medium uppercase leading-none text-[#2a1500]">
                        {(user.name ? user.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('') : user.email.split('@')[0].slice(0, 2)).toUpperCase()}
                        {user.photo && (
                          <img src={user.photo} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = 'none' }} className="absolute inset-0 h-full w-full rounded-full object-cover" />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-[#f4f4f5]">{user.name ? user.name.trim().split(/\s+/)[0] : user.email.split('@')[0]}</div>
                        <div className="truncate text-xs text-[#8a8a8f]" title={user.email}>{user.email}</div>
                      </div>
                    </div>
                    {/* Menu rows */}
                    <div className="p-1">
                      <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); openProfile('favorites') }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm text-[#f4f4f5] transition hover:bg-orange-500 hover:text-[#2a1500]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                        My account
                      </button>
                      <button type="button" role="menuitem" onClick={() => { setAccountMenuOpen(false); openProfile('settings') }} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm text-[#f4f4f5] transition hover:bg-orange-500 hover:text-[#2a1500]">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="3" />
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                        </svg>
                        Settings
                      </button>
                    </div>
                    {/* Divider + Log out */}
                    <div className="border-t border-white/[0.08] p-1">
                      <button type="button" role="menuitem" onClick={handleSignOut} disabled={signingOut} className="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] px-3 py-2 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10 disabled:cursor-default disabled:opacity-60">
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Log out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setShowAuthModal(true)} className="cursor-pointer rounded-[10px] bg-orange-500 px-4 py-2 text-sm font-medium text-[#2a1500] transition hover:bg-orange-400">
              Login / Sign Up
            </button>
          )}
        </div>
      </header>

      {signingOut && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-black/70 backdrop-blur-sm" role="status" aria-live="polite">
          {signOutDone ? (
            <>
              <svg viewBox="0 0 24 24" className="h-12 w-12 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M8 12l3 3 5-6" />
              </svg>
              <p className="text-base font-medium text-white">Signed out</p>
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-12 w-12 animate-spin text-orange-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
              </svg>
              <p className="text-base font-medium text-white">Signing out…</p>
            </>
          )}
        </div>
      )}

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

            <input type="email" autoComplete="username" placeholder="Email address" value={authEmail} onChange={e => setAuthEmail(e.target.value)} onKeyPress={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : null)} />

            <div className="password-input-container">
              <input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Password" value={authPassword} onChange={e => setAuthPassword(e.target.value)} onKeyPress={e => e.key === 'Enter' && (authMode === 'login' ? handleLogin() : null)} />
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
                <input type={showConfirmPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="Confirm Password" value={authConfirm} onChange={e => setAuthConfirm(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleRegister()} />
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
          <div className="profile-header"><h2><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: 'middle', marginRight: '0.4em' }} aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>My Account</h2><p>{user.email}</p></div>
          <div className="profile-tabs">
            <button className={profileTab === 'favorites' ? 'active' : ''} onClick={() => selectProfileTab('favorites')}><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-0.125em', marginRight: '0.4em' }} aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>Favorites ({favorites.length})</button>
            <button className={profileTab === 'alerts' ? 'active' : ''} onClick={() => selectProfileTab('alerts')}><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-0.125em', marginRight: '0.4em' }} aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>Price Alerts ({priceAlerts.length})</button>
            <button className={profileTab === 'settings' ? 'active' : ''} onClick={() => selectProfileTab('settings')}><svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: '-0.125em', marginRight: '0.4em' }} aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>Settings</button>
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
                    <div className="alert-info"><h4>{alert.name}</h4><p className="inline-flex items-center gap-1">Current: ${alert.currentPrice} <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg> Target: ${alert.targetPrice}</p></div>
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
            {!onProductDetail && (
            <section className={`mx-auto w-full max-w-2xl px-6 text-center ${hasSearched ? 'py-6' : 'py-12 sm:py-16'}`}>
              {!hasSearched && (
                <>
                  <p className="text-xs font-medium uppercase tracking-[0.12em] text-orange-500">10+ stores, one search</p>
                  <h1 className="mx-auto mt-3 max-w-xl text-[30px] font-medium leading-[1.15] text-[#f4f4f5]">Find the lowest price on any sneaker.</h1>
                  <p className="mx-auto mt-3 max-w-md text-sm text-[#8a8a8f]">We compare StockX, GOAT, eBay, Flight Club and more, so you never overpay.</p>
                </>
              )}

              {/* Search — reuses searchQuery + handleSearch + handleKeyPress */}
              <div className="mt-7 flex items-center gap-2">
                <div className="relative flex-1">
                  <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#6a6a6f]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    autoComplete="off"
                    placeholder="Search sneakers, brands, or styles…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full rounded-[12px] border border-white/[0.08] bg-[#141416] py-3 pl-10 pr-3 text-sm text-[#f4f4f5] placeholder:text-[#6a6a6f] transition focus:border-white/[0.14] focus:outline-none"
                  />
                </div>
                <button type="button" onClick={handleSearch} className="shrink-0 cursor-pointer rounded-[12px] bg-orange-500 px-5 py-3 text-sm font-medium text-[#2a1500] transition hover:bg-orange-400">
                  {loading ? 'Searching…' : 'Search'}
                </button>
              </div>

              {/* Popular chips — quiet pills; existing quickSearch behavior */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <span className="text-[13px] text-[#6a6a6f]">Popular</span>
                {['Jordan 1', 'Dunk Low', 'Yeezy 350', 'Travis Scott', 'Air Max 95', 'Air Force 1'].map((tag) => (
                  <button key={tag} type="button" onClick={() => quickSearch(tag)} className="cursor-pointer rounded-full border border-white/[0.08] bg-[#141416] px-3 py-1 text-[13px] text-[#8a8a8f] transition hover:border-white/[0.14] hover:text-[#f4f4f5]">{tag}</button>
                ))}
              </div>
            </section>
            )}

            {error && <div className="error-message"><p>{error}</p></div>}
            {(selectedCategory || selectedBrand) && (
              <div className="mb-5 flex">
                <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#141416] px-3 py-1.5 text-[13px] text-[#8a8a8f]">
                  Showing: <span className="text-orange-500">{selectedCategory || selectedBrand}</span>
                  <button type="button" onClick={goHome} aria-label="Clear filter" className="ml-1 inline-flex items-center gap-1 text-[#6a6a6f] transition hover:text-[#f4f4f5]">
                    Clear
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                  </button>
                </span>
              </div>
            )}

            {hasSearched && !error && (
              <div className="results-section">
                {loading ? (
                  <div className="loading"><div className="spinner"></div><p>Finding the best prices...</p></div>
                ) : allProducts.length > 0 ? (
                  <div className="products-grid">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="text-sm text-[#8a8a8f]">{allProducts.length} products found</h3>
                      <div className="flex items-center gap-2 text-[13px] text-[#8a8a8f]">
                        <label htmlFor="sort-select">Sort by:</label>
                        <select id="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="rounded-[10px] border border-white/[0.08] bg-[#141416] px-3 py-1.5 text-[13px] text-[#f4f4f5] transition focus:border-white/[0.14] focus:outline-none">
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
                          {(() => {
                            const saved = isFavorite(sneakerInfo.id)
                            return (
                              <button type="button" onClick={() => toggleFavorite(sneakerInfo)} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${saved ? 'border-orange-500 bg-orange-500 text-[#2a1500]' : 'border-orange-500/50 bg-[#121212] text-white hover:border-orange-500 hover:bg-[#1c1c1c]'}`}>
                                <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${saved ? 'text-[#2a1500]' : 'text-orange-500'}`} fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                                </svg>
                                {saved ? 'Saved' : 'Save'}
                              </button>
                            )
                          })()}
                          {(() => {
                            const alertOn = priceAlerts.some(a => a.id === sneakerInfo.id)
                            return (
                              <button type="button" onClick={() => { const target = prompt('Enter target price for alert:', Math.floor(results[0].price * 0.9)); if (target) addPriceAlert(sneakerInfo, parseInt(target)) }} className={`inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${alertOn ? 'border-orange-500 bg-orange-500 text-[#2a1500]' : 'border-orange-500/50 bg-[#121212] text-white hover:border-orange-500 hover:bg-[#1c1c1c]'}`}>
                                <svg viewBox="0 0 24 24" className={`h-[18px] w-[18px] ${alertOn ? 'text-[#2a1500]' : 'text-orange-500'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                                </svg>
                                {alertOn ? 'Alert on' : 'Price Alert'}
                              </button>
                            )
                          })()}
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
                <section className="mb-12">
                  <div className="mb-6">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-orange-500">Limited time</p>
                    <h2 className="mt-1 text-[20px] font-medium text-[#f4f4f5]">Hot deals</h2>
                    <p className="mt-0.5 text-sm text-[#8a8a8f]">Biggest discounts right now</p>
                  </div>
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
                </section>

                {/* Shop by Category */}
                <section className="mb-12">
                  <h2 className="mb-5 text-[20px] font-medium text-[#f4f4f5]">Shop by Category</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {CATEGORY_IMAGES.map((cat) => (
                      <button key={cat.name} type="button" onClick={() => browseByCategory(cat.name)} className="relative aspect-[4/3] cursor-pointer overflow-hidden rounded-[14px] border border-white/[0.08] transition hover:border-white/[0.14]">
                        <img src={cat.image} alt={cat.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                        <span className="absolute bottom-3 left-3 text-[15px] font-medium text-white">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Popular Brands */}
                <section className="mb-12">
                  <h2 className="mb-5 text-[20px] font-medium text-[#f4f4f5]">Popular Brands</h2>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                    {BRAND_LOGOS.map((brand) => (
                      <button key={brand.name} type="button" onClick={() => browseByBrand(brand.name)} className="flex cursor-pointer flex-col items-center gap-2 rounded-[12px] border border-white/[0.08] bg-[#141416] p-3 transition hover:border-white/[0.14]">
                        <div className="flex h-12 w-full items-center justify-center rounded-[8px] bg-[#f4f4f4]">
                          <img src={brand.logo} alt={brand.name} loading="lazy" className="max-h-[30px] max-w-[72%] object-contain" />
                        </div>
                        <span className="text-[13px] text-[#8a8a8f]">{brand.name}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* How it works */}
                <section className="mb-12">
                  <h2 className="mb-5 text-[20px] font-medium text-[#f4f4f5]">How it works</h2>
                  <div className="mx-auto grid max-w-3xl gap-8 sm:grid-cols-3">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-[rgba(249,115,22,0.12)] text-orange-500">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-[#eaeaec]">Search</h3>
                        <p className="mt-0.5 text-xs text-[#8a8a8f]">Search or browse sneakers</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-[rgba(249,115,22,0.12)] text-orange-500">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3 4 7l4 4" /><path d="M4 7h16" /><path d="m16 21 4-4-4-4" /><path d="M20 17H4" /></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-[#eaeaec]">Compare</h3>
                        <p className="mt-0.5 text-xs text-[#8a8a8f]">Compare prices from 10+ stores</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center gap-3 text-center">
                      <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-[rgba(249,115,22,0.12)] text-orange-500">
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><path d="M3 6h18" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-[#eaeaec]">Buy</h3>
                        <p className="mt-0.5 text-xs text-[#8a8a8f]">Click to buy at the lowest price</p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-white/[0.07] px-6 py-8 text-center sm:px-10 lg:px-16">
        <p className="text-sm text-[#8a8a8f]">Comparing prices across StockX, GOAT, eBay, Flight Club, Soccer.com and more</p>
        <p className="mt-2 text-xs text-[#6a6a6f]">© 2026 SneakersForLess. Not affiliated with any retailer.</p>
      </footer>
    </div>
  )
}

export default App