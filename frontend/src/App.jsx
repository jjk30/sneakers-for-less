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
  const [showFilters, setShowFilters] = useState(false)
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
      <header className="header">
        <div className="header-content">
          <h1 className="logo" onClick={goHome}><span className="logo-icon">👟</span>SNEAKERS<span className="logo-accent">FORLESS</span></h1>
          <div className="header-right">
            {user ? (
              <div className="user-menu">
                <button className="user-btn" onClick={openProfile}><span className="user-icon">👤</span><span className="user-email-short">{user.email.split('@')[0]}</span></button>
                <button className="fav-btn" onClick={openProfile}>❤️ {favorites.length}</button>
                <button className="logout-btn-small" onClick={handleLogout}>Logout</button>
              </div>
            ) : (
              <button className="login-btn" onClick={() => setShowAuthModal(true)}>Login / Sign Up</button>
            )}
          </div>
        </div>
        <p className="tagline">Compare prices across 70+ sneakers from top brands</p>
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
                    <div key={fav.id} className="product-card">
                      <button className="remove-fav" onClick={() => toggleFavorite(fav)}>×</button>
                      {fav.image && <img src={fav.image} alt={fav.name} className="product-image" loading="lazy" onClick={() => selectProduct(fav.id)} />}
                      <div className="product-info" onClick={() => selectProduct(fav.id)}>
                        <span className="product-brand">{fav.brand}</span>
                        <h4 className="product-name">{fav.name}</h4>
                        <span className="lowest-price">${fav.lowest_price}</span>
                      </div>
                    </div>
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
              <div className="search-box">
                <input type="text" placeholder="Search sneakers, brands, or styles..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyPress={handleKeyPress} className="search-input" />
                <button onClick={handleSearch} className="search-btn">{loading ? 'Searching...' : 'Find Deals'}</button>
              </div>
              <button className="filter-toggle" onClick={() => setShowFilters(!showFilters)}>{showFilters ? 'Hide Filters' : 'Show Filters'}</button>
              {showFilters && (
                <div className="filters-section">
                  <div className="filter-group"><h4>Categories</h4><div className="filter-tags">{categories.map((cat) => (<button key={cat} onClick={() => browseByCategory(cat)} className={`filter-tag ${selectedCategory === cat ? 'active' : ''}`}>{cat}</button>))}</div></div>
                  <div className="filter-group"><h4>Brands</h4><div className="filter-tags">{brands.map((brand) => (<button key={brand} onClick={() => browseByBrand(brand)} className={`filter-tag ${selectedBrand === brand ? 'active' : ''}`}>{brand}</button>))}</div></div>
                </div>
              )}
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
                        <div key={product.id} className="product-card">
                          <button className={`fav-heart ${isFavorite(product.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(product); }}>{isFavorite(product.id) ? '❤️' : '🤍'}</button>
                          {product.discount_percent > 0 && <div className="discount-badge">-{product.discount_percent}%</div>}
                          <div onClick={() => selectProduct(product.id)}>
                            {product.image && <img src={product.image} alt={product.name} className="product-image" loading="lazy" />}
                            <div className="product-info">
                              <span className="product-brand">{product.brand}</span>
                              <h4 className="product-name">{product.name}</h4>
                              <div className="product-prices"><span className="lowest-price">${product.lowest_price}</span>{product.retail_price && product.retail_price > product.lowest_price && <span className="retail-price">${product.retail_price}</span>}</div>
                              {product.condition === 'pre-owned' && <span className="condition-badge">Pre-Owned</span>}
                            </div>
                          </div>
                        </div>
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
                        <div key={deal.id} className="deal-card" onClick={() => selectProduct(deal.id)}>
                          <div className="deal-discount-badge">-{deal.discount_percent}%</div>
                          <button className={`fav-heart ${isFavorite(deal.id) ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); toggleFavorite(deal); }}>{isFavorite(deal.id) ? '❤️' : '🤍'}</button>
                          {deal.image && <img src={deal.image} alt={deal.name} className="deal-image" loading="lazy" />}
                          <div className="deal-info">
                            <span className="deal-brand">{deal.brand}</span>
                            <h4 className="deal-name">{deal.name}</h4>
                            <div className="deal-prices"><span className="deal-current-price">${deal.lowest_price}</span><span className="deal-original-price">${deal.retail_price}</span></div>
                            <div className="deal-savings">Save ${deal.discount}</div>
                          </div>
                        </div>
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