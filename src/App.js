import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faShoppingCart,
  faArrowRight,
  faStore,
  faCheck,
  faShieldAlt,
  faEnvelope,
  faMapMarkerAlt,
  faPhone,
  faStar,
  faComments,
  faEye,
  faCode,
  faLaptopCode
} from '@fortawesome/free-solid-svg-icons';
import {
  faFacebook,
  faTwitter,
  faInstagram,
  faLinkedin,
  faWhatsapp as faWhatsappBrand,
  faFacebookMessenger
} from '@fortawesome/free-brands-svg-icons';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Import context providers
import { CartProvider } from './contexts/CartContext';
import { UserProvider } from './contexts/UserContext';
import pb from './pocketbase';
import './App.css';

// Landing Page with Products
const LandingPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSocialOptions, setShowSocialOptions] = useState(false);
  
  // Current user info and datetime
  const currentDateTime = "2025-04-04 13:21:49";
  const userLogin = "MdAbuNafisNiloy";
  
  // Get current year for footer
  const currentYear = new Date().getFullYear();
  
  // Fetch products from PocketBase
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Fetch products
        const productRecords = await pb.collection('products').getList(1, 12, {
          sort: '-created',
          filter: 'status = "published"'
        });
        
        // Use all products
        setProducts(productRecords.items);
      } catch (error) {
        console.error('Error fetching products:', error);
        // Set fallback products
        const fallbackProducts = [
          {
            id: '1',
            title: 'CRM Software Solution',
            description: 'Complete customer relationship management system with analytics and reporting. Streamline your sales pipeline and improve customer engagement with our comprehensive solution.',
            price: 1499.99,
            compare_price: 1999.99,
            images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
            rating: 4.8,
            review_count: 42,
            featured: true,
            tag: 'Popular',
            demo: 'https://demo.alphasoft.com/crm'
          },
          {
            id: '2',
            title: 'E-Commerce Platform',
            description: 'Fully customizable e-commerce solution with payment gateway integration and inventory management. Scale your online business with our powerful and flexible platform.',
            price: 2499.99,
            compare_price: 2999.99,
            images: ['https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
            rating: 4.9,
            review_count: 56,
            featured: true,
            tag: 'Best Seller',
            demo: 'https://demo.alphasoft.com/ecommerce'
          },
          {
            id: '3',
            title: 'Enterprise Resource Planning',
            description: 'Comprehensive ERP solution for managing business resources, operations, and finances. Integrate all your business processes for maximum efficiency and productivity.',
            price: 3499.99,
            compare_price: 4299.99,
            images: ['https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
            rating: 4.7,
            review_count: 38,
            featured: true,
            tag: 'Enterprise',
            demo: 'https://demo.alphasoft.com/erp'
          },
          {
            id: '4',
            title: 'Project Management Software',
            description: 'Track tasks, deadlines, and team collaboration with our intuitive project management tool. Keep your projects on schedule and improve team productivity with real-time updates.',
            price: 999.99,
            compare_price: 1299.99,
            images: ['https://images.unsplash.com/photo-1531403009284-440f080d1e12?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
            rating: 4.6,
            review_count: 29,
            featured: true,
            demo: 'https://demo.alphasoft.com/pm'
          },
          {
            id: '5',
            title: 'Human Resources Management',
            description: 'Simplify HR processes including recruitment, onboarding, and performance reviews. Streamline your HR department operations with our comprehensive solution.',
            price: 1299.99,
            compare_price: 1599.99,
            images: ['https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
            rating: 4.5,
            review_count: 31,
            featured: true,
            demo: 'https://demo.alphasoft.com/hrm'
          },
          {
            id: '6',
            title: 'Business Intelligence Dashboard',
            description: 'Data visualization and analytics platform for making informed business decisions. Transform your raw data into actionable insights with powerful visualization tools.',
            price: 1899.99,
            compare_price: 2399.99,
            images: ['https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'],
            rating: 4.9,
            review_count: 47,
            featured: true,
            tag: 'Premium',
            demo: 'https://demo.alphasoft.com/bi'
          }
        ];
        
        setProducts(fallbackProducts);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  // Get image URL helper function
  const getImageUrl = (item, imageField = 'image') => {
    if (!item[imageField] || (Array.isArray(item[imageField]) && item[imageField].length === 0)) {
      return 'https://via.placeholder.com/800x600?text=No+Image+Available';
    }
    
    try {
      // Handle different image field structures
      if (Array.isArray(item[imageField])) {
        return pb.files.getUrl(item, item[imageField][0]) || 'https://via.placeholder.com/800x600?text=Image+Error';
      } else if (typeof item[imageField] === 'string') {
        return item[imageField];
      } else {
        return pb.files.getUrl(item, item[imageField]) || 'https://via.placeholder.com/800x600?text=Image+Error';
      }
    } catch (error) {
      console.error('Error getting image URL:', error);
      return 'https://via.placeholder.com/800x600?text=Image+Error';
    }
  };
  
  // Format price helper
  const formatPrice = (price) => {
    return typeof price === 'number' ? `ট${price.toFixed(2)}` : price;
  };
  
  // Calculate discount percentage
  const calculateDiscount = (price, comparePrice) => {
    if (!price || !comparePrice || comparePrice <= price) return null;
    return Math.round(((comparePrice - price) / comparePrice) * 100);
  };
  
  // Toggle social media options
  const toggleSocialOptions = () => {
    setShowSocialOptions(!showSocialOptions);
  };

  // Handle social media clicks
  const handleSocialClick = (platform) => {
    if (platform === 'messenger') {
      window.open('https://m.me/yourusername', '_blank');
    } else if (platform === 'whatsapp') {
      window.open('https://wa.me/123456789', '_blank');
    }
  };

  // Truncate text helper
  const truncateText = (text, maxLength) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };
  
  return (
    <div className="landing-page">
      {/* Modern Header */}
      <header className="modern-header">
        <div className="header-container">
          <div className="logo">
            Alpha<span>Soft</span>
          </div>
          
          <div className="header-actions">
            <button className="search-button">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>
            
            <button className="cart-button">
              <FontAwesomeIcon icon={faShoppingCart} />
              <span className="cart-count">0</span>
            </button>
            
            <div className="user-info">
              <span className="user-name">{userLogin}</span>
              <span className="datetime">{currentDateTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner Section */}
      <section className="hero-section">
        <div className="hero-pattern"></div>
        <div className="hero-container">
          <motion.div 
            className="hero-content"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="hero-title">
              Innovative <span className="highlight">Software</span> Solutions For Your Business
            </h1>
            <p className="hero-subtitle">
              Custom enterprise software to streamline operations, improve efficiency, and drive growth
            </p>
            <div className="hero-buttons">
              <button 
                className="hero-button primary"
                onClick={() => window.scrollTo({ top: document.getElementById('products-section').offsetTop - 80, behavior: 'smooth' })}
              >
                Explore Solutions
                <FontAwesomeIcon icon={faArrowRight} />
              </button>
              <button 
                className="hero-button secondary"
                onClick={() => toast.info("Contact us for custom software development")}
              >
                Contact Us
              </button>
            </div>
          </motion.div>
          
          <motion.div 
            className="hero-image-container"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <img 
              src="https://images.unsplash.com/photo-1547658719-da2b51169166?q=80&w=1528&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
              alt="Software Development" 
              className="hero-image"
            />
            <div className="hero-stats">
              <div className="stat">
                <span className="stat-number">200+</span>
                <span className="stat-label">Projects</span>
              </div>
              <div className="stat">
                <span className="stat-number">50+</span>
                <span className="stat-label">Clients</span>
              </div>
              <div className="stat">
                <span className="stat-number">4.9</span>
                <span className="stat-label">Rating</span>
              </div>
            </div>
          </motion.div>
        </div>
        
        <div className="hero-brand-bar">
          <div className="brand-bar-container">
            <div className="brand-label">Trusted by industry leaders</div>
            <div className="brand-logos">
              {["Microsoft", "Google", "Amazon", "IBM", "Oracle"].map((brand, index) => (
                <div key={index} className="brand-logo">
                  {brand}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      
      {/* Products Section */}
      <section id="products-section" className="products-section">
        <div className="section-container">
          <div className="section-header">
            {/* <span className="section-tag">Solutions</span> */}
            <h2 className="section-title">Our Software Products</h2>
            <p className="section-subtitle">
              Enterprise-grade software solutions designed to address your business challenges
            </p>
          </div>
          
          {loading ? (
            // Product loading skeletons
            <div className="products-grid">
              {Array(6).fill(0).map((_, index) => (
                <div key={index} className="product-skeleton">
                  <div className="product-skeleton-img loading-skeleton"></div>
                  <div className="product-skeleton-content">
                    <div className="product-skeleton-title loading-skeleton"></div>
                    <div className="product-skeleton-rating loading-skeleton"></div>
                    <div className="product-skeleton-price loading-skeleton"></div>
                    <div className="product-skeleton-desc loading-skeleton"></div>
                    <div className="product-skeleton-buttons loading-skeleton"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            // Actual product grid
            <div className="products-grid">
              {products.map((product, index) => {
                const discountPercent = calculateDiscount(product.price, product.compare_price);
                
                return (
                  <motion.div 
                    key={product.id} 
                    className="product-card"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index % 6 * 0.05 }}
                  >
                    <div className="product-image-container">
                      <img 
                        src={getImageUrl(product, 'images')} 
                        alt={product.title} 
                        className="product-image"
                      />
                      {discountPercent && (
                        <div className="discount-badge">
                          {discountPercent}% OFF
                        </div>
                      )}
                      {product.tag && (
                        <div className="product-tag small">{product.tag}</div>
                      )}
                      <div className="product-actions">
                        <button className="product-action" title="Quick view" onClick={() => toast.info(`Quick view for ${product.title}`)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                          </svg>
                        </button>
                        <button className="product-action" title="Add to favorites" onClick={() => toast.info(`Added ${product.title} to favorites`)}>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="product-content">
                      <h3 className="product-title">{product.title}</h3>
                      
                      {product.rating && (
                        <div className="product-rating">
                          <div className="stars">
                            {[...Array(5)].map((_, i) => (
                              <FontAwesomeIcon 
                                key={i} 
                                icon={faStar} 
                                className={i < Math.floor(product.rating) ? 'star-filled' : 'star-empty'} 
                              />
                            ))}
                          </div>
                          <span className="rating-text">
                            {product.rating.toFixed(1)} {product.review_count && `(${product.review_count})`}
                          </span>
                        </div>
                      )}
                      
                      <div className="product-price">
                        <span className="current-price">{formatPrice(product.price)}</span>
                        {product.compare_price && product.compare_price > product.price && (
                          <span className="compare-price">{formatPrice(product.compare_price)}</span>
                        )}
                      </div>
                      
                      <p className="product-description">
                        {truncateText(product.description, 100)}
                      </p>
                      
                      <div className="product-buttons">
                        <button 
                          className="product-button"
                          onClick={() => toast.success(`Added ${product.title} to cart!`)}
                        >
                          <FontAwesomeIcon icon={faShoppingCart} />
                          Add to Cart
                        </button>
                        
                        {product.demo && (
                          <button 
                            className="product-button demo"
                            onClick={() => window.open(product.demo, '_blank')}
                          >
                            <FontAwesomeIcon icon={faEye} />
                            View Demo
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            // No products message
            <div className="no-products-message">
              <FontAwesomeIcon icon={faStore} className="no-products-icon" />
              <h3>No Products Found</h3>
              <p>We're currently updating our product catalog. Please check back soon!</p>
            </div>
          )}
          
          {products.length > 0 && (
            <div className="load-more">
              <button className="load-more-button" onClick={() => toast.info("More solutions would load here")}>
                Load More Solutions
              </button>
            </div>
          )}
        </div>
      </section>
      
      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <div className="features-grid">
            {[
              {
                icon: <FontAwesomeIcon icon={faCode} />,
                title: "Custom Development",
                description: "Tailored software solutions designed specifically for your business needs"
              },
              {
                icon: <FontAwesomeIcon icon={faLaptopCode} />,
                title: "Enterprise Solutions",
                description: "Scalable software platforms for large-scale business operations"
              },
              {
                icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7" y2="7"></line></svg>,
                title: "Maintenance & Support",
                description: "Continuous support and updates to keep your software running optimally"
              },
              {
                icon: <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>,
                title: "24/7 Technical Support",
                description: "Round-the-clock assistance for all your technical inquiries"
              }
            ].map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      
      {/* Newsletter Section */}
      <section className="newsletter-section">
        <div className="section-container">
          <div className="newsletter-content">
            <h2 className="newsletter-title">Subscribe to Our Newsletter</h2>
            <p className="newsletter-description">
              Stay updated on new software releases, industry insights, and exclusive offers
            </p>
            <form className="newsletter-form" onSubmit={(e) => {
              e.preventDefault();
              toast.success("Thanks for subscribing!");
            }}>
              <input type="email" placeholder="Enter your email address" className="newsletter-input" />
              <button type="submit" className="newsletter-button">Subscribe</button>
            </form>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer">
        <div className="section-container">
          <div className="footer-grid">
            <div className="footer-column">
              <div className="footer-logo">
                Alpha<span>Soft</span>
              </div>
              <p className="footer-about">
                Providing premium software solutions with a focus on innovation, performance, and scalability for businesses of all sizes.
              </p>
              <div className="social-links">
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <FontAwesomeIcon icon={faFacebook} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <FontAwesomeIcon icon={faTwitter} />
                </a>
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <FontAwesomeIcon icon={faInstagram} />
                </a>
                <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="social-link">
                  <FontAwesomeIcon icon={faLinkedin} />
                </a>
              </div>
            </div>
            
            <div className="footer-column">
              <h3 className="footer-title">Solutions</h3>
              <ul className="footer-links">
                <li className="footer-link"><a href="#products-section">All Products</a></li>
                <li className="footer-link"><a href="#">Enterprise Software</a></li>
                <li className="footer-link"><a href="#">Cloud Solutions</a></li>
                <li className="footer-link"><a href="#">Custom Development</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3 className="footer-title">Company</h3>
              <ul className="footer-links">
                <li className="footer-link"><a href="#">About Us</a></li>
                <li className="footer-link"><a href="#">Contact</a></li>
                <li className="footer-link"><a href="#">Careers</a></li>
                <li className="footer-link"><a href="#">Blog</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3 className="footer-title">Support</h3>
              <ul className="footer-links">
                <li className="footer-link"><a href="#">Help Center</a></li>
                <li className="footer-link"><a href="#">Documentation</a></li>
                <li className="footer-link"><a href="#">API Reference</a></li>
                <li className="footer-link"><a href="#">Privacy Policy</a></li>
                <li className="footer-link"><a href="#">Terms of Service</a></li>
              </ul>
            </div>
            
            <div className="footer-column">
              <h3 className="footer-title">Contact Us</h3>
              <div className="contact-item">
                <FontAwesomeIcon icon={faMapMarkerAlt} className="contact-icon" />
                <div>
                  Sonapur,<br />
                  Noakhali, 3802
                </div>
              </div>
              
              <div className="contact-item">
                <FontAwesomeIcon icon={faPhone} className="contact-icon" />
                <div>+880 1888606568</div>
              </div>
              
              <div className="contact-item">
                <FontAwesomeIcon icon={faEnvelope} className="contact-icon" />
                <div>info@alphasoft.world</div>
              </div>
            </div>
          </div>
          
          <div className="footer-bottom">
            <div className="copyright">
              © {currentYear} Alpha Soft. All rights reserved.
            </div>
            <div className="payment-methods">
              <div className="payment-label">Accepted Payments</div>
              <div className="payment-icons">
                {["Visa", "Mastercard", "PayPal", "Apple Pay"].map((method, index) => (
                  <div key={index} className="payment-icon">{method}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Floating Social Media Contact Button */}
        <div className="social-media-floating">
          <button
            className="social-toggle-button"
            onClick={toggleSocialOptions}
            aria-label="Toggle social media options"
          >
            <FontAwesomeIcon icon={faComments} />
          </button>
          
          <AnimatePresence>
            {showSocialOptions && (
              <>
                <motion.button
                  className="social-option messenger"
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -60 }}
                  exit={{ opacity: 0, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSocialClick('messenger')}
                  aria-label="Contact via Messenger"
                >
                  <FontAwesomeIcon icon={faFacebookMessenger} />
                </motion.button>
                
                <motion.button
                  className="social-option whatsapp"
                  initial={{ opacity: 0, y: 0 }}
                  animate={{ opacity: 1, y: -120 }}
                  exit={{ opacity: 0, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSocialClick('whatsapp')}
                  aria-label="Contact via WhatsApp"
                >
                  <FontAwesomeIcon icon={faWhatsappBrand} />
                </motion.button>
              </>
            )}
          </AnimatePresence>
        </div>
      </footer>
      
      {/* Back to Top Button */}
      <button 
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="19" x2="12" y2="5"></line>
          <polyline points="5 12 12 5 19 12"></polyline>
        </svg>
      </button>
    </div>
  );
};

// App Component with only the landing page route
const App = () => {
  return (
    <UserProvider>
      <CartProvider>
        <Router>
          <div className="app-wrapper">
            <Routes>
              {/* Only include the landing page route */}
              <Route path="*" element={<LandingPage />} />
            </Routes>
            
            {/* Toast notifications */}
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
          
          
          {/* Embedded CSS for the landing page */}
          <style jsx>{`
            /* Global Styles */
            :root {
              /* Color Scheme - Modern and Vibrant */
              --primary: #4f46e5;
              --primary-hover: #4338ca;
              --primary-light: rgba(79, 70, 229, 0.1);
              --secondary: #f43f5e;
              --secondary-hover: #e11d48;
              --secondary-light: rgba(244, 63, 94, 0.1);
              --accent: #8b5cf6;
              --success: #10b981;
              --warning: #f59e0b;
              --danger: #ef4444;
              
              /* Text Colors */
              --text-main: #111827;
              --text-secondary: #4b5563;
              --text-light: #6b7280;
              --text-white: #ffffff;
              
              /* Background Colors */
              --bg-white: #ffffff;
              --bg-light: #f9fafb;
              --bg-gray: #f3f4f6;
              --bg-dark: #111827;
              
              /* Border Colors */
              --border-color: #e5e7eb;
              --border-dark: #d1d5db;
              
              /* Shadows */
              --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
              --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
              --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
              
              /* Dimensions */
              --content-width: 1280px;
              --header-height: 72px;
              --border-radius-sm: 4px;
              --border-radius: 8px;
              --border-radius-lg: 12px;
              --border-radius-xl: 16px;
              
              /* Animation */
              --transition-fast: 150ms ease;
              --transition-normal: 300ms ease;
              --transition-slow: 500ms ease;
            }
            
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              color: var(--text-main);
              line-height: 1.5;
              overflow-x: hidden;
              background-color: var(--bg-light);
              scroll-behavior: smooth;
              -webkit-font-smoothing: antialiased;
              -moz-osx-font-smoothing: grayscale;
            }
            
            a {
              text-decoration: none;
              color: inherit;
              transition: color var(--transition-fast);
            }
            
            a:hover {
              color: var(--primary);
            }
            
            button {
              cursor: pointer;
              font-family: inherit;
              border: none;
              background: none;
            }
            
            ul, ol {
              list-style: none;
            }
            
            input, button, textarea, select {
              font: inherit;
            }
            
            /* App Container */
            .app-wrapper {
              display: flex;
              flex-direction: column;
              min-height: 100vh;
            }
            
            /* Landing Page Styles */
            .landing-page {
              min-height: 100vh;
              display: flex;
              flex-direction: column;
            }
            
            /* Modern Header Styles */
            .modern-header {
              background-color: var(--bg-white);
              box-shadow: var(--shadow-sm);
              padding: 0;
              position: sticky;
              top: 0;
              z-index: 100;
              height: var(--header-height);
              display: flex;
              align-items: center;
            }
            
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              max-width: var(--content-width);
              width: 100%;
              margin: 0 auto;
              padding: 0 1.5rem;
            }
            
            .logo {
              font-size: 1.75rem;
              font-weight: 800;
              color: var(--text-main);
              letter-spacing: -0.025em;
            }
            
            .logo span {
              color: var(--primary);
            }
            
            .header-actions {
              display: flex;
              align-items: center;
              gap: 1.25rem;
            }
            
            .search-button, .cart-button {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 40px;
              height: 40px;
              border-radius: 50%;
              background-color: var(--bg-light);
              color: var(--text-secondary);
              transition: all var(--transition-fast);
            }
            
            .search-button:hover, .cart-button:hover {
              background-color: var(--primary-light);
              color: var(--primary);
            }
            
            .cart-button {
              position: relative;
            }
            
            .cart-count {
              position: absolute;
              top: -5px;
              right: -5px;
              background-color: var(--secondary);
              color: white;
              font-size: 0.7rem;
              font-weight: 600;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            
            .user-info {
              display: flex;
              flex-direction: column;
              align-items: flex-end;
              margin-left: 0.5rem;
            }
            
            .user-name {
              font-weight: 600;
              color: var(--text-main);
              font-size: 0.9rem;
            }
            
            .datetime {
              font-size: 0.75rem;
              color: var(--text-light);
            }
            
            /* Hero Section Styles */
            .hero-section {
              position: relative;
              padding: 0;
              background-color: var(--bg-light);
              overflow: hidden;
            }
            
            .hero-pattern {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234f46e5' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            }
            
            .hero-container {
              max-width: var(--content-width);
              margin: 0 auto;
              padding: 5rem 1.5rem;
              display: grid;
              grid-template-columns: 1fr 1fr;
              align-items: center;
              gap: 4rem;
              position: relative;
              z-index: 1;
            }
            
            .hero-content {
              max-width: 560px;
            }
            
            .hero-title {
              font-size: 3.5rem;
              font-weight: 800;
              margin-bottom: 1.5rem;
              line-height: 1.1;
              letter-spacing: -0.02em;
              color: var(--text-main);
            }
            
            .hero-title .highlight {
              color: var(--primary);
              position: relative;
            }
            
            .hero-title .highlight::after {
              content: '';
              position: absolute;
              bottom: 5px;
              left: 0;
              width: 100%;
              height: 8px;
              background-color: var(--primary-light);
              z-index: -1;
              border-radius: 4px;
            }
            
            .hero-subtitle {
              font-size: 1.25rem;
              color: var(--text-secondary);
              margin-bottom: 2.5rem;
              line-height: 1.6;
              max-width: 500px;
            }
            
            .hero-buttons {
              display: flex;
              gap: 1rem;
            }
            
            .hero-button {
              padding: 0.875rem 1.75rem;
              border-radius: var(--border-radius);
              font-weight: 600;
              font-size: 1rem;
              transition: all var(--transition-fast);
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
            }
            
            .hero-button.primary {
              background-color: var(--primary);
              color: white;
              box-shadow: var(--shadow-md);
            }
            
            .hero-button.primary:hover {
              background-color: var(--primary-hover);
              transform: translateY(-2px);
              box-shadow: var(--shadow-lg);
            }
            
            .hero-button.secondary {
              background-color: transparent;
              border: 1px solid var(--border-dark);
              color: var(--text-secondary);
            }
            
            .hero-button.secondary:hover {
              background-color: var(--bg-gray);
              color: var(--text-main);
            }
            
            .hero-image-container {
              position: relative;
              width: 100%;
              height: 100%;
              display: flex;
              justify-content: center;
              align-items: center;
            }
            
            .hero-image {
              width: 100%;
              height: auto;
              max-height: 500px;
              object-fit: cover;
              border-radius: var(--border-radius-lg);
              box-shadow: var(--shadow-xl);
            }
            
            .hero-stats {
              position: absolute;
              bottom: -20px;
              left: 50%;
              transform: translateX(-50%);
              display: flex;
              background-color: var(--bg-white);
              border-radius: var(--border-radius);
              box-shadow: var(--shadow-lg);
              overflow: hidden;
            }
            
            .stat {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              padding: 1rem 1.5rem;
              border-right: 1px solid var(--border-color);
            }
            
            .stat:last-child {
              border-right: none;
            }
            
            .stat-number {
              font-size: 1.25rem;
              font-weight: 700;
              color: var(--primary);
            }
            
            .stat-label {
              font-size: 0.75rem;
              color: var(--text-light);
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .hero-brand-bar {
              background-color: var(--bg-white);
              border-top: 1px solid var(--border-color);
              border-bottom: 1px solid var(--border-color);
              padding: 1.25rem 0;
              margin-top: 5rem;
            }
            
            .brand-bar-container {
              max-width: var(--content-width);
              margin: 0 auto;
              padding: 0 1.5rem;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1rem;
            }
            
            .brand-label {
              font-size: 0.875rem;
              color: var(--text-light);
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            
            .brand-logos {
              display: flex;
              justify-content: center;
              gap: 2.5rem;
              flex-wrap: wrap;
            }
            
            .brand-logo {
              color: var(--text-light);
              font-weight: 600;
              font-size: 1.25rem;
              opacity: 0.7;
              transition: opacity var(--transition-fast);
            }
            
            .brand-logo:hover {
              opacity: 1;
            }
            
            /* Section Styles */
            .section-container {
              max-width: var(--content-width);
              margin: 0 auto;
              padding: 0 1.5rem;
            }
            
            .section-header {
              text-align: center;
              margin-bottom: 3rem;
            }
            
            .section-tag {
              display: inline-block;
              padding: 0.25rem 0.75rem;
              background-color: var(--primary-light);
              color: var(--primary);
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-radius: 50px;
              margin-bottom: 1rem;
            }
            
            .section-title {
              font-size: 2.5rem;
              font-weight: 800;
              color: var(--text-main);
              margin-bottom: 1rem;
              letter-spacing: -0.02em;
            }
            
            .section-subtitle {
              font-size: 1.125rem;
              color: var(--text-secondary);
              max-width: 700px;
              margin: 0 auto;
              line-height: 1.6;
            }
            
            /* Showcase Section Styles (Replacing Services) */
            .showcase-section {
              padding: 6rem 0 4rem;
              background-color: var(--bg-white);
            }
            
            .showcase-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 2rem;
            }
            
            .showcase-card {
              background: var(--bg-white);
              border-radius: var(--border-radius-lg);
              overflow: hidden;
              border: 1px solid var(--border-color);
              box-shadow: var(--shadow-md);
              transition: all var(--transition-normal);
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            
            .showcase-card:hover {
              transform: translateY(-10px);
              box-shadow: var(--shadow-xl);
              border-color: var(--primary-light);
            }
            
            .showcase-image-container {
              position: relative;
              overflow: hidden;
            }
            
            .showcase-image {
              width: 100%;
              height: 280px;
              object-fit: cover;
              transition: transform 0.6s ease;
            }
            
            .showcase-card:hover .showcase-image {
              transform: scale(1.05);
            }
            
            .product-tag {
              position: absolute;
              top: 16px;
              left: 16px;
              background-color: var(--primary);
              color: white;
              font-weight: 600;
              font-size: 0.8rem;
              padding: 0.4rem 0.8rem;
              border-radius: var(--border-radius);
              z-index: 2;
            }
            
            .product-tag.small {
              font-size: 0.75rem;
              padding: 0.25rem 0.5rem;
            }
            
            .showcase-content {
              padding: 2rem;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
            }
            
            .showcase-title {
              font-size: 1.5rem;
              font-weight: 700;
              color: var(--text-main);
              margin-bottom: 0.75rem;
              line-height: 1.3;
            }
            
            .showcase-price {
              display: flex;
              align-items: center;
              margin-bottom: 1rem;
            }
            
            .current-price {
              font-size: 1.5rem;
              font-weight: 700;
              color: var(--primary);
            }
            
            .compare-price {
              font-size: 1.125rem;
              color: var(--text-light);
              text-decoration: line-through;
              margin-left: 0.8rem;
            }
            
            .showcase-description {
              color: var(--text-secondary);
              line-height: 1.6;
              margin-bottom: 2rem;
              flex-grow: 1;
            }
            
            .showcase-button {
              background-color: var(--primary);
              color: white;
              border-radius: var(--border-radius);
              padding: 0.875rem 1.25rem;
              font-weight: 600;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem;
              transition: all var(--transition-fast);
              width: 100%;
              box-shadow: var(--shadow-sm);
            }
            
            .showcase-button:hover {
              background-color: var(--primary-hover);
              box-shadow: var(--shadow-md);
            }
            
            /* Category Banner Styles */
            .category-banner {
              padding: 4rem 0;
              background-color: var(--bg-light);
            }
            
            .category-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              grid-template-rows: auto;
              gap: 1.5rem;
            }
            
            .category-card {
              position: relative;
              border-radius: var(--border-radius-lg);
              overflow: hidden;
              box-shadow: var(--shadow-md);
              height: 300px;
              display: flex;
              align-items: center;
            }
            
            .category-card.main {
              grid-column: 1;
              grid-row: 1 / span 2;
              height: 100%;
            }
            
            .category-card.small {
              height: 200px;
            }
            
            .category-content {
              position: relative;
              z-index: 2;
              padding: 2rem;
              max-width: 50%;
            }
            
            .category-label {
              display: inline-block;
              padding: 0.25rem 0.75rem;
              background-color: var(--bg-white);
              color: var(--primary);
              font-size: 0.75rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              border-radius: 50px;
              margin-bottom: 0.75rem;
            }
            
            .category-title {
              font-size: 1.75rem;
              font-weight: 700;
              color: white;
              margin-bottom: 1rem;
              line-height: 1.3;
              text-shadow: 0 2px 4px rgba(0,0,0,0.3);
            }
            
            .category-description {
              color: rgba(255,255,255,0.9);
              margin-bottom: 1.5rem;
              text-shadow: 0 1px 2px rgba(0,0,0,0.2);
            }
            
            .category-card.small .category-title {
              font-size: 1.25rem;
              margin-bottom: 0.75rem;
            }
            
            .category-button {
              background-color: var(--bg-white);
              color: var(--primary);
              border-radius: var(--border-radius);
              padding: 0.75rem 1.25rem;
              font-weight: 600;
              display: inline-flex;
              align-items: center;
              gap: 0.5rem;
              transition: all var(--transition-fast);
              box-shadow: var(--shadow-sm);
            }
            
            .category-button:hover {
              background-color: var(--primary);
              color: white;
            }
            
            .category-button.small {
              font-size: 0.875rem;
              padding: 0.5rem 1rem;
            }
            
            .category-image {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              object-fit: cover;
              z-index: 1;
              transition: transform 0.6s ease;
            }
            
            .category-card::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(90deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.1) 100%);
              z-index: 1;
            }
            
            .category-card:hover .category-image {
              transform: scale(1.05);
            }
            
            /* Products Section Styles */
            .products-section {
              padding: 6rem 0;
              background-color: var(--bg-white);
            }
            
            .product-controls {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 2.5rem;
              flex-wrap: wrap;
              gap: 1rem;
            }
            
            .product-categories {
              display: flex;
              gap: 0.75rem;
              flex-wrap: wrap;
            }
            
            .category-pill {
              background-color: var(--bg-light);
              color: var(--text-secondary);
              border-radius: 50px;
              padding: 0.5rem 1rem;
              font-size: 0.875rem;
              font-weight: 500;
              transition: all var(--transition-fast);
            }
            
            .category-pill:hover, .category-pill.active {
              background-color: var(--primary);
              color: white;
            }
            
            .product-sort {
              position: relative;
            }
            
            .sort-select {
              appearance: none;
              background-color: var(--bg-light);
              border-radius: var(--border-radius);
              border: 1px solid var(--border-color);
              padding: 0.5rem 2.5rem 0.5rem 1rem;
              font-size: 0.875rem;
              color: var(--text-secondary);
              cursor: pointer;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
              background-repeat: no-repeat;
              background-position: right 0.75rem center;
              background-size: 16px;
            }
            
            .sort-select:focus {
              outline: none;
              border-color: var(--primary);
            }
            
            .products-grid {
              display: grid;
              grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
              gap: 2rem;
            }
            
            .product-card {
              background: var(--bg-white);
              border-radius: var(--border-radius-lg);
              overflow: hidden;
              border: 1px solid var(--border-color);
              transition: all var(--transition-normal);
              height: 100%;
              display: flex;
              flex-direction: column;
              position: relative;
            }
            
            .product-card:hover {
              box-shadow: var(--shadow-lg);
              border-color: var(--border-color);
              transform: translateY(-5px);
            }
            
            .product-image-container {
              position: relative;
              overflow: hidden;
              height: 200px;
            }
            
            .product-image {
              width: 100%;
              height: 100%;
              object-fit: cover;
              transition: transform 0.5s ease;
            }
            
            .product-card:hover .product-image {
              transform: scale(1.05);
            }
            
            .discount-badge {
              position: absolute;
              top: 10px;
              right: 10px;
              background-color: var(--secondary);
              color: white;
              font-weight: 600;
              font-size: 0.75rem;
              padding: 0.3rem 0.6rem;
              border-radius: var(--border-radius-sm);
              z-index: 2;
            }
            
            // Continuing with the CSS part where it left off:

            .product-actions {
              position: absolute;
              bottom: 10px;
              left: 0;
              width: 100%;
              display: flex;
              justify-content: center;
              gap: 0.5rem;
              padding: 0 1rem;
              opacity: 0;
              transform: translateY(10px);
              transition: all var(--transition-normal);
            }
            
            .product-card:hover .product-actions {
              opacity: 1;
              transform: translateY(0);
            }
            
            .product-action {
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background-color: var(--bg-white);
              color: var(--text-secondary);
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: var(--shadow-md);
              transition: all var(--transition-fast);
            }
            
            .product-action:hover {
              background-color: var(--primary);
              color: white;
              transform: translateY(-3px);
            }
            
            .product-content {
              padding: 1.5rem;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
            }
            
            .product-title {
              font-size: 1.1rem;
              font-weight: 600;
              margin-bottom: 0.5rem;
              line-height: 1.4;
              color: var(--text-main);
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            
            .product-rating {
              display: flex;
              align-items: center;
              margin-bottom: 0.75rem;
            }
            
            .stars {
              display: flex;
              margin-right: 0.5rem;
              font-size: 0.875rem;
            }
            
            .star-filled {
              color: var(--warning);
            }
            
            .star-empty {
              color: var(--border-color);
            }
            
            .rating-text {
              font-size: 0.8rem;
              color: var(--text-light);
            }
            
            .product-price {
              display: flex;
              align-items: center;
              margin-bottom: 1.25rem;
            }
            
            .product-button {
              background-color: var(--primary);
              color: white;
              border-radius: var(--border-radius);
              padding: 0.75rem;
              font-weight: 600;
              font-size: 0.9rem;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem;
              width: 100%;
              transition: all var(--transition-fast);
              margin-top: auto;
            }
            
            .product-button:hover {
              background-color: var(--primary-hover);
              transform: translateY(-2px);
            }
            
            .load-more {
              text-align: center;
              margin-top: 3rem;
            }
            
            .load-more-button {
              background-color: transparent;
              border: 2px solid var(--primary);
              color: var(--primary);
              font-weight: 600;
              padding: 0.875rem 2rem;
              border-radius: var(--border-radius);
              transition: all var(--transition-fast);
            }
            
            .load-more-button:hover {
              background-color: var(--primary);
              color: white;
            }
            
            /* Features Section Styles */
            .features-section {
              padding: 4rem 0;
              background-color: var(--bg-light);
              border-top: 1px solid var(--border-color);
              border-bottom: 1px solid var(--border-color);
            }
            
            .features-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 2.5rem;
            }
            
            .feature-card {
              text-align: center;
              padding: 2rem 1rem;
              transition: all var(--transition-normal);
            }
            
            .feature-card:hover {
              transform: translateY(-5px);
            }
            
            .feature-icon {
              background-color: var(--primary-light);
              color: var(--primary);
              width: 70px;
              height: 70px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              margin: 0 auto 1.5rem;
              transition: all var(--transition-normal);
            }
            
            .feature-card:hover .feature-icon {
              background-color: var(--primary);
              color: white;
            }
            
            .feature-title {
              font-size: 1.125rem;
              font-weight: 600;
              margin-bottom: 0.75rem;
              color: var(--text-main);
            }
            
            .feature-description {
              font-size: 0.9rem;
              color: var(--text-secondary);
              line-height: 1.6;
            }
            
            /* Newsletter Section Styles */
            .newsletter-section {
              padding: 5rem 0;
              background-color: var(--bg-white);
            }
            
            .newsletter-content {
              max-width: 700px;
              margin: 0 auto;
              text-align: center;
              padding: 3rem;
              background-color: var(--bg-light);
              border-radius: var(--border-radius-lg);
              box-shadow: var(--shadow-lg);
              position: relative;
              overflow: hidden;
            }
            
            .newsletter-content::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%234f46e5' fill-opacity='0.05' fill-rule='evenodd'/%3E%3C/svg%3E");
              opacity: 0.1;
              z-index: 0;
            }
            
            .newsletter-title {
              font-size: 2rem;
              font-weight: 700;
              margin-bottom: 1rem;
              color: var(--text-main);
              position: relative;
              z-index: 1;
            }
            
            .newsletter-description {
              font-size: 1.1rem;
              color: var(--text-secondary);
              margin-bottom: 2rem;
              max-width: 500px;
              margin-left: auto;
              margin-right: auto;
              position: relative;
              z-index: 1;
            }
            
            .newsletter-form {
              display: flex;
              max-width: 500px;
              margin: 0 auto;
              position: relative;
              z-index: 1;
            }
            
            .newsletter-input {
              flex-grow: 1;
              padding: 0.875rem 1.25rem;
              border: 1px solid var(--border-color);
              border-right: none;
              border-radius: var(--border-radius) 0 0 var(--border-radius);
              font-size: 1rem;
              color: var(--text-main);
              background-color: var(--bg-white);
            }
            
            .newsletter-input:focus {
              outline: none;
              border-color: var(--primary);
            }
            
            .newsletter-button {
              background-color: var(--primary);
              color: white;
              border: none;
              padding: 0 1.5rem;
              font-weight: 600;
              font-size: 1rem;
              border-radius: 0 var(--border-radius) var(--border-radius) 0;
              cursor: pointer;
              transition: background-color var(--transition-fast);
            }
            
            .newsletter-button:hover {
              background-color: var(--primary-hover);
            }
            
            /* Footer Styles */
            .footer {
              background-color: var(--bg-white);
              padding: 5rem 0 0;
              position: relative;
            }
            
            .footer-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 3rem;
              margin-bottom: 3rem;
            }
            
            .footer-column {
              display: flex;
              flex-direction: column;
            }
            
            .footer-logo {
              font-size: 1.5rem;
              font-weight: 800;
              color: var(--text-main);
              letter-spacing: -0.025em;
              margin-bottom: 1.25rem;
            }
            
            .footer-logo span {
              color: var(--primary);
            }
            
            .footer-about {
              color: var(--text-secondary);
              line-height: 1.6;
              margin-bottom: 1.5rem;
              font-size: 0.95rem;
            }
            
            .social-links {
              display: flex;
              gap: 0.75rem;
              margin-bottom: 1.5rem;
            }
            
            .social-link {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              background-color: var(--bg-light);
              color: var(--text-secondary);
              transition: all var(--transition-fast);
            }
            
            .social-link:hover {
              background-color: var(--primary);
              color: white;
              transform: translateY(-3px);
            }
            
            .footer-title {
              font-size: 1.1rem;
              font-weight: 600;
              margin-bottom: 1.5rem;
              color: var(--text-main);
            }
            
            .footer-links {
              display: flex;
              flex-direction: column;
              gap: 0.75rem;
            }
            
            .footer-link a {
              color: var(--text-secondary);
              font-size: 0.95rem;
              transition: all var(--transition-fast);
              display: inline-block;
            }
            
            .footer-link a:hover {
              color: var(--primary);
              transform: translateX(5px);
            }
            
            .contact-item {
              display: flex;
              align-items: flex-start;
              gap: 1rem;
              margin-bottom: 1.25rem;
              color: var(--text-secondary);
              font-size: 0.95rem;
            }
            
            .contact-icon {
              color: var(--primary);
              font-size: 1.1rem;
              margin-top: 0.25rem;
            }
            
            .footer-bottom {
              border-top: 1px solid var(--border-color);
              padding: 2rem 0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              flex-wrap: wrap;
              gap: 1.5rem;
            }
            
            .copyright {
              color: var(--text-light);
              font-size: 0.9rem;
            }
            
            .payment-methods {
              display: flex;
              align-items: center;
              gap: 1rem;
            }
            
            .payment-label {
              font-size: 0.9rem;
              color: var(--text-light);
            }
            
            .payment-icons {
              display: flex;
              gap: 0.75rem;
            }
            
            .payment-icon {
              font-size: 0.9rem;
              color: var(--text-secondary);
              font-weight: 500;
            }
            
            /* Social Media Floating Button */
            .social-media-floating {
              position: fixed;
              bottom: 30px;
              right: 30px;
              z-index: 99;
            }
            
            .social-toggle-button {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              background-color: var(--primary);
              color: white;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              box-shadow: var(--shadow-lg);
              cursor: pointer;
              transition: all var(--transition-fast);
              z-index: 100;
            }
            
            .social-toggle-button:hover {
              background-color: var(--primary-hover);
              transform: translateY(-3px);
            }
            
            .social-option {
              width: 48px;
              height: 48px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.25rem;
              position: absolute;
              bottom: 0;
              right: 4px;
              box-shadow: var(--shadow-md);
              cursor: pointer;
              transition: all var(--transition-fast);
            }
            
            .social-option.messenger {
              background-color: #0084FF;
              color: white;
            }
            
            .social-option.whatsapp {
              background-color: #25D366;
              color: white;
            }
            
            .social-option:hover {
              transform: scale(1.1);
            }
            
            /* Back to Top Button */
            .back-to-top {
              position: fixed;
              bottom: 100px;
              right: 30px;
              width: 44px;
              height: 44px;
              background-color: var(--bg-white);
              color: var(--primary);
              border-radius: 50%;
              box-shadow: var(--shadow-md);
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              opacity: 0.8;
              transition: all var(--transition-fast);
              z-index: 98;
            }
            
            .back-to-top:hover {
              background-color: var(--primary);
              color: white;
              opacity: 1;
              transform: translateY(-3px);
            }
            
            /* Loading Skeleton Styles */
            .loading-skeleton {
              background: linear-gradient(90deg, var(--bg-light) 0%, var(--bg-gray) 50%, var(--bg-light) 100%);
              background-size: 200% 100%;
              animation: shimmer 1.5s infinite;
              border-radius: var(--border-radius);
            }
            
            @keyframes shimmer {
              0% {
                background-position: -200% 0;
              }
              100% {
                background-position: 200% 0;
              }
            }
            
            .showcase-skeleton {
              border-radius: var(--border-radius-lg);
              overflow: hidden;
              background: var(--bg-white);
              border: 1px solid var(--border-color);
              box-shadow: var(--shadow-md);
              height: 100%;
            }
            
            .showcase-skeleton-img {
              height: 280px;
              width: 100%;
            }
            
            .showcase-skeleton-content {
              padding: 2rem;
            }
            
            .showcase-skeleton-title {
              height: 28px;
              width: 80%;
              margin-bottom: 1rem;
            }
            
            .showcase-skeleton-price {
              height: 24px;
              width: 40%;
              margin-bottom: 1rem;
            }
            
            .showcase-skeleton-desc {
              height: 80px;
              width: 100%;
              margin-bottom: 2rem;
            }
            
            .showcase-skeleton-button {
              height: 48px;
              width: 100%;
              border-radius: var(--border-radius);
            }
            
            .product-skeleton {
              border-radius: var(--border-radius-lg);
              overflow: hidden;
              background: var(--bg-white);
              border: 1px solid var(--border-color);
              height: 100%;
              display: flex;
              flex-direction: column;
            }
            
            .product-skeleton-img {
              height: 200px;
              width: 100%;
            }
            
            .product-skeleton-content {
              padding: 1.5rem;
              flex-grow: 1;
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }
            
            .product-skeleton-title {
              height: 20px;
              width: 90%;
            }
            
            .product-skeleton-rating {
              height: 16px;
              width: 60%;
            }
            
            .product-skeleton-price {
              height: 20px;
              width: 40%;
            }
            
            .product-skeleton-button {
              height: 40px;
              width: 100%;
              margin-top: auto;
              border-radius: var(--border-radius);
            }
            
            /* No Products Message */
            .no-products-message {
              text-align: center;
              padding: 4rem 2rem;
              background: var(--bg-white);
              border-radius: var(--border-radius-lg);
              box-shadow: var(--shadow-md);
              max-width: 600px;
              margin: 0 auto;
            }
            
            .no-products-icon {
              font-size: 3rem;
              color: var(--text-light);
              margin-bottom: 1.5rem;
            }
            
            /* Responsive Styles */
            @media (max-width: 1280px) {
              .hero-title {
                font-size: 3rem;
              }
              
              .showcase-grid {
                grid-template-columns: repeat(2, 1fr);
              }
            }
            
            @media (max-width: 1024px) {
              .hero-container {
                grid-template-columns: 1fr;
                gap: 2.5rem;
                text-align: center;
              }
              
              .hero-content {
                max-width: 700px;
                margin: 0 auto;
              }
              
              .hero-title .highlight::after {
                left: 50%;
                transform: translateX(-50%);
              }
              
              .hero-buttons {
                justify-content: center;
              }
              
              .hero-stats {
                position: static;
                transform: none;
                margin-top: 2rem;
                width: 100%;
                justify-content: center;
              }
              
              .category-grid {
                grid-template-columns: 1fr;
              }
              
              .category-card.main {
                grid-column: auto;
                grid-row: auto;
                height: 300px;
              }
              
              .category-content {
                max-width: 70%;
              }
            }
            
            @media (max-width: 768px) {
              .header-container {
                padding: 0 1rem;
              }
              
              .logo {
                font-size: 1.5rem;
              }
              
              .hero-title {
                font-size: 2.5rem;
              }
              
              .showcase-grid {
                grid-template-columns: 1fr;
                max-width: 500px;
                margin: 0 auto;
              }
              
              .feature-card {
                padding: 1.5rem 1rem;
              }
              
              .feature-icon {
                width: 60px;
                height: 60px;
                margin-bottom: 1.25rem;
              }
              
              .newsletter-content {
                padding: 2rem 1.5rem;
              }
              
              .newsletter-title {
                font-size: 1.75rem;
              }
              
              .newsletter-form {
                flex-direction: column;
                gap: 1rem;
              }
              
              .newsletter-input {
                border-radius: var(--border-radius);
                border-right: 1px solid var(--border-color);
                text-align: center;
              }
              
              .newsletter-button {
                border-radius: var(--border-radius);
                padding: 0.875rem;
              }
              
              .footer-bottom {
                flex-direction: column;
                align-items: center;
                text-align: center;
              }
            }
            
            @media (max-width: 576px) {
              .hero-title {
                font-size: 2rem;
              }
              
              .hero-subtitle {
                font-size: 1.1rem;
              }
              
              .section-title {
                font-size: 2rem;
              }
              
              .product-controls {
                flex-direction: column;
                align-items: stretch;
              }
              
              .product-categories {
                justify-content: center;
                margin-bottom: 1rem;
              }
              
              .product-sort {
                width: 100%;
              }
              
              .sort-select {
                width: 100%;
                text-align: center;
              }
              
              .products-grid {
                gap: 1.5rem;
              }
              
              .social-media-floating {
                bottom: 20px;
                right: 20px;
              }
              
              .back-to-top {
                bottom: 90px;
                right: 20px;
                width: 40px;
                height: 40px;
              }
            }
          .product-buttons {
              display: flex;
              gap: 0.75rem;
              margin-top: auto;
            }
            
            .product-button {
              flex: 1;
              background-color: var(--primary);
              color: white;
              border-radius: var(--border-radius);
              padding: 0.75rem;
              font-weight: 600;
              font-size: 0.875rem;
              display: flex;
              justify-content: center;
              align-items: center;
              gap: 0.5rem;
              transition: all var(--transition-fast);
            }
            
            .product-button:hover {
              background-color: var(--primary-hover);
              transform: translateY(-2px);
            }
            
            .product-button.demo {
              background-color: var(--bg-light);
              color: var(--primary);
              border: 1px solid var(--primary);
            }
            
            .product-button.demo:hover {
              background-color: var(--primary-light);
            }
            
            .product-description {
              color: var(--text-secondary);
              line-height: 1.6;
              margin-bottom: 1.5rem;
              font-size: 0.9rem;
              display: -webkit-box;
              -webkit-line-clamp: 3;
              -webkit-box-orient: vertical;
              overflow: hidden;
            }
            
            .product-skeleton-buttons {
              height: 44px;
              width: 100%;
              margin-top: auto;
              border-radius: var(--border-radius);
            }
            
            .product-skeleton-desc {
              height: 60px;
              width: 100%;
              margin-bottom: 1.25rem;
            }
          `}</style>
        </Router>
      </CartProvider>
    </UserProvider>
  );
};

export default App;