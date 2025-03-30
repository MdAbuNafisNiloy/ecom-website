import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from '@emotion/styled';
import { 
  Typography, 
  Box, 
  Paper, 
  IconButton, 
  CircularProgress, 
  Badge, 
  Grid, 
  Container,
  Divider,
  Button,
  Card,
  CardMedia,
  CardContent,
  Alert
} from '@mui/material';
import { 
  ChevronLeft as ChevronLeftIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  ShoppingCart as CartIcon,
  Delete as DeleteIcon,
  SentimentDissatisfied as EmptyIcon
} from '@mui/icons-material';
import pb from '../pocketbase';
import { useLocation } from 'react-router-dom';

const WishlistScreen = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Use effect instead of useFocusEffect for web
  useEffect(() => {
    fetchUserData();
  }, [location]); // Re-fetch when location changes (mimics useFocusEffect)

  // Fetch user data including wishlist from PocketBase
  const fetchUserData = async () => {
    try {
      setLoading(true);
      const userId = localStorage.getItem('userId');

      if (!userId) {
        console.log('User not authenticated. Please login.');
        // Instead of showing an alert, just set empty wishlist and continue
        setWishlistItems([]);
        setLoading(false);
        return;
      }

      const userData = await pb.collection('users').getOne(userId);
      setUser(userData);

      // Process wishlist data
      if (userData.wishlist) {
        await processWishlistData(userData.wishlist);
      } else {
        setWishlistItems([]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      alert('Failed to load wishlist. Please try again.');
      setLoading(false);
    }
  };

  // Process the wishlist data - handles both array of IDs and object format
  const processWishlistData = async (wishlistData) => {
    try {
      // Check if the wishlist is an array of IDs or an object with full product data
      if (Array.isArray(wishlistData)) {
        // If it's an array of IDs, fetch each product with expanded seller data
        const productPromises = wishlistData.map(id =>
          pb.collection('products').getOne(id, {
            expand: 'seller', // 🚀 Changed: Expand the seller field to get seller data in the same request
          }).catch(err => {
            console.warn(`Product with ID ${id} not found:`, err);
            return null;
          })
        );

        const products = await Promise.all(productPromises);

        // 🚀 Changed: Filter products based on seller verification and status
        const validProducts = products.filter(product => {
          if (!product || product.status !== 'published') return false;

          // Check if the seller is admin_verified using the expanded seller data
          const isVerified = product.expand?.seller?.admin_verified;
          if (!isVerified) {
            // 🚀 Changed: Remove the product from the wishlist if the seller is not verified
            removeFromWishlist(product.id);
            return false;
          }

          return true;
        });

        setWishlistItems(validProducts);
      } else {
        // If it's an object with product data
        const products = Object.values(wishlistData);

        // 🚀 Changed: Filter products based on seller verification and status
        const validProducts = products.filter(product => {
          if (!product || product.status !== 'published') return false;

          // Check if the seller is admin_verified using the expanded seller data
          const isVerified = product.expand?.seller?.admin_verified;
          if (!isVerified) {
            // 🚀 Changed: Remove the product from the wishlist if the seller is not verified
            removeFromWishlist(product.id);
            return false;
          }

          return true;
        });

        setWishlistItems(validProducts);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error processing wishlist data:', error);
      setWishlistItems([]);
      setLoading(false);
    }
  };

  // Function to update wishlist in PocketBase
  const updateWishlistInDB = async (updatedWishlist) => {
    try {
      if (!user?.id) return;
      
      // Check the format of the original wishlist to maintain consistency
      const isArrayFormat = Array.isArray(user.wishlist);
      
      let dataToUpdate;
      if (isArrayFormat) {
        // If original format was array, store as array of IDs
        dataToUpdate = updatedWishlist.map(item => item.id);
      } else {
        // If original format was object, store as object with product data
        dataToUpdate = updatedWishlist.reduce((acc, item) => {
          acc[item.id] = item;
          return acc;
        }, {});
      }
      
      await pb.collection('users').update(user.id, {
        wishlist: dataToUpdate
      });
      
      // Update local user object to reflect changes
      setUser({
        ...user,
        wishlist: dataToUpdate
      });
    } catch (error) {
      console.error('Error updating wishlist:', error);
      alert('Failed to update wishlist. Please try again.');
    }
  };

  // Function to remove item from wishlist
  const removeFromWishlist = (productId) => {
    const updatedWishlist = wishlistItems.filter(item => item.id !== productId);
    setWishlistItems(updatedWishlist);
    updateWishlistInDB(updatedWishlist);
  };

  // Function to add item to cart
  const addToCart = async (product) => {
    try {
      if (!user?.id) {
        alert('User not authenticated. Please login.');
        return;
      }
      
      // Get current cart or initialize empty object
      const currentCart = user.cart || {};
      
      // If product already in cart, increase quantity
      if (currentCart[product.id]) {
        currentCart[product.id].quantity = (currentCart[product.id].quantity || 1) + 1;
        // remove from wishlist
        removeFromWishlist(product.id);
        
      } else {
        // Add product to cart with quantity 1
        currentCart[product.id] = {
          ...product,
          quantity: 1
        };
        // remove from wishlist
        removeFromWishlist(product.id);
      }
      
      // Update cart in database
      await pb.collection('users').update(user.id, {
        cart: currentCart
      });
      
      // Update local user object
      setUser({
        ...user,
        cart: currentCart
      });
      
      alert(`${product.title} added to cart!`);
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add item to cart. Please try again.');
    }
  };

  // Navigate to product detail
  const navigateToProductDetail = (product) => {
    navigate(`/product/${product.id}`, { state: { product } });
  };

  // Wishlist item component
  const WishlistItem = ({ item }) => (
    <WishlistItemCard elevation={2}>
      <WishlistItemContent onClick={() => navigateToProductDetail(item)}>
        <WishlistItemImage>
          <img 
            src={pb.files.getURL(item, item.images[0])} 
            alt={item.title}
            onError={(e) => {
              e.target.src = '/assets/product-placeholder.png'; // Fallback image
            }}
          />
        </WishlistItemImage>
        <WishlistItemInfo>
          <Typography variant="subtitle1" sx={{ fontWeight: 500, mb: 0.5 }}>
            {item.title}
          </Typography>
          <PriceContainer>
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#007bff', mr: 1 }}>
              ৳{item.price.toFixed(2)}
            </Typography>
            {item.compare_price > item.price && (
              <Typography variant="body2" sx={{ color: '#999', textDecoration: 'line-through' }}>
                ৳{item.compare_price.toFixed(2)}
              </Typography>
            )}
          </PriceContainer>
          {item.status === 'archived' && (
            <Typography variant="caption" sx={{ color: '#ff4d4f' }}>
              Out of stock
            </Typography>
          )}
        </WishlistItemInfo>
      </WishlistItemContent>
      <ActionButtons>
        <AddToCartButton
          disabled={item.status === 'archived'}
          onClick={() => addToCart(item)}
          className={item.status === 'archived' ? 'disabled' : ''}
        >
          <CartIcon fontSize="small" />
        </AddToCartButton>
        <RemoveButton onClick={() => removeFromWishlist(item.id)}>
          <DeleteIcon fontSize="small" />
        </RemoveButton>
      </ActionButtons>
    </WishlistItemCard>
  );

  // Empty wishlist component
  const EmptyWishlist = () => (
    <EmptyContainer>
      <EmptyIcon sx={{ fontSize: 64, color: '#c5c5c5', mb: 2 }} />
      <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>
        Your wishlist is empty
      </Typography>
      <Typography variant="body2" sx={{ color: '#777', textAlign: 'center' }}>
        Add items to your wishlist while shopping
      </Typography>
    </EmptyContainer>
  );

  if (loading) {
    return (
      <LoadingContainer>
        <CircularProgress size={40} sx={{ color: '#007bff', mb: 2 }} />
        <Typography variant="h6" sx={{ color: '#333' }}>
          Loading your wishlist...
        </Typography>
      </LoadingContainer>
    );
  }

  return (
    <PageContainer>
      <Header>
        <BackButton onClick={() => navigate(-1)}>
          <ChevronLeftIcon />
        </BackButton>
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Your Wishlist
        </Typography>
        <Badge
          badgeContent={wishlistItems.length}
          color="error"
          invisible={wishlistItems.length === 0}
        >
          <FavoriteIcon sx={{ color: '#ff4d4f' }} />
        </Badge>
      </Header>

      <MainContent>
        <WishlistSection>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
            Saved Items
          </Typography>
          {wishlistItems.length > 0 ? (
            <WishlistGrid>
              {wishlistItems.map(item => (
                <WishlistItem key={item.id} item={item} />
              ))}
            </WishlistGrid>
          ) : (
            <EmptyWishlist />
          )}
        </WishlistSection>
      </MainContent>
    </PageContainer>
  );
};

// Styled components
const PageContainer = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f9f9f9;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  background-color: white;
  border-bottom: 1px solid #eee;
  position: sticky;
  top: 0;
  z-index: 10;
`;

const BackButton = styled(IconButton)`
  color: #333;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 16px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
`;

const WishlistSection = styled(Paper)`
  padding: 20px;
  border-radius: 10px;
  margin-bottom: 20px;
  background-color: white;
`;

const WishlistGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const WishlistItemCard = styled(Paper)`
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  border-bottom: 1px solid #eee;
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
`;

const WishlistItemContent = styled.div`
  display: flex;
  flex: 1;
  align-items: center;
  cursor: pointer;
`;

const WishlistItemImage = styled.div`
  width: 70px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  margin-right: 16px;
  background-color: #f0f0f0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const WishlistItemInfo = styled.div`
  flex: 1;
`;

const PriceContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ActionButtons = styled.div`
  display: flex;
  align-items: center;
`;

const AddToCartButton = styled(IconButton)`
  margin-right: 8px;
  background-color: #007bff;
  color: white;
  
  &:hover {
    background-color: #0056b3;
  }
  
  &.disabled {
    background-color: #b0d0ff;
    cursor: not-allowed;
  }
`;

const RemoveButton = styled(IconButton)`
  background-color: #f8f8f8;
  border: 1px solid #eee;
  color: #ff4d4f;
  
  &:hover {
    background-color: #fff0f0;
  }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f9f9f9;
`;

const EmptyContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 30px;
  text-align: center;
`;

// For medium and larger screens, make wishlist items display in a grid
const mediaQuery = window.matchMedia('(min-width: 768px)');

if (mediaQuery.matches) {
  WishlistGrid.defaultProps = {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
      gap: '16px'
    }
  };
}

export default WishlistScreen;