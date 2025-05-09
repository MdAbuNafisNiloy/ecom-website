import React, { useState, useEffect, useCallback } from 'react';
import styled from '@emotion/styled';
import { css } from '@emotion/react';
import { 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress,
  IconButton,
  Chip,
  Container,
  Grid,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  ChevronLeft, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  HelpCircle,
  MapPin,
  Star,
  Download
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import pb from '../pocketbase';
import { enqueueSnackbar } from 'notistack';

const MyOrdersScreen = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Similar to useFocusEffect in React Navigation
  useEffect(() => {
    fetchUserData();
    
    // Add event listener for when the page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUserData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      if (!userId) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const userData = await pb.collection('users').getOne(userId);
      setUser(userData);

      // Fetch user's orders
      const ordersData = await pb.collection('orders').getList(1, 50, {
        filter: `user_id = "${userId}"`,
        sort: '-created',
        expand: 'seller_id,products'
      });

      // Process orders to get product details
      const processedOrders = await Promise.all(
        ordersData.items.map(async (order) => {
          // Get product details for each product in the order
          const productDetails = await Promise.all(
            order.products_id.map(async (productItem) => {
              try {
                const product = await pb.collection('products').getOne(productItem.id);
                return {
                  ...product,
                  quantity: productItem.quantity
                };
              } catch (error) {
                console.warn(`Product with ID ${productItem.id} not found:`, error);
                return null;
              }
            })
          );

          // Filter out any null products
          const validProducts = productDetails.filter(item => item !== null);

          return {
            ...order,
            products: validProducts
          };
        })
      );

      setOrders(processedOrders);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      enqueueSnackbar('Failed to load orders. Please try again.', { variant: 'error' });
      setLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchUserData().finally(() => setRefreshing(false));
  }, []);

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

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  const getPaymentStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return { icon: <CheckCircle size={16} color="#2ecc71" />, color: '#2ecc71' };
      case 'pending':
        return { icon: <Clock size={16} color="#f39c12" />, color: '#f39c12' };
      case 'failed':
        return { icon: <XCircle size={16} color="#e74c3c" />, color: '#e74c3c' };
      default:
        return { icon: <HelpCircle size={16} color="#95a5a6" />, color: '#95a5a6' };
    }
  };

  const renderOrderItem = (item) => {
    const paymentStatusIcon = getPaymentStatusIcon(item.payment_status);
    const orderDate = formatDate(item.created);
    
    return (
      <OrderCard key={item.id} onClick={() => navigate(`/order-details/${item.id}`)}>
        <OrderHeader>
          <OrderInfo>
            <OrderId>Order #{item.id.substring(0, 8)}</OrderId>
            <OrderDate>{orderDate}</OrderDate>
          </OrderInfo>
          <StatusBadge style={{ backgroundColor: getOrderStatusColor(item.order_status) }}>
            {item.order_status.toUpperCase()}
          </StatusBadge>
        </OrderHeader>

        <ProductsContainer>
          {item.products.slice(0, 3).map((product, index) => (
            <ProductItem key={index}>
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
                <ProductMeta>Qty: {product.quantity} × ৳{product.price.toFixed(2)}</ProductMeta>
              </ProductInfo>
            </ProductItem>
          ))}
          {item.products.length > 3 && (
            <MoreItems>+{item.products.length - 3} more items</MoreItems>
          )}
        </ProductsContainer>

        <OrderFooter>
          <PaymentStatus>
            {paymentStatusIcon.icon}
            <PaymentStatusText style={{ color: paymentStatusIcon.color }}>
              {item.payment_status.toUpperCase()}
            </PaymentStatusText>
          </PaymentStatus>
          <PriceContainer>
            <TotalLabel>Total:</TotalLabel>
            <TotalPrice>৳{(item.product_price + item.delivery_charge).toFixed(2)}</TotalPrice>
          </PriceContainer>
        </OrderFooter>
        
        <ActionButtons>
          <TrackButton 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/order-details/${item.id}`);
            }}
          >
            <MapPin size={16} color="#007bff" />
            <TrackButtonText>Track Order</TrackButtonText>
          </TrackButton>
          
          {/* Digital products download section */}
          {item.payment_status.toLowerCase() === 'paid' && item.products.some(product => product.digital_product) && (
            <ActionButtonsDigital>
              {item.products.filter(product => product.digital_product).map((product, idx) => (
                <DownloadButton 
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    // Use download_link if available, otherwise use the product file URL
                    const downloadUrl = product.download_link || pb.files.getURL(product, product.product);
                    window.open(downloadUrl, '_blank');
                  }}
                >
                  <Download size={16} color="#00a362" />
                  <DownloadButtonText>Download {product.title}</DownloadButtonText>
                </DownloadButton>
              ))}
            </ActionButtonsDigital>
          )}
          
          {/* {item.order_status.toLowerCase() === 'delivered' && (
            <ReviewButton 
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/write-review/${item.id}`);
              }}
            >
              <Star size={16} color="#007bff" />
              <ReviewButtonText>Write Review</ReviewButtonText>
            </ReviewButton>
          )} */}
        </ActionButtons>
      </OrderCard>
    );
  };

  const renderEmptyOrders = () => (
    <EmptyContainer>
      <Receipt size={64} color="#c5c5c5" />
      <EmptyTitle>No Orders Yet</EmptyTitle>
      <EmptySubtitle>Items you order will appear here</EmptySubtitle>
      <ShopNowButton onClick={() => navigate('/')}>
        Start Shopping
      </ShopNowButton>
    </EmptyContainer>
  );

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} color="primary" />
        <Typography variant="h6" sx={{ mt: 2 }}>Loading your orders...</Typography>
      </LoadingContainer>
    );
  }

  return (
    <Container maxWidth="md">
      <AppHeader>
        <BackButton onClick={() => navigate(-1)}>
          <ChevronLeft size={24} color="#007bff" />
        </BackButton>
        <HeaderTitle>My Orders</HeaderTitle>
      </AppHeader>
      
      {orders.length > 0 ? (
        <OrdersList>
          {orders.map(renderOrderItem)}
        </OrdersList>
      ) : (
        renderEmptyOrders()
      )}
      
      {refreshing && (
        <RefreshIndicator>
          <CircularProgress size={20} color="primary" />
          <Typography variant="body2" sx={{ ml: 1 }}>Refreshing...</Typography>
        </RefreshIndicator>
      )}
    </Container>
  );
};

// Styled components using @emotion/styled
const AppHeader = styled.div`
  padding: 15px;
  display: flex;
  flex-direction: row;
  align-items: center;
  background-color: #fff;
  margin-bottom: 10px;
  border-radius: 0 0 10px 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
`;

const BackButton = styled(IconButton)`
  margin-right: 10px;
`;

const HeaderTitle = styled.h1`
  font-size: 24px;
  font-weight: bold;
  margin: 0 auto 0 0;
  color: #333;
`;

const OrdersList = styled.div`
  padding-bottom: 20px;
`;

const OrderCard = styled(Card)`
  border-radius: 10px;
  margin-top: 15px;
  padding: 15px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
  }
`;

const OrderHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
`;

const OrderInfo = styled.div`
  flex: 1;
`;

const OrderId = styled.h2`
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0;
`;

const OrderDate = styled.p`
  font-size: 14px;
  color: #777;
  margin: 2px 0 0 0;
`;

const StatusBadge = styled(Chip)`
  font-size: 12px;
  font-weight: bold;
  color: white;
  height: 24px;
`;

const ProductsContainer = styled.div`
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
  margin-bottom: 15px;
`;

const ProductItem = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 10px;
`;

const ProductImage = styled.img`
  width: 50px;
  height: 50px;
  border-radius: 5px;
  background-color: #f0f0f0;
  object-fit: cover;
`;

const ProductInfo = styled.div`
  flex: 1;
  margin-left: 10px;
`;

const ProductTitle = styled.h3`
  font-size: 15px;
  color: #333;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ProductMeta = styled.p`
  font-size: 14px;
  color: #777;
  margin: 2px 0 0 0;
`;

const MoreItems = styled.p`
  font-size: 14px;
  color: #777;
  font-style: italic;
  margin: 5px 0 0 0;
`;

const OrderFooter = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
`;

const PaymentStatus = styled.div`
  display: flex;
  align-items: center;
`;

const PaymentStatusText = styled.span`
  margin-left: 5px;
  font-size: 14px;
  font-weight: bold;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
`;

const TotalLabel = styled.span`
  font-size: 16px;
  color: #333;
  margin-right: 5px;
`;

const TotalPrice = styled.span`
  font-size: 18px;
  font-weight: bold;
  color: #007bff;
`;

const ActionButtons = styled.div`
  display: flex;
  margin-top: 15px;
  border-top: 1px solid #f0f0f0;
  padding-top: 15px;
`;

const TrackButton = styled.button`
  display: flex;
  align-items: center;
  background-color: #e6f2ff;
  padding: 8px 15px;
  border-radius: 20px;
  margin-right: 10px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: #d0e5ff;
  }
`;

const TrackButtonText = styled.span`
  color: #007bff;
  margin-left: 5px;
  font-weight: 500;
`;

const ReviewButton = styled.button`
  display: flex;
  align-items: center;
  background-color: #e6f2ff;
  padding: 8px 15px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: #d0e5ff;
  }
`;

const ReviewButtonText = styled.span`
  color: #007bff;
  margin-left: 5px;
  font-weight: 500;
`;

const ActionButtonsDigital = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-left: auto;
`;

const DownloadButton = styled.button`
  display: flex;
  align-items: center;
  background-color: #e6fff0;
  padding: 8px 15px;
  border-radius: 20px;
  border: none;
  cursor: pointer;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: #d0ffe6;
  }
`;

const DownloadButtonText = styled.span`
  color: #00a362;
  margin-left: 5px;
  font-weight: 500;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px;
  margin-top: 50px;
`;

const EmptyTitle = styled.h2`
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 15px 0 0 0;
`;

const EmptySubtitle = styled.p`
  font-size: 16px;
  color: #777;
  margin: 5px 0 20px 0;
  text-align: center;
`;

const ShopNowButton = styled(Button)`
  background-color: #007bff;
  color: #fff;
  padding: 12px 20px;
  border-radius: 25px;
  text-transform: none;
  font-weight: bold;
  font-size: 16px;
  &:hover {
    background-color: #0056b3;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 70vh;
  background-color: #f9f9f9;
`;

const RefreshIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.7);
  border-radius: 8px;
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

export default MyOrdersScreen;