import React, { useState, useEffect } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { 
  Typography, 
  Container, 
  Box, 
  CircularProgress, 
  Button, 
  TextField, 
  IconButton, 
  Card, 
  CardContent,
  Chip,
  Paper,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Rating,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  ChevronLeft, 
  AlertCircle, 
  Store, 
  MessageCircle, 
  Edit, 
  CheckCircle, 
  Clock,
  XCircle,
  HelpCircle,
  X,
  Download
} from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import pb from '../pocketbase';
import { Star } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
 
const OrderDetailsScreen = () => {
  const { id } = useParams();
    const orderId = id;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [seller, setSeller] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { enqueueSnackbar } = useSnackbar();

  // Review state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviews, setReviews] = useState({});

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch order details with expanded relationships
      const orderData = await pb.collection('orders').getOne(orderId, {
        expand: 'user_id,seller_id,invoice',
      });
      setOrder(orderData);
      
      // Fetch seller details
      if (orderData.seller_id) {
        const sellerData = await pb.collection('sellers').getOne(orderData.seller_id);
        setSeller(sellerData);
      }
      
      // Fetch product details for each product in the order
      const productDetails = await Promise.all(
        orderData.products_id.map(async (productItem) => {
          try {
            const product = await pb.collection('products').getOne(productItem.id);
            
            // Get variant information for this product from the variants field
            const variantInfo = orderData.variants ? orderData.variants[product.id] : null;

            return {
              ...product,
              quantity: productItem.quantity,
              variant: variantInfo
            };
          } catch (error) {
            console.warn(`Product with ID ${productItem.id} not found:`, error);
            return null;
          }
        })
      );
      
      // Filter out any null products
      const validProducts = productDetails.filter(item => item !== null);
      setProducts(validProducts);
      
      // Check if user has already reviewed each product
      await checkExistingReviews(orderData);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching order details:', error);
      enqueueSnackbar('Failed to load order details. Please try again.', { variant: 'error' });
      setLoading(false);
    }
  };

  const checkExistingReviews = async (orderData) => {
    if (!orderData || !orderData.products_id) return;
    
    try {
      const currentUserData = localStorage.getItem('userId');
      
      if (!currentUserData) return;
      
      // Get all reviews from this user for this order
      const reviewsData = await pb.collection('reviews').getList(1, 50, {
        filter: `order_id="${orderId}"`,
      });
      
      // Create a map of product_id -> review
      const reviewsMap = {};
      reviewsData.items.forEach(review => {
        if (review.product) {
          reviewsMap[review.product] = review;
        }
      });
      
      setReviews(reviewsMap);
    } catch (error) {
      console.error('Error checking existing reviews:', error);
    }
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getOrderStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'hold':
        return '#FFA500'; // Orange
      case 'processing':
        return '#3498db'; // Blue
      case 'shipped':
        return '#9b59b6'; // Purple
      case 'delivered':
        return '#2ecc71'; // Green
      case 'canceled':
        return '#e74c3c'; // Red
      default:
        return '#95a5a6'; // Gray
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return '#2ecc71'; // Green
      case 'pending':
        return '#f39c12'; // Yellow
      case 'failed':
        return '#e74c3c'; // Red
      default:
        return '#95a5a6'; // Gray
    }
  };

  const getPaymentStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <CheckCircle size={16} color="#2ecc71" />;
      case 'pending':
        return <Clock size={16} color="#f39c12" />;
      case 'failed':
        return <XCircle size={16} color="#e74c3c" />;
      default:
        return <HelpCircle size={16} color="#95a5a6" />;
    }
  };

  const renderOrderStatusTracker = () => {
    const statuses = ['hold', 'processing', 'shipped', 'delivered'];
    const currentIndex = statuses.indexOf(order.order_status.toLowerCase());
    
    return (
      <StatusTracker>
        {statuses.map((status, index) => {
          const isActive = index <= currentIndex;
          const isLastItem = index === statuses.length - 1;
          
          return (
            <StatusItem key={status}>
              <StatusCircle isActive={isActive} color={getOrderStatusColor(status)}>
                {isActive && <CheckCircle size={16} color="#fff" />}
              </StatusCircle>
              <StatusLabel isActive={isActive} color={getOrderStatusColor(status)}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </StatusLabel>
              {!isLastItem && (
                <StatusLine 
                  isActive={index < currentIndex} 
                  color={index < currentIndex ? getOrderStatusColor(statuses[index + 1]) : '#ddd'} 
                />
              )}
            </StatusItem>
          );
        })}
      </StatusTracker>
    );
  };

  const openReviewModal = (product) => {
    setSelectedProduct(product);
    // If there's an existing review, prefill the form
    if (reviews[product.id]) {
      setRating(reviews[product.id].rating);
      setReviewText(reviews[product.id].review);
    } else {
      // Reset form for new review
      setRating(5);
      setReviewText('');
    }
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!selectedProduct) return;
    
    try {
      setSubmittingReview(true);
      
      const userData = pb.authStore.model;
      if (!userData) {
        enqueueSnackbar('You must be logged in to submit a review.', { variant: 'error' });
        setSubmittingReview(false);
        return;
      }
      
      const reviewData = {
        order_id: orderId,
        order: orderId,
        product: selectedProduct.id,
        seller: seller ? seller.id : null,
        user: userData.id,
        rating: rating,
        review: reviewText,
        product: selectedProduct.id,
      };
      
      let reviewId;
      
      // Check if this is an update or a new review
      if (reviews[selectedProduct.id]) {
        // Update existing review
        await pb.collection('reviews').update(reviews[selectedProduct.id].id, reviewData);
        reviewId = reviews[selectedProduct.id].id;
      } else {
        // Create new review
        const record = await pb.collection('reviews').create(reviewData);
        reviewId = record.id;
      }
      
      // Update product's rating and reviews_count
      const productData = await pb.collection('products').getOne(selectedProduct.id);
      
      // Calculate new average rating
      let totalReviews = productData.reviews_count || 0;
      let currentRating = productData.rating || 0;
      
      // If this is a new review (not an update)
      if (!reviews[selectedProduct.id]) {
        totalReviews++;
      }
      
      // Calculate new average rating
      let newRating;
      if (!reviews[selectedProduct.id]) {
        // New review
        newRating = totalReviews === 1 ? rating : (currentRating * (totalReviews - 1) + rating) / totalReviews;
      } else {
        // Update - remove old rating impact and add new rating
        newRating = (currentRating * totalReviews - reviews[selectedProduct.id].rating + rating) / totalReviews;
      }
      
      // Update product with new rating and reviews count
      await pb.collection('products').update(selectedProduct.id, {
        rating: newRating,
        reviews_count: totalReviews,
        reviews: [...(productData.reviews || []), reviewId]
      });
      
      // Add the review to our local state to show as "already reviewed"
      setReviews({
        ...reviews,
        [selectedProduct.id]: {
          id: reviewId,
          ...reviewData
        }
      });
      
      setSubmittingReview(false);
      setShowReviewModal(false);
      enqueueSnackbar('Your review has been submitted. Thank you for your feedback!', { variant: 'success' });
      
    } catch (error) {
      console.error('Error submitting review:', error);
      enqueueSnackbar('Failed to submit review. Please try again.', { variant: 'error' });
      setSubmittingReview(false);
    }
  };

  const renderStars = (selected, onChangeHandler = null, size = 'small') => {
    return (
      <Rating
        name="product-rating"
        value={selected}
        onChange={(event, newValue) => {
          if (onChangeHandler) onChangeHandler(newValue || 0);
        }}
        size={size}
        readOnly={!onChangeHandler}
        icon={<Star size={size === 'large' ? 30 : 16} color="#FFD700" />}
        emptyIcon={<Star size={size === 'large' ? 30 : 16} color="#FFD700" />}
      />
    );
  };

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading order details...</Typography>
      </LoadingContainer>
    );
  }

  if (!order) {
    return (
      <ErrorContainer>
        <AlertCircle size={64} color="#e74c3c" />
        <Typography variant="h5" sx={{ mt: 2, mb: 3 }}>Order not found</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={() => navigate(-1)}
          sx={{ borderRadius: '25px', px: 3, py: 1 }}
        >
          Go Back
        </Button>
      </ErrorContainer>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#007bff" />
        </BackButton>
        <HeaderTitle>Order Details</HeaderTitle>
      </Header>
      
      <Content>
        <OrderHeaderCard>
          <OrderBasicInfo>
            <OrderId>Order #{order.id.substring(0, 8)}</OrderId>
            <OrderDate>{formatDate(order.created)}</OrderDate>
          </OrderBasicInfo>
          
          <StatusSection>
            <StatusRow>
              <StatusLabel>Order Status:</StatusLabel>
              <StatusBadge style={{ backgroundColor: getOrderStatusColor(order.order_status) }}>
                {order.order_status.toUpperCase()}
              </StatusBadge>
            </StatusRow>
            
            <StatusRow>
              <StatusLabel>Payment Status:</StatusLabel>
              <StatusBadge style={{ backgroundColor: getPaymentStatusColor(order.payment_status) }}>
                {order.payment_status.toUpperCase()}
              </StatusBadge>
            </StatusRow>
            
            <StatusRow>
              <StatusLabel>Payment Method:</StatusLabel>
              <PaymentMethod>{order.payment_method}</PaymentMethod>
            </StatusRow>
          </StatusSection>
        </OrderHeaderCard>
        
        {order.order_status.toLowerCase() !== 'canceled' && renderOrderStatusTracker()}
        
        <SectionCard>
          <SectionTitle>Items in Your Order</SectionTitle>
          {products.map((product, index) => (
            <React.Fragment key={product.id}>
              <ProductItem 
                onClick={() => navigate(`/product/${product.slug}`)}
                className={index < products.length - 1 && !reviews[product.id] ? 'bottom-border' : ''}
              >
                <ProductImage 
                  src={pb.files.getURL(product, product.images[0])} 
                  alt={product.title}
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '../assets/product-placeholder.png';
                  }}
                />
                <ProductInfo>
                  <ProductTitle>{product.title}</ProductTitle>
                  <ProductPrice>৳{product.price.toFixed(2)}</ProductPrice>
                  <ProductQuantity>Quantity: {product.quantity}</ProductQuantity>
                  
                  {/* Display digital product badge if applicable */}
                  {product.digital_product && (
                    <DigitalProductBadge>
                      Digital Product
                    </DigitalProductBadge>
                  )}
                  
                  {/* Display download button if it's a digital product and payment status is paid */}
                  {product.digital_product && order.payment_status.toLowerCase() === 'paid' && (
                    <DownloadButton 
                      onClick={(e) => {
                        e.stopPropagation();
                        // Use download_link if available, otherwise use the product file URL
                        const downloadUrl = product.download_link || pb.files.getURL(product, product.product);
                        window.open(downloadUrl, '_blank');
                      }}
                    >
                      <Download size={14} />
                      <span>Download</span>
                    </DownloadButton>
                  )}
                  
                  {product.variant && (
                    <>
                      {product.variant.color && (
                        <ProductVariant>
                          <VariantColorDot style={{ backgroundColor: product.variant.color.toLowerCase() }} />
                          Color: {product.variant.color}
                        </ProductVariant>
                      )}
                      {product.variant.size && (
                        <ProductVariant>
                          Size: {product.variant.size}
                        </ProductVariant>
                      )}
                      {product.variant.weight && (
                        <ProductVariant>
                          Weight: {product.variant.weight}
                        </ProductVariant>
                      )}
                    </>
                  )}
                </ProductInfo>
                <ProductTotal>৳{(product.price * product.quantity).toFixed(2)}</ProductTotal>
              </ProductItem>
              
              {order.order_status.toLowerCase() === 'delivered' && (
                <ReviewSection className={index < products.length - 1 ? 'bottom-border' : ''}>
                  {reviews[product.id] ? (
                    <UserReview>
                      <ReviewHeader>
                        <YourReviewText>Your Review</YourReviewText>
                        {renderStars(reviews[product.id].rating)}
                      </ReviewHeader>
                      <ReviewContent>{reviews[product.id].review}</ReviewContent>
                      <EditReviewButton 
                        onClick={(e) => {
                          e.stopPropagation();
                          openReviewModal(product);
                        }}
                      >
                        <Edit size={16} color="#007bff" />
                        <EditReviewText>Edit Review</EditReviewText>
                      </EditReviewButton>
                    </UserReview>
                  ) : (
                    <AddReviewButton
                      onClick={(e) => {
                        e.stopPropagation();
                        openReviewModal(product);
                      }}
                    >
                      <Star size={16} color="#007bff" />
                      <AddReviewText>Review this product</AddReviewText>
                    </AddReviewButton>
                  )}
                </ReviewSection>
              )}
              {index < products.length - 1 && <Divider sx={{ my: 1 }} />}
            </React.Fragment>
          ))}
        </SectionCard>
        
        <SectionCard>
          <SectionTitle>Price Details</SectionTitle>
          <PriceRow>
            <PriceLabel>Product Total</PriceLabel>
            <PriceValue>৳{order.product_price.toFixed(2)}</PriceValue>
          </PriceRow>
          <PriceRow>
            <PriceLabel>Delivery Charge</PriceLabel>
            <PriceValue>৳{order.delivery_charge.toFixed(2)}</PriceValue>
          </PriceRow>
          <TotalRow>
            <TotalLabel>Order Total</TotalLabel>
            <TotalValue>৳{(order.product_price + order.delivery_charge).toFixed(2)}</TotalValue>
          </TotalRow>
        </SectionCard>
        
        {seller && (
          <SectionCard>
            <SectionTitle>Seller Information</SectionTitle>
            <SellerInfo onClick={() => navigate(`/shop/${seller.id}`)}>
              <SellerIconContainer>
                <Store size={32} color="#007bff" />
              </SellerIconContainer>
              <SellerDetails>
                <SellerName>{seller.shop_name}</SellerName>
                <SellerContact>{seller.email}</SellerContact>
                {seller.phone && <SellerContact>{seller.phone}</SellerContact>}
              </SellerDetails>
            </SellerInfo>
            {seller.social && (
              <ContactButton 
                onClick={() => window.open(seller.social, '_blank')}
              >
                <MessageCircle size={16} color="#fff" />
                <ContactButtonText>Contact Seller</ContactButtonText>
              </ContactButton>
            )}
          </SectionCard>
        )}
      </Content>
      
      {/* Review Modal */}
      <Dialog
        open={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          style: {
            borderRadius: '15px',
            padding: '10px'
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {reviews[selectedProduct?.id] ? 'Edit Your Review' : 'Write a Review'}
          </Typography>
          <IconButton onClick={() => setShowReviewModal(false)} size="small">
            <X size={24} />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          {selectedProduct && (
            <ModalProductInfo>
              <ModalProductImage 
                src={pb.files.getURL(selectedProduct, selectedProduct.images[0])} 
                alt={selectedProduct.title}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '../assets/product-placeholder.png';
                }}
              />
              <Typography variant="subtitle1">{selectedProduct.title}</Typography>
            </ModalProductInfo>
          )}
          
          <Box sx={{ my: 2 }}>
            <Typography variant="subtitle1" gutterBottom>Your Rating</Typography>
            <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
              {renderStars(rating, setRating, 'large')}
            </Box>
            
            <Typography variant="subtitle1" gutterBottom>Your Review</Typography>
            <TextField
              fullWidth
              multiline
              minRows={4}
              placeholder="Share your experience with this product..."
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              variant="outlined"
              sx={{ mb: 2 }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <SubmitButton 
            onClick={submitReview}
            disabled={submittingReview}
            fullWidth
          >
            {submittingReview ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              reviews[selectedProduct?.id] ? 'Update Review' : 'Submit Review'
            )}
          </SubmitButton>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// Styled components
const Header = styled.div`
  display: flex;
  align-items: center;
  padding: 15px;
  background-color: #fff;
  border-bottom: 1px solid #eee;
  margin-bottom: 15px;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const BackButton = styled(IconButton)`
  padding: 5px;
`;

const HeaderTitle = styled.h1`
  font-size: 24px;
  font-weight: bold;
  color: #333;
  margin: 0 auto 0 0;
  text-align: center;
`;

const Content = styled.div`
  width: 100%;
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  min-height: 70vh;
`;

const OrderHeaderCard = styled(Paper)`
  border-radius: 10px;
  margin-bottom: 15px;
  padding: 15px;
`;

const OrderBasicInfo = styled.div`
  margin-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
  padding-bottom: 15px;
`;

const OrderId = styled.h2`
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
  margin-bottom: 5px;
`;

const OrderDate = styled.p`
  font-size: 14px;
  color: #777;
  margin: 0;
`;

const StatusSection = styled.div`
  margin-top: 5px;
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const StatusLabel = styled.span`
  font-size: 15px;
  color: #555;
`;

const StatusBadge = styled(Chip)`
  font-size: 12px;
  font-weight: bold;
  color: white;
  height: 24px;
`;

const PaymentMethod = styled.span`
  font-size: 15px;
  color: #333;
  font-weight: 500;
`;

const StatusTracker = styled(Paper)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: 10px;
  margin-bottom: 15px;
  padding: 15px;
`;

const StatusItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  position: relative;
`;

const StatusCircle = styled.div`
  width: 24px;
  height: 24px;
  border-radius: 12px;
  background-color: ${props => props.isActive ? props.color : '#ddd'};
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1;
`;

const StatusLine = styled.div`
  position: absolute;
  height: 3px;
  width: 100%;
  background-color: ${props => props.color};
  top: 12px;
  left: 50%;
  z-index: 0;
`;

const SectionCard = styled(Paper)`
  border-radius: 10px;
  margin-bottom: 15px;
  padding: 15px;
`;

const SectionTitle = styled.h3`
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 10px 0;
`;

const ProductItem = styled.div`
    display: flex;
    align-items: center;
    margin-bottom: 10px;
    cursor: pointer;
    transition: background-color 0.2s;
    padding: 5px;
    border-radius: 8px;
    
    &:hover {
      background-color: #f5f5f5;
    }
  `;
  
  const DigitalProductBadge = styled.span`
    display: inline-block;
    background-color: #e3f2fd;
    color: #0288d1;
    font-size: 11px;
    font-weight: bold;
    padding: 3px 6px;
    border-radius: 4px;
    margin-top: 5px;
  `;
  
  const DownloadButton = styled.button`
    display: flex;
    align-items: center;
    gap: 4px;
    background-color: #e6fff0;
    color: #00a362;
    border: none;
    border-radius: 4px;
    padding: 4px 8px;
    margin-top: 5px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background-color 0.2s;
    
    &:hover {
      background-color: #d0ffe6;
    }
  `;

  const ProductImage = styled.img`
    width: 60px;
    height: 60px;
    border-radius: 8px;
    object-fit: cover;
    margin-right: 15px;
  `;

  const ProductInfo = styled.div`
    flex: 1;
    min-width: 0;
  `;

  const ProductTitle = styled.h3`
    font-size: 14px;
    font-weight: bold;
    color: #333;
    margin: 0 0 4px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `;

  const ProductPrice = styled.p`
    font-size: 14px;
    color: #007bff;
    font-weight: bold;
    margin: 0 0 4px 0;
  `;

  const ProductQuantity = styled.p`
    font-size: 12px;
    color: #777;
    margin: 0 0 4px 0;
  `;

  const ProductVariant = styled.p`
    font-size: 12px;
    color: #777;
    margin: 0;
    display: flex;
    align-items: center;
  `;

  const VariantColorDot = styled.span`
    display: inline-block;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    margin-right: 4px;
    border: 1px solid #ddd;
  `;

const ProductTotal = styled.p`
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin: 0;
`;

const ReviewSection = styled.div`
  padding: 10px 0;
  margin-bottom: 10px;

  &.bottom-border {
    border-bottom: 1px solid #f0f0f0;
  }
`;

const AddReviewButton = styled.button`
  display: flex;
  align-items: center;
  background: none;
  border: none;
  padding: 10px;
  margin-left: 70px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-radius: 5px;

  &:hover {
    background-color: #f0f7ff;
  }
`;

const AddReviewText = styled.span`
  color: #007bff;
  margin-left: 5px;
  font-weight: 500;
`;

const UserReview = styled.div`
  margin-left: 70px;
  background-color: #f9f9f9;
  padding: 10px;
  border-radius: 8px;
`;

const ReviewHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 5px;
`;

const YourReviewText = styled.span`
  font-weight: bold;
  color: #333;
`;

const ReviewContent = styled.p`
  color: #555;
  margin: 5px 0;
  font-size: 13px;
`;

const EditReviewButton = styled.button`
  display: flex;
  align-items: center;
  align-self: flex-end;
  background: none;
  border: none;
  padding: 5px;
  margin-left: auto;
  cursor: pointer;
`;

const EditReviewText = styled.span`
  color: #007bff;
  margin-left: 3px;
  font-size: 12px;
`;

const PriceRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const PriceLabel = styled.span`
  font-size: 14px;
  color: #555;
`;

const PriceValue = styled.span`
  font-size: 14px;
  color: #333;
`;

const TotalRow = styled(PriceRow)`
  border-top: 1px solid #f0f0f0;
  padding-top: 10px;
  margin-top: 5px;
`;

const TotalLabel = styled.span`
  font-size: 16px;
  font-weight: bold;
  color: #333;
`;

const TotalValue = styled.span`
  font-size: 16px;
  font-weight: bold;
  color: #007bff;
`;

const SellerInfo = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  cursor: pointer;
  padding: 5px;
  border-radius: 5px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #f5f5f5;
  }
`;

const SellerIconContainer = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 25px;
  background-color: #e6f2ff;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 10px;
`;

const SellerDetails = styled.div`
  flex: 1;
`;

const SellerName = styled.h4`
  font-size: 14px;
  font-weight: bold;
  color: #333;
  margin: 0 0 4px 0;
`;

const SellerContact = styled.p`
  font-size: 12px;
  color: #777;
  margin: 0 0 2px 0;
`;

const ContactButton = styled(Button)`
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #007bff;
  padding: 10px;
  border-radius: 25px;
  margin-top: 10px;
  color: #fff;
  text-transform: none;

  &:hover {
    background-color: #0056b3;
  }
`;

const ContactButtonText = styled.span`
  color: #fff;
  font-weight: bold;
  margin-left: 5px;
`;

const ModalProductInfo = styled(Box)`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 10px;
`;

const ModalProductImage = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 8px;
  margin-right: 10px;
  object-fit: cover;
`;

const SubmitButton = styled(Button)`
  background-color: #007bff;
  color: #fff;
  padding: 15px;
  border-radius: 25px;
  text-transform: none;
  font-weight: bold;

  &:hover {
    background-color: #0056b3;
  }

  &:disabled {
    background-color: #cccccc;
  }
`;

export default OrderDetailsScreen;