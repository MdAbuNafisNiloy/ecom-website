import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Button, 
  CircularProgress, 
  Grid, 
  IconButton, 
  Typography, 
  useMediaQuery, 
  useTheme,
  Chip,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Rating,
  Skeleton,
  Container,
  Paper,
  Fade,
  Tooltip
} from '@mui/material';
import { 
  Favorite as FavoriteIcon, 
  FavoriteBorder as FavoriteBorderIcon, 
  ShoppingCart as CartIcon,
  LocalShipping as ShippingIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingIcon,
  Refresh as RefreshIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material';
import { Carousel } from 'react-responsive-carousel';
import 'react-responsive-carousel/lib/styles/carousel.min.css';
import pb from '../pocketbase';
import { useCart } from '../contexts/CartContext';
import { useSnackbar } from 'notistack';
import { useUser } from '../contexts/UserContext';

const ProductsScreen = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { cart, updateCart } = useCart();
  const { user } = useUser();
  
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));
  
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allProducts, setAllProducts] = useState([]); // Single source of truth for products
  const [loading, setLoading] = useState(true);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [cartLoading, setCartLoading] = useState({});
  const [error, setError] = useState(null);
  const [wishlistItems, setWishlistItems] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});

  // Ref for intersection observer
  const observerRef = useRef(null);
  const loadMoreRef = useRef(null);

  // Determine grid columns based on screen size
  const getGridColumns = () => {
    if (isMobile) return 6; // 2 columns
    if (isTablet) return 4; // 3 columns
    if (isLargeScreen) return 2.4; // 5 columns
    return 3; // 4 columns by default
  };

  // Fetch user's wishlist items
  const fetchUserWishlist = useCallback(async () => {
    if (!user) {
      setWishlistItems([]);
      return [];
    }

    if(localStorage.getItem('userType') === 'guest') {
      setWishlistItems([]);
      return [];
    }
    
    try {
      const userData = await pb.collection('users').getOne(user.id);
      const wishlist = userData.wishlist || [];
      setWishlistItems(wishlist);
      return wishlist;
    } catch (error) {
      console.error('Error fetching wishlist:', error);
      return [];
    }
  }, [user]);

  // Fetch banners with retry mechanism
  const fetchBanners = useCallback(async (retryCount = 0) => {
    try {
      setBannersLoading(true);
      const bannerRecords = await pb.collection('banners').getFullList({
        sort: 'created',
      });
      setBanners(bannerRecords);
      return true;
    } catch (error) {
      console.error('Error fetching banners:', error);
      if (retryCount < 3) {
        // Retry after a delay
        setTimeout(() => fetchBanners(retryCount + 1), 1000 * (retryCount + 1));
      }
      return false;
    } finally {
      setBannersLoading(false);
    }
  }, []);

  // Fetch categories with retry mechanism
  const fetchCategories = useCallback(async (retryCount = 0) => {
    try {
      setCategoriesLoading(true);
      const categoryRecords = await pb.collection('categories').getFullList({
        filter: 'featured=true',
        sort: 'name',
        limit: 10,
      });
      setCategories(categoryRecords);
      return true;
    } catch (error) {
      console.error('Error fetching categories:', error);
      if (retryCount < 3) {
        // Retry after a delay
        setTimeout(() => fetchCategories(retryCount + 1), 1000 * (retryCount + 1));
      }
      return false;
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  // Fetch all products in one go
  const fetchAllProducts = useCallback(async (pageNum = 1, refresh = false, retryCount = 0) => {
    try {
      if (refresh) {
        setProductsLoading(true);
      }
      
      // Get user's wishlist first
      const wishlist = await fetchUserWishlist();
      
      const perPage = 24; // Increased page size to reduce requests
      const productRecords = await pb.collection('products').getList(pageNum, perPage, {
        sort: '-created',
        expand: 'seller',
      });

      // Filter verified sellers and add wishlist status
      const productsFiltered = productRecords.items
        .filter(product => product.expand?.seller?.admin_verified && product.status === 'published')
        .map(product => ({
          ...product,
          wishlist: wishlist.includes(product.id)
        }));

      if (refresh) {
        setAllProducts(productsFiltered);
      } else {
        setAllProducts(prev => [...prev, ...productsFiltered]);
      }

      setHasMore(productRecords.items.length === perPage);
      setPage(pageNum);
      setError(null);
      return true;
    } catch (error) {
      console.error('Error fetching products:', error);
      
      if (retryCount < 3) {
        // Retry after a delay
        setTimeout(() => fetchAllProducts(pageNum, refresh, retryCount + 1), 1000 * (retryCount + 1));
      } else {
        setError('Failed to load products. Please refresh to try again.');
      }
      return false;
    } finally {
      setProductsLoading(false);
      setLoadingMore(false);
    }
  }, [fetchUserWishlist]);

  // Initial data fetch
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Fetch all data in parallel
    await Promise.all([
      fetchBanners(),
      fetchCategories(),
      fetchAllProducts(1, true)
    ]);
    
    setLoading(false);
  }, [fetchBanners, fetchCategories, fetchAllProducts]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  // Handle image load error
  const handleImageError = (productId, imageSrc) => {
    setImageLoadErrors(prev => ({
      ...prev,
      [productId]: {
        src: imageSrc,
        retryCount: (prev[productId]?.retryCount || 0) + 1
      }
    }));
  };

  // Toggle wishlist
  const toggleWishlist = async (productId, currentStatus) => {
    if (!user) {
      enqueueSnackbar('Please login to manage wishlist', { 
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      navigate('/login');
      return;
    }

    try {
      setWishlistLoading(prev => ({ ...prev, [productId]: true }));
      
      const userData = await pb.collection('users').getOne(user.id);
      let wishlist = userData.wishlist || [];
      
      if (currentStatus) {
        wishlist = wishlist.filter(id => id !== productId);
      } else {
        wishlist = [...wishlist, productId];
      }

      await pb.collection('users').update(user.id, { wishlist });
      setWishlistItems(wishlist);
      
      // Update products in the single source of truth
      setAllProducts(prev => 
        prev.map(p => 
          p.id === productId ? { ...p, wishlist: !currentStatus } : p
        )
      );

      enqueueSnackbar(
        currentStatus ? 'Removed from wishlist' : 'Added to wishlist',
        { 
          variant: 'success',
          anchorOrigin: { vertical: 'top', horizontal: 'center' },
          autoHideDuration: 1500
        }
      );
    } catch (error) {
      console.error('Error updating wishlist:', error);
      enqueueSnackbar('Failed to update wishlist', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    } finally {
      setWishlistLoading(prev => ({ ...prev, [productId]: false }));
    }
  };

  // Add to cart handler
  const addToCartHandler = async (product) => {
    if (!user) {
      enqueueSnackbar('Please login to add to cart', { 
        variant: 'warning',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
      navigate('/login');
      return;
    }

    // Check if the product is already in cart
    const isInCart = cart && cart[product.id] && cart[product.id].quantity > 0;
    
    try {
      setCartLoading(prev => ({ ...prev, [product.id]: true }));
      
      const userData = await pb.collection('users').getOne(user.id);
      const currentCart = userData.cart || {};
      
      if (isInCart) {
        // Navigate to cart if already added
        navigate('/cart');
        return;
      }
      
      if (currentCart[product.id]) {
        currentCart[product.id].quantity += 1;
      } else {
        currentCart[product.id] = { ...product, quantity: 1 };
      }

      await pb.collection('users').update(user.id, { cart: currentCart });
      updateCart(currentCart);
      
      enqueueSnackbar('Added to cart successfully', { 
        variant: 'success',
        anchorOrigin: { vertical: 'top', horizontal: 'center' },
        autoHideDuration: 1500
      });
    } catch (error) {
      console.error('Error adding to cart:', error);
      enqueueSnackbar('Failed to add to cart', { 
        variant: 'error',
        anchorOrigin: { vertical: 'top', horizontal: 'center' }
      });
    } finally {
      setCartLoading(prev => ({ ...prev, [product.id]: false }));
    }
  };

  // Navigate to product detail
  const navigateToProduct = (productId) => {
    // get slug using the product id
    const slug = allProducts.find(product => product.id === productId)?.slug;
    // navigate(`/product/${productId}`);
    navigate(`/product/${slug}`);
  };

  // Load more products with infinite scroll
  const loadMoreProducts = () => {
    if (!loadingMore && hasMore && !productsLoading) {
      setLoadingMore(true);
      fetchAllProducts(page + 1);
    }
  };

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (loadMoreRef.current && !productsLoading && !loadingMore && hasMore) {
      const options = {
        root: null,
        rootMargin: '100px',
        threshold: 0.1,
      };
      
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          loadMoreProducts();
        }
      }, options);
      
      observer.observe(loadMoreRef.current);
      observerRef.current = observer;
      
      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }
  }, [productsLoading, loadingMore, hasMore, allProducts.length]);

  // Initial data load
  useEffect(() => {
    fetchData();
    
    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [fetchData]);

  // Get trending products from the main product array
  const getTrendingProducts = useCallback(() => {
    if (!allProducts.length) return [];
    
    // Filter for products with high ratings and sort by view_count
    return [...allProducts]
      .filter(product => product.rating >= 4)
      .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
      .slice(0, 8); // Limit to top 8
  }, [allProducts]);

  // Product card component for reuse
  const ProductCard = ({ product }) => {
    const {
      id,
      title,
      price,
      compare_price,
      images,
      rating,
      review_count,
      stock,
      wishlist,
      delivery_charge // Added this to access the delivery charge
    } = product;
    
    // Get image source with retry logic
    const getImageSrc = () => {
      if (!images || !images.length) return 'https://via.placeholder.com/300';
      
      // Check if we've hit retry limit for this image
      const errorInfo = imageLoadErrors[id];
      if (errorInfo && errorInfo.retryCount > 2) {
        return 'https://via.placeholder.com/300?text=Image+Not+Available';
      }
      
      // Use normal image path
      return pb.files.getUrl(product, images[0]);
    };
    
    const imageSrc = getImageSrc();
    
    // Fixed calculation: Compare price is the original higher price, price is the selling price
    const hasDiscount = compare_price && price && compare_price > price;
    const discountPercentage = hasDiscount
      ? Math.round(((compare_price - price) / compare_price) * 100)
      : 0;
    
    // Check if delivery is free
    const isFreeDelivery = delivery_charge === 0;
    
    // Truncate title after 20 chars
    const truncatedTitle = title && title.length > 15 
      ? title.slice(0, 15) + '...' 
      : title;
    
    const isOutOfStock = stock === 0;
  
    return (
      <Card 
        elevation={0}
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 2,
          border: `1px solid ${theme.palette.grey[200]}`,
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 8px 20px rgba(0,0,0,0.1)',
            transform: 'translateY(-5px)',
          }
        }}
      >
        {/* Product Image with wishlist button */}
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            src={imageSrc}
            alt={title}
            height={isMobile ? 150 : 180}
            width="100%"
            onClick={() => navigateToProduct(id)}
            onError={() => handleImageError(id, imageSrc)}
            sx={{ 
              objectFit: 'cover', 
              cursor: 'pointer',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8
            }}
          />
          
          {/* Badges Container - for multiple badges */}
          <Box sx={{ position: 'absolute', top: 8, left: 8, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {/* Discount badge */}
            {hasDiscount && (
              <Chip
                label={`${discountPercentage}% OFF`}
                color="error"
                size="small"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}
              />
            )}
            
            {/* Free delivery badge */}
            {isFreeDelivery && (
              <Chip
                label="Free Delivery"
                color="success"
                size="small"
                sx={{ 
                  fontWeight: 'bold',
                  fontSize: '0.7rem'
                }}
              />
            )}
          </Box>
          
          {/* Out of stock overlay */}
          {isOutOfStock && (
            <Box 
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                borderTopLeftRadius: 8,
                borderTopRightRadius: 8
              }}
            >
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  color: 'white', 
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  backgroundColor: 'rgba(0,0,0,0.6)',
                  px: 2,
                  py: 0.5,
                  borderRadius: 1
                }}
              >
                Out of Stock
              </Typography>
            </Box>
          )}
          
          {/* Wishlist button */}
          <IconButton
            color={wishlist ? "error" : "default"}
            aria-label="add to favorites"
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(id, wishlist);
            }}
            disabled={wishlistLoading[id]}
            sx={{ 
              position: 'absolute', 
              top: 4, 
              right: 4,
              backgroundColor: 'rgba(255,255,255,0.8)',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.9)' },
              zIndex: 2,
              padding: 1
            }}
          >
            {wishlistLoading[id] ? (
              <CircularProgress size={20} />
            ) : wishlist ? (
              <FavoriteIcon fontSize="small" />
            ) : (
              <FavoriteBorderIcon fontSize="small" />
            )}
          </IconButton>
        </Box>
        
        {/* Product content */}
        <CardContent 
          sx={{ 
            flexGrow: 1, 
            p: 2, 
            pt: 1.5,
            '&:last-child': { pb: 1.5 }
          }}
          onClick={() => navigateToProduct(id)}
        >
          <Typography 
            variant="subtitle2"
            sx={{ 
              mb: 0.5, 
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              height: '2.5em',
              fontSize: { xs: '0.8rem', sm: '0.875rem' },
              fontWeight: 500,
              cursor: 'pointer',
              color: theme.palette.text.primary
            }}
          >
            {truncatedTitle}
          </Typography>
          
          {/* Ratings */}
          {rating > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, mt: 0.5 }}>
              <Rating 
                value={rating} 
                readOnly 
                precision={0.5} 
                size="small"
                sx={{ fontSize: { xs: '0.8rem', sm: '1rem' } }}
              />
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ ml: 0.5, fontSize: { xs: '0.7rem', sm: '0.75rem' } }}
              >
                {rating.toFixed(1)} {review_count > 0 && `(${review_count})`}
              </Typography>
            </Box>
          )}
          
          {/* Price information - Fixed to use price and compare_price correctly */}
          <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'baseline' }}>
            <Typography 
              variant="subtitle1" 
              component="span"
              sx={{ 
                fontWeight: 'bold',
                color: theme.palette.text.primary,
                fontSize: { xs: '1rem', sm: '1.1rem' }
              }}
            >
              ৳{price.toFixed(2)}
            </Typography>
            
            {hasDiscount && (
              <Typography 
                variant="body2" 
                component="span" 
                sx={{ 
                  textDecoration: 'line-through', 
                  color: 'text.secondary',
                  ml: 1,
                  fontSize: { xs: '0.75rem', sm: '0.85rem' }
                }}
              >
                ৳{compare_price.toFixed(2)}
              </Typography>
            )}
            
          </Box>
        </CardContent>
        
        {/* Action buttons */}
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="small"
            startIcon={cartLoading[id] ? <CircularProgress size={16} color="inherit" /> : <CartIcon />}
            onClick={(e) => {
              e.stopPropagation();
              if (!isOutOfStock) {
                addToCartHandler(product);
              }
            }}
            disabled={cartLoading[id] || isOutOfStock}
            sx={{ 
              textTransform: 'none',
              fontWeight: 500,
              borderRadius: 6,
              fontSize: { xs: '0.7rem', sm: '0.8rem' }
            }}
          >
            {cart && cart[id] ? 'View Cart' : 'Add to Cart'}
          </Button>
        </CardActions>
      </Card>
    );
  };

  // Skeleton loader for products
  const ProductSkeleton = () => (
    <Card elevation={0} sx={{ height: '100%', borderRadius: 2, border: `1px solid ${theme.palette.grey[200]}` }}>
      <Skeleton variant="rectangular" height={isMobile ? 150 : 180} width="100%" sx={{ borderTopLeftRadius: 8, borderTopRightRadius: 8 }} />
      <CardContent sx={{ p: 2 }}>
        <Skeleton variant="text" width="80%" height={20} />
        <Skeleton variant="text" width="60%" height={20} />
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 1.5 }}>
          <Skeleton variant="rectangular" width={100} height={20} sx={{ borderRadius: 1 }} />
          <Skeleton variant="rectangular" width={40} height={20} sx={{ ml: 1, borderRadius: 1 }} />
        </Box>
        <Skeleton variant="rectangular" width="100%" height={36} sx={{ borderRadius: 6, mt: 1 }} />
      </CardContent>
    </Card>
  );

  // Get trending products for display
  const trendingProducts = getTrendingProducts();
  const trendingLoading = productsLoading;

  return (
    <Container maxWidth="xl" disableGutters sx={{ overflowX: 'hidden' }}>
      {/* Refresh button for mobile */}
      {isMobile && (
        <Box sx={{ 
          position: 'fixed', 
          bottom: 16, 
          right: 16, 
          zIndex: 10 
        }}>
          <Tooltip title="Refresh">
            <Fade in={!refreshing}>
              <IconButton 
                color="primary"
                size="large"
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ 
                  backgroundColor: 'white', 
                  boxShadow: 2,
                  '&:hover': { backgroundColor: '#f5f5f5' }
                }}
              >
                {refreshing ? 
                  <CircularProgress size={24} /> : 
                  <RefreshIcon />
                }
              </IconButton>
            </Fade>
          </Tooltip>
        </Box>
      )}

      {/* Main content area */}
      <Box sx={{ px: { xs: 1.5, sm: 2, md: 3 }, pt: 2, pb: 8 }}>
        {/* Display any errors */}
        {error && (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              mb: 3, 
              backgroundColor: 'error.light',
              color: 'error.dark',
              borderRadius: 2,
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <ErrorIcon sx={{ mr: 1 }} />
            <Typography variant="body2">{error}</Typography>
            <Button 
              variant="contained" 
              color="primary" 
              size="small" 
              sx={{ ml: 'auto' }}
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
            >
              Retry
            </Button>
          </Paper>
        )}

        {/* Banner Carousel */}
        <Box sx={{ mb: 4 }}>
          {bannersLoading ? (
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height={{ xs: 180, sm: 300, md: 400 }}
              sx={{ borderRadius: 2 }}
            />
          ) : banners.length > 0 ? (
            <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Carousel
                autoPlay
                infiniteLoop
                showThumbs={false}
                showStatus={false}
                showArrows={!isMobile}
                showIndicators={true}
                stopOnHover
                interval={5000}
                swipeable={true}
                emulateTouch={true}
              >
                {banners.map((banner) => (
                  <Box 
                    key={banner.id}
                    onClick={() => banner.link && navigate('/webview', { state: { url: banner.link } })}
                    sx={{ cursor: banner.link ? 'pointer' : 'default', position: 'relative' }}
                  >
                    <Box
                      component="img"
                      src={pb.files.getUrl(banner, banner.image)}
                      alt={banner.title || 'Banner'}
                      height={{ xs: 180, sm: 300, md: 400 }}
                      width="100%"
                      sx={{ 
                        objectFit: 'cover',
                        display: 'block'
                      }}
                    />
                    {banner.title && (
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          p: { xs: 2, sm: 3 },
                          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)',
                          color: 'white',
                          textAlign: 'left'
                        }}
                      >
                        <Typography 
                          variant={isMobile ? "h6" : "h5"} 
                          fontWeight="bold"
                          sx={{ 
                            textShadow: '1px 1px 3px rgba(0,0,0,0.7)',
                            mb: 1
                          }}
                        >
                          {banner.title}
                        </Typography>
                        {banner.description && (
                          <Typography 
                            variant="body2"
                            sx={{ 
                              display: { xs: 'none', sm: 'block' },
                              mb: 1,
                              textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
                            }}
                          >
                            {banner.description}
                          </Typography>
                        )}
                        {banner.link && (
                          <Button 
                            variant="contained" 
                            color="primary"
                            size={isMobile ? "small" : "medium"} 
                            sx={{ 
                              mt: 1, 
                              borderRadius: 5,
                              px: 3,
                              textTransform: 'none',
                              boxShadow: 3
                            }}
                            endIcon={<ArrowForwardIcon />}
                          >
                            Shop Now
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Carousel>
            </Paper>
          ) : null}
        </Box>

        {/* Categories Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: 600,
                color: 'text.primary'
              }}
            >
              <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} /> 
              Shop by Category
            </Typography>
            <Button 
              variant="text" 
              color="primary"
              size="small"
              endIcon={<ArrowForwardIcon />}
              onClick={() => navigate('/categories')}
              sx={{ textTransform: 'none' }}
            >
              View All
            </Button>
          </Box>
          
          {categoriesLoading ? (
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              py: 1,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: 'background.paper' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'primary.light', borderRadius: 3 }
            }}>
              {Array(6).fill(0).map((_, index) => (
                <Box key={index} sx={{ minWidth: 90, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Skeleton variant="circular" width={80} height={80} />
                  <Skeleton variant="text" width={60} height={24} sx={{ mt: 1 }} />
                </Box>
              ))}
            </Box>
          ) : categories.length > 0 ? (
            <Box sx={{ 
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              py: 1,
              '&::-webkit-scrollbar': { height: 6 },
              '&::-webkit-scrollbar-track': { bgcolor: 'background.paper' },
              '&::-webkit-scrollbar-thumb': { bgcolor: 'primary.light', borderRadius: 3 }
            }}>
              {categories.map((category) => (
                <Box
                  key={category.id}
                  onClick={() => navigate(`/category/${category.id}`)}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    minWidth: 90,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, opacity 0.2s',
                    '&:hover': { 
                      transform: 'translateY(-5px)',
                      '& img': { borderColor: 'primary.main' },
                      '& .category-name': { color: 'primary.main' }
                    }
                  }}
                >
                  <img
                    src={pb.files.getUrl(category, category.image)}
                    alt={category.name}
                    width={80}
                    height={80}
                    style={{
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '2px solid',
                      borderColor: theme.palette.grey[300],
                      transition: 'border-color 0.3s'
                    }}
                  />
                  <Typography 
                    variant="body2" 
                    textAlign="center"
                    className="category-name"
                    sx={{ 
                      mt: 1,
                      fontWeight: 500,
                      transition: 'color 0.3s',
                      fontSize: { xs: '0.8rem', sm: '0.875rem' }
                    }}
                  >
                    {category.name}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : null}
        </Box>
        
        {/* Trending Products Section - Using filtered data from the main products array */}
        {(trendingLoading || trendingProducts.length > 0) && (
          <Box sx={{ mb: 4 }}>
            <Box sx={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 2
            }}>
              <Typography 
                variant="h6" 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center',
                  fontWeight: 600,
                  color: 'text.primary'
                }}
              >
                <TrendingIcon sx={{ mr: 1, color: 'primary.main' }} /> 
                Trending Products
              </Typography>
            </Box>
            
            {trendingLoading ? (
              <Box sx={{ 
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                py: 1,
                pb: 1.5,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'background.paper' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'primary.light', borderRadius: 3 }
              }}>
                {Array(4).fill(0).map((_, index) => (
                  <Box key={index} sx={{ minWidth: 220, maxWidth: 280 }}>
                    <ProductSkeleton />
                  </Box>
                ))}
              </Box>
            ) : trendingProducts.length > 0 ? (
              <Box sx={{ 
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                py: 1,
                pb: 1.5,
                '&::-webkit-scrollbar': { height: 6 },
                '&::-webkit-scrollbar-track': { bgcolor: 'background.paper' },
                '&::-webkit-scrollbar-thumb': { bgcolor: 'primary.light', borderRadius: 3 }
              }}>
                {trendingProducts.map(product => (
                  <Box key={product.id} sx={{ minWidth: 220, maxWidth: 280 }}>
                    <ProductCard product={product} />
                  </Box>
                ))}
              </Box>
            ) : null}
          </Box>
        )}
        
        {/* Main Products Section */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ 
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                fontWeight: 600,
                color: 'text.primary'
              }}
            >
              <ShippingIcon sx={{ mr: 1, color: 'primary.main' }} /> 
              New Arrivals
            </Typography>
            {!isMobile && (
              <Button 
                variant="outlined" 
                color="primary"
                size="small"
                startIcon={<RefreshIcon />}
                onClick={handleRefresh}
                disabled={refreshing}
                sx={{ textTransform: 'none' }}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            )}
          </Box>
          
          {productsLoading && allProducts.length === 0 ? (
            <Grid container spacing={2}>
              {Array(8).fill(0).map((_, index) => (
                <Grid item xs={getGridColumns()} key={index}>
                  <ProductSkeleton />
                </Grid>
              ))}
            </Grid>
          ) : allProducts.length > 0 ? (
            <Grid container spacing={2}>
              {allProducts.map(product => (
                <Grid item xs={getGridColumns()} key={product.id}>
                  <ProductCard product={product} />
                </Grid>
              ))}
              
              {/* Loading more indicator */}
              {(loadingMore || hasMore) && (
                <Grid item xs={12} ref={loadMoreRef} sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
                  {loadingMore && <CircularProgress size={32} />}
                </Grid>
              )}
            </Grid>
          ) : (
            <Paper 
              elevation={0} 
              sx={{ 
                p: 4, 
                textAlign: 'center',
                borderRadius: 2,
                border: `1px dashed ${theme.palette.grey[300]}`,
                backgroundColor: 'background.paper'
              }}
            >
              <InfoIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Products Found
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                We couldn't find any products matching your criteria.
              </Typography>
              <Button 
                variant="contained" 
                color="primary"
                onClick={handleRefresh}
                startIcon={<RefreshIcon />}
                sx={{ borderRadius: 2 }}
              >
                Refresh Products
              </Button>
            </Paper>
          )}
        </Box>

        {/* End of products message */}
        {!hasMore && allProducts.length > 0 && (
          <Box sx={{ 
            textAlign: 'center', 
            py: 4,
            borderTop: `1px solid ${theme.palette.divider}`,
            mt: 4
          }}>
            <Typography variant="body1" color="text.secondary">
              You've reached the end of our products
            </Typography>
            <Button 
              variant="outlined" 
              color="primary"
              sx={{ mt: 2, borderRadius: 2 }}
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Back to Top
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ProductsScreen;