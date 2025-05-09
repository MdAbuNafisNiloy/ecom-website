import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faTh,
  faShoppingCart,
  faUser,
  faSearch,
  faHeart,
  faArrowLeft,
  faBars,
  faTimesCircle,
  faImage,
  faFileText,
  faCog,
  faQuestionCircle,
  faSignOutAlt,
  faArrowRightFromBracket,
  faCheckCircle,
  faCar,
  faReceipt,
  faShip,
  faShieldAlt,
  faLink,
  faDownload,
  faStore,
  faMessage,
  faHeadset
} from '@fortawesome/free-solid-svg-icons';
import CategoriesScreen from './screens/CategoriesScreen';
import ProductsScreen from './screens/ProductsScreen';
import ProductDetailScreen from './screens/ProductDetailScreen';
import MessageScreen from './screens/MessageScreen';
import SupportChatScreen from './screens/SupportChatScreen';
import { CartProvider, useCart } from './contexts/CartContext';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginScreen from './screens/LoginScreen';
import SignupScreen from './screens/SignupScreen';
import CartScreen from './screens/CartScreen';
import ProfileScreen from './screens/ProfileScreen';
import WishlistScreen from './screens/WishlistScreen';
import SearchProductScreen from './screens/SearchProductsScreen';
import CategoryProducts from './screens/CategoryProductsScreen';
import ShopScreen from './screens/ShopScreen';
import MyOrdersScreen from './screens/MyOrdersScreen';
import OrderDetailsScreen from './screens/OrderDetailsScreen';
import PolicyScreen from './screens/PolicyScreen';
import pb from './pocketbase';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';
import ChatsScreen from './screens/ChatsScreen';

// Dynamic Policy Page Component
const DynamicPolicyPage = () => {
  const { title } = useParams();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        // Fetch policy by title
        const record = await pb.collection('policies').getFirstListItem(`title="${title}"`);
        setPolicy(record);
        localStorage.setItem('policyTitle', record.title);
      } catch (error) {
        console.error('Error fetching policy:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchPolicy();
  }, [title]);
  
  if (loading) {
    return <div className="loading-container"><div className="loading-spinner"></div></div>;
  }
  
  if (!policy) {
    return <div className="error-message">Policy not found</div>;
  }
  
  return <PolicyScreen />;
};

// Custom Drawer Content
const CustomDrawerContent = ({ isOpen, closeDrawer }) => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const [appInfo, setAppInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socialLinks, setSocialLinks] = useState([]);
  const [supportUrl, setSupportUrl] = useState('');
  const [policies, setPolicies] = useState([]);
  const [appLinks, setAppLinks] = useState([]);
  const drawerRef = useRef(null);

  // Calculate the total number of items in the cart
  const cartItemCount = Object.values(cart).reduce((total, item) => total + (item.quantity || 0), 0);

  // Close drawer when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isOpen && drawerRef.current && !drawerRef.current.contains(event.target)) {
        closeDrawer();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeDrawer]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [isOpen]);

  // Fetch app info from PocketBase
  useEffect(() => {
    const fetchAppInfo = async () => {
      try {
        const record = await pb.collection('appinfo').getFirstListItem('');
        setAppInfo(record);
      } catch (error) {
        console.error('Error fetching app info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppInfo();
  }, []);

  // Fetch social links from PocketBase
  useEffect(() => {
    const fetchSocialLinks = async () => {
      try {
        const links = await pb.collection('social_links').getFullList();
        setSocialLinks(links);

        // Find the 'messenger' link for support
        const messengerLink = links.find(link => link.name === 'messenger');
        if (messengerLink) {
          setSupportUrl(messengerLink.url);
        }
      } catch (error) {
        console.error('Error fetching social links:', error);
      }
    };

    fetchSocialLinks();
  }, []);

  // Fetch app download links from PocketBase
  useEffect(() => {
    const fetchAppLinks = async () => {
      try {
        const links = await pb.collection('app_links').getFullList();
        setAppLinks(links);
      } catch (error) {
        console.error('Error fetching app links:', error);
      }
    };

    fetchAppLinks();
  }, []);

  // Fetch policies from PocketBase
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const records = await pb.collection('policies').getFullList();
        setPolicies(records);
      } catch (error) {
        console.error('Error fetching policies:', error);
      }
    };

    fetchPolicies();
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
    closeDrawer();
  };

  const handlePolicyClick = (policy) => {
    localStorage.setItem('policyTitle', policy.title);
    // Updated to use dynamic URL structure
    handleNavigation(`/pages/${policy.title}`);
  };

  // Function to determine policy icon
  const getPolicyIcon = (policyTitle) => {
    // Set specific icons based on policy type
    const policyLower = policyTitle.toLowerCase();
    switch(policyLower) {
      case "return":
        return faArrowLeft;
      case "delivery":
        return faCar;
      case "order":
        return faReceipt;
      case "shipping":
        return faShip;
      case "privacy":
        return faShieldAlt;
      default:
        return faFileText; // Default icon for any other policy
    }
  };

  // Function to determine policy display name
  const getPolicyDisplayName = (policyTitle) => {
    // For manually handled policies, add the word "Policy" or "Procedure"
    const policyLower = policyTitle.toLowerCase();
    if (["return", "delivery", "shipping", "privacy"].includes(policyLower)) {
      return `${policyTitle.charAt(0).toUpperCase() + policyTitle.slice(1).toLowerCase()} Policy`;
    } else if (policyLower === "order") {
      return "Order Procedure";
    } else {
      // For dynamically added policies, show the original name without adding additional words
      return policyTitle;
    }
  };

  if (loading) {
    return (
      <motion.div 
        className="drawer-container drawer-loading-container"
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        ref={drawerRef}
      >
        <div className="drawer-loading">
          <div className="loading-spinner"></div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`drawer-container ${isOpen ? 'open' : ''}`}
      initial={{ x: '-100%' }}
      animate={{ x: isOpen ? 0 : '-100%' }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      ref={drawerRef}
    >
      <div className="drawer-header">
        <div className="drawer-logo-container">
          {appInfo?.logo ? (
            <img
              src={pb.files.getURL(appInfo, appInfo.logo)}
              alt={appInfo?.appName || 'App Logo'}
              className="app-logo"
            />
          ) : (
            <div className="app-logo-placeholder">
              <FontAwesomeIcon icon={faStore} size="2x" />
            </div>
          )}
        </div>
        <h3 className="welcome-text">Welcome to {appInfo?.appName || 'Our Shop'}</h3>
        <button 
          className="drawer-close-button"
          onClick={closeDrawer}
          aria-label="Close menu"
        >
          <FontAwesomeIcon icon={faTimesCircle} size="lg" />
        </button>
      </div>

      <div className="drawer-content">
        <div className="drawer-section">
          <div className="drawer-item" onClick={() => handleNavigation('/')}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faHome} />
            </div>
            <span className="drawer-item-text">Home</span>
          </div>

          <div className="drawer-item" onClick={() => handleNavigation('/categories')}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faTh} />
            </div>
            <span className="drawer-item-text">Categories</span>
          </div>

          <div className="drawer-item" onClick={() => handleNavigation('/wishlist')}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faHeart} />
            </div>
            <span className="drawer-item-text">Wishlist</span>
          </div>

          <div className="drawer-item" onClick={() => handleNavigation('/cart')}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faShoppingCart} />
            </div>
            <span className="drawer-item-text">Cart</span>
            {cartItemCount > 0 && (
              <div className="drawer-item-badge">
                <span>{cartItemCount}</span>
              </div>
            )}
          </div>
        </div>

        <div className="drawer-divider"></div>
        
        <div className="drawer-section">
          <div className="drawer-section-title">My Account</div>
          <div className="drawer-item" onClick={() => handleNavigation('/my-orders')}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faFileText} />
            </div>
            <span className="drawer-item-text">My Orders</span>
          </div>

          {policies.map((policy, index) => (
            <div
              key={index}
              className="drawer-item"
              onClick={() => handlePolicyClick(policy)}
            >
              <div className="drawer-item-icon">
                <FontAwesomeIcon icon={getPolicyIcon(policy.title)} />
              </div>
              <span className="drawer-item-text">
                {getPolicyDisplayName(policy.title)}
              </span>
            </div>
          ))}
        </div>

        {/* Download App Section - Only show if app links exist */}
        {appLinks.length > 0 && (
          <>
            <div className="drawer-divider"></div>
            <div className="drawer-section">
              <div className="drawer-section-title">Download App</div>
              {appLinks.map((link, index) => (
                <div
                  key={index}
                  className="drawer-item"
                  onClick={() => window.open(link.url, '_blank')}
                >
                  <div className="drawer-item-icon">
                    <FontAwesomeIcon icon={faDownload} />
                  </div>
                  <span className="drawer-item-text">
                    {link.title || "Download App"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
        {/* become a seller option */}
        <div className="drawer-divider"></div>
        <div className="drawer-section">
          <div className="drawer-section-title">Become a Seller</div>
          <a className="drawer-item" href='https://seller.goodmartbd.com/' target="_blank" style={{textDecoration: 'none'}}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faArrowRightFromBracket} />
            </div>
            <span className="drawer-item-text">Login as Seller</span>
          </a>
          <a className="drawer-item" href='https://seller.goodmartbd.com/register' target="_blank" style={{textDecoration: 'none'}}>
            <div className="drawer-item-icon">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>
            <span className="drawer-item-text">Register as Seller</span>
          </a>
        </div>
        {/* Settings Section */}
        {supportUrl && (
          <>
            <div className="drawer-divider"></div>
            <div className="drawer-section">
              <div className="drawer-section-title">Support</div>
              <div
                className="drawer-item"
                onClick={() => handleNavigation('/support')}
              >
                <div className="drawer-item-icon">
                  <FontAwesomeIcon icon={faHeadset} />
                </div>
                <span className="drawer-item-text">Customer Support</span>
              </div>
              <div
                className="drawer-item"
                onClick={() => window.open(supportUrl, '_blank')}
              >
                <div className="drawer-item-icon">
                  <FontAwesomeIcon icon={faMessage} />
                </div>
                <span className="drawer-item-text">Messenger Support</span>
              </div>
            </div>
          </>
        )}

        {socialLinks.length > 0 && socialLinks.some(link => link.name !== 'messenger') && (
          <>
            <div className="drawer-divider"></div>
            <div className="drawer-section">
              <div className="drawer-section-title">Follow Us</div>
              <div className="social-links-grid">
                {socialLinks
                  .filter(link => link.name !== 'messenger')
                  .map((link, index) => (
                    <div
                      key={index}
                      className="social-link-item"
                      onClick={() => window.open(link.url, '_blank')}
                    >
                      {link.icon ? (
                        <img
                          src={pb.baseURL + "/api/files/social_links/" + link.id + "/" + link.icon}
                          alt={link.name}
                          className="social-icon"
                        />
                      ) : (
                        <FontAwesomeIcon icon={faLink} />
                      )}
                      <span className="social-link-name">{link.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="drawer-footer">
        <p className="drawer-footer-text">App Version 1.0.0</p>
      </div>
    </motion.div>
  );
};

// Custom header with search bar and quick-access icons
const CustomHeader = ({ title, showBackButton = false, hideSearchIcon = false }) => {
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const { cart } = useCart();
  const cartItemCount = Object.values(cart).reduce((total, item) => total + (item.quantity || 0), 0);
  
  // Handle search submission
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchText.trim()) {
      navigate(`/search?query=${encodeURIComponent(searchText.trim())}`);
      setSearchText('');
      setShowSearch(false);
    }
  };

  return (
    <header className="header-container">
      {/* Drawer */}
      <AnimatePresence>
        {drawerOpen && <CustomDrawerContent isOpen={drawerOpen} closeDrawer={() => setDrawerOpen(false)} />}
      </AnimatePresence>
      
      {/* Overlay for drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <motion.div 
            className="drawer-overlay" 
            onClick={() => setDrawerOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          ></motion.div>
        )}
      </AnimatePresence>
      
      <div className="header-top">
        {showBackButton ? (
          <button 
            className="header-button" 
            onClick={() => navigate(-1)}
            aria-label="Go back"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        ) : (
          <button 
            className="header-button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
          >
            <FontAwesomeIcon icon={faBars} />
          </button>
        )}
        
        <h1 className="header-title">{title || "Shop"}</h1>
        
        <div className="header-right-container">
          {!hideSearchIcon && (
            <button 
              className="header-button"
              onClick={() => setShowSearch(!showSearch)}
              aria-label="Search"
            >
              <FontAwesomeIcon icon={faSearch} />
            </button>
          )}
          
          <button 
            className="header-button cart-button"
            onClick={() => navigate('/cart')}
            aria-label="Cart"
          >
            <FontAwesomeIcon icon={faShoppingCart} />
            {cartItemCount > 0 && (
              <div className="header-badge">
                <span>{cartItemCount}</span>
              </div>
            )}
          </button>
          
          <button 
            className="header-button"
            onClick={() => navigate('/wishlist')}
            aria-label="Wishlist"
          >
            <FontAwesomeIcon icon={faHeart} />
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {showSearch && (
          <motion.form 
            className="search-bar-container"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            onSubmit={handleSearchSubmit}
          >
            <div className="search-input-container">
              <FontAwesomeIcon icon={faSearch} className="search-icon" />
              <input
                className="search-input"
                placeholder="Search products..."
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                autoFocus
              />
              {searchText && (
                <button 
                  type="button" 
                  onClick={() => setSearchText('')} 
                  className="clear-button"
                  aria-label="Clear search"
                >
                  <FontAwesomeIcon icon={faTimesCircle} />
                </button>
              )}
            </div>
            <button 
              type="submit" 
              className="search-submit-button"
              disabled={!searchText.trim()}
            >
              Search
            </button>
          </motion.form>
        )}
      </AnimatePresence>
    </header>
  );
};

// Main TabBar component
const TabBar = ({ activeTab }) => {
  const navigate = useNavigate();
  const { cart } = useCart();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const cartItemCount = Object.values(cart).reduce((total, item) => total + (item.quantity || 0), 0);
  
  // Fetch unread message count
  useEffect(() => {
    let isMounted = true;
    
    // Simple function to fetch unread messages
    const fetchUnreadMessages = async () => {
      if (!user || !user.id) return;
      
      try {
        const filter = `user = "${user.id}" && sender = "seller" && read_status = false`;
        console.log('fetchUnreadMessages: Using filter:', filter);

        // Use a unique cancel key for this specific fetch operation
        const cancelKey = 'fetch-unread-count-' + user.id;
        
        // Debug: Print PocketBase base URL and API endpoint
        console.log('PB Base URL:', pb.baseUrl);
        console.log('API Endpoint:', `${pb.baseUrl}/api/collections/seller_chat/records`);
        
        // Using getFullList to count records by fetching them
        // This is the most reliable way to get an accurate count
        const records = await pb.collection('seller_chat').getFullList({
          filter: filter,
          requestKey: cancelKey
        });

        console.log('fetchUnreadMessages: Raw Records from PocketBase:', records);
        console.log('fetchUnreadMessages: Record count:', records.length);
        
        // Update state if component is still mounted
        if (isMounted) {
          setUnreadCount(records.length);
        }
      } catch (err) {
        console.error('Error fetching unread messages:', err);
      }
    };
    
    // Initial fetch
    fetchUnreadMessages();
    
    // Set up interval to check periodically
    const intervalId = setInterval(fetchUnreadMessages, 30000);
    
    // Set up real-time subscription for messages
    let unsubscribe = () => {};
    
    if (user && user.id) {
      pb.collection('seller_chat').subscribe('*', function(e) {
        if (e.record && e.record.user === user.id) {
          fetchUnreadMessages();
        }
      }).then(function(subscription) {
        unsubscribe = subscription;
      });
    }
    
    // Clean up
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      unsubscribe();
    };
  }, [user]);
  
  return (
    <nav className="tab-bar">
      <div 
        className={`tab-item ${activeTab === 'home' ? 'active' : ''}`}
        onClick={() => navigate('/')}
        aria-label="Home"
        role="button"
      >
        <div className="tab-icon">
          <FontAwesomeIcon icon={faHome} />
        </div>
        <span className="tab-label">Home</span>
      </div>
      
      <div 
        className={`tab-item ${activeTab === 'categories' ? 'active' : ''}`}
        onClick={() => navigate('/categories')}
        aria-label="Categories"
        role="button"
      >
        <div className="tab-icon">
          <FontAwesomeIcon icon={faTh} />
        </div>
        <span className="tab-label">Categories</span>
      </div>
      
      <div 
        className={`tab-item ${activeTab === 'chats' ? 'active' : ''}`}
        onClick={() => navigate('/chats')}
        aria-label="Messages"
        role="button"
      >
        <div className="tab-icon-container" style={{ position: 'relative' }}>
          <FontAwesomeIcon icon={faMessage} />
          {unreadCount > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                backgroundColor: '#ff0000',
                color: 'white',
                fontSize: '0.7rem',
                minWidth: '18px',
                height: '18px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                padding: '0 4px',
                border: '1px solid white',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                zIndex: 10
              }}
            >
              {unreadCount}
            </div>
          )}
        </div>
        <span className="tab-label">Messages</span>
      </div>
      
      <div 
        className={`tab-item ${activeTab === 'cart' ? 'active' : ''}`}
        onClick={() => navigate('/cart')}
        aria-label="Cart"
        role="button"
      >
        <div className="tab-icon-container">
          <FontAwesomeIcon icon={faShoppingCart} />
          {cartItemCount > 0 && (
            <div className="tab-badge">{cartItemCount}</div>
          )}
        </div>
        <span className="tab-label">Cart</span>
      </div>
      
      <div 
        className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`}
        onClick={() => navigate('/profile')}
        aria-label="Profile"
        role="button"
      >
        <div className="tab-icon">
          <FontAwesomeIcon icon={faUser} />
        </div>
        <span className="tab-label">Profile</span>
      </div>
    </nav>
  );
};

// Main Layout component with header and tab bar
const MainLayout = ({ children, title, showBackButton, activeTab, hideSearchIcon }) => {
  return (
    <div className="app-container">
      <CustomHeader 
        title={title} 
        showBackButton={showBackButton} 
        hideSearchIcon={hideSearchIcon}
      />
      <main className="main-content">
        <div className="content-container">
          {children}
        </div>
      </main>
      <TabBar activeTab={activeTab} />
    </div>
  );
};

// MessageLayout component without header and tab bar
const MessageLayout = ({ children }) => {
  return (
    <div className="app-container message-layout">
      <main className="main-content" style={{ height: '100vh', paddingTop: 0, paddingBottom: 0 }}>
        <div className="content-container" style={{ height: '100%' }}>
          {children}
        </div>
      </main>
    </div>
  );
};

// App Component
const App = () => {
  return (
    <UserProvider>
      <CartProvider>
        <Router>
          <div className="app-wrapper">
            <Routes>
              {/* Home route */}
              <Route path="/" element={
                <MainLayout title="Good Mart BD" activeTab="home">
                  <ProductsScreen />
                </MainLayout>
              } />
              
              {/* Product detail route */}
              <Route path="/product/:id" element={
                <MainLayout title="Product" showBackButton={true}>
                  <ProductDetailScreen />
                </MainLayout>
              } />
              
              {/* Categories route */}
              <Route path="/categories" element={
                <MainLayout title="Categories" activeTab="categories">
                  <CategoriesScreen />
                </MainLayout>
              } />
              
              {/* Category Products */}
              <Route path="/category/:id" element={
                <MainLayout title="Category Products" showBackButton={true}>
                  <CategoryProducts />
                </MainLayout>
              } />
              
              {/* Cart route */}
              <Route path="/cart" element={
                <MainLayout title="Cart" activeTab="cart">
                  <CartScreen />
                </MainLayout>
              } />
              
              {/* Profile route */}
              <Route path="/profile" element={
                <MainLayout title="Profile" activeTab="profile">
                  <ProfileScreen />
                </MainLayout>
              } />
              
              {/* Login route */}
              <Route path="/login" element={
                <MainLayout title="Login" showBackButton={true}>
                  <LoginScreen />
                </MainLayout>
              } />
              
              {/* Signup route */}
              <Route path="/signup" element={
                <MainLayout title="Sign Up" showBackButton={true}>
                  <SignupScreen />
                </MainLayout>
              } />
              
              {/* Search products */}
              <Route path="/search" element={
                <MainLayout title="Search Products" showBackButton={true} hideSearchIcon={true}>
                  <SearchProductScreen />
                </MainLayout>
              } />
              
              {/* Wishlist route */}
              <Route path="/wishlist" element={
                <MainLayout title="Wishlist" showBackButton={true}>
                  <WishlistScreen />
                </MainLayout>
              } />
              
              {/* My Orders route */}
              <Route path="/my-orders" element={
                <MainLayout title="My Orders" showBackButton={true}>
                  <MyOrdersScreen />
                </MainLayout>
              } />
              
              {/* Order Details route */}
              <Route path="/order-details/:id" element={
                <MainLayout title="Order Details" showBackButton={true}>
                  <OrderDetailsScreen />
                </MainLayout>
              } />
              
              {/* Shop route */}
              <Route path="/shop/:id" element={
                <MainLayout title="Shop" showBackButton={true}>
                  <ShopScreen />
                </MainLayout>
              } />
              
              {/* Policy route - Keep for backward compatibility */}
              <Route path="/policy" element={
                <MainLayout title="Policy" showBackButton={true}>
                  <PolicyScreen />
                </MainLayout>
              } />
              
              {/* Dynamic Policy Pages route */}
              <Route path="/pages/:title" element={
                <MainLayout title="Page" showBackButton={true}>
                  <DynamicPolicyPage />
                </MainLayout>
              } />

              {/* Message route */}
              <Route path="/message" element={
                <MessageLayout>
                  <MessageScreen />
                </MessageLayout>
              } />

              {/* Message route with seller ID parameter */}
              <Route path="/message/:id" element={
                <MessageLayout>
                  <MessageScreen />
                </MessageLayout>
              } />

              {/* Chats route */}
              <Route path="/chats" element={
                <MainLayout title="Chats" showBackButton={true}>
                  <ChatsScreen />
                </MainLayout>
              } />

              {/* Support Chat route - both anonymous and logged-in users can access */}
              <Route path="/support" element={
                <MessageLayout>
                  <SupportChatScreen />
                </MessageLayout>
              } />
            </Routes>
            <ToastContainer 
              position="bottom-center" 
              autoClose={3000} 
              hideProgressBar={false}
              newestOnTop
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="colored"
            />
          </div>
        </Router>
      </CartProvider>
    </UserProvider>
  );
};

export default App