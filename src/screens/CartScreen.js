import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  Card,
  CardContent,
  CardMedia,
  Divider,
  Paper,
  Container,
  Stack,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Grid,
  Badge,
  Alert,
  Snackbar,
  ThemeProvider,
  createTheme,
  useMediaQuery,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  ChevronLeft,
  ShoppingCart,
  ShoppingBag,
  Receipt,
  LocalShipping,
  LocalAtm,
  AccountBalanceWallet,
  CreditCard,
  Delete,
  Add,
  Remove,
  LocationOn,
  CheckCircle,
  Home,
  ContentCopy,
  Refresh,
  Info
} from '@mui/icons-material';
import pb from '../pocketbase';
import { useCart } from '../contexts/CartContext';
import { styled } from '@mui/material/styles';

// Custom styled components
const StyledCard = styled(Card)(({ theme }) => ({
  display: 'flex',
  marginBottom: theme.spacing(2),
  borderRadius: theme.spacing(1.5),
  overflow: 'hidden',
  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px',
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: 'rgba(17, 12, 46, 0.15) 0px 48px 100px 0px'
  },
  [theme.breakpoints.down('sm')]: {
    flexDirection: 'column',
  }
}));

const ProductImage = styled(CardMedia)(({ theme }) => ({
  width: 120,
  height: 120,
  objectFit: 'cover',
  [theme.breakpoints.down('sm')]: {
    width: '100%',
    height: 160,
  }
}));

const QuantityControl = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  padding: theme.spacing(0.5),
}));

const PaymentMethodButton = styled(Button)(({ theme, selected }) => ({
  justifyContent: 'flex-start',
  marginBottom: theme.spacing(1.5),
  padding: theme.spacing(1.5),
  borderRadius: theme.spacing(1),
  textTransform: 'none',
  backgroundColor: selected ? theme.palette.primary.main : 'transparent',
  color: selected ? theme.palette.primary.contrastText : theme.palette.text.primary,
  border: selected ? 'none' : `1px solid ${theme.palette.divider}`,
  '&:hover': {
    backgroundColor: selected ? theme.palette.primary.dark : theme.palette.action.hover,
  }
}));

const SummaryCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 6px 24px 0px, rgba(0, 0, 0, 0.08) 0px 0px 0px 1px',
}));

const InstructionBox = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2.5),
  backgroundColor: theme.palette.grey[50],
  borderRadius: theme.spacing(1.5),
  marginBottom: theme.spacing(2.5),
  border: `1px solid ${theme.palette.divider}`,
}));

const DigitalProductBadge = styled(Chip)(({ theme }) => ({
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  fontWeight: 500,
  fontSize: '0.75rem',
  height: 24,
  marginLeft: theme.spacing(1)
}));

const NoticeBox = styled(Alert)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(1),
}));

const CartScreen = () => {
  // Create a theme with primary and secondary colors
  const theme = createTheme({
    palette: {
      primary: {
        main: '#5048E5', // Modern purple shade
        light: '#7B74EC',
        dark: '#3832A0',
        contrastText: '#fff'
      },
      secondary: {
        main: '#10B981', // Teal green for success indicators
        light: '#3FC79A',
        dark: '#0B815A',
        contrastText: '#fff'
      },
      error: {
        main: '#F04438',
      },
      background: {
        default: '#F9FAFC',
        paper: '#FFFFFF'
      },
      text: {
        primary: '#121828',
        secondary: '#65748B'
      }
    },
    shape: {
      borderRadius: 8
    },
    typography: {
      fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: {
        fontWeight: 600
      },
      h6: {
        fontWeight: 600
      },
      subtitle1: {
        fontWeight: 500
      }
    }
  });

  const [cartItems, setCartItems] = useState([]);
  const [digitalProducts, setDigitalProducts] = useState([]);
  const [nonDigitalProducts, setNonDigitalProducts] = useState([]);
  const [hasDigitalProducts, setHasDigitalProducts] = useState(false);
  const [checkoutDigitalOnly, setCheckoutDigitalOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processingCheckout, setProcessingCheckout] = useState(false);
  const [user, setUser] = useState(null);
  const [checkoutStep, setCheckoutStep] = useState('cart'); // 'cart', 'address', 'payment'
  const [paymentMethod, setPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [paymentInstructions, setPaymentInstructions] = useState({});
  const [commissionRate, setCommissionRate] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const { updateCart } = useCart();

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Fetch data when screen is focused
  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchUserData(),
        fetchPaymentInstructions(),
        fetchCommissionRate()
      ]);
    };
    
    loadData();
  }, [location.pathname]);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userId = pb.authStore.model?.id || localStorage.getItem('userId');

      if(localStorage.getItem('loginType') === 'guest') { 
        showSnackbar('Please login to view your cart.', 'warning');
        setLoading(false);
        return;
      }

      const userData = await pb.collection('users').getOne(userId);
      if (!userData) {
        // wait for a second and try again
        await new Promise(resolve => setTimeout(resolve, 1000));
        return fetchUserData();
      }
      setUser(userData);

      if (!userData.cart || Object.keys(userData.cart).length === 0) {
        setCartItems([]);
        setLoading(false);
        return;
      }

      const cartData = userData.cart;
      const cartItemsArray = Object.entries(cartData).map(([cartKey, item]) => ({
        cartKey,
        ...item,
        id: item.id,
        quantity: item.quantity,
        price: item.price,
        selectedVariant: item.selectedVariant
      }));

      // Process all product requests in parallel
      const productPromises = cartItemsArray.map(async (item) => {
        try {
          const product = await pb.collection('products').getOne(item.id, {
            expand: 'seller',
          });

          const isVerified = product.expand?.seller?.admin_verified;
          if (!isVerified || product.status !== 'published') {
            return null;
          }

          return {
            ...product,
            cartKey: item.cartKey,
            quantity: item.quantity,
            price: item.price,
            selectedVariant: item.selectedVariant,
            delivery_charge: product.delivery_charge || 0,
            sellerName: product.expand?.seller?.shop_name || 'Unknown Seller'
          };
        } catch (error) {
          console.warn(`Product with ID ${item.id} not found or failed to fetch:`, error);
          return null;
        }
      });

      const cartItemsWithDetails = await Promise.all(productPromises);
      const validCartItems = cartItemsWithDetails.filter(item => item !== null);
      
      // Remove invalid items from cart
      const invalidItems = cartItemsArray.filter(
        item => !validCartItems.some(validItem => validItem.id === item.id)
      );
      
      if (invalidItems.length > 0) {
        const updatedCartData = { ...userData.cart };
        invalidItems.forEach(item => {
          delete updatedCartData[item.id];
        });
        
        try {
          await pb.collection('users').update(userData.id, { cart: updatedCartData });
          updateCart(updatedCartData);
        } catch (error) {
          console.error('Error removing invalid items from cart:', error);
        }
      }
      
      // Separate digital and non-digital products
      const digital = validCartItems.filter(item => item.digital_product);
      const nonDigital = validCartItems.filter(item => !item.digital_product);
      
      setDigitalProducts(digital);
      setNonDigitalProducts(nonDigital);
      setHasDigitalProducts(digital.length > 0);
      setCartItems(validCartItems);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // showSnackbar('Failed to load cart. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPaymentInstructions = async () => {
    try {
      const appInfo = await pb.collection('payment_methods').getFullList();
      const instructions = {};
      appInfo.forEach(method => {
        instructions[method.name] = method;
      });
      setPaymentInstructions(instructions);
    } catch (error) {
      console.error('Error fetching payment instructions:', error);
      // Fallback values
      setPaymentInstructions({
        bKash: { number: '01XXXXXXXXX', code: '*247#' },
        Nagad: { number: '01XXXXXXXXX', code: '*167#' },
        Rocket: { number: '01XXXXXXXXX', code: '*322#' },
      });
    }
  };

  const fetchCommissionRate = async () => {
    try {
      const appInfo = await pb.collection('appinfo').getFirstListItem('');
      setCommissionRate(appInfo.commission || 0);
    } catch (error) {
      console.error('Error fetching commission rate:', error);
      setCommissionRate(0);
    }
  };

  const updateCartInDB = async (updatedCartItems) => {
    try {
      if (!user?.id) return;
      
      // Convert cart items to object format with product ID + variant as keys
      const cartObject = updatedCartItems.reduce((acc, item) => {
        // Generate a unique key for each product+variant combination
        let cartKey = item.id;
        if (item.selectedVariant) {
          const variantInfo = [];
          if (item.selectedVariant.color) variantInfo.push(item.selectedVariant.color);
          if (item.selectedVariant.size) variantInfo.push(item.selectedVariant.size);
          if (item.selectedVariant.weight) variantInfo.push(item.selectedVariant.weight);
          
          if (variantInfo.length > 0) {
            cartKey = `${item.id}-${variantInfo.join('-')}`;
          }
        }
        
        acc[cartKey] = {
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          selectedVariant: item.selectedVariant || null
        };
        return acc;
      }, {});
      
      await pb.collection('users').update(user.id, {
        cart: cartObject
      });
      
      // Update cart context
      updateCart(cartObject);
      
      return true;
    } catch (error) {
      console.error('Error updating cart:', error);
      showSnackbar('Failed to update cart. Please try again.', 'error');
      return false;
    }
  };

  const removeFromCart = async (productId) => {
    const updatedCart = cartItems.filter(item => item.id !== productId);
    setCartItems(updatedCart);
    
    const success = await updateCartInDB(updatedCart);
    if (success) {
      showSnackbar('Item removed from cart');
    }
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(productId);
      return;
    }
    
    const updatedCart = cartItems.map(item => 
      item.id === productId 
        ? { ...item, quantity: newQuantity } 
        : item
    );
    
    setCartItems(updatedCart);
    updateCartInDB(updatedCart);
  };

  const getSubtotal = (items = null) => {
    const productsToCalculate = items || (checkoutDigitalOnly ? digitalProducts : cartItems);
    return productsToCalculate.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  // Get the total delivery charge - updated to only count the highest charge per seller
  const getTotalDeliveryCharge = (items = null) => {
    const productsToCalculate = items || (checkoutDigitalOnly ? digitalProducts : cartItems);
    
    // Digital products have no delivery charge
    if (checkoutDigitalOnly && digitalProducts.length > 0) {
      return 0;
    }
    
    // Group items by seller
    const sellerGroups = {};
    
    productsToCalculate.forEach(item => {
      if (!sellerGroups[item.seller]) {
        sellerGroups[item.seller] = [];
      }
      sellerGroups[item.seller].push(item);
    });
    
    // For each seller, only take the highest delivery charge
    let totalDeliveryCharge = 0;
    
    Object.values(sellerGroups).forEach(sellerItems => {
      // Find the highest delivery charge for this seller
      const highestCharge = Math.max(...sellerItems.map(item => item.delivery_charge));
      totalDeliveryCharge += highestCharge;
    });
    
    return totalDeliveryCharge;
  };

  const getTotalPrice = (items = null) => {
    const productsToCalculate = items || (checkoutDigitalOnly ? digitalProducts : cartItems);
    return getSubtotal(productsToCalculate) + getTotalDeliveryCharge(productsToCalculate);
  };
  
  const getDigitalSubtotal = () => {
    return digitalProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getNonDigitalSubtotal = () => {
    return nonDigitalProducts.reduce((total, item) => total + (item.price * item.quantity), 0);
  };
  
  const getDigitalTotalPrice = () => {
    // Digital products have no delivery charge
    return getDigitalSubtotal();
  };
  
  const getNonDigitalTotalPrice = () => {
    return getNonDigitalSubtotal() + getTotalDeliveryCharge(nonDigitalProducts);
  };

  const calculateCommission = (productPrice) => {
    return (productPrice * commissionRate) / 100;
  };

  const groupBySeller = () => {
    const grouped = {};
    cartItems.forEach(item => {
      if (!grouped[item.seller]) {
        grouped[item.seller] = {
          sellerId: item.seller,
          sellerName: item.sellerName || 'Unknown Seller',
          items: []
        };
      }
      grouped[item.seller].items.push(item);
    });
    return Object.values(grouped);
  };

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showSnackbar('Please add items to your cart before checkout.', 'warning');
      return;
    }

    if (!user.city || !user.street || !user.country || !user.postalCode) {
      showSnackbar('Please update your shipping address before proceeding.', 'warning');
      setCheckoutStep('address');
      return;
    }

    setCheckoutStep('payment');
  };

  const saveAddress = async () => {
    try {
      if (!user.city || !user.street || !user.country || !user.postalCode) {
        showSnackbar('Please fill in all address fields.', 'error');
        return;
      }

      await pb.collection('users').update(user.id, {
        city: user.city,
        street: user.street,
        country: user.country,
        postalCode: user.postalCode
      });
      
      showSnackbar('Address updated successfully!');
      setCheckoutStep('payment');
    } catch (error) {
      console.error('Error updating address:', error);
      showSnackbar('Failed to update address. Please try again.', 'error');
    }
  };

  const sendOrderNotificationEmails = async (order, seller, products, isPaymentComplete) => {
    return;
    // Email sending functionality would be implemented here
  };

  const updateSellerStatistics = async (seller, order, isPaymentComplete) => {
    try {
      const sellerData = await pb.collection('sellers').getOne(seller.id);
      
      // Calculate updated values
      const totalSale = (sellerData.total_sale || 0) + order.product_price;
      const totalCommission = (sellerData.total_commission || 0) + order.commission;
      const totalOrders = (sellerData.total_orders || 0) + 1;
      
      // Update balance only if payment is complete (not COD)
      let totalBalance = sellerData.total_balance || 0;
      if (isPaymentComplete) {
        totalBalance += (order.product_price - order.commission);
      }
      
      // Update seller statistics
      await pb.collection('sellers').update(seller.id, {
        total_sale: totalSale,
        total_commission: totalCommission,
        total_orders: totalOrders,
        total_balance: totalBalance
      });
      
      return true;
    } catch (error) {
      console.error('Error updating seller statistics:', error);
      // Continue with order processing even if seller update fails
      return false;
    }
  };

  const handlePlaceOrder = async () => {
    if (!paymentMethod) {
      showSnackbar('Please select a payment method.', 'warning');
      return;
    }

    if (paymentMethod !== 'Cash on Delivery' && (!transactionId || !paymentNumber)) {
      showSnackbar('Please provide transaction ID and payment number.', 'warning');
      return;
    }

    setProcessingCheckout(true);

    try {
      // Group items by seller
      const sellerGroups = groupBySeller();
      const createdOrders = [];
      
      // Create orders for each seller
      for (const sellerGroup of sellerGroups) {
        try {
          const sellerItems = sellerGroup.items;
          const sellerSubtotal = sellerItems.reduce((total, item) => total + (item.price * item.quantity), 0);
          const sellerDeliveryCharge = Math.max(...sellerItems.map(item => item.delivery_charge || 0));
          const sellerCommission = calculateCommission(sellerSubtotal);
          
          const isPaymentComplete = paymentMethod !== 'Cash on Delivery';
          
          // Get seller data
          const seller = await pb.collection('sellers').getOne(sellerGroup.sellerId);
          
          // Create enhanced products data for the order with variant information
          const productsWithVariants = sellerItems.map(item => ({
            id: item.id,
            quantity: item.quantity,
            price: item.price
          }));
          
          // Create a separate variants object with product IDs as keys
          const variantsObject = {};
          sellerItems.forEach(item => {
            if (item.selectedVariant) {
              variantsObject[item.id] = item.selectedVariant;
            }
          });

          const orderData = {
            user_id: user.id,
            seller_id: sellerGroup.sellerId,
            product_price: sellerSubtotal,
            delivery_charge: sellerDeliveryCharge,
            products: sellerItems.map(item => item.id),
            products_id: productsWithVariants,
            variants: variantsObject, // Add variants as a separate field
            commission: sellerCommission,
            payment_status: isPaymentComplete ? 'pending' : 'pending',
            order_status: 'hold',
            payment_method: paymentMethod,
            transaction_id: transactionId || null,
            payment_number: paymentNumber || null
          };

          const order = await pb.collection('orders').create(orderData);

          const invoiceData = {
            order: order.id,
            status: isPaymentComplete ? 'pending' : 'pending',
            total_amount: sellerSubtotal + sellerDeliveryCharge,
            product_price: sellerSubtotal,
            delivery_charge: sellerDeliveryCharge,
            commission: sellerCommission,
            user: user.id,
            seller: sellerGroup.sellerId,
            transaction_id: transactionId || null,
          };

          const invoice = await pb.collection('invoice').create(invoiceData);
          
          // Link invoice to order
          await pb.collection('orders').update(order.id, { invoice: invoice.id });
          
          // Update seller statistics
          await updateSellerStatistics(seller, order, isPaymentComplete);
          
          // Send email notifications
          await sendOrderNotificationEmails(order, seller, sellerItems, isPaymentComplete);
          
          createdOrders.push(order);
        } catch (error) {
          console.error(`Error processing order for seller ${sellerGroup.sellerId}:`, error);
          showSnackbar(`Failed to process order for ${sellerGroup.sellerName}. Please try again.`, 'error');
        }
      }

      // If at least one order was created successfully, clear the cart and redirect
      if (createdOrders.length > 0) {
        await pb.collection('users').update(user.id, { cart: {} });
        updateCart({});
        setCartItems([]);
        
        setPaymentMethod('');
        setTransactionId('');
        setPaymentNumber('');
        setCheckoutStep('cart');

        showSnackbar(`Your order total of ৳${getTotalPrice().toFixed(2)} has been placed successfully!`);
        navigate('/my-orders');
      } else {
        showSnackbar('Failed to place any orders. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      showSnackbar('Checkout failed. Please try again.', 'error');
    } finally {
      setProcessingCheckout(false);
    }
  };

  const CartItem = ({ item }) => (
    <StyledCard>
      <Box sx={{ display: 'flex', width: '100%', flexDirection: isMobile ? 'column' : 'row' }}>
        <ProductImage
          component="img"
          image={item.images && item.images.length > 0 
            ? pb.files.getUrl(item, item.images[0]) 
            : '/assets/product-placeholder.png'
          }
          onClick={() => navigate(`/product/${item.slug}`)}
          alt={item.title}
          onError={(e) => {
            e.target.src = '/assets/product-placeholder.png';
          }}
        />
        
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          flexGrow: 1, 
          p: 2,
          width: isMobile ? '100%' : 'auto' 
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box onClick={() => navigate(`/product/${item.slug}`)} sx={{ cursor: 'pointer' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 0.5 }}>
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Seller: {item.sellerName}
              </Typography>
              
              {/* Display variant information */}
              {item.selectedVariant && (
                <Box sx={{ mb: 1 }}>
                  {item.selectedVariant.color && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Color:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box 
                          sx={{ 
                            width: 16, 
                            height: 16, 
                            borderRadius: '50%', 
                            backgroundColor: item.selectedVariant.color.toLowerCase(),
                            border: '1px solid #ddd',
                            mr: 0.5
                          }} 
                        />
                        <Typography variant="body2">
                          {item.selectedVariant.color}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  {item.selectedVariant.size && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Size:
                      </Typography>
                      <Typography variant="body2">
                        {item.selectedVariant.size}
                      </Typography>
                    </Box>
                  )}
                  {item.selectedVariant.weight && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ mr: 1 }}>
                        Weight:
                      </Typography>
                      <Typography variant="body2">
                        {item.selectedVariant.weight}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {item.delivery_charge > 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Delivery: ৳{item.delivery_charge.toFixed(2)}
                </Typography>
              ) : (
                <Chip 
                  label="Free Delivery" 
                  size="small" 
                  color="secondary" 
                  sx={{ height: 24, fontSize: '0.75rem' }}
                />
              )}
            </Box>
            
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              ৳{item.price.toFixed(2)}
            </Typography>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mt: 'auto', 
            pt: 2 
          }}>
            <QuantityControl>
              <IconButton 
                size="small"
                onClick={() => updateQuantity(item.cartKey, item.quantity - 1)}
                disabled={item.quantity <= 1}
              >
                <Remove fontSize="small" />
              </IconButton>
              <Typography sx={{ px: 2, minWidth: 24, textAlign: 'center' }}>
                {item.quantity}
              </Typography>
              <IconButton 
                size="small"
                onClick={() => updateQuantity(item.cartKey, item.quantity + 1)}
                disabled={item.selectedVariant ? 
                  item.quantity >= item.selectedVariant.stock : 
                  item.quantity >= item.stock
                }
              >
                <Add fontSize="small" />
              </IconButton>
            </QuantityControl>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => removeFromCart(item.cartKey)}
              size="small"
            >
              Remove
            </Button>
          </Box>
        </Box>
      </Box>
    </StyledCard>
  );

  const EmptyCart = () => (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center', 
      py: 8,
      px: 2, 
      textAlign: 'center'
    }}>
      <ShoppingBag sx={{ fontSize: 80, color: 'grey.300', mb: 3 }} />
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Your Cart is Empty
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 400 }}>
        Looks like you haven't added anything to your cart yet. Explore our products and find something you'll love!
      </Typography>
      <Button 
        variant="contained" 
        size="large"
        startIcon={<ShoppingCart />}
        onClick={() => navigate('/')}
        sx={{ py: 1.5, px: 4 }}
      >
        Start Shopping
      </Button>
    </Box>
  );

  // Render digital and non-digital products separately
  const renderCartItems = () => (
    <>
      {digitalProducts.length > 0 && (
        <Box>
          <Typography variant="h6">Digital Products</Typography>
          {digitalProducts.map((item) => (
            <StyledCard key={item.cartKey}>
              {/* Render digital product details */}
              <CardContent>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Typography variant="body2">Price: ${item.price}</Typography>
                <DigitalProductBadge label="Digital Product" />
              </CardContent>
            </StyledCard>
          ))}
        </Box>
      )}

      {nonDigitalProducts.length > 0 && (
        <Box>
          <Typography variant="h6">Non-Digital Products</Typography>
          {nonDigitalProducts.map((item) => (
            <StyledCard key={item.cartKey}>
              {/* Render non-digital product details */}
              <CardContent>
                <Typography variant="subtitle1">{item.name}</Typography>
                <Typography variant="body2">Price: ${item.price}</Typography>
              </CardContent>
            </StyledCard>
          ))}
        </Box>
      )}
    </>
  );

  // Disable Cash on Delivery if digital products are present
  const isCashOnDeliveryDisabled = hasDigitalProducts;

  const renderCart = () => (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 3 }}>
        Shopping Cart {cartItems.length > 0 && `(${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'})`}
      </Typography>

      {cartItems.length > 0 ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            {cartItems.map(item => (
              <CartItem key={item.id} item={item} />
            ))}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <SummaryCard elevation={0}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Order Summary
              </Typography>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography color="text.secondary">Subtotal ({cartItems.length} items)</Typography>
                <Typography fontWeight={500}>৳{getSubtotal().toFixed(2)}</Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                <Typography color="text.secondary">Delivery Charge</Typography>
                <Typography fontWeight={500}>৳{getTotalDeliveryCharge().toFixed(2)}</Typography>
              </Box>
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="subtitle1" fontWeight={600}>Total</Typography>
                <Typography variant="subtitle1" fontWeight={600} color="primary">
                  ৳{getTotalPrice().toFixed(2)}
                </Typography>
              </Box>
              
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={cartItems.length === 0 || processingCheckout}
                onClick={handleCheckout}
                startIcon={processingCheckout ? <CircularProgress size={20} color="inherit" /> : <ShoppingCart />}
                sx={{ py: 1.5 }}
              >
                {processingCheckout ? 'Processing...' : 'Proceed to Checkout'}
              </Button>
            </SummaryCard>
          </Grid>
        </Grid>
      ) : (
        <EmptyCart />
      )}
    </Box>
  );

  const renderAddress = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => setCheckoutStep('cart')} sx={{ mr: 1 }}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Shipping Address
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <SummaryCard elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <LocationOn color="primary" sx={{ mr: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Delivery Details
              </Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                  District
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your district"
                  value={user?.city || ''}
                  onChange={(e) => setUser({ ...user, city: e.target.value })}
                  sx={{ mb: 2 }}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                  Country
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your country"
                  value={user?.country || ''}
                  onChange={(e) => setUser({ ...user, country: e.target.value })}
                  sx={{ mb: 2 }}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                  Full Address
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your full address"
                  value={user?.street || ''}
                  onChange={(e) => setUser({ ...user, street: e.target.value })}
                  sx={{ mb: 2 }}
                  multiline
                  rows={2}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                  Postal Code
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  placeholder="Enter your postal code"
                  value={user?.postalCode || ''}
                  onChange={(e) => setUser({ ...user, postalCode: e.target.value })}
                  type="number"
                  required
                />
              </Grid>
            </Grid>
          </SummaryCard>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <SummaryCard elevation={0}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Order Summary
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography color="text.secondary">Subtotal ({cartItems.length} items)</Typography>
              <Typography fontWeight={500}>৳{getSubtotal().toFixed(2)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary">Delivery Charge</Typography>
              <Typography fontWeight={500}>৳{getTotalDeliveryCharge().toFixed(2)}</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600}>Total</Typography>
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                ৳{getTotalPrice().toFixed(2)}
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={saveAddress}
              startIcon={<LocalShipping />}
              sx={{ py: 1.5 }}
            >
              Save & Continue
            </Button>
          </SummaryCard>
        </Grid>
      </Grid>
    </Box>
  );

  const renderPayment = () => (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => setCheckoutStep('address')} sx={{ mr: 1 }}>
          <ChevronLeft />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Payment Method
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <SummaryCard elevation={0}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <CreditCard color="primary" sx={{ mr: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Select Payment Method
              </Typography>
            </Box>
            
            <PaymentMethodButton 
              fullWidth
              selected={paymentMethod === 'Cash on Delivery'}
              disabled={isCashOnDeliveryDisabled}
              onClick={() => setPaymentMethod('Cash on Delivery')}
              startIcon={<LocalAtm />}
            >
              Cash on Delivery
            </PaymentMethodButton>
            
            <PaymentMethodButton 
              fullWidth
              selected={paymentMethod === 'bKash'}
              onClick={() => setPaymentMethod('bKash')}
              startIcon={<AccountBalanceWallet />}
            >
              bKash
            </PaymentMethodButton>
            
            <PaymentMethodButton 
              fullWidth
              selected={paymentMethod === 'Nagad'}
              onClick={() => setPaymentMethod('Nagad')}
              startIcon={<AccountBalanceWallet />}
            >
              Nagad
            </PaymentMethodButton>
            
            <PaymentMethodButton 
              fullWidth
              selected={paymentMethod === 'Rocket'}
              onClick={() => setPaymentMethod('Rocket')}
              startIcon={<AccountBalanceWallet />}
            >
              Rocket
            </PaymentMethodButton>
          </SummaryCard>
          
          {paymentMethod && paymentMethod !== 'Cash on Delivery' && (
            <SummaryCard elevation={0} sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
                Payment Instructions
              </Typography>
              
              <InstructionBox>
                <Stack spacing={2}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip label="1" color="primary" size="small" sx={{ mr: 1.5 }} />
                    <Typography>
                      Go to your {paymentMethod} app or Dial {paymentInstructions[paymentMethod]?.code}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip label="2" color="primary" size="small" sx={{ mr: 1.5 }} />
                    <Typography>Choose "Send Money"</Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip label="3" color="primary" size="small" sx={{ mr: 1.5 }} />
                    <Typography>Enter {paymentMethod} Account Number:</Typography>
                  </Box>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    bgcolor: 'background.paper',
                    p: 1.5,
                    borderRadius: 1,
                    border: '1px dashed',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="subtitle1" fontWeight="bold" sx={{ flex: 1 }}>
                      {paymentInstructions[paymentMethod]?.number}
                    </Typography>
                    <Button 
                      size="small" 
                      startIcon={<ContentCopy />}
                      variant="outlined"
                      onClick={() => {
                        navigator.clipboard.writeText(paymentInstructions[paymentMethod]?.number);
                        showSnackbar('Number copied to clipboard');
                      }}
                    >
                      Copy
                    </Button>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip label="4" color="primary" size="small" sx={{ mr: 1.5 }} />
                    <Typography>
                      Enter total amount: <Typography component="span" color="primary" fontWeight="bold">
                        ৳{getTotalPrice().toFixed(2)}
                      </Typography>
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip label="5" color="primary" size="small" sx={{ mr: 1.5 }} />
                    <Typography>
                      Enter your {paymentMethod} PIN to confirm
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Chip label="6" color="primary" size="small" sx={{ mr: 1.5 }} />
                    <Typography>
                      Copy the Transaction ID and provide it below
                    </Typography>
                  </Box>
                </Stack>
              </InstructionBox>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                    Transaction ID
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Enter transaction ID"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 500 }}>
                    Your {paymentMethod} Number
                  </Typography>
                  <TextField
                    fullWidth
                    variant="outlined"
                    placeholder={`Enter your ${paymentMethod} number`}
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    sx={{ mb: 2 }}
                    required
                  />
                </Grid>
              </Grid>
            </SummaryCard>
          )}
        </Grid>
        
        <Grid item xs={12} md={4}>
          <SummaryCard elevation={0}>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600 }}>
              Order Summary
            </Typography>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography color="text.secondary">Subtotal ({cartItems.length} items)</Typography>
              <Typography fontWeight={500}>৳{getSubtotal().toFixed(2)}</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary">Delivery Charge</Typography>
              <Typography fontWeight={500}>৳{getTotalDeliveryCharge().toFixed(2)}</Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600}>Total</Typography>
              <Typography variant="subtitle1" fontWeight={600} color="primary">
                ৳{getTotalPrice().toFixed(2)}
              </Typography>
            </Box>
            
            <Button
              variant="contained"
              fullWidth
              size="large"
              onClick={handlePlaceOrder}
              disabled={processingCheckout || !paymentMethod || (paymentMethod !== 'Cash on Delivery' && (!transactionId || !paymentNumber))}
              startIcon={processingCheckout ? <CircularProgress size={20} color="inherit" /> : <CheckCircle />}
              sx={{ py: 1.5 }}
            >
              {processingCheckout ? 'Placing Order...' : 'Place Order'}
            </Button>
          </SummaryCard>
          
          {user && (
            <SummaryCard elevation={0} sx={{ mt: 3 }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Delivery Address
              </Typography>
              
              <Typography variant="body1" sx={{ mb: 1 }}>
                {user.street}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                {user.city}, {user.postalCode}
              </Typography>
              <Typography variant="body1">
                {user.country}
              </Typography>
              
              <Button
                variant="text"
                size="small"
                startIcon={<Refresh />}
                onClick={() => setCheckoutStep('address')}
                sx={{ mt: 1.5 }}
              >
                Change Address
              </Button>
            </SummaryCard>
          )}
        </Grid>
      </Grid>
    </Box>
  );

  const CheckoutStepper = () => (
    <Stepper activeStep={checkoutStep === 'cart' ? 0 : checkoutStep === 'address' ? 1 : 2} sx={{ mb: 4 }}>
      <Step>
        <StepLabel>Cart</StepLabel>
      </Step>
      <Step>
        <StepLabel>Address</StepLabel>
      </Step>
      <Step>
        <StepLabel>Payment</StepLabel>
      </Step>
    </Stepper>
  );

  return (
    <ThemeProvider theme={theme}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {checkoutStep !== 'cart' && <CheckoutStepper />}
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <>
            {checkoutStep === 'cart' && renderCart()}
            {checkoutStep === 'address' && renderAddress()}
            {checkoutStep === 'payment' && renderPayment()}
          </>
        )}
        
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={closeSnackbar}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert onClose={closeSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Container>
    </ThemeProvider>
  );
};

export default CartScreen;