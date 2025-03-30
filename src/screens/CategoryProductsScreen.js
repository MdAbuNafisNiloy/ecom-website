import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Typography, 
  Box, 
  Paper, 
  IconButton, 
  CircularProgress, 
  Menu, 
  MenuItem, 
  Grid, 
  Button,
  Card, 
  CardMedia, 
  CardContent,
  CardActions,
  Snackbar,
  Alert,
  useMediaQuery
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Star as StarIcon, 
  ShoppingCart as CartIcon,
  FavoriteBorder as HeartOutlineIcon,
  Favorite as HeartIcon,
  TuneOutlined as FilterIcon,
  Check as CheckIcon,
  ErrorOutline as AlertIcon
} from '@mui/icons-material';
import pb from '../pocketbase';
import { useCart } from '../contexts/CartContext';

const CategoryProducts = () => {
  const { id } = useParams();
  const categoryId = id;
  console.log(categoryId);
  const navigate = useNavigate();
  
  const isTablet = useMediaQuery('(min-width:768px)');
  const isDesktop = useMediaQuery('(min-width:1200px)');
  const isLargeDesktop = useMediaQuery('(min-width:1600px)');
  
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [sortOption, setSortOption] = useState('newest');
  const [sortAnchorEl, setSortAnchorEl] = useState(null);
  const [userId, setUserId] = useState(null);
  const [wishlistLoading, setWishlistLoading] = useState({});
  const [cartLoading, setCartLoading] = useState({});
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  
  const { updateCart } = useCart();
  
  // Calculate number of columns based on screen size
  const getNumColumns = () => {
    if (isLargeDesktop) return 5;
    if (isDesktop) return 4;
    if (isTablet) return 3;
    return 2;
  };
  
  const numColumns = getNumColumns();
  
  useEffect(() => {
    const getUserId = async () => {
      try {
        // For web, use localStorage instead of SecureStore
        const id = localStorage.getItem('userId');
        setUserId(id);
      } catch (error) {
        console.error('Error getting userId:', error);
      }
    };
    getUserId();
  }, []);
  
  // Function to fetch products by category ID
  const fetchProductsByCategory = async (categoryId, page = 1, perPage = 10) => {
    try {
      const productRecords = await pb.collection('products').getList(page, perPage, {
        filter: `category ?~ "${categoryId}" && status = "published"`,
        sort: '-created',
        expand: 'seller',
      });

      // Filter products using expanded seller data
      const productsFiltered = productRecords.items.filter(product => {
        return product.expand?.seller?.admin_verified === true;
      });

      return {
        items: productsFiltered,
        totalItems: productRecords.totalItems,
        totalPages: productRecords.totalPages,
      };
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  };
  
  const loadProducts = useCallback(async (pageNum = 1, refresh = false) => {
    try {
      setError(null);
      if (pageNum === 1) {
        setIsLoading(true);
      } else {
        setLoadingMore(true);
      }
      
      const perPage = 10;
      const result = await fetchProductsByCategory(categoryId, pageNum, perPage);
      
      if (refresh || pageNum === 1) {
        setProducts(result.items);
      } else {
        setProducts(prev => [...prev, ...result.items]);
      }
      
      setHasMore(pageNum < result.totalPages);
      setPage(pageNum);
    } catch (err) {
      setError('Failed to load products. Please try again.');
      console.error('Error loading products:', err);
    } finally {
      setIsLoading(false);
      setLoadingMore(false);
      setIsRefreshing(false);
    }
  }, [categoryId]);
  
  const toggleFavorite = async (productId, currentWishlistState) => {
    if (!userId) { 
      // For web, check login status with localStorage
      const loginType = localStorage.getItem('loginType');
      if(loginType === 'user') {
        const userId = localStorage.getItem('userId');
        setUserId(userId);
      } else {
        setToast({
          open: true,
          message: 'Please login to add to wishlist!',
          severity: 'error'
        });
        return;
      }
    }
    
    const loginType = localStorage.getItem('loginType');
    if(loginType === 'guest'){
      setToast({
        open: true,
        message: 'Please login to add to wishlist!',
        severity: 'error'
      });
      return;
    }

    try {
      setWishlistLoading(prev => ({ ...prev, [productId]: true }));
      
      const user = await pb.collection('users').getOne(userId);
      let wishlist = user.wishlist || []; // Initialize as an array
      
      // Handle array format
      if (currentWishlistState) {
        // Remove the product from the wishlist
        wishlist = wishlist.filter(id => id !== productId);
      } else {
        // Add the product to the wishlist
        if (!wishlist.includes(productId)) {
          wishlist.push(productId);
        }
      }
  
      // Update the wishlist in the database
      await pb.collection('users').update(userId, { wishlist });
      
      // Update local state immediately for better UX
      setProducts(prevProducts => 
        prevProducts.map(product => 
          product.id === productId 
            ? { ...product, wishlist: !currentWishlistState } 
            : product
        )
      );
  
      setToast({
        open: true,
        message: !currentWishlistState ? 'Added to wishlist!' : 'Removed from wishlist!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error toggling favorite:', error);
    } finally {
      setWishlistLoading(prev => ({ ...prev, [productId]: false }));
    }
  };
  
  const addToCart = async (product) => {
    const loginType = localStorage.getItem('loginType');
    if (!userId) { 
      if(loginType === 'user') {
        const userId = localStorage.getItem('userId');
        setUserId(userId);
      } else {
        setToast({
          open: true,
          message: 'Please login to add to cart!',
          severity: 'error'
        });
        return;
      }
    }
    
    if(loginType === 'guest'){
      setToast({
        open: true,
        message: 'Please login to add to cart!',
        severity: 'error'
      });
      return;
    }
    
    try {
      setCartLoading(prev => ({ ...prev, [product.id]: true }));
      
      const user = await pb.collection('users').getOne(userId);
      const cart = user.cart || {};

      if (cart[product.id]) {
        cart[product.id].quantity += 1;
      } else {
        cart[product.id] = { ...product, quantity: 1 };
      }

      await pb.collection('users').update(userId, { cart });
      updateCart(cart);

      setToast({
        open: true,
        message: 'Added to cart!',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error adding product to cart:', error);
    } finally {
      setCartLoading(prev => ({ ...prev, [product.id]: false }));
    }
  };
  
  useEffect(() => {
    loadProducts();
  }, [loadProducts]);
  
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadProducts(1, true);
  };
  
  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.scrollHeight - 200) {
      if (!loadingMore && hasMore) {
        loadProducts(page + 1);
      }
    }
  }, [loadingMore, hasMore, page, loadProducts]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);
  
  // Sort products based on selected option
  const sortProducts = (option) => {
    setSortOption(option);
    setSortAnchorEl(null);
    
    const sortedProducts = [...products];
    switch (option) {
      case 'newest':
        sortedProducts.sort((a, b) => new Date(b.created) - new Date(a.created));
        break;
      case 'price_asc':
        sortedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case 'price_desc':
        sortedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case 'popular':
        // Sort by rating or reviews count if available
        sortedProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        break;
    }
    
    setProducts(sortedProducts);
  };
  
  // Handle toast close
  const handleCloseToast = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setToast({ ...toast, open: false });
  };
  
  // Product Skeleton for loading state
  const ProductSkeleton = () => {
    return (
      <SkeletonCard>
        <SkeletonImage />
        <Box sx={{ p: 1.5 }}>
          <SkeletonTitle />
          <SkeletonRating />
          <SkeletonPrice />
          <SkeletonButton />
        </Box>
      </SkeletonCard>
    );
  };
  
  // Create array of skeletons for loading state
  const renderSkeletons = () => {
    return (
      <ProductGrid container spacing={2}>
        {Array(8).fill(0).map((_, index) => (
          <Grid item xs={6} sm={4} md={3} lg={numColumns === 5 ? 2.4 : 3} key={`skeleton-${index}`}>
            <ProductSkeleton />
          </Grid>
        ))}
      </ProductGrid>
    );
  };
  
  // Error state content
  const renderError = () => {
    return (
      <ErrorContainer>
        <AlertIcon sx={{ fontSize: 64, color: '#dc3545', mb: 2 }} />
        <Typography variant="h6" color="error" gutterBottom>{error}</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => loadProducts(1, true)}
        >
          Retry
        </Button>
      </ErrorContainer>
    );
  };
  
  // Empty state content
  const renderEmpty = () => {
    return (
      <EmptyContainer>
        <AlertIcon sx={{ fontSize: 64, color: '#6c757d', mb: 2 }} />
        <Typography variant="h6" color="textSecondary">
          No products found in this category.
        </Typography>
      </EmptyContainer>
    );
  };
  
  return (
    <PageContainer>
      <Header>
        <IconButton onClick={() => navigate(-1)}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Products
        </Typography>
        <IconButton onClick={(e) => setSortAnchorEl(e.currentTarget)}>
          <FilterIcon />
        </IconButton>
      </Header>
      
      {/* Sort Menu */}
      <Menu
        anchorEl={sortAnchorEl}
        open={Boolean(sortAnchorEl)}
        onClose={() => setSortAnchorEl(null)}
      >
        <MenuItem 
          onClick={() => sortProducts('newest')}
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            bgcolor: sortOption === 'newest' ? '#f5f5f5' : 'transparent'
          }}
        >
          <Typography>Newest</Typography>
          {sortOption === 'newest' && <CheckIcon fontSize="small" color="primary" />}
        </MenuItem>
        <MenuItem 
          onClick={() => sortProducts('price_asc')}
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            bgcolor: sortOption === 'price_asc' ? '#f5f5f5' : 'transparent'
          }}
        >
          <Typography>Price: Low to High</Typography>
          {sortOption === 'price_asc' && <CheckIcon fontSize="small" color="primary" />}
        </MenuItem>
        <MenuItem 
          onClick={() => sortProducts('price_desc')}
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            bgcolor: sortOption === 'price_desc' ? '#f5f5f5' : 'transparent'
          }}
        >
          <Typography>Price: High to Low</Typography>
          {sortOption === 'price_desc' && <CheckIcon fontSize="small" color="primary" />}
        </MenuItem>
        <MenuItem 
          onClick={() => sortProducts('popular')}
          sx={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            bgcolor: sortOption === 'popular' ? '#f5f5f5' : 'transparent'
          }}
        >
          <Typography>Popular</Typography>
          {sortOption === 'popular' && <CheckIcon fontSize="small" color="primary" />}
        </MenuItem>
      </Menu>
      
      <MainContent>
        {isLoading && !isRefreshing ? (
          renderSkeletons()
        ) : error ? (
          renderError()
        ) : products.length === 0 ? (
          renderEmpty()
        ) : (
          <ProductGrid container spacing={2}>
            {products.map((product) => {
              // Handle discount calculation
              const discount = product.discount > 0 ? product.discount : 0;
              const discountedPrice = discount > 0 
                ? product.price * (1 - discount / 100) 
                : null;
              
              // Check if the product is in the user's wishlist
              const isInWishlist = product.wishlist || false;
              
              // Handle image URL
              const imageUrl = product.images && product.images.length > 0 
                ? pb.files.getURL(product, product.images[0]) 
                : 'https://via.placeholder.com/300';
              
              return (
                <Grid item xs={6} sm={4} md={3} lg={numColumns === 5 ? 2.4 : 3} key={product.id}>
                  <ProductCard>
                    <ProductImageContainer 
                      onClick={() => navigate(`/product/${product.slug}`, { state: { product } })}
                    >
                      <ProductImage 
                        src={imageUrl}
                        alt={product.name || 'Product image'}
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/300';
                        }}
                      />
                      {discount > 0 && (
                        <SaleBadge>
                          <Typography variant="caption" fontWeight="bold">
                            {discount}% OFF
                          </Typography>
                        </SaleBadge>
                      )}
                      {product.featured && (
                        <FeaturedBadge>
                          <Typography variant="caption" fontWeight="bold">
                            Featured
                          </Typography>
                        </FeaturedBadge>
                      )}
                      <WishlistButton
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(product.id, isInWishlist);
                        }}
                        disabled={wishlistLoading[product.id]}
                      >
                        {wishlistLoading[product.id] ? (
                          <CircularProgress size={16} color="error" />
                        ) : (
                          isInWishlist ? 
                            <HeartIcon fontSize="small" color="error" /> : 
                            <HeartOutlineIcon fontSize="small" color="error" />
                        )}
                      </WishlistButton>
                    </ProductImageContainer>
                    
                    <ProductInfo 
                      onClick={() => navigate(`/product/${product.slug}`, { state: { product } })}
                    >
                      <ProductTitle variant="body1">
                        {product.title || product.name}
                      </ProductTitle>
                      
                      {product.rating ? (
                        <RatingContainer>
                          <StarIcon sx={{ color: '#FFD700', fontSize: 16 }} />
                          <Typography variant="body2" color="text.secondary">
                            {product.rating}
                            <Typography component="span" variant="caption" color="text.disabled" sx={{ ml: 0.5 }}>
                              ({product.reviews_count || 0})
                            </Typography>
                          </Typography>
                        </RatingContainer>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          No ratings yet
                        </Typography>
                      )}
                      
                      <PriceContainer>
                        {discount > 0 ? (
                          <>
                            <Typography variant="body1" fontWeight="bold" color="primary">
                              ৳{parseFloat(discountedPrice).toFixed(2)}
                            </Typography>
                            <Typography variant="body2" color="text.disabled" sx={{ textDecoration: 'line-through', ml: 1 }}>
                              ৳{parseFloat(product.price).toFixed(2)}
                            </Typography>
                          </>
                        ) : (
                          <Typography variant="body1" fontWeight="bold" color="primary">
                            ৳{parseFloat(product.price).toFixed(2)}
                          </Typography>
                        )}
                      </PriceContainer>
                      
                      {product.stock <= 5 && product.stock > 0 ? (
                        <StockText color="error">Only {product.stock} left</StockText>
                      ) : product.stock === 0 ? (
                        <StockText color="text.disabled">Out of stock</StockText>
                      ) : null}
                    </ProductInfo>
                    
                    <AddToCartButton
                      variant="contained"
                      fullWidth
                      startIcon={cartLoading[product.id] ? null : <CartIcon />}
                      onClick={() => addToCart(product)}
                      disabled={product.stock === 0 || cartLoading[product.id]}
                    >
                      {cartLoading[product.id] ? (
                        <CircularProgress size={24} color="inherit" />
                      ) : (
                        product.stock === 0 ? 'Sold Out' : 'Add to Cart'
                      )}
                    </AddToCartButton>
                  </ProductCard>
                </Grid>
              );
            })}
          </ProductGrid>
        )}
        
        {loadingMore && (
          <LoadingMoreContainer>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
              Loading more products...
            </Typography>
          </LoadingMoreContainer>
        )}
      </MainContent>
      
      {/* Toast Notifications */}
      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={handleCloseToast}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseToast} severity={toast.severity} sx={{ width: '100%' }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </PageContainer>
  );
};

// Styled components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #fff;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 16px;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
`;

const ProductGrid = styled(Grid)`
  margin-bottom: 16px;
`;

const ProductCard = styled(Paper)`
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
  
  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`;

const ProductImageContainer = styled.div`
  position: relative;
  padding-top: 100%; /* 1:1 Aspect ratio */
  cursor: pointer;
  background-color: #f8f9fa;
`;

const ProductImage = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const SaleBadge = styled.div`
  position: absolute;
  top: 8px;
  left: 8px;
  background-color: #dc3545;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1;
`;

const FeaturedBadge = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  background-color: #ffc107;
  color: #212529;
  padding: 4px 8px;
  border-radius: 4px;
  z-index: 1;
`;

const WishlistButton = styled(IconButton)`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background-color: rgba(255, 255, 255, 0.8);
  padding: 6px;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }
`;

const ProductInfo = styled.div`
  padding: 12px;
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  cursor: pointer;
`;

const ProductTitle = styled(Typography)`
  font-weight: 500;
  color: #212529;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const RatingContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 8px;
`;

const StockText = styled(Typography)`
  font-size: 12px;
  margin-bottom: 8px;
`;

const AddToCartButton = styled(Button)`
  margin-top: auto;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  background-color: #007bff;
  color: white;
  
  &:hover {
    background-color: #0069d9;
  }
  
  &.Mui-disabled {
    background-color: #ccc;
    color: #666;
  }
`;

const LoadingMoreContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px 0;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 50vh;
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 50vh;
`;

// Skeleton components
const SkeletonCard = styled(Paper)`
  height: 100%;
  display: flex;
  flex-direction: column;
  border-radius: 8px;
  overflow: hidden;
`;

const SkeletonImage = styled.div`
  width: 100%;
  padding-top: 100%;
  background-color: #f0f0f0;
`;

const SkeletonTitle = styled.div`
  height: 16px;
  background-color: #f0f0f0;
  margin-bottom: 8px;
  width: 80%;
  border-radius: 4px;
`;

const SkeletonRating = styled.div`
  height: 12px;
  background-color: #f0f0f0;
  margin-bottom: 8px;
  width: 60%;
  border-radius: 4px;
`;

const SkeletonPrice = styled.div`
  height: 16px;
  background-color: #f0f0f0;
  margin-bottom: 8px;
  width: 40%;
  border-radius: 4px;
`;

const SkeletonButton = styled.div`
  height: 36px;
  background-color: #f0f0f0;
  margin-top: 8px;
  border-radius: 4px;
`;

export default CategoryProducts;