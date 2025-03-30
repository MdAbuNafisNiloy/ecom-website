import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Typography, 
  Box, 
  Paper, 
  IconButton, 
  CircularProgress, 
  Badge, 
  Grid, 
  Divider,
  Button,
  TextField,
  Modal,
  Rating,
  InputAdornment,
  Chip,
  useMediaQuery,
  useTheme,
  Alert
} from '@mui/material';
import { 
  ArrowBack as ArrowBackIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Add as AddIcon,
  Remove as RemoveIcon,
  Image as ImageIcon,
  ImageNotSupported as ImageNotSupportedIcon,
  PlayCircleOutline as PlayCircleOutlineIcon,
  ShoppingCart as ShoppingCartIcon,
  Send as SendIcon,
  Clear as ClearIcon,
  Close as CloseIcon,
  HelpOutline as HelpOutlineIcon,
  Chat as ChatIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  StarHalf as StarHalfIcon,
  PlayArrow as PlayArrowIcon,
  LocalShipping as LocalShippingIcon,
  ZoomIn as ZoomInIcon
} from '@mui/icons-material';
import pb from '../pocketbase';
import { useCart } from '../contexts/CartContext';
import { Carousel } from 'react-responsive-carousel';
import YouTube from 'react-youtube';

const ProductDetailScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const product = location.state?.product || null;
  const showHeader = location.state?.showHeader || false;
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [shopInfo, setShopInfo] = useState(null);
  const [loadingShop, setLoadingShop] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [question, setQuestion] = useState('');
  const [sellerMessage, setSellerMessage] = useState('');
  const [loadingSimilar, setLoadingSimilar] = useState(true);
  const [loadingSellerProducts, setLoadingSellerProducts] = useState(true);
  const [userId, setUserId] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetchedProduct, setFetchedProduct] = useState(null);
  const [fullscreenVideo, setFullscreenVideo] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Image zoom state
  const [showZoom, setShowZoom] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef(null);
  const zoomFactor = 2.5; // Zoom magnification level
 
  const { updateCart } = useCart();
  const carouselRef = useRef(null);
  const youtubeRef = useRef(null);

  // Fetch product details if not provided in location state
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!product && id) {
        setLoading(true);
        setError(null);
        
        try {
          // First try to fetch product by ID
          let fetchedProduct;
          try {
            fetchedProduct = await pb.collection('products').getOne(id, {
              expand: 'seller',
            });
          } catch (idError) {
            // If fetching by ID fails, try by slug
            const records = await pb.collection('products').getList(1, 1, {
              filter: `slug = "${id}"`,
              expand: 'seller',
            });
            
            if (records.items.length > 0) {
              fetchedProduct = records.items[0];
            } else {
              throw new Error('Product not found');
            }
          }
          
          setFetchedProduct(fetchedProduct);
        } catch (error) {
          console.error('Error fetching product:', error);
          setError('Product not found or unavailable');
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchProductDetails();
  }, [id, product]);

  // Use product from state or fetched product
  const productData = product || fetchedProduct;

  // Get current user ID
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const authData = pb.authStore.model;
        if (authData) {
          setUserId(authData.id);
          // Check if product is in wishlist
          checkWishlistStatus(authData.id);
        }
      } catch (error) {
        console.error('Error getting current user:', error);
      }
    };
    
    getCurrentUser();
  }, []);

  // Check if product is in user's wishlist
  const checkWishlistStatus = async (uid) => {
    if (!uid || !productData) return;
    
    try {
      const user = await pb.collection('users').getOne(uid);
      if (user && user.wishlist) {
        // Handle wishlist as array
        if (Array.isArray(user.wishlist)) {
          setIsInWishlist(user.wishlist.includes(productData.id));
        } else if (typeof user.wishlist === 'object') {
          // Handle wishlist as object
          setIsInWishlist(Object.keys(user.wishlist).includes(productData.id));
        }
      }
    } catch (error) {
      console.error('Error checking wishlist status:', error);
    }
  };

  // Toggle wishlist
  const toggleWishlist = async () => {
    if (!userId) {
      alert('Please login to add to wishlist!');
      return;
    }

    try {
      setWishlistLoading(true);

      const user = await pb.collection('users').getOne(userId);
      let wishlist = user.wishlist || []; // Initialize as an array

      // Handle toggling
      if (isInWishlist) {
        // Remove from wishlist
        wishlist = wishlist.filter(id => id !== productData.id);
      } else {
        // Add to wishlist
        if (!wishlist.includes(productData.id)) {
          wishlist.push(productData.id);
        }
      }

      // Update wishlist in database
      await pb.collection('users').update(userId, { wishlist });

      // Update local state
      setIsInWishlist(!isInWishlist);

      alert(!isInWishlist ? 'Added to wishlist!' : 'Removed from wishlist!');
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Add to cart
  const handleAddToCart = async () => {
    if (!userId) {
      alert('Please login to add to cart!');
      return;
    }

    try {
      setCartLoading(true);

      const user = await pb.collection('users').getOne(userId);
      const cart = user.cart || {};

      if (cart[productData.id]) {
        cart[productData.id].quantity += quantity;
      } else {
        cart[productData.id] = { ...productData, quantity };
      }

      await pb.collection('users').update(userId, { cart });
      updateCart(cart);

      alert('Added to cart!');
    } catch (error) {
      console.error('Error adding product to cart:', error);
    } finally {
      setCartLoading(false);
    }
  };

  // Format currency
  const formatPrice = (price) => {
    return `৳${parseFloat(price).toFixed(2)}`;
  };
  
  // Calculate discount percentage
  const calculateDiscount = () => {
    if (productData?.compare_price && productData?.price) {
      const discount = ((productData.compare_price - productData.price) / productData.compare_price) * 100;
      return Math.round(discount);
    }
    return 0;
  };
  
  // Increase quantity
  const increaseQuantity = () => {
    if (productData && quantity < productData.stock) {
      setQuantity(quantity + 1);
    }
  };
  
  // Decrease quantity
  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Handle opening image in modal
  const openImageModal = (index) => {
    setModalImageIndex(index);
    setModalVisible(true);
  };

  // Handle sending message to seller
  const handleMessageSeller = () => {
    if (sellerMessage.trim() === '') return;
    
    // Here you would implement the actual message sending functionality
    alert(`Message sent to ${shopInfo?.name || 'seller'}: ${sellerMessage}`);
    setSellerMessage('');
  };

  // Image zoom functions
  const handleMouseEnter = () => {
    setShowZoom(true);
  };

  const handleMouseLeave = () => {
    setShowZoom(false);
  };

  const handleMouseMove = (e) => {
    if (!imageContainerRef.current) return;
    
    // Get container dimensions and position
    const container = imageContainerRef.current;
    const rect = container.getBoundingClientRect();
    
    // Calculate cursor position within the container (0 to 1)
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // Set the transformed position for the zoomed image
    setZoomPosition({
      x: Math.max(0, Math.min(1, x)) * 100,
      y: Math.max(0, Math.min(1, y)) * 100
    });
  };

  // Fetch Q&A data
  useEffect(() => {
    if (!productData) return;
    
    const fetchQnA = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch Q&A for the current product
        const qnaRecords = await pb.collection('qna').getList(1, 50, {
          filter: `product = "${productData.id}"`,
          sort: '-created',
        });

        setQuestions(qnaRecords.items);
      } catch (err) {
        console.error('Error fetching Q&A:', err);
        setError('Failed to load Q&A. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchQnA();
  }, [productData]);

  // Handle posting a question
  const handlePostQuestion = async () => {
    if (!question.trim() || !productData) {
      alert('Please enter a question.');
      return;
    }

    try {
      setIsLoading(true);

      // Post the question to PocketBase
      await pb.collection('qna').create({
        product: productData.id,
        userId: pb.authStore.model?.id, // Current user ID
        userName: pb.authStore.model?.username, // Current username
        sellerId: productData.sellerId, // Seller ID
        shopName: productData.shopName, // Shop name
        question: question.trim(),
        answer: '', // Initially empty
      });

      // Refresh the Q&A list
      const qnaRecords = await pb.collection('qna').getList(1, 50, {
        filter: `product = "${productData.id}"`,
        sort: '-created',
      });

      setQuestions(qnaRecords.items);
      setQuestion(''); // Clear input
      alert('Your question has been posted.');
    } catch (err) {
      console.error('Error posting question:', err);
      alert('Failed to post question. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Extract YouTube video ID from URL
  const getYoutubeVideoId = (url) => {
    if (!url) return null;
    
    // Regular expressions for different YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // Check if the product has a valid YouTube video
  const youtubeVideoId = productData?.video ? getYoutubeVideoId(productData.video) : null;

  // Handle YouTube video play
  const handleVideoPlay = () => {
    setVideoPlaying(true);
    setFullscreenVideo(true);
    if (youtubeRef.current) {
      youtubeRef.current.playVideo();
    }
  };

  const handleCloseFullscreen = () => {
    setFullscreenVideo(false);
    setVideoPlaying(false);
    if (youtubeRef.current) {
      youtubeRef.current.pauseVideo();
    }
  };

  // Safely parse JSON or return default value
  const safeJsonParse = (jsonString, defaultValue = []) => {
    try {
      if (typeof jsonString === 'string' && (jsonString.startsWith('{') || jsonString.startsWith('['))) {
        return JSON.parse(jsonString);
      }
      return defaultValue;
    } catch (error) {
      console.log('Error parsing JSON:', error);
      return defaultValue;
    }
  };

  // Get tags
  const getTags = () => {
    if (!productData?.tags) return [];
    if (productData.tags === "JSON") return [];
    return safeJsonParse(productData.tags, [productData.tags]);
  };

  // Tags to display
  const tags = getTags();

  // Load categories, shop info, and products on component mount
  useEffect(() => {
    if (!productData) return;
    
    const loadInitialData = async () => {
      setLoadingCategories(true);
      setLoadingShop(true);
      setLoadingSimilar(true);
      setLoadingSellerProducts(true);
      
      try {
        // Load categories
        const categoryData = await getCategories();
        setCategories(categoryData);
        
        // Load shop info
        const shop = await getShopInfo();
        setShopInfo(shop);
        
        // Load similar products
        const similar = await getSimilarProducts();
        setSimilarProducts(similar);
        
        // Load seller products
        const sellerProds = await getSellerProducts();
        setSellerProducts(sellerProds);
        
        // Load reviews
        await getProductReviews(productData.id);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingCategories(false);
        setLoadingShop(false);
        setLoadingSimilar(false);
        setLoadingSellerProducts(false);
      }
    };

    loadInitialData();
  }, [productData]);

  // Fetch categories asynchronously
  const getCategories = async () => {
    if (!productData?.category) return [];
    if (productData.category === "JSON") return ["Uncategorized"];
    try {
      const allCategories = await pb.collection('categories').getFullList({
        sort: '-created',
      });
      const categories = productData.category
        .map((categoryId) => {
          const category = allCategories.find((cat) => cat.id === categoryId);
          return category ? category.name : null;
        })
        .filter((name) => name !== null);
      return categories.length > 0 ? categories : ["Uncategorized"];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return ["Uncategorized"];
    }
  };

  // Fetch shop information
  const getShopInfo = async () => {
    if (!productData?.shop) return null;
    try {
      const shop = await pb.collection('sellers').getOne(productData.shop);
      return shop;
    } catch (error) {
      console.error('Error fetching shop info:', error);
      return null;
    }
  };

  // Fetch similar products
  const getSimilarProducts = async () => {
    if (!productData?.category || productData.category.length === 0) return [];
    try {
      // Fetch products with the same category
      const similarProds = await pb.collection('products').getList(1, 5, {
        filter: `category ~ "${productData.category[0]}" && id != "${productData.id}" && status = "published"`,
        sort: '-created',
        expand: 'seller', // Expand seller to check verification
      });
      
      // Filter for admin verified sellers
      return similarProds.items.filter(item => 
        item.status === 'published' && item.expand?.seller?.admin_verified
      );
    } catch (error) {
      console.error('Error fetching similar products:', error);
      return [];
    }
  };

  // Fetch more products from the same seller
  const getSellerProducts = async () => {
    if (!productData?.shop) return [];
    try {
      const sellerProds = await pb.collection('products').getList(1, 5, {
        filter: `shop = "${productData.shop}" && id != "${productData.id}" && status = "published"`,
        sort: '-created',
        expand: 'seller', // Expand seller to check verification
      });
      
      // Filter for admin verified sellers
      return sellerProds.items.filter(item => 
        item.status === 'published' && item.expand?.seller?.admin_verified
      );
    } catch (error) {
      console.error('Error fetching seller products:', error);
      return [];
    }
  };

  // Get product reviews
  const getProductReviews = async (productId) => {
    try {
      setIsLoading(true);
      setError(null);
  
      // Fetch reviews for the given product ID
      const reviewsData = await pb.collection('reviews').getFullList({
        filter: `product = "${productId}"`,
        expand: 'user',
      });

      setReviews(reviewsData);
      
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setError('Failed to fetch reviews. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading || !productData) {
    return (
      <LoadingContainer>
        <CircularProgress size={50} color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading product details...</Typography>
      </LoadingContainer>
    );
  }

  return (
    <Container>
      {showHeader && (
        <Header>
          <IconButton onClick={() => navigate(-1)}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Product Details
          </Typography>
        </Header>
      )}

      <MainContent>
        {/* Wishlist button */}
        <WishlistButtonContainer>
          <WishlistButton onClick={toggleWishlist} disabled={wishlistLoading}>
            {wishlistLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              isInWishlist ? <FavoriteIcon sx={{ color: '#FF4081' }} /> : <FavoriteBorderIcon />
            )}
          </WishlistButton>
        </WishlistButtonContainer>
        
        {/* Image Carousel with Zoom Functionality */}
        <ProductImageSection>
          <CarouselContainer>
            {productData.images && productData.images.length > 0 ? (
              <div 
                ref={imageContainerRef} 
                style={{ position: 'relative', height: '100%', width: '100%' }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onMouseMove={handleMouseMove}
              >
                <ZoomIndicator visible={showZoom}>
                  <ZoomInIcon />
                  <Typography variant="caption">Hover to zoom</Typography>
                </ZoomIndicator>
                
                <Carousel
                  ref={carouselRef}
                  indicators={true}
                  navButtonsAlwaysVisible={true}
                  animation="slide"
                  autoPlay={false}
                  index={currentImageIndex}
                  onChange={(index) => setCurrentImageIndex(index)}
                  navButtonsProps={{
                    style: {
                      backgroundColor: 'rgba(255, 255, 255, 0.5)',
                      color: '#333',
                      borderRadius: '50%',
                      margin: '0 20px',
                    }
                  }}
                >
                  {productData.images.map((image, index) => (
                    <CarouselItem key={index} onClick={() => openImageModal(index)}>
                      <img 
                        src={`${pb.baseUrl}/api/files/${productData.collectionId}/${productData.id}/${image}`} 
                        alt={productData.title}
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'contain' 
                        }}
                      />
                    </CarouselItem>
                  ))}
                </Carousel>
              </div>
            ) : (
              <NoImage>
                <ImageNotSupportedIcon sx={{ fontSize: 60, color: '#aaa' }} />
                <Typography sx={{ mt: 1, color: '#aaa' }}>No image available</Typography>
              </NoImage>
            )}
          </CarouselContainer>
          
          {/* Zoom Panel */}
          {showZoom && !isMobile && productData.images && productData.images.length > 0 && (
            <ZoomPanel>
              <ZoomPanelImage 
                src={`${pb.baseUrl}/api/files/${productData.collectionId}/${productData.id}/${productData.images[currentImageIndex]}`}
                alt={`${productData.title} - zoomed view`}
                style={{
                  transform: `scale(${zoomFactor})`,
                  transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                }}
              />
            </ZoomPanel>
          )}
        </ProductImageSection>
        
        {/* Product Info */}
        <ProductInfo>
          {/* Title and Featured Badge */}
          <TitleContainer>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold', flex: 1 }}>
              {productData.title}
            </Typography>
            {productData.featured && (
              <FeaturedBadge>
                <Typography variant="caption" sx={{ fontWeight: 'bold' }}>Featured</Typography>
              </FeaturedBadge>
            )}
          </TitleContainer>
          
          {/* Price Info */}
          <PriceContainer>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1976D2', mr: 1 }}>
              {formatPrice(productData.price)}
            </Typography>
            {productData.compare_price > productData.price && (
              <>
                <Typography variant="body1" sx={{ textDecoration: 'line-through', color: '#888', mr: 1 }}>
                  {formatPrice(productData.compare_price)}
                </Typography>
                <DiscountBadge>
                  <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                    {calculateDiscount()}% OFF
                  </Typography>
                </DiscountBadge>
              </>
            )}
          </PriceContainer>
          
          {/* Stock Status */}
          <StockStatusContainer>
            <StockIndicator status={productData.stock > 0} />
            <Typography variant="body1">
              {productData.stock > 0 ? `In Stock (${productData.stock})` : 'Out of Stock'}
            </Typography>
          </StockStatusContainer>

          {/* Delivery Charge */}
          {productData.delivery_charge > 0 ? (
            <DeliveryContainer>
              <LocalShippingIcon sx={{ color: '#1976D2', mr: 1 }} />
              <Typography variant="body1">
                Standard Delivery Charge: ৳{productData.delivery_charge}
              </Typography>
            </DeliveryContainer>
          ) : (
            <DeliveryContainer>
              <LocalShippingIcon sx={{ color: '#1976D2', mr: 1 }} />
              <Typography variant="body1">
                Free Standard Delivery
              </Typography>
            </DeliveryContainer>
          )}
          
          <StyledDivider />
          
          {/* Shop Information */}
          <SectionTitle>Seller Information</SectionTitle>
          {loadingShop ? (
            <CircularProgress size={30} sx={{ my: 2 }} />
          ) : shopInfo ? (
            <ShopInfoContainer>
              <ShopHeader onClick={() => navigate(`/shop/${shopInfo.id}`)}>
                <ShopImage 
                  src={shopInfo.shop_logo 
                    ? `${pb.baseUrl}/api/files/${shopInfo.collectionId}/${shopInfo.id}/${shopInfo.shop_logo}` 
                    : 'https://via.placeholder.com/50'
                  } 
                  alt={shopInfo.shop_name}
                />
                <ShopDetails>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    {shopInfo.shop_name}
                  </Typography>
                </ShopDetails>
              </ShopHeader>
              
              {shopInfo.social && (
                <MessageButton 
                  variant="outlined" 
                  color="primary"
                  onClick={() => window.open(shopInfo.social, '_blank')}
                  startIcon={<ChatIcon />}
                >
                  Contact
                </MessageButton>
              )}
            </ShopInfoContainer>
          ) : (
            <Typography sx={{ color: '#888', my: 2 }}>Seller information not available</Typography>
          )}
          
          <StyledDivider />
          
          {/* Description */}
          <SectionTitle>Description</SectionTitle>
          <Typography variant="body1" paragraph sx={{ whiteSpace: 'pre-line' }}>
            {productData.description}
          </Typography>
          
          {/* Category */}
          <SectionTitle>Category</SectionTitle>
          {loadingCategories ? (
            <CircularProgress size={24} sx={{ my: 2 }} />
          ) : categories.length > 0 ? (
            <ChipsContainer>
              {categories.map((cat, index) => (
                <Chip 
                  key={index}
                  label={cat}
                  variant="outlined"
                  sx={{ margin: '0 8px 8px 0' }}
                />
              ))}
            </ChipsContainer>
          ) : (
            <Typography sx={{ color: '#888', my: 2 }}>No categories available</Typography>
          )}
          
          {/* Tags */}
          {tags.length > 0 && (
            <>
              <SectionTitle>Tags</SectionTitle>
              <ChipsContainer>
                {tags.map((tag, index) => (
                  <Chip 
                    key={index}
                    label={tag}
                    variant="outlined"
                    sx={{ margin: '0 8px 8px 0' }}
                  />
                ))}
              </ChipsContainer>
            </>
          )}
          
          {/* YouTube Video */}
          {youtubeVideoId && (
            <VideoSection>
              <SectionTitle>Product Video</SectionTitle>
              {!fullscreenVideo ? (
                <VideoContainer onClick={handleVideoPlay}>
                  <YouTubeOverlay>
                    <YouTubeLogoContainer>
                      <img 
                        src="https://www.gstatic.com/youtube/img/branding/youtubelogo/svg/youtubelogo.svg"
                        alt="YouTube"
                        style={{ width: '60px', height: '60px' }}
                      />
                    </YouTubeLogoContainer>
                    <PlayButton>
                      <PlayArrowIcon sx={{ fontSize: 60 }} />
                    </PlayButton>
                  </YouTubeOverlay>
                  <YouTubeThumbnail 
                    src={`https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                    alt="Video thumbnail"
                  />
                </VideoContainer>
              ) : (
                <FullscreenVideoContainer>
                  <IconButton
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      zIndex: 1000,
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      color: 'white',
                      '&:hover': {
                        backgroundColor: 'rgba(0,0,0,0.7)',
                      }
                    }}
                    onClick={handleCloseFullscreen}
                  >
                    <CloseIcon />
                  </IconButton>
                  <YouTube
                    videoId={youtubeVideoId}
                    opts={{
                      width: '100%',
                      height: '100%',
                      playerVars: {
                        autoplay: 1,
                      },
                    }}
                    onReady={(event) => {
                      youtubeRef.current = event.target;
                    }}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                    }}
                  />
                </FullscreenVideoContainer>
              )}
            </VideoSection>
          )}
          
          <StyledDivider />
          
          {/* Similar Products */}
          <SectionTitle>Similar Products</SectionTitle>
          {loadingSimilar ? (
            <CircularProgress size={30} sx={{ my: 2 }} />
          ) : similarProducts.length > 0 ? (
            <ProductsGrid>
              {similarProducts.map((item) => (
                <ProductCard key={item.id} onClick={() => navigate(`/product/${item.slug}`, { state: { product: item } })}>
                  <ProductCardImage 
                    src={item.images && item.images.length > 0 
                      ? `${pb.baseUrl}/api/files/${item.collectionId}/${item.id}/${item.images[0]}` 
                      : 'https://via.placeholder.com/150'
                    } 
                    alt={item.title}
                  />
                  <ProductCardInfo>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1976D2', fontWeight: 'bold' }}>
                      {formatPrice(item.price)}
                    </Typography>
                  </ProductCardInfo>
                </ProductCard>
              ))}
            </ProductsGrid>
          ) : (
            <Typography sx={{ color: '#888', my: 2 }}>No similar products found</Typography>
          )}
          
          {/* More by the seller */}
          <SectionTitle>More from this Seller</SectionTitle>
          {loadingSellerProducts ? (
            <CircularProgress size={30} sx={{ my: 2 }} />
          ) : sellerProducts.length > 0 ? (
            <ProductsGrid>
              {sellerProducts.map((item) => (
                <ProductCard key={item.id} onClick={() => navigate(`/product/${item.slug}`, { state: { product: item } })}>
                  <ProductCardImage 
                    src={item.images && item.images.length > 0 
                      ? `${pb.baseUrl}/api/files/${item.collectionId}/${item.id}/${item.images[0]}` 
                      : 'https://via.placeholder.com/150'
                    } 
                    alt={item.title}
                  />
                  <ProductCardInfo>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} noWrap>
                      {item.title}
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#1976D2', fontWeight: 'bold' }}>
                      {formatPrice(item.price)}
                    </Typography>
                  </ProductCardInfo>
                </ProductCard>
              ))}
            </ProductsGrid>
          ) : (
            <Typography sx={{ color: '#888', my: 2 }}>No more products from this seller</Typography>
          )}
          
          <StyledDivider />
          
          {/* Questions & Answers */}
          <SectionTitle>Questions & Answers</SectionTitle>
          <Box sx={{ mb: 3 }}>
            <TextField
              fullWidth
              multiline
              rows={3}
              placeholder="Ask a question about this product"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              sx={{ mb: 1 }}
            />
            <Button
              variant="contained"
              disabled={isLoading}
              onClick={handlePostQuestion}
              sx={{ mt: 1 }}
            >
              {isLoading ? 'Posting...' : 'Submit'}
            </Button>
          </Box>

          {isLoading ? (
            <CircularProgress size={24} sx={{ my: 2 }} />
          ) : error ? (
            <Alert severity="error">{error}</Alert>
          ) : questions.length > 0 ? (
            questions.map((item) => (
              <QuestionItem key={item.id}>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                    Q: {item.question}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#888' }}>
                    Asked by {item.userName} • {new Date(item.created).toLocaleDateString()}
                  </Typography>
                </Box>
                {item.answer && (
                  <AnswerContainer>
                    <Typography variant="body1">
                      A: {item.answer}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#888' }}>
                      Answered by Seller
                    </Typography>
                  </AnswerContainer>
                )}
              </QuestionItem>
            ))
          ) : (
            <Typography sx={{ color: '#888', my: 2 }}>No questions yet. Be the first to ask!</Typography>
          )}
          
          <StyledDivider />
          
          {/* Reviews */}
          <SectionTitle>Customer Reviews</SectionTitle>
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Box sx={{ textAlign: 'center', mr: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                  {productData.rating}
                </Typography>
                <Rating value={productData.rating} precision={0.5} readOnly />
                <Typography variant="body2" sx={{ color: '#888' }}>
                  Based on {reviews.length} reviews
                </Typography>
              </Box>
            </Box>
            
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <ReviewItem key={review.id}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                      {review.expand?.user?.name || 'Anonymous'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#888' }}>
                    {new Date(review.created).toLocaleDateString()}
                  </Typography>
                </Box>
                <Rating value={review.rating} size="small" readOnly sx={{ mb: 1 }} />
                <Typography variant="body1">{review.review}</Typography>
              </ReviewItem>
            ))
          ) : (
            <Typography sx={{ color: '#888', my: 2 }}>No reviews yet. Be the first to review!</Typography>
          )}
        </Box>
      </ProductInfo>
    </MainContent>
      
    {/* Bottom Action Bar */}
    <BottomBar>
      <QuantitySelector>
        <IconButton 
          onClick={decreaseQuantity}
          disabled={quantity <= 1}
          size="small"
        >
          <RemoveIcon />
        </IconButton>
        <Typography sx={{ mx: 2, fontWeight: 'bold' }}>{quantity}</Typography>
        <IconButton 
          onClick={increaseQuantity}
          disabled={productData.stock <= 0 || quantity >= productData.stock}
          size="small"
        >
          <AddIcon />
        </IconButton>
      </QuantitySelector>
      
      <AddToCartButton
        variant="contained"
        onClick={handleAddToCart}
        disabled={productData.stock <= 0 || cartLoading}
        startIcon={!cartLoading && <ShoppingCartIcon />}
      >
        {cartLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          productData.stock > 0 ? "Add to Cart" : "Out of Stock"
        )}
      </AddToCartButton>
    </BottomBar>

    {/* Image Modal */}
    <Modal
      open={modalVisible}
      onClose={() => setModalVisible(false)}
      sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Box sx={{ position: 'relative', width: '90%', height: '90%', backgroundColor: 'transparent' }}>
        <IconButton
          sx={{ 
            position: 'absolute', 
            top: 8, 
            right: 8, 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            color: '#fff',
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            }
          }}
          onClick={() => setModalVisible(false)}
        >
          <CloseIcon />
        </IconButton>
        {productData.images[modalImageIndex] && (
          <img
            src={`${pb.baseUrl}/api/files/${productData.collectionId}/${productData.id}/${productData.images[modalImageIndex]}`}
            alt={productData.title}
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'contain', 
              backgroundColor: 'rgba(0, 0, 0, 0.9)' 
            }}
          />
        )}
      </Box>
    </Modal>
  </Container>
);
};

// Styled components
const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #fff;
`;

const Header = styled.header`
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
`;

const MainContent = styled.main`
  flex: 1;
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
`;

const WishlistButtonContainer = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
`;

const WishlistButton = styled(IconButton)`
  background-color: rgba(255, 255, 255, 0.8);
  &:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }
`;

// NEW: Product image section to hold carousel and zoom panel side by side
const ProductImageSection = styled.div`
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
  position: relative;
  
  @media (max-width: 1024px) {
    flex-direction: column;
  }
`;

const CarouselContainer = styled.div`
  position: relative;
  height: 400px;
  width: 100%;
  background-color: #f8f8f8;
  border-radius: 8px;
  overflow: hidden;
  flex: 1;

  @media (max-width: 768px) {
    height: 300px;
  }
`;

const CarouselItem = styled.div`
  height: 400px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;

  @media (max-width: 768px) {
    height: 300px;
  }
`;

const NoImage = styled.div`
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f0f0f0;
`;

// NEW: Zoom panel to show zoomed image
const ZoomPanel = styled.div`
  position: relative;
  width: 400px;
  height: 400px;
  border: 1px solid #ddd;
  border-radius: 8px;
  overflow: hidden;
  background-color: white;
  
  @media (max-width: 1024px) {
    display: none;
  }
`;

const ZoomPanelImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: contain;
`;

// Zoom related styled components
const ZoomIndicator = styled.div`
  position: absolute;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 5px 10px;
  border-radius: 20px;
  display: ${props => props.visible ? 'flex' : 'none'};
  align-items: center;
  gap: 5px;
  z-index: 5;
  pointer-events: none;
`;

const ProductInfo = styled.div`
  padding: 0 16px 120px;
`;

const TitleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const FeaturedBadge = styled.div`
  background-color: #ff9800;
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  margin-left: 12px;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const DiscountBadge = styled.div`
  background-color: #f44336;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  margin-left: 8px;
`;

const StockStatusContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const StockIndicator = styled.div`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: ${props => props.status ? '#4CAF50' : '#F44336'};
  margin-right: 8px;
`;

const DeliveryContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
`;

const StyledDivider = styled(Divider)`
  margin: 24px 0;
`;

const SectionTitle = styled(Typography)`
  font-weight: bold;
  margin-bottom: 16px;
  color: #333;
`;

const ShopInfoContainer = styled.div`
  display: flex;
  flex-direction: column;
  margin-bottom: 16px;
`;

const ShopHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  cursor: pointer;
`;

const ShopImage = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 12px;
`;

const ShopDetails = styled.div`
  flex: 1;
`;

const MessageButton = styled(Button)`
  align-self: flex-start;
`;

const ChipsContainer = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

const VideoSection = styled.div`
  margin: 24px 0;
`;

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  height: 0;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background-color: #000;
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
`;

const YouTubeOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  z-index: 1;
`;

const YouTubeLogoContainer = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
`;

const PlayButton = styled.div`
  color: white;
`;

const YouTubeThumbnail = styled.img`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const ProductsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const ProductCard = styled.div`
  background-color: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  cursor: pointer;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-5px);
  }
`;

const ProductCardImage = styled.img`
  width: 100%;
  height: 150px;
  object-fit: contain;
  background-color: #f8f8f8;
`;

const ProductCardInfo = styled.div`
  padding: 12px;
`;

const QuestionItem = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const AnswerContainer = styled.div`
  background-color: #f0f8ff;
  border-radius: 8px;
  padding: 12px;
  margin-top: 12px;
`;

const ReviewItem = styled.div`
  background-color: #f9f9f9;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
`;

const BottomBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  padding: 16px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  z-index: 1000;
`;

const QuantitySelector = styled.div`
  display: flex;
  align-items: center;
  background-color: #f5f5f5;
  border-radius: 24px;
  padding: 4px;
`;

const AddToCartButton = styled(Button)`
  flex: 1;
  margin-left: 16px;
  border-radius: 24px;
  padding: 12px;
  font-weight: bold;
  text-transform: none;
`;

const FullscreenVideoContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000;
  z-index: 9999;
  display: flex;
  justify-content: center;
  align-items: center;
`;

export default ProductDetailScreen;